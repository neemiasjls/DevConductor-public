---
name: lp-construcao
description: Constrói a landing page de um cliente a partir da direção de arte aprovada - estrutura do projeto, conteúdo em dados, imagens otimizadas, fontes hospedadas e componentes restilizados; com referência escolhida, constrói seção por seção comparando com ela (laço visual, até 3 voltas). Use depois de lp-direcao-de-arte e lp-textos aprovados.
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

Cenas grandes (quantas o projeto pedir, DEV-42, escolhidas na etapa "conceito de movimento"): guiadas pelo scroll, com GSAP +
ScrollTrigger e seção presa. Nas outras seções GSAP também pode entrar, sem seção presa longa. Receitas prontas, cuidados e o teste com Edge
invisível em `lp-cenas`; as peças delas vêm prontas de `lp-assets` (com licença em `assets.md`). No celular a cena continua (DEV-34), com pin mais curto e peças mais leves; com movimento reduzido, tudo parado
e visível.

## Celular primeiro (os dois caminhos)
Cada seção é construída **primeiro em 390 px** (a tela do raio-x de celular; nada corta em 360 px), seguindo a parte
"No celular" do `direcao.md`, e só depois aberta para o computador (`md:`/`lg:`). Seção que passa no computador e
não no celular não está pronta. Regras que evitam quebra conhecida no iPhone:
- Altura de tela: `svh`/`dvh` (acompanham a barra do navegador) em vez de `100vh` ou altura da janela medida uma
  vez. Em cena presa, `ScrollTrigger.config({ ignoreMobileResize: true })` evita o pulo quando a barra some.
- Seção presa: o conteúdo cabe inteiro na tela menor (360×640), sem rolagem dentro dela; pin mais curto (DEV-34).
- Vídeo: `muted` + `playsInline` (só assim toca sozinho), com `poster`; se não tocar, fica a imagem de reserva.
- Nada depende de passar o mouse: o que surge no `hover` também surge por toque ou já vem visível.
- Área de toque ≥ 44 px, com espaço entre botões; texto de leitura e campos de formulário ≥ 16 px (abaixo disso o
  iPhone dá zoom sozinho no campo).
- Sem rolagem para o lado: carrossel por toque usa rolagem nativa (`scroll-snap`) dentro do próprio contêiner, sem
  prender a rolagem vertical da página.
- Botão de contato fixo respeita a área segura (`env(safe-area-inset-bottom)`) e não cobre o último conteúdo.
- O celular é desenhado **junto** com o computador, não adaptado depois: recorte de foto, ordem e tamanho de título
  próprios. Detalhe (meta tags, área segura, toque, barra fixa, rolagem): `referencias/celular-de-verdade.md`.

## Acabamento (o `acabamento.mjs` da `lp-revisao` confere; aqui se evita)
- Título em caixa alta com acento, cedilha ou Q: entrelinha ≥ 1,15 (abaixo disso o acento encosta na linha de
  cima); em qualquer título, nunca abaixo de 1,0.
- Nada fixo sobre conteúdo: botão ou selo fixo não cruza texto, título nem foto em nenhuma posição da rolagem.
  No celular o contato vira barra no pé, com folga no fim da página (`padding-bottom` da altura da barra).
- Contorno de letra (`-webkit-text-stroke`) só com o preenchimento por cima (`paint-order: stroke fill`) ou em
  fonte de traço único; senão as junções da letra aparecem.
- Faixa em laço: a lista duplicada anda exatamente um período (itens + vãos); medir, não chutar `-50%`.
- Um tratamento de cor por grupo de fotos (mesma grade, mesmo tom); foto no tamanho real, sem ampliar nem esticar.
- `text-wrap: balance` em título e `pretty` em parágrafo; palavra sozinha na última linha se conserta no texto.

## Laço visual (caminho por referência, `lp-maestro` passo E)
- Antes de construir, ler o `custo.md` e o `custo-celular.md` do raio-x: cena que pede peça que não existe (modelo 3D próprio, filme) já
  saiu trocada por equivalente e avisada ao usuário. Se não foi avisada, parar e avisar **antes** de construir.
- Cena principal: `node <plugin>/skills/lp-cenas/buscar-efeito.mjs <tipo>` com o tipo que o raio-x deu à seção
  (presa, paralaxe, revelacao-mascara, rolagem-lateral, zoom, pilha...); usar o efeito mais próximo (receitas do
  kit primeiro; licença e peso em `efeitos.json`). Sem par: estudo novo no `estudio-design`, que entra no catálogo.
