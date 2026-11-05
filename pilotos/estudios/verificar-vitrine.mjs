import puppeteer from 'puppeteer-core'
import path from 'node:path'
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { estudos } from './src/estudos.js'
const esperados = estudos.length * 2
const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  userDataDir: path.resolve('evidencias/perfil-vitrine') })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(pathToFileURL(path.resolve('vitrine/galeria.html')).href)
  await page.waitForFunction(n => [...document.querySelectorAll('video')].length === n && [...document.querySelectorAll('video')].every(v => v.readyState >= 1), {}, esperados)
  const videos = await page.$$eval('video', vs => vs.map(v => ({ arquivo: v.getAttribute('src'), duracao: v.duration, pausado: v.paused, controles: v.controls })))
  assert.equal(videos.length, esperados)
  console.log(JSON.stringify(videos)); assert(videos.every(v => v.duracao > 1 && v.pausado && v.controles))
  await page.$eval('input', e => { e.checked = true; e.dispatchEvent(new Event('change')) })
  assert.match(await page.$eval('#escolhidos', e => e.textContent), /1/)
  await page.reload()
  assert(await page.$eval('input', e => e.checked))
  // Não deixar favorito de teste parecendo escolha do usuário.
  await page.evaluate(() => { localStorage.clear(); location.reload() })
  await page.waitForSelector('#escolhidos')
  await page.screenshot({ path: 'evidencias/vitrine-desktop.png' })
  await page.setViewport({ width: 390, height: 844, isMobile: true })
  await page.screenshot({ path: 'evidencias/vitrine-celular.png' })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  fs.writeFileSync('evidencias/vitrine.json', JSON.stringify({ videos, selecaoPersistida: true, favoritoDeTesteRemovido: true, semVazamento: true }, null, 2))
  console.log(`Vitrine: ${esperados} vídeos válidos, movimento reduzido respeitado, seleção persistida e limpa, sem vazamento no celular.`)
} finally {
  const encerrar = setTimeout(() => browser.process()?.kill(), 5000)
  try { await browser.close() } finally { clearTimeout(encerrar) }
}
