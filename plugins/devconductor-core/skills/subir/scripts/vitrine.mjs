#!/usr/bin/env node
// Vitrine pública de um projeto privado: cópia limpa, sem histórico, só do que o vitrine.json do projeto manda.
// Usa só arquivos versionados (git ls-files), então nada ignorado (logins, node_modules, .env) entra.
// Antes de copiar, varre o texto atrás de e-mail pessoal, caminho da máquina, CPF/CNPJ, telefone, token e chave
// privada (mais os padrões do projeto, como nomes de clientes); com achado, não escreve nada e sai com código 1.
// "trocar" no vitrine.json generaliza o texto antes da varredura (ex.: nome de cliente → "cliente"); o privado não muda.
//
// Uso (na pasta do projeto ou com --projeto):
//   node vitrine.mjs --conferir                 só varre
//   node vitrine.mjs [pasta-destino]            gera a cópia (padrão: "pasta" do vitrine.json)
//   node vitrine.mjs --enviar ["mensagem"]      gera, faz commit e push no repositório da vitrine
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Valem em todo projeto; o vitrine.json acrescenta os dele em "proibidos". */
export const PROIBIDOS_PADRAO = [
  { nome: 'e-mail pessoal', padrao: '[A-Za-z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|live|bol|uol)\\.', flags: 'i' },
  { nome: 'caminho da máquina', padrao: '[A-Za-z]:\\\\{1,2}Users\\\\{1,2}[A-Za-z]|/c/Users/[A-Za-z]|/home/[a-z][a-z0-9_-]*/|/Users/[A-Za-z][A-Za-z0-9_-]*/', flags: 'i' },
  { nome: 'cpf', padrao: '\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b', flags: '' },
  { nome: 'cnpj', padrao: '\\b\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}\\b', flags: '' },
  { nome: 'telefone', padrao: '\\(\\d{2}\\) ?9?\\d{4}-\\d{4}', flags: '' },
  { nome: 'token', padrao: '\\b(sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})', flags: '' },
  { nome: 'chave privada', padrao: '-----BEGIN [A-Z ]*PRIVATE KEY-----', flags: '' },
]

/** Nunca entram: segredos e configuração local. Memória e instruções de IA também não, salvo "permitirConfigIA". */
export const EXCLUIR_SEMPRE = ['**/.env', '**/.env.*', '**/settings.local.json', 'vitrine.json']
export const EXCLUIR_CONFIG_IA = ['.claude/**', '.codex/**', '**/CLAUDE.md', '**/AGENTS.md', '**/memory/**', '**/memoria/**']

function globParaRegex(glob) {
  let r = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') { r += '(?:.*/)?'; i += glob[i + 2] === '/' ? 2 : 1; if (i >= glob.length - 1 && glob.endsWith('**')) r += '.*'; continue }
    if (c === '*') { r += '[^/]*'; continue }
    r += /[.+?^${}()|[\]\\]/.test(c) ? '\\' + c : c
  }
  return new RegExp('^' + r + '$')
}

function exclusoes(cfg) {
  return [...EXCLUIR_SEMPRE, ...(cfg.permitirConfigIA ? [] : EXCLUIR_CONFIG_IA), ...(cfg.excluir || [])].map(globParaRegex)
}

/** Escolhe o que entra: [{ origem, destino }] a partir da lista de arquivos versionados. */
export function selecionar(arquivos, cfg) {
  const excluir = exclusoes(cfg)
  const renomear = cfg.renomear || {}
  const saida = []
  for (const a of arquivos) {
    if (renomear[a]) { saida.push({ origem: a, destino: renomear[a] }); continue }
    const entra = (cfg.incluir || ['']).some((p) => p === '' || (p.endsWith('/') ? a.startsWith(p) : a === p))
    if (!entra || excluir.some((r) => r.test(a))) continue
    saida.push({ origem: a, destino: a })
  }
  const destinos = new Set()
  for (const s of saida) {
    if (destinos.has(s.destino)) throw new Error(`dois arquivos para o mesmo destino: ${s.destino}`)
    destinos.add(s.destino)
  }
  return saida.sort((x, y) => x.destino.localeCompare(y.destino))
}

/** Aplica as trocas do vitrine.json ([{ padrao, flags, por, arquivos }]) ao texto de um arquivo. */
export function aplicarTrocas(arquivo, texto, cfg) {
  for (const tr of cfg.trocar || []) {
    if (tr.arquivos && !tr.arquivos.map(globParaRegex).some((r) => r.test(arquivo))) continue
    const flags = [...new Set(((tr.flags || '') + 'g').split(''))].join('')
    texto = texto.replace(new RegExp(tr.padrao, flags), tr.por ?? '')
  }
  return texto
}

/** Arquivo binário (imagem, vídeo, fonte): não é varrido. */
export function ehBinario(buf) {
  return buf.subarray(0, 8000).includes(0)
}

/** Procura dados que não podem ir a público. Devolve [{ arquivo, linha, regra, trecho }]. */
export function varrer(arquivo, texto, cfg) {
  const achados = []
  const permitidos = (cfg.permitidos || [])
    .filter((p) => !p.arquivo || globParaRegex(p.arquivo).test(arquivo))
    .map((p) => new RegExp('^(?:' + p.trecho + ')$'))
  const linhas = texto.split(/\r?\n/)
  for (const regra of [...PROIBIDOS_PADRAO, ...(cfg.proibidos || [])]) {
    const re = new RegExp(regra.padrao, (regra.flags || '') + 'g')
    linhas.forEach((l, i) => {
      for (const m of l.matchAll(re)) {
        if (permitidos.some((p) => p.test(m[0]))) continue
        achados.push({ arquivo, linha: i + 1, regra: regra.nome, trecho: m[0] })
      }
    })
  }
  return achados
}

