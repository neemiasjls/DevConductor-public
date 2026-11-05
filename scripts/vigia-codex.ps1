# Vigia de revisão: o Codex revisa cada commit novo que o Claude (nuvem) envia para a branch de trabalho.
# A cada N minutos faz git fetch (sem custo). Só quando há commit novo chama o Codex, em modo só leitura,
# e envia a revisão para a branch codex/revisoes (pasta revisoes/), onde o Claude lê.
# Não faz checkout na pasta do projeto: o trabalho local não é tocado. Parar: Ctrl+C.
# Uso: pwsh -File scripts/vigia-codex.ps1 [-Branch <branch>] [-Minutos 3]
param(
  [string]$Repo = (Resolve-Path "$PSScriptRoot\..").Path,
  [string]$Branch = 'claude/ecstatic-dijkstra-ue2959',
  [double]$Minutos = 3
)
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Text.UTF8Encoding]::new($false)

$Revisoes = 'codex/revisoes'
$Pasta = Join-Path (Split-Path $Repo -Parent) "$(Split-Path $Repo -Leaf)-revisoes"
$Marca = Join-Path $Pasta 'revisoes\ultimo.txt'
function Hora { Get-Date -Format 'HH:mm:ss' }

# Pasta separada (worktree) só para as revisões, na branch codex/revisoes.
git -C $Repo fetch -q origin $Branch
if (-not (Test-Path $Pasta)) {
  if (git -C $Repo ls-remote --heads origin $Revisoes) {
    git -C $Repo fetch -q origin "${Revisoes}:${Revisoes}"
    git -C $Repo worktree add $Pasta $Revisoes
  } else {
    git -C $Repo worktree add --no-track -b $Revisoes $Pasta "origin/$Branch"
  }
  if ($LASTEXITCODE -ne 0) { throw "Não consegui criar a pasta de revisões ($Pasta). Corrija o erro acima e rode de novo." }
}
$ramo = (git -C $Pasta rev-parse --abbrev-ref HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or "$ramo".Trim() -ne $Revisoes) {
  throw "$Pasta existe mas não é o worktree da branch $Revisoes. Apague a pasta (e rode 'git worktree prune') ou corrija, e rode de novo."
}
New-Item -ItemType Directory -Force (Join-Path $Pasta 'revisoes') -ErrorAction Stop | Out-Null

# Envia o que ficou só no computador (push que falhou antes). Push sem nada novo não faz nada.
$pendente = $true
function Publicar {
  git -C $Pasta push -q -u origin $Revisoes 2>&1 | Out-Host
  if ($LASTEXITCODE -eq 0) { $script:pendente = $false; return $true }
  $script:pendente = $true
  Write-Host "[$(Hora)] Push das revisões falhou; tento de novo na próxima volta."
  return $false
}

Write-Host "[$(Hora)] Vigiando origin/$Branch a cada $Minutos min. Revisões em $Pasta\revisoes. Ctrl+C para parar."
while ($true) {
  if ($pendente) { [void](Publicar) }
  git -C $Repo fetch -q origin $Branch
  $novo = (git -C $Repo rev-parse "origin/$Branch").Trim()
  $ultimo = if (Test-Path $Marca) { (Get-Content $Marca -Raw).Trim() } else { '' }
  if ($novo -and $novo -ne $ultimo) {
    # Primeira vez: revisa tudo que a branch tem a mais que a main.
    $base = if ($ultimo) { $ultimo } else { (git -C $Repo merge-base origin/main "origin/$Branch").Trim() }
    $curto = $novo.Substring(0, 7)
    $saida = Join-Path $Pasta "revisoes\$curto.md"
    Write-Host "[$(Hora)] Commit novo $curto. Codex revisando $($base.Substring(0,7))..$curto"
    $pedido = @"
Voce e o revisor do DevConductor. O Claude (na nuvem) enviou commits para origin/$Branch.
Revise SO a diferenca: git diff $base $novo (e git log $base..$novo para as mensagens).
Nao faca checkout, nao edite nada, nao rode push. Leia arquivos inteiros so quando o diff nao bastar.
Procure: bugs, quebra no Windows (caminhos, PowerShell, encoding), testes faltando ou que vao falhar,
risco de seguranca, contradicao com docs/decisoes.md e com as skills do projeto, e texto confuso para o usuario.
Ignore gosto pessoal e estilo.
Responda em portugues, curto, neste formato:
# Revisao $curto
Veredito: OK | AJUSTAR | BLOQUEAR
- [ALTO|MEDIO|BAIXO] arquivo:linha - problema - sugestao
Se nao houver nada: "Nada a apontar." Maximo 15 itens.
"@
    $pedido | codex exec -s read-only --ephemeral -C $Repo -o $saida - *> $null
    if ((Test-Path $saida) -and (Get-Item $saida).Length -gt 0) {
      # Revisão e marca vão juntas no mesmo commit; se o commit falhar, a marca volta e o commit é revisado de novo.
      Set-Content -Path $Marca -Value $novo -Encoding utf8
      git -C $Pasta add revisoes
      git -C $Pasta commit -q -m "docs: revisao de $curto"
      if ($LASTEXITCODE -ne 0) {
        if ($ultimo) { Set-Content -Path $Marca -Value $ultimo -Encoding utf8 } else { Remove-Item $Marca -Force }
        Write-Host "[$(Hora)] Não consegui gravar a revisão de $curto; tento de novo na próxima volta."
      } elseif (Publicar) {
        Write-Host "[$(Hora)] Revisão enviada: revisoes/$curto.md"
        Get-Content $saida -TotalCount 6 | ForEach-Object { Write-Host "  $_" }
      }
    } else {
      Write-Host "[$(Hora)] Codex não respondeu; tento de novo na próxima volta."
    }
  }
  Start-Sleep -Milliseconds ([int]($Minutos * 60000))
}
