import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MATRIZ = dirname(fileURLToPath(import.meta.url));
const CLI = join(MATRIZ, 'auditar.mjs');
const TEMPORARIOS = resolve(MATRIZ, '..', '..', '..', 'testes-temporarios');
const SAIDA_ANTIGA = Buffer.from('relatório anterior: preservar estes bytes\r\n', 'utf8');

function contido(raiz, alvo) {
  const caminho = relative(raiz, alvo);
  return caminho !== '' && caminho !== '..' && !caminho.startsWith(`..${sep}`) && !isAbsolute(caminho);
}

async function apagarSeguro(alvo) {
  const [raizReal, alvoReal] = await Promise.all([realpath(TEMPORARIOS), realpath(alvo)]);
  assert.ok(contido(raizReal, alvoReal), 'a limpeza precisa ficar em pilotos/testes-temporarios');
  assert.ok(alvoReal.startsWith(join(raizReal, 'catalogo-integrado-')), 'prefixo exclusivo do teste');
  await rm(alvoReal, { recursive: true, force: true });
}

async function fotografar(diretorio) {
  const itens = [];
  async function visitar(atual, prefixo) {
    const entradas = (await readdir(atual, { withFileTypes: true })).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entrada of entradas) {
      const nome = `${prefixo}${entrada.name}`;
      if (entrada.isDirectory()) {
        itens.push([`${nome}/`, 'diretorio']);
        await visitar(join(atual, entrada.name), `${nome}/`);
      } else {
        itens.push([nome, (await readFile(join(atual, entrada.name))).toString('base64')]);
      }
    }
  }
  await visitar(diretorio, '');
  return itens;
}

function executar(argumentos, cwd = MATRIZ, opcoesNode = []) {
  const resultado = spawnSync(process.execPath, [...opcoesNode, CLI, ...argumentos], {
    cwd, encoding: 'utf8', shell: false, windowsHide: true, timeout: 10_000, maxBuffer: 1_048_576,
  });
  assert.equal(resultado.error, undefined, 'o processo precisa iniciar e terminar no prazo');
  assert.equal(resultado.signal, null, 'o processo não deve terminar por sinal');
  return resultado;
}

function caso(nome, trabalho) {
  test(nome, async () => {
    await mkdir(TEMPORARIOS, { recursive: true });
    const raiz = await mkdtemp(join(TEMPORARIOS, 'catalogo-integrado-'));
    try {
      const entrada = join(raiz, 'entrada');
      const saida = join(raiz, 'saida.json');
      await mkdir(entrada);
      await writeFile(saida, SAIDA_ANTIGA);
      await trabalho({ raiz, entrada, saida });
    } finally {
      await apagarSeguro(raiz);
    }
  });
}

async function manifesto(contexto, arquivo, nome, dependeDe = [], versao = '1.0.0') {
  await writeFile(join(contexto.entrada, arquivo), JSON.stringify({ nome, versao, dependeDe }));
}

function pacote(nome, versao = '1.0.0', diretas = [], transitivas = diretas) {
  return { nome, versao, dependenciasDiretas: diretas, dependenciasTransitivas: transitivas };
}

async function sucesso(contexto, esperado, argumentos = [contexto.entrada, contexto.saida], cwd = MATRIZ) {
  const antes = await fotografar(contexto.entrada);
  const resultado = executar(argumentos, cwd);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(resultado.stdout, '');
  assert.equal(resultado.stderr, '');
  const texto = await readFile(contexto.saida, 'utf8');
  assert.deepEqual(JSON.parse(texto), esperado);
  assert.equal(texto, `${JSON.stringify(esperado, null, 2)}\n`, 'serialização exata e LF final');
  assert.deepEqual(await fotografar(contexto.entrada), antes, 'a entrada deve ficar intacta');
  return texto;
}

