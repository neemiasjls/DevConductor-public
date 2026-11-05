---
name: lp-construcao
description: Constrói a landing page de um cliente a partir da direção de arte aprovada - estrutura do projeto, conteúdo em dados, imagens otimizadas, fontes hospedadas e componentes restilizados. Use depois de lp-direcao-de-arte e lp-textos aprovados.
---

# Construção

## Estrutura (um site por versão: `clientes/<slug>/site`, `site-2`, ...)
- Vite + React + TypeScript + Tailwind v4 + Motion + GSAP (orçamento de movimento, DEV-34); site estático (Cloudflare Pages).
- `src/data/conteudo.ts`: todo texto, contato e listas (nada de texto solto nos componentes).
- Seções de leitura (serviços, preços, horários, perguntas) levam `data-leitura` no elemento da seção; o rodapé
  já conta como leitura. O `densidade.mjs` da `lp-revisao` mede o texto delas à parte (LP-12). Abertura e cenas
  nunca levam: se não cabem no limite, o texto é que precisa encolher.
- `midias.json` (nome → original) + `python -I <plugin>/skills/lp-construcao/scripts/midias.py <originais> <site>`
  gera WebP 480/960/1600 e `src/data/imagens.json`; componente `<Foto>` usa `srcSet` e `width/height`.
- Vídeo: montagem curta com ffmpeg (≤ 16 s, sem áudio, `-crf 26`, `+faststart`) e capa em WebP de um quadro quente.
- Fontes: hospedadas (`@fontsource/<familia>` ou `public/fonts/*.woff2`), só os pesos usados, pré-carga da de título.
  Variável: `import '@fontsource-variable/<familia>'` no `main.tsx` (o `@import '.../wght.css'` no CSS falha no
  Tailwind 4); o TypeScript 7 pede `declare module '@fontsource-variable/*'` para esses imports só de CSS.
- Site com WebGL, Lottie e GSAP juntos: Motion via `LazyMotion` (recursos em arquivo separado) para a entrada
  não carregar tudo (prova de 29/10/2026: entrada do salão ficou em 142 KB gzip).
- `index.html`: título e descrição locais, schema.org do tipo do negócio, Open Graph 1200×630, favicon,
  `noindex` na demonstração.
- Link de WhatsApp com mensagem por serviço: `https://wa.me/<numero>?text=<encodeURIComponent(...)>`.

## Componentes de biblioteca (Magic UI, Motion Primitives, React Bits, 21st.dev)
Use como base técnica e **restilize** até deixar de parecer o original. Não use à vista sem
adaptação: border beam, shimmer button, spotlight. Faixa infinita, contador e cartão 3D só se a direção pedir e
restilizados com a marca (o detector anti-IA acusa a versão de fábrica). Ao copiar: trocar
`dark:` por cores do tema, `import type` para tipos (`verbatimModuleSyntax`), textos em pt-BR,
`Intl.NumberFormat('pt-BR')`.

## Lições do site 2 de um salão de beleza (cliente piloto)
- Foto vertical em tela cheia perde o assunto (mostra parede/planta): use retrato em coluna sobre campo
  chapado; tela cheia só com foto horizontal ou de alta resolução.
- Fundo com close de cabelo: recortar nos comprimentos (`object-position: 50% 80%`), nunca no rosto.
- Texto fixo (sticky) não pode cruzar fotos: fotos passam na coluna que o texto não ocupa.
- Botão fixo do celular precisa contrastar em fundo claro e escuro; reserve espaço (pb-24) sob cartões.
- O inspetor acusa "creme amarelado" já em #eeeae5: use pedra/osso de croma baixo (ex.: #e9e8e4).

## Lições do site 3 do salão piloto
- Fileira que desliza (`.deslizar`) dentro de uma grade: o item da grade precisa de `min-w-0` (e a grade de
  `grid-cols-1` no celular), senão a fileira empurra a coluna e a página rola para o lado.
- Revelação por `clip-path`: observe a caixa de fora (`useInView` no invólucro). A foto escondida não conta como
  visível: nem o `whileInView` dispara nem o `loading="lazy"` carrega.
