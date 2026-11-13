// Portão de segurança (PreToolUse, ferramentas Bash e PowerShell). Antes de "git commit" ou "git push", pergunta ao
// detector (mudanca-sensivel.mjs) se o que VAI entrar toca área sensível. Nível 0: segue em silêncio. Nível 1 ou 2:
// só segue se houver revisão registrada para ESTE conteúdo (.git/devconductor/revisao-seguranca.json, mesmo sha256
// e achadosAbertos 0); senão nega com o que foi achado e o que fazer.
//
// Desenho: o portão NÃO tenta entender toda forma de comando. Ele
//   1. lê o comando como o shell (aspas coladas como com''mit, barra invertida, crase do PowerShell, caminho e
//      extensão do executável como "C:\...\git.exe" ou git.cmd, maiúsculas, aspas tipográficas “ ” ‘ ’ — aspas de
//      verdade no PowerShell —, continuação de linha: \ + quebra no Bash, crase + LF ou CRLF no PowerShell) e
//      procura git + commit/push em qualquer
//      lugar: prefixo (timeout, env, xargs, sudo...), subshell ( ), $( ), crase, bash -c / sh -c / pwsh -Command,
//      texto passado a node -e, python -c etc., heredoc entregue a um shell, & no fim. Achou: é "de commit/envio";
//   2. só confere e pode liberar a FORMA SIMPLES: [cd/pushd/Set-Location/sl para pasta literal que existe] +
//      [git add/stage com opções conhecidas]* + git commit e/ou git push com opções conhecidas, ligados por &&, ; ou
//      quebra de linha, e nada mais na linha (as listas de opções estão abaixo, em ADD_*, COMMIT_* e PUSH_*). Junto
//      podem vir git status, git diff, git log e git show só com opções de leitura (LEITURA; --output, --ext-diff
//      e opção desconhecida negam);
//   3. nega o resto pedindo comando separado: outro comando (cp, echo >, script...), outro subcomando do Git
//      (stash, merge, reset, checkout...), opção desconhecida, git -c com qualquer chave que não seja a autoria,
//      --config-env, --git-dir/--work-tree, variável GIT_*,
//      || | &, redirecionamento para arquivo. git commit-tree e git update-ref são negados sempre (criam ou movem
//      commit sem passar pelo portão). --dry-run em commit ou push passa sem conferir (não altera nada).
//      Única exceção do -c, antes do subcomando: -c user.name=<valor> e -c user.email=<valor> (a autoria não muda o
//      conteúdo conferido, que segue sendo conferido igual). Chave sem diferenciar maiúsculas, como no Git; valor
//      escrito por extenso (sem $) e só com letras, números, espaço e . _ @ + - (ver RE_C_AUTORIA). Outra chave
//      (alias.*, core.*, push.*, remote.*, credential.*, include.*...), mesmo junto das duas aceitas, sem "=",
//      valor vazio, -c colado (-cuser.name=x) ou --config-env: nega.
//      Também nega: xargs/parallel + git sem subcomando escrito (echo commit -m x | xargs git); continuação de linha
//      duvidosa (crase + quebra no meio de uma palavra no PowerShell, \ + CRLF no Bash) quando uma das leituras dá
//      commit/envio; ( ), $( ) ou crase aninhados além de PROF_MAX com a palavra commit/push no texto.
// O que é conferido (o "modo" do detector; a mensagem de bloqueio diz qual vale): commit simples → preparado;
// commit -a ou add no mesmo comando → arvore (árvore contra HEAD + novos que o .gitignore não esconde; add -f inclui
// os ignorados); commit com caminhos → só esses caminhos (--include soma o preparado); --amend → contra o pai de
// HEAD; push → os commits que vão, contra os ramos do remoto de destino. Na dúvida, o conjunto maior.
//
// Registro (para quem faz a revisão, no fim dela; não vai na mensagem de bloqueio):
//   node "<este diretório>/mudanca-sensivel.mjs" --registrar-revisao --achados 0 --quem "<agente>" --raiz <repo>
//     [--modo preparado|arvore|envio] [--emenda] [--forcar] [--somente] [-- caminhos | argumentos do push]
//   com os mesmos parâmetros da linha "Modo do registro" da mensagem.
//
// Este portão evita acidente; não é barreira contra quem quer burlar (o registro de revisão é forjável: é só rodar
// o comando). Quem confere de verdade é o revisor e a prova (pilotos/prova-seguranca). Limites que ficam:
//   - atalho definido na configuração do Git do usuário (git ci) e função/alias do shell: sem a palavra commit/push
//     no comando, não há como saber; comando montado em variável ou escondido em script/arquivo (npm run, make,
//     ./script.sh) não é visto; PowerShell com -EncodedCommand não é lido;
//   - commit criado por merge/rebase/cherry-pick/revert num comando sem commit: não é conferido ali (o envio confere
//     depois, no git push); submódulo: o conteúdo dele não é lido;
//   - conteúdo gerado por um comando separado antes do commit é conferido normalmente (o portão lê o disco na hora);
//   - push para URL/caminho (remoto sem nome): compara com todos os ramos remotos conhecidos;
//   - variável de ambiente GIT_* herdada da sessão (export feito antes, noutro comando) não é vista.
// Prazo: PRAZO_MS no total, contado do início do processo e valendo para tudo (ler o comando, chamadas ao Git, ler
// o diff, classificar); estourou, NEGA ("não deu para conferir a tempo"), porque o estouro dos 10 s do hook
// liberaria sem aviso. Por projeto, .devconductor/portao.json:
// { "modo": "travar" | "avisar" | "desligado", "ignorar": [...] }.
// Saída (documentação oficial de hooks): negar = hookSpecificOutput.permissionDecision "deny" com saída 0; liberar
// com aviso = additionalContext (modelo vê) + systemMessage (usuário vê); passar sem risco = nada.
// Regra do erro: reconheceu commit/envio e NÃO entendeu a forma ou NÃO conseguiu conferir (erro do Git no meio da
// conferência, ref que não existe, prazo, comando aninhado demais, erro do próprio portão depois de reconhecer) →
// NEGA com motivo curto pedindo comando separado e simples (no modo "avisar", avisa; "desligado", nada).
// Libera COM aviso só quando: (a) a entrada do hook não é JSON (não há comando para reconhecer); (b) a leitura do
// comando falhou e o texto não tem a palavra commit/push solta; (c) o detector do kit não carrega (instalação
// quebrada: defeito do ambiente, não do comando); (d) git commit numa pasta onde o Git não responde (não é
// repositório, repositório quebrado, Git ausente): o próprio commit falha ali. git push nessa situação é negado
// (o envio funciona até sem árvore de trabalho).
import fs from 'node:fs'
import path from 'node:path'

