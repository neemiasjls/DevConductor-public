# Onde paramos
> Último turno: Claude (2026-11-05)

## DevConductor open source (DEV-49) — pronto, falta o Neemias tornar público (05/11)

- `neemiasjls/DevConductor` recriado com **histórico novo** (1 commit, ainda PRIVADO). CI Linux e Windows no GitHub.
- Histórico antigo (189 commits, todas as branches): o repositório antigo foi **renomeado** para
  `neemiasjls/DevConductor-historico` (privado). Remoto local `revisoes` aponta para ele; o `vigia-codex.ps1` envia
  as revisões para lá (assim a branch `codex/revisoes`, feita sobre o histórico antigo, nunca vai para o público).
- Pilotos de clientes (transportadora v1/v2, salão), capturas de comparação e o `continuar.md` antigo inteiro:
  `neemiasjls/devconductor-clientes` (privado), pasta irmã `PROJETOS/devconductor-clientes` (com o launch.json deles).
- Aqui: nomes de cliente generalizados, caminhos da máquina trocados por `<usuario>`, `.claude/settings.json` usa o
  marketplace do GitHub (o caminho local foi para `settings.local.json`), sem `vitrine.json` (não gera mais vitrine).
  README da raiz é o público; o antigo virou `docs/guia-completo.md`. gitleaks sem achados no repositório novo.
- **Falta (Neemias):** `gh repo edit neemiasjls/DevConductor --visibility public --accept-visibility-change-consequences`
  e dizer se pode apagar o `neemiasjls/DevConductor-vitrine` (engano de rota).

## Mapas no README (05/11)

- README do DevConductor com dois mapas (peças do kit e fluxo de um pedido), commit `b2659cf`; a vitrine pega na
  próxima subida.
- Sistema de Gestão ganhou `README.md` com mapa da arquitetura, dos módulos e dos fluxos, sem dados da empresa.
  **Não commitado** lá (o repositório tem mudanças do Neemias em andamento); commitar quando ele pedir.
- Vitrines da Agenda e do qrcode-manager PUBLICAS (05/11, gitleaks sem achados). Sistema de Gestão: vitrine ainda não existe (Neemias escolhe o caminho).
- Regra de delegação refinada no CLAUDE.md global (DEV-50): subagente só quando o volume paga a passagem.

## Segunda rodada da LP-12 nos sites da rodada Claude — feita, falta o Neemias olhar (05/11)

- Mesma régua da prova de 04/11 no resto das telas acima do limite, **calibrando** (nenhuma cena trocada, movimento
  mantido). Tabela antes/depois em `docs/auditoria-design-clareza.md` ("Segunda rodada da LP-12"); decisões nos
  `plano.md` dos três sites. Commit `4a3b59e` (sites), `1f3cebc` (kit: landing-pages 0.3.11, lição na `lp-cenas`).
- Densidade (tela mais cheia, computador/celular, limite 60/45): Prumo 95/79 → 44/44; Lúmen 84/98 → 55/45; Austral
  126/112 → 53/51 (a de 51 é a entrada da cena da viagem, com motivo no plano). Comportamento aprovado nos três;
  Lighthouse celular sem piora (Lúmen até melhorou: 90 → 92). Reduzido completo.
- **Para o Neemias aprovar:** (1) Austral, cena da viagem: só o marco atual mostra o texto (decisão mais forte desta
  rodada; se preferir todos visíveis, voltar ao `f03286f`); (2) Lúmen: contatos e horários saíram da seção Agendar e
  foram para o rodapé; (3) os textos mais curtos em geral (Manifesto do Prumo, abertura e cronograma do Lúmen).
  Previews: `claude-austral` (5201), `claude-lumen` (5202, só `localhost`), `claude-prumo` (5203).
- Vídeos da vitrine (`vitrine/rodada-claude/`) regravados com as versões novas e conferidos (`verificacao-videos.json`
  aprovado). A gravação com o 3D no SwiftShader fica lenta: compensar com menos `--segundos` no `gravar-rolagem`
  (passos = segundos × 20) para manter as durações (~40/23 s Austral, 31/21 s Lúmen, 49/28 s Prumo).

## Modo autônomo (04/11, noite) — vale para Claude e Codex

- O Neemias saiu do PC: **tomar todas as decisões sozinho**, sem caixa de pergunta nem espera por aprovação.
  Escolher a opção recomendada, anotar a escolha aqui e seguir (DEV-25). Commit e push na main liberados
  (um por assunto, suíte e validate passando, autoria só dele). Não publicar site.
- Troca de turno: o vigia na Área de Trabalho chama o Codex (GPT-6.1 Sol, high) se o limite do Claude acabar.
- **Feito: prova da LP-12** (degradê do Prumo e fio do Lúmen). Resultado e tabela antes/depois em
  `docs/auditoria-design-clareza.md` ("Prova da LP-12"); decisões nos `plano.md` dos dois sites.
  Escolhas tomadas sozinho (recomendadas): **Prumo calibrado** (foto fica; régua e 6 números saem; uma linha sobe
  como a máquina e acende a foto; 3 marcas). **Lúmen: o fio desenhado saiu** (falhou no teste do porquê; o brilho já
  aparece no Resultado) e a seção 02 virou leitura discreta com a foto do serviço de perto, sem prender; Lottie
  removido. Densidade da cena 59/52 → 45/45 (Prumo) e 95 → 29 (Lúmen); comportamento aprovado nos dois; Lighthouse
  celular sem piora. Kit: landing-pages 0.3.8 (`lp-cenas`: calibrar × trocar; `secao-cobre-cena`: tirar a margem
  negativa quando a cena anterior deixa de prender).
- **Para o Neemias olhar ao acordar:** abrir os previews `claude-prumo` (5203) e `claude-lumen` (5202, só em
  `localhost`) na seção "Degradê" e na 02 do Lúmen e dizer se gostou. A troca do fio por foto é a decisão mais forte
  desta noite: se ele preferir manter um fio desenhado, o antigo está no git (`a2235be`).
- Próximo passo desta seção: feito em 05/11 (ver "Segunda rodada da LP-12" no topo).

## Opus decide o que desce (DEV-48) — feita (04/11)

- Ajusta a DEV-47 a pedido do Neemias (quer o Opus no que importa e delegação de verdade, porque hoje quase tudo
  roda no Opus). Núcleo 0.4.1: `executor` volta ao Opus (medium); o `planejador` marca a parte `[sonnet]`
  (padrão existente + teste objetivo), que roda no `executor` com `model: "sonnet"`; `[regente]` fica na
  principal. Prints/navegador e suíte longa sempre no `testador` (haiku); `pesquisador` passou a sonnet.
- CLAUDE.md global alinhado com a DEV-48 (04/11, com OK do Neemias) e espelhado no Codex.
  Medir em ~11/11: `node scripts/medir-uso.mjs --todos --de 2026-11-05`.

## Agentes por função (DEV-47) — feita (04/11)

- Núcleo 0.4.0: agentes novos `planejador` (opus, high; grava o plano em `docs/planos/`), `executor` (sonnet,
  medium; uma parte por agente) e `revisor` (opus, medium; só aponta falhas). Orquestrador: regente → planejador →
  executor → testador → revisor; tabela em `orquestrador/referencias/agentes.md`; teste novo `agentes`.
- Conferido: `opusplan` existe, mas só pelo `/model` ou settings do usuário/projeto (plugin não define); o app não deixa
  a sessão trocar o próprio modelo/esforço, então a regente pede ao Neemias.
- Próximo: usar numa tarefa grande real e medir (`node scripts/medir-uso.mjs --todos --de 2026-11-05`, linha "por modelo") se o Sonnet
  passa a fazer a execução.

## Economia de tokens (DEV-46) — feita (04/11)

- Medição de 7 dias: 97% das respostas no Opus; metade do consumo veio de 3 agentes "construir site" no Opus
  (290–430 respostas cada); principal a ~232 mil por resposta; agente nasce com ~72 mil, sessão com ~98 mil.
