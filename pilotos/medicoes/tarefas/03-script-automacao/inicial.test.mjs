import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('o script inicia e explica seu uso sem dependências', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('relatorio.mjs', import.meta.url)), '--ajuda'], { encoding: 'utf8', timeout: 5000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Uso: node relatorio\.mjs <entrada\.csv> <saida\.json>/);
});
