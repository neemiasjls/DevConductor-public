# Sistema, API ou app

Leia apenas este fluxo quando a tarefa envolver um sistema. O processo continua sendo o superpowers;
o orquestrador escolhe modelo, especialista e contexto dentro dele.

## Entrar

- Pedido fechado: extraia comportamento, arquivos e critério verificável; execute sem repetir perguntas.
- Pedido aberto: esclareça somente o que muda a solução; aproveite decisões e autorização já existentes.
- Feature pequena: resumo curto. Vários módulos ou regra difícil: brainstorming na regente e plano pelo
  `planejador`, executado parte a parte ([agentes](agentes.md)).
- Confira instruções do projeto, estado do Git e dependências da área antes de editar.

## Construir

Opus mantém contrato, arquitetura e decisões. Pela extensão, escolha o especialista listado no orquestrador;
mudança pequena já decidida vai ao `simple-tasks`; parte de plano, ao `executor` (opus). Haiku roda verificações
repetitivas pelo `testador`; o `revisor` confere o resultado contra o plano.
Se delegar, passe caminhos, contrato, restrições, teste de aceite e memória relevante; não cole o repositório.
Um escritor por arquivo. Não delegue uma dúvida de arquitetura como se fosse execução mecânica.

Carregue só a stack alterada. Banco, autenticação, autorização e segredos exigem as regras específicas
da área no momento da mudança, sem trazer todas as skills de segurança em toda tarefa.
Interface usa as skills visuais na principal; não cria um agente de design.

## Entregar

Verifique o comportamento pelo consumidor real: contrato HTTP para API, navegação e estados para app.
Inclua erros e entradas inválidas relevantes, permissões quando houver, teste/build exigidos pelo projeto.
Alteração complexa passa pela revisão do Codex se disponível; a revisão não substitui os testes.
Corrija achados confirmados e verifique de novo o trecho afetado; documente impedimentos reais.

Registre feito, pendências, falta testar e próximo passo em `docs/continuar.md`.
Concluir código não autoriza commit, push, migração remota ou publicação; execute essas ações só se pedidas.
Ao mudar de módulo ou atingir conversa longa, feche a unidade verificada e passe o estado para sessão nova.
