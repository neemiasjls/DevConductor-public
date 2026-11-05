// Gera public/og.jpg (1200×630) a partir da abertura já montada.
import puppeteer from 'puppeteer-core'
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const p = await nav.newPage()
await p.setViewport({ width: 1200, height: 630 })
await p.goto(process.argv[2] || 'http://localhost:5183/', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 2400))
await p.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1200, height: 630 } })
await nav.close()
