# DevAgents — Plano de ação

> **Multiagente (DEV-27, 20/10):** A (medição agregada), B (orquestrador), C (três ajudantes, DEV-30) e D local
> (62 skills com origem/dono) implementadas; F implementada (três fluxos progressivos). Núcleo 0.1.21, sem commit.
> [Tabela de responsabilidades](responsabilidades-skills.md) · [Relatório D](relatorio-fase-d.md).
> E: ensaio 0.1.4 × 0.1.20 concluído, 18/18 com qualidade aprovada, sem economia nas tarefas pequenas
> ([relatório](relatorio-ensaio-controlado.md)). Reensaio do núcleo leve 0.1.21 concluído em 21/10:
> **18/18 aprovadas**. Contexto depois/base: CSV −30,3%, API −6,4%, LP +66,4%; resultado misto,
> três repetições e cache não controlado, sem conclusão de economia geral. Recusas preservadas fora da comparação.
> Piloto integrado concluído em26/10: **6/6aprovadas**,54/54por rodada, revisão ampliada de EACCES e arquitetura conferidas.
> Contexto base8.474.987 ×depois11.907.733 (+40,5%);225respostas Opus, zeroSkill/Agent/Task, máximo133.355por resposta.
> Onze correções válidas incluídas e duas tentativas recusadas preservadas integralmente fora da comparação.
> **G/H concluídas no escopo controlado**, com auditor/comparador aprovados, sem economia geral ou causalidade demonstrada.
> Cache/n=3, clarificaçãoV1/V2, ordem6antes5e pausa semanal limitam o resultado; sem prova de delegação/alerta150k/cliente real.
> Infraestrutura:282/284aprovados, dois pulados por plataforma, zero falhas; sem mudança de código nesta retomada.
> [Relatório integrado](relatorio-piloto-integrado.md) · [alcance da validação](relatorio-validacao-multiagente.md).
> Limpeza global depende de autorização. Detalhes no `continuar.md`.
> **Status (15/10/2026):** Fases 0, 1, 3, 5 e 8 implementadas; Fase 9 validada de verdade em configuração vazia isolada neste Windows (instala/reinstala/desliga/repete, 4 plugins locais, globais preservados), também pelo GitHub (`--github`) e sem o clone (`--sem-clone`: 4 comandos + hook do núcleo instalado). Linux também aprovado nos três modos (16/10, servidor da nuvem: normal, `--github`, `--sem-clone`); macOS não testado. Fase 4 verificada numa sessão real (fluxo → typescript-pro no Sonnet, 10/10 testes; DEV-20).
> Fase 2a parou no combinado do Sistema de Gestão (DEV-16); novo piloto depende da escolha do projeto. Paper testado, dispensado enquanto durar o plano grátis (DEV-06). Fase 7: receitas e ferramentas prontas; Transportadora v2 pausada a pedido do usuário. Fase 10: baseline real de tarefa Transportadora isolado por sessão/horário, medidor corrigido contra histórico duplicado e com JSON; falta tarefa equivalente com roteamento e comparação. Piloto interno do especialista retornou 401.
> Plano para sites animados em [plano-design.md](plano-design.md), aprovado em 16/10: D1 implementada
> com três estudos e mais três da D2, vitrine com 12 vídeos, 24/24 testes de navegador; escolha visual pendente.
> Codex já retoma pelos arquivos. Estado atual e pendências em [continuar.md](continuar.md); as fases abaixo preservam o roteiro original, com decisões posteriores prevalecendo.
> Fase 11 avançada (15/10): atualização isolada do catálogo implementada e usada nos 9 plugins;
> importador preserva versões/metadados/créditos, prepara cópias antes da troca e restaura backups em falhas.

Ecossistema de desenvolvimento para Claude Code, usável em qualquer projeto, com dois focos:
**sistemas** (APIs, sistemas de gestão, apps) e **landing pages de venda** (o produto a vender).

