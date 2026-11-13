// Vídeo de venda de um site pronto: MP4 em pé (1080 x 1920), 30 quadros por segundo, 10 a 15 s, sem som,
// mais a versão leve para mandar no WhatsApp. Sem dependência: usa o Chrome/Edge instalado (protocolo DevTools) e o ffmpeg.
//
// Como funciona: abre no Chrome sem janela uma página montada só para o vídeo (modelos/*.html). Dentro dela o site de
// verdade roda num quadro com tamanho de celular. O relógio do Chrome fica parado e anda 1/30 de segundo por quadro,
// então o que o site anima (entrada, rolagem) sai liso e igual toda vez. Cada quadro vira uma foto JPEG e vai para o ffmpeg.
// Com o relógio parado o Chrome trava a foto se o quadro do site se mexe ou some: o motor (motor.js) cuida disso.
//
// Uso:
//   node video-de-venda.mjs <pasta-do-build | http://endereço-local> --saida <pasta> --nome "Empresa"
//        --chamada "Frase de chamada" --contato "WhatsApp (00) 00000-0000"
//        [--sub "Ramo · Cidade"] [--botao "Pedir orçamento"] [--aviso "texto pequeno do fim"]
//        [--secao "#id=Rótulo" ...] [--modelo celular|cortes|destaques|todos|caminho/modelo.html]
//        [--cor-fundo #hex] [--cor-texto #hex] [--cor-destaque #hex] [--param chave=valor ...] [--so-checar] [--json]
//
// Saída (em --saida): video-<modelo>.mp4, video-<modelo>-leve.mp4 e video-<modelo>.json (relatório da checagem).
// Códigos de saída: 0 aprovado · 1 reprovado na checagem · 2 não deu para gerar (falta Chrome, ffmpeg ou dado).
// BROWSER_EXECUTABLE e FFMPEG_PATH apontam ferramentas fora do lugar padrão.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import zlib from 'node:zlib'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const MOTOR = path.join(AQUI, 'motor.js')
const PASTA_MODELOS = path.join(AQUI, '..', 'modelos')
export const MODELOS = ['celular', 'cortes', 'destaques']

// O quadro tem 432 x 768 px de CSS e sai 2,5 vezes maior: 1080 x 1920.
export const QUADRO = { largura: 432, altura: 768, escala: 2.5, fps: 30 }
export const REGRAS = {
  duracaoMin: 10, duracaoMax: 15, // segundos
  textoFinalS: 2, // chamada e contato inteiros na tela
  textoS: 0.8, // qualquer outro texto
  aberturaS: 3, // o nome da empresa aparece dentro desse começo
  letraPx: 28, // menor letra, em px do vídeo (1080 de largura)
  contraste: 4.5, contrasteGrande: 3, letraGrandePx: 60,
  siteParte: 0.5, // o site ocupa a maior parte do quadro em pelo menos metade do vídeo
  leveMaxMB: 6, leveAlvoMB: 5,
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const MB = (bytes) => bytes / (1024 * 1024)
const num = (n, casas = 1) => n.toFixed(casas).replace('.', ',')

// ---------------------------------------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------------------------------------
export function lerSecao(texto) {
  // "#id=Rótulo": divide no primeiro "=" fora de colchetes (seletor pode ter [data-x="y"]).
  let fundo = 0
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '[') fundo++
    else if (texto[i] === ']') fundo--
    else if (texto[i] === '=' && fundo === 0) return { seletor: texto.slice(0, i).trim(), rotulo: texto.slice(i + 1).trim() }
  }
  return { seletor: texto.trim(), rotulo: '' }
}

