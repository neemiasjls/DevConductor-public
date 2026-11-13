// Juiz às cegas com um painel de juízes de papéis diferentes (lp-revisao). Só monta o material e fecha a nota: não chama modelo nenhum.
// Uso: node juiz.mjs montar <prints-nosso> <prints-referencia> <pasta-saida> [--juizes n] [--papeis a,b,c]
//                             [--semente n] [--mapa mapa.json] [--parcial]
//      node juiz.mjs fechar <pasta-saida>
// montar: uma pasta por juiz (padrão 4, um papel diferente para cada; papel só repete com mais juízes que papéis)
//         numa pasta temporária de nome sorteado, FORA do projeto (o caminho não diz o cliente), com os dois sites em
//         letras sorteadas (diferentes por juiz e por tela), na mesma largura (o maior é reduzido dentro do
//         Chrome/Edge; o mais baixo é completado com margem cinza, nada é cortado) e ordem invertida entre juízes.
//         Imprime os caminhos e guarda em <pasta-saida>/gabarito/pastas.json; o gabarito nunca fica ao lado do que
//         o juiz lê. Tela ou seção só de um lado, ou fora do mapa, é erro; --parcial aceita e leva ao veredito.
// fechar: lê o notas.json de cada pasta de juiz (copia para <pasta-saida>/juiz-N/) e grava
//         <pasta-saida>/nota-final.md (mediana, diferença maior-menor, consenso, o que só um juiz apontou, veredito).
//         Código de saída: 0 aprovado, 1 reprovado, 2 erro, 3 pendente do dono (passaria, mas há dúvida).
// Regras, formato do notas.json e o pedido ao juiz: ../referencias/juiz-as-cegas.md
import fs from 'node:fs'
import os from 'node:os'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { acharNavegador } from './celular.mjs'

export const JUIZES = 4
export const MIN_JUIZES = 3
export const MAX_JUIZES = 8
// Papéis do painel, na ordem em que são distribuídos (o padrão de 4 juízes usa todos; com 3 entram os três primeiros). O foco de cada um
// mora na referência, entre <!-- papel:<id> --> e <!-- papel:fim -->.
export const PAPEIS = {
  'direcao-de-arte': 'direção de arte e composição',
  tipografia: 'tipografia e acabamento',
  celular: 'celular e uso',
  dono: 'dono do negócio',
}
export const DUVIDA = 1.5
const nomeDoPapel = (id) => PAPEIS[id] || id
export const TELAS = ['computador', 'tablet', 'celular']
export const PESOS = { design: 40, usabilidade: 30, criatividade: 20, conteudo: 10 }
// Régua A: toda mediana do nosso >= 9. Régua B: em cada tela, nosso >= referência em toda seção E média do nosso
// >= média da referência + 0,5 (o painel deu 6,3 a 8,1 para uma referência premiada: piso fixo não diz nada).
export const REGUAS = { a: 9, margem: 0.5 }
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // sem I e O, que se confundem com 1 e 0
const REFERENCIA_MD = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'referencias', 'juiz-as-cegas.md')

export class ErroDeUso extends Error {}

function sorteador(semente) {
  let a = semente >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const ordemNatural = (a, b) => a.localeCompare(b, 'pt', { numeric: true, sensitivity: 'base' })

// ---------------------------------------------------------------------------------------------------------
// Prints e pareamento
// ---------------------------------------------------------------------------------------------------------
// Pasta com <tela>-<secao>.(png|jpg|jpeg|webp) → { tela: [{ secao, arquivo }] } em ordem natural.
export function listarPrints(pasta) {
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) throw new ErroDeUso(`Pasta de prints não encontrada: ${pasta}`)
  const telas = {}
  for (const arquivo of fs.readdirSync(pasta)) {
    const m = /^([a-z]+)-(.+)\.(png|jpe?g|webp)$/i.exec(arquivo)
    if (!m || !TELAS.includes(m[1].toLowerCase())) continue
    ;(telas[m[1].toLowerCase()] ||= []).push({ secao: m[2], arquivo })
  }
  for (const lista of Object.values(telas)) lista.sort((x, y) => ordemNatural(x.secao, y.secao))
  return telas
}

