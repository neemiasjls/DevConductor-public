---
name: codex-parceiro
description: Use para trabalhar em conjunto com o Codex (OpenAI) na mesma máquina — segunda opinião em plano ou revisão antes de subir, tarefa independente em paralelo, ou quando o limite do Claude está perto. Chama a CLI `codex exec` / `codex review` sem trazer o raciocínio dele para o contexto.
---

# Codex como parceiro

O Codex roda pela CLI (`codex`, instalada com `npm install -g @openai/codex` e `codex login`), com o modelo
e o login do usuário. Na versão 0.163 não existe mais `codex mcp-server`: o caminho é a CLI, não MCP.
Antes do primeiro uso na sessão: `codex --version`. Sem a CLI, siga sozinho e diga ao usuário como instalar.

## Quando chamar

| Situação | Comando |
|---|---|
| Revisão antes de subir (skill `subir`) ou depois de uma mudança COMPLEXA | `codex review --uncommitted` (ou `--base <branch>`) |
| Segunda opinião num plano, diagnóstico difícil ou decisão de arquitetura | `codex exec -s read-only` com a pergunta |
| Tarefa independente que pode correr em paralelo à sua | `codex exec -s workspace-write --worktree` em segundo plano |
| Limite do Claude perto do fim | troca de turno (`docs/continuar.md` + `espelhar-codex.mjs`), não esta skill |

## Quando NÃO chamar

- Tarefa MECÂNICA ou SIMPLES: o custo de explicar ao Codex passa o da tarefa.
- Só para confirmar o óbvio ou repetir o que os testes já provam.
- Duas vezes na mesma pergunta: uma opinião basta; divergência vai para o usuário decidir.

## Como chamar (sempre assim)

1. Escreva o pedido num arquivo, não na linha de comando (acentos e aspas quebram no Windows):
   objetivo, arquivos relevantes, o que já foi decidido, o que você quer de volta e em que formato
   (ex.: "liste problemas por gravidade, com arquivo:linha; não edite nada").
2. Rode mandando o andamento para o lixo e só a resposta final para um arquivo:
   ```bash
   codex exec -s read-only --ephemeral -C "<projeto>" -o .codex/resposta.md - < .codex/pedido.md > /dev/null 2>&1
   ```
   Revisão (o `review` não tem `-o`; a resposta sai na saída padrão): `codex review --uncommitted > .codex/revisao.md 2>/dev/null`.
   Crie `.codex/` antes e confira que está no `.gitignore` ou no `.git/info/exclude` (acrescente no exclude se não estiver).
3. Leia só `.codex/resposta.md`. Avisos de OAuth de MCP do Codex (cloudflare, supabase) e "hook: Stop Failed"
   são da configuração dele e não afetam a resposta.
4. Paralelo: rode o passo 2 em segundo plano trocando `-s read-only --ephemeral` por `-s workspace-write --worktree`
   (a CLI recusa `--worktree` junto com `--ephemeral`) e siga no seu trabalho. No
   pedido, exija que ele termine dizendo a pasta do worktree e rodando os testes. Como ele não faz commit, as
   mudanças ficam só nessa pasta: revise com `git -C "<worktree>" status --short` e `git -C "<worktree>" diff`
   (arquivos novos aparecem como `??` no status; leia-os inteiros). Traga para o projeto só o que aprovar e
   confira que chegou (`git diff` no projeto). O resto é descartado: só então remova o worktree com
   `git worktree remove --force "<worktree>"` (sem `--force` o git recusa, porque as mudanças dele não têm commit). Nunca dois agentes editando a mesma pasta
   ao mesmo tempo.

## Regras

1. O Codex opina; você decide. Confira cada achado no código antes de aplicar ou de repetir ao usuário.
2. `read-only` é o padrão. Escrita só com `--worktree` e para uma tarefa combinada; nunca
   `--dangerously-bypass-approvals-and-sandbox`.
3. Nada de commit, push ou publicação pelo Codex: isso continua com a skill `subir`.
4. Conte ao usuário em uma linha o que o Codex achou e o que você fez com isso (aplicou, descartou e por quê).
