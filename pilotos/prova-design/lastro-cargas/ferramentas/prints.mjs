// Prints da página em pontos da rolagem (Edge invisível + SwiftShader para o WebGL).
// Uso: node ferramentas/prints.mjs <desktop|celular> <url> <pasta> [reduzido] [filtro]
// Os pontos das cenas presas são frações do pin (medidas no .pin-spacer de cada seção).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const [modo = 'desktop', url = 'http://localhost:5181/', pasta = 'ferramentas/prints/teste', reduzidoArg, filtro] = process.argv.slice(2)
const reduzido = reduzidoArg === 'reduzido'
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
fs.mkdirSync(pasta, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

const navegador = await puppeteer.launch({
  executablePath: edge, headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const pagina = await navegador.newPage()
const erros = []
pagina.on('pageerror', (e) => erros.push('pageerror ' + e.message))
pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(m.type() + ' ' + m.text()) })
pagina.on('requestfailed', (r) => erros.push('falhou ' + r.url()))
pagina.on('response', (r) => { if (r.status() >= 400) erros.push(r.status() + ' ' + r.url()) })
await pagina.setViewport(modo === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
await pagina.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduzido ? 'reduce' : 'no-preference' }])
await pagina.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
await pagina.evaluate(() => document.fonts.ready)
await esperar(2500)

// Pontos: [nome, seletor da seção, frações do pin] ou [nome, seletor, 'el', deslocamentos em telas].
const pontos = reduzido
  ? [['pagina', 'body', 'pagina', [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]]]
  : [
    ['cena', '#carga', 'pin', [0, 0.06, 0.12, 0.19, 0.27, 0.34, 0.42, 0.5, 0.58, 0.66, 0.74, 0.86, 0.95]],
    ['manifesto', '[aria-labelledby="manifesto-titulo"]', 'el', [0, 0.5, 1, 1.6]],
    ['rotas', '#rotas', 'pin', [0, 0.25, 0.5, 0.75, 1]],
    ['estrada', '[aria-labelledby="estrada-titulo"]', 'pin', [0, 0.35, 0.7, 1]],
    ['servicos', '#servicos', 'pin', [0, 0.33, 0.66, 1]],
    ['garantias', '[aria-labelledby="garantias-titulo"]', 'el', [-0.2, 0.4]],
    ['contato', '#contato', 'el', [0]],
    ['rodape', 'footer', 'el', [0, 10]],
  ]

const medidas = []
for (const [nome, seletor, tipo, fracoes] of pontos) {
  if (filtro && !nome.startsWith(filtro)) continue
  for (const [i, f] of fracoes.entries()) {
    const y = await pagina.evaluate((seletor, tipo, f) => {
      document.documentElement.style.scrollBehavior = 'auto'
      const el = document.querySelector(seletor)
      if (tipo === 'pagina') return (document.documentElement.scrollHeight - innerHeight) * f
      const caixa = el.closest('.pin-spacer') || el
      const topo = caixa.getBoundingClientRect().top + scrollY
      if (tipo === 'pin') return topo + (caixa.offsetHeight - el.offsetHeight) * f
      return topo + f * innerHeight
    }, seletor, tipo, f)
    await pagina.evaluate((y) => window.scrollTo(0, y), y)
    await esperar(nome === 'cena' ? 2600 : 1600)
    medidas.push(await pagina.evaluate((nome, f) => ({
      nome, f, y: Math.round(scrollY), largura: document.documentElement.scrollWidth,
    }), nome, f))
    await pagina.screenshot({ path: path.join(pasta, `${modo}${reduzido ? '-reduzido' : ''}-${nome}-${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 80 })
  }
}
console.log(JSON.stringify({ modo, reduzido, erros: [...new Set(erros)].slice(0, 30), lateral: medidas.filter((m) => m.largura > (modo === 'desktop' ? 1440 : 390)) }, null, 1))
await navegador.close()
