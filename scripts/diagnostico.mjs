// Mostra o que esta máquina tem e o que falta para cada parte do DevConductor funcionar, com o comando para instalar.
// Não instala nem muda nada. Uso: node scripts/diagnostico.mjs [--json]
// Saída: código 0 se o obrigatório está ok (mesmo faltando opcionais); 1 se falta algo obrigatório.
import { spawnSync } from 'node:child_process'
import { usarShell } from './lib/processo.mjs'

const comoJson = process.argv.includes('--json')
const windows = process.platform === 'win32'

// Roda um comando e devolve a 1ª linha da saída (ou null se não existir / falhar). Shell: ver lib/processo.mjs.
function versao(cmd, args = ['--version']) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 20000, windowsHide: true, shell: usarShell(args, windows) })
  if (r.error || r.status !== 0) return null
  return (r.stdout || r.stderr || '').trim().split(/\r?\n/)[0] || 'ok'
}
const primeiro = (...tentativas) => { for (const [c, a] of tentativas) { const v = versao(c, a); if (v) return v } return null }

const itens = [
  {
    nome: 'Node.js 20+', para: 'scripts, hooks e testes', obrigatorio: true,
    achado: (() => { const m = process.versions.node.split('.').map(Number); return m[0] >= 20 ? `v${process.versions.node}` : null })(),
    instalar: 'https://nodejs.org (versão LTS)',
  },
  { nome: 'Git', para: 'catálogo, worktrees e o hook do grafo', obrigatorio: true, achado: versao('git'), instalar: windows ? 'winget install Git.Git' : 'pelo gerenciador de pacotes do sistema' },
  { nome: 'Claude Code (CLI)', para: 'instalar e validar os plugins', obrigatorio: true, achado: versao('claude'), instalar: 'npm install -g @anthropic-ai/claude-code' },
  {
    nome: 'uv (ou Python com pyyaml)', para: 'verificação de segurança das skills instaladas (DEV-23)', obrigatorio: false,
    achado: versao('uv') ?? primeiro(['python3', ['-c', 'import yaml;print("python + pyyaml")']], ['python', ['-c', 'import yaml;print("python + pyyaml")']]),
    instalar: windows ? 'winget install astral-sh.uv' : 'curl -LsSf https://astral.sh/uv/install.sh | sh',
  },
  {
    nome: 'Graphify', para: 'grafo do código em projeto grande (DEV-21)', obrigatorio: false,
    achado: versao('graphify', ['--help']) ? 'instalado' : null, instalar: 'uv tool install graphifyy',
  },
  { nome: 'Codex (CLI)', para: 'codex-parceiro e o vigia de revisão (DEV-22)', obrigatorio: false, achado: versao('codex'), instalar: 'npm install -g @openai/codex  e depois  codex login' },
  {
    nome: 'PowerShell 7', para: 'vigia do Codex (scripts/vigia-codex.ps1)', obrigatorio: false,
    achado: versao('pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']), instalar: windows ? 'winget install Microsoft.PowerShell' : 'https://aka.ms/powershell',
  },
]

const faltaObrigatorio = itens.some((i) => i.obrigatorio && !i.achado)
if (comoJson) {
  console.log(JSON.stringify({ ok: !faltaObrigatorio, itens: itens.map(({ nome, para, obrigatorio, achado, instalar }) => ({ nome, para, obrigatorio, achado, instalar })) }, null, 2))
} else {
  console.log('DevConductor — diagnóstico desta máquina\n')
  for (const i of itens) {
    const marca = i.achado ? 'ok    ' : i.obrigatorio ? 'FALTA ' : 'falta '
    console.log(`${marca} ${i.nome.padEnd(26)} ${i.achado ? i.achado.slice(0, 40) : `→ ${i.instalar}`}`)
    if (!i.achado) console.log(`        usado para: ${i.para}${i.obrigatorio ? ' (obrigatório)' : ' (opcional)'}`)
  }
  console.log(faltaObrigatorio
    ? '\nFalta algo obrigatório (FALTA): instale antes de usar o DevConductor.'
    : '\nO obrigatório está ok. O que faltar acima é opcional: só a parte indicada fica desligada.')
}
process.exitCode = faltaObrigatorio ? 1 : 0
