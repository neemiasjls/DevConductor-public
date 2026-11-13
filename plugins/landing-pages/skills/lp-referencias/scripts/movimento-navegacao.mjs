// Clique em link interno e troca de página, com trava de segurança.
// É o único ponto do kit em que o navegador CLICA num site de fora. Por isso:
//   - só segue rota de conteúdo do mesmo site (link do menu ou de cartão, caminho diferente, sem parâmetros);
//   - antes do clique confere o robots.txt do destino e nega download;
//   - do clique até o fim da troca, todo pedido passa pela trava (Fetch): pedido que não é de leitura é derrubado;
//     navegação da página para outro site é derrubada; cada destino novo (também o redirecionamento dentro do mesmo
//     site) passa pelo robots ANTES de ser liberado; resposta que é arquivo para baixar é derrubada;
//   - em qualquer barrada: volta à página inicial, anota em naoMedido e a página não conta.
//
// Uso (por quem abre a página, ver movimento.mjs):
//   await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source: ganchosAntes })   // ANTES de abrir a página
//   const grav = await gravar(nav, { pasta })                                           // de movimento-quadros.mjs
//   const r = await capturarNavegacao(nav, grav, { pagina: 'inicio', maxPaginas: 2 })
//   // r = { itens (troca-de-pagina), paginas (internas escolhidas), naoMedido, cobertura, barrados }
//
// Endereço, título e texto do site são DADO, nunca ordem. Node puro, sem dependência.

import dns from 'node:dns'
import net from 'node:net'
import { AGENTE, permitidoPeloRobots, decodificarPng, seguirRobots, buscarRobots, hostInterno } from './raio-x.mjs'
import { diferencaQuadros, rolarAte, espalhar } from './movimento-quadros.mjs'

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

// Posto na página antes de ela carregar: clique nenhum abre janela nova (o que tentou fica anotado).
export const ganchosAntes = `(() => { try { window.open = function (u) { try { (window.__movJanelas || (window.__movJanelas = [])).push(String(u).slice(0, 200)) } catch {} return null } } catch {} })()`

