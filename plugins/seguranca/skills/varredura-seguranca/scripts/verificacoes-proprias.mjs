// Verificacoes proprias do kit: regras simples em Node, sem dependencia, chamadas pelo varrer.mjs.
// export verificar(pasta, { ignorar, limites }) -> achados[] { tipo, categoria, gravidade, arquivo, linha, explicacao, correcao }
//   (o varrer.mjs acrescenta ferramenta: 'verificacoes-proprias'). A lista traz .avisos (propriedade nao enumeravel)
//   com "leitura cortada: ..." quando estoura o limite de arquivos, de bytes ou o prazo: nunca corta calado.
// export verificarTudo(pasta, opcoes) -> { achados, avisos }
// Cada regra e uma funcao. Nunca devolve o valor de um segredo: so arquivo, linha e tipo.
// Regras rodam sobre o texto "ativo" (linhas de comentario apagadas): protecao comentada nao conta como protecao.
// Regex sem repeticao aninhada e com trechos limitados: o tempo cresce em linha reta com o tamanho do arquivo.
//
// Limites conhecidos (heuristica; nao substitui Semgrep nem revisao):
// - SQL montado em dois passos (variavel) ou em texto C# de varias linhas nao e visto.
// - Nome de arquivo enviado guardado em variavel antes de gravar (FileName em 2 passos) nao e visto.
// - Rotas em MapGroup ou em variavel que nao se chama "app" nao entram na regra de permissao; limite de
//   tentativas posto num MapGroup do mesmo arquivo vale para as rotas do arquivo.
// - Login em Python (Flask/FastAPI) e NestJS nao entra na regra de limite de tentativas.
// - Limitador de requisicoes no Node (o que a regra NAO garante):
//   - E aceito pelo NOME (limiter, rateLimit, throttle, slowDown, brute, limitador) sem conferir o que a funcao faz.
//     Variavel de outro nome so vale quando e declarada no mesmo arquivo a partir de uma fabrica ou de um modulo de
//     limite (const protecao = rateLimit({...})); limitador de nome neutro que vem pronto de outro arquivo e acusado.
//   - Configuracao: so "skip" que devolve sempre true, escrito no proprio arquivo, e visto. max enorme, janela
//     minuscula, skip que da true por conta, store que nao guarda: nao sao avaliados.
//   - Mesmo objeto = mesmo nome com a mesma declaracao (const/let/var ou parametro), achada contando chaves. Regex
//     literal com aspa ou chave solta atrapalha a contagem (vira "Conferir"); parametro com parenteses dentro
//     (a = f()) ou de funcao sem chaves e objeto guardado em propriedade (this.app, servidor.app) nao sao
//     diferenciados pelo dono.
//   - use() do limitador dentro de outro bloco (funcao, if, try, metodo de classe) ou com condicao na mesma linha ou
//     na linha de cima vira "Conferir" (gravidade baixa), mesmo quando a funcao e chamada antes da rota.
//   - Nao sao vistos (a rota e acusada): use encadeado (app.use(a).use(limiter)), app.all('*', limiter), limitador
//     aplicado por funcao auxiliar (proteger(app)), use() com mais de 600 caracteres ate o limitador.
//   - Montagem em outro arquivo: so use() com import/require de caminho relativo, ate 6 niveis. Roteador montado por
//     register/route, import() dinamico, apelido de caminho (@/rotas), funcao que devolve o roteador
//     (require('./x')(app)) e exportacao que nao seja "module.exports = X", "export default X" ou o mesmo nome: acusa.
//   - Aceito por engano: limitador so no GET de uma rota encadeada (.route('/login').get(limiter, a).post(b)).
// - BadRequest(ex.Message) nao e acusado (mensagem de validacao costuma ser de proposito); so Problem/StatusCode.
// - Pagina de erro de desenvolvimento num "else" de "if (!IsDevelopment())" e acusada por engano.
// - Comentario no fim da linha de codigo (// ...) e bloco /* */ no meio do codigo continuam sendo lidos.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { globParaRegex } from './varrer.mjs'

