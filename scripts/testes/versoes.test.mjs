// Plugin mexido tem de subir de versão (senão `claude plugin update` não copia a mudança) e o catálogo tem de
// estar em dia com os plugin.json. Compara com a main do GitHub; num envio direto na main (o GitHub passa
// VERSOES_BASE = commit de antes do envio) ou sem a main (clone raso), usa o que houver.
// Rodar: node --test scripts/testes/versoes.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { compararVersoes } from '../lib/versoes.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const git = (...a) => spawnSync('git', a, { cwd: raiz, encoding: 'utf8' })
const existe = (ref) => ref && git('cat-file', '-e', `${ref}^{commit}`).status === 0
const base = (() => {
  if (existe(process.env.VERSOES_BASE)) return process.env.VERSOES_BASE
  const r = git('merge-base', 'origin/main', 'HEAD')
  if (r.status !== 0) return null
  const mb = r.stdout.trim()
  // Na própria main, a base seria o HEAD (comparação vazia): compara com o commit anterior.
  return mb === git('rev-parse', 'HEAD').stdout.trim() && existe('HEAD~1') ? git('rev-parse', 'HEAD~1').stdout.trim() : mb
})()

test('todo plugin com mudança desde a main subiu de versão', { skip: !base && 'sem origin/main (clone raso)' }, () => {
  // Mudanças já commitadas e também as que ainda estão só na pasta.
  const mudados = new Set([
    ...git('diff', '--name-only', base, '--', 'plugins/').stdout.split(/\r?\n/),
    ...git('ls-files', '--others', '--exclude-standard', '--', 'plugins/').stdout.split(/\r?\n/),
  ].filter(Boolean))
  const porPlugin = new Map()
  for (const arq of mudados) {
    const [, plugin, ...resto] = arq.split('/')
    if (!plugin || !resto.length) continue
    porPlugin.set(plugin, [...(porPlugin.get(plugin) ?? []), resto.join('/')])
  }
  const semVersao = []
  for (const [plugin, arquivos] of porPlugin) {
    const manifesto = `plugins/${plugin}/.claude-plugin/plugin.json`
    if (!fs.existsSync(path.join(raiz, manifesto))) continue // plugin apagado
    const atual = JSON.parse(fs.readFileSync(path.join(raiz, manifesto), 'utf8')).version
    const antes = git('show', `${base}:${manifesto}`)
    if (antes.status !== 0) continue // plugin novo
    const anterior = JSON.parse(antes.stdout).version
    if (compararVersoes(atual, anterior) <= 0) semVersao.push(`${plugin} (${anterior} → ${atual}): ${arquivos.slice(0, 3).join(', ')}`)
  }
  assert.deepEqual(semVersao, [], `Plugins mudados sem versão MAIOR que a anterior (suba em plugin.json e rode atualizar-marketplace):\n${semVersao.join('\n')}`)
})

test('catálogo em dia com as versões e descrições dos plugin.json', () => {
  const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, '.claude-plugin', 'marketplace.json'), 'utf8'))
  const divergentes = []
  for (const p of catalogo.plugins) {
    const m = JSON.parse(fs.readFileSync(path.join(raiz, p.source, '.claude-plugin', 'plugin.json'), 'utf8'))
    if (m.version !== p.version || m.description !== p.description) divergentes.push(`${p.name}: catálogo ${p.version}, plugin ${m.version}`)
  }
  const pastas = fs.readdirSync(path.join(raiz, 'plugins')).filter((d) => fs.existsSync(path.join(raiz, 'plugins', d, '.claude-plugin', 'plugin.json')))
  const fora = pastas.filter((d) => !catalogo.plugins.some((p) => p.name === d))
  assert.deepEqual([...divergentes, ...fora.map((d) => `${d}: fora do catálogo`)], [], 'Rode: node scripts/atualizar-marketplace.mjs')
})

test('comparação de versões: maior, igual, menor e pré-lançamento', () => {
  assert.ok(compararVersoes('0.1.10', '0.1.9') > 0) // não é comparação de texto
  assert.ok(compararVersoes('1.0.0', '0.9.9') > 0)
  assert.equal(compararVersoes('0.2.0', '0.2.0'), 0)
  assert.ok(compararVersoes('0.1.8', '0.1.9') < 0) // redução é barrada
  assert.ok(compararVersoes('1.0.0-beta', '1.0.0') < 0)
  assert.ok(compararVersoes('1.0.0', '1.0.0-beta') > 0)
  // Pré-lançamento pelos identificadores (SemVer), nos dois sentidos
  assert.ok(compararVersoes('1.0.0-beta.10', '1.0.0-beta.9') > 0)
  assert.ok(compararVersoes('1.0.0-beta.9', '1.0.0-beta.10') < 0)
  assert.ok(compararVersoes('1.0.0-beta', '1.0.0-beta.1') < 0)
  assert.ok(compararVersoes('1.0.0-alpha.1', '1.0.0-alpha.beta') < 0) // número < texto
  assert.ok(compararVersoes('1.0.0-alpha', '1.0.0-beta') < 0)
  assert.equal(compararVersoes('1.0.0-rc.1', '1.0.0-rc.1'), 0)
  // Números grandes sem perder precisão
  assert.ok(compararVersoes('1.0.0-beta.9007199254740993', '1.0.0-beta.9007199254740992') > 0)
  assert.ok(compararVersoes('9007199254740993.0.0', '9007199254740992.0.0') > 0)
})
