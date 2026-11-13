#!/usr/bin/env node
// Conferência das telas de sistema no navegador: layout, letra, toque, contraste, nomes e tabelas. Só lê a página.
// Uso: node conferir-tela.mjs --config design-sistemas.json --base <url> [pasta-saida] [--telas a,b] [--json]
// Saída: 0 tudo conferido e passou · 1 algum achado que reprova · 2 algo não deu para conferir.
// Cada tela da configuração é aberta no computador (1440x900) e no celular (390x844), uma vez por estado do contrato
// (estados.porTela): pede o estado, espera ele aparecer e parar de mudar, confere e grava o print
// <aparelho>-<tela>-<estado>.png na pasta de saída; no erro, confere o "Tentar de novo". Tela sem contrato é medida
// depois de parar de mudar, mas a cobertura de estados sai "não conferido" (saída 2). O motor do Chrome e a conta de
// contraste vêm do plugin landing-pages (só importados); sem ele ou sem Chrome, nada é conferido (saída 2).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { lerNiveis, validarEsquema } from './consistencia.mjs'
import { TELAS, parametrosDaTela, avaliarTela, aplicarExcecoes, saidaDe, contratoDaTela, enderecoDoEstado, seletorDoEstado,
  nomeDoPrint, colisoesDePrint, estabilidade, avaliarEstado, avaliarVazio, ESPERA_ESTADO } from './regras-tela.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const ESQUEMA = path.join(AQUI, '..', 'esquema-config.json')
export const ITENS = ['rolagem-lateral', 'elemento-cortado', 'letra-minima', 'toque-minimo', 'contraste', 'nome-acessivel',
  'tabela-sem-cabecalho', 'lista-virtual', 'estado-confirmado', 'estado-estavel', 'tentar-de-novo', 'tela-em-branco']
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

// No repositório os plugins são irmãos (plugins/<nome>); instalados, ficam em cache/<marketplace>/<nome>/<versão>.
const PRECISA = ['skills/lp-revisao/scripts/celular.mjs', 'skills/lp-referencias/scripts/raio-x.mjs']
export function acharLandingPages (aqui = AQUI) {
  const ok = (p) => PRECISA.every((f) => fs.existsSync(path.join(p, f)))
  const noRepo = path.resolve(aqui, '../../../..', 'landing-pages')
  if (ok(noRepo)) return noRepo
  const instalado = path.resolve(aqui, '../../../../..', 'landing-pages')
  const versoes = (() => { try { return fs.readdirSync(instalado) } catch { return [] } })()
    .filter((v) => ok(path.join(instalado, v)))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  return versoes.length ? path.join(instalado, versoes[0]) : null
}

