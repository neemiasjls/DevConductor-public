// Detecta a stack do projeto ao abrir a sessão e liga só os plugins de stack do DevConductor que ele usa.
// Instala no escopo local (<projeto>/.claude/settings.local.json, fora do git). Nunca desliga nada e não
// religa o que o usuário desligou (plugin já listado em enabledPlugins, mesmo como false, é respeitado).
// Uso: node detectar-stack.mjs [--projeto "<pasta>"] [--dry-run]
//   --dry-run → só mostra o que instalaria, sem mexer em nada.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const iProjeto = args.indexOf('--projeto')
const projeto = iProjeto >= 0 ? args[iProjeto + 1] : (process.env.CLAUDE_PROJECT_DIR || process.cwd())
const simular = args.includes('--dry-run')
const MARKETPLACE = 'devconductor'
const IGNORAR = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', 'target', '.venv', 'venv',
  '__pycache__', '.next', '.claude', 'coverage', '.idea', '.vs'])

// Lista arquivos até 3 níveis de profundidade, sem as pastas de dependência e build.
function listar(dir, nivel = 0, saida = []) {
  if (nivel > 3) return saida
  let itens = []
  try { itens = fs.readdirSync(dir, { withFileTypes: true }) } catch { return saida }
  for (const i of itens) {
    if (IGNORAR.has(i.name)) continue
    const p = path.join(dir, i.name)
    if (i.isDirectory()) { saida.push({ p, nome: i.name, dir: true }); listar(p, nivel + 1, saida) }
    else saida.push({ p, nome: i.name, dir: false })
  }
  return saida
}

const ler = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }
const lerJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return {} } }

const arquivos = listar(projeto)
const tem = (re) => arquivos.some((a) => !a.dir && re.test(a.nome))
const conteudo = (re) => arquivos.filter((a) => !a.dir && re.test(a.nome)).map((a) => ler(a.p)).join('\n')

const stacks = new Set()
if (tem(/\.(sln|csproj)$/)) stacks.add('stack-dotnet')
if (tem(/^(pom\.xml|build\.gradle(\.kts)?)$/)) stacks.add('stack-java')
if (tem(/^(package\.json|tsconfig\.json)$/)) stacks.add('stack-typescript')
const arquivosPy = arquivos.filter((a) => !a.dir && a.nome.endsWith('.py')).length
if (tem(/^(requirements[\w-]*\.txt|pyproject\.toml|setup\.py|Pipfile)$/) || arquivosPy >= 3) stacks.add('stack-python')

const pacotes = conteudo(/^package\.json$/)
const dotnet = conteudo(/\.csproj$/)
const java = conteudo(/^(pom\.xml|build\.gradle(\.kts)?)$/)
const python = conteudo(/^(requirements[\w-]*\.txt|pyproject\.toml)$/)

const usaBanco = arquivos.some((a) => a.dir && /^(supabase|migrations|prisma)$/.test(a.nome)) || tem(/\.sql$/) ||
  /"(pg|postgres|@supabase\/supabase-js|prisma|@prisma\/client|drizzle-orm|typeorm|knex|mysql2|sequelize)"/.test(pacotes) ||
  /Npgsql|EntityFrameworkCore|Dapper|SqlClient/.test(dotnet) ||
  /postgresql|mysql|spring-boot-starter-data-jpa|hibernate/.test(java) ||
  /psycopg|sqlalchemy|asyncpg|django/i.test(python)
if (usaBanco) stacks.add('stack-banco')

const temBackend = stacks.has('stack-dotnet') || stacks.has('stack-java') || stacks.has('stack-python') ||
  /"(express|fastify|@nestjs\/core|hono|koa|next)"/.test(pacotes)
if (temBackend) stacks.add('seguranca')

// Fábrica de landing pages: pasta clientes/ na raiz (padrão do lp-maestro) ou marcador .landing-pages.
const raizItens = (() => { try { return fs.readdirSync(projeto) } catch { return [] } })()
if (raizItens.includes('clientes') || raizItens.includes('.landing-pages')) {
  stacks.add('landing-pages')
  stacks.add('estudio-design')
}
if (raizItens.includes('.estudio-design')) stacks.add('estudio-design') // estudos em qualquer tipo de site

