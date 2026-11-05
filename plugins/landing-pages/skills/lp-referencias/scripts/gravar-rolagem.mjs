// Grava um site de referência rolando (vídeo .webm) e salva 6 quadros-chave — print parado não mostra animação.
// Uso: node gravar-rolagem.mjs <url> <pasta-de-saida> [--celular] [--segundos 14] [--nome slug]
// --nome distingue páginas do mesmo host; BROWSER_EXECUTABLE e FFMPEG_PATH permitem ferramentas fora do PATH.
// Precisa de puppeteer-core no projeto atual (npm i -D puppeteer-core), do Edge instalado e do ffmpeg no PATH.
// Só para estudo da referência; nada é publicado.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const posicionais = []
let nomeEscolhido
let segundos = 14
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--celular') continue
  if (arg === '--nome' || arg === '--segundos') {
    const valor = args[++i]
    if (!valor || valor.startsWith('--')) { console.error(`Falta valor para ${arg}`); process.exit(1) }
    if (arg === '--nome') nomeEscolhido = valor
    else segundos = Number(valor)
  } else if (arg.startsWith('--')) { console.error(`Opção desconhecida: ${arg}`); process.exit(1) }
  else posicionais.push(arg)
}
const [url, saida] = posicionais
const celular = args.includes('--celular')
if (!url || !saida || posicionais.length !== 2) { console.log('Uso: node gravar-rolagem.mjs <url> <pasta-de-saida> [--celular] [--segundos 14] [--nome slug]'); process.exit(1) }
if (!Number.isFinite(segundos) || segundos < 1 || segundos > 120) { console.error('--segundos deve estar entre 1 e 120'); process.exit(1) }
if (nomeEscolhido !== undefined && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(nomeEscolhido)) { console.error('--nome deve ser um slug de até 80 caracteres'); process.exit(1) }
let endereco
try { endereco = new URL(url); if (!['http:', 'https:'].includes(endereco.protocol)) throw new Error() }
catch { console.error('Informe uma URL HTTP ou HTTPS válida'); process.exit(1) }

// puppeteer-core vem do projeto onde o comando é rodado (o plugin não tem node_modules próprio).
let puppeteer
try {
  const exigir = createRequire(path.join(process.cwd(), 'package.json'))
  puppeteer = (await import(pathToFileURL(exigir.resolve('puppeteer-core')).href)).default
} catch {
  console.log('Instale no projeto: npm i -D puppeteer-core'); process.exit(1)
}
const edge = process.env.BROWSER_EXECUTABLE || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(fs.existsSync)
fs.mkdirSync(saida, { recursive: true })
const nome = (nomeEscolhido || endereco.hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '-')) + (celular ? '-celular' : '')

const navegador = await puppeteer.launch({ executablePath: edge, headless: true,
  userDataDir: path.resolve(saida, '.perfis', nome),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const pagina = await navegador.newPage()
  await pagina.setViewport(celular ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
  try {
    await pagina.goto(url, { waitUntil: 'networkidle2', timeout: 25000 })
  } catch (e) {
    // Site com vídeo, chat ou rastreador nunca "sossega" a rede: segue com o que já carregou.
    if (!/timeout/i.test(e.message)) throw e
  }
  await new Promise((r) => setTimeout(r, 2500)) // deixa a abertura animar
  // Site com tela de carregamento trava a rolagem até terminar: espera liberar (até 15 s).
  for (let t = 0; t < 30; t++) {
    const liberou = await pagina.evaluate(() => [document.scrollingElement || document.documentElement, ...document.querySelectorAll('body *')]
      .some((el) => el.scrollHeight - el.clientHeight > innerHeight * 0.5))
    if (liberou) break
    await new Promise((r) => setTimeout(r, 500))
  }
  // Alguns sites rolam dentro de um elemento próprio (não no documento): acha o maior que rola.
  let altura = await pagina.evaluate(() => {
    const doc = document.scrollingElement || document.documentElement
    let alvo = doc, max = doc.scrollHeight - innerHeight
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el)
      const sobra = el.scrollHeight - el.clientHeight
      if (/(auto|scroll)/.test(s.overflowY) && el.clientHeight > innerHeight * 0.5 && sobra > max) { alvo = el; max = sobra }
    }
    window.__alvoRolagem = alvo
    return max
  })
  // Rola pela roda do mouse; se o site ignorar a roda simulada, empurra a rolagem direto no elemento.
  // Confere a cada 20 passos (conferir em todo passo deixa página pesada lenta demais e estourava o tempo).
  // Rolagem "virtual" (a página não mostra a altura real e anda por transform): só a roda funciona.
  const virtual = altura < 200
  if (virtual) altura = 8000
  const posicao = () => pagina.evaluate(() => window.__alvoRolagem.scrollTop || scrollY)
  let pelaRoda = true
  let ultima = await posicao()
  const rolar = async (passo, i) => {
    if (pelaRoda) {
      await pagina.mouse.wheel({ deltaY: passo })
      await new Promise((r) => setTimeout(r, 50))
      if (!virtual && i % 20 === 19) { const agora = await posicao(); if (agora <= ultima) pelaRoda = false; ultima = agora }
      return
    }
    await pagina.evaluate((p) => {
      const alvo = window.__alvoRolagem
      alvo === (document.scrollingElement || document.documentElement) ? scrollBy(0, p) : (alvo.scrollTop += p)
    }, passo)
  }

  const video = path.join(saida, `${nome}.webm`)
  const gravacao = await pagina.screencast({ path: video, ...(process.env.FFMPEG_PATH ? { ffmpegPath: process.env.FFMPEG_PATH } : {}) })
  const passos = segundos * 20
  // passo da rolagem → porcentagem no nome do quadro (000, 020 ... 100)
  const quadros = new Map([0, 20, 40, 60, 80, 100].map((p) => [Math.round(p / 100 * passos), String(p).padStart(3, '0')]))
  for (let i = 0; i <= passos; i++) {
    // Rolagem como um visitante de verdade (dispara as cenas e o scroll suave do site).
    await rolar(Math.max(1, altura / passos), i)
    if (quadros.has(i)) await pagina.screenshot({ path: path.join(saida, `${nome}-${quadros.get(i)}.png`) })
  }
  await new Promise((r) => setTimeout(r, 800))
  await gravacao.stop()
  // O screencast usa stream: o WebM pode sair sem duração e sem busca pelos controles.
  // Remux para arquivo regular, sem recodificar nem perder qualidade.
  const finalizando = video + '.finalizando.webm'
  try {
    execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-i', video, '-c', 'copy', finalizando], { stdio: 'pipe', timeout: 30000 })
    fs.renameSync(finalizando, video)
  } finally { if (fs.existsSync(finalizando)) fs.rmSync(finalizando) }
  console.log(`Gravado: ${video} + 6 quadros (${altura}px de rolagem em ~${segundos}s)`)
} finally {
  const encerrar = setTimeout(() => navegador.process()?.kill(), 5000)
  try { await navegador.close() } finally { clearTimeout(encerrar) }
}
