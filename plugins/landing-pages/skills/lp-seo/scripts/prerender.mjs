// Snapshot estático para landing React com createRoot (que substitui a raiz ao iniciar).
// Não hidratar este DOM: ele já passou por efeitos. Para hydrateRoot, usar SSR/SSG do framework.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const [pasta, opcao, id = 'root'] = process.argv.slice(2)
if (!pasta || (opcao && (opcao !== '--raiz' || !process.argv[4])) || !/^[a-zA-Z][\w-]*$/.test(id) || process.argv.length > 5) {
  console.error('Uso: node prerender.mjs dist [--raiz root]'); process.exit(1)
}
const raiz = fs.realpathSync(pasta), entrada = path.join(raiz, 'index.html')
const original = fs.readFileSync(entrada, 'utf8')
if (original.includes('data-prerender="estatico"')) throw Error('Build já pré-renderizado; gere novamente antes de repetir.')
const exigir = createRequire(path.join(process.cwd(), 'package.json'))
const puppeteer = (await import(pathToFileURL(exigir.resolve('puppeteer-core')).href)).default
const executablePath = process.env.BROWSER_EXECUTABLE || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(fs.existsSync)
if (!executablePath) throw Error('Defina BROWSER_EXECUTABLE.')
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4' }
const servidor = http.createServer((req, res) => {
  try {
    const nome = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const alvo = fs.realpathSync(path.join(raiz, nome === '/' ? 'index.html' : nome))
    const relativo = path.relative(raiz, alvo)
    if (relativo.startsWith('..') || path.isAbsolute(relativo) || !fs.statSync(alvo).isFile()) throw Error('fora')
    res.setHeader('Content-Type', tipos[path.extname(alvo)] || 'application/octet-stream')
    fs.createReadStream(alvo).pipe(res)
  } catch { res.writeHead(404); res.end() }
})
await new Promise(r => servidor.listen(0, '127.0.0.1', r))
let navegador
try {
  navegador = await puppeteer.launch({ executablePath, headless: true, userDataDir: path.resolve(pasta, '../.prerender-perfil') })
  const p = await navegador.newPage(), erros = []
  p.on('pageerror', e => erros.push(e.message))
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.setViewport({ width: 1440, height: 900 })
  await p.goto(`http://127.0.0.1:${servidor.address().port}/`, { waitUntil: 'networkidle2' })
  await p.evaluate(() => document.fonts.ready)
  const snapshot = await p.evaluate(id => {
    const el = document.getElementById(id)
    if (!el || !el.querySelector('h1')?.textContent.trim() || !el.querySelector('main')) throw Error('Raiz sem H1/main; conteúdo ainda não ficou pronto.')
    if (el.querySelector('.pin-spacer')) throw Error('Snapshot contém pin ativo; respeitar movimento reduzido.')
    return el.innerHTML
  }, id)
  if (erros.length) throw Error(erros.join('\n'))
  // Só substitui a raiz vazia do build; head/robots/scripts originais permanecem intactos.
  const padrao = new RegExp(`<div\\s+id=["']${id}["']\\s*>\\s*</div>`)
  if (!padrao.test(original)) throw Error('Raiz precisa ser um div vazio no build original.')
  const html = original.replace(padrao, () => `<div id="${id}" data-prerender="estatico">${snapshot}</div>`)
  fs.writeFileSync(entrada, html)
  console.log(`HTML estático: ${Buffer.byteLength(html)} bytes; raiz ${id}. Verifique sem JavaScript e com createRoot.`)
} finally {
  if (navegador) {
    const timer = setTimeout(() => navegador.process()?.kill(), 5000)
    await navegador.close().finally(() => clearTimeout(timer))
  }
  servidor.closeAllConnections(); servidor.close()
}
