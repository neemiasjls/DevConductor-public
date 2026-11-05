# Brief comum da construção — rodada Claude (DEV-36)

Vale para os três sites desta pasta. Cada site começa pelo próprio `plano.md` (já escrito: ideia central,
estilo, roteiro com técnica, motivo, permanência e costura). Seguir o plano; desvio só com motivo anotado na
seção "Desvios na construção" do próprio `plano.md`.

## Ler antes (só o necessário)
- `pilotos/prova-design/rodada-claude/README.md` (roteiro da rodada) e `docs/decisoes.md` (DEV-34, DEV-36).
- `plugins/landing-pages/skills/lp-maestro/regras.md` (LP-03…LP-11, DEV-34).
- `plugins/landing-pages/skills/lp-cenas/SKILL.md`, `tecnicas.md` e as receitas citadas no plano
  (`lp-cenas/receitas/*.md`).
- `plugins/landing-pages/skills/lp-direcao-de-arte/SKILL.md` + o estilo do plano em `estilos/`.
- `plugins/landing-pages/skills/lp-construcao/SKILL.md`, `lp-assets/SKILL.md`, `lp-revisao/SKILL.md`.
- Para ver como a rodada Codex resolveu algo parecido (sem copiar layout): `pilotos/prova-design/<lastro-cargas|
  estudio-coral|barbearia-seco>/` (plano, `src/`, `ferramentas/`). **Nunca editar essas três pastas.**

## Lições de calibração (feedback do usuário à rodada Codex)
O usuário gostou da originalidade e viu exageros leves. Desde o início:
- títulos sem escala exagerada (limites no plano);
- no máximo 2 seções presas seguidas, com trecho que rola livre entre cenas presas; anotar permanência;
- ciclos automáticos lentos, com botão de pausa, parados fora da tela/aba e no reduzido (WCAG 2.2.2);
- fotografia coesa: um tratamento único para todas as fotos;
- uma ideia central do negócio puxando as cenas; efeito que compete com ela sai.
Não é pedido de site sóbrio: manter movimento do começo ao fim (DEV-34), uma técnica por seção.

## Stack e estrutura
Vite + React + TypeScript + Tailwind 4 + GSAP/ScrollTrigger (+ Lenis opcional, criado/destruído no
`gsap.matchMedia`) + Motion (LazyMotion) e, quando o plano pede, three/@react-three/fiber/drei ou lottie-web.
Usar as mesmas versões fixas dos `package.json` da rodada Codex. `src/data/conteudo.ts` com todos os textos;
`src/ritmo.ts` com os tokens do estilo; `<Foto>` com srcSet (midias.py do lp-construcao); fontes hospedadas.
`index.html` com `noindex`, título/descrição, schema.org, Open Graph 1200×630, favicon. Conteúdo
**explicitamente fictício** (aviso discreto "empresa fictícia · demonstração" no rodapé e no topo do rodapé
de créditos). WhatsApp com mensagem por serviço, número fictício; nunca enviar mensagem.

## Assets e licenças
- Fotos: Wikimedia Commons via `node plugins/landing-pages/skills/lp-assets/scripts/buscar-commons.mjs`
  (rótulo novo, só CC0/domínio público/CC BY/CC BY-SA), escolher olhando (folha-contato), conferir a página de
  cada foto. Sem pessoas públicas, sem marca de terceiro legível. Tratamento único de cor.
- 3D/HDRI: Poly Haven (CC0, API `https://api.polyhaven.com/files/<nome>`), otimizar com gltf-transform,
  Draco local em `public/draco/`. Nada de veículo/objeto montado em código fingindo realismo.
- Lottie: autoria própria gerada por script em `ferramentas/` (como `estudio-coral/ferramentas/gerar-tranca.mjs`).
- `assets.md` + `assets.json` validado com `lp-assets/scripts/validar-assets.mjs --gravar`; créditos no rodapé.
- Não instalar skill/plugin novo nem mexer em configuração global. Dependências npm só dentro do site.

## Porta e processos
Cada site usa só a sua porta (dev e preview com `--strictPort`): austral-frio **5201**, lumen-salao **5202**,
prumo-barbearia **5203**. Não matar nem reutilizar 5183, 5194, 5195, 5196 nem a porta dos outros dois sites.
Rodar servidores em segundo plano e encerrar só o processo que você mesmo abriu.

## Testes obrigatórios (evidências em `<site>/revisao/<pasta-nova>/`, nunca sobrescrever)
1. `npm run build` com saída 0.
2. `node plugins/landing-pages/skills/lp-revisao/scripts/revisar-pagina.mjs <url do preview> <site>/revisao/rodada-1`
   rodado de dentro do site (precisa de `puppeteer-core` local): 6 larguras × normal/reduzido = **12/12**.
3. Script próprio `ferramentas/comportamento.mjs` (puppeteer-core, modelo em
   `pilotos/prova-design/ferramentas/verificar-critica.mjs`) com casos: teclado (Tab/Shift+Tab traz o foco para
   a tela em cenas presas), pausa/retomada do ciclo e parada fora da tela, troca dinâmica de movimento reduzido,
   mídia indisponível (bloquear GLB/JSON/foto/WebGL e conferir o substituto), rolagem até o fim e de volta ao topo
   (sem erro, cenas reconstituídas), sem rolagem lateral. Gravar `resultado.json`.
4. `responsivo.mjs` e o detector anti-IA (`taste-skill/scripts/lint.mjs` no `src`); anotar achados no plano.
5. Olhar de verdade os prints topo/meio/fim em 390 e 1440 e corrigir os 3 piores pontos (até 3 rodadas).
   Para 3D em headless: `--use-angle=swiftshader --enable-unsafe-swiftshader`.

Vídeos de rolagem, medições Lighthouse/rolagem e vitrine ficam com a sessão principal (rodados em série
depois), não com o subagente.

## Entrega do subagente
Site pronto em `pilotos/prova-design/rodada-claude/<slug>/` (sem `node_modules`/`dist` no git: conferir que
`.gitignore` raiz cobre; se não cobrir, criar `.gitignore` local). `plano.md` atualizado com "Desvios na
construção" e "Testes" (números reais, caminhos das evidências, limites). Não fazer commit. Resposta final
curta: o que foi feito, resultados dos testes, pendências, e uma lista "Conhecimento candidato" (lições
duráveis para o kit), sem gravar memória.
