import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { auditarEnsaio } from '../lib/qualidade-ensaio.mjs'
import { configuracaoEnsaio, arquivosCongelados } from '../lib/tarefas-ensaio.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const temporarios = path.join(raiz, 'pilotos/testes-temporarios')
const gravar = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2))
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex')
function fixture(t, tipo) {
  fs.mkdirSync(temporarios, { recursive: true })
  const dir = fs.mkdtempSync(path.join(temporarios, 'ensaio-'))
  t.after(() => {
    const real = fs.realpathSync(dir), rel = path.relative(fs.realpathSync(temporarios), real)
    assert(rel && !rel.startsWith('..') && !path.isAbsolute(rel))
    fs.rmSync(real, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  })
  const settings = path.join(dir, 'settings.json')
  gravar(settings, { enabledPlugins: { 'devagents-core@devagents': false } })
  const plano = { ...(tipo === undefined ? {} : { tipo }), modelo: 'opus', node: 'v24.0.0', versaoCLI: 'teste', permissoes: 'bypassPermissions', settings, settingsHash: hash(settings), perfis: {}, jobs: [] }
  const { tarefas, repeticoes } = configuracaoEnsaio(tipo)
  for (const grupo of ['base', 'depois']) {
    const plugin = path.join(dir, grupo), manifesto = path.join(plugin, '.claude-plugin/plugin.json')
    fs.mkdirSync(path.dirname(manifesto), { recursive: true })
    const versao = grupo === 'base' ? '0.1.4' : '0.1.20'
    gravar(manifesto, { name: 'devagents-core', version: versao })
    plano.perfis[grupo] = { plugin, versao, hashes: { '.claude-plugin/plugin.json': hash(manifesto) } }
  }
  for (let r = 1; r <= repeticoes; r++) for (const [tarefa, testes] of Object.entries(tarefas).sort(([a], [b]) => a.localeCompare(b))) for (const grupo of ['base', 'depois']) {
    const pasta = path.join(dir, 'job-' + plano.jobs.length); fs.mkdirSync(pasta)
    const hashesMatriz = {}
    const arquivos = ['pedido.md', 'pronto-quando.md', 'package.json', 'inicial.test.mjs', 'aceitacao.test.mjs']
    if (tarefa === '04-catalogo-integrado') arquivos.push('auditar.mjs', 'src/grafo.mjs', 'dados/catalogo/nucleo.json', 'dados/catalogo/apoio.json', 'referencias/contrato.json', 'revisar.mjs')
    for (const n of arquivos) {
      fs.mkdirSync(path.dirname(path.join(pasta, n)), { recursive: true })
      fs.writeFileSync(path.join(pasta, n), tarefa + '/' + n); hashesMatriz[n] = hash(path.join(pasta, n))
    }
    const arquivoTestes = path.join(pasta, 'testes.log'), evidencia = path.join(pasta, 'qa.txt')
    fs.writeFileSync(arquivoTestes, `# tests ${testes}\n# pass ${testes}\n# fail 0\n# cancelled 0\n# skipped 0\n`)
    fs.writeFileSync(evidencia, 'Evidência fictícia do teste do auditor; não é uma execução de modelo.')
    const arquivoRevisao = path.join(pasta, 'revisao.json'), criterios = {}
    for (const c of ['criteriosFixos', 'entradasInvalidas', 'dependenciasEDados', 'visual390e1280', 'teclado', 'movimentoReduzido', 'semJavaScript', 'preservacaoEntradaSaida', 'httpReal', 'senhaNaoPersistida', 'grafoDeterministico', 'preservacaoManifestosESaida']) criterios[c] = { aprovado: true, evidencia }
    gravar(arquivoRevisao, { aprovada: true, pendencias: [], criterios })
    const sessao = 'sessao-' + plano.jobs.length, inicio = '2026-10-20T12:00:00Z', primeiraEntrega = '2026-10-20T12:01:00Z', fim = '2026-10-20T12:02:00Z'
    const arquivoMedicao = path.join(pasta, 'medicao.json')
    gravar(arquivoMedicao, { filtros: { sessao, de: inicio, ate: fim }, sessoes: [{ id: sessao }], mensagensUnicas: 1,
      totais: { entrada: 30, cacheLido: 40, saida: 50 }, porOrigem: { principal: { respostas: 1, contexto: 70, saida: 50 } },
      porModelo: { 'claude-opus-5': { respostas: 1, entrada: 10, cacheGravado: 20, cacheLido: 40, saida: 50 } } })
    plano.jobs.push({ tarefa, grupo, repeticao: r, pasta, hashesMatriz, sessao, estado: 'concluida', inicio, primeiraEntrega, fim,
      codigoCLI: 0, codigoTestes: 0, nucleoConfirmado: true, congeladosPreservados: true, modeloPrincipal: 'claude-opus-5',
      ambiente: { node: plano.node, cli: plano.versaoCLI, permissoes: plano.permissoes, settingsHash: plano.settingsHash },
      plugins: [{ name: 'devagents-core', source: 'devagents-core@inline', version: plano.perfis[grupo].versao, path: plano.perfis[grupo].plugin },
        { name: 'superpowers', source: 'superpowers@oficial', version: '7.0.0' }], correcoes: [], arquivoTestes, arquivoRevisao, arquivoMedicao })
  }
  const arquivo = path.join(dir, 'plano.json'); gravar(arquivo, plano)
  return { dir, plano, arquivo, salvar: () => gravar(arquivo, plano) }
}
const editar = (f, fn) => { const x = JSON.parse(fs.readFileSync(f, 'utf8')); fn(x); gravar(f, x) }
function correcaoComInit(f) {
  const plugin = path.join(f.dir, 'apoio-superpowers'), manifesto = path.join(plugin, '.claude-plugin/plugin.json')
  fs.mkdirSync(path.dirname(manifesto), { recursive: true }); gravar(manifesto, { name: 'superpowers', version: '7.0.0' })
  f.plano.apoios = { superpowers: { plugin, versao: '7.0.0', hashes: { '.claude-plugin/plugin.json': hash(manifesto) } } }
  for (const j of f.plano.jobs) {
    j.pluginApoios = ['superpowers']; j.apoiosConfirmados = true
    j.plugins[1].source = 'superpowers@inline'; j.plugins[1].path = plugin
  }
  const j = f.plano.jobs[0], c = { pedido: 'Corrija o contrato preservando a matriz.', em: '2026-10-20T12:01:10Z', fim: '2026-10-20T12:01:30Z', codigoCLI: 0,
    modeloPrincipal: j.modeloPrincipal, plugins: structuredClone(j.plugins), nucleoConfirmado: true, apoiosConfirmados: true, arquivoCLI: path.join(j.pasta, 'correcao-cli.jsonl') }
  j.correcoes.push(c)
  const salvarCLI = eventos => fs.writeFileSync(c.arquivoCLI, eventos.map(e => JSON.stringify(e)).join('\n'))
  salvarCLI([{ type: 'system', subtype: 'init', session_id: j.sessao, model: c.modeloPrincipal, plugins: structuredClone(c.plugins) }, { type: 'result', is_error: false }])
  return { j, c, salvarCLI }
}

test('aprova somente as 18 execuções com evidências e não altera os artefatos', t => {
  const f = fixture(t), antes = hash(f.arquivo)
  assert.equal(auditarEnsaio(f.arquivo).estado, 'aprovado')
  assert.equal(hash(f.arquivo), antes)
  f.plano.jobs[1].hashesMatriz = Object.fromEntries(Object.entries(f.plano.jobs[1].hashesMatriz).reverse()); f.salvar()
  assert.equal(auditarEnsaio(f.arquivo).estado, 'aprovado', 'ordem das chaves não muda a matriz')
})

test('descritor mantém mínimos legados e separa o tipo integrado com três repetições', () => {
  const legado = configuracaoEnsaio(), integrado = configuracaoEnsaio('ensaio-integrado-v1')
  assert.deepEqual(legado, configuracaoEnsaio('ensaio-controlado-v1'))
  assert.deepEqual(legado.tarefas, { '03-script-automacao': 6, '02-endpoint-api': 7, '01-secao-lp': 5 })
  assert.deepEqual(integrado.tarefas, { '04-catalogo-integrado': 54 })
  assert.equal(legado.repeticoes, 3); assert.equal(integrado.repeticoes, 3)
  assert.deepEqual(integrado.criteriosExtras['04-catalogo-integrado'], ['grafoDeterministico', 'preservacaoManifestosESaida'])
  for (const tipo of ['outro', null, 6]) assert.throws(() => configuracaoEnsaio(tipo), /Tipo de ensaio desconhecido/)
})

test('congelamento integrado inclui dados e contratos e libera só auditar.mjs e src/', () => {
  const hashes = Object.fromEntries(['pedido.md', 'pronto-quando.md', 'package.json', 'inicial.test.mjs', 'aceitacao.test.mjs',
    'auditar.mjs', 'src\\grafo.mjs', 'dados\\catalogo\\nucleo.json', 'referencias/contrato.json', 'outro.mjs'].map(n => [n, 'hash']))
  assert.deepEqual(arquivosCongelados('04-catalogo-integrado', hashes), ['pedido.md', 'pronto-quando.md', 'package.json',
    'inicial.test.mjs', 'aceitacao.test.mjs', 'dados/catalogo/nucleo.json', 'referencias/contrato.json', 'outro.mjs'])
  assert.deepEqual(arquivosCongelados('03-script-automacao', { ...hashes, 'servir.mjs': 'hash', 'vendas.csv': 'hash' }),
    ['pedido.md', 'pronto-quando.md', 'package.json', 'inicial.test.mjs', 'aceitacao.test.mjs', 'servir.mjs', 'vendas.csv'])
  assert.throws(() => arquivosCongelados('desconhecida', {}), /desconhecida/)
  assert.throws(() => arquivosCongelados('04-catalogo-integrado', { 'src/../dados/catalogo/a.json': 'hash' }), /Caminhos da matriz/)
  assert.throws(() => arquivosCongelados('04-catalogo-integrado', { 'src/a.mjs': 'a', 'src\\a.mjs': 'b' }), /duplicados/)
})

test('aprova seis execuções integradas somente com tipo explícito e conserva todos os artefatos', t => {
  const f = fixture(t, 'ensaio-integrado-v1')
  const inventario = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? inventario(path.join(dir, e.name)) : [[path.relative(f.dir, path.join(dir, e.name)), hash(path.join(dir, e.name))]])
  const antes = inventario(f.dir), r = auditarEnsaio(f.arquivo)
  assert.equal(r.estado, 'aprovado', JSON.stringify(r)); assert.equal(r.total, 6); assert.equal(r.concluidas, 6)
  assert.deepEqual(inventario(f.dir), antes)
  for (const j of f.plano.jobs) {
    fs.appendFileSync(path.join(j.pasta, 'auditar.mjs'), '\n// implementação')
    fs.appendFileSync(path.join(j.pasta, 'src/grafo.mjs'), '\n// implementação')
  }
  f.plano.jobs[0].hashesMatriz = Object.fromEntries(Object.entries(f.plano.jobs[0].hashesMatriz).map(([n, h]) => [n.replaceAll('/', '\\'), h]))
  f.salvar()
  assert.equal(auditarEnsaio(f.arquivo).estado, 'aprovado', 'código editável e separadores equivalentes são aceitos')
})

