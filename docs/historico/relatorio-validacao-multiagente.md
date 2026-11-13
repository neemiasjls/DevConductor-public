# Validação do fluxo multiagente

Estado em26/10/2026: ensaios curtos18/18 cada e integrado6/6 aprovados. Revisão ampliada, inspeção de arquitetura e medições finais concluídas; recusas preservadas à parte. G/H fechadas no escopo controlado, sem commit ou publicação.

## Entregas e evidências

| Etapa | Entrega | Alcance verificado |
|---|---|---|
| A — medir | Uso por modelo, origem e ferramenta, com intervalo por sessão | Medições reais e testes do medidor; correções entram no consumo |
| B — orquestrador | Núcleo 0.1.21: pedido pequeno e fechado segue direto | Nas 18 rodadas curtas não houve chamada de Skill/Agent/Task |
| C — ajudantes | Pesquisador, testador e publicador, mantendo Opus na principal | Definições e integração verificadas; o curto não exercitou delegação |
| D — responsabilidades | Origem e dono das 62 skills | Auditor sem pendências locais; limpeza global permanece fora da autorização |
| E — consumo | Dois lotes curtos aprovados, 18/18 cada, para 0.1.20 e 0.1.21 | Três repetições por tarefa/grupo, mesmos pedidos/critérios e apoios congelados em cada lote |
| F — fluxos | Referências separadas para sistema/API, landing page e automação | Instruções testadas; tarefas controladas validam entregas, sem provar o fluxo completo de um cliente real |
| G — qualidade | Revisores, auditor, comparação bloqueada até aprovação, guarda das correções e reabertura comprovada | Evidências de comportamento, arquivos, modelo e plugins; suíte completa282/284, dois pulados por plataforma |
| H — validar | Testes controlados de CSV, HTTP, navegador e catálogo modular | Curto18/18 e integrado6/6 aprovados; contexto integrado +40,5%, sem causalidade ou economia demonstrada |

As fases antigas de instalação, manutenção e design já registradas como concluídas não foram repetidas.
Salão, Transportadora e Penpot permanecem pausados; clientes novos, aprovação visual e alterações globais não foram simulados.

## Resultado curto 0.1.21

Contexto de entrada, incluindo cache criado, mais cache lido; soma das três repetições válidas:

| Tarefa | Base 0.1.4 | Depois 0.1.21 | Diferença |
|---|---:|---:|---:|
| CSV | 5.105.631 | 3.557.023 | −30,3% |
| API | 924.450 | 865.345 | −6,4% |
| LP | 950.664 | 1.581.435 | +66,4% |

Qualidade final igual pelos critérios fixos: os seis CSVs precisaram da mesma correção de preservação;
as seis APIs e seis páginas passaram na primeira entrega. Inspeção visual incluiu os prints de cada página.
Todas as respostas medidas foram do Opus na principal; nenhum agente foi chamado.
Nos 24 logs válidos, as 236 respostas únicas fecharam com as medições; o contexto máximo por
resposta foi 84.100 tokens. Nenhuma resposta do curto alcançou o limiar de 150.000.

O resultado é misto. Cache não equalizado, amostra de três repetições e pausas de cota impedem atribuir
a diferença isoladamente ao núcleo. Tokens não representam preço. O lote 0.1.20 preservado também
não pode ser comparado diretamente com o novo lote para provar um efeito causal da versão 0.1.21.

Detalhes: [relatório dos ensaios curtos](relatorio-ensaio-controlado.md).

## Aprimoramento da qualidade durante o piloto

A primeira entrega integrada passou nos 54 testes, mas o revisor recusou um arquivo fora do escopo.
O hook de detecção de stack havia criado `.claude/settings.local.json` antes da primeira ferramenta.
O mesmo artefato apareceu nos dois grupos do primeiro par. Foi exigida a limpeza com o mesmo pedido
fixo, na sessão original; a implementação não foi alterada manualmente e o critério não foi relaxado.

Essa investigação expôs uma lacuna: a correção retomava a sessão sem reconferir seu inventário real.
O executor agora valida previamente settings, hashes dos snapshots, argumentos, sessão e Opus; captura
o `init` da correção e registra modelo, plugins e log. O auditor confere os metadados contra esse log.
Ausência, registro parcial, plugin extra, caminho/versão divergente ou principal diferente bloqueiam a rodada.
Registros legados continuam legados; seus campos não foram preenchidos com provas inventadas.

Foram conferidos sem divergência os 24 logs válidos do curto e os dois da primeira execução integrada;
o init inicial da segunda também foi conferido. As correções novas com a guarda passaram nas execuções
reais e no auditor. A recusa nativa de cota sem `init` conserva seu motivo
e horário de liberação; um inventário realmente divergente não é reclassificado como cota.

Suíte completa mais recente:282aprovados, dois pulados por plataforma, zero falhas, saída0, sequencial.
Log local: `pilotos/testes-temporarios/validacao-final-cota-semanal.log`.
Critérios e compatibilidade: [qualidade do ensaio](qualidade-ensaio.md).

## Conclusões já sustentadas

- Manter Opus na principal e delegação por necessidade, conforme as decisões existentes.
- Manter o caminho direto em pedido pequeno e fechado, sem forçar leitura ou delegação para produzir números.
- Manter revisão independente e correções no consumo: o CSV passou nos testes fornecidos e ainda assim perdia a entrada.
- Preservar snapshots durante a medição e tratar alterações do kit em uma etapa separada.
- Não anunciar economia geral, delegação validada ou alerta real de 150 mil tokens com os dados do curto.

## Piloto integrado concluído

Em26/10:6/6aprovadas,54/54por rodada, revisão ampliada EACCES e arquitetura conferidas. Jobs1–4preservados;6corrigido na sessão original e fechado antes da reposição válida5. A nova5dispensou correção funcional; precisou apenas da limpeza automática comum. Onze correções válidas medidas (seis limpezas e cinco funcionais). Duas tentativas recusadas de5arquivadas integralmente e excluídas.

Contexto base8.474.987 e depois11.907.733 (+40,5%); saída120.556 e130.302.225respostas únicas, todas Opus na principal, zeroSkill/Agent/Task; máximo133.355por resposta, abaixo150k. Saída reconciliada com medição final e resultados CLI; contexto deduplicado por resposta, sem usar soma acumulada como máximo.

A amostra não demonstra economia geral nem causalidade: n=3, cache não equalizado, refinamento do pedido funcionalV1/V2, nova implementação5por recusa, ordem6antes5e pausa de cinco dias. Não validou delegação, alerta150k, Linux/ACLs reais ou cliente real. Mantidas as decisões de Opus principal e delegação conforme necessidade, sem forçar chamadas.

G/H concluídas para estas entregas controladas. Detalhes, dispersão, retrabalho e consumo recusado: [relatório integrado](relatorio-piloto-integrado.md). Não há nova tarefa de cliente/global autorizada; itens pausados e rename continuam preservados.
