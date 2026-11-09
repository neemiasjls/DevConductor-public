// Gera public/og.jpg (1200×630) a partir da abertura real, com movimento reduzido (linha estática completa).
// Uso: node ferramentas/og.mjs [url]   (servidor de preview rodando na 5205)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const url = process.argv[2] || 'http://127.0.0.1:5205/'
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'austral-og-'))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: perfil })
try {
  const p = await browser.newPage()
  await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(url, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 86 })
  console.log('public/og.jpg')
} finally { await browser.close() }
