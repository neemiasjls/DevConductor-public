# Decisões

| ID | Decisão | Por quê |
|---|---|---|
| DEV-01 | Processo e etapas: só o superpowers. Do wshobson entram só especialistas; os plugins de processo dele ficam de fora. | Dois métodos juntos conflitam e duplicam contexto. |
| DEV-02 | A stack do projeto é detectada automaticamente e só aqueles plugins ficam ligados. | Menos tokens; o Claude não escolhe especialista errado. |
| DEV-03 | Objetivo de negócio: vender landing pages. A fábrica `lp-*` do projeto de origem da fábrica vira o plugin `landing-pages`. | O arsenal de skills famosas já foi escolhido lá. |
| DEV-04 | Landing pages muito animadas, com cenas guiadas por scroll; processo quase automático, com pontos manuais só visuais. | Diferencial de venda. |
| DEV-06 | Paper: principal em landing pages, opcional em sistemas. | O ponto manual precisa ser visual. |
| DEV-07 | Paper conectado por MCP HTTP (`127.0.0.1:29979`), não pelo plugin oficial. | O plugin falha no Windows (depende da variável `HOME`). |
| DEV-08 | Em landing page, o `lp-maestro` conduz; em todo o resto, o superpowers. | Landing page é fluxo de design/negócio; superpowers é método de programação. |
| DEV-09 | Por enquanto, tudo ligado só no projeto DevAgents (escopo de projeto). O `~/.claude` global e os outros projetos não são mexidos. | Testar sem quebrar o que funciona. |
| DEV-10 | No futuro, o projeto de origem da fábrica fica só com clientes e prospecção. Agora: só cópia da fábrica. | Uma fonte única para a fábrica. |
| DEV-11 | No plugin `landing-pages`: GSAP + ScrollTrigger e seção presa (pin) liberados só nas 1–2 cenas-assinatura de cada site. | Cenas "de cinema" precisam disso; o resto do layout segue organizado. |
| DEV-34 | Orçamento de movimento substitui a DEV-11 e a contenção da LP-09: técnica diferente por seção, cenas grandes, celular equivalente; tom da LP-11 varia por nicho. A cota de técnica por seção foi trocada pela DEV-42 (04/11). | Auditoria de design (`docs/auditoria-design.md`): as regras de contenção deixavam os sites estáticos e iguais. |
| DEV-21 | (Em teste: ver `pilotos/medicoes/grafo-codigo-roteiro.md`.) Grafo do código (Graphify) no plugin `grafo-codigo`, ligado sozinho só em projeto com 200+ arquivos de código (ou marcador `.graphify`). O hook roda só o modo AST (`graphify update`): local, sem LLM e sem tokens; o grafo com LLM só a pedido. A CLI não é instalada sozinha: o agente oferece. | Em projeto grande o grafo troca dezenas de leituras por uma consulta; em projeto pequeno ou só de markdown o custo fixo passa da economia (DEV-02). |
| DEV-22 | Codex como parceiro pela CLI (`codex exec` / `codex review`, skill `codex-parceiro`), não por MCP. Só em tarefa COMPLEXA (revisão) ou independente (paralelo em worktree); `read-only` por padrão; só a resposta final entra no contexto (`-o`). | O `codex mcp-server` saiu na 0.163. Uma segunda opinião de outro modelo pega erro que o mesmo modelo repete; resposta final em arquivo evita trazer milhares de tokens do raciocínio dele. |
| DEV-23 | Tudo que é instalado passa por verificação de segurança antes do uso: skill-scanner da Sentry (Apache-2.0) no núcleo + hook que verifica só o novo/alterado ao abrir a sessão e depois de comando de instalação, e lista os hooks de plugins de fora. Avisa e sugere; não desliga sozinho. Skills do próprio DevAgents: o teste `skills-do-kit` barra crítico novo no repositório e o hook só avisa crítico que não esteja na lista de analisados (`devagents-core/hooks/falsos-positivos-skills.json`). O verificador da Sentry foi ampliado para scripts em subpastas e de Node/PowerShell. | Pedido do Neemias (16/10). Skill de terceiros pode trazer injeção de prompt ou script que rouba credencial; o verificador estático tem falso positivo (ex.: senha de exemplo em documentação), por isso a decisão final é da análise com o agente. |
| DEV-24 | Aviso na tela quando o Claude para e precisa do usuário (hook `Notification` do núcleo: pedido de permissão, fim de turno esperando, pergunta). Notificação nativa do sistema, sem dependência; título e texto passam por variável de ambiente, nunca dentro do comando. Fica quieto na nuvem, no app do Claude e com `DEVAGENTS_AVISO=0`. No lugar de um "escritório" visual de agentes. | Conversa de 16/10: o painel visual de agentes ajuda pouco com uma sessão por vez; o ganho real é saber na hora que um agente parou esperando permissão. |
| DEV-31 | Status: confirmado (Neemias, 2026-10-20). O projeto passa a se chamar **DevConductor** (antes DevAgents). Primeiro o repositório no GitHub; a troca interna (marketplace `devagents`, plugin `devagents-core`, testes e instalação) fica para depois do ensaio controlado, numa mudança única. | O kit rege várias skills e ajudantes como um regente (orquestrador); trocar os nomes internos no meio do ensaio misturaria as medições e quebraria a instalação. |

