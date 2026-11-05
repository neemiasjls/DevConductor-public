// Integração com a CLI simulada: não instala plugins nem usa uma sessão do modelo.
// Rodar: node --test scripts/testes/instalar.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const instalador = path.join(raiz, 'scripts', 'instalar.mjs')
const marketplace = JSON.parse(fs.readFileSync(path.join(raiz, '.claude-plugin', 'marketplace.json'), 'utf8'))
const atuais = marketplace.plugins.map((p) => `${p.name}@${marketplace.name}`)
const legados = marketplace.plugins.map((p) => `${p.name === 'devconductor-core' ? 'devagents-core' : p.name}@devagents`)
const plugins = [...new Set([...atuais, ...legados, 'superpowers@claude-plugins-official'])]

const cliFalsa = String.raw`
import fs from 'node:fs'
import path from 'node:path'
const args = process.argv.slice(2)
const arquivoLocal = path.join(process.cwd(), '.claude', 'settings.local.json')
const lerLocal = () => fs.existsSync(arquivoLocal) ? JSON.parse(fs.readFileSync(arquivoLocal, 'utf8')) : {}
fs.appendFileSync(process.env.DEVAGENTS_TESTE_LOG, JSON.stringify({ args, cwd: process.cwd(), local: lerLocal() }) + '\n')
const cenario = process.env.DEVAGENTS_TESTE_CENARIO
const igual = (...esperados) => esperados.every((valor, i) => args[i] === valor)
const falhar = (mensagem) => { console.error(mensagem); process.exit(1) }
// Os casos de migração reproduzem a escrita feita pela CLI no escopo local, inclusive antes de falhar.
if (cenario.startsWith('config-') && igual('plugin', 'install')) {
  const local = lerLocal()
  fs.mkdirSync(path.dirname(arquivoLocal), { recursive: true })
  fs.writeFileSync(arquivoLocal, JSON.stringify({ ...local, enabledPlugins: { ...local.enabledPlugins, [args[2]]: true } }))
  if (cenario === 'config-stack-falha' && args[2] === 'stack-typescript@devconductor') falhar('FALHA_TESTE_STACK_COM_ESCRITA')
  if (cenario === 'config-nucleo-falha' && args[2] === 'devconductor-core@devconductor') falhar('FALHA_TESTE_NUCLEO_COM_ESCRITA')
}
// Máquina de antes da troca de nome: a CLI real reconhece a mesma origem e responde com o nome antigo; ao retirar
// o catálogo, ela também tira do settings.local.json os plugins e a declaração dele.
if (cenario.startsWith('catalogo-legado')) {
  if (igual('plugin', 'marketplace', 'remove', 'devagents', '--scope', 'local')) {
    const local = lerLocal()
    const enabledPlugins = Object.fromEntries(Object.entries(local.enabledPlugins || {}).filter(([id]) => !id.endsWith('@devagents')))
    const { devagents, ...extraKnownMarketplaces } = local.extraKnownMarketplaces || {}
    fs.mkdirSync(path.dirname(arquivoLocal), { recursive: true })
    fs.writeFileSync(arquivoLocal, JSON.stringify({ ...local, enabledPlugins, extraKnownMarketplaces }))
    console.log('Successfully removed marketplace: devagents (from local settings)')
    process.exit(0)
  }
  if (igual('plugin', 'marketplace', 'add') && args[3] !== 'anthropics/claude-plugins-official') {
    const anteriores = fs.readFileSync(process.env.DEVAGENTS_TESTE_LOG, 'utf8').trim().split('\n').map((l) => JSON.parse(l).args)
    const retirado = anteriores.some((a) => a[1] === 'marketplace' && a[2] === 'remove')
    console.log(cenario !== 'catalogo-legado-preso' && retirado
      ? 'Adding marketplace…✔ Successfully added marketplace: devconductor (declared in local settings)'
      : "Adding marketplace…✔ Marketplace 'devagents' already on disk — declared in local settings")
    process.exit(0)
  }
}
if (cenario === 'catalogo-legado-nucleo-falha' && igual('plugin', 'install', 'devconductor-core@devconductor')) falhar('FALHA_TESTE_NUCLEO')
if (cenario === 'catalogo-falha' && igual('plugin', 'marketplace', 'add')) falhar('FALHA_TESTE_CATALOGO')
if (cenario === 'catalogo-oficial-falha' && igual('plugin', 'marketplace', 'add', 'anthropics/claude-plugins-official')) {
  falhar('FALHA_TESTE_CATALOGO_OFICIAL')
}
if (cenario === 'nucleo-falha' && igual('plugin', 'install', 'devconductor-core@devconductor')) falhar('FALHA_TESTE_NUCLEO')
if (cenario === 'stack-falha' && igual('plugin', 'install', 'stack-typescript@devconductor')) falhar('FALHA_TESTE_STACK')
if (igual('plugin', 'uninstall')) {
  if (cenario === 'desligar-ausentes') falhar('Plugin ' + args[2] + ' is not installed')
  if (cenario === 'desligar-comando-ausente') falhar('claude: not found')
  if (cenario === 'desligar-falha' && ['devconductor-core@devconductor', 'stack-typescript@devconductor'].includes(args[2])) {
    falhar('FALHA_TESTE_DESLIGAR ' + args[2])
  }
}
console.log('CLI simulada: ok')
`

