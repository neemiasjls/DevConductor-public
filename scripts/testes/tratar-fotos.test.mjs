import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const script = path.resolve('plugins/landing-pages/skills/lp-assets/scripts/tratar-fotos.py')
const py = (args, opts = {}) => spawnSync('python', ['-I', ...args], { encoding: 'utf8', ...opts })
const temPillow = py(['-c', 'import PIL, numpy']).status === 0
const teste = temPillow ? test : (n, f) => test(n, { skip: 'sem python com pillow e numpy' }, f)
const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')

const gerar = (dir) => {
  const codigo = `
import sys
from PIL import Image
d = sys.argv[1]
Image.new('RGB', (2400, 1200), (200, 40, 40)).save(d + '/vermelha.png')
Image.new('RGB', (1000, 1500), (40, 60, 210)).save(d + '/azul.png')
Image.new('RGB', (1800, 1800), (60, 200, 70)).save(d + '/verde.png')
`
  assert.equal(py(['-c', codigo, dir]).status, 0)
}

const mediaCor = (arquivo) => {
  const r = py(['-c', "import sys,numpy as np\nfrom PIL import Image\nprint(*np.asarray(Image.open(sys.argv[1]).convert('RGB')).reshape(-1,3).mean(axis=0))", arquivo])
  return r.stdout.trim().split(/\s+/).map(Number)
}
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))

teste('tratar-fotos: recorte, largura, originais intactos e relatorio', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tratar-'))
  const ent = path.join(base, 'ent'), sai = path.join(base, 'sai')
  fs.mkdirSync(ent)
  gerar(ent)
  fs.writeFileSync(path.join(ent, 'nota.txt'), 'nao e imagem')
  const antes = Object.fromEntries(fs.readdirSync(ent).map((f) => [f, hash(path.join(ent, f))]))
  const tr = path.join(base, 'tratamento.json')
  fs.writeFileSync(tr, JSON.stringify({ proporcoes: ['4:5', '16:9', '1:1'], larguraMax: 600, larguraMin: 100, formato: 'webp', qualidade: 80 }))
  const r = py([script, ent, sai, '--tratamento', tr])
  assert.equal(r.status, 0, r.stderr + r.stdout)
  for (const f of Object.keys(antes)) assert.equal(hash(path.join(ent, f)), antes[f], `${f} mudou`)
  const rel = JSON.parse(fs.readFileSync(path.join(sai, 'tratamento-aplicado.json'), 'utf8'))
  assert.equal(rel.arquivos.length, 3)
  assert.deepEqual(rel.ignorados, ['nota.txt'])
  const esperado = { 'vermelha.png': '16:9', 'azul.png': '4:5', 'verde.png': '1:1' }
  for (const a of rel.arquivos) {
    assert.equal(a.proporcao, esperado[a.entrada])
    assert.ok(fs.existsSync(path.join(sai, a.saida)))
    const [w, h] = a.tamanho
    assert.ok(w <= 600)
    const [pw, ph] = a.proporcao.split(':').map(Number)
    assert.ok(Math.abs(w / h - pw / ph) < 0.02, `${a.saida}: ${w}x${h}`)
  }
  assert.equal(rel.arquivos[0].entradaSha256, antes[rel.arquivos[0].entrada])
  fs.rmSync(base, { recursive: true, force: true })
})

teste('tratar-fotos: tinta forte aproxima as cores; aviso de foto pequena; saida = entrada recusada', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tratar-'))
  const ent = path.join(base, 'ent'), sai = path.join(base, 'sai')
  fs.mkdirSync(ent)
  gerar(ent)
  const tr = path.join(base, 'tratamento.json')
  fs.writeFileSync(tr, JSON.stringify({ larguraMax: 600, larguraMin: 1100, tinta: { cor: '#c8a27a', forca: 0.9 }, grao: 0 }))
  const r = py([script, ent, sai, '--tratamento', tr])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /abaixo do m/)
  const pares = [['vermelha', 'azul'], ['vermelha', 'verde'], ['azul', 'verde']]
  const antes = pares.map(([a, b]) => dist(mediaCor(path.join(ent, a + '.png')), mediaCor(path.join(ent, b + '.png'))))
  const depois = pares.map(([a, b]) => dist(mediaCor(path.join(sai, a + '.webp')), mediaCor(path.join(sai, b + '.webp'))))
  const media = (v) => v.reduce((s, x) => s + x, 0) / v.length
  assert.ok(media(depois) < media(antes) * 0.75, `antes ${media(antes)} depois ${media(depois)}`)
  assert.notEqual(py([script, ent, ent]).status, 0)
  fs.rmSync(base, { recursive: true, force: true })
})

teste('tratar-fotos: --do-raio-x sugere tratamento e tolera formato sem cores', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tratar-'))
  const ent = path.join(base, 'ent'), sai = path.join(base, 'sai')
  fs.mkdirSync(ent)
  const rx = path.join(base, 'raio-x.json')
  fs.writeFileSync(rx, JSON.stringify({ secoes: [{ cores: ['#d4a373', '#c08552'] }] }))
  assert.equal(py([script, ent, sai, '--do-raio-x', rx]).status, 0)
  const sug = JSON.parse(fs.readFileSync(path.join(sai, 'tratamento.json'), 'utf8'))
  assert.ok(sug.temperatura > 0)
  assert.ok(sug.tinta && /^#[0-9a-f]{6}$/.test(sug.tinta.cor))
  fs.writeFileSync(rx, JSON.stringify({ secoes: [{ nome: 'x' }] }))
  const r = py([script, ent, sai, '--do-raio-x', rx])
  assert.equal(r.status, 0)
  assert.match(r.stdout, /aviso/)
  fs.rmSync(base, { recursive: true, force: true })
})

