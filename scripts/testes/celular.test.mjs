// Portão do celular (lp-revisao/scripts/celular.mjs): regras dos 7 itens com medidas simuladas, Chrome ausente e uma
// rodada real contra páginas locais (pulada sem Chrome/Edge). A parte do WebKit só roda se o Playwright existir.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import vm from 'node:vm'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins/landing-pages/skills/lp-revisao/scripts/celular.mjs')
const C = await import(pathToFileURL(script).href)

const base = (extra = {}) => ({
  largura: 360, altura: 780, larguraDoc: 360, vazando: [], leitura: [{ nome: 'p', px: 16 }], campos: [{ nome: 'input', px: 16 }],
  alvos: [{ nome: 'a.zap', x: 280, y: 700, w: 56, h: 56, fixo: true }, { nome: 'button', x: 16, y: 300, w: 120, h: 48 }],
  toque: { posicoes: [390, 780, 1170, 1400], distancia: 390, maxRolagem: 1400 },
  reduzido: { total: 0, invisiveis: [] },
  contato: { total: 1, destinos: [{ nome: 'a.zap', href: 'https://wa.me/5511999999999', alvoExiste: null }], posicoes: [0, 0.25, 0.5, 0.75, 1].map((fracao) => ({ fracao, alcancavel: true })) },
  menu: { achou: true, abriu: true, fechou: true, nome: 'button.toggle' },
  videos: [{ nome: 'video', muted: true, playsInline: true, autoplay: true, poster: false, tocando: true }],
  ...extra,
})

test('medidas boas passam nos itens 1 a 6', () => {
  for (const i of C.avaliarTudo([base()])) assert.equal(i.estado, 'passou', `${i.n}: ${i.motivo}`)
})

test('item 1: rolagem lateral e elemento cortado reprovam', () => {
  assert.equal(C.avaliarRolagem([base()]).estado, 'passou')
  assert.match(C.avaliarRolagem([base({ larguraDoc: 500 })]).motivo, /rola para o lado/)
  assert.match(C.avaliarRolagem([base({ vazando: [{ nome: 'div.largo', esquerda: 0, direita: 500 }] })]).motivo, /cortado/)
})

test('item 2: texto de leitura e campo abaixo de 16 px reprovam', () => {
  assert.equal(C.avaliarTexto([base()]).estado, 'passou')
  assert.match(C.avaliarTexto([base({ leitura: [{ nome: 'p', px: 14 }] })]).motivo, /texto\(s\) de leitura/)
  assert.match(C.avaliarTexto([base({ campos: [{ nome: 'input', px: 15 }] })]).motivo, /zoom/)
})

test('item 3: alvo pequeno e botões colados reprovam; link no meio da frase e pilha de menu não', () => {
  const pilha = [{ nome: 'a1', x: 0, y: 0, w: 200, h: 48 }, { nome: 'a2', x: 0, y: 48, w: 200, h: 48 }, { nome: 'a3', x: 0, y: 200, w: 30, h: 18, emLinha: true }]
  assert.equal(C.avaliarToque([base({ alvos: pilha })]).estado, 'passou')
  assert.match(C.avaliarToque([base({ alvos: [{ nome: 'a', x: 0, y: 0, w: 30, h: 20 }] })]).motivo, /menor/)
  const lado = [{ nome: 'b1', x: 0, y: 0, w: 60, h: 48 }, { nome: 'b2', x: 63, y: 0, w: 60, h: 48 }]
  assert.match(C.avaliarToque([base({ alvos: lado })]).motivo, /sem espaço/)
  assert.deepEqual(C.folga({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 5, w: 10, h: 10 }), { dx: 10, dy: -5 })
})

