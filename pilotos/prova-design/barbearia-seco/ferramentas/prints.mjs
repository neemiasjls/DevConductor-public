// Prints em vários pontos da rolagem (base: lp-cenas/testar.mjs). Edge invisível + puppeteer-core.
// Uso: node ferramentas/prints.mjs <pasta-saida> [desktop|celular|reduzido|reduzido-celular] [url]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const [saida, modo = 'desktop', url = 'http://localhost:5183/'] = process.argv.slice(2)
fs.mkdirSync(saida, { recursive: true })
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const navegador = await puppeteer.launch({ executablePath: edge, headless: true })
const p = await navegador.newPage()
const erros = []
p.on('pageerror', (e) => erros.push(e.message))
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(`${m.type()}: ${m.text()}`) })
const celular = modo.includes('celular')
await p.setViewport(celular ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { width: 1440, height: 900 })
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: modo.startsWith('reduzido') ? 'reduce' : 'no-preference' }])
await p.goto(url, { waitUntil: 'networkidle0' })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
await esperar(250)
await p.screenshot({ path: path.join(saida, `${modo}-00-carga.jpg`), type: 'jpeg', quality: 80 })
await esperar(2200)
const pontos = await p.evaluate(() => {
  const topoDe = (sel) => { const el = document.querySelector(sel); const alvo = el.closest('.cena-presa') || el; return { y: alvo.getBoundingClientRect().top + scrollY, h: alvo.offsetHeight } }
  const lista = [['01-topo', 0]]
  const pres = { '#navalha': [0, 0.3, 0.5, 0.62, 0.8, 0.97], '#cortes': [0, 0.3, 0.6, 0.97], '#senta': [0, 0.4, 0.97] }
  for (const [sel, fr] of Object.entries(pres)) {
    const { y, h } = topoDe(sel)
    fr.forEach((f) => lista.push([`${sel.slice(1)}-${String(Math.round(f * 100)).padStart(3, '0')}`, Math.round(y + f * Math.max(0, h - innerHeight))]))
  }
  for (const sel of ['#trabalho', '#precos', '#contato']) {
    const { y } = topoDe(sel)
    lista.push([`${sel.slice(1)}-entrada`, Math.round(y - innerHeight * 0.35)], [`${sel.slice(1)}-topo`, Math.round(y)])
  }
  lista.push(['faixa-1', Math.round(innerHeight * 0.55)])
  lista.push(['costura', Math.round(topoDe('#cortes').y - innerHeight * 0.75)])
  lista.push(['fim', document.documentElement.scrollHeight - innerHeight])
  return lista.sort((a, b) => a[1] - b[1])
})
let i = 1
for (const [nome, y] of pontos) {
  await p.evaluate((y) => window.scrollTo(0, y), y)
  await esperar(900)
  await p.screenshot({ path: path.join(saida, `${modo}-${String(i++).padStart(2, '0')}-${nome}.jpg`), type: 'jpeg', quality: 78 })
}
const info = await p.evaluate(() => ({ largura: document.documentElement.scrollWidth, altura: document.documentElement.scrollHeight, vw: innerWidth }))
console.log(JSON.stringify({ modo, ...info, erros }, null, 0))
await navegador.close()
