// Regressão do fio da doca: nasce antes do cleanup e responde ao scroll e à preferência dinâmica.
// Uso: node ferramentas/regressao-doca.mjs <pasta-nova> [url]
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const destino = path.resolve(process.argv[2] || '.')
if (!process.argv[2] || fs.existsSync(destino)) throw new Error('Informe uma pasta nova para os resultados')
fs.mkdirSync(destino, { recursive: true })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, userDataDir: path.join(destino, '.perfil'),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const resultado = { aprovado: false, cenarios: [] }
try {
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    const p = await browser.newPage()
    await p.setViewport({ width, height })
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    await p.goto(process.argv[3] || 'http://localhost:5201', { waitUntil: 'networkidle2' })
    await p.evaluate(() => document.fonts.ready)
    await esperar(1000)
    const medir = () => p.$eval('[data-fio-desce]', (e) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(e).transform)
      return { escala: m.m22, y: e.getBoundingClientRect().top + scrollY }
    })
    const rolar = async (y) => {
      await p.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y)
      await esperar(800)
    }
    const inicio = await medir()
    assert(inicio.escala < 0.05, `Fio já completo antes de entrar: ${inicio.escala}`)
    await rolar(inicio.y - height * 0.5)
    const fim = await medir()
    assert(fim.escala > 0.95, `Fio não foi desenhado: ${fim.escala}`)
    await rolar(0)
    const retorno = await medir()
    assert(retorno.escala < 0.05, 'Fio não responde à rolagem de volta')
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await esperar(500)
    const reduzido = await medir()
    assert.equal(reduzido.escala, 1, 'No reduzido, fio deve estar completo')
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    await esperar(600)
    const reativado = await medir()
    assert(reativado.escala < 0.05, 'Fio não volta a animar após trocar a preferência')
    resultado.cenarios.push({ width, height, inicio, fim, retorno, reduzido, reativado })
    await p.close()
  }
  resultado.aprovado = true
} catch (erro) {
  resultado.erro = erro.stack
  process.exitCode = 1
} finally {
  await browser.close()
  fs.writeFileSync(path.join(destino, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify({ aprovado: resultado.aprovado, cenarios: resultado.cenarios.length, erro: resultado.erro }))
}