test('item 4: trava, pulo e texto invisível com movimento reduzido reprovam', () => {
  assert.equal(C.avaliarPresas([base()]).estado, 'passou')
  assert.match(C.avaliarPresas([base({ toque: { posicoes: [390, 400, 405], distancia: 390, maxRolagem: 1400 } })]).motivo, /trava/)
  assert.match(C.avaliarPresas([base({ toque: { posicoes: [1400], distancia: 390, maxRolagem: 1400 } })]).motivo, /pula/)
  assert.match(C.avaliarPresas([base({ reduzido: { total: 2, invisiveis: ['h2 "a"', 'p "b"'] } })]).motivo, /movimento reduzido/)
  assert.match(C.avaliarPresas([base({ toque: null })]).motivo, /não medida/)
})

test('item 5: sem contato, fora do polegar, destino ruim e menu que não fecha reprovam', () => {
  assert.equal(C.avaliarContatoEMenu([base({ menu: { achou: false } })]).estado, 'passou')
  assert.match(C.avaliarContatoEMenu([base({ contato: { total: 0, destinos: [], posicoes: [] } })]).motivo, /nenhum botão de contato/)
  const fora = base().contato
  fora.posicoes[2].alcancavel = false
  assert.match(C.avaliarContatoEMenu([base({ contato: fora })]).motivo, /50%/)
  const ruim = { ...base().contato, destinos: [{ nome: 'a', href: 'https://wa.me/', alvoExiste: null }] }
  assert.match(C.avaliarContatoEMenu([base({ contato: ruim })]).motivo, /sem número/)
  assert.match(C.avaliarContatoEMenu([base({ menu: { achou: true, abriu: true, fechou: false, nome: 'x' } })]).motivo, /não fechou/)
  assert.match(C.avaliarContatoEMenu([base({ menu: { achou: true, abriu: false, nome: 'x' } })]).motivo, /não abriu/)
  assert.equal(C.problemaDoDestino('tel:+55 11 99999-9999'), null)
  assert.equal(C.problemaDoDestino('#contato', false), 'âncora #contato não existe na página')
  assert.equal(C.problemaDoDestino('mailto:a@b.com'), null)
})

test('item 6: vídeo com som, sem playsinline e sem poster reprova; poster salva', () => {
  assert.equal(C.avaliarVideo([base({ videos: [] })]).motivo, 'sem vídeo na abertura')
  const ruim = { nome: 'video', muted: false, playsInline: false, autoplay: true, poster: false, tocando: false }
  assert.match(C.avaliarVideo([base({ videos: [ruim] })]).motivo, /não está mudo.*playsinline/)
  assert.equal(C.avaliarVideo([base({ videos: [{ ...ruim, poster: true }] })]).estado, 'passou')
})

test('item 7: sem Playwright é "Safari não conferido"; com WebKit segue os itens de lá', () => {
  assert.equal(C.avaliarSafari(null).estado, 'nao-conferido')
  assert.match(C.avaliarSafari(null).motivo, /Safari não conferido/)
  assert.equal(C.avaliarSafari({ erro: 'x' }).estado, 'nao-conferido')
  assert.equal(C.avaliarSafari({ itens: C.avaliarTudo([base()]) }).estado, 'passou')
  assert.equal(C.avaliarSafari({ itens: C.avaliarTudo([base({ larguraDoc: 900 })]) }).estado, 'falhou')
})

test('relatório: código 0 com Safari não conferido, 1 com falha; resumo um item por linha', () => {
  const itens = [...C.avaliarTudo([base()]), { n: 7, nome: C.NOMES[7], ...C.avaliarSafari(null) }]
  const rel = C.montarRelatorio('http://x/', C.montarTelas([360]), itens)
  assert.equal(rel.codigo, 0)
  assert.equal(rel.safari, 'Safari não conferido')
  const resumo = C.resumoTexto(rel).split('\n')
  assert.equal(resumo.length, 10)
  assert.match(resumo[7], /^7\. .*: não conferido/)
  assert.equal(C.montarRelatorio('http://x/', [], [...C.avaliarTudo([base({ larguraDoc: 400 })]), itens[6]]).codigo, 1)
  assert.deepEqual(C.lerArgs(['a.html', 'saida', '--larguras', '360,412', '--json']), { larguras: [360, 412], deitado: false, json: true, url: 'a.html', saida: 'saida' })
  assert.deepEqual(C.montarTelas([390], true), [{ largura: 390, altura: 844 }, { largura: 844, altura: 390 }])
})

