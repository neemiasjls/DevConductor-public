// Quadros da abertura no carregamento (sem rolar): confere que o título é legível desde o início.
import puppeteer from 'puppeteer-core'
const [saida = 'revisao/carga', modo = 'desktop'] = process.argv.slice(2)
import fs from 'node:fs'
fs.mkdirSync(saida, { recursive: true })
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const p = await nav.newPage()
await p.setViewport(modo === 'celular' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
await p.goto('http://localhost:5183/', { waitUntil: 'domcontentloaded' })
const t0 = Date.now()
for (const ms of [150, 500, 900, 1400, 2200]) {
  await new Promise((r) => setTimeout(r, Math.max(0, ms - (Date.now() - t0))))
  const peso = await p.evaluate(() => getComputedStyle(document.querySelector('[data-seco]')).getPropertyValue('--wght'))
  await p.screenshot({ path: `${saida}/${modo}-${String(ms).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 70 })
  console.log(ms, 'peso', peso)
}
await nav.close()
