# Licenças: posso publicar o DevConductor com skills de terceiros?

Auditoria de 05/11/2026. Resposta curta: **sim**, desde que cada cópia leve o aviso de copyright e o texto da
licença de origem, e os arquivos Apache-2.0 alterados digam que foram alterados. Isso foi feito nesta data.
Nenhum item do kit é "sem licença": todos são MIT ou Apache-2.0. (Não é parecer jurídico.)

## 1. O que diz a regra

**Estar no GitHub não é ser open source.** Sem arquivo de licença, o autor mantém todos os direitos: dá para
ver e fazer fork dentro do GitHub (Termos do GitHub, seção D.5), mas não para copiar e republicar.
Fontes: <https://choosealicense.com/no-permission/>,
<https://docs.github.com/en/site-policy/github-terms/github-terms-of-service>.

| Licença | Pode copiar, mudar e publicar? | O que exige |
|---|---|---|
| MIT | Sim, até comercial | Manter o aviso de copyright e o texto da licença junto da cópia. <https://choosealicense.com/licenses/mit/> |
| BSD-2 / BSD-3 | Sim | Igual ao MIT; a BSD-3 proíbe usar o nome do autor para promover. <https://choosealicense.com/licenses/bsd-3-clause/> |
| Apache-2.0 | Sim | §4a cópia da licença; §4b aviso visível nos arquivos alterados; §4c manter os avisos originais; §4d levar o NOTICE da origem, se houver; §6 não dá direito à marca. <https://www.apache.org/licenses/LICENSE-2.0.txt> |
| CC-BY-4.0 | Sim | Crédito ao autor, link da licença e dizer se modificou (§3(a)(1)). <https://creativecommons.org/licenses/by/4.0/legalcode> |
| CC-BY-SA-4.0 | Sim | Tudo do CC-BY e a obra derivada sai na mesma licença (§3(b)). <https://creativecommons.org/licenses/by-sa/4.0/legalcode.en> |
| CC-BY-NC-4.0 | Só uso não comercial | Portfólio para conseguir emprego ou clientes pode ser lido como comercial (zona cinzenta admitida pela própria CC). Evitar. <https://wiki.creativecommons.org/wiki/NonCommercial_interpretation> |
| GPL-3.0 | Sim | O derivado sai em GPL, com código aberto, avisos mantidos e mudanças declaradas. <https://choosealicense.com/licenses/gpl-3.0/> |
| Sem licença | **Não** | Só com permissão do autor. |

**Autoria.** O autor do kit pode assinar o que ele escreveu (as skills próprias, os scripts, os testes, as
mudanças) e o conjunto do kit. Não pode apagar nem trocar o copyright de quem fez o original: o aviso original
fica, e a mudança é dita à parte (NOTICE, `fontes.json`, aviso no arquivo).

**Marcas e nomes.** A licença do código não dá direito ao nome ou ao logotipo do projeto (Apache §6; a MIT
não fala de marca). Citar o nome para dar crédito ("copiado de pbakaus/impeccable") pode; sugerir que o
projeto original apoia o DevConductor, não.

**Licença só no cabeçalho ou no README.** É uma declaração válida do autor, mas mais fraca que um arquivo
LICENSE (falta o texto e o titular). Caso da vercel-labs/agent-skills, tratado abaixo.

## 2. Itens de terceiros no repositório

Licenças conferidas no GitHub (`gh api repos/<origem>`) em 05/11/2026. Origem exata de cada arquivo:
`fontes.json` e os `FONTES.md` de cada plugin.