// ---------------------------------------------------------------------------------------------------------
// DOM simulado: só o que os coletores usam, para rodar o coletor de verdade sem abrir navegador.
// no(tag, { attrs, estilo, caixa: [x, y, largura, altura], onclick, props }, [filhos ou 'texto'])
// ---------------------------------------------------------------------------------------------------------
function casa(el, seletor) {
  const m = /^([a-z0-9]*)((?:\[[^\]]+\])*)$/i.exec(seletor)
  if (!m) throw new Error(`seletor fora do DOM simulado: ${seletor}`)
  if (m[1] && el.tagName !== m[1].toUpperCase()) return false
  for (const [, n, v] of m[2].matchAll(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g))
    if (!el.hasAttribute(n) || (v !== undefined && el.getAttribute(n) !== v)) return false
  return true
}
class El {
  constructor(tag, { attrs = {}, estilo = {}, caixa = [16, 400, 200, 48], onclick = null, props = {} } = {}, filhos = []) {
    Object.assign(this, props)
    this.tagName = tag.toUpperCase()
    this.onclick = onclick
    this.parentElement = null
    this.childNodes = [].concat(filhos).map((f) => (typeof f === 'string' ? { nodeType: 3, textContent: f } : f))
    for (const f of this.childNodes) if (f.nodeType === 1) f.parentElement = this
    Object.defineProperties(this, { attrs: { value: attrs }, estilo: { value: estilo }, caixa: { value: caixa } })
  }
  get nodeType() { return 1 }
  get id() { return this.attrs.id || '' }
  get className() { return this.attrs.class || '' }
  get type() { return this.attrs.type || (this.tagName === 'BUTTON' ? 'submit' : 'text') }
  get textContent() { return this.childNodes.map((n) => n.textContent).join('') }
  get form() { return this.closest('form') }
  getAttribute(n) { return n in this.attrs ? String(this.attrs[n]) : null }
  hasAttribute(n) { return n in this.attrs }
  getBoundingClientRect() { const [x, y, w, h] = this.caixa; return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h } }
  contains(o) { for (let e = o; e; e = e.parentElement) if (e === this) return true; return false }
  matches(sel) { return sel.split(',').some((s) => casa(this, s.trim())) }
  closest(sel) { for (let e = this; e; e = e.parentElement) if (e.matches(sel)) return e; return null }
  querySelectorAll(sel) {
    const achados = []
    const andar = (e) => { for (const f of e.childNodes) if (f.nodeType === 1) { if (sel === '*' || f.matches(sel)) achados.push(f); andar(f) } }
    andar(this)
    return achados
  }
}
const no = (tag, op, filhos) => new El(tag, op, filhos)

