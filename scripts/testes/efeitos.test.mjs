// Catálogo de efeitos do lp-cenas: JSON válido, vocabulário fixo, receitas existentes, busca por tipo.
// Rodar: node --test scripts/testes/efeitos.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { efeitosPorTipo, TIPOS, ORIGENS } from '../../plugins/landing-pages/skills/lp-cenas/buscar-efeito.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const cenas = path.join(raiz, 'plugins/landing-pages/skills/lp-cenas')
const efeitos = JSON.parse(fs.readFileSync(path.join(cenas, 'efeitos.json'), 'utf8'))

test('o catálogo é uma lista com os campos obrigatórios', () => {
  assert.ok(Array.isArray(efeitos) && efeitos.length > 0)
  for (const e of efeitos) {
    for (const c of ['id', 'nome', 'origem', 'onde', 'licenca', 'observacao']) {
      assert.equal(typeof e[c], 'string', `${e.id}: campo ${c}`)
      assert.ok(e[c].length > 0, `${e.id}: campo ${c} vazio`)
    }
    assert.ok(Array.isArray(e.bibliotecas), `${e.id}: bibliotecas`)
    assert.ok(e.peso === null || ['leve', 'médio', 'pesado'].includes(e.peso), `${e.id}: peso ${e.peso}`)
    assert.ok(ORIGENS.includes(e.origem), `${e.id}: origem ${e.origem}`)
  }
})

test('todo tipo está no vocabulário e há ao menos um por efeito', () => {
  for (const e of efeitos) {
    assert.ok(Array.isArray(e.tipos) && e.tipos.length > 0, `${e.id}: sem tipos`)
    for (const t of e.tipos) assert.ok(TIPOS.includes(t), `${e.id}: tipo fora do vocabulário: ${t}`)
  }
})

test('ids únicos', () => {
  const ids = efeitos.map((e) => e.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('toda receita do kit aponta para arquivo que existe, e toda receita existente está cadastrada', () => {
  const cadastradas = new Set()
  for (const e of efeitos.filter((x) => x.origem === 'receita-do-kit')) {
    assert.ok(fs.existsSync(path.join(raiz, e.onde)), `${e.id}: arquivo não existe: ${e.onde}`)
    cadastradas.add(path.basename(e.onde))
  }
  const receitas = fs.readdirSync(path.join(cenas, 'receitas')).filter((f) => f.endsWith('.md') && f !== 'catalogo-d2.md')
  for (const f of receitas) assert.ok(cadastradas.has(f), `receita sem cadastro: ${f}`)
})

test('efeitosPorTipo devolve as receitas do kit antes das outras origens', () => {
  for (const t of TIPOS) {
    const lista = efeitosPorTipo(t)
    const ultimaReceita = lista.map((e) => e.origem).lastIndexOf('receita-do-kit')
    const primeiraOutra = lista.findIndex((e) => e.origem !== 'receita-do-kit')
    if (ultimaReceita >= 0 && primeiraOutra >= 0) assert.ok(ultimaReceita < primeiraOutra, `tipo ${t}: ordem`)
  }
  assert.ok(efeitosPorTipo('marquee', { origem: 'registro-shadcn' }).every((e) => e.origem === 'registro-shadcn'))
})

test('tipo fora do vocabulário dá erro claro com a lista válida', () => {
  assert.throws(() => efeitosPorTipo('inexistente'), /Tipos válidos:.*presa/)
})

test('todo tipo do vocabulário tem pelo menos um efeito (exceto troca-de-cor e video, se não houver)', () => {
  const vazios = TIPOS.filter((t) => efeitosPorTipo(t).length === 0)
  const permitidos = ['troca-de-cor', 'video']
  assert.deepEqual(vazios.filter((t) => !permitidos.includes(t)), [], `tipos sem efeito: ${vazios.join(', ')}`)
})

const cli = (...args) => spawnSync(process.execPath, [path.join(cenas, 'buscar-efeito.mjs'), ...args], { encoding: 'utf8' })

test('por padrão mostra 5 (receitas do kit primeiro, leve antes de pesado); --todos mostra tudo', () => {
  const tipo = TIPOS.find((t) => efeitosPorTipo(t).length > 5)
  assert.ok(tipo, 'algum tipo tem mais de 5 efeitos')
  const cinco = efeitosPorTipo(tipo, { limite: 5 })
  assert.equal(cinco.length, 5)
  const peso = { leve: 0, 'médio': 1, pesado: 2 }
  const outras = cinco.filter((e) => e.origem !== 'receita-do-kit')
  for (let i = 1; i < outras.length; i++) assert.ok((peso[outras[i - 1].peso] ?? 1) <= (peso[outras[i].peso] ?? 1), 'peso fora de ordem')
  const padrao = cli(tipo), todos = cli(tipo, '--todos')
  assert.equal(padrao.status, 0, padrao.stderr)
  const contar = (t) => (t.match(/^\S+ \[/gm) || []).length
  assert.equal(contar(padrao.stdout), 5)
  assert.match(padrao.stdout, /--todos/)
  assert.equal(contar(todos.stdout), efeitosPorTipo(tipo).length)
})

test('texto livre ordena por palavras em comum com nome e observação', () => {
  const tipo = TIPOS.find((t) => efeitosPorTipo(t).length > 5)
  const base = efeitosPorTipo(tipo)
  const alvo = base[base.length - 1]
  const palavra = alvo.nome.split(/\s+/).find((p) => p.length > 4)
  assert.ok(palavra, 'nome com palavra longa')
  const lista = efeitosPorTipo(tipo, { texto: alvo.nome })
  const acerto = (e) => [...new Set(alvo.nome.toLowerCase().split(/\W+/))].filter((p) => p.length > 2 && `${e.nome} ${e.observacao}`.toLowerCase().includes(p)).length
  assert.ok(acerto(lista[0]) >= acerto(base[0]), 'o primeiro tem ao menos tantos acertos quanto o primeiro sem texto')
  assert.ok(lista.indexOf(alvo) <= base.indexOf(alvo), 'o efeito citado não desce')
  const r = cli('presa', 'camada sobre bloco preso')
  assert.equal(r.status, 0, r.stderr)
})

test('tipo inválido na linha de comando continua erro com a lista', () => {
  const r = cli('inexistente', 'qualquer texto')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /Tipos válidos:.*presa/)
})
