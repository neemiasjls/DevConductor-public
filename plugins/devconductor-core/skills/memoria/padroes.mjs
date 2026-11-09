#!/usr/bin/env node
// Padroes: acha correcoes e pedidos que o usuario repete em sessoes diferentes. So le; nunca grava.
// Uso: node padroes.mjs [pasta do projeto] [--dias 60] [--min 2] [--limite 0.4] [--historico <pasta projects>] [--json]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
let projeto = null
let dias = 60
let min = 2
let limite = 0.4
let historico = null
let comoJson = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--json') comoJson = true
  else if (a === '--dias') dias = Number(args[++i])
  else if (a === '--min') min = Number(args[++i])
  else if (a === '--limite') limite = Number(args[++i])
  else if (a === '--historico') historico = args[++i]
  else if (!a.startsWith('--')) projeto = a
}
if (![dias, min, limite].every(Number.isFinite) || dias <= 0 || min < 1 || limite <= 0 || limite > 1) {
  console.error('Use --dias e --min com números positivos e --limite entre 0 e 1.')
  process.exit(1)
}
const base = historico ? path.resolve(historico) : path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects')
const principal = path.resolve(projeto || '.').replace(/[^A-Za-z0-9]/g, '-')
const desde = Date.now() - dias * 864e5

const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const limparTexto = (t) => ` ${semAcento(t).replace(/[^a-z0-9]+/g, ' ').trim()} `

const MARCAS = ['nao e assim', 'na verdade', 'errado', 'ja falei', 'de novo', 'nao era', 'nao quero', 'sempre', 'nunca', 'continua', 'ainda nao']
const PARADAS = new Set(('a o as os um uma uns umas de do da dos das em no na nos nas por para pra com sem sobre entre e ou mas que se como ao aos ' +
  'eu voce vc ele ela eles me te nos meu minha seu sua isso isto esse essa esses essas este esta aquele aquela aqui ali la ai ' +
  'ser sou e era foi sao tem ter tenho temos tinha ha ja so mais menos muito muita pouco bem mal tambem ainda ' +
  'sim nao ok pode podem pode fazer faz faca fazendo fazer vai vamos ir sobe subir manda mandar publica pronto certo beleza otimo bom boa legal ' +
  'agora depois antes entao ai tudo todo toda todos todas cada algo nada coisa coisas favor por favor quero queria gostaria preciso ' +
  'obrigado valeu continua continue segue siga ver veja olha olhe isso so').split(/\s+/))

// Textos que nao sao digitados pelo usuario.
function textoDigitado(j) {
  if (j.type !== 'user' || j.isMeta) return null
  const c = j.message?.content
  let t
  if (typeof c === 'string') t = c
  else if (Array.isArray(c)) {
    if (c.some((p) => p?.type === 'tool_result')) return null
    t = c.filter((p) => p?.type === 'text' && typeof p.text === 'string').map((p) => p.text).join('\n')
  } else return null
  t = t.trim()
  if (!t || t.startsWith('<') || t.length > 600) return null
  if (t.includes('This session is being continued') || t.includes('Background (from the session')) return null
  if (t.startsWith('[Request interrupted') || t.startsWith('Caveat:')) return null
  return t
}

