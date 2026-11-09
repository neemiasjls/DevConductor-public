# Lúmen Salão — plano (demonstração, empresa fictícia)

Salão especializado em terapia capilar (hidratação, nutrição, reconstrução, cronograma capilar) e corte,
endereço fictício em Belo Horizonte/MG. Rodada Claude (DEV-36). Tom ousado e elegante permitido (LP-11).
Estilo `luxo-editorial`. Contatos e preços demonstrativos, marcados como tal; página com `noindex`.

## Ideia central
**Brilho é cutícula fechada.** O cabelo brilha quando as escamas da cutícula estão fechadas e refletem a luz;
o trabalho do salão é fechar essas escamas. O fio condutor do site é **a luz correndo pelo fio**: começa como
reflexo na foto da abertura, entra no fio por dentro no clímax (as escamas fecham), organiza o cronograma e
termina no botão de agendar. Toda cena responde: "onde a luz bate e por quê?".

Diferença em relação ao Estúdio Coral (rodada Codex): lá eram tranças, cor chapada e tipografia cinética;
aqui é o tratamento do fio, revista calma, foto grande, luz e ciência simples explicada com imagem.
Também se afasta do piloto do salão-cliente (cartela de tons): nada de cartela de cor de cabelo.

## Identidade
- Estilo `luxo-editorial`: revista, foto grande bem cortada, serifa de alto contraste, muito espaço, lento.
- Fontes (sugestão; `lp-tipografia`): título Gloock ou Libre Caslon Display; texto Familjen Grotesk.
  Itálico verdadeiro em uma única palavra de um único título do site.
- Cores (OKLCH, ajustar com `lp-paleta` a partir das fotos): escuro da marca verde-fundo/petróleo
  ≈ `0.22 0.04 190`; claro frio ≈ `0.97 0.008 190`; cor-assinatura em grande área: ameixa/vinho de cabelo
  tratado ≈ `0.42 0.12 15` (ou o tom que as fotos escolhidas pedirem); fio escuro a 15%. Proibido creme+dourado.
- Fotografia: 4–5 retratos/close de cabelo com licença aberta (Commons), mesma luz lateral, mesmo
  tratamento (contraste suave, pretos no tom escuro da marca, reflexos preservados). Recorte nos comprimentos,
  nunca rosto cortado na testa. Créditos no rodapé.
- Escala: título de abertura 96–124px no computador, 44–52px no celular (abaixo do limite do estilo).

## Roteiro de movimento (uma técnica por seção; famílias diferentes em vizinhas)
| # | Seção | Técnica (família) | Motivo ligado ao negócio | Permanência | Costura para a próxima |
|---|---|---|---|---|---|
| 0 | Abertura | shader de reflexo sobre a foto (3D/WebGL, `fundo-shader`/`distorcao-imagem` adaptada): uma faixa de luz atravessa os comprimentos devagar; cursor/toque guia a luz. Ciclo **com pausa**, parado fora da tela e no reduzido. Título entra no carregamento por linha (não depende da cena) | o brilho é o resultado que a cliente quer ver | livre | a faixa de luz sai pela borda e vira o fio da próxima seção |
| 1 | Diagnóstico | `texto-revelado` (Texto): "Água, óleo, proteína: o fio pede uma coisa de cada vez." + três necessidades com uma linha cada | explicar o cronograma sem jargão | livre | fundo claro → escuro por cortina |
| 2 | O fio por dentro (clímax) | `lottie-progresso` (Ilustração viva), presa: **Lottie de autoria própria gerado por script**: o fio visto de perto, escamas abertas e foscas → hidratação → nutrição → reconstrução → escamas fechadas e a luz reflete. Ao lado, as 4 etapas em texto | mostra o que o tratamento faz e por que ele dá brilho | presa 2 telas (1,5 no celular) | seção seguinte cobre a cena |
| 3 | Cronograma | linha do tempo com marcador (Dados e prova): 4 semanas, marcador desce e acende H / N / R por semana; texto livre, não presa | o cliente entende quando voltar | livre | foto entra pela máscara |
| 4 | Resultado | `mascara-estudo`/`foto-abre` (Imagem): retrato grande abre de um arco estreito (espelho do salão) até a coluna; leve parallax interno | ver o resultado em foto real | presa curta 0,8 tela (0,6 celular) | fio fino |
| 5 | Serviços e valores | lista editorial com numeração de revista; ao passar/tocar, a foto do serviço troca no quadro ao lado com cruzamento lento (Interação) | escolher o serviço com mensagem própria no WhatsApp | livre | cor-assinatura invade o fundo |
| 6 | Agendar + rodapé | `palavra`/letras com luz: "Agende" com o mesmo reflexo da abertura correndo uma vez pelas letras + botão magnético e WhatsApp que pulsa uma vez (Texto/Interação) | fechar o arco da luz no botão | livre | — |

