// Gerador de vitrine do kit (skill subir): seleção, varredura e envio, num repositório de teste descartável.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { selecionar, varrer, ehBinario, gerar, enviar, aplicarTrocas } from '../../plugins/devconductor-core/skills/subir/scripts/vitrine.mjs'

const EMAIL = 'fulano@' + 'gmail.com'
const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  return r.stdout.trim()
}

function projetoDeTeste(t, cfg, arquivos) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vitrine-'))
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))
  const projeto = path.join(base, 'projeto')
  for (const [f, texto] of Object.entries({ 'vitrine.json': JSON.stringify(cfg), ...arquivos })) {
    fs.mkdirSync(path.dirname(path.join(projeto, f)), { recursive: true })
    fs.writeFileSync(path.join(projeto, f), texto)
  }
  git(projeto, 'init', '-q')
  git(projeto, 'config', 'user.name', 'Pessoa Teste')
  git(projeto, 'config', 'user.email', 'pessoa@example.com')
  git(projeto, 'add', '-A')
  git(projeto, 'commit', '-q', '-m', 'feat: inicio')
  return { base, projeto }
}

test('seleciona a lista, renomeia e nunca leva .env, vitrine.json nem memória e instruções de IA', () => {
  const arquivos = ['src/a.js', 'src/.env', 'src/.env.local', 'vitrine.json', 'CLAUDE.md', 'AGENTS.md', '.claude/settings.json',
    '.codex/x.md', 'docs/memory/MEMORY.md', 'docs/vitrine/README.md', 'README.md', 'pilotos/cliente.html']
  const cfg = { incluir: ['src/', 'docs/', 'README.md'], excluir: ['README.md'], renomear: { 'docs/vitrine/README.md': 'README.md' } }
  const r = selecionar(arquivos, cfg)
  assert.deepEqual(r.map((x) => x.destino), ['README.md', 'src/a.js'])
  assert.equal(r[0].origem, 'docs/vitrine/README.md')
})

test('permitirConfigIA deixa entrar a estrutura de memória do kit; segredo continua fora', () => {
  const r = selecionar(['skills/memoria/SKILL.md', '.env', 'CLAUDE.md'], { permitirConfigIA: true })
  assert.deepEqual(r.map((x) => x.destino), ['CLAUDE.md', 'skills/memoria/SKILL.md'])
})

test('renomear não contorna exclusões obrigatórias na origem ou no destino', () => {
  for (const origem of ['.env', 'src/.env.local', 'src/.ENV', '.claude/settings.local.json', 'CLAUDE.md', 'vitrine.json', 'scripts/vitrine.json']) {
    assert.deepEqual(selecionar([origem], { renomear: { [origem]: 'publico.txt' } }), [], origem)
  }
  for (const destino of ['.env', 'src/.ENV', 'CLAUDE.md', '.git/config', 'scripts/vitrine.json']) {
    assert.throws(() => selecionar(['ok.txt'], { renomear: { 'ok.txt': destino } }), /destino|reservado/, destino)
  }
})

test('destinos ficam confinados e portáveis, sem colisões de arquivo e pasta', () => {
  for (const destino of ['../fora', '..\\fora', '/absoluto', 'C:\\fora', 'x/../../fora', '', '.', '.GIT/config', 'x:fluxo', 'NUL.txt', 'a/../b', 'nome.']) {
    assert.throws(() => selecionar(['a.txt'], { renomear: { 'a.txt': destino } }), /destino/, destino)
  }
  for (const [a, b] of [['README.md', 'readme.md'], ['docs', 'docs/a.md']]) {
    assert.throws(() => selecionar(['a', 'b'], { renomear: { a, b } }), /mesmo destino|conflito/)
  }
})

test('não limpa o projeto, ancestral ou subpasta, nem segue junção de destino', (t) => {
  const { base, projeto } = projetoDeTeste(t, {}, { 'a.txt': 'preservar' })
  const dentro = path.join(projeto, 'publico')
  fs.mkdirSync(dentro)
  fs.writeFileSync(path.join(dentro, 'preservar.txt'), 'não apagar')
  for (const destino of [projeto, base, dentro]) {
    assert.throws(() => gerar({ projeto, destino }), /destino não pode/)
    assert.equal(fs.readFileSync(path.join(dentro, 'preservar.txt'), 'utf8'), 'não apagar')
    assert.equal(fs.readFileSync(path.join(projeto, 'a.txt'), 'utf8'), 'preservar')
  }
  const link = path.join(base, 'atalho')
  fs.symlinkSync(dentro, link, process.platform === 'win32' ? 'junction' : 'dir')
  assert.throws(() => gerar({ projeto, destino: link }), /link|junção/)
  assert.equal(fs.readFileSync(path.join(dentro, 'preservar.txt'), 'utf8'), 'não apagar')
})

