// Verifica skills e plugins novos ou alterados antes do uso. Roda ao abrir a sessão e logo depois de um comando
// de instalação (claude plugin install/update, npx skills add, git clone de skill). Só olha o que mudou desde a
// última verificação (lista em <config do Claude>/devagents/verificados.json), então custa quase nada no dia a dia.
// - Skill: roda o verificador estático da Sentry (skills/skill-scanner/scripts/scan_skill.py) com uv ou python.
// - Plugin: lista os hooks (rodam comandos sozinhos) e servidores MCP que ele registra.
// Não bloqueia nem desliga nada: avisa a sessão, que usa a skill skill-scanner para a análise completa.
// Uso: node verificar-instalados.mjs [--projeto "<pasta>"] [--depois-de-comando]   (este lê o JSON do hook no stdin)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const iProjeto = args.indexOf('--projeto')
const projeto = iProjeto >= 0 ? args[iProjeto + 1] : (process.env.CLAUDE_PROJECT_DIR || process.cwd())
const aposComando = args.includes('--depois-de-comando')
const INSTALACAO = /\bclaude\s+plugins?\s+(install|i|update|marketplace\s+(add|update))\b|\bskills(@[\w.^~-]+)?\s+add\b|\bgit\s+clone\b[^\n]*skill/i

if (aposComando) {
  let entrada = {}
  try { entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}') } catch { process.exit(0) }
  if (!INSTALACAO.test(entrada.tool_input?.command ?? '')) process.exit(0)
}

const casa = os.homedir()
const config = process.env.CLAUDE_CONFIG_DIR || path.join(casa, '.claude')
const ESTADO = path.join(config, 'devagents', 'verificados.json')
const SCANNER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'skill-scanner', 'scripts', 'scan_skill.py')
const PRAZO_MS = 25000
// Versão da verificação: muda quando o verificador, a lista de aceitos ou este hook mudam (ao atualizar o núcleo).
// Resultado de versão antiga é refeito, senão uma skill sem mudança nunca passaria pela verificação nova.
const VERSAO = (() => {
  const h = createHash('sha1')
  const aqui = path.dirname(fileURLToPath(import.meta.url))
  for (const f of [SCANNER, path.join(aqui, 'falsos-positivos-skills.json'), fileURLToPath(import.meta.url)]) {
    try { h.update(fs.readFileSync(f)) } catch { h.update(`sem ${f}`) }
  }
  return h.digest('hex').slice(0, 12)
})()
const inicio = Date.now()
const lerJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
// Pastas, inclusive links para pasta (o "npx skills add" costuma instalar a skill como link).
const ehPasta = (dir, d) => d.isDirectory() || (d.isSymbolicLink() && (() => { try { return fs.statSync(path.join(dir, d.name)).isDirectory() } catch { return false } })())
const pastas = (dir) => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => ehPasta(dir, d)).map((d) => path.join(dir, d.name)) } catch { return [] } }
// Achados críticos já analisados à mão nas skills do kit (mesma lista que o teste skills-do-kit usa no repositório).
const ACEITOS = lerJson(path.join(path.dirname(fileURLToPath(import.meta.url)), 'falsos-positivos-skills.json'))?.aceitos ?? []

// O que está instalado: pastas de skill (com SKILL.md) e raízes de plugin (com .claude-plugin/plugin.json).
function inventario() {
  const itens = new Map()
  const skill = (dir, origem, plugin) => { if (fs.existsSync(path.join(dir, 'SKILL.md'))) itens.set(dir, { tipo: 'skill', dir, origem, plugin }) }
  for (const base of [path.join(projeto, '.claude', 'skills'), path.join(projeto, '.agents', 'skills'),
    path.join(config, 'skills'), path.join(casa, '.agents', 'skills')]) {
    for (const d of pastas(base)) skill(d, base)
  }
  const cache = process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR || path.join(config, 'plugins', 'cache')
  const raizes = []
  const achar = (dir, nivel) => {
    if (nivel > 3) return
    if (fs.existsSync(path.join(dir, '.claude-plugin', 'plugin.json'))) { raizes.push(dir); return }
    for (const d of pastas(dir)) achar(d, nivel + 1)
  }
  achar(cache, 0)
  for (const raiz of raizes) {
    const marketplace = path.relative(cache, raiz).split(path.sep)[0]
    const nome = lerJson(path.join(raiz, '.claude-plugin', 'plugin.json'))?.name ?? path.basename(raiz)
    itens.set(raiz, { tipo: 'plugin', dir: raiz, marketplace, nome })
    for (const d of pastas(path.join(raiz, 'skills'))) skill(d, raiz, `${nome}@${marketplace}`)
  }
  return itens
}

