// Detector de mudança sensível: diz se o que vai entrar no commit (ou no envio) toca login, permissão, acesso ao
// banco, upload, pagamento, dados pessoais, segredos ou dependências. Olha as linhas ADICIONADAS de código e
// configuração; nas linhas de PROTEÇÃO ([Authorize], RLS, consulta com parâmetro, HttpOnly, rate limit...) olha os
// dois lados: tirada sem voltar igual (inclusive true → false ou comentada) é "protecao-removida"; posta desligada
// (false, none, off, comentada) é "protecao-desligada". Ignora documentação, imagens e o que o projeto mandar ignorar
// em .devconductor/portao.json ({ "ignorar": ["pasta/**", ...] }). Teste, estilo, tradução e .txt (semPalavras) não
// contam por palavra, só pelo caminho e por segredo com formato de chave real. As áreas ficam em areas-sensiveis.json.
// Nível 2: alguma área "alto", proteção removida/desligada, leitura cortada (diff grande demais: conta como sensível,
// nunca como limpo) ou mais de limiarLinhas (40) linhas adicionadas em arquivos sensíveis; nível 1: outra área.
// Linha com mais de LIMITE_LINHA (2.000) caracteres é testada INTEIRA, em pedaços de 2.000 com 200 de sobra entre
// um e outro (regex com repetição limitada; o tempo fica proporcional ao tamanho do diff). Passou de LIMITE_PEDACOS
// pedaços no total, o resto não é lido e conta como "leitura-cortada" (nível 2), nunca como limpo.
// Prazo: com definirPrazo marcado (o portão marca), ler o diff e classificar também param com PrazoEsgotado.
// Sem rede. Não trava nada sozinho: quem decide é o portão.
//
// O que é comparado (o "modo"; o portão diz qual vale para cada comando):
//   preparado  o que está no índice contra HEAD (com --emenda, contra o pai de HEAD; sem pai, contra o vazio)
//   arvore     a árvore de trabalho contra HEAD, mais os arquivos novos que o .gitignore não esconde. Com caminhos
//              (depois de --): esses caminhos pela árvore + o resto pelo índice; com --somente, só os caminhos
//              (commit com caminhos sem --include). --forcar (git add -f) inclui os ignorados: nos caminhos ou em tudo.
//   envio      os commits que o git push vai mandar; os argumentos do push vêm depois de -- (ex.: -- origin HEAD:x).
//              Compara com os ramos do remoto de destino; sem o ramo lá, tudo o que esse remoto ainda não tem.
// Uso: node mudanca-sensivel.mjs [--modo M] [--emenda] [--intervalo A..B] [--raiz <pasta>] [-- args]
//   → JSON { nivel, categorias, arquivos, linhas }
// Registro (feito por quem revisou, no fim da revisão; o portão só diz o modo):
//   node mudanca-sensivel.mjs --registrar-revisao --achados 0 --quem "<agente>" [--modo M] [--emenda] [--forcar]
//     [--somente] [--raiz <pasta>] [-- caminhos | args do push]
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
export const ARVORE_VAZIA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
export const LIMITE_LINHAS = 20000 // linhas lidas de arquivos não ignorados; passou disso, "leitura-cortada"
const LIMITE_NOVO_BYTES = 512 * 1024 // por arquivo novo não rastreado
const LIMITE_NOVOS = 2000 // arquivos novos lidos
const LIMITE_COMMITS = 500 // commits de um envio lidos

export const LIMITE_LINHA = 2000 // caracteres por pedaço de linha testado (ver classificar)
const SOBRA = 200 // caracteres repetidos entre um pedaço e o seguinte (palavra na emenda não escapa)
export const LIMITE_PEDACOS = 20000 // pedaços de linhas longas testados por classificação (~40 MB)

