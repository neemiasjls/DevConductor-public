// Prepara o material do video a partir da prova (somente leitura la):
// 1. copia fontes e fotos para assets/ (pasta gerada, fora do git);
// 2. abre o site pronto (dist) num Chrome sem janela, em tamanho de celular, e tira as telas.
// Uso: node preparar.mjs
import { createServer } from 'node:http'
import { readFile, mkdir, copyFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const aqui = dirname(fileURLToPath(import.meta.url))
const prova = join(aqui, '..', 'prova-referencia', 'marcenaria-aroeira')
const dist = join(prova, 'dist')
const saida = join(aqui, 'assets')

const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.json': 'application/json' }

function acharChrome() {
  const candidatos = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  const achado = candidatos.find((c) => existsSync(c))
  if (!achado) throw new Error('Chrome nao encontrado: defina a variavel CHROME com o caminho do executavel.')
  return achado
}

async function copiar() {
  await mkdir(join(saida, 'fonts'), { recursive: true })
  await mkdir(join(saida, 'img'), { recursive: true })
  await mkdir(join(saida, 'telas'), { recursive: true })
  const fontes = (await readdir(join(dist, 'assets'))).filter((f) => /^(bodoni-moda-latin-400-(normal|italic)|familjen-grotesk-latin-wght-normal|mrs-saint-delafield-latin-400-normal)-.*\.woff2$/.test(f))
  for (const f of fontes) {
    const nome = f.replace(/-[A-Za-z0-9_-]{8}\.woff2$/, '.woff2') // tira o codigo do build
    await copyFile(join(dist, 'assets', f), join(saida, 'fonts', nome))
  }
  for (const f of ['fundo-abertura-2400.webp', 'fundo-escuro-pe-1000.webp']) {
    await copyFile(join(dist, 'img', f), join(saida, 'img', f))
  }
  return fontes.length
}

async function servir() {
  const servidor = createServer(async (req, res) => {
    try {
      let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      if (caminho === '/') caminho = '/index.html'
      const arquivo = join(dist, caminho)
      if (!arquivo.startsWith(dist)) throw new Error('fora da pasta')
      const corpo = await readFile(arquivo)
      res.writeHead(200, { 'content-type': tipos[extname(arquivo)] ?? 'application/octet-stream' })
      res.end(corpo)
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
  return servidor
}

const telas = [
  { nome: 'abertura', seletor: '#inicio' },
  { nome: 'oficio', seletor: '#oficio' },
  { nome: 'ambientes', seletor: '#ambientes' },
  { nome: 'sobre', seletor: '#sobre' },
]

const inicio = Date.now()
const nFontes = await copiar()
const servidor = await servir()
const porta = servidor.address().port
const navegador = await puppeteer.launch({ executablePath: acharChrome(), headless: true })
try {
  const pagina = await navegador.newPage()
  const LARGURA = 390, ALTURA = 844, ALTURA_TELA = 1200
  await pagina.setViewport({ width: LARGURA, height: ALTURA, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  // Movimento reduzido: o site mostra tudo no estado final, sem depender da rolagem.
  await pagina.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await pagina.goto(`http://127.0.0.1:${porta}/`, { waitUntil: 'networkidle0' })
  await pagina.evaluate(() => document.fonts.ready)
  // Passa pela pagina inteira para carregar as fotos que so chegam ao rolar.
  const total = await pagina.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < total; y += 600) {
    await pagina.evaluate((v) => window.scrollTo(0, v), y)
    await new Promise((ok) => setTimeout(ok, 120))
  }
  await pagina.evaluate(() => window.scrollTo(0, 0))
  await new Promise((ok) => setTimeout(ok, 500))
  for (const t of telas) {
    const topo = await pagina.evaluate((s) => {
      const el = document.querySelector(s)
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null
    }, t.seletor)
    if (topo === null) throw new Error(`Secao nao encontrada: ${t.seletor}`)
    await pagina.screenshot({
      path: join(saida, 'telas', `${t.nome}.jpg`),
      type: 'jpeg',
      quality: 92,
      clip: { x: 0, y: topo, width: LARGURA, height: Math.min(ALTURA_TELA, total - topo) },
      captureBeyondViewport: true,
    })
  }
} finally {
  await navegador.close()
  servidor.close()
}
console.log(`pronto: ${nFontes} fontes, ${telas.length} telas em ${((Date.now() - inicio) / 1000).toFixed(1)} s`)