async function falha(contexto, argumentos, mensagem, opcoesNode = []) {
  const antes = await fotografar(contexto.entrada);
  const resultado = executar(argumentos, MATRIZ, opcoesNode);
  assert.equal(resultado.status, 1);
  assert.equal(resultado.stdout, '');
  assert.equal(resultado.stderr, `Erro: ${mensagem}\n`);
  assert.deepEqual(await readFile(contexto.saida), SAIDA_ANTIGA, 'preservar a saída anterior byte a byte');
  assert.deepEqual(await fotografar(contexto.entrada), antes, 'não alterar a entrada na falha');
}

async function formatoInvalido(contexto, valor) {
  await writeFile(join(contexto.entrada, 'pacote.json'), JSON.stringify(valor));
  await falha(contexto, [contexto.entrada, contexto.saida], 'manifesto inválido: pacote.json.');
}

caso('01 - audita os 15 manifestos originais com o relatório completo', async (c) => {
  await cp(join(MATRIZ, 'dados', 'catalogo'), c.entrada, { recursive: true });
  const nomes = ['alicerce', 'boia', 'cais', 'duna', 'estaleiro', 'farol', 'gaivota', 'horizonte',
    'ilha', 'jangada', 'leme', 'mare', 'navio', 'oceano', 'porto'];
  await sucesso(c, {
    pacotes: [
      pacote('alicerce'), pacote('boia', '0.0.0'), pacote('cais', '1.2.0', ['alicerce']),
      pacote('duna', '2.0.1', ['alicerce', 'boia']),
      pacote('estaleiro', '3.1.0', ['cais', 'duna'], ['alicerce', 'boia', 'cais', 'duna']),
      pacote('farol', '0.4.2', ['cais'], ['alicerce', 'cais']),
      pacote('gaivota', '1.0.3', ['boia']),
      pacote('horizonte', '4.2.0', ['duna', 'gaivota'], ['alicerce', 'boia', 'duna', 'gaivota']),
      pacote('ilha', '2.7.1', ['estaleiro', 'farol'], ['alicerce', 'boia', 'cais', 'duna', 'estaleiro', 'farol']),
      pacote('jangada', '0.8.0', ['gaivota'], ['boia', 'gaivota']),
      pacote('leme', '5.0.0', ['horizonte', 'ilha'],
        ['alicerce', 'boia', 'cais', 'duna', 'estaleiro', 'farol', 'gaivota', 'horizonte', 'ilha']),
      pacote('mare', '1.6.4', ['ilha', 'jangada'],
        ['alicerce', 'boia', 'cais', 'duna', 'estaleiro', 'farol', 'gaivota', 'ilha', 'jangada']),
      pacote('navio', '2.0.0', ['leme', 'mare'],
        ['alicerce', 'boia', 'cais', 'duna', 'estaleiro', 'farol', 'gaivota', 'horizonte', 'ilha', 'jangada', 'leme', 'mare']),
      pacote('oceano', '1.3.5', ['horizonte', 'navio'],
        ['alicerce', 'boia', 'cais', 'duna', 'estaleiro', 'farol', 'gaivota', 'horizonte', 'ilha', 'jangada', 'leme', 'mare', 'navio']),
      pacote('porto', '6.1.0', ['farol', 'oceano'],
        ['alicerce', 'boia', 'cais', 'duna', 'estaleiro', 'farol', 'gaivota', 'horizonte', 'ilha', 'jangada', 'leme', 'mare', 'navio', 'oceano']),
    ],
    ordemTopologica: nomes,
  });
});

caso('02 - ordena pacotes pelo nome e não pelo nome do arquivo', async (c) => {
  await manifesto(c, '00-z.json', 'zeta');
  await manifesto(c, '99-a.json', 'alfa');
  await sucesso(c, { pacotes: [pacote('alfa'), pacote('zeta')], ordemTopologica: ['alfa', 'zeta'] });
});

caso('03 - Kahn considera imediatamente o menor nome recém-liberado', async (c) => {
  await manifesto(c, 'a.json', 'a', ['b']);
  await manifesto(c, 'b.json', 'b');
  await manifesto(c, 'c.json', 'c');
  await sucesso(c, { pacotes: [pacote('a', '1.0.0', ['b']), pacote('b'), pacote('c')], ordemTopologica: ['b', 'a', 'c'] });
});

