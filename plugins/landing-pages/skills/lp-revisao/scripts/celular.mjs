// Portão do celular (7 itens) de uma landing page, conferido no Chrome/Edge pelo protocolo DevTools (sem dependência).
// Uso: node celular.mjs <url|arquivo.html> [pasta-saida] [--larguras 360,390] [--deitado] [--json]
//   --larguras  telas em pé a conferir (padrão 360,390: o piso do portão e a largura em que a seção nasce)
//   --deitado   confere também cada largura deitada
//   --json      imprime o JSON em vez do resumo; com pasta-saida grava celular.json e resumo.txt
// Itens: 1 nenhuma rolagem para o lado e nada cortado; 2 texto de leitura e campos >= 16 px; 3 área de toque >= 44 px,
// com espaço entre botões lado a lado; 4 rolar por toque não trava nem pula e, com movimento reduzido, tudo continua
// legível; 5 botão de contato ao alcance do polegar (terço de baixo/meio da tela, destino conferido) e menu que abre e
// fecha por toque; 6 vídeo de abertura toca mudo e em linha, ou tem imagem de reserva (poster); 7 os mesmos no motor
// do Safari (WebKit): só se o Playwright já estiver instalado por fora (node_modules da pasta atual ou PLAYWRIGHT_MODULE)
// com o WebKit baixado. Nunca instala nem baixa nada; sem ele o relatório diz "Safari não conferido".
// Código de saída: 0 tudo passou · 1 algum item falhou · 2 não deu para conferir (sem Chrome/Edge ou página não abriu).
// BROWSER_EXECUTABLE aponta outro Chrome/Edge. Não acessa nada além da página pedida (e do que ela mesma carrega).
// Critérios que não são óbvios:
//   Item 2, o que conta como texto de leitura (texto direto de p, li, dd, blockquote, div, span, td):
//     - 40 caracteres ou mais; ou
//     - frase curta: termina em ponto (. ! ? …) com 3 palavras ou mais; ou, só em p/li/dd/blockquote, 4 palavras ou mais.
//     Rótulo pequeno legítimo fica de fora: dentro de small, figcaption, caption, footer, label, sup, sub, botão ou
//     link, e texto curto em caixa alta (sobretítulo, selo). Página sem nenhum texto de leitura reprova (nada conferido).
//   Item 5, o que conta como ação de um elemento com cara de contato (link, botão, role=button, input de enviar):
//     - link: o href é conferido (vazio, "#" e "javascript:" são "sem destino");
//     - botão: enviar de um <form>, onclick (atributo ou propriedade, que é como o React marca), popovertarget/commandfor,
//       ou ouvinte de clique registrado no próprio elemento. Ouvinte delegado em elemento pai não conta.
//     Elemento visível sem nada disso reprova. Ação por formulário/script passa, mas o resumo diz que o destino não foi
//     conferido; nunca "destino certo" sem link conferido.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const LIMITES = { texto: 16, campo: 16, toque: 44, espacoLado: 8 }
export const NOMES = {
  1: 'Sem rolagem para o lado nem corte',
  2: 'Texto de leitura e campos >= 16 px',
  3: 'Área de toque >= 44 px, com espaço',
  4: 'Rolagem por toque e movimento reduzido',
  5: 'Contato ao alcance do polegar e menu',
  6: 'Vídeo de abertura mudo e em linha, ou imagem',
  7: 'Motor do Safari (WebKit)',
}
const ALTURAS = { 360: 780, 375: 667, 390: 844, 393: 852, 412: 915, 414: 896, 430: 932, 768: 1024 }

const passou = (motivo, detalhes) => ({ estado: 'passou', motivo, ...(detalhes ? { detalhes } : {}) })
const falhou = (motivo, detalhes) => ({ estado: 'falhou', motivo, ...(detalhes ? { detalhes } : {}) })
const naoConferido = (motivo) => ({ estado: 'nao-conferido', motivo })
const rotulo = (m) => `${m.largura}x${m.altura}`
const amostra = (xs, n = 3) => xs.slice(0, n).map((x) => x.nome || x).join(', ') + (xs.length > n ? ` e mais ${xs.length - n}` : '')

// ---------------------------------------------------------------------------------------------------------
// Regras puras: cada uma recebe as medidas de todas as telas e devolve { estado, motivo, detalhes }
// ---------------------------------------------------------------------------------------------------------
export function avaliarRolagem(ms) {
  const prob = []
  for (const m of ms) {
    if (m.larguraDoc > m.largura + 1) prob.push(`${rotulo(m)}: a página tem ${m.larguraDoc} px e rola para o lado`)
    if (m.vazando?.length) prob.push(`${rotulo(m)}: ${m.vazando.length} elemento(s) cortado(s) na borda (${amostra(m.vazando)})`)
  }
  return prob.length ? falhou(prob.join('; ')) : passou(`nada rola para o lado nem fica cortado em ${ms.map(rotulo).join(', ')}`)
}

