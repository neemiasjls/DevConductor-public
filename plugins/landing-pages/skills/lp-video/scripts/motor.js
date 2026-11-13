// Motor do vídeo de venda. Roda dentro do Chrome, na página do modelo (modelos/*.html), e é servido pelo
// video-de-venda.mjs em /__video__/motor.js. Não usa biblioteca nenhuma.
//
// O que ele faz:
// 1. lê o site que está no <iframe id="site"> (cores, fontes, posição das seções);
// 2. entrega ao modelo uma linha do tempo simples (anima, cena, rola, corta);
// 3. posiciona tudo num instante exato com Video.ir(t). Nada aqui olha o relógio: o mesmo t dá sempre o mesmo quadro;
// 4. mede os textos do vídeo (tempo na tela, tamanho da letra, onde ficam) para a checagem.
//
// Regra do Chrome que o motor respeita: com o relógio parado, a foto do quadro trava se o <iframe> do site se mexe,
// é recortado ou fica escondido. Por isso o site nunca sai do lugar: quem cobre, mexe ou some é o que está em volta.
// Para o site "entrar andando", o modelo move uma foto dele (v.foto) e troca pela janela viva quando ela para.
//
// Medidas em px de CSS: o quadro tem 432 x 768 e sai em 1080 x 1920 (2,5x). Letra de 28 px no vídeo = 11,2 px aqui.
;(() => {
  'use strict'

  const LARGURA = 432, ALTURA = 768, FPS = 30
  const prender = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))

  // Curvas de movimento (p vai de 0 a 1).
  const CURVAS = {
    linear: (p) => p,
    entra2: (p) => p * p,
    entra3: (p) => p * p * p,
    sai2: (p) => 1 - (1 - p) ** 2,
    sai3: (p) => 1 - (1 - p) ** 3,
    sai4: (p) => 1 - (1 - p) ** 4,
    vai2: (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
    vai3: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
    vai4: (p) => (p < 0.5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2),
    seno: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    volta: (p) => 1 + 2.6 * (p - 1) ** 3 + 1.6 * (p - 1) ** 2,
    // Dedo no celular: arranca rápido e vai parando.
    toque: (p) => 1 - (1 - p ** 1.5) ** 3,
  }
  const PADRAO = { x: 0, y: 0, xp: 0, yp: 0, escala: 1, escalaX: 1, escalaY: 1, giro: 0, giroX: 0, giroY: 0, opacidade: 1, recorte: [0, 0, 0, 0] }

  const E = {
    modelo: null, dados: null, site: null, janela: null, palco: null,
    tweens: [], cenas: [], rolagens: [], fotos: [], congelados: [], duracao: 0,
    secoes: [], cores: null, fontes: null, unidades: [], avisos: [],
  }

  const um = (alvo) => (typeof alvo === 'string' ? document.querySelector(alvo) : alvo)
  const varios = (alvo) => {
    if (typeof alvo === 'string') return [...document.querySelectorAll(alvo)]
    if (alvo instanceof Element) return [alvo]
    return [...alvo]
  }
  const mistura = (a, b, p) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * p) : a + (b - a) * p)

  // ------------------------------------------------------------------------------------------------------
  // Cores
  // ------------------------------------------------------------------------------------------------------
  const tela = document.createElement('canvas')
  tela.width = tela.height = 1
  const pincel = tela.getContext('2d', { willReadFrequently: true })
  const cacheCor = new Map()
  // Qualquer cor de CSS (rgb, oklch, nome) → [r, g, b, a].
  function cor(texto) {
    if (cacheCor.has(texto)) return cacheCor.get(texto)
    pincel.clearRect(0, 0, 1, 1)
    pincel.fillStyle = 'rgba(0,0,0,0)'
    pincel.fillStyle = texto
    pincel.fillRect(0, 0, 1, 1)
    const d = pincel.getImageData(0, 0, 1, 1).data
    const c = [d[0], d[1], d[2], Math.round((d[3] / 255) * 100) / 100]
    cacheCor.set(texto, c)
    return c
  }
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
  const canal = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const luz = (c) => 0.2126 * canal(c[0]) + 0.7152 * canal(c[1]) + 0.0722 * canal(c[2])
  const contraste = (a, b) => { const x = luz(a), y = luz(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  const saturacao = (c) => { const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx === 0 ? 0 : (mx - mn) / mx }

  // Lê as cores que o site usa de verdade e escolhe: fundo do palco, texto e destaque.
  function lerCores(doc, win) {
    const fundos = new Map(), textos = new Map(), botoes = new Map(), familias = new Map()
    const soma = (mapa, c, peso) => { const k = hex(c); mapa.set(k, (mapa.get(k) || 0) + peso) }
    const seletorBotao = 'a[href*="wa.me"], a[href*="whatsapp"], a[href^="tel:"], button, [role="button"], a[class*="btn"], a[class*="button"], a[class*="botao"]'
    const todos = [doc.documentElement, doc.body, ...doc.body.querySelectorAll('*')].slice(0, 5000)
    for (const el of todos) {
      const cs = win.getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const fundo = cor(cs.backgroundColor)
      if (fundo[3] >= 0.9) {
        soma(fundos, fundo, r.width * r.height)
        if (el.matches(seletorBotao)) soma(botoes, fundo, 1)
      }
      const proprio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (proprio) {
        const c = cor(cs.color)
        if (c[3] >= 0.9) soma(textos, c, el.textContent.trim().length * parseFloat(cs.fontSize))
        const f = familias.get(cs.fontFamily) || { letras: 0, el }
        f.letras += el.textContent.trim().length
        familias.set(cs.fontFamily, f)
      }
    }
    const lista = (mapa) => [...mapa].sort((a, b) => b[1] - a[1]).map(([k, peso]) => ({ c: cor(k), peso }))
    const F = lista(fundos), T = lista(textos), B = lista(botoes)
    const total = F.reduce((s, f) => s + f.peso, 0) || 1
    // Fundo do palco: um escuro que o site usa bastante; entre os escuros, o que tem cor ganha do preto neutro.
    const escuros = F.filter((f) => luz(f.c) < 0.18 && f.peso >= total * 0.04)
    const escuro = escuros.find((f) => saturacao(f.c) >= 0.3) || escuros[0]
    const marca = B.find((b) => luz(b.c) < 0.3 && saturacao(b.c) > 0.25)
    const fundo = (escuro || marca || F[0] || { c: [17, 17, 17, 1] }).c
    const candidatos = [...T, ...F, ...B].map((x) => x.c)
    let texto = candidatos.slice().sort((a, b) => contraste(b, fundo) - contraste(a, fundo))[0]
    let textoDoSite = true
    if (!texto || contraste(texto, fundo) < 7) { texto = luz(fundo) < 0.35 ? [255, 255, 255, 1] : [17, 17, 17, 1]; textoDoSite = false }
    const serve = (c) => contraste(c, fundo) >= 3 && distancia(c, fundo) >= 45 && distancia(c, texto) >= 30
    const ordem = [...T, ...B, ...F.filter((f) => f.peso >= total * 0.02)].map((x) => x.c).filter(serve)
    const destaque = ordem.find((c) => saturacao(c) >= 0.15) || ordem[0] || texto
    // "doSite" vai no relatório: as cores mais usadas, para quem quiser trocar a escolha com --cor-fundo e afins.
    const mais = (itens, quantas) => itens.slice(0, quantas).map((x) => hex(x.c))
    const maisUsada = [...familias.values()].sort((a, b) => b.letras - a.letras)[0]
    return { cores: { fundo: hex(fundo), texto: hex(texto), destaque: hex(destaque), textoDoSite, doSite: { fundos: mais(F, 6), textos: mais(T, 6), botoes: mais(B, 4) } }, elCorpo: maisUsada ? maisUsada.el : null }
  }

  // ------------------------------------------------------------------------------------------------------
  // Fontes
  // ------------------------------------------------------------------------------------------------------
  const nomesDeFonte = (pilha) => pilha.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
  function tracoDeFonte(el, win) {
    const cs = win.getComputedStyle(el)
    const px = parseFloat(cs.fontSize) || 16
    const espaco = cs.letterSpacing === 'normal' ? 0 : (parseFloat(cs.letterSpacing) || 0) / px
    return { familia: cs.fontFamily, peso: cs.fontWeight, estilo: cs.fontStyle, caixa: cs.textTransform, espaco: Math.round(espaco * 1000) / 1000 }
  }
  // Copia do site as regras @font-face das famílias pedidas (com endereço completo), para o vídeo usar a mesma letra.
  async function regrasDeFonte(doc, familias) {
    const quer = new Set(familias)
    const saida = []
    const absoluto = (css, base) => css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => { try { return `url("${new URL(u, base).href}")` } catch { return m } })
    const testar = (css, base) => {
      const m = css.match(/font-family\s*:\s*([^;}]+)/i)
      if (m && quer.has(m[1].trim().replace(/^['"]|['"]$/g, '').toLowerCase())) saida.push(absoluto(css, base))
    }
    const andar = (regras, base) => {
      for (const r of regras) {
        if (r.constructor.name === 'CSSFontFaceRule') testar(r.cssText, base)
        else if (r.styleSheet) { try { andar(r.styleSheet.cssRules, r.styleSheet.href || base) } catch {} }
        else if (r.cssRules) andar(r.cssRules, base)
      }
    }
    for (const folha of doc.styleSheets) {
      const base = folha.href || doc.baseURI
      let regras = null
      try { regras = folha.cssRules } catch {}
      if (regras) andar(regras, base)
      else if (folha.href) {
        try { const css = await (await fetch(folha.href)).text(); for (const m of css.matchAll(/@font-face\s*{[^}]*}/g)) testar(m[0], folha.href) } catch {}
      }
    }
    return saida
  }

  // ------------------------------------------------------------------------------------------------------
  // Seções do site
  // ------------------------------------------------------------------------------------------------------
  const curto = (t, max = 26) => { t = (t || '').replace(/\s+/g, ' ').trim(); return t.length <= max ? t : '' }
  function rotuloDe(el, doc) {
    if (el.id) {
      const link = [...doc.querySelectorAll(`a[href$="#${CSS.escape(el.id)}"]`)].map((a) => curto(a.textContent)).find(Boolean)
      if (link) return link
    }
    const titulo = curto(el.querySelector('h1, h2, h3')?.textContent)
    if (titulo) return titulo
    return el.id ? el.id.replace(/[-_]+/g, ' ').replace(/^./, (l) => l.toUpperCase()) : ''
  }
  function medirSecao(s, doc, win) {
    const el = doc.querySelector(s.seletor)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { topo: Math.round(r.top + win.scrollY), altura: Math.round(r.height) }
  }
  function lerSecoes(pedidas, doc, win) {
    let lista = (pedidas || []).map((p) => ({ seletor: p.seletor, rotulo: p.rotulo || '' }))
    if (!lista.length) {
      // Sem seções pedidas: pega as seções grandes da página, na ordem.
      const blocos = [...doc.querySelectorAll('main > section, body > section, section[id], main > [id], header[id]')]
        .filter((el, i, todos) => todos.indexOf(el) === i && el.getBoundingClientRect().height >= 200 && el.id)
      const max = 5
      const escolhidos = blocos.length <= max ? blocos : Array.from({ length: max }, (_, i) => blocos[Math.round((i * (blocos.length - 1)) / (max - 1))])
      lista = escolhidos.map((el) => ({ seletor: '#' + CSS.escape(el.id), rotulo: '' }))
    }
    const saida = []
    for (const s of lista) {
      const el = doc.querySelector(s.seletor)
      if (!el) { E.avisos.push(`Seção não encontrada no site: ${s.seletor}`); continue }
      saida.push({ seletor: s.seletor, rotulo: s.rotulo || rotuloDe(el, doc), ...medirSecao(s, doc, win) })
    }
    return saida
  }

  // ------------------------------------------------------------------------------------------------------
  // Espera o site carregar (tempo real, antes de qualquer quadro)
  // ------------------------------------------------------------------------------------------------------
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  // Foto preguiçosa carrega já e toda foto é pintada na hora (sem "decoding=async"): não muda o que aparece, só
  // evita foto chegando atrasada no meio do vídeo.
  function imagensJa(doc) { for (const img of doc.images) { if (img.loading === 'lazy') img.loading = 'eager'; img.decoding = 'sync' } }
  function imagensFaltando() {
    try { return [...E.site.contentDocument.images].filter((img) => (img.currentSrc || img.src) && !img.complete).length } catch { return 0 }
  }
  async function esperarSite(limite = 15000) {
    const quadro = E.site
    const carregado = () => { try { return quadro.contentDocument.readyState === 'complete' && quadro.contentWindow.location.href !== 'about:blank' } catch { return false } }
    for (let i = 0; i < limite / 100 && !carregado(); i++) await pausa(100)
    if (!carregado()) throw new Error('O site não carregou dentro do quadro do vídeo.')
    const doc = quadro.contentDocument
    imagensJa(doc) // foto preguiçosa carrega já: não muda o que aparece, só evita foto chegando atrasada no vídeo
    const falta = [...doc.images].filter((i) => !i.complete).map((i) => new Promise((ok) => { i.addEventListener('load', ok, { once: true }); i.addEventListener('error', ok, { once: true }) }))
    await Promise.race([Promise.all(falta), pausa(8000)])
    try { await Promise.race([doc.fonts.ready, pausa(4000)]) } catch {}
    await pausa(500)
    E.janela = quadro.contentWindow
  }

  // ------------------------------------------------------------------------------------------------------
  // Linha do tempo (o que o modelo usa)
  // ------------------------------------------------------------------------------------------------------
  const v = {
    LARGURA, ALTURA, FPS,
    el: um,
    todos: varios,
    // anima(alvo, começo, duração, { prop: [de, para] | para }, curva, passo entre alvos)
    // props: x, y (px) · xp, yp (% do próprio tamanho) · escala, escalaX, escalaY · giro, giroX, giroY (graus) ·
    //        opacidade · recorte [[cima, direita, baixo, esquerda], [...]] em % · '--variavel' (número)
    anima(alvo, t, dur, props, curva = 'sai3', passo = 0) {
      if (!CURVAS[curva]) throw new Error(`Curva desconhecida: ${curva}`)
      if (Object.keys(props).some((k) => k !== 'opacidade' && !k.startsWith('--')) && varios(alvo).some(temOSite)) throw new Error(MEXE_NO_SITE)
      varios(alvo).forEach((el, i) => E.tweens.push({ el, t: t + i * passo, dur, props, curva, ordem: E.tweens.length }))
      return v
    },
    // cena(alvo, de, até): o elemento só existe na tela dentro desse trecho.
    cena(alvo, de, ate) {
      if (varios(alvo).some(temOSite)) throw new Error(MEXE_NO_SITE)
      for (const el of varios(alvo)) E.cenas.push({ el, de, ate })
      return v
    },
    // rola(começo, duração, alvo, curva): leva a rolagem do site até o alvo. alvo: { secao: i, mais: px } ou número.
    rola(t, dur, alvo, curva = 'vai3') { E.rolagens.push({ t, dur, alvo, curva, corte: false }); return v },
    // corta(instante, alvo, assentar): pula a rolagem (corte seco). "assentar" = ms que o site anda antes do quadro,
    // para o corte não cair numa tela ainda vazia.
    corta(t, alvo, assentar = 300) { E.rolagens.push({ t, dur: 0, alvo, curva: 'linear', corte: true, assentar }); return v },
    // siteEm(t): o site fica congelado até esse instante (a animação de entrada dele começa aí).
    siteEm(t) { E.congelados.push([0, t]); return v },
    // congela(de, até): o site para nesse trecho (relógio e rolagem), por exemplo enquanto uma foto dele se move.
    congela(de, ate) { E.congelados.push([de, ate]); return v },
    // foto(t, alvo): no instante t o gerador fotografa o site como ele está e põe a foto no <img> alvo.
    foto(t, alvo) { const el = um(alvo); el.setAttribute('data-foto', ''); E.fotos.push({ t, el }); return v },
    duracao(s) { E.duracao = s; return v },
    secao: (i) => E.secoes[i],
    get alturaDoSite() { return E.site.clientHeight },
    get larguraDoSite() { return E.site.clientWidth },
    // letras(alvo, texto): cada letra vira um <span class="letra"> (palavras não quebram no meio).
    letras(alvo, texto) {
      const el = um(alvo)
      el.textContent = ''
      el.setAttribute('data-texto', '')
      const saida = []
      String(texto).trim().split(/\s+/).forEach((palavra, i) => {
        if (i) el.append(' ')
        const p = document.createElement('span')
        p.className = 'palavra'
        for (const letra of palavra) { const s = document.createElement('span'); s.className = 'letra'; s.textContent = letra; p.append(s); saida.push(s) }
        el.append(p)
      })
      return saida
    },
    // linhas(alvo): quebra o texto já escrito nas linhas que ele ocupa; cada linha fica numa máscara.
    linhas(alvo) {
      const el = um(alvo)
      const palavras = el.textContent.trim().split(/\s+/)
      el.textContent = ''
      el.setAttribute('data-texto', '')
      const marcas = palavras.map((p, i) => { const s = document.createElement('span'); s.className = 'palavra'; s.textContent = p; if (i) el.append(' '); el.append(s); return s })
      const grupos = []
      let topo = null
      for (const s of marcas) { if (topo === null || Math.abs(s.offsetTop - topo) > 2) { grupos.push([]); topo = s.offsetTop } grupos[grupos.length - 1].push(s.textContent) }
      el.textContent = ''
      return grupos.map((g, i) => { const m = document.createElement('span'); m.className = 'mascara'; const dentro = document.createElement('span'); dentro.textContent = g.join(' '); m.append(dentro); if (i) el.append(' '); el.append(m); return dentro })
    },
    // cabe(alvo, { max, min, linhas, largura }): diminui a letra até o texto caber.
    cabe(alvo, { max = 40, min = 12, linhas = 1, largura = null } = {}) {
      const el = um(alvo)
      for (let px = max; px >= min; px -= 0.5) {
        el.style.fontSize = px + 'px'
        const alturaLinha = parseFloat(getComputedStyle(el).lineHeight) || px * 1.2
        const cabeLargura = largura ? el.scrollWidth <= largura + 0.5 : el.scrollWidth <= el.clientWidth + 0.5
        if (cabeLargura && Math.round(el.scrollHeight / alturaLinha) <= linhas) return px
      }
      return min
    },
    escreve(alvo, texto) { const el = um(alvo); if (!el) return null; if (texto) el.textContent = texto; else el.remove(); return texto ? el : null },
  }

  const MEXE_NO_SITE = 'O quadro do site não pode ser movido, recortado nem escondido (o Chrome trava a foto): mude só a opacidade dele e mova uma foto (v.foto).'
  const temOSite = (el) => el === E.site || el.contains(E.site)
  const parado = (t) => E.congelados.some(([de, ate]) => t >= de && t < ate)

  function alvoDaRolagem(alvo) {
    const max = Math.max(0, E.janela.document.documentElement.scrollHeight - E.site.clientHeight)
    let y = 0
    if (typeof alvo === 'number') y = alvo
    else if (alvo && alvo.fim) y = max
    else if (alvo) { const s = E.secoes[alvo.secao]; y = (s ? s.topo : 0) + (alvo.mais || 0) }
    return prender(y, 0, max)
  }
  function rolagemEm(t) {
    let y = 0, corte = -1
    for (let i = 0; i < E.rolagens.length; i++) {
      const r = E.rolagens[i]
      if (t < r.t) break
      const alvo = alvoDaRolagem(r.alvo)
      if (r.corte) corte = i
      y = r.dur > 0 && t < r.t + r.dur ? y + (alvo - y) * CURVAS[r.curva]((t - r.t) / r.dur) : alvo
    }
    return { y, corte }
  }

  // Põe o vídeo no instante t (segundos). Devolve o índice do último corte (o gerador usa para assentar o site).
  function ir(t, semSite = false) {
    // Um elemento pode ter mais de uma cena: aparece se o instante cai em qualquer uma.
    const emCena = new Map()
    for (const c of E.cenas) emCena.set(c.el, emCena.get(c.el) || (t >= c.de && t < c.ate))
    for (const [el, sim] of emCena) el.style.visibility = sim ? 'visible' : 'hidden'
    const estados = new Map()
    for (const tw of E.tweens) {
      let e = estados.get(tw.el)
      if (!e) estados.set(tw.el, (e = {}))
      for (const k in tw.props) {
        const valor = tw.props[k]
        const par = k === 'recorte' ? Array.isArray(valor[0]) && valor.length === 2 : Array.isArray(valor)
        // Antes de começar vale o valor de partida (ou o padrão): assim voltar no tempo nunca deixa resto do futuro.
        if (t < tw.t) { if (!(k in e)) e[k] = par ? valor[0] : PADRAO[k] ?? 0; continue }
        const de = par ? valor[0] : (k in e ? e[k] : PADRAO[k] ?? 0)
        const para = par ? valor[1] : valor
        const p = tw.dur > 0 ? prender((t - tw.t) / tw.dur) : 1
        e[k] = mistura(de, para, CURVAS[tw.curva](p))
      }
    }
    for (const [el, e] of estados) {
      const tr = []
      if ('x' in e || 'y' in e) tr.push(`translate(${(e.x || 0).toFixed(3)}px, ${(e.y || 0).toFixed(3)}px)`)
      if ('xp' in e || 'yp' in e) tr.push(`translate(${(e.xp || 0).toFixed(3)}%, ${(e.yp || 0).toFixed(3)}%)`)
      if ('giroX' in e) tr.push(`rotateX(${e.giroX.toFixed(3)}deg)`)
      if ('giroY' in e) tr.push(`rotateY(${e.giroY.toFixed(3)}deg)`)
      if ('giro' in e) tr.push(`rotate(${e.giro.toFixed(3)}deg)`)
      if ('escala' in e) tr.push(`scale(${e.escala.toFixed(5)})`)
      if ('escalaX' in e || 'escalaY' in e) tr.push(`scale(${(e.escalaX ?? 1).toFixed(5)}, ${(e.escalaY ?? 1).toFixed(5)})`)
      if (tr.length) el.style.transform = tr.join(' ')
      if ('opacidade' in e) el.style.opacity = e.opacidade.toFixed(4)
      if ('recorte' in e) el.style.clipPath = `inset(${e.recorte.map((n) => n.toFixed(3) + '%').join(' ')})`
      for (const k in e) if (k.startsWith('--')) el.style.setProperty(k, e[k].toFixed(4))
    }
    const r = rolagemEm(t)
    if (!semSite && E.janela && !parado(t)) {
      if (Math.abs(E.janela.scrollY - r.y) > 0.2) E.janela.scrollTo({ top: r.y, left: 0, behavior: 'instant' })
    }
    return r.corte
  }

  // ------------------------------------------------------------------------------------------------------
  // Medidas para a checagem
  // ------------------------------------------------------------------------------------------------------
  const temTextoProprio = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
  function acharUnidades() {
    const lista = []
    const andar = (el) => {
      if (el === E.site || /^(IFRAME|SCRIPT|STYLE)$/.test(el.tagName) || el.hasAttribute('data-enfeite')) return
      if (el.hasAttribute('data-texto')) { if (el.textContent.trim()) lista.push(el); return }
      if (temTextoProprio(el)) { lista.push(el); return }
      for (const f of el.children) andar(f)
    }
    andar(E.palco)
    return lista.map((el) => {
      const folhas = [el, ...el.querySelectorAll('*')].filter(temTextoProprio)
      return { el, folhas: folhas.length ? folhas : [el], fim: !!el.closest('[data-fim]'), texto: el.textContent.replace(/\s+/g, ' ').trim() }
    })
  }
  function cortar(caixa, r) { caixa.x0 = Math.max(caixa.x0, r.left); caixa.y0 = Math.max(caixa.y0, r.top); caixa.x1 = Math.min(caixa.x1, r.right); caixa.y1 = Math.min(caixa.y1, r.bottom) }
  // Quanto do elemento aparece (0 a 1) e com que opacidade, contando máscaras, recortes e antepassados.
  function aparece(el) {
    const r = el.getBoundingClientRect()
    if (r.width < 0.5 || r.height < 0.5) return { area: 0, op: 0, caixa: null }
    const caixa = { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }
    cortar(caixa, { left: 0, top: 0, right: LARGURA, bottom: ALTURA })
    let op = 1
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.display === 'none' || cs.visibility === 'hidden') return { area: 0, op: 0, caixa: null }
      op *= parseFloat(cs.opacity)
      const ra = a.getBoundingClientRect()
      if (a !== el && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) cortar(caixa, ra)
      const m = cs.clipPath.match(/^inset\(([^)]+)\)/)
      if (m) {
        // inset(cima direita baixo esquerda), em % ou px
        const [c, d = c, b = c, e = d] = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/)
        const emPx = (p, base) => (p.endsWith('%') ? (parseFloat(p) / 100) * base : parseFloat(p) || 0)
        cortar(caixa, { left: ra.left + emPx(e, ra.width), top: ra.top + emPx(c, ra.height), right: ra.right - emPx(d, ra.width), bottom: ra.bottom - emPx(b, ra.height) })
      }
    }
    const area = (Math.max(0, caixa.x1 - caixa.x0) * Math.max(0, caixa.y1 - caixa.y0)) / (r.width * r.height)
    return { area, op, caixa }
  }
  function medirUnidade(u) {
    let area = 1, op = 1, px = Infinity
    for (const f of u.folhas) {
      const a = aparece(f)
      area = Math.min(area, a.area); op = Math.min(op, a.op)
      const largura = f.offsetWidth || 0
      const escala = largura ? f.getBoundingClientRect().width / largura : 1
      px = Math.min(px, parseFloat(getComputedStyle(f).fontSize) * escala * devicePixelRatio)
    }
    return { area, op, px }
  }
  // Parte do quadro ocupada pelo site (descontando o que os elementos data-cobre tampam).
  function parteDoSite() {
    return Math.max(parteDe(E.site), ...[...document.querySelectorAll('[data-foto]')].map(parteDe))
  }
  function parteDe(el) {
    const a = aparece(el)
    if (!a.caixa || a.op < 0.5) return 0
    const c = a.caixa
    let area = Math.max(0, c.x1 - c.x0) * Math.max(0, c.y1 - c.y0)
    let tampado = 0
    for (const tampa of document.querySelectorAll('[data-cobre]')) {
      const t = aparece(tampa)
      if (!t.caixa || t.op < 0.5) continue
      const w = Math.min(c.x1, t.caixa.x1) - Math.max(c.x0, t.caixa.x0), h = Math.min(c.y1, t.caixa.y1) - Math.max(c.y0, t.caixa.y0)
      if (w > 0 && h > 0) tampado = Math.max(tampado, w * h)
    }
    return Math.max(0, area - tampado) / (LARGURA * ALTURA)
  }

  // Passa por todos os quadros (sem mexer no site) e devolve as medidas de cada texto.
  function conferir() {
    const quadros = Math.round(E.duracao * FPS)
    const us = E.unidades
    const acc = us.map(() => ({ atual: 0, melhor: 0, inicio: -1, melhorInicio: -1, px: Infinity, primeiro: -1 }))
    let comSite = 0, somaSite = 0, picoSite = 0, quadroCheio = 0
    for (let q = 0; q < quadros; q++) {
      ir(q / FPS, true)
      us.forEach((u, i) => {
        const m = medirUnidade(u), a = acc[i]
        if (m.op >= 0.9 && m.area >= 0.9) {
          if (!a.atual) a.inicio = q
          if (a.primeiro < 0) a.primeiro = q
          a.atual++
          a.px = Math.min(a.px, m.px)
          if (a.atual > a.melhor) { a.melhor = a.atual; a.melhorInicio = a.inicio }
        } else a.atual = 0
      })
      const parte = parteDoSite()
      somaSite += parte
      if (parte > picoSite) { picoSite = parte; quadroCheio = q }
      if (parte >= 0.5) comSite++
    }
    const textos = us.map((u, i) => {
      const a = acc[i]
      const amostra = a.melhor ? a.melhorInicio + Math.floor(a.melhor / 2) : -1
      let caixa = null, corTexto = null, opacidade = 1
      if (amostra >= 0) {
        ir(amostra / FPS, true)
        const r = u.el.getBoundingClientRect()
        caixa = { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(LARGURA, r.right) - Math.max(0, r.left), h: Math.min(ALTURA, r.bottom) - Math.max(0, r.top) }
        const folha = u.folhas[u.folhas.length - 1]
        corTexto = cor(getComputedStyle(folha).color)
        opacidade = medirUnidade(u).op
      }
      return {
        i, texto: u.texto.slice(0, 80), fim: u.fim,
        visivelS: Math.round((a.melhor / FPS) * 100) / 100,
        deS: a.melhorInicio >= 0 ? Math.round((a.melhorInicio / FPS) * 100) / 100 : null,
        primeiroS: a.primeiro >= 0 ? Math.round((a.primeiro / FPS) * 100) / 100 : null,
        px: a.melhor ? Math.round(a.px * 10) / 10 : null,
        amostra, caixa, cor: corTexto, opacidade,
      }
    })
    ir(0, true)
    return {
      duracao: E.duracao, quadros, textos,
      site: { maioriaS: Math.round((comSite / FPS) * 100) / 100, media: Math.round((somaSite / quadros) * 1000) / 1000, pico: Math.round(picoSite * 1000) / 1000, quadroCheio },
    }
  }

  // ------------------------------------------------------------------------------------------------------
  // Preparação (chamada pelo gerador)
  // ------------------------------------------------------------------------------------------------------
  function estiloBase() {
    const s = document.createElement('style')
    s.id = 'video-base'
    s.textContent = `
      *{margin:0;padding:0;box-sizing:border-box}
      html,body{width:${LARGURA}px;height:${ALTURA}px;overflow:hidden;background:#000}
      #palco{position:absolute;left:0;top:0;width:${LARGURA}px;height:${ALTURA}px;overflow:hidden;background:var(--fundo,#111);color:var(--texto,#fff);
        font-family:var(--f-corpo,system-ui,sans-serif);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
      #site{display:block;border:0;background:#fff}
      .titulo{font-family:var(--f-titulo,serif);font-weight:var(--titulo-peso,400);font-style:var(--titulo-estilo,normal);text-transform:var(--titulo-caixa,none);letter-spacing:var(--titulo-espaco,0)}
      .mascara{display:block;overflow:hidden;padding:.12em .04em .2em;margin:-.12em -.04em -.2em}
      .mascara>span{display:block}
      .palavra{display:inline-block;white-space:nowrap}
      .letra{display:inline-block}
      .sem-texto,.sem-texto *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}
      #palco.fotografando *:not(.com-site){opacity:0!important}
      #palco.fotografando .com-site{opacity:1!important}
      [data-foto]{display:block}`
    document.head.prepend(s)
  }

  async function preparar(dados) {
    if (!E.modelo) throw new Error('O modelo não chamou Video.modelo({ montar }).')
    E.dados = dados
    E.palco = document.getElementById('palco')
    if (!E.palco || !E.site) throw new Error('O modelo precisa de <div id="palco"> e <iframe id="site">.')
    await esperarSite()
    const doc = E.site.contentDocument, win = E.janela
    win.scrollTo(0, 0)
    const lido = lerCores(doc, win)
    E.cores = { ...lido.cores, ...Object.fromEntries(Object.entries(dados.cores || {}).filter(([, c]) => c)) }
    const elTitulo = doc.querySelector('h1') || doc.querySelector('h2') || doc.body
    const elCorpo = lido.elCorpo || doc.body
    E.fontes = { titulo: tracoDeFonte(elTitulo, win), corpo: tracoDeFonte(elCorpo, win) }
    const regras = await regrasDeFonte(doc, [...nomesDeFonte(E.fontes.titulo.familia), ...nomesDeFonte(E.fontes.corpo.familia)])
    const folha = document.createElement('style')
    folha.id = 'video-fontes'
    folha.textContent = regras.join('\n')
    document.head.append(folha)
    const raiz = document.documentElement.style
    raiz.setProperty('--fundo', E.cores.fundo)
    raiz.setProperty('--texto', E.cores.texto)
    raiz.setProperty('--destaque', E.cores.destaque)
    raiz.setProperty('--f-titulo', E.fontes.titulo.familia)
    raiz.setProperty('--f-corpo', E.fontes.corpo.familia)
    raiz.setProperty('--titulo-peso', E.fontes.titulo.peso)
    raiz.setProperty('--titulo-estilo', E.fontes.titulo.estilo)
    raiz.setProperty('--titulo-caixa', E.fontes.titulo.caixa)
    raiz.setProperty('--titulo-espaco', E.fontes.titulo.espaco + 'em')
    // Carrega as letras antes de montar: o modelo mede os textos para caber.
    const amostra = [dados.nome, dados.sub, dados.chamada, dados.contato, dados.botao, dados.aviso, '0123456789'].filter(Boolean).join(' ')
    const pedidos = [
      `${E.fontes.titulo.estilo} ${E.fontes.titulo.peso} 40px ${E.fontes.titulo.familia}`,
      `400 16px ${E.fontes.corpo.familia}`, `500 16px ${E.fontes.corpo.familia}`, `600 16px ${E.fontes.corpo.familia}`,
    ]
    await Promise.race([Promise.all(pedidos.map((f) => document.fonts.load(f, amostra + amostra.toUpperCase()).catch(() => null))), pausa(5000)])
    E.secoes = lerSecoes(dados.secoes, doc, win)
    if (!E.secoes.length) throw new Error('Nenhuma seção do site para mostrar: informe --secao "#id=Rótulo".')
    E.modelo.montar(v, { ...dados, secoes: E.secoes.map((s) => ({ ...s })), cores: { ...E.cores }, fontes: E.fontes })
    try { await Promise.race([document.fonts.ready, pausa(5000)]) } catch {}
    if (!(E.duracao > 0)) throw new Error('O modelo não informou a duração (v.duracao).')
    for (let a = E.site; a && a !== E.palco; a = a.parentElement) a.classList.add('com-site')
    E.fotos.sort((a, b) => a.t - b.t)
    E.tweens.sort((a, b) => a.t - b.t || a.ordem - b.ordem)
    E.rolagens.sort((a, b) => a.t - b.t)
    E.unidades = acharUnidades()
    ir(0, true)
    return {
      modelo: E.modelo.nome || '', duracao: E.duracao, quadros: Math.round(E.duracao * FPS),
      congelados: E.congelados, fotos: E.fotos.map((f) => f.t), assentar: E.rolagens.map((r) => (r.corte ? r.assentar : 0)),
      cores: E.cores, fontes: E.fontes, secoes: E.secoes, avisos: E.avisos,
      site: { largura: E.site.clientWidth, altura: E.site.clientHeight, alturaTotal: doc.documentElement.scrollHeight },
    }
  }

  // Depois de recarregar o site para a gravação: pega a janela nova e mede as seções de novo. Sem promessa
  // (com o relógio do Chrome parado, promessa não volta).
  // Pulso: um ponto de 1 px quase transparente dentro do site, mexido a cada quadro. Site que não tem animação
  // nenhuma não entrega quadro novo ao Chrome com o relógio parado, e a foto trava. O pulso tem de já estar
  // batendo quando o relógio para (ligado depois, não adianta). Não muda o que se vê.
  let batidas = 0
  function pulsar(doc) {
    if (!doc || !doc.body || doc.getElementById('pulso-do-video')) return
    const p = doc.createElement('div')
    p.id = 'pulso-do-video'
    p.setAttribute('aria-hidden', 'true')
    p.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;pointer-events:none;z-index:2147483647'
    doc.body.append(p)
    const win = doc.defaultView
    batidas = 0
    ;(function passo() { p.style.transform = `translateX(${batidas++ % 2}px)`; win.requestAnimationFrame(passo) })()
  }

  function religar() {
    try {
      E.janela = E.site.contentWindow
      const doc = E.site.contentDocument
      imagensJa(doc)
      let achou = 0
      E.secoes.forEach((s) => { const m = medirSecao(s, doc, E.janela); if (m && m.altura > 0) { s.topo = m.topo; s.altura = m.altura; achou++ } })
      return { secoes: achou, de: E.secoes.length, alturaTotal: doc.documentElement.scrollHeight, estado: doc.readyState }
    } catch (e) { return { secoes: 0, de: E.secoes.length, alturaTotal: 0, estado: 'erro: ' + e.message } }
  }

  // Foto do site: esconde o resto por um instante, devolve onde o site está e depois recebe a foto.
  function fotografar(sim) {
    E.palco.classList.toggle('fotografando', !!sim)
    const r = E.site.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }
  function porFoto(i, base64) { const f = E.fotos[i]; if (f) f.el.src = 'data:image/jpeg;base64,' + base64; return true }

  function esconderTexto(i, sim) { const u = E.unidades[i]; if (u) u.el.classList.toggle('sem-texto', !!sim); return true }

  window.Video = {
    modelo(m) { E.modelo = m },
    preparar, conferir, ir, religar, esconderTexto, fotografar, porFoto,
    // O pulso liga no instante em que o site termina de recarregar, ainda em tempo real.
    recarregarSite() {
      batidas = 0
      E.site.addEventListener('load', () => { try { pulsar(E.site.contentDocument) } catch {} }, { once: true })
      E.site.contentWindow.location.reload()
      return true
    },
    pulso: () => batidas,
    imagensFaltando,
    estado: E,
  }

  estiloBase()
  document.addEventListener('DOMContentLoaded', () => {
    E.site = document.getElementById('site')
    const caminho = new URLSearchParams(location.search).get('site') || '/'
    if (E.site) E.site.src = caminho.startsWith('/') && !caminho.startsWith('//') ? caminho : '/'
  })
})()
