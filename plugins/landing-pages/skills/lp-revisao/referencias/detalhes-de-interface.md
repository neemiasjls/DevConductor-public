# Detalhes de interface (lista de acabamento)

> Adaptado de vercel-labs/web-interface-guidelines (`command.md` e `AGENTS.md`, commit 434b7f9), licença MIT,
> Copyright (c) 2025 Vercel Labs; texto da licença em `skills/web-design-guidelines/LICENSE` deste plugin.
> Traduzido, resumido e ajustado para landing page em React + Tailwind + GSAP, em português (ver NOTICE).

Ler o código e marcar cada item que falha, com `arquivo:linha`. Curto: o problema e o lugar; explicar só quando o
conserto não for óbvio. Arquivo sem achado: `✓ passa`.

## Acessibilidade e foco
- Botão só com ícone tem `aria-label`; ícone decorativo tem `aria-hidden="true"`; imagem tem `alt` (`alt=""` se
  for enfeite).
- `<button>` para ação, `<a>` para ir a algum lugar; nunca `<div onClick>`.
- Títulos em ordem (`h1` único, depois `h2`, `h3`); link "pular para o conteúdo"; `scroll-margin-top` nas âncoras.
- Foco visível em tudo que se clica (`focus-visible:ring-*`); nunca `outline-none` sem substituto; cabeçalho ou
  barra fixa não cobre o elemento em foco.
- Mensagem que aparece sozinha (enviado, erro) com `aria-live="polite"`.

## Formulário de contato
- `<label>` clicável em cada campo; `autocomplete`, `name`, `type` e `inputmode` certos; nunca bloquear colar.
- Botão de enviar ativo até a requisição começar; depois desativado, com indicador e o mesmo texto.
- Erro ao lado do campo, dizendo como resolver; ao enviar, foco no primeiro erro.
- Exemplo no placeholder termina com `…` (ex.: `(00) 00000-0000…`).

## Movimento
- `prefers-reduced-motion` respeitado; laço decorativo para quando pedirem menos movimento.
- Só `transform` e `opacity`; nunca `transition: all`; `transform-origin` certo. SVG: animar o `<g>` com
  `transform-box: fill-box`.
- Movimento automático com mais de 5 s ao lado de conteúdo tem como pausar ou esconder.
- Detalhe completo em `critica-de-movimento.md`.

## Tipografia e texto
- `…` em vez de `...`; aspas curvas “ ” em vez de `"`.
- Espaço que não quebra entre número e unidade e em nome de marca: `R$&nbsp;150`, `10&nbsp;anos`, `6&nbsp;eixos`.
- `text-wrap: balance` em título e `pretty` em parágrafo (`text-balance`, `text-pretty`): sem palavra órfã.
- `tabular-nums` em números que se comparam ou mudam (contadores, preços em coluna).
- Em português, maiúscula só na primeira palavra do título e do botão (não usar o Title Case do inglês).
- Voz ativa, segunda pessoa ("Peça seu orçamento"), botão que diz o que faz ("Chamar no WhatsApp", não "Continuar").

## Conteúdo
- Bloco de texto aguenta conteúdo longo (`break-words`, `line-clamp-*`); filho flex com `min-w-0`.
- Lista vazia, campo vazio e texto curto não deixam a tela quebrada. Testes em `conteudo-extremo.md`.

## Imagens e desempenho
- `<img>` com `width` e `height` (ou `aspect-ratio`): a página não pula ao carregar.
- Abaixo da primeira dobra: `loading="lazy"`; a foto principal: `fetchpriority="high"`, sem `lazy`.
- Fonte principal com `<link rel="preload" as="font" crossorigin>` e `font-display: swap`; `preconnect` para o
  domínio de onde vêm arquivos.
- Vídeo curto em vez de GIF: `<video autoplay muted loop playsinline>` com imagem parada de reserva.
- Nada de medir o layout (`getBoundingClientRect`, `offsetHeight`) a cada quadro; ler tudo, depois escrever.

## Toque, celular e tema
- `touch-action: manipulation`; `-webkit-tap-highlight-color` definido; alvo de toque ≥ 44 px no celular.
- `overscroll-behavior: contain` em menu aberto e gaveta. Detalhe em `../../lp-construcao/referencias/celular-de-verdade.md`.
- Layout de ponta a ponta usa `env(safe-area-inset-*)`; sem barra de rolagem lateral (conteúdo que vaza é defeito).
- `<meta name="theme-color">` igual ao fundo do topo; tema escuro com `color-scheme: dark` no `<html>`.

## Idioma e formato
- Datas e números com `Intl.DateTimeFormat`/`Intl.NumberFormat('pt-BR')`, não formato montado à mão.
- `lang="pt-BR"` no `<html>`; nome de marca com `translate="no"` para o tradutor automático não estragar.

## Sinais de alerta (marcar sempre)
`user-scalable=no` ou `maximum-scale=1` · bloquear colar · `transition: all` · `outline-none` sem foco visível ·
`<div>`/`<span>` com clique · imagem sem tamanho · campo sem rótulo · botão de ícone sem `aria-label` · data ou
número com formato fixo · `autoFocus` sem motivo · GIF onde cabe vídeo · gesto sem alternativa de toque e teclado.
