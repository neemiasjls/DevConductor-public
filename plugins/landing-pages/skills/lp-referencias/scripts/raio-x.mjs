// Raio-x de um site de referência: estrutura por seção e movimento medido rolando a página aos poucos.
// Uso: node raio-x.mjs <url> <pasta-saida> [--celular | --tambem-celular] [--passos N] [--limite N]
//   --celular         mede só no celular (390×844, toque)
//   --tambem-celular  mede no computador e depois no celular: raio-x.json + raio-x-celular.json (prints/ e prints-celular/)
//   --passos N  passos de rolagem por altura de tela (padrão 10 = cada passo anda 10% da tela)
//   --limite N  máximo de passos (padrão 600); página maior anda em passos maiores
//   --bruto     grava também amostras-brutas.json (todas as medidas, para conferir a classificação; é grande)
//   --movimento depois do raio-x, o inventário de movimento (movimento.mjs): até 40 elementos por seção, tempo por alvo;
//               aceita --max-mouse N, --max-paginas N e --tempo-max S
// Saída: raio-x.json, roteiro.md, custo.md, medidas.css (variáveis para a construção: escala, espaços, raios, colunas
// e ritmo; sem cores nem fontes) e prints/ (uma tela por seção + página inteira).
// Aviso de cookies: escondido só no navegador do raio-x (nada é clicado nem aceito) e anotado em "avisos".
// Usa o Chrome/Edge instalado pelo protocolo DevTools (sem dependência); BROWSER_EXECUTABLE aponta outro.
// Só medidas para estudo: antes de abrir site externo confere o robots.txt; bloqueio (401/403/429) encerra,
// sem tentar por outro caminho. Nada é publicado.
// Movimento por amostragem: GSAP e afins não aparecem em getAnimations(), então a cada passo o script anota
// posição, tamanho, opacidade, transformação e recorte dos elementos principais e classifica as trajetórias.
import fs from 'node:fs'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { Transform } from 'node:stream'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const AGENTE = 'DevConductor-lp-referencias/1.0 (raio-x de referencia para estudo)'

// Vocabulário fixo, compartilhado com os outros scripts (comparador, cenas).
export const TIPOS = ['presa', 'paralaxe', 'revelacao-mascara', 'rolagem-lateral', 'zoom', 'pilha', 'texto-letra',
  'texto-linha', 'entrada-simples', 'marquee', '3d', 'video', 'troca-de-cor', 'nenhum']

// Peso de cada tipo na "força" do movimento (escolhe a cena principal).
// "fundo-animado" fica só em detalhes (fora do vocabulário e de "tipos"): canvas WebGL sem biblioteca 3D e sem
// interação costuma ser shader de fundo, não cena 3D; "3d" só com Three.js e afins (ou canvas que responde ao mouse).
const PESO = { presa: 2, 'rolagem-lateral': 4, '3d': 3, pilha: 3.5, 'revelacao-mascara': 2.5, zoom: 2, video: 2,
  paralaxe: 1.5, 'troca-de-cor': 1.5, 'texto-letra': 1.5, 'texto-linha': 1, marquee: 1, 'entrada-simples': 0.5,
  'fundo-animado': 1.5, nenhum: 0 }

// ---------------------------------------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------------------------------------

// RFC 9309 §2.2.2: antes de comparar, regra e caminho ficam na mesma forma. Não-ASCII vira UTF-8 codificado;
// caractere não reservado codificado (%70) volta a ser ele mesmo (p); o resto codificado (%2F, %25, %2A...) fica
// codificado, com hex maiúsculo. Uma passada só (%2570 continua %2570). "%" inválido fica como está; nunca lança.
function normalizarCodificacao(s) {
  const utf8 = String(s).replace(/[^\x00-\x7F]+/g, (m) => { try { return encodeURIComponent(m) } catch { return m } })
  return utf8.replace(/%([0-9a-fA-F]{2})/g, (_, h) => {
    const c = String.fromCharCode(parseInt(h, 16))
    return /[A-Za-z0-9\-._~]/.test(c) ? c : '%' + h.toUpperCase()
  })
}

// Diz se o robots.txt deixa o agente ler o caminho. Grupo mais específico do agente; senão o "*".
// Regra mais longa vence; empate fica com Allow. Aceita * e $ como no padrão (RFC 9309). Regra e caminho são
// comparados normalizados (normalizarCodificacao): /%70roibido não escapa de "Disallow: /proibido".
export function permitidoPeloRobots(texto, agente, caminho) {
  const grupos = []
  let atual = null
  let lendoAgentes = false
  for (const bruta of String(texto || '').split(/\r?\n/)) {
    const linha = bruta.replace(/#.*/, '').trim()
    const m = linha.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const campo = m[1].toLowerCase()
    const valor = m[2].trim()
    if (campo === 'user-agent') {
      if (!lendoAgentes) { atual = { agentes: [], regras: [] }; grupos.push(atual); lendoAgentes = true }
      atual.agentes.push(valor.toLowerCase())
    } else if (campo === 'allow' || campo === 'disallow') {
      lendoAgentes = false
      if (atual) atual.regras.push({ permite: campo === 'allow', valor })
    }
  }
  const produto = agente.split('/')[0].toLowerCase()
  let melhor = 0
  let regras = []
  for (const g of grupos) {
    for (const a of g.agentes) {
      const tam = a === '*' ? 0.5 : (a && produto.includes(a) ? a.length : 0)
      if (!tam) continue
      if (tam > melhor) { melhor = tam; regras = [...g.regras] }
      else if (tam === melhor) regras.push(...g.regras)
    }
  }
  const alvo = normalizarCodificacao(caminho)
  let vencedora = null
  for (const r of regras) {
    if (!r.valor) continue // "Disallow:" vazio libera tudo
    const valor = normalizarCodificacao(r.valor) // %24 e %2A seguem codificados: não viram $ nem *
    const fimExato = valor.endsWith('$')
    const corpo = (fimExato ? valor.slice(0, -1) : valor).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    const padrao = new RegExp('^' + corpo + (fimExato ? '$' : ''))
    if (!padrao.test(alvo)) continue
    const tam = valor.length // tamanho já normalizado: /%70rivado não ganha de /privado/ por ser mais comprido
    if (!vencedora || tam > vencedora.tam || (tam === vencedora.tam && r.permite)) vencedora = { tam, permite: r.permite }
  }
  return vencedora ? vencedora.permite : true
}

export function local(endereco) {
  return endereco.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]', '::1'].includes(endereco.hostname) ||
    endereco.hostname.endsWith('.localhost') || endereco.hostname.endsWith('.test')
}

// Endereço da rede de dentro, pelo nome ou IP literal (sem resolver DNS; o parser de URL já normaliza 2130706433,
// 127.1, 0x7f.0.0.1 e ::ffff:127.0.0.1): localhost e *.localhost, 0/8, 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16,
// 100.64/10 (rede de operadora), ::, ::1, fc00::/7, fe80::/10 e IPv4 dentro de IPv6 (::ffff:a.b.c.d e ::a.b.c.d).
// Host vazio ou IP malformado conta como interno. Nome que RESOLVE para interno: buscarRobots e a trava (resolvem).
export function hostInterno(host) {
  const h = String(host ?? '').toLowerCase().replace(/^\[|\]$/g, '').replace(/%.*$/, '').replace(/\.$/, '')
  if (!h) return true
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  const v4 = (s) => { const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/); const n = m && m.slice(1).map(Number); return n && n.every((x) => x <= 255) ? n : null }
  const interno4 = ([a, b]) => a === 0 || a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && (b & 0xc0) === 64)
  const n4 = v4(h)
  if (n4) return interno4(n4)
  if (!h.includes(':')) return false // nome comum: sem DNS, é de fora
  let ip = h
  const cauda = ip.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (cauda) {
    const t = v4(cauda[1])
    if (!t) return true
    ip = ip.slice(0, -cauda[1].length) + ((t[0] << 8) | t[1]).toString(16) + ':' + ((t[2] << 8) | t[3]).toString(16)
  }
  const partes = ip.split('::')
  if (partes.length > 2) return true
  const lado = (s) => (s ? s.split(':') : [])
  const esq = lado(partes[0]), dir = lado(partes[1])
  const meio = partes.length === 2 ? 8 - esq.length - dir.length : 0
  if (meio < 0 || (partes.length === 1 && esq.length !== 8)) return true
  const g = [...esq, ...Array(meio).fill('0'), ...dir].map((x) => (/^[0-9a-f]{1,4}$/.test(x) ? parseInt(x, 16) : NaN))
  if (g.length !== 8 || g.some(Number.isNaN)) return true
  const zeros = (de, ate) => g.slice(de, ate).every((x) => x === 0)
  if (zeros(0, 7) && g[7] <= 1) return true // :: e ::1
  if ((g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80) return true // fc00::/7 e fe80::/10
  if (zeros(0, 5) && (g[5] === 0xffff || g[5] === 0)) return interno4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255])
  return false
}

// buscar padrão do robots.txt (no lugar do fetch global): node:http/https com o lookup embrulhado. Com
// bloquearInterno, o endereço que o lookup devolve é conferido por hostInterno NA HORA de conectar; é o mesmo endereço
// usado na conexão, então não há janela para o DNS trocar entre a conferência e o pedido (DNS rebinding). Qualquer
// endereço interno na lista = erro ERR_REDE_INTERNA e a conexão nem começa. IP literal não passa pelo lookup (o Node
// pula): é conferido antes. Sem pool de conexões (agent: false); corpo lido inteiro na hora, até LIMITE_ROBOTS (500 KiB,
// o mínimo que a RFC 9309 manda ler), e o resto descartado; prazo pelo signal. Devolve só o pedaço da Response que o
// código usa (status, ok, headers.get, body.cancel, text). lookup injetável (testes), no formato do dns.lookup.
// Compressão (o fetch fazia sozinho): pede Accept-Encoding: identity e, mesmo assim, descomprime o que vier em 2xx
// (gzip/x-gzip, deflate com ou sem cabeçalho zlib, br, zstd se o Node tiver; cadeia "gzip, br" desfeita de trás para
// frente, no máximo 5, como o fetch). O limite vale para o texto DESCOMPRIMIDO: ao chegar nele para de descomprimir e
// corta (igual ao texto puro), então bomba de compressão não enche a memória. Codificação desconhecida, cadeia longa
// ou erro ao descomprimir = rejeita (robots indisponível); bytes comprimidos nunca viram regra. Fora de 2xx o corpo não
// é lido (ninguém usa) e text() dá ''. Texto sempre como UTF-8 (RFC 9309), BOM tirado, byte inválido vira U+FFFD.
// Conexão cortada antes do fim = rejeita (indisponível), não texto parcial.
export const LIMITE_ROBOTS = 500 * 1024
const CODIFICACOES_ROBOTS = 5
function descompressorRobots(nome) {
  if (nome === 'gzip' || nome === 'x-gzip') return zlib.createGunzip()
  if (nome === 'br') return zlib.createBrotliDecompress()
  if (nome === 'zstd' && typeof zlib.createZstdDecompress === 'function') return zlib.createZstdDecompress()
  if (nome !== 'deflate') return null
  // deflate: com cabeçalho zlib (RFC 9110) ou cru (servidores antigos); decide pelos 2 primeiros bytes.
  // Pressão do estágio seguinte: push false = pausa o inflater (ele para de ler a entrada, e o z.write não termina);
  // volta quando o próximo estágio pede mais (_read). Sem isso cada pedaço comprimido virava MBs na fila do meio.
  let z = null, inicio = Buffer.alloc(0)
  const ligar = (t) => {
    const ehZlib = inicio.length >= 2 && (inicio[0] & 0x0f) === 8 && ((inicio[0] << 8) | inicio[1]) % 31 === 0
    z = ehZlib ? zlib.createInflate() : zlib.createInflateRaw()
    z.on('data', (d) => { if (!t.push(d)) z.pause() })
    z.on('error', (e) => t.destroy(e))
    const b = inicio; inicio = null
    return b
  }
  const t = new Transform({
    transform(c, _e, cb) {
      if (!z) { inicio = Buffer.concat([inicio, c]); if (inicio.length < 2) return cb(); c = ligar(this) }
      z.write(c, () => cb())
    },
    flush(cb) {
      if (!z) { if (!inicio.length) return cb(); const b = ligar(this); z.write(b) } // corpo de 1 byte
      z.once('end', () => cb()); z.end()
    },
    destroy(e, cb) { z?.destroy(); cb(e) },
  })
  const ler = t._read // o _read do Transform solta o callback da escrita guardado: embrulhado, nunca trocado
  t._read = function (n) { z?.resume(); return ler.call(this, n) }
  return t
}
// aoDescomprimir (só testes): recebe os estágios de descompressão, na ordem em que o corpo passa por eles.
export function buscarRobots(alvo, { headers = {}, signal, bloquearInterno = false, lookup = dns.lookup, aoDescomprimir } = {}) {
  return new Promise((resolve, reject) => {
    let u
    try { u = new URL(alvo) } catch (e) { return reject(e) }
    if (!/^https?:$/.test(u.protocol)) return reject(new Error(`esquema não suportado: ${u.protocol}`))
    const erroInterno = () => Object.assign(new Error(`endereço da rede interna: ${u.hostname}`), { code: 'ERR_REDE_INTERNA' })
    if (bloquearInterno && hostInterno(u.hostname)) return reject(erroInterno())
    const conferido = (host, opcoes, cb) => {
      if (typeof opcoes === 'function') { cb = opcoes; opcoes = {} }
      lookup(host, opcoes, (err, endereco, familia) => {
        if (err) return cb(err)
        const lista = Array.isArray(endereco) ? endereco : [{ address: endereco, family: familia }]
        if (bloquearInterno && (!lista.length || lista.some((a) => hostInterno(a?.address)))) return cb(erroInterno())
        cb(null, endereco, familia)
      })
    }
    const pedido = { ...headers }
    for (const k of Object.keys(pedido)) if (k.toLowerCase() === 'accept-encoding') delete pedido[k]
    pedido['Accept-Encoding'] = 'identity'
    const req = (u.protocol === 'https:' ? https : http).request(u, { method: 'GET', headers: pedido, signal, agent: false, lookup: conferido }, (res) => {
      const partes = []
      let tam = 0, pronto = false, estagios = []
      const status = res.statusCode, ok = status >= 200 && status < 300
      const parar = () => { res.destroy(); for (const s of estagios) s.destroy() }
      const fim = () => {
        if (pronto) return
        pronto = true
        const texto = new TextDecoder().decode(Buffer.concat(partes).subarray(0, LIMITE_ROBOTS))
        resolve({ status, ok, url: u.href, text: async () => texto, body: { cancel: async () => {} },
          headers: { get: (n) => { const v = res.headers[String(n).toLowerCase()]; return v == null ? null : Array.isArray(v) ? v.join(', ') : String(v) } } })
      }
      const falhar = (e) => { if (pronto) return; pronto = true; parar(); reject(e) }
      if (!ok) { fim(); return parar() } // corpo de 3xx/4xx/5xx não é usado: não lê nem descomprime
      const nomes = String(res.headers['content-encoding'] ?? '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => s && s !== 'identity')
      if (nomes.length > CODIFICACOES_ROBOTS) return falhar(Object.assign(new Error(`robots.txt com codificações demais: ${nomes.join(', ')}`), { code: 'ERR_ROBOTS_CODIFICACAO' }))
      for (const nome of nomes.reverse()) { // a última aplicada é a primeira a desfazer
        const d = descompressorRobots(nome)
        if (!d) return falhar(Object.assign(new Error(`robots.txt com Content-Encoding desconhecido: ${nome}`), { code: 'ERR_ROBOTS_CODIFICACAO' }))
        estagios.push(d)
      }
      aoDescomprimir?.(estagios)
      let saida = res
      for (const d of estagios) { saida.pipe(d); saida = d }
      for (const s of [res, ...estagios]) s.on('error', falhar) // pipe não repassa erro; sem ouvinte derrubaria o processo
      saida.on('data', (c) => {
        if (pronto) return
        partes.push(c)
        tam += c.length
        if (tam >= LIMITE_ROBOTS) { fim(); parar() } // chega: o resto não é lido nem descomprimido
      })
      saida.on('end', fim)
      res.on('close', () => { if (!res.complete) falhar(new Error('resposta do robots.txt cortada no meio')) })
    })
    req.on('error', reject)
    req.end()
  })
}

// Busca /robots.txt seguindo o redirecionamento à mão (o buscar não segue sozinho), no máximo SALTOS_ROBOTS saltos, e
// cada pedido é validado ANTES de sair: só http(s), caminho /robots.txt (outro site ou http -> https é normal),
// nunca endereço de ação (proibido, a rotaProibida de movimento-navegacao.mjs) e, se a origem da cadeia é de fora,
// nunca host interno, no primeiro pedido e nos saltos (hostInterno: um site público não manda o Node buscar nada na rede
// de dentro; origem interna, como teste local, pode). A origem da cadeia é `origem` (a página medida, quando quem chama
// a conhece; senão o próprio endereço) e é decidida só pelo nome ou IP literal, nunca por resolução: nome público que
// aponta para 127.0.0.1 não ganha passe livre. Nome que RESOLVE para interno: o buscar recebe bloquearInterno (o padrão,
// buscarRobots, confere na hora de conectar). Devolve { r } (resposta final, não 3xx), { indisponivel: true } (salto
// inválido, 3xx sem Location ou saltos demais) ou { indisponivel: true, interno: true } (rede interna, nada conectou).
// Outro erro de rede lança (quem chama decide).
export const SALTOS_ROBOTS = 5
export async function seguirRobots(endereco, { buscar = buscarRobots, proibido = () => false, signal = AbortSignal.timeout(20_000), origem } = {}) {
  const deFora = !hostInterno(new URL(origem ?? endereco).hostname)
  let alvo = new URL('/robots.txt', new URL(endereco))
  for (let salto = 0; ; salto++) {
    if (deFora && hostInterno(alvo.hostname)) return { indisponivel: true, interno: true }
    let r
    try { r = await buscar(alvo, { headers: { 'User-Agent': AGENTE }, redirect: 'manual', signal, bloquearInterno: deFora }) }
    catch (e) { if (e?.code === 'ERR_REDE_INTERNA') return { indisponivel: true, interno: true }; throw e }
    if (!(r.status >= 300 && r.status < 400)) return { r }
    try { await r.body?.cancel?.() } catch {}
    if (salto >= SALTOS_ROBOTS) return { indisponivel: true }
    const loc = r.headers?.get?.('location')
    let prox
    try { prox = new URL(loc ?? '', alvo) } catch { return { indisponivel: true } }
    if (!loc || !/^https?:$/.test(prox.protocol) || prox.pathname !== '/robots.txt' || proibido(prox.href)) return { indisponivel: true }
    prox.hash = ''
    alvo = prox // host interno vindo de cadeia de fora: barrado no começo da volta, antes de pedir
  }
}

// Confere o robots.txt. Devolve null se pode seguir, ou o motivo de parar. Redirecionamento: seguirRobots (salto
// inválido = robots indisponível = sem regra, como robots fora do ar; o destino inválido nunca é pedido).
export async function conferirRobots(endereco, { buscar = buscarRobots } = {}) {
  if (local(endereco)) return null
  // import na hora: movimento-navegacao.mjs importa deste arquivo (no topo, seria import circular). Fora do try:
  // falha aqui estoura, não vira "sem regra".
  const { rotaProibida } = await import('./movimento-navegacao.mjs')
  let r
  try {
    const signal = AbortSignal.timeout(20_000)
    const x = await seguirRobots(endereco, { buscar, signal, proibido: (u) => rotaProibida(u, null, { arquivo: false }) })
    if (x.indisponivel) return null
    r = x.r
  } catch { return null } // sem robots.txt alcançável: sem regra
  if ([401, 403, 429].includes(r.status)) return `robots.txt respondeu ${r.status}: o site bloqueia robôs. Parar aqui, sem contornar; estudar à mão.`
  if (!r.ok) return null
  const texto = await r.text()
  if (!permitidoPeloRobots(texto, AGENTE, endereco.pathname + endereco.search)) return `robots.txt não permite ${endereco.pathname}: parar aqui; estudar à mão.`
  return null
}

// ---------------------------------------------------------------------------------------------------------
// Classificação das trajetórias (funções puras)
// ---------------------------------------------------------------------------------------------------------
// Entrada de classificarSecao:
//   { vw, vh, s: [rolagem em px por passo], secaoNoCentro: [bool por passo], corPagina: [cor por passo],
//     elementos: [{ desc, midia, texto, ov, cadeia, pai (índice na lista ou -1 = página), estados: [estado|null] }],
//     texto: [{ nl, sl, nw, sw } por passo] (fragmentos de letra/linha e a soma dos seus deslocamentos),
//     deriva: [[dx por elemento] | null por passo] (andar sem rolar), estatico: { videos, canvas } }
//   estado = { t, l, w, h, o, sx, sy, r3, c, p }  (topo, esquerda, largura, altura, opacidade, escala x/y,
//   rotação 3D, recorte, posição: 'f' fixed | 's' sticky | 'a' absolute | '' outros)
// O elemento 0 é a própria seção.

const r2 = (n) => Math.round(n * 100) / 100

function regressao(xs, ys) {
  const n = xs.length
  if (n < 2) return { p: 0, r2: 0 }
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2 }
  if (!sxx) return { p: 0, r2: 0 }
  return { p: sxy / sxx, r2: syy ? (sxy * sxy) / (sxx * syy) : 1 }
}

