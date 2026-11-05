// Testa as receitas novas num Edge invisível: computador, celular e movimento reduzido.
// Uso: node ferramentas/testar.mjs [url] (padrão http://localhost:5181, com o `npm run dev` rodando).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const url = process.argv[2] || 'http://localhost:5181'
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync('ferramentas/prints', { recursive: true })
const navegador = await puppeteer.launch({ executablePath: edge, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

async function rodar(modo) {
  const pagina = await navegador.newPage()
  await pagina.setViewport(modo === 'celular' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
  if (modo === 'reduzido') await pagina.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await pagina.goto(url, { waitUntil: 'networkidle0' })
  await espera(1500)
  const ir = async (y) => { await pagina.evaluate((y) => window.scrollTo(0, y), y); await espera(900) }
  const topoDe = (sel) => pagina.evaluate((s) => { const e = document.querySelector(s); const a = e.closest('.pin-spacer') || e; return a.getBoundingClientRect().top + scrollY }, sel)
  const medir = () => pagina.evaluate(() => {
    const ops = [...document.querySelectorAll('[data-palavra]')].map((e) => +getComputedStyle(e).opacity)
    const ys = [...document.querySelectorAll('[data-camada]')].map((e) => Math.round(new DOMMatrix(getComputedStyle(e).transform).f))
    return { palavrasAcesas: `${ops.filter((o) => o > 0.9).length}/${ops.length}`, camadasY: ys.join('/'),
      quadro: document.querySelector('[data-sequencia-tela]').dataset.quadro, scrollY: Math.round(scrollY) }
  })
  const r = { modo }
  r.lenis = await pagina.evaluate(() => document.documentElement.classList.contains('lenis'))
  r.shader = await pagina.evaluate(() => { const c = document.querySelector('[data-fundo-shader] canvas'); return c ? `${c.width}x${c.height}` : 'sem canvas' })
  r.preso = await pagina.evaluate(() => !!document.querySelector('[data-sequencia]').closest('.pin-spacer'))
  r.inicio = await medir()
  await pagina.screenshot({ path: `ferramentas/prints/${modo}-topo.png` })

  const texto = await topoDe('[data-texto-revelado]')
  const vh = modo === 'celular' ? 844 : 900
  r.texto = []
  for (const f of [0.95, 0.6, 0.2]) { await ir(texto - vh * f); r.texto.push((await medir()).palavrasAcesas) }
  await pagina.screenshot({ path: `ferramentas/prints/${modo}-texto.png` })

  const camadas = await topoDe('[data-camadas]')
  r.camadas = []
  for (const d of [-vh * 0.9, 0, vh * 0.9]) { await ir(camadas + d); r.camadas.push((await medir()).camadasY) }
  await ir(camadas); await pagina.screenshot({ path: `ferramentas/prints/${modo}-camadas.png` })

  const seq = await topoDe('[data-sequencia]')
  r.quadros = []
  for (const d of [0, 750, 1500]) { await ir(seq + d); r.quadros.push((await medir()).quadro) }
  await pagina.screenshot({ path: `ferramentas/prints/${modo}-sequencia.png` })

  // Rolagem pela roda do mouse (caminho do Lenis): a página tem de andar e o ScrollTrigger acompanhar.
  if (modo === 'desktop') {
    await ir(0)
    for (let i = 0; i < 10; i++) { await pagina.mouse.wheel({ deltaY: 120 }); await espera(40) }
    await espera(1500)
    r.roda = await medir()
  }
  await pagina.close()
  return r
}

for (const modo of ['desktop', 'celular', 'reduzido']) console.log(JSON.stringify(await rodar(modo)))
await navegador.close()
