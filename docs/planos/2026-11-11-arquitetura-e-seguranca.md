# Plano — Arquitetura e segurança de sistemas (11/11/2026)

> Estado: **proposta, pronta para executar**. Detalha a Etapa 2b (A1–A5) de [`docs/plano-de-acao.md`](../plano-de-acao.md)
> e o G8 de [`2026-11-10-projeto-geral.md`](2026-11-10-projeto-geral.md), sem mudar o escopo.
> Marcas (DEV-48): `[regente]` conversa principal · `[difícil]` vai ao `complex-tasks` · `[sonnet]` executor no
> Sonnet · sem marca: `executor` no Opus.

## Objetivo
O kit passa a fazer o certo sozinho em sistemas com dados reais: lista os riscos antes de construir, para o commit
quando a mudança toca área sensível até haver revisão, varre segredos, dependências e código num comando, e
registra decisões de arquitetura em linguagem simples. Tudo medido num sistema de exemplo com falhas plantadas.

## O que existe hoje (conferido em 11/11)
- `plugins/seguranca` 0.1.3: 3 agentes copiados (`security-auditor`, `backend-security-coder`,
  `frontend-security-coder`, todos `model: sonnet`, em inglês, ~155 linhas cada) e a skill `sast-configuration`
  (Semgrep/SonarQube/CodeQL genérico, 191 linhas). Sem hook, sem script, sem teste. Origem em `fontes.json`.
- `devconductor-core` 0.4.7: hooks só em `SessionStart`, `PostToolUse`, `Notification` e `UserPromptSubmit`
  (`plugins/devconductor-core/hooks/hooks.json`); **nada roda antes de commit ou envio**.
- `orquestrador/referencias/fluxo-sistema.md` só diz "banco, autenticação e segredos exigem as regras da área";
  não obriga etapa de segurança. `orquestrador/SKILL.md` tem 6.793 bytes de um limite de 7.000
  (`scripts/testes/orquestrador.test.mjs`): **só cabe troca de linha, não acréscimo**.
- Arquitetos só `stack-dotnet:dotnet-architect` (sonnet) e `stack-banco:database-architect` (opus).
- O sistema de gestão do dono é C# (.NET, 4 projetos `.csproj`) + front em TypeScript (`frontend/package.json`) +
  Postgres (SQL em `docs/planos/`). Na máquina: `dotnet`, `node`, `python` e `gitleaks` 8.30.1 (winget); sem
  `osv-scanner` e sem `semgrep`.

## Fora do escopo
Teste de invasão com o sistema rodando (DAST, ZAP), monitoramento em produção, parecer jurídico de LGPD (fica só a
lista técnica), SonarQube/CodeQL, mexer no `~/.claude` global, corrigir o sistema de gestão (A5 é só relatório),
design de telas de sistema (G7), plugin novo.

## Suposições
- Detector por caminho e palavra no **diff de linhas adicionadas**; limiar de mudança grande: **40 linhas
  adicionadas** em arquivos sensíveis. Ajustável em `areas-sensiveis.json`.
- O marcador de revisão fica dentro da pasta do Git (`.git/devconductor/revisao-seguranca.json`): nunca é
  commitado e não exige mexer no `.gitignore` de projeto nenhum.
- O `security-auditor` é chamado com `model: "opus"` pela ficha (segurança é decisão, DEV-48); o arquivo copiado
  não muda de modelo.
- A stack da prova (A3) segue a do sistema de gestão: C# + Postgres + um pouco de TypeScript (decisão D2).
- Ferramenta externa é **chamada se existir**, nunca baixada pelo kit (mesma regra do ampliador do `lp-assets`).
- Achado "alto" ou "crítico" barra; "médio" e "baixo" vão para o relatório.

## Ferramentas da varredura (A2) — conferidas em fonte primária em 11/11
| Ferramenta | Cobre | Licença | Windows sem Docker | Uso |
|---|---|---|---|---|
| gitleaks | segredos na pasta e no histórico | MIT (verificado, GitHub) | sim: binário oficial; instalado aqui por winget (verificado) | **obrigatória** |
| osv-scanner (Google) | dependências com falha conhecida: npm, NuGet, PyPI e outras | Apache-2.0 (verificado) | sim: `.exe` na release v2.7.1 (verificado) | **obrigatória** |
| `dotnet list package --vulnerable --include-transitive` | NuGet quando não há `packages.lock.json` (o osv-scanner **não lê `.csproj`**, verificado na doc) | vem com o SDK .NET; licença não verificada aqui | sim | complemento .NET |
| `npm audit` / `pip-audit` | npm / PyPI | npm: não verificado · pip-audit: Apache-2.0 (verificado) | sim | reserva quando falta o osv-scanner |
| Semgrep CE | análise do código | motor LGPL-2.1 (verificado); regras do registro com licença própria, não aberta (texto **não verificado**) | Windows nativo **em beta**, por `pipx` (verificado na doc) | camada opcional |
| Opengrep | fork do Semgrep | LGPL-2.1 (verificado) | sim: `.exe` na release v1.33.1 (verificado); repositório de regras do fork arquivado (verificado) | alternativa se o Semgrep falhar no Windows |
| Trivy | tudo num só | Apache-2.0 (verificado) | zip Windows (verificado) | **não usar agora**: release comprometida em mar/2026 (CVE-2026-33634, GHSA-69fq-xp46-6x23) |
| TruffleHog, CodeQL, SonarQube | — | AGPL / uso restrito / servidor (não verificados) | — | descartados: o conjunto acima já cobre |

**Recomendação:** gitleaks + osv-scanner sempre; `dotnet list package` em projeto .NET; **verificações próprias**
do kit (regras simples em Node, sem dependência, rodam até no GitHub) sempre; Semgrep/Opengrep se instalado.
Instalação sugerida ao usuário (nunca feita pelo kit): `winget install Gitleaks.Gitleaks` (verificado);
osv-scanner pelo `.exe` da página de releases (id do winget **não verificado**); `pipx install semgrep`.

