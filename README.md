# DevConductor

[![testes](https://github.com/neemiasjls/DevConductor-public/actions/workflows/testes.yml/badge.svg)](https://github.com/neemiasjls/DevConductor-public/actions/workflows/testes.yml)

Kit de plugins para o [Claude Code](https://docs.claude.com/en/docs/claude-code) que organiza o trabalho de
desenvolvimento com agentes de IA: **quem faz cada tarefa, com qual modelo e com quais instruções**. Junta
projetos abertos conhecidos (skills e agentes da comunidade) com uma camada própria de roteamento, memória,
medição de custo e segurança, e testa tudo isso no Linux e no Windows a cada envio.

> Projeto pessoal de estudo, usado no dia a dia nos meus próprios projetos. Os pilotos com material de
> clientes ficam fora deste repositório; os exemplos em `pilotos/` são fictícios.

Guia completo (fluxo, mapas e detalhes de cada peça): [docs/guia-completo.md](docs/guia-completo.md).

## O que ele demonstra

| Tema | Como aparece no código |
|---|---|
| **Agentes por função com roteamento de modelo** | 10 agentes em `plugins/devconductor-core/agents/`, cada um com modelo e esforço próprios: quem planeja, executa, revisa e decide a estrutura usa o Opus; pesquisa e mudanças já decididas usam o Sonnet; trabalho mecânico (buscar, rodar build, conferir deploy, testar no navegador) usa o Haiku. A skill `orquestrador` classifica o pedido (mecânico, já decidido ou com decisão) e escolhe o agente. |
| **Contexto sob medida** | O hook `detectar-stack.mjs` lê os arquivos do projeto (`.csproj`, `package.json`, `pom.xml`, `.py`, Supabase...) e liga **só** os plugins daquela stack, no escopo local. Skills consultoras ficam travadas e só são lidas na etapa que precisa delas. |
| **Medição de uso** | `scripts/medir-uso.mjs` lê o histórico local do Claude Code e soma tokens por sessão e por modelo (inclui subagentes), sem contar duas vezes a mesma resposta. `scripts/peso-plugins.mjs` mede quanto cada plugin pesa só por estar ligado; `scripts/comparar-medicoes.mjs` compara rodadas de um ensaio. |
| **Verificador de segurança de skills** | Toda skill nova passa pelo `skill-scanner` (adaptado da Sentry: lê scripts em subpastas, Node, PowerShell e arquivos UTF-16). O hook `verificar-instalados.mjs` confere o que foi instalado ao abrir a sessão e avisa antes de usar; falsos positivos ficam registrados com o motivo. |
| **Testes e CI** | mais de 300 testes com `node --test`, rodando no GitHub Actions em **Linux e Windows** a cada envio, mais `claude plugin validate` em cada plugin. Um teste barra plugin alterado sem versão nova. |
| **Publicação com vitrine opcional** | A skill `subir` envia o repositório e, quando o projeto tem `vitrine.json`, gera também uma vitrine pública: cópia limpa, sem histórico, só do que uma lista manda, com varredura de e-mail, caminhos, documentos, telefones e tokens antes de copiar. Ver [docs/vitrine-publica.md](docs/vitrine-publica.md). |
| **Memória e continuidade** | Skill `memoria` (retomar, salvar, revisar) e troca de turno com o Codex quando o limite do Claude acaba (`retomar-turno.mjs`, `vigia-limite.mjs`). |
| **Licenças em ordem** | Cada arquivo de terceiros tem origem, commit e licença em `fontes.json`, crédito no `NOTICE` e o texto da licença na própria pasta. Auditoria em [docs/licencas-publicacao.md](docs/licencas-publicacao.md). |

## Plugins

| Plugin | O que tem |
|---|---|
| `devconductor-core` | agentes por função (`planejador`, `executor`, `revisor`, `arquiteto`, `complex-tasks`, `simple-tasks`, `pesquisador`, `tarefas-mecanicas`, `testador`, `publicador`), skills `orquestrador`, `arquitetura`, `memoria`, `subir`, `skill-scanner`, `find-skills`, `codex-parceiro` e os hooks de detecção de stack e avisos |
| `stack-dotnet`, `stack-java`, `stack-typescript`, `stack-python`, `stack-banco` | especialistas por linguagem e banco, selecionados do wshobson/agents e de outros projetos abertos |
| `seguranca` | código seguro no backend e no frontend e auditoria (OWASP, dependências, segredos) |
| `landing-pages` | fluxo completo de landing page, da coleta à publicação, com skills de design conhecidas travadas por etapa |
| `estudio-design` | estudos de movimento em React + GSAP com testes de computador, celular e movimento reduzido |
| `design-sistemas` | telas de sistema em React, com padrões brasileiros testados (CPF, CNPJ alfanumérico, CEP, dinheiro, datas) |
| `grafo-codigo` | mapa do código com o Graphify (só AST, sem LLM): o agente consulta o grafo antes de abrir dezenas de arquivos |

O método de trabalho (brainstorm, plano, TDD, revisão) vem do plugin
[superpowers](https://github.com/obra/superpowers), instalado do catálogo oficial (não é copiado aqui).

## Como instalar

Requer o Claude Code e o Node 22+. Na pasta do projeto onde vai usar:

```bash
claude plugin marketplace add neemiasjls/DevConductor-public --scope local
```
```bash
claude plugin marketplace add anthropics/claude-plugins-official --scope local
```
```bash
claude plugin install superpowers@claude-plugins-official --scope local
```
```bash
claude plugin install devconductor-core@devconductor --scope local
```

Na primeira sessão o núcleo detecta a stack e instala os plugins dela; os especialistas entram na sessão
seguinte. Para ver o que seria instalado sem instalar nada:

```bash
node plugins/devconductor-core/hooks/detectar-stack.mjs --projeto "<pasta do projeto>" --dry-run
```

## Rodar os testes

```bash
node --test "scripts/testes/*.test.mjs"
```
```bash
claude plugin validate .
```

Medir o gasto de um projeto nos últimos 7 dias:

```bash
node scripts/medir-uso.mjs "<pasta do projeto>" --dias 7
```

## Estrutura

```
plugins/        os 11 plugins (agentes, skills e hooks)
scripts/        instalação, medição, diagnóstico, auditorias e testes (scripts/testes)
docs/           decisões de projeto, responsabilidades das skills e auditoria de licenças
fontes.json     origem exata de cada arquivo de terceiros (repositório, caminho, commit, licença, mudança)
NOTICE          créditos
```

## Licença

Código próprio: MIT ([LICENSE](LICENSE)). Arquivos de terceiros mantêm a licença original (MIT ou
Apache-2.0), indicada na pasta de cada um e no [NOTICE](NOTICE). Os nomes dos projetos citados pertencem aos
seus autores e aparecem só para dar crédito; nenhum deles endossa este kit.
