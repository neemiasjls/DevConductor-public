# Fase D — uma origem e um responsável por skill

Implementada em 20/10/2026. Núcleo 0.1.19, sem commit, push ou publicação.

A matriz em `plugins/devagents-core/skills/orquestrador/referencias/responsabilidades.json` é a fonte única
da [tabela das 62 skills](../responsabilidades-skills.md). Define dono técnico e momento de carregamento.
Decisões de design, movimento e textos continuam na conversa principal; uma referência de stack não cria
um agente automaticamente. Pesquisador, testador e publicador recebem somente o recorte da tarefa.

O orquestrador aponta para a matriz, sem inseri-la no início de toda sessão. Outra etapa pode usar uma
skill existente na origem indicada, sem duplicar arquivos ou carregar a família inteira. Consultoras
preservam `disable-model-invocation: true`. Nenhum arquivo de consultora foi alterado nesta fase.

## Auditoria executável

`node scripts/auditar-responsabilidades.mjs` falha se houver skill sem dono, atribuição dupla, nome
duplicado, dono inexistente, identidade ambígua ou consultora destravada. A tabela pode ser regenerada com
`--markdown`. `--json` dá o relatório estruturado. O comando só lê arquivos; não instala nem remove nada.

Há 62 skills nesta máquina, sendo três cópias locais opcionais que não são redistribuídas por licença
pendente: web-design-guidelines, postgresql-code-review e vercel-react-best-practices. A matriz as registra
sem obrigar sua presença no GitHub. O alias histórico da pasta `taste-skill` para o nome
`design-taste-frontend` é explícito; o relatório mostra o nome correto de chamada e a pasta de origem.

## Colisões globais — nenhuma removida

A comparação opcional `--globais` encontrou **17 cópias físicas** de skills/agentes do kit nos escopos
globais. Links apontando para a mesma cópia são contados uma vez. Só foram lidos arquivos de definição,
sem executar instruções das skills ou alterar configurações.

| Grupo | Quantidade | Tratamento proposto |
|---|---:|---|
| complex-tasks, simple-tasks, tarefas-mecanicas em `~/.claude/agents/` | 3 | Conteúdo igual ao kit; candidatos à remoção após autorização específica para o escopo global. |
| memoria e subir em `~/.claude/skills/` e `~/.codex/skills/` | 4 | Conteúdo diferente; conciliar antes de remover. Manter recursos exclusivos de cada ambiente. |
| Outras cópias: design, busca de skills e padrões C#/Postgres/Supabase/React | 10 | Preferir a origem do kit neste projeto. Comparar diferenças antes de qualquer limpeza global. |

As cópias globais atendem outros projetos; remover muda esses ambientes. **A Fase D local está
implementada; a limpeza global continua pendente**, pela regra DEV-09 de exigir autorização específica.
Não foi criada uma regra global que suprima skills. Preferência por origem pode ser substituída por pedido
explícito do usuário. A varredura global não roda automaticamente em cada pedido.

## Validação

Seis testes próprios cobrem cobertura, aliases, cópias opcionais, ambiguidade skill/agente, preservação de
consultoras, colisões e links físicos, incluindo comparação sem escrita nos escopos externos. A suíte
completa passou: **119 aprovados em 121**, com dois pulados por plataforma (notify-send do Linux e Python
falso sem executável Windows). Onze plugins sem referências/versões pendentes; núcleo e marketplace validados.

## Próxima medição

Três cópias novas das tarefas fixas foram preparadas, com hashes/ambiente/logs em
`pilotos/medicoes/execucoes/base-r1-2026-10-20T13-51-27-934Z/` (ignorado pelo Git).
Todos os testes iniciais passaram e os de aceitação falharam na quantidade prevista (LP 4, API 6, CSV 5).
As três matrizes originais permaneceram intactas.

Tentada a execução do CSV numa sessão nova, Claude Code 2.1.226, modelo solicitado Opus, pedido exato via
stdin. O provedor retornou **401 — OAuth access token is invalid**; interrompido antes de implementar.
As outras duas tarefas foram preparadas, sem repetir chamadas que falhariam com a mesma autenticação.
Era impedimento de login, não limite de cota nem resultado de economia. Em seguida, o login oficial foi
renovado e a primeira rodada das três tarefas foi concluída, com uma correção no CSV e 28 testes finais.
Ver [relatório da base por tarefa](relatorio-base-por-tarefa.md). O CLI ainda registra núcleo 0.1.4;
o grupo depois precisa confirmar o carregamento da fonte nova antes de comparar economia.

Não há medição de economia atribuível a esta tabela. Reduzir nomes duplicados não reduz, por si só,
o custo de reler conversas longas. A prova depende das tarefas fixas e dos históricos medidos na Fase A/E.
