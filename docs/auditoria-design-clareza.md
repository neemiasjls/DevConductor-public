# Auditoria de design — clareza e sistemas (04/11/2026)

Pergunta do Neemias: o que melhorar e o que falta para o kit fazer design **excepcional**, em landing pages e
em sistemas? Entrada: o retorno dele sobre os três sites da rodada Claude (DEV-41), uma leitura das skills do
kit e três pesquisas de mercado (skills/plugins, landing pages premiadas, design de sistemas).
A auditoria de 29/10 (`auditoria-design.md`) tratou do problema oposto, sites parados e iguais, e continua
valendo como histórico. Decisões novas: DEV-41 (retorno e foco) e DEV-42 (cenas fortes + resto discreto).

## Resumo
1. **O kit premiava quantidade de efeito, não clareza.** A cota "uma técnica diferente por seção, pelo menos
   4 famílias" (DEV-34) obrigava a inventar efeito onde não havia motivo, e a revisão reprovava *falta* de
   variedade, nunca *excesso* de confusão. Resultado: o fio do Lúmen e a régua repetida da Prumo.
2. **Nada no fluxo mede o que o visitante entende.** A revisão confere larguras, CLS, foco e contraste, mas não
   tem teste de compreensão, nem limite de texto por tela.
3. **O kit não tem nenhum fluxo de design para sistemas** (painel, tabela, formulário). Tudo de design estava
   pensado para landing page.
4. O que agradou tem um padrão: **objeto ou foto real com um gesto simples** (cadeira 3D, porta do baú). O que
   desagradou também: **diagrama que explica** (fio por dentro, régua com números) e **texto demais**.

## Retorno do Neemias → causa no kit

| O que ele viu | Causa no kit | Correção |
|---|---|---|
| Fio do Lúmen "forçado, sem porquê" | Cota de técnica por seção + "ideia central puxa as outras cenas"; o motivo existia no plano, não para o visitante | DEV-42; teste do porquê feito do ponto de vista de quem visita; "mostrar, não explicar" |
| Degradê "legal, mas confuso" | Cena didática: o visitante precisa ler régua, números e legenda para entender | Cena precisa ser entendida sem legenda em ~3 s; no máximo 4 rótulos visíveis; diagrama só se passar no teste |
| "Muita informação em alguns lugares" | `lp-textos` não tinha limite por tela; cenas acumulavam título + parágrafo + rótulos + ficha | Limites contáveis (título ≤ 8 palavras, apoio ≤ 25, um bloco por tela) e script de densidade na revisão |
| "Coisas sem nexo" na Austral | A linha de temperatura e a régua apareciam em quase toda seção para "costurar" o site | A ideia central aparece na abertura, em uma cena grande e no fechamento, não em toda seção; costura não é obrigatória |
| Gostou da cadeira 3D e da porta do baú | Objeto/foto real que é o próprio serviço, com um gesto | Vira o exemplo de cena-assinatura na `lp-cenas` |

## Pesquisa de mercado (resumo)
- **Clareza (NN/g e Material):** 79% dos visitantes escaneiam e só 16% leem palavra por palavra; texto conciso e
  escaneável rende muito mais. Efeito de scroll não deve carregar o texto principal, deve disparar uma vez e ser
  mais contido em negócio sério. Movimento existe para informar, focar ou expressar, não para decorar.
- **Skills e plugins:** quase nada novo supera o que o kit já tem em landing page. O buraco real era **sistemas**:
  `dashboard-design` (MIT, foco em painel honesto, uma pergunta por tela, QA por print) e `ui-skills`, de ibelick
  (MIT, padrão anti-"cara de IA" para app, auditoria e DESIGN.md). Os dois são texto puro; CLI e scripts ficam fora.
- **Componentes de sistema:** padrão do mercado é shadcn/ui (MIT) sobre Radix/Base UI, com TanStack Table, React
  Hook Form + Zod, Sonner e cmdk. As regras verificáveis vêm de Vercel Web Interface Guidelines, Carbon (tabelas e
  densidade 24/32/40/48 px), GOV.UK (mensagens de erro) e NN/g (estados vazios).
