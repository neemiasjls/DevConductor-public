// Liga (ou desliga) o DevConductor num projeto, só nesta máquina (escopo local: .claude/settings.local.json).
// Uso:
//   node scripts/instalar.mjs "<pasta do projeto>"               → liga: superpowers + núcleo + stacks detectadas
//   node scripts/instalar.mjs "<pasta do projeto>" --simular     → só mostra o que faria
//   node scripts/instalar.mjs "<pasta do projeto>" --desligar    → desinstala IDs atuais e legados conhecidos ali
//   --github [dono/repositório] → registra o catálogo pelo GitHub (padrão: o "origin" deste clone) em vez da
//     pasta local: a configuração do projeto não guarda caminho desta máquina e recebe atualizações do GitHub
// Os especialistas entram na próxima sessão aberta no projeto.
import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const iGithub = args.indexOf('--github')
const valorGithub = iGithub >= 0 && args[iGithub + 1] && !args[iGithub + 1].startsWith('--') ? args[iGithub + 1] : null
const projeto = args.find((a, i) => !a.startsWith('--') && !(valorGithub && i === iGithub + 1))
const simular = args.includes('--simular')
const desligar = args.includes('--desligar')
const ehRepositorio = (valor) => /^[\w.-]+\/[\w.-]+$/.test(valor)

if (!projeto || !fs.existsSync(projeto) || !fs.statSync(projeto).isDirectory()) {
  console.log('Informe a pasta do projeto. Ex.: node scripts/instalar.mjs "C:\\Users\\voce\\PROJETOS\\MeuSistema"')
  process.exit(1)
}

// De onde vem o catálogo: a pasta deste clone (padrão) ou um repositório do GitHub.
let origemCatalogo = `"${raiz}"`
if (iGithub >= 0) {
  let repositorio = valorGithub
  if (!repositorio) {
    try {
      const remoto = execFileSync('git', ['-C', raiz, 'remote', 'get-url', 'origin'], { stdio: 'pipe' }).toString().trim()
      repositorio = remoto.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/)?.[1] || null
    } catch { repositorio = null }
  }
  if (!repositorio || !ehRepositorio(repositorio)) {
    console.error(`--github precisa de dono/repositório do GitHub (ex.: --github fulano/DevConductor)` +
      (valorGithub ? `; recebi "${valorGithub}".` : '; este clone não tem "origin" no GitHub.'))
    process.exit(1)
  }
  origemCatalogo = repositorio
}

const claude = (comando) => {
  if (simular) { console.log(`  (simulação) claude ${comando}`); return { ok: true, saida: '' } }
  try {
    const saida = execSync(`claude ${comando}`, { cwd: projeto, shell: true, stdio: 'pipe', timeout: 120000 }).toString()
    return { ok: true, saida }
  } catch (e) {
    return { ok: false, saida: erroDoProcesso(e) }
  }
}
const linha = (saida) => saida.trim().split('\n').filter(Boolean).pop() || ''
const erroDoProcesso = (e) => [e.stdout?.toString(), e.stderr?.toString()].filter((s) => s?.trim()).join('\n') || e.message
const exigir = (etapa, resultado) => {
  if (!resultado.ok) {
    throw new Error(`${etapa}: ERRO: ${resultado.saida.trim()}`)
  }
  return linha(resultado.saida) || 'ok'
}

const marketplace = JSON.parse(fs.readFileSync(path.join(raiz, '.claude-plugin', 'marketplace.json'), 'utf8'))
const nossos = marketplace.plugins.map((p) => `${p.name}@${marketplace.name}`)
const aliases = nossos.map((atual) => ({ atual,
  antigo: `${atual.split('@')[0] === 'devconductor-core' ? 'devagents-core' : atual.split('@')[0]}@devagents`,
}))
// Máquinas de antes da troca de nome registraram esta mesma origem como "devagents". A CLI reconhece a origem e
// mantém o nome antigo, e aí o núcleo novo não é encontrado. Retirar o registro antigo vale para a máquina toda.
const LEGADO = 'devagents'
let retirouLegado = false
const nomeRegistrado = (saida) => saida.match(/Marketplace '([^']+)' already on disk/i)?.[1] ||
  saida.match(/added marketplace:\s*([\w.-]+)/i)?.[1] || null
