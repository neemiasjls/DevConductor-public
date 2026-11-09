// Prints de conferência por seção (computador e celular), com rolagem real até cada ponto.
// Uso: node ferramentas/prints.mjs <url> <pasta-nova> [larguras=1440,390] [reduzido]
// Use http://localhost:5205/ (127.0.0.1 falha no preview desta máquina).
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [url = 'http://localhost:5205/', pasta, larguras = '1440,390', modo] = process.argv.slice(2)
if (!pasta || fs.existsSync(pasta)) throw Error('Informe uma pasta nova')
fs.mkdirSync(pasta, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  userDataDir: path.join(pasta, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'] })
// [nome, seletor, fração, modo]: 'percurso' = fração de (altura - tela) de uma cena presa; 'altura' = fração da altura.
const pontos = [
  ['abertura', 'body', 0, 'topo'],
  ['porta', '#porta', 0.5, 'percurso'],
  ['compromisso', '#compromisso', 0.05, 'altura'],
  ['viagem-meio', '#viagem .cena', 0.45, 'percurso'],
  ['faixas', '#faixas', 0.02, 'altura'],
  ['doca-abrindo', '#doca .cena', 0.3, 'percurso'],
  ['doca-aberta', '#doca .cena', 0.98, 'percurso'],
  ['cotar', '#cotar', 0.02, 'altura'],
  ['contato', '#contato', 0.02, 'altura'],
  ['rodape', 'footer', 0, 'altura'],
]
for (const larg of larguras.split(',').map(Number)) {
  const p = await b.newPage()
  const erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  await p.setViewport({ width: larg, height: larg < 700 ? 844 : 900, isMobile: larg < 700, hasTouch: larg < 700 })
  if (modo === 'reduzido') await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
  await p.evaluate(() => document.fonts.ready)
  await esperar(1500)
  let n = 0
  for (const [nome, sel, f, modoPonto] of pontos) {
    const alvo = await p.evaluate((sel, f, modoPonto) => {
      if (modoPonto === 'topo') return 0
      const e = document.querySelector(sel)
      if (!e) return null
      const topo = e.getBoundingClientRect().top + scrollY
      const curso = modoPonto === 'percurso' ? Math.max(0, e.offsetHeight - innerHeight) : e.offsetHeight
      return Math.round(topo + f * curso)
    }, sel, f, modoPonto)
    if (alvo === null) { erros.push('sem ' + sel); continue }
    // Rola em passos para a cena com scrub acompanhar.
    await p.evaluate(async (y) => {
      const de = scrollY, passos = 12
      for (let i = 1; i <= passos; i++) { window.scrollTo({ top: de + ((y - de) * i) / passos, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 60)) }
    }, alvo)
    await esperar(1400)
    await p.screenshot({ path: path.join(pasta, `${larg}-${String(++n).padStart(2, '0')}-${nome}.jpg`), type: 'jpeg', quality: 80 })
  }
  console.log(larg, 'erros', erros)
  await p.close()
}
await b.close()