test('ensaio integrado bloqueia mistura, contagem, dados e evidências inválidas', async t => {
  const casos = [
    ['seis jobs sem tipo explícito', f => { delete f.plano.tipo }],
    ['tipo desconhecido', f => { f.plano.tipo = 'ensaio-qualquer' }],
    ['tarefa curta misturada', f => { f.plano.jobs[0].tarefa = '03-script-automacao' }],
    ['falta uma execução', f => { f.plano.jobs.pop() }],
    ['dezoito jobs no tipo integrado', f => { f.plano.jobs.push(...structuredClone(f.plano.jobs), ...structuredClone(f.plano.jobs)) }],
    ['combinação duplicada', f => { f.plano.jobs[1].grupo = 'base' }],
    ['menos que os 54 testes fornecidos', f => fs.writeFileSync(f.plano.jobs[0].arquivoTestes, '# pass 53\n# fail 0\n')],
    ['falha de algoritmo no log', f => fs.appendFileSync(f.plano.jobs[0].arquivoTestes, '# fail 1\n')],
    ['grafo reprovado', f => editar(f.plano.jobs[0].arquivoRevisao, x => { x.criterios.grafoDeterministico.aprovado = false })],
    ['grafo sem evidência', f => editar(f.plano.jobs[0].arquivoRevisao, x => { delete x.criterios.grafoDeterministico.evidencia })],
    ['preservação sem aprovação', f => editar(f.plano.jobs[0].arquivoRevisao, x => { x.criterios.preservacaoManifestosESaida.aprovado = false })],
    ['preservação sem artefato', f => editar(f.plano.jobs[0].arquivoRevisao, x => { x.criterios.preservacaoManifestosESaida.evidencia = path.join(f.dir, 'ausente.txt') })],
    ['critério comum ausente', f => editar(f.plano.jobs[0].arquivoRevisao, x => { delete x.criterios.entradasInvalidas })],
    ['manifesto alterado', f => fs.appendFileSync(path.join(f.plano.jobs[0].pasta, 'dados/catalogo/nucleo.json'), 'alterado')],
    ['manifestos não declarados', f => { for (const j of f.plano.jobs) for (const n of Object.keys(j.hashesMatriz)) if (n.startsWith('dados/catalogo/')) delete j.hashesMatriz[n] }],
    ['arquivo-base não declarado', f => { delete f.plano.jobs[0].hashesMatriz['pedido.md'] }],
    ['contrato adicional alterado', f => fs.appendFileSync(path.join(f.plano.jobs[0].pasta, 'referencias/contrato.json'), 'alterado')],
    ['revisor alterado', f => fs.appendFileSync(path.join(f.plano.jobs[0].pasta, 'revisar.mjs'), 'alterado')],
    ['evidência fora do lote', f => editar(f.plano.jobs[0].arquivoRevisao, x => { x.criterios.grafoDeterministico.evidencia = path.join(raiz, 'README.md') })],
    ['principal rebaixada', f => { f.plano.jobs[0].modeloPrincipal = 'claude-sonnet-5' }],
    ['ambiente divergente', f => { f.plano.jobs[0].ambiente.cli = 'outra' }],
    ['apoio divergente no par', f => { f.plano.jobs[1].plugins[1].version = '8.0.0' }],
    ['medição vazia', f => editar(f.plano.jobs[0].arquivoMedicao, x => { x.mensagensUnicas = 0 })],
    ['correção falhou', f => { f.plano.jobs[0].correcoes = [{ pedido: 'corrigir', em: '2026-10-20T12:01:00Z', codigoCLI: 1 }] }],
  ]
  for (const [nome, mudar] of casos) await t.test(nome, tt => {
    const f = fixture(tt, 'ensaio-integrado-v1'); mudar(f); f.salvar()
    const r = auditarEnsaio(f.arquivo)
    assert.equal(r.estado, 'reprovado', JSON.stringify(r)); assert(r.problemas.length > 0)
  })
})

