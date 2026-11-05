# Conferência depois da crítica — 29/10/2026

Builds de produção. Percurso programático de 14s, navegador isolado, Chrome headless com SwiftShader.
Celular390×844/CPU4×; desktop1440×900/CPU1×. Uma observação por modo; não representa aparelho físico.

| Lastro | Transferido no percurso | CLS por janela | Soma de deslocamentos | Intervalo RAF P95 | Intervalos >100ms |
|---|---:|---:|---:|---:|---:|
| Celular | 978KB | 0,001 | 0,001 | 18,2ms | 11 |
| Computador | 2057KB | 0,001 | 0,001 | 30,3ms | 18 |

Tarefas longas também registradas nos JSONs: maior922ms no celular e363ms no desktop, incluindo carga.
O problema dos saltos foi reproduzido separadamente com roda/toque/retorno em
`../revisao-critica-29-10-r3/resultado.json`: maior janela0/0,0009; os resultados anteriores continuam em
`../revisao-critica-29-10-r2/resultado.json`. Sem atribuir essas diferenças a GPU/FPS físico.

Lighthouse **não foi repetido nesta rodada**. A comparação anterior, em `../medicoes-final/`, registrou:

| Site | Lighthouse celular/computador | KB na carga | KB após rolagem (celular) |
|---|---:|---:|---:|
| Lastro antes da crítica | 94/100 | 219 | 977 |
| Coral antes da crítica | 81/100 | 493 | 1005 |
| Seco antes da crítica | 95/100 | 367 | consultar JSON original |
| Transportadora anterior | 69/70 | 422 | consultar JSON original |
| salão-cliente anterior | 51/74 | 930 | consultar JSON original |

Os resumos históricos preservam a coluna “FPS”, mas ela mede callbacks RAF. Não usar esse número como taxa
da tela ou critério de superioridade. A coluna antiga “CLS” é da carga Lighthouse; `cls` do helper histórico
é soma de eventos, sem janelas. O helper atualizado mantém esse campo e acrescenta `clsJanela` e tarefas longas.
Notas variam com cache/máquina e não demonstram causalidade, economia ou conversão.