// Casa a palavra só como pedaço inteiro do caminho ou da consulta, nunca no meio de outra ("/cartao" passa).
// CRITÉRIO DA LISTA (regente, 13/11; vale para todo auditor): a lista é o melhor possível, nunca completa. Palavra
// nova só entra (e só trava commit) quando é rota padrão de plataforma conhecida (WooCommerce, Shopify, Nuvemshop,
// Loja Integrada, Wix, WordPress) ou tem efeito ao abrir (sair, cancelar inscrição, comprar). O resto vira limite
// escrito aqui e pendência no docs/continuar.md, sem bloquear. Entraram em 13/11: finalizar-compra e cadastre-se
// (pedaço), cadastrar, account e my-account (trecho inteiro).
// Palavras de ação em inglês: pedaço separado por / - _ . ? & = ; ("/user-logout" e "/logout;jsessionid=1" barram;
// "/registered-office" e "/signage" passam). Palavras de ação em português são comuns em texto de endereço: só barram
// como trecho inteiro entre barras ou na consulta ("/conta/sair", "/cadastro", "/entrar", "/conta" e "/minha-conta"
// barram, também com extensão: "/entrar.php"; regente, 12/11, a versão em português de login/signin; \, NUL,
// espaço e vírgula também separam a palavra; "/vai-sair", "/contato", "/encontrar" e
// "/cadastro-de-clientes" passam). Exceção (regente, 12/11): carrinho e pagamento barram em qualquer lugar, até
// como pedaço de palavra ("/meu-carrinho", "/pagamentos", "/blog/formas-de-pagamento"). Testar sempre o caminho JÁ
// DECODIFICADO, volta a volta (ver decodificarAteParar e rotaProibida).
export const PROIBIDO_NO_ENDERECO = /(^|[/\-_.?&=;,\\\s\0])(log[-_]?(?:in|out|off)|sign[-_]?(?:in|out|up|off)|register|payments?|cart|checkout|delete|admin|unsubscribe)($|[/\-_.?&=#;,\\\s\0])|(^|[/?&=;,\\\s\0])(sair|cadastro|cadastrar|entrar|conta|minha-conta|account|my-account)($|[/.?&=#;,\\\s\0])|carrinho|pagamento|finalizar-compra|cadastre-se/i
// Decodifica %XX de novo enquanto o texto mudar (/%256Cogout -> /%6Cogout -> /logout), no máximo VOLTAS_DECODIFICAR
// voltas. Quando o decodeURIComponent falha, a volta é tolerante: %XX válido vira byte, "%" solto fica, byte que não
// forma UTF-8 vira U+FFFD (um %E0 solto não esconde o /logout/ do lado; "/100%25-natural" para em "/100%-natural"). Devolve todas as formas vistas (do texto cru à
// última), para a regra valer em cada uma, ou null se ainda mudava depois do limite (quem chama trata como proibido).
const VOLTAS_DECODIFICAR = 5
const decodificarTolerante = (s) => s.replace(/(?:%[0-9a-f]{2})+/gi, (m) => new TextDecoder().decode(Buffer.from(m.replace(/%/g, ''), 'hex')))
export function decodificarAteParar(texto) {
  const formas = [String(texto)]
  for (let volta = 0; volta <= VOLTAS_DECODIFICAR; volta++) {
    const atual = formas[formas.length - 1]
    let prox
    try { prox = decodeURIComponent(atual) } catch { prox = decodificarTolerante(atual) }
    if (prox === atual) return formas
    if (volta === VOLTAS_DECODIFICAR) return null
    formas.push(prox)
  }
}
const ARQUIVO = /\.(zip|rar|7z|gz|pdf|docx?|xlsx?|pptx?|csv|exe|msi|dmg|apk|mp4|mov|webm|mp3|wav|jpe?g|png|gif|webp|avif|svg)$/i

// ---------------------------------------------------------------------------------------------------------
// Regras puras
// ---------------------------------------------------------------------------------------------------------

// Mesmo site = mesmo nome (com ou sem www) e mesma porta (http e https nas portas padrão contam como iguais).
export function mesmoSite(a, b) {
  try {
    const x = new URL(a), y = new URL(b)
    if (!/^https?:$/.test(x.protocol) || !/^https?:$/.test(y.protocol)) return false
    return x.hostname.replace(/^www\./, '') === y.hostname.replace(/^www\./, '') && (x.port || 'padrao') === (y.port || 'padrao')
  } catch { return false }
}
const caminho = (u) => u.pathname.replace(/\/+$/, '') || '/'

// Por que NÃO seguir um link (texto), ou null se é rota de conteúdo.
// link = { bruto (href como está no HTML), url (absoluto), download, alvo (target), noMenu, noCartao }.
export function motivoDeNaoSeguir(link, atual) {
  const bruto = String(link.bruto ?? '').trim()
  if (!bruto || bruto.startsWith('#')) return 'âncora da mesma página'
  if (/^(mailto|tel|sms|javascript|whatsapp|data|blob|file):/i.test(bruto)) return 'não é endereço de página'
  let u, a
  try { u = new URL(link.url); a = new URL(atual) } catch { return 'endereço inválido' }
  if (!/^https?:$/.test(u.protocol)) return 'não é endereço de página'
  if (/(^|\.)(wa\.me|whatsapp\.com)$/i.test(u.hostname)) return 'WhatsApp'
  if (!mesmoSite(u, a)) return 'outro site'
  if (link.download) return 'link de download'
  if (/_blank/i.test(link.alvo || '')) return 'abre em outra janela'
  if (u.search) return 'endereço com parâmetros'
  if (caminho(u) === caminho(a)) return 'mesma página'
  const brutoDec = decodificarAteParar(bruto)
  if (rotaProibida(u.href, null, { arquivo: false }) || !brutoDec || brutoDec.some((f) => PROIBIDO_NO_ENDERECO.test(f))) return 'endereço de login, compra ou administração'
  if (rotaProibida(u.href)) return 'arquivo, não página' // o resto da rota proibida já saiu acima; aqui sobra o arquivo (também codificado: %2Epdf)
  if (!link.noMenu && !link.noCartao) return 'fora do menu e dos cartões do conteúdo'
  return null
}

// Links do próprio site que o raio-x não abre por serem login, compra ou administração (carrinho, pagamento, conta):
// viram linhas de naoMedido com o motivo, em vez de sumirem na soma "N links ficaram de fora". Uma linha por caminho,
// no máximo `max` (o resto numa linha só). afetaMedida: false: a página não é copiada (a landing page não tem
// carrinho); a lacuna fica registrada, mas não pede resolução um a um.
const MOTIVO_PROIBIDO = 'endereço de login, compra ou administração'
export function linksProibidosParaNaoMedido(links, atual, { pagina = 'inicio', max = 20 } = {}) {
  const caminhos = []
  for (const l of links || []) {
    // pela rota, mesmo quando outro motivo (parâmetros, outra janela, fora do menu) também deixaria o link de fora
    let c
    try {
      const u = new URL(l.url)
      if (!/^https?:$/.test(u.protocol) || !mesmoSite(u, new URL(atual)) || !rotaProibida(u.href, null, { arquivo: false })) continue
      c = u.origin + caminho(u)
    } catch { continue }
    if (!caminhos.includes(c)) caminhos.push(c)
  }
  const linha = (o) => ({ pagina, etapa: 'clique', o, motivo: `rota proibida (${MOTIVO_PROIBIDO}): o raio-x não abre esta página`, afetaMedida: false })
  const out = caminhos.slice(0, max).map(linha)
  if (caminhos.length > max) out.push(linha(`mais ${caminhos.length - max} link(s) de rota proibida`))
  return out
}

const padrao = (u) => { const s = caminho(new URL(u)).split('/').filter(Boolean); return s.length >= 2 ? '/' + s.slice(0, -1).join('/') + '/*' : null }

// Ordem de visita: primeiro o padrão de endereço que mais se repete (página de detalhe), depois o primeiro link do
// menu, depois os outros na ordem da página. Um link por padrão e por caminho.
export function escolherLinks(links, atual) {
  const bons = links.filter((l) => motivoDeNaoSeguir(l, atual) === null && l.visivel !== false)
  const porPadrao = new Map()
  for (const l of bons) { const p = padrao(l.url); if (!p) continue; if (!porPadrao.has(p)) porPadrao.set(p, new Set()); porPadrao.get(p).add(caminho(new URL(l.url))) }
  const [mais] = [...porPadrao.entries()].filter(([, s]) => s.size >= 2).sort((x, y) => y[1].size - x[1].size)
  const ordem = []
  if (mais) ordem.push(bons.find((l) => padrao(l.url) === mais[0] && l.noCartao) || bons.find((l) => padrao(l.url) === mais[0]))
  const menu = bons.find((l) => l.noMenu && !ordem.includes(l) && padrao(l.url) !== (mais && mais[0]))
  if (menu) ordem.push(menu)
  const vistos = new Set(ordem.map((l) => caminho(new URL(l.url)))), padroes = new Set(ordem.map((l) => padrao(l.url)).filter(Boolean))
  for (const l of bons) {
    const c = caminho(new URL(l.url)), p = padrao(l.url)
    if (vistos.has(c) || (p && padroes.has(p))) continue
    vistos.add(c)
    if (p) padroes.add(p)
    ordem.push(l)
  }
  return ordem
}

const DESAFIO = /just a moment|checking your browser|verify(ing)? (that )?you are (a )?human|access denied|captcha|attention required|are you a robot|unusual traffic|acesso negado/i

// A página que chegou é bloqueio ou desafio? Devolve o motivo (texto) ou null. Usada também na página inicial.
// "Quase sem texto" só conta junto com título vazio: página só de canvas, com título de verdade, não é desafio.
export function pareceDesafio({ status = null, titulo = '', texto = '' } = {}) {
  if ([401, 403, 429].includes(status)) return `a página respondeu ${status} (bloqueio)`
  const t = String(titulo || '').trim(), x = String(texto || '').trim()
  if (DESAFIO.test(t)) return 'título de página de desafio'
  if (x.length < 1500 && DESAFIO.test(x)) return 'texto de página de desafio'
  if (x.length < 40 && !t) return 'página quase sem texto e sem título'
  return null
}

// Cor que mais aparece num quadro e a parte da tela que ela ocupa (cores vizinhas contam juntas).
export function corDominante(img) {
  const conta = new Map()
  let n = 0
  for (let i = 0; i < img.px.length; i += img.canais * 3) {
    const k = ((img.px[i] >> 3) << 10) | ((img.px[i + 1] >> 3) << 5) | (img.px[i + 2] >> 3)
    conta.set(k, (conta.get(k) || 0) + 1)
    n++
  }
  let melhor = 0, cor = 0
  for (const [k, v] of conta) if (v > melhor) { melhor = v; cor = k }
  // vizinhos de até 1 passo em cada canal entram na conta (degradê leve de compressão)
  let soma = 0
  for (const [k, v] of conta) if (Math.abs((k >> 10) - (cor >> 10)) <= 1 && Math.abs(((k >> 5) & 31) - ((cor >> 5) & 31)) <= 1 && Math.abs((k & 31) - (cor & 31)) <= 1) soma += v
  const hex = (v) => ((v << 3) | 4).toString(16).padStart(2, '0')
  return { parte: n ? soma / n : 0, cor: '#' + hex(cor >> 10) + hex((cor >> 5) & 31) + hex(cor & 31) }
}

function noMeioDoCaminho(A, M, Z) { // M é mistura de A com Z? (desvanece)
  if (A.px.length !== M.px.length || A.px.length !== Z.px.length) return false
  let muda = 0, mistura = 0
  for (let i = 0; i < A.px.length; i += A.canais * 5) {
    let dAZ = 0, dentro = true, dA = 0, dZ = 0
    for (let c = 0; c < 3; c++) {
      const a = A.px[i + c], z = Z.px[i + c], m = M.px[i + c]
      dAZ += Math.abs(a - z); dA += Math.abs(m - a); dZ += Math.abs(m - z)
      if (m < Math.min(a, z) - 12 || m > Math.max(a, z) + 12) dentro = false
    }
    if (dAZ <= 60) continue
    muda++
    if (dentro && dA > 20 && dZ > 20) mistura++
  }
  return muda > 50 && mistura / muda >= 0.6
}
function deslocado(F, M) { // M é F andado para um lado? Devolve { eixo, d } ou null.
  const { largura: w, altura: h, canais: ch } = F
  if (F.px.length !== M.px.length) return null
  // Se M já bate com F no lugar (páginas com muito fundo liso), "andado" não quer dizer nada.
  let parado = 0, total = 0
  for (let i = 0; i < F.px.length; i += ch * 16) { total++; if (Math.abs(M.px[i] - F.px[i]) + Math.abs(M.px[i + 1] - F.px[i + 1]) + Math.abs(M.px[i + 2] - F.px[i + 2]) <= 36) parado++ }
  if (parado / total >= 0.7) return null
  for (const eixo of ['x', 'y']) for (let k = 1; k < 12; k++) for (const sinal of [1, -1]) {
    const d = Math.round(((eixo === 'x' ? w : h) * k * sinal) / 12)
    let igual = 0, n = 0, varia = 0, ant = -1
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
      const fx = eixo === 'x' ? x - d : x, fy = eixo === 'y' ? y - d : y
      if (fx < 0 || fy < 0 || fx >= w || fy >= h) continue
      const i = (y * w + x) * ch, j = (fy * w + fx) * ch
      n++
      if (Math.abs(M.px[i] - F.px[j]) + Math.abs(M.px[i + 1] - F.px[j + 1]) + Math.abs(M.px[i + 2] - F.px[j + 2]) <= 36) igual++
      if (ant >= 0 && Math.abs(F.px[j] - ant) > 12) varia++
      ant = F.px[j]
    }
    if (n > 200 && igual / n >= 0.85 && varia / n > 0.05) return { eixo, d }
  }
  return null
}

// M é a página Z ainda se desenhando? Onde M difere de Z, M é fundo liso (igual aos vizinhos a 4 px): o que falta
// é conteúdo que ainda não chegou (texto, imagem), não uma imagem no meio de uma transição.
function desenhando(M, Z) {
  if (M.px.length !== Z.px.length) return false
  const { largura: w, altura: h, canais: ch } = M
  const perto = (i, j) => Math.abs(M.px[i] - M.px[j]) + Math.abs(M.px[i + 1] - M.px[j + 1]) + Math.abs(M.px[i + 2] - M.px[j + 2]) <= 24
  let dif = 0, liso = 0
  for (let y = 0; y < h - 4; y += 3) for (let x = 0; x < w - 4; x += 3) {
    const i = (y * w + x) * ch
    if (Math.abs(M.px[i] - Z.px[i]) + Math.abs(M.px[i + 1] - Z.px[i + 1]) + Math.abs(M.px[i + 2] - Z.px[i + 2]) <= 36) continue
    dif++
    if (perto(i, i + 4 * ch) && perto(i, i + 4 * w * ch)) liso++
  }
  return dif < 50 || liso / dif >= 0.8
}

// quadros = [{ t (ms), img (decodificarPng) }] em ordem, do último antes do clique ao último depois da troca.
// Devolve null se a tela não mudou; { tipo: 'inconclusiva', motivo } se os quadros não bastam para dizer o tipo
// (troca seca só sai quando a tela comprovadamente pulou de uma página para a outra); senão
// { tipo, duracaoMs, inicioMs, fimMs, cor?, cobreMs?, descobreMs?, eixo?, quadrosNoMeio }.
export function classificarTroca(quadros) {
  const qs = (quadros || []).filter((q) => q && q.img)
  if (qs.length < 2) return { tipo: 'inconclusiva', motivo: `só ${qs.length} quadro(s) gravado(s) na troca` }
  const A = qs[0].img, Z = qs[qs.length - 1].img
  if (A.largura !== Z.largura || A.altura !== Z.altura) return { tipo: 'inconclusiva', motivo: 'os quadros de antes e de depois têm tamanhos diferentes' }
  const dA = qs.map((q) => diferencaQuadros(A, q.img, 8).total), dZ = qs.map((q) => diferencaQuadros(q.img, Z, 8).total)
  if (dA[dA.length - 1] < 0.01) return null
  const i0 = dA.findIndex((v) => v >= 0.01)
  let i1 = qs.length - 1
  while (i1 > i0 && dZ[i1 - 1] < 0.01) i1--
  const inicioMs = Math.max(qs[i0 - 1].t, qs[i0].t - 16), fimMs = qs[i1].t
  const meio = qs.slice(i0, i1), duracaoMs = Math.max(0, Math.round((fimMs - inicioMs) / 10) * 10)
  const base = { inicioMs: Math.round(inicioMs), fimMs: Math.round(fimMs), quadrosNoMeio: meio.length }
  const cores = meio.map((q) => corDominante(q.img))
  const cheios = cores.map((c, k) => (c.parte >= 0.9 ? k : -1)).filter((k) => k >= 0)
  if (cheios.length && corDominante(A).parte < 0.9 && corDominante(Z).parte < 0.9) {
    const soPiscou = cheios.length === meio.length && duracaoMs < 150
    if (!soPiscou) return { tipo: 'cobre-e-descobre', duracaoMs, ...base, cor: cores[cheios[0]].cor,
      cobreMs: Math.max(0, Math.round(meio[cheios[0]].t - inicioMs)), descobreMs: Math.max(0, Math.round(fimMs - meio[cheios[cheios.length - 1]].t)) }
    return { tipo: 'troca-seca', duracaoMs: 0, esperaMs: duracaoMs, ...base }
  }
  if (meio.length >= 2 && duracaoMs >= 100) { // menos que isso é a página nova sendo desenhada, não transição
    // desliza: pelo menos dois quadros do meio são a página (antiga ou nova) andada, cada um num ponto diferente
    const passos = meio.map((q) => deslocado(A, q.img) || deslocado(Z, q.img)).filter(Boolean)
    if (passos.length >= 2 && new Set(passos.map((p) => p.eixo + p.d)).size >= 2) return { tipo: 'desliza', duracaoMs, eixo: passos[0].eixo, ...base }
    if (meio.some((q) => noMeioDoCaminho(A, q.img, Z))) return { tipo: 'desvanece', duracaoMs, ...base }
    // a página nova só se desenhando (o que falta dela é fundo liso): troca seca comprovada
    if (meio.every((q) => desenhando(q.img, Z))) return { tipo: 'troca-seca', duracaoMs: 0, esperaMs: duracaoMs, ...base }
    // a tela mudou aos poucos, mas de nenhum jeito conhecido: não dá para afirmar que não há transição
    return { tipo: 'inconclusiva', motivo: `a tela mudou aos poucos em ${duracaoMs} ms (${meio.length} quadros), mas não é cortina, desvanecer nem deslizar`, ...base }
  }
  return { tipo: 'troca-seca', duracaoMs: 0, esperaMs: duracaoMs, ...base }
}

// ---------------------------------------------------------------------------------------------------------
// robots.txt por destino (um pedido por site, guardado)
// ---------------------------------------------------------------------------------------------------------
// permitido(url): robots.txt fora do ar (erro de rede, 5xx) = sem regra (o próprio site medido; como sempre foi).
// permitido.estrito(url): mesma leitura guardada, mas segue a RFC 9309 (2.3.1.4): robots.txt inalcançável (erro de rede
// ou 5xx) = tudo proibido. Usado na leitura por código a OUTRO site (travaDe). 4xx que não seja 401/403/429 = sem regra.
// Redirecionamento do robots.txt: seguirRobots (raio-x.mjs, o mesmo seguidor do conferirRobots), que valida cada
// salto ANTES de pedir: só http(s), caminho /robots.txt, nunca rotaProibida, no máximo 5 saltos e, de origem pública,
// nunca host interno (127.x, 10.x, 192.168.x, 169.254.x, ::1...). Salto inválido, 3xx sem Location ou saltos demais =
// robots.txt indisponível (estrito barra; o próprio site fica sem regra, como no robots fora do ar).
// permitido(url, origem): origem = a página medida (a trava passa T.origem). Origem de fora nunca faz o Node conectar
// na rede interna, nem por IP literal nem por nome que resolve para lá (buscarRobots confere na hora de conectar): fica
// como robots indisponível (estrito barra; o próprio site, sem regra). O buscar padrão é o buscarRobots (raio-x.mjs).
export function criarRobots({ buscar = buscarRobots } = {}) {
  const guardado = new Map()
  const consultar = async (u, origem) => {
    const signal = AbortSignal.timeout(20_000) // um prazo para a cadeia inteira
    const x = await seguirRobots(u, { buscar, signal, origem, proibido: (href) => rotaProibida(href, null, { arquivo: false }) })
    if (x.indisponivel) return { texto: '', indisponivel: true }
    const r = x.r
    if ([401, 403, 429].includes(r.status)) return { bloqueado: true }
    if (r.status >= 500) return { texto: '', indisponivel: true }
    return { texto: r.ok ? await r.text() : '' }
  }
  const ler = async (endereco, origem) => {
    let u, deFora
    try { u = new URL(endereco); deFora = !hostInterno(new URL(origem ?? u).hostname) } catch { return null }
    const chave = `${deFora ? 'fora' : 'dentro'} ${u.origin}` // a mesma origem lida de cadeia pública ou interna dá outra resposta
    if (!guardado.has(chave)) guardado.set(chave, consultar(u, origem ?? undefined).catch(() => ({ texto: '', indisponivel: true }))) // inalcançável
    return { u, r: await guardado.get(chave) }
  }
  async function permitido(endereco, origem) {
    const x = await ler(endereco, origem)
    return !!x && !x.r.bloqueado && permitidoPeloRobots(x.r.texto, AGENTE, x.u.pathname + x.u.search)
  }
  permitido.estrito = async (endereco, origem) => {
    const x = await ler(endereco, origem)
    return !!x && !x.r.indisponivel && (await permitido(endereco, origem))
  }
  return permitido
}

// ---------------------------------------------------------------------------------------------------------
// Trava (protocolo Fetch): uma por navegador, usada também pela interação (movimento-interacao.mjs).
// T.navegar diz se o quadro principal pode trocar de documento: false (nunca), true (rota de conteúdo do mesmo site)
// ou um endereço (só ele: a volta à página inicial).
// ---------------------------------------------------------------------------------------------------------
const travas = new WeakMap()
const semCerquilha = (u) => { try { const x = new URL(u); x.hash = ''; return x.href } catch { return String(u) } }

// Endereço de ação (login, compra, administração, apagar) ou arquivo: nunca é aberto, nem por redirecionamento.
// O próprio endereço de origem (a página que já estava aberta) não conta.
export function rotaProibida(endereco, origem = null, { arquivo = true } = {}) {
  let u
  try { u = new URL(endereco) } catch { return true }
  if (origem && semCerquilha(endereco) === semCerquilha(origem)) return false
  // O caminho é testado decodificado, como o servidor o lê (/%6Cogout é /logout), volta a volta até parar de mudar
  // (/%256Cogout também: servidor ou proxy que decodifica duas vezes); caminho com codificação inválida já na primeira
  // leitura é proibido (não dá para saber o que o servidor entende). A consulta também conta (/conta?acao=logout), com
  // as mesmas voltas, mas "%" solto nela segue (é comum em site real). Ainda mudando depois do limite = proibido.
  try { decodeURIComponent(u.pathname) } catch { return true }
  const caminhos = decodificarAteParar(u.pathname), consultas = decodificarAteParar(u.search)
  if (!caminhos || !consultas) return true
  return caminhos.some((c) => PROIBIDO_NO_ENDERECO.test(c) || (arquivo && ARQUIVO.test(c))) || consultas.some((c) => PROIBIDO_NO_ENDERECO.test(c))
}

// Pedido barrado que torna a medida da página inválida (o resto só é anotado).
// Modo rigoroso ('qualquer'): todo barrado dos tipos de antes de 12/11 continua invalidando, como era (escrita de
// fundo, leitura por código barrada como outro site, robots ou rota). Dos tipos novos, só o canal direto (websocket:
// WebSocket/WebTransport, que manda dados ao servidor) invalida, porque o modo existe para "qualquer escrita derrubada
// invalida"; quadro de outro site, aba nova e service worker não são escrita da página e seguem só anotados.
// rede-interna (leitura de página pública à rede de dentro, barrada antes do robots): só anotada também no rigoroso;
// no quadro principal ela vem com documento: true e invalida como qualquer navegação barrada.
const SO_ANOTADO_NO_RIGOROSO = new Set(['quadro-outro-site', 'janela', 'service-worker', 'rede-interna'])
export const barradoGrave = (b, escritaInvalida = 'documento') =>
  !!(b.documento || b.conteudo || (escritaInvalida === 'qualquer' && !SO_ANOTADO_NO_RIGOROSO.has(b.tipo)))

export async function travaDe(nav) {
  if (travas.has(nav)) return travas.get(nav)
  const T = { ligada: false, origem: null, permitido: null, navegar: false, quadro: null, barrados: [], status: null, navegou: null, carregou: null }
  travas.set(nav, T)
  T.quadro = (await nav.cmd('Page.getFrameTree')).frameTree.frame.id
  const seguir = (p) => nav.cmd('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {})
  const barrar = (p, tipo, documento, conteudo = false) => {
    T.barrados.push({ tipo, documento, conteudo, metodo: p.request.method, url: String(p.request.url).slice(0, 300), recurso: p.resourceType })
    return nav.cmd('Fetch.failRequest', { requestId: p.requestId, errorReason: 'Aborted' }).catch(() => {})
  }
  // Rede interna: página de site PÚBLICO (origem decidida pelo nome ou IP literal, hostInterno) pedindo endereço de
  // dentro (127.x, 10.x, 169.254.169.254, localhost...) ou nome que resolve para lá. Conferido ANTES de qualquer
  // consulta de robots.txt (senão o próprio Node bateria na rede interna). Origem interna (teste local, site do usuário
  // em localhost) pode, como sempre. O host da própria página não é conferido (é escolha de quem mede). Nome: resolvido
  // aqui (dns.lookup, all), barra se QUALQUER endereço for interno; erro ou demora (3 s) na resolução = segue, e o robots
  // (buscarRobots confere de novo na hora de conectar) decide. Limite: o Chrome resolve de novo, por conta própria, na
  // hora do pedido dele; se o DNS trocar entre as duas resoluções, quem barra é só o robots do Node (estrito).
  const resolverTodos = (host) => new Promise((ok) => {
    const prazo = setTimeout(() => ok([]), 3000)
    try { T.lookup(host, { all: true }, (err, lista) => { clearTimeout(prazo); ok(err ? [] : Array.isArray(lista) ? lista : [{ address: lista }]) }) } catch { clearTimeout(prazo); ok([]) }
  })
  const redeInterna = async (url) => {
    let u, pagina
    try { u = new URL(url); pagina = new URL(T.origem) } catch { return false }
    if (hostInterno(pagina.hostname) || u.hostname === pagina.hostname) return false
    if (hostInterno(u.hostname)) return true
    if (net.isIP(u.hostname.replace(/^\[|\]$/g, ''))) return false
    return (await resolverTodos(u.hostname)).some((a) => hostInterno(a?.address))
  }
  nav.ouvir('Fetch.requestPaused', async (p) => {
    try {
      if (!T.ligada) return await seguir(p)
      const principal = p.resourceType === 'Document' && p.frameId === T.quadro
      if (p.responseStatusCode == null && p.responseErrorReason == null) { // antes de o pedido sair
        const url = p.request.url
        if (!/^(GET|HEAD|OPTIONS)$/i.test(p.request.method)) return await barrar(p, 'escrita', p.resourceType === 'Document')
        if (principal) {
          if (T.navegar === false) return await barrar(p, 'navegacao', true)
          if (typeof T.navegar === 'string' && semCerquilha(url) !== semCerquilha(T.navegar)) return await barrar(p, 'navegacao', true)
          if (!mesmoSite(url, T.origem)) return await barrar(p, 'outro-site', true)
          if (rotaProibida(url, T.origem)) return await barrar(p, 'rota', true)
          if (await redeInterna(url)) return await barrar(p, 'rede-interna', true) // www. é outro nome: pode resolver para dentro
          if (!(await T.permitido(url, T.origem))) return await barrar(p, 'robots', true)
        } else if (p.resourceType === 'Document' && /^https?:/i.test(url) && !mesmoSite(url, T.origem)) {
          // Quadro interno (iframe) de outro site, já no HTML, lazy ou por redirecionamento: o Chrome o roda em outro
          // processo e os pedidos de dentro dele não passariam por esta trava. Barrado sempre; só anotado (mapa ou vídeo
          // embutido de terceiro não invalida a medida da página).
          return await barrar(p, 'quadro-outro-site', false)
        } else if (p.resourceType === 'Document' && T.navegar === false) {
          // Quadro interno (iframe) aberto ou trocado quando nada pode navegar: um clique pode mandar um formulário GET
          // para um iframe e o pedido passaria como conteúdo. Barrado; a página medida fica sem ele.
          return await barrar(p, 'quadro', false, true)
        } else if (/^(Fetch|XHR|EventSource|Preflight)$/.test(p.resourceType) && !mesmoSite(url, T.origem)) {
          // Leitura pedida por código a outro site (a escrita já foi barrada acima): cena do Unicorn Studio e arquivo
          // Lottie vêm assim e SÃO o movimento a medir. Passa só se não é endereço de ação e se o robots.txt DAQUELE
          // site deixa (criarRobots guarda por origem; 401/403/429 no robots = bloqueado). Barrado é só anotado (não
          // invalida a medida). A consulta prévia de CORS (Preflight, OPTIONS) segue a mesma regra do pedido. Fonte,
          // imagem, folha de estilo e script de outro endereço (CDN) não passam por aqui e seguem liberados.
          if (!/^https?:/i.test(url)) return await barrar(p, 'outro-site', false)
          // página pública lendo a rede interna: barrada antes do robots (o Node nem consulta), só anotada
          if (await redeInterna(url)) return await barrar(p, 'rede-interna', false)
          if (rotaProibida(url, null, { arquivo: false })) return await barrar(p, 'rota', false)
          // RFC 9309: robots.txt do outro site fora do ar (erro de rede, 5xx) = proibido (permitido.estrito, de
          // criarRobots); permitido injetado sem .estrito segue como era.
          if (!(await (T.permitido.estrito || T.permitido)(url, T.origem))) return await barrar(p, 'robots', false)
        } else if (/^(Document|Fetch|XHR|EventSource)$/.test(p.resourceType) && mesmoSite(url, T.origem)) {
          // Conteúdo pedido por código ou por quadro interno do mesmo site (é assim que a troca de página de SPA
          // busca a página nova antes do pushState): as mesmas proibições de endereço e o robots.txt.
          if (rotaProibida(url, T.origem, { arquivo: false })) return await barrar(p, 'rota', false, true)
          if (await redeInterna(url)) return await barrar(p, 'rede-interna', false, true)
          if (!(await T.permitido(url, T.origem))) return await barrar(p, 'robots', false, true)
        }
        return await seguir(p)
      }
      if (principal) { // a resposta chegou: arquivo para baixar não entra
        const cab = Object.fromEntries((p.responseHeaders || []).map((h) => [h.name.toLowerCase(), h.value]))
        const tipo = cab['content-type'] || ''
        if (/attachment/i.test(cab['content-disposition'] || '') || (tipo && !/html|xml|text\/plain/i.test(tipo) && !(p.responseStatusCode >= 300 && p.responseStatusCode < 400))) return await barrar(p, 'download', true)
        if (p.responseStatusCode < 300 || p.responseStatusCode >= 400) T.status = p.responseStatusCode
      }
      return await seguir(p)
    } catch { try { await barrar(p, 'erro-na-trava', true) } catch {} } // na dúvida, não passa
  })
  nav.ouvir('Page.frameNavigated', (p) => { if (p.frame && !p.frame.parentId) T.navegou = { url: p.frame.url, t: Date.now(), inteira: true } })
  nav.ouvir('Page.navigatedWithinDocument', (p) => { if (p.frameId === T.quadro) T.navegou = { url: p.url, t: Date.now(), inteira: false } })
  nav.ouvir('Page.loadEventFired', () => { T.carregou = Date.now() })
  // Aba ou janela nova: quem barra é a vigia do navegador (vigiarAbas, em raio-x.mjs: nada da aba nova sai); aqui só
  // fica anotado, sem invalidar a medida. windowOpen avisa a tentativa; Vigia.abaBarrada, o pedido derrubado.
  const janela = (p) => { if (T.ligada) T.barrados.push({ tipo: 'janela', documento: false, conteudo: false, metodo: 'GET', url: String(p?.url || '').slice(0, 300), recurso: 'Janela' }) }
  nav.ouvir('Page.windowOpen', janela)
  nav.ouvir('Vigia.abaBarrada', janela)
  // Canal fora do HTTP (WebSocket, WebSocketStream, WebTransport, WebRTC/RTCPeerConnection) e service worker / worker compartilhado: a vigia os
  // barra SEMPRE (abrirNavegador, em raio-x.mjs); aqui só ficam anotados, sem invalidar a medida.
  nav.ouvir('Vigia.canalBarrado', (p) => { if (T.ligada) T.barrados.push({ tipo: 'websocket', documento: false, conteudo: false, metodo: 'GET', url: String(p?.url || '').slice(0, 300), recurso: p?.canal || 'WebSocket' }) })
  nav.ouvir('Vigia.workerBarrado', (p) => { if (T.ligada) T.barrados.push({ tipo: 'service-worker', documento: false, conteudo: false, metodo: 'GET', url: String(p?.url || '').slice(0, 300), recurso: p?.tipo || 'service_worker' }) })
  // lookup: no formato do dns.lookup (injetável nos testes); sem ele, o dns.lookup do sistema
  T.ligar = async ({ origem, permitido, navegar = false, lookup = dns.lookup }) => {
    Object.assign(T, { origem, permitido, navegar, lookup, barrados: [], status: null, navegou: null, carregou: null, ligada: true })
    await nav.cmd('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }, { urlPattern: '*', resourceType: 'Document', requestStage: 'Response' }] })
  }
  T.desligar = async () => { T.ligada = false; T.navegar = false; try { await nav.cmd('Fetch.disable') } catch {} }
  return T
}

// Antes de fechar o navegador: tira a página do ar (about:blank) com a trava AINDA ligada. Desligar a trava (ou soltar
// o navegador, que encerra a interceptação) com a página viva deixa um temporizador dela mandar pedido sem conferência
// no intervalo até o processo morrer. Quem usa a trava até o fim chama isto e só então nav.fechar(), sem desligar.
// Devolve true se a página saiu; false fica a cargo de quem chama avisar (stderr e avisos da saída).
// Diálogo da página (alert, confirm, prompt, beforeunload) prende o Page.navigate e o Runtime.evaluate. Só durante a
// saída: o que já estava aberto é dispensado às cegas e o que abrir depois é respondido pelo protocolo (beforeunload:
// aceita sair; os outros: dispensa). Fora do tirarDoAr nada muda (a medida das etapas segue como era).
const saindo = new WeakMap()
export async function tirarDoAr(nav) {
  if (!saindo.has(nav)) {
    const S = { ativo: false }
    saindo.set(nav, S)
    nav.ouvir('Page.javascriptDialogOpening', (p) => { if (S.ativo) nav.cmd('Page.handleJavaScriptDialog', { accept: p?.type === 'beforeunload' }, 5000).catch(() => {}) })
  }
  const S = saindo.get(nav)
  S.ativo = true
  try {
    try { await nav.cmd('Page.enable', {}, 5000) } catch {}
    try { await nav.cmd('Page.handleJavaScriptDialog', { accept: false }, 2000) } catch {} // sem diálogo aberto: erro esperado
    await nav.cmd('Page.navigate', { url: 'about:blank' }, 10_000)
    for (let i = 0; i < 40; i++) {
      if ((await nav.rodar(() => location.href, null, 2000).catch(() => '')) === 'about:blank') return true
      await espera(50)
    }
  } catch {} finally { S.ativo = false }
  return false
}

// Roda fn com a trava ligada e a desliga no fim (finally). Se a trava já estava ligada (chamada de dentro de outra
// etapa), só roda fn. fn recebe T; os barrados ficam em T.barrados.
export async function comTrava(nav, { origem, permitido = criarRobots(), navegar = false, lookup }, fn) {
  const T = await travaDe(nav)
  if (T.ligada) return fn(T)
  await T.ligar({ origem, permitido, navegar, lookup })
  try { return await fn(T) } finally { await T.desligar() }
}

// ---------------------------------------------------------------------------------------------------------
// Dentro da página
// ---------------------------------------------------------------------------------------------------------
function navLinks() {
  const desc = (el) => {
    const id = el.id && /^[\w-]{1,30}$/.test(el.id) ? '#' + el.id : ''
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).find((c) => /^[a-z][\w-]{0,30}$/i.test(c)) : ''
    return el.tagName.toLowerCase() + id + (!id && cls ? '.' + cls : '')
  }
  return { atual: location.href, links: [...document.querySelectorAll('a[href]')].slice(0, 600).map((a, indice) => {
    const r = a.getBoundingClientRect(), cs = getComputedStyle(a), m = a.closest('[data-mov]')
    return { indice, bruto: (a.getAttribute('href') || '').slice(0, 300), url: String(a.href).slice(0, 600), download: a.hasAttribute('download'), alvo: a.getAttribute('target') || '',
      noMenu: !!a.closest('nav, header, [role=navigation], [role=menu], [role=menubar]'),
      noCartao: !a.closest('footer') && !!a.closest('main, article, section, li, [class*=card], [class*=cartao], [class*=item], [class*=proje]'),
      visivel: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none',
      desc: desc(a), texto: (a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), dataMov: m ? m.getAttribute('data-mov') : null }
  }) }
}
function navPonto({ indice, url, clicar }) {
  let a = document.querySelectorAll('a[href]')[indice]
  if (!a || String(a.href).slice(0, 600) !== url) a = [...document.querySelectorAll('a[href]')].find((e) => String(e.href).slice(0, 600) === url)
  if (!a) return null
  if (clicar) { a.click(); return { clicou: true } }
  const r = a.getBoundingClientRect()
  let pt = null
  for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.25], [0.5, 0.75]]) {
    const x = r.left + r.width * fx, y = r.top + r.height * fy
    if (x < 1 || y < 1 || x > innerWidth - 1 || y > innerHeight - 1) continue
    const t = document.elementFromPoint(x, y)
    if (t && (t === a || a.contains(t))) { pt = { x: Math.round(x), y: Math.round(y) }; break }
  }
  return { pt, delta: r.top + r.height / 2 - innerHeight / 2, vh: innerHeight }
}
function navEstado() {
  return { url: location.href, titulo: String(document.title || '').slice(0, 200), texto: ((document.body && document.body.innerText) || '').trim().slice(0, 3000) }
}