export function avaliarTexto(ms) {
  const prob = []
  let temCampo = false
  for (const m of ms) {
    const leitura = m.leitura || []
    const miudos = leitura.filter((t) => t.px < LIMITES.texto - 0.01)
    const campos = (m.campos || []).filter((c) => c.px < LIMITES.campo - 0.01)
    if ((m.campos || []).length) temCampo = true
    // Lista vazia não é "16 px ou mais": sem nada medido, o item não pode passar.
    if (!leitura.length) prob.push(`${rotulo(m)}: nenhum texto de leitura encontrado para medir (sem nada conferido; o texto precisa estar em parágrafo, lista ou citação)`)
    if (miudos.length) prob.push(`${rotulo(m)}: ${miudos.length} texto(s) de leitura abaixo de 16 px (${amostra(miudos.map((t) => ({ nome: `${t.nome} ${t.px}px${t.curto ? ' (frase curta)' : ''}` })))})` +
      (miudos.some((t) => t.curto) ? '; frase curta também é leitura: rótulo pequeno de verdade vai em small, legenda (figcaption), rodapé ou caixa alta curta' : ''))
    if (campos.length) prob.push(`${rotulo(m)}: ${campos.length} campo(s) abaixo de 16 px, o iPhone dá zoom sozinho (${amostra(campos.map((c) => ({ nome: `${c.nome} ${c.px}px` })))})`)
  }
  if (prob.length) return falhou(prob.join('; '))
  return passou(temCampo ? 'texto de leitura e campos com 16 px ou mais' : 'texto de leitura com 16 px ou mais (sem campo de formulário para medir)')
}

// Distância entre dois retângulos { x, y, w, h }: dx/dy negativos = as faixas se cruzam naquele eixo.
export function folga(a, b) {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
  return { dx, dy }
}
const contem = (a, b) => a.x <= b.x + 0.5 && a.y <= b.y + 0.5 && a.x + a.w >= b.x + b.w - 0.5 && a.y + a.h >= b.y + b.h - 0.5

export function avaliarToque(ms) {
  const prob = []
  for (const m of ms) {
    const alvos = (m.alvos || []).filter((a) => !a.emLinha)
    const pequenos = alvos.filter((a) => Math.min(a.w, a.h) < LIMITES.toque - 0.5)
    const colados = []
    for (let i = 0; i < alvos.length; i++) {
      for (let j = i + 1; j < alvos.length; j++) {
        const a = alvos[i], b = alvos[j]
        if (!!a.fixo !== !!b.fixo || contem(a, b) || contem(b, a)) continue
        const { dx, dy } = folga(a, b)
        if (dx < 0 && dy < 0) colados.push({ nome: `${a.nome} sobre ${b.nome}` })
        else if (dy < 0 && dx < LIMITES.espacoLado) colados.push({ nome: `${a.nome} e ${b.nome} (${Math.max(0, Math.round(dx))} px)` })
      }
    }
    if (pequenos.length) prob.push(`${rotulo(m)}: ${pequenos.length} alvo(s) de toque menor(es) que 44 px (${amostra(pequenos.map((a) => ({ nome: `${a.nome} ${Math.round(a.w)}x${Math.round(a.h)}` })))})`)
    if (colados.length) prob.push(`${rotulo(m)}: ${colados.length} par(es) de botões sem espaço de 8 px entre si (${amostra(colados)})`)
  }
  return prob.length ? falhou(prob.join('; ')) : passou('alvos de toque com 44 px ou mais e espaço entre os botões')
}

// toque: { posicoes: [scrollY depois de cada gesto], distancia, maxRolagem }; reduzido: { invisiveis: [nome], total }
export function avaliarPresas(ms) {
  const prob = []
  let semToque = false
  for (const m of ms) {
    if (!m.toque) semToque = true
    else {
      const { posicoes, distancia, maxRolagem } = m.toque
      let anterior = 0
      const travas = [], pulos = []
      for (const y of posicoes) {
        const esperado = Math.min(distancia, maxRolagem - anterior)
        const d = y - anterior
        if (esperado > 20 && d < esperado * 0.25) travas.push(Math.round(anterior))
        if (d > distancia * 2.5) pulos.push(`${Math.round(anterior)}→${Math.round(y)}`)
        anterior = y
      }
      if (!travas.length && anterior < maxRolagem - 20) travas.push(Math.round(anterior))
      if (travas.length) prob.push(`${rotulo(m)}: a rolagem por toque trava em ${[...new Set(travas)].slice(0, 3).join(', ')} px`)
      if (pulos.length) prob.push(`${rotulo(m)}: a rolagem por toque pula (${pulos.slice(0, 3).join(', ')} px)`)
    }
    if (m.reduzido?.total) prob.push(`${rotulo(m)}: com movimento reduzido, ${m.reduzido.total} texto(s) ficam invisíveis (${amostra(m.reduzido.invisiveis)})`)
  }
  if (prob.length) return falhou(prob.join('; '))
  return passou(semToque ? 'tudo legível com movimento reduzido (rolagem por toque não medida neste motor)'
    : 'rolar por toque não trava nem pula, e tudo continua legível com movimento reduzido')
}

