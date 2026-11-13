---
name: lp-referencias
description: Antes de qualquer desenho de landing page, busca por categoria do negócio (salão, barbearia, transporte...) exemplos de sites animados em galerias abertas (Awwwards, One Page Love, Lapa Ninja) e modelos grátis com licença aberta (GitHub), tira duplicados e monta uma galeria local para o usuário escolher a base e dizer o que muda; depois tira o raio-x dos escolhidos (estrutura e movimento por seção, roteiro e custo; prints, vídeo e DNA à mão só se o site bloquear). Use no começo de toda LP nova ou quando faltarem ideias.
---

# Referências reais antes de desenhar

Objetivo: mostrar ao usuário **todos** os exemplos que as fontes abertas trazem para a categoria → ele escolhe 1 ou
mais como base e diz o que muda → o raio-x dos escolhidos vira a planta do site (seção 2). A escolha dele vem antes de qualquer desenho
(DEV-53): gerar do zero sai com cara de IA.

## Regra de cópia
- **Site com dono** (galerias): estudar ritmo, composição e movimento. Não copiar código, textos, imagens nem marca,
  e não recriar o site. A galeria guarda só link e aponta para a miniatura da própria fonte, com crédito; nada é baixado.
- **Modelo com licença aberta** (GitHub MIT/Apache-2.0): pode ser base de código. Conferir o LICENSE do repositório,
  registrar em `fontes.json` do projeto do cliente e manter o aviso de copyright. Fotos e marcas do modelo não vêm junto.
- Ativos do site seguem a regra de licença da `lp-assets`.

## 1. Galeria por categoria (passo padrão)
`node <plugin>/skills/lp-referencias/scripts/buscar-referencias.mjs <categoria> --saida clientes/<slug>/referencias [--paginas 1-5]`
(`--categorias` lista: salao, barbearia, estetica, transporte, restaurante, clinica, academia, arquitetura,
imobiliaria, moveis, eventos, noivas, odontologia, pet, moda). Saída: `referencias.json` e `galeria.html`. Abrir a galeria no navegador do usuário (link
`file:///` impresso no fim) e dizer quantos vieram de cada fonte. Ele marca, escreve o que muda e clica
"Copiar escolhidos"; a resposta dele vai para `clientes/<slug>/referencias.md` e para `referencias/favoritos.md`.
`--recomendados <arquivo.json>` (`[{"n":114,"motivo":"..."}]`; ou `recomendados.json` na pasta de saída) põe os escolhidos no topo da galeria; `--so-montar` refaz só o HTML a partir do `referencias.json`.
Categoria nova: acrescentar em `CATEGORIAS` no script, com os endereços de categoria de cada fonte, e no teste.

| Fonte | Lida pelo script | O que traz | Por quê (conferido em 09/11/2026) |
|---|---|---|---|
| Awwwards `/websites/<categoria>/` | sim | sites premiados, etiquetas de movimento (Animation, GSAP, WebGL, 3D) | robots.txt libera o caminho de categoria; `?text=` não |
| One Page Love `/tag|genre/<x>` | sim | sites de uma página com vídeo da rolagem | robots.txt libera e convida assistentes; `?s=` não. API oficial ainda em lista de espera |
| Lapa Ninja `/category/<x>/` | tenta | landing pages com print da página inteira | robots.txt libera, mas respondeu 403 ao script: abrir à mão |
| GitHub (busca com `license:mit` / `apache-2.0`) | sim | **modelos inteiros** para usar como base | API pública, sem chave (10 buscas/min) |
| Godly, Land-book, SiteInspire, Minimal Gallery, CSS Design Awards | não, só link | | Godly bloqueia ClaudeBot; Land-book proíbe coleta; SiteInspire 429; Minimal e CSSDA proíbem copiar |
| Framer Marketplace, Made in Webflow | não, só link | modelos | só rodam dentro da plataforma deles |
| Saaspo, DesignRush, Behance, Dribbble, Refero, Mobbin | fora | | 403, login ou vazio |
Bloqueio (401/403/429) encerra a fonte na hora: não trocar de cliente, cabeçalho ou caminho para passar.