// Glob simples → objeto com .test(caminho): ** qualquer coisa (inclusive pastas; "**/" = zero ou mais pastas),
// * e ? dentro de um nome, sem diferenciar maiúsculas. Barra invertida vira /. Sem regex: os casos comuns
// (**/*.ext, **/nome, **/pasta/**, nome exato) são comparação direta; o resto é simulado estado a estado
// (autômato), tempo proporcional a tamanho do caminho × tamanho do glob, sem retrocesso (um glob como
// "*a*a*a*a*a*a*a*aZ" não explode).
export function globParaRegex(glob) {
  const g = String(glob).replace(/\\/g, '/').toLowerCase()
  const base = (s) => s.slice(s.lastIndexOf('/') + 1)
  let m
  if (!/[*?]/.test(g)) return { source: g, test: (s) => String(s).toLowerCase() === g }
  if ((m = g.match(/^\*\*\/\*([^*?/]+)$/))) return { source: g, test: (s) => base(String(s).toLowerCase()).endsWith(m[1]) }
  if ((m = g.match(/^\*\*\/([^*?/]+)$/))) return { source: g, test: (s) => base(String(s).toLowerCase()) === m[1] }
  if ((m = g.match(/^\*\*\/([^*?/]+(?:\/[^*?/]+)*)\/\*\*$/))) return { source: g, test: (s) => `/${String(s).toLowerCase()}`.includes(`/${m[1]}/`) }
  const toks = [] // lit (c) | um (?) | estrela (*) | tudo (** solto) | pastas (**/)
  for (let i = 0; i < g.length; i++) {
    const c = g[i]
    if (c === '*' && g[i + 1] === '*') {
      while (g[i + 1] === '*') i++
      if (g[i + 1] === '/') { toks.push({ t: 'pastas' }); i++ } else toks.push({ t: 'tudo' })
    } else if (c === '*') { if (toks.at(-1)?.t !== 'estrela') toks.push({ t: 'estrela' }) } else toks.push(c === '?' ? { t: 'um' } : { t: 'lit', c })
  }
  const n = toks.length
  const N = 2 * n + 1 // estados 0..n e, para cada "pastas" em i, um estado interno n+1+i ("dentro de .*/")
  const fechar = (e) => {
    for (let i = 0; i < n; i++) {
      if (!e[i]) continue
      const t = toks[i].t
      if (t === 'estrela' || t === 'tudo') e[i + 1] = 1
      else if (t === 'pastas') { e[i + 1] = 1; e[n + 1 + i] = 1 }
    }
  }
  return {
    source: g,
    test(s) {
      let at = new Uint8Array(N)
      let px = new Uint8Array(N)
      at[0] = 1
      fechar(at)
      for (const ch of String(s).toLowerCase()) {
        px.fill(0)
        let vivo = false
        for (let i = 0; i < n; i++) {
          const tk = toks[i]
          if (at[i]) {
            if (tk.t === 'lit') { if (tk.c === ch) px[i + 1] = 1 } else if (tk.t === 'um') { if (ch !== '/') px[i + 1] = 1 } else if (tk.t === 'estrela') { if (ch !== '/') px[i] = 1 } else if (tk.t === 'tudo') px[i] = 1
          }
          if (tk.t === 'pastas' && at[n + 1 + i]) { px[n + 1 + i] = 1; if (ch === '/') px[i + 1] = 1 }
        }
        fechar(px)
        for (let i = 0; i < N; i++) if (px[i]) { vivo = true; break }
        if (!vivo) return false
        ;[at, px] = [px, at]
      }
      return at[n] === 1
    },
  }
}

const normalizar = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '')

// Item de "ignorar" sem curinga vale como pasta ou arquivo exato (prefixo).
function casaIgnorar(caminho, item) {
  const i = normalizar(item)
  if (/[*?]/.test(i)) return globParaRegex(i).test(caminho)
  const base = i.replace(/\/+$/, '').toLowerCase()
  const c = caminho.toLowerCase()
  return c === base || c.startsWith(`${base}/`)
}

let areasPadrao
export function carregarAreas(arquivo = path.join(AQUI, 'areas-sensiveis.json')) {
  return compilarAreas(JSON.parse(fs.readFileSync(arquivo, 'utf8')))
}
const padrao = () => (areasPadrao ??= carregarAreas())

function compilarAreas(bruto) {
  if (bruto.__compilado) return bruto
  const prot = bruto.protecaoRemovida || {}
  return {
    __compilado: true,
    limiarLinhas: Number(bruto.limiarLinhas) || 40,
    ignorarSempre: (bruto.ignorarSempre || []).map(globParaRegex),
    semPalavras: (bruto.semPalavras || []).map(globParaRegex),
    protecoes: (prot.palavras || []).map((p) => new RegExp(p, 'i')),
    desligada: prot.desligada ? new RegExp(prot.desligada, 'i') : null,
    protecaoAlta: prot.alto !== false,
    categorias: Object.entries(bruto.categorias || {}).map(([nome, c]) => ({
      nome,
      alto: c.alto === true,
      emTodos: c.emTodos === true,
      caminhos: (c.caminhos || []).map(globParaRegex),
      palavras: (c.palavras || []).length ? new RegExp((c.palavras).map((p) => `(?:${p})`).join('|'), 'i') : null,
      exceto: c.exceto ? new RegExp(c.exceto, 'i') : null,
    })),
  }
}

// Chave para comparar linhas de proteção tiradas × postas: sem espaços nas pontas, espaços juntados e sem
// comentário no fim de uma linha que tem código antes (mover ou comentar ao lado não conta; comentar a linha
// inteira conta, porque o // fica no começo).
// O // só vale como comentário fora de aspas e sem ":" antes ("https://site" não corta a linha).
function chaveProtecao(l) {
  const s = l.trim().replace(/\s+/g, ' ')
  let asp = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (asp) { if (c === '\\') i++; else if (c === asp) asp = ''; continue }
    if (c === '"' || c === "'" || c === '`') { asp = c; continue }
    if (c === '/' && s[i + 1] === '/' && i > 0 && s[i - 1] !== ':') return s.slice(0, i).trimEnd()
  }
  return s
}

