// Prints de inspeção ao longo da rolagem (computador e celular). Uso:
// node ferramentas/prints.mjs <pasta-nova> [url] [larguras=1440,390] [reduzido]
// Rola de verdade (roda do mouse) para as cenas presas e o Lenis andarem como na página real.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const [saida, url = 'http://127.0.0.1:5201/', larguras = '1440,390', modo] = process.argv.slice(2)
if (!saida) { console.error('Uso: node ferramentas/prints.mjs <pasta-nova> [url] [larguras] [reduzido]'); process.exit(1) }
const destino = path.resolve(saida)
if (fs.existsSync(destino)) { console.error('Use uma pasta nova'); process.exit(1) }
fs.mkdirSync(destino, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  userDataDir: path.join(destino, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
try {
  for (const largura of larguras.split(',').map(Number)) {
    const p = await browser.newPage()
    const erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()) })
    await p.setViewport({ width: largura, height: largura < 700 ? 844 : 900, isMobile: largura < 700, hasTouch: largura < 700 })
    if (modo === 'reduzido') await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await p.goto(url, { waitUntil: 'networkidle0' })
    await p.evaluate(() => document.fonts.ready)
    await esperar(2200)
    const altura = await p.evaluate(() => document.documentElement.scrollHeight)
    const vh = largura < 700 ? 844 : 900
    let n = 0
    for (let y = 0; y < altura; y += Math.round(vh * 0.5)) {
      await p.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y)
      await esperar(450)
      await p.screenshot({ path: path.join(destino, `${largura}-${String(n++).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 })
    }
    console.log(largura, 'altura', altura, 'telas', (altura / vh).toFixed(1), 'prints', n, 'erros', JSON.stringify(erros))
    await p.close()
  }
} finally { await browser.close() }