const PRAZO_MS = 6000
const INICIO = Date.now()

// ---- Formas conhecidas (o que não está aqui, na mesma linha de um commit/envio, é negado) ----
// git add / git stage: caminhos, ".", "--" e estas opções (curtas combináveis, ex.: -Af). -p/-i/-e/-N não.
const ADD_LONGAS = new Set(['--all', '--update', '--force', '--verbose'])
const ADD_CURTAS = 'Auvf'
// git commit: as da lista pedida (-m -F -a --amend --no-edit -s --only --include -q -v --allow-empty --dry-run e
// caminhos) e as que não mudam o conteúdo do commit (autor, data, mensagem, assinatura, --no-verify...).
const COMMIT_VALOR_CURTO = 'mFCct'
const COMMIT_SEM_VALOR_CURTO = 'aesoiqvn'
const COMMIT_VALOR_LONGO = new Set(['--message', '--file', '--reuse-message', '--reedit-message', '--author', '--date',
  '--template', '--cleanup', '--trailer', '--fixup', '--squash'])
const COMMIT_SEM_VALOR_LONGO = new Set(['--all', '--amend', '--no-edit', '--edit', '--signoff', '--no-signoff', '--only',
  '--include', '--quiet', '--verbose', '--allow-empty', '--allow-empty-message', '--dry-run', '--no-verify', '--verify',
  '--reset-author', '--no-gpg-sign', '--status', '--no-status'])
// git push: remoto, ramo/refspec e estas opções. --mirror, --receive-pack, --exec, --recurse-submodules não.
const PUSH_SEM_VALOR = new Set(['--set-upstream', '--tags', '--all', '--branches', '--force', '--force-if-includes',
  '--quiet', '--verbose', '--dry-run', '--no-verify', '--verify', '--follow-tags', '--no-follow-tags', '--progress',
  '--no-progress', '--atomic', '--delete', '--porcelain'])
const PUSH_CURTAS = 'ufqvnd'
const PUSH_VALOR = new Set(['--repo', '--push-option', '-o'])
// git status / diff / log / show na mesma linha: só estas opções (todas de leitura). Valor separado (-n 5,
// --author x) entra como posicional. Fora da lista (--output, --ext-diff, --textconv, --no-index...) → negado.
const DIFF_OPC = ['--cached', '--staged', '--stat', '--shortstat', '--numstat', '--name-only', '--name-status', '--check',
  '-p', '-u', '--patch', '--no-patch', '-s', '--unified', '--color', '--no-color', '--word-diff', '--color-words', '-w',
  '-b', '--ignore-all-space', '--ignore-space-change', '--ignore-space-at-eol', '--ignore-blank-lines',
  '--ignore-cr-at-eol', '--minimal', '--patience', '--histogram', '--diff-algorithm', '--summary', '--compact-summary',
  '--exit-code', '--quiet', '-q', '--no-ext-diff', '--no-textconv', '--diff-filter', '-R', '--no-renames',
  '--find-renames', '-M', '--find-copies', '-C', '--full-index', '--abbrev', '--raw', '-z', '--merge-base', '--dirstat',
  '-a', '--text', '--relative', '--function-context', '-W', '--no-prefix', '--submodule', '--ignore-submodules']
const LOG_OPC = [...DIFF_OPC, '--oneline', '-n', '--max-count', '--skip', '--graph', '--decorate', '--no-decorate',
  '--all', '--branches', '--tags', '--remotes', '--pretty', '--format', '--abbrev-commit', '--no-abbrev-commit',
  '--no-merges', '--merges', '--since', '--until', '--after', '--before', '--author', '--committer', '--grep', '-i',
  '--invert-grep', '--date', '--first-parent', '--follow', '--reverse', '--topo-order', '--date-order', '--left-right',
  '--no-walk', '--parents', '--no-notes']
const LEITURA = new Map([
  ['status', new Set(['-s', '--short', '-b', '--branch', '--porcelain', '--long', '-v', '--verbose', '-u',
    '--untracked-files', '--ignored', '-z', '--show-stash', '--ahead-behind', '--no-ahead-behind', '--renames',
    '--no-renames', '--column', '--no-column'])],
  ['diff', new Set(DIFF_OPC)], ['log', new Set(LOG_OPC)], ['show', new Set(LOG_OPC)],
])
const LEITURA_CURTA = /^-(?:\d{1,6}|[Un]\d{1,6}|[MCB]\d{1,3}%?|u(?:no|normal|all)|sb|bs)$/

const MSG_SIMPLES = 'Portão de segurança: o portão só confere commit e envio em comando simples; rode antes o que precisar e depois o commit/envio num comando separado.'
const MSG_BAIXO = 'Portão de segurança: git commit-tree e git update-ref criam ou movem commits sem passar pelo portão; use git commit e git push.'
const MSG_TEMPO = 'Portão de segurança: não deu para conferir a tempo; rode o commit de novo ou em partes.'
const msgErro = (porque) => `Portão de segurança: não consegui conferir este commit/envio (${porque}). Rode o commit/envio sozinho, num comando simples; se o erro continuar, confira o repositório (git status).`
const primeira = (e) => String(e?.message || e).split('\n')[0].slice(0, 300)
const msgPasta = (porque) => `Portão de segurança: não dá para saber com segurança em que repositório este commit/envio roda (${porque}). Rode o commit/envio num comando separado, dentro da pasta do repositório.`

