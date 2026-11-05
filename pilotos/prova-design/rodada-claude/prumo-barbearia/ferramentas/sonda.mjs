// Sonda de depuração: rola até posições e imprime o resultado de uma expressão JS na página.
// Uso: node ferramentas/sonda.mjs <largura>x<altura> "<expr>" t1 t2 ...
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
const [tela, expr, ...pos] = process.argv.slice(2)
const [w, h] = tela.split('x').map(Number)
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const nav = await puppeteer.launch({ executablePath: edge, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sonda-')) })
try {
  const p = await nav.newPage()
  await p.setViewport({ width: w, height: h, isMobile: w < 768, hasTouch: w < 768 })
  await p.goto('http://127.0.0.1:5203/', { waitUntil: 'networkidle0' })
  for (const t of pos) {
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(Number(t.slice(1)) * h))
    await new Promise((r) => setTimeout(r, 1200))
    console.log(t, JSON.stringify(await p.evaluate(expr)))
  }
} finally { await nav.close() }