// Sistema (painel, cadastro, área logada): React ou Next com roteador, formulário, tabela, consulta à API ou
// login; ou Blazor (arquivo .razor ou pacote Microsoft.AspNetCore.Components num .csproj). A fábrica de landing
// pages fica de fora; o marcador .design-sistemas liga em qualquer projeto.
const SINAIS_DE_SISTEMA = /"(react-router(-dom)?|@tanstack\/react-(router|table|query)|react-hook-form|@refinedev\/core|react-admin|next-auth|@auth\/core|@clerk\/[\w-]+|@supabase\/supabase-js)"\s*:/
const reactDeSistema = /"(react|next)"\s*:/.test(pacotes) && SINAIS_DE_SISTEMA.test(pacotes)
const blazor = tem(/\.razor$/) || /Include\s*=\s*"Microsoft\.AspNetCore\.Components[\w.]*"/.test(dotnet)
if (raizItens.includes('.design-sistemas') || ((reactDeSistema || blazor) && !stacks.has('landing-pages'))) {
  stacks.add('design-sistemas')
}

// Grafo do código (Graphify, DEV-21): só compensa em projeto grande, onde explorar custa caro. A contagem
// desce mais que a listagem acima (Java e .NET aninham fundo) e para assim que passa do limite.
const LIMITE_GRAFO = 200
const CODIGO = /\.(py|ts|tsx|js|jsx|mjs|cjs|go|rs|java|kt|scala|cs|c|cc|cpp|h|hpp|rb|php|swift)$/
function contarCodigo(dir, nivel = 0, total = { n: 0 }) {
  if (nivel > 12 || total.n >= LIMITE_GRAFO) return total.n
  let itens = []
  try { itens = fs.readdirSync(dir, { withFileTypes: true }) } catch { return total.n }
  for (const i of itens) {
    if (total.n >= LIMITE_GRAFO) break
    if (IGNORAR.has(i.name) || i.name === 'graphify-out') continue
    if (i.isDirectory()) contarCodigo(path.join(dir, i.name), nivel + 1, total)
    else if (CODIGO.test(i.name) && !/\.(min|d)\.[cm]?[jt]s$/.test(i.name)) total.n++
  }
  return total.n
}
if (raizItens.includes('.graphify') || contarCodigo(projeto) >= LIMITE_GRAFO) stacks.add('grafo-codigo')

if (stacks.size === 0) process.exit(0)

const CONFIG = path.join(projeto, '.claude', 'settings.json')
const LOCAL = path.join(projeto, '.claude', 'settings.local.json')
const ligados = { ...lerJson(CONFIG).enabledPlugins, ...lerJson(LOCAL).enabledPlugins }
// O hook não migra instalações: um ID legado, até false, continua sendo uma escolha explícita.
// A troca para o catálogo novo é feita pelo instalador, que preserva escopos e evita dois plugins ativos.
const faltam = [...stacks].filter((s) => !(`${s}@${MARKETPLACE}` in ligados) && !(`${s}@devagents` in ligados))
  .map((s) => `${s}@${MARKETPLACE}`)

if (faltam.length === 0) process.exit(0)

if (simular) {
  console.log(`DevConductor (simulação) em ${path.basename(projeto)}: instalaria ${faltam.join(', ')}`)
  process.exit(0)
}

// Só marcar em enabledPlugins não basta: o plugin precisa ser instalado. O escopo "local" grava no
// settings.local.json do projeto (fora do git) e não afeta outros projetos.
const ligou = []
const falhou = []
for (const id of faltam) {
  try {
    execSync(`claude plugin install ${id} --scope local`, { cwd: projeto, shell: true, stdio: 'pipe', timeout: 60000 })
    ligou.push(id)
  } catch (e) {
    // A última linha do erro da CLI diz o motivo; sem ela o usuário não sabe o que corrigir.
    const motivo = String(e.stderr || e.message || '').trim().split(/\r?\n/).pop()
    falhou.push(motivo ? `${id} (${motivo})` : id)
  }
}
if (ligou.length) console.log(`DevConductor: stack detectada; instalei ${ligou.join(', ')} só neste projeto. ` +
  'Avise o usuário que os especialistas entram na próxima sessão (reiniciar ou abrir sessão nova).')
if (falhou.length) console.log(`DevConductor: não consegui instalar ${falhou.join(', ')}; ` +
  `rode "claude plugin install <nome> --scope local" na pasta do projeto.`)
if (falhou.length) process.exitCode = 1
