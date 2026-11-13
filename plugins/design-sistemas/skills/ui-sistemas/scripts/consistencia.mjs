#!/usr/bin/env node
// Conferência de consistência das telas de sistema no código, sem navegador. Só lê.
// Uso: node consistencia.mjs <pasta-src> [--config design-sistemas.json] [--json] [pasta-saida]
// Saída: 0 tudo conferido e passou · 1 algum achado que reprova · 2 algo não deu para conferir.
// Critérios e níveis: ../referencias/regua-telas.md (lidos de lá, para não divergir).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const REGUA = path.join(AQUI, '..', 'referencias', 'regua-telas.md')
const ESQUEMA = path.join(AQUI, '..', 'esquema-config.json')
const ITENS = ['peca-base', 'letra-escala', 'espaco-escala', 'raio-superficie', 'cor-token', 'foco-substituto',
  'aviso-validacao', 'tela-tamanho', 'cabecalho-tabela']
const IGNORAR_PASTAS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'coverage', 'out', '.vite'])
const COBERTO = /\.(tsx|jsx|ts|js|css)$/
const TEM_JSX = /\.(tsx|jsx|js)$/
const OUTRA_STACK = /\.(vue|svelte|razor|cshtml)$/
const TESTE = /\.(test|spec|stories)\.[jt]sx?$|[\\/]__tests__[\\/]/
const LIMITE_LINHAS = 400

// ---------- régua ----------
export function lerNiveis (arquivo = REGUA) {
  const texto = fs.readFileSync(arquivo, 'utf8')
  const niveis = {}
  for (const [, id, nivel] of texto.matchAll(/^\| `([a-z0-9-]+)` \|([^|]*)\|/gm)) niveis[id] = nivel.trim()
  for (const id of ITENS) if (!niveis[id]) throw new Error(`régua sem o item ${id}`)
  return niveis
}

// ---------- configuração ----------
export function validarEsquema (esquema, dado, raiz = esquema, onde = '$') {
  if (esquema.$ref) return validarEsquema(raiz.$defs[esquema.$ref.replace('#/$defs/', '')], dado, raiz, onde)
  const erros = []
  const tipo = Array.isArray(dado) ? 'array' : Number.isInteger(dado) ? 'integer' : dado === null ? 'null' : typeof dado
  if (esquema.type && esquema.type !== tipo && !(esquema.type === 'number' && tipo === 'integer')) return [`${onde}: tipo ${tipo}, esperado ${esquema.type}`]
  if (esquema.enum && !esquema.enum.includes(dado)) erros.push(`${onde}: valor fora de ${JSON.stringify(esquema.enum)}`)
  if (esquema.anyOf && esquema.anyOf.every((s) => validarEsquema(s, dado, raiz, onde).length)) erros.push(`${onde}: forma não aceita`)
  if (tipo === 'string') {
    if (esquema.minLength && dado.length < esquema.minLength) erros.push(`${onde}: vazio`)
    if (esquema.pattern && !new RegExp(esquema.pattern, 'u').test(dado)) erros.push(`${onde}: "${dado}" fora do padrão`)
  }
  if ((tipo === 'integer' || tipo === 'number') && esquema.minimum !== undefined && dado < esquema.minimum) erros.push(`${onde}: abaixo de ${esquema.minimum}`)
  if (tipo === 'array') {
    if (esquema.minItems && dado.length < esquema.minItems) erros.push(`${onde}: itens de menos`)
    if (esquema.items) dado.forEach((d, i) => erros.push(...validarEsquema(esquema.items, d, raiz, `${onde}[${i}]`)))
  }
  if (tipo === 'object') {
    const chaves = Object.keys(dado)
    for (const r of esquema.required || []) if (!(r in dado)) erros.push(`${onde}: falta ${r}`)
    if (esquema.minProperties && chaves.length < esquema.minProperties) erros.push(`${onde}: campos de menos`)
    if (esquema.maxProperties && chaves.length > esquema.maxProperties) erros.push(`${onde}: campos demais`)
    for (const c of chaves) {
      if (esquema.propertyNames) erros.push(...validarEsquema(esquema.propertyNames, c, raiz, `${onde}.${c} (nome)`))
      if (esquema.properties?.[c]) erros.push(...validarEsquema(esquema.properties[c], dado[c], raiz, `${onde}.${c}`))
      else if (esquema.additionalProperties === false) erros.push(`${onde}: campo desconhecido ${c}`)
      else if (typeof esquema.additionalProperties === 'object') erros.push(...validarEsquema(esquema.additionalProperties, dado[c], raiz, `${onde}.${c}`))
    }
  }
  return erros
}

function acharConfig (pastaSrc, explicita) {
  if (explicita) return fs.existsSync(explicita) ? path.resolve(explicita) : null
  for (const p of [path.join(process.cwd(), 'design-sistemas.json'), path.join(path.dirname(path.resolve(pastaSrc)), 'design-sistemas.json')]) {
    if (fs.existsSync(p)) return p
  }
  return null
}

const chave = (p) => {
  const r = path.resolve(p).replace(/\\/g, '/').replace(/\.(tsx|jsx|ts|js)$/, '').replace(/\/index$/, '')
  return process.platform === 'win32' ? r.toLowerCase() : r
}

// ---------- leitura do código ----------
const FECHA = { '(': ')', '[': ']', '{': '}' }

// Índice logo depois da string que começa em i (aspas simples, duplas ou crase com ${...}).
function pularString (t, i) {
  const q = t[i]
  for (let j = i + 1; j < t.length; j++) {
    if (t[j] === '\\') { j++; continue }
    if (q === '`' && t[j] === '$' && t[j + 1] === '{') { j = fechar(t, j + 1); continue }
    if (t[j] === q) return j + 1
    if (q !== '`' && t[j] === '\n') return j
  }
  return t.length
}

// Índice do fechamento que casa com a abertura em i.
function fechar (t, i) {
  const pilha = [FECHA[t[i]]]
  for (let j = i + 1; j < t.length; j++) {
    const c = t[j]
    if (c === '"' || c === "'" || c === '`') { j = pularString(t, j) - 1; continue }
    if (FECHA[c]) pilha.push(FECHA[c])
    else if (c === pilha[pilha.length - 1]) { pilha.pop(); if (!pilha.length) return j }
  }
  return t.length - 1
}