const escrever = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`)
const negar = (motivo) => escrever({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: motivo },
})
const avisar = (texto) => escrever({ systemMessage: texto, hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: texto } })
const naoConferiu = (porque) => avisar(`Portão de segurança não conferiu (${porque}); comando liberado.`)

// ---- Leitura do comando como o shell faria, só o necessário: palavras sem aspas ({t, din: tem $, q: teve aspas
// ou escape}), separadores, $( ) e crase (grupo subst), subshell ( ) (grupo sub), heredoc (o corpo vai em
// cmd.heredocs, não vira comando). ps: regras do PowerShell (crase escapa, '' dentro de '').
// opc.tique(): chamado de tempos em tempos (prazo). opc.alt: a outra leitura das continuações de linha duvidosas
// (crase + quebra no MEIO de uma palavra no PowerShell; \ + CRLF no Bash): a leitura normal separa, a alt junta.
// Havendo dúvida, o resultado vem com .amb = true e o portão lê dos dois jeitos. Aninhamento acima de PROF_MAX
// lança NaoLido (nunca estoura a pilha).
const PROF_MAX = 30
export class NaoLido extends Error {
  constructor(porque) { super(porque); this.code = 'FORMA' }
}
export function lerShell(bruto, ps, opc = {}) {
  // O PowerShell lê aspas tipográficas como aspas de verdade: troca antes de ler.
  const src = ps ? String(bruto).replace(/[\u201C\u201D\u201E\u201F]/g, '"').replace(/[\u2018\u2019\u201A\u201B]/g, "'") : String(bruto)
  let i = 0
  const n = src.length
  let amb = false
  let voltas = 0
  const tique = () => { if ((++voltas & 4095) === 0 && opc.tique) opc.tique() }
  let heredocs = []
  const pularHeredocs = () => {
    for (const h of heredocs) {
      while (i < n) {
        tique()
        let f = src.indexOf('\n', i)
        if (f < 0) f = n
        const linha = src.slice(i, f).replace(/\r$/, '')
        i = f + 1
        if ((h.tira ? linha.replace(/^\t+/, '') : linha) === h.delim) break
        h.corpo.push(linha)
      }
    }
    heredocs = []
  }
  function lista(fim, prof) {
    if (prof > PROF_MAX) throw new NaoLido('parênteses, $( ) ou crases aninhados demais')
    const itens = []
    let palavras = []
    let atual = null
    let din = false
    let q = false
    let internos = []
    let hds = []
    const fecharPalavra = () => { if (atual !== null) palavras.push({ t: atual, din, q }); atual = null; din = false; q = false }
    const fecharCmd = (sep) => {
      fecharPalavra()
      if (internos.length) { itens.push({ tipo: 'grupo', itens: internos, subst: true }); internos = [] }
      if (palavras.length) itens.push({ tipo: 'cmd', palavras, sep, heredocs: hds })
      else if (sep && itens.length && !itens.at(-1).sep) itens.at(-1).sep = sep
      palavras = []
      hds = []
    }
    const sub = (fecho) => { for (const x of lista(fecho, prof + 1)) internos.push(x); atual = `${atual ?? ''}$()`; din = true }
    const duplas = () => {
      atual = atual ?? ''
      q = true
      while (i < n && src[i] !== '"') {
        tique()
        const c = src[i]
        if (!ps && c === '\\' && i + 1 < n) { atual += '$`"\\\n'.includes(src[i + 1]) ? src[i + 1] : c + src[i + 1]; i += 2 }
        else if (ps && c === '`' && i + 1 < n) { atual += src[i + 1]; i += 2 }
        else if (c === '$' && src[i + 1] === '(') { i += 2; sub(')') }
        else if (!ps && c === '`') { i++; sub('`') }
        else if (c === '$') { atual += c; din = true; i++ }
        else { atual += c; i++ }
      }
      i++
      if (ps && src[i] === '"') { atual += '"'; i++; return true } // "" dentro de "..." no PowerShell: o texto segue
      return false
    }
    while (i < n) {
      tique()
      const c = src[i]
      if (fim && c === fim) { i++; fecharCmd(null); return itens }
      if (c === ' ' || c === '\t' || c === '\r') { fecharPalavra(); i++; continue }
      if (c === '\n') { fecharCmd(';'); i++; pularHeredocs(); continue }
      if (c === '#' && atual === null) { while (i < n && src[i] !== '\n') i++; continue }
      if (!ps && c === '\\') {
        q = true
        const d = src[i + 1]
        if (d === '\n') { i += 2; continue } // continuação de linha: some
        // \ + CRLF: no Bash o CR fica na palavra e a linha acaba; quem escreveu pode ter querido continuar (dúvida).
        if (d === '\r' && src[i + 2] === '\n') { amb = true; if (opc.alt) { i += 3; continue } }
        atual = (atual ?? '') + (d ?? '')
        i += 2
        continue
      }
      if (ps && c === '`') {
        q = true
        const d = src[i + 1]
        const salto = d === '\n' ? 2 : d === '\r' ? (src[i + 2] === '\n' ? 3 : 2) : 0
        if (salto) { // crase + quebra (LF ou CRLF): continuação. Entre palavras é espaço; no meio de uma, dúvida.
          if (atual !== null) { amb = true; if (!opc.alt) fecharPalavra() }
          i += salto
          continue
        }
        atual = (atual ?? '') + (d ?? '')
        i += 2
        continue
      }
      if (c === "'") {
        let f = src.indexOf("'", i + 1)
        let txt = src.slice(i + 1, f < 0 ? n : f)
        while (ps && f >= 0 && src[f + 1] === "'") { const g = src.indexOf("'", f + 2); txt += `'${src.slice(f + 2, g < 0 ? n : g)}`; f = g }
        atual = (atual ?? '') + txt
        q = true
        i = f < 0 ? n : f + 1
        continue
      }
      if (c === '"') { i++; while (duplas()); continue }
      if (ps && c === '@' && (src[i + 1] === "'" || src[i + 1] === '"') && /^\r?\n/.test(src.slice(i + 2, i + 4))) {
        const marca = `\n${src[i + 1]}@`
        const f = src.indexOf(marca, i)
        atual = `${atual ?? ''}texto`
        q = true
        i = f < 0 ? n : f + marca.length
        continue
      }
      if (c === '$' && src[i + 1] === '(') { i += 2; sub(')'); continue }
      if (c === '$') { atual = `${atual ?? ''}$`; din = true; i++; continue }
      if (!ps && c === '`') { i++; sub('`'); continue }
      if (c === '(') {
        i++
        if (atual === null && palavras.length === 0) { fecharCmd(null); itens.push({ tipo: 'grupo', itens: lista(')', prof + 1), sub: !ps }); continue }
        sub(')')
        continue
      }
      if (c === ')') { fecharPalavra(); i++; continue }
      if (c === ';') { fecharCmd(';'); i++; continue }
      if (c === '&') {
        if (src[i + 1] === '&') { fecharCmd('&&'); i += 2; continue }
        if (src[i + 1] === '>' || (atual !== null && /[<>]$/.test(atual))) { atual = `${atual ?? ''}&`; i++; continue }
        if (ps && atual === null && palavras.length === 0) { i++; continue } // operador de chamada do PowerShell
        fecharCmd('&'); i++; continue
      }
      if (c === '|') {
        if (src[i + 1] === '|') { fecharCmd('||'); i += 2; continue }
        fecharCmd('|'); i++; if (src[i] === '&') i++
        continue
      }
      if (!ps && c === '<' && src[i + 1] === '<' && src[i + 2] !== '<') {
        i += 2
        let tira = false
        if (src[i] === '-') { tira = true; i++ }
        while (src[i] === ' ' || src[i] === '\t') i++
        let d = ''
        while (i < n && !/[\s;&|<>()]/.test(src[i])) {
          if (src[i] === "'" || src[i] === '"') { const qq = src[i]; const f = src.indexOf(qq, i + 1); d += src.slice(i + 1, f < 0 ? n : f); i = (f < 0 ? n : f) + 1 }
          else if (src[i] === '\\') { d += src[i + 1] ?? ''; i += 2 }
          else d += src[i++]
        }
        const h = { delim: d, tira, corpo: [] }
        heredocs.push(h)
        hds.push(h)
        fecharPalavra()
        continue
      }
      atual = (atual ?? '') + c
      i++
    }
    fecharCmd(null)
    return itens
  }
  const tudo = lista(null, 0)
  tudo.amb = amb
  return tudo
}

