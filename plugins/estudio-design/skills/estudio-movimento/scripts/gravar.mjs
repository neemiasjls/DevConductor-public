import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const [pasta, base = 'http://127.0.0.1:5190'] = process.argv.slice(2)
if (!pasta) { console.error('Uso: node gravar.mjs <projeto> [url]'); process.exit(1) }
const projeto = path.resolve(pasta)
// No repositório os plugins são irmãos (plugins/<nome>); instalados, ficam em cache/<marketplace>/<nome>/<versão>.
const aqui = path.dirname(fileURLToPath(import.meta.url))
const LP = 'skills/lp-referencias/scripts'
function scriptsLandingPages() {
  const noRepo = path.resolve(aqui, '../../../..', 'landing-pages', LP)
  if (fs.existsSync(noRepo)) return noRepo
  const instalado = path.resolve(aqui, '../../../../..', 'landing-pages')
  const versoes = (() => { try { return fs.readdirSync(instalado) } catch { return [] } })()
    .filter((v) => fs.existsSync(path.join(instalado, v, LP)))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  return versoes.length ? path.join(instalado, versoes[0], LP) : noRepo
}
const scripts = scriptsLandingPages()
if (!fs.existsSync(scripts)) { console.error('Instale também landing-pages para usar o gravador e a vitrine.'); process.exit(1) }
const { estudos } = await import(pathToFileURL(path.join(projeto, 'src/estudos.js')).href)
const saida = path.join(projeto, 'vitrine')
fs.mkdirSync(saida, { recursive: true })
const origens = fs.existsSync(path.join(saida, 'galeria.json')) ? JSON.parse(fs.readFileSync(path.join(saida, 'galeria.json'), 'utf8')) : {}
const falhas = []
const novos = process.argv.includes('--somente-novos')
const indiceTempo = process.argv.indexOf('--segundos')
const segundos = indiceTempo < 0 ? 8 : Number(process.argv[indiceTempo + 1])
if (!Number.isFinite(segundos) || segundos < 3 || segundos > 60) { console.error('--segundos deve ser de 3 a 60'); process.exit(1) }
for (const estudo of estudos) for (const celular of [false, true]) {
  const nome = estudo.id + (celular ? '-celular' : '')
  const url = `${base}/?estudo=${estudo.id}`
  if (novos && fs.existsSync(path.join(saida, nome + '.webm')) && fs.statSync(path.join(saida, nome + '.webm')).size > 1000) {
    origens[nome] = url
    continue
  }
  try {
    execFileSync(process.execPath, [path.join(scripts, 'gravar-rolagem.mjs'), url, saida, '--nome', estudo.id, '--segundos', String(segundos), ...(celular ? ['--celular'] : [])], { cwd: projeto, stdio: 'inherit', timeout: 120000 })
    origens[nome] = url
  } catch (e) {
    falhas.push(nome)
    for (const f of fs.readdirSync(saida)) if (f === `${nome}.webm` || new RegExp(`^${nome}-\\d{3}\\.png$`).test(f)) fs.rmSync(path.join(saida, f))
    console.error(`Falhou a gravação ${nome}: ${e.message}`)
  }
}
fs.writeFileSync(path.join(saida, 'galeria.json'), JSON.stringify(origens, null, 2) + '\n')
execFileSync(process.execPath, [path.join(scripts, 'montar-galeria.mjs'), saida], { cwd: projeto, stdio: 'inherit' })
if (falhas.length) { console.error(`Gravações incompletas: ${falhas.join(', ')}`); process.exitCode = 1 }