// Posições de um operador no nível de cima do trecho [ini, fim).
function noTopo (t, ini, fim, teste) {
  const achados = []
  for (let j = ini; j < fim; j++) {
    const c = t[j]
    if (c === '"' || c === "'" || c === '`') { j = pularString(t, j) - 1; continue }
    if (FECHA[c]) { j = fechar(t, j); continue }
    const n = teste(t, j)
    if (n) { achados.push([j, n]); j += n - 1 }
  }
  return achados
}

const apara = (t, ini, fim) => {
  while (ini < fim && /\s/.test(t[ini])) ini++
  while (fim > ini && /\s/.test(t[fim - 1])) fim--
  return [ini, fim]
}

// Lê um argumento de classes e junta os textos literais; o que não dá para resolver conta como "não medido".
function analisar (t, ini, fim, ctx) {
  ;[ini, fim] = apara(t, ini, fim)
  if (ini >= fim) return
  while (t[ini] === '(' && fechar(t, ini) === fim - 1) { [ini, fim] = apara(t, ini + 1, fim - 1) }
  // ternário
  const q = noTopo(t, ini, fim, (s, j) => s[j] === '?' && s[j + 1] !== '.' && s[j + 1] !== '?' && s[j - 1] !== '?' ? 1 : 0)[0]
  if (q) {
    let prof = 0
    const pontos = noTopo(t, q[0] + 1, fim, (s, j) => (s[j] === '?' && s[j + 1] !== '.' && s[j + 1] !== '?') || s[j] === ':' ? 1 : 0)
    for (const [j] of pontos) {
      if (t[j] === '?') prof++
      else if (prof === 0) { analisar(t, q[0] + 1, j, ctx); analisar(t, j + 1, fim, ctx); return } else prof--
    }
  }
  const ou = noTopo(t, ini, fim, (s, j) => (s[j] === '|' && s[j + 1] === '|') || (s[j] === '?' && s[j + 1] === '?') ? 2 : 0)
  if (ou.length) {
    let a = ini
    for (const [j] of ou) { analisar(t, a, j, ctx); a = j + 2 }
    analisar(t, a, fim, ctx)
    return
  }
  const e = noTopo(t, ini, fim, (s, j) => s[j] === '&' && s[j + 1] === '&' ? 2 : 0)
  if (e.length) { analisar(t, e[e.length - 1][0] + 2, fim, ctx); return }
  const c = t[ini]
  if ((c === '"' || c === "'") && pularString(t, ini) === fim) { ctx.literais.push({ valor: t.slice(ini + 1, fim - 1), indice: ini + 1 }); return }
  if (c === '`' && pularString(t, ini) === fim) {
    let a = ini + 1
    for (let j = ini + 1; j < fim - 1; j++) {
      if (t[j] === '\\') { j++; continue }
      if (t[j] === '$' && t[j + 1] === '{') {
        ctx.literais.push({ valor: t.slice(a, j), indice: a })
        const f = fechar(t, j + 1)
        analisar(t, j + 2, f, ctx)
        j = f; a = f + 1
      }
    }
    ctx.literais.push({ valor: t.slice(a, fim - 1), indice: a })
    return
  }
  if (c === '{' && fechar(t, ini) === fim - 1) {
    for (const [a, b] of dividir(t, ini + 1, fim - 1)) {
      const [pa, pb] = apara(t, a, b)
      if (pa >= pb) continue
      if (t.startsWith('...', pa)) { ctx.naoMedido.push(pa); continue }
      const dois = noTopo(t, pa, pb, (s, j) => s[j] === ':' ? 1 : 0)[0]
      const [ka, kb] = apara(t, pa, dois ? dois[0] : pb)
      if (t[ka] === '"' || t[ka] === "'") ctx.literais.push({ valor: t.slice(ka + 1, kb - 1), indice: ka + 1 })
      else if (t[ka] === '[') ctx.naoMedido.push(ka)
      else ctx.literais.push({ valor: t.slice(ka, kb), indice: ka })
    }
    return
  }
  if (c === '[' && fechar(t, ini) === fim - 1) { for (const [a, b] of dividir(t, ini + 1, fim - 1)) analisar(t, a, b, ctx); return }
  const trecho = t.slice(ini, fim)
  if (/^-?\d/.test(trecho) || /^(undefined|null|true|false)$/.test(trecho)) return
  if (/^[\w$]+(\??\.[\w$]+)*$/.test(trecho)) {
    if (/(^|\.)class(Name)?$/.test(trecho)) return // classe repassada de quem chama
    ctx.naoMedido.push(ini); return
  }
  const chamada = /^([\w$.]+)\s*\(/.exec(trecho)
  if (chamada && fechar(t, ini + chamada[0].length - 1) === fim - 1) {
    const nome = chamada[1].split('.').pop()
    if (ctx.cvas.has(nome)) return // classes conferidas onde o cva foi definido (mesmo arquivo ou importado dele)
    if (/^(cn|clsx|twMerge|twJoin|classNames|cx)$/.test(nome)) {
      for (const [a, b] of dividir(t, ini + chamada[0].length, fim - 1)) analisar(t, a, b, ctx)
      return
    }
  }
  ctx.naoMedido.push(ini)
}

const dividir = (t, ini, fim) => {
  const partes = []
  let a = ini
  for (const [j] of noTopo(t, ini, fim, (s, k) => s[k] === ',' ? 1 : 0)) { partes.push([a, j]); a = j + 1 }
  partes.push([a, fim])
  return partes
}

// Segundo argumento do cva: classes nos valores de "variants" e em class/className de "compoundVariants".
function analisarCva (t, ini, fim, ctx) {
  const [base, opcoes] = dividir(t, ini, fim)
  analisar(t, base[0], base[1], ctx)
  if (!opcoes) return
  const texto = t.slice(0, opcoes[1])
  const variants = /\bvariants\s*:\s*\{/g
  variants.lastIndex = opcoes[0]
  const v = variants.exec(texto)
  if (v) {
    const ab = v.index + v[0].length - 1
    const fe = fechar(t, ab)
    for (let j = ab; j < fe; j++) {
      const c = t[j]
      if (c === '"' || c === "'" || c === '`') {
        const f = pularString(t, j)
        if (!/^\s*:/.test(t.slice(f, f + 5))) analisar(t, j, f, ctx)
        j = f - 1
      }
    }
  }
  const comp = /\b(class|className)\s*:\s*/g
  comp.lastIndex = opcoes[0]
  let m
  while ((m = comp.exec(texto))) {
    const a = m.index + m[0].length
    if (t[a] === '"' || t[a] === "'" || t[a] === '`') analisar(t, a, pularString(t, a), ctx)
  }
}

// Todas as listas de classes de um arquivo de código: className=..., cn(...), clsx(...), cva(...).
// cvas: nomes locais que são um cva conhecido (definido no arquivo ou importado de quem o define).
export function listasDeClasses (t, cvas = new Set()) {
  const listas = []
  const gatilho = /\bclassName\s*=\s*|\b(cn|clsx|twMerge|twJoin|classNames|cx|cva)\s*\(/g
  let fimAnterior = -1
  let m
  while ((m = gatilho.exec(t))) {
    if (m.index < fimAnterior) continue
    const ctx = { literais: [], naoMedido: [], inicio: m.index, cvas }
    let fim
    if (m[1]) {
      const ab = m.index + m[0].length - 1
      fim = fechar(t, ab)
      if (m[1] === 'cva') analisarCva(t, ab + 1, fim, ctx)
      else for (const [a, b] of dividir(t, ab + 1, fim)) analisar(t, a, b, ctx)
    } else {
      const a = m.index + m[0].length
      const c = t[a]
      if (c === '"' || c === "'") { fim = pularString(t, a); analisar(t, a, fim, ctx) } else if (c === '{') { fim = fechar(t, a); analisar(t, a + 1, fim, ctx) } else continue
    }
    fimAnterior = fim
    ctx.fim = fim
    listas.push(ctx)
  }
  return listas
}

// Classes de uma lista, com a posição de cada uma no arquivo.
function classesDe (lista) {
  const out = []
  for (const { valor, indice } of lista.literais) {
    for (const m of valor.matchAll(/\S+/g)) out.push({ classe: m[0], indice: indice + m.index })
  }
  return out
}

// "md:focus-visible:ring-2" -> { variantes: ['md', 'focus-visible'], base: 'ring-2' }
export function partesDaClasse (cls) {
  const partes = []
  let prof = 0
  let atual = ''
  for (const c of cls) {
    if (c === '[' || c === '(') prof++
    if (c === ']' || c === ')') prof--
    if (c === ':' && prof === 0) { partes.push(atual); atual = '' } else atual += c
  }
  return { variantes: partes, base: atual.replace(/^!|!$/g, '').replace(/^-/, '') }
}

function semComentarios (t) {
  const branco = (s) => s.replace(/[^\n]/g, ' ')
  return t
    .replace(/\/\*[\s\S]*?\*\//g, branco)
    .replace(/^(\s*)(\/\/.*)$/gm, (_, a, b) => a + branco(b))
    .replace(/(;\s*)(\/\/.*)$/gm, (_, a, b) => a + branco(b))
}

function linhaDe (inicios, indice) {
  let lo = 0
  let hi = inicios.length - 1
  while (lo < hi) {
    const meio = (lo + hi + 1) >> 1
    if (inicios[meio] <= indice) lo = meio; else hi = meio - 1
  }
  return lo + 1
}
const iniciosDeLinha = (t) => [0, ...[...t.matchAll(/\n/g)].map((m) => m.index + 1)]

// ---------- regras das classes ----------
const TAMANHO_PADRAO = /^text-(xs|sm|base|lg|xl|[2-9]xl)$/
const PALETA = /^(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(-(50|[1-9]00|950))?$/
const PREFIXO_COR = /^(bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|divide|placeholder|accent|caret|decoration|shadow)-(.+)$/
const PREFIXO_ESPACO = '(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)'
const ESPACO_ARBITRARIO = new RegExp(`^${PREFIXO_ESPACO}-(\\[|\\()`)
// A escala padrão do Tailwind tem meio passo (p-1.5 = 6 px, gap-0.5 = 2 px) e a régua aceita; o que não é passo nem
// meio passo (p-3.25 = 13 px, gap-1.75) fica fora da escala, como o valor arbitrário.
const ESPACO_FORA_DO_PASSO = new RegExp(`^${PREFIXO_ESPACO}-\\d*\\.(?!5$)\\d+$`)
const RAIO = /^rounded(?:-(?:tl|tr|bl|br|ss|se|es|ee|t|r|b|l|s|e))?(?:-(.+))?$/
const COR_LITERAL = /^(#|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i
const NEUTRO = new Set(['transparent', 'current', 'inherit', 'none', 'auto', 'initial'])

function semOpacidade (v) {
  let prof = 0
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '[' || v[i] === '(') prof++
    if (v[i] === ']' || v[i] === ')') prof--
    if (v[i] === '/' && prof === 0) return v.slice(0, i)
  }
  return v
}

function regrasDaConfig (config, coresDefinidas) {
  if (!config) return null
  const raios = new Set(Object.values(config.raio).map((r) => (RAIO.exec(r)?.[1] ?? '')))
  raios.add('none')
  return {
    tamanhos: new Set(Object.values(config.letra.tamanhos)),
    raios,
    tokens: new Set(Object.values(config.cores.funcao)),
    negocio: new Set((config.cores.negocio || []).map((n) => n.valor.toLowerCase())),
    coresDefinidas
  }
}

// Achados de uma classe solta (sem a regra de foco, que olha a lista inteira).
function conferirClasse (base, regras) {
  const achados = []
  // letra
  const arb = /^text-(?:\[|\()(.*)[\])]$/.exec(base)
  const ehTamanhoArb = arb && /^(length:)?-?\d*\.?\d+(px|rem|em|pt)?$|^(length:)?(var\()?--(text|font-size)/.test(arb[1])
  if (ehTamanhoArb) achados.push(['letra-escala', `tamanho arbitrário ${base}`])
  else if (regras && TAMANHO_PADRAO.test(base) && !regras.tamanhos.has(base)) {
    achados.push(['letra-escala', `${base} fora da escala`])
  }
  // espaço
  if (ESPACO_ARBITRARIO.test(base) && !/env\(safe-area-/.test(base)) achados.push(['espaco-escala', `espaço arbitrário ${base}`])
  else if (ESPACO_FORA_DO_PASSO.test(base)) achados.push(['espaco-escala', `${base} não é passo nem meio passo da escala`])
  // raio
  const r = RAIO.exec(base)
  if (r) {
    const tam = r[1] ?? ''
    if (/^[[(]/.test(tam)) achados.push(['raio-superficie', `raio arbitrário ${base}`])
    else if (regras && !regras.raios.has(tam)) achados.push(['raio-superficie', `${base} não é o raio de nenhuma superfície`])
  }
  // cor
  const c = PREFIXO_COR.exec(base)
  if (c && regras && !ehTamanhoArb && !(c[1] === 'text' && regras.tamanhos.has(base))) {
    const v = semOpacidade(c[2])
    const problema = problemaDeCor(v, regras)
    if (problema) achados.push(['cor-token', `${base}: ${problema}`])
  }
  return achados
}

function problemaDeCor (v, regras) {
  if (NEUTRO.has(v) || regras.tokens.has(v) || regras.negocio.has(v.toLowerCase())) return null
  if (PALETA.test(v)) return 'cor da paleta crua, fora dos tokens'
  const arb = /^\[(?:color:)?(.*)\]$/.exec(v)
  const variavel = /^\[(?:color:)?var\(--([\w-]+)\)\]$/.exec(v) || /^\((?:color:)?--([\w-]+)\)$/.exec(v)
  if (variavel) {
    const nome = variavel[1]
    return regras.tokens.has(nome) || regras.tokens.has(nome.replace(/^color-/, '')) ? null : `variável --${nome} não é token de cor`
  }
  if (arb && COR_LITERAL.test(arb[1])) return regras.negocio.has(arb[1].toLowerCase()) ? null : 'cor escrita à mão, fora dos tokens'
  if (regras.coresDefinidas.has(v)) return 'cor do tema que não está em cores.funcao nem em cores.negocio'
  return null
}

// Valor de cor em CSS ou em style={{...}}: literal à mão, ou variável que não é token nem foi declarada.
function problemaDeCorCss (valor, regras, declaradas) {
  const v = valor.trim()
  if (regras.negocio.has(v.toLowerCase())) return null
  if (LITERAL_COR_CSS.test(v.replace(/var\([^)]*\)/g, ''))) return `escrito à mão (${LITERAL_COR_CSS.exec(v)[0]})`
  for (const [, nome] of v.matchAll(/var\(\s*--([\w-]+)/g)) {
    if (regras.tokens.has(nome) || regras.tokens.has(nome.replace(/^color-/, '')) || declaradas.has(nome)) continue
    return `usa --${nome}, que não é token nem está declarada em nenhum CSS lido`
  }
  return null
}

const FOCO_APAGADO = new Set(['outline-none', 'outline-0'])
// Classe que desenha algo visível no foco: anel ou contorno com largura, borda, fundo, sublinhado ou sombra.
// Não conta: o que zera ou some (ring-0, outline-none, *-transparent), só o afastamento (ring-offset-2) ou só a cor
// do anel/contorno (ring-ring sem largura não aparece).
export function ehIndicadorDeFoco (base) {
  if (/(^|-)(0|none|transparent|hidden)$/.test(base)) return false
  if (/^(ring|outline)-offset/.test(base)) return false
  if (/^ring(-(\d+|\[\d[^\]]*\]))?$/.test(base)) return true
  if (/^outline(-(\d+|\[\d[^\]]*\]|solid|dashed|dotted|double))?$/.test(base)) return true
  if (/^(ring|outline)-/.test(base)) return false
  return /^(bg-|border|underline$|decoration-|shadow)/.test(base)
}
function apagaFocoSemSubstituto (classes) {
  const partes = classes.map((c) => partesDaClasse(c.classe))
  const apaga = partes.findIndex((p) => FOCO_APAGADO.has(p.base) && !p.variantes.some((v) => v.includes('focus-visible')))
  if (apaga < 0) return null
  const substituto = partes.some((p) => p.variantes.some((v) => v.includes('focus-visible')) && ehIndicadorDeFoco(p.base))
  return substituto ? null : classes[apaga]
}

// ---------- CSS ----------
function declaracoesCss (t) {
  const out = []
  const pilha = []
  let a = 0
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (c === '"' || c === "'") { i = pularString(t, i) - 1; continue }
    if (c === '{') { pilha.push(t.slice(a, i).trim()); a = i + 1 } else if (c === '}' || c === ';') {
      const d = t.slice(a, i)
      if (d.trim()) out.push({ texto: d.trim(), indice: a + d.search(/\S/), seletores: [...pilha] })
      if (c === '}') pilha.pop()
      a = i + 1
    }
  }
  return out
}

const PROP_COR = /^(color|background|background-color|border|border-(top|right|bottom|left)(-color)?|border-color|outline-color|fill|stroke|box-shadow|text-decoration-color|caret-color|accent-color)$/i
const LITERAL_COR_CSS = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch)\(/i

// Seletor efetivo da declaração (sem at-rules; "&" do aninhamento trocado pelo pai), dividido nas vírgulas.
function seletoresDe (d) {
  const sel = d.seletores.filter((s) => !s.startsWith('@')).reduce((pai, s) => s.includes('&') ? s.replace(/&/g, pai) : (pai ? `${pai} ${s}` : s), '')
  return sel.split(',').map((s) => s.trim()).filter(Boolean)
}
// O elemento que o seletor pega, sem pseudo-classes (button:focus e button:focus-visible são o mesmo button).
const elementoDe = (s) => s.replace(/::?[\w-]+(\([^)]*\))?/g, '').replace(/\s+/g, ' ').trim()

// Declaração que desenha o foco: contorno, sombra, borda, fundo ou sublinhado que não some.
function desenhaFoco (d) {
  if (d.texto.startsWith('@apply')) return [...d.texto.slice(6).matchAll(/\S+/g)].some((m) => ehIndicadorDeFoco(partesDaClasse(m[0]).base))
  const m = /^([\w-]+)\s*:\s*([\s\S]*)$/.exec(d.texto)
  if (!m) return false
  const [, prop, valor] = m
  if (/^(none|0|0px|transparent|hidden)$/i.test(valor.trim())) return false
  return /^(outline|outline-style|outline-width|box-shadow|border(-(top|right|bottom|left))?(-(color|width|style))?|background(-color)?|text-decoration(-line)?)$/i.test(prop)
}

function conferirCss (t, regras, arquivo, inicios, achar, declaradas = new Set()) {
  const decls = declaracoesCss(t)
  // elementos que têm regra :focus-visible com algo visível desenhado
  const comFocoVisivel = new Set()
  for (const d of decls) {
    if (!desenhaFoco(d)) continue
    for (const s of seletoresDe(d)) if (s.includes(':focus-visible')) comFocoVisivel.add(elementoDe(s))
  }
  for (const d of decls) {
    const linha = linhaDe(inicios, d.indice)
    if (d.texto.startsWith('@apply')) {
      const classes = [...d.texto.slice(6).matchAll(/\S+/g)].map((m) => ({ classe: m[0], indice: d.indice + 6 + m.index }))
      conferirLista(classes, regras, arquivo, inicios, achar)
      continue
    }
    const m = /^([\w-]+)\s*:\s*([\s\S]*)$/.exec(d.texto)
    if (!m || m[1].startsWith('--')) continue // definição de token
    const [, prop, valor] = m
    const raiz = d.seletores.some((s) => /(^|,)\s*(html|:root)\s*($|,)/.test(s))
    if (regras && PROP_COR.test(prop)) {
      const problema = problemaDeCorCss(valor, regras, declaradas)
      if (problema) achar('cor-token', arquivo, linha, `${prop}: ${valor.trim()} ${problema}`)
    }
    if (prop === 'font-size' && !raiz && /^-?\d*\.?\d+(px|rem|em|pt)$/.test(valor.trim())) achar('letra-escala', arquivo, linha, `font-size: ${valor.trim()} fora da escala`)
    if (/^outline(-style)?$/.test(prop) && /^(none|0)$/.test(valor.trim())) {
      // vale só um :focus-visible do mesmo elemento que desenhe algo (a própria regra, se for :focus-visible, também conta)
      const semFoco = seletoresDe(d).filter((s) => !comFocoVisivel.has(elementoDe(s)))
      if (semFoco.length) achar('foco-substituto', arquivo, linha, `${prop}: ${valor.trim()} sem regra :focus-visible que desenhe o foco de ${semFoco.join(', ')}`)
    }
  }
}

function coresDoCss (t) {
  return [...t.matchAll(/--color-([a-z0-9-]+)\s*:/gi)].map((m) => m[1])
}

function coresDoTailwindConfig (t) {
  const nomes = []
  const m = /\bcolors\s*:\s*\{/.exec(t)
  if (!m) return nomes
  const ab = m.index + m[0].length - 1
  const fe = fechar(t, ab)
  for (const [a, b] of dividir(t, ab + 1, fe)) {
    const k = /^\s*['"]?([\w-]+)['"]?\s*:\s*(\{)?/.exec(t.slice(a, b))
    if (!k) continue
    nomes.push(k[1])
    if (k[2]) {
      const ia = a + k[0].length - 1
      for (const [x, y] of dividir(t, ia + 1, fechar(t, ia))) {
        const s = /^\s*['"]?([\w-]+)['"]?\s*:/.exec(t.slice(x, y))
        if (s && s[1] !== 'DEFAULT') nomes.push(`${k[1]}-${s[1]}`)
      }
    }
  }
  return nomes
}

function conferirLista (classes, regras, arquivo, inicios, achar) {
  for (const { classe, indice } of classes) {
    const { base } = partesDaClasse(classe)
    for (const [regra, texto] of conferirClasse(base, regras)) achar(regra, arquivo, linhaDe(inicios, indice), texto)
  }
  const foco = apagaFocoSemSubstituto(classes)
  if (foco) achar('foco-substituto', arquivo, linhaDe(inicios, foco.indice), `${foco.classe} sem focus-visible: na mesma lista de classes`)
}

// ---------- peças e tags ----------
const TAG_PECA = { input: ['campo'], textarea: ['campo'], button: ['botao'], select: ['selecao', 'campo'], th: ['cabecalho-tabela'] }

// Imports estáticos com valor (não "import type"): de qual arquivo e com quais nomes { local, original }.
function importsDe (t, arquivo, raiz) {
  const out = []
  for (const m of t.matchAll(/^\s*import\s+(type\s+)?([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/gm)) {
    if (m[1]) continue
    const spec = m[3]
    let alvo
    if (spec.startsWith('.')) alvo = chave(path.resolve(path.dirname(arquivo), spec))
    else if (/^[@~]\//.test(spec)) alvo = chave(path.join(raiz, 'src', spec.slice(2)))
    else continue
    const nomes = []
    const clausula = m[2]
    const chaves = /\{([^}]*)\}/.exec(clausula)
    for (const n of (chaves ? chaves[1] : '').split(',')) {
      const p = /^\s*(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?\s*$/.exec(n)
      if (p && !p[1]) nomes.push({ original: p[2], local: p[3] || p[2] })
    }
    const fora = clausula.replace(/\{[^}]*\}/, '')
    const ns = /\*\s*as\s+([\w$]+)/.exec(fora)
    if (ns) nomes.push({ original: '*', local: ns[1] })
    const padrao = /^\s*([\w$]+)/.exec(fora.replace(/\*\s*as\s+[\w$]+/, ''))
    if (padrao) nomes.push({ original: 'default', local: padrao[1] })
    out.push({ alvo, nomes })
  }
  return out
}

// O nome importado é usado de fato: como tag JSX (<Campo, <Ui.Campo), chamada (Campo(...)) ou membro (Ui.Campo).
const usaNome = (codigo, nome) => new RegExp(`<${nome.replace(/\$/g, '\\$')}[\\s/>.]|(^|[^\\w$.])${nome.replace(/\$/g, '\\$')}\\s*[(.]`).test(codigo)

// Texto com strings e comentários trocados por espaço (mesmo tamanho e mesmas quebras de linha), para achar tags e
// nomes só no código. Aspas só abrem string depois de algo que pede um valor (=, (, ',', return...); assim o
// apóstrofo de um texto JSX ("d'água") não engole o resto da linha.
const ANTES_DE_STRING = /(^|[=(,[{:?;!&|+])$|(^|[^\w$])(return|case|in|of|typeof|await|yield|export|default)$/
export function mascarar (t) {
  const out = t.split('')
  const branco = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' ' }
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (c === '/' && t[i + 1] === '*') {
      const f = t.indexOf('*/', i + 2)
      const e = f < 0 ? t.length : f + 2
      branco(i, e); i = e - 1; continue
    }
    if (c === '/' && t[i + 1] === '/' && (i === 0 || /[\s;,{}()]/.test(t[i - 1]))) {
      const f = t.indexOf('\n', i)
      const e = f < 0 ? t.length : f
      branco(i, e); i = e - 1; continue
    }
    if (c === '"' || c === "'" || c === '`') {
      const antes = t.slice(Math.max(0, i - 12), i).replace(/\s+$/, '')
      if (ANTES_DE_STRING.test(antes)) { const e = pularString(t, i); branco(i, e); i = e - 1 }
    }
  }
  return out.join('')
}

// style={{ ... }} do React: cor e tamanho de letra escritos à mão; o que não dá para ler conta como não medido.
const ESTILO_COR = /^(color|background|backgroundColor|border(Top|Right|Bottom|Left)?(Color)?|outlineColor|fill|stroke|boxShadow|textDecorationColor|caretColor|accentColor)$/
function conferirEstilos (t, mascarado, regras, declaradas, arquivo, inicios, achar) {
  const naoMedido = []
  for (const m of mascarado.matchAll(/\bstyle\s*=\s*\{/g)) {
    const ab = m.index + m[0].length - 1
    const fe = fechar(t, ab)
    let [ini, fim] = apara(t, ab + 1, fe)
    if (t[ini] !== '{' || fechar(t, ini) !== fim - 1) { naoMedido.push(ini); continue } // style={variavel}
    for (const [a, b] of dividir(t, ini + 1, fim - 1)) {
      ;[ini, fim] = apara(t, a, b)
      if (ini >= fim) continue
      if (t.startsWith('...', ini)) { naoMedido.push(ini); continue }
      const dois = noTopo(t, ini, fim, (s, j) => s[j] === ':' ? 1 : 0)[0]
      if (!dois) continue
      const prop = t.slice(ini, dois[0]).trim().replace(/^['"]|['"]$/g, '')
      const ehCor = ESTILO_COR.test(prop)
      if (!ehCor && prop !== 'fontSize') continue
      const [va, vb] = apara(t, dois[0] + 1, fim)
      const bruto = t.slice(va, vb)
      const literal = (bruto[0] === '"' || bruto[0] === "'") && pularString(t, va) === vb ? bruto.slice(1, -1) : null
      const linha = linhaDe(inicios, ini)
      if (prop === 'fontSize') {
        if (/^-?\d*\.?\d+$/.test(bruto) || (literal !== null && /^-?\d*\.?\d+(px|rem|em|pt)$/.test(literal.trim()))) achar('letra-escala', arquivo, linha, `fontSize: ${bruto} no style, fora da escala`)
        else if (literal === null) naoMedido.push(ini)
        continue
      }
      if (literal === null) { naoMedido.push(ini); continue }
      if (!regras) continue
      const problema = problemaDeCorCss(literal, regras, declaradas)
      if (problema) achar('cor-token', arquivo, linha, `${prop}: ${bruto} no style ${problema}`)
    }
  }
  return naoMedido
}

// Fim da tag que começa em i (o '>' fora de chaves e strings).
function fimDaTag (t, i) {
  for (let j = i + 1; j < t.length; j++) {
    const c = t[j]
    if (c === '"' || c === "'") { j = pularString(t, j) - 1; continue }
    if (c === '{') { j = fechar(t, j); continue }
    if (c === '>') return j
  }
  return t.length
}

const SO_ALINHAMENTO = /^(text-(left|right|center|start|end)|w-.+|min-w-.+|max-w-.+|sr-only|hidden|table-cell|sticky|left-0|right-0)$/

// toast.error que é checagem de campo: "if (!nome) { toast.error(...); return }" ou "if (!nome) return toast.error(...)".
// Condição que olha resultado de ação (erro, resposta, status) não conta: aí o aviso é o certo.
const RESULTADO_DE_ACAO = /\b(err|erro|error|errors|e|res|resp|response|resultado|status|ok|data)\b/i
function guardasDeValidacao (t) {
  const posicoes = new Set()
  for (const m of t.matchAll(/\bif\s*\(/g)) {
    const ab = m.index + m[0].length - 1
    const fe = fechar(t, ab)
    if (RESULTADO_DE_ACAO.test(t.slice(ab + 1, fe))) continue
    const depois = fe + 1 + (/^\s*/.exec(t.slice(fe + 1))[0].length)
    const direto = /^(return\s+(void\s+)?)?toast\.error\s*\(/.exec(t.slice(depois, depois + 40))
    if (direto) { posicoes.add(depois + direto[0].indexOf('toast')); continue }
    if (t[depois] !== '{') continue
    const corpo = t.slice(depois + 1, fechar(t, depois))
    const primeiro = /^\s*toast\.error\s*\(/.exec(corpo)
    if (primeiro && /\breturn\b/.test(corpo)) posicoes.add(depois + 1 + primeiro[0].indexOf('toast'))
  }
  return posicoes
}

// ---------- execução ----------
function listar (pasta) {
  const arquivos = []
  const pilha = [pasta]
  while (pilha.length) {
    const atual = pilha.pop()
    for (const e of fs.readdirSync(atual, { withFileTypes: true })) {
      const p = path.join(atual, e.name)
      if (e.isDirectory()) { if (!IGNORAR_PASTAS.has(e.name)) pilha.push(p) } else arquivos.push(p)
    }
  }
  return arquivos.sort()
}

export function conferir (pastaSrc, { config: caminhoConfig } = {}) {
  const niveis = lerNiveis()
  const naoConferido = []
  const achados = []
  const pastaAbs = path.resolve(pastaSrc)
  if (!fs.existsSync(pastaAbs) || !fs.statSync(pastaAbs).isDirectory()) {
    return fechamento({ achados, naoConferido: [{ motivo: `pasta não encontrada: ${pastaSrc}` }], config: null, cobertura: { conferidos: 0 }, naoMedido: 0, excecoesIgnoradas: [] })
  }
  const arqConfig = acharConfig(pastaSrc, caminhoConfig)
  let config = null
  if (!arqConfig) naoConferido.push({ motivo: 'sem design-sistemas.json: peças, escala de letra, raio e cores não conferidos' })
  else {
    try {
      const dado = JSON.parse(fs.readFileSync(arqConfig, 'utf8'))
      const erros = validarEsquema(JSON.parse(fs.readFileSync(ESQUEMA, 'utf8')), dado)
      if (erros.length) naoConferido.push({ motivo: `configuração inválida (${erros.slice(0, 5).join('; ')})` })
      else config = dado
    } catch (e) {
      naoConferido.push({ motivo: `configuração ilegível: ${e.message}` })
    }
  }
  const raiz = arqConfig ? path.dirname(arqConfig) : path.dirname(pastaAbs)
  const relativo = (p) => path.relative(raiz, p).replace(/\\/g, '/')

  const todos = listar(pastaAbs).filter((f) => !TESTE.test(f))
  const tailwindConfigs = [...todos, ...(fs.existsSync(raiz) ? fs.readdirSync(raiz).map((n) => path.join(raiz, n)) : [])]
    .filter((f, i, a) => /(^|[\\/])tailwind\.config\.[cm]?[jt]s$/.test(f) && a.indexOf(f) === i)
  const codigo = todos.filter((f) => COBERTO.test(f) && !/tailwind\.config\./.test(f))
  const outras = {}
  for (const f of todos) {
    const ext = OUTRA_STACK.exec(f)?.[0]
    if (ext) outras[ext] = (outras[ext] || 0) + 1
  }
  for (const [ext, n] of Object.entries(outras)) naoConferido.push({ motivo: `${n} arquivo(s) ${ext}: stack que esta conferência não lê` })
  if (!codigo.length && !tailwindConfigs.length) naoConferido.push({ motivo: 'nenhum arquivo .tsx/.jsx/.ts/.js/.css para conferir' })

  const textos = new Map(codigo.map((f) => [f, fs.readFileSync(f, 'utf8')]))
  const coresDefinidas = new Set()
  const declaradas = new Set() // variáveis CSS declaradas em algum CSS do projeto
  const cvaPorArquivo = new Map() // chave do arquivo -> nomes de cva definidos nele
  for (const [f, t] of textos) {
    if (f.endsWith('.css')) {
      coresDoCss(t).forEach((c) => coresDefinidas.add(c))
      for (const m of t.matchAll(/(^|[\s{;])--([\w-]+)\s*:/g)) declaradas.add(m[2])
    } else {
      const nomes = [...semComentarios(t).matchAll(/\b(?:const|let|var)\s+([\w$]+)\s*=\s*cva\s*\(/g)].map((m) => m[1])
      if (nomes.length) cvaPorArquivo.set(chave(f), new Set(nomes))
    }
  }
  for (const f of tailwindConfigs) coresDoTailwindConfig(fs.readFileSync(f, 'utf8')).forEach((c) => coresDefinidas.add(c))
  const regras = regrasDaConfig(config, coresDefinidas)

  const pecaPorNome = {}
  const arquivosDePeca = new Set()
  if (config) {
    for (const [nome, v] of Object.entries(config.pecas)) {
      pecaPorNome[nome] = (Array.isArray(v) ? v : [v]).map((p) => chave(path.resolve(raiz, p)))
      pecaPorNome[nome].forEach((k) => arquivosDePeca.add(k))
    }
  } else naoConferido.push({ motivo: 'peca-base: sem configuração, não dá para saber quais arquivos são peças' })

  const achar = (regra, arquivo, linha, texto) => achados.push({ regra, nivel: niveis[regra], arquivo: relativo(arquivo), linha, texto })
  let naoMedido = 0
  const naoMedidoPorArquivo = {}
  const cabecalhos = []

  let estiloNaoMedido = 0
  const estiloNaoMedidoPorArquivo = {}
  for (const [arquivo, original] of textos) {
    const inicios = iniciosDeLinha(original)
    if (arquivo.endsWith('.css')) { conferirCss(original, regras, arquivo, inicios, achar, declaradas); continue }
    const t = semComentarios(original)
    const mascarado = mascarar(t)
    const ehPeca = arquivosDePeca.has(chave(arquivo))
    const imports = importsDe(t, arquivo, raiz)
    const cvas = new Set(cvaPorArquivo.get(chave(arquivo)) || [])
    for (const { alvo, nomes } of imports) {
      const def = cvaPorArquivo.get(alvo)
      if (def) for (const n of nomes) if (def.has(n.original)) cvas.add(n.local)
    }
    for (const lista of listasDeClasses(t, cvas)) {
      conferirLista(classesDe(lista), regras, arquivo, inicios, achar)
      if (lista.naoMedido.length) {
        naoMedido += lista.naoMedido.length
        const rel = relativo(arquivo)
        naoMedidoPorArquivo[rel] = [...(naoMedidoPorArquivo[rel] || []), ...lista.naoMedido.map((i) => linhaDe(inicios, i))]
      }
    }
    if (TEM_JSX.test(arquivo)) {
      const estilos = conferirEstilos(t, mascarado, regras, declaradas, arquivo, inicios, achar)
      if (estilos.length) {
        estiloNaoMedido += estilos.length
        const rel = relativo(arquivo)
        estiloNaoMedidoPorArquivo[rel] = [...(estiloNaoMedidoPorArquivo[rel] || []), ...estilos.map((i) => linhaDe(inicios, i))]
      }
      // peças declaradas que o arquivo importa e usa de fato (import sem uso não libera o controle à mão)
      const pecasUsadas = new Set()
      if (config) {
        for (const { alvo, nomes } of imports) if (arquivosDePeca.has(alvo) && nomes.some((n) => usaNome(mascarado, n.local))) pecasUsadas.add(alvo)
      }
      for (const m of mascarado.matchAll(/<(input|textarea|button|select|th|TableHead)(?=[\s/>])/g)) {
        const fim = fimDaTag(t, m.index)
        const tag = t.slice(m.index, fim + 1)
        if (m[1] === 'th' || m[1] === 'TableHead') {
          if (!ehPeca) {
            const ctx = listasDeClasses(tag)[0]
            const classes = ctx ? classesDe(ctx).map((c) => c.classe).filter((c) => !SO_ALINHAMENTO.test(partesDaClasse(c).base)) : []
            cabecalhos.push({ arquivo, linha: linhaDe(inicios, m.index), chave: [...new Set(classes)].sort().join(' ') })
          }
          if (m[1] === 'TableHead') continue
        }
        if (!config || ehPeca) continue
        if (m[1] === 'input' && /\btype\s*=\s*["']hidden["']/.test(tag)) continue
        const pecas = TAG_PECA[m[1]].flatMap((n) => pecaPorNome[n] || [])
        if (pecas.some((k) => pecasUsadas.has(k))) continue // embrulha a peça declarada e a usa
        achar('peca-base', arquivo, linhaDe(inicios, m.index), `<${m[1]}> à mão fora das peças declaradas`)
      }
      if (!ehPeca) {
        const linhas = original.split('\n').length - (original.endsWith('\n') ? 1 : 0)
        if (linhas > LIMITE_LINHAS) achar('tela-tamanho', arquivo, 1, `${linhas} linhas (limite ${LIMITE_LINHAS})`)
      }
    }
    // toast.error dentro de função de validação
    const funcoes = []
    for (const m of t.matchAll(/\bfunction\s+([\w$]+)\s*\(|\b(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s*)?(?:\([^()]*\)|[\w$]+)\s*(?::[^=]+?)?=>\s*\{|^\s*(?:async\s+)?([\w$]+)\s*\([^()]*\)\s*\{/gm)) {
      const nome = m[1] || m[2] || m[3]
      if (/^(if|for|while|switch|catch|function)$/.test(nome)) continue
      const ab = t.indexOf('{', m.index + m[0].length - 1)
      if (ab < 0) continue
      funcoes.push({ nome, ini: ab, fim: fechar(t, ab) })
    }
    const emGuarda = guardasDeValidacao(t)
    for (const m of t.matchAll(/\btoast\.error\s*\(/g)) {
      const dona = funcoes.filter((f) => f.ini < m.index && m.index < f.fim).sort((a, b) => (b.ini - a.ini))[0]
      if (dona && /valid|verificar|checar|check/i.test(dona.nome)) achar('aviso-validacao', arquivo, linhaDe(inicios, m.index), `toast.error em ${dona.nome}(): erro de campo fica no campo`)
      else if (emGuarda.has(m.index)) achar('aviso-validacao', arquivo, linhaDe(inicios, m.index), 'toast.error numa checagem de campo antes de salvar: erro de campo fica no campo')
    }
  }

  // cabeçalhos de tabela: o padrão é o mais comum; os outros se afastam dele
  if (cabecalhos.length > 1) {
    const contagem = new Map()
    for (const c of cabecalhos) contagem.set(c.chave, (contagem.get(c.chave) || 0) + 1)
    const padrao = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0]
    for (const c of cabecalhos) {
      if (c.chave !== padrao) achar('cabecalho-tabela', c.arquivo, c.linha, `cabeçalho com "${c.chave || '(sem classe)'}", o padrão é "${padrao || '(sem classe)'}"`)
    }
  }
  if (naoMedido) naoConferido.push({ motivo: `${naoMedido} trecho(s) de classe dinâmico(s) não medido(s)`, onde: naoMedidoPorArquivo })
  if (estiloNaoMedido) naoConferido.push({ motivo: `${estiloNaoMedido} valor(es) de style={{...}} dinâmico(s) (cor ou tamanho de letra) não medido(s)`, onde: estiloNaoMedidoPorArquivo })
  naoMedido += estiloNaoMedido

  // exceções
  const excecoesIgnoradas = []
  let restantes = achados
  if (config?.excecoes?.length) {
    const igual = (e, a) => e.regra === a.regra && e.arquivo.replace(/\\/g, '/').replace(/^\.\//, '') === a.arquivo && String(e.local) === String(a.linha)
    for (const e of config.excecoes) if (niveis[e.regra] === 'nunca passa') excecoesIgnoradas.push({ ...e, porque: 'regra "nunca passa" não aceita exceção' })
    restantes = achados.filter((a) => a.nivel === 'nunca passa' || !config.excecoes.some((e) => igual(e, a)))
  }
  return fechamento({
    achados: restantes,
    naoConferido,
    config: arqConfig,
    cobertura: { conferidos: codigo.length + tailwindConfigs.length, outrasStacks: outras },
    naoMedido,
    excecoesIgnoradas
  })
}

function fechamento (r) {
  const reprova = r.achados.filter((a) => a.nivel !== 'aviso')
  r.achados.sort((a, b) => a.arquivo.localeCompare(b.arquivo) || a.linha - b.linha)
  r.saida = reprova.length ? 1 : r.naoConferido.length ? 2 : 0
  r.resumo = {
    nuncaPassa: r.achados.filter((a) => a.nivel === 'nunca passa').length,
    exigeJustificativa: r.achados.filter((a) => a.nivel === 'exige justificativa').length,
    avisos: r.achados.filter((a) => a.nivel === 'aviso').length,
    naoConferido: r.naoConferido.length
  }
  return r
}

export function relatorio (r) {
  const l = []
  l.push(`Consistência das telas (${r.cobertura.conferidos} arquivo(s) conferido(s); configuração: ${r.config || 'nenhuma'})`)
  for (const a of r.achados) l.push(`  [${a.nivel}] ${a.regra}  ${a.arquivo}:${a.linha}  ${a.texto}`)
  for (const n of r.naoConferido) l.push(`  [não conferido] ${n.motivo}`)
  for (const e of r.excecoesIgnoradas) l.push(`  [exceção ignorada] ${e.regra} ${e.arquivo}:${e.local}: ${e.porque}`)
  const fim = { 0: 'tudo conferido e passou', 1: 'reprovado', 2: 'NÃO CONFERIDO (não é "passou")' }[r.saida]
  l.push(`Resultado: ${fim} — ${r.resumo.nuncaPassa} nunca passa, ${r.resumo.exigeJustificativa} exige justificativa, ${r.resumo.avisos} aviso(s), ${r.resumo.naoConferido} não conferido(s). Saída ${r.saida}.`)
  return l.join('\n')
}

function principal (args) {
  const pos = []
  let config
  let json = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config') config = args[++i]
    else if (args[i] === '--json') json = true
    else pos.push(args[i])
  }
  if (!pos[0]) {
    console.error('Uso: node consistencia.mjs <pasta-src> [--config design-sistemas.json] [--json] [pasta-saida]')
    return 2
  }
  const r = conferir(pos[0], { config })
  const texto = relatorio(r)
  if (pos[1]) {
    fs.mkdirSync(pos[1], { recursive: true })
    fs.writeFileSync(path.join(pos[1], 'consistencia.json'), JSON.stringify(r, null, 2))
    fs.writeFileSync(path.join(pos[1], 'consistencia.txt'), texto + '\n')
  }
  console.log(json ? JSON.stringify(r, null, 2) : texto)
  return r.saida
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exitCode = principal(process.argv.slice(2))
