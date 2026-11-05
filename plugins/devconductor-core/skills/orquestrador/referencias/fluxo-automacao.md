# Automação ou script

Use este recorte do superpowers para automação. Pedido que define entrada, saída e regras já é um contrato:
execute sem abrir uma rodada de aprovação que o usuário já dispensou.

## Entrar

Identifique entrada, saída, erros esperados, ambiente real (Windows/Linux, shell e versão) e efeitos externos.
Leia o script existente e a regra da área; escolha o especialista pela linguagem, sem carregar a stack web inteira.
Opus decide o contrato, os riscos e o código com decisão; só mudança já decidida e conferível vai ao Sonnet; leitura ampla e execução
repetitiva podem ir aos ajudantes Haiku, desde que devolvam resumo e código de saída.

## Construir

Trabalhe com cópias descartáveis e dados fictícios nos testes. Preserve entrada e saída anterior em falha;
confira entrada/saída apontando para o mesmo arquivo quando houver gravação. Não exponha segredo no log.
Valide formatos e limites numéricos quando o contrato os exigir. Use caminhos literais e argumentos separados;
não componha comandos de shell com conteúdo vindo dos dados.

Reexecução deve respeitar o contrato: se a automação precisa ser idempotente, prove que a segunda chamada
não duplica os efeitos. Simulação é útil se já houver efeitos externos, mas não substitui a execução local real.
Agendamento e monitores só são criados quando pedidos; reaproveite instâncias existentes em vez de duplicar.

## Entregar

Rode o comando real com uma entrada válida e confira a saída, o código de saída e stderr/stdout.
Exercite erros relevantes (arquivo ausente, dado inválido, argumentos e saída preexistente), sem alterar matrizes
ou testes fornecidos. Verifique no shell do usuário quando houver dependência de plataforma.
Não considere `comando | filtro` aprovado sem conferir o código do comando que produziu a saída.

Registre os comandos e resultados essenciais e o próximo passo em `docs/continuar.md`.
Não deixe processos descartáveis de teste abertos. Serviço que o usuário pediu para persistir deve ter
identificação e forma de parada registradas. Não faça commit nem acione publicação ou envio externo sem pedido.
