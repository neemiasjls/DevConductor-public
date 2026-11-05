import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('a ajuda isolada explica o uso e termina sem erro', () => {
  const cli = fileURLToPath(new URL('./auditar.mjs', import.meta.url));
  const resultado = spawnSync(process.execPath, [cli, '--ajuda'], {
    encoding: 'utf8', shell: false, windowsHide: true, timeout: 10_000,
  });
  assert.equal(resultado.error, undefined);
  assert.equal(resultado.signal, null);
  assert.equal(resultado.status, 0);
  assert.equal(resultado.stdout, 'Uso: node auditar.mjs <diretorio> <saida.json>\n' +
    'Audita manifestos JSON e gera um relatório de dependências.\n' +
    'Opção: --ajuda\n');
  assert.equal(resultado.stderr, '');
});
