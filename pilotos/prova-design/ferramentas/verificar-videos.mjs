// Confere dimensões, duração, busca no meio do WebM e os seis quadros de cada gravação.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
const pasta = path.resolve(process.argv[2])
const resultado = []
const sites = process.argv.slice(3)
for (const site of sites.length ? sites : ['lastro-cargas', 'estudio-coral', 'barbearia-seco']) {
  for (const celular of [false, true]) {
    const nome = site + (celular ? '-celular' : '')
    const arquivo = path.join(pasta, nome + '.webm')
    const r = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', arquivo], { encoding: 'utf8' }))
    const video = r.streams.find(s => s.codec_type === 'video')
    const duracao = Number(r.format.duration)
    assert(video && Number.isFinite(duracao) && duracao > 0, nome)
    assert.equal(video.width, celular ? 390 : 1440)
    assert.equal(video.height, celular ? 844 : 900)
    execFileSync('ffmpeg', ['-v', 'error', '-ss', String(duracao / 2), '-i', arquivo, '-frames:v', '1', '-f', 'null', '-'], { stdio: 'pipe', timeout: 30000 })
    for (const pct of ['000', '020', '040', '060', '080', '100']) {
      assert(fs.statSync(path.join(pasta, `${nome}-${pct}.png`)).size > 0, `${nome}-${pct}`)
    }
    resultado.push({ nome, duracao, largura: video.width, altura: video.height, bytes: fs.statSync(arquivo).size, buscaNoMeio: true, quadros: 6 })
  }
}
fs.writeFileSync(path.join(pasta, 'verificacao-videos.json'), JSON.stringify({ data: new Date().toISOString(), aprovado: true, videos: resultado }, null, 2))
console.log(JSON.stringify(resultado))