// Devolve { telas: { tela: [{ n, nosso, referencia }] }, avisos, fora }. mapa: lista [{ nosso, referencia }] (todas
// as telas) ou { tela: lista }. Tela ou seção que não entra no juiz (só de um lado, ou fora do mapa) é erro, a não
// ser com parcial: aí vai para "fora", que aparece no veredito.
export function parear(nosso, referencia, mapa, { parcial = false } = {}) {
  const avisos = [], telas = {}, fora = []
  for (const tela of TELAS) {
    const a = nosso[tela], b = referencia[tela]
    if (!a && !b) continue
    if (!a || !b) { fora.push(`tela "${tela}" só existe ${a ? 'no nosso' : 'na referência'}`); continue }
    const doMapa = Array.isArray(mapa) ? mapa : mapa?.[tela]
    let pares
    if (doMapa) {
      if (!Array.isArray(doMapa) || !doMapa.length) throw new ErroDeUso(`Mapa: a tela "${tela}" precisa de uma lista de { nosso, referencia }.`)
      pares = doMapa.map((p, i) => {
        const x = a.find((s) => s.secao === String(p?.nosso)), y = b.find((s) => s.secao === String(p?.referencia))
        if (!x) throw new ErroDeUso(`Mapa, item ${i + 1}: não achei o print "${tela}-${p?.nosso}" no nosso.`)
        if (!y) throw new ErroDeUso(`Mapa, item ${i + 1}: não achei o print "${tela}-${p?.referencia}" na referência.`)
        return [x, y]
      })
      const usadas = (lado) => new Set(pares.map((p) => p[lado].secao))
      for (const [lista, lado, nome] of [[a, 0, 'do nosso'], [b, 1, 'da referência']]) {
        for (const s of lista) if (!usadas(lado).has(s.secao)) fora.push(`${tela}: seção "${s.secao}" ${nome} ficou fora do mapa`)
      }
    } else if (a.length === b.length && a.every((s) => b.some((r) => r.secao === s.secao))) {
      pares = a.map((s) => [s, b.find((r) => r.secao === s.secao)])
    } else if (a.length === b.length) {
      pares = a.map((s, i) => [s, b[i]])
      avisos.push(`Tela "${tela}": nomes diferentes nos dois lados; pareei pela ordem (${pares.map(([x, y]) => `${x.secao}=${y.secao}`).join(', ')}). Se estiver errado, use --mapa.`)
    } else {
      throw new ErroDeUso(`Tela "${tela}": ${a.length} prints no nosso e ${b.length} na referência. Diga o pareamento com --mapa mapa.json.`)
    }
    telas[tela] = pares.map(([x, y], i) => ({ n: i + 1, nosso: x.arquivo, referencia: y.arquivo }))
  }
  if (!Object.keys(telas).length) throw new ErroDeUso('Nenhuma tela com prints nos dois lados. Os arquivos precisam se chamar <tela>-<secao>.png (computador, tablet ou celular).')
  if (fora.length && !parcial) throw new ErroDeUso(`Cobertura incompleta: ${fora.join('; ')}. Toda tela e toda seção dos dois lados vai ao juiz; para julgar só uma parte de propósito, use --parcial (o que ficar de fora vai para o veredito).`)
  return { telas, avisos, fora }
}

// Letras e ordem: cada juiz e cada tela ganham duas letras que não se repetem em lugar nenhum (com painel grande
// as letras acabam e voltam a ser sorteadas, sem repetir dentro do mesmo juiz); quem é mostrado
// primeiro fica com a letra que vem antes no alfabeto, e o lado mostrado primeiro alterna de um juiz para o outro.
export function sortear(telas, semente, quantos = JUIZES, papeis = Object.keys(PAPEIS)) {
  if (!Number.isInteger(quantos) || quantos < MIN_JUIZES || quantos > MAX_JUIZES) throw new ErroDeUso(`--juizes precisa ser um número inteiro de ${MIN_JUIZES} a ${MAX_JUIZES}.`)
  if (!Array.isArray(papeis) || !papeis.length) throw new ErroDeUso('--papeis precisa de pelo menos um papel.')
  const rnd = sorteador(semente)
  if (telas.length * 2 > LETRAS.length) throw new ErroDeUso('Telas demais para sortear letras sem repetir.')
  const embaralhar = (fora = []) => [...LETRAS].filter((l) => !fora.includes(l)).map((l) => ({ l, k: rnd() })).sort((x, y) => x.k - y.k).map((x) => x.l)
  let baralho = embaralhar()
  const comecaPeloNosso = rnd() < 0.5
  const juizes = []
  for (let j = 0; j < quantos; j++) {
    const nossoPrimeiro = (j % 2 === 0) === comecaPeloNosso
    const porTela = {}
    for (const tela of telas) {
      if (baralho.length < 2) baralho = embaralhar(Object.values(porTela).flatMap((t) => t.ordem))
      const [l1, l2] = [baralho.pop(), baralho.pop()].sort()
      porTela[tela] = { ordem: [l1, l2], letras: { [l1]: nossoPrimeiro ? 'nosso' : 'referencia', [l2]: nossoPrimeiro ? 'referencia' : 'nosso' } }
    }
    juizes.push({ pasta: `juiz-${j + 1}`, papel: papeis[j % papeis.length], primeiro: nossoPrimeiro ? 'nosso' : 'referencia', telas: porTela })
  }
  // Juízes do mesmo papel valem como um só: papel repete só quando há mais juízes que papéis.
  const distintos = new Set(juizes.map((j) => j.papel)).size, minimo = Math.min(quantos, Object.keys(PAPEIS).length)
  if (distintos < minimo) throw new ErroDeUso(`--papeis: com ${quantos} juízes são precisos ${minimo} papéis diferentes (vieram ${distintos}). Papel só se repete quando há mais juízes que papéis (${Object.keys(PAPEIS).length}).`)
  return juizes
}

