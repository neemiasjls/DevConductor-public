import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { gzipSync } from 'node:zlib'
const local = path.dirname(fileURLToPath(import.meta.url))
const exigir = createRequire(path.join(local, '../estudios/package.json'))
const puppeteer = exigir('puppeteer-core')
const pasta = path.join(local, 'vitrine'), saida = path.join(local, 'evidencias')
const videos = fs.readdirSync(pasta).filter(n => n.endsWith('.webm'))
assert.equal(videos.length, 8)
const metadados = videos.map(nome => {
  const dados = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', path.join(pasta, nome)], { encoding: 'utf8' }))
  const duracao = Number(dados.format.duration)
  assert(duracao >= 8 && duracao <= 90, `${nome}: duração inválida`)
  const celular = nome.includes('-celular')
  assert.equal(dados.streams[0].width, celular ? 390 : 1440)
  assert.equal(dados.streams[0].height, celular ? 844 : 900)
  for (const quadro of ['000','020','040','060','080','100']) assert(fs.existsSync(path.join(pasta, nome.replace('.webm', `-${quadro}.png`))))
  return { nome, duracao, largura: dados.streams[0].width, altura: dados.streams[0].height }
})
const navegador = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: path.join(saida, '.perfil-vitrine') })
try {
  const p = await navegador.newPage(), erros = []
  p.on('pageerror', e => erros.push(e.message))
  p.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`) })
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto('http://127.0.0.1:5192/vitrine/galeria.html', { waitUntil: 'networkidle0' })
  assert.equal(await p.$$eval('video', es => es.length), 8)
  assert(await p.$$eval('video', es => es.every(e => e.paused && e.controls)))
  assert.equal(await p.$$eval('input:checked', es => es.length), 0)
  for (const largura of [390,1440]) {
    await p.setViewport({ width: largura, height: 900 })
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  }
  for (let i = 0; i < videos.length; i++) {
    const estado = await p.evaluate(async i => {
      const v = document.querySelectorAll('video')[i]
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Vídeo sem metadados')), 10000)
        const pronto = () => { clearTimeout(timer); resolve() }
        if (v.readyState >= 1) pronto(); else v.addEventListener('loadedmetadata', pronto, { once: true })
      })
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Busca no vídeo não terminou')), 10000)
        v.addEventListener('seeked', () => { clearTimeout(timer); resolve() }, { once: true })
        v.currentTime = v.duration / 2
      })
      const antes = v.currentTime
      await v.play(); await new Promise(r => setTimeout(r, 300)); v.pause()
      return { duracao: v.duration, antes, depois: v.currentTime, erro: v.error?.message }
    }, i)
    assert(Number.isFinite(estado.duracao) && estado.duracao > 8)
    assert(estado.depois > estado.antes); assert.equal(estado.erro, undefined)
  }
  await p.goto('http://127.0.0.1:5192/', { waitUntil: 'networkidle0' })
  assert.equal(await p.$$eval('nav a', es => es.length), 4)
  for (const id of ['luxo-editorial','tecnologico-escuro','claro-organico','editorial-serio']) {
    await p.goto(`http://127.0.0.1:5192/site/${id}.html`, { waitUntil: 'networkidle0' })
    await p.keyboard.press('Tab')
    assert.equal(await p.evaluate(() => document.activeElement.textContent.trim()), 'Pular para o conteúdo')
    await p.keyboard.press('Enter')
    assert.equal(new URL(p.url()).hash, '#conteudo')
  }
  assert.deepEqual(erros, [])
  const pesos = {}
  for (const id of ['luxo-editorial','tecnologico-escuro','claro-organico','editorial-serio']) {
    const arquivos = [`site/${id}.html`, 'site/estilos.css', 'site/movimento.js', 'assets/familjen.woff2', 'assets/favicon.svg']
    if (id !== 'tecnologico-escuro') arquivos.push('assets/bodoni.woff2')
    if (['luxo-editorial','claro-organico'].includes(id)) arquivos.push('assets/mar.jpg')
    const bruto = arquivos.reduce((n, f) => n + fs.statSync(path.join(local, f)).size, 0)
    const comCompressaoTextual = arquivos.reduce((n, f) => n + (['.html','.css','.js','.svg'].includes(path.extname(f)) ? gzipSync(fs.readFileSync(path.join(local, f))).length : fs.statSync(path.join(local, f)).size), 0)
    assert(bruto < 1500000)
    pesos[id] = { bruto, comCompressaoTextual }
  }
  fs.writeFileSync(path.join(saida, 'vitrine.json'), JSON.stringify({ passou: true, videos: metadados, quadros: 48, reproduzirBuscar: true, reduzidoSemAutoplay: true, teclado: 4, pesos }, null, 2))
  console.log('8 vídeos: duração, reprodução e busca válidas; 48 quadros; reduzido sem autoplay; 4 páginas com acesso por teclado.')
} finally {
  const timer = setTimeout(() => navegador.process()?.kill(), 5000)
  await navegador.close().finally(() => clearTimeout(timer))
}