const visivel = (e, vw, vh) => e && e.w > 1 && e.h > 1 && e.t < vh && e.t + e.h > 0 && e.l < vw && e.l + e.w > 0
const numeros = (c) => (String(c || '').match(/-?\d+(\.\d+)?/g) || []).map(Number)

// Trechos em que o elemento fica parado na tela enquanto a rolagem anda.
function trechosPresos(estados, s, passos, vh) {
  const trechos = []
  let ini = null, fim = null
  const fechar = () => {
    if (ini !== null && s[fim] - s[ini] >= vh * 0.3) trechos.push({ ini, fim, topo: estados[ini].t })
    ini = null
  }
  for (let j = 1; j < passos.length; j++) {
    const a = passos[j - 1], b = passos[j]
    if (b !== a + 1) { fechar(); continue } // buraco: o elemento saiu da tela
    const ds = s[b] - s[a]
    if (ds <= 0) continue // rolagem não andou neste passo: não prova nada
    const parado = Math.abs(estados[b].t - estados[a].t) <= Math.max(2, ds * 0.04)
    if (parado) { if (ini === null) ini = a; fim = b } else fechar()
  }
  fechar()
  return trechos
}

export function classificarSecao(dados) {
  const { vw, vh, s, elementos } = dados
  const n = s.length
  const det = []
  const add = (tipo, d) => det.push({ tipo, ...d })
  const telas = (px) => r2(px / vh)
  const raiz = elementos[0]
  const raizVisivel = (k) => visivel(raiz?.estados[k], vw, vh)
  const presoEm = elementos.map(() => new Set())
  const presos = []

  // 1) Presa: bloco grande parado na tela por pelo menos 0,3 tela de rolagem.
  elementos.forEach((el, i) => {
    const passos = []
    for (let k = 0; k < n; k++) if (visivel(el.estados[k], vw, vh) && raizVisivel(k)) passos.push(k)
    if (passos.length < 3) return
    const grande = passos.some((k) => el.estados[k].h >= vh * 0.4 && el.estados[k].w >= vw * 0.3)
    if (!grande) return
    for (const tr of trechosPresos(el.estados, s, passos, vh)) {
      for (let k = tr.ini; k <= tr.fim; k++) presoEm[i].add(k)
      presos.push({ i, ...tr })
    }
  })
  // Fica com o trecho mais longo de cada cadeia (seção e invólucro presos juntos contam uma vez).
  const presosCadeia = presos.filter((p) => elementos[p.i].cadeia || p.i === 0)
  const presosSoltos = presos.filter((p) => !(elementos[p.i].cadeia || p.i === 0))
  if (presosCadeia.length) {
    const maior = presosCadeia.reduce((a, b) => (s[b.fim] - s[b.ini] > s[a.fim] - s[a.ini] ? b : a))
    add('presa', { elemento: elementos[maior.i].desc, inicioTelas: telas(s[maior.ini]), fimTelas: telas(s[maior.fim]), duracaoTelas: telas(s[maior.fim] - s[maior.ini]) })
  }
  const soltosPorEl = new Map()
  for (const p of presosSoltos) if (!soltosPorEl.has(p.i) || s[p.fim] - s[p.ini] > s[soltosPorEl.get(p.i).fim] - s[soltosPorEl.get(p.i).ini]) soltosPorEl.set(p.i, p)
  const soltos = [...soltosPorEl.values()]
  // Pilha: dois ou mais cartões que grudam um depois do outro.
  const inicios = new Set(soltos.map((p) => Math.round(s[p.ini] / (vh * 0.2))))
  if (soltos.length >= 2 && inicios.size >= 2) {
    add('pilha', { elementos: soltos.length, inicioTelas: telas(Math.min(...soltos.map((p) => s[p.ini]))), fimTelas: telas(Math.max(...soltos.map((p) => s[p.fim]))) })
  } else if (soltos.length && !presosCadeia.length) {
    const p = soltos.reduce((a, b) => (s[b.fim] - s[b.ini] > s[a.fim] - s[a.ini] ? b : a))
    add('presa', { elemento: elementos[p.i].desc, inicioTelas: telas(s[p.ini]), fimTelas: telas(s[p.fim]), duracaoTelas: telas(s[p.fim] - s[p.ini]) })
  }

  // 2) Trajetória de cada elemento em relação ao bloco pai (ou à página, para a própria seção).
  const lateral = [], paralaxe = [], zoom = [], mascara = [], entrada = [], tres = [], marquee = []
  const sobePreso = []
  elementos.forEach((el, i) => {
    const pai = el.pai >= 0 ? elementos[el.pai] : null
    // ksT: todos os passos em que aparece; ksP: sem os passos em que ele mesmo está preso (posição).
    const ksT = []
    for (let k = 0; k < n; k++) {
      if (!visivel(el.estados[k], vw, vh) || !raizVisivel(k)) continue
      if (pai && !pai.estados[k]) continue
      ksT.push(k)
    }
    if (ksT.length < 3) return
    const ksP = ksT.filter((k) => !presoEm[i].has(k))
    const quandoEm = (ks) => (fn) => {
      // primeiro e último passo em que a grandeza muda
      let a = null, b = null
      for (let j = 1; j < ks.length; j++) if (fn(j)) { if (a === null) a = j - 1; b = j }
      return a === null ? {} : { inicioTelas: telas(s[ks[a]]), fimTelas: telas(s[ks[b]]) }
    }
    const E = ksT.map((k) => el.estados[k])
    const quando = quandoEm(ksT)

    // Andar sozinho, sem rolar: faixa corrida (marquee).
    const derivas = (dados.deriva || []).filter(Boolean).map((d) => Math.abs(d[i] || 0))
    if (derivas.filter((d) => d >= 2).length >= 2 && Math.max(...E.map((e) => e.w)) >= vw * 0.5) {
      marquee.push({ elemento: el.desc, pxPorSegundo: Math.round(Math.max(...derivas) * 4) }); return
    }

    // 3D por CSS: rotação em X/Y que muda com a rolagem.
    const r3 = E.map((e) => e.r3 || 0)
    if (Math.max(...r3) >= 0.08 && Math.max(...r3) - Math.min(...r3) >= 0.05) tres.push({ elemento: el.desc, origem: 'css' })

    // Escala / tamanho.
    const areas = E.map((e) => e.w * e.h)
    const escalas = E.map((e) => Math.max(e.sx || 1, e.sy || 1))
    const fa = Math.max(...areas) / Math.max(1, Math.min(...areas))
    const eixos = E.map((e) => Math.min(e.sx ?? 1, e.sy ?? 1))
    const cortina = !el.midia && !el.texto && Math.max(...eixos) - Math.min(...eixos) >= 0.5 &&
      E.some((e) => Math.abs((e.sx ?? 1) - (e.sy ?? 1)) >= 0.3)
    const mudaArea = (j) => Math.abs(areas[j] - areas[j - 1]) / Math.max(1, areas[j - 1]) > 0.01
    if (cortina) {
      mascara.push({ elemento: el.desc, como: 'cortina (escala em um eixo)', ...quando((j) => Math.abs(eixos[j] - eixos[j - 1]) > 0.02) })
    } else if (fa >= 1.2) {
      const mudouEscala = Math.max(...escalas) - Math.min(...escalas) >= 0.08
      if (el.midia || mudouEscala) zoom.push({ elemento: el.desc, fatorArea: r2(fa), sentido: areas[areas.length - 1] >= areas[0] ? 'aproxima' : 'afasta', ...quando(mudaArea) })
      else if (el.ov) mascara.push({ elemento: el.desc, como: 'caixa com overflow que cresce', fatorArea: r2(fa), ...quando(mudaArea) })
    }

    // Recorte (clip-path) que muda.
    const clips = E.map((e) => e.c || '')
    const nums = clips.map(numeros)
    let variacao = 0
    for (let j = 1; j < nums.length; j++) {
      const a = nums[j - 1], b = nums[j]
      if (clips[j] !== clips[j - 1] && (!a.length || !b.length)) variacao += 20
      else for (let q = 0; q < Math.min(a.length, b.length); q++) variacao += Math.abs(a[q] - b[q])
    }
    if (variacao >= 8) mascara.push({ elemento: el.desc, como: 'clip-path', ...quando((j) => clips[j] !== clips[j - 1]) })

    // Opacidade: acende (entra) ou apaga (sai) com a rolagem.
    const ops = E.map((e) => e.o)
    const acendeu = Math.min(...ops) <= 0.3 && Math.max(...ops) >= 0.8 && ops.indexOf(Math.min(...ops)) < ops.lastIndexOf(Math.max(...ops))
    const apagou = !acendeu && ops[0] >= 0.8 && Math.min(...ops) <= 0.3
    const mudaOp = (j) => Math.abs(ops[j] - ops[j - 1]) > 0.02

    // Rolagem lateral: anda de lado acompanhando a rolagem (vale também enquanto está preso na vertical).
    if (i > 0) {
      const ST = ksT.map((k) => s[k])
      const relX = ksT.map((k, j) => (pai ? E[j].l - pai.estados[k].l : E[j].l))
      const dX = Math.max(...relX) - Math.min(...relX)
      const fx = regressao(ST, relX)
      if (dX >= vw * 0.3 && fx.r2 >= 0.8 && ST[ST.length - 1] - ST[0] >= vh * 0.4) {
        lateral.push({ elemento: el.desc, deslocamentoTelas: r2(dX / vw), pxPorPxRolado: r2(Math.abs(fx.p)), ...quando((j) => Math.abs(relX[j] - relX[j - 1]) > 2) }); return
      }
    }

    // A própria seção mudar de lugar na página é ajuste de layout (imagem que carregou), não animação.
    if (i === 0) {
      if (apagou) entrada.push({ elemento: el.desc, como: 'some (opacidade)', ...quando(mudaOp) })
      return
    }

    // Camada que sobe (ou desce) por cima de um bloco preso: mede só enquanto o pai está preso.
    const ksPai = pai ? ksP.filter((k) => presoEm[el.pai].has(k)) : []
    if (ksPai.length >= 3 && !el.texto) {
      const relPai = ksPai.map((k) => el.estados[k].t - pai.estados[k].t)
      const d = Math.max(...relPai) - Math.min(...relPai)
      if (d >= vh * 0.3) {
        const j0 = relPai.findIndex((v, j) => j > 0 && Math.abs(v - relPai[j - 1]) > 2)
        const fp = regressao(ksPai.map((k) => s[k]), relPai)
        sobePreso.push({ elemento: el.desc, sentido: relPai[relPai.length - 1] < relPai[0] ? 'sobe' : 'desce', deslocamentoTelas: r2(d / vh),
          pxPorPxRolado: r2(Math.abs(fp.p)), S0: s[ksPai[Math.max(0, j0 - 1)]], ...quandoEm(ksPai)((j) => Math.abs(relPai[j] - relPai[j - 1]) > 2) })
        return
      }
    }

    // Posição relativa ao pai (ou à página).
    if (ksP.length < 3) {
      if (acendeu || apagou) entrada.push({ elemento: el.desc, como: acendeu ? 'aparece (opacidade)' : 'some (opacidade)', ...quando(mudaOp) })
      return
    }
    const S = ksP.map((k) => s[k])
    const span = S[S.length - 1] - S[0]
    const EP = ksP.map((k) => el.estados[k])
    const rel = ksP.map((k, j) => (pai ? EP[j].t - pai.estados[k].t : EP[j].t + s[k]))
    const quandoP = quandoEm(ksP)

    const dRel = Math.max(...rel) - Math.min(...rel)
    const f = regressao(S, rel)
    const mudancas = rel.slice(1).filter((v, j) => Math.abs(v - rel[j]) > 0.5).length
    const continuo = mudancas >= (rel.length - 1) * 0.6
    if (dRel >= Math.max(12, vh * 0.03) && Math.abs(f.p) >= 0.04 && f.r2 >= 0.85 && continuo && span >= vh * 0.5 && !acendeu && !apagou) {
      paralaxe.push({ elemento: el.desc, fator: r2(1 - f.p), deslocamentoPx: Math.round(dRel), ...quandoP((j) => Math.abs(rel[j] - rel[j - 1]) > 0.5) })
    } else if (acendeu || apagou || dRel >= 20) {
      const como = acendeu ? (dRel >= 20 ? 'aparece subindo' : 'aparece (opacidade)') : apagou ? 'some (opacidade)' : 'desliza'
      entrada.push({ elemento: el.desc, como, ...(acendeu || apagou ? quando(mudaOp) : quandoP((j) => Math.abs(rel[j] - rel[j - 1]) > 1)) })
    }
  })
  // Camadas sobre bloco preso: em escada viram pilha; juntas, uma camada que passa por cima da cena.
  if (sobePreso.length) {
    const escada = new Set(sobePreso.map((p) => Math.round(p.S0 / (vh * 0.2)))).size >= 2
    const limpar = ({ S0, ...x }) => x
    if (sobePreso.length >= 2 && escada && !det.some((d) => d.tipo === 'pilha')) {
      add('pilha', { elementos: sobePreso.length, como: 'cartões entram um depois do outro por cima do bloco preso', exemplos: sobePreso.slice(0, 3).map(limpar) })
    } else {
      paralaxe.unshift(...sobePreso.map((p) => ({ ...limpar(p), como: `${p.sentido} por cima do bloco preso` })))
    }
  }
  const resumir = (tipo, lista, max = 3) => { if (lista.length) add(tipo, { quantos: lista.length, exemplos: lista.slice(0, max) }) }
  resumir('rolagem-lateral', lateral)
  resumir('paralaxe', paralaxe)
  resumir('zoom', zoom)
  resumir('revelacao-mascara', mascara)
  resumir('marquee', marquee)
  resumir('3d', tres)

  // 3) Texto partido em letras / linhas que se move.
  const tx = (dados.texto || []).filter((t, k) => t && raizVisivel(k))
  if (tx.length >= 2) {
    const varia = (cont, soma) => Math.max(...tx.map((t) => t[cont])) >= 4 && Math.max(...tx.map((t) => t[soma])) - Math.min(...tx.map((t) => t[soma])) >= 20
    if (varia('nl', 'sl')) add('texto-letra', { fragmentos: Math.max(...tx.map((t) => t.nl)) })
    if (varia('nw', 'sw')) add('texto-linha', { fragmentos: Math.max(...tx.map((t) => t.nw)) })
  }

  // 4) Peças fixas: canvas WebGL e vídeo grandes.
  const est = dados.estatico || {}
  const area = vw * vh
  const gl = (est.canvas || []).filter((c) => c.webgl && c.area >= area * 0.25)
  if (gl.length && !det.some((d) => d.tipo === '3d')) {
    const exemplos = gl.slice(0, 2).map((c) => ({ origem: 'canvas WebGL', telaOcupada: r2(c.area / area), ...(c.interativo ? { interativo: true } : {}) }))
    // 3D só com biblioteca 3D à vista (Three.js, Babylon...) ou canvas que responde ao mouse; senão é fundo animado.
    if (dados.lib3d || gl.some((c) => c.interativo)) add('3d', { quantos: gl.length, exemplos, ...(dados.lib3d ? { biblioteca: dados.lib3d } : {}) })
    else add('fundo-animado', { quantos: gl.length, como: 'canvas WebGL sem biblioteca 3D e sem interação (shader de fundo)', exemplos })
  }
  const vids = (est.videos || []).filter((v) => v.area >= area * 0.25)
  if (vids.length) add('video', { quantos: vids.length, exemplos: vids.slice(0, 2).map((v) => ({ telaOcupada: r2(v.area / area), automatico: !!v.auto })) })

  // 5) Troca de cor do fundo enquanto esta seção está no centro da tela.
  const cores = new Set()
  for (let k = 0; k < n; k++) if (dados.secaoNoCentro?.[k] && dados.corPagina?.[k]) cores.add(dados.corPagina[k])
  const coresProprias = new Set((raiz?.estados || []).map((e) => e?.bg).filter(Boolean))
  if (cores.size >= 2 || coresProprias.size >= 2) add('troca-de-cor', { cores: [...new Set([...cores, ...coresProprias])].slice(0, 4) })

  const variados = [...new Map(entrada.map((e) => [e.como, e])).values()]
  if (entrada.length) add('entrada-simples', { quantos: entrada.length, exemplos: variados.slice(0, 4) })

  const tipos = [...new Set(det.map((d) => d.tipo))].filter((t) => TIPOS.includes(t))
  if (!tipos.length) tipos.push('nenhum')
  return { tipos, detalhes: det, forca: forcaMovimento(det) }
}

export function forcaMovimento(detalhes) {
  let f = 0
  for (const d of detalhes) {
    f += PESO[d.tipo] || 0
    if (d.tipo === 'presa') f += Math.min(3, d.duracaoTelas || 0)
    if (d.quantos > 1) f += Math.min(1, (d.quantos - 1) * 0.1)
  }
  return r2(f)
}

// ---------------------------------------------------------------------------------------------------------
// Regras de leitura (funções puras; as marcadas "vai à página" rodam também dentro do navegador e por isso não
// podem usar nada de fora delas)
// ---------------------------------------------------------------------------------------------------------

// Cor CSS -> [r, g, b, alfa]. rgb()/rgba() direto; o resto (oklch, color(), hsl...) pelo canvas. Vai à página.
export function corParaRgba(c) {
  if (!c) return null
  const s = String(c).trim()
  if (s === 'transparent') return [0, 0, 0, 0]
  const m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])]
  const h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (h) { const x = h[1].length === 3 ? h[1].replace(/./g, '$&$&') : h[1]; return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)).concat(1) }
  if (typeof document === 'undefined' || /^(none|url|currentcolor|inherit)/i.test(s)) return null
  const cache = globalThis.__raioxCores || (globalThis.__raioxCores = new Map())
  if (cache.has(s)) return cache.get(s)
  let v = null
  try {
    const cv = globalThis.__raioxCanvas || (globalThis.__raioxCanvas = document.createElement('canvas'))
    cv.width = cv.height = 1
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = 'rgba(1, 2, 3, 0.004)'
    const marca = ctx.fillStyle
    ctx.fillStyle = s
    if (ctx.fillStyle !== marca) { ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; v = [d[0], d[1], d[2], d[3] / 255] }
  } catch {}
  cache.set(s, v)
  return v
}