// Largura e altura de um PNG ou JPEG, lidas do cabeçalho.
export function tamanhoImagem(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { largura: buf.readUInt32BE(16), altura: buf.readUInt32BE(20) }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue }
      const m = buf[i + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { largura: buf.readUInt16BE(i + 7), altura: buf.readUInt16BE(i + 5) }
      if (m === 0xff) { i++; continue }
      i += (m >= 0xd0 && m <= 0xd9) || m === 0x01 ? 2 : 2 + buf.readUInt16BE(i + 2)
    }
  }
  throw new Error('Imagem que não é PNG nem JPEG.')
}

// ---------------------------------------------------------------------------------------------------------
// Redução dentro do Chrome (protocolo DevTools): uma página local carrega cada print e devolve o JPEG pronto
// ---------------------------------------------------------------------------------------------------------
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
export const MARGEM = '#808080' // margem cinza neutra que completa o lado mais baixo

// arquivos: caminhos completos; a página só enxerga /img/<índice>.
export async function abrirConversor(executavel, arquivos) {
  const tipos = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
  const servidor = http.createServer((req, res) => {
    const m = /^\/img\/(\d+)$/.exec(req.url || '')
    const arq = m && arquivos[Number(m[1])]
    if (arq) { res.writeHead(200, { 'content-type': tipos[path.extname(arq).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(arq).pipe(res) }
    else if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>juiz</title>') }
    else { res.writeHead(404); res.end() }
  })
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'juiz-'))
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank']
  if (process.platform === 'linux' && process.env.CI) args.unshift('--no-sandbox')
  const proc = spawn(executavel, args, { stdio: 'ignore' })
  let ws
  const fechar = async () => {
    try { ws?.close() } catch {}
    try { proc.kill() } catch {}
    await new Promise((r) => servidor.close(r))
    for (let i = 0; i < 10; i++) { try { fs.rmSync(perfil, { recursive: true, force: true }); break } catch { await espera(300) } }
  }
  try {
    // Porta 0: o sistema escolhe uma livre e o navegador a grava no NOSSO perfil; não esbarra em outro Chrome aberto.
    let porta
    for (let i = 0; i < 80 && !porta; i++) {
      await espera(150)
      try { porta = Number(fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]) } catch {}
    }
    let alvo
    for (let i = 0; i < 40 && porta && !alvo; i++) {
      try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()).find((t) => t.type === 'page') } catch {}
      if (!alvo) await espera(150)
    }
    if (!alvo) throw new Error('Não consegui abrir o Chrome/Edge sem janela.')
    ws = new WebSocket(alvo.webSocketDebuggerUrl)
    await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
    let id = 0
    const pendentes = new Map()
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id) }
    })
    const cmd = (method, params = {}) => new Promise((resolve, reject) => {
      const n = ++id
      const t = setTimeout(() => { pendentes.delete(n); reject(new Error(`${method} demorou demais`)) }, 60_000)
      pendentes.set(n, (msg) => { clearTimeout(t); msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result) })
      ws.send(JSON.stringify({ id: n, method, params }))
    })
    const avaliar = async (expression) => {
      const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error(`Falha ao tratar imagem: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`)
      return r.result.value
    }
    const origem = `http://127.0.0.1:${servidor.address().port}`
    await cmd('Page.navigate', { url: `${origem}/` })
    for (let i = 0; i < 60; i++) { if (await avaliar(`location.origin === ${JSON.stringify(origem)} && document.readyState === 'complete'`)) break; await espera(100) }
    return {
      medir: (i) => avaliar(`(async () => { const b = await createImageBitmap(await (await fetch('/img/${i}')).blob()); return { largura: b.width, altura: b.height } })()`),
      // Reduz para a largura dada (sem esticar a proporção), completa até a altura dada com margem cinza neutra (nada
      // é cortado) e devolve JPEG.
      converter: async (i, largura, altura) => {
        const dados = await avaliar(`(async () => {
          const blob = await (await fetch('/img/${i}')).blob()
          const cru = await createImageBitmap(blob)
          const h = Math.max(1, Math.round(cru.height * ${largura} / cru.width))
          const img = cru.width === ${largura} ? cru : await createImageBitmap(blob, { resizeWidth: ${largura}, resizeHeight: h, resizeQuality: 'high' })
          const tela = document.createElement('canvas'); tela.width = ${largura}; tela.height = ${altura}
          const c = tela.getContext('2d'); c.fillStyle = '${MARGEM}'; c.fillRect(0, 0, ${largura}, ${altura}); c.drawImage(img, 0, 0)
          return tela.toDataURL('image/jpeg', 0.9)
        })()`)
        return Buffer.from(String(dados).split(',')[1], 'base64')
      },
      // Cor média [r, g, b] de uma imagem (decodificada pelo navegador): usada para conferir o lado de cada letra.
      corMedia: (i) => avaliar(`(async () => {
        const b = await createImageBitmap(await (await fetch('/img/${i}')).blob())
        const t = new OffscreenCanvas(b.width, b.height), c = t.getContext('2d'); c.drawImage(b, 0, 0)
        const d = c.getImageData(0, 0, b.width, b.height).data, soma = [0, 0, 0]
        for (let p = 0; p < d.length; p += 4) { soma[0] += d[p]; soma[1] += d[p + 1]; soma[2] += d[p + 2] }
        return soma.map((x) => Math.round(x / (d.length / 4)))
      })()`),
      fechar,
    }
  } catch (e) { await fechar(); throw e }
}