- Núcleo 0.3.1: agentes com esforço fixo e limite (~40 chamadas, resposta ≤15 linhas); hook novo
  `agente-longo` (pede a entrega a cada 40 chamadas); `conversa-longa` avisa em 150 mil e a cada +50 mil,
  também na tela; orquestrador com a política (plano no Opus, tarefas fechadas em agentes `sonnet` novos,
  trabalho longo em partes, nada de `fork`, esforço médio por padrão). `medir-uso` mostra uso por modelo.
- Medir o efeito depois de uma semana de uso: `node scripts/medir-uso.mjs --todos --de 2026-11-05`
  (olhar a linha "por modelo" e o contexto por resposta de principal e agentes).
- Falta (decisão do Neemias, fora do kit): desligar no app os conectores que ele não usa no dia a dia (Meta
  Ads, Higgsfield, Adobe, Canva, Supabase...), que engordam a base fixa de toda sessão e agente.

## Auditoria de design (DEV-41) — Fases 1, 2 e 3 feitas (04/11)

- Pedido: design excepcional em landing pages e em sistemas, ajustando o kit (sem refazer os sites).
  Plano, pesquisa e resultado: `docs/auditoria-design-clareza.md`.
- Fase 1 (landing-pages 0.3.5, estudio-design 0.2.1): DEV-42 (cenas fortes + resto discreto) e LP-12
  (clareza) em `lp-maestro/regras.md`; teste do porquê na `lp-cenas`; limites na `lp-textos`; seção
  "0. Clareza" na `lp-revisao` com `scripts/densidade.mjs` (60/45 palavras por tela; `data-leitura` nas
  seções de leitura). Os três sites da rodada Claude passam do limite onde o Neemias achou confuso.
- Fase 2 (design-sistemas 0.1.0, núcleo 0.2.3): skill `ui-sistemas` + DESIGN.md no formato do Google
  (`npx -y -p @google/design.md designmd lint`) + `modelos/br.ts` testado + 5 consultoras travadas
  (créditos em NOTICE, `fontes.json` e `FONTES.md`). Liga em React/Next com sinais de sistema.
- Graphify (grafo-codigo 0.2.6): a CLI está em `~/.local/bin`, fora do PATH do Windows; os hooks agora a
  acham e passam o caminho completo. `pipx ensurepath` resolveria de vez, só se o Neemias pedir.
- Paper retirado do kit (DEV-39). Suíte: 321 ok, 2 pulados (só Linux); validate ok.
- Falta: Neemias confirmar a DEV-44 e os limites da LP-12 e aprovar as duas cenas refeitas (prova feita em
  04/11 à noite, ver o topo).
- Codex: o trabalho de 30/10 foi commitado em 04/11 (seção "Trabalho do Codex de 30/10").

## Rodada Claude (DEV-36) — ENTREGUE (04/11)

- Austral Frio, Lúmen Salão e Prumo Barbearia prontos, testados (planos com seção "Testes") e enviados:
  commits `a2235be` (sites, medições, vitrine, relatório) e `fc6a7ce` (vídeos), push na main.
  O push único (67 MB) dava "Internal Server Error" no GitHub; dividido em dois, passou.
- Vídeos: `pilotos/prova-design/vitrine/rodada-claude/` (6 webm + quadros, `verificacao-videos.json` aprovado).
- Medições das duas rodadas na mesma máquina: `vitrine/rodada-claude/medicoes-04-11/resumo.md`.
- Relatório: `docs/prova-design-claude.md`. Vitrine: grupo "Exemplos · Claude" (no commit, só essa seção foi
  aplicada sobre a versão do HEAD; as mudanças pendentes do Codex na vitrine continuam fora do commit).
- Prints de revisão ficam locais (`.gitignore` igual ao da rodada Codex); caminhos locais tirados dos JSON.
- Previews: `.claude/launch.json` ganhou claude-austral/lumen/prumo (5201–5203; Lúmen só em `localhost`).
- Lúmen no celular — feito (04/11, `12e30cb`): o reflexo WebGL só nasce depois do `load` + `requestIdleCallback`
  (até 2,5 s) e a foto vem por `fetch` + `createImageBitmap`. Lighthouse 13.6 celular (3 rodadas, flags do
  `medir-todos.mjs`): nota 78 → 87–89, TBT 650 → 300–350 ms. Com o shader bloqueado dá 93–94 (TBT ~150): o resto
  é a criação do WebGL no SwiftShader do teste. `medicoes-04-11` não foi refeita.
- Teste de comportamento do Lúmen (`e50de56`): a checagem "etapa focada coberta na volta do reduzido" nunca
  tinha passado (entrou depois da rodada 4). Bug real: na troca, o ScrollTrigger joga a rolagem para o topo antes
  de o fio ler onde estava o foco; agora usa a última rolagem vista. Junto: o botão magnético ficava com
  `translate(0,0)` no reduzido. `revisao/comportamento-5` aprovada (390 e 1440), repetida 2×.
- Falta: aprovação visual do Neemias; aparelho físico (shader do Lúmen, geada da Austral, cadeira 3D da Prumo).

## Trabalho do Codex de 30/10 — commitado (04/11)

- Lastro (`1cf286a`): cena 3D com caixa de polpa e doze ovos no lugar do caixote (DEV-38); modelo Innerscene
  CC0 otimizado (`ovos.glb`, ~370 KB), fonte e hashes em `fontes.json`, crédito no `NOTICE` e no rodapé.
  QA 12/12 em `lastro-cargas/revisao/ovos-30-10`; comportamento 2/2 em `vitrine/ovos-comportamento-30-10`.
- Coral (`a96f39a`): fotos que mostram o penteado nomeado (cachos de verdade), "De perto" sem a distorção RGB,
  WhatsApp volta a entrar a cada retorno. QA 12/12 em `revisao/coral-final-30-10` (DEV-37).
- Decisões DEV-37/38 e `docs/prova-design.md` (`ea333d4`); vitrine (`1af10a8`): Lastro com ovos
  (`ovos-30-10`), Coral de `ajustes-conteudo-30-10`, galeria com os vídeos da Seco no lugar certo e sem o
  link para `medicoes-refino-codex-30-10` (não existia).
- Kit (`b0635e9`): lições em `lp-assets` (foto precisa mostrar o serviço nomeado) e `lp-revisao` (exercitar
  interações várias vezes); landing-pages 0.3.7 (a 0.3.6 já tinha sido usada hoje).
- `AberturaRodoviaria.tsx` (versão do caminhão, sem uso) apagado com OK do Neemias (04/11). Ficaram fora, de propósito: `ovos-original.glb` (1,9 MB, não usado; ignorado),
  `vitrine/coral-fotos-30-10` e o Lastro de `ajustes-conteudo-30-10` (substituídos; ignorados).
- Falta: aprovação visual do Neemias nos sites atuais; teste em aparelho físico.

## Rodada Claude (DEV-36) — histórico do início (30/10)

- Planos escritos: `pilotos/prova-design/rodada-claude/{austral-frio,lumen-salao,prumo-barbearia}/plano.md`
  (transportadora refrigerada/editorial-serio, salão de terapia capilar/luxo-editorial, barbearia de corte
  técnico/tecnologico-escuro com cadeira GLB Poly Haven CC0). Brief comum: `rodada-claude/brief-construcao.md`.
- Construção delegada a um subagente por site (portas 5201/5202/5203). Depois: vídeos e medições em série
  (`vitrine/rodada-claude/`), grupo "Exemplos · Claude" na vitrine, relatório `docs/prova-design-claude.md`,
  suíte + validate, commit/push na main (liberado pelo pedido de 30/10) e CI.
- Se a sessão cair: conferir o que cada pasta já tem (build, `revisao/`, seção "Testes" do plano) antes de refazer.

## Refino Codex concluído — 30/10