caso('04 - fecho transitivo remove repetições sem remover dependências diretas', async (c) => {
  await manifesto(c, 'a.json', 'a');
  await manifesto(c, 'b.json', 'b', ['a']);
  await manifesto(c, 'c.json', 'c', ['b', 'a']);
  await manifesto(c, 'd.json', 'd', ['c', 'b']);
  await sucesso(c, { pacotes: [pacote('a'), pacote('b', '1.0.0', ['a']), pacote('c', '1.0.0', ['a', 'b']),
    pacote('d', '1.0.0', ['b', 'c'], ['a', 'b', 'c'])], ordemTopologica: ['a', 'b', 'c', 'd'] });
});

caso('05 - diretório vazio é um catálogo válido', async (c) => {
  await sucesso(c, { pacotes: [], ordemTopologica: [] });
});

caso('06 - ignora outras extensões e não percorre subdiretórios', async (c) => {
  await manifesto(c, 'valido.json', 'valido');
  await writeFile(join(c.entrada, 'ignorado.txt'), '{');
  await writeFile(join(c.entrada, 'tambem-ignorado.JSON'), '{');
  await mkdir(join(c.entrada, 'subdiretorio'));
  await writeFile(join(c.entrada, 'subdiretorio', 'quebrado.json'), '{');
  await sucesso(c, { pacotes: [pacote('valido')], ordemTopologica: ['valido'] });
});

caso('07 - chamadas repetidas produzem bytes idênticos com LF final', async (c) => {
  await manifesto(c, 'z.json', 'z', ['a']);
  await manifesto(c, 'a.json', 'a');
  const esperado = { pacotes: [pacote('a'), pacote('z', '1.0.0', ['a'])], ordemTopologica: ['a', 'z'] };
  assert.equal(await sucesso(c, esperado), await sucesso(c, esperado));
});

caso('08 - aceita caminhos relativos com espaços e acentos', async (c) => {
  const entrada = join(c.raiz, 'catálogo com espaços');
  await mkdir(entrada);
  c.entrada = entrada;
  c.saida = join(c.raiz, 'saída final.json');
  await writeFile(c.saida, SAIDA_ANTIGA);
  await manifesto(c, 'pacote com acento á.json', 'exemplo');
  await sucesso(c, { pacotes: [pacote('exemplo')], ordemTopologica: ['exemplo'] },
    ['catálogo com espaços', 'saída final.json'], c.raiz);
});

caso('09 - preserva a formatação e os bytes originais dos manifestos', async (c) => {
  await writeFile(join(c.entrada, 'original.json'), ' {\r\n "dependeDe" : [], "versao":"1.0.0", "nome":"original" } \r\n');
  await sucesso(c, { pacotes: [pacote('original')], ordemTopologica: ['original'] });
});

caso('10 - substitui saída antiga apenas após uma auditoria válida', async (c) => {
  await manifesto(c, 'pacote.json', 'novo');
  await sucesso(c, { pacotes: [pacote('novo')], ordemTopologica: ['novo'] });
  assert.notDeepEqual(await readFile(c.saida), SAIDA_ANTIGA);
});

caso('11 - rejeita ausência de argumentos', async (c) => {
  await falha(c, [], 'argumentos inválidos.');
});

caso('12 - rejeita um único caminho', async (c) => {
  await falha(c, [c.entrada], 'argumentos inválidos.');
});

caso('13 - rejeita argumento excedente', async (c) => {
  await falha(c, [c.entrada, c.saida, 'extra'], 'argumentos inválidos.');
});

caso('14 - ajuda não pode ser combinada com caminho', async (c) => {
  await falha(c, ['--ajuda', c.saida], 'argumentos inválidos.');
});

caso('15 - rejeita opção desconhecida', async (c) => {
  await falha(c, ['--desconhecida', c.saida], 'argumentos inválidos.');
});

