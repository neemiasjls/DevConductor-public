// Open Graph 1200×630: captura da abertura com a cena 3D pronta (adaptado de lastro-cargas/ferramentas/gerar-og.mjs).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
const executablePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const browser = await puppeteer.launch({ executablePath, headless: true, userDataDir: path.resolve('revisao/perfil-og'),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
})
try {
  const p = await browser.newPage()
  await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await p.goto(process.argv[2] || 'http://127.0.0.1:5206/', { waitUntil: 'networkidle0', timeout: 60000 })
  await p.evaluate(() => document.fonts.ready)
  await p.mouse.wheel({ deltaY: 1 })
  await p.waitForSelector('#cadeira[data-pronta]', { timeout: 30000 })
  // Pausa o giro para o quadro sair parado e nítido.
  await p.click('[data-pausa]')
  await new Promise((r) => setTimeout(r, 1800))
  await p.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 88 })
  console.log('public/og.jpg 1200×630')
} finally { await browser.close() }
