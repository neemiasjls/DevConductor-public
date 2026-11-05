// Comparador de medições com arquivos do medir-uso montados à mão.
// Rodar: node --test scripts/testes/comparar-medicoes.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'scripts', 'comparar-medicoes.mjs')
const comparar = (...a) => spawnSync(process.execPath, [script, ...a], { encoding: 'utf8' })

function pasta(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-comparar-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 30, retryDelay: 300 }))
  return dir
}
// Uma sessão no formato do medir-uso --json.
function medicao(dir, nome, { entrada, cacheGravado = 0, cacheLido, saida, modelo = 'claude-opus-5-5', respostas = 5 }) {
  const arq = path.join(dir, nome)
  const porModelo = { [modelo]: { respostas, entrada, cacheGravado, cacheLido, saida } }
  const totais = { entrada: entrada + cacheGravado, cacheLido, saida }
  fs.writeFileSync(arq, JSON.stringify({
    sessoes: [{ id: nome, porModelo, totais, mensagensCompartilhadas: 0 }], totais, porModelo, mensagensUnicas: respostas,
  }))
  return arq
}

test('soma cada grupo e calcula a diferença contra o primeiro', (t) => {
  const d = pasta(t)
  medicao(d, 'grafo-t1-sem.json', { entrada: 100, cacheGravado: 900, cacheLido: 9000, saida: 500 })
  medicao(d, 'grafo-t2-sem.json', { entrada: 100, cacheGravado: 900, cacheLido: 9000, saida: 500 })
  medicao(d, 'grafo-t1-com.json', { entrada: 100, cacheGravado: 400, cacheLido: 6000, saida: 500 })
  medicao(d, 'grafo-t2-com.json', { entrada: 100, cacheGravado: 400, cacheLido: 6000, saida: 500 })
  const r = comparar(`sem=${path.join(d, 'grafo-*-sem.json')}`, `com=${path.join(d, 'grafo-*-com.json')}`, '--json')
  assert.equal(r.status, 0, r.stderr)
  const { base, grupos } = JSON.parse(r.stdout)
  assert.equal(base, 'sem')
  assert.equal(grupos[0].sessoes, 2)
  assert.equal(grupos[0].entradaMaisCache, 2 * (1000 + 9000))
  assert.equal(grupos[1].entradaMaisCache, 2 * (500 + 6000))
  assert.equal(grupos[1].diferencaContraBase.entradaMaisCache, -35)
  assert.equal(grupos[1].diferencaContraBase.saida, 0)
})

test('separa por modelo (roteamento: opus contra opus + sonnet)', (t) => {
  const d = pasta(t)
  const a = medicao(d, 'direto.json', { entrada: 10, cacheLido: 100, saida: 10, modelo: 'claude-opus-5-5', respostas: 8 })
  const b1 = medicao(d, 'rot-1.json', { entrada: 5, cacheLido: 50, saida: 5, modelo: 'claude-opus-5-5', respostas: 3 })
  const b2 = medicao(d, 'rot-2.json', { entrada: 5, cacheLido: 50, saida: 5, modelo: 'claude-sonnet-5-5', respostas: 6 })
  const r = comparar(`direto=${a}`, `roteado=${b1},${b2}`, '--json')
  const roteado = JSON.parse(r.stdout).grupos[1]
  assert.deepEqual(Object.keys(roteado.porModelo).sort(), ['claude-opus-5-5', 'claude-sonnet-5-5'])
  assert.equal(roteado.respostas, 9)
  assert.equal(roteado.porModelo['claude-sonnet-5-5'].respostas, 6)
})

test('texto avisa quando os grupos têm números diferentes de sessões e não fala em preço estimado', (t) => {
  const d = pasta(t)
  const a = medicao(d, 'a.json', { entrada: 1, cacheLido: 1, saida: 1 })
  const b = medicao(d, 'b.json', { entrada: 1, cacheLido: 1, saida: 1 })
  const r = comparar(`a=${a}`, `b=${a},${b}`)
  assert.equal(r.status, 0)
  assert.match(r.stdout, /números diferentes de sessões/)
  assert.match(r.stdout, /Preço não é estimado/)
})