caso('16 - rejeita argumento vazio', async (c) => {
  await falha(c, ['', c.saida], 'argumentos inválidos.');
});

caso('17 - rejeita diretório de entrada inexistente', async (c) => {
  await falha(c, [join(c.raiz, 'inexistente'), c.saida], 'diretório de entrada inválido.');
});

caso('18 - rejeita arquivo comum usado como diretório de entrada', async (c) => {
  const arquivo = join(c.raiz, 'arquivo.txt');
  await writeFile(arquivo, 'não é diretório');
  await falha(c, [arquivo, c.saida], 'diretório de entrada inválido.');
});

caso('19 - rejeita saída que substituiria um manifesto da entrada', async (c) => {
  await manifesto(c, 'pacote.json', 'pacote');
  await falha(c, [c.entrada, join(c.entrada, 'pacote.json')], 'saída dentro da entrada.');
});

caso('20 - rejeita saída em subdiretório da entrada', async (c) => {
  await mkdir(join(c.entrada, 'interno'));
  await falha(c, [c.entrada, join(c.entrada, 'interno', 'saida.json')], 'saída dentro da entrada.');
});

caso('21 - rejeita pai de saída inexistente sem criá-lo', async (c) => {
  await falha(c, [c.entrada, join(c.raiz, 'pai-ausente', 'saida.json')], 'destino de saída inválido.');
  await assert.rejects(readdir(join(c.raiz, 'pai-ausente')), { code: 'ENOENT' });
});

caso('22 - rejeita diretório usado como destino de saída', async (c) => {
  const destino = join(c.raiz, 'destino');
  await mkdir(destino);
  await falha(c, [c.entrada, destino], 'destino de saída inválido.');
});

caso('23 - rejeita JSON quebrado sem substituir a saída', async (c) => {
  await writeFile(join(c.entrada, 'quebrado.json'), '{"nome":');
  await falha(c, [c.entrada, c.saida], 'JSON inválido: quebrado.json.');
});

caso('24 - entrada com sufixo .json precisa ser arquivo regular', async (c) => {
  await mkdir(join(c.entrada, 'pasta.json'));
  await falha(c, [c.entrada, c.saida], 'arquivo ilegível: pasta.json.');
});

caso('25 - rejeita null como manifesto', async (c) => { await formatoInvalido(c, null); });
caso('26 - rejeita array como manifesto', async (c) => { await formatoInvalido(c, []); });
caso('27 - rejeita campo obrigatório ausente', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: '1.0.0' });
});
caso('28 - rejeita propriedade adicional', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: '1.0.0', dependeDe: [], extra: true });
});
caso('29 - rejeita nome com maiúscula', async (c) => {
  await formatoInvalido(c, { nome: 'Pacote', versao: '1.0.0', dependeDe: [] });
});
caso('30 - rejeita nome com sublinhado', async (c) => {
  await formatoInvalido(c, { nome: 'meu_pacote', versao: '1.0.0', dependeDe: [] });
});
caso('31 - rejeita nome com 65 caracteres', async (c) => {
  await formatoInvalido(c, { nome: 'a'.repeat(65), versao: '1.0.0', dependeDe: [] });
});
caso('32 - rejeita versão com zero inicial', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: '01.2.3', dependeDe: [] });
});
caso('33 - rejeita versão com pré-lançamento', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: '1.2.3-beta', dependeDe: [] });
});
caso('34 - rejeita versão numérica', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: 1, dependeDe: [] });
});
caso('35 - rejeita versão com dois componentes', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: '1.2', dependeDe: [] });
});
caso('36 - rejeita dependeDe que não é array', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: '1.0.0', dependeDe: 'outro' });
});
caso('37 - rejeita dependência que não é string', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: '1.0.0', dependeDe: [42] });
});
caso('38 - rejeita dependência fora do formato de slug', async (c) => {
  await formatoInvalido(c, { nome: 'pacote', versao: '1.0.0', dependeDe: ['-outro'] });
});

