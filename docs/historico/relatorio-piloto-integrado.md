# Relatório do piloto integrado

Concluído em 26/10/2026: **6/6 execuções aprovadas**, 54/54 testes fornecidos por execução, revisão independente ampliada e inspeção das fontes antes de cada fechamento. Auditor sem problemas ou pendências, saída 0. Sem commit ou publicação.

Comparação do núcleo 0.1.4 (base) com 0.1.21 (depois): contexto total **8.474.987 ×11.907.733 tokens (+40,5%)**. A saída foi 120.556 ×130.302 (+8,1%). Esse piloto não demonstrou economia geral nem efeito causal da versão.

## Método e evidências

Lote local: `pilotos/medicoes/execucoes/integrado-2026-10-21T09-38-18-633Z/plano.json`. Matriz `04-catalogo-integrado`: CLI modular nativa para catálogo com 15 manifestos/22 arestas, schema, precedência de erros, Kahn e fecho transitivo. Três repetições por grupo; snapshots, matrizes e testes fornecidos congelados. CLI 2.1.226, Node v 24.19.0; Opus na principal e mesmos apoios explícitos. Implementações e correções pelo provedor, sem reparo manual das soluções.

Cada fechamento exige 54 testes, revisão independente (oracle de grafo, entradas inválidas, preservação de arquivos/saída e aliases), leitura da CLI e módulos e registro de arquitetura. A revisão ampliada injeta EACCES sem alterar ACLs: access negado ou access permitido/listagem negada, cada um com saída válida e pai ausente. Todas as quatro combinações passaram nos seis resultados finais.

Artefatos locais por rodada: `revisao.json`, `revisao-fixa.log`, testes, `medicao.json` e logs CLI. Revisões e fechamentos anteriores estão arquivados. Síntese reproduzível: `pilotos/medicoes/execucoes/integrado-2026-10-21T09-38-18-633Z/sintetizar-final.mjs` → `resumo-final-integrado.json`; ela exige auditor aprovado e reconcilia contagem de respostas, contexto e saída com as medições finais. Comparador oficial também aprovado.

## Consumo válido

Tokens; contexto = entrada nova + cache criado + cache lido, somados entre respostas únicas. Esse total acumulado **não** é tamanho de contexto de uma resposta. A coluna de entrada do comparador já inclui cache criado; não somá-lo novamente.

| Job | Grupo | Entrada nova | Cache criado | Cache lido | Saída | Contexto total | Correções |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | base r 1 | 56 | 346.637 | 2.401.618 | 42.994 | 2.748.311 | 2 |
| 2 | depois r 1 | 74 | 159.263 | 3.060.737 | 32.007 | 3.220.074 | 2 |
| 3 | depois r 2 | 73 | 257.357 | 3.148.566 | 42.620 | 3.405.996 | 2 |
| 4 | base r 2 | 76 | 203.644 | 3.760.185 | 51.255 | 3.963.905 | 2 |
| 5 | base r 3 | 44 | 153.347 | 1.609.380 | 26.307 | 1.762.771 | 1 |
| 6 | depois r 3 | 103 | 209.437 | 5.072.123 | 55.675 | 5.281.663 | 2 |
| Base total | 3 sessões | 176 | 703.628 | 7.771.183 | 120.556 | 8.474.987 | 5 |
| Depois total | 3 sessões | 250 | 626.057 | 11.281.426 | 130.302 | 11.907.733 | 6 |

Dispersão do contexto total por sessão (n=3, desvio amostral, CV=desvio/média):

| Grupo | Média | Mediana | Mínimo–máximo | Desvio | CV |
|---|---:|---:|---:|---:|---:|
| base | 2.824.996 | 2.748.311 | 1.762.771–3.963.905 | 1.102.569 | 39,0% |
| depois | 3.969.244 | 3.405.996 | 3.220.074–5.281.663 | 1.140.383 | 28,7% |

Dispersão da saída por sessão, das medições finais:

| Grupo | Média | Mediana | Mínimo–máximo | Desvio | CV |
|---|---:|---:|---:|---:|---:|
| base | 40.185 | 42.994 | 26.307–51.255 | 12.709 | 31,6% |
| depois | 43.434 | 42.620 | 32.007–55.675 | 11.855 | 27,3% |

## Retrabalho e recusas

Os seis resultados válidos precisaram de uma limpeza da configuração local gerada pelo hook antes da primeira ferramenta. Jobs 1–4 e 6 também precisaram de correção funcional de precedência da entrada; essas cinco correções entram integralmente nas medições. A reposição válida 5 já listava a entrada antes do destino e passou na revisão ampliada após apenas a limpeza. Isso difere da tentativa semanal abandonada 5, que tinha defeito funcional e sobra de teste manual.

Job 1 recebeu o pedido funcionalV 1 e passou nas duas variantes;2,3,4,6 receberamV 2, com access permitido/listagem negada explicitado. Não foram prompts literalmente iguais em todos os resultados. Jobs 1–4 não repetiram a implementação inicial;6 foi corrigido na sessão original. Após a pausa semanal,5 foi reposto uma vez e 6 fechado antes da execução da nova 5, respeitando a guarda de revisão pendente.

Duas tentativas inteiras de 5 ficam fora da comparação, preservadas em pastas recusadas. A tentativa semanal inclui chamadas iniciais bem-sucedidas e a correção recusada; nenhuma parte de seu consumo foi misturada à reposição válida. Totais dos resultados CLI por tentativa inválida:

| Recusa | Entrada nova | Cache criado | Cache lido | Saída |
|---|---:|---:|---:|---:|
| Sessão,21/10 | 12 | 46.886 | 244.387 | 15.186 |
| Semanal,21/10, arquivada 26/10 | 51 | 327.788 | 1.710.397 | 32.391 |

Na chamada semanal recusada isolada: entrada nova 1, cache criado 86.258, cache lido 13.443, saída 4.963. Reset nativo 26/10 às 9 hBRT, respeitado; versões locais conferidas antes da retomada. Saída e uso recusados são consumo real inválido, não zero.

## Modelos, ferramentas e contexto máximo

225 respostas únicas:94 base e 131 depois, todas `claude-opus-5` na principal. Chamadas reais deduplicadas por tool_use.id: Bash 117, Read 44, Write 54, PowerShell 5, Edit 15; **Skill 0, Agent 0, Task 0**. Inventário disponível não conta como chamada. Não houve delegação observada.

Maior contexto por resposta deduplicada: **133.355 tokens**, job 6, `06-depois-r3/resultado-correcao-2-cli.jsonl:170`. Chave de deduplicação: sessão/origem/message.id, mantendo a fotografia de maior contexto. Nenhuma resposta alcançou 150.000; alerta nesse limiar não foi validado. A saída das mensagens assistant no stream é parcial: os totais de saída acima vêm da medição final e conferem com a soma dos resultados finais de cada chamada.

## Alcance e limites

G/H concluídas para o escopo controlado autorizado: auditor/comparador, revisão, correção medida, arquitetura e síntese. Suíte da infraestrutura mais recente:282 aprovados, dois pulados por plataforma, zero falhas, saída 0 (`pilotos/testes-temporarios/validacao-final-cota-semanal.log`); não houve mudança de código dessa infraestrutura nesta retomada.

Cache não equalizado, n=3, dispersão, refinamentoV 1/V 2, repetição de uma implementação por recusa, ordem 6 antes 5 e pausa de cinco dias limitam a comparação. Tempo de calendário contém revisão e espera; não mede velocidade isolada. Somente Windows: sem prova em Linux, ACLs reais, aparelho físico ou cliente real; inspeção estática é heurística e não é sandbox. Tokens não são preço. Não há evidência de economia geral, causalidade, delegação ou alerta 150 k.

Relatórios anteriores preservados: [ensaios curtos](relatorio-ensaio-controlado.md), [consolidação G/H](relatorio-validacao-multiagente.md), [metodologia](qualidade-ensaio.md). Salão/Transportadora/Penpot seguem pausados e alterações globais fora do escopo.
