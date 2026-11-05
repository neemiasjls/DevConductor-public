// Hook de aviso (Notification): decide certo por sistema e situação, e nunca derruba a sessão.
// Rodar: node --test scripts/testes/avisar.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { montarAviso } from '../../plugins/devconductor-core/hooks/avisar.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const hook = path.join(raiz, 'plugins', 'devconductor-core', 'hooks', 'avisar.mjs')
const permissao = { hook_event_name: 'Notification', notification_type: 'permission_prompt', message: 'Claude needs your permission to use Bash', cwd: path.join('C:', 'PROJETOS', 'Agenda') }
const pc = { PATH: '' } // ambiente de um PC: sem nuvem, sem app

test('Windows: balão pelo PowerShell com título da pasta e texto em português, sem o texto dentro do comando', () => {
  const a = montarAviso(permissao, { plataforma: 'win32', env: pc, projeto: 'C:\\PROJETOS\\Agenda' })
  assert.equal(a.cmd, 'powershell.exe')
  assert.ok(a.args.includes('-EncodedCommand'))
  assert.equal(a.env.DA_TITULO, 'Claude · Agenda')
  assert.equal(a.env.DA_TEXTO, 'O Claude precisa da sua permissão para continuar.')
  const codigo = Buffer.from(a.args.at(-1), 'base64').toString('utf16le')
  assert.match(codigo, /ToastNotificationManager/)
  assert.doesNotMatch(codigo, /Agenda|permissão/) // título e texto só por variável de ambiente
})

test('macOS e Linux: comando nativo; Linux sem tela fica quieto', () => {
  assert.equal(montarAviso(permissao, { plataforma: 'darwin', env: pc }).cmd, 'osascript')
  const linux = montarAviso({ ...permissao, notification_type: 'idle_prompt' }, { plataforma: 'linux', env: { DISPLAY: ':0' } })
  assert.equal(linux.cmd, 'notify-send')
  assert.deepEqual(linux.args.slice(-1), ['O Claude terminou e está esperando você.'])
  assert.equal(montarAviso(permissao, { plataforma: 'linux', env: {} }), null)
})

test('fica quieto: desligado, na nuvem, no app do Claude, login concluído e evento vazio', () => {
  for (const env of [{ DEVCONDUCTOR_AVISO: '0' }, { DEVAGENTS_AVISO: '0' }, { DEVAGENTS_AVISO: 'nao' }, { CLAUDE_CODE_REMOTE: 'true' }, { CLAUDE_CODE_ENTRYPOINT: 'claude-desktop' }]) {
    assert.equal(montarAviso(permissao, { plataforma: 'win32', env }), null, JSON.stringify(env))
  }
  assert.equal(montarAviso({ notification_type: 'auth_success', message: 'ok' }, { plataforma: 'win32', env: pc }), null)
  assert.equal(montarAviso({}, { plataforma: 'win32', env: pc }), null)
})

test('tipo desconhecido usa a mensagem que o Claude mandou', () => {
  const a = montarAviso({ notification_type: 'novo_tipo', message: 'Algo novo' }, { plataforma: 'win32', env: pc })
  assert.equal(a.texto, 'Algo novo')
})

test('o hook de verdade sai com 0 e rápido, mesmo com entrada quebrada', () => {
  for (const entrada of ['{quebrado', '', JSON.stringify(permissao)]) {
    const r = spawnSync(process.execPath, [hook], { input: entrada, encoding: 'utf8', timeout: 10000, env: { ...process.env, DEVAGENTS_AVISO: '0' } })
    assert.equal(r.status, 0, r.stderr)
    assert.equal(r.stdout, '')
  }
})

test('Linux com tela: chama o notify-send com título e texto', { skip: process.platform !== 'linux' && 'só no Linux (Windows e macOS usam o aviso nativo)' }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-avisar-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 30, retryDelay: 300 }))
  const saida = path.join(dir, 'chamado.txt')
  fs.writeFileSync(path.join(dir, 'notify-send'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${saida}"\n`, { mode: 0o755 })
  const env = { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}`, DISPLAY: ':0', DEVCONDUCTOR_AVISO: '', DEVAGENTS_AVISO: '', CLAUDE_CODE_REMOTE: '', CLAUDE_CODE_ENTRYPOINT: 'cli' }
  const r = spawnSync(process.execPath, [hook], { input: JSON.stringify({ ...permissao, cwd: path.join(dir, 'MeuSite') }), encoding: 'utf8', env })
  assert.equal(r.status, 0, r.stderr)
  for (let i = 0; i < 50 && !fs.existsSync(saida); i++) await new Promise((ok) => setTimeout(ok, 100))
  assert.deepEqual(fs.readFileSync(saida, 'utf8').trim().split('\n'), ['--app-name=Claude Code', 'Claude · MeuSite', 'O Claude precisa da sua permissão para continuar.'])
})
