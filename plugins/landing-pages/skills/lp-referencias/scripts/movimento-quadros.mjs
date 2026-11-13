// Quadros no tempo: grava a tela da referência ao carregar, parada e durante a rolagem, e aponta o que se mexe.
// O raio-x só rola a página; aqui entra o que ele não vê: o que aparece depois de carregar e o que mexe sozinho.
//
// Uso (por quem abre a página, ver movimento.mjs):
//   const nav = await abrirNavegador(acharNavegador())            // de raio-x.mjs: { cmd, ouvir, rodar, fechar }
//   await nav.cmd('Page.enable')
//   await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source: ganchosAntes })
//   const grav = await gravar(nav, { pasta: path.join(saida, 'quadros') })      // ANTES de abrir a página
//   const { itens } = await capturarCarregar(nav, grav, { url, pagina: 'inicio' })
//   const parado = await capturarParado(nav, grav, { pagina: 'inicio', secoes })
//   const rolagem = await capturarRolagem(nav, grav, { pagina: 'inicio' })
//   grav.gravarManifesto(); await grav.parar()
//
// Tudo que sai daqui é medida ou print da referência: a pasta de saída recebe um .gitignore com "*" (protegerSaida).
// Nome de classe, texto e nome de animação vindos do site são DADO, nunca ordem.
// Node puro, sem dependência: fala com o Chrome pelo protocolo DevTools que o raio-x já abre.

import fs from 'node:fs'
import path from 'node:path'
import { decodificarPng } from './raio-x.mjs'

export const GATILHOS = ['carregar', 'parado', 'rolagem', 'mouse', 'toque', 'clique', 'troca-de-pagina', 'cabecalho', 'rodape']
export const MUDANCAS = ['posicao-x', 'posicao-y', 'escala', 'rotacao', 'opacidade', 'desfoque', 'brilho', 'recorte', 'largura',
  'altura', 'cor', 'fundo', 'espaco-entre-letras', 'texto-partido', 'visibilidade', 'canvas']

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const r2 = (n) => Math.round(n * 100) / 100

// Até n elementos espalhados por toda a lista (o primeiro e o último sempre entram), na ordem dela. Com n ou menos,
// a lista toda. A folha de um movimento longo (troca de página de quase 2 s) tem de mostrar o trecho inteiro, não
// só o começo.
export function espalhar(lista, n = 24) {
  if (lista.length <= n) return lista.slice()
  if (n <= 1) return n === 1 ? [lista[0]] : []
  return Array.from({ length: n }, (_, k) => lista[Math.round((k * (lista.length - 1)) / (n - 1))])
}

// Uma animação da página (CSS ou Web Animations) em formato de dado. Roda dentro da página.
function movAnim(a) {
  const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {}
  const qs = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : []
  const nomes = new Set()
  for (const q of qs) for (const k of Object.keys(q)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(k)) nomes.add(k)
  return {
    nome: String(a.animationName || a.transitionProperty || '').slice(0, 40), css: !!a.animationName,
    props: [...nomes].slice(0, 12).map((k) => ({ prop: k, valores: qs.map((q) => String(q[k] ?? '').slice(0, 80)) })),
    duracaoMs: typeof t.duration === 'number' ? Math.round(t.duration) : null, atrasoMs: Math.round(t.delay || 0),
    infinita: t.iterations === Infinity, curva: String(t.easing && t.easing !== 'linear' ? t.easing : (qs[0] && qs[0].easing) || 'linear').slice(0, 60),
  }
}

// Anota, nos primeiros 8 s da página, cada animação no momento em que ela aparece (elemento, hora e os dados dela).
// Entrada curta acaba antes de alguém perguntar: depois de encerrada ela some de getAnimations(). Só lê; não cria nada.
function movEntrada() {
  try {
    const notas = (window.__movEntrada = []), vistas = new WeakSet(), t0 = performance.now()
    const olhar = () => {
      try {
        if (performance.now() - t0 > 8000 || notas.length >= 200) return
        for (const a of document.getAnimations()) {
          if (vistas.has(a)) continue
          vistas.add(a)
          const el = a.effect && a.effect.target
          if (el && el.nodeType === 1) notas.push({ el, tMs: Math.round(performance.now() - t0), anim: movAnim(a) })
        }
      } catch {}
    }
    const relogio = setInterval(() => { olhar(); if (performance.now() - t0 > 8000) clearInterval(relogio) }, 40)
    for (const ev of ['animationstart', 'transitionrun']) window.addEventListener(ev, olhar, true)
  } catch {}
}

// Código posto na página antes de ela carregar: anota a hora de abertura, o tipo de cada canvas e as animações da
// entrada (não cria nada).
export const ganchosAntes = `(() => { try { window.__movInicio = Date.now(); const o = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...r) { try { this.__movCtx = String(t) } catch {} return o.call(this, t, ...r) } } catch {} })();
(() => { const movAnim = ${movAnim};
(${movEntrada})() })()`

// Material de terceiro nunca vai ao git: a pasta ganha um .gitignore que ignora tudo o que estiver nela.
export function protegerSaida(pasta) {
  fs.mkdirSync(pasta, { recursive: true })
  const arq = path.join(pasta, '.gitignore')
  if (!fs.existsSync(arq) || fs.readFileSync(arq, 'utf8').trim() !== '*') fs.writeFileSync(arq, '*\n')
  return arq
}

