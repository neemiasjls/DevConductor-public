// Testa mouse, toque, menu e cabeçalho (movimento-interacao.mjs): a conta pura da amostra e, num site local pequeno,
// cartão que alarga com o mouse, canvas que reage ao ponteiro, menu no clique, cabeçalho que some e volta, o mesmo
// cartão por toque e uma ação de acoes-manuais.json.
// Roda com: node --test scripts/testes/movimento-interacao.test.mjs   (teste de navegador: um por vez na máquina)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pastaScripts = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts')
const { acharNavegador, abrirNavegador } = await import(pathToFileURL(path.join(pastaScripts, 'raio-x.mjs')).href)
const quadros = await import(pathToFileURL(path.join(pastaScripts, 'movimento-quadros.mjs')).href)
const { analisarAmostra, voltouAoInicio, capturarInteracao, capturarMouse, ganchosAntes, LIMITES_MOUSE, montarItem } = await import(pathToFileURL(path.join(pastaScripts, process.env.MOV_INTERACAO_ARQUIVO || 'movimento-interacao.mjs')).href) // a variável só serve para a contraprova com uma versão antiga

// ---------------------------------------------------------------------------------------------------------
// Conta pura
// ---------------------------------------------------------------------------------------------------------
// n = [x, y, largura, altura, larguraLayout, alturaLayout, opacidade, tx, ty, escala, rotação, desfoque, brilho, letras]
const est = (m = {}) => ({ n: [m.x ?? 0, 0, m.w ?? 100, 50, m.w ?? 100, 50, m.op ?? 1, m.tx ?? 0, 0, 1, 0, 0, 1, 0], s: ['rgb(0, 0, 0)', m.fundo ?? 'rgb(255, 255, 255)', 'none', 'visivel'] })
const obs = [{ papel: 'proprio', desc: 'div.cartao', id: 1 }, { papel: 'filhos', desc: 'span.nome', id: 2 }, { papel: 'irmaos', desc: 'div.cartao', id: 3 }]

test('analisarAmostra: cartão alarga, o nome aparece e o irmão encolhe; tempo contado do evento', () => {
  const passos = [0, 0.1, 0.35, 0.65, 0.9, 1, 1]
  const am = { obs, tEv: 100, quieto: true, anims: [],
    quadros: passos.map((u, k) => ({ t: 100 + k * 50, vs: [est({ w: 100 + 200 * u }), est({ op: u }), est({ x: 100 + 200 * u, w: 100 - 50 * u })] })) }
  const an = analisarAmostra(am)
  assert.deepEqual(an.quemMuda, ['proprio', 'filhos', 'irmaos'])
  assert.deepEqual(an.muda, ['opacidade', 'largura'])
  assert.deepEqual([an.de.larguraPx, an.para.larguraPx], [100, 300])
  assert.equal(an.duracaoMs, 250)
  assert.deepEqual(an.fontes, ['amostra'])
  assert.equal(an.confianca, 'media')
  assert.equal(an.partes.find((p) => p.quem === 'irmaos').para.larguraPx, 50)
  // com a transição informada pelo navegador, valem a duração e a curva dela
  const css = analisarAmostra({ ...am, anims: [{ k: 0, nome: 'flex-grow', duracaoMs: 300, atrasoMs: 0, curva: 'ease', infinita: false, props: [] }] })
  assert.deepEqual([css.duracaoMs, css.curva, css.confianca], [300, 'ease', 'alta'])
  assert.deepEqual(css.fontes, ['amostra', 'css'])
  // nada mudou: sem item
  assert.equal(analisarAmostra({ obs, tEv: 0, anims: [], quadros: [{ t: 0, vs: [est(), est(), est()] }, { t: 300, vs: [est(), est(), est()] }] }), null)
  // saída: voltou ao estado de antes
  const volta = { obs, quadros: [{ t: 0, vs: am.quadros[6].vs }, { t: 300, vs: am.quadros[0].vs }] }
  assert.equal(voltouAoInicio(am, volta), true)
  assert.equal(voltouAoInicio(am, am), false)
})

