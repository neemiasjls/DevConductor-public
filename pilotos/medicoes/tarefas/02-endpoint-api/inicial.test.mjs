import test from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { criarServidor } from './servidor.mjs';

test('a fábrica cria um servidor HTTP sem abrir porta ao importar', () => {
  const servidor = criarServidor();
  assert.ok(servidor instanceof Server);
  assert.equal(servidor.listening, false);
});
