// Grafo do código: quando o detector liga o plugin e o que o hook faz, com uma CLI do Graphify simulada.
// Não instala plugins nem o Graphify de verdade.
// Rodar: node --test scripts/testes/grafo-codigo.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const detector = path.join(raiz, 'plugins', 'devconductor-core', 'hooks', 'detectar-stack.mjs')
const hook = path.join(raiz, 'plugins', 'grafo-codigo', 'hooks', 'atualizar-grafo.mjs')

function projetoTemp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-grafo-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 30, retryDelay: 300 }))
  return dir
}
const escrever = (arq, conteudo = '') => { fs.mkdirSync(path.dirname(arq), { recursive: true }); fs.writeFileSync(arq, conteudo) }
const rodar = (script, projeto, env = {}) => spawnSync(process.execPath, [script, '--projeto', projeto, ...(env.args || [])],
  { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: '', ...env.vars } })
const simularDeteccao = (projeto) => rodar(detector, projeto, { args: ['--dry-run'] }).stdout

test('projeto pequeno não liga o grafo', (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'package.json'), '{}')
  for (let i = 0; i < 20; i++) escrever(path.join(p, 'src', `m${i}.ts`))
  const saida = simularDeteccao(p)
  assert.match(saida, /stack-typescript@devconductor/)
  assert.doesNotMatch(saida, /grafo-codigo/)
})

test('projeto grande e aninhado liga o grafo', (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'pom.xml'), '<project/>')
  const fundo = path.join(p, 'src', 'main', 'java', 'com', 'empresa', 'sistema', 'dominio', 'pedidos')
  for (let i = 0; i < 210; i++) escrever(path.join(fundo, `Classe${i}.java`))
  assert.match(simularDeteccao(p), /grafo-codigo@devconductor/)
})

test('dependências e build não contam como código do projeto', (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'package.json'), '{}')
  for (let i = 0; i < 300; i++) escrever(path.join(p, 'node_modules', 'lib', `f${i}.js`))
  for (let i = 0; i < 300; i++) escrever(path.join(p, 'dist', `f${i}.js`))
  assert.doesNotMatch(simularDeteccao(p), /grafo-codigo/)
})

test('marcador .graphify liga o grafo em projeto pequeno', (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, '.graphify'))
  assert.match(simularDeteccao(p), /grafo-codigo@devconductor/)
})

test('grafo desligado pelo usuário não volta', (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, '.graphify'))
  escrever(path.join(p, '.claude', 'settings.local.json'), JSON.stringify({ enabledPlugins: { 'grafo-codigo@devconductor': false } }))
  assert.doesNotMatch(simularDeteccao(p), /grafo-codigo/)
})

// CLI falsa nos dois formatos: sh no Linux/macOS e .cmd no Windows (shell do Node usa cmd.exe).
function cliFalsa(t, log, dir) {
  if (dir) fs.mkdirSync(dir, { recursive: true })
  else {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-cli-'))
    t.after(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 30, retryDelay: 300 }))
  }
  const js = path.join(dir, 'graphify.mjs')
  fs.writeFileSync(js, `import fs from 'node:fs'\nfs.appendFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(' ') + '\\n')\n` +
    `if (process.env.CLI_DEMORA_MS) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.CLI_DEMORA_MS))\n` +
    `if (process.env.CLI_APAGA) fs.rmSync(process.env.CLI_APAGA, { force: true })\n`)
  fs.writeFileSync(path.join(dir, 'graphify'), `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`, { mode: 0o755 })
  fs.writeFileSync(path.join(dir, 'graphify.cmd'), `@"${process.execPath}" "${js}" %*\r\n`)
  return dir
}
// PATH sem o Graphify, mas com o node e o git (o hook pergunta ao git onde fica o exclude).
const pastaDoGit = (() => {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['git'], { encoding: 'utf8' })
  return r.status === 0 ? path.dirname(r.stdout.split(/\r?\n/)[0].trim()) : null
})()
const semGraphify = () => [path.dirname(process.execPath), ...(pastaDoGit ? [pastaDoGit] : []),
  ...(process.platform === 'win32' ? [process.env.SystemRoot + '\\System32'] : ['/usr/bin', '/bin'])].join(path.delimiter)

// Pasta pessoal falsa: pipx e uv instalam a CLI em ~/.local/bin, e o hook procura lá quando ela não está no PATH.
const casaFalsa = (t, casa = projetoTemp(t)) =>
  ({ HOME: casa, USERPROFILE: casa, PIPX_BIN_DIR: '', UV_TOOL_BIN_DIR: '', XDG_BIN_HOME: '' })

