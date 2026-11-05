# Plano — DevAgents bom em sites animados

> Pedido do Neemias (15/10/2026): "quero que minha ferramenta fique boa para gerar sites animados".
> O DevAgents continua uma ferramenta **geral** (qualquer site ou sistema), com uma parte **focada em
> design**, principalmente landing pages com movimento bem elaborado. Status: **aprovado em 16/10/2026;
> D1/D2/D5/D6/D9 implementadas e verificadas tecnicamente; D3 com quatro exemplos testados;
> D4 integrada ao fluxo. Escolha visual, teste D4 com cliente novo e D7 pendentes.**

## Integração D3/D4 — 16/10, 08:33
- Ramo `nuvem/d3-d4` integrado localmente, preservando entregas anteriores; landing-pages 0.1.11.
- Quatro páginas fictícias de estilo + gerador sem sobrescrita + tokens; preview http://127.0.0.1:5192/.
- 48 combinações navegador +4 sem JS; 8 vídeos/48 quadros; 51 testes unitários passaram.
- Coleta/fatos/até cinco perguntas e três conceitos no maestro; respeita restrições e aprovações existentes.
- D3 ainda exige aprovação visual; D4 exige execução com cliente novo real. Relatório em
  `docs/relatorio-integracao-d3-d4.md`. Sem commit ou publicação.

## Ampliação D2 — 16/10, 02:07
- 25 estudos isolados e 19 receitas adicionais; biblioteca com 35 receitas e catálogo das novas famílias.
- 100/100 combinações navegador e 12/12 verificações dos ajustes; pausas, resize e reduzido preservados.
- Vitrine com 50 vídeos e 300 quadros, duração/controles/seleção conferidos. Nenhum favorito escolhido pelo sistema.
- JS 119,13 kB gzip; sem novos assets de terceiros. SVG/CSS e dados demonstrativos próprios.
- Estúdio 0.1.1, landing-pages 0.1.9. Aprovação visual pelo usuário e teste físico continuam pendentes.

## Entrega inicial D1 — 16/10
- Plugin `estudio-design` 0.1.0, modelo React + GSAP, criação sem sobrescrita, teste e gravação/vitrine.
- `pilotos/estudios/`: três estudos D1 (letras, foto, lateral) e três D2 (linha SVG, cortina, zoom).
- 24/24 combinações (desktop, celular e reduzido nos dois), pausa e resize aprovados no Chrome headless.
- Vitrine com 12 vídeos e 72 quadros, sem favoritos escolhidos automaticamente; vídeos com duração válida.
- `lp-cenas`: 16 receitas, seis novas com código, peso, licença e endereço dos vídeos locais.
- JavaScript de produção 115,53 KB gzip; foto real 408.926 bytes. Teste físico de fluidez e aprovação estética pendentes.
- Na entrega inicial, D2 ainda tinha seis estudos; a ampliação posterior está registrada acima.

## Por que a Transportadora não ficou boa (o que este plano corrige)
1. **Faltou peça boa.** A carreta (feita em código, depois foto colada) era o centro da cena e não parecia real.
2. **Cada cena nasceu na hora**, montada e ajustada com o usuário, sem uma vitrine de cenas prontas para escolher.
3. **O peso ficou no usuário**: o sistema perguntou demais em vez de buscar a informação e mostrar opções prontas.
4. **Regras se chocaram**: a v2 usou faixa infinita e contador, que a direção de arte proíbe.

## Ideia central
O modelo **desenha o movimento em código** (estudos de movimento: páginas pequenas, só com a animação), grava
em vídeo, o usuário **escolhe vendo** e só os aprovados viram o site. Realismo (foto, 3D) entra só quando há
peça real; sem peça, o site aposta no que o modelo faz muito bem: tipografia, linhas, mapas, formas, 3D
abstrato, transições.

## Fases

### D1 — Estúdio de movimento (a base)
- Formato padrão de **estudo**: uma página isolada (React + GSAP), com marcações para o teste automático.
- Para cada estudo: gravar vídeo automático (já existe `gravar-rolagem`) e entrar na **vitrine** (já existe
  `montar-galeria`: vídeos lado a lado, marcar e copiar a escolha).
