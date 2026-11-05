// Compara grupos de medições do medir-uso (JSON) — por exemplo, as mesmas tarefas com e sem o grafo do código,
// ou com e sem o roteamento de modelo. Não estima preço: mostra tokens por categoria e por modelo, e a diferença.
// Uso: node scripts/comparar-medicoes.mjs "<rótulo>=<arquivos>" "<rótulo>=<arquivos>" [--json]
//   <arquivos>: caminhos separados por vírgula; aceita * no nome do arquivo (o PowerShell não expande para o node).
// Ex.: node scripts/comparar-medicoes.mjs "sem=pilotos/medicoes/grafo-*-sem.json" "com=pilotos/medicoes/grafo-*-com.json"
// O primeiro grupo é a base: a diferença dos outros é contra ele.
import fs from 'node:fs'
import path from 'node:path'
import { auditarEnsaio } from './lib/qualidade-ensaio.mjs'

const falhar = (msg) => { console.error(msg); process.exit(1) }
const args = process.argv.slice(2)
const comoJson = args.includes('--json')
const grupos = []
let arquivoEnsaio, auditoria, plano
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--json') continue
  if (args[i] === '--ensaio') {
    if (arquivoEnsaio || !args[i + 1] || args[i + 1].startsWith('--')) falhar('Informe um único --ensaio <plano.json>.')
    arquivoEnsaio = args[++i]
  } else grupos.push(args[i])
}
if (grupos.length < 2) falhar('Informe pelo menos dois grupos: "rótulo=arquivos" "rótulo=arquivos" (o primeiro é a base).')
if (arquivoEnsaio) {
  auditoria = auditarEnsaio(arquivoEnsaio)
  if (auditoria.estado !== 'aprovado') falhar(`Ensaio ${auditoria.estado}: comparação bloqueada. ${auditoria.problemas[0] || auditoria.pendentes[0]}`)
  plano = lerTexto(arquivoEnsaio)
  plano = JSON.parse(plano)
}

function expandir(padrao) {
  if (!padrao.includes('*')) return fs.existsSync(padrao) ? [padrao] : falhar(`Arquivo não encontrado: ${padrao}`)
  const dir = path.dirname(padrao)
  if (dir.includes('*')) falhar(`Use * só no nome do arquivo, não na pasta: ${padrao}`)
  const re = new RegExp('^' + path.basename(padrao).split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
  const achados = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => re.test(n)).sort().map((n) => path.join(dir, n)) : []
  return achados.length ? achados : falhar(`Nenhum arquivo para ${padrao}`)
}

// O ">" do Windows PowerShell 5.1 grava UTF-16; os outros, UTF-8 (às vezes com BOM).
function lerTexto(arq) {
  const b = fs.readFileSync(arq)
  if (b[0] === 0xff && b[1] === 0xfe) return b.subarray(2).toString('utf16le')
  if (b[0] === 0xfe && b[1] === 0xff) return Buffer.from(b.subarray(2)).swap16().toString('utf16le')
  return b.toString('utf8').replace(/^\uFEFF/, '')
}

// Cada arquivo traz os totais já sem mensagens repetidas (o medir-uso deduplica por message.id); somar as sessões
// contaria duas vezes o histórico compartilhado entre elas. Entre arquivos não há como deduplicar: a mesma sessão em
// dois arquivos do grupo é recusada.
const CAMPOS = ['entrada', 'cacheLido', 'saida']
function somar(rotulo, arquivos) {
  const g = { rotulo, arquivos, sessoes: 0, respostas: 0, entrada: 0, cacheLido: 0, saida: 0, porModelo: {}, porModeloAproximado: false }
  const vistas = new Map()
  for (const arq of arquivos) {
    let rel
    try { rel = JSON.parse(lerTexto(arq)) } catch { falhar(`Não é um JSON do medir-uso: ${arq}`) }
    const sessoes = rel.sessoes ?? rel.projetos?.flatMap((p) => p.sessoes ?? [])
    if (!sessoes || !rel.totais) falhar(`Sem sessões ou totais em: ${arq} (gere com: node scripts/medir-uso.mjs <projeto> --json)`)
    for (const s of sessoes) {
      if (vistas.has(s.id)) falhar(`A sessão ${s.id} está em ${vistas.get(s.id)} e em ${arq}: seria contada duas vezes.`)
      vistas.set(s.id, arq)
    }
    g.sessoes += sessoes.length
    for (const c of CAMPOS) g[c] += rel.totais[c] ?? 0
    g.respostas += rel.mensagensUnicas ?? 0
    // Por modelo: o deduplicado do arquivo; em arquivo antigo (sem ele), a soma das sessões, que só é exata sem
    // mensagens compartilhadas.
    let modelos = rel.porModelo
    if (!modelos) {
      if (sessoes.some((s) => s.mensagensCompartilhadas > 0)) g.porModeloAproximado = true
      modelos = {}
      for (const s of sessoes) for (const [m, v] of Object.entries(s.porModelo ?? {})) {
        const t = (modelos[m] ??= { respostas: 0, entrada: 0, cacheGravado: 0, cacheLido: 0, saida: 0 })
        for (const k of Object.keys(t)) t[k] += v[k] ?? 0
      }
    }
    for (const [modelo, m] of Object.entries(modelos)) {
      const t = (g.porModelo[modelo] ??= { respostas: 0, entrada: 0, cacheLido: 0, saida: 0 })
      t.respostas += m.respostas ?? 0
      t.entrada += (m.entrada ?? 0) + (m.cacheGravado ?? 0)
      t.cacheLido += m.cacheLido ?? 0
      t.saida += m.saida ?? 0
    }
  }
  g.entradaMaisCache = g.entrada + g.cacheLido
  return g
}