// Destino do botão de contato: devolve o problema ou null.
export function problemaDoDestino(href, alvoExiste) {
  const h = String(href ?? '').trim()
  if (!h || h === '#' || /^javascript:/i.test(h)) return 'sem destino'
  if (/wa\.me\//i.test(h)) return /wa\.me\/\+?\d{10,15}(\b|\?|$)/i.test(h) ? null : 'link do WhatsApp sem número'
  if (/whatsapp/i.test(h) && /phone=/i.test(h)) return /phone=\+?\d{10,15}/i.test(h) ? null : 'link do WhatsApp sem número'
  if (/^tel:/i.test(h)) return h.replace(/\D/g, '').length >= 8 ? null : 'telefone incompleto'
  if (/^mailto:/i.test(h)) return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/i.test(h) ? null : 'e-mail inválido'
  if (h.startsWith('#')) return alvoExiste === false ? `âncora ${h} não existe na página` : null
  return null
}

// contato: { total, destinos: [{ nome, href, alvoExiste }], acoes: [{ nome, tipo: 'formulario' | 'script' }],
//            semAcao: [{ nome, texto }], posicoes: [{ fracao, alcancavel }] }
//   destinos = links (href conferido); acoes = botões com ação, sem destino para conferir; semAcao = elementos visíveis
//   com cara de contato em que tocar não faz nada. O alcance do polegar só conta quem tem link ou ação.
// menu: { achou, abriu, fechou, nome }
export function avaliarContatoEMenu(ms) {
  const prob = [], notas = []
  let todosComDestino = true, algumaAcao = false
  for (const m of ms) {
    const c = m.contato || { total: 0 }
    const destinos = c.destinos || [], acoes = c.acoes || [], semAcao = c.semAcao || [], posicoes = c.posicoes || []
    if (!destinos.length) todosComDestino = false
    if (acoes.length) algumaAcao = true
    if (!c.total) prob.push(`${rotulo(m)}: nenhum botão de contato (WhatsApp, telefone, e-mail ou orçamento)`)
    else {
      const fora = posicoes.filter((p) => !p.alcancavel)
      if (fora.length) prob.push(`${rotulo(m)}: o botão de contato fica fora do alcance do polegar em ${fora.map((p) => `${Math.round(p.fracao * 100)}%`).join(', ')} da página`)
      if (semAcao.length) prob.push(`${rotulo(m)}: ${semAcao.length} botão(ões) de contato sem ação, tocar não leva a lugar nenhum (${amostra(semAcao.map((s) => ({ nome: `${s.nome}${s.texto ? ` "${s.texto}"` : ''}` })))}); precisa ser link com destino, enviar um formulário ou ter a ação no próprio botão`)
      const ruins = destinos.map((d) => ({ ...d, problema: problemaDoDestino(d.href, d.alvoExiste) })).filter((d) => d.problema)
      if (ruins.length) prob.push(`${rotulo(m)}: destino do contato com problema (${amostra(ruins.map((d) => ({ nome: `${d.href || d.nome}: ${d.problema}` })))})`)
      // Lista vazia não é "destino certo" nem "ao alcance": sem nada medido, o item não pode passar.
      if (!destinos.length && !acoes.length && !semAcao.length) prob.push(`${rotulo(m)}: contato sem nada conferido (nenhum link com destino nem botão com ação)`)
      if (!posicoes.length) prob.push(`${rotulo(m)}: alcance do polegar sem nada conferido (nenhuma posição da página medida)`)
    }
    const mn = m.menu || {}
    if (!mn.achou) notas.push('sem botão de menu (nada a abrir)')
    else if (!mn.abriu) prob.push(`${rotulo(m)}: o menu (${mn.nome}) não abriu ao tocar`)
    else if (!mn.fechou) prob.push(`${rotulo(m)}: o menu (${mn.nome}) abriu e não fechou`)
  }
  if (prob.length) return falhou(prob.join('; '))
  const contato = todosComDestino
    ? 'contato sempre ao alcance do polegar e com destino certo' + (algumaAcao ? ' (há também botão com ação por formulário ou script, de destino não conferido)' : '')
    : 'contato sempre ao alcance do polegar, com ação por formulário ou script (destino não conferido: não há link para conferir)'
  return passou([contato, ms.some((m) => m.menu?.achou) ? 'menu abre e fecha' : [...new Set(notas)][0]].join('; '))
}

// videos: [{ nome, muted, playsInline, autoplay, poster, tocando }] — só os da abertura (primeira tela)
export function avaliarVideo(ms) {
  const prob = []
  let algum = false
  for (const m of ms) {
    for (const v of m.videos || []) {
      algum = true
      if (v.poster) continue
      if (v.tocando && v.muted && v.playsInline) continue
      const falta = []
      if (!v.tocando) falta.push('não tocou')
      if (!v.muted) falta.push('não está mudo')
      if (!v.playsInline) falta.push('sem playsinline (o iPhone abre em tela cheia)')
      prob.push(`${rotulo(m)}: ${v.nome} ${falta.join(', ')} e não tem imagem de reserva (poster)`)
    }
  }
  if (prob.length) return falhou(prob.join('; '))
  return passou(algum ? 'vídeo de abertura toca mudo e em linha, ou cai para a imagem' : 'sem vídeo na abertura')
}

export function avaliarTudo(ms) {
  return [avaliarRolagem, avaliarTexto, avaliarToque, avaliarPresas, avaliarContatoEMenu, avaliarVideo]
    .map((f, i) => ({ n: i + 1, nome: NOMES[i + 1], ...f(ms) }))
}

// webkit: null = Playwright ausente; { erro } = não rodou; { itens } = itens 1–6 medidos no WebKit
export function avaliarSafari(webkit) {
  if (!webkit) return naoConferido('Safari não conferido: o Playwright não está instalado (o kit não instala nem baixa nada)')
  if (webkit.erro) return naoConferido(`Safari não conferido: ${webkit.erro}`)
  const ruins = webkit.itens.filter((i) => i.estado === 'falhou')
  if (ruins.length) return falhou(`no WebKit: ${ruins.map((i) => `${i.n} (${i.motivo})`).join('; ')}`)
  return passou('Safari conferido: os mesmos seis itens passam no WebKit')
}

export function montarRelatorio(url, telas, itens) {
  const safari = itens.find((i) => i.n === 7)?.estado === 'nao-conferido' ? 'Safari não conferido' : 'Safari conferido'
  const codigo = itens.some((i) => i.estado === 'falhou') ? 1 : 0
  return { url, telas, itens, safari, codigo }
}

export function relatorioSemConferir(url, motivo) {
  const itens = Object.keys(NOMES).map((n) => ({ n: Number(n), nome: NOMES[n], ...naoConferido(motivo) }))
  return { url, telas: [], itens, safari: 'Safari não conferido', codigo: 2, erro: motivo }
}

const PALAVRA = { passou: 'passou', falhou: 'falhou', 'nao-conferido': 'não conferido' }
export function resumoTexto(rel) {
  const linhas = [`Portão do celular: ${rel.url}`]
  for (const i of rel.itens) linhas.push(`${i.n}. ${i.nome}: ${PALAVRA[i.estado]} — ${i.motivo}`)
  linhas.push(rel.safari + (rel.safari === 'Safari não conferido' ? ' (aparelho de verdade continua sendo a conferência final do dono)' : ''))
  const ruins = rel.itens.filter((i) => i.estado === 'falhou').length
  linhas.push(rel.codigo === 2 ? 'Resultado: não deu para conferir' : ruins ? `Resultado: reprovado em ${ruins} item(ns); não mostrar como pronto` : 'Resultado: aprovado no celular')
  return linhas.join('\n')
}

export function lerArgs(argv) {
  const op = { larguras: [360, 390], deitado: false, json: false, posicionais: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--larguras') op.larguras = String(argv[++i] || '').split(',').map(Number).filter((n) => n > 0)
    else if (a === '--deitado') op.deitado = true
    else if (a === '--json') op.json = true
    else op.posicionais.push(a)
  }
  ;[op.url, op.saida] = op.posicionais
  delete op.posicionais
  return op
}

export function montarTelas(larguras, deitado = false) {
  const telas = larguras.map((l) => ({ largura: l, altura: ALTURAS[l] || Math.round(l * 2.16) }))
  return deitado ? [...telas, ...telas.map((t) => ({ largura: t.altura, altura: t.largura }))] : telas
}

export function normalizarUrl(alvo) {
  if (/^(https?|file):/i.test(alvo)) return new URL(alvo).href
  if (fs.existsSync(alvo)) return pathToFileURL(path.resolve(alvo)).href
  throw new Error(`Não achei a página: ${alvo} (informe uma URL http, https, file ou um arquivo .html)`)
}

// ---------------------------------------------------------------------------------------------------------
// Navegador (protocolo DevTools)
// ---------------------------------------------------------------------------------------------------------
export function acharNavegador() {
  if (process.env.BROWSER_EXECUTABLE) return fs.existsSync(process.env.BROWSER_EXECUTABLE) ? process.env.BROWSER_EXECUTABLE : null
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((p) => fs.existsSync(p)) || null
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

async function abrirNavegador(executavel) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'celular-'))
  // Sem liberar autoplay: vale a regra de verdade do celular (só vídeo mudo toca sozinho).
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank']
  if (process.platform === 'linux' && process.env.CI) args.unshift('--no-sandbox')
  const proc = spawn(executavel, args, { stdio: 'ignore' })
  let porta
  for (let i = 0; i < 80 && !porta; i++) {
    await espera(150)
    try { porta = Number(fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]) } catch {}
  }
  let alvo
  for (let i = 0; i < 40 && porta && !alvo; i++) {
    try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()).find((t) => t.type === 'page') } catch {}
    if (!alvo) await espera(150)
  }
  const fechar = async () => {
    try { proc.kill() } catch {}
    for (let i = 0; i < 10; i++) { try { fs.rmSync(perfil, { recursive: true, force: true }); break } catch { await espera(300) } }
  }
  if (!alvo) { await fechar(); throw new Error('Não consegui abrir o Chrome/Edge sem janela.') }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
  let id = 0
  const pendentes = new Map(), ouvintes = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id) }
    else if (msg.method) for (const f of ouvintes.get(msg.method) || []) f(msg.params)
  })
  const cmd = (method, params = {}, limite = 60_000) => new Promise((resolve, reject) => {
    const n = ++id
    const t = setTimeout(() => { pendentes.delete(n); reject(new Error(`${method} demorou demais`)) }, limite)
    pendentes.set(n, (msg) => { clearTimeout(t); msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result) })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  const ouvir = (metodo, f) => { if (!ouvintes.has(metodo)) ouvintes.set(metodo, []); ouvintes.get(metodo).push(f) }
  return { cmd, ouvir, fechar: async () => { try { ws.close() } catch {} await fechar() } }
}

