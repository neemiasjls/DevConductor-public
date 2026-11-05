# Estilo: luxo editorial

A página como uma revista de moda: foto grande e bem cortada, título em serifa de alto contraste, muito
espaço vazio e movimento lento. O luxo vem da calma e do recorte, nunca de dourado ou brilho.

**Para quem:** salão de beleza, estética, moda, joalheria, noivas, arquitetura de interiores, restaurante autoral.
**Precisa de:** fotos boas do cliente (o estilo depende delas). Sem fotos boas, prefira `claro-organico` ou
`editorial-serio`.

## Fontes
| Papel | Escolha | Alternativas do catálogo |
|---|---|---|
| Título | Gloock (Google #499, 400) | Imbue (caixa alta grande), Libre Caslon Display, Melodrama (Fontshare) |
| Texto | Familjen Grotesk (Google #516, 400–700) | Funnel Sans, Supreme (Fontshare) |
| Rótulo (opcional) | a mesma do texto, 12–13px, espaçamento 0,08em, caixa alta curta | — |

- Escala 1,5 (editorial). Título de abertura 48–56px no celular, 96–140px no computador, entrelinha 0,95–1,05.
- Itálico verdadeiro só em uma palavra **de um** título do site, se fizer sentido (nunca em todos).
- Números de seção ("01", "02") em algarismos de texto, pequenos, como numeração de revista.

## Cores (estrutura; os tons vêm das fotos do cliente)
| Papel | Ponto de partida (OKLCH) | Uso |
|---|---|---|
| Escuro da marca | L 0,18–0,24, C 0,02–0,05, matiz do cliente (vinho, ameixa, café, verde fundo) | seções inteiras, texto |
| Claro frio | L 0,96–0,98, C 0,005–0,012, mesmo matiz | fundo principal |
| Cor-assinatura | tom do trabalho do cliente (cor de cabelo, tecido, prato) | grandes áreas, 1 por site |
| Fio | escuro com 12–18% de opacidade | linhas finas, divisórias |

Proibido neste estilo: creme + dourado, preto puro, "champanhe", degradê.

## Grade
- 12 colunas no computador (margem 6–8vw, largura máx. 1440px), 4 no celular (margem 20px).
- Assimetria controlada: texto em 4–5 colunas, foto em 6–7, alinhados pela mesma borda na maior parte das seções.
- Espaço vertical generoso: 120–200px entre seções no computador, 72–96px no celular.
- Modelos-base de seção (outros entram conforme a função da seção, DEV-42): **foto sangrada + texto curto ao lado** e **título grande + sequência de
  fotos**. Fotos em arco ou com canto grande só se o espaço do cliente tiver arco (espelho, porta).

## Ritmo (lento, de respiração)
| Token | Valor |
|---|---|
| curta / media / longa | 0,3 s / 0,9 s / 1,4 s |
| entra | `cubic-bezier(0.16, 1, 0.3, 1)` · GSAP `expo.out` |
| sai | `cubic-bezier(0.7, 0, 0.84, 0)` · GSAP `expo.in` |
| distancia / escalonar / scrub | 24 px / 0,09 s / 1 |

Gesto típico: a foto abre como uma cortina (moldura com `overflow: hidden` que cresce em `scaleY` enquanto a
foto dentro faz a escala inversa, só `transform`) e o título chega depois, devagar.

## Cenas que combinam (`lp-cenas`)
| Receita | Por quê |
|---|---|
| `texto-revelado` | frase da dona ou manifesto, palavra por palavra |
| `camadas-profundidade` | fotos do espaço em camadas (fundo, cadeira, espelho) |
| `sequencia-quadros` | quando há vídeo do espaço ou do trabalho (antes → depois) |
| `secao-cobre-cena` | saída elegante de qualquer cena presa |

Evitar: `fundo-shader` (tira o foco da foto), `rota-veiculo`, `camera-vira`, 3D abstrato.

## Lição do piloto
No salão piloto, o pôster fixo (`pinned-poster`) foi chamado de "bagunçado": manter a grade única e a calma;
a cartela de tons como detalhe de assinatura agradou.

**Status:** exemplo fictício implementado e testado em `pilotos/estilos/site/luxo-editorial.html`.
Arquitetura e paisagem, Bodoni/Familjen locais e percurso SVG abstrato; desvios do preset registrados
no README do piloto. Aprovação visual pendente; não equivale a direção aprovada para um cliente.
