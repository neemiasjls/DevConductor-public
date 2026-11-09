// Comportamento real da Austral Frio (modelo: pilotos/prova-design/ferramentas/verificar-critica.mjs).
// Uso (da pasta do site, preview rodando na 5201): node ferramentas/comportamento.mjs <pasta-nova> [url]
// Casos, em 360×640, 390×844, 414×736 (toque) e 1440×900 (mouse):
//  - teclado natural: do controle anterior entra na cena da viagem com Tab, atravessa os 5 marcos, sai para as
//    faixas e volta com Shift+Tab até o controle anterior (marco na tela, foco visível, hora sincronizada);
//  - pausa/retomada do registrador e parada fora da tela;
//  - percurso real até o fim e de volta (roda no computador, gesto de toque no celular), sem rolagem lateral;
//  - geada: cursor/toque limpa a foto (comparação de imagem com controle sem interação);
//  - movimento reduzido ligado e desligado DENTRO de cada cena (porta, viagem, faixas durante a invasão de cor,
//    doca), conferindo geometria e conteúdo nos dois sentidos;
//  - troca de largura celular ↔ computador com o gráfico da viagem reconfigurado (só no 1440);
//  - mídia indisponível (fotos bloqueadas; WebGL ausente) com substituto e zero erro de JavaScript.
// Grava resultado.json e prints; código 1 em qualquer falha.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'