// ---- Normalização e busca de commit/envio em qualquer lugar ----
// Aspas tipográficas (“ ” „ ‟ ‘ ’ ‚ ‛): o PowerShell lê como aspas de verdade (lerShell troca o texto antes de
// ler); no Bash são letras, mas git “commit” conta como commit e a forma nega.
const RE_TIPO = /[\u201C\u201D\u201E\u201F\u2018\u2019\u201A\u201B]/g
const semTipo = (s) => String(s).replace(RE_TIPO, '')
const nomeExe = (t) => path.basename(semTipo(t).replace(/\\/g, '/')).toLowerCase().replace(/\.(exe|cmd|bat|com)$/, '')
const PALAVRAS_COMMIT = new Set(['commit', 'push', 'commit-tree', 'update-ref'])
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell', 'cmd', 'wsl', 'busybox'])
// Comandos cujo texto é só texto (mensagem, busca): "git push" dentro deles não roda nada (salvo se forem para um shell).
const TEXTO_LIVRE = new Set(['echo', 'printf', 'write-output', 'write-host', 'write-information', 'gh', 'cat', 'type',
  'get-content', 'grep', 'egrep', 'fgrep', 'rg', 'findstr', 'select-string', 'jq', 'head', 'tail', 'wc', 'sort', 'uniq',
  'cut', 'tee', 'less', 'more'])

