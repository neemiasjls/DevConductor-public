# Anexo: bibliotecas de sites bons para o kit (pesquisa de 12/11/2026)

Objetivo: achar galerias novas para a busca de referências (`lp-referencias`) além das que o kit já tem.
Como foi conferido: cada página foi aberta em 12/11/2026. O teste de status usou o mesmo identificador do script do
kit (`DevConductor-lp-referencias/1.0`), sem trocar de cabeçalho. Sem login, sem aceitar cookie, sem enviar formulário.
Nota de 0 a 10 é minha opinião, pensando no gosto do dono (capricho e movimento rico; nada de cara de modelo genérico).
"Viva" = tinha item de 2026 na página ou data recente no `sitemap.xml`.

## 1. Já existem no kit (não repetir como novidade)
Awwwards, Lapa Ninja, One Page Love, GitHub (modelos abertos), Godly, Land-book, SiteInspire, Minimal Gallery,
CSS Design Awards, Framer Marketplace (modelos), Made in Webflow, httpster, craftwork.design (antigo curated.design),
60fps.design, DesignRush, e as bibliotecas de peças (Aceternity, Magic UI, React Bits, Motion Primitives, Animata,
Uiverse, 21st.dev). Saaspo, Behance, Dribbble, Refero e Mobbin já estão como "fora" no kit.
Observações novas sobre elas:
- **Recent.design é o mesmo site do Godly** (a página tem exatamente o mesmo tamanho em bytes e o mesmo robots que
  bloqueia o ClaudeBot). Não é fonte nova; segue só link manual.
- **Awwwards tem filtro por tecnologia no caminho** `/inspiration_search/<tecnologia>/` (testado com `gsap`: 200,
  entradas de 18/09 a 10/11/2026, 5 páginas por `?page=N`; a barra lateral lista React, Webflow, Three.js, Framer,
  WebGL, Lottie, Locomotive Scroll, Next.js). O robots.txt só proíbe `/inspiration_search/?` (com parâmetro), então o
  caminho com a tecnologia está liberado, igual ao `/websites/<categoria>/` que o kit já lê. Também respondem 200
  `/websites/architecture/` e `/websites/real-estate/`. É a maior melhoria de custo baixo: acrescentar tecnologia à busca.
- **Made in Webflow é vitrine, não só modelo**: tem categorias por ramo e por técnica (ver tabela, linha 3). O robots do
  Webflow libera de forma explícita `/api/discover/sites/` e `/api/v1/marketplace/made-in-webflow/`. O kit hoje trata
  como "só link: modelo que só roda dentro do Webflow", o que subestima a fonte como referência de movimento.
- **Lapa Ninja respondeu 200** ao identificador do kit nesta data (a skill registra 403 em 09/11/2026): vale testar de novo.
- **Incoerência no kit**: DesignRush aparece como "fora" (SKILL.md:36) e como galeria à mão (SKILL.md:71).
- Godly, SiteInspire (429 nesta data), Land-book, Minimal e CSSDA: nada mudou; seguem só link manual.

## 2. Entram (ordenadas pela nota)
Todas abrem sem login e sem pagar para navegar. "Termos" = não li os termos de uso de todas; o teste automático de
cláusula de raspagem não terminou (ver "Dúvidas"). Antes de ligar qualquer uma, ler os termos dela.

