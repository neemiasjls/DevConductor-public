// Clímax do degradê em várias larguras × alturas (retrato, paisagem, zoom): cada etapa em print e a geometria
// conferida — foto + três marcas dentro da coluna, proporção exata da foto (as marcas são % dela), texto sem corte.
// Uso (preview no ar): node ferramentas/degrade-telas.mjs revisao/<pasta-nova> [url]
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const saida = path.resolve(process.argv[2] || '')
const url = process.argv[3] || 'http://127.0.0.1:5203/'
if (!process.argv[2] || fs.existsSync(saida)) throw Error('Informe uma pasta nova de saída')
fs.mkdirSync(saida, { recursive: true })
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)
const nav = await puppeteer.launch({ executablePath: process.env.BROWSER_EXECUTABLE || edge, headless: true,
  userDataDir: path.join(saida, '.perfil'), args: ['--hide-scrollbars'] })
// [largura, altura, escala]; zoom de 200% em 1280 equivale a 640 CSS px.
const telas = [[320, 568], [360, 640], [360, 844], [390, 844], [430, 932], [844, 390], [768, 1024], [1024, 768], [1280, 720], [640, 400], [1440, 900], [1920, 1080]]
const etapas = [0.04, 0.35, 0.62, 0.96] // linha na nuca, no pente 1, na tesoura, foto inteira
const resultado = { data: new Date().toISOString(), telas: [], aprovado: false }
try {
  for (const [w, h] of telas) {
    const p = await nav.newPage()
    await p.setViewport({ width: w, height: h, isMobile: w < 768, hasTouch: w < 768 })
    await p.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
    await p.evaluate(() => document.fonts.ready)
    const r = { tela: `${w}x${h}`, etapas: [] }
    for (const i of etapas) {
      const y = await p.evaluate((i) => {
        const inv = document.querySelector('.percurso-degrade')
        const topo = inv.getBoundingClientRect().top + scrollY
        const curso = inv.offsetHeight - innerHeight
        const prog = i
        return Math.round(topo + prog * curso)
      }, i)
      await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y)
      await new Promise((res) => setTimeout(res, 900))
      const g = await p.evaluate(() => {
        const sec = document.querySelector('#degrade').getBoundingClientRect()
        const caixa = document.querySelector('#degrade figure > div > div:first-child').getBoundingClientRect()
        const regua = document.querySelector('#degrade figure > div > div:nth-child(2)').getBoundingClientRect()
        const img = document.querySelector('#degrade img')
        const titulo = document.querySelector('#degrade-titulo').getBoundingClientRect()
        const texto = document.querySelector('#degrade-titulo').nextElementSibling.getBoundingClientRect()
        const medidas = [...document.querySelectorAll('#degrade [data-marca]')]
          .filter((e) => getComputedStyle(e).visibility === 'visible' && Number(getComputedStyle(e).opacity) > 0.5)
          .map((e) => e.getBoundingClientRect())
        const fora = (b) => b.left < sec.left - 0.5 || b.right > sec.right + 0.5 || b.top < sec.top - 0.5 || b.bottom > sec.bottom + 0.5
        return {
          caixa: { x: caixa.x, w: caixa.width, h: caixa.height }, reguaDireita: regua.right, larguraTela: innerWidth,
          proporcao: caixa.width / caixa.height, arquivo: img.naturalWidth / img.naturalHeight,
          foraDaSecao: [caixa, regua, titulo, texto, ...medidas].filter(fora).length,
          sobreposicao: medidas.some((m) => m.top < texto.bottom && m.bottom > texto.top && m.left < texto.right && m.right > texto.left),
          scrollLateral: document.documentElement.scrollWidth > innerWidth + 1,
        }
      })
      g.proporcaoOk = Math.abs(g.proporcao - g.arquivo) < 0.01
      g.ok = g.proporcaoOk && g.foraDaSecao === 0 && !g.sobreposicao && !g.scrollLateral && g.caixa.h >= 200
      r.etapas.push({ etapa: i, ...g })
      await p.screenshot({ path: path.join(saida, `${w}x${h}-etapa${i}.jpg`), type: 'jpeg', quality: 78 })
    }
    r.ok = r.etapas.every((e) => e.ok)
    resultado.telas.push(r)
    await p.close()
  }
  resultado.aprovado = resultado.telas.every((t) => t.ok)
} finally {
  await nav.close()
  fs.writeFileSync(path.join(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify({ aprovado: resultado.aprovado, falhas: resultado.telas.filter((t) => !t.ok).map((t) => t.tela + ':' + JSON.stringify(t.etapas.find((e) => !e.ok))) }))
  if (!resultado.aprovado) process.exitCode = 1
}