// Assinatura barata: caminho, tamanho e data de cada arquivo (sem ler o conteúdo).
function assinatura(dir) {
  const h = createHash('sha1')
  const andar = (d, nivel) => {
    if (nivel > 6) return
    let itens = []
    try { itens = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const i of itens.sort((a, b) => a.name.localeCompare(b.name))) {
      if (i.name === 'node_modules' || i.name === '.git') continue
      const p = path.join(d, i.name)
      if (ehPasta(d, i)) andar(p, nivel + 1)
      else { try { const s = fs.lstatSync(p); h.update(`${path.relative(dir, p)}|${s.size}|${Math.round(s.mtimeMs)}\n`) } catch { /* sumiu */ } }
    }
  }
  andar(dir, 0)
  return h.digest('hex')
}

// Como rodar o verificador da Sentry: uv (instala o pyyaml sozinho) ou python com pyyaml.
function executor() {
  const tem = (cmd, a) => spawnSync(cmd, a, { stdio: 'ignore', timeout: 15000, windowsHide: true }).status === 0
  if (tem('uv', ['--version'])) return ['uv', ['run', '--quiet', SCANNER]]
  for (const py of ['python3', 'python']) if (tem(py, ['-c', 'import yaml'])) return [py, [SCANNER]]
  return null
}

// Nome da skill do kit como ela está no repositório (plugins/<plugin>/skills/<skill>), para casar com a lista de aceitos.
const doKit = (marketplace) => ['devconductor', 'devagents'].includes(marketplace)
const noRepositorio = (item) => `plugins/${item.plugin.split('@')[0].replace(/^devagents-core$/, 'devconductor-core')}/skills/${path.basename(item.dir)}`
const aceito = (item, f) => ACEITOS.some((a) => a.skill === noRepositorio(item) && a.arquivo === String(f.location).split(':')[0] &&
  a.tipo === f.type && (!a.trecho || String(f.evidence ?? f.description).includes(a.trecho)))

function verificarSkill(item, rodar) {
  if (!rodar) return { nivel: 'sem-verificador' }
  const r = spawnSync(rodar[0], [...rodar[1], item.dir], { encoding: 'utf8', timeout: 20000, windowsHide: true, maxBuffer: 20 * 1024 * 1024 })
  const motivo = (texto) => ({ nivel: 'falhou', motivo: texto })
  if (r.error?.code === 'ETIMEDOUT' || r.signal) return motivo('o verificador passou do tempo (20 s)')
  if (r.error) return motivo(`não consegui rodar ${rodar[0]}: ${r.error.message}`)
  let rel
  try { rel = JSON.parse(r.stdout) } catch { return motivo(`saída inesperada do verificador: ${(r.stderr || r.stdout || '').trim().split(/\r?\n/).pop()?.slice(0, 160) || 'vazia'}`) }
  if (rel.error) return motivo(rel.error)
  const c = rel.finding_counts ?? {}
  const criticos = (rel.findings ?? []).filter((f) => f.severity === 'critical')
  // Kit: só avisa crítico que ninguém analisou ainda (os "altos" do kit são revisados no repositório).
  if (item.plugin && doKit(item.plugin.split('@')[1])) {
    const novos = criticos.filter((f) => !aceito(item, f))
    return { nivel: novos.length ? 'critico' : 'limpo', contagem: { critical: novos.length }, doKit: true,
      criticos: novos.slice(0, 5).map((f) => `${f.location} ${f.type}`) }
  }
  const nivel = c.critical ? 'critico' : c.high ? 'alto' : c.medium ? 'medio' : 'limpo'
  return { nivel, contagem: c, urlsDesconhecidas: rel.urls?.untrusted?.length ?? 0, criticos: criticos.slice(0, 5).map((f) => `${f.location} ${f.type}`) }
}

// Hooks e MCP do plugin: nos arquivos padrão e também os declarados no plugin.json (objeto ou caminho, um ou vários).
function verificarPlugin(item) {
  const manifesto = lerJson(path.join(item.dir, '.claude-plugin', 'plugin.json')) ?? {}
  const fontes = (valor, padrao) => {
    const lista = [path.join(item.dir, padrao)]
    for (const v of [valor].flat().filter(Boolean)) lista.push(typeof v === 'string' ? path.resolve(item.dir, v) : v)
    return lista.map((v) => (typeof v === 'string' ? lerJson(v) : v)).filter(Boolean)
  }
  const comandos = []
  for (const arq of fontes(manifesto.hooks, path.join('hooks', 'hooks.json'))) {
    for (const [evento, grupos] of Object.entries(arq.hooks ?? arq)) {
      if (!Array.isArray(grupos)) continue
      for (const g of grupos) for (const h of g?.hooks ?? []) if (h.command) comandos.push(`${evento}${g.matcher ? `(${g.matcher})` : ''}: ${h.command}`)
    }
  }
  const mcp = [...new Set(fontes(manifesto.mcpServers, '.mcp.json').flatMap((arq) => Object.keys(arq.mcpServers ?? arq)))]
  return { nivel: comandos.length || mcp.length ? 'revisar' : 'limpo', comandos: [...new Set(comandos)], mcp }
}

