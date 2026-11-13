// Mouse, toque, menu e cabeçalho: o que a referência faz quando alguém mexe nela (o raio-x e os quadros só rolam).
//
// Uso (por quem abre a página, ver movimento.mjs):
//   await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source: ganchosAntes })   // ANTES de abrir a página
//   const grav = await gravar(nav, { pasta })                                           // de movimento-quadros.mjs
//   ... abrir a página, rolarPaginaToda ...
//   const r = await capturarInteracao(nav, grav, { pagina: 'inicio', celular: false, maxMouse: 24, acoes })
//   // r = { itens, naoMedido, cobertura: [mouse|toque, clique, cabecalho] }
//
// Nada é enviado: o mouse só passa por cima; clique só em botão de menu (aria-expanded/aria-controls) fora de
// formulário; no toque, link e formulário ficam de fora (tocar navega). Nome de classe e texto do site são DADO.
// Node puro, sem dependência: fala com o Chrome pelo protocolo DevTools que o raio-x já abre.

import { curvaDaTrajetoria, decodificarPng } from './raio-x.mjs'
import { MUDANCAS, mudancasDeCss, diferencaQuadros, rolarAte, espalhar } from './movimento-quadros.mjs'
import { comTrava, criarRobots, barradosParaNaoMedido } from './movimento-navegacao.mjs'

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const r2 = (n) => Math.round(n * 100) / 100

// Posto na página antes de ela carregar: anota quais elementos escutam o mouse ou o toque por JavaScript
// (viram candidatos mesmo sem :hover no CSS). Não muda o que o site faz.
export const ganchosAntes = `(() => { try { const o = EventTarget.prototype.addEventListener; const T = /^(mouseenter|mouseover|pointerenter|pointerover|mousemove|pointermove|touchstart)$/;
  EventTarget.prototype.addEventListener = function (t, ...r) { try { if (this && this.nodeType === 1 && T.test(String(t))) this.__movOuve = true } catch {} return o.call(this, t, ...r) } } catch {} })()`

export const LIMITES_MOUSE = 'estados com as mesmas classes medidos uma vez; não cobre arrastar, teclado nem som; ponteiro fora de canvas só por roteiro manual'

