// Freio de agente longo (DEV-46). Um agente começa com ~72 mil tokens de base e cada resposta relê tudo o que
// ele já juntou; na semana medida, três agentes que construíram sites inteiros fizeram 290–430 respostas cada,
// terminando com 120–275 mil de contexto, e foram metade de todo o consumo. Este hook conta as chamadas de
// ferramenta de cada agente chamado e, a cada LIMITE (padrão 40), pede para fechar a parte atual e devolver um
// resumo — quem chamou abre um agente novo (contexto limpo) para o resto. A conversa principal não entra aqui
// (ela tem o conversa-longa.mjs).
// Entrada: JSON do hook PostToolUse no stdin (session_id, agent_id). Uso em teste: --limite N.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const iLimite = args.indexOf('--limite')
const LIMITE = iLimite >= 0 ? Number(args[iLimite + 1]) : 40
let entrada = {}
try { entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}') } catch { process.exit(0) }
const { session_id: sessao, agent_id: agente } = entrada
if (!agente || !sessao || !(LIMITE > 0)) process.exit(0) // sem agent_id é a conversa principal

const marca = path.join(os.tmpdir(), 'devagents-agente-longo', `${sessao}-${agente}`.replace(/[^\w-]/g, '_'))
let chamadas = 0
try { chamadas = Number(fs.readFileSync(marca, 'utf8')) || 0 } catch {}
chamadas++
try { fs.mkdirSync(path.dirname(marca), { recursive: true }); fs.writeFileSync(marca, String(chamadas)) } catch { process.exit(0) }
if (chamadas % LIMITE !== 0) process.exit(0)

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: `DevConductor: este agente já fez ${chamadas} chamadas e cada resposta relê todo o contexto dele. ` +
      'Feche a parte que está fazendo (deixe o código num estado que compila), pare e devolva em até 15 linhas: o que ' +
      'ficou pronto, o que falta e os arquivos. Quem chamou abre um agente novo para o resto. Só continue se faltar ' +
      'muito pouco para terminar a tarefa inteira.',
  },
}))
