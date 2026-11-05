// Mede o boot da cena 3D, que fica fora da janela do Lighthouse (começa no 1º gesto ou ~3 s após o load).
// Celular emulado (412×823, DPR 1,75), CPU 4× mais lenta; dispara um toque e soma as tarefas longas
// até a cena ficar pronta. Uso: node ferramentas/medir-boot-3d.mjs [url]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const url = process.argv[2] || 'http://127.0.0.1:5191/'
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const navegador = await puppeteer.launch({ executablePath: edge, headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
try {
  const p = await navegador.newPage()
  await p.setViewport({ width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    window.__longas = []
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__longas.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true })
  })
  await p.goto(url, { waitUntil: 'networkidle0' })
  const cdp = await p.createCDPSession()
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const t0 = await p.evaluate(() => performance.now())
  await p.touchscreen.tap(200, 300)
  await p.waitForSelector('#carga[data-pronta]', { timeout: 120000 })
  const r = await p.evaluate((t0) => {
    const l = window.__longas.filter(([s]) => s >= t0)
    return { prontoMs: Math.round(performance.now() - t0), tarefas: l.length,
      maiorMs: Math.round(Math.max(0, ...l.map((x) => x[1]))),
      bloqueioMs: Math.round(l.reduce((s, [, d]) => s + Math.max(0, d - 50), 0)) }
  }, t0)
  console.log(JSON.stringify(r))
} finally { await navegador.close() }
