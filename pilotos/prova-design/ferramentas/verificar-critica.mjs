// Comportamento real dos achados da crítica: foco, preferência dinâmica, pausa e rolagem nativa.
// Rodar da pasta estudio-coral (puppeteer-core local); saída nova preserva as evidências anteriores.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(path.join(process.cwd(), 'package.json'))
const puppeteer = require('puppeteer-core')
const saida = path.resolve(process.argv[2])
if (fs.existsSync(saida)) throw Error('Use uma pasta nova')
fs.mkdirSync(saida, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, userDataDir: path.join(saida, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const esperar = ms => new Promise(r => setTimeout(r, ms))
const resultado = { data: new Date().toISOString(), cenarios: [], aprovado: false }
try {
  for (const largura of [390, 1440]) {
    for (const [site, url] of [['lastro', 'http://127.0.0.1:5195/'], ['coral', 'http://127.0.0.1:5194/'], ['seco', 'http://localhost:5183/']]) {
      if (process.argv[3] && process.argv[3] !== site) continue
      const p = await browser.newPage(), erros = []
      p.on('pageerror', e => erros.push(e.message))
      p.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`) })
      await p.setViewport({ width: largura, height: largura < 700 ? 844 : 900, isMobile: largura < 700, hasTouch: largura < 700 })
      await p.evaluateOnNewDocument(() => {
        window.__deslocamentos = []
        new PerformanceObserver(l => l.getEntries().forEach(e => {
          window.__deslocamentos.push({ tempo: e.startTime, valor: e.value, entrada: e.hadRecentInput,
            fontes: (e.sources || []).map(s => ({ elemento: s.node?.tagName + '#' + (s.node?.id || '') + '.' + (s.node?.className || '').toString().slice(0, 90), antes: s.previousRect.toJSON(), depois: s.currentRect.toJSON() })) })
        })).observe({ type: 'layout-shift', buffered: true })
      })
      await p.goto(url, { waitUntil: 'networkidle0' })
      await p.evaluate(() => document.fonts.ready)
      await esperar(1600)
      const c = { site, largura }
      resultado.cenarios.push(c)
      if (site === 'lastro') {
        await p.keyboard.press('Tab')
        assert.equal(await p.evaluate(() => document.activeElement.getAttribute('href')), '#conteudo')
        // Roda de verdade, incluindo retorno e o canvas que pode terminar de carregar durante o uso.
        for (const sentido of [1, -1]) {
          for (let i = 0; i < 45; i++) { await p.mouse.wheel({ deltaY: sentido * 400 }); await esperar(70) }
        }
        if (largura === 390) {
          const cdp = await p.createCDPSession()
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 700 }] })
          for (let y = 650; y >= 250; y -= 50) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y }] }); await esperar(40) }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        }
        c.foco = []
        await p.focus('#servicos article:first-child a')
        for (const tecla of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
          await esperar(500)
          const r = await p.evaluate(() => {
            const e = document.activeElement, r = e.getBoundingClientRect()
            return { texto: e.textContent.trim(), x: r.x, y: r.y, direita: r.right, baixo: r.bottom, largura: innerWidth, altura: innerHeight }
          })
          c.foco.push(r)
          assert(r.x >= -1 && r.direita <= r.largura + 1 && r.y >= 110 && r.baixo <= r.altura, `Link fora da tela: ${JSON.stringify(r)}`)
          if (tecla === 'Shift+Tab') { await p.keyboard.down('Shift'); await p.keyboard.press('Tab'); await p.keyboard.up('Shift') }
          else await p.keyboard.press(tecla)
        }
        c.deslocamentos = await p.evaluate(() => window.__deslocamentos)
        const elegiveis = c.deslocamentos.filter(e => !e.entrada)
        let inicio = -Infinity, anterior = -Infinity, soma = 0, maximo = 0
        for (const e of elegiveis) {
          if (e.tempo - anterior > 1000 || e.tempo - inicio > 5000) { inicio = e.tempo; soma = 0 }
          soma += e.valor; anterior = e.tempo; maximo = Math.max(maximo, soma)
        }
        c.clsJanela = maximo
        c.somaDeslocamentos = elegiveis.reduce((a, e) => a + e.valor, 0)
        assert(c.clsJanela <= 0.1, `Deslocamento excessivo no percurso nativo: ${c.clsJanela}`)
      }
      if (site === 'coral') {
        const botao = await p.$('button[aria-pressed]')
        await botao.click()
        assert.equal(await botao.evaluate(e => e.getAttribute('aria-pressed')), 'true')
        await esperar(900)
        const antes = await p.$$eval('[data-palavra], [data-arco-foto]', es => es.map(e => getComputedStyle(e).transform))
        await esperar(3000)
        assert.deepEqual(await p.$$eval('[data-palavra], [data-arco-foto]', es => es.map(e => getComputedStyle(e).transform)), antes, 'Pausa não interrompeu os ciclos')
        await botao.click()
        await esperar(3000)
        assert.notDeepEqual(await p.$$eval('[data-palavra], [data-arco-foto]', es => es.map(e => getComputedStyle(e).transform)), antes, 'Animação não retomou')
        c.pausaRetomada = true
        await p.$eval('#servicos', e => e.scrollIntoView({ behavior: 'instant' }))
        await esperar(1000)
        const coberta = await p.$$eval('[data-palavra], [data-arco-foto]', es => es.map(e => getComputedStyle(e).transform))
        await esperar(1200)
        assert.deepEqual(await p.$$eval('[data-palavra], [data-arco-foto]', es => es.map(e => getComputedStyle(e).transform)), coberta, 'Abertura coberta continua animando')
        c.pausaQuandoCoberta = true
        c.focoEstilos = []
        const links = await p.$$('#estilos a')
        assert(links.length > 0, 'CTA da esteira ausente')
        for (const link of [...links, ...links.slice().reverse()]) {
          await link.focus()
          await esperar(500)
          const r = await link.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, direita: r.right, baixo: r.bottom, largura: innerWidth, altura: innerHeight } })
          c.focoEstilos.push(r)
          assert(r.x >= -1 && r.direita <= r.largura + 1 && r.y >= 0 && r.baixo <= r.altura, 'Estilo focado fora da tela')
        }
      }
      if (site === 'seco') {
        await p.$eval('#trabalho', e => e.scrollIntoView({ behavior: 'instant' }))
        await esperar(1000)
        await p.click('[data-figura]')
        await esperar(600)
        assert.equal(await p.$eval('[data-figura]', e => e.getAttribute('aria-pressed')), 'true')
        const imagem = await p.$eval('[data-figura] img', e => ({ filtro: getComputedStyle(e).filter, transform: getComputedStyle(e.parentElement).transform }))
        assert(!imagem.filtro.includes('invert'))
        assert(imagem.transform.startsWith('matrix(2,'), 'Toque não ampliou a imagem')
        c.zoom = imagem
      }
      await p.screenshot({ path: path.join(saida, `${site}-${largura}-normal.jpg`), type: 'jpeg', quality: 85 })
      await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
      await esperar(800)
      assert.equal(await p.evaluate(() => document.documentElement.classList.contains('lenis')), false, 'Lenis ativo no reduzido dinâmico')
      if (site === 'lastro') assert.equal(await p.$('canvas'), null)
      if (site === 'seco') {
        assert(await p.$$eval('.pilha-legenda', es => es.every(e => e.textContent.trim().length > 20)), 'Descrição dos cortes ausente')
      }
      await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      await esperar(300)
      await p.screenshot({ path: path.join(saida, `${site}-${largura}-reduzido.jpg`), type: 'jpeg', quality: 85 })
      await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
      await esperar(800)
      if (site !== 'coral') assert.equal(await p.evaluate(() => document.documentElement.classList.contains('lenis')), true)
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      assert.deepEqual(erros, [])
      c.aprovado = true
      await p.close()
    }
  }
  resultado.aprovado = true
} catch (e) { resultado.erro = e.stack; process.exitCode = 1 }
finally { await browser.close(); fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2)); console.log(JSON.stringify({ aprovado: resultado.aprovado, cenarios: resultado.cenarios.length, erro: resultado.erro })) }
