// Segunda comparacao: o MESMO index.html, gerado sem o Hyperframes.
// A ideia dele em poucas linhas: abrir a pagina no Chrome sem janela, parar a linha do tempo do GSAP
// em cada quadro (seek), tirar a foto e mandar para o ffmpeg. So para medir se a ideia basta.
// Uso: node preparar.mjs && node comparar-proprio.mjs
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const aqui = dirname(fileURLToPath(import.meta.url))
// GSAP local (o mesmo que o site da prova usa), para nao depender de rede.
const gsapLocal = join(aqui, '..', 'prova-referencia', 'marcenaria-aroeira', 'node_modules', 'gsap', 'dist', 'gsap.min.js')
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }
const FPS = 30, SAIDA = join(aqui, 'video-proprio.mp4')

const chrome = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean).find((c) => existsSync(c))
if (!chrome) throw new Error('Chrome nao encontrado: defina a variavel CHROME.')

const servidor = createServer(async (req, res) => {
  try {
    let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (caminho === '/') caminho = '/index.html'
    const arquivo = join(aqui, caminho)
    if (!arquivo.startsWith(aqui)) throw new Error('fora da pasta')
    const corpo = await readFile(arquivo)
    res.writeHead(200, { 'content-type': tipos[extname(arquivo)] ?? 'application/octet-stream' })
    res.end(corpo)
  } catch { res.writeHead(404).end() }
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))

const inicio = Date.now()
const navegador = await puppeteer.launch({ executablePath: chrome, headless: true })
const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', SAIDA], { stdio: ['pipe', 'inherit', 'inherit'] })
try {
  const pagina = await navegador.newPage()
  await pagina.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
  await pagina.setRequestInterception(true)
  const gsap = await readFile(gsapLocal)
  pagina.on('request', (pedido) => {
    if (pedido.url().includes('/gsap@')) pedido.respond({ status: 200, contentType: 'text/javascript', body: gsap })
    else pedido.continue()
  })
  await pagina.goto(`http://127.0.0.1:${servidor.address().port}/`, { waitUntil: 'networkidle0' })
  await pagina.evaluate(() => document.fonts.ready)
  const duracao = await pagina.evaluate(() => Number(document.querySelector('#root').dataset.duration))
  const quadros = Math.round(duracao * FPS)
  for (let i = 0; i < quadros; i++) {
    await pagina.evaluate((t) => {
      // Quem aparece em cada instante: data-start e data-duration, como no Hyperframes.
      document.querySelectorAll('#root [data-start]').forEach((el) => {
        const a = Number(el.dataset.start), b = a + Number(el.dataset.duration)
        el.style.visibility = t >= a && t < b ? 'visible' : 'hidden'
      })
      window.__timelines.main.seek(t, false)
    }, i / FPS)
    const foto = await pagina.screenshot({ type: 'jpeg', quality: 95 }) // PNG deu a mesma imagem, mas levou 239 s
    if (!ffmpeg.stdin.write(foto)) await new Promise((ok) => ffmpeg.stdin.once('drain', ok))
  }
  console.log(`${quadros} quadros`)
} finally {
  ffmpeg.stdin.end()
  await new Promise((ok) => ffmpeg.on('close', ok))
  await navegador.close()
  servidor.close()
}
console.log(`tempo: ${((Date.now() - inicio) / 1000).toFixed(1)} s`)
