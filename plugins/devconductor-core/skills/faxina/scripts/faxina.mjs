#!/usr/bin/env node
// Faxina: acha arquivos grandes, funcoes repetidas e blocos copiados. So le; nunca grava nada.
// Uso: node faxina.mjs [pasta] [--top N] [--json]
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
let pastaArg = null
let top = 10
let comoJson = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--json') comoJson = true
  else if (a === '--top') top = Number(args[++i])
  else if (a.startsWith('--top=')) top = Number(a.slice(6))
  else if (!a.startsWith('--')) pastaArg = a
}
if (!Number.isInteger(top) || top < 1) {
  console.error('--top precisa de um número inteiro maior que zero.')
  process.exit(1)
}
const pasta = path.resolve(pastaArg || '.')
if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) {
  console.error(`Pasta não encontrada: ${pasta}`)
  process.exit(1)
}

const EXT = /\.(ts|tsx|js|jsx|mjs|cs|py|java)$/i
const GERADO = /(^|\/)(node_modules|dist|build|Migrations|\.next|bin|obj|coverage|vendor|\.git)\/|\.Designer\.cs$|Snapshot\.cs$|\.g\.cs$|\.min\.js$|\.d\.ts$/
const TESTE = /\.(test|spec)\.[^/]+$|(^|\/)(tests?|__tests__|specs?|e2e|[\w.-]*\.Tests?|[\w.-]*Tests)\//
const NOMES_COMUNS = new Set(['main', 'default', 'constructor', 'render', 'app', 'setup', 'index', 'run', 'init', 'get', 'post', 'put', 'delete', 'handler', 'toString', 'equals', 'hashCode', 'dispose', 'configure', 'configureservices', 'build', 'start', 'stop', 'test', 'ler', 'listar', 'excluir', 'detalhe', 'data', 'obter', 'criar', 'atualizar', 'salvar', 'remover', 'buscar', 'list', 'create', 'update', 'remove', 'find', 'load', 'save', 'handle', 'dispose', 'validar'])