O usuário escolheu explicitamente “Refinar os exemplos do Codex”, sem acionar o Claude. Refino concluído:
Lastro com textos menores, percurso mais curto e hodômetro menos demorado; Coral com abertura mais leve,
controles melhor distribuídos e cortinas mais curtas; Seco com título dos cortes inteiro no celular,
montagem menos dispersa e faixas mais lentas. Cenas e identidades preservadas.

- Três builds repetidos em30/10 aprovados; matriz36/36 e complementos de teclado, pausa, reduzido dinâmico,
  mídia indisponível, toque/retorno e valores visíveis do hodômetro aprovados. Detalhes e evidências em
  `docs/refino-exemplos-codex.md`. Não repetir a construção ou os testes já aprovados.
- Seis vídeos/36 quadros em `pilotos/prova-design/vitrine/refino-codex-30-10/`, dimensões/duração/busca
  verificadas por ffprobe/ffmpeg; galeria gerada. Vitrine5196 aponta para o refino e oferece “Codex antes
  do refino”, preservando `pos-critica-29-10/`. O grupo Claude continua reservado e vazio.
- Previews reiniciados: Lastro5195, Coral5194, Seco localhost5183 e vitrine5196. Nenhum gravador ativo.
- Nenhum plugin/dependência/asset externo novo neste refino; sem commit, envio, publicação ou mudanças
  globais. Lighthouse não foi repetido; métricas antigas não são resultado do refino. Aprovação visual
  do usuário e experiência em aparelho físico permanecem abertas.

**Próximo:** a rodada separada do Claude, quando ele assumir, seguindo as instruções abaixo. Não chamar
outro modelo nem classificar trabalho Codex como Claude para preencher o grupo. Não reabrir clientes pausados.

## Próximo passo do Claude — novos exemplos em rodada separada (pedido do Neemias, 29/10)

**Ler primeiro:** `pilotos/prova-design/rodada-claude/README.md` e DEV-36 em `docs/decisoes.md`.
O Neemias gostou muito dos exemplos atuais e da originalidade, mas achou algumas coisas levemente
exageradas. Quer novos sites de exemplo parecidos, com escala/ritmo/efeitos mais bem calibrados, mantendo
personalidade e movimento. Não interpretar como ordem para voltar a sites sóbrios iguais ou cortar cenas.

**Separação solicitada:** Lastro Cargas, Estúdio Coral e Barbearia Seco ficam na **rodada Codex** apresentada
nesta conversa. O Claude deve construir **outra rodada**, em `pilotos/prova-design/rodada-claude/<slug>/`,
com seus próprios planos, sites, vídeos, medições e relatório. A vitrine deve manter grupos “Codex” e
“Claude”, lado a lado na comparação; não substituir nem renomear os exemplos atuais como novos do Claude.
O grupo identifica a versão apresentada/consolidada: os exemplos atuais já tinham construção anterior à
retomada e receberam contribuições dos dois. Preservar essa procedência e o histórico.

O pedido anterior foi **deixar a próxima construção documentada para o Claude**, não iniciar outra sessão dele
nem fabricar exemplos pendentes. O grupo Claude está reservado na vitrine e ainda não tem sites.
Ao retomar, seguir o roteiro da pasta: outros exemplos fictícios dos mesmos nichos, direções próprias e
originalidade semelhante, refinando os excessos. Sem material de clientes reais, mudanças globais,
commit/push/publicação ou skills novas sem análise prévia (DEV-35).

## Rodada Codex concluída — correções e evidências (29/10, noite)

- Auditoria de segurança concluída: `docs/auditoria-seguranca-skills.md`; nenhum scanner novo instalado.
- Crítica independente em `.codex/resposta-prova-design.md`, tratada em `docs/prova-design.md`; não repetir
  a construção nem agendar outra revisão antiga. Lastro: sticky/percurso reservado, reduzido dinâmico,
  foco nas docas, cache das medidas das legendas, navegação móvel/salto e foto em passagem contínua.
  Coral: contraste, agenda, textura móvel, pausa/retomada e suspensão quando encoberta/fora da tela/aba,
  foco no CTA da esteira. Seco: lupa em cor normal, descrições móveis, pausa das faixas e atalho livre.
- Três builds aprovados; matriz36/36 em `pilotos/prova-design/vitrine/qa-pos-critica-29-10/`.
  Comportamento complementar em `revisao-critica-29-10-r3` e `revisao-critica-29-10-coral-cobertura`.
  Lastro: fontes dos grandes saltos identificadas; probe nativo após correção0/0,0009 celular/desktop;
  medição programática complementar0,001/0,001, com tarefas longas ainda presentes.
- Seis vídeos e36 quadros finais em `vitrine/pos-critica-29-10/`, verificados por ffprobe/ffmpeg;
  vitrine http://127.0.0.1:5196/ aberta no navegador. Previews Lastro5195, Coral5194, Seco localhost5183.
- Kit landing-pages0.3.3/catálogo atualizados; suíte final **308 aprovados,2 pulados,0 falhas, saída0**,
  log `pilotos/testes-temporarios/validacao-pos-critica-29-10-r2.log`; validate raiz/landing-pages aprovados.
  A primeira suíte só falhou por cache Python da auditoria dentro do plugin; cache preservado em
  `pilotos/testes-temporarios/auditoria-skills-29-10/`, sem mudar o núcleo nem enfraquecer o teste de versão.
- Sem commit, envio ou publicação neste turno. Limites: aparelho físico e experiência completa sem JS
  não validados; notas da crítica não foram recalculadas. Apreciação geral do Neemias não é aprovação
  automática de cada detalhe ou certificação de prêmio. Não reabrir clientes pausados.

## Histórico: prova de design (Fase 4) — estado às 22h de 29/10 (superado acima)
- Feito e enviado (c91127d): 3 sites em `pilotos/prova-design/`, vitrine `vitrine/final/galeria.html`, medições
  `vitrine/medicoes-final/resumo.md` (celular 94/81/95 contra 69/51 dos pilotos), relatório `docs/prova-design.md`,
  lições no kit (landing-pages 0.3.2). Suíte 308/310, 0 falhas; validate ok.
- Falta: revisão crítica do Codex (cota dele acabou; agendada para 22h45 com as folhas em `.codex/folha-*.jpg`,
  pedido `.codex/pedido-prova-design.md`, resposta `.codex/resposta-prova-design.md`), tratar os achados e
  completar a seção do Codex no relatório.

## Retomada do Codex — prova de design (29/10, 17h56)

Prioridade real é a Fase 4 abaixo; renomeação já concluída, não repetir. Três sites já tinham implementação
local sem commit. Preservados arquivos, servidores existentes e clientes antigos. Coral: build aprovado,
revisor técnico 12/12 (seis larguras × normal/reduzido) e complemento de teclado, mensagem por serviço,
troca dinâmica de movimento reduzido, resize e falha da animação Lottie aprovados. Evidências em
`pilotos/prova-design/estudio-coral/revisao/retomada-29-10` e `comportamento-29-10`; fontes/créditos em `assets.md`.
Lastro: revisão encontrou pôster inexistente; correção e QA em andamento. Barbearia: corrigida preferência
dinâmica de movimento reduzido no Lenis; testes de interação aprovados. Kit: correção de coerência entre
ID/URL de licença Creative Commons e exceções de estilo da revisão, 10/10 selecionados aprovados.
Ainda falta fechar vídeos desktop/celular, medições comparáveis em produção, crítica independente e relatório
`docs/prova-design.md`, subir versão de landing-pages e validar suíte/manifestos. Sem commit/push/publicação
ou configuração global. Preview adicional próprio Coral em 5194 (build); não encerrar servidores de outros turnos.

## Histórico: auditoria de design — 29/10
- Relatório e plano: `docs/auditoria-design.md` (duas leituras independentes, mesmo diagnóstico).
- Causa principal: regras de contenção (LP-09, DEV-11) e só 4 estilos sóbrios; atropelo de skills é secundário.
- Feito (Fases 1–2): globais de design movidas para `~/.claude/skills-backup-design` (com LEIA.txt);
  `paper-desktop` desinstalado; `design-paper` fora da detecção padrão (só por marcador `.design-paper`);
  orçamento de movimento (DEV-34) em regras.md, maestro, cenas, construção, direção de arte, estilos, estúdio
  e 19 receitas; revisão independente achou 2 limites antigos restantes, corrigidos.