// Linhas → pedaços testáveis: a curta vai inteira; a longa vira pedaços de LIMITE_LINHA com SOBRA repetida.
// orc: { resta, cortado } (o orçamento de pedaços é da classificação toda).
function emPedacos(linhas, orc) {
  const saida = []
  for (const l of linhas) {
    if (l.length <= LIMITE_LINHA) { saida.push(l); continue }
    for (let p = 0; p < l.length; p += LIMITE_LINHA - SOBRA) {
      if (orc.resta <= 0) { orc.cortado = true; break }
      orc.resta--
      saida.push(l.slice(p, p + LIMITE_LINHA))
      if (p + LIMITE_LINHA >= l.length) break
    }
  }
  return saida
}

const ignorado = (caminho, areas, ignorar = []) =>
  areas.ignorarSempre.some((r) => r.test(caminho)) || ignorar.some((i) => casaIgnorar(caminho, i))

// Lê o "ignorar" de .devconductor/portao.json na raiz do projeto. Sem arquivo ou JSON quebrado: lista vazia.
export function lerIgnorar(raiz) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(raiz, '.devconductor', 'portao.json'), 'utf8'))
    return Array.isArray(cfg.ignorar) ? cfg.ignorar.map(String) : []
  } catch { return [] }
}

// Caminho como o Git escreve depois de "+++ " ou "--- ": tira o prefixo a/ ou b/, aspas e o tab final.
function caminhoDoCabecalho(resto) {
  let s = resto.replace(/\r$/, '').replace(/\t.*$/, '')
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).replace(/\\(["\\])/g, '$1').replace(/\\t/g, '\t')
  }
  if (s === '/dev/null') return null
  return s.replace(/^[ab]\//, '')
}

// "diff --git a/X b/X" (arquivo binário não tem "+++"): só quando os dois lados são iguais, sem aspas.
function caminhoDaLinhaGit(resto) {
  if (!resto.startsWith('a/')) return null
  const n = (resto.length - 5) / 2
  if (!Number.isInteger(n) || n <= 0) return null
  const p = resto.slice(2, 2 + n)
  return resto.slice(2 + n) === ` b/${p}` ? p : null
}

// Diff unificado → { arquivos, adicionadas: {caminho: [linha]}, removidas: {caminho: [linha]}, cortado }.
// opcoes.filtro(caminho) false: não guarda as linhas daquele arquivo (ignorado). opcoes.limite: linhas guardadas no
// total; passou, para de guardar e marca cortado (os nomes dos arquivos continuam sendo lidos).
export function lerDiff(texto, { limite = Infinity, filtro } = {}) {
  const guardar = filtro || ((c) => !ignorado(c, padrao()))
  const arquivos = []
  const adicionadas = {}
  const removidas = {}
  const registrar = (c) => { if (c && !(c in adicionadas)) { arquivos.push(c); adicionadas[c] = []; removidas[c] = [] } }
  let antigo = null
  let atual = null
  let pelaLinha = null
  let noCabecalho = false
  let guarda = false
  let usadas = 0
  let cortado = false
  let lidas = 0
  for (const bruta of String(texto).split('\n')) {
    if ((++lidas & 2047) === 0) conferirPrazo()
    const linha = bruta.endsWith('\r') ? bruta.slice(0, -1) : bruta
    if (linha.startsWith('diff --git ')) {
      if (noCabecalho && pelaLinha) registrar(pelaLinha)
      noCabecalho = true; antigo = null; atual = null; pelaLinha = caminhoDaLinhaGit(linha.slice(11))
      continue
    }
    if (noCabecalho && linha.startsWith('--- ')) { antigo = caminhoDoCabecalho(linha.slice(4)); continue }
    if (noCabecalho && linha.startsWith('+++ ')) {
      atual = caminhoDoCabecalho(linha.slice(4)) ?? antigo
      registrar(atual)
      guarda = Boolean(atual) && guardar(normalizar(atual))
      noCabecalho = false
      continue
    }
    if (linha.startsWith('@@')) { noCabecalho = false; continue }
    if (noCabecalho || !atual || !guarda) continue
    const c = linha[0]
    if (c !== '+' && c !== '-') continue
    if (usadas >= limite) { cortado = true; continue }
    usadas++
    ;(c === '+' ? adicionadas : removidas)[atual].push(linha.slice(1))
  }
  if (noCabecalho && pelaLinha) registrar(pelaLinha)
  return { arquivos, adicionadas, removidas, cortado }
}

// Núcleo: recebe os arquivos mudados, as linhas adicionadas e removidas de cada um e devolve o nível.
// opcoes.areas: objeto do areas-sensiveis.json (cru ou compilado); opcoes.ignorar: globs/pastas do projeto;
// opcoes.limitePedacos: orçamento de pedaços de linhas longas (padrão LIMITE_PEDACOS).
export function classificar({ arquivos, adicionadas = {}, removidas = {}, cortado = false } = {}, opcoes = {}) {
  const areas = opcoes.areas ? compilarAreas(opcoes.areas) : padrao()
  const ignorar = opcoes.ignorar || []
  const porNome = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [normalizar(k), v]))
  const novasDe = porNome(adicionadas)
  const velhasDe = porNome(removidas)
  const lista = [...new Set([...(arquivos || []), ...Object.keys(adicionadas), ...Object.keys(removidas)].map(normalizar))]
  const categorias = new Set()
  const sensiveis = []
  let linhas = 0
  const orc = { resta: opcoes.limitePedacos ?? LIMITE_PEDACOS, cortado: false }
  let testes = 0
  const tique = () => { if ((++testes & 511) === 0) conferirPrazo() }
  for (const caminho of lista) {
    conferirPrazo()
    if (ignorado(caminho, areas, ignorar)) continue
    // Linha longa: testada inteira, em pedaços (ver emPedacos); o que passar do orçamento marca leitura cortada.
    const novas = emPedacos(novasDe[caminho] || [], orc)
    const velhas = emPedacos(velhasDe[caminho] || [], orc)
    // Teste, estilo, tradução e .txt (semPalavras): não contam por palavra nem por proteção; contam pelo caminho
    // (.env, migração...) e pelas categorias emTodos (segredo com formato de chave real).
    const soCaminho = areas.semPalavras.some((r) => r.test(caminho))
    let tocou = false
    for (const cat of areas.categorias) {
      const pelaPasta = cat.caminhos.some((r) => r.test(caminho))
      const pelaPalavra = !pelaPasta && cat.palavras && (!soCaminho || cat.emTodos) &&
        novas.some((l) => { tique(); return cat.palavras.test(l) && !(cat.exceto && cat.exceto.test(l)) })
      if (pelaPasta || pelaPalavra) { categorias.add(cat.nome); tocou = true }
    }
    // Proteção: linha que casa com um padrão de proteção e sai sem voltar igual (removida ou trocada, como
    // HttpOnly = true → false, ou comentada) é "protecao-removida"; linha posta que desliga a proteção (false, none,
    // off, comentada...) sem uma igual tirada é "protecao-desligada". Pôr proteção nova, ativa, não conta.
    if (!soCaminho) {
      const contagem = (ls) => {
        const m = new Map()
        for (const l of ls) { tique(); if (areas.protecoes.some((re) => re.test(l))) { const k = chaveProtecao(l); m.set(k, (m.get(k) || 0) + 1) } }
        return m
      }
      const tiradas = contagem(velhas)
      const postas = contagem(novas)
      for (const [k, q] of tiradas) if ((postas.get(k) || 0) < q) { categorias.add('protecao-removida'); tocou = true }
      for (const [k, q] of postas) {
        if ((tiradas.get(k) || 0) < q && areas.desligada?.test(k)) { categorias.add('protecao-desligada'); tocou = true }
      }
    }
    if (tocou) { sensiveis.push(caminho); linhas += (novasDe[caminho] || []).length }
  }
  cortado ||= orc.cortado
  if (cortado) categorias.add('leitura-cortada')
  const nomes = [...areas.categorias.map((c) => c.nome), 'protecao-removida', 'protecao-desligada', 'leitura-cortada'].filter((n) => categorias.has(n))
  const alto = areas.categorias.some((c) => c.alto && categorias.has(c.nome)) || cortado ||
    (areas.protecaoAlta && (categorias.has('protecao-removida') || categorias.has('protecao-desligada')))
  const nivel = nomes.length === 0 ? 0 : (alto || linhas > areas.limiarLinhas ? 2 : 1)
  return { nivel, categorias: nomes, arquivos: sensiveis, linhas }
}

