# Responsabilidades das skills — Fase D

Tabela gerada de `plugins/devconductor-core/skills/orquestrador/referencias/responsabilidades.json`.
Regerar: `node scripts/auditar-responsabilidades.mjs --markdown`. Verificar: `node scripts/auditar-responsabilidades.mjs`.

Um responsável por decisão e uma origem por skill. O responsável de stack é a referência técnica: só vira agente
para uma tarefa isolada que justifique a delegação. Design, movimento e textos ficam na conversa principal.
Pesquisador, testador e publicador recebem o recorte da tarefa; não carregam esta lista inteira.
Outra etapa pode consultar uma skill na origem indicada, sem duplicar o arquivo ou carregar toda a família.
Método externo: superpowers (instalado à parte); não se copia seu processo para estas skills.

† Dependência local opcional, excluída do Git por licença pendente. Ausência não perde cobertura; não redistribuir.

| Skill (origem única) | Responsável | Carregar |
|---|---|---|
| `design-sistemas:baseline-ui` | `design-sistemas:ui-sistemas` | pela etapa, sob demanda |
| `design-sistemas:create-design-md` | `design-sistemas:ui-sistemas` | pela etapa, sob demanda |
| `design-sistemas:dashboard-design` | `design-sistemas:ui-sistemas` | pela etapa, sob demanda |
| `design-sistemas:fixing-accessibility` | `design-sistemas:ui-sistemas` | pela etapa, sob demanda |
| `design-sistemas:improve-ui` | `design-sistemas:ui-sistemas` | pela etapa, sob demanda |
| `design-sistemas:ui-sistemas` | `design-sistemas:ui-sistemas` | na etapa atual |
| `devconductor-core:codex-parceiro` | conversa principal | na tarefa pertinente |
| `devconductor-core:faxina` | conversa principal | na tarefa pertinente |
| `devconductor-core:find-skills` | conversa principal | na tarefa pertinente |
| `devconductor-core:memoria` | conversa principal | na tarefa pertinente |
| `devconductor-core:orquestrador` | conversa principal | na tarefa pertinente |
| `devconductor-core:skill-scanner` | conversa principal | na tarefa pertinente |
| `devconductor-core:subir` | conversa principal | na tarefa pertinente |
| `estudio-design:estudio-movimento` | conversa principal | na tarefa pertinente |
| `grafo-codigo:grafo-codigo` | conversa principal | na tarefa pertinente |
| `landing-pages:break-ui` | `landing-pages:lp-revisao` | pela etapa, sob demanda |
| `landing-pages:copywriting` | `landing-pages:lp-textos` | pela etapa, sob demanda |
| `landing-pages:cro` | `landing-pages:lp-coleta` | pela etapa, sob demanda |
| `landing-pages:emil-design-eng` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:find-animation-opportunities` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:frontend-design` | `landing-pages:lp-direcao-de-arte` | pela etapa, sob demanda |
| `landing-pages:gsap-core` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:gsap-performance` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:gsap-plugins` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:gsap-react` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:gsap-scrolltrigger` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:gsap-timeline` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:gsap-utils` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:hallmark` | `landing-pages:lp-referencias` | pela etapa, sob demanda |
| `landing-pages:impeccable` | `landing-pages:lp-direcao-de-arte` | pela etapa, sob demanda |
| `landing-pages:lp-assets` | `landing-pages:lp-assets` | na etapa atual |
| `landing-pages:lp-cenas` | `landing-pages:lp-cenas` | na etapa atual |
| `landing-pages:lp-coleta` | `landing-pages:lp-coleta` | na etapa atual |
| `landing-pages:lp-construcao` | `landing-pages:lp-construcao` | na etapa atual |
| `landing-pages:lp-direcao-de-arte` | `landing-pages:lp-direcao-de-arte` | na etapa atual |
| `landing-pages:lp-maestro` | `landing-pages:lp-maestro` | na etapa atual |
| `landing-pages:lp-paleta` | `landing-pages:lp-paleta` | na etapa atual |
| `landing-pages:lp-publicar` | `landing-pages:lp-publicar` | na etapa atual |
| `landing-pages:lp-referencias` | `landing-pages:lp-referencias` | na etapa atual |
| `landing-pages:lp-revisao` | `landing-pages:lp-revisao` | na etapa atual |
| `landing-pages:lp-seo` | `landing-pages:lp-seo` | na etapa atual |
| `landing-pages:lp-textos` | `landing-pages:lp-textos` | na etapa atual |
| `landing-pages:lp-tipografia` | `landing-pages:lp-tipografia` | na etapa atual |
| `landing-pages:motion-design` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:responsive-design` | `landing-pages:lp-construcao` | pela etapa, sob demanda |
| `landing-pages:review-animations` | `landing-pages:lp-revisao` | pela etapa, sob demanda |
| `landing-pages:design-taste-frontend` (pasta `taste-skill`) | `landing-pages:lp-direcao-de-arte` | pela etapa, sob demanda |
| `landing-pages:threejs-asset-pipeline` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:threejs-lighting` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:threejs-loaders` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:threejs-performance` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:threejs-react-three-fiber` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:threejs-shaders` | `landing-pages:lp-cenas` | pela etapa, sob demanda |
| `landing-pages:ui-ux-pro-max` | `landing-pages:lp-direcao-de-arte` | pela etapa, sob demanda |
| `landing-pages:web-design-guidelines` † | `landing-pages:lp-revisao` | pela etapa, sob demanda |
| `landing-pages:web-perf` | `landing-pages:lp-revisao` | pela etapa, sob demanda |
| `landing-pages:wrangler` | `landing-pages:lp-publicar` | pela etapa, sob demanda |
| `seguranca:sast-configuration` | `seguranca:security-auditor` | na tarefa pertinente |
| `stack-banco:postgresql-code-review` † | `stack-banco:sql-pro` | na tarefa pertinente |
| `stack-banco:postgresql-table-design` | `stack-banco:database-architect` | na tarefa pertinente |
| `stack-banco:supabase-postgres-best-practices` | `stack-banco:database-architect` | na tarefa pertinente |
| `stack-dotnet:dotnet-backend-patterns` | `stack-dotnet:csharp-pro` | na tarefa pertinente |
| `stack-dotnet:modern-csharp-coding-standards` | `stack-dotnet:csharp-pro` | na tarefa pertinente |
| `stack-python:async-python-patterns` | `stack-python:python-pro` | na tarefa pertinente |
| `stack-python:python-anti-patterns` | `stack-python:python-pro` | na tarefa pertinente |
| `stack-python:python-code-style` | `stack-python:python-pro` | na tarefa pertinente |
| `stack-python:python-error-handling` | `stack-python:python-pro` | na tarefa pertinente |
| `stack-python:python-project-structure` | `stack-python:python-pro` | na tarefa pertinente |
| `stack-python:python-testing-patterns` | `stack-python:python-pro` | na tarefa pertinente |
| `stack-python:python-type-safety` | `stack-python:python-pro` | na tarefa pertinente |
| `stack-typescript:javascript-testing-patterns` | `stack-typescript:javascript-pro` | na tarefa pertinente |
| `stack-typescript:modern-javascript-patterns` | `stack-typescript:javascript-pro` | na tarefa pertinente |
| `stack-typescript:nodejs-backend-patterns` | `stack-typescript:javascript-pro` | na tarefa pertinente |
| `stack-typescript:typescript-advanced-types` | `stack-typescript:typescript-pro` | na tarefa pertinente |
| `stack-typescript:vercel-react-best-practices` † | `stack-typescript:typescript-pro` | na tarefa pertinente |

