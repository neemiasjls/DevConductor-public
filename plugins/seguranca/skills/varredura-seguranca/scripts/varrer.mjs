#!/usr/bin/env node
// Varredura de seguranca num comando: segredos, dependencias com falha conhecida e codigo.
// Chama as ferramentas que EXISTIREM no PATH (gitleaks, osv-scanner, dotnet, npm, pip-audit, semgrep/opengrep);
// nunca baixa nem instala nada. Quando falta uma, avisa como instalar e segue com o que houver.
// Uso: node varrer.mjs [pasta] [--historico] [--sem-rede] [--saida <pasta>]
// Codigo de saida: 0 limpo · 1 achado alto/critico · 2 faltou (ou falhou) gitleaks ou osv-scanner.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const GRAVES = new Set(['critico', 'alto'])
const ORDEM = { critico: 0, alto: 1, medio: 2, baixo: 3 }

export const COMO_INSTALAR = {
  gitleaks: 'Windows: winget install Gitleaks.Gitleaks · outros sistemas: binário na página de releases de gitleaks/gitleaks no GitHub',
  'osv-scanner': 'baixe o executável na página de releases de google/osv-scanner no GitHub e coloque numa pasta do PATH',
  semgrep: 'opcional: pipx install semgrep',
  dotnet: 'instale o SDK do .NET (dotnet.microsoft.com) para conferir os pacotes NuGet',
}

// ---------- descobrir e rodar programas ----------
const lerVar = (env, nome) => {
  const k = Object.keys(env).find((x) => x.toLowerCase() === nome.toLowerCase())
  return k ? env[k] : undefined
}

