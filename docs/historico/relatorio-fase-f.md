# Fase F — fluxos por tipo de projeto

Implementação local em 20/10/2026, núcleo 0.1.20, sem commit ou publicação.

O orquestrador agora encaminha para três referências, consultadas individualmente conforme a tarefa:

| Tipo | Entrada e condução | Evidência para entregar |
|---|---|---|
| Sistema/API/app | Contrato e stack; processo existente do superpowers | Testes/build e comportamento pelo consumidor real, erros e permissões pertinentes |
| Landing page | Plano e direção existentes; `landing-pages:lp-maestro` conduz | Navegador em computador/celular, teclado, foco, movimento reduzido e inspeção visual |
| Automação/script | Entrada, saída, erros, shell e efeitos externos | Comando real, códigos de saída, preservação de dados e reexecução quando exigida |

As referências ficam em `plugins/devagents-core/skills/orquestrador/referencias/fluxo-*.md`.
São recortes do processo atual: não criam outro método, agente de design ou carga antecipada de todas as skills.
Pedido fechado e autorização já dada dispensam nova aprovação; direção permanece na principal Opus.
Delegação é para execução isolada ou verificação, com contrato e contexto curtos. Cada fluxo inclui passagem
de turno e os limites de ações externas, commit e publicação.

Validação: 119 testes aprovados, dois pulados por plataforma, zero falhas; validadores do marketplace e núcleo
aprovados; auditor de referências com 11 plugins e zero pendências; matriz de 62 skills sem problemas.
O orquestrador permanece dentro do limite de 7.000 bytes e o lembrete de sessão não mudou.

Atualização de 21/10: o núcleo leve 0.1.21 concluiu 18/18 rodadas curtas com entrega, revisão independente
e medição reais nos três tipos de tarefa. As seis APIs e seis páginas passaram na primeira entrega;
os seis CSVs receberam a mesma correção na sessão original. O resultado de consumo foi misto,
sem conclusão de economia geral ([relatório](relatorio-ensaio-controlado.md)).

Limite da entrega: as tarefas curtas não chamaram a skill orquestradora nem agentes; comprovam as entregas
controladas, sem demonstrar a condução completa pelas três referências. O piloto integrado e a consolidação
G/H foram concluídos em 26/10 no escopo controlado: [relatório integrado](relatorio-piloto-integrado.md). Testes do kit e exercícios com dados fictícios
não constituem aprovação de projetos reais, validação de delegação ou evidência de economia financeira.
