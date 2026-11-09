// Prints rápidos durante a construção (Edge invisível + SwiftShader para o 3D).
// Uso: node ferramentas/olhar.mjs <pasta-saida> <largura>x<altura> <posições em px ou "tN" (telas)> [--busca ?x] [--reduzido]
// Ex.: node ferramentas/olhar.mjs revisao/olhar-1 1440x900 0 t0.5 t1 t1.5
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null }
const busca = flag('--busca') || ''
const base = flag('--url') || 'http://127.0.0.1:5206/'
const reduzido = args.includes('--reduzido') ? (args.splice(args.indexOf('--reduzido'), 1), true) : false
const [saida, tela, ...posicoes] = args
const [w, h] = tela.split('x').map(Number)
fs.mkdirSync(saida, { recursive: true })
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const nav = await puppeteer.launch({ executablePath: edge, headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  userDataDir: path.resolve(saida, '.perfil'),
})
try {
  const p = await nav.newPage()
  const erros = []
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(`${m.type()}: ${m.text()}`) })
  p.on('pageerror', (e) => erros.push('pageerror: ' + e.message))
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 })
  if (reduzido) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(base + busca, { waitUntil: 'networkidle0', timeout: 60000 })
  await p.evaluate(() => document.fonts.ready)
  // Gesto para carregar o 3D e esperar a cena ficar pronta (se houver).
  await p.mouse.wheel({ deltaY: 1 })
  await p.waitForSelector('#cadeira[data-pronta]', { timeout: 30000 }).catch(() => erros.push('cena 3D não ficou pronta'))
  for (const pos of posicoes) {
    const y = pos.startsWith('t') ? Math.round(Number(pos.slice(1)) * h) : Number(pos)
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y)
    await new Promise((r) => setTimeout(r, 1600))
    await p.screenshot({ path: path.join(saida, `${w}-${pos}.png`) })
  }
  console.log(erros.length ? erros.join('\n') : 'sem erros no console')
} finally {
  await nav.close()
}
