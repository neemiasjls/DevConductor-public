# Critério fixo

Todos os cadastros usados nos testes são fictícios; `example.test` não é um contato real.
Requer somente Node.js 22+, sem instalação.

- `node --test inicial.test.mjs`: 1 teste passa na matriz; a fábrica cria um servidor HTTP.
- `node --test aceitacao.test.mjs`: na matriz, os 6 testes falham por receberem 501.
- `npm test`: após a tarefa, 7 testes passam, saída 0. Usa HTTP real em porta livre
  de 127.0.0.1; encerra os servidores ao final, sem depender da porta 3000.
- `node --check servidor.mjs`: saída 0.
- `npm start`: servidor disponível em http://127.0.0.1:3000; encerrar com Ctrl+C.

Contrato coberto: criação sequencial com resposta exata `{id,nome,email}`; trim de
nome/email; limites inclusivos 2–80 e 8–64; rejeição de tipos errados, campos ausentes,
email sem domínio com ponto ou com espaços e JSON quebrado; JSON em todos os erros;
404 em rota ou método não suportado. Nome é medido por `String.length`; email segue
`^[^\s@]+@[^\s@]+\.[^\s@]+$`. Não normalizar maiúsculas nem cortar senha.

Revisão fixa do código: não persistir senha, não gravar arquivos, não adicionar
dependências e manter o host local. Não há requisito de autenticação, persistência,
unicidade de email ou validação completa de endereço de email nesta tarefa.
