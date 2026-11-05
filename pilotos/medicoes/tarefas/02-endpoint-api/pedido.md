Implemente um cadastro fictício em Node.js, usando somente os módulos nativos.
Trabalhe apenas nesta pasta e leia pronto-quando.md. Não instale dependências.

O endpoint POST /cadastros deve receber JSON com nome, email e senha. Remova espaços
nas pontas do nome e do email. O nome deve ter de 2 a 80 caracteres; o email deve ter
uma parte antes do @, domínio com ponto e nenhum espaço; a senha deve ter de 8 a 64
caracteres, sem remover espaços. Os três campos precisam ser strings.

Se os dados forem válidos, responda 201 com id numérico sequencial, nome e email,
sem a senha. Guarde somente id, nome e email em memória, sem banco ou arquivo.
Se os dados ou o JSON forem inválidos, responda 400 com {"erro":"Dados inválidos"}.
Outras rotas ou métodos devem responder 404 com {"erro":"Não encontrado"}.
Todas as respostas devem ser JSON. Não implemente login, envio de email ou bloqueio
de email repetido: são apenas registros fictícios nesta medição.

Mantenha a exportação criarServidor em servidor.mjs e npm start na porta 3000,
escutando apenas em 127.0.0.1. Cada novo servidor começa com id 1. Não altere
pedido.md, pronto-quando.md, package.json nem os testes fornecidos. Pode criar testes
adicionais. Rode npm test e informe o resultado e os arquivos alterados. Não faça
commit nem publique.
