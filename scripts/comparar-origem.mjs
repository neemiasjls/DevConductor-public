// Mostra o que mudou no wshobson/agents desde a cópia (fontes.json), sem mexer em nada.
// Uso: git clone --depth 1 https://github.com/wshobson/agents <pasta-temporaria>
//      node scripts/comparar-origem.mjs <pasta-temporaria>
// Agentes: compara só o corpo (o cabeçalho tem name/model/description trocados por nós de propósito).
// Skills: compara arquivo por arquivo. Se algo mudou e interessa: rodar importar.mjs e subir a versão.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clone = process.argv[2]
if (!clone || !fs.existsSync(path.join(clone, 'plugins'))) {
  console.log('Informe a pasta de um clone novo do wshobson/agents.')
  process.exit(1)
}

const fontes = JSON.parse(fs.readFileSync(path.join(raiz, 'fontes.json'), 'utf8'))
const commitNovo = execSync('git rev-parse HEAD', { cwd: clone }).toString().trim()
const hash = (f) => crypto.createHash('sha1').update(fs.readFileSync(f).toString().replace(/\r\n/g, '\n')).digest('hex')
const corpo = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '')
const arquivos = (dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).map((f) => f.replaceAll('\\', '/')).sort()
  : []

const relatorio = { igual: [], mudou: [], sumiu: [] }
for (const item of fontes.arquivos.filter((a) => a.origem === 'wshobson')) {
  const origem = path.join(clone, item.caminho)
  const nosso = path.join(raiz, item.destino)
  if (!fs.existsSync(origem)) { relatorio.sumiu.push(item.destino); continue }
  if (fs.statSync(origem).isFile()) {
    (corpo(origem) === corpo(nosso) ? relatorio.igual : relatorio.mudou).push(item.destino)
    continue
  }
  const a = arquivos(origem), b = arquivos(nosso)
  const diferentes = [...new Set([...a, ...b])].filter((f) =>
    !a.includes(f) || !b.includes(f) || hash(path.join(origem, f)) !== hash(path.join(nosso, f)))
  ;(diferentes.length ? relatorio.mudou : relatorio.igual).push(item.destino + (diferentes.length ? `  (${diferentes.join(', ')})` : ''))
}

const commitAntigo = fontes.arquivos.find((a) => a.origem === 'wshobson')?.commit
console.log(`wshobson: copiado de ${commitAntigo?.slice(0, 7)} · origem agora em ${commitNovo.slice(0, 7)}`)
console.log(`Iguais: ${relatorio.igual.length}`)
if (relatorio.mudou.length) console.log(`Mudaram na origem (${relatorio.mudou.length}):\n  ${relatorio.mudou.join('\n  ')}`)
if (relatorio.sumiu.length) console.log(`Sumiram da origem (${relatorio.sumiu.length}):\n  ${relatorio.sumiu.join('\n  ')}`)
if (!relatorio.mudou.length && !relatorio.sumiu.length) console.log('Nada mudou. Nenhuma ação necessária.')