- Fase 3 feita: `lp-cenas/tecnicas.md` (roteiro de movimento, famílias de técnica, variedade obrigatória);
  3 estilos ousados (cinético vibrante, imersivo 3D, brutalista gráfico) sem página de exemplo ainda;
  consultoras novas travadas e verificadas: `motion-design` (lottiefiles) e 6 `threejs-*` (CloudAI-X);
  `find-animation-opportunities`/`emil` restritas a controles da interface. Receitas novas (não testadas em
  cliente): lottie-progresso, rive-estados, modelo-3d-real, distorcao-imagem, versões conferidas no npm.
- Próximo: Fase 4 — 3 sites fictícios (transportadora com `imersivo-3d`, salão com `cinetico-vibrante` ou
  `luxo-editorial` + técnicas novas, barbearia/restaurante com `brutalista-grafico`), vídeo da rolagem em
  computador e celular, comparação com os pilotos e revisão crítica independente. Fazer numa sessão nova.
- Falta testar: o detector anti-IA da `lp-revisao` ainda pode acusar faixa infinita/contador restilizados.

## Revisão local das alterações — 29/10

- Revisados os dois arquivos alterados do instalador; um achado sobre restauração incompleta do catálogo após falha na migração. Nenhuma correção de código.
- Suíte completa: 293 aprovados, 11 pulados, zero falhas, saída 0. CLI de validação indisponível neste terminal.
- Próximo: tratar o achado e validar a migração com falha após remoção do catálogo. Sem commit/push; nenhum conhecimento duradouro novo para gravar.

## Revisão local das alterações — 27/10

- Alterações staged, unstaged e não rastreadas revisadas, incluindo a migração dos IDs legados; nenhum achado acionável. Nenhuma correção de código.
- Suíte: 290 aprovados, 11 pulados, zero falhas, saída 0; `git diff --check` aprovado. CLI `claude` fora do PATH: validação de plugins não executada neste terminal.
- Próximo: validação pela CLI em ambiente disponível; commit/push somente quando solicitado. Nenhum conhecimento novo para gravar na memória.

## Renomeação interna DevConductor (DEV-31) — 27/10

- Começada pelo Codex em 26/10 (pedido do Neemias: seguir sozinho) e interrompida sem registro; terminada pelo Claude em 27/10.
- Núcleo: plugins/devconductor-core 0.2.0, marketplace `devconductor`. Instalações antigas (`devagents-core@devagents`) migram pelo
  scripts/instalar.mjs; o detector respeita escolhas legadas `@devagents` (teste scripts/testes/renomeacao.test.mjs).
- Claude: detector mostra o motivo da falha da CLI ao instalar stack (o teste novo do Codex pegou isso); autor DevConductor nos
  plugin.json (versões subidas), licença das receitas, comentários do scanner; `DEVCONDUCTOR_AVISO=0` desliga o aviso (antigo ainda vale).
- Mantidos de propósito: nomes de arquivos de estado (devagents/verificados.json, marcas em tmp, .devagents-estado.json do grafo) e
  referências históricas do ensaio em scripts/lib/qualidade-ensaio.mjs.
- Verificação: suíte 299/301, 2 pulados, 0 falhas, saída 0; validate raiz e plugins aprovados. Caminho velho no CLAUDE.md
  (falsos-positivos) e texto do find-skills no fontes.json corrigidos. Commit 3c51926, enviado em 28/10.
- Revisão do Codex (codex review --uncommitted): nenhum achado.
- **Instalação local migrada (29/10, aceite do Neemias):** o instalar.mjs só migrava com a CLI falsa; a real mantinha
  o catálogo como "devagents" ("already on disk"). Agora, se o add responde com o nome antigo, retira (`marketplace remove
  devagents --scope local`) e registra de novo; falha depois disso avisa que basta rodar de novo (achado do Codex). Verificado
  ponta a ponta com a CLI real em configuração isolada (dois projetos, escolha desligada preservada, repetir não muda nada).
  Migrados DevAgents, pilotos/cliente-salao (repositório privado) e pilotos/teste-especialista: tudo @devconductor carregando; catálogo antigo
  fora da máquina. Worktree do Sistema de Gestão não existe mais. As 45 cópias do ensaio ficaram como estavam (provas).
  .claude/settings.json do projeto e README atualizados. Suíte 303/305, 2 pulados, 0 falhas. Sem commit.

## Retomada conferida em 26/10, 23:06

Passagem do turno anterior e planos conferidos. Antes deste registro, a árvore estava limpa; HEAD e
origin/main local coincidiam em `6113009`, com remote `neemiasjls/DevConductor`. Nenhuma implementação
interrompida foi encontrada. Permanecem as decisões: D3 adiada até cliente real, D4 exige cliente novo,
renomeação interna adiada e instalação global do Graphify somente com aceite específico. Não repetir
ensaios concluídos nem reabrir clientes pausados. Somente esta passagem foi atualizada; sem commit/push.

## Para o Codex continuar (26/10)

- Tudo commitado e enviado para github.com/neemiasjls/DevConductor (privado); main igual ao origin. Suíte 283/285, 2 pulados, 0 falhas.
- Nenhuma tarefa de código pendente. D3 adiada até haver cliente (DEV-32); D4 precisa de cliente novo real. Não inventar cliente nem repetir ensaios.
- Se o Neemias pedir algo novo: seguir CLAUDE.md do projeto (testes com código de saída, `claude plugin validate`, subir versão do plugin mexido).
- Commit/push só quando ele pedir, só no nome dele, sem coautor nem menção a IA. Rename interno para DevConductor (DEV-31) ainda não feito.
- Opcional oferecido: instalar a CLI do Graphify (`uv tool install graphifyy`), só com o aceite dele.

## Tudo no GitHub (26/10, noite)

Repositório renomeado para neemiasjls/DevConductor (privado); remote local atualizado. Trabalho pendente em 9 commits
por assunto e mais 4 com skills de terceiros, vídeos Transportadora, salão (cliente) e estudos visuais. Ficam fora: perfis de navegador
(cookies), config-claude, settings.local, node_modules, dist, cópias de teste e unitedcarriers.com.webm (>100 MB).
O .git vazio do salão foi para .codex/cliente-salao.git-vazio. web-design-guidelines registrada no fontes.json.


## Revisão do Codex no trabalho sem commit (26/10, tarde)

Claude e Codex em paralelo: Codex rodou `codex review --uncommitted` enquanto Claude rodava a suíte e os validadores.
**Achado único (P2), procedente e corrigido:** `scripts/vigia-limite.mjs` chamava o `codex.cmd` com `shell: true` no
Windows sem aspas; caminho de projeto com espaço chegava partido. Agora cada argumento com espaço é citado; teste novo
em `scripts/testes/vigia-limite.test.mjs` (Codex falso no PATH, pasta "projeto com espacos"): falhou antes, passa (4/4).
**Verificação:** suíte 283/285, 2 pulados, 0 falhas, saída 0; `claude plugin validate` raiz e núcleo aprovados;
`git diff --check` ok. Com o Codex rodando junto, `instalar.test.mjs` falhou 2× por carga (isolado 17/17): intermitente.
**Próximo:** commit do trabalho sem commit só quando o Neemias pedir; pendências D3/D4 seguem com ele.

**Revisão local (26/10):** mudanças staged, unstaged e não rastreadas revisadas, sem correção de código. Suíte sequencial: 274 aprovados, 10 pulados, zero falhas, saída 0. Reproduzida separação indevida do caminho com espaços na chamada padrão do vigia no Windows; achado devolvido na revisão. Validação de plugins indisponível neste terminal (`claude` fora do PATH). Próximo: tratar o achado, sem repetir ensaios nem publicar.