// Texto de script (bash -c "...", node -e "...", corpo de heredoc): tem git seguido de commit/push? Tira aspas,
// crases, ^ e barras de escape (com''mit, com\mit, pu^sh) e também lê barra invertida como separador de pasta.
function textoTemCommit(s) {
  const base = semTipo(s).toLowerCase()
  for (const v of [base.replace(/["'`^\\]/g, ''), base.replace(/\\/g, '/').replace(/["'`^]/g, '')]) {
    const p = v.split(/[^a-z0-9._-]+/)
    const g = p.findIndex((x) => /^git(?:\.exe|\.cmd)?$/.test(x))
    if (g >= 0 && p.slice(g + 1).some((x) => PALAVRAS_COMMIT.has(x))) return true
  }
  return false
}

// Texto sem aspas, crases, escapes e continuações de linha, em minúsculas (para o atalho e para palavraSolta).
const limpar = (s) => semTipo(s).replace(/[`\\]\r?\n/g, '').replace(/["'`^\\]/g, '').toLowerCase()
// Palavra commit/push/commit-tree/update-ref solta no texto. Só serve quando a leitura do comando falhou
// (aninhamento demais, prazo, erro): decide entre negar e liberar com aviso.
export const palavraSolta = (s) => limpar(s).split(/[^a-z0-9._-]+/).some((x) => PALAVRAS_COMMIT.has(x))

// Opções globais do git a partir da palavra g (o "git"): subcomando normalizado e valores de -c.
function gitGlobal(w, g) {
  const valoresC = []
  let k = g + 1
  while (k < w.length) {
    const a = w[k]
    if (a.din) return { sub: null, subDin: true, k, valoresC }
    const t = a.t
    if (!t.startsWith('-')) break
    if (['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--super-prefix', '--attr-source'].includes(t)) {
      if (t === '-c' || t === '--config-env') valoresC.push(w[k + 1]?.t ?? '')
      k += 2
      continue
    }
    if (t.startsWith('--config-env=')) valoresC.push(t.slice(13))
    k++
  }
  return { sub: w[k] ? semTipo(w[k].t).toLowerCase() : null, subDin: Boolean(w[k]?.din), k, valoresC }
}

function procurar(itens, ach) {
  for (let n = 0; n < itens.length; n++) {
    const it = itens[n]
    if (it.tipo === 'grupo') { procurar(it.itens, ach); continue }
    const w = it.palavras
    const prox = itens[n + 1]
    const paraShell = it.sep === '|' && prox?.tipo === 'cmd' && !prox.palavras[0].din && SHELLS.has(nomeExe(prox.palavras[0].t))
    const g = w.findIndex((x) => !x.din && nomeExe(x.t) === 'git')
    if (g >= 0) {
      const gl = gitGlobal(w, g)
      if (gl.sub === 'commit-tree' || gl.sub === 'update-ref') ach.baixo = true
      if (PALAVRAS_COMMIT.has(gl.sub) || gl.valoresC.some((v) => /^alias\./i.test(v)) ||
        (gl.subDin && w.slice(gl.k).some((x) => !x.din && PALAVRAS_COMMIT.has(x.t.toLowerCase())))) ach.commit = true
      // xargs/parallel + git: os argumentos vêm da entrada. Sem subcomando escrito (ou com troca -I/--replace), o
      // que chega pode ser "commit ..." (echo commit -m x | xargs git): conta como commit e a forma nega.
      const xa = w.findIndex((x) => !x.din && ['xargs', 'parallel'].includes(nomeExe(x.t)))
      if (xa >= 0 && xa < g && (gl.sub === null || gl.subDin || w.slice(xa + 1, g).some((x) => /^(?:-[iIJ]|--replace)/.test(x.t)))) ach.commit = true
    }
    if (w[0].din && w.some((x) => !x.din && PALAVRAS_COMMIT.has(x.t.toLowerCase()))) ach.commit = true
    const nome = w[0].din ? '' : nomeExe(w[0].t)
    if (nome !== 'git' && (paraShell || !TEXTO_LIVRE.has(nome)) && w.some((x) => textoTemCommit(x.t))) ach.commit = true
    if ((SHELLS.has(nome) || paraShell) && it.heredocs.some((h) => textoTemCommit(h.corpo.join('\n')))) ach.commit = true
  }
}

// Lê o comando e diz se é de commit/envio: { commit, baixo, amb, itens }. Na dúvida de continuação de linha (amb),
// vale o pior das duas leituras.
export function reconhecer(texto, ps, opc = {}) {
  const itens = lerShell(texto, ps, opc)
  const ach = { commit: false, baixo: false, amb: Boolean(itens.amb), itens }
  procurar(itens, ach)
  if (itens.amb) procurar(lerShell(texto, ps, { ...opc, alt: true }), ach)
  return ach
}

// ---- Pasta efetiva ----
const existeDir = (d) => { try { return fs.statSync(d).isDirectory() } catch { return false } }

// Caminho como o shell entende → absoluto; null se não der para saber. No Windows, /c/... (Git Bash) vira C:/...
function resolver(base, t) {
  let p = t
  if (process.platform === 'win32') {
    const m = p.match(/^\/([a-zA-Z])(\/.*)?$/)
    if (m) p = `${m[1]}:${m[2] || '/'}`
    else if (p.startsWith('/') && !p.startsWith('//')) return null // /tmp e afins do Git Bash: raiz desconhecida
  }
  if (p.startsWith('~')) return null
  if (path.isAbsolute(p)) return path.resolve(p)
  return base ? path.resolve(base, p) : null
}

const RE_GIT_ENV = /^(?:\$env:)?GIT_(?:DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|NAMESPACE)\b/i
const pastasDe = (ps) => (ps ? ['cd', 'chdir', 'sl', 'set-location', 'pushd', 'push-location', 'popd', 'pop-location'] : ['cd', 'pushd', 'popd'])

// Muda est.dir; devolve o porquê se não der para saber a pasta.
function trocarPasta(nome, args, ps, est) {
  if (nome === 'popd' || nome === 'pop-location') {
    if (!est.pilha.length) return 'popd sem pushd'
    est.dir = est.pilha.pop()
    return null
  }
  const pos = []
  for (let j = 0; j < args.length; j++) {
    const a = args[j]
    if (!a.din && ps && /^-(path|literalpath)$/i.test(a.t)) { pos.push(args[j + 1]); j++; continue }
    if (!a.din && ps && /^-stackname$/i.test(a.t)) { j++; continue }
    if (!a.din && a.t.startsWith('-') && a.t !== '-') continue
    pos.push(a)
  }
  const a = pos[0]
  if (!a || a.din || a.t === '-') return !a ? `${nome} sem pasta` : 'pasta montada em variável'
  const d = resolver(est.dir, a.t)
  if (!d || !existeDir(d)) return `pasta "${a.t}" não encontrada ou desconhecida`
  if (/push/.test(nome)) est.pilha.push(est.dir)
  est.dir = d
  return null
}

// Tira redirecionamentos inofensivos (2>&1, >/dev/null, > $null, 2> nul); para arquivo de verdade → null.
const DESCARTE = /^(?:\/dev\/null|nul|\$null)$/i
function semRedirecao(w) {
  const out = []
  for (let j = 0; j < w.length; j++) {
    const x = w[j]
    if (x.q) { out.push(x); continue }
    if (/^[0-9*]?>&[0-9]$/.test(x.t)) continue
    const m = x.t.match(/^(?:[0-9*&]?>>?|<)(.*)$/)
    if (!m) { out.push(x); continue }
    const alvo = m[1] || w[++j]?.t
    if (alvo !== undefined && DESCARTE.test(alvo)) continue
    return null
  }
  return out
}

// ---- Argumentos de add, commit e push (só as opções conhecidas; outra → erro) ----
function lerAdd(args) {
  const a = { tudo: false, caminhos: [], forcar: false }
  let fim = false
  for (const x of args) {
    if (x.din) return { erro: 'caminho do git add montado em variável' }
    const t = x.t
    if (fim || !t.startsWith('-') || t === '-') { a.caminhos.push(t); continue }
    if (t === '--') { fim = true; continue }
    if (ADD_LONGAS.has(t)) { if (t === '--force') a.forcar = true; continue }
    if (/^-[a-zA-Z]+$/.test(t) && [...t.slice(1)].every((l) => ADD_CURTAS.includes(l))) { if (t.includes('f')) a.forcar = true; continue }
    return { erro: `opção do git add não conferida (${t.slice(0, 40)})` }
  }
  if (!a.caminhos.length) a.tudo = true
  return a
}

function lerCommit(args) {
  const c = { emenda: false, todos: false, caminhos: [], simulado: false, incluir: false }
  const ruim = (t) => ({ erro: `opção do git commit não conferida (${t.slice(0, 40)})` })
  let fim = false
  for (let j = 0; j < args.length; j++) {
    const x = args[j]
    const t = x.t
    if (fim || x.din || !t.startsWith('-') || t === '-') {
      if (x.din) return { erro: 'caminho do git commit montado em variável' }
      c.caminhos.push(t)
      continue
    }
    if (t === '--') { fim = true; continue }
    if (t.startsWith('--')) {
      const nome = t.split('=')[0]
      if (COMMIT_VALOR_LONGO.has(nome)) { if (!t.includes('=')) j++; continue }
      if (nome === '--gpg-sign') continue
      if (!COMMIT_SEM_VALOR_LONGO.has(t)) return ruim(t)
      if (t === '--amend') c.emenda = true
      else if (t === '--all') c.todos = true
      else if (t === '--dry-run') c.simulado = true
      else if (t === '--include') c.incluir = true
      continue
    }
    if (t === '-S') continue
    for (let m = 1; m < t.length; m++) {
      const l = t[m]
      if (COMMIT_VALOR_CURTO.includes(l)) { if (m === t.length - 1) j++; break }
      if (!COMMIT_SEM_VALOR_CURTO.includes(l)) return ruim(t)
      if (l === 'a') c.todos = true
      if (l === 'i') c.incluir = true
    }
  }
  return c
}

function conferirPush(args) {
  let fim = false
  for (let j = 0; j < args.length; j++) {
    const x = args[j]
    if (x.din) return 'remoto ou ramo do git push montado em variável'
    const t = x.t
    if (fim || !t.startsWith('-') || t === '-') continue
    if (t === '--') { fim = true; continue }
    const nome = t.split('=')[0]
    if (nome === '--force-with-lease') continue
    if (PUSH_VALOR.has(nome)) {
      if (!t.includes('=')) { j++; if (args[j]?.din) return 'remoto do git push montado em variável' }
      continue
    }
    if (PUSH_SEM_VALOR.has(t)) continue
    if (/^-[a-zA-Z]+$/.test(t) && [...t.slice(1)].every((l) => PUSH_CURTAS.includes(l))) continue
    return `opção do git push não conferida (${t.slice(0, 40)})`
  }
  return null
}

// git status/diff/log/show junto do commit/envio: só inspeção. Devolve o porquê quando não dá para aceitar.
function lerLeitura(sub, args) {
  const conhecidas = LEITURA.get(sub)
  let fim = false
  for (const x of args) {
    if (x.din) return `argumento do git ${sub} montado em variável`
    const t = x.t
    if (fim || !t.startsWith('-') || t === '-') continue
    if (t === '--') { fim = true; continue }
    if (conhecidas.has(t.split('=')[0]) || LEITURA_CURTA.test(t)) continue
    return `opção do git ${sub} não conferida (${t.slice(0, 40)})`
  }
  return null
}

// git -c antes do subcomando: só a autoria do commit (não muda o conteúdo conferido). A palavra inteira tem de ser
// user.name=<valor> ou user.email=<valor>: chave sem diferenciar maiúsculas (o Git também não diferencia), valor
// não vazio e só com letras, números, espaço e . _ @ + -. Fica de fora, por cautela, o que o shell pode transformar
// depois da leitura do portão ({a,b} no Bash vira duas palavras; * ? ~ expandem) e qualquer outro sinal (, ; / = ...).
const RE_C_AUTORIA = /^user\.(?:name|email)=[\p{L}\p{M}\p{N} ._@+-]+$/iu

function lerGitSimples(w, dir) {
  let d = dir
  let k = 1
  while (k < w.length && !w[k].din && w[k].t.startsWith('-')) {
    const a = w[k].t
    if (a === '-c') {
      const x = w[k + 1]
      if (!x || x.din || !RE_C_AUTORIA.test(x.t)) {
        return { erro: `git -c só é aceito com user.name=<valor> ou user.email=<valor> simples (-c ${(x?.t ?? '').slice(0, 40)})` }
      }
      k += 2
      continue
    }
    if (a === '-C') {
      const x = w[k + 1]
      const r = x && !x.din ? resolver(d, x.t) : null
      if (!r || !existeDir(r)) return { erro: 'pasta do git -C desconhecida', pasta: true }
      d = r
      k += 2
      continue
    }
    if (a === '--no-pager' || a === '-P') { k++; continue }
    if (/^--(git-dir|work-tree)(=|$)/.test(a)) return { erro: '--git-dir/--work-tree', pasta: true }
    return { erro: `opção do git não conferida (${a.slice(0, 40)})` }
  }
  const s = w[k]
  if (!s || s.din) return { erro: 'subcomando do Git montado em variável' }
  const sub = s.t.toLowerCase()
  const args = w.slice(k + 1)
  if (sub === 'add' || sub === 'stage') { const a = lerAdd(args); return a.erro ? a : { sub: 'add', dir: d, ...a } }
  if (sub === 'commit') { const c = lerCommit(args); return c.erro ? c : { sub: 'commit', dir: d, commit: c } }
  if (sub === 'push') { const e = conferirPush(args); return e ? { erro: e } : { sub: 'push', dir: d, args: args.map((x) => x.t) } }
  if (LEITURA.has(sub)) { const e = lerLeitura(sub, args); return e ? { erro: e } : { sub: 'leitura', dir: d } }
  return { erro: `git ${sub.slice(0, 30)} na mesma linha` }
}

const SO_TEXTO = new Set(['cat', 'echo', 'printf'])
// $( ) e crase só com cat/echo/printf sem redirecionamento: a mensagem do commit (git commit -m "$(cat <<'EOF' ...)").
const soTexto = (itens) => itens.every((x) => (x.tipo === 'grupo' ? x.subst && soTexto(x.itens)
  : !x.palavras[0].din && SO_TEXTO.has(nomeExe(x.palavras[0].t)) && semRedirecao(x.palavras)?.length === x.palavras.length))
// ( cd ... ) sozinho em subshell não muda nada fora dele.
const soPastas = (itens, ps) => itens.every((x) => x.tipo === 'cmd' && !x.palavras[0].din && pastasDe(ps).includes(nomeExe(x.palavras[0].t)))
const sepOk = (s) => !s || s === '&&' || s === ';'

// A forma simples (ver o topo) → { passos } ou { erro: mensagem }.
function lerForma(itens, ps, cwd) {
  const est = { dir: cwd, pilha: [] }
  const passos = []
  let jaGit = false
  const simples = (porque) => ({ erro: `${MSG_SIMPLES}\nNão conferido: ${porque}.` })
  const pasta = (porque) => ({ erro: msgPasta(porque) })
  for (const it of itens) {
    if (it.tipo === 'grupo') {
      if (it.subst && soTexto(it.itens)) continue
      if (it.sub && soPastas(it.itens, ps) && sepOk(it.sep)) continue
      return simples('( ), $( ) ou crase com outro comando')
    }
    const w = semRedirecao(it.palavras)
    if (!w) return simples('redirecionamento para arquivo')
    if (!w.length) return simples('redirecionamento sem comando')
    if (w[0].din) return simples('comando montado em variável')
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0].t)) {
      return RE_GIT_ENV.test(w[0].t) ? pasta('GIT_DIR/GIT_WORK_TREE no comando') : simples(`variável antes do comando (${w[0].t.split('=')[0].slice(0, 40)})`)
    }
    const nome = nomeExe(w[0].t)
    if (pastasDe(ps).includes(nome)) {
      if (!sepOk(it.sep)) return pasta(`${nome} seguido de ${it.sep}`)
      if (jaGit) return simples('troca de pasta depois do Git')
      const porque = trocarPasta(nome, w.slice(1), ps, est)
      if (porque) return pasta(porque)
      continue
    }
    if (nome !== 'git') return simples(`outro comando na mesma linha (${nome.slice(0, 40)})`)
    if (!sepOk(it.sep)) return simples(`Git seguido de ${it.sep}`)
    jaGit = true
    const r = lerGitSimples(w, est.dir)
    if (r.erro) return r.pasta ? pasta(r.erro) : simples(r.erro)
    passos.push(r)
  }
  if (!passos.some((p) => p.sub === 'commit' || p.sub === 'push')) return simples('commit/envio fora da forma simples')
  return { passos }
}

