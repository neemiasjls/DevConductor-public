// Renderiza quadros da trança com o lottie-web num Edge invisível e salva uma folha de contato.
// Uso: node ferramentas/ver-tranca.mjs <saida.png> [quadros separados por vírgula] [largura de cada quadro]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const saida = process.argv[2] || path.join(raiz, 'ferramentas', 'tranca-quadros.png')
const quadros = (process.argv[3] || '0,15,30,45,62,90,120,150,180,214,226,239').split(',').map(Number)
const larg = Number(process.argv[4] || 240)
const dados = fs.readFileSync(path.join(raiz, 'public', 'animacoes', 'tranca.json'), 'utf8')
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const nav = await puppeteer.launch({ executablePath: edge, headless: true })
const p = await nav.newPage()
const alt = Math.round((larg * 1000) / 600)
await p.setViewport({ width: Math.min(6, quadros.length) * (larg + 8) + 8, height: Math.ceil(quadros.length / 6) * (alt + 30) + 8 })
await p.setContent(`<html><body style="margin:0;padding:4px;background:#ddd;display:flex;flex-wrap:wrap;gap:8px;font:12px sans-serif">
  ${quadros.map((q) => `<div><div id="q${q}" style="width:${larg}px;height:${alt}px;background:#fbf4ed"></div>${q}</div>`).join('')}</body></html>`)
await p.addScriptTag({ path: path.join(raiz, 'node_modules', 'lottie-web', 'build', 'player', 'lottie.min.js') })
await p.evaluate(async (dados, quadros) => {
  const anim = JSON.parse(dados)
  await Promise.all(quadros.map((q) => new Promise((ok) => {
    const a = window.lottie.loadAnimation({ container: document.getElementById('q' + q), renderer: 'svg', autoplay: false, loop: false, animationData: structuredClone(anim) })
    a.addEventListener('DOMLoaded', () => { a.goToAndStop(q, true); ok() })
  })))
}, dados, quadros)
await new Promise((r) => setTimeout(r, 300))
await p.screenshot({ path: saida })
await nav.close()
console.log('salvo', saida)