- Critério de qualidade "nível de prêmio": fluido no celular, funciona com movimento reduzido, peso dentro
  do orçamento, nada com cara de IA ou de desenho (LP-08, LP-11).
- Onde mora: um plugin novo de design (`estudio-design`), usável por qualquer site; o `landing-pages` o usa.

**Pronto quando:** 3 estudos de teste aprovados pelo Neemias.

### D2 — Biblioteca grande (de 10 para 25–30 cenas)
Estudos originais, inspirados (sem copiar) nas demos oficiais do GSAP, na Codrops e em sites da Awwwards,
por família:
- **Tipografia:** título que se monta letra a letra, texto revelado por máscara, palavra que dá zoom e atravessa a tela.
- **Linhas e mapas:** rota se desenhando, mapa acendendo regiões, ícones que se desenham.
- **Transições de seção:** seção que cobre a outra, cortina, rolagem lateral presa, zoom de uma seção para a próxima.
- **Profundidade:** camadas em velocidades diferentes, foto que se abre ao rolar.
- **Números e dados:** gráficos que se montam, marcos de linha do tempo. Peças prontas para sites com dados (financeiro, resultados):
  Evil Charts (React + Recharts, ~2,4 mil ⭐, pouco conhecido; licença por componente, conferir), com a montagem
  ligada à rolagem pelo GSAP. Pedido do Neemias (16/10): ter no projeto para quando aparecer site desse tipo.
- **3D e fundos:** formas 3D abstratas, fundos líquidos (shader), partículas que formam a marca.
- **Objeto real** (quando houver peça): sequência de quadros estilo Apple, modelo 3D real.
- **Detalhes:** botões, cursor e menus com movimento.
Cada um vira receita em `lp-cenas` (código, vídeo, peso, licença) e fica na vitrine.

**Pronto quando:** vitrine com 25+ estudos gravados e favoritos marcados pelo Neemias.

### D3 — Estilos que combinam
Implementação: quatro presets e quatro páginas fictícias executáveis em `pilotos/estilos/site/`,
com vídeos em `pilotos/estilos/vitrine/`. Verificadas tecnicamente em 16/10; aprovação visual pendente.

- 3 a 5 **estilos de site** (ex.: editorial sério, tecnológico escuro, claro e orgânico), cada um com fontes,
  cores, grade, **ritmo padrão** (velocidades e curvas iguais em todo o site) e o conjunto de cenas que combina.
- Revisar as regras antigas que travam o movimento (proibição de faixa infinita e contador) com o Neemias.

**Pronto quando:** cada estilo tem uma página de exemplo aprovada.

### D4 — Maestro que corre atrás sozinho
Fluxo integrado em 16/10 nas skills coleta/maestro/direção/cenas. Inclui fontes, estado dos fatos,
orçamento de perguntas e três conceitos; teste completo com cliente novo real ainda pendente.

- A partir do nome, site ou Instagram do cliente: coletar o que é público (site, Instagram sem login, Google
  Maps, CNPJ) e montar um resumo de fatos.
- Perguntar ao Neemias **só o que só ele sabe** (números, clientes autorizados) numa lista curta.
- Entregar **3 conceitos completos já rodando** (estilo + cenas da biblioteca + conteúdo real) para escolher.

**Pronto quando:** um site novo do zero com no máximo 5 perguntas ao Neemias.

### D5 — Peças realistas (só quando a cena pede)
Implementado em 16/10: `lp-assets/scripts/validar-assets.mjs`, manifesto e relatório real em
`pilotos/assets-d5/`; 5 testes passaram. Confere declarações/licença, autorização já obtida, integridade,
malha GLB, evidência visual e orçamento por tela. Não certifica direitos nem realismo por extensão.
Sem peça/autorização: alternativa abstrata/tipográfica; nenhuma compra ou geração paga executada.

Caminho por tipo: foto do cliente; modelo 3D real (Sketchfab com licença comercial ou comprado); vídeo ou
imagem de IA (Higgsfield, quando houver plano); céu e luz realistas (Poly Haven). Sem peça real, usar cena
abstrata ou tipográfica.

