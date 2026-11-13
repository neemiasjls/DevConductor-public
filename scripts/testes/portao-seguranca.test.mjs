// Portão de segurança: o detector diz se a mudança toca área sensível (nível 0, 1 ou 2) olhando só as linhas
// adicionadas do diff. Rodar: node --test scripts/testes/portao-seguranca.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { analisar, classificar, conferirPrazo, definirPrazo, globParaRegex, lerDiff, lerPush } from '../../plugins/devconductor-core/hooks/mudanca-sensivel.mjs'
import { lerShell, palavraSolta, reconhecer } from '../../plugins/devconductor-core/hooks/portao-seguranca.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const detector = path.join(raiz, 'plugins', 'devconductor-core', 'hooks', 'mudanca-sensivel.mjs')

// Monta um diff do Git com um arquivo novo e as linhas dadas (CRLF opcional, como no Windows).
function diff(caminho, linhas, { crlf = false } = {}) {
  const fim = crlf ? '\r\n' : '\n'
  return [
    `diff --git a/${caminho} b/${caminho}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${caminho}`,
    `@@ -0,0 +1,${linhas.length} @@`,
    ...linhas.map((l) => `+${l}`),
  ].join(fim) + fim
}
const nivel = (texto, opcoes) => classificar(lerDiff(texto), opcoes)
const repetir = (n, f) => Array.from({ length: n }, (_, i) => f(i))

test('README → 0', () => {
  assert.equal(nivel(diff('README.md', ['Login com senha e token, pagamento por pix.'])).nivel, 0)
})

test('CSS → 0', () => {
  assert.equal(nivel(diff('src/estilo.css', ['.cartao { color: red; padding: 8px; }'])).nivel, 0)
})

test('arquivo de teste com "senha" → 0', () => {
  assert.equal(nivel(diff('src/login.test.ts', ['expect(senha).toBe("x")'])).nivel, 0)
  assert.equal(nivel(diff('Api.Tests/LoginTeste.cs', ['var senha = "x";'])).nivel, 0)
})

test('.csproj → 1 (dependências)', () => {
  const r = nivel(diff('src/Api/Api.csproj', ['<PackageReference Include="Dapper" Version="2.1.35" />']))
  assert.equal(r.nivel, 1)
  assert.deepEqual(r.categorias, ['dependencias'])
})

test('appsettings.json → 1 (segredos)', () => {
  const r = nivel(diff('src/Api/appsettings.json', ['{ "Logging": { "LogLevel": { "Default": "Information" } } }']))
  assert.equal(r.nivel, 1)
  assert.deepEqual(r.categorias, ['segredos'])
})

test('10 linhas com cpf num serviço → 1', () => {
  const r = nivel(diff('src/Servicos/ClienteServico.cs', repetir(10, (i) => `var cpf${i} = cliente.Cpf;`)))
  assert.equal(r.nivel, 1)
  assert.deepEqual(r.categorias, ['dados-pessoais'])
  assert.equal(r.linhas, 10)
})

test('50 linhas com cpf num serviço → 2 (mudança grande)', () => {
  const r = nivel(diff('src/Servicos/ClienteServico.cs', repetir(50, (i) => `var cpf${i} = cliente.Cpf;`)))
  assert.equal(r.nivel, 2)
  assert.equal(r.linhas, 50)
})

test('[AllowAnonymous] → 2 (permissão)', () => {
  const r = nivel(diff('src/Api/Controllers/PedidosController.cs', ['    [AllowAnonymous]']))
  assert.equal(r.nivel, 2)
  assert.ok(r.categorias.includes('permissao'))
})

test('create policy em migração → 2 (acesso ao banco)', () => {
  const r = nivel(diff('db/migrations/003_rls.sql', ['create policy dono_le on pedidos for select using (true);']))
  assert.equal(r.nivel, 2)
  assert.ok(r.categorias.includes('banco-acesso'))
})

test('IFormFile → 2 (upload)', () => {
  const r = nivel(diff('src/Api/Controllers/ArquivosController.cs', ['public IActionResult Enviar(IFormFile arquivo)']))
  assert.equal(r.nivel, 2)
  assert.ok(r.categorias.includes('upload'))
})

test('pix → 2 (pagamento), mesmo com CRLF', () => {
  const r = nivel(diff('src/Servicos/Cobranca.cs', ['var chave = GerarPix(valor);'], { crlf: true }))
  assert.equal(r.nivel, 2)
  assert.deepEqual(r.categorias, ['pagamento'])
  assert.equal(nivel(diff('src/Imagem.cs', ['var largura = pixels * 2;'])).nivel, 0)
})

test('caminho em "ignorar" do projeto → 0 (glob e pasta)', () => {
  const texto = diff('legado/Login.cs', ['var senha = Request.Form["senha"];'])
  assert.equal(nivel(texto).nivel, 2)
  assert.equal(nivel(texto, { ignorar: ['legado/**'] }).nivel, 0)
  assert.equal(nivel(texto, { ignorar: ['legado'] }).nivel, 0)
})

test('diff de 2.000 linhas classificado em menos de 300 ms', () => {
  const partes = repetir(20, (a) => diff(`src/Modulo${a}/Servico.cs`, repetir(100, (i) => `var total${i} = itens.Sum(x => x.Valor * ${i});`)))
  const texto = partes.join('')
  const inicio = performance.now()
  const r = nivel(texto)
  const ms = performance.now() - inicio
  assert.equal(r.nivel, 0)
  assert.ok(ms < 300, `levou ${ms.toFixed(0)} ms`)
})

test('limites conhecidos: falso positivo e falso negativo', () => {
  // Era falso positivo aceito ("token" de design em estilo contava como login); agora estilo não conta por palavra.
  assert.equal(nivel(diff('src/tema.css', [':root { --token-cor: #222; }'])).nivel, 0)
  // Falso negativo: senha montada sem nenhuma palavra da lista passa em branco.
  assert.equal(nivel(diff('src/Util.cs', ['var p = Request.Form["pw"];'])).nivel, 0)
  // "rg" isolado é dado pessoal, mas não dentro de "target" ou "large".
  assert.equal(nivel(diff('src/a.ts', ['const target = large;'])).nivel, 0)
  assert.equal(nivel(diff('src/a.ts', ['cliente.rg = valor;'])).nivel, 1)
})

test('caminho com espaço e arquivo apagado não quebram a leitura do diff', () => {
  const texto = [
    'diff --git a/src/Minha Pasta/Pix.cs b/src/Minha Pasta/Pix.cs',
    '--- a/src/Minha Pasta/Pix.cs\t',
    '+++ b/src/Minha Pasta/Pix.cs\t',
    '@@ -1 +1 @@',
    '-antigo',
    '+var pix = 1;',
    'diff --git a/velho.cs b/velho.cs',
    'deleted file mode 100644',
    '--- a/velho.cs',
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '-var senha = 1;',
    '',
  ].join('\n')
  const lido = lerDiff(texto)
  assert.deepEqual(lido.adicionadas, { 'src/Minha Pasta/Pix.cs': ['var pix = 1;'], 'velho.cs': [] })
  assert.equal(classificar(lido).nivel, 2)
  assert.deepEqual(classificar(lido).arquivos, ['src/Minha Pasta/Pix.cs'])
})

test('linha de comando devolve JSON válido num repositório sem nada preparado e lê o preparado', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'portao-'))
  try {
    const git = (...a) => spawnSync('git', a, { cwd: pasta, encoding: 'utf8' })
    assert.equal(git('init', '-q').status, 0)
    let r = spawnSync(process.execPath, [detector], { cwd: pasta, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.deepEqual(JSON.parse(r.stdout), { nivel: 0, categorias: [], arquivos: [], linhas: 0 })

    fs.mkdirSync(path.join(pasta, 'src'))
    fs.writeFileSync(path.join(pasta, 'src', 'Cobranca.cs'), 'var chave = GerarPix(valor);\r\n')
    fs.mkdirSync(path.join(pasta, '.devconductor'))
    fs.writeFileSync(path.join(pasta, '.devconductor', 'portao.json'), '{ "ignorar": ["docs/**"] }')
    fs.mkdirSync(path.join(pasta, 'docs'))
    fs.writeFileSync(path.join(pasta, 'docs', 'Login.cs'), 'var senha = 1;\n')
    assert.equal(git('add', '.').status, 0)
    r = spawnSync(process.execPath, [detector, '--raiz', pasta], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    const saida = JSON.parse(r.stdout)
    assert.equal(saida.nivel, 2)
    assert.deepEqual(saida.categorias, ['pagamento'])
    assert.deepEqual(saida.arquivos, ['src/Cobranca.cs'])
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true })
  }
})

test('fora de um repositório a linha de comando ainda devolve JSON, com o erro', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'portao-semgit-'))
  try {
    const r = spawnSync(process.execPath, [detector], { cwd: pasta, encoding: 'utf8', env: { ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(pasta) } })
    const saida = JSON.parse(r.stdout)
    assert.equal(saida.nivel, 0)
    assert.ok(saida.erro)
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true })
  }
})

// ---- Parte 2: o portão no commit e no envio (hook PreToolUse) ----
const portao = path.join(raiz, 'plugins', 'devconductor-core', 'hooks', 'portao-seguranca.mjs')
const envGit = (pasta) => ({
  ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(pasta),
  GIT_AUTHOR_NAME: 'Teste', GIT_AUTHOR_EMAIL: 'teste@exemplo.invalid',
  GIT_COMMITTER_NAME: 'Teste', GIT_COMMITTER_EMAIL: 'teste@exemplo.invalid',
})

// Repositório temporário com espaço no nome (como pastas do Windows) e um commit inicial neutro.
function repo(t) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'portao hook '))
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }))
  const git = (...a) => {
    const r = spawnSync('git', a, { cwd: pasta, encoding: 'utf8', env: envGit(pasta) })
    assert.equal(r.status, 0, r.stderr)
    return r
  }
  git('init', '-q')
  git('config', 'core.autocrlf', 'false')
  fs.writeFileSync(path.join(pasta, 'README.md'), '# teste\r\n')
  git('add', '.')
  git('commit', '-q', '-m', 'inicio')
  const escrever = (rel, texto) => {
    fs.mkdirSync(path.dirname(path.join(pasta, rel)), { recursive: true })
    fs.writeFileSync(path.join(pasta, rel), texto)
  }
  return { pasta, git, escrever }
}