| DEV-32 | Status: confirmado (Neemias, 2026-10-26). D3 (aprovação visual dos quatro estilos) fica para quando houver um cliente real; não pedir de novo antes disso. Servidor: `node pilotos/estilos/servir.mjs` (porta 5192). |
| DEV-35 | Status: confirmado (Neemias, 2026-10-29). Analisar segurança de qualquer skill antes de instalar, incluindo scripts e conteúdo malicioso; avisos posteriores à instalação não substituem essa análise. | Pedido direto para pesquisar scanner de skills e analisar todas as skills do projeto antes de novas instalações. |
| DEV-36 | Status: confirmado (Neemias, 2026-10-29). Gostou muito da originalidade dos exemplos; calibrar os exageros nos próximos sem perder personalidade. Manter os exemplos apresentados nesta conversa no grupo Codex e criar depois outra rodada de exemplos pelo Claude, com pastas/evidências/grupos separados na vitrine. | Pedido direto para documentar a próxima etapa para o Claude; preservar comparação entre as rodadas sem sobrescrever os exemplos atuais. Roteiro: `pilotos/prova-design/rodada-claude/README.md`. |

## Correções dos exemplos — 30/10

### DEV-37 · Correspondência das fotos e direção dos exemplos
Status: confirmado (Neemias, 2026-10-30).
Fotos de cabelos devem corresponder ao penteado nomeado. Retirar a distorção RGB da seção “De perto” do
Coral. Na Lastro, manter a cena 3D da carga e reformular sua representação; o usuário esclareceu que não
pediu eliminar a cena. A troca apenas por fotografia foi uma interpretação excessiva, corrigida em 30/10. São correções destes exemplos; não proibição geral de movimento ou 3D.
Por quê: feedback visual direto com capturas; preservar informação correta e adequação ao negócio.

## Inventário (Fase 1)

Destino de cada item que já existia. "Cópia" = o original global continua onde está (DEV-09).

| Item | Onde estava | Destino |
|---|---|---|
| `tarefas-mecanicas`, `simple-tasks`, `complex-tasks` | `~/.claude/agents` | cópia em `devagents-core/agents` |
| `memoria` (SKILL.md, padronizar.md, mensagens.cjs) | `~/.claude/skills` | cópia em `devagents-core/skills`, sem dado pessoal |
| `subir` | `~/.claude/skills` | cópia em `devagents-core/skills`, sem dado pessoal |
| `pacote` | `~/.claude/skills` | fica global; aposentar quando a detecção automática for adotada em todos os projetos |
| `modern-csharp-coding-standards` | global | cópia em `stack-dotnet` |
| `vercel-react-best-practices` | global e projeto de origem | cópia em `stack-typescript` |
| `supabase-postgres-best-practices`, `postgresql-code-review` | global | cópia em `stack-banco` |
| `accessibility`, `web-design-guidelines`, `frontend-design`, `impeccable` | global e projeto de origem | `landing-pages` (Fase 5, versão do arsenal) |
| `premium-landing-designer`, `website-design`, `design-taste-frontend` | global | avaliar na Fase 5; tendem a sair (pouco conhecidas) |
| `find-skills`, hook `git-autoria` | global | ficam globais |
| 10 `lp-*` + 18 skills do arsenal | projeto de origem | `landing-pages` (Fase 5, cópia) |

