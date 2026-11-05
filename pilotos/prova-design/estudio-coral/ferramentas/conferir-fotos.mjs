import fs from 'node:fs'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'
const saida = 'revisao/fotos-comportamento-30-10'
if (fs.existsSync(saida)) throw Error('Preservar evidência existente')
fs.mkdirSync(saida, { recursive: true })
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: `${saida}/.perfil` })
const casos = []
try {
  for (const width of [390, 1440]) {
    const p = await b.newPage(), erros = []
    p.on('pageerror', e => erros.push(e.message))
    await p.setViewport({ width, height: width === 390 ? 844 : 900, isMobile: width === 390, hasTouch: width === 390 })
    await p.goto('http://127.0.0.1:5194/', { waitUntil: 'networkidle0' })
    const pares = new Set()
    for (let i = 0; i < 38; i++) {
      await new Promise(r => setTimeout(r, 400))
      const par = await p.evaluate(() => {
        const w = [...document.querySelectorAll('[data-palavra]')].find(e => Number(getComputedStyle(e).opacity) > .99 && Math.abs(new DOMMatrix(getComputedStyle(e).transform).m42) < .5)
        const f = [...document.querySelectorAll('[data-foto-abertura]')].filter(e => Number(getComputedStyle(e).opacity) > .99 && getComputedStyle(e).visibility !== 'hidden')
        if (!w || f.length !== 1) return null
        return { palavra: Number(w.dataset.palavra), foto: Number(f[0].dataset.fotoAbertura), nome: w.textContent, alt: f[0].querySelector('img').alt }
      })
      if (par) { assert.equal(par.palavra, par.foto, 'Palavra e fotografia divergentes'); pares.add(par.palavra) }
      if (par?.palavra === 1) await p.screenshot({ path: `${saida}/${width}-cachos.jpg` })
    }
    assert.equal(pares.size, 4, 'Ciclo incompleto')
    await p.$eval('#perto', e => e.scrollIntoView({ behavior: 'instant' }))
    await new Promise(r => setTimeout(r, 1200))
    assert.equal(await p.$('#perto canvas'), null)
    await p.hover('#perto img')
    if (width === 390) await p.tap('#perto img')
    assert.equal(await p.$('#perto canvas'), null, 'Distorção voltou ao interagir')
    assert.equal(await p.$eval('#perto img', e => getComputedStyle(e).filter), 'none')
    await p.screenshot({ path: `${saida}/${width}-perto.jpg` })
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await new Promise(r => setTimeout(r, 500))
    assert.equal(await p.$eval('[data-foto-abertura="0"]', e => getComputedStyle(e).visibility), 'visible')
    assert.equal(await p.$eval('[data-foto-abertura="1"]', e => getComputedStyle(e).visibility), 'hidden')
    assert.deepEqual(erros, [])
    casos.push({ width, pares: [...pares], semCanvas: true, reduzido: true })
    await p.close()
  }
  fs.writeFileSync(`${saida}/resultado.json`, JSON.stringify({ aprovado: true, casos }, null, 2))
  console.log('2/2: fotografias sincronizadas, interação sem shader, reduzido correto')
} finally { await b.close() }
