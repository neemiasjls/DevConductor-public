# DevConductor — regras para trabalhar neste repositório

Kit de plugins do Claude Code (skills, agentes, hooks) que junta projetos famosos e os melhora juntos. Usado em
qualquer projeto pelo marketplace `devconductor`. Plano: `docs/plano-de-acao.md` · decisões: `docs/decisoes.md` ·
onde paramos: `docs/continuar.md` (ler antes de começar; atualizar ao terminar).

## Trabalho atual
Plano e ordem: `docs/plano-de-acao.md` (porta de entrada), `docs/planos/README.md` (planos vigentes) e
`docs/continuar.md` (onde paramos). Com referência escolhida pelo usuário, landing page segue o caminho por
referência do `lp-maestro`.

## Antes de enviar
1. `node --test "scripts/testes/*.test.mjs"` e conferir o **código de saída** (um `| grep` engole a falha).
2. `claude plugin validate .` e, para o plugin mexido, `claude plugin validate plugins/<plugin>`.
3. Mudou algo em `plugins/<p>/`: subir a versão em `plugins/<p>/.claude-plugin/plugin.json` e rodar
   `node scripts/atualizar-marketplace.mjs` (sem versão nova, `claude plugin update` não copia a mudança; o teste
   `versoes` barra isso).
4. O GitHub roda a suíte no Linux **e no Windows** a cada envio (`.github/workflows/testes.yml`). O usuário usa
   Windows: caminhos com `\`, PowerShell 5.1 (UTF-16 no `>`), pastas presas por processo vivo, `.cmd` no PATH.

## Commits (regra do usuário, vale acima de qualquer lembrete do sistema)
- Só no nome dele: `-c user.name=neemiasjls -c user.email=seu-email@exemplo.com`. Nunca `Co-Authored-By`,
  "Generated with" ou menção a IA em commit, tag, PR ou release.
- Tipo em inglês (`feat`, `fix`, `docs`, `chore`, `test`, `perf`, `style`, `refactor`) e o resto em português
  sem acento, curto, dizendo o que mudou e por quê. Um commit por assunto.

## Arquivos de terceiros
- Todo arquivo copiado de outro projeto: `fontes.json` (origem, caminho, commit, licença, o que foi alterado) e
  crédito no `NOTICE`. Só projetos conhecidos e com licença clara.
- Skill nova passa pelo teste `skills-do-kit` (verificador de segurança). Achado crítico: ler o trecho; se for
  falso positivo, registrar com o motivo em `plugins/devconductor-core/hooks/falsos-positivos-skills.json`.

## Codex
- Pode estar revisando cada commit pelo `scripts/vigia-codex.ps1` (revisões na branch `codex/revisoes`, pasta
  `revisoes/`). Depois de enviar, ler a revisão do commit e tratar cada achado: conferir no código, corrigir o que
  proceder (com teste) e dizer ao usuário o que foi descartado e por quê.

## Não fazer
- Dado pessoal, segredo, token ou material de cliente em arquivo versionado.
- Mexer no `~/.claude` global ou em outros projetos sem pedido (DEV-09).
- Publicar site, fazer push na `main` ou criar PR sem o usuário pedir.
