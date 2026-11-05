// Histórico sintético e isolado: não lê sessões reais nem chama a CLI do modelo.
// Rodar: node --test scripts/testes/medir-uso.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const medidor = path.join(raiz, 'scripts', 'medir-uso.mjs')
const zero = { entrada: 0, cacheLido: 0, saida: 0 }
const usuario = (timestamp, content = 'Tarefa de teste') => ({ type: 'user', timestamp, message: { content } })
const resposta = (id, timestamp, usage, model = 'modelo-principal') => ({
  type: 'assistant', timestamp, message: { id, model, usage },
})
const uso = (entrada, cacheGravado, cacheLido, saida) => ({
  input_tokens: entrada, cache_creation_input_tokens: cacheGravado,
  cache_read_input_tokens: cacheLido, output_tokens: saida,
})

function preparar(t) {
  const temporarios = fs.realpathSync(os.tmpdir())
  const pasta = fs.mkdtempSync(path.join(temporarios, 'devagents-medicao-'))
  const config = path.join(pasta, 'config isolada')
  const projeto = path.join(pasta, 'projeto com espacos')
  const chave = path.resolve(projeto).replace(/[^A-Za-z0-9]/g, '-')
  fs.mkdirSync(config)
  fs.mkdirSync(projeto)
  t.after(() => {
    const destino = path.resolve(pasta)
    assert.equal(path.dirname(destino), temporarios)
    assert.ok(path.basename(destino).startsWith('devagents-medicao-'))
    fs.rmSync(destino, { recursive: true, force: true })
  })
  const env = { ...process.env, CLAUDE_CONFIG_DIR: config }
  return {
    historico(nome, linhas, sufixo = '') {
      const arquivo = path.join(config, 'projects', `${chave}${sufixo}`, nome)
      fs.mkdirSync(path.dirname(arquivo), { recursive: true })
      fs.writeFileSync(arquivo, linhas.map((linha) => typeof linha === 'string' ? linha : JSON.stringify(linha)).join('\n') + '\n')
    },
    executar(args, todos = false) {
      const r = spawnSync(process.execPath, [medidor, ...(todos ? ['--todos'] : [projeto]), ...args], {
        cwd: raiz, env, encoding: 'utf8', timeout: 10000,
      })
      assert.ifError(r.error)
      return { ...r, saida: `${r.stdout}${r.stderr}` }
    },
    json(args = [], todos = false) {
      const r = this.executar([...args, '--json'], todos)
      assert.equal(r.status, 0, r.saida)
      return JSON.parse(r.stdout)
    },
  }
}

test('JSON soma tokens e cache separadamente e conta resposta repetida uma vez', (t) => {
  const f = preparar(t)
  const principal = resposta('resposta-1', '2026-10-15T14:01:00.000Z', uso(100, 20, 300, 40))
  f.historico('sessao-1.jsonl', [
    usuario('2026-10-15T14:00:00.000Z', 'Primeira\n pergunta de teste'),
    principal,
    '{linha inválida',
    principal,
    resposta('resposta-2', '2026-10-15T14:02:00.000Z', uso(50, 10, 70, 15)),
    { type: 'assistant', message: { id: 'sem-uso', model: 'modelo-principal' } },
  ])
  const r = f.json()
  assert.equal(r.sessoes.length, 1)
  assert.equal(r.sessoes[0].id, 'sessao-1')
  assert.equal(r.sessoes[0].inicio, '2026-10-15T14:00:00.000Z')
  assert.equal(r.sessoes[0].primeiraPergunta, 'Primeira pergunta de teste')
  assert.deepEqual(r.sessoes[0].porModelo, {
    'modelo-principal': { respostas: 2, entrada: 150, cacheGravado: 30, cacheLido: 370, saida: 55 },
  })
  assert.deepEqual(r.sessoes[0].totais, { entrada: 180, cacheLido: 370, saida: 55 })
  assert.deepEqual(r.totais, { entrada: 180, cacheLido: 370, saida: 55 })
})

