# Crítica de movimento

> Adaptado de emilkowalski/skills (`skills/review-animations` e `skills/animate`, commit 715c180), licença MIT,
> Copyright (c) 2026 Emil Kowalski; texto da licença em `skills/review-animations/LICENSE` deste plugin.
> Traduzido, resumido e ajustado para landing page em React + Tailwind + GSAP (ver NOTICE e fontes.json).

## Postura
Parta de "há defeito". Movimento que roda mas chega devagar, nasce do lugar errado, repete demais ou engasga é
defeito, não aprovação. Na dúvida se o movimento ajuda, o melhor conserto quase sempre é tirar.

## As dez perguntas (cada "não" é um achado)
1. **Tem motivo?** Mostrar de onde veio, indicar estado, dar retorno, explicar, evitar salto brusco. "Fica bonito"
   em coisa que a pessoa vê toda hora não é motivo.
2. **Combina com a frequência?** Menu, botão e campo do formulário: rápido ou nada. Abertura da página e cenas de
   rolagem (vistas uma vez): podem ser mais longas e caprichadas.
3. **Curva certa?** Entrada e saída: desacelerando (`ease-out` forte). Nunca `ease-in` em interface: atrasa o
   instante que a pessoa está olhando. Curvas prontas do CSS são fracas.
4. **Duração no limite?** Interface abaixo de 300 ms; cena de rolagem e abertura podem passar, com motivo.
5. **Nasce do lugar certo?** Nada surge de `scale(0)`: começar de 0,9–0,97 com opacidade. Menu e balão crescem a
   partir do botão que os abriu (`transform-origin`), não do centro.
6. **Pode ser interrompido?** Coisa disparada várias vezes (menu, abas, carrossel) usa transição que muda de rumo
   no meio, não keyframe que recomeça do zero.
7. **Só `transform` e `opacity`?** Animar `width`, `height`, `margin`, `top`, `left` é achado de desempenho.
8. **Respeita quem pediu menos movimento?** `prefers-reduced-motion`: manter opacidade e cor, tirar deslocamento.
   Efeito de `:hover` só com mouse (`@media (hover: hover) and (pointer: fine)`).
9. **Ida e volta com tempos diferentes?** Ação deliberada (segurar, confirmar) mais lenta; resposta do sistema rápida.
10. **Combina com o resto?** O movimento tem a personalidade da marca: marcenaria séria não quica.

## Sinais para marcar na hora
`transition: all` · entrada só com fade, sem deslocamento · `scale(0)` · `ease-in` em interface · interface acima
de 300 ms sem motivo · keyframe em coisa repetida · propriedade de layout animada · sem `prefers-reduced-motion` ·
`:hover` sem a trava de mouse · grupo inteiro entrando de uma vez (espaçar 30–80 ms entre itens) · revelação de
rolagem que repete toda vez que a seção volta à tela.

## Valores de referência
| Uso | Curva (CSS) | No GSAP |
|---|---|---|
| Entrar ou sair | `cubic-bezier(0.23, 1, 0.32, 1)` | `"power4.out"` ou `CustomEase` com os mesmos números |
| Mover na tela | `cubic-bezier(0.77, 0, 0.175, 1)` | `"power4.inOut"` |
| Cor e hover | `ease` | `"power1.inOut"` |
| Movimento contínuo (faixa em laço) | `linear` | `"none"` |

| Elemento | Duração |
|---|---|
| Retorno de toque no botão (`scale(0.97)` no `:active`) | 100–160 ms |
| Balão e menu pequeno | 125–250 ms |
| Gaveta e janela | 200–500 ms |
| Revelação de seção, abertura | 500–900 ms, uma vez só |

- Revelação de rolagem: `clip-path: inset(0 0 100% 0)` para `inset(0 0 0 0)`, disparada uma vez
  (`ScrollTrigger` com `once: true`). Repetir a cada passagem é a página brigando com o leitor.
- Menos movimento no GSAP: `gsap.matchMedia()` com `"(prefers-reduced-motion: no-preference)"` para a versão cheia.
- Troca entre dois estados que mostra os dois ao mesmo tempo: um `blur(2px)` durante a troca junta os dois.

## Conferir quadro a quadro
- Câmera lenta: multiplicar as durações por 2–5 (`gsap.globalTimeline.timeScale(0.25)`) ou usar o painel
  Animations do DevTools a 10%/25%. Olhar: cores trocam limpas, a curva não para seco, origem certa, propriedades
  que andam juntas continuam sincronizadas.
- Quadro a quadro no painel Animations para achar descompasso entre propriedades.
- Celular de verdade para gesto e rolagem; emulação não mostra engasgo nem toque.
- Olhar de novo no dia seguinte: defeito invisível durante o trabalho aparece depois.

## Como relatar
Tabela `Antes | Depois | Por quê`, uma linha por achado, com `arquivo:linha`. Depois, por gravidade: quebra a
sensação · deveria sair · desempenho · interrupção e tempo · origem e coerência · acessibilidade. Fechar com
**bloqueia** (qualquer quebra de sensação, `scale(0)`/`ease-in` em interface, animação de layout com conserto
fácil) ou **aprova**. Ordem do conserto: tirar → reduzir → curva → origem → interrupção → GPU → tempos → polimento.