## Fontes prontas avaliadas (11/11)
Pedido do dono depois deste plano: usar skills e projetos famosos como no resto do kit, só o melhor de cada um, sem
uma atropelar a outra. Licença, estrelas e último envio conferidos na página do GitHub (API) em 10–11/11; conteúdo
lido nos originais (`C:\Users\<usuario>\Desktop\OpenSource\` ou no GitHub). **Regra que decide quase tudo:** o kit é
MIT; texto com licença *ShareAlike* (CC BY-SA: Trail of Bits, OWASP, arc42) obrigaria o arquivo que o recebe a
virar CC BY-SA. Por isso, desses, **só ideia ou link, nunca texto**. Cópia de texto só de MIT, Apache-2.0 ou CC0,
com `fontes.json`, `NOTICE` e cópia da licença (parte 12). Nenhuma fonte vira skill consultora nova: o que entra
vira trecho de um arquivo de referência que já tem dona (menos peças, nada concorrendo para ser chamado).

### Candidatos
| Candidato | O que tem de bom para este kit | Licença (cópia com alteração?) | Qualidade real | Tamanho | Risco | Veredito |
|---|---|---|---|---|---|---|
| **usestrix/strix** — `strix/skills/analysis/severity_calibration.md` e `counterevidence.md` (★ 74,8 mil, ativo, commit local `03d2c6c`) | Régua de gravidade (o que é crítico/alto/médio, "dê nota ao que provou, não ao pior caso") e os 3 estados de um achado: confirmado, descartado (só citando a proteção e onde ela roda), **pendente de prova** (nunca some da lista) | Apache-2.0 (verificado): sim, com aviso de mudança e cópia da licença | Lido. Específico e atual; o melhor material de triagem achado | 130 + 185 linhas → ~20 no kit | Cita ferramentas internas do Strix (`create_vulnerability_report`, `record_coverage`): tirar | **COPIAR TRECHO** adaptado → seção "Gravidade e fechamento" do `portao-seguranca.md` (parte 3) |
| **usestrix/strix** — `vulnerabilities/idor.md` e `broken_function_level_authorization.md` | Exatamente as falhas que só o auditor acha (F2, F3): tabela quem × qual registro × qual ação, rota irmã/lote/tarefa de fundo sem a mesma checagem, "resposta vazia não é vazamento", "id difícil de adivinhar não é proteção" | Apache-2.0 (verificado) | Lido. Específico | 217 + 154 → ~6 perguntas | Foco em teste com sistema rodando: usar só as perguntas de leitura de código | **COPIAR TRECHO** adaptado → perguntas da categoria `permissao` do `portao-seguranca.md` |
| **anthropics/claude-code-security-review** — `.claude/commands/security-review.md` (★ 6,8 mil, último commit 11/02/2026, `0c6a49f`) | Lista "não é achado" (testes, documentação, negação de serviço, falta de endurecimento, checagem só no navegador, React salvo `dangerouslySetInnerHTML`, variável de ambiente é confiável) que corta falso alarme | MIT (verificado): sim, com aviso | Lido. Bom e enxuto; parado há 9 meses, mas o texto não depende de versão | ~190 linhas → ~10 | **Contradiz o kit** em segredo em arquivo, UUID e limite de tentativas (conflitos C1, C4 e C13) | **COPIAR TRECHO** (só as exclusões compatíveis) → seção "Não é achado" do `portao-seguranca.md` |
| Comando `/security-review` embutido no Claude Code | Mesmo texto do item acima | do produto | — | — | Exclui segredo em disco e dependências, não grava marcador, não aceita a ficha do portão | **NÃO USAR** como etapa (o que presta entra pelo item acima) |
| **adr/madr** — `template/adr-template-minimal.md` (★ 2,6 mil, ativo, `ba75bb1`, ramo `develop`) | Ordem e nomes das seções de uma decisão: contexto e problema, opções, decisão "porque…", consequências boas e ruins | MIT **ou** CC0-1.0 (verificado): sim | Lido. Mínimo e claro | 25 linhas | Nenhum; não tem "como desfazer" (o kit acrescenta) | **COPIAR TRECHO** traduzido → base do `modelo-decisao.md` (parte 7) |
| **trailofbits/skills** — `differential-review` (★ 8,1 mil, ativo, `e4dd0bb`) | "Classifique por risco, não por tamanho"; **remover uma checagem de segurança é risco alto**; procurar no histórico por que a checagem existia (`git log -S`) | CC BY-SA 4.0 (verificado): cópia obrigaria o arquivo a virar CC BY-SA | Lido. Muito bom, mas voltado a contratos inteligentes em parte e pesado (7 fases, relatório obrigatório) | ~33 KB | ShareAlike; relatório obrigatório contradiz DEV-50 | **USAR COMO REFERÊNCIA** (ideia, palavras próprias) → parte 3 (nível 2) e ajuste sugerido da parte 1 |
| **trailofbits/skills** — `insecure-defaults/references/fallback-secrets.md` | Segredo com valor padrão no código (`?? "dev-secret"`): o sistema roda com chave conhecida se faltar a variável | CC BY-SA 4.0 | Lido. Específico | 2 KB | ShareAlike | **USAR COMO REFERÊNCIA** → regra nova escrita do zero na parte 4b |
| trailofbits/skills — `fp-check`, `entry-point-analyzer`, `static-analysis`, `semgrep-rule-creator` | fp-check repete o que o Strix dá melhor; entry-point é de contratos inteligentes; os de Semgrep exigem Semgrep | CC BY-SA 4.0 | fp-check lido; outros só listagem | 7–50 KB | ShareAlike, fora do foco | **NÃO USAR** |
| **OWASP Cheat Sheet Series** (★ 34 mil, ativo) | Uma página certa por categoria do portão: Authorization, IDOR Prevention, File Upload, Query Parameterization, Secrets Management, Logging (nomes conferidos no repositório) | CC BY-SA 4.0 (verificado) | Referência mundial, atual | — | ShareAlike | **USAR COMO REFERÊNCIA**: só o link, um por categoria, no `portao-seguranca.md`, lido ao corrigir |
| OWASP ASVS 5.0.0 (lançada 30/05/2025, verificado) | Norma completa de verificação | CC BY-SA 4.0 | Excelente, mas centenas de requisitos | grande | Excesso para o público; números de capítulo não conferidos | **NÃO USAR agora** (reabrir se um cliente pedir conformidade) |
| OWASP Top 10 (pasta `2025` no repositório) | Lista de conscientização | CC BY-SA 4.0 (texto da licença verificado) | Genérico; categorias largas | — | O `security-auditor` já cita | **NÃO USAR** |
| Regras do Semgrep (`semgrep/semgrep-rules`) | Regras prontas | Semgrep Rules License v1.0 (verificado): não é aberta | — | — | Licença | **NÃO USAR** (a parte 4a já não copia regra) |
| Modelo C4 (c4model.com, Simon Brown) | Mapa em níveis; os 2 primeiros (quem usa e com que sistemas conversa; quais aplicações e bancos existem) bastam para o público | CC BY 4.0 (verificado no site) | Clássico, claro | — | Níveis 3–4 e notação seriam excesso | **USAR COMO REFERÊNCIA**: só níveis 1–2, em lista (partes 7 e 8) |
| wshobson/agents `c4-architecture` (4 agentes + comando) | Gera documentação C4 completa | MIT | Lido o tamanho e o começo: gera tudo em 4 níveis | ~1.400 linhas | Inchado | **NÃO USAR** |
| wshobson/agents `architecture-decision-records` | Modelos de decisão | MIT | Lido: exemplos longos, é o MADR com enchimento | 441 linhas | Duplica o MADR | **NÃO USAR** (fica o MADR original) |
| wshobson/agents `architect-review`, `backend-architect`, `architecture-patterns` | — | MIT | Lido: lista de modismos (microsserviços, service mesh, Kafka) | 162–309 linhas | Empurra complexidade; contradiz "simples" | **NÃO USAR** |
| wshobson/agents `threat-modeling-expert`, `stride-analysis-patterns`, `attack-tree-construction`, `security-requirement-extraction`, `threat-mitigation-mapping` | Vocabulário de modelagem de ameaças | MIT | Lido: genéricos (listas de "faça/não faça"); STRIDE pede diagrama de fluxo e sessão em grupo | 50–82 linhas cada | Duplica as 7 perguntas do portão com mais custo | **NÃO USAR** |
| wshobson/agents comandos `security-sast`, `security-hardening`, `security-dependencies`, `compliance-check` | — | MIT | Lido o tamanho: roteiros longos | 528–962 linhas | Duplica a parte 4a | **NÃO USAR** |
| adr-tools (npryce) | Numeração `NNN` e "substituída por" | GPL-3.0 (verificado); parado desde 04/2024 | Script de terminal Unix | — | GPL e Windows | **USAR COMO REFERÊNCIA** só a ideia de situação (proposta/aceita/substituída) |
| joelparkerhenderson/architecture-decision-record (★ 17 mil) | Coleção de modelos | CC BY-NC-SA (verificado): **proíbe uso comercial** | — | — | O kit é para vender | **NÃO USAR** |
| arc42 | Modelo de documentação em 12 seções | CC BY-SA 4.0 (verificado) | Sólido, pesado | 12 seções | Excesso; ShareAlike | **NÃO USAR** |
| obra/superpowers (★ 315 mil, MIT) | Já instalado à parte; sem skill de segurança ou arquitetura própria (conferido na 7.0.0 local) | MIT | — | — | `brainstorming` também propõe "abordagens"; `requesting-code-review` pergunta "Security concerns?" (ver mapa) | **NÃO COPIAR** (convive pelo mapa abaixo) |
| anthropics/skills (★ 192 mil) | Nenhuma skill de segurança ou arquitetura na lista (conferido) | sem licença na raiz; cada skill tem a sua | — | — | — | **NÃO SE APLICA** |
| Strix como ferramenta (teste de invasão com IA) | — | Apache-2.0 | — | — | Exige Docker e chave de modelo pago; teste com sistema rodando está fora do escopo | **NÃO USAR** |

**Resultado:** 24 avaliados · 4 trechos copiados de 3 origens (Strix ×2, revisão de segurança da Anthropic, MADR) ·
5 só como ideia ou link (Trail of Bits ×2, OWASP Cheat Sheets, C4, adr-tools) · 15 recusados.

### Mapa de responsabilidades (uma dona por decisão)
| Decisão | Dona única | Materiais externos: só consultados, em que etapa |
|---|---|---|
| "Esta mudança é sensível? Nível 0, 1 ou 2?" | detector `mudanca-sensivel.mjs` (parte 1) | nenhum |
| "Pode commitar / enviar?" | portão `portao-seguranca.mjs` (parte 2), pelo marcador | nenhum. Nem `/security-review` nem o revisor do superpowers liberam ou barram |
| "Que riscos este pedido tem?" (entrada) | regente, pelas 7 perguntas do `fluxo-sistema.md` (parte 3) | nenhum (STRIDE recusado) |
| "Há segredo, dependência vulnerável ou padrão perigoso?" | comando `varrer.mjs` + verificações próprias (partes 4a, 4b) | ideia do Trail of Bits já embutida como regra própria (4b). Dependência é **só** da varredura: o auditor não repete |
| "O código sensível tem falha?" (nível 2 e auditoria) | `seguranca:security-auditor` no Opus | `portao-seguranca.md`, lido **só** na etapa Entregar (nível 2) e no passo 4 da auditoria; dentro dele os trechos do Strix e da Anthropic |
| "Qual a gravidade? O achado está fechado?" | seção "Gravidade e fechamento" do `portao-seguranca.md`, aplicada pelo auditor | Strix (trecho). O portão só lê `achadosAbertos` |
| "Isto nem é achado?" | seção "Não é achado" do mesmo arquivo | Anthropic (trecho), com as exceções do kit |
| "Como corrigir?" | `backend-security-coder` / `frontend-security-coder` (ou a regente, se pequeno) | links OWASP do `portao-seguranca.md`, abertos só ao corrigir |
| "Auditar um projeto real" | skill `seguranca:auditoria-projeto` (parte 10) | as mesmas seções do `portao-seguranca.md` |
| "Registrar uma decisão técnica" | skill `arquitetura` (parte 7) | `modelo-decisao.md` (MADR adaptado), lido só ao gravar |
| "Esta mudança grande está bem dividida?" | skill `arquitetura` → `conferencia.md` | ideia do C4 (níveis 1–2) |
| "Como dividir módulos / stack mista?" | agente `arquiteto` (parte 8) | `conferencia.md`; detalhe .NET → `dotnet-architect`; modelagem → `database-architect` |
| "O que construir" (escopo, produto) | `superpowers:brainstorming` onde instalado; senão a regente | quando ele escolher uma abordagem que muda a estrutura, a decisão é gravada pela skill `arquitetura` |
| "Revisão geral de código" | `revisor` (ou o revisor do superpowers) | segurança ali é só olhar; não substitui o auditor nem grava marcador |

**Onde um material contradiz outro ou o kit, e quem vence:**
- **C1** Anthropic exclui "segredo guardado em disco" → **vence o kit**: segredo em arquivo de configuração
  versionado é alto (F4, regra da 4b). O trecho copiado sai sem essa exclusão.
- **C2** Anthropic exclui "biblioteca desatualizada" → concorda com a dona única (varredura); fica.
- **C3** Anthropic: "falta de registro de auditoria não é falha" e só segredo em log conta → **vence o kit** em
  dado pessoal: CPF, senha e dado pessoal em log é médio (F8, LGPD).
- **C4** Anthropic: "UUID é impossível de adivinhar" × Strix: "id difícil não é proteção" → **vence o Strix** para
  permissão: rota que não confere o dono do registro é achado mesmo com UUID (F3).
- **C5** Anthropic descarta achado com confiança < 8 × Strix: "não confirmado vira pendente, nunca some" → **os
  dois, cada um no seu lugar**: só achado *confirmado* alto/crítico conta em `achadosAbertos` e barra; *pendente
  de prova* vai ao relatório como "conferir" e nunca é apagado.
- **C6** Anthropic: "falta de endurecimento não é falha" × `security-auditor` (lista cabeçalhos, conformidade) →
  **vence a Anthropic no portão**: endurecimento vai ao relatório como baixo, não barra.
- **C7** Trail of Bits: "remover checagem é risco alto" × detector (parte 1) que só olha linhas adicionadas → não
  muda a parte 1 agora; o auditor confere remoções no nível 2 (parte 3) e fica o ajuste sugerido abaixo.
- **C8** Trail of Bits: "sempre gerar relatório em arquivo" × DEV-50 (devolver pouco) → **vence o kit**: relatório
  só na varredura e na auditoria, fora do repositório; o nível 2 devolve JSON curto.
- **C9** MADR não tem "como desfazer" e tem "Decision Drivers"/"Confirmation" → **vence o modelo do plano**
  (parte 7): MADR dá só ordem e nomes das seções.
- **C10** C4 e `c4-architecture` pedem 4 níveis e diagramas × "até 10 linhas ao usuário" → **vence o kit**: só
  níveis 1–2, em lista.
- **C11** `superpowers:brainstorming` grava especificação e propõe abordagens × skill `arquitetura` → escopo fica
  com o brainstorming; decisão estrutural é gravada pela `arquitetura` (projeto com `docs/decisoes.md` segue o dele).
- **C12** agentes copiados com `model: sonnet` × segurança no Opus (DEV-48) → já resolvido: `model` na ficha.
- **C13** Anthropic exclui "limite de taxa" × dica do dono "limite em toda entrada" (seção "Dicas de quem já faz")
  → **vence a dica** onde há risco concreto: login sem limite de tentativas e envio sem limite de tamanho são achado
  (médio, "conferir"; o envio sem validação continua alto pela 4b). Limite em rota comum segue fora do portão.
- **C14** Dica do dono "auditoria em duas passadas por agentes diferentes" × parte 6 (o mesmo auditor duas vezes,
  achado só conta se aparecer nas duas) → não se contradizem: a parte 6 mede **estabilidade** do auditor; as duas
  passadas medem **cobertura** e valem na auditoria (partes 10 e 11). No portão de cada commit fica uma passada só
  (custo, DEV-50); ver "Ajustes sugeridos para depois".

## Partes

### 1. Detector de mudança sensível
**Arquivos:** `plugins/devconductor-core/hooks/mudanca-sensivel.mjs` (novo), `plugins/devconductor-core/hooks/areas-sensiveis.json`
(novo), `scripts/testes/portao-seguranca.test.mjs` (novo).
**Regra:** função exportada `classificar({ arquivos, adicionadas })` e linha de comando que lê `git diff --cached`
(ou `--intervalo A..B`). Olha só **linhas adicionadas** de código e configuração; ignora `.md`, imagens, arquivos de
teste (`*.test.*`, `*Tests*/`, `tests/`), `pilotos/prova-seguranca/` e o que estiver em `ignorar` de
`.devconductor/portao.json`. Categorias no JSON, cada uma com `caminhos` (globs), `palavras` (regex, sem
diferenciar maiúsculas) e `alto` (sim/não):
- `login` (alto): `Auth`, `Login`, `jwt`, `bcrypt`, `password`, `senha`, `token`, `AddAuthentication`;
- `permissao` (alto): `[Authorize`, `AllowAnonymous`, `RequireAuthorization`, `role`, `perfil`, `permiss`, `policy`;
- `banco-acesso` (alto): `row level security`, `create policy`, `grant `, `security definer`, `auth.uid()`;
  caminhos `**/migrations/**`, `**/supabase/**`;
- `upload` (alto): `IFormFile`, `multer`, `upload`, `multipart`;
- `pagamento` (alto): `pagamento`, `pix`, `stripe`, `mercadopago`, `checkout`, `boleto`;
- `dados-pessoais`: `cpf`, `cnpj`, `rg`, `telefone`, `e-mail`, `endereco`/`endereço`, `nascimento`;
- `segredos`: `ConnectionStrings`, `secret`, `api_key`/`apikey`, `.env*`, `appsettings*.json`;
- `dependencias`: `package.json`, lockfiles, `.csproj`, `requirements*.txt`, `pyproject.toml`.
Saída JSON: `{ nivel: 0|1|2, categorias, arquivos, linhas }`. **Nível 2** = alguma categoria `alto` **ou** mais
de 40 linhas adicionadas em arquivos sensíveis; **nível 1** = outra categoria; **0** = nada. Sem rede; menos de
300 ms num diff de 2.000 linhas. Não muda nenhum hook existente.
**Pronto quando:** os 12 casos do teste passam e a CLI devolve JSON válido num repositório sem nada preparado.
**Teste:** `node --test scripts/testes/portao-seguranca.test.mjs` com diffs de texto no próprio teste: README → 0;
CSS → 0; arquivo de teste com "senha" → 0; `.csproj` → 1; `appsettings.json` → 1 (segredos); 10 linhas com `cpf`
num serviço → 1; 50 linhas com `cpf` → 2; `[AllowAnonymous]` → 2; `create policy` em migração → 2; `IFormFile` → 2;
`pix` → 2; caminho em `ignorar` → 0; e tempo < 300 ms no diff grande.
**Depende de:** nenhuma.

### 2. Portão no commit e no envio
**Arquivos:** `plugins/devconductor-core/hooks/portao-seguranca.mjs` (novo), `plugins/devconductor-core/hooks/hooks.json`
(entrada nova em `PreToolUse`, matcher `Bash`, timeout 10), `mudanca-sensivel.mjs` (opção `--registrar-revisao`),
`scripts/testes/portao-seguranca.test.mjs`.
**Regra:** o hook só age se o comando tiver `git commit` ou `git push` (regex `\bgit\b[^|;&]*\b(commit|push)\b`);
qualquer outro comando sai em silêncio. Commit: diff do que está preparado; push: `@{u}..HEAD` (sem upstream:
avisa e libera). Nível 0: libera em silêncio. Nível 1 ou 2: libera só se existir
`.git/devconductor/revisao-seguranca.json` com o **mesmo hash do diff** (sha256) e `achadosAbertos: 0`; senão
nega (`permissionDecision: "deny"`, formato do evento `PreToolUse` — conferir na documentação de hooks antes) com
motivo em até 6 linhas simples: categorias, arquivos e o que fazer (nível 1: varredura + lista do portão; nível 2:
varredura + `security-auditor`). `.devconductor/portao.json` aceita `modo`: `travar` (padrão, decisão D1),
`avisar` (libera e mostra o texto) ou `desligado`, e `ignorar`. `node mudanca-sensivel.mjs --registrar-revisao
--achados 0 --quem "<agente ou regente>"` grava o marcador. **Qualquer erro do próprio hook libera** (com aviso),
nunca trava por defeito. Caminhos com espaço e fim de linha CRLF no Windows.
**Pronto quando:** num repositório temporário, commit sensível sem marcador é negado; com marcador do mesmo diff
passa; marcador de diff antigo é negado; `avisar` libera com texto; repositório quebrado libera.
**Teste:** mesmo arquivo de teste, com `spawnSync` do hook recebendo o JSON do evento pela entrada (padrão de
`scripts/testes/orquestrador.test.mjs`) e `git init` em pasta de `os.tmpdir()`; mais um teste que confere a entrada
nova em `hooks.json` apontando para arquivo que existe.
**Depende de:** 1.

### 3. Portão escrito no fluxo de sistema `[regente]`
**Arquivos:** `plugins/devconductor-core/skills/orquestrador/referencias/fluxo-sistema.md`,
`plugins/devconductor-core/skills/orquestrador/referencias/portao-seguranca.md` (novo, até 100 linhas),
`plugins/devconductor-core/agents/planejador.md`, `plugins/devconductor-core/agents/revisor.md`,
`plugins/devconductor-core/skills/orquestrador/SKILL.md` (só troca a linha "login, permissão..." da tabela da seção 4,
sem passar de 7.000 bytes), `plugins/devconductor-core/skills/subir/SKILL.md` (passo 1), `scripts/testes/orquestrador.test.mjs`.
**Regra:**
- *Entrar* (fluxo-sistema): antes de construir, a regente responde em até 7 linhas sim/não com uma frase cada:
  login, permissões, dados pessoais (LGPD), segredos, envio de arquivo, pagamento, regras de acesso do banco. Tudo
  "não": segue sem custo. Algum "sim": o resumo ou o plano leva a linha e quem trata.
- *Entregar*: nível 1 → regente roda `seguranca:varredura-seguranca` e a lista do `portao-seguranca.md` ela mesma
  (até ~5 chamadas, DEV-50); nível 2 → além disso, `security-auditor` com `model: "opus"`, ficha só com caminhos
  do diff, categorias e o caminho do `portao-seguranca.md`, pedindo achados em bloco JSON
  `{categoria, arquivo, linha, gravidade, explicacao, correcao}`. Corrigido e varrido de novo, registra o marcador.
  Sem o plugin `seguranca` ligado: `complex-tasks` faz a revisão com a mesma lista.
- `portao-seguranca.md`: por categoria, 3–5 perguntas simples, "como conferir", um exemplo curto errado → certo
  (C#, TypeScript e SQL) e **um link** da OWASP Cheat Sheet Series (Authorization, IDOR Prevention, File Upload,
  Query Parameterization, Secrets Management, Logging; só o link, nada de texto: licença CC BY-SA), em português
  sem jargão sem explicação. Fontes prontas (ver "Fontes prontas avaliadas"; baixar o original numa pasta separada,
  ler, adaptar; não copiar mais que isto):
  - Categoria `permissao`: perguntas adaptadas de `usestrix/strix` `strix/skills/vulnerabilities/idor.md` e
    `broken_function_level_authorization.md` (Apache-2.0): quem pode fazer o quê com qual registro; a consulta
    filtra pelo dono do registro, não só pelo login; rota irmã, ação em lote e tarefa de fundo têm a mesma checagem;
    id difícil de adivinhar (UUID) não dispensa a checagem; resposta vazia para registro alheio não é vazamento.
  - Seção **"Gravidade e fechamento"** (até 20 linhas), adaptada de `strix/skills/analysis/severity_calibration.md`
    e `counterevidence.md`: crítico/alto/médio/baixo com 2–3 exemplos cada; "dê nota ao que provou, não ao pior
    caso"; cada achado termina em **confirmado**, **descartado** (só citando a proteção, o arquivo:linha e que ela
    roda nesse caminho) ou **pendente de prova** (vai ao relatório como "conferir", nunca é apagado); "usa
    biblioteca conhecida" e "o filtro protege outra rota" não descartam. Tirar os nomes de ferramentas do Strix.
    Só confirmado alto/crítico conta em `achadosAbertos`.
  - Seção **"Não é achado"** (até 10 linhas), adaptada da lista de exclusões de
    `anthropics/claude-code-security-review` `.claude/commands/security-review.md` (MIT): arquivo de teste,
    documentação, negação de serviço genérica, falta de endurecimento (vai ao relatório como baixo), falta de
    checagem em código que roda no navegador, React salvo `dangerouslySetInnerHTML`, variável de ambiente é
    confiável, dependência desatualizada (é da varredura). **Não copiar** as exclusões que contrariam o kit:
    segredo em arquivo, UUID como proteção e limite de tentativas no login (conflitos C1, C4, C13).
  - Nível 2, ideia de `trailofbits/skills` `differential-review` (CC BY-SA, só ideia, palavras próprias): risco se
    mede pelo que a mudança toca, não pelo tamanho; **checagem de segurança removida** (`[Authorize]`,
    `RequireAuthorization`, `enable row level security`, validação) é risco alto e o auditor procura no histórico
    por que ela existia (`git log -S`).
  - Rodapé de 2 linhas: "Trechos adaptados de usestrix/strix (Apache-2.0) e anthropics/claude-code-security-review
    (MIT), traduzidos e alterados; ver NOTICE." (aviso de alteração exigido pela Apache-2.0).
- `planejador.md`: plano de sistema tem seção "Riscos de segurança" (categorias tocadas e qual parte trata cada uma);
  parte de nível 2 sai `[difícil]`. `revisor.md`: confere o marcador nas partes sensíveis.
- `subir/SKILL.md` passo 1: rodar a varredura antes do push; achado alto para o envio.
**Pronto quando:** os textos estão no lugar, a skill do orquestrador segue ≤ 7.000 bytes e um pedido de exemplo
("tela de cadastro de motorista com CPF e foto") gera a lista de riscos com 3 "sim" (dados pessoais, envio de
arquivo, permissões).
**Teste:** em `orquestrador.test.mjs`, novo teste: `fluxo-sistema.md` cita as 7 categorias, `security-auditor`,
`varredura-seguranca` e `portao-seguranca.md`; `portao-seguranca.md` ≤ 100 linhas e contém "Gravidade e
fechamento", "Não é achado", "pendente de prova", "usestrix/strix" e ao menos um link `cheatsheetseries.owasp.org`;
`planejador.md` contém "Riscos de segurança"; limite de bytes do `SKILL.md` mantido.
`node --test scripts/testes/orquestrador.test.mjs`. O registro em `fontes.json`/`NOTICE` é da parte 12.
**Depende de:** 2 (nomes do hook e do marcador) e do nome da skill da parte 4a.

### 4a. Varredura num comando `[difícil]`
**Arquivos:** `plugins/seguranca/skills/varredura-seguranca/SKILL.md` (novo, até 90 linhas),
`plugins/seguranca/skills/varredura-seguranca/scripts/varrer.mjs` (novo), `plugins/seguranca/skills/sast-configuration/SKILL.md`
(nota de 2 linhas no topo apontando para a nova skill), `fontes.json` (campo de alteração da `sast-configuration`),
`plugins/devconductor-core/hooks/falsos-positivos-skills.json` (se o verificador de skills acusar o uso de
`child_process`, com o motivo), `scripts/testes/varredura.test.mjs` (novo), `scripts/testes/dados/varredura/` (saídas
de exemplo escritas à mão no formato documentado de cada ferramenta).
**Regra:** `node varrer.mjs [pasta] [--historico] [--sem-rede] [--saida <pasta>]`. Descobre no PATH o que existe e
roda cada uma com saída JSON: `gitleaks dir` (com `--redact`; `gitleaks git` só com `--historico`),
`osv-scanner scan source -r` (conferir a sintaxe da v2), `dotnet list package --vulnerable --include-transitive`
quando houver `.sln`/`.csproj` (se a opção JSON não existir no SDK, ler o texto), `npm audit --json` e `pip-audit -f
json` só quando faltar o osv-scanner, Semgrep ou Opengrep com `--metrics=off` se instalado (fora com `--sem-rede`),
e sempre as verificações próprias da parte 4b (`import { verificar } from './verificacoes-proprias.mjs'`).
Junta tudo numa lista `{ferramenta, tipo: segredo|dependencia|codigo, categoria, gravidade, arquivo, linha,
explicacao, correcao}` e grava `relatorio-seguranca.md` (uma linha por achado: o que é, onde, por que importa,
como corrigir, em português simples) e `.json`. Saída padrão: `.git/devconductor/varredura/` (nunca commitada).
Ignora o que estiver em `.devconductor/varredura.json` (`ignorar`) e respeita `.gitleaksignore`. Código de saída:
0 limpo; 1 achado alto/crítico; 2 faltou gitleaks ou osv-scanner (lista o que não rodou e como instalar; a falta
nunca passa calada). Nunca baixa nem instala nada. Não copia regra nem código de ferramenta nenhuma.
**Pronto quando:** em pasta com segredo falso e lockfile vulnerável, devolve 1 e o relatório traz os dois; sem
nenhuma ferramenta no PATH devolve 2 e diz o que instalar; com as saídas de exemplo, a lista unificada bate.
**Teste:** `node --test scripts/testes/varredura.test.mjs`: normalização das saídas de exemplo; PATH vazio → 2;
`verificacoes-proprias` substituída por um dublê; rodada real com gitleaks e osv-scanner em `{ skip }` quando a
ferramenta não existir (padrão de `scripts/testes/avisar.test.mjs`). Depois, `node --test "scripts/testes/*.test.mjs"`
(o teste `skills-do-kit` confere a skill nova).
**Depende de:** nenhuma (usa só a interface da 4b).

### 4b. Verificações próprias (regras simples, sem dependência)
**Arquivos:** `plugins/seguranca/skills/varredura-seguranca/scripts/verificacoes-proprias.mjs` (novo),
`scripts/testes/verificacoes-proprias.test.mjs` (novo).
**Regra:** `export function verificar(pasta, { ignorar }) → achados[]` no mesmo formato da 4a. Regras (regex, uma
função por regra, com gravidade):
- SQL montado com texto (alto): C# `FromSqlRaw(` / `ExecuteSqlRaw(` com `$"` ou `+`; `new NpgsqlCommand(` /
  `new SqlCommand(` com `$"` ou `+`; JS/TS `.query(` com crase e `${`; Python `execute(` com `f"` ou `%`.
  **Não** acusa `FromSqlInterpolated` nem parâmetro `@x`/`$1`.
- Regra do banco aberta (alto): `create policy ... using (true)` ou `with check (true)`; tabela criada em migração sem
  `enable row level security` na mesma pasta, só quando o projeto usa `auth.uid()` ou tem pasta `supabase/`.
- Segredo em configuração (alto): `Password=` com valor em string de conexão de `appsettings*.json`; chave com nome
  `secret`/`key`/`token` e valor de 16+ caracteres; `.env` versionado (`git ls-files`).
- Envio de arquivo sem validação (alto): `IFormFile` cujo `.FileName` entra em `Path.Combine` ou caminho de disco
  sem checar extensão e tamanho no mesmo método.
- Dado sensível no console ou no log (médio; dica do dono "nada sensível no console"): `Log*(`, `_logger.`,
  `Console.WriteLine(`, `console.log(`/`console.error(`, `print(` com `cpf`, `senha`, `password`, `token`, `jwt`,
  `secret`. Erro detalhado mostrado ao usuário (médio): `UseDeveloperExceptionPage()` fora de bloco
  `IsDevelopment()`; `ex.ToString()`/`ex.StackTrace` devolvido em `Results.`/`return`.
- Segredo com valor padrão no código (alto; ideia de `trailofbits/skills` `insecure-defaults`, regra escrita do
  zero, sem copiar texto: CC BY-SA): C# `?? "…"` depois de `GetEnvironmentVariable(`, `Configuration[` ou
  `GetValue<string>(`; JS/TS `process.env.X || '…'` ou `?? '…'`; Python `os.environ.get('X', '…')`/`getenv('X', '…')`
  — só quando o nome tem `secret`, `key`, `token`, `senha`, `password` ou `jwt` e o padrão não é vazio. **Não**
  acusa leitura sem valor padrão (é o controle C3 da prova).
- Token onde o script da página alcança (médio; dica do dono sobre o JWT, já corrigida na seção "Dicas"):
  `localStorage.setItem(`/`sessionStorage.setItem(` com nome `token`/`jwt`/`auth`; `document.cookie =` com esses
  nomes; C# `HttpOnly = false`. **Não** acusa cookie com `HttpOnly = true` nem token só em variável.
- Entrada sem limite (médio, "conferir"; dica do dono "limite em toda entrada", conflito C13): rota de login
  (`/login`, `Login`, `SignIn`) num projeto sem nenhum `RequireRateLimiting`/`[EnableRateLimiting]`/`AddRateLimiter`
  (ou `express-rate-limit` em Node); `[DisableRequestSizeLimit]`. Heurística; o auditor confirma.
- Endpoint sem permissão (médio, "conferir"): `app.MapGet/MapPost/MapPut/MapDelete` sem `RequireAuthorization` em
  arquivo onde outros endpoints têm; controller sem `[Authorize]` quando os vizinhos têm. Heurística; o auditor confirma.
SQL com parâmetros (dica do dono) já é a primeira regra; não duplicar.
**Pronto quando:** cada regra tem 1 caso que acusa e 1 parecido que não acusa; rodando sobre a cópia montada da
parte 5 (`node pilotos/prova-seguranca/montar.mjs`), F1, F4, F5, F7 e F8 continuam achadas, **nenhum** controle
(C1–C3) é acusado, e qualquer achado novo fora do gabarito vai anotado no resumo (não mexer no gabarito: ele é da
parte 5 e já foi executado).
**Teste:** `node --test scripts/testes/verificacoes-proprias.test.mjs` com textos curtos no próprio teste; depois
`node --test scripts/testes/varredura.test.mjs scripts/testes/prova-seguranca.test.mjs`.
**Depende de:** nenhuma.

### 5. Sistema de exemplo com falhas plantadas `[difícil]`
**Arquivos:** `pilotos/prova-seguranca/sistema/` (novo: API mínima ASP.NET Core em `api/` com `Program.cs`, 3–4
arquivos de rotas e serviços, `appsettings.json.plantado`, `packages.lock.json.plantado`; `banco/migracoes/*.sql`
estilo Supabase; `web/` com `package.json` e `package-lock.json.plantado` e 1 arquivo `.ts`),
`pilotos/prova-seguranca/gabarito.json`, `pilotos/prova-seguranca/montar.mjs`, `pilotos/prova-seguranca/LEIA.md`,
`vitrine.json` (excluir `pilotos/prova-seguranca/**`), `scripts/testes/prova-seguranca.test.mjs` (novo).
**Regra:** tema neutro (pedidos de entrega). Falhas:
- F1 injeção de SQL: busca de cliente por nome com `FromSqlRaw($"...{nome}...")`;
- F2 endpoint sem checagem de permissão: `DELETE /usuarios/{id}` sem `RequireAuthorization`;
- F3 acesso a dado de outro usuário: `GET /pedidos/{id}` autenticado, mas sem conferir se o pedido é do usuário;
- F4 segredo no código: chave de assinatura do login e senha na string de conexão em `appsettings.json`
  (valores falsos, genéricos, **sem** formato de chave de provedor real: nada de `sk_live_`, `ghp_`, `AKIA`);
- F5 regra de acesso do banco aberta: `create policy ... using (true)` em `clientes` e `pagamentos` sem
  `enable row level security`;
- F6 dependência vulnerável: npm `lodash` 4.17.20 e NuGet `Newtonsoft.Json` 12.0.x (conferir no osv.dev os
  identificadores na execução e anotar no gabarito);
- F7 envio de arquivo sem validação: comprovante salvo com `file.FileName` em `wwwroot`, sem extensão nem tamanho;
- F8 dado pessoal em log: CPF e senha do login escritos no log.
Controles que **não** podem ser acusados: C1 `FromSqlInterpolated`; C2 `/saude` público de propósito; C3 segredo
lido de variável de ambiente. `gabarito.json`: `{id, categoria, arquivo, trecho, gravidade}` (o trecho localiza a
linha). **Nenhum comentário no código entrega a falha.** Lockfiles e `appsettings` com sufixo `.plantado` para o
repositório não disparar alerta de dependência nem bloqueio de segredo no envio; `montar.mjs <destino>` copia
`sistema/` para fora do repositório (padrão: `os.tmpdir()`) devolvendo os nomes reais e faz `git init` + um commit
lá (para o `gitleaks git` e o portão). `LEIA.md`: o que é, como montar, aviso de que é inseguro de propósito.
**Pronto quando:** `node pilotos/prova-seguranca/montar.mjs` monta a pasta; `dotnet build` passa nela (registrado
no `LEIA.md`); o teste do gabarito passa.
**Teste:** `node --test scripts/testes/prova-seguranca.test.mjs`: cada falha e controle do gabarito existe e o
trecho aparece no arquivo; `montar` cria a árvore com nomes reais; nenhum arquivo de `sistema/` contém
"falha|vulner|plantad|insegur|propósito" em comentário; `vitrine.json` exclui a pasta.
**Depende de:** nenhuma.

### 6. Medição e teste de regressão da prova `[difícil]`
**Arquivos:** `pilotos/prova-seguranca/medir.mjs` (novo), `pilotos/prova-seguranca/execucoes/AAAA-MM-DD.json` e
`resultado.md` (novos), `scripts/testes/prova-seguranca.test.mjs`.
**Regra:** `medir.mjs <relatorio-varredura.json> [achados-auditor.json]` compara com o gabarito: falha achada =
mesma categoria e mesmo arquivo, linha a até 5 da esperada. Imprime tabela "achou / não achou / por quem" e os
falsos alarmes nos controles. Rodada completa (feita pela regente ou pelo `complex-tasks`): montar → varredura →
`security-auditor` (`model: "opus"`) recebendo só a pasta montada e o `portao-seguranca.md`, **duas vezes**
(achado da camada do auditor só conta se aparecer nas duas) → medir → gravar `execucoes/`.
No teste automático (roda no GitHub, sem ferramentas externas): verificações próprias sobre a pasta montada acham
F1, F4, F5, F7 e F8 e nenhum controle; com gitleaks presente acha F4; com osv-scanner e rede acha F6 (senão
`skip`); a última execução registrada tem 8/8; e o portão nega um commit que altera a rota de usuários na cópia
montada sem marcador.
**Pronto quando:** 8 de 8 achadas somando as camadas, F2 e F3 achadas pelo auditor nas duas rodadas, zero alarme
nos controles, resultado gravado. Se faltar alguma, ajustar a lista do portão ou a regra própria e repetir — nunca
afrouxar o gabarito.
**Teste:** `node --test scripts/testes/prova-seguranca.test.mjs` e a rodada completa descrita acima.
**Depende de:** 2, 3, 4a, 4b, 5.

### 7. Skill de arquitetura em linguagem simples `[regente]`
**Arquivos:** `plugins/devconductor-core/skills/arquitetura/SKILL.md` (novo, até 6.000 bytes),
`plugins/devconductor-core/skills/arquitetura/referencias/modelo-decisao.md` (até 25 linhas),
`plugins/devconductor-core/skills/arquitetura/referencias/conferencia.md` (até 60 linhas),
`plugins/devconductor-core/skills/orquestrador/referencias/responsabilidades.json`, `scripts/testes/arquitetura.test.mjs` (novo).
**Regra:** no núcleo (não é plugin novo). Descrição: usar antes de mudança grande em sistema (módulo novo, trocar
banco ou framework, mudar como módulos conversam, dado pessoal novo) e para registrar uma decisão técnica.
- **Decisão escrita:** `modelo-decisao.md` parte do MADR mínimo (`adr/madr`, ramo `develop`, commit `ba75bb1`,
  `template/adr-template-minimal.md`, MIT ou CC0-1.0), traduzido e reduzido. 5 campos, na ordem do MADR:
  **Problema** (contexto em 2–3 frases), **Opções** (2–3, prós e contras em uma linha), **Escolha e por quê**
  ("Escolhida: X, porque…"), **Consequências** (boas e ruins, uma linha cada) e **Como desfazer** (próprio do kit;
  o MADR não tem). Uma linha de **Situação** no topo: proposta, aceita ou substituída por NNN (ideia do registro de
  decisões de Michael Nygard, também usada pelo adr-tools; só a ideia). Fora: "Decision Drivers", "Confirmation" e
  o resto do MADR completo (conflito C9). Grava em `docs/decisoes-tecnicas/NNN-tema.md` do projeto; se o projeto já
  tiver `docs/decisoes.md`, segue o formato dele. Sem sigla sem explicação. Última linha do arquivo: "Estrutura
  adaptada do MADR (MIT OR CC0-1.0)".
- **Conferência antes de mudança grande:** começa por um **mapa em 2 níveis**, em lista, ideia do modelo C4
  (c4model.com, CC BY 4.0, só a ideia e o link): (1) quem usa o sistema e com que sistemas de fora ele conversa;
  (2) quais aplicações e bancos existem e como se falam. Nada de níveis 3–4 nem notação de diagrama (conflito C10).
  Depois: limites entre módulos (quem chama quem, nada de ciclo), direção das dependências, dono de cada dado
  (quem escreve), contrato público que muda, migração com volta, impacto no portão de segurança (parte 3) e custo
  de operar. Regra crítica (contra os agentes de arquitetura recusados): **não propor microsserviço, fila,
  evento ou cache novo sem um problema medido que peça**; a opção mais simples entra sempre entre as opções.
  Com `grafo-codigo` ligado, consulta o grafo antes de abrir arquivos.
- **Convivência:** se `superpowers:brainstorming` estiver ativo, ele cuida do escopo; quando a abordagem escolhida
  muda a estrutura, a decisão é gravada por esta skill (conflito C11). Em `responsabilidades.json`, `arquitetura`
  entra na lista de skills do grupo `devconductor-core` (dono `principal`, uso `tarefa`); nenhuma consultora nova.
- Resultado ao usuário: no máximo 10 linhas, com a recomendação primeiro (ele prefere que se decida por ele).
**Pronto quando:** a skill cabe no limite, aparece em `responsabilidades.json` e o teste passa.
**Teste:** `node --test scripts/testes/arquitetura.test.mjs` (cabeçalho, limite de bytes, os 5 campos e a linha
"Situação" no modelo, crédito "MADR" no modelo, "2 níveis" e os itens da conferência) e
`node --test scripts/testes/responsabilidades.test.mjs`. O registro em `fontes.json`/`NOTICE` é da parte 12.
**Depende de:** nenhuma.

### 8. Arquiteto geral para qualquer stack
**Arquivos:** `plugins/devconductor-core/agents/arquiteto.md` (novo), `plugins/devconductor-core/skills/orquestrador/referencias/agentes.md`,
`README.md` (lista de agentes), `plugins/devconductor-core/skills/orquestrador/SKILL.md` (troca de linha na tabela da
seção 4, mantendo ≤ 7.000 bytes).
**Regra:** `model: opus`, `effort: high`, ferramentas só de leitura (`Read, Grep, Glob, Bash`): lê muito e devolve
pouco (DEV-50). Segue a skill `arquitetura` e lê `arquitetura/referencias/conferencia.md`; devolve em até 30 linhas
o mapa em 2 níveis (ideia do C4: quem usa e com que sistemas conversa; aplicações e bancos), os problemas, a
proposta e o rascunho da decisão no modelo de `modelo-decisao.md` (quem grava é a regente). Não carrega nem copia
os agentes de arquitetura do wshobson (`architect-review`, `backend-architect`, `c4-*`: recusados por inchaço e
modismo) e não propõe peça distribuída sem problema medido. Não substitui `dotnet-architect` nem `database-architect`: chama-se o
geral para decisão entre módulos ou stack mista; o de .NET para detalhe de .NET; o de banco para modelagem.
**Pronto quando:** a tabela de agentes bate com o cabeçalho e o README lista o agente novo.
**Teste:** `node --test scripts/testes/agentes.test.mjs scripts/testes/orquestrador.test.mjs`.
**Depende de:** 3 e 7 (mesmo `SKILL.md` do orquestrador; uma parte por vez).

### 9. Prova de arquitetura, antes e depois `[regente]`
**Arquivos:** `pilotos/prova-arquitetura/pedido.md`, `rubrica.md`, `antes.md`, `depois.md`, `resultado.md` (novos).
**Regra:** pedido fixo sobre a cópia montada da parte 5: "módulo de agenda de entregas: o motorista vê só as
suas, anexa comprovante e o gerente recebe aviso". Gerar o plano com o kit de antes (worktree no commit anterior à
parte 7) e com o de depois. Rubrica de 10 itens (1 ponto cada): limites entre módulos; direção das dependências;
dono de cada dado; decisão registrada no modelo; alternativas; riscos de segurança listados; acesso por motorista
previsto no banco e na API; migração com volta; testes de aceite; linguagem simples. Avaliação às cegas (os dois
planos como A e B embaralhados, por um agente avaliador que não sabe qual é qual).
**Pronto quando:** depois ≥ 8/10 e pelo menos 3 pontos acima do antes; se não, ajustar a skill e repetir.
**Teste:** a própria rubrica preenchida em `resultado.md`, com as notas por item.
**Depende de:** 5, 7, 8.

### 10. Roteiro de auditoria de projeto real
**Arquivos:** `plugins/seguranca/skills/auditoria-projeto/SKILL.md` (novo, até 90 linhas), `scripts/testes/varredura.test.mjs`
(teste de presença).
**Regra:** roda na conversa do projeto auditado, **só lê e relata**:
1. Anota `git status` e o último commit; nada é editado, criado ou commitado no projeto. Ao fim, `git status` igual.
2. Mapa: stack, pontos de entrada, onde está o login, a permissão, o banco (migrações e regras de acesso), o envio
   de arquivo; com grafo, consulta o grafo.
3. `varrer.mjs --historico --saida <pasta temporária fora do repositório>`. `dotnet list package` pode exigir
   `restore` (cria só `obj/`, já ignorado); se não houver `obj/`, pedir OK antes.
4. **Duas passadas por agentes diferentes** (dica do dono, seção "Dicas de quem já faz"):
   - *1ª passada, por lista:* `security-auditor` (`model: "opus"`) por área sensível, com o `portao-seguranca.md`
     inteiro: o que deveria existir e falta (inclusive as dicas: nada sensível no console, token fora do alcance
     de script, limite em login e envio, SQL com parâmetros) e o plano para tampar cada buraco.
   - *2ª passada, de quem ataca:* outro agente (`complex-tasks`, `model: "opus"`), **sem ver o relatório da 1ª**,
     recebendo só o mapa do passo 2 e as seções "Gravidade e fechamento" e "Não é achado" do `portao-seguranca.md`
     (não a lista de perguntas, para não pensar igual): "procure falhas de segurança neste projeto".
   - Junta as duas sem repetir; cada achado com estado **confirmado** ou **pendente de prova** (Strix, via
     `portao-seguranca.md`); pendente vai como "conferir", nunca some. O que **só a 2ª** achou entra em
     "Conhecimento candidato" do relatório como pergunta nova para o `portao-seguranca.md` (não se edita o kit
     durante a auditoria).
5. Banco real: **não** conecta, não roda SQL. Só com OK do dono, ler os avisos de segurança do provedor em modo
   leitura, sem ler linha de dado.
6. Relatório fora do repositório e resumo na conversa: crítico/alto/médio pela régua "Gravidade e fechamento",
   cada um com o que é, onde, estado (confirmado/pendente), qual passada achou, risco real para a empresa, como
   corrigir (com o link OWASP da categoria, já no `portao-seguranca.md`) e esforço; segredo sempre mascarado. Segredo achado no histórico: recomendar
   **trocar a chave**, não reescrever o histórico sem OK.
7. Termina propondo um plano de correção; nada é aplicado até o dono aprovar.
**Pronto quando:** a skill existe, cabe no limite e passa no verificador de skills.
**Teste:** `node --test scripts/testes/varredura.test.mjs` (presença, limite, frases "não altera", "relatório",
"2ª passada", "sem ver o relatório da 1ª" e "pendente de prova").
**Depende de:** 4a e 3 (seções "Gravidade e fechamento" e "Não é achado" do `portao-seguranca.md`).

### 11. Auditoria do sistema de gestão `[difícil]`
**Arquivos:** nenhum neste repositório (no máximo `docs/continuar.md` com a data e onde ficou o relatório).
**Regra:** sessão aberta **no outro projeto**, que já tem `seguranca` ligado (DEV-51). Se o kit lá estiver em versão
anterior às partes 1–10, pedir OK ao dono antes de atualizar a configuração local de plugins. Seguir a skill
`seguranca:auditoria-projeto` ao pé da letra, inclusive as **duas passadas por agentes diferentes** (a 2ª sem ver
o relatório da 1ª). Conferir em especial as dicas recebidas pelo dono: nada sensível no console e nas mensagens de
erro, onde o front guarda o token (nada de `localStorage`/`sessionStorage`/cookie legível por script), limite de
tentativas no login e de tamanho nos envios, SQL só com parâmetros. Depois de o dono aprovar e aplicar correções
(fora desta parte), repetir só a 2ª passada para conferir.
**Pronto quando:** relatório entregue ao dono com as duas passadas identificadas, `git status` do projeto igual ao
do começo; o que só a 2ª passada achou volta a este repositório como "Conhecimento candidato" (sem dado do sistema
de gestão).
**Teste:** comparar `git status --porcelain` e `git rev-parse HEAD` do começo e do fim (iguais).
**Depende de:** 6, 10, 12.

### 12. Versões, catálogo e estado `[sonnet]`
**Arquivos:** `plugins/devconductor-core/.claude-plugin/plugin.json` (0.4.7 → 0.5.0), `plugins/seguranca/.claude-plugin/plugin.json`
(0.1.3 → 0.2.0), `.claude-plugin/marketplace.json` (por `node scripts/atualizar-marketplace.mjs`), `docs/continuar.md`,
`fontes.json`, `NOTICE`, `plugins/devconductor-core/LICENSES/` (novo: `strix.txt`, `claude-code-security-review.txt`,
`madr.txt`, com o texto da licença de cada origem).
**Regra:** uma subida por plugin, no fim (o teste `versoes` compara com a `main` do GitHub; até aqui ele pode falhar,
e isso não é erro das outras partes). Registro das fontes prontas (seção "Fontes prontas avaliadas"):
- `fontes.json` → `origens` novas: `strix` (https://github.com/usestrix/strix, Apache-2.0),
  `anthropic-security-review` (https://github.com/anthropics/claude-code-security-review, MIT), `madr`
  (https://github.com/adr/madr, MIT OR CC0-1.0). `arquivos` novos, no formato das entradas que já existem (se o
  formato aceitar uma origem por entrada, uma entrada por origem com o mesmo `destino`):
  `…/orquestrador/referencias/portao-seguranca.md` ← strix `strix/skills/analysis/severity_calibration.md`,
  `analysis/counterevidence.md`, `vulnerabilities/idor.md`, `vulnerabilities/broken_function_level_authorization.md`
  (commit **de onde a parte 3 copiou**; o local conferido é `03d2c6c168782d59f665de780db64c031e023571`) e ← anthropic
  `.claude/commands/security-review.md` (`0c6a49f1fa56a1d472575da86a94dbc1edb78eda`), `alterado`: "traduzido,
  resumido, sem nomes de ferramentas, exclusões que contrariam o kit retiradas";
  `…/arquitetura/referencias/modelo-decisao.md` ← madr `template/adr-template-minimal.md`
  (`ba75bb1b20d42af5746b246ad348c202419ae681`), `alterado`: "traduzido, campo Como desfazer e linha Situação
  acrescentados". Mais a alteração da `sast-configuration` (parte 4a), se a 4a ainda não registrou.
- `NOTICE` → blocos de `usestrix/strix` (Apache-2.0; conferir se a origem tem arquivo NOTICE e, se tiver, levar o
  texto), `anthropics/claude-code-security-review` (MIT, com a linha de copyright do LICENSE de lá) e `adr/madr`
  (MIT OR CC0-1.0), no padrão dos blocos que já existem. E uma seção curta "Ideias usadas sem copiar texto":
  trailofbits/skills (CC BY-SA 4.0), OWASP Cheat Sheet Series (CC BY-SA 4.0, só links), modelo C4 de Simon Brown
  (CC BY 4.0), registro de decisões de Michael Nygard.
- Conferir que nenhum texto de fonte CC BY-SA, CC BY-NC-SA, GPL ou da licença do Semgrep entrou no kit
  (`git diff` das partes 3, 4b, 7, 8 e 10 contra os originais, por amostra).
**Pronto quando:** testes finais passam com código de saída 0; cada arquivo com trecho de terceiro tem entrada em
`fontes.json`, bloco no `NOTICE` e licença em `LICENSES/`.
**Teste:** os testes finais abaixo.
**Depende de:** 1–10.

## Ordem e paralelo (um escritor por arquivo)
- **Onda 1 (juntas):** 1, 4a, 4b, 5, 7 — arquivos separados.
- **Onda 2:** 2 (depois da 1).
- **Onda 3:** 3 (depois da 2).
- **Onda 4:** 6 (depois de 2, 3, 4a, 4b, 5), 8 (depois de 3 e 7) e 10 (depois de 4a e 3).
- **Onda 5:** 9, depois 12. **Por último:** 11, no outro projeto.
Arquivos disputados: `orquestrador/SKILL.md` (3 e 8, nessa ordem), `prova-seguranca.test.mjs` (5 e 6),
`varredura.test.mjs` (4a e 10), `portao-seguranca.test.mjs` (1 e 2), os `plugin.json` (só a 12), `fontes.json` (4a e
12; `NOTICE` e `LICENSES/` só a 12). A parte 10 agora espera a 3 (seções do `portao-seguranca.md`): roda na onda 4.

## Riscos
- **Falso alarme trava commit à toa** (inclusive neste kit, que tem "token" nos hooks): só linhas adicionadas, lista
  `ignorar`, modo `avisar`, e erro do hook sempre libera.
- **O marcador vira formalidade:** é guia, não barreira contra má-fé; o `revisor` confere nas partes sensíveis e a
  prova mede de verdade.
- **Alertas do GitHub com a prova:** sufixo `.plantado`, segredos genéricos falsos e pasta fora da vitrine.
- **Ferramentas ausentes no GitHub:** testes com `skip`; a camada própria sempre roda; a falta aparece no relatório.
- **osv-scanner precisa de rede** para consultar falhas: com `--sem-rede` o relatório diz "dependências não conferidas".
- **Cadeia de suprimentos das próprias ferramentas** (caso Trivy 2026): instalar só da página oficial ou winget,
  nunca baixar pelo kit, nunca usar ação de terceiros por etiqueta solta.
- **Auditor varia de uma rodada para outra:** duas rodadas e achado só conta se aparecer nas duas.
- **Orçamento do orquestrador** (6.793 de 7.000 bytes): trocar linha, não acrescentar.
- **Relatório do projeto real contém dados sensíveis:** fica fora de qualquer repositório e com segredos mascarados.
- **Licença das fontes prontas:** texto CC BY-SA (Trail of Bits, OWASP, arc42) contaminaria o arquivo do kit (MIT):
  dessas, só ideia em palavras próprias ou link. Texto copiado só de Strix, Anthropic e MADR, com registro (parte 12).
- **Fonte externa atropelar o kit:** exclusões da Anthropic que contrariam regra do kit não entram (C1, C4, C13);
  nenhuma fonte vira skill consultora nova; cada decisão tem uma dona (mapa de responsabilidades).

## O que NÃO fazer
- Plugin novo; copiar regra ou código de ferramenta (Semgrep, gitleaks etc.).
- Copiar texto de fonte fora das 4 aprovadas na seção "Fontes prontas avaliadas", ou de fonte CC BY-SA, CC BY-NC-SA,
  GPL ou licença do Semgrep; copiar sem `fontes.json`, `NOTICE` e licença em `LICENSES/` (parte 12).
- Criar skill consultora a partir das fontes prontas ou carregar agentes de arquitetura/ameaças do wshobson.
- Baixar ou instalar ferramenta automaticamente; usar o Trivy agora.
- Conectar a banco real, rodar SQL ou alterar qualquer arquivo no projeto auditado; reescrever histórico Git.
- Comentário no código da prova que entregue a falha; afrouxar o gabarito para passar.
- Chave com formato de provedor real, mesmo falsa; publicar `pilotos/prova-seguranca` na vitrine.
- Mudar o modelo dos agentes copiados (passa-se `model` na chamada).

## Testes finais
```
node --test "scripts/testes/*.test.mjs"        # conferir o código de saída (0), sem | grep
claude plugin validate .
claude plugin validate plugins/devconductor-core
claude plugin validate plugins/seguranca
node pilotos/prova-seguranca/montar.mjs && node plugins/seguranca/skills/varredura-seguranca/scripts/varrer.mjs <pasta montada>   # deve sair 1
node pilotos/prova-seguranca/medir.mjs <relatorio.json> <achados-auditor.json>   # 8/8, zero alarme nos controles
```

## Ajustes sugeridos para depois (partes já executadas ou em execução: texto delas não foi mudado)
- **Parte 1 (detector):** olhar também **linhas removidas** com palavras das categorias `alto` (`[Authorize]`,
  `RequireAuthorization`, `enable row level security`, `create policy`, validação de upload): remover uma checagem
  hoje sai nível 0. Ideia do `differential-review` da Trail of Bits (conflito C7). Teste novo: diff que só remove
  `[Authorize]` → 2. Até lá, o auditor confere remoções no nível 2 (parte 3).
- **Parte 2 (portão):** a dica do dono de "duas passadas por agentes diferentes" ficou só na auditoria (partes 10 e
  11). No commit, uma segunda passada no Opus a cada mudança de nível 2 dobraria o custo (DEV-50). Sugestão: oferecer
  como opção `duasPassadas: true` em `.devconductor/portao.json`, desligada por padrão. **Decisão do dono.**
- **Parte 5 (prova):** o gabarito não tem falha para as regras novas da 4b (segredo com valor padrão, token em
  `localStorage`, login sem limite de tentativas). Sugestão: F9 "chave de login com valor padrão no código" e F10
  "front guarda o token em `localStorage`", com controle C4 "cookie `HttpOnly`", em execução futura da 5 e da 6.
- **Parte 6 (medição):** a rodada completa passa a medir também quantos achados vieram só da 2ª passada (sinal de
  lacuna no `portao-seguranca.md`).

## Decisões que ficam com o dono (padrão já assumido; trocar só se ele quiser)
1. **Portão trava o commit** em mudança sensível sem revisão (recomendado) — ou só avisa. Ambos ficam disponíveis
   por projeto em `.devconductor/portao.json`.
2. **Sistema da prova em C# + Postgres** (igual ao sistema de gestão, recomendado) — ou TypeScript + Postgres.
3. **GitHub sem gitleaks/osv-scanner por enquanto** (recomendado: roda no computador dele antes de enviar; menos
   peças de terceiros no envio) — ou instalar as duas no fluxo de testes com versão fixa e conferência de assinatura.

## Conhecimento candidato
- Portão de segurança por nível (0 nada · 1 varredura + lista · 2 + `security-auditor` no Opus), marcador dentro de `.git/`.
- osv-scanner não lê `.csproj`: em .NET sem `packages.lock.json`, usar `dotnet list package --vulnerable`.
- Trivy teve release comprometida em mar/2026 (CVE-2026-33634): fora do kit até nova decisão.
- Fonte pronta com licença CC BY-SA (Trail of Bits, OWASP, arc42) entra no kit (MIT) só como ideia ou link; texto
  copiado só de MIT, Apache-2.0 ou CC0, e vira trecho de arquivo com dona, não skill consultora nova.

## Dicas de quem já faz (11/11) — avaliadas antes de entrar
O dono recebeu de um desenvolvedor conhecido o que ele pede para deixar um sistema seguro. Cada dica foi avaliada; entra
só o que se sustenta.

| Dica recebida | Avaliação | Como entra no kit |
|---|---|---|
| Nada sensível visível no console | correta | regra do portão e das verificações próprias (4b): sem senha, token, CPF ou dado pessoal em `console.log`, log do servidor ou mensagem de erro mostrada ao usuário (a falha F8 da prova cobre) |
| "Não salvar o JWT nos cookies" | **correta só pela metade** | o perigo é o token ficar onde o JavaScript da página alcança: `localStorage`, `sessionStorage` ou cookie comum. O recomendado (OWASP) é justamente cookie com `HttpOnly`, `Secure` e `SameSite`, mais proteção contra CSRF, ou token só em memória. A regra do kit fica: "token nunca em `localStorage`/`sessionStorage` nem em cookie legível por script" |
| Tempo limite em todas as entradas | correta, ampliada | toda entrada de fora tem limite: tempo de resposta, tamanho do corpo e do arquivo, número de tentativas por minuto (login principalmente) e validação do formato |
| Verificar injeção de SQL e não deixar entrar | correta | consulta sempre com parâmetros; proibido montar SQL juntando texto (falha F1 e controle C1 da prova) |
| Método em duas passadas: "pense em todos os casos de segurança e monte um plano para tampar os buracos" e depois "com outra visão, procure falhas de segurança neste projeto" | **muito boa** | vira o formato da auditoria (partes 10 e 11) e da revisão do portão: 1ª passada por lista (o que deveria existir e falta), correções, e 2ª passada **por outro agente, sem ver o relatório da primeira**, no papel de quem ataca. O que só a 2ª achar entra na lista da 1ª para a vez seguinte |

Cuidado: muita regra junta não substitui teste. Cada regra acima só vale no kit se tiver uma verificação que falha quando
ela é quebrada (prova com falhas plantadas, parte 6).