// ---------------------------------------------------------------------------------------------------------
// Pedido ao juiz (o texto mora em ../referencias/juiz-as-cegas.md, entre os marcadores)
// ---------------------------------------------------------------------------------------------------------
export function modeloDoPedido() {
  const m = /<!-- pedido:inicio -->\r?\n([\s\S]*?)\r?\n<!-- pedido:fim -->/.exec(fs.readFileSync(REFERENCIA_MD, 'utf8'))
  if (!m) throw new Error(`Não achei o pedido ao juiz em ${REFERENCIA_MD} (marcadores pedido:inicio e pedido:fim).`)
  return m[1].replace(/\r\n/g, '\n')
}

// Foco de cada papel: { id: texto }, lido da referência.
export function focosDosPapeis() {
  const focos = {}
  for (const m of fs.readFileSync(REFERENCIA_MD, 'utf8').matchAll(/<!-- papel:([a-z0-9-]+) -->\r?\n([\s\S]*?)\r?\n<!-- papel:fim -->/g)) focos[m[1]] = m[2].replace(/\r\n/g, '\n').trim()
  return focos
}
function focoDoPapel(id) {
  const focos = focosDosPapeis()
  if (!focos[id]) throw new ErroDeUso(`Papel desconhecido: "${id}". Papéis com pedido na referência: ${Object.keys(focos).join(', ')}.`)
  return focos[id]
}