- **Bibliotecas de efeito:** Motion Primitives e Magic UI (MIT) servem de base para primitivas sóbrias.
  React Bits e Animate UI têm Commons Clause (não podem ir dentro do kit); Aceternity e Skiper têm licença própria
  (não usar sem ler os termos). Refero (galeria por MCP) exige conta: fica de fora por decisão do Neemias.

## Plano de ajustes

### Fase 1 — Landing pages: clareza acima de quantidade
1. `regras.md`: DEV-34 ajustada pela DEV-42 e regra nova **LP-12 · Clareza** (uma ideia por tela, limites de
   texto, cena entendida sem legenda, mostrar em vez de explicar).
2. `lp-cenas` e `tecnicas.md`: sai a cota de técnicas; entram as cenas-assinatura (quantas o projeto pedir) com motivo para o visitante,
   o **padrão discreto** das seções de leitura e o **teste do porquê**.
3. `lp-textos`: limites contáveis por tela e por cena; falar do resultado, não ensinar a técnica.
4. `lp-revisao`: seção **Clareza** obrigatória: teste do porquê por efeito, leitura às cegas (alguém que não
   viu o plano descreve cada cena em uma frase) e script novo `densidade.mjs` (palavras por tela).
5. Ajustes de coerência: `lp-maestro`, `lp-direcao-de-arte`, `lp-construcao`, `estilos/`, `estudio-movimento`.

### Fase 2 — Sistemas: plugin novo `design-sistemas`
1. Skill dona `ui-sistemas` (pt-BR): stack padrão, `DESIGN.md` por projeto, regras verificáveis de tela,
   padrões brasileiros (CPF, CNPJ, CEP, telefone, moeda), fluxo construir → revisar com prints e estados.
2. Consultoras importadas, travadas e com crédito: `dashboard-design`, `baseline-ui`, `improve-ui`,
   `create-design-md`, `fixing-accessibility`.
3. Detecção automática em projeto React/Next que não é landing page; orquestrador, README e catálogo.

### Fase 3 — Verificação
Suíte, validate, `skills-do-kit` (segurança das importadas), versões e catálogo, relatório em `continuar.md`.

## Situação (04/11): as três fases feitas
- **Fase 1:** regras, cenas, textos e revisão ajustados. O `densidade.mjs` mediu os três sites da rodada Claude
  (palavras na tela mais cheia, computador/celular): Prumo 95/79, Lúmen 100/98, Austral 126/112. Todos passam
  do limite de 60/45 justamente nos trechos que o Neemias achou confusos (degradê, fio, viagem): a régua pega o
  problema que ele viu.
- **Fase 2:** plugin `design-sistemas` 0.1.0. Teste da skill em 2 rodadas com agentes: sem ela, erraram o vazio
  (um texto para tudo), o erro do servidor (só aviso), formulário longo em janela, CNPJ só com números, "Ativo"
  colorido, confirmação para ação reversível e filtros que somem; com ela, acertaram todos esses pontos.
  `modelos/br.ts` testado (CNPJ com letras pelo exemplo oficial da Receita, CEP com reserva, dinheiro e datas).
- **Fase 3:** suíte com 321 testes passando (2 pulados por serem só de Linux) e validate do catálogo e dos
  plugins mexidos.

## Prova da LP-12 (04/11/2026, à noite)
Refeitas só as duas cenas criticadas (DEV-41), sem mexer no resto dos sites. Detalhes e teste do porquê nos
`plano.md` de cada site (seção "Refeito pela LP-12 / DEV-42").
- **Prumo, degradê — calibrado.** A foto real ficou; régua de milímetros, 6 números e o bloco de medida saíram.
  Um gesto: a linha cobre sobe da nuca ao alto, como a máquina, e acende a foto por onde passa; 3 marcas.
