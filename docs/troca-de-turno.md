# Troca de turno: Claude → Codex → Claude

Quando o limite do Claude acaba, o Codex continua o trabalho a partir dos mesmos arquivos. Os dois nunca
trabalham no mesmo projeto ao mesmo tempo.

## Preparar (uma vez, e de novo quando as regras globais mudarem)
```bash
node scripts/espelhar-codex.mjs
```
- `~/.codex/AGENTS.md` vira espelho do `~/.claude/CLAUDE.md`, com um aviso de troca de turno no topo.
- O Codex passa a ler o `CLAUDE.md` de cada projeto (`project_doc_fallback_filenames` no `config.toml`;
  o original fica em `config.toml.bak-devagents`).
- As skills `memoria` e `subir` são copiadas para o Codex.

## Conferir o que o Codex recebe (sem gastar cota)
Na pasta do projeto, rode o `codex.exe` do app (fica em `%LOCALAPPDATA%\OpenAI\Codex\bin\<versão>\`):
```bash
codex debug prompt-input "teste"
```
A saída mostra as instruções que o modelo recebe: procure o aviso de troca de turno, o começo do
`CLAUDE.md` do projeto e as skills `memoria` e `subir`. Se o projeto tiver um `AGENTS.md` próprio, o
Codex segue esse arquivo no lugar do `CLAUDE.md`.

## Quando o limite do Claude estiver acabando
Abrir o Codex é com você (quando o limite acaba, o Claude para); o resto é automático.
1. Se der tempo, no Claude: `/memoria salvar`. Se o limite cortar antes, tudo bem: o Codex confere o
   `git status` para achar o que ficou sem anotar.
2. Abra o Codex na **mesma pasta do projeto** e escreva só **"continue"**. Ele lê o `docs/continuar.md`,
   diz onde o trabalho parou e segue o próximo passo, com as mesmas regras (commits sem coautor, memória,
   subir). Jeitos de abrir:
   - no app do Codex (recomendado);
   - ou sem sair do app do Claude: na aba Terminal (PowerShell, já na pasta do projeto), rode
     ```powershell
     & (Get-ChildItem "$env:LOCALAPPDATA\OpenAI\Codex\bin\*\codex.exe" | Sort-Object LastWriteTime | Select-Object -Last 1).FullName
     ```
3. Ao parar, o Codex atualiza o `docs/continuar.md` e deixa no topo `> Último turno: Codex (data)`.

**Longe do computador (pelo celular):**
- Enquanto o Claude tem limite, ele pode servir de ponte: você pede pelo chat e ele roda
  `codex exec "<pedido>"` na pasta do projeto e traz a resposta (cada chamada relê as regras: ~20 mil tokens do Codex).
- Quando o limite do Claude acaba, o chat para. Aí só o controle remoto do próprio Codex (ligado e pareado
  no app do Codex, no PC, com a mesma conta do celular) ou o Codex na nuvem (trabalha no repositório do
  GitHub, sem os arquivos que ficam só no PC, como o `continuar.md`).

## Quando o limite do Claude voltar
Abra uma sessão nova do Claude no projeto (ou `/clear`). Ao ver a marca do Codex, o Claude retoma sozinho:
lê o `continuar.md`, confere o que mudou, conta o que foi feito e troca a marca para `Claude`. Não precisa
de `/memoria retomar`. (Funciona nos projetos com o DevAgents ligado; nos outros, use `/memoria retomar`.)

## O que o Codex não tem
- Os agentes especialistas e o roteamento de modelo do DevAgents (são do Claude Code): ele faz o trabalho
  direto, com o modelo dele.
- Os plugins do DevAgents (superpowers, stacks, landing-pages). O superpowers existe no marketplace do Codex,
  se quiser ligar lá também.

## Revisão pelo Codex (opcional)
O plugin oficial `openai/codex-plugin-cc` deixa o Claude pedir uma revisão ao Codex no fim de uma tarefa.
Não está ligado; a troca de turno funciona sem ele.