teste('tratar-fotos: a saída sai em UTF-8, com acento correto', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tratar-'))
  const ent = path.join(base, 'ent'), sai = path.join(base, 'sai')
  fs.mkdirSync(ent)
  gerar(ent)
  const r = spawnSync('python', ['-I', script, ent, sai], { encoding: 'buffer', env: { ...process.env, PYTHONIOENCODING: 'cp1252', PYTHONUTF8: '0' } })
  assert.equal(r.status, 0, r.stderr.toString('utf8'))
  const texto = r.stdout.toString('utf8')
  assert.match(texto, /padrão/)
  assert.ok(!texto.includes('�'))
  fs.rmSync(base, { recursive: true, force: true })
})

// Ampliador falso: lê -i e -o e grava a imagem 4x maior (ou sai com código 1). Portátil: script Python chamado por .cmd/.sh.
const criarAmpliadorFalso = (dir, falha = false) => {
  const pyScript = path.join(dir, 'falso.py')
  fs.writeFileSync(pyScript, `
import sys
from PIL import Image
if ${falha ? 'True' : 'False'}:
    sys.exit(1)
a = sys.argv
i, o = a[a.index('-i') + 1], a[a.index('-o') + 1]
im = Image.open(i).convert('RGB')
im.resize((im.width * 4, im.height * 4)).save(o)
`)
  const win = process.platform === 'win32'
  const exe = path.join(dir, win ? 'falso.cmd' : 'falso.sh')
  const pyBin = spawnSync('python', ['-c', 'import sys;print(sys.executable)'], { encoding: 'utf8' }).stdout.trim()
  fs.writeFileSync(exe, win ? `@echo off\r\n"${pyBin}" "${pyScript}" %*\r\n` : `#!/bin/sh\nexec "${pyBin}" "${pyScript}" "$@"\n`)
  if (!win) fs.chmodSync(exe, 0o755)
  return exe
}
const gerarPequenaEGrande = (dir) => {
  const codigo = `
import sys
from PIL import Image
d = sys.argv[1]
Image.new('RGB', (300, 200), (200, 40, 40)).save(d + '/pequena.png')
Image.new('RGB', (900, 600), (40, 60, 210)).save(d + '/grande.png')
`
  assert.equal(py(['-c', codigo, dir]).status, 0)
}
const rodarAmpliar = (ampliador, falha) => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tratar-'))
  const ent = path.join(base, 'ent'), sai = path.join(base, 'sai')
  fs.mkdirSync(ent)
  gerarPequenaEGrande(ent)
  const tr = path.join(base, 'tratamento.json')
  fs.writeFileSync(tr, JSON.stringify({ proporcoes: ['3:2'], larguraMax: 800, larguraMin: 100, grao: 0 }))
  const env = { ...process.env }
  delete env.REALESRGAN_EXE
  const exe = ampliador === 'falso' ? criarAmpliadorFalso(base, falha) : path.join(base, 'nao-existe.exe')
  const r = py([script, ent, sai, '--tratamento', tr, '--ampliar', '--ampliador', exe], { env })
  const rel = JSON.parse(fs.readFileSync(path.join(sai, 'tratamento-aplicado.json'), 'utf8'))
  const por = Object.fromEntries(rel.arquivos.map((a) => [a.entrada, a]))
  return { r, por, base }
}

teste('tratar-fotos: --ampliar sem o programa avisa e segue sem ampliar', () => {
  const { r, por, base } = rodarAmpliar('inexistente')
  assert.equal(r.status, 0, r.stderr + r.stdout)
  assert.match(r.stdout, /Real-ESRGAN não foi achado/)
  assert.match(r.stdout, /REALESRGAN_EXE/)
  assert.equal(por['pequena.png'].ampliada, false)
  assert.equal(por['grande.png'].ampliada, false)
  fs.rmSync(base, { recursive: true, force: true })
})

teste('tratar-fotos: --ampliar amplia só a foto menor que larguraMax e respeita larguraMax', () => {
  const { r, por, base } = rodarAmpliar('falso')
  assert.equal(r.status, 0, r.stderr + r.stdout)
  assert.equal(por['pequena.png'].ampliada, true)
  assert.deepEqual(por['pequena.png'].ampliacao.tamanhoAntes, [300, 200])
  assert.deepEqual(por['pequena.png'].ampliacao.tamanhoDepois, [1200, 800])
  assert.equal(por['pequena.png'].ampliacao.modelo, 'realesrgan-x4plus')
  assert.ok(por['pequena.png'].tamanho[0] <= 800 && por['pequena.png'].tamanho[0] > 300)
  assert.equal(por['grande.png'].ampliada, false)
  assert.equal(por['grande.png'].ampliacao, undefined)
  fs.rmSync(base, { recursive: true, force: true })
})

teste('tratar-fotos: ampliador que falha usa a original e avisa', () => {
  const { r, por, base } = rodarAmpliar('falso', true)
  assert.equal(r.status, 0, r.stderr + r.stdout)
  assert.match(r.stdout, /pequena\.png: ampliador saiu com código 1/)
  assert.equal(por['pequena.png'].ampliada, false)
  assert.deepEqual(por['pequena.png'].tamanho, [300, 200])
  fs.rmSync(base, { recursive: true, force: true })
})