const anterior = lerJson(ESTADO) ?? {}
const atual = {}
const novos = []
let pendentes = 0
let rodar
for (const item of inventario().values()) {
  const sig = assinatura(item.dir)
  const visto = anterior[item.dir]
  // Sem verificador ou com falha não fica guardado como verificado: tenta de novo na próxima vez.
  if (visto?.assinatura === sig && visto.versao === VERSAO && !['sem-verificador', 'falhou'].includes(visto.resultado?.nivel)) { atual[item.dir] = visto; continue }
  if (Date.now() - inicio > PRAZO_MS) { pendentes++; continue } // sem gravar: fica para a próxima vez
  if (item.tipo === 'skill' && rodar === undefined) rodar = executor()
  const resultado = item.tipo === 'skill' ? verificarSkill(item, rodar) : verificarPlugin(item)
  atual[item.dir] = { assinatura: sig, versao: VERSAO, resultado, em: new Date().toISOString() }
  novos.push({ ...item, resultado })
}
try { fs.mkdirSync(path.dirname(ESTADO), { recursive: true }); fs.writeFileSync(ESTADO, JSON.stringify(atual, null, 1)) } catch { /* sem gravar: verifica de novo na próxima */ }

if (!novos.length && !pendentes) process.exit(0)
const nome = (i) => (i.tipo === 'plugin' ? `plugin ${i.nome}@${i.marketplace}` : `skill ${path.basename(i.dir)}${i.plugin ? ` (do plugin ${i.plugin})` : ''}`)
const linhas = []
// Kit: o verificarSkill já tirou os críticos analisados e não conta os altos. De fora: avisa a partir de alto.
const graves = novos.filter((i) => ['critico', 'alto'].includes(i.resultado.nivel))
const medios = novos.filter((i) => i.resultado.nivel === 'medio')
// Hooks dos plugins do próprio DevConductor são conhecidos; os dos outros, listados.
const comHooks = novos.filter((i) => i.tipo === 'plugin' && i.resultado.nivel === 'revisar' && !doKit(i.marketplace))
const semVerificador = novos.filter((i) => i.resultado.nivel === 'sem-verificador')
const falharam = novos.filter((i) => i.resultado.nivel === 'falhou')
const limpos = novos.length - graves.length - medios.length - comHooks.length - semVerificador.length - falharam.length
for (const i of graves) {
  const c = i.resultado.contagem
  linhas.push(`- ${nome(i)}: ${c.critical ?? 0} crítico(s), ${c.high ?? 0} alto(s) — ${i.dir}` +
    (i.resultado.criticos?.length ? ` (críticos: ${i.resultado.criticos.join('; ')})` : ''))
}
for (const i of comHooks.slice(0, 8)) {
  linhas.push(`- ${nome(i)} roda comandos sozinho: ${i.resultado.comandos.slice(0, 4).join(' | ')}${i.resultado.mcp.length ? ` · MCP: ${i.resultado.mcp.join(', ')}` : ''}`)
}
let texto = `DevConductor (verificar-instalados): ${novos.length} item(ns) novo(s) ou alterado(s) verificado(s); ${limpos} sem nada a revisar` +
  (medios.length ? `, ${medios.length} só com achados médios (${medios.slice(0, 5).map(nome).join(', ')})` : '') + '.'
if (linhas.length) {
  texto += `\nPara revisar ANTES de usar:\n${linhas.join('\n')}\n` +
    'Avise o usuário em uma linha. Para cada skill com achado crítico/alto, siga a skill skill-scanner (análise completa: ' +
    'muitos achados são falso positivo em skills de segurança, que citam ataques para detectá-los). Nos plugins, leia os ' +
    'comandos dos hooks: se algo for suspeito, diga e sugira "claude plugin disable <nome>"; não desative sozinho.'
}
if (semVerificador.length) texto += `\n${semVerificador.length} skill(s) sem verificação automática: falta o uv (https://docs.astral.sh/uv/) ou python com pyyaml. Ofereça instalar o uv.`
if (falharam.length) texto += `\nO verificador falhou em ${falharam.length} skill(s) (tento de novo na próxima vez): ` +
  falharam.slice(0, 3).map((i) => `${nome(i)}: ${i.resultado.motivo}`).join(' | ')
if (pendentes) texto += `\n${pendentes} item(ns) ficaram para a próxima verificação (tempo esgotado).`

if (aposComando) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: texto } }))
else console.log(texto)