// Razão de contraste (WCAG) entre duas cores [r, g, b]. Arredonda em 2 casas, para exibir; com exato = true devolve
// a razão sem arredondar, que é a que se compara com o mínimo (4,495 não é 4,5). Vai à página.
export function contraste(a, b, exato = false) {
  const lum = (c) => {
    const [r, g, bb] = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bb
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  const razao = (x + 0.05) / (y + 0.05)
  return exato ? razao : Math.round(razao * 100) / 100
}

// Mínimo de contraste da acessibilidade (WCAG AA): texto comum e texto grande (24px, ou 18,66px em negrito).
export const CONTRASTE_MINIMO = { normal: 4.5, grande: 3 }

// Mediana de uma lista de números (quantidade par: o meio dos dois do centro); null se vazia. Vai à página.
export function mediana(lista) {
  const o = [...(lista || [])].sort((a, b) => a - b), m = o.length >> 1
  return !o.length ? null : o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2
}

// Resumo do contraste dos textos de uma seção. Vai à página.
// itens = [{ t, px, peso, chars, cor, fundo, razao, titulo }], com px e razao SEM arredondar: "texto grande" e
// "abaixo do mínimo" são decididos com o valor exato (23,6px não é 24px; 4,495 não é 4,5) e só a exibição arredonda.
// razao null = fundo desconhecido (imagem, degradê).
// Devolve { titulo, texto (típico: mediana pesada pelas letras, sem o título), minimo, pior, medidos, semMedida } ou null.
export function resumoContraste(itens) {
  if (!itens || !itens.length) return null
  const med = itens.filter((x) => typeof x.razao === 'number')
  const semMedida = itens.length - med.length
  if (!med.length) return { titulo: null, texto: null, minimo: null, pior: null, medidos: 0, semMedida }
  const grande = (x) => x.px >= 24 || (x.px >= 18.66 && (Number(x.peso) || (x.peso === 'bold' ? 700 : 400)) >= 700)
  const piso = (x) => (grande(x) ? 3 : 4.5)
  // Só para exibir: 2 casas, sem o arredondamento atravessar o limite (4,495 abaixo de 4,5 aparece 4,49, não 4,5).
  const casas2 = (v) => Math.round(v * 100) / 100
  const exibir = (v, limite) => (v < limite && casas2(v) >= limite ? Math.floor(v * 100) / 100 : casas2(v))
  const tit = med.find((x) => x.titulo)
  const resto = med.filter((x) => !x.titulo).sort((a, b) => a.razao - b.razao)
  let texto = null
  const total = resto.reduce((a, x) => a + (x.chars || 1), 0)
  let ac = 0
  for (let k = 0; k < resto.length; k++) {
    ac += resto[k].chars || 1
    if (ac < total / 2) continue
    // Metade exata das letras cai entre dois textos: a mediana é o meio dos dois.
    texto = ac === total / 2 && resto[k + 1] ? casas2((resto[k].razao + resto[k + 1].razao) / 2) : exibir(resto[k].razao, piso(resto[k]))
    break
  }
  const p = [...med].sort((a, b) => a.razao / piso(a) - b.razao / piso(b))[0]
  return {
    titulo: tit ? exibir(tit.razao, piso(tit)) : null, texto, minimo: casas2(Math.min(...med.map((x) => x.razao))),
    pior: { texto: String(p.t || '').slice(0, 40), px: exibir(p.px, p.px < 18.66 ? 18.66 : 24), cor: p.cor || null, fundo: p.fundo || null,
      razao: exibir(p.razao, piso(p)), grande: grande(p), minimo: piso(p), abaixo: p.razao < piso(p) },
    medidos: med.length, semMedida,
  }
}

// "0.3s, 200ms" -> [300, 200]
export function temposParaMs(texto) {
  return String(texto || '').split(',').map((t) => { const n = parseFloat(t); return Number.isFinite(n) ? Math.round(/ms\s*$/.test(t) ? n : n * 1000) : 0 })
}

// Propriedade de transição que só troca cor/sombra (resposta ao mouse), não desloca nada.
const SO_INTERFACE = /(^|-)color$|^(box-shadow|text-shadow|text-decoration|outline|fill|stroke|background|border)(-|$)/

// Ritmo de uma seção. css = [{ tipo: 'transicao'|'animacao', duracaoMs, curva, propriedade | nome, infinita, quantos }]
// (estilo computado e @keyframes); est = saída de ritmoEstimado, usada só quando o CSS não diz nada.
// Preferência: transição de movimento e animação que toca uma vez; depois transição de cor; depois animação em laço.
// Devolve { duracaoMs, curva, ritmo: { origem, quantos, outras } } (tudo null quando não há o que medir).
export function ritmoDaSecao(css = [], est = null) {
  const validos = (css || []).filter((x) => x && x.duracaoMs > 0)
  const nivel = (x) => (x.tipo === 'animacao' ? (x.infinita ? 2 : 0) : SO_INTERFACE.test(x.propriedade || '') ? 1 : 0)
  const grupos = new Map()
  for (const x of validos) {
    const origem = x.tipo === 'animacao' ? 'css-animacao' : 'css-transicao'
    const k = [nivel(x), origem, x.duracaoMs, x.curva || ''].join('|')
    const g = grupos.get(k) || { nivel: nivel(x), origem, duracaoMs: x.duracaoMs, curva: x.curva || null, quantos: 0 }
    g.quantos += x.quantos || 1
    grupos.set(k, g)
  }
  const ordem = [...grupos.values()].sort((a, b) => a.nivel - b.nivel || b.quantos - a.quantos || b.duracaoMs - a.duracaoMs)
  const limpo = ({ nivel: _n, ...g }) => g
  if (ordem.length) {
    const [p, ...resto] = ordem
    return { duracaoMs: p.duracaoMs, curva: p.curva, ritmo: { origem: p.origem, quantos: p.quantos, ...(p.nivel === 1 ? { soCor: true } : {}), ...(p.nivel === 2 ? { emLaco: true } : {}), outras: resto.slice(0, 3).map(limpo) } }
  }
  if (est && (est.duracaoMs || est.curva)) {
    const { duracaoMs = null, curva = null, ...mais } = est
    return { duracaoMs, curva, ritmo: { origem: 'estimada', ...mais, outras: [] } }
  }
  return { duracaoMs: null, curva: null, ritmo: null }
}

// Forma do avanço de uma medida (ys) ao longo da rolagem (xs), no trecho em que ela muda:
// 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out', ou null (menos de 5 pontos, ou nenhuma das formas serve).
export function curvaDaTrajetoria(xs, ys) {
  let a = 0, b = ys.length - 1
  const eps = (Math.max(...ys) - Math.min(...ys)) * 0.005
  while (a < b && Math.abs(ys[a + 1] - ys[a]) <= eps) a++
  while (b > a && Math.abs(ys[b - 1] - ys[b]) <= eps) b--
  const dx = xs[b] - xs[a], dy = ys[b] - ys[a]
  if (b - a < 4 || !dx || !dy) return null
  const formas = { linear: (u) => u, 'ease-in': (u) => u * u, 'ease-out': (u) => 1 - (1 - u) ** 2, 'ease-in-out': (u) => u * u * (3 - 2 * u) }
  const erro = {}
  for (const [nome, f] of Object.entries(formas)) {
    let e = 0
    for (let k = a; k <= b; k++) e += (f((xs[k] - xs[a]) / dx) - (ys[k] - ys[a]) / dy) ** 2
    erro[nome] = e / (b - a + 1)
  }
  const [melhor, menor] = Object.entries(erro).sort((p, q) => p[1] - q[1])[0]
  if (menor > 0.01) return null
  return erro.linear <= menor + 0.0005 ? 'linear' : melhor
}

// Ritmo estimado de uma cena feita por biblioteca (GSAP e afins não aparecem no CSS), só com o que já foi amostrado:
//   assentos = tempo (ms) que a tela levou para parar depois de cada passo de rolagem com a seção no centro;
//   elementos/s = trajetórias da seção (as de classificarSecao). A curva sai da medida que mais muda entre
//   deslocamento lateral, escala e opacidade (o deslocamento vertical é a própria rolagem e não entra).
// Devolve { duracaoMs, curva, assentos, noTeto?, ligadaARolagem?, medida? } ou null.
export function ritmoEstimado({ assentos = [], elementos = [], s = [], vw = 1440, tetoMs = 1200 } = {}) {
  const longos = assentos.filter((ms) => ms >= 100).sort((a, b) => a - b)
  const duracaoMs = longos.length ? Math.round(mediana(longos) / 50) * 50 : null
  let melhor = null
  for (const el of elementos) {
    const ks = []
    el.estados.forEach((e, k) => { if (e) ks.push(k) })
    if (ks.length < 5) continue
    const medidas = { 'deslocamento lateral': [(e) => e.l, vw, 0.1], escala: [(e) => Math.max(e.sx || 1, e.sy || 1), 1, 0.08], opacidade: [(e) => e.o ?? 1, 1, 0.5] }
    for (const [nome, [ler, base, minimo]] of Object.entries(medidas)) {
      const ys = ks.map((k) => ler(el.estados[k]))
      const faixa = (Math.max(...ys) - Math.min(...ys)) / base
      if (faixa >= minimo && (!melhor || faixa > melhor.faixa)) melhor = { faixa, nome, xs: ks.map((k) => s[k]), ys }
    }
  }
  const curva = melhor ? curvaDaTrajetoria(melhor.xs, melhor.ys) : null
  if (!duracaoMs && !curva) return null
  return { duracaoMs, curva, assentos: longos.length, ...(duracaoMs && duracaoMs >= tetoMs - 50 ? { noTeto: true } : {}), ...(curva ? { ligadaARolagem: true, medida: melhor.nome } : {}) }
}

// referencia/medidas.css: variáveis prontas para a construção, tiradas só do raio-x (nenhum número digitado).
// Só proporção, espaço e ritmo. Cores e fontes da referência NÃO entram: são as do cliente.
export function gerarMedidasCss(rx) {
  const n = (v) => String(Math.round(v * 100) / 100)
  const tem = (v) => typeof v === 'number' && Number.isFinite(v)
  const moda = (lista) => { const m = new Map(); for (const v of lista) m.set(v, (m.get(v) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1])[0]?.[0] }
  const L = [
    `/* Medidas da referência, tiradas pelo raio-x (tela de ${rx.viewport?.largura}×${rx.viewport?.altura}px). Arquivo gerado: não editar à mão;`,
    '   para mudar, rodar o raio-x de novo. Só proporção, espaço e ritmo: cores e fontes são as do cliente. */',
    ':root {',
    '  /* Escala de fontes, em razão sobre o texto corrido. Uso: font-size: calc(var(--ref-escala-1) * 1rem) */',
  ]
  const escala = [...(rx.pagina?.escala || [])].filter((e) => tem(e.razao)).sort((a, b) => b.razao - a.razao)
  escala.forEach((e, i) => L.push(`  --ref-escala-${i + 1}: ${n(e.razao)};`))
  const corpoSec = (rx.secoes || []).filter((x) => x.papel !== 'cabeçalho')
  const raio = moda(corpoSec.map((x) => x.raioPx).filter(tem))
  const conteudo = moda(corpoSec.map((x) => x.grade?.conteudoVw).filter(tem))
  L.push('', '  /* Página: canto e largura do conteúdo mais comuns */')
  if (tem(raio)) L.push(`  --ref-raio: ${n(raio)}px;`)
  if (tem(conteudo)) L.push(`  --ref-conteudo: ${n(conteudo)}vw;`)
  for (const sec of rx.secoes || []) {
    const p = `  --ref-s${sec.indice + 1}-`
    const mov = (rx.movimento || []).find((m) => m.secao === sec.indice)
    L.push('', `  /* Seção ${sec.indice + 1}${sec.papel ? ` (${sec.papel})` : ''} */`)
    if (tem(sec.alturaTelas)) L.push(`${p}altura: ${n(sec.alturaTelas * 100)}vh;`)
    if (tem(sec.titulo?.razao)) L.push(`${p}titulo: ${n(sec.titulo.razao)};`)
    if (tem(sec.respiro?.topoTelas)) L.push(`${p}respiro-topo: ${n(sec.respiro.topoTelas * 100)}vh;`)
    if (tem(sec.respiro?.baseTelas)) L.push(`${p}respiro-base: ${n(sec.respiro.baseTelas * 100)}vh;`)
    if (tem(sec.colunas)) L.push(`${p}colunas: ${n(sec.colunas)};`)
    if (tem(sec.grade?.conteudoVw)) L.push(`${p}conteudo: ${n(sec.grade.conteudoVw)}vw;`)
    if (tem(sec.grade?.colunaVw)) L.push(`${p}coluna: ${n(sec.grade.colunaVw)}vw;`)
    if (tem(sec.grade?.vaoVw)) L.push(`${p}vao: ${n(sec.grade.vaoVw)}vw;`)
    if (tem(sec.raioPx)) L.push(`${p}raio: ${n(sec.raioPx)}px;`)
    if (tem(mov?.duracaoMs)) L.push(`${p}duracao: ${n(mov.duracaoMs)}ms;`)
    if (mov?.curva && /^[a-z-]+(\([-\d.,\s a-z]*\))?$/i.test(mov.curva)) L.push(`${p}curva: ${mov.curva};`)
  }
  L.push('}', '')
  return L.join('\n')
}

// Texto que enfeita (marca d'água, cota de planta, letreiro gigante apagado) não é título nem degrau da escala.
// x = { svg, ariaHidden, semCursor, opacidade, palavras, px, contraste }. Devolve o motivo ou null. Vai à página.
export function motivoDecorativo(x, corpoPx = 16) {
  if (x.svg) return 'texto dentro de SVG (desenho)'
  if (x.ariaHidden) return 'aria-hidden (escondido do leitor de tela)'
  const op = x.opacidade ?? 1
  if (x.semCursor && op < 0.35) return 'pointer-events: none e opacidade baixa'
  const apagado = op < 0.5 || (x.contraste !== null && x.contraste !== undefined && x.contraste < 1.6)
  if ((x.palavras ?? 99) <= 2 && x.px >= corpoPx * 10 && apagado) return 'texto gigante apagado (marca d\'água)'
  return null
}

// Aviso de cookies/consentimento preso na tela. Quem chama já conferiu que é fixed/sticky e aparece na tela.
// x = { idClasse, texto, altura, largura, vw, vh, sombra (tem shadow DOM) }. Vai à página.
export function pareceAvisoCookies(x) {
  const porId = /cookie|consent|cky-|onetrust|didomi|iubenda|cmplz|gdpr|lgpd|cc-window|cc-banner|cybot|usercentrics|termly|osano|klaro|qc-cmp|truste|cookiefirst|axeptio|tarteaucitron|borlabs/i.test(x.idClasse || '')
  const texto = String(x.texto || '')
  const porTexto = /cookie|consent|lgpd|gdpr/i.test(texto)
  if (!porId && !porTexto) return false
  if (porId && x.sombra) return true
  // Camada do tamanho da tela com muito texto é a própria página (rolagem suave presa), mesmo citando "Cookie policy".
  const telaToda = x.altura > x.vh * 0.75 && x.largura > x.vw * 0.9
  if (porId) return !telaToda || texto.length <= 1500
  return !telaToda && texto.length <= 1500
}

// Degraus da escala com parte desprezível do texto (< 0,5%) são ruído; o tamanho de um título de seção fica sempre.
export function limparEscala(escala, pxTitulos = [], minimo = 0.005) {
  const titulos = new Set(pxTitulos)
  return (escala || []).filter((e) => (e.parte ?? 1) >= minimo || titulos.has(e.px))
}

// Papel da seção por regras simples, na ordem; quando nenhuma serve, null.
export function papelDaSecao(f) {
  if (f.cabecalho) return 'cabeçalho'
  if (f.rodape) return 'rodapé'
  if (f.primeiraDoCorpo && (f.topoTelas ?? 0) < 0.5 && (f.alturaTelas ?? 0) >= 0.6) return 'abertura'
  if (f.formulario || (f.campos || 0) >= 2 || ((f.contatos || 0) >= 2 && (f.palavras || 0) <= 150)) return 'contato'
  if ((f.citacoes || 0) >= 1 || /depoimento|testimonial|o que (dizem|falam)|clientes dizem|what (our )?clients say|reviews?\b|avalia[çc]/i.test(f.tituloTexto || '')) return 'depoimentos'
  if ((f.imagens || 0) >= 4 && (f.imagemTexto ?? 0) >= 0.6) return 'galeria'
  if ((f.itensRepetidos || 0) >= 3 && (f.colunas || 1) >= 2) return 'lista de serviços'
  if (!f.imagens && !f.videos && !f.canvas && !f.fundoImagem && (f.palavras || 0) >= 8 && (f.alturaTelas ?? 9) <= 1.2) return 'faixa de texto'
  return null
}

// PNG (8 bits, sem entrelaçamento, como o Chrome devolve) -> pixels, para amostrar a cor das imagens no print.
export function decodificarPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG')
  let p = 8, largura = 0, altura = 0, prof = 0, tipo = 0, entrelacado = 0
  const partes = []
  while (p + 8 <= buf.length) {
    const tam = buf.readUInt32BE(p), nome = buf.toString('latin1', p + 4, p + 8)
    const dados = buf.subarray(p + 8, p + 8 + tam)
    if (nome === 'IHDR') { largura = dados.readUInt32BE(0); altura = dados.readUInt32BE(4); prof = dados[8]; tipo = dados[9]; entrelacado = dados[12] }
    else if (nome === 'IDAT') partes.push(dados)
    else if (nome === 'IEND') break
    p += 12 + tam
  }
  const canais = { 0: 1, 2: 3, 4: 2, 6: 4 }[tipo]
  if (prof !== 8 || !canais || entrelacado) throw new Error('PNG fora do formato esperado (8 bits, sem entrelaçamento)')
  const bruto = zlib.inflateSync(Buffer.concat(partes))
  const linha = largura * canais
  const px = Buffer.alloc(linha * altura)
  for (let y = 0; y < altura; y++) {
    const f = bruto[y * (linha + 1)], ini = y * (linha + 1) + 1, base = y * linha
    for (let x = 0; x < linha; x++) {
      const v = bruto[ini + x]
      const a = x >= canais ? px[base + x - canais] : 0
      const b = y ? px[base - linha + x] : 0
      const c = x >= canais && y ? px[base - linha + x - canais] : 0
      let r
      if (f === 0) r = v
      else if (f === 1) r = v + a
      else if (f === 2) r = v + b
      else if (f === 3) r = v + ((a + b) >> 1)
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) }
      else throw new Error('filtro PNG desconhecido: ' + f)
      px[base + x] = r & 255
    }
  }
  return { largura, altura, canais, px }
}