// Roda o hook como o Claude Code: JSON do evento pela entrada. Devolve { status, saida (objeto ou null) }.
function hook(pasta, command, cwd = pasta, tool = 'Bash') {
  const evento = { hook_event_name: 'PreToolUse', tool_name: tool, cwd, tool_input: { command } }
  const r = spawnSync(process.execPath, [portao], { input: JSON.stringify(evento), encoding: 'utf8', env: envGit(pasta) })
  return { status: r.status, saida: r.stdout.trim() ? JSON.parse(r.stdout) : null }
}
const negado = (s) => s?.hookSpecificOutput?.permissionDecision === 'deny'
const motivoDe = (r) => r.saida.hookSpecificOutput.permissionDecisionReason
const registrar = (pasta, ...extra) => spawnSync(process.execPath,
  [detector, '--registrar-revisao', '--raiz', pasta, ...extra], { encoding: 'utf8', env: envGit(pasta) })
const QUEM = ['--quem', 'security-auditor']
// Comandos montados aos pedaços para não parecerem commits de verdade a outros hooks da máquina.
const GC = ['git', 'commit'].join(' ')
const GP = ['git', 'push'].join(' ')

test('portão: comando que não é commit nem push sai em silêncio', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\r\n')
  git('add', '.')
  for (const c of ['git status', 'npm test', 'git log --oneline | grep commit', 'echo push']) {
    const r = hook(pasta, c)
    assert.equal(r.status, 0)
    assert.equal(r.saida, null, c)
  }
})

test('portão: commit sem área sensível passa em silêncio', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('docs/guia.md', 'senha e token no texto\n')
  escrever('src/estilo.css', 'body { color: red }\n')
  git('add', '.')
  assert.equal(hook(pasta, `${GC} -m "docs"`).saida, null)
})

test('portão: commit sensível sem revisão é negado com motivo curto e o que fazer (CRLF, pasta com espaço)', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Minha Pasta/Login.cs', 'var senha = Ler();\r\n[AllowAnonymous]\r\n')
  git('add', '.')
  const r = hook(pasta, `git add . && ${GC} -m "entra login"`)
  assert.equal(r.status, 0)
  assert.ok(negado(r.saida), JSON.stringify(r.saida))
  const motivo = motivoDe(r)
  assert.ok(motivo.split('\n').length <= 6)
  assert.match(motivo, /nível 2: login, permissao/)
  assert.match(motivo, /src\/Minha Pasta\/Login\.cs/)
  assert.match(motivo, /security-auditor/)
  assert.match(motivo, /o registro é feito no fim da revisão/)
  assert.doesNotMatch(motivo, /--registrar-revisao|mudanca-sensivel/) // não entrega o comando que grava o registro
})

test('portão: nível 1 sem revisão também é negado, pedindo varredura e lista do portão', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('app/App.csproj', '<Project Sdk="Microsoft.NET.Sdk"></Project>\n')
  git('add', '.')
  const r = hook(pasta, `${GC} -m x`)
  assert.ok(negado(r.saida))
  assert.match(motivoDe(r), /nível 1: dependencias[\s\S]*lista do portão/)
})

test('portão: com revisão do mesmo diff o commit passa; diff mudado depois volta a ser negado', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Pix.cs', 'var chave = GerarPix(valor);\r\n')
  git('add', '.')
  const reg = registrar(pasta, '--achados', '0', ...QUEM)
  assert.equal(reg.status, 0, reg.stderr)
  const marcador = JSON.parse(fs.readFileSync(path.join(pasta, '.git', 'devconductor', 'revisao-seguranca.json'), 'utf8'))
  assert.equal(marcador.achadosAbertos, 0)
  assert.equal(marcador.quem, 'security-auditor')
  assert.match(marcador.hash, /^[0-9a-f]{64}$/)
  assert.equal(hook(pasta, `${GC} -m "pix"`).saida, null)
  assert.equal(git('status', '--porcelain').stdout.trim(), 'A  src/Pix.cs') // o marcador não vira mudança
  escrever('src/Pix.cs', 'var chave = GerarPix(valor);\r\nvar boleto = 1;\r\n')
  git('add', '.')
  const r = hook(pasta, `${GC} -m "pix"`)
  assert.ok(negado(r.saida))
  assert.match(motivoDe(r), /outro diff/)
})

test('portão: revisão com achado aberto não libera', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Upload.cs', 'public void Enviar(IFormFile arquivo) {}\n')
  git('add', '.')
  assert.equal(registrar(pasta, '--achados', '2', ...QUEM).status, 0)
  const r = hook(pasta, `${GC} -m up`)
  assert.ok(negado(r.saida))
  assert.match(motivoDe(r), /2 achado\(s\) aberto\(s\)/)
})

test('portão: registrar exige --achados, --quem e algo preparado', (t) => {
  const { pasta, git, escrever } = repo(t)
  assert.equal(registrar(pasta, '--achados', '0', ...QUEM).status, 2) // nada preparado
  escrever('src/Pix.cs', 'var pix = 1;\n')
  git('add', '.')
  assert.equal(registrar(pasta, ...QUEM).status, 2)
  assert.equal(registrar(pasta, '--achados', 'nenhum', ...QUEM).status, 2)
  assert.equal(registrar(pasta, '--achados', '0').status, 2)
  assert.ok(!fs.existsSync(path.join(pasta, '.git', 'devconductor', 'revisao-seguranca.json')))
})

test('portão: commit -a confere também o que não foi preparado', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Servico.cs', 'var x = 1;\n')
  git('add', '.')
  git('commit', '-q', '-m', 'servico')
  escrever('src/Servico.cs', 'var x = 1;\nvar senha = Ler();\n')
  assert.equal(hook(pasta, `${GC} -m "so preparado"`).saida, null)
  assert.ok(negado(hook(pasta, `${GC} -am "tudo"`).saida))
  assert.ok(negado(hook(pasta, `${GC} --all -m tudo`).saida))
})

test('portão: modo avisar libera mostrando o texto; desligado fica em silêncio', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  escrever('.devconductor/portao.json', '{ "modo": "avisar" }')
  const r = hook(pasta, `${GC} -m login`)
  assert.equal(r.status, 0)
  assert.ok(!negado(r.saida))
  assert.match(r.saida.systemMessage, /Portão de segurança: este commit toca área sensível/)
  assert.match(r.saida.hookSpecificOutput.additionalContext, /Portão de segurança: este commit toca área sensível/)
  escrever('.devconductor/portao.json', '{ "modo": "desligado" }')
  assert.equal(hook(pasta, `${GC} -m login`).saida, null)
})

test('portão: push sem upstream confere o que não está em remoto nenhum; com upstream confere @{u}..HEAD', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Pix.cs', 'var pix = 1;\n')
  git('add', '.')
  git('commit', '-q', '-m', 'pix')
  let r = hook(pasta, GP)
  assert.ok(negado(r.saida), JSON.stringify(r.saida))

  const remoto = fs.mkdtempSync(path.join(os.tmpdir(), 'portao remoto '))
  t.after(() => fs.rmSync(remoto, { recursive: true, force: true }))
  assert.equal(spawnSync('git', ['init', '-q', '--bare', remoto], { encoding: 'utf8' }).status, 0)
  git('remote', 'add', 'origin', remoto)
  git('push', '-q', '-u', 'origin', 'HEAD')
  assert.equal(hook(pasta, GP).saida, null) // nada novo a enviar
  escrever('src/Boleto.cs', 'var boleto = Gerar();\n')
  git('add', '.')
  git('commit', '-q', '-m', 'boleto')
  r = hook(pasta, `${GP} origin HEAD`)
  assert.ok(negado(r.saida))
  assert.match(motivoDe(r), /git push[\s\S]*--modo envio -- origin HEAD/)
  assert.equal(registrar(pasta, '--achados', '0', '--modo', 'envio', ...QUEM, '--', 'origin', 'HEAD').status, 0)
  assert.equal(hook(pasta, `${GP} origin HEAD`).saida, null)
})

test('portão: git -C com pasta entre aspas confere aquela pasta', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  assert.ok(negado(hook(pasta, `git -C "${pasta}" commit -m x`, os.tmpdir()).saida))
})

test('portão: repositório quebrado, pasta sem Git ou entrada inválida liberam sem travar', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  fs.writeFileSync(path.join(pasta, '.git', 'HEAD'), 'lixo\n')
  let r = hook(pasta, `${GC} -m x`)
  assert.equal(r.status, 0)
  assert.ok(!negado(r.saida))
  assert.match(r.saida.systemMessage, /não conferiu.*liberado/)
  assert.match(r.saida.hookSpecificOutput.additionalContext, /não conferiu/)

  const vazia = fs.mkdtempSync(path.join(os.tmpdir(), 'portao sem git '))
  t.after(() => fs.rmSync(vazia, { recursive: true, force: true }))
  r = hook(vazia, `${GC} -m x`)
  assert.equal(r.status, 0)
  assert.ok(!negado(r.saida))

  const lixo = spawnSync(process.execPath, [portao], { input: 'isto não é json', encoding: 'utf8' })
  assert.equal(lixo.status, 0)
  const aviso = JSON.parse(lixo.stdout) // entrada inválida não passa calada: avisa usuário e modelo
  assert.match(aviso.systemMessage, /não conferiu/)
  assert.match(aviso.hookSpecificOutput.additionalContext, /não conferiu/)
  assert.ok(!negado(aviso))
})

test('portão: está no PreToolUse (Bash e PowerShell), forma exec com args, timeout 10, arquivo que existe', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(raiz, 'plugins', 'devconductor-core', 'hooks', 'hooks.json'), 'utf8'))
  assert.ok(hooks.hooks && typeof hooks.hooks === 'object', 'chave de topo hooks')
  const ehPortao = (h) => (h.args || []).some((a) => a.includes('portao-seguranca.mjs'))
  const grupo = (hooks.hooks.PreToolUse || []).find((g) => g.hooks.some(ehPortao))
  assert.ok(grupo, 'portão fora do PreToolUse')
  assert.equal(grupo.matcher, 'Bash|PowerShell')
  const h = grupo.hooks.find(ehPortao)
  assert.equal(h.command, 'node')
  assert.equal(h.timeout, 10)
  const rel = h.args[0].match(/^\$\{CLAUDE_PLUGIN_ROOT\}\/(.+)$/)[1]
  assert.ok(fs.existsSync(path.join(raiz, 'plugins', 'devconductor-core', rel)), rel)
})

// ---- Correções da revisão (itens 1 a 12) ----
// Parâmetros de registro que a mensagem de bloqueio indica (a linha "Modo do registro").
function modoDe(r) {
  const m = motivoDe(r).match(/Modo do registro[^:]*: (.+)$/m)
  assert.ok(m, motivoDe(r))
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"|(\S+)/g)].map((x) => (x[1] !== undefined ? JSON.parse(`"${x[1]}"`) : x[2]))
}
const ADD = ['git', 'add'].join(' ')

