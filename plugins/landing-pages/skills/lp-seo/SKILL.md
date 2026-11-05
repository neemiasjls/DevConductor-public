---
name: lp-seo
description: Faz a landing page aparecer no Google desde o começo - palavras-chave do negócio local, estrutura da página, textos, parte técnica (HTML pronto para o robô, título, descrição, dados estruturados, velocidade), perfil do Google e respostas de IA. Use em todas as etapas da landing page em que o maestro chamar o SEO (depois da coleta, nos textos, na construção, na revisão e na publicação). É a única dona do SEO no plugin.
---

# SEO da landing page

Mescla do melhor de duas fontes famosas (MIT, ver `FONTES.md` e as licenças nesta pasta): do **claude-seo**
(AgriciDaniel) vieram o plano por tipo de negócio, o roteiro de conteúdo com palavras-chave, a revisão de
página, o SEO técnico, local e de IA (GEO) e os dados estruturados; do **marketingskills** (coreyhaines31)
vieram a estrutura do site (hierarquia, menu, endereços, links internos), o mapa de palavras-chave sem
canibalização e os três pilares de busca por IA. Aqui está adaptado ao nosso caso: **uma página de negócio
local, feita em React, com muito movimento**.

**Esta skill é a única dona do SEO.** As outras etapas só seguem o que sair daqui (`seo.md` do cliente).
Ordem de autoridade: preferências do usuário > regras da fábrica (`lp-maestro/regras.md`) > esta skill.

## Saída: `clientes/<slug>/seo.md`
Um arquivo só, preenchido aos poucos pelas etapas abaixo: mapa de palavras-chave, estrutura (seção ↔
palavra), título e descrição, dados estruturados, checklist técnico com situação, pendências de publicação.

## A. Palavras-chave (logo depois da coleta, antes dos textos)
1. **Intenção local primeiro.** Para negócio de bairro/cidade, a busca que vende é "serviço + cidade"
   ("salão de beleza em Marília", "maquiagem para noiva Marília", "manicure Banzato"). Liste:
   - 1 principal (o negócio + cidade) para o título da página e o H1;
   - 1 por serviço/frente (vira o título de cada seção);
   - perguntas reais ("quanto tempo dura", "precisa agendar", "tem estacionamento") para as perguntas frequentes.
2. **Fontes sem ferramenta paga:** sugestões do Google (autocompletar), "As pessoas também perguntam",
   concorrentes que aparecem no Maps e na busca para essas palavras, hashtags e legendas do próprio
   Instagram do cliente. Volume de busca real só com Google Keyword Planner (conta de anúncios) ou
   DataForSEO, se o usuário tiver: sem isso, ordenar por intenção e concorrência, não inventar número.
3. **Regra da relevância:** só entra palavra que o negócio realmente entrega (sem copiar seção de
   concorrente sobre serviço que o cliente não faz).
4. **Sem canibalização:** cada palavra tem uma dona (uma seção ou uma página); duas seções não disputam
   a mesma.
5. **Intenção da busca:** veja o que o Google mostra para a palavra (mapa local, lista, página de serviço).
   Se a primeira página for toda de páginas por serviço, anote em `seo.md` que o próximo passo do cliente é
   ter páginas próprias por serviço (é o fator nº 1 de busca local) — a landing page continua sendo uma só.

## B. Estrutura (junto da direção de arte, antes de construir)
- **Um H1**, com o negócio e a cidade (pode ser visualmente discreto se o título grande for uma frase de
  marca; o H1 de verdade não pode sumir). **H2 por serviço/seção**, na ordem lógica, sem pular níveis.
- Palavra principal nos primeiros 100 palavras do texto visível.
- Cada seção com `id` legível (`#noivas`, `#unhas`) e o menu levando a elas: são os links internos da
  página. Botões com texto que diz o destino ("Agendar maquiagem", não "clique aqui").
- Endereço, telefone/WhatsApp e horário **em texto** (não só em imagem), iguais aos do perfil do Google.
- Endereços (URLs) curtos, minúsculos, com hífen; se um dia houver mais páginas: `/servicos/<servico>`,
  todas a no máximo 3 cliques da principal.

## C. Textos (na etapa `lp-textos`)
- O texto segue o mapa: título de seção com a palavra dela, frase de abertura que **responde direto** (a
  IA e o Google extraem trechos de 40–60 palavras que se sustentam sozinhos).
- Palavras usadas com naturalidade e variações úteis, sem meta de densidade. Não repetir termos para bater
  percentual: isso pode produzir texto artificial e keyword stuffing.
- Prova real que ajuda a aparecer em respostas de IA: nome e credencial de quem faz (ex.: fundadora com
  certificação), anos de casa, o que é único. Só fato confirmado (regra da fábrica).
- Perguntas frequentes visíveis só com respostas confirmadas. Para negócio local comum, não prometer
  resultado especial de FAQ; a documentação do Google restringiu esse recurso a sites governamentais/de saúde.

## D. Construção (na etapa `lp-construcao`) — o que o movimento não pode estragar
1. **HTML pronto para o robô.** Site em React/Vite renderiza no navegador: o título, a descrição, o JSON-LD,
   o H1, os textos principais e o endereço precisam estar **no HTML entregue**, não só depois do JavaScript.
   Gere a página pré-renderizada no build (ex.: `vite-react-ssg` ou renderizar a página pronta com o
   Puppeteer com o contrato abaixo) e confira com "ver código-fonte" que o texto aparece. Canonical e
   `robots` iguais no HTML inicial e no final.
2. **Animação × texto:** texto que aparece por animação continua no HTML desde o início (opacidade/
   posição, nunca inserido depois). Título quebrado em palavras/letras para animar: mantenha a frase
   inteira acessível (`aria-label` no título e as partes com `aria-hidden`, como na receita `texto-revelado`).
   Nada de texto importante só dentro de canvas, vídeo ou imagem.
