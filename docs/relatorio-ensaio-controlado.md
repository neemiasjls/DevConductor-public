# Relatório do ensaio controlado (Fase E)

Ensaio de 20/10/2026. Compara o núcleo antigo **0.1.4** ("base") com o novo **0.1.20** ("depois", com o
orquestrador) em três tarefas fixas, três repetições por grupo, ordem alternada, Opus na principal, mesmas
matrizes, critérios e plugins de apoio. Lote local ignorado:
`pilotos/medicoes/execucoes/controlado-2026-10-20T15-09-37-120Z/`. Auditor: **aprovado, 18/18, sem problemas**.

## Qualidade

As 18 entregas passaram nos critérios fixos. A diferença entre os grupos foi nenhuma:

| Tarefa | Base | Depois |
|---|---|---|
| Script CSV | 3/3 com o mesmo defeito (entrada = saída apagava o CSV), corrigido com o mesmo pedido | 3/3 com o mesmo defeito, corrigido igual |
| Endpoint API | 3/3 de primeira | 3/3 de primeira |
| Seção de LP | 3/3 de primeira | 3/3 de primeira |

Observações fora dos critérios (anotadas na evidência, sem correção, para não tratar os grupos de forma diferente):
- 15 (API, base): a sessão deixou aberto o próprio servidor de teste na porta 3000; no Windows o `kill` do bash
  não encerra o node. O revisor encerrou o órfão e refez a revisão.
- 18 (LP, depois): em 1280 px o título da página ficou fora do alinhamento do resto. Não há corte, sobreposição
  nem rolagem.

## Consumo (soma das três repetições)

| Tarefa | Grupo | Respostas | Entrada | Cache lido | Saída | Entrada + cache |
|---|---|---|---|---|---|---|
| CSV | base | 68 | 323.581 | 4.149.100 | 51.795 | 4.472.681 |
| CSV | depois | 90 | 189.470 | 6.283.925 | 62.646 | 6.473.395 (+44,7%) |
| API | base | 19 | 110.467 | 923.068 | 11.632 | 1.033.535 |
| API | depois | 18 | 117.871 | 900.404 | 9.760 | 1.018.275 (−1,5%) |
| LP | base | 22 | 112.087 | 1.067.482 | 15.291 | 1.179.569 |
| LP | depois | 26 | 122.818 | 1.330.413 | 18.203 | 1.453.231 (+23,2%) |

Todas as respostas foram do Opus. Nenhuma execução chamou agente (0 delegações nos dois grupos).
O orquestrador foi chamado em 6 das 9 execuções do grupo depois.

## O que dá para concluir

- **O núcleo novo não economizou nestas tarefas.** Na API ficou igual; no CSV e na LP gastou mais.
- A variação entre repetições é grande: no CSV, o grupo depois teve 27, 22 e **41** respostas, e uma única
  execução longa pesa mais que a diferença entre os grupos. Três repetições não bastam para separar efeito de acaso.
- As três tarefas são pequenas (uma pessoa faz em poucos minutos). Nelas o orquestrador só acrescenta leitura
  (ficha e referências) e não tem o que delegar. O ganho esperado do desenho (DEV-30: delegar trabalho braçal e
  abrir sessão nova em conversa longa) não aparece em tarefa curta, e este ensaio não testou tarefa longa.
- Não dá para afirmar causalidade: o cache do provedor não foi controlado, e a ordem alternada só reduz esse efeito.

## Próximos passos sugeridos

1. Deixar o orquestrador mais leve em pedido pequeno e fechado: ficha só na cabeça, sem carregar referência.
2. Medir onde o desenho promete ganho: tarefa longa com partes braçais (pesquisa, testes, publicação) e conversa
   que passa de 150 mil tokens.
3. Ensinar o encerramento de servidores de teste no Windows (achado da execução 15) na skill de testes ou no `testador`.

## Reensaio do orquestrador leve — 0.1.21

Preparado em 20/10/2026, lote local ignorado
`pilotos/medicoes/execucoes/controlado-2026-10-20T23-10-19-106Z/`: base 0.1.4, depois 0.1.21,
mesmos pedidos e critérios, três repetições por tarefa/grupo, snapshots e apoios congelados.

**Concluído em 21/10/2026, às 11:25 de São Paulo: auditor aprovado, 18/18, sem problemas ou pendências.**
O comparador por tarefa também terminou com saída 0. Os resultados deste reensaio estão abaixo,
separados da tabela 0.1.20. O histórico de preparação e recuperação foi preservado.