## 1b. Peças animadas instaláveis (para montar o site escolhido)
O shadcn CLI 4.23 instala direto neste Windows (testado em 09/11/2026: `view`, `add` e `mcp`):
| Biblioteca | Instalar | Licença em site de cliente |
|---|---|---|
| Aceternity UI (parte grátis) | `npx shadcn@latest add @aceternity/<peça>` | sim (licença própria: uso livre em produto de cliente, não revender a peça); modelos e blocos Pro são pagos (o registro devolve "não autorizado") |
| Magic UI | `npx shadcn@latest add @magicui/<peça>` | MIT |
| Motion Primitives | `npx shadcn@latest add @motion-primitives/<peça>` | MIT |
| React Bits | `npx shadcn@latest add @react-bits/<Peça>-<variante>` (o nome pede a variante, ex.: `@react-bits/SplitText-TS-CSS`) | MIT + Commons Clause (usar no site sim, revender a peça não) |
| Animata | `npx shadcn@latest add https://animata.design/r/<grupo>/<peça>.json` | MIT |
| Uiverse | copiar da página (sem registro nem MCP) | MIT |
| Fontshare (fontes) | API `api.fontshare.com/v2/fonts` (ver `lp-tipografia`) | ITF Free Font License ou OFL, conforme a fonte |
MCP: o servidor oficial `npx shadcn@latest mcp` respondeu no Windows (busca, exemplos e comando de instalação em
qualquer registro do `components.json`). Ligar só no projeto do cliente (`.mcp.json` dele), nunca no global.
O MCP próprio de cada biblioteca (ex.: o do Magic UI) não foi testado; o do shadcn já cobre todos os registros acima. Modelos inteiros grátis com licença aberta
saem do GitHub (seção 1); Aceternity, Magic UI e Framer vendem os modelos completos.

## Favoritos do usuário (junto com a galeria)
`referencias/favoritos.md` na raiz da fábrica (ao lado de `clientes/`): uma linha por site que o usuário
gostou — endereço · uma frase do porquê · nicho ou cena. Buscar nele antes das galerias. Se não existir,
criar com o cabeçalho `| Site | Por que gostou | Nicho / cena |`. Cada referência marcada na galeria (etapa 3)
entra aqui com a frase dele.

## 1c. Outras galerias (busca à mão, quando a galeria automática vier curta)
| Galeria | Bom para |
|---|---|
| godly.website | movimento, aberturas fortes |
| awwwards.com/websites | premiados; filtre por categoria (moda, beleza, saúde, arquitetura) |
| siteinspire.com | filtros por estilo e tipo |
| land-book.com, lapa.ninja, onepagelove.com | landing pages de uma página |
| httpster.net, minimal.gallery | sites autorais e minimalistas |
| craftwork.design/inspiration/websites (antigo curated.design) | sites escolhidos a dedo, grátis; a coleção de seções serve de referência para uma seção só |
| 60fps.design | movimento de apps reais (microinterações, transições de tela); grátis para navegar, filtros e MCP são pagos. Só olhar à mão: os termos proíbem coleta para treino |
| designrush.com/best-designs | filtro "Fashion & Beauty", "Health & Wellness" |
| typewolf.com, fontsinuse.com | tipografia aplicada em marcas reais |
| astro.build/themes (filtro grátis) | templates abertos para estudar estrutura |
| 21st.dev/community/components | peças de React + Tailwind funcionando, uma seção por vez: heroes (1,1 mil), fundos, rolagem, textos, marquees, linhas do tempo, shaders. Bom para o efeito de uma seção, não para o site inteiro |
| `a pasta de originais (ex.: Desktop/opensource)/awesome-design-md` | DESIGN.md de 70+ marcas conhecidas |
Termos úteis por nicho: beauty salon, hair studio, nail atelier, spa, bridal, fashion editorial, perfume,
jewelry, architecture studio, florist, restaurant. Inclua 30% de referências **fora do nicho** (moda, revista,
arquitetura, museu): é daí que vem o "diferente".

## 2. Estudar os escolhidos: raio-x (padrão)
Para a base (e a segunda base, só do movimento, se houver), **sempre no computador e no celular**:
`node <plugin>/skills/lp-referencias/scripts/raio-x.mjs <url> clientes/<slug>/referencia/<nome> --tambem-celular`
(uma rodada só gera os dois raio-x; `--celular` mede só o celular). Do celular saem `raio-x-celular.json`,
`roteiro-celular.md`, `custo-celular.md` e `prints-celular/`: por eles, e olhando os prints, a
`lp-direcao-de-arte` decide a parte "No celular" do `direcao.md`.
Saída: `raio-x.json` (estrutura por seção, escala em razão, contraste do texto, movimento classificado com duração
e curva), `medidas.css` (variáveis `--ref-*` para a construção; sem cores nem fontes), `roteiro.md` (a página contada
seção por seção, a planta do conceito fiel no `lp-maestro`), `custo.md` (cenas que pedem peça que não temos →
equivalente) e prints por seção. Só medidas: confere o robots.txt e para no bloqueio, sem tentar outro caminho.
Anote em `referencias.md` do cliente: URL, galeria, o que muda (palavras do usuário) e a pasta do raio-x.