export function acharNoPath(nome, env = process.env) {
  const dirs = (lerVar(env, 'PATH') || '').split(path.delimiter).filter(Boolean)
  const exts = process.platform === 'win32'
    ? (lerVar(env, 'PATHEXT') || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : ['']
  for (const d of dirs) {
    for (const e of exts) {
      const c = path.join(d, nome + e)
      try { if (fs.statSync(c).isFile()) return c } catch { /* segue */ }
    }
  }
  return null
}

// No Windows, .cmd/.bat passa pelo cmd.exe, que interpreta % & | ^ < > " mesmo entre aspas: recusa em vez de arriscar.
const CMD_PERIGOSO = /[%&|^<>"]/
const ehCmd = (exe) => process.platform === 'win32' && /\.(cmd|bat)$/i.test(exe)
export const MSG_CAMINHO_CMD = 'o caminho contém % & | ^ < > ou " e a ferramenta é .cmd/.bat: mova o projeto para uma pasta sem esses caracteres'
const recusaCmd = (exe, args) => { if (ehCmd(exe) && [exe, ...args].some((a) => CMD_PERIGOSO.test(String(a)))) throw new Error(MSG_CAMINHO_CMD) }

function rodar(exe, args, { cwd, env, timeout = 600000 } = {}) {
  const base = { cwd, env, encoding: 'utf8', timeout, maxBuffer: 256 * 1024 * 1024, windowsHide: true }
  recusaCmd(exe, args)
  if (ehCmd(exe)) {
    // .cmd/.bat (ex.: npm.cmd) só roda pelo cmd.exe; cada argumento vai entre aspas.
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`
    const linha = [exe, ...args].map(q).join(' ')
    const cmd = lerVar(env || process.env, 'ComSpec') || 'cmd.exe'
    return spawnSync(cmd, ['/d', '/s', '/c', `"${linha}"`], { ...base, windowsVerbatimArguments: true })
  }
  return spawnSync(exe, args, base)
}

const lerJson = (texto) => {
  const t = (texto || '').trim()
  if (!t) return null
  try { return JSON.parse(t) } catch { /* pode ter texto antes do JSON */ }
  const i = t.search(/[[{]/)
  return i >= 0 ? JSON.parse(t.slice(i)) : null
}

// Limpeza de TODO texto vindo de ferramenta externa (stderr, mensagem de regra, resumo de falha) antes de ir
// para o terminal e para os relatórios. Mascara: bloco de chave privada (PEM), senha em URL, prefixos conhecidos de
// chave, valor depois de nome de segredo (client_secret, pass=, "x":"y", Authorization: Basic/Bearer) e sequência
// longa com cara de chave. O texto é CORTADO ANTES das regex (nunca passa de TETO, nem com max = Infinity) e cada
// regex anda em linha reta: sem lookahead que percorre o resto e sem repetição solta no começo do padrão.
// Não cobre (fica como veio): senha separada da opção por espaço (mysql -p Segredo, sqlcmd -P Segredo, redis-cli -a
// Segredo), -p colado só com letras quando o texto não cita cliente de banco, e senha sem aspas com ",nome=" ou
// ";nome=" no meio (a máscara para ali, para não engolir o par seguinte).
// { prosa: true } = frase escrita pelo kit com pedaços já limpos: não mascara a palavra seguinte a "token"/"senha"
// sem "=" ou ":" (senão "token escrito no arquivo" viraria "token ***").
const TETO = 4000
const MARGEM = 400
const SEGREDO_SOLTO = 'pass(?:word|wd|phrase)?|pwd|senha|secret|segredo|token|api[_-]?key|apikey|access[_-]?key|key|authorization|bearer'
const SEGREDO_NOME = `${SEGREDO_SOLTO}|chave|credentials?|cookie|_auth`
// Valor entre aspas sai INTEIRO, lido um caractere por vez e sem retrocesso (nenhuma alternativa falha depois de abrir):
// a barra invertida leva junto o caractere seguinte (\" e \' não fecham; \\" fecha) e aspa sem fecho leva até o fim do
// texto (na dúvida, mascara a mais). Aberto por \" (JSON dentro de texto), fecha em \" e a aspa de dentro é \\\".
const entreAspas = (q) => String.raw`\\${q}(?:[^${q}\\]|\\\\(?:\\[^]?|[^${q}\\])?|\\)*(?:${q}|$)|${q}(?:[^${q}\\]|\\[^]?)*(?:${q}|$)`
// Valor sem aspas: vai até o espaço. "," e ";" só encerram quando depois vem espaço, o fim do texto ou outro par
// nome=valor (Password=abc;Database=x mantém o resto legível); senão a senha continua (ab,cdsegredo sai inteira, e
// também a que termina em "=" ou "=="). A espiada do par olha no máximo ~45 caracteres: continua em linha reta.
const PAR_SEGUINTE = `["']?[A-Za-z_][\\w.-]{0,40}["']?\\s?[=:](?![=\\s,;]|$)`
const VALOR_SOLTO = `[^\\s,;]+(?:[,;](?!\\s|$|${PAR_SEGUINTE})[^\\s,;]*)*`
// Valor já mascarado numa passada anterior ("***" seguido de fecho, espaço ou fim): não engole o ")" que vem depois.
const JA_MASCARADO = `\\*{3}(?=[)\\]}"'\\s,;]|$)`
const VALOR = `${JA_MASCARADO}|${entreAspas('"')}|${entreAspas("'")}|${VALOR_SOLTO}`
// Entre o nome e o valor: "=", ":", "=>", ":=", "==", "===", "!=", "!==" (o que sobrar do operador não vira o "valor").
const SEPARADOR = '(?:[!:]?={1,3}>?|:)'
const ESQUEMA = '(?:(?:bearer|basic|digest|negotiate|token)\\s+)?'
const RE_PEM = /-----BEGIN [A-Z0-9 ]{0,40}PRIVATE KEY[A-Z ]{0,20}-----[^]*?(?:-----END [A-Z0-9 ]{0,40}PRIVATE KEY[A-Z ]{0,20}-----|$)/g
const RE_URL = /:\/\/[^\s/@:]*:[^\s/]*@/g
const RE_PREFIXO = /\b(?:gh[pousr]_|github_pat_|glpat-|sk-|[srp]k_(?:live|test)_|whsec_|xox[abeprs]-|AKIA|ASIA|AIza|eyJ|npm_)[A-Za-z0-9_.\-]{8,}/g
// Nome de segredo em qualquer posição do identificador (client_secret, passwordHash), depois "=" ou ":".
const RE_ATRIBUICAO = new RegExp(`(${SEGREDO_NOME})([A-Za-z0-9_-]{0,30}[\\\\"'\\]]{0,4}\\s*${SEPARADOR}\\s*)${ESQUEMA}(${VALOR})`, 'gi')
// Linha de comando: usuário:senha de -u / --user (curl -u admin:segredo, com ou sem espaço) e senha colada em -p de
// cliente de banco (mysql -pSegredo1). Maiúscula não entra (-P é porta no mysql).
const RE_USUARIO_SENHA = new RegExp(`(^|\\s)(-u\\s*|--(?:proxy-)?user(?:\\s+|=))(?:(["'])([^\\s:"']{1,80}):(?:[^"'\\\\]|\\\\[^]?)*["']?|([^\\s:"']{1,80}):(${VALOR}))`, 'g')
const RE_SENHA_COLADA = new RegExp(`(^|\\s)-p(${VALOR})`, 'g')
const RE_CLIENTE_DE_BANCO = /\b(?:mysql\w*|mariadb[\w-]*|mycli)\b/i
// -u 1000:1000 só é usuário e grupo quando o texto COMEÇA um comando de quem usa esse formato (docker, podman,
// kubectl, chown: a palavra solta, entre espaços, não dentro de endereço ou de nome) e não cita cliente de rede nem
// endereço (curl, wget, "://"); fora disso, número:número é usuário e senha (curl -u 123:4567) e sai mascarado.
// -u http://... (endereço) fica. Par inteiro entre aspas ("admin:se gredo") sai até a aspa que fecha (ou até o fim).
const RE_COMANDO_UID_GID = /(?:^|\s)(?:sudo\s+)?(?:docker(?:-compose)?|podman|nerdctl|kubectl|crictl|chown|runuser|setpriv)\s/i
const RE_CLIENTE_DE_REDE = /:\/\/|\b(?:curl|wget|https?|httpie|aria2c|ftp|lftp|svn)\b/i
const temUidGid = (t) => RE_COMANDO_UID_GID.test(t) && !RE_CLIENTE_DE_REDE.test(t)
const usuarioSenha = (temUidGid) => (tudo, antes, opcao, aspa, entreAspas, usuario, valor) => {
  if (aspa) return `${antes}${opcao}${aspa}${entreAspas}:***${aspa}`
  return (temUidGid && /^\d+$/.test(usuario) && /^\d+$/.test(valor)) || valor.startsWith('//') ? tudo : `${antes}${opcao}${usuario}:***`
}
// -p3306 e -p8080:80 só são porta sem cliente de banco no texto (no mysql a porta é -P: -p1234 e -p8080:80 são senha
// e saem mascaradas, mesmo que o texto também tenha docker). Com cliente de banco, tudo colado em -p é senha; sem
// ele, só o que tem letra e número ou símbolo de senha (-pthread, -pedantic, -pix_fmt e -print0 ficam).
const PORTA = /^\d{1,5}(?::\d{1,5}){0,2}$/
const senhaColada = (temCliente) => (tudo, antes, valor) => {
  if (PORTA.test(valor)) return temCliente ? `${antes}-p***` : tudo
  const comCara = (/\d/.test(valor) && /[A-Za-z]/.test(valor) && valor !== 'rint0') || /[!@#$%^&*+"']/.test(valor)
  return temCliente || comCara ? `${antes}-p***` : tudo
}
// O operador que sobrou de uma atribuição já mascarada (token => ***) não é valor: não vira um segundo "***".
const RE_SOLTA = new RegExp(`\\b(${SEGREDO_SOLTO})\\b(\\s+)(?!${SEPARADOR}(?:\\s|$))${ESQUEMA}(${VALOR})`, 'gi')
const RE_SEQUENCIA = /[A-Za-z0-9+/_=-]{20,}/g
// Tem letra e número, é só hexadecimal, ou é comprida demais para ser palavra (32+ sem "/").
const pareceChave = (s) => (/\d/.test(s) && /[A-Za-z]/.test(s)) || /^[0-9a-f]+$/i.test(s) || (s.length >= 32 && !s.includes('/'))
export function limpar(texto, max = 200, { prosa = false } = {}) {
  const limite = Math.min(Number.isFinite(max) && max >= 0 ? max : TETO, TETO)
  let t = String(texto ?? '').slice(0, 65536).replace(/\s+/g, ' ').trim()
  const corte = limite + MARGEM
  let cortado = false
  if (t.length > corte) {
    cortado = true
    const noMeio = t[corte] !== ' ' && t[corte - 1] !== ' '
    t = t.slice(0, corte)
    // Palavra partida pelo corte pode ser o começo de uma chave: sai inteira.
    if (noMeio) t = `${t.slice(0, t.lastIndexOf(' ') + 1)}***`
  }
  t = t.replace(RE_PEM, '***')
  t = t.replace(RE_URL, '://usuario:***@')
  t = t.replace(RE_PREFIXO, '***')
  t = t.replace(RE_USUARIO_SENHA, usuarioSenha(temUidGid(t)))
  t = t.replace(RE_SENHA_COLADA, senhaColada(RE_CLIENTE_DE_BANCO.test(t)))
  t = t.replace(RE_ATRIBUICAO, '$1$2***')
  if (!prosa) t = t.replace(RE_SOLTA, '$1$2***')
  t = t.replace(RE_SEQUENCIA, (s) => (pareceChave(s) ? '***' : s))
  return t.length > limite ? `${t.slice(0, limite)}…` : cortado ? `${t}…` : t
}
// Pedaço vindo de ferramenta (nome de pacote, versão, identificador) antes de entrar numa frase do kit.
const pedaco = (x, n = 80) => limpar(x, n)
// Endereço do aviso de falha: mostra só o identificador (GHSA/CVE); o que não tiver essa forma passa pela limpeza.
const avisoDeFalha = (u) => {
  const id = /(?:^|\/)((?:GHSA|CVE)-[A-Za-z0-9-]{4,24})\/?$/.exec(String(u).slice(0, 500))
  return id ? id[1] : limpar(u, 120)
}

const erroCurto = (r) => limpar(r.error ? r.error.message : (r.stderr || r.stdout || '').trim().split(/\r?\n/).slice(-2).join(' '))

// Exige JSON válido no formato esperado da ferramenta: vazio, texto solto ou formato errado NÃO é "código limpo".
const ehObjeto = (d) => d !== null && typeof d === 'object' && !Array.isArray(d)
function lerResposta(texto, formatoOk) {
  if (!String(texto || '').trim()) throw new Error('resposta vazia')
  let d = null
  try { d = lerJson(texto) } catch { /* não é JSON */ }
  if (d === null || !formatoOk(d)) throw new Error('resposta em formato inesperado')
  return d
}
const lerSuave = (texto) => { try { return lerJson(texto) } catch { return null } }

// ---------- caminhos e filtros ----------
// Glob sem regex e sem retrocesso. As posições possíveis ficam numa lista crescente e sem repetição, e cada parte do
// padrão percorre o caminho UMA vez: tempo O(partes x tamanho) também em `**/**`, `**` seguido de `*` e `**/` repetido
// (antes cada posição voltava a percorrer o resto do caminho: quadrático). Devolve { test } como a antiga regex:
// `*` = qualquer coisa sem "/", `?` = um caractere sem "/", `**` = qualquer coisa, `**/` = pastas opcionais;
// sem diferença de maiúscula e casa também quando o padrão cobre só o começo do caminho (uma pasta).
export function globParaRegex(glob) {
  const g = String(glob).replace(/\\/g, '/').toLowerCase()
  const partes = []
  for (let i = 0; i < g.length; i++) {
    const c = g[i]
    if (c === '*' && g[i + 1] === '*') {
      i++
      if (g[i + 1] === '/') { i++; partes.push('**/') } else partes.push('**')
    } else if (c === '*' || c === '?') partes.push(c)
    else partes.push({ lit: c })
  }
  return {
    test(caminho) {
      const s = String(caminho).toLowerCase()
      const n = s.length
      let at = [0]
      for (const p of partes) {
        const prox = []
        if (typeof p === 'object') { for (const i of at) if (i < n && s[i] === p.lit) prox.push(i + 1) }
        else if (p === '?') { for (const i of at) if (i < n && s[i] !== '/') prox.push(i + 1) }
        else if (p === '*') {
          // Do início até a próxima "/" (a posição da barra entra). Quem começa dentro do trecho anterior já está coberto.
          let ult = -1
          for (const i of at) {
            if (i <= ult) continue
            for (let j = i; j <= n; j++) { prox.push(j); ult = j; if (j < n && s[j] === '/') break }
          }
        } else if (p === '**') { for (let j = at[0]; j <= n; j++) prox.push(j) } // tudo a partir da primeira posição
        else { // '**/': as posições que já havia, mais o começo de cada pasta depois da primeira posição
          let k = 0
          for (let j = at[0]; j <= n; j++) {
            while (k < at.length && at[k] < j) k++
            if ((k < at.length && at[k] === j) || (j > at[0] && s[j - 1] === '/')) prox.push(j)
          }
        }
        at = prox
        if (!at.length) return false
      }
      for (const i of at) if (i === n || s[i] === '/') return true
      return false
    },
  }
}

const relativo = (pasta, arq) => {
  if (!arq) return null
  const a = path.isAbsolute(arq) ? path.relative(pasta, arq) : path.normalize(arq)
  return a.split(path.sep).join('/').replace(/^\.\//, '')
}

function lerConfig(pasta) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(pasta, '.devconductor', 'varredura.json'), 'utf8'))
    return { ignorar: Array.isArray(c.ignorar) ? c.ignorar : [] }
  } catch { return { ignorar: [] } }
}

function procurar(pasta, teste, prof = 4) {
  const achados = []
  const pular = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', '.venv', 'venv'])
  const andar = (d, n) => {
    let itens = []
    try { itens = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const it of itens) {
      if (it.isDirectory()) { if (n < prof && !pular.has(it.name)) andar(path.join(d, it.name), n + 1) } else if (teste(it.name)) achados.push(path.join(d, it.name))
    }
  }
  andar(pasta, 0)
  return achados
}

// ---------- gravidade ----------
const porPalavra = (s) => {
  const t = String(s || '').toLowerCase()
  if (t.startsWith('crit')) return 'critico'
  if (t === 'high' || t === 'error' || t === 'alto') return 'alto'
  if (t === 'moderate' || t === 'medium' || t === 'warning' || t === 'medio') return 'medio'
  if (t === 'low' || t === 'info' || t === 'baixo') return 'baixo'
  return null
}
const porNota = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return null
  return v >= 9 ? 'critico' : v >= 7 ? 'alto' : v >= 4 ? 'medio' : 'baixo'
}
// Falha conhecida sem gravidade informada conta como alta: na dúvida, não passa calada.
const SEM_GRAVIDADE = 'alto'

// ---------- normalizadores (um por ferramenta, formato JSON documentado de cada uma) ----------
export function normalizarGitleaks(dados, pasta) {
  return (Array.isArray(dados) ? dados : []).map((f) => ({
    ferramenta: 'gitleaks',
    tipo: 'segredo',
    categoria: 'segredos',
    gravidade: 'critico',
    arquivo: relativo(pasta, f.File),
    linha: f.StartLine ?? null,
    explicacao: `Senha, chave ou token escrito no arquivo (${limpar(f.Description || f.RuleID, 80)}${f.Commit ? `, commit ${pedaco(String(f.Commit).slice(0, 8))}` : ''}). Quem tiver o código ou o histórico consegue usar.`,
    correcao: 'Tirar do código, trocar a chave no serviço (a antiga já vazou) e ler de variável de ambiente ou cofre de segredos.',
  }))
}

const versaoCorrigida = (vuln, nomePacote) => {
  for (const a of vuln.affected || []) {
    if (a.package && a.package.name && nomePacote && a.package.name !== nomePacote) continue
    for (const r of a.ranges || []) for (const e of r.events || []) if (e.fixed) return e.fixed
  }
  return null
}

export function normalizarOsv(dados, pasta) {
  const lista = []
  for (const res of (dados && dados.results) || []) {
    const origem = relativo(pasta, res.source && res.source.path)
    for (const p of res.packages || []) {
      const pk = p.package || {}
      const vulns = p.vulnerabilities || []
      const grupos = p.groups && p.groups.length ? p.groups : vulns.map((v) => ({ ids: [v.id] }))
      for (const g of grupos) {
        const v = vulns.find((x) => g.ids.includes(x.id)) || { id: g.ids[0] }
        const grav = porNota(g.max_severity) || porPalavra(v.database_specific && v.database_specific.severity) || SEM_GRAVIDADE
        const fix = versaoCorrigida(v, pk.name)
        lista.push({
          ferramenta: 'osv-scanner',
          tipo: 'dependencia',
          categoria: 'dependencias',
          gravidade: grav,
          arquivo: origem,
          linha: null,
          explicacao: `O pacote ${pedaco(pk.name)} ${pedaco(pk.version, 40)} (${pedaco(pk.ecosystem, 40)}) tem falha conhecida ${g.ids.slice(0, 8).map((i) => pedaco(i, 40)).join(', ')}${v.summary ? `: ${limpar(v.summary)}` : ''}. A falha é pública e pode ser explorada.`,
          correcao: fix ? `Atualizar ${pedaco(pk.name)} para ${pedaco(fix, 40)} ou mais nova.` : `Atualizar ${pedaco(pk.name)} para uma versão sem a falha (ver ${pedaco(g.ids[0], 40)} em osv.dev).`,
        })
      }
    }
  }
  return lista
}

export function normalizarDotnet(dados, pasta) {
  const lista = []
  for (const proj of (dados && dados.projects) || []) {
    for (const fw of proj.frameworks || []) {
      for (const [chave, direto] of [['topLevelPackages', true], ['transitivePackages', false]]) {
        for (const p of fw[chave] || []) {
          for (const v of p.vulnerabilities || []) {
            lista.push({
              ferramenta: 'dotnet',
              tipo: 'dependencia',
              categoria: 'dependencias',
              gravidade: porPalavra(v.severity) || SEM_GRAVIDADE,
              arquivo: relativo(pasta, proj.path),
              linha: null,
              explicacao: `O pacote NuGet ${pedaco(p.id)} ${pedaco(p.resolvedVersion, 40)}${direto ? '' : ' (puxado por outro pacote)'} tem falha conhecida. A falha é pública e pode ser explorada.`,
              correcao: `Atualizar ${pedaco(p.id)} para uma versão sem a falha${v.advisoryurl ? ` (detalhes: ${avisoDeFalha(v.advisoryurl)})` : ''}${direto ? '' : '; se for indireto, atualizar o pacote que o puxa ou referenciar a versão corrigida'}.`,
            })
          }
        }
      }
    }
  }
  return lista
}

export function normalizarNpm(dados, arquivo) {
  return Object.values((dados && dados.vulnerabilities) || {}).map((v) => {
    const via = (v.via || []).find((x) => typeof x === 'object') || {}
    const fix = v.fixAvailable && typeof v.fixAvailable === 'object' ? v.fixAvailable : null
    return {
      ferramenta: 'npm audit',
      tipo: 'dependencia',
      categoria: 'dependencias',
      gravidade: porPalavra(v.severity) || SEM_GRAVIDADE,
      arquivo,
      linha: null,
      explicacao: `O pacote ${pedaco(v.name)} (${pedaco(v.range || 'versão instalada')}) tem falha conhecida${via.title ? `: ${limpar(via.title)}` : ''}. A falha é pública e pode ser explorada.`,
      correcao: fix ? `Atualizar ${pedaco(fix.name)} para ${pedaco(fix.version, 40)}${fix.isSemVerMajor ? ' (versão maior: conferir se nada quebra)' : ''}.` : v.fixAvailable ? 'Rodar npm audit fix e conferir.' : `Sem correção publicada: trocar ${pedaco(v.name)} ou isolar o uso.`,
    }
  })
}

export function normalizarPipAudit(dados, arquivo) {
  const deps = Array.isArray(dados) ? dados : (dados && dados.dependencies) || []
  const lista = []
  for (const d of deps) {
    for (const v of d.vulns || []) {
      lista.push({
        ferramenta: 'pip-audit',
        tipo: 'dependencia',
        categoria: 'dependencias',
        gravidade: SEM_GRAVIDADE,
        arquivo,
        linha: null,
        explicacao: `O pacote ${pedaco(d.name)} ${pedaco(d.version, 40)} tem falha conhecida ${pedaco(v.id, 40)}. A falha é pública e pode ser explorada (a ferramenta não informa a gravidade).`,
        correcao: v.fix_versions && v.fix_versions.length ? `Atualizar ${pedaco(d.name)} para ${pedaco(v.fix_versions[0], 40)} ou mais nova.` : `Sem correção publicada: trocar ${pedaco(d.name)} ou isolar o uso.`,
      })
    }
  }
  return lista
}

export function normalizarSemgrep(dados, pasta, ferramenta = 'semgrep') {
  return ((dados && dados.results) || []).map((r) => ({
    ferramenta,
    tipo: 'codigo',
    categoria: pedaco(String(r.check_id || 'codigo').split('.').pop()) || 'codigo',
    gravidade: porPalavra(r.extra && r.extra.severity) || 'medio',
    arquivo: relativo(pasta, r.path),
    linha: (r.start && r.start.line) ?? null,
    explicacao: `Trecho de código com padrão inseguro (regra ${limpar(r.check_id || 'sem identificador', 120)}, ${relativo(pasta, r.path) || 'arquivo desconhecido'}${(r.start && r.start.line) ? `:${r.start.line}` : ''}).`,
    correcao: 'Ler o trecho e corrigir conforme a explicação; se for falso positivo, registrar em .devconductor/varredura.json (ignorar).',
  }))
}

// ---------- varredura ----------
export async function varrer(pastaArg, opcoes = {}) {
  const pasta = path.resolve(pastaArg || '.')
  const env = opcoes.env || process.env
  const { ignorar } = lerConfig(pasta)
  const rodaram = []
  const faltaram = [] // { ferramenta, motivo, comoInstalar, obrigatoria }
  let achados = []
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'varredura-'))
  const tem = (n) => acharNoPath(n, env)

  // Recusa cedo e com mensagem clara: ferramenta obrigatória .cmd/.bat (Windows) e caminho com caractere do cmd.exe.
  for (const nome of ['gitleaks', 'osv-scanner']) {
    const exe = tem(nome)
    if (exe && ehCmd(exe) && [pasta, tmp].some((c) => CMD_PERIGOSO.test(c))) { fs.rmSync(tmp, { recursive: true, force: true }); throw new Error(MSG_CAMINHO_CMD) }
  }

  try {
    // 1. Segredos (obrigatória)
    const gl = tem('gitleaks')
    if (!gl) faltaram.push({ ferramenta: 'gitleaks', motivo: 'não encontrado no PATH', comoInstalar: COMO_INSTALAR.gitleaks, obrigatoria: true })
    else {
      const modos = ['dir']
      if (opcoes.historico) {
        const g = rodar('git', ['-C', pasta, 'rev-parse', '--git-dir'], { env })
        if (g.status === 0) modos.push('git')
        else faltaram.push({ ferramenta: 'gitleaks git', motivo: '--historico pedido, mas a pasta não é repositório Git', obrigatoria: false })
      }
      for (const modo of modos) {
        const rel = path.join(tmp, `gitleaks-${modo}.json`)
        const r = rodar(gl, [modo, pasta, '--report-format', 'json', '--report-path', rel, '--redact', '--no-banner', '--log-level', 'error', '--exit-code', '0', '--gitleaks-ignore-path', pasta], { cwd: pasta, env })
        // Arquivo com "[]" = nada achado (limpo); arquivo ausente, vazio ou fora do formato de lista = não rodou.
        try {
          if (r.status !== 0) throw new Error(`falhou: ${erroCurto(r)}`)
          if (!fs.existsSync(rel)) throw new Error('resposta vazia')
          const d = lerResposta(fs.readFileSync(rel, 'utf8'), Array.isArray)
          achados.push(...normalizarGitleaks(d, pasta))
          rodaram.push(`gitleaks ${modo}`)
        } catch (e) { faltaram.push({ ferramenta: `gitleaks ${modo}`, motivo: limpar(e.message), obrigatoria: true }) }
      }
    }

    // 2. Dependências (osv-scanner obrigatória; npm audit / pip-audit só na falta dele)
    const osv = tem('osv-scanner')
    if (!osv) faltaram.push({ ferramenta: 'osv-scanner', motivo: 'não encontrado no PATH', comoInstalar: COMO_INSTALAR['osv-scanner'], obrigatoria: true })
    else {
      const r = rodar(osv, ['scan', 'source', '-r', '--format', 'json', pasta], { cwd: pasta, env })
      // 0 = sem falha, 1 = falhas achadas, 128 = nenhum pacote encontrado (documentado na v2)
      if ([0, 1, 128].includes(r.status)) {
        try {
          // 128 = nada para escanear (sem JSON é esperado); com 0 ou 1 o JSON com "results" é obrigatório.
          const d = r.status === 128 && !String(r.stdout || '').trim() ? { results: [] } : lerResposta(r.stdout, (x) => ehObjeto(x) && Array.isArray(x.results))
          achados.push(...normalizarOsv(d, pasta))
          rodaram.push('osv-scanner')
        } catch (e) { faltaram.push({ ferramenta: 'osv-scanner', motivo: limpar(e.message), obrigatoria: true }) }
      } else faltaram.push({ ferramenta: 'osv-scanner', motivo: `falhou: ${erroCurto(r)}`, obrigatoria: true })

    }
    if (!osv) {
      // O lockfile pode estar numa subpasta (ex.: web/ ao lado da API): confere cada um, até 20.
      const locks = procurar(pasta, (n) => n === 'package-lock.json').slice(0, 20)
      const npm = tem('npm')
      if (locks.length && !npm) faltaram.push({ ferramenta: 'npm audit', motivo: 'reserva do osv-scanner para npm; npm não encontrado', obrigatoria: false })
      else for (const lock of locks) {
        const relLock = path.relative(pasta, lock).replaceAll('\\', '/')
        const r = rodar(npm, ['audit', '--json'], { cwd: path.dirname(lock), env })
        // Suposição: sai 0 sem falha e 1 com vulnerabilidade; erro de rede/registro sai ≠ 0 com campo "error" no JSON.
        try {
          const d0 = lerSuave(r.stdout)
          if (ehObjeto(d0) && d0.error) throw new Error(limpar(d0.error.summary || d0.error.code || 'erro do npm'))
          if (![0, 1].includes(r.status)) throw new Error(erroCurto(r) || 'resposta vazia')
          const d = lerResposta(r.stdout, (x) => ehObjeto(x) && (ehObjeto(x.vulnerabilities) || ehObjeto(x.advisories)))
          achados.push(...normalizarNpm(d, relLock)); rodaram.push(`npm audit ${relLock} (reserva)`)
        } catch (e) { faltaram.push({ ferramenta: 'npm audit', motivo: `${relLock} falhou: ${limpar(e.message)}`, obrigatoria: false }) }
      }
      const reqs = fs.readdirSync(pasta).filter((f) => /^requirements.*\.txt$/i.test(f))
      if (reqs.length) {
        const pa = tem('pip-audit')
        if (!pa) faltaram.push({ ferramenta: 'pip-audit', motivo: 'reserva do osv-scanner para Python; não encontrado', comoInstalar: 'opcional: pipx install pip-audit', obrigatoria: false })
        else for (const req of reqs) {
          const r = rodar(pa, ['-r', path.join(pasta, req), '-f', 'json'], { cwd: pasta, env })
          // Suposição: sai 0 sem falha e 1 com vulnerabilidade (ou erro); só vale como rodada se a saída trouxer "dependencies".
          try {
            if (![0, 1].includes(r.status)) throw new Error(erroCurto(r) || 'resposta vazia')
            const d = lerResposta(r.stdout, (x) => ehObjeto(x) && Array.isArray(x.dependencies))
            achados.push(...normalizarPipAudit(d, req)); rodaram.push(`pip-audit ${req} (reserva)`)
          } catch (e) { faltaram.push({ ferramenta: 'pip-audit', motivo: `falhou: ${limpar(e.message)}`, obrigatoria: false }) }
        }
      }
    }

    // 3. NuGet: o osv-scanner não lê .csproj; o SDK do .NET confere
    const slns = fs.readdirSync(pasta).filter((f) => /\.sln$/i.test(f)).map((f) => path.join(pasta, f))
    const alvosNet = slns.length ? slns : procurar(pasta, (n) => /\.csproj$/i.test(n))
    if (alvosNet.length) {
      const dn = tem('dotnet')
      if (!dn) faltaram.push({ ferramenta: 'dotnet', motivo: 'projeto .NET sem o SDK no PATH', comoInstalar: COMO_INSTALAR.dotnet, obrigatoria: false })
      else for (const alvo of alvosNet) {
        const r = rodar(dn, ['list', alvo, 'package', '--vulnerable', '--include-transitive', '--format', 'json'], { cwd: pasta, env })
        try {
          // dotnet sai 0 mesmo com vulnerabilidade achada (suposição); ≠ 0 é falha (ex.: restore faltando).
          // Sem restore ele imprime {"problems":[{"text":"... "dotnet restore" ..."}]} com aspas sem escape (JSON
          // inválido): lê o texto do problema por regex em vez de mostrar o pedaço final do JSON quebrado.
          const problema = /"text":\s*"(.*)",?\s*$/m.exec(String(r.stdout || ''))
          if (r.status !== 0 && problema) throw new Error(problema[1])
          if (r.status !== 0) throw new Error(erroCurto(r) || 'resposta vazia')
          const d = lerResposta(r.stdout, (x) => ehObjeto(x) && Array.isArray(x.projects))
          achados.push(...normalizarDotnet(d, pasta))
          rodaram.push(`dotnet list package (${relativo(pasta, alvo)})`)
        } catch (e) { faltaram.push({ ferramenta: 'dotnet list package', motivo: `${relativo(pasta, alvo)}: ${limpar(e.message)} (rode dotnet restore antes)`, obrigatoria: false }) }
      }
    }

    // 4. Código: Semgrep ou Opengrep, se instalado (usa a rede para as regras; fora com --sem-rede)
    const sg = tem('semgrep') ? ['semgrep', tem('semgrep')] : tem('opengrep') ? ['opengrep', tem('opengrep')] : null
    if (opcoes.semRede) { if (sg) faltaram.push({ ferramenta: sg[0], motivo: 'pulado por --sem-rede', obrigatoria: false }) }
    else if (!sg) faltaram.push({ ferramenta: 'semgrep', motivo: 'não instalado (camada opcional)', comoInstalar: COMO_INSTALAR.semgrep, obrigatoria: false })
    else {
      const r = rodar(sg[1], ['scan', '--config', 'p/default', '--metrics=off', '--json', '--quiet', pasta], { cwd: pasta, env })
      try {
        const d = lerSuave(r.stdout)
        // Semgrep sem --error sai 0 com achado; 1 também é aceito; 2/7 etc. = erro fatal ou de configuração, mesmo com JSON e results vazio.
        const errosFatais = ((d && d.errors) || []).filter((e) => e && (e.level === 'error' || e.type === 'fatal'))
        if (![0, 1].includes(r.status) || errosFatais.length) {
          const e0 = errosFatais[0]
          throw new Error(`saiu com código ${r.status}${e0 ? `: ${limpar(e0.message || e0.long_msg || e0.type || 'erro')}` : ''}`)
        }
        lerResposta(r.stdout, (x) => ehObjeto(x) && Array.isArray(x.results))
        achados.push(...normalizarSemgrep(d, pasta, sg[0]))
        rodaram.push(sg[0])
      } catch (e) { faltaram.push({ ferramenta: sg[0], motivo: `falhou: ${limpar(e.message)}`, obrigatoria: false }) }
    }

    // 5. Verificações próprias do kit (sempre)
    try {
      const verificar = opcoes.verificar || (await import(pathToFileURL(path.join(aqui, 'verificacoes-proprias.mjs')).href)).verificar
      const proprios = (await verificar(pasta, { ignorar })) || []
      achados.push(...proprios.map((a) => ({ ferramenta: 'verificacoes-proprias', ...a })))
      // Limite de arquivos, de tamanho ou de prazo estourado: aparece no terminal e no relatório, nunca calado.
      for (const av of proprios.avisos || []) faltaram.push({ ferramenta: 'verificações próprias', motivo: limpar(av), obrigatoria: false })
      rodaram.push('verificações próprias')
    } catch (e) {
      const motivo = e.code === 'ERR_MODULE_NOT_FOUND' ? 'verificacoes-proprias.mjs não encontrado ao lado do varrer.mjs' : e.message.split('\n')[0]
      faltaram.push({ ferramenta: 'verificações próprias', motivo: `não rodaram: ${limpar(motivo)}`, obrigatoria: false })
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  // filtro do projeto e ordem
  const regs = ignorar.map(globParaRegex)
  achados = achados
    .filter((a) => !(a.arquivo && regs.some((r) => r.test(a.arquivo))))
    .sort((a, b) => (ORDEM[a.gravidade] ?? 9) - (ORDEM[b.gravidade] ?? 9) || String(a.arquivo).localeCompare(String(b.arquivo)))

  // Última barreira: nada de texto de ferramenta chega ao terminal ou aos relatórios sem passar pela limpeza.
  for (const f of faltaram) f.motivo = limpar(f.motivo, Infinity)
  // Nos achados (todas as ferramentas, inclusive as verificações próprias) limpa a explicação E a correção.
  for (const a of achados) for (const campo of ['explicacao', 'correcao']) if (a[campo] != null) a[campo] = limpar(a[campo], Infinity, { prosa: true })

  const graves = achados.filter((a) => GRAVES.has(a.gravidade)).length
  const faltouObrigatoria = faltaram.some((f) => f.obrigatoria)
  // Achado grave tem prioridade sobre ferramenta faltando; as duas coisas saem no relatório.
  const codigo = graves ? 1 : faltouObrigatoria ? 2 : 0
  return { pasta, codigo, achados, graves, rodaram, faltaram }
}

// ---------- relatório ----------
const ROTULO = { critico: 'CRÍTICO', alto: 'ALTO', medio: 'MÉDIO', baixo: 'BAIXO' }

export function relatorioMd(res) {
  const l = ['# Relatório de segurança', '', `Pasta: \`${res.pasta}\``, '']
  l.push(res.codigo === 0 ? 'Resultado: **limpo**.' : res.codigo === 1 ? `Resultado: **${res.graves} achado(s) alto(s) ou crítico(s)**: corrigir antes de enviar.` : 'Resultado: **varredura incompleta**: faltou ferramenta obrigatória (veja abaixo).', '')
  l.push(`Rodaram: ${res.rodaram.length ? res.rodaram.join(', ') : 'nenhuma'}.`, '')
  if (res.faltaram.length) {
    l.push('## O que não rodou', '')
    for (const f of res.faltaram) l.push(`- ${f.obrigatoria ? '**obrigatória** · ' : ''}${f.ferramenta}: ${f.motivo}${f.comoInstalar ? `. Como instalar: ${f.comoInstalar}` : ''}`)
    l.push('')
  }
  l.push(`## Achados (${res.achados.length})`, '')
  if (!res.achados.length) l.push('Nenhum.')
  for (const a of res.achados) {
    const onde = a.arquivo ? `\`${a.arquivo}${a.linha ? `:${a.linha}` : ''}\`` : 'projeto'
    l.push(`- **${ROTULO[a.gravidade] || a.gravidade}** · ${onde} · ${a.explicacao} Como corrigir: ${a.correcao} _(${a.ferramenta})_`)
  }
  return l.join('\n') + '\n'
}

function pastaSaidaPadrao(pasta) {
  const g = spawnSync('git', ['-C', pasta, 'rev-parse', '--git-dir'], { encoding: 'utf8', windowsHide: true })
  if (g.status === 0 && g.stdout.trim()) return path.join(path.resolve(pasta, g.stdout.trim()), 'devconductor', 'varredura')
  return path.join(os.tmpdir(), 'devconductor-varredura')
}

export function gravar(res, saida) {
  fs.mkdirSync(saida, { recursive: true })
  const md = path.join(saida, 'relatorio-seguranca.md')
  fs.writeFileSync(md, relatorioMd(res))
  fs.writeFileSync(path.join(saida, 'relatorio-seguranca.json'), JSON.stringify({ codigo: res.codigo, rodaram: res.rodaram, faltaram: res.faltaram, achados: res.achados }, null, 2) + '\n')
  return md
}

async function principal(argv) {
  let pasta = null
  let saida = null
  const opc = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--historico') opc.historico = true
    else if (a === '--sem-rede') opc.semRede = true
    else if (a === '--saida') saida = argv[++i]
    else if (a === '-h' || a === '--help') { console.log('Uso: node varrer.mjs [pasta] [--historico] [--sem-rede] [--saida <pasta>]'); return 0 }
    else if (a.startsWith('--')) { console.error(`Opção desconhecida: ${a}`); return 2 }
    else pasta = a
  }
  pasta = path.resolve(pasta || '.')
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) { console.error(`Pasta não encontrada: ${pasta}`); return 2 }
  const res = await varrer(pasta, opc)
  const md = gravar(res, path.resolve(saida || pastaSaidaPadrao(pasta)))
  const cont = (g) => res.achados.filter((a) => a.gravidade === g).length
  console.log(`Varredura: ${res.achados.length} achado(s): ${cont('critico')} crítico, ${cont('alto')} alto, ${cont('medio')} médio, ${cont('baixo')} baixo.`)
  console.log(`Rodaram: ${res.rodaram.join(', ') || 'nenhuma'}.`)
  for (const f of res.faltaram) console.log(`${f.obrigatoria ? 'FALTOU' : 'Aviso'}: ${f.ferramenta} (${f.motivo})${f.comoInstalar ? `. Como instalar: ${f.comoInstalar}` : ''}`)
  console.log(`Relatório: ${md}`)
  return res.codigo
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c }, (e) => { console.error(`Erro na varredura: ${e.message}`); process.exitCode = 2 })
}
