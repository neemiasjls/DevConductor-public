# Estilo: imersivo 3D

A página como uma apresentação de produto: um objeto real em 3D (veículo, máquina, produto, ambiente) é o
protagonista e a câmera passeia por ele com o scroll; o texto aparece em volta como legenda técnica. O impacto
vem do volume e da luz, nunca de brilho artificial.

**Para quem:** transportadora e logística, concessionária, oficina e autopeças, indústria, energia solar,
imobiliária de lançamento, produto físico (móvel, eletrodoméstico, equipamento).
**Precisa de:** modelo GLB com licença ou modelagem própria (`lp-assets`, receita `modelo-3d-real`). Sem
modelo que pareça real, use `editorial-serio` ou `tecnologico-escuro` (LP-11: nada de foto colada em plano fingindo 3D).

## Fontes
| Papel | Escolha | Alternativas do catálogo |
|---|---|---|
| Título | Funnel Display (Google, 500–700) | Big Shoulders, Chivo |
| Texto e legenda técnica | Chivo (Google, 400–500), números tabulares | Sofia Sans, Red Hat Text |

- Escala 1,5. Título de abertura 44–56px no celular, 112–160px no computador.
- Legendas técnicas pequenas (12–14px) com fio ligando ao ponto do objeto.

## Cores
| Papel | Ponto de partida (OKLCH) | Uso |
|---|---|---|
| Palco | L 0,14–0,2 (escuro) ou L 0,92–0,95 (claro de estúdio), C ≤ 0,02 | fundo da cena 3D |
| Cor da marca | tom real do objeto ou da frota | 1 detalhe por seção, luz de recorte |
| Texto | contraste AA sobre o palco | títulos e legendas |

Iluminação do 3D: HDRI de estúdio ou de céu do Poly Haven + sombra de contato; a cor da marca entra como luz de recorte.

## Grade
- O canvas 3D ocupa a tela, preso durante 2–3 capítulos; o texto entra em colunas laterais (4 de 12) que
  trocam de lado a cada capítulo. Depois da cena, seções normais com fotos reais e ficha técnica.

## Ritmo (pesado e preciso)
| Token | Valor |
|---|---|
| curta / media / longa | 0,25 s / 0,7 s / 1,2 s |
| entra | `cubic-bezier(0.22, 1, 0.36, 1)` · GSAP `power3.out` |
| sai | `cubic-bezier(0.64, 0, 0.78, 0)` · GSAP `power3.in` |
| distancia / escalonar / scrub | 16 px / 0,06 s / 1,2 |

Gesto típico: a câmera começa de perto num detalhe, recua até mostrar o objeto inteiro, gira para o lado que
explica o serviço e termina numa vista de cima que vira mapa ou planta.

## Cenas que combinam (`lp-cenas`)
| Receita | Por quê |
|---|---|
| `modelo-3d-real`, `camera-vira`, `orbita-3d` | o objeto é o assunto |
| `rota-veiculo`, `mapa-estudo` | depois da vista de cima, rotas e regiões |
| `secao-cobre-cena` | saída limpa do canvas |
| `distorcao-imagem` | fotos reais da operação entre os capítulos |

Evitar: `lottie-progresso` com ilustração chapada ao lado do 3D (mistura linguagens).

**Status:** estilo novo (29/10/2026, DEV-34), sem página de exemplo ainda.