### 2b. Estudo à mão (só quando o site bloquear a leitura automática)
1. Abra cada site escolhido no próprio domínio.
2. Print da dobra inicial e de uma seção do meio (computador 1440px); em 5 deles, também celular.
   Pode usar `node <plugin>/skills/lp-revisao/scripts/prints.mjs <url> <pasta>`.
   **Sites animados:** print não mostra movimento. Grave o site rolando (vídeo + 6 quadros-chave):
   `node <plugin>/skills/lp-referencias/scripts/gravar-rolagem.mjs <url> <pasta> [--celular]`
   (precisa de `puppeteer-core` no projeto, Edge e ffmpeg). Os vídeos alimentam a etapa "conceito de
   movimento" (`lp-cenas`): anote qual cena do site serviu de ideia.
   Gravar só os escolhidos pelo usuário, no próprio domínio do site, para estudo (o vídeo não vai para o site).
3. Extraia o DNA técnico rodando `dna.js` (nesta pasta) no console da página via `javascript_tool`:
   fontes reais, tamanhos, cores dominantes, raio de borda, número de seções.
4. Anote em `referencias.md` do cliente: URL, galeria, o que tem de bom (1 linha), DNA.

## 3. Moodboard dos escolhidos (opcional)
**Sites animados (padrão quando o cliente vai ter cenas):** liste 10–15 endereços em
`clientes/<slug>/referencias/lista.txt` (um por linha) e rode
`node <plugin>/skills/lp-referencias/scripts/montar-galeria.mjs clientes/<slug>/referencias --lista clientes/<slug>/referencias/lista.txt`
(na pasta de um projeto com `puppeteer-core`). Ele grava os que faltam (site que bloqueia ou cai fica de
fora, sem lixo) e monta `galeria.html`: vídeos lado a lado, numerados, rodando quando aparecem. O usuário
marca os que gosta e clica "Copiar escolhidos" para colar no chat. Rodar de novo só grava os novos.

**Sites estáticos:** `python -I <plugin>/skills/lp-referencias/scripts/moodboard.py <pasta-prints> <saida.jpg>`
monta a prancha numerada. Envie ao usuário (SendUserFile) e peça para marcar números favoritos e os que detesta.

## 4. Estudo dos favoritos (só no estudo à mão ou sem base escolhida)
Para os 5 marcados, rode `hallmark study <URL>` (skill `hallmark`): macroestrutura, par tipográfico, cor-âncora.
Some ao `referencias.md`. Isso alimenta a skill `lp-direcao-de-arte`. Com raio-x da base, não rodar: ele já mede
a estrutura, e par tipográfico e cor vêm do cliente (LP-07).

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- awesome-design-md (`a pasta de originais (ex.: Desktop/opensource)/awesome-design-md/design-md/<marca>/DESIGN.md`, 84 marcas famosas):
  não tem salão, mas serve para copiar o rigor (espaçamento, escala, ritmo) de marcas como apple, airbnb,
  oura, starbucks, nike. Escolha 1 ou 2 e anote no plano o que vem de cada uma.
- `hallmark` (`study <URL>`): DNA de um site de referência.

## Cuidados
- Galerias e sites são de terceiros: só observar e anotar; não baixar código nem imagens para usar. A exceção é
  modelo com licença aberta (seção 1), que pode ser base de código com o aviso de copyright mantido.
- Marketplaces de template pago: só como referência visual.
- 21st.dev: cada peça é de um autor. Só entra no site do cliente se a página dela mostrar licença aberta
  (ex.: MIT); sem licença, vale só como ideia. Copiar o código pede conta no site (grátis: 2 cópias por dia),
  então quem copia é o usuário. Muitas peças usam Framer Motion: nas cenas-assinatura, refazer em GSAP
  (`lp-cenas`). O conector pago deles (21st AI) não está ligado.
- Sem login em nenhuma galeria.