export function lerArgs(argv) {
  const op = { site: null, saida: null, nome: '', sub: '', chamada: '', contato: '', botao: '', aviso: '', secoes: [], modelo: 'celular', cores: {}, param: {}, soChecar: false, json: false, erros: [] }
  const comValor = { '--saida': 'saida', '--nome': 'nome', '--sub': 'sub', '--chamada': 'chamada', '--contato': 'contato', '--botao': 'botao', '--aviso': 'aviso', '--modelo': 'modelo' }
  const cores = { '--cor-fundo': 'fundo', '--cor-texto': 'texto', '--cor-destaque': 'destaque' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const valor = () => { const v = argv[++i]; if (v === undefined) op.erros.push(`Falta o valor de ${a}`); return v ?? '' }
    if (a === '--so-checar') op.soChecar = true
    else if (a === '--json') op.json = true
    else if (a in comValor) op[comValor[a]] = valor()
    else if (a in cores) { const c = valor(); if (/^#[0-9a-f]{6}$/i.test(c)) op.cores[cores[a]] = c.toLowerCase(); else op.erros.push(`${a} pede uma cor no formato #rrggbb`) }
    else if (a === '--secao') { const s = lerSecao(valor()); if (s.seletor) op.secoes.push(s) }
    else if (a === '--param') { const [k, ...resto] = valor().split('='); if (k) op.param[k] = resto.join('=') }
    else if (a.startsWith('--')) op.erros.push(`Opção desconhecida: ${a}`)
    else if (!op.site) op.site = a
    else op.erros.push(`Sobrou um argumento: ${a}`)
  }
  if (!op.site) op.erros.push('Informe a pasta do site pronto (com index.html) ou o endereço local dele')
  if (!op.saida) op.erros.push('Informe --saida <pasta>')
  for (const k of ['nome', 'chamada', 'contato']) if (!op[k].trim()) op.erros.push(`Informe --${k}`)
  return op
}

export function resolverModelos(pedido) {
  if (pedido === 'todos') return MODELOS.map((nome) => ({ nome, arquivo: path.join(PASTA_MODELOS, nome + '.html') }))
  if (MODELOS.includes(pedido)) return [{ nome: pedido, arquivo: path.join(PASTA_MODELOS, pedido + '.html') }]
  const arquivo = path.resolve(pedido)
  if (/\.html?$/i.test(arquivo) && fs.existsSync(arquivo)) return [{ nome: path.basename(arquivo).replace(/\.html?$/i, '').replace(/[^a-z0-9-]+/gi, '-'), arquivo }]
  throw new Error(`Modelo desconhecido: ${pedido} (use ${MODELOS.join(', ')}, todos ou o caminho de um .html)`)
}

export function lerSite(alvo) {
  if (/^https?:\/\//i.test(alvo)) { const u = new URL(alvo); return { tipo: 'url', origem: u.origin, caminho: u.pathname + u.search } }
  const abs = path.resolve(alvo)
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    if (!fs.existsSync(path.join(abs, 'index.html'))) throw new Error(`Não achei index.html em ${abs}`)
    return { tipo: 'pasta', raiz: abs, caminho: '/' }
  }
  if (fs.existsSync(abs) && /\.html?$/i.test(abs)) return { tipo: 'pasta', raiz: path.dirname(abs), caminho: '/' + encodeURIComponent(path.basename(abs)) }
  throw new Error(`Não achei o site: ${alvo} (informe a pasta do build, um arquivo .html ou um endereço http)`)
}

// ---------------------------------------------------------------------------------------------------------
// Checagem (regras puras: recebem medidas, devolvem os itens)
// ---------------------------------------------------------------------------------------------------------
const liso = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')
const citar = (t) => `"${t.length > 40 ? t.slice(0, 37) + '...' : t}"`

export function avaliar(m, regras = REGRAS) {
  const itens = []
  const item = (nome, falhas, bom) => itens.push({ n: itens.length + 1, nome, estado: falhas.length ? 'reprovou' : 'passou', motivo: falhas.length ? falhas.join('; ') : bom })
  const pulou = (nome, motivo) => itens.push({ n: itens.length + 1, nome, estado: 'pulou', motivo })
  const textos = m.textos || []

  item('duração', m.duracao < regras.duracaoMin || m.duracao > regras.duracaoMax ? [`o vídeo tem ${num(m.duracao)} s; precisa ter de ${regras.duracaoMin} a ${regras.duracaoMax} s`] : [], `${num(m.duracao)} s`)

  const nome = liso(m.nome)
  const abertura = textos.find((t) => nome && liso(t.texto).includes(nome) && t.primeiroS !== null && t.primeiroS <= regras.aberturaS && t.visivelS >= regras.textoS)
  item('abertura com o nome', abertura ? [] : [`o nome da empresa não aparece inteiro nos primeiros ${regras.aberturaS} s`], abertura ? `nome na tela aos ${num(abertura.primeiroS)} s` : '')

  const finais = textos.filter((t) => t.fim)
  const falhasFim = []
  for (const [rotulo, valor] of [['a chamada', m.chamada], ['o contato', m.contato]]) {
    if (valor && !finais.some((t) => liso(t.texto).includes(liso(valor)))) falhasFim.push(`${rotulo} não está no fecho do vídeo`)
  }
  if (!finais.length) falhasFim.push('o vídeo não tem texto de fecho (data-fim)')
  for (const t of finais) if (t.visivelS < regras.textoFinalS) falhasFim.push(`${citar(t.texto)} fica ${num(t.visivelS, 2)} s inteiro na tela; o mínimo é ${regras.textoFinalS} s`)
  item('texto final na tela', falhasFim, `${finais.length} texto(s) por pelo menos ${num(Math.min(...finais.map((t) => t.visivelS), 99), 2)} s`)

  const curtos = textos.filter((t) => !t.fim && t.visivelS < regras.textoS)
  item('tempo de leitura', curtos.map((t) => (t.visivelS ? `${citar(t.texto)} fica só ${num(t.visivelS, 2)} s inteiro na tela` : `${citar(t.texto)} nunca aparece inteiro`)), `todo texto fica pelo menos ${num(regras.textoS)} s`)

  const pequenos = textos.filter((t) => t.px !== null && t.px < regras.letraPx - 0.05)
  const menor = Math.min(...textos.filter((t) => t.px !== null).map((t) => t.px), 999)
  item('tamanho da letra', pequenos.map((t) => `${citar(t.texto)} sai com ${num(t.px)} px; o mínimo é ${regras.letraPx} px`), `menor letra: ${num(menor)} px`)

  const medidos = textos.filter((t) => typeof t.contraste === 'number')
  if (!medidos.length) pulou('contraste', 'não medido')
  else {
    const fracos = medidos.filter((t) => t.contraste < (t.px >= regras.letraGrandePx ? regras.contrasteGrande : regras.contraste))
    item('contraste', fracos.map((t) => `${citar(t.texto)} tem contraste ${num(t.contraste)} com o fundo; o mínimo é ${num(t.px >= regras.letraGrandePx ? regras.contrasteGrande : regras.contraste)}`), `menor contraste: ${num(Math.min(...medidos.map((t) => t.contraste)))}`)
  }

  if (!m.site) pulou('site no quadro', 'não medido')
  else item('site no quadro', m.site.maioriaS < m.duracao / 2 ? [`o site ocupa a maior parte do quadro só em ${num(m.site.maioriaS)} s de ${num(m.duracao)} s`] : [], `site grande em ${num(m.site.maioriaS)} s de ${num(m.duracao)} s (no auge, ${Math.round(m.site.pico * 100)}% do quadro)`)

  if (!m.arquivo) pulou('arquivo', 'vídeo não gerado (--so-checar)')
  else {
    const a = m.arquivo, f = []
    if (a.largura !== QUADRO.largura * QUADRO.escala || a.altura !== QUADRO.altura * QUADRO.escala) f.push(`saiu com ${a.largura} x ${a.altura}; o certo é 1080 x 1920`)
    if (Math.abs(a.fps - QUADRO.fps) > 0.01) f.push(`saiu com ${a.fps} quadros por segundo; o certo é ${QUADRO.fps}`)
    if (a.quadros !== m.quadros) f.push(`saiu com ${a.quadros} quadros; o certo é ${m.quadros}`)
    item('arquivo', f, `${a.largura} x ${a.altura}, ${a.fps} quadros por segundo, ${a.quadros} quadros`)
  }

  if (!m.leve) pulou('versão leve', 'vídeo não gerado (--so-checar)')
  else item('versão leve', MB(m.leve.bytes) >= regras.leveMaxMB ? [`a versão leve tem ${num(MB(m.leve.bytes))} MB; precisa ficar abaixo de ${regras.leveMaxMB} MB`] : [], `${num(MB(m.leve.bytes))} MB`)

  return itens
}

// ---------------------------------------------------------------------------------------------------------
// Contraste medido nos pixels (fundo de verdade atrás do texto)
// ---------------------------------------------------------------------------------------------------------
export function decodificarPng(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG')
  let pos = 8, largura = 0, altura = 0, tipo = 0, bits = 0
  const partes = []
  while (pos + 8 <= buf.length) {
    const tam = buf.readUInt32BE(pos), nome = buf.toString('latin1', pos + 4, pos + 8), dados = buf.subarray(pos + 8, pos + 8 + tam)
    if (nome === 'IHDR') { largura = dados.readUInt32BE(0); altura = dados.readUInt32BE(4); bits = dados[8]; tipo = dados[9]; if (dados[12]) throw new Error('PNG entrelaçado') }
    else if (nome === 'IDAT') partes.push(dados)
    else if (nome === 'IEND') break
    pos += 12 + tam
  }
  if (bits !== 8 || (tipo !== 2 && tipo !== 6)) throw new Error('PNG fora do esperado (precisa ser RGB ou RGBA de 8 bits)')
  const canais = tipo === 6 ? 4 : 3, linha = largura * canais
  const bruto = zlib.inflateSync(Buffer.concat(partes))
  const saida = Buffer.alloc(largura * altura * 4)
  let anterior = Buffer.alloc(linha)
  for (let y = 0; y < altura; y++) {
    const filtro = bruto[y * (linha + 1)]
    const atual = Buffer.from(bruto.subarray(y * (linha + 1) + 1, (y + 1) * (linha + 1)))
    for (let x = 0; x < linha; x++) {
      const a = x >= canais ? atual[x - canais] : 0, b = anterior[x], c = x >= canais ? anterior[x - canais] : 0
      let soma = 0
      if (filtro === 1) soma = a
      else if (filtro === 2) soma = b
      else if (filtro === 3) soma = (a + b) >> 1
      else if (filtro === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); soma = pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      atual[x] = (atual[x] + soma) & 255
    }
    for (let x = 0; x < largura; x++) {
      const o = (y * largura + x) * 4, i = x * canais
      saida[o] = atual[i]; saida[o + 1] = atual[i + 1]; saida[o + 2] = atual[i + 2]; saida[o + 3] = canais === 4 ? atual[i + 3] : 255
    }
    anterior = atual
  }
  return { largura, altura, dados: saida }
}

const canal = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const luz = (r, g, b) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
export function razaoDeContraste(a, b) { const x = luz(...a), y = luz(...b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

// cor: [r, g, b, a] do texto; imagem: o fundo atrás dele (sem o texto). Devolve o contraste que vale para 90% do fundo.
export function medirContraste(cor, opacidade, imagem) {
  const a = Math.min(1, (cor[3] ?? 1) * (opacidade ?? 1))
  const passo = Math.max(1, Math.floor(Math.sqrt((imagem.largura * imagem.altura) / 8000)))
  const razoes = []
  for (let y = 0; y < imagem.altura; y += passo) {
    for (let x = 0; x < imagem.largura; x += passo) {
      const o = (y * imagem.largura + x) * 4
      const fundo = [imagem.dados[o], imagem.dados[o + 1], imagem.dados[o + 2]]
      const texto = [0, 1, 2].map((i) => cor[i] * a + fundo[i] * (1 - a))
      razoes.push(razaoDeContraste(texto, fundo))
    }
  }
  razoes.sort((x, y) => x - y)
  const em = (p) => Math.round(razoes[Math.min(razoes.length - 1, Math.floor(razoes.length * p))] * 100) / 100
  return { p10: em(0.1), mediana: em(0.5) }
}

// ---------------------------------------------------------------------------------------------------------
// Ferramentas da máquina
// ---------------------------------------------------------------------------------------------------------
export function acharNavegador() {
  if (process.env.BROWSER_EXECUTABLE) return fs.existsSync(process.env.BROWSER_EXECUTABLE) ? process.env.BROWSER_EXECUTABLE : null
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((p) => fs.existsSync(p)) || null
}

export function acharFfmpeg() {
  const exe = process.env.FFMPEG_PATH || 'ffmpeg'
  try { return spawnSync(exe, ['-version'], { stdio: 'ignore', windowsHide: true }).status === 0 ? exe : null } catch { return null }
}

async function abrirNavegador(executavel) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'video-venda-'))
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--disable-extensions',
    // Sem tarefas de fundo do navegador: não baixam nem gravam nada no perfil enquanto o vídeo é feito.
    '--disable-component-update', '--disable-background-networking', '--disable-sync', '--disable-default-apps', '--no-pings', '--disable-breakpad',
    'about:blank']
  if (process.platform === 'linux' && process.env.CI) args.unshift('--no-sandbox')
  const proc = spawn(executavel, args, { stdio: 'ignore', windowsHide: true })
  const saiu = new Promise((ok) => proc.once('exit', ok))
  let ws = null
  // Fecha sempre: derruba o Chrome e apaga o perfil temporário.
  const vivo = () => proc.exitCode === null && proc.signalCode === null
  const fechar = async () => {
    try { ws?.close() } catch {}
    if (process.platform === 'win32') {
      // No Windows, derruba o Chrome junto com os processos filhos enquanto o pai ainda existe: filho que sobra
      // continua gravando na pasta do perfil e ela reaparece depois de apagada. O perfil é descartável.
      if (vivo()) { try { spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }) } catch {} }
    } else {
      try { proc.kill('SIGTERM') } catch {}
      await Promise.race([saiu, espera(3000)])
    }
    if (vivo()) { try { proc.kill('SIGKILL') } catch {} }
    await Promise.race([saiu, espera(3000)])
    // A pasta fica presa um instante depois que os processos saem: apaga, confere de novo e insiste por até uns 10 s.
    for (let i = 0, limpo = 0; i < 40 && limpo < 2; i++) {
      try { fs.rmSync(perfil, { recursive: true, force: true }); limpo = fs.existsSync(perfil) ? 0 : limpo + 1 } catch { limpo = 0 }
      if (limpo < 2) await espera(250)
    }
  }
  try {
    let porta
    for (let i = 0; i < 100 && !porta; i++) {
      await espera(150)
      try { porta = Number(fs.readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]) } catch {}
    }
    let alvo
    for (let i = 0; i < 40 && porta && !alvo; i++) {
      try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()).find((t) => t.type === 'page') } catch {}
      if (!alvo) await espera(150)
    }
    if (!alvo) throw new Error('Não consegui abrir o Chrome/Edge sem janela.')
    ws = new WebSocket(alvo.webSocketDebuggerUrl)
    await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', () => j(new Error('Não consegui conversar com o Chrome/Edge.')), { once: true }) })
  } catch (e) { await fechar(); throw e }
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
    try { ws.send(JSON.stringify({ id: n, method, params })) } catch (e) { clearTimeout(t); pendentes.delete(n); reject(e) }
  })
  const ouvir = (metodo, f) => { if (!ouvintes.has(metodo)) ouvintes.set(metodo, []); ouvintes.get(metodo).push(f) }
  return { cmd, ouvir, fechar }
}