## Concluído: piloto integrado e consolidação G/H

**Escopo:** ciclo autorizado concluído, somente DevAgents. Sem commit, push, publicação ou mudanças globais. Salão, Transportadora e Penpot continuam pausados; rename adiado. Trabalho anterior sem commit preservado. Não repetir ensaios aprovados nem inventar tarefa de cliente para ocupar espera.

**Resultado final:** lote local `pilotos/medicoes/execucoes/integrado-2026-10-21T09-38-18-633Z/plano.json`, **6/6 aprovadas**, 54/54 testes por rodada, revisão independente ampliada e inspeção de arquitetura registradas antes de cada fechamento. Auditor sem problemas/pendências, saída 0; comparador oficial aprovado. Núcleos 0.1.4 × 0.1.21, matriz e apoios congelados. G/H concluídas no escopo controlado; uso diário/cliente real, delegação e alerta 150k não foram demonstrados.

**Retomada de 26/10:** reset semanal das 9h respeitado; Node v24.19.0 e CLI 2.1.226 conferidos contra o plano, sem outro processo/agente ativo. Job5 reposto uma única vez, arquivando a tentativa semanal inteira em `05-base-r3-recusada-2026-10-26T12-37-59-028Z/`, inclusive medição/fechamentos/fontes parciais/logs. Jobs1–4 não foram repetidos. Primeiro corrigido job6 na sessão original com pedido V2, 54/54 e revisão ampliada aprovados; CLI e dois módulos alterados lidos, seis hashes restantes preservados. Depois executada a reposição5, seguida da limpeza fixa da configuração automática, sem correção funcional: a nova implementação já lista a entrada antes do destino. Suas oito fontes foram lidas e hashes conferidos antes de fechar. Ordem6antes5 preservou a guarda de revisão pendente.

**Qualidade:** revisor cobre access negado e access permitido/listagem negada, ambos com saída válida e pai ausente, por injeção EACCES sem alterar ACLs. As quatro combinações passaram nas seis rodadas finais. Seis limpezas da configuração gerada pelo hook e cinco correções funcionais: **onze correções válidas incluídas na medição**. Nenhuma correção manual para simular resultado. Job1 usou pedido V1; jobs2,3,4,6 usaram V2; reposição5 dispensou correção funcional. Não afirmar prompts literalmente iguais.

**Consumo válido:** contexto total base **8.474.987**, depois **11.907.733 (+40,5%)**; saída 120.556 × 130.302. Entrada nova/cache criado/cache lido separados no relatório. 225 respostas únicas, todas `claude-opus-5` na principal; chamadas reais Skill/Agent/Task = 0. Máximo por resposta deduplicada **133.355 tokens**, job6, `resultado-correcao-2-cli.jsonl:170`, abaixo de 150.000. Máximo não é soma acumulada. Saída da medição final reconciliada com os resultados CLI; não usar assistant.usage parcial do stream.

**Recusas:** duas tentativas inteiras de job5 preservadas e excluídas, inclusive chamadas bem-sucedidas da tentativa semanal abandonada. Tentativa por sessão: entrada nova12/cache criado46.886/cache lido244.387/saída15.186. Tentativa semanal inteira: entrada nova51/cache criado327.788/cache lido1.710.397/saída32.391; somente a chamada semanal recusada: 1/86.258/13.443/4.963. Não misturar a medição antiga com a reposição válida. Reset nativo e provas permanecem nas pastas recusadas.

**Evidências:** [relatório integrado](relatorio-piloto-integrado.md), [consolidação G/H](relatorio-validacao-multiagente.md), [metodologia](qualidade-ensaio.md), [ensaio](ensaio-nucleo.md) e [plano](plano-de-acao.md) atualizados. No lote: `resumo-final-integrado.json` e `sintetizar-final.mjs` reproduzem a síntese com auditor aprovado e reconciliação de respostas/contexto/saída. Revisões e medições anteriores arquivadas; inspeções e hashes por pasta. Relatório curto anterior 0.1.20 e curto 0.1.21 **18/18** preservados.

**Limites:** n=3, cache não equalizado, dispersão, refinamento V1/V2, reposição de uma implementação, ordem6antes5 e pausa de cinco dias por cota. Sem causalidade, preço ou economia geral demonstrados; tempo de calendário inclui espera/revisão. Somente Windows: sem prova de Linux, ACL real, aparelho físico ou cliente real. Não forçar delegação nem inflar contexto para alcançar 150k.

**Verificação:** infraestrutura mantém suíte completa anterior 282 aprovados/2 pulados por plataforma/0 falhas, saída0 (`pilotos/testes-temporarios/validacao-final-cota-semanal.log`). Sem mudança nesse código nesta retomada; não repetir a suíte sem motivo. Auditor 6/6, comparação, síntese reconciliada e validador do marketplace aprovados nesta retomada. Conferência final: sete documentos com links locais e espaços aprovados; seis inspeções finais presentes, git diff --check saída0, marketplace e núcleo validados.

**Próximo:** nenhuma outra entrega implementável pendente neste ciclo autorizado. Preservar pausas e decisões; delegação/alerta/cliente real exigem uso adequado, sem fabricar carga nem escolher novo cliente. A retomada automática retomar-devagents-ap-s-liberar-cota foi excluída no app após a conclusão; não há nova sondagem agendada.

## Histórico técnico da retomada de 20/10

**Robustez da retomada (20/10, sem commit):** revisão independente encontrou e corrigi os caminhos abaixo,
sem chamadas ao modelo e sem alterar snapshots/planos reais:
- HTTP truncado agora rejeita a promise e alcança a limpeza; requisições têm prazo para headers/corpo,
  e a prontidão dos revisores tem prazo total de 10s (`scripts/lib/http-teste.mjs`, 11 testes).
- `--corrigir` aceita falha de aceitação e arquiva a revisão anterior; é obrigatória uma nova revisão.
- `--fechar` usa o log da última correção por número, sem reaproveitar log inicial se o final faltar.
- Auditor confere término e saída das correções quando presentes, preservando registros legados válidos.
- `--repor` prepara/valida a cópia antes de mover, guarda registro independente e reverte se gravar/confirmar
  falhar; caminhos resolvidos precisam ficar no lote. Regressão nativa sem modelo aprovada em
  `pilotos/medicoes/execucoes/regressao-repor-w0fcjA/resultado.json`.
**Validação atual:** 179/181 testes aprovados, dois pulados, zero falhas (sequencial), saída 0;
`pilotos/testes-temporarios/validacao-robustez-ensaio.log`. Revisores API/LP passaram novamente em cópias,
com portas livres e lote original intacto: `pilotos/testes-temporarios/limpeza-revisores-4NmUkR/resultado.json`.
Auditor do lote 0.1.20 continua aprovado em 18/18; lote 0.1.21 continua 0/18, primeira tentativa interrompida por cota.
Documentação: `docs/qualidade-ensaio.md` e `docs/servidores-de-teste.md`. Cota informada para 23:10;
não houve nova tentativa antes desse horário. Próximo permanece `--repor` no lote 0.1.21 existente e executar
o ciclo de revisão/medição depois da liberação. Sem rename do projeto, commit ou publicação.

**Avanço autônomo enquanto a cota está indisponível (20/10, sem commit):** implementado
`scripts/lib/processos-teste.mjs`: escopo de filhos Node iniciados sem shell, fechamento aguardado em
`finally`, término forçado com prazo, limpeza repetível e erro de inicialização/encerramento visível.
Não encerra processos alheios por nome/porta, nem adota servidores órfãos. Sete testes reais passaram,
incluindo HTTP, falha da revisão, porta alheia, caminhos com espaços e acentos e argumentos literais.
Revisores locais de API e LP passaram a usar o escopo; LP encerra o servidor mesmo se o navegador falhar.
Remoção de temporários só após fechar processos e conferir caminho. Regressão em cópias das entregas
aprovadas: API e LP passaram, portas livres, plano original intacto, sem chamar modelo.
Evidência: `pilotos/testes-temporarios/limpeza-revisores-AfsmZx/resultado.json`.
**Suíte completa atual:** 155/157 aprovados, dois pulados, zero falhas, saída 0 (sequencial), log em
`pilotos/testes-temporarios/validacao-processos-teste.log`. Documentação: `docs/servidores-de-teste.md`.
Não houve mudança nos plugins nem nos snapshots 0.1.4/0.1.21. O ensaio continua em 0/18 válidas e
permanece pendente identificar/encerrar um eventual servidor órfão deixado pela própria sessão do modelo;
o escopo novo cuida dos processos iniciados pelos revisores. Não repetir chamadas antes das 23:10 informadas.

