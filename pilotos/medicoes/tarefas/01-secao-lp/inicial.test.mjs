import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('a página inicial e o CSS existem, sem dependências', () => {
  const ler = (nome) => readFileSync(new URL(nome, import.meta.url), 'utf8');
  assert.match(ler('index.html'), /<!doctype html>/i);
  assert.match(ler('index.html'), /href="styles.css"/);
  assert.ok(ler('styles.css').length > 0);
  const pacote = JSON.parse(ler('package.json'));
  assert.equal(Object.keys(pacote.dependencies ?? {}).length, 0);
  assert.equal(Object.keys(pacote.devDependencies ?? {}).length, 0);
});
