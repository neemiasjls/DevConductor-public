// Busca fotos em banco curado pela API oficial e grava autor, licença e miniaturas para escolher olhando.
// Uso: node buscar-fotos.mjs <rotulo> <pexels|unsplash|openverse> "<busca>" ["<busca 2>" ...] [--orientacao vertical|horizontal|quadrada]
// Saída na pasta atual: <rotulo>.json e <rotulo>-NN.jpg (para folha-contato.py), sem sobrescrever busca anterior.
// A chave vem só do ambiente (PEXELS_API_KEY, UNSPLASH_ACCESS_KEY), nunca de arquivo versionado nem da linha de comando.
// Erro de bloqueio ou verificação encerra a busca: não tentar por outro caminho. A busca não avalia a foto;
// a escolha passa pelo critério de qualidade da lp-assets.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ORIENTACOES = {
  pexels: { vertical: 'portrait', horizontal: 'landscape', quadrada: 'square' },
  unsplash: { vertical: 'portrait', horizontal: 'landscape', quadrada: 'squarish' },
  openverse: { vertical: 'tall', horizontal: 'wide', quadrada: 'square' },
}
const VARIAVEL = { pexels: 'PEXELS_API_KEY', unsplash: 'UNSPLASH_ACCESS_KEY' }
const COMO_CRIAR = {
  pexels: 'crie a chave grátis em https://www.pexels.com/api/ e guarde em PEXELS_API_KEY',
  unsplash: 'registre um app grátis em https://unsplash.com/developers e guarde a Access Key em UNSPLASH_ACCESS_KEY',
}

export function montarPedido(fonte, busca, { orientacao, chave } = {}) {
  if (!ORIENTACOES[fonte]) throw Error(`Fonte desconhecida: ${fonte}`)
  if (VARIAVEL[fonte] && !chave) throw Error(`Sem chave: ${COMO_CRIAR[fonte]}`)
  const forma = orientacao ? ORIENTACOES[fonte][orientacao] : undefined
  if (orientacao && !forma) throw Error(`Orientação inválida: ${orientacao}`)
  const definir = (base, campos) => {
    const u = new URL(base)
    for (const [k, v] of Object.entries(campos)) if (v !== undefined) u.searchParams.set(k, String(v))
    return u
  }
  if (fonte === 'pexels') return { url: definir('https://api.pexels.com/v1/search', { query: busca, per_page: 40, size: 'medium', orientation: forma }), headers: { Authorization: chave } }
  if (fonte === 'unsplash') return { url: definir('https://api.unsplash.com/search/photos', { query: busca, per_page: 30, content_filter: 'high', orientation: forma }), headers: { Authorization: `Client-ID ${chave}` } }
  return { url: definir('https://api.openverse.org/v1/images/', { q: busca, page_size: 20, license_type: 'commercial,modification', size: 'large', source: 'stocksnap,wordpress,rawpixel', aspect_ratio: forma }), headers: {} }
}

// Formato único para as três APIs. "uso" registra a condição da fonte que acompanha a foto.
export function normalizar(fonte, dados) {
  if (fonte === 'pexels') return (dados.photos || []).map((f) => ({ id: String(f.id), autor: f.photographer, licenca: 'Pexels',
    licencaUrl: 'https://www.pexels.com/license/', largura: f.width, altura: f.height, original: f.src?.original, pagina: f.url, mini: f.src?.medium,
    uso: 'Creditar quando possível: "Foto de <autor> no Pexels", com link para a página.' }))
  if (fonte === 'unsplash') return (dados.results || []).map((f) => ({ id: f.id, autor: f.user?.name, licenca: 'Unsplash',
    licencaUrl: 'https://unsplash.com/license', largura: f.width, altura: f.height, original: f.urls?.regular, pagina: f.links?.html, mini: f.urls?.small,
    avisarDownload: f.links?.download_location,
    uso: 'API exige usar a URL devolvida, avisar o download e creditar autor e Unsplash com link.' }))
  return (dados.results || []).map((f) => ({ id: f.id, autor: f.creator || f.source, licenca: /^cc0$/i.test(f.license) ? 'CC0' : f.license,
    licencaUrl: f.license_url, largura: f.width, altura: f.height, original: f.url, pagina: f.foreign_landing_url, mini: f.thumbnail,
    uso: 'Conferir licença e resolução na página de origem; a URL da API pode ser menor que o original.' }))
}