// Parte da tela que mudou entre dois quadros decodificados ({ largura, altura, canais, px }): total (0 a 1) e por
// célula de uma grade (linha por linha). Quadros de tamanhos diferentes contam como tudo mudado.
export function diferencaQuadros(a, b, grade = 8, tolerancia = 24) {
  const n = grade * grade
  if (!a || !b || a.largura !== b.largura || a.altura !== b.altura) return { total: 1, celulas: new Array(n).fill(1), grade }
  const mudou = new Array(n).fill(0), tam = new Array(n).fill(0)
  const ca = a.canais, cb = b.canais, usa = Math.min(3, ca, cb)
  let soma = 0
  for (let y = 0; y < a.altura; y++) {
    const cy = Math.min(grade - 1, Math.floor((y * grade) / a.altura)) * grade
    for (let x = 0; x < a.largura; x++) {
      const c = cy + Math.min(grade - 1, Math.floor((x * grade) / a.largura))
      const pa = (y * a.largura + x) * ca, pb = (y * b.largura + x) * cb
      let d = 0
      for (let k = 0; k < usa; k++) d += Math.abs(a.px[pa + k] - b.px[pb + k])
      tam[c]++
      if (d * (3 / usa) > tolerancia) { mudou[c]++; soma++ }
    }
  }
  return { total: soma / (a.largura * a.altura || 1), celulas: mudou.map((v, i) => (tam[i] ? v / tam[i] : 0)), grade }
}

// Junta as células ativas vizinhas em regiões. Devolve, por região, a caixa (em fração da tela) e a célula de pico.
export function regioesAtivas(pesos, grade, minimo = 0) {
  const visto = new Array(pesos.length).fill(false), out = []
  for (let i = 0; i < pesos.length; i++) {
    if (visto[i] || !(pesos[i] > minimo)) continue
    const fila = [i]
    visto[i] = true
    let x0 = grade, y0 = grade, x1 = -1, y1 = -1, pico = i
    while (fila.length) {
      const c = fila.pop(), x = c % grade, y = Math.floor(c / grade)
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      if (pesos[c] > pesos[pico]) pico = c
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy, v = ny * grade + nx
        if (nx < 0 || ny < 0 || nx >= grade || ny >= grade || visto[v] || !(pesos[v] > minimo)) continue
        visto[v] = true
        fila.push(v)
      }
    }
    out.push({ x: x0 / grade, y: y0 / grade, w: (x1 - x0 + 1) / grade, h: (y1 - y0 + 1) / grade,
      pico: { x: ((pico % grade) + 0.5) / grade, y: (Math.floor(pico / grade) + 0.5) / grade }, peso: pesos[pico] })
  }
  return out
}

// Das propriedades de uma animação CSS (nomes e valores dos quadros-chave) para a lista fixa MUDANCAS.
export function mudancasDeCss(props = []) {
  const out = new Set()
  for (const { prop, valores = [] } of props) {
    const p = String(prop).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), v = valores.join(' ')
    if (p === 'opacity') out.add('opacidade')
    else if (p === 'filter' || p === 'backdrop-filter') { if (/blur/.test(v)) out.add('desfoque'); if (/brightness/.test(v)) out.add('brilho') }
    else if (p === 'clip-path') out.add('recorte')
    else if (p === 'width') out.add('largura')
    else if (p === 'height') out.add('altura')
    else if (p === 'color') out.add('cor')
    else if (p.startsWith('background')) out.add('fundo')
    else if (p === 'letter-spacing') out.add('espaco-entre-letras')
    else if (p === 'visibility' || p === 'display') out.add('visibilidade')
    else if (p === 'rotate') out.add('rotacao')
    else if (p === 'scale') out.add('escala')
    else if (p === 'translate') { out.add('posicao-x'); if (/\S\s+\S/.test(v.trim())) out.add('posicao-y') }
    else if (p === 'left' || p === 'right') out.add('posicao-x')
    else if (p === 'top' || p === 'bottom') out.add('posicao-y')
    else if (p === 'transform') {
      if (/translateX|translate3d|translate\(|matrix/.test(v)) out.add('posicao-x')
      if (/translateY|translate3d|translate\([^,)]+,|matrix/.test(v)) out.add('posicao-y')
      if (/rotate/.test(v)) out.add('rotacao')
      if (/scale/.test(v)) out.add('escala')
    }
  }
  return MUDANCAS.filter((m) => out.has(m))
}

// ---------------------------------------------------------------------------------------------------------
// Funções que rodam dentro da página (vão como texto; cada uma leva junto as ajudas que usa)
// ---------------------------------------------------------------------------------------------------------