// ---------------------------------------------------------------------------------------------------------
// Coleta
// ---------------------------------------------------------------------------------------------------------
export const MOTIVO = { 'outro-site': 'a navegação (ou o conteúdo pedido por código) foi para outro site e foi barrada', robots: 'o destino (ou o redirecionamento, ou o conteúdo pedido por código) é proibido pelo robots.txt e foi barrado',
  rota: 'o destino (ou o redirecionamento, ou o conteúdo pedido por código) é endereço de login, compra, administração ou arquivo e foi barrado',
  navegacao: 'a ação tentou levar a outra página e foi barrada',
  quadro: 'a ação tentou abrir ou trocar a página de um quadro interno (iframe, inclusive envio de formulário) e foi barrada',
  'quadro-outro-site': 'quadro interno de outro site (iframe de mapa, vídeo ou anúncio) não foi aberto; a página foi medida sem ele',
  janela: 'a ação tentou abrir aba ou janela nova e o navegador não deixou',
  websocket: 'a página tentou abrir canal direto com servidor (WebSocket, WebTransport ou WebRTC, que não passa pela conferência de pedidos) e foi barrada; a página foi medida sem ele',
  'rede-interna': 'a página (de site público) tentou ler endereço da rede interna (localhost, 127.x, 10.x, 192.168.x, 169.254.x... ou nome que aponta para lá) e foi barrada antes de qualquer consulta; a página foi medida sem ele',
  'service-worker': 'a página tentou instalar service worker (ou worker compartilhado), que pediria fora da conferência, e o navegador não deixou; a página foi medida sem ele',
  download: 'o destino é arquivo para baixar e foi barrado', escrita: 'o clique tentou enviar dados (pedido que não é de leitura) e foi barrado', 'erro-na-trava': 'a trava falhou ao conferir o pedido; por segurança ele foi barrado' }

