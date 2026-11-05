// Rola um site local num Edge invisível, mede a cena em vários pontos e salva prints.
// Uso: node testar.mjs desktop|celular [url] (padrão http://localhost:5173). Ajustar os seletores data-* ao site.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const modo = process.argv[2] || 'desktop'
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const navegador = await puppeteer.launch({ executablePath: edge, headless: true })
const pagina = await navegador.newPage()
await pagina.setViewport(modo === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
await pagina.goto(process.argv[3] || 'http://localhost:5173', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 800))

const inicio = await pagina.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto'
  const alvo = document.querySelector('[data-cena-rotas]').closest('.pin-spacer') || document.querySelector('[data-cena-rotas]')
  return alvo.getBoundingClientRect().top + scrollY
})
const passos = modo === 'desktop' ? [-300, 0, 500, 950, 1400, 1800, 2300] : [-400, 0, 300, 600, 900, 1200]
const resultado = []
for (const [i, d] of passos.entries()) {
  await pagina.evaluate((y) => window.scrollTo(0, y), inicio + d)
  await new Promise((r) => setTimeout(r, 700))
  resultado.push(await pagina.evaluate((d) => {
    const op = (s) => [...document.querySelectorAll(s)].map((e) => (+getComputedStyle(e).opacity).toFixed(2)).join('/')
    const tx = (s) => { const e = document.querySelector(s); return e ? new DOMMatrix(getComputedStyle(e).transform) : null }
    const sec = document.querySelector('[data-cena-rotas]').getBoundingClientRect().top
    return { rolagem: d, topoSecao: Math.round(sec), caminhaoX: Math.round(tx('[data-caminhaozinho]')?.e ?? 0),
      percorrido: (tx('[data-percorrido]')?.a ?? 0).toFixed(2), ovoY: Math.round(tx('[data-ovo-viajante]')?.f ?? 0),
      paradas: op('[data-parada]'), retorno: op('[data-retorno]') }
  }, d))
  await pagina.screenshot({ path: `ferramentas/print-${modo}-${i}.png` })
}
// Também o topo: o caminhão grande precisa ter andado depois de rolar um pouco.
await pagina.evaluate(() => window.scrollTo(0, 450))
await new Promise((r) => setTimeout(r, 700))
const topo = await pagina.evaluate(() => Math.round(new DOMMatrix(getComputedStyle(document.querySelector('[data-caminhao-topo]')).transform).e))
console.log(JSON.stringify({ modo, caminhaoTopoX_aos450px: topo, resultado }, null, 1))
await navegador.close()
