// Prints de conferência por seção (computador e celular), com rolagem real até cada ponto.
// Uso: node ferramentas/prints.mjs <url> <pasta-nova> [larguras=1440,390] [reduzido]
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [url = 'http://localhost:5206/', pasta, larguras = '1440,390', modo] = process.argv.slice(2)
if (!pasta || fs.existsSync(pasta)) throw Error('Informe uma pasta nova')
fs.mkdirSync(pasta, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  userDataDir: path.join(pasta, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'] })
// [nome, seletor, fração do percurso já rolada (0 a 1 de altura - tela)]
const pontos = [
  ['abertura', 'body', 0, 'topo'],
  // #cadeira é o palco sticky (altura de uma tela); o percurso que rola é o invólucro .percurso-cadeira.
  ['cadeira-encosto', '.percurso-cadeira', 0.3, 'percurso'],
  ['cadeira-toalha', '.percurso-cadeira', 0.56, 'percurso'],
  ['manifesto', 'section[aria-labelledby="manifesto-titulo"]', 0.12, 'altura'],
  ['degrade-comeco', '.percurso-degrade', 0.06, 'percurso'],
  ['degrade-meio', '.percurso-degrade', 0.42, 'percurso'],
  ['degrade-fim', '.percurso-degrade', 0.97, 'percurso'],
  ['servicos', '#servicos', 0.02, 'altura'],
  ['horarios', '#horarios', 0.02, 'altura'],
  ['agendar', '#agendar', 0.02, 'altura'],
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
  await p.mouse.wheel({ deltaY: 1 })
  await p.waitForSelector('#cadeira[data-pronta]', { timeout: 40000 }).catch(() => erros.push('3D nao ficou pronto'))
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
