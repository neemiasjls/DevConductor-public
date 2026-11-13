# Relato da prova: caminho por referência (landing-pages 0.4.0)

Negócio fictício (Marcenaria Aroeira) sobre a base for-living.it. Fatia: cabeçalho, abertura presa, faixa de ambientes, rodapé.

## Tempo e voltas
- Leitura do kit, roteiro e prints: ~15 min. Fotos (busca, escolha, download, tratamento): ~30 min, a parte mais lenta (Openverse com 504 em série).
- Código das 4 seções: ~20 min. Laço visual: 2 voltas na página inteira (não por seção: o comparador mede a página toda, ver problema 3).
- Volta 1: 4 altas, 9 médias, 5 baixas. Volta 2: 3 altas, 9 médias, 3 baixas, código de saída 1 (`revisao/volta-1`, `volta-2`, `final`).
- Não fiz a 3ª volta nem a conferência visual em 390 px e com movimento reduzido no navegador: parei no limite de chamadas.

## Divergências altas que sobraram e por quê
1. Número de seções (7 × 3): é fatia de propósito; o comparador não tem como dizer "só estas seções".
2. Escala 15,3× no rodapé: a marca d'água em `<svg><text>` conta como título. Na base é imagem. Medida engana.
3. Cena "pilha" × "presa": o nosso tem o mesmo desenho (3 cartões sobem juntos sobre o bloco preso), mas os cartões têm alturas
   desencontradas (como na base) e o raio-x lê isso como escada → pilha. Não confirmei a regra exata no código.
- Média que engana: título da abertura medido 0,87× quando na tela é 72 px (4,5×). Na volta 1 a cota "4,20 m" da planta (SVG) virou o título.

## Nível em relação à base
- Ficou perto: cabeçalho em cápsula, hierarquia e ritmo da abertura, faixa preta com régua, rodapé com relevo.
- Não ficou: o fundo. A base usa um macro desfocado, com sombra de folhas e luz; o nosso é tábua de madeira chapada (960 px,
  foto de banco), literal demais. É o que mais denuncia "montado". As fotos dos ambientes têm luz e câmera diferentes entre si;
  o `tratar-fotos.py` uniformizou cor, mas não salva enquadramento ruim. Assinatura em itálico em vez de manuscrita perde um toque.

## Problemas do kit (não corrigidos, só relatados)
1. `lp-referencias/scripts/raio-x.mjs`: ignora texto com `color: transparent` (texto em degradê com `background-clip`); o título some e
   um `<text>` de SVG vira título. Sugestão: medir a cor de `background-image` quando `background-clip: text`, e não contar `<text>` de SVG `aria-hidden`.
2. `raio-x.mjs`: marca d'água em SVG/texto gigante conta como título e estoura a escala. Sugestão: ignorar elementos `aria-hidden` e texto com menos de 2 palavras e > 10× o corpo, ou marcar como "decorativo".
3. `lp-revisao/scripts/comparar-referencia.mjs`: só compara a página inteira. O `lp-construcao` manda comparar "por seção, na ordem, até 3 voltas",
   mas não há `--secoes 1,2,4,8`; em fatia, as altas de nº de seções e comprimento nunca somem. Sugestão: opção `--secoes` (ou `--fatia`).
4. `lp-construcao` (laço visual) manda comparar em agente separado e "nada de imagem na conversa", mas o pedido e o bom senso de diretor de arte pedem olhar
   os prints. O número sozinho aprovaria o fundo ruim. Sugestão: o agente devolve a lista e o principal olha 1 print por seção da cena principal.
5. `lp-assets/scripts/tratar-fotos.py --do-raio-x`: avisa "raio-x sem secoes[].cores" — o `raio-x.mjs` não grava esse campo, então a sugestão de tom nunca funciona. Sugestão: gravar `cores` por seção no raio-x (média e dominante do print) ou tirar a opção.
6. `lp-assets/scripts/buscar-fotos.mjs` (openverse): sem chave, a única fonte; o filtro `source=stocksnap,wordpress,rawpixel` deixa poucas fotos, a API deu 504 em
   metade das buscas e o "original" vem com 960–1024 px (pequeno para fundo em tela cheia). Sugestão: dizer isso na skill, repetir com espera, e cair para `buscar-commons.mjs`, que funcionou melhor.
7. `buscar-commons.mjs`: baixar o original em série deu 429 (limite do Wikimedia) num dos arquivos, gravando 3 KB de erro como `.jpg` sem aviso. Sugestão: o fluxo de download conferir status e tamanho.
8. Saída do Python no Windows com acento quebrado ("padr�o", "m�nimo"): `tratar-fotos.py` não força UTF-8. Sugestão: `sys.stdout.reconfigure(encoding='utf-8')`.
9. `lp-cenas/buscar-efeito.mjs presa`: devolve ~100 linhas sem ordem de proximidade; o raio-x diz "camada sobre bloco preso", que não é tipo válido. Sugestão: aceitar os subtipos do roteiro e mostrar 3 melhores.
10. `raio-x.mjs` mediu o cabeçalho da base como "fundo #ffffff, texto #ffffff" (é cápsula escura) e os prints da base saíram com o aviso de cookies cobrindo 1/6 da tela. Sugestão: fechar/ocultar o aviso só no print (sem aceitar) e medir a cor do elemento opaco mais próximo.
11. Não há raio-x de celular da base, então `--celular` não se aplica e o 390 px fica sem comparação. Sugestão: o maestro mandar tirar os dois raio-x junto.
12. `lp-maestro` passo E3 pede pasta `clientes/<slug>/conceitos/1` e `lp-direcao-de-arte` pede `direcao.md`; o pedido usou `plano.md` numa pasta de piloto. Os dois nomes para a mesma tabela confundem. Sugestão: um nome só.
