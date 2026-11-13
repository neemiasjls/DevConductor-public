// A skill de arquitetura tem de ser curta, registrar decisão em 5 campos e conferir a divisão antes de mudança grande.
// Rodar: node --test scripts/testes/arquitetura.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const nucleo = path.join(raiz, 'plugins', 'devconductor-core')
const pasta = path.join(nucleo, 'skills', 'arquitetura')
const ler = (...p) => fs.readFileSync(path.join(pasta, ...p), 'utf8')
const linhas = texto => texto.replace(/\r?\n$/, '').split(/\r?\n/)
const skill = ler('SKILL.md')
const modelo = ler('referencias', 'modelo-decisao.md')
const conferencia = ler('referencias', 'conferencia.md')

test('skill arquitetura tem cabeçalho, cabe no limite e aponta para as duas referências', () => {
  assert.match(skill, /^---\r?\nname: arquitetura\r?\ndescription: .{40,400}\r?\n---/)
  assert.ok(Buffer.byteLength(skill) <= 6000, `skill com ${Buffer.byteLength(skill)} bytes (limite 6000)`)
  for (const parte of ['mudança grande', 'decisão técnica', 'referencias/modelo-decisao.md', 'referencias/conferencia.md',
    'docs/decisoes-tecnicas/', 'docs/decisoes.md', 'grafo-codigo', 'superpowers:brainstorming', 'problema medido',
    'No máximo 10 linhas', 'recomendação primeiro'])
    assert.ok(skill.includes(parte), `faltou na skill: ${parte}`)
})

test('modelo de decisão tem Situação no topo, os 5 campos na ordem e o crédito do MADR na última linha', () => {
  const ls = linhas(modelo)
  assert.ok(ls.length <= 25, `modelo com ${ls.length} linhas (limite 25)`)
  const campos = ['## Problema', '## Opções', '## Escolha e por quê', '## Consequências', '## Como desfazer']
  const posicoes = campos.map(c => ls.indexOf(c))
  assert.ok(posicoes.every(p => p >= 0), `campo ausente: ${campos.filter((c, i) => posicoes[i] < 0).join(', ')}`)
  assert.deepEqual(posicoes, [...posicoes].sort((a, b) => a - b), 'campos fora da ordem')
  assert.equal(ls.filter(l => l.startsWith('## ')).length, 5, 'o modelo tem só os 5 campos')
  const situacao = ls.findIndex(l => l.startsWith('Situação:'))
  assert.ok(situacao >= 0 && situacao < posicoes[0], 'linha "Situação" antes do primeiro campo')
  for (const estado of ['proposta', 'aceita', 'substituída por NNN']) assert.ok(ls[situacao].includes(estado), `faltou: ${estado}`)
  assert.ok(modelo.includes('Escolhida: '), 'a escolha começa por "Escolhida:"')
  assert.equal(ls.at(-1), 'Estrutura adaptada do MADR (MIT OR CC0-1.0)')
  for (const fora of ['Decision Drivers', 'Confirmation']) assert.ok(!modelo.includes(fora), `não entra: ${fora}`)
})

test('conferência tem o mapa em 2 níveis, os itens e a regra contra peça nova sem problema medido', () => {
  const ls = linhas(conferencia)
  assert.ok(ls.length <= 60, `conferência com ${ls.length} linhas (limite 60)`)
  for (const parte of ['2 níveis', 'Nível 1', 'Nível 2', 'c4model.com', 'Limites entre módulos', 'ciclo',
    'Direção das dependências', 'Dono de cada dado', 'Contrato público', 'Migração com volta', 'portão de segurança',
    'Custo de operar', 'A mais simples entra sempre', 'microsserviço, fila, evento ou cache', 'problema medido'])
    assert.ok(conferencia.includes(parte), `faltou na conferência: ${parte}`)
  assert.ok(!/Nível [34]/.test(conferencia), 'só os níveis 1 e 2')
})

test('arquitetura tem dona no mapa de responsabilidades: núcleo, conversa principal, na tarefa', () => {
  const mapa = JSON.parse(fs.readFileSync(path.join(nucleo, 'skills', 'orquestrador', 'referencias', 'responsabilidades.json'), 'utf8'))
  const grupos = JSON.stringify(mapa).match(/\{[^{}]*"skills":\s*\[[^\]]*"arquitetura"[^\]]*\][^{}]*\}/g) ?? []
  assert.equal(grupos.length, 1, 'arquitetura aparece em um grupo só')
  const grupo = JSON.parse(grupos[0])
  assert.deepEqual([grupo.plugin, grupo.dono, grupo.uso], ['devconductor-core', 'principal', 'tarefa'])
})
