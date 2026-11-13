# Celular de verdade

> Adaptado de emilkowalski/skills (`skills/mobile-native`, commit 715c180), licença MIT, Copyright (c) 2026 Emil
> Kowalski (texto em `skills/review-animations/LICENSE` deste plugin), e de vercel-labs/web-interface-guidelines
> (`command.md` e `AGENTS.md`, commit 434b7f9), licença MIT, Copyright (c) 2025 Vercel Labs (texto em
> `skills/web-design-guidelines/LICENSE`). Traduzido, resumido e ajustado para landing page (ver NOTICE).

Desenhar o celular junto, não depois. A emulação do Chrome não mostra hover preso, piscada no toque, barra de
endereço mexendo na altura, zoom no campo nem área do entalhe: o que estiver marcado com (aparelho) só se
confirma no celular de verdade.

## Base (antes do primeiro componente)
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#cor-do-topo-da-pagina" />
```
```css
html { -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; }
input, textarea, select { font-size: 16px; }
a, button, [role="button"] { touch-action: manipulation; }
```
- **Nunca** `user-scalable=no` nem `maximum-scale=1`: tira o zoom de quem precisa. O zoom no campo se resolve com
  fonte de 16 px.
- `theme-color` igual à cor do topo da página (o cabeçalho), não à cor da marca. Com tema claro e escuro, uma tag
  para cada `prefers-color-scheme`.

## Altura da tela
- Primeira dobra: `min-h-svh` (`100svh`), a menor altura possível, nunca corta. Não usar `100vh` (fica embaixo da
  barra de endereço) nem `100dvh` em página de venda (muda de tamanho durante a rolagem e a página pula).
- Cena presa (`pin` do ScrollTrigger) com altura em `svh` e testada com a barra de endereço aparecendo e sumindo (aparelho).

## Toque
- Hover só com mouse: `@media (hover: hover) and (pointer: fine)`. No Tailwind v4 o `hover:` já faz isso; no v3,
  `future.hoverOnlyWhenSupported`. Sem isso, o botão fica "aceso" depois do toque (aparelho).
- Todo elemento tocável tem `:active` (ex.: `active:scale-[0.97]`, 100–160 ms): a resposta vem ao encostar o dedo.
- Alvo de toque com pelo menos 44 px no celular (24 px no computador); ícone pequeno ganha área invisível maior.
- `user-select: none` só em controle (botão, aba, alça de arrastar), nunca no corpo: endereço e telefone se copiam.
- Carrossel horizontal: preferir rolagem nativa (`snap-x snap-mandatory` + `snap-start`). Com gesto próprio,
  `touch-action: pan-y` no trilho para a página continuar rolando na vertical (aparelho).
- Gesto (arrastar, deslizar) sempre com alternativa de toque simples e teclado.

## Barra fixa no pé (WhatsApp, "Pedir orçamento")
- Fixa embaixo, nunca sobre o conteúdo importante: dar folga no fim da página do tamanho da barra
  (`padding-bottom` no `body` ou no último bloco), para o rodapé não ficar escondido.
- Respeitar a área do gesto de início do iPhone: `padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))`.
  Sem `viewport-fit=cover` o `env()` vale 0.
- Cabeçalho fixo e foco: elemento fixo não pode cobrir o campo ou o link em foco (`scroll-margin-top` nas âncoras).

## Rolagem
- Landing page é documento: deixar o puxar-para-atualizar do celular. Se precisar travar o "elástico", só com
  mouse: `@media (pointer: fine) { html { overscroll-behavior: none } }`.
- Dentro de menu aberto, gaveta ou janela: `overscroll-behavior: contain` para a página de trás não rolar.
- Nunca `touchmove` + `preventDefault()` para travar rolagem: trava tudo e custa quadros.

## Campos (formulário de contato)
`type="tel"`/`"email"`, `inputmode` certo, `autocomplete` e `name` com sentido, `enterkeyhint="send"`,
`autocapitalize="none"` e `spellcheck={false}` em e-mail. Nunca bloquear colar. `autoFocus` não, no celular.

## Conferir no aparelho
Servidor em `0.0.0.0`, abrir pelo IP da máquina na rede. iPhone: Safari → Desenvolver; Android: `chrome://inspect`.
Testar num celular de alguns anos, com teclado aberto e uma vez deitado. No relatório, separar o que foi conferido
no código/emulação (`celular.mjs`) do que precisa do aparelho.
