---
name: varredura-seguranca
description: Use antes de enviar mudança que toca login, permissões, banco, dados pessoais, segredos, envio de arquivo, pagamento ou dependências, e sempre que o usuário pedir para "varrer", "checar segurança" ou "procurar senha vazada". Roda num comando as ferramentas instaladas (gitleaks, osv-scanner, dotnet, Semgrep) mais as verificações próprias do kit e grava um relatório em português simples.
---

# Varredura de segurança

Um comando junta segredos vazados, pacotes com falha conhecida e trechos de código perigosos numa lista só.
O kit **nunca baixa nem instala** ferramenta: chama o que existir na máquina e, quando falta, diz como instalar.

## Rodar

```
node "<pasta da skill>/scripts/varrer.mjs" [pasta do projeto] [--historico] [--sem-rede] [--saida <pasta>]
```

- `--historico`: também procura segredo em todos os commits antigos (`gitleaks git`). Mais lento.
- `--sem-rede`: não roda o Semgrep/Opengrep (eles baixam regras da internet).
- `--saida`: onde gravar. Padrão: `.git/devconductor/varredura/` (dentro da pasta do Git, nunca vai para o commit).

Grava `relatorio-seguranca.md` (uma linha por achado: o que é, onde, por que importa, como corrigir) e
`relatorio-seguranca.json` (a mesma lista para outro programa ler). Se o projeto passar do teto das verificações
próprias (20 mil arquivos, 100 MB ou 60 s), o relatório avisa "leitura cortada": o resto não foi conferido.

## Código de saída

| Código | Quer dizer | O que fazer |
|---|---|---|
| 0 | limpo | seguir |
| 1 | achado **alto ou crítico** | corrigir antes de enviar e varrer de novo |
| 2 | faltou (ou falhou) gitleaks ou osv-scanner | instalar o que o relatório pede; a falta nunca passa calada |

Achado grave vale mais que ferramenta faltando: com os dois, sai 1 e o relatório lista ambos.
Achado médio ou baixo não barra; fica no relatório para decidir.

## O que roda

| Ferramenta | Procura | Quando |
|---|---|---|
| gitleaks | senha, chave, token no código (saída mascarada com `--redact`) | sempre; **obrigatória** |
| osv-scanner | pacote com falha conhecida (npm, NuGet com lockfile, PyPI e outros) | sempre; **obrigatória** |
| `dotnet list package --vulnerable` | pacote NuGet com falha (o osv-scanner não lê `.csproj`) | se houver `.sln`/`.csproj` |
| `npm audit` / `pip-audit` | o mesmo que o osv-scanner | só na falta dele |
| Semgrep (ou Opengrep) | trecho de código inseguro | se instalado e sem `--sem-rede` |
| verificações próprias | SQL montado com texto, regra do banco aberta, segredo em configuração, envio de arquivo sem checagem, dado pessoal em log, endpoint sem permissão | sempre |

## Instalar o que faltar (o usuário instala; o kit só sugere)

- gitleaks: `winget install Gitleaks.Gitleaks` (Windows) ou o binário da página de releases de `gitleaks/gitleaks`.
- osv-scanner: o executável da página de releases de `google/osv-scanner`, numa pasta do PATH.
- Semgrep (opcional): `pipx install semgrep`.
- Projeto .NET: o SDK do .NET; rodar `dotnet restore` antes, senão a conferência do NuGet falha.

## Ignorar falso positivo

- Arquivo ou pasta inteira: `.devconductor/varredura.json` no projeto, `{ "ignorar": ["pasta/**", "arquivo.cs"] }`.
- Segredo de exemplo: o `.gitleaksignore` do projeto é respeitado (impressão digital que o gitleaks mostra).
- Só ignorar depois de ler o trecho; anotar o motivo no commit.

## Depois de rodar

1. Mostrar ao usuário quantos achados por gravidade e o que não rodou, sem jargão.
2. Segredo achado: além de tirar do código, **trocar a chave no serviço** (ela já vazou no histórico).
3. Corrigir os altos e críticos, varrer de novo e só então registrar a revisão do portão.
4. Nunca colar o valor de um segredo na conversa, no relatório ou em commit.