// Aviso de um pedido barrado que NÃO invalidou a troca de página: diz o que foi barrado de fato (escrita ou leitura).
export function avisoDeBarrado(b, rota) {
  const oQue = b.tipo === 'escrita' ? 'pedido de escrita' : b.tipo === 'janela' ? 'aba ou janela nova' : b.tipo === 'websocket' ? 'canal direto (WebSocket, WebTransport ou WebRTC)' : b.tipo === 'service-worker' ? 'service worker' : `pedido de leitura (${MOTIVO_CURTO[b.tipo] || 'barrado pela trava'})`
  return `${oQue} derrubado durante a troca para ${rota} (${b.metodo} ${caminhoDe(b.url)}); a página foi medida`
}
const MOTIVO_CURTO = { 'outro-site': 'outro site', robots: 'proibido pelo robots.txt', rota: 'endereço de login, compra, administração ou arquivo',
  'quadro-outro-site': 'quadro interno de outro site', quadro: 'quadro interno', download: 'arquivo para baixar', navegacao: 'navegação',
  websocket: 'canal direto WebSocket, WebTransport ou WebRTC', 'service-worker': 'service worker ou worker compartilhado',
  'rede-interna': 'endereço da rede interna pedido por site público' }

const caminhoDe = (u) => { try { const x = new URL(u); return x.pathname + (x.search ? '?…' : '') } catch { return String(u).slice(0, 80) } }

