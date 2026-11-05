// Histórico sintético e Codex falso: o vigia chama uma vez por limite e fica quieto se o Claude seguiu trabalhando.
// Rodar: node --test scripts/testes/vigia-limite.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const vigia = path.join(raiz, 'scripts', 'vigia-limite.mjs')
const limite = (ts) => ({ type: 'assistant', timestamp: ts, isApiErrorMessage: true, error: 'rate_limit', message: { content: [{ type: 'text', text: "You've hit your session limit · resets 1:30am" }] } })
const normal = (ts) => ({ type: 'assistant', timestamp: ts, message: { content: [{ type: 'text', text: 'ok' }] } })

function preparar(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-vigia-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }))
  const config = path.join(dir, 'config')
  const projeto = path.join(dir, 'projeto')
  fs.mkdirSync(projeto)
  const historicos = path.join(config, 'projects', projeto.replace(/[^A-Za-z0-9]/g, '-'))
  fs.mkdirSync(historicos, { recursive: true })
  const marcador = path.join(dir, 'codex-chamado.txt')
  return {
    marcador,
    escrever: (...linhas) => fs.writeFileSync(path.join(historicos, 's1.jsonl'), linhas.map((l) => JSON.stringify(l)).join('\n') + '\n'),
    rodar: () => spawnSync(process.execPath, [vigia, '--projeto', projeto, '--uma-vez', '--comando', `node -e "require('fs').appendFileSync(process.argv[1], 'x')" "${marcador}"`],
      { env: { ...process.env, CLAUDE_CONFIG_DIR: config }, encoding: 'utf8' }),
    vezes: () => (fs.existsSync(marcador) ? fs.readFileSync(marcador, 'utf8').length : 0),
  }
}

test('limite como último evento chama o Codex uma vez só', (t) => {
  const f = preparar(t)
  f.escrever(normal('2026-10-20T10:00:00Z'), limite('2026-10-20T10:05:00Z'))
  assert.equal(f.rodar().status, 0)
  assert.equal(f.vezes(), 1)
  f.rodar()
  assert.equal(f.vezes(), 1, 'chamou o Codex de novo para o mesmo limite')
})

test('Claude seguiu trabalhando depois do limite: não chama', (t) => {
  const f = preparar(t)
  f.escrever(limite('2026-10-20T10:05:00Z'), normal('2026-10-20T13:00:00Z'))
  f.rodar()
  assert.equal(f.vezes(), 0)
})

test('chamada padrão do Codex mantém inteiro o caminho com espaços', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-vigia-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }))
  const config = path.join(dir, 'config')
  const projeto = path.join(dir, 'projeto com espacos')
  fs.mkdirSync(projeto)
  const historicos = path.join(config, 'projects', projeto.replace(/[^A-Za-z0-9]/g, '-'))
  fs.mkdirSync(historicos, { recursive: true })
  fs.writeFileSync(path.join(historicos, 's1.jsonl'), JSON.stringify(limite('2026-10-20T10:05:00Z')) + '\n')
  // Codex falso: grava os argumentos que recebeu.
  const bin = path.join(dir, 'bin')
  fs.mkdirSync(bin)
  const saida = path.join(dir, 'args.json')
  const gravador = path.join(bin, 'gravar.cjs')
  fs.writeFileSync(gravador, `require('fs').writeFileSync(${JSON.stringify(saida)}, JSON.stringify(process.argv.slice(2)))`)
  if (process.platform === 'win32') fs.writeFileSync(path.join(bin, 'codex.cmd'), `@"${process.execPath}" "${gravador}" %*\r\n`)
  else fs.writeFileSync(path.join(bin, 'codex'), `#!/bin/sh\nexec "${process.execPath}" "${gravador}" "$@"\n`, { mode: 0o755 })
  const chavePath = Object.keys(process.env).find((k) => k.toLowerCase() === 'path') || 'PATH'
  const r = spawnSync(process.execPath, [vigia, '--projeto', projeto, '--uma-vez'],
    { env: { ...process.env, CLAUDE_CONFIG_DIR: config, [chavePath]: bin + path.delimiter + process.env[chavePath] }, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  const recebidos = JSON.parse(fs.readFileSync(saida, 'utf8'))
  assert.equal(recebidos[recebidos.indexOf('-C') + 1], projeto)
  assert.equal(recebidos.at(-1), 'continue')
})

test('limite novo depois de um já tratado chama de novo', (t) => {
  const f = preparar(t)
  f.escrever(limite('2026-10-20T10:05:00Z'))
  f.rodar()
  f.escrever(limite('2026-10-20T10:05:00Z'), normal('2026-10-20T13:00:00Z'), limite('2026-10-20T18:00:00Z'))
  f.rodar()
  assert.equal(f.vezes(), 2)
})
