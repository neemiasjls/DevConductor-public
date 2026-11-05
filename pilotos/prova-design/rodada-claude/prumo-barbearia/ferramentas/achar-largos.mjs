// Depuração: lista elementos que passam da largura da janela (normal ou reduzido).
// Uso: node ferramentas/achar-largos.mjs <largura> [--reduzido]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const w = Number(process.argv[2])
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const nav = await puppeteer.launch({ executablePath: edge, headless: true, userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'largos-')) })
try {
  const p = await nav.newPage()
  await p.setViewport({ width: w, height: 844 })
  if (process.argv.includes('--reduzido')) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto('http://127.0.0.1:5203/', { waitUntil: 'networkidle0' })
  console.log(await p.evaluate((w) => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > w + 1)
    .slice(0, 12).map((e) => `${e.tagName}.${String(e.className).slice(0, 90)} → ${Math.round(e.getBoundingClientRect().right)}`), w))
  console.log('scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth))
} finally { await nav.close() }
