// Monta os plugins de stack a partir de scripts/selecao.json e gera fontes.json e o marketplace.
// Uso: node scripts/importar.mjs "<pasta do clone do wshobson/agents>"
// Prepara todas as cópias antes de substituir os plugins; preserva versões e metadados existentes.
// Para atualizar apenas o catálogo: node scripts/atualizar-marketplace.mjs
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { lerJson, montarMarketplace, validarManifesto, json } from './lib/marketplace.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clone = process.argv[2]
if (!clone || !fs.existsSync(path.join(clone, 'plugins'))) {
  console.log('Informe a pasta do clone do wshobson/agents.')
  process.exit(1)
}
const selecao = lerJson(path.join(raiz, 'scripts', 'selecao.json'))
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: clone, stdio: 'pipe' }).toString().trim()
const pastaLocal = path.join(os.homedir(), '.claude', 'skills')
const fontes = []
// Skills instaladas com "npx skills add" guardam a origem no .skill-lock.json.
let lock = {}
try { lock = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.agents', '.skill-lock.json'), 'utf8')).skills || {} } catch {}
const LICENCAS = { 'aaronontheweb/dotnet-skills': 'MIT', 'supabase/agent-skills': 'MIT', 'vercel-labs/agent-skills': 'sem licença no repositório — conferir antes de publicar' }

// Troca name, model e description no cabeçalho YAML do agente (description pode ocupar várias linhas).
// O name vira o nome do arquivo (alguns vêm com o nome do plugin de origem na frente).
function ajustarAgente(texto, { model, description }, nome) {
  const linhas = texto.split(/\r?\n/)
  const fim = linhas.indexOf('---', 1)
  if (linhas[0] !== '---' || fim < 2) throw new Error(`Cabeçalho inválido no agente ${nome}`)
  const cab = []
  for (let i = 1; i < fim; i++) {
    const l = linhas[i]
    if (/^description:/.test(l)) {
      while (i + 1 < fim && /^\s+\S/.test(linhas[i + 1])) i++
      cab.push(`description: ${JSON.stringify(description)}`)
    } else if (/^name:/.test(l)) cab.push(`name: ${nome}`)
    else if (/^model:/.test(l)) cab.push(`model: ${model}`)
    else cab.push(l)
  }
  if (!cab.some((l) => l.startsWith('model:'))) cab.push(`model: ${model}`)
  return ['---', ...cab, ...linhas.slice(fim)].join('\n')
}

// Toda remoção/movimentação fica dentro da raiz, inclusive se uma pasta existente for um atalho.
function conferirAlvo(alvo) {
  const absoluto = path.resolve(alvo)
  const dentro = (base, p) => {
    const rel = path.relative(base, p)
    return rel && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)
  }
  if (!dentro(raiz, absoluto)) throw new Error(`Destino fora do projeto: ${alvo}`)
  let existente = absoluto
  while (!fs.existsSync(existente)) existente = path.dirname(existente)
  const real = fs.realpathSync(existente)
  const raizReal = fs.realpathSync(raiz)
  if (real !== raizReal && !dentro(raizReal, real)) throw new Error(`Atalho leva para fora do projeto: ${alvo}`)
  return absoluto
}

