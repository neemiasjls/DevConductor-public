import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { estudos } from '../../plugins/estudio-design/skills/estudio-movimento/modelo/src/estudos.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const gravador = path.join(raiz, 'plugins/landing-pages/skills/lp-referencias/scripts/gravar-rolagem.mjs')
const criador = path.join(raiz, 'plugins/estudio-design/skills/estudio-movimento/scripts/criar.mjs')
const detector = path.join(raiz, 'plugins/devconductor-core/hooks/detectar-stack.mjs')
const rodar = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })

test('catálogo tem pelo menos 25 estudos únicos com código e receita disponíveis', () => {
  assert(estudos.length >= 25)
  assert.equal(new Set(estudos.map(e => e.id)).size, estudos.length)
  assert.equal(new Set(estudos.map(e => e.receita)).size, estudos.length)
  for (const e of estudos) {
    assert.match(e.id, /^[a-z0-9-]+$/)
    assert(e.nome && e.familia && e.descricao && e.titulo)
    assert(fs.existsSync(path.join(raiz, 'plugins/landing-pages/skills/lp-cenas/receitas', e.receita + '.md')), e.receita)
  }
})

test('gravador recusa nome com travessia, tempo inválido e opção sem valor antes de gravar', () => {
  for (const args of [['--nome', '../fora'], ['--nome'], ['--segundos', 'NaN'], ['--segundos', '0'], ['--segundos', '121'], ['--desconhecido']]) {
    const r = rodar(gravador, ['http://localhost:5190/?estudo=foto', 'saida', ...args])
    assert.equal(r.status, 1)
    assert.doesNotMatch(r.stdout + r.stderr, /Instale no projeto|Failed to launch/)
  }
})

test('criador gera modelo em caminho com espaços e recusa sobrescrever o estudo', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-estudio-'))
  t.after(() => { assert.equal(path.dirname(path.resolve(temp)), fs.realpathSync(os.tmpdir())); fs.rmSync(temp, { recursive: true, force: true }) })
  const destino = path.join(temp, 'estudo com espacos')
  assert.equal(rodar(criador, [destino]).status, 0)
  fs.writeFileSync(path.join(destino, 'sentinela'), 'preservar')
  assert.equal(rodar(criador, [destino]).status, 1)
  assert.equal(fs.readFileSync(path.join(destino, 'sentinela'), 'utf8'), 'preservar')
  assert(fs.existsSync(path.join(destino, 'public/assets/OFL-Saira.txt')))
})

test('detecção oferece estúdio para landing page e marcador próprio, respeitando desativado', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-estudio-'))
  t.after(() => { assert.equal(path.dirname(path.resolve(temp)), fs.realpathSync(os.tmpdir())); fs.rmSync(temp, { recursive: true, force: true }) })
  for (const marcador of ['.landing-pages', '.estudio-design']) {
    fs.writeFileSync(path.join(temp, marcador), '')
    const r = rodar(detector, ['--projeto', temp, '--dry-run'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /estudio-design@devconductor/)
    fs.unlinkSync(path.join(temp, marcador))
  }
  fs.writeFileSync(path.join(temp, '.estudio-design'), '')
  fs.mkdirSync(path.join(temp, '.claude'))
  fs.writeFileSync(path.join(temp, '.claude/settings.local.json'), JSON.stringify({ enabledPlugins: { 'estudio-design@devconductor': false } }))
  assert.equal(rodar(detector, ['--projeto', temp, '--dry-run']).stdout, '')
})
