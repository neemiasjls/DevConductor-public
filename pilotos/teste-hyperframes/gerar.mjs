// Roda o Hyperframes instalado nesta pasta, com tudo preso aqui dentro:
// config e cache locais, sem telemetria, sem instalar skills, sem checar atualizacao.
// Uso: node gerar.mjs check            -> confere a composicao
//      node gerar.mjs render [opcoes]  -> gera o video e mostra o tempo
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const cli = join(aqui, 'node_modules', 'hyperframes', 'bin', 'hyperframes.mjs')
const env = {
  ...process.env,
  HYPERFRAMES_CONFIG_DIR: join(aqui, '.cache', 'config'),
  HYPERFRAMES_CACHE_DIR: join(aqui, '.cache', 'cache'),
  HYPERFRAMES_FONT_CACHE_DIR: join(aqui, '.cache', 'fontes'),
  HYPERFRAMES_NO_TELEMETRY: '1',
  DO_NOT_TRACK: '1',
  HYPERFRAMES_SKIP_SKILLS: '1',
  HYPERFRAMES_NO_UPDATE_CHECK: '1',
  HYPERFRAMES_NO_AUTO_INSTALL: '1',
  HYPERFRAMES_NO_OPTIONAL_INSTALL: '1',
  NO_COLOR: '1',
}

const args = process.argv.slice(2)
if (args.length === 0) args.push('render', '--output', 'video-aroeira.mp4')
const inicio = Date.now()
const r = spawnSync(process.execPath, [cli, ...args], { cwd: aqui, env, stdio: 'inherit' })
console.log(`\ntempo: ${((Date.now() - inicio) / 1000).toFixed(1)} s (codigo de saida ${r.status})`)
process.exit(r.status ?? 1)
