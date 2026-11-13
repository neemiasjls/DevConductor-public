// Caminho de comparacao, sem Hyperframes: abre o site pronto num Chrome sem janela (tamanho de
// celular), rola a pagina quadro a quadro tirando fotos e manda tudo para o ffmpeg montar o MP4.
// Uso: node comparar-rolagem.mjs   (precisa de assets/ ja preparado? nao: usa direto o dist da prova)
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const aqui = dirname(fileURLToPath(import.meta.url))
const dist = join(aqui, '..', 'prova-referencia', 'marcenaria-aroeira', 'dist')
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff' }
const FPS = 30, SEGUNDOS = 14, SAIDA = join(aqui, 'video-rolagem.mp4')

const chrome = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean).find((c) => existsSync(c))
if (!chrome) throw new Error('Chrome nao encontrado: defina a variavel CHROME.')

const servidor = createServer(async (req, res) => {
  try {
    let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (caminho === '/') caminho = '/index.html'
    const arquivo = join(dist, caminho)
    if (!arquivo.startsWith(dist)) throw new Error('fora da pasta')
    const corpo = await readFile(arquivo)
    res.writeHead(200, { 'content-type': tipos[extname(arquivo)] ?? 'application/octet-stream' })
    res.end(corpo)
  } catch { res.writeHead(404).end() }
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))

const inicio = Date.now()
const navegador = await puppeteer.launch({ executablePath: chrome, headless: true })
const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', SAIDA], { stdio: ['pipe', 'inherit', 'inherit'] })
try {
  const pagina = await navegador.newPage()
  // 360x640 com densidade 3 = 1080x1920 de saida
  await pagina.setViewport({ width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  // Movimento reduzido: sem isso as animacoes do site andam no relogio real e a gravacao sai aos trancos.
  await pagina.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await pagina.goto(`http://127.0.0.1:${servidor.address().port}/`, { waitUntil: 'networkidle0' })
  await pagina.evaluate(() => document.fonts.ready)
  const total = await pagina.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  for (let y = 0; y < total; y += 500) { await pagina.evaluate((v) => window.scrollTo(0, v), y); await new Promise((ok) => setTimeout(ok, 80)) }
  const quadros = FPS * SEGUNDOS
  for (let i = 0; i < quadros; i++) {
    const p = i / (quadros - 1)
    const suave = p * p * (3 - 2 * p)
    await pagina.evaluate((v) => window.scrollTo(0, v), Math.round(total * suave))
    const foto = await pagina.screenshot({ type: 'jpeg', quality: 92 })
    if (!ffmpeg.stdin.write(foto)) await new Promise((ok) => ffmpeg.stdin.once('drain', ok))
  }
  console.log(`pagina com ${total} px de rolagem, ${quadros} quadros`)
} finally {
  ffmpeg.stdin.end()
  await new Promise((ok) => ffmpeg.on('close', ok))
  await navegador.close()
  servidor.close()
}
console.log(`tempo: ${((Date.now() - inicio) / 1000).toFixed(1)} s`)