**Retomada Codex (20/10, em andamento, sem commit):** grafo isolado 16/16. A falha EPERM da suíte veio do
primeiro teste com CLI em segundo plano: o log aparecia antes de o processo soltar a pasta. Acrescentada a
espera `esperarSegundoPlano` já usada pelos outros testes, antes da limpeza. Nenhuma mudança no plugin do grafo.
Suíte inteira sequencial: **148/150 aprovados, dois pulados, zero falhas**, saída 0
(`pilotos/testes-temporarios/validacao-0-1-21-serial.log`). Em paralelo houve uma falha de stdout vazio no
scanner; isolado passou 2/2; não foi suprimida nenhuma verificação.
**Lote novo:** `pilotos/medicoes/execucoes/controlado-2026-10-20T23-10-19-106Z/`, snapshots confirmados
base **0.1.4** / depois **0.1.21**, 18 cópias intactas. Primeira execução CSV base foi **interrompida pelo
limite de sessão**, às 20:12; CLI informou renovação às **23:10 (America/Sao_Paulo)**. Núcleo, apoios e arquivos
congelados confirmados. Houve uso do Opus antes da recusa; a tentativa inteira fica fora da comparação.
**0/18 rodadas válidas.** Não refazer login nem insistir antes da liberação. Segui a instrução abaixo de parar
e registrar quando a cota acaba. Manifestos raiz/núcleo e `git diff --check` aprovados.
**Próximo:** após liberar a cota, `--repor` nesse mesmo plano para arquivar a tentativa interrompida e criar
cópia limpa/sessão nova; então `--executar-proxima` e seguir o ciclo abaixo. Não preparar outro lote nem
repetir as entregas do ensaio anterior. Ainda não existe resultado do núcleo 0.1.21 para comparar.
**Pedido do Neemias:** deixar o orquestrador mais leve em pedido pequeno e fechado e depois medir de novo.
**Feito (sem commit):** núcleo **0.1.21**. Hook `plugins/devagents-core/hooks/orquestrar.mjs`: pedido pequeno e fechado vai
direto, sem carregar a skill nem dizer ficha; grande/aberto/várias partes usa a skill. Descrição e abertura da
`skills/orquestrador/SKILL.md` dizem o mesmo. Teste novo em `scripts/testes/orquestrador.test.mjs` (5/5).
Marketplace atualizado; `claude plugin validate` raiz e núcleo passaram. Suíte: 147/150, 2 pulados, 1 falha =
o teste do grafo com EPERM ao apagar pasta temporária no Windows (intermitente já conhecido; rodar sozinho para confirmar).
**Próximos passos:**
1. Confirmar o teste do grafo sozinho e a suíte inteira com código de saída 0.
2. Preparar lote novo: `node pilotos/medicoes/execucoes/ensaio-controlado.mjs --preparar` (copia o núcleo atual 0.1.21
   como "depois" e o 0.1.4 instalado como "base"; confere hashes). Conferir no `plano.json` as versões base 0.1.4 e depois 0.1.21.
3. Rodar uma execução por vez: `--executar-proxima <plano>` → revisor da tarefa (`revisar-csv-controlado.mjs`,
   `revisar-api-controlado.mjs`, `revisar-lp-controlado.mjs <plano>`; na LP olhar os prints) → se falhar, `--corrigir <plano>
   <pedido.txt>` com o mesmo pedido nos dois grupos (CSV entrada = saída: `execucoes/correcao-csv-mesmo-arquivo.txt`) →
   `--fechar <plano>` → `node scripts/auditar-ensaio.mjs <plano> --json`. Limite/429: `--repor <plano>` e rodar de novo.
   Antes de revisar API, conferir se a porta 3000 está livre (a sessão pode deixar servidor órfão; encerrar e anotar).
   Atenção: as execuções chamam o `claude` CLI e gastam a cota do Claude; se ela estiver esgotada, parar e registrar.
4. Com 18/18: `node pilotos/medicoes/execucoes/comparar-controlado.mjs <plano>`; comparar com o lote anterior
   (CSV +44,7%, API −1,5%, LP +23,2%) em `docs/relatorio-ensaio-controlado.md` (nova seção), sem prometer causalidade.
Não commitar nem publicar sem pedido; não mexer no ~/.claude global; troca de nome para DevConductor só depois.

## Ensaio controlado 0.1.20 (Fase E) — CONCLUÍDO 18/18 (auditor: aprovado)
**Resultado (relatório: `docs/relatorio-ensaio-controlado.md`):** qualidade igual nos dois grupos (CSV com o mesmo
defeito nos 6, corrigido igual; API e LP de primeira). Consumo do núcleo novo contra o antigo: CSV +44,7%, API −1,5%,
LP +23,2% (entrada + cache). Zero delegações; orquestrador chamado em 6/9. Variação alta (CSV depois: 27/22/41 respostas).
Conclusão: **sem economia em tarefa pequena**; não dá para falar em causalidade.
**Próximo:** decidir com o Neemias: (1) orquestrador mais leve em pedido pequeno; (2) medir tarefa longa com partes
braçais, onde o desenho promete ganho; (3) encerrar servidor de teste no Windows (achado da 15). Depois, G/H e a troca
de nome para DevConductor. Comparação: `node pilotos/medicoes/execucoes/comparar-controlado.mjs <plano>`.
Modo `--repor` no `ensaio-controlado.mjs` refaz execução recusada pelo limite (guarda a tentativa à parte).