// ---- Prazo: o hook tem 10 s e, se estourar, o Claude Code LIBERA o comando sem aviso. O portão marca um prazo
// (definirPrazo) que vale para TUDO: cada chamada ao Git recebe só o tempo que resta e os laços longos sem Git
// (ler o diff, classificar, ler arquivos novos, ler o comando no portão) chamam conferirPrazo de tempos em tempos.
// Acabou (ou a saída do Git passou do limite de memória), lança PrazoEsgotado e o portão NEGA pedindo para repetir
// ou fazer em partes. Sem prazo marcado (linha de comando, registro), não há limite.
let prazoFinal = Infinity
export function definirPrazo(ms) { prazoFinal = Number.isFinite(ms) ? Date.now() + ms : Infinity }
export class PrazoEsgotado extends Error {
  constructor(porque = 'prazo esgotado') { super(porque); this.code = 'PRAZO' }
}
export function conferirPrazo() { if (prazoFinal !== Infinity && Date.now() >= prazoFinal) throw new PrazoEsgotado() }
function restante() {
  if (prazoFinal === Infinity) return undefined
  const r = prazoFinal - Date.now()
  if (r <= 0) throw new PrazoEsgotado()
  return Math.ceil(r)
}

// ---- Git (sempre sem shell: argumentos em lista) ----
function rodar(raiz, args, extra = {}) {
  const timeout = restante()
  const r = spawnSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true, ...extra, ...(timeout ? { timeout } : {}),
  })
  if (r.error?.code === 'ETIMEDOUT') throw new PrazoEsgotado()
  if (r.error?.code === 'ENOBUFS') throw new PrazoEsgotado('saída do Git grande demais')
  return r
}
function git(raiz, args, extra) {
  const r = rodar(raiz, args, extra)
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error((r.stderr || `git saiu com ${r.status}`).trim().split('\n')[0])
  return r.stdout
}
const verificar = (raiz, rev) => {
  const r = rodar(raiz, ['rev-parse', '--verify', '--quiet', rev])
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null
}
const DIFF = ['diff', '--no-color', '--no-ext-diff', '--unified=0']

