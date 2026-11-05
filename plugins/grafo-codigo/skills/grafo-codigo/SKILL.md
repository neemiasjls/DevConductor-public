---
name: grafo-codigo
description: Use antes de explorar código em projeto grande — achar onde algo está, quem chama uma função, o caminho entre duas partes ou o que uma mudança afeta. Consulta o grafo do Graphify (graphify-out/graph.json) pela CLI em vez de grep e leitura de muitos arquivos.
---

# Grafo do código (Graphify)

O hook deste plugin mantém `graphify-out/graph.json` atualizado a cada sessão, só com o código (AST via
tree-sitter): sem LLM e sem tokens. Uma consulta ao grafo custa poucas centenas de tokens; abrir arquivos
para descobrir a mesma coisa custa milhares.

## Quando usar

- "Onde fica / como funciona X?" → `graphify query "<pergunta>" --budget 1500`
- "O que é esta classe/função e com quem ela fala?" → `graphify explain "<Nome>"`
- "Como A chega em B?" → `graphify path "<A>" "<B>"`
- "Se eu mudar X, o que quebra?" → `graphify affected "<X>" --depth 2` (antes de refatorar ou mudar assinatura)
- Visão geral do projeto, primeira vez nele → `graphify god-nodes --top 10`; o `graphify-out/GRAPH_REPORT.md`
  só se precisar das comunidades.

Rode na raiz do projeto. Se o aviso do hook disser que a CLI está fora do PATH, troque `graphify` pelo caminho
completo que ele deu (no PowerShell, com `&` na frente). Os resultados trazem `src=<arquivo> loc=L<linha>`: abra **só** esses trechos
(Read com offset/limit), não o arquivo inteiro.

## Regras

1. Grafo primeiro, grep depois. Saída 3 = nome ambíguo (escolha um dos candidatos listados); saída 4 = nada
   encontrado → aí sim grep/Glob.
2. Comece com `--budget` baixo (1000–2000). Em projeto grande `TRUNCATED` é normal (uma pergunta ampla toca
   centenas de nós): estreite a pergunta, use `explain` num nó específico ou `--seed <arquivo ou símbolo>`
   antes de aumentar o orçamento.
3. O grafo é atualizado ao abrir a sessão, só se o código mudou, e não acompanha as edições desta sessão.
   Depois de criar, apagar ou renomear muitos arquivos, rode `graphify update .` em segundo plano (local, sem
   tokens, mas leva de segundos a 1 min em projeto grande); para o que você mesmo acabou de mudar, confie no código.
4. Arestas `INFERRED`/`AMBIGUOUS` são palpite; confirme no código antes de afirmar algo ao usuário.
5. Não rode `/graphify` completo, `graphify extract` nem `--mode deep` por conta própria: esses passam docs e
   imagens pelo LLM e gastam tokens. Só se o usuário pedir.
6. Sem `graphify-out/graph.json` ou sem a CLI: siga normalmente com grep/Glob; o hook já avisou o que falta.
