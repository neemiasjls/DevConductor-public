# Plano — Projeto como um todo (10/11/2026, versão 2)

> Estado: **proposta, aguardando aprovação do Neemias.** A prioridade é o
> [plano de design por referência](2026-11-10-design-por-referencia.md) (R0–R9); este só começa depois dele, com
> duas exceções baratas marcadas abaixo. Escrito para o Opus seguir uma parte por sessão.
> Marcas (DEV-48): `[regente]` · `[difícil]` · `[sonnet]`.

## Pontos a melhorar (conferidos em 10/11)
| # | Ponto | Evidência | Fase |
|---|---|---|---|
| 1 | Muito ferramental, nenhuma venda | 11 plugins, 34 arquivos de teste (~365 testes), 219 commits; nenhum site pago entregue; clientes pausados | G1 |
| 2 | Falta o lado da venda | há prospecção (memória PRO-01), mas não há roteiro de abordagem, proposta, preço, recebimento e entrega | G1 |
| 3 | `docs/continuar.md` grande demais | 1.174 linhas, lidas no começo de cada sessão | G2 |
| 4 | Documentos demais e roteiros antigos | 29 arquivos em `docs/` (4.162 linhas); `plano-de-acao.md` ainda fala de Paper; `CLAUDE.md` aponta para a rodada DEV-36 | G2 |
| 5 | Kit maior do que o uso | `landing-pages` com 42 skills; `stack-java` sem skill; não há medição do que é lido de fato | G3 (+R9) |
| 6 | Dois métodos disputando a abertura da sessão | o plugin de processo de terceiros exige skill para tudo; o orquestrador manda ir direto no pedido pequeno | G3 |
| 7 | Conexões mortas a cada sessão | Paper e Penpot falham ao conectar toda vez; não estão no projeto (é configuração global do usuário) | G3 |
| 8 | Gerador do público sem rede de segurança | não confere o destino antes de escrever e não volta atrás (auditoria de 06/11) | G4 |
| 9 | Provas nunca feitas | aparelho físico; fluxo com cliente novo; medição de consumo de 11–12/11; DEV-44 ainda "inferido" | G5 |
| 10 | Pendências soltas do kit | lista de candidatos no `continuar.md` (banco de fotos com 403, marca d'água, `prints.mjs`, acentos no `buscar-fotos`...) | G6 |
| 11 | Design de sistemas sem prova | `design-sistemas` existe, nunca passou por tela real avaliada | G7 |

## Fases

### G1 — Caminho da venda `[regente]` · *começa depois do R7 aprovado, junto da nova análise de clientes (V0)*
Roteiro curto, fora do kit de código: mensagem de abordagem com o rascunho, proposta de uma página, faixa de preço,
o que o cliente precisa mandar, prazo, como recebe, domínio e publicação (`lp-publicar`). Dados de cliente fora do git.
Busca de empresas com volume baixo (regras do Google).
**Pronto quando:** o primeiro cliente real recebe a proposta por esse roteiro e a resposta dele fica registrada.

### G2 — Documentação enxuta `[sonnet]` · *pode rodar a qualquer momento: é barato e barateia todas as sessões*
- `continuar.md` com no máximo ~150 linhas (estado atual, em andamento, próximo passo, falta testar, pendências).
  O resto vai para `docs/historico/<ano-mês>.md`, sem apagar nada.
- Relatórios e auditorias antigos para `docs/historico/`; aviso de "histórico" no topo dos roteiros antigos; um
  índice único dos planos vigentes (parte 1 do `2026-11-06-eficacia-e-manutencao-do-kit.md`).
- `CLAUDE.md`: trocar a seção da rodada DEV-36 por um apontador para os planos de 10/11.
**Pronto quando:** uma sessão nova entende onde paramos lendo menos de 200 linhas; nenhum link quebrado (teste).

### G3 — Kit do tamanho do uso `[difícil]`
- Fechar a medição de 11–12/11 (`scripts/medir-uso.mjs`) e listar skills e agentes sem uso.
- Travar ou retirar o que não é usado; decidir `stack-java` e consultoras repetidas (continua o R9).
- Ponto 6: uma regra só para "quando usar processo completo". Se não conciliar, propor ao Neemias desligar o plugin
  de terceiros neste projeto.
- Ponto 7: propor ao Neemias retirar as conexões mortas (configuração global: só com pedido dele, DEV-09).
**Pronto quando:** a abertura da sessão não traz aviso de conexão falha nem instrução em conflito, e cada plugin
tem uso medido ou motivo escrito para ficar.

### G4 — Gerador do público confiável `[difícil]`
Partes 1 e 2 do `2026-11-06-vitrine-confiavel.md` (conferência do destino antes de escrever; cópia preparada com
volta atrás). Partes 3 e 4 depois.
**Pronto quando:** as regressões das duas partes passam no Windows e no CI Linux.

### G5 — Provas pendentes `[regente]`
Aparelho físico (o Neemias abre o site do R7 no celular e diz se está fluido); cliente novo fica coberto pelo R7;
confirmar ou derrubar a DEV-44.

### G6 — Faxina das pendências do kit `[sonnet]`
Lista de candidatos do `continuar.md`, uma por commit, cada uma com teste.

### G7 — Design de sistemas `[regente]`
Levar o método por referência (escolher → raio-x → laço visual) para telas de sistema, com a prova de usabilidade
do `2026-11-06-qualidade-visual-com-evidencia.md` parte 5. Só depois de uma venda de landing page.

### G8 — Arquitetura e segurança de sistemas `[regente]` + `[difícil]` · *pedido do Neemias em 10/11; vem logo depois do design*
Hoje: plugin `seguranca` com 3 agentes e 1 skill de varredura; arquitetos só em `stack-dotnet` e `stack-banco`; o fluxo
de sistema do orquestrador não obriga nenhuma etapa de segurança e nada disso foi medido.
- **Portão de segurança** em `orquestrador/referencias/fluxo-sistema.md`: riscos antes de construir; `security-auditor`
  obrigatório antes do envio quando a mudança toca login, permissão, dado pessoal, segredo, envio de arquivo ou pagamento.
- **Varredura num comando** (segredos, dependências, análise do código), usando ferramentas abertas e conhecidas, com
  registro em `fontes.json` e `NOTICE`; a skill `sast-configuration` passa a apontar para ele.
- **Prova com falhas plantadas** em `pilotos/`: o kit precisa achar todas; vira teste de regressão.
- **Arquitetura:** skill de decisão escrita e de conferência antes de mudança grande; arquiteto geral para qualquer stack.
- **Sistema de Gestão:** auditoria só com relatório, pela conversa daquele projeto (DEV-09, DEV-51: kit enxuto lá).
**Pronto quando:** as falhas plantadas são todas achadas, o fluxo de sistema para sozinho no portão e o relatório do
Sistema de Gestão foi entregue ao Neemias.

## Ordem
**Design R0–R9** → **G8** (com G1 entrando no R7 e G2 quando sobrar sessão) → G3 → G4 → G5 → G6 → G7.

## O que não fazer
- Plugin, stack ou "plataforma de agentes" novos antes de uma venda.
- Refazer os sites de exemplo (DEV-41) ou retomar clientes pausados sem pedido.
- Mexer na configuração global ou em outros projetos sem pedido (DEV-09).
- Script novo de design antes da parada do R1.

## Como seguir cada parte
Ler este plano, o plano citado na parte e o `continuar.md`. Uma parte por sessão. Ao terminar: suíte com código de
saída, `claude plugin validate`, versão do plugin mexido + `node scripts/atualizar-marketplace.mjs`,
`continuar.md` atualizado. Commit e envio conforme a regra de autonomia vigente (DEV-25).
