import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
const raiz = fs.realpathSync(path.dirname(fileURLToPath(import.meta.url)))
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.woff2': 'font/woff2' }
http.createServer((req, res) => {
  try {
    const nome = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (nome === '/' || nome === '/favicon.ico') {
      res.writeHead(302, { Location: nome === '/' ? '/site/index.html' : '/assets/favicon.svg' })
      res.end(); return
    }
    const alvo = fs.realpathSync(path.join(raiz, nome))
    const relativo = path.relative(raiz, alvo)
    if (relativo.startsWith('..') || path.isAbsolute(relativo) || !fs.statSync(alvo).isFile()) throw Error()
    res.setHeader('Content-Type', tipos[path.extname(alvo)] || 'text/plain')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    fs.createReadStream(alvo).pipe(res)
  } catch { res.writeHead(404); res.end('Não encontrado') }
}).listen(5192, '127.0.0.1', () => console.log('Estilos: http://127.0.0.1:5192/'))