// Cor média (hex) de um retângulo { x, y, w, h } da imagem decodificada; amostra ~4000 pontos.
export function corMediaRegiao(img, r) {
  const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y))
  const x1 = Math.min(img.largura, Math.ceil(r.x + r.w)), y1 = Math.min(img.altura, Math.ceil(r.y + r.h))
  if (x1 <= x0 || y1 <= y0) return null
  const passo = Math.max(1, Math.round(Math.sqrt((x1 - x0) * (y1 - y0) / 4000)))
  const soma = [0, 0, 0]
  let n = 0
  const cinza = img.canais < 3
  for (let y = y0; y < y1; y += passo) for (let x = x0; x < x1; x += passo) {
    const i = (y * img.largura + x) * img.canais
    soma[0] += img.px[i]; soma[1] += img.px[cinza ? i : i + 1]; soma[2] += img.px[cinza ? i : i + 2]; n++
  }
  return '#' + soma.map((s) => Math.round(s / n).toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------------------------------------
// Roteiro e custo (funções puras, a partir do JSON)
// ---------------------------------------------------------------------------------------------------------
const fmt = (n) => String(r2(n)).replace('.', ',')
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

function descreverMovimento(d) {
  const quando = d.inicioTelas !== undefined ? ` (entre ${fmt(d.inicioTelas)} e ${fmt(d.fimTelas)} telas de rolagem)` : ''
  const ex = d.exemplos?.[0] || {}
  const quandoEx = ex.inicioTelas !== undefined ? ` (entre ${fmt(ex.inicioTelas)} e ${fmt(ex.fimTelas)} telas de rolagem)` : ''
  switch (d.tipo) {
    case 'presa': return `fica **presa** na tela por ${fmt(d.duracaoTelas)} telas de rolagem${quando}: o conteúdo muda enquanto ela segura a tela`
    case 'paralaxe': return ex.como
      ? `**camada sobre bloco preso**: ${plural(d.quantos, 'elemento', 'elementos')} (${ex.elemento}...) ${d.quantos > 1 ? ex.como.replace(/^(sobe|desce)/, '$1m') : ex.como}, andando ${fmt(ex.deslocamentoTelas)} tela${quandoEx}`
      : `**paralaxe** em ${plural(d.quantos, 'elemento', 'elementos')}: ${ex.elemento} anda a ${fmt(ex.fator)}× a velocidade da rolagem${quandoEx}`
    case 'pilha': return `**pilha**: ${d.elementos} cartões entram um sobre o outro${d.como ? ` (${d.como})` : ''}${quando}`
    case 'rolagem-lateral': return `**rolagem lateral**: ${ex.elemento} anda ${fmt(ex.deslocamentoTelas)} larguras de tela para o lado enquanto se rola para baixo${quandoEx}`
    case 'zoom': return `**zoom** em ${ex.elemento}: a área muda ${fmt(ex.fatorArea)}×${quandoEx}`
    case 'revelacao-mascara': return `**revelação por máscara** (${ex.como}) em ${ex.elemento}${quandoEx}`
    case 'marquee': return `**faixa corrida** (anda sozinha, sem rolar) em ${ex.elemento}`
    case '3d': return `**3D** (${ex.origem}${d.biblioteca ? ` com ${d.biblioteca}` : ''}${ex.telaOcupada ? `, ocupa ${Math.round(ex.telaOcupada * 100)}% da tela` : ''})` +
      (ex.origem === 'canvas WebGL' && !d.biblioteca ? (ex.interativo ? ': responde ao mouse, sem biblioteca 3D conhecida; conferir no print' : ': pode ser cena 3D ou só fundo animado por shader; conferir no print') : '')
    case 'fundo-animado': return `**fundo animado** (canvas WebGL${ex.telaOcupada ? ` ocupando ${Math.round(ex.telaOcupada * 100)}% da tela` : ''}, sem biblioteca 3D e sem interação): shader de fundo, não é cena 3D`
    case 'video': return `**vídeo** ocupando ${Math.round((ex.telaOcupada || 0) * 100)}% da tela${ex.automatico ? ', toca sozinho' : ''}`
    case 'troca-de-cor': return `**troca a cor do fundo** (${d.cores.join(' → ')})`
    case 'texto-letra': return `**texto letra a letra** (${d.fragmentos} pedaços animados)`
    case 'texto-linha': return `**texto linha a linha** ou palavra a palavra (${d.fragmentos} pedaços animados)`
    case 'entrada-simples': {
      const comos = [...new Set((d.exemplos || []).map((e) => e.como))].join('; ')
      return `entrada simples em ${plural(d.quantos, 'elemento', 'elementos')} (${comos}${quandoEx})`
    }
    default: return d.tipo
  }
}

function descreverSecao(sec) {
  const partes = []
  if (sec.titulo?.texto) partes.push(`título "${sec.titulo.texto}" em ${fmt(sec.titulo.razao)}× o corpo`)
  partes.push(sec.colunas > 1 ? `${sec.colunas} colunas` : '1 coluna')
  if (sec.imagens) partes.push(plural(sec.imagens, 'imagem', 'imagens'))
  if (sec.videos) partes.push(plural(sec.videos, 'vídeo', 'vídeos'))
  if (sec.canvas) partes.push(plural(sec.canvas, 'canvas', 'canvas'))
  partes.push(`${sec.palavras} palavras`)
  if (sec.imagemTexto !== null && sec.imagemTexto !== undefined) partes.push(`imagem ocupa ${Math.round(sec.imagemTexto * 100)}% da área com conteúdo`)
  if (sec.decorativos?.length) partes.push(`enfeite fora da escala: ${sec.decorativos.slice(0, 2).map((x) => `"${x.texto}" (${x.motivo})`).join('; ')}`)
  return partes.join(', ')
}

export function gerarRoteiro(rx) {
  const L = []
  const v = rx.viewport
  L.push(`# Raio-x: ${rx.url}`, '')
  L.push(`Medido em ${rx.data.slice(0, 10)} numa tela de ${v.largura}×${v.altura}${v.celular ? ' (celular)' : ''}. ` +
    `A página tem ${fmt(rx.rolagem.alturaTelas)} telas de altura e ${plural(rx.secoes.length, 'seção', 'seções')}.`)
  const libs = [...(rx.bibliotecas?.globais || []), ...(rx.bibliotecas?.sinais || [])]
  L.push(libs.length ? `Bibliotecas percebidas: ${[...new Set(libs)].join(', ')}.` : 'Nenhuma biblioteca de animação conhecida apareceu (pode estar empacotada no código).')
  if (rx.pagina?.corpoPx) {
    const esc = (rx.pagina.escala || []).slice(0, 6).map((e) => `${fmt(e.razao)}×`).join(', ')
    L.push(`Texto corrido em ${rx.pagina.corpoPx}px (fonte ${rx.pagina.fontes?.[0]?.familia || '?'}); escala usada: ${esc}.`)
  }
  const comImagem = rx.secoes.filter((s) => s.fundoImagem).length
  if (comImagem >= rx.secoes.length / 2) L.push(`${comImagem} de ${rx.secoes.length} seções têm imagem, vídeo ou canvas cobrindo o fundo; texto mais comum ${rx.pagina?.corTexto}.`)
  else if (rx.pagina?.corFundo) L.push(`Fundo dominante ${rx.pagina.corFundo}, texto ${rx.pagina.corTexto}.`)
  const cena = rx.secoes[rx.cenaPrincipal]
  const movCena = rx.movimento.find((m) => m.secao === rx.cenaPrincipal)
  L.push('', `**Cena principal:** seção ${rx.cenaPrincipal + 1}${cena?.titulo?.texto ? ` ("${cena.titulo.texto}")` : ''} — ${movCena ? movCena.tipos.join(', ') : 'sem movimento'}.`, '')
  const ritmo = rx.secoes.map((s) => fmt(s.alturaTelas)).join(' · ')
  L.push(`Ritmo (altura de cada seção em telas): ${ritmo}`, '')
  for (const sec of rx.secoes) {
    const mov = rx.movimento.find((m) => m.secao === sec.indice)
    const marca = sec.indice === rx.cenaPrincipal ? ' ★ cena principal' : ''
    L.push(`## Seção ${sec.indice + 1}${sec.papel ? ` (${sec.papel})` : ''} — ${fmt(sec.alturaTelas)} telas, começa em ${fmt(sec.topoTelas)}${marca}`)
    L.push(`- **Aparece:** ${descreverSecao(sec)}.`)
    L.push(`- **Visual:** fundo ${sec.fundoImagem ? 'de imagem' : sec.corFundo}, texto ${sec.corTexto || '?'}, cantos ${sec.raioPx ? `arredondados (${sec.raioPx}px)` : 'retos'}` +
      `${sec.fontes?.length ? `; fontes ${[...new Set(sec.fontes.map((f) => f.familia))].slice(0, 2).join(' e ')}` : ''}` +
      `${sec.respiro ? `; respiro ${fmt(sec.respiro.topoTelas)} tela no alto e ${fmt(sec.respiro.baseTelas)} embaixo` : ''}` +
      `${sec.cores?.length ? `; cores ${sec.cores.map((c) => `${c.hex} (${c.papel})`).join(', ')}` : ''}.`)
    // "tipos" pode ser ['nenhum'] com fundo animado nos detalhes (fora do vocabulário): ele ainda é contado aqui.
    if (!mov || !mov.detalhes?.length) L.push('- **Move:** nada percebido; é uma seção parada.')
    else {
      const ordem = [...mov.detalhes].sort((a, b) => (PESO[b.tipo] || 0) - (PESO[a.tipo] || 0))
      L.push('- **Move:**')
      for (const d of ordem) L.push(`  - ${descreverMovimento(d)}`)
    }
    if (sec.print) L.push(`- Print: \`${sec.print}\``)
    L.push('')
  }
  if (rx.avisos?.length) L.push('## Avisos da medição', ...rx.avisos.map((a) => `- ${a}`), '')
  return L.join('\n')
}

const EQUIVALENTES = {
  '3d': 'foto do produto/ambiente recortada em 2 ou 3 camadas com paralaxe, ou sequência de fotos presa na rolagem (o visitante "gira" o objeto rolando)',
  video: 'foto grande com zoom lento na rolagem, ou vídeo curto gravado no celular (5 a 8 s, sem som, menos de 2 MB, com foto de capa)',
  canvas: 'degradê ou textura em CSS animada devagar, ou imagem com máscara que abre na rolagem',
  fotos: 'escolher as 4 a 6 melhores fotos reais; menos fotos, maiores, rendem mais que muitas fotos médias',
}

export function gerarCusto(rx) {
  const itens = []
  const area = rx.viewport.largura * rx.viewport.altura
  for (const m of rx.movimento) {
    const sec = rx.secoes[m.secao]
    const nome = `Seção ${m.secao + 1}${sec?.titulo?.texto ? ` ("${sec.titulo.texto}")` : ''}`
    for (const d of m.detalhes) {
      if (d.tipo === '3d') {
        // Sem Three.js à vista, canvas WebGL costuma ser fundo animado por shader, não modelo 3D.
        const tresJs = !!d.biblioteca || (rx.bibliotecas?.globais || []).some((g) => /three/i.test(g)) || (rx.bibliotecas?.scripts || []).some((g) => /three/i.test(g))
        const css = d.exemplos?.[0]?.origem === 'css'
        if (tresJs) itens.push(`- **${nome}:** cena 3D (${d.biblioteca || 'Three.js'}), com modelo de verdade. Pede modelo 3D próprio e muito processamento no celular. Equivalente: ${EQUIVALENTES['3d']}.`)
        else if (!css) itens.push(`- **${nome}:** canvas WebGL grande (provável fundo animado por shader; conferir no print). Pede código de shader e pesa no celular. Equivalente: ${EQUIVALENTES.canvas}.`)
      }
      if (d.tipo === 'fundo-animado') itens.push(`- **${nome}:** fundo animado por shader (canvas WebGL sem biblioteca 3D e sem interação). Não é cena 3D: não pede modelo, só código de shader, e pesa no celular. Equivalente: ${EQUIVALENTES.canvas}.`)
      if (d.tipo === 'video') itens.push(`- **${nome}:** vídeo grande de fundo. Pede filmagem profissional e pesa no celular. Equivalente: ${EQUIVALENTES.video}.`)
    }
    if (sec?.canvasDetalhe?.some((c) => !c.webgl && c.area >= area * 0.4)) itens.push(`- **${nome}:** canvas grande desenhado por código. Equivalente: ${EQUIVALENTES.canvas}.`)
    if (sec && sec.imagens >= 8) itens.push(`- **${nome}:** ${sec.imagens} imagens. Pede muitas fotos boas do mesmo padrão. Equivalente: ${EQUIVALENTES.fotos}.`)
  }
  const L = [`# Custo das cenas: ${rx.url}`, '']
  if (!itens.length) L.push('Nenhuma cena pede peça fora do alcance de um negócio local (3D, filmagem, canvas grande). Dá para seguir a referência com fotos reais e código.')
  else L.push('Cenas que pedem peça que um negócio local normalmente não tem, com um equivalente que guarda o efeito:', '', ...itens)
  const tipos = new Set(rx.movimento.flatMap((m) => m.detalhes.map((d) => d.tipo)))
  if (tipos.has('3d') || tipos.has('fundo-animado')) {
    L.push('', '**3D × fundo animado:** 3D é uma cena com objeto ou modelo (Three.js, Babylon, modelo .glb) que gira ou se mexe com o visitante; ' +
      'fundo animado é um shader desenhado no canvas, sem modelo, que só move cor, luz ou textura atrás do conteúdo. O primeiro pede modelo e ' +
      'muito processamento; o segundo, só código, e troca bem por degradê ou textura em CSS.')
  }
  L.push('')
  return L.join('\n')
}

// ---------------------------------------------------------------------------------------------------------
// Navegador (protocolo DevTools)
// ---------------------------------------------------------------------------------------------------------
export function acharNavegador() {
  return process.env.BROWSER_EXECUTABLE || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((p) => fs.existsSync(p))
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

// Navegadores vivos deste processo (proc -> perfil). Se o Node sai sem fechar (process.exit, erro não tratado, Ctrl+C,
// SIGTERM, SIGHUP), o Chrome sem janela ficava vivo, com a página aberta e o perfil no TEMP. Os ouvintes de saída só
// existem enquanto há navegador vivo e saem quando o último fecha (a suíte abre dezenas: nada acumula).
// Limite: morte seca do Node (taskkill /F, kill -9, sinal mandado de fora no Windows) não roda ouvinte nenhum; aí o
// Chrome e o perfil ficam para trás e não há o que fazer daqui.
const vivos = new Map()
let ouvintesSaida = null
function matarArvore(proc) {
  if (proc.exitCode !== null || proc.signalCode !== null) return
  if (process.platform === 'win32') {
    // caminho completo (não o PATH): um taskkill falso no PATH não pode ser chamado na saída
    const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe')
    try { spawnSync(taskkill, ['/T', '/F', '/PID', String(proc.pid)], { stdio: 'ignore', windowsHide: true, timeout: 5000 }) } catch {}
  } else { try { process.kill(proc.pid, 'SIGKILL') } catch {} }
}
// Síncrono (roda dentro do 'exit'); esvazia o registro, então rodar duas vezes (monitor de erro e depois 'exit') é inócuo.
function limparVivos() {
  const lista = [...vivos]
  vivos.clear()
  for (const [proc] of lista) matarArvore(proc)
  for (const [, perfil] of lista) { try { fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch {} }
}
function desligarSaida() {
  if (!ouvintesSaida) return
  for (const [ev, f] of ouvintesSaida) process.removeListener(ev, f)
  ouvintesSaida = null
}
function ligarSaida() {
  if (ouvintesSaida) return
  // Sinal: limpa e não engole. Sem outro ouvinte, o sinal volta a valer (POSIX: reenviado ao próprio processo, sai pelo
  // sinal; Windows: não há como reenviar, sai com 128 + número do sinal). Com outro ouvinte, quem decide é ele.
  const sinal = (sig) => {
    limparVivos()
    desligarSaida()
    if (process.listenerCount(sig) > 0) return
    if (process.platform === 'win32') process.exit(128 + (os.constants.signals[sig] || 0))
    try { process.kill(process.pid, sig) } catch { process.exit(128 + (os.constants.signals[sig] || 0)) }
  }
  ouvintesSaida = [
    ['exit', () => limparVivos()],
    // só limpa: sem tratador de uncaughtException o Node sai sozinho (código 1); com tratador, o programa segue vivo
    ['uncaughtExceptionMonitor', () => { if (process.listenerCount('uncaughtException') === 0) limparVivos() }],
    ...['SIGINT', 'SIGTERM', 'SIGHUP'].map((s) => [s, sinal]),
  ]
  for (const [ev, f] of ouvintesSaida) process.on(ev, f)
}

export async function abrirNavegador(executavel) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'raio-x-'))
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', 'about:blank']
  if (process.platform === 'linux' && process.env.CI) args.unshift('--no-sandbox')
  const proc = spawn(executavel, args, { stdio: 'ignore' })
  vivos.set(proc, perfil)
  ligarSaida()
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
    vivos.delete(proc)
    if (!vivos.size) desligarSaida()
    for (let i = 0; i < 10; i++) { try { fs.rmSync(perfil, { recursive: true, force: true }); break } catch { await espera(300) } }
  }
  if (!alvo) { await fechar(); throw new Error('Não consegui abrir o Chrome/Edge sem janela.') }
  const ouvintes = new Map()
  const avisar = (metodo, params) => { for (const f of ouvintes.get(metodo) || []) { try { f(params) } catch {} } }
  // Vigia de abas (no nível do navegador): aba ou janela nova (link _blank, clique do meio, ctrl/shift + clique, também
  // sintético, formulário _blank, window.open, de dentro de iframe) não pede nada. Os pedidos de outra aba não passariam
  // pela trava (Fetch) desta página. --block-new-web-contents não segura no --headless=new; o fechamento do alvo
  // (waitForDebuggerOnStart) não segura aba em segundo plano (o pedido sai antes de o alvo existir): por isso o
  // documento de todo quadro que não é desta página é derrubado no Fetch do navegador. Cada derrubada vira o evento
  // 'Vigia.abaBarrada' ({ url }) para quem ouve (a trava anota como 'janela').
  let vigia
  try {
    vigia = await vigiarAbas(porta, alvo.id, avisar)
  } catch (e) { await fechar(); throw new Error('Não consegui ligar a vigia de abas novas do Chrome/Edge: ' + e.message) }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) }).catch(async (e) => { vigia.soltar(); await fechar(); throw e })
  let id = 0
  const pendentes = new Map()
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pendentes.has(msg.id)) { pendentes.get(msg.id)(msg); pendentes.delete(msg.id) }
    else if (msg.method) for (const f of ouvintes.get(msg.method) || []) f(msg.params)
  })
  let fechado = false
  const cmd = (method, params = {}, limite = 60_000) => new Promise((resolve, reject) => {
    if (fechado) return reject(new Error(`${method}: navegador fechado`))
    const n = ++id
    const t = setTimeout(() => { pendentes.delete(n); reject(new Error(`${method} demorou demais`)) }, limite)
    pendentes.set(n, (msg) => { clearTimeout(t); msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result) })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  // Comando ainda sem resposta na hora de fechar responde já, com erro: a resposta não vem mais e o temporizador dele
  // (60 s) segurava o processo vivo depois de tudo pronto.
  const soltarPendentes = () => {
    fechado = true
    for (const [n, responder] of [...pendentes]) { pendentes.delete(n); responder({ error: { message: 'navegador fechado' } }) }
  }
  const ouvir = (metodo, f) => { if (!ouvintes.has(metodo)) ouvintes.set(metodo, []); ouvintes.get(metodo).push(f) }
  // Executa uma função na página; erro de script vira exceção aqui.
  const rodar = async (fn, arg, limite) => {
    const r = await cmd('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(arg ?? null)})`, awaitPromise: true, returnByValue: true }, limite)
    if (r.exceptionDetails) throw new Error('Erro na página: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }
  // Mata o processo ANTES de soltar as conexões: soltar a vigia libera o que ela segura parado (worker, service worker)
  // e desliga o Fetch dela; com o processo vivo, isso deixaria pedido sair sem conferência (DEV-96).
  return { cmd, ouvir, rodar, abasBarradas: vigia.barradas, fechar: async () => { soltarPendentes(); try { proc.kill() } catch {} try { ws.close() } catch {} vigia.soltar(); await fechar() } }
}

// Conexão própria com o navegador (não com a página). Duas barreiras:
//   1. Fetch do navegador, só para documento: pedido de documento de quadro que não é desta página (alvoId e seus
//      iframes) é derrubado antes de sair. Pega a aba em segundo plano, que nasce depois de o pedido sair.
//   2. Auto-attach: página nova que não é a nossa nasce parada (waitForDebuggerOnStart) e é fechada sem ser liberada;
//      o resto que nasce parado é liberado.
//   3. Canais fora do HTTP (WebSocket, WebSocketStream, WebTransport): o Fetch não os vê e o Network.setBlockedURLs
//      não os barra (medido no Chrome 157, formatos urls e urlPatterns); --disable-quic não segura o WebTransport. O
//      construtor é trocado em todo contexto por um inerte que avisa e finge conexão que falhou (GANCHO_CANAIS): página e quadros
//      (addScriptToEvaluateOnNewDocument com runImmediately: vale até no iframe about:blank recém-criado), iframe de
//      outro processo e worker dedicado (auto-attach na página; parados até receber o gancho; worker dentro de worker
//      também). É gancho de JavaScript, não rede: limite declarado.
//   4. Service worker e worker compartilhado de site (não os do próprio navegador, chrome-extension://): nascem
//      parados e são fechados sem rodar uma linha (Target.closeTarget). Nada sai deles e nada da página passa por eles.
// avisar(evento, dados): 'Vigia.abaBarrada' { url }, 'Vigia.canalBarrado' { url, canal }, 'Vigia.workerBarrado' { url,
// tipo }. Devolve { barradas (endereços derrubados), soltar() }. Sem a vigia ligada, abrirNavegador não segue.
const AVISO_CANAL = '__raioXCanal'
// O gancho é INERTE: o construtor não lança (lançar derrubaria o script do site que também inicia as animações, e a
// medida sairia errada sem aviso). Devolve um objeto que se comporta como conexão que falhou: WebSocket vai a
// CLOSED e dispara error e close depois (onerror/onclose e addEventListener), send no CONNECTING lança
// InvalidStateError como o navegador, close não faz nada; WebSocketStream e WebTransport devolvem as promessas
// (opened, ready, closed) rejeitadas. Nada sai para a rede. Na página só troca o que existe (não inventa API, o que
// mudaria a detecção do site); no worker põe sempre (ver o laço no fim): em worker de site sem contexto seguro,
// WebTransport e WebSocketStream passam a existir (falsos, falham). O aviso é buscado na hora da chamada: no documento novo o gancho roda
// antes de o Chrome instalar o aviso. Roda como texto em cada contexto: não pode usar nada de fora da função.
function ganchoCanais(aviso) {
  const avisar = (n, u) => { try { self[aviso](n + ' ' + String(u).slice(0, 300)) } catch {} }
  let falsos
  try { // na dúvida, não passa: se a montagem falhar, entra o substituto mínimo que só avisa e lança (catch abaixo)
  const ET = self.EventTarget, ouvir = ET.prototype.addEventListener, disparar = ET.prototype.dispatchEvent
  const enderecoWs = (u) => { let s = String(u); try { s = new URL(s, self.location?.href).href.replace(/^http/i, 'ws') } catch {} return s }
  const falha = (n) => new DOMException(n + ': canal barrado pelo raio-x', 'NetworkError')
  const rejeitada = (e) => { const p = Promise.reject(e); p.catch(() => {}); return p } // o site ainda vê a rejeição
  const fluxo = (e, T) => { try { return new T({ start(c) { c.error(e) } }) } catch { return null } }
  const est = new WeakMap(), de = (o) => est.get(o) || {}
  falsos = {
    WebSocket: class WebSocket extends ET {
      constructor(url, protocolos) {
        super()
        avisar('WebSocket', url)
        const e = { url: enderecoWs(url), estado: 0, binario: 'blob', on: { open: null, message: null, error: null, close: null } }
        est.set(this, e)
        for (const t of Object.keys(e.on)) ouvir.call(this, t, (ev) => { if (e.on[t]) e.on[t].call(this, ev) })
        setTimeout(() => {
          e.estado = 3
          disparar.call(this, new Event('error'))
          disparar.call(this, typeof CloseEvent === 'function' ? new CloseEvent('close', { code: 1006, reason: '', wasClean: false }) : new Event('close'))
        }, 0)
      }
      get url() { return de(this).url ?? '' }
      get readyState() { return de(this).estado ?? 3 }
      get bufferedAmount() { return 0 }
      get extensions() { return '' }
      get protocol() { return '' }
      get binaryType() { return de(this).binario ?? 'blob' }
      set binaryType(v) { if (est.has(this) && (v === 'blob' || v === 'arraybuffer')) de(this).binario = v }
      send() { if (de(this).estado === 0) throw new DOMException("Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.", 'InvalidStateError') }
      close() {}
    },
    WebSocketStream: class WebSocketStream {
      constructor(url, opcoes) {
        avisar('WebSocketStream', url)
        const f = falha('WebSocketStream')
        est.set(this, { url: enderecoWs(url), opened: rejeitada(f), closed: rejeitada(f) })
      }
      get url() { return de(this).url ?? '' }
      get opened() { return de(this).opened }
      get closed() { return de(this).closed }
      close() {}
    },
    WebTransport: class WebTransport {
      constructor(url, opcoes) {
        avisar('WebTransport', url)
        const f = falha('WebTransport')
        est.set(this, { f, ready: rejeitada(f), closed: rejeitada(f), draining: new Promise(() => {}) })
      }
      get ready() { return de(this).ready }
      get closed() { return de(this).closed }
      get draining() { return de(this).draining }
      get datagrams() { const f = de(this).f; return { readable: fluxo(f, self.ReadableStream), writable: fluxo(f, self.WritableStream), maxDatagramSize: 0 } }
      get incomingBidirectionalStreams() { return fluxo(de(this).f, self.ReadableStream) }
      get incomingUnidirectionalStreams() { return fluxo(de(this).f, self.ReadableStream) }
      createBidirectionalStream() { return Promise.reject(de(this).f) }
      createUnidirectionalStream() { return Promise.reject(de(this).f) }
      close() {}
    },
    // WebRTC: o ICE manda UDP (STUN/TURN) e o canal de dados é escrita. Nasce fechado e nunca conecta: oferta,
    // resposta, descrições, candidatos e estatísticas rejeitam; o canal de dados nunca abre (send lança como no
    // fechado); trilhas e transceptores viram objetos vazios (não lançam, para não derrubar o script do site).
    RTCPeerConnection: class RTCPeerConnection extends ET {
      constructor(config) {
        super()
        const urls = []
        try { for (const s of config?.iceServers || []) urls.push(...[].concat(s?.urls ?? s?.url ?? []).map(String)) } catch {}
        avisar('RTCPeerConnection', urls.join(' ') || '(sem servidor ICE)')
        est.set(this, { f: falha('RTCPeerConnection') })
      }
      static generateCertificate() { return rejeitada(falha('RTCPeerConnection')) }
      get connectionState() { return 'closed' }
      get iceConnectionState() { return 'closed' }
      get signalingState() { return 'closed' }
      get iceGatheringState() { return 'new' }
      get localDescription() { return null }
      get currentLocalDescription() { return null }
      get pendingLocalDescription() { return null }
      get remoteDescription() { return null }
      get currentRemoteDescription() { return null }
      get pendingRemoteDescription() { return null }
      get canTrickleIceCandidates() { return null }
      get sctp() { return null }
      createOffer() { return rejeitada(de(this).f) }
      createAnswer() { return rejeitada(de(this).f) }
      setLocalDescription() { return rejeitada(de(this).f) }
      setRemoteDescription() { return rejeitada(de(this).f) }
      addIceCandidate() { return rejeitada(de(this).f) }
      getStats() { return rejeitada(de(this).f) }
      createDataChannel(rotulo) {
        const c = new ET()
        const fechado = () => { throw new DOMException("Failed to execute 'send' on 'RTCDataChannel': RTCDataChannel.readyState is not 'open'", 'InvalidStateError') }
        Object.assign(c, { label: String(rotulo ?? ''), readyState: 'closed', id: null, ordered: true, protocol: '', negotiated: false,
          bufferedAmount: 0, bufferedAmountLowThreshold: 0, binaryType: 'arraybuffer', maxPacketLifeTime: null, maxRetransmits: null,
          onopen: null, onmessage: null, onerror: null, onclose: null, onclosing: null, onbufferedamountlow: null, send: fechado, close() {} })
        return c
      }
      addTrack() { return { track: null, transport: null, replaceTrack: () => rejeitada(de(this).f), getParameters: () => ({}), setParameters: () => rejeitada(de(this).f), getStats: () => rejeitada(de(this).f) } }
      removeTrack() {}
      addTransceiver() { return { mid: null, direction: 'inactive', currentDirection: null, sender: this.addTrack(), receiver: { track: null }, stop() {}, setCodecPreferences() {} } }
      getSenders() { return [] }
      getReceivers() { return [] }
      getTransceivers() { return [] }
      getConfiguration() { return { iceServers: [] } }
      setConfiguration() {}
      restartIce() {}
      close() {}
    },
  }
  falsos.webkitRTCPeerConnection = falsos.RTCPeerConnection
  for (const t of ['open', 'message', 'error', 'close']) {
    Object.defineProperty(falsos.WebSocket.prototype, 'on' + t, { configurable: true, enumerable: true,
      get() { return de(this).on?.[t] ?? null }, set(f) { if (est.has(this)) de(this).on[t] = typeof f === 'function' ? f : null } })
  }
  ;['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach((k, i) => { for (const o of [falsos.WebSocket, falsos.WebSocket.prototype]) Object.defineProperty(o, k, { value: i, enumerable: true }) })
  } catch {
    falsos = {}
    for (const n of ['WebSocket', 'WebSocketStream', 'WebTransport', 'RTCPeerConnection', 'webkitRTCPeerConnection']) falsos[n] = function (u) { avisar(n, u); throw new DOMException('canal barrado pelo raio-x', 'SecurityError') }
  }
  for (const [n, B] of Object.entries(falsos)) {
    try {
      const O = self[n]
      // No worker o gancho roda parado, antes de o Chrome pôr as APIs de contexto seguro (WebTransport,
      // WebSocketStream): lá o falso entra mesmo sem a API ainda existir, e fixo ela não é posta por cima (medido
      // 12/11: pulando, o WebTransport do worker mandou 49 pacotes UDP). Na página, só troca o que existe. WebRTC
      // não existe em worker: lá não é inventado (mudaria a detecção do site).
      if (typeof O !== 'function' && (typeof document !== 'undefined' || /RTC/.test(n))) continue
      try { if (O.prototype) Object.defineProperty(O.prototype, 'constructor', { value: B, configurable: false, writable: false }) } catch {}
      Object.defineProperty(self, n, { value: B, configurable: false, writable: false })
    } catch {}
  }
}
export const GANCHO_CANAIS = `(${ganchoCanais})(${JSON.stringify(AVISO_CANAL)})`
async function vigiarAbas(porta, alvoId, avisar = () => {}) {
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json()
  const ws = new WebSocket(webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
  let id = 0, aberta = true
  const respostas = new Map()
  const mandar = (method, params = {}, sessionId) => { const n = ++id; if (aberta) try { ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) })) } catch {} return n }
  const pedir = (method, params, sessionId, limite = 10_000) => new Promise((resolve) => {
    const n = mandar(method, params, sessionId)
    const t = setTimeout(() => { respostas.delete(n); resolve({ error: { message: `${method}: sem resposta` } }) }, limite)
    respostas.set(n, (msg) => { clearTimeout(t); resolve(msg) })
  })
  const barradas = []
  let sessaoNossa = null
  // O quadro é desta página? O principal tem o id do alvo; os iframes estão na árvore dela (nascem antes do pedido).
  const nosso = async (frameId) => {
    if (!frameId) return false
    if (frameId === alvoId) return true
    if (!sessaoNossa) return false
    const r = await pedir('Page.getFrameTree', {}, sessaoNossa, 5000)
    const tem = (n) => !!n && (n.frame.id === frameId || (n.childFrames || []).some(tem))
    return tem(r.result?.frameTree)
  }
  ws.addEventListener('message', (e) => {
    let msg
    try { msg = JSON.parse(e.data) } catch { return }
    if (msg.id && respostas.has(msg.id)) { respostas.get(msg.id)(msg); respostas.delete(msg.id); return }
    if (msg.method === 'Fetch.requestPaused' && !msg.sessionId) {
      const p = msg.params
      ;(async () => {
        let ok = false
        try { ok = await nosso(p.frameId) } catch {} // na dúvida, não passa
        if (ok) return mandar('Fetch.continueRequest', { requestId: p.requestId })
        const url = String(p.request?.url || '').slice(0, 300)
        barradas.push(url)
        mandar('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' })
        avisar('Vigia.abaBarrada', { url })
      })()
      return
    }
    if (msg.method === 'Runtime.bindingCalled' && msg.sessionId && msg.params?.name === AVISO_CANAL) {
      const texto = String(msg.params.payload || ''), i = texto.indexOf(' ')
      return avisar('Vigia.canalBarrado', { canal: i > 0 ? texto.slice(0, i) : 'WebSocket', url: i > 0 ? texto.slice(i + 1) : texto })
    }
    if (msg.method !== 'Target.attachedToTarget') return
    const { sessionId, targetInfo: info, waitingForDebugger } = msg.params
    const filho = !!msg.sessionId // alvo dentro de outro (worker, iframe de outro processo, service worker da página)
    if (!filho && info.targetId === alvoId) { sessaoNossa = sessionId; return }
    if ((info.type === 'service_worker' || info.type === 'shared_worker') && (filho || !/^chrome(-extension)?:/i.test(info.url || ''))) {
      // Nunca liberado (fica parado até ser fechado; o processo morre antes de a vigia soltar: ver fechar).
      mandar('Target.closeTarget', { targetId: info.targetId })
      if (!workersBarrados.has(info.targetId)) { workersBarrados.add(info.targetId); avisar('Vigia.workerBarrado', { url: String(info.url || '').slice(0, 300), tipo: info.type }) }
      return
    }
    if (!filho && info.type === 'page') return mandar('Target.closeTarget', { targetId: info.targetId })
    if (info.type === 'worker' || info.type === 'iframe') {
      // Só roda depois de receber o gancho dos canais; se algo falhar, fecha em vez de liberar.
      ;(async () => {
        const ok = await prepararContexto(sessionId, info.type === 'iframe')
        if (ok) mandar('Runtime.runIfWaitingForDebugger', {}, sessionId)
        else mandar('Target.closeTarget', { targetId: info.targetId })
      })()
      return
    }
    if (waitingForDebugger) mandar('Runtime.runIfWaitingForDebugger', {}, sessionId)
  })
  const workersBarrados = new Set()
  // Gancho dos canais e auto-attach (para o worker de dentro) num contexto. pagina: vale para cada documento novo (o
  // script de documento novo só é posto pela sessão que ligou o Page; sem o Page.enable, o gancho não pegava).
  // Runtime.enable: o aviso (addBinding) só entra nos contextos que já existem; nos que nascem depois (documento
  // após navegar, iframe novo) o V8 só o repõe com o Runtime ligado nesta sessão. Sem ele o canal era barrado em
  // silêncio (medido 12/11: o WebSocket da página não chegava ao servidor, mas não aparecia em naoMedido).
  const prepararContexto = async (sid, pagina) => {
    for (const [method, params] of [
      ...(pagina ? [['Page.enable', {}]] : []),
      ['Runtime.enable', {}],
      ['Runtime.addBinding', { name: AVISO_CANAL }],
      pagina ? ['Page.addScriptToEvaluateOnNewDocument', { source: GANCHO_CANAIS, runImmediately: true }] : ['Runtime.evaluate', { expression: GANCHO_CANAIS }],
      ['Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }],
    ]) {
      const r = await pedir(method, params, sid)
      if (r.error || r.result?.exceptionDetails) return false
    }
    return true
  }
  const soltar = () => { aberta = false; try { ws.close() } catch {} }
  for (const [method, params] of [
    ['Fetch.enable', { patterns: [{ urlPattern: '*', resourceType: 'Document', requestStage: 'Request' }] }],
    ['Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }],
  ]) {
    const r = await pedir(method, params)
    if (r.error) { soltar(); throw new Error(`${method}: ${r.error.message}`) }
  }
  if (!sessaoNossa) for (let i = 0; i < 20 && !sessaoNossa; i++) await espera(50)
  if (!sessaoNossa) { soltar(); throw new Error('a página aberta não apareceu para a vigia') }
  if (!(await prepararContexto(sessaoNossa, true))) { soltar(); throw new Error('não consegui pôr a barreira de WebSocket/worker na página') }
  return { barradas, soltar }
}

// ---------------------------------------------------------------------------------------------------------
// Funções que rodam dentro da página
// ---------------------------------------------------------------------------------------------------------

// Marca canvas WebGL (instalado antes do site carregar; não cria contexto, só anota).
const GANCHO_WEBGL = `(() => { try { const o = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...r) { try { if (/webgl/i.test(String(t))) this.__raioxGl = true } catch {} return o.call(this, t, ...r) } } catch {} })()`

// Monta o código de uma função de página levando junto as regras puras que ela usa (sem eval na página).
function comAjuda(fn, ...ajudas) {
  return `(arg) => { ${ajudas.map((f) => `const ${f.name} = ${f};`).join('\n')}\nreturn (${fn})(arg) }`
}

// Esconde o aviso de cookies só neste navegador (marca o elemento e uma regra CSS o tira da tela). Nada é clicado
// nem aceito; o site não fica sabendo. Devolve quantos elementos novos foram escondidos.
function esconderAvisos() {
  const vw = innerWidth, vh = innerHeight
  if (!document.getElementById('__raiox-oculta')) {
    const st = document.createElement('style')
    st.id = '__raiox-oculta'
    st.textContent = '[data-raiox-oculto]{display:none!important}'
    document.documentElement.appendChild(st)
  }
  let n = 0
  for (const el of [...document.querySelectorAll('body *')].slice(0, 20000)) {
    if (el.hasAttribute('data-raiox-oculto') || el.closest('[data-raiox-oculto]')) continue
    const idClasse = el.id + ' ' + (typeof el.className === 'string' ? el.className : '') + ' ' + el.tagName
    const cs = getComputedStyle(el)
    if (el.shadowRoot && pareceAvisoCookies({ idClasse, sombra: true })) { el.setAttribute('data-raiox-oculto', ''); n++; continue }
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (r.width < 120 || r.height < 30 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue
    const telaToda = r.height > vh * 0.75 && r.width > vw * 0.9
    const texto = telaToda && !/cookie|consent|cky-|onetrust|didomi|iubenda|cmplz|gdpr|lgpd|cybot|usercentrics/i.test(idClasse) ? '' : (el.innerText || '').slice(0, 1600)
    if (pareceAvisoCookies({ idClasse, texto, altura: r.height, largura: r.width, vw, vh })) { el.setAttribute('data-raiox-oculto', ''); n++ }
  }
  return n
}

// Textos visíveis de uma seção, com a cor de verdade (degradê recortado no texto, contorno) e os sinais de enfeite.
// px é o tamanho arredondado (escala, exibição); pxReal e ctrFundo vão sem arredondar para o resumo do contraste.
export function textosDaSecao(sec) {
  const vw = innerWidth, vh = innerHeight
  const familia = (f) => String(f).split(',')[0].replace(/["']/g, '').trim()
  const aHex = (v) => (v ? '#' + v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('') : null)
  const estilos = new Map()
  const cs = (el) => { let c = estilos.get(el); if (!c) { c = getComputedStyle(el); estilos.set(el, c) } return c }
  const opacidade = (el) => { let o = 1; for (let x = el; x && x.nodeType === 1; x = x.parentElement) { o *= parseFloat(cs(x).opacity); if (o < 0.02) break } return o }
  const mediaCores = (img) => {
    const l = (String(img).match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-f]{3,8}\b/gi) || []).map(corParaRgba).filter((v) => v && v[3] > 0.05)
    return l.length ? [0, 1, 2].map((k) => l.reduce((a, v) => a + v[k], 0) / l.length).concat(1) : null
  }
  const recortado = (k) => /text/.test(k.getPropertyValue('background-clip') + ' ' + k.getPropertyValue('-webkit-background-clip'))
  // Como o texto e o fundo dele chegam à tela. O fundo começa no PRÓPRIO elemento e desce pela pilha: o que está
  // pintado atrás naquele ponto e os ancestrais. Cor com transparência é composta sobre a de baixo; a opacidade de
  // um ancestral vale para o grupo inteiro (texto e fundo juntos). Imagem, vídeo, canvas, qualquer background-image
  // (url, degradê, image-set...) ou cor que não dá para ler antes de um fundo opaco = sem medida (null).
  // Devolve { fundo: [r, g, b], texto: [r, g, b] } ou null.
  const pintura = (el, r, cor) => {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    let pilha = null
    if (cx > 0 && cx < vw && cy > 0 && cy < vh) { const l = [...document.elementsFromPoint(cx, cy)], k = l.indexOf(el); if (k >= 0) pilha = l.slice(k) }
    // Fora da tela, ou elemento que o elementsFromPoint não devolve (sem cursor): só a linha de ancestrais.
    if (!pilha) { pilha = []; for (let x = el; x; x = x.parentElement) pilha.push(x) }
    const sobre = (c, baixo) => c.map((v, k) => v + baixo[k] * (1 - c[3])) // cores premultiplicadas [r·a, g·a, b·a, a]
    const a0 = cor[3] ?? 1
    let T = [cor[0] * a0, cor[1] * a0, cor[2] * a0, a0], F = [0, 0, 0, 0], nivel = el
    // Sai dos grupos abaixo de `alvo`, aplicando a opacidade de cada um ao que já foi pintado dentro dele.
    const subirAte = (alvo) => {
      if (alvo && !alvo.contains(nivel)) return
      while (nivel && nivel !== alvo) {
        const o = parseFloat(cs(nivel).opacity)
        if (o < 1) { T = T.map((v) => v * o); F = F.map((v) => v * o) }
        nivel = nivel.parentElement
      }
    }
    for (const x of pilha) {
      let fator = 1
      if (x.contains(el)) subirAte(x)
      else {
        // Pintado atrás sem ser ancestral: entra no grupo do ancestral comum, com a opacidade do próprio ramo.
        let a = x
        for (; a && !a.contains(el); a = a.parentElement) fator *= parseFloat(cs(a).opacity)
        subirAte(a)
      }
      if (F[3] >= 0.999 || fator < 0.02) continue
      const k = cs(x)
      if (x !== el && /^(IMG|VIDEO|CANVAS|PICTURE)$/.test(x.tagName)) return null
      if (recortado(k)) continue // fundo recortado no texto pinta só dentro das letras
      if (k.backgroundImage && k.backgroundImage !== 'none') return null
      const v = corParaRgba(k.backgroundColor)
      if (!v) { if (k.backgroundColor) return null; continue }
      const a = v[3] * fator
      if (a < 0.004) continue
      const c = [v[0] * a, v[1] * a, v[2] * a, a]
      T = sobre(T, c); F = sobre(F, c)
    }
    subirAte(null)
    const tela = [255, 255, 255, 1] // o que sobra transparente até a raiz cai no branco do navegador
    return { fundo: sobre(F, tela).slice(0, 3), texto: sobre(T, tela).slice(0, 3) }
  }
  const porEl = new Map()
  const tw = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT)
  let n = 0, nd
  while ((nd = tw.nextNode()) && n < 4000) {
    const t = nd.textContent.replace(/\s+/g, ' ').trim()
    const pai = nd.parentElement
    if (!t || !pai || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(pai.tagName)) continue
    n++
    porEl.set(pai, (porEl.get(pai) || '') + ' ' + t)
  }
  const out = []
  for (const [el, bruto] of porEl) {
    const c = cs(el)
    if (c.display === 'none' || c.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const op = opacidade(el)
    if (op < 0.02) continue
    const t = bruto.trim()
    const svg = !!el.closest('svg')
    let px = parseFloat(c.fontSize)
    if (svg && el.getScreenCTM) { const m = el.getScreenCTM(); if (m) px *= Math.hypot(m.a, m.b) }
    // Cor de verdade: preenchimento; senão degradê recortado no texto, contorno ou traço do SVG; senão é invisível.
    let cor = corParaRgba(svg ? c.fill : (c.webkitTextFillColor || c.color)), degrade = false
    if (!cor || cor[3] < 0.05) {
      let clip = null
      for (let x = el, d = 0; x && d < 4; x = x.parentElement, d++) {
        const k = cs(x)
        const corClip = corParaRgba(k.backgroundColor)
        if (recortado(k) && (k.backgroundImage !== 'none' || (corClip && corClip[3] >= 0.05))) { clip = k; break }
      }
      // Recorte de cor lisa (texto "em relevo") vale a cor do fundo; degradê vale a média das cores dele.
      if (clip && clip.backgroundImage === 'none') cor = corParaRgba(clip.backgroundColor)
      else if (clip) { cor = mediaCores(clip.backgroundImage); degrade = true }
      else if (svg && /url\(/.test(c.fill)) { cor = null; degrade = true }
      else if (parseFloat(c.webkitTextStrokeWidth) > 0) cor = corParaRgba(c.webkitTextStrokeColor)
      else if (svg && c.stroke !== 'none' && parseFloat(c.strokeWidth) > 0) cor = corParaRgba(c.stroke)
      else continue
    }
    const palavras = t.split(/\s+/).filter(Boolean).length
    // aria-hidden com o texto inteiro em aria-label logo acima (SplitText e afins) é título partido, não enfeite.
    let ariaHidden = false
    const ah = el.closest('[aria-hidden="true"]')
    if (ah) {
      const chave = t.toLowerCase().replace(/\s+/g, '')
      ariaHidden = true
      for (let x = ah, d = 0; x && d < 5; x = x.parentElement, d++) {
        const l = x.getAttribute('aria-label')
        if (l && l.toLowerCase().replace(/\s+/g, '').includes(chave)) { ariaHidden = false; break }
      }
    }
    let ctr = null
    const tinta = cor && out.length < 400 ? pintura(el, r, cor) : null
    const fundo = tinta ? tinta.fundo : null
    if (palavras <= 2 && px >= 100 && cor && fundo) ctr = contraste(cor, fundo)
    // Contraste que o olho vê (texto e fundo como chegam à tela), sem arredondar. Texto em degradê e fundo de imagem
    // ou degradê ficam sem medida.
    const ctrFundo = tinta && !degrade ? contraste(tinta.texto, tinta.fundo, true) : null
    out.push({ el, t, chars: t.length, palavras, px: Math.round(px), pxReal: px, fam: familia(c.fontFamily), peso: c.fontWeight, cor: aHex(cor),
      lh: parseFloat(c.lineHeight) || px * 1.25, tt: c.textTransform, opacidade: Math.round(op * 100) / 100, svg, ariaHidden,
      semCursor: c.pointerEvents === 'none', contraste: ctr, degrade, fundo: aHex(fundo), ctrFundo })
  }
  return out
}

// Guarda os textos da seção como estão agora (título que some no fim da cena continua contando).
function fotografarTextos(i) {
  const R = window.__raiox
  if (!R.fotos) R.fotos = R.secoes.map(() => new Map())
  for (const x of textosDaSecao(R.secoes[i])) { const a = R.fotos[i].get(x.el); if (!a || x.opacidade > a.opacidade) R.fotos[i].set(x.el, x) }
  return true
}

// Retângulos (na tela) das maiores imagens da seção, para amostrar a cor no print.
function imagensNaTela(i) {
  const R = window.__raiox, sec = R.secoes[i], vw = innerWidth, vh = innerHeight
  const rs = sec.getBoundingClientRect()
  const cands = []
  for (const el of [...sec.querySelectorAll('*')].slice(0, 5000)) {
    const tag = el.tagName
    const cs = getComputedStyle(el)
    if (!/^(IMG|VIDEO|CANVAS)$/.test(tag) && !/url\(/.test(cs.backgroundImage)) continue
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.5) continue
    const r = el.getBoundingClientRect()
    const x = Math.max(0, r.left, rs.left), y = Math.max(0, r.top, rs.top)
    const w = Math.min(vw, r.right, rs.right) - x, h = Math.min(vh, r.bottom, rs.bottom) - y
    if (w < 40 || h < 40 || w * h < vw * vh * 0.02) continue
    cands.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })
  }
  cands.sort((a, b) => b.w * b.h - a.w * a.h)
  const escolhidos = []
  for (const c of cands) {
    const dentro = escolhidos.some((o) => {
      const iw = Math.min(c.x + c.w, o.x + o.w) - Math.max(c.x, o.x), ih = Math.min(c.y + c.h, o.y + o.h) - Math.max(c.y, o.y)
      return iw > 0 && ih > 0 && iw * ih >= c.w * c.h * 0.8
    })
    if (!dentro) escolhidos.push(c)
    if (escolhidos.length >= 3) break
  }
  return escolhidos
}

const NA_PAGINA = {
  esconder: comAjuda(esconderAvisos, pareceAvisoCookies),
  fotografar: comAjuda(fotografarTextos, corParaRgba, contraste, textosDaSecao),
  estrutura: comAjuda(estrutura, corParaRgba, contraste, motivoDecorativo, textosDaSecao, resumoContraste, temposParaMs, mediana),
}

// Acha a área que rola, as seções de primeiro nível e os elementos a acompanhar.
function preparar({ maxPorSecao }) {
  const vw = innerWidth, vh = innerHeight
  const doc = document.scrollingElement || document.documentElement
  let alvo = doc, max = doc.scrollHeight - vh
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el)
    const sobra = el.scrollHeight - el.clientHeight
    if (/(auto|scroll)/.test(s.overflowY) && el.clientHeight > vh * 0.5 && sobra > max) { alvo = el; max = sobra }
  }
  const rolagemDoc = alvo === doc
  const pos = () => (rolagemDoc ? scrollY : alvo.scrollTop)
  const desc = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id && /^[\w-]{1,30}$/.test(el.id) ? '#' + el.id : ''
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).find((c) => /^[a-z][\w-]{0,30}$/i.test(c)) : ''
    return tag + id + (!id && cls ? '.' + cls : '')
  }
  const qualifica = (el) => {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META'].includes(el.tagName)) return false
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    return r.width >= vw * 0.5 && (el.offsetHeight || r.height) >= 30
  }
  const altura = (el) => el.offsetHeight || el.getBoundingClientRect().height
  const pinEnvoltorio = (el) => el.classList?.contains('pin-spacer')
  // Desce por invólucros (div#app, main, smooth-wrapper) até achar a lista de blocos empilhados.
  // Depois de entrar numa <section> (ou num bloco que já é uma lista de seções), só desce por invólucro único.
  function blocos(cont, prof, dentro = false) {
    const filhos = [...cont.children].filter(qualifica)
    const out = []
    for (const c of filhos) {
      const netos = [...c.children].filter(qualifica)
      // Empilhados de verdade: os blocos do fluxo (camadas absolutas/fixas ficam de fora) um embaixo do outro.
      const noFluxo = netos.filter((x) => !/absolute|fixed/.test(getComputedStyle(x).position))
      const ordenados = noFluxo.map((x) => x.getBoundingClientRect()).sort((a, b) => a.top - b.top)
      let sobreposicao = 0
      for (let i = 1; i < ordenados.length; i++) sobreposicao += Math.max(0, Math.min(ordenados[i - 1].bottom, ordenados[i].bottom) - ordenados[i].top)
      const empilhados = noFluxo.length >= 2 && noFluxo.reduce((a, b) => a + altura(b), 0) >= altura(c) * 0.7 && sobreposicao <= altura(c) * 0.35
      const semantico = /^(SECTION|HEADER|FOOTER|NAV|ARTICLE)$/.test(c.tagName)
      const unico = noFluxo.length === 1 && altura(noFluxo[0]) >= altura(c) * 0.8
      const lista = !dentro && !semantico && empilhados && (altura(c) >= vh * 1.5 ||
        (altura(c) >= vh * 5 && noFluxo.filter((x) => altura(x) >= vh * 0.5).length >= 2))
      if (!pinEnvoltorio(c) && prof < 8 && unico) {
        // invólucro único: a seção é o mesmo bloco; fica a marca de "dentro" se já era seção
        const sub = blocos(c, prof + 1, dentro || semantico)
        out.push(...(dentro || semantico ? [c] : sub))
      } else if (!pinEnvoltorio(c) && prof < 8 && lista) out.push(...blocos(c, prof + 1, false))
      else out.push(c)
    }
    return out
  }
  const raizBusca = rolagemDoc ? document.body : alvo
  let secoes = blocos(raizBusca, 0)
  // Aviso de cookies e outras camadas sobrepostas não são seções da página.
  const sobreposta = (el) => /cookie|consent|cky-|onetrust|didomi|iubenda|cmplz|gdpr|cc-window|cc-banner|preloader|loader|loading/i.test(el.id + ' ' + String(el.className)) ||
    (altura(el) < vh * 0.6 && (/cookie/i.test((el.innerText || '').slice(0, 300)) ||
      ((() => { for (let x = el; x && x !== document.body; x = x.parentElement) if (getComputedStyle(x).position === 'fixed') return true; return false })() && el.getBoundingClientRect().top > vh * 0.3)))
  window.__raioxSobrepostas = secoes.filter(sobreposta).length
  secoes = secoes.filter((el, i, a) => a.indexOf(el) === i && !sobreposta(el))
  // Camada absoluta/fixa que ocupa o mesmo lugar de outro bloco do fluxo não é seção própria.
  const fora = (el) => /absolute|fixed/.test(getComputedStyle(el).position)
  secoes = secoes.filter((el) => {
    if (!fora(el)) return true
    const r = el.getBoundingClientRect()
    return !secoes.some((o) => { if (o === el || fora(o)) return false; const q = o.getBoundingClientRect(); return Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > Math.min(r.height, q.height) * 0.5 })
  }).slice(0, 40)
  const topoDoc = (el) => el.getBoundingClientRect().top + pos()
  secoes.sort((a, b) => topoDoc(a) - topoDoc(b))

  const MIDIA = 'img,video,canvas,picture,svg'
  const elementos = secoes.map((sec) => {
    const lista = [{ el: sec, cadeia: true }]
    // cadeia de invólucros únicos (ex.: pin-spacer > section > div)
    let c = sec
    for (let i = 0; i < 4; i++) {
      const filhos = [...c.children].filter((x) => x.getBoundingClientRect().width * x.getBoundingClientRect().height >= sec.getBoundingClientRect().width * altura(sec) * 0.5 && !['SCRIPT', 'STYLE'].includes(x.tagName))
      if (filhos.length !== 1) break
      c = filhos[0]
      lista.push({ el: c, cadeia: true })
    }
    const ja = new Set(lista.map((x) => x.el))
    const cands = []
    const area = vw * vh
    const todos = [...sec.querySelectorAll('*')].slice(0, 5000)
    for (const el of todos) {
      if (ja.has(el) || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SOURCE', 'BR', 'PATH', 'G', 'USE'].includes(el.tagName.toUpperCase())) continue
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
      const r = el.getBoundingClientRect()
      if (r.width < 24 || r.height < 16) continue
      const tag = el.tagName.toLowerCase()
      const midia = el.matches(MIDIA)
      const titulo = /^h[1-3]$/.test(tag)
      const st = el.getAttribute('style') || ''
      const animavel = /transform|opacity|clip-path|translate|scale/.test(st)
      const cs = getComputedStyle(el)
      const fundoImg = cs.backgroundImage && cs.backgroundImage !== 'none' && /url\(/.test(cs.backgroundImage)
      const texto = !midia && [...el.childNodes].some((nd) => nd.nodeType === 3 && nd.textContent.trim().length > 2)
      const a = Math.min(r.width * r.height, area * 1.5)
      if (!midia && !titulo && !animavel && !fundoImg && !texto && a < area * 0.05) continue
      const prof = (() => { let d = 0, x = el; while (x && x !== sec && d < 20) { x = x.parentElement; d++ } return d })()
      let pontos = a / area + (midia ? 0.4 : 0) + (titulo ? 0.5 : 0) + (animavel ? 0.6 : 0) + (fundoImg ? 0.4 : 0) + (cs.position === 'sticky' ? 1 : 0) + (r.width > vw * 1.2 ? 0.8 : 0) - prof * 0.02
      if (cs.clipPath && cs.clipPath !== 'none') pontos += 0.8
      if (cs.transform && cs.transform !== 'none') pontos += 0.3
      cands.push({ el, pontos, midia: midia || !!fundoImg, texto: texto || titulo, ov: cs.overflow === 'hidden' || cs.overflowX === 'hidden' })
    }
    cands.sort((a, b) => b.pontos - a.pontos)
    for (const c of cands.slice(0, Math.max(0, maxPorSecao - lista.length))) lista.push({ el: c.el, cadeia: false, midia: c.midia, texto: c.texto, ov: c.ov })
    // pai = elemento acompanhado mais próximo acima no DOM
    return lista.map((x, i) => {
      let pai = -1
      if (i > 0) { let p = x.el.parentElement; while (p && pai < 0) { const j = lista.findIndex((y) => y.el === p); if (j >= 0 && j !== i) pai = j; p = p.parentElement } }
      if (i > 0 && pai < 0) pai = 0
      return { ...x, pai }
    })
  })
  // Texto partido (SplitText, Splitting, SplitType): pedaços de 1-2 letras ou linhas/palavras com classe própria.
  const fragmentos = secoes.map((sec) => {
    const letras = [], linhas = []
    for (const el of [...sec.querySelectorAll('span,div')].slice(0, 6000)) {
      if (el.children.length) continue
      const t = el.textContent.trim()
      if (!t) continue
      const irmaos = el.parentElement ? el.parentElement.children.length : 0
      const cls = typeof el.className === 'string' ? el.className : ''
      if (t.length <= 2 && (irmaos >= 3 || /char|letter/i.test(cls))) { if (letras.length < 300) letras.push(el) }
      else if (/(^|[\s_-])(line|word|split)/i.test(cls) || (el.parentElement && /(^|[\s_-])(line|word|split)/i.test(String(el.parentElement.className)))) { if (linhas.length < 300) linhas.push(el) }
    }
    return { letras, linhas }
  })
  window.__raiox = { alvo, rolagemDoc, secoes, elementos, fragmentos, pos }
  return {
    vw, vh, rolagemDoc, sobrepostas: window.__raioxSobrepostas, maxRolagem: Math.max(0, rolagemDoc ? doc.scrollHeight - vh : alvo.scrollHeight - alvo.clientHeight),
    secoes: secoes.map((s, i) => ({ desc: desc(s), topo: topoDoc(s), altura: altura(s), dataMov: (s.closest && s.closest('[data-mov]')?.getAttribute('data-mov')) || null,
      elementos: elementos[i].map((x) => ({ desc: desc(x.el), cadeia: x.cadeia, pai: x.pai, midia: !!x.midia, texto: !!x.texto, ov: !!x.ov,
        dataMov: (x.el.closest && x.el.closest('[data-mov]')?.getAttribute('data-mov')) || null })) })),
  }
}

// Espera a página assentar (rolagem suave termina) e mede tudo. Com deriva, mede de novo 250 ms depois sem rolar.
// "Assentar" = posição, largura e opacidade dos primeiros elementos de cada seção iguais por 3 quadros seguidos
// (translação, escala e giro já mudam a caixa; a opacidade entra à parte, senão um "aparecer" encerrava a espera).
export async function medir({ assentarMs, deriva, porAlvo = false }) {
  const R = window.__raiox
  const vw = innerWidth, vh = innerHeight
  const quadro = () => new Promise((r) => { let ok = false; const f = () => { if (!ok) { ok = true; r() } }; requestAnimationFrame(() => setTimeout(f, 16)); setTimeout(f, 80) })
  const assinatura = () => Math.round(R.pos()) + '|' + R.elementos.map((l) => l.slice(0, 3).map((x) => { const r = x.el.getBoundingClientRect(); return Math.round(r.top) + ',' + Math.round(r.left) + ',' + Math.round(r.width) + ',' + Math.round(parseFloat(getComputedStyle(x.el).opacity) * 100) }).join(';')).join('/')
  const t0 = performance.now()
  let ant = null, iguais = 0, assentoMs = 0
  // porAlvo (opção --movimento): a hora da última mudança de cada elemento e da rolagem; no fim, a = quantos ms cada
  // um ainda mudou depois de a rolagem parar (só os que estão na tela).
  const sigEl = (x) => { if (!x.el.isConnected) return ''; const r = x.el.getBoundingClientRect(), cs = getComputedStyle(x.el); return [Math.round(r.top + R.pos()), Math.round(r.left), Math.round(r.width), Math.round(r.height), cs.opacity, cs.transform, cs.filter, cs.clipPath].join(',') }
  const sigAnt = porAlvo ? R.elementos.map((l) => l.map(sigEl)) : null
  const ultMuda = porAlvo ? R.elementos.map((l) => l.map(() => -1)) : null
  let posAnt = R.pos(), tPos = t0
  while (performance.now() - t0 < assentarMs) {
    await quadro()
    let s = assinatura()
    if (porAlvo) {
      const agora = performance.now(), p = R.pos()
      if (Math.abs(p - posAnt) > 0.5) { posAnt = p; tPos = agora }
      R.elementos.forEach((l, i) => l.forEach((x, j) => { const g = sigEl(x); if (g !== sigAnt[i][j]) { sigAnt[i][j] = g; ultMuda[i][j] = agora } }))
      s += '|' + sigAnt.map((l) => l.join(';')).join('/')
    }
    // assentoMs: quanto tempo a tela ainda se mexeu depois do passo de rolagem (ritmo de cena feita por biblioteca).
    if (s === ant) { if (++iguais >= 3) break } else { iguais = 0; if (ant !== null) assentoMs = Math.round(performance.now() - t0) }
    ant = s
  }
  const transp = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c)
  const hex = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/)
    if (!m) return c
    const [r, g, b] = m[1].split(',').map((x) => Math.round(parseFloat(x)))
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
  }
  const estado = (el, comFundo) => {
    if (!el.isConnected) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    let sx = 1, sy = 1, r3 = 0
    const m = cs.transform.match(/matrix(3d)?\(([^)]+)\)/)
    if (m) {
      const v = m[2].split(',').map(Number)
      if (m[1]) { sx = Math.hypot(v[0], v[1], v[2]); sy = Math.hypot(v[4], v[5], v[6]); r3 = Math.abs(v[2]) + Math.abs(v[6]) + Math.abs(v[8]) + Math.abs(v[9]) }
      else { sx = Math.hypot(v[0], v[1]); sy = Math.hypot(v[2], v[3]) }
    }
    const e = { t: Math.round(r.top), l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), o: Math.round(parseFloat(cs.opacity) * 100) / 100 }
    if (Math.abs(sx - 1) > 0.005) e.sx = Math.round(sx * 1000) / 1000
    if (Math.abs(sy - 1) > 0.005) e.sy = Math.round(sy * 1000) / 1000
    if (r3 > 0.005) e.r3 = Math.round(r3 * 1000) / 1000
    if (cs.clipPath && cs.clipPath !== 'none') e.c = cs.clipPath
    // bl = desfoque em px e br = brilho, lidos do filter (só quando saem do normal)
    if (cs.filter && cs.filter !== 'none') {
      const mb = cs.filter.match(/blur\(([\d.]+)px\)/), mr = cs.filter.match(/brightness\(([\d.]+)(%?)\)/)
      if (mb && parseFloat(mb[1]) > 0.05) e.bl = Math.round(parseFloat(mb[1]) * 10) / 10
      if (mr) { const v = parseFloat(mr[1]) / (mr[2] ? 100 : 1); if (Math.abs(v - 1) > 0.005) e.br = Math.round(v * 100) / 100 }
    }
    const p = { fixed: 'f', sticky: 's', absolute: 'a' }[cs.position]
    if (p) e.p = p
    if (comFundo && !transp(cs.backgroundColor)) e.bg = hex(cs.backgroundColor)
    return e
  }
  const somaFrag = (lista) => {
    let n = 0, soma = 0
    for (const el of lista) {
      if (!el.isConnected) continue
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > vh) continue
      const cs = getComputedStyle(el)
      const m = cs.transform.match(/matrix\(([^)]+)\)/)
      const v = m ? m[1].split(',').map(Number) : null
      const desl = v ? Math.abs(v[4]) + Math.abs(v[5]) + Math.abs(1 - v[0]) * 50 : 0
      const op = 1 - parseFloat(cs.opacity)
      const clip = cs.clipPath && cs.clipPath !== 'none' ? 10 : 0
      n++
      soma += desl + op * 100 + clip
    }
    return [n, Math.round(soma)]
  }
  // Cor do fundo da página: body, html ou a área que rola.
  let corPagina = null
  for (const el of [R.alvo, document.body, document.documentElement]) {
    if (!el) continue
    const c = getComputedStyle(el).backgroundColor
    if (!transp(c)) { corPagina = hex(c); break }
  }
  const centro = R.secoes.findIndex((s) => { const r = s.getBoundingClientRect(); return r.top <= vh / 2 && r.bottom > vh / 2 })
  const secoes = R.elementos.map((lista, i) => {
    const [nl, sl] = somaFrag(R.fragmentos[i].letras)
    const [nw, sw] = somaFrag(R.fragmentos[i].linhas)
    const e = lista.map((x, j) => estado(x.el, j === 0))
    if (!porAlvo) return { e, x: { nl, sl, nw, sw } }
    const a = e.map((st, j) => (st && st.t < vh && st.t + st.h > 0 && ultMuda[i][j] > tPos ? Math.round(ultMuda[i][j] - tPos) : 0))
    return { e, x: { nl, sl, nw, sw }, a }
  })
  let derivas = null
  if (deriva) {
    const antes = R.elementos.map((l) => l.map((x) => x.el.getBoundingClientRect().left))
    await new Promise((r) => setTimeout(r, 250))
    derivas = R.elementos.map((l, i) => l.map((x, j) => Math.round(x.el.getBoundingClientRect().left - antes[i][j])))
  }
  // A altura pode crescer durante a rolagem (blocos preguiçosos): o fim é conferido a cada passo.
  const doc = document.scrollingElement || document.documentElement
  const max = R.rolagemDoc ? doc.scrollHeight - vh : R.alvo.scrollHeight - R.alvo.clientHeight
  return { s: R.pos(), max, centro, corPagina, secoes, derivas, assentoMs }
}