// Monta a página simulada (tela de 360x780), roda o coletor e desmonta. cliques = quem recebeu addEventListener('click').
async function naPagina(filhos, coletor, { cliques } = {}) {
  const body = no('body', { caixa: [0, 0, 360, 2000] }, filhos)
  const todos = () => body.querySelectorAll('*')
  const globais = {
    window: { scrollTo() {}, __celularCliques: cliques },
    document: {
      body, documentElement: { clientWidth: 360, scrollWidth: 360, scrollHeight: 2000 }, scrollingElement: { scrollHeight: 2000 },
      querySelectorAll: (sel) => body.querySelectorAll(sel),
      getElementById: (id) => todos().find((e) => e.id === id) || null,
      elementFromPoint: (x, y) => todos().filter((e) => { const r = e.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom }).pop() || null,
    },
    getComputedStyle: (el) => ({ display: 'block', visibility: 'visible', opacity: '1', fontSize: '16px', position: 'static', overflowX: 'visible', clip: 'auto', clipPath: 'none', textTransform: 'none', ...el.estilo }),
    innerHeight: 780, innerWidth: 360, scrollY: 0,
  }
  const antes = Object.fromEntries(Object.keys(globais).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
  for (const [k, v] of Object.entries(globais)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true })
  try { return await coletor() } finally {
    for (const [k, d] of Object.entries(antes)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k] }
  }
}
const contatoDe = (filhos, op) => naPagina(filhos, () => C.medirContato({ pausa: 0 }), op)
const itemContato = (contato) => C.avaliarContatoEMenu([base({ contato })])
const layoutDe = (filhos) => naPagina(filhos, () => C.medirLayout())
const itemTexto = (layout) => C.avaliarTexto([base({ leitura: layout.leitura, campos: layout.campos })])

test('achado 6a: botão de contato visível sem ação reprova e não vira "destino certo"', async () => {
  const c = await contatoDe([no('button', {}, ['Orçamento'])])
  assert.deepEqual(c.destinos, [])
  assert.deepEqual(c.acoes, [])
  assert.deepEqual(c.semAcao, [{ nome: 'button', texto: 'Orçamento' }])
  assert.ok(c.posicoes.every((p) => !p.alcancavel), 'botão sem ação não conta como contato ao alcance do polegar')
  const r = itemContato(c)
  assert.equal(r.estado, 'falhou')
  assert.match(r.motivo, /sem ação.*button "Orçamento"/)
  assert.doesNotMatch(r.motivo, /destino certo/)

  // Com um link bom na página, o botão morto continua reprovando.
  const comLink = await contatoDe([no('button', {}, ['Orçamento']), no('a', { attrs: { href: 'https://wa.me/5511999999999' } }, ['WhatsApp'])])
  assert.match(itemContato(comLink).motivo, /sem ação/)

  // Vizinhos sem ação: link sem href, role=button sem nada, type=button dentro de formulário, onclick vazio.
  const mortos = await contatoDe([
    no('a', { attrs: { class: 'cta' } }, ['Fale conosco']),
    no('div', { attrs: { role: 'button' } }, ['Agendar visita']),
    no('form', {}, [no('button', { attrs: { type: 'button' } }, ['Pedir orçamento'])]),
    no('button', { attrs: { onclick: '  ' } }, ['Ligar agora']),
  ])
  assert.deepEqual(mortos.semAcao.map((s) => s.nome), ['a.cta', 'div', 'button', 'button'])
  assert.equal(itemContato(mortos).estado, 'falhou')

  // Botão sem ação que não aparece (display:none) não é acusado, mas também não deixa passar: nada foi conferido.
  const escondido = await contatoDe([no('button', { caixa: [0, 0, 0, 0] }, ['Orçamento'])])
  assert.deepEqual(escondido.semAcao, [])
  assert.match(itemContato(escondido).motivo, /sem nada conferido/)
})