| # | Nome | Endereço | Foco | Filtro por ramo e endereço do filtro | Robots (o que vi) | Viva 2026 | Nota e motivo | Ligar à busca automática |
|---|---|---|---|---|---|---|---|---|
| 1 | FWA | https://thefwa.com | prêmio histórico (desde 2000) de design digital aventureiro, 1 prêmio por dia | tem Category, Show e Year, mas sem endereço de filtro visível (só formulário) | `Allow: /`; bloqueia só /admin, /api, /s/, /j/, /c/, /e/, /a/ | sim (sitemap 12/11/2026) | **9** — é onde está o movimento rico e autoral que o dono aprova; o sinal de "premiado" é forte | talvez (precisa descobrir o endereço do filtro; hoje só leitura da home e `/judging`) |
| 2 | Made in Webflow (como vitrine) | https://webflow.com/made-in-webflow | sites reais feitos no Webflow, com opção "clonável" | sim, por ramo: `/made-in-webflow/architecture`, `/restaurant`, `/real-estate`, `/health`, `/fitness`, `/event`; por técnica: `/animation/popular`, `/interactions/popular`, `/gsap`, `/scroll-animation`, `/parallax`, `/3d`, `/dark`, `/one-page` | libera de forma explícita `/api/discover/sites/` e `/api/v1/marketplace/made-in-webflow/`; bloqueia /template/, /design/, /dashboard/, /api/ | sim (listagem aberta; sem data por item) | **8** — única fonte que une ramo (arquitetura, restaurante, imobiliário) com técnica (GSAP, scroll, interações); qualidade mista porque entra muito site comum | sim (API liberada no robots; falta testar o formato da resposta) |
| 3 | Framer Gallery | https://www.framer.com/gallery | sites reais feitos no Framer | sim, por ramo/tipo: `/community/gallery/categories/{slug}/` (ex.: `business`; "Design" usa `portfolio-design`; há Legal, Finance, Fashion, Medical). Abas Trending/Recent | só bloqueia `/edit` | sim (aba Recent) | **8** — Framer rende muito movimento por padrão; é vitrine, diferente do Marketplace de modelos que o kit já tem | sim (HTML com 64 sites por página; testar paginação) |
| 4 | webdesign-inspiration.com | https://webdesign-inspiration.com | 2.832 sites escolhidos a mão, em 89 categorias, envio gratuito e revisado | sim: `/web-designs/industry/{architecture,real-estate,food,health,fashion,travel,photography,sport,...}`, `/web-designs/style/{classy,creative,dark,video-background,experimental,...}`, `/web-designs/type/{corporate,portfolio,event,...}`; página: `/web-designs?page=N` | `Allow: /` (bloqueia só ia_archiver e Omgilibot) | sim (lista de 12/11 a 20/01/2026) | **7** — melhor filtro por ramo achado (arquitetura, imobiliário, comida, saúde) com data em cada item; nível visual é misto | sim |
| 5 | bestwebsite.gallery | https://bestwebsite.gallery | 2.644 sites escolhidos por uma pessoa desde 2008, Site do Dia | país: `/sites/country/{nome}` (ex.: `spain`; testar `brazil`); Site do Dia: `/sites/sotd/AAAA/MM/DD/{slug}`; filtro por etiqueta estava quebrado ("Tags could not be loaded") e todas as notas mostram 0,00 | bloqueia só /cpresources, /vendor, /.env, /cache | sim (Site do Dia 29/10/2026; links até 03/11/2026) | **7** — curadoria de uma pessoa, aparência limpa; única achada com filtro de país (serve para sites do Brasil) | talvez (sem filtro de ramo; país e data dão para ler) |
| 6 | siiimple | https://siiimple.com | 1.255 sites minimalistas escolhidos a mão desde 2008 | sim: `/category/architecture/`, `/interior-design/`, `/fashion/`, `/ecommerce/`, `/winery-vineyard/`, `/landing-page/`, `/one-page/`, `/dark/`, `/bold/`; plataforma: `/built-with/webflow/`; "revisados": `/?curated=1` | sem bloqueio de raspagem visto no robots | sim (sitemap 11/11/2026) | **7** — bom para arquitetura e interiores; tende ao minimalismo e ao pouco movimento, então serve mais a composição que a animação. Sem imobiliário nem restaurante | sim |
| 7 | Admire The Web | https://admiretheweb.com | sites limpos, minimalistas e responsivos, diários | sim: `/category/{agency,portfolio,...}`, `/inspiration/tag/{architecture,property,dark-mode,<cor>}` | bloqueia /account, /login, /saved, /search/, /instagram; resto liberado | sim (sitemap 11/11/2026; imagens de 2026/11 a 2026/09) | **7** — etiquetas `architecture` e `property` servem ao dono; sem data por item e a busca interna é bloqueada | sim (só pelos caminhos de etiqueta e categoria) |
| 8 | Landdding | https://landdding.com | 2,7 mil landing pages e modelos (Webflow, Framer, WordPress, Wix, Squarespace), com busca por cor | categoria `/c/{slug}`, etiqueta `/tag/{slug}`, `/color`, `/weekly`, página `/page/N` (91 páginas) | não conferi o robots a fundo (responde 200 ao kit) | "atualizado todo dia", sem data por item | **6** — acervo grande, mas mistura modelo com site real e tem versão Pro com limite | talvez (confirmar o que o Pro limita) |
| 9 | sitesee.co | https://sitesee.co | galeria curada de sites modernos | tipo `/?tags={agency,app,event,informational,personal,product,publication,resource,service,shop}` e cor `/?shades=` | não conferi o robots a fundo | sim (sitemap 12/11/2026) | **6** — curadoria limpa, mas o filtro de tipo não é de ramo e a lista carrega por botão "carregar mais" | talvez (lista paginada por JavaScript) |
| 10 | GSAP Showcase | https://gsap.com/showcase | vitrine oficial do GSAP | `/core/`, `/scroll/`, `/svg/`, `/ui/`, `/text/` (técnica, não ramo) | não conferi | só © 2026, sem datas | **6** — movimento excelente, mas só cerca de 9 sites e quase todos portfólio de dev; serve como olhada manual, não como fonte | não |
| 11 | Seesaw | https://www.seesaw.website | sites e fontes escolhidos a mão | `/category/{agency,ai,crypto,design,developer-tools,e-commerce,fintech,marketing,portfolios,...}`; item `/websites/{slug}` | `Allow: /` | sem data por item | **5** — categorias são de produto digital (IA, cripto, fintech), pouca coisa de pequena empresa | sim (mas rende pouco) |
| 12 | CSS Nectar | https://cssnectar.com | prêmios e site do dia, com indicados | categoria: `/css-gallery/nominees/categories/{slug}/` (ai-tool, ecommerce, portfolio...) | `Disallow:` vazio | sim (site do dia 12/11/2026, datas em cada item) | **5** — tem data por item e prêmio, mas não achei a taxa de inscrição; categorias sem ramo local | talvez (cadastro só para enviar site) |
| 13 | Mindsparkle Mag | https://www.mindsparklemag.com | projetos de design, sites e vagas | `/categories/{website,motion-design,e-commerce,...}` | o robots **proíbe** `?page=`, `?filter=` e `?search=` | sem data visível | **5** — bom nível, mas cadastro e planos pagos (Plus, Pro) e o robots barra a paginação | não |
| 14 | CSS Light | https://www.csslight.com | galeria de sites, "destaque do dia" | `/category/{Business,...}`, `/colour/{Purple,...}` | `Allow: /` | sim (destaques de 06 a 12/11/2026) | **4** — tem patrocinador e não achei se o envio é pago; sem ramo útil | talvez |
| 15 | Typewolf | https://www.typewolf.com | sites por fonte usada | por fonte e por tendência | bloqueia /go/, /all-sites, /sites-using-free-fonts | sim (resposta 200) | **4** como galeria, mas **útil à skill de tipografia** (ver o que sites bons usam) | não (uso manual na `lp-tipografia`) |
| 16 | Unsection | https://unsection.com | seções soltas (bento, preço, hero) | por tipo de seção | bloqueia /collections, /login, /account | sim (sitemap 12/11/2026) | **4** — serve para uma seção só, não para escolher base de site inteiro | não |
| 17 | CTA.gallery | https://cta.gallery | chamadas para ação (botão, formulário, preço) | `/categories/{button,call-to-buy,form,pricing,...}` | `Allow: /` | sim (12/11/2026 e 31/10/2026) | **4** — só o bloco de conversão; útil para a revisão de venda | não |
| 18 | CSS Winner | https://csswinner.com | galeria de prêmio | não conferi | bloqueia /cgi-bin, /style, /js, /css, /new/ | não conferi | **4** — só abri a página (200); sem prova de curadoria nem de taxa | talvez |

