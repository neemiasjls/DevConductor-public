# Prova do design v2: andamento

Página inteira (8 seções da base for-living.it), computador e celular. Régua: nota >= 9 por seção dada por juiz às
cegas, portão do celular e Lighthouse passando. **Ainda sem nota: nada aqui está aprovado.**

## Feito (11/11)
- Fundos próprios gerados por `fotos/texturas.py` (numpy + Pillow, sem foto de banco): `fundo-abertura` (lâmina de
  madeira avermelhada com sombra de folha e luz de janela), `fundo-escuro` (seção Sobre) e `fundo-claro` (chamada
  final). Substitui a tábua chapada, que era o defeito principal da v1.
- Seções novas: `Oficio.tsx` (base 3: fundo claro, cartão grande com vista de frente da cozinha e pontos de medição
  em `Elevacao.tsx`, dois cartões com foto), `Processo.tsx` (base 5: quatro passos em escada sobre brilho esverdeado),
  `Historia.tsx` (base 6: texto, duas assinaturas, foto quadrada em preto e branco), `Chamada.tsx` (base 7).
- Assinatura manuscrita (fonte Mrs Saint Delafield, OFL) na abertura e nos sócios; menu com Ofício, Ambientes, Sobre.
- Ajustes depois do primeiro olhar: planta da abertura mais fraca, só à direita e fora do celular; veio do fundo
  escuro mais calmo; botão fixo do WhatsApp só com ícone no celular (cobria texto).
- Build passa. Prints da 1ª volta em `revisao/v2/nosso-1/` e folhas `folha-computador-1.jpg`, `folha-celular-1.jpg`
  (tirados ANTES dos três ajustes acima).

