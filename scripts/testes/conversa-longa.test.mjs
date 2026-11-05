// Histórico sintético: o aviso de conversa longa sai uma vez por faixa e fica calado abaixo do limite.
// Rodar: node --test scripts/testes/conversa-longa.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const hook = path.join(raiz, 'plugins', 'devconductor-core', 'hooks', 'conversa-longa.mjs')

function preparar(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-conversa-'))
  const sessao = 'teste-' + path.basename(dir)
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.rmSync(path.join(os.tmpdir(), 'devagents-conversa-longa-' + sessao.replace(/[^\w-]/g, '')), { force: true })
  })
  const historico = path.join(dir, 'h.jsonl')
  const linha = (lido) => JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 10, cache_read_input_tokens: lido, cache_creation_input_tokens: 0, output_tokens: 5 } } })
  return {
    historico,
    escrever: (...lidos) => fs.writeFileSync(historico, lidos.map(linha).join('\n') + '\n'),
    rodar: () => spawnSync(process.execPath, [hook, '--limite', '1000', '--passo', '500'], { input: JSON.stringify({ session_id: sessao, transcript_path: historico }), encoding: 'utf8' }),
  }
}

test('abaixo do limite não escreve nada', (t) => {
  const f = preparar(t)
  f.escrever(5000, 900)
  const r = f.rodar()
  assert.equal(r.status, 0)
  assert.equal(r.stdout, '')
})

test('acima do limite avisa uma vez por faixa, usando o último uso registrado', (t) => {
  const f = preparar(t)
  f.escrever(10, 1500)
  assert.match(f.rodar().stdout, /~2 mil tokens/)
  assert.equal(f.rodar().stdout, '', 'repetiu o aviso na mesma faixa')
  f.escrever(10, 1500, 2100)
  assert.match(f.rodar().stdout, /~2 mil tokens/, 'não avisou ao subir uma faixa de passo')
  f.escrever(10, 1500, 2100, 2300)
  assert.equal(f.rodar().stdout, '', 'avisou de novo dentro da mesma faixa de passo')
})

test('o aviso vai ao modelo e aparece na tela', (t) => {
  const f = preparar(t)
  f.escrever(1200)
  const saida = JSON.parse(f.rodar().stdout)
  assert.match(saida.systemMessage, /\/clear/)
  assert.equal(saida.hookSpecificOutput.hookEventName, 'UserPromptSubmit')
  assert.match(saida.hookSpecificOutput.additionalContext, /continuar\.md/)
})

test('depois de compactar a conversa, volta a avisar quando ela cresce de novo', (t) => {
  const f = preparar(t)
  f.escrever(2100)
  assert.notEqual(f.rodar().stdout, '')
  f.escrever(2100, 300)
  assert.equal(f.rodar().stdout, '', 'avisou com a conversa curta')
  f.escrever(2100, 300, 1100)
  assert.match(f.rodar().stdout, /~1 mil tokens/, 'não avisou de novo depois da compactação')
})

test('entrada sem histórico ou quebrada não falha nem escreve', () => {
  for (const input of ['{}', 'não é json', JSON.stringify({ session_id: 'x', transcript_path: '/nao/existe.jsonl' })]) {
    const r = spawnSync(process.execPath, [hook], { input, encoding: 'utf8' })
    assert.equal(r.status, 0)
    assert.equal(r.stdout, '')
  }
})

test('acha o uso mesmo quando a última linha com uso tem mais de 512 KB', (t) => {
  const f = preparar(t)
  f.escrever(10)
  const linhaGrande = JSON.stringify({ type: 'assistant', message: { content: 'x'.repeat(700 * 1024), usage: { input_tokens: 0, cache_read_input_tokens: 5000, cache_creation_input_tokens: 0, output_tokens: 1 } } })
  fs.appendFileSync(f.historico, linhaGrande + '\n')
  assert.match(f.rodar().stdout, /~5 mil tokens/)
})