// Roda antes dos scripts da página: anota quem recebeu ouvinte de clique por addEventListener (a página não tem como
// perguntar isso depois). O item 5 usa para saber se um botão de contato faz alguma coisa. Não muda o comportamento.
export const MARCAR_CLIQUES = `(() => {
  if (window.__celularCliques) return
  const marcados = window.__celularCliques = new WeakSet()
  const original = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (tipo, ...resto) {
    try { if (/^(click|pointerup|mouseup|touchend)$/.test(tipo) && this instanceof Element) marcados.add(this) } catch {}
    return original.call(this, tipo, ...resto)
  }
})()`

export async function motorChrome(exe) {
  const nav = await abrirNavegador(exe)
  const { cmd, ouvir } = nav
  await cmd('Page.enable')
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: MARCAR_CLIQUES })
  let carregou = false
  ouvir('Page.loadEventFired', () => { carregou = true })
  const { userAgent } = await cmd('Browser.getVersion')
  const versao = (userAgent.match(/Chrome\/([\d.]+)/) || [])[1] || '120.0.0.0'
  const rodar = async (fn, arg) => {
    const r = await cmd('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(arg ?? null)})`, awaitPromise: true, returnByValue: true }, 120_000)
    if (r.exceptionDetails) throw new Error('Erro na página: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }
  return {
    nome: 'Chrome',
    rodar,
    async abrir(url, { largura, altura, reduzido }) {
      await cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 2, mobile: true })
      await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      // Agente de celular que continua dizendo "HeadlessChrome": serve a versão móvel sem esconder que é robô.
      await cmd('Emulation.setUserAgentOverride', { userAgent: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/${versao} Mobile Safari/537.36` })
      await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduzido ? 'reduce' : 'no-preference' }] })
      await cmd('Page.navigate', { url: 'about:blank' })
      carregou = false
      const r = await cmd('Page.navigate', { url })
      if (r.errorText) throw new Error(`Não abriu a página: ${r.errorText}`)
      for (let i = 0; i < 80 && !carregou; i++) await espera(250)
      await espera(1500)
      await rodar(() => document.fonts.ready.then(() => true))
    },
    // Toque de verdade (touchstart/touchmove/touchend): o gesto sintético do Chrome sem janela não rola por toque.
    async tocar(x, y) {
      const p = [{ x: Math.round(x), y: Math.round(y) }]
      await cmd('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: p })
      await espera(60)
      await cmd('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    },
    async rolarToque(distancia, x, y) {
      const passos = Math.max(1, Math.round(distancia / 20))
      await cmd('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(x), y: Math.round(y) }] })
      for (let i = 1; i <= passos; i++) {
        await cmd('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(x), y: Math.round(y - (distancia * i) / passos) }] })
        await espera(16)
      }
      await espera(150) // dedo parado antes de soltar: sem arremesso, a medida é só do gesto
      await cmd('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    },
    cmd,
    fechar: nav.fechar,
  }
}

// Playwright só se já estiver instalado por fora; nunca instala nem baixa.
export async function carregarPlaywright() {
  const bases = [process.env.PLAYWRIGHT_MODULE && path.join(process.env.PLAYWRIGHT_MODULE, 'package.json'), path.join(process.cwd(), 'package.json')].filter(Boolean)
  for (const base of bases) {
    const req = createRequire(base)
    for (const nome of [process.env.PLAYWRIGHT_MODULE, 'playwright', 'playwright-core'].filter(Boolean)) {
      try { const mod = await import(pathToFileURL(req.resolve(nome)).href); const pw = mod.webkit ? mod : mod.default; if (pw?.webkit) return pw } catch {}
    }
  }
  return null
}

async function motorWebkit(pw) {
  const navegador = await pw.webkit.launch()
  let ctx, pagina
  return {
    nome: 'WebKit',
    rodar: (fn, arg) => pagina.evaluate(`(${fn})(${JSON.stringify(arg ?? null)})`),
    async abrir(url, { largura, altura, reduzido }) {
      if (ctx) await ctx.close()
      ctx = await navegador.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
        userAgent: pw.devices?.['iPhone 13']?.userAgent, reducedMotion: reduzido ? 'reduce' : 'no-preference' })
      await ctx.addInitScript(MARCAR_CLIQUES)
      pagina = await ctx.newPage()
      await pagina.goto(url, { waitUntil: 'load', timeout: 30_000 })
      await pagina.waitForTimeout(1500)
    },
    tocar: (x, y) => pagina.touchscreen.tap(x, y),
    rolarToque: null, // o WebKit do Playwright não tem gesto de rolagem por toque; o item 4 mede só o movimento reduzido
    fechar: () => navegador.close(),
  }
}

// ---------------------------------------------------------------------------------------------------------
// Funções que rodam dentro da página (autossuficientes: são enviadas como texto)
// ---------------------------------------------------------------------------------------------------------
function percorrer() {
  return (async () => {
    const alt = () => (document.scrollingElement || document.documentElement).scrollHeight
    for (let y = 0; y < alt(); y += innerHeight * 0.8) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)) }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 300))
    return true
  })()
}

function medirVideos() {
  const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '')
  return [...document.querySelectorAll('video')].filter((v) => {
    const r = v.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && getComputedStyle(v).display !== 'none'
  }).map((v) => ({ nome: nome(v), muted: v.muted || v.hasAttribute('muted'), playsInline: !!v.playsInline || v.hasAttribute('playsinline') || v.hasAttribute('webkit-playsinline'),
    autoplay: v.autoplay, poster: !!v.getAttribute('poster'), tocando: !v.paused && v.currentTime > 0 }))
}

export function medirLayout() {
  window.scrollTo(0, 0)
  const W = document.documentElement.clientWidth
  const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '')
  const memo = new Map()
  const opacidade = (el) => {
    if (!el || el.nodeType !== 1) return 1
    if (memo.has(el)) return memo.get(el)
    const o = parseFloat(getComputedStyle(el).opacity) * opacidade(el.parentElement)
    memo.set(el, o)
    return o
  }
  const textoDireto = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim()
  const vazando = [], leitura = [], campos = [], alvos = []
  const SEM_CAMPO = /^(hidden|checkbox|radio|submit|button|reset|image|range|color|file)$/i
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') continue // só para leitor de tela
    if (opacidade(el) < 0.1 || el.closest('[aria-hidden="true"],[inert]')) continue
    let fixo = false, preso = false
    for (let p = el; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const ps = getComputedStyle(p)
      if (ps.position === 'fixed') fixo = true
      if (p !== el && ['hidden', 'clip', 'auto', 'scroll'].includes(ps.overflowX)) preso = true
    }
    const foraDaTela = r.left >= W || r.right <= 0
    if (!(fixo && foraDaTela)) {
      // 1. vaza a borda sem estar dentro de um carrossel (caixa com overflow próprio)
      if (!preso && (r.right > W + 1 || r.left < -1)) vazando.push({ nome: nome(el), esquerda: Math.round(r.left), direita: Math.round(r.right) })
    }
    if (foraDaTela) continue
    const tag = el.tagName
    // 2. texto de leitura (critério no cabeçalho): texto longo, ou frase curta; rótulo pequeno legítimo fica de fora
    // (legenda, letra miúda, rodapé, rótulo de campo, botão/link e caixa alta curta de sobretítulo/selo).
    const txt = textoDireto(el)
    if (txt && /^(P|LI|DD|BLOCKQUOTE|DIV|SPAN|TD)$/.test(tag) && !el.closest('footer,small,figcaption,caption,sup,sub,label,button,a,[role=contentinfo]')) {
      const palavras = txt.split(' ').filter((p) => /[\p{L}\p{N}]/u.test(p)).length
      const ponto = /[.!?…]["'”’)]*$/.test(txt)
      const caixaAlta = cs.textTransform === 'uppercase' || !/\p{Ll}/u.test(txt)
      const frase = (ponto && palavras >= 3) || (/^(P|LI|DD|BLOCKQUOTE)$/.test(tag) && palavras >= 4)
      if (txt.length >= 40) leitura.push({ nome: nome(el), px: parseFloat(cs.fontSize) })
      else if (frase && !caixaAlta) leitura.push({ nome: nome(el), px: parseFloat(cs.fontSize), curto: true })
    }
    if ((tag === 'INPUT' && !SEM_CAMPO.test(el.type)) || tag === 'SELECT' || tag === 'TEXTAREA') campos.push({ nome: nome(el), px: parseFloat(cs.fontSize) })
    // 3. alvos de toque (link no meio da frase fica de fora, como na WCAG)
    const alvo = (tag === 'A' && el.hasAttribute('href')) || tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'SELECT' ||
      (tag === 'INPUT' && /^(submit|button|reset|image|checkbox|radio)$/i.test(el.type) && !(/^(checkbox|radio)$/i.test(el.type) && el.labels?.length)) ||
      el.getAttribute('role') === 'button'
    if (alvo) {
      const pai = el.parentElement
      const emLinha = tag === 'A' && cs.display === 'inline' && pai && (pai.textContent || '').trim().length > (el.textContent || '').trim().length + 15
      alvos.push({ nome: nome(el), x: r.left, y: r.top + (fixo ? 0 : scrollY), w: r.width, h: r.height, fixo, emLinha })
    }
  }
  const larguraDoc = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  return { larguraDoc, vazando: vazando.slice(0, 30), leitura: leitura.slice(0, 400), campos: campos.slice(0, 100), alvos: alvos.slice(0, 400) }
}

// Links e botões que dá para tocar agora (na tela, visíveis e sem nada por cima); acha também o botão de menu.
function estadoDoMenu() {
  const vh = innerHeight, vw = innerWidth
  const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '')
  const opacidade = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o }
  const tocavel = (el) => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return null
    const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(vh - 1, Math.max(0, r.top + r.height / 2))
    const h = document.elementFromPoint(cx, cy)
    if (!h || !(h === el || el.contains(h) || h.contains(el))) return null
    if (getComputedStyle(el).visibility === 'hidden' || opacidade(el) < 0.5) return null
    return { x: cx, y: cy }
  }
  const links = []
  for (const el of document.querySelectorAll('a[href],button,[role=button],summary')) {
    const p = tocavel(el)
    if (p) links.push(`${el.tagName}|${el.getAttribute('href') || ''}|${(el.textContent || '').trim().slice(0, 30)}|${Math.round(p.x / 10)}|${Math.round(p.y / 10)}`)
  }
  const RE = /menu|hamb|burger|navega|nav-?toggle|toggle-?nav/i
  let botao = null
  for (const el of document.querySelectorAll('button,[role=button],a,summary')) {
    const sinais = [el.getAttribute('aria-label'), el.getAttribute('title'), el.id, typeof el.className === 'string' ? el.className : '', (el.textContent || '').trim().slice(0, 20)].join(' ')
    if (/wa\.me|whatsapp|^tel:|^mailto:/i.test(el.getAttribute('href') || '')) continue
    if (!(el.hasAttribute('aria-expanded') || el.hasAttribute('aria-controls') || RE.test(sinais))) continue
    const p = tocavel(el)
    if (p && p.y < vh / 2 && (!botao || p.y < botao.y)) botao = { x: p.x * (window.visualViewport?.scale || 1), y: p.y * (window.visualViewport?.scale || 1), nome: nome(el) } // toque vai em pixels da tela
  }
  return { links, botao }
}

function acharFechar() {
  const vh = innerHeight, vw = innerWidth
  for (const el of document.querySelectorAll('button,[role=button],a')) {
    const sinais = [el.getAttribute('aria-label'), el.getAttribute('title'), (el.textContent || '').trim()].join(' ')
    if (!/fechar|close|^\s*[×✕xX]\s*$/i.test(sinais)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue
    const s = window.visualViewport?.scale || 1 // toque vai em pixels da tela (página que não cabe fica com zoom menor)
    return { x: (r.left + r.width / 2) * s, y: (r.top + r.height / 2) * s }
  }
  return null
}

// op.pausa: espera depois de cada rolagem (padrão 350 ms; o teste sobre DOM simulado usa 0).
export function medirContato(op) {
  return (async () => {
    const pausa = op?.pausa ?? 350
    const reTexto = /whats|orçamento|orcamento|contato|fale|agend|ligue|ligar|chamar|reserv/i
    const reHref = /wa\.me|whatsapp|^tel:|^mailto:/i
    const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '')
    const opacidade = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o }
    const rotuloDe = (el) => `${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ${el.tagName === 'INPUT' ? el.getAttribute('value') || '' : ''}`
    const alvos = [...document.querySelectorAll('a,button,[role=button],input[type=submit],input[type=button]')]
      .filter((el) => reHref.test(el.getAttribute('href') || '') || reTexto.test(rotuloDe(el)))
    // Ação de quem não é link (critério no cabeçalho). Devolve 'link' (está dentro de um link, que é quem responde),
    // 'formulario', 'script' ou null (tocar não faz nada que dê para ver daqui).
    const cliques = window.__celularCliques
    const acaoDe = (el) => {
      if (el.closest('a[href]')) return 'link'
      const tag = el.tagName
      const tipo = (el.getAttribute('type') || (tag === 'BUTTON' ? 'submit' : '')).toLowerCase()
      if ((tag === 'BUTTON' || tag === 'INPUT') && tipo === 'submit' && (el.form || el.closest('form'))) return 'formulario'
      const attr = el.getAttribute('onclick')
      if (attr != null ? attr.trim() !== '' : typeof el.onclick === 'function') return 'script'
      if (el.hasAttribute('popovertarget') || el.hasAttribute('commandfor') || (cliques && cliques.has(el))) return 'script'
      const react = Object.keys(el).find((k) => k.startsWith('__reactProps$')) // onClick do React fica nas props do nó
      if (react && typeof el[react]?.onClick === 'function') return 'script'
      return null
    }
    const desenhado = (el) => { const r = el.getBoundingClientRect(); return r.width >= 1 && r.height >= 1 && getComputedStyle(el).visibility !== 'hidden' }
    const vistos = new Set(), destinos = [], acoes = [], semAcao = [], comAcao = []
    for (const a of alvos) {
      if (a.tagName === 'A' && a.hasAttribute('href')) {
        comAcao.push(a)
        const href = a.getAttribute('href')
        if (vistos.has(href)) continue
        vistos.add(href)
        let alvoExiste = null
        if (href.startsWith('#') && href.length > 1) { try { alvoExiste = !!document.getElementById(decodeURIComponent(href.slice(1))) } catch { alvoExiste = false } }
        destinos.push({ nome: nome(a), href, alvoExiste })
        continue
      }
      const tipo = acaoDe(a)
      if (tipo === 'link') continue
      if (tipo) { comAcao.push(a); acoes.push({ nome: nome(a), tipo }) }
      else if (desenhado(a)) semAcao.push({ nome: nome(a), texto: rotuloDe(a).replace(/\s+/g, ' ').trim().slice(0, 30) })
    }
    const max = Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - innerHeight)
    const posicoes = []
    for (const fracao of [0, 0.25, 0.5, 0.75, 1]) {
      window.scrollTo(0, Math.round(max * fracao))
      await new Promise((r) => setTimeout(r, pausa))
      const vh = innerHeight, vw = innerWidth
      const alcancavel = comAcao.some((el) => {
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1 || r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) return false
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        if (cy < vh / 3) return false // fora do alcance do polegar
        const h = document.elementFromPoint(cx, cy)
        return !!h && (h === el || el.contains(h)) && getComputedStyle(el).visibility !== 'hidden' && opacidade(el) >= 0.5
      })
      posicoes.push({ fracao, alcancavel })
    }
    window.scrollTo(0, 0)
    return { total: alvos.length, destinos: destinos.slice(0, 20), acoes: acoes.slice(0, 20), semAcao: semAcao.slice(0, 20), posicoes }
  })()
}

// Com movimento reduzido: rola a página e anota texto que passou pela tela sem nunca ficar visível.
function varrerLegivel() {
  return (async () => {
    const FORA = 'nav,[role=dialog],dialog,[aria-hidden="true"],[inert],[hidden],script,style,noscript,template'
    const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '')
    const textoDireto = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim()
    const visivel = (el) => {
      let o = 1
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none') return null; o *= parseFloat(cs.opacity) }
      return o >= 0.5 && getComputedStyle(el).visibility !== 'hidden'
    }
    const cand = [...document.body.querySelectorAll('*')].filter((el) => textoDireto(el).length >= 3 && !el.closest(FORA)).slice(0, 2000)
    const visto = new Set(), naTela = new Set()
    const max = () => Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - innerHeight)
    for (let y = 0; ; y += innerHeight * 0.6) {
      window.scrollTo(0, Math.min(y, max()))
      await new Promise((r) => setTimeout(r, 250))
      for (const el of cand) {
        if (visto.has(el)) continue
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue
        const v = visivel(el)
        if (v === null) continue
        naTela.add(el)
        if (v) visto.add(el)
      }
      if (y >= max()) break
    }
    window.scrollTo(0, 0)
    const inv = [...naTela].filter((el) => !visto.has(el))
    return { total: inv.length, invisiveis: inv.slice(0, 10).map((el) => `${nome(el)} "${textoDireto(el).slice(0, 30)}"`) }
  })()
}

// ---------------------------------------------------------------------------------------------------------
// Coleta de uma tela (mesma para Chrome e WebKit) e execução
// ---------------------------------------------------------------------------------------------------------
async function testarMenu(motor) {
  await motor.rodar(() => { window.scrollTo(0, 0); return true })
  await espera(400)
  const antes = await motor.rodar(estadoDoMenu)
  if (!antes.botao) return { achou: false }
  const { x, y, nome } = antes.botao
  await motor.tocar(x, y)
  await espera(800)
  const aberto = await motor.rodar(estadoDoMenu)
  const novos = aberto.links.filter((k) => !antes.links.includes(k))
  if (!novos.length) return { achou: true, abriu: false, fechou: false, nome }
  await motor.tocar(x, y)
  await espera(800)
  let depois = (await motor.rodar(estadoDoMenu)).links
  let fechou = !novos.some((k) => depois.includes(k))
  if (!fechou) {
    const f = await motor.rodar(acharFechar)
    if (f) { await motor.tocar(f.x, f.y); await espera(800); depois = (await motor.rodar(estadoDoMenu)).links; fechou = !novos.some((k) => depois.includes(k)) }
  }
  return { achou: true, abriu: true, fechou, nome }
}

async function rolarPorToque(motor, tela) {
  await motor.rodar(() => { window.scrollTo(0, 0); return true })
  await espera(300)
  const info = () => motor.rodar(() => ({ y: scrollY, max: Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - innerHeight), escala: window.visualViewport?.scale || 1 }))
  const ini = await info()
  // O dedo anda em pixels da tela; a página rola em pixels dela (diferem quando a página não cabe e o zoom diminui).
  const dedo = Math.round(tela.altura * 0.5)
  const distancia = dedo / ini.escala
  const posicoes = []
  let max = ini.max
  // Cada gesto rende menos que o caminho do dedo (o navegador desconta a folga do toque, ~15 px): a conta dos gestos
  // usa 75% do caminho, senão página comprida em tela baixa acaba os gestos antes do fim e parece travada.
  for (let i = 0; i < Math.min(80, Math.ceil(ini.max / (distancia * 0.75)) + 3); i++) {
    await motor.rolarToque(dedo, tela.largura / 2, tela.altura * 0.75)
    await espera(200)
    const agora = await info()
    max = agora.max
    posicoes.push(agora.y)
    if (agora.y >= max - 2) break
  }
  return { posicoes, distancia, maxRolagem: max }
}

export async function coletar(motor, tela, url) {
  const m = { ...tela }
  await motor.abrir(url, { ...tela, reduzido: false })
  m.videos = await motor.rodar(medirVideos)
  await motor.rodar(percorrer)
  Object.assign(m, await motor.rodar(medirLayout))
  m.largura = tela.largura
  m.menu = await testarMenu(motor)
  if (m.menu.achou && !m.menu.fechou) await motor.abrir(url, { ...tela, reduzido: false })
  m.contato = await motor.rodar(medirContato)
  m.toque = motor.rolarToque ? await rolarPorToque(motor, tela) : null
  await motor.abrir(url, { ...tela, reduzido: true })
  m.reduzido = await motor.rodar(varrerLegivel)
  return m
}

export async function conferir({ url, telas, exe, playwright }) {
  const medidas = []
  const motor = await motorChrome(exe)
  try { for (const t of telas) medidas.push(await coletar(motor, t, url)) } finally { await motor.fechar() }
  const itens = avaliarTudo(medidas)
  let webkit = null
  if (playwright) {
    try {
      const mw = await motorWebkit(playwright)
      try { const mm = []; for (const t of telas) mm.push(await coletar(mw, t, url)); webkit = { itens: avaliarTudo(mm) } } finally { await mw.fechar() }
    } catch (e) { webkit = { erro: `o WebKit do Playwright não rodou (${String(e.message).split('\n')[0]})` } }
  }
  itens.push({ n: 7, nome: NOMES[7], ...avaliarSafari(webkit) })
  return { relatorio: montarRelatorio(url, telas, itens), medidas }
}

function mostrar(rel, op) {
  const resumo = resumoTexto(rel)
  if (op.saida) {
    fs.mkdirSync(op.saida, { recursive: true })
    fs.writeFileSync(path.join(op.saida, 'celular.json'), JSON.stringify(rel, null, 2))
    fs.writeFileSync(path.join(op.saida, 'resumo.txt'), resumo + '\n')
  }
  console.log(op.json ? JSON.stringify(rel, null, 2) : resumo)
}

export async function executar(argv) {
  const op = lerArgs(argv)
  if (!op.url) { console.log('Uso: node celular.mjs <url|arquivo.html> [pasta-saida] [--larguras 360,390] [--deitado] [--json]'); return 2 }
  let url
  try { url = normalizarUrl(op.url) } catch (e) { mostrar(relatorioSemConferir(op.url, e.message), op); return 2 }
  const exe = acharNavegador()
  if (!exe) {
    mostrar(relatorioSemConferir(url, 'Chrome/Edge não encontrado: instale um deles ou defina BROWSER_EXECUTABLE'), op)
    return 2
  }
  try {
    const { relatorio } = await conferir({ url, telas: montarTelas(op.larguras, op.deitado), exe, playwright: await carregarPlaywright() })
    mostrar(relatorio, op)
    return relatorio.codigo
  } catch (e) {
    mostrar(relatorioSemConferir(url, `não deu para conferir: ${e.message}`), op)
    return 2
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const codigo = await executar(process.argv.slice(2))
  process.exit(codigo)
}