const resultado = grupos.map((arg) => {
  const i = arg.indexOf('=')
  if (i < 1) falhar(`Grupo sem rótulo: ${arg} (use "rótulo=arquivos")`)
  return somar(arg.slice(0, i), arg.slice(i + 1).split(',').filter(Boolean).flatMap(expandir))
})
if (plano) {
  if (resultado.length !== 2 || resultado[0].rotulo !== 'base' || resultado[1].rotulo !== 'depois') falhar('Com --ensaio, use os grupos base e depois, nesta ordem.')
  const dir = path.dirname(fs.realpathSync(arquivoEnsaio))
  const nomesTarefa = new Set()
  for (const g of resultado) {
    if (g.arquivos.length !== 3) falhar('Com --ensaio, compare as três repetições de uma única tarefa por grupo.')
    for (const f of g.arquivos) {
      const real = fs.realpathSync(f)
      const j = plano.jobs.find(j => fs.realpathSync(path.resolve(dir, j.arquivoMedicao)) === real)
      if (!j || j.grupo !== g.rotulo) falhar('Medição não pertence ao grupo aprovado no ensaio.')
      nomesTarefa.add(j.tarefa)
    }
  }
  if (nomesTarefa.size !== 1) falhar('Com --ensaio, não misture tarefas diferentes na comparação.')
}
const base = resultado[0]
const variacao = (v, b) => (b === 0 ? null : Math.round(((v - b) / b) * 1000) / 10)
for (const g of resultado.slice(1)) {
  g.diferencaContraBase = Object.fromEntries(['entradaMaisCache', ...CAMPOS, 'respostas'].map((c) => [c, variacao(g[c], base[c])]))
}

if (comoJson) { console.log(JSON.stringify({ base: base.rotulo, grupos: resultado, ...(auditoria ? { auditoria } : {}) }, null, 2)); process.exit(0) }

const mil = (n) => n.toLocaleString('pt-BR')
const pct = (v) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR')}%`)
const col = (t, n) => String(t).padStart(n)
console.log(`${'Grupo'.padEnd(12)}${col('Sessões', 8)}${col('Respostas', 10)}${col('Entrada', 12)}${col('Cache lido', 13)}${col('Saída', 10)}${col('Entr.+cache', 13)}`)
for (const g of resultado) {
  console.log(`${g.rotulo.slice(0, 11).padEnd(12)}${col(g.sessoes, 8)}${col(g.respostas, 10)}${col(mil(g.entrada), 12)}${col(mil(g.cacheLido), 13)}${col(mil(g.saida), 10)}${col(mil(g.entradaMaisCache), 13)}`)
}
for (const g of resultado.slice(1)) {
  const d = g.diferencaContraBase
  console.log(`\n${g.rotulo} contra ${base.rotulo}: entrada+cache ${pct(d.entradaMaisCache)} · entrada ${pct(d.entrada)} · cache lido ${pct(d.cacheLido)} · saída ${pct(d.saida)} · respostas ${pct(d.respostas)}`)
}
console.log('\nPor modelo:')
for (const g of resultado) {
  const linhas = Object.entries(g.porModelo).map(([m, t]) => `${m}: ${t.respostas} respostas, entrada ${mil(t.entrada)}, cache lido ${mil(t.cacheLido)}, saída ${mil(t.saida)}`)
  console.log(`  ${g.rotulo}: ${linhas.join(' | ') || '—'}`)
}
for (const g of resultado.filter((x) => x.porModeloAproximado)) {
  console.log(`\nAtenção: em ${g.rotulo}, a divisão por modelo soma sessões com histórico compartilhado (arquivo antigo do medir-uso); os totais acima estão certos. Gere de novo para a divisão exata.`)
}
if (resultado.some((g) => g.sessoes !== base.sessoes)) {
  console.log('\nAtenção: os grupos têm números diferentes de sessões; compare as mesmas tarefas dos dois lados.')
}
console.log('Preço não é estimado: o mesmo token custa diferente por modelo e por categoria (entrada, cache, saída).')
if (auditoria) console.log(auditoria.limite)
