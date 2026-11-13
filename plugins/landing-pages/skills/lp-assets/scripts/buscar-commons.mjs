// Busca fotos no Wikimedia Commons com licença aberta e grava a lista com autor e licença de cada uma.
// Uso: node buscar-commons.mjs <rotulo> "<busca 1>" ["<busca 2>" ...] [--minimo 2000] [--com-arte]
// Saída na pasta atual: <rotulo>.json e miniaturas <rotulo>-NN.jpg (para folha-contato.py), sem sobrescrita.
// Só CC0, domínio público, CC BY e CC BY-SA; gravuras, pinturas e digitalizações antigas ficam fora
// (--com-arte inclui). Conferir a página de cada foto antes de usar: a API não vê direito de imagem.
import fs from 'node:fs'
import { baixarImagem } from './baixar-imagem.mjs'

const args = process.argv.slice(2)
const minimoI = args.indexOf('--minimo')
const minimo = minimoI >= 0 ? Number(args[minimoI + 1]) : 2000
const comArte = args.includes('--com-arte')
const [rotulo, ...buscas] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--minimo')
if (!rotulo || !buscas.length || !/^[a-z0-9-]+$/.test(rotulo) || !Number.isSafeInteger(minimo) || minimo <= 0 ||
  args.some(a => a.startsWith('--') && !['--minimo', '--com-arte'].includes(a))) {
  console.log('Uso: node buscar-commons.mjs <rotulo> "<busca>" [...] [--minimo 2000] [--com-arte]'); process.exit(1)
}
if (fs.existsSync(`${rotulo}.json`) || fs.readdirSync('.').some(n => new RegExp(`^${rotulo}-\\d+\\.jpg$`, 'i').test(n))) {
  console.error(`Saída ${rotulo} já existe. Use outro rótulo para preservar a busca anterior.`); process.exit(1)
}
const cabecalho = { 'User-Agent': 'DevConductor-lp-assets/1.0 (busca de fotos com licenca)' }
const licencaAberta = /^(cc0|public domain|cc by [234]\.0|cc by-sa [34]\.0)$/i
const arteAntiga = /wellcome|etching|engraving|drawing|lithograph|painting|DPLA|HABS|\.tiff?$/i
const vistos = new Set(), lista = []
for (const busca of buscas) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  Object.entries({ action: 'query', format: 'json', generator: 'search', gsrsearch: `${busca} filetype:bitmap`,
    gsrnamespace: 6, gsrlimit: 50, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: 360 })
    .forEach(([k, v]) => u.searchParams.set(k, String(v)))
  const resposta = await fetch(u, { headers: cabecalho, signal: AbortSignal.timeout(20_000) })
  if (!resposta.ok) { console.error(`Commons respondeu ${resposta.status} para "${busca}"`); continue }
  const dados = await resposta.json()
  for (const pagina of Object.values(dados.query?.pages || {})) {
    const info = pagina.imageinfo?.[0], meta = info?.extmetadata || {}
    const licenca = (meta.LicenseShortName?.value || '').trim()
    if (!info || !licencaAberta.test(licenca) || Math.max(info.width, info.height) < minimo) continue
    if (vistos.has(pagina.title) || (!comArte && arteAntiga.test(pagina.title))) continue
    vistos.add(pagina.title)
    lista.push({ n: lista.length + 1, titulo: pagina.title.replace(/^File:/, ''), licenca,
      licencaUrl: meta.LicenseUrl?.value || '', autor: (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim(),
      largura: info.width, altura: info.height, original: info.url, pagina: info.descriptionurl, mini: info.thumburl })
  }
}
fs.writeFileSync(`${rotulo}.json`, JSON.stringify(lista, null, 1), { flag: 'wx' })
let semMini = 0
for (const foto of lista) {
  const r = await baixarImagem(foto.mini, { headers: cabecalho })
  if (!r.ok) { semMini++; console.error(`Miniatura ${foto.n} (${foto.titulo}) não gravada: ${r.motivo}`); continue }
  fs.writeFileSync(`${rotulo}-${String(foto.n).padStart(2, '0')}.jpg`, r.buffer, { flag: 'wx' })
}
if (semMini) console.error(`${semMini} miniatura(s) ficaram de fora da folha; a lista no .json continua completa.`)
console.log(`${lista.length} fotos em ${rotulo}.json; folha: python -I folha-contato.py ${rotulo}`)