test('renomeação inválida não limpa uma vitrine existente', (t) => {
  const { base, projeto } = projetoDeTeste(t, { renomear: { 'a.txt': '../fora.txt' } }, { 'a.txt': 'ok' })
  const destino = path.join(base, 'publico')
  fs.mkdirSync(destino)
  fs.writeFileSync(path.join(destino, 'antigo.txt'), 'preservar')
  assert.throws(() => gerar({ projeto, destino }), /destino/)
  assert.equal(fs.readFileSync(path.join(destino, 'antigo.txt'), 'utf8'), 'preservar')
  assert.equal(fs.existsSync(path.join(base, 'fora.txt')), false)
})

test('junção na origem não exporta arquivos de fora da seleção', (t) => {
  const { base, projeto } = projetoDeTeste(t, {}, { 'docs/a.txt': 'original' })
  const externo = path.join(base, 'externo')
  fs.mkdirSync(externo)
  fs.writeFileSync(path.join(externo, 'a.txt'), 'conteúdo fora da seleção')
  fs.unlinkSync(path.join(projeto, 'docs', 'a.txt'))
  fs.rmdirSync(path.join(projeto, 'docs'))
  fs.symlinkSync(externo, path.join(projeto, 'docs'), process.platform === 'win32' ? 'junction' : 'dir')
  const destino = path.join(base, 'publico')
  assert.throws(() => gerar({ projeto, destino }), /link não permitido/)
  assert.equal(fs.existsSync(destino), false)
  assert.equal(fs.readFileSync(path.join(externo, 'a.txt'), 'utf8'), 'conteúdo fora da seleção')
})

test('acusa e-mail pessoal, caminho da máquina, CPF, CNPJ, telefone, token e o padrão do projeto', () => {
  const cfg = { proibidos: [{ nome: 'cliente', padrao: 'empresa x', flags: 'i' }] }
  // Montados por partes para este arquivo não cair na varredura da própria vitrine.
  const texto = [EMAIL, 'C:\\' + 'Users\\alguem\\x', '/ho' + 'me/maria/proj', 'cpf 123.456.789' + '-09', 'cnpj 12.345.678/0001' + '-90',
    'tel (14) 99876' + '-5432', 'ghp_' + 'a'.repeat(36), 'da Empresa X', 'contato john@example.com'].join('\n')
  const regras = varrer('a.md', texto, cfg).map((a) => a.regra).sort()
  assert.deepEqual(regras, ['caminho da máquina', 'caminho da máquina', 'cliente', 'cnpj', 'cpf', 'e-mail pessoal', 'telefone', 'token'])
  assert.deepEqual(varrer('a.md', "valida('(11) 91234" + "-5678')", { permitidos: [{ arquivo: 'a.md', trecho: '\\(11\\) 9?\\d{4}-\\d{4}' }] }), [])
})

test('trocar generaliza o texto antes da varredura, só nos arquivos indicados', (t) => {
  const cfg = {
    proibidos: [{ nome: 'cliente', padrao: 'empresa x', flags: 'i' }],
    trocar: [{ padrao: 'Empresa X', flags: 'i', por: 'cliente' }, { padrao: 'segredo', por: '', arquivos: ['docs/**'] }],
  }
  assert.equal(aplicarTrocas('docs/a.md', 'site da EMPRESA X, segredo', cfg), 'site da cliente, ')
  assert.equal(aplicarTrocas('src/a.js', 'segredo', cfg), 'segredo')
  const { projeto, base } = projetoDeTeste(t, { ...cfg, incluir: ['docs/'] }, { 'docs/a.md': 'Empresa X\n' })
  const destino = path.join(base, 'saida')
  const r = gerar({ projeto, destino })
  assert.deepEqual(r.achados, [])
  assert.equal(fs.readFileSync(path.join(destino, 'docs', 'a.md'), 'utf8'), 'cliente\n')
  assert.equal(fs.readFileSync(path.join(projeto, 'docs', 'a.md'), 'utf8'), 'Empresa X\n', 'o privado não muda')
})

test('binário não é varrido', () => {
  assert.equal(ehBinario(Buffer.from([0x89, 0x50, 0x00, 0x47])), true)
  assert.equal(ehBinario(Buffer.from('texto comum')), false)
})

