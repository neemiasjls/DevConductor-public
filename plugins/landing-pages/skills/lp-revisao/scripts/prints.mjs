// Prints de uma página com o Edge (protocolo DevTools), esperando fontes e animações.
// Uso: node prints.mjs <url> <pasta-saida> [seletor ...] [--larguras 1440,834,390] [--so-topo] [--espera 3500]
// Ex.:  node prints.mjs http://localhost:5173/ ./prints "#cabelo" "#noivas@0.8"   (@n = rolar mais n telas dentro da seção)
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const opt = (nome) => {
  const i = args.indexOf(nome)
  if (i < 0) return undefined
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const larguras = (opt('--larguras') ?? '1440,834,390').split(',').map(Number)
const esperaCarga = Number(opt('--espera') ?? 3500)
const soTopo = args.includes('--so-topo') && args.splice(args.indexOf('--so-topo'), 1)
const [url, saida = 'prints', ...seletores] = args
if (!url) {
  console.log('Uso: node prints.mjs <url> <pasta-saida> [seletor ...] [--larguras 1440,834,390] [--so-topo]')
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
const PORTA = 9300 + Math.floor(Math.random() * 400)
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const nomeLargura = (w) => (w >= 1200 ? 'computador' : w >= 700 ? 'tablet' : 'celular')

mkdirSync(saida, { recursive: true })
const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORTA}`,
  `--user-data-dir=${resolve(saida, '.perfis', `prints-${PORTA}`)}`,
  '--no-first-run',
  '--hide-scrollbars',
  'about:blank',
])

let alvo
for (let i = 0; i < 40 && !alvo; i++) {
  await espera(250)
  try {
    alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find((t) => t.type === 'page')
  } catch {}
}
if (!alvo) {
  console.error('Não consegui abrir o Edge/Chrome em modo headless.')
  edge.kill()
  process.exit(1)
}

const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pendentes = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pendentes.has(msg.id)) {
    pendentes.get(msg.id)(msg)
    pendentes.delete(msg.id)
  }
})
const cmd = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id
    pendentes.set(n, r)
    ws.send(JSON.stringify({ id: n, method, params }))
  })

await cmd('Page.enable')
for (const w of larguras) {
  const mobile = w < 700
  const h = mobile ? 844 : w < 1200 ? 1112 : 900
  await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 3 : 1.5, mobile })
  await cmd('Emulation.setTouchEmulationEnabled', { enabled: mobile })
  const alvos = [null, ...(soTopo ? [] : seletores)]
  for (const sel of alvos) {
    await cmd('Page.navigate', { url })
    await espera(esperaCarga)
    if (sel) {
      await cmd('Runtime.evaluate', {
        expression: `(() => { const [q, d] = ${JSON.stringify(sel)}.split('@'); const el = document.querySelector(q); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 20 + (Number(d) || 0) * innerHeight, behavior: 'instant' }) })()`,
      })
      await espera(2500)
    }
    await cmd('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true })
    const { result } = await cmd('Page.captureScreenshot', { format: 'png' })
    const nome = `${nomeLargura(w)}-${sel ? sel.replace(/[^a-z0-9.-]/gi, '') : 'topo'}.png`
    writeFileSync(join(saida, nome), Buffer.from(result.data, 'base64'))
    console.log('ok', nome)
  }
}
ws.close()
edge.kill()
