# Primeira base por tarefa — 20/10/2026

Três tarefas concluídas em sessões novas do Claude Code, com Opus na principal. As matrizes foram
preservadas e os testes congelados não foram editados. Uma correção no CSV foi pedida e medida na mesma sessão.

| Tarefa | Testes fornecidos | Testes adicionais | Correções da revisão | Resultado |
|---|---:|---:|---:|---|
| Seção de serviços da LP | 5/5 | — | 0 | Aprovada; quatro cenários de navegador |
| Endpoint de cadastro | 7/7 | — | 0 | Aprovada; HTTP real e inspeção do código |
| Relatório CSV | 6/6 | 10/10 | 1 | Aprovada após impedir sobrescrita da entrada |

Total final: **18 testes fornecidos +10 adicionais passaram**, sem testes pulados. O kit não foi alterado
para resolver as tarefas; as implementações ficaram em cópias locais descartáveis.

## Qualidade

- LP: 390/1280 px × normal/reduzido; uma/três colunas, conteúdo sem JS, foco de teclado, destino do link,
  entrada de 600 ms e ausência de cortes/rolagem lateral conferidos. Oito capturas (quatro páginas e quatro
  com foco); inspeção visual dos dois tamanhos/modos. Nenhuma conexão a serviço externo para renderizar a página.
- API: validações, limites, JSON inválido, respostas sem senha e 404 passaram nos testes HTTP. Inspecionado:
  apenas módulos nativos, id/nome/email em memória, nenhuma persistência de senha/arquivo. Sintaxe e início
  em 127.0.0.1:3000 conferidos; POST real respondeu 201 com id/nome/email. Servidor encerrado após a revisão.
- CSV: os seis testes fornecidos já passavam na primeira entrega, mas a revisão independente confirmou
  violação do pedido: ao usar o mesmo arquivo como entrada e saída, o CSV era substituído pelo JSON com saída 0.
  Correção pedida na mesma sessão, preservando a primeira entrega e o texto do pedido de correção no registro.
  Regressões para caminho idêntico/normalizado e link rígido passaram; teste independente confirmou recusa e
  entrada intacta. Fluxo normal manteve os totais exatos: 11 unidades e 15.000 centavos. Sem instalar dependências.

Não foram acrescentados requisitos de autenticação, banco, limite de corpo ou estilo visual ao endpoint/LP.
O achado do CSV deriva do critério original de nunca alterar a entrada. Sua correção conta no consumo final.

## Consumo observado

| Tarefa | Respostas Opus | Entrada + cache gravado | Cache lido | Saída |
|---|---:|---:|---:|---:|
| LP | 6 | 47.400 | 199.199 | 6.808 |
| API | 5 | 30.534 | 165.550 | 2.866 |
| CSV, incluindo correção | 23 | 107.830 | 1.182.087 | 18.969 |
| Total | 34 | 185.764 | 1.546.836 | 28.643 |

Medição pelo `scripts/medir-uso.mjs`, filtrada por pasta, sessão e intervalo real até a revisão final.
Uma sessão encontrada por tarefa, com mensagens/tokens não zerados. Modelo efetivo: `claude-opus-5`;
**100% na conversa principal, sem delegação nesta base**. Tokens não são preço nem medição de qualidade.

Ambiente: Node v24.19.0, Claude Code 2.1.226, Windows, modelo solicitado `opus`, permissões/configurações
herdadas. Pedidos enviados integralmente por stdin, sem instruções extras na primeira entrega. Intervalo
do lote: 11:07–11:20 BRT, incluindo execução, espera e revisão; os horários de cada primeira entrega estão
nos registros locais. Não usar esse intervalo como latência isolada do modelo.

## Controle importante: fonte e plugin instalado diferem

O registro do CLI para este projeto mostra **devagents-core 0.1.4**, enquanto o código-fonte em trabalho
está em **0.1.19**. Também registra superpowers 7.0.0, stack-typescript/seguranca 0.1.0 e grafo-codigo 0.2.4.
Nenhum plugin foi atualizado durante a rodada. Assim, esta é a primeira base do **ambiente herdado**;
não prova a execução ou a economia do novo orquestrador.

Antes do grupo "depois", confirmar qual plugin foi efetivamente carregado e ativar a versão nova somente
no ensaio/projeto, preservando configurações globais. Manter mesmos pedidos, matrizes, provedor, modelo
principal e critérios; registrar a mudança em avaliação. Repetir cada tarefa/grupo pelo menos três vezes,
alternando grupos, e controlar/registrar o estado de cache antes de concluir sobre economia.

O cache desta primeira rodada não foi equalizado entre chamadas. **Uma repetição, sem grupo depois, não
permite calcular redução percentual nem atribuir ganho à Fase D/E.** Não comparar com a medição agregada
de conversas longas: são entradas e tarefas diferentes.

## Evidências e retomada

- Resumo sem dados pessoais: `pilotos/medicoes/resumo-base-tarefas-r1-2026-10-20.json`.
- Registros, saídas, correção exata, hashes, versões instaladas, medições completas e prints ficam em
  `pilotos/medicoes/execucoes/base-r1-2026-10-20T14-07-31-691Z/` (ignorado pelo Git).
- O resumo agregado não tem o formato de entrada do comparador; usar os arquivos `*-medicao.json` locais,
  comparando a mesma tarefa e igual número de repetições. Não versionar esses históricos/caminhos pessoais.
- As duas tentativas anteriores com erro 401 são inválidas e ficaram fora dos totais. O login oficial da
  assinatura foi renovado e as chamadas reais voltaram a funcionar; não repetir o login por rotina.

Próximo: preparar a execução controlada da Fase E com o núcleo novo e medir o grupo depois, sem mudar o
modelo principal para Sonnet. Nenhum commit, push, publicação ou limpeza de instalações globais.