## 3. Cortadas (não pesquisar de novo)
- **Recent.design** — é o Godly com outro nome (mesma página, mesmo robots que bloqueia o ClaudeBot).
- **Abduzeedo** — robots bloqueia ClaudeBot e é blog de artigos.
- **Really Good Designs** — robots bloqueia ClaudeBot.
- **Codrops Creative Hub** — robots bloqueia ClaudeBot; são demonstrações de código, não sites no ar.
- **Landingfolio** — foco em página de produto/SaaS, filtro de cor só no Pro, vende modelos.
- **UIUXshowcase** — mistura recurso, modelo e anúncio; patrocínio dentro da lista e itens repetidos.
- **Design Spells** — respondeu 429 ao identificador do kit (bloqueio; a regra do kit é parar na hora).
- **Muzli** — agregador de notícia de design, não galeria de sites.
- **Brutalist Websites** — só estilo bruto; não combina com o gosto do dono.
- **Pixelflakes** — é uma empresa de visualização de arquitetura, não galeria.
- **WordPress Showcase** — página modificada pela última vez em dez/2023; sites institucionais genéricos.
- **ArcFolio** — respondeu 403 (exige navegador).
- **Maxibestof** — 403 ao leitor; não consegui avaliar (cortada por falta de prova, não por ser ruim).
- **Zarla, Sitebuilder Report, Colorlib e listas de blog de construtor** — afiliados e vitrines de modelo próprio.
- **Rankings.io (advogados)** — é de uma agência de SEO; a busca indicou página parada há uns 465 dias; não abri.
- **Listas de "sites brasileiros" (Eco Webdesign, Shopify Brasil, Expande Negócios)** — são projetos da própria
  agência ou de modelos de venda, não galeria.