### Registro por execução
**Lote atual:** `pilotos/medicoes/execucoes/controlado-2026-10-20T15-09-37-120Z/` (o de 14:53 fica como prova do 429).
**Feito (20/10, sem commit):**
- 01 CSV base r1: entrada = saída sobrescrevia o CSV; corrigida com o pedido fixo; medição 28 respostas, entrada 150.146, cache lido 1.703.017, saída 17.330.
- 02 CSV depois r1: **o mesmo defeito** apareceu; corrigida com o mesmo pedido (`execucoes/correcao-csv-mesmo-arquivo.txt`); revisão aprovada; 27 respostas, entrada 59.794, cache lido 1.831.495, saída 17.217.
- 03 API base r1: aprovada de primeira (28 casos HTTP, senha fora da memória); 6 respostas, entrada 37.183, cache lido 289.570, saída 3.757.
- 04 API depois r1: aprovada de primeira; 6 respostas, entrada 36.321, cache lido 290.761, saída 2.964.
- 05 LP base r1: aprovada de primeira (prints conferidos); 6 respostas, entrada 36.604, cache lido 287.298, saída 4.507.
- 06 LP depois r1: aprovada de primeira (prints conferidos); 6 respostas, entrada 43.811, cache lido 305.131, saída 6.874.
- 07 CSV depois r2: mesmo defeito (entrada = saída), corrigida com o pedido fixo; 22 respostas, entrada 62.286, cache lido 1.527.795, saída 19.976.
- 08 CSV base r2: a 1ª tentativa caiu no limite de uso (guardada em `08-base-r2-recusada-*`, não conta); reposta com `--repor <plano>` (cópia limpa + sessão nova); mesmo defeito entrada = saída, corrigida com o pedido fixo; 22 respostas, entrada 114.225, cache lido 1.306.694, saída 16.189.
- 09 API depois r2: aprovada de primeira; 6 respostas, entrada 40.547, cache lido 306.470, saída 3.406.
- 10 API base r2: aprovada de primeira; 6 respostas, entrada 35.605, cache lido 286.815, saída 2.947.
- 11 LP depois r2: aprovada de primeira (prints conferidos); 7 respostas, entrada 38.530, cache lido 345.464, saída 4.954.
- 12 LP base r2: aprovada de primeira (prints conferidos); 5 respostas, entrada 37.968, cache lido 232.250, saída 5.011.
- 13 CSV base r3: mesmo defeito entrada = saída, corrigida com o pedido fixo; 18 respostas, entrada 59.210, cache lido 1.139.389, saída 18.276.
- 14 CSV depois r3: mesmo defeito entrada = saída, corrigida com o pedido fixo; 41 respostas, entrada 67.390, cache lido 2.924.635, saída 25.453.
- 15 API base r3: entrega aprovada; a 1ª revisão caiu porque a sessão deixou o próprio servidor de teste aberto na porta 3000 (kill do bash não encerra node no Windows); órfão encerrado e revisão refeita, anotado na evidência. 7 respostas, entrada 37.679, cache lido 346.683, saída 4.928.
- 16 API depois r3: aprovada de primeira (porta 3000 livre); 6 respostas, entrada 41.003, cache lido 303.173, saída 3.390.
- 17 LP base r3: aprovada de primeira (prints conferidos); 11 respostas, entrada 37.515, cache lido 547.934, saída 5.773.
- 18 LP depois r3: aprovada; observação fora dos critérios (título desalinhado em 1280) anotada sem correção.
Tudo só Opus. Auditor final do lote anterior: aprovado, 18/18, sem problemas.
**Revisores (locais, no lote ignorado):** `revisar-csv-controlado.mjs`, `revisar-api-controlado.mjs` (HTTP real em porta livre,
`npm start` na 3000, limites/tipos/JSON quebrado/404, senha procurada no heap do servidor após coleta de lixo) e
`revisar-lp-controlado.mjs` (Chrome 390/1280 normal e reduzido, Tab+Enter até #contato, sem JS, 320 px e texto 200%, prints em
`<execução>/revisao-lp/`; ignora o 404 do favicon, que vem do servir.mjs congelado). Os dois novos foram testados nas entregas
da base r1 (aprovam) e com defeito plantado (senha guardada e sem movimento reduzido: reprovam). LP: olhar os prints antes de fechar.
**Ciclo por execução:** `--executar-proxima` → revisor da tarefa → se falhar, `--corrigir <plano> <pedido.txt>` com pedido fixo →
`--fechar` → `node scripts/auditar-ensaio.mjs <plano> --json`.

**Nome novo: DevConductor (DEV-31).** Renomear o repositório no GitHub espera o Neemias (gh e navegador sem login;
renomear em Settings ou rodar `gh auth login`); depois `git remote set-url origin https://github.com/neemiasjls/DevConductor.git`.
Troca interna (marketplace, `devagents-core`, testes) só depois do ensaio, numa mudança única.
Sites (Salão (cliente), D3 aprovação visual, D4 cliente real) ficam para quando o kit estiver pronto, por pedido do Neemias.

## Anterior
## Em andamento: DevAgents multiagente (DEV-27) — F implementada; ensaio E preparado
**Retomada de implementação (20/10, sem commit):** Fase F implementada no núcleo **0.1.20**:
três referências de fluxo (sistema/API, landing page e automação), carregadas só pelo tipo atual.
Preservam superpowers/maestro, Opus na principal, delegação por escopo e autorização já dada, sem novas
perguntas para pedido fechado. Relatório: `docs/relatorio-fase-f.md`. Marketplace atualizado.
Validação completa: **119 aprovados / 121, dois pulados por plataforma, zero falhas**;
manifestos raiz/núcleo, referências (11 plugins) e responsabilidades (62 skills) aprovados.

**Fase E preparada:** a inicialização real confirmou núcleo 0.1.19 único via `--plugin-dir` e
`--settings` exclusivo do ensaio desabilitando a cópia registrada. Listou orquestrador e três ajudantes;
a API ainda retornou HTTP 429 com renovação informada às 13:10. Não refazer login.
Avancei nas partes independentes em vez de parar na autenticação. Fonte atual: 0.1.20.
Detalhes e limites: `docs/ensaio-nucleo.md`. Nenhuma configuração global ou de projeto alterada.
Lote ignorado `pilotos/medicoes/execucoes/controlado-2026-10-20T14-53-59-849Z/`:
18 cópias novas, três repetições por tarefa/grupo, ordem alternada, sessões únicas e snapshots
congelados 0.1.4/0.1.20. Conferidos perfis, contagens, hashes de cópia e referências de fluxo.
Preparador local `pilotos/medicoes/execucoes/ensaio-controlado.mjs`: `--preparar` sem API;
`--executar-proxima <plano.json>` roda apenas uma tarefa, confere núcleo e para para revisão fixa.
As 18 execuções continuam **preparadas, não executadas**. Não declarar economia nem F validada por modelo.

**Próximo passo concreto:** quando o provedor liberar, executar a primeira tarefa do plano controlado,
revisar pelos critérios fixos, corrigir na mesma sessão quando necessário e gerar `medir-uso` com intervalo
real. Somente após revisão/finalização liberar a próxima. Conferir os plugins reais de cada par; a prova
atual carregou segurança 0.1.1, diferente do inventário antigo 0.1.0, então não misturar a base exploratória.
Nenhuma tentativa com 429 conta como rodada. Cache não equalizado; registrar usos e não prometer causalidade.
Depois concluir G/H com evidência dos fluxos. Salão/Penpot continuam pausados, sem commit ou publicação.

**Entrega atual (20/10, 11:22, sem commit):** login do Claude Code renovado pelo fluxo oficial da assinatura;
chamadas reais voltaram a funcionar. Base r1 concluída nas três tarefas, cada uma em sessão nova do Opus:
LP 5/5, API 7/7, CSV 6/6 testes fornecidos; mais 10/10 adicionais do CSV. Matrizes e arquivos congelados intactos.
Revisão: LP em 390/1280 normal/reduzido, sem JS, teclado e prints; API com HTTP real, sintaxe e memória sem senha;
CSV exigiu uma correção (entrada/saída no mesmo arquivo apagava a entrada), feita e medida na mesma sessão.
**Consumo final:** 34 respostas, todas no `claude-opus-5`, sem agentes; entrada+cache gravado 185.764,
cache lido 1.546.836, saída 28.643. Correção incluída. Uma sessão válida encontrada por tarefa, nada zerado.
Relatório: `docs/relatorio-base-por-tarefa.md`; resumo sem dados pessoais em
`pilotos/medicoes/resumo-base-tarefas-r1-2026-10-20.json`. Evidências completas no lote ignorado
`pilotos/medicoes/execucoes/base-r1-2026-10-20T14-07-31-691Z/`; servidores dos testes encerrados.

**Atenção para a comparação:** o CLI registra núcleo **0.1.4** no escopo project deste repositório;
o código-fonte está em **0.1.19**. Esta é uma base do ambiente herdado, não prova das melhorias novas.
**Próximo registrado na base (preparação já avançou acima):** preparar o grupo depois com o núcleo novo efetivamente carregado somente no ensaio/projeto,
confirmando versão e evitando duas cópias do núcleo. Manter Opus na principal, delegar conforme DEV-29/30;
mesmos pedidos/matrizes/critérios/provedor. Repetir pelo menos três vezes por tarefa/grupo, alternando grupos
e controlando/registrando cache. Sem grupo depois e com uma rodada não calcular economia percentual.
Não comparar este resumo com a medição agregada de conversas longas; entradas/tarefas são diferentes.

