# Sistema, API ou app

Leia apenas este fluxo quando a tarefa envolver um sistema. O processo continua sendo o superpowers;
o orquestrador escolhe modelo, especialista e contexto dentro dele.

## Entrar

- Pedido fechado: extraia comportamento, arquivos e critério verificável; execute sem repetir perguntas.
- Pedido aberto: esclareça somente o que muda a solução; aproveite decisões e autorização já existentes.
- Feature pequena: resumo curto. Vários módulos ou regra difícil: brainstorming na regente e plano pelo
  `planejador`, executado parte a parte ([agentes](agentes.md)).
- Confira instruções do projeto, estado do Git e dependências da área antes de editar.
- **Riscos antes de construir:** responda sim ou não, uma frase cada, se o pedido toca: login, permissões, dados
  pessoais (LGPD), segredos, envio de arquivo, pagamento, regras de acesso do banco. Tudo "não": siga, sem custo.
  Algum "sim": a linha entra no resumo ou no plano, com quem trata.

## Construir

Opus mantém contrato, arquitetura e decisões. Pela extensão, escolha o especialista listado no orquestrador;
mudança pequena já decidida vai ao `simple-tasks`; parte de plano, ao `executor` (opus). Haiku roda verificações
repetitivas pelo `testador`; o `revisor` confere o resultado contra o plano.
Se delegar, passe caminhos, contrato, restrições, teste de aceite e memória relevante; não cole o repositório.
Um escritor por arquivo. Não delegue uma dúvida de arquitetura como se fosse execução mecânica.

Carregue só a stack alterada. Área com "sim" na lista de riscos segue o [portão de segurança](portao-seguranca.md)
na entrega, sem trazer todas as skills de segurança em toda tarefa.

**Telas** (na principal; não cria um agente de design):
1. Toda tela de sistema passa pela `design-sistemas:ui-sistemas`, em qualquer stack e em projeto novo.
2. Antes de mostrar qualquer tela, rode a partir da pasta do projeto os dois conferidores da skill:
   `node <pasta da ui-sistemas>/scripts/consistencia.mjs src --config design-sistemas.json` e
   `node <pasta da ui-sistemas>/scripts/conferir-tela.mjs --config design-sistemas.json --base <url>`.
   Só mostre com saída 0. Saída 1: corrija e rode de novo; NÃO entregue. Saída 2 = "não conferido" (sem
   configuração, sem o plugin `landing-pages` ou sem Chrome): diga isso ao usuário; nunca chame de pronta.

## Entregar

Verifique o comportamento pelo consumidor real: contrato HTTP para API, navegação e estados para app.
Inclua erros e entradas inválidas relevantes, permissões quando houver, teste/build exigidos pelo projeto.
Com tela: anexe o resumo das duas conferências do bloco "Telas" (`consistencia.mjs` e `conferir-tela.mjs`, com a
saída de cada uma); "não conferido" aparece com essas palavras.
Alteração complexa passa pela revisão do Codex se disponível; a revisão não substitui os testes.
Corrija achados confirmados e verifique de novo o trecho afetado; documente impedimentos reais.

**Mudança sensível** (o hook do portão nega o commit e diz o nível; `hooks/mudanca-sensivel.mjs` mostra antes):
- Nível 1: a regente roda `seguranca:varredura-seguranca` e responde as perguntas da categoria no
  [portao-seguranca.md](portao-seguranca.md) ela mesma (~5 chamadas).
- Nível 2: além disso, `security-auditor` com `model: "opus"`; ficha só com os caminhos do diff, as categorias e
  o caminho do `portao-seguranca.md`, pedindo os achados em bloco JSON
  `{categoria, arquivo, linha, gravidade, estado, explicacao, correcao}`. Sem o plugin `seguranca`: `complex-tasks`
  com a mesma lista.
- Corrigido e varrido de novo, grave o marcador (`--registrar-revisao --achados <n> --quem "<quem>"`). Só achado
  confirmado alto ou crítico conta; pendente de prova vai ao usuário como "conferir". Nunca registre sem revisar.

Registre feito, pendências, falta testar e próximo passo em `docs/continuar.md`.
Concluir código não autoriza commit, push, migração remota ou publicação; execute essas ações só se pedidas.
Ao mudar de módulo ou atingir conversa longa, feche a unidade verificada e passe o estado para sessão nova.
