import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { pedirHttpTeste, aguardarHttpTeste } from '../lib/http-teste.mjs'
import { criarEscopoProcessos } from '../lib/processos-teste.mjs'

async function servir(t, atender) {
  const s = http.createServer(atender)
  await new Promise((resolve, reject) => { s.once('error', reject); s.listen(0, '127.0.0.1', resolve) })
  t.after(async () => { s.closeAllConnections(); await new Promise(resolve => s.close(resolve)) })
  return s.address().port
}
test('preserva status, tipo, corpo e JSON inclusive nas respostas de erro', async t => {
  const porta = await servir(t, (q, r) => {
    assert.equal(q.method, 'POST'); assert.equal(q.url, '/cadastros')
    assert.equal(q.headers['content-type'], 'application/json')
    r.writeHead(400, { 'content-type': 'application/json' }); r.end('{"erro":"Dados inválidos"}')
  })
  const r = await pedirHttpTeste(porta, 'POST', '/cadastros', '{"nome":"Teste"}')
  assert.equal(r.status, 400); assert.equal(r.tipo, 'application/json')
  assert.deepEqual(r.json, { erro: 'Dados inválidos' }); assert.equal(r.texto, '{"erro":"Dados inválidos"}')
})
test('corpo não JSON retorna evidência em vez de esconder a resposta', async t => {
  const porta = await servir(t, (q, r) => { r.writeHead(502); r.end('resposta inválida') })
  const r = await pedirHttpTeste(porta, 'GET', '/')
  assert.equal(r.status, 502); assert.equal(r.json, undefined); assert.equal(r.texto, 'resposta inválida')
})
test('corpo truncado rejeita a promise e alcança o finally de limpeza', async t => {
  const porta = await servir(t, (q, r) => {
    r.writeHead(200, { 'content-type': 'application/json', 'content-length': 999 }); r.flushHeaders(); r.write('{"parcial":')
    setTimeout(() => r.destroy(), 30)
  })
  const processos = criarEscopoProcessos()
  const p = processos.iniciarNode(['-e', 'console.log("pronto");setInterval(()=>{},1000)'])
  p.stdout.resume(); p.stderr.resume()
  let limpou = false
  try {
    await assert.rejects(pedirHttpTeste(porta, 'GET', '/'))
  } finally { await processos.encerrar(); limpou = true }
  assert(limpou); assert(p.exitCode !== null || p.signalCode !== null)
})
test('prazo também aborta quando o servidor nunca envia headers', async t => {
  const porta = await servir(t, () => {})
  await assert.rejects(pedirHttpTeste(porta, 'GET', '/', undefined, undefined, { tempoLimiteMs: 100 }),
    e => ['TimeoutError', 'AbortError'].includes(e.name))
})
test('prazo inclui leitura do corpo mesmo depois dos headers', async t => {
  const porta = await servir(t, (q, r) => { r.writeHead(200); r.flushHeaders(); r.write('corpo sem fim') })
  await assert.rejects(pedirHttpTeste(porta, 'GET', '/', undefined, undefined, { tempoLimiteMs: 100 }),
    e => ['TimeoutError', 'AbortError'].includes(e.name))
})
test('não segue redirecionamento para outro servidor', async t => {
  let chamadas = 0
  const destino = await servir(t, (q, r) => { chamadas++; r.end('não deveria chegar') })
  const porta = await servir(t, (q, r) => { r.writeHead(302, { location: `http://127.0.0.1:${destino}/` }); r.end() })
  assert.equal((await pedirHttpTeste(porta, 'GET', '/')).status, 302)
  assert.equal(chamadas, 0)
})
test('rejeita porta, prazo e rota inválidos sem tentar conexão', async () => {
  await assert.rejects(pedirHttpTeste(0, 'GET', '/'), /Porta/)
  await assert.rejects(pedirHttpTeste(1234, 'GET', '/', undefined, undefined, { tempoLimiteMs: 0 }), /Prazo/)
  await assert.rejects(pedirHttpTeste(1234, 'GET', 'http://example.test/'), /Rota/)
})

test('prontidão repete respostas temporárias dentro do prazo total', async t => {
  let n = 0
  const porta = await servir(t, (q, r) => { r.writeHead(++n < 2 ? 503 : 200); r.end('pronto') })
  assert.equal((await aguardarHttpTeste(porta, '/', undefined, { tempoLimiteMs: 2000, intervaloMs: 5 })).status, 200)
  assert.equal(n, 2)
})
test('prontidão aceita contrato HTTP da API sem exigir status 200', async t => {
  const porta = await servir(t, (q, r) => { r.writeHead(404, { 'content-type': 'application/json' }); r.end('{"erro":"Não encontrado"}') })
  const r = await aguardarHttpTeste(porta, '/inexistente', r => r.status === 404 && r.json?.erro === 'Não encontrado')
  assert.equal(r.status, 404)
})
test('prontidão tem prazo total mesmo quando uma conexão nunca responde', { timeout: 3000 }, async t => {
  const porta = await servir(t, () => {})
  await assert.rejects(aguardarHttpTeste(porta, '/', undefined, { tempoLimiteMs: 100, intervaloMs: 5 }), /não ficou pronto/)
})
test('erro no critério de prontidão é devolvido sem ser escondido por repetição', async t => {
  const porta = await servir(t, (q, r) => r.end('pronto'))
  await assert.rejects(aguardarHttpTeste(porta, '/', () => { throw Error('Erro do revisor') }), /Erro do revisor/)
})
