// Mede históricos locais sem chamar o modelo. Não estima preços.
// Uso: node scripts/medir-uso.mjs <projeto> [--dias 7] [--sessao ID] [--de ISO] [--ate ISO] [--json]
//      node scripts/medir-uso.mjs --todos [--dias 7] [--json]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const filtros = { sessao: null, de: null, ate: null, dias: null }
let todos = false
let comoJson = false
let projeto
const argumentos = process.argv.slice(2)
const falhar = (mensagem) => { console.error(mensagem); process.exit(1) }
for (let i = 0; i < argumentos.length; i++) {
  const arg = argumentos[i]
  if (arg === '--todos') todos = true
  else if (arg === '--json') comoJson = true
  else if (['--sessao', '--de', '--ate', '--dias'].includes(arg)) {
    const valor = argumentos[++i]
    if (!valor || valor.startsWith('--')) falhar(`Faltou o valor de ${arg}.`)
    filtros[arg.slice(2)] = valor
  } else if (arg.startsWith('--') || projeto) falhar(`Argumento inválido: ${arg}`)
  else projeto = arg
}
if (!todos && !projeto) falhar('Informe a pasta do projeto ou --todos.')
if (filtros.dias !== null) {
  filtros.dias = Number(filtros.dias)
  if (!Number.isFinite(filtros.dias) || filtros.dias <= 0) falhar('--dias deve ser um número positivo.')
}
function dataIso(valor, nome) {
  if (valor === null) return null
  const partes = valor.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/)
  const numeros = partes?.slice(1).map(Number)
  const calendario = new Date(0)
  if (numeros) calendario.setUTCFullYear(numeros[0], numeros[1] - 1, numeros[2])
  const valido = numeros && calendario.getUTCFullYear() === numeros[0] &&
    calendario.getUTCMonth() === numeros[1] - 1 && calendario.getUTCDate() === numeros[2] &&
    numeros[3] < 24 && numeros[4] < 60 && numeros[5] < 60
  if (!valido || !Number.isFinite(Date.parse(valor))) {
    falhar(`${nome} deve ser uma data ISO com fuso horário, por exemplo 2026-10-15T19:00:00Z.`)
  }
  return Date.parse(valor)
}
const de = dataIso(filtros.de, '--de')
const ate = dataIso(filtros.ate, '--ate')
if (de !== null && ate !== null && de > ate) falhar('--de deve ser anterior ou igual a --ate.')
const desde = Math.max(de ?? 0, filtros.dias === null ? 0 : Date.now() - filtros.dias * 864e5)
const base = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects')
const campos = ['entrada', 'cacheGravado', 'cacheLido', 'saida']
const vazio = () => ({ entrada: 0, cacheLido: 0, saida: 0 })
// Nome de cada chamada de ferramenta, de todos os arquivos (chamada e retorno podem estar em arquivos diferentes).
const nomesFerramenta = new Map()
const peso = (m) => m.caracteres ?? campos.reduce((n, c) => n + m[c], 0)