// Pasta de cima do repositório (lança erro fora de um repositório ou com o repositório quebrado).
export function topoDoRepo(raiz) {
  return git(raiz, ['rev-parse', '--show-toplevel']).trim()
}

// Base do commit: HEAD; na emenda, o pai de HEAD. Sem commit (ou primeiro commit na emenda): a árvore vazia.
function base(topo, emenda) {
  return verificar(topo, `${emenda ? 'HEAD~1' : 'HEAD'}^{commit}`) || ARVORE_VAZIA
}

// Arquivos novos (não rastreados) como diff de arquivo novo, lidos com limite. O .gitignore vale, exceto com forcar.
function novos(topo, caminhos, forcar, filtro) {
  const args = ['ls-files', '--others', '-z', ...(forcar ? [] : ['--exclude-standard'])]
  if (caminhos?.length) args.push('--', ...caminhos)
  const lista = git(topo, args).split('\0').filter(Boolean)
  let cortado = lista.length > LIMITE_NOVOS
  const partes = []
  for (const p of lista.slice(0, LIMITE_NOVOS)) {
    restante()
    const cab = `diff --git a/${p} b/${p}\nnew file mode 100644\n--- /dev/null\n+++ b/${p}\n`
    if (!filtro(normalizar(p))) { partes.push(cab); continue }
    let buf
    try {
      const fd = fs.openSync(path.join(topo, p), 'r')
      try {
        buf = Buffer.alloc(LIMITE_NOVO_BYTES + 1)
        buf = buf.subarray(0, fs.readSync(fd, buf, 0, buf.length, 0))
      } finally { fs.closeSync(fd) }
    } catch { partes.push(cab); continue }
    if (buf.length > LIMITE_NOVO_BYTES) { cortado = true; buf = buf.subarray(0, LIMITE_NOVO_BYTES) }
    if (buf.subarray(0, 8000).includes(0)) { partes.push(cab); continue }
    const linhas = buf.toString('utf8').split('\n')
    if (linhas.at(-1) === '') linhas.pop()
    partes.push(`${cab}@@ -0,0 +1,${linhas.length} @@\n${linhas.map((l) => `+${l}`).join('\n')}\n`)
  }
  return { texto: partes.join(''), cortado }
}

// Argumentos de "git push" → o que vai: { nada, todos, tags, remoto, refspecs, erro }. --tags sem refspec manda só
// as tags; --follow-tags NÃO é "só tags" (manda o de sempre + as tags alcançáveis, que já estão nos commits
// conferidos). "tag <nome>" vale refs/tags/<nome>:refs/tags/<nome>, como no Git.
export function lerPush(args) {
  const r = { nada: false, todos: false, espelho: false, tags: false, remoto: null, refspecs: [], erro: null }
  const pos = []
  let repo = null
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i])
    if (a === '--') { pos.push(...args.slice(i + 1).map(String)); break }
    if (!a.startsWith('-') || a === '-') { pos.push(a); continue }
    const nome = a.split('=')[0]
    if (['--all', '--branches'].includes(nome)) r.todos = true
    else if (nome === '--mirror') r.espelho = true // manda TODAS as referências, não só os ramos
    else if (nome === '--tags') r.tags = true
    else if (['--dry-run', '--delete'].includes(nome)) r.nada = true
    else if (nome === '--repo') { if (a.includes('=')) repo = a.slice(7); else { repo = args[i + 1] == null ? null : String(args[i + 1]); i++ } }
    else if (['--push-option', '--receive-pack', '--exec'].includes(a)) i++
    else if (a === '-o') i++
    else if (/^-o./.test(a)) continue // "-o<valor>": opção de envio com o valor colado, não um grupo de letras
    else if (/^-[a-zA-Z]+$/.test(a) && /[nd]/.test(a.slice(1))) r.nada = true
  }
  r.remoto = pos[0] ?? repo ?? null // --repo só vale sem remoto posicional (como no Git)
  for (let k = 1; k < pos.length; k++) {
    if (pos[k] !== 'tag') { r.refspecs.push(pos[k]); continue }
    if (pos[k + 1] == null) { r.erro = '"tag" sem o nome da tag'; break }
    r.refspecs.push(`refs/tags/${pos[k + 1]}:refs/tags/${pos[k + 1]}`)
    k++
  }
  return r
}

