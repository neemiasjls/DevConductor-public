// Comparar rodadas (lp-revisao/scripts/rodadas.mjs): regras do Lighthouse com relatórios mínimos, erro de uso e
// uma rodada real com dois PNG gerados aqui (pulada sem Chrome/Edge).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins/landing-pages/skills/lp-revisao/scripts/rodadas.mjs')
const R = await import(pathToFileURL(script).href)

const relatorio = ({ perf = 0.9, a11y = 1, lcp = 2000, cls = 0.01 } = {}) => ({
  categories: { performance: { title: 'Performance', score: perf }, accessibility: { title: 'Accessibility', score: a11y } },
  audits: { 'largest-contentful-paint': { numericValue: lcp }, 'cumulative-layout-shift': { numericValue: cls } },
})

// PNG RGBA sem compressão de filtro, só com zlib (sem biblioteca).
const tabela = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = tabela[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function png(w, h, cor) {
  const bloco = (tipo, dados) => {
    const t = Buffer.concat([Buffer.from(tipo), dados])
    const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length)
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(t))
    return Buffer.concat([tam, t, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6
  const linhas = []
  for (let y = 0; y < h; y++) {
    const l = Buffer.alloc(1 + w * 4)
    for (let x = 0; x < w; x++) l.set(cor(x, y), 1 + x * 4)
    linhas.push(l)
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(Buffer.concat(linhas))), bloco('IEND', Buffer.alloc(0))])
}

test('sem os dois relatórios diz "Lighthouse não comparado"', () => {
  assert.equal(R.compararLighthouse(null, relatorio()).estado, 'não comparado')
  assert.match(R.compararLighthouse(null, null).motivo, /Lighthouse não comparado/)
})

test('categoria que cai mais de 3 pontos reprova; 3 pontos passa', () => {
  assert.equal(R.compararLighthouse(relatorio({ perf: 0.9 }), relatorio({ perf: 0.87 })).estado, 'passou')
  const r = R.compararLighthouse(relatorio({ perf: 0.9 }), relatorio({ perf: 0.86 }))
  assert.equal(r.estado, 'reprovou')
  assert.match(r.motivo, /Performance caiu 4 pontos/)
})

test('LCP que piora mais de 15% reprova; 15% passa', () => {
  assert.equal(R.compararLighthouse(relatorio({ lcp: 2000 }), relatorio({ lcp: 2300 })).estado, 'passou')
  assert.match(R.compararLighthouse(relatorio({ lcp: 2000 }), relatorio({ lcp: 2320 })).motivo, /LCP piorou 16%/)
})

test('CLS da rodada nova acima de 0,1 reprova', () => {
  assert.equal(R.compararLighthouse(relatorio(), relatorio({ cls: 0.1 })).estado, 'passou')
  assert.match(R.compararLighthouse(relatorio(), relatorio({ cls: 0.11 })).motivo, /CLS 0.110 passou de 0.1/)
})

test('categoria ou medida que sumiu no relatório novo: comparação incompleta, nunca "passou"', () => {
  const semA11y = relatorio(); delete semA11y.categories.accessibility
  let r = R.compararLighthouse(relatorio(), semA11y)
  assert.equal(r.estado, 'incompleto')
  assert.match(r.motivo, /comparação incompleta: Accessibility sumiu do relatório novo/)
  const semMedidas = relatorio(); semMedidas.audits = {}
  r = R.compararLighthouse(relatorio(), semMedidas)
  assert.equal(r.estado, 'incompleto')
  assert.match(r.motivo, /LCP sem medida no relatório novo; CLS sem medida no relatório novo/)
  const queda = relatorio({ perf: 0.5 }); queda.audits = {}
  assert.equal(R.compararLighthouse(relatorio(), queda).estado, 'reprovou', 'queda continua reprovando')
})

test('comparação pedida que não pôde ser feita sai com 2', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'rodadas-incompleta-'))
  try {
    const a = path.join(pasta, 'a'), b = path.join(pasta, 'b')
    fs.mkdirSync(a); fs.mkdirSync(b)
    for (const p of [a, b]) fs.writeFileSync(path.join(p, 'computador-topo.png'), png(2, 2, () => [255, 255, 255, 255]))
    // Navegador que não existe: os prints pedidos não são comparados.
    const env = { ...process.env, BROWSER_EXECUTABLE: path.join(pasta, 'nao-existe.exe') }
    let r = spawnSync(process.execPath, [script, a, b, path.join(pasta, 's1')], { encoding: 'utf8', env })
    assert.equal(r.status, 2, r.stdout + r.stderr)
    assert.match(r.stdout, /COMPARAÇÃO INCOMPLETA/)
    // Só um dos relatórios do Lighthouse.
    fs.rmSync(path.join(b, 'computador-topo.png'))
    fs.writeFileSync(path.join(pasta, 'lh.json'), JSON.stringify(relatorio()))
    r = spawnSync(process.execPath, [script, a, b, path.join(pasta, 's2'), '--lighthouse-antes', path.join(pasta, 'lh.json')], { encoding: 'utf8', env })
    assert.equal(r.status, 2, r.stdout + r.stderr)
    // Relatório novo sem LCP/CLS.
    const sem = relatorio(); sem.audits = {}
    fs.writeFileSync(path.join(pasta, 'lh-sem.json'), JSON.stringify(sem))
    r = spawnSync(process.execPath, [script, a, b, path.join(pasta, 's3'), '--lighthouse-antes', path.join(pasta, 'lh.json'), '--lighthouse-depois', path.join(pasta, 'lh-sem.json')], { encoding: 'utf8', env })
    assert.equal(r.status, 2, r.stdout + r.stderr)
    assert.match(r.stdout, /comparação incompleta/)
  } finally { fs.rmSync(pasta, { recursive: true, force: true }) }
})