test('achado 6a: link "#" e "javascript:" não têm destino; onclick, formulário, React e ouvinte de clique têm ação', async () => {
  for (const href of ['#', 'javascript:void(0)', '']) {
    const c = await contatoDe([no('a', { attrs: { href } }, ['Orçamento'])])
    assert.deepEqual(c.destinos.map((d) => d.href), [href])
    assert.match(itemContato(c).motivo, /sem destino/, `href="${href}"`)
  }

  const comOnclick = await contatoDe([no('button', { attrs: { onclick: 'abrirPedido()' } }, ['Orçamento'])])
  assert.deepEqual(comOnclick.acoes, [{ nome: 'button', tipo: 'script' }])
  assert.deepEqual(comOnclick.semAcao, [])
  const r = itemContato(comOnclick)
  assert.equal(r.estado, 'passou')
  assert.match(r.motivo, /destino não conferido/)
  assert.doesNotMatch(r.motivo, /destino certo/)

  const noForm = await contatoDe([no('form', {}, [no('button', {}, ['Enviar contato']), no('input', { attrs: { type: 'submit', value: 'Pedir orçamento' } })])])
  assert.deepEqual(noForm.acoes.map((a) => a.tipo), ['formulario', 'formulario'])
  assert.equal(itemContato(noForm).estado, 'passou')
  assert.doesNotMatch(itemContato(noForm).motivo, /destino certo/)

  // React: onClick deixa a propriedade onclick preenchida e as props no nó. addEventListener: anotado antes da página.
  const react = await contatoDe([no('button', { onclick: () => {} }, ['Orçamento']), no('button', { props: { __reactProps$x1: { onClick() {} } } }, ['Fale conosco'])])
  assert.deepEqual(react.acoes.map((a) => a.tipo), ['script', 'script'])
  const ouvido = no('button', {}, ['Orçamento'])
  const comOuvinte = await contatoDe([ouvido, no('div', {}, [no('button', {}, ['Ligar'])])], { cliques: new WeakSet([ouvido]) })
  assert.deepEqual(comOuvinte.acoes, [{ nome: 'button', tipo: 'script' }])
  assert.equal(comOuvinte.semAcao.length, 1, 'ouvinte em outro elemento não vale para este botão')

  // Link bom segue dizendo "destino certo"; botão dentro do link responde pelo link.
  const bom = await contatoDe([no('a', { attrs: { href: 'https://wa.me/5511999999999' } }, [no('button', {}, ['Orçamento pelo WhatsApp'])])])
  assert.equal(bom.total, 2)
  assert.deepEqual(bom.semAcao, [])
  assert.match(itemContato(bom).motivo, /com destino certo/)
  assert.doesNotMatch(itemContato(bom).motivo, /não conferido/)
  const misto = await contatoDe([no('a', { attrs: { href: 'tel:+5511999999999' } }, ['Ligue']), no('button', { attrs: { onclick: 'x()' } }, ['Orçamento'])])
  assert.match(itemContato(misto).motivo, /destino certo \(há também botão.*destino não conferido\)/)
})

test('achado 6a: lista vazia nunca aprova (frase final "sem nada conferido")', () => {
  const posicoes = base().contato.posicoes
  const semNada = C.avaliarContatoEMenu([base({ contato: { total: 1, destinos: [], posicoes } })])
  assert.equal(semNada.estado, 'falhou')
  assert.match(semNada.motivo, /contato sem nada conferido/)
  assert.doesNotMatch(semNada.motivo, /destino certo/)
  assert.match(C.avaliarContatoEMenu([base({ contato: { total: 1, destinos: base().contato.destinos, posicoes: [] } })]).motivo, /alcance do polegar sem nada conferido/)
  // Duas telas: uma só com ação por script não deixa a frase prometer destino nas duas.
  const soScript = { total: 1, destinos: [], acoes: [{ nome: 'button', tipo: 'script' }], semAcao: [], posicoes }
  const duas = C.avaliarContatoEMenu([base(), base({ largura: 390, contato: soScript })])
  assert.equal(duas.estado, 'passou')
  assert.doesNotMatch(duas.motivo, /destino certo/)
  const sem = C.avaliarTexto([base({ leitura: [] })])
  assert.equal(sem.estado, 'falhou')
  assert.match(sem.motivo, /nenhum texto de leitura.*sem nada conferido/)
  assert.match(C.avaliarTexto([base({ campos: [] })]).motivo, /sem campo de formulário/)
})