// ---------- medida na página (vai ao navegador; não usa nada de fora além de corParaRgba) ----------
function medirTela (corParaRgba) {
  const estilo = (e) => getComputedStyle(e)
  const seletor = (el) => {
    const partes = []
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (e.id) { partes.unshift('#' + CSS.escape(e.id)); break }
      const tag = e.tagName.toLowerCase()
      if (tag === 'body' || tag === 'html') { partes.unshift(tag); break }
      const irmaos = e.parentElement ? [...e.parentElement.children].filter((x) => x.tagName === e.tagName) : []
      partes.unshift(irmaos.length > 1 ? `${tag}:nth-of-type(${irmaos.indexOf(e) + 1})` : tag)
    }
    return partes.join(' > ')
  }
  const visivel = (el) => {
    const r = el.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1) return false
    const s = estilo(el)
    if (s.visibility === 'hidden' || s.display === 'none') return false
    for (let e = el; e; e = e.parentElement) if (Number(estilo(e).opacity) === 0) return false
    return true
  }
  // do elemento até a raiz: fundo, opacidade e se tem imagem/degradê (a conta fica em corVista, regras-tela.mjs)
  const pilhaDe = (el) => {
    const p = []
    for (let e = el; e; e = e.parentElement) {
      const s = estilo(e)
      const imagem = !!s.backgroundImage && s.backgroundImage !== 'none'
      p.push({ fundo: imagem ? null : corParaRgba(s.backgroundColor) || [0, 0, 0, 0], opacidade: Number(s.opacity), imagem })
    }
    return p
  }
  const resumo = (t) => { const s = String(t).replace(/\s+/g, ' ').trim(); return s.length > 40 ? s.slice(0, 39) + '…' : s }
  const CAMPO = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), textarea, select, [role=combobox], [role=textbox], [role=spinbutton], [role=searchbox], [role=listbox], [contenteditable]:not([contenteditable=false])'
  // campo em que se digita (e o select nativo, que também dá zoom no iPhone): só ele dá zoom no foco do celular abaixo de 16 px (botão com role=combobox, como o
  // SelectTrigger do shadcn, não digita e segue o mínimo geral de letra)
  const DIGITA = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), textarea, select, [role=textbox], [role=spinbutton], [role=searchbox], [contenteditable]:not([contenteditable=false])'
  const desabilitado = (el) => !!el.closest(':disabled, [aria-disabled="true"]')
  const todos = [...document.body.querySelectorAll('*')].filter((e) => !/^(script|style|noscript|template)$/i.test(e.tagName))

  // rolagem lateral da página (a rolagem dentro de um elemento com overflow-x não conta: ela não alarga a página)
  const de = document.documentElement
  const larguraTela = de.clientWidth
  const larguraConteudo = Math.max(de.scrollWidth, document.body.scrollWidth)
  const culpados = []
  if (larguraConteudo > larguraTela + 1) {
    for (const el of todos) {
      const r = el.getBoundingClientRect()
      if (r.right <= larguraTela + 1 || r.width <= 1) continue
      let dentroDeRolagem = false
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (/(auto|scroll|hidden|clip)/.test(estilo(p).overflowX)) { dentroDeRolagem = true; break }
      if (dentroDeRolagem) continue
      if (culpados.some((c) => c.el.contains(el))) continue
      culpados.push({ el, s: seletor(el) })
    }
  }

  const textos = []
  const campos = []
  const cortados = []
  for (const el of todos) {
    if (el.closest('svg')) continue
    const direto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim()
    const ehCampo = el.matches(CAMPO)
    const ehBotaoInput = el.matches('input[type=submit], input[type=button], input[type=reset]')
    const texto = direto || ((ehCampo || ehBotaoInput) && el.tagName !== 'SELECT' ? el.value : '') || (el.tagName === 'SELECT' ? el.selectedOptions?.[0]?.textContent || '' : '')
    if (!visivel(el)) continue
    const s = estilo(el)
    if (texto && String(texto).trim()) {
      textos.push({ seletor: seletor(el), texto: resumo(texto), px: parseFloat(s.fontSize), peso: Number(s.fontWeight) || 400,
        cor: corParaRgba(s.color) || [0, 0, 0, 1], pilha: pilhaDe(el), desabilitado: desabilitado(el) })
    }
    if (ehCampo) {
      const lados = ['Top', 'Right', 'Bottom', 'Left'].map((l) => ({ w: parseFloat(s[`border${l}Width`]) || 0, cor: s[`border${l}Color`], estilo: s[`border${l}Style`] }))
        .filter((l) => l.w > 0 && l.estilo !== 'none' && l.estilo !== 'hidden').sort((a, b) => b.w - a.w)
      campos.push({ seletor: seletor(el), px: parseFloat(s.fontSize), digita: el.matches(DIGITA) && !el.matches('button, [role=button]'), borda:lados.length ? corParaRgba(lados[0].cor) : null,
        pilha: pilhaDe(el), desabilitado: desabilitado(el) })
    }
    // cortado: texto ou controle que passa da borda de quem corta (overflow hidden/clip; rolagem não corta)
    if ((texto && String(texto).trim()) || el.matches('button, a[href], ' + CAMPO)) {
      const r = el.getBoundingClientRect()
      const cortaX = (e) => /(hidden|clip)/.test(estilo(e).overflowX)
      const cortaY = (e) => /(hidden|clip)/.test(estilo(e).overflowY)
      let por = null, quem = null
      if (direto && (cortaX(el) && el.scrollWidth > el.clientWidth + 2 || cortaY(el) && el.scrollHeight > el.clientHeight + 2)) { por = 'si mesmo'; quem = el }
      for (let p = el.parentElement; !por && p && p !== document.body && p !== de; p = p.parentElement) {
        const ps = estilo(p)
        if (/(auto|scroll)/.test(ps.overflowX + ps.overflowY) && !cortaX(p) && !cortaY(p)) break
        if (!cortaX(p) && !cortaY(p)) continue
        const q = p.getBoundingClientRect()
        if (q.width <= 1 || q.height <= 1) break
        const bx = q.left + p.clientLeft, by = q.top + p.clientTop
        const foraX = cortaX(p) && (r.left < bx - 1 || r.right > bx + p.clientWidth + 1)
        const foraY = cortaY(p) && (r.top < by - 1 || r.bottom > by + p.clientHeight + 1)
        if (foraX || foraY) { por = seletor(p); quem = p }
      }
      if (por) {
        // truncamento deliberado: reticências ou line-clamp em quem corta; acessível se o texto inteiro está em
        // title ou aria-label (do elemento ou de um ancestral) ou numa descrição ligada por aria-describedby
        const qs = estilo(quem)
        const deliberado = (qs.textOverflow === 'ellipsis' && cortaX(quem)) || (qs.webkitLineClamp && qs.webkitLineClamp !== 'none')
        const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim()
        const inteiro = norm(quem.textContent)
        let acessivel = false
        for (let e = el; deliberado && !acessivel && e && e !== document.body; e = e.parentElement) {
          const descr = (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent || '').join(' ')
          acessivel = !!inteiro && [e.getAttribute('title'), e.getAttribute('aria-label'), descr].some((v) => norm(v).includes(inteiro))
        }
        cortados.push({ seletor: seletor(el), texto: resumo(texto || el.getAttribute('aria-label') || el.tagName.toLowerCase()), por, deliberado: !!deliberado, acessivel })
      }
    }
  }

  // alvos de toque. O rótulo só amplia o alvo de caixa de marcar, rádio e interruptor (clicar nele ativa o controle);
  // ancestral que só é focável (tabindex) não esconde os controles de dentro.
  const ALVO = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=menuitem], [tabindex]:not([tabindex="-1"])'
  const ALVO_DONO = ALVO.replace(', [tabindex]:not([tabindex="-1"])', '')
  const MARCAR = 'input[type=checkbox], input[type=radio], [role=checkbox], [role=radio], [role=switch]'
  const alvos = []
  for (const el of document.body.querySelectorAll(ALVO)) {
    if (!visivel(el) || desabilitado(el)) continue
    if (el.parentElement?.closest(ALVO_DONO)) continue
    let r = el.getBoundingClientRect()
    const rotulo = el.matches(MARCAR) && (el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)))
    if (rotulo && visivel(rotulo)) {
      const q = rotulo.getBoundingClientRect()
      r = { width: Math.max(r.width, q.width), height: Math.max(r.height, q.height) }
    }
    const pai = el.parentElement
    const emLinha = el.tagName === 'A' && estilo(el).display === 'inline' && pai && [...pai.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    alvos.push({ seletor: seletor(el), w: r.width, h: r.height, emLinha })
  }

  // controles para o nome acessível (o nome vem do Chrome, por fora)
  const CONTROLE = 'input:not([type=hidden]), textarea, select, button, a[href], [role=button], [role=link], [role=textbox], [role=combobox], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=menuitem], [role=searchbox], [role=slider]'
  const lista = [...document.body.querySelectorAll(CONTROLE)].filter((e) => e.getClientRects().length).slice(0, 800)
  window.__conferirTelaControles = lista
  const controles = lista.map((e) => ({ seletor: seletor(e), tipo: e.getAttribute('role') || e.tagName.toLowerCase() }))

  // tabelas
  const tabelas = []
  for (const el of document.body.querySelectorAll('table, [role=grid], [role=table], [role=treegrid]')) {
    if (!visivel(el) || /^(presentation|none)$/.test(el.getAttribute('role') || '')) continue
    const tipo = el.getAttribute('role') || 'table'
    const temCabecalho = el.tagName === 'TABLE' && !el.getAttribute('role') ? !!el.querySelector('th') : !!el.querySelector('th, [role=columnheader]')
    tabelas.push({ seletor: seletor(el), tipo, temCabecalho })
  }

  // lista virtual: aria-rowcount/aria-setsize maior que o desenhado, ou rolagem alta com linhas posicionadas à mão
  const virtuais = []
  for (const el of todos) {
    const s = estilo(el)
    const linhas = Number(el.getAttribute('aria-rowcount'))
    let virtual = linhas > 0 && linhas > el.querySelectorAll('tr, [role=row]').length
    if (!virtual && /(auto|scroll)/.test(s.overflowY) && el.clientHeight > 0 && el.scrollHeight > el.clientHeight * 3) {
      const netos = [...el.querySelectorAll(':scope > * > *')]
      const soltos = netos.filter((f) => { const fs = estilo(f); return fs.position === 'absolute' || fs.transform !== 'none' })
      virtual = netos.length >= 3 && soltos.length >= netos.length * 0.8
    }
    if (virtual && !virtuais.some((v) => v.el.contains(el))) virtuais.push({ el, seletor: seletor(el) })
  }

  return {
    pagina: { larguraConteudo, larguraTela, culpados: culpados.map((c) => c.s) },
    textos, campos, cortados, alvos, controles, tabelas,
    virtuais: virtuais.map((v) => ({ seletor: v.seletor }))
  }
}