let temporario
let manterBackup = false
try {
  temporario = fs.mkdtempSync(path.join(raiz, '.devagents-importar-'))
  const manifestos = new Map()
  const trabalhos = []
  for (const [nome, plugin] of Object.entries(selecao.plugins)) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(nome)) throw new Error(`Nome de plugin inválido: ${nome}`)
    const destino = conferirAlvo(path.join(raiz, 'plugins', nome))
    const manifesto = {
      name: nome, version: '0.1.0', author: { name: 'DevConductor' }, license: 'MIT',
      ...lerJson(path.join(destino, '.claude-plugin', 'plugin.json'), {}), description: plugin.descricao,
    }
    validarManifesto(manifesto, nome)
    manifestos.set(nome, manifesto)
    const preparado = path.join(temporario, 'novos', nome)
    const alvos = new Set()
    for (const sub of ['agents', 'skills', '.claude-plugin']) fs.mkdirSync(path.join(preparado, sub), { recursive: true })
    for (const [origem, ajuste] of Object.entries(plugin.agentes || {})) {
      const relativo = `agents/${path.basename(origem)}`
      if (alvos.has(relativo)) throw new Error(`Dois agentes no mesmo destino: ${nome}/${relativo}`)
      alvos.add(relativo)
      const texto = fs.readFileSync(path.join(clone, 'plugins', origem), 'utf8')
      fs.writeFileSync(path.join(preparado, relativo), ajustarAgente(texto, ajuste, path.basename(origem, '.md')))
      fontes.push({ destino: `plugins/${nome}/${relativo}`, origem: 'wshobson', caminho: `plugins/${origem}`, commit, alterado: 'name, model e description' })
    }
    for (const [tipo, lista] of Object.entries(plugin.skills || {})) {
      if (!['wshobson', 'local'].includes(tipo)) throw new Error(`Origem de skills desconhecida: ${tipo}`)
      for (const item of lista) {
        const relativo = `skills/${path.basename(item)}`
        if (alvos.has(relativo)) throw new Error(`Duas skills no mesmo destino: ${nome}/${relativo}`)
        alvos.add(relativo)
        const de = tipo === 'wshobson' ? path.join(clone, 'plugins', item) : path.join(pastaLocal, item)
        fs.cpSync(de, path.join(preparado, relativo), { recursive: true, dereference: true })
        const repoLocal = tipo === 'local' ? lock[item]?.source : null
        fontes.push({
          destino: `plugins/${nome}/${relativo}`,
          origem: tipo === 'wshobson' ? 'wshobson' : (repoLocal || 'local (origem desconhecida)'),
          caminho: tipo === 'wshobson' ? `plugins/${item}` : item,
          commit: tipo === 'wshobson' ? commit : null,
          licenca: tipo === 'wshobson' ? 'MIT' : (LICENCAS[repoLocal] || 'a conferir antes de publicar'), alterado: null,
        })
      }
    }
    fs.writeFileSync(path.join(preparado, '.claude-plugin', 'plugin.json'), json(manifesto))
    for (const sub of ['agents', 'skills', '.claude-plugin/plugin.json']) {
      trabalhos.push({ de: path.join(preparado, sub), para: conferirAlvo(path.join(destino, sub)) })
    }
  }
  const fontesAnteriores = lerJson(path.join(raiz, 'fontes.json'), { arquivos: [], origens: {} })
  const prefixos = [...manifestos.keys()].map((nome) => `plugins/${nome}/`)
  const preservadas = fontesAnteriores.arquivos.filter((a) => !prefixos.some((p) => a.destino.startsWith(p)))
  fs.writeFileSync(path.join(temporario, 'fontes.json'), json({
    ...fontesAnteriores, origens: { ...fontesAnteriores.origens, ...selecao.origens }, arquivos: [...preservadas, ...fontes],
  }))
  const marketplace = montarMarketplace(raiz, manifestos)
  fs.writeFileSync(path.join(temporario, 'marketplace.json'), json(marketplace))
  trabalhos.push({ de: path.join(temporario, 'fontes.json'), para: conferirAlvo(path.join(raiz, 'fontes.json')) },
    { de: path.join(temporario, 'marketplace.json'), para: conferirAlvo(path.join(raiz, '.claude-plugin', 'marketplace.json')) })

  // Os backups só são descartados quando todas as substituições terminam.
  const aplicados = []
  try {
    for (const [i, trabalho] of trabalhos.entries()) {
      conferirAlvo(trabalho.para)
      const backup = path.join(temporario, 'backups', String(i))
      fs.mkdirSync(path.dirname(backup), { recursive: true })
      const existia = fs.existsSync(trabalho.para)
      if (existia) fs.renameSync(trabalho.para, conferirAlvo(backup))
      const registro = { ...trabalho, backup: existia ? backup : null, instalado: false }
      aplicados.push(registro)
      fs.mkdirSync(path.dirname(trabalho.para), { recursive: true })
      fs.renameSync(conferirAlvo(trabalho.de), trabalho.para)
      registro.instalado = true
    }
  } catch (e) {
    for (const r of aplicados.reverse()) {
      try {
        if (r.instalado) fs.rmSync(conferirAlvo(r.para), { recursive: true, force: true })
        if (r.backup) fs.renameSync(conferirAlvo(r.backup), conferirAlvo(r.para))
      } catch { manterBackup = true }
    }
    if (manterBackup) throw new Error(`${e.message}. Recuperação incompleta; backups preservados em ${temporario}`)
    throw e
  }
  console.log(`Plugins: ${[...manifestos.keys()].join(', ')} · ${fontes.length} itens copiados · commit ${commit.slice(0, 7)} · versões preservadas`)
} catch (e) {
  console.error(`ERRO: ${e.message}`)
  process.exitCode = 1
} finally {
  if (temporario && !manterBackup) fs.rmSync(conferirAlvo(temporario), { recursive: true, force: true })
}
