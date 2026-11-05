// Agentes por função (DEV-47, ajustada pela DEV-48: Opus pensa e cria; desce só o que dá para conferir): cada agente tem modelo e esforço próprios, e a tabela do orquestrador,
// a skill e o README contam a mesma história que os cabeçalhos.
// Rodar: node --test scripts/testes/agentes.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const nucleo = path.join(raiz, 'plugins', 'devconductor-core')
const pastaAgentes = path.join(nucleo, 'agents')
const ler = (...p) => fs.readFileSync(path.join(...p), 'utf8')
const skill = ler(nucleo, 'skills', 'orquestrador', 'SKILL.md')
const tabela = ler(nucleo, 'skills', 'orquestrador', 'referencias', 'agentes.md')

const cabecalho = (texto) => {
  const bloco = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  return Object.fromEntries(bloco.split(/\r?\n/).map((l) => l.match(/^(\w+): (.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]))
}
const familia = (modelo) => (modelo.match(/opus|sonnet|haiku/) ?? [''])[0]
const agentes = fs.readdirSync(pastaAgentes).filter((f) => f.endsWith('.md'))
  .map((f) => ({ arquivo: f, nome: f.slice(0, -3), ...cabecalho(ler(pastaAgentes, f)) }))

test('todo agente do núcleo tem nome igual ao arquivo, modelo e esforço', () => {
  assert.ok(agentes.length >= 9, `só ${agentes.length} agentes`)
  for (const a of agentes) {
    assert.equal(a.name, a.nome, `${a.arquivo}: name diferente do arquivo`)
    assert.ok(familia(a.model ?? ''), `${a.arquivo}: modelo ${a.model}`)
    assert.ok(['low', 'medium', 'high'].includes(a.effort), `${a.arquivo}: esforço ${a.effort}`)
  }
})

test('planejador, executor e revisor têm o modelo e o esforço combinados', () => {
  const esperado = { planejador: ['opus', 'high'], executor: ['opus', 'medium'], revisor: ['opus', 'medium'] }
  for (const [nome, [modelo, esforco]] of Object.entries(esperado)) {
    const a = agentes.find((x) => x.nome === nome)
    assert.ok(a, `falta o agente ${nome}`)
    assert.equal(familia(a.model), modelo, `${nome}: modelo`)
    assert.equal(a.effort, esforco, `${nome}: esforço`)
  }
  const revisor = agentes.find((x) => x.nome === 'revisor')
  assert.ok(revisor.tools, 'revisor precisa limitar as ferramentas')
  assert.doesNotMatch(revisor.tools, /\b(Edit|Write|NotebookEdit)\b/, 'revisor não pode editar')
  assert.match(ler(pastaAgentes, 'planejador.md'), /docs\/planos\//, 'planejador não diz onde grava o plano')
  assert.match(ler(pastaAgentes, 'planejador.md'), /`\[sonnet\]`/, 'planejador não marca o que desce ao Sonnet')
  assert.match(tabela + skill, /`\[sonnet\]`[\s\S]{0,40}model: "sonnet"/, 'regente não passa model sonnet na parte [sonnet]')
  assert.match(ler(pastaAgentes, 'executor.md'), /pare e devolva a pergunta/, 'executor improvisaria')
  assert.match(ler(pastaAgentes, 'revisor.md'), /arquivo:linha/, 'revisor sem arquivo:linha')
})

test('a tabela de agentes bate com o cabeçalho de cada agente', () => {
  for (const a of agentes) {
    const linha = tabela.split(/\r?\n/).find((l) => l.startsWith('| `' + a.nome + '`'))
    assert.ok(linha, `tabela não lista ${a.nome}`)
    const [, , , modelo, esforco] = linha.split('|').map((c) => c.trim())
    assert.equal(modelo, familia(a.model), `${a.nome}: modelo na tabela`)
    assert.equal(esforco, a.effort, `${a.nome}: esforço na tabela`)
  }
})

test('orquestrador aponta para os agentes, o fluxo grande e a escada', () => {
  for (const a of agentes) assert.ok(skill.includes('`' + a.nome + '`'), `orquestrador não cita ${a.nome}`)
  assert.ok(skill.includes('referencias/agentes.md'), 'orquestrador não liga a tabela')
  assert.match(skill, /`planejador`[^\n]*→ `executor`[\s\S]{0,80}`testador`[\s\S]{0,20}`revisor`/, 'fluxo grande fora de ordem')
  for (const texto of [skill, tabela]) {
    const plano = texto.replace(/\s+/g, ' ')
    assert.match(plano, /Haiku falhou ou devolveu → Sonnet; Sonnet falhou 2× → Opus; na dúvida, o de cima/)
    assert.match(plano, /Opus pensa e cria; desce de modelo só o que dá para conferir/)
  }
})

test('README lista todo agente do núcleo', () => {
  const readme = ler(raiz, 'README.md')
  for (const a of agentes) assert.ok(readme.includes('`' + a.nome + '`'), `README não cita ${a.nome}`)
})
