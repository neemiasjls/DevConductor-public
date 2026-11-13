import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins/design-sistemas/skills/ui-sistemas/scripts/consistencia.mjs')
const dados = path.join(raiz, 'scripts/testes/dados/consistencia')
const config = path.join(dados, 'design-sistemas.json')

function rodar (caso, { comConfig = true, cfg = config, cwd = raiz, extra = [] } = {}) {
  const args = [script, path.join(dados, 'casos', caso), '--json', ...(comConfig ? ['--config', cfg] : []), ...extra]
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', cwd })
  assert.equal(r.stderr, '', r.stderr)
  return { saida: r.status, ...JSON.parse(r.stdout) }
}

// Cada fixture tem um defeito só: o conferidor aponta só ele, no arquivo:linha certo, com a gravidade certa.
const UM_DEFEITO = [
  ['peca-base', 'peca-base', 'exige justificativa', 1, [['casos/peca-base/Tela.tsx', 4]]],
  ['wrapper-sem-import', 'peca-base', 'exige justificativa', 1, [['casos/wrapper-sem-import/CampoCpf.tsx', 4]]],
  ['letra', 'letra-escala', 'exige justificativa', 1, [['casos/letra/Tela.tsx', 4], ['casos/letra/Tela.tsx', 5]]],
  ['espaco', 'espaco-escala', 'exige justificativa', 1, [['casos/espaco/Tela.tsx', 4]]],
  ['raio', 'raio-superficie', 'exige justificativa', 1, [['casos/raio/Tela.tsx', 4]]],
  ['cor', 'cor-token', 'exige justificativa', 1, [['casos/cor/Tela.tsx', 4]]],
  ['cor-variavel', 'cor-token', 'exige justificativa', 1, [['casos/cor-variavel/Tela.tsx', 4]]],
  ['cor-css', 'cor-token', 'exige justificativa', 1, [['casos/cor-css/estilo.css', 2]]],
  ['cor-tema', 'cor-token', 'exige justificativa', 1, [['casos/cor-tema/Tela.tsx', 4]]],
  ['composta-defeito', 'cor-token', 'exige justificativa', 1, [['casos/composta-defeito/Tela.tsx', 4]]],
  ['foco', 'foco-substituto', 'nunca passa', 1, [['casos/foco/Tela.tsx', 4]]],
  ['foco-css', 'foco-substituto', 'nunca passa', 1, [['casos/foco-css/estilo.css', 2]]],
  ['cabecalho', 'cabecalho-tabela', 'exige justificativa', 1, [['casos/cabecalho/B.tsx', 3]]],
  ['aviso-validacao', 'aviso-validacao', 'aviso', 0, [['casos/aviso-validacao/Tela.tsx', 5], ['casos/aviso-validacao/Tela.tsx', 12], ['casos/aviso-validacao/Tela.tsx', 13]]],
  ['tela-tamanho', 'tela-tamanho', 'aviso', 0, [['casos/tela-tamanho/Tela.tsx', 1]]],
  // import da peça sem usar não libera o controle à mão
  ['peca-import-sem-uso', 'peca-base', 'exige justificativa', 1, [['casos/peca-import-sem-uso/Tela.tsx', 4]]],
  // focus-visible:ring-0 não desenha foco; :focus-visible de outro elemento não vale
  ['foco-ring-0', 'foco-substituto', 'nunca passa', 1, [['casos/foco-ring-0/Tela.tsx', 4]]],
  ['foco-css-outro', 'foco-substituto', 'nunca passa', 1, [['casos/foco-css-outro/estilo.css', 1]]],
  // variável CSS que não é token nem foi declarada
  ['cor-css-variavel', 'cor-token', 'exige justificativa', 1, [['casos/cor-css-variavel/estilo.css', 2]]],
  // quarto de passo (13 px) fica fora da escala; meio passo é aceito (caso limpo)
  ['espaco-passo', 'espaco-escala', 'exige justificativa', 1, [['casos/espaco-passo/Tela.tsx', 4]]]
]

for (const [caso, regra, nivel, saida, locais] of UM_DEFEITO) {
  test(`consistência: ${caso} aponta só ${regra} (${nivel}), saída ${saida}`, () => {
    const r = rodar(caso)
    assert.equal(r.saida, saida, JSON.stringify(r.achados))
    assert.deepEqual(r.naoConferido, [])
    assert.deepEqual(r.achados.map((a) => [a.arquivo, a.linha]), locais)
    for (const a of r.achados) {
      assert.equal(a.regra, regra)
      assert.equal(a.nivel, nivel)
    }
  })
}