| Onde | Origem | Licença | Situação |
|---|---|---|---|
| Agentes e skills em `stack-dotnet`, `stack-java`, `stack-python`, `stack-typescript`, `stack-banco`, `seguranca`; `landing-pages/skills/responsive-design` | wshobson/agents | MIT (Seth Hobson) | Publicar. LICENSE acrescentada em cada skill e em `plugins/<p>/LICENSES/wshobson-agents.txt` para os agentes. |
| `stack-dotnet/skills/modern-csharp-coding-standards` | aaronontheweb/dotnet-skills | MIT | Publicar. LICENSE acrescentada. |
| `stack-banco/skills/supabase-postgres-best-practices` | supabase/agent-skills | MIT | Publicar. LICENSE acrescentada. |
| `stack-banco/skills/postgresql-code-review` | github/awesome-copilot (`skills/postgresql-code-review`) | MIT (GitHub, Inc.) | Publicar. Origem antes "não identificada", agora achada; LICENSE acrescentada. |
| `stack-typescript/skills/vercel-react-best-practices`, `landing-pages/skills/web-design-guidelines` | vercel-labs/agent-skills | MIT declarada no README (e no SKILL.md da react); a origem não tem arquivo LICENSE | Publicar. A web-design-guidelines vem, na verdade, de vercel-labs/web-interface-guidelines (MIT, Copyright 2025 Vercel Labs): LICENSE dela na pasta. Na react, titular inferido (a origem não diz). |
| `devconductor-core/skills/skill-scanner` | getsentry/skills | Apache-2.0 | Publicar. LICENSE já existia; acrescentado o aviso de modificação no SKILL.md (o script já marca as mudanças com "DevConductor"). |
| `devconductor-core/skills/find-skills` | vercel-labs/skills | MIT | Publicar (já tinha LICENSE). |
| `landing-pages/skills/impeccable` | pbakaus/impeccable | Apache-2.0 | Publicar. LICENSE e NOTICE.md da origem acrescentados; aviso de modificação no SKILL.md. Embute a biblioteca modern-screenshot (MIT, wxm): licença em `scripts/modern-screenshot.LICENSE`. |
| `landing-pages/skills/wrangler`, `web-perf` | cloudflare/skills | Apache-2.0 | Publicar. LICENSE acrescentada; aviso de modificação. |
| `landing-pages/skills/frontend-design` | anthropics/skills (`skills/frontend-design`) | Apache-2.0 (LICENSE.txt na pasta) | Publicar. Aviso de modificação acrescentado. Atenção: docx/pdf/pptx/xlsx da Anthropic **não** são abertos; não copiar. |
| `landing-pages/skills/taste-skill` | Leonxlnx/taste-skill | MIT | Publicar. LICENSE acrescentada. |
| `landing-pages/skills/hallmark` | Nutlope/hallmark | MIT | Publicar. LICENSE acrescentada. |
| `landing-pages/skills/ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill | MIT | Publicar. LICENSE acrescentada. |
| `landing-pages/skills/emil-design-eng`, `find-animation-opportunities`, `review-animations`, `break-ui` | emilkowalski/skill | MIT | Publicar. LICENSE acrescentada. |
| `landing-pages/skills/copywriting`, `cro` | coreyhaines31/marketingskills | MIT | Publicar. LICENSE acrescentada. |
| `landing-pages/skills/lp-seo` (mescla própria) | AgriciDaniel/claude-seo + coreyhaines31/marketingskills | MIT | Publicar (as duas licenças já na pasta). |
| `landing-pages/skills/gsap-*` | greensock/gsap-skills | MIT | Publicar (LICENSE.txt já na pasta). A biblioteca GSAP em si tem licença própria e não vai no kit. |
| `landing-pages/skills/motion-design`, `threejs-*` | lottiefiles/motion-design-skill, CloudAI-X/threejs-skills | MIT | Publicar (LICENSE já na pasta). |
| `design-sistemas/skills/dashboard-design`, `baseline-ui`, `fixing-accessibility`, `improve-ui`, `create-design-md` | abdiraimov-otabek/dashboard-design-skill, ibelick/ui-skills | MIT | Publicar (LICENSE já na pasta). |
| `estudio-design`: fonte Saira | Omnibus-Type/Saira (via Fontsource) | SIL OFL 1.1 | Publicar com a licença junto (já está) e crédito no NOTICE (acrescentado). |
| Modelo 3D da caixa de ovos (demonstração Lastro) | Innerscene | CC0-1.0 | Publicar. |
| superpowers, Graphify | obra/superpowers, safishamsi/graphify | MIT | Não são copiados: instalados da origem. |

## Segunda checagem (independente)

Um segundo agente refez a conferência na origem (`gh api`: licença, texto do LICENSE, titular e NOTICE) dos itens
de maior risco e varreu `plugins/` atrás de terceiros não registrados. Veredito: nenhum item precisa sair. Ajustes
aplicados: titular correto da web-design-guidelines, crédito da modern-screenshot embutida no impeccable e da fonte
Saira no NOTICE. O código próprio fica em MIT (compatível com as partes MIT e Apache-2.0, que mantêm as suas
licenças e autores).

## 3. O que fica fora da vitrine

Não por licença, e sim por privacidade ou peso: `pilotos/` inteiro (sites de clientes reais, coletas com
telefones, fotos e vídeos), `docs/continuar.md` e outros documentos de estado com nomes de
clientes, `CLAUDE.md`, `.claude/`, memória, revisões do Codex, `graphify-out/`. A lista exata do que entra está
em `vitrine.json` (só no privado) e quem gera a cópia é a skill `subir` (ver [vitrine-publica.md](vitrine-publica.md)).

## 4. Antes de cada atualização da vitrine

1. Skill nova de terceiro: só MIT, Apache-2.0, BSD ou CC-BY; LICENSE da origem na pasta; registrar em
   `fontes.json`, no `FONTES.md` do plugin e no `NOTICE`. Apache alterada: aviso de modificação no arquivo.
2. Nunca copiar CC-BY-NC, GPL (obrigaria o kit inteiro a ser GPL) ou repositório sem licença.
3. Rodar `node scripts/gerar-vitrine.mjs --conferir` e uma varredura de segredos (`gitleaks dir`).