test('tipo legado explícito aprova 18 jobs e recusa a tarefa integrada', t => {
  const f = fixture(t, 'ensaio-controlado-v1')
  assert.equal(auditarEnsaio(f.arquivo).estado, 'aprovado')
  f.plano.jobs[0].tarefa = '04-catalogo-integrado'; f.salvar()
  const r = auditarEnsaio(f.arquivo)
  assert.equal(r.estado, 'reprovado'); assert(r.problemas.some(p => /tarefa, grupo ou repetição inválidos/.test(p)))
})

test('rodadas preparadas permanecem incompletas; CLI retorna 2 sem calcular economia', t => {
  const f = fixture(t); f.plano.jobs.forEach(j => { j.estado = 'preparada' }); f.salvar()
  const r = auditarEnsaio(f.arquivo)
  assert.equal(r.estado, 'incompleto'); assert.equal(r.pendentes.length, 18); assert.equal(r.concluidas, 0)
  const cli = spawnSync(process.execPath, [path.join(raiz, 'scripts/auditar-ensaio.mjs'), f.arquivo, '--json'], { encoding: 'utf8' })
  assert.equal(cli.status, 2); assert.equal(JSON.parse(cli.stdout).estado, 'incompleto')
})

test('recusa falsa aprovação, ambiente divergente e medições incompletas', async t => {
  const casos = [
    ['429', f => { f.plano.jobs[0].estado = 'interrompida'; f.plano.jobs[0].codigoCLI = 1 }],
    ['sessão repetida entre grupos', f => { f.plano.jobs[1].sessao = f.plano.jobs[0].sessao }],
    ['matriz alterada após a entrega', f => fs.appendFileSync(path.join(f.plano.jobs[0].pasta, 'aceitacao.test.mjs'), 'alterado')],
    ['snapshot alterado', f => fs.appendFileSync(path.join(f.plano.perfis.depois.plugin, '.claude-plugin/plugin.json'), ' ')],
    ['arquivo novo no snapshot', f => fs.writeFileSync(path.join(f.plano.perfis.depois.plugin, 'instrucao-nova.md'), 'alterado')],
    ['settings alterados', f => fs.appendFileSync(f.plano.settings, ' ')],
    ['versão da CLI mudou', f => { f.plano.jobs[0].ambiente.cli = 'outra' }],
    ['principal rebaixada', f => { f.plano.jobs[0].modeloPrincipal = 'claude-sonnet-5' }],
    ['plugin extra diferente no par', f => { f.plano.jobs[1].plugins[1].version = '8.0.0' }],
    ['dois núcleos', f => { f.plano.jobs[0].plugins.push({ ...f.plano.jobs[0].plugins[0] }) }],
    ['inventário malformado', f => { f.plano.jobs[0].plugins.push(null) }],
    ['revisão com pendência', f => editar(f.plano.jobs[0].arquivoRevisao, x => x.pendencias.push('corte no celular'))],
    ['visual sem artefato', f => editar(f.plano.jobs[0].arquivoRevisao, x => { delete x.criterios.visual390e1280.evidencia })],
    ['testes pulados', f => fs.appendFileSync(f.plano.jobs[0].arquivoTestes, '# skipped 1\n')],
    ['log mistura falha e sucesso', f => fs.appendFileSync(f.plano.jobs[0].arquivoTestes, '# fail 1\n')],
    ['período exclui correção', f => editar(f.plano.jobs[0].arquivoMedicao, x => { x.filtros.ate = '2026-10-20T12:01:00Z' })],
    ['correção termina após a medição', f => { f.plano.jobs[0].correcoes = [{ pedido: 'corrigir', em: '2026-10-20T12:01:00Z', fim: '2026-10-20T12:03:00Z', codigoCLI: 0 }] }],
    ['correção termina antes de começar', f => { f.plano.jobs[0].correcoes = [{ pedido: 'corrigir', em: '2026-10-20T12:01:30Z', fim: '2026-10-20T12:01:00Z', codigoCLI: 0 }] }],
    ['término da correção inválido', f => { f.plano.jobs[0].correcoes = [{ pedido: 'corrigir', em: '2026-10-20T12:01:00Z', fim: 'inválido', codigoCLI: 0 }] }],
    ['correção falhou no CLI', f => { f.plano.jobs[0].correcoes = [{ pedido: 'corrigir', em: '2026-10-20T12:01:00Z', fim: '2026-10-20T12:01:30Z', codigoCLI: 1 }] }],
    ['medição vazia', f => editar(f.plano.jobs[0].arquivoMedicao, x => { x.mensagensUnicas = 0 })],
    ['agentes omitidos dos totais', f => editar(f.plano.jobs[0].arquivoMedicao, x => { x.porModelo['claude-haiku-5-5'] = { respostas: 1, entrada: 1, cacheGravado: 1, cacheLido: 1, saida: 1 } })],
    ['origem omite uso incluído por modelo', f => editar(f.plano.jobs[0].arquivoMedicao, x => { x.porOrigem.principal.contexto = 1 })],
    ['evidência fora do lote', f => editar(f.plano.jobs[0].arquivoRevisao, x => { x.criterios.teclado.evidencia = path.join(raiz, 'README.md') })],
    ['registro nulo', f => { f.plano.jobs[0] = null }],
    ['grupo/repetição duplicados', f => { f.plano.jobs[1].grupo = 'base' }],
  ]
  for (const [nome, mudar] of casos) await t.test(nome, tt => {
    const f = fixture(tt); mudar(f); f.salvar()
    const r = auditarEnsaio(f.arquivo)
    assert.equal(r.estado, 'reprovado', JSON.stringify(r)); assert(r.problemas.length > 0)
  })
})