test('texto UTF-16 de PowerShell passa pela varredura e mantém codificação ao generalizar', (t) => {
  for (const ordem of ['le', 'be']) {
    const codificar = (texto) => {
      const corpo = Buffer.from(texto, 'utf16le')
      if (ordem === 'be') corpo.swap16()
      return Buffer.concat([Buffer.from(ordem === 'le' ? [0xff, 0xfe] : [0xfe, 0xff]), corpo])
    }
    const { projeto, base } = projetoDeTeste(t, { incluir: ['relatorio.txt'] }, { 'relatorio.txt': codificar(EMAIL) })
    const destino = path.join(base, 'publico')
    assert.equal(ehBinario(codificar(EMAIL)), false)
    assert.equal(gerar({ projeto, destino }).achados.length, 1, 'UTF-16 não pode escapar como binário')
    assert.equal(fs.existsSync(destino), false)
    fs.writeFileSync(path.join(projeto, 'relatorio.txt'), codificar('Empresa X\r\n'))
    const cfg = { incluir: ['relatorio.txt'], trocar: [{ padrao: 'Empresa X', por: 'cliente' }] }
    assert.deepEqual(gerar({ projeto, destino, cfg }).achados, [])
    assert.deepEqual(fs.readFileSync(path.join(destino, 'relatorio.txt')), codificar('cliente\r\n'))
  }
})

test('nome curto do Windows não esconde o próprio projeto', { skip: process.platform !== 'win32' }, (t) => {
  const { base, projeto } = projetoDeTeste(t, { repositorio: 'teste/p', incluir: ['a.txt'] }, { 'a.txt': 'um' })
  const longo = path.join(base, 'projeto-com-nome-bem-comprido')
  fs.renameSync(projeto, longo)
  const curto = spawnSync('cmd', ['/d', '/s', '/c', `"for %I in ("${longo}") do @echo %~sI"`], { encoding: 'utf8', windowsVerbatimArguments: true }).stdout.trim()
  if (!curto || path.basename(curto).toLowerCase() === path.basename(longo).toLowerCase()) return t.skip('volume sem nomes curtos')
  assert.throws(() => gerar({ projeto: longo, destino: curto }), /destino não pode/)
  assert.ok(fs.existsSync(path.join(longo, 'a.txt')))
})

test('UTF-32 é recusado antes de copiar, em vez de escapar como binário', (t) => {
  const { projeto, base } = projetoDeTeste(t, {}, { 'relatorio.txt': Buffer.from([0xff, 0xfe, 0, 0, 65, 0, 0, 0]) })
  assert.throws(() => gerar({ projeto, destino: path.join(base, 'publico') }), /UTF-32/)
  assert.equal(fs.existsSync(path.join(base, 'publico')), false)
})

test('com achado não escreve nada; sem achado copia só a lista e preserva o .git da vitrine', (t) => {
  const { base, projeto } = projetoDeTeste(t, { incluir: ['src/'] }, { 'src/a.js': 'ok', 'src/b.md': EMAIL, 'segredo.txt': 'x' })
  const alvo = path.join(base, 'vitrine')
  assert.equal(gerar({ projeto, destino: alvo }).achados.length, 1)
  assert.equal(fs.existsSync(alvo), false)
  fs.writeFileSync(path.join(projeto, 'src', 'b.md'), 'contato@example.com')
  git(projeto, 'commit', '-qam', 'fix: tira e-mail')
  fs.mkdirSync(path.join(alvo, '.git'), { recursive: true })
  fs.writeFileSync(path.join(alvo, 'velho.txt'), 'sai')
  const r = gerar({ projeto, destino: alvo })
  assert.equal(r.copiados, 2)
  assert.deepEqual(fs.readdirSync(alvo).sort(), ['.git', 'src'])
})

test('enviar faz commit com a autoria do privado e push; sem mudança não cria commit', (t) => {
  const { base, projeto } = projetoDeTeste(t, { repositorio: 'teste/projeto-vitrine', pasta: '../vitrine', incluir: ['src/'] }, { 'src/a.js': 'um' })
  const remoto = path.join(base, 'remoto.git')
  git(base, 'init', '-q', '--bare', remoto)
  const alvo = path.join(base, 'vitrine')
  git(base, 'clone', '-q', remoto, alvo)
  assert.equal(enviar({ projeto, mensagem: 'feat: primeira vitrine' }).enviado, true)
  assert.equal(git(alvo, 'log', '-1', '--format=%an <%ae> %s'), 'Pessoa Teste <pessoa@example.com> feat: primeira vitrine')
  assert.equal(git(remoto, 'rev-parse', 'HEAD'), git(alvo, 'rev-parse', 'HEAD'))
  assert.equal(enviar({ projeto }).semMudanca, true)
})