test('item 1: add no mesmo comando do commit confere o que vai entrar (., -A, arquivos, stage; &&, ;, |, quebra de linha)', (t) => {
  const { pasta, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  for (const c of [`${ADD} . && ${GC} -m x`, `${ADD} -A; ${GC} -m x`, `${ADD} src/Login.cs && ${GC} -m x`,
    `git stage .\n${GC} -m x`, `${ADD} . | ${GC} -m x`, `${ADD} -- "src/Login.cs" && ${GC} -m x`]) {
    assert.ok(negado(hook(pasta, c).saida), c)
  }
  // add de outro arquivo: só ele + o preparado (nada) entram; o Login.cs fora do add não conta
  escrever('docs/a.md', 'oi\n')
  assert.equal(hook(pasta, `${ADD} docs/a.md && ${GC} -m x`).saida, null)
})

test('item 1: add respeita o .gitignore (arquivo ignorado não entra)', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('.gitignore', 'local/\n')
  git('add', '.gitignore')
  git('commit', '-q', '-m', 'ignore')
  escrever('local/segredo.js', 'const senha = "x"\n')
  escrever('src/estilo.css', 'body{}\n')
  assert.equal(hook(pasta, `${ADD} . && ${GC} -m x`).saida, null)
  assert.ok(negado(hook(pasta, `${ADD} -f local/segredo.js && ${GC} -m x`).saida)) // -f força o ignorado
})

test('item 2: commit com caminhos (e --only/--include) confere o conteúdo da árvore desses arquivos', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Servico.cs', 'var x = 1;\n')
  escrever('docs/a.md', 'a\n')
  git('add', '.')
  git('commit', '-q', '-m', 'base')
  escrever('src/Servico.cs', 'var x = 1;\nvar senha = Ler();\n')
  escrever('docs/a.md', 'b\n')
  for (const c of [`${GC} -m x src/Servico.cs`, `${GC} --only src/Servico.cs -m x`, `${GC} -i -m x -- src/Servico.cs`, `${GC} -m x .`]) {
    assert.ok(negado(hook(pasta, c).saida), c)
  }
  assert.equal(hook(pasta, `${GC} -m x docs/a.md`).saida, null)
})

test('item 3: --amend confere o commit resultante contra o pai (ou contra o vazio no primeiro commit)', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  git('commit', '-q', '-m', 'login')
  assert.ok(negado(hook(pasta, `${GC} --amend -m y`).saida))
  assert.ok(negado(hook(pasta, `${GC} --amend --no-edit`).saida))
  assert.equal(hook(pasta, `${GC} -m y`).saida, null) // sem amend e sem nada preparado: nada entra

  const so = fs.mkdtempSync(path.join(os.tmpdir(), 'portao raiz '))
  t.after(() => fs.rmSync(so, { recursive: true, force: true }))
  const g = (...a) => assert.equal(spawnSync('git', a, { cwd: so, encoding: 'utf8', env: envGit(so) }).status, 0)
  g('init', '-q')
  fs.writeFileSync(path.join(so, 'Pix.cs'), 'var pix = 1;\n')
  g('add', '.')
  g('commit', '-q', '-m', 'primeiro')
  assert.ok(negado(hook(so, `${GC} --amend -m z`).saida))
})

test('item 4: cd, pushd, Set-Location, sl e git -C levam o portão à pasta certa; pasta incerta nega', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  const limpo = repo(t)
  const fora = os.tmpdir()
  assert.ok(negado(hook(pasta, `cd "${pasta}" && ${GC} -m x`, fora).saida))
  assert.ok(negado(hook(pasta, `pushd "${pasta}" && ${GC} -m x`, fora).saida))
  assert.ok(negado(hook(pasta, `Set-Location "${pasta}"; ${GC} -m x`, fora, 'PowerShell').saida))
  assert.ok(negado(hook(pasta, `sl '${pasta}'; ${GC} -m x`, fora, 'PowerShell').saida))
  assert.ok(negado(hook(pasta, `git -C '${pasta}' commit -m x`, fora).saida))
  // cd para um repositório limpo a partir do sensível: confere o limpo, não o cwd
  assert.equal(hook(pasta, `cd "${limpo.pasta}" && ${GC} -m x`).saida, null)
  // sem como saber a pasta: nega pedindo comando separado
  for (const c of [`cd $PASTA && ${GC} -m x`, `cd "${pasta}/nao existe"; ${GC} -m x`, `cd .. || ${GC} -m x`,
    `git --git-dir=x commit -m x`, `GIT_DIR=x ${GC} -m x`, `cd ~ && ${GC} -m x`]) {
    const r = hook(limpo.pasta, c)
    assert.ok(negado(r.saida), c)
    assert.match(motivoDe(r), /comando separado, dentro da pasta do repositório/)
  }
  // subshell não muda a pasta de quem vem depois
  assert.equal(hook(pasta, `(cd "${pasta}") && ${GC} -m x`, limpo.pasta).saida, null)
})

test('item 5: push confere o intervalo que vai de verdade (refspec, HEAD:outro, --all, sem upstream)', (t) => {
  const { pasta, git, escrever } = repo(t)
  const remoto = fs.mkdtempSync(path.join(os.tmpdir(), 'portao remoto '))
  t.after(() => fs.rmSync(remoto, { recursive: true, force: true }))
  assert.equal(spawnSync('git', ['init', '-q', '--bare', remoto], { encoding: 'utf8' }).status, 0)
  git('remote', 'add', 'origin', remoto)
  git('push', '-q', '-u', 'origin', 'HEAD')
  const ramo = git('branch', '--show-current').stdout.trim()
  git('checkout', '-q', '-b', 'nova')
  escrever('src/Pix.cs', 'var pix = 1;\n')
  git('add', '.')
  git('commit', '-q', '-m', 'pix')
  for (const c of [`${GP} origin nova`, `${GP} origin HEAD:outro`, `${GP} --all`, `${GP} origin nova:${ramo}`, GP, `${GP} -u origin HEAD`]) {
    assert.ok(negado(hook(pasta, c).saida), c)
  }
  assert.equal(hook(pasta, `${GP} origin ${ramo}`).saida, null) // o ramo antigo já está no remoto
  assert.equal(hook(pasta, `${GP} --dry-run origin nova`).saida, null)
})

test('item 6: remover proteção conta como sensível; mover a mesma linha não', () => {
  const remover = (caminho, linhas, novas = []) => classificar({ arquivos: [caminho], adicionadas: { [caminho]: novas }, removidas: { [caminho]: linhas } })
  for (const [arq, l] of [['src/Program.cs', 'app.MapGet("/u", F).RequireAuthorization();'],
    ['src/Controllers/U.cs', '[Authorize(Roles = "admin")]'], ['src/rotas.js', 'router.use(authenticate)'],
    ['db/x.sql', 'alter table pedidos enable row level security;'], ['src/Repo.cs', 'cmd.Parameters.AddWithValue("@id", id);'],
    ['src/Repo.cs', 'var q = sql.WithParameter("id", id);'], ['src/Startup.cs', 'o.Cookie.HttpOnly = true;'],
    ['src/sessao.js', "res.cookie('s', v, { secure: true, sameSite: 'strict' })"], ['src/Dto.cs', '[Required]'],
    ['src/Validar.cs', 'if (!ModelState.IsValid) return BadRequest();']]) {
    const r = remover(arq, [l])
    assert.equal(r.nivel, 2, l)
    assert.ok(r.categorias.includes('protecao-removida'), l)
  }
  assert.equal(remover('src/Startup.cs', ['    o.Cookie.HttpOnly = true;'], ['o.Cookie.HttpOnly = true; // movida']).nivel, 0)
  assert.equal(remover('src/a.js', ['const x = 1']).nivel, 0) // linha removida comum não conta
  assert.equal(remover('src/a.test.js', ['[Authorize]']).nivel, 0) // teste segue ignorado
  // pelo diff do Git: linha removida chega ao classificador
  const texto = ['diff --git a/src/P.cs b/src/P.cs', '--- a/src/P.cs', '+++ b/src/P.cs', '@@ -3 +2,0 @@', '-    [Authorize]', ''].join('\n')
  assert.ok(nivel(texto).categorias.includes('protecao-removida'))
})

test('item 7: token ao alcance de script (camelCase, snake_case, bearer, storage, document.cookie)', () => {
  for (const l of ['const accessToken = r.data.a', 'refresh_token = body.r', 'const idToken = x', 'headers.Authorization = `Bearer ${t}`', 'const userJwt = x']) {
    assert.equal(nivel(diff('src/api.ts', [l])).nivel, 2, l)
  }
  for (const l of ['localStorage.setItem("chave", senha)', "sessionStorage.setItem('t', jwt)", 'document.cookie = "acesso=" + token']) {
    const r = nivel(diff('src/app.js', [l]))
    assert.equal(r.nivel, 2, l)
    assert.ok(r.categorias.includes('token-no-navegador'), l)
  }
  assert.equal(nivel(diff('src/app.js', ['localStorage.setItem("tema", "escuro")'])).nivel, 0)
  const t0 = performance.now()
  nivel(diff('src/x.js', [`localStorage.setItem(${'a,'.repeat(20000)}`, `document.cookie = ${'a'.repeat(20000)}`]))
  assert.ok(performance.now() - t0 < 200) // sem regex de tempo exponencial
})

test('item 8: create/alter table, grant e policy em pasta de migração (Flyway, Rails, alembic) e SQL solto', () => {
  for (const [arq, l] of [['db/migration/V1__init.sql', 'CREATE TABLE pedidos (id int);'], ['db/migrate/2024_x.rb', 'create_table :pedidos'],
    ['alembic/versions/a.py', 'op.create_table("p")'], ['sql/001.sql', 'ALTER TABLE p ADD x int;'], ['sql/002.sql', 'grant\tall on p to anon;'],
    ['sql/003.sql', 'CREATE TABLE p (id int);']]) {
    const r = nivel(diff(arq, [l]))
    assert.equal(r.nivel, 2, arq)
    assert.ok(r.categorias.includes('banco-acesso'), arq)
  }
})

// Ciclo: nega → registra com o modo que a mensagem indica → libera → muda uma linha → nega de novo.
function ciclo(t, { preparar, comando, mudar }) {
  const ctx = repo(t)
  preparar(ctx)
  let r = hook(ctx.pasta, comando)
  assert.ok(negado(r.saida), `${comando}: ${JSON.stringify(r.saida)}`)
  const reg = registrar(ctx.pasta, '--achados', '0', ...QUEM, ...modoDe(r))
  assert.equal(reg.status, 0, reg.stderr)
  assert.equal(hook(ctx.pasta, comando).saida, null, comando)
  mudar(ctx)
  r = hook(ctx.pasta, comando)
  assert.ok(negado(r.saida), `${comando} depois da mudança`)
  assert.match(motivoDe(r), /outro diff|outro conteúdo/)
}