- Medidas: copiar `referencia/medidas.css` (e `medidas-celular.css`) para o site e usar as variáveis `--ref-*`
  (escala, respiro, colunas, vão, raio) em vez de digitar número; `duracaoMs` e `curva` de cada `movimento[]` do
  raio-x vão para o `src/ritmo.ts`. Cores e fontes continuam as do cliente; o comparador acusa contraste e ritmo fora.
- Por seção, na ordem do `roteiro.md`: 1) construir com o conteúdo do cliente, primeiro no celular; 2) comparar em
  **agente separado** (ex.: `testador`), que roda `node <plugin>/skills/lp-revisao/scripts/comparar-referencia.mjs
  <raio-x.json da base> <url local> <pasta>` e devolve só a lista de diferenças da `comparacao.md` (nada de imagem
  na conversa; o `lado-a-lado.html` fica para o usuário); 3) corrigir pela lista. **No máximo 3 voltas por seção.**
- O laço roda nos **dois tamanhos**: a mesma comparação com `<raio-x-celular.json da base> ... --celular`, em pasta
  própria. A nota do olhar por seção (`olhar.md`, 0–10) vale nos dois com a mesma régua: abaixo de 9, em qualquer
  um, a seção volta ao laço.
- Código de saída 1 = ainda há divergência alta. Depois de 3 voltas com divergência alta: parar e avisar o usuário
  com a lista. Diferença que vem de "mudou a pedido", de troca do `custo.md` ou do piso (conteúdo verdadeiro,
  acessibilidade, movimento reduzido, peso) não se corrige: fica anotada no `plano.md`.
- Nada de código, texto, foto ou marca do site estudado; só a forma e o movimento medidos.

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- Celular primeiro: escreva o layout de 360px e depois amplie (`md:`/`lg:`); `responsive-design` para grade,
  tipografia fluida e container queries.
- Onde animar vem do roteiro de movimento (`lp-cenas/tecnicas.md`). `emil-design-eng` e
  `find-animation-opportunities` só dão curva e duração dos controles da interface. Motion no resto do site; GSAP + ScrollTrigger onde houver scroll (`lp-cenas`); padrão discreto nas seções de leitura (DEV-42); `transform`/`opacity`;
  respeitar `prefers-reduced-motion`.
- `vercel-react-best-practices`: só a parte de cliente e renderização (o site é estático, sem servidor).

## Ao terminar cada bloco
`npx tsc -b`, conferir no navegador do app (390px primeiro, depois computador) e seguir para `lp-revisao` no fim.
Antes de mostrar: `lp-revisao/scripts/acabamento.mjs <url> <pasta> --larguras 1440,390` (saída 1 = conserta antes) e
`lp-revisao/scripts/celular.mjs` (portão de 7 itens do celular); site que falha não é mostrado como pronto, e o relatório diz com todas as letras se o motor do Safari foi conferido ou não.

## Busca no Google
Siga a `lp-seo` (parte D): texto e JSON-LD no HTML entregue (pré-renderizado), animação sem esconder texto
do HTML, título/descrição, imagens com `alt` e tamanho, velocidade do topo, `noindex` na demonstração.

## Bordas das imagens (o estilo decide; padrão arredondado)
- Estilo que proíbe canto arredondado (ex.: `brutalista-grafico`) usa quina viva em fotos, cartões e botões; o
  resto desta seção vale para os demais estilos. No caminho por referência, o raio da base decide; se contrariar
  este padrão, o conflito vai para o `plano.md` ("diferenças em relação às preferências anteriores").
- Um raio padrão do site para fotos e cartões, definido como variável (ex.: `--raio-foto`): ≈20–28px no
  computador, 14–18px no celular. Botões em pílula. Não misturar quina viva com arredondado na mesma página.
- Cartão com foto dentro: raio de dentro = raio de fora − espaçamento (senão a curva fica torta).
- Formas de arco (topo em meia-lua, como espelho ou porta) quando combinar com o estilo do cliente.
- Foto que anima (zoom, parallax, revelação): o raio fica no **contêiner** com `overflow: hidden` e
  `isolation: isolate` (no Safari, sem isso, a quina vaza durante a animação); a imagem dentro escala.
- Vídeo e mapa embutidos seguem o mesmo raio.