// Configuração que muda o que um push manda e para onde (uma chamada só): push.default, remote.<nome>.push,
// remote.<nome>.mirror, remote.pushDefault e branch.<ramo>.pushRemote/remote (para saber o remoto quando o comando
// não diz) e remote.<nome>.url/pushurl (para reconhecer um remoto conhecido escrito como endereço).
function configPush(topo) {
  const cfg = { padrao: '', remotoPadrao: '', refspecs: new Map(), ramos: new Map(), urls: new Map(), espelhos: new Set() }
  const r = rodar(topo, ['config', '-z', '--get-regexp', '^(push\\.default|remote\\.pushdefault|remote\\..+\\.(push|url|pushurl|mirror)|branch\\..+\\.(pushremote|remote))$'])
  if (r.error) throw r.error
  if (r.status !== 0 && r.status !== 1) throw new Error((r.stderr || 'git config falhou').trim().split('\n')[0])
  for (const item of String(r.stdout || '').split('\0')) {
    if (!item) continue
    const q = item.indexOf('\n')
    const chave = q < 0 ? item : item.slice(0, q)
    const valor = q < 0 ? '' : item.slice(q + 1).trim()
    let m
    if (chave === 'push.default') cfg.padrao = valor.toLowerCase()
    else if (chave === 'remote.pushdefault') cfg.remotoPadrao = valor
    else if ((m = chave.match(/^remote\.(.+)\.push$/))) cfg.refspecs.set(m[1], [...(cfg.refspecs.get(m[1]) || []), valor])
    else if ((m = chave.match(/^remote\.(.+)\.(?:url|pushurl)$/))) cfg.urls.set(m[1], [...(cfg.urls.get(m[1]) || []), valor])
    // valor vazio = chave sem "=" (verdadeiro no Git); só o que é claramente falso não conta como espelho
    else if ((m = chave.match(/^remote\.(.+)\.mirror$/))) { if (/^(false|no|off|0)$/i.test(valor)) cfg.espelhos.delete(m[1]); else cfg.espelhos.add(m[1]) }
    else if ((m = chave.match(/^branch\.(.+)\.(pushremote|remote)$/))) cfg.ramos.set(m[1], { ...cfg.ramos.get(m[1]), [m[2]]: valor })
  }
  return cfg
}