**Fase D local já feita (10:53):** matriz única de 62 skills em
`plugins/devagents-core/skills/orquestrador/referencias/responsabilidades.json`, tabela em
`docs/responsabilidades-skills.md`, auditor em `scripts/auditar-responsabilidades.mjs`; cada skill tem origem
e dono, consultoras preservadas e carregamento por etapa. Três cópias locais são opcionais por licença;
alias taste-skill → design-taste-frontend explícito. Relatório em `docs/relatorio-fase-d.md`.
Foram 119/121 testes aprovados (2 pulados por plataforma), seis novos da D; 11 plugins e validadores passaram.
17 colisões globais apenas inventariadas; limpeza depende de autorização específica (DEV-09), após conciliar
memoria/subir. Nada global removido. Sem commit, push ou publicação. Salão continua pausado.

O erro 401 anterior está resolvido; não repetir login por rotina. `auth status` indicava conectado mesmo com
token inválido: confirmar acesso por chamada real. Tentativas que falharam antes de implementar ficaram fora
da medição; detalhes locais nos lotes anteriores. Não substituir a base Opus por resultados do Codex.

Histórico das fases anteriores (preservado):
Plano de 8 fases dado no chat de 19/10 (A medir · B orquestrador · C agentes por função · D distribuir skills sem
duplicar · E economia de tokens · F fluxos por tipo de projeto · G qualidade · H validar). Fase A, feita com o Codex
junto (ele escreveu as tarefas numa cópia separada; eu, o medidor; ele revisou o medidor):
- `scripts/medir-uso.mjs`: novo `porOrigem` (conversa principal × agentes, pela subpasta subagents/, com contexto
  médio por resposta) e `porFerramenta` (texto que cada ferramenta traz, imagem à parte, sem repetir resultado
  copiado, nome achado entre arquivos). 3 testes novos (13/13); suíte 102 ok, 2 pulados.
- `pilotos/medicoes/tarefas/` (Codex): 3 tarefas fixas (seção de LP, endpoint de API, script CSV) com pedido exato,
  critério verificável por comando e testes de aceitação que falham até a tarefa ser feita; README com o roteiro.
- Base real: `pilotos/medicoes/base-fase-a-2026-10-20.json` — 1.398 respostas, **100% conversa principal no Opus**,
  ~421 mil tokens relidos por resposta; ferramentas somam só ~0,3 mi (Bash e Read à frente). O gasto é conversa
  longa relida, não ferramenta.
**Fase B feita (20/10, sem commit):** skill `orquestrador` no núcleo (substitui a `devagents-fluxo`, que foi renomeada e
ampliada): ficha de uma linha por pedido (tipo · tamanho · quem faz · modelo · o que carregar), ordem direto → agente
(Sonnet/Haiku) → Codex → sessão nova, especialistas por stack, carregar só o necessário. Hook `orquestrar.mjs` no
SessionStart (1 linha, 330 caracteres). Núcleo **0.1.18**. Teste `orquestrador` (3). Codex revisou: 4 achados
(precedência direto × agente, atalho do pedido que já diz tudo, um método por vez, teste do comando) corrigidos.
Teste do grafo às vezes falha com EPERM ao apagar pasta temporária no Windows (passa sozinho; pendência).
**Fase C feita (20/10, sem commit), com a decisão DEV-30** (um cérebro Opus + skills + poucos agentes; "um agente
por função" saiu): 3 agentes braçais no núcleo, Haiku — `pesquisador`, `testador`, `publicador`; designer,
animador e redator continuam como skills. Orquestrador aponta para eles. Teste `orquestrador` (4).
**Fase E (parte) feita:** hook `conversa-longa.mjs` (UserPromptSubmit) avisa uma vez por faixa de 150 mil tokens
para fechar o passo e seguir em sessão nova (lê o último uso; janela cresce se a linha for enorme; Codex revisou,
2 achados corrigidos); teste `conversa-longa` (4). Prova real: esta conversa estava em ~632 mil tokens.
**Troca automática Claude → Codex:** `scripts/vigia-limite.mjs` (teste `vigia-limite`, 3) olha o histórico mais
recente do projeto; se o último evento é "You've hit your session limit" (erro rate_limit), chama
`codex exec -s workspace-write -C <projeto> continue` uma vez por limite; log em `.codex/vigia-limite.log`.
Rodando na aba do Terminal "vigia do Codex" (parar: Ctrl+C; religar: `node scripts/vigia-limite.mjs`).
Núcleo 0.1.18 era a entrega das Fases B/C/E; a Fase D deste turno avançou para 0.1.19, sem commit.
O próximo passo atual está no topo: grupo depois/Fase E. F/G/H ainda pendentes. Não refazer A/B/C/D nem
os hooks de E que já existem; commit/publicação só quando pedir. Salão continua pausado.

## Histórico anterior a 20/10
O histórico antigo deste arquivo (pilotos de clientes, Penpot, Paper, primeiras fases) ficou no repositório
privado de clientes, junto com os pilotos reais. As decisões que valem continuam em `docs/decisoes.md`.

## Próximo passo
- D3 aguarda aprovação visual dos quatro estilos; o próximo teste D4 é um cliente novo real com até cinco
  perguntas e três conceitos completos. D7 depende do nicho/aprovação do usuário. Não inventar cliente real
  nem contar os exemplos fictícios como prova.

## Falta testar
- Estúdio: fluidez em aparelho físico, auditoria completa com leitor de tela e instalação real do novo
  plugin em configuração vazia. Chrome headless passou em desktop/celular/reduzido; Edge encerrou ao
  iniciar neste terminal, por isso foi usado `BROWSER_EXECUTABLE` com Chrome.
- Especialista no app já verificado em 15/10 (ver Feito); não repetir esse teste como pendência.
- Retomada real no app do Codex feita em 15/10: lidos continuar.md, decisões, memória e Git;
  marca de último turno gravada. Volta ao Claude validada em 15/10 (ver Feito).

- Troca de turno automática (15/10): o Codex retoma com "continue" e, ao parar, marca `> Último turno:
  Codex` no topo do continuar.md; o hook novo `devagents-core/hooks/retomar-turno.mjs` (SessionStart) faz o
  Claude retomar sozinho ao ver a marca. Testado (marca/sem marca/sem arquivo) e conferido no prompt do Codex.
  Só nos projetos com DevAgents ligado; global precisa de OK (DEV-09). devagents-core 0.1.6. **Não commitado.**

- Histórico das referências Transportadora: 13 vídeos e galeria em `pilotos/cliente-transportadora (repositório privado)/referencias/`;
  galeria leve: https://claude.ai/artifact/R8hLntrQ7JhphJkyrx252D. A escolha posterior foi a nº 2
  (United Carriers, parte do caminhão), aplicada na v2, agora pausada. A escolha da galeria não é mais
  um próximo passo. Diagrama do README já conferido no GitHub (ver acima).
- Gravador de referências (15/10): espera a tela de carregamento liberar a rolagem, segue mesmo se a rede
  nunca sossegar, confere a rolagem a cada 20 passos (página pesada estourava o tempo), rolagem "virtual" só
  pela roda; lote com 7 min por site. **Não commitado.**
- Conectores (15/10, a pedido): Mobbin e Figma desligados (decisão do Claude no Figma: não está no fluxo,
  é o mais pesado; religa em + → Conectores). Brevo e Google Drive ficaram. Plugins da conta nunca usados
  (Adobe, Canva, design, figma) só ele desliga nas configurações do app.
- Codex remoto: ele trocou de conta; o celular não vê o PC. O CLI do app não liga o serviço remoto
  ("no complete local package"); ligar o acesso remoto é no app do Codex, no PC, com a conta nova.

## Pendências
- D3: aprovação visual das quatro páginas; D4: execução com cliente novo real e até cinco perguntas.
  Código, exemplos, testes e vídeos já entregues; não refazer integração por rotina.
- Estúdio: aprovação visual/favoritos entre os 25 estudos; biblioteca com 35 receitas, meta técnica D2
  atingida. Revisão das proibições de efeitos prontos, nicho D7 e peças pagas dependem do usuário.
- Neste projeto, `memoria`, `subir` e os 3 agentes aparecem duas vezes (global + plugin). Resolver quando
  for adotar em todos os projetos (aposentar os globais).