// Pedidos barrados → linhas de naoMedido (nunca somem calados). afetaMedida: false = pedido de escrita de fundo
// (estatística) derrubado sem tocar no que foi medido; não deixa a cobertura parcial.
export function barradosParaNaoMedido(lista, { pagina, etapa, onde, escritaInvalida = 'documento' }) {
  const out = [], vistos = new Set()
  for (const b of lista) {
    const o = `${onde}: pedido ${b.metodo} ${caminhoDe(b.url)}`
    if (vistos.has(o + b.tipo)) continue
    vistos.add(o + b.tipo)
    out.push({ pagina, etapa, o, motivo: MOTIVO[b.tipo] || 'barrado pela trava', barrado: b.tipo, afetaMedida: barradoGrave(b, escritaInvalida) })
  }
  return out
}

// Volta à página inicial COM a trava: só o endereço inicial pode abrir; scripts e redirecionamentos da volta passam
// pelas mesmas regras. A trava segue ligada (sem navegação) até a página estabilizar.
async function voltar(nav, T, inicial) {
  let onde = null
  try { onde = (await nav.rodar(navEstado, null, 5000)).url } catch {}
  if (onde === inicial) return true
  T.carregou = null
  T.navegar = inicial
  try {
    try { await nav.cmd('Page.navigate', { url: inicial }) } catch {}
    for (let i = 0; i < 150 && !T.carregou; i++) await espera(100)
  } finally { T.navegar = false }
  await espera(300)
  try { onde = (await nav.rodar(navEstado, null, 5000)).url } catch { onde = null }
  return onde === inicial
}

