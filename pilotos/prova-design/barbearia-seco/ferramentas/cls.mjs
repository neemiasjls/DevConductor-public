// Mede CLS (laboratório) e mostra quais elementos se deslocam: carga parada e depois rolagem em passos.
import puppeteer from 'puppeteer-core'
const [modo = 'desktop', url = 'http://localhost:5183/'] = process.argv.slice(2)
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const p = await nav.newPage()
await p.setViewport(modo === 'celular' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
await p.evaluateOnNewDocument(() => {
  window.__ls = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => {
    if (e.hadRecentInput) return
    const src = e.sources.map((s) => { const n = s.node; if (!n) return '?'; const el = n.nodeType === 1 ? n : n.parentElement; return (el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).slice(0, 40) + (n.nodeType === 3 ? '[texto]' : '')) })
    window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), y: Math.round(scrollY), src })
  })).observe({ type: 'layout-shift', buffered: true })
})
await p.goto(url, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 3000))
const carga = await p.evaluate(() => window.__ls.splice(0))
const altura = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
if (process.argv[4] === 'roda') {
  // Rolagem como gente: roda do mouse em passos de 100 px (passa pelo Lenis).
  await p.mouse.move(700, 450)
  for (let y = 0; y < altura + 400; y += 100) { await p.mouse.wheel({ deltaY: 100 }); await new Promise((r) => setTimeout(r, 30)) }
  await new Promise((r) => setTimeout(r, 1200))
} else {
  for (let f = 0; f <= 1.0001; f += 0.05) {
    await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(altura * f))
    await new Promise((r) => setTimeout(r, 250))
  }
}
console.log('fim em y =', await p.evaluate(() => Math.round(scrollY)), 'de', altura)
const rolagem = await p.evaluate(() => window.__ls)
const soma = (l) => l.reduce((s, e) => s + e.v, 0).toFixed(4)
console.log('carga', soma(carga), JSON.stringify(carga.slice(0, 6)))
console.log('rolagem', soma(rolagem), 'entradas', rolagem.length)
console.log(JSON.stringify(rolagem.filter((e) => e.src.some((s) => s.includes('navalha'))).slice(0, 8)))
const porFonte = {}
for (const e of rolagem) for (const s of e.src) porFonte[s] = (porFonte[s] || 0) + e.v
console.log(JSON.stringify(Object.entries(porFonte).sort((a, b) => b[1] - a[1]).slice(0, 12), null, 0))
await nav.close()