caso('39 - rejeita nome de pacote duplicado entre arquivos', async (c) => {
  await manifesto(c, 'primeiro.json', 'repetido', [], '1.0.0');
  await manifesto(c, 'segundo.json', 'repetido', [], '2.0.0');
  await falha(c, [c.entrada, c.saida], 'nome duplicado: repetido.');
});

caso('40 - rejeita dependência repetida mesmo quando ela existe', async (c) => {
  await manifesto(c, 'a.json', 'a');
  await manifesto(c, 'b.json', 'b', ['a', 'a']);
  await falha(c, [c.entrada, c.saida], 'dependência duplicada: b -> a.');
});

caso('41 - rejeita dependência ausente com o menor nome problemático', async (c) => {
  await manifesto(c, 'pacote.json', 'pacote', ['zeta', 'alfa']);
  await falha(c, [c.entrada, c.saida], 'dependência ausente: pacote -> alfa.');
});

caso('42 - rejeita autorreferência', async (c) => {
  await manifesto(c, 'a.json', 'a', ['a']);
  await falha(c, [c.entrada, c.saida], 'ciclo de dependências.');
});

caso('43 - rejeita ciclo de dois pacotes', async (c) => {
  await manifesto(c, 'a.json', 'a', ['b']);
  await manifesto(c, 'b.json', 'b', ['a']);
  await falha(c, [c.entrada, c.saida], 'ciclo de dependências.');
});

caso('44 - rejeita ciclo em componente desconectado de uma raiz válida', async (c) => {
  await manifesto(c, 'a.json', 'a');
  await manifesto(c, 'b.json', 'b', ['c']);
  await manifesto(c, 'c.json', 'c', ['d']);
  await manifesto(c, 'd.json', 'd', ['b']);
  await falha(c, [c.entrada, c.saida], 'ciclo de dependências.');
});

caso('45 - primeiro erro de arquivo segue ordem ordinal dos nomes', async (c) => {
  await writeFile(join(c.entrada, 'z.json'), 'null');
  await writeFile(join(c.entrada, 'a.json'), '{');
  await falha(c, [c.entrada, c.saida], 'JSON inválido: a.json.');
});

caso('46 - aceita slug de 64 caracteres e hífen interno', async (c) => {
  const nome = `a-${'b'.repeat(62)}`;
  await manifesto(c, 'limite.json', nome);
  await sucesso(c, { pacotes: [pacote(nome)], ordemTopologica: [nome] });
});

caso('47 - preserva componentes de versão acima da precisão numérica', async (c) => {
  const versao = '999999999999999999999999999999.0.12345678901234567890';
  await manifesto(c, 'grande.json', 'grande', [], versao);
  await sucesso(c, { pacotes: [pacote('grande', versao)], ordemTopologica: ['grande'] });
});

caso('48 - valida todos os formatos antes de procurar nomes duplicados', async (c) => {
  await manifesto(c, 'a.json', 'repetido');
  await manifesto(c, 'b.json', 'repetido');
  await writeFile(join(c.entrada, 'z.json'), 'null');
  await falha(c, [c.entrada, c.saida], 'manifesto inválido: z.json.');
});

caso('49 - cria um relatório completo quando a saída ainda não existe', async (c) => {
  await rm(c.saida);
  await manifesto(c, 'novo.json', 'novo');
  await sucesso(c, { pacotes: [pacote('novo')], ordemTopologica: ['novo'] });
});

caso('50 - dados inválidos não criam uma saída inexistente', async (c) => {
  await rm(c.saida);
  await writeFile(join(c.entrada, 'quebrado.json'), '{');
  const antes = await fotografar(c.entrada);
  const resultado = executar([c.entrada, c.saida]);
  assert.equal(resultado.status, 1);
  assert.equal(resultado.stdout, '');
  assert.equal(resultado.stderr, 'Erro: JSON inválido: quebrado.json.\n');
  await assert.rejects(readFile(c.saida), { code: 'ENOENT' });
  assert.deepEqual(await fotografar(c.entrada), antes);
});