// Estrutura de cada seção (medida depois da rolagem, com imagens preguiçosas já carregadas).
function estrutura() {
  const R = window.__raiox
  const vw = innerWidth, vh = innerHeight
  const transp = (c) => { const v = corParaRgba(c); return !v || v[3] < 0.05 }
  const opaco = (c) => { const v = corParaRgba(c); return !!v && v[3] >= 0.5 }
  const hex = (c) => { const v = corParaRgba(c); return v ? '#' + v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('') : null }
  // Textos de agora somados aos fotografados quando a seção passou pela tela (fica a versão mais visível de cada um).
  const brutos = R.secoes.map((sec, i) => {
    const m = new Map(R.fotos?.[i] || [])
    for (const x of textosDaSecao(sec)) { const a = m.get(x.el); if (!a || x.opacidade >= a.opacidade) m.set(x.el, x) }
    return [...m.values()]
  })
  // Enfeite (SVG, aria-hidden, apagado sem cursor) sai antes de achar o corpo; o texto gigante apagado depende do corpo.
  for (const l of brutos) for (const x of l) x.motivo = motivoDecorativo(x, Infinity)
  const porPx = new Map()
  for (const lista of brutos) for (const x of lista) if (!x.motivo && x.px <= 30) porPx.set(x.px, (porPx.get(x.px) || 0) + x.chars)
  // Tamanho do corpo = tamanho com mais letras em texto de até 30px (parágrafos).
  const corpoPx = [...porPx].sort((a, b) => b[1] - a[1])[0]?.[0] || 16
  for (const l of brutos) for (const x of l) x.motivo = motivoDecorativo(x, corpoPx)
  const textos = brutos.map((l) => l.filter((x) => !x.motivo))
  const decorativos = brutos.map((l) => l.filter((x) => x.motivo))
  const totalChars = textos.flat().reduce((a, x) => a + x.chars, 0) || 1
  const agrupar = (lista, chave) => { const m = new Map(); for (const x of lista) { const k = chave(x); m.set(k, (m.get(k) || 0) + x.chars) } return [...m].sort((a, b) => b[1] - a[1]) }
  const pagina = {
    corpoPx,
    fontes: agrupar(textos.flat(), (x) => x.fam).slice(0, 4).map(([familia, c]) => ({ familia, parte: Math.round(c / totalChars * 100) / 100 })),
    escala: [...new Set(textos.flat().map((x) => x.px))].sort((a, b) => b - a).map((px) => ({ px, razao: Math.round(px / corpoPx * 100) / 100, parte: Math.round(textos.flat().filter((x) => x.px === px).reduce((a, x) => a + x.chars, 0) / totalChars * 1000) / 1000 })),
    corTexto: agrupar(textos.flat().filter((x) => x.cor), (x) => x.cor)[0]?.[0] || null,
  }
  let fundoPag = null
  for (const el of [R.alvo, document.body, document.documentElement]) { const c = el && getComputedStyle(el).backgroundColor; if (c && !transp(c)) { fundoPag = hex(c); break } }
  pagina.corFundo = fundoPag || '#ffffff'

  // @keyframes da página: nome -> curva declarada dentro dos quadros (vale sobre a do elemento). Folha de outro
  // domínio não deixa ler as regras: fica de fora.
  const quadros = new Map()
  const lerRegras = (regras, nivel) => {
    for (const r of regras) {
      if (r.type === 7) { // CSSKeyframesRule
        let curva = null
        for (const q of r.cssRules) { const c = q.style?.animationTimingFunction; if (c) { curva = c; break } }
        quadros.set(r.name, curva)
      } else if (r.cssRules && nivel < 4) { try { lerRegras(r.cssRules, nivel + 1) } catch {} }
    }
  }
  for (const folha of document.styleSheets) { try { lerRegras(folha.cssRules, 0) } catch {} }
  const lista = (t) => String(t || '').split(/,(?![^(]*\))/).map((x) => x.trim())
  const d1 = (v) => Math.round(v * 10) / 10

  const secoes = R.secoes.map((sec, i) => {
    const rs = sec.getBoundingClientRect()
    const alt = sec.offsetHeight || rs.height
    const ritmos = new Map()
    const anotar = (item) => { const k = JSON.stringify(item); ritmos.set(k, (ritmos.get(k) || 0) + 1) }
    const areaSec = Math.max(1, rs.width * alt)
    const todos = [...sec.querySelectorAll('*')].slice(0, 5000)
    let areaMidia = 0, imagens = 0, videos = 0, canvasN = 0
    const canvasDetalhe = [], videosDetalhe = []
    const raios = new Map()
    const blocosCol = []
    const opacos = []
    let fundoEl = null, maiorFundo = 0, itensRepetidos = 0, classesDepo = 0
    for (const el of todos) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const tag = el.tagName.toLowerCase()
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const a = r.width * r.height
      // Ritmo declarado em CSS: transições e animações com duração (estilo computado).
      if (/[1-9]/.test(cs.transitionDuration || '')) {
        const ms = temposParaMs(cs.transitionDuration), curvas = lista(cs.transitionTimingFunction), props = lista(cs.transitionProperty)
        ms.forEach((m, k) => { if (m > 0) anotar({ tipo: 'transicao', duracaoMs: m, curva: curvas[k % curvas.length] || null, propriedade: props[k % props.length] || 'all' }) })
      }
      if (cs.animationName && cs.animationName !== 'none' && /[1-9]/.test(cs.animationDuration || '')) {
        const ms = temposParaMs(cs.animationDuration), curvas = lista(cs.animationTimingFunction), voltas = lista(cs.animationIterationCount)
        lista(cs.animationName).forEach((nome, k) => {
          const m = ms[k % ms.length]
          if (m > 0 && quadros.has(nome)) anotar({ tipo: 'animacao', duracaoMs: m, curva: quadros.get(nome) || curvas[k % curvas.length] || null, nome, infinita: voltas[k % voltas.length] === 'infinite' })
        })
      }
      const fundoImg = /url\(/.test(cs.backgroundImage || '')
      if ((tag === 'img' && r.width >= 40 && r.height >= 40) || (fundoImg && r.width >= 80 && r.height >= 80)) { imagens++; areaMidia += a }
      else if (tag === 'video') { videos++; areaMidia += a; videosDetalhe.push({ area: Math.round(Math.min(a, vw * vh)), auto: el.autoplay || !el.paused }) }
      else if (tag === 'canvas' && r.width >= 100 && r.height >= 100) {
        canvasN++; areaMidia += a
        // Interação: cursor de arrastar/apontar ou canvas dentro de link/botão (fundo de shader não pede nada disso).
        const interativo = /grab|move|crosshair|pointer/.test(cs.cursor) || !!el.closest('a,button')
        canvasDetalhe.push({ area: Math.round(Math.min(a, vw * vh)), webgl: !!el.__raioxGl || !!(window.THREE || window.__THREE__), ...(interativo ? { interativo: true } : {}) })
      }
      else if (tag === 'svg' && r.width >= 120 && r.height >= 120) areaMidia += a * 0.5
      if (opaco(cs.backgroundColor) && a >= areaSec * 0.15) opacos.push(el)
      const cls = typeof el.className === 'string' ? el.className : ''
      if (/(^|[\s_-])(testimonials?|depoimentos?|reviews?|quotes?)([\s_-]|$)/i.test(cls)) classesDepo++
      // Itens repetidos: irmãos com a mesma tag e classe, cada um com texto, lado a lado (cartões de serviço).
      if (el.children.length >= 3) {
        const grupos = new Map()
        for (const f of el.children) {
          const q = f.getBoundingClientRect()
          if (q.width >= rs.width * 0.6 || q.height < 40 || (f.textContent || '').trim().length < 10) continue
          const k = f.tagName + '.' + (typeof f.className === 'string' ? f.className.trim().split(/\s+/)[0] : '')
          grupos.set(k, (grupos.get(k) || 0) + 1)
        }
        for (const v of grupos.values()) if (v > itensRepetidos) itensRepetidos = v
      }
      const temCaixa = !transp(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 || tag === 'img' || tag === 'video' || tag === 'button'
      if (temCaixa && r.width >= 40 && r.height >= 24) {
        const raio = Math.min(Math.round(parseFloat(cs.borderTopLeftRadius) || 0), 999)
        raios.set(raio, (raios.get(raio) || 0) + 1)
      }
      if (!transp(cs.backgroundColor) && a >= areaSec * 0.6 && a > maiorFundo) { maiorFundo = a; fundoEl = el }
      if (/^(img|video|canvas|picture|figure|p|h[1-6]|li|blockquote|button|a)$/.test(tag) || /card/i.test(String(el.className))) blocosCol.push(r)
    }
    // Colunas: agrupa blocos por linha (sobreposição vertical) e conta os lado a lado; vale a moda pesada pela altura.
    const folhas = blocosCol.filter((r) => r.width < rs.width * 0.92).sort((a, b) => a.top - b.top)
    const linhas = []
    for (const r of folhas) {
      const l = linhas.find((x) => Math.min(x.bottom, r.bottom) - Math.max(x.top, r.top) >= Math.min(x.bottom - x.top, r.height) * 0.5)
      if (l) { l.itens.push(r); l.top = Math.min(l.top, r.top); l.bottom = Math.max(l.bottom, r.bottom) } else linhas.push({ top: r.top, bottom: r.bottom, itens: [r] })
    }
    const votos = new Map([[1, 1]])
    const larguras = new Map(), vaos = new Map()
    for (const l of linhas) {
      const itens = l.itens.sort((a, b) => a.left - b.left)
      let cont = 0, fim = -Infinity
      const ws = [], gs = []
      for (const r of itens) if (r.left >= fim - 4) { if (cont) gs.push(Math.max(0, r.left - fim)); cont++; fim = r.right; ws.push(r.width) }
      const c = Math.min(cont, 6)
      votos.set(c, (votos.get(c) || 0) + (l.bottom - l.top))
      larguras.set(c, (larguras.get(c) || []).concat(ws)); vaos.set(c, (vaos.get(c) || []).concat(gs))
    }
    const colunas = [...votos].sort((a, b) => b[1] - a[1])[0][0]
    // Grade em vw (parte da largura da tela): largura do conteúdo, de uma coluna e do vão entre colunas.
    const grade = folhas.length ? {
      conteudoVw: d1(Math.min(100, (Math.max(...folhas.map((r) => r.right)) - Math.min(...folhas.map((r) => r.left))) / vw * 100)),
      colunaVw: larguras.get(colunas)?.length ? d1(mediana(larguras.get(colunas)) / vw * 100) : null,
      vaoVw: colunas > 1 && vaos.get(colunas)?.length ? d1(mediana(vaos.get(colunas)) / vw * 100) : null,
    } : null
    const tx = textos[i]
    const chars = tx.reduce((a, x) => a + x.chars, 0)
    const areaTexto = tx.reduce((a, x) => a + x.chars * x.px * 0.5 * x.lh, 0)
    const am = Math.min(areaMidia, areaSec)
    const palavras = (sec.innerText || '').split(/\s+/).filter(Boolean).length
    // Fundo: camada opaca que cobre a seção; senão a própria seção; senão a camada opaca que guarda o texto
    // (cápsula escura do cabeçalho transparente, caixa no meio); só então os ancestrais.
    let corFundo = null
    const csSec = getComputedStyle(sec)
    if (fundoEl) corFundo = hex(getComputedStyle(fundoEl).backgroundColor)
    else if (opaco(csSec.backgroundColor)) corFundo = hex(csSec.backgroundColor)
    else {
      const vivos = tx.filter((x) => x.el.isConnected && sec.contains(x.el))
      const totalC = vivos.reduce((a, x) => a + x.chars, 0)
      let guarda = null, areaGuarda = 0
      if (totalC) for (const el of opacos) {
        const dentro = vivos.filter((x) => el.contains(x.el)).reduce((a, x) => a + x.chars, 0)
        const q = el.getBoundingClientRect()
        if (dentro >= totalC * 0.7 && q.width * q.height > areaGuarda) { guarda = el; areaGuarda = q.width * q.height }
      }
      if (guarda) corFundo = hex(getComputedStyle(guarda).backgroundColor)
      else for (let x = sec.parentElement; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; if (!transp(c)) { corFundo = hex(c); break } }
    }
    const fontes = agrupar(tx, (x) => x.fam + '|' + x.px + '|' + x.peso).slice(0, 5).map(([k, c]) => {
      const [f, px, peso] = k.split('|')
      return { familia: f, px: Number(px), razao: Math.round(Number(px) / corpoPx * 100) / 100, peso: Number(peso) || peso, parte: Math.round(c / Math.max(1, chars) * 100) / 100 }
    })
    const tit = tx.filter((x) => x.chars >= 3).sort((a, b) => b.px - a.px)[0]
    const conteudo = [...blocosCol].filter((r) => r.height > 0)
    const respiro = conteudo.length ? {
      topoTelas: Math.round(Math.max(0, Math.min(...conteudo.map((r) => r.top)) - rs.top) / vh * 100) / 100,
      baseTelas: Math.round(Math.max(0, rs.top + alt - Math.max(...conteudo.map((r) => r.bottom))) / vh * 100) / 100,
    } : null
    const fixoAcima = (() => { for (let x = sec; x; x = x.parentElement) if (/fixed|sticky/.test(getComputedStyle(x).position)) return true; return false })()
    const cabecalho = !!(i === 0 && alt < vh * 0.25 && (fixoAcima || sec.matches('header,nav') || sec.querySelector('nav') || sec.querySelectorAll('a').length >= 3))
    const rodape = !cabecalho && !!(sec.tagName === 'FOOTER' || sec.closest('footer') || (i === R.secoes.length - 1 && (sec.querySelector('footer') || /footer/i.test(String(sec.className) + String(sec.parentElement?.className)))))
    const raioPx = [...raios].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
    return {
      topoPx: Math.round(rs.top + R.pos()), alturaPx: Math.round(alt),
      papel: cabecalho ? 'cabeçalho' : rodape ? 'rodapé' : null, colunas, palavras, imagens, videos, canvas: canvasN,
      imagemTexto: am + areaTexto > 0 ? Math.round(am / (am + areaTexto) * 100) / 100 : null,
      fundoImagem: am >= areaSec * 0.6,
      corFundo: corFundo || pagina.corFundo, corTexto: agrupar(tx.filter((x) => x.cor), (x) => x.cor)[0]?.[0] || null,
      raioPx, fontes, grade,
      contraste: resumoContraste(tx.map((x) => ({ t: x.t, px: x.pxReal ?? x.px, peso: x.peso, chars: x.chars, cor: x.cor, fundo: x.fundo, razao: x.ctrFundo, titulo: x === tit }))),
      ritmoCss: [...ritmos].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, quantos]) => ({ ...JSON.parse(k), quantos })),
      titulo: tit ? { texto: tit.t.slice(0, 60) + (tit.t.length > 60 ? '…' : ''), px: tit.px, razao: Math.round(tit.px / corpoPx * 100) / 100, maiusculas: tit.tt === 'uppercase', cor: tit.cor, ...(tit.degrade ? { degrade: true } : {}) } : null,
      decorativos: decorativos[i].sort((a, b) => b.px - a.px).slice(0, 5).map((x) => ({ texto: x.t.slice(0, 40), px: x.px, razao: Math.round(x.px / corpoPx * 100) / 100, motivo: x.motivo })),
      sinaisPapel: {
        cabecalho, rodape, formulario: !!sec.querySelector('form'),
        campos: sec.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),textarea,select').length,
        contatos: sec.querySelectorAll('a[href^="mailto:"],a[href^="tel:"],a[href*="wa.me"],a[href*="whatsapp"]').length,
        citacoes: sec.querySelectorAll('blockquote').length + classesDepo, itensRepetidos,
      },
      respiro, estatico: { videos: videosDetalhe.slice(0, 5), canvas: canvasDetalhe.slice(0, 5) },
    }
  })
  return { pagina, secoes }
}

