// Compara duas rodadas de revisão: prints com o mesmo nome (diferença por pixel feita no Chrome/Edge, num canvas,
// sem biblioteca) e, se vierem, os relatórios do Lighthouse de antes e de depois.
// Uso: node rodadas.mjs <pasta-rodada-anterior> <pasta-rodada-nova> [pasta-saida]
//                       [--lighthouse-antes a.json --lighthouse-depois b.json] [--json]
// Grava na pasta de saída (padrão: ./rodadas) `<print>-diferenca.png`, `rodadas.json` e `resumo.txt`.
// A diferença dos prints é informação, não reprova. O Lighthouse reprova se alguma categoria cair mais de 3 pontos,
// o LCP piorar mais de 15% ou o CLS da rodada nova passar de 0,1.
// Relatório novo sem uma categoria ou medida (LCP, CLS) que deveria estar lá: "comparação incompleta", nunca "passou".
// Código de saída: 0 sem queda · 1 o Lighthouse caiu · 2 erro de uso (pasta ou relatório que não abre) ou comparação
// pedida que não pôde ser feita (navegador não abriu, print ilegível, só um dos relatórios, comparação incompleta).
// BROWSER_EXECUTABLE aponta outro Chrome/Edge. Não acessa a rede: só lê os arquivos das duas pastas.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const LIMITES = { quedaCategoria: 3, pioraLcp: 0.15, cls: 0.1, tolerancia: 16 }
const IMAGEM = /\.(png|jpe?g|webp)$/i
const TIPO = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

// ---------------------------------------------------------------------------------------------------------
// Lighthouse
// ---------------------------------------------------------------------------------------------------------
export function pontosLighthouse(rel) {
  const categorias = {}
  for (const [chave, c] of Object.entries(rel?.categories || {})) {
    if (typeof c?.score === 'number') categorias[chave] = { nome: c.title || chave, pontos: Math.round(c.score * 100) }
  }
  const num = (a) => (typeof rel?.audits?.[a]?.numericValue === 'number' ? rel.audits[a].numericValue : null)
  return { categorias, lcp: num('largest-contentful-paint'), cls: num('cumulative-layout-shift') }
}

export function compararLighthouse(antes, depois) {
  if (!antes || !depois) return { estado: 'não comparado', motivo: 'Lighthouse não comparado (faltou o relatório de antes ou de depois)', itens: [] }
  const a = pontosLighthouse(antes), d = pontosLighthouse(depois)
  const itens = [], quedas = [], faltas = []
  for (const [chave, ca] of Object.entries(a.categorias)) if (!d.categorias[chave]) faltas.push(`${ca.nome} sumiu do relatório novo`)
  if (d.lcp == null) faltas.push('LCP sem medida no relatório novo')
  else if (a.lcp == null) faltas.push('LCP sem medida no relatório anterior')
  if (d.cls == null) faltas.push('CLS sem medida no relatório novo')
  for (const [chave, cd] of Object.entries(d.categorias)) {
    const ca = a.categorias[chave]
    if (!ca) continue
    const variacao = cd.pontos - ca.pontos
    const caiu = -variacao > LIMITES.quedaCategoria
    itens.push({ nome: cd.nome, antes: ca.pontos, depois: cd.pontos, variacao, caiu })
    if (caiu) quedas.push(`${cd.nome} caiu ${-variacao} pontos (${ca.pontos} → ${cd.pontos})`)
  }
  if (a.lcp != null && d.lcp != null) {
    const piora = a.lcp > 0 ? (d.lcp - a.lcp) / a.lcp : 0
    const caiu = piora > LIMITES.pioraLcp
    itens.push({ nome: 'LCP (ms)', antes: Math.round(a.lcp), depois: Math.round(d.lcp), variacao: Math.round(piora * 1000) / 10, caiu })
    if (caiu) quedas.push(`LCP piorou ${Math.round(piora * 100)}% (${Math.round(a.lcp)} → ${Math.round(d.lcp)} ms)`)
  }
  if (d.cls != null) {
    const caiu = d.cls > LIMITES.cls
    itens.push({ nome: 'CLS', antes: a.cls == null ? null : Math.round(a.cls * 1000) / 1000, depois: Math.round(d.cls * 1000) / 1000, caiu })
    if (caiu) quedas.push(`CLS ${d.cls.toFixed(3)} passou de ${LIMITES.cls}`)
  }
  if (!itens.length) return { estado: 'não comparado', motivo: 'Lighthouse não comparado (os relatórios não têm categorias nem LCP/CLS)', itens, faltas }
  if (quedas.length) return { estado: 'reprovou', motivo: [...quedas, ...faltas].join('; '), itens, faltas }
  return faltas.length
    ? { estado: 'incompleto', motivo: `comparação incompleta: ${faltas.join('; ')}`, itens, faltas }
    : { estado: 'passou', motivo: 'nenhuma categoria caiu mais de 3 pontos, LCP sem piora acima de 15% e CLS até 0,1', itens }
}