test('item 9: ciclo completo em cada modo (preparado, -am, add no comando, caminhos, amend, envio)', (t) => {
  const login = ({ escrever, git }) => { escrever('src/Login.cs', 'var senha = Ler();\n'); git('add', '.') }
  const mudarLogin = ({ escrever, git }) => { escrever('src/Login.cs', 'var senha = Ler();\nvar token = 1;\n'); git('add', '.') }
  ciclo(t, { preparar: login, comando: `${GC} -m x`, mudar: mudarLogin })
  const base = ({ escrever, git }) => {
    escrever('src/Servico.cs', 'var x = 1;\n'); git('add', '.'); git('commit', '-q', '-m', 's')
    escrever('src/Servico.cs', 'var x = 1;\nvar senha = Ler();\n')
  }
  const mudarServico = ({ escrever }) => escrever('src/Servico.cs', 'var x = 2;\nvar senha = Ler();\n')
  ciclo(t, { preparar: base, comando: `${GC} -am x`, mudar: mudarServico })
  ciclo(t, { preparar: base, comando: `${ADD} . && ${GC} -m x`, mudar: mudarServico })
  ciclo(t, { preparar: base, comando: `${ADD} src/Servico.cs && ${GC} -m x`, mudar: mudarServico })
  ciclo(t, { preparar: base, comando: `${GC} -m x src/Servico.cs`, mudar: mudarServico })
  ciclo(t, {
    preparar: ({ escrever, git }) => { escrever('src/Pix.cs', 'var pix = 1;\n'); git('add', '.'); git('commit', '-q', '-m', 'p') },
    comando: `${GC} --amend --no-edit`,
    mudar: ({ escrever, git }) => { escrever('src/Pix.cs', 'var pix = 2;\n'); git('add', '.') },
  })
  ciclo(t, {
    preparar: ({ escrever, git }) => { escrever('src/Pix.cs', 'var pix = 1;\n'); git('add', '.'); git('commit', '-q', '-m', 'p') },
    comando: GP,
    mudar: ({ escrever, git }) => { escrever('src/Pix.cs', 'var pix = 2;\n'); git('add', '.'); git('commit', '-q', '-m', 'p2') },
  })
})

test('item 9: commit e push no mesmo comando podem ter os dois registros', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Pix.cs', 'var pix = 1;\n')
  git('add', '.')
  git('commit', '-q', '-m', 'p')
  escrever('src/Boleto.cs', 'var boleto = 1;\n')
  const cmd = `${ADD} . && ${GC} -m b && ${GP}`
  let r = hook(pasta, cmd)
  assert.ok(negado(r.saida))
  assert.equal(registrar(pasta, '--achados', '0', ...QUEM, ...modoDe(r)).status, 0)
  r = hook(pasta, cmd)
  assert.ok(negado(r.saida))
  assert.match(motivoDe(r), /git push/)
  assert.equal(registrar(pasta, '--achados', '0', ...QUEM, ...modoDe(r)).status, 0)
  assert.equal(hook(pasta, cmd).saida, null)
})

test('itens 10 e 11: texto curto sem o comando de registro; heredoc e aspas não viram commit nem push', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  const r = hook(pasta, `${GC} -m x`)
  assert.ok(motivoDe(r).split('\n').length <= 6)
  assert.match(motivoDe(r), /peça a revisão de segurança \(agente `?security-auditor`?\); o registro é feito no fim da revisão/)
  for (const c of [`node - <<'EOF'\nconst a = "${GP} origin"\nEOF`, `echo "${GC} e ${GP}"`, `cat > x.txt <<EOF\n${GC}\nEOF`]) {
    assert.equal(hook(pasta, c).saida, null, c)
  }
  // mensagem em heredoc dentro de $( ): o commit continua sendo visto
  assert.ok(negado(hook(pasta, `${GC} -m "$(cat <<'EOF'\nfix: texto com (parêntese e 'aspas'\nEOF\n)"`).saida))
})

test('item 12: diff grande é cortado e conta como sensível, sem passar de poucos segundos', () => {
  const linhas = repetir(60000, (i) => `const v${i} = ${i};`)
  const t0 = performance.now()
  const lido = lerDiff(diff('src/gerado.js', linhas), { limite: 20000 })
  const r = classificar(lido)
  assert.ok(performance.now() - t0 < 2000)
  assert.equal(lido.cortado, true)
  assert.equal(r.nivel, 2)
  assert.ok(r.categorias.includes('leitura-cortada'))
  // arquivo ignorado (documentação) não gasta o limite
  const doc = lerDiff(diff('docs/grande.md', linhas) + diff('src/a.css', ['body{}']), { limite: 20000 })
  assert.equal(doc.cortado, false)
})

// ---- Segunda correção: só a forma simples é conferida; o resto na linha de um commit/envio é negado ----
const C = ['com', 'mit'].join('')
const P = ['pu', 'sh'].join('')
const SIMPLES = /só confere commit e envio em comando simples|comando separado, dentro da pasta/

test('forma simples: aspas coladas, escape, caminho e extensão do executável e maiúsculas são normalizados e conferidos', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  for (const c of [`git com''mit -m x`, 'git co""mmit -m x', 'git co\\mmit -m x', `"C:\\Program Files\\Git\\cmd\\git.exe" ${C} -m x`,
    `git.cmd ${C} -m x`, `GIT ${C.toUpperCase()} -m x`]) {
    const r = hook(pasta, c)
    assert.ok(negado(r.saida), c)
    assert.match(motivoDe(r), /toca área sensível/, c)
  }
  assert.ok(negado(hook(pasta, 'git com`mit -m x', pasta, 'PowerShell').saida))
})

test('forma simples: commit/envio escondido ou junto de outro comando é negado pedindo comando separado', (t) => {
  const { pasta } = repo(t) // nada preparado: a negação é pela forma, não pelo conteúdo
  for (const c of [`bash -c "git ${C} -m x"`, `sh -c 'git ${P}'`, `pwsh -Command "git ${C} -m x"`, `(git ${C} -m x)`,
    `echo $(git ${C} -m x)`, `echo \`git ${C} -m x\``, `timeout 60 git ${C} -m x`, `env X=1 git ${C} -m x`,
    `echo a | xargs git ${C} -m`, `git ${C} -m x &`, `node -e "require('child_process').execSync('git ${C} -m x')"`,
    `bash <<'EOF'\ngit ${C} -m x\nEOF`, `echo "git ${P}" | bash`, `git -c alias.ci=${C} ci -m x`, `LANG=C git ${C} -m x`,
    `git stash pop && git ${C} -a -m x`, `git merge --squash b && git ${C} -m x`, `cp ../Pix.cs src/ && ${ADD} . && git ${C} -m x`,
    `echo x >> a && git ${C} -am x`, `git reset --hard danger && git ${P} origin HEAD:main`, `git ${C} -m x > saida.txt`,
    `git ${C} -p -m x`, `${ADD} -p && git ${C} -m x`, `git ${C} -m x || true`, `git ${P} --mirror`, `$GIT ${C} -m x`]) {
    const r = hook(pasta, c)
    assert.ok(negado(r.saida), c)
    assert.match(motivoDe(r), SIMPLES, c)
  }
  assert.ok(negado(hook(pasta, `powershell -c "git ${P}"`, pasta, 'PowerShell').saida))
  for (const c of [`git update-ref HEAD $(git ${C}-tree $(git write-tree) -p HEAD -m x)`, 'git update-ref refs/heads/x HEAD']) {
    const r = hook(pasta, c)
    assert.ok(negado(r.saida), c)
    assert.match(motivoDe(r), /commit-tree e git update-ref/)
  }
})

test('forma simples: formas conhecidas limpas passam; texto que só cita commit/push fica em silêncio', (t) => {
  const { pasta, escrever } = repo(t)
  escrever('docs/a.md', 'a\n')
  for (const c of [`${ADD} docs/a.md && git ${C} -m docs`, `cd "${pasta}" && ${ADD} -A && git ${C} -m x 2>&1`,
    `git ${C} -m "$(cat <<'EOF'\nfix: x\nEOF\n)"`, `git ${C} --no-verify -s -m x`, `git ${C} -m x >/dev/null 2>&1`,
    `git -C "${pasta}" ${C} -qm x`, `git ${C} -m "> nota com sinal"`, `git ${P} --dry-run`,
    `gh pr create --body "rode git ${P} depois"`, `git log --grep "${C}"`, `grep -r "git ${C}" docs`]) {
    assert.equal(hook(pasta, c).saida, null, c)
  }
})

test('furo 1: git add -f . (ou -fA, --force) inclui o ignorado sensível; o ciclo de registro continua valendo', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('.gitignore', 'local/\n')
  git('add', '.gitignore')
  git('commit', '-q', '-m', 'ignore')
  escrever('local/segredo.js', 'const senha = "x"\n')
  assert.equal(hook(pasta, `${ADD} . && git ${C} -m x`).saida, null)
  for (const c of [`${ADD} -f . && git ${C} -m x`, `${ADD} -fA && git ${C} -m x`, `${ADD} --force && git ${C} -m x`]) {
    const r = hook(pasta, c)
    assert.ok(negado(r.saida), c)
    assert.ok(modoDe(r).includes('--forcar'), c)
  }
  const cmd = `${ADD} -f . && git ${C} -m x`
  assert.equal(registrar(pasta, '--achados', '0', ...QUEM, ...modoDe(hook(pasta, cmd))).status, 0)
  assert.equal(hook(pasta, cmd).saida, null)
})

test('furo 2: push para outro remoto compara com os ramos desse remoto (posicional, --repo, remoto vazio)', (t) => {
  const { pasta, git, escrever } = repo(t)
  for (const nome of ['origin', 'backup', 'vazio']) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), `portao ${nome} `))
    t.after(() => fs.rmSync(d, { recursive: true, force: true }))
    assert.equal(spawnSync('git', ['init', '-q', '--bare', d], { encoding: 'utf8' }).status, 0)
    git('remote', 'add', nome, d)
  }
  git('push', '-q', 'backup', 'HEAD')
  escrever('src/Pix.cs', 'var pix = 1;\n')
  git('add', '.')
  git('commit', '-q', '-m', 'pix')
  git('push', '-q', '-u', 'origin', 'HEAD')
  assert.equal(hook(pasta, `git ${P}`).saida, null) // origin já tem tudo
  assert.equal(hook(pasta, `git ${P} origin`).saida, null)
  for (const c of [`git ${P} backup`, `git ${P} --repo backup`, `git ${P} --repo=backup`, `git ${P} vazio`,
    `git ${P} backup HEAD`, `git ${P} --all backup`]) {
    assert.ok(negado(hook(pasta, c).saida), c)
  }
})

