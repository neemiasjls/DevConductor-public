// Complementa a rodada técnica existente: preferência alterada durante uso, resize e teclado.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const saida = path.resolve(process.argv[2] || 'revisao/continuacao-29-10')
fs.mkdirSync(saida, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
  userDataDir: path.join(saida, '.perfil'),
})
const esperar = ms => new Promise(r => setTimeout(r, ms))
const resultado = { data: new Date().toISOString(), url: 'http://localhost:5183/', erros: [], cenarios: [] }
try {
  const p = await browser.newPage()
  p.on('pageerror', e => resultado.erros.push(e.message))
  p.on('response', r => { if (r.status() >= 400) resultado.erros.push(`${r.status()} ${r.url()}`) })
  await p.setViewport({ width: 1440, height: 900 })
  await p.goto(resultado.url, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.fonts.ready)
  await esperar(1900)
  await p.screenshot({ path: path.join(saida, 'desktop-topo.jpg'), type: 'jpeg', quality: 85 })
  // O primeiro Tab precisa revelar o atalho sem o mouse; Enter deve focar e rolar ao destino.
  await p.keyboard.press('Tab')
  const atalho = await p.evaluate(() => ({ texto: document.activeElement.textContent.trim(), href: document.activeElement.getAttribute('href') }))
  assert.equal(atalho.href, '#contato')
  await p.keyboard.press('Enter')
  await esperar(1200)
  const teclado = await p.evaluate(() => ({ y: scrollY, hash: location.hash, foco: document.activeElement.tagName }))
  resultado.cenarios.push({ nome: 'atalho-teclado', atalho, teclado })
  assert.equal(teclado.hash, '#contato')
  const movimento = async () => p.evaluate(() => ({
    lenis: document.documentElement.classList.contains('lenis'),
    reduzido: matchMedia('(prefers-reduced-motion: reduce)').matches,
    cena: getComputedStyle(document.querySelector('#navalha')).position,
    largura: document.documentElement.scrollWidth, viewport: innerWidth,
    abertura: [...document.querySelectorAll('[data-entra]')].map(e => ({ opacidade: getComputedStyle(e).opacity, display: getComputedStyle(e).display })),
  }))
  const antes = await movimento()
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await esperar(600)
  const reduzido = await movimento()
  resultado.cenarios.push({ nome: 'reduzido-dinamico', antes, depois: reduzido })
  assert.equal(reduzido.lenis, false, 'Lenis continua ligado após reduzir movimento')
  assert.notEqual(reduzido.cena, 'sticky')
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await esperar(500)
  const reduzidoCelular = await movimento()
  resultado.cenarios.push({ nome: 'reduzido-resize', depois: reduzidoCelular })
  assert(reduzidoCelular.abertura.filter(e => e.display !== 'none').every(e => Number(e.opacidade) > 0.99), 'Conteudo da abertura oculto depois de reduzir e redimensionar')
  await p.screenshot({ path: path.join(saida, 'celular-reduzido-topo.jpg'), type: 'jpeg', quality: 85 })
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  await esperar(1800)
  const reativado = await movimento()
  resultado.cenarios.push({ nome: 'reativar-e-resize', depois: reativado })
  assert.equal(reativado.lenis, true)
  assert.equal(reativado.cena, 'sticky')
  assert(reativado.largura <= reativado.viewport + 1)
  await p.screenshot({ path: path.join(saida, 'celular-topo.jpg'), type: 'jpeg', quality: 85 })
  await p.evaluate(() => scrollTo({ top: document.querySelector('#trabalho').getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }))
  await esperar(1000)
  await p.tap('[data-figura]')
  assert.equal(await p.$eval('[data-figura]', e => e.getAttribute('aria-pressed')), 'true')
  await p.screenshot({ path: path.join(saida, 'celular-trabalho.jpg'), type: 'jpeg', quality: 85 })
  resultado.cenarios.push({ nome: 'toque-inverte', aprovado: true })
  assert.deepEqual(resultado.erros, [])
  resultado.aprovado = true
} catch (erro) {
  resultado.aprovado = false
  resultado.falha = erro.message
  process.exitCode = 1
} finally {
  await browser.close()
  fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2) + '\n')
  console.log(JSON.stringify(resultado))
}
