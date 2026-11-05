# Agentes por função (DEV-47, ajustada pela DEV-48)

**Opus pensa e cria; desce de modelo só o que dá para conferir**: teste que passa, arquivo achado, deploy no ar,
lista extraída, mudança já decidida aplicada. Gosto, regra de negócio, arquitetura, design e decisão ficam no
Opus. A economia vem de manter a conversa principal enxuta (saída longa fica nos ajudantes) e de dar a cada parte
grande um agente novo, de contexto limpo; não de trocar o Opus por um modelo menor no que importa.

| Quem | Função | Modelo | Esforço |
|---|---|---|---|
| regente (conversa principal) | entende o pedido e decide; faz o que pede gosto ou vai-e-volta (design, textos, ajuste visual) e o que cabe em ~5 chamadas | Opus | médio |
| `planejador` | só tarefa COMPLEXA: lê o necessário e grava o plano em partes em `docs/planos/` | opus | high |
| `executor` | implementa UMA parte do plano num contexto limpo, com teste; parte `[sonnet]` roda com `model: "sonnet"` | opus | medium |
| `revisor` | confere o resultado contra o plano e aponta só o que falhou (arquivo:linha) | opus | medium |
| `complex-tasks` | parte difícil: bug sem causa, banco/migração, segurança, performance | opus | high |
| `simple-tasks` | mudança já decidida e conferível que passa de ~5 chamadas (vários arquivos, teste de regra escrita, documentação) | sonnet | medium |
| `pesquisador` | pesquisa na web e na documentação, comparação de ferramentas: lê muito, devolve resumo com fontes | sonnet | medium |
| `tarefas-mecanicas` | buscar, listar, build/git e resumir, trocar texto já definido | haiku | low |
| `testador` | rodar testes, build e navegador; devolve só o que falhou | haiku | low |
| `publicador` | deploy já pedido e conferência do que está no ar | haiku | low |

Direção visual, animação e textos ficam na regente, com as skills de design (DEV-30); não viram agente.
Ajudante abaixo do Opus não decide gosto, regra nem arquitetura: se esbarrar nisso, devolve a pergunta.

## Tarefa grande, passo a passo
1. **Regente**: entende o pedido, pergunta só o que muda a solução e diz a ficha.
2. **`planejador`** recebe pedido, decisões e arquivos de memória do assunto. Devolve perguntas (sem plano) ou o
   caminho do plano. A regente mostra ao usuário um resumo em poucas linhas e espera o OK.
3. **`executor`** (opus), um agente **novo por parte**, recebe só o caminho do plano e o número da parte.
   Pergunta devolvida: a regente decide (ou pergunta ao usuário) e chama de novo. Parte `[difícil]`:
   `complex-tasks`; parte `[regente]`: a própria conversa principal; parte `[sonnet]`: `executor` com
   `model: "sonnet"` (é aí que a execução sai do Opus). Especialista da stack (`typescript-pro`,
   `csharp-pro`...) pode fazer a parte no lugar do `executor`, mas a maioria tem cabeçalho `sonnet`: passe
   `model: "opus"` se a parte tiver regra ou decisão. Partes em paralelo só se não tocam os mesmos arquivos.
4. **`testador`** roda os testes da parte (ou os finais do plano) e devolve só as falhas.
5. **`revisor`** confere tudo contra o plano. Achados viram um `executor` novo só com eles; depois revisa de novo
   o trecho.
6. **Regente** mostra o resultado ao usuário e atualiza `docs/continuar.md`.

Tarefa pequena: direto; `simple-tasks` só se ela apenas aplica algo já decidido. Tarefa difícil sem plano (bug sem causa, banco, segurança): `complex-tasks`
ou a própria regente.

## O que sai do Opus de verdade
- Parte `[sonnet]` do plano: segue padrão que já existe no código, sem gosto nem regra nova, com teste objetivo.
- Prints e conferências no navegador, suíte e build longos: `testador` (haiku). Pesquisa: `pesquisador` (sonnet).
- Mudança já decidida em vários arquivos: `simple-tasks` (sonnet). Busca, git, deploy: haiku.
Conferir na semana com `node scripts/medir-uso.mjs --todos --de <data>` (linha "por modelo").

## Escada
Haiku falhou ou devolveu → Sonnet; Sonnet falhou 2× → Opus; na dúvida, o de cima. Para subir, passe `model` ao
chamar o agente (vale acima do cabeçalho dele). Resultado de ajudante que parece certo mas pede julgamento
(resumo de pesquisa que vai decidir algo, teste que "passou" mudando o esperado): a regente confere antes de usar.

## Modelo e esforço da regente (conferido em 04/11/2026)
- A regente **não troca o próprio** modelo ou esforço. No app desktop, `set_session_model` e `set_session_effort`
  são recusados para a própria sessão; só valem para uma sessão que ela abriu, e o app pede aprovação para
  modelo ou esforço maior. Então ela **pede ao usuário**: no app, pelo menu de modelo/esforço; no terminal,
  `/model` e `/effort`.
- Trabalho longo e autocontido, quando o usuário pedir sessão separada: no app, `start_session` aceita `model` e
  `effort` iguais ou mais baratos que os da regente (ex.: Sonnet, esforço médio).
- `opusplan` existe: Opus no modo plano (Shift+Tab), Sonnet fora dele. Vale por `/model opusplan` ou pela chave
  `"model"` do `settings.json` do usuário ou do projeto. Plugin não consegue definir isso: o `settings.json` de
  plugin só aceita `agent` e `subagentStatusLine`. Esforço padrão: chave `"effortLevel"` (low a xhigh) ou a
  variável `CLAUDE_CODE_EFFORT_LEVEL`. É escolha do usuário, não padrão do kit (DEV-29).