test('furo 3: proteção desligada mantendo o nome conta como sensível; mover ou pôr proteção ativa não', () => {
  const troca = (arq, velhas, novas) => classificar({ arquivos: [arq], adicionadas: { [arq]: novas }, removidas: { [arq]: velhas } })
  for (const [arq, v, nv] of [
    ['src/Startup.cs', ['o.Cookie.HttpOnly = true;'], ['o.Cookie.HttpOnly = false;']],
    ['src/Startup.cs', ['options.ValidateLifetime = true;'], ['options.ValidateLifetime = false;']],
    ['src/Program.cs', ['app.UseRateLimiter();'], ['// app.UseRateLimiter();']],
    ['src/config.py', ['RATE_LIMIT = "100/h"'], ['# RATE_LIMIT = "100/h"']],
    ['src/Startup.cs', ['o.Cookie.SecurePolicy = CookieSecurePolicy.Always;'], ['o.Cookie.SecurePolicy = CookieSecurePolicy.None;']],
    ['src/sessao.js', ["res.cookie('s', v, { sameSite: 'strict' })"], ["res.cookie('s', v, { sameSite: 'lax' })"]],
    ['src/Startup.cs', [], ['o.RequireHttpsMetadata = false;']],
    ['src/Startup.cs', [], ['ValidateIssuer = false, ValidateAudience = false, ValidateIssuerSigningKey = false']],
  ]) {
    const r = troca(arq, v, nv)
    assert.equal(r.nivel, 2, nv[0])
    assert.ok(r.categorias.some((c) => c === 'protecao-removida' || c === 'protecao-desligada'), nv[0])
  }
  assert.equal(troca('src/Startup.cs', ['  o.Cookie.HttpOnly = true;'], ['o.Cookie.HttpOnly = true;']).nivel, 0)
  assert.equal(troca('src/Dto.cs', [], ['[Required]']).nivel, 0) // proteção nova, ativa: não conta (decisão)
})

test('furo 4: commit com caminhos confere só esses caminhos; --include soma o preparado; --dry-run passa', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('docs/a.md', 'a\n')
  git('add', '.')
  git('commit', '-q', '-m', 'base')
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', 'src/Login.cs')
  escrever('docs/a.md', 'b\n')
  for (const c of [`git ${C} --only docs/a.md -m docs`, `git ${C} -m docs docs/a.md`, `git ${C} -o -m docs -- docs/a.md`,
    `git ${C} --dry-run -m x`, `git ${C} -a --dry-run -m x`, `git ${P} -n`]) {
    assert.equal(hook(pasta, c).saida, null, c)
  }
  for (const c of [`git ${C} --include docs/a.md -m x`, `git ${C} -i -m x docs/a.md`, `git ${C} -m x`]) {
    assert.ok(negado(hook(pasta, c).saida), c)
  }
})

test('furo 5: entrada adversária de 500 KB é classificada em menos de 1 s (regex limitada, glob sem retrocesso)', () => {
  const kb = 500 * 1024
  const linhas = [`localStorage.setItem(${'a,'.repeat(kb / 2)}`, 'document.cookie='.repeat(kb / 16), `localStorage[${'a'.repeat(kb)}`, 'x'.repeat(kb)]
  const glob = `${'*a'.repeat(8)}Z`
  const t0 = performance.now()
  nivel(diff('src/x.js', linhas))
  assert.equal(globParaRegex(glob).test('a'.repeat(60)), false)
  assert.equal(globParaRegex(glob).test('a'.repeat(kb)), false)
  assert.equal(nivel(diff('src/y.js', ['ok']), { ignorar: [glob] }).nivel, 0)
  const ms = performance.now() - t0
  assert.ok(ms < 1000, `levou ${ms.toFixed(0)} ms`)
  // linha longa: é testada inteira, em pedaços (o que vem depois dos 2.000 caracteres também conta)
  assert.equal(nivel(diff('src/z.js', [`${' '.repeat(2000)}senha`])).nivel, 2)
  assert.equal(nivel(diff('src/z.js', [`senha${' '.repeat(5000)}`])).nivel, 2)
  for (const [g, s, e] of [['**/*.md', 'a/b/C.MD', true], ['**/*Tests*/**', 'Api.Tests/x.cs', true], ['a/**/b', 'a/b', true],
    ['a/**/b', 'a/x/y/b', true], ['src/*.js', 'src/a/b.js', false], ['**/messages*.json', 'src/messages.pt.json', true], ['a?c', 'abc', true]]) {
    assert.equal(globParaRegex(g).test(s), e, `${g} × ${s}`)
  }
})

test('furo 6: Git que não responde no prazo → nega pedindo para repetir (não libera calado)', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  const evento = { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: pasta, tool_input: { command: `git ${C} -m x` } }
  const r = spawnSync(process.execPath, [portao], { input: JSON.stringify(evento), encoding: 'utf8', env: { ...envGit(pasta), DEVCONDUCTOR_PORTAO_PRAZO_MS: '1' } })
  const s = JSON.parse(r.stdout)
  assert.ok(negado(s))
  assert.match(s.hookSpecificOutput.permissionDecisionReason, /não deu para conferir a tempo; rode o commit de novo ou em partes/)
  definirPrazo(0)
  try { assert.throws(() => analisar({ raiz: pasta }), (e) => e.code === 'PRAZO') } finally { definirPrazo(Infinity) }
})

test('item 7: teste, estilo, tradução, .txt, ícone, página e workflow não acusam por palavra; o sensível continua', (t) => {
  for (const [arq, l] of [
    ['.github/workflows/testes.yml', '      - uses: actions/checkout@v4'],
    ['src/login.spec.ts', 'await page.fill("#senha", "123456")'], ['tests/e2e/fluxo.ts', 'const senha = "teste"'],
    ['src/__tests__/a.js', 'senha'], ['spec/login_spec.rb', 'senha'],
    ['src/tema.css', ':root { --token-cor: #222; }'], ['src/styles/app.scss', '$token-cor: red;'],
    ['src/ui/cores.ts', "export const cores = { '--token-cor': '#222' } // design token"],
    ['src/Menu.tsx', "import { Upload, Trash } from 'lucide-react'"], ['src/Menu.tsx', '<Upload size={16} />'], ['src/Menu.tsx', '  Upload,'],
    ['src/pages/Perfil.tsx', 'export default function Perfil() { return <Layout titulo="Perfil" /> }'],
    ['notas.txt', 'trocar a senha do admin'], ['src/locales/pt-BR.json', '"senha": "Senha"'], ['po/pt.po', 'msgstr "Senha"'],
    ['src/messages.pt.json', '{"senha": "Senha"}'],
  ]) assert.equal(nivel(diff(arq, [l])).nivel, 0, `${arq}: ${l}`)
  const chave = ['AKIA', 'ABCDEFGHIJKLMNOP'].join('') // formato de chave real, valor inventado
  for (const [arq, l, cat] of [
    ['src/Pedido.cs', 'var url = await CriarCheckout(pedido);', 'pagamento'],
    ['tests/fixtures/config.ts', `const chave = "${chave}"`, 'segredo-com-valor'], // decisão: chave com formato real acusa até em teste
    ['tests/.env', 'X=1', 'segredos'], ['src/api.ts', 'const token = r.data.token', 'login'],
    ['src/rotas.js', "app.post('/upload', multer().single('f'), salvar)", 'upload'],
    ['src/Guard.ts', "if (usuario.perfil === 'admin') liberar()", 'permissao'], ['requirements.txt', 'django==5.0', 'dependencias'],
  ]) {
    const r = nivel(diff(arq, [l]))
    assert.ok(r.nivel >= 1 && r.categorias.includes(cat), `${arq}: ${JSON.stringify(r)}`)
  }
  const { pasta, git, escrever } = repo(t)
  escrever('src/login.spec.ts', 'const senha = "123"\n')
  git('add', '.')
  assert.equal(hook(pasta, `git ${C} -m teste`).saida, null)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  assert.ok(negado(hook(pasta, `${ADD} src/Login.cs && git ${C} -m login`).saida))
})

// ---- Terceira correção: reconheceu commit/envio e não entendeu ou não conferiu → nega ----
const SENSIVEL = /toca área sensível/
const NAO_CONFERIU = /não consegui conferir este commit\/envio/
// Remoto vazio (bare) ligado ao repositório, com o que já existe enviado e o upstream marcado.
function comRemoto(t, r, nome = 'origin') {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `portao ${nome} `))
  t.after(() => fs.rmSync(d, { recursive: true, force: true }))
  assert.equal(spawnSync('git', ['init', '-q', '--bare', d], { encoding: 'utf8' }).status, 0)
  r.git('remote', 'add', nome, d)
  r.git('push', '-q', '-u', nome, 'HEAD')
  return d
}
// Commit sensível novo (ainda não enviado).
function commitSensivel(r, arq = 'src/Pix.cs') {
  r.escrever(arq, 'var pix = 1;\n')
  r.git('add', '.')
  r.git('commit', '-q', '-m', 'pix')
}
const negadoPor = (r, re, c) => { assert.ok(negado(r.saida), c); assert.match(motivoDe(r), re, c) }

test('3ª correção 1: push --follow-tags (com e sem remoto) também confere o HEAD', (t) => {
  const r = repo(t)
  comRemoto(t, r)
  assert.equal(lerPush(['--follow-tags']).tags, false)
  assert.equal(lerPush(['--tags']).tags, true)
  assert.equal(hook(r.pasta, `git ${P} --follow-tags`).saida, null) // nada novo para mandar
  commitSensivel(r)
  for (const c of [`git ${P} --follow-tags`, `git ${P} --follow-tags origin`, `git ${P} origin --follow-tags`, `git ${P} -u --follow-tags origin HEAD`]) {
    negadoPor(hook(r.pasta, c), SENSIVEL, c)
  }
  assert.equal(hook(r.pasta, `git ${P} --tags`).saida, null) // só tags, e não há tag nova
})

test('3ª correção 2: push origin tag <nome> confere o commit da tag (leve ou anotada); tag sem nome ou que não existe nega', (t) => {
  const r = repo(t)
  comRemoto(t, r)
  r.git('tag', 'v0')
  assert.deepEqual(lerPush(['origin', 'tag', 'v1', 'HEAD']).refspecs, ['refs/tags/v1:refs/tags/v1', 'HEAD'])
  assert.equal(hook(r.pasta, `git ${P} origin tag v0`).saida, null) // o commit da tag já está no remoto
  commitSensivel(r)
  r.git('tag', 'v1')
  r.git('tag', '-a', 'v2', '-m', 'anotada')
  for (const c of [`git ${P} origin tag v1`, `git ${P} origin tag v2`, `git ${P} origin tag v0 tag v1`, `git ${P} --repo origin tag v1`]) {
    negadoPor(hook(r.pasta, c), SENSIVEL, c)
  }
  const cmd = `git ${P} origin tag v1`
  assert.equal(registrar(r.pasta, '--achados', '0', ...QUEM, ...modoDe(hook(r.pasta, cmd))).status, 0)
  assert.equal(hook(r.pasta, cmd).saida, null) // o registro vale para o mesmo conjunto
  for (const c of [`git ${P} origin tag`, `git ${P} origin tag nao-existe`]) negadoPor(hook(r.pasta, c), NAO_CONFERIU, c)
})