// Caminhos do comando (relativos à pasta da operação) → relativos ao topo do repositório; null = o repositório todo.
function relativos(lista, dir, topo) {
  const saida = []
  for (const t of lista) {
    if (t.startsWith(':')) return null
    const abs = resolver(dir, t)
    if (!abs) return null
    const rel = path.relative(topo, abs).replace(/\\/g, '/')
    if (!rel || rel === '.' || rel.startsWith('..') || path.isAbsolute(rel)) return null
    saida.push(rel)
  }
  return saida
}

function lerModo(raiz) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(raiz, '.devconductor', 'portao.json'), 'utf8'))
    return ['travar', 'avisar', 'desligado'].includes(cfg.modo) ? cfg.modo : 'travar'
  } catch { return 'travar' }
}

const aspas = (s) => (s === '' || /[\s"'\\]/.test(s) ? JSON.stringify(s) : s)
function parametros(spec) {
  const fim = spec.modo === 'envio' ? spec.args : (spec.caminhos || [])
  return [`--modo ${spec.modo}`, spec.emenda && '--emenda', spec.forcar && '--forcar', spec.somente && '--somente',
    fim.length && `-- ${fim.map(aspas).join(' ')}`].filter(Boolean).join(' ')
}

function motivo({ acao, r, revisoes, spec }) {
  const lista = r.arquivos.slice(0, 4).join(', ') + (r.arquivos.length > 4 ? ` (+${r.arquivos.length - 4})` : '')
  const oQue = acao === 'push' ? 'este envio (git push)' : (spec.emenda ? 'este commit (--amend)' : 'este commit')
  const igual = revisoes.find((x) => x.hash === r.hash)
  const situacao = igual ? `a revisão registrada deixou ${igual.achadosAbertos} achado(s) aberto(s)`
    : revisoes.length ? 'a revisão registrada é de outro diff (algo mudou depois dela)' : 'ainda não foi revisado'
  const antes = r.nivel >= 2 ? 'rode a varredura de segurança, corrija o que for alto ou crítico'
    : 'rode a varredura de segurança, confira a lista do portão'
  return [
    `Portão de segurança: ${oQue} toca área sensível (nível ${r.nivel}: ${r.categorias.join(', ')}) e ${situacao}.`,
    `Arquivos: ${lista || '(leitura cortada)'}`,
    `O que fazer: ${antes} e peça a revisão de segurança (agente security-auditor); o registro é feito no fim da revisão.`,
    `Modo do registro (para quem revisar): ${parametros(spec)}`,
    'A revisão vale só para este conteúdo exato; mudou algo depois, precisa de nova revisão.',
    'Para só avisar neste projeto: .devconductor/portao.json com {"modo": "avisar"}.',
  ].join('\n')
}

// Modo do projeto sem chamar o Git (quando o Git não respondeu ou o prazo acabou): sobe da pasta até achar .git.
function modoPelaPasta(dir) {
  let d = dir
  for (let k = 0; k < 64; k++) {
    if (fs.existsSync(path.join(d, '.git'))) return lerModo(d)
    const pai = path.dirname(d)
    if (pai === d) break
    d = pai
  }
  return 'travar'
}

let ultimoTexto = ''

export async function principal() {
  let entrada
  try { entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}') } catch { return naoConferiu('entrada do hook não é JSON válido') }
  const ps = entrada?.tool_name === 'PowerShell'
  const texto = String(entrada?.tool_input?.command || '')
  ultimoTexto = texto
  // Atalho: sem as palavras (depois de tirar aspas, escapes e continuações de linha), nada a conferir.
  if (!/commit|push|update-ref/.test(limpar(texto))) return undefined
  const cwd = path.resolve(entrada?.cwd || process.cwd())

  // Defeito do ambiente (o detector do kit não carrega): libera com aviso.
  let det
  try {
    det = await import('./mudanca-sensivel.mjs')
    det.carregarAreas()
  } catch (e) { return naoConferiu(`o detector não carregou: ${primeira(e)}`) }
  det.definirPrazo((Number(process.env.DEVCONDUCTOR_PORTAO_PRAZO_MS) || PRAZO_MS) - (Date.now() - INICIO))

  let reconhecido = false
  try {
    const ach = reconhecer(texto, ps, { tique: det.conferirPrazo })
    if (!ach.commit && !ach.baixo) return undefined
    reconhecido = true

    const topos = new Map()
    const topoDe = (dir) => {
      if (!topos.has(dir)) { try { topos.set(dir, det.topoDoRepo(dir)) } catch (e) { topos.set(dir, e) } }
      return topos.get(dir)
    }
    const barrar = (t) => {
      const raiz = topoDe(cwd)
      const modo = typeof raiz === 'string' ? lerModo(raiz) : modoPelaPasta(cwd)
      if (modo === 'desligado') return undefined
      return modo === 'avisar' ? avisar(t) : negar(t)
    }
    if (ach.baixo) return barrar(MSG_BAIXO)
    if (ach.amb) return barrar(`${MSG_SIMPLES}\nNão conferido: continuação de linha que o portão não sabe ler com certeza (crase ou \\ antes da quebra).`)
    const forma = lerForma(ach.itens, ps, cwd)
    if (forma.erro) return barrar(forma.erro)

    const repos = new Map() // topo → { adds: {tudo, caminhos:Set, forcar} | null }
    const avisos = []
    for (const op of forma.passos) {
      if (op.sub === 'leitura') continue // git status/diff/log/show: só inspeção
      det.conferirPrazo()
      const topo = topoDe(op.dir)
      if (typeof topo !== 'string') {
        if (topo?.code === 'PRAZO') throw topo
        if (op.sub === 'add') continue
        // O Git não respondeu nesta pasta (não é repositório, repositório quebrado, Git ausente). Commit: o próprio
        // git commit falha ali → libera com aviso (defeito do ambiente). Envio: funciona até sem árvore de
        // trabalho → nega pela pasta.
        if (op.sub === 'push') return barrar(msgPasta('o Git não respondeu nesta pasta'))
        return naoConferiu(primeira(topo))
      }
      if (op.sub === 'add') {
        if (!repos.has(topo)) repos.set(topo, { adds: null })
        const st = repos.get(topo)
        const rel = op.tudo ? null : relativos(op.caminhos, op.dir, topo)
        st.adds ??= { tudo: false, caminhos: new Set(), forcar: false }
        if (!rel) st.adds.tudo = true
        else rel.forEach((c) => st.adds.caminhos.add(c))
        st.adds.forcar ||= op.forcar
        continue
      }
      const modo = lerModo(topo)
      if (modo === 'desligado') continue

      let spec
      if (op.sub === 'push') spec = { modo: 'envio', args: op.args }
      else {
        const c = op.commit
        if (c.simulado) continue // --dry-run não altera nada
        const st = repos.get(topo)
        let arvore = false
        let tudo = false
        let somente = false
        let forcar = false
        const caminhos = new Set()
        if (c.todos) { arvore = true; tudo = true }
        if (c.caminhos.length) {
          arvore = true
          const rel = relativos(c.caminhos, op.dir, topo)
          if (!rel) tudo = true
          else { rel.forEach((x) => caminhos.add(x)); somente = !c.incluir && !c.emenda }
        }
        if (st?.adds) {
          forcar ||= st.adds.forcar
          if (!somente) { arvore = true; if (st.adds.tudo) tudo = true; else st.adds.caminhos.forEach((x) => caminhos.add(x)) }
        }
        spec = arvore
          ? { modo: 'arvore', emenda: c.emenda, caminhos: tudo ? null : [...caminhos].sort(), forcar, somente: !tudo && somente }
          : { modo: 'preparado', emenda: c.emenda }
      }
      let r
      let revisoes
      try {
        r = det.analisar({ raiz: topo, ...spec })
        if (r.nivel === 0) continue
        det.conferirPrazo()
        revisoes = det.lerRevisoes(topo)
      } catch (e) {
        // Reconhecido e não conferido: nega (no modo avisar, avisa).
        const t = e?.code === 'PRAZO' ? MSG_TEMPO : msgErro(primeira(e))
        if (modo === 'avisar') { avisos.push(t); continue }
        return negar(t)
      }
      if (revisoes.some((x) => x.hash === r.hash && Number(x.achadosAbertos) === 0)) continue
      const t = motivo({ acao: op.sub, r, revisoes, spec })
      if (modo === 'avisar') { avisos.push(t); continue }
      return negar(t)
    }
    if (avisos.length) avisar(avisos.join('\n'))
  } catch (e) {
    // Regra do erro (ver o topo): reconhecido como commit/envio — ou, se nem a leitura terminou, com a palavra
    // commit/push solta no texto — e não conferido → NEGA. O que não é commit/envio passa com aviso.
    if (!reconhecido && !palavraSolta(texto)) return naoConferiu(primeira(e))
    const forma = e?.code === 'FORMA' || e instanceof RangeError
    const t = e?.code === 'PRAZO' ? MSG_TEMPO
      : forma ? `${MSG_SIMPLES}\nNão conferido: ${e.code === 'FORMA' ? e.message : 'comando grande ou aninhado demais'}.`
        : msgErro(primeira(e))
    let modo = 'travar'
    try { modo = modoPelaPasta(cwd) } catch { /* fica travar */ }
    if (modo === 'desligado') return undefined
    return modo === 'avisar' ? avisar(t) : negar(t)
  }
  return undefined
}

// Roda como hook quando é o arquivo chamado pelo node. Basta o nome: caminho por atalho/junção ou com maiúsculas
// diferentes não pode desligar o portão. Importado (teste), só oferece as funções.
if (path.basename(String(process.argv[1] || '')).toLowerCase() === 'portao-seguranca.mjs') {
  principal().catch((e) => (palavraSolta(ultimoTexto) ? negar(msgErro(primeira(e))) : naoConferiu(primeira(e))))
}