function listarArquivos() {
  try {
    const saida = execFileSync('git', ['ls-files', '-z'], { cwd: pasta, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
    return saida.toString('utf8').split('\0').filter(Boolean)
  } catch {
    const lista = []
    const andar = (dir) => {
      for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
        if (d.name === 'node_modules' || d.name === '.git') continue
        const completo = path.join(dir, d.name)
        if (d.isDirectory()) andar(completo)
        else lista.push(path.relative(pasta, completo))
      }
    }
    andar(pasta)
    return lista
  }
}

const linguagem = (arq) => {
  const e = path.extname(arq).toLowerCase()
  if (e === '.py') return 'py'
  if (e === '.cs') return 'cs'
  if (e === '.java') return 'java'
  return 'js'
}

// Troca comentarios (e, se pedido, o miolo de strings) por espacos, mantendo o tamanho e as quebras de linha.
function mascarar(texto, lang, strings) {
  const out = texto.split('')
  const n = texto.length
  const apagar = (de, ate) => { for (let k = de; k < ate; k++) if (out[k] !== '\n') out[k] = ' ' }
  let i = 0
  while (i < n) {
    const c = texto[i]
    const c2 = texto[i + 1]
    if (lang === 'py' ? c === '#' : (c === '/' && c2 === '/')) {
      let f = i
      while (f < n && texto[f] !== '\n') f++
      apagar(i, f); i = f; continue
    }
    if (lang !== 'py' && c === '/' && c2 === '*') {
      let f = texto.indexOf('*/', i + 2)
      f = f < 0 ? n : f + 2
      apagar(i, f); i = f; continue
    }
    if (lang === 'py' && (texto.startsWith('"""', i) || texto.startsWith("'''", i))) {
      const q = texto.substr(i, 3)
      let f = texto.indexOf(q, i + 3)
      f = f < 0 ? n : f + 3
      if (strings) apagar(i + 3, f - 3)
      i = f; continue
    }
    if (c === '"' || c === "'" || (c === '`' && lang === 'js')) {
      const verbatim = lang === 'cs' && c === '"' && (texto[i - 1] === '@' || (texto[i - 1] === '$' && texto[i - 2] === '@') || (texto[i - 1] === '@' && texto[i - 2] === '$'))
      let f = i + 1
      while (f < n) {
        const d = texto[f]
        if (verbatim) {
          if (d === '"' && texto[f + 1] === '"') { f += 2; continue }
          if (d === '"') break
        } else {
          if (d === '\\') { f += 2; continue }
          if (d === c) break
          if (d === '\n' && c !== '`') break
        }
        f++
      }
      if (strings) apagar(i + 1, Math.min(f, n))
      i = Math.min(f + 1, n); continue
    }
    i++
  }
  return out.join('')
}

const normalizar = (t) => t.replace(/\s+/g, ' ').trim()

// Acha onde termina uma declaracao JS/TS a partir de `inicio`. `seco` = texto sem comentarios nem strings.
function fimJs(seco, inicio, tipo) {
  let depth = 0
  let viuSeta = false
  let abriu = false
  const limite = Math.min(seco.length, inicio + 60000)
  for (let k = inicio; k < limite; k++) {
    const c = seco[k]
    if (c === '(' || c === '[' || c === '{') { depth++; abriu = true }
    else if (c === ')' || c === ']' || c === '}') {
      depth--
      if (depth < 0) return -1
      if (depth === 0) {
        if (tipo === 'funcao' && c === '}') return k + 1
        if (tipo === 'lista' && abriu) return k + 1
        if (tipo === 'seta' && c === '}' && viuSeta) return k + 1
      }
    } else if (c === '=' && seco[k + 1] === '>') { viuSeta = true; k++ }
    else if (c === ';' && depth === 0) return k + 1
    else if (c === '\n' && depth === 0 && tipo === 'seta' && viuSeta) {
      const antes = seco.slice(inicio, k).trimEnd()
      if (antes && !/[=,+\-*/&|?:(<>]$/.test(antes)) {
        const depois = seco.slice(k + 1, k + 200).trimStart()
        if (!/^[.?:&|+\-*/]/.test(depois)) return k
      }
    }
  }
  return -1
}

// Fim de metodo C#/Java: `(` ja aberto em `pos`. Retorna indice final ou -1.
function fimMetodo(seco, pos) {
  let k = pos
  let p = 0
  const limite = Math.min(seco.length, pos + 60000)
  for (; k < limite; k++) {
    const c = seco[k]
    if (c === '(') p++
    else if (c === ')') { p--; if (p === 0) { k++; break } }
  }
  for (; k < limite; k++) {
    const c = seco[k]
    if (c === ';') return -1
    if (c === '=' && seco[k + 1] === '>') {
      const f = seco.indexOf(';', k)
      return f < 0 ? -1 : f + 1
    }
    if (c === '{') break
  }
  let d = 0
  for (; k < limite; k++) {
    if (seco[k] === '{') d++
    else if (seco[k] === '}') { d--; if (d === 0) return k + 1 }
  }
  return -1
}

function extrairDefinicoes(limpo, seco, lang) {
  const defs = []
  // Indice de inicio de cada linha, para nao recalcular a linha a cada achado.
  const inicios = [0]
  for (let k = 0; k < limpo.length; k++) if (limpo.charCodeAt(k) === 10) inicios.push(k + 1)
  const linhaRapida = (idx) => { let a = 0; let b = inicios.length - 1; while (a < b) { const m = (a + b + 1) >> 1; if (inicios[m] <= idx) a = m; else b = m - 1 } return a + 1 }
  const add = (nome, ini, fim, lista) => {
    if (fim < 0) return
    const corpo = normalizar(limpo.slice(ini, fim)).replace(/^export\s+(default\s+)?/, '')
    const linhas = limpo.slice(ini, fim).split('\n').filter((l) => l.trim()).length
    if (!lista && (linhas < 2 || corpo.length < 30)) return
    defs.push({ nome, linha: linhaRapida(ini), corpo, lista })
  }
  if (lang === 'js') {
    const reF = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)/gm
    const reA = /^(?:export\s+)?const\s+([\w$]+)\s*(?::[^=\n]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*(?::\s*[^=\n]+)?=>/gm
    const reL = /^(?:export\s+)?const\s+([\w$]+)\s*(?::[^=\n]+)?=\s*([[{])/gm
    for (const m of seco.matchAll(reF)) add(m[1], m.index, fimJs(seco, m.index + m[0].length, 'funcao'), false)
    for (const m of seco.matchAll(reA)) add(m[1], m.index, fimJs(seco, m.index + m[0].length - 2, 'seta'), false)
    for (const m of seco.matchAll(reL)) add(m[1], m.index, fimJs(seco, m.index + m[0].length - 1, 'lista'), true)
  } else if (lang === 'py') {
    const linhas = limpo.split('\n')
    for (let i = 0; i < linhas.length; i++) {
      const m = /^(?:async\s+)?def\s+(\w+)/.exec(linhas[i])
      if (!m) continue
      let f = i + 1
      let ultimo = i
      while (f < linhas.length) {
        if (linhas[f].trim() === '') { f++; continue }
        if (/^\s/.test(linhas[f]) || /^[)\]]/.test(linhas[f])) { ultimo = f; f++; continue }
        break
      }
      const corpo = normalizar(linhas.slice(i, ultimo + 1).join('\n'))
      if (ultimo - i + 1 < 2 || corpo.length < 30) continue
      defs.push({ nome: m[1], linha: i + 1, corpo, lista: false })
    }
  } else {
    const mods = 'public|private|protected|internal|static|async|override|virtual|sealed|abstract|partial|extern|final|synchronized|default|native'
    const re = new RegExp(`^[ \\t]*(?:@\\w+(?:\\([^)\\n]*\\))?[ \\t]+)*(?:(?:${mods})[ \\t]+)+([\\w<>\\[\\],.?]+(?:[ \\t]+[\\w<>\\[\\],.?]+)*?)[ \\t]+(\\w+)[ \\t]*(?:<[\\w,\\s]+>)?\\(`, 'gm')
    for (const m of seco.matchAll(re)) {
      if (/^(if|for|while|switch|using|lock|catch|return|foreach)$/.test(m[2])) continue
      const abre = m.index + m[0].length - 1
      const ini = m.index + m[0].search(/\S/)
      add(m[2], ini, fimMetodo(seco, abre), false)
    }
  }
  return defs
}

const arquivos = listarArquivos().map((a) => a.replace(/\\/g, '/')).filter((a) => EXT.test(a) && !GERADO.test(a))
const lidos = []
for (const rel of arquivos) {
  const completo = path.join(pasta, rel)
  try {
    const st = fs.statSync(completo)
    if (!st.isFile() || st.size > 2_000_000) continue
    let texto = fs.readFileSync(completo, 'utf8')
    if (texto.includes('\u0000')) continue
    texto = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
    lidos.push({ rel, texto, lang: linguagem(rel), teste: TESTE.test(rel) })
  } catch { /* arquivo some ou sem permissao: pula */ }
}

// Parte A
const grandes = lidos
  .map((f) => ({ arquivo: f.rel, linhas: f.texto.split('\n').length - (f.texto.endsWith('\n') ? 1 : 0) }))
  .filter((f) => f.linhas > 500)
  .sort((a, b) => b.linhas - a.linhas)

// Parte B
const porCorpo = new Map()
const porNome = new Map()
// Parte C
const janelas = new Map()
const JANELA = 8
const IMPORTA = /^(import\s|from\s.+\simport\s|using\s|package\s|#include|export\s+\*|export\s+\{.*\}\s+from)/
for (const f of lidos) {
  if (f.teste) continue
  const limpo = mascarar(f.texto, f.lang, false)
  const seco = mascarar(f.texto, f.lang, true)
  for (const d of extrairDefinicoes(limpo, seco, f.lang)) {
    const chave = `${d.nome}\u0001${d.corpo}`
    if (!porCorpo.has(chave)) porCorpo.set(chave, { nome: d.nome, lista: d.lista, locais: [] })
    porCorpo.get(chave).locais.push({ arquivo: f.rel, linha: d.linha, corpo: d.corpo })
    if (!NOMES_COMUNS.has(d.nome.toLowerCase())) {
      if (!porNome.has(d.nome)) porNome.set(d.nome, [])
      porNome.get(d.nome).push({ arquivo: f.rel, linha: d.linha, corpo: d.corpo })
    }
  }
  const seq = []
  limpo.split('\n').forEach((l, i) => {
    const t = normalizar(l)
    if (t && !IMPORTA.test(t)) seq.push({ t, n: i + 1 })
  })
  for (let i = 0; i + JANELA <= seq.length; i++) {
    const parte = seq.slice(i, i + JANELA)
    const texto = parte.map((p) => p.t).join('\n')
    if (texto.length < 80) continue
    if (!janelas.has(texto)) janelas.set(texto, [])
    janelas.get(texto).push({ arquivo: f.rel, idx: i, linha: parte[0].n, fimLinha: parte[JANELA - 1].n })
  }
}

const iguais = []
for (const g of porCorpo.values()) {
  const arqs = new Set(g.locais.map((l) => l.arquivo))
  if (arqs.size < 2) continue
  iguais.push({ nome: g.nome, constante: g.lista, cópias: g.locais.length, tamanho: g.locais[0].corpo.length, locais: g.locais.map(({ arquivo, linha }) => ({ arquivo, linha })) })
}
iguais.sort((a, b) => b.cópias - a.cópias || b.tamanho - a.tamanho)

const mesmoNome = []
for (const [nome, locais] of porNome) {
  const arqs = new Set(locais.map((l) => l.arquivo))
  const corpos = new Set(locais.map((l) => l.corpo))
  if (arqs.size < 3 || corpos.size < 2) continue
  mesmoNome.push({ nome, arquivos: arqs.size, versoes: corpos.size, locais: locais.map(({ arquivo, linha }) => ({ arquivo, linha })) })
}
mesmoNome.sort((a, b) => b.arquivos - a.arquivos)

// Junta janelas vizinhas em blocos maiores.
const assinaturas = new Map()
for (const ocs of janelas.values()) {
  if (new Set(ocs.map((o) => o.arquivo)).size < 2) continue
  const ord = [...ocs].sort((a, b) => (a.arquivo < b.arquivo ? -1 : a.arquivo > b.arquivo ? 1 : a.idx - b.idx))
  const assinatura = ord.map((o) => `${o.arquivo}:${o.idx - ord[0].idx}`).join('|')
  if (!assinaturas.has(assinatura)) assinaturas.set(assinatura, [])
  assinaturas.get(assinatura).push({ ord, idx0: ord[0].idx })
}
let blocos = []
for (const itens of assinaturas.values()) {
  itens.sort((a, b) => a.idx0 - b.idx0)
  let corrida = [itens[0]]
  const fechar = () => {
    const primeiro = corrida[0].ord
    const ultimo = corrida[corrida.length - 1].ord
    blocos.push({
      linhas: ultimo[0].fimLinha - primeiro[0].linha + 1,
      locais: primeiro.map((o, k) => ({ arquivo: o.arquivo, linha: o.linha, fim: ultimo[k].fimLinha })),
    })
  }
  for (let k = 1; k < itens.length; k++) {
    if (itens[k].idx0 === corrida[corrida.length - 1].idx0 + 1) corrida.push(itens[k])
    else { fechar(); corrida = [itens[k]] }
  }
  fechar()
}
blocos.sort((a, b) => b.linhas * (b.locais.length - 1) - a.linhas * (a.locais.length - 1))
const cobertos = []
blocos = blocos.filter((b) => {
  const dentro = b.locais.every((l) => cobertos.some((c) => c.arquivo === l.arquivo && c.linha <= l.linha && c.fim >= l.fim))
  if (!dentro) for (const l of b.locais) cobertos.push(l)
  return !dentro
})

if (!lidos.length) console.error('Aviso: nenhum arquivo de código foi analisado. Confira a pasta e se os arquivos estão no git.')

const resultado = {
  pasta,
  arquivosAnalisados: lidos.length,
  grandes: { total: grandes.length, itens: grandes },
  iguais: { total: iguais.length, itens: iguais },
  mesmoNome: { total: mesmoNome.length, itens: mesmoNome },
  blocos: { total: blocos.length, itens: blocos },
}

if (comoJson) {
  const corta = (p) => ({ total: p.total, itens: p.itens.slice(0, top) })
  console.log(JSON.stringify({ ...resultado, grandes: corta(resultado.grandes), iguais: corta(resultado.iguais), mesmoNome: corta(resultado.mesmoNome), blocos: corta(resultado.blocos) }, null, 2))
} else {
  const lista = (locais) => locais.map((l) => `${l.arquivo}:${l.linha}`).join(', ')
  console.log(`Faxina em ${pasta}`)
  console.log(`${lidos.length} arquivos de código analisados (gerados, migrações e dependências ficam de fora). Nada foi alterado.\n`)
  console.log(`A) Arquivos grandes (mais de 500 linhas): ${grandes.length}`)
  for (const g of grandes.slice(0, top)) console.log(`  ${g.linhas} linhas  ${g.arquivo}`)
  console.log(`\nB1) Funções ou listas idênticas em arquivos diferentes: ${iguais.length}`)
  for (const g of iguais.slice(0, top)) console.log(`  ${g.nome} (${g.cópias} cópias${g.constante ? ', lista' : ''}): ${lista(g.locais)}`)
  console.log(`\nC) Blocos de código copiados (${JANELA}+ linhas): ${blocos.length}`)
  for (const b of blocos.slice(0, top)) console.log(`  ${b.linhas} linhas em ${b.locais.length} arquivos: ${b.locais.map((l) => `${l.arquivo}:${l.linha}-${l.fim}`).join(', ')}`)
  console.log(`\nB2) Mesmo nome com corpo diferente em 3+ arquivos: ${mesmoNome.length}`)
  console.log('  Menor prioridade: pode ser coincidência de nome, não duplicação.')
  for (const g of mesmoNome.slice(0, top)) console.log(`  ${g.nome} (${g.arquivos} arquivos, ${g.versoes} versões): ${lista(g.locais.slice(0, 6))}${g.locais.length > 6 ? ', ...' : ''}`)
}