A detecção de stack foi testada em simulação em 10 projetos reais de .NET, Java, TypeScript/React,
Python e Postgres/Supabase.

### DEV-38 · Carga da cena 3D: caixas de ovos
Status: confirmado (Neemias, 2026-10-30).
Na reformulação da Lastro, representar caixas de ovos; manter a cena 3D e seu percurso. A escolha não
transforma a transportadora fictícia em especialista exclusivo nesse produto.
Por quê: resposta direta do usuário à escolha da representação da carga.

### DEV-39 · Plugin design-paper retirado do kit
Status: confirmado (Neemias, 2026-11-04).
O plugin `design-paper` e a opção `--paper` do instalador saíram do kit. A biblioteca gratuita Paper
Shaders continua na receita `fundo-shader`.
Por quê: o Paper é pago e já tinha saído do fluxo (DEV-06, Figma no lugar).

### DEV-41 · Retorno sobre a rodada Claude e novo foco
Status: confirmado (Neemias, 2026-11-04).
Preferidos: Prumo (barbearia) e Austral (transporte). Agradaram a cadeira 3D do Prumo e a porta do baú do
Austral; no Prumo há informação demais em alguns trechos e o degradê confunde; o fio do Lúmen parece forçado,
sem um porquê; no Austral, outras partes ficaram sem nexo. Foco agora: design excepcional em landing pages e
em sistemas, ajustando o kit em vez de refazer os sites; pode aproveitar partes de bons projetos, sem um
atropelar o outro.
Por quê: retorno visual direto, com capturas. Auditoria: `docs/auditoria-design-clareza.md`.

### DEV-42 · Cenas fortes + resto discreto
Status: confirmado (Neemias, 2026-11-04).
Troca a cota "uma técnica diferente por seção" da DEV-34. A quantidade de cenas grandes sai do projeto, sem número fixo
(ajuste dele em 04/11); ponto de partida pelo tom: sério 0–1, padrão 1–3, imersivo pode passar de 3. Cada
cena mostra um fato do negócio que o visitante entende sem legenda; as seções de leitura ficam discretas. Vem com a LP-12 (clareza: limites de
texto por tela, medidos pelo `densidade.mjs` da `lp-revisao`).
Por quê: escolha dele entre as opções da auditoria; a cota obrigava a inventar efeito sem motivo (o fio).

### DEV-44 · Plugin design-sistemas
Status: inferido do código (`plugins/design-sistemas/`), a partir do pedido de 04/11 (DEV-41); falta confirmar.
Telas de sistema ganham dona própria, `ui-sistemas`, com DESIGN.md por projeto no formato aberto do Google
(`@google/design.md`), padrões brasileiros testados em `modelos/br.ts` e 5 consultoras importadas e travadas.
Liga sozinho em projeto React/Next com sinais de sistema que não é landing page, ou pelo marcador
`.design-sistemas`.
Por quê: o kit não tinha nenhum fluxo de design para sistemas; nos testes, a skill corrigiu os erros que os
agentes cometiam sem ela.

### DEV-46 · Política de modelos e de contexto para gastar menos
Status: confirmado (Neemias, 2026-11-04) — ele autorizou e pediu que a decisão fosse tomada no kit.
- Principal no Opus, esforço **médio** por padrão; alto/max só no plano, revisão final ou bug difícil, e volta.
- "Plano no Opus, execução no Sonnet": sim, para plano aprovado com tarefas fechadas, **um agente `sonnet` novo
  por tarefa**. Não para decidir, depurar causa desconhecida, direção visual ou tarefa com vai-e-volta.
- Direto (sem agente) até ~5 chamadas; agente quando passa disso e é autocontido, ou quando a conversa já tem
  mais de ~150 mil. Nunca `fork` para economizar. Nenhum agente faz site/sistema inteiro: partes de até ~40
  chamadas, resposta final de até ~15 linhas.
- Agentes com esforço fixo (braçais `low`, `pesquisador`/`simple-tasks` `medium`, `complex-tasks` `high`).
- Hooks: `agente-longo` pede a entrega a cada 40 chamadas de um agente; `conversa-longa` avisa em 150 mil e a
  cada +50 mil, também na tela. `medir-uso` mostra respostas e contexto por modelo.