test('3ª correção 3: push sem refspec com push.default=matching ou remote.<nome>.push confere o que a configuração manda', (t) => {
  const r = repo(t)
  comRemoto(t, r)
  const principal = r.git('branch', '--show-current').stdout.trim()
  r.git('checkout', '-q', '-b', 'outra')
  commitSensivel(r)
  r.git('checkout', '-q', principal)
  const formas = [`git ${P}`, `git ${P} origin`, `git ${P} --follow-tags`]
  for (const c of formas) assert.equal(hook(r.pasta, c).saida, null, c) // padrão: só o ramo atual, que está limpo
  r.git('config', 'push.default', 'matching')
  for (const c of formas) negadoPor(hook(r.pasta, c), SENSIVEL, c)
  r.git('config', '--unset', 'push.default')
  for (const c of formas) assert.equal(hook(r.pasta, c).saida, null, c)
  r.git('config', 'remote.origin.push', 'refs/heads/outra:refs/heads/outra')
  for (const c of formas) negadoPor(hook(r.pasta, c), SENSIVEL, c)
  assert.equal(hook(r.pasta, `git ${P} origin HEAD`).saida, null) // refspec no comando: a configuração não entra
  r.git('config', '--unset', 'remote.origin.push')
  r.git('config', 'remote.origin.push', 'refs/heads/*:refs/heads/*') // com curinga: todos os ramos e tags
  negadoPor(hook(r.pasta, `git ${P}`), SENSIVEL, 'curinga')
  const cmd = `git ${P} origin`
  assert.equal(registrar(r.pasta, '--achados', '0', ...QUEM, ...modoDe(hook(r.pasta, cmd))).status, 0)
  assert.equal(hook(r.pasta, cmd).saida, null)
})

test('3ª correção 4 e 5: proteção depois de URL e valores fracos de proteção contam; comentário ao lado e proteção forte não', () => {
  const troca = (arq, velhas, novas) => classificar({ arquivos: [arq], adicionadas: { [arq]: novas }, removidas: { [arq]: velhas } })
  const r = troca('src/a.js', ['x("https://site", {httpOnly:true})'], ['x("https://site", {httpOnly:false})'])
  assert.equal(r.nivel, 2)
  assert.ok(r.categorias.includes('protecao-removida'))
  assert.equal(troca('src/a.js', ["fetch('http://a//b', {csrf: true})"], ["fetch('http://a//b', {csrf: false})"]).nivel, 2)
  assert.equal(troca('src/a.yml', ['csrf: true # https://doc'], ['csrf: false # https://doc']).nivel, 2)
  assert.equal(troca('src/a.js', ['x("https://site", {httpOnly:true})'], ['x("https://site", {httpOnly:true}) // nota']).nivel, 0)
  assert.equal(troca('src/Startup.cs', ['o.Cookie.HttpOnly = true;'], ['o.Cookie.HttpOnly = true; // nota']).nivel, 0)
  for (const l of ['o.Cookie.SameSite = SameSiteMode.Unspecified;', 'o.Cookie.SameSite = SameSiteMode.None;',
    'o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;', 'o.Cookie.SecurePolicy = CookieSecurePolicy.None;',
    'app.use(csrf({ ignoreMethods: todos }))', '[IgnoreAntiforgeryToken]', 'validateInput(dados, { skipMissing: sim })']) {
    const n = troca('src/Startup.cs', [], [l])
    assert.equal(n.nivel, 2, l)
    assert.ok(n.categorias.includes('protecao-desligada'), l)
  }
  // toda linha de proteção alterada conta, mesmo quando o valor novo não está na lista de fracos
  for (const [v, nv] of [['o.Cookie.SameSite = SameSiteMode.Strict;', 'o.Cookie.SameSite = SameSiteMode.Unspecified;'],
    ['o.Cookie.SecurePolicy = CookieSecurePolicy.Always;', 'o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;'],
    ['limiter = rateLimit({ max: 5 })', 'limiter = rateLimit({ max: 500000 })']]) {
    assert.equal(troca('src/Startup.cs', [v], [nv]).nivel, 2, nv)
  }
  for (const l of ['o.Cookie.SameSite = SameSiteMode.Strict;', 'o.Cookie.SecurePolicy = CookieSecurePolicy.Always;',
    '[Required] public string Nome { get; set; } = null!;']) {
    assert.equal(troca('src/Startup.cs', [], [l]).nivel, 0, l)
  }
})

test('3ª correção 6: aspas tipográficas e continuação de linha (PowerShell com crase + CRLF, Bash com \\) são reconhecidas ou negadas', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  const [da, df, sa, sf] = [0x201C, 0x201D, 0x2018, 0x2019].map((c) => String.fromCharCode(c)) // aspas tipográficas: “ ” ‘ ’
  for (const c of [`git ${da}${C}${df} -m x`, `git ${sa}${C}${sf} -m x`, `git \`\r\n${C} -m x`, `git \`\n${C} -m x`,
    `git ${C} \`\r\n  -m x`, `${da}git${df} ${C} -m x`]) {
    negadoPor(hook(pasta, c, pasta, 'PowerShell'), SENSIVEL, JSON.stringify(c))
  }
  // crase + quebra no meio da palavra (PowerShell) e \ + CRLF (Bash): leitura duvidosa → negado pela forma
  negadoPor(hook(pasta, 'git com`\r\nmit -m x', pasta, 'PowerShell'), SIMPLES, 'crase no meio')
  negadoPor(hook(pasta, `git \\\r\n${C} -m x`), SIMPLES, '\\ + CRLF')
  negadoPor(hook(pasta, `git ${da}${C}${df} -m x`), SIMPLES, 'tipográficas no Bash')
  negadoPor(hook(pasta, `git \\\n${C} -m x`), SENSIVEL, '\\ + LF')
  negadoPor(hook(pasta, `git com\\\nmit -m x`), SENSIVEL, '\\ + LF no meio')
  assert.equal(hook(pasta, 'echo a `\r\n b', pasta, 'PowerShell').saida, null)
  assert.equal(hook(pasta, `Write-Output ${da}git ${C}${df}`, pasta, 'PowerShell').saida, null) // só texto
  git('commit', '-q', '-m', 'login')
  negadoPor(hook(pasta, `git ${sa}${P}${sf} origin HEAD`, pasta, 'PowerShell'), SENSIVEL, 'push tipográfico')
  // funções: a mesma leitura, sem o hook
  assert.ok(reconhecer(`git ${da}${C}${df} -am x`, true).commit)
  assert.ok(reconhecer(`git \`\r\n${C} -am x`, true).commit)
  const duvida = reconhecer('git com`\r\nmit -am x', true)
  assert.ok(duvida.commit && duvida.amb)
  assert.equal(reconhecer(`git status \`\r\n -s`, true).amb, false)
})

const exePs = ['pwsh', 'powershell'].find((e) => spawnSync(e, ['-NoProfile', '-Command', 'exit 0'], { encoding: 'utf8' }).status === 0)
test('3ª correção 6: o PowerShell de verdade lê aspas tipográficas e crase + CRLF como o portão supõe', { skip: !exePs && 'sem PowerShell nesta máquina' }, (t) => {
  const { pasta } = repo(t)
  const arq = path.join(pasta, 'caso.ps1')
  const rodarPs = (texto) => {
    fs.writeFileSync(arq, `${String.fromCharCode(0xFEFF)}${texto}\r\n`) // com BOM: o PowerShell 5.1 lê UTF-8 só assim
    return spawnSync(exePs, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', arq], { cwd: pasta, encoding: 'utf8', env: envGit(pasta) })
  }
  // comando só de leitura no lugar do commit: se o PowerShell roda "rev-parse", rodaria "commit" igual
  const [da, df, sa, sf] = [0x201C, 0x201D, 0x2018, 0x2019].map((c) => String.fromCharCode(c))
  for (const c of [`git ${da}rev-parse${df} --is-inside-work-tree`, `git ${sa}rev-parse${sf} --is-inside-work-tree`, 'git `\r\nrev-parse --is-inside-work-tree']) {
    assert.match(rodarPs(c).stdout, /true/, JSON.stringify(c))
    assert.ok(reconhecer(c.replace('rev-parse', C), true).commit, JSON.stringify(c))
  }
  // crase + CRLF no meio da palavra: o PowerShell separa ("rev-" e "parse"); o portão, na dúvida, lê dos dois jeitos
  assert.doesNotMatch(rodarPs('git rev-`\r\nparse --is-inside-work-tree').stdout, /true/)
})

test('3ª correção 7: xargs + git sem subcomando escrito é negado; xargs com subcomando que não é commit segue', (t) => {
  const { pasta } = repo(t)
  for (const c of [`echo ${C} -m x | xargs git`, `echo ${C} | xargs -I{} git {} -m x`, `echo ${C} -m x | xargs git -C .`,
    `echo ${P} | xargs -n1 git --no-pager`, `printf '${C}\\n-m\\nx\\n' | xargs /usr/bin/git`]) {
    negadoPor(hook(pasta, c), SIMPLES, c)
  }
  for (const c of [`echo ${P}.txt | xargs git add`, `echo "${C}" | xargs echo`]) assert.equal(hook(pasta, c).saida, null, c)
})

test('3ª correção 8: aninhamento profundo não estoura a pilha nem libera; com commit/push no texto, nega', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  const fundo = `${'('.repeat(5000)}git ${C} -am x${')'.repeat(5000)}`
  const subst = `${'$('.repeat(20000)}x${')'.repeat(20000)}; git ${C} -am x`
  const crases = `echo ${'"$('.repeat(3000)}x${')"'.repeat(3000)} && git ${P}`
  for (const c of [fundo, subst, crases]) {
    const r = hook(pasta, c)
    assert.equal(r.status, 0)
    negadoPor(r, /aninhados demais/, c.slice(0, 30))
    assert.match(motivoDe(r), SIMPLES)
  }
  negadoPor(hook(pasta, fundo, pasta, 'PowerShell'), /aninhados demais/, 'PowerShell')
  // "" repetido dentro de "..." no PowerShell: antes era recursão; agora lê e confere
  negadoPor(hook(pasta, `git ${C} -m "${'""'.repeat(40000)}"`, pasta, 'PowerShell'), SENSIVEL, 'aspas dobradas')
  // sem commit/push no texto: nada a conferir; palavra só dentro de outra (arr.push): avisa, não nega
  assert.equal(hook(pasta, `${'('.repeat(5000)}echo a${')'.repeat(5000)}`).saida, null)
  const aviso = hook(pasta, `${'('.repeat(5000)}echo arr.${P}${')'.repeat(5000)}`)
  assert.ok(!negado(aviso.saida))
  assert.match(aviso.saida.systemMessage, /não conferiu/)
  assert.throws(() => lerShell(`${'('.repeat(100)}a${')'.repeat(100)}`, false), (e) => e.code === 'FORMA')
  assert.doesNotThrow(() => lerShell(`${'('.repeat(20)}a${')'.repeat(20)}`, false))
  assert.equal(palavraSolta(fundo), true)
  assert.equal(palavraSolta(`echo arr.${P}(1)`), false)
})