test('janela mede mensagens da tarefa e subagentes mesmo com início antigo da sessão', (t) => {
  const f = preparar(t)
  f.historico('sessao-longa.jsonl', [
    usuario('2026-10-01T12:00:00.000Z'),
    resposta('antes', '2026-10-15T13:59:00.000Z', uso(1000, 1000, 1000, 1000)),
    resposta('tarefa', '2026-10-15T14:15:00.000Z', uso(11, 2, 30, 4)),
    resposta('depois', '2026-10-15T15:01:00.000Z', uso(2000, 2000, 2000, 2000)),
  ])
  f.historico('sessao-longa/subagents/agente-1.jsonl', [
    resposta('agente-tarefa', '2026-10-15T14:30:00.000Z', uso(7, 3, 20, 6), 'modelo-agente'),
    resposta('agente-depois', '2026-10-15T16:00:00.000Z', uso(3000, 3000, 3000, 3000), 'modelo-agente'),
  ])
  const de = '2026-10-15T14:00:00.000Z'
  const ate = '2026-10-15T15:00:00.000Z'
  const r = f.json(['--de', de, '--ate', ate])
  assert.equal(r.sessoes.length, 1)
  assert.equal(r.sessoes[0].id, 'sessao-longa')
  assert.equal(r.sessoes[0].inicio, '2026-10-01T12:00:00.000Z')
  assert.deepEqual(r.sessoes[0].porModelo, {
    'modelo-principal': { respostas: 1, entrada: 11, cacheGravado: 2, cacheLido: 30, saida: 4 },
    'modelo-agente': { respostas: 1, entrada: 7, cacheGravado: 3, cacheLido: 20, saida: 6 },
  })
  assert.deepEqual(r.totais, { entrada: 23, cacheLido: 50, saida: 10 })
  assert.equal(r.filtros.de, de)
  assert.equal(r.filtros.ate, ate)
})

test('filtro por sessão inclui seus subagentes e exclui outras sessões', (t) => {
  const f = preparar(t)
  f.historico('sessao-alvo.jsonl', [
    usuario('2026-10-15T14:00:00.000Z'),
    resposta('alvo', '2026-10-15T14:01:00.000Z', uso(10, 2, 30, 4)),
  ])
  f.historico('sessao-alvo/subagents/agente.jsonl', [
    resposta('subagente', '2026-10-15T14:02:00.000Z', uso(5, 1, 7, 3), 'modelo-agente'),
  ])
  f.historico('outra-sessao.jsonl', [
    usuario('2026-10-15T14:00:00.000Z'),
    resposta('outra', '2026-10-15T14:01:00.000Z', uso(1000, 1000, 1000, 1000)),
  ])
  const r = f.json(['--sessao', 'sessao-alvo'])
  assert.deepEqual(r.sessoes.map((s) => s.id), ['sessao-alvo'])
  assert.deepEqual(r.totais, { entrada: 18, cacheLido: 37, saida: 7 })
  assert.equal(r.filtros.sessao, 'sessao-alvo')
})

test('medição do projeto agrega sessões registradas em worktrees', (t) => {
  const f = preparar(t)
  f.historico('principal.jsonl', [
    usuario('2026-10-15T14:00:00.000Z'),
    resposta('principal', '2026-10-15T14:01:00.000Z', uso(10, 2, 30, 4)),
  ])
  f.historico('na-worktree.jsonl', [
    usuario('2026-10-15T15:00:00.000Z'),
    resposta('worktree', '2026-10-15T15:01:00.000Z', uso(5, 1, 7, 3)),
  ], '--claude-worktrees-piloto')
  const r = f.json()
  assert.deepEqual(r.sessoes.map((s) => s.id), ['principal', 'na-worktree'])
  assert.deepEqual(r.totais, { entrada: 18, cacheLido: 37, saida: 7 })
})

