# Origem das skills deste plugin

As `lp-*` e `lp-cenas` são próprias. As consultoras abaixo foram copiadas (conferido em out/2026)
de projetos abertos, com a trava `disable-model-invocation: true` no cabeçalho.
Na consultora hallmark, links que apontavam para arquivos ausentes nesta cópia foram ajustados
para o repositório original (tokens, exemplos e documentação); o conteúdo de design foi preservado.

| Skill | Origem | ⭐ (out/2026) | Licença |
|---|---|---|---|
| taste-skill | Leonxlnx/taste-skill | 95,8 mil | MIT |
| impeccable | pbakaus/impeccable | 81 mil | Apache-2.0 (embute modern-screenshot, MIT) |
| hallmark | Nutlope/hallmark | 30 mil | MIT |
| frontend-design | anthropics/skills (skills/frontend-design) | 181 mil | Apache-2.0 (LICENSE.txt na pasta) |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill | 135,6 mil | MIT |
| emil-design-eng, find-animation-opportunities, review-animations, break-ui | emilkowalski/skill | 46 mil | MIT |
| responsive-design | wshobson/agents | 40,7 mil | MIT |
| copywriting, cro | coreyhaines31/marketingskills | 54,6 mil | MIT |
| web-design-guidelines | vercel-labs/agent-skills (guidelines de vercel-labs/web-interface-guidelines) | 32,4 mil | MIT (Vercel Labs) |
| lp-seo (mescla própria; não é cópia) | AgriciDaniel/claude-seo (plan, content-brief, page, technical, local, schema, geo; commit 4b99de2) + coreyhaines31/marketingskills (site-architecture, seo-audit, ai-seo; commit 365b412) | 19 mil + 55 mil | MIT (licenças em `skills/lp-seo/`) |
| wrangler, web-perf | cloudflare/skills | 3 mil (oficial) | Apache-2.0 |
| motion-design | lottiefiles/motion-design-skill (commit f9a8a04) | 2,6 mil | MIT |
| threejs-react-three-fiber, threejs-shaders, threejs-performance, threejs-loaders, threejs-lighting, threejs-asset-pipeline | CloudAI-X/threejs-skills (commit 0e18186) | 3,8 mil | MIT |
| gsap-core, gsap-scrolltrigger, gsap-timeline, gsap-react, gsap-plugins, gsap-utils, gsap-performance | greensock/gsap-skills (oficial do GSAP, commit aed9cfd; `gsap-frameworks` ficou de fora: Vue/Svelte) | 16,4 mil | MIT |

`vercel-react-best-practices` não é copiada aqui: vem do plugin `stack-typescript`.

Referências adaptadas (não são cópia; texto em português, reduzido para landing page; commit em `fontes.json`):

| Arquivo | Origem | Licença |
|---|---|---|
| lp-revisao/referencias/critica-de-movimento.md | emilkowalski/skills (review-animations, animate; commit 715c180) | MIT |
| lp-revisao/referencias/conteudo-extremo.md | emilkowalski/skills (break-ui; commit 715c180) | MIT |
| lp-construcao/referencias/celular-de-verdade.md | emilkowalski/skills (mobile-native) + vercel-labs/web-interface-guidelines (commit 434b7f9) | MIT |
| lp-revisao/referencias/detalhes-de-interface.md | vercel-labs/web-interface-guidelines (command.md, AGENTS.md; commit 434b7f9) | MIT |
Cada pasta copiada tem o LICENSE da origem; as Apache-2.0 alteradas têm aviso de modificação abaixo do cabeçalho.
Ao atualizar uma consultora: baixar o original numa pasta separada, ler o SKILL.md novo, copiar e
reaplicar a trava.
