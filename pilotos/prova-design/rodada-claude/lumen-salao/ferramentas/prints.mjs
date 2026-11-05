// Prints de conferência ao longo da página (computador e celular), com rolagem real até cada ponto.
// Uso: node ferramentas/prints.mjs <url> <pasta-nova> [larguras=1440,390] [reduzido]
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [url = 'http://127.0.0.1:5202/', pasta, larguras = '1440,390', modo] = process.argv.slice(2)
if (!pasta || fs.existsSync(pasta)) throw Error('Informe uma pasta nova')
fs.mkdirSync(pasta, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  userDataDir: path.join(pasta, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
// pontos: [seletor, fração da altura da seção já rolada]
const pontos = [['#inicio', 0], ['#diagnostico', 0.05], ['#diagnostico', 0.55], ['#fio', 0.05], ['#fio', 0.3], ['#fio', 0.5], ['#fio', 0.68],
  ['#cronograma', 0], ['#cronograma', 0.4], ['#resultado', 0.1], ['#resultado', 0.42], ['#servicos', 0.1], ['#servicos', 0.55], ['#agendar', 0], ['#agendar', 0.6]]
for (const larg of larguras.split(',').map(Number)) {
  const p = await b.newPage()
  const erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  await p.setViewport({ width: larg, height: larg < 700 ? 844 : 900, isMobile: larg < 700, hasTouch: larg < 700 })
  if (modo === 'reduzido') await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(url, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.fonts.ready)
  await esperar(1500)
  let n = 0
  for (const [sel, f] of pontos) {
    await p.evaluate((sel, f) => {
      const e = document.querySelector(sel), topo = e.getBoundingClientRect().top + scrollY
      window.scrollTo({ top: topo + f * e.offsetHeight, behavior: 'instant' })
    }, sel, f)
    await esperar(1300)
    await p.screenshot({ path: path.join(pasta, `${larg}-${String(++n).padStart(2, '0')}-${sel.slice(1)}-${f}.jpg`), type: 'jpeg', quality: 72 })
  }
  console.log(larg, 'erros', erros)
  await p.close()
}
await b.close()