### Histórico da preparação e das recusas

Antes de executar, foi corrigida a limpeza do primeiro teste assíncrono do grafo: o teste passou a esperar
o encerramento do processo em segundo plano antes de apagar a pasta, usando a espera existente.
Grafo isolado: 16/16. Suíte completa sequencial: 148 aprovados, dois pulados, zero falhas (150 testes), saída 0.
A execução paralela também apresentou uma falha transitória de stdout vazio do scanner, que passou isolado;
nenhuma verificação foi removida. Manifestos raiz e núcleo e `git diff --check` aprovados.

A primeira execução CSV base foi interrompida pelo limite da sessão às 20:12 de São Paulo. O CLI confirmou
núcleo, apoios e arquivos congelados, mas retornou renovação às **23:10 (America/Sao_Paulo)**. A tentativa
teve uso do Opus e não é uma rodada válida. Foi arquivada por `--repor` na retomada de 21/10,
com cópia limpa da matriz e nova sessão.
Não houve insistência, troca de modelo principal, commit ou publicação.

Uma segunda recusa ocorreu na tentativa 17 (LP base, repetição 3), às 07:30 de 21/10,
com renovação informada para 11:20 de São Paulo. Também teve uso do Opus e foi preservada,
sem ser contada como rodada. Após a janela, a reposição preparou outra cópia limpa e sessão nova;
as execuções 17 e 18 concluíram o lote. As duas tentativas recusadas ficam fora das tabelas finais.

### Avanço independente da cota

Os revisores de API e LP passaram a controlar seus processos Node por escopo: entrada direta sem shell,
fechamento aguardado em `finally` e erro de limpeza visível. A LP limpa seu servidor mesmo quando falha
ao iniciar o navegador; a API também limpa o servidor de inspeção se a revisão lançar erro.

Sete testes novos passaram. Suíte completa sequencial: 155/157 aprovados, dois pulados, zero falhas.
Ambos os revisores foram exercitados em cópias das entregas já aprovadas: passaram e liberaram as portas;
o plano do lote concluído permaneceu intacto. Isso não consome cota e não conta como rodada do modelo.
Evidências e limites em [servidores-de-teste.md](servidores-de-teste.md).

Os snapshots do ensaio 0.1.21 não mudaram. A limpeza cobre os processos iniciados pelos revisores;
um eventual servidor órfão criado pela sessão do modelo ainda precisa ser identificado antes de encerrar.

### Robustez da recuperação e da revisão

Foi corrigida a requisição HTTP que, ao receber corpo truncado, deixava uma promise pendente e um erro
sem tratamento: agora a falha é propagada e a limpeza executa. Os prazos cobrem headers/corpo e a prontidão
tem limite total. Os revisores API/LP passaram novamente nas cópias, sem chamadas ao modelo.

O ciclo permite corrigir uma falha de aceitação, arquiva a revisão antiga e exige nova conferência depois
da correção. O fechamento usa o log final correto; o auditor verifica término e saída das correções
registradas. A reposição por cota prepara os arquivos antes da troca e restaura o estado em caso de falha.
Também foi conferida nativamente no Windows com tentativa fictícia, sem alterar o lote real.

Na validação dessa etapa da infraestrutura: **179/181 testes aprovados, dois pulados, zero falhas**.
O lote anterior continuou aprovado em 18/18; naquele momento o reensaio 0.1.21 ainda não tinha rodada válida.
Essas correções de infraestrutura não são uma medição de consumo nem alteram a tabela 0.1.20.

### Qualidade final — 0.1.21

As 18 entregas válidas passaram nos mesmos critérios e conservaram os arquivos congelados.
Cada correção foi pedida na sessão original e incluída no intervalo medido.

| Tarefa | Base 0.1.4 | Depois 0.1.21 |
|---|---|---|
| Script CSV | 3/3 com entrada = saída sobrescrevendo o CSV; uma correção por sessão | 3/3 com o mesmo defeito; uma correção por sessão, mesmo pedido integral |
| Endpoint API | 3/3 na primeira entrega, incluindo revisão HTTP e de persistência da senha | 3/3 na primeira entrega, mesma revisão |
| Seção de LP | 3/3 na primeira entrega, com revisão de navegador e capturas inspecionadas | 3/3 na primeira entrega, mesma revisão e inspeção |