test('aceita correções antigas sem término e registros completos dentro da medição', t => {
  const f = fixture(t), j = f.plano.jobs[0]
  j.correcoes = [{ pedido: 'pedido antigo', em: '2026-10-20T12:01:00Z' }]
  f.salvar(); assert.equal(auditarEnsaio(f.arquivo).estado, 'aprovado')
  j.correcoes.push({ pedido: 'pedido completo', em: '2026-10-20T12:01:15Z', fim: '2026-10-20T12:01:30Z', codigoCLI: 0 })
  f.salvar(); assert.equal(auditarEnsaio(f.arquivo).estado, 'aprovado')
})

test('aprova correção nova somente com inventário completo e init real correspondente', t => {
  const f = fixture(t), { c } = correcaoComInit(f)
  c.arquivoCLI = path.relative(f.dir, c.arquivoCLI)
  f.salvar(); assert.equal(auditarEnsaio(f.arquivo).estado, 'aprovado')
})

test('recusa inventário divergente, registro parcial e init ausente ou diferente na correção', async t => {
  const casos = [
    ['principal diferente mesmo sendo Opus', (_f, x) => { x.c.modeloPrincipal = 'claude-opus-6' }],
    ['principal rebaixada', (_f, x) => { x.c.modeloPrincipal = 'claude-sonnet-5' }],
    ['núcleo não confirmado', (_f, x) => { x.c.nucleoConfirmado = false }],
    ['apoios não confirmados', (_f, x) => { x.c.apoiosConfirmados = false }],
    ['núcleo duplicado', (_f, x) => { x.c.plugins.push({ ...x.c.plugins[0] }) }],
    ['versão do núcleo', (_f, x) => { x.c.plugins[0].version = '9.0.0' }],
    ['caminho do núcleo', (f, x) => { x.c.plugins[0].path = f.plano.perfis.depois.plugin }],
    ['origem do núcleo', (_f, x) => { x.c.plugins[0].source = 'devagents-core@devagents' }],
    ['apoio extra', (_f, x) => { x.c.plugins.push({ ...x.c.plugins[1], name: 'extra' }) }],
    ['apoio ausente', (_f, x) => { x.c.plugins.pop() }],
    ['versão do apoio', (_f, x) => { x.c.plugins[1].version = '8.0.0' }],
    ['caminho do apoio', (f, x) => { x.c.plugins[1].path = f.plano.perfis.base.plugin }],
    ['origem do apoio', (_f, x) => { x.c.plugins[1].source = 'superpowers@oficial' }],
    ['registro não objeto', (_f, x) => { x.c.plugins.push(null) }],
    ['CLI sem init', (_f, x) => x.salvarCLI([{ type: 'result', is_error: false }])],
    ['CLI com dois init', (_f, x) => x.salvarCLI(Array.from({ length: 2 }, () => ({ type: 'system', subtype: 'init', session_id: x.j.sessao, model: x.c.modeloPrincipal, plugins: x.c.plugins })))],
    ['modelo real difere do registro', (_f, x) => x.salvarCLI([{ type: 'system', subtype: 'init', session_id: x.j.sessao, model: 'claude-sonnet-5', plugins: x.c.plugins }])],
    ['plugins reais diferem do registro', (_f, x) => x.salvarCLI([{ type: 'system', subtype: 'init', session_id: x.j.sessao, model: x.c.modeloPrincipal, plugins: x.c.plugins.slice(0, 1) }])],
    ['sessão real difere da execução', (_f, x) => x.salvarCLI([{ type: 'system', subtype: 'init', session_id: 'outra-sessao', model: x.c.modeloPrincipal, plugins: x.c.plugins }])],
    ['CLI fora do lote', (_f, x) => { x.c.arquivoCLI = path.join(raiz, 'README.md') }],
    ['CLI ausente', (_f, x) => { fs.unlinkSync(x.c.arquivoCLI) }],
    ...['modeloPrincipal', 'plugins', 'nucleoConfirmado', 'apoiosConfirmados', 'arquivoCLI', 'fim', 'codigoCLI'].map(k => ['campo parcial: ' + k, (_f, x) => { delete x.c[k] }]),
  ]
  for (const [nome, mudar] of casos) await t.test(nome, tt => {
    const f = fixture(tt), x = correcaoComInit(f); mudar(f, x); f.salvar()
    const r = auditarEnsaio(f.arquivo)
    assert.equal(r.estado, 'reprovado', JSON.stringify(r)); assert(r.problemas.some(p => /correção|Evidência fora|ENOENT/.test(p)), JSON.stringify(r))
  })
})

