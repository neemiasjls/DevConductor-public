// Põe os vídeos de referência lado a lado numa página (galeria.html) para o usuário marcar os favoritos.
// Uso: node montar-galeria.mjs <pasta> [--lista enderecos.txt] [--celular] [--segundos 14]
//   --lista: um endereço por linha (linha com # é ignorada). Grava antes os que ainda não têm vídeo na pasta,
//            com o gravar-rolagem.mjs (precisa de puppeteer-core no projeto atual, Edge e ffmpeg).
// Abrir a galeria: duplo clique no arquivo (navegador) ou pelo navegador do app. Só para estudo; nada é publicado.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const valor = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined }
const lista = valor('--lista')
const segundos = valor('--segundos')
const celular = args.includes('--celular')
const pasta = args.find((a, i) => !a.startsWith('--') && !['--lista', '--segundos'].includes(args[i - 1]))
if (!pasta) { console.log('Uso: node montar-galeria.mjs <pasta> [--lista enderecos.txt] [--celular] [--segundos 14]'); process.exit(1) }
fs.mkdirSync(pasta, { recursive: true })

// Mesmo nome que o gravar-rolagem.mjs dá aos arquivos.
const nomeDe = (url) => new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '-') + (celular ? '-celular' : '')
const arquivoOrigens = path.join(pasta, 'galeria.json') // nome do vídeo → endereço original
const enderecos = fs.existsSync(arquivoOrigens) ? JSON.parse(fs.readFileSync(arquivoOrigens, 'utf8')) : {}

let urls = []
if (lista) {
  const gravar = path.join(path.dirname(fileURLToPath(import.meta.url)), 'gravar-rolagem.mjs')
  urls = fs.readFileSync(lista, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  for (const [n, url] of urls.entries()) {
    const nome = nomeDe(url)
    enderecos[nome] = url
    if (fs.existsSync(path.join(pasta, `${nome}.webm`))) { console.log(`${n + 1}/${urls.length} já gravado: ${nome}`); continue }
    console.log(`${n + 1}/${urls.length} gravando ${url}`)
    try {
      execFileSync(process.execPath, [gravar, url, pasta, ...(celular ? ['--celular'] : []), ...(segundos ? ['--segundos', segundos] : [])],
        { stdio: 'inherit', timeout: 420000 })
    } catch {
      // Gravação que caiu no meio deixa vídeo pela metade: apagar para tentar de novo na próxima vez.
      for (const f of fs.readdirSync(pasta)) if (f === `${nome}.webm` || /^-\d{3}\.png$/.test(f.slice(nome.length)) && f.startsWith(nome)) fs.rmSync(path.join(pasta, f))
      console.log(`  não consegui gravar ${url} (o site bloqueou ou demorou); segue sem ele`)
    }
  }
  fs.writeFileSync(arquivoOrigens, JSON.stringify(enderecos, null, 2))
}

// Ordem: a da lista; depois os outros vídeos da pasta.
const videos = fs.readdirSync(pasta).filter((f) => f.endsWith('.webm')).map((f) => f.slice(0, -5))
const nomes = [...new Set([...urls.map(nomeDe), ...videos.sort()])].filter((n) => videos.includes(n))
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const cartoes = nomes.map((nome, i) => {
  const url = enderecos[nome] || `https://${nome.replace(/-celular$/, '')}`
  const capa = fs.existsSync(path.join(pasta, `${nome}-040.png`)) ? ` poster="${esc(nome)}-040.png"` : ''
  return `<article class="cartao${nome.endsWith('-celular') ? ' celular' : ''}">
  <label><input type="checkbox" value="${i + 1}"> <b>${i + 1}</b> ${esc(nome)}</label>
  <video src="${esc(nome)}.webm"${capa} muted loop playsinline controls preload="metadata"></video>
  <a href="${esc(url)}" target="_blank" rel="noopener">abrir o site ↗</a>
</article>`
}).join('\n')

fs.writeFileSync(path.join(pasta, 'galeria.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Referências</title>
<style>
:root{color-scheme:light dark;--fundo:#f4f1ea;--cartao:#fff;--texto:#1d1d1b;--suave:#6b6b66;--destaque:#c2410c}
@media (prefers-color-scheme:dark){:root{--fundo:#171716;--cartao:#232321;--texto:#f1efe9;--suave:#a3a29c;--destaque:#fb923c}}
body{margin:0;font:15px/1.4 system-ui,sans-serif;background:var(--fundo);color:var(--texto)}
header{padding:20px 16px 4px;max-width:1600px;margin:auto} h1{font-size:20px;margin:0 0 4px} header p{margin:0;color:var(--suave)}
main{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(420px,100%),1fr));padding:16px 16px 96px;max-width:1600px;margin:auto}
.cartao{background:var(--cartao);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px;outline:3px solid transparent}
.cartao:has(input:checked){outline-color:var(--destaque)}
video{width:100%;aspect-ratio:1440/900;object-fit:cover;object-position:top;border-radius:8px;background:#000}
.cartao.celular video{aspect-ratio:390/844}
label{display:flex;gap:8px;align-items:center;cursor:pointer;word-break:break-all}
input{width:20px;height:20px;accent-color:var(--destaque);flex:none}
a{color:var(--suave);font-size:13px}
footer{position:fixed;left:0;right:0;bottom:0;padding:12px 16px;background:var(--cartao);display:flex;gap:12px;align-items:center;justify-content:center;box-shadow:0 -2px 12px #0003}
button{font:inherit;padding:10px 16px;border-radius:8px;border:0;background:var(--destaque);color:#fff;cursor:pointer}
</style></head><body>
<header><h1>Referências (${nomes.length})</h1><p>Cada vídeo roda quando aparece na tela. Marque os que gostar e copie para o chat.</p></header>
<main>
${cartoes}
</main>
<footer><span id="escolhidos">Nenhum marcado</span><button id="copiar" type="button">Copiar escolhidos</button></footer>
<script>
const caixas = [...document.querySelectorAll('input')]
const marcados = () => caixas.filter((c) => c.checked).map((c) => c.value)
const texto = () => marcados().length ? 'Gostei das referências ' + marcados().join(', ') : ''
const chave = 'galeria:' + location.pathname
try { const salvos = JSON.parse(localStorage.getItem(chave) || '[]'); caixas.forEach((c) => { c.checked = salvos.includes(c.value) }) } catch {}
const atualizar = () => {
  document.getElementById('escolhidos').textContent = texto() || 'Nenhum marcado'
  try { localStorage.setItem(chave, JSON.stringify(marcados())) } catch {}
}
caixas.forEach((c) => c.addEventListener('change', atualizar)); atualizar()
document.getElementById('copiar').onclick = async () => {
  const t = texto(); if (!t) return
  try { await navigator.clipboard.writeText(t); document.getElementById('copiar').textContent = 'Copiado!' } catch { prompt('Copie:', t) }
}
const reduzido = matchMedia('(prefers-reduced-motion: reduce)')
const olho = new IntersectionObserver((itens) => itens.forEach((i) => i.isIntersecting && !reduzido.matches ? i.target.play().catch(() => {}) : i.target.pause()), { threshold: 0.3 })
reduzido.addEventListener('change', () => { if (reduzido.matches) document.querySelectorAll('video').forEach((v) => v.pause()) })
document.querySelectorAll('video').forEach((v) => olho.observe(v))
</script>
</body></html>
`)
console.log(`Galeria: ${path.join(pasta, 'galeria.html')} (${nomes.length} vídeos)`)