// ---------------------------------------------------------------------------------------------------------
// Servidor local: o site em "/" e a página do vídeo em "/__video__/" (mesma origem, para o vídeo poder rolar o site)
// ---------------------------------------------------------------------------------------------------------
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
}
const SEM_REPASSE = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive', 'x-frame-options', 'content-security-policy', 'content-security-policy-report-only'])

export async function criarServidor(site, modeloArquivo) {
  const enviar = (res, arquivo, cache) => {
    fs.readFile(arquivo, (erro, corpo) => {
      if (erro) { res.writeHead(404).end(); return }
      res.writeHead(200, { 'content-type': TIPOS[path.extname(arquivo).toLowerCase()] ?? 'application/octet-stream', 'cache-control': cache ? 'max-age=600' : 'no-store' })
      res.end(corpo)
    })
  }
  const servidor = http.createServer(async (req, res) => {
    let caminho
    try { caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname) } catch { res.writeHead(400).end(); return }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
    if (caminho.startsWith('/__video__/')) {
      const nome = path.basename(caminho)
      enviar(res, nome === 'modelo.html' ? modeloArquivo : nome === 'motor.js' ? MOTOR : path.join(path.dirname(modeloArquivo), nome), false)
      return
    }
    if (site.tipo === 'pasta') {
      let arquivo = path.join(site.raiz, caminho)
      if (arquivo !== site.raiz && !arquivo.startsWith(site.raiz + path.sep)) { res.writeHead(403).end(); return }
      try { if (fs.statSync(arquivo).isDirectory()) arquivo = path.join(arquivo, 'index.html') } catch {}
      if (!fs.existsSync(arquivo) && !path.extname(caminho)) arquivo = path.join(site.raiz, 'index.html') // rota de aplicativo
      enviar(res, arquivo, true)
      return
    }
    // Site rodando em outro endereço local: repassa o pedido.
    try {
      const r = await fetch(site.origem + req.url, { headers: { accept: req.headers.accept || '*/*' }, redirect: 'manual' })
      const cabecalhos = {}
      for (const [k, v] of r.headers) if (!SEM_REPASSE.has(k)) cabecalhos[k] = k === 'location' ? v.replace(site.origem, '') : v
      res.writeHead(r.status, cabecalhos)
      res.end(req.method === 'HEAD' ? undefined : Buffer.from(await r.arrayBuffer()))
    } catch { res.writeHead(502).end() }
  })
  await new Promise((ok, erro) => { servidor.once('error', erro); servidor.listen(0, '127.0.0.1', ok) })
  const fechar = () => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(() => ok()) })
  return { base: `http://127.0.0.1:${servidor.address().port}`, fechar }
}