// ---------------------------------------------------------------------------------------------------------
// Prints
// ---------------------------------------------------------------------------------------------------------
export function paresDePrints(pastaA, pastaB) {
  const lista = (p) => fs.readdirSync(p).filter((n) => IMAGEM.test(n) && fs.statSync(path.join(p, n)).isFile())
  const a = new Set(lista(pastaA)), b = new Set(lista(pastaB))
  return {
    pares: [...b].filter((n) => a.has(n)).sort(),
    soAntes: [...a].filter((n) => !b.has(n)).sort(),
    soDepois: [...b].filter((n) => !a.has(n)).sort(),
  }
}

// Roda dentro do navegador: desenha as duas imagens num canvas do tamanho da maior, conta os pixels em que algum canal
// mudou mais que a tolerância (a área que só existe numa delas conta como mudada) e devolve a imagem da diferença:
// a rodada nova clara e apagada, com o que mudou em vermelho.
export const DIFERENCA = `async (urlA, urlB, tolerancia) => {
  const abrir = (u) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error('imagem não abriu')); i.src = u })
  const [ia, ib] = await Promise.all([abrir(urlA), abrir(urlB)])
  const w = Math.max(ia.naturalWidth, ib.naturalWidth), h = Math.max(ia.naturalHeight, ib.naturalHeight)
  const ler = (img) => { const c = new OffscreenCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data }
  const da = ler(ia), db = ler(ib)
  const saida = new OffscreenCanvas(w, h), sx = saida.getContext('2d'), img = sx.createImageData(w, h), o = img.data
  let mudados = 0
  for (let p = 0; p < da.length; p += 4) {
    const fora = da[p + 3] === 0 || db[p + 3] === 0 ? (da[p + 3] !== db[p + 3]) : false
    const muda = fora || Math.abs(da[p] - db[p]) > tolerancia || Math.abs(da[p + 1] - db[p + 1]) > tolerancia || Math.abs(da[p + 2] - db[p + 2]) > tolerancia
    if (muda) { mudados++; o[p] = 230; o[p + 1] = 30; o[p + 2] = 40; o[p + 3] = 255 }
    else { const cinza = (db[p] * 0.3 + db[p + 1] * 0.59 + db[p + 2] * 0.11) * 0.35 + 165; o[p] = o[p + 1] = o[p + 2] = cinza; o[p + 3] = 255 }
  }
  sx.putImageData(img, 0, 0)
  const blob = await saida.convertToBlob({ type: 'image/png' })
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return { largura: w, altura: h, tamanhoA: [ia.naturalWidth, ia.naturalHeight], tamanhoB: [ib.naturalWidth, ib.naturalHeight],
    porcentagem: Math.round((mudados / (w * h)) * 10000) / 100, png: btoa(bin) }
}`

