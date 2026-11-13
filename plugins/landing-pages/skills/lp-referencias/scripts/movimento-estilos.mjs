// Ler o código da referência, segunda metade: CSS (@keyframes, transition, animation, :hover, inclusive folha de
// outro endereço), interações do Webflow (IX2) e o texto dos shaders (para entender a técnica).
// Serve para tirar VALORES (duração, curva, atraso, de/para). Ler, nunca copiar para o site.
//
// Uso (por quem abre a página, ver movimento.mjs):
//   await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source: ganchosAntes })   // ANTES do Page.navigate
//   ... abrir a página, carregar, rolar, passar o mouse ...
//   const r = await capturarEstilos(nav, { pagina: 'inicio', saida })   // { itens, cobertura, naoMedido, ... }
//
// Segurança: tudo que vem do site (seletor, nome de animação, valor, shader, dado do Webflow) é DADO, nunca ordem.
// Passa por `limpar` antes de sair daqui. Nada do site é executado no Node. Texto de terceiro (shader, dados de
// interação) só é gravado em <saida>/estudo-codigo/ (gravarEstudo da Parte 3a: .gitignore "*" e LEIA.md).
// Node puro, sem dependência: fala com o Chrome pelo protocolo DevTools que o raio-x já abre.

import { MUDANCAS, mudancasDeCss } from './movimento-quadros.mjs'
import { limpar, limparTudo, gravarEstudo, movCaixas, medidasDoAlvo, raizDe } from './movimento-codigo.mjs'

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const naOrdem = (conj) => MUDANCAS.filter((m) => conj.has(m))
const semRolagem = (acompanha = false) => ({ inicioTelas: null, fimTelas: null, inicioNaSecao: null, fimNaSecao: null, presa: false, presaTelas: 0, acompanha })

// ---------------------------------------------------------------------------------------------------------
// Dentro da página: gancho (antes de o site carregar) e leitura
// ---------------------------------------------------------------------------------------------------------

// Posto na página antes de ela carregar. Só anota; devolve sempre o que o navegador devolveu.
// - animationstart / transitionrun: a animação CSS sem `fill: forwards` some de getAnimations() ao acabar, então os
//   tempos e os quadros-chave são lidos NA HORA em que ela começa;
// - Element.prototype.animate: idem, para a animação criada por script;
// - shaderSource: guarda o texto (até 8 shaders, 20 kB cada);
// - última ação (mouse, clique, toque, rolagem): diz depois o que disparou cada animação.
function movEstGancho() {
  if (window.__movEstilos) return
  const S = window.__movEstilos = { eventos: [], shaders: [], cortou: 0, shadersFora: 0, ult: {} }
  const agora = () => Math.round(performance.now())
  try {
    for (const [ev, tipo] of [['pointermove', 'mouse'], ['mouseover', 'mouse'], ['pointerdown', 'clique'], ['click', 'clique'], ['touchstart', 'toque'], ['scroll', 'rolagem'], ['wheel', 'rolagem']]) {
      window.addEventListener(ev, () => { S.ult[tipo] = performance.now() }, { capture: true, passive: true })
    }
  } catch {}
  const apos = () => { const t = performance.now(); for (const k of ['clique', 'toque', 'rolagem', 'mouse']) if (S.ult[k] != null && t - S.ult[k] < 800) return k; return null }
  const tempos = (an) => {
    const t = an.effect.getComputedTiming()
    const quadros = an.effect.getKeyframes().slice(0, 12).map((k) => {
      const o = {}
      let n = 0
      for (const p in k) { if (/^(offset|computedOffset|easing|composite)$/.test(p) || n >= 12) continue; o[p.slice(0, 40)] = String(k[p]).slice(0, 80); n++ }
      return { em: typeof k.computedOffset === 'number' ? k.computedOffset : null, curva: String(k.easing || '').slice(0, 60), props: o }
    })
    const e = String(t.easing || 'linear')
    return { tm: { duracaoMs: Math.round(+t.duration || 0), atrasoMs: Math.round(+t.delay || 0), curva: (e !== 'linear' ? e : (quadros[0] && quadros[0].curva) || 'linear').slice(0, 60),
      repete: t.iterations === Infinity ? -1 : +t.iterations || 1, direcao: String(t.direction || 'normal'), preenche: String(t.fill || 'none') }, quadros }
  }
  const doEstilo = (el, pseudo, css, nome) => {
    const cs = getComputedStyle(el, pseudo || null), pre = css ? 'animation' : 'transition'
    const lista = (v) => String(v).split(/,(?![^(]*\))/).map((s) => s.trim())
    const ms = (v) => (/ms$/.test(v) ? parseFloat(v) : parseFloat(v) * 1000) || 0
    const nomes = lista(css ? cs.animationName : cs.transitionProperty)
    let i = nomes.indexOf(nome); if (i < 0) i = Math.max(0, nomes.indexOf('all'))
    const pega = (p) => { const l = lista(cs[pre + p]); return l[i % l.length] || '' }
    const vezes = css ? pega('IterationCount') : '1'
    return { tm: { duracaoMs: Math.round(ms(pega('Duration'))), atrasoMs: Math.round(ms(pega('Delay'))), curva: pega('TimingFunction').slice(0, 60), repete: vezes === 'infinite' ? -1 : parseFloat(vezes) || 1,
      direcao: css ? pega('Direction') : 'normal', preenche: css ? pega('FillMode') : 'none' }, quadros: css ? daRegra(nome) : null }
  }
  // Animação curta (150 ms) pode já ter acabado quando o animationstart chega: getAnimations() não a acha mais.
  // Os quadros-chave vêm então da regra @keyframes da folha (folha de outro endereço não deixa ler: fica nulo).
  const daRegra = (nome) => {
    const achar = (regras, nivel) => {
      for (const r of regras || []) {
        if (r.type === 7 && r.name === nome) return r
        if (nivel < 4 && r.cssRules) { const x = achar(r.cssRules, nivel + 1); if (x) return x }
      }
      return null
    }
    for (const f of document.styleSheets) {
      let k = null
      try { k = achar(f.cssRules, 0) } catch { continue }
      if (!k) continue
      const quadros = []
      for (const q of [...k.cssRules].slice(0, 12)) {
        const props = {}
        for (let i = 0; i < q.style.length && i < 12; i++) { const p = q.style[i]; props[p.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).slice(0, 40)] = q.style.getPropertyValue(p).slice(0, 80) }
        for (const t of String(q.keyText).split(',')) { const s = t.trim(), em = s === 'from' ? 0 : s === 'to' ? 1 : parseFloat(s) / 100; if (Number.isFinite(em)) quadros.push({ em, curva: '', props }) }
      }
      return quadros.sort((a, b) => a.em - b.em)
    }
    return null
  }
  // Ocorrência repetida (mesmo elemento, mesmo movimento, mesmo gatilho, mesmos tempos e valores) só soma `vezes`;
  // ocorrência DIFERENTE (outro gatilho, outros valores, outra duração) é guardada à parte. Teto declarado: 8
  // ocorrências distintas por elemento e movimento, 300 no total; o que passa disso conta em `cortou`.
  const guardar = (el, tipo, nome, pseudo, ler) => {
    let lido = { tm: null, quadros: null }
    try { lido = ler() } catch {}
    const quando = apos(), assina = JSON.stringify([quando, lido.tm, lido.quadros && lido.quadros.map((k) => [k.em, k.props])])
    const mesmos = S.eventos.filter((e) => e.el === el && e.tipo === tipo && e.nome === nome && e.pseudo === pseudo)
    const ja = mesmos.find((e) => e.assina === assina)
    if (ja) { ja.vezes++; return }
    if (mesmos.length >= 8 || S.eventos.length >= 300) { S.cortou++; return }
    S.eventos.push({ el, tipo, nome, pseudo, assina, tMs: agora(), apos: quando, vezes: 1, tm: lido.tm, quadros: lido.quadros })
  }
  const olhar = (ev) => {
    try {
      const el = ev.target
      if (!el || el.nodeType !== 1) return
      const css = ev.type === 'animationstart', nome = String(css ? ev.animationName : ev.propertyName).slice(0, 60), pseudo = String(ev.pseudoElement || '').slice(0, 20)
      guardar(el, css ? 'animacao' : 'transicao', nome, pseudo, () => {
        let an = null
        try { an = el.getAnimations({ subtree: true }).find((a) => a.effect && a.effect.target === el && (a.effect.pseudoElement || '') === pseudo && (css ? a.animationName === nome : a.transitionProperty === nome)) } catch {}
        return an ? tempos(an) : doEstilo(el, pseudo, css, nome)
      })
    } catch {}
  }
  try { for (const ev of ['animationstart', 'transitionrun']) document.addEventListener(ev, olhar, true) } catch {}
  try {
    const orig = Element.prototype.animate
    if (typeof orig === 'function') {
      Element.prototype.animate = function () {
        const r = orig.apply(this, arguments)
        try { const lido = tempos(r); guardar(this, 'animate', Object.keys((lido.quadros[0] || {}).props || {}).join('+').slice(0, 60), '', () => lido) } catch {}
        return r
      }
    }
  } catch {}
  try {
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!C || typeof C.prototype.shaderSource !== 'function') continue
      const o = C.prototype.shaderSource
      C.prototype.shaderSource = function (sh, src) {
        try {
          if (S.shaders.length < 8) {
            let tipo = null
            try { tipo = this.getShaderParameter(sh, this.SHADER_TYPE) === this.VERTEX_SHADER ? 'vertice' : 'fragmento' } catch {}
            const t = String(src)
            S.shaders.push({ canvas: this.canvas || null, tipo, texto: t.slice(0, 20000), cortado: t.length > 20000, tMs: agora() })
          } else S.shadersFora++
        } catch {}
        return o.apply(this, arguments)
      }
    }
  } catch {}
}

export const ganchosAntes = `(${movEstGancho})()`

