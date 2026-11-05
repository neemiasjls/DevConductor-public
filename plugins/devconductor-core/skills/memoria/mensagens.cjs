// Mostra as mensagens do usuário numa transcrição do Claude Code a partir de uma data, para recuperar
// o que saiu do contexto depois de uma compactação. Só lê; não chama modelo.
// Uso: node mensagens.cjs [transcrição.jsonl | -] [desde: AAAA-MM-DD ou "AAAA-MM-DD HH:MM"]
// "-" (padrão) = a transcrição mais recente do projeto da pasta atual.
const fs = require('fs')
const path = require('path')
const os = require('os')

const [arg = '-', desde = ''] = process.argv.slice(2)
let arquivo = arg
if (arg === '-') {
  const pasta = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const dir = path.join(os.homedir(), '.claude', 'projects', pasta.replace(/[^A-Za-z0-9]/g, '-'))
  let recentes = []
  try {
    recentes = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
      .map((f) => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
  } catch {}
  if (!recentes.length) { console.log(`Nenhuma transcrição em ${dir}`); process.exit(0) }
  arquivo = recentes[0].f
}

const limite = desde ? new Date(desde.length <= 10 ? `${desde}T00:00:00` : desde).getTime() : 0
const mensagens = []
for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
  let o
  try { o = JSON.parse(linha) } catch { continue }
  if (o.type !== 'user' || o.isMeta || !o.message || o.message.role !== 'user') continue
  if (limite && new Date(o.timestamp).getTime() < limite) continue
  const c = o.message.content
  const texto = (typeof c === 'string' ? c
    : Array.isArray(c) ? c.filter((p) => p.type === 'text').map((p) => p.text).join('\n') : '').trim()
  if (!texto || /^<(command-|local-command|system-reminder|task-notification)/.test(texto)) continue
  mensagens.push(`[${String(o.timestamp || '').slice(0, 16).replace('T', ' ')}] ${texto.replace(/\s+/g, ' ').slice(0, 600)}`)
}
console.log(`${arquivo}\n${mensagens.length} mensagens${desde ? ` desde ${desde}` : ''} (até 80 últimas):`)
console.log(mensagens.slice(-80).join('\n'))
