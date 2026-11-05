import fs from 'node:fs'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'
const saida = process.argv[2]
if (!saida || fs.existsSync(saida)) throw Error('Saída nova obrigatória')
fs.mkdirSync(saida, { recursive: true })
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: `${saida}/.perfil` })
const r = { ciclos: [], aprovado: false }
try {
  const p = await b.newPage()
  await p.setViewport({ width: 1440, height: 900 })
  await p.goto('http://127.0.0.1:5194/', { waitUntil: 'networkidle0' })
  await p.$eval('[data-botao-ima]', e => e.parentElement.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await new Promise(f => setTimeout(f, 1800))
  r.mouse = await p.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)
  assert(r.mouse, 'Ambiente não simula mouse')
  for (let i = 0; i < 5; i++) {
    const caixa = await p.$eval('[data-botao-ima]', e => { const r = e.parentElement.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    await p.mouse.move(caixa.x + caixa.w * .8, caixa.y + caixa.h * .5, { steps: 4 })
    await new Promise(f => setTimeout(f, 650))
    const x = await p.$eval('[data-botao-ima]', e => new DOMMatrix(getComputedStyle(e).transform).m41)
    assert(x > 5, `Ímã parou no ciclo${i + 1}: x=${x}`)
    await p.mouse.move(5, 5)
    await new Promise(f => setTimeout(f, 1100))
    const volta = await p.$eval('[data-botao-ima]', e => new DOMMatrix(getComputedStyle(e).transform).m41)
    assert(Math.abs(volta) < .5, 'Botão não retornou')
    r.ciclos.push({ x, volta })
  }
  r.reentradas = []
  for (let i = 0; i < 2; i++) {
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await new Promise(f => setTimeout(f, 700))
    await p.$eval('[data-botao-ima]', e => e.parentElement.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await new Promise(f => setTimeout(f, 50))
    const inicio = await p.$eval('[data-botao-ima]', e => new DOMMatrix(getComputedStyle(e).transform).a)
    await new Promise(f => setTimeout(f, 800))
    const fim = await p.$eval('[data-botao-ima]', e => new DOMMatrix(getComputedStyle(e).transform).a)
    assert(inicio < .9995 && Math.abs(fim - 1) < .001, 'Entrada não reiniciou ao retornar')
    r.reentradas.push({ inicio, fim })
  }
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await new Promise(f => setTimeout(f, 500))
  assert.equal(await p.$eval('[data-botao-ima]', e => new DOMMatrix(getComputedStyle(e).transform).m41), 0)
  r.aprovado = true
} catch(e) { r.erro = e.message; process.exitCode = 1 }
finally { await b.close(); fs.writeFileSync(`${saida}/resultado.json`, JSON.stringify(r, null, 2)); console.log(JSON.stringify(r)) }
