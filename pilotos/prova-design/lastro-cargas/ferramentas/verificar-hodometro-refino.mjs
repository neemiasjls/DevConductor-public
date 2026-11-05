// Confere os algarismos realmente visíveis após a animação, sem enviar contato externo.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'
const saida = path.resolve(process.argv[2])
if (fs.existsSync(saida)) throw Error('Use saída nova')
fs.mkdirSync(saida, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  userDataDir: path.join(saida, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const resultados = []
try {
  for (const largura of [390, 1440]) {
    const p = await browser.newPage()
    await p.setViewport({ width: largura, height: largura === 390 ? 844 : 900 })
    await p.goto('http://127.0.0.1:5195/', { waitUntil: 'networkidle0' })
    await p.evaluate(() => document.fonts.ready)
    await p.$eval('[aria-labelledby="garantias-titulo"]', e => e.scrollIntoView({ behavior: 'instant' }))
    await new Promise(r => setTimeout(r, 1700))
    const itens = await p.$$('[aria-labelledby="garantias-titulo"] ul > li')
    const valores = []
    for (const item of itens) {
      await item.evaluate(e => e.scrollIntoView({ behavior: 'instant', block: 'center' }))
      const valor = await item.evaluate(e => {
        const visivel = [...e.querySelectorAll('[data-tira]')].map(t => {
          const r = t.parentElement.getBoundingClientRect()
          return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.textContent.trim()
        }).join('')
        return { visivel, acessivel: e.querySelector('.sr-only').textContent.trim() }
      })
      assert.equal(String(Number(valor.visivel)), valor.acessivel, 'Hodômetro não chegou ao valor legível')
      valores.push(valor)
    }
    await p.screenshot({ path: path.join(saida, `${largura}-garantias.jpg`) })
    resultados.push({ largura, valores })
    await p.close()
  }
  fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify({ aprovado: true, resultados }, null, 2))
  console.log(JSON.stringify(resultados))
} finally { await browser.close() }
