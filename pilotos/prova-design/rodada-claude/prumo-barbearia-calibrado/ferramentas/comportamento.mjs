// Comportamento real da Prumo (modelo: pilotos/prova-design/ferramentas/verificar-critica.mjs).
// Uso (da pasta do site, com o preview no ar): node ferramentas/comportamento.mjs revisao/<pasta-nova> [url]
// Casos, em 390 e 1440: salto com Enter, teclado completo (Tab até o fim e Shift+Tab de volta, foco sempre
// visível e na frente), pausa/retomada do giro, laço do canvas (contínuo só girando; sob demanda depois do giro;
// parado fora da tela e com a aba oculta), troca dinâmica de movimento reduzido com foco ativo e no meio das
// cenas, mídia indisponível (GLB, HDRI, WebGL: pôster + as 4 legendas, sem régua solta; fotos: marcas visíveis
// e sem percurso preso), redimensionamento no meio do degradê, recursos estáveis em ciclos normal/reduzido,
// rolagem até o fim e de volta ao topo (cenas reconstituídas, CLS por janela), sem rolagem lateral.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'

const saida = path.resolve(process.argv[2] || '')
const url = process.argv[3] || 'http://127.0.0.1:5206/'
if (!process.argv[2] || fs.existsSync(saida)) throw Error('Informe uma pasta nova de saída')
fs.mkdirSync(saida, { recursive: true })
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_EXECUTABLE || edge, headless: true,
  userDataDir: path.join(saida, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'] })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const resultado = { data: new Date().toISOString(), url, cenarios: [], aprovado: false }

async function abrir(largura, { bloquear = null, semWebGL = false } = {}) {
  const p = await browser.newPage()
  const erros = []
  p.on('pageerror', (e) => erros.push('pageerror: ' + e.message))
  p.on('response', (r) => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`) })
  await p.setViewport({ width: largura, height: largura < 700 ? 844 : 900, isMobile: largura < 700, hasTouch: largura < 700 })
  await p.evaluateOnNewDocument((semWebGL) => {
    window.__deslocamentos = []
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      window.__deslocamentos.push({ tempo: e.startTime, valor: e.value, entrada: e.hadRecentInput,
        fontes: (e.sources || []).map((s) => (s.node?.tagName || '') + '.' + String(s.node?.className || '').slice(0, 60)) })
    })).observe({ type: 'layout-shift', buffered: true })
    if (semWebGL) {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
        return /webgl/i.test(tipo) ? null : original.call(this, tipo, ...resto)
      }
    }
  }, semWebGL)
  if (bloquear) {
    await p.setRequestInterception(true)
    p.on('request', (r) => (bloquear.test(r.url()) ? r.abort('failed') : r.continue()))
  }
  await p.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
  await p.evaluate(() => document.fonts.ready)
  return { p, erros }
}

const clsJanela = (lista) => {
  let inicio = -Infinity, anterior = -Infinity, soma = 0, maximo = 0
  for (const e of lista.filter((x) => !x.entrada)) {
    if (e.tempo - anterior > 1000 || e.tempo - inicio > 5000) { inicio = e.tempo; soma = 0 }
    soma += e.valor; anterior = e.tempo; maximo = Math.max(maximo, soma)
  }
  return maximo
}
const semLateral = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
const quadroCanvas = async (p) => (await (await p.$('#cadeira canvas')).screenshot({ encoding: 'base64' }))
const laco = (p) => p.$eval('[data-canvas-cadeira]', (e) => e.dataset.canvasCadeira)
const reduzir = (p, sim) => p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: sim ? 'reduce' : 'no-preference' }])
const focoAtual = (p) => p.evaluate(() => ({ foco: document.activeElement.dataset.foco || null, tag: document.activeElement.tagName, naCadeira: !!document.activeElement.closest('#cadeira') }))
// Rola até uma fração do percurso de uma cena presa (0 = início, 1 = fim).
const irPara = (p, seletor, fracao) => p.evaluate((seletor, fracao) => {
  const inv = document.querySelector(seletor)
  const topo = inv.getBoundingClientRect().top + scrollY
  scrollTo({ top: Math.round(topo + fracao * Math.max(0, inv.offsetHeight - innerHeight)), behavior: 'instant' })
}, seletor, fracao)

// Foco: visível, na frente (não coberto) e dentro da tela, abaixo do cabeçalho fixo.
async function conferirFoco(p, c, tecla) {
  if (tecla === 'Shift+Tab') { await p.keyboard.down('Shift'); await p.keyboard.press('Tab'); await p.keyboard.up('Shift') }
  else await p.keyboard.press('Tab')
  await esperar(700)
  const r = await p.evaluate(() => {
    const e = document.activeElement, b = e.getBoundingClientRect(), s = getComputedStyle(e)
    const noCabecalho = !!e.closest('header') || e.getAttribute('href') === '#conteudo'
    const meio = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, b.x + b.width / 2)), Math.min(innerHeight - 1, Math.max(0, b.y + b.height / 2)))
    return { texto: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 50), corpo: e === document.body, x: b.x, y: b.y, direita: b.right, baixo: b.bottom,
      largura: innerWidth, altura: innerHeight, visivel: s.visibility === 'visible' && Number(s.opacity) > 0.5, noCabecalho,
      naFrente: !!meio && (e === meio || e.contains(meio)), cobre: meio ? meio.tagName + '.' + String(meio.className).slice(0, 60) : null, rolagem: scrollY }
  })
  c.foco.push({ tecla, ...r })
  if (r.corpo) return r
  assert(r.visivel && r.naFrente, `Foco escondido ou coberto: ${JSON.stringify(r)}`)
  assert(r.x >= -1 && r.direita <= r.largura + 1 && r.baixo <= r.altura + 1 && r.y >= (r.noCabecalho ? 0 : 56), `Foco fora da tela: ${JSON.stringify(r)}`)
  return r
}

try {
  for (const largura of [390, 1440]) {
    // ---------- 1. Teclado, pausa, fora da tela, rolagem ida e volta, reduzido dinâmico ----------
    const { p, erros } = await abrir(largura)
    const c = { caso: 'principal', largura }
    resultado.cenarios.push(c)

    // Teclado do topo: pular para o conteúdo e depois cada parada visível na tela.
    await p.keyboard.press('Tab')
    assert.equal(await p.evaluate(() => document.activeElement.getAttribute('href')), '#conteudo')
    await p.keyboard.press('Enter')
    await esperar(400)
    assert.equal(await p.evaluate(() => document.activeElement.id), 'conteudo', 'Enter no salto não levou o foco ao conteúdo')
    await p.keyboard.press('Tab')
    await esperar(300)
    assert.equal((await focoAtual(p)).foco, 'agendar', 'depois do salto, o Tab não foi ao primeiro botão do conteúdo')
    c.saltoComEnter = true
    // Primeiro gesto carrega o 3D; espera a cena ficar pronta.
    await p.mouse.wheel({ deltaY: 1 })
    await p.waitForSelector('#cadeira[data-pronta]', { timeout: 40000 })
    await esperar(800)
    c.tresDPronto = true

    // Pausa e retomada do giro (WCAG 2.2.2): quadro igual pausado, diferente girando.
    const botao = await p.$('[data-pausa]')
    assert(botao, 'botão de pausa ausente')
    const a1 = await quadroCanvas(p); await esperar(1500); const a2 = await quadroCanvas(p)
    assert.notEqual(a1, a2, 'a cadeira não está girando antes da pausa')
    await botao.click()
    await esperar(400)
    assert.equal(await botao.evaluate((e) => e.getAttribute('aria-pressed')), 'true')
    assert.equal(await p.$eval('[data-canvas-cadeira]', (e) => e.dataset.canvasCadeira), 'demand')
    const b1 = await quadroCanvas(p); await esperar(1500); const b2 = await quadroCanvas(p)
    assert.equal(b1, b2, 'pausa não parou o giro')
    await botao.click()
    await esperar(300)
    const d1 = await quadroCanvas(p); await esperar(1500); const d2 = await quadroCanvas(p)
    assert.notEqual(d1, d2, 'giro não retomou')
    c.pausaRetomada = true

    // Foco: Tab a partir do botão de pausa até os serviços; cada parada visível e fora do cabeçalho.
    c.foco = []
    await botao.focus()
    for (let i = 0; i < 4; i++) await conferirFoco(p, c, 'Tab')
    for (let i = 0; i < 5; i++) await conferirFoco(p, c, 'Shift+Tab')

    // Fora da tela: o canvas deixa de desenhar.
    await p.evaluate(() => document.querySelector('#servicos').scrollIntoView({ behavior: 'instant' }))
    await esperar(1200)
    assert.equal(await p.$eval('[data-canvas-cadeira]', (e) => e.dataset.canvasCadeira), 'never', 'canvas continua desenhando fora da tela')
    c.paradoForaDaTela = true

    // Depois do giro (a história começou): sob demanda. Aba oculta: nada. De volta ao topo: contínuo.
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await esperar(1000)
    await p.evaluate(() => scrollTo({ top: Math.round(innerHeight * 0.5), behavior: 'instant' }))
    await esperar(1500)
    assert.equal(await laco(p), 'demand', 'canvas contínuo depois que o giro acabou')
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await esperar(1500)
    assert.equal(await laco(p), 'always', 'giro não voltou no topo')
    await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')) })
    await esperar(400)
    assert.equal(await laco(p), 'never', 'canvas continua com a aba oculta')
    await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')) })
    await esperar(400)
    assert.equal(await laco(p), 'always', 'canvas não voltou com a aba visível')
    c.lacoDoCanvas = true

    // Rolagem real de ida e volta (roda), com cenas reconstituídas no topo.
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await esperar(800)
    for (const sentido of [1, -1]) {
      for (let i = 0; i < 70; i++) { await p.mouse.wheel({ deltaY: sentido * 380 }); await esperar(60) }
      await esperar(1500)
      assert(await semLateral(p), 'rolagem lateral durante o percurso')
      if (sentido === 1) {
        c.fimAlcancado = await p.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 4)
        assert(c.fimAlcancado, 'não chegou ao fim da página')
        await p.screenshot({ path: path.join(saida, `${largura}-fim.jpg`), type: 'jpeg', quality: 80 })
      }
    }
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await esperar(1500)
    const topo = await p.evaluate(() => ({
      y: scrollY,
      hero: getComputedStyle(document.querySelector('[data-hero]')).opacity,
      legenda: getComputedStyle(document.querySelector('li[data-legenda="toalha"]')).visibility,
      linha: Number(getComputedStyle(document.querySelector('#degrade [data-palco]')).getPropertyValue('--linha')),
    }))
    c.topoDepoisDaVolta = topo
    assert.equal(Number(topo.hero), 1, 'abertura não voltou ao estado inicial')
    assert.equal(topo.legenda, 'hidden', 'legenda da cadeira ficou presa na tela')
    assert(topo.linha >= 70, `degradê não voltou ao início: ${topo.linha}`)
    c.deslocamentos = await p.evaluate(() => window.__deslocamentos)
    c.clsJanela = clsJanela(c.deslocamentos)
    assert(c.clsJanela <= 0.1, `CLS por janela alto: ${c.clsJanela}`)
    await p.screenshot({ path: path.join(saida, `${largura}-topo-volta.jpg`), type: 'jpeg', quality: 80 })

    // Troca dinâmica para reduzido com o foco no botão de pausa: o foco passa ao "agendar" equivalente.
    await (await p.$('[data-pausa]')).focus()
    await esperar(300)
    c.antesDaTroca = await p.evaluate(() => ({ ...{ foco: document.activeElement.dataset.foco || document.activeElement.tagName }, y: scrollY, desativado: document.querySelector('[data-pausa]').disabled }))
    await reduzir(p, true)
    await esperar(900)
    c.focoNaTroca = await focoAtual(p)
    assert(c.focoNaTroca.foco === 'agendar' && c.focoNaTroca.naCadeira, `foco perdido na troca para reduzido: ${JSON.stringify(c.focoNaTroca)}`)
    // Sem cena presa, sem Lenis, sem canvas, conteúdo inteiro visível.
    const reduzido = await p.evaluate(() => ({
      lenis: document.documentElement.classList.contains('lenis'),
      canvas: !!document.querySelector('canvas'),
      percurso: document.querySelector('.percurso-degrade').offsetHeight,
      secao: document.querySelector('#degrade').offsetHeight,
      legendas: [...document.querySelectorAll('#cadeira li')].map((l) => getComputedStyle(l).visibility),
      marcas: [...document.querySelectorAll('#degrade [data-marca]')].filter((m) => m.getBoundingClientRect().height > 8 && Number(getComputedStyle(m).opacity) > 0.9).length,
      manifesto: getComputedStyle(document.querySelector('[data-peso]')).fontVariationSettings,
    }))
    c.reduzido = reduzido
    assert.equal(reduzido.lenis, false, 'Lenis ativo no reduzido')
    assert.equal(reduzido.canvas, false, 'canvas no reduzido')
    assert(reduzido.percurso <= reduzido.secao + 2, 'degradê continua com percurso preso no reduzido')
    assert(reduzido.legendas.length === 4 && reduzido.legendas.every((v) => v === 'visible'), 'ficha da cadeira escondida no reduzido')
    assert.equal(reduzido.marcas, 3, 'marcas do degradê não aparecem inteiras no reduzido')
    assert(await semLateral(p), 'rolagem lateral no reduzido')
    await p.screenshot({ path: path.join(saida, `${largura}-reduzido-dinamico.jpg`), type: 'jpeg', quality: 80 })
    await reduzir(p, false)
    await esperar(1200)
    c.focoNaVolta = await focoAtual(p)
    assert(c.focoNaVolta.foco === 'agendar' && c.focoNaVolta.naCadeira, `foco perdido na volta do reduzido: ${JSON.stringify(c.focoNaVolta)}`)
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('lenis')), true, 'Lenis não voltou')
    assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('#cadeira')).position), 'sticky', 'cena da cadeira não voltou')
    await p.mouse.wheel({ deltaY: 2 })
    await p.waitForSelector('#cadeira[data-pronta]', { timeout: 40000 })
    c.voltaDoReduzido = true

    // Troca no meio do clímax do degradê: ida e volta sem rolagem lateral, e o scrub volta a funcionar.
    await irPara(p, '.percurso-degrade', 0.4)
    await esperar(1500)
    await reduzir(p, true)
    await esperar(1000)
    assert(await semLateral(p), 'rolagem lateral na troca no meio do degradê')
    assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('#degrade')).position), 'relative', 'degradê preso no reduzido')
    await reduzir(p, false)
    await esperar(1200)
    await irPara(p, '.percurso-degrade', 0.4)
    await esperar(1500)
    c.degradeDepoisDaTroca = await p.evaluate(() => ({
      posicao: getComputedStyle(document.querySelector('#degrade')).position,
      linha: Number(getComputedStyle(document.querySelector('#degrade [data-palco]')).getPropertyValue('--linha')),
    }))
    assert(c.degradeDepoisDaTroca.posicao === 'sticky' && c.degradeDepoisDaTroca.linha < 60, `degradê não voltou: ${JSON.stringify(c.degradeDepoisDaTroca)}`)
    assert.deepEqual(erros, [])
    c.aprovado = true
    await p.close()

    // ---------- 2. Teclado completo: Tab do topo até o fim, Shift+Tab de volta ----------
    {
      const { p, erros } = await abrir(largura)
      const t = { caso: 'teclado-completo', largura, foco: [] }
      resultado.cenarios.push(t)
      const vistos = new Set()
      for (let i = 0; i < 90; i++) {
        const r = await conferirFoco(p, t, 'Tab')
        if (r.corpo || (i > 0 && r.texto === t.foco[0].texto && r.rolagem < 10)) break
        vistos.add(r.texto + '|' + Math.round(r.rolagem))
      }
      t.paradasIda = t.foco.length
      assert(t.foco.some((f) => /WhatsApp|Agendar/i.test(f.texto) && f.rolagem > 2000), 'Tab não chegou ao fim da página')
      const ida = t.foco.length
      for (let i = 0; i < ida + 2; i++) {
        const r = await conferirFoco(p, t, 'Shift+Tab')
        if (r.corpo || r.texto === t.foco[0].texto) break
      }
      t.paradasVolta = t.foco.length - ida
      assert.deepEqual(erros, [])
      t.aprovado = true
      await p.close()
    }

    // ---------- 3. Redimensionar no meio do degradê (só no computador: a janela muda de forma) ----------
    if (largura === 1440) {
      const { p, erros } = await abrir(largura)
      const r = { caso: 'redimensionar', largura, passos: [] }
      resultado.cenarios.push(r)
      await p.mouse.wheel({ deltaY: 1 })
      for (const [w, h, preso] of [[1440, 900, true], [390, 844, true], [844, 390, false], [1280, 720, true], [1440, 900, true]]) {
        await p.setViewport({ width: w, height: h })
        await esperar(1200)
        await irPara(p, '.percurso-degrade', 0.45)
        await esperar(1500)
        const g = await p.evaluate(() => {
          const sec = document.querySelector('#degrade').getBoundingClientRect()
          const fig = document.querySelector('#degrade figure > div').getBoundingClientRect()
          return { posicao: getComputedStyle(document.querySelector('#degrade')).position, dentro: fig.left >= sec.left - 1 && fig.right <= sec.right + 1,
            marcas: [...document.querySelectorAll('#degrade [data-marca]')].filter((m) => m.getBoundingClientRect().height > 8 && Number(getComputedStyle(m).opacity) > 0.9).length,
            linha: Number(getComputedStyle(document.querySelector('#degrade [data-palco]')).getPropertyValue('--linha')) }
        })
        g.tela = `${w}x${h}`
        g.lateral = !(await semLateral(p))
        r.passos.push(g)
        assert(!g.lateral && g.dentro, `degradê fora da coluna em ${g.tela}: ${JSON.stringify(g)}`)
        if (preso) assert(g.posicao === 'sticky' && g.linha < 60, `cena do degradê não refeita em ${g.tela}: ${JSON.stringify(g)}`)
        else assert(g.posicao === 'relative' && g.marcas === 3, `degradê sem a lista em tela baixa ${g.tela}: ${JSON.stringify(g)}`)
        await p.screenshot({ path: path.join(saida, `redimensionar-${g.tela}.jpg`), type: 'jpeg', quality: 75 })
      }
      assert.deepEqual(erros, [])
      r.aprovado = true
      await p.close()
    }

    // ---------- 4. Recursos estáveis em ciclos normal/reduzido (memória JS depois de coletar o lixo) ----------
    if (largura === 1440) {
      const { p, erros } = await abrir(largura)
      const r = { caso: 'ciclos-reduzido', largura, heap: [] }
      resultado.cenarios.push(r)
      const cdp = await p.createCDPSession()
      const medir = async () => { await cdp.send('HeapProfiler.collectGarbage'); await esperar(300); return (await p.metrics()).JSHeapUsedSize }
      await p.mouse.wheel({ deltaY: 1 })
      await p.waitForSelector('#cadeira[data-pronta]', { timeout: 40000 })
      for (let i = 0; i < 5; i++) {
        await reduzir(p, true); await esperar(700)
        await reduzir(p, false); await esperar(700)
        await p.mouse.wheel({ deltaY: 1 })
        await p.waitForSelector('#cadeira[data-pronta]', { timeout: 40000 })
        await esperar(500)
        r.heap.push(await medir())
      }
      r.canvas = await p.evaluate(() => document.querySelectorAll('canvas').length)
      r.crescimento = r.heap[r.heap.length - 1] / r.heap[1]
      assert.equal(r.canvas, 1, 'canvas acumulado nos ciclos')
      assert(r.crescimento < 1.15, `memória cresce a cada ciclo: ${JSON.stringify(r.heap)}`)
      assert.deepEqual(erros, [])
      r.aprovado = true
      await p.close()
    }

    // ---------- 5. Mídia indisponível ----------
    const casos = [
      { caso: 'glb-bloqueado', bloquear: /\.glb(\?|$)/, poster: true },
      { caso: 'hdri-bloqueado', bloquear: /\.hdr(\?|$)/, poster: true },
      { caso: 'sem-webgl', semWebGL: true, poster: true },
      { caso: 'fotos-bloqueadas', bloquear: /\/img\/.*\.webp/, poster: false },
    ]
    for (const m of casos) {
      const { p, erros } = await abrir(largura, m)
      const r = { caso: m.caso, largura }
      resultado.cenarios.push(r)
      await p.mouse.wheel({ deltaY: 1 })
      await esperar(6000)
      if (m.poster) {
        r.poster = await p.evaluate(() => {
          const img = document.querySelector('[data-poster-img]')
          return { src: img.getAttribute('src'), opacidade: getComputedStyle(img).opacity, carregou: img.naturalWidth > 0, canvas: !!document.querySelector('#cadeira canvas') }
        })
        assert(r.poster.src.includes('cadeira-poster') && Number(r.poster.opacidade) === 1 && r.poster.carregou, `substituto do 3D ausente: ${JSON.stringify(r.poster)}`)
        // A ficha técnica inteira aparece na rolagem sobre o pôster (cada legenda legível e na tela);
        // a régua, que depende da projeção do 3D, não fica solta.
        r.legendas = new Set()
        for (const f of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
          await irPara(p, '.percurso-cadeira', f * 0.6)
          await esperar(900)
          const vis = await p.evaluate(() => [...document.querySelectorAll('#cadeira li[data-legenda]')]
            .filter((l) => { const s = getComputedStyle(l), b = l.getBoundingClientRect(); return s.visibility === 'visible' && Number(s.opacity) > 0.9 && b.top >= 56 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth })
            .map((l) => l.dataset.legenda))
          vis.forEach((v) => r.legendas.add(v))
        }
        r.legendas = [...r.legendas]
        r.reguaOpacidade = await p.evaluate(() => getComputedStyle(document.querySelector('[data-regua]').parentElement).opacity)
        assert.equal(r.legendas.length, 4, `nem todas as legendas aparecem sobre o pôster: ${r.legendas}`)
        assert.equal(Number(r.reguaOpacidade), 0, 'régua sem 3D visível')
      } else {
        await p.evaluate(() => document.querySelector('#degrade').scrollIntoView({ behavior: 'instant' }))
        await esperar(1200)
        r.textos = await p.evaluate(() => {
          const ol = document.querySelector('ol[aria-label="Marcas do degradê"]')
          const itens = [...ol.querySelectorAll('li')]
          return {
            medidasVisiveis: itens.filter((l) => { const b = l.getBoundingClientRect(); return b.height > 20 && b.width > 100 && getComputedStyle(l).visibility === 'visible' }).length,
            listaRecortada: getComputedStyle(ol).position === 'absolute' || getComputedStyle(ol).clip !== 'auto',
            posicao: getComputedStyle(document.querySelector('#degrade')).position,
            percurso: !!document.querySelector('.percurso-degrade'),
            fotoQuebradaNaTela: [...document.querySelectorAll('#degrade img')].some((i) => i.getBoundingClientRect().height > 0),
          }
        })
        assert(r.textos.medidasVisiveis === 3 && !r.textos.listaRecortada, `medidas não visíveis sem a foto: ${JSON.stringify(r.textos)}`)
        assert(r.textos.posicao !== 'sticky' && !r.textos.percurso && !r.textos.fotoQuebradaNaTela, `degradê preso ou com foto quebrada: ${JSON.stringify(r.textos)}`)
      }
      assert(await semLateral(p))
      const naoEsperados = erros.filter((e) => !/^(pageerror: )?.*(net::|Failed to fetch|Could not load|fetch|\.glb|\.hdr|\/img\/)/i.test(e) || /TypeError|ReferenceError/.test(e))
      r.erros = erros
      assert.deepEqual(naoEsperados, [], `erro inesperado: ${naoEsperados.join(' | ')}`)
      await p.screenshot({ path: path.join(saida, `${largura}-${m.caso}.jpg`), type: 'jpeg', quality: 80 })
      r.aprovado = true
      await p.close()
    }
  }
  resultado.aprovado = true
} catch (e) {
  resultado.erro = e.stack
  process.exitCode = 1
} finally {
  await browser.close()
  fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify({ aprovado: resultado.aprovado, cenarios: resultado.cenarios.map((c) => `${c.caso}-${c.largura}:${c.aprovado ? 'ok' : 'falhou'}`), erro: resultado.erro?.split('\n')[0] }))
}