test('sem a CLI, o hook só pede para oferecer a instalação', (t) => {
  const p = projetoTemp(t)
  spawnSync('git', ['init', '-q'], { cwd: p })
  const r = rodar(hook, p, { vars: { PATH: semGraphify(), ...casaFalsa(t) } })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /uv tool install graphifyy/)
  const exclude = path.join(p, '.git', 'info', 'exclude')
  assert.doesNotMatch(fs.existsSync(exclude) ? fs.readFileSync(exclude, 'utf8') : '', /graphify-out/)
})

test('CLI instalada fora do PATH (pasta do pipx ou do uv) também vale', async (t) => {
  const p = projetoTemp(t)
  spawnSync('git', ['init', '-q'], { cwd: p })
  const casa = projetoTemp(t)
  const log = path.join(p, 'log-cli.txt')
  cliFalsa(t, log, path.join(casa, '.local', 'bin'))
  const r = rodar(hook, p, { vars: { PATH: semGraphify(), ...casaFalsa(t, casa) } })
  assert.equal(r.status, 0)
  assert.doesNotMatch(r.stdout, /não está instalada/)
  assert.match(r.stdout, /fora do PATH: chame ".*\.local\/bin\/graphify"/)
  for (let i = 0; i < 50 && !(fs.existsSync(log) && /update \./.test(fs.readFileSync(log, 'utf8'))); i++) {
    await new Promise((ok) => setTimeout(ok, 100))
  }
  assert.match(fs.readFileSync(log, 'utf8'), /^update \.$/m)
  await esperarSegundoPlano(path.join(p, 'graphify-out', '.devagents-atualizando'))
})

test('com a CLI, o hook roda o update só-código e tira o grafo do git uma vez', async (t) => {
  const p = projetoTemp(t)
  spawnSync('git', ['init', '-q'], { cwd: p })
  const log = path.join(p, 'log-cli.txt')
  const PATH = cliFalsa(t, log) + path.delimiter + semGraphify()
  for (let i = 0; i < 2; i++) {
    const r = rodar(hook, p, { vars: { PATH } })
    assert.equal(r.status, 0)
    assert.match(r.stdout, /grafo-codigo/)
  }
  const exclude = fs.readFileSync(path.join(p, '.git', 'info', 'exclude'), 'utf8')
  assert.equal(exclude.match(/^graphify-out\/$/gm).length, 1)
  // O update roda desligado do hook: espera ele aparecer no log.
  for (let i = 0; i < 50 && !(fs.existsSync(log) && /update \./.test(fs.readFileSync(log, 'utf8'))); i++) {
    await new Promise((ok) => setTimeout(ok, 100))
  }
  const chamadas = fs.readFileSync(log, 'utf8')
  assert.match(chamadas, /^update \.$/m)
  assert.doesNotMatch(chamadas, /extract|--mode|deep/)
  // O log aparece antes de o processo soltar a pasta no Windows.
  await esperarSegundoPlano(path.join(p, 'graphify-out', '.devagents-atualizando'))
})

// Monta o grafo como o processo em segundo plano faria (CLI simulada), para depois mexer no código.
function grafoPronto(t, p) {
  const PATH = cliFalsa(t, path.join(p, 'log.txt')) + path.delimiter + semGraphify()
  assert.equal(rodar(hook, p, { args: ['--executar'], vars: { PATH } }).status, 0)
  escrever(path.join(p, 'graphify-out', 'graph.json'), '{}')
  return PATH
}
const precisaAtualizar = (p, PATH) => /atualizaria/.test(rodar(hook, p, { args: ['--dry-run'], vars: { PATH } }).stdout)

test('grafo em dia não roda o update nem procura a CLI', (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'src', 'a.ts'))
  grafoPronto(t, p)
  const r = rodar(hook, p, { vars: { PATH: semGraphify(), ...casaFalsa(t) } })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /em dia/)
  assert.doesNotMatch(r.stdout, /não está instalada/)
})

