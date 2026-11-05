import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { estilos, renderizarEstilo } from '../../plugins/landing-pages/skills/lp-direcao-de-arte/estilos/gerar-exemplos.mjs'

const raiz = fileURLToPath(new URL('../../', import.meta.url))
const gerador = path.join(raiz, 'plugins/landing-pages/skills/lp-direcao-de-arte/estilos/gerar-exemplos.mjs')

test('gerador cria exemplos em caminho com espaços e preserva conteúdo ao repetir', () => {
  const temporarios = path.join(raiz, 'pilotos/testes-temporarios')
  fs.mkdirSync(temporarios, { recursive: true })
  const fixture = fs.mkdtempSync(path.join(temporarios, 'estilos-'))
  const destino = path.join(fixture, 'páginas de exemplo')
  try {
    const criado = spawnSync(process.execPath, [gerador, destino], { encoding: 'utf8' })
    assert.equal(criado.status, 0, criado.stderr)
    for (const id of Object.keys(estilos)) {
      const html = fs.readFileSync(path.join(destino, id + '.html'), 'utf8')
      assert.equal((html.match(/<h1>/g) || []).length, 1)
      assert.match(html, /name="robots" content="noindex,nofollow"/)
      assert.match(html, /<main id="conteudo">[\s\S]+<\/main>/)
      for (const [, local] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        if (local.startsWith('../assets/') || /^https?:/.test(local)) continue
        assert(fs.existsSync(path.join(destino, local)), `Recurso ausente: ${local}`)
      }
    }
    const arquivo = path.join(destino, 'luxo-editorial.html')
    fs.writeFileSync(arquivo, 'Edição feita depois de gerar')
    const repetido = spawnSync(process.execPath, [gerador, destino], { encoding: 'utf8' })
    assert.equal(repetido.status, 1)
    assert.equal(fs.readFileSync(arquivo, 'utf8'), 'Edição feita depois de gerar')
  } finally {
    assert.equal(path.dirname(fs.realpathSync(fixture)), fs.realpathSync(temporarios))
    fs.rmSync(fixture, { recursive: true, force: true })
  }
})

test('identificador de estilo inexistente não produz uma página incompleta', () => {
  assert.throws(() => renderizarEstilo('estilo-ausente'), /Estilo desconhecido/)
})