// O piloto é um artefato local ignorado; sua simulação não chama CLI nem escreve nos lotes reais.
const piloto = path.join(raiz, 'pilotos/medicoes/execucoes/ensaio-controlado.mjs')
function pilotoVirtual(estado, correcoes = [], falhar = () => {}, eventosCLI = eventos => eventos) {
  const lote = path.join(path.dirname(piloto), 'virtual-apenas-em-memoria')
  const arquivo = path.join(lote, 'plano.json'), pasta = path.join(lote, '01-base-r1', '03-script-automacao'), dir = path.dirname(pasta)
  const arquivos = new Map(), normalizar = p => path.resolve(String(p))
  const existe = p => arquivos.has(normalizar(p)) || [...arquivos.keys()].some(n => n.startsWith(normalizar(p) + path.sep))
  const escrever = (p, s) => arquivos.set(normalizar(p), Buffer.from(s))
  const ler = p => { const b = arquivos.get(normalizar(p)); assert(b, 'Arquivo virtual ausente: ' + p); return b }
  const settings = path.join(lote, 'settings.json'); escrever(settings, '{}')
  const origem = path.join(raiz, 'pilotos/medicoes/tarefas/03-script-automacao')
  escrever(path.join(origem, 'pedido.md'), 'matriz congelada')
  escrever(path.join(pasta, 'pedido.md'), 'matriz congelada')
  escrever(path.join(pasta, 'relatorio.mjs'), 'entrega da tentativa original')
  const hashesMatriz = { 'pedido.md': createHash('sha256').update(ler(path.join(origem, 'pedido.md'))).digest('hex') }
  const perfil = (nome, versao) => {
    const plugin = path.join(lote, 'plugins', nome), manifesto = path.join(plugin, '.claude-plugin/plugin.json')
    escrever(manifesto, JSON.stringify({ name: nome === 'base' ? 'devagents-core' : nome, version: versao }))
    return { plugin, versao, hashes: { [path.join('.claude-plugin', 'plugin.json')]: createHash('sha256').update(ler(manifesto)).digest('hex') } }
  }
  const perfis = { base: perfil('base', '0.1.4') }, apoios = { superpowers: perfil('superpowers', '7.0.0') }
  const plugins = [{ name: 'devagents-core', source: 'devagents-core@inline', version: perfis.base.versao, path: perfis.base.plugin },
    { name: 'superpowers', source: 'superpowers@inline', version: apoios.superpowers.versao, path: apoios.superpowers.plugin }]
  const plano = { settings, settingsHash: createHash('sha256').update(ler(settings)).digest('hex'), cli: 'claude-virtual', modelo: 'opus', permissoes: 'bypassPermissions', perfis, apoios,
    jobs: [{ estado, pasta, tarefa: '03-script-automacao', grupo: 'base', repeticao: 1, sessao: 'sessao-virtual',
      inicio: '2026-10-20T12:00:00Z', primeiraEntrega: '2026-10-20T12:01:00Z', correcoes, hashesMatriz, motivo: '429 rate limit',
      modeloPrincipal: 'claude-opus-5', plugins, pluginApoios: ['superpowers'],
      argumentos: ['--model', 'opus', '--permission-mode', 'bypassPermissions', '--settings', settings, '--plugin-dir', perfis.base.plugin, '--plugin-dir', apoios.superpowers.plugin, '--session-id', 'sessao-virtual', '--output-format', 'stream-json'] }] }
  escrever(arquivo, JSON.stringify(plano))
  const revisao = path.join(dir, 'revisao.json')
  escrever(revisao, JSON.stringify({ aprovada: true, pendencias: [] }))
  escrever(path.join(dir, 'resultado-testes.log'), '# pass 6\n# fail 0\n')
  let chamadas = 0
  const fsVirtual = {
    realpathSync: normalizar,
    readFileSync: (p, encoding) => encoding ? ler(p).toString(encoding) : ler(p),
    writeFileSync: (p, s) => { falhar('write', normalizar(p)); escrever(p, s) },
    existsSync: existe,
    renameSync: (a, b) => {
      a = normalizar(a); b = normalizar(b); falhar('rename', a, b)
      if (arquivos.has(a)) { escrever(b, ler(a)); arquivos.delete(a); return }
      assert(existe(a), 'Diretório virtual ausente: ' + a); assert(!existe(b), 'Destino virtual já existe: ' + b)
      for (const [n, v] of [...arquivos]) if (n.startsWith(a + path.sep)) { escrever(b + n.slice(a.length), v); arquivos.delete(n) }
    },
    cpSync: (a, b) => {
      a = normalizar(a); b = normalizar(b)
      for (const [n, v] of [...arquivos]) if (n.startsWith(a + path.sep)) escrever(b + n.slice(a.length), v)
      falhar('copy', a, b)
    },
    readdirSync: d => {
      d = normalizar(d)
      const nomes = new Map()
      for (const n of arquivos.keys()) if (n.startsWith(d + path.sep)) {
        const rel = n.slice(d.length + 1), [name] = rel.split(path.sep), directory = rel.includes(path.sep)
        nomes.set(name, { name, isSymbolicLink: () => false, isDirectory: () => directory, isFile: () => !directory })
      }
      return [...nomes.values()]
    },
    rmSync: p => { p = normalizar(p); for (const n of [...arquivos.keys()]) if (n === p || n.startsWith(p + path.sep)) arquivos.delete(n) },
    unlinkSync: p => arquivos.delete(normalizar(p)),
  }
  const source = fs.readFileSync(piloto, 'utf8').replace(/^import .*$/gm, '')
    .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(piloto).href))
  const executar = (modo, extra = []) => vm.runInNewContext(source, { fs: fsVirtual, path, assert, fileURLToPath, createHash, configuracaoEnsaio, arquivosCongelados,
    randomUUID: () => 'uuid-virtual', structuredClone, console: { log() {} },
    process: { env: { APPDATA: path.join(lote, 'appdata') }, execPath: process.execPath, argv: ['node', piloto, modo, arquivo, ...extra] },
    spawnSync: (_cmd, args) => {
      chamadas++
      if (args.includes('--test')) return { status: 0, stdout: '# pass 6\n# fail 0\n', stderr: '' }
      if (args.includes('--json')) return { status: 0, stdout: '{}', stderr: '' }
      const eventos = [{ type: 'system', subtype: 'init', session_id: 'sessao-virtual', model: 'claude-opus-5', plugins: structuredClone(plugins) }, { type: 'result', is_error: false, modelUsage: {} }]
      return { status: 0, stdout: eventosCLI(eventos).map(e => JSON.stringify(e)).join('\n'), stderr: '' }
    } })
  return { executar, escrever, ler, existe, dir, revisao, arquivo, arquivos, chamadas: () => chamadas,
    plano: () => JSON.parse(ler(arquivo)), job: () => JSON.parse(ler(arquivo)).jobs[0] }
}

test('piloto permite corrigir falha de critério e exige revisão nova antes do fechamento', { skip: !fs.existsSync(piloto) }, () => {
  const f = pilotoVirtual('falhou-criterio'), pedido = path.join(f.dir, 'pedido.txt')
  f.escrever(pedido, 'Corrija o critério sem alterar os testes congelados.')
  f.executar('--corrigir', [pedido])
  assert.equal(f.job().estado, 'aguarda-revisao-fixa')
  assert.equal(f.job().correcoes.length, 1)
  assert.match(f.ler(path.join(f.dir, 'revisao-pre-correcao-1.json')).toString(), /"aprovada":true/)
  assert.throws(() => f.executar('--fechar'), /Arquivo virtual ausente: .*revisao\.json/)
  f.escrever(f.revisao, JSON.stringify({ aprovada: true, pendencias: [] }))
  f.executar('--fechar')
  assert.equal(f.job().estado, 'concluida')
  assert.equal(path.basename(f.job().arquivoTestes), 'resultado-testes-pos-correcao-1.log')
})