test('código criado, apagado, renomeado ou editado desde o grafo dispara o update', (t) => {
  const mudancas = {
    criado: (p) => escrever(path.join(p, 'src', 'novo.ts')),
    apagado: (p) => fs.rmSync(path.join(p, 'src', 'b.ts')),
    renomeado: (p) => fs.renameSync(path.join(p, 'src', 'b.ts'), path.join(p, 'src', 'c.ts')),
    movido: (p) => { fs.mkdirSync(path.join(p, 'lib')); fs.renameSync(path.join(p, 'src', 'b.ts'), path.join(p, 'lib', 'b.ts')) },
    editado: (p) => { const f = path.join(p, 'src', 'a.ts'); const depois = new Date(Date.now() + 60000); fs.utimesSync(f, depois, depois) },
  }
  for (const [nome, mudar] of Object.entries(mudancas)) {
    const p = projetoTemp(t)
    escrever(path.join(p, 'src', 'a.ts'))
    escrever(path.join(p, 'src', 'b.ts'))
    const PATH = grafoPronto(t, p)
    assert.equal(precisaAtualizar(p, PATH), false, `${nome}: antes da mudança o grafo está em dia`)
    mudar(p)
    assert.equal(precisaAtualizar(p, PATH), true, `${nome}: deveria atualizar`)
  }
})

test('outra sessão atualizando: não roda um segundo update', (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'src', 'a.ts'))
  escrever(path.join(p, 'graphify-out', '.devagents-atualizando'), '123')
  const log = path.join(p, 'log.txt')
  const r = rodar(hook, p, { vars: { PATH: cliFalsa(t, log) + path.delimiter + semGraphify() } })
  assert.match(r.stdout, /outra sessão/)
  assert.equal(fs.existsSync(log), false)
})

// A trava sai pouco antes de o processo em segundo plano terminar; no Windows ele segura a pasta até sair.
async function esperarSegundoPlano(trava) {
  for (let i = 0; i < 50 && fs.existsSync(trava); i++) await new Promise((ok) => setTimeout(ok, 100))
  await new Promise((ok) => setTimeout(ok, 700))
}

test('duas sessões abrindo juntas: só uma roda o update', async (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'src', 'a.ts'))
  const log = path.join(p, 'log.txt')
  const env = { ...process.env, CLAUDE_PROJECT_DIR: '', PATH: cliFalsa(t, log) + path.delimiter + semGraphify(), CLI_DEMORA_MS: '1500' }
  const abrir = () => new Promise((ok) => {
    const filho = spawn(process.execPath, [hook, '--projeto', p], { env })
    let saida = ''
    filho.stdout.on('data', (d) => { saida += d })
    filho.on('close', () => ok(saida))
  })
  const saidas = await Promise.all([abrir(), abrir(), abrir()])
  assert.equal(saidas.filter((s) => /outra sessão/.test(s)).length, 2)
  await esperarSegundoPlano(path.join(p, 'graphify-out', '.devagents-atualizando'))
  assert.equal(fs.readFileSync(log, 'utf8').match(/^update \.$/gm).length, 1)
})

test('trava velha com várias sessões abrindo juntas: só uma quebra a trava e roda o update', async (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'src', 'a.ts'))
  const trava = path.join(p, 'graphify-out', '.devagents-atualizando')
  escrever(trava, 'morreu')
  const velho = new Date(Date.now() - 60 * 60 * 1000)
  fs.utimesSync(trava, velho, velho)
  const log = path.join(p, 'log.txt')
  const env = { ...process.env, CLAUDE_PROJECT_DIR: '', PATH: cliFalsa(t, log) + path.delimiter + semGraphify(), CLI_DEMORA_MS: '1500' }
  const abrir = () => new Promise((ok) => {
    const filho = spawn(process.execPath, [hook, '--projeto', p], { env })
    filho.on('close', ok)
  })
  await Promise.all([abrir(), abrir(), abrir(), abrir()])
  await esperarSegundoPlano(trava)
  assert.equal(fs.readFileSync(log, 'utf8').match(/^update \.$/gm).length, 1)
  assert.equal(fs.existsSync(`${trava}.quebra`), false)
})

test('trava de quebra recente (outra sessão quebrando agora) não é apagada', async (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'src', 'a.ts'))
  const trava = path.join(p, 'graphify-out', '.devagents-atualizando')
  escrever(trava, 'morreu')
  const velho = new Date(Date.now() - 60 * 60 * 1000)
  fs.utimesSync(trava, velho, velho)
  escrever(`${trava}.quebra`, 'outra sessão')
  const log = path.join(p, 'log.txt')
  const r = rodar(hook, p, { vars: { PATH: cliFalsa(t, log) + path.delimiter + semGraphify() } })
  assert.match(r.stdout, /outra sessão/)
  assert.equal(fs.existsSync(`${trava}.quebra`), true)
  await new Promise((ok) => setTimeout(ok, 500)) // se tivesse disparado o update, daria tempo de aparecer
  assert.doesNotMatch(fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '', /^update/m)
})

