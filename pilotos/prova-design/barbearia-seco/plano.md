# Barbearia Seco — plano (demonstração, empresa fictícia)

Barbearia em Curitiba/PR: corte, barba na navalha, pigmentação, combo. Tom com atitude (LP-11). Estilo
`brutalista-grafico`. Dados fictícios.

## Ideia
A página como cartaz de rua: o nome em letras que estouram a tela, fotos em preto e branco de alto contraste
com um único "grito" amarelo, faixa com os serviços que acelera com a rolagem e cursor que inverte a foto.
Frase-guia: "Corte seco. Sem enrolação."

## Identidade
- Fontes: Imbue variável 100–900 (título, caixa alta; peso animado com a rolagem) + Sofia Sans 400–600 (texto).
- Cores (OKLCH): tinta `0.12 0.01 90` (fundo e texto); papel `0.95 0.012 85` (fundo alternado);
  grito amarelo-sinal `0.88 0.18 100` (faixa, botão, uma palavra por seção). Fotos em P&B ou duotone tinta/grito.
- **Sem cantos arredondados** (o estilo proíbe; vale sobre a regra geral de fotos arredondadas da construção).
- Grade visível com fios grossos em 1–2 seções; faixas inclinadas de 2–4°; título cortado pela borda em 1–2 seções.
- Ritmo do estilo: 0,15/0,4/0,8 s; entra `expo.inOut`; sai `expo.in`; distância 60 px; escalonar 0,03; scrub 0,3.

## Roteiro de movimento
| # | Seção | Técnica (família) | Motivo | Costura |
|---|---|---|---|---|
| 0 | Abertura | tipografia variável (Texto): "SECO" em 20–30vw, peso da Imbue vai de 100 a 900 no carregamento e afina/engrossa com a rolagem; foto P&B por trás | o nome é a marca; o peso "aperta" como a máquina no corte | faixa inclinada com serviços, velocidade ligada ao scroll (restilizada) |
| 1 | Navalha | máscara (`mascara-estudo`, Imagem), presa: foto revelada por dentro da palavra "NAVALHA"; a máscara cresce até a foto ocupar a tela | barba na navalha é o serviço-assinatura | foto escurece e vira fundo da próxima |
| 2 | O trabalho | cursor-lupa que inverte as cores da foto (Interação; só com mouse). No toque, a foto inverte ao tocar | ver o detalhe do corte de perto | fio grosso da grade desce |
| 3 | Cortes | `pilha-estudo` (Espaço), presa: cartões de corte (foto + nome) empilham com leve rotação, como fotos no espelho | catálogo de cortes do dia | faixa inclinada de novo, sentido contrário |
| 4 | Preços | tabela em grade visível com números que trocam como placar (Dados e prova); preços "a definir" na demo | preço claro, sem letra miúda | — |
| 5 | Senta aí | `letras-em-cena` (Texto): "SENTA AÍ." letras encontram o lugar | chamada para agendar | — |
| 6 | Contato + rodapé | botão magnético amarelo + WhatsApp que pulsa uma vez (Interação) | agendar pelo WhatsApp; rodapé completo + créditos | — |

Famílias: Texto, Imagem, Interação, Espaço, Dados e prova (5). Cenas grandes: 1 (máscara), 3 (pilha).
Vizinhas nunca repetem família (5 Texto → 6 Interação; 2 Interação ↔ 6 não são vizinhas).

## Celular e reduzido
- Celular: título 18–22vw cortado pela borda, máscara com pin curto, lupa vira toque, pilha com pin curto.
- Reduzido: peso fixo 800, máscara já aberta (foto inteira), pilha em grade, faixa parada; nada escondido.

## Desvios na construção (29/10)
- **Escala do "SECO" e do "SENTA AÍ."**: a Imbue é muito condensada ("SECO" a 900 = 1,5 em). Com 20–30vw a palavra
  ocuparia 30–45% da largura; usei `min(56vw, (100svh − 390px) × 1,5)` no computador e 70vw no celular (corta na borda
  direita ao engrossar). "SENTA AÍ." 30,5vw / 50vw em duas linhas. Caixa do título fixa com `contain: strict`: o peso
  100→900 no carregamento e 900→~280 com a rolagem não mexe no resto (CLS medido 0,0000 em 1440 e 390).
- **Foto por dentro do "SECO"**: em vez de máscara (que repetiria a cena 1), o título usa `mix-blend-mode: difference`
  sobre a foto P&B — onde a letra cruza a foto, a foto aparece invertida dentro dela; como a foto é cinza, não surgem
  matizes (aviso `blend-text` do inspetor defendido).
