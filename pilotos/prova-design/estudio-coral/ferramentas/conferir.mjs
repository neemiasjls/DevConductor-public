// Complemento de comportamento à revisão de 12 cenários. Não abre links externos.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'

const url = process.argv[2] || 'http://127.0.0.1:5194'
const saida = path.resolve(process.argv[3] || 'revisao/comportamento-29-10')
if (fs.existsSync(saida)) throw Error('Use uma pasta nova para preservar provas')
fs.mkdirSync(saida, { recursive: true })
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const navegador = await puppeteer.launch({ executablePath: chrome, headless: true, userDataDir: path.join(saida, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const esperar = ms => new Promise(r => setTimeout(r, ms))
const resultados = []
try {
  for (const largura of [390, 1440]) {
    const p = await navegador.newPage(), erros = []
    p.on('pageerror', e => erros.push(e.message))
    await p.setViewport({ width: largura, height: largura < 700 ? 844 : 900, isMobile: largura < 700, hasTouch: largura < 700 })
    await p.goto(url, { waitUntil: 'networkidle0' })
    await p.evaluate(() => document.fonts.ready)
    await esperar(1500)
    await p.screenshot({ path: path.join(saida, `${largura}-abertura.jpg`) })
    await p.keyboard.press('Tab')
    assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('href')), '#conteudo')
    for (const id of ['tranca', 'perto', 'estilos', 'contato']) {
      await p.evaluate(id => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), id)
      await esperar(1000)
      await p.screenshot({ path: path.join(saida, `${largura}-${id}.jpg`) })
    }
    await p.$eval('#perto figcaption', e => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await esperar(900)
    assert.equal(await p.$('a.fixed'), null, 'Atalho não deve encobrir o crédito da foto')
    await p.screenshot({ path: path.join(saida, `${largura}-creditos-livres.jpg`) })
    await p.$eval('#contato', e => e.scrollIntoView({ behavior: 'instant' }))
    await esperar(1000)
    await p.click('#contato button:nth-child(3)')
    assert.match(decodeURIComponent(await p.$eval('[data-botao-ima]', e => e.href)), /coloração/)
    assert.equal(await p.$eval('#contato button:nth-child(3)', e => e.getAttribute('aria-pressed')), 'true')
    await p.evaluate(() => document.getElementById('tranca').scrollIntoView({ behavior: 'instant' }))
    await esperar(1000)
    assert(await p.$$eval('[data-etapa]', es => es.every(e => Number(getComputedStyle(e).opacity) >= 0.64)))
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await esperar(1000)
    const reduzido = await p.evaluate(() => ({
      etapas: [...document.querySelectorAll('[data-etapa-texto]')].map(e => ({ opacity: getComputedStyle(e).opacity, visibility: getComputedStyle(e).visibility })),
      palcos: [...document.querySelectorAll('.palco')].map(e => getComputedStyle(e).position),
      canvas: document.querySelectorAll('canvas').length,
      lateral: document.documentElement.scrollWidth > innerWidth + 1,
    }))
    assert(reduzido.etapas.every(e => e.opacity === '1' && e.visibility === 'visible'))
    assert(reduzido.palcos.every(e => e === 'relative'))
    assert.equal(reduzido.canvas, 0)
    assert.equal(reduzido.lateral, false)
    await p.screenshot({ path: path.join(saida, `${largura}-tranca-reduzido.jpg`) })
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    await esperar(800)
    await p.setViewport({ width: largura < 700 ? 834 : 390, height: 844 })
    await esperar(800)
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    assert.deepEqual(erros, [])
    resultados.push({ largura, teclado: true, mensagemServico: true, reduzido, resize: true, erros })
    await p.close()
  }
  const p = await navegador.newPage()
  await p.setRequestInterception(true)
  p.on('request', r => r.url().includes('/animacoes/tranca.json') ? r.abort() : r.continue())
  await p.goto(url, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.getElementById('tranca').scrollIntoView({ behavior: 'instant' }))
  await esperar(1600)
  assert(await p.$eval('img[src="/animacoes/tranca-final.svg"]', e => e.naturalWidth > 0 && getComputedStyle(e).opacity === '1'))
  resultados.push({ lottieIndisponivel: 'poster preservado' })
  await p.close()
  fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify({ url, resultados, aprovado: true }, null, 2))
  console.log(JSON.stringify({ aprovado: true, cenarios: resultados.length, saida }))
} finally { await navegador.close() }