As LPs foram conferidas em 390/1280 px, movimento normal/reduzido, teclado e sem JavaScript,
além dos casos de 320 px e texto a 200%. As capturas normais dos dois tamanhos foram vistas antes
de fechar cada execução. Não houve corte ou sobreposição visível.

Observações registradas sem alterar os critérios ou solicitar correção:

- Execuções 4 (API depois), 6 (LP depois) e 15 (API base) deixaram seus próprios servidores abertos.
  A origem foi confirmada pelo processo pai e pelo diretório da tarefa; somente o PID correspondente
  foi encerrado antes da revisão. As portas ficaram livres após as verificações.
- Execução 12 (LP base): em 1280 px o título da página começa mais à esquerda que a seção,
  sem corte, sobreposição ou rolagem horizontal.

### Consumo final — 0.1.21

Soma das três repetições válidas por tarefa/grupo. Entrada inclui os tokens de criação de cache;
cache lido permanece separado. As seis correções de CSV estão incluídas, as duas recusas de cota não.

| Tarefa | Grupo | Respostas | Entrada | Cache lido | Saída | Entrada + cache |
|---|---|---|---|---|---|---|
| CSV | base | 81 | 328.639 | 4.776.992 | 79.041 | 5.105.631 |
| CSV | depois | 63 | 158.310 | 3.398.713 | 47.309 | 3.557.023 (−30,3%) |
| API | base | 20 | 109.940 | 814.510 | 13.250 | 924.450 |
| API | depois | 19 | 106.255 | 759.090 | 8.727 | 865.345 (−6,4%) |
| LP | base | 20 | 132.681 | 817.983 | 23.417 | 950.664 |
| LP | depois | 33 | 118.087 | 1.463.348 | 20.390 | 1.581.435 (+66,4%) |

Todas as respostas medidas foram de `claude-opus-5`, com origem `principal`.
Foram conferidos os registros `tool_use` dos 18 logs iniciais e dos seis logs de correção,
deduplicados pelo identificador da chamada:

| Chamada efetiva | Base (9 sessões) | Depois (9 sessões) |
|---|---|---|
| `Skill` | 0 | 0 |
| `Agent` | 0 | 0 |
| `Task` | 0 | 0 |

As ferramentas chamadas foram Bash, Read, Write, Edit e PowerShell. Nenhuma entrada dessas chamadas
referenciou `orquestrador` ou `devagents-fluxo`. Não houve delegação observada neste reensaio.
O resumo e os caminhos dos logs conferidos estão em `resumo-final-0.1.21.json`, dentro do lote local.

O contexto máximo por resposta foi conferido nos 24 logs válidos, deduplicando sessão, origem e
identificador da mensagem. A soma das 236 respostas únicas fecha com as 18 medições:

| Tarefa | Base: máximo por resposta | Depois: máximo por resposta |
|---|---:|---:|
| CSV | 84.100 | 66.399 |
| API | 51.964 | 49.420 |
| LP | 56.098 | 55.279 |

O máximo global foi 84.100, na correção da primeira execução CSV base. Nenhuma resposta alcançou
150.000 tokens de contexto. O total acumulado de cache lido não é o tamanho de uma conversa em um
momento, e o máximo de contexto sozinho não comprovaria a emissão do hook.

### Leitura dos resultados e próximo passo

Neste lote, o grupo depois consumiu menos entrada + cache no CSV e na API e mais na LP,
com os mesmos resultados finais de qualidade. A LP teve 6/7/7 respostas na base e 10/12/11 depois;
o CSV teve 32/22/27 na base e 22/21/20 depois. As repetições continuam variando.

São apenas três repetições por tarefa/grupo, com cache do provedor não equalizado e interrupções
por cota entre parte das execuções. A alternância de ordem reduz um efeito de sequência,
mas não isola causalidade. Tokens não são preço. Não atribua as diferenças ao orquestrador leve
nem compare diretamente os totais de dias/lotes distintos para provar ganho da 0.1.21 sobre a 0.1.20.

O próximo passo é o piloto separado `ensaio-integrado-v1`, com seis execuções da matriz 04,
após esta aprovação do curto. Ele deve observar a condução real de uma tarefa modular,
sem obrigar delegação ou acrescentar conteúdo para alcançar 150 mil tokens. Este ensaio curto
não validou delegação nem o alerta desse limiar de contexto.