test('achado 6b: frase curta de leitura com 12 px reprova; com 16 px passa', async () => {
  const pequeno = await layoutDe([no('p', { estilo: { fontSize: '12px' } }, ['Este é o texto principal.'])])
  assert.deepEqual(pequeno.leitura, [{ nome: 'p', px: 12, curto: true }])
  const r = itemTexto(pequeno)
  assert.equal(r.estado, 'falhou')
  assert.match(r.motivo, /1 texto\(s\) de leitura abaixo de 16 px \(p 12px \(frase curta\)\)/)
  assert.match(r.motivo, /small, legenda/)
  assert.doesNotMatch(r.motivo, /16 px ou mais/)

  const normal = await layoutDe([no('p', {}, ['Este é o texto principal.'])])
  assert.deepEqual(normal.leitura, [{ nome: 'p', px: 16, curto: true }])
  assert.equal(itemTexto(normal).estado, 'passou')

  // Outras frases curtas pequenas: sem ponto em parágrafo/lista (4+ palavras), com ponto em div/span (3+ palavras),
  // e parágrafo com parte em negrito (só o texto direto conta).
  const frases = await layoutDe([
    no('li', { estilo: { fontSize: '13px' } }, ['Entrega em todo o estado']),
    no('div', { attrs: { class: 'aviso' }, estilo: { fontSize: '12px' } }, ['Só hoje tem desconto!']),
    no('p', { attrs: { id: 'negrito' }, estilo: { fontSize: '14px' } }, ['Este é o ', no('strong', {}, ['texto']), ' principal.']),
    no('p', { attrs: { id: 'longo' }, estilo: { fontSize: '13px' } }, ['Texto de leitura pequeno demais para ler no celular sem esforço nenhum.']),
  ])
  assert.deepEqual(frases.leitura.map((t) => `${t.nome} ${t.px}${t.curto ? ' curto' : ''}`), ['li 13 curto', 'div.aviso 12 curto', 'p#negrito 14 curto', 'p#longo 13'])
  assert.match(itemTexto(frases).motivo, /4 texto\(s\) de leitura/)
})

test('achado 6b: rótulo pequeno legítimo (legenda, selo, sobretítulo, rodapé legal) não é acusado', async () => {
  const mi = { fontSize: '12px' }
  const pagina = await layoutDe([
    no('p', { attrs: { id: 'corpo' } }, ['Levamos a sua carga com segurança e no prazo combinado.']),
    no('figure', {}, [no('figcaption', { estilo: mi }, ['Frota própria na sede da empresa.'])]),
    no('small', { estilo: mi }, ['Consulte as condições do serviço.']),
    no('p', {}, [no('small', { estilo: mi }, ['Valores sujeitos a alteração sem aviso.'])]),
    no('footer', {}, [no('p', { estilo: mi }, ['Todos os direitos reservados à empresa.'])]),
    no('div', { attrs: { role: 'contentinfo' } }, [no('p', { estilo: mi }, ['Todos os direitos reservados, São Paulo.'])]),
    no('span', { attrs: { class: 'selo' }, estilo: mi }, ['Frete grátis']),
    no('div', { attrs: { class: 'selo' }, estilo: mi }, ['Entrega em todo o Brasil']),
    no('p', { attrs: { class: 'sobre' }, estilo: mi }, ['Sobre nós']),
    no('p', { attrs: { class: 'caixa' }, estilo: { ...mi, textTransform: 'uppercase' } }, ['Nossos serviços para você']),
    no('p', { attrs: { class: 'caixa' }, estilo: mi }, ['MAIS DE 20 ANOS.']),
    no('p', { attrs: { class: 'numero' }, estilo: mi }, ['R$ 1.200,00']),
    no('label', { estilo: mi }, ['Diga o seu nome completo.']),
    no('a', { attrs: { href: '#x' }, estilo: mi }, [no('span', {}, ['Veja como funciona aqui.'])]),
  ])
  assert.deepEqual(pagina.leitura, [{ nome: 'p#corpo', px: 16 }])
  assert.equal(itemTexto(pagina).estado, 'passou')
  // Caixa alta só livra texto curto: parágrafo inteiro em maiúsculas e pequeno continua acusado.
  const grito = await layoutDe([no('p', { estilo: { ...mi, textTransform: 'uppercase' } }, ['Levamos a sua carga com segurança e no prazo combinado.'])])
  assert.equal(itemTexto(grito).estado, 'falhou')
})