Sem prova própria (não abertas): Top Design King, WebsURL, BestCSS, Design Nominees, WDAwards, Web Guru Awards,
Astonishing Awards. Os textos de terceiros as descrevem como prêmios de inscrição aberta (a BestCSS cita backlink),
com cara de fazenda de links. Ficam fora até alguém abrir uma por uma; nota presumida 3.

## 4. Lacunas (não achei)
- **Galeria brasileira de sites**: não existe uma que eu tenha achado. O caminho é filtrar por país: o CSSDA tem
  `?country=Brazil` (já no kit, só link) e o bestwebsite.gallery tem `/sites/country/{nome}` (testar `brazil`).
- **Por ramo**: achei galeria com filtro para arquitetura, imobiliário, comida e saúde (linhas 2, 4, 6, 7). Para
  advocacia, clínica, salão, casamento, indústria e transporte **não achei galeria própria**; o que existe é a
  categoria do Awwwards (`/websites/<categoria>/`, já no kit) e a do Framer (Legal, Medical, Fashion).

## 5. As 10 que eu ligaria primeiro à busca automática
1. **Awwwards por tecnologia** (`/inspiration_search/<tecnologia>/`): extensão do que o kit já lê, caminho liberado.
2. **Made in Webflow** (ramo e técnica, API liberada no robots): promover de "só link" para fonte lida.
3. **webdesign-inspiration.com**: melhor filtro de ramo, datas e envio revisado.
4. **Framer Gallery**: movimento por padrão, categorias por ramo.
5. **siiimple**: arquitetura, interiores, vinho, landing page; endereço de categoria limpo.
6. **Admire The Web**: etiquetas `architecture` e `property`.
7. **bestwebsite.gallery**: único com filtro por país (Brasil) e Site do Dia.
8. **FWA**: maior nota de gosto, mas falta descobrir o endereço do filtro (por isso só "talvez").
9. **Landdding**: acervo grande, confirmar o limite do Pro antes.
10. **Seesaw**: endereço de categoria limpo, mas rende pouco para pequena empresa (é o 10º só por ser fácil de ler).

## 6. Dúvidas / o que falta
- Termos de uso: faltou ler os termos de cada galeria que entra. O kit já cortou Land-book, Minimal e CSSDA por isso;
  fazer a mesma leitura antes de ligar qualquer uma acima.
- Robots de landing.love: libera ClaudeBot de forma explícita, mas a página respondeu 403 ao leitor da web e 200
  ao identificador do kit; não avaliei o conteúdo, por isso ficou fora da tabela.
- Readymag Websites of the Year (prêmio anual com envio gratuito, citado por terceiros) não tem página de galeria
  confirmada (`readymag.com/gallery` deu 404); não entrou.
- Webflow: testar a API de descoberta antes de depender dela.