function registrarCatalogo(temIdsAntigos) {
  const adicionar = () => claude(`plugin marketplace add ${origemCatalogo} --scope local`)
  let r = adicionar()
  exigir('catálogo', r)
  if (simular) {
    if (temIdsAntigos) console.log(`  (simulação) se esta máquina registrou o catálogo como "${LEGADO}", ele será retirado e ` +
      `registrado de novo como "${marketplace.name}" (vale para a máquina toda)`)
    return linha(r.saida) || 'ok'
  }
  if (marketplace.name === LEGADO || nomeRegistrado(r.saida) !== LEGADO) return linha(r.saida) || 'ok'
  exigir('catálogo antigo', claude(`plugin marketplace remove ${LEGADO} --scope local`))
  retirouLegado = true
  r = adicionar()
  exigir('catálogo', r)
  if (nomeRegistrado(r.saida) === LEGADO) {
    throw new Error(`catálogo: ERRO: "${LEGADO}" continua declarado em outro escopo (settings.json do projeto ou do usuário). ` +
      `Troque para "${marketplace.name}" ou rode "claude plugin marketplace remove ${LEGADO}" e tente de novo.`)
  }
  console.log(`  catálogo antigo: "${LEGADO}" retirado desta máquina; outros projetos que ainda usam @${LEGADO} precisam rodar este instalador`)
  return linha(r.saida) || 'ok'
}
const metodo = 'superpowers@claude-plugins-official'
const nucleo = `devconductor-core@${marketplace.name}`

console.log(`DevConductor → ${path.basename(path.resolve(projeto))}`)

if (desligar) {
  const falhas = []
  for (const id of [...new Set([...nossos, ...aliases.map((a) => a.antigo), metodo])]) {
    const r = claude(`plugin uninstall ${id} --scope local`)
    const ausente = r.saida.split(/\r?\n/).some((l) =>
      l.includes(id) && /\bplugin\b.*\bnot (found|installed)\b/i.test(l))
    if (!r.ok && !ausente) {
      falhas.push(id)
      console.error(`  ${id}: ERRO: ${r.saida.trim()}`)
    } else if (!ausente) console.log(`  ${id}: ${linha(r.saida) || 'ok'}`)
  }
  if (falhas.length) {
    console.error(`Desativação incompleta: ${falhas.length} plugin(s) não puderam ser removidos.`)
    process.exit(1)
  }
  console.log(simular ? 'Simulação concluída. Nenhum plugin foi removido.' :
    'Pronto. O marketplace continua registrado (não pesa nada); os plugins saíram deste projeto.')
  process.exit(0)
}

const pastaConfig = path.join(path.resolve(projeto), '.claude')
const arquivoLocal = path.join(pastaConfig, 'settings.local.json')
const objeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor)
const possui = (obj, chave) => Object.hasOwn(obj, chave)

function lerConfiguracao(arquivo) {
  if (!fs.existsSync(arquivo)) return { dados: {}, bytes: null }
  if (fs.lstatSync(arquivo).isSymbolicLink()) throw new Error(`Configuração por link não será alterada: ${arquivo}`)
  const bytes = fs.readFileSync(arquivo)
  const dados = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''))
  if (!objeto(dados) || (possui(dados, 'enabledPlugins') && !objeto(dados.enabledPlugins))) {
    throw new Error(`Configuração inválida: ${arquivo}`)
  }
  return { dados, bytes }
}

