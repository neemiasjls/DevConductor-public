# Estilo: brutalista gráfico

A página como um cartaz de rua: tipografia enorme que estoura a grade, contraste duro, fotos em alto
contraste, faixas que correm e cursor que interage. A atitude vem da escala e do corte, nunca de bagunça.

**Para quem:** barbearia, tatuagem, estúdio criativo, loja de streetwear, skate, música, academia de luta,
cervejaria artesanal, eventos noturnos.
**Precisa de:** fotos com atitude (retrato, detalhe de mão, textura). Nicho sério (LP-11) não usa este estilo.

## Fontes
| Papel | Escolha | Alternativas do catálogo |
|---|---|---|
| Título | Imbue (Google, caixa alta, 100–900 variável) ou Big Shoulders 900 | Bodoni Moda (contraste), Funnel Display |
| Texto | Sofia Sans (Google, 400–600) | Chivo, Golos Text |

- Títulos de 20–30vw no computador e 18–22vw no celular, cortados pela borda de propósito em 1–2 seções.
- Peso variável da Imbue animado com o scroll (engrossa ao entrar).

## Cores
| Papel | Ponto de partida (OKLCH) | Uso |
|---|---|---|
| Tinta | L 0,1–0,14, C ≤ 0,02 | fundo e texto |
| Papel | L 0,94–0,97, C ≤ 0,006 (com 0,012 o inspetor já acusa "creme") | fundo alternado |
| Grito | 1 cor do cliente, C ≥ 0,18 | faixa, botão, uma palavra por seção |

Fotos em preto e branco de alto contraste ou duotone com o "grito". Proibido: degradê, vidro fosco, cantos arredondados grandes.

## Grade
- Grade visível em 1–2 seções (fios grossos), quebrada de propósito nas outras: texto sobre foto, título
  invadindo a seção seguinte, faixas inclinadas de 2–4°.

## Ritmo (seco e rápido)
| Token | Valor |
|---|---|
| curta / media / longa | 0,15 s / 0,4 s / 0,8 s |
| entra | `cubic-bezier(0.7, 0, 0.2, 1)` · GSAP `expo.inOut` |
| sai | `cubic-bezier(0.7, 0, 0.84, 0)` · GSAP `expo.in` |
| distancia / escalonar / scrub | 60 px / 0,03 s / 0,3 |

Gesto típico: faixa com o nome do serviço corre na horizontal e acelera com a velocidade do scroll; o cursor
vira uma lupa que inverte as cores da foto (só com mouse; no toque, a foto inverte ao tocar).

## Cenas que combinam (`lp-cenas`)
| Receita | Por quê |
|---|---|
| `palavra-zoom`, `letras-em-cena` | tipografia é a imagem |
| `distorcao-imagem` | foto que treme/separa cores com o scroll |
| `mascara-estudo` | foto revelada por dentro da letra |
| `pilha-estudo` | trabalhos (cortes, tatuagens, peças) empilhando |

Faixa infinita e contador são permitidos aqui se restilizados (velocidade ligada ao scroll, fonte do estilo).
Evitar: arcos do `claro-organico` e `fundo-shader` suave.

**Status:** primeira página em 29/10/2026: `pilotos/prova-design/barbearia-seco` (fictícia). Lições: a Imbue é tão
condensada que "SECO" a 900 mede 1,5 em; medir o tamanho (lá `min(56vw, …)`), não usar 20–30vw às cegas; peso
variável numa caixa fixa com `contain: strict` deu CLS 0. Numeração decorativa (01/02/03) e rótulos minúsculos
em caixa alta são acusados pelo detector anti-IA: usar só contador que mostre progresso real.