test('erro de uso sai com 2', async () => {
  const log = console.log; console.log = () => {}
  try { assert.equal(await R.executar([]), 2) } finally { console.log = log }
  const r = spawnSync(process.execPath, [script, path.join(os.tmpdir(), 'nao-existe-rodadas-a'), path.join(os.tmpdir(), 'nao-existe-rodadas-b')], { encoding: 'utf8' })
  assert.equal(r.status, 2)
})

const navegador = R.acharNavegador()
test('rodada real: porcentagem por print, imagem da diferença e Lighthouse reprovando', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 120_000 }, () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'rodadas-teste-'))
  try {
    const a = path.join(pasta, 'a'), b = path.join(pasta, 'b'), saida = path.join(pasta, 'saida')
    fs.mkdirSync(a); fs.mkdirSync(b)
    const branco = () => [255, 255, 255, 255]
    // 20×10 = 200 pixels; na rodada nova as 5 primeiras colunas ficam vermelhas = 50 pixels = 25%.
    fs.writeFileSync(path.join(a, 'computador-topo.png'), png(20, 10, branco))
    fs.writeFileSync(path.join(b, 'computador-topo.png'), png(20, 10, (x) => (x < 5 ? [220, 0, 0, 255] : [255, 255, 255, 255])))
    fs.writeFileSync(path.join(a, 'celular-topo.png'), png(8, 8, branco))
    fs.writeFileSync(path.join(b, 'celular-topo.png'), png(8, 8, (x, y) => (x === 0 && y === 0 ? [250, 250, 250, 255] : [255, 255, 255, 255]))) // abaixo da tolerância
    fs.writeFileSync(path.join(a, 'so-antes.png'), png(2, 2, branco))
    fs.writeFileSync(path.join(pasta, 'lh-a.json'), JSON.stringify(relatorio({ perf: 0.9 })))
    fs.writeFileSync(path.join(pasta, 'lh-b.json'), JSON.stringify(relatorio({ perf: 0.8 })))

    const r = spawnSync(process.execPath, [script, a, b, saida, '--lighthouse-antes', path.join(pasta, 'lh-a.json'), '--lighthouse-depois', path.join(pasta, 'lh-b.json')], { encoding: 'utf8', timeout: 110_000 })
    assert.equal(r.status, 1, r.stdout + r.stderr)
    const rel = JSON.parse(fs.readFileSync(path.join(saida, 'rodadas.json'), 'utf8'))
    const porNome = Object.fromEntries(rel.prints.map((p) => [p.nome, p]))
    assert.equal(porNome['computador-topo.png'].porcentagem, 25)
    assert.equal(porNome['celular-topo.png'].porcentagem, 0)
    assert.deepEqual(rel.soAntes, ['so-antes.png'])
    assert.equal(rel.lighthouse.estado, 'reprovou')
    const dif = fs.readFileSync(path.join(saida, 'computador-topo-diferenca.png'))
    assert.deepEqual([...dif.subarray(1, 4)], [80, 78, 71]) // "PNG"
    assert.equal(dif.readUInt32BE(16), 20)
    assert.match(fs.readFileSync(path.join(saida, 'resumo.txt'), 'utf8'), /computador-topo\.png: 25% mudado/)

    // Sem Lighthouse: só informa, sai com 0.
    const r2 = spawnSync(process.execPath, [script, a, b, saida], { encoding: 'utf8', timeout: 110_000 })
    assert.equal(r2.status, 0, r2.stdout + r2.stderr)
    assert.match(r2.stdout, /Lighthouse não comparado/)

    // Print ilegível nas duas pastas: a comparação pedida não foi feita, sai com 2.
    for (const p of [a, b]) fs.writeFileSync(path.join(p, 'quebrado.png'), 'isto não é um PNG')
    const r3 = spawnSync(process.execPath, [script, a, b, path.join(pasta, 'saida3')], { encoding: 'utf8', timeout: 110_000 })
    assert.equal(r3.status, 2, r3.stdout + r3.stderr)
    assert.match(r3.stdout, /quebrado\.png: não comparado/)
  } finally {
    for (let i = 0; i < 10; i++) { try { fs.rmSync(pasta, { recursive: true, force: true }); break } catch {} }
  }
})
