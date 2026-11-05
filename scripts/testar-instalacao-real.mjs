// Exercita a CLI real sem sessão do modelo, Paper ou credenciais copiadas.
// Uso: node scripts/testar-instalacao-real.mjs [--github | --sem-clone]
// Mantém projeto, configuração isolada, logs e relatório em pilotos/ para inspeção.
// --github: o catálogo vem do repositório no GitHub (o "origin" do clone), como numa máquina sem esta pasta.
// --sem-clone: segue o README para máquina sem o clone (4 comandos da CLI) e simula a primeira sessão rodando
//   o hook do núcleo instalado; confere que as stacks entram sozinhas e que repetir não muda nada.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modo = process.argv.length === 3 && ['--github', '--sem-clone'].includes(process.argv[2]) ? process.argv[2] : null
const pelaGithub = modo === '--github'
const semClone = modo === '--sem-clone'
if (process.argv.length > 2 && !modo) {
  const ajuda = process.argv.length === 3 && ['--help', '--ajuda'].includes(process.argv[2])
  console.log('Uso: node scripts/testar-instalacao-real.mjs [--github | --sem-clone]\n' +
    'Instala duas vezes e desliga duas vezes em piloto isolado. Preserva logs e relatório em pilotos/.\n' +
    '--github: catálogo pelo repositório do GitHub em vez da pasta local.\n' +
    '--sem-clone: só a CLI e o hook do núcleo, como numa máquina sem esta pasta.')
  process.exit(ajuda ? 0 : 1)
}

fs.mkdirSync(path.join(raiz, 'pilotos'), { recursive: true })
const pasta = fs.mkdtempSync(path.join(raiz, 'pilotos', 'instalacao-real-'))
const projeto = path.join(pasta, 'projeto com espacos')
const config = path.join(pasta, 'config-claude')
const logs = path.join(pasta, 'logs')
const esperados = ['devconductor-core@devconductor', 'superpowers@claude-plugins-official',
  'stack-typescript@devconductor', 'seguranca@devconductor'].sort()