export function textoDoPedido(juiz, numero, secoes) {
  const papel = juiz.papel ?? Object.keys(PAPEIS)[(numero - 1) % Object.keys(PAPEIS).length]
  const linhas = [], modelo = { juiz: numero, telas: {}, adaptado: {} }
  for (const [tela, t] of Object.entries(juiz.telas)) {
    const n = secoes[tela].length
    linhas.push(`- \`${tela}/\`: sites **${t.ordem[0]}** e **${t.ordem[1]}**, ${n} ${n === 1 ? 'seção' : 'seções'} cada (\`secao-1.jpg\`${n > 1 ? ` a \`secao-${n}.jpg\`` : ''}). Olhe primeiro o ${t.ordem[0]}, depois o ${t.ordem[1]}.`)
    modelo.telas[tela] = {}
    for (const letra of t.ordem) {
      modelo.telas[tela][letra] = {
        secoes: Object.fromEntries(secoes[tela].map((s) => [String(s.n), { design: 8, usabilidade: 8, criatividade: 8, conteudo: 8 }])),
        impede: [{ secao: 1, lugar: 'onde, na imagem', problema: 'o que está errado', correcao: 'o que fazer' }],
      }
    }
    modelo.adaptado[tela] = `${t.ordem[0]}, ${t.ordem[1]} ou nenhum`
  }
  return modeloDoPedido().replaceAll('{{JUIZ}}', String(numero)).replaceAll('{{PAPEL}}', nomeDoPapel(papel)).replaceAll('{{FOCO}}', focoDoPapel(papel)).replaceAll('{{TELAS}}', linhas.join('\n')).replaceAll('{{MODELO}}', JSON.stringify(modelo, null, 1)) + '\n'
}

// ---------------------------------------------------------------------------------------------------------
// montar
// ---------------------------------------------------------------------------------------------------------
// neutra: onde nascem as pastas dos juízes (padrão: a pasta temporária do sistema, fora do projeto).
export async function montar({ nosso, referencia, saida, semente = Date.now(), mapa, juizes: quantos = JUIZES, papeis, parcial = false, neutra = os.tmpdir(), executavel = acharNavegador() }) {
  const destino = path.resolve(saida)
  if (fs.existsSync(destino) && fs.readdirSync(destino).length) throw new ErroDeUso(`A pasta de saída precisa ser nova ou vazia: ${saida}`)
  const { telas, avisos, fora } = parear(listarPrints(nosso), listarPrints(referencia), mapa, { parcial })
  const juizes = sortear(Object.keys(telas), semente, quantos, papeis)
  modeloDoPedido()
  for (const juiz of juizes) focoDoPapel(juiz.papel)
  if (!executavel) throw new ErroDeUso('Chrome/Edge não encontrado. Instale um dos dois ou defina BROWSER_EXECUTABLE com o caminho do programa.')

  const arquivos = [], indice = (lado, arq) => arquivos.push(path.resolve(lado, arq)) - 1
  const pares = Object.entries(telas).flatMap(([tela, lista]) => lista.map((s) => ({ tela, n: s.n, a: indice(nosso, s.nosso), b: indice(referencia, s.referencia) })))
  const resolucao = {}
  // Uma pasta de nome sorteado por juiz, fora do projeto: o caminho que o juiz recebe não diz de quem é o site.
  const pastas = Object.fromEntries(juizes.map((j) => [j.pasta, fs.mkdtempSync(path.join(neutra, 'avaliacao-'))]))
  const limparPastas = () => { for (const p of Object.values(pastas)) fs.rmSync(p, { recursive: true, force: true }) }
  let conversor
  try { conversor = await abrirConversor(executavel, arquivos) } catch (e) { limparPastas(); throw e }
  try {
    const medidas = []
    for (let i = 0; i < arquivos.length; i++) medidas.push(await conversor.medir(i))
    for (const tela of Object.keys(telas)) {
      const daTela = pares.filter((p) => p.tela === tela)
      const largura = Math.min(...daTela.flatMap((p) => [medidas[p.a].largura, medidas[p.b].largura]))
      const alturaEm = (i) => Math.max(1, Math.round(medidas[i].altura * largura / medidas[i].largura))
      resolucao[tela] = { largura, alturas: [] }
      for (const p of daTela) {
        const altura = Math.max(alturaEm(p.a), alturaEm(p.b))
        if (Math.abs(alturaEm(p.a) - alturaEm(p.b)) > altura * 0.02) avisos.push(`${tela}, seção ${p.n}: alturas diferentes nos dois lados; completei o mais baixo com margem cinza (a seção inteira vai ao juiz).`)
        resolucao[tela].alturas.push(altura)
        const prontos = { nosso: await conversor.converter(p.a, largura, altura), referencia: await conversor.converter(p.b, largura, altura) }
        for (const buf of Object.values(prontos)) {
          const t = tamanhoImagem(buf)
          if (t.largura !== largura || t.altura !== altura) throw new Error(`${tela}, seção ${p.n}: a imagem saiu em ${t.largura}x${t.altura}, esperado ${largura}x${altura}.`)
        }
        for (const juiz of juizes) {
          for (const [letra, lado] of Object.entries(juiz.telas[tela].letras)) {
            const pasta = path.join(pastas[juiz.pasta], tela, letra)
            fs.mkdirSync(pasta, { recursive: true })
            fs.writeFileSync(path.join(pasta, `secao-${p.n}.jpg`), prontos[lado])
          }
        }
      }
    }
  } catch (e) { limparPastas(); throw e } finally { await conversor.fechar() }

  juizes.forEach((juiz, i) => fs.writeFileSync(path.join(pastas[juiz.pasta], 'pedido.md'), textoDoPedido(juiz, i + 1, telas)))
  fs.mkdirSync(path.join(destino, 'gabarito'), { recursive: true })
  const gabarito = { semente, origem: { nosso: path.resolve(nosso), referencia: path.resolve(referencia) }, secoes: telas, resolucao, juizes, pastas, avisos, fora, parcial }
  fs.writeFileSync(path.join(destino, 'gabarito', 'gabarito.json'), JSON.stringify(gabarito, null, 1))
  fs.writeFileSync(path.join(destino, 'gabarito', 'pastas.json'), JSON.stringify(pastas, null, 1))
  return gabarito
}

// ---------------------------------------------------------------------------------------------------------
// fechar
// ---------------------------------------------------------------------------------------------------------
const arredondar = (x) => Math.round(x * 100) / 100
export function mediana(valores) {
  const v = [...valores].sort((a, b) => a - b), m = Math.floor(v.length / 2)
  return arredondar(v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2)
}

// Nota de uma seção: número pronto ou as quatro notas (aplica os pesos).
export function notaDaSecao(valor, onde) {
  const nota = (x, nome) => {
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 10) throw new ErroDeUso(`${onde}: ${nome} precisa ser número de 0 a 10.`)
    return x
  }
  if (valor && typeof valor === 'object') return arredondar(Object.entries(PESOS).reduce((soma, [nome, peso]) => soma + nota(valor[nome], nome) * peso, 0) / 100)
  return arredondar(nota(valor, 'a nota'))
}

// notas: uma por juiz, na ordem de gabarito.juizes. Devolve as medianas, as duas réguas e o veredito.
export function fecharNotas(gabarito, notas) {
  const telas = {}, impede = [], duvidas = [], adaptado = { nosso: 0, referencia: 0, quem: [] }
  for (const [tela, secoes] of Object.entries(gabarito.secoes)) {
    telas[tela] = secoes.map((s) => ({ n: s.n, arquivo: s.nosso, nosso: [], referencia: [] }))
  }
  gabarito.juizes.forEach((juiz, j) => {
    const resposta = notas[j], apontou = new Set()
    for (const [tela, t] of Object.entries(juiz.telas)) {
      for (const [letra, lado] of Object.entries(t.letras)) {
        const site = resposta?.telas?.[tela]?.[letra]
        if (!site?.secoes) throw new ErroDeUso(`${juiz.pasta}/notas.json: faltam as notas do site ${letra} em "${tela}".`)
        for (const linha of telas[tela]) {
          if (!(String(linha.n) in site.secoes)) throw new ErroDeUso(`${juiz.pasta}/notas.json: falta a seção ${linha.n} do site ${letra} em "${tela}".`)
          linha[lado].push(notaDaSecao(site.secoes[String(linha.n)], `${juiz.pasta}/notas.json, ${tela}, site ${letra}, seção ${linha.n}`))
        }
        if (lado === 'nosso') for (const item of Array.isArray(site.impede) ? site.impede : []) impede.push({ juiz: j + 1, tela, ...item })
      }
      const lado = t.letras[String(resposta?.adaptado?.[tela] ?? '').trim().toUpperCase()]
      if (lado) apontou.add(lado)
    }
    for (const lado of apontou) { adaptado[lado]++; if (lado === 'nosso') adaptado.quem.push(j + 1) }
  })
  let reguaA = true
  const reguaB = {}, medias = {}
  for (const [tela, linhas] of Object.entries(telas)) {
    reguaB[tela] = true
    for (const linha of linhas) {
      for (const lado of ['nosso', 'referencia']) {
        const v = linha[lado]
        linha[lado] = { notas: v, mediana: mediana(v), diferenca: arredondar(Math.max(...v) - Math.min(...v)) }
        // Dúvida só conta no nosso: discordância sobre a referência não muda o que fazer na nossa página.
        if (lado === 'nosso' && linha[lado].diferenca > DUVIDA) duvidas.push({ tela, n: linha.n, lado, diferenca: linha[lado].diferenca })
      }
      if (linha.nosso.mediana < REGUAS.a) reguaA = false
      if (linha.nosso.mediana < linha.referencia.mediana) reguaB[tela] = false
    }
    // Compara as médias cruas; arredondar antes deixaria passar vantagem de 0,4967 como se fosse 0,5.
    const media = (lado) => linhas.reduce((s, l) => s + l[lado].mediana, 0) / linhas.length
    const nosso = media('nosso'), referencia = media('referencia')
    medias[tela] = { nosso: arredondar(nosso), referencia: arredondar(referencia) }
    if (nosso < referencia + REGUAS.margem - 1e-9) reguaB[tela] = false
  }
  const passouB = Object.values(reguaB).every(Boolean)
  // O que só um juiz apontou: item de "impede" numa tela e seção em que nenhum outro juiz apontou nada. É o
  // sinal de que aquele papel (ou aquele modelo) vê o que os outros não veem.
  const papeis = gabarito.juizes.map((j, i) => ({ juiz: i + 1, papel: j.papel ?? null, nome: j.papel ? nomeDoPapel(j.papel) : null }))
  const soDele = papeis.map((p) => ({ ...p, itens: impede.filter((i) => i.juiz === p.juiz && !impede.some((o) => o.juiz !== i.juiz && o.tela === i.tela && String(o.secao) === String(i.secao))) })).filter((p) => p.itens.length)
  // Consenso: tela e seção em que 2 ou mais juízes apontaram algo (com a contagem).
  const grupos = new Map()
  for (const i of impede) { const k = `${i.tela}|${i.secao}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(i) }
  const consenso = [...grupos.values()].map((itens) => ({ tela: itens[0].tela, secao: itens[0].secao, juizes: [...new Set(itens.map((i) => i.juiz))].sort((a, b) => a - b), itens }))
    .filter((g) => g.juizes.length >= 2).sort((a, b) => b.juizes.length - a.juizes.length)
  const passou = reguaA || passouB, pendente = passou && duvidas.length > 0, aprovado = passou && !pendente
  return { juizes: gabarito.juizes.length, papeis, telas, impede, consenso, soDele, duvidas, adaptado, reguaA, reguaB, medias, passouB, passou, pendente, aprovado,
    veredito: aprovado ? 'APROVADO' : pendente ? 'PENDENTE' : 'REPROVADO', fora: gabarito.fora || [] }
}