// ---------- navegador ----------
// Estourou a espera de carregamento: erro (vira "não conferido"), nunca segue medindo página pela metade.
async function abrirTela (motor, url, tipo, carregar = ESPERA_ESTADO.carregar) {
  const { cmd } = motor
  const { userAgent } = await cmd('Browser.getVersion')
  const versao = (userAgent.match(/Chrome\/([\d.]+)/) || [])[1]
  const p = parametrosDaTela(tipo, versao)
  await cmd('Emulation.setDeviceMetricsOverride', p.metricas)
  await cmd('Emulation.setTouchEmulationEnabled', p.toque)
  await cmd('Emulation.setUserAgentOverride', { userAgent: p.agente })
  await cmd('Page.navigate', { url: 'about:blank' })
  const r = await cmd('Page.navigate', { url })
  if (r.errorText) throw new Error(`não abriu ${url}: ${r.errorText}`)
  const t0 = Date.now()
  let pronta = false
  while (!pronta && Date.now() - t0 <= carregar) {
    await espera(150)
    try { pronta = await motor.rodar(() => location.href !== 'about:blank' && document.readyState === 'complete') } catch {}
  }
  if (!pronta) throw new Error(`a página não terminou de carregar em ${carregar / 1000} s (não medida)`)
  await motor.rodar(() => document.fonts.ready.then(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(true))))))
}

