# Auditoria de segurança das skills — 29/10/2026

## Resultado e escopo

Varredura estática das **69 skills atuais do projeto**, incluindo Paper obsoleto e consultoras travadas, e **49 arquivos de script** detectados. Raízes: plugins/, .claude/skills, .agents/skills, .codex/skills. Nenhum link foi seguido. Configurações/memória globais, node_modules, cópias históricas dos ensaios e fixtures temporárias não compõem as skills atuais auditadas. Não foram executados scripts das skills, instaladas novas skills ou enviados arquivos a serviços de análise.

**112 alertas brutos: 26 críticos, 49 altos e 37 médios, em 12 skills; 57 sem alertas. Nenhum crítico novo além dos casos já registrados. Não foi confirmado malware nesta análise.** Isso não certifica ausência de ameaça: assinaturas têm falsos positivos e negativos; a revisão foi dirigida aos alertas e comportamentos sensíveis, não uma auditoria manual linha por linha de todos os arquivos empacotados.

## Ferramentas pesquisadas

- [Sentry skill-scanner](https://github.com/getsentry/skills/tree/main/skills/skill-scanner): skill oficial, já incorporada no núcleo do projeto e adaptada para percorrer scripts aninhados Node/PowerShell. Foi a ferramenta efetivamente usada. Hash e resultados completos em pilotos/testes-temporarios/auditoria-skills-29-10/resultado.json; runner local auditar.py. Complemento percorreu Markdown aninhado que o scanner original deixa fora.
- [Cisco AI Defense Skill Scanner](https://github.com/cisco-ai-defense/skill-scanner): projeto oficial com detecção por padrões, AST/fluxo e opções adicionais de análise. É a candidata mais próxima da descrição de ferramenta de uma grande empresa; não foi instalada nem executada nesta rodada.
- [Microsoft HVE: modelo de segurança de skills](https://github.com/microsoft/hve-core/blob/main/.github/instructions/skill-security-model.instructions.md): estrutura de threat model, não confirmação de um scanner antimalware equivalente. Não foi identificada com segurança uma skill Microsoft que corresponda exatamente ao nome lembrado.

## Triagem dos alertas

| Grupo | Interpretação após leitura do contexto |
|---|---|
| 26 críticos já registrados | Exemplos de ataques no próprio scanner; regras defensivas break-ui/find-animation-opportunities; memoria/mensagens.cjs lê transcrições locais para recuperar contexto. Não são evidência nova de malware. Não foi alterada a lista de aceites. |
| Base64 e caracteres invisíveis no scanner | Exemplos pedagógicos de codificação e injeção. |
| ZWJ em break-ui/CATALOG.md | Emoji composto usado como caso de teste de nomes, não instrução escondida. |
| Nove segredos em javascript-testing-patterns/references/advanced-testing-patterns.md | Dados de exemplo de testes, como password123 e usuários example.com; não foram confirmadas credenciais reais. Conteúdo foi omitido da evidência consolidada por precaução. |
| exec em impeccable | Ocorrências examinadas são RegExp.exec para CSS/cores/fontes, não execução de shell. O bundle também faz requisições para capturar fontes/imagens da página. Não é justificativa para executar em páginas sensíveis sem revisar a origem. |
| eval em taste/estúdio | Avaliação de probes no navegador via CDP; não é automaticamente eval de código remoto no Node. Mantém capacidade de ler a página e deve usar perfil isolado. |
| child_process em gravadores/revisores | Inicialização de navegador, ffmpeg e ferramentas locais, coerente com a função. A capacidade de execução existe; não executar scripts novos só porque o scanner não acusou malware. |
| Rede em assets/Paper/taste | Download de mídia, HTTP local MCP e inspeção/captura de recursos. Não foi identificado envio de credenciais nesses trechos; rede e leitura de páginas continuam superfícies de risco. |
| Nome divergente taste-skill | Frontmatter design-taste-frontend é identidade herdada da consultora, não sinal de malware por si só. |

## Lacuna antes da instalação

O hook verificar-instalados atual examina SessionStart e PostToolUse: avisa depois de instalar e não bloqueia automaticamente. Não deve ser apresentado como barreira pré-instalação. O teste skills-do-kit também cobre críticos novos no kit, não todos os riscos de pacotes/dependências.

Procedimento para qualquer skill nova: obter o conteúdo como dado, sem rodar setup/build/npm install; revisar SKILL.md, scripts, hooks e dependências; executar a análise local e contextualizar alertas; somente depois instalar a candidata aprovada no escopo autorizado. Atualizações exigem nova análise do conteúdo alterado. Não baixar e executar o instalador da própria candidata antes de analisá-la. Uma integração bloqueante universal do CLI não foi implementada nesta auditoria.

## Inventário por skill

| Skill | Críticos brutos | Altos brutos | Médios brutos | Resultado automático |
|---|---:|---:|---:|---|
| plugins/design-paper/skills/design-paper | 0 | 0 | 1 | alertas contextualizados; ver triagem |
| plugins/devconductor-core/skills/codex-parceiro | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/devconductor-core/skills/find-skills | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/devconductor-core/skills/memoria | 1 | 0 | 0 | alertas contextualizados; ver triagem |
| plugins/devconductor-core/skills/orquestrador | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/devconductor-core/skills/skill-scanner | 23 | 15 | 2 | alertas contextualizados; ver triagem |
| plugins/devconductor-core/skills/subir | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/estudio-design/skills/estudio-movimento | 0 | 4 | 1 | alertas contextualizados; ver triagem |
| plugins/grafo-codigo/skills/grafo-codigo | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/break-ui | 1 | 1 | 0 | alertas contextualizados; ver triagem |
| plugins/landing-pages/skills/copywriting | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/cro | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/emil-design-eng | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/find-animation-opportunities | 1 | 0 | 0 | alertas contextualizados; ver triagem |
| plugins/landing-pages/skills/frontend-design | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/gsap-core | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/gsap-performance | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/gsap-plugins | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/gsap-react | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/gsap-scrolltrigger | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/gsap-timeline | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/gsap-utils | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/hallmark | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/impeccable | 0 | 4 | 21 | alertas contextualizados; ver triagem |
| plugins/landing-pages/skills/lp-assets | 0 | 0 | 2 | alertas contextualizados; ver triagem |
| plugins/landing-pages/skills/lp-cenas | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-coleta | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-construcao | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-direcao-de-arte | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-maestro | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-paleta | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-publicar | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-referencias | 0 | 2 | 0 | alertas contextualizados; ver triagem |
| plugins/landing-pages/skills/lp-revisao | 0 | 2 | 2 | alertas contextualizados; ver triagem |
| plugins/landing-pages/skills/lp-seo | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-textos | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/lp-tipografia | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/motion-design | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/responsive-design | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/review-animations | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/taste-skill | 0 | 12 | 8 | alertas contextualizados; ver triagem |
| plugins/landing-pages/skills/threejs-asset-pipeline | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/threejs-lighting | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/threejs-loaders | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/threejs-performance | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/threejs-react-three-fiber | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/threejs-shaders | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/ui-ux-pro-max | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/web-design-guidelines | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/web-perf | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/landing-pages/skills/wrangler | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/seguranca/skills/sast-configuration | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-banco/skills/postgresql-code-review | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-banco/skills/postgresql-table-design | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-banco/skills/supabase-postgres-best-practices | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-dotnet/skills/dotnet-backend-patterns | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-dotnet/skills/modern-csharp-coding-standards | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-python/skills/async-python-patterns | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-python/skills/python-anti-patterns | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-python/skills/python-code-style | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-python/skills/python-error-handling | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-python/skills/python-project-structure | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-python/skills/python-testing-patterns | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-python/skills/python-type-safety | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-typescript/skills/javascript-testing-patterns | 0 | 9 | 0 | alertas contextualizados; ver triagem |
| plugins/stack-typescript/skills/modern-javascript-patterns | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-typescript/skills/nodejs-backend-patterns | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-typescript/skills/typescript-advanced-types | 0 | 0 | 0 | sem padrão sinalizado |
| plugins/stack-typescript/skills/vercel-react-best-practices | 0 | 0 | 0 | sem padrão sinalizado |

Os números são sinais brutos, não contagem de malwares. Sem dinâmica de malware, sandbox de sistema operacional, antivírus de binários ou cobertura garantida de dependências transitivas. Cisco não foi utilizado: nenhuma conclusão foi atribuída a ele. Prova de design pausada por pedido do usuário; a gravação própria em andamento foi encerrada e a saída parcial preservada.
