---
name: find-skills
description: Use quando o usuário perguntar "tem alguma skill para X?", "procura uma skill de X", "como faço X" (e X for algo comum que pode já existir pronto), ou quiser ampliar o que o agente sabe fazer. Procura skills prontas no ecossistema aberto (skills.sh e GitHub), confere qualidade, licença e segurança, e só instala no projeto com o OK do usuário. Também serve para garimpar skills para o próprio DevConductor (pegar partes, remodelar ou usar como base).
---

# Procurar skills (find-skills)

Baseada na `find-skills` da Vercel (`vercel-labs/skills`, MIT), adaptada às regras do DevConductor: nada global,
verificação de segurança antes de usar e plano B quando o skills.sh não responde.

## 1. Entender o pedido

Anote o domínio (React, .NET, testes, deploy, design…), a tarefa exata e se é comum o bastante para alguém já ter feito
uma skill. Antes de buscar fora, **olhe o que já está ligado**: a lista de skills da sessão e os plugins do DevConductor no
projeto (`enabledPlugins` em `.claude/settings.local.json`). Se o kit já cobre, diga qual skill usar e pare aqui.

## 2. Buscar

**Caminho normal** (CLI oficial, versão fixa para não rodar código novo sem querer):

```bash
npx skills@1.7.2 find <termos em inglês>            # ex.: react performance, playwright e2e, dotnet testing
npx skills@1.7.2 find <termos> --owner <dono>       # só de um autor (ex.: microsoft, vercel-labs, anthropics)
npx skills@1.7.2 add <dono/repo> --list             # lista as skills de um repositório sem instalar
```

Ranking por instalações: https://skills.sh/ (consulte antes da busca; fontes fortes: `anthropics/skills`,
`vercel-labs/agent-skills`, `microsoft`, `getsentry/skills`, `trailofbits/skills`, `supabase`, `cloudflare`).

**Plano B** (skills.sh fora do ar ou bloqueado, como na nuvem):
- busca na web: `"SKILL.md" <tema>`, `site:github.com claude skill <tema>`, listas `awesome-claude-skills` / `awesome-agent-skills`;
- `git clone --depth 1` do repositório numa pasta temporária, fora do projeto, e leitura das pastas com `SKILL.md`
  (só ler: não rodar script, `npm install` nem build de nada baixado).

## 3. Conferir antes de recomendar

Nunca recomende só pelo resultado da busca. Para cada candidata:
1. **Fonte e uso:** autor oficial ou conhecido; instalações (prefira 1 mil+, desconfie abaixo de 100) e estrelas do repositório.
2. **Licença** no arquivo `LICENSE` (MIT, Apache-2.0, BSD, CC0, CC-BY). Sem licença = não copiar.
3. **Conteúdo:** leia o `SKILL.md` inteiro. Raso, genérico ou "o modelo já sabe isso" = não vale o espaço no contexto.
4. **Sobreposição:** compare com o que o kit já tem. Processo e método (planejar, TDD, depurar, revisar) é só do
   superpowers (DEV-01): skill de método concorrente fica de fora.
5. **Segurança:** rode a skill `skill-scanner` na pasta da candidata e leia os achados críticos/altos antes de dizer que é segura.

## 4. Apresentar as opções

Para cada uma, em português simples: nome e o que faz, fonte e popularidade, licença, o que acrescenta ao projeto,
custo (tamanho) e o comando de instalação. Diga também a alternativa de **pegar só partes** ou usá-la como base
de uma skill própria quando só um trecho presta.

## 5. Instalar (só com OK do usuário)

Sempre no **projeto**, nunca no `~/.claude` global (DEV-09): sem `-g`.

```bash
npx skills@1.7.2 add <dono/repo> --skill <nome> -a claude-code --copy
```

- `--copy` grava os arquivos em `.claude/skills/<nome>` do projeto, sem link para outra pasta: facilita revisar e
  evita o problema de links no Windows.
- Telemetria: a CLI manda o termo buscado e o que foi instalado para o skills.sh. Para não mandar, defina antes
  `DO_NOT_TRACK=1` (PowerShell: `$env:DO_NOT_TRACK=1`).
- Depois de instalar, o hook `verificar-instalados` do núcleo roda o verificador sozinho. Se ele apontar achado,
  use a `skill-scanner` e só siga depois de analisar. A skill passa a valer na próxima sessão.

## 6. Trazer para o DevConductor (quando o pedido é melhorar o kit)

No repositório do DevConductor, não instale: **copie** a pasta para o plugin certo (stack, segurança, landing-pages ou
núcleo) e siga as regras de "Arquivos de terceiros" do `CLAUDE.md` do repositório: `fontes.json` (origem, caminho,
commit, licença, o que mudou), crédito no `NOTICE`, `LICENSE` junto, teste `skills-do-kit` e versão nova do plugin.
Ao remodelar, deixe claro no `fontes.json` o que é original e o que é do kit.

## Quando nada serve

Diga que não achou nada bom, resolva a tarefa direto e, se for algo que se repete, ofereça criar uma skill própria
do projeto.