// Segue até maxPaginas rotas de conteúdo, uma por vez, medindo a troca; volta à página inicial depois de cada uma.
// A trava fica ligada do começo ao fim (desligada em finally, menos quando quem chamou já a tinha ligada: aí ela
// segue ligada, sem navegar); a navegação só é liberada do clique ao fim da troca.
// escritaInvalida: 'documento' (padrão: só o envio de formulário pela página invalida; o resto é derrubado e anotado)
// ou 'qualquer' (rigoroso: qualquer pedido de escrita derrubado, inclusive canal WebSocket/WebTransport, invalida a
// página; leitura barrada também, como antes; quadro de outro site, aba nova e service worker seguem só anotados).
export async function capturarNavegacao(nav, grav, { pagina = 'inicio', maxPaginas = 2, limiteMs = 4000, permitido = criarRobots(), escritaInvalida = 'documento', maxTentativas = null } = {}) {
  const itens = [], paginas = [], naoMedido = [], barrados = [], avisos = []
  try { await nav.cmd('Browser.setDownloadBehavior', { behavior: 'deny' }) } catch { try { await nav.cmd('Page.setDownloadBehavior', { behavior: 'deny' }) } catch { avisos.push('não consegui negar download no navegador; vale a trava de pedidos') } }
  const T = await travaDe(nav)
  const { atual: inicial, links } = await nav.rodar(navLinks)
  const fila = escolherLinks(links, inicial)
  const fora = links.length - links.filter((l) => motivoDeNaoSeguir(l, inicial) === null).length
  naoMedido.push(...linksProibidosParaNaoMedido(links, inicial, { pagina }))
  const nao = (o, motivo) => naoMedido.push({ pagina, etapa: 'clique', o, motivo })
  const grave = (b) => barradoGrave(b, escritaInvalida)
  let tentativas = 0, cursor = 0
  // Barrados desde a última leitura (a lista da trava só cresce enquanto ela está ligada).
  const pegar = (onde) => {
    const novos = T.barrados.slice(cursor)
    cursor = T.barrados.length
    barrados.push(...novos.map((b) => ({ ...b, onde })))
    return novos
  }
  const jaAnotados = new Set()
  const anotar = (lista, onde, menosOsGraves = false) => {
    for (const n of barradosParaNaoMedido(menosOsGraves ? lista.filter((b) => !grave(b)) : lista, { pagina, etapa: 'clique', onde, escritaInvalida })) {
      if (jaAnotados.has(n.o + n.barrado)) continue // a mesma tentativa a cada volta vira uma linha só
      jaAnotados.add(n.o + n.barrado)
      naoMedido.push(n)
    }
  }
  maxTentativas ??= maxPaginas + 6
  const jaLigada = T.ligada // chamada de dentro de um percurso travado (movimento.mjs): a trava não é desligada no fim
  await T.ligar({ origem: inicial, permitido, navegar: false })
  try {
    for (const link of fila) {
      if (paginas.filter((p) => p.valido !== false).length >= maxPaginas || tentativas >= maxTentativas) break
      const rota = new URL(link.url).pathname
      anotar(pegar('página inicial'), 'página inicial')
      // Volta que não chegou na página inicial: os próximos links seriam clicados em outra página. Para.
      const ondeEstou = await nav.rodar(navEstado, null, 5000).catch(() => null)
      if (!ondeEstou || ondeEstou.url !== inicial) { nao('volta à página inicial', 'não consegui voltar à página inicial; parei de seguir links'); break }
      tentativas++
      if (!(await permitido(link.url))) { nao(`link ${rota}`, 'o robots.txt não permite o destino; não cliquei'); continue }
      let pos = (await rolarAte(nav, 0)).posicao
      let p = await nav.rodar(navPonto, link)
      if (p && (!p.pt || Math.abs(p.delta) > p.vh * 0.3)) { pos = (await rolarAte(nav, Math.max(0, pos + p.delta), { limiteTravaMs: 2500 })).posicao; p = await nav.rodar(navPonto, link) }
      if (!p) { nao(`link ${rota}`, 'o link sumiu da página'); continue }
      const id = `interna-${paginas.length + 1}`
      anotar(pegar('página inicial'), 'página inicial')
      const ini = cursor
      Object.assign(T, { status: null, navegou: null, carregou: null, navegar: true })
      // As fotos de antes e de depois são tiradas com a gravação sem guardar: tirar foto faz o Chrome mandar um quadro
      // a mais, desenhado de outro jeito, que estragaria a conta do tempo.
      const de = grav.marcar({ pagina, gatilho: 'troca-de-pagina', soFotos: true })
      try { await grav.foto() } catch {}
      const t0 = Date.now()
      grav.marcar({ pagina, gatilho: 'troca-de-pagina', t0 })
      let peloCodigo = false
      try {
        if (p.pt) {
          await nav.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.pt.x, y: p.pt.y })
          await nav.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.pt.x, y: p.pt.y, button: 'left', clickCount: 1 })
          await nav.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.pt.x, y: p.pt.y, button: 'left', clickCount: 1 })
        } else { peloCodigo = true; await nav.rodar(navPonto, { ...link, clicar: true }, 5000) }
      } catch {}
      // A gravação segue ligada atravessando a navegação (cada quadro é confirmado em gravar()).
      let marcouNova = false
      try {
        while (Date.now() - t0 < limiteMs) {
          await espera(100)
          if (T.barrados.slice(ini).some(grave)) break
          if (T.navegou && !marcouNova) { marcouNova = true; grav.marcar({ pagina: id, gatilho: 'troca-de-pagina', t0 }) }
          const ult = grav.quadros.length > de ? grav.quadros[grav.quadros.length - 1].t : t0
          if (T.navegou && (T.carregou || !T.navegou.inteira) && Date.now() - t0 >= 800 && Date.now() - Math.max(ult, T.navegou.t) > 500) break
        }
      } finally { T.navegar = false } // a página nova fica com a trava, sem poder navegar de novo
      const navegou = T.navegou, status = T.status, barradosAqui = pegar(`link ${rota}`)
      const serio = barradosAqui.find(grave)
      anotar(barradosAqui, `link ${rota}`, true)
      const volta = async () => {
        const ok = await voltar(nav, T, inicial)
        anotar(pegar('volta à página inicial'), 'volta à página inicial')
        return ok
      }
      if (serio) { grav.marcar({ pagina, gatilho: 'troca-de-pagina', soFotos: true }); nao(`link ${rota}`, MOTIVO[serio.tipo] || 'barrado pela trava'); await volta(); continue }
      for (const b of barradosAqui) avisos.push(avisoDeBarrado(b, rota))
      if (!navegou) { grav.marcar({ pagina, gatilho: 'troca-de-pagina', soFotos: true }); nao(`link ${rota}`, `cliquei e a página não trocou em ${limiteMs / 1000} s`); await volta(); continue }
      let est = null
      try { est = await nav.rodar(navEstado, null, 10_000) } catch {}
      if (!est || !mesmoSite(est.url, inicial)) { grav.marcar({ pagina, gatilho: 'troca-de-pagina', soFotos: true }); nao(`link ${rota}`, 'a página nova não respondeu ou saiu do site'); await volta(); continue }
      grav.marcar({ pagina: id, gatilho: 'troca-de-pagina', soFotos: true, t0 })
      try { await grav.foto() } catch {}
      const desafio = pareceDesafio({ status, titulo: est.titulo, texto: est.texto })
      if (desafio) {
        paginas.push({ id, url: est.url, tipo: 'interna', chegouPor: null, valido: false, motivo: desafio })
        nao(`página ${rota}`, `bloqueio ou página de desafio (${desafio}); parei nela, sem tentar outro caminho`)
        await volta()
        continue
      }
      // Para classificar: o quadro de antes do clique e os da gravação (a foto do fim só entra se a gravação não mandou nada).
      let usados = grav.quadros.slice(de)
      const daGravacao = usados.filter((q, k) => k === 0 || q.fonte === 'gravacao')
      if (daGravacao.length >= 2) usados = daGravacao
      if (usados.length > 300) { const passo = Math.ceil(usados.length / 300); usados = usados.filter((q, k) => k % passo === 0 || k === usados.length - 1) }
      let troca = null
      try { troca = classificarTroca(usados.map((q) => ({ t: q.t, img: decodificarPng(q.dados) }))) } catch { troca = { tipo: 'inconclusiva', motivo: 'não consegui ler os quadros gravados' } }
      for (const q of usados) q.dados = null
      troca ??= { tipo: 'inconclusiva', motivo: 'a tela não mudou nos quadros gravados' }
      paginas.push({ id, url: est.url, tipo: 'interna', chegouPor: null, chegouPorLink: link.desc })
      if (troca.tipo === 'inconclusiva') {
        // Captura inconclusiva não vira "troca seca": a página conta, a troca fica para olhar à mão.
        nao(`troca para ${rota}`, `não deu para dizer como a página troca (${troca.motivo}); olhar à mão`)
        await volta()
        continue
      }
      const FRASE = { 'cobre-e-descobre': `uma tela de uma cor só (${troca.cor}) cobre a página antiga e descobre a nova`, desvanece: 'a página antiga desvanece para a nova', desliza: `a página desliza (eixo ${troca.eixo})`, 'troca-seca': 'a página nova entra de uma vez, sem transição' }
      const MUDA = { 'cobre-e-descobre': ['visibilidade'], desvanece: ['opacidade'], desliza: [troca.eixo === 'y' ? 'posicao-y' : 'posicao-x'], 'troca-seca': ['visibilidade'] }
      itens.push({
        pagina, secao: null, gatilho: 'troca-de-pagina', ordem: 1,
        alvo: { desc: link.desc, texto: link.texto || '', quantos: 1, dataMov: link.dataMov ?? null },
        quemMuda: ['proprio'], muda: MUDA[troca.tipo], de: { caminho: new URL(inicial).pathname }, para: { caminho: new URL(est.url).pathname },
        duracaoMs: troca.duracaoMs, curva: null, atrasoMs: 0, escadaMs: 0, rolagem: null,
        fontes: ['quadros'], confianca: troca.tipo === 'troca-seca' ? 'media' : usados.length >= 6 ? 'media' : 'baixa',
        tecnica: FRASE[troca.tipo] + (navegou.inteira ? ' (carrega outra página)' : ' (troca dentro da mesma página, sem recarregar)') + (peloCodigo ? '; link acionado por código, o ponteiro não chegava nele' : ''),
        resumo: `troca de página ao clicar em ${link.desc}: ${troca.tipo}${troca.duracaoMs ? `, ${troca.duracaoMs} ms` : ''}`,
        quadros: null, quadrosBrutos: espalhar(usados.map((q) => q.arquivo), 24), destino: id, troca,
      })
      await volta()
    }
    anotar(pegar('página inicial'), 'página inicial')
  } finally { if (jaLigada) T.navegar = false; else await T.desligar() } // quem já tinha a trava ligada fica com ela, sem intervalo
  const validas = paginas.filter((p) => p.valido !== false).length
  const contam = naoMedido.filter((n) => n.afetaMedida !== false)
  return { itens, paginas, naoMedido, barrados, avisos,
    cobertura: { pagina, etapa: 'clique', estado: !fila.length ? 'nao-se-aplica' : contam.length || validas < Math.min(maxPaginas, fila.length) ? 'parcial' : 'completa', itens: itens.length,
      limites: `até ${maxPaginas} páginas internas (${validas} medidas, ${tentativas} links clicados de ${fila.length} rotas de conteúdo; ${fora} links ficaram de fora: outro site, âncora, download, janela nova, parâmetros, login/compra/administração ou fora do menu e dos cartões); não preenche formulário nem segue link de outra página interna`,
      motivo: !fila.length ? 'não há rota de conteúdo para seguir' : contam.length ? contam[0].motivo : null } }
}