### D6 — Revisão visual antes de mostrar
Implementada em 16/10: `lp-revisao/scripts/revisar-pagina.mjs`, crítica em `docs/relatorio-revisao-d6.md`.
24/24 cenários reais e 12/12 com defeitos deliberados verificados; vídeos desktop/celular preservados
do salão e de todos os estudos. Ferramenta não certifica aprovação estética nem fluidez em aparelho físico.

Antes de qualquer entrega: vídeo da página rolando no computador e no celular, checagem de fluidez e peso,
e uma crítica de design (consultoras `design-critique`, `review-animations`), corrigindo antes de mostrar.

### D7 — Prova
Um site de demonstração novo, do zero, por este caminho (nicho escolhido pelo Neemias; pode ser a Transportadora refeita
com movimento tipográfico e de mapa). Publicado como demo.

**Pronto quando:** o Neemias achar "muito legal" e servir de vitrine para vender.

### D8 — Além de landing page
Levar o estúdio para sites institucionais, portfólios e lojas simples: o superpowers conduz o código e o
estúdio entra como etapa de design.

### D9 — SEO desde o começo (pedido do Neemias, 16/10)
Implementada e aplicada ao salão em 16/10: coleta por intenção local com fontes, mapa seção/palavra,
metadados, H1 visível com cidade, JSON-LD confirmado e HTML estático no build. Scripts executáveis de
pré-render/auditoria; 3 testes de regressão +4 cenários reais com/sem JS e 9 funcionais. Relatório em
`pilotos/cliente-salao (repositório privado)/seo.md`. Canonical/sitemap/HTTP real/Search Console aguardam domínio e publicação
autorizada, sem inventar URLs nem retirar noindex neste turno.

Uma etapa própria, `lp-seo`, que pensa em busca do Google **enquanto** o site é feito, não só no fim:
- **Coleta:** palavras-chave pela intenção local (serviço + cidade, ex.: "salão de beleza em Marília",
  "maquiagem para noiva Marília"), concorrentes que aparecem no Google para elas.
- **Estrutura:** um título principal com a palavra-chave mais forte, uma seção por serviço/intenção, links
  internos, endereço da página e menu pensados para busca.
- **Textos:** palavras-chave usadas com naturalidade (sem encher), títulos de seção, perguntas frequentes.
- **Construção:** título e descrição da página, imagens com texto alternativo e leves, dados estruturados
  (LocalBusiness), prévia de link, mapa do site, velocidade (o movimento não pode pesar a página).
- **Publicação:** Search Console, perfil do Google da empresa e conferência final.
Consultoras escolhidas (travadas, lidas só nessa etapa):
- **claude-seo** (AgriciDaniel, ~19 mil ⭐, MIT, versão 2.4.2 de out/2026) — a mais completa e focada em SEO;
  plano, roteiro, página, técnico, local, schema e GEO foram incorporados na mescla própria `lp-seo`;
  `seo-local` e `seo-schema` foram substituídas. A mescla tem as licenças e créditos no plugin.
- **marketingskills** (coreyhaines31, ~55 mil ⭐, MIT; já temos `copywriting` e `cro` dela) — trazer
  `site-architecture` (estrutura e menu), que o claude-seo não cobre bem.
Limite: volume de busca real exige credencial do Google Ads (Keyword Planner); sem ela, palavras-chave saem das
sugestões do Google e da concorrência. **Pronto quando:** o site de prova (D7) sai com o plano de palavras-chave
e passa na revisão `page` + `technical` do claude-seo.

## Ordem
D1 → D2 → D3 (junto com D4) → D6 → D7. D9 (SEO) entra junto da D4, antes da D7. D5 conforme o cliente; D8 depois da prova.

## Decisões que dependem do Neemias
1. Plano aprovado em 16/10; escolher visualmente os estudos D1 entregues (vitrine local).
2. As proibições antigas (faixa infinita, contador) continuam?
3. Nicho do site de prova (D7).
4. Gastar com peças (plano do Higgsfield, modelo 3D comprado) ou só gratuitas?
