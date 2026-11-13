# Qualidade e validação do ensaio

Verificações automáticas das etapas G/H do multiagente. Os dois ensaios curtos já foram aprovados em
18/18 cada; o piloto integrado segue o estado do [continuar](../continuar.md). A aprovação dos registros
e das entregas controladas não constitui resultado de economia nem validação completa de um cliente real.

```powershell
node scripts/auditar-ensaio.mjs "<lote>/plano.json" --json
node scripts/comparar-medicoes.mjs "base=<tres-medicoes-da-tarefa>" "depois=<tres-medicoes-da-tarefa>" --ensaio "<lote>/plano.json"
```

Na comparação, separe os três nomes de arquivos por vírgula; também pode usar `*` no nome, conforme o
comparador existente. Os rótulos são `base` e `depois`, nesta ordem. Cada chamada compara uma única tarefa.
O modo antigo sem `--ensaio` continua disponível para outras medições e não declara aprovação de qualidade.

## Tipos de plano

| `tipo` | Tarefas | Execuções exigidas | Mínimo de testes fornecidos por execução |
|---|---|---|---|
| `ensaio-controlado-v1` | LP, API e CSV | 18: três tarefas × dois grupos × três repetições | LP: 5; API: 7; CSV: 6 |
| `ensaio-integrado-v1` | `04-catalogo-integrado` | 6: uma tarefa × dois grupos × três repetições | 54: 1 inicial + 53 de aceitação |

Planos legados sem `tipo` seguem as regras do ensaio curto; tipos desconhecidos são
reprovados. O tipo integrado não reduz as exigências dos lotes curtos nem permite
misturar tarefas, sessões ou medições dos dois protocolos.

Conclua e audite o curto antes de executar o integrado. O lote integrado local
`execucoes/integrado-2026-10-21T09-38-18-633Z/` foi concluído em26/10: seis rodadas aprovadas,54/54testes por rodada, revisão ampliada e arquitetura inspecionada.
Duas tentativas recusadas foram arquivadas integralmente, sem misturar seu consumo aos resultados válidos.
Resultado e limites no [relatório integrado](relatorio-piloto-integrado.md).
Uma pasta preparada não constitui resultado de economia ou qualidade; cada rodada exige as evidências abaixo.

## Estados

| Código do auditor | Estado | Uso |
|---|---|---|
| 0 | aprovado | Todas as execuções do tipo declarado (18 ou 6) e suas evidências passaram nas verificações automáticas |
| 2 | incompleto | Há execuções preparadas, em andamento ou aguardando revisão; comparação bloqueada |
| 1 | reprovado | Falha, interrupção, evidência inválida ou configuração incompatível; comparação bloqueada |

O comparador retorna 1 quando `--ensaio` recusa a comparação, sem imprimir percentuais.
Tentativa com HTTP 429 não é rodada válida nem medição zero. Preserve-a no lote e prepare uma nova
execução a partir da matriz, com sessão nova; nunca troque seu estado para concluída para liberar a sequência.

## O que é conferido

- Tarefas e total correspondem ao tipo declarado: 18 combinações no curto ou 6 no integrado,
  sempre dois grupos e três repetições, sem sessões ou combinações repetidas.
- Mesmo modelo principal efetivo Opus no par, ambiente registrado e matrizes iguais; origem do núcleo
  corresponde ao snapshot esperado, sem núcleos duplicados. Outros plugins precisam coincidir no par.
- Settings e todos os arquivos dos snapshots mantêm seus hashes; arquivo adicionado/removido também invalida.
  Quando há apoios explícitos, seus caminhos e versões precisam corresponder aos snapshots declarados.
- Testes e CLI com saída zero, sem teste pulado/cancelado/falho; arquivos congelados continuam intactos.
  Nas tarefas pequenas, o conjunto inclui pedido, critérios, package, testes e, quando presentes,
  `servir.mjs` e `vendas.csv`. No integrado, inclui todo o inventário da matriz exceto `auditar.mjs`
  e `src/`; somente esses caminhos podem receber a implementação.
- Revisão aprovada e sem pendências; cada critério tem um artefato local existente e não vazio.
- Medição pertence à sessão e cobre o intervalo inteiro, incluindo correções; pedido exato e horário de cada
  correção ficam registrados. Totais por modelo e por origem precisam fechar, incluindo uso de agentes.
- Caminhos de evidência e snapshots resolvem para dentro do lote, inclusive após resolver links.

O auditor é somente leitura e usa módulos nativos. Lê plano/revisões/medições UTF-8 (com ou sem BOM)
ou UTF-16LE do PowerShell 5.1. Não executa código das tarefas, comandos dos logs ou instruções das evidências.

## Registro por execução

O preparador local gera configuração, sessão, hashes, plugins e ambiente. Para concluir após a revisão,
registre `fim`, mantenha os retornos reais de CLI/testes e acrescente ao job:

| Campo | Conteúdo |
|---|---|
| `arquivoTestes` | Log final do Node com os testes fornecidos e os adicionais, se houver |
| `arquivoRevisao` | JSON de aprovação e critérios abaixo, preenchido após a inspeção |
| `arquivoMedicao` | JSON do `medir-uso` com a sessão e o intervalo exatos |
| `correcoes` | Array de `{ "pedido": "texto integral", "em": "ISO com fuso", "fim": "ISO com fuso", "codigoCLI": 0 }`; vazio se nenhuma |
| `estado` | `concluida` somente após concluir testes, revisão e medição |

Os três caminhos podem ser absolutos ou relativos à pasta de `plano.json`, sempre dentro do lote.
A revisão contém `aprovada: true`, `pendencias: []` e `criterios`. Cada critério usa
`{ "aprovado": true, "evidencia": "caminho-do-artefato" }`. Um mesmo artefato pode cobrir vários critérios.

| Tarefa | Critérios exigidos |
|---|---|
| Todas | `criteriosFixos`, `entradasInvalidas`, `dependenciasEDados` |
| LP | `visual390e1280`, `teclado`, `movimentoReduzido`, `semJavaScript` |
| API | `httpReal`, `senhaNaoPersistida` |
| CSV | `preservacaoEntradaSaida` |
| Catálogo integrado | `grafoDeterministico`, `preservacaoManifestosESaida` |

No integrado, a evidência deve conferir o grafo com oráculo independente, a ordem de
Kahn pela menor opção disponível em cada passo e a preservação dos manifestos e da
saída nas falhas. Testes de aceitação aprovados não substituem essa revisão. Limitações
do ambiente para testar links simbólicos precisam constar na evidência de preservação.

O revisor local `execucoes/revisar-integrado-controlado.mjs <plano.json>` executa os 54 testes
e casos próprios em cópia descartável dentro do lote, sem importar a implementação para o processo
do revisor. Confere hashes, grafo, erros, links reais e preservação. A pasta técnica `.temporarios`
criada pelo executor é preservada no original e excluída da cópia; não pode fornecer módulos à solução.
Na validação do revisor, a matriz sem implementação foi reprovada como esperado, sem mudanças nos
arquivos. Oracle, escopo, imports e limpeza foram exercitados separadamente; isso não é execução do modelo.
Evidência local: `execucoes/teste-revisor-integrado-u7ePHB/01-base-r1/`.
Inspeção estática é heurística, sem sandbox. Foi exercitado no Windows, incluindo quatro links/junctions;
nomes de arquivo vedados nesse sistema e execução no Linux continuam sem validação real.
Antes de fechar uma entrega integrada, leia também `auditar.mjs` e os módulos em `src/`: a separação
entre CLI, argumentos/caminhos, leitura, manifestos e grafo é parte do pedido. Os resultados funcionais
do revisor não substituem essa conferência da estrutura; registre a inspeção na evidência da rodada.

O revisor também injeta `EACCES` somente em `access`, `readdir` e `opendir` da entrada, mantendo
`stat` e `realpath` reais, além da variante com `access` permitido e apenas a listagem negada.
Confere o controle com destino válido e o caso com pai da saída ausente para cada variante:
ambos devem informar entrada inválida, porque essa precedência já pertence ao contrato. Não muda ACLs
nem comprova permissões reais do Linux; reproduz a recusa de I/O de forma portátil. A revisão ampliada
de 21/10 encontrou o defeito nas seis execuções integradas: a 5 passava com access negado,
mas também falhava quando access permitia e a listagem era negada. A correção da 1, solicitada
antes dessa distinção explícita, já passou nas duas variantes; para2–6 o pedido foi clarificado.

Opus na principal é conferido em `modeloPrincipal` capturado da inicialização real do CLI. O uso por modelo
da medição também precisa conter Opus; haver um subagente Opus não autoriza uma principal rebaixada.
O ambiente por execução registra Node, CLI, permissões e hash dos settings do ensaio.

O auditor confere término e código de saída de cada correção quando registrados, além do pedido e início;
registros legados sem esses campos continuam aceitos. A execução atual os registra sempre. O fechamento
seleciona o log da última correção pelo número; se ele estiver ausente, falha em vez de reutilizar o log inicial.

## Recuperar e corrigir uma execução

`--corrigir` aceita a entrega aguardando revisão e a que falhou nos testes de aceitação. Antes da chamada,
a revisão anterior é arquivada; uma nova revisão deve ser produzida após a correção. Uma aprovação antiga
não libera o fechamento da entrega modificada.

### Achado após um fechamento

Uma aprovação anterior não encobre defeito reproduzido depois. Para repetir somente a revisão de uma
entrega integrada, use `revisar-integrado-controlado.mjs <plano.json> --execucao N`. O revisor preserva
o JSON e o log anteriores em arquivos `revisao-arquivada-*.json/.log`; aplica o mesmo contrato e a mesma
cobertura a todos os grupos. A reprovação nova já bloqueia o auditor e a comparação.