async function lerNomes (motor, controles) {
  const { cmd } = motor
  for (let i = 0; i < controles.length; i++) {
    try {
      const { result } = await cmd('Runtime.evaluate', { expression: `window.__conferirTelaControles[${i}]`, objectGroup: 'conferir-tela' })
      if (!result.objectId) continue
      const { nodes } = await cmd('Accessibility.getPartialAXTree', { objectId: result.objectId, fetchRelatives: false })
      const no = nodes?.[0]
      if (!no || no.ignored) { controles[i].ignorado = true; continue }
      controles[i].nome = no.name?.value ?? ''
    } catch { /* fica sem nome lido: vira "não medido" */ }
  }
  try { await cmd('Runtime.releaseObjectGroup', { objectGroup: 'conferir-tela' }) } catch {}
}

// ---------- estados ----------
// O estado só vale com a raiz do marcador VISÍVEL (tamanho, display, visibility, opacity até o topo); marcador
// escondido não confirma nada. ausente: o contrário (a tela saiu do estado). A assinatura junta texto, quantidade,
// geometria e aparência de cada elemento, para animação só de CSS (opacidade, posição, cor) também contar como mudança.
const LER_ESTADO = `({ sel, ausente }) => {
  const visivel = (el) => {
    const r = el.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1) return false
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden') return false
    for (let e = el; e; e = e.parentElement) if (Number(getComputedStyle(e).opacity) === 0) return false
    return true
  }
  const visto = [...document.querySelectorAll(sel)].some(visivel)
  // Animação declarada como contínua (repetição infinita: esqueleto pulsando, girador) é carregamento legítimo e
  // nunca para: o elemento animado e o que está dentro dele ficam fora da geometria e da aparência. O texto, a
  // quantidade de elementos e todo o resto da tela continuam valendo. Piscar feito por script não é declarado: conta.
  const continuos = []
  try {
    for (const a of document.getAnimations()) {
      const alvo = a.effect && a.effect.target
      if (alvo && a.playState === 'running' && a.effect.getComputedTiming().iterations === Infinity) continuos.push(alvo)
    }
  } catch {}
  const todos = document.body ? document.body.getElementsByTagName('*') : []
  let t = (document.body ? document.body.innerText : '') + '|' + todos.length
  for (let i = 0; i < Math.min(todos.length, 3000); i++) {
    if (continuos.length && continuos.some((g) => g === todos[i] || g.contains(todos[i]))) { t += '|~'; continue }
    const e = todos[i], r = e.getBoundingClientRect(), s = getComputedStyle(e)
    t += '|' + [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), s.opacity, s.transform,
      s.color, s.backgroundColor, s.visibility, s.display].join(',')
  }
  let h = 5381
  for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0
  return { presente: ausente ? !visto : visto, assinatura: h }
}`
const SELETOR_VALIDO = (s) => { try { document.querySelector(s); return true } catch { return false } }