// ---------------------------------------------------------------------------------------------------------
// ffmpeg
// ---------------------------------------------------------------------------------------------------------
function rodarFfmpeg(exe, args) {
  return new Promise((ok, erro) => {
    const p = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    let texto = ''
    p.stderr.on('data', (d) => { texto = (texto + d).slice(-20000) })
    p.on('error', erro)
    p.on('close', (codigo) => ok({ codigo, texto }))
  })
}

// Lê do próprio ffmpeg o tamanho, os quadros por segundo e a contagem de quadros do arquivo.
export async function sondar(exe, arquivo) {
  const { texto } = await rodarFfmpeg(exe, ['-hide_banner', '-nostdin', '-i', arquivo, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-'])
  const fluxo = texto.match(/Stream #0:0[^\n]*Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b[^\n]*?([\d.]+) fps/)
  const dur = texto.match(/Duration: (\d+):(\d+):([\d.]+)/)
  const quadros = [...texto.matchAll(/frame=\s*(\d+)/g)].pop()
  if (!fluxo || !quadros) throw new Error('O ffmpeg não conseguiu ler o vídeo gerado.')
  return {
    largura: Number(fluxo[1]), altura: Number(fluxo[2]), fps: Number(fluxo[3]), quadros: Number(quadros[1]),
    duracao: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : null, bytes: fs.statSync(arquivo).size,
  }
}

// Versão leve para WhatsApp: aperta até ficar perto de 4 a 5 MB; se não der, diminui o quadro para 720 x 1280.
async function versaoLeve(exe, origem, destino) {
  const tentativas = [{ crf: 27 }, { crf: 30 }, { crf: 33 }, { crf: 30, escala: 720 }, { crf: 34, escala: 720 }]
  let ultima = null
  for (const t of tentativas) {
    const args = ['-hide_banner', '-nostdin', '-y', '-i', origem, ...(t.escala ? ['-vf', `scale=${t.escala}:-2:flags=lanczos`] : []),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(t.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', destino]
    const r = await rodarFfmpeg(exe, args)
    if (r.codigo !== 0) throw new Error('O ffmpeg falhou ao gerar a versão leve: ' + r.texto.trim().split('\n').pop())
    ultima = { bytes: fs.statSync(destino).size, crf: t.crf, largura: t.escala || QUADRO.largura * QUADRO.escala }
    if (MB(ultima.bytes) <= REGRAS.leveAlvoMB) break
  }
  return ultima
}

// ---------------------------------------------------------------------------------------------------------
// Geração de um vídeo
// ---------------------------------------------------------------------------------------------------------
export async function gerar(op, modelo, amb, avisar = () => {}) {
  const inicio = Date.now()
  const site = lerSite(op.site)
  const saida = path.resolve(op.saida)
  fs.mkdirSync(saida, { recursive: true })
  const arquivos = { video: path.join(saida, `video-${modelo.nome}.mp4`), leve: path.join(saida, `video-${modelo.nome}-leve.mp4`), relatorio: path.join(saida, `video-${modelo.nome}.json`) }
  const servidor = await criarServidor(site, modelo.arquivo)
  let nav = null, codificador = null
  try {
    nav = await abrirNavegador(amb.navegador)
    const { cmd, ouvir } = nav
    // Com o relógio parado, promessa não volta: só "esperar" (awaitPromise) antes de congelar.
    const rodar = async (expressao, esperar = false) => {
      const r = await cmd('Runtime.evaluate', { expression: expressao, returnByValue: true, ...(esperar ? { awaitPromise: true } : {}) }, 120_000)
      if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).split('\n')[0].replace(/^Error: /, ''))
      return r.result.value
    }
    await cmd('Page.enable')
    const { userAgent } = await cmd('Browser.getVersion')
    const versao = (userAgent.match(/Chrome\/([\d.]+)/) || [])[1] || '120.0.0.0'
    await cmd('Emulation.setDeviceMetricsOverride', { width: QUADRO.largura, height: QUADRO.altura, deviceScaleFactor: QUADRO.escala, mobile: true })
    await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await cmd('Emulation.setUserAgentOverride', { userAgent: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/${versao} Mobile Safari/537.36` })
    await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })

    let carregou = false
    ouvir('Page.loadEventFired', () => { carregou = true })
    const r = await cmd('Page.navigate', { url: `${servidor.base}/__video__/modelo.html?site=${encodeURIComponent(site.caminho)}` })
    if (r.errorText) throw new Error(`Não abriu a página do vídeo: ${r.errorText}`)
    for (let i = 0; i < 120 && !carregou; i++) await espera(250)
    if (!(await rodar('typeof window.Video === "object"'))) throw new Error('O modelo não carregou o motor (falta <script src="motor.js">).')

    const dados = { nome: op.nome.trim(), sub: op.sub.trim(), chamada: op.chamada.trim(), contato: op.contato.trim(), botao: op.botao.trim(), aviso: op.aviso.trim(), secoes: op.secoes, cores: op.cores, param: op.param }
    const info = await rodar(`Video.preparar(${JSON.stringify(dados)})`, true)
    const parado = (t) => info.congelados.some(([de, ate]) => t >= de && t < ate)
    const medidas = await rodar('Video.conferir()')
    const quadros = medidas.quadros
    const amostras = new Map()
    for (const t of medidas.textos) if (t.amostra >= 0 && t.caixa && t.caixa.w > 1 && t.caixa.h > 1) amostras.set(t.amostra, [...(amostras.get(t.amostra) || []), t])
    const medirFundo = async (t) => {
      await rodar(`Video.esconderTexto(${t.i}, true)`)
      try {
        const foto = await cmd('Page.captureScreenshot', { format: 'png', clip: { x: t.caixa.x, y: t.caixa.y, width: t.caixa.w, height: t.caixa.h, scale: 1 } })
        t.contraste = medirContraste(t.cor, t.opacidade, decodificarPng(Buffer.from(foto.data, 'base64'))).p10
      } finally { await rodar(`Video.esconderTexto(${t.i}, false)`) }
    }

    let arquivo = null, leve = null
    if (op.soChecar) {
      for (const q of [...amostras.keys()].sort((a, b) => a - b)) {
        await rodar(`Video.ir(${q / QUADRO.fps})`)
        await espera(200)
        for (const t of amostras.get(q)) await medirFundo(t)
      }
    } else {
      // Recarrega o site para ele começar do zero e congela o relógio assim que carregar. O site precisa estar à
      // vista nessa hora: recarregado escondido ou fora do quadro, o Chrome trava a primeira foto com o relógio parado.
      await rodar(`Video.ir(${medidas.site.quadroCheio / QUADRO.fps}, true)`)
      const { frameTree } = await cmd('Page.getFrameTree')
      const recarregou = new Promise((ok) => ouvir('Page.frameStoppedLoading', (p) => { if (p.frameId !== frameTree.frame.id) ok(true) }))
      await rodar('Video.recarregarSite()')
      if (!(await Promise.race([recarregou, espera(20_000).then(() => false)]))) throw new Error('O site não recarregou para a gravação.')
      // Só para o relógio com o pulso do motor já batendo dentro do site: site sem animação nenhuma trava a foto sem ele.
      for (let i = 0; i < 100 && (await rodar('Video.pulso()')) < 2; i++) await espera(5)
      await cmd('Emulation.setVirtualTimePolicy', { policy: 'pause' })
      await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 30 }) // primeira pintura do site recarregado (foto descartada)
      let aoExpirar = null
      ouvir('Emulation.virtualTimeBudgetExpired', () => { const f = aoExpirar; aoExpirar = null; if (f) f() })
      const avancar = (ms) => new Promise((ok, erro) => {
        const t = setTimeout(() => erro(new Error('O relógio do Chrome não respondeu.')), 30_000)
        aoExpirar = () => { clearTimeout(t); ok() }
        cmd('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }).catch(erro)
      })
      const passo = 1000 / QUADRO.fps
      let ligado = await rodar('Video.religar()')
      for (let i = 0; i < 20 && (ligado.secoes < ligado.de || ligado.alturaTotal < info.site.alturaTotal * 0.8); i++) { await avancar(passo); ligado = await rodar('Video.religar()') }
      // As fotos do site carregam em tempo real, com o relógio parado: espera todas antes do primeiro quadro, para
      // nenhuma chegar no meio do vídeo (máquina ocupada não muda o resultado).
      for (let i = 0; i < 160 && (await rodar('Video.imagensFaltando()')) > 0; i++) await espera(50)

      codificador = spawn(amb.ffmpeg, ['-hide_banner', '-nostdin', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(QUADRO.fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', arquivos.video], { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true })
      let erroFfmpeg = ''
      codificador.stderr.on('data', (d) => { erroFfmpeg = (erroFfmpeg + d).slice(-4000) })
      codificador.stdin.on('error', () => {})
      const terminou = new Promise((ok) => codificador.on('close', ok))

      let ultimoCorte = -1, fotosFeitas = 0
      for (let q = 0; q < quadros; q++) {
        const t = q / QUADRO.fps
        // Foto do site pedida pelo modelo: tirada antes de montar o quadro, com o site como está agora.
        for (; fotosFeitas < info.fotos.length && info.fotos[fotosFeitas] <= t + 1e-6; fotosFeitas++) {
          const c = await rodar('Video.fotografar(true)')
          const copia = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 97, clip: { x: c.x, y: c.y, width: c.w, height: c.h, scale: 1 } })
          await rodar(`Video.porFoto(${fotosFeitas}, "${copia.data}")`)
          await rodar('Video.fotografar(false)')
        }
        const corte = await rodar(`Video.ir(${t})`)
        if (!parado(t)) {
          let ms = passo
          if (corte !== ultimoCorte) { if (corte >= 0) ms += info.assentar[corte] || 0; ultimoCorte = corte }
          await avancar(ms)
        }
        const foto = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 93 })
        if (codificador.exitCode !== null) throw new Error('O ffmpeg parou no meio: ' + erroFfmpeg.trim())
        if (!codificador.stdin.write(Buffer.from(foto.data, 'base64'))) await new Promise((ok) => codificador.stdin.once('drain', ok))
        for (const tx of amostras.get(q) || []) await medirFundo(tx)
        if (q % 60 === 59) avisar(`  ${modelo.nome}: ${q + 1} de ${quadros} quadros`)
      }
      codificador.stdin.end()
      const codigo = await terminou
      codificador = null
      if (codigo !== 0) throw new Error('O ffmpeg falhou ao juntar os quadros: ' + erroFfmpeg.trim())
      leve = await versaoLeve(amb.ffmpeg, arquivos.video, arquivos.leve)
      arquivo = await sondar(amb.ffmpeg, arquivos.video)
    }

    const paraAvaliar = { nome: dados.nome, chamada: dados.chamada, contato: dados.contato, duracao: medidas.duracao, quadros, textos: medidas.textos, site: medidas.site, arquivo, leve }
    const itens = avaliar(paraAvaliar)
    const reprovou = itens.some((i) => i.estado === 'reprovou')
    const relatorio = {
      modelo: modelo.nome, resultado: reprovou ? 'reprovado' : 'aprovado', codigo: reprovou ? 1 : 0,
      duracao: medidas.duracao, quadros, geradoEmS: Math.round((Date.now() - inicio) / 100) / 10,
      video: op.soChecar ? null : arquivos.video, leve: op.soChecar ? null : arquivos.leve,
      tamanhoMB: arquivo ? Math.round(MB(arquivo.bytes) * 10) / 10 : null, leveMB: leve ? Math.round(MB(leve.bytes) * 10) / 10 : null, leveLargura: leve ? leve.largura : null,
      cores: info.cores, fontes: { titulo: info.fontes.titulo.familia, corpo: info.fontes.corpo.familia }, secoes: info.secoes, site: { ...info.site, ...medidas.site },
      avisos: [...info.avisos, ...(info.cores.textoDoSite === false ? ['A cor do texto não veio do site (nenhuma cor dele dava leitura no fundo escolhido): use --cor-texto se quiser outra.'] : [])],
      itens, textos: medidas.textos.map(({ texto, fim, visivelS, px, contraste }) => ({ texto, fim, visivelS, px, contraste: contraste ?? null })),
    }
    if (!op.soChecar) fs.writeFileSync(arquivos.relatorio, JSON.stringify(relatorio, null, 2) + '\n')
    return relatorio
  } finally {
    if (codificador) { try { codificador.stdin.destroy() } catch {} try { codificador.kill() } catch {} }
    if (nav) await nav.fechar()
    await servidor.fechar()
  }
}

// ---------------------------------------------------------------------------------------------------------
// Linha de comando
// ---------------------------------------------------------------------------------------------------------
const USO = `Uso: node video-de-venda.mjs <pasta-do-build | http://endereço-local> --saida <pasta> --nome "Empresa" --chamada "Frase" --contato "WhatsApp (00) 00000-0000"
       [--sub "Ramo · Cidade"] [--botao "Pedir orçamento"] [--aviso "texto pequeno"] [--secao "#id=Rótulo" ...]
       [--modelo celular|cortes|destaques|todos|arquivo.html] [--cor-fundo #hex] [--cor-texto #hex] [--cor-destaque #hex] [--so-checar] [--json]`

export function resumoTexto(rel) {
  const linhas = [`Vídeo de venda (${rel.modelo}): ${rel.resultado.toUpperCase()} · ${num(rel.duracao)} s · ${rel.quadros} quadros · ${num(rel.geradoEmS)} s para gerar`]
  if (rel.video) linhas.push(`  ${rel.video} (${num(rel.tamanhoMB)} MB)`, `  ${rel.leve} (${num(rel.leveMB)} MB, para o WhatsApp)`)
  for (const i of rel.itens) linhas.push(`  ${i.estado === 'passou' ? 'ok ' : i.estado === 'pulou' ? '-- ' : 'NÃO'} ${i.nome}: ${i.motivo}`)
  for (const a of rel.avisos) linhas.push(`  aviso: ${a}`)
  return linhas.join('\n')
}

export async function executar(argv) {
  const op = lerArgs(argv)
  const falar = (t) => { if (!op.json) console.log(t) }
  if (op.erros.length) { console.error(op.erros.join('\n') + '\n\n' + USO); return 2 }
  let modelos
  try { modelos = resolverModelos(op.modelo); lerSite(op.site) } catch (e) { console.error(e.message); return 2 }
  const amb = { navegador: acharNavegador(), ffmpeg: op.soChecar ? 'ffmpeg' : acharFfmpeg() }
  if (!amb.navegador) { console.error('Chrome/Edge não encontrado: instale um deles ou defina BROWSER_EXECUTABLE'); return 2 }
  if (!amb.ffmpeg) { console.error('ffmpeg não encontrado: instale o ffmpeg ou defina FFMPEG_PATH'); return 2 }
  let pior = 0
  const relatorios = []
  for (const modelo of modelos) {
    try {
      const rel = await gerar(op, modelo, amb, (t) => { if (!op.json) console.error(t) })
      relatorios.push(rel)
      falar(resumoTexto(rel))
      pior = Math.max(pior, rel.codigo)
    } catch (e) {
      console.error(`Vídeo de venda (${modelo.nome}): não deu para gerar: ${e.message}`)
      pior = 2
    }
  }
  if (op.json) console.log(JSON.stringify(relatorios.length === 1 ? relatorios[0] : relatorios, null, 2))
  return pior
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const codigo = await executar(process.argv.slice(2))
  process.exit(codigo)
}