| Camada | O que é | De onde vem |
|---|---|---|
| **Método** | Processo e etapas: entender, planejar, executar, testar, depurar, revisar, verificar, fechar | [obra/superpowers](https://github.com/obra/superpowers) (299 mil ⭐, MIT) |
| **Especialistas** | Um agente por stack/domínio: .NET, Java, TypeScript, Python, banco, segurança | selecionados de [wshobson/agents](https://github.com/wshobson/agents) (40,7 mil ⭐, MIT) |
| **Design** | Tela visual onde o Claude monta o layout e você edita junto | [Paper](https://paper.design) (MCP) + Paper Shaders |
| **Landing pages** | Fábrica do briefing à publicação + animações guiadas por scroll | fábrica `lp-*` do projeto `LandingPages` + arsenal de skills famosas |
| **Camada própria** | Roteamento de modelo por custo, memória, deploy, detecção de stack | suas skills e agentes atuais |

---

## 1. Decisões já tomadas

| ID | Decisão |
|---|---|
| DEV-01 | Processo é **só do superpowers**. Do wshobson entram só especialistas; os plugins de processo dele ficam de fora (`conductor`, `tdd-workflows`, `comprehensive-review`, `debugging-toolkit`, `error-debugging`, `agent-teams`, `full-stack-orchestration`, `ship-mate`, `operating-kit`, `context-management`, `pensyve`). |
| DEV-02 | Nunca carregar tudo: a stack do projeto é detectada **automaticamente** e só aqueles plugins ficam ligados; na tarefa, só entram as instruções da stack envolvida. |
| DEV-03 | O objetivo de negócio é **vender landing pages**; o DevAgents precisa ser muito bom nisso. A fábrica que já existe vira parte dele, em vez de trocar por outro projeto pronto. |
| DEV-04 | Landing pages **muito animadas e interativas**, com várias cenas ao longo do scroll. Processo o mais automático possível, com poucos pontos manuais e **visuais** (sem exigir leitura de código). |
| DEV-05 | Troca de turno com Codex configurada e usada; retorno pelos arquivos de passagem de turno. |
| DEV-06 | Paper opcional enquanto durar o plano grátis; direção visual em HTML/código. Retomar Paper se houver assinatura. |

---

## 2. Como as peças se encaixam

### Fluxo de um sistema (API, sistema de gestão, app)

```
Pedido
  ▼
superpowers · brainstorming      → perguntas, uma por vez, em linguagem simples
  ▼
(opcional) Paper                 → telas principais (painel, formulários) desenhadas e ajustadas por você
  ▼
superpowers · plano              → tarefas pequenas, com arquivos e critério de pronto · você aprova
  ▼
superpowers · execução           → uma tarefa por vez; para cada uma, a skill orquestrador escolhe:
  │                                   QUAL especialista → pela stack dos arquivos (.cs, .java, .tsx, .py, .sql)
  │                                   QUAL modelo       → MECÂNICA haiku · SIMPLES sonnet · COMPLEXA opus
  ▼
superpowers · TDD + revisão + verificação  → prova (testes, build) antes de dizer "pronto"
  ▼
/subir                           → commit, push e deploy (Cloudflare, Render, Supabase)
```

### Fluxo de uma landing page

```
1. Material do cliente ........ automático   lp-coleta: fotos, dados, avaliações
2. Referências ................ você 5–10 min o sistema traz 10–15 candidatos COM VÍDEO; você escolhe 2–3 e diz o porquê
3. Layout no Paper ............ você + Claude o Claude monta 3 direções como pranchas; você escolhe e edita na tela
4. Movimento .................. você escolhe  3 cenas de scroll já rodando no navegador (biblioteca de cenas)
5. Construção ................. automático   Paper → site; aplica as cenas; superpowers cuida do código
6. Revisão .................... você assiste  vídeo da página rolando no celular e no computador; você aponta, ele corrige
7. Aprovação e publicação ..... você aprova   lp-publicar: demo no Cloudflare + mensagem de venda
```

Seus pontos manuais são 4, todos visuais: **escolher** (referências, direção, cena), **editar** no Paper,
**assistir** a revisão em vídeo e **aprovar**.

### Regra do Paper: uma fonte de verdade por vez
Até aprovar o layout, **o Paper manda**. Depois que vira site, **o código manda**. Mudanças depois disso são
pedidas por conversa ou feitas no site, não no Paper (senão os dois saem de sincronia).

---

## 3. Estrutura do repositório

```
DevAgents/
├── .claude-plugin/
│   └── marketplace.json          → marketplace "devagents"
├── plugins/
│   ├── devagents-core/           → sempre ligado
│   │   ├── agents/               → tarefas-mecanicas, simple-tasks, complex-tasks (roteamento)
│   │   ├── skills/               → orquestrador (decide quem faz), memoria, subir
│   │   └── hooks/                → detecção de stack ao abrir a sessão
│   ├── stack-dotnet/             → C#, ASP.NET Core, EF Core
│   ├── stack-java/               → Java, Spring
│   ├── stack-typescript/         → TypeScript, Node, React, Next
│   ├── stack-python/             → Python
│   ├── stack-banco/              → Postgres, Supabase, migrações
│   ├── seguranca/                → API, frontend, varredura (OWASP, dependências)
│   ├── design-paper/             → skill de trabalho com o Paper (direções, ler edições, fonte de verdade)
│   └── landing-pages/            → lp-* + arsenal + biblioteca de cenas + animação
│       └── cenas/                → receitas de cenas de scroll testadas (código + vídeo + licença)
├── scripts/
│   ├── instalar                  → instala superpowers + devagents + MCP do Paper em qualquer máquina
│   ├── ativar-projeto            → alternativa manual à detecção automática
│   └── comparar-origem           → o que mudou no wshobson desde a última cópia
├── fontes.json                   → de onde veio cada arquivo copiado (repo, caminho, commit, licença)
├── docs/
│   ├── plano-de-acao.md          → este arquivo
│   ├── decisoes.md               → decisões e por quê
│   └── continuar.md              → onde paramos
├── LICENSE                       → MIT
├── NOTICE                        → créditos (superpowers, wshobson, arsenal de design)
└── README.md
```

Ativação por tipo de projeto (exemplos):

| Projeto | Plugins ligados |
|---|---|
| Landing page | core + `landing-pages` + `design-paper` + `stack-typescript` |
| Sistema de gestão (.NET + front) | core + `stack-dotnet` + `stack-typescript` + `stack-banco` + `seguranca` (+ `design-paper` se quiser) |
| API Java | core + `stack-java` + `stack-banco` + `seguranca` |

---

## 4. Fases

A ordem prioriza o que é decisivo: os pilotos (superpowers e Paper) vêm cedo, porque mudam o resto.

### Fase 0 — Base do repositório
- `git init`, `README.md`, `LICENSE`, `NOTICE`, `.gitignore`, `docs/decisoes.md`, pastas vazias da estrutura.
- Repositório no GitHub (público ou privado — pergunta 1).

**Pronto quando:** repositório criado com a estrutura.

### Fase 1 — Inventário
O que existe hoje e o destino de cada item:

| Item | Onde está | Destino |
|---|---|---|
| `tarefas-mecanicas`, `simple-tasks`, `complex-tasks` | `~/.claude/agents` | `devagents-core` (pergunta 3) |
| `memoria`, `subir` | `~/.claude/skills` | `devagents-core` (pergunta 3; revisar dado pessoal antes) |
| `pacote` | `~/.claude/skills` | aposentar quando a detecção automática funcionar |
| `modern-csharp-coding-standards` | global | `stack-dotnet` |
| `vercel-react-best-practices` | global **e** LandingPages | `stack-typescript` (uma cópia só) |
| `supabase-postgres-best-practices`, `postgresql-code-review` | global | `stack-banco` |
| `accessibility`, `web-design-guidelines` | global (+ LandingPages) | `landing-pages` (uma cópia só) |
| `frontend-design`, `impeccable` | global **e** LandingPages, versões diferentes | `landing-pages` (versão do arsenal) |
| `premium-landing-designer`, `website-design`, `design-taste-frontend` | global | avaliar contra o arsenal; pela regra "só famoso", tendem a sair |
| `find-skills` | global | manter global |
| 10 `lp-*` + 18 skills do arsenal | LandingPages | `landing-pages` |
| hook `git-autoria` | `~/.claude/settings.json` | manter global |

Stacks encontradas nos projetos (inferido dos arquivos): C#/.NET (Sistema de Gestão, Payment API, Nemus),
Java (SmartKey API, HackGov), TypeScript/React (maioria), Python (Nemus, gesture-switch),
Supabase, Cloudflare e Render.

**Pronto quando:** tabela confirmada em `docs/decisoes.md`.

### Fase 2 — Pilotos (decidem o resto)
**2a. Superpowers:** instalar pelo marketplace dele e fazer uma feature pequena real num sistema existente.
Anotar o que incomodou (perguntas demais, git worktree confuso etc.).

**2b. Paper:** instalar o Paper Desktop e conectar o MCP no Claude Code (o guia indica
`claude mcp add paper --transport http http://127.0.0.1:29979/mcp --scope user` — conferir na documentação).
Teste: o Claude monta só o **topo** de uma landing page no Paper → você edita algumas coisas → o Claude lê as
mudanças e continua → o Claude transforma em código. Medir quantas ações gastou (plano grátis: 100/semana
em fev/2026; Pro US$ 20/mês na época).

**Pronto quando:** decisão registrada para cada um (adota / ajusta / descarta). Se o Paper não servir, o
plano B é prancha no navegador + ajustes por conversa.

### Fase 3 — Núcleo (`devagents-core`)
- Mover os 3 agentes de roteamento e as skills `memoria` e `subir` (sem dado pessoal em arquivo versionado).
- Skill `devagents-fluxo` (desde 20/10 é a `orquestrador`): em cada tarefa do superpowers, escolher especialista pela stack e modelo pela
  classificação; tarefa pequena e clara vai direto, sem cerimônia. O superpowers não é editado.
- Hook de início de sessão: detecta a stack (`.sln`/`.csproj`, `pom.xml`, `package.json`, `requirements.txt`,
  `supabase/`, `wrangler.jsonc`) e liga só os plugins certos no `.claude/settings.json` do projeto.
  A confirmar: se ligar plugin exige reiniciar a sessão (nesse caso, só na primeira vez por projeto).

**Pronto quando:** abrir um projeto qualquer liga as stacks certas sozinho.

### Fase 4 — Especialistas por stack
Para cada plugin de stack:
1. Copiar do wshobson os agentes e skills da tabela e registrar em `fontes.json`.
2. Juntar com as skills de stack que você já tem (Fase 1).
3. Modelo: **sonnet** por padrão; **opus** só em arquitetura e modelagem de banco (vários vêm em opus, o mais caro).
4. `description` em português dizendo **quando usar**.
5. Acrescentar convenções próprias (versões, pastas, testes, tratamento de erro).

| Plugin | Origem no wshobson |
|---|---|
| `stack-dotnet` | `dotnet-contribution` (dotnet-architect, dotnet-backend-patterns) + `csharp-pro` |
| `stack-java` | `java-pro` (de `jvm-languages`) |
| `stack-typescript` | `javascript-typescript` (typescript-pro, javascript-pro + 4 skills) |
| `stack-python` | `python-development` |
| `stack-banco` | `database-design` (database-architect, sql-pro, postgresql-table-design) + `database-migrations` |
| `seguranca` | `backend-api-security`, `frontend-mobile-security`, `security-scanning` |

**Pronto quando:** cada stack testada numa tarefa real de um projeto seu, com o especialista certo escolhido sozinho.

### Fase 5 — Landing pages: trazer a fábrica
- Mover as `lp-*` e o arsenal (taste-skill, impeccable, hallmark, ui-ux-pro-max, frontend-design, Emil
  Kowalski, marketingskills, claude-seo, Vercel, Cloudflare) para o plugin `landing-pages`, mantendo o
  travamento `user-invocable-only` (só a `lp-*` da etapa chama) e as regras confirmadas LP-xx.
- Tirar do versionado: nomes de clientes, dados pessoais, material de clientes.
- O projeto `LandingPages` passa a ser só o espaço de clientes e prospecção, usando o plugin (pergunta 5).
- Quem conduz: proposta = `lp-maestro` conduz as etapas do negócio; superpowers só no código da construção (pergunta 4).

**Pronto quando:** uma landing page feita pelo plugin numa pasta nova, com o mesmo resultado de hoje.

### Fase 6 — Paper no fluxo (depois do piloto 2b)
- Skill `design-paper`:
  - montar **3 direções** como pranchas no Paper, com fotos e textos reais do cliente;
  - ler as edições feitas por você e continuar a partir delas;
  - converter o layout aprovado em código (React + Tailwind) seguindo `lp-construcao`;
  - aplicar a regra "uma fonte de verdade por vez".
- `lp-direcao-de-arte` passa a entregar no Paper em vez de pranchas soltas.
- **Paper Shaders** (`paper-design/shaders`, 3,6 mil ⭐, Apache-2.0) entra na biblioteca de cenas como
  fundos animados (gradiente em movimento, metal líquido, grão).
- Em sistemas: opcional, para telas principais (painel, formulários, relatórios) antes de codar.

**Pronto quando:** uma landing page com layout feito e editado no Paper chega ao site sem retrabalho.

### Fase 7 — Movimento: sites "de cinema"
**Por que a fábrica atual não faz:** foi montada para animação contida — "só Motion, sem GSAP" (LP-10),
"sem seção presa além do topo" (LP-09) e a filosofia do Emil (animar pouco). Cena guiada por scroll
normalmente prende a seção. **Mudar depende de aprovação (pergunta 6).**

1. **Biblioteca de cenas:** 20–30 cenas de scroll testadas, de fontes famosas (demos oficiais do GSAP,
   Codrops, sites premiados), cada uma com código, vídeo e licença: objeto por um caminho (o caminhão),
   sequência de quadros (estilo Apple), camadas com profundidade, texto revelado, 3D girando, fundo shader.
   O sistema escolhe pelo nicho e adapta; cada cena aprovada num cliente vira receita nova.
2. **Ferramentas:** GSAP + ScrollTrigger (skill oficial `greensock/gsap-skills`, 16,4 mil ⭐, MIT) e Lenis
   (rolagem suave, 16,5 mil ⭐). 3D (Three.js / React Three Fiber) só quando a cena pedir — sem skill
   famosa, escrever uma própria.
3. **Assets (o gargalo real):** ilustração SVG, modelo 3D (CC0) ou vídeo gerado por IA convertido em
   quadros que o scroll "roda". Nova etapa `lp-assets`.
4. **Etapa "conceito de movimento"** no `lp-maestro`: 3 cenas rodando para você escolher (mostrar em vez de perguntar).
5. **Celular e velocidade:** orçamento de peso, versão leve no celular, `prefers-reduced-motion`.
6. **Equilíbrio:** layout continua organizado (LP-09) e cada site ganha **1–2 cenas-assinatura** onde o
   pin é permitido, em vez de animação espalhada em tudo.
7. **Estudo:** `agiwhitelist/auteur` (1 mil ⭐, MIT, "dirige um site como um filme") — pouco conhecido;
   ler para aproveitar ideias, não instalar.

**Pronto quando:** um site de demonstração (ex.: transportadora) com cenas guiadas por scroll fluidas no
celular e no computador.

### Fase 8 — Referências automáticas
- `lp-referencias` busca nas galerias que aceitam acesso automático — Awwwards (filtros Landing Page +
  Animation), GSAP Showcase, Godly — pelo nicho do cliente e pelo tipo de cena.
  (Land-book, Lapa Ninja e SiteInspire bloquearam acesso automático no teste de 14/10/2026.)
- Grava **vídeo curto de cada candidato rolando** (print não mostra animação) e entrega numa página só, lado a lado.
- Pasta de **favoritos** sua (site + uma frase do porquê): o sistema busca nela primeiro, depois nas galerias.

**Pronto quando:** para um nicho novo, você recebe 10–15 candidatos em vídeo e escolhe em menos de 10 minutos.

### Fase 9 — Uso em qualquer máquina
- Script `instalar`: marketplaces (superpowers + devagents), `devagents-core` e MCP do Paper.
- Aposentar o `/pacote`.

**Pronto quando:** num computador limpo, `instalar` deixa tudo funcionando.

### Fase 10 — Validação (1–2 semanas)
- Usar no dia a dia e anotar: tokens por tarefa (`/cost`), retrabalho, bugs que escaparam, tempo por landing page.
- Cortar o que não ajudou, reforçar o que ajudou.

**Pronto quando:** decisão registrada sobre o que fica, com números.

### Fase 11 — Manutenção
- Superpowers atualiza pelo marketplace (conferir se a integração continua funcionando).
- `comparar-origem` mostra o que mudou nos arquivos copiados do wshobson e do arsenal; trazer só o que interessa.

---

## 5. Regras do projeto

- Processo é **só** do superpowers (exceção possível: `lp-maestro` nas etapas de negócio da landing page — pergunta 4).
- Cada especialista tem `description` dizendo **quando usar** e modelo escolhido de propósito.
- Opus permanece na conversa principal (DEV-29/30); ajudantes e especialistas usam o modelo definido
  para sua função. Delegação é por necessidade e escopo, sem rebaixar a principal para buscar economia.
- Poucos plugins ligados por projeto: só os que ele usa.
- Só projetos famosos no arsenal (milhares de estrelas); avisar quando algo for pouco conhecido.
- Paper: uma fonte de verdade por vez (Paper até aprovar o layout; código depois).
- Todo arquivo copiado registrado em `fontes.json`; créditos no `NOTICE`; licença conferida.
- Nada de dado pessoal, segredo, token ou material de cliente em arquivo versionado.

## 6. Perguntas em aberto

1. Repositório no GitHub público ou privado?
2. Stacks: as encontradas nos projetos (.NET, Java, TypeScript, Python, Supabase) — falta alguma? Alguma sobra?
3. Mover `memoria`, `subir` e os agentes de roteamento para dentro do DevAgents (fonte única) ou deixar no `~/.claude`?
4. Landing page: `lp-maestro` conduz as etapas do negócio e o superpowers só entra no código? (exceção à DEV-01)
5. O projeto `LandingPages` fica só com clientes e prospecção, usando o plugin?
6. Liberar GSAP e seção presa (pin) só nas cenas-assinatura? (contraria LP-09 e LP-10, confirmadas)