test('reabre reprovação nova preservando sessão, medição e fechamento, sem chamar modelo', { skip: !fs.existsSync(piloto) }, () => {
  const f=pilotoVirtual('aguarda-revisao-fixa'); f.executar('--fechar')
  const anterior=f.job(), evidencia=path.join(f.dir,'revisao-fixa.log')
  f.escrever(evidencia,'Reprodução independente: precedência de EACCES incorreta.')
  f.escrever(f.revisao,JSON.stringify({aprovada:false,pendencias:['entradasInvalidas'],criterios:{entradasInvalidas:{aprovado:false,evidencia}}}))
  const chamadas=f.chamadas();f.executar('--reabrir',['1'])
  assert.equal(f.chamadas(),chamadas);assert.equal(f.job().estado,'aguarda-revisao-fixa')
  assert.equal(f.job().sessao,anterior.sessao);assert.equal(f.job().inicio,anterior.inicio)
  const guardado=JSON.parse(f.ler(path.join(f.dir,'fechamento-pre-reabertura-1.json')))
  assert.deepEqual(guardado.job,anterior);assert.deepEqual(guardado.medicao,{})
  assert.equal(f.job().reaberturas.length,1)
  assert.throws(()=>f.executar('--fechar'),/Revisão não aprovada/)
})

test('reabertura recusa aprovação, evidência externa e número inválido sem alterar plano', { skip: !fs.existsSync(piloto) }, async t => {
  for(const tipo of ['aprovada','externa','numero'])await t.test(tipo,()=>{
    const f=pilotoVirtual('aguarda-revisao-fixa');f.executar('--fechar')
    if(tipo==='externa'){
      const evidencia=path.join(f.dir,'..','outra-execucao','falha.log');f.escrever(evidencia,'falha')
      f.escrever(f.revisao,JSON.stringify({aprovada:false,pendencias:['entradasInvalidas'],criterios:{entradasInvalidas:{aprovado:false,evidencia}}}))
    }
    const antes=f.ler(f.arquivo).toString(),chamadas=f.chamadas()
    assert.throws(()=>f.executar('--reabrir',[tipo==='numero'?'1.5':'1']),/reprovada|fora da execução|Número/)
    assert.equal(f.ler(f.arquivo).toString(),antes);assert.equal(f.chamadas(),chamadas)
  })
})

test('falha ao gravar ou confirmar reabertura conserva plano anterior e remove somente os arquivos novos', { skip: !fs.existsSync(piloto) }, async t => {
  for(const operacao of ['write','rename'])await t.test(operacao,()=>{
  let negar=false;const f=pilotoVirtual('aguarda-revisao-fixa',[],(op,p)=>{if(negar&&op===operacao&&p.includes('.reabrir-'))throw Error('Falha de gravação')})
  f.executar('--fechar');const evidencia=path.join(f.dir,'falha.log');f.escrever(evidencia,'falha independente')
  f.escrever(f.revisao,JSON.stringify({aprovada:false,pendencias:['entradasInvalidas'],criterios:{entradasInvalidas:{aprovado:false,evidencia}}}))
  const antes=f.ler(f.arquivo).toString();negar=true
  assert.throws(()=>f.executar('--reabrir',['1']),/Falha de gravação/)
  assert.equal(f.ler(f.arquivo).toString(),antes);assert(!f.existe(path.join(f.dir,'fechamento-pre-reabertura-1.json')))
  assert(![...f.arquivos.keys()].some(n=>n.includes('.reabrir-')))
  })
})

test('piloto captura inventário do init real na correção aceita', { skip: !fs.existsSync(piloto) }, () => {
  const f = pilotoVirtual('aguarda-revisao-fixa'), pedido = path.join(f.dir, 'pedido.txt')
  f.escrever(pedido, 'Preserve o contrato.'); f.executar('--corrigir', [pedido])
  const c = f.job().correcoes[0]
  assert.equal(f.job().estado, 'aguarda-revisao-fixa'); assert.equal(c.modeloPrincipal, f.job().modeloPrincipal)
  assert.equal(c.nucleoConfirmado, true); assert.equal(c.apoiosConfirmados, true)
  assert.deepEqual(c.plugins, f.job().plugins)
  assert.equal(JSON.parse(f.ler(c.arquivoCLI).toString().split('\n')[0]).model, c.modeloPrincipal)
  assert.equal(f.chamadas(), 2)
})

test('piloto interrompe correção divergente sem liberar testes nem confundir inventário com cota', { skip: !fs.existsSync(piloto) }, async t => {
  const casos = [
    ['init ausente', es => es.slice(1)],
    ['dois init', es => [es[0], ...es]],
    ['principal trocada mesmo Opus', es => { es[0].model = 'claude-opus-6'; return es }],
    ['principal rebaixada', es => { es[0].model = 'claude-sonnet-5'; return es }],
    ['sessão real diferente', es => { es[0].session_id = 'outra-sessao'; return es }],
    ['sessão real ausente', es => { delete es[0].session_id; return es }],
    ['núcleo duplicado', es => { es[0].plugins.push({ ...es[0].plugins[0] }); return es }],
    ['núcleo versão', es => { es[0].plugins[0].version = '9.0.0'; return es }],
    ['núcleo caminho', es => { es[0].plugins[0].path = es[0].plugins[1].path; return es }],
    ['núcleo origem', es => { es[0].plugins[0].source = 'devagents-core@devagents'; return es }],
    ['apoio extra', es => { es[0].plugins.push({ ...es[0].plugins[1], name: 'extra', source: 'extra@inline' }); return es }],
    ['apoio ausente', es => { es[0].plugins.pop(); return es }],
    ['apoio versão', es => { es[0].plugins[1].version = '8.0.0'; return es }],
    ['apoio caminho', es => { es[0].plugins[1].path = es[0].plugins[0].path; return es }],
    ['apoio origem', es => { es[0].plugins[1].source = 'superpowers@oficial'; return es }],
    ['inventário malformado', es => { es[0].plugins.push(null); return es }],
    ['init divergente com texto de cota', es => { es[0].model = 'claude-sonnet-5'; es[1].is_error = true; es[1].result = '429 rate limit'; return es }],
    ['sem init e sem erro do provedor', es => { es.shift(); es[0].result = '429 rate limit'; return es }],
  ]
  for (const [nome, mudar] of casos) await t.test(nome, () => {
    const f = pilotoVirtual('aguarda-revisao-fixa', [], () => {}, mudar), pedido = path.join(f.dir, 'pedido.txt')
    f.escrever(pedido, 'Preserve o contrato.'); f.executar('--corrigir', [pedido])
    assert.equal(f.job().estado, 'interrompida'); assert.equal(f.chamadas(), 1)
    assert.match(f.job().motivo, /Inventário real da correção/); assert.doesNotMatch(f.job().motivo, /limit|429|rate/i)
    assert(!f.existe(path.join(f.dir, 'resultado-testes-pos-correcao-1.log')))
    assert(f.existe(f.job().correcoes[0].arquivoCLI))
    assert.throws(() => f.executar('--repor'), /Só repor recusa do provedor/)
  })
})

