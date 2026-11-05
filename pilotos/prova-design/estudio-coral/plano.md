# Estúdio Coral — plano (demonstração, empresa fictícia)

Salão de tranças, cachos e cor em Belo Horizonte/MG (nagô, box braids, twist, finalização de cachos,
coloração). Tom ousado e colorido permitido (LP-11). Estilo `cinetico-vibrante`. Dados fictícios.

## Ideia
O salão como abertura de festival: blocos de cor chapada, título que troca de palavra e **uma trança que se
forma com a rolagem**. Frase-guia: "Feito pra [tranças / cachos / cor / você]."

## Identidade
- Fontes: Big Shoulders 800–900 condensada (título, entrelinha 0,85–0,9) + Golos Text 400–600 (texto).
- Cores (OKLCH): cor-assinatura coral `0.68 0.19 32` (blocos inteiros); contra-cor cobalto `0.58 0.17 262`
  (seção alternada e detalhes); tinta `0.18 0.02 32`; papel `0.97 0.012 70`. Só essas duas fortes. Sem degradê.
- Ritmo do estilo: 0,2/0,5/0,9 s; entra `back.out(1.6)`; sai `power3.in`; distância 40 px; escalonar 0,05; scrub 0,5.
- Fotos reais (Wikimedia Commons, ver `coleta/fotos-candidatas.json` e licenças) sobre cor chapada; grade de 12
  colunas com elementos que invadem a margem.

## Roteiro de movimento
| # | Seção | Técnica (família) | Motivo | Costura |
|---|---|---|---|---|
| 0 | Abertura | texto cinético: linhas do título entram de lados diferentes no carregamento e a palavra final troca no lugar (tranças → cachos → cor → você) (Texto) | o salão faz várias coisas; a troca mostra isso sem lista | bloco cobalto desliza e cobre (cortina) |
| 1 | O que fazemos | `cortina` em blocos de cor que se abrem e revelam cada serviço com foto (Espaço) | cada serviço tem sua "cor"; troca de bloco = troca de atendimento | entra a cena presa |
| 2 | Como nasce uma trança | `lottie-progresso` (Ilustração viva), presa: **Lottie de autoria própria** gerado por script (3 mechas em coral, cobalto e tinta que se entrelaçam conforme a rolagem); ao lado, as 4 etapas em texto (consulta, preparo, trançado, finalização) | o trabalho do salão mostrado passo a passo; a volta do scroll desfaz a trança | foto sobe por baixo |
| 3 | O trabalho de perto | `distorcao-imagem` (Imagem): foto real de tranças com onda + separação RGB ligada à rolagem; toque/hover intensifica | textura do cabelo trançado ganha vida sem esconder a foto | — |
| 4 | Estilos | `rolagem-lateral` (Espaço), presa curta: esteira de estilos (nagô, box braids, twist, cachos, cor) com foto e tempo médio "a combinar" | cartela como vitrine que passa | — |
| 5 | Agenda | `palavra-zoom` (Texto): "AGENDA" aproxima até a cor tomar a tela e virar a seção de contato | convite direto para marcar horário | a cor da palavra vira o fundo |
| 6 | Contato + rodapé | botão magnético + WhatsApp que pulsa uma vez; botões de serviço que reagem ao toque (Interação) | marcar pelo WhatsApp com mensagem por serviço; rodapé completo + créditos | — |

Famílias: Texto, Espaço, Ilustração viva, Imagem, Interação (5). Cenas grandes: 2 (Lottie), 3 (distorção),
4 (lateral). Vizinhas nunca repetem família.

## Celular e reduzido
- Celular: título 64–80 px, Lottie em uma coluna com pin curto, distorção com amplitude menor, esteira lateral
  mantida com pin curto, cursor vira toque.
- Reduzido: poster SVG do último quadro da trança, foto parada, serviços e estilos em lista; nada escondido.

## Desvios na construção (29/10)
- **Cenas presas com `position: sticky`** (serviços, trança, estilos, agenda e a própria abertura), altura da
  seção reservada no CSS (`--telas-d/-c` de `src/ritmo.ts`), em vez de `pin` do GSAP. Motivo: o Lottie e o
  WebGL chegam depois; um pin criado tarde insere espaço e empurra a página. No reduzido a altura volta a `auto`.
- **0 Abertura:** além da troca de palavra, cada palavra tem etiqueta de cor e a sombra do arco salta/troca de
  cor junto. A costura virou "seção cobre": a abertura fica grudada, recua e escurece enquanto o bloco cobalto
  (cortina fechada com "TRANÇAS") sobe por cima. Título limitado pela altura (23svh): em tela de 630 px o
  texto de baixo passava da tela. Palavras que esperam ficam a 150% (acentos Ç/Ê apareciam na fresta a 110%).
