# Conferência antes de mudança grande

Faça na ordem. Responda cada item em uma ou duas linhas, citando o arquivo ou a pasta que prova. Item sem
resposta vira "não sei ainda" na lista, nunca some.

## 1. Mapa em 2 níveis (em lista, sem diagrama)

A ideia vem do modelo C4 (https://c4model.com), só os dois primeiros níveis.

- **Nível 1 — de fora:** quem usa o sistema (tipos de pessoa) e com que sistemas de fora ele conversa
  (pagamento, e-mail, nota fiscal, outro sistema da empresa).
- **Nível 2 — por dentro:** quais aplicações existem (site, API, tarefa agendada, aplicativo) e quais bancos,
  e como se falam (chamada direta, HTTP, arquivo, tabela em comum).

Pare aqui. Classes, funções e notação de diagrama ficam de fora.

## 2. As sete conferências

1. **Limites entre módulos.** Quem chama quem? Há ciclo (A usa B e B usa A)? Ciclo é sinal de divisão errada:
   junte os dois ou tire para um terceiro o que os dois usam.
2. **Direção das dependências.** A regra do negócio não deve depender de tela, banco ou serviço de fora; são
   eles que dependem dela. Biblioteca nova: quem mantém, qual a licença e o que acontece se for abandonada?
3. **Dono de cada dado.** Para cada tabela ou arquivo tocado: qual módulo escreve? Só um deve escrever; os
   outros leem ou pedem ao dono. Dois escrevendo no mesmo dado é a causa mais comum de erro difícil de achar.
4. **Contrato público que muda.** Rota de API, formato de arquivo, coluna lida por outro sistema, evento:
   quem usa hoje e quebra com a mudança? Dá para manter o antigo funcionando por um tempo?
5. **Migração com volta.** A mudança no banco tem caminho de volta? Dado apagado ou convertido não volta:
   primeiro cópia, depois mudança em passos (acrescenta, copia, troca o uso e só então remove).
6. **Impacto no portão de segurança.** A mudança toca login, permissão, dado pessoal, segredo, envio de
   arquivo ou consulta ao banco? Se sim, avise: ela passa pela revisão de segurança antes do commit. Restrição do
   tipo "cada um vê só o seu" vale nas duas camadas: regra de acesso no banco e checagem do dono na rota.
7. **Custo de operar.** O que passa a ser preciso instalar, pagar, vigiar e fazer cópia de segurança? Quem
   conserta quando parar, e como essa pessoa fica sabendo que parou?

## 3. Opções

- Liste 2 ou 3. **A mais simples entra sempre** (muitas vezes: uma pasta nova no mesmo programa, uma tabela
  nova no mesmo banco).
- **Não proponha microsserviço, fila, evento ou cache novo sem um problema medido que peça**: um número de
  hoje (tempo de resposta, volume, falha que se repete), não um palpite sobre o futuro. Vale também requisito
  escrito que só a peça atende (não perder pedido se o programa cair); nesse caso, cite o requisito.
- Para cada opção, uma linha a favor e uma contra, ligadas às sete conferências.

## 4. Fechamento

- Escolha uma opção e grave a decisão pelo `modelo-decisao.md`.
- Ao usuário: até 10 linhas, com a recomendação primeiro.
- O que ficou "não sei ainda" entra em "Consequências" como risco em aberto.
