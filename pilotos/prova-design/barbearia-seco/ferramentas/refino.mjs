// Confere o refino sem trocar a proposta: faixas pausáveis e letras que terminam legíveis.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const saida = path.resolve(process.argv[2] || 'revisao/refino-codex-29-10/comportamento')
if (fs.existsSync(saida)) throw Error('Use uma pasta nova para preservar a evidência')
fs.mkdirSync(saida, { recursive: true })
const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, userDataDir: path.join(saida, '.perfil') })
const esperar = ms => new Promise(r => setTimeout(r, ms))
const resultado = { data: new Date().toISOString(), casos: [], aprovado: false }
try {
  for (const largura of [390, 1440]) {
    const p = await navegador.newPage(), erros = []
    p.on('pageerror', e => erros.push(e.message))
    p.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`) })
    await p.setViewport({ width: largura, height: largura < 700 ? 844 : 900, isMobile: largura < 700, hasTouch: largura < 700 })
    await p.goto('http://localhost:5183/', { waitUntil: 'networkidle0' })
    await p.evaluate(() => document.fonts.ready)
    await esperar(1800)
    const faixa = await p.$('.faixa-moldura')
    await faixa.evaluate(e => e.scrollIntoView({ behavior: 'instant', block: 'center' }))
    await esperar(700)
    const botao = await faixa.$('button')
    await botao.click()
    assert.equal(await botao.evaluate(e => e.getAttribute('aria-pressed')), 'true')
    const parada = await faixa.$eval('.faixa > div', e => getComputedStyle(e).transform)
    await esperar(650)
    assert.equal(await faixa.$eval('.faixa > div', e => getComputedStyle(e).transform), parada)
    await botao.click()
    await esperar(650)
    assert.notEqual(await faixa.$eval('.faixa > div', e => getComputedStyle(e).transform), parada)
    await p.screenshot({ path: path.join(saida, `${largura}-faixa.jpg`), type: 'jpeg', quality: 86 })
    const posicao = seletor => p.$eval(seletor, e => { const cena = e.closest('.cena-presa'); return { y: cena.getBoundingClientRect().top + scrollY, percurso: cena.offsetHeight - innerHeight } })
    const cortes = await posicao('#cortes')
    await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), cortes.y + cortes.percurso * 0.6)
    await esperar(1000)
    await p.screenshot({ path: path.join(saida, `${largura}-cortes.jpg`), type: 'jpeg', quality: 86 })
    const senta = await posicao('#senta')
    for (const fracao of [0.15, 0.6, 1]) {
      await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), senta.y + senta.percurso * fracao)
      await esperar(1000)
      await p.screenshot({ path: path.join(saida, `${largura}-senta-${String(fracao).replace('.', '-')}.jpg`), type: 'jpeg', quality: 86 })
    }
    const letras = await p.$$eval('[data-letra]', es => es.map(e => {
      const r = e.getBoundingClientRect(), t = new DOMMatrix(getComputedStyle(e).transform)
      return { letra: e.textContent, x: r.x, direita: r.right, y: r.y, baixo: r.bottom, dentro: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, residuo: Math.abs(t.e) + Math.abs(t.f) + Math.abs(t.a - 1) + Math.abs(t.b) }
    }))
    assert(letras.every(l => l.dentro && l.residuo < 0.01), 'Frase final fora da tela ou sem completar')
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await esperar(800)
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('lenis')), false)
    await p.$eval('#senta', e => e.scrollIntoView({ behavior: 'instant' }))
    await esperar(600)
    assert(await p.$$eval('[data-letra]', es => es.every(e => getComputedStyle(e).transform === 'none')))
    await p.screenshot({ path: path.join(saida, `${largura}-senta-reduzido.jpg`), type: 'jpeg', quality: 86 })
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    assert.deepEqual(erros, [])
    resultado.casos.push({ largura, faixaPausaRetoma: true, fraseCompleta: letras, reduzidoDinamico: true, aprovado: true })
    await p.close()
  }
  resultado.aprovado = true
} catch (e) { resultado.erro = e.stack; process.exitCode = 1 }
finally { await navegador.close(); fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2)); console.log(JSON.stringify({ aprovado: resultado.aprovado, casos: resultado.casos.length, erro: resultado.erro })) }
