// Gerador de vitrine do kit (skill subir): seleção, varredura e envio, num repositório de teste descartável.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { selecionar, varrer, ehBinario, gerar, enviar } from '../../plugins/devconductor-core/skills/subir/scripts/vitrine.mjs'

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

test('acusa e-mail pessoal, caminho da máquina, CPF, CNPJ, telefone, token e o padrão do projeto', () => {
  const cfg = { proibidos: [{ nome: 'cliente', padrao: 'empresa x', flags: 'i' }] }
  // Montados por partes para este arquivo não cair na varredura da própria vitrine.
  const texto = [EMAIL, 'C:\\' + 'Users\\alguem\\x', '/ho' + 'me/maria/proj', 'cpf 123.456.789' + '-09', 'cnpj 12.345.678/0001' + '-90',
    'tel (14) 99876' + '-5432', 'ghp_' + 'a'.repeat(36), 'da Empresa X', 'contato john@example.com'].join('\n')
  const regras = varrer('a.md', texto, cfg).map((a) => a.regra).sort()
  assert.deepEqual(regras, ['caminho da máquina', 'caminho da máquina', 'cliente', 'cnpj', 'cpf', 'e-mail pessoal', 'telefone', 'token'])
  assert.deepEqual(varrer('a.md', "valida('(11) 91234" + "-5678')", { permitidos: [{ arquivo: 'a.md', trecho: '\\(11\\) 9?\\d{4}-\\d{4}' }] }), [])
})

test('binário não é varrido', () => {
  assert.equal(ehBinario(Buffer.from([0x89, 0x50, 0x00, 0x47])), true)
  assert.equal(ehBinario(Buffer.from('texto comum')), false)
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
