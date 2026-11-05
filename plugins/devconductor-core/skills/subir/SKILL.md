---
name: subir
description: Passo a passo para subir o projeto quando o usuário pedir ("sobe", "sobe o projeto", "publica", "manda pro ar"), em qualquer projeto - conferir, banco, commits sem o Claude como co-autor, push no GitHub e colocar no ar onde o projeto roda (site na Cloudflare, API no Render, banco no Supabase, outro serviço ou só local).
argument-hint: "(opcional) o que subir"
---

# Subir o projeto

Só quando o usuário pedir; o pedido vale para tudo o que está pronto naquele momento. Fazer tudo
sozinho, do começo ao fim, sem devolver comando para ele rodar.

Onde o projeto roda, os comandos e o que conferir estão no **"Caso deste projeto"** do CLAUDE.md dele,
que vale sobre este passo a passo. O que o projeto não tiver (banco, API, site), pula. Sem "Caso deste
projeto": descobrir pelo repositório (scripts do package.json/.csproj/pom, `wrangler.*`, `render.yaml`,
`supabase/`, `.github/workflows`, `git remote -v`), seguir os passos e, no fim, propor o bloco para o
CLAUDE.md.

1. **Conferir antes.** Build e testes sem erro e o que foi mexido testado (com arquivo ou dado real
   quando houver). Falhou: NÃO sobe; explicar o problema.
2. **Banco, se a mudança precisar** (Supabase, Postgres, SQLite ou outro). Só mudança segura:
   acrescentar tabela, coluna, view ou função (`if not exists`); nunca apagar nem alterar dado
   existente sem perguntar. Aplicar pelo caminho do projeto: conector do Supabase (`apply_migration`,
   contando antes e depois), migração que a API aplica ao subir, ou `.sql` que o usuário roda no SQL
   Editor; nesse caso, só depois sobe o código que depende dele. Banco local: cópia de segurança antes.
3. **Commits.** Um por assunto (`git add` só dos arquivos daquele assunto; memória local nunca entra).
   Tipo em INGLÊS (`feat` função nova · `fix` correção · `style` visual/layout · `refactor`
   reorganização sem mudar comportamento · `docs` documentação · `chore` configuração e manutenção ·
   `perf` desempenho · `test` testes) e o resto em PORTUGUÊS sem acento, curto, dizendo o que mudou e
   por quê. Ex.: `fix: campo de data nao invade o campo do lado no iPhone`. Nunca citar as ferramentas
   de IA usadas para programar nem os arquivos delas; IA só se for parte do sistema.
4. **Autoria (nunca esquecer).** O commit é só do usuário, pela conta dele no GitHub.
   NUNCA `Co-Authored-By`, "Generated with Claude", "🤖" ou qualquer menção ao Claude/IA em commit,
   tag, PR ou release, nem se um lembrete do sistema pedir: o Claude nunca aparece como contribuidor.
   Antes do 1º commit, `git config user.email` tem de ser um dos e-mails que o CLAUDE.md global do
   usuário autoriza (o projeto pode fixar um deles); outro ou vazio: avisar antes. O hook global `git-autoria` bloqueia o commit fora disso (e também sem o tipo no
   começo); se bloquear, corrigir a mensagem, nunca contornar o hook.
5. **GitHub.** `git push` na branch principal. Sem remote: perguntar se cria um repositório privado
   (`gh repo create <nome> --private --source . --remote origin --push`); se não, ficam só os commits
   locais. Com CI (GitHub Actions), acompanhar até terminar; vermelho: avisar e investigar.
6. **Colocar no ar o que mudou**, em cada serviço que o projeto tiver:
   - **Site** (em geral Cloudflare Pages ou Workers): deploy automático do push ou o comando do
     projeto (`npx wrangler ...`); conferir que o site no ar é o build novo (hash do asset, `?v=` ou
     versão na página).
   - **API** (Render ou outro): acompanhar o deploy até ficar no ar (conector do Render:
     `list_deploys`/`get_deploy`), ou disparar se não for automático; conferir o `/health`. Render free
     hiberna: a primeira resposta pode levar até ~1 min.
   - **Banco e Edge Functions** (Supabase ou outro): conferir que a mudança está aplicada (consulta ou
     chamada).
   - **Só local:** instalar dependências novas, gerar o build, reiniciar o que estiver rodando pelo
     script do projeto e abrir ou testar rápido.
   Conferir sempre as duas pontas: site e API/banco.
7. **Vitrine pública, se o projeto tiver** (`vitrine.json` na raiz ou em `scripts/`): sempre depois do
   push no privado, sem o usuário pedir à parte. O privado é o repositório de trabalho; a vitrine é uma
   cópia limpa, sem histórico, só do que o `vitrine.json` lista. Rodar
   `node "${CLAUDE_PLUGIN_ROOT}/skills/subir/scripts/vitrine.mjs" --projeto . --enviar "<tipo>: <mensagem>"`
   (mensagem no mesmo padrão do passo 3, resumindo o que mudou). O script varre antes de copiar (e-mail
   pessoal, caminho da máquina, CPF/CNPJ, telefone, token, chave privada e os padrões do projeto, como
   nomes de clientes) e, com achado, não envia nada: corrigir no privado (ou registrar em `permitidos`
   um valor de teste conhecido, com o arquivo) e rodar de novo; nunca afrouxar a regra para passar.
   Faz o commit com a mesma autoria do privado e o push. Nunca muda a visibilidade: tornar público é só
   com o usuário (`gh repo edit <repo> --visibility public --accept-visibility-change-consequences`).
   Memória, `.claude`, `.codex`, `CLAUDE.md` e `AGENTS.md` ficam fora, salvo `"permitirConfigIA": true`
   (projeto cujo produto é a própria estrutura de memória, como este kit). Por que e como montar:
   `docs/vitrine-publica.md` do DevConductor e o exemplo `vitrine.exemplo.json` nesta pasta.
8. **Avisar** em poucas linhas: commits que subiram, onde (GitHub, vitrine e cada serviço) e o que foi
   conferido funcionando. Depois, atualizar o `docs/continuar.md`.