const br = (x) => String(x).replace('.', ',')
export function textoNotaFinal(r) {
  const simNao = (x) => (x ? 'passou' : 'não passou')
  const t = [
    '# Nota final do juiz às cegas', '',
    `**Veredito: ${r.veredito}** (${r.juizes} juízes; vale a mediana).`, '',
    `- Régua A (toda mediana do nosso >= ${br(REGUAS.a)}): ${simNao(r.reguaA)}.`,
    `- Régua B (em cada tela, nosso >= referência em toda seção e média do nosso >= média da referência + ${br(REGUAS.margem)}): ${simNao(r.passouB)}${r.medias ? ` (${Object.entries(r.reguaB).map(([tela, ok]) => `${tela}: ${simNao(ok)}, médias ${br(r.medias[tela].nosso)} x ${br(r.medias[tela].referencia)}`).join('; ')})` : ''}.`,
    '- Aprova quem passa em uma das duas. A régua B existe porque a referência premiada não tira 9 em tudo com o painel.',
    `- Apontaram o nosso como adaptado: ${r.adaptado.nosso} de ${r.juizes}${r.adaptado.quem.length ? ` (juiz ${r.adaptado.quem.join(', ')})` : ''}. Apontaram a referência: ${r.adaptado.referencia} de ${r.juizes}.`,
  ]
  if (r.papeis?.some((p) => p.nome)) t.push(`- Painel: ${r.papeis.map((p) => `juiz ${p.juiz}, ${p.nome ?? 'sem papel'}`).join('; ')}.`)
  if (r.duvidas?.length) t.push(`- **Dúvida: chamar o dono.** Os juízes discordam em mais de ${br(DUVIDA)} ponto (maior - menor) no nosso em: ${r.duvidas.map((d) => `${d.tela}, seção ${d.n} (${br(d.diferenca)})`).join('; ')}. A mediana não resolve discordância desse tamanho: mostrar a seção ao dono, de preferência em duas opções lado a lado.${r.pendente ? ' As réguas passariam: o veredito fica PENDENTE até o dono decidir.' : ''}`)
  if (r.adaptado.nosso >= 2) t.push(`- **Aviso:** ${r.adaptado.nosso} juízes viram o nosso como adaptado. Tratar isso antes de mostrar a página, mesmo aprovada.`)
  if (r.fora?.length) t.push(`- **Ficou de fora do juiz (--parcial):** ${r.fora.join('; ')}. A nota não vale para essas partes.`)
  for (const [tela, linhas] of Object.entries(r.telas)) {
    t.push('', `## ${tela}`, '', '| Seção | Nosso (mediana) | Maior - menor | Notas | Referência (mediana) | Maior - menor | Notas |', '|---|---|---|---|---|---|---|')
    for (const l of linhas) {
      const lado = (x, marca) => `${br(x.mediana)} | ${br(x.diferenca)}${marca && x.diferenca > DUVIDA ? ' (dúvida: chamar o dono)' : ''} | ${x.notas.map(br).join(' · ')}`
      t.push(`| ${l.n} (${l.arquivo}) | ${lado(l.nosso, true)} | ${lado(l.referencia, false)} |`)
    }
  }
  t.push('', '## O que impede o 9 no nosso', '')
  if (!r.impede.length) t.push('Nenhum item apontado.')
  const item = (i, quem) => `- ${i.tela}, seção ${i.secao ?? '?'}${quem ? ` (juiz ${i.juiz})` : ''}: ${i.lugar ? `${i.lugar}: ` : ''}${i.problema ?? ''}${i.correcao ? ` Correção: ${i.correcao}` : ''}`
  if (r.consenso?.length) {
    t.push('### Consenso: 2 ou mais juízes na mesma tela e seção (tratar primeiro)', '')
    for (const g of r.consenso) { t.push(`**${g.tela}, seção ${g.secao ?? '?'}: ${g.juizes.length} de ${r.juizes} juízes (${g.juizes.join(', ')})**`, ''); for (const i of g.itens) t.push(item(i, true)); t.push('') }
  }
  if (r.soDele?.length) {
    t.push('', '## O que só um juiz apontou, por papel', '', 'Item numa tela e seção em que nenhum outro juiz apontou nada. Vem depois do consenso; conferir na página: costuma ser o que só aquele olhar vê.')
    for (const p of r.soDele) { t.push('', `### Juiz ${p.juiz}${p.nome ? `: ${p.nome}` : ''}`, ''); for (const i of p.itens) t.push(item(i, false)) }
  }
  return t.join('\n') + '\n'
}