// ---------------------------------------------------------------------------------------------------------
// Dentro da página (vai como texto). Guarda em window.__movI os elementos achados e a amostra em curso.
// ---------------------------------------------------------------------------------------------------------
function movInteracao() {
  if (window.__movI) return window.__movI
  const I = (window.__movI = { els: [], ids: new WeakMap(), n: 0, am: null })
  I.quadro = () => new Promise((r) => { let ok = false; const f = () => { if (!ok) { ok = true; r() } }; requestAnimationFrame(f); setTimeout(f, 50) })
  I.desc = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id && /^[\w-]{1,30}$/.test(el.id) ? '#' + el.id : ''
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).find((c) => /^[a-z][\w-]{0,30}$/i.test(c)) : ''
    return tag + id + (!id && cls ? '.' + cls : '')
  }
  I.id = (el) => { let k = I.ids.get(el); if (!k) { k = ++I.n; I.ids.set(el, k) } return k }
  I.guardar = (el) => { let i = I.els.indexOf(el); if (i < 0) i = I.els.push(el) - 1; return i }
  I.ficha = (el) => {
    const m = el.closest('[data-mov]')
    return { desc: I.desc(el), texto: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), dataMov: m ? m.getAttribute('data-mov') : null, id: I.id(el) }
  }
  I.visivel = (el, min) => {
    const r = el.getBoundingClientRect()
    if (r.width < min || r.height < min) return false
    const cs = getComputedStyle(el)
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01
  }
  I.fixo = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true } return false }

  // Quem pode reagir ao mouse: links, botões, cursor de mãozinha, alvo de regra :hover e quem escuta o mouse por JS.
  I.candidatos = ({ maxGrupos, porGrupo }) => {
    const achados = new Set()
    const por = (sel) => { try { for (const el of document.querySelectorAll(sel)) achados.add(el) } catch {} }
    por('a, button, [role=button], [tabindex]')
    let nr = 0
    const regras = (lista) => {
      for (const r of lista) {
        if (++nr > 6000) return
        const s = r.selectorText
        if (s && s.includes(':hover')) for (const parte of s.split(',')) {
          const k = parte.indexOf(':hover')
          if (k > 0) por(parte.slice(0, k).replace(/[\s>+~]+$/, ''))
        }
        try { if (r.cssRules && r.cssRules.length) regras(r.cssRules) } catch {}
      }
    }
    for (const folha of document.styleSheets) { try { regras(folha.cssRules) } catch {} }
    for (const el of [...document.querySelectorAll('body *')].slice(0, 4000)) {
      if (el.__movOuve) { achados.add(el); continue }
      if (getComputedStyle(el).cursor === 'pointer' && !(el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer')) achados.add(el)
    }
    const lista = [...achados].filter((el) => el.isConnected && document.body.contains(el) && el !== document.body && !/^(INPUT|SELECT|TEXTAREA|OPTION|LABEL)$/.test(el.tagName) && I.visivel(el, 24))
    lista.sort((a, b) => (a.compareDocumentPosition(b) & 2 ? 1 : -1))
    const grupos = new Map()
    for (const el of lista) {
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).sort().join('.') : ''
      const chave = el.tagName.toLowerCase() + (cls ? '.' + cls : '<' + (el.parentElement ? I.desc(el.parentElement) : ''))
      if (!grupos.has(chave)) grupos.set(chave, [])
      grupos.get(chave).push(el)
    }
    const out = []
    let g = 0
    for (const [chave, els] of grupos) {
      if (++g > maxGrupos) break
      els.slice(0, porGrupo).forEach((el, ordem) => out.push({
        i: I.guardar(el), grupo: chave, ordem, quantos: els.length, ...I.ficha(el),
        link: !!el.closest('a[href]'), form: !!el.closest('form'), menu: el.hasAttribute('aria-expanded') || el.hasAttribute('aria-controls'),
      }))
    }
    return { grupos: grupos.size, lista: out }
  }

  // Onde pôr o ponteiro para ficar em cima do elemento, e um ponto neutro (fora dele) para tirar o ponteiro.
  I.ponto = ({ i }) => {
    const el = I.els[i]
    if (!el || !el.isConnected) return null
    const r = el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight
    let pt = null
    for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25]]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy
      if (x < 1 || y < 1 || x > vw - 1 || y > vh - 1) continue
      const t = document.elementFromPoint(x, y)
      if (t && (t === el || el.contains(t))) { pt = { x: Math.round(x), y: Math.round(y) }; break }
    }
    const avo = (el.parentElement && el.parentElement.parentElement) || el.parentElement || el
    let fora = null
    for (const raiz of [avo, el.parentElement || el, el]) {
      if (fora) break
      for (const [x, y] of [[2, vh - 2], [vw - 2, vh - 2], [2, 2], [vw - 2, 2], [2, vh / 2], [vw - 2, vh / 2]]) {
        const t = document.elementFromPoint(x, y)
        if (t && raiz !== document.body && raiz !== document.documentElement && raiz.contains(t)) continue
        if (t && raiz === el && t.closest('a,button,[role=button]')) continue
        if (t && raiz !== el && t.closest('a,button,[role=button]')) continue
        fora = { x: Math.round(x), y: Math.round(y) }
        break
      }
    }
    return { pt, fora: fora || { x: 2, y: vh - 2 }, delta: r.top + r.height / 2 - vh / 2, fixo: I.fixo(el), vw, vh,
      caixa: { x: Math.max(0, r.left) / vw, y: Math.max(0, r.top) / vh, w: (Math.min(vw, r.right) - Math.max(0, r.left)) / vw, h: (Math.min(vh, r.bottom) - Math.max(0, r.top)) / vh }, topo: r.top }
  }
  I.pontoDe = ({ alvo }) => {
    if (Array.isArray(alvo)) return { pt: { x: Math.round((innerWidth * alvo[0]) / 100), y: Math.round((innerHeight * alvo[1]) / 100) }, delta: 0, vh: innerHeight }
    let el = null
    try { el = document.querySelector(String(alvo)) } catch {}
    if (!el) return null
    return { ...I.ponto({ i: I.guardar(el) }), i: I.guardar(el) }
  }

  // Estado de um elemento em números: caixa, tamanho de layout, opacidade, transform, filtro e espaço entre letras.
  I.ler = (el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
    let tx = 0, ty = 0, esc = 1, rot = 0
    const t = cs.transform
    if (t && t !== 'none') { try { const m = new DOMMatrixReadOnly(t); esc = Math.hypot(m.a, m.b); rot = (Math.atan2(m.b, m.a) * 180) / Math.PI; tx = m.e; ty = m.f } catch {} }
    const f = cs.filter || '', bl = /blur\(([\d.]+)px\)/.exec(f), br = /brightness\(([\d.]+)\)/.exec(f)
    return {
      n: [r.left, r.top, r.width, r.height, el.offsetWidth ?? r.width, el.offsetHeight ?? r.height, +cs.opacity, tx, ty, esc, rot, bl ? +bl[1] : 0, br ? +br[1] : 1, parseFloat(cs.letterSpacing) || 0].map((v) => Math.round(v * 100) / 100),
      s: [cs.color, cs.backgroundColor, cs.clipPath, cs.visibility === 'hidden' || cs.display === 'none' ? 'oculto' : 'visivel'],
    }
  }
  // O próprio, até 2 pais, até 30 filhos e os irmãos.
  I.observados = (el, soDentro) => {
    const l = [{ el, papel: 'proprio' }]
    if (!soDentro) { let p = el.parentElement; for (let k = 0; k < 2 && p && p !== document.body && p !== document.documentElement; k++, p = p.parentElement) l.push({ el: p, papel: 'pai' }) }
    for (const f of [...el.querySelectorAll('*')].slice(0, 30)) l.push({ el: f, papel: 'filhos' })
    if (!soDentro && el.parentElement) for (const s of [...el.parentElement.children].filter((s) => s !== el).slice(0, 12)) l.push({ el: s, papel: 'irmaos' })
    return l
  }

  // Espera o elemento e os vizinhos pararem (3 leituras iguais): movimento que ainda vinha de antes (cabeçalho
  // voltando, saída do candidato anterior) não pode entrar na medida seguinte.
  I.repouso = async ({ i, limiteMs }) => {
    const el = I.els[i]
    if (!el) return false
    const obs = I.observados(el), ini = performance.now()
    let ant = null, iguais = 0
    while (performance.now() - ini < limiteMs) {
      await I.quadro()
      const a = JSON.stringify(obs.map((o) => I.ler(o.el)))
      if (a === ant) { if (++iguais >= 3) return true } else iguais = 0
      ant = a
    }
    return false
  }

  // Começa a anotar o estado a cada quadro. alvo: { i } | { seletor } | { ponto: [x, y] }.
  I.iniciar = ({ i, seletor, ponto, soDentro, mais }) => {
    if (I.am) I.am.ligado = false
    let el = null
    if (seletor) { try { el = document.querySelector(seletor) } catch {} }
    else if (ponto) el = document.elementFromPoint(ponto[0], ponto[1])
    else el = I.els[i]
    if (!el) return null
    const obs = I.observados(el, soDentro)
    if (mais) { try { for (const m of [...document.querySelectorAll(mais)].slice(0, 5)) if (!obs.some((o) => o.el === m)) obs.push({ el: m, papel: 'irmaos' }) } catch {} }
    const am = (I.am = { obs, t0: performance.now(), tEv: null, quadros: [], anims: new Map(), ligado: true, ant: null, prim: null, ult: null, salto: 1, k: 0 })
    const ev = () => { if (am.ligado && am.tEv === null) am.tEv = performance.now() }
    for (const tipo of ['mouseover', 'mouseout', 'mousedown', 'touchstart', 'pointerdown']) addEventListener(tipo, ev, { capture: true, passive: true, once: true })
    const passo = () => {
      if (!am.ligado) return
      const t = performance.now(), vs = obs.map((o) => I.ler(o.el))
      if (am.ant) {
        let mudou = false
        for (let k = 0; k < vs.length && !mudou; k++) {
          const p = am.ant[k], q = vs[k]
          for (let j = 0; j < q.n.length; j++) if (Math.abs(q.n[j] - p.n[j]) > 0.3 * (j === 6 || j === 9 || j === 12 ? 0.02 : 1)) { mudou = true; break }
          for (let j = 0; j < q.s.length && !mudou; j++) if (q.s[j] !== p.s[j]) mudou = true
        }
        if (mudou) { am.prim ??= t; am.ult = t }
      }
      am.ant = vs
      if (am.k++ % am.salto === 0 || am.ult === t) am.quadros.push({ t, vs })
      if (am.quadros.length > 240) { am.quadros = am.quadros.filter((q, k) => k % 2 === 0 || k === am.quadros.length - 1); am.salto *= 2 }
      try {
        for (const a of document.getAnimations()) {
          const e = a.effect, alvo = e && e.target, k = obs.findIndex((o) => o.el === alvo)
          if (k < 0) continue
          const nome = String(a.transitionProperty || a.animationName || '').slice(0, 40), ch = k + '|' + nome + '|' + (e.pseudoElement || '')
          if (am.anims.has(ch)) continue
          const tm = e.getComputedTiming(), qs = e.getKeyframes ? e.getKeyframes() : []
          const nomes = new Set()
          for (const q of qs) for (const p of Object.keys(q)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) nomes.add(p)
          am.anims.set(ch, { k, nome, transicao: !!a.transitionProperty, pseudo: e.pseudoElement || null, infinita: tm.iterations === Infinity,
            props: [...nomes].slice(0, 8).map((p) => ({ prop: p, valores: qs.map((q) => String(q[p] ?? '').slice(0, 80)) })),
            duracaoMs: typeof tm.duration === 'number' ? Math.round(tm.duration) : null, atrasoMs: Math.round(tm.delay || 0),
            curva: String(tm.easing && tm.easing !== 'linear' ? tm.easing : (qs[0] && qs[0].easing) || 'linear').slice(0, 60), visto: Math.round(t - am.t0) })
        }
      } catch {}
      I.quadro().then(passo)
    }
    passo()
    return { ...I.ficha(el), tag: el.tagName.toLowerCase() }
  }
  // Espera parar (sem mudança por quietoMs e sem transição rodando) ou o limite; devolve a amostra.
  I.esperar = async ({ limiteMs, quietoMs, minMs }) => {
    const am = I.am
    if (!am) return null
    const ini = performance.now()
    const rodando = () => { try { return document.getAnimations().some((a) => { const e = a.effect; if (!e || !am.obs.some((o) => o.el === e.target)) return false; return e.getComputedTiming().iterations !== Infinity && (a.playState === 'running' || a.pending) }) } catch { return false } }
    let quieto = false
    while (performance.now() - ini < limiteMs) {
      await I.quadro()
      const t = performance.now(), base = am.tEv ?? ini
      if (t - base < minMs) continue
      if ((am.ult === null || t - am.ult >= quietoMs) && !rodando()) { quieto = true; break }
    }
    await I.quadro()
    am.ligado = false
    const rel = (v) => (v === null ? null : Math.round(v - am.t0))
    const fim = { t: performance.now(), vs: am.obs.map((o) => I.ler(o.el)) }
    return { obs: am.obs.map((o) => ({ papel: o.papel, ...I.ficha(o.el) })), quadros: [...am.quadros, fim].map((q) => ({ t: Math.round(q.t - am.t0), vs: q.vs })),
      anims: [...am.anims.values()], tEv: rel(am.tEv), prim: rel(am.prim), ult: rel(am.ult), quieto, vw: innerWidth, vh: innerHeight, url: location.href }
  }

  I.menus = ({ max }) => {
    const out = []
    for (const el of document.querySelectorAll('button[aria-expanded], button[aria-controls], [role=button][aria-expanded], [role=button][aria-controls]')) {
      if (out.length >= max) break
      if (el.closest('form') || el.hasAttribute('form') || el.closest('a[href]') || !I.visivel(el, 16)) continue
      const idc = el.getAttribute('aria-controls')
      const painel = idc ? document.getElementById(idc) : null
      out.push({ i: I.guardar(el), ...I.ficha(el), painel: painel ? I.guardar(painel) : null, aberto: el.getAttribute('aria-expanded') })
    }
    return out
  }
  I.atributo = ({ i, nome }) => (I.els[i] ? I.els[i].getAttribute(nome) : null)
  I.canvases = () => [...document.querySelectorAll('canvas')].filter((c) => { const r = c.getBoundingClientRect(); return r.width >= 200 && r.height >= 150 && I.visivel(c, 24) })
    .slice(0, 6).map((c) => ({ i: I.guardar(c), ...I.ficha(c), contexto: c.__movCtx || null }))
  // Elemento fixo no alto da tela (chamar com a página no topo).
  I.cabecalho = () => {
    let melhor = null, nota = -1
    const vw = innerWidth, vh = innerHeight
    for (const el of [...document.querySelectorAll('body *')].slice(0, 4000)) {
      const cs = getComputedStyle(el)
      if ((cs.position !== 'fixed' && cs.position !== 'sticky') || cs.display === 'none' || cs.visibility === 'hidden') continue
      const r = el.getBoundingClientRect()
      if (r.top > vh * 0.2 || r.top < -5 || r.height < 16 || r.height > vh * 0.4 || r.width < vw * 0.2) continue
      if (melhor && melhor.contains(el)) continue
      const largo = r.width >= vw * 0.5, sem = /^(HEADER|NAV)$/.test(el.tagName) || !!el.querySelector('nav'), links = el.querySelectorAll('a, button').length >= 2
      if (!largo && !sem && !links) continue
      const n = (largo ? 2 : 0) + (sem ? 2 : 0) + (links ? 1 : 0)
      if (n > nota) { melhor = el; nota = n }
    }
    const doc = document.scrollingElement || document.documentElement
    return melhor ? { i: I.guardar(melhor), ...I.ficha(melhor), vh, sobraPx: doc.scrollHeight - doc.clientHeight } : null
  }
  // No toque, um link tocado não pode levar a outra página.
  I.travarLinks = () => { if (!I.trava) { I.trava = true; addEventListener('click', (e) => { const a = e.target && e.target.closest && e.target.closest('a[href], [type=submit]'); if (a) e.preventDefault() }, true) } return true }
  // Antes de clicar ou tocar: o que está de fato no ponto pode receber o clique? null = pode; senão, o porquê.
  // Fora de link, de formulário e de campo; botão só sem formulário ligado (dentro de um ou pelo atributo form).
  I.podeClicar = ({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    if (!el) return 'não há elemento no ponto do clique'
    if (el.closest('a[href], area[href]')) return 'o ponto do clique cai num link'
    if (el.closest('form')) return 'o ponto do clique cai dentro de um formulário'
    if (el.closest('input, select, textarea, option, label, [contenteditable]:not([contenteditable=false])')) return 'o ponto do clique cai num campo'
    const b = el.closest('button, [role=button]')
    if (b && (b.hasAttribute('form') || b.closest('form') || (b.tagName === 'BUTTON' && b.form))) return 'o botão está ligado a um formulário'
    return null
  }
  return I
}

