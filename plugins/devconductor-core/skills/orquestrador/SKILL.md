---
name: orquestrador
description: Use antes de agir em pedido grande, aberto ou com várias partes (código, site, automação, pesquisa, design, manutenção) e em cada tarefa de um plano, para decidir quem faz, com qual modelo e com quais skills. Pedido pequeno e fechado vai direto, sem esta skill.
---

# Orquestrador do DevConductor

Decide antes de gastar. A conversa principal (Opus) pensa e decide; o trabalho braçal vai para quem custa menos
sem perder qualidade (DEV-29). Conversa pura, resposta curta ou pedido pequeno e fechado: sem ficha e sem esta
skill — faça direto, seguindo o pedido e os critérios dados.

## 1. A ficha (diga em uma linha, antes de começar)
`Tipo · Tamanho · Quem faz · Modelo · O que carregar` — ex.: `Sistema · SIMPLES · typescript-pro · sonnet · stack-typescript`.

**Tipo** → quem conduz:
| Tipo | Conduz |
|---|---|
| Landing page / site de cliente | `lp-maestro` (plugin `landing-pages`); superpowers só no código da construção |
| Sistema, API, app, automação, script | superpowers (brainstorming → plano → execução → verificação) |
| Pesquisa, comparação, "existe algo pronto?" | direto ou agente de pesquisa; resposta curta com fontes |
| Manutenção (trocar texto, rodar build, conferir deploy) | direto ou `tarefas-mecanicas` |
Um método por vez: nada de comandos de processo de outros plugins junto (DEV-01).
Para executar, consulte só a referência do tipo atual: [sistema/API](referencias/fluxo-sistema.md),
[landing page](referencias/fluxo-landing-page.md) ou [automação/script](referencias/fluxo-automacao.md).
São recortes do método existente, não um segundo processo; pedido fechado e autorização prévia dispensam nova aprovação.

**Tamanho** → quanto processo:
- **MECÂNICA ou pedido que já diz tudo** (trocar texto, ajustar cor, erro óbvio de poucas linhas): direto, sem
  brainstorming, plano nem pergunta.
- **SIMPLES ou média** (uma tela, um endpoint, regra pequena): resumo de 3–6 linhas, OK do usuário, executa — sem
  documento de especificação nem revisão de documento.
- **COMPLEXA** (vários módulos, banco, regra de negócio grande, risco): brainstorming na regente; plano pelo
  `planejador` em `docs/planos/`. Na dúvida entre simples e complexa, pergunte qual caminho ele prefere.

## 2. Quem faz: a regente escolhe
A principal é a **regente** (Opus): decide e mostra o resultado. **Opus pensa e cria; desce de modelo só o que
dá para conferir** (teste, busca, build, deploy, padrão já existente); gosto, regra, arquitetura e design ficam
no Opus. Tabela e fluxo: [agentes](referencias/agentes.md).
1. **Direto** até ~5 chamadas, trecho já lido, algo que só esta conversa sabe ou vai-e-volta com o usuário
   (ajuste visual). Agente nasce com **~70 mil tokens**; acima de ~150 mil, delegar sai mais barato.
2. **Sempre ajudante**, mesmo curto, porque enche o contexto do Opus: prints em várias larguras e suíte/build
   longos (`testador`), pesquisa na web (`pesquisador`), varredura de muitos arquivos (`Explore`).
3. **Pequena** que passa de ~5 chamadas: já decidida, `simple-tasks` (sonnet); mecânica, `tarefas-mecanicas`.
4. **Grande**: `planejador` grava o plano em `docs/planos/` → `executor` (agente **novo** por parte; `[sonnet]`
   com `model: "sonnet"`) → `testador` → `revisor`. A regente só decide e confere resumos.
5. **Difícil** (bug sem causa, banco, segurança): `complex-tasks` numa parte, nunca no plano inteiro.
`publicador` (haiku) só em deploy já pedido. Design, animação e textos são skills da regente (DEV-30). Nunca
`fork` para economizar. Nenhum agente faz o site inteiro: partes de até ~40 chamadas.
**Codex** (`codex-parceiro`, se a CLI existir): revisa o que for COMPLEXA antes de pronto; tarefa independente em
paralelo (`--worktree`). MECÂNICA e SIMPLES não vão ao Codex.
**Sessão nova** quando o assunto muda ou a conversa passa de ~150 mil (aviso do hook `conversa-longa`):
atualize `docs/continuar.md` e sugira `/clear`. Nunca dois agentes nos mesmos arquivos ao mesmo tempo.

## 3. Modelo e esforço
Os agentes já têm modelo e esforço no cabeçalho; passe `model` para subir ou na parte `[sonnet]`. Escada: Haiku
falhou ou devolveu → Sonnet; Sonnet falhou 2× → Opus; na dúvida, o de cima. Regente no esforço **médio**; alto
só no plano, revisão final ou bug difícil. Ela não troca o próprio modelo: pede ao usuário (menu do app;
`/model`, `/effort` no terminal) e avisa para voltar ao médio.

## 4. Especialista pela stack dos arquivos
| Arquivos | Especialista |
|---|---|
| `.cs`, `.csproj`, `.sln` | `dotnet-architect` (estrutura) · `csharp-pro` (dia a dia) |
| `.java`, `pom.xml`, `build.gradle` | `java-pro` |
| `.ts`, `.tsx` | `typescript-pro` |
| `.js`, `.mjs`, `.jsx` | `javascript-pro` |
| `.py` | `python-pro` · `fastapi-pro` (API FastAPI) |
| `.sql`, migrações, modelagem | `database-architect` · `sql-pro` · `database-optimizer` |
| login, permissão, upload, segredo, pagamento | `backend-`/`frontend-security-coder`; revisão `security-auditor` (opus), pelo portão do fluxo |
| entre módulos, stack mista | `arquiteto` |
Nomes podem vir com prefixo (`stack-dotnet:dotnet-architect`). A maioria é `sonnet`: em parte com regra ou
decisão, passe `model: "opus"`. Sem especialista ligado: `executor` ou `complex-tasks`.

## 5. O que carregar (só o necessário)
- Dono de cada skill: [responsabilidades.json](referencias/responsabilidades.json); na dúvida, leia só o grupo
  da etapa/stack atual. Consultoras continuam travadas.
- Cópia local/global com o mesmo nome: leia só a do kit (`plugin:skill`), salvo escolha do usuário; a tabela não
  autoriza alterar globais. Agente recebe só as skills do recorte da tarefa.
- Plugins de stack: a detecção já liga só os do projeto (DEV-02). Skills: só as da etapa atual.
- Arquivos: grep/offset, não ler inteiro; com `grafo-codigo` ligado, consulte o grafo antes.
- Saídas: build e testes só com falhas e o fim (código de saída conferido antes do `tail`); `git -q`; nada de
  log inteiro; prints reduzidos; várias imagens viram uma folha só.

## 6. Como passar a tarefa ao agente (ficha curta)
Arquivos envolvidos (caminhos, não o conteúdo), a regra que vale, o que é "pronto" e como testar, e os arquivos
de memória do assunto — curta, sem colar conversa nem arquivo; resposta final em até ~15 linhas. Peça que
**não grave memória** e devolva no fim "Conhecimento candidato"; quem grava é a conversa principal. Commit e push só quando o usuário pedir (skill `subir`).

## 7. Regras do projeto vencem as do método
Nunca commitar sem pedido; nada de jargão do método com o usuário ("o resumo do que combinamos está certo?",
não "spec"); uma pergunta por vez; antes de entrar numa worktree, atualizar `docs/continuar.md` e a memória.
