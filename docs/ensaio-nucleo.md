# Ensaio controlado do núcleo

Atualização de 21/10/2026: os ensaios curtos 0.1.4 × 0.1.20 e 0.1.4 × 0.1.21 estão concluídos,
cada um com 18/18 execuções aprovadas ([relatório](relatorio-ensaio-controlado.md)). O teste exploratório
continua separado. No núcleo leve 0.1.21, o contexto variou −30,3% no CSV, −6,4% na API e +66,4% na LP;
amostra pequena e cache não equalizado impedem concluir economia geral ou causalidade.
O lote curto é `execucoes/controlado-2026-10-20T23-10-19-106Z/`; recusas por cota foram preservadas
fora da comparação. O piloto integrado foi concluído em26/10:6/6aprovadas na revisão ampliada, arquitetura inspecionada e auditor/comparador aprovados. Contexto depois/base +40,5%, resultado sem economia geral ou causalidade demonstrada; n=3, cache, refinamento do pedido e pausa semanal limitam a comparação. Duas tentativas recusadas preservadas fora das seis medições finais.
Detalhes em [relatório integrado](relatorio-piloto-integrado.md). Não repetir rodadas concluídas.
O método e seu histórico estão abaixo.

## Tipos e sequência

O plano declara um tipo explícito; lotes e resultados dos dois tipos não se misturam:

| Tipo | Escopo | Total obrigatório |
|---|---|---|
| `ensaio-controlado-v1` | Três tarefas pequenas: CSV, API e LP | 18 execuções, dois grupos e três repetições por tarefa |
| `ensaio-integrado-v1` | Matriz `04-catalogo-integrado`, auditor local modular | 6 execuções, dois grupos e três repetições |

A sequência é concluir e auditar o curto antes do integrado. O primeiro requisito já foi cumprido.
O lote local `execucoes/integrado-2026-10-21T09-38-18-633Z/` contém seis cópias e snapshots
0.1.4 × 0.1.21. O estado de cada rodada e o horário de retomada ficam no plano e no `continuar.md`.
Preparação ou chamada concluída não substituem revisão, medição e aprovação pelo auditor.

A matriz integrada contém 54 testes fornecidos: 1 inicial passa e 53 de aceitação
falham antes da implementação. Somente `auditar.mjs` e `src/` podem ser implementados;
os demais arquivos do inventário ficam congelados. As matrizes pequenas mantêm seu
próprio conjunto de congelados. Além dos critérios comuns, o integrado exige
`grafoDeterministico` e `preservacaoManifestosESaida`, com evidências independentes.

O pedido integrado não exige delegação nem aumento artificial de contexto. Registre
o uso real de agentes e modelos; não acrescente trabalho para alcançar 150 mil tokens.
Um piloto que não atingir esse consumo não valida o alerta desse limiar.

## Carregamento confirmado

A inicialização real do CLI confirmou uma única instância `devagents-core@inline`, versão 0.1.19,
vinda da fonte deste projeto; também listou `orquestrador`, `pesquisador`, `testador` e `publicador`.
O retorno da API veio depois da inicialização e foi recusado por cota, sem tokens de modelo consumidos.
Isso prova carregamento, não execução do orquestrador nem qualidade da entrega.

Para usar uma cópia por sessão sem instalar ou substituir o núcleo do projeto:

1. Crie um JSON **no lote local** com `{"enabledPlugins":{"devagents-core@devagents":false}}`.
2. Acrescente à chamada `--settings <json-do-lote> --plugin-dir <snapshot-do-nucleo>`.
3. Capture `--output-format stream-json --verbose`; na mensagem `system/init`, exija exatamente um núcleo,
   com caminho e versão esperados. Não confunda `plugin list` com plugins realmente carregados na sessão.

Nenhum `settings` global ou de projeto foi editado para esse carregamento. Os demais plugins continuam
herdados e precisam aparecer com as mesmas versões nos pares. O registro antigo dizia segurança 0.1.0,
mas a inicialização atual carregou 0.1.1: outro motivo para não misturar a base exploratória com o novo ensaio.

## Preparação local

O lote concluído ignorado `pilotos/medicoes/execucoes/controlado-2026-10-20T15-09-37-120Z/` contém:

- snapshots congelados do núcleo antigo 0.1.4 e do novo 0.1.20, com hashes;
- 18 cópias novas das matrizes: três tarefas × dois grupos × três repetições;
- sessões distintas, pedido integral e os mesmos argumentos de modelo/permissão para os dois grupos;
- ordem base/depois alternada por par, invertida na segunda repetição;
- `settings.json` exclusivo do lote e `plano.json` com a configuração.

Além do núcleo, apoios explícitos congelados: superpowers e stack-typescript nas três tarefas;
segurança somente na API. As cópias registradas são desabilitadas nos settings desse lote; cada apoio
entra por `--plugin-dir`. O preparador confere hashes e a inicialização precisa corresponder aos apoios.
O primeiro lote, de 14:53Z, foi preservado: uma tentativa retornou 429, núcleo 0.1.4 confirmado e nenhum
token de modelo. A pasta isolada carregou só o núcleo, ao contrário da raiz. A preparação nova evita
depender dessa herança de plugins; não aproveita a tentativa recusada como resultado.

O preparador local `pilotos/medicoes/execucoes/ensaio-controlado.mjs` aceita `--preparar` para o lote curto
e `--preparar-integrado` para o integrado, ambos sem chamar modelo. Não prepare outro lote para retomar
um que já existe. `--executar-proxima <plano.json>` executa somente a próxima tarefa. Ele confere hashes da matriz,
snapshot e settings, testes iniciais, núcleo carregado e arquivos congelados. Para ao primeiro erro de
provedor e também após cada entrega, para a revisão fixa; não declara aprovação só porque o CLI terminou.
Não é ferramenta distribuída do kit: código, históricos e caminhos pessoais permanecem no lote ignorado.

## Ciclo de execução

No reensaio 0.1.21, a primeira tentativa recusada e a 17ª, interrompida em 21/10, foram repostas
uma vez cada após a liberação informada pelo provedor. Ambas permanecem arquivadas; o lote chegou
a 18/18 aprovadas. Para uma nova recusa real por cota, aguarde o reset: `--repor <plano>` preserva
a tentativa e prepara uma cópia limpa. Continue pelo estado do plano e do `continuar.md`.
Confira os plugins reais de ambos os grupos. Divergência fora do núcleo invalida o par.
Revisar cada entrega pelos critérios das matrizes, incluindo o caso CSV com entrada e saída iguais.
Correções ficam na mesma sessão e entram no intervalo medido. LP exige navegador e inspeção visual.

Depois da revisão, atualizar o estado da execução e gerar `medir-uso` com pasta, sessão e intervalo exatos,
incluindo subagentes. Só então liberar a próxima tarefa. Resumir três repetições válidas por tarefa/grupo
e usar `comparar-medicoes.mjs` nos JSONs individuais, nunca nos resumos sanitizados.

Antes de comparar, use `auditar-ensaio.mjs` e a opção `--ensaio` do comparador:
[critérios e formato dos registros](qualidade-ensaio.md). O lote 0.1.20 foi aprovado (18/18).
A tentativa recusada por cota do lote 0.1.21 não conta como rodada válida.

O cache do provedor não foi limpo nem equalizado: registrar criação/leitura e a ordem das execuções.
Mesmo com alternância, não apresentar diferença de tokens como preço, causalidade isolada ou qualidade
mantida sem os critérios aprovados. Não reaproveitar solução anterior nem incluir tentativa 429 como medição.
