# Auditoria e plano de evolução — 06/11/2026

Estado: rodada concluída localmente, com relatório em `docs/historico/auditoria-06-11.md` e propostas em `docs/planos/`.
Sem publicação de site. Não confundir testes do kit com aprovação visual dos exemplos.

## Ordem de trabalho

1. Reproduzir a régua LP-12 atual nos três exemplos, normal/reduzido, computador/celular.
2. Corrigir defeitos verificáveis encontrados nessa passagem e testar os comportamentos afetados.
3. Auditar limites de escrita e exclusão do gerador público, usando somente repositórios descartáveis.
4. Corrigir riscos confirmados com regressões; subir versão do plugin e regenerar catálogo.
5. Consolidar achados, limitações e planos de ação para revisão posterior.

## Achados iniciais confirmados

- A régua por meia tela encontra excessos que a amostragem anterior não via. Resultados completos em
  `pilotos/testes-temporarios/densidade-06-11/`; não reduzir a régua nem inventar exceções para obter aprovação.
- `austral-frio/src/secoes/Doca.tsx`: retorno antes da criação do tween do fio torna essa animação inalcançável.
- `austral-frio/src/secoes/Porta.tsx`: instrução de descongelar aparece mesmo com movimento reduzido/sem WebGL.
- `plugins/devconductor-core/skills/subir/scripts/vitrine.mjs`: renomeação ocorre antes das exclusões obrigatórias;
  o destino não rejeita subpasta do projeto; nomes de destino não são confinados à raiz da cópia.

## Critérios de fechamento desta rodada

- Build e comportamento da Austral com troca dinâmica de movimento, sem mídia e sem WebGL.
- Evidência de todas as seis medições, incluindo reprovações e exceções ainda não implementadas.
- Regressões do gerador sem escrita em destinos inválidos nem vazamento por renomeação.
- Suíte completa com código de saída registrado; validate do catálogo e dos plugins alterados.
- Relatório e planos com prioridades, dependências e critérios objetivos, distinguindo execução de proposta.
