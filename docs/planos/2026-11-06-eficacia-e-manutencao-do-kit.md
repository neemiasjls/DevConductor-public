# Eficácia e manutenção do kit — plano para revisão

Estado: proposta. As medições semanais existentes continuam agendadas nos documentos para 11–12/11;
não antecipar uma conclusão de economia usando só um dia de uso.

## Objetivo

Transformar as promessas de economia, roteamento e instalação em resultados verificáveis, mantendo
o kit pequeno. Não criar outro orquestrador, plataforma de agentes ou painel antes de provar necessidade.

## 1. Documentação atual sem apagar o histórico [sonnet]

**Arquivos:** `docs/plano-de-acao.md`, `docs/plano-design.md`, `docs/auditoria-design-clareza.md`, README.
**Evidência:** o plano original ainda descreve Paper e nomes antigos; a auditoria termina com etapas que o
topo de `continuar.md` já registra como feitas. `continuar.md` é passagem privada, não a documentação pública.
**Regra:** colocar no topo de cada plano um estado atual curto e links para as decisões vigentes; marcar o
roteiro anterior como histórico. Documentação pública não pode depender do arquivo privado para entender o produto.
Não substituir as decisões antigas por regras novas inventadas.
**Pronto quando:** instalar e entender o fluxo atual exige apenas README + documento vigente; links locais existem.
**Teste:** verificador de links em Markdown com tratamento de âncoras e exclusão explícita de exemplos de caminhos.
**Depende de:** nenhuma; atualizar só o estado conhecido, sem reescrever decisões.

## 2. Ensaio de delegação com qualidade [difícil]

**Arquivos:** `scripts/medir-uso.mjs`, ferramentas de ensaio já existentes e relatório novo.
**Regra:** escolher tarefas independentes e equivalentes (pequena, módulo e investigação). Fixar critérios de
qualidade antes; alternar a ordem das condições; registrar cache, versões, recusas e tentativas, sem excluí-las
para melhorar o resultado. Comparar tokens de entrada/saída, cache, tempo, retrabalho e aprovação do resultado.
Separar custo observado de causalidade. Definir orçamento de execução antes de chamar modelos pagos.
**Pronto quando:** tarefas grandes demonstram delegação real, com evidência de chamadas e qualidade; tarefa
pequena direta continua disponível. Resultado negativo é aceito e vira ajuste, não descarte da amostra.
**Teste:** auditor de sessões existente, validação de deduplicação e análise por tarefa, não só total agregado.
**Depende de:** janela semanal completa e decisão de orçamento para ensaio novo.

## 3. Limites dos agentes observáveis [difícil]

**Arquivos:** `hooks/agente-longo.mjs`, `hooks/conversa-longa.mjs`, agentes e testes correspondentes.
**Evidência:** `agente-longo` conta ferramentas e emite lembrete; isso não prova encerramento do agente ou
economia de contexto. A política não deve ser apresentada como bloqueio rígido.
**Regra:** medir respeito ao lembrete em tarefas reais; contadores com expiração e escrita segura para eventos
concorrentes; relatório agregado sem transcrições/segredos. Não interromper uma escrita de arquivo no meio.
**Pronto quando:** saber quantos agentes excederam o limite, quais entregaram resultado útil e quanto custou
retomar; comportamento sob eventos duplicados e encerramento abrupto definido.
**Teste:** concorrência, estado corrompido, sessão ausente, agentes distintos e limpeza de estado expirado.
**Depende de:** 2 para justificar tornar a política mais rígida.

## 4. Instalação pública reproduzível [difícil]

**Arquivos:** instalador, verificador de instalados, workflow e testes de instalação.
**Regra:** ensaiar o artefato público em HOME/config temporários, sem tocar no usuário real; instalar, atualizar,
desativar e repetir. Fixar a versão da CLI no ensaio reproduzível e reservar um job separado para detectar
incompatibilidade com a versão mais nova. Não instalar binário desconhecido só porque apareceu numa busca.
**Pronto quando:** Windows e Linux passam a mesma sequência, catálogo e plugins instalados têm hashes/versões
coerentes, configuração global da máquina de teste permanece inalterada.
**Teste:** scripts de instalação isolada existentes e um cenário a partir da cópia pública sanitizada.
**Depende de:** plano de vitrine confiável, parte 4.

## 5. Sustentabilidade das dependências [sonnet]

**Arquivos:** `fontes.json`, `NOTICE`, comparador de origem, workflow e documentação de atualização.
**Regra:** relatório somente leitura de versões e licenças divergentes; separar atualização disponível de
vulnerabilidade confirmada. Atualização em branch/parte isolada, com teste e rollback, nunca reimportar tudo
automaticamente. Toda fonte nova continua exigindo licença e análise de segurança.
**Pronto quando:** cada divergência tem origem, impacto, responsável e comando de validação; nenhuma mudança
de terceiros é aplicada só para deixar um contador verde.
**Teste:** fixtures de arquivo removido, licença alterada e fonte sem metadados.
**Depende de:** nenhuma para inventário; execução depende da análise de cada divergência.

## Ordem recomendada

Documentação vigente → instalação a partir do público → janela semanal e ensaio controlado → ajuste dos
limites dos agentes. Inventário de dependências pode ocorrer em paralelo, sem atualizar automaticamente.