function bibliotecas() {
  const w = window
  const globais = []
  if (w.gsap) globais.push('GSAP' + (w.gsap.version ? ' ' + w.gsap.version : ''))
  if (w.ScrollTrigger || w.gsap?.plugins?.scrollTrigger) globais.push('ScrollTrigger')
  if (w.Lenis || w.lenis) globais.push('Lenis')
  if (w.THREE || w.__THREE__) globais.push('Three.js' + (w.__THREE__ ? ' r' + w.__THREE__ : ''))
  if (w.BABYLON) globais.push('Babylon.js')
  if (w.pc && w.pc.Application) globais.push('PlayCanvas')
  if (w.barba) globais.push('Barba')
  if (w.LocomotiveScroll || w.locomotive || w.locoScroll) globais.push('Locomotive Scroll')
  if (w.Swiper) globais.push('Swiper')
  if (w.lottie || w.bodymovin) globais.push('Lottie')
  if (w.PIXI) globais.push('PixiJS')
  if (w.SplitType) globais.push('SplitType')
  if (w.Splitting) globais.push('Splitting')
  if (w.anime) globais.push('anime.js')
  if (w.Webflow) globais.push('Webflow')
  const sinais = []
  const h = document.documentElement
  if (document.querySelector('.pin-spacer')) sinais.push('ScrollTrigger (pin-spacer)')
  if (h.classList.contains('lenis') || document.querySelector('[data-lenis-prevent]')) sinais.push('Lenis (classe)')
  if (h.classList.contains('has-scroll-smooth') || document.querySelector('[data-scroll-container]')) sinais.push('Locomotive Scroll (atributos)')
  if (document.querySelector('[data-barba]')) sinais.push('Barba (atributos)')
  if (document.querySelector('[data-framer-name],[data-framer-component-type]')) sinais.push('Framer')
  if (h.dataset.wfSite || h.dataset.wfPage) sinais.push('Webflow (atributos)')
  if (document.querySelector('.splitting, [data-splitting]')) sinais.push('Splitting (classe)')
  if (document.querySelector('model-viewer')) sinais.push('model-viewer (modelo 3D)')
  if (document.querySelector('spline-viewer')) sinais.push('Spline (cena 3D)')
  const re = /(gsap|scrolltrigger|scroll-trigger|lenis|three|babylon|playcanvas|spline|model-viewer|barba|locomotive|swiper|splitting|splittext|split-type|framer|lottie|pixi|ogl|anime|webflow|motion|aos|scrollmagic|smooth-scrollbar)/i
  const scripts = [...new Set([...document.scripts].map((s) => s.src).filter(Boolean)
    .map((s) => { try { return new URL(s).pathname.split('/').pop() } catch { return '' } }).filter((n) => re.test(n)))].slice(0, 20)
  return { globais, sinais, scripts }
}

