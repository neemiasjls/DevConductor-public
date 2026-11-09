---
name: faxina
description: Use quando o usuário pedir para limpar, organizar ou enxugar o código, ou para achar duplicação, arquivos grandes demais e trechos copiados. Só lê o projeto e imprime um relatório; a limpeza é feita em passos pequenos, um item por vez.
---

# Faxina

**Regra de ouro: a limpeza preserva EXATAMENTE o comportamento.** Só juntar código comprovadamente idêntico em efeito, conferindo cada uso (mesmas entradas, saídas, erros, textos, formatos e tipos). Nome igual ou corpo parecido não basta. Na dúvida, não mexer e só relatar. Nenhuma mudança de regra de negócio, tela, texto, banco ou API. Se não houver como conferir, o item fica de fora.

1. Rodar (só leitura, nada é gravado): `node "<pasta da skill>/scripts/faxina.mjs" [pasta do projeto] [--top N] [--json]`.
2. Mostrar ao usuário em linguagem simples: quantos arquivos grandes, quantas funções iguais, quantos blocos copiados.
3. Propor UM item pequeno por vez, começando pelo mais seguro: funções iguais (B1). Blocos copiados (C) vêm depois. "Mesmo nome, corpo diferente" (B2) pode ser coincidência: só olhar se o usuário quiser.
4. Antes de mexer, ler o código, conferir cada ponto de uso e confirmar que os trechos são mesmo iguais em efeito. Respeitar a memória e as regras do projeto.
5. Sistema em produção: propor o item e esperar o sim antes de alterar.
6. Só mexer em arquivo sem mudança em andamento (`git status`). Nunca misturar com tarefa nova.
7. Depois de cada item, rodar build e testes. Um commit por item, só quando o projeto permitir commit.
8. Dividir arquivo grande (A) só se o usuário pedir: é o item mais arriscado.

O script só lê: nunca edita o projeto analisado.