test('analisarAmostra: filho carregado pelo pai não vira item de posição; sublinhado em ::after entra pela transição', () => {
  const am = { obs: [{ papel: 'proprio', desc: 'a.link', id: 1 }, { papel: 'filhos', desc: 'span', id: 2 }], tEv: 0, anims: [],
    quadros: [{ t: 0, vs: [est(), est()] }, { t: 200, vs: [est({ tx: 40, x: 40 }), est({ x: 40 })] }] }
  const an = analisarAmostra(am)
  assert.deepEqual(an.quemMuda, ['proprio'])
  assert.deepEqual(an.muda, ['posicao-x'])
  const pseudo = analisarAmostra({ obs: am.obs, tEv: 0, quadros: [{ t: 0, vs: [est(), est()] }, { t: 200, vs: [est(), est()] }],
    anims: [{ k: 0, nome: 'transform', pseudo: '::after', duracaoMs: 250, atrasoMs: 0, curva: 'ease-out', infinita: false, props: [{ prop: 'transform', valores: ['scaleX(0)', 'scaleX(1)'] }] }] })
  assert.deepEqual(pseudo.muda, ['escala'])
  assert.equal(pseudo.duracaoMs, 250)
})

// ---------------------------------------------------------------------------------------------------------
// Navegador
// ---------------------------------------------------------------------------------------------------------
const PAGINA = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Interação</title><style>
*{box-sizing:border-box} body{margin:0;font:16px sans-serif;background:#f4f1ea;color:#222}
header.topo{position:fixed;top:16px;left:20%;width:60%;height:56px;border-radius:28px;background:#222;color:#fff;display:flex;align-items:center;gap:24px;padding:0 24px;transition:transform 300ms ease;z-index:5}
header.topo.some{transform:translateY(-150%)}
header.topo a{color:#fff;text-decoration:none}
#painel{position:fixed;top:90px;right:20%;width:220px;padding:16px;background:#fff;border:1px solid #222;opacity:0;visibility:hidden;transition:opacity 200ms linear,visibility 0s linear 200ms;z-index:6}
#painel.aberto{opacity:1;visibility:visible;transition:opacity 200ms linear}
section{min-height:100vh;padding:120px 5vw 40px}
.galeria{display:flex;gap:12px;height:300px}
.cartao{flex:1 1 0;min-width:0;background:#b9a27f;overflow:hidden;transition:flex-grow 300ms ease;position:relative}
.cartao:hover{flex-grow:3}
.cartao .nome{position:absolute;left:12px;bottom:12px;opacity:0;transition:opacity 300ms ease}
.cartao:hover .nome{opacity:1}
canvas{display:block;background:#fff;border:1px solid #999}
#abre{width:160px;height:48px;background:#ddd;line-height:48px;text-align:center}
#gaveta{width:40px;height:80px;background:#345;overflow:hidden;transition:width 250ms ease-out;margin-top:16px}
#gaveta.aberta{width:240px}
</style></head><body>
<header class="topo"><a href="#um">Projetos</a><a href="#dois">Contato</a><button class="botao-menu" aria-expanded="false" aria-controls="painel">Menu</button></header>
<nav id="painel"><p>Ambientes</p><p>Sobre</p></nav>
<section id="um"><div class="galeria"><div class="cartao"><span class="nome">Cozinha</span></div><div class="cartao"><span class="nome">Sala</span></div><div class="cartao"><span class="nome">Quarto</span></div></div></section>
<section id="dois"><canvas id="tela" width="600" height="300"></canvas></section>
<section id="tres"><div id="abre">Abrir</div><div id="gaveta"></div></section>
<section id="quatro" style="min-height:200vh"><p>Fim</p></section>
<script>
const topo = document.querySelector('header.topo'); let ultimo = 0
addEventListener('scroll', () => { const y = scrollY; topo.classList.toggle('some', y > ultimo && y > 50); ultimo = y }, { passive: true })
const botao = document.querySelector('.botao-menu'), painel = document.getElementById('painel')
botao.addEventListener('click', () => { const abrir = botao.getAttribute('aria-expanded') !== 'true'; botao.setAttribute('aria-expanded', String(abrir)); painel.classList.toggle('aberto', abrir) })
const tela = document.getElementById('tela'), g = tela.getContext('2d')
tela.addEventListener('mousemove', (e) => { const r = tela.getBoundingClientRect(); g.clearRect(0, 0, 600, 300); g.fillStyle = '#c00'; g.beginPath(); g.arc(e.clientX - r.left, e.clientY - r.top, 70, 0, 7); g.fill() })
document.getElementById('abre').addEventListener('click', () => document.getElementById('gaveta').classList.toggle('aberta'))
</script></body></html>`

const navegador = acharNavegador()
const pular = !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)'

// Toda a preparação fica dentro do try: se uma etapa falhar (EPERM na pasta, porta, navegador), o que já existe é
// solto. O vigia fecha o navegador se o teste passar do limite, para não ficar Chrome vivo nem execução presa.
// pedidos: tudo o que o servidor recebeu (método e caminho), para a contraprova da trava.
async function comSite(tela, fn, { limiteMs = 170_000, pagina = PAGINA } = {}) {
  let servidor = null, saida = null, nav = null, vigia = null
  const pedidos = []
  try {
    servidor = http.createServer((req, res) => { pedidos.push(`${req.method} ${req.url}`); req.resume(); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(pagina) })
    await new Promise((r, x) => { servidor.once('error', x); servidor.listen(0, '127.0.0.1', r) })
    saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-teste-'))
    nav = await abrirNavegador(navegador)
    vigia = setTimeout(() => { nav.fechar().catch(() => {}) }, limiteMs)
    await nav.cmd('Page.enable')
    await nav.cmd('Emulation.setDeviceMetricsOverride', tela)
    for (const source of [quadros.ganchosAntes, ganchosAntes]) await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source }) // ganchos antes de navegar
    const grav = await quadros.gravar(nav, { pasta: path.join(saida, 'quadros') }) // gravação ligada antes de abrir a página
    await quadros.capturarCarregar(nav, grav, { url: `http://127.0.0.1:${servidor.address().port}/`, pagina: 'inicio', duracaoMs: 800 })
    await fn({ nav, grav, saida, pedidos })
    await grav.parar()
  } finally {
    clearTimeout(vigia)
    try { if (nav) await nav.fechar() } catch {}
    if (servidor) { servidor.close(); servidor.closeAllConnections?.() }
    if (saida) fs.rmSync(saida, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}
const naMargem = (ms, esperado) => typeof ms === 'number' && ms >= esperado / 2 && ms <= esperado * 2

test('montarItem: movimento longo guarda quadros espalhados do começo ao fim, não só os 24 primeiros', () => {
  const quadros = Array.from({ length: 60 }, (_, k) => `q${k}.png`)
  const an = { quemMuda: [], muda: ['opacidade'], fontes: ['quadros'], confianca: 'media' }
  const it = montarItem({ pagina: 'inicio', gatilho: 'mouse', alvo: { desc: 'a' }, an, quadros, tecnica: 'x', resumo: 'y' })
  assert.equal(it.quadrosBrutos.length, 24)
  assert.equal(it.quadrosBrutos[0], 'q0.png')
  assert.equal(it.quadrosBrutos.at(-1), 'q59.png', 'o último quadro (fim do movimento) tem de entrar')
  const curto = montarItem({ pagina: 'inicio', gatilho: 'mouse', alvo: { desc: 'a' }, an, quadros: quadros.slice(0, 5), tecnica: 'x', resumo: 'y' })
  assert.deepEqual(curto.quadrosBrutos, quadros.slice(0, 5))
})

test('site local no computador: cartão, canvas, menu, cabeçalho e ação manual', { skip: pular, timeout: 300_000 }, async () => {
  await comSite({ width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, async ({ nav, grav, saida }) => {
    const acoes = [{ id: 'A01', pagina: 'inicio', passos: [{ clicar: '#abre' }], observar: '#gaveta' }]
    const r = await capturarInteracao(nav, grav, { pagina: 'inicio', acoes })
    const resumo = JSON.stringify(r.itens.map((i) => [i.gatilho, i.alvo.desc, i.muda, i.duracaoMs]))

    const cartao = r.itens.find((i) => i.gatilho === 'mouse' && i.alvo.desc === 'div.cartao')
    assert.ok(cartao, 'sem item do cartão: ' + resumo + JSON.stringify(r.naoMedido))
    assert.ok(cartao.muda.includes('largura') && cartao.muda.includes('opacidade'), String(cartao.muda))
    assert.ok(cartao.quemMuda.includes('irmaos') && cartao.quemMuda.includes('proprio') && cartao.quemMuda.includes('filhos'), String(cartao.quemMuda))
    assert.ok(cartao.para.larguraPx > cartao.de.larguraPx * 1.5, JSON.stringify([cartao.de, cartao.para]))
    assert.ok(cartao.partes.some((p) => p.quem === 'irmaos' && p.para.larguraPx < p.de.larguraPx), 'o irmão não encolheu')
    assert.ok(naMargem(cartao.duracaoMs, 300), 'entrada: ' + cartao.duracaoMs)
    assert.ok(cartao.saida && cartao.saida.voltou === true && naMargem(cartao.saida.duracaoMs, 300), 'saída: ' + JSON.stringify(cartao.saida))
    assert.equal(cartao.alvo.quantos, 3)
    assert.ok(cartao.fontes.includes('css') && cartao.confianca === 'alta')
    assert.equal(r.itens.filter((i) => i.gatilho === 'mouse' && i.alvo.desc === 'div.cartao').length, 1, 'cartões iguais medidos uma vez')

    const canvas = r.itens.find((i) => i.gatilho === 'mouse' && i.muda.includes('canvas'))
    assert.ok(canvas && canvas.alvo.desc === 'canvas#tela', 'sem item do canvas: ' + resumo + JSON.stringify(r.naoMedido))

    const menu = r.itens.find((i) => i.gatilho === 'clique' && i.acionadoPor)
    assert.ok(menu, 'sem item do menu: ' + resumo + JSON.stringify(r.naoMedido))
    assert.equal(menu.alvo.desc, 'nav#painel')
    assert.equal(menu.acionadoPor, 'button.botao-menu')
    assert.ok(menu.muda.includes('opacidade'), String(menu.muda))
    assert.deepEqual(menu.ariaExpanded, { antes: 'false', depois: 'true' })
    assert.ok(naMargem(menu.duracaoMs, 200), 'menu: ' + menu.duracaoMs)
    assert.equal(menu.saida.voltou, true, 'o menu não fechou')

    const cab = r.itens.find((i) => i.gatilho === 'cabecalho')
    assert.ok(cab, 'sem item do cabeçalho: ' + resumo + JSON.stringify(r.cobertura))
    assert.equal(cab.alvo.desc, 'header.topo')
    assert.ok(cab.comportamentos.includes('some ao descer') && cab.comportamentos.includes('volta ao subir'), String(cab.comportamentos))
    assert.ok(cab.muda.includes('posicao-y'), String(cab.muda))
    assert.ok(naMargem(cab.duracaoMs, 300), 'cabeçalho: ' + cab.duracaoMs)

    const manual = r.itens.find((i) => i.acaoManual === 'A01')
    assert.ok(manual, 'sem item da ação manual: ' + resumo + JSON.stringify(r.naoMedido))
    assert.equal(manual.gatilho, 'clique')
    assert.equal(manual.fontes[0], 'roteiro-manual')
    assert.ok(manual.muda.includes('largura') && naMargem(manual.duracaoMs, 250), JSON.stringify([manual.muda, manual.duracaoMs]))

    // contrato: listas fixas, cobertura com os limites e quadros no manifesto
    for (const it of r.itens) {
      assert.ok(quadros.GATILHOS.includes(it.gatilho) && it.muda.length && it.muda.every((m) => quadros.MUDANCAS.includes(m)), JSON.stringify(it))
      assert.ok(it.quadros === null && it.quadrosBrutos.length >= 2, 'item sem quadros: ' + it.alvo.desc)
    }
    assert.deepEqual(r.cobertura.map((c) => c.etapa), ['mouse', 'clique', 'cabecalho'])
    assert.ok(r.cobertura[0].limites.startsWith('até 24 grupos') && r.cobertura[0].limites.includes(LIMITES_MOUSE), r.cobertura[0].limites)
    assert.equal(r.cobertura[0].itens, 3)
    assert.ok(r.cobertura.every((c) => c.estado === 'completa'), JSON.stringify(r.cobertura))
    const manifesto = JSON.parse(fs.readFileSync(grav.gravarManifesto(), 'utf8'))
    for (const g of ['mouse', 'clique', 'cabecalho']) assert.ok(manifesto.quadros.some((q) => q.gatilho === g), 'manifesto sem quadro de ' + g)
    assert.ok(fs.existsSync(path.join(saida, 'quadros', '.gitignore')))
  })
})

test('site local no celular: o mesmo cartão por toque', { skip: pular, timeout: 180_000 }, async () => {
  await comSite({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, async ({ nav, grav }) => {
    const r = await capturarMouse(nav, grav, { pagina: 'inicio', celular: true })
    const cartao = r.itens.find((i) => i.alvo.desc === 'div.cartao')
    assert.ok(cartao, 'sem item do cartão por toque: ' + JSON.stringify([r.itens.map((i) => [i.gatilho, i.alvo.desc, i.muda]), r.naoMedido, r.cobertura]))
    assert.equal(cartao.gatilho, 'toque')
    assert.ok(cartao.muda.includes('largura') && cartao.quemMuda.includes('irmaos'), JSON.stringify([cartao.muda, cartao.quemMuda]))
    assert.ok(naMargem(cartao.duracaoMs, 300), 'toque: ' + cartao.duracaoMs)
    assert.equal(r.cobertura.etapa, 'toque')
    assert.ok(r.cobertura.limites.includes('no toque, link'), r.cobertura.limites)
  })
})

test('vai e volta: x 0 → 50 → 0 vira item com o pico, não some', () => {
  const xs = [0, 10, 30, 50, 30, 10, 0, 0]
  const am = { obs: [{ papel: 'proprio', desc: 'div.bola', id: 1 }], tEv: 0, quieto: true, anims: [],
    quadros: xs.map((x, k) => ({ t: k * 50, vs: [est({ tx: x, x })] })) }
  const an = analisarAmostra(am)
  assert.ok(an, 'o movimento que volta ao início sumiu')
  assert.deepEqual(an.muda, ['posicao-x'])
  assert.deepEqual([an.de.xPx, an.para.xPx], [0, 50])
  assert.equal(an.vaiEVolta.picoMs, 150)
  assert.ok(an.duracaoMs >= 250 && an.duracaoMs <= 350, String(an.duracaoMs))
  // parado de verdade continua sem item
  assert.equal(analisarAmostra({ ...am, quadros: xs.map((x, k) => ({ t: k * 50, vs: [est()] })) }), null)
})

test('vai e volta por propriedade: x 0 → 50 → 0 junto de opacidade 1 → 0,8 → 0,5 devolve as duas (achado P2-d)', () => {
  const xs = [0, 10, 30, 50, 30, 10, 0, 0]
  const ops = [1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5]
  const am = { obs: [{ papel: 'proprio', desc: 'div.bola', id: 1 }], tEv: 0, quieto: true, anims: [],
    quadros: xs.map((x, k) => ({ t: k * 50, vs: [est({ tx: x, x, op: ops[k] })] })) }
  const an = analisarAmostra(am)
  assert.ok(an.muda.includes('posicao-x') && an.muda.includes('opacidade'), JSON.stringify(an.muda))
  assert.deepEqual([an.de.xPx, an.para.xPx], [0, 50])
  assert.deepEqual([an.de.opacidade, an.para.opacidade], [1, 0.5])
  assert.equal(an.vaiEVolta.picoMs, 150)
  assert.deepEqual(an.vaiEVolta.propriedades, ['posicao-x'])
})

// Contraprova da trava: com a versão antiga o servidor recebe envio de formulário, POST do mouse e a ida a /outra.
const PAGINA_RISCO = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Risco</title><style>
body{margin:0;font:16px sans-serif} section{min-height:100vh;padding:80px} .caixa{width:220px;height:70px;margin:20px;background:#ccc;cursor:pointer;transition:background-color 150ms linear}
.caixa:hover{background:#999}
</style></head><body><section>
<form id="f1" action="/enviar" method="post"><input type="hidden" name="a" value="1"><button id="dentro" class="caixa">Enviar</button></form>
<button id="fora" class="caixa" form="f1" aria-expanded="false" aria-controls="nada">Abrir</button>
<div id="vivo" class="caixa">Vivo</div>
<div id="vai" class="caixa">Vai</div>
</section><script>
document.getElementById('vivo').addEventListener('mouseenter', () => { fetch('/escreve', { method: 'POST', body: 'x' }).catch(() => {}) })
document.getElementById('vai').addEventListener('click', () => { location.href = '/outra' })
</script></body></html>`
const perigosos = (pedidos) => pedidos.filter((p) => p.startsWith('POST ') || p.startsWith('GET /outra'))

test('trava: interação não envia nada', { skip: pular, timeout: 300_000 }, async () => {
  await comSite({ width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, async ({ nav, grav, pedidos }) => {
    let r = null, erro = null
    const acoes = [{ id: 'A01', pagina: 'inicio', passos: [{ clicar: '#dentro' }], observar: '#dentro' }, { id: 'A02', pagina: 'inicio', passos: [{ clicar: '#vai' }], observar: '#vai' }]
    try { r = await capturarInteracao(nav, grav, { pagina: 'inicio', acoes }) } catch (e) { erro = e }
    await new Promise((ok) => setTimeout(ok, 500))
    assert.deepEqual(perigosos(pedidos), [], 'o servidor recebeu: ' + JSON.stringify(pedidos))
    assert.equal(erro, null, String(erro && erro.stack))
    const linhas = JSON.stringify(r.naoMedido)
    assert.ok(r.naoMedido.some((n) => /A01/.test(n.o) && /formulário/.test(n.motivo)), 'clique no botão do formulário não anotado: ' + linhas)
    assert.ok(r.naoMedido.some((n) => n.barrado === 'navegacao' && n.afetaMedida === true), 'ida a /outra não anotada: ' + linhas)
    assert.ok(r.naoMedido.some((n) => n.barrado === 'escrita' && n.afetaMedida === false), 'POST do mouse não anotado: ' + linhas)
    assert.equal(r.cobertura[0].estado, 'parcial')
    assert.ok(!r.itens.some((i) => i.acionadoPor === 'button#fora'), 'botão ligado ao formulário pelo atributo form foi clicado')
  }, { pagina: PAGINA_RISCO })
})

const PAGINA_LENTA = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Lento</title><style>
body{margin:0} section{min-height:100vh;padding:100px} .lento{width:200px;height:80px;background:#468;transition:width 3s linear}.lento:hover{width:420px}
</style></head><body><section><div class="lento"></div></section></body></html>`

test('não parou em 1,5 s: transição de 3 s fica em naoMedido e deixa a cobertura parcial', { skip: pular, timeout: 180_000 }, async () => {
  await comSite({ width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, async ({ nav, grav }) => {
    const r = await capturarMouse(nav, grav, { pagina: 'inicio' })
    const item = r.itens.find((i) => i.alvo.desc === 'div.lento')
    assert.ok(item, 'sem item: ' + JSON.stringify([r.itens.map((i) => i.alvo.desc), r.naoMedido]))
    assert.ok(r.naoMedido.some((n) => n.naoParou === 'entrada' && n.o === 'div.lento'), JSON.stringify(r.naoMedido))
    assert.equal(r.cobertura.estado, 'parcial')
  }, { pagina: PAGINA_LENTA })
})
