import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('relatorio.mjs', import.meta.url));
const cabecalho = 'categoria;quantidade;valor_unitario\n';
const executar = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 5000 });
function preparar(t, csv) {
  const pasta = mkdtempSync(join(tmpdir(), 'medicao-csv-'));
  t.after(() => rmSync(pasta, { recursive: true, force: true }));
  const entrada = join(pasta, 'entrada.csv');
  const saida = join(pasta, 'saida.json');
  if (csv !== undefined) writeFileSync(entrada, csv, 'utf8');
  return { entrada, saida };
}
function sucesso(entrada, saida) {
  const r = executar(entrada, saida);
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(readFileSync(saida, 'utf8'));
}
function falha(r, mensagem) {
  assert.equal(r.error, undefined);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, mensagem);
}

test('exemplo fictício tem totais exatos e não altera entrada', (t) => {
  const csv = readFileSync(new URL('vendas.csv', import.meta.url), 'utf8');
  const { entrada, saida } = preparar(t, csv);
  assert.deepEqual(sucesso(entrada, saida), {
    linhas: 5, quantidade: 11, totalCentavos: 15000,
    categorias: [
      { categoria: 'Acessórios', quantidade: 3, totalCentavos: 3000 },
      { categoria: 'Peças', quantidade: 6, totalCentavos: 5500 },
      { categoria: 'Revisão', quantidade: 2, totalCentavos: 6500 },
    ],
  });
  assert.equal(readFileSync(entrada, 'utf8'), csv);
});

test('BOM, CRLF, vazios, ordenação, centavos e cabeçalho sem vendas', (t) => {
  const { entrada, saida } = preparar(t, '\uFEFF' + cabecalho.replace('\n', '\r\n') + '\r\n Z ;1;0.10\r\nA;2;0.20\r\nZ;1;0.00\r\n   \r\n');
  assert.deepEqual(sucesso(entrada, saida), {
    linhas: 3, quantidade: 4, totalCentavos: 50,
    categorias: [{ categoria: 'A', quantidade: 2, totalCentavos: 40 }, { categoria: 'Z', quantidade: 2, totalCentavos: 10 }],
  });
  writeFileSync(entrada, cabecalho);
  assert.deepEqual(sucesso(entrada, saida), { linhas: 0, quantidade: 0, totalCentavos: 0, categorias: [] });
});

test('CSV inválido falha sem criar ou sobrescrever saída', (t) => {
  const { entrada, saida } = preparar(t);
  const invalidos = ['', 'errado\nA;1;1.00', ...[
    ';1;1.00', 'A;0;1.00', 'A;-1;1.00', 'A;1.5;1.00', 'A; 1;1.00',
    'A;1;-1.00', 'A;1;1,00', 'A;1;1.0', 'A;1;NaN', 'A;1;Infinity',
    'A;1', 'A;1;1.00;extra', '"A";1;1.00',
    'A;9007199254740992;0.00', 'A;1;9007199254740992.00',
    'A;9007199254740991;0.00\nA;1;0.00',
    'A;1;90071992547409.91\nA;1;0.01',
  ].map((linha) => cabecalho + linha)];
  for (const csv of invalidos) {
    writeFileSync(entrada, csv);
    for (const preexistente of [false, true]) {
      rmSync(saida, { force: true });
      if (preexistente) writeFileSync(saida, 'preservar');
      falha(executar(entrada, saida), /CSV inválido/);
      if (preexistente) assert.equal(readFileSync(saida, 'utf8'), 'preservar');
      else assert.equal(existsSync(saida), false);
    }
    assert.equal(readFileSync(entrada, 'utf8'), csv);
  }
});

test('arquivo ausente falha sem tocar a saída', (t) => {
  const { entrada, saida } = preparar(t);
  falha(executar(entrada, saida), /Falha ao ler CSV/);
  assert.equal(existsSync(saida), false);
  writeFileSync(saida, 'preservar');
  falha(executar(entrada, saida), /Falha ao ler CSV/);
  assert.equal(readFileSync(saida, 'utf8'), 'preservar');
});

test('argumentos incorretos falham com instrução de uso', (t) => {
  const { entrada, saida } = preparar(t, cabecalho);
  for (const args of [[], [entrada], [entrada, saida, 'extra'], ['--ajuda', saida]]) {
    falha(executar(...args), /Uso:/);
    assert.equal(existsSync(saida), false);
  }
});
