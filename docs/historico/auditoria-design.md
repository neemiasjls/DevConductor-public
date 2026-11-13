# Auditoria das skills de design (29/10/2026)

Pergunta: as skills e plugins de design estão se atropelando e piorando os sites de teste?
Resposta curta: **sim, mas o maior freio está nas regras da própria fábrica**; as skills globais somam conflitos.
Feita em duas leituras independentes que chegaram ao mesmo diagnóstico. Rumo decidido: DEV-33 e DEV-34
(sites variados, muito movimento, 3D/WebGL e Lottie/Rive liberados, celular o mais igual possível ao computador).

## O que está errado (mais grave primeiro)

| # | Problema | Onde | Efeito no site |
|---|---|---|---|
| 1 | Regras de contenção da fábrica: uma grade, no máximo 2 modelos de seção; GSAP e cena presa só em 1–2 cenas | `lp-maestro/regras.md` (LP-09, DEV-11) | sites parecidos e quase estáticos |
| 2 | Global `website-design` **proíbe** GSAP, ScrollTrigger, Motion e Lenis e manda Astro + SolidJS | `~/.claude/skills/website-design/SKILL.md:25` | instrução oposta à stack do kit |
| 3 | Global `premium-landing-designer` disputa o gatilho "criar landing page" com o `lp-maestro` e proíbe botão pílula, que a fábrica exige | `~/.claude/skills/premium-landing-designer/SKILL.md:114` | dois diretores no mesmo site |
| 4 | Globais `frontend-design`, `impeccable`, `design-taste-frontend` e `website-design` sem trava no arquivo, mas **já adormecidas** pela categoria "design" do `/pacote` (só entravam se chamadas pelo nome); a `premium-landing-designer` ficou fora da categoria e era a única que entrava sozinha | `~/.agents/skills`, `~/.claude/skills` | risco menor do que parecia, mas qualquer `/pacote design` religava os diretores concorrentes |
| 5 | Só 4 estilos, todos sóbrios; proibições gerais (faixa infinita, contador, cartão 3D) | `lp-direcao-de-arte` | pouca variedade entre nichos |
| 6 | "Celular sem cena presa; lateral vira vertical" como regra fixa | `estudio-movimento/SKILL.md:31` | celular perde a experiência |
| 7 | Consultoras com filosofia de corte: `hallmark` manda remover animação dispensável; `taste` manda aprovar a página estática antes de animar | `hallmark:461`, `taste-skill/references/motion.md:3` | movimento vira enfeite no fim, não narrativa |
| 8 | Plugin `design-paper` e `paper-desktop` ainda ativos, com o Paper abandonado (DEV-06) | `plugins/design-paper`, plugin de usuário | ruído e ferramenta morta |

Sinais nos sites de teste: entrada "sobe e aparece" repetida (Salão (cliente): 13 usos do mesmo efeito); 3D da Transportadora v2
feito de fotos em planos e o da v1 com caixas simples; as 4 páginas de estilos dividem o mesmo `movimento.js`;
nenhum uso de Lottie, Rive ou modelo GLB real; profundidade e deslocamento desligados abaixo de 768 px.

Conclusão sobre a causa: o atropelo entre skills existe (itens 2, 3 e 7), mas a piora vem principalmente das
regras de contenção e da falta de repertório (itens 1, 5 e 6). Trocar de skill sem mudar as regras não resolveria.

O que já estava certo: as 24 consultoras do `landing-pages` vêm travadas, e o `lp-maestro` define uma ordem de
autoridade. Falta fazer as regras concordarem com essa ordem e tirar os diretores concorrentes de fora do kit.

## Decisão por skill

- **Manter (dona da etapa):** todas as `lp-*`, `estudio-movimento` (sem a regra de celular sem cena presa).
- **Manter travada (só consulta técnica):** `gsap-*`, `emil-design-eng` (só microinterações de interface),
  `review-animations`, `break-ui`, `responsive-design`, `web-perf`, `web-design-guidelines`, `copywriting`, `cro`, `wrangler`.
- **Manter travada, sem autoridade sobre o movimento:** `hallmark` (só `study` e auditoria estrutural),
  `taste-skill` (repertório), `impeccable` (auditoria), `frontend-design`, `ui-ux-pro-max` (dados por nicho).
- **Fundir:** `find-animation-opportunities` vira parte da `lp-cenas` (vocabulário por finalidade).
- **Tirar do ativo:** globais `website-design`, `premium-landing-designer`, `design-taste-frontend`,
  `frontend-design`, `impeccable` (movidas para backup, não apagadas); plugin `paper-desktop`; `design-paper` sai do fluxo.
- **Globais mantidas:** `accessibility` e `web-design-guidelines` (técnicas, não dirigem estilo).

## Plano de ação

**Fase 1 — Autoridade (um diretor só)**
1. Mover as 5 globais de design para `~/.claude/skills-backup-design/` (e os atalhos de `~/.agents/skills`); desinstalar `paper-desktop`.
2. `design-paper` marcado como obsoleto no catálogo (fora da instalação padrão).
3. Bloco "o que as consultoras NÃO decidem" no `lp-maestro`: nenhuma consultora corta movimento, impõe ordem
   "estático primeiro" ou troca a stack.

**Fase 2 — Regras novas (DEV-34)**
1. `regras.md`: LP-09 e DEV-11 viram **orçamento de movimento** — cada seção com técnica diferente, 2–3 cenas
   grandes, layout pode variar; continuam o limite de desempenho e o "não parecer desenho".
2. LP-11 por nicho: sério para transportadora e advocacia; ousado para salão, restaurante e academia.
3. `lp-direcao-de-arte`: proibições gerais viram "depende da direção"; pílula deixa de ser obrigatória.
4. `estudio-movimento` e `lp-construcao`: celular equivalente (ajusta câmera, resolução e densidade antes de cortar cena).

**Fase 3 — Repertório**
1. Novos estilos ousados (ex.: cinético colorido, brutalista, 3D imersivo, editorial em movimento) com ritmo próprio.
2. `lp-cenas`: catálogo de técnicas por seção (texto cinético, máscara, distorção de imagem, partículas,
   Lottie por progresso, Rive com estados, transições entre seções, cursor) e direção de movimento do site inteiro
   (capítulos, continuidade, clímax).
3. Caminho do 3D real: modelo GLB, iluminação de ambiente, glTF Transform para o celular.
4. Skills de terceiros gratuitas, só depois do verificador de segurança: Three.js (CloudAI-X/threejs-skills) e
   motion-design (lottiefiles/motion-design-skill). Repositórios com scripts são lidos inteiros antes.

**Fase 4 — Prova**
3 sites fictícios variados (transportadora séria, salão ousado, restaurante), feitos com o kit novo, comparados
com os pilotos atuais do mesmo nicho. Vídeo da rolagem em computador e celular, nota de desempenho e revisão
crítica independente. Régua: sites premiados (Awwwards/FWA).

**Execução em 29/10:** prova implementada com Lastro Cargas, Estúdio Coral e Barbearia Seco (a alternativa
barbearia substituiu restaurante). Crítica independente concluída e defeitos funcionais tratados; relatório
em `docs/historico/prova-design.md`, vitrine local em http://127.0.0.1:5196/. Revisão técnica final36/36. O repertório
ampliou, mas a crítica não considerou a transportadora superior à Transportadora nem certificou nível de premiação.
Fotografia coesa, linguagem própria do negócio e fluidez física permanecem limites explícitos. Lições
incorporadas ao kit0.3.3; não recomeçar a fase nem retomar clientes antigos sem nova necessidade.
