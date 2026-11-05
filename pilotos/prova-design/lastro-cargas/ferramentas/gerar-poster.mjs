// Exporta pôsteres do próprio canvas (Edge invisível + SwiftShader), com o fundo transparente da cena.
// Uso: node ferramentas/gerar-poster.mjs [url]   (padrão http://localhost:5181/)
//   caixote-poster.webp            três quartos, 1600×1000 (movimento reduzido, falha de WebGL, Open Graph)
//   caixote-abertura.webp          primeiro quadro no computador, 1680×1050
//   caixote-abertura-celular.webp  primeiro quadro no celular, 390×844 com DPR 1,5 (o limite do canvas)
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const base = process.argv[2] || 'http://localhost:5181/'
const alvos = [
  { arquivo: 'caixote-poster.webp', busca: '?poster', tela: { width: 1600, height: 1000, deviceScaleFactor: 1 } },
  { arquivo: 'caixote-abertura.webp', busca: '?poster=abertura', tela: { width: 1680, height: 1050, deviceScaleFactor: 1 } },
  { arquivo: 'caixote-abertura-celular.webp', busca: '?poster=abertura',
    tela: { width: 390, height: 844, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true } },
]
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const navegador = await puppeteer.launch({ executablePath: edge, headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  userDataDir: path.resolve('revisao/perfil-poster'),
})
try {
  for (const alvo of alvos) {
    const pagina = await navegador.newPage()
    await pagina.setViewport(alvo.tela)
    await pagina.goto(new URL(alvo.busca, base).href, { waitUntil: 'networkidle0', timeout: 60000 })
    await pagina.waitForSelector('#carga[data-pronta] canvas', { timeout: 60000 })
    await new Promise((r) => setTimeout(r, 2500))
    const bytes = await pagina.$eval('#carga canvas', (c) => c.toDataURL('image/webp', 0.86).split(',')[1])
    const destino = path.join('public/modelos', alvo.arquivo)
    fs.writeFileSync(destino, Buffer.from(bytes, 'base64'))
    console.log(destino, Math.round(fs.statSync(destino).size / 1024) + ' KB')
    await pagina.close()
  }
} finally {
  await navegador.close()
}