test('3ª correção 9: linha com mais de 2.000 caracteres é conferida inteira; além do orçamento, leitura cortada (nível 2)', () => {
  assert.ok(nivel(diff('src/z.js', [`${' '.repeat(2000)}const senha = "x";`])).nivel >= 1)
  for (const p of [1990, 1996, 1999, 2000, 3795, 3800, 5000, 50000]) { // inclusive em cima das emendas dos pedaços
    assert.ok(nivel(diff('src/z.js', [`${'x'.repeat(p)} const senha = "x"; ${'y'.repeat(300)}`])).nivel >= 1, `posição ${p}`)
  }
  assert.equal(nivel(diff('src/min.js', [`var a=${'f(1);'.repeat(100000)}`])).nivel, 0) // linha minificada limpa: 500 KB
  const troca = (velha, nova) => classificar({ arquivos: ['src/a.js'], adicionadas: { 'src/a.js': [nova] }, removidas: { 'src/a.js': [velha] } })
  const longe = 'z'.repeat(6000)
  assert.equal(troca(`${longe} cfg({httpOnly:true})`, `${longe} cfg({httpOnly:false})`).nivel, 2) // proteção depois do corte
  const r = classificar(lerDiff(diff('src/z.js', ['ok '.repeat(4000)])), { limitePedacos: 3 })
  assert.equal(r.nivel, 2)
  assert.deepEqual(r.categorias, ['leitura-cortada'])
})

test('3ª correção 10: o prazo vale para tudo (ler o comando, ler o diff, classificar), não só para as chamadas ao Git', (t) => {
  const linhas = repetir(20000, (i) => `var total${i} = ${'itens.Sum(x => x.Valor); '.repeat(60)}`)
  const texto = diff('src/Servico.cs', linhas)
  const lido = lerDiff(texto)
  const t0 = performance.now()
  definirPrazo(5)
  try {
    assert.throws(() => classificar(lido), (e) => e.code === 'PRAZO')
    assert.ok(performance.now() - t0 < 500, 'a classificação parou logo depois do prazo')
    assert.throws(() => lerDiff(texto), (e) => e.code === 'PRAZO')
    assert.throws(() => lerShell('a '.repeat(50000), false, { tique: conferirPrazo }), (e) => e.code === 'PRAZO')
    assert.throws(() => reconhecer(`git ${C} -m "${'a '.repeat(50000)}"`, false, { tique: conferirPrazo }), (e) => e.code === 'PRAZO')
  } finally { definirPrazo(Infinity) }
  assert.equal(classificar(lido).nivel, 0)
  // no hook: prazo estourado já na leitura de um comando de commit, numa pasta sem Git → nega (não libera com aviso)
  const vazia = fs.mkdtempSync(path.join(os.tmpdir(), 'portao prazo '))
  t.after(() => fs.rmSync(vazia, { recursive: true, force: true }))
  const evento = { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: vazia, tool_input: { command: `git ${C} -m "${'a '.repeat(50000)}"` } }
  const r = spawnSync(process.execPath, [portao], { input: JSON.stringify(evento), encoding: 'utf8', env: { ...envGit(vazia), DEVCONDUCTOR_PORTAO_PRAZO_MS: '1' } })
  const s = JSON.parse(r.stdout)
  assert.ok(negado(s))
  assert.match(s.hookSpecificOutput.permissionDecisionReason, /não deu para conferir a tempo/)
})

test('3ª correção 11: git status/diff/log/show só de leitura junto do commit são aceitos; formas que escrevem não', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('docs/a.md', 'a\n')
  git('add', '.')
  for (const c of [`git status && git ${C} -m x`, `git diff && git ${C} -m x`, `git log && git ${C} -m x`,
    `git status -sb; git diff --cached --stat && git ${C} -m x`, `git --no-pager log --oneline -5 --author Teste && git ${P} --dry-run`,
    `git diff --unified=0 -- docs && git ${C} -m x`, `git ${C} -m x && git show --stat`, `git log -n 3 --format=%h 2>&1 && git ${C} -m x`]) {
    assert.equal(hook(pasta, c).saida, null, c)
  }
  escrever('src/Login.cs', 'var senha = Ler();\n')
  git('add', '.')
  for (const c of [`git status && git ${C} -m x`, `git diff --cached && git ${C} -m x`, `git log -1; git ${C} -m x`]) {
    negadoPor(hook(pasta, c), SENSIVEL, c) // a inspeção não esconde o commit: ele é conferido
  }
  for (const c of [`git diff --output=p.patch && git ${C} -m x`, `git log --output=l.txt -1 && git ${C} -m x`,
    `git diff --ext-diff && git ${C} -m x`, `git diff > p.patch && git ${C} -m x`, `git status | head && git ${C} -m x`,
    `git diff $X && git ${C} -m x`, `git diff --no-index a b && git ${C} -m x`, `git show --textconv && git ${C} -m x`,
    `git status || git ${C} -m x`, `git branch -D x && git ${C} -m x`]) {
    negadoPor(hook(pasta, c), SIMPLES, c)
  }
})

test('3ª correção: commit/envio reconhecido e não conferido → nega (no modo avisar, avisa); commit em pasta sem Git só avisa', (t) => {
  const r = repo(t)
  comRemoto(t, r)
  const cmd = `git ${P} origin ramo-que-nao-existe`
  negadoPor(hook(r.pasta, cmd), NAO_CONFERIU, cmd)
  assert.match(motivoDe(hook(r.pasta, cmd)), /comando simples/)
  r.escrever('.devconductor/portao.json', '{"modo": "avisar"}')
  const aviso = hook(r.pasta, cmd)
  assert.ok(!negado(aviso.saida))
  assert.match(aviso.saida.systemMessage, NAO_CONFERIU)
  r.escrever('.devconductor/portao.json', '{"modo": "desligado"}')
  assert.equal(hook(r.pasta, cmd).saida, null)
  const vazia = fs.mkdtempSync(path.join(os.tmpdir(), 'portao sem git '))
  t.after(() => fs.rmSync(vazia, { recursive: true, force: true }))
  negadoPor(hook(vazia, `git ${P}`), /em que repositório/, 'push fora de repositório')
  const commit = hook(vazia, `git ${C} -m x`)
  assert.ok(!negado(commit.saida))
  assert.match(commit.saida.systemMessage, /não conferiu.*liberado/)
})

// ---- Quarta correção: ramos correspondentes (":") e remoto de envio implícito ----
// Remoto vazio (bare) ligado ao repositório SEM enviar nada (não existe refs/remotes/<nome>/...). Caminho com
// barra normal, igual nos dois sistemas, para poder ser escrito também no comando.
function remotoSolto(t, r, nome) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `portao ${nome} `)).replace(/\\/g, '/')
  t.after(() => fs.rmSync(d, { recursive: true, force: true }))
  assert.equal(spawnSync('git', ['init', '-q', '--bare', d], { encoding: 'utf8' }).status, 0)
  if (nome !== 'solto') r.git('remote', 'add', nome, d)
  return d
}
const silencio = (r, c) => assert.equal(hook(r.pasta, c).saida, null, c)

test('4ª correção 1: refspec ":" e "+:" confere os ramos correspondentes; só ":<destino>" e --delete apagam', (t) => {
  const r = repo(t)
  comRemoto(t, r)
  const principal = r.git('branch', '--show-current').stdout.trim()
  r.git('checkout', '-q', '-b', 'outra')
  r.git('push', '-q', 'origin', 'outra')
  r.git('checkout', '-q', principal)
  const iguais = [`git ${P} origin :`, `git ${P} origin +:`, `git ${P} origin ":"`, `git ${P} -f origin :`, `git ${P} --repo=x origin +:`]
  for (const c of iguais) silencio(r, c) // os ramos correspondentes já estão no remoto
  r.git('checkout', '-q', 'outra')
  commitSensivel(r) // "outra" existe no remoto e ganhou um commit sensível: ":" manda esse commit
  r.git('checkout', '-q', principal)
  for (const c of iguais) negadoPor(hook(r.pasta, c), SENSIVEL, c)
  // apagar de verdade segue passando em silêncio
  for (const c of [`git ${P} origin :outra`, `git ${P} origin +:outra`, `git ${P} origin :refs/heads/outra`,
    `git ${P} origin --delete outra`, `git ${P} -d origin outra`]) silencio(r, c)
  // formas vizinhas: curinga manda o que casa; origem sem destino confere a origem; refspec vazio nega
  negadoPor(hook(r.pasta, `git ${P} origin "refs/heads/*:refs/heads/*"`), SENSIVEL, 'curinga de ramos')
  negadoPor(hook(r.pasta, `git ${P} origin "+refs/*:refs/*"`), SENSIVEL, 'curinga de tudo')
  silencio(r, `git ${P} origin "refs/tags/*:refs/tags/*"`) // não há tag
  negadoPor(hook(r.pasta, `git ${P} origin outra:`), SENSIVEL, 'origem com destino vazio')
  silencio(r, `git ${P} origin HEAD:`) // o ramo atual está limpo
  negadoPor(hook(r.pasta, `git ${P} origin ""`), NAO_CONFERIU, 'refspec vazio')
  assert.ok(negado(hook(r.pasta, `git ${P} --mirror origin`).saida), '--mirror')
  assert.equal(lerPush(['--mirror', 'origin']).espelho, true)
  assert.equal(lerPush(['-odeploy', 'origin', 'HEAD']).nada, false) // "-o<valor>" não é -d nem -n
  // o registro vale para o mesmo conjunto
  const cmd = `git ${P} origin :`
  assert.equal(registrar(r.pasta, '--achados', '0', ...QUEM, ...modoDe(hook(r.pasta, cmd))).status, 0)
  silencio(r, cmd)
})

