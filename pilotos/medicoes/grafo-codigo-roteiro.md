# Medição: grafo do código (DEV-21)

Objetivo: decidir com números se o `grafo-codigo` fica no kit. Hoje ele está **em teste**.

## Preparar (uma vez)

1. Projeto grande de verdade (200+ arquivos de código; ideal .NET ou Java com várias camadas), com o
   DevAgents já instalado e `devagents-core` 0.1.8 (`claude plugin update devagents-core@devagents`).
2. `uv tool install graphifyy` (ou `pipx install graphifyy`) e `graphify --help` funcionando.
3. Abrir uma sessão no projeto e fechar: o detector instala o `grafo-codigo`. Abrir outra: o hook monta
   `graphify-out/graph.json`. Conferir que o arquivo existe.

## Tarefas (as mesmas nos dois lados)

Escolher 5 do dia a dia, de preferência que exijam achar código. Exemplos:
1. "Onde é calculado <regra de negócio>? Explique o fluxo."
2. "Quem chama <método/serviço>? O que quebra se eu mudar a assinatura dele?"
3. "Corrija <bug conhecido em um ponto que exige navegar 3+ arquivos>."
4. "Acrescente <campo> em <entidade> até a API" (atravessa camadas).
5. "Resuma a arquitetura do módulo <X>."

## Rodar

Cada tarefa em **sessão nova**, com o mesmo modelo, desfazendo as mudanças entre um lado e outro
(`git stash` ou `git checkout .`).
- **Com grafo:** como está.
- **Sem grafo:** em `.claude/settings.local.json`, `"grafo-codigo@devagents": false`; abrir sessão nova.
  (Voltar para `true` depois.)

Anotar o ID de cada sessão (aparece no `medir-uso` pela primeira pergunta) e medir:

```bash
node scripts/medir-uso.mjs "<pasta do projeto>" --sessao <ID> --json > pilotos/medicoes/grafo-<tarefa>-<com|sem>.json
```

Comparar os dois lados (o `*` funciona também no PowerShell):

```bash
node scripts/comparar-medicoes.mjs "sem=pilotos/medicoes/grafo-*-sem.json" "com=pilotos/medicoes/grafo-*-com.json"
```

## Decidir

| Resultado (soma das 5 tarefas, entrada + cache lido) | Decisão |
|---|---|
| Com grafo gasta 20%+ menos e as respostas estão iguais ou melhores | Fica como peça fixa; tirar "em teste" do DEV-21. |
| Diferença menor que 20% | Fica só por marcador (`.graphify`); subir o limite de 200 arquivos. |
| Com grafo gasta igual ou mais | Sai do kit: apagar `plugins/grafo-codigo` e o bloco do grafo no `detectar-stack.mjs`. |

Anotar também: se o agente usou mesmo a skill (procurar `graphify query/explain/affected` na sessão) e se
alguma resposta veio errada por causa do grafo.