export function fechar(saida) {
  const arqGabarito = path.join(saida, 'gabarito', 'gabarito.json')
  if (!fs.existsSync(arqGabarito)) throw new ErroDeUso(`Não achei ${arqGabarito}. Rode o "montar" antes.`)
  const gabarito = JSON.parse(fs.readFileSync(arqGabarito, 'utf8'))
  // As notas nascem nas pastas neutras dos juízes (gabarito/pastas.json) e são copiadas para a saída.
  const arqPastas = path.join(saida, 'gabarito', 'pastas.json')
  const pastas = fs.existsSync(arqPastas) ? JSON.parse(fs.readFileSync(arqPastas, 'utf8')) : (gabarito.pastas || {})
  for (const j of gabarito.juizes) {
    const origem = pastas[j.pasta] && path.join(pastas[j.pasta], 'notas.json')
    if (origem && fs.existsSync(origem)) { fs.mkdirSync(path.join(saida, j.pasta), { recursive: true }); fs.copyFileSync(origem, path.join(saida, j.pasta, 'notas.json')) }
  }
  const faltam = gabarito.juizes.filter((j) => !fs.existsSync(path.join(saida, j.pasta, 'notas.json'))).map((j) => `${j.pasta}/notas.json${pastas[j.pasta] ? ` (procurei em ${pastas[j.pasta]})` : ''}`)
  if (faltam.length) throw new ErroDeUso(`Faltam notas: ${faltam.join(', ')}. A nota só fecha com os ${gabarito.juizes.length} juízes.`)
  const notas = gabarito.juizes.map((j) => {
    try { return JSON.parse(fs.readFileSync(path.join(saida, j.pasta, 'notas.json'), 'utf8').replace(/^﻿/, '')) }
    catch (e) { throw new ErroDeUso(`${j.pasta}/notas.json não é JSON válido: ${e.message}`) }
  })
  const resultado = fecharNotas(gabarito, notas)
  fs.writeFileSync(path.join(saida, 'nota-final.md'), textoNotaFinal(resultado))
  return resultado
}