3. **Cabeçalho:** `<title>` com 50–60 caracteres (serviço + cidade + nome), descrição com 150–160 que não
   repete o título nem termina em frase pronta, `lang="pt-BR"`, canonical, Open Graph (imagem 1200×630) e
   ícone.
4. **Dados estruturados (JSON-LD no HTML):** o tipo mais específico do negócio (`HairSalon`, `BeautySalon`,
   `NailSalon`, `Restaurant`, `Dentist`... herdam de `LocalBusiness`) com nome, endereço, telefone, `geo`,
   `openingHoursSpecification`, `areaServed` por cidade (nunca o estado inteiro), `sameAs` (Instagram, perfil do
   Google), `image` e `priceRange` só se confirmado. `aggregateRating`/avaliações só se elas estiverem na
   página e forem reais. Modelo em `referencias/dados-estruturados.md`.
5. **Imagens:** WebP/AVIF, largura e altura definidas (sem pulo na tela), `alt` descritivo com a palavra
   quando natural, nome de arquivo legível, carregamento preguiçoso em tudo menos a imagem do topo (essa
   com `fetchpriority="high"`). Imagem acima de 200 KB é alerta; acima de 500 KB, erro.
6. **Velocidade (Core Web Vitals):** a imagem/vídeo do topo é o maior risco (LCP): pré-carregar, tamanho
   certo por tela. Cena pesada (3D, quadros) em arquivo separado e carregada depois. Sem pulos de layout
   (CLS) quando as cenas montam. Usar `web-perf` para medir.
7. **Arquivos:** `robots.txt` e `sitemap.xml` (uma linha para a página). Na **demonstração** (regra LP-04) o
   site fica com `noindex` + `X-Robots-Tag` + `robots.txt` bloqueando: tudo pronto, só desligado.

## E. Revisão (na etapa `lp-revisao`)
Checklist com estado aprovado/pendente/falhou e evidência por bloco (sem nota inventada):
título/descrição/H1/H2, palavra nos primeiros 100 palavras, texto presente no HTML sem JavaScript, JSON-LD
válido (Teste de pesquisa aprimorada do Google ou validator.schema.org), imagens, peso e LCP. Anotar em
`seo.md` o que falta, do mais grave para o menos.

### Comandos testados (D9)
No projeto com `puppeteer-core`, depois do build:
```bash
node <plugin>/skills/lp-seo/scripts/prerender.mjs dist --raiz root
node <plugin>/skills/lp-seo/scripts/auditar-html.mjs dist --demo
```
O pré-renderizador serve apenas o build local, captura a raiz em movimento reduzido, recusa raiz vazia
ou pin ativo, preserva head/scripts/robots e só grava depois de concluir. Perfil local ao projeto.
**Contrato:** cliente React com `createRoot`, que substitui o snapshot ao iniciar; nunca `hydrateRoot`
sobre DOM já alterado por efeitos. Para hidratação, usar SSR/SSG próprio do framework. Não introduzir
detecção de robô ou conteúdo diferente para buscadores.
Snapshot recebe `data-prerender="estatico"`: manter CSS estático legível até o cliente assumir a raiz;
remover a marca no ponto de montagem. Exemplo: o `main.tsx` monta a raiz e o `index.css` traz o estilo estático.
Testar sem JavaScript: H1, serviços, endereço, imagens e CTAs visíveis; nenhuma seção pode cobrir a capa
por depender de pin ausente. Com JavaScript: raiz/H1 únicos, animações e navegação sem regressão.
Reexecutar exige novo build; não serializar snapshots por cima de snapshots.

O auditor retorna código 1 em falha, checa HTML inicial, metadados, H1, JSON-LD, alt e regras declaradas
da demo. `--producao` exige canonical HTTPS real, sitemap coerente e retirada de bloqueios; usar só na
publicação autorizada. `_headers` é configuração declarada, não prova de que o servidor aplicou o header.
Conferir o HTTP real após hospedagem autorizada. Sem domínio confirmado, deixar canonical/sitemap pendentes,
sem criar domínio fictício. Demo permanece local/noindex. Robots bloqueando rastreio pode impedir leitura
do noindex: não tratar essas regras como proteção de conteúdo privado. Autenticação é o controle de acesso.

Fontes primárias verificadas: [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[robots e noindex](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag),
[keyword stuffing](https://developers.google.com/search/docs/essentials/spam-policies),
[limites de FAQ](https://developers.google.com/search/blog/2023/08/howto-faq-changes).

## F. Publicação (na etapa `lp-publicar`, só quando o cliente comprar)
- Tirar `noindex`/bloqueios, liberar `robots.txt`, enviar o `sitemap.xml` no **Google Search Console** (e no
  Bing Webmaster) e pedir indexação.
- **Perfil da Empresa no Google:** categoria principal certa, horário exato (estar "aberto agora" pesa muito
  na busca local), link do site, WhatsApp, fotos; nome/endereço/telefone **idênticos** ao site e às redes.
- Pedir avaliações reais e detalhadas aos clientes (o que mais move o mapa local), sem incentivar falsas.
- IA (ChatGPT, Perplexity, respostas do Google): estar em listas locais de "melhores" e em diretórios do
  ramo, com os mesmos dados; `llms.txt` é opcional e de efeito incerto.
- Medir: Search Console (palavras e cliques) e Cloudflare Web Analytics (sem cookies).

## Não fazer
Página por cidade com o mesmo texto trocando o nome (o Google pune como página-porta); encher de palavra-chave;
avaliações ou números inventados; esconder texto para o robô; prometer posição no Google.
