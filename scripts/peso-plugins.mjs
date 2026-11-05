// Estima quanto cada plugin pesa no contexto só por estar ligado: nome + descrição de cada agente e de cada
// skill que o modelo pode chamar sozinho (skills com disable-model-invocation não entram). O corpo das skills
// só é lido quando usadas. Uso: node scripts/peso-plugins.mjs   (estimativa: ~3,5 caracteres por token)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cabecalho = (arq) => {
  const t = fs.readFileSync(arq, 'utf8').replace(/\r\n/g, '\n')
  const m = t.match(/^---\n([\s\S]*?)\n---/)
  return m ? m[1] : ''
}
const campo = (cab, nome) => {
  const m = cab.match(new RegExp(`^${nome}:\\s*([\\s\\S]*?)(?=\\n[a-zA-Z-]+:|$)`, 'm'))
  return m ? m[1].trim() : ''
}

function pesar(dirPlugin) {
  let chars = 0, agentes = 0, skills = 0, travadas = 0
  const agDir = path.join(dirPlugin, 'agents')
  if (fs.existsSync(agDir)) for (const f of fs.readdirSync(agDir).filter((f) => f.endsWith('.md'))) {
    const cab = cabecalho(path.join(agDir, f)); chars += campo(cab, 'name').length + campo(cab, 'description').length; agentes++
  }
  const skDir = path.join(dirPlugin, 'skills')
  if (fs.existsSync(skDir)) for (const s of fs.readdirSync(skDir)) {
    const arq = path.join(skDir, s, 'SKILL.md')
    if (!fs.existsSync(arq)) continue
    const cab = cabecalho(arq)
    if (/^disable-model-invocation:\s*true/m.test(cab)) { travadas++; continue }
    chars += campo(cab, 'name').length + campo(cab, 'description').length; skills++
  }
  return { agentes, skills, travadas, tokens: Math.round(chars / 3.5) }
}

const linhas = []
for (const p of fs.readdirSync(path.join(raiz, 'plugins'))) linhas.push([p, pesar(path.join(raiz, 'plugins', p))])
// Para comparar: o superpowers instalado (cache do Claude Code), se existir.
const cache = path.join(os.homedir(), '.claude', 'plugins', 'cache')
const sp = fs.existsSync(cache) ? fs.readdirSync(cache, { recursive: true }).find((d) => /superpowers[\\/][^\\/]+$/.test(d) && fs.existsSync(path.join(cache, d, 'skills'))) : null
if (sp) linhas.push(['superpowers (origem)', pesar(path.join(cache, sp))])

console.log('Plugin'.padEnd(22), 'Agentes', 'Skills', 'Travadas', '≈ tokens fixos')
for (const [n, r] of linhas) console.log(n.padEnd(22), String(r.agentes).padStart(7), String(r.skills).padStart(6), String(r.travadas).padStart(8), String(r.tokens).padStart(14))
console.log('\n"Tokens fixos" = o que entra em toda conversa só por o plugin estar ligado (lista de agentes/skills).')
console.log('O resto (corpo das skills, instruções do superpowers ao ser usado) entra só quando chamado.')
