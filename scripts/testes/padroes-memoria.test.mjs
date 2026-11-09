// Históricos fictícios em pasta temporária. Rodar: node --test scripts/testes/padroes-memoria.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const padroes = path.join(raiz, 'plugins/devconductor-core/skills/memoria/padroes.mjs')
const hoje = Date.now()
const ts = (dias) => new Date(hoje - dias * 864e5).toISOString()
let n = 0
const msg = (texto, dias = 1, extra = {}) => ({ type: 'user', uuid: `u${++n}`, timestamp: ts(dias), message: { content: texto }, ...extra })

function preparar(t, sessoes) {
  const pasta = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'padroes '))
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }))
  const projeto = path.join(pasta, 'Sistema de Gestão')
  fs.mkdirSync(projeto)
  const config = path.join(pasta, 'config')
  const dir = path.join(config, 'projects', path.resolve(projeto).replace(/[^A-Za-z0-9]/g, '-'))
  fs.mkdirSync(dir, { recursive: true })
  for (const [nome, linhas] of Object.entries(sessoes)) fs.writeFileSync(path.join(dir, `${nome}.jsonl`), linhas.map((l) => JSON.stringify(l)).join('\n') + '\n')
  return (...extra) => {
    const r = spawnSync(process.execPath, [padroes, projeto, '--json', ...extra], { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: config } })
    assert.equal(r.status, 0, r.stderr)
    return JSON.parse(r.stdout)
  }
}

const C1 = 'nao era assim, a tabela de frete precisa mostrar o valor total no rodape'
const C2 = 'Não era assim: a tabela de frete tem que mostrar o valor total no rodapé'
const C3 = 'errado de novo, a tabela de frete precisa mostrar valor total no rodape'

test('correções repetidas: agrupa por semelhança, sem acento nem caixa, e respeita --min', (t) => {
  const rodar = preparar(t, {
    s1: [msg(C1)], s2: [msg(C2, 3)], s3: [msg('NÃO ERA assim o botão de exportar relatório mensal precisa ficar no topo', 4)],
    s4: [msg(C3, 5), msg(C3 + ' ', 5)],
  })
  const j = rodar()
  assert.equal(j.correcoes.length, 1)
  assert.equal(j.correcoes[0].sessoes, 3)
  assert.ok(j.correcoes[0].exemplos.length <= 2)
  assert.equal(rodar('--min', '4').correcoes.length, 0)
})

test('filtro de mensagens e dedupe por uuid entre sessões', (t) => {
  const igual = msg(C1)
  const lixo = [
    msg('<command-name>/clear</command-name>'), msg(C1, 1, { isMeta: true }),
    { type: 'user', uuid: 'tr', timestamp: ts(1), message: { content: [{ type: 'tool_result', content: C1 }] } },
    msg('This session is being continued from a previous conversation. ' + C1),
    msg('Background (from the session) ' + C1), msg(C1 + ' ' + 'x'.repeat(700)),
    msg(C1, 90),
  ]
  const rodar = preparar(t, { s1: [igual, ...lixo], s2: [igual], s3: [msg(C2, 2)] })
  const j = rodar()
  assert.equal(j.mensagensAnalisadas, 2)
  assert.equal(j.correcoes[0].mensagens, 2)
  assert.equal(j.correcoes[0].sessoes, 2)
})

test('pedidos repetidos exigem 3 sessões e palavras genéricas não formam grupo', (t) => {
  const pedido = (v) => `gerar o relatorio mensal de frete por motorista em planilha ${v}`
  const rodar = preparar(t, {
    s1: [msg(pedido('agora')), msg('sim'), msg('sobe'), msg('ok pode subir')], s2: [msg(pedido('hoje')), msg('sim'), msg('sobe')],
    s3: [msg(pedido('novamente')), msg('ok pode subir')], s4: [msg('sobe, ok, sim, pode subir')],
  })
  const j = rodar()
  assert.equal(j.pedidos.length, 1)
  assert.equal(j.pedidos[0].sessoes, 3)
  assert.match(j.pedidos[0].exemplos[0], /relatorio mensal/)
})

test('mascara e-mail, chave, CPF e CNPJ e corta o exemplo', (t) => {
  const sensivel = 'nunca mais use o e-mail joao.silva@exemplo.com.br com a chave sk-abc123def456ghi789 no cpf 123.456.789-09 e cnpj 12.345.678/0001-95 do cliente'
  const rodar = preparar(t, { s1: [msg(sensivel)], s2: [msg(sensivel.replace('mais ', ''), 2)] })
  const j = rodar()
  const texto = JSON.stringify(j)
  assert.equal(j.correcoes.length, 1)
  for (const proibido of ['joao.silva', 'sk-abc', '123.456.789-09', '12.345.678/0001-95']) assert.ok(!texto.includes(proibido), proibido)
  assert.ok(texto.includes('[email]') && texto.includes('[chave]') && texto.includes('[cpf]') && texto.includes('[cnpj]'))
  assert.ok(j.correcoes[0].exemplos.every((e) => e.length <= 160))
})

test('texto final lembra que nada entra na memória sem o sim', (t) => {
  const pasta = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'padroes '))
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }))
  const r = spawnSync(process.execPath, [padroes, pasta], { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: pasta } })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /São sugestões: nada entra na memória sem o sim do usuário\./)
})

test('mascara telefone, senha e caminho e ignora linha que não é objeto', (t) => {
  const sensivel = 'nunca mais use (11) 99876-5432 nem a senha é Abc12345 em C:\\Users\\pessoa\\pasta agora'
  const rodar = preparar(t, { s1: [msg(sensivel)], s2: [msg(sensivel.replace('mais ', ''), 2)] })
  const texto = JSON.stringify(rodar())
  for (const proibido of ['99876', 'Abc12345', 'pessoa']) assert.ok(!texto.includes(proibido), proibido)
})