// ---------------------------------------------------------------------------------------------------------
// Navegador (protocolo DevTools), no padrão de celular.mjs
// ---------------------------------------------------------------------------------------------------------
export function acharNavegador() {
  if (process.env.BROWSER_EXECUTABLE) return fs.existsSync(process.env.BROWSER_EXECUTABLE) ? process.env.BROWSER_EXECUTABLE : null
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((p) => fs.existsSync(p)) || null
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

async function abrirUmaVez(executavel) {
  // Porta 0 + pasta de perfil própria: o Chrome escolhe uma porta livre, então não briga com outro Chrome aberto.
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'rodadas-'))
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank']
  if (process.platform === 'linux' && process.env.CI) args.unshift('--no-sandbox')
  const proc = spawn(executavel, args, { stdio: 'ignore' })
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
  const fechar = async () => {
    try { proc.kill() } catch {}
    for (let i = 0; i < 10; i++) { try { fs.rmSync(perfil, { recursive: true, force: true }); break } catch { await espera(300) } }
  }
  if (!alvo) { await fechar(); throw new Error('Não consegui abrir o Chrome/Edge sem janela.') }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
  let id = 0
  const pendentes = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id) }
  })
  const cmd = (method, params = {}, limite = 120_000) => new Promise((resolve, reject) => {
    const n = ++id
    const t = setTimeout(() => { pendentes.delete(n); reject(new Error(`${method} demorou demais`)) }, limite)
    pendentes.set(n, (msg) => { clearTimeout(t); msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result) })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  return { cmd, fechar: async () => { try { ws.close() } catch {} await fechar() } }
}

// Se o Chrome não subir (outro processo ocupando), tenta de novo uma vez.
export async function abrirNavegador(executavel) {
  try { return await abrirUmaVez(executavel) } catch { await espera(1000); return abrirUmaVez(executavel) }
}

const dataUrl = (arquivo) => `data:${TIPO[path.extname(arquivo).toLowerCase()]};base64,${fs.readFileSync(arquivo).toString('base64')}`

export async function diferencaDeImagens(nav, arquivoA, arquivoB, tolerancia = LIMITES.tolerancia) {
  const { result, exceptionDetails } = await nav.cmd('Runtime.evaluate', {
    expression: `(${DIFERENCA})(${JSON.stringify(dataUrl(arquivoA))}, ${JSON.stringify(dataUrl(arquivoB))}, ${Number(tolerancia)})`,
    awaitPromise: true, returnByValue: true,
  })
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text)
  return result.value
}

// ---------------------------------------------------------------------------------------------------------
// Relatório e linha de comando
// ---------------------------------------------------------------------------------------------------------
export function lerArgs(argv) {
  const a = [...argv]
  const opt = (nome) => { const i = a.indexOf(nome); if (i < 0) return undefined; const v = a[i + 1]; a.splice(i, 2); return v }
  const lhAntes = opt('--lighthouse-antes'), lhDepois = opt('--lighthouse-depois')
  const json = a.includes('--json')
  const pos = a.filter((x) => x !== '--json')
  return { antes: pos[0], depois: pos[1], saida: pos[2] || 'rodadas', lhAntes, lhDepois, json }
}