test('histórico compartilhado aparece nas sessões sem dobrar o total geral', (t) => {
  const f = preparar(t)
  const compartilhada = resposta('id-compartilhado', '2026-10-15T14:01:00.000Z', uso(100, 20, 300, 40))
  const zerada = resposta('id-compartilhado', '2026-10-15T14:01:00.000Z', uso(0, 0, 0, 0))
  f.historico('sessao-original.jsonl', [usuario('2026-10-15T14:00:00.000Z'), compartilhada, zerada])
  f.historico('sessao-copiada.jsonl', [usuario('2026-10-15T15:00:00.000Z'), compartilhada])
  const r = f.json()
  const esperado = { entrada: 120, cacheLido: 300, saida: 40 }
  assert.equal(r.sessoes.length, 2)
  assert.deepEqual(r.totais, esperado)
  assert.equal(r.mensagensUnicas, 1)
  for (const s of r.sessoes) {
    assert.deepEqual(s.totais, esperado)
    assert.equal(s.porModelo['modelo-principal'].respostas, 1)
    assert.equal(s.mensagensCompartilhadas, 1)
    assert.equal(s.arquivos.length, 1)
    assert.ok(path.isAbsolute(s.arquivos[0]))
    assert.equal(path.basename(s.arquivos[0]), `${s.id}.jsonl`)
  }
})

test('todos deduplica respostas compartilhadas entre pastas de projetos distintos', (t) => {
  const f = preparar(t)
  const compartilhada = resposta('id-entre-projetos', '2026-10-15T14:01:00.000Z', uso(100, 20, 300, 40))
  f.historico('sessao-a.jsonl', [usuario('2026-10-15T14:00:00.000Z'), compartilhada])
  f.historico('sessao-b.jsonl', [usuario('2026-10-15T15:00:00.000Z'), compartilhada], '-outro-projeto')
  const r = f.json([], true)
  const esperado = { entrada: 120, cacheLido: 300, saida: 40 }
  assert.equal(r.projetos.length, 2)
  assert.deepEqual(r.totais, esperado)
  assert.equal(r.mensagensUnicas, 1)
  for (const p of r.projetos) assert.deepEqual(p.totais, esperado)
})

test('datas inválidas ou opções sem valor retornam erro de uso', (t) => {
  const f = preparar(t)
  for (const args of [
    ['--de', 'hoje'], ['--ate', 'amanha'],
    ['--de', '2026-13-15T00:00:00.000Z'], ['--ate', '2026-10-32T00:00:00.000Z'],
    ['--de', '2026-02-30T00:00:00.000Z'], ['--ate', '2025-02-29T00:00:00.000Z'],
    ['--de'], ['--ate'], ['--sessao'],
  ]) {
    const r = f.executar(args)
    assert.equal(r.status, 1, `${args.join(' ')}: ${r.saida}`)
  }
  const bissexto = f.json(['--de', '2024-02-29T00:00:00.000Z', '--ate', '2024-02-29T23:59:59.000Z'])
  assert.deepEqual(bissexto.sessoes, [])
  assert.deepEqual(bissexto.totais, zero)
})

test('dias exige número positivo e valor informado', (t) => {
  const f = preparar(t)
  for (const args of [['--dias', '0'], ['--dias', '-2'], ['--dias', 'abc'], ['--dias', 'NaN'], ['--dias']]) {
    const r = f.executar(args)
    assert.equal(r.status, 1, `${args.join(' ')}: ${r.saida}`)
  }
})

test('JSON sem histórico retorna coleção vazia e totais zerados', (t) => {
  const f = preparar(t)
  const r = f.json()
  assert.deepEqual(r.sessoes, [])
  assert.deepEqual(r.totais, zero)
  assert.deepEqual(r.filtros, { sessao: null, de: null, ate: null, dias: null })
})

test('todos funciona quando a configuração ainda não tem pasta de histórico', (t) => {
  const f = preparar(t)
  const r = f.json([], true)
  assert.deepEqual(r.projetos, [])
  assert.deepEqual(r.totais, zero)
})