// Onde a página está de verdade: Lenis, rolagem da página, contêiner interno que rola ou rolagem virtual
// (conteúdo empurrado por transform; aí vale o quanto o bloco mais alto saiu do lugar).
function movBase() {
  const W = window
  const M = W.__mov || (W.__mov = {})
  const doc = document.scrollingElement || document.documentElement
  const vw = innerWidth, vh = innerHeight
  const lenis = W.lenis && typeof W.lenis.scroll === 'number' ? W.lenis : null
  const suave = !!lenis || document.documentElement.classList.contains('lenis')
  const maxDoc = doc.scrollHeight - doc.clientHeight
  const agora = performance.now()
  if (maxDoc <= 4 && (!M.cont || !M.cont.isConnected) && agora - (M.buscaCont ?? -1e9) > 1000) {
    M.buscaCont = agora
    M.cont = null
    let melhor = 4
    for (const el of [...document.querySelectorAll('body *')].slice(0, 4000)) {
      const sobra = el.scrollHeight - el.clientHeight
      if (sobra > melhor && el.clientHeight > vh * 0.5 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) { M.cont = el; melhor = sobra }
    }
  }
  if (!M.ref || !M.ref.isConnected) {
    let alt = 0
    M.ref = null
    for (const el of [...document.querySelectorAll('body *')].slice(0, 4000)) { const h = el.getBoundingClientRect().height; if (h > alt) { alt = h; M.ref = el } }
    M.ref0 = M.ref ? M.ref.getBoundingClientRect().top : 0
  }
  const virt = M.ref ? M.ref0 - M.ref.getBoundingClientRect().top : 0
  let modo, pos, max
  if (M.virtual) { modo = 'virtual'; pos = virt; max = null }
  else if (lenis) { modo = 'lenis'; pos = lenis.scroll; max = typeof lenis.limit === 'number' ? lenis.limit : maxDoc }
  else if (maxDoc > 4) { modo = suave ? 'lenis' : 'pagina'; pos = W.scrollY; max = maxDoc }
  else if (M.cont) { modo = 'conteiner'; pos = M.cont.scrollTop; max = M.cont.scrollHeight - M.cont.clientHeight }
  else { modo = 'virtual'; pos = virt; max = null }
  return { modo, pos, max, virt, vw, vh, rolagemJanela: W.scrollY, rolagemJanelaX: W.scrollX }
}

function movPosicao(arg) {
  if (arg && arg.virtual) (window.__mov || (window.__mov = {})).virtual = true
  return movBase()
}

// Espera a posição e os blocos largos da tela pararem (3 leituras iguais) ou o limite acabar.
async function movAssentar({ limiteMs }) {
  const quadro = () => new Promise((r) => { let ok = false; const f = () => { if (!ok) { ok = true; r() } }; requestAnimationFrame(() => setTimeout(f, 16)); setTimeout(f, 80) })
  const vw = innerWidth, vh = innerHeight
  const els = []
  for (const [x, y] of [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8], [0.2, 0.5], [0.8, 0.5]]) {
    let el = document.elementFromPoint(vw * x, vh * y)
    while (el && el.parentElement && el.getBoundingClientRect().width < vw * 0.5) el = el.parentElement
    if (el && !els.includes(el)) els.push(el)
  }
  const assinatura = () => { const b = movBase(); return Math.round(b.pos) + '|' + Math.round(b.virt) + '|' + els.map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.top) + ',' + Math.round(r.left) + ',' + Math.round(r.width) }).join(';') }
  const t0 = performance.now()
  let ant = null, iguais = 0
  while (performance.now() - t0 < limiteMs) {
    await quadro()
    const s = assinatura()
    if (s === ant) { if (++iguais >= 3) break } else iguais = 0
    ant = s
  }
  return { ...movBase(), estavel: iguais >= 3, esperouMs: Math.round(performance.now() - t0) }
}

// Quem está debaixo de um ponto da tela (x, y em fração): canvas, vídeo, elemento com animação rodando ou o de cima.
// caixa = região que mudou (em fração): quem se mexe pode não estar no ponto na hora da pergunta, então também vale
// o elemento com animação rodando que cruza a região. entrada = vale também a animação anotada enquanto tocava
// (window.__movEntrada, posta pelos ganchosAntes), para a entrada curta que já acabou na hora da pergunta.
function movAlvo({ x, y, caixa, entrada }) {
  const vw = innerWidth, vh = innerHeight
  const desc = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id && /^[\w-]{1,30}$/.test(el.id) ? '#' + el.id : ''
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).find((c) => /^[a-z][\w-]{0,30}$/i.test(c)) : ''
    return tag + id + (!id && cls ? '.' + cls : '')
  }
  const pilha = document.elementsFromPoint(vw * x, vh * y)
  if (!pilha.length) return null
  let el = pilha.find((e) => e.tagName === 'CANVAS' || e.tagName === 'VIDEO'), tipo = 'desconhecido'
  if (el) tipo = el.tagName === 'CANVAS' ? 'canvas' : 'video'
  else {
    for (let e = pilha[0]; e && e !== document.documentElement && e !== document.body; e = e.parentElement) {
      if (e.getAnimations && e.getAnimations().length) { el = e; tipo = 'animacao'; break }
    }
    if (!el && caixa && document.getAnimations) {
      const m = 60, reg = { l: caixa.x * vw - m, t: caixa.y * vh - m, r: (caixa.x + caixa.w) * vw + m, b: (caixa.y + caixa.h) * vh + m }
      let area = Infinity
      for (const a of document.getAnimations()) {
        const e = a.effect && a.effect.target
        if (!e || e.nodeType !== 1) continue
        const r = e.getBoundingClientRect()
        if (r.width > 0 && r.right > reg.l && r.left < reg.r && r.bottom > reg.t && r.top < reg.b && r.width * r.height < area) { el = e; tipo = 'animacao'; area = r.width * r.height }
      }
    }
    if (!el) el = pilha[0]
  }
  const notas = entrada && Array.isArray(window.__movEntrada) ? window.__movEntrada.filter((n) => n.el && n.el.isConnected && !n.anim.infinita) : []
  if (tipo === 'desconhecido' && notas.length) {
    // nada rodando agora: quem está no ponto (ou o pai dele) tocou uma animação na entrada? senão, quem cruza a região
    let achado = null
    for (let e = pilha[0]; e && !achado && e !== document.documentElement && e !== document.body; e = e.parentElement) if (notas.some((n) => n.el === e)) achado = e
    if (!achado && caixa) {
      const reg = { l: caixa.x * vw, t: caixa.y * vh, r: (caixa.x + caixa.w) * vw, b: (caixa.y + caixa.h) * vh }
      let area = Infinity
      for (const n of notas) {
        const r = n.el.getBoundingClientRect()
        if (r.width > 0 && r.right > reg.l && r.left < reg.r && r.bottom > reg.t && r.top < reg.b && r.width * r.height < area) { achado = n.el; area = r.width * r.height }
      }
    }
    if (achado) { el = achado; tipo = 'animacao' }
  }
  const animacoes = []
  try { for (const a of el.getAnimations ? el.getAnimations() : []) animacoes.push(movAnim(a)) } catch {}
  for (const n of notas) if (n.el === el && !animacoes.some((a) => a.nome === n.anim.nome && a.duracaoMs === n.anim.duracaoMs)) animacoes.push({ ...n.anim, anotadaMs: n.tMs })
  const r = el.getBoundingClientRect()
  const marcado = el.closest('[data-mov]')
  return {
    desc: desc(el), tipo, texto: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), dataMov: marcado ? marcado.getAttribute('data-mov') : null,
    contexto: el.__movCtx || null, animacoes, caixa: { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
  }
}

