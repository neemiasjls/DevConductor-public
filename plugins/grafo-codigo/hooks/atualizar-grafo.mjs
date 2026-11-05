// Ao abrir a sessão, atualiza o grafo do código (graphify-out/) em segundo plano. Usa só o modo AST do
// Graphify (`graphify update`): roda local, sem LLM e sem gastar tokens. Docs, PDFs e imagens ficam de fora;
// o grafo completo com LLM (/graphify) só quando o usuário pedir.
// Em projeto grande o update leva de 15 s a 1 min mesmo sem mudança (medido em repositórios de 600 e 2 mil
// arquivos), então só roda quando algum arquivo de código mudou, nasceu, sumiu ou trocou de nome desde o último.
// Não instala nada: se a CLI não existir, avisa a sessão para oferecer a instalação ao usuário.
// Uso: node atualizar-grafo.mjs [--projeto "<pasta>"] [--dry-run]
//      node atualizar-grafo.mjs --executar --projeto "<pasta>"   (interno: o processo em segundo plano)
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { pastaForaDoPath, comandoCli } from './cli-graphify.mjs'

const args = process.argv.slice(2)
const iProjeto = args.indexOf('--projeto')
const projeto = iProjeto >= 0 ? args[iProjeto + 1] : (process.env.CLAUDE_PROJECT_DIR || process.cwd())
const simular = args.includes('--dry-run')
// CLI instalada fora do PATH: entra no PATH deste processo (e do update em segundo plano, que herda o ambiente).
const pastaCli = pastaForaDoPath()
if (pastaCli) process.env.PATH = `${process.env.PATH || ''}${path.delimiter}${pastaCli}`
const SAIDA = path.join(projeto, 'graphify-out')
const ESTADO = path.join(SAIDA, '.devagents-estado.json')
const TRAVA = path.join(SAIDA, '.devagents-atualizando')
const TRAVA_VALIDA_MS = 15 * 60 * 1000
const IGNORAR = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', 'target', '.venv', 'venv',
  '__pycache__', '.next', '.claude', 'coverage', '.idea', '.vs', 'graphify-out'])
const CODIGO = /\.(py|ts|tsx|js|jsx|mjs|cjs|go|rs|java|kt|scala|cs|c|cc|cpp|h|hpp|rb|php|swift)$/
const avisar = (texto) => console.log(`DevConductor (grafo-codigo): ${texto}`)
const lerJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }

// Processo em segundo plano (a trava já foi pega por quem o chamou). Grava o inventário de ANTES do update e a
// hora em que começou: o que mudar, nascer, sumir ou trocar de nome durante o update aparece na próxima sessão.
if (args.includes('--executar')) {
  const antes = varrer()
  const inicio = Date.now()
  const r = spawnSync('graphify update .', { cwd: projeto, shell: true, stdio: 'ignore', windowsHide: true })
  if (r.status === 0) { fs.mkdirSync(SAIDA, { recursive: true }); fs.writeFileSync(ESTADO, JSON.stringify({ ...antes, em: inicio })) }
  fs.rmSync(TRAVA, { force: true })
  process.exit(r.status ?? 1)
}

// Inventário do código: quantos arquivos, quando o mais recente mudou e uma assinatura dos caminhos (pega
// renomear e mover, que não mudam a data do arquivo). Milissegundos mesmo com milhares de arquivos.
function varrer() {
  const caminhos = []
  let ultimaMudanca = 0
  const andar = (dir, nivel) => {
    if (nivel > 20) return
    let itens = []
    try { itens = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const i of itens) {
      if (IGNORAR.has(i.name)) continue
      const p = path.join(dir, i.name)
      if (i.isDirectory()) andar(p, nivel + 1)
      else if (i.isFile() && CODIGO.test(i.name)) {
        caminhos.push(path.relative(projeto, p).replaceAll('\\', '/'))
        try { ultimaMudanca = Math.max(ultimaMudanca, fs.statSync(p).mtimeMs) } catch { /* sumiu agora */ }
      }
    }
  }
  andar(projeto, 0)
  const assinatura = createHash('sha1').update(caminhos.sort().join('\n')).digest('hex')
  return { arquivos: caminhos.length, ultimaMudanca, assinatura }
}

const existe = fs.existsSync(path.join(SAIDA, 'graph.json'))
const estado = lerJson(ESTADO)
const agora = varrer()
const emDia = existe && estado && estado.assinatura === agora.assinatura && agora.ultimaMudanca <= estado.em
const DICA_CLI = pastaCli ? ` A CLI está fora do PATH: chame ${comandoCli(pastaCli)} no lugar de graphify.` : ''
const USO = 'Para localizar código, ver quem chama o quê ou o impacto de uma mudança, siga a skill grafo-codigo antes de grep e leituras em série.' + DICA_CLI