// ---------------------------------------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------------------------------------
export function lerArgs(argv) {
  const pos = []
  const op = { celular: false, passos: 10, limite: 600 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--celular') op.celular = true
    else if (a === '--tambem-celular') op.tambemCelular = true
    else if (a === '--bruto') op.bruto = true
    else if (a === '--movimento') op.movimento = true
    else if (a === '--passos' || a === '--limite' || a === '--max-mouse' || a === '--max-paginas' || a === '--tempo-max') {
      const v = Number(argv[++i])
      if (!Number.isFinite(v) || v < 1) throw new Error(`Valor inválido para ${a}`)
      op[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v
    } else if (a.startsWith('--')) throw new Error(`Opção desconhecida: ${a}`)
    else pos.push(a)
  }
  if (pos.length !== 2) throw new Error('Uso: node raio-x.mjs <url> <pasta-saida> [--celular | --tambem-celular] [--passos 10] [--limite 600] [--movimento [--max-mouse 24] [--max-paginas 2] [--tempo-max 600]]')
  if (op.celular && op.tambemCelular) throw new Error('Use --celular (só celular) ou --tambem-celular (os dois), não ambos.')
  return { url: pos[0], saida: pos[1], ...op }
}

// Argumentos do processo filho do --movimento (o primeiro é o caminho do movimento.mjs).
export function argsDoMovimento(op, celular) {
  const args = [path.join(path.dirname(fileURLToPath(import.meta.url)), 'movimento.mjs'), op.url, op.saida, '--passos', String(op.passos), '--limite', String(op.limite)]
  if (celular) args.push('--celular')
  if (op.bruto) args.push('--bruto')
  for (const [k, v] of [['--max-mouse', op.maxMouse], ['--max-paginas', op.maxPaginas], ['--tempo-max', op.tempoMax]]) if (v != null) args.push(k, String(v))
  return args
}

// Com tambemCelular, mede no computador e depois no celular (raio-x-celular.json, prints-celular/); devolve o do computador.
export async function raioX({ tambemCelular = false, ...op }) {
  if (tambemCelular && op.celular) throw new Error('Use celular ou tambemCelular, não ambos.')
  const rx = await umaTela(op)
  if (!tambemCelular || rx?.parou) return rx
  const cel = await umaTela({ ...op, celular: true, sufixo: '-celular' })
  if (cel?.parou) (op.avisar || console.log)(`Celular não medido: ${cel.parou}`)
  Object.defineProperty(rx, '_celular', { value: cel, enumerable: false }) // para o --movimento medir o celular também
  return rx
}

// aoAbrir(nav, url): chamado com o navegador aberto e ANTES do Page.navigate (o movimento.mjs liga ali a trava de
// pedidos); antesDeFechar(nav): chamado antes do nav.fechar(), inclusive em erro (tira a página do ar com a trava
// ligada). Injetados por quem chama: este arquivo não importa a trava (ela importa este arquivo).
async function umaTela({ url, saida, celular = false, passos = 10, limite = 600, bruto = false, avisar = console.log, sufixo = '', movimento: medirMovimento = false, aoAbrir = null, antesDeFechar = null }) {
  let endereco
  try { endereco = new URL(url); if (!['http:', 'https:', 'file:'].includes(endereco.protocol)) throw new Error() }
  catch { throw new Error('Informe uma URL http, https ou file válida') }
  const motivo = await conferirRobots(endereco)
  if (motivo) return { parou: motivo }
  const exe = acharNavegador()
  if (!exe) throw new Error('Defina BROWSER_EXECUTABLE para o Chrome/Edge instalado.')
  const pastaPrints = 'prints' + sufixo
  fs.mkdirSync(path.join(saida, pastaPrints), { recursive: true })
  const nav = await abrirNavegador(exe)
  const avisos = []
  try {
    const { cmd, ouvir, rodar } = nav
    await cmd('Page.enable')
    await cmd('Network.enable')
    await cmd('Page.addScriptToEvaluateOnNewDocument', { source: GANCHO_WEBGL })
    const largura = celular ? 390 : 1440, altura = celular ? 844 : 900
    await cmd('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: celular })
    await cmd('Emulation.setTouchEmulationEnabled', celular ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
    if (celular) {
      // Agente de celular que continua dizendo "HeadlessChrome": o site serve a versão móvel sem esconder que é robô.
      const { userAgent } = await cmd('Browser.getVersion')
      const versao = (userAgent.match(/Chrome\/([\d.]+)/) || [])[1] || '120.0.0.0'
      await cmd('Emulation.setUserAgentOverride', { userAgent: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/${versao} Mobile Safari/537.36` })
    }
    let escondidos = 0
    const esconder = async () => { try { escondidos += await rodar(NA_PAGINA.esconder) } catch {} }
    let statusDoc = null
    ouvir('Network.responseReceived', (p) => { if (p.type === 'Document' && statusDoc === null) statusDoc = p.response.status })
    let carregou = false
    ouvir('Page.loadEventFired', () => { carregou = true })
    if (aoAbrir) await aoAbrir(nav, url)
    const nav1 = await cmd('Page.navigate', { url })
    if (nav1.errorText) throw new Error(`Não abriu a página: ${nav1.errorText}`)
    for (let i = 0; i < 100 && !carregou; i++) await espera(250) // até 25 s; site que nunca "sossega" segue assim mesmo
    if ([401, 403, 429].includes(statusDoc)) return { parou: `A página respondeu ${statusDoc}: o site bloqueia robôs. Parar aqui, sem contornar; estudar à mão.` }
    await espera(2500) // deixa a abertura animar
    await esconder()
    // Tela de carregamento trava a rolagem: espera liberar (até 15 s).
    for (let t = 0; t < 30; t++) {
      const liberou = await rodar(() => [document.scrollingElement || document.documentElement, ...document.querySelectorAll('body *')].some((el) => el.scrollHeight - el.clientHeight > innerHeight * 0.5))
      if (liberou) break
      await espera(500)
    }
    await rodar(() => document.fonts.ready.then(() => true))
    const prep = await rodar(preparar, { maxPorSecao: medirMovimento ? 40 : 14 })
    const vh = prep.vh, vw = prep.vw
    if (!prep.secoes.length) throw new Error('Não achei seções na página.')
    if (prep.sobrepostas) avisos.push('Havia aviso de cookies ou camada fixa por cima: ficou fora das seções (nada foi aceito) e pode cobrir parte dos prints.')
    const virtual = prep.maxRolagem < 200
    if (virtual) avisos.push('A página não mostra a altura real (rolagem virtual): a rolagem foi medida pela roda do mouse, as durações são aproximadas.')
    let passoPx = Math.max(10, Math.round(vh / passos))
    const alcance = virtual ? vh * 30 : prep.maxRolagem
    if (alcance / passoPx > limite) { passoPx = Math.ceil(alcance / limite); avisos.push(`Página longa: passos de ${passoPx}px para caber em ${limite} passos.`) }

    // Amostragem
    const amostras = []
    let pelaRoda = true, parados = 0, acumulado = 0, trocas = 0
    const printsFeitos = new Set()
    const prints = {}
    const coresImagem = {}
    const printar = async (i) => {
      await esconder()
      try {
        const { data } = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 62 })
        const nome = `${pastaPrints}/secao-${String(i + 1).padStart(2, '0')}.jpg`
        fs.writeFileSync(path.join(saida, nome), Buffer.from(data, 'base64'))
        prints[i] = nome
      } catch {}
      try { await rodar(NA_PAGINA.fotografar, i) } catch {}
      // Cor média das maiores imagens da seção, tirada de um print PNG do mesmo instante.
      try {
        const rets = await rodar(imagensNaTela, i)
        if (rets.length) {
          const { data } = await cmd('Page.captureScreenshot', { format: 'png' })
          const img = decodificarPng(Buffer.from(data, 'base64'))
          coresImagem[i] = rets.map((r) => corMediaRegiao(img, r)).filter(Boolean)
        }
      } catch {}
    }
    for (let k = 0; k <= limite; k++) {
      if (k > 0) {
        if (pelaRoda) await cmd('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(vw / 2), y: Math.round(vh / 2), deltaX: 0, deltaY: passoPx })
        else await rodar((p) => { const R = window.__raiox; R.rolagemDoc ? scrollBy(0, p) : (R.alvo.scrollTop += p) }, passoPx)
        acumulado += passoPx
      }
      const m = await rodar(medir, { assentarMs: 1200, deriva: k % 4 === 2, porAlvo: medirMovimento }, 30_000)
      m.sRoda = acumulado
      const anterior = amostras[amostras.length - 1]
      amostras.push(m)
      // Uma tela por seção, quando o topo dela chega ao alto da tela.
      for (let i = 0; i < m.secoes.length; i++) {
        const e = m.secoes[i].e[0]
        if (!printsFeitos.has(i) && e && e.t <= vh * 0.05 && e.t + e.h >= vh * 0.6) { printsFeitos.add(i); await printar(i) }
      }
      if (k % 5 === 0 && m.centro >= 0) { try { await rodar(NA_PAGINA.fotografar, m.centro) } catch {} }
      if (k === 0) continue
      const andou = virtual ? JSON.stringify(m.secoes.map((s) => s.e[0]?.t)) !== JSON.stringify(anterior.secoes.map((s) => s.e[0]?.t)) : m.s > anterior.s + 0.5
      if (andou) { parados = 0; continue }
      parados++
      if (!virtual && m.s >= m.max - 2) break
      // Travou: o site pode ter parado a rolagem durante uma animação (Lenis.stop) ou ignorar a roda simulada.
      // Alterna roda e rolagem direta, esperando um pouco; só desiste depois de 10 passos sem andar.
      if (parados >= 10) { avisos.push(`A rolagem parou em ${r2(m.s / vh)} telas e não voltou a andar: o resto da página não foi medido.`); break }
      if (!virtual && parados % 2 === 0) { pelaRoda = !pelaRoda; trocas++ }
      if (parados >= 3) await espera(700)
    }
    if (trocas) avisos.push(`A rolagem travou em algum trecho e foi preciso alternar roda do mouse e rolagem direta (${trocas} trocas): durações perto desses trechos são aproximadas.`)
    // Seções que nunca chegaram ao alto (a última, curtas): print quando estavam mais visíveis.
    const libs = await rodar(bibliotecas)
    const lib3d = [...libs.globais, ...libs.sinais, ...libs.scripts].find((g) => /three|babylon|playcanvas|model-viewer|spline/i.test(g)) || null
    for (let i = 0; i < prep.secoes.length; i++) {
      if (prints[i]) continue
      let melhor = -1, k0 = 0
      amostras.forEach((m, k) => { const e = m.secoes[i].e[0]; if (!e) return; const vis = Math.min(vh, e.t + e.h) - Math.max(0, e.t); if (vis > melhor) { melhor = vis; k0 = k } })
      if (melhor > 0) {
        const alvoS = amostras[k0].s
        await rodar((y) => { const R = window.__raiox; R.rolagemDoc ? scrollTo(0, y) : (R.alvo.scrollTop = y) }, alvoS)
        await rodar(medir, { assentarMs: 800, deriva: false })
        if (!virtual) await printar(i)
      }
    }
    // Estrutura depois dos prints: os textos fotografados de cada seção já estão guardados.
    const est = await rodar(NA_PAGINA.estrutura)
    // Página inteira (limitada a 16000px de altura).
    try {
      await rodar(() => { const R = window.__raiox; R.rolagemDoc ? scrollTo(0, 0) : (R.alvo.scrollTop = 0) })
      await espera(800)
      await esconder()
      const met = await cmd('Page.getLayoutMetrics')
      const alt = Math.min(16000, Math.ceil((met.cssContentSize || met.contentSize).height))
      const { data } = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 55, captureBeyondViewport: true, clip: { x: 0, y: 0, width: vw, height: alt, scale: celular ? 1 : 0.5 } }, 90_000)
      fs.writeFileSync(path.join(saida, pastaPrints, 'pagina-inteira.jpg'), Buffer.from(data, 'base64'))
    } catch (e) { avisos.push('Print da página inteira falhou: ' + e.message) }

    // Monta as trajetórias por seção e classifica.
    const s = amostras.map((m) => (virtual ? m.sRoda : m.s))
    const movimento = prep.secoes.map((sec, i) => {
      const elementos = sec.elementos.map((el, j) => ({ ...el, estados: amostras.map((m) => m.secoes[i].e[j]) }))
      const r = classificarSecao({
        vw, vh, s, elementos,
        secaoNoCentro: amostras.map((m) => m.centro === i),
        corPagina: amostras.map((m) => m.corPagina),
        texto: amostras.map((m) => m.secoes[i].x),
        deriva: amostras.map((m) => (m.derivas ? m.derivas[i] : null)),
        estatico: est.secoes[i].estatico, lib3d,
      })
      // Ritmo: o que o CSS declara; sem isso, e havendo movimento, a estimativa pelas amostras.
      const comMovimento = r.tipos.some((t) => t !== 'nenhum') || r.detalhes.length > 0
      const estimado = comMovimento ? ritmoEstimado({ assentos: amostras.filter((m, k) => k > 0 && m.centro === i).map((m) => m.assentoMs || 0), elementos, s, vw }) : null
      return { secao: i, ...r, ...ritmoDaSecao(est.secoes[i].ritmoCss, estimado) }
    })
    const primeira = est.secoes.findIndex((x) => !x.sinaisPapel.cabecalho)
    const secoes = prep.secoes.map((sec, i) => {
      const { estatico, topoPx, alturaPx, sinaisPapel, ritmoCss, ...resto } = est.secoes[i]
      // Posição medida no fim (imagens e blocos preguiçosos já carregados); na rolagem virtual vale a do começo.
      const topo = virtual || resto.papel === 'cabeçalho' ? sec.topo : topoPx
      const alturaSec = virtual ? sec.altura : alturaPx
      const papel = papelDaSecao({ ...sinaisPapel, ...resto, primeiraDoCorpo: i === primeira, topoTelas: topo / vh, alturaTelas: alturaSec / vh, tituloTexto: resto.titulo?.texto })
      // Cores dominantes (lidas pelo tratar-fotos.py --do-raio-x): fundo, texto e a média das maiores imagens no print.
      const cores = []
      const juntar = (h, p) => { if (h && /^#[0-9a-f]{6}$/i.test(h) && !cores.some((c) => c.hex === h)) cores.push({ hex: h, papel: p }) }
      juntar(resto.corFundo, 'fundo'); juntar(resto.corTexto, 'texto')
      for (const h of (coresImagem[i] || []).slice(0, 3)) juntar(h, 'imagem')
      return {
        indice: i, elemento: sec.desc, topoTelas: r2(topo / vh), alturaTelas: r2(alturaSec / vh), ...resto, papel, cores,
        palavrasPorTela: Math.round(resto.palavras / Math.max(1, alturaSec / vh)),
        canvasDetalhe: estatico.canvas, print: prints[i] || null,
      }
    })
    est.pagina.escala = limparEscala(est.pagina.escala, secoes.map((x) => x.titulo?.px).filter(Boolean)).slice(0, 10)
    if (escondidos) avisos.push(`Aviso de cookies escondido só no navegador do raio-x, para os prints e a medição (nada foi clicado nem aceito): ${plural(escondidos, 'elemento', 'elementos')}.`)
    // Cabeçalho fixo não disputa a cena principal.
    const candidatas = movimento.filter((m) => secoes[m.secao].papel !== 'cabeçalho')
    const cenaPrincipal = (candidatas.length ? candidatas : movimento).reduce((a, b) => (b.forca > a.forca ? b : a)).secao
    const rx = {
      versao: 2, url, data: new Date().toISOString(),
      viewport: { largura: vw, altura: vh, celular },
      rolagem: { modo: virtual ? 'virtual' : prep.rolagemDoc ? 'documento' : 'elemento', alturaTelas: r2((virtual ? s[s.length - 1] + vh : Math.max(prep.maxRolagem, amostras[amostras.length - 1].max) + vh) / vh), passos: amostras.length, passoPx },
      bibliotecas: libs, pagina: est.pagina, secoes, movimento, cenaPrincipal, tipos: TIPOS, avisos,
    }
    fs.writeFileSync(path.join(saida, `raio-x${sufixo}.json`), JSON.stringify(rx, null, 1))
    if (bruto) fs.writeFileSync(path.join(saida, `amostras-brutas${sufixo}.json`), JSON.stringify({ prep, s, amostras }))
    // --movimento: as medidas completas seguem em memória para o movimento.mjs (rolagem por alvo)
    if (medirMovimento) Object.defineProperty(rx, '_bruto', { value: { prep, s, amostras }, enumerable: false })
    fs.writeFileSync(path.join(saida, `roteiro${sufixo}.md`), gerarRoteiro(rx))
    fs.writeFileSync(path.join(saida, `custo${sufixo}.md`), gerarCusto(rx))
    fs.writeFileSync(path.join(saida, `medidas${sufixo}.css`), gerarMedidasCss(rx))
    avisar(`Raio-x: ${secoes.length} seções, ${amostras.length} passos, cena principal na seção ${cenaPrincipal + 1}. Saída em ${saida}`)
    return rx
  } finally {
    if (antesDeFechar) { try { await antesDeFechar(nav) } catch {} }
    await nav.fechar()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let op
  try { op = lerArgs(process.argv.slice(2)) } catch (e) { console.error(e.message); process.exit(1) }
  if (op.movimento) {
    // --movimento: o movimento.mjs roda o raio-x (como biblioteca, com as medidas por alvo em memória) e o inventário.
    // Processo filho: importar o movimento.mjs daqui fecharia um ciclo de módulos com este arquivo ainda carregando.
    const telas = op.tambemCelular ? [false, true] : [op.celular]
    let codigo = 0
    for (const cel of telas) {
      const args = argsDoMovimento(op, cel)
      const c = await new Promise((ok) => { const f = spawn(process.execPath, args, { stdio: 'inherit' }); f.on('close', (n) => ok(n ?? 1)); f.on('error', () => ok(1)) })
      codigo = Math.max(codigo, c)
    }
    process.exit(codigo)
  }
  try {
    const r = await raioX(op)
    if (r?.parou) { console.error(r.parou); process.exit(2) }
  } catch (e) { console.error(e.message); process.exit(1) }
}
