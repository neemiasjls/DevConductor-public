// Gera public/og.jpg (1200×630) a partir da abertura, já com a palavra no lugar.
// Uso: node ferramentas/og.mjs [url]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const nav = await puppeteer.launch({ executablePath: edge, headless: true })
const p = await nav.newPage()
await p.setViewport({ width: 1200, height: 630 })
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]) // quadro parado, sem pegar a troca de palavra no meio
await p.goto(process.argv[2] || 'http://localhost:5182/', { waitUntil: 'networkidle0' })
await p.evaluate(() => document.fonts.ready)
await new Promise((r) => setTimeout(r, 1500))
await p.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 82 })
await nav.close()
console.log('public/og.jpg', fs.statSync('public/og.jpg').size, 'bytes')
