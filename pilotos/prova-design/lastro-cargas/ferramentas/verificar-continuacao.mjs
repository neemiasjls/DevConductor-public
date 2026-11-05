import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const pasta = path.resolve(process.argv[2] || 'revisao/continuacao-29-10')
fs.mkdirSync(pasta, { recursive: true })
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const browser = await puppeteer.launch({ executablePath: edge, headless: true,
  userDataDir: path.join(pasta, 'perfil'), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const casos = [], erros = []
const esperar = ms => new Promise(r => setTimeout(r, ms))
try {
  for (const reduzido of [false, true]) for (const largura of [360, 390, 768, 1024, 1440]) {
    const p = await browser.newPage()
    const nome = `${largura}-${reduzido ? 'reduzido' : 'normal'}`
    p.on('pageerror', e => erros.push(`${nome}: ${e.message}`))
    p.on('response', r => { if (r.status() >= 400) erros.push(`${nome}: HTTP${r.status()} ${r.url()}`) })
    p.on('requestfailed', r => erros.push(`${nome}: ${r.failure()?.errorText} ${r.url()}`))
    await p.setViewport({ width: largura, height: largura < 768 ? 844 : 900, deviceScaleFactor: 1, isMobile: largura < 768 })
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduzido ? 'reduce' : 'no-preference' }])
    await p.goto('http://localhost:5181/', { waitUntil: 'networkidle0', timeout: 60000 })
    await p.evaluate(() => document.fonts.ready)
    await esperar(1800)
    const medidas = []
    for (const fracao of [0, .2, .4, .6, .8, 1]) {
      await p.evaluate(f => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * f, behavior: 'instant' }), fracao)
      await esperar(1000)
      medidas.push(await p.evaluate(() => ({ y: Math.round(scrollY), largura: document.documentElement.scrollWidth, tela: innerWidth,
        imagensQuebradas: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.currentSrc) })))
      if ([390, 1440].includes(largura) && [0, .4, 1].includes(fracao)) await p.screenshot({ path: path.join(pasta, `${nome}-${fracao}.jpg`), type: 'jpeg', quality: 85 })
    }
    const dom = await p.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent,
      noindex: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
      demonstracao: document.body.innerText.includes('empresa fictícia'),
      ancorasInvalidas: [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.getAttribute('href').slice(1))).map(a => a.getAttribute('href')),
      pinos: document.querySelectorAll('.pin-spacer').length,
    }))
    let troca
    if (largura === 390 && !reduzido) {
      await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
      await esperar(1000)
      troca = await p.evaluate(() => ({ pinos: document.querySelectorAll('.pin-spacer').length, canvas: document.querySelectorAll('canvas').length, lenis: document.documentElement.className }))
    }
    casos.push({ nome, medidas, ...dom, troca })
    console.log(nome)
    await p.close()
  }
} finally { await browser.close() }
const falhas = casos.flatMap(c => [
  ...c.medidas.filter(m => m.largura > m.tela).map(m => `${c.nome}: rolagem lateral ${m.largura}/${m.tela}`),
  ...c.medidas.flatMap(m => m.imagensQuebradas).map(u => `${c.nome}: imagem quebrada ${u}`),
  ...c.ancorasInvalidas.map(a => `${c.nome}: ancora ${a}`),
  ...(!c.demonstracao || !c.noindex?.includes('noindex') ? [`${c.nome}: sinalizacao demo ausente`] : []),
  ...(c.nome.includes('reduzido') && c.pinos ? [`${c.nome}: pin com movimento reduzido`] : []),
  ...(c.troca && (c.troca.pinos || c.troca.canvas || c.troca.lenis.includes('lenis-smooth')) ? [`${c.nome}: preferencia reduzida dinamica nao limpou efeitos`] : []),
])
fs.writeFileSync(path.join(pasta, 'resultado.json'), JSON.stringify({ casos, erros, falhas }, null, 2))
console.log(JSON.stringify({ casos: casos.length, erros, falhas }))
if (falhas.length || erros.length) process.exitCode = 1