caso('51 - normaliza pontos e ascendentes antes de rejeitar saída na entrada', async (c) => {
  await mkdir(join(c.raiz, 'atalhos'));
  await mkdir(join(c.entrada, 'interno'));
  const entrada = `${c.raiz}${sep}atalhos${sep}..${sep}entrada${sep}.`;
  const saida = `${c.entrada}${sep}interno${sep}..${sep}saida.json`;
  await falha(c, [entrada, saida], 'saída dentro da entrada.');
});

caso('52 - aceita diretório vizinho cujo nome começa pelo nome da entrada', async (c) => {
  const vizinho = join(c.raiz, 'entrada-vizinha');
  await mkdir(vizinho);
  c.saida = join(vizinho, 'saida.json');
  await writeFile(c.saida, SAIDA_ANTIGA);
  await manifesto(c, 'pacote.json', 'pacote');
  await sucesso(c, { pacotes: [pacote('pacote')], ordemTopologica: ['pacote'] });
});

caso('53 - falha de gravação preserva a saída antiga e remove temporários', async (c) => {
  await manifesto(c, 'pacote.json', 'pacote');
  const preload = join(c.raiz, 'falha-gravacao.mjs');
  // A falha é local ao processo filho e ao destino. Leituras e temporários continuam funcionando.
  await writeFile(preload, `
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
const destino = resolve(process.argv[3]);
const raiz = dirname(destino);
process.env.TEMP = raiz; process.env.TMP = raiz; process.env.TMPDIR = raiz;
const gravarMarca = fs.writeFileSync;
const erro = () => {
  gravarMarca(join(raiz, 'eio-observado.txt'), 'EIO no destino\\n');
  return Object.assign(new Error('falha de gravação simulada'), { code: 'EIO' });
};
const mesmoDestino = caminho => {
  if (caminho instanceof URL) caminho = fileURLToPath(caminho);
  if (Buffer.isBuffer(caminho)) caminho = caminho.toString();
  return typeof caminho === 'string' && resolve(caminho) === destino;
};
const escrita = flags => typeof flags === 'number'
  ? !!(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND))
  : /[wa+]/.test(flags || 'r');
for (const [nome, indice] of [['writeFile', 0], ['appendFile', 0], ['truncate', 0], ['open', 0],
  ['rename', 1], ['copyFile', 1], ['link', 1]]) {
  const falhar = args => mesmoDestino(args[indice]) && (nome !== 'open' || escrita(args[1]));
  const promessa = fs.promises[nome];
  fs.promises[nome] = async function (...args) {
    if (falhar(args)) throw erro();
    return Reflect.apply(promessa, this, args);
  };
  const callback = fs[nome];
  fs[nome] = function (...args) {
    if (falhar(args)) {
      const falha = erro(); queueMicrotask(() => args.at(-1)(falha)); return;
    }
    return Reflect.apply(callback, this, args);
  };
  const sincrona = fs[nome + 'Sync'];
  fs[nome + 'Sync'] = function (...args) {
    if (falhar(args)) throw erro();
    return Reflect.apply(sincrona, this, args);
  };
}
const fluxo = fs.createWriteStream;
fs.createWriteStream = function (caminho, ...args) {
  if (!mesmoDestino(caminho)) return Reflect.apply(fluxo, this, [caminho, ...args]);
  const falha = erro(), stream = new PassThrough();
  queueMicrotask(() => stream.destroy(falha));
  return stream;
};
syncBuiltinESMExports();
`);
  await falha(c, [c.entrada, c.saida], 'não foi possível gravar a saída.',
    ['--import', pathToFileURL(preload).href]);
  assert.equal(await readFile(join(c.raiz, 'eio-observado.txt'), 'utf8'), 'EIO no destino\n',
    'a execução precisa alcançar uma tentativa real de escrita ou substituição do destino');
  assert.deepEqual((await readdir(c.raiz)).sort(),
    ['eio-observado.txt', 'entrada', 'falha-gravacao.mjs', 'saida.json'], 'não deixar temporários após a falha');
});