- Fileira deslizável: anime o bloco inteiro ao entrar, não cada cartão (os cartões fora da tela ficariam vazios
  até a pessoa deslizar).
- Comparador antes/depois e tudo que se arrasta sobre foto: `[&_img]:pointer-events-none` e
  `onDragStart={e => e.preventDefault()}`. Sem isso, no computador o navegador começa a arrastar a imagem e
  cancela o arraste (só o clique funcionava).
- Não repetir a mesma foto em seções seguidas (abertura, cartela e antes/depois usavam a Honey).

## Movimento
Movimento (DEV-42): as cenas grandes do roteiro (`lp-cenas`) e, nas seções de leitura, entradas discretas do
ritmo, uma vez, variando por tipo de conteúdo; nunca o mesmo "sobe e aparece" em tudo. Texto que precisa ser lido
não fica preso em efeito (LP-12). O título principal nunca depende de animação para aparecer (use
animação no carregamento, não por observador de rolagem). Respeite `prefers-reduced-motion` (`MotionConfig
reducedMotion="user"`).

Preferência dinâmica: criar/destruir também o Lenis dentro do `gsap.matchMedia`, não só consultar a preferência
ao carregar. Em trilhos presos, Tab e Shift+Tab precisam revelar o cartão focado e sincronizar a rolagem;
foco fora do recorte é falha. Ciclos automáticos têm pausa disponível e param fora da tela. Em canvas com
legendas DOM, agrupar leituras de dimensões no resize/fontes, sem alternar leitura de layout e escrita a cada quadro.

Cenas grandes (2–3 por site, escolhidas na etapa "conceito de movimento"): guiadas pelo scroll, com GSAP +
ScrollTrigger e seção presa. Nas outras seções GSAP também pode entrar, sem seção presa longa. Receitas prontas, cuidados e o teste com Edge
invisível em `lp-cenas`; as peças delas vêm prontas de `lp-assets` (com licença em `assets.md`). No celular a cena continua (DEV-34), com pin mais curto e peças mais leves; com movimento reduzido, tudo parado
e visível.

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- Celular primeiro: escreva o layout de 360px e depois amplie (`md:`/`lg:`); `responsive-design` para grade,
  tipografia fluida e container queries.
- Onde animar vem do roteiro de movimento (`lp-cenas/tecnicas.md`). `emil-design-eng` e
  `find-animation-opportunities` só dão curva e duração dos controles da interface. Motion no resto do site; GSAP + ScrollTrigger onde houver scroll (`lp-cenas`); padrão discreto nas seções de leitura (DEV-42); `transform`/`opacity`;
  respeitar `prefers-reduced-motion`.
- `vercel-react-best-practices`: só a parte de cliente e renderização (o site é estático, sem servidor).

## Ao terminar cada bloco
`npx tsc -b`, conferir no navegador do app (computador e 390px) e seguir para `lp-revisao` no fim.

## Busca no Google
Siga a `lp-seo` (parte D): texto e JSON-LD no HTML entregue (pré-renderizado), animação sem esconder texto
do HTML, título/descrição, imagens com `alt` e tamanho, velocidade do topo, `noindex` na demonstração.

## Bordas das imagens (o estilo decide; padrão arredondado)
- Estilo que proíbe canto arredondado (ex.: `brutalista-grafico`) usa quina viva em fotos, cartões e botões; o
  resto desta seção vale para os demais estilos.
- Um raio padrão do site para fotos e cartões, definido como variável (ex.: `--raio-foto`): ≈20–28px no
  computador, 14–18px no celular. Botões em pílula. Não misturar quina viva com arredondado na mesma página.
- Cartão com foto dentro: raio de dentro = raio de fora − espaçamento (senão a curva fica torta).
- Formas de arco (topo em meia-lua, como espelho ou porta) quando combinar com o estilo do cliente.
- Foto que anima (zoom, parallax, revelação): o raio fica no **contêiner** com `overflow: hidden` e
  `isolation: isolate` (no Safari, sem isso, a quina vaza durante a animação); a imagem dentro escala.
- Vídeo e mapa embutidos seguem o mesmo raio.