// Textos visíveis dentro da raiz do estado e fora de título (para o "vazio" que precisa se explicar).
const TEXTOS_FORA_DE_TITULO = (sel) => {
  const raiz = [...document.querySelectorAll(sel)][0]
  if (!raiz) return []
  const fora = []
  const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
  for (let n = andar.nextNode(); n; n = andar.nextNode()) {
    const txt = n.textContent.trim()
    const el = n.parentElement
    if (!txt || !el || el.closest('h1, h2, h3, h4, h5, h6, [role=heading], script, style, template')) continue
    const r = el.getBoundingClientRect(), s = getComputedStyle(el)
    if (r.width <= 1 || r.height <= 1 || s.display === 'none' || s.visibility === 'hidden') continue
    let opaco = true
    for (let e = el; e; e = e.parentElement) if (Number(getComputedStyle(e).opacity) === 0) opaco = false
    if (opaco) fora.push(txt)
  }
  return fora
}

async function esperarEstado (motor, seletor, limites, ausente = false) {
  const leituras = []
  const t0 = Date.now()
  for (;;) {
    const t = Date.now() - t0
    try { leituras.push({ t, ...(await motor.rodar(LER_ESTADO, { sel: seletor, ausente })) }) } catch { leituras.push({ t, presente: false }) }
    const est = estabilidade(leituras, limites)
    if (est.estavel || t > limites.limite) return est
    await espera(200)
  }
}

// Acha o "Tentar de novo" (seletor do contrato; sem ele, botão ou link com esse texto), confere que está visível e
// não encoberto, clica por coordenadas (como um dedo) e espera a tela chegar a outro estado ESTÁVEL (erro fora e
// 1 s sem mudança). Devolve { falta: 'ausente'|'escondido'|'encoberto' } ou { saiu: true|false }.
async function tentarDeNovo (motor, seletorBotao, seletorErro, limites, seletoresDestino = []) {
  const alvo = await motor.rodar((s) => {
    let b = null
    try { b = document.querySelector(s) } catch {}
    if (!b) b = [...document.querySelectorAll('button, a, [role=button]')].find((e) => /tentar de novo/i.test(e.textContent || ''))
    if (!b) return { falta: 'ausente' }
    b.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    const r = b.getBoundingClientRect(), st = getComputedStyle(b)
    let opaco = true
    for (let e = b; e; e = e.parentElement) if (Number(getComputedStyle(e).opacity) === 0) opaco = false
    if (r.width <= 1 || r.height <= 1 || st.display === 'none' || st.visibility === 'hidden' || !opaco) return { falta: 'escondido' }
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    const topo = document.elementFromPoint(x, y)
    if (!topo || !(topo === b || b.contains(topo)) || st.pointerEvents === 'none') return { falta: 'encoberto' }
    return { x, y }
  }, seletorBotao)
  if (alvo.falta) return alvo
  const { x, y } = alvo
  await motor.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await motor.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await motor.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  if (!(await esperarEstado(motor, seletorErro, limites, true)).estavel) return { saiu: false }
  // sair do erro para uma tela em branco não é recuperar: exige a raiz de outro estado do contrato visível e com texto
  const chegou = await motor.rodar((sels) => sels.some((s) => {
    let els = []
    try { els = [...document.querySelectorAll(s)] } catch {}
    return els.some((e) => {
      const r = e.getBoundingClientRect(), st = getComputedStyle(e)
      let opaco = true
      for (let a = e; a; a = a.parentElement) if (Number(getComputedStyle(a).opacity) === 0) opaco = false
      return r.width > 1 && r.height > 1 && st.display !== 'none' && st.visibility !== 'hidden' && opaco && !!(e.innerText || '').trim()
    })
  }), seletoresDestino)
  return chegou ? { saiu: true } : { saiu: false, branco: true }
}