- Fotos de oficina escolhidas e aplicadas (candidatas em `fotos/busca/v2/`, 23 do Wikimedia Commons): `maos` =
  `maos-02` (mão lixando), `detalhe` = `maos-07` (mão conferindo peça curva; o cartão virou "Acabamento conferido
  à mão"), `oficina` = `oficina-02` (bancada, usada em preto e branco). Recorte e cor por Pillow direto, sem o
  `tratar-fotos.py`. Créditos em `creditos.md` e `assets.md`; a foto `madeira` saiu do site.
- 2ª volta de prints em `revisao/v2/nosso-2/` e `folha-2.jpg` (abertura, Ofício e Sobre, computador e celular):
  no meu olhar, abertura limpa, Ofício e Sobre de pé. É só o meu olhar, não é nota.

## Feito na retomada (11/11, tarde)
- Olhadas as seções que faltavam (prints em `revisao/v2/nosso-3` a `nosso-5`, folhas `folha-3` a `folha-5`).
- Corrigido: botão fixo do WhatsApp encolhe para ícone depois da abertura e some enquanto o botão da chamada
  final está na tela; fotos da faixa de ambientes com o mesmo tratamento de cor; fundo claro sem risco; faixas de
  luz da seção clara mais visíveis; emblema da abertura afastado do cabeçalho no celular; vão entre ambientes e
  Processo menor; fundo próprio do Processo (`fundo-processo`, por `texturas.py`); título da chamada mais escuro
  (contraste 4:1); rodapé com frase curta e mais clara; áreas de toque de 44 px; legenda como `figcaption`.
- Retrato estático no build (`prerender.mjs` da `lp-seo`, precisa de `puppeteer-core`) e fonte do título adiantada.
- **Portões de número, todos passando:** celular aprovado (360, 390 e deitado; Safari não conferido); Lighthouse
  celular 91 / computador 100, acessibilidade 100 (SEO 63 é o `noindex` da demonstração; medir com
  `revisao/v2/servir-gzip.mjs`); comparador 0 alta no computador e no celular (`revisao/v2/comparacao*/`).
- Dois defeitos do kit corrigidos (trava falsa no portão do celular; pareamento do comparador) e lista em
  `problemas-do-kit-v2.md`. `landing-pages` foi a 0.4.5, catálogo atualizado.

## Nota do juiz às cegas (1ª rodada, 11/11) — REPROVADO, abaixo de 9
Material em `revisao/v2/juiz/` (gabarito em `revisao/v2/juiz-gabarito/`). O nosso foi apontado como "gerador" nas
duas telas. A referência também não chegou a 9 em tudo (média ~8,1).

| Seção | Computador (nosso) | Celular (nosso) | Referência comp. / cel. |
|---|---|---|---|
| 1 abertura | 8 | 7,5 | 9 / 7,5 |
| 2 cartões (Ofício) | 7,5 | 7,5 | 9 / 8,5 |
| 3 ambientes | 6,5 | 6,5 | 7 / 7,5 |
| 4 processo | 8 | 8 | 6,5 / 8,5 |
| 5 sobre | 8,5 | 7,5 | 8,5 / 8,5 |
| 6 chamada | 7,5 | 8 | 8 / 8 |
| 7 rodapé | 7 | 7,5 | 8,5 / 8,5 |

O que o juiz pediu (sem contar troca de foto):
- Geral: cabeçalho fixo corta o título das seções (dar mais respiro no alto de cada seção / margem de rolagem);
  botão do WhatsApp ainda tapa texto no celular.
- 1: fundo "borrão sem matéria": textura de madeira nítida, veio visível; desenho técnico mais presente; no
  celular, órfã "dias." e terço de baixo vazio.
- 2: mais 40–60 px entre cabeçalho e título; as duas fotos com a mesma cor; título do celular em 2 linhas
  equilibradas.
- 3: no celular, um cartão central com as bordas dos vizinhos (hoje dois cortados); legenda não pode cortar; aviso
  de fotos ilustrativas dentro da tela.
- 4: clarear o cinza do texto; ocupar o canto superior direito (número grande ou desenho).
- 5: no celular, assinaturas lado a lado e foto antes do texto.
- 6: cortar a faixa escura morta acima da chamada.
- 7: letras "EIR" do contorno gigante sobrepostas (parece defeito); espaço igual entre colunas; no celular, Menu e
  Contato em duas colunas, links mais juntos, fechar com a marca grande.

## Feito depois da 1ª nota (11/11, fim da tarde)
- **Fundos refeitos (o dono reprovou: sem cor, verde pixelizado, madeira sem qualidade; DEV-72).** Abertura, Sobre e
  chamada agora saem de textura de madeira fotografada (Poly Haven, CC0), tingida por `fotos/texturas.py`, em 2400 px
  e qualidade 80. O verde do Processo virou degradê em CSS com grão por cima (não pixeliza). `fundo-processo` saiu.
- Lista do juiz aplicada: respiro de 17svh (mín. 152 px) no alto de cada seção; abertura com desenho técnico mais
  presente, título em 4 linhas equilibradas no celular, sem órfã e com os cartões já apontando embaixo; Ofício com as
  duas fotos no mesmo tom; ambientes no celular com um cartão central e a borda dos vizinhos (arrastar, com encaixe),
  legenda e aviso dentro da tela; Processo com texto mais claro e "45 dias" em contorno no canto direito; Sobre sem
  faixa morta embaixo, foto antes do texto e assinaturas lado a lado no celular; rodapé com a marca gigante sem letras
  sobrepostas, colunas de mesma largura e Menu/Contato em duas colunas no celular.
- Botão fixo do WhatsApp: tentei tirar no celular (o juiz reclamou que tapa texto), mas o portão do celular reprova
  (contato fora do alcance do polegar). Voltou, só com o ícone.
- Portão do celular: aprovado (360 e 390; Safari não conferido). Prints em `revisao/v2/nosso-7/`.
- **Não refeitos ainda:** Lighthouse e comparador com a referência.

## Nota do juiz às cegas (2ª rodada, 11/11) — AINDA REPROVADO, abaixo de 9
Material em `revisao/v2/juiz-2/` (gabarito em `revisao/v2/juiz-2-gabarito/`). Média do nosso: computador 8,1 (era
~7,6), celular 8,3 (era ~7,5). Referência: 8,6 e 8,7. O nosso ainda foi apontado como "adaptado" nas duas telas.
O juiz notou que os nossos prints saíram em resolução maior que os da referência: igualar na próxima rodada.

| Seção | Computador (nosso) | Celular (nosso) | Referência comp. / cel. |
|---|---|---|---|
| 1 abertura | 8 | 8 | 9,5 / 9 |
| 2 cartões (Ofício) | 8,5 | 8,5 | 9 / 9 |
| 3 ambientes | 7,5 | 8 | 8 / 8 |
| 4 processo | 8,5 | 9 | 7,5 / 8,5 |
| 5 sobre | 8,5 | 8 | 9 / 9 |
| 6 chamada | 8 | 8,5 | 8,5 / 8,5 |
| 7 rodapé | 8 | 8 | 9 / 9 |

O que o juiz pediu agora (em ordem de gravidade):
1. Botão do WhatsApp no celular cobre aviso das fotos, fim do parágrafo do Sobre e miniatura da abertura. O portão
   do celular exige o botão: resolver com margem/recuo do conteúdo ou botão que some sobre texto (e levar ao kit).
2. Acentos, cedilha e cauda do Q batem na linha vizinha nos títulos (entrelinha 1,02 é pouco para caixa alta com
   acento em português): subir para ~1,12.
3. Texturas: abertura ainda lida como borrada (a camada escura por cima e a sombra apagam a fibra; há um retângulo
   de sombra com borda à direita); Sobre com mancha escura atrás do título e esticada no celular (usar recorte em
   pé no celular); chamada granulada e título com contraste baixo.
4. Faixa de ambientes: um tratamento de cor só nas seis fotos (duotom ou curva comum); borda fina no cabeçalho.
5. Letras em contorno com emenda ("45" e marca do rodapé): a fonte tem traços sobrepostos; converter em traçado
   unido ou trocar contorno por relevo/preenchimento fraco.
6. Menores: desenho da cozinha com traço fino e cotas (hoje caixas chapadas); cotas da planta da abertura mais
   claras; nome repetido nas assinaturas (deixar só o cargo); Social junto do Contato; aviso do rodapé mais legível;
   menu no celular; legendas dos cartões vizinhos escondidas no celular; menos vazio acima do título de ambientes.

## Feito depois da 2ª nota (11/11, noite)
- Botão do WhatsApp no celular virou barra inteira no pé da tela (aparece depois da abertura, some na chamada
  final); no computador segue o botão no canto. Rodapé com folga para a barra.
- Entrelinha dos títulos 1,02 → 1,12 (acento e cedilha não batem mais na linha de cima).
- Fundos (`fotos/texturas.py`): abertura agora em jacarandá (`rosewood_veneer1`, Poly Haven CC0) recortado perto do
  tamanho real, na cor da própria madeira, sem sombra desenhada; camada escura só atrás do texto. Sobre em trecho
  de fibra reta, sem nó, com recorte em pé para o celular (`fundo-escuro-pe`). Chamada com menos contraste na
  textura e título mais escuro.
- Faixa de ambientes: um tratamento só nas seis fotos (`.tom-unico`, quase duotom; a cor volta ao passar o mouse);
  no celular, uma legenda só (a do cartão do meio) e foto 4:5 para o aviso caber na tela; menos vazio acima do título.
- Letras em contorno: "45" virou relevo em degradê (`.numero`); marca do rodapé com `paint-order: stroke` (o
  preenchimento cobre a emenda dos traços da fonte).
- Menores: desenho da cozinha em traço fino com cotas; cotas da planta da abertura mais claras; assinaturas só com
  o cargo; Instagram junto do Contato (rodapé com duas colunas); aviso do rodapé maior e mais claro; borda fina no
  cabeçalho; menu no celular (botão de duas linhas que abre a lista).
- Portão do celular: aprovado (360, 390 e deitado; Safari não conferido). Na 1ª passada reprovou dois itens novos
  (4 px entre "Orçamento" e o botão de menu; legenda escondida por opacidade), corrigidos.
- Prints em `revisao/v2/nosso-8/` (folhas `folha-computador.jpg` e `folha-celular.jpg`). Material da 3ª rodada em
  `revisao/v2/juiz-3/`, com os nossos prints reduzidos para a mesma resolução da referência (1440×900 e 390×844).

## Nota do juiz às cegas (3ª rodada, 11/11, noite): AINDA ABAIXO DE 9, mas acima da referência
Material em `revisao/v2/juiz-3/` (gabarito em `juiz-3-gabarito/`). Média do nosso: computador 8,4 (referência 8,1),
celular 8,1 (referência 7,9). O nosso ainda foi apontado como "adaptado" nas duas telas. A referência caiu de 8,6
para 8,1 com as mesmas imagens: o juiz oscila uns 0,5 ponto de uma rodada para outra.

| Seção | Computador (nosso) | Celular (nosso) | Referência comp. / cel. |
|---|---|---|---|
| 1 abertura | 8 | 8 | 9 / 7,5 |
| 2 cartões (Ofício) | 8,5 | 8 | 8,5 / 8,5 |
| 3 ambientes | 8,5 | 8,5 | 7,5 / 7,5 |
| 4 processo | 9 | 8,5 | 7,5 / 8 |
| 5 sobre | 8 | 8,5 | 8 / 8 |
| 6 chamada | 8,5 | 7,5 | 7,5 / 7,5 |
| 7 rodapé | 8 | 7,5 | 8,5 / 8 |

Pedidos do juiz: menu fixo cobrindo conteúdo; madeira da abertura espelhada (jacarandá em lâminas casadas);
madeiras do Sobre e da chamada "moles"; legenda cortada na borda da faixa; coluna de contato desigual; no celular,
miniaturas da abertura cortadas, cotas ilegíveis, vazio acima dos títulos, linha solta no último passo.
Codex (`.codex/resposta-design-3.md`, 13 itens, notas 7,7 a 8,4): procedem e foram aplicados a emenda da faixa
automática (salto de 16,5 px), a escada do Processo cortando em tela intermediária, o botão de WhatsApp escondido
ainda alcançável por teclado, o Instagram apontando para "#", o texto do Sobre direto na madeira e os cartões do
Ofício lavados. Descartados: cartões de ambientes maiores e botão sem contorno (vêm da referência), botões
anterior/próximo no celular (ficou o indicador "2 / 6"), menos verde no Processo (o juiz deu 9).
Números: comparador 0 alta nas duas telas (10 médias cada, quase todas de ritmo de movimento); Lighthouse
computador 100; celular 84 (LCP 4,3 s; era 91).

## Feito depois da 3ª nota (11/11, noite)
- Menu sai ao rolar para baixo e volta ao rolar para cima; fecha com Escape.
- Fundos em tamanho real e com nitidez: abertura voltou à nogueira defumada (lâmina inteira, sem espelhamento,
  sem sombra desenhada); Sobre e chamada recortados 1:1. Camada escura de 20% no Sobre.
- Abertura no celular: três miniaturas alinhadas e inteiras no pé. Menos vazio acima dos títulos no celular.
- Faixa de ambientes: bordas esmaecidas, emenda corrigida, indicador "2 / 6" e aviso curto no celular.
- Processo: escada só em tela larga; último passo sem linha solta. Desenho da cozinha com traço mais firme e sem
  cotas no celular. Rodapé: contato com linhas iguais, horário em duas linhas, Instagram sem link falso, aviso curto.
- Barra do WhatsApp mais baixa (46 px) e invisível de verdade quando escondida.
- Portão do celular aprovado. Lighthouse do celular refeito: 85 (LCP 4,2 s), **abaixo dos 91 de antes: a ver**.
- Prints em `revisao/v2/nosso-9/`; material da 4ª rodada em `revisao/v2/juiz-4/` (gabarito em `juiz-4-gabarito/`).

## Nota do juiz às cegas (4ª rodada, 11/11, noite): AINDA ABAIXO DE 9
Material em `revisao/v2/juiz-4/` (computador H = nosso, celular L = nosso). Média do nosso: computador 8,4 (igual
à 3ª), celular 8,3 (era 8,1). Referência: 8,1 e 7,9. Nenhuma seção nossa abaixo de 8, nenhuma em 9. O nosso segue
lido como "adaptado, mas mais bem acabado e uniforme".

| Seção | Computador (nosso) | Celular (nosso) | Referência comp. / cel. |
|---|---|---|---|
| 1 abertura | 8,5 | 8 | 9 / 7,5 |
| 2 cartões (Ofício) | 8,5 | 8 | 8,5 / 8,5 |
| 3 ambientes | 8,5 | 8,5 | 7,5 / 7,5 |
| 4 processo | 8,5 | 8,5 | 7 / 8 |
| 5 sobre | 8,5 | 8,5 | 8 / 8 |
| 6 chamada | 8,5 | 8,5 | 8 / 7,5 |
| 7 rodapé | 8 | 8 | 8,5 / 8,5 |

O que o juiz pediu (nosso), por gravidade:
1. Abertura, computador: botão fixo do WhatsApp cobre a ponta da cota "4,20 m"; planta rala perto do resto; o "f"
   da letra cursiva quase toca o título. Celular: miniaturas coloridas destoam do sépia usado depois, etiqueta
   cobre a base da foto, terceira encosta na margem.
2. Rodapé: contorno da marca quase invisível e largo demais; coluna Contato com ritmo desigual ("Showroom" em duas
   linhas); dois avisos de "fictícia"; no celular, Menu e Contato desalinhados e avisos colados na barra.
3. Ofício: acentos de "À ÚLTIMA" ainda encostam na linha de cima e a cedilha invade a de baixo (1,12 ainda é
   pouco: ir a ~1,18); no celular a barra corta o segundo cartão e sobram 110 px acima do título.
4. Processo: mancha verde forte atrás do texto das etapas 2 e 3 (o Codex já tinha dito); traço da etapa 4 cortado.
5. Sobre: veio com cara de padrão esticado; no celular o texto termina cortado na barra fixa.
6. Chamada: contraste do título só razoável. Ambientes: nitidez desigual entre as fotos; aviso pequeno e solto.

## Feito depois da 4ª nota (11/11, noite): conferência automática do kit rodada na prova
- Script novo do kit `lp-revisao/scripts/acabamento.mjs` (plano `docs/planos/2026-11-11-acabamento-e-juiz.md`):
  na 1ª passada achou 12 "nunca passa" (entrelinha 1,12 nos cinco títulos, nas duas telas; fundo da abertura
  ampliado 3,55× e fundo da chamada 2,11× no celular), 9 "exige justificativa" (órfãs, cor desigual) e 4 avisos.
- Consertado: entrelinha 1,18; abertura com recorte em pé só para o celular (`fundo-abertura-pe`, por `<picture>`);
  `sizes` certos na chamada e na faixa; `text-wrap: pretty` nos parágrafos; miniaturas da abertura no mesmo tom das
  fotos de ambientes; menos vazio acima do título de ambientes; letra cursiva mais longe do título; marca do rodapé
  com contorno mais visível e um aviso só; verde do Processo mais contido; título da chamada mais escuro.
- Resultado: `acabamento.mjs` saída 0 (zero "nunca passa"; restam justificativas: órfãs e cor desigual, esta com
  falso positivo conhecido por pesar claridade). Portão do celular aprovado. Prints em `revisao/v2/nosso-10/`.
- **Lighthouse do celular: 83 (LCP 4,5 s, FCP 1,8 s). Causa achada:** o texto aparece cedo pelo retrato estático,
  mas o `createRoot().render` troca a página inteira quando o JavaScript chega e a medição conta esse segundo
  desenho. É defeito do caminho do kit (`prerender.mjs` + `createRoot`), não da imagem: precisa de hidratação
  (`hydrateRoot`) ou de retrato que o React aproveite. Levar a `problemas-do-kit-v2.md`. Relatório guardado em
  `revisao/v2/nosso-10/lighthouse-celular.json` (o da rodada 9 em `revisao/v2/lighthouse/celular-rodada-9.json`).
- Não aplicado da lista da 4ª rodada: planta da abertura mais densa; botão do WhatsApp sobre a ponta da cota no
  computador; nitidez desigual das fotos de ambientes; alinhamento Menu × Contato no celular.

## 5ª nota: painel de 5 juízes sobre `nosso-10` (11/11, noite)
- `revisao/v2/juiz-6/nota-final.md`. Medianas do nosso × referência, computador: 8,2×8,1 · 8,15×7,8 · 7,3×6,85 ·
  7,85×6,3 · 7,75×7,85 · 7,7×6,85 · 7,55×7,7. Celular: 8,15×7,9 · 7,65×7,7 · 7,3×7 · 7,7×7,2 · 7,4×7,55 ·
  7,4×6,7 · 7,35×7,05. Reprovado nas duas réguas antigas; 5 de 5 viram o nosso como adaptado (avisos de fictício).
- Consertado em seguida: 45 mais visível e no celular, setas no carrossel, título de Ambientes sem prometer obra
  própria, rodapé do celular, marca do rodapé, cota fora do botão. Sem prints novos ainda.
- Pedido por 2 ou mais juízes e não feito: foto do Sobre (oficina antiga em P&B não combina com planejados);
  chamada final genérica; pontos do desenho sem legenda; fotos de banco em Ambientes; barra fixa tapando texto nos
  prints do celular (defeito do print, vai para o kit).

## Falta, nesta ordem
1. Painel de juízes com papéis diferentes + Codex sobre `nosso-10` (material: `juiz.mjs montar`). Resolver o LCP
   do celular (hidratação). Itens não aplicados acima.
2. 3ª rodada do juiz às cegas (prints na mesma resolução dos da referência); laço até toda seção >= 9.
3. Suíte inteira e validates; `gerar-vitrine` só fecha depois do commit da prova.
4. Atualizar `plano.md` (ainda descreve a fatia de 4 seções).