const PULAR = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', '.venv', 'venv', '.next', 'coverage', '.devconductor'])
const EXTENSOES = new Set(['.cs', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.sql', '.json'])
const MAX_BYTES = 1024 * 1024
// Teto da verificacao inteira; passar disso gera aviso "leitura cortada" (opcoes.limites troca os valores).
export const LIMITES = { arquivos: 20000, bytes: 100 * 1024 * 1024, prazoMs: 60000 }

const ext = (arq) => path.extname(arq.nome).toLowerCase()
const ehCs = (a) => ext(a) === '.cs'
const ehJs = (a) => ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext(a))
const ehPy = (a) => ext(a) === '.py'
const ehSql = (a) => ext(a) === '.sql'
const ehAppsettings = (a) => /^appsettings(\..+)?\.json$/i.test(a.nome)
const ehCodigo = (a) => ehCs(a) || ehJs(a) || ehPy(a)

// ---------- leitura ----------
function listar(pasta, regs, lim, prazo, avisos) {
  const arquivos = []
  let bytes = 0
  let grandes = 0
  let cortou = null
  const andar = (dir) => {
    let itens = []
    try { itens = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    itens.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (const it of itens) {
      if (cortou) return
      const abs = path.join(dir, it.name)
      const rel = path.relative(pasta, abs).split(path.sep).join('/')
      if (regs.some((r) => r.test(rel))) continue
      if (it.isDirectory()) { if (!PULAR.has(it.name)) andar(abs); continue }
      const e = path.extname(it.name).toLowerCase()
      // .json: so appsettings interessa (package-lock e afins nao sao lidos nem contam no limite).
      if (!it.isFile() || !EXTENSOES.has(e) || /\.min\.js$/i.test(it.name) || (e === '.json' && !ehAppsettings({ nome: it.name }))) continue
      if (Date.now() > prazo) { cortou = `prazo de ${Math.round(lim.prazoMs / 1000)} s estourou ainda na leitura`; return }
      if (arquivos.length >= lim.arquivos) { cortou = `o projeto tem mais de ${lim.arquivos} arquivos de código`; return }
      let tam = 0
      try { tam = fs.statSync(abs).size } catch { continue }
      if (tam > MAX_BYTES) { grandes++; continue }
      if (bytes + tam > lim.bytes) { cortou = `o código passa de ${Math.max(1, Math.round(lim.bytes / 1048576))} MB`; return }
      try { arquivos.push({ rel, abs, nome: it.name, texto: fs.readFileSync(abs, 'utf8') }); bytes += tam } catch { /* ilegivel: pula */ }
    }
  }
  andar(pasta)
  if (cortou) avisos.push(`leitura cortada: ${cortou}; só os ${arquivos.length} primeiros arquivos foram conferidos`)
  if (grandes) avisos.push(`leitura cortada: ${grandes} arquivo(s) com mais de 1 MB não foram lidos`)
  return arquivos
}

const inicioDeLinhas = (texto) => {
  const l = [0]
  for (let i = 0; i < texto.length; i++) if (texto.charCodeAt(i) === 10) l.push(i + 1)
  return l
}
const linhasDe = (arq) => (arq.linhas ||= inicioDeLinhas(arq.texto))
function linhaDe(arq, indice) {
  const l = linhasDe(arq)
  let a = 0, b = l.length - 1
  while (a < b) { const m = (a + b + 1) >> 1; if (l[m] <= indice) a = m; else b = m - 1 }
  return a + 1
}

// SQL: apaga comentarios (-- ate o fim da linha e /* */), respeitando texto entre aspas simples; mesmo tamanho.
function sqlAtivo(t) {
  const out = []
  const n = t.length
  let pos = 0, i = 0
  while (i < n) {
    const c = t.charCodeAt(i)
    if (c === 39) { const f = t.indexOf("'", i + 1); i = f < 0 ? n : f + 1 } else if (c === 45 && t.charCodeAt(i + 1) === 45) {
      let f = t.indexOf('\n', i); if (f < 0) f = n
      out.push(t.slice(pos, i), ' '.repeat(f - i)); pos = i = f
    } else if (c === 47 && t.charCodeAt(i + 1) === 42) {
      let f = t.indexOf('*/', i + 2); f = f < 0 ? n : f + 2
      out.push(t.slice(pos, i), t.slice(i, f).replace(/[^\n]/g, ' ')); pos = i = f
    } else i++
  }
  out.push(t.slice(pos))
  return out.join('')
}
const COMENTARIO_C = /^\s*(?:\/\/|\/\*|\*(?:\s|\/|$))/
const COMENTARIO_PY = /^\s*#/
// Texto com as linhas de comentario trocadas por espacos (mesmos indices do original).
function A(arq) {
  if (arq.ativo !== undefined) return arq.ativo
  const t = arq.texto
  if (ehSql(arq)) return (arq.ativo = sqlAtivo(t))
  const re = ehPy(arq) ? COMENTARIO_PY : COMENTARIO_C
  const l = linhasDe(arq)
  const partes = []
  for (let i = 0; i < l.length; i++) {
    const linha = t.slice(l[i], i + 1 < l.length ? l[i + 1] : t.length)
    if (!re.test(linha)) { partes.push(linha); continue }
    const nl = linha.endsWith('\n')
    partes.push(' '.repeat(linha.length - (nl ? 1 : 0)) + (nl ? '\n' : ''))
  }
  return (arq.ativo = partes.join(''))
}

function* casar(re, texto) {
  re.lastIndex = 0
  let m
  while ((m = re.exec(texto))) { yield m; if (m[0] === '') re.lastIndex++ }
}

// Monta o achado; a explicacao nunca recebe o valor encontrado.
const achado = (arq, indice, campos) => ({ tipo: 'codigo', ...campos, arquivo: arq.rel, linha: linhaDe(arq, indice) })
const nomeCurto = (n) => String(n).replace(/[^\w.:-]/g, '').slice(0, 60)

// Nome em palavras minusculas: "JWT_KEY" -> jwt, key · "CacheKeyPrefix" -> cache, key, prefix.
const palavras = (nome) => String(nome).slice(0, 200).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
const TERMO_SEGREDO = new Set(['secret', 'key', 'token', 'senha', 'password', 'passwd', 'pwd', 'jwt', 'segredo', 'chave', 'apikey'])
const TERMO_FORTE = new Set(['password', 'passwd', 'pwd', 'senha', 'secret', 'segredo'])
const ANTES_DE_CHAVE = new Set(['jwt', 'api', 'secret', 'signing', 'private', 'encryption', 'access', 'auth', 'master', 'client', 'bearer', 'session', 'refresh', 'hmac', 'sign', 'service', 'webhook'])
const FIM_NEUTRO = new Set(['prefix', 'suffix', 'dir', 'directory', 'path', 'file', 'filename', 'name', 'nome', 'header', 'url', 'uri', 'endpoint',
  'host', 'length', 'size', 'ttl', 'expiration', 'expires', 'expiry', 'expire', 'timeout', 'lifetime', 'lifespan', 'minutes', 'seconds', 'hours',
  'days', 'in', 'issuer', 'audience', 'algorithm', 'alg', 'type', 'tipo', 'id', 'field', 'param', 'policy', 'vault', 'location', 'store',
  'provider', 'enabled', 'required', 'format', 'scheme', 'rounds', 'count', 'limit', 'version'])
// Nome que guarda segredo: tem palavra de segredo e nao termina em qualificador (CACHE_KEY_PREFIX, KeysDirectory, JwtIssuer).
export function nomeDeSegredo(nome) {
  const p = palavras(nome)
  if (!p.length || p.includes('public') || p.includes('publica') || FIM_NEUTRO.has(p.at(-1))) return false
  return p.some((x) => TERMO_SEGREDO.has(x))
}
// Nome que e segredo mesmo com valor curto: termina em Password/Secret, ou e Key/Token sozinho ou de Jwt/Api/...
const nomeForte = (nome) => {
  const p = palavras(nome)
  const u = p.at(-1)
  return TERMO_FORTE.has(u) || (['key', 'token', 'chave', 'apikey'].includes(u) && (p.length === 1 || u === 'apikey' || ANTES_DE_CHAVE.has(p.at(-2))))
}

// ---------- regras ----------
const SQL = {
  categoria: 'injecao-sql',
  gravidade: 'alto',
  explicacao: 'Consulta SQL montada juntando texto com valor de fora: quem manda o valor pode mudar a consulta e ler ou apagar dados.',
  correcao: 'Passar os valores como parâmetro (@nome, $1, FromSqlInterpolated ou ? / %s do driver), nunca colar no texto.',
}
export function regraSqlMontado(arq) {
  const t = A(arq)
  const pats = []
  if (ehCs(arq)) {
    pats.push(/\b(?:FromSqlRaw|ExecuteSqlRaw|ExecuteSqlRawAsync|SqlQueryRaw)\s*(?:<[\w.]+>)?\(\s*(?:\$@?"[^"\n]*\{[^{]|@\$"[^"\n]*\{[^{]|"[^"\n]*"\s*\+)/g)
    pats.push(/\bnew\s+(?:Npgsql|Sql)Command\(\s*(?:\$@?"[^"\n]*\{[^{]|@\$"[^"\n]*\{[^{]|"[^"\n]*"\s*\+)/g)
  }
  if (ehJs(arq)) pats.push(/\.query\(\s*`[^`]*\$\{/g, /\.query\(\s*(?:"[^"\n]*"|'[^'\n]*')\s*\+/g)
  if (ehPy(arq)) pats.push(/\bexecute(?:many)?\(\s*["'][^"'\n]*["']\s*%/g)
  const out = []
  for (const re of pats) for (const m of casar(re, t)) out.push(achado(arq, m.index, SQL))
  // Python f"...": so acusa se houver {valor} dentro do texto (f"SELECT 1" nao junta nada).
  if (ehPy(arq)) {
    for (const m of casar(/\bexecute(?:many)?\(\s*(?:[fF][rR]?|[rR][fF])("""|'''|"|')/g, t)) {
      const ini = m.index + m[0].length
      const pedaco = t.slice(ini, ini + 4000)
      let fim = pedaco.indexOf(m[1])
      if (m[1].length === 1) { const nl = pedaco.indexOf('\n'); if (nl >= 0 && (fim < 0 || nl < fim)) fim = nl }
      if (/\{/.test((fim < 0 ? pedaco : pedaco.slice(0, fim)).replace(/\{\{|\}\}/g, ''))) out.push(achado(arq, m.index, SQL))
    }
  }
  return out
}

const normalizarTabela = (t) => t.replace(/"/g, '').split('.').pop().toLowerCase().slice(0, 60)
const RLS_LIGA = /\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)\s+enable\s+row\s+level\s+security/gi
const RLS_DESLIGA = /\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)\s+disable\s+row\s+level\s+security/gi
export function regraBancoAberto(arq, ctx) {
  if (!ehSql(arq)) return []
  const out = []
  const sem = A(arq)
  for (const m of casar(/\bcreate\s+policy\b/gi, sem)) {
    const pedaco = sem.slice(m.index, m.index + 2000)
    const fim = pedaco.indexOf(';')
    if (/\b(?:using|with\s+check)\s*\(\s*true\s*\)/i.test(fim < 0 ? pedaco : pedaco.slice(0, fim))) {
      out.push(achado(arq, m.index, {
        categoria: 'regra-do-banco-aberta', gravidade: 'alto',
        explicacao: 'Regra de acesso do banco (policy) com "true": qualquer usuário lê ou grava todas as linhas da tabela.',
        correcao: 'Trocar o true pela condição de dono (ex.: usuario_id = auth.uid()) ou por papel; tabela pública só com decisão escrita.',
      }))
    }
  }
  for (const m of casar(RLS_DESLIGA, sem)) {
    const nome = normalizarTabela(m[1])
    out.push(achado(arq, m.index, {
      categoria: 'regra-do-banco-aberta', gravidade: 'alto',
      explicacao: `Proteção por linha (row level security) desligada na tabela ${nome}: as regras de dono deixam de valer e a tabela fica aberta.`,
      correcao: `Tirar o "disable row level security" de ${nome}; se a tabela for pública de propósito, registrar a decisão por escrito.`,
    }))
  }
  if (ctx.usaRls) {
    for (const m of casar(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi, sem)) {
      const nome = normalizarTabela(m[1])
      if (!ctx.rlsLigado.has(nome)) {
        out.push(achado(arq, m.index, {
          categoria: 'regra-do-banco-aberta', gravidade: 'alto',
          explicacao: `Tabela ${nome} criada sem "enable row level security" em nenhum arquivo .sql do projeto: com acesso direto ao banco (Supabase), ela fica aberta.`,
          correcao: `Acrescentar "alter table ${nome} enable row level security;" e as regras de dono.`,
        }))
      }
    }
  }
  return out
}

const SEGREDO_CONFIG = {
  tipo: 'segredo', categoria: 'segredo-no-codigo', gravidade: 'alto',
  correcao: 'Tirar do arquivo versionado, trocar a senha/chave no serviço (a antiga já vazou) e ler de variável de ambiente, user-secrets ou cofre.',
}
// Valor que nao e segredo: variavel a preencher, endereco, verdadeiro/falso ou texto de "troque aqui".
const ehMarcador = (v) => /^\s*(?:\$\{|#\{|\{\{|%|<|\*+$)/.test(v) || /:\/\//.test(v) || /^\s*(?:true|false|null|none)?\s*$/i.test(v) ||
  /^\s*(?:change[-_ ]?me|your[-_ ]|sua[-_ ]|seu[-_ ]|coloque|preencha|todo\b|xxx+|placeholder)/i.test(v)
export function regraSegredoConfig(arq) {
  if (!ehAppsettings(arq)) return []
  const t = A(arq)
  const out = []
  const linhasVistas = new Set()
  for (const m of casar(/\b(?:Password|Pwd)\s*=\s*([^;"\s]+)/gi, t)) {
    if (ehMarcador(m[1])) continue
    const a = achado(arq, m.index, { ...SEGREDO_CONFIG, explicacao: 'Senha do banco escrita na string de conexão de um arquivo de configuração versionado.' })
    linhasVistas.add(a.linha); out.push(a)
  }
  for (const m of casar(/"([\w.:-]*)"\s*:\s*"([^"\n]+)"/g, t)) {
    if (!nomeDeSegredo(m[1]) || ehMarcador(m[2]) || (m[2].length < 16 && !nomeForte(m[1]))) continue
    const a = achado(arq, m.index, { ...SEGREDO_CONFIG, explicacao: `Chave "${nomeCurto(m[1])}" com valor escrito em arquivo de configuração versionado (parece segredo).` })
    if (!linhasVistas.has(a.linha)) { linhasVistas.add(a.linha); out.push(a) }
  }
  return out
}

export function regraEnvVersionado(pasta) {
  const r = spawnSync('git', ['-C', pasta, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 20000, windowsHide: true })
  if (r.status !== 0 || !r.stdout) return []
  return r.stdout.split('\0').filter((f) => {
    const nome = f.split('/').pop()
    return /^\.env(\..+)?$/i.test(nome) && !/\.(example|sample|template|dist|exemplo|modelo)$/i.test(nome)
  }).map((f) => ({
    ...SEGREDO_CONFIG, arquivo: f, linha: null,
    explicacao: 'Arquivo .env está no Git: quem tiver o repositório lê os segredos dele.',
    correcao: 'git rm --cached no arquivo, colocar ".env" no .gitignore, trocar os segredos que estavam nele e versionar só um .env.example sem valores.',
  }))
}

// Ler o tamanho ou a extensao nao e validar: so conta quando o valor e COMPARADO com alguma coisa.
const COMPARA = /[!=]=|\bis\b|\bswitch\b|\.Equals\s*\(|\.Contains\s*\(|\.EndsWith\s*\(|\.StartsWith\s*\(|\.Any\s*\(/
const comparaNumero = (corpo, alvo) => new RegExp(`${alvo}\\s*[<>]|(?<![=-])[<>]=?\\s*${alvo}\\b`).test(corpo) // (?<![=-]): "=>" não é comparação
function validaTamanho(corpo, antes, nome) {
  if (/\bRequestSizeLimit\s*\(|\bMultipartBodyLengthLimit\b/.test(antes + corpo)) return true
  if (comparaNumero(corpo, `\\b${nome}\\.Length`)) return true
  const v = new RegExp(`\\b(\\w+)\\s*=\\s*${nome}\\.Length\\b`).exec(corpo)
  return !!v && comparaNumero(corpo, `\\b${v[1]}`)
}
function validaExtensao(corpo, nome) {
  const comandos = corpo.split(';')
  if (comandos.some((c) => new RegExp(`\\b${nome}\\.FileName\\b[^;]{0,80}\\.EndsWith\\s*\\(`).test(c))) return true
  const variaveis = []
  for (const c of comandos) {
    if (!/\bGetExtension\s*\(/.test(c)) continue
    if (COMPARA.test(c)) return true
    const v = /\b(\w+)\s*=[^=]/.exec(c)
    if (v) variaveis.push(v[1])
  }
  return variaveis.some((v) => comandos.some((c) => !/\bGetExtension\s*\(/.test(c) && new RegExp(`\\b${v}\\b`).test(c) && COMPARA.test(c)))
}
export function regraEnvioSemValidacao(arq) {
  if (!ehCs(arq)) return []
  const t = A(arq)
  const out = []
  let vistos = 0
  for (const m of casar(/\bIFormFile\??\s+(\w+)/g, t)) {
    if (++vistos > 200) break // arquivo com centenas de parametros de envio nao e codigo real: para sem custo quadratico
    const nome = m[1]
    const abre = t.indexOf('{', m.index)
    if (abre < 0 || abre - m.index > 2000) continue
    let prof = 0, fim = abre
    for (; fim < t.length && fim - abre < 8000; fim++) {
      const c = t.charCodeAt(fim)
      if (c === 123) prof++
      else if (c === 125 && --prof === 0) break
    }
    const corpo = t.slice(m.index, fim + 1)
    const sumidouro = new RegExp(`\\b(?:Path\\.Combine|File\\.(?:Create|OpenWrite|WriteAllBytes|WriteAllBytesAsync)|new\\s+FileStream)\\([^;]*\\b${nome}\\.FileName`, 'g')
    const s = sumidouro.exec(corpo)
    if (!s) continue
    const temExtensao = validaExtensao(corpo, nome)
    const temTamanho = validaTamanho(corpo, t.slice(Math.max(0, m.index - 400), m.index), nome)
    if (temExtensao && temTamanho) continue
    const falta = [!temExtensao && 'extensão', !temTamanho && 'tamanho'].filter(Boolean).join(' e ')
    out.push(achado(arq, m.index + s.index, {
      categoria: 'envio-de-arquivo-sem-validacao', gravidade: 'alto',
      explicacao: `Arquivo enviado pelo usuário é gravado em disco com o nome que ele mandou, sem checar ${falta}: dá para gravar fora da pasta, sobrescrever arquivo ou subir programa.`,
      correcao: 'Gerar o nome no servidor (Guid + extensão de uma lista permitida), comparar o tamanho com um máximo e guardar fora da pasta pública.',
    }))
  }
  return out
}

// Troca o texto de cada string pelo que estiver dentro de {…} (placeholders e interpolação):
// "Token expirado" some; "{Senha}" e `${token}` ficam.
const soVariaveis = (trecho) => trecho.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\\n]|\\.)*`/g, (s) => ' ' + (s.match(/\{[^{}\n]*\}/g) || []).join(' ') + ' ')
const CHAMADA_LOG = /(?:\.Log(?:Trace|Debug|Information|Warning|Error|Critical)?|\b_?[Ll]ogger\.\w+|\bLog\.(?:Verbose|Debug|Information|Warning|Error|Fatal)|\blogging\.(?:debug|info|warning|error|critical|exception)|\blog\.(?:debug|info|warn|warning|error|fatal)|\bConsole\.Write(?:Line)?|\bconsole\.(?:log|error|warn|info|debug|trace)|(?<![\w.])print)\s*\(/g
const DADO_SENSIVEL = /cpf|senha|password|token|jwt|secret|segredo/i
// Nome que fala DO dado sem ser o dado: tokenExpired, senhaValida, tokens.length, hasToken.
const SOBRE_O_DADO = new Set(['expired', 'expirado', 'expirada', 'expires', 'expiry', 'expiration', 'valid', 'valido', 'valida', 'invalid', 'invalido',
  'invalida', 'length', 'len', 'count', 'size', 'total', 'qtd', 'type', 'tipo', 'id', 'exists', 'existe', 'enabled', 'present', 'missing', 'url',
  'uri', 'endpoint', 'name', 'nome', 'header', 'field', 'campo', 'ttl', 'age', 'status', 'error', 'erro'])
const PREFIXO_SOBRE = new Set(['is', 'has', 'tem', 'sem', 'no', 'num', 'qtd', 'count'])
// "Tokens" de medida (outputTokens, total_tokens, maxTokens): contagem de uso de modelo, nao credencial.
const MEDIDA = new Set(['input', 'output', 'prompt', 'completion', 'max', 'min', 'total', 'cache', 'cached', 'read', 'creation', 'usage',
  'used', 'remaining', 'budget', 'estimated', 'thinking', 'reasoning', 'context'])
const CADEIA = /[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*(\s*\()?/g
function temDadoSensivel(args) {
  const livre = soVariaveis(args)
  if (!DADO_SENSIVEL.test(livre) || /mask|mascar|hash|redact|ocult|anonim/i.test(livre)) return false
  for (const m of casar(CADEIA, livre)) {
    const partes = m[0].replace(/\s*\($/, '').split(/\??\./)
    if (m[1] && partes.length > 1) partes.pop() // token.Trim(): o ultimo nome e o metodo, o dado e quem vem antes
    const ultimo = partes.at(-1)
    if (!ultimo || !DADO_SENSIVEL.test(ultimo)) continue
    const p = palavras(ultimo)
    if (p.at(-1) === 'tokens' && p.some((x) => MEDIDA.has(x))) continue
    if (!SOBRE_O_DADO.has(p.at(-1)) && !(p.length > 1 && PREFIXO_SOBRE.has(p[0]))) return true
  }
  return false
}
// Argumentos de uma chamada, do "(" ate o ")" que fecha (pode passar de uma linha); no maximo 1.500 caracteres.
function argumentos(t, abre) {
  const lim = Math.min(t.length, abre + 1500)
  let prof = 0
  for (let i = abre; i < lim; i++) {
    const c = t.charCodeAt(i)
    if (c === 40) prof++
    else if (c === 41 && --prof === 0) return t.slice(abre + 1, i)
  }
  return t.slice(abre + 1, lim)
}
export function regraDadoNoLog(arq) {
  if (!ehCodigo(arq)) return []
  const t = A(arq)
  const out = []
  let ultima = 0
  for (const m of casar(CHAMADA_LOG, t)) {
    if (!temDadoSensivel(argumentos(t, m.index + m[0].length - 1))) continue
    const a = achado(arq, m.index, {
      categoria: 'dado-pessoal-em-log', gravidade: 'medio',
      explicacao: 'Senha, token, CPF ou segredo vai para o log ou para o console: quem lê o log (ou o navegador) vê o dado (LGPD).',
      correcao: 'Tirar o dado da mensagem; se precisar identificar, registrar só o id do usuário.',
    })
    if (a.linha !== ultima) { ultima = a.linha; out.push(a) }
  }
  return out
}

const NEGADO = /!\s*[\w.]{0,80}IsDevelopment\s*\(|IsDevelopment\s*\(\s*\)\s*(?:==\s*false|is\s+false)/
// A chamada esta dentro de um bloco "if (...IsDevelopment()) { ... }" (olha ate 3.000 caracteres para tras)
// ou logo depois de um if sem chaves.
function soEmDesenvolvimento(arq, t, idx) {
  const antes = t.slice(Math.max(0, idx - 300), idx)
  const semChaves = /IsDevelopment\s*\(\s*\)[^;{}]*$/.exec(antes)
  if (semChaves) return !NEGADO.test(antes.slice(Math.max(0, semChaves.index - 80)))
  const min = Math.max(0, idx - 3000)
  let prof = 0
  for (let k = idx - 1; k >= min; k--) {
    const c = t.charCodeAt(k)
    if (c === 125) prof++
    else if (c === 123) {
      if (prof > 0) { prof--; continue }
      const cab = t.slice(Math.max(0, k - 200), k)
      const cond = cab.slice(Math.max(cab.lastIndexOf(';'), cab.lastIndexOf('}'), cab.lastIndexOf('{')) + 1)
      if (/IsDevelopment\s*\(/.test(cond)) return !NEGADO.test(cond)
    }
  }
  return false
}
const VAR_ERRO = '\\b(?:ex|exc|exception|excecao|erro|err|e)\\.'
const ERRO_INTEIRO = new RegExp(`${VAR_ERRO}(?:ToString\\s*\\(\\s*\\)|StackTrace)`)
const ERRO_MENSAGEM = new RegExp(`${VAR_ERRO}(?:Message|InnerException)\\b`)
export function regraErroDetalhado(arq) {
  if (!ehCs(arq)) return []
  const t = A(arq)
  const out = []
  for (const m of casar(/\bUseDeveloperExceptionPage\s*\(/g, t)) {
    if (soEmDesenvolvimento(arq, t, m.index)) continue
    out.push(achado(arq, m.index, {
      categoria: 'erro-detalhado', gravidade: 'medio',
      explicacao: 'Página de erro de desenvolvimento ligada fora de "if (app.Environment.IsDevelopment())": em produção mostra código e detalhes internos.',
      correcao: 'Colocar dentro do if IsDevelopment() e usar UseExceptionHandler com mensagem genérica no resto.',
    }))
  }
  const l = linhasDe(arq)
  for (let i = 0; i < l.length; i++) {
    const linha = t.slice(l[i], i + 1 < l.length ? l[i + 1] : t.length)
    const inteiro = /\b(?:Results\.|return\b)/.test(linha) && ERRO_INTEIRO.test(linha)
    const mensagem = !inteiro && /\b(?:Problem|StatusCode)\s*\(/.test(linha) && ERRO_MENSAGEM.test(linha)
    if (!inteiro && !mensagem) continue
    out.push(achado(arq, l[i], {
      categoria: 'erro-detalhado', gravidade: 'medio',
      explicacao: inteiro
        ? 'Detalhe interno do erro (ToString/StackTrace) devolvido ao usuário: mostra caminhos, consultas e versões.'
        : 'Conferir: mensagem interna do erro (ex.Message) devolvida ao usuário numa resposta de falha: pode mostrar consulta, caminho ou nome de tabela.',
      correcao: 'Registrar o erro no log do servidor e devolver só uma mensagem genérica.',
    }))
  }
  return out
}

export function regraSegredoPadrao(arq) {
  const pats = []
  if (ehCs(arq)) {
    pats.push(/\b(?:GetEnvironmentVariable|GetValue(?:<string>)?)\(\s*"([^"\n]+)"\s*\)\s*\?\?\s*"([^"\n]+)"/g)
    pats.push(/\bGetValue(?:<string>)?\(\s*"([^"\n]+)"\s*,\s*"([^"\n]+)"\s*\)/g)
    pats.push(/[Cc]onfig(?:uration)?\[\s*"([^"\n]+)"\s*\]\s*\?\?\s*"([^"\n]+)"/g)
  }
  if (ehJs(arq)) {
    pats.push(/\bprocess\.env\.(\w+)\s*(?:\|\||\?\?)\s*(?:'([^'\n]+)'|"([^"\n]+)"|`([^`\n]+)`)/g)
    pats.push(/\bprocess\.env\[\s*['"](\w+)['"]\s*\]\s*(?:\|\||\?\?)\s*(?:'([^'\n]+)'|"([^"\n]+)"|`([^`\n]+)`)/g)
  }
  if (ehPy(arq)) pats.push(/\b(?:os\.environ\.get|os\.getenv|getenv)\(\s*['"](\w+)['"]\s*,\s*(?:'([^'\n]+)'|"([^"\n]+)")/g)
  const t = A(arq)
  const out = []
  for (const re of pats) {
    for (const m of casar(re, t)) {
      if (!nomeDeSegredo(m[1])) continue
      out.push(achado(arq, m.index, {
        tipo: 'segredo', categoria: 'segredo-no-codigo', gravidade: 'alto',
        explicacao: `Segredo "${nomeCurto(m[1])}" tem valor padrão escrito no código: se a variável faltar, o sistema roda com uma chave que está no repositório.`,
        correcao: 'Tirar o valor padrão e falhar ao iniciar quando a variável não existir (ex.: ?? throw).',
      }))
    }
  }
  return out
}

const nomeDeSessao = (n) => palavras(n).some((p) => ['token', 'jwt', 'auth', 'bearer', 'accesstoken', 'authtoken', 'idtoken', 'refreshtoken'].includes(p))
export function regraTokenNoNavegador(arq) {
  const t = A(arq)
  const out = []
  const campos = {
    categoria: 'token-exposto-ao-script', gravidade: 'medio',
    explicacao: 'Token de acesso guardado onde o JavaScript da página alcança (localStorage, sessionStorage ou cookie sem HttpOnly): um XSS rouba a sessão.',
    correcao: 'Guardar em cookie HttpOnly + Secure + SameSite (com proteção contra CSRF) ou só em memória.',
  }
  if (ehJs(arq)) {
    for (const m of casar(/\b(?:localStorage|sessionStorage)\.setItem\(\s*(?:['"`]([^'"`\n]*)|([A-Za-z_$][\w$.]*))/g, t)) if (nomeDeSessao(m[1] ?? m[2])) out.push(achado(arq, m.index, campos))
    for (const m of casar(/\b(?:localStorage|sessionStorage)(?:\.([A-Za-z_$][\w$]*)|\[\s*['"`]([^'"`\n]*)['"`]\s*\])\s*=(?!=)/g, t)) if (nomeDeSessao(m[1] ?? m[2])) out.push(achado(arq, m.index, campos))
    for (const m of casar(/\bdocument\.cookie\s*=([^;\n]*)/g, t)) if (/token|jwt|auth(?!or)/i.test(m[1])) out.push(achado(arq, m.index, campos))
  }
  if (ehCs(arq)) for (const m of casar(/\bHttpOnly\s*=\s*false\b/g, t)) out.push(achado(arq, m.index, campos))
  return out
}

// Login: so rota que RECEBE a senha (POST/PUT). GET /login e a pagina; chamada de cliente HTTP nao e rota.
const ROTA_NET = /\b(Map(?:Post|Put)|Http(?:Post|Put)|Route)\s*\(\s*"([^"\n]{0,200})/g
const ROTA_JS = /\b([\w$]+)\s*\.\s*(?:post|put|route)\s*\(\s*['"`]([^'"`\n]{0,200})/g
const CAMINHO_LOGIN = /\b(?:log-?in|sign-?in|entrar|authenticate|autenticar)\b|\b(?:o?auth|connect)\/token\b/i
const ACAO_LOGIN = /\b(?:Login|SignIn)(?:Async)?\s*\(/g
const CLIENTE_HTTP = /^(?:axios|https?|fetch\w*|request|superagent|got|ky|\$http|\$|instance)$|(?:client|cliente|api|service|servico|http|axios)$/i
const PROX_ROTA = /\bMap(?:Get|Post|Put|Delete|Patch|Group)\s*\(/g
const ateProximaRota = (t, ini) => { PROX_ROTA.lastIndex = ini + 4; const p = PROX_ROTA.exec(t); return t.slice(ini, Math.min(p ? p.index : t.length, ini + 6000)) }
const LIMITE_NO_ARQUIVO = /\[\s*EnableRateLimiting\b|\bMapGroup\s*\([^;]{0,400}\.RequireRateLimiting\s*\(/
// ---------- Node: limitador de requisicoes ligado a rota de login ----------
// Toda resposta daqui tem tres saidas: vale ({ ok: true }), duvida (existe limitador por perto, mas nao deu para liga-lo
// a rota com seguranca: vira "Conferir" de gravidade baixa, com o motivo) ou nao (rota acusada; motivo quando houver).
const SIM = { ok: true }
const NAO = { ok: false, duvida: false, motivo: null }
const nao = (motivo) => ({ ok: false, duvida: false, motivo })
const duvida = (motivo) => ({ ok: false, duvida: true, motivo })
// Caminhos alternativos (basta um valer): vale > duvida > nao; fica o primeiro motivo de cada tipo.
function melhor(...rs) {
  let d = null, q = null
  for (const r of rs) { if (r.ok) return SIM; if (r.duvida) d ||= r; else if (r.motivo) q ||= r }
  return d || q || NAO
}
// Nome que diz "limitador de requisicoes" x nome que so tem "limit" (bodyLimit, uploadLimits: limite de tamanho).
const NOME_FORTE = /rate[-_]?limit|limiter|limitador|throttl|slow[-_]?down|brute/i
const NOME_FRACO = /limit/i
const NOME_TAMANHO = /upload|size|body|file|json|payload|length|tamanho|byte|field|page|limits$/i
// Configuracao que desliga o limitador: skip que devolve sempre true.
const PULA_SEMPRE = /\bskip\s*:\s*(?:true\b|(?:async\s*)?(?:\([^)\n]{0,60}\)|[\w$]+)\s*=>\s*(?:true\b|\{\s*return\s+true\b)|(?:async\s+)?function\b[^(\n]{0,40}\([^)\n]{0,60}\)\s*\{\s*return\s+true\b)|\bskip\s*\([^)\n]{0,60}\)\s*\{\s*return\s+true\b/
const nomeRe = (n) => n.replace(/\$/g, '\\$')

// Blocos do arquivo contados pelas chaves, pulando texto entre aspas, crase (com ${ }) e comentario. Uma passada.
// incerto = chaves que nao fecham direito (regex literal com aspa ou chave solta, arquivo cortado): ai nada e garantido.
function blocosJs(arq) {
  if (arq.blocos) return arq.blocos
  const t = A(arq), n = t.length
  const pai = [-1], ini = [0], fim = [n], marcos = [0], dono = [0]
  const tpl = [] // chaves abertas dentro de cada ${ } de um texto com crase
  let atual = 0, incerto = false
  const abrir = (i) => { pai.push(atual); ini.push(i); fim.push(n); atual = pai.length - 1; marcos.push(i); dono.push(atual) }
  const fechar = (i) => {
    if (atual === 0) { incerto = true; return }
    fim[atual] = i; atual = pai[atual]; marcos.push(i + 1); dono.push(atual)
  }
  // Anda dentro do texto com crase; devolve onde o codigo recomeca (depois da crase ou de "${").
  const crase = (i) => {
    for (; i < n; i++) {
      const d = t.charCodeAt(i)
      if (d === 92) i++
      else if (d === 96) return i + 1
      else if (d === 36 && t.charCodeAt(i + 1) === 123) { tpl.push(0); return i + 2 }
    }
    incerto = true
    return n
  }
  let i = 0
  while (i < n) {
    const c = t.charCodeAt(i)
    if (c === 92) i += 2
    else if (c === 34 || c === 39) {
      let j = i + 1
      for (; j < n; j++) { const d = t.charCodeAt(j); if (d === 92) j++; else if (d === c || d === 10) break }
      i = j + 1
    } else if (c === 96) i = crase(i + 1)
    else if (c === 47 && t.charCodeAt(i + 1) === 47) { const f = t.indexOf('\n', i); i = f < 0 ? n : f } else if (c === 47 && t.charCodeAt(i + 1) === 42) { const f = t.indexOf('*/', i + 2); i = f < 0 ? n : f + 2 } else if (c === 123) { if (tpl.length) tpl[tpl.length - 1]++; abrir(i); i++ } else if (c === 125) {
      if (tpl.length && tpl[tpl.length - 1] === 0) { tpl.pop(); i = crase(i + 1) } else { if (tpl.length) tpl[tpl.length - 1]--; fechar(i); i++ }
    } else i++
  }
  if (atual !== 0 || tpl.length) incerto = true
  return (arq.blocos = { pai, ini, fim, marcos, dono, incerto })
}
function blocoDe(b, i) {
  let a = 0, z = b.marcos.length - 1
  while (a < z) { const m = (a + z + 1) >> 1; if (b.marcos[m] <= i) a = m; else z = m - 1 }
  return b.dono[a]
}
// Onde cada nome e declarado (const/let/var e parametro de funcao) e onde comeca o valor inicial dele. Uma passada.
const PALAVRA_DE_BLOCO = /(?:^|[^\w$])(?:if|while|for|switch|with)\s*$/
function declaracoesJs(arq) {
  if (arq.decl) return arq.decl
  const t = A(arq), b = blocosJs(arq)
  const onde = new Map() // nome -> blocos em que e declarado
  const valor = new Map() // nome -> posicoes do valor inicial (depois do "=")
  const funcoes = new Map() // nome -> blocos em que e declarado como function ou class
  const vezes = new Map() // "nome\nbloco" -> quantas vezes o nome e declarado naquele bloco
  const por = (nome, bloco) => {
    if (!onde.has(nome)) onde.set(nome, new Set())
    onde.get(nome).add(bloco)
    const k = `${nome}\n${bloco}`
    vezes.set(k, (vezes.get(k) || 0) + 1)
  }
  // O tipo escrito depois do nome (const limiter: RequestHandler = ...) nao esconde o valor inicial.
  for (const m of casar(/\b(?:const|let|var)\s+(?:([\w$]+)((?:\s*:\s*[\w$.<>[\]| ]{1,60}?)?\s*=(?!=)\s*)?|[{[]([^=;\n]{0,200}))/g, t)) {
    const bl = blocoDe(b, m.index)
    if (!m[1]) { for (const x of m[3].match(/[\w$]+/g) || []) por(x, bl); continue }
    por(m[1], bl)
    if (!m[2]) continue
    if (!valor.has(m[1])) valor.set(m[1], [])
    valor.get(m[1]).push(m.index + m[0].length)
  }
  // Parametros: (a, b) {  |  (a, b) => {  |  (a: T): R {  |  a => {   (if/while/for/switch nao declaram nada)
  for (const m of casar(/\(([^()]{0,300})\)\s*(?::\s*[\w$.<>[\]| ]{1,60})?\s*(?:=>\s*)?\{/g, t)) {
    if (PALAVRA_DE_BLOCO.test(t.slice(Math.max(0, m.index - 12), m.index))) continue
    const bl = blocoDe(b, m.index + m[0].length - 1)
    for (const x of m[1].match(/[\w$]+/g) || []) por(x, bl)
  }
  for (const m of casar(/(?<![\w$.])([\w$]+)\s*=>\s*\{/g, t)) por(m[1], blocoDe(b, m.index + m[0].length - 1))
  // function nome( e class Nome: o nome vale no bloco em que aparece (e esconde import ou variavel de fora).
  for (const m of casar(/(?<![\w$.])(?:function\s*\*?\s*|class\s+)([\w$]+)\s*[(<{]|(?<![\w$.])class\s+([\w$]+)\s+extends\b/g, t)) {
    const bl = blocoDe(b, m.index)
    por(m[1] || m[2], bl)
    if (!funcoes.has(m[1] || m[2])) funcoes.set(m[1] || m[2], new Set())
    funcoes.get(m[1] || m[2]).add(bl)
  }
  return (arq.decl = { onde, valor, funcoes, vezes })
}
// Bloco cuja declaracao o nome usa na posicao i: -1 = nao declarado no arquivo, -2 = aninhado demais para dizer.
function ligacao(arq, nome, i) {
  const blocos = declaracoesJs(arq).onde.get(nome)
  if (!blocos) return -1
  const b = blocosJs(arq)
  for (let x = blocoDe(b, i), k = 0; x >= 0; x = b.pai[x]) { if (blocos.has(x)) return x; if (++k > 200) return -2 }
  return -1
}
// De que modulo cada nome vem (import ... from / require). Uma passada.
const ORIGEM_JS = /\b(?:import\s+(?:([\w$]+)\s*,?\s*)?(?:\*\s*as\s+([\w$]+)\s*|\{([^}\n]{0,300})\}\s*)?from\s*|(?:const|let|var)\s+(?:([\w$]+)|\{([^}\n]{0,300})\})\s*=\s*require\s*\(\s*)['"`]([^'"`\n]{1,200})['"`]/g
function origensJs(arq) {
  if (arq.origens) return arq.origens
  const origens = new Map()
  for (const m of casar(ORIGEM_JS, A(arq))) {
    const nomes = [m[1], m[2], m[4]].filter(Boolean)
    for (const parte of (m[3] || m[5] || '').split(',')) { const x = parte.match(/[\w$]+/g); if (x) nomes.push(x[x.length - 1]) }
    for (const x of nomes) if (!origens.has(x)) { origens.set(x, m[6]); (arq.origemEm ||= new Map()).set(x, m.index) }
  }
  return (arq.origens = origens)
}
// Modulo de onde o nome vem NA POSICAO pos: o import/require so vale quando e ele que o nome usa ali. Variavel ou
// parametro de mesmo nome num bloco mais de dentro esconde o import ('' = nao vem de modulo, ou esta escondido).
function origemAqui(arq, nome, pos) {
  const de = origensJs(arq).get(nome)
  if (!de) return ''
  const alvo = ligacao(arq, nome, pos)
  if (alvo === -1) return de // so import: nenhuma declaracao por cima
  if (alvo < 0 || alvo !== ligacao(arq, nome, arq.origemEm.get(nome))) return ''
  // Declarado mais de uma vez no mesmo bloco (var repetido, com ou sem tipo) ou recebendo outro valor: ja nao da para
  // dizer que o nome ainda e o modulo.
  if (declaracoesJs(arq).vezes.get(`${nome}\n${alvo}`) > 1 || recebeOutroValor(arq, nome, alvo)) return ''
  return de
}
// Funcao que cria limitador: o nome diz (rateLimit, slowDown) ou veio de um modulo de limite (express-rate-limit).
const ehFabrica = (arq, nome, pos) => NOME_FORTE.test(nome) || NOME_FORTE.test(origemAqui(arq, nome.split('.')[0], pos))

// Argumentos de uma chamada, a partir do caractere depois do "(": corta nas virgulas de fora, respeita aspas e
// parenteses/colchetes/chaves de dentro e para no ")" que fecha, ou no teto (chamada comprida demais fica pela metade).
function separar(t, ini, teto = 600) {
  const args = []
  const lim = Math.min(t.length, ini + teto)
  let prof = 0, de = ini, i = ini
  for (; i < lim; i++) {
    const c = t.charCodeAt(i)
    if (c === 92) i++
    else if (c === 34 || c === 39 || c === 96) {
      for (i++; i < lim; i++) { const d = t.charCodeAt(i); if (d === 92) i++; else if (d === c || (d === 10 && c !== 96)) break }
    } else if (c === 40 || c === 91 || c === 123) prof++
    else if (c === 41 || c === 93 || c === 125) { if (prof === 0) break; prof-- } else if (c === 44 && prof === 0) { args.push({ texto: t.slice(de, i).trim(), indice: de }); de = i + 1 }
  }
  const fim = Math.min(i, lim)
  const ultimo = t.slice(de, fim).trim()
  if (ultimo) args.push({ texto: ultimo, indice: de })
  return { args, fim: Math.min(fim + 1, t.length) }
}

// O nome recebe outro valor fora da declaracao (limiter = outraCoisa, limiter &&= x, ||=, ??=, +=...), ligado a mesma
// declaracao (alvo)? Nao ve atribuicao por desestruturacao ([limiter] = lista).
function recebeOutroValor(arq, nome, alvo) {
  const memo = (arq.trocas ||= new Map())
  if (!memo.has(nome)) {
    if (memo.size >= 50) return true
    const t = A(arq)
    memo.set(nome, [...casar(new RegExp(`(?<![\\w$.])${nomeRe(nome)}\\s*(?:\\*\\*|&&|\\|\\||\\?\\?|<<|>>>?|[-+*/%&|^])?=(?![=>])`, 'g'), t)]
      .filter((m) => !/\b(?:const|let|var)\s+$/.test(t.slice(Math.max(0, m.index - 12), m.index))).map((m) => m.index))
  }
  const s = memo.get(nome)
  if (s.length > 20) return true
  return s.some((i) => ligacao(arq, nome, i) === alvo)
}
// A variavel usada na posicao pos foi declarada como limitador? So vale a declaracao que o nome usa ALI (mesmo
// escopo): limitador de mesmo nome dentro de outra funcao nao conta. 'sim' (veio de fabrica ou de modulo de limite),
// 'pula' (a configuracao pula sempre), 'incerto' (nao da para saber qual declaracao vale, ou o nome recebe outro
// valor depois) ou null (nao da para dizer pela declaracao).
function declaradoComo(arq, nome, pos) {
  const t = A(arq)
  let sim = NOME_FORTE.test(origemAqui(arq, nome, pos))
  const todas = (declaracoesJs(arq).valor.get(nome) || []).slice(0, 200)
  const b = blocosJs(arq)
  const alvo = ligacao(arq, nome, pos)
  if (alvo === -2) return todas.length ? 'incerto' : sim ? 'sim' : null
  // Veio de modulo de limite, mas o nome foi declarado de novo ou recebeu outro valor neste escopo: duvida.
  if (!sim && alvo >= 0 && NOME_FORTE.test(origensJs(arq).get(nome) || '') && alvo === ligacao(arq, nome, arq.origemEm.get(nome))) return 'incerto'
  const daqui = todas.filter((p) => blocoDe(b, p) === alvo)
  if (b.incerto && daqui.length !== todas.length) return 'incerto'
  let porDeclaracao = false, outras = 0
  for (const p of daqui.slice(0, 5)) {
    const cab = /^(?:await\s+)?(?:new\s+)?([\w$]+(?:\.[\w$]+)*)\s*\(/.exec(t.slice(p, p + 120))
    if (/^require\s*\(/.test(t.slice(p, p + 12))) continue
    if (!cab || !ehFabrica(arq, cab[1], p)) { outras++; continue }
    if (PULA_SEMPRE.test(t.slice(p, separar(t, p + cab[0].length, 1500).fim))) return 'pula'
    sim = porDeclaracao = true
  }
  // Vale tambem para o nome que veio de require: declarado duas vezes no mesmo escopo (var, ou var e function), uma
  // como limitador e outra nao, com mais declaracoes do que foi lido, ou recebendo outro valor depois.
  // Qualquer nome com mais de uma declaracao com valor no mesmo escopo fica em duvida: nao da para dizer qual vale.
  if (sim && (outras || daqui.length > 1 || (daqui.length && declaracoesJs(arq).funcoes.get(nome)?.has(alvo)))) return 'incerto'
  if (sim && alvo >= 0 && recebeOutroValor(arq, nome, alvo)) return 'incerto'
  return sim ? 'sim' : null
}
// Nome no comeco de um argumento; o "(" de chamada fica so espiado, para o primeiro argumento de dentro tambem ser lido.
const CABECA_DE_ARGUMENTO = /(?:^|[(,[])\s*((?:[\w$]+\s*\.\s*)*[\w$]+)(?=\s*(\()?)/g
const pulaSempre = (nome) => nao(`o limitador ${nomeCurto(nome)} está configurado para pular sempre (skip devolve true)`)
// Um argumento de use() ou de rota e limitador de requisicoes? pos = onde o argumento esta no arquivo: o mesmo nome
// em outro bloco pode ser outra variavel, por isso a resposta guardada vale por bloco.
function classificar(arq, bruto, pos) {
  const texto = bruto.trim().replace(/\s+as\s+[\w$.<>[\]]+$/, '').replace(/!$/, '')
  const memo = (arq.classes ||= new Map())
  const chave = `${blocoDe(blocosJs(arq), pos)}\n${texto}`
  if (memo.has(chave)) return memo.get(chave)
  const r = classificarSemMemo(arq, texto, pos)
  if (memo.size < 5000) memo.set(chave, r)
  return r
}
function classificarSemMemo(arq, texto, pos) {
  // Lista de middlewares: [helmet(), limiter]
  if (texto.startsWith('[')) return melhor(...separar(texto, 1).args.slice(0, 20).map((a) => classificar(arq, a.texto, pos)))
  const cab = /^(?:await\s+)?(?:new\s+)?((?:[\w$]+\s*\.\s*)*[\w$]+)\s*(\()?/.exec(texto)
  const dentroDeOutro = duvida('o limitador aparece dentro de outra expressão ou chamada, sem dar para saber se é aplicado')
  if (!cab) return NOME_FORTE.test(texto.slice(0, 300)) ? dentroDeOutro : NAO
  const nome = cab[1].replace(/\s+/g, '')
  if (cab[2]) {
    // Fabrica com nome forte, mas declarada mais de uma vez neste escopo: fica em duvida.
    if (ehFabrica(arq, nome, pos) && declaracoesJs(arq).vezes.get(`${nome}\n${ligacao(arq, nome, pos)}`) > 1) return duvida(`${nomeCurto(nome)} é declarado mais de uma vez neste escopo e recebe outro valor`)
    if (ehFabrica(arq, nome, pos)) return PULA_SEMPRE.test(texto) ? pulaSempre(nome) : SIM
    if (NOME_FRACO.test(nome) && !NOME_TAMANHO.test(nome)) return duvida(`não deu para confirmar que ${nomeCurto(nome)}() cria um limitador de requisições`)
    // Outra chamada que recebe o limitador: wrap(limiter)
    for (const m of casar(CABECA_DE_ARGUMENTO, texto.slice(cab[0].length, cab[0].length + 300))) {
      const de = m[1].replace(/\s+/g, '')
      if (m[2] ? ehFabrica(arq, de, pos) : classificar(arq, de, pos).ok) return dentroDeOutro
    }
    return NAO
  }
  if (texto.length !== cab[0].length) return NOME_FORTE.test(texto.slice(0, 300)) ? dentroDeOutro : NAO
  const declarado = declaradoComo(arq, nome.split('.')[0], pos)
  if (declarado === 'pula') return pulaSempre(nome)
  if (declarado === 'incerto') return duvida(`não deu para saber qual valor ${nomeCurto(nome)} tem aqui (blocos do arquivo difíceis de ler, ou o nome recebe outro valor depois de declarado)`)
  if (declarado === 'sim' || NOME_FORTE.test(nome)) return SIM
  if (!NOME_FRACO.test(nome)) return NAO
  return NOME_TAMANHO.test(nome)
    ? nao(`${nomeCurto(nome)} tem nome de limite de tamanho, não de limitador de requisições`)
    : duvida(`não deu para confirmar que ${nomeCurto(nome)} é um limitador de requisições`)
}

// X.use([caminho,] a, b, ...): o limitador pode estar em qualquer argumento. Acha ".use(" e olha 80 caracteres para
// tras para saber o objeto (this.app.use -> app); os argumentos sao lidos ate o ")" que fecha.
const USO_JS = /\.\s*use\s*\(/g
const DONO_DO_USO = /((?:[\w$]+\s*\??\.\s*)*)([\w$]+)\s*$/
const TEXTO_SIMPLES = /^(['"`])([^'"`\n$]{0,100})\1$/
const CAMINHO_INCERTO = '\0' // caminho que nao e um texto simples: lista, regex, texto montado
const SO_NOME = /^[\w$.]+$/
function usosJs(arq) {
  if (arq.usos) return arq.usos
  const t = A(arq)
  const lista = []
  const limites = new Map() // objeto -> caminho do use ('' = sem caminho) -> usos com limitador (ou quase), na ordem do arquivo
  arq.usos = { lista, limites }
  for (const m of casar(USO_JS, t)) {
    const de = Math.max(0, m.index - 80)
    const o = DONO_DO_USO.exec(t.slice(de, m.index))
    if (!o) continue
    const { args } = separar(t, m.index + m[0].length)
    let caminho = ''
    if (args.length) {
      const s = TEXTO_SIMPLES.exec(args[0].texto)
      if (s) { caminho = s[2]; args.shift() } else if (/^(?:\[\s*['"`]|[/`'"])/.test(args[0].texto)) { caminho = CAMINHO_INCERTO; args.shift() }
    }
    const u = { obj: o[2], objIni: de + o.index, indice: m.index, caminho, args }
    lista.push(u)
    let lim = null
    for (let k = 0; k < u.args.length && k < 20; k++) {
      let c = classificar(arq, u.args[k].texto, u.args[k].indice)
      if (c === NAO) continue
      // use(PREFIXO, limiter): o primeiro argumento pode ser um caminho guardado em variavel.
      if (c.ok && k > 0 && SO_NOME.test(u.args[0].texto)) c = duvida(`o use() do limitador começa por ${nomeCurto(u.args[0].texto)}, que pode ser um caminho guardado em variável`)
      lim = lim ? melhor(lim, c) : c
      if (lim.ok) break
    }
    if (!lim) continue
    u.limite = lim
    if (!limites.has(u.obj)) limites.set(u.obj, new Map())
    const porCaminho = limites.get(u.obj)
    if (!porCaminho.has(caminho)) porCaminho.set(caminho, [])
    porCaminho.get(caminho).push(u)
  }
  return arq.usos
}
// O use() so roda se uma condicao deixar? Olha o que vem antes dele na linha (if (x) / x && / x ? ...) e, se a linha
// comeca nele, o fim da linha de cima (if (x) / else / && / || / ? / : / =>).
function condicional(arq, u) {
  if (u.cond !== undefined) return u.cond
  const t = A(arq), l = linhasDe(arq)
  const n = linhaDe(arq, u.objIni) - 1
  let pre = t.slice(Math.max(l[n], u.objIni - 300), u.objIni)
  pre = pre.slice(Math.max(pre.lastIndexOf(';'), pre.lastIndexOf('{'), pre.lastIndexOf('}')) + 1).trim()
  if (pre) return (u.cond = pre !== 'await')
  for (let k = n - 1; k >= 0 && k >= n - 20; k--) {
    const acima = t.slice(Math.max(l[k], l[k + 1] - 300), l[k + 1]).trim()
    if (acima) return (u.cond = /^(?:\}\s*)?(?:else\s+)?(?:if|while|for)\b[^\n]*\)$|(?:\belse|&&|\|\||\?|:|=>)$/.test(acima))
  }
  return (u.cond = false)
}
// O objeto recebe outro valor (app = express() de novo) entre o use() e a rota?
function reatribuido(arq, obj, de, ate, alvo) {
  const memo = (arq.atribuicoes ||= new Map())
  if (!memo.has(obj)) {
    if (memo.size >= 50) return true
    memo.set(obj, [...casar(new RegExp(`(?<![\\w$.])${nomeRe(obj)}\\s*=(?![=>])`, 'g'), A(arq))].map((m) => m.index))
  }
  const s = memo.get(obj)
  let a = 0, z = s.length
  while (a < z) { const m = (a + z) >> 1; if (s[m] <= de) a = m + 1; else z = m }
  for (let k = a, n = 0; k < s.length && s[k] < ate; k++) if (++n > 20 || ligacao(arq, obj, s[k]) === alvo) return true
  return false
}
// Este use() com limitador vale para o que esta na posicao `indice` (rota ou montagem), no objeto `obj`?
function valeAqui(arq, u, obj, indice, alvo) {
  const lim = u.limite
  if (!lim.ok && !lim.duvida) return lim
  const dele = ligacao(arq, obj, u.objIni)
  if (dele === -2 || alvo === -2) return duvida('os blocos do arquivo são aninhados demais para saber de qual objeto é o limitador')
  if (dele !== alvo) return nao(`o limitador está em outro objeto chamado ${nomeCurto(obj)}, declarado em outro escopo`)
  const b = blocosJs(arq)
  if (b.incerto) return duvida('não deu para ler os blocos (chaves) do arquivo')
  const bu = blocoDe(b, u.objIni)
  if (indice < b.ini[bu] || indice > b.fim[bu]) return duvida('o use() do limitador fica dentro de outro bloco (função, if ou try), que pode não rodar antes da rota')
  if (condicional(arq, u)) return duvida('o use() do limitador depende de uma condição')
  if (reatribuido(arq, obj, u.indice, indice, alvo)) return duvida(`${nomeCurto(obj)} recebe outro valor entre o limitador e a rota`)
  if (u.caminho === CAMINHO_INCERTO) return duvida('o caminho do use() do limitador não é um texto simples')
  return lim
}
// O limitador so vale para a rota quando foi aplicado no MESMO objeto (mesma declaracao: app de outro escopo e outro app),
// no mesmo arquivo, ANTES dela (ordem do Express), num bloco que envolve a rota, sem condicao e sem caminho ou com caminho
// que cobre o dela. Consulta por objeto e por prefixo da rota e confere no maximo 40 use() por rota: arquivo cheio nao pesa.
function limitadoAntes(arq, obj, indice, rota) {
  const porCaminho = usosJs(arq).limites.get(obj)
  if (!porCaminho) return NAO
  const chaves = new Set(['', '/', rota, CAMINHO_INCERTO])
  for (let k = 1; k < rota.length; k++) if (rota[k] === '/') { chaves.add(rota.slice(0, k)); chaves.add(rota.slice(0, k + 1)) }
  const alvo = ligacao(arq, obj, indice)
  let r = NAO, vistos = 0
  for (const c of chaves) {
    const lista = porCaminho.get(c)
    if (!lista) continue
    // Do use() mais perto da rota para tras: e o que mais provavelmente vale para ela.
    let a = 0, z = lista.length
    while (a < z) { const m = (a + z) >> 1; if (lista[m].indice < indice) a = m + 1; else z = m }
    for (let k = a - 1; k >= 0; k--) {
      if (++vistos > 40) return melhor(r, duvida('há use() demais neste arquivo para conferir um a um'))
      const v = valeAqui(arq, lista[k], obj, indice, alvo)
      if (v.ok) return SIM
      r = melhor(r, v)
    }
  }
  return r
}
// Roteador montado em OUTRO arquivo: G importa o arquivo da rota (const N = require / import, ou require direto dentro
// do use) e, no mesmo objeto, aplica o limitador antes de montar, ou na propria montagem: Y.use('/auth', limitador, N).
// Sobe mais de um nivel (app monta routes/index, que monta routes/auth) juntando os caminhos. So vale quando o que G
// importa e o objeto da rota (exportacao padrao dele ou o mesmo nome) e TODAS as montagens achadas estao protegidas.
const IMPORTA_JS = /\b(?:const|let|var|import)\s+(?:([\w$]+)|\{([^}\n]{0,200})\})\s*(?:=\s*require\s*\(\s*|from\s+)['"`](\.{1,2}\/[^'"`\n]{0,200})['"`]/g
const REQUIRE_NO_USO = /\brequire\s*\(\s*['"`](\.{1,2}\/[^'"`\n]{0,200})['"`]\s*\)(?:\s*\.\s*([\w$]+))?/
const EXT_JS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
const SO_SEM_CAMINHO = '/\0' // rota que nenhum caminho de use() cobre: so limitador sem caminho vale
function montagensJs(arquivos) {
  const js = arquivos.filter(ehJs)
  const porRel = new Map(js.map((a) => [a.rel, a]))
  const achar = (base) => {
    const sem = base.replace(/\.(?:js|mjs|cjs)$/, '')
    for (const c of [base, ...EXT_JS.map((e) => base + e), ...EXT_JS.map((e) => sem + e), ...EXT_JS.map((e) => `${base}/index${e}`)]) if (porRel.has(c)) return c
    return null
  }
  const alvoDe = (g, espec) => { const alvo = achar(path.posix.join(path.posix.dirname(g.rel), espec)); return alvo && alvo !== g.rel ? alvo : null }
  // So e montado quando aparece a primeira rota de login sem limitador no proprio arquivo.
  let indice = null
  const indexar = () => {
    const importadores = new Map() // arquivo importado -> [{ quem, exportado (null = exportacao padrao), local }]
    const diretas = new Map() // arquivo importado -> [{ quem, u, k, exportado }]: use(..., require('./x'))
    const por = (mapa, alvo, item) => { if (!mapa.has(alvo)) mapa.set(alvo, []); mapa.get(alvo).push(item) }
    for (const g of js) {
      for (const m of casar(IMPORTA_JS, A(g))) {
        const alvo = alvoDe(g, m[3])
        if (!alvo) continue
        const nomes = m[1] ? [[null, m[1]]] : m[2].split(',').map((x) => x.trim().split(/\s*(?:\sas\s|:)\s*/)).map((p) => [p[0], p[1] ?? p[0]])
        for (const [exportado, local] of nomes) if (/^[\w$]+$/.test(local) && (exportado === null || /^[\w$]+$/.test(exportado))) por(importadores, alvo, { quem: g, exportado, local })
      }
      if (!/\brequire\s*\(/.test(A(g))) continue
      for (const u of usosJs(g).lista) {
        u.args.forEach((a, k) => {
          const r = REQUIRE_NO_USO.exec(a.texto)
          const alvo = r && alvoDe(g, r[1])
          if (alvo) por(diretas, alvo, { quem: g, u, k, exportado: r[2] && r[2] !== 'default' ? r[2] : null })
        })
      }
    }
    return { importadores, diretas }
  }
  // Onde o objeto `obj` do arquivo e montado. null = sem ligacao (nao e importado, nunca e montado ou passou de um teto:
  // 50 importadores por arquivo, 20 objetos por arquivo, 2000 use por importador, 200 montagens): a rota e acusada.
  const memoMontagens = new Map()
  const montagensDe = (arq, obj) => {
    const chave = `${arq.rel}\n${obj}`
    if (memoMontagens.has(chave)) return memoMontagens.get(chave)
    const { importadores, diretas } = (indice ||= indexar())
    const lista = importadores.get(arq.rel) || [], dir = diretas.get(arq.rel) || []
    const total = lista.length + dir.length
    if (!total) return null
    arq.objetosLigados = (arq.objetosLigados || 0) + 1
    let r = null
    if (total <= 50 && arq.objetosLigados <= 20) {
      const ehPadrao = new RegExp(`\\b(?:module\\.exports\\s*=|export\\s+default)\\s*${nomeRe(obj)}(?![\\w$])(?!\\s*[.(\\[])`).test(A(arq))
      const traz = (exportado) => (exportado === null ? ehPadrao : exportado === obj) // esse import traz o objeto da rota?
      r = []
      for (const { quem, exportado, local } of lista) {
        if (!traz(exportado)) continue
        const usos = usosJs(quem).lista
        if (usos.length > 2000) { r = null; break }
        const citado = new RegExp(`(?<![\\w$.])${nomeRe(local)}(?![\\w$])`)
        for (const u of usos) { const k = u.args.findIndex((a) => citado.test(a.texto)); if (k >= 0) r.push({ quem, u, k }) }
      }
      if (r) for (const d of dir) if (traz(d.exportado)) r.push(d)
      if (r && (!r.length || r.length > 200)) r = null
    }
    memoMontagens.set(chave, r)
    return r
  }
  const memo = new Map()
  const emCurso = new Set()
  const montado = (arq, obj, rota, nivel = 0) => {
    const montagens = nivel <= 6 ? montagensDe(arq, obj) : null
    if (!montagens) return NAO
    const chave = `${arq.rel}\n${obj}\n${rota}`
    if (memo.has(chave)) return memo.get(chave)
    if (emCurso.has(chave) || memo.size > 5000) return NAO
    emCurso.add(chave)
    let r = SIM
    for (const { quem, u, k } of montagens) {
      const naMontagem = melhor(...u.args.slice(0, k).map((a) => classificar(quem, a.texto, a.indice)))
      let m = naMontagem
      if (!m.ok) {
        // Montagem com caminho que nao e texto (lista, variavel): so limitador sem caminho garante.
        const semPrefixo = rota === SO_SEM_CAMINHO || u.caminho === CAMINHO_INCERTO || (u.caminho === '' && k > 0 && SO_NOME.test(u.args[0].texto))
        const cheia = semPrefixo ? SO_SEM_CAMINHO : u.caminho.replace(/\/+$/, '') + rota
        m = melhor(naMontagem, limitadoAntes(quem, u.obj, u.indice, cheia), montado(quem, u.obj, cheia, nivel + 1))
      }
      if (m.ok) continue
      if (!m.duvida) { r = nao(m.motivo || `o roteador é montado em ${quem.rel.slice(-80)} sem limitador antes`); break }
      if (r.ok) r = m
    }
    emCurso.delete(chave)
    memo.set(chave, r)
    return r
  }
  return montado
}
// Limitador passado na propria rota: app.post('/login', limiter, h), [limiter, validar] ou .route('/x').post(limiter, h).
// Limitador dentro de outra chamada (wrap(limiter)) fica em duvida.
function limiteNaRota(arq, cab, pos) {
  const fim = cab.search(/=>|\bfunction\b|\{/)
  const txt = argumentosDaRota(fim < 0 ? cab : cab.slice(0, fim))
  let r = NAO, prof = 0, de = 0
  for (const m of casar(CABECA_DE_ARGUMENTO, txt)) {
    for (; de < m.index; de++) { const c = txt.charCodeAt(de); if (c === 40) prof++; else if (c === 41) prof-- }
    const nome = m[1].replace(/\s+/g, '')
    let c = NAO
    if (!m[2]) c = classificar(arq, nome, pos)
    else if (ehFabrica(arq, nome, pos)) c = PULA_SEMPRE.test(cab.slice(m.index, m.index + 300)) ? pulaSempre(nome) : SIM
    else if (NOME_FRACO.test(nome) && !NOME_TAMANHO.test(nome)) c = duvida(`não deu para confirmar que ${nomeCurto(nome)}() cria um limitador de requisições`)
    // prof = parenteses abertos ate aqui (o da propria rota nao entra; .get(...).post(...) volta a zero): acima de zero,
    // o nome esta dentro de outra chamada.
    if (c.ok && prof + (txt[m.index] === '(' ? 1 : 0) > 0) c = duvida('o limitador aparece dentro de outra expressão ou chamada, sem dar para saber se é aplicado')
    if (c.ok) return SIM
    r = melhor(r, c)
  }
  return r
}
// Argumentos da rota: vai ate fechar o parentese da chamada e segue so por chamada encadeada (.route('/x').post(...)).
// Sem isso, a palavra "limiter" na linha de baixo (outra chamada) passava por limitador desta rota.
function argumentosDaRota(cab) {
  let prof = 1
  for (let i = 0; i < cab.length; i++) {
    if (cab[i] === '(') prof++
    else if (cab[i] === ')' && --prof === 0 && !/^\s*\./.test(cab.slice(i + 1, i + 40))) return cab.slice(0, i)
  }
  return cab
}
// Limite de tentativas so conta quando esta APLICADO na rota (ou e global): ter o pacote ou o AddRateLimiter nao basta.
function loginProtegidoNet(trecho, limiteNoArquivo, ctx) {
  if (/\[\s*Authorize\b|\.RequireAuthorization\s*\(/.test(trecho) && !/AllowAnonymous/.test(trecho)) return true // exige login antes: nao e a porta de entrada
  if (/\.DisableRateLimiting\s*\(|\[\s*DisableRateLimiting\b/.test(trecho)) return false
  return /\.RequireRateLimiting\s*\(|\[\s*EnableRateLimiting\b/.test(trecho) || limiteNoArquivo || ctx.limiteGlobalNet
}
export function regraEntradaSemLimite(arq, ctx) {
  const t = A(arq)
  const out = []
  const vistos = new Set()
  // r = resposta da conferencia do Node: duvida vira "Conferir" de gravidade baixa; nos dois casos o motivo vai junto.
  const login = (indice, r) => {
    const a = achado(arq, indice, {
      categoria: 'entrada-sem-limite', gravidade: r?.duvida ? 'baixo' : 'medio',
      explicacao: r?.duvida
        ? `Conferir: rota de login com limitador por perto, mas não deu para ligá-lo a ela com segurança (${r.motivo}). Se ele não valer para esta rota, dá para testar senhas sem parar.`
        : `Conferir: rota de login sem limite de tentativas aplicado nela (ter o limitador instalado ou configurado não basta): dá para testar senhas sem parar.${r?.motivo ? ` Motivo: ${r.motivo}.` : ''}`,
      correcao: 'Aplicar o limite na rota: RequireRateLimiting ou [EnableRateLimiting] no .NET (com AddRateLimiter e UseRateLimiter); no Node, passar o limitador do express-rate-limit na rota ou em use() do mesmo app ou roteador, antes da rota.',
    })
    if (!vistos.has(a.linha)) { vistos.add(a.linha); out.push(a) }
  }
  if (ehCs(arq)) {
    for (const m of casar(/\[\s*DisableRequestSizeLimit\b/g, t)) {
      out.push(achado(arq, m.index, {
        categoria: 'entrada-sem-limite', gravidade: 'medio',
        explicacao: 'Conferir: [DisableRequestSizeLimit] tira o limite de tamanho do corpo; um envio enorme derruba ou lota o servidor.',
        correcao: 'Usar [RequestSizeLimit(n)] com o tamanho máximo esperado.',
      }))
    }
    const limiteNoArquivo = LIMITE_NO_ARQUIVO.test(t)
    for (const m of casar(ROTA_NET, t)) {
      if (!CAMINHO_LOGIN.test(m[2])) continue
      const trecho = m[1].startsWith('Map') ? ateProximaRota(t, m.index) : t.slice(Math.max(0, m.index - 400), m.index + 300)
      if (!loginProtegidoNet(trecho, limiteNoArquivo, ctx)) login(m.index)
    }
    const l = linhasDe(arq)
    for (const m of casar(ACAO_LOGIN, t)) {
      // Declaracao de acao: "public ... Login(" na mesma linha, sem chamada nem atribuicao antes (olha so 200 caracteres).
      const antes = t.slice(Math.max(l[linhaDe(arq, m.index) - 1], m.index - 200), m.index)
      if (!/\bpublic\b/.test(antes) || /[;(=]/.test(antes)) continue
      if (!loginProtegidoNet(t.slice(Math.max(0, m.index - 400), m.index), limiteNoArquivo, ctx)) login(m.index)
    }
  }
  if (ehJs(arq)) {
    for (const m of casar(ROTA_JS, t)) {
      if (!CAMINHO_LOGIN.test(m[2]) || CLIENTE_HTTP.test(m[1]) || /\bawait\s+$/.test(t.slice(Math.max(0, m.index - 12), m.index))) continue
      const naRota = limiteNaRota(arq, t.slice(m.index + m[0].length, m.index + m[0].length + 300), m.index)
      if (naRota.ok) continue
      // use(limitador) so protege ESTA rota no mesmo objeto (antes dela) ou no arquivo que monta este roteador.
      const rota = m[2].startsWith('/') ? m[2] : `/${m[2]}`
      const noArquivo = limitadoAntes(arq, m[1], m.index, rota)
      if (noArquivo.ok) continue
      const r = melhor(naRota, noArquivo, ctx.montadoComLimiteJs ? ctx.montadoComLimiteJs(arq, m[1], rota) : NAO)
      if (!r.ok) login(m.index, r)
    }
  }
  return out
}

const ROTA_PUBLICA = /log-?in|sign-?(?:in|up)|entrar|regist|cadastr|webhook|health|saude|token|refresh|esqueci|forgot|reset|contato|contact/i
export function regraEndpointSemPermissao(arq, ctx) {
  if (!ehCs(arq) || ctx.temPoliticaPadrao) return []
  const t = A(arq)
  const out = []
  const campos = {
    categoria: 'sem-autorizacao', gravidade: 'medio',
    correcao: 'Acrescentar RequireAuthorization (ou [Authorize]) com o papel certo; se for público de propósito, marcar com AllowAnonymous.',
  }
  const inicios = [...casar(/\bapp\.Map(?:Get|Post|Put|Delete|Patch)\s*\(/g, t)].map((m) => m.index)
  const trechos = inicios.map((ini, i) => t.slice(ini, inicios[i + 1] ?? t.length))
  const protegido = (x) => /\.RequireAuthorization\s*\(|\[\s*Authorize\b/.test(x)
  const publico = (x) => /\.AllowAnonymous\s*\(|\[\s*AllowAnonymous\b/.test(x)
  if (trechos.some(protegido)) {
    trechos.forEach((x, i) => {
      if (!protegido(x) && !publico(x)) out.push(achado(arq, inicios[i], { ...campos, explicacao: 'Conferir: rota sem RequireAuthorization num arquivo em que as outras exigem login: qualquer um chama.' }))
    })
  } else if (ctx.usaAutorizacao) {
    // Nenhuma rota do arquivo tem permissao, mas o projeto usa autorizacao: rota que grava ou apaga merece conferencia.
    trechos.forEach((x, i) => {
      const cam = /^app\.Map(?:Post|Put|Delete|Patch)\s*\(\s*"([^"\n]{0,200})/.exec(x)
      if (!cam || publico(x) || ROTA_PUBLICA.test(cam[1])) return
      out.push(achado(arq, inicios[i], { ...campos, explicacao: 'Conferir: rota que grava ou apaga sem RequireAuthorization num projeto que usa autorização: se a proteção não vier de um grupo, qualquer um chama.' }))
    })
  }
  const classe = /\bclass\s+\w+\s*:\s*(?:ControllerBase|Controller)\b/.exec(t)
  if (classe && !/\[\s*(?:Authorize|AllowAnonymous)\b/.test(t)) {
    const vizinhos = ctx.controllersPorPasta.get(path.posix.dirname(arq.rel)) || []
    if (vizinhos.some((v) => v !== arq.rel && ctx.controllersComAuthorize.has(v))) {
      out.push(achado(arq, classe.index, { ...campos, explicacao: 'Conferir: controller sem [Authorize] numa pasta em que os outros controllers têm.' }))
    }
  }
  return out
}

const REGRAS = [regraSqlMontado, regraBancoAberto, regraSegredoConfig, regraEnvioSemValidacao, regraDadoNoLog,
  regraErroDetalhado, regraSegredoPadrao, regraTokenNoNavegador, regraEntradaSemLimite, regraEndpointSemPermissao]

// Fatos do projeto inteiro que algumas regras precisam (sempre do texto ativo: comentario nao e fato).
export function contexto(pasta, arquivos) {
  const sqls = arquivos.filter(ehSql)
  const rlsLigado = new Set() // projeto inteiro: a tabela pode ser criada numa pasta e protegida em outra
  for (const a of sqls) for (const m of casar(RLS_LIGA, A(a))) rlsLigado.add(normalizarTabela(m[1]))
  const cs = arquivos.filter(ehCs)
  const controllersPorPasta = new Map()
  const controllersComAuthorize = new Set()
  for (const a of cs) {
    if (!/\bclass\s+\w+\s*:\s*(?:ControllerBase|Controller)\b/.test(A(a))) continue
    const dir = path.posix.dirname(a.rel)
    if (!controllersPorPasta.has(dir)) controllersPorPasta.set(dir, [])
    controllersPorPasta.get(dir).push(a.rel)
    if (/\[\s*Authorize\b/.test(A(a))) controllersComAuthorize.add(a.rel)
  }
  const algumCs = (re) => cs.some((a) => re.test(A(a)))
  return {
    usaRls: fs.existsSync(path.join(pasta, 'supabase')) || sqls.some((a) => /\bauth\.uid\s*\(\s*\)/i.test(A(a))),
    rlsLigado,
    controllersPorPasta,
    controllersComAuthorize,
    limiteGlobalNet: algumCs(/\bGlobalLimiter\s*=/) && algumCs(/\bUseRateLimiter\s*\(/),
    // Nao existe "limitador global" de Node valendo para o projeto: a regra confere objeto e arquivo de cada rota.
    montadoComLimiteJs: montagensJs(arquivos),
    // "FallbackPolicy = null" desliga a politica padrao: nao conta como protecao.
    temPoliticaPadrao: algumCs(/\bFallbackPolicy\s*=\s*(?!null\b)[\w(]|\bSetFallbackPolicy\s*\(\s*(?!null\b)\w/),
    usaAutorizacao: algumCs(/\.RequireAuthorization\s*\(|\[\s*Authorize\b|\bAddAuthorization(?:Builder)?\s*\(|\bUseAuthorization\s*\(/),
  }
}

export function verificarTudo(pasta, { ignorar = [], limites = {} } = {}) {
  const lim = { ...LIMITES, ...limites }
  const prazo = Date.now() + lim.prazoMs
  const raiz = path.resolve(pasta)
  const regs = ignorar.map(globParaRegex)
  const avisos = []
  const arquivos = listar(raiz, regs, lim, prazo, avisos)
  const ctx = contexto(raiz, arquivos)
  const achados = []
  let feitos = 0
  for (const arq of arquivos) {
    if (Date.now() > prazo) {
      avisos.push(`leitura cortada: prazo de ${Math.round(lim.prazoMs / 1000)} s estourou; ${feitos} de ${arquivos.length} arquivos conferidos`)
      break
    }
    for (const regra of REGRAS) achados.push(...regra(arq, ctx))
    feitos++
  }
  achados.push(...regraEnvVersionado(raiz).filter((a) => !regs.some((r) => r.test(a.arquivo))))
  return { achados: achados.filter(Boolean), avisos }
}

export function verificar(pasta, opcoes) {
  const { achados, avisos } = verificarTudo(pasta, opcoes)
  Object.defineProperty(achados, 'avisos', { value: avisos, enumerable: false })
  return achados
}
