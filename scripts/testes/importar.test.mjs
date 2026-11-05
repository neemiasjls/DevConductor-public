// Integração em cópias descartáveis: não altera plugins reais nem consulta a rede.
// Rodar: node --test scripts/testes/importar.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const origemAgente = 'teste/agents/especialista.md'
const origemSkill = 'teste/skills/receita'
const manifestoStack = 'plugins/stack-teste/.claude-plugin/plugin.json'
const arquivoCatalogo = '.claude-plugin/marketplace.json'
const selecaoMinima = () => ({
  origens: { wshobson: { repo: 'https://example.invalid/agentes', licenca: 'MIT' } },
  plugins: {
    'stack-teste': {
      descricao: 'Especialista usado pela fixture.',
      agentes: { [origemAgente]: { model: 'sonnet', description: 'Descrição ajustada.' } },
      skills: { wshobson: [origemSkill] },
    },
  },
})

function preparar(t) {
  const temporarios = fs.realpathSync(os.tmpdir())
  const pasta = fs.mkdtempSync(path.join(temporarios, 'devagents-importar-'))
  const projeto = path.join(pasta, 'projeto com espacos')
  const clone = path.join(pasta, 'origem com espacos')
  t.after(() => {
    const destino = path.resolve(pasta)
    assert.ok(path.isAbsolute(destino))
    assert.equal(path.dirname(destino), temporarios)
    assert.ok(path.basename(destino).startsWith('devagents-importar-'))
    try {
      fs.rmSync(destino, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    } catch (e) {
      if (process.platform !== 'win32' || !['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(e.code)) throw e
      // O resultado das asserções já foi verificado. Windows pode manter handles da pasta após o filho sair.
      // Conservar a fixture e informar a falha de limpeza, sem confundi-la com erro da importação.
      t.diagnostic(`Limpeza temporária pendente (${e.code}); fixture preservada: ${destino}`)
    }
  })

  const gravar = (relativo, conteudo, base = projeto) => {
    const arquivo = path.join(base, relativo)
    fs.mkdirSync(path.dirname(arquivo), { recursive: true })
    fs.writeFileSync(arquivo, typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo, null, 2) + '\n')
  }
  fs.mkdirSync(projeto)
  fs.mkdirSync(clone)
  fs.cpSync(path.join(raiz, 'scripts'), path.join(projeto, 'scripts'), {
    recursive: true,
    filter: (arquivo) => path.basename(arquivo) !== 'testes',
  })

  // As identidades e os objetos do Git ficam somente nesta origem descartável.
  const env = Object.fromEntries(Object.entries(process.env).filter(([nome]) => !/^GIT_(?:DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES)$/i.test(nome)))
  Object.assign(env, {
    GIT_AUTHOR_NAME: 'Teste', GIT_AUTHOR_EMAIL: 'teste@fixture.invalid',
    GIT_COMMITTER_NAME: 'Teste', GIT_COMMITTER_EMAIL: 'teste@fixture.invalid',
  })
  const git = (args, input) => {
    const r = spawnSync('git', args, { cwd: clone, env, input, encoding: 'utf8', timeout: 30000 })
    assert.ifError(r.error)
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`)
    return r.stdout.trim()
  }
  git(['init', '-q'])
  const arvore = git(['mktree'], '')
  const commit = git(['-c', 'commit.gpgsign=false', 'commit-tree', arvore], 'Preparar fixture de importacao\n')
  git(['update-ref', 'refs/heads/fixture', commit])
  git(['symbolic-ref', 'HEAD', 'refs/heads/fixture'])

  gravar('scripts/selecao.json', selecaoMinima())
  gravar(`plugins/${origemAgente}`, '---\nname: original\ndescription: |\n  Descrição da origem.\n  Segunda linha.\nmodel: opus\n---\n# Agente de teste\n', clone)
  gravar(`plugins/${origemSkill}/SKILL.md`, '---\nname: receita\ndescription: Receita de teste.\n---\nConteúdo da skill.\n', clone)
  gravar(`plugins/${origemSkill}/referencias/exemplo.md`, 'Referência que acompanha a skill.\n', clone)
  const manifesto = {
    name: 'stack-teste', version: '0.3.4', description: 'Descrição anterior.',
    author: { name: 'Equipe fixture' }, license: 'MIT',
    homepage: 'https://example.invalid/stack-teste', keywords: ['fixture', 'preservar'],
  }
  gravar(manifestoStack, manifesto)
  gravar('plugins/stack-teste/agents/antigo.md', 'Agente anterior que precisa sobreviver a falhas.\n')
  gravar('plugins/stack-teste/skills/antiga/SKILL.md', 'Skill anterior que precisa sobreviver a falhas.\n')
  gravar('plugins/stack-teste/README.md', 'Arquivo do plugin fora da importação.\n')
  gravar('plugins/devconductor-core/.claude-plugin/plugin.json', {
    name: 'devconductor-core', version: '9.8.7', description: 'Plugin fora da seleção.',
  })
  gravar('plugins/devconductor-core/skills/nucleo/SKILL.md', 'Conteúdo do núcleo.\n')
  const fonteExterna = {
    destino: 'plugins/devconductor-core/skills/nucleo', origem: 'projeto',
    caminho: 'nucleo', commit: null, licenca: 'MIT', alterado: null,
  }
  gravar('fontes.json', {
    origens: selecaoMinima().origens,
    arquivos: [
      { destino: 'plugins/stack-teste/agents/antigo.md', origem: 'wshobson', caminho: 'antigo', commit: 'anterior' },
      fonteExterna,
    ],
  })
  const catalogo = {
    name: 'devagents', owner: { name: 'Equipe fixture', email: 'catalogo@fixture.invalid' },
    metadata: { description: 'Descrição própria do catálogo.', version: '0.7.8', category: 'teste' },
    plugins: [{ name: 'stack-teste', source: './plugins/stack-teste', description: 'Entrada antiga.', version: '0.1.0' }],
  }
  gravar(arquivoCatalogo, catalogo)

  return {
    projeto, clone, commit, manifesto, catalogo, fonteExterna, gravar,
    ler: (relativo) => fs.readFileSync(path.join(projeto, relativo), 'utf8'),
    json: (relativo) => JSON.parse(fs.readFileSync(path.join(projeto, relativo), 'utf8')),
    rodar(script = 'importar.mjs', args = script === 'importar.mjs' ? [clone] : [], { preload } = {}) {
      const opcoesNode = preload ? ['--import', pathToFileURL(preload).href] : []
      const r = spawnSync(process.execPath, [...opcoesNode, path.join(projeto, 'scripts', script), ...args], {
        cwd: projeto, env, encoding: 'utf8', timeout: 30000,
      })
      assert.ifError(r.error)
      return { ...r, saida: `${r.stdout}${r.stderr}` }
    },
  }
}

function retrato(dir) {
  return fs.readdirSync(dir, { recursive: true }).sort().map((nome) => {
    const arquivo = path.join(dir, nome)
    return [nome.replaceAll('\\', '/'), fs.statSync(arquivo).isDirectory() ? null : fs.readFileSync(arquivo).toString('base64')]
  })
}

function estadoDestino(f) {
  return {
    plugins: retrato(path.join(f.projeto, 'plugins')),
    fontes: f.ler('fontes.json'),
    catalogo: retrato(path.join(f.projeto, '.claude-plugin')),
  }
}

test('importa agente e skill de caminho com espaços, ajusta cabeçalho e regenera catálogo', (t) => {
  const f = preparar(t)
  const r = f.rodar()
  assert.equal(r.status, 0, r.saida)
  const agente = f.ler('plugins/stack-teste/agents/especialista.md')
  assert.match(agente, /^name: especialista$/m)
  assert.match(agente, /^model: sonnet$/m)
  assert.match(agente, /^description: "Descrição ajustada\."$/m)
  assert.doesNotMatch(agente, /Segunda linha\./)
  assert.match(agente, /# Agente de teste/)
  assert.match(f.ler('plugins/stack-teste/skills/receita/SKILL.md'), /Conteúdo da skill/)
  assert.match(f.ler('plugins/stack-teste/skills/receita/referencias/exemplo.md'), /acompanha a skill/)
  assert.equal(fs.existsSync(path.join(f.projeto, 'plugins/stack-teste/agents/antigo.md')), false)
  assert.match(f.ler('plugins/stack-teste/README.md'), /fora da importação/)
  const fontes = f.json('fontes.json').arquivos.filter((fonte) => fonte.destino.startsWith('plugins/stack-teste/'))
  assert.equal(fontes.length, 2)
  assert.ok(fontes.every((fonte) => fonte.commit === f.commit))
  assert.deepEqual(new Set(f.json(arquivoCatalogo).plugins.map((plugin) => plugin.name)), new Set(['stack-teste', 'devconductor-core']))
})

test('preserva versão e campos do manifesto e fontes de plugins fora da seleção', (t) => {
  const f = preparar(t)
  const r = f.rodar()
  assert.equal(r.status, 0, r.saida)
  const manifesto = f.json(manifestoStack)
  for (const campo of ['version', 'author', 'license', 'homepage', 'keywords']) {
    assert.deepEqual(manifesto[campo], f.manifesto[campo], `Campo alterado: ${campo}`)
  }
  assert.equal(manifesto.description, selecaoMinima().plugins['stack-teste'].descricao)
  assert.deepEqual(f.json('fontes.json').arquivos.find((fonte) => fonte.destino === f.fonteExterna.destino), f.fonteExterna)
  assert.equal(f.json('fontes.json').arquivos.some((fonte) => fonte.destino.endsWith('/antigo.md')), false)
  assert.equal(f.json(arquivoCatalogo).plugins.find((plugin) => plugin.name === 'stack-teste').version, '0.3.4')
})

test('agente ausente não remove arquivos antigos nem altera manifesto, fontes ou catálogo', (t) => {
  const f = preparar(t)
  fs.unlinkSync(path.join(f.clone, 'plugins', origemAgente))
  const antes = estadoDestino(f)
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.deepEqual(estadoDestino(f), antes)
})

test('skill ausente impede qualquer escrita mesmo quando o agente está disponível', (t) => {
  const f = preparar(t)
  const selecao = selecaoMinima()
  selecao.plugins['stack-teste'].skills.wshobson.push('teste/skills/ausente')
  f.gravar('scripts/selecao.json', selecao)
  const antes = estadoDestino(f)
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.deepEqual(estadoDestino(f), antes)
})

test('origem incompleta no último plugin não modifica o primeiro plugin da seleção', (t) => {
  const f = preparar(t)
  const selecao = selecaoMinima()
  selecao.plugins['stack-segunda'] = {
    descricao: 'Segundo plugin incompleto.',
    agentes: { 'teste/agents/ausente.md': { model: 'sonnet', description: 'Ausente.' } }, skills: {},
  }
  f.gravar('scripts/selecao.json', selecao)
  const antes = estadoDestino(f)
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.deepEqual(estadoDestino(f), antes)
})

test('nome de plugin com travessia é rejeitado sem alcançar pasta fora de plugins', (t) => {
  const f = preparar(t)
  const selecao = selecaoMinima()
  selecao.plugins = { '../fora': selecao.plugins['stack-teste'] }
  f.gravar('scripts/selecao.json', selecao)
  f.gravar('fora/agents/conservar.md', 'Arquivo fora da pasta de plugins.\n')
  const antes = estadoDestino(f)
  const foraAntes = retrato(path.join(f.projeto, 'fora'))
  const r = f.rodar()
  assert.notEqual(r.status, 0, r.saida)
  assert.deepEqual(estadoDestino(f), antes)
  assert.deepEqual(retrato(path.join(f.projeto, 'fora')), foraAntes)
})

test('atualiza só catálogo sem origem, preservando owner, metadata, fontes e sentinelas', (t) => {
  const f = preparar(t)
  f.gravar('scripts/selecao.json', { origens: {}, plugins: { 'nao-usar': { agentes: { 'ausente.md': {} } } } })
  f.gravar(manifestoStack, { ...f.manifesto, version: '0.3.5' })
  const pluginsAntes = retrato(path.join(f.projeto, 'plugins'))
  const fontesAntes = f.ler('fontes.json')
  const r = f.rodar('atualizar-marketplace.mjs')
  assert.equal(r.status, 0, r.saida)
  assert.deepEqual(retrato(path.join(f.projeto, 'plugins')), pluginsAntes)
  assert.equal(f.ler('fontes.json'), fontesAntes)
  const catalogo = f.json(arquivoCatalogo)
  assert.deepEqual(catalogo.owner, f.catalogo.owner)
  assert.deepEqual(catalogo.metadata, f.catalogo.metadata)
  assert.equal(catalogo.plugins.find((plugin) => plugin.name === 'stack-teste').version, '0.3.5')
  assert.equal(catalogo.plugins.find((plugin) => plugin.name === 'devconductor-core').version, '9.8.7')
})

test('manifesto inválido impede atualização parcial do catálogo', (t) => {
  for (const defeito of ['json', 'versao', 'descricao']) {
    const f = preparar(t)
    const invalido = defeito === 'json' ? '{ manifesto quebrado'
      : defeito === 'versao' ? { ...f.manifesto, version: 'invalida' }
        : { ...f.manifesto, description: '' }
    f.gravar(manifestoStack, invalido)
    const antes = estadoDestino(f)
    const r = f.rodar('atualizar-marketplace.mjs')
    assert.notEqual(r.status, 0, `${defeito}: ${r.saida}`)
    assert.deepEqual(estadoDestino(f), antes, defeito)
  }
})

test('nomes duplicados em manifestos impedem atualização do catálogo', (t) => {
  const f = preparar(t)
  f.gravar('plugins/zz-duplicado/.claude-plugin/plugin.json', {
    name: 'stack-teste', version: '9.8.7', description: 'Nome duplicado.',
  })
  const antes = estadoDestino(f)
  const r = f.rodar('atualizar-marketplace.mjs')
  assert.notEqual(r.status, 0, r.saida)
  assert.match(r.saida, /duplicado/i)
  assert.deepEqual(estadoDestino(f), antes)
})

test('falha após iniciar substituições restaura plugins, manifesto e fontes e limpa preparação', (t) => {
  const f = preparar(t)
  const preload = path.join(f.projeto, 'scripts', 'falhar-troca-fontes.mjs')
  const registro = path.join(f.projeto, 'falha-fontes.json')
  f.gravar('scripts/falhar-troca-fontes.mjs', `
import fs from 'node:fs'
import path from 'node:path'
const projeto = ${JSON.stringify(f.projeto)}
const registro = ${JSON.stringify(registro)}
const renomear = fs.renameSync
let falhou = false
fs.renameSync = function (de, para) {
  const origem = path.resolve(de)
  const destino = path.resolve(para)
  const preparacao = path.dirname(origem)
  // A restauração usa backups numerados e nunca corresponde a esta origem preparada.
  const novasFontes = path.basename(origem) === 'fontes.json'
    && path.dirname(preparacao) === projeto
    && path.basename(preparacao).startsWith('.devagents-importar-')
  if (!falhou && novasFontes && destino === path.join(projeto, 'fontes.json')) {
    falhou = true
    fs.writeFileSync(registro, JSON.stringify({
      agenteNovoInstalado: fs.existsSync(path.join(projeto, 'plugins/stack-teste/agents/especialista.md')),
      agenteAntigoInstalado: fs.existsSync(path.join(projeto, 'plugins/stack-teste/agents/antigo.md')),
      fontesOriginaisRemovidas: !fs.existsSync(destino),
      versaoDuranteTroca: JSON.parse(fs.readFileSync(path.join(projeto, ${JSON.stringify(manifestoStack)}), 'utf8')).version,
    }))
    throw new Error('FALHA_INJETADA_FONTES')
  }
  return renomear.call(this, de, para)
}
`)
  const antes = estadoDestino(f)
  const r = f.rodar('importar.mjs', [f.clone], { preload })
  assert.equal(r.status, 1, r.saida)
  assert.match(r.saida, /FALHA_INJETADA_FONTES/)
  assert.deepEqual(JSON.parse(fs.readFileSync(registro, 'utf8')), {
    agenteNovoInstalado: true, agenteAntigoInstalado: false,
    fontesOriginaisRemovidas: true, versaoDuranteTroca: '0.3.4',
  })
  assert.deepEqual(estadoDestino(f), antes)
  assert.equal(f.json(manifestoStack).version, '0.3.4')
  assert.deepEqual(fs.readdirSync(f.projeto).filter((nome) => nome.startsWith('.devagents-importar-')), [])
})