// ---------------------------------------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------------------------------------
const USO = 'Uso: node juiz.mjs montar <prints-nosso> <prints-referencia> <pasta-saida> [--juizes n] [--papeis a,b,c] [--semente n] [--mapa mapa.json] [--parcial]\n     node juiz.mjs fechar <pasta-saida>'

export async function executar(argv) {
  const pos = [], op = {}
  for (let i = 0; i < argv.length; i++) {
    if (['--semente', '--mapa', '--juizes', '--papeis'].includes(argv[i])) op[argv[i].slice(2)] = argv[++i]
    else if (argv[i] === '--parcial') op.parcial = true
    else if (argv[i].startsWith('--')) throw new ErroDeUso(`Opção desconhecida: ${argv[i]}\n${USO}`)
    else pos.push(argv[i])
  }
  if (pos[0] === 'montar' && pos.length === 4) {
    const semente = op.semente === undefined ? Date.now() : Number(op.semente)
    if (!Number.isFinite(semente)) throw new ErroDeUso('--semente precisa ser um número.')
    let mapa
    if (op.mapa) {
      try { mapa = JSON.parse(fs.readFileSync(op.mapa, 'utf8').replace(/^﻿/, '')) }
      catch (e) { throw new ErroDeUso(`Não consegui ler o mapa ${op.mapa}: ${e.message}`) }
    }
    const papeis = op.papeis === undefined ? undefined : String(op.papeis).split(',').map((x) => x.trim()).filter(Boolean)
    const juizes = op.juizes === undefined ? Math.max(JUIZES, papeis?.length ?? 0) : Number(op.juizes)
    const g = await montar({ nosso: pos[1], referencia: pos[2], saida: pos[3], semente, mapa, juizes, papeis, parcial: Boolean(op.parcial) })
    for (const a of g.avisos) console.log(`Aviso: ${a}`)
    for (const f of g.fora) console.log(`Fora do juiz (--parcial): ${f}`)
    for (const [tela, r] of Object.entries(g.resolucao)) console.log(`${tela}: ${g.secoes[tela].length} seções, ${r.largura} px de largura nos dois lados.`)
    console.log(`Material de ${g.juizes.length} juízes, cada um numa pasta neutra (rodar o juiz com -C nela):`)
    for (const j of g.juizes) console.log(`  ${j.pasta} (${nomeDoPapel(j.papel)}): ${g.pastas[j.pasta]}`)
    console.log(`Gabarito e lista das pastas em ${path.join(pos[3], 'gabarito')}. Cada juiz lê só a própria pasta; o notas.json fica nela.`)
    return 0
  }
  if (pos[0] === 'fechar' && pos.length === 2) {
    const r = fechar(pos[1])
    console.log(`${r.veredito}: régua A ${r.reguaA ? 'passou' : 'não passou'}, régua B ${r.passouB ? 'passou' : 'não passou'}; ${r.adaptado.nosso} de ${r.juizes} apontaram o nosso como adaptado${r.duvidas.length ? `; dúvida: chamar o dono (${r.duvidas.length} ${r.duvidas.length === 1 ? 'seção' : 'seções'} com diferença acima de ${br(DUVIDA)})` : ''}. Detalhe em ${path.join(pos[1], 'nota-final.md')}.`)
    return r.aprovado ? 0 : r.pendente ? 3 : 1
  }
  throw new ErroDeUso(USO)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await executar(process.argv.slice(2)) }
  catch (e) { console.error(e instanceof ErroDeUso ? e.message : `Erro: ${e.message}`); process.exitCode = 2 }
}