test('4ª correção 2: push sem remoto no comando compara com o remoto de envio (pushRemote, pushDefault), não com o upstream de outro', (t) => {
  const r = repo(t)
  comRemoto(t, r) // upstream: origin/<ramo>
  const principal = r.git('branch', '--show-current').stdout.trim()
  remotoSolto(t, r, 'backup') // backup existe mas nunca recebeu nada
  commitSensivel(r)
  r.git('tag', 'v1')
  r.git('push', '-q', 'origin', 'HEAD', 'v1') // origin já tem o commit sensível e a tag
  const formas = [`git ${P}`, `git ${P} -f`, `git ${P} --all`, `git ${P} --tags`, `git ${P} --follow-tags`]
  for (const c of formas) silencio(r, c) // vai para origin, que já tem tudo
  // cenário da revisão: push.default=current + branch.<ramo>.pushRemote=backup
  r.git('config', 'push.default', 'current')
  r.git('config', `branch.${principal}.pushRemote`, 'backup')
  for (const c of formas) negadoPor(hook(r.pasta, c), SENSIVEL, `pushRemote: ${c}`)
  silencio(r, `git ${P} origin`) // remoto dito no comando segue valendo
  r.git('config', '--unset', 'push.default')
  for (const c of formas) negadoPor(hook(r.pasta, c), SENSIVEL, `pushRemote (simple): ${c}`)
  r.git('config', 'push.default', 'matching')
  negadoPor(hook(r.pasta, `git ${P}`), SENSIVEL, 'pushRemote + matching')
  r.git('config', '--unset', 'push.default')
  r.git('config', '--unset', `branch.${principal}.pushRemote`)
  for (const c of formas) silencio(r, c)
  // remote.pushDefault manda o mesmo; branch.<ramo>.pushRemote vence o pushDefault
  r.git('config', 'remote.pushDefault', 'backup')
  for (const c of formas) negadoPor(hook(r.pasta, c), SENSIVEL, `pushDefault: ${c}`)
  r.git('config', `branch.${principal}.pushRemote`, 'origin')
  for (const c of formas) silencio(r, c)
  r.git('config', '--unset', `branch.${principal}.pushRemote`)
  // refspec vindo da configuração do remoto de envio também compara com ele
  r.git('config', 'remote.backup.push', 'HEAD')
  negadoPor(hook(r.pasta, `git ${P}`), SENSIVEL, 'remote.backup.push')
  r.git('config', '--unset', 'remote.backup.push')
  // registro e, depois, o que backup já recebeu deixa de contar
  const cmd = `git ${P}`
  assert.equal(registrar(r.pasta, '--achados', '0', ...QUEM, ...modoDe(hook(r.pasta, cmd))).status, 0)
  silencio(r, cmd)
  r.git('push', '-q', 'backup', 'HEAD', 'v1')
  for (const c of formas) silencio(r, c)
  commitSensivel(r, 'src/Boleto.cs')
  r.git('push', '-q', 'origin', 'HEAD')
  negadoPor(hook(r.pasta, `git ${P}`), SENSIVEL, 'commit novo só em origin')
  silencio(r, `git ${P} origin`)
})

test('4ª correção 2: endereço no lugar do nome — remoto conhecido usa os ramos dele; desconhecido conta tudo como novo', (t) => {
  const r = repo(t)
  const origem = remotoSolto(t, r, 'origin')
  r.git('push', '-q', '-u', 'origin', 'HEAD')
  const solto = remotoSolto(t, r, 'solto') // repositório que não é remoto daqui
  commitSensivel(r)
  r.git('push', '-q', 'origin', 'HEAD')
  for (const c of [`git ${P} "${origem}"`, `git ${P} "${origem}" HEAD`, `git ${P} --repo "${origem}"`, `git ${P} --all "${origem}"`]) silencio(r, c)
  for (const c of [`git ${P} "${solto}"`, `git ${P} "${solto}" HEAD`, `git ${P} --repo "${solto}"`, `git ${P} --repo="${solto}"`,
    `git ${P} --all "${solto}"`, `git ${P} "${solto}" :`]) negadoPor(hook(r.pasta, c), SENSIVEL, c)
  // remoto cujo nome é pedaço do nome de outro: os ramos de um não servem de base para o outro
  r.git('remote', 'add', 'origin/espelho', solto)
  negadoPor(hook(r.pasta, `git ${P} origin/espelho`), SENSIVEL, 'origin/espelho')
  negadoPor(hook(r.pasta, `git ${P} origin`), SENSIVEL, 'origin com vizinho de nome parecido')
})

// ---- git -c antes do subcomando: só a autoria (user.name / user.email) ----
const AUT = '-c user.name=n -c user.email=e@e'
// Formas aceitas (f recebe a pasta do repositório de teste).
const C_ACEITAS = [
  () => `git ${AUT} ${C} -m "feat: b"`,
  () => `git -c "user.name=Fulano de Tal" -c user.email="fulano@exemplo.invalid" ${C} -m x`,
  () => `git -c user.name='Zé Ação' -c user.email=ze+kit_1@exemplo.invalid ${C} -m x`,
  () => `git -c USER.NAME=n -c User.Email=e@e ${C} -m x`,
  () => `git -c user.name=a -c user.name=b ${C} -m x`,
  () => `git -c user.email=e@e ${C} -qm x`,
  (pasta) => `git -c user.name=n -C "${pasta}" -c user.email=e@e ${C} -m x`,
  () => `git --no-pager ${AUT} ${C} -m x`,
  () => `git ${AUT} status && git ${AUT} diff --stat && git ${AUT} ${C} -m x`,
]

test('git -c de autoria: user.name e user.email antes do subcomando passam em silêncio com conteúdo limpo', (t) => {
  const { pasta, git, escrever } = repo(t)
  escrever('docs/a.md', 'a\n')
  git('add', '.')
  for (const f of C_ACEITAS) assert.equal(hook(pasta, f(pasta)).saida, null, f(pasta))
  assert.equal(hook(pasta, `git ${AUT} ${C} -m "feat: b"`, pasta, 'PowerShell').saida, null)
  assert.equal(hook(pasta, `git -c "user.name=Fulano de Tal" -c user.email='e@e' ${C} -m x`, pasta, 'PowerShell').saida, null)
  // add no mesmo comando: confere a árvore (arquivo novo limpo, ainda não preparado)
  escrever('docs/b.md', 'b\n')
  assert.equal(hook(pasta, `git ${AUT} add docs/b.md && git ${AUT} ${C} -m x`).saida, null)
  assert.equal(hook(pasta, `${ADD} -A && git ${AUT} ${C} -m x`).saida, null)
})

test('git -c de autoria não vira contorno: as mesmas formas são negadas com conteúdo sensível (commit, add, envio)', (t) => {
  const r = repo(t)
  r.escrever('src/Login.cs', 'var senha = Ler();\n[AllowAnonymous]\n')
  // add no mesmo comando: o sensível ainda não está preparado e mesmo assim é conferido
  for (const c of [`git ${AUT} add . && git ${AUT} ${C} -m x`, `git ${AUT} ${C} -am x`]) {
    negadoPor(hook(r.pasta, c), /toca área sensível/, c)
  }
  r.git('add', '.')
  for (const f of C_ACEITAS) negadoPor(hook(r.pasta, f(r.pasta)), /toca área sensível/, f(r.pasta))
  negadoPor(hook(r.pasta, `git ${AUT} ${C} -m "feat: b"`, r.pasta, 'PowerShell'), /toca área sensível/, 'PowerShell')
  // com revisão registrada para este conteúdo, a forma com -c de autoria passa como a forma sem -c
  assert.equal(registrar(r.pasta, '--achados', '0', ...QUEM).status, 0)
  assert.equal(hook(r.pasta, `git ${AUT} ${C} -m x`).saida, null)
  // envio: limpo passa, commit sensível novo é negado
  const e = repo(t)
  comRemoto(t, e)
  assert.equal(hook(e.pasta, `git ${AUT} ${P}`).saida, null)
  commitSensivel(e)
  for (const c of [`git ${AUT} ${P}`, `git -c user.name=n ${P} origin HEAD`]) negadoPor(hook(e.pasta, c), SENSIVEL, c)
})

test('git -c com outra chave, sozinha ou misturada com a autoria, continua negado pela forma', (t) => {
  const { pasta } = repo(t) // nada preparado: a negação é pela forma, não pelo conteúdo
  for (const c of [`git -c core.hooksPath=x ${C} -m x`, `git -c user.name=n -c core.editor=true ${C} -m x`,
    `git -c core.editor=true -c user.name=n ${C} -m x`, `git -c user.name=x -c alias.${C}=status ${C} -m x`,
    `git -c alias.ci=${C} -c user.name=n ci -m x`, `git ${AUT} -c include.path=x ${C} -m x`,
    `git -c credential.helper=x ${AUT} ${P}`, `git -c push.default=matching ${P}`, `git -c remote.origin.url=x ${P}`,
    `git -c user.name=n -c remote.origin.pushurl=x ${P} origin HEAD`, `git -c user.signingkey=k ${C} -m x`,
    `git -c user.useConfigOnly=true ${C} -m x`, `git -c author.name=n ${C} -m x`, `git -c committer.email=e@e ${C} -m x`,
    `git -c user.namex=n ${C} -m x`, `git -c xuser.name=n ${C} -m x`, `git -c user.name.x=n ${C} -m x`,
    `git -c user.name ${C} -m x`, `git -c user.name= ${C} -m x`, `git -c USER.NAME= ${C} -m x`, `git -c "user.email=" ${C} -m x`,
    `git -c " user.name=n" ${C} -m x`, `git -cuser.name=n ${C} -m x`, `git -c=user.name=n ${C} -m x`,
    `git --config-env=user.name=NOME ${C} -m x`, `git --config-env user.name=NOME ${C} -m x`,
    `git -c user.name=$NOME ${C} -m x`, `git -c "user.name=$(whoami)" ${C} -m x`, `git -c user.name=n,--git-dir=x ${C} -m x`,
    `git -c user.name={a,--git-dir=x} ${C} -m x`, `git -c "user.name=a;b" ${C} -m x`, `git -c user.name=a/b ${C} -m x`,
    `git -c "user.name=a\nb" ${C} -m x`, `git ${AUT} -c core.hooksPath=x add . && git ${C} -m x`,
    `git -c core.pager=x status && git ${C} -m x`]) {
    negadoPor(hook(pasta, c), SIMPLES, c)
  }
  for (const c of [`git -c user.name=n,--git-dir=x ${C} -m x`, `git -c user.name=$env:NOME ${C} -m x`,
    `git -c core.hooksPath=x ${AUT} ${C} -m x`, `git -c "user.name=n" -c 'alias.ci=${C}' ci -m x`]) {
    negadoPor(hook(pasta, c, pasta, 'PowerShell'), SIMPLES, `PowerShell: ${c}`)
  }
  const r = hook(pasta, `git -c user.name=n -c core.hooksPath=x ${C} -m x`)
  assert.match(motivoDe(r), /user\.name=<valor> ou user\.email=<valor>/)
  assert.match(motivoDe(r), /core\.hooksPath=x/)
})