test('separa conversa principal de agente chamado e mede o contexto por resposta', (t) => {
  const f = preparar(t)
  f.historico('s1.jsonl', [usuario('2026-10-10T10:00:00Z'), resposta('p1', '2026-10-10T10:00:01Z', uso(10, 0, 990, 5)),
    resposta('p2', '2026-10-10T10:00:02Z', uso(0, 0, 3000, 5))])
  f.historico(path.join('s1', 'subagents', 'agent-a.jsonl'), [resposta('a1', '2026-10-10T10:00:03Z', uso(100, 400, 0, 9), 'modelo-leve')])
  const r = f.json()
  assert.deepEqual(r.porOrigem.principal, { respostas: 2, contexto: 4000, saida: 10, contextoPorResposta: 2000 })
  assert.deepEqual(r.porOrigem.agente, { respostas: 1, contexto: 500, saida: 9, contextoPorResposta: 500 })
})

test('mede o texto que cada ferramenta traz, conta imagem à parte e não repete resultado copiado', (t) => {
  const f = preparar(t)
  const chamada = (id, name) => ({ type: 'assistant', timestamp: '2026-10-10T10:00:01Z', message: { content: [{ type: 'tool_use', id, name, input: {} }] } })
  const retorno = (id, content) => ({ type: 'user', timestamp: '2026-10-10T10:00:02Z', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] } })
  const linhas = [usuario('2026-10-10T10:00:00Z'), chamada('t1', 'Read'), retorno('t1', 'x'.repeat(400)),
    chamada('t2', 'Bash'), retorno('t2', [{ type: 'text', text: 'y'.repeat(40) }, { type: 'image', source: { data: 'z'.repeat(9999) } }]),
    resposta('m1', '2026-10-10T10:00:03Z', uso(1, 0, 0, 1))]
  f.historico('s1.jsonl', linhas)
  f.historico('s2.jsonl', linhas) // sessão retomada copia o mesmo histórico
  const r = f.json()
  assert.deepEqual(r.porFerramenta.Read, { chamadas: 1, caracteres: 400, imagens: 0, tokensAprox: 100 })
  assert.deepEqual(r.porFerramenta.Bash, { chamadas: 1, caracteres: 40, imagens: 1, tokensAprox: 10 })
  assert.deepEqual(Object.keys(r.porFerramenta), ['Read', 'Bash'])
})

test('acha o nome da ferramenta em outro arquivo e mantém sessão que só tem retorno de ferramenta no período', (t) => {
  const f = preparar(t)
  f.historico('a.jsonl', [{ type: 'user', timestamp: '2026-10-10T12:00:00Z', message: { content: [{ type: 'tool_result', tool_use_id: 'x1', content: 'abcd'.repeat(10) }] } }])
  f.historico('b.jsonl', [{ type: 'assistant', timestamp: '2026-10-09T09:00:00Z', message: { content: [{ type: 'tool_use', id: 'x1', name: 'Grep', input: {} }] } },
    resposta('m9', '2026-10-09T09:00:01Z', uso(1, 0, 0, 1))])
  const r = f.json(['--de', '2026-10-10T00:00:00Z'])
  assert.deepEqual(r.porFerramenta.Grep, { chamadas: 1, caracteres: 40, imagens: 0, tokensAprox: 10 })
  assert.equal(r.sessoes.length, 1)
})

test('texto mostra respostas e contexto por resposta de cada modelo, do mais usado ao menos', (t) => {
  const f = preparar(t)
  f.historico('s1.jsonl', [usuario('2026-10-10T10:00:00Z'), resposta('p1', '2026-10-10T10:00:01Z', uso(10, 0, 1990, 5)),
    resposta('p2', '2026-10-10T10:00:02Z', uso(0, 0, 4000, 5))])
  f.historico(path.join('s1', 'subagents', 'agent-a.jsonl'), [resposta('a1', '2026-10-10T10:00:03Z', uso(100, 400, 0, 9), 'modelo-leve')])
  const r = f.executar([])
  assert.equal(r.status, 0, r.saida)
  assert.match(r.saida, /por modelo: modelo-principal 2 respostas \(3\.0 mil por resposta\) · modelo-leve 1 respostas \(500 por resposta\)/)
})