// Históricos copiados podem repetir ids com consumo integral ou zerado.
// Conserva uma fotografia inteira, preferindo a de maior consumo; nunca soma cópias.
function juntar(destino, id, mensagem) {
  const anterior = destino.get(id)
  if (!anterior || peso(mensagem) >= peso(anterior)) destino.set(id, mensagem)
}
function porModelo(mensagens) {
  const resultado = {}
  for (const m of mensagens.values()) {
    const t = (resultado[m.modelo] ??= { respostas: 0, entrada: 0, cacheGravado: 0, cacheLido: 0, saida: 0 })
    t.respostas++
    for (const c of campos) t[c] += m[c]
  }
  return resultado
}
function totais(mensagens) {
  const t = vazio()
  for (const m of mensagens.values()) {
    t.entrada += m.entrada + m.cacheGravado
    t.cacheLido += m.cacheLido
    t.saida += m.saida
  }
  return t
}
// Conversa principal × agentes chamados: quanto cada lado relê por resposta (o custo que mais pesa).
function porOrigem(mensagens) {
  const resultado = {}
  for (const m of mensagens.values()) {
    const t = (resultado[m.origem] ??= { respostas: 0, contexto: 0, saida: 0, contextoPorResposta: 0 })
    t.respostas++
    t.contexto += m.entrada + m.cacheGravado + m.cacheLido
    t.saida += m.saida
  }
  for (const t of Object.values(resultado)) t.contextoPorResposta = Math.round(t.contexto / t.respostas)
  return resultado
}
// Saídas de ferramenta que entram na conversa (≈ 4 caracteres por token).
function porFerramenta(ferramentas) {
  const resultado = {}
  for (const f of ferramentas.values()) {
    const nome = nomesFerramenta.get(f.id) || 'desconhecida'
    const t = (resultado[nome] ??= { chamadas: 0, caracteres: 0, imagens: 0, tokensAprox: 0 })
    t.chamadas++
    t.caracteres += f.caracteres
    t.imagens += f.imagens
  }
  for (const t of Object.values(resultado)) t.tokensAprox = Math.round(t.caracteres / 4)
  return Object.fromEntries(Object.entries(resultado).sort((a, b) => b[1].caracteres - a[1].caracteres))
}
function unir(sessoes, chave = 'mensagens') {
  const unicas = new Map()
  for (const s of sessoes) for (const [id, m] of s[chave]) juntar(unicas, id, m)
  return unicas
}
// Imagem não vira caracteres (o base64 inflaria a conta): conta à parte.
const tamanho = (conteudo) => {
  if (typeof conteudo === 'string') return { caracteres: conteudo.length, imagens: 0 }
  const t = { caracteres: 0, imagens: 0 }
  for (const c of Array.isArray(conteudo) ? conteudo : []) {
    if (c.type === 'image') t.imagens++
    else t.caracteres += c.type === 'text' ? c.text.length : JSON.stringify(c).length
  }
  return t
}
function lerPasta(nome) {
  const dir = path.join(base, nome)
  const sessoes = new Map()
  for (const relativo of fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.jsonl')).sort()) {
    const partes = relativo.split(path.sep)
    const id = partes[0].replace(/\.jsonl$/, '')
    if (filtros.sessao && id !== filtros.sessao) continue
    const s = sessoes.get(id) || { id, inicio: null, primeiraPergunta: '', mensagens: new Map(), ferramentas: new Map(), arquivos: [] }
    sessoes.set(id, s)
    const arquivo = path.join(dir, relativo)
    s.arquivos.push(arquivo)
    // Históricos de agente chamado ficam em <sessão>/subagents/; o resto é a conversa principal.
    const origem = partes.length > 1 ? 'agente' : 'principal'
    for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
      let j
      try { j = JSON.parse(linha) } catch { continue }
      const instante = Date.parse(j.timestamp)
      const foraDoPeriodo = (desde > 0 || ate !== null) && (!Number.isFinite(instante) || instante < desde || (ate !== null && instante > ate))
      const blocos = Array.isArray(j.message?.content) ? j.message.content : []
      for (const b of blocos) {
        if (b.type === 'tool_use' && b.id && b.name) nomesFerramenta.set(b.id, b.name)
        if (b.type === 'tool_result' && b.tool_use_id && !foraDoPeriodo) {
          const t = tamanho(b.content)
          juntar(s.ferramentas, b.tool_use_id, { id: b.tool_use_id, origem, ...t })
        }
      }
      if (partes.length === 1) {
        if (!s.inicio && Number.isFinite(instante)) s.inicio = new Date(instante).toISOString()
        if (!s.primeiraPergunta && j.type === 'user' && typeof j.message?.content === 'string') {
          s.primeiraPergunta = j.message.content.replace(/\s+/g, ' ').slice(0, 60)
        }
      }
      const m = j.message
      if (!m?.usage || !m.id) continue
      if (foraDoPeriodo) continue
      const u = m.usage
      juntar(s.mensagens, m.id, {
        modelo: m.model || 'desconhecido', origem, entrada: u.input_tokens || 0,
        cacheGravado: u.cache_creation_input_tokens || 0,
        cacheLido: u.cache_read_input_tokens || 0, saida: u.output_tokens || 0,
      })
    }
  }
  return [...sessoes.values()].filter((s) => s.mensagens.size > 0 || s.ferramentas.size > 0)
}
function relatar(sessoes) {
  const ocorrencias = new Map()
  for (const s of sessoes) for (const id of s.mensagens.keys()) ocorrencias.set(id, (ocorrencias.get(id) || 0) + 1)
  const unicas = unir(sessoes)
  const ferramentas = unir(sessoes, 'ferramentas')
  return {
    sessoes: sessoes.sort((a, b) => (a.inicio || '').localeCompare(b.inicio || '')).map((s) => ({
      id: s.id, inicio: s.inicio, primeiraPergunta: s.primeiraPergunta, arquivos: s.arquivos,
      porModelo: porModelo(s.mensagens), porOrigem: porOrigem(s.mensagens), totais: totais(s.mensagens),
      mensagensCompartilhadas: [...s.mensagens.keys()].filter((id) => ocorrencias.get(id) > 1).length,
    })),
    totais: totais(unicas), porModelo: porModelo(unicas), porOrigem: porOrigem(unicas),
    porFerramenta: porFerramenta(ferramentas), mensagensUnicas: unicas.size,
    atribuicao: 'Sessões podem conter histórico compartilhado. A origem dessas respostas é indeterminada; os totais gerais deduplicam por message.id.',
  }
}

