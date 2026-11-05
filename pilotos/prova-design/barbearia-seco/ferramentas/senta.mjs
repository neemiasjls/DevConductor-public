// Confere o fim da cena "Senta aí." no celular: letras sem transform residual, dentro da tela e legíveis.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const saida = process.argv[2] || 'revisao/senta'
fs.mkdirSync(saida, { recursive: true })
const nav = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
for (const [w, h] of [[360, 740], [390, 844], [414, 896]]) {
  const p = await nav.newPage()
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  await p.goto('http://localhost:5183/', { waitUntil: 'networkidle0' })
  const pos = await p.evaluate(() => { const a = document.querySelector('#senta').closest('.cena-presa'); return { y: a.getBoundingClientRect().top + scrollY, h: a.offsetHeight } })
  const res = []
  for (const f of [0.6, 0.85, 1]) {
    // desce aos poucos até o ponto (como gente), para o scrub chegar ao fim
    await p.evaluate((y) => scrollTo(0, y), Math.round(pos.y + f * (pos.h - h)) - 200)
    await new Promise((r) => setTimeout(r, 300))
    await p.evaluate((y) => scrollTo(0, y), Math.round(pos.y + f * (pos.h - h)))
    await new Promise((r) => setTimeout(r, 1100))
    const m = await p.evaluate(() => {
      const letras = [...document.querySelectorAll('[data-letra]')]
      const t = letras.map((l) => new DOMMatrix(getComputedStyle(l).transform))
      const residuo = Math.max(...t.map((m) => Math.abs(m.e) + Math.abs(m.f) + Math.abs(m.b) * 100 + Math.abs(m.a - 1) * 100))
      const rs = letras.map((l) => l.getBoundingClientRect())
      const dentro = rs.every((r) => r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1)
      return { residuo: +residuo.toFixed(2), dentro, linhas: [...new Set(rs.map((r) => Math.round(r.top)))], larguraFrase: Math.round(Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.left))) }
    })
    res.push({ f, ...m })
    if (f === 1) await p.screenshot({ path: `${saida}/senta-${w}.jpg`, type: 'jpeg', quality: 80 })
  }
  console.log(w, JSON.stringify(res))
  await p.close()
}
await nav.close()