const NA = (m) => `(arg) => { const I = (${movInteracao})(); return I.${m}(arg) }`
const chamar = (nav, m, arg, limite) => nav.rodar(NA(m), arg ?? {}, limite)

// ---------------------------------------------------------------------------------------------------------
// Conta (pura): da amostra de estados para o que mudou, em quem, em quanto tempo e com que curva
// ---------------------------------------------------------------------------------------------------------
const NUM = [null, null, null, null, ['largura', 'larguraPx', 1], ['altura', 'alturaPx', 1], ['opacidade', 'opacidade', 0.02], ['posicao-x', 'xPx', 0.5], ['posicao-y', 'yPx', 0.5],
  ['escala', 'escala', 0.005], ['rotacao', 'rotacaoGraus', 0.5], ['desfoque', 'desfoquePx', 0.1], ['brilho', 'brilho', 0.01], ['espaco-entre-letras', 'entreLetrasPx', 0.05]]
// Nomes dos valores iguais aos dos outros leitores (código e CSS): número em px leva "Px" (xPx, yPx, larguraPx,
// entreLetrasPx...); valor que não é número em px fica como texto com o nome sem "Px".
const TXT = [['cor', 'cor'], ['fundo', 'fundo'], ['recorte', 'recorte'], ['visibilidade', 'visibilidade']]

function compararEstados(p, q) {
  const muda = new Set(), de = {}, para = {}
  NUM.forEach((d, j) => { if (d && Math.abs(q.n[j] - p.n[j]) > d[2]) { muda.add(d[0]); de[d[1]] = p.n[j]; para[d[1]] = q.n[j] } })
  TXT.forEach((d, j) => { if (p.s[j] !== q.s[j]) { muda.add(d[0]); de[d[1]] = p.s[j]; para[d[1]] = q.s[j] } })
  return { muda, de, para, dx: q.n[0] - p.n[0], dy: q.n[1] - p.n[1] }
}
const ordenar = (conj) => MUDANCAS.filter((m) => conj.has(m))
const mediana = (l) => { const s = [...l].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }
const GEOMETRIA = ['posicao-x', 'posicao-y', 'escala', 'rotacao', 'largura', 'altura']

