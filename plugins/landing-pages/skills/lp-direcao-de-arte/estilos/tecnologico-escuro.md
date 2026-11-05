# Estilo: tecnológico escuro

Um painel bem desenhado: fundo escuro tingido, tipografia firme, dados em monoespaçada e uma luz de cor
pontual. Movimento rápido e preciso, como interface boa. Sério (LP-11), nunca "gamer" nem neon.

**Para quem:** software, energia solar, automação, segurança eletrônica, oficina ou estética automotiva premium,
clínica de imagem, academia de alto padrão, escritório de dados/finanças.
**Precisa de:** algum fato técnico ou número **confirmado** (potência, prazo, área atendida). Sem isso, o estilo
fica vazio; prefira `editorial-serio`.

## Fontes
| Papel | Escolha | Alternativas do catálogo |
|---|---|---|
| Título | Funnel Display (Google #540) | Big Shoulders (condensada), Sofia Sans Condensed, Bespoke Sans (Fontshare) |
| Texto | Golos Text (Google #255, 400–900) | Commissioner, Red Hat Text |
| Dados | monoespaçada de autor (conferir com `popularidade.py`; evitar as 120 mais usadas) | algarismos tabulares da fonte de texto |

- Escala 1,333. Títulos sem caixa-alta (LP-11), peso 500–600, espaçamento -0,02em.
- Números sempre em algarismos tabulares; unidade menor e mais clara que o número ("12 **kWp**").

## Cores (estrutura; o acento vem da marca do cliente)
| Papel | Ponto de partida (OKLCH) | Uso |
|---|---|---|
| Fundo | L 0,14–0,18, C 0,01–0,03, matiz da marca (azul-petróleo, grafite esverdeado) | fundo principal |
| Superfície | fundo + 0,04 de L | blocos, ficha técnica |
| Texto | L 0,92–0,95, C 0,01 | corpo e títulos |
| Acento | cor da marca com L 0,72–0,8 e C até 0,16 | só em detalhe: linha ativa, ponto de luz, botão |
| Fio | texto com 10–14% de opacidade | grade visível, divisórias |

Proibido neste estilo: degradê roxo/azul, neon, vidro fosco, brilho na borda, fundo preto puro, "estrelinhas".
Uma seção clara (texto escuro sobre claro) no meio quebra a monotonia; no máximo uma.

## Grade
- 12 colunas visíveis como fios finos em 1–2 seções (a grade é parte do desenho), margem 5vw, máx. 1360px.
  Celular: 4 colunas, margem 20px.
- Espaço vertical médio: 96–144px no computador, 64–80px no celular.
- Modelos-base de seção (outros entram conforme a função da seção, DEV-42): **texto + ficha técnica em colunas** e **título + diagrama/linha/dado grande**.
- Cantos quase retos (4–8px) em blocos; pílula só no botão principal.

## Ritmo (rápido e preciso)
| Token | Valor |
|---|---|
| curta / media / longa | 0,18 s / 0,45 s / 0,8 s |
| entra | `cubic-bezier(0.22, 1, 0.36, 1)` · GSAP `power4.out` |
| sai | `cubic-bezier(0.64, 0, 0.78, 0)` · GSAP `power4.in` |
| distancia / escalonar / scrub | 12 px / 0,04 s / 0,4 |

Gesto típico: linhas se desenham (traço SVG) e a luz do acento corre por elas; dados entram por máscara
horizontal curta. Gráficos (Evil Charts, ver `lp-assets`) se montam com a rolagem só se o dado for real.

## Cenas que combinam (`lp-cenas`)
| Receita | Por quê |
|---|---|
| `fundo-shader` | topo sem foto que precisa de vida (gradiente lento na cor da marca, escuro) |
| `rota-veiculo` / `linha-do-tempo` | instalação em etapas, processo, área atendida |
| `orbita-3d` / `camera-vira` | só com modelo `.glb` real do produto (LP-11, `lp-assets`) |
| `sequencia-quadros` | equipamento montando/abrindo, quando há vídeo real |
| `texto-revelado` | promessa curta e técnica |

Evitar: `camadas-profundidade` com ilustração (fica desenho), partículas sem motivo.

**Status:** exemplo fictício implementado e testado em `pilotos/estilos/site/tecnologico-escuro.html`.
Automação, Familjen local, diagramas abstratos originais; desvios do preset no README do piloto.
Aprovação visual pendente; não equivale a direção aprovada para um cliente.