Famílias: 3D/WebGL, Texto, Ilustração viva, Dados e prova, Imagem, Interação (≥ 4). Cenas grandes: 0 (reflexo),
2 (fio por dentro), 4 curta. Nunca 3 presas seguidas (3 é livre entre 2 e 4). Mesmo efeito de entrada em no
máximo 2 seções.

## Calibração desde o início (lições da rodada Codex)
- Escala de título dentro da faixa acima; uma palavra em itálico no site inteiro.
- Ciclos: só o reflexo da abertura, lento (≥ 6 s por passagem), com pausa e parado fora da tela/aba.
- Permanência presa total ≈ 3 telas no computador; percurso total ~9–11 telas.
- Fotos com um tratamento só; a luz é a ideia central e nenhuma cena compete com ela.

## Celular e reduzido
- Celular: mesma ordem; shader com `dpr` ≤ 1,5 e textura 960px; luz guiada por toque; pins mais curtos.
- Reduzido: foto nítida com reflexo estático pintado, Lottie no quadro final (escamas fechadas) com as 4
  etapas em lista, cronograma inteiro visível, nada preso ou escondido. Troca dinâmica recria/destroi cenas.
- WebGL/JSON Lottie indisponível: foto simples e ilustração final estática com legenda.

## A definir (empresa fictícia)
Equipe, anos, avaliações, número de clientes: nenhum entra como fato. Preços "a partir de" marcados como
demonstração. Contatos fictícios.

## Desvios na construção
| O quê | Plano | Feito | Por quê |
|---|---|---|---|
| Itálico | itálico verdadeiro numa palavra | Gloock nos títulos; a palavra *vez* (título do Diagnóstico) em Bodoni Moda itálico 400 | Gloock não tem itálico; Bodoni Moda é didone de contraste parecido e só o subconjunto latino itálico é baixado |
| Shader da abertura | `fundo-shader`/`distorcao-imagem` (three/R3F) | WebGL puro (`src/secoes/reflexo.ts`, 1,5 KB gzip), sem relógio próprio | evita ~300 KB de three só para um plano com textura; o laço (rAF) só roda visível, com aba ativa e sem pausa |
| Máscara do reflexo | luz pelos comprimentos | faixa só na coluna de cabelo da foto (x 0,62–0,95) e só onde a foto já é clara | na primeira versão a luz passava no pescoço/colo; o reflexo pintado do reduzido também fica só na metade direita |
| Ciclo do reflexo | ≥ 6 s com pausa | passagem 6,5 s + descanso 3,5 s; botão "Pausar o reflexo"; cursor/toque guiam | conforme plano (WCAG 2.2.2) |
| Permanência do fio | 2 telas (1,5 celular) | seção de 3,4 telas (2,9 celular): 1,4 tela (0,9) de progresso + 1 tela em que o cronograma cobre | com 2 telas o fio fechava em 1 tela de rolagem, rápido demais nos prints |
| Teclado no fio | — | as 5 etapas são botões; Enter leva a rolagem até a etapa | a cena presa precisa ser alcançável e legível por Tab |
| Etapas no celular | — | números 01–05 + nome em destaque no texto ativo | nomes longos ("Reconstrução") não cabiam em 5 colunas a 13 px |
| Costura 1→2 | cortina | painel petróleo que sobe do pé do Diagnóstico (`scaleY`, sem prender) | "fundo claro → escuro" sem mais uma cena presa |
| Serviços no celular | troca de foto ao passar/tocar | celular: cada linha traz a foto pequena; o quadro com cruzamento é do computador (≥ 768 px) | um quadro grudado cobriria a lista no celular; o toque ainda ativa a linha |
| Reflexo em "Agende" | mesma luz da abertura | faixa de luz em texto recortado (`background-clip`), uma passada; o botão pulsa uma vez | lint acusa gradiente/texto recortado: exceção registrada na linha (`taste-skill-ignore`) por ser a cena 6 do plano |
| Fotos | 4–5 retratos, mesma luz lateral | 7 fotos (Commons; 3 da mesma série Gee Hair) com tratamento único; 2 com fundo trocado | Commons tem pouco retrato de cabelo com luz lateral; o fundo petróleo uniformiza |
| Resultado | retrato grande | cabelo de costas (sem rosto), legenda "foto ilustrativa, não é cliente" | o brilho dos comprimentos é o assunto; evita sugerir cliente real |
| Instagram | contato | texto "@lumen.salao.demo (fictício)" sem link | não apontar para um perfil que pode existir |