// am = o que I.esperar devolve. desde: 'evento' (tempo conta do mouse/toque/clique) ou 'mudanca' (da primeira mudança).
// Devolve null se nada mudou; senão { quemMuda, muda, de, para, principal, partes, duracaoMs, curva, atrasoMs, escadaMs,
// fontes, confianca, parou, assinatura }.
export function analisarAmostra(am, { desde = 'evento' } = {}) {
  if (!am || !am.quadros || am.quadros.length < 2) return null
  const a = am.quadros[0].vs
  let b = am.quadros[am.quadros.length - 1].vs, vaiEVolta = null
  let comp = am.obs.map((o, k) => compararEstados(a[k], b[k]))
  // Foi e voltou (x: 0 → 50 → 0): o fim é igual ao começo. Vale o quadro de maior desvio (o pico), marcado vaiEVolta.
  if (!comp.some((c) => c.muda.size) && am.quadros.length >= 3) {
    let maior = 1, fPico = -1
    for (let f = 1; f < am.quadros.length - 1; f++) {
      let d = 0
      am.quadros[f].vs.forEach((q, k) => { NUM.forEach((n, j) => { if (n) d = Math.max(d, Math.abs(q.n[j] - a[k].n[j]) / n[2]) }); if (TXT.some((t, j) => q.s[j] !== a[k].s[j])) d = Math.max(d, 1.01) })
      if (d > maior) { maior = d; fPico = f }
    }
    if (fPico > 0) {
      b = am.quadros[fPico].vs; comp = am.obs.map((o, k) => compararEstados(a[k], b[k]))
      vaiEVolta = { picoMs: am.quadros[fPico].t - (am.tEv ?? am.quadros[0].t), propriedades: ordenar(new Set(comp.flatMap((c) => [...c.muda]))) }
    }
  }
  // Vai e volta por propriedade (x: 0 → 50 → 0 junto de opacidade: 1 → 0,5): a que voltou ao início entra pelo pico dela.
  if (am.quadros.length >= 3) {
    const tEv = am.tEv ?? am.quadros[0].t, voltaram = new Set(vaiEVolta ? vaiEVolta.propriedades : [])
    let picoMs = vaiEVolta ? vaiEVolta.picoMs : null, maiorDeTodos = 1
    am.obs.forEach((o, k) => {
      const c = comp[k]
      NUM.forEach((n, j) => {
        if (!n || c.muda.has(n[0])) return
        let maior = 1, f0 = -1
        for (let f = 1; f < am.quadros.length - 1; f++) { const d = Math.abs(am.quadros[f].vs[k].n[j] - a[k].n[j]) / n[2]; if (d > maior) { maior = d; f0 = f } }
        if (f0 < 0) return
        c.muda.add(n[0]); c.de[n[1]] = a[k].n[j]; c.para[n[1]] = am.quadros[f0].vs[k].n[j]; voltaram.add(n[0])
        if (!vaiEVolta && maior > maiorDeTodos) { maiorDeTodos = maior; picoMs = am.quadros[f0].t - tEv }
      })
      TXT.forEach((d, j) => {
        if (c.muda.has(d[0])) return
        const f0 = am.quadros.findIndex((q, f) => f > 0 && f < am.quadros.length - 1 && q.vs[k].s[j] !== a[k].s[j])
        if (f0 < 0) return
        c.muda.add(d[0]); c.de[d[1]] = a[k].s[j]; c.para[d[1]] = am.quadros[f0].vs[k].s[j]; voltaram.add(d[0])
        if (picoMs == null) picoMs = am.quadros[f0].t - tEv
      })
    })
    if (voltaram.size) vaiEVolta = { picoMs, propriedades: ordenar(voltaram) }
  }
  const geo = (k) => GEOMETRIA.some((m) => comp[k].muda.has(m))
  const paiMexeu = am.obs.some((o, k) => o.papel === 'pai' && geo(k))
  const proprioMexeu = am.obs.some((o, k) => o.papel === 'proprio' && geo(k))
  am.obs.forEach((o, k) => {
    // Mudou de lugar sem transform nem tamanho (left/top/margem): só conta se ninguém acima o carregou junto.
    const c = comp[k]
    if (geo(k) || paiMexeu || (o.papel === 'filhos' && proprioMexeu) || !['proprio', 'filhos'].includes(o.papel)) return
    if (Math.abs(c.dx) > 1) { c.muda.add('posicao-x'); c.de.xPx = 0; c.para.xPx = r2(c.dx) }
    if (Math.abs(c.dy) > 1) { c.muda.add('posicao-y'); c.de.yPx = 0; c.para.yPx = r2(c.dy) }
  })
  // Transição em ::before/::after não aparece no estado do elemento: entra pelo que o navegador informa.
  for (const an of am.anims || []) {
    if (an.infinita || !an.pseudo) continue
    for (const m of mudancasDeCss(an.props)) comp[an.k].muda.add(m)
  }
  const mudaram = am.obs.map((o, k) => k).filter((k) => comp[k].muda.size)
  if (!mudaram.length) return null
  const papel = (k) => (am.obs[k].papel === 'pai' ? 'proprio' : am.obs[k].papel)
  const quemMuda = ['proprio', 'filhos', 'irmaos'].filter((p) => mudaram.some((k) => papel(k) === p))
  const principal = mudaram.find((k) => am.obs[k].papel === 'proprio') ?? mudaram.find((k) => am.obs[k].papel === 'pai') ?? mudaram[0]
  const muda = new Set()
  for (const k of mudaram) for (const m of comp[k].muda) muda.add(m)
  const partes = mudaram.filter((k) => k !== principal).slice(0, 8).map((k) => ({ quem: papel(k), desc: am.obs[k].desc, muda: ordenar(comp[k].muda), de: comp[k].de, para: comp[k].para }))

  // Tempo: primeiro e último quadro em que cada elemento mudou.
  const difere = (p, q) => p.n.some((v, j) => Math.abs(v - q.n[j]) > (j === 6 || j === 9 || j === 12 ? 0.006 : 0.3)) || p.s.some((v, j) => v !== q.s[j])
  const primeiro = {}, ultimo = {}
  for (const k of mudaram) for (let f = 1; f < am.quadros.length; f++) {
    if (!difere(am.quadros[f - 1].vs[k], am.quadros[f].vs[k])) continue
    primeiro[k] ??= am.quadros[f].t
    ultimo[k] = am.quadros[f].t
  }
  const inicios = Object.values(primeiro), fins = Object.values(ultimo)
  const t0 = desde === 'evento' && am.tEv != null ? am.tEv : inicios.length ? Math.min(...inicios) - 16 : 0
  let duracaoMs = fins.length ? Math.max(10, Math.round((Math.max(...fins) - t0) / 10) * 10) : null, curva = null, atrasoMs = 0
  let fontes = ['amostra'], confianca = 'media'
  const doNavegador = (am.anims || []).filter((an) => !an.infinita && an.duracaoMs > 0 && comp[an.k].muda.size)
  const escolhida = doNavegador.filter((an) => an.k === principal).sort((x, y) => y.duracaoMs - x.duracaoMs)[0] || [...doNavegador].sort((x, y) => y.duracaoMs - x.duracaoMs)[0]
  if (escolhida) {
    duracaoMs = escolhida.duracaoMs; curva = escolhida.curva; atrasoMs = escolhida.atrasoMs; fontes = ['amostra', 'css']; confianca = 'alta'
  } else if (primeiro[principal] != null) {
    let j = -1, maior = 0
    NUM.forEach((d, i) => { if (!d) return; const v = Math.abs(b[principal].n[i] - a[principal].n[i]) / d[2]; if (v > maior) { maior = v; j = i } })
    if (j >= 0) { try { curva = curvaDaTrajetoria(am.quadros.map((q) => q.t), am.quadros.map((q) => q.vs[principal].n[j])) } catch {} }
  }
  const filhos = mudaram.filter((k) => am.obs[k].papel === 'filhos' && primeiro[k] != null).map((k) => primeiro[k]).sort((x, y) => x - y)
  const vaos = filhos.slice(1).map((v, i) => v - filhos[i]).filter((v) => v > 0)
  const escadaMs = filhos.length >= 3 && vaos.length >= 2 && mediana(vaos) >= 20 ? Math.round(mediana(vaos) / 10) * 10 : 0
  return { quemMuda, muda: ordenar(muda), de: comp[principal].de, para: comp[principal].para, principal, partes, duracaoMs, curva, atrasoMs, escadaMs,
    fontes, confianca, parou: !!am.quieto, ...(vaiEVolta ? { vaiEVolta } : {}), assinatura: mudaram.map((k) => am.obs[k].id).sort((x, y) => x - y).join(',') + '|' + ordenar(muda).join('+') }
}

// O estado voltou ao que era antes (primeiro quadro da entrada × último quadro da saída)?
export function voltouAoInicio(entrada, saida) {
  if (!entrada || !saida) return null
  const a = entrada.quadros[0].vs, b = saida.quadros[saida.quadros.length - 1].vs
  return a.every((p, k) => !b[k] || compararEstados(p, b[k]).muda.size === 0)
}

export function montarItem({ pagina, gatilho, alvo, an, quadros = [], tecnica, resumo, posicaoPx = null, mais = {} }) {
  return {
    pagina, secao: null, gatilho, ordem: 1,
    alvo: { desc: alvo.desc, texto: alvo.texto || '', quantos: alvo.quantos ?? 1, dataMov: alvo.dataMov ?? null },
    quemMuda: an.quemMuda, muda: an.muda, de: an.de ?? null, para: an.para ?? null,
    duracaoMs: an.duracaoMs ?? null, curva: an.curva ?? null, atrasoMs: an.atrasoMs ?? 0, escadaMs: an.escadaMs ?? 0, rolagem: null,
    fontes: an.fontes, confianca: an.confianca, tecnica, resumo, quadros: null, quadrosBrutos: espalhar(quadros, 24), posicaoPx,
    ...(an.partes && an.partes.length ? { partes: an.partes } : {}), ...(an.vaiEVolta ? { vaiEVolta: an.vaiEVolta } : {}), ...mais,
  }
}