test('piloto preserva recusa nativa por cota sem init e permite repor a tentativa', { skip: !fs.existsSync(piloto) }, async t => {
  for (const motivo of ["You've hit your limit · resets 11am (America/Sao_Paulo)", "You've hit your session limit · resets11:20am (America/Sao_Paulo)", "You've hit your weekly limit · resets Oct 26, 9am (America/Sao_Paulo)", 'quota exceeded', 'cota excedida']) await t.test(motivo, () => {
    const f = pilotoVirtual('aguarda-revisao-fixa', [], () => {}, es => [{ ...es[1], is_error: true, result: motivo }])
    const pedido = path.join(f.dir, 'pedido.txt'); f.escrever(pedido, 'Preserve o contrato.'); f.executar('--corrigir', [pedido])
    const j = f.job(), c = j.correcoes[0]
    assert.equal(j.estado, 'interrompida'); assert.equal(j.motivo, motivo); assert.equal(f.chamadas(), 1)
    assert.equal(c.nucleoConfirmado, false); assert.equal(c.apoiosConfirmados, false); assert.equal(c.modeloPrincipal, null)
    assert(!f.existe(path.join(f.dir, 'resultado-testes-pos-correcao-1.log')))
    f.executar('--repor'); assert.equal(f.job().estado, 'preparada'); assert.equal(f.plano().recusadas[0].motivo, motivo)
  })
})

test('piloto confere snapshots, settings e argumentos antes de chamar correção', { skip: !fs.existsSync(piloto) }, async t => {
  const casos = [
    ['núcleo alterado', f => f.escrever(path.join(f.plano().perfis.base.plugin, '.claude-plugin/plugin.json'), 'alterado')],
    ['apoio alterado', f => f.escrever(path.join(f.plano().apoios.superpowers.plugin, '.claude-plugin/plugin.json'), 'alterado')],
    ['settings alterados', f => f.escrever(f.plano().settings, '{"alterado":true}')],
    ['argumento de modelo', f => { const p = f.plano(); p.jobs[0].argumentos[1] = 'sonnet'; f.escrever(f.arquivo, JSON.stringify(p)) }],
    ['modelo do plano e argumento rebaixados', f => { const p = f.plano(); p.modelo = 'sonnet'; p.jobs[0].argumentos[1] = 'sonnet'; f.escrever(f.arquivo, JSON.stringify(p)) }],
    ['argumento de sessão ausente', f => { const p = f.plano(); p.jobs[0].argumentos.splice(10, 2); f.escrever(f.arquivo, JSON.stringify(p)) }],
    ['argumento de sessão diferente', f => { const p = f.plano(); p.jobs[0].argumentos[11] = 'outra-sessao'; f.escrever(f.arquivo, JSON.stringify(p)) }],
    ['argumento de apoio', f => { const p = f.plano(); p.jobs[0].argumentos[9] = p.perfis.base.plugin; f.escrever(f.arquivo, JSON.stringify(p)) }],
    ['argumento de settings', f => { const p = f.plano(), extra = path.join(f.dir, 'outro-settings.json'); f.escrever(extra, '{}'); p.jobs[0].argumentos[5] = extra; f.escrever(f.arquivo, JSON.stringify(p)) }],
  ]
  for (const [nome, mudar] of casos) await t.test(nome, () => {
    const f = pilotoVirtual('aguarda-revisao-fixa'), pedido = path.join(f.dir, 'pedido.txt')
    f.escrever(pedido, 'Preserve o contrato.'); mudar(f)
    assert.throws(() => f.executar('--corrigir', [pedido]), /alterad|difere|Opus|ausente/)
    assert.equal(f.chamadas(), 0); assert.equal(f.job().correcoes.length, 0); assert(f.existe(f.revisao))
  })
})

test('piloto seleciona a última correção pelo número e não pela ordem lexical', { skip: !fs.existsSync(piloto) }, () => {
  const f = pilotoVirtual('aguarda-revisao-fixa', Array.from({ length: 10 }, () => ({ pedido: 'corrigir' })))
  for (const n of [1, 9, 10]) f.escrever(path.join(f.dir, `resultado-testes-pos-correcao-${n}.log`), '# pass 6\n# fail 0\n')
  f.executar('--fechar')
  assert.equal(path.basename(f.job().arquivoTestes), 'resultado-testes-pos-correcao-10.log')
})

test('piloto não substitui log final ausente pelo log inicial aprovado', { skip: !fs.existsSync(piloto) }, () => {
  const f = pilotoVirtual('aguarda-revisao-fixa', [{ pedido: 'corrigir' }])
  assert.throws(() => f.executar('--fechar'), /Log da última execução dos testes ausente/)
  assert.equal(f.job().estado, 'aguarda-revisao-fixa')
  assert.equal(f.chamadas(), 0)
})

test('reposição valida a cópia antes de mover e preserva a tentativa ao falhar a cópia', { skip: !fs.existsSync(piloto) }, () => {
  const f = pilotoVirtual('interrompida', [], op => { if (op === 'copy') throw Error('Falha simulada na cópia parcial') })
  const planoAntes = f.ler(f.arquivo).toString(), entrega = path.join(f.job().pasta, 'relatorio.mjs')
  assert.throws(() => f.executar('--repor'), /Falha simulada na cópia parcial/)
  assert.equal(f.ler(f.arquivo).toString(), planoAntes)
  assert.equal(f.ler(entrega).toString(), 'entrega da tentativa original')
  assert(![...f.arquivos.keys()].some(n => /-repor-|-recusada-/.test(n)))
})

test('reposição reverte diretórios quando falha a gravação final do plano', { skip: !fs.existsSync(piloto) }, () => {
  let erro = false
  const f = pilotoVirtual('interrompida', [], (op, a) => {
    if (!erro && op === 'rename' && a.includes('plano.json.repor-')) { erro = true; throw Error('Falha simulada ao confirmar plano') }
  })
  const planoAntes = f.ler(f.arquivo).toString(), entrega = path.join(f.job().pasta, 'relatorio.mjs')
  assert.throws(() => f.executar('--repor'), /Falha simulada ao confirmar plano/)
  assert.equal(f.ler(f.arquivo).toString(), planoAntes)
  assert.equal(f.ler(entrega).toString(), 'entrega da tentativa original')
  assert(f.existe(path.join(f.dir, 'tentativa-recusada.json')))
  assert(![...f.arquivos.keys()].some(n => /-repor-|-recusada-/.test(n)))
})