test('consistência: caso limpo (peças, embrulho, classe composta, variável CSS, @theme, cva, cabeçalhos iguais) dá 0 sem aviso', () => {
  const r = rodar('limpo')
  assert.equal(r.saida, 0)
  assert.deepEqual(r.achados, [])
  assert.deepEqual(r.naoConferido, [])
  assert.equal(r.naoMedido, 0)
})

test('consistência: style={{...}} com cor e letra à mão reprova nas duas regras; dinâmico dá 2', () => {
  const r = rodar('estilo-inline')
  assert.equal(r.saida, 1)
  assert.deepEqual(r.achados.map((a) => [a.regra, a.linha]).sort(), [['cor-token', 4], ['letra-escala', 4]])
  const d = rodar('estilo-dinamico')
  assert.equal(d.saida, 2)
  assert.deepEqual(d.achados, [])
  assert.equal(d.naoMedido, 1)
})

test('consistência: chamada de variantes sem cva conhecido não conta como conferida (saída 2)', () => {
  const r = rodar('variants-desconhecido')
  assert.equal(r.saida, 2)
  assert.deepEqual(r.achados, [])
  assert.equal(r.naoMedido, 1)
})

test('consistência: tag dentro de string, template ou comentário não é campo na tela', () => {
  const r = rodar('tag-em-string')
  assert.equal(r.saida, 0, JSON.stringify(r.achados))
  assert.deepEqual(r.achados, [])
  assert.deepEqual(r.naoConferido, [])
})

test('consistência: exceção apaga só o achado da mesma regra no mesmo local; "nunca passa" não aceita exceção', () => {
  assert.equal(rodar('excecao').saida, 0)
  const foco = rodar('foco-com-excecao')
  assert.equal(foco.saida, 1)
  assert.equal(foco.achados[0].regra, 'foco-substituto')
  assert(foco.excecoesIgnoradas.some((e) => e.arquivo === 'casos/foco-com-excecao/Tela.tsx'))
  // a mesma exceção de raio não vale em outro arquivo
  assert.equal(rodar('raio').saida, 1)
})

test('consistência: trecho dinâmico, pasta só com .razor, sem configuração e configuração inválida dão 2', (t) => {
  const dinamico = rodar('dinamico')
  assert.equal(dinamico.saida, 2)
  assert.equal(dinamico.naoMedido, 1)

  const razor = rodar('razor')
  assert.equal(razor.saida, 2)
  assert.deepEqual(razor.cobertura.outrasStacks, { '.razor': 1 })

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-consistencia-'))
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))
  const semConfig = rodar('limpo', { comConfig: false, cwd: temp })
  assert.equal(semConfig.saida, 2)
  assert.equal(semConfig.config, null)
  assert(semConfig.naoConferido.some((n) => /sem design-sistemas\.json/.test(n.motivo)))

  const invalida = JSON.parse(fs.readFileSync(config, 'utf8'))
  delete invalida.excecoes[0].motivo
  const cfg = path.join(temp, 'design-sistemas.json')
  fs.writeFileSync(cfg, JSON.stringify(invalida))
  const r = rodar('limpo', { cfg })
  assert.equal(r.saida, 2)
  assert(r.naoConferido.some((n) => /configuração inválida/.test(n.motivo)))

  // sem configuração, o defeito de foco ainda reprova (1 vence 2)
  assert.equal(rodar('foco', { comConfig: false, cwd: temp }).saida, 1)
})

test('consistência: relatório em texto e arquivos na pasta de saída', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-consistencia-saida-'))
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))
  const r = spawnSync(process.execPath, [script, path.join(dados, 'casos/foco'), '--config', config, temp], { encoding: 'utf8' })
  assert.equal(r.status, 1)
  assert.match(r.stdout, /\[nunca passa\] foco-substituto {2}casos\/foco\/Tela\.tsx:4/)
  assert.match(r.stdout, /Saída 1\./)
  assert.equal(JSON.parse(fs.readFileSync(path.join(temp, 'consistencia.json'), 'utf8')).saida, 1)
  assert(fs.existsSync(path.join(temp, 'consistencia.txt')))
  assert.equal(spawnSync(process.execPath, [script], { encoding: 'utf8' }).status, 2)
})

test('consistência: níveis vêm da régua e a skill ensina o comando', () => {
  const regua = fs.readFileSync(path.join(raiz, 'plugins/design-sistemas/skills/ui-sistemas/referencias/regua-telas.md'), 'utf8')
  for (const [, regra, nivel] of UM_DEFEITO) assert.match(regua, new RegExp('`' + regra + '` \\| ' + nivel))
  assert.match(fs.readFileSync(path.join(raiz, 'plugins/design-sistemas/skills/ui-sistemas/SKILL.md'), 'utf8'), /scripts\/consistencia\.mjs/)
})
