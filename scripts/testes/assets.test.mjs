import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { validarAssets } from '../../plugins/landing-pages/skills/lp-assets/scripts/validar-assets.mjs'

const pasta = path.resolve('pilotos/assets-d5')
// Os dados ficam em pilotos/ (fora da vitrine pública): sem a pasta, os testes são pulados.
const teste = fs.existsSync(pasta) ? test : (nome, fn) => test(nome, { skip: "sem pilotos/assets-d5" }, fn)
const manifesto = () => JSON.parse(fs.readFileSync(path.join(pasta, 'assets.json'), 'utf8'))
teste('foto real existente: origem, licença, hash e orçamento por tela', () => {
  const r = validarAssets(manifesto(), pasta)
  assert.equal(r.aprovado, true, r.erros.join('\n'))
  assert.equal(r.cenas[0].desktop, 408926)
  assert.match(r.arquivos[0].sha256, /^[a-f0-9]{64}$/)
})
teste('recusa travessia e caminho absoluto antes de aceitar asset', () => {
  for (const arquivo of ['../fora.jpg', 'C:/Windows/win.ini', '..\\fora.jpg']) {
    const m = manifesto(); m.assets[0].arquivo = arquivo
    assert.equal(validarAssets(m, pasta).aprovado, false)
  }
})
teste('recusa licença desconhecida, autorização pendente, crédito incompleto e hash alterado', () => {
  for (const ajuste of [{ licenca: 'CC-BY-NC' }, { licenca: 'cliente' }, { licenca: 'CC-BY-4.0', autorizacao: 'confirmada' }, { sha256: 'incorreto' }]) {
    const m = manifesto(); Object.assign(m.assets[0], ajuste)
    assert.equal(validarAssets(m, pasta).aprovado, false)
  }
})
teste('aceita CC BY 2.0 e BY-SA 4.0 do Commons só com crédito publicado completo', () => {
  const credito = 'creditos-teste.txt'
  try {
    for (const licenca of ['CC-BY-2.0', 'CC-BY-SA-4.0']) {
      const licencaUrl = `https://creativecommons.org/licenses/${licenca === 'CC-BY-2.0' ? 'by/2.0' : 'by-sa/4.0'}/`
      fs.writeFileSync(path.join(pasta, credito), `Foto: Autor X, ${licenca} ${licencaUrl} convertida para P&B`)
      const m = manifesto()
      Object.assign(m.assets[0], { licenca, licencaUrl,
        autorizacao: 'confirmada', credito: 'Foto: Autor X', alteracoes: 'convertida para P&B', creditoArquivo: credito })
      assert.equal(validarAssets(m, pasta).aprovado, true, validarAssets(m, pasta).erros.join('\n'))
      m.assets[0].alteracoes = 'recortada'
      assert.equal(validarAssets(m, pasta).aprovado, false)
    }
  } finally { fs.unlinkSync(path.join(pasta, credito)) }
})
teste('recusa versão ou família Creative Commons diferente do link publicado', () => {
  const credito = 'creditos-incoerentes-teste.txt'
  const licencaUrl = 'https://creativecommons.org/licenses/by-sa/4.0/'
  fs.writeFileSync(path.join(pasta, credito), `Foto: Autor X ${licencaUrl} convertida para P&B`)
  try {
    for (const licenca of ['CC-BY-2.0', 'CC-BY-4.0', 'CC-BY-SA-3.0']) {
      const m = manifesto()
      Object.assign(m.assets[0], { licenca, licencaUrl, autorizacao: 'confirmada',
        credito: 'Foto: Autor X', alteracoes: 'convertida para P&B', creditoArquivo: credito })
      assert.equal(validarAssets(m, pasta).aprovado, false, licenca)
    }
  } finally { fs.unlinkSync(path.join(pasta, credito)) }
})
teste('recusa foto renomeada para modelo e realismo sem evidência', () => {
  const m = manifesto(); m.assets[0].tipo = 'modelo3d'
  assert(validarAssets(m, pasta).erros.some(e => e.includes('GLB')))
  const n = manifesto(); delete n.cenas[0].revisaoVisual
  assert.equal(validarAssets(n, pasta).aprovado, false)
})
teste('soma recursos distintos, deduplica referências repetidas e recusa excesso no celular', () => {
  const m = manifesto(); m.cenas[0].desktop.push(m.assets[0].arquivo)
  assert.equal(validarAssets(m, pasta).cenas[0].desktop, 408926)
  for (let i = 1; i <= 3; i++) {
    // Mesmos bytes em caminhos distintos são downloads distintos.
    const arquivo = `copia-${i}.jpg`
    fs.copyFileSync(path.join(pasta, m.assets[0].arquivo), path.join(pasta, arquivo))
    m.assets.push({ ...m.assets[0], arquivo }); m.cenas[0].celular.push(arquivo)
  }
  try { assert(validarAssets(m, pasta).erros.some(e => e.includes('celular:'))) }
  finally { for (let i = 1; i <= 3; i++) fs.unlinkSync(path.join(pasta, `copia-${i}.jpg`)) }
})
