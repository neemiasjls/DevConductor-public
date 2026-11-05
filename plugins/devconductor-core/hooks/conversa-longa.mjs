// Aviso de conversa longa (Fase E do plano, DEV-27): cada resposta relê a conversa inteira, então passar de
// ~150 mil tokens encarece tudo. Lê o tamanho real no último registro de uso do histórico e avisa UMA vez por
// faixa: 150 mil e depois a cada +50 mil (200, 250...). DEV-46: a média medida era 232 mil por resposta e só
// ~98 mil disso é a base fixa da sessão, então avisar só a cada +150 mil deixava a conversa engordar calada.
// O aviso vai ao modelo (additionalContext) e aparece na tela (systemMessage), para o usuário decidir também.
// Abaixo do limite não escreve nada (não gasta token).
// Entrada: JSON do hook UserPromptSubmit no stdin (session_id, transcript_path). Uso em teste: --limite N --passo N.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const iLimite = args.indexOf('--limite')
const LIMITE = iLimite >= 0 ? Number(args[iLimite + 1]) : 150000
const iPasso = args.indexOf('--passo')
const PASSO = iPasso >= 0 ? Number(args[iPasso + 1]) : 50000
let entrada = {}
try { entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}') } catch { process.exit(0) }
const { transcript_path: historico, session_id: sessao } = entrada
if (!historico || !sessao || !fs.existsSync(historico)) process.exit(0)

// Só o fim do arquivo: o último uso registrado já diz o tamanho atual da conversa. Se a última linha com uso
// for enorme (resultado grande de ferramenta), a janela cresce até achá-la.
function ultimoUso() {
  const tam = fs.statSync(historico).size
  const fd = fs.openSync(historico, 'r')
  try {
    for (const janela of [512 * 1024, 4 * 1024 * 1024, 32 * 1024 * 1024, tam]) {
      const ler = Math.min(tam, janela)
      const buf = Buffer.alloc(ler)
      fs.readSync(fd, buf, 0, ler, tam - ler)
      for (const linha of buf.toString('utf8').split('\n').reverse()) {
        if (!linha.includes('"usage"')) continue
        try {
          const u = JSON.parse(linha).message?.usage
          if (u) return (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0)
        } catch { continue }
      }
      if (ler === tam) break
    }
  } finally { fs.closeSync(fd) }
  return 0
}
let contexto = 0
try { contexto = ultimoUso() } catch { process.exit(0) }
const faixa = contexto < LIMITE ? 0 : 1 + Math.floor((contexto - LIMITE) / PASSO)
const marca = path.join(os.tmpdir(), `devagents-conversa-longa-${sessao.replace(/[^\w-]/g, '')}`)
let avisada = 0
try { avisada = Number(fs.readFileSync(marca, 'utf8')) || 0 } catch {}
// Depois de um /compact a conversa encolhe: a marca desce junto para avisar de novo quando voltar a crescer.
if (faixa < avisada) { try { fs.writeFileSync(marca, String(faixa)) } catch {} }
if (faixa <= avisada) process.exit(0)
try { fs.writeFileSync(marca, String(faixa)) } catch {} // sem a marca, ainda avisa (no pior caso, repete)
const mil = Math.round(contexto / 1000)
const paraModelo = `DevConductor: esta conversa já tem ~${mil} mil tokens e cada resposta relê tudo. Ao terminar o passo atual, ` +
  'atualize o docs/continuar.md e sugira ao usuário seguir numa sessão nova (ou /clear), em uma linha.'
const paraUsuario = `Conversa com ~${mil} mil tokens: cada resposta relê tudo. Ao fim deste passo, /clear ou sessão nova (o continuar.md guarda onde parou).`
console.log(JSON.stringify({ systemMessage: paraUsuario, hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: paraModelo } }))