function preparar(t, cenario = 'sucesso') {
  const baseTemporarios = path.join(raiz, 'pilotos', 'testes-temporarios')
  fs.mkdirSync(baseTemporarios, { recursive: true })
  const temporarios = fs.realpathSync(baseTemporarios)
  const pasta = fs.mkdtempSync(path.join(temporarios, 'devagents-instalar-'))
  const projeto = path.join(pasta, 'projeto com espacos')
  const bin = path.join(pasta, 'cli simulada')
  const log = path.join(pasta, 'chamadas.jsonl')
  fs.mkdirSync(projeto)
  fs.mkdirSync(bin)
  const script = path.join(bin, 'claude-falso.mjs')
  fs.writeFileSync(script, cliFalsa)
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${script}" %*\r\n`)
  } else {
    const aspas = (s) => `'${s.replaceAll("'", "'\\''")}'`
    fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec ${aspas(process.execPath)} ${aspas(script)} "$@"\n`, { mode: 0o755 })
  }
  // Evita duas chaves Path/PATH no ambiente do Windows.
  const caminho = Object.entries(process.env).find(([nome]) => nome.toLowerCase() === 'path')?.[1] || ''
  const env = Object.fromEntries(Object.entries(process.env).filter(([nome]) => nome.toLowerCase() !== 'path'))
  Object.assign(env, {
    PATH: `${bin}${path.delimiter}${caminho}`,
    DEVAGENTS_TESTE_LOG: log,
    DEVAGENTS_TESTE_CENARIO: cenario,
  })
  t.after(() => {
    const destino = path.resolve(pasta)
    assert.equal(path.dirname(destino), temporarios)
    assert.ok(path.basename(destino).startsWith('devagents-instalar-'))
    fs.rmSync(destino, { recursive: true, force: true })
  })
  return {
    projeto,
    gravar(nome, conteudo) {
      const destino = path.join(projeto, nome)
      fs.mkdirSync(path.dirname(destino), { recursive: true })
      fs.writeFileSync(destino, typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo))
    },
    ler(nome) { return JSON.parse(fs.readFileSync(path.join(projeto, nome), 'utf8')) },
    rodar(...args) {
      const resultado = spawnSync(process.execPath, [instalador, projeto, ...args], {
        cwd: raiz, env, encoding: 'utf8', timeout: 90000,
      })
      assert.ifError(resultado.error)
      return { ...resultado, saida: `${resultado.stdout}${resultado.stderr}` }
    },
    chamadas() {
      return fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
    },
  }
}

function retrato(dir) {
  return fs.readdirSync(dir, { recursive: true }).sort().map((nome) => {
    const arquivo = path.join(dir, nome)
    return [nome, fs.statSync(arquivo).isDirectory() ? null : fs.readFileSync(arquivo).toString('base64')]
  })
}

const comando = (chamada, ...inicio) => inicio.every((valor, i) => chamada.args[i] === valor)
const semSucesso = (resultado) => assert.doesNotMatch(resultado.saida, /^(?:Pronto\.|Abra uma sess[aã]o)/m)

test('simular não executa a CLI nem altera arquivos do projeto', (t) => {
  const f = preparar(t)
  f.gravar('package.json', { dependencies: { express: '5.0.0' } })
  f.gravar('.claude/settings.local.json', { enabledPlugins: { 'stack-typescript@devconductor': false } })
  const antes = retrato(f.projeto)
  const r = f.rodar('--simular')
  assert.equal(r.status, 0, r.saida)
  assert.match(r.saida, /simula[çc][aã]o/i)
  assert.deepEqual(f.chamadas(), [])
  assert.deepEqual(retrato(f.projeto), antes)
})

test('instala método, núcleo e stacks no escopo local em caminho com espaços', (t) => {
  const f = preparar(t)
  f.gravar('package.json', { dependencies: { express: '5.0.0' } })
  const r = f.rodar()
  assert.equal(r.status, 0, r.saida)
  const chamadas = f.chamadas()
  assert.ok(chamadas.some((c) => comando(c, 'plugin', 'marketplace', 'add', raiz)))
  assert.ok(chamadas.some((c) => comando(c, 'plugin', 'marketplace', 'add', 'anthropics/claude-plugins-official')))
  for (const id of ['superpowers@claude-plugins-official', 'devconductor-core@devconductor', 'stack-typescript@devconductor', 'seguranca@devconductor']) {
    assert.ok(chamadas.some((c) => comando(c, 'plugin', 'install', id)), `Faltou ${id}`)
  }
  for (const c of chamadas) {
    assert.equal(path.resolve(c.cwd), path.resolve(f.projeto))
    assert.deepEqual(c.args.slice(-2), ['--scope', 'local'])
  }
})

// Repositório do clone (o mesmo que o instalador deve achar com --github sem valor).
const repositorioDoClone = (() => {
  const r = spawnSync('git', ['-C', raiz, 'remote', 'get-url', 'origin'], { encoding: 'utf8' })
  return r.stdout.trim().match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/)?.[1]
})()

test('--github registra o catálogo pelo repositório do clone, não pela pasta', { skip: !repositorioDoClone && 'clone sem remote do GitHub' }, (t) => {
  const f = preparar(t)
  const r = f.rodar('--github')
  assert.equal(r.status, 0, r.saida)
  const chamadas = f.chamadas()
  assert.ok(chamadas.some((c) => comando(c, 'plugin', 'marketplace', 'add', repositorioDoClone)), JSON.stringify(chamadas))
  assert.equal(chamadas.some((c) => comando(c, 'plugin', 'marketplace', 'add', raiz)), false)
  assert.ok(chamadas.some((c) => comando(c, 'plugin', 'install', 'devconductor-core@devconductor')))
})

test('--github dono/repo usa o repositório informado e mantém a pasta do projeto', (t) => {
  const f = preparar(t)
  const r = f.rodar('--github', 'dono-teste/repo.teste')
  assert.equal(r.status, 0, r.saida)
  const chamadas = f.chamadas()
  assert.ok(chamadas.some((c) => comando(c, 'plugin', 'marketplace', 'add', 'dono-teste/repo.teste')))
  for (const c of chamadas) assert.equal(path.resolve(c.cwd), path.resolve(f.projeto))
})

test('--github com valor que não é dono/repo para antes de chamar a CLI', (t) => {
  const f = preparar(t)
  const r = f.rodar('--github', 'nao-e-repositorio')
  assert.equal(r.status, 1, r.saida)
  assert.match(r.saida, /dono\/reposit[oó]rio/i)
  assert.deepEqual(f.chamadas(), [])
  semSucesso(r)
})

test('stack desativada na configuração local não é instalada novamente', (t) => {
  const f = preparar(t)
  f.gravar('package.json', { dependencies: { express: '5.0.0' } })
  f.gravar('.claude/settings.json', { enabledPlugins: { 'stack-typescript@devconductor': true } })
  f.gravar('.claude/settings.local.json', { enabledPlugins: { 'stack-typescript@devconductor': false } })
  const antes = retrato(f.projeto)
  const r = f.rodar()
  assert.equal(r.status, 0, r.saida)
  assert.equal(f.chamadas().some((c) => comando(c, 'plugin', 'install', 'stack-typescript@devconductor')), false)
  assert.ok(f.chamadas().some((c) => comando(c, 'plugin', 'install', 'seguranca@devconductor')))
  assert.deepEqual(retrato(f.projeto), antes)
})

for (const [cenario, erro, quantidade] of [
  ['catalogo-falha', 'FALHA_TESTE_CATALOGO', 1],
  ['catalogo-oficial-falha', 'FALHA_TESTE_CATALOGO_OFICIAL', 2],
  ['nucleo-falha', 'FALHA_TESTE_NUCLEO', 4],
]) {
  test(`${cenario}: interrompe sem anunciar sucesso`, (t) => {
    const f = preparar(t, cenario)
    f.gravar('package.json', {})
    const r = f.rodar()
    assert.notEqual(r.status, 0, r.saida)
    assert.match(r.saida, new RegExp(erro))
    assert.equal(f.chamadas().length, quantidade)
    if (cenario === 'catalogo-oficial-falha') {
      assert.equal(f.chamadas().some((c) => comando(c, 'plugin', 'install')), false)
    }
    semSucesso(r)
  })
}

test('falha na instalação de stack chega ao status do instalador', (t) => {
  const f = preparar(t, 'stack-falha')
  f.gravar('package.json', {})
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.match(r.saida, /stack-typescript@devconductor/)
  assert.equal(f.chamadas().some((c) => c.args[0] === 'mcp'), false)
  semSucesso(r)
})

test('desligar tenta todos os plugins e agrega as falhas', (t) => {
  const f = preparar(t, 'desligar-falha')
  const r = f.rodar('--desligar')
  assert.notEqual(r.status, 0, r.saida)
  assert.match(r.saida, /FALHA_TESTE_DESLIGAR devconductor-core@devconductor/)
  assert.match(r.saida, /FALHA_TESTE_DESLIGAR stack-typescript@devconductor/)
  assert.deepEqual(f.chamadas().map((c) => c.args), plugins.map((id) => ['plugin', 'uninstall', id, '--scope', 'local']))
  semSucesso(r)
})

test('desligar plugins já ausentes continua sendo sucesso', (t) => {
  const f = preparar(t, 'desligar-ausentes')
  const r = f.rodar('--desligar')
  assert.equal(r.status, 0, r.saida)
  assert.equal(f.chamadas().length, plugins.length)
})

test('comando não encontrado ao desligar é falha, mesmo contendo not found', (t) => {
  const f = preparar(t, 'desligar-comando-ausente')
  const r = f.rodar('--desligar')
  assert.notEqual(r.status, 0, r.saida)
  assert.match(r.saida, /claude: not found/)
  assert.equal(f.chamadas().length, plugins.length)
  semSucesso(r)
})

test('simular desligamento não executa a CLI nem altera arquivos do projeto', (t) => {
  const f = preparar(t)
  f.gravar('.claude/settings.local.json', { enabledPlugins: { 'devconductor-core@devconductor': true } })
  const antes = retrato(f.projeto)
  const r = f.rodar('--desligar', '--simular')
  assert.equal(r.status, 0, r.saida)
  assert.match(r.saida, /simula[çc][aã]o/i)
  assert.deepEqual(f.chamadas(), [])
  assert.deepEqual(retrato(f.projeto), antes)
})

test('migra núcleo e stack legados somente depois de instalar os substitutos, preservando campos alheios', (t) => {
  const f = preparar(t, 'config-sucesso')
  const compartilhada = { enabledPlugins: { 'devagents-core@devagents': true }, permissions: { allow: ['Read'] } }
  f.gravar('.claude/settings.json', compartilhada)
  f.gravar('.claude/settings.local.json', { enabledPlugins: { 'stack-python@devagents': true, 'externo@outro': false,
    'desconhecido@devagents': true }, env: { EXEMPLO: 'valor' } })
  const r = f.rodar()
  assert.equal(r.status, 0, r.saida)
  assert.deepEqual(f.ler('.claude/settings.json'), compartilhada)
  const local = f.ler('.claude/settings.local.json')
  assert.deepEqual(local.env, { EXEMPLO: 'valor' })
  for (const id of ['devconductor-core@devconductor', 'stack-python@devconductor']) assert.equal(local.enabledPlugins[id], true)
  for (const id of ['devagents-core@devagents', 'stack-python@devagents']) assert.equal(local.enabledPlugins[id], false)
  assert.equal(local.enabledPlugins['externo@outro'], false)
  assert.equal(local.enabledPlugins['desconhecido@devagents'], true)
  const chamadas = f.chamadas()
  assert.ok(chamadas.some((c) => comando(c, 'plugin', 'install', 'stack-python@devconductor')))
  assert.equal(chamadas.some((c) => comando(c, 'plugin', 'uninstall')), false)
  assert.equal(chamadas.some((c) => c.args.includes('desconhecido@devagents')), false)
  const instalacaoPython = chamadas.find((c) => comando(c, 'plugin', 'install', 'stack-python@devconductor'))
  assert.equal(instalacaoPython.local.enabledPlugins['stack-python@devagents'], true, 'legado deve continuar ligado antes da instalação nova')
})

for (const [nome, compartilhada, local, esperado] of [
  ['opt-out legado local vence enable legado do projeto', { 'stack-typescript@devagents': true }, { 'stack-typescript@devagents': false }, false],
  ['novo false local vence legado true local', {}, { 'stack-typescript@devconductor': false, 'stack-typescript@devagents': true }, false],
  ['novo true local vence legado false local', {}, { 'stack-typescript@devconductor': true, 'stack-typescript@devagents': false }, true],
  ['novo false do projeto vence legado true do projeto', { 'stack-typescript@devconductor': false, 'stack-typescript@devagents': true }, {}, false],
  ['legado false local vence novo true do projeto', { 'stack-typescript@devconductor': true }, { 'stack-typescript@devagents': false }, false],
  ['legado true local vence novo false do projeto', { 'stack-typescript@devconductor': false }, { 'stack-typescript@devagents': true }, true],
]) {
  test(`migração: ${nome}`, (t) => {
    const f = preparar(t, 'config-sucesso')
    f.gravar('package.json', {})
    f.gravar('.claude/settings.json', { enabledPlugins: compartilhada })
    f.gravar('.claude/settings.local.json', { enabledPlugins: local, permissions: { deny: ['Write(segredo.txt)'] } })
    const r = f.rodar()
    assert.equal(r.status, 0, r.saida)
    const depois = f.ler('.claude/settings.local.json')
    assert.equal(depois.enabledPlugins['stack-typescript@devconductor'], esperado)
    assert.equal(depois.enabledPlugins['stack-typescript@devagents'], false)
    assert.deepEqual(depois.permissions, { deny: ['Write(segredo.txt)'] })
    assert.deepEqual(f.ler('.claude/settings.json'), { enabledPlugins: compartilhada })
    assert.equal(f.chamadas().some((c) => comando(c, 'plugin', 'install', 'stack-typescript@devconductor')), esperado)
  })
}

test('opt-outs do núcleo legado e do método são preservados na instalação explícita', (t) => {
  const f = preparar(t, 'config-sucesso')
  f.gravar('.claude/settings.local.json', { enabledPlugins: { 'devagents-core@devagents': false, 'superpowers@claude-plugins-official': false } })
  const r = f.rodar()
  assert.equal(r.status, 0, r.saida)
  assert.equal(f.chamadas().some((c) => comando(c, 'plugin', 'install')), false)
  const ligados = f.ler('.claude/settings.local.json').enabledPlugins
  assert.equal(ligados['devconductor-core@devconductor'], false)
  assert.equal(ligados['devagents-core@devagents'], false)
  assert.equal(ligados['superpowers@claude-plugins-official'], false)
})

test('catálogo registrado com o nome antigo é retirado e registrado de novo, preservando escolhas', (t) => {
  const f = preparar(t, 'catalogo-legado')
  f.gravar('package.json', {})
  f.gravar('.claude/settings.local.json', {
    env: { EXEMPLO: 'valor' },
    enabledPlugins: { 'devagents-core@devagents': true, 'stack-typescript@devagents': false },
  })
  const r = f.rodar()
  assert.equal(r.status, 0, r.saida)
  const args = f.chamadas().map((c) => c.args.join(' '))
  const retirar = args.indexOf('plugin marketplace remove devagents --scope local')
  const adicoes = args.map((a, i) => (a.startsWith(`plugin marketplace add ${raiz}`) ? i : -1)).filter((i) => i >= 0)
  assert.ok(retirar >= 0 && adicoes.length === 2 && adicoes[0] < retirar && retirar < adicoes[1], args.join('\n'))
  assert.ok(retirar < args.indexOf('plugin install devconductor-core@devconductor --scope local'), args.join('\n'))
  assert.match(r.saida, /catálogo antigo: "devagents" retirado/)
  const local = f.ler('.claude/settings.local.json')
  assert.equal(local.env.EXEMPLO, 'valor')
  assert.equal(local.enabledPlugins['devconductor-core@devconductor'], true)
  assert.equal(local.enabledPlugins['devagents-core@devagents'], false)
  assert.equal(local.enabledPlugins['stack-typescript@devconductor'], false)
  assert.equal(f.chamadas().some((c) => comando(c, 'plugin', 'install', 'stack-typescript@devconductor')), false)
})

test('catálogo antigo que continua declarado em outro escopo para com erro e restaura a configuração', (t) => {
  const f = preparar(t, 'catalogo-legado-preso')
  f.gravar('.claude/settings.local.json', '{\n  "enabledPlugins": { "devagents-core@devagents": true }\n}\n')
  const antes = retrato(f.projeto)
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.match(r.saida, /continua declarado/)
  assert.deepEqual(retrato(f.projeto), antes)
  assert.equal(f.chamadas().some((c) => comando(c, 'plugin', 'install')), false)
  semSucesso(r)
})

test('falha depois de retirar o catálogo antigo avisa que ele não volta e que basta rodar de novo', (t) => {
  const f = preparar(t, 'catalogo-legado-nucleo-falha')
  f.gravar('.claude/settings.local.json', { enabledPlugins: { 'devagents-core@devagents': true } })
  const antes = retrato(f.projeto)
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.match(r.saida, /FALHA_TESTE_NUCLEO/)
  assert.match(r.saida, /catálogo antigo já foi retirado/)
  assert.deepEqual(retrato(f.projeto), antes)
  semSucesso(r)
})

test('simulação com IDs antigos avisa da troca do catálogo sem chamar a CLI', (t) => {
  const f = preparar(t, 'catalogo-legado')
  f.gravar('.claude/settings.local.json', { enabledPlugins: { 'devagents-core@devagents': true } })
  const r = f.rodar('--simular')
  assert.equal(r.status, 0, r.saida)
  assert.match(r.saida, /será retirado e registrado de novo como "devconductor"/)
  assert.deepEqual(f.chamadas(), [])
})

for (const cenario of ['config-nucleo-falha', 'config-stack-falha']) {
  test(`migração ${cenario}: restaura bytes e deixa erro visível, mesmo após escrita da CLI`, (t) => {
    const f = preparar(t, cenario)
    f.gravar('package.json', {})
    f.gravar('.claude/settings.local.json', '{\n  "env": { "EXEMPLO": "valor" },\n  "enabledPlugins": { "devagents-core@devagents": true }\n}\n')
    const antes = retrato(f.projeto)
    const r = f.rodar()
    assert.notEqual(r.status, 0, r.saida)
    assert.match(r.saida, /FALHA_TESTE_(?:NUCLEO|STACK)_COM_ESCRITA/)
    assert.deepEqual(retrato(f.projeto), antes)
    assert.equal(f.chamadas().some((c) => comando(c, 'plugin', 'uninstall')), false)
    semSucesso(r)
  })
}

test('falha após criar configuração local remove somente os arquivos novos da instalação', (t) => {
  const f = preparar(t, 'config-stack-falha')
  f.gravar('package.json', {})
  const antes = retrato(f.projeto)
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.deepEqual(retrato(f.projeto), antes)
  semSucesso(r)
})

test('simulação mostra migração sem gravação nem chamada CLI', (t) => {
  const f = preparar(t, 'config-sucesso')
  f.gravar('package.json', {})
  f.gravar('.claude/settings.local.json', { enabledPlugins: { 'devagents-core@devagents': true, 'stack-typescript@devagents': false } })
  const antes = retrato(f.projeto)
  const r = f.rodar('--simular')
  assert.equal(r.status, 0, r.saida)
  assert.match(r.saida, /migração: devagents-core@devagents → devconductor-core@devconductor/)
  assert.deepEqual(f.chamadas(), [])
  assert.deepEqual(retrato(f.projeto), antes)
})

test('configuração inválida interrompe antes da CLI e não é sobrescrita', (t) => {
  const f = preparar(t)
  f.gravar('.claude/settings.local.json', '{ inválido')
  const antes = retrato(f.projeto)
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.deepEqual(retrato(f.projeto), antes)
  assert.deepEqual(f.chamadas(), [])
  semSucesso(r)
})