// Junta imagens numa folha JPEG, com canvas (as imagens entram como bytes: não dependem da política do site).
async function movFolha({ imgs, colunas, legendas, qualidade }) {
  const bmps = []
  for (const b64 of imgs) {
    const bin = atob(b64), u = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
    bmps.push(await createImageBitmap(new Blob([u])))
  }
  const w = Math.max(...bmps.map((b) => b.width)), h = Math.max(...bmps.map((b) => b.height)), leg = legendas.length ? 18 : 0
  const c = document.createElement('canvas')
  c.width = colunas * w
  c.height = Math.ceil(bmps.length / colunas) * (h + leg)
  const g = c.getContext('2d')
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, c.width, c.height)
  g.font = '12px sans-serif'
  g.textBaseline = 'middle'
  bmps.forEach((b, i) => {
    const x = (i % colunas) * w, y = Math.floor(i / colunas) * (h + leg)
    g.drawImage(b, x, y)
    if (leg && legendas[i] != null) { g.fillStyle = '#111111'; g.fillText(String(legendas[i]).slice(0, 60), x + 4, y + h + leg / 2, w - 8) }
  })
  return c.toDataURL('image/jpeg', qualidade).split(',')[1]
}

const comBase = (fn) => `(arg) => { const movBase = ${movBase};\nreturn (${fn})(arg) }`
const NA_PAGINA = { posicao: comBase(movPosicao), assentar: comBase(movAssentar), alvo: `(arg) => { const movAnim = ${movAnim};\nreturn (${movAlvo})(arg) }`, folha: String(movFolha) }

// ---------------------------------------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------------------------------------

