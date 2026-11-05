# Estilo: claro e orgânico

Luz do dia: fundo claro com o tom do espaço do cliente, arcos e formas macias, serifa calorosa e movimento
devagar, como algo que respira. Acolhedor sem ser infantil (LP-11: nada de mascote ou ícone fofo).

**Para quem:** spa, clínica natural, fisioterapia, padaria, café, confeitaria, pet shop, escola infantil,
produtos naturais, floricultura.
**Precisa de:** fotos claras do espaço ou do produto. Funciona com poucas fotos, porque a tipografia e a cor
seguram as seções.

## Fontes
| Papel | Escolha | Alternativas do catálogo |
|---|---|---|
| Título | Castoro (Google #630, itálico lindo) | Brygada 1918, Young Serif, Gambetta (Fontshare) |
| Texto | Commissioner (Google #303, variável) | Red Hat Text, Familjen Grotesk |

- Escala 1,25–1,333. Títulos em caixa baixa natural, peso regular; itálico só no título de abertura, se couber.
- Entrelinha do corpo 1,65; parágrafos curtos.

## Cores (estrutura; tons tirados do espaço do cliente)
| Papel | Ponto de partida (OKLCH) | Uso |
|---|---|---|
| Claro | L 0,95–0,97, C 0,01–0,025, matiz do espaço (sálvia, argila clara, céu, aveia fria) | fundo |
| Claro 2 | L 0,90–0,93, mesmo matiz | seções alternadas, arcos de fundo |
| Profundo | L 0,28–0,34, C 0,03–0,06, tom natural do cliente (verde-folha, café, azul-ardósia) | texto, 1–2 seções inteiras |
| Acento | tom vivo do produto (fruta, flor, esmalte) | detalhe e botão |

Proibido neste estilo: creme + terracota como base (terracota pode ser acento, se existir no espaço), bege
com tudo arredondado, pastel infantil, ilustração de folhinha.

## Grade
- 12 colunas no computador (margem 6vw, máx. 1280px), 4 no celular (margem 20px). Texto sempre na mesma borda.
- Espaço vertical 112–160px no computador, 72–88px no celular.
- Modelos-base de seção (outros entram conforme a função da seção, DEV-42): **foto em arco + texto ao lado** e **título centralizado + grade de 2–3 fotos**.
- Formas: arcos (topo redondo), fotos com canto 24–32px, botão pílula. Uma forma por site, repetida.

## Ritmo (suave, sem pressa)
| Token | Valor |
|---|---|
| curta / media / longa | 0,25 s / 0,75 s / 1,1 s |
| entra | `cubic-bezier(0.33, 1, 0.68, 1)` · GSAP `power2.out` (ou `sine.out` nas cenas) |
| sai | `cubic-bezier(0.32, 0, 0.67, 0)` · GSAP `power2.in` |
| distancia / escalonar / scrub | 20 px / 0,08 s / 0,8 |

Gesto típico: o arco "cresce" (escala de 0,96 → 1 com a foto vindo de leve deslocada dentro dele); elementos de
fundo andam devagar com a rolagem.

## Cenas que combinam (`lp-cenas`)
| Receita | Por quê |
|---|---|
| `camadas-profundidade` | paisagem ou espaço em camadas (jardim, balcão, vitrine) com fotos recortadas |
| `linha-do-tempo` | processo (do grão ao pão, etapas de um tratamento) |
| `texto-revelado` | frase da casa |
| `sai-de-cena` | produto do topo segue para dentro da cesta/da xícara |
| `fundo-shader` | só em tons claros e muito lento, se o topo não tiver foto |

Evitar: 3D (`orbita-3d`, `camera-vira`), cenas rápidas, seção presa longa (no máximo 3 telas de rolagem).

**Status:** exemplo fictício implementado e testado em `pilotos/estilos/site/claro-organico.html`.
Hospitalidade imaginada, paisagem de banco sem atribuição a estabelecimento, Bodoni/Familjen locais;
desvios no README do piloto. Aprovação visual pendente; não equivale a direção aprovada para um cliente.
