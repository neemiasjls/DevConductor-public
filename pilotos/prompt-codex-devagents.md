# Turno do Codex: continuar o DevAgents + revisão geral

Pasta: `C:\Users\<usuario>\Desktop\PROJETOS\DevAgents`. O Neemias está dormindo e autorizou continuar o projeto
inteiro ("continue todo o projeto e tudo mais"). Trabalhe sozinho, sem perguntar.

O Claude está fazendo, ao mesmo tempo, o site em `pilotos/cliente-salao (repositório privado)`: **não abra nem altere nada
nessa pasta** (outro Codex cuida dela depois). Também não edite `docs/continuar.md` até o fim do seu turno.

## 1. Revisão geral (primeiro)
- Leia `CLAUDE.md`, `docs/continuar.md`, `docs/plano-de-acao.md`, `docs/plano-design.md` e o `README.md`.
- Rode `node --test scripts/testes/*.test.mjs` e `claude plugin validate .` (e em cada plugin alterado).
- Procure erros reais: links quebrados nas skills, caminhos errados, skill citada que não existe mais
  (ex.: `seo-local`/`seo-schema` foram trocadas pela `lp-seo`), versões de plugin × marketplace diferentes,
  scripts sem tratamento de erro, textos contraditórios entre skills e regras. Corrija o que for erro claro;
  o que for decisão, anote como pendência.

## 2. Continuar o plano de design (`docs/plano-design.md`, aprovado pelo Neemias em 16/10)
- **D1 — Estúdio de movimento:** formato padrão de estudo de movimento (página isolada React + GSAP com
  marcações para teste), gravação em vídeo (`lp-referencias/scripts/gravar-rolagem.mjs`) e vitrine
  (`montar-galeria.mjs`). Faça 3 estudos de teste em `pilotos/estudios/` (ex.: título que se monta letra a
  letra, foto que se abre com a rolagem, seção que desliza para o lado presa) e a vitrine com eles.
- **D2 — biblioteca:** se der tempo, mais estudos das famílias da D2, cada um testado no computador, celular
  e movimento reduzido, e registrado como receita em `plugins/landing-pages/skills/lp-cenas/receitas/`.
- Se `pilotos/cliente-salao (repositório privado)/RELATORIO.md` já existir quando chegar aqui, use o aprendizado dele (só leitura).

## Regras (do CLAUDE.md, valem para você também)
- Não commitar, não fazer push, não publicar. Não mexer na configuração global nem no projeto LandingPages.
- Plugin alterado: subir a `version` no `plugin.json` e rodar `node scripts/atualizar-marketplace.mjs`.
- Skill copiada de fora: só projeto famoso, licença conferida, crédito no `FONTES.md`.
- Nada de dado pessoal em arquivo versionado. Português do Brasil.
- No fim: atualize `docs/continuar.md` (feito, falta, pendências) com a marca `> Último turno: Codex (data hora)`.
