// Mede callbacks RAF, tarefas longas, peso e deslocamentos durante rolagem programática.
// Uso (da pasta de um projeto com puppeteer-core): node medir-rolagem.mjs <url> <saida.json> [--celular] [--cpu 4] [--segundos 14]
// Celular: 390×844 com toque e CPU 4× mais lenta. Não representa um modelo físico específico.
// SwiftShader usa WebGL por software; RAF não mede quadros apresentados nem a taxa da tela.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const valor = (n, padrao) => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : padrao }
const [url, saida] = args.filter((a, i) => !a.startsWith('--') && !['--cpu', '--segundos'].includes(args[i - 1]))
if (!url || !saida) { console.log('Uso: node medir-rolagem.mjs <url> <saida.json> [--celular] [--cpu 4] [--segundos 14]'); process.exit(1) }
const celular = args.includes('--celular')
const cpu = valor('--cpu', celular ? 4 : 1)
const segundos = valor('--segundos', 14)

const exigir = createRequire(path.join(process.cwd(), 'package.json'))
const puppeteer = (await import(pathToFileURL(exigir.resolve('puppeteer-core')).href)).default
const executablePath = process.env.BROWSER_EXECUTABLE || ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(fs.existsSync)
const navegador = await puppeteer.launch({ executablePath, headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const p = await navegador.newPage()
  await p.setViewport(celular ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
  const cdp = await p.createCDPSession()
  await cdp.send('Network.enable')
  let bytes = 0, js = 0
  cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength })
  const tipos = new Map()
  cdp.on('Network.responseReceived', e => tipos.set(e.requestId, e.type))
  cdp.on('Network.loadingFinished', e => { if (tipos.get(e.requestId) === 'Script') js += e.encodedDataLength })
  await p.evaluateOnNewDocument(() => {
    window.__cls = 0; window.__lcp = 0; window.__shifts = []; window.__tarefas = []
    try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ tempo: e.startTime, valor: e.value }) } })).observe({ type: 'layout-shift', buffered: true }) } catch {}
    try { new PerformanceObserver(l => l.getEntries().forEach(e => { window.__lcp = e.startTime })).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
    try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__tarefas.push({ inicio: e.startTime, duracao: e.duration }))).observe({ type: 'longtask', buffered: true }) } catch {}
  })
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  try { await p.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }) } catch (e) { if (!/timeout/i.test(e.message)) throw e }
  await new Promise(r => setTimeout(r, 1500))
  const lcp = await p.evaluate(() => window.__lcp)
  // Rola do topo ao fim em velocidade constante, contando intervalos de callbacks RAF.
  const quadros = await p.evaluate(async (ms) => {
    const total = document.documentElement.scrollHeight - innerHeight
    const tempos = []
    const inicio = performance.now()
    let anterior = inicio
    await new Promise(fim => {
      const passo = (agora) => {
        tempos.push(agora - anterior); anterior = agora
        const t = Math.min(1, (agora - inicio) / ms)
        window.scrollTo(0, total * t)
        if (t < 1) requestAnimationFrame(passo); else fim()
      }
      requestAnimationFrame(passo)
    })
    return { tempos: tempos.slice(1), altura: total }
  }, segundos * 1000)
  await new Promise(r => setTimeout(r, 800))
  const cls = await p.evaluate(() => window.__cls)
  const deslocamentos = await p.evaluate(() => {
    let inicio = -Infinity, anterior = -Infinity, soma = 0, maximo = 0
    for (const e of window.__shifts) {
      if (e.tempo - anterior > 1000 || e.tempo - inicio > 5000) { inicio = e.tempo; soma = 0 }
      soma += e.valor; anterior = e.tempo; maximo = Math.max(maximo, soma)
    }
    return { clsJanela: maximo, tarefasLongas: window.__tarefas }
  })
  const t = quadros.tempos.slice().sort((a, b) => a - b)
  const media = quadros.tempos.reduce((s, x) => s + x, 0) / Math.max(1, quadros.tempos.length)
  const r = {
    url, modo: celular ? 'celular' : 'computador', cpu, segundos,
    fpsMedio: +(1000 / media).toFixed(1),
    quadroP95ms: +(t[Math.floor(t.length * 0.95)] || 0).toFixed(1),
    lentos33: +(100 * t.filter(x => x > 33.4).length / Math.max(1, t.length)).toFixed(1),
    travadas100: t.filter(x => x > 100).length,
    alturaPx: quadros.altura, lcpMs: Math.round(lcp), cls: +cls.toFixed(3),
    // cls permanece a soma histórica para compatibilidade; clsJanela usa janelas 1s/5s.
    clsJanela: +deslocamentos.clsJanela.toFixed(3), tarefasLongas: deslocamentos.tarefasLongas,
    metodologia: 'RAF headless; cls é soma de eventos, clsJanela usa janelas. Rolagem programática; não são dados de campo.',
    baixadoKB: Math.round(bytes / 1024), jsKB: Math.round(js / 1024),
  }
  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true })
  fs.writeFileSync(saida, JSON.stringify(r, null, 2))
  console.log(JSON.stringify(r))
} finally { await navegador.close() }