test('ouvinte de clique por addEventListener é anotado antes da página, sem mudar o comportamento', () => {
  let chamadas = 0
  const mundo = {}
  mundo.window = mundo
  mundo.EventTarget = class { addEventListener(...a) { chamadas++; this.ultimo = a } }
  mundo.Element = class extends mundo.EventTarget {}
  vm.runInNewContext(C.MARCAR_CLIQUES, mundo)
  vm.runInNewContext(C.MARCAR_CLIQUES, mundo) // repetir não embrulha duas vezes
  const botao = new mundo.Element(), outro = new mundo.Element(), janela = new mundo.EventTarget()
  const fn = () => {}
  botao.addEventListener('click', fn, { passive: true })
  outro.addEventListener('scroll', fn)
  janela.addEventListener('click', fn)
  assert.equal(chamadas, 3)
  assert.deepEqual(botao.ultimo, ['click', fn, { passive: true }])
  assert.equal(mundo.__celularCliques.has(botao), true)
  assert.equal(mundo.__celularCliques.has(outro), false)
  assert.equal(mundo.__celularCliques.has(janela), false)
})

function rodar(args, env = {}) {
  return new Promise((resolve) => {
    const limpo = { ...process.env, ...env }
    delete limpo.PLAYWRIGHT_MODULE
    const p = spawn(process.execPath, [script, ...args], { cwd: os.tmpdir(), env: limpo })
    let saida = ''
    p.stdout.on('data', (d) => { saida += d })
    p.stderr.on('data', (d) => { saida += d })
    p.on('close', (codigo) => resolve({ codigo, saida }))
  })
}

test('Chrome ausente: código 2 e mensagem dizendo o que fazer', async () => {
  const pagina = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'celular-sem-')), 'p.html')
  fs.writeFileSync(pagina, '<p>oi</p>')
  const { codigo, saida } = await rodar([pagina], { BROWSER_EXECUTABLE: path.join(os.tmpdir(), 'nao-existe', 'chrome.exe') })
  assert.equal(codigo, 2)
  assert.match(saida, /Chrome\/Edge não encontrado/)
  assert.match(saida, /não conferido/)
})