const sha256 = (valor) => createHash('sha256').update(valor).digest('hex')
const arquivoRelativo = (arquivo) => path.relative(pasta, arquivo).replaceAll('\\', '/')
const sanitizar = (texto) => {
  let saida = String(texto)
  for (const [origem, nome] of [[pasta, '<piloto>'], [raiz, '<devconductor>'], [os.homedir(), '<usuario>']]) {
    for (const variante of new Set([origem, origem.replaceAll('\\', '/'), origem.replaceAll('\\', '\\\\')])) {
      saida = saida.replaceAll(variante, nome)
    }
  }
  return saida.replace(/\bBearer\s+[^\s"']+/gi, 'Bearer <omitido>')
    .replace(/\bsk-ant-[A-Za-z0-9_-]+/g, '<omitido>')
}

const env = { ...process.env }
for (const nome of Object.keys(env)) {
  if (/^(ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|CLAUDE_CODE_OAUTH_TOKEN|CLAUDE_CODE_OAUTH_TOKEN_FILE)$/i.test(nome)) {
    delete env[nome]
  }
}
Object.assign(env, {
  CLAUDE_CONFIG_DIR: config,
  CLAUDE_PROJECT_DIR: projeto,
  CLAUDE_CODE_PLUGIN_CACHE_DIR: path.join(config, 'plugins'),
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL: '1',
  CLAUDE_CODE_PLUGIN_PREFER_HTTPS: '1',
  GIT_TERMINAL_PROMPT: '0',
})

// Só metadados/configuração globais: calcula hashes sem imprimir ou copiar conteúdo.
const monitorados = new Map([['usuario/claude.json', path.join(os.homedir(), '.claude.json')]])
const configuracoes = new Map([['padrao', path.join(os.homedir(), '.claude')]])
if (process.env.CLAUDE_CONFIG_DIR &&
    path.resolve(process.env.CLAUDE_CONFIG_DIR) !== path.resolve(os.homedir(), '.claude')) {
  configuracoes.set('config-herdada', path.resolve(process.env.CLAUDE_CONFIG_DIR))
}
for (const [nome, diretorio] of configuracoes) {
  for (const relativo of ['settings.json', 'settings.local.json', '.claude.json',
    'plugins/known_marketplaces.json', 'plugins/installed_plugins.json']) {
    monitorados.set(`${nome}/${relativo}`, path.join(diretorio, relativo))
  }
}
const retratoGlobal = () => Object.fromEntries([...monitorados].map(([nome, arquivo]) =>
  [nome, fs.existsSync(arquivo) ? sha256(fs.readFileSync(arquivo)) : null]))
const globaisAntes = retratoGlobal()
const relatorio = {
  versao: 1,
  resultado: 'em-andamento',
  isolamento: {
    configuracao: arquivoRelativo(config),
    projeto: arquivoRelativo(projeto),
    credenciaisCopiadas: false,
    sessaoDeModelo: false,
    paper: false,
    marketplaceOficialAutomatico: false,
  },
  origemCatalogo: pelaGithub || semClone ? 'github' : 'pasta',
  semClone,
  pluginsEsperados: esperados,
  globaisAntes,
  etapas: [],
}
const salvar = () => fs.writeFileSync(path.join(pasta, 'relatorio.json'),
  JSON.stringify(relatorio, null, 2) + '\n')
const conferirGlobais = () => {
  const depois = retratoGlobal()
  const alterados = Object.keys(globaisAntes).filter((nome) => globaisAntes[nome] !== depois[nome])
  relatorio.globaisDepois = depois
  relatorio.globaisPreservados = alterados.length === 0
  relatorio.globaisAlterados = alterados
  assert.equal(alterados.length, 0, `Configuração global alterada: ${alterados.join(', ')}`)
}
const ordenar = (valor) => Array.isArray(valor) ? valor.map(ordenar) :
  valor && typeof valor === 'object' ? Object.fromEntries(Object.keys(valor).sort().map((chave) =>
    [chave, ordenar(valor[chave])])) : valor
const lerEstado = () => {
  const local = path.join(projeto, '.claude', 'settings.local.json')
  assert.ok(fs.existsSync(local), 'Faltou .claude/settings.local.json no projeto piloto')
  assert.ok(!fs.existsSync(path.join(projeto, '.claude', 'settings.json')),
    'A instalação local criou settings.json compartilhado')
  const settings = JSON.parse(fs.readFileSync(local, 'utf8'))
  const plugins = settings.enabledPlugins || {}
  return {
    enabledPlugins: ordenar(plugins),
    settingsSha256: sha256(JSON.stringify(ordenar(settings))),
  }
}

// O timeout encerra a árvore inteira, evitando CLI/git órfãos após matar só o instalador.
async function executar(etapa, comando, args, timeoutMs = 120000, envExtra = {}) {
  const inicio = Date.now()
  console.log(`  ${etapa}...`)
  const resultado = await new Promise((resolve) => {
    const filho = spawn(comando, args, {
      cwd: projeto, env: { ...env, ...envExtra }, windowsHide: true, detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const partes = []
    let erro = null
    let excedeuTempo = false
    let excedeuSaida = false
    let bytes = 0
    const encerrar = () => {
      if (!filho.pid) return
      if (process.platform === 'win32') {
        const fim = spawnSync('taskkill', ['/PID', String(filho.pid), '/T', '/F'], {
          windowsHide: true, encoding: 'utf8', timeout: 10000,
        })
        if (fim.error || fim.status !== 0) erro ||= new Error('Falha ao encerrar árvore de processos')
      } else {
        try { process.kill(-filho.pid, 'SIGKILL') } catch (e) {
          if (e.code !== 'ESRCH') erro ||= e
        }
      }
    }
    const timer = setTimeout(() => { excedeuTempo = true; encerrar() }, timeoutMs)
    const receber = (trecho) => {
      bytes += trecho.length
      if (bytes <= 10 * 1024 * 1024) partes.push(trecho)
      else if (!excedeuSaida) { excedeuSaida = true; encerrar() }
    }
    filho.stdout.on('data', receber)
    filho.stderr.on('data', receber)
    filho.on('error', (e) => { erro = e })
    filho.on('close', (codigo, sinal) => {
      clearTimeout(timer)
      resolve({ codigo, sinal, erro, excedeuTempo, excedeuSaida, saida: Buffer.concat(partes).toString('utf8') })
    })
  })
  const log = path.join(logs, `${String(relatorio.etapas.length + 1).padStart(2, '0')}-${etapa}.log`)
  fs.writeFileSync(log, sanitizar(resultado.saida + (resultado.erro ? `\n${resultado.erro.message}` : '')))
  const registro = {
    nome: etapa, codigo: resultado.codigo, sinal: resultado.sinal,
    duracaoMs: Date.now() - inicio, timeoutMs, timeout: resultado.excedeuTempo,
    limiteSaida: resultado.excedeuSaida, log: arquivoRelativo(log),
  }
  relatorio.etapas.push(registro)
  conferirGlobais()
  salvar()
  assert.ok(!resultado.excedeuTempo, `${etapa}: passou de ${timeoutMs / 1000} segundos; consulte ${arquivoRelativo(log)}`)
  assert.ok(!resultado.excedeuSaida, `${etapa}: saída acima do limite; consulte ${arquivoRelativo(log)}`)
  assert.ok(!resultado.erro, `${etapa}: ${sanitizar(resultado.erro?.message || '')}`)
  assert.equal(resultado.codigo, 0, `${etapa}: falhou; consulte ${arquivoRelativo(log)}`)
  console.log(`  ${etapa}: ok`)
  return registro
}

try {
  for (const dir of [projeto, config, logs, path.join(projeto, 'src')]) fs.mkdirSync(dir, { recursive: true })
  assert.equal(fs.readdirSync(config).length, 0, 'Configuração isolada deve começar vazia')
  fs.writeFileSync(path.join(projeto, 'package.json'), JSON.stringify({
    name: 'piloto-instalacao-devconductor', private: true, type: 'module',
    dependencies: { express: '5.0.0' }, devDependencies: { typescript: '5.7.0' },
  }, null, 2) + '\n')
  fs.writeFileSync(path.join(projeto, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, target: 'ES2022', module: 'NodeNext' }, include: ['src'],
  }, null, 2) + '\n')
  fs.writeFileSync(path.join(projeto, 'src', 'index.ts'), 'export const piloto: string = "instalacao-real"\n')
  salvar()

  await executar('git-init', 'git', ['init', '-q'], 60000)
  if (semClone) await testarSemClone()
  else await testarInstalador()
  relatorio.resultado = 'aprovado'
} catch (e) {
  relatorio.resultado = 'falhou'
  relatorio.erro = sanitizar(e.message)
  console.error(`  ERRO: ${relatorio.erro}`)
  process.exitCode = 1
} finally {
  try { conferirGlobais() } catch (e) {
    relatorio.resultado = 'falhou'
    relatorio.erroGlobal = sanitizar(e.message)
    console.error(`  ERRO: ${relatorio.erroGlobal}`)
    process.exitCode = 1
  }
  salvar()
  console.log(`Relatório: pilotos/${path.basename(pasta)}/relatorio.json`)
  console.log(`Piloto preservado. Resultado: ${relatorio.resultado}.`)
}

function conferirSemCaminhoLocal() {
  // Nada do caminho desta máquina pode ficar na configuração do projeto.
  const bruto = fs.readFileSync(path.join(projeto, '.claude', 'settings.local.json'), 'utf8')
  for (const variante of new Set([raiz, raiz.replaceAll('\\', '/'), raiz.replaceAll('\\', '\\\\')])) {
    assert.ok(!bruto.includes(variante), 'A configuração do projeto guardou o caminho da pasta local')
  }
  relatorio.semCaminhoLocal = true
}

function conferirQuatroPlugins(estado) {
  const ativos = Object.keys(estado.enabledPlugins).filter((id) => estado.enabledPlugins[id] === true).sort()
  assert.deepEqual(ativos, esperados, 'Plugins ativos diferem dos quatro esperados no projeto TS/Express')
  assert.deepEqual(Object.keys(estado.enabledPlugins).sort(), esperados,
    'A configuração local contém plugins além dos quatro esperados')
}

// Caminho do README para máquina sem o clone: só a CLI; as stacks vêm do hook do núcleo na primeira sessão.
async function testarSemClone() {
  const remoto = spawnSync('git', ['-C', raiz, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).stdout.trim()
  const repositorio = remoto.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/)?.[1]
  assert.ok(repositorio, 'O clone precisa de um "origin" no GitHub para este teste')
  // No Windows o comando é claude.cmd, que só roda pelo cmd.exe.
  const cli = (etapa, ...a) => process.platform === 'win32'
    ? executar(etapa, process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'claude', ...a])
    : executar(etapa, 'claude', a)
  await cli('catalogo-github', 'plugin', 'marketplace', 'add', repositorio, '--scope', 'local')
  await cli('catalogo-oficial', 'plugin', 'marketplace', 'add', 'anthropics/claude-plugins-official', '--scope', 'local')
  await cli('superpowers', 'plugin', 'install', 'superpowers@claude-plugins-official', '--scope', 'local')
  await cli('nucleo', 'plugin', 'install', 'devconductor-core@devconductor', '--scope', 'local')

  // O hook roda do plugin instalado (cache da configuração isolada), não do clone.
  const instalados = JSON.parse(fs.readFileSync(path.join(config, 'plugins', 'installed_plugins.json'), 'utf8'))
  const nucleo = [].concat(instalados.plugins?.['devconductor-core@devconductor'] || []).find((r) => r.installPath)
  assert.ok(nucleo, 'Núcleo não aparece em installed_plugins.json')
  const raizPlugin = path.resolve(nucleo.installPath)
  assert.ok(!raizPlugin.startsWith(path.resolve(raiz) + path.sep) || raizPlugin.startsWith(path.resolve(config) + path.sep),
    'O núcleo instalado aponta para o clone, não para o cache')
  const hook = path.join(raizPlugin, 'hooks', 'detectar-stack.mjs')
  const envHook = { CLAUDE_PLUGIN_ROOT: raizPlugin }
  relatorio.hookDoCache = arquivoRelativo(hook)

  const primeira = await executar('primeira-sessao', process.execPath, [hook], 600000, envHook)
  primeira.estado = lerEstado()
  conferirSemCaminhoLocal()
  conferirQuatroPlugins(primeira.estado)
  salvar()

  const segunda = await executar('segunda-sessao', process.execPath, [hook], 600000, envHook)
  segunda.estado = lerEstado()
  assert.deepEqual(segunda.estado, primeira.estado, 'Abrir outra sessão alterou as configurações locais')
  relatorio.hookIdempotente = true
  salvar()

  // Limpeza: desliga pelo instalador (tira tudo do projeto piloto).
  const instalador = path.join(raiz, 'scripts', 'instalar.mjs')
  const desligada = await executar('desligar', process.execPath, [instalador, projeto, '--desligar'])
  desligada.estado = lerEstado()
  for (const id of esperados) assert.notEqual(desligada.estado.enabledPlugins[id], true, `Plugin ainda ligado: ${id}`)
}

async function testarInstalador() {
  const instalador = path.join(raiz, 'scripts', 'instalar.mjs')
  const extra = pelaGithub ? ['--github'] : []
  const primeira = await executar('instalar', process.execPath, [instalador, projeto, ...extra])
  primeira.estado = lerEstado()
  if (pelaGithub) conferirSemCaminhoLocal()
  conferirQuatroPlugins(primeira.estado)
  salvar()

  const segunda = await executar('reinstalar', process.execPath, [instalador, projeto, ...extra])
  segunda.estado = lerEstado()
  assert.deepEqual(segunda.estado, primeira.estado, 'Reinstalação alterou as configurações locais')
  relatorio.instalacaoIdempotente = true
  salvar()

  const desligada = await executar('desligar', process.execPath, [instalador, projeto, '--desligar'])
  desligada.estado = lerEstado()
  for (const id of esperados) assert.notEqual(desligada.estado.enabledPlugins[id], true, `Plugin ainda ligado: ${id}`)
  salvar()

  const repetida = await executar('desligar-novamente', process.execPath, [instalador, projeto, '--desligar'])
  repetida.estado = lerEstado()
  assert.deepEqual(repetida.estado, desligada.estado, 'Segunda desativação alterou as configurações locais')
  relatorio.desativacaoIdempotente = true
}
