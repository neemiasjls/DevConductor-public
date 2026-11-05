// Na primeira busca por arquivos (Grep/Glob) de cada sessão ou subagente, lembra que o grafo existe.
// Só uma vez: o hook original do Graphify repete o aviso em toda busca e leitura, o que custa tokens à toa.
// Entrada: JSON do Claude Code no stdin (session_id, agent_id, cwd). Saída: additionalContext ou nada.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { comandoCli } from './cli-graphify.mjs'

let entrada = {}
try { entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}') } catch { process.exit(0) }
const projeto = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd()
if (!fs.existsSync(path.join(projeto, 'graphify-out', 'graph.json'))) process.exit(0)

const chave = `${entrada.session_id || 'sem-sessao'}-${entrada.agent_id || 'principal'}`.replace(/[^\w-]/g, '_')
const marca = path.join(os.tmpdir(), 'devagents-grafo-lembrado', chave)
if (fs.existsSync(marca)) process.exit(0)
try { fs.mkdirSync(path.dirname(marca), { recursive: true }); fs.writeFileSync(marca, '') } catch { /* sem a marca, lembra de novo */ }

const cli = comandoCli()
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    additionalContext: 'Este projeto tem grafo do código (graphify-out/graph.json). Para achar onde algo está, quem ' +
      `chama o quê ou o que uma mudança afeta, use antes \`${cli} query "<pergunta>" --budget 1500\`, ` +
      `\`${cli} explain "<Nome>"\` ou \`${cli} affected "<Nome>"\` (skill grafo-codigo); grep só para texto exato.` +
      (cli === 'graphify' ? '' : ' A CLI está fora do PATH; use o caminho completo acima.'),
  },
}))