const BOA = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box}body{margin:0;font:16px/1.5 sans-serif}header{display:flex;justify-content:space-between;align-items:center;padding:8px 16px}
.toggle{min-width:48px;min-height:48px;font-size:16px}#gaveta{display:none}#gaveta.aberta{display:block}#gaveta a{display:block;min-height:48px;padding:12px 16px}
section{min-height:110vh;padding:24px 16px}.presa{position:sticky;top:0}
.zap{position:fixed;right:16px;bottom:16px;min-width:56px;min-height:56px;display:flex;align-items:center;justify-content:center;background:#25d366;color:#000;border-radius:28px;padding:0 16px}
input{font-size:16px;min-height:48px;width:100%}.enviar{min-height:48px;min-width:120px;font-size:16px;margin-top:16px}video{width:100%;height:200px;display:block}</style></head><body>
<header><strong>Marca</strong><button class="toggle" aria-expanded="false" aria-controls="gaveta" onclick="const g=document.getElementById('gaveta');g.classList.toggle('aberta');this.setAttribute('aria-expanded',g.classList.contains('aberta'))">Menu</button></header>
<nav id="gaveta"><a href="#servicos">Serviços</a><a href="#formulario">Formulário</a></nav>
<video muted playsinline autoplay loop poster="capa.jpg"></video>
<section id="servicos"><h1>Transporte de cargas com cuidado</h1><p>Levamos a sua carga com segurança e no prazo combinado, para todo o estado.</p>
<p>Atendemos todo o estado.</p><small>Consulte as condições.</small>
<button class="enviar" id="fale">Fale com a gente</button><script>document.getElementById('fale').addEventListener('click',function(){location.hash='#formulario'})</script></section>
<section class="presa"><h2>Como funciona</h2><p>Você pede o orçamento, combinamos a data e acompanhamos a viagem do começo ao fim.</p></section>
<section id="formulario"><h2>Peça um orçamento</h2><label for="nome">Nome</label><input id="nome"><button class="enviar">Enviar pedido</button></section>
<a class="zap" href="https://wa.me/5511999999999">WhatsApp</a></body></html>`

// Um defeito plantado por item (1 a 6).
const RUIM = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font:16px/1.5 sans-serif}section{min-height:110vh;padding:16px}.largo{width:520px;background:#eee}
.miudo{font-size:13px}input{font-size:14px}.mini a{display:inline-block;width:30px;height:20px;margin-right:2px;background:#ccc}
#gaveta{display:none}#gaveta.aberta{display:block}#gaveta a{display:block;min-height:48px}.toggle{min-width:48px;min-height:48px}
.topo{display:block;min-height:48px;min-width:48px}.revela{opacity:0}@media (prefers-reduced-motion:no-preference){.revela{animation:ap .3s forwards}}@keyframes ap{to{opacity:1}}</style>
<script>document.addEventListener('touchmove',function(e){if(scrollY>300)e.preventDefault()},{passive:false})</script></head><body>
<header><a class="topo" href="https://wa.me/">WhatsApp</a><button class="toggle" aria-label="Abrir menu" onclick="document.getElementById('gaveta').classList.add('aberta')">≡</button></header>
<nav id="gaveta"><a href="#a">Serviços</a><a href="#b">Sobre</a></nav>
<video autoplay style="width:100%;height:150px;display:block"><source src="nao-existe.mp4" type="video/mp4"></video>
<section><div class="largo">Esta faixa é mais larga que a tela do celular.</div><p class="miudo">Texto de leitura pequeno demais para ler no celular sem esforço nenhum.</p>
<form><input placeholder="Seu nome"></form><div class="mini"><a href="#1">1</a><a href="#2">2</a></div></section>
<section><h2 class="revela">Título que só aparece com animação</h2><p>Mais conteúdo para rolar a página por toque.</p></section>
<section><p>Fim da página com bastante altura para rolar.</p></section></body></html>`

const navegador = C.acharNavegador()
test('rodada real: página boa passa nos 6 e a de 6 defeitos é reprovada nos 6', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 300_000 }, async () => {
  const paginas = { '/boa.html': BOA, '/ruim.html': RUIM }
  const servidor = http.createServer((req, res) => {
    const corpo = paginas[req.url.split('?')[0]]
    if (!corpo) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(corpo)
  })
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
  const porta = servidor.address().port
  try {
    const boa = await rodar([`http://127.0.0.1:${porta}/boa.html`, '--larguras', '360', '--json'])
    const rb = JSON.parse(boa.saida)
    for (const i of rb.itens.slice(0, 6)) assert.equal(i.estado, 'passou', `boa, item ${i.n}: ${i.motivo}`)
    assert.equal(boa.codigo, rb.itens[6].estado === 'falhou' ? 1 : 0)
    const ruim = await rodar([`http://127.0.0.1:${porta}/ruim.html`, '--larguras', '360', '--json'])
    const rr = JSON.parse(ruim.saida)
    for (const i of rr.itens.slice(0, 6)) assert.equal(i.estado, 'falhou', `ruim, item ${i.n} deveria falhar: ${i.motivo}`)
    assert.match(rr.itens[3].motivo, /trava.*movimento reduzido/)
    assert.match(rr.itens[4].motivo, /não fechou/)
    assert.equal(ruim.codigo, 1)
  } finally { servidor.close() }
})
