// Prints da página em vários pontos de cada cena (Edge invisível, base lp-cenas/testar.mjs).
// Uso: node ferramentas/prints.mjs <url> <pasta-saida> <desktop|celular> [reduzido] [secoes separadas por vírgula]
// Cena presa (.cena, #estilos): 5 pontos do começo ao fim; seção comum: topo e meio. Também mede rolagem lateral.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const [url = 'http://localhost:5182/', saida = 'prints', modo = 'desktop', reduz = '', filtro = ''] = process.argv.slice(2)
const reduzido = reduz === 'reduzido'
fs.mkdirSync(saida, { recursive: true })
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const nav = await puppeteer.launch({ executablePath: edge, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'] })
const p = await nav.newPage()
const erros = []
p.on('pageerror', (e) => erros.push('pageerror: ' + e.message))
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(m.type() + ': ' + m.text().slice(0, 200)) })
p.on('requestfailed', (r) => erros.push('rede: ' + r.url() + ' ' + r.failure()?.errorText))
await p.setViewport(modo === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduzido ? 'reduce' : 'no-preference' }])
await p.goto(url, { waitUntil: 'networkidle0' })
await p.evaluate(() => document.fonts.ready)
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
const prefixo = `${modo}${reduzido ? '-reduzido' : ''}`
// Abertura logo no começo (algo já se move) e depois da troca de palavra.
await esperar(250); await p.screenshot({ path: path.join(saida, `${prefixo}-00-inicio-a.jpg`), type: 'jpeg', quality: 72 })
await esperar(2600); await p.screenshot({ path: path.join(saida, `${prefixo}-00-inicio-b.jpg`), type: 'jpeg', quality: 72 })

const secoes = await p.evaluate(() => [...document.querySelectorAll('main > div > header, main section, footer')].map((s) => {
  const r = s.getBoundingClientRect()
  return { id: s.id || s.tagName.toLowerCase(), topo: r.top + scrollY, altura: r.height, presa: s.classList.contains('cena') || s.id === 'estilos' }
}))
const alvo = filtro ? filtro.split(',') : null
const medidas = []
for (const s of secoes) {
  if (alvo && !alvo.includes(s.id)) continue
  const vh = await p.evaluate(() => innerHeight)
  const n = Number(process.env.PONTOS || 5)
  const pontos = s.presa && !reduzido ? Array.from({ length: n + 1 }, (_, i) => i / n).map((f) => s.topo + f * (s.altura - vh)) : [s.topo, s.topo + Math.max(0, s.altura - vh) / 2]
  for (const [i, y] of pontos.entries()) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round(y))
    await esperar(1100)
    const m = await p.evaluate(() => ({ y: Math.round(scrollY), larg: document.documentElement.scrollWidth, vw: innerWidth }))
    medidas.push({ secao: s.id, ...m })
    await p.screenshot({ path: path.join(saida, `${prefixo}-${String(secoes.indexOf(s) + 1).padStart(2, '0')}-${s.id}-${i}.jpg`), type: 'jpeg', quality: 72 })
  }
}
const lateral = medidas.filter((m) => m.larg > m.vw + 1)
console.log(JSON.stringify({ modo: prefixo, secoes: secoes.map((s) => `${s.id}:${Math.round(s.altura)}`), rolagemLateral: lateral, erros: [...new Set(erros)] }, null, 1))
await nav.close()