function mascarar(t) {
  return t
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[cnpj]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\b(?:sk|pk|ghp|gho|ghs|xox[bap]|AKIA|eyJ)[-_A-Za-z0-9.]{8,}/g, '[chave]')
    .replace(/\b(?:bearer|token|senha|password|api[_-]?key|chave)(?:\s+(?:é|e|eh|era|do|da|de))?\s*[:=]?\s*\S{6,}/gi, '[chave]')
    .replace(/(?:\(\d{2}\)\s?|\b\d{2}\s)?\b9?\d{4}-?\d{4}\b/g, '[telefone]')
    .replace(/\b[A-Za-z]:[\\/]Users[\\/][^\s"']+|\/(?:home|Users)\/[^\s"']+/g, '[caminho]')
    .replace(/\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\b/g, '[chave]')
}
const cortar = (t, n = 160) => (t.length > n ? `${t.slice(0, n - 3)}...` : t)

function lerMensagens() {
  const pastas = fs.existsSync(base) ? fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (d.name === principal || d.name.startsWith(`${principal}--claude-worktrees-`)))
    .map((d) => d.name) : []
  const vistas = new Set()
  const mensagens = []
  for (const pasta of pastas) {
    const dir = path.join(base, pasta)
    for (const arq of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort()) {
      let conteudo
      try { conteudo = fs.readFileSync(path.join(dir, arq), 'utf8') } catch { continue }
      for (const linha of conteudo.split('\n')) {
        if (!linha.trim()) continue
        let j
        try { j = JSON.parse(linha) } catch { continue }
        if (!j || typeof j !== 'object') continue
        const texto = textoDigitado(j)
        if (!texto) continue
        const id = j.uuid || j.message?.id
        if (id) { if (vistas.has(id)) continue; vistas.add(id) }
        const quando = Date.parse(j.timestamp)
        if (!Number.isFinite(quando) || quando < desde) continue
        const limpo = limparTexto(texto)
        const tokens = new Set(limpo.trim().split(' ').filter((p) => p.length >= 3 && !PARADAS.has(p)))
        mensagens.push({
          id: id || `${arq}:${mensagens.length}`, sessao: pasta + '/' + arq, quando, texto, tokens,
          correcao: MARCAS.some((m) => limpo.includes(` ${m} `)),
        })
      }
    }
  }
  return mensagens
}

const jaccard = (a, b) => {
  let comum = 0
  for (const t of a) if (b.has(t)) comum++
  return comum / (a.size + b.size - comum)
}

function agrupar(mensagens) {
  const grupos = []
  for (const m of mensagens.filter((x) => x.tokens.size >= 3).sort((a, b) => a.quando - b.quando)) {
    const g = grupos.find((x) => jaccard(x.lider, m.tokens) >= limite)
    if (g) g.itens.push(m)
    else grupos.push({ lider: m.tokens, itens: [m] })
  }
  return grupos.map((g) => {
    const sessoes = new Set(g.itens.map((i) => i.sessao))
    const exemplos = []
    for (const i of g.itens) {
      const e = cortar(mascarar(i.texto).replace(/\s+/g, ' '))
      if (!exemplos.includes(e)) exemplos.push(e)
      if (exemplos.length === 2) break
    }
    const datas = g.itens.map((i) => i.quando)
    return {
      mensagens: g.itens.length, sessoes: sessoes.size,
      de: new Date(Math.min(...datas)).toISOString().slice(0, 10), ate: new Date(Math.max(...datas)).toISOString().slice(0, 10),
      exemplos, ids: g.itens.map((i) => i.id),
    }
  }).sort((a, b) => b.sessoes - a.sessoes || b.mensagens - a.mensagens)
}

const mensagens = lerMensagens()
const correcoes = agrupar(mensagens.filter((m) => m.correcao)).filter((g) => g.sessoes >= min)
const idsA = new Set(correcoes.flatMap((g) => g.ids))
const pedidos = agrupar(mensagens).filter((g) => g.sessoes >= 3)
  .filter((g) => g.ids.filter((i) => idsA.has(i)).length * 2 < g.ids.length)
const limpar = (g) => { const { ids, ...resto } = g; return resto }

if (comoJson) {
  console.log(JSON.stringify({ mensagensAnalisadas: mensagens.length, correcoes: correcoes.map(limpar), pedidos: pedidos.map(limpar) }, null, 2))
} else {
  const data = (d) => d.split('-').reverse().slice(0, 2).join('/')
  const mostrar = (lista) => {
    if (!lista.length) console.log('  Nenhum grupo.')
    for (const g of lista) {
      console.log(`  ${g.mensagens} mensagens em ${g.sessoes} sessões (${data(g.de)} a ${data(g.ate)})`)
      for (const e of g.exemplos) console.log(`    - "${e}"`)
    }
  }
  console.log(`Padrões de ${path.resolve(projeto || '.')} (últimos ${dias} dias, ${mensagens.length} mensagens digitadas)\n`)
  console.log(`A) Correções repetidas (em ${min}+ sessões): ${correcoes.length}`)
  mostrar(correcoes)
  console.log(`\nB) Pedidos repetidos (em 3+ sessões): ${pedidos.length}`)
  mostrar(pedidos)
  console.log('\nSão sugestões: nada entra na memória sem o sim do usuário.')
}