- **Lúmen, fio — trocado.** O fio desenhado (aula de cutícula, preso 2,4 telas) falhou no teste do porquê e virou
  seção de leitura: foto do serviço de perto (óleo numa mecha), título e um apoio, sem prender. Saiu o Lottie.

| Medida | Prumo antes → depois | Lúmen antes → depois |
|---|---|---|
| Palavras na tela mais cheia da cena (computador/celular, limite 60/45) | 59/52 → 45/45 | 95/ok → 29/ok |
| Leitura às cegas (agente só com os prints) | entendeu; apontou começo escuro, marcas soltas, frase vaga e vazio no celular (corrigidos) | entendeu em ~3 s |
| Comportamento (`ferramentas/comportamento.mjs`) | aprovado → aprovado (14 cenários) | aprovado → aprovado |
| Lighthouse 13.6 celular, 3 rodadas intercaladas (nota; TBT) | 98/98/99; 120–170 ms → 98/99/99; 120–170 ms | 89/84/87; 310–470 ms → 88/87/89; 260–320 ms |

CLS 0 e LCP iguais nos dois. Prints antes/depois (locais, fora do git): `prumo-barbearia/revisao/prints-antes-b/` e
`degrade-telas-7/`; `lumen-salao/revisao/prints-antes/` e `prints-novo-1/`.
O que a prova ensinou ao kit (landing-pages 0.3.8): calibrar quando o objeto é real, trocar quando a cena é aula
(`lp-cenas`); e a armadilha da `secao-cobre-cena`: tirar o "prender" de uma cena exige tirar a margem negativa da
seção seguinte. Fora do escopo e ainda acima do limite: Manifesto e Serviços do Prumo; abertura, cronograma,
serviços e agendar do Lúmen.

## Segunda rodada da LP-12 (05/11/2026)
A mesma régua no resto das telas acima do limite, calibrando (nenhuma cena trocada; movimento mantido). Detalhes em
cada `plano.md` ("Segunda rodada da LP-12").
- **Prumo:** apoio do Manifesto virou uma frase (a escala de pentes já aparece no degradê); Serviços e Horários como
  seções de leitura; crédito de foto só no rodapé.
- **Lúmen:** apoios encurtados; notas do cronograma viraram rótulos ("No salão"/"Em casa"); Agendar com título, apoio
  e botão; contatos e horários foram para o rodapé (que estava sem eles).
- **Austral:** na Viagem só o marco atual mostra o texto; eixo com 4 rótulos; saíram o leitor mín/máx e a introdução.

| Medida | Prumo | Lúmen | Austral |
|---|---|---|---|
| Tela mais cheia (computador/celular, limite 60/45) | 95/79 → 44/44 | 84/98 → 55/45 | 126/112 → 53/51* |
| Comportamento | aprovado | aprovado (2×) | aprovado |
| Lighthouse celular, médias de 3 intercaladas (nota; TBT) | 99 → 99; 108 → 108 ms | 90 → 92; 232 → 199 ms | 95 → 95; 115 → 121 ms |

CLS 0 em todos. *A tela de 51 é a entrada da cena presa, junto da última frase do Compromisso; fica, com motivo no
plano. No reduzido, a abertura do Prumo (4 legendas da cadeira) e a Viagem (5 marcos) aparecem inteiras em lista,
acima do limite de propósito: é a versão completa sem movimento.

## O que não muda
Celular equivalente, movimento reduzido completo, LP-11 (nada de desenho infantil, tom por nicho), 3D real
com GLB + HDRI, desempenho e as cenas grandes com motivo. Os sites de exemplo não são refeitos agora.

## Depois desta rodada
- Provar as regras novas num site: refazer só a cena do degradê (Prumo) e a do fio (Lúmen) seguindo a LP-12 e
  comparar antes/depois. Ou esperar o próximo cliente real.
- Lúmen no celular (nota 78): adiar o shader de reflexo e medir de novo.
- Figma está instalado, mas precisa de autenticação (`/mcp`) para virar ferramenta de referência.
