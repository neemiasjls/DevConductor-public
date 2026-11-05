// Comportamento real do Lúmen Salão (modelo: pilotos/prova-design/ferramentas/verificar-critica.mjs).
// Uso (de dentro do site, com o preview no ar): node ferramentas/comportamento.mjs <pasta-nova> [url]
// Casos, em 390 e 1440: pausa/retomada do reflexo e parada fora da tela; fio como seção de leitura (não presa, menos
// de 1,6 tela, moldura aberta uma vez, foto e 3 textos visíveis); teclado e toque (arrastar o dedo rola); troca dinâmica
// de movimento reduzido com foco num elemento perto do fio e no meio de uma cena (sem transformações nem tweens
// sobrando, textos e moldura do fio abertos); mídia indisponível (fotos do fio e do resultado com substituto visível,
// cena do resultado liberada, WebGL); chegada real ao rodapé e volta ao topo pela roda; telas baixas (360–414) no
// resultado. Grava resultado.json e prints.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'

const saida = path.resolve(process.argv[2] || '')
const url = process.argv[3] || 'http://127.0.0.1:5202/'
if (!process.argv[2] || fs.existsSync(saida)) throw Error('Use uma pasta nova')
fs.mkdirSync(saida, { recursive: true })
const nav = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const browser = await puppeteer.launch({ executablePath: nav, headless: true, userDataDir: path.join(saida, '.perfil'),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const resultado = { data: new Date().toISOString(), url, cenarios: [], aprovado: false }

async function abrir(largura, { bloquear = [], semWebGL = false, altura } = {}) {
  const p = await browser.newPage(), erros = [], bloqueados = []
  p.on('pageerror', (e) => erros.push(e.message))
  p.on('response', (r) => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`) })
  if (bloquear.length) {
    await p.setRequestInterception(true)
    p.on('request', (r) => {
      if (bloquear.some((b) => r.url().includes(b))) { bloqueados.push(r.url()); r.abort('blockedbyclient') } else r.continue()
    })
  }
  if (semWebGL) await p.evaluateOnNewDocument(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) { return /webgl/.test(tipo) ? null : original.call(this, tipo, ...resto) }
  })
  await p.setViewport({ width: largura, height: altura ?? (largura < 700 ? 844 : 900), isMobile: largura < 700, hasTouch: largura < 700 })
  await p.goto(url, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.fonts.ready)
  await esperar(1500)
  return { p, erros, bloqueados }
}
const irPara = (p, sel, f = 0) => p.evaluate((sel, f) => {
  const e = document.querySelector(sel)
  window.scrollTo({ top: e.getBoundingClientRect().top + scrollY + f * e.offsetHeight, behavior: 'instant' })
}, sel, f)
const naTela = (p) => p.evaluate(() => {
  const e = document.activeElement, r = e.getBoundingClientRect()
  return { texto: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 40), x: r.x, y: r.y, direita: r.right, baixo: r.bottom, largura: innerWidth, altura: innerHeight }
})
const dentro = (r) => r.x >= -1 && r.direita <= r.largura + 1 && r.y >= -1 && r.baixo <= r.altura + 1
const luz = (p) => p.$eval('[data-abertura-foto]', (e) => ({ luz: e.dataset.luz, rodando: e.dataset.rodando, estado: e.dataset.reflexo }))
// O elemento focado (o marcado com data-teste-foco) está de fato visível: o ponto do meio dele, na tela, é ele mesmo.
const focoDescoberto = (p) => p.evaluate(() => {
  const e = document.activeElement, r = e.getBoundingClientRect()
  const ponto = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return { alvo: e.matches('[data-teste-foco]'), descoberto: !!ponto && e.contains(ponto), visivel: e.matches(':focus-visible'),
    naTela: r.top >= -1 && r.bottom <= innerHeight + 1 && r.width > 0, contorno: getComputedStyle(e).outlineStyle, y: Math.round(r.top), altura: innerHeight }
})
// Dedo arrastado de verdade (eventos de toque do CDP): sentido -1 rola para baixo, 1 para cima. O gesto sintético
// de rolagem (synthesizeScrollGesture) não rola no Chrome headless; touchStart/Move/End rolam.
const arrastar = async (cdp, x, y, sentido) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let k = 1; k <= 14; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + sentido * k * 30 }] }); await esperar(16) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await esperar(250)
}
const tecla = async (p, nome, shift = false) => { if (shift) await p.keyboard.down('Shift'); await p.keyboard.press(nome); if (shift) await p.keyboard.up('Shift') }
// Estilos inline de transformação que sobraram nas seções animadas (no reduzido, nada deve ficar).
const sobras = (p) => p.evaluate(() => [...document.querySelectorAll('main [style], #inicio [style]')]
  .filter((e) => e.style.transform && e.style.transform !== 'none')
  .map((e) => `${e.tagName.toLowerCase()}${Object.keys(e.dataset).map((k) => '[' + k + ']').join('')} ${e.getAttribute('style')}`.slice(0, 120)))
const retrato = (p) => p.evaluate(() => [...document.querySelectorAll('main [style], #inicio [style]')].map((e) => e.getAttribute('style')).join('|'))

try {
  for (const largura of [390, 1440]) {
    const c = { largura }
    resultado.cenarios.push(c)
    const { p, erros } = await abrir(largura)

    // 1. Reflexo: roda, pausa (congela), retoma, para fora da tela e volta.
    await p.waitForFunction(() => document.querySelector('[data-abertura-foto]')?.dataset.rodando === 'true', { timeout: 15000 })
    const a = await luz(p); await esperar(900); const b = await luz(p)
    assert.notEqual(a.luz, b.luz, 'Reflexo não anda')
    await p.click('[data-pausa]')
    await esperar(300)
    assert.equal(await p.$eval('[data-pausa]', (e) => e.getAttribute('aria-pressed')), 'true')
    const congelada = await luz(p); await esperar(2000)
    assert.deepEqual(await luz(p), congelada, 'Pausa não congelou o reflexo')
    assert.equal(congelada.rodando, 'false')
    await p.click('[data-pausa]')
    await esperar(1200)
    assert.notEqual((await luz(p)).luz, congelada.luz, 'Reflexo não retomou')
    await irPara(p, '#diagnostico', 0.6)
    await esperar(800)
    const fora = await luz(p); await esperar(1500)
    assert.equal(fora.rodando, 'false', 'Reflexo continua rodando fora da tela')
    assert.deepEqual(await luz(p), fora)
    c.reflexo = { andou: [a.luz, b.luz], pausado: congelada, fora }

    // 2. Fio (seção de leitura, LP-12): não presa, a moldura abre uma vez, foto e textos visíveis. Teclado geral: o
    // primeiro Tab leva ao atalho para o conteúdo.
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await esperar(500)
    // foco volta ao começo do documento (o clique na pausa deixou o foco no botão)
    await p.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); document.body.removeAttribute('tabindex') })
    await p.keyboard.press('Tab')
    assert.equal(await p.evaluate(() => document.activeElement.getAttribute('href')), '#conteudo')
    await irPara(p, '#fio', 0)
    await esperar(2000)
    c.fio = await p.evaluate(() => {
      const f = document.querySelector('#fio'), img = f.querySelector('img'), ir = img.getBoundingClientRect()
      const cp = getComputedStyle(f.querySelector('[data-moldura]')).clipPath
      return { posicao: getComputedStyle(f).position, telas: +(f.offsetHeight / innerHeight).toFixed(2), clipPath: cp,
        aberto: cp === 'none' || (cp.match(/-?[\d.]+/g) || []).every((n) => parseFloat(n) === 0),
        naturalWidth: img.naturalWidth, imgVisivel: ir.width > 50 && ir.height > 50 && getComputedStyle(img).visibility !== 'hidden' && Number(getComputedStyle(img).opacity) > 0.99,
        textos: [...f.querySelectorAll('[data-texto]')].map((e) => Number(getComputedStyle(e).opacity)) }
    })
    assert.notEqual(c.fio.posicao, 'sticky', 'Fio continua preso'); assert(c.fio.telas < 1.6, `Fio longo demais: ${c.fio.telas} telas`)
    assert(c.fio.aberto, `Moldura do fio não abriu: ${c.fio.clipPath}`)
    assert(c.fio.naturalWidth > 0 && c.fio.imgVisivel, `Foto do fio não aparece: ${JSON.stringify(c.fio)}`)
    assert(c.fio.textos.length === 3 && c.fio.textos.every((o) => o === 1), `Textos do fio não estão visíveis: ${c.fio.textos}`)
    await p.screenshot({ path: path.join(saida, `${largura}-fio.jpg`), type: 'jpeg', quality: 80 })

    if (largura < 700) {
      // 2b. Toque: arrastar o dedo rola a página (gesto de toque real, sem roda).
      const cdp = await p.createCDPSession()
      await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      await esperar(500)
      const antes = await p.evaluate(() => scrollY)
      for (let i = 0; i < 6; i++) await arrastar(cdp, 195, 640, -1)
      await esperar(1200)
      const depois = await p.evaluate(() => scrollY)
      c.toque = { rolou: depois - antes }
      assert(depois - antes > 1500, `Toque não rolou a página: ${depois - antes}px`)
      for (let i = 0; i < 40 && (await p.evaluate(() => scrollY)) > 2; i++) await arrastar(cdp, 195, 200, 1)
      await esperar(1200)
      c.toque.voltou = await p.evaluate(() => scrollY)
      assert(c.toque.voltou < 50, `Toque não voltou ao topo: ${c.toque.voltou}`)
      await cdp.detach()
    }

    // 3. Rolagem até o fim (rodapé) e de volta ao topo só com a roda (passa pelo Lenis): cenas reconstituídas.
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await esperar(600)
    await p.mouse.move(largura / 2, 400)
    c.percurso = {}
    for (const sentido of [1, -1]) {
      let i = 0
      const chegou = () => p.evaluate((s) => s > 0 ? scrollY + innerHeight >= document.documentElement.scrollHeight - 4 : scrollY <= 2, sentido)
      while (!(await chegou()) && i++ < 200) { await p.mouse.wheel({ deltaY: sentido * 420 }); await esperar(45) }
      await esperar(1200)
      assert(await chegou(), `Roda não chegou ${sentido > 0 ? 'ao rodapé' : 'ao topo'}`)
      if (sentido > 0) {
        c.percurso.rodape = await p.$eval('footer', (e) => { const r = e.getBoundingClientRect(); return { topo: Math.round(r.top), baixo: Math.round(r.bottom), altura: innerHeight } })
        assert(c.percurso.rodape.baixo <= c.percurso.rodape.altura + 2 && c.percurso.rodape.topo < c.percurso.rodape.altura, 'Rodapé não está na tela no fim')
        await p.screenshot({ path: path.join(saida, `${largura}-rodape.jpg`), type: 'jpeg', quality: 80 })
      }
      c.percurso[sentido > 0 ? 'passosDescida' : 'passosSubida'] = i
    }
    assert.equal((await luz(p)).rodando, 'true', 'Reflexo não voltou ao topo')
    c.idaVolta = true
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Rolagem lateral')

    // 4. Troca dinâmica de movimento reduzido, com o foco num elemento focável perto do fio: o foco continua nele,
    // nada fica transformado nem animando; depois, no meio da cena do resultado (scrub ativo).
    await irPara(p, '#fio', 1)
    await esperar(700)
    c.focoAlvo = await p.evaluate(() => {
      const fio = document.querySelector('#fio')
      const e = [...document.querySelectorAll('a[href], button')].find((x) => x.offsetParent && fio.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING && !fio.contains(x))
      e.setAttribute('data-teste-foco', '')
      return e.outerHTML.slice(0, 80)
    })
    await p.keyboard.press('Shift') // a modalidade de teclado faz o foco por script contar como :focus-visible
    await p.$eval('[data-teste-foco]', (e) => e.focus())
    await esperar(600)
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await esperar(900)
    c.reduzidoFoco = await focoDescoberto(p)
    assert(c.reduzidoFoco.alvo, `Foco perdido na troca para reduzido: ${JSON.stringify(c.reduzidoFoco)}`)
    assert(c.reduzidoFoco.descoberto && c.reduzidoFoco.naTela, `Foco sem visibilidade no reduzido: ${JSON.stringify(c.reduzidoFoco)}`)
    c.sobrasFio = await sobras(p)
    assert.deepEqual(c.sobrasFio, [], 'Transformações sobrando no reduzido')
    const r1 = await retrato(p); await esperar(700)
    assert.equal(await retrato(p), r1, 'Algo continua animando no reduzido')
    // volta com o foco no mesmo elemento: continua nele e visível
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    await esperar(1500)
    c.voltaFoco = await focoDescoberto(p)
    assert(c.voltaFoco.alvo, `Foco perdido na volta do reduzido: ${JSON.stringify(c.voltaFoco)}`)
    assert(c.voltaFoco.descoberto && c.voltaFoco.naTela, 'Elemento focado coberto ou fora da tela na volta do reduzido')
    // no meio da cena do resultado, com a roda andando
    await irPara(p, '#resultado', 0.25)
    await esperar(500)
    for (let i = 0; i < 4; i++) { await p.mouse.wheel({ deltaY: 300 }); await esperar(30) }
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await esperar(900)
    c.sobrasResultado = await sobras(p)
    assert.deepEqual(c.sobrasResultado, [], 'Transformações sobrando ao trocar no meio do resultado')
    const r2 = await retrato(p); await esperar(700)
    assert.equal(await retrato(p), r2, 'Algo continua animando depois da troca no meio da cena')
    c.reduzido = await p.evaluate(() => ({
      canvas: !!document.querySelector('[data-reflexo-canvas]'), reflexo: document.querySelector('[data-abertura-foto]').dataset.reflexo,
      lenis: document.documentElement.classList.contains('lenis'), alturaFio: document.querySelector('#fio').offsetHeight / innerHeight,
      textosVisiveis: [...document.querySelectorAll('#fio [data-texto]')].filter((e) => e.offsetHeight > 0 && getComputedStyle(e).visibility !== 'hidden' && Number(getComputedStyle(e).opacity) > 0.99).length,
      molduraAberta: (() => { const cp = getComputedStyle(document.querySelector('#fio [data-moldura]')).clipPath; return cp === 'none' || (cp.match(/-?[\d.]+/g) || []).every((n) => parseFloat(n) === 0) })(),
      cronogramaApagado: [...document.querySelectorAll('[data-lavagem]')].filter((e) => getComputedStyle(e).opacity !== '1').length,
    }))
    assert.equal(c.reduzido.canvas, false); assert.equal(c.reduzido.reflexo, 'estatico'); assert.equal(c.reduzido.lenis, false)
    assert(c.reduzido.alturaFio < 2, 'Fio continua preso no reduzido'); assert.equal(c.reduzido.textosVisiveis, 3, 'Textos do fio escondidos no reduzido')
    assert(c.reduzido.molduraAberta, 'Moldura do fio fechada no reduzido')
    assert.equal(c.reduzido.cronogramaApagado, 0)
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await esperar(400)
    await p.screenshot({ path: path.join(saida, `${largura}-reduzido.jpg`), type: 'jpeg', quality: 80 })
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    await p.waitForFunction(() => document.querySelector('[data-abertura-foto]').dataset.rodando === 'true', { timeout: 15000 })
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('lenis')), true, 'Lenis não voltou')
    await irPara(p, '#fio', 0.2)
    await esperar(600)
    c.voltouDoReduzido = true
    assert.deepEqual(erros, [])
    await p.close()

    // 5. Mídia indisponível: fotos do fio e do resultado bloqueadas, WebGL desligado.
    const m = await abrir(largura, { bloquear: ['/img/nutricao-', '/img/resultado-'], semWebGL: true })
    await esperar(800)
    c.semMidia = await m.p.evaluate(() => ({ reflexo: document.querySelector('[data-abertura-foto]').dataset.reflexo, pausa: !!document.querySelector('[data-pausa]') }))
    assert.equal(c.semMidia.reflexo, 'estatico'); assert.equal(c.semMidia.pausa, false)
    // a foto do fio falha: substituto visível dentro da moldura
    await irPara(m.p, '#fio', 0)
    await m.p.waitForFunction(() => document.querySelector('#fio img')?.dataset.substituto === 'true', { timeout: 10000 })
    await esperar(1800)
    c.semMidia.fio = await m.p.$eval('#fio img', (e) => {
      const r = e.getBoundingClientRect()
      return { alt: e.alt.length, substituto: e.currentSrc.startsWith('data:image/svg'), carregou: e.complete && e.naturalWidth > 0, visivel: r.width > 50 && r.height > 50 && r.bottom > 0 && r.top < innerHeight }
    })
    assert(c.semMidia.fio.alt > 20 && c.semMidia.fio.substituto && c.semMidia.fio.carregou && c.semMidia.fio.visivel, `Fio sem substituto visível: ${JSON.stringify(c.semMidia.fio)}`)
    // a foto do resultado falha antes de a cena chegar: substituto visível e a cena deixa de prender
    await irPara(m.p, '#cronograma', 0)
    for (let i = 0; i < 12 && !(await m.p.$eval('#resultado img', (e) => e.dataset.substituto === 'true')); i++) {
      await m.p.evaluate(() => scrollBy({ top: innerHeight * 0.3, behavior: 'instant' })); await esperar(500)
    }
    c.semMidia.liberada = await m.p.$eval('#resultado', (e) => ({ liberada: e.dataset.liberada === 'true', telas: +(e.offsetHeight / innerHeight).toFixed(2) }))
    assert(c.semMidia.liberada.liberada && c.semMidia.liberada.telas <= 1.05, `Cena do resultado continua presa sem foto: ${JSON.stringify(c.semMidia.liberada)}`)
    await irPara(m.p, '#resultado', 0)
    await esperar(1000)
    c.semMidia.resultado = await m.p.$eval('#resultado img', (e) => {
      const r = e.getBoundingClientRect()
      return { alt: e.alt.length, substituto: e.currentSrc.startsWith('data:image/svg'), carregou: e.complete && e.naturalWidth > 0, visivel: r.width > 50 && r.height > 50 && r.bottom > 0 && r.top < innerHeight }
    })
    assert(c.semMidia.resultado.alt > 20 && c.semMidia.resultado.substituto && c.semMidia.resultado.carregou && c.semMidia.resultado.visivel, `Sem substituto visível: ${JSON.stringify(c.semMidia.resultado)}`)
    c.semMidia.bloqueados = m.bloqueados.length
    assert(m.bloqueados.length >= 2, 'Bloqueio não aconteceu')
    // falhas de rede provocadas não contam; erro de JS conta
    assert.deepEqual(m.erros.filter((e) => !/^\d{3} /.test(e)), [])
    await m.p.screenshot({ path: path.join(saida, `${largura}-sem-midia.jpg`), type: 'jpeg', quality: 80 })
    await m.p.close()
    c.aprovado = true
  }
  // 6. Telas baixas (360–414 de largura): no meio do fio e do resultado, nada importante cortado pelo palco
  // (overflow: hidden) nem fora da tela.
  resultado.baixas = []
  for (const [largura, altura] of [[360, 640], [375, 667], [414, 736]]) {
    const { p, erros } = await abrir(largura, { altura })
    const medidas = {}
    for (const [sel, f, pecas] of [['#resultado', 0.5, ['h2', 'h2 + p', '[data-janela]']]]) {
      await irPara(p, sel, f)
      await esperar(1500)
      medidas[sel] = await p.evaluate((sel, pecas) => {
        const palco = document.querySelector(sel + ' .palco').getBoundingClientRect()
        return pecas.map((q) => {
          const lista = [...document.querySelectorAll(sel + ' ' + q)]
          const e = q === '[data-etapa-texto]' ? lista.find((x) => getComputedStyle(x).visibility !== 'hidden' && Number(getComputedStyle(x).opacity) > 0.5) : lista[0]
          if (!e) return { q, ok: false, falta: true }
          const r = e.getBoundingClientRect()
          const ok = r.top >= palco.top - 1 && r.bottom <= Math.min(palco.bottom, innerHeight) + 1 && r.left >= -1 && r.right <= innerWidth + 1 && r.height > 0
          return { q, ok, topo: Math.round(r.top), baixo: Math.round(r.bottom), palco: Math.round(palco.bottom) }
        })
      }, sel, pecas)
      await p.screenshot({ path: path.join(saida, `${largura}x${altura}-${sel.slice(1)}.jpg`), type: 'jpeg', quality: 80 })
    }
    resultado.baixas.push({ largura, altura, medidas })
    for (const [sel, lista] of Object.entries(medidas)) for (const m of lista) assert(m.ok, `${largura}x${altura} ${sel} ${m.q} cortado: ${JSON.stringify(m)}`)
    assert.deepEqual(erros, [])
    await p.close()
  }
  resultado.aprovado = true
} catch (e) { resultado.erro = e.stack; process.exitCode = 1 }
finally {
  await browser.close()
  fs.rmSync(path.join(saida, '.perfil'), { recursive: true, force: true })
  fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify({ aprovado: resultado.aprovado, cenarios: resultado.cenarios.length, erro: resultado.erro?.split('\n').slice(0, 3).join(' | ') }))
}
