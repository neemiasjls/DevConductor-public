# Graphify: o que entra e o que fica de fora

Origem: [safishamsi/graphify](https://github.com/safishamsi/graphify) (MIT), testado na versão 0.9.91.
Não é copiado: a CLI é instalada da origem (`uv tool install graphifyy`) e este plugin só a chama.
Critério (DEV-21): entra o que economiza tokens sem custo fixo; fica de fora o que gasta tokens sozinho ou
pesa em toda sessão.

## Entra

| Peça | Por quê |
|---|---|
| `graphify update .` (AST via tree-sitter) | Monta e atualiza o grafo do código no computador, sem LLM e sem tokens; incremental pelo cache. |
| `query`, `explain`, `path`, `affected`, `god-nodes` (pela CLI) | Uma consulta custa centenas de tokens no lugar de várias leituras de arquivo; `--budget` limita a resposta. |
| `GRAPH_REPORT.md` | Visão geral do projeto, lida só quando precisa. |
| Lembrete para usar o grafo (ideia do hook PreToolUse dele) | Sem lembrete o agente volta ao grep por hábito. Versão própria: **uma vez** por sessão/subagente, na primeira busca Grep/Glob (~60 tokens), em vez de "OBRIGATÓRIO" a cada busca e leitura. |

## Medido (16/10, Linux, Graphify 0.9.91)

| Projeto | Arquivos de código | `update` inicial | `update` sem mudança | Nós |
|---|---|---|---|---|
| dotnet/eShop | 567 | 18 s | 17 s | 5.140 |
| nestjs/nest | 2.046 | 53 s | 36 s | 17.274 |

O `update` refaz tudo mesmo sem mudança (o `--no-cluster` não ajuda: 36 s). Por isso o hook só chama o
Graphify quando um arquivo de código mudou, nasceu ou sumiu desde o último grafo; com o grafo em dia a
abertura da sessão custa ~150 ms (nest). Atualizar a cada edição ficou de fora: dezenas de segundos por vez.

## Fica de fora

| Peça | Por quê |
|---|---|
| `/graphify` completo, `extract`, `--mode deep` | Passam docs, PDFs e imagens pelo LLM: gastam tokens e precisam refazer a cada mudança. Só a pedido do usuário. |
| `graphify claude install` (seção no CLAUDE.md + hook PreToolUse) | Mexe em arquivo versionado do projeto e pesa em toda chamada de ferramenta; a skill + o hook de sessão fazem o mesmo papel. |
| Servidor MCP (`--mcp`) | As definições das ferramentas entram no contexto de toda sessão; a CLI não custa nada até ser usada. |
| Skill global do Graphify (`graphify install`) | Ficaria ligada em todos os projetos, inclusive os pequenos (contra DEV-02). |
| `--watch`, git hooks (`hook install`) e update a cada edição | Processo em segundo plano, hooks no `.git` do projeto ou dezenas de segundos de CPU por mudança; atualizar ao abrir a sessão, só se o código mudou, basta. |
| Grafo commitado no git | É refeito a partir do código; no git só geraria conflito e ruído (vai para `.git/info/exclude`). |
| `--wiki`, Obsidian, Neo4j, `--global`, `add <url>`, Graphify Cloud | Fora do uso de programação do kit, ou serviço pago. |