- **Cenas presas sem `pin`**: o pin do ScrollTrigger (position: fixed) gerou CLS de 0,6–1,0 por cena (total 4,7 a 5,6)
  até com rolagem por roda. Troquei por invólucro alto + `position: sticky` (`.cena-presa`, alturas em `--pin-c/--pin-m`);
  o GSAP só faz o scrub. CLS foi a 0 em todas as larguras e o toque fica liso. Pins finais: Navalha 180/130svh,
  Cortes 180/140svh, Senta aí 120/90svh (encurtados pelo aviso `long-pin`).
- **Costura 2→3**: o "fio grosso que desce" virou linha desenhada (SVG, `strokeDashoffset`, `pathLength=1`) que desce,
  dobra em ângulo reto e entra na seção dos cortes — cobre a família "Ilustração viva" que o `tecnicas.md` pede.
- **Costura 0→1**: a faixa amarela fica logo abaixo da abertura (sem cobrir o "SECO"; o corte do título é só na borda).
- **Senta aí** com fundo amarelo inteiro (o grito vira cartaz) e o contato em tinta, para o botão amarelo saltar.
- **Preços**: placar por fita vertical de caracteres (só transform) que para em "A DEFINIR"; tempos são de demonstração.
- **Papel** com croma menor (`oklch(0.95 0.005 85)`): o inspetor acusava "creme amarelado" com 0,012.
- **Numeração decorativa removida** (01/02/03 nas listas, coluna Nº, "02 —" na Navalha) e rótulos minúsculos em caixa
  alta viraram texto de 13–16px em caixa normal (detector anti-IA). Fica só o contador "1/4" da pilha, que é progresso real.
- **Faixa 2** escura (tinta com texto amarelo), +2,5°, sentido contrário, como previsto.

### Detector anti-IA (taste-skill)
- `lint.mjs src`: 0 FAIL, 0 WARN (antes: 11 FAIL — sombra no botão fixo e numeração).
- `inspect.mjs`: exceções com motivo (`--allow eyebrow,clipped-text,covered-text`):
  `eyebrow` = falso positivo (o botão "Agendar no WhatsApp" fica acima do "SECO" gigante; "Serviço" é cabeçalho de
  tabela); `clipped-text` = palavras da faixa fora da tela, cortadas só na lateral pelo `overflow-x: clip` da moldura
  (o detector não olha o eixo x); `covered-text` = o botão fixo "Agendar" passa sobre "DETALHE" ao rolar (sobreposição
  real e passageira do CTA). Avisos defendidos: `no-footage` (sem vídeo com licença clara), `blend-text` (foto P&B),
  `pinned-over-picture` (texto da Navalha em caixa sólida; título dos Cortes fora da coluna das fotos), `size-count`
  (escala extrema é o estilo).

## Refino da rodada Codex — 29/10 (feedback do usuário)

O usuário gostou da originalidade e pediu calibrar os exageros leves. A abertura “SECO”, a máscara da
Navalha, a paleta, a fonte variável e as fotos em pilha foram preservadas; o ajuste concentra a força
da página nas peças principais, sem trocar o estilo brutalista.

| Parte | Antes → depois | Motivo |
|---|---|---|
| Título dos Cortes | 21/46vw → 18,5/40vw (computador/celular), com recuo menor | a palavra inteira fica legível em390px e disputa menos espaço com o catálogo |
| Senta aí | 30,5/50vw → 28/46vw; deslocamento inicial em55%/60% por eixo, rotação em45% da anterior e escala entre0,85–1,24 | manter as letras em cena, mas tornar a montagem menos explosiva e reconhecer a frase mais cedo |
| Percurso e montagem do Senta aí | 120/90svh → 100/75svh; escalonamento0,09→0,06 | encurtar a última parada antes do contato sem retirar a cena |
| Faixas | base70/45→55/35px/s; impulso0,6→0,4 e teto2200→1400 | a resposta à rolagem continua, com menos competição com as fotos e a leitura |

A lupa já havia sido corrigida na rodada anterior para ampliar em cor normal (os trechos antigos acima
descrevem o plano original). Pausa das faixas, descrições móveis, foco e preferência dinâmica continuam.

Build e revisão de seis larguras × normal/reduzido:12/12. Complemento de pausa/retomada das faixas,
montagem final da frase dentro da tela e reduzido dinâmico:2/2 em390/1440px.
Evidências: `revisao/refino-codex-29-10/`; relatório na mesma pasta. Não é aprovação estética nem teste físico.