Exceções do detector anti-IA (todas na linha, com motivo): numeração de revista 01–06 (pedida pelo estilo),
fios de 15 % (estilo), trilho da linha do tempo, sombra da `secao-cobre-cena`, anel do botão fixo, reflexo
pintado (substituto estático do shader) e o reflexo de "Agende".

## Testes (03/11/2026, preview `http://127.0.0.1:5202/`, Chrome headless com SwiftShader)
| Teste | Resultado | Evidência |
|---|---|---|
| `npm run build` | saída 0; entrada 146 KB gzip, Lottie light 47 KB gzip (sob demanda), reflexo 1,5 KB gzip | — |
| `revisar-pagina.mjs` | **12/12** (6 larguras × normal/reduzido), 0 falhas; CLS de laboratório ≤ 0,0025; LCP 160–480 ms; 1ª carga 552 KB (360) / 732 KB (1440) | `revisao/rodada-1/` (antes dos ajustes), `revisao/rodada-2/` |
| `ferramentas/comportamento.mjs` | **aprovado** em 390 e 1440: reflexo anda, pausa congela, retoma, para fora da tela; Tab chega às 5 etapas do fio na tela, Shift+Tab volta, Enter numa etapa leva a rolagem até ela e ela permanece; ida e volta com a roda (Lenis) reconstitui reflexo e fio; reduzido dinâmico (sem canvas, sem Lenis, fio solto 1,0–1,3 tela, 10 textos das etapas visíveis, cronograma aceso) e volta; JSON do Lottie e foto do resultado bloqueados + WebGL desligado → pôster, reflexo pintado, alt; sem rolagem lateral | `revisao/comportamento-3/` e `revisao/comportamento-4/` (1 e 2 guardam a falha de foco inicial e o bug do Enter, corrigidos) |
| `responsivo.mjs` | todas as larguras OK (depois de dar 44 px aos links de texto com `.alvo`) | saída do comando |
| `taste-skill/lint.mjs src` | 0 FAIL, 3 WARN (zero à esquerda da numeração de revista) | — |
| `validar-assets.mjs --gravar` | aprovado; cenas: reflexo leve, fio leve, resultado média (388 KB), serviços média | `assets-relatorio.json`, `assets.md` |
| Olhar prints 390/1440 (topo/meio/fim) | 3 rodadas de correção: ritmo do fio, recorte do resultado, luz fora do rosto; texto alternativo torto em foto quebrada | prints de conferência fora do repositório |

