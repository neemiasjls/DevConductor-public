// Diagnóstico da máquina: aponta o obrigatório que falta (código 1) e o opcional sem barrar (código 0).
// Rodar: node --test scripts/testes/diagnostico.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { usarShell } from '../lib/processo.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'scripts', 'diagnostico.mjs')
// PATH vazio de verdade (o claude do npm costuma ficar na mesma pasta do node).
const vazio = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-path-vazio-'))
test.after(() => fs.rmSync(vazio, { recursive: true, force: true }))
const rodar = (env, ...a) => spawnSync(process.execPath, [script, ...a], { encoding: 'utf8', env: { ...process.env, ...env } })

test('sem Claude e sem Git no PATH: acusa o obrigatório que falta, com o comando para instalar', () => {
  const r = rodar({ PATH: vazio, Path: vazio }, '--json')
  assert.equal(r.status, 1)
  const { ok, itens } = JSON.parse(r.stdout)
  assert.equal(ok, false)
  const claude = itens.find((i) => i.nome.startsWith('Claude'))
  assert.equal(claude.achado, null)
  assert.match(claude.instalar, /npm install -g @anthropic-ai\/claude-code/)
  assert.equal(itens.find((i) => i.nome.startsWith('Node')).achado.startsWith('v'), true)
})

test('texto legível: marca FALTA no obrigatório e diz para que serve cada item', () => {
  const r = rodar({ PATH: vazio, Path: vazio })
  assert.equal(r.status, 1)
  assert.match(r.stdout, /FALTA\s+Claude Code/)
  assert.match(r.stdout, /usado para: instalar e validar os plugins \(obrigatório\)/)
})

test('com o PATH normal, opcional ausente não barra', () => {
  const r = rodar({}, '--json')
  const { itens } = JSON.parse(r.stdout)
  const faltaObrigatorio = itens.some((i) => i.obrigatorio && !i.achado)
  assert.equal(r.status, faltaObrigatorio ? 1 : 0)
})

// O código passado ao python -c tem espaços; tem de chegar inteiro (no Windows o shell o partia).
test('python com pyyaml é reconhecido pelo código inteiro do -c', { skip: process.platform === 'win32' && 'python falso precisa de .exe no Windows' }, (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-python-falso-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  // Só responde se receber exatamente o código esperado num único argumento.
  fs.writeFileSync(path.join(dir, 'python3'), '#!/bin/sh\n[ "$1" = "-c" ] && [ "$2" = \'import yaml;print("python + pyyaml")\' ] && echo "python + pyyaml" && exit 0\nexit 1\n', { mode: 0o755 })
  const { itens } = JSON.parse(rodar({ PATH: dir }, '--json').stdout)
  assert.equal(itens.find((i) => i.nome.startsWith('uv')).achado, 'python + pyyaml')
})

// A regra que decide o shell roda em qualquer sistema simulando o Windows: com o código antigo (shell sempre no
// Windows) o 1º caso falharia.
test('no Windows, argumento com espaço (código do python -c) não passa pelo shell; o resto passa', () => {
  assert.equal(usarShell(['-c', 'import yaml;print("python + pyyaml")'], true), false)
  assert.equal(usarShell(['--version'], true), true) // acha claude.cmd e codex.cmd
  assert.equal(usarShell(['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], true), true)
  assert.equal(usarShell(['--version'], false), false) // fora do Windows, nunca
})
