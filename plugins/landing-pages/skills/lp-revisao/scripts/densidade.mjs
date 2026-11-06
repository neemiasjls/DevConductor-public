// Conta as palavras visíveis em cada altura de tela (computador 1440×900 e celular 390×844) e aponta as telas
// acima do limite da LP-12. Rodar no projeto que possui puppeteer-core. Saída nova a cada rodada.
// Uso: node densidade.mjs <url-http> <pasta-nova> [--computador 60] [--celular 45] [--reduzido] [--so-avisar]
// Seções de leitura (serviços, preços, perguntas, rodapé) levam data-leitura e ficam fora do alerta.
// Tela acima do limite sai com código 1, a menos que o texto dela esteja num elemento com data-densidade="<motivo>"
// (exceção localizada, o motivo também vai no plano). --so-avisar: só lista, sem reprovar (rodada exploratória).
// Mede a cada meia tela, para não perder o pico de texto que fica entre duas telas inteiras.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { LIMITES_PADRAO, medirTela, avaliar } from './densidade-regras.mjs'

const args = process.argv.slice(2)
const posicionais = [], limites = { ...LIMITES_PADRAO }
let reduzido = false, estrito = true
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--reduzido') reduzido = true
  else if (a === '--estrito') estrito = true // padrão; aceito por compatibilidade
  else if (a === '--so-avisar') estrito = false
  else if (a === '--computador' || a === '--celular') {
    const v = Number(args[++i])
    if (!Number.isInteger(v) || v < 1) { console.error(`Valor inválido para ${a}`); process.exit(1) }
    limites[a.slice(2)] = v
  } else if (a.startsWith('--')) { console.error(`Opção desconhecida: ${a}`); process.exit(1) }
  else posicionais.push(a)
}
const [url, saida] = posicionais
if (posicionais.length !== 2 || !/^https?:\/\//.test(url)) {
  console.error('Uso: node densidade.mjs <url-http> <pasta-nova> [--computador 60] [--celular 45] [--reduzido] [--so-avisar]')
  process.exit(1)
}
const destino = path.resolve(saida)
if (fs.existsSync(destino)) { console.error('Use uma pasta nova para preservar a rodada anterior.'); process.exit(1) }
const exigir = createRequire(path.join(process.cwd(), 'package.json'))
const puppeteer = (await import(pathToFileURL(exigir.resolve('puppeteer-core')).href)).default
const executablePath = process.env.BROWSER_EXECUTABLE || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(fs.existsSync)
if (!executablePath) throw Error('Navegador ausente; defina BROWSER_EXECUTABLE.')
fs.mkdirSync(destino, { recursive: true })
const navegador = await puppeteer.launch({ executablePath, headless: true, userDataDir: path.join(destino, '.perfil'),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// Roda dentro da página: trechos de texto que aparecem de fato nesta tela (visíveis, com área, dentro da janela).
// Fora da conta: menu e cabeçalho (iguais em toda tela) e texto só para leitor de tela (caixa de 1 px, como o
// "pular para o conteúdo"). Rodapé conta como seção de leitura mesmo sem data-leitura.
function trechosVisiveis() {
  const saida = []
  const caminho = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const faixa = document.createRange()
  const soLeitorDeTela = (el) => {
    for (let e = el, i = 0; e && i < 4; e = e.parentElement, i++) {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e)
      if (r.width <= 1 || r.height <= 1) return true
      if (/inset\(50%/.test(s.clipPath) || /^rect\(0(px)?,? 0(px)?/.test(s.clip)) return true // sr-only do Tailwind e similares
    }
    return false
  }
  for (let no = caminho.nextNode(); no; no = caminho.nextNode()) {
    const texto = no.textContent.replace(/\s+/g, ' ').trim()
    const pai = no.parentElement
    if (!texto || !pai || pai.closest('script,style,noscript,template,header,nav,[role="banner"],[role="navigation"]')) continue
    if (pai.checkVisibility && !pai.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    if (soLeitorDeTela(pai)) continue
    faixa.selectNodeContents(no)
    // Dentro da janela e não encoberto por outra camada (seção que cobre a cena, cartão por cima): o elemento no
    // topo, no centro do trecho, é o próprio texto, um filho ou um ancestral dele (texto sem pointer-events).
    const visivel = [...faixa.getClientRects()].some((r) => {
      if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false
      const x = Math.min(Math.max((r.left + r.right) / 2, 0), innerWidth - 1)
      const y = Math.min(Math.max((r.top + r.bottom) / 2, 0), innerHeight - 1)
      const topo = document.elementFromPoint(x, y)
      return !topo || topo === pai || pai.contains(topo) || topo.contains(pai)
    })
    if (visivel) saida.push({ texto, leitura: !!pai.closest('[data-leitura],footer,[role="contentinfo"]'),
      motivo: pai.closest('[data-densidade]')?.getAttribute('data-densidade')?.trim() || undefined })
  }
  return saida
}

const telas = []
try {
  for (const [modo, largura, altura] of [['computador', 1440, 900], ['celular', 390, 844]]) {
    const p = await navegador.newPage()
    await p.setViewport({ width: largura, height: altura, isMobile: modo === 'celular', hasTouch: modo === 'celular' })
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduzido ? 'reduce' : 'no-preference' }])
    await p.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await p.evaluate(() => document.fonts.ready)
    await esperar(800)
    const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    for (let y = 0; ; y = Math.min(y + Math.round(altura / 2), total)) {
      await p.evaluate((alvo) => scrollTo({ top: alvo, behavior: 'instant' }), y)
      await esperar(600)
      const trechos = await p.evaluate(trechosVisiveis)
      const { palavras, palavrasLeitura, motivos } = medirTela(trechos)
      const amostra = trechos.filter((t) => !t.leitura).map((t) => t.texto).join(' ').slice(0, 160)
      telas.push({ modo, y, palavras, palavrasLeitura, amostra, ...(motivos ? { motivos } : {}) })
      if (palavras > limites[modo]) {
        await p.screenshot({ path: path.join(destino, `${modo}-${y}.jpg`), type: 'jpeg', quality: 70 })
      }
      if (y >= total) break
    }
    await p.close()
  }
} finally { await navegador.close() }

const { alertas, justificadas, maior } = avaliar(telas, limites)
fs.writeFileSync(path.join(destino, 'relatorio.json'),
  JSON.stringify({ url, data: new Date().toISOString(), reduzido, limites, maior, alertas, justificadas, telas }, null, 2))
fs.rmSync(path.join(destino, '.perfil'), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
console.log(`Maior tela: ${maior.computador} palavras no computador (limite ${limites.computador}), ` +
  `${maior.celular} no celular (limite ${limites.celular}).`)
for (const a of alertas) console.log(`  acima: ${a.modo} y=${a.y} ${a.palavras} palavras — "${a.amostra.slice(0, 90)}"`)
for (const j of justificadas) console.log(`  exceção: ${j.modo} y=${j.y} ${j.palavras} palavras — ${j.motivos.join('; ')}`)
console.log(alertas.length ? `${alertas.length} tela(s) acima do limite: corrigir ou marcar a exceção com data-densidade.` : 'Nenhuma tela acima do limite sem exceção.')
if (estrito && alertas.length) process.exit(1)
