// O orquestrador entra em toda sessão: o lembrete tem de ser curto e a skill caber num orçamento fixo.
// Rodar: node --test scripts/testes/orquestrador.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const nucleo = path.join(raiz, 'plugins', 'devconductor-core')
const skill = fs.readFileSync(path.join(nucleo, 'skills', 'orquestrador', 'SKILL.md'), 'utf8')

test('skill orquestrador existe, tem nome e descrição e cabe no orçamento', () => {
  assert.match(skill, /^---\r?\nname: orquestrador\r?\ndescription: .{40,400}\r?\n---/)
  assert.ok(Buffer.byteLength(skill) <= 7000, `skill com ${Buffer.byteLength(skill)} bytes (limite 7000)`)
  for (const parte of ['## 1. A ficha', 'Direto', 'haiku', 'sonnet', 'Codex', 'Sessão nova', 'typescript-pro'])
    assert.ok(skill.toLowerCase().includes(parte.toLowerCase()), `faltou: ${parte}`)
})

test('a antiga devagents-fluxo não existe mais e ninguém aponta para ela fora do histórico', () => {
  assert.ok(!fs.existsSync(path.join(nucleo, 'skills', 'devagents-fluxo')))
  for (const f of ['README.md', path.join('plugins', 'devconductor-core', 'hooks', 'hooks.json')])
    assert.ok(!fs.readFileSync(path.join(raiz, f), 'utf8').includes('devagents-fluxo'), f)
})

test('lembrete do começo da sessão é uma linha curta e está no SessionStart', () => {
  const r = spawnSync(process.execPath, [path.join(nucleo, 'hooks', 'orquestrar.mjs')], { encoding: 'utf8' })
  assert.equal(r.status, 0)
  assert.equal(r.stdout.trim().split('\n').length, 1)
  assert.ok(r.stdout.length < 400, `lembrete com ${r.stdout.length} caracteres`)
  const hooks = JSON.parse(fs.readFileSync(path.join(nucleo, 'hooks', 'hooks.json'), 'utf8'))
  const grupo = hooks.hooks.SessionStart.find((g) => g.hooks.some((h) => h.command.includes('orquestrar.mjs')))
  assert.ok(grupo, 'lembrete fora do SessionStart')
  assert.equal(grupo.matcher, undefined, 'matcher restringiria quando o lembrete roda')
  const h = grupo.hooks.find((x) => x.command.includes('orquestrar.mjs'))
  assert.equal(h.type, 'command')
  const alvo = h.command.match(/"([^"]+)"/)[1].replace('${CLAUDE_PLUGIN_ROOT}', nucleo)
  assert.ok(fs.existsSync(alvo), `comando aponta para arquivo que não existe: ${alvo}`)
})

test('todo agente do núcleo tem esforço fixo (nunca max) e a regra de tamanho da DEV-46', () => {
  for (const arq of fs.readdirSync(path.join(nucleo, 'agents'))) {
    const a = fs.readFileSync(path.join(nucleo, 'agents', arq), 'utf8')
    const esforco = a.match(/^effort: (\w+)$/m)?.[1]
    assert.ok(['low', 'medium', 'high'].includes(esforco), `${arq}: esforço ${esforco}`)
    assert.match(a, /~40 chamadas/, `${arq}: falta o limite de chamadas`)
    assert.match(a, /até ~?(15|30) linhas/, `${arq}: falta o limite da resposta`)
  }
})

// DEV-48: pesquisa alimenta decisão, então o pesquisador roda no Sonnet; testador e publicador no Haiku.
test('os 3 ajudantes existem no modelo combinado e o orquestrador aponta para eles', () => {
  const modelo = { pesquisador: 'sonnet', testador: 'claude-haiku-5-5', publicador: 'claude-haiku-5-5' }
  for (const nome of Object.keys(modelo)) {
    const a = fs.readFileSync(path.join(nucleo, 'agents', nome + '.md'), 'utf8')
    assert.match(a, new RegExp('^---\r?\nname: ' + nome + '\r?\ndescription: "[^"]{60,400}"\r?\nmodel: ' + modelo[nome] + '\r?\neffort: (low|medium)\r?\n---'))
    assert.ok(a.includes('Não grave memória'), nome + ': falta a regra de não gravar memória')
    assert.ok(skill.includes('`' + nome + '`'), 'orquestrador não cita ' + nome)
  }
})

