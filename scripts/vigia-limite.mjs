// Vigia da troca de turno automática (DEV-05/DEV-30): quando a sessão do Claude neste projeto para por limite de uso
// ("You've hit your session limit"), chama o Codex uma vez com "continue". O Codex lê o docs/continuar.md (AGENTS.md
// global), marca "Último turno: Codex" e segue; quando o Claude volta, o hook retomar-turno lê de onde ele parou.
// Uso:  node scripts/vigia-limite.mjs [--projeto <pasta>] [--minutos 1] [--uma-vez] [--comando "<cmd>"]
// Parar: Ctrl+C. Log em <projeto>/.codex/vigia-limite.log. Não faz commit nem push (regra do Codex no AGENTS.md).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const valor = (nome, padrao) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : padrao }
const projeto = path.resolve(valor('--projeto', process.cwd()))
const minutos = Number(valor('--minutos', '1'))
const umaVez = args.includes('--uma-vez')
const comando = valor('--comando', null)
const base = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects')
const pasta = path.join(base, projeto.replace(/[^A-Za-z0-9]/g, '-'))
const estado = path.join(projeto, '.codex', 'vigia-limite.json')
const log = path.join(projeto, '.codex', 'vigia-limite.log')
fs.mkdirSync(path.dirname(estado), { recursive: true })
const anotar = (texto) => fs.appendFileSync(log, `${new Date().toISOString()} ${texto}\n`)

// Último evento do histórico mais recente: o limite só conta se nada aconteceu depois dele.
function limiteAtual() {
  if (!fs.existsSync(pasta)) return null
  const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(pasta, f))
  if (!arquivos.length) return null
  const recente = arquivos.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]
  const tam = fs.statSync(recente).size
  const ler = Math.min(tam, 256 * 1024)
  const buf = Buffer.alloc(ler)
  const fd = fs.openSync(recente, 'r')
  try { fs.readSync(fd, buf, 0, ler, tam - ler) } finally { fs.closeSync(fd) }
  for (const linha of buf.toString('utf8').split('\n').reverse()) {
    let j
    try { j = JSON.parse(linha) } catch { continue }
    if (j.type !== 'assistant' && j.type !== 'user') continue
    if (j.isApiErrorMessage && j.error === 'rate_limit') return { sessao: path.basename(recente, '.jsonl'), quando: j.timestamp }
    return null // a última coisa foi trabalho normal: o Claude está ativo
  }
  return null
}

function chamarCodex(limite) {
  const pedido = 'continue'
  anotar(`limite do Claude em ${limite.quando} (sessão ${limite.sessao}); chamando o Codex`)
  // No Windows o codex é .cmd e exige shell; o shell junta os argumentos sem aspas, então caminho com espaço é citado aqui.
  const windows = process.platform === 'win32'
  const citar = (a) => (windows && /[\s&()^|<>]/.test(a) ? `"${a}"` : a)
  const r = comando
    ? spawnSync(comando, { shell: true, cwd: projeto, encoding: 'utf8' })
    : spawnSync('codex', ['exec', '-s', 'workspace-write', '-C', projeto, pedido].map(citar), { cwd: projeto, encoding: 'utf8', shell: windows })
  anotar(`Codex terminou (saída ${r.status ?? r.error?.code}). Últimas linhas: ${(r.stdout || '').trim().split('\n').slice(-3).join(' | ')}`)
}

function rodada() {
  const limite = limiteAtual()
  if (!limite) return
  let feito = {}
  try { feito = JSON.parse(fs.readFileSync(estado, 'utf8')) } catch {}
  const chave = `${limite.sessao}@${limite.quando}`
  if (feito.ultimo === chave) return // já tratado: um Codex por limite
  fs.writeFileSync(estado, JSON.stringify({ ultimo: chave }))
  chamarCodex(limite)
}

if (umaVez) rodada()
else {
  console.log(`Vigia do limite ligado em ${projeto} (a cada ${minutos} min). Log: ${log}. Parar: Ctrl+C.`)
  rodada()
  setInterval(rodada, minutos * 60000)
}