async function fotografar (motor, arquivo) {
  let r
  try { r = await motor.cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }) } catch { r = await motor.cmd('Page.captureScreenshot', { format: 'png' }) }
  fs.writeFileSync(arquivo, Buffer.from(r.data, 'base64'))
}

function lerConfig (explicita) {
  const arq = explicita ? (fs.existsSync(explicita) ? path.resolve(explicita) : null)
    : (fs.existsSync(path.join(process.cwd(), 'design-sistemas.json')) ? path.join(process.cwd(), 'design-sistemas.json') : null)
  if (!arq) return { erro: explicita ? `configuração não encontrada: ${explicita}` : 'sem design-sistemas.json: não dá para saber as telas nem os mínimos' }
  try {
    const dado = JSON.parse(fs.readFileSync(arq, 'utf8'))
    const erros = validarEsquema(JSON.parse(fs.readFileSync(ESQUEMA, 'utf8')), dado)
    if (erros.length) return { arq, erro: `configuração inválida (${erros.slice(0, 5).join('; ')})` }
    return { arq, config: dado }
  } catch (e) {
    return { arq, erro: `configuração ilegível: ${e.message}` }
  }
}

function fechamento (r) {
  r.achados.sort((a, b) => a.tela.localeCompare(b.tela) || a.tamanho.localeCompare(b.tamanho) || a.regra.localeCompare(b.regra) || a.seletor.localeCompare(b.seletor))
  r.saida = saidaDe(r.achados, r.naoConferido)
  r.resumo = {
    nuncaPassa: r.achados.filter((a) => a.nivel === 'nunca passa').length,
    exigeJustificativa: r.achados.filter((a) => a.nivel === 'exige justificativa').length,
    avisos: r.achados.filter((a) => a.nivel === 'aviso').length,
    naoConferido: r.naoConferido.length
  }
  return r
}

