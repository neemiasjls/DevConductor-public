// Troca de turno: se o outro agente trabalhou por último neste projeto (marca "Último turno: Codex" no topo
// do docs/continuar.md), avisa a sessão nova para retomar de lá sozinha, sem o usuário pedir.
// Uso: node retomar-turno.mjs [--projeto "<pasta>"]
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const iProjeto = args.indexOf('--projeto')
const projeto = iProjeto >= 0 ? args[iProjeto + 1] : (process.env.CLAUDE_PROJECT_DIR || process.cwd())

let topo = ''
try { topo = fs.readFileSync(path.join(projeto, 'docs', 'continuar.md'), 'utf8').split(/\r?\n/).slice(0, 6).join('\n') } catch { process.exit(0) }
const marca = topo.match(/[ÚU]ltimo turno:\s*Codex[^\n]*/i)
if (!marca) process.exit(0)

console.log(`DevConductor: "${marca[0].trim()}" no docs/continuar.md — o Codex trabalhou aqui depois da última sessão. ` +
  'Antes do primeiro pedido: leia o docs/continuar.md inteiro, confira git status e git log recentes para ver o ' +
  'que ele mudou, conte ao usuário em 2–3 linhas o que foi feito e o que falta, e troque a linha da marca por ' +
  '"> Último turno: Claude". Se a memória do projeto precisar de algo que o Codex decidiu, grave como de costume.')
