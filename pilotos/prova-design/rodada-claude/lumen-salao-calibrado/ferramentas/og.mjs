// Imagem Open Graph 1200×630: print da abertura com o movimento reduzido (reflexo estático, sem botão).
// Uso: node ferramentas/og.mjs [url]  →  public/og.jpg
import puppeteer from 'puppeteer-core'
const url = process.argv[2] || 'http://127.0.0.1:5202/'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage()
await p.setViewport({ width: 1200, height: 630 })
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p.goto(url, { waitUntil: 'networkidle0' })
await p.evaluate(() => document.fonts.ready)
await new Promise((r) => setTimeout(r, 500))
await p.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 82 })
await b.close()
console.log('public/og.jpg')
