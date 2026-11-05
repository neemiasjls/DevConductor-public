| Site | Nota celular | Nota computador | LCP celular (ms) | TBT celular (ms) | CLS carga | Peso carga (KB) | Peso após rolar tudo (KB) | CLS na rolagem | Intervalo P95 (ms) | Intervalos > 33 ms | > 100 ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| lastro | 80 | – | 757 | 890 | 0 | 219 | 977 | 5.948 | 12.2 | 0.8% | 2 |

Lighthouse 13.6.0 (celular simulado: 4G lento e CPU 4×; computador: preset desktop). Rolagem: Chrome headless com
WebGL por software (SwiftShader), do topo ao fim em 14 s, celular com CPU 4×. Mede intervalos de requestAnimationFrame (sem vsync),
não quadros apresentados na tela: serve para comparar páginas entre si; fluidez real só em aparelho físico.