const saida = path.resolve(process.argv[2] || '')
const url = process.argv[3] || 'http://127.0.0.1:5201/'
if (!process.argv[2] || fs.existsSync(saida)) { console.error('Uso: node ferramentas/comportamento.mjs <pasta-nova> [url]'); process.exit(1) }
fs.mkdirSync(saida, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  userDataDir: path.join(saida, '.perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const resultado = { data: new Date().toISOString(), url, cenarios: [], aprovado: false }
const TELAS = [[360, 640], [390, 844], [414, 736], [1440, 900]]

async function abrir([largura, altura], { bloquear, semWebGL } = {}) {
  const p = await browser.newPage(), js = [], http = []
  p.on('pageerror', (e) => js.push(e.message))
  p.on('response', (r) => { if (r.status() >= 400) http.push(`${r.status()} ${r.url()}`) })
  const toque = largura < 700
  await p.setViewport({ width: largura, height: altura, isMobile: toque, hasTouch: toque })
  if (bloquear) {
    await p.setRequestInterception(true)
    p.on('request', (r) => (bloquear.test(r.url()) ? r.abort('failed') : r.continue()))
  }
  if (semWebGL) {
    await p.evaluateOnNewDocument(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
        return /webgl/i.test(tipo) ? null : original.call(this, tipo, ...resto)
      }
    })
  }
  await p.goto(url, { waitUntil: 'networkidle0' })
  await p.evaluate(() => document.fonts.ready)
  await esperar(1500)
  return { p, js, http, toque, cdp: await p.createCDPSession() }
}
const reduzir = (p, sim) => p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: sim ? 'reduce' : 'no-preference' }])
const semLateral = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
const rolarY = (p, y) => p.evaluate((t) => scrollTo({ top: t, behavior: 'instant' }), y)
const topo = (p, s) => p.$eval(s, (e) => e.getBoundingClientRect().top + scrollY)
const rolarPara = async (p, s, extra = 0) => rolarY(p, (await topo(p, s)) + extra)
const traco = (p) => p.$eval('header path[stroke]', (e) => e.getAttribute('d'))
const naTela = (r) => r.x >= -1 && r.direita <= r.largura + 1 && r.y >= -1 && r.baixo <= r.altura + 1
const focoAtual = (p) => p.evaluate(() => {
  const e = document.activeElement, b = e.getBoundingClientRect()
  const marco = e.closest('li[data-marco]')
  return { marco: marco ? Number(marco.dataset.marco) : null, hora: marco ? Number(marco.querySelector('.rotulo').textContent.split(' ')[0]) : null,
    mostrada: document.querySelector('[data-hora]').textContent, visivel: e.matches(':focus-visible'),
    estilo: getComputedStyle(e).outlineStyle, rotulo: e.getAttribute('aria-pressed') !== null ? e.textContent.trim().slice(0, 30) : e.textContent.trim().slice(0, 30),
    x: b.x, y: b.y, direita: b.right, baixo: b.bottom, largura: innerWidth, altura: innerHeight }
})
const shiftTab = async (p) => { await p.keyboard.down('Shift'); await p.keyboard.press('Tab'); await p.keyboard.up('Shift') }
const estadoViagem = (p) => p.evaluate(() => ({
  hora: document.querySelector('[data-hora]').textContent,
  tracos: [...document.querySelectorAll('[data-traco]')].map((t) => ({ total: Number(t.dataset.total), offset: parseFloat(t.style.strokeDashoffset) })),
  grafico: getComputedStyle(document.querySelector('[data-viagem-grafico]')).transform,
  acesos: [...document.querySelectorAll('li[data-marco]')].filter((e) => e.dataset.aceso === 'true').length,
}))
// Arraste de dedo real (touchStart → touchMove → touchEnd); o gesto sintético do CDP não rola no headless.
async function arrastar(p, largura, altura, sentido) {
  const x = Math.round(largura / 2), de = Math.round(altura * (sentido > 0 ? 0.8 : 0.25)), ate = Math.round(altura * (sentido > 0 ? 0.25 : 0.8))
  await p.touchscreen.touchStart(x, de)
  const passos = 14
  for (let i = 1; i <= passos; i++) await p.touchscreen.touchMove(x, Math.round(de + ((ate - de) * i) / passos))
  await p.touchscreen.touchEnd()
  await esperar(260)
}
const escalaX = (t) => (t === 'none' ? 1 : Number(t.match(/matrix\(([^,]+)/)?.[1] ?? 1))

try {
  for (const tela of TELAS) {
    const [largura, altura] = tela
    const { p, js, http, toque, cdp } = await abrir(tela)
    const c = { largura, altura, toque }
    resultado.cenarios.push(c)

    // 1. Teclado natural: atalho no primeiro Tab; do botão de pausa (controle anterior) entra na viagem.
    await p.keyboard.press('Tab')
    assert.equal(await p.evaluate(() => document.activeElement.getAttribute('href')), '#conteudo', 'Primeiro Tab não é o atalho')
    await p.focus('header button[aria-pressed]')
    c.teclado = []
    for (let i = 0; i < 5; i++) {
      await p.keyboard.press('Tab'); await esperar(550)
      const f = await focoAtual(p)
      c.teclado.push({ tecla: 'Tab', ...f })
      assert.equal(f.marco, i, `Tab ${i + 1} não chegou ao marco ${i}: ${JSON.stringify(f)}`)
      assert(naTela(f) && f.visivel && f.estilo !== 'none', `Marco ${i} fora da tela ou sem foco visível: ${JSON.stringify(f)}`)
      assert.equal(f.mostrada, `${f.hora} h`, `Hora não sincronizou no marco ${i}: ${JSON.stringify(f)}`)
    }
    await p.keyboard.press('Tab'); await esperar(550)
    const saiu = await focoAtual(p)
    c.teclado.push({ tecla: 'Tab (sai)', ...saiu })
    assert(saiu.marco === null && (await p.evaluate(() => !!document.activeElement.closest('#faixas'))), 'Tab depois do último marco não saiu para as faixas')
    assert(naTela(saiu) && saiu.visivel, 'Saída da cena sem foco visível na tela')
    for (let i = 4; i >= 0; i--) {
      await shiftTab(p); await esperar(550)
      const f = await focoAtual(p)
      c.teclado.push({ tecla: 'Shift+Tab', ...f })
      assert.equal(f.marco, i, `Shift+Tab não voltou ao marco ${i}: ${JSON.stringify(f)}`)
      assert(naTela(f) && f.visivel, `Volta: marco ${i} fora da tela ou sem foco visível`)
      assert.equal(f.mostrada, `${f.hora} h`, `Volta: hora não sincronizou no marco ${i}`)
    }
    await shiftTab(p); await esperar(550)
    const voltou = await p.evaluate(() => document.activeElement.matches('header button[aria-pressed]'))
    assert(voltou, 'Shift+Tab do primeiro marco não voltou ao controle anterior')
    c.tecladoCompleto = true

    // 2. Pausa/retomada e parada fora da tela.
    await rolarY(p, 0); await esperar(600)
    const a1 = await traco(p); await esperar(1200)
    assert.notEqual(await traco(p), a1, 'Registrador não anda na tela')
    await p.click('header button[aria-pressed]')
    const pausado = await traco(p); await esperar(2000)
    assert.equal(await traco(p), pausado, 'Pausa não parou o registrador')
    await p.click('header button[aria-pressed]'); await esperar(1500)
    assert.notEqual(await traco(p), pausado, 'Registrador não retomou')
    await rolarPara(p, '#compromisso'); await esperar(700)
    const fora = await traco(p); await esperar(1500)
    assert.equal(await traco(p), fora, 'Registrador anda fora da tela')
    c.pausa = true

    // 3. Geada: cursor (computador) ou toque segurado (celular) limpa um círculo. Controle: sem interação não muda.
    await rolarPara(p, '#porta'); await esperar(1400)
    assert.equal(await p.$eval('canvas[data-geada]', (e) => getComputedStyle(e).opacity), '1', 'Geada não apareceu')
    const ponto = { x: Math.round(largura * 0.5), y: Math.round(altura * 0.22) }
    // Tela inteira, sem captura além da janela (o recorte por `clip` do puppeteer usa coordenadas da página e rola).
    const foto = () => p.screenshot({ captureBeyondViewport: false })
    const yAntes = await p.evaluate(() => scrollY)
    const g0 = await foto(); await esperar(500)
    const g1 = await foto()
    assert(g0.equals(g1), 'Geada muda sem interação (controle)')
    if (toque) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ponto.x, y: ponto.y }] })
    else await p.mouse.move(ponto.x, ponto.y, { steps: 4 })
    await esperar(900)
    const g2 = await foto()
    assert.equal(await p.evaluate(() => scrollY), yAntes, 'O toque/cursor rolou a página')
    await p.screenshot({ path: path.join(saida, `${largura}-geada-limpa.jpg`), type: 'jpeg', quality: 80 })
    if (toque) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    else await p.mouse.move(2, altura - 2)
    assert(!g2.equals(g1), 'Cursor/toque não limpou a geada')
    await esperar(1200)
    c.geadaInterativa = true

    // 4. Percurso até o fim e de volta: roda (mouse) ou gesto de toque, sem rolagem lateral.
    await rolarY(p, 0); await esperar(500)
    c.lateral = []
    const fim = () => p.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 4)
    for (let i = 0; i < 300 && !(await fim()); i++) {
      if (toque) await arrastar(p, largura, altura, 1)
      else { await p.mouse.wheel({ deltaY: 300 }); await esperar(35) }
      if (i % 6 === 0) c.lateral.push(await semLateral(p))
    }
    await esperar(800)
    assert(await fim(), 'Não chegou ao fim da página')
    await p.screenshot({ path: path.join(saida, `${largura}-fim.jpg`), type: 'jpeg', quality: 80 })
    await esperar(600)
    for (let i = 0; i < 300 && (await p.evaluate(() => scrollY > 0)); i++) {
      if (toque) await arrastar(p, largura, altura, -1)
      else { await p.mouse.wheel({ deltaY: -300 }); await esperar(35) }
    }
    await esperar(1000)
    assert(await p.evaluate(() => scrollY <= 1), 'Não voltou ao topo')
    assert.equal(await p.$eval('[data-hora]', (e) => e.textContent), '0 h', 'Viagem não voltou ao início')
    const t1 = await traco(p); await esperar(1200)
    assert.notEqual(await traco(p), t1, 'Registrador parado depois do percurso')
    assert(c.lateral.every(Boolean) && (await semLateral(p)), 'Rolagem lateral durante o percurso')
    c.percurso = { gesto: toque ? 'toque' : 'roda', telas: +((await p.evaluate(() => document.documentElement.scrollHeight)) / altura).toFixed(1) }

    // 5. Reduzido ligado/desligado dentro de cada cena.
    c.reduzidoPorCena = {}
    // 5a. Porta
    await rolarPara(p, '#porta', Math.round(altura * 0.3)); await esperar(900)
    await reduzir(p, true); await esperar(800)
    const pr = await p.evaluate(() => ({ canvas: !!document.querySelector('canvas[data-geada]'),
      palco: getComputedStyle(document.querySelector('#porta > .palco')).position,
      foto: document.querySelector('#porta img').getBoundingClientRect().height,
      lenis: document.documentElement.classList.contains('lenis') }))
    assert.deepEqual({ ...pr, foto: pr.foto > 200 }, { canvas: false, palco: 'relative', foto: true, lenis: false }, `Porta no reduzido: ${JSON.stringify(pr)}`)
    assert.equal(await p.$eval('[data-porta-texto]', (e) => e.textContent.includes('Toque a foto')), false, 'Reduzido oferece geada desativada')
    await reduzir(p, false); await esperar(900)
    await rolarPara(p, '#porta', Math.round(altura * 0.3)); await esperar(1400)
    const pv = await p.evaluate(() => ({ canvas: getComputedStyle(document.querySelector('canvas[data-geada]') || document.body).opacity,
      palco: getComputedStyle(document.querySelector('#porta > .palco')).position, lenis: document.documentElement.classList.contains('lenis') }))
    assert.deepEqual(pv, { canvas: '1', palco: 'sticky', lenis: true }, `Porta na volta: ${JSON.stringify(pv)}`)
    assert.equal(await p.$eval('[data-porta-texto]', (e) => e.textContent.includes('Toque a foto')), true, 'Geada ativa sem instrução')
    c.reduzidoPorCena.porta = { reduzido: pr, volta: pv }
    // 5b. Viagem (no meio do percurso preso)
    const cena = await p.$eval('#viagem .cena', (e) => ({ topo: e.getBoundingClientRect().top + scrollY, percurso: e.offsetHeight - innerHeight }))
    const meio = Math.round(cena.topo + cena.percurso * 0.42)
    await rolarY(p, meio); await esperar(900)
    const vAntes = await estadoViagem(p)
    await reduzir(p, true); await esperar(800)
    const vRed = await estadoViagem(p)
    assert.equal(vRed.hora, '36 h', 'Viagem no reduzido não mostra o registro inteiro')
    assert(vRed.tracos.every((t) => Number.isFinite(t.total) && t.total > 0 && Math.abs(t.offset) < 0.5), `Traço incompleto no reduzido: ${JSON.stringify(vRed.tracos)}`)
    assert(vRed.grafico === 'none' && vRed.acesos === 5, `Gráfico/marcos no reduzido: ${JSON.stringify(vRed)}`)
    await reduzir(p, false); await esperar(900)
    await rolarY(p, meio); await esperar(1100)
    const vVolta = await estadoViagem(p)
    assert(Math.abs(parseInt(vVolta.hora) - parseInt(vAntes.hora)) <= 1, `Viagem não reconstituiu a hora: ${vAntes.hora} → ${vVolta.hora}`)
    assert(vVolta.tracos.every((t) => Number.isFinite(t.offset) && t.offset > 1), `Traço não voltou a ser revelado: ${JSON.stringify(vVolta.tracos)}`)
    c.reduzidoPorCena.viagem = { antes: vAntes.hora, reduzido: vRed.hora, volta: vVolta.hora }
    // 5c. Faixas: reduzido no meio da invasão de cor
    await rolarPara(p, '#faixas', Math.round(altura * 0.15)); await esperar(800)
    const botao = await p.$('#faixas button[aria-pressed]:nth-of-type(3)')
    if (toque) await botao.tap(); else await botao.click()
    await esperar(150)
    const meioInvasao = await p.$eval('#faixas > div[aria-hidden]', (e) => getComputedStyle(e).transform).catch(() => null)
    await reduzir(p, true); await esperar(300)
    const fr = await p.evaluate(() => {
      const inv = document.querySelector('#faixas > div[aria-hidden]')
      return { fundo: getComputedStyle(document.querySelector('#faixas')).backgroundColor, invasor: getComputedStyle(inv).opacity,
        ficha: document.querySelector('#faixa-ficha').textContent.includes('15 a 25 °C'),
        itens: [...document.querySelectorAll('[data-ficha-item]')].every((e) => getComputedStyle(e).opacity === '1') }
    })
    assert(fr.fundo.includes('0.33 0.016 80') && fr.invasor === '0' && fr.ficha && fr.itens, `Faixas no reduzido durante a invasão: ${JSON.stringify(fr)}`)
    await reduzir(p, false); await esperar(600)
    c.reduzidoPorCena.faixas = { ...fr, meioInvasao }
    // 5d. Doca: janela parcialmente aberta → reduzido (sem transform) → volta (janela anima de novo)
    const doca = await p.$eval('#doca .cena', (e) => e.getBoundingClientRect().top + scrollY)
    await rolarY(p, Math.round(doca - altura * 0.45)); await esperar(1000)
    const dAntes = await p.$eval('[data-janela]', (e) => getComputedStyle(e).transform)
    assert(escalaX(dAntes) < 0.98, `Janela da doca já aberta antes do teste: ${dAntes}`)
    await reduzir(p, true); await esperar(600)
    const dr = await p.evaluate(() => {
      const j = document.querySelector('[data-janela]'), f = document.querySelector('[data-foto]'), fig = j.closest('figure')
      return { janela: getComputedStyle(j).transform, foto: f ? getComputedStyle(f).transform : 'none',
        larguraOk: Math.abs(j.getBoundingClientRect().width - (fig.clientWidth - parseFloat(getComputedStyle(fig).paddingLeft) - parseFloat(getComputedStyle(fig).paddingRight))) < 2 }
    })
    assert.deepEqual(dr, { janela: 'none', foto: 'none', larguraOk: true }, `Doca no reduzido: ${JSON.stringify(dr)}`)
    await reduzir(p, false); await esperar(800)
    await rolarY(p, Math.round(doca - altura * 0.45)); await esperar(1100)
    const dVolta = await p.$eval('[data-janela]', (e) => getComputedStyle(e).transform)
    assert(escalaX(dVolta) < 0.98, `Janela da doca não voltou a animar: ${dVolta}`)
    c.reduzidoPorCena.doca = { antes: dAntes, reduzido: dr, volta: dVolta }
    await p.screenshot({ path: path.join(saida, `${largura}-doca-volta.jpg`), type: 'jpeg', quality: 80 })

    // 5e. Página inteira no reduzido (estado final) e print.
    await reduzir(p, true); await esperar(800)
    const tudo = await p.evaluate(() => ({
      presa: [...document.querySelectorAll('.cena > .palco')].some((e) => getComputedStyle(e).position === 'sticky'),
      pausa: !!document.querySelector('header button[aria-pressed]'),
      palavras: [...document.querySelectorAll('[data-palavra]')].every((e) => +getComputedStyle(e).opacity > 0.99),
      cobre: getComputedStyle(document.querySelector('.cobre')).marginTop,
    }))
    assert.deepEqual(tudo, { presa: false, pausa: false, palavras: true, cobre: '0px' }, `Reduzido global: ${JSON.stringify(tudo)}`)
    assert(await semLateral(p), 'Rolagem lateral no reduzido')
    await rolarY(p, 0); await esperar(300)
    await p.screenshot({ path: path.join(saida, `${largura}-reduzido.jpg`), type: 'jpeg', quality: 80 })
    await reduzir(p, false); await esperar(800)

    // 6. Troca de largura (computador ↔ celular) reconfigura o gráfico da viagem.
    if (!toque) {
      c.trocaLargura = []
      for (const [w, h, movel] of [[390, 844, true], [1440, 900, false]]) {
        await p.setViewport({ width: w, height: h, isMobile: movel, hasTouch: movel }); await esperar(900)
        const cn = await p.$eval('#viagem .cena', (e) => ({ topo: e.getBoundingClientRect().top + scrollY, percurso: e.offsetHeight - innerHeight }))
        await rolarY(p, Math.round(cn.topo + cn.percurso * 0.3)); await esperar(1000)
        const v = await estadoViagem(p)
        c.trocaLargura.push({ largura: w, ...v })
        assert(v.tracos.length === 1 && v.tracos.every((t) => Number.isFinite(t.total) && t.total > 0 && Number.isFinite(t.offset) && t.offset > 1),
          `Gráfico sem configuração depois da troca para ${w}: ${JSON.stringify(v)}`)
        assert(parseInt(v.hora) > 0 && parseInt(v.hora) < 36, `Hora fora do meio depois da troca para ${w}: ${v.hora}`)
      }
    }
    assert.deepEqual(js, [], `Erros de JavaScript: ${js.join(' | ')}`)
    assert.deepEqual(http, [], `Respostas com erro: ${http.join(' | ')}`)
    await p.close()

    // 7. Mídia indisponível: fotos bloqueadas (só essas requisições falham; zero erro de JavaScript).
    {
      const { p: q, js: j2 } = await abrir(tela, { bloquear: /\/img\/(camara-fria|trailer-doca|trailer-largo)-/ })
      for (const s of ['#porta', '#doca', '#cotar']) { await rolarPara(q, s, -200); await esperar(700); await rolarPara(q, s, 200); await esperar(500) }
      c.fotoBloqueada = await q.evaluate(() => ({
        avisos: [...document.querySelectorAll('p')].filter((e) => e.textContent.startsWith('Foto indisponível')).length,
        geada: !!document.querySelector('canvas[data-geada]'),
      }))
      assert(c.fotoBloqueada.avisos >= 3 && !c.fotoBloqueada.geada, `Substituto da foto ausente: ${JSON.stringify(c.fotoBloqueada)}`)
      assert.deepEqual(j2, [], `Erro JS sem foto: ${j2.join(' | ')}`)
      await q.screenshot({ path: path.join(saida, `${largura}-sem-foto.jpg`), type: 'jpeg', quality: 80 })
      await q.close()
    }
    // 7b. WebGL indisponível: foto nítida, sem canvas.
    {
      const { p: q, js: j3, http: h3 } = await abrir(tela, { semWebGL: true })
      await rolarPara(q, '#porta'); await esperar(1000)
      c.semWebGL = await q.evaluate(() => ({
        geada: !!document.querySelector('canvas[data-geada]'),
        foto: (() => { const i = document.querySelector('#porta img'); return !!i && i.complete && i.naturalWidth > 0 })(),
      }))
      assert.deepEqual(c.semWebGL, { geada: false, foto: true }, `Sem WebGL: ${JSON.stringify(c.semWebGL)}`)
      assert.equal(await q.$eval('[data-porta-texto]', (e) => e.textContent.includes('Toque a foto')), false, 'Sem WebGL oferece geada indisponível')
      assert.deepEqual([...j3, ...h3], [], `Erros sem WebGL: ${[...j3, ...h3].join(' | ')}`)
      await q.screenshot({ path: path.join(saida, `${largura}-sem-webgl.jpg`), type: 'jpeg', quality: 80 })
      await q.close()
    }
    c.aprovado = true
  }
  resultado.aprovado = true
} catch (e) { resultado.erro = e.stack; process.exitCode = 1 } finally {
  await browser.close()
  fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify({ aprovado: resultado.aprovado, cenarios: resultado.cenarios.length, erro: resultado.erro?.split('\n').slice(0, 3).join(' ') }))
}