Com reprovação comprovada, `ensaio-controlado.mjs --reabrir <plano.json> <N>` aceita somente uma rodada
concluída, sem chamada ativa, e exige revisão reprovada com evidência não vazia dentro daquela execução.
Guarda o registro, a medição e os testes anteriores em `fechamento-pre-reabertura-N.json`, registra a
reabertura e substitui o plano por arquivo temporário e rename. Falha ao gravar/confirmar mantém o plano
anterior. Não muda a sessão, o início, a implementação ou os snapshots e não chama o provedor.

Depois siga `--corrigir` na sessão original, revisão nova, inspeção e `--fechar`. A medição final cobre
as correções antigas e novas; o fechamento anterior continua disponível. Não repita a implementação
inicial nem use `--repor` para esconder defeito funcional. Os testes de reabertura conferem a preservação,
as recusas de prova inválida/externa e a falha de gravação ou confirmação, sem chamar modelo.

### Guarda de inventário nas correções

Antes de `--corrigir`, o executor confere settings, hashes e caminhos dos snapshots, além dos argumentos
de modelo, permissões, sessão e plugins. A correção retoma a mesma sessão e exige uma única inicialização
real do CLI com a mesma principal Opus e o mesmo núcleo/apoios da execução: origem inline, versão,
caminho resolvido e contagem. Uma divergência interrompe a rodada antes dos testes de liberação e recebe
motivo de inventário; ela não autoriza `--repor` como se fosse recusa por cota.
Se o provedor recusar por cota antes de emitir qualquer `init`, o erro nativo comprovado conserva o motivo
e o horário de renovação para a reposição; o inventário continua sem confirmação e a tentativa não é válida.
O reconhecimento inclui as mensagens nativas `session limit` e `weekly limit`; a mensagem semanal
recebida em21/10 alimentou um teste sintético da variante sem init. A versão anterior perdia esse motivo;
a regressão falhou antes do ajuste
e passou depois. Um init presente e divergente continua bloqueado como inventário, mesmo com texto de cota.

Cada correção nova registra `modeloPrincipal`, `plugins`, `nucleoConfirmado`, `apoiosConfirmados` e
`arquivoCLI`, além de pedido, início, término e código de saída. O auditor recalcula as conferências e lê
o `init` desse log dentro do lote para vincular modelo, plugins e sessão; flags isoladas não provam o
inventário. A presença de qualquer campo novo exige o conjunto completo. Correções legadas sem esses
cinco campos continuam aceitas pelas regras anteriores, sem preencher retroativamente evidência de
inventário que não foi capturada.

`--repor` é reservado a recusa por cota. Prepara e confere os hashes da cópia limpa antes de mover a tentativa,
preserva o registro junto dos artefatos e confirma o plano por substituição do arquivo. Se uma etapa falhar,
tenta restaurar as pastas; se a restauração também falhar, preserva os artefatos e informa o impedimento.
Caminhos resolvidos são conferidos dentro do lote antes das operações; não use um plano que aponte para
pastas externas ou links na pasta da tentativa.

Testes simulam falha de cópia, gravação do plano e confirmação final, além dos estados de correção/fechamento.
Uma regressão nativa no Windows também confirmou o caminho de sucesso, sem chamar modelo e sem tocar em
tentativas reais: `pilotos/medicoes/execucoes/regressao-repor-w0fcjA/resultado.json`.

## Limites

O ciclo de vida dos servidores dos revisores está descrito em [servidores-de-teste.md](../servidores-de-teste.md).
Os revisores encerram e aguardam apenas os processos que iniciaram, inclusive na falha da verificação.

Os testes automatizados usam dados artificiais para exercitar aprovação e recusa. Eles não são as 18
execuções reais do curto nem as seis do integrado. O auditor confere a consistência dos registros; não atesta que uma pessoa viu
uma imagem nem transforma uma afirmação em observação. Inspecione os artefatos antes de aprovar a revisão.
Cache não foi equalizado; alternância reduz efeito de ordem, mas não prova causalidade. Tokens não são preço.

Não force delegação nem acrescente conteúdo para atingir 150 mil tokens. O piloto integrado
mede a condução real da tarefa; só pode validar um alerta nesse limiar se a sessão o alcançar.

Histórico de 20/10: o primeiro lote teve uma tentativa interrompida por 429. A inicialização dessa pasta
isolada trouxe somente o núcleo, diferente da inicialização na raiz. Foi preparado outro lote com apoios
explícitos congelados por tarefa: superpowers e stack-typescript; segurança somente para API. As cópias
registradas correspondentes são desabilitadas só nos settings do lote, e os snapshots são passados por
`--plugin-dir`. Não houve instalação global. Esse lote 0.1.20 foi concluído e aprovado em 18/18.
O reensaio 0.1.21 chegou a 18/18 aprovadas em 21/10. A tentativa da 17ª rodada interrompida por cota
foi arquivada e reposta uma vez após a renovação informada para 11:20 de São Paulo.
As tentativas recusadas permanecem preservadas, com seus consumos reais fora das rodadas válidas.
O estado de cada execução e o próximo passo ficam em `continuar.md` e no plano local.
