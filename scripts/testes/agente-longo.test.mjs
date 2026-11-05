// Freio de agente longo (DEV-46): conta chamadas por agente e avisa a cada limite; conversa principal fica fora.
// Rodar: node --test scripts/testes/agente-longo.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const nucleo = path.join(raiz, 'plugins', 'devconductor-core')
const hook = path.join(nucleo, 'hooks', 'agente-longo.mjs')

function preparar(t) {
  const sessao = 'teste-' + process.pid + '-' + Math.random().toString(36).slice(2)
  t.after(() => fs.rmSync(path.join(os.tmpdir(), 'devagents-agente-longo'), { recursive: true, force: true }))
  return (agente, limite = '3') => spawnSync(process.execPath, [hook, '--limite', limite],
    { input: JSON.stringify({ session_id: sessao, agent_id: agente, tool_name: 'Bash' }), encoding: 'utf8' })
}

test('agente avisa na chamada do limite e de novo a cada limite, calado no meio', (t) => {
  const rodar = preparar(t)
  const saidas = Array.from({ length: 6 }, () => rodar('agente-a').stdout)
  assert.deepEqual(saidas.map((s) => s !== ''), [false, false, true, false, false, true])
  const aviso = JSON.parse(saidas[2]).hookSpecificOutput
  assert.equal(aviso.hookEventName, 'PostToolUse')
  assert.match(aviso.additionalContext, /3 chamadas/)
  assert.match(aviso.additionalContext, /agente novo/)
})

test('cada agente tem sua contagem', (t) => {
  const rodar = preparar(t)
  rodar('agente-a'); rodar('agente-a')
  assert.equal(rodar('agente-b').stdout, '')
  assert.notEqual(rodar('agente-a').stdout, '')
})

test('conversa principal (sem agent_id) e entrada quebrada não escrevem nada', () => {
  for (const input of ['{}', 'não é json', JSON.stringify({ session_id: 'x', tool_name: 'Bash' })]) {
    const r = spawnSync(process.execPath, [hook, '--limite', '1'], { input, encoding: 'utf8' })
    assert.equal(r.status, 0)
    assert.equal(r.stdout, '')
  }
})

test('o hook está ligado no PostToolUse sem matcher (vale para toda ferramenta)', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(nucleo, 'hooks', 'hooks.json'), 'utf8'))
  const grupo = hooks.hooks.PostToolUse.find((g) => g.hooks.some((h) => h.command.includes('agente-longo.mjs')))
  assert.ok(grupo, 'agente-longo fora do PostToolUse')
  assert.equal(grupo.matcher, undefined)
})