// pasta: onde gravar um print por aparelho x tela x estado (opcional). esperaEstado: { quieto, limite } em ms
// (padrão 1 s quieto, até 10 s; só os testes mudam).
export async function conferir ({ config: caminhoConfig, base, telas: filtro, pasta, esperaEstado } = {}) {
  const niveis = lerNiveis()
  const r = { config: null, base: base || null, telas: [], achados: [], naoConferido: [], excecoesIgnoradas: [], excecoesAvisos: [] }
  const lido = lerConfig(caminhoConfig)
  r.config = lido.arq || null
  if (lido.erro) { r.naoConferido.push({ motivo: lido.erro }); return fechamento(r) }
  const config = lido.config
  const todas = Object.entries(config.telas || {})
  if (!todas.length) { r.naoConferido.push({ motivo: 'a configuração não tem "telas" (id -> endereço)' }); return fechamento(r) }
  let escolhidas = todas
  if (filtro?.length) {
    for (const id of filtro) if (!config.telas[id]) r.naoConferido.push({ motivo: `tela "${id}" não está na configuração` })
    escolhidas = todas.filter(([id]) => filtro.includes(id))
  }
  const enderecos = []
  for (const [id, end] of escolhidas) {
    if (/^https?:\/\//.test(end)) enderecos.push([id, end])
    else if (!base) r.naoConferido.push({ motivo: `tela "${id}": endereço relativo sem --base`, tela: id })
    else enderecos.push([id, new URL(end, base.endsWith('/') ? base : base + '/').href])
  }
  const lp = acharLandingPages()
  if (!lp) { r.naoConferido.push({ motivo: 'sem o plugin landing-pages (motor do Chrome e conta de contraste): nada conferido no navegador' }); return fechamento(r) }
  const { acharNavegador, motorChrome } = await import(pathToFileURL(path.join(lp, PRECISA[0])).href)
  const { contraste, corParaRgba } = await import(pathToFileURL(path.join(lp, PRECISA[1])).href)
  const exe = acharNavegador()
  if (!exe) { r.naoConferido.push({ motivo: 'sem Chrome/Edge (defina BROWSER_EXECUTABLE): nada conferido no navegador' }); return fechamento(r) }
  if (!enderecos.length) return fechamento(r)

  let motor
  try { motor = await motorChrome(exe) } catch { await espera(1500); try { motor = await motorChrome(exe) } catch (e) { r.naoConferido.push({ motivo: `o Chrome não abriu: ${e.message}` }); return fechamento(r) } }
  const achados = []
  try {
    try { await motor.cmd('DOM.enable') } catch {}
    try { await motor.cmd('Accessibility.enable') } catch {}
    const medir = `(arg) => { const corParaRgba = ${corParaRgba}; return (${medirTela})(corParaRgba) }`
    const limites = { ...ESPERA_ESTADO, ...(esperaEstado || {}) }
    if (pasta) fs.mkdirSync(pasta, { recursive: true })
    const achar = (a, id, tamanho, estado) => ({ ...a, nivel: niveis[a.regra], tela: id, tamanho, ...(estado ? { estado } : {}) })
    // nomes de print que colidem ficam sem print (não conferido) em vez de um sobrescrever o outro
    const colidem = new Set()
    if (pasta) {
      const pares = enderecos.flatMap(([id]) => (contratoDaTela(config.estados, id)?.lista || [null]).map((estado) => ({ tela: id, estado })))
      for (const [nome, lista] of Object.entries(colisoesDePrint(pares))) {
        for (const p of lista) {
          colidem.add(`${p.tela}|${p.estado}`)
          r.naoConferido.push({ motivo: `print "<aparelho>-${nome}" sairia igual para ${lista.map((q) => `tela "${q.tela}"${q.estado ? ` estado "${q.estado}"` : ''}`).join(' e ')}: renomeie a tela ou o estado (print não gravado)`, tela: p.tela, ...(p.estado ? { estado: p.estado } : {}) })
        }
      }
    }
    for (const [id, url] of enderecos) {
      const contrato = contratoDaTela(config.estados, id)
      const rodadas = contrato ? contrato.lista : [null]
      // sem contrato o layout é medido, mas os estados (vazio, erro, carregando) não: nunca "passou"
      if (!contrato) r.naoConferido.push({ motivo: `tela "${id}" sem contrato de estados (estados.porTela.${id}.lista): cobertura de estados não conferida`, tela: id, cobertura: 'estados' })
      for (const tamanho of Object.keys(TELAS)) {
        for (const estado of rodadas) {
          const onde = `tela "${id}"${estado ? ` (estado ${estado})` : ''} no ${tamanho}`
          const nc = (motivo, extra = {}) => r.naoConferido.push({ motivo, tela: id, tamanho, ...(estado ? { estado } : {}), ...extra })
          try {
            const endereco = estado ? enderecoDoEstado(url, contrato.pedir, estado) : url
            await abrirTela(motor, endereco, tamanho, limites.carregar)
            const seletor = estado ? seletorDoEstado(contrato.confirmar, estado) : 'body'
            if (estado) {
              // pede, espera estabilizar e só então confere e fotografa
              if (!(await motor.rodar(SELETOR_VALIDO, seletor))) { nc(`${onde}: seletor de confirmação inválido: ${seletor}`); continue }
              const falha = avaliarEstado(estado, seletor, await esperarEstado(motor, seletor, limites), limites.limite)
              if (falha) { achados.push(achar(falha, id, tamanho, estado)); continue }
            } else if (!(await esperarEstado(motor, 'body', limites)).estavel) {
              // sem contrato: mede só depois que a tela para de mudar; não parou = não dá para medir
              nc(`${onde}: a tela não parou de mudar em ${limites.limite / 1000} s (não medida)`)
              continue
            }
            const m = await motor.rodar(medir)
            await lerNomes(motor, m.controles)
            const avaliado = avaliarTela(m, tamanho, { letra: config.letra, contraste })
            const novos = [...avaliado.achados, ...avaliarVazio(estado, seletor, await motor.rodar(TEXTOS_FORA_DE_TITULO, seletor)).achados]
            const { naoMedido } = avaliado
            const vistos = new Set()
            for (const a of novos) {
              const k = `${a.regra}|${a.seletor}`
              if (vistos.has(k)) continue
              vistos.add(k)
              achados.push(achar(a, id, tamanho, estado))
            }
            for (const n of naoMedido) nc(`não medido (${n.regra}): ${n.motivo}`, { seletor: n.seletor })
            let print = null
            if (pasta && !colidem.has(`${id}|${estado}`)) {
              print = nomeDoPrint(tamanho, id, estado)
              await fotografar(motor, path.join(pasta, print))
            }
            r.telas.push({ id, tamanho, ...(estado ? { estado } : {}), url: endereco, textos: m.textos.length, controles: m.controles.length, print })
            if (estado === 'erro') {
              // o contrato exige recuperação: botão ausente, escondido ou encoberto reprova, como o que não recupera
              const t = await tentarDeNovo(motor, contrato.tentarDeNovo, seletorDoEstado(contrato.confirmar, 'erro'), limites,
                contrato.lista.filter((e) => e !== 'erro').map((e) => seletorDoEstado(contrato.confirmar, e)))
              const porque = { ausente: 'não há botão "Tentar de novo" no estado de erro', escondido: 'o "Tentar de novo" está escondido',
                encoberto: 'o "Tentar de novo" está encoberto por outro elemento (o clique não chega nele)' }[t.falta] ||
                (t.branco && '"Tentar de novo" saiu do erro para uma tela sem estado visível com conteúdo (em branco)') ||
                (!t.saiu && `"Tentar de novo" não levou a tela a outro estado estável em ${limites.limite / 1000} s`)
              if (porque) achados.push(achar({ regra: 'tentar-de-novo', seletor: contrato.tentarDeNovo, texto: porque }, id, tamanho, estado))
            }
          } catch (e) {
            nc(`${onde}: ${e.message}`)
          }
        }
      }
    }
  } finally {
    await motor.fechar()
  }
  const { restantes, ignoradas, avisos } = aplicarExcecoes(achados, config.excecoes || [], niveis)
  r.achados = restantes
  r.excecoesIgnoradas = ignoradas
  r.excecoesAvisos = avisos
  return fechamento(r)
}

export function relatorio (r) {
  const l = [`Telas no navegador (${r.telas.length} aberta(s); configuração: ${r.config || 'nenhuma'})`]
  for (const a of r.achados) l.push(`  [${a.nivel}] ${a.regra}  ${a.tela}${a.estado ? `/${a.estado}` : ''} (${a.tamanho})  ${a.seletor}  ${a.texto}`)
  for (const n of r.naoConferido) l.push(`  [não conferido] ${n.motivo}${n.seletor ? `  ${n.tela} (${n.tamanho})  ${n.seletor}` : ''}`)
  for (const e of r.excecoesIgnoradas) l.push(`  [exceção ignorada] ${e.regra} ${e.arquivo} ${e.local}: ${e.porque}`)
  for (const e of r.excecoesAvisos || []) l.push('  [aviso de exceção] ' + e.regra + ' ' + e.arquivo + ' ' + e.local + ': ' + e.porque)
  const fim = { 0: 'tudo conferido e passou', 1: 'reprovado', 2: 'NÃO CONFERIDO (não é "passou")' }[r.saida]
  l.push(`Resultado: ${fim} — ${r.resumo.nuncaPassa} nunca passa, ${r.resumo.exigeJustificativa} exige justificativa, ${r.resumo.avisos} aviso(s), ${r.resumo.naoConferido} não conferido(s). Saída ${r.saida}.`)
  return l.join('\n')
}

export function lerArgs (args) {
  const op = { json: false, pos: [] }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--config') op.config = args[++i]
    else if (a === '--base') op.base = args[++i]
    else if (a === '--telas') op.telas = String(args[++i] || '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '--json') op.json = true
    else if (a.startsWith('--')) op.erro = `opção desconhecida: ${a}`
    else op.pos.push(a)
  }
  op.saida = op.pos[0]
  return op
}

async function principal (args) {
  const op = lerArgs(args)
  if (op.erro) {
    console.error(`${op.erro}\nUso: node conferir-tela.mjs --config design-sistemas.json --base <url> [pasta-saida] [--telas a,b] [--json]`)
    return 2
  }
  const r = await conferir({ ...op, pasta: op.saida })
  const texto = relatorio(r)
  if (op.saida) {
    fs.mkdirSync(op.saida, { recursive: true })
    fs.writeFileSync(path.join(op.saida, 'conferir-tela.json'), JSON.stringify(r, null, 2))
    fs.writeFileSync(path.join(op.saida, 'conferir-tela.txt'), texto + '\n')
  }
  console.log(op.json ? JSON.stringify(r, null, 2) : texto)
  return r.saida
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exitCode = await principal(process.argv.slice(2))
