import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const lint = path.join(raiz, 'plugins/landing-pages/skills/taste-skill/scripts/lint.mjs')
const commons = path.join(raiz, 'plugins/landing-pages/skills/lp-assets/scripts/buscar-commons.mjs')
function pasta(t) {
  const base = path.join(raiz, 'pilotos/testes-temporarios')
  fs.mkdirSync(base, { recursive: true })
  const dir = fs.mkdtempSync(path.join(base, 'design-dev34-'))
  t.after(() => {
    assert.equal(path.dirname(dir), base)
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  })
  return dir
}

test('lint não proíbe faixa ou contador, mas continua reprovando defeitos sem exceção', t => {
  const dir = pasta(t), arquivo = path.join(dir, 'pagina.html')
  const fonte = '<style>.faixa{animation:percorrer 12s linear infinite} @keyframes percorrer{to{transform:translateX(-50%)}}</style>\n' +
    '<section class="faixa"><span>Corte & conversa</span></section>\n' +
    '<output aria-live="off">432</output>\n'
  fs.writeFileSync(arquivo, fonte)
  const rodar = () => spawnSync(process.execPath, [lint, arquivo, '--json'], { encoding: 'utf8' })
  const valido = rodar()
  assert.equal(valido.status, 0, valido.stdout + valido.stderr)
  assert.deepEqual(JSON.parse(valido.stdout).findings.filter(f => f.level === 'FAIL'), [])
  fs.appendFileSync(arquivo, '<p>Lorem ipsum dolor sit amet</p>\n')
  const invalido = rodar()
  assert.equal(invalido.status, 1)
  assert(JSON.parse(invalido.stdout).findings.some(f => f.id === 'lorem' && f.level === 'FAIL'))
})

test('busca Commons recusa argumentos inválidos antes de acessar a rede', t => {
  const dir = pasta(t)
  for (const args of [['../fora', 'cabelo'], ['foto', 'cabelo', '--minimo', 'NaN'],
    ['foto', 'cabelo', '--minimo', '0'], ['foto', 'cabelo', '--minimo'], ['foto', 'cabelo', '--inventado']]) {
    const r = spawnSync(process.execPath, [commons, ...args], { cwd: dir, encoding: 'utf8', timeout: 5000 })
    assert.equal(r.status, 1, r.stdout + r.stderr)
    assert.match(r.stdout, /Uso:/)
    assert.deepEqual(fs.readdirSync(dir), [])
  }
})

test('busca Commons não sobrescreve JSON ou miniaturas de uma busca anterior', t => {
  const dir = pasta(t)
  for (const nome of ['foto.json', 'foto-01.jpg']) {
    fs.writeFileSync(path.join(dir, nome), 'preservar')
    const r = spawnSync(process.execPath, [commons, 'foto', 'cabelo'], { cwd: dir, encoding: 'utf8', timeout: 5000 })
    assert.equal(r.status, 1, r.stdout + r.stderr)
    assert.match(r.stderr, /já existe/)
    assert.equal(fs.readFileSync(path.join(dir, nome), 'utf8'), 'preservar')
    fs.unlinkSync(path.join(dir, nome))
  }
})

test('nenhuma skill lp-* volta a impor cota de cenas grandes (DEV-42)', () => {
  const base = path.join(raiz, 'plugins/landing-pages/skills')
  const arquivos = ['lp-cenas/SKILL.md', 'lp-cenas/tecnicas.md', 'lp-construcao/SKILL.md', 'lp-maestro/SKILL.md']
  for (const rel of arquivos) {
    const texto = fs.readFileSync(path.join(base, rel), 'utf8')
    assert.doesNotMatch(texto, /[Cc]enas grandes[^.\n]{0,20}2[–-]3/, rel)
    assert.doesNotMatch(texto, /escolher? 2[–-]3/, rel)
    assert.doesNotMatch(texto, /Pelo menos 1 cena/, rel)
  }
  const cenas = fs.readFileSync(path.join(base, 'lp-cenas/SKILL.md'), 'utf8')
  assert.doesNotMatch(cenas, /O mesmo truque já apareceu/, 'pergunta 8 não pode reprovar o que é novo')
  assert.match(cenas, /Leitura às cegas do estudo/)
  assert.match(cenas, /three motion layers" dela \*\*não vale\*\*/)
  const arte = fs.readFileSync(path.join(base, 'lp-direcao-de-arte/SKILL.md'), 'utf8')
  assert.match(arte, /carry the idea into every section/)
})
