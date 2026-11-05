# Origem das skills deste plugin

`ui-sistemas` é própria (inclui `modelos/br.ts`, testado em `scripts/testes/padroes-br.test.mjs`). As consultoras
abaixo foram copiadas em 04/11/2026, com a trava `disable-model-invocation: true` no cabeçalho e a LICENSE do
repositório na pasta de cada uma. Quem decide é a `ui-sistemas`; elas só são lidas na etapa indicada nela.

| Skill | Origem (commit) | Licença | O que mudou na cópia |
|---|---|---|---|
| dashboard-design | abdiraimov-otabek/dashboard-design-skill (b813324) | MIT | sem SwiftUI (`references/swiftui.md` e menções); sem a seção "Sign-off" (links promocionais) |
| baseline-ui, fixing-accessibility | ibelick/ui-skills (73fb128) | MIT | só a trava |
| improve-ui | ibelick/ui-skills (73fb128) | MIT | sem `agents/openai.yaml` (configuração do Codex) |
| create-design-md | ibelick/ui-skills (73fb128) | MIT | comandos `npx -y -p @google/design.md designmd ...` (o nome `design.md` não roda no Windows) |

Avaliada e não copiada: Dammyjay93/interface-design (MIT; longa e sobreposta à `ui-sistemas` e à `baseline-ui`).
Ao atualizar uma consultora: baixar o original numa pasta separada, ler o SKILL.md novo, copiar, reaplicar a
trava e as mudanças da tabela e rodar `node --test scripts/testes/skills-do-kit.test.mjs`.
