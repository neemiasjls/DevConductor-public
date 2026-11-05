// Rodar no projeto que possui puppeteer-core. Saída nova, sem sobrescrever rodadas anteriores.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const [url, saida] = process.argv.slice(2)
if (!url || !saida || process.argv.length !== 4 || !/^https?:\/\//.test(url)) {
  console.error('Uso: node revisar-pagina.mjs <url-http> <pasta-nova>'); process.exit(1)
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
const cenarios = [], falhas = []
const esperar = ms => new Promise(r => setTimeout(r, ms))
try {
  for (const largura of [360, 390, 414, 768, 1024, 1440]) for (const reduzido of [false, true]) {
    const p = await navegador.newPage(), erros = [], rede = []
    p.on('pageerror', e => erros.push(e.message))
    p.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') rede.push(`${r.url()}: ${r.failure()?.errorText}`) })
    p.on('response', r => { if (r.status() >= 400) rede.push(`${r.status()} ${r.url()}`) })
    await p.setViewport({ width: largura, height: largura < 700 ? 844 : 900, isMobile: largura < 700, hasTouch: largura < 700 })
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduzido ? 'reduce' : 'no-preference' }])
    await p.evaluateOnNewDocument(() => {
      window.__lpCLS = 0; window.__lpLCP = 0
      try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__lpCLS += e.value })).observe({ type: 'layout-shift', buffered: true }) } catch {}
      try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lpLCP = e.startTime)).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
    })
    const resposta = await p.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await p.evaluate(() => document.fonts.ready)
    await esperar(500)
    const medidas = [], capturas = []
    for (let passo = 0; passo <= 4; passo++) {
      await p.evaluate(f => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * f, behavior: 'instant' }), passo / 4)
      await esperar(220)
      medidas.push(await p.evaluate(() => ({ y: Math.round(scrollY), largura: document.documentElement.scrollWidth,
        viewport: innerWidth, quebradas: [...document.images].filter(i => i.complete && !i.naturalWidth && i.currentSrc).map(i => i.currentSrc) })))
      if ([390, 1440].includes(largura) && [0, 2, 4].includes(passo)) {
        const nome = `${largura}-${reduzido ? 'reduzido' : 'normal'}-${passo}.jpg`
        await p.screenshot({ path: path.join(destino, nome), type: 'jpeg', quality: 78 }); capturas.push(nome)
      }
    }
    const pagina = await p.evaluate(() => ({
      titulo: document.title, h1: [...document.querySelectorAll('h1')].map(e => e.textContent.trim()),
      linksSemNome: [...document.querySelectorAll('a,button')].filter(e => {
        const r = e.getBoundingClientRect()
        return r.width && r.height && !e.textContent.trim() && !e.getAttribute('aria-label') && !e.querySelector('img[alt]')
      }).map(e => e.outerHTML.slice(0, 160)),
      ancorasQuebradas: [...document.querySelectorAll('a[href^="#"]')].map(e => e.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(decodeURIComponent(h.slice(1)))) ,
      bytesTransferidos: performance.getEntriesByType('resource').reduce((s, e) => s + e.transferSize, 0),
      bytesDecodificados: performance.getEntriesByType('resource').reduce((s, e) => s + e.decodedBodySize, 0),
      clsLaboratorio: window.__lpCLS, lcpLaboratorioMs: Math.round(window.__lpLCP),
    }))
    const problemas = [...erros, ...rede,
      ...(resposta.status() >= 400 ? [`Página HTTP ${resposta.status()}`] : []),
      // No celular emulado o navegador alarga innerWidth quando algo estoura; comparar com a largura configurada.
      ...medidas.filter(m => Math.max(m.largura, m.viewport) > largura + 1).map(m => `Rolagem lateral em y=${m.y}: ${Math.max(m.largura, m.viewport)}/${largura}`),
      ...new Set(medidas.flatMap(m => m.quebradas).map(s => `Imagem quebrada: ${s}`)),
      ...pagina.linksSemNome.map(s => `Controle sem nome: ${s}`),
      ...pagina.ancorasQuebradas.map(s => `Âncora inexistente: ${s}`),
    ]
    const id = `${largura}/${reduzido ? 'reduzido' : 'normal'}`
    if (problemas.length) falhas.push({ id, problemas })
    cenarios.push({ id, medidas, capturas, ...pagina, problemas })
    console.log(`${id}: ${problemas.length ? problemas.length + ' falhas' : 'OK'}`)
    await p.close()
  }
} finally {
  const timer = setTimeout(() => navegador.process()?.kill(), 5000)
  await navegador.close().finally(() => clearTimeout(timer))
}
const relatorio = { url, data: new Date().toISOString(), aprovadoTecnico: !falhas.length, cenarios, falhas,
  limites: 'Chrome headless local, cache e máquina variáveis. Bytes são do carregamento observado, não tamanho total do build. LCP/CLS são observações de laboratório, não Core Web Vitals de usuários. Prints exigem inspeção visual; fluidez e aprovação estética não são certificadas pelo script.' }
fs.writeFileSync(path.join(destino, 'relatorio.json'), JSON.stringify(relatorio, null, 2))
fs.writeFileSync(path.join(destino, 'indice.html'), '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Revisão local</title><style>body{font:18px system-ui;margin:24px;background:#eee}figure{margin:16px;display:inline-block;vertical-align:top}img{max-width:min(650px,90vw);max-height:650px}figcaption{padding:8px}</style><h1>Capturas da revisão</h1><p>Comparar normal/reduzido, leitura, corte, foco e continuidade.</p>' + cenarios.flatMap(c => c.capturas.map(f => `<figure><img src="${f}" alt="Captura ${f}" loading="lazy"><figcaption>${f}</figcaption></figure>`)).join(''))
console.log(`${cenarios.length} cenários, ${falhas.length} com falha. Evidências: ${destino}`)
process.exitCode = falhas.length ? 1 : 0