test('reposição mantém o plano e a tentativa se não conseguir preparar o plano novo', { skip: !fs.existsSync(piloto) }, () => {
  const f = pilotoVirtual('interrompida', [], (op, p) => {
    if (op === 'write' && p.includes('plano.json.repor-')) throw Error('Sem permissão para gravar plano novo')
  })
  const planoAntes = f.ler(f.arquivo).toString(), entrega = path.join(f.job().pasta, 'relatorio.mjs')
  assert.throws(() => f.executar('--repor'), /Sem permissão para gravar plano novo/)
  assert.equal(f.ler(f.arquivo).toString(), planoAntes)
  assert.equal(f.ler(entrega).toString(), 'entrega da tentativa original')
  assert(![...f.arquivos.keys()].some(n => /-repor-|-recusada-/.test(n)))
})

test('reposição rejeita pasta da tentativa fora do lote antes de mover ou apagar', { skip: !fs.existsSync(piloto) }, () => {
  const f = pilotoVirtual('interrompida'), plano = f.plano()
  plano.jobs[0].pasta = path.join(path.dirname(f.dir), '..', 'outro-lote', '03-script-automacao')
  f.escrever(f.arquivo, JSON.stringify(plano))
  const antes = new Map([...f.arquivos].map(([n, b]) => [n, b.toString()]))
  assert.throws(() => f.executar('--repor'), /Reposição fora do lote/)
  assert.deepEqual(new Map([...f.arquivos].map(([n, b]) => [n, b.toString()])), antes)
})

test('reposição bem-sucedida conserva artefatos e registro, com matriz limpa e sessão nova', { skip: !fs.existsSync(piloto) }, () => {
  const f = pilotoVirtual('interrompida'), sessaoAntes = f.job().sessao
  f.executar('--repor')
  assert.equal(f.job().estado, 'preparada'); assert.notEqual(f.job().sessao, sessaoAntes)
  const [recusada] = f.plano().recusadas
  assert.equal(recusada.sessao, sessaoAntes)
  assert.equal(f.ler(path.join(recusada.pastaGuardada, path.basename(f.job().pasta), 'relatorio.mjs')).toString(), 'entrega da tentativa original')
  assert.equal(JSON.parse(f.ler(path.join(recusada.pastaGuardada, 'tentativa-recusada.json'))).sessao, sessaoAntes)
  assert(f.existe(path.join(f.job().pasta, 'pedido.md')))
  assert(!f.existe(path.join(f.job().pasta, 'relatorio.mjs')))
  assert(![...f.arquivos.keys()].some(n => n.includes('-repor-')))
  assert.equal(f.chamadas(), 0)
})

test('recusa plano malformado com saída estruturada em vez de exceção', t => {
  const f = fixture(t)
  for (const conteudo of ['null', '[]', 'invalido', '{}']) {
    fs.writeFileSync(f.arquivo, conteudo)
    assert.equal(auditarEnsaio(f.arquivo).estado, 'reprovado')
  }
})

test('comparador libera só as três repetições da mesma tarefa nos grupos aprovados', t => {
  const f = fixture(t)
  const arquivos = (grupo, tarefa = '01-secao-lp') => f.plano.jobs.filter(j => j.grupo === grupo && j.tarefa === tarefa).map(j => j.arquivoMedicao).join(',')
  const executar = (base, depois, extra = []) => spawnSync(process.execPath,
    [path.join(raiz, 'scripts/comparar-medicoes.mjs'), `base=${base}`, `depois=${depois}`, '--ensaio', f.arquivo, '--json', ...extra], { encoding: 'utf8' })
  const ok = executar(arquivos('base'), arquivos('depois'))
  assert.equal(ok.status, 0, ok.stderr)
  const r = JSON.parse(ok.stdout)
  assert.equal(r.auditoria.estado, 'aprovado'); assert.equal(r.grupos[0].sessoes, 3)
  const misturado = executar(arquivos('base'), arquivos('depois', '02-endpoint-api'))
  assert.equal(misturado.status, 1); assert.match(misturado.stderr, /não misture tarefas/)
  const curto = executar(arquivos('base').split(',').slice(0, 2).join(','), arquivos('depois'))
  assert.equal(curto.status, 1); assert.match(curto.stderr, /três repetições/)
  const trocado = executar(arquivos('depois'), arquivos('base'))
  assert.equal(trocado.status, 1); assert.match(trocado.stderr, /não pertence ao grupo/)
  const alheio = path.join(f.dir, 'alheio.json')
  fs.copyFileSync(f.plano.jobs[0].arquivoMedicao, alheio)
  const estranho = executar([alheio, ...arquivos('base').split(',').slice(1)].join(','), arquivos('depois'))
  assert.equal(estranho.status, 1); assert.match(estranho.stderr, /não pertence ao grupo/)
  f.plano.jobs[0].estado = 'aguarda-revisao-fixa'; f.salvar()
  const bloqueado = executar(arquivos('base'), arquivos('depois'))
  assert.equal(bloqueado.status, 1); assert.equal(bloqueado.stdout, ''); assert.match(bloqueado.stderr, /Ensaio incompleto/)
})

test('apoios explícitos precisam corresponder aos snapshots; extras não são aceitos', t => {
  const f = fixture(t), plugin = path.join(f.dir, 'apoio-superpowers')
  fs.mkdirSync(path.join(plugin, '.claude-plugin'), { recursive: true })
  const manifesto = path.join(plugin, '.claude-plugin/plugin.json')
  gravar(manifesto, { name: 'superpowers', version: '7.0.0' })
  f.plano.apoios = { superpowers: { plugin, versao: '7.0.0', hashes: { '.claude-plugin/plugin.json': hash(manifesto) } } }
  for (const j of f.plano.jobs) {
    j.pluginApoios = ['superpowers']; j.apoiosConfirmados = true; j.plugins[1].path = plugin
  }
  f.salvar(); assert.equal(auditarEnsaio(f.arquivo).estado, 'aprovado')
  f.plano.jobs[0].plugins.push({ name: 'outro', source: 'outro@inline', version: '1.0.0' }); f.salvar()
  const r = auditarEnsaio(f.arquivo)
  assert.equal(r.estado, 'reprovado'); assert(r.problemas.some(p => /plugin não declarado/.test(p)))
})
