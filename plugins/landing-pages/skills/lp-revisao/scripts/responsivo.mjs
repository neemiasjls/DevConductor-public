// Confere a responsividade de uma página em várias larguras (Edge via DevTools).
// Uso: node responsivo.mjs <url> [--larguras 360,390,414,768,1024,1440]
// Acusa: rolagem lateral, elementos que vazam da tela, alvos de toque < 44px e textos < 13px.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const i = args.indexOf('--larguras')
const larguras = (i >= 0 ? args.splice(i, 2)[1] : '360,390,414,768,1024,1440').split(',').map(Number)
const url = args[0]
if (!url) {
  console.log('Uso: node responsivo.mjs <url> [--larguras 360,390,414,768,1024,1440]')
  process.exit(1)
}

const EDGE = process.env.BROWSER_EXECUTABLE || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
].find(existsSync)
if (!EDGE) { console.error('Defina BROWSER_EXECUTABLE para o Chrome/Edge instalado.'); process.exit(1) }
const PORTA = 9700 + Math.floor(Math.random() * 200)
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${resolve('revisao', '.perfis', `responsivo-${PORTA}`)}`, '--no-first-run', 'about:blank'])

let alvo
for (let k = 0; k < 40 && !alvo; k++) {
  await espera(250)
  try {
    alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find((t) => t.type === 'page')
  } catch {}
}
if (!alvo) { edge.kill(); console.error('Falha ao abrir navegador.'); process.exit(1) }
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pend = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) (pend.get(m.id)(m), pend.delete(m.id))
})
const cmd = (method, params = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })

const SONDA = `(async () => {
  for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 60)) }
  window.scrollTo({ top: 0, behavior: 'instant' })
  const W = document.documentElement.clientWidth
  const nome = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')
  const vaza = [], pequenos = [], miudos = []
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0) continue
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') continue // sr-only (ex.: atalho "pular para o conteúdo")
    let p = el.parentElement, cortado = false
    while (p) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') { cortado = p !== document.body && p !== document.documentElement; if (cortado) break } p = p.parentElement }
    if (!cortado && (r.right > W + 1 || r.left < -1)) vaza.push(nome(el) + ' (' + Math.round(r.left) + '→' + Math.round(r.right) + ')')
    if ((el.tagName === 'A' || el.tagName === 'BUTTON') && (r.height < 44 || r.width < 44)) pequenos.push(nome(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height))
    if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 13) miudos.push(nome(el) + ' ' + cs.fontSize)
  }
  return { rolagemLateral: document.documentElement.scrollWidth > W, largura: W, larguraDoc: document.documentElement.scrollWidth, vaza: vaza.slice(0, 8), pequenos: [...new Set(pequenos)].slice(0, 8), miudos: [...new Set(miudos)].slice(0, 8) }
})()`

let problemas = 0
await cmd('Page.enable')
for (const w of larguras) {
  const mobile = w < 768
  await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: mobile ? 800 : 900, deviceScaleFactor: 1, mobile })
  await cmd('Page.navigate', { url })
  await espera(2500)
  const resp = await cmd('Runtime.evaluate', { expression: SONDA, awaitPromise: true, returnByValue: true })
  const r = resp.result?.result?.value
  if (!r) {
    console.log(`
${w}px  ERRO na sonda:`, JSON.stringify(resp.result?.exceptionDetails ?? resp).slice(0, 400))
    problemas++
    continue
  }
  const ok = !r.rolagemLateral && !r.vaza.length && !r.pequenos.length && !r.miudos.length
  if (!ok) problemas++
  console.log(`\n${w}px  ${ok ? 'OK' : 'ATENÇÃO'}${r.rolagemLateral ? `  rolagem lateral (${r.larguraDoc}px > ${r.largura}px)` : ''}`)
  if (r.vaza.length) console.log('  vaza da tela:', r.vaza.join(' | '))
  if (r.pequenos.length) console.log('  toque < 44px:', r.pequenos.join(' | '))
  if (r.miudos.length) console.log('  texto < 13px:', r.miudos.join(' | '))
}
console.log(`\n${problemas ? problemas + ' largura(s) com atenção' : 'Responsivo: todas as larguras OK'}`)
ws.close()
edge.kill()
process.exitCode = problemas ? 1 : 0
