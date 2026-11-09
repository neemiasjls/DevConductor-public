// Confere que classificar fichas estáticas como leitura não remove conteúdo ou libera cenas normais.
// Executar da raiz do repositório: node pilotos/prova-design/ferramentas/verificar-leitura-reduzida.mjs <pasta-nova>
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../rodada-claude/austral-frio/package.json', import.meta.url))
const puppeteer = require('puppeteer-core')
const saida = path.resolve(process.argv[2] || '.')
if (!process.argv[2] || fs.existsSync(saida)) throw new Error('Informe uma pasta nova')
fs.mkdirSync(saida, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, userDataDir: path.join(saida, '.perfil'),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const resultado = { aprovado: false, cenarios: [] }
try {
  for (const [slug, porta, seletor, itens] of [
    ['austral-frio', 5201, '#viagem ol[data-viagem-sai]', 5],
    ['prumo-barbearia', 5203, '#cadeira > [data-leitura]', 4],
  ]) {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      const p = await browser.newPage()
      const erros = []
      p.on('pageerror', (e) => erros.push(e.message))
      await p.setViewport({ width, height })
      await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
      await p.goto(`http://localhost:${porta}`, { waitUntil: 'networkidle2' })
      for (const reduzir of [false, true, false]) {
        await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduzir ? 'reduce' : 'no-preference' }])
        await esperar(600)
        const leitura = await p.evaluate((s) => document.querySelector(s)?.hasAttribute('data-leitura') || false, seletor)
        assert.equal(leitura, reduzir, `${slug}: classificação incorreta após trocar movimento`)
        if (reduzir) {
          const quantidade = await p.$eval(seletor, (e) => e.querySelectorAll('li').length)
          assert.equal(quantidade, itens, `${slug}: lista reduzida perdeu conteúdo`)
          assert.equal(await p.$eval(seletor, (e) => getComputedStyle(e).display === 'none'), false)
        }
      }
      assert.deepEqual(erros, [])
      resultado.cenarios.push({ slug, width, height, itens, aprovado: true })
      await p.close()
    }
  }
  resultado.aprovado = true
} catch (erro) {
  resultado.erro = erro.stack
  process.exitCode = 1
} finally {
  await browser.close()
  fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify({ aprovado: resultado.aprovado, cenarios: resultado.cenarios.length, erro: resultado.erro }))
}