const git = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' })

/** vitrine.json na raiz do projeto (ou em scripts/). Sem ele, o projeto não tem vitrine. */
export function lerConfig(projeto) {
  for (const p of ['vitrine.json', path.join('scripts', 'vitrine.json')]) {
    const f = path.join(projeto, p)
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'))
  }
  return null
}

function limparDestino(destino) {
  fs.mkdirSync(destino, { recursive: true })
  for (const nome of fs.readdirSync(destino)) {
    if (nome === '.git') continue
    fs.rmSync(path.join(destino, nome), { recursive: true, force: true })
  }
}

export function gerar({ projeto, destino, conferir = false, cfg } = {}) {
  projeto = path.resolve(projeto || '.')
  cfg ||= lerConfig(projeto)
  if (!cfg) throw new Error(`sem vitrine.json em ${projeto}`)
  const r = git(projeto, 'ls-files', '-z')
  if (r.status !== 0) throw new Error('git ls-files falhou: ' + r.stderr)
  const lista = selecionar(r.stdout.split('\0').filter(Boolean), cfg)
  const achados = []
  const trocados = new Map()
  for (const { origem } of lista) {
    const buf = fs.readFileSync(path.join(projeto, origem))
    if (ehBinario(buf)) continue
    const original = buf.toString('utf8')
    const texto = aplicarTrocas(origem, original, cfg)
    if (texto !== original) trocados.set(origem, texto)
    achados.push(...varrer(origem, texto, cfg))
  }
  if (achados.length || conferir) return { lista, achados, copiados: 0, trocados }
  const alvo = path.resolve(projeto, destino || cfg.pasta || path.join('..', path.basename(projeto) + '-public'))
  if (alvo === projeto || projeto.startsWith(alvo + path.sep)) throw new Error('destino não pode ser o próprio projeto')
  limparDestino(alvo)
  for (const { origem, destino: d } of lista) {
    const f = path.join(alvo, d)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    if (trocados.has(origem)) fs.writeFileSync(f, trocados.get(origem))
    else fs.copyFileSync(path.join(projeto, origem), f)
  }
  return { lista, achados, copiados: lista.length, alvo, trocados }
}

/** Gera e envia: commit com a mesma autoria do repositório privado e push. Clona a vitrine se a pasta não existir. */
export function enviar({ projeto, mensagem, cfg } = {}) {
  projeto = path.resolve(projeto || '.')
  cfg ||= lerConfig(projeto)
  if (!cfg?.repositorio) throw new Error('vitrine.json sem "repositorio" (ex.: "usuario/projeto-public")')
  const alvo = path.resolve(projeto, cfg.pasta || path.join('..', path.basename(projeto) + '-public'))
  const nome = git(projeto, 'config', 'user.name').stdout.trim()
  const email = git(projeto, 'config', 'user.email').stdout.trim()
  if (!nome || !email) throw new Error('o repositório privado não tem user.name/user.email: configurar antes de enviar')
  if (!fs.existsSync(path.join(alvo, '.git'))) {
    const c = spawnSync('gh', ['repo', 'clone', cfg.repositorio, alvo], { encoding: 'utf8' })
    if (c.status !== 0) throw new Error(`não consegui clonar ${cfg.repositorio}: ${c.stderr}`)
  }
  const g = gerar({ projeto, destino: alvo, cfg })
  if (g.achados.length) return { ...g, enviado: false }
  git(alvo, 'add', '-A')
  if (git(alvo, 'status', '--porcelain').stdout.trim() === '') return { ...g, enviado: false, semMudanca: true }
  const msg = mensagem || 'chore: atualiza a vitrine a partir do repositorio de trabalho'
  const c = git(alvo, '-c', `user.name=${nome}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', msg)
  if (c.status !== 0) throw new Error('commit da vitrine falhou: ' + c.stderr)
  const p = git(alvo, 'push', '-q', 'origin', 'HEAD')
  if (p.status !== 0) throw new Error('push da vitrine falhou: ' + p.stderr)
  return { ...g, enviado: true }
}

function mostrarAchados(achados) {
  console.error(`Vitrine NÃO gerada: ${achados.length} achado(s).`)
  for (const a of achados.slice(0, 50)) console.error(`  ${a.arquivo}:${a.linha}  [${a.regra}]  ${a.trecho}`)
  process.exit(1)
}

export function principal(args, projetoPadrao = '.') {
  const i = args.indexOf('--projeto')
  const projeto = i >= 0 ? args[i + 1] : projetoPadrao
  const livres = args.filter((a, j) => !a.startsWith('--') && args[j - 1] !== '--projeto')
  if (args.includes('--enviar')) {
    const r = enviar({ projeto, mensagem: livres[0] })
    if (r.achados.length) mostrarAchados(r.achados)
    console.log(r.semMudanca ? 'Vitrine já estava em dia.' : `Vitrine enviada: ${r.copiados} arquivos.`)
    return
  }
  const conferir = args.includes('--conferir')
  const r = gerar({ projeto, destino: livres[0], conferir })
  if (r.achados.length) mostrarAchados(r.achados)
  console.log(conferir ? `Conferido: ${r.lista.length} arquivos, nenhum achado.` : `Vitrine gerada em ${r.alvo}: ${r.copiados} arquivos.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal(process.argv.slice(2))