// Grava somente o arquivo local. A troca evita deixar um JSON parcial se a escrita falhar.
function gravarLocal(bytes) {
  fs.mkdirSync(pastaConfig, { recursive: true })
  const temporario = `${arquivoLocal}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporario, bytes, { flag: 'wx' })
    fs.renameSync(temporario, arquivoLocal)
  } finally {
    fs.rmSync(temporario, { force: true })
  }
}

let antesLocal
const pastaExistia = fs.existsSync(pastaConfig)
try {
  if (pastaExistia && fs.lstatSync(pastaConfig).isSymbolicLink()) {
    throw new Error(`Pasta de configuração por link não será alterada: ${pastaConfig}`)
  }
  const compartilhada = lerConfiguracao(path.join(pastaConfig, 'settings.json')).dados.enabledPlugins || {}
  const local = lerConfiguracao(arquivoLocal)
  antesLocal = local.bytes
  const locais = local.dados.enabledPlugins || {}
  // Escopo local prevalece; no mesmo escopo, a escolha explícita do ID novo prevalece sobre o legado.
  const escolha = (atual, antigo) => {
    for (const config of [locais, compartilhada]) {
      for (const id of [atual, antigo].filter(Boolean)) {
        if (!possui(config, id)) continue
        if (typeof config[id] !== 'boolean') throw new Error(`enabledPlugins inválido para ${id}: use true ou false.`)
        return config[id]
      }
    }
    return undefined
  }
  const migracoes = aliases.filter(({ antigo }) => possui(locais, antigo) || possui(compartilhada, antigo))
    .map(({ atual, antigo }) => ({ atual, antigo, habilitado: escolha(atual, antigo) }))
  const instalar = new Set()
  for (const id of [metodo, nucleo]) {
    const antigo = aliases.find((a) => a.atual === id)?.antigo
    if (escolha(id, antigo) !== false) instalar.add(id)
    else console.log(`  ${id}: desativação explícita preservada`)
  }
  for (const { atual, habilitado } of migracoes) if (habilitado) instalar.add(atual)

  console.log(`  catálogo: ${registrarCatalogo(migracoes.length > 0)}`)
  console.log(`  catálogo oficial: ${exigir('catálogo oficial', claude('plugin marketplace add anthropics/claude-plugins-official --scope local'))}`)
  for (const id of instalar) {
    console.log(`  ${id}: ${exigir(id, claude(`plugin install ${id} --scope local`))}`)
  }
  // Só depois de instalar todos os substitutos, aplica a migração local. O false legado também mascara
  // habilitações do settings.json compartilhado, que não é reescrito. O hook nunca faz esta migração.
  if (migracoes.length) {
    if (!simular) {
      const configuracao = lerConfiguracao(arquivoLocal).dados
      const enabledPlugins = { ...configuracao.enabledPlugins }
      for (const { atual, antigo, habilitado } of migracoes) {
        enabledPlugins[atual] = habilitado
        enabledPlugins[antigo] = false
      }
      gravarLocal(JSON.stringify({ ...configuracao, enabledPlugins }, null, 2) + '\n')
    }
    for (const { atual, antigo, habilitado } of migracoes) {
      console.log(`  ${simular ? '(simulação) ' : ''}migração: ${antigo} → ${atual} (${habilitado ? 'ligado' : 'desligado'}); legado desativado localmente`)
    }
  }

  const detector = path.join(raiz, 'plugins', 'devconductor-core', 'hooks', 'detectar-stack.mjs')
  try {
    const saida = execFileSync(process.execPath, [detector, '--projeto', path.resolve(projeto), ...(simular ? ['--dry-run'] : [])],
      { stdio: 'pipe', timeout: 600000 }).toString().trim()
    console.log(`  stacks: ${saida || 'nenhuma stack nova detectada (ou já estavam ligadas)'}`)
  } catch (e) {
    exigir('stacks', { ok: false, saida: erroDoProcesso(e) })
  }
  console.log(simular ? 'Simulação concluída. Nenhuma configuração foi alterada.' :
    'Abra uma sessão nova nesse projeto para os plugins carregarem.')
} catch (erro) {
  console.error(`  ${erro.message}`)
  // A CLI pode gravar enabledPlugins antes de uma etapa posterior falhar. Restaura os bytes originais,
  // inclusive opt-outs e campos alheios, sem desinstalar o legado nem tocar configuração global.
  if (!simular && antesLocal !== undefined) {
    try {
      if (antesLocal === null) {
        fs.rmSync(arquivoLocal, { force: true })
        if (!pastaExistia && fs.existsSync(pastaConfig) && fs.readdirSync(pastaConfig).length === 0) fs.rmdirSync(pastaConfig)
      } else if (!fs.existsSync(arquivoLocal) || !fs.readFileSync(arquivoLocal).equals(antesLocal)) gravarLocal(antesLocal)
    } catch (restauracao) {
      console.error(`  Falha ao restaurar a configuração local: ${restauracao.message}`)
    }
  }
  // A CLI nomeia o catálogo pelo arquivo dele: readicionar a mesma origem já volta com o nome novo.
  if (retirouLegado) console.error(`  O catálogo antigo já foi retirado desta máquina e não volta com o nome "${LEGADO}"; ` +
    'corrija o erro e rode este instalador de novo para concluir a migração.')
  console.error('Operação incompleta. Corrija o erro antes de tentar novamente.')
  process.exitCode = 1
}
