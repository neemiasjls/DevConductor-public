---
name: arquitetura
description: Use antes de mudança grande em sistema (módulo novo, trocar banco ou framework, mudar como os módulos conversam, dado pessoal novo) e para registrar uma decisão técnica em linguagem simples. Ajuste pequeno dentro de um módulo vai direto, sem esta skill.
---

# Arquitetura em linguagem simples

Arquitetura aqui é só isto: **em que partes o sistema se divide, quem fala com quem e onde cada dado mora**.
Esta skill faz duas coisas: confere a divisão antes de uma mudança grande e deixa a decisão escrita para que
qualquer pessoa entenda depois, mesmo sem ser da área.

## Quando usar

| Situação | O que fazer |
|---|---|
| Módulo novo, troca de banco ou de framework, mudança em como os módulos conversam, dado pessoal novo | Conferência (seção 1) e depois decisão escrita (seção 2) |
| A escolha já passou pela conferência nesta conversa e muda a estrutura | Só a decisão escrita (seção 2) |
| A escolha foi só dita, sem conferência, e muda a estrutura | Conferência curta (seção 1) e depois a decisão escrita |
| Ajuste dentro de um módulo, tela, texto, correção de erro | Não usar: faça direto |

## 1. Conferência antes de mudança grande

Leia `referencias/conferencia.md` e siga na ordem. Em resumo:

1. **Mapa em 2 níveis, em lista** (sem diagrama): quem usa o sistema e com que sistemas de fora ele conversa;
   depois quais aplicações e bancos existem e como se falam.
2. **Sete conferências** sobre a mudança: limites entre módulos, direção das dependências, dono de cada dado,
   contrato público que muda, migração com volta, impacto no portão de segurança e custo de operar.
3. **Opções**: 2 ou 3, e a mais simples entra sempre.

Com o plugin `grafo-codigo` ligado, consulte o grafo antes de abrir arquivos. Sem ele: grep e trechos, nunca o
projeto inteiro. Trabalho de leitura grande vai ao agente `arquiteto`; quem grava a decisão é a
conversa principal.

**Regra crítica:** não propor microsserviço (sistema quebrado em vários programas separados), fila, evento ou
cache novo sem um **problema medido** que peça, ou um requisito escrito que só a peça atende (por exemplo:
não perder pedido se o programa cair). "Pode crescer um dia" não é problema medido. Peça nova é mais
uma coisa para instalar, vigiar e consertar.

## 2. Decisão escrita

Leia `referencias/modelo-decisao.md` só na hora de gravar. São 5 campos, nesta ordem, mais uma linha de
Situação no topo: **Problema**, **Opções**, **Escolha e por quê**, **Consequências** e **Como desfazer**.

- Onde grava: `docs/decisoes-tecnicas/NNN-tema.md` no projeto (NNN = próximo número, com 3 dígitos). Se o
  projeto já tem `docs/decisoes.md`, siga o formato dele e não crie a pasta.
- Uma decisão por arquivo, até uma página. Decisão que muda não é apagada: a antiga recebe
  "substituída por NNN" e a nova explica o motivo.
- Português claro. Sigla ou termo técnico só com a explicação ao lado, na primeira vez.
- Em "Consequências", diga o que muda no dia a dia de quem usa e de quem mantém o sistema.
- Sem dado pessoal, senha ou chave no arquivo.

## 3. Quem cuida do quê

- **Escopo** (o que construir): é do `superpowers:brainstorming`, quando instalado; senão, da conversa
  principal. Quando a abordagem escolhida ali muda a estrutura, a decisão é gravada por esta skill.
- **Detalhe de .NET** e **modelagem de banco**: são dos arquitetos da stack, quando instalados. Esta skill
  cuida do que fica entre módulos ou mistura stacks.
- **Segurança**: esta skill só avisa quando a mudança toca área sensível. Quem libera ou barra é o portão
  de segurança.

## 4. O que devolver ao usuário

No máximo 10 linhas, com a **recomendação primeiro** (decida por ele e diga o motivo em uma frase):

1. O que recomendo e por quê.
2. O que foi descartado e por quê, uma linha por opção.
3. O que muda no dia a dia.
4. O risco principal e como desfazer.
5. Onde a decisão ficou gravada.

Pergunte só quando a escolha depender de algo que só ele sabe (dinheiro, prazo, regra do negócio).

## Não fazer

- Diagrama, notação ou mapa além dos 2 níveis.
- Lista de padrões da moda ou opção que ninguém pediu para "ficar profissional".
- Gravar decisão sem o campo "Como desfazer".
- Mudar a estrutura no meio de outra tarefa sem passar pela conferência.