export function resumoTexto(rel) {
  const l = [`Comparação de rodadas: ${rel.antes} → ${rel.depois}`, '', 'Prints (porcentagem de pixels mudados; informação, não reprova):']
  if (!rel.prints.length) l.push('  nenhum print com o mesmo nome nas duas pastas')
  for (const p of rel.prints) {
    l.push(p.erro ? `  ${p.nome}: não comparado (${p.erro})` : `  ${p.nome}: ${String(p.porcentagem).replace('.', ',')}% mudado${p.tamanhoMudou ? ' (tamanho mudou)' : ''}`)
  }
  if (rel.soAntes.length) l.push(`  só na rodada anterior: ${rel.soAntes.join(', ')}`)
  if (rel.soDepois.length) l.push(`  só na rodada nova: ${rel.soDepois.join(', ')}`)
  l.push('', rel.lighthouse.estado === 'não comparado' ? rel.lighthouse.motivo : `Lighthouse: ${rel.lighthouse.estado} — ${rel.lighthouse.motivo}`)
  for (const i of rel.lighthouse.itens) l.push(`  ${i.caiu ? '✗' : '✓'} ${i.nome}: ${i.antes ?? '?'} → ${i.depois}`)
  if (rel.incompleta) l.push('', 'COMPARAÇÃO INCOMPLETA: parte do que foi pedido não foi comparada (ver acima). Não conta como "sem queda".')
  return l.join('\n') + '\n'
}

function lerJson(arquivo) {
  try { return JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, '')) } catch (e) { throw new Error(`não consegui ler ${arquivo}: ${e.message}`) }
}

export async function executar(argv) {
  const op = lerArgs(argv)
  if (!op.antes || !op.depois) {
    console.log('Uso: node rodadas.mjs <pasta-rodada-anterior> <pasta-rodada-nova> [pasta-saida] [--lighthouse-antes a.json --lighthouse-depois b.json] [--json]')
    return 2
  }
  for (const p of [op.antes, op.depois]) {
    if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) { console.error(`Pasta não encontrada: ${p}`); return 2 }
  }
  let lighthouse
  try {
    lighthouse = compararLighthouse(op.lhAntes ? lerJson(op.lhAntes) : null, op.lhDepois ? lerJson(op.lhDepois) : null)
  } catch (e) { console.error(e.message); return 2 }

  const { pares, soAntes, soDepois } = paresDePrints(op.antes, op.depois)
  fs.mkdirSync(op.saida, { recursive: true })
  const prints = []
  if (pares.length) {
    const exe = acharNavegador()
    let nav
    try {
      if (!exe) throw new Error('Chrome/Edge não encontrado: instale um deles ou defina BROWSER_EXECUTABLE')
      nav = await abrirNavegador(exe)
    } catch (e) { for (const nome of pares) prints.push({ nome, erro: e.message }) }
    if (nav) {
      try {
        for (const nome of pares) {
          try {
            const r = await diferencaDeImagens(nav, path.join(op.antes, nome), path.join(op.depois, nome))
            const arquivo = `${nome.replace(IMAGEM, '')}-diferenca.png`
            fs.writeFileSync(path.join(op.saida, arquivo), Buffer.from(r.png, 'base64'))
            const tamanhoMudou = r.tamanhoA[0] !== r.tamanhoB[0] || r.tamanhoA[1] !== r.tamanhoB[1]
            prints.push({ nome, porcentagem: r.porcentagem, diferenca: arquivo, tamanhoAntes: r.tamanhoA, tamanhoDepois: r.tamanhoB, tamanhoMudou })
          } catch (e) { prints.push({ nome, erro: e.message }) }
        }
      } finally { await nav.fechar() }
    }
  }
  // Comparação pedida que não foi feita não pode sair como "sem queda".
  const lhPedido = Boolean(op.lhAntes || op.lhDepois)
  const incompleta = prints.some((p) => p.erro) || lighthouse.estado === 'incompleto' || (lhPedido && lighthouse.estado === 'não comparado')
  const codigo = lighthouse.estado === 'reprovou' ? 1 : incompleta ? 2 : 0
  const rel = { antes: op.antes, depois: op.depois, prints, soAntes, soDepois, lighthouse, incompleta, codigo }
  fs.writeFileSync(path.join(op.saida, 'rodadas.json'), JSON.stringify(rel, null, 2))
  const texto = resumoTexto(rel)
  fs.writeFileSync(path.join(op.saida, 'resumo.txt'), texto)
  console.log(op.json ? JSON.stringify(rel, null, 2) : texto)
  return codigo
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await executar(process.argv.slice(2)))
}