Limites: fluidez real (FPS) e o shader só se aprovam em aparelho físico; "aba escondida" não é simulada no
headless (o código para em `visibilitychange`); vídeos e medições de percurso ficam com a sessão principal.
Nenhum print ou placar substitui a aprovação estética do Neemias.

## Refeito pela LP-12 / DEV-42 (04/11/2026, à noite)
Retorno do Neemias (DEV-41): o fio "forçado, sem porquê". Teste do porquê, olhando o site: o fio desenhado "por
dentro" ensinava cutícula (o visitante não precisa disso para decidir) e o brilho já aparece em foto real no
Resultado. Pela DEV-42 ("faltar motivo é motivo para ter menos"), a cena **deixou de existir como cena**: a seção 02
virou leitura discreta — foto real do serviço de perto (óleo aplicado com conta-gotas numa mecha), título e um apoio,
sem prender. Gesto único: a foto se abre de cima para baixo uma vez ao chegar (reduzido: parada e inteira). Saíram o
Lottie (`public/animacoes/`, `gerar-fio.mjs`, `ver-fio.mjs`, dependência `lottie-web`), as 5 etapas-botão, a barra e
a cobertura do cronograma (a margem negativa da `secao-cobre-cena` cobriria a seção solta). Cenas grandes do site:
reflexo (abertura) e resultado.

| Efeito | Fato do negócio | Entende sem legenda? | Decisão |
|---|---|---|---|
| Fio desenhado preso 2,4 telas, 5 etapas | — (aula de cutícula) | não | saiu |
| Foto do serviço de perto que se abre uma vez | o tratamento é aplicado mecha a mecha | sim (leitura às cegas) | fica, discreto |

Densidade da seção (computador): antes 95, depois 29; no celular a seção nunca passa do limite.
Testes: `revisao/comportamento-novo-1` aprovado (teste adaptado: seção não presa, foto aberta, 3 textos, reduzido,
foto bloqueada com substituto). Lighthouse: ver `docs/auditoria-design-clareza.md` ("Prova da LP-12").

## Segunda rodada da LP-12 (05/11/2026)
Calibrado, sem trocar cenas: apoios da abertura, diagnóstico, cronograma e resultado encurtados (a explicação da
cutícula fica só no diagnóstico); as notas das semanas viraram rótulos curtos ("No salão", "Em casa"); Serviços
leva `data-leitura`. O Agendar ficou com título, apoio e botão (no computador o apoio e o botão vão para a direita,
alinhados ao pé do título); telefone, Instagram, endereço e horários foram para o rodapé, que agora está completo.
Menu "O fio" → "De perto" (nome da seção desde a primeira rodada).
Densidade (computador/celular): 84/98 → 55/45. Comportamento `revisao/comportamento-r2-1` e `-r2-2` (depois do ajuste
do Agendar) aprovados. Lighthouse celular (médias de 3): nota 90 → 92, TBT 232 → 199 ms, CLS 0. Reduzido 55/45.

## Fechamento da régua por meia tela (06/11/2026)

Amostragem nova encontrou 53 palavras no celular, com excesso na abertura e no cronograma. Uma primeira
redução ainda deixou abertura/diagnóstico juntos acima do limite; essa tentativa foi preservada, não aprovada.
Versão final: apoios da abertura, diagnóstico e cronograma menores; link secundário "Ver o tratamento" mantém
o destino `#fio`. Localização continua no rótulo e no texto; diagnóstico e caráter ilustrativo do cronograma
preservados, assim como todas as semanas e etapas. Nenhuma cena refeita.

Build aprovado. Esquema 2, normal e reduzido: 51/45, sem alertas ou exceções.
Relatórios em `revisao/densidade-06-11-final/`. Comportamento final aprovado nos dois cenários (390/1440).
Vídeos e Lighthouse anteriores não foram repetidos: não atribuir as notas anteriores a esta versão.
Avaliação visual e teste físico permanecem abertos.
