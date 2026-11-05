import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const detector = path.join(raiz, 'plugins/devconductor-core/hooks/detectar-stack.mjs')

test('catálogo e fontes apontam para o núcleo renomeado, sem uma segunda cópia ativa', () => {
  const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, '.claude-plugin/marketplace.json'), 'utf8'))
  assert.equal(catalogo.name, 'devconductor')
  assert.equal(catalogo.plugins.filter(p => p.name === 'devconductor-core').length, 1)
  assert(!catalogo.plugins.some(p => p.name === 'devagents-core'))
  assert(!fs.existsSync(path.join(raiz, 'plugins/devagents-core')))
  const fontes = JSON.parse(fs.readFileSync(path.join(raiz, 'fontes.json'), 'utf8'))
  for (const f of fontes.arquivos.filter(f => /plugins\/dev(?:agents|conductor)-core\//.test(f.destino))) {
    assert(f.destino.startsWith('plugins/devconductor-core/'), f.destino)
    assert(fs.existsSync(path.join(raiz, f.destino)), f.destino)
  }
})

test('detector respeita escolhas legadas sem reinstalar alias ou alterar os settings', t => {
  const base = path.join(raiz, 'pilotos/testes-temporarios')
  fs.mkdirSync(base, { recursive: true })
  const projeto = fs.mkdtempSync(path.join(base, 'rename-detector-'))
  t.after(() => {
    assert.equal(path.dirname(projeto), base)
    fs.rmSync(projeto, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  })
  fs.writeFileSync(path.join(projeto, 'package.json'), '{}')
  fs.mkdirSync(path.join(projeto, '.claude'))
  const rodar = () => spawnSync(process.execPath, [detector, '--projeto', projeto, '--dry-run'], { encoding: 'utf8' })
  assert.match(rodar().stdout, /stack-typescript@devconductor/)
  const casos = [
    [{}, { 'stack-typescript@devagents': false }],
    [{ 'stack-typescript@devagents': false }, {}],
    [{}, { 'stack-typescript@devagents': true }],
    [{ 'stack-typescript@devconductor': true }, { 'stack-typescript@devagents': false }],
    [{ 'stack-typescript@devagents': true }, { 'stack-typescript@devconductor': false }],
  ]
  for (const [compartilhados, locais] of casos) {
    const arquivos = [['settings.json', compartilhados], ['settings.local.json', locais]]
      .map(([nome, enabledPlugins]) => [path.join(projeto, '.claude', nome), JSON.stringify({ enabledPlugins, permissao: 'preservar' })])
    for (const [arquivo, texto] of arquivos) fs.writeFileSync(arquivo, texto)
    const r = rodar()
    assert.equal(r.status, 0, r.stderr)
    assert.equal(r.stdout, '', JSON.stringify([compartilhados, locais]))
    for (const [arquivo, texto] of arquivos) assert.equal(fs.readFileSync(arquivo, 'utf8'), texto)
  }
})