const frase = (an) => `${an.muda.join(' + ')} em ${an.quemMuda.map((q) => ({ proprio: 'o próprio', filhos: 'os filhos', irmaos: 'os irmãos' })[q]).join(' e ')}`
const tecnicaDe = (an) => (an.fontes.includes('css') ? `transição CSS de ${an.duracaoMs} ms (${an.curva})` : 'mudança feita por código (tempo e curva estimados pela amostra)')
const saidaDe = (an, voltou) => (an ? { duracaoMs: an.duracaoMs, curva: an.curva, voltou } : { duracaoMs: null, curva: null, voltou })

// ---------------------------------------------------------------------------------------------------------
// Ponteiro, toque e clique de verdade (protocolo DevTools)
// ---------------------------------------------------------------------------------------------------------
const moverMouse = (nav, p) => nav.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y })
// Clique e toque só depois de conferir o elemento no ponto (I.podeClicar). Devolvem null se agiram, ou o porquê de não.
async function clicarEm(nav, p) {
  const nao = await chamar(nav, 'podeClicar', { x: p.x, y: p.y })
  if (nao) return nao
  await moverMouse(nav, p)
  await nav.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 })
  await nav.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 })
  return null
}
async function tocarEm(nav, p) {
  const nao = await chamar(nav, 'podeClicar', { x: p.x, y: p.y })
  if (nao) return nao
  await nav.cmd('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] })
  await espera(40)
  await nav.cmd('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  return null
}

// Toda interação roda com a trava da navegação ligada (sem trocar de documento): envio de formulário, pedido de
// escrita, saída do site e download são barrados no protocolo, e cada barrado vira linha de naoMedido. Dentro de
// outra etapa já travada, só roda fn e recolhe os barrados dela.
async function travado(nav, { pagina, etapa, onde, origem = null, permitido = null }, fn) {
  origem ??= await nav.rodar('() => location.href', {}, 10_000)
  return comTrava(nav, { origem, permitido: permitido ?? criarRobots(), navegar: false }, async (T) => {
    const ini = T.barrados.length
    const r = await fn(T)
    const novos = barradosParaNaoMedido(T.barrados.slice(ini), { pagina, etapa, onde })
    if (novos.length) {
      r.naoMedido.push(...novos)
      if (r.cobertura && r.cobertura.estado === 'completa' && novos.some((n) => n.afetaMedida !== false)) Object.assign(r.cobertura, { estado: 'parcial', motivo: novos.find((n) => n.afetaMedida !== false).motivo })
    }
    return r
  })
}
const contam = (l) => l.filter((n) => n.afetaMedida !== false)
// Entrada ou saída que não parou no limite (ESPERA.limiteMs): o fim pode estar cortado.
const naoParou = (lista, am, an, { pagina, etapa, o, fase }) => { if (an && am && !am.quieto) lista.push({ pagina, etapa, o, motivo: `a ${fase} não parou em ${String(ESPERA.limiteMs / 1000).replace('.', ',')} s: o fim pode estar cortado`, naoParou: fase }) }
// Mexeu no meio e voltou ao início sem dar para medir o pico: o navegador avisou de transição no que era observado.
const mexeuSemMedida = (am) => !!am && (am.anims || []).some((a) => !a.infinita && !a.pseudo && a.duracaoMs > 0)

// Leva o elemento ao meio da tela (pela roda, como a Parte 1) e devolve onde pôr o ponteiro. est.pos = posição atual.
async function posicionar(nav, est, i) {
  let p = await chamar(nav, 'ponto', { i })
  if (!p) return null
  if (p.fixo && !p.pt && est.pos > 1) { est.pos = (await rolarAte(nav, 0)).posicao; p = await chamar(nav, 'ponto', { i }) }
  else if (!p.fixo && (!p.pt || Math.abs(p.delta) > p.vh * 0.2)) { est.pos = (await rolarAte(nav, Math.max(0, est.pos + p.delta), { limiteTravaMs: 2500 })).posicao; p = await chamar(nav, 'ponto', { i }) }
  if (!p || !p.pt) return null
  await chamar(nav, 'repouso', { i, limiteMs: 1200 }, 30_000)
  return (await chamar(nav, 'ponto', { i })) || p
}
const ESPERA = { limiteMs: 1500, quietoMs: 200, minMs: 250 }

// 1 e 4. Mouse em cima e saída (ou toque, com celular: true).
export async function capturarMouse(nav, grav, { pagina = 'inicio', maxGrupos = 24, celular = false, est = null, origem = null, permitido = null } = {}) {
  const gatilho = celular ? 'toque' : 'mouse'
  return travado(nav, { pagina, etapa: gatilho, onde: celular ? 'toque' : 'mouse em cima', origem, permitido }, () => mouseTravado(nav, grav, { pagina, maxGrupos, celular, est, gatilho }))
}
async function mouseTravado(nav, grav, { pagina, maxGrupos, celular, est, gatilho }) {
  const itens = [], naoMedido = []
  est ??= { pos: (await rolarAte(nav, 0)).posicao }
  if (celular) { try { await nav.cmd('Emulation.setTouchEmulationEnabled', { enabled: true }) } catch {} await chamar(nav, 'travarLinks') }
  const c = await chamar(nav, 'candidatos', { maxGrupos, porGrupo: 2 })
  const feitos = new Set(), vistos = new Set(), semPonto = new Set()
  let medidos = 0, pulados = 0
  for (const cand of c.lista) {
    if (feitos.has(cand.grupo)) continue
    if (celular && (cand.link || cand.form || cand.menu)) { pulados++; continue }
    const p = await posicionar(nav, est, cand.i)
    if (!p) { semPonto.add(cand.grupo); continue }
    const agir = celular ? tocarEm : async (n, pt) => { await moverMouse(n, { x: pt.x - 2, y: pt.y - 2 }); await moverMouse(n, pt); return null }
    // Tirar o dedo: tocar fora só onde o toque não pega link, formulário nem campo.
    const soltar = async () => { if (!celular) { await moverMouse(nav, p.fora); return null } return tocarEm(nav, p.fora) }
    if (celular) { const nao = await chamar(nav, 'podeClicar', p.fora); if (nao) { semPonto.delete(cand.grupo); naoMedido.push({ pagina, etapa: gatilho, o: cand.desc, motivo: `não toquei: o ponto de saída não é seguro (${nao})`, barrado: 'clique' }); continue } }
    if (!celular) { await moverMouse(nav, p.fora); await espera(120) }
    const de = grav.marcar({ pagina, gatilho })
    await grav.foto()
    await chamar(nav, 'iniciar', { i: cand.i })
    const nao = await agir(nav, p.pt)
    if (nao) { grav.marcar({ pagina, gatilho, soFotos: true }); feitos.add(cand.grupo); naoMedido.push({ pagina, etapa: gatilho, o: cand.desc, motivo: `não toquei: ${nao}`, barrado: 'clique' }); continue }
    const entrada = await chamar(nav, 'esperar', ESPERA, 30_000)
    await grav.foto()
    medidos++
    const an = analisarAmostra(entrada)
    if (!an) {
      grav.marcar({ pagina, gatilho, soFotos: true }); await soltar()
      if (mexeuSemMedida(entrada)) { feitos.add(cand.grupo); naoMedido.push({ pagina, etapa: gatilho, o: cand.desc, motivo: 'mexeu e voltou ao início, mas nenhum quadro passou do mínimo medido (olhar à mão)' }) }
      continue
    }
    await chamar(nav, 'iniciar', { i: cand.i })
    await soltar()
    const saida = await chamar(nav, 'esperar', ESPERA, 30_000)
    await grav.foto()
    grav.marcar({ pagina, gatilho, soFotos: true })
    feitos.add(cand.grupo)
    semPonto.delete(cand.grupo)
    if (vistos.has(an.assinatura)) continue // o mesmo efeito já saiu por outro candidato (ex.: o link dentro do cartão)
    vistos.add(an.assinatura)
    const volta = analisarAmostra(saida)
    naoParou(naoMedido, entrada, an, { pagina, etapa: gatilho, o: cand.desc, fase: 'entrada' })
    naoParou(naoMedido, saida, volta, { pagina, etapa: gatilho, o: cand.desc, fase: 'saída' })
    itens.push(montarItem({ pagina, gatilho, alvo: { ...cand }, an, quadros: grav.quadros.slice(de).map((q) => q.arquivo), posicaoPx: Math.round(est.pos + p.topo),
      tecnica: tecnicaDe(an), resumo: `${cand.desc}: ${celular ? 'ao tocar' : 'com o mouse em cima'}, ${frase(an)}${an.duracaoMs ? ` em ${an.duracaoMs} ms` : ''}${an.parou ? '' : ' (não parou em 1,5 s)'}`,
      mais: { saida: saidaDe(volta, voltouAoInicio(entrada, saida)) } }))
  }
  for (const g of semPonto) naoMedido.push({ pagina, etapa: gatilho, o: `grupo ${g.slice(0, 60)}`, motivo: 'não deu para pôr o ponteiro em cima (coberto por outro elemento ou fora da tela)' })
  const cortou = c.grupos > maxGrupos
  const limites = `até ${maxGrupos} grupos (${Math.min(c.grupos, maxGrupos)} de ${c.grupos} olhados, ${medidos} medições); ${LIMITES_MOUSE}` + (celular ? `; no toque, link, formulário e botão de menu ficam de fora (${pulados})` : '')
  const pesam = contam(naoMedido)
  return { itens, naoMedido, est, cobertura: { pagina, etapa: gatilho, estado: cortou || pesam.length ? 'parcial' : 'completa', itens: itens.length, limites,
    motivo: cortou ? `a página tem ${c.grupos} grupos de candidatos; passou do limite` : pesam.length ? pesam[0].motivo : null } }
}

// Maior fração mudada entre dois quadros, só nas células da grade que caem dentro da caixa (frações da tela).
function mudouNaCaixa(a, b, caixa, grade = 12) {
  const d = diferencaQuadros(a, b, grade)
  let maior = 0
  d.celulas.forEach((v, i) => {
    const x = ((i % grade) + 0.5) / grade, y = (Math.floor(i / grade) + 0.5) / grade
    if (!caixa || (x >= caixa.x && x <= caixa.x + caixa.w && y >= caixa.y && y <= caixa.y + caixa.h)) maior = Math.max(maior, v)
  })
  return maior
}
const ler = (q) => decodificarPng(q.dados)

// 2. Ponteiro sobre canvas: percurso em Z por 1 s, comparado com o canvas sem ponteiro.
export async function capturarCanvas(nav, grav, { pagina = 'inicio', est = null, origem = null, permitido = null } = {}) {
  return travado(nav, { pagina, etapa: 'mouse', onde: 'ponteiro sobre canvas', origem, permitido }, () => canvasTravado(nav, grav, { pagina, est }))
}
async function canvasTravado(nav, grav, { pagina, est }) {
  const itens = [], naoMedido = []
  est ??= { pos: (await rolarAte(nav, 0)).posicao }
  for (const cv of await chamar(nav, 'canvases')) {
    const p = await posicionar(nav, est, cv.i)
    if (!p) { naoMedido.push({ pagina, etapa: 'mouse', o: cv.desc, motivo: 'canvas coberto por outro elemento: o ponteiro não chega nele' }); continue }
    await moverMouse(nav, p.fora)
    await espera(300)
    const de = grav.marcar({ pagina, gatilho: 'mouse', soFotos: true })
    const sem = []
    for (let k = 0; k < 4; k++) { sem.push(await grav.foto()); await espera(200) }
    const cx = p.caixa, vw = p.vw, vh = p.vh, com = []
    const cantos = [[0.12, 0.15], [0.88, 0.15], [0.12, 0.85], [0.88, 0.85]].map(([fx, fy]) => ({ x: (cx.x + cx.w * fx) * vw, y: (cx.y + cx.h * fy) * vh }))
    for (let k = 0; k <= 12; k++) {
      const u = (k / 12) * 3, s = Math.min(2, Math.floor(u)), f = u - s
      await moverMouse(nav, { x: Math.round(cantos[s].x + (cantos[s + 1].x - cantos[s].x) * f), y: Math.round(cantos[s].y + (cantos[s + 1].y - cantos[s].y) * f) })
      await espera(60)
      if (k % 3 === 0) com.push(await grav.foto())
    }
    await moverMouse(nav, p.fora)
    const a = sem.map(ler), b = com.map(ler)
    let base = 0, reacao = 0
    for (let k = 1; k < a.length; k++) base = Math.max(base, mudouNaCaixa(a[k - 1], a[k], cx))
    for (const img of b) reacao = Math.max(reacao, mudouNaCaixa(a[a.length - 1], img, cx))
    for (const q of [...sem, ...com]) q.dados = null
    if (reacao > Math.max(0.02, base * 2.5)) {
      itens.push(montarItem({ pagina, gatilho: 'mouse', alvo: cv, posicaoPx: Math.round(est.pos + p.topo), quadros: grav.quadros.slice(de).map((q) => q.arquivo),
        an: { quemMuda: ['proprio'], muda: ['canvas'], fontes: ['quadros'], confianca: base > 0.005 ? 'baixa' : 'media' },
        tecnica: `canvas redesenhado conforme o ponteiro (${/webgl/i.test(cv.contexto || '') ? 'WebGL' : cv.contexto || 'contexto não lido'})`,
        resumo: `${cv.desc} reage ao ponteiro passando por cima${base > 0.005 ? ' (ele também se mexe sozinho)' : ''}` }))
    } else if (base > 0.02) {
      naoMedido.push({ pagina, etapa: 'mouse', o: cv.desc, motivo: 'o canvas já se mexe sozinho; pelos quadros não dá para separar a reação ao ponteiro (olhar à mão ou usar roteiro manual)' })
    }
  }
  return { itens, naoMedido, est }
}

// 3. Menu: botão com aria-expanded ou aria-controls, fora de formulário. Clica, mede a abertura e fecha.
export async function capturarMenu(nav, grav, { pagina = 'inicio', celular = false, est = null, max = 3, origem = null, permitido = null } = {}) {
  return travado(nav, { pagina, etapa: 'clique', onde: 'botão de menu', origem, permitido }, () => menuTravado(nav, grav, { pagina, celular, est, max }))
}
async function menuTravado(nav, grav, { pagina, celular, est, max }) {
  const itens = [], naoMedido = []
  est ??= { pos: (await rolarAte(nav, 0)).posicao }
  if (est.pos > 1) est.pos = (await rolarAte(nav, 0)).posicao
  const menus = await chamar(nav, 'menus', { max })
  const agir = celular ? tocarEm : clicarEm
  for (const m of menus) {
    const p = await posicionar(nav, est, m.i)
    if (!p) { naoMedido.push({ pagina, etapa: 'clique', o: m.desc, motivo: 'botão de menu coberto ou fora da tela' }); continue }
    if (m.painel != null) await chamar(nav, 'repouso', { i: m.painel, limiteMs: 1200 }, 30_000)
    const de = grav.marcar({ pagina, gatilho: 'clique' })
    await grav.foto()
    const alvo = await chamar(nav, 'iniciar', m.painel != null ? { i: m.painel } : { i: m.i, mais: 'nav, [role=menu], [role=dialog], dialog' })
    const nao = await agir(nav, p.pt)
    if (nao) { grav.marcar({ pagina, gatilho: 'clique', soFotos: true }); naoMedido.push({ pagina, etapa: 'clique', o: m.desc, motivo: `não cliquei no botão de menu: ${nao}`, barrado: 'clique' }); continue }
    const abre = await chamar(nav, 'esperar', ESPERA, 30_000)
    await grav.foto()
    const an = analisarAmostra(abre)
    const depois = await chamar(nav, 'atributo', { i: m.i, nome: 'aria-expanded' })
    let saida = null
    if (an || depois !== m.aberto) {
      await chamar(nav, 'iniciar', m.painel != null ? { i: m.painel } : { i: m.i, mais: 'nav, [role=menu], [role=dialog], dialog' })
      const p2 = (await chamar(nav, 'ponto', { i: m.i })) || p
      const nao2 = await agir(nav, p2.pt || p.pt)
      if (nao2) naoMedido.push({ pagina, etapa: 'clique', o: m.desc, motivo: `não cliquei para fechar o menu: ${nao2}`, barrado: 'clique' })
      else {
        const fecha = await chamar(nav, 'esperar', ESPERA, 30_000)
        await grav.foto()
        const anF = analisarAmostra(fecha)
        naoParou(naoMedido, fecha, anF, { pagina, etapa: 'clique', o: m.desc, fase: 'saída' })
        saida = saidaDe(anF, voltouAoInicio(abre, fecha))
      }
    }
    grav.marcar({ pagina, gatilho: 'clique', soFotos: true })
    if (!celular) await moverMouse(nav, p.fora)
    naoParou(naoMedido, abre, an, { pagina, etapa: 'clique', o: m.desc, fase: 'entrada' })
    if (!an && mexeuSemMedida(abre)) { naoMedido.push({ pagina, etapa: 'clique', o: m.desc, motivo: 'mexeu e voltou ao início, mas nenhum quadro passou do mínimo medido (olhar à mão)' }); continue }
    if (!an) { naoMedido.push({ pagina, etapa: 'clique', o: m.desc, motivo: 'cliquei no botão de menu e nada do que eu observava mudou (o painel pode estar em outro lugar da página)' }); continue }
    itens.push(montarItem({ pagina, gatilho: 'clique', alvo: m.painel != null && alvo ? alvo : m, an, quadros: grav.quadros.slice(de).map((q) => q.arquivo), posicaoPx: Math.round(est.pos + p.topo),
      tecnica: tecnicaDe(an), resumo: `menu: ao clicar em ${m.desc}, ${frase(an)}${an.duracaoMs ? ` em ${an.duracaoMs} ms` : ''}`,
      mais: { acionadoPor: m.desc, ariaExpanded: { antes: m.aberto, depois }, saida } }))
  }
  const pesam = contam(naoMedido)
  return { itens, naoMedido, est, cobertura: { pagina, etapa: 'clique', estado: !menus.length ? 'nao-se-aplica' : pesam.length ? 'parcial' : 'completa', itens: itens.length,
    limites: `só botão de menu com aria-expanded ou aria-controls, fora de formulário (${menus.length} achados, até ${max}); clique em link é da navegação`, motivo: pesam.length ? pesam[0].motivo : !menus.length ? 'nenhum botão de menu marcado na página' : null } }
}

// 5. Cabeçalho: o elemento fixo no alto, olhado no topo, depois de descer 1,5 tela e depois de subir 0,3 tela.
export async function capturarCabecalho(nav, grav, { pagina = 'inicio', est = null, origem = null, permitido = null } = {}) {
  return travado(nav, { pagina, etapa: 'cabecalho', onde: 'rolagem do cabeçalho', origem, permitido }, () => cabecalhoTravado(nav, grav, { pagina, est }))
}
async function cabecalhoTravado(nav, grav, { pagina, est }) {
  est ??= { pos: 0 }
  est.pos = (await rolarAte(nav, 0)).posicao
  const cab = await chamar(nav, 'cabecalho')
  const linha = (estado, itens, motivo, limites = 'topo, 1,5 tela abaixo e 0,3 tela de volta; não mede o cabeçalho no fim da página') => ({ pagina, etapa: 'cabecalho', estado, itens, limites, motivo })
  if (!cab) return { itens: [], naoMedido: [], est, cobertura: linha('nao-se-aplica', 0, 'não há elemento fixo no alto da tela') }
  await chamar(nav, 'repouso', { i: cab.i, limiteMs: 1200 }, 30_000)
  const de = grav.marcar({ pagina, gatilho: 'cabecalho', soFotos: true })
  await grav.foto()
  await chamar(nav, 'iniciar', { i: cab.i, soDentro: true })
  const r1 = await rolarAte(nav, est.pos + cab.vh * 1.5, { limiteTravaMs: 2500 })
  const desce = await chamar(nav, 'esperar', { limiteMs: 1500, quietoMs: 250, minMs: 300 }, 30_000)
  await grav.foto()
  await chamar(nav, 'iniciar', { i: cab.i, soDentro: true })
  const r2b = await rolarAte(nav, Math.max(0, r1.posicao - cab.vh * 0.3), { limiteTravaMs: 2500 })
  const sobe = await chamar(nav, 'esperar', { limiteMs: 1500, quietoMs: 250, minMs: 300 }, 30_000)
  await grav.foto()
  est.pos = r2b.posicao
  const curto = r1.posicao - 0 < cab.vh * 0.5
  const A = desce.quadros[0].vs, B = desce.quadros[desce.quadros.length - 1].vs, C = sobe.quadros[sobe.quadros.length - 1].vs
  const sumiu = (v) => v[0].s[3] === 'oculto' || v[0].n[6] < 0.1 || v[0].n[1] + v[0].n[3] <= 2 || v[0].n[1] >= cab.vh
  const visto = sumiu(B) ? C : B
  const comportamentos = []
  if (!sumiu(A) && sumiu(B)) comportamentos.push('some ao descer')
  if (sumiu(B) && !sumiu(C)) comportamentos.push('volta ao subir')
  if (!sumiu(visto) && A.some((p, k) => visto[k] && p.s[1] !== visto[k].s[1])) comportamentos.push('muda de fundo')
  if (!sumiu(visto) && visto[0].n[3] < A[0].n[3] * 0.9) comportamentos.push('encolhe')
  const an1 = analisarAmostra(desce, { desde: 'mudanca' }), an2 = analisarAmostra(sobe, { desde: 'mudanca' })
  const an = an1 || an2
  const nm = []
  naoParou(nm, desce, an1, { pagina, etapa: 'cabecalho', o: cab.desc, fase: 'mudança ao descer' })
  naoParou(nm, sobe, an2, { pagina, etapa: 'cabecalho', o: cab.desc, fase: 'mudança ao subir' })
  if (!an || !comportamentos.length) {
    return { itens: [], naoMedido: nm, est, cobertura: linha(curto || nm.length ? 'parcial' : 'completa', 0, curto ? 'a página é curta demais para descer 1,5 tela' : nm.length ? nm[0].motivo : an ? 'o cabeçalho muda, mas não some, não troca de fundo nem encolhe' : 'cabeçalho fixo que não muda com a rolagem') }
  }
  const muda = new Set([...(an1 ? an1.muda : []), ...(an2 ? an2.muda : [])])
  const item = montarItem({ pagina, gatilho: 'cabecalho', alvo: cab, an: { ...an, muda: ordenar(muda) }, quadros: grav.quadros.slice(de).map((q) => q.arquivo), posicaoPx: 0,
    tecnica: tecnicaDe(an), resumo: `cabeçalho ${cab.desc}: ${comportamentos.join(', ')}${an.duracaoMs ? ` (${an.duracaoMs} ms)` : ''}`,
    mais: { comportamentos, saida: an1 && an2 ? saidaDe(an2, voltouAoInicio(desce, sobe)) : null } })
  return { itens: [item], naoMedido: nm, est, cobertura: linha(curto || nm.length ? 'parcial' : 'completa', 1, curto ? 'a página é curta demais para descer 1,5 tela' : nm.length ? nm[0].motivo : null) }
}

// 6. Roteiro manual (acoes-manuais.json): executa cada ação e mede do mesmo jeito. Seletor escrito à mão é dado.
export async function executarAcoes(nav, grav, acoes = [], { pagina = 'inicio', est = null, origem = null, permitido = null } = {}) {
  return travado(nav, { pagina, etapa: 'mouse', onde: 'ação manual', origem, permitido }, () => acoesTravado(nav, grav, acoes, { pagina, est }))
}
async function acoesTravado(nav, grav, acoes, { pagina, est }) {
  const itens = [], naoMedido = []
  est ??= { pos: (await rolarAte(nav, 0)).posicao }
  const ponto = async (alvo) => {
    let p = await chamar(nav, 'pontoDe', { alvo })
    if (p && !Array.isArray(alvo) && !p.fixo && (!p.pt || Math.abs(p.delta) > p.vh * 0.2)) { est.pos = (await rolarAte(nav, Math.max(0, est.pos + p.delta), { limiteTravaMs: 2500 })).posicao; p = await chamar(nav, 'pontoDe', { alvo }) }
    return p && p.pt ? p : null
  }
  for (const acao of Array.isArray(acoes) ? acoes : []) {
    if (!acao || (acao.pagina && acao.pagina !== pagina) || !Array.isArray(acao.passos)) continue
    const falhou = (motivo) => naoMedido.push({ pagina, etapa: 'mouse', o: `ação manual ${acao.id}`, motivo })
    const primeiro = acao.passos.map((s) => s.mover ?? s.clicar ?? s.tocar ?? (s.percurso && s.percurso[0])).find((v) => v != null)
    const ref = acao.observar ?? primeiro
    const p0 = ref != null ? await ponto(ref) : null
    if (ref != null && !Array.isArray(ref) && !p0) { falhou(`não achei na tela o seletor "${String(ref).slice(0, 60)}"`); continue }
    await moverMouse(nav, { x: 2, y: (p0?.vh ?? 900) - 2 })
    await espera(120)
    const de = grav.marcar({ pagina, gatilho: 'mouse' })
    const antes = await grav.foto()
    const alvo = await chamar(nav, 'iniciar', typeof ref === 'string' ? { seletor: ref } : { ponto: p0 ? [p0.pt.x, p0.pt.y] : [10, 10] })
    if (!alvo) { falhou('não achei o que observar'); continue }
    let gatilho = 'mouse', erro = null
    for (const s of acao.passos) {
      if (s.mover != null) { const p = await ponto(s.mover); if (!p) { erro = 'passo "mover" sem alvo na tela'; break } await moverMouse(nav, p.pt) }
      else if (Array.isArray(s.percurso)) {
        const pts = []
        for (const v of s.percurso) { const p = await ponto(v); if (p) pts.push(p.pt) }
        const n = Math.max(1, Math.round((s.ms ?? 800) / 50 / Math.max(1, pts.length - 1)))
        for (let k = 0; k + 1 < pts.length; k++) for (let j = 1; j <= n; j++) { await moverMouse(nav, { x: Math.round(pts[k].x + ((pts[k + 1].x - pts[k].x) * j) / n), y: Math.round(pts[k].y + ((pts[k + 1].y - pts[k].y) * j) / n) }); await espera(50) }
      } else if (s.sair) await moverMouse(nav, { x: 2, y: (p0?.vh ?? 900) - 2 })
      else if (s.clicar != null || s.tocar != null) {
        // Clique manual só em controle permitido: o que estiver no ponto passa por I.podeClicar.
        const toque = s.clicar == null, p = await ponto(toque ? s.tocar : s.clicar)
        if (!p) { erro = `passo "${toque ? 'tocar' : 'clicar'}" sem alvo na tela`; break }
        gatilho = toque ? 'toque' : 'clique'
        const nao = await (toque ? tocarEm : clicarEm)(nav, p.pt)
        if (nao) { erro = `não ${toque ? 'toquei' : 'cliquei'}: ${nao}`; break }
      }
    }
    const am = await chamar(nav, 'esperar', ESPERA, 30_000)
    const depois = await grav.foto()
    grav.marcar({ pagina, gatilho, soFotos: true })
    if (erro) { falhou(erro); continue }
    let an = analisarAmostra(am)
    naoParou(naoMedido, am, an, { pagina, etapa: 'mouse', o: `ação manual ${acao.id}`, fase: 'entrada' })
    if (!an && mudouNaCaixa(ler(antes), ler(depois), null) > 0.02) an = { quemMuda: ['proprio'], muda: [alvo.tag === 'canvas' ? 'canvas' : 'visibilidade'], fontes: ['quadros'], confianca: 'baixa', duracaoMs: null }
    if (!an) { falhou('a ação rodou e nada mudou na tela'); continue }
    an.fontes = ['roteiro-manual', ...an.fontes]
    itens.push(montarItem({ pagina, gatilho, alvo, an, quadros: grav.quadros.slice(de).map((q) => q.arquivo), posicaoPx: Math.round(est.pos),
      tecnica: an.fontes.includes('css') ? tecnicaDe(an) : 'vista por roteiro manual', resumo: `ação manual ${acao.id}: ${alvo.desc}, ${frase(an)}${an.duracaoMs ? ` em ${an.duracaoMs} ms` : ''}`, mais: { acaoManual: String(acao.id) } }))
  }
  return { itens, naoMedido, est }
}

// Tudo desta parte numa página já aberta (ganchos e gravação ligados antes de abrir).
// A trava fica ligada do começo ao fim (cada etapa recolhe os próprios barrados). origem: a página aberta (padrão:
// o endereço atual); permitido: robots.txt (padrão: criarRobots() de movimento-navegacao.mjs).
export async function capturarInteracao(nav, grav, { pagina = 'inicio', celular = false, maxMouse = 24, acoes = null, origem = null, permitido = null } = {}) {
  origem ??= await nav.rodar('() => location.href', {}, 10_000)
  permitido ??= criarRobots()
  return comTrava(nav, { origem, permitido, navegar: false }, () => interacaoTravada(nav, grav, { pagina, celular, maxMouse, acoes, origem, permitido }))
}
async function interacaoTravada(nav, grav, { pagina, celular, maxMouse, acoes, origem, permitido }) {
  const est = { pos: (await rolarAte(nav, 0)).posicao }, o = { pagina, est, origem, permitido }
  const mouse = await capturarMouse(nav, grav, { ...o, maxGrupos: maxMouse, celular })
  const canvas = celular ? { itens: [], naoMedido: [] } : await capturarCanvas(nav, grav, o)
  const manual = acoes ? await executarAcoes(nav, grav, acoes, o) : { itens: [], naoMedido: [] }
  const menu = await capturarMenu(nav, grav, { ...o, celular })
  const cab = await capturarCabecalho(nav, grav, o)
  const etapa = celular ? 'toque' : 'mouse'
  const naoMedido = [...mouse.naoMedido, ...canvas.naoMedido, ...manual.naoMedido].map((n) => ({ ...n, etapa: n.etapa === 'mouse' ? etapa : n.etapa }))
  const linha = { ...mouse.cobertura, itens: mouse.itens.length + canvas.itens.length + manual.itens.length }
  const pesam = contam(naoMedido)
  if (pesam.length && linha.estado === 'completa') { linha.estado = 'parcial'; linha.motivo = pesam[0].motivo }
  return { itens: [...mouse.itens, ...canvas.itens, ...manual.itens, ...menu.itens, ...cab.itens], naoMedido: [...naoMedido, ...menu.naoMedido, ...cab.naoMedido],
    cobertura: [linha, menu.cobertura, cab.cobertura] }
}
