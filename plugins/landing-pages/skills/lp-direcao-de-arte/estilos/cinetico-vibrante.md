# Estilo: cinético vibrante

A página como uma abertura de festival: cor chapada em blocos grandes, tipografia que se mexe, ilustração
viva (Lottie/Rive) e ritmo rápido com pausas. A energia vem do movimento e do contraste, nunca de neon ou
degradê roxo.

**Para quem:** restaurante, hamburgueria, bar, academia, dança, eventos, escola de idiomas, moda jovem, salão ousado.
**Precisa de:** cor forte do cliente (fachada, uniforme, embalagem, prato). Nicho sério (LP-11) não usa este estilo.

## Fontes
| Papel | Escolha | Alternativas do catálogo |
|---|---|---|
| Título | Big Shoulders (Google, 800–900, largura condensada) | Funnel Display, Imbue |
| Texto | Golos Text (Google, 400–600) | Commissioner, Red Hat Text |

- Escala 1,6. Título de abertura 64–80px no celular, 160–240px no computador, entrelinha 0,85–0,9.
- Título pode quebrar em linhas que entram de lados diferentes; caixa alta só em títulos curtos (até 4 palavras).

## Cores
| Papel | Ponto de partida (OKLCH) | Uso |
|---|---|---|
| Cor-assinatura | tom forte do cliente, C ≥ 0,15 | blocos inteiros, fundo de seção |
| Contra-cor | complementar ou análoga distante, mesma luminosidade ± 0,1 | detalhes, seção alternada |
| Tinta | L 0,15–0,2, C 0,02, matiz do cliente | texto, contornos |
| Papel | L 0,96–0,98, C 0,01–0,02 | respiro entre blocos |

Proibido: degradê roxo-azul, neon sobre preto, arco-íris. No máximo 2 cores fortes por site.

## Grade
- 12 colunas, margem 4–5vw. Seções alternam tela cheia de cor, grade quebrada (elementos que invadem a
  margem) e faixas horizontais. Fotos recortadas (sem fundo) sobre cor chapada funcionam bem.

## Ritmo (rápido, com batida)
| Token | Valor |
|---|---|
| curta / media / longa | 0,2 s / 0,5 s / 0,9 s |
| entra | `cubic-bezier(0.34, 1.56, 0.64, 1)` · GSAP `back.out(1.6)` |
| sai | `cubic-bezier(0.5, 0, 0.75, 0)` · GSAP `power3.in` |
| distancia / escalonar / scrub | 40 px / 0,05 s / 0,5 |

Gesto típico: palavra do título troca no lugar (ex.: "fome de / festa de / vontade de") e a cor de fundo da
seção seguinte invade a tela como um bloco que desliza.

## Cenas que combinam (`lp-cenas`)
| Receita | Por quê |
|---|---|
| `letras-em-cena`, `palavra-zoom` | o título é a imagem principal |
| `lottie-progresso`, `rive-estados` | prato montando, copo enchendo, personagem da marca (sem cara infantil) |
| `rolagem-lateral` | cardápio ou modalidades como uma esteira |
| `cortina` | troca de cor entre seções |

Evitar: `fundo-shader` suave (apaga a energia), `camera-vira`.

**Status:** estilo novo (29/10/2026, DEV-34), sem página de exemplo ainda.
