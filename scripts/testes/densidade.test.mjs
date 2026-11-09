import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { contarPalavras, medirTela, avaliar, LIMITES_PADRAO } from '../../plugins/landing-pages/skills/lp-revisao/scripts/densidade-regras.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins/landing-pages/skills/lp-revisao/scripts/densidade.mjs')

test('conta palavras com letras ou algarismos, ignorando sinais soltos', () => {
  assert.equal(contarPalavras('Coletamos frio. Viajamos frio.'), 4)
  assert.equal(contarPalavras('−18 °C · máx. −16,8 °C'), 5)
  assert.equal(contarPalavras('  ·  —  '), 0)
  assert.equal(contarPalavras('pente 0,5 na nuca'), 4)
})

test('seção de leitura conta à parte e não entra no alerta', () => {
  const tela = medirTela([
    { texto: 'Abrir o baú sem quebrar o frio', leitura: false },
    { texto: 'Corte Tesoura e máquina lavagem e finalização 45 min', leitura: true },
  ])
  assert.deepEqual(tela, { palavras: 7, palavrasLeitura: 9 })
})

test('aponta só as telas acima do limite de cada modo', () => {
  const telas = [
    { modo: 'computador', y: 0, palavras: 60, amostra: 'no limite' },
    { modo: 'computador', y: 900, palavras: 126, amostra: 'viagem' },
    { modo: 'celular', y: 0, palavras: 46, amostra: 'abertura' },
    { modo: 'celular', y: 844, palavras: 20, amostra: 'curta' },
  ]
  const { alertas, maior } = avaliar(telas)
  assert.deepEqual(alertas.map((a) => [a.modo, a.y, a.limite]), [['computador', 900, 60], ['celular', 0, 45]])
  assert.deepEqual(maior, { computador: 126, celular: 46 })
  assert.deepEqual(avaliar(telas, { computador: 200, celular: 200 }).alertas, [])
  assert.throws(() => avaliar(telas, { computador: 0, celular: 45 }), /Limite inválido/)
  assert.deepEqual(LIMITES_PADRAO, { computador: 60, celular: 45 })
})

test('recusa argumentos inválidos antes de abrir o navegador', () => {
  for (const args of [[], ['sem-http', 'saida'], ['http://x', 'saida', '--celular', '0'], ['http://x', 'saida', '--inventado']]) {
    const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10000 })
    assert.equal(r.status, 1, r.stdout + r.stderr)
  }
})

test('não sobrescreve uma rodada anterior', () => {
  const base = path.join(raiz, 'pilotos/testes-temporarios')
  fs.mkdirSync(base, { recursive: true })
  const dir = fs.mkdtempSync(path.join(base, 'densidade-'))
  try {
    const r = spawnSync(process.execPath, [script, 'http://127.0.0.1:9/', dir], { encoding: 'utf8', timeout: 10000 })
    assert.equal(r.status, 1, r.stdout + r.stderr)
    assert.match(r.stderr, /pasta nova/)
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

test('exceção localizada (data-densidade) não reprova, mas fica listada com o motivo', () => {
  const tela = medirTela([
    { texto: 'Cinco marcos da viagem com hora e temperatura em cada um deles', leitura: false, motivo: 'entrada da viagem' },
    { texto: 'Rodapé', leitura: true, motivo: 'ignorado na leitura' },
  ])
  assert.deepEqual(tela.motivos, ['entrada da viagem'])
  const { alertas, justificadas } = avaliar([
    { modo: 'computador', y: 0, palavras: 80, motivos: ['entrada da viagem'], palavrasJustificadas: 20 },
    { modo: 'computador', y: 450, palavras: 80 },
  ])
  assert.deepEqual(alertas.map((a) => a.y), [450])
  assert.deepEqual(justificadas.map((a) => [a.y, a.motivos]), [[0, ['entrada da viagem']]])
})

test('exceção só cobre as palavras marcadas, sem liberar o restante da tela', () => {
  const tela = medirTela([
    { texto: 'Exceção', leitura: false, motivo: 'um rótulo necessário' },
    { texto: 'texto '.repeat(70), leitura: false },
  ])
  assert.equal(tela.palavrasJustificadas, 1)
  const resultado = avaliar([{ modo: 'computador', y: 0, ...tela }])
  assert.equal(resultado.alertas.length, 1)
  assert.equal(resultado.justificadas.length, 0)
  for (const palavrasJustificadas of [undefined, -1, 999, 1.5]) {
    assert.equal(avaliar([{ modo: 'computador', y: 0, palavras: 80, motivos: ['motivo'], palavrasJustificadas }]).alertas.length, 1)
  }
})

test('reprovar é o padrão e a revisão manda medir a cada meia tela', () => {
  const fonte = fs.readFileSync(script, 'utf8')
  assert.match(fonte, /estrito = true/)
  assert.match(fonte, /--so-avisar/)
  assert.match(fonte, /altura \/ 2/)
  const revisao = fs.readFileSync(path.join(raiz, 'plugins/landing-pages/skills/lp-revisao/SKILL.md'), 'utf8')
  assert.match(revisao, /Portão de entrega/)
  assert.match(revisao, /data-densidade/)
})