- **1 Cortina:** as metades levam o nome do serviço partido ao meio (a palavra se rasga ao abrir). Mantida presa
  também no celular (a receita diz "celular sem pin"; DEV-34 pede celular equivalente). Nome do serviço invade a
  coluna da foto no computador.
- **2 Lottie:** player `lottie_light` (só SVG, 47 KB gzip); etapas com fatias não lineares da rolagem
  (17/16/54/13%) para o trançado ter mais quadros; o progresso termina uma tela antes do fim da seção, que é
  quando a foto sobe por cima (costura). Trança gerada por `ferramentas/gerar-tranca.mjs` e conferida em quadros
  (`ferramentas/ver-tranca.mjs`).
- **3 Distorção:** foto `s2-28` (trancista trabalhando) no lugar de `s2-33`/`s2-7`: é literalmente "de perto" e
  horizontal para o computador. Intensidade da rolagem reduzida (0,008; RGB 0,38) depois dos prints mostrarem
  fantasma; hover segue 0,016. Canvas com `resize={{ offsetSize: true }}` (a moldura anima `scale` e o R3F
  media a caixa já encolhida). A moldura cresce de 0,84 a 1 enquanto cobre a trança.
- **4 Estilos:** seis itens (nagô, box braids, twist, koroba, cachos, cor); twist é cartão tipográfico (sem foto
  de licença clara). Cartões inclinam ao entrar e a foto corre ao contrário (`containerAnimation`). No celular a
  esteira continua lateral, com cartões de 74vw (a receita manda vertical).
- **5 Agenda:** zoom com origem dentro da haste do E (medida num canvas) e, no fim, a própria haste se alarga até
  cobrir a tela; um círculo crescendo parecia forma solta no celular. Entraram os dias de atendimento (fictícios)
  sob a palavra: dão sentido a "agenda" e ocupavam o vazio do celular; saem antes do zoom.
- **6 Contato:** Motion via `LazyMotion` (domMax em arquivo separado) nos botões de serviço com destaque que
  desliza (`layoutId`); ímã só com mouse; pulso único. Atalho fixo "Marcar horário" no site todo, some no
  contato e sobre os créditos da foto (correção da revisão do Codex).
- **Fotos:** seis (`s-60`, `s2-37`, `s2-39`, `s-98`, `s2-28`, `s2-7`); `s-55` e `s2-33` ficaram de fora.
  Sem avaliações de clientes (seriam inventadas). Sem Lenis.

## Refinamento da rodada Codex (29/10, após feedback visual)

O usuário gostou da originalidade e pediu calibrar os exageros. Mantidas todas as famílias e a trança
como ideia central. Esta é uma revisão do exemplo atual; não pertence à futura rodada do outro executor.

| Ajuste | Antes → depois | Motivo |
|---|---|---|
| Escala e entrada da abertura | título19,5→18vw no celular; desktop15,6vw/23svh→14,2vw/21svh; deslocamentos laterais e giro inicial menores | abrir mais espaço para foto e conteúdo sem perder a etiqueta cinética |
| Ciclos da abertura | troca2,1→3s; foto1,07→1,035; giro da troca2,5→1,25° | dar tempo de leitura e reduzir competição entre foto, sombra e palavra |
| Permanência da cortina | serviços2,8→2,25 telas no desktop e2,2→1,8 no celular | deixar o percurso mais direto antes da trança; manter o tempo da formação da trança |

Na abertura desktop, texto e controles também ganharam uma área de duas colunas reservada à esquerda;
no tablet, ficam em uma coluna à esquerda e o menu usa espaçamento compacto. O controle de pausa
permanece fora da foto mesmo em768×630. Paleta, fotos, Lottie, WebGL, esteira e zoom da agenda preservados.
Evidências e limites em `revisao/refino-codex-29-10.md`; vídeos e medição agregada ficam com a coordenação.

## Correções solicitadas em 30/10

Fotos precisam demonstrar o penteado nomeado: substituída a imagem ondulada de “Cachos” e sincronizada
foto/palavra na abertura. Distorção RGB de “De perto” rejeitada e retirada; foto natural preservada.
CTA: retorno magnético pelos mesmos quickTo, feedback ao pressionar e entrada reiniciada ao voltar à seção.
Verificações específicas em `revisao/fotos-comportamento-30-10` e `revisao/ima-final-30-10`.
