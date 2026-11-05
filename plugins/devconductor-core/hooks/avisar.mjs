// Aviso na tela quando o Claude para e precisa de você (pede permissão ou terminou e espera a próxima mensagem).
// Hook Notification: notificação do sistema (Windows: balão do Windows; macOS: Central de Notificações; Linux:
// notify-send). Não aparece na nuvem nem no app do Claude, que já avisam sozinhos. Desligar: DEVCONDUCTOR_AVISO=0 (o nome antigo DEVAGENTS_AVISO ainda vale).
// Nunca falha a sessão: qualquer erro vira silêncio.
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const TEXTOS = {
  permission_prompt: 'O Claude precisa da sua permissão para continuar.',
  idle_prompt: 'O Claude terminou e está esperando você.',
  elicitation_dialog: 'O Claude está esperando uma resposta sua.',
}

// Balão nativo do Windows pelo PowerShell 5.1 (vem no Windows; sem módulo extra). Título e texto chegam por
// variável de ambiente, nunca no código, então nada do texto vira comando. Sem balão, toca o som de alerta.
const TOAST_WINDOWS = `
try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
  $esc = [Security.SecurityElement]
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$($esc::Escape($env:DA_TITULO))</text><text>$($esc::Escape($env:DA_TEXTO))</text></binding></visual></toast>")
  $app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
} catch { [System.Media.SystemSounds]::Exclamation.Play(); Start-Sleep -Milliseconds 800 }
`

// Decide o aviso (ou null) sem executar nada: separado para os testes.
export function montarAviso(evento, { plataforma = process.platform, env = process.env, projeto } = {}) {
  if (/^(0|false|nao|não|off)$/i.test(env.DEVCONDUCTOR_AVISO ?? env.DEVAGENTS_AVISO ?? '')) return null
  if (/^(1|true)$/i.test(env.CLAUDE_CODE_REMOTE ?? '')) return null // nuvem: não há tela para avisar
  if (/desktop/i.test(env.CLAUDE_CODE_ENTRYPOINT ?? '')) return null // o app do Claude já avisa
  const tipo = evento?.notification_type
  if (tipo === 'auth_success') return null
  const texto = TEXTOS[tipo] ?? String(evento?.message ?? '').trim()
  if (!texto) return null
  // Nome da pasta com \ ou / (o caminho pode vir do Windows mesmo com o teste rodando no Linux).
  const pasta = String(projeto || evento?.cwd || env.CLAUDE_PROJECT_DIR || '').split(/[\\/]/).filter(Boolean).pop() || 'projeto'
  const titulo = `Claude · ${pasta}`
  const vars = { ...env, DA_TITULO: titulo, DA_TEXTO: texto }
  if (plataforma === 'win32') {
    const codificado = Buffer.from(TOAST_WINDOWS, 'utf16le').toString('base64')
    return { cmd: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', codificado], env: vars, titulo, texto }
  }
  if (plataforma === 'darwin') {
    return { cmd: 'osascript', args: ['-e', 'display notification (system attribute "DA_TEXTO") with title (system attribute "DA_TITULO")'], env: vars, titulo, texto }
  }
  if (!env.DISPLAY && !env.WAYLAND_DISPLAY) return null // Linux sem tela (servidor, SSH)
  return { cmd: 'notify-send', args: ['--app-name=Claude Code', titulo, texto], env: vars, titulo, texto }
}

async function principal() {
  let entrada = ''
  for await (const pedaco of process.stdin) entrada += pedaco
  let evento = {}
  try { evento = JSON.parse(entrada || '{}') } catch { return }
  const aviso = montarAviso(evento)
  if (!aviso) return
  // Em segundo plano: o hook volta na hora e o balão aparece sozinho.
  const filho = spawn(aviso.cmd, aviso.args, { env: aviso.env, detached: true, stdio: 'ignore', windowsHide: true })
  filho.on('error', () => {}) // comando ausente (ex.: Linux sem notify-send): fica sem aviso
  filho.unref()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch(() => {}).finally(() => { process.exitCode = 0 })
}
