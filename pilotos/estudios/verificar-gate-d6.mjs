import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const servidor = http.createServer((req, res) => {
  if (req.url !== '/') { res.writeHead(404); res.end('ausente'); return }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end('<!doctype html><html><title>Fixture com defeitos deliberados</title><body style="width:2400px"><button aria-label=""></button><a href="#ausente">Ir</a><img src="/quebrada.jpg"><script>throw Error("Falha deliberada D6")</script></body></html>')
})
await new Promise(r => servidor.listen(0, '127.0.0.1', r))
try {
  const destino = `evidencias/d6-fixture-${Date.now()}`
  const processo = spawn(process.execPath, ['../../plugins/landing-pages/skills/lp-revisao/scripts/revisar-pagina.mjs', `http://127.0.0.1:${servidor.address().port}/`, destino], { stdio: 'inherit' })
  const codigo = await new Promise(r => processo.on('exit', r))
  assert.equal(codigo, 1)
  const rel = JSON.parse(fs.readFileSync(`${destino}/relatorio.json`, 'utf8'))
  assert.equal(rel.falhas.length, 12)
  for (const termo of ['Falha deliberada', '404', 'Rolagem lateral', 'Imagem quebrada', 'Âncora inexistente']) {
    assert(rel.cenarios.every(c => c.problemas.some(p => p.includes(termo))), termo)
  }
  console.log('Gate D6 detectou os cinco defeitos deliberados nas 12 combinações.')
} finally { servidor.close() }