Por quê (medição de 28/10–04/11, `medir-uso --todos --dias 7`): 97% das 2.150 respostas foram no Opus (Sonnet
30, Haiku 4), ou seja, a delegação barata quase não aconteceu. Agentes: 1.046 respostas a ~238 mil de contexto,
quase todas de três agentes `complex-tasks` "construir site" (290–430 respostas cada, terminando em 120–275 mil),
≈ metade do cache lido da semana. Principal: 1.100 respostas a ~232 mil. Base fixa: agente nasce com ~72 mil,
sessão com ~98 mil (a skill dizia 10–20 mil). Em peso de custo (lido 0,1 · entrada 1 · saída 5), cache lido
≈ 2/3 do total; saídas de ferramenta (Bash ~635 mil, Read ~124 mil) pesam pouco perto disso.

### DEV-47 · Agentes por função com esforço próprio
Status: confirmado (Neemias, 2026-11-04) — pediu "vários agentes, cada um com uma função e um esforço diferente".
- A conversa principal é a **regente**: entende o pedido, escolhe o agente e mostra o resultado. Tarefa pequena
  (até ~5 chamadas) continua direto.
- Cada papel vai ao agente mais barato que faça bem; Opus só no plano, revisão, bug sem causa, banco, segurança
  e direção visual. Escada: Haiku falhou ou devolveu → Sonnet; Sonnet falhou 2× → Opus; na dúvida, o de cima.
- Tarefa grande: `planejador` (opus, high) grava o plano em partes em `docs/planos/` → `executor` (sonnet, medium),
  um agente novo por parte → `testador` (haiku) → `revisor` (opus, medium, só aponta falhas, não edita).
  `complex-tasks` fica com a parte difícil; `simple-tasks` com a tarefa pequena avulsa. Tabela em
  `plugins/devconductor-core/skills/orquestrador/referencias/agentes.md` (o teste `agentes` confere com os cabeçalhos).
- Modelo/esforço da regente: ela não troca o próprio (no app, `set_session_model`/`set_session_effort` recusam a
  própria sessão); pede ao usuário (menu do app, `/model` e `/effort` no terminal). `opusplan` (Opus no modo plano,
  Sonnet fora) existe, mas plugin não o define (o `settings.json` de plugin só aceita `agent` e
  `subagentStatusLine`); fica como opção do usuário, sem mudar o padrão (DEV-29).
Por quê: a medição da DEV-46 mostrou 97% das respostas no Opus; separar plano (Opus, curto), execução (Sonnet, em
partes que nascem limpas) e revisão (Opus, só o diff) mantém a qualidade onde ela depende do Opus e tira dele o
trabalho longo, que é o que mais relê contexto.

### DEV-48 · Opus pensa e cria; desce de modelo só o que dá para conferir
Status: confirmado (Neemias, 2026-11-04) — "quero usar o opus, porem quero poder delegar alguns funcoes para
agentes menos" e "o problema atual é que praticamente só esta sendo usado o opus". Ajusta a DEV-47.
- Gosto, regra de negócio, arquitetura, design e decisão ficam no Opus. Desce só o que tem resultado conferível:
  teste que passa, arquivo achado, build, deploy, padrão que já existe no código, mudança já decidida.
- O `planejador` marca cada parte: `[sonnet]` (segue padrão existente, sem gosto nem regra nova, com teste
  objetivo) → `executor` com `model: "sonnet"`; sem marca → `executor` no Opus (cabeçalho agora `opus`, medium);
  `[difícil]` → `complex-tasks`; `[regente]` (direção visual, textos, ajuste fino) → conversa principal.
- Sempre ajudante, mesmo curto, porque enche o contexto do Opus: prints e conferências no navegador, suíte e
  build longos (`testador`, haiku), pesquisa na web (`pesquisador`, agora sonnet), varredura de arquivos (`Explore`).
- `simple-tasks` (sonnet) só para mudança já decidida. Especialista da stack (a maioria é `sonnet`) recebe
  `model: "opus"` em parte com regra ou decisão.
Por quê: a DEV-47 punha toda a execução no Sonnet (risco no que pede gosto) e, na prática, 97% das respostas
seguiam no Opus. Agora o Opus decide o que desce, parte por parte, e as saídas que mais enchem o contexto
(navegador, testes, pesquisa) saem dele sempre. Medir em ~11/11 com `medir-uso` (linha "por modelo").
