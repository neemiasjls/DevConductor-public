// Print da página inteira (útil no movimento reduzido, sem cenas presas).
import puppeteer from 'puppeteer-core'
const [saida, modo = 'desktop', movimento = 'reduce'] = process.argv.slice(2)
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const p = await nav.newPage()
await p.setViewport(modo === 'celular' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: movimento }])
await p.goto('http://localhost:5183/', { waitUntil: 'networkidle0' })
// carrega as fotos preguiçosas
const h = await p.evaluate(() => document.documentElement.scrollHeight)
for (let y = 0; y < h; y += 700) { await p.evaluate((y) => scrollTo(0, y), y); await new Promise((r) => setTimeout(r, 120)) }
await p.evaluate(() => scrollTo(0, 0)); await new Promise((r) => setTimeout(r, 600))
await p.screenshot({ path: saida, type: 'jpeg', quality: 70, fullPage: true })
await nav.close()