// Liga a gravação da tela (Page.startScreencast). Chamar ANTES de abrir a página. Os quadros só são guardados
// depois de marcar() dizer de qual página e gatilho eles são. foto() tira um quadro na hora (mesma largura).
// O Chrome só manda quadro quando a tela muda: numa tela parada, o intervalo longo marca "perdido" à toa.
export async function gravar(nav, { pasta, largura = 360 } = {}) {
  if (!pasta) throw new Error('gravar: informe a pasta dos quadros')
  protegerSaida(pasta)
  const brutos = path.join(pasta, 'brutos')
  fs.mkdirSync(brutos, { recursive: true })
  const quadros = []
  let ctx = { guardar: false }, n = 0, ligado = true, ultimo = null
  const registrar = (dados, t, extra) => {
    const nome = `brutos/${String(++n).padStart(4, '0')}.png`
    fs.writeFileSync(path.join(pasta, nome), dados)
    const q = { arquivo: nome, item: null, pagina: ctx.pagina ?? null, gatilho: ctx.gatilho ?? null, tMs: Math.max(0, Math.round(t - (ctx.t0 ?? t))),
      rolagemPx: Math.round(extra.rolagemPx ?? ctx.rolagemPx ?? 0), progresso: null, escala: r2(extra.escala ?? 1),
      perdido: extra.fonte === 'gravacao' && ultimo !== null && t - ultimo > 150, fonte: extra.fonte,
      ...(ctx.secao != null ? { secao: ctx.secao } : {}), ...(ctx.sentido ? { sentido: ctx.sentido } : {}) }
    Object.defineProperty(q, 'dados', { value: dados, enumerable: false, writable: true })
    Object.defineProperty(q, 't', { value: t, enumerable: false })
    ultimo = t
    quadros.push(q)
    return q
  }
  nav.ouvir('Page.screencastFrame', (p) => {
    nav.cmd('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {}) // sem a confirmação o Chrome para de mandar
    if (!ligado || !ctx.guardar || ctx.soFotos) return
    try {
      const dados = Buffer.from(p.data, 'base64'), m = p.metadata || {}
      registrar(dados, m.timestamp ? m.timestamp * 1000 : Date.now(), { fonte: 'gravacao', rolagemPx: m.scrollOffsetY, escala: m.deviceWidth ? dados.readUInt32BE(16) / m.deviceWidth : 1 })
    } catch {}
  })
  await nav.cmd('Page.startScreencast', { format: 'png', maxWidth: largura, maxHeight: largura * 4, everyNthFrame: 1 })
  return {
    pasta, quadros, largura,
    // Diz de onde são os próximos quadros. soFotos: guarda só os tirados por foto() (parado e rolagem).
    marcar(c) { ctx = { guardar: true, t0: Date.now(), ...c }; ultimo = null; return quadros.length },
    async foto(extra = {}) {
      const v = await nav.rodar(NA_PAGINA.posicao)
      const { data } = await nav.cmd('Page.captureScreenshot', { format: 'png', clip: { x: v.rolagemJanelaX, y: v.rolagemJanela, width: v.vw, height: v.vh, scale: largura / v.vw } })
      return registrar(Buffer.from(data, 'base64'), Date.now(), { fonte: 'foto', escala: largura / v.vw, rolagemPx: extra.rolagemPx ?? v.pos })
    },
    gravarManifesto() {
      const arq = path.join(pasta, 'manifesto.json')
      fs.writeFileSync(arq, JSON.stringify({ versao: 1, larguraQuadro: largura, quadros }, null, 1))
      return arq
    },
    soltar() { for (const q of quadros) q.dados = null },
    async parar() { ligado = false; try { await nav.cmd('Page.stopScreencast') } catch {} },
  }
}

const lerQuadro = (grav, q) => decodificarPng(q.dados || fs.readFileSync(path.join(grav.pasta, q.arquivo)))
const umaCor = (img) => { for (let i = img.canais; i < img.px.length; i += img.canais * 7) if (Math.abs(img.px[i] - img.px[0]) > 6) return false; return true }

function itemBase({ pagina, secao, gatilho, alvo, regiao, quadros }) {
  const anim = alvo.animacoes || []
  const css = anim.find((a) => a.infinita) || anim[0] || null
  let muda = css ? mudancasDeCss(anim.flatMap((a) => a.props)) : []
  let tecnica = 'não identificada pelos quadros (ver o código da página)', fontes = ['quadros'], confianca = 'baixa'
  if (alvo.tipo === 'canvas') { muda = ['canvas']; tecnica = `canvas redesenhado a cada quadro (${/webgl/i.test(alvo.contexto || '') ? 'WebGL' : alvo.contexto || 'contexto não lido'})`; confianca = 'media' }
  else if (alvo.tipo === 'video') { muda = ['canvas']; tecnica = 'vídeo tocando'; confianca = 'media' }
  else if (css && muda.length) { tecnica = `animação CSS${css.infinita ? ' em laço' : ''} (dado do site: "${css.nome}")`; fontes = ['quadros', 'css']; confianca = 'alta'
    if (css.anotadaMs != null) tecnica += ', anotada enquanto tocava (já tinha acabado na hora da consulta)' }
  if (!muda.length) muda = ['visibilidade']
  return {
    pagina, secao, gatilho, ordem: 1,
    alvo: { desc: alvo.desc, texto: alvo.texto || '', quantos: 1, dataMov: alvo.dataMov ?? null },
    quemMuda: ['proprio'], muda, de: null, para: null,
    duracaoMs: css ? css.duracaoMs : null, curva: css ? css.curva : null, atrasoMs: css ? css.atrasoMs : 0, escadaMs: 0, rolagem: null,
    fontes, confianca, tecnica, resumo: '', quadros: null, quadrosBrutos: quadros, regiao,
  }
}

// 5 s a partir da abertura: o que muda depois do primeiro desenho vira item "carregar". Com url, abre a página aqui
// (a gravação já tem de estar ligada); sem url, quem chamou já fez grav.marcar({ gatilho: 'carregar' }) e navegou.
// Page.navigate sem resposta em limiteNavegarMs: não derruba o processo; devolve cobertura "falhou" com
// semResposta: true (quem chama decide se tenta de novo; movimento.mjs tenta uma vez, com a trava religada).
export async function capturarCarregar(nav, grav, { url = null, pagina = 'inicio', secao = 0, duracaoMs = 5000, grade = 12, limiteNavegarMs = 60_000 } = {}) {
  let de = grav.quadros.length
  const t0 = Date.now()
  if (url) {
    de = grav.marcar({ pagina, gatilho: 'carregar' })
    let r
    try { r = await nav.cmd('Page.navigate', { url }, limiteNavegarMs) } catch (e) {
      if (!/demorou demais/.test(String(e?.message || e))) throw e
      try { await nav.cmd('Page.stopLoading', {}, 5000) } catch {}
      return { itens: [], semResposta: true, cobertura: { pagina, etapa: 'carregar', estado: 'falhou', itens: 0, limites: null, motivo: `Page.navigate sem resposta em ${r2(limiteNavegarMs / 1000)} s` } }
    }
    if (r.errorText) return { itens: [], cobertura: { pagina, etapa: 'carregar', estado: 'falhou', itens: 0, limites: null, motivo: `Não abriu a página: ${r.errorText}` } }
  }
  await espera(Math.max(0, duracaoMs - (Date.now() - t0)))
  const fim = grav.quadros.length
  grav.marcar({ pagina, gatilho: 'carregar', soFotos: true }) // daqui em diante a gravação não guarda mais nada desta etapa
  const qs = grav.quadros.slice(de, fim).filter((q) => q.gatilho === 'carregar' && q.fonte === 'gravacao')
  const imgs = qs.map((q) => lerQuadro(grav, q))
  let base = imgs.findIndex((img) => !umaCor(img)) // primeiro desenho = primeiro quadro que não é uma cor só
  if (base < 0) base = 0
  const n = grade * grade
  const vezes = new Array(n).fill(0), pico = new Array(n).fill(0), primeiro = new Array(n).fill(null), ultimo = new Array(n).fill(null), noFim = new Array(n).fill(false)
  const tFim = qs.length ? qs[qs.length - 1].t : 0
  let difs = 0
  for (let k = base + 1; k < imgs.length; k++) {
    if (imgs[k].largura !== imgs[k - 1].largura) continue
    const d = diferencaQuadros(imgs[k - 1], imgs[k], grade)
    difs++
    d.celulas.forEach((v, i) => {
      if (v <= 0.01) return
      vezes[i]++
      pico[i] = Math.max(pico[i], v)
      if (primeiro[i] === null) primeiro[i] = qs[k].t
      ultimo[i] = qs[k].t
      if (duracaoMs - (qs[k].t - (qs[0].t - qs[0].tMs)) < 1000) noFim[i] = true
    })
  }
  // Região que muda o tempo todo e ainda mudava no último segundo é laço: fica para o capturarParado.
  const pesos = pico.map((v, i) => (vezes[i] > 0 && !(noFim[i] && vezes[i] > Math.max(6, difs * 0.5)) ? v : 0))
  const itens = []
  for (const reg of regioesAtivas(pesos, grade)) {
    let alvo = null
    try { alvo = await nav.rodar(NA_PAGINA.alvo, { ...reg.pico, caixa: { x: reg.x, y: reg.y, w: reg.w, h: reg.h }, entrada: true }) } catch {}
    if (!alvo) continue
    const cels = []
    for (let i = 0; i < n; i++) { const x = (i % grade) / grade, y = Math.floor(i / grade) / grade; if (pesos[i] > 0 && x >= reg.x - 1e-9 && x < reg.x + reg.w && y >= reg.y - 1e-9 && y < reg.y + reg.h) cels.push(i) }
    const ini = Math.min(...cels.map((i) => primeiro[i])), ate = Math.max(...cels.map((i) => ultimo[i]))
    const usados = qs.filter((q) => q.t >= ini - 1 && q.t <= ate + 1).map((q) => q.arquivo)
    const mesmo = itens.find((it) => it.alvo.desc === alvo.desc)
    if (mesmo) { mesmo.quadrosBrutos = [...new Set([...mesmo.quadrosBrutos, ...usados])]; continue }
    const it = itemBase({ pagina, secao, gatilho: 'carregar', alvo, regiao: { x: r2(reg.x), y: r2(reg.y), w: r2(reg.w), h: r2(reg.h) }, quadros: [qs[base].arquivo, ...espalhar(usados.filter((a) => a !== qs[base].arquivo), 23)] })
    it.atrasoMs = Math.max(0, Math.round(ini - qs[base].t))
    if (it.duracaoMs == null && ate - ini > 50) it.duracaoMs = Math.round(ate - ini)
    it.resumo = `${alvo.desc} muda ${it.atrasoMs} ms depois do primeiro desenho da página`
    itens.push(it)
  }
  const perdidos = qs.filter((q) => q.perdido).length
  return { itens, cobertura: { pagina, etapa: 'carregar', estado: qs.length >= 2 ? 'completa' : 'parcial', itens: itens.length,
    limites: `${qs.length} quadros em ${r2(duracaoMs / 1000)} s (${perdidos} com intervalo maior que 150 ms)`, motivo: qs.length >= 2 ? null : 'a gravação mandou menos de 2 quadros' } }
}

// ---------------------------------------------------------------------------------------------------------
// Rolagem
// ---------------------------------------------------------------------------------------------------------

const jaAndou = new WeakSet()

// Rola pela roda do mouse até alvoPx, lendo a posição de verdade e esperando a página parar a cada passo.
// Devolve { andou, posicao, modo, estado: 'ok' | 'fim' | 'falhou', esperouMs, max }. "falhou" = a rolagem estava
// travada (tela de carregamento, Lenis parado) e não soltou em limiteTravaMs.
export async function rolarAte(nav, alvoPx, { limiteTravaMs = 15_000, toleranciaPx = 2, assentarMs = 1500 } = {}) {
  const { cmd, rodar } = nav
  const ler = () => rodar(NA_PAGINA.assentar, { limiteMs: assentarMs }, 30_000)
  const t0 = Date.now()
  let a = await ler()
  const inicio = a.pos
  let ganho = 1, travadoDesde = null, estado = 'ok', travou = 0
  for (let i = 0; i < 80; i++) {
    const falta = alvoPx - a.pos
    if (Math.abs(falta) <= toleranciaPx) break
    if (a.max != null && falta > 0 && a.pos >= a.max - 2) { estado = 'fim'; break }
    if (a.modo !== 'virtual' && falta < 0 && a.pos <= 0.5) { estado = 'fim'; break }
    let delta = Math.max(-a.vh, Math.min(a.vh, falta / ganho))
    if (Math.abs(delta) < 1) delta = Math.sign(delta) || 1
    await cmd('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(a.vw / 2), y: Math.round(a.vh / 2), deltaX: 0, deltaY: delta })
    let b = await ler()
    if (Math.abs(b.pos - a.pos) < 0.5 && Math.abs(b.virt - a.virt) > 1 && b.modo !== 'virtual') {
      // A posição oficial não anda mas o conteúdo anda: rolagem virtual. Daqui em diante vale o conteúdo.
      await rodar(NA_PAGINA.posicao, { virtual: true })
      a = { ...a, pos: a.virt, modo: 'virtual', max: null }
      b = { ...b, pos: b.virt, modo: 'virtual', max: null }
    }
    const andou = b.pos - a.pos
    if (Math.abs(andou) < 0.5) {
      travadoDesde ??= Date.now()
      const limite = jaAndou.has(nav) && b.modo === 'virtual' ? Math.min(limiteTravaMs, 2500) : limiteTravaMs
      if (Date.now() - travadoDesde > limite) { estado = jaAndou.has(nav) && b.modo === 'virtual' ? 'fim' : 'falhou'; a = b; break }
      travou = Date.now() - travadoDesde
      await espera(250)
      a = await ler()
      continue
    }
    travadoDesde = null
    jaAndou.add(nav)
    if (Math.sign(andou) === Math.sign(delta)) ganho = Math.max(0.2, Math.min(5, Math.abs(andou / delta)))
    a = b
  }
  if (estado === 'ok' && Math.abs(alvoPx - a.pos) > Math.max(toleranciaPx, 4)) estado = 'falhou'
  return { andou: r2(a.pos - inicio), posicao: r2(a.pos), modo: a.modo, estado, esperouMs: Date.now() - t0, travadoMs: travou, max: a.max, vh: a.vh, vw: a.vw }
}

// Passa pela página toda uma vez (carrega o que é preguiçoso) e volta ao topo. Fazer antes de medir.
export async function rolarPaginaToda(nav, { limitePassos = 80 } = {}) {
  let r = await rolarAte(nav, 0)
  for (let i = 0; i < limitePassos; i++) {
    const antes = r.posicao
    r = await rolarAte(nav, antes + r.vh, { limiteTravaMs: i ? 2500 : 15_000 })
    if (r.estado !== 'ok' || r.posicao - antes < 1) break
  }
  const fimPx = r.posicao
  for (let i = 0; i < limitePassos && r.posicao > 0.5; i++) {
    const antes = r.posicao
    r = await rolarAte(nav, Math.max(0, antes - r.vh * 2), { limiteTravaMs: 2500 })
    if (antes - r.posicao < 1) break
  }
  return { fimPx, voltou: r.posicao <= 2, modo: r.modo }
}

// No topo de cada seção, com a rolagem já parada: 8 quadros em 2 s. Só vira item "parado" a região que continua
// mudando 1 s depois de a rolagem parar (o que muda antes disso é inércia da rolagem suave).
// secoes = [{ indice, topoPx }]; sem isso, uma parada a cada tela.
export async function capturarParado(nav, grav, { pagina = 'inicio', secoes = null, quadros = 8, janelaMs = 2000, esperaMs = 1000, grade = 12 } = {}) {
  const itens = [], naoMedido = []
  if (!secoes) {
    const b = await nav.rodar(NA_PAGINA.posicao)
    secoes = []
    for (let y = 0, i = 0; i < 40 && (i === 0 || (b.max != null && y <= b.max + b.vh * 0.5)); y += b.vh, i++) secoes.push({ indice: i, topoPx: b.max != null ? Math.min(y, b.max) : y })
  }
  let medidas = 0
  for (const sec of secoes) {
    const r = await rolarAte(nav, sec.topoPx)
    if (r.estado === 'falhou') { naoMedido.push({ pagina, etapa: 'parado', o: `seção ${sec.indice}`, motivo: `a rolagem não chegou a ${Math.round(sec.topoPx)} px (parou em ${Math.round(r.posicao)} px)` }); continue }
    await espera(esperaMs)
    let fotos = null
    for (let tentativa = 0; tentativa < 2 && !fotos; tentativa++) {
      const p0 = await nav.rodar(NA_PAGINA.posicao)
      grav.marcar({ pagina, gatilho: 'parado', secao: sec.indice, soFotos: true })
      const t0 = Date.now(), lote = []
      for (let k = 0; k < quadros; k++) {
        await espera(Math.max(0, t0 + (k * janelaMs) / Math.max(1, quadros - 1) - Date.now()))
        lote.push(await grav.foto())
      }
      const p1 = await nav.rodar(NA_PAGINA.posicao)
      if (Math.abs(p1.pos - p0.pos) < 1 && Math.abs(p1.virt - p0.virt) < 1) fotos = lote
      else await espera(700) // ainda era inércia: espera e tenta mais uma vez
    }
    if (!fotos) { naoMedido.push({ pagina, etapa: 'parado', o: `seção ${sec.indice}`, motivo: 'a página não parou de rolar sozinha; não dá para separar inércia de movimento próprio' }); continue }
    medidas++
    const imgs = fotos.map((q) => lerQuadro(grav, q))
    const vezes = new Array(grade * grade).fill(0), pico = new Array(grade * grade).fill(0)
    for (let k = 1; k < imgs.length; k++) diferencaQuadros(imgs[k - 1], imgs[k], grade).celulas.forEach((v, i) => { if (v > 0.01) { vezes[i]++; pico[i] = Math.max(pico[i], v) } })
    for (const reg of regioesAtivas(vezes.map((v, i) => (v >= 2 ? pico[i] : 0)), grade)) {
      let alvo = null
      try { alvo = await nav.rodar(NA_PAGINA.alvo, { ...reg.pico, caixa: { x: reg.x, y: reg.y, w: reg.w, h: reg.h } }) } catch {}
      if (!alvo) continue
      const mesmo = itens.find((it) => it.alvo.desc === alvo.desc)
      if (mesmo) { if (!mesmo.secoesVistas.includes(sec.indice)) mesmo.secoesVistas.push(sec.indice); continue }
      const it = itemBase({ pagina, secao: sec.indice, gatilho: 'parado', alvo, regiao: { x: r2(reg.x), y: r2(reg.y), w: r2(reg.w), h: r2(reg.h) }, quadros: fotos.map((q) => q.arquivo) })
      it.secoesVistas = [sec.indice]
      it.resumo = `${alvo.desc} mexe sozinho com a página parada`
      itens.push(it)
    }
  }
  const estado = !medidas ? 'falhou' : naoMedido.length ? 'parcial' : 'completa'
  return { itens, naoMedido, cobertura: { pagina, etapa: 'parado', estado, itens: itens.length, limites: `${medidas} de ${secoes.length} paradas, ${quadros} quadros em ${r2(janelaMs / 1000)} s cada`, motivo: naoMedido.length ? naoMedido[0].motivo : null } }
}

// Um quadro a cada 1/4 de tela andado de fato, descendo e (volta) subindo, com a posição real no manifesto.
// Se a rolagem travar no meio (na descida ou na subida) ou o limite de quadros cortar a captura, a cobertura sai
// "parcial" e cada trecho que faltou vai em naoMedido: [{ pagina, etapa: 'rolagem', o: 'descida' | 'subida', motivo }].
// Limite: na rolagem virtual não há fim conhecido; parar de andar depois de já ter andado conta como fim da página.
export async function capturarRolagem(nav, grav, { pagina = 'inicio', passoTelas = 0.25, limiteQuadros = 240, volta = true } = {}) {
  let r = await rolarAte(nav, 0)
  const passo = Math.max(20, r.vh * passoTelas), quadros = []
  const naoMedido = []
  const lacuna = (o, motivo) => naoMedido.push({ pagina, etapa: 'rolagem', o, motivo })
  if (r.estado === 'falhou' && Math.abs(r.posicao) > 4) lacuna('descida', 'não voltou ao topo antes de começar')
  grav.marcar({ pagina, gatilho: 'rolagem', sentido: 'descendo', soFotos: true })
  quadros.push(await grav.foto({ rolagemPx: r.posicao }))
  for (let i = 0; quadros.length < limiteQuadros; i++) {
    const antes = r.posicao
    r = await rolarAte(nav, antes + passo, { limiteTravaMs: i ? 2500 : 15_000 })
    if (r.posicao - antes < 1) {
      if (r.estado === 'falhou') lacuna('descida', i === 0 ? 'a rolagem ficou travada e não soltou' : `a rolagem travou em ${Math.round(r.posicao)} px, depois de já ter andado, e não soltou: dali para baixo não há quadro`)
      break
    }
    quadros.push(await grav.foto({ rolagemPx: r.posicao }))
    if (r.estado === 'falhou') lacuna('descida', `a rolagem parou em ${Math.round(r.posicao)} px sem completar o passo: dali para baixo não há quadro`)
    if (r.estado !== 'ok') break
  }
  const fimPx = r.posicao
  if (quadros.length >= limiteQuadros) lacuna('descida', `parou em ${limiteQuadros} quadros, em ${Math.round(fimPx)} px`)
  if (volta) {
    grav.marcar({ pagina, gatilho: 'rolagem', sentido: 'subindo', soFotos: true })
    while (r.posicao > 0.5 && quadros.length < limiteQuadros * 2) {
      const antes = r.posicao
      r = await rolarAte(nav, Math.max(0, antes - passo), { limiteTravaMs: 2500 })
      if (antes - r.posicao < 1) break
      quadros.push(await grav.foto({ rolagemPx: r.posicao }))
    }
    if (r.posicao > 4) lacuna('subida', quadros.length >= limiteQuadros * 2 ? `parou em ${limiteQuadros * 2} quadros, em ${Math.round(r.posicao)} px, sem voltar ao topo` : `a subida travou em ${Math.round(r.posicao)} px e não voltou ao topo: dali para cima não há quadro subindo`)
  }
  const motivo = naoMedido.length ? naoMedido.map((n) => `${n.o}: ${n.motivo}`).join('; ') : null
  return { quadros, fimPx, modo: r.modo, naoMedido,
    cobertura: { pagina, etapa: 'rolagem', estado: quadros.length < 2 ? 'falhou' : motivo ? 'parcial' : 'completa', itens: 0,
      limites: `${quadros.length} quadros, um a cada ${r2(passoTelas)} tela, até ${Math.round(fimPx)} px${volta ? ', ida e volta' : ''} (rolagem: ${r.modo})`, motivo } }
}

// Junta quadros (Buffer PNG/JPEG ou itens do manifesto) numa folha JPEG. Devolve o Buffer da folha.
export async function montarFolha(nav, quadros, { colunas = 4, legendas = [], qualidade = 0.8, pasta = null } = {}) {
  const imgs = quadros.map((q) => (Buffer.isBuffer(q) ? q : q.dados || fs.readFileSync(path.join(pasta, q.arquivo))).toString('base64'))
  if (!imgs.length) throw new Error('montarFolha: nenhum quadro')
  const b64 = await nav.rodar(NA_PAGINA.folha, { imgs, colunas: Math.max(1, Math.min(colunas, imgs.length)), legendas, qualidade }, 60_000)
  return Buffer.from(b64, 'base64')
}