test('erros claros: grupo único, sem rótulo, arquivo ausente, curinga sem achados, curinga na pasta', (t) => {
  const d = pasta(t)
  const a = medicao(d, 'a.json', { entrada: 1, cacheLido: 1, saida: 1 })
  assert.match(comparar(`a=${a}`).stderr, /pelo menos dois grupos/)
  assert.match(comparar(a, `b=${a}`).stderr, /sem rótulo/)
  assert.match(comparar(`a=${a}`, `b=${path.join(d, 'nao.json')}`).stderr, /não encontrado/)
  assert.match(comparar(`a=${a}`, `b=${path.join(d, 'x-*.json')}`).stderr, /Nenhum arquivo/)
  assert.match(comparar(`a=${a}`, `b=${path.join(d, '*', 'a.json')}`).stderr, /só no nome do arquivo/)
})

test('lê os arquivos reais já medidos no projeto', { skip: !fs.existsSync(path.join(raiz, 'pilotos', 'medicoes')) && 'sem pilotos/medicoes' }, () => {
  const medicoes = path.join(raiz, 'pilotos', 'medicoes')
  const r = comparar(`ans=${path.join(medicoes, 'ans-transicao.json')}`, `especialista=${path.join(medicoes, 'teste-especialista.json')}`, '--json')
  assert.equal(r.status, 0, r.stderr)
  const { grupos } = JSON.parse(r.stdout)
  assert.ok(grupos.every((g) => g.sessoes >= 1 && g.entradaMaisCache > 0))
})

test('histórico compartilhado entre sessões não é contado duas vezes', (t) => {
  const d = pasta(t)
  // Duas sessões que repetem as mesmas 4 respostas: o medir-uso deduplica no total do arquivo.
  const sessao = (id) => ({ id, mensagensCompartilhadas: 4, totais: { entrada: 100, cacheLido: 1000, saida: 10 },
    porModelo: { 'claude-opus-5-5': { respostas: 4, entrada: 100, cacheGravado: 0, cacheLido: 1000, saida: 10 } } })
  const arq = path.join(d, 'compartilhado.json')
  fs.writeFileSync(arq, JSON.stringify({ sessoes: [sessao('s1'), sessao('s2')], totais: { entrada: 100, cacheLido: 1000, saida: 10 }, mensagensUnicas: 4 }))
  const b = medicao(d, 'b.json', { entrada: 100, cacheLido: 1000, saida: 10, respostas: 4 })
  const r = comparar(`a=${arq}`, `b=${b}`, '--json')
  const [a] = JSON.parse(r.stdout).grupos
  assert.equal(a.entradaMaisCache, 1100)
  assert.equal(a.respostas, 4)
  assert.equal(a.porModeloAproximado, true)
  assert.match(comparar(`a=${arq}`, `b=${b}`).stdout, /divisão por modelo soma sessões/)
})

test('a mesma sessão em dois arquivos do grupo é recusada', (t) => {
  const d = pasta(t)
  const a = medicao(d, 'x.json', { entrada: 1, cacheLido: 1, saida: 1 })
  const copia = path.join(d, 'copia.json')
  fs.copyFileSync(a, copia)
  assert.match(comparar(`a=${a},${copia}`, `b=${a}`).stderr, /seria contada duas vezes/)
})

test('lê arquivo gravado em UTF-16 (">" do Windows PowerShell 5.1) e UTF-8 com BOM', (t) => {
  const d = pasta(t)
  const a = medicao(d, 'a.json', { entrada: 5, cacheLido: 50, saida: 1 })
  const texto = fs.readFileSync(a, 'utf8')
  const u16 = path.join(d, 'u16.json')
  fs.writeFileSync(u16, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(texto, 'utf16le')]))
  const bom = path.join(d, 'bom.json')
  fs.writeFileSync(bom, '\uFEFF' + texto.replace('"a.json"', '"bom"'))
  const r = comparar(`u16=${u16}`, `bom=${bom}`, '--json')
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(JSON.parse(r.stdout).grupos.map((g) => g.entradaMaisCache), [55, 55])
})
