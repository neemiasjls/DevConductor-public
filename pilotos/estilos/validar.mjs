import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const local = path.dirname(fileURLToPath(import.meta.url))
const exigir = createRequire(path.join(local, '../estudios/package.json'))
const puppeteer = exigir('puppeteer-core')
const saida = path.join(local, 'evidencias'); fs.mkdirSync(saida, { recursive: true })
const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: path.join(saida, '.perfil') })
const ids = ['luxo-editorial', 'tecnologico-escuro', 'claro-organico', 'editorial-serio'], resultados = []
try {
  for (const id of ids) {
    for (const largura of [360, 390, 414, 768, 1024, 1440]) for (const reduzido of [false, true]) {
      const p = await navegador.newPage(), erros = []
      p.on('pageerror', e => erros.push(e.message)); p.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`) })
      await p.setViewport({ width: largura, height: 900 })
      await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduzido ? 'reduce' : 'no-preference' }])
      const res = await p.goto(`http://127.0.0.1:5192/site/${id}.html`, { waitUntil: 'networkidle0' })
      assert.match(res.headers()['x-robots-tag'], /noindex/)
      await p.evaluate(() => document.fonts.ready)
      const estado = await p.evaluate(() => ({
        h1: document.querySelectorAll('h1').length, largura: document.documentElement.scrollWidth,
        movimento: document.body.dataset.movimento, links: [...document.querySelectorAll('a[href^="#"]')].every(a => document.querySelector(a.getAttribute('href'))),
        nomes: [...document.querySelectorAll('a,button')].every(e => e.textContent.trim() || e.getAttribute('aria-label')),
        quebradas: [...document.images].filter(i => !i.naturalWidth).length,
      }))
      assert.equal(estado.h1, 1); assert(estado.largura <= largura + 1, `${id}: overflow ${estado.largura}/${largura}`)
      assert(estado.links && estado.nomes); assert.equal(estado.quebradas, 0)
      assert.equal(estado.movimento, reduzido ? 'estatico' : 'rolagem')
      const inicial = await p.$eval('[data-traco]', e => e.style.strokeDashoffset)
      if ([390,1440].includes(largura)) await p.screenshot({ path: path.join(saida, `${id}-${largura}-${reduzido ? 'reduzido' : 'normal'}.jpg`), type: 'jpeg', quality: 80 })
      await p.$eval('[data-cena]', e => e.scrollIntoView({ block: 'center' }))
      await new Promise(r => setTimeout(r, 120))
      const final = await p.$eval('[data-traco]', e => e.style.strokeDashoffset)
      if (reduzido) assert.equal(final, '0'); else assert.notEqual(final, inicial)
      await p.click('#pausar'); assert.equal(await p.$eval('#pausar', e => e.getAttribute('aria-pressed')), 'true')
      assert.equal(await p.$eval('[data-traco]', e => e.style.strokeDashoffset), '0')
      await p.click('#pausar')
      await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
      await p.waitForFunction(() => document.body.dataset.movimento === 'estatico')
      assert.deepEqual(erros, [])
      resultados.push({ id, largura, reduzido, passou: true }); await p.close()
    }
    const p = await navegador.newPage(); await p.setJavaScriptEnabled(false)
    await p.goto(`http://127.0.0.1:5192/site/${id}.html`)
    assert(await p.$eval('h1', e => e.textContent.trim()))
    assert.equal(await p.$eval('[data-traco]', e => getComputedStyle(e).strokeDasharray), 'none')
    await p.close(); console.log(`${id}: 12 combinações + sem JS passaram`)
  }
} finally {
  fs.writeFileSync(path.join(saida, 'testes.json'), JSON.stringify(resultados, null, 2))
  const timer = setTimeout(() => navegador.process()?.kill(), 5000)
  await navegador.close().finally(() => clearTimeout(timer))
}