// Descreve um elemento como dado simples (o mesmo formato de nome das outras partes: tag#id ou tag.classe).
function movEstAjuda() {
  const desc = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id && /^[\w-]{1,30}$/.test(el.id) ? '#' + el.id : ''
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).find((c) => /^[a-z][\w-]{0,30}$/i.test(c)) : ''
    return tag + id + (!id && cls ? '.' + cls : '')
  }
  const info = (el) => {
    if (!el || el.nodeType !== 1) return { desc: null, texto: '', posicaoPx: null, dataMov: null }
    let topo = null
    try { topo = Math.round(el.getBoundingClientRect().top + (window.scrollY || 0)) } catch {}
    // caixa, caixa do pai e fonte (movCaixas, de movimento-codigo.mjs, vai junto no texto do LER e do RESOLVER)
    const medidas = typeof movCaixas === 'function' ? movCaixas(el) : null
    return { desc: desc(el), texto: String(el.innerText || '').slice(0, 60), posicaoPx: topo, dataMov: (el.closest && el.closest('[data-mov]')?.getAttribute('data-mov')) || null, medidas }
  }
  return { desc, info }
}

// Depois de carregar: o que o gancho anotou, os canvas WebGL e os dados de interação do Webflow (como texto JSON).
function movEstLer() {
  const A = movEstAjuda(), S = window.__movEstilos
  let raizPx = null
  try { raizPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || null } catch {}
  const out = { gancho: !!S, vh: innerHeight, raizPx, eventos: [], shaders: [], cortou: S ? S.cortou : 0, shadersFora: S ? S.shadersFora : 0, webgl: 0,
    webflow: { sinal: false, exposto: false, json: null, erro: null } }
  if (S) {
    for (const e of S.eventos) out.eventos.push({ tipo: e.tipo, nome: e.nome, pseudo: e.pseudo, tMs: e.tMs, apos: e.apos, vezes: e.vezes, tm: e.tm, quadros: e.quadros, ...A.info(e.el) })
    S.telas = []
    for (const s of S.shaders) {
      let tela = s.canvas ? S.telas.indexOf(s.canvas) : -1
      if (s.canvas && tela < 0) tela = S.telas.push(s.canvas) - 1
      out.shaders.push({ ...A.info(s.canvas), tela, tipo: s.tipo, texto: s.texto, cortado: s.cortado, tMs: s.tMs })
    }
  }
  try { out.webgl = [...document.querySelectorAll('canvas')].filter((c) => /webgl/i.test(String(c.__movCtx || ''))).length } catch {}
  try {
    out.webflow.sinal = document.documentElement.hasAttribute('data-wf-site') || !!window.Webflow
    const ix = window.Webflow && typeof window.Webflow.require === 'function' ? window.Webflow.require('ix2') : null
    const d = ix && ix.store && typeof ix.store.getState === 'function' ? ix.store.getState().ixData : null
    if (d) {
      const j = JSON.stringify({ events: d.events || {}, actionLists: d.actionLists || {} })
      if (j.length <= 2000000) { out.webflow.exposto = true; out.webflow.json = j } else out.webflow.erro = 'dados de interação maiores que 2 MB'
    }
  } catch (e) { out.webflow.erro = String(e && e.message).slice(0, 120) }
  return out
}

// Acha na página os elementos de cada seletor lido do código (o seletor é dado: só entra em querySelectorAll) e
// diz quais condições de @media valem na tela de agora.
function movEstResolver(arg) {
  const A = movEstAjuda(), alvos = {}, midias = {}
  for (const s of ((arg && arg.seletores) || []).slice(0, 400)) {
    try {
      const els = document.querySelectorAll(s)
      if (!els.length) { alvos[s] = null; continue }
      const cs = getComputedStyle(els[0])
      alvos[s] = { ...A.info(els[0]), quantos: els.length, transicao: { propriedade: cs.transitionProperty, duracao: cs.transitionDuration, curva: cs.transitionTimingFunction, atraso: cs.transitionDelay } }
    } catch { alvos[s] = null }
  }
  for (const m of ((arg && arg.midias) || []).slice(0, 100)) { try { midias[m] = matchMedia(m).matches } catch { midias[m] = false } }
  // alvo relativo (Webflow CHILDREN / SIBLINGS): procurado dentro de cada elemento que dispara, nunca na página toda
  for (const r of ((arg && arg.relativos) || []).slice(0, 200)) {
    try {
      const achados = []
      for (const d of document.querySelectorAll(r.dispara)) {
        const l = r.quem === 'irmaos' ? [...(d.parentElement ? d.parentElement.children : [])].filter((x) => x !== d && x.matches(r.sel)) : [...d.querySelectorAll(r.sel)]
        for (const x of l) if (!achados.includes(x)) achados.push(x)
      }
      alvos[r.chave] = achados.length ? { ...A.info(achados[0]), quantos: achados.length } : null
    } catch { alvos[r.chave] = null }
  }
  return { alvos, midias }
}

// Retângulo (na página) do canvas número `i` dos que tiveram shader anotado, para o print de prova.
function movEstTela(i) {
  const c = window.__movEstilos && window.__movEstilos.telas ? window.__movEstilos.telas[i] : null
  if (!c || !c.isConnected) return null
  const r = c.getBoundingClientRect()
  return { x: r.left + (window.scrollX || 0), y: r.top + (window.scrollY || 0), w: r.width, h: r.height, naTela: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth }
}

