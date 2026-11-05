import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { criarServidor } from './servidor.mjs';

// Dados exclusivamente fictícios. Cada caso tem servidor e memória próprios.
const valido = { nome: 'Cliente Fictício', email: 'cliente@example.test', senha: 'teste-ficticio' };
async function abrir(t) {
  const servidor = criarServidor();
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    servidor.close((erro) => erro ? reject(erro) : resolve());
    servidor.closeAllConnections();
  }));
  return async (dados, rota = '/cadastros', metodo = 'POST', bruto = false) => {
    const resposta = await fetch(`http://127.0.0.1:${servidor.address().port}${rota}`, {
      method: metodo, headers: { 'content-type': 'application/json' },
      ...(metodo === 'GET' ? {} : { body: bruto ? dados : JSON.stringify(dados) }),
      signal: AbortSignal.timeout(3000),
    });
    assert.match(resposta.headers.get('content-type') ?? '', /^application\/json/);
    return { status: resposta.status, corpo: await resposta.json() };
  };
}
const erro = { status: 400, corpo: { erro: 'Dados inválidos' } };

test('cadastros válidos têm trim, ids sequenciais e nenhuma senha na resposta', async (t) => {
  const enviar = await abrir(t);
  assert.deepEqual(await enviar({ ...valido, nome: '  Cliente Fictício  ', email: ' cliente@example.test ' }), {
    status: 201, corpo: { id: 1, nome: valido.nome, email: valido.email },
  });
  assert.deepEqual(await enviar(valido), { status: 201, corpo: { id: 2, nome: valido.nome, email: valido.email } });
  for (const [nome, senha] of [['AB', '12345678'], ['A'.repeat(80), 's'.repeat(64)]]) {
    assert.equal((await enviar({ ...valido, nome, senha })).status, 201);
  }
});

test('nome inválido ou ausente é rejeitado', async (t) => {
  const enviar = await abrir(t);
  for (const nome of [undefined, null, 42, [], {}, '', ' A ', 'A'.repeat(81)]) {
    assert.deepEqual(await enviar({ ...valido, nome }), erro);
  }
});

test('email inválido ou ausente é rejeitado', async (t) => {
  const enviar = await abrir(t);
  for (const email of [undefined, null, 42, [], {}, '', 'sem-arroba', '@example.test', 'a@dominio', 'a b@example.test', 'a@@example.test']) {
    assert.deepEqual(await enviar({ ...valido, email }), erro);
  }
});

test('senha inválida é rejeitada e espaços contam no limite', async (t) => {
  const enviar = await abrir(t);
  for (const senha of [undefined, null, 42, [], {}, '', '1234567', 's'.repeat(65)]) {
    assert.deepEqual(await enviar({ ...valido, senha }), erro);
  }
  assert.equal((await enviar({ ...valido, senha: ' 123456 ' })).status, 201);
});

test('JSON quebrado ou corpo que não seja objeto é rejeitado', async (t) => {
  const enviar = await abrir(t);
  for (const corpo of ['{', '', 'null', '[]', '42', '"texto"', '{}']) {
    assert.deepEqual(await enviar(corpo, '/cadastros', 'POST', true), erro);
  }
});

test('rota ou método não suportado retorna 404 em JSON', async (t) => {
  const enviar = await abrir(t);
  const esperado = { status: 404, corpo: { erro: 'Não encontrado' } };
  assert.deepEqual(await enviar(valido, '/outra'), esperado);
  assert.deepEqual(await enviar(undefined, '/cadastros', 'GET'), esperado);
  assert.deepEqual(await enviar(valido, '/cadastros', 'PUT'), esperado);
});
