# Qualidade visual com evidência — plano para revisão

Estado: proposta baseada nas seis medições de 06/11. Não refazer os exemplos nem retirar cenas por quota técnica.

## Objetivo e premissas

Fechar as lacunas da régua de clareza e fazer cada evidência apontar para a versão realmente medida.
Limites atuais: 60 palavras/computador, 45/celular; amostragem a cada meia tela; leitura e exceção são explícitas.
Versão reduzida mantém todo o conteúdo e permite leitura normal. Não escondê-lo para reduzir a contagem.

## 1. Fechar a matriz real dos exemplos [regente]

**Atualização 06/11:** executada localmente; seis relatórios esquema 2 com saída 0. Uma exceção localizada
na entrada da Viagem, já documentada em 05/11; listas completas tratadas como leitura apenas no reduzido.
Resultados e limites em `docs/auditoria-06-11.md`. Avaliação visual e teste físico continuam separados.

**Arquivos:** planos e componentes pontuais dos três sites em `pilotos/prova-design/rodada-claude/`;
`docs/auditoria-design-clareza.md`.
**Regra:** inspecionar cada captura acima do limite, identificar texto sobreposto entre seções e texto que exige
leitura. Separar defeito visual de densidade justificada. Registrar exceções já decididas no elemento exato,
sem marcar a página inteira como leitura. A exceção da Austral na entrada da Viagem e as listas completas
no reduzido estão nos planos; excessos novos precisam de decisão própria, não herdam esse motivo.
**Pronto quando:** seis relatórios novos preservados, sem alerta sem decisão; tabela distingue maior contagem,
exceções e aprovação. Não atribuir uma melhoria à animação se a mudança foi só a classificação da medição.
**Teste:** `densidade.mjs` normal e `--reduzido`, a partir de build novo, e comportamento do site alterado.
**Depende de:** nenhuma.

## 2. Exceção realmente localizada [difícil]

**Atualização 06/11:** implementada no landing-pages 0.3.15, com relatório esquema 2 e teste de texto
sem exceção acima do limite. Mantida abaixo a especificação para revisão; não executar novamente.

**Arquivos:** `plugins/landing-pages/skills/lp-revisao/scripts/densidade-regras.mjs`, `densidade.mjs`,
`scripts/testes/densidade.test.mjs` e regras de revisão.
**Risco confirmado pelo código:** hoje qualquer trecho com motivo na tela faz a tela inteira entrar em
`justificadas`; texto adicional sem exceção pode passar junto. Não é prova de que os sites exploram isso.
**Regra proposta:** contar também palavras cobertas pela exceção. Se o texto sem exceção exceder o limite,
a tela continua reprovada mesmo tendo uma palavra justificada. Exibir as duas contagens e todos os motivos.
Não quebrar silenciosamente relatórios antigos; identificar a versão do esquema.
**Pronto quando:** uma palavra justificada não aprova cem palavras sem justificativa.
**Teste:** mistura de trechos, exceção vazia, vários motivos, leitura, limite exato e compatibilidade do relatório.
**Depende de:** alinhar o contrato da régua; pode ser implementada antes de 1, desde que a tabela identifique a versão.

## 3. Amostragem e fidelidade de leitura [difícil]

**Regra:** criar páginas de fixture com textos parcialmente cobertos, linha longa, sticky, menu fixo, opacidade,
texto acessível fora da tela, zoom de fonte e mudança dinâmica de preferência. Medir falsos positivos e negativos
do atual centro do retângulo antes de substituí-lo. Acrescentar posições críticas das cenas, além da meia tela.
Não chamar essa contagem de avaliação estética ou compreensão humana.
**Pronto quando:** fixtures documentam o que conta e o que não conta, com resultados determinísticos.
**Testes:** navegador em 390/1440 e pelo menos um tamanho intermediário; repetir fixture fria e quente.
**Depende de:** 2.

## 4. Manifesto único de evidências [sonnet]

**Arquivos:** ferramentas de densidade, revisão, gravação e medição; schema/testes compartilhados em `scripts/`.
**Regra:** cada rodada registra hash do build, estado sujo/limpo, versão da ferramenta, navegador, viewport,
preferência de movimento, URL local, data e códigos de saída. Vitrine só referencia evidência existente.
Não expor caminho da máquina, tokens ou perfil de navegador. Dado ausente aparece como não medido.
**Pronto quando:** relatório de build antigo é detectado ao tentar apresentá-lo como validação do atual.
**Teste:** fixture de build alterado, JSON incompleto, vídeo ausente, links relativos e relatório antigo.
**Depende de:** 1–3 para adotar o contrato; iniciar somente por densidade e ampliar depois.

## 5. Prova de design de sistemas [regente]

**Objetivo:** testar `ui-sistemas` com usuários executando tarefas, além de conferir o texto da skill.
**Escopo:** protótipo local fictício de agenda com lista, filtro, detalhe, edição e estados vazio/erro/carregando.
Sem banco, login, serviço pago ou dados reais nesta primeira prova.
**Tarefas:** achar um horário com filtro; comparar duas entradas no celular; corrigir e salvar um cadastro só
com teclado. Registrar passos, erro, recuperação, foco e conclusão, sem redefinir a tarefa depois do teste.
**Pronto quando:** cada tarefa tem limite previamente definido, resultado observado e evidência de recuperação;
acessibilidade automatizada complementa, não substitui teclado e leitura.
**Depende de:** plano próprio com os limites das três tarefas antes de construir.

## Entrega

Separar aprovação técnica, avaliação visual do usuário e teste físico. Não atualizar vídeos ou notas de
Lighthouse como se fossem atuais sem reexecutar essas ferramentas na versão final.
