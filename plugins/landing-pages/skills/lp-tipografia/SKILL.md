---
name: lp-tipografia
description: Escolhe a tipografia de uma landing page fugindo das fontes que a IA usa por padrão. Use ao definir fontes de um site novo, ao revisar um site com "cara de IA" ou quando o usuário pedir fontes diferentes. Traz catálogo de fontes gratuitas pouco usadas, lista proibida, receitas de par por personalidade e script de popularidade.
---

# Tipografia sem cara de IA

## Regra de ouro
A fonte nasce da **direção de arte** (skill `lp-direcao-de-arte`), nunca do hábito. Antes de escolher, escreva
em uma frase a personalidade da marca (ex.: "atelier de cor, preciso e generoso").

## 1. Lista proibida (não usar sem motivo forte e explícito)
- Mais populares do Google Fonts: Inter, Roboto, Open Sans, Montserrat, Poppins, Lato, DM Sans, Raleway,
  Nunito, Manrope, Outfit, Plus Jakarta Sans, Work Sans, Figtree, Jost, Archivo.
- Preferidas da IA para "luxo/editorial": Playfair Display, Cormorant / Cormorant Garamond (#66), Fraunces (#85),
  Instrument Serif (#84), DM Serif Display, Lora.
- Preferidas da IA para "moderno/startup": Space Grotesk, Satoshi, Clash Display, General Sans, Cabinet Grotesk,
  Geist, Syne, Bricolage Grotesque, Chillax.
- Pares-clichê: serifa de luxo + Montserrat; Playfair + Inter; Instrument Serif itálico + qualquer grotesca.

Confira qualquer candidata: `python -I <plugin>/skills/lp-tipografia/scripts/popularidade.py "Nome da Fonte"`
(posição no ranking do Google Fonts; abaixo de #120 = batida).

## 2. Onde buscar (todas gratuitas para uso comercial na web; confirme a licença de cada família)
- `catalogo.md` (nesta pasta): famílias conferidas com ranking e personalidade.
- Fontshare (api.fontshare.com): evite as 15 mais vistas; prefira Erode, Gambetta, Bespoke Serif, Recia, Rowan,
  Bonny, Boska, Melodrama, Bespoke Sans, Synonym, Plein, Author, Supreme, Excon.
- Velvetyne (velvetyne.fr), Collletttivo (collletttivo.it), Uncut.wtf, The League of Moveable Type
  (theleagueofmoveabletype.com): experimentais e de autor; ótimas para títulos de marca com personalidade.
- Fora do catálogo comum a licença muda de família para família: **ler a licença de cada fonte** (uso comercial
  na web, se pode hospedar e converter) e anotar no plano. Sempre hospedar no próprio site, nunca puxar de fora.
- Referência de uso real: Typewolf, Fonts In Use (ver como marcas usam a fonte antes de adotar).

## 3. Como montar o sistema
1. **Uma voz de título** com caráter (display ou serifa marcante) e **uma de texto** neutra e legível.
   Um terceiro estilo só para números/rótulos, se a direção pedir (ex.: monoespaçada em preços).
2. Contraste de verdade: largura, peso ou estrutura bem diferentes; nada de "duas serifas parecidas".
3. Escala com razão fixa (1,25 para texto denso; 1,333–1,5 para editorial). Título de abertura grande o bastante
   para ser a imagem da página no celular (min. 44px em 375px).
4. Corpo: 16–18px, entrelinha 1,5–1,7, 60–75 caracteres por linha. Português tem palavras longas:
   teste hifenização, `text-wrap: balance` nos títulos e `pretty` nos parágrafos. Título em caixa alta com
   acento, cedilha ou Q pede entrelinha ≥ 1,15 (o `acabamento.mjs` da `lp-revisao` reprova linhas que se tocam).
5. Detalhes que tiram a cara de IA: itálico verdadeiro (não falso), algarismos de texto ou tabulares conforme o
   uso, versalete/letter-spacing só em rótulos curtos, aspas tipográficas “ ”, travessão — e reticências …
6. Carregamento: hospede os arquivos no projeto (`@fontsource` ou `woff2` em `public/fonts`) com
   `font-display: swap` e pré-carga da fonte do título; corte os pesos que não usar.

## Fontes sorteadas pela taste-skill
O sorteio pode trazer fonte batida (ex.: Public Sans #87): rode o script de popularidade e troque só a família
batida por uma do catálogo com o mesmo papel, registrando o desvio.

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- `ui-ux-pro-max`: `python <plugin>/skills/ui-ux-pro-max/scripts/search.py "<nicho> elegante" --domain typography` lista pares com motivo; filtre pela lista proibida.
- `impeccable` (`reference/typeset`): escala e ritmo.

## 4. Entrega
Registre no `DESIGN.md`/plano do cliente: famílias, pesos, escala, origem e licença, e o porquê da escolha
em uma frase ligada à marca. Rode o script de popularidade em todas as famílias escolhidas.
