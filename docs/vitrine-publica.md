# Repositório privado + vitrine pública

## Por quê

Quem trabalha em mais de um computador (ou com mais de um agente, como Claude Code e Codex) precisa do
projeto inteiro no GitHub: código, documentos de estado, pilotos, histórico. Isso inclui coisas que não podem
ser públicas, como dados de clientes, caminhos da máquina e anotações de trabalho. Ao mesmo tempo, mostrar o
projeto (portfólio, vagas, open source) pede um repositório público.

Tornar o privado público não resolve: o histórico inteiro aparece, inclusive arquivos apagados há muito
tempo, e o que foi público uma vez pode ter sido copiado. Por isso são dois repositórios:

| | Privado (trabalho) | Vitrine (pública) |
|---|---|---|
| Papel | principal: onde se trabalha e sincroniza | só para mostrar e para outros usarem |
| Conteúdo | tudo | só o que o `vitrine.json` lista |
| Histórico | completo | começa limpo; cada atualização vira um commit |
| Deploy, CI, segredos | ligados aqui | CI só de testes |

## Como funciona

1. `vitrine.json` na raiz do privado diz o repositório da vitrine, a pasta local dela, o que entra
   (`incluir`), o que sai (`excluir`), arquivos que trocam de nome (`renomear`, ex.: um README próprio da
   vitrine), trocas de texto (`trocar`: padrão → texto, opcionalmente só em alguns arquivos, para generalizar
   nomes de clientes na cópia sem mexer no privado), padrões proibidos do projeto (nomes de clientes) e
   exceções conhecidas (`permitidos`, com `arquivo` exato ou glob). Modelo:
   `plugins/devconductor-core/skills/subir/vitrine.exemplo.json`.
2. O gerador (`plugins/devconductor-core/skills/subir/scripts/vitrine.mjs`) pega só arquivos versionados,
   aplica a lista e as trocas e varre o texto atrás de e-mail pessoal, caminho da máquina, CPF/CNPJ, telefone, token,
   chave privada e os padrões do projeto. Com achado, não copia nada.
3. A skill `subir` roda o gerador com `--enviar` depois do push no privado: commit com a mesma autoria e
   push na vitrine. Quando o usuário diz "sobe", sobem os dois.
4. Sempre ficam fora `.env`, `settings.local.json` e o próprio `vitrine.json`. Memória e instruções de IA
   (`.claude`, `.codex`, `CLAUDE.md`, `AGENTS.md`, pastas `memory`/`memoria`) também ficam fora, salvo
   `"permitirConfigIA": true` (caso deste kit, cujo produto é a estrutura de memória; a memória pessoal
   nunca está no repositório).
5. Tornar a vitrine pública é decisão do dono, uma vez só:
   `gh repo edit <repo> --visibility public --accept-visibility-change-consequences`. Depois, ligar
   *Secret scanning* e *Push protection* nas configurações do repositório.

## Proteções de caminho

Desde o núcleo 0.4.6, `renomear` não permite incluir arquivos protegidos nem criar destinos protegidos.
Nomes devem ser relativos, sem `..`, `.git`, volumes ou nomes reservados do Windows. Colisões de nomes
(inclusive maiúsculas/minúsculas) e conflitos entre arquivo e pasta interrompem a seleção antes de copiar.
A pasta de saída deve ficar fora do projeto e não pode ser ancestral dele nem link/junção. Essas relações
também são verificadas pelos caminhos reais. Links de arquivos de origem são recusados.

São proteções contra configuração incorreta, não uma garantia de anonimização de qualquer conteúdo.
Texto UTF-16 com BOM (inclusive saída do PowerShell) é varrido como texto e conserva a codificação nas trocas;
UTF-32 é recusado, pedindo conversão para UTF-8, em vez de ser liberado como binário.
A cópia ainda não é transacional: falha de disco durante a escrita pode deixar uma cópia incompleta.
O envio interrompe antes do commit se a geração falhar; não use a cópia incompleta como resultado aprovado.

## Antes da primeira publicação

- Varrer também com uma ferramenta de segredos (ex.: `gitleaks dir <pasta-da-vitrine>`).
- Conferir licenças de tudo que veio de terceiros: ver [licencas-publicacao.md](licencas-publicacao.md).
- Escrever o README da vitrine dizendo o que o projeto faz, como rodar e o que demonstra.
