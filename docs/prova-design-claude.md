# Prova de design — rodada Claude (DEV-36) — 04/11/2026

Segunda série de exemplos, pedida em 29/10: uma transportadora, um salão e uma barbearia fictícios, com
ideias próprias, calibrando os exageros apontados na rodada Codex (escala, permanência na rolagem, efeitos
competindo). A rodada Codex continua em `docs/prova-design.md`; as duas ficam separadas na pasta e na vitrine.

## Entregas

| Site | Ideia central | Estilo | Pasta | Preview |
|---|---|---|---|---|
| Austral Frio | A temperatura é a carga: a linha do registrador conduz o site (geada na porta do baú, viagem de 36 h, faixas de serviço, botão) | editorial sério | `pilotos/prova-design/rodada-claude/austral-frio/` | `npm run preview` → 5201 |
| Lúmen Salão | Brilho é cutícula fechada: reflexo de luz na foto, o fio por dentro em Lottie próprio, cronograma, resultado em arco | luxo editorial | `.../rodada-claude/lumen-salao/` | 5202 (só `localhost`) |
| Prumo Barbearia | Degradê é medida: cadeira real em 3D (Poly Haven CC0), régua de milímetros, degradê acendendo pente a pente | tecnológico escuro | `.../rodada-claude/prumo-barbearia/` | 5203 |

Plano, roteiro de cenas e seção "Testes" de cada site no próprio `plano.md`; brief comum em
`rodada-claude/brief-construcao.md`; créditos e licenças em `assets.md`/`creditos.md` de cada site.

## Calibração em relação à rodada Codex
- Escala: títulos da abertura com teto por site (Austral ≤ 7,5vw, Prumo ≤ 6,5vw, Lúmen 96–124 px); nada de
  palavra gigante atravessando a tela.
- Permanência: no máximo duas cenas presas grandes por site, nunca três presas seguidas, passagens curtas
  (0,6–0,9 tela no celular).
- Uma técnica por seção, famílias diferentes em seções vizinhas; cada efeito explica algo do negócio.
- Fotografia com um tratamento só por site e conferida pelo conteúdo (DEV-37), não pelo nome do arquivo.
- Não repetidos os efeitos rejeitados: distorção RGB e caixote como protagonista. O 3D ficou onde mostra o
  lugar do serviço (cadeira da Prumo).

## Testes (detalhes no `plano.md` de cada site)

| Site | Build | 6 larguras × normal/reduzido | Comportamento (teclado, pausa, reduzido dinâmico, mídia indisponível, ida e volta) |
|---|---|---|---|
| Austral | ok | 12/12, CLS 0 (rodada-5) | aprovado em 360–1440, toque real e roda (`revisao/comportamento-3`) |
| Lúmen | ok | 12/12, CLS ≤ 0,0025 (rodada-2) | aprovado em 390 e 1440 (`revisao/comportamento-4`) |
| Prumo | ok | 12/12 (rodada-4) | 14/14 cenários, teclado completo, 5 ciclos sem vazamento relevante, GLB/HDR bloqueados (`revisao/comportamento-14`) |

Prints de revisão ficam locais (como na rodada Codex); sobem só `relatorio.json`/`resultado.json`.

## Vídeos e vitrine
Seis vídeos (computador 1440×900 e celular 390×844) com 6 quadros cada em
`pilotos/prova-design/vitrine/rodada-claude/`, gravados com `lp-referencias/scripts/gravar-rolagem.mjs` e
conferidos por `ferramentas/verificar-videos.mjs` (dimensões, busca no meio, quadros) →
`verificacao-videos.json`. Quadros olhados: páginas carregadas, sem tela preta. A vitrine principal ganhou o
grupo **Exemplos · Claude**, sem mexer no grupo Codex.

## Desempenho observado (04/11, mesma máquina, em série)

| Site | Rodada | Nota celular | Nota computador | LCP celular ms | TBT celular ms | Peso carga KB | Peso após rolar KB | CLS por janela celular |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Austral Frio | Claude | 94 | 100 | 2836 | 144 | 293 | 333 | 0 |
| Lúmen Salão | Claude | 78 | 95 | 3037 | 641 | 285 | 532 | 0,009 |
| Prumo Barbearia | Claude | 99 | 100 | 755 | 114 | 353 | 1280 | 0,007 |
| Lastro Cargas | Codex | 99 | 100 | 755 | 128 | 294 | 1090 | 0,001 |
| Estúdio Coral | Codex | 86 | 99 | 4135 | 118 | 620 | 659 | 0,009 |
| Barbearia Seco | Codex | 94 | 100 | 2957 | 99 | 367 | 394 | 0 |

Lighthouse 13.6.0 (celular simulado 4G lento + CPU 4×), um ensaio por site; percurso completo em 14 s com
WebGL por software. Evidência completa em `vitrine/rodada-claude/medicoes-04-11/`. Os intervalos de
requestAnimationFrame não são quadros da tela; fluidez real só em aparelho físico.

## Comparação e crítica (sem nota de premiação)
- Carga: as duas rodadas ficam na mesma faixa. Prumo e Lastro carregam o 3D depois (gesto ou ocioso) e por
  isso pesam mais só depois de rolar (1,1–1,3 MB).
- **Ponto fraco da rodada Claude: Lúmen no celular (78, TBT 641 ms).** O tempo vem do JavaScript principal
  (~0,7 s de script na CPU 4×), não do Lottie, que é carregado sob demanda. Próximo ajuste: adiar o shader de
  reflexo e o Lenis até depois da primeira pintura e medir de novo.
- Identidade: as três ideias centrais são diferentes das do Codex (dado invisível em vez de carga em 3D;
  tratamento do fio em vez de tranças e cor chapada; precisão de oficina em vez de cartaz de rua).
- Não avaliado aqui: preferência estética do Neemias, aparelho físico, conversão comercial.

## Falta validar
- Aparelho físico (celular real): fluidez do shader do Lúmen, da geada da Austral e da cadeira 3D da Prumo.
- Aprovação visual do Neemias nos três sites.
