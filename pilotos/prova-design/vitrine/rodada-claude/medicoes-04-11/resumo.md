| Site | Nota celular | Nota computador | LCP celular (ms) | TBT celular (ms) | CLS carga | Peso carga (KB) | Peso após rolar tudo (KB) | Soma de deslocamentos na rolagem | Intervalo RAF P95 (ms) | Intervalos > 33 ms | > 100 ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| austral-frio | 94 | 100 | 2836 | 144 | 0 | 293 | 333 | 0 | 12.2 | 0.3% | 1 |
| lumen-salao | 78 | 95 | 3037 | 641 | 0 | 285 | 532 | 0.009 | 6.2 | 0.1% | 1 |
| prumo-barbearia | 99 | 100 | 755 | 114 | 0 | 353 | 1280 | 0.007 | 12.2 | 1.3% | 4 |
| lastro-cargas | 99 | 100 | 755 | 128 | 0.001 | 294 | 1090 | 0.001 | 12.1 | 0.5% | 1 |
| estudio-coral | 86 | 99 | 4135 | 118 | 0.006 | 620 | 659 | 0.009 | 12.1 | 0.7% | 1 |
| barbearia-seco | 94 | 100 | 2957 | 99 | 0 | 367 | 394 | 0 | 12.1 | 0.3% | 0 |

Lighthouse 13.6.0 (celular simulado: 4G lento e CPU 4×; computador: preset desktop). Rolagem: Chrome headless com
WebGL por software (SwiftShader), do topo ao fim em 14 s, celular com CPU 4×. Mede intervalos de requestAnimationFrame (sem vsync),
não quadros apresentados na tela: serve para comparar páginas entre si; fluidez real só em aparelho físico.
A soma de deslocamentos não usa janelas de sessão. O JSON novo inclui clsJanela (janelas de 1s/5s) e tarefas longas.

Medido em 04/11/2026, em série na mesma máquina: Claude (austral, lúmen, prumo) e Codex (lastro, coral) no primeiro lote; barbearia-seco logo depois, sozinho (limite de 5 servidores). Um ensaio por site; variação entre ensaios não foi medida.
