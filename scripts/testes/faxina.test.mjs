// Projeto fictício em pasta temporária (com espaço e acento). Rodar: node --test scripts/testes/faxina.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const faxina = path.join(raiz, 'plugins/devconductor-core/skills/faxina/scripts/faxina.mjs')

const dup = `export function formatarValor(valor, moeda) {
  // comentario que nao conta
  const numero = Number(valor)
  if (Number.isNaN(numero)) return '-'
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: moeda })
}
`
const bloco = ['const a = carregarDados(entrada)', 'const b = validarCampos(a, regras)', 'const c = transformar(b, opcoes)',
  'const d = agruparPorTipo(c, chaves)', 'const e = ordenarResultado(d, criterio)', 'const f = montarResposta(e, formato)',
  'registrarEvento(f, contexto)', 'return enviarParaFila(f, destino)']

function projeto(t) {
  const pasta = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'faxina '))
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }))
  const dir = path.join(pasta, 'Sistema de Gestão')
  const w = (rel, txt) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt) }
  w('src/a.ts', dup + 'export function tratar(x) {\n  const y = x + 1\n  return y * 2 + 10 + 100\n}\n')
  w('src/b.ts', dup + 'function tratar(x) {\n  const y = x + 2\n  return y * 3 + 10 + 100\n}\n')
  w('src/c.ts', 'function tratar(x) {\n  const y = x + 3\n  return y * 4 + 10 + 100\n}\n')
  w('src/x.ts', `function um() {\n${bloco.map((l) => '  ' + l).join('\n')}\n}\n`)
  w('src/y.ts', `function dois() {\n  const outro = 1\n${bloco.map((l) => '  ' + l).join('\n')}\n}\n`)
  w('src/grande.ts', Array.from({ length: 600 }, (_, i) => `const v${i} = ${i}`).join('\n') + '\n')
  w('src/ação.ts', 'export const çã = 1\n')
  w('node_modules/lib/z.ts', dup)
  w('src/Migrations/m.cs', Array.from({ length: 700 }, (_, i) => `// ${i}`).join('\n'))
  w('src/x.test.ts', dup)
  w('tests/t.ts', dup)
  w('src/tipos.d.ts', dup)
  w('src/lib.min.js', dup)
  w('src/Foo.Designer.cs', dup)
  const git = (...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir })
  git('init', '-q')
  git('add', '-A')
  return dir
}
const rodar = (dir, ...extra) => spawnSync(process.execPath, [faxina, dir, '--json', ...extra], { encoding: 'utf8' })

test('faxina: exclusões, iguais, mesmo nome e bloco copiado', (t) => {
  const dir = projeto(t)
  const r = rodar(dir)
  assert.equal(r.status, 0, r.stderr)
  const j = JSON.parse(r.stdout)
  assert.deepEqual(j.grandes.itens.map((g) => g.arquivo), ['src/grande.ts'])
  assert.equal(j.grandes.itens[0].linhas, 600)
  const igual = j.iguais.itens.find((g) => g.nome === 'formatarValor')
  assert.ok(igual, 'formatarValor deve aparecer como igual')
  assert.deepEqual(igual.locais.map((l) => l.arquivo).sort(), ['src/a.ts', 'src/b.ts'])
  const nome = j.mesmoNome.itens.find((g) => g.nome === 'tratar')
  assert.ok(nome && nome.arquivos === 3 && nome.versoes === 3)
  assert.ok(!j.iguais.itens.some((g) => g.nome === 'tratar'))
  const b = j.blocos.itens.find((x) => x.locais.some((l) => l.arquivo === 'src/x.ts'))
  assert.ok(b && b.linhas >= 8 && b.locais.length === 2)
})

test('faxina: saída em texto sai com código 0 e não grava nada', (t) => {
  const dir = projeto(t)
  const status = () => spawnSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' }).stdout
  const antes = status()
  const r = spawnSync(process.execPath, [faxina, dir, '--top', '3'], { encoding: 'utf8' })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /Arquivos grandes/)
  assert.match(r.stdout, /Sistema de Gestão/)
  assert.equal(status(), antes)
})

test('faxina: pasta inexistente falha com mensagem', () => {
  const r = spawnSync(process.execPath, [faxina, path.join(os.tmpdir(), 'nao-existe-faxina-xyz')], { encoding: 'utf8' })
  assert.equal(r.status, 1)
})