if (emDia) { avisar(`grafo do código em dia em graphify-out/. ${USO}`); process.exit(0) }

// Trava com criação exclusiva: entre duas sessões abrindo juntas, só uma ganha. Trava velha (update que morreu)
// só é quebrada por quem pegar antes uma segunda trava exclusiva; assim duas sessões não a quebram juntas.
const criar = (arq) => { try { fs.closeSync(fs.openSync(arq, 'wx')); return true } catch (e) { if (e.code === 'EEXIST') return false; throw e } }
const idade = (arq) => { try { return Date.now() - fs.statSync(arq).mtimeMs } catch { return Infinity } }
function pegarTrava() {
  try {
    fs.mkdirSync(SAIDA, { recursive: true })
    if (criar(TRAVA)) return true
    if (idade(TRAVA) < TRAVA_VALIDA_MS) return false
    const quebra = `${TRAVA}.quebra`
    // A trava de quebra vive ~1 ms; só sobra se uma sessão morrer nesse instante. Só é apagada se existir e for
    // muito velha (ausente não conta como velha: apagar às cegas poderia remover a de outra sessão que acabou de criar).
    const iq = (() => { try { return Date.now() - fs.statSync(quebra).mtimeMs } catch { return null } })()
    if (iq !== null && iq > 10 * 60 * 1000) fs.rmSync(quebra, { force: true })
    if (!criar(quebra)) return false
    try {
      if (idade(TRAVA) < TRAVA_VALIDA_MS) return false // outra sessão já trocou a trava
      fs.rmSync(TRAVA, { force: true })
      return criar(TRAVA)
    } finally { fs.rmSync(quebra, { force: true }) }
  } catch { return false }
}
const travado = () => { try { return Date.now() - fs.statSync(TRAVA).mtimeMs < TRAVA_VALIDA_MS } catch { return false } }
if (travado()) { avisar(`grafo do código sendo atualizado por outra sessão; o graph.json atual serve enquanto isso. ${USO}`); process.exit(0) }

const temCli = spawnSync('graphify --help', { cwd: projeto, shell: true, stdio: 'ignore', timeout: 15000 }).status === 0
if (!temCli) {
  avisar('projeto grande, mas a CLI do Graphify não está instalada. ' +
    'Ofereça ao usuário instalar uma vez nesta máquina (precisa de Python 3.10+): "uv tool install graphifyy" ' +
    'ou "pipx install graphifyy". Não instale sem ele concordar; o grafo passa a ser montado na sessão seguinte.')
  process.exit(0)
}

// O grafo é refeito a partir do código: fica fora do git sem mexer no .gitignore do projeto.
// O git diz onde fica o exclude: em worktree o .git é um arquivo e o exclude é o do repositório principal.
function ignorarNoGit() {
  const r = spawnSync('git', ['rev-parse', '--git-path', 'info/exclude'], { cwd: projeto, encoding: 'utf8', windowsHide: true })
  if (r.status !== 0 || !r.stdout.trim()) return
  const exclude = path.resolve(projeto, r.stdout.trim())
  fs.mkdirSync(path.dirname(exclude), { recursive: true })
  const ler = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }
  const ja = /^\/?graphify-out\/?$/m
  if (ja.test(ler(exclude)) || ja.test(ler(path.join(projeto, '.gitignore')))) return
  const atual = ler(exclude)
  fs.appendFileSync(exclude, `${atual && !atual.endsWith('\n') ? '\n' : ''}# DevConductor: grafo do Graphify\ngraphify-out/\n`)
}

if (simular) {
  avisar(`(simulação) em ${path.basename(projeto)}: ${existe ? 'atualizaria' : 'montaria'} o grafo em graphify-out/`)
  process.exit(0)
}

try { ignorarNoGit() } catch { /* sem permissão no .git: o grafo funciona do mesmo jeito */ }
if (!pegarTrava()) { avisar(`grafo do código sendo atualizado por outra sessão; o graph.json atual serve enquanto isso. ${USO}`); process.exit(0) }
// Em segundo plano para não atrasar a abertura da sessão.
const filho = spawn(process.execPath, [fileURLToPath(import.meta.url), '--executar', '--projeto', projeto],
  { cwd: projeto, detached: true, stdio: 'ignore', windowsHide: true })
filho.on('error', () => {})
filho.unref()

avisar(existe
  ? `código mudou desde o último grafo; atualizando graphify-out/ em segundo plano (o graph.json atual serve enquanto isso). ${USO}`
  : 'montando o grafo do código em graphify-out/ em segundo plano (sem LLM, sem tokens). ' +
    'Quando graph.json existir, use a skill grafo-codigo para localizar código antes de grep e leituras em série.' + DICA_CLI)
