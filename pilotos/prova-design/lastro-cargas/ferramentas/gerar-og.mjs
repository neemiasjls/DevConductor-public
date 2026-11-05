import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
const executablePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const browser = await puppeteer.launch({ executablePath, headless: true, userDataDir: path.resolve('revisao/perfil-og'),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
try {
  const p = await browser.newPage()
  await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await p.goto('http://localhost:5181/', { waitUntil: 'networkidle0', timeout: 60000 })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForFunction(() => document.querySelector('#carga img')?.style.opacity === '0', { timeout: 30000 })
  await new Promise(r => setTimeout(r, 1800))
  await p.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 90 })
  console.log('Open Graph local exportado em 1200×630.')
} finally { await browser.close() }