function principal(args) {
  const i = args.indexOf('--orientacao')
  const orientacao = i >= 0 ? args[i + 1] : undefined
  const soltos = args.filter((a, n) => !a.startsWith('--') && (i < 0 || n !== i + 1))
  const [rotulo, fonte, ...buscas] = soltos
  if (!rotulo || !/^[a-z0-9-]+$/.test(rotulo) || !ORIENTACOES[fonte] || !buscas.length ||
    args.some((a) => a.startsWith('--') && a !== '--orientacao') || (i >= 0 && !ORIENTACOES[fonte][orientacao])) {
    console.error('Uso: node buscar-fotos.mjs <rotulo> <pexels|unsplash|openverse> "<busca>" [...] [--orientacao vertical|horizontal|quadrada]')
    return Promise.resolve(1)
  }
  const chave = VARIAVEL[fonte] ? process.env[VARIAVEL[fonte]] : undefined
  if (VARIAVEL[fonte] && !chave) {
    console.error(`Sem ${VARIAVEL[fonte]}: ${COMO_CRIAR[fonte]}. Sem chave, use outra fonte da ordem de preferência; não raspar o site.`)
    return Promise.resolve(2)
  }
  if (fs.existsSync(`${rotulo}.json`) || fs.readdirSync('.').some((n) => new RegExp(`^${rotulo}-\\d+\\.jpg$`, 'i').test(n))) {
    console.error(`Saída ${rotulo} já existe. Use outro rótulo para preservar a busca anterior.`)
    return Promise.resolve(1)
  }
  return buscar({ rotulo, fonte, buscas, orientacao, chave })
}

async function buscar({ rotulo, fonte, buscas, orientacao, chave }) {
  const cabecalho = { 'User-Agent': 'DevConductor-lp-assets/1.0 (busca de fotos com licenca)' }
  const lista = [], vistos = new Set()
  for (const busca of buscas) {
    const pedido = montarPedido(fonte, busca, { orientacao, chave })
    let resposta
    // 502/504 é instabilidade conhecida do Openverse: repetir com calma. Bloqueio ou limite encerra.
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      resposta = await fetch(pedido.url, { headers: { ...cabecalho, ...pedido.headers }, signal: AbortSignal.timeout(30_000) })
      if (![502, 503, 504].includes(resposta.status)) break
      await new Promise((r) => setTimeout(r, 3000))
    }
    if (resposta.status === 401 || resposta.status === 403 || resposta.status === 429) {
      console.error(`${fonte} respondeu ${resposta.status}: chave inválida, limite ou bloqueio. Parar aqui; não contornar.`)
      return 1
    }
    if (!resposta.ok) { console.error(`${fonte} respondeu ${resposta.status} para "${busca}"`); continue }
    for (const foto of normalizar(fonte, await resposta.json())) {
      if (vistos.has(foto.id) || lista.length >= 99) continue
      vistos.add(foto.id)
      lista.push({ n: lista.length + 1, busca, ...foto })
    }
  }
  fs.writeFileSync(`${rotulo}.json`, JSON.stringify(lista, null, 1), { flag: 'wx' })
  for (const foto of lista) {
    if (!foto.mini) continue
    try {
      const r = await fetch(foto.mini, { headers: cabecalho, signal: AbortSignal.timeout(30_000) })
      if (r.ok) fs.writeFileSync(`${rotulo}-${String(foto.n).padStart(2, '0')}.jpg`, Buffer.from(await r.arrayBuffer()), { flag: 'wx' })
    } catch { /* miniatura que falha só não entra na folha */ }
  }
  console.log(`${lista.length} fotos em ${rotulo}.json; folha: python -I folha-contato.py ${rotulo}`)
  return lista.length ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal(process.argv.slice(2)).then((codigo) => { process.exitCode = codigo }, (e) => { console.error(e.message); process.exitCode = 1 })
}
