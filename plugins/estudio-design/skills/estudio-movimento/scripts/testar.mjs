import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const [pasta, base = 'http://127.0.0.1:5190'] = process.argv.slice(2)
if (!pasta) { console.error('Uso: node testar.mjs <projeto> [url]'); process.exit(1) }
const projeto = path.resolve(pasta)
const exigir = createRequire(path.join(projeto, 'package.json'))
const puppeteer = (await import(pathToFileURL(exigir.resolve('puppeteer-core')).href)).default
const { estudos } = await import(pathToFileURL(path.join(projeto, 'src/estudos.js')).href)
const filtro = process.argv.find(a => a.startsWith('--somente='))?.split('=')[1]?.split(',')
const lista = filtro ? estudos.filter(e => filtro.includes(e.id)) : estudos
if (filtro && lista.length !== filtro.length) throw new Error('Estudo desconhecido no filtro --somente')
const edge = process.env.BROWSER_EXECUTABLE || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const saida = path.join(projeto, 'evidencias')
fs.mkdirSync(saida, { recursive: true })
const resultados = []
const navegador = await puppeteer.launch({ executablePath: edge, headless: true, userDataDir: path.join(saida, 'perfil-browser'), protocolTimeout: 30000 })
const esperar = (ms) => new Promise(r => setTimeout(r, ms))
try {
  for (const estudo of lista) for (const modo of ['desktop', 'celular', 'reduzido', 'celular-reduzido']) {
    const pagina = await navegador.newPage()
    try {
      const celular = modo.includes('celular'), reduzido = modo.includes('reduzido')
      await pagina.setViewport({ width: celular ? 390 : 1440, height: celular ? 844 : 900, isMobile: celular, hasTouch: celular })
      if (reduzido) await pagina.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
      const erros = []
      pagina.on('pageerror', e => erros.push(e.message))
      pagina.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`) })
      await pagina.goto(`${base}/?estudo=${estudo.id}`, { waitUntil: 'networkidle0' })
      await pagina.waitForSelector(`html[data-estudo-pronto="${estudo.id}"]`)
      await pagina.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())) })
      const medir = () => pagina.evaluate(() => {
        const elementos = [...document.querySelectorAll('[data-letra],[data-janela],[data-trilho],[data-linha],[data-cortina],[data-zoom],[data-anim]')]
        return { estados: elementos.map(e => { const s = getComputedStyle(e); return [s.transform,s.opacity,s.strokeDashoffset] }), pins: document.querySelectorAll('.pin-spacer').length, largura: document.documentElement.scrollWidth, viewport: innerWidth }
      })
      const limites = await pagina.evaluate(() => { const e = document.querySelector('[data-palco]'); const p = e.closest('.pin-spacer') || e; return { y: p.getBoundingClientRect().top + scrollY, altura: p.offsetHeight, tela: innerHeight } })
      const ir = async (y) => { await pagina.evaluate(v => scrollTo(0,v), y); await esperar(650) }
      await ir(celular ? limites.y - limites.tela * .7 : limites.y)
      const antes = await medir()
      await ir(celular ? limites.y + limites.altura - limites.tela * .3 : limites.y + limites.altura - limites.tela - 2)
      const depois = await medir()
      assert(depois.largura <= depois.viewport + 1, 'Vazamento horizontal')
      assert.equal(depois.pins, !celular && !reduzido ? 1 : 0, 'Pin incompatível com o modo')
      if (!reduzido && !(celular && estudo.id === 'lateral')) assert.notDeepEqual(antes.estados, depois.estados, 'Cena não respondeu ao scroll')
      if (reduzido) assert.deepEqual(antes.estados, depois.estados, 'Movimento em modo reduzido')
      await ir(limites.y + Math.max(0, limites.altura - limites.tela) * .5)
      await pagina.screenshot({ path: path.join(saida, `${estudo.id}-${modo}.png`) })
      if (estudo.id === 'lateral' && (celular || reduzido)) assert(await pagina.$eval('[data-trilho]', e => getComputedStyle(e).display === 'block'), 'Atos inacessíveis no modo estático')
      await pagina.locator('button').click()
      assert.equal((await medir()).pins, 0, 'Pausar não limpou o pin')
      await pagina.locator('button').click()
      if (!celular && !reduzido) {
        await pagina.setViewport({ width: 390, height: 844 }); await esperar(250)
        assert.equal((await medir()).pins, 0, 'Pin persistiu ao redimensionar')
        await pagina.setViewport({ width: 1440, height: 900 }); await esperar(250)
        assert.equal((await medir()).pins, 1, 'Pin duplicado ou ausente após redimensionar')
      }
      await pagina.$eval('[data-fim]', e => e.scrollIntoView())
      assert(await pagina.$eval('[data-fim] h2', e => e.getBoundingClientRect().top < innerHeight), 'Fim inacessível')
      assert.deepEqual(erros, [], 'Erros no navegador')
      resultados.push({ estudo: estudo.id, modo, status: 'ok' })
      if (resultados.length % 10 === 0) console.log(`${resultados.length}/${lista.length * 4} combinações verificadas`)
    } catch (e) { resultados.push({ estudo: estudo.id, modo, status: 'falhou', erro: e.message }); console.error(`${estudo.id}/${modo}: ${e.message}`) }
    finally { await pagina.close() }
  }
} finally {
  const encerrar = setTimeout(() => navegador.process()?.kill(), 5000)
  try { await navegador.close() } finally { clearTimeout(encerrar) }
  fs.writeFileSync(path.join(saida, filtro ? 'testes-ajustes.json' : 'testes.json'), JSON.stringify(resultados, null, 2) + '\n')
}
const falhas = resultados.filter(r => r.status !== 'ok')
console.log(`${resultados.length - falhas.length}/${resultados.length} combinações aprovadas; evidências em ${saida}`)
if (falhas.length) process.exitCode = 1
