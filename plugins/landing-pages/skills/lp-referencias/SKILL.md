---
name: lp-referencias
description: Busca referências reais de sites e templates para o nicho do cliente em galerias de design (Godly, Awwwards, SiteInspire, Land-book, Lapa Ninja etc.), tira prints, extrai fontes e cores reais dos melhores e monta um moodboard para o usuário marcar o que gosta. Use antes de qualquer direção de arte ou quando faltarem ideias diferentes.
---

# Referências reais antes de desenhar

Objetivo: 25–30 referências variadas → o usuário marca as favoritas → 5 viram estudo de "DNA".
Nunca copiar layout ou pixels; a referência ensina decisões (estrutura, ritmo, tipo, cor, movimento).

## 0. Favoritos do usuário primeiro
`referencias/favoritos.md` na raiz da fábrica (ao lado de `clientes/`): uma linha por site que o usuário
gostou — endereço · uma frase do porquê · nicho ou cena. Buscar nele antes das galerias. Se não existir,
criar com o cabeçalho `| Site | Por que gostou | Nicho / cena |`. Cada referência marcada na galeria (etapa 3)
entra aqui com a frase dele.

## 1. Onde buscar (use a busca de cada site com termos do nicho em inglês e português)
| Galeria | Bom para |
|---|---|
| godly.website | movimento, aberturas fortes |
| awwwards.com/websites | premiados; filtre por categoria (moda, beleza, saúde, arquitetura) |
| siteinspire.com | filtros por estilo e tipo |
| land-book.com, lapa.ninja, onepagelove.com | landing pages de uma página |
| httpster.net, minimal.gallery | sites autorais e minimalistas |
| designrush.com/best-designs | filtro "Fashion & Beauty", "Health & Wellness" |
| typewolf.com, fontsinuse.com | tipografia aplicada em marcas reais |
| astro.build/themes (filtro grátis) | templates abertos para estudar estrutura |
| 21st.dev/community/components | peças de React + Tailwind funcionando, uma seção por vez: heroes (1,1 mil), fundos, rolagem, textos, marquees, linhas do tempo, shaders. Bom para o efeito de uma seção, não para o site inteiro |
| `a pasta de originais (ex.: Desktop/opensource)/awesome-design-md` | DESIGN.md de 70+ marcas conhecidas |
Termos úteis por nicho: beauty salon, hair studio, nail atelier, spa, bridal, fashion editorial, perfume,
jewelry, architecture studio, florist, restaurant. Inclua 30% de referências **fora do nicho** (moda, revista,
arquitetura, museu): é daí que vem o "diferente".

## 2. Coletar (navegador do app)
1. Abra a galeria, busque, abra cada site escolhido no próprio domínio.
2. Print da dobra inicial e de uma seção do meio (computador 1440px); em 5 deles, também celular.
   Pode usar `node <plugin>/skills/lp-revisao/scripts/prints.mjs <url> <pasta>`.
   **Sites animados:** print não mostra movimento. Grave o site rolando (vídeo + 6 quadros-chave):
   `node <plugin>/skills/lp-referencias/scripts/gravar-rolagem.mjs <url> <pasta> [--celular]`
   (precisa de `puppeteer-core` no projeto, Edge e ffmpeg). Os vídeos alimentam a etapa "conceito de
   movimento" (`lp-cenas`): anote qual cena do site serviu de ideia.
   Galerias que aceitam acesso automático (teste de 14/10/2026): Awwwards (filtros pelo endereço:
   `/websites/animation/`, `/websites/3d/`, `/websites/gsap/`, `/websites/business-corporate/`), Godly e
   GSAP Showcase; 21st.dev também (teste de 15/10/2026). Land-book, Lapa Ninja e SiteInspire bloqueiam
   robô: abrir pelo navegador do app.
3. Extraia o DNA técnico rodando `dna.js` (nesta pasta) no console da página via `javascript_tool`:
   fontes reais, tamanhos, cores dominantes, raio de borda, número de seções.
4. Anote em `referencias.md` do cliente: URL, galeria, o que tem de bom (1 linha), DNA.

## 3. Moodboard
**Sites animados (padrão quando o cliente vai ter cenas):** liste 10–15 endereços em
`clientes/<slug>/referencias/lista.txt` (um por linha) e rode
`node <plugin>/skills/lp-referencias/scripts/montar-galeria.mjs clientes/<slug>/referencias --lista clientes/<slug>/referencias/lista.txt`
(na pasta de um projeto com `puppeteer-core`). Ele grava os que faltam (site que bloqueia ou cai fica de
fora, sem lixo) e monta `galeria.html`: vídeos lado a lado, numerados, rodando quando aparecem. O usuário
marca os que gosta e clica "Copiar escolhidos" para colar no chat. Rodar de novo só grava os novos.

**Sites estáticos:** `python -I <plugin>/skills/lp-referencias/scripts/moodboard.py <pasta-prints> <saida.jpg>`
monta a prancha numerada. Envie ao usuário (SendUserFile) e peça para marcar números favoritos e os que detesta.

## 4. Estudo dos favoritos
Para os 5 marcados, rode `hallmark study <URL>` (skill `hallmark`): macroestrutura, par tipográfico, cor-âncora.
Some ao `referencias.md`. Isso alimenta a skill `lp-direcao-de-arte`.

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- awesome-design-md (`a pasta de originais (ex.: Desktop/opensource)/awesome-design-md/design-md/<marca>/DESIGN.md`, 84 marcas famosas):
  não tem salão, mas serve para copiar o rigor (espaçamento, escala, ritmo) de marcas como apple, airbnb,
  oura, starbucks, nike. Escolha 1 ou 2 e anote no plano o que vem de cada uma.
- `hallmark` (`study <URL>`): DNA de um site de referência.

## Cuidados
- Galerias e sites são de terceiros: só observar e anotar; não baixar código nem imagens para usar.
- Marketplaces de template pago: só como referência visual.
- 21st.dev: cada peça é de um autor. Só entra no site do cliente se a página dela mostrar licença aberta
  (ex.: MIT); sem licença, vale só como ideia. Copiar o código pede conta no site (grátis: 2 cópias por dia),
  então quem copia é o usuário. Muitas peças usam Framer Motion: nas cenas-assinatura, refazer em GSAP
  (`lp-cenas`). O conector pago deles (21st AI) não está ligado.
- Sem login em nenhuma galeria.