// Commits que o push vai mandar (ids) e o texto dos diffs deles.
function envio(topo, args) {
  const p = lerPush(args)
  if (p.erro) throw new Error(`não entendi o git push (${p.erro})`)
  if (p.nada) return { texto: '', hash: hashDiff('envio\n'), cortado: false, commits: 0 }
  const remotos = new Set(git(topo, ['remote']).split('\n').map((s) => s.trim()).filter(Boolean))
  let ramo = null
  const ramoAtual = () => (ramo ??= git(topo, ['branch', '--show-current']).trim())
  const cfg = configPush(topo)
  // Para ONDE vai. O comando diz (posicional ou --repo); sem isso, a ordem do Git: branch.<ramo>.pushRemote,
  // remote.pushDefault, branch.<ramo>.remote e, por fim, origin (ou o único remoto que existir).
  const daqui = cfg.ramos.get(ramoAtual()) || {}
  const alvo = p.remoto || daqui.pushremote || cfg.remotoPadrao || daqui.remote
    || (!remotos.has('origin') && remotos.size === 1 ? [...remotos][0] : 'origin')
  // Endereço no lugar do nome: se for exatamente o de UM remoto conhecido, vale o que sabemos desse remoto.
  let nome = alvo
  if (!remotos.has(alvo)) {
    const donos = [...remotos].filter((n) => (cfg.urls.get(n) || []).includes(alvo))
    if (donos.length === 1) nome = donos[0]
  }
  // A base da comparação é SEMPRE o que existe nesse remoto (refs/remotes/<remoto>/...), nunca o upstream ou os
  // ramos de outro remoto. Sem o ramo lá: tudo o que esse remoto ainda não tem. Remoto que não dá para identificar
  // (endereço desconhecido, nome com curinga, nome que é pedaço do nome de outro remoto): não há base — todos os
  // commits alcançáveis contam como novos.
  const nomeado = remotos.has(nome) && !/[*?[\\]/.test(nome)
    && ![...remotos].some((o) => o !== nome && (o.startsWith(`${nome}/`) || nome.startsWith(`${o}/`)))
  const foraDoRemoto = nomeado ? [`--remotes=${nome}`] : []
  const rastreio = (dst) => (dst && nomeado ? verificar(topo, `refs/remotes/${nome}/${dst}`) : null)
  const conjuntos = []
  // Ramos correspondentes ("matching"): os ramos locais que têm o mesmo nome no remoto. Sem rede não dá para saber
  // quais, então conferimos todos os ramos locais (o conjunto maior).
  const correspondentes = () => conjuntos.push([['--branches', 'HEAD'], foraDoRemoto])
  const espelho = p.espelho || (cfg.espelhos.has(alvo) && !p.refspecs.length)
  if (espelho) conjuntos.push([['--all', 'HEAD'], foraDoRemoto])
  else if (p.todos) conjuntos.push([['--branches'], foraDoRemoto])
  if (p.tags) conjuntos.push([['--tags'], foraDoRemoto])
  // Sem refspec no comando, quem decide é a configuração: remote.<nome>.push manda o que estiver lá (não o ramo
  // atual); push.default=matching manda os ramos correspondentes. O resto (simple, current, upstream): HEAD.
  let refspecs = p.refspecs
  let soHead = false
  if (!espelho && !p.todos && !p.tags && !refspecs.length) {
    const doRemoto = cfg.refspecs.get(alvo) || []
    if (doRemoto.length) refspecs = doRemoto
    else if (cfg.padrao === 'matching') correspondentes()
    else soHead = true
  }
  for (const bruto of refspecs) {
    const s = bruto.replace(/^\+/, '')
    if (s === ':') { correspondentes(); continue } // ":" e "+:" NÃO apagam: mandam os ramos correspondentes
    const i = s.indexOf(':')
    const src = i >= 0 ? s.slice(0, i) : s
    let dst = i >= 0 ? s.slice(i + 1) : ''
    if (!src) {
      if (dst) continue // ":ramo" (destino não vazio) apaga, não manda conteúdo
      throw new Error('refspec vazio no git push; diga o ramo que vai')
    }
    if (src.includes('*')) {
      // Curinga: exatamente as referências que casam (refs/heads/*, refs/tags/*, refs/*...); fora de refs/, todas.
      conjuntos.push([[/^refs\/[^?[\\]*$/.test(src) ? `--glob=${src}` : '--all', 'HEAD'], foraDoRemoto])
      continue
    }
    const tip = verificar(topo, `${src}^{commit}`)
    if (!tip) throw new Error(`não achei "${src}" para conferir o envio`)
    if (!dst) dst = src === 'HEAD' || src === '@' ? ramoAtual() : src
    const r = rastreio(dst.replace(/^refs\/heads\//, ''))
    conjuntos.push([[tip], r ? [r] : foraDoRemoto])
  }
  if (soHead) {
    // Destino do ramo atual NESSE remoto: o @{push}, o ramo de mesmo nome ou o upstream — cada um só vale se for
    // desse remoto (refs/remotes/<remoto>/...). "git push" com pushRemote=backup não compara com origin/main.
    const doRemoto = (rev) => {
      if (!nomeado) return null
      const s = rodar(topo, ['rev-parse', '--symbolic-full-name', rev])
      const ref = s.status === 0 ? s.stdout.trim() : ''
      return ref.startsWith(`refs/remotes/${nome}/`) ? verificar(topo, ref) : null
    }
    const r = doRemoto('@{push}') || rastreio(ramoAtual()) || doRemoto('@{u}')
    conjuntos.push([['HEAD'], r ? [r] : foraDoRemoto])
  }
  const ids = new Set()
  for (const [tips, fora] of conjuntos) {
    const lista = git(topo, ['rev-list', ...tips, ...(fora.length ? ['--not', ...fora] : [])])
    for (const id of lista.split('\n')) if (id.trim()) ids.add(id.trim())
  }
  const lista = [...ids].sort()
  const hash = hashDiff(`envio\n${lista.join('\n')}`) // os ids já identificam o conteúdo exato
  if (!lista.length) return { texto: '', hash, cortado: false, commits: 0 }
  const lidos = lista.slice(0, LIMITE_COMMITS)
  const r = rodar(topo, ['log', '-p', '--no-color', '--no-ext-diff', '--unified=0', '--format=', '--diff-merges=first-parent',
    '--no-walk=unsorted', '--stdin'], { input: `${lidos.join('\n')}\n` })
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error((r.stderr || 'git log falhou').trim().split('\n')[0])
  return { texto: r.stdout || '', hash, cortado: lidos.length < lista.length, commits: lista.length }
}

// Conteúdo de um modo (ver o topo do arquivo) → { texto, hash, cortado }.
export function conteudo({ raiz = process.cwd(), modo = 'preparado', emenda = false, caminhos = null, forcar = false, somente = false, args = [], intervalo, filtro } = {}) {
  const topo = topoDoRepo(raiz)
  const f = filtro || ((c) => !ignorado(c, padrao(), lerIgnorar(topo)))
  if (intervalo) { const texto = git(topo, [...DIFF, intervalo]); return { topo, texto, hash: hashDiff(texto), cortado: false } }
  if (modo === 'envio') return { topo, ...envio(topo, args) }
  const b = base(topo, emenda)
  let texto
  let cortado = false
  if (modo === 'preparado') texto = git(topo, [...DIFF, '--cached', b])
  else if (modo === 'arvore') {
    const lista = (caminhos || []).filter(Boolean)
    // forcar (git add -f): inclui os ignorados pelo .gitignore — nos caminhos, ou em tudo quando não há caminhos.
    const n = novos(topo, lista.length ? lista : null, forcar, f)
    // somente (commit com caminhos, sem --include): só esses caminhos entram; o resto do índice fica de fora.
    const resto = lista.length && !somente ? git(topo, [...DIFF, '--cached', b, '--', '.', ...lista.map((c) => `:(exclude)${c}`)]) : ''
    texto = lista.length ? resto + git(topo, [...DIFF, b, '--', ...lista]) : git(topo, [...DIFF, b])
    texto += n.texto
    cortado = n.cortado
  } else throw new Error(`modo desconhecido: ${modo} (use preparado, arvore ou envio)`)
  return { topo, texto, hash: hashDiff(texto), cortado }
}

// Compatível com a versão anterior: texto do diff preparado ou de um intervalo.
export function diffDoGit({ raiz = process.cwd(), intervalo } = {}) {
  return conteudo({ raiz, intervalo }).texto
}

// Conteúdo + ignorar do projeto + classificar. Devolve também o texto e o hash (o portão compara com o registro).
export function analisar({ raiz = process.cwd(), areas, ...modo } = {}) {
  const topo = topoDoRepo(raiz)
  const comp = areas ? compilarAreas(areas) : padrao()
  const ignorar = lerIgnorar(topo)
  const filtro = (c) => !ignorado(c, comp, ignorar)
  const c = conteudo({ raiz: topo, filtro, ...modo })
  const lido = lerDiff(c.texto, { limite: LIMITE_LINHAS, filtro })
  const resultado = classificar({ ...lido, cortado: lido.cortado || c.cortado }, { areas: comp, ignorar })
  return { ...resultado, diff: c.texto, hash: c.hash, cortado: lido.cortado || c.cortado }
}

// ---- Registro de revisão (usado pelo portao-seguranca.mjs) ----
// Fica dentro da pasta do Git (.git/devconductor/revisao-seguranca.json): nunca entra em commit. Vale só para o
// conteúdo exato que foi revisado (sha256); guarda o atual e até 9 anteriores (commit e envio podem ter cada um o seu).
export const hashDiff = (texto) => createHash('sha256').update(String(texto)).digest('hex')

export function arquivoRevisao(raiz = process.cwd()) {
  return path.join(git(raiz, ['rev-parse', '--absolute-git-dir']).trim(), 'devconductor', 'revisao-seguranca.json')
}

// Registros gravados, o mais novo primeiro ([] sem arquivo ou com JSON quebrado).
export function lerRevisoes(raiz = process.cwd()) {
  try {
    const m = JSON.parse(fs.readFileSync(arquivoRevisao(raiz), 'utf8'))
    const { anteriores = [], ...atual } = m
    return [atual, ...(Array.isArray(anteriores) ? anteriores : [])].filter((x) => x && typeof x.hash === 'string')
  } catch { return [] }
}
export const lerRevisao = (raiz) => lerRevisoes(raiz)[0] || null

// Grava o registro para o conteúdo atual do modo pedido.
export function registrarRevisao({ raiz = process.cwd(), achados, quem, envio: comEnvio = false, ...modo } = {}) {
  const n = Number(achados)
  if (achados === undefined || achados === '' || !Number.isInteger(n) || n < 0) throw new Error('informe --achados com o número de achados abertos (0 se nada ficou aberto)')
  if (!quem || !String(quem).trim()) throw new Error('informe --quem com quem revisou (agente ou regente)')
  if (comEnvio) modo.modo = 'envio'
  const r = analisar({ raiz, ...modo })
  if (modo.modo === 'envio' ? !r.diff.trim() && r.hash === hashDiff('envio\n') : !r.diff.trim()) {
    throw new Error(modo.modo === 'envio' ? 'nada a enviar' : 'nada a conferir neste modo (git add antes, ou outro --modo)')
  }
  const anteriores = lerRevisoes(raiz).filter((x) => x.hash !== r.hash).slice(0, 9)
  const marcador = {
    hash: r.hash, achadosAbertos: n, quem: String(quem).trim(), quando: new Date().toISOString(),
    alvo: modo.intervalo || modo.modo || 'preparado', emenda: Boolean(modo.emenda), nivel: r.nivel,
    categorias: r.categorias, arquivos: r.arquivos,
  }
  const arquivo = arquivoRevisao(raiz)
  fs.mkdirSync(path.dirname(arquivo), { recursive: true })
  fs.writeFileSync(arquivo, `${JSON.stringify({ ...marcador, anteriores }, null, 2)}\n`)
  return { ...marcador, arquivo }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const todos = process.argv.slice(2)
  const corte = todos.indexOf('--')
  const args = corte >= 0 ? todos.slice(0, corte) : todos
  const resto = corte >= 0 ? todos.slice(corte + 1) : []
  const valor = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined }
  const modo = args.includes('--envio') ? 'envio' : (valor('--modo') || 'preparado')
  const opcoes = {
    raiz: valor('--raiz') || process.cwd(), intervalo: valor('--intervalo'), modo, emenda: args.includes('--emenda'),
    forcar: args.includes('--forcar'), somente: args.includes('--somente'), caminhos: modo === 'arvore' && resto.length ? resto : null, args: modo === 'envio' ? resto : [],
  }
  if (args.includes('--registrar-revisao')) {
    try {
      const m = registrarRevisao({ ...opcoes, achados: valor('--achados'), quem: valor('--quem') })
      console.log(`Revisão registrada (${m.achadosAbertos} achado(s) aberto(s), por ${m.quem}) em ${m.arquivo}`)
    } catch (e) {
      console.error(`Não registrei a revisão: ${e?.message || e}`)
      process.exitCode = 2
    }
  } else try {
    const { diff, hash, cortado, ...resultado } = analisar(opcoes)
    console.log(JSON.stringify(cortado ? { ...resultado, cortado } : resultado))
  } catch (e) {
    console.log(JSON.stringify({ nivel: 0, categorias: [], arquivos: [], linhas: 0, erro: String(e?.message || e) }))
    process.exitCode = 2
  }
}