try {
  const principal = projeto ? path.resolve(projeto).replace(/[^A-Za-z0-9]/g, '-') : null
  const pastas = fs.existsSync(base) ? fs.readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (todos || d.name === principal || d.name.startsWith(`${principal}--claude-worktrees-`)))
    .map((d) => d.name) : []
  const grupos = pastas.map((nome) => ({ nome, sessoes: lerPasta(nome) })).filter((g) => g.sessoes.length)
  const sessoes = grupos.flatMap((g) => g.sessoes)
  const geral = relatar(sessoes)
  const relatorio = todos ? {
    filtros, projetos: grupos.map((g) => ({ projeto: g.nome, ...relatar(g.sessoes) })),
    totais: geral.totais, porModelo: geral.porModelo, porOrigem: geral.porOrigem, porFerramenta: geral.porFerramenta,
    mensagensUnicas: geral.mensagensUnicas, atribuicao: geral.atribuicao,
  } : { filtros, ...geral }
  if (comoJson) console.log(JSON.stringify(relatorio, null, 2))
  else {
    const mil = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)} mi` : n >= 1000 ? `${(n / 1000).toFixed(1)} mil` : String(n)
    if (!sessoes.length) console.log('Nenhuma sessão encontrada para esse projeto no período.')
    if (todos) {
      console.log('Projeto'.padEnd(46), 'Sessões', 'Entrada'.padStart(9), 'Cache lido'.padStart(11), 'Saída'.padStart(9))
      for (const g of relatorio.projetos) console.log(g.projeto.slice(-46).padEnd(46), String(g.sessoes.length).padStart(7),
        mil(g.totais.entrada).padStart(9), mil(g.totais.cacheLido).padStart(11), mil(g.totais.saida).padStart(9))
    } else for (const s of geral.sessoes) {
      console.log(`\n${s.inicio || 'sem data'}  ${s.id}  "${s.primeiraPergunta}"`)
      console.log(`  total: entrada ${mil(s.totais.entrada)} · cache lido ${mil(s.totais.cacheLido)} · saída ${mil(s.totais.saida)}`)
      for (const [modelo, m] of Object.entries(s.porModelo)) console.log(
        `  ${modelo}: ${m.respostas} respostas · entrada ${mil(m.entrada + m.cacheGravado)} · cache lido ${mil(m.cacheLido)} · saída ${mil(m.saida)}`)
    }
    console.log(`\nTotal sem duplicatas: entrada ${mil(geral.totais.entrada)} · cache lido ${mil(geral.totais.cacheLido)} · saída ${mil(geral.totais.saida)}`)
    for (const [o, t] of Object.entries(geral.porOrigem)) console.log(
      `  ${o === 'principal' ? 'conversa principal' : 'agentes chamados'}: ${t.respostas} respostas · ${mil(t.contextoPorResposta)} de contexto por resposta`)
    // Quanto foi para cada modelo: mostra se o trabalho braçal está mesmo descendo para Sonnet/Haiku (DEV-46).
    const modelos = Object.entries(geral.porModelo).filter(([m, t]) => m !== '<synthetic>' && t.respostas)
      .sort((a, b) => b[1].respostas - a[1].respostas)
    if (modelos.length) console.log('  por modelo: ' + modelos.map(([m, t]) =>
      `${m} ${t.respostas} respostas (${mil(Math.round((t.entrada + t.cacheGravado + t.cacheLido) / t.respostas))} por resposta)`).join(' · '))
    const top = Object.entries(geral.porFerramenta).slice(0, 5)
    if (top.length) console.log('  ferramentas que mais trazem texto: ' + top.map(([n, t]) => `${n} ${mil(t.tokensAprox)} (${t.chamadas}×)`).join(' · '))
    console.log(geral.atribuicao)
    console.log('Entrada inclui tokens novos e cache gravado; cache lido é contexto reaproveitado. Use --de/--ate para isolar uma tarefa.')
  }
} catch (e) {
  console.error(`ERRO: ${e.message}`)
  process.exitCode = 1
}
