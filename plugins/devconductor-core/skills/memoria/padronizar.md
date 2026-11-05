# /memoria padronizar — prompt universal de reformulação da memória

Use uma vez por projeto, ou quando a memória ficar bagunçada. O projeto JÁ TEM memória (CLAUDE.md,
CLAUDE.local.md, .claude/rules, .claude/knowledge, docs/, skills e hooks próprios, memória automática
em ~/.claude/projects/<projeto>/memory, ou outro formato): trabalhe em cima dela, sem perder nada.
Não faça /compact nem /clear durante o trabalho: esta conversa pode ter conhecimento que só existe nela.

## O que já é global (não repetir no projeto)
- `~/.claude/CLAUDE.md`: roteamento de modelos e subagentes, protocolo de memória (quando gravar,
  filtro, formato, status, conflitos), compact instructions, autoria dos commits, economia de tokens.
- Skills globais: `/memoria` (retomar, salvar, revisar, padronizar) e `subir` (passo a passo do "sobe").
- Hooks globais: início de sessão (próximo passo + pendências do `docs/continuar.md`, aviso de
  manutenção, cópia diária da memória em `~/.claude/backup-memoria/`), lembrete de memória quando a
  mensagem traz regra/correção, e `git-autoria` (bloqueia commit sem o tipo `feat:`/`fix:`...,
  Co-Authored-By ou menção ao Claude, e e-mail de autor errado).

## Etapa 1 · Diagnóstico (não mude nada ainda)
1. Liste os arquivos de memória com o tamanho (linhas e ≈ tokens = bytes/4). Separe os que entram em
   TODA conversa (CLAUDE.md da raiz, CLAUDE.local.md, .claude/CLAUDE.md, MEMORY.md da memória
   automática, regras sem `paths:`) dos que carregam só quando o assunto aparece.
2. Entenda o projeto o bastante para ver os domínios reais (módulos, telas, integrações, rotinas), sem
   ler o repositório inteiro: estrutura de pastas, README e os arquivos que a memória cita.
3. Aponte:
   - o que já é global e está repetido aqui: protocolo de memória, roteamento, passo a passo genérico
     do publicar, autoria, compact instructions, skills e hooks de memória do projeto;
   - detalhe de regra de negócio no CLAUDE.md da raiz (vai para o arquivo do assunto);
   - duplicatas, contradições e regra que já virou código (fica 1–2 linhas + nome do arquivo);
   - pendência resolvida, log, número de importação, tarefa antiga, cronologia;
   - arquivo acima do limite (CLAUDE.md ~120 linhas; regra ~150);
   - memória fora do .gitignore, segredo com valor, dado pessoal ou menção a Claude/IA em arquivo
     versionado;
   - o que existe SÓ nesta conversa ou SÓ no código e merece virar memória (regra de negócio,
     exceção, decisão e o porquê, convenção, integração, limitação, glossário), com status honesto:
     lido no código é "inferido", nunca "confirmado".
4. Mostre o plano: o que muda, para onde vai cada coisa e quantos tokens fixos (por conversa) e
   totais vai economizar. **Espere eu aprovar.**

## Etapa 2 · Reorganizar (depois que eu aprovar)
1. **Cópia de segurança** de tudo o que vai mudar em `.claude/backup-memoria-AAAA-MM-DD/` (ignorado
   pelo git).
2. **CLAUDE.md da raiz** (até ~120 linhas): o que é o projeto, onde roda, como rodar e testar,
   invariantes que não se negociam, o bloco **"Caso deste projeto"** do sobe (onde roda cada parte:
   site/Cloudflare, API/Render, banco/Supabase, outro serviço ou só local; comandos de build e teste;
   como colocar no ar e o que conferir; e-mail de autoria, se o projeto fixa um) e o **ÍNDICE**:
   tabela assunto → arquivo → quando ler. Uma linha: "Protocolo de memória, roteamento e passo a
   passo do sobe: globais (~/.claude)".
3. **Regras por assunto** em `.claude/rules/<assunto>.md` com `paths:` no topo (carregam sozinhas
   quando um arquivo daquele assunto é aberto); até ~150 linhas cada; passou, dividir por subtema.
   Se o projeto já usa outra pasta por decisão minha (docs/memoria, docs/knowledge, .claude/knowledge),
   mantenha a pasta e garanta o índice e regras curtas com `paths:` apontando para ela.
4. **Contexto** (pessoas, clientes, rotina, glossário) em `docs/contexto/` ou na pasta que já existir.
   **Pendências** num arquivo só, com ID, os dois lados e a pergunta. Ambos lidos só quando a tarefa
   precisar.
5. **`docs/continuar.md`** (até ~25 linhas), com as seções `## Feito por último`, `## Em andamento`,
   `## Próximo passo`, `## Falta testar` e `## Pendências abertas` (uma linha citando o arquivo, ex.:
   "ver docs/pendencias.md"), mais as linhas `Último salvamento:` e `Última revisão:`. O hook de início
   de sessão lê este arquivo. Tarefa em andamento que estiver em outro arquivo vem para cá.
6. **Memória automática** (MEMORY.md): só o que é desta máquina; o resto vai para o projeto, deixando
   um ponteiro. Se o projeto guarda a memória toda lá por decisão (ex.: repositório de grupo), manter
   e pôr o continuar.md na mesma pasta.
7. **Entradas:** `### PREFIXO-nn · título` / Status / Código / regra em 1–4 linhas / Por quê / Ver.
   Etiquetas que o projeto já usa podem ficar (documentadas no índice); não reescrever tudo só para
   trocar etiqueta.
8. **Nunca apagar regra confirmada:** juntar, resumir ou mover. Regra que já está no código: 1–2
   linhas + nome do arquivo. Pendência resolvida: uma linha de estado atual no assunto e sai das
   pendências. Histórico ("Antes:") só quando o motivo evita repetir erro ou explica dado antigo.
9. **Tirar do projeto o que agora é global:** protocolo de memória, roteamento, passo a passo
   genérico do publicar e da autoria, compact instructions, e as skills/hooks de memória duplicados
   (mover para o backup e tirar do `.claude/settings.json`). As particularidades viram uma linha no
   CLAUDE.md do projeto (verificador da memória, padrões de segredo a procurar, camada pública ×
   privada, git próprio da memória, limites mais rígidos).
10. **Git:** CLAUDE.md, CLAUDE.local.md, `.claude/` de memória, `docs/continuar.md`, pendências e
    backups ficam fora do GitHub (`.gitignore` ou `.git/info/exclude`). Se algo já está versionado,
    avisar e perguntar antes de tirar do git. Docs públicos de engenharia que o projeto versiona por
    decisão continuam versionados, sem dado pessoal e sem menção a Claude/IA.
11. Nada de senha, token ou chave: só o nome da variável e onde fica configurada.

## Etapa 3 · Conferir e relatar
1. Conferir: o índice aponta só para arquivos que existem; os `paths:` casam com arquivos reais;
   `git status` não mostra memória para commitar; nenhum segredo com valor; o hook de início de
   sessão mostra o próximo passo e as pendências.
2. Relatório em até 15 linhas: tokens fixos por conversa e total, antes × depois; arquivos criados,
   juntados e movidos; onde foi parar cada regra que mudou de lugar (nada perdido); e o que precisa
   da minha decisão.