test('o processo em segundo plano grava o inventário de antes do update e solta a trava', (t) => {
  const p = projetoTemp(t)
  escrever(path.join(p, 'src', 'a.ts'))
  escrever(path.join(p, 'src', 'b.py'))
  escrever(path.join(p, 'graphify-out', '.devagents-atualizando'), '')
  // A CLI simulada apaga um arquivo durante o update: o estado tem que ficar com o inventário de antes.
  const PATH = cliFalsa(t, path.join(p, 'log.txt')) + path.delimiter + semGraphify()
  const r = rodar(hook, p, { args: ['--executar'], vars: { PATH, CLI_APAGA: path.join(p, 'src', 'b.py') } })
  assert.equal(r.status, 0)
  const estado = JSON.parse(fs.readFileSync(path.join(p, 'graphify-out', '.devagents-estado.json'), 'utf8'))
  assert.equal(estado.arquivos, 2)
  assert.equal(fs.existsSync(path.join(p, 'graphify-out', '.devagents-atualizando')), false)
  escrever(path.join(p, 'graphify-out', 'graph.json'), '{}')
  assert.equal(precisaAtualizar(p, PATH), true)
})

const lembrete = path.join(raiz, 'plugins', 'grafo-codigo', 'hooks', 'lembrar-grafo.mjs')
const lembrar = (projeto, entrada, vars) => spawnSync(process.execPath, [lembrete],
  { input: JSON.stringify(entrada), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: projeto, ...vars } })

test('lembrete do grafo: uma vez por sessão e por subagente, só se o grafo existir', (t) => {
  const p = projetoTemp(t)
  const vars = { PATH: semGraphify(), ...casaFalsa(t) }
  const sessao = `teste-${process.pid}-${Date.now()}`
  assert.equal(lembrar(p, { session_id: sessao }, vars).stdout, '')
  escrever(path.join(p, 'graphify-out', 'graph.json'), '{}')
  const primeira = JSON.parse(lembrar(p, { session_id: sessao }, vars).stdout)
  assert.equal(primeira.hookSpecificOutput.hookEventName, 'PreToolUse')
  assert.match(primeira.hookSpecificOutput.additionalContext, /`graphify query/)
  assert.equal(lembrar(p, { session_id: sessao }, vars).stdout, '')
  assert.match(lembrar(p, { session_id: sessao, agent_id: 'sub1' }, vars).stdout, /graphify query/)
  // CLI só na pasta do pipx/uv: o lembrete passa o caminho completo.
  const casa = projetoTemp(t)
  cliFalsa(t, path.join(p, 'log.txt'), path.join(casa, '.local', 'bin'))
  const fora = JSON.parse(lembrar(p, { session_id: `${sessao}-fora` }, { PATH: semGraphify(), ...casaFalsa(t, casa) }).stdout)
  assert.match(fora.hookSpecificOutput.additionalContext, /`".*\.local\/bin\/graphify" query/)
  assert.match(fora.hookSpecificOutput.additionalContext, /fora do PATH/)
  t.after(() => fs.rmSync(path.join(os.tmpdir(), 'devagents-grafo-lembrado'), { recursive: true, force: true }))
})

test('em worktree, o grafo vai para o exclude do repositório e não aparece no git status', async (t) => {
  const p = projetoTemp(t)
  const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' })
  git(p, 'init', '-q')
  escrever(path.join(p, 'a.ts'))
  git(p, 'add', '.')
  git(p, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init')
  const wt = path.join(p, 'wt')
  assert.equal(git(p, 'worktree', 'add', '-q', wt).status, 0)
  assert.equal(fs.statSync(path.join(wt, '.git')).isFile(), true)
  const r = rodar(hook, wt, { vars: { PATH: cliFalsa(t, path.join(p, 'log.txt')) + path.delimiter + semGraphify() } })
  assert.equal(r.status, 0)
  // A atualização roda em segundo plano dentro do worktree; no Windows a pasta não pode ser apagada até ela acabar.
  const trava = path.join(wt, 'graphify-out', '.devagents-atualizando')
  for (let i = 0; i < 50 && fs.existsSync(trava); i++) await new Promise((ok) => setTimeout(ok, 100))
  escrever(path.join(wt, 'graphify-out', 'graph.json'), '{}')
  assert.match(fs.readFileSync(path.join(p, '.git', 'info', 'exclude'), 'utf8'), /^graphify-out\/$/m)
  assert.doesNotMatch(git(wt, 'status', '--porcelain').stdout, /graphify-out/)
})
