# Estilo: editorial sério

Um relatório anual bem feito: sóbrio, confiável, com fios finos, ficha técnica e um único tom de destaque.
Nasceu do que agradou no piloto da transportadora (LP-11): título sem caixa-alta, cores contidas, âmbar só
em detalhe, listas com fios finos, ficha técnica da frota.

**Para quem:** transportadora, indústria, contabilidade, advocacia, engenharia, construtora, agro, clínica
médica, escola técnica, qualquer empresa que vende confiança.
**Precisa de:** fatos (anos, região, frota, serviços). Fotos ajudam mas não são obrigatórias: o estilo segura a
página com tipografia, mapa e linha.

## Fontes
| Papel | Escolha | Alternativas do catálogo |
|---|---|---|
| Título | Erode (Fontshare) | Besley, Ibarra Real Nova, Petrona (Google) |
| Texto | Funnel Sans (Google #493) | Chivo, Golos Text, Red Hat Text |
| Rótulos e ficha | a fonte de texto em algarismos tabulares | — |

- Escala 1,25. Títulos sem caixa-alta, peso 500–600, frase concreta ("Da granja ao seu depósito").
- Proibido: condensada pesada em caixa-alta em tudo (foi chamada de "cartoon" no piloto).

## Cores (estrutura; o destaque vem da marca ou do caminhão/fachada)
| Papel | Ponto de partida (OKLCH) | Uso |
|---|---|---|
| Grafite | L 0,22–0,27, C 0,005–0,015, matiz frio da marca | texto, seções escuras |
| Gelo | L 0,96–0,98, C 0,003–0,01 | fundo principal |
| Cinza médio | L 0,55–0,62, mesmo matiz | texto secundário, fios |
| Destaque | 1 tom da marca (âmbar, azul, verde) com L 0,7–0,78 | só em detalhe: número, linha ativa, botão |

Proibido neste estilo: mais de um destaque, placas e selos chamativos, ícones genéricos como decoração.

## Grade
- 12 colunas (margem 6vw, máx. 1320px); 4 no celular (margem 20px). Alinhamento rígido à esquerda.
- Espaço vertical 96–136px no computador, 64–80px no celular.
- Modelos-base de seção (outros entram conforme a função da seção, DEV-42): **texto + ficha técnica/lista com fios** e **título + mapa, linha ou foto larga**.
- Cantos discretos (6–12px); a cena presa sai pela `secao-cobre-cena` com canto maior (28–48px).

## Ritmo (contido e firme)
| Token | Valor |
|---|---|
| curta / media / longa | 0,2 s / 0,55 s / 0,9 s |
| entra | `cubic-bezier(0.25, 1, 0.5, 1)` · GSAP `power2.out` |
| sai | `cubic-bezier(0.5, 0, 0.75, 0)` · GSAP `power2.in` |
| distancia / escalonar / scrub | 16 px / 0,06 s / 0,6 |

Gesto típico: linhas e mapas se desenham com a rolagem; fios da ficha técnica crescem da esquerda; nada salta.

## Cenas que combinam (`lp-cenas`)
| Receita | Por quê |
|---|---|
| `rota-veiculo` + `linha-do-tempo` (celular) | trajeto, entrega, área atendida, etapas do serviço |
| `texto-revelado` | compromisso da empresa em uma frase |
| `camera-vira` | só com modelo `.glb` real do veículo/produto + HDRI (sem isso, fica de fora — LP-11) |
| `secao-cobre-cena` | saída de qualquer cena presa |
| `sai-de-cena` | topo com foto recortada real do veículo ou produto |

Evitar: `fundo-shader` colorido, `camadas-profundidade` com ilustração, 3D montado com caixas.

**Status:** exemplo fictício implementado e testado em `pilotos/estilos/site/editorial-serio.html`.
Engenharia, terreno esquemático original, Bodoni/Familjen locais; desvios no README do piloto.
Aprovação visual pendente. A Transportadora v2 continua pausada e não foi alterada para criar este exemplo.