// Prova visual de que o canvas se mexe: dois prints do canvas, `intervaloMs` um depois do outro. Uniforme de tempo
// declarado no shader NÃO prova movimento (o site pode nem desenhar). Devolve { mudou: true|false|null, motivo }.
export async function canvasMudou(nav, tela, { intervaloMs = 500 } = {}) {
  try {
    const r = await nav.rodar(movEstTela, tela, 10_000)
    if (!r || !(r.w >= 2 && r.h >= 2)) return { mudou: null, motivo: 'canvas sem tamanho ou fora da página' }
    const escala = Math.min(1, 200 / Math.max(r.w, r.h))
    const clip = { x: r.x, y: r.y, width: r.w, height: r.h, scale: escala }
    const print = async () => (await nav.cmd('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: !r.naTela }, 20_000)).data
    const a = await print()
    await espera(intervaloMs)
    const b = await print()
    return { mudou: a !== b, motivo: a !== b ? `o canvas mudou entre dois prints (${intervaloMs} ms)` : `o canvas ficou igual em dois prints (${intervaloMs} ms)` }
  } catch (e) { return { mudou: null, motivo: `não deu para fotografar o canvas: ${limpar(e && e.message, 100)}` } }
}

const LER = `() => { const movEstAjuda = ${movEstAjuda}; const movCaixas = ${movCaixas}; return (${movEstLer})() }`
const RESOLVER = `(arg) => { const movEstAjuda = ${movEstAjuda}; const movCaixas = ${movCaixas}; return (${movEstResolver})(arg) }`

// ---------------------------------------------------------------------------------------------------------
// CSS: leitura do texto das folhas (puras)
// ---------------------------------------------------------------------------------------------------------

const semComentario = (t) => String(t ?? '').replace(/\/\*[\s\S]*?\*\//g, ' ')

// Regras de primeiro nível de um texto CSS: [{ cabeca, corpo }]. Pula comentário e texto entre aspas, para a chave
// escrita dentro deles não contar.
function regrasCss(texto, max = 20000) {
  const t = String(texto ?? ''), n = t.length, out = []
  let i = 0, ini = 0
  const pula = () => {
    const c = t[i]
    if (c === '/' && t[i + 1] === '*') { const f = t.indexOf('*/', i + 2); i = f < 0 ? n : f + 2; return true }
    if (c === '"' || c === "'") { i++; while (i < n && t[i] !== c && t[i] !== '\n') { if (t[i] === '\\') i++; i++ } i++; return true }
    return false
  }
  while (i < n && out.length < max) {
    if (pula()) continue
    const c = t[i]
    if (c === ';' || c === '}') { ini = ++i; continue }
    if (c === '{') {
      const cabeca = semComentario(t.slice(ini, i)).replace(/\s+/g, ' ').trim(), a = ++i
      let prof = 1
      while (i < n && prof > 0) { if (pula()) continue; if (t[i] === '{') prof++; else if (t[i] === '}') prof--; i++ }
      out.push({ cabeca, corpo: t.slice(a, prof === 0 ? i - 1 : i) })
      ini = i
      continue
    }
    i++
  }
  return out
}

// Declarações "propriedade: valor" de um bloco. Regra aninhada dentro do bloco é pulada.
function declaracoes(corpo) {
  const t = semComentario(corpo), out = []
  let i = 0, ini = 0, par = 0
  const fecha = (fim) => {
    const d = t.slice(ini, fim), k = d.indexOf(':')
    if (k <= 0) return
    const p = d.slice(0, k).trim().toLowerCase()
    if (/^-{0,2}[a-z][\w-]*$/.test(p)) out.push([p, d.slice(k + 1).replace(/!important\s*$/i, '').replace(/\s+/g, ' ').trim()])
  }
  while (i < t.length) {
    const c = t[i]
    if (c === '"' || c === "'") { i++; while (i < t.length && t[i] !== c) { if (t[i] === '\\') i++; i++ } }
    else if (c === '(') par++
    else if (c === ')') par = Math.max(0, par - 1)
    else if (c === '{' && !par) { let p = 1; i++; while (i < t.length && p > 0) { if (t[i] === '{') p++; else if (t[i] === '}') p--; i++ } ini = i; continue }
    else if (c === ';' && !par) { fecha(i); ini = i + 1 }
    i++
  }
  fecha(t.length)
  return out
}

// Percorre as regras, entrando em @media, @supports, @layer e @container.
function percorrer(texto, visita, midia = null, nivel = 0) {
  for (const r of regrasCss(texto)) {
    if (/^@(media|supports|layer|container|document)\b/i.test(r.cabeca)) { if (nivel < 6) percorrer(r.corpo, visita, /^@media\b/i.test(r.cabeca) ? r.cabeca.replace(/^@media\s*/i, '') : midia, nivel + 1) }
    else visita(r, midia)
  }
}

// Corta um valor nas vírgulas (sep ',') ou nos espaços, sem cortar dentro de parênteses.
function pedacos(v, sep) {
  const t = String(v ?? ''), out = []
  let par = 0, a = 0
  for (let i = 0; i <= t.length; i++) {
    const c = t[i]
    if (c === '(') par++
    else if (c === ')') par = Math.max(0, par - 1)
    if (i === t.length || (!par && (sep === ',' ? c === ',' : /\s/.test(c)))) { const s = t.slice(a, i).trim(); if (s) out.push(s); a = i + 1 }
  }
  return out
}

const CURVA = /^(ease|linear|ease-in|ease-out|ease-in-out|step-start|step-end|(cubic-bezier|steps|linear)\(.*\))$/i
const emMs = (v) => { const m = /^(-?\d*\.?\d+)(ms|s)$/i.exec(String(v).trim()); return m ? Math.round(parseFloat(m[1]) * (m[2].toLowerCase() === 's' ? 1000 : 1)) : null }

// Um trecho de `transition` ou `animation` (entre vírgulas) → campos. Valor em var(...) fica nulo: não é inventado.
function trecho(v, animacao) {
  const o = { tempos: [], curva: null, nome: null, repete: null, direcao: null, preenche: null, variavel: false }
  for (const p of pedacos(v, ' ')) {
    const ms = emMs(p)
    if (ms != null) o.tempos.push(ms)
    else if (/^var\(/i.test(p)) o.variavel = true
    else if (CURVA.test(p)) o.curva = p
    else if (animacao && (/^infinite$/i.test(p) || /^\d*\.?\d+$/.test(p))) o.repete = /^infinite$/i.test(p) ? -1 : parseFloat(p)
    else if (animacao && /^(normal|reverse|alternate|alternate-reverse)$/i.test(p)) o.direcao = p.toLowerCase()
    else if (animacao && /^(forwards|backwards|both)$/i.test(p)) o.preenche = p.toLowerCase()
    else if (animacao && /^(running|paused)$/i.test(p)) continue
    else if (o.nome == null) o.nome = p
  }
  return o
}

// `transition` / `animation` de um bloco (forma curta e as propriedades soltas, que valem por cima da curta).
function movimentosDoBloco(decl, animacao) {
  const pre = animacao ? 'animation' : 'transition', mapa = new Map()
  for (const [p, v] of decl) { const k = p.replace(/^-(webkit|moz|o|ms)-/, ''); if (k === pre || k.startsWith(pre + '-')) mapa.set(k, v) }
  if (!mapa.size) return []
  const curta = mapa.has(pre) ? pedacos(mapa.get(pre), ',').map((x) => trecho(x, animacao)) : []
  const solta = (suf) => (mapa.has(`${pre}-${suf}`) ? pedacos(mapa.get(`${pre}-${suf}`), ',') : null)
  const nomes = solta(animacao ? 'name' : 'property'), dur = solta('duration'), cur = solta('timing-function'), atr = solta('delay')
  const rep = animacao ? solta('iteration-count') : null, dir = animacao ? solta('direction') : null, pree = animacao ? solta('fill-mode') : null
  const n = Math.max(curta.length, nomes ? nomes.length : 0, !curta.length && dur ? 1 : 0)
  const da = (l, i) => (l && l.length ? l[i % l.length] : null)
  const out = []
  for (let i = 0; i < n && out.length < 12; i++) {
    const c = curta[i] || { tempos: [], variavel: false }
    const nome = da(nomes, i) ?? c.nome ?? (animacao ? null : 'all')
    if (!nome || /^none$/i.test(nome)) continue
    const variavel = c.variavel || [da(dur, i), da(atr, i)].some((x) => x && /^var\(/i.test(x))
    const d = da(dur, i) != null ? emMs(da(dur, i)) : c.tempos[0] ?? (variavel ? null : 0)
    const a = da(atr, i) != null ? emMs(da(atr, i)) : c.tempos[1] ?? (variavel ? null : 0)
    const base = { duracaoMs: d, curva: limpar(da(cur, i) ?? c.curva ?? 'ease', 60), atrasoMs: a }
    if (!animacao) { out.push({ propriedade: limpar(nome, 60), ...base }); continue }
    const r = da(rep, i)
    out.push({ nome: limpar(nome, 60), ...base, repete: r != null ? (/^infinite$/i.test(r) ? -1 : parseFloat(r) || 1) : c.repete ?? 1,
      direcao: limpar(da(dir, i) ?? c.direcao ?? 'normal', 20), preenche: limpar(da(pree, i) ?? c.preenche ?? 'none', 20) })
  }
  return out
}

// @keyframes de um texto CSS: [{ nome, passos: [{ em: [0..1], props }], propriedades }]. Pura.
export function extrairKeyframes(texto, { max = 200 } = {}) {
  const out = []
  percorrer(texto, (r) => {
    const m = /^@(?:-webkit-|-moz-|-o-)?keyframes\s+(.+)$/i.exec(r.cabeca)
    if (!m || out.length >= max) return
    const passos = [], todas = new Set()
    for (const p of regrasCss(r.corpo, 40)) {
      const em = pedacos(p.cabeca, ',').map((x) => (/^from$/i.test(x) ? 0 : /^to$/i.test(x) ? 1 : /^-?\d*\.?\d+%$/.test(x) ? parseFloat(x) / 100 : null)).filter((x) => x != null && x >= 0 && x <= 1)
      if (!em.length) continue
      const props = {}
      for (const [k, v] of declaracoes(p.corpo).slice(0, 16)) { props[limpar(k, 40)] = limpar(v, 80); todas.add(limpar(k, 40)) }
      passos.push({ em, props })
    }
    passos.sort((a, b) => a.em[0] - b.em[0])
    out.push({ nome: limpar(m[1].replace(/^["']|["']$/g, ''), 60), passos, propriedades: [...todas] })
  })
  return out
}

// `transition` e `animation` por seletor, e as regras `:hover` com o que mudam. Pura.
// [{ seletor, midia, hover, transicoes: [{ propriedade, duracaoMs, curva, atrasoMs }], animacoes: [{ nome, ... }], declara }]
export function extrairTransicoes(texto, { max = 2000 } = {}) {
  const out = []
  percorrer(texto, (r, midia) => {
    if (r.cabeca.startsWith('@') || !r.cabeca || out.length >= max) return
    const hover = /:hover\b/i.test(r.cabeca)
    if (!hover && !/transition|animation/i.test(r.corpo)) return
    const decl = declaracoes(r.corpo)
    const transicoes = movimentosDoBloco(decl, false), animacoes = movimentosDoBloco(decl, true)
    if (!hover && !transicoes.length && !animacoes.length) return
    let declara = null
    if (hover) {
      declara = {}
      for (const [k, v] of decl) { if (/^(-\w+-)?(transition|animation)/.test(k) || Object.keys(declara).length >= 12) continue; declara[limpar(k, 40)] = limpar(v, 80) }
    }
    out.push({ seletor: limpar(r.cabeca, 200), midia: midia ? limpar(midia, 120) : null, hover, transicoes, animacoes, declara })
  })
  return out
}

// Valores CSS de um quadro-chave ou de uma regra → nomes do contrato (xPx, yPx, escala, opacidade, desfoquePx...).
// O que não é número puro fica como texto, do jeito que o site escreveu (dado do site). Pura.
export function valoresDeCss(props) {
  if (!props || typeof props !== 'object') return null
  const o = {}
  const num = (v) => { const m = /^\s*(-?\d*\.?\d+)(px|deg)?\s*$/.exec(String(v)); return m ? parseFloat(m[1]) : null }
  const poe = (emNumero, emTexto, v) => { const n = num(v); if (n != null) o[emNumero] = n; else if (v != null && v !== '') o[emTexto] = limpar(v, 80) }
  for (const [k0, v0] of Object.entries(props)) {
    const k = String(k0).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), v = String(v0 ?? '')
    if (k === 'opacity') poe('opacidade', 'opacidade', v)
    else if (k === 'transform') {
      let achou = false
      for (const m of v.matchAll(/(translate3d|translateX|translateY|translate|scaleX|scaleY|scale|rotateZ|rotate|matrix)\(([^)]*)\)/g)) {
        const a = m[2].split(',').map((s) => s.trim())
        achou = true
        if (m[1] === 'translateX') poe('xPx', 'x', a[0])
        else if (m[1] === 'translateY') poe('yPx', 'y', a[0])
        else if (m[1] === 'translate' || m[1] === 'translate3d') { poe('xPx', 'x', a[0]); poe('yPx', 'y', a[1] ?? '0') }
        else if (m[1] === 'scale') { if (a[1] == null || a[1] === a[0]) poe('escala', 'escala', a[0]); else { poe('escalaX', 'escalaX', a[0]); poe('escalaY', 'escalaY', a[1]) } }
        else if (m[1] === 'scaleX') poe('escalaX', 'escalaX', a[0])
        else if (m[1] === 'scaleY') poe('escalaY', 'escalaY', a[0])
        else if (m[1] === 'matrix' && a.length === 6) { const n = a.map(Number); if (n.every(Number.isFinite)) { o.xPx = n[4]; o.yPx = n[5]; o.escala = Math.round(Math.hypot(n[0], n[1]) * 1000) / 1000 } }
        else poe('rotacaoGraus', 'rotacao', a[0])
      }
      if (!achou) o.transformacao = limpar(v, 80)
    } else if (k === 'filter' || k === 'backdrop-filter') {
      const b = /blur\(\s*(-?\d*\.?\d+)px\s*\)/i.exec(v), br = /brightness\(\s*(-?\d*\.?\d+)(%?)\s*\)/i.exec(v)
      if (b) o.desfoquePx = parseFloat(b[1])
      if (br) o.brilho = br[2] ? parseFloat(br[1]) / 100 : parseFloat(br[1])
      if (!b && !br) o.filtro = limpar(v, 80)
    } else if (k === 'translate') { const a = pedacos(v, ' '); poe('xPx', 'x', a[0]); if (a[1] != null) poe('yPx', 'y', a[1]) }
    else if (k === 'scale') poe('escala', 'escala', pedacos(v, ' ')[0])
    else if (k === 'rotate') poe('rotacaoGraus', 'rotacao', v)
    else if (k === 'width') poe('larguraPx', 'largura', v)
    else if (k === 'height') poe('alturaPx', 'altura', v)
    else if (k === 'color') o.cor = limpar(v, 80)
    else if (k === 'background-color' || k === 'background') o.fundo = limpar(v, 80)
    else if (k === 'letter-spacing') poe('entreLetrasPx', 'entreLetras', v)
    else if (k === 'clip-path') o.recorte = limpar(v, 80)
    else if (k === 'visibility' || k === 'display') o.visibilidade = limpar(v, 40)
    else o[limpar(k, 40)] = limpar(v, 80)
  }
  return Object.keys(o).length ? o : null
}

const mudaDe = (props) => naOrdem(new Set(mudancasDeCss(Object.entries(props || {}).map(([prop, v]) => ({ prop, valores: [String(v)] })))))

// ---------------------------------------------------------------------------------------------------------
// Do que o gancho anotou para o contrato
// ---------------------------------------------------------------------------------------------------------

// Animações CSS, transições e Element.animate anotadas na hora em que começaram → itens do contrato. Pura.
// Gatilho: o que o visitante fez até 0,8 s antes (mouse, clique, toque, rolagem); sem ação, laço sem fim é `parado`,
// até 8 s depois de abrir é `carregar` e, mais tarde que isso, sai `rolagem` com confiança baixa (conferir).
export function itensDosEventos(lido, { pagina = 'inicio', max = 120 } = {}) {
  const L = limparTudo(lido || {}, 80)
  const grupos = new Map()
  let semMudanca = 0, cortados = 0
  for (const e of L.eventos || []) {
    if (!e || !e.desc) continue
    const q = Array.isArray(e.quadros) ? e.quadros.filter((x) => x && x.props) : []
    const valores = {}
    for (const k of q) for (const [p, v] of Object.entries(k.props)) (valores[p] ||= []).push(String(v))
    let muda = naOrdem(new Set(mudancasDeCss(Object.entries(valores).map(([prop, v]) => ({ prop, valores: v })))))
    if (!muda.length && e.tipo === 'transicao') muda = naOrdem(new Set(mudancasDeCss([{ prop: e.nome, valores: [] }])))
    if (!muda.length) { semMudanca++; continue }
    const tm = e.tm || {}
    const laco = tm.repete === -1
    const gatilho = e.apos && ['mouse', 'clique', 'toque', 'rolagem'].includes(e.apos) ? e.apos : laco ? 'parado' : e.tMs == null || e.tMs <= 8000 ? 'carregar' : 'rolagem'
    const incerto = !e.apos && gatilho === 'rolagem'
    // só junta (quantos > 1, escada) o que faz o MESMO caminho: mesmos quadros-chave e valores, mesma duração, curva,
    // repetição e direção. Só o atraso pode mudar (é a escada). Um indo a 100px e outro a -100px são dois itens.
    const { atrasoMs: _a, ...semAtraso } = tm
    const trajetoria = JSON.stringify([q.map((k) => [k.em ?? null, k.props]), semAtraso])
    const chave = [e.tipo, e.nome, e.pseudo || '', e.desc, gatilho, trajetoria].join('|')
    const g = grupos.get(chave)
    if (g) { g.quantos++; g.atrasos.push(tm.atrasoMs || 0); g.vezes += e.vezes || 1; continue }
    if (grupos.size >= max) { cortados++; continue }
    grupos.set(chave, { e, q, muda, tm, gatilho, incerto, quantos: 1, atrasos: [tm.atrasoMs || 0], vezes: e.vezes || 1 })
  }
  const itens = []
  for (const { e, q, muda, tm, gatilho, incerto, quantos, atrasos, vezes } of grupos.values()) {
    const min = Math.min(...atrasos), maxA = Math.max(...atrasos)
    const oQue = e.tipo === 'animacao' ? `animação CSS "${e.nome}"` : e.tipo === 'transicao' ? `transição CSS de ${e.nome}` : 'Element.animate (Web Animations)'
    const ordem = 1 + itens.filter((x) => x.gatilho === gatilho && x.alvo.desc === e.desc && x.muda.join() === muda.join()).length
    itens.push({
      pagina, secao: null, posicaoPx: e.posicaoPx ?? null, gatilho, ordem,
      alvo: { desc: e.desc + (e.pseudo || ''), texto: limpar(e.texto || '', 60), quantos, dataMov: e.dataMov || null, ...(e.pseudo ? {} : medidasDoAlvo(e.medidas)) },
      quemMuda: ['proprio'], muda, de: q.length > 1 ? valoresDeCss(q[0].props) : null, para: q.length ? valoresDeCss(q[q.length - 1].props) : null,
      duracaoMs: tm.duracaoMs ?? null, curva: tm.curva || null, atrasoMs: min, escadaMs: quantos > 1 && maxA > min ? Math.round((maxA - min) / (quantos - 1)) : 0,
      rolagem: gatilho === 'rolagem' ? semRolagem(false) : null, fontes: ['css'], confianca: incerto ? 'baixa' : e.apos ? 'media' : 'alta',
      tecnica: `${oQue}, anotada na hora em que começou` + (tm.repete === -1 ? ', em laço sem fim' : '') + (e.apos ? `; começou logo depois de ${e.apos} (até 0,8 s)` : '')
        + (incerto ? `; começou ${Math.round(e.tMs / 10) / 100} s depois de a página abrir, sem ação conhecida antes (conferir o gatilho)` : ''),
      resumo: `${e.desc} muda ${muda.join(', ')}${gatilho === 'parado' ? ' em laço' : gatilho === 'carregar' ? ' quando a página abre' : ` (${gatilho})`}`,
      quadros: null, quadrosBrutos: [],
      codigo: { biblioteca: e.tipo === 'animate' ? 'waapi' : 'css', tipo: e.tipo, nome: e.nome, passos: q.map((k) => ({ em: k.em ?? null, curva: k.curva || null, valores: valoresDeCss(k.props) })),
        repete: tm.repete ?? 1, direcao: tm.direcao || 'normal', preenche: tm.preenche || 'none', vezes, apos: e.apos || null },
    })
  }
  // mouse/toque: a volta (mesmo elemento, caminho ao contrário: `de` de uma é o `para` da outra) entra como `saida`
  // do item da ida, como nas Partes 2 e 2b (entrada e saída do mouse são UM item).
  const igual = (a, b) => a != null && b != null && JSON.stringify(a) === JSON.stringify(b)
  for (let i = 0; i < itens.length; i++) {
    const ida = itens[i]
    if (!['mouse', 'toque'].includes(ida.gatilho) || ida.saida) continue
    const j = itens.findIndex((v, k) => k > i && v.gatilho === ida.gatilho && v.alvo.desc === ida.alvo.desc && v.muda.join() === ida.muda.join() && igual(v.de, ida.para) && igual(v.para, ida.de))
    if (j < 0) continue
    const volta = itens.splice(j, 1)[0]
    ida.saida = { duracaoMs: volta.duracaoMs, curva: volta.curva, voltou: true }
    for (const v of itens) if (v !== ida && v.gatilho === ida.gatilho && v.alvo.desc === ida.alvo.desc && v.muda.join() === ida.muda.join() && v.ordem > volta.ordem) v.ordem--
  }
  return { itens, semMudanca, cortados }
}

// Regras `:hover` das folhas que acham elemento na página e têm transição → itens de mouse. Pura.
// `alvos` e `midias` vêm de movEstResolver. A transição é a da própria regra :hover ou, sem ela, a que o elemento
// tem no estado normal (lida do estilo calculado).
export function itensDoHover(regras, alvos = {}, midias = {}, { pagina = 'inicio', max = 60 } = {}) {
  const itens = []
  let semTransicao = 0, cortados = 0
  for (const r of regras || []) {
    if (!r.hover || !r.declara || (r.midia && !midias[r.midia])) continue
    const muda = mudaDe(r.declara)
    if (!muda.length) continue
    for (const parte of pedacos(r.seletor, ',')) {
      if (!/:hover\b/i.test(parte)) continue
      const base = baseDoHover(parte), a = alvos[base]
      if (!a || !a.desc) continue
      const t = a.transicao || {}
      const doElemento = pedacos(t.propriedade, ',').map((p, i, l) => {
        const da = (v) => { const x = pedacos(v, ','); return x.length ? x[i % x.length] : null }
        return { propriedade: p, duracaoMs: emMs(da(t.duracao)) ?? 0, curva: da(t.curva) || 'ease', atrasoMs: emMs(da(t.atraso)) ?? 0 }
      })
      const props = Object.keys(r.declara)
      const serve = (l) => l.filter((x) => x.propriedade === 'all' || props.includes(x.propriedade)).sort((x, y) => (y.duracaoMs || 0) + (y.atrasoMs || 0) - (x.duracaoMs || 0) - (x.atrasoMs || 0))[0] || null
      const volta = serve(doElemento), ida = serve(r.transicoes || []) || volta
      if (!ida || !(ida.duracaoMs > 0)) { semTransicao++; continue }
      // quem dispara: em `.cartao:hover .foto` o mouse entra no cartão e quem muda é a foto (filho dele)
      const d = disparoDoHover(parte), ad = d.quemMuda === 'proprio' ? a : alvos[d.seletor]
      const disparo = { desc: ad && ad.desc ? limpar(ad.desc, 60) : null, seletor: limpar(d.seletor, 120), quemMuda: d.quemMuda, quantos: ad ? ad.quantos || 1 : null }
      const ja = itens.find((x) => x.alvo.desc === a.desc && x.muda.join() === muda.join() && x.disparo.desc === disparo.desc && x.disparo.quemMuda === disparo.quemMuda)
      if (ja) { if (!ja.codigo.seletores.includes(parte)) ja.codigo.seletores.push(limpar(parte, 120)); continue }
      if (itens.length >= max) { cortados++; continue }
      itens.push({
        pagina, secao: null, posicaoPx: a.posicaoPx ?? null, gatilho: 'mouse', ordem: 1,
        alvo: { desc: limpar(a.desc, 60), texto: limpar(a.texto || '', 60), quantos: a.quantos || 1, dataMov: a.dataMov ? limpar(a.dataMov, 20) : null, ...(/::?(before|after)/i.test(parte) ? {} : medidasDoAlvo(a.medidas)) }, disparo,
        quemMuda: ['proprio'], muda, de: null, para: valoresDeCss(r.declara),
        duracaoMs: ida.duracaoMs, curva: limpar(ida.curva, 60), atrasoMs: ida.atrasoMs || 0, escadaMs: 0, rolagem: null,
        saida: volta && volta.duracaoMs > 0 ? { duracaoMs: volta.duracaoMs, curva: limpar(volta.curva, 60), voltou: true } : null,
        fontes: ['css'], confianca: 'media',
        tecnica: 'regra :hover com transition, lida da folha de estilo (não foi passado o mouse aqui: outra regra pode valer por cima)',
        resumo: `${limpar(a.desc, 60)} muda ${muda.join(', ')} com o mouse em cima`, quadros: null, quadrosBrutos: [],
        codigo: { biblioteca: 'css', tipo: 'hover', seletores: [limpar(parte, 120)], midia: r.midia || null },
      })
    }
  }
  return { itens, semTransicao, cortados }
}

// `.cartao:hover .foto::after` → `.cartao .foto` (o elemento que muda, sem o estado do mouse nem o pseudo-elemento).
export function baseDoHover(seletor) {
  return String(seletor ?? '').replace(/:hover\b/gi, '').replace(/::?(before|after|first-line|first-letter|marker|placeholder)\b/gi, '').replace(/\s+/g, ' ').trim()
}

// Quem dispara um `:hover` (ou `:focus`, `:focus-within`, `:active`) e onde fica quem muda, no vocabulário de `quemMuda`:
// `.botao:hover` → { seletor: '.botao', quemMuda: 'proprio' }; `.cartao:hover .foto` e `.menu:hover > a` →
// { seletor: '.cartao', quemMuda: 'filhos' } (descendente); `.a:hover + .b` e `.a:hover ~ .b` → irmaos. Vale o
// ÚLTIMO pedaço com o estado; o combinador logo depois dele decide filhos/irmãos. Pura.
export function disparoDoHover(seletor) {
  const t = String(seletor ?? ''), partes = [], juntas = []
  let prof = 0, atual = '', comb = null
  for (const c of t) {
    if (c === '(' || c === '[') prof++
    else if (c === ')' || c === ']') prof = Math.max(0, prof - 1)
    if (!prof && /[\s>+~]/.test(c)) { if (c !== ' ' && !/\s/.test(c)) comb = c; else if (comb == null && atual) comb = ' '; if (atual) { partes.push(atual); atual = '' } continue }
    if (!atual && partes.length) { juntas.push(comb || ' '); comb = null }
    atual += c
  }
  if (atual) partes.push(atual)
  const estado = /:(hover|focus-within|focus-visible|focus|active)\b/i
  let k = -1
  partes.forEach((p, i) => { if (estado.test(p)) k = i })
  const limpo = (l, js) => baseDoHover(l.map((p, i) => (i ? ` ${js[i - 1] === ' ' ? '' : js[i - 1] + ' '}` : '') + p).join('').replace(/:(focus-within|focus-visible|focus|active)\b/gi, ''))
  if (k < 0 || k === partes.length - 1) return { seletor: limpo(partes, juntas), quemMuda: 'proprio' }
  return { seletor: limpo(partes.slice(0, k + 1), juntas), quemMuda: /[+~]/.test(juntas[k]) ? 'irmaos' : 'filhos' }
}

// ---------------------------------------------------------------------------------------------------------
// Webflow (interações IX2)
// ---------------------------------------------------------------------------------------------------------

const GATILHO_WF = { MOUSE_OVER: 'mouse', MOUSE_OUT: 'mouse', MOUSE_MOVE: 'mouse', MOUSE_MOVE_IN_VIEWPORT: 'mouse', MOUSE_CLICK: 'clique', MOUSE_SECOND_CLICK: 'clique', MOUSE_DOWN: 'clique', MOUSE_UP: 'clique',
  NAVBAR_OPEN: 'clique', NAVBAR_CLOSE: 'clique', DROPDOWN_OPEN: 'clique', DROPDOWN_CLOSE: 'clique', TAB_ACTIVE: 'clique', TAB_INACTIVE: 'clique',
  SCROLL_INTO_VIEW: 'rolagem', SCROLL_OUT_OF_VIEW: 'rolagem', SCROLLING_IN_VIEW: 'rolagem', PAGE_SCROLL: 'rolagem', PAGE_SCROLL_UP: 'rolagem', PAGE_SCROLL_DOWN: 'rolagem',
  PAGE_START: 'carregar', PAGE_FINISH: 'carregar' }
const SAIDA_WF = { MOUSE_OUT: 'MOUSE_OVER', MOUSE_SECOND_CLICK: 'MOUSE_CLICK', NAVBAR_CLOSE: 'NAVBAR_OPEN', DROPDOWN_CLOSE: 'DROPDOWN_OPEN', TAB_INACTIVE: 'TAB_ACTIVE' }
const EFEITO_WF = { FADE: ['opacidade'], SLIDE: ['posicao-y', 'opacidade'], FLY: ['posicao-y', 'opacidade'], DROP: ['posicao-y', 'opacidade'], GROW: ['escala', 'opacidade'], SHRINK: ['escala', 'opacidade'],
  GROW_BIG: ['escala', 'opacidade'], SHRINK_BIG: ['escala', 'opacidade'], SPIN: ['rotacao', 'opacidade'], FLIP: ['rotacao', 'opacidade'], POP: ['escala'], JIGGLE: ['rotacao'], PULSE: ['escala'], BOUNCE: ['posicao-y'] }

// Alvo do Webflow ({ selector } ou { id: "pagina|elemento" }) → seletor CSS. Só aceita o que tem cara de seletor.
function seletorWf(t) {
  if (!t || typeof t !== 'object') return null
  if (typeof t.selector === 'string' && t.selector.trim() && t.selector.length <= 200) return t.selector.trim()
  const id = typeof t.id === 'string' ? t.id.split('|').pop() : null
  return id && /^[\w-]{1,80}$/.test(id) ? `[data-w-id="${id}"]` : null
}

// Uma ação do Webflow → o que muda e os valores, nos nomes do contrato.
function acaoWf(tipo, c = {}) {
  const muda = [], v = {}
  const un = (u) => String(u ?? 'px').toLowerCase()
  const eixo = (valor, unidade, emPx, emTexto) => { if (typeof valor !== 'number') return false; if (un(unidade) === 'px') v[emPx] = valor; else v[emTexto] = `${valor}${un(unidade)}`; return true }
  if (tipo === 'TRANSFORM_MOVE') { if (eixo(c.xValue, c.xUnit, 'xPx', 'x')) muda.push('posicao-x'); if (eixo(c.yValue, c.yUnit, 'yPx', 'y')) muda.push('posicao-y') }
  else if (tipo === 'TRANSFORM_SCALE') {
    if (typeof c.xValue === 'number' || typeof c.yValue === 'number') { muda.push('escala'); if (c.xValue === c.yValue || c.yValue == null) v.escala = c.xValue; else { if (c.xValue != null) v.escalaX = c.xValue; v.escalaY = c.yValue } }
  } else if (tipo === 'TRANSFORM_ROTATE' || tipo === 'TRANSFORM_SKEW') {
    for (const [k, nome] of [['zValue', 'rotacaoGraus'], ['xValue', 'rotacaoXGraus'], ['yValue', 'rotacaoYGraus']]) if (typeof c[k] === 'number') { v[tipo === 'TRANSFORM_SKEW' ? nome.replace('rotacao', 'inclinacao') : nome] = c[k]; if (!muda.length) muda.push('rotacao') }
  } else if (tipo === 'STYLE_OPACITY') { if (typeof c.value === 'number') { muda.push('opacidade'); v.opacidade = c.value } }
  else if (tipo === 'STYLE_FILTER') {
    for (const f of Array.isArray(c.filters) ? c.filters.slice(0, 6) : []) {
      if (!f || typeof f.value !== 'number') continue
      if (f.type === 'blur') { muda.push('desfoque'); v.desfoquePx = f.value } else if (f.type === 'brightness') { muda.push('brilho'); v.brilho = un(f.unit) === '%' ? f.value / 100 : f.value }
    }
  } else if (tipo === 'STYLE_SIZE') { if (eixo(c.widthValue, c.widthUnit, 'larguraPx', 'largura')) muda.push('largura'); if (eixo(c.heightValue, c.heightUnit, 'alturaPx', 'altura')) muda.push('altura') }
  else if (tipo === 'STYLE_BACKGROUND_COLOR' || tipo === 'STYLE_TEXT_COLOR') {
    if ([c.rValue, c.gValue, c.bValue].every((x) => typeof x === 'number')) { const k = tipo === 'STYLE_TEXT_COLOR' ? 'cor' : 'fundo'; muda.push(k); v[k] = `rgba(${c.rValue}, ${c.gValue}, ${c.bValue}, ${typeof c.aValue === 'number' ? c.aValue : 1})` }
  } else if (tipo === 'GENERAL_DISPLAY') { if (typeof c.value === 'string') { muda.push('visibilidade'); v.visibilidade = c.value } }
  return { muda, valores: v }
}

// Dados de interação do Webflow (ixData: events + actionLists) → itens do contrato. Pura.
// `alvos` (opcional, de movEstResolver): com ele, alvo que não está na página fica de fora e o item ganha o
// elemento achado; sem ele, o alvo é o seletor escrito nos dados.
// Alvo relativo (`useEventTarget: CHILDREN` / `SIBLINGS`) se procura DENTRO de quem dispara: a chave em `alvos` é
// `filhos|<seletor de quem dispara>|<seletor do alvo>` (ou `irmaos|…`), resolvida por movEstResolver.
export const chaveRelativa = (quem, dispara, sel) => `${quem}|${dispara ?? ''}|${sel}`
export const LIMITES_WF = { eventos: 600, grupos: 40, acoes: 40, parametros: 4 }

export function itensDoWebflow(ixData, { pagina = 'inicio', alvos = null, max = 200 } = {}) {
  const D = limparTudo(ixData || {}, 120) || {}
  const eventos = D.events && typeof D.events === 'object' ? Object.values(D.events) : []
  const listas = D.actionLists && typeof D.actionLists === 'object' ? D.actionLists : {}
  const L = LIMITES_WF
  const itens = [], cont = { eventos: eventos.length, listas: Object.keys(listas).length, semGatilho: 0, semLista: 0, semMudanca: 0, foraDaPagina: 0, cortados: 0,
    cortes: { eventos: Math.max(0, eventos.length - L.eventos), grupos: 0, acoes: 0, parametros: 0 } }
  for (const ev of eventos.slice(0, L.eventos)) {
    if (!ev || typeof ev !== 'object') continue
    const tipoEv = String(ev.eventTypeId || ''), gatilho = GATILHO_WF[tipoEv]
    if (!gatilho) { cont.semGatilho++; continue }
    const alvoEv = seletorWf(ev.target) || (Array.isArray(ev.targets) ? ev.targets.map(seletorWf).find(Boolean) : null)
    const acao = ev.action && typeof ev.action === 'object' ? ev.action : {}, cfg = acao.config && typeof acao.config === 'object' ? acao.config : {}
    if (alvos && alvoEv && !alvos[alvoEv]) { cont.foraDaPagina++; continue } // quem dispara não está nesta página
    const lista = listas[cfg.actionListId]
    const porAlvo = new Map()
    let continuo = false, inicial = false, titulo = ''
    const poe = (sel, quem, passo) => { if (!sel) return; const k = quem + '|' + sel; if (!porAlvo.has(k)) porAlvo.set(k, { sel, quem, passos: [] }); porAlvo.get(k).passos.push(passo) }
    if (lista && typeof lista === 'object') {
      titulo = String(lista.title || '')
      let grupos = []
      if (Array.isArray(lista.continuousParameterGroups) && lista.continuousParameterGroups.length) {
        continuo = true
        cont.cortes.parametros += Math.max(0, lista.continuousParameterGroups.length - L.parametros)
        for (const pg of lista.continuousParameterGroups.slice(0, L.parametros)) for (const g of [...(Array.isArray(pg && pg.continuousActionGroups) ? pg.continuousActionGroups : [])].sort((a, b) => (a.keyframe || 0) - (b.keyframe || 0))) grupos.push({ em: (g.keyframe || 0) / 100, itens: g.actionItems })
      } else {
        inicial = !!lista.useFirstGroupAsInitialState
        grupos = (Array.isArray(lista.actionItemGroups) ? lista.actionItemGroups : []).map((g, i) => ({ grupo: i, itens: g && g.actionItems }))
      }
      cont.cortes.grupos += Math.max(0, grupos.length - L.grupos)
      grupos = grupos.slice(0, L.grupos).map((g) => {
        const l = Array.isArray(g.itens) ? g.itens : []
        cont.cortes.acoes += Math.max(0, l.length - L.acoes)
        return { ...g, itens: l.slice(0, L.acoes) }
      })
      // Linha do tempo da lista INTEIRA: cada grupo começa quando o anterior acaba (o mais longo dos seus itens, de
      // qualquer alvo). Com `useFirstGroupAsInitialState`, o grupo 0 é posto na hora (dura 0).
      const cfgDe = (it) => (it && it.config && typeof it.config === 'object' ? it.config : {})
      const comp = grupos.map((g, gi) => (continuo || (inicial && gi === 0) ? 0 : Math.max(0, ...g.itens.map((it) => { const c = cfgDe(it); return (typeof c.duration === 'number' ? c.duration : 0) + (typeof c.delay === 'number' ? c.delay : 0) }))))
      const inicioDo = []
      comp.forEach((x, gi) => { inicioDo[gi] = gi ? inicioDo[gi - 1] + comp[gi - 1] : 0 })
      grupos.forEach((g, gi) => {
        for (const it of g.itens) {
          const c = cfgDe(it), t = c.target && typeof c.target === 'object' ? c.target : {}
          const u = t.useEventTarget
          const quem = u === 'CHILDREN' ? 'filhos' : u === 'SIBLINGS' ? 'irmaos' : 'proprio'
          const sel = (u === true || u === 'true' ? null : seletorWf(t)) || alvoEv
          const a = acaoWf(String(it.actionTypeId || ''), c)
          const atraso = typeof c.delay === 'number' ? c.delay : 0
          poe(sel, quem, { grupo: gi, em: g.em ?? null, inicioMs: continuo ? null : inicioDo[gi] + atraso, tipo: String(it.actionTypeId || ''), duracaoMs: typeof c.duration === 'number' ? c.duration : null, atrasoMs: atraso,
            curva: typeof c.easing === 'string' && c.easing ? c.easing : null, muda: a.muda, valores: a.valores })
        }
      })
    } else {
      // efeito pronto do Webflow (aparecer, deslizar, crescer...): a lista não vem nos dados, só o nome e os tempos
      const m = /^([A-Z_]+?)_EFFECT$/.exec(String(acao.actionTypeId || '')), muda = m ? EFEITO_WF[m[1]] : null
      if (!muda) { cont.semLista++; continue }
      titulo = String(cfg.actionListId || m[1])
      poe(alvoEv, 'proprio', { grupo: 0, em: null, inicioMs: typeof cfg.delay === 'number' ? cfg.delay : 0, tipo: String(acao.actionTypeId), duracaoMs: typeof cfg.duration === 'number' ? cfg.duration : null, atrasoMs: typeof cfg.delay === 'number' ? cfg.delay : 0,
        curva: typeof cfg.easing === 'string' && cfg.easing ? cfg.easing : null, muda, valores: {} })
    }
    for (const { sel, quem, passos } of porAlvo.values()) {
      const achado = alvos ? alvos[quem === 'proprio' ? sel : chaveRelativa(quem, alvoEv, sel)] : undefined
      if (alvos && !achado) { cont.foraDaPagina++; continue }
      const muda = naOrdem(new Set(passos.flatMap((p) => p.muda)))
      if (!muda.length) { cont.semMudanca++; continue }
      const primeiro = passos[0].grupo, temInicio = (continuo || inicial) && passos.some((p) => p.grupo !== primeiro)
      const junta = (l) => { const o = {}; for (const p of l) Object.assign(o, p.valores); return Object.keys(o).length ? o : null }
      const animados = temInicio ? passos.filter((p) => p.grupo !== primeiro) : passos
      // tempos pela linha do tempo da lista inteira (esperas por outros alvos no meio contam)
      const comeca = continuo ? 0 : Math.min(...animados.map((p) => p.inicioMs - (p.atrasoMs || 0)))
      const acaba = continuo ? 0 : Math.max(...animados.map((p) => p.inicioMs + (p.duracaoMs || 0)))
      const desc = achado && achado.desc ? limpar(achado.desc, 60) : limpar(sel, 60)
      const quemDispara = alvos && alvoEv ? alvos[alvoEv] : null
      const item = {
        pagina, secao: null, posicaoPx: achado ? achado.posicaoPx ?? null : null, gatilho, ordem: 1,
        alvo: { desc, texto: achado ? limpar(achado.texto || '', 60) : '', quantos: achado ? achado.quantos || 1 : null, dataMov: achado && achado.dataMov ? limpar(achado.dataMov, 20) : null, ...(achado ? medidasDoAlvo(achado.medidas) : { seletor: true }) },
        disparo: { desc: quemDispara && quemDispara.desc ? limpar(quemDispara.desc, 60) : alvoEv ? limpar(alvoEv, 60) : null, seletor: alvoEv ? limpar(alvoEv, 120) : null, quemMuda: quem, quantos: quemDispara ? quemDispara.quantos || 1 : null },
        quemMuda: [quem], muda, de: temInicio ? junta(passos.filter((p) => p.grupo === primeiro)) : null, para: junta(animados),
        duracaoMs: continuo ? null : acaba - comeca || null, curva: continuo ? null : animados.map((p) => p.curva).find(Boolean) || null,
        atrasoMs: continuo ? 0 : Math.min(...animados.filter((p) => p.grupo === animados[0].grupo).map((p) => p.inicioMs)), escadaMs: 0,
        rolagem: gatilho === 'rolagem' ? semRolagem(continuo) : null, fontes: ['webflow'], confianca: 'media',
        tecnica: `Webflow (interações IX2): evento ${tipoEv}${titulo ? `, lista "${limpar(titulo, 60)}"` : ''}${continuo ? ', anda junto com o gatilho (ação contínua)' : ''}`,
        resumo: `${desc} muda ${muda.join(', ')} (${gatilho}${continuo ? ', acompanhando' : ''})`, quadros: null, quadrosBrutos: [],
        codigo: { biblioteca: 'webflow', evento: tipoEv, lista: limpar(titulo, 60), continuo, alvoDoEvento: alvoEv ? limpar(alvoEv, 120) : null, seletor: limpar(sel, 120),
          passos: passos.slice(0, 24).map(({ muda: _m, ...p }) => p) },
      }
      // a volta (mouse saiu, segundo clique, fechar) entra como `saida` do item da ida, não como item novo
      const ida = SAIDA_WF[tipoEv] ? itens.find((x) => x.codigo.evento === SAIDA_WF[tipoEv] && x.codigo.alvoDoEvento === item.codigo.alvoDoEvento && x.codigo.seletor === item.codigo.seletor && !x.saida) : null
      if (ida) { ida.saida = { duracaoMs: item.duracaoMs, curva: item.curva, voltou: true }; continue }
      if (itens.length >= max) { cont.cortados++; continue }
      item.ordem = 1 + itens.filter((x) => x.gatilho === gatilho && x.alvo.desc === desc && x.muda.join() === muda.join()).length
      itens.push(item)
    }
  }
  return { itens, ...cont }
}

// Seletores que os dados do Webflow usam (para achar os elementos na página antes de montar os itens). Pura.
export function seletoresDoWebflow(ixData) {
  const s = new Set()
  const ve = (v, nivel = 0) => {
    if (!v || typeof v !== 'object' || nivel > 12 || s.size >= 300) return
    if (!Array.isArray(v) && ('selector' in v || 'id' in v)) { const x = seletorWf(v); if (x && ('selector' in v || 'appliesTo' in v || 'useEventTarget' in v || String(v.id).includes('|'))) s.add(x) }
    for (const x of Array.isArray(v) ? v : Object.values(v)) ve(x, nivel + 1)
  }
  ve(ixData)
  return [...s]
}

// Pares (quem dispara, alvo relativo) dos dados do Webflow, para procurar o alvo DENTRO de quem dispara:
// [{ quem: 'filhos' | 'irmaos', dispara, sel, chave }]. Pura. Até `max` pares.
export function relativosDoWebflow(ixData, { max = 200 } = {}) {
  const D = ixData && typeof ixData === 'object' ? ixData : {}
  const listas = D.actionLists && typeof D.actionLists === 'object' ? D.actionLists : {}
  const out = new Map()
  for (const ev of Object.values(D.events && typeof D.events === 'object' ? D.events : {}).slice(0, LIMITES_WF.eventos)) {
    if (!ev || typeof ev !== 'object') continue
    const dispara = seletorWf(ev.target) || (Array.isArray(ev.targets) ? ev.targets.map(seletorWf).find(Boolean) : null)
    const lista = listas[ev.action && ev.action.config && ev.action.config.actionListId]
    if (!dispara || !lista || typeof lista !== 'object') continue
    const grupos = [...(Array.isArray(lista.actionItemGroups) ? lista.actionItemGroups : []),
      ...(Array.isArray(lista.continuousParameterGroups) ? lista.continuousParameterGroups.flatMap((pg) => (pg && Array.isArray(pg.continuousActionGroups) ? pg.continuousActionGroups : [])) : [])]
    for (const g of grupos) for (const it of Array.isArray(g && g.actionItems) ? g.actionItems : []) {
      const t = it && it.config && it.config.target
      const quem = t && t.useEventTarget === 'CHILDREN' ? 'filhos' : t && t.useEventTarget === 'SIBLINGS' ? 'irmaos' : null
      const sel = quem ? seletorWf(t) : null
      if (!sel || out.size >= max) continue
      const chave = chaveRelativa(quem, dispara, sel)
      out.set(chave, { quem, dispara, sel, chave })
    }
  }
  return [...out.values()]
}

// ---------------------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------------------

// Uniformes e uma frase da técnica (ruído, tempo, mouse, textura, distorção). Pura. Lê o texto só como dado.
export function descreverShader(texto) {
  const t = semComentario(String(texto ?? '').slice(0, 200_000)).replace(/\/\/[^\n]*/g, ' ')
  const uniformes = []
  for (const m of t.matchAll(/\buniform\s+(?:(?:lowp|mediump|highp)\s+)?(\w+)\s+([^;]{1,200});/g)) {
    for (const n of m[2].split(',')) { const nome = limpar(n.replace(/\[.*$/, ''), 40); if (/^\w+$/.test(nome) && uniformes.length < 24) uniformes.push({ tipo: limpar(m[1], 20), nome }) }
  }
  const nomes = uniformes.map((u) => u.nome).join(' ')
  const tem = {
    ruido: /\b\w*(noise|fbm|simplex|perlin|voronoi|ruido)\w*\s*\(|fract\s*\(\s*sin\s*\(/i.test(t),
    tempo: /time|tempo|\bu_?t\b|frame/i.test(nomes),
    mouse: /mouse|pointer|cursor|ponteiro/i.test(nomes),
    rolagem: /scroll|rolagem|progress/i.test(nomes),
    textura: uniformes.some((u) => /^sampler/.test(u.tipo)) || /\btexture(2D|Cube)?\s*\(/.test(t),
    distorcao: /distor|displace|warp|refract|ripple|\bwave|onda/i.test(t) || /\btexture(2D)?\s*\(\s*\w+\s*,\s*\w+\s*[+\-*]/.test(t),
  }
  const usa = [tem.ruido && 'ruído', tem.tempo && 'tempo', tem.mouse && 'mouse', tem.rolagem && 'rolagem', tem.textura && 'textura'].filter(Boolean)
  const tipo = /\bgl_Position\b/.test(t) && !/\bgl_FragColor\b/.test(t) ? 'vértice' : /\bgl_FragColor\b|\bout\s+vec4\b/.test(t) ? 'fragmento' : 'tipo não identificado'
  const frase = `Shader de ${tipo}` + (usa.length ? `: usa ${usa.join(', ')}` : ': sem ruído, tempo, mouse nem textura reconhecidos')
    + (tem.distorcao ? '; distorce a imagem (distorção das coordenadas)' : '') + ` (${uniformes.length} uniforme(s))`
  return { uniformes, tem, frase }
}

// ---------------------------------------------------------------------------------------------------------
// Folhas de estilo pelo protocolo
// ---------------------------------------------------------------------------------------------------------

// Texto das folhas de estilo da página (CSS.getStyleSheetText lê também a folha de outro endereço). Folha até 2 MB,
// 8 MB no total. Só lê; os domínios CSS e DOM são desligados no fim.
export async function lerFolhas(nav, { maxFolha = 2_000_000, maxTotal = 8_000_000, esperaMs = 400 } = {}) {
  const vistas = [], estado = { ativo: true, alem: 0 }, folhas = []
  nav.ouvir('CSS.styleSheetAdded', (p) => { if (estado.ativo && p && p.header) { if (vistas.length < 300) vistas.push(p.header); else estado.alem++ } })
  let puladas = 0, total = 0
  try {
    await nav.cmd('DOM.enable')
    await nav.cmd('CSS.enable')
    await espera(esperaMs)
    for (const h of vistas) {
      if (h.origin && h.origin !== 'regular') continue // folha do próprio navegador ou posta por extensão
      if ((h.length || 0) > maxFolha || total + (h.length || 0) > maxTotal) { puladas++; continue }
      try {
        const r = await nav.cmd('CSS.getStyleSheetText', { styleSheetId: h.styleSheetId }, 20_000)
        const texto = r.text || ''
        if (texto.length > maxFolha || total + texto.length > maxTotal) { puladas++; continue }
        total += texto.length
        folhas.push({ url: h.sourceURL || '', emLinha: !!h.isInline || !h.sourceURL, texto })
      } catch { puladas++ }
    }
  } finally {
    estado.ativo = false
    await nav.cmd('CSS.disable').catch(() => {})
    await nav.cmd('DOM.disable').catch(() => {})
  }
  return { folhas, puladas: puladas + estado.alem, total }
}

// ---------------------------------------------------------------------------------------------------------
// Etapa "codigo" (parte do CSS, do Webflow e dos shaders)
// ---------------------------------------------------------------------------------------------------------

// Devolve { itens, naoMedido, cobertura (uma linha da etapa `codigo`; a Parte 4 junta com a da Parte 3a), leitores
// (o estado de cada leitor), css: { folhas, keyframes, regras }, webflow, shaders, arquivos }.
// Leitor que não achou nada sai `parcial` com o motivo (ou `nao-se-aplica` quando a página não é Webflow / não tem
// canvas WebGL); nunca um valor inventado.
export async function capturarEstilos(nav, { pagina = 'inicio', saida = null, css = true } = {}) {
  const naoMedido = [], arquivos = [], leitores = []
  const falta = (o, motivo) => naoMedido.push({ pagina, etapa: 'codigo', o, motivo })
  let lido = null, erro = null
  try { lido = await nav.rodar(LER, null, 30_000) } catch (e) { erro = limpar(e && e.message, 160) }
  lido = lido || { gancho: false, eventos: [], shaders: [], cortou: 0, shadersFora: 0, webgl: 0, webflow: { sinal: false, exposto: false, json: null, erro: null } }

  // 1) folhas de estilo
  let lidas = { folhas: [], puladas: 0, total: 0 }, erroCss = null
  const keyframes = [], regras = [], resumoFolhas = []
  let folhasNoLimite = 0
  if (css) {
    try { lidas = await lerFolhas(nav) } catch (e) { erroCss = limpar(e && e.message, 120) }
    for (const f of lidas.folhas) {
      let k = [], r = []
      try { k = extrairKeyframes(f.texto); r = extrairTransicoes(f.texto) } catch {}
      if (k.length >= 200 || r.length >= 2000) folhasNoLimite++
      const url = limpar(f.url, 200)
      resumoFolhas.push({ url, emLinha: f.emLinha, kB: Math.round(f.texto.length / 1024), keyframes: k.length, regras: r.length })
      for (const x of k) keyframes.push({ ...x, folha: url })
      for (const x of r) regras.push({ ...x, folha: url })
    }
  }

  // 2) Webflow: o texto JSON vira dado (JSON.parse não executa nada)
  let ix = null
  if (lido.webflow && lido.webflow.json) { try { ix = JSON.parse(lido.webflow.json) } catch { ix = null } }

  // 3) achar na página os elementos dos seletores lidos
  // Limites declarados do resolvedor (400 seletores, 100 condições de @media, 200 pares relativos do Webflow): o que
  // passa deles vai para `naoMedido` e deixa o leitor dono `parcial` (cortes, mais abaixo). Nada some calado.
  const hover = regras.filter((r) => r.hover && r.declara)
  const partesHover = hover.flatMap((r) => pedacos(r.seletor, ',').filter((p) => /:hover\b/i.test(p)))
  const doHover = new Set(partesHover.flatMap((p) => { const d = disparoDoHover(p); return [baseDoHover(p), d.quemMuda === 'proprio' ? null : d.seletor] }).filter(Boolean))
  const doWebflow = new Set(ix ? seletoresDoWebflow(ix) : [])
  const todos = [...new Set([...doHover, ...doWebflow])], seletores = todos.slice(0, 400), fora = todos.slice(400)
  const todasMidias = [...new Set(hover.map((r) => r.midia).filter(Boolean))], midias = todasMidias.slice(0, 100)
  const relativos = ix ? relativosDoWebflow(ix) : []
  const cortes = { css: [], webflow: [] }
  if (fora.some((s) => doHover.has(s))) cortes.css.push(`${fora.filter((s) => doHover.has(s)).length} seletor(es) de :hover além do limite de 400 não foram procurados na página`)
  if (fora.some((s) => doWebflow.has(s))) cortes.webflow.push(`${fora.filter((s) => doWebflow.has(s)).length} seletor(es) do Webflow além do limite de 400 não foram procurados na página`)
  if (todasMidias.length > 100) cortes.css.push(`${todasMidias.length - 100} condição(ões) de @media além do limite de 100 não foram conferidas (as regras delas ficaram de fora)`)
  if (doWebflow.size >= 300) cortes.webflow.push('os dados do Webflow têm 300 seletores ou mais: os além disso não foram lidos')
  if (relativos.length >= 200) cortes.webflow.push('200 pares (quem dispara, filho/irmão) ou mais no Webflow: os além disso não foram procurados')
  let achados = { alvos: {}, midias: {} }
  if (seletores.length || relativos.length) {
    try { achados = await nav.rodar(RESOLVER, { seletores, midias, relativos: relativos.map(({ quem, dispara, sel, chave }) => ({ quem, dispara, sel, chave })) }, 30_000) }
    catch (e) { falta('elementos dos seletores lidos do código', `não deu para procurar na página: ${limpar(e && e.message, 120)}`) }
  }

  // 4) itens
  const ev = itensDosEventos(lido, { pagina })
  const hv = itensDoHover(hover, achados.alvos || {}, achados.midias || {}, { pagina })
  const wf = ix ? itensDoWebflow(ix, { pagina, alvos: achados.alvos || {} }) : { itens: [], eventos: 0, listas: 0, semGatilho: 0, semLista: 0, semMudanca: 0, foraDaPagina: 0, cortados: 0 }
  const porCanvas = new Map()
  const shaders = (lido.shaders || []).map((s, i) => {
    const d = descreverShader(s.texto), canvas = limpar(s.desc || 'canvas fora da página', 60)
    if (saida) { try { arquivos.push(gravarEstudo(saida, `shader-${pagina}-${i + 1}-${s.tipo || 'tipo'}.glsl.txt`, s.texto)) } catch {} }
    if (!porCanvas.has(canvas)) porCanvas.set(canvas, { s, textos: [] })
    porCanvas.get(canvas).textos.push(s.texto)
    return { canvas, tipo: s.tipo || null, cortado: !!s.cortado, uniformes: d.uniformes, frase: d.frase }
  })
  // Uniforme de tempo/mouse/rolagem só diz o que o shader PODE fazer. "Canvas animado" só com prova visual (o canvas
  // mudou entre dois prints); sem ela o item sai como técnica candidata, confiança baixa (`evidencia.mudou` falso/nulo).
  const itensShader = []
  for (const [canvas, { s, textos }] of porCanvas) {
    const d = descreverShader(textos.join('\n'))
    const declarado = d.tem.tempo ? 'parado' : d.tem.mouse ? 'mouse' : d.tem.rolagem ? 'rolagem' : null
    if (!s.desc) continue
    const prova = s.tela >= 0 ? await canvasMudou(nav, s.tela) : { mudou: null, motivo: 'canvas não identificado na página' }
    const gatilho = prova.mudou ? 'parado' : declarado
    if (!gatilho) continue // shader sem tempo, mouse nem rolagem e canvas parado: desenho fixo, fica só na lista `shaders`
    const candidata = !prova.mudou
    itensShader.push({
      pagina, secao: null, posicaoPx: s.posicaoPx ?? null, gatilho, ordem: 1, alvo: { desc: canvas, texto: '', quantos: 1, dataMov: s.dataMov ? limpar(s.dataMov, 20) : null },
      quemMuda: ['proprio'], muda: ['canvas'], de: null, para: null, duracaoMs: null, curva: null, atrasoMs: 0, escadaMs: 0, rolagem: gatilho === 'rolagem' ? semRolagem(true) : null,
      fontes: ['shader'], confianca: candidata ? 'baixa' : 'media',
      tecnica: candidata ? `técnica candidata (não se viu o canvas mudar: ${prova.motivo}): canvas WebGL. ${d.frase}` : `canvas WebGL animado (${prova.motivo}). ${d.frase}`,
      resumo: candidata ? `${canvas} pode ser redesenhado por shader (${gatilho}); conferir` : `${canvas} é redesenhado por shader (${gatilho})`, quadros: null, quadrosBrutos: [],
      evidencia: { mudou: prova.mudou, motivo: prova.motivo },
      codigo: { biblioteca: 'webgl', uniformes: d.uniformes, usa: d.tem },
    })
  }
  const itens = [...ev.itens, ...hv.itens, ...wf.itens, ...itensShader]

  if (saida) {
    try {
      if (keyframes.length || regras.length) arquivos.push(gravarEstudo(saida, `css-movimento-${pagina}.json`, JSON.stringify({ keyframes, regras }, null, 1)))
      if (ix) arquivos.push(gravarEstudo(saida, `webflow-ix2-${pagina}.json`, JSON.stringify(limparTudo(ix, 200), null, 1)))
    } catch (e) { falta('arquivos de estudo', `não deu para gravar em estudo-codigo/: ${limpar(e && e.message, 120)}`) }
  }

  // 5) estado de cada leitor (item cortado pelo teto do leitor também o deixa parcial)
  if (hv.cortados) cortes.css.push(`${hv.cortados} item(ns) de :hover além do limite de 60 por leitor não viraram item`)
  if (wf.cortados) cortes.webflow.push(`${wf.cortados} item(ns) do Webflow além do limite de 200 por leitor não viraram item`)
  const leitor = (nome, estado, n, motivo) => { leitores.push({ leitor: nome, estado, itens: n, motivo }); if (estado === 'parcial' || estado === 'falhou') falta(nome, motivo) }
  if (erro) leitor('gancho (animações que começaram)', 'falhou', 0, `a leitura na página deu erro: ${erro}`)
  else if (!lido.gancho) leitor('gancho (animações que começaram)', 'parcial', 0, 'o gancho não estava instalado antes de a página abrir: animação de entrada já terminada fica de fora')
  else if (!(lido.eventos || []).length) leitor('gancho (animações que começaram)', 'parcial', 0, 'nenhuma animação CSS, transição ou Element.animate começou enquanto a página foi observada')
  else if (lido.cortou || ev.cortados) leitor('gancho (animações que começaram)', 'parcial', ev.itens.length, `passou do limite de anotações (${lido.cortou + ev.cortados} ficaram de fora)`)
  else leitor('gancho (animações que começaram)', 'completa', ev.itens.length, null)

  if (!css) leitor('folhas de estilo', 'nao-se-aplica', 0, 'leitura das folhas desligada')
  else if (erroCss) leitor('folhas de estilo', 'falhou', 0, `não deu para ler as folhas: ${erroCss}`)
  else if (!lidas.folhas.length) leitor('folhas de estilo', 'parcial', 0, 'nenhuma folha de estilo lida')
  else if (!keyframes.length && !regras.length) leitor('folhas de estilo', 'parcial', 0, 'as folhas lidas não têm @keyframes, transition, animation nem regra :hover')
  else if (lidas.puladas) leitor('folhas de estilo', 'parcial', hv.itens.length, `${lidas.puladas} folha(s) não lida(s): maior que 2 MB, soma acima de 8 MB ou além de 300 folhas`)
  else if (cortes.css.length) leitor('folhas de estilo', 'parcial', hv.itens.length, cortes.css.join('; '))
  else leitor('folhas de estilo', 'completa', hv.itens.length, null)
  if (folhasNoLimite) falta(`${folhasNoLimite} folha(s) de estilo`, 'chegaram ao limite de 200 @keyframes ou 2000 regras por folha: o que vem depois não foi lido')

  const w = lido.webflow || {}
  const c = wf.cortes || {}
  if (c.eventos) cortes.webflow.push(`${c.eventos} evento(s) além do limite de ${LIMITES_WF.eventos} não foram lidos`)
  if (c.grupos) cortes.webflow.push(`${c.grupos} grupo(s) de ação além do limite de ${LIMITES_WF.grupos} por lista não foram lidos`)
  if (c.acoes) cortes.webflow.push(`${c.acoes} ação(ões) além do limite de ${LIMITES_WF.acoes} por grupo não foram lidas`)
  if (c.parametros) cortes.webflow.push(`${c.parametros} grupo(s) de parâmetro contínuo além do limite de ${LIMITES_WF.parametros} não foram lidos`)
  if (!w.sinal) leitor('webflow', 'nao-se-aplica', 0, 'a página não tem sinal de Webflow')
  else if (!ix) leitor('webflow', 'parcial', 0, `a página é Webflow, mas os dados de interação não foram lidos${w.erro ? `: ${limpar(w.erro, 100)}` : ' (Webflow.require("ix2") não devolveu dados)'}`)
  else if (!wf.itens.length) leitor('webflow', 'parcial', 0, `dados de interação lidos (${wf.eventos} evento(s)), mas nenhum virou item: alvo fora desta página, evento ou ação fora da lista do contrato`)
  else if (cortes.webflow.length) leitor('webflow', 'parcial', wf.itens.length, cortes.webflow.join('; '))
  else leitor('webflow', 'completa', wf.itens.length, null)
  // corte que o motivo do leitor não citou (o leitor já saiu parcial por outra razão) entra assim mesmo
  for (const [nome, l] of [['folhas de estilo', cortes.css], ['webflow', cortes.webflow]]) {
    const ld = leitores.find((x) => x.leitor === nome)
    if (l.length && !(ld && ld.motivo && ld.motivo.includes(l[0]))) { falta(nome, l.join('; ')); if (ld && ld.estado === 'completa') ld.estado = 'parcial' }
  }

  if (!shaders.length && !lido.webgl) leitor('shaders', 'nao-se-aplica', 0, 'a página não tem canvas WebGL')
  else if (!shaders.length) leitor('shaders', 'parcial', 0, 'há canvas WebGL, mas nenhum shader foi anotado (compilado antes do gancho ou em outro contexto)')
  else if (lido.shadersFora) leitor('shaders', 'parcial', itensShader.length, `${lido.shadersFora} shader(s) além do limite de 8 não foram guardados`)
  else leitor('shaders', 'completa', itensShader.length, null)

  if (ev.semMudanca) falta(`${ev.semMudanca} animação(ões) CSS`, 'mudam propriedade fora da lista do contrato (variável CSS, sombra, borda...)')
  if (hv.semTransicao) falta(`${hv.semTransicao} regra(s) :hover`, 'sem transição com duração: troca na hora, não virou item')
  if (wf.semGatilho + wf.semLista + wf.semMudanca) falta(`${wf.semGatilho + wf.semLista + wf.semMudanca} interação(ões) do Webflow`, 'evento, lista de ações ou tipo de ação fora do que o leitor conhece (ver estudo-codigo/)')

  const ruins = leitores.filter((l) => l.estado === 'parcial' || l.estado === 'falhou')
  const estado = erro ? 'falhou' : ruins.length ? 'parcial' : 'completa'
  const limites = `${(lido.eventos || []).length} animação(ões) anotada(s) pelo gancho; ${lidas.folhas.length} folha(s) lida(s) (${Math.round(lidas.total / 1024)} kB), ${keyframes.length} @keyframes, ${regras.length} regra(s) com transition/animation/:hover`
    + `; Webflow ${ix ? `com ${wf.eventos} evento(s) e ${wf.listas} lista(s)${wf.foraDaPagina ? `, ${wf.foraDaPagina} alvo(s) fora desta página` : ''}` : w.sinal ? 'sem dados lidos' : 'não é o caso'}`
    + `; ${shaders.length} shader(s) em ${porCanvas.size} canvas`
  return {
    itens, naoMedido, raizPx: raizDe(lido), cobertura: { pagina, etapa: 'codigo', estado, itens: itens.length, limites, motivo: ruins.length ? ruins.map((l) => `${l.leitor}: ${l.motivo}`).join('; ') : null },
    leitores, css: { folhas: resumoFolhas, keyframes: keyframes.slice(0, 200), regras: regras.slice(0, 400) },
    webflow: { sinal: !!w.sinal, exposto: !!ix, eventos: wf.eventos, listas: wf.listas }, shaders, arquivos,
  }
}