test('pedido pequeno e fechado segue direto, sem carregar a skill nem ficha', () => {
  const r = spawnSync(process.execPath, [path.join(nucleo, 'hooks', 'orquestrar.mjs')], { encoding: 'utf8' })
  const linha = r.stdout.toLowerCase()
  assert.match(linha, /pequeno e fechado/, 'lembrete não separa o pedido pequeno')
  assert.match(linha, /sem (carregar )?(a )?skill/, 'lembrete ainda manda carregar a skill sempre')
  assert.doesNotMatch(linha, /em cada pedido de trabalho, use a skill/, 'lembrete ainda obriga a skill em todo pedido')
  const descricao = skill.match(/^description: (.*)$/m)[1].toLowerCase()
  assert.match(descricao, /pequeno e fechado/, 'descrição da skill não diz quando não usar')
  assert.doesNotMatch(descricao, /todo pedido/, 'descrição ainda pede a skill em todo pedido')
})

// Parte 3 do plano de segurança: o portão escrito no fluxo de sistema.
test('fluxo de sistema lista os riscos na entrada e o portão na entrega', () => {
  const ref = (...p) => fs.readFileSync(path.join(nucleo, 'skills', 'orquestrador', 'referencias', ...p), 'utf8')
  const fluxo = ref('fluxo-sistema.md').replace(/\s+/g, ' ')
  for (const c of ['login', 'permissões', 'dados pessoais', 'segredos', 'envio de arquivo', 'pagamento', 'regras de acesso do banco'])
    assert.ok(fluxo.includes(c), `fluxo-sistema não cita a categoria: ${c}`)
  for (const c of ['security-auditor', 'varredura-seguranca', 'portao-seguranca.md', 'model: "opus"', '--registrar-revisao'])
    assert.ok(fluxo.includes(c), `fluxo-sistema não cita: ${c}`)
  const portao = ref('portao-seguranca.md')
  const linhas = portao.split(/\r?\n/).length
  assert.ok(linhas <= 101, `portao-seguranca.md com ${linhas} linhas (limite 100)`)
  for (const c of ['## Gravidade e fechamento', '## Não é achado', 'pendente de prova', 'confirmado', 'descartado',
    'usestrix/strix', 'anthropics/claude-code-security-review', 'ver NOTICE', 'git log -S', 'achadosAbertos'])
    assert.ok(portao.includes(c), `portao-seguranca.md não contém: ${c}`)
  for (const s of ['## Login', '## Permissão', '## Regras de acesso do banco', '## Envio de arquivo', '## Pagamento', '## Dados pessoais', '## Segredos'])
    assert.ok(portao.includes(s), `portao-seguranca.md sem a seção ${s}`)
  const links = portao.match(/https:\/\/cheatsheetseries\.owasp\.org\/cheatsheets\/[A-Za-z_]+\.html/g) ?? []
  assert.ok(links.length >= 6, `só ${links.length} links da OWASP`)
  // nomes de ferramentas internas do Strix não podem sobrar no trecho adaptado
  assert.doesNotMatch(portao, /create_vulnerability_report|record_coverage|agent_finish|open_proof_gap|ruled_out/)
  // exclusões da origem que contrariam o kit continuam sendo achado (conflitos C1, C4, C13)
  assert.match(portao, /Continuam sendo achado neste kit: segredo em arquivo versionado/)
  assert.match(fs.readFileSync(path.join(nucleo, 'agents', 'planejador.md'), 'utf8'), /Riscos de segurança/)
  assert.match(fs.readFileSync(path.join(nucleo, 'agents', 'revisor.md'), 'utf8'), /revisao-seguranca\.json/)
  assert.match(fs.readFileSync(path.join(nucleo, 'skills', 'subir', 'SKILL.md'), 'utf8'), /varredura-seguranca/)
  assert.ok(fs.existsSync(path.join(nucleo, 'hooks', 'mudanca-sensivel.mjs')), 'o fluxo cita um script que não existe')
})

// Parte 8: o arquiteto só lê e segue a skill de arquitetura.
test('arquiteto é só leitura, no Opus, e não empurra peça distribuída', () => {
  const a = fs.readFileSync(path.join(nucleo, 'agents', 'arquiteto.md'), 'utf8')
  assert.match(a, /^---\r?\nname: arquiteto\r?\ndescription: "[^"]{60,500}"\r?\nmodel: opus\r?\neffort: high\r?\ntools: Read, Grep, Glob, Bash\r?\n---/)
  for (const c of ['conferencia.md', 'modelo-decisao.md', '2 níveis', 'até 30 linhas', 'Não grave memória', 'dotnet-architect', 'database-architect'])
    assert.ok(a.includes(c), `arquiteto não cita: ${c}`)
  assert.match(a.replace(/\s+/g, ' '), /Não proponha microsserviço, fila, evento ou cache novo sem um problema/)
  assert.ok(skill.includes('`arquiteto`'), 'orquestrador não cita o arquiteto')
})
