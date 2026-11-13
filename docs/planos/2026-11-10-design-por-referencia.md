# Plano — Design por referência (10/11/2026, versão 2)

> Estado: **proposta, aguardando aprovação do Neemias.** É a prioridade do projeto; o
> [plano geral](2026-11-10-projeto-geral.md) só começa depois. Substitui o `docs/plano-design.md` (histórico).
> Versão 2: refeita depois de ler o fluxo por dentro (`lp-maestro`, `lp-referencias`, `lp-direcao-de-arte`).
> Marcas de quem executa (DEV-48): `[regente]` conversa principal no Opus · `[difícil]` Opus em agente ·
> `[sonnet]` padrão existente + teste objetivo. Uma parte por sessão.

## Objetivo
O Neemias escolhe um cliente → o kit mostra muitos sites bons e animados do ramo, de galerias e bibliotecas famosas
e gratuitas → ele escolhe um e diz o que muda → o kit entrega um site **parecido em estrutura, ritmo e movimento, e
melhor** em velocidade, celular, texto e busca no Google. Sem cara de site gerado. Serve para vender.

**Meta honesta:** site premiado é feito por estúdio, em semanas, com foto e 3D sob medida. A meta aqui é o visitante
não distinguir, na rolagem, o nosso site dos da galeria — com o material que um negócio local tem. Onde a referência
depender de peça que não existe (modelo 3D próprio, filme), o plano troca por um equivalente e avisa antes.

## O que o fluxo faz hoje (conferido no código em 10/11)
| Etapa | Hoje | Efeito |
|---|---|---|
| Estudo da referência | 2 prints, 6 quadros de vídeo e um `dna.js` de 46 linhas (fontes, tamanhos, cores, raio, nº de seções) | a referência entra como "clima", não como planta |
| Depois da escolha | `lp-maestro` passo E ainda monta **3 conceitos**, cada um a partir de **1 dos 7 estilos prontos** + cena da lista do estilo + sorteio da `taste-skill` | o site nasce do estilo pronto do kit, não da referência: daí o "mesmo visual" (DEV-53) |
| Regras de estilo | preferências antigas valem para todo cliente (ex.: cantos arredondados, lista de proibidos do salão piloto) | puxam qualquer referência para o mesmo lugar |
| Revisão | mede peso, densidade, responsivo, acessibilidade | **nada compara com a referência** |
| Galeria | 10 categorias; nenhuma dos ramos da prospecção (eventos/buffet, móveis planejados); 83% de uma fonte; sem filtro de movimento | difícil escolher entre 200 |
| Efeitos com código | 35 receitas próprias + registros shadcn; Codrops (a maior coleção aberta de efeitos de rolagem) não está no kit | cena principal sai sempre do mesmo repertório |
| Pilha | React, GSAP, Lenis, Three, Motion | **adequada**: é a mesma dos sites premiados. Não é o problema |

Conclusão: o que falta não é ferramenta de animação nem mais exemplos. É **usar a referência como planta** e
**conferir contra ela durante a construção**.

## Princípios da versão 2
1. **Com referência escolhida, a referência manda na forma.** Os 7 estilos e o sorteio viram o caminho de quem não
   escolheu referência. Um conceito fiel, não três (custa um terço e não dilui).
2. **Laço visual:** construir uma seção → gravar → pôr lado a lado com a referência → listar diferenças → corrigir.
   No máximo 3 voltas por seção. É isso que dá semelhança; medir só no fim não corrige nada.
3. **Duas referências diferentes:** a *página* (estrutura e ritmo, vem da galeria) e o *efeito com código aberto*
   (cena principal: Codrops, registros shadcn, receitas do kit). O plano liga uma à outra.
4. **Fatia fina antes de ferramenta.** Provar o método numa abertura + uma cena antes de escrever script. O projeto
   já tem ferramenta demais sem venda.
5. **O piso não muda:** conteúdo verdadeiro (LP-11), clareza (LP-12/13), acessibilidade, movimento reduzido, peso,
   licença. Estrutura e ritmo se estudam; código, texto, foto e marca de terceiros só com licença aberta.

## Fases

### R0 — Destravar a escolha `[sonnet]` + curadoria `[regente]`
- Acrescentar em `CATEGORIAS` (`lp-referencias/scripts/buscar-referencias.mjs` + teste) os ramos da prospecção:
  eventos/casamento/buffet, móveis planejados/interiores, e os próximos (odontologia, pet, estética).
- Bloco **"12 recomendados"** no topo da `galeria.html`: ordenar por sinais (etiqueta de movimento, tem vídeo,
  variedade de fonte) e um agente olha as ~30 primeiras miniaturas e escolhe 12, com uma linha de motivo cada.
  30% de fora do ramo (regra que a skill já tem).
Primeira galeria: **interiores/móveis planejados** (já gerada em 10/11 com a categoria `arquitetura`, 222 sites, em
`pilotos/referencias-galeria/referencias/arquitetura/`); a curadoria dos 12 fica em `recomendados.md` ao lado.
**Pronto quando:** o Neemias abre a galeria de interiores e escolhe 1 base (e, se quiser, 1 segunda só
para o movimento) dizendo o que muda. *É a única parte que depende dele para começar.*

### R1 — Fatia de prova, à mão `[regente]`
Com a base escolhida e as ferramentas que já existem (`gravar-rolagem.mjs`, `prints.mjs`, `dna.js`, navegador):
1. Gravar a referência inteira (computador e celular) e descrever a **abertura** e a **cena principal** em detalhe:
   grade, tamanhos de fonte em proporção, o que se move, em que ordem, preso ou não na rolagem.
2. Construir só essas duas partes com o conteúdo real do cliente, em `clientes/<slug>/prova-referencia/`.
3. Rodar o laço visual (princípio 2) até 3 voltas e montar o lado a lado.
**Pronto quando:** o Neemias vê o lado a lado e responde "é esse o caminho" ou "não". Se não: anotar o que faltou e
rever este plano antes de qualquer script. Anotar também o tempo e o consumo da sessão (vira a régua de custo).

### R2 — Raio-x da referência `[difícil]`
`lp-referencias/scripts/raio-x.mjs <url> <pasta>` (puppeteer-core, já usado). Saída em `referencia/`:
- prints da página inteira + vídeo, computador e celular;
- **estrutura** por seção: altura, colunas, escala de fontes (em razão, não em px), espaçamentos, proporção
  imagem/texto, palavras por tela, cores e raio;
- **movimento por amostragem:** a cada passo de rolagem, registrar posição, tamanho, opacidade, transformação e
  recorte dos elementos principais; daí classificar cada seção (presa, paralaxe e fator, revelação por máscara,
  rolagem lateral, zoom, pilha). Bibliotecas pelas variáveis globais e nomes de script (GSAP, ScrollTrigger, Lenis,
  Three). *Não depender de `getAnimations()`: GSAP não aparece ali.*
- `roteiro.md` (a página contada seção por seção) e `custo.md` (cenas que pedem peça que não temos → equivalente).
Limites: só medidas. Respeita robots.txt e termos; site que bloquear cai para o modo à mão do R1.
Modelo com licença aberta segue o caminho de clonar + `fontes.json` + `NOTICE`.
**Pronto quando:** em 3 sites de famílias diferentes (tipográfico, fotográfico, 3D), outra pessoa descreve a página
só pelo `roteiro.md`. Teste `scripts/testes/raio-x.test.mjs` com página local que tem seção presa, paralaxe e máscara.

### R3 — Maestro "por referência" `[regente]`
- `lp-maestro`: com base escolhida, o passo E vira **um conceito fiel** seguindo o `roteiro.md`; os 3 conceitos por
  estilo ficam para quando não há referência. Duas bases: estrutura de uma, movimento da outra, dito no plano.
- `lp-direcao-de-arte`: escala, grade e ritmo vêm do `raio-x.json`; fontes e paleta são **do cliente** (LP-07),
  escolhidas para manter o mesmo contraste e peso da referência — é o que garante parecido sem ser cópia.
- Laço visual escrito na `lp-construcao` (máx. 3 voltas por seção; a comparação roda em agente e devolve só a lista
  de diferenças, para não encher a conversa de imagens).
- Tabela no maestro: neste caminho ficam **fora** `estilos/`, sorteio da `taste-skill`, `frontend-design`,
  `ui-ux-pro-max` e `hallmark study`; **ficam** `gsap-*`, `threejs-*`, `responsive-design`, `web-perf`, `lp-seo`,
  `lp-textos`, `lp-revisao`.
- Preferências antigas de estilo: ver decisão 3 abaixo antes de mexer (regra confirmada não se enfraquece sozinha).
**Pronto quando:** o `plano.md` de um site de teste não tem nenhuma decisão de forma que não venha do raio-x ou do
"o que muda" do Neemias.

### R4 — Comparador e leitura às cegas `[difícil]`
- `lp-revisao/scripts/comparar-referencia.mjs`: lado a lado por seção (computador e celular), dois vídeos e as
  divergências medidas (ordem e nº de seções, razão da escala, imagem/texto, tipo e duração do movimento).
- "Melhor que" com número: Lighthouse no celular, movimento reduzido, SEO local, botão de contato sempre à mão.
- Às cegas: um agente recebe quadros de 3 sites da galeria + o nosso, sem rótulo, e ordena por acabamento.
  Reprova se o nosso ficar por último ou for apontado como "o gerado".
**Pronto quando:** defeito plantado (seção fora de ordem, movimento trocado) é pego pelo teste, e o Neemias aprova
o lado a lado do R3.

### R5 — Acervo de efeitos com código `[difícil]` (fontes) `[sonnet]` (catálogo)
- Catálogo `lp-cenas/efeitos.json`: efeito → de onde vem → licença → peso → vídeo. Entram as 35 receitas, os
  registros shadcn já testados e as demos da Codrops (conferir a licença de uso antes; registrar em `fontes.json`).
- O raio-x passa a apontar, para cada movimento da referência, o efeito mais próximo do catálogo. Sem par: vira
  estudo novo no `estudio-design` e entra no catálogo. Cada cliente aumenta o acervo.
**Pronto quando:** nas 3 referências do R2, toda cena principal tem um par no catálogo ou um estudo novo gravado.

### R6 — Imagens `[regente]`
- **Tratamento único:** script em `lp-assets` que aplica às fotos do cliente o mesmo recorte, contraste, cor e grão,
  tirados do raio-x. Foto mediana com tratamento igual parece direção de arte; fotos soltas parecem banco de imagem.
- Material: fotos do próprio cliente primeiro (no rascunho, só o que é público; publicar só com autorização);
  vídeo curto gratuito para a abertura quando a referência usa vídeo.
- Imagem gerada é **encaixe opcional** e nunca peça falsa (LP-11): serve para ampliar, estender e reenquadrar foto
  real, fundo e textura. O fluxo inteiro funciona sem plano pago.
**Pronto quando:** nenhuma imagem do site de prova é reprovada na leitura às cegas.

### R10 — Celular sem quebrar `[difícil]` · pedido do Neemias em 11/11: "os nossos sites não podem quebrar em versões mobile"
Revisto em 11/11 a pedido do Neemias ("trazer só o que falta e é útil; hoje o kit não é bom em deixar um desenho bom no
celular"). São duas frentes: DESENHAR bem para o celular e CONFERIR no celular.

**A. Desenho do celular (o que mais pesa; testar não cria desenho bom)**
- O raio-x já mede a referência no celular (`--tambem-celular`): a direção de arte passa a decidir, seção por seção, a
  composição do celular a partir do `raio-x-celular.json` — não é o computador encolhido. O `direcao.md` ganha a coluna
  "no celular" (ordem, o que some, o que vira carrossel, tamanho do título, onde fica o botão de contato).
- A construção começa pelo celular e o laço visual (construir → comparar → corrigir) roda nos DOIS tamanhos; o olhar de
  diretor de arte dá nota por seção também no celular, e vale a mesma régua (≥ 9).
- Cena presa, rolagem lateral e 3D: cada uma tem a versão de toque decidida antes de construir (ou é trocada por
  equivalente simples), nunca "desligada no celular" sem substituto.

**B. Conferência no celular, trazida para os scripts do kit (sem instalar nada)**
O que o `microsoft/playwright-cli` (Apache-2.0) faz e nos falta, refeito por nós sobre a ligação direta com o Chrome que
`prints.mjs` e `raio-x.mjs` já usam: emulação de aparelho (tamanho, densidade, toque, agente), gestos de toque (rolar,
arrastar), interação (abrir menu, tocar em botão, preencher e enviar formulário, conferir o destino do botão de contato),
rede lenta simulada e gravação da rolagem. Tudo isso o Chrome oferece; não precisa de ferramenta de fora.
**Só uma coisa não dá para trazer: o motor do Safari (WebKit).** Para isso, e só para isso, o Playwright fica como
ferramenta externa opcional (chamada se estiver instalada, sem copiar código).
- **Motor do Safari (WebKit):** abrir o site no WebKit em tamanho de iPhone. É onde animação costuma quebrar (altura da
  tela com a barra do navegador, seção presa, vídeo que não toca sozinho, fonte, rolagem suave).
- **Aparelhos emulados:** matriz mínima — iPhone pequeno (375), iPhone atual (390/393), Android estreito (360) e largo
  (412), tablet em pé (768) — com toque, em pé e deitado.
- **Interação de verdade:** abrir e fechar o menu, tocar no botão de WhatsApp/orçamento (confere o destino), preencher e
  enviar formulário, rolar por toque as cenas presas e a rolagem lateral, voltar ao topo. Sem depender de passar o mouse.
- **Vídeo e rastro da rolagem** no WebKit, guardados como prova da revisão.
- **Rede lenta:** carregar em 4G simulado e medir o que aparece primeiro.
Portão do celular (soma-se ao da régua 10 de 10; site que falhar não é mostrado como pronto):
1. nenhuma rolagem para o lado e nada cortado em 360 px;
2. texto de leitura ≥ 16 px e campo de formulário ≥ 16 px (senão o iPhone dá zoom sozinho);
3. área de toque ≥ 44 px, com espaço entre botões;
4. nenhuma seção presa trava ou pula ao rolar por toque; com movimento reduzido, tudo continua legível;
5. botão de contato sempre alcançável com o polegar; menu abre e fecha;
6. vídeo de abertura toca mudo e em linha, ou cai para imagem;
7. mesmos seis itens passam no Chrome e no WebKit.
Sem o Playwright instalado, os itens 1–6 rodam no Chrome pelos scripts do kit e o relatório diz com todas as letras
"Safari não conferido". Aparelho de verdade continua sendo a conferência final do dono (parte G5).
Antes de ligar: conferir instalação no Windows, tamanho dos navegadores baixados e se o WebKit roda aqui.
**Pronto quando:** página de exemplo com 6 defeitos plantados (um por item) é reprovada nos 6, e o site de prova passa nos
dois motores. Teste em `scripts/testes/celular.test.mjs` (a parte do WebKit é pulada com motivo se a ferramenta faltar).

### R11 — Raio-x mais completo, com três ideias do `designlang` `[difícil]` · decidido em 11/11
O `designlang` (`Manavarya09/design-extract`, MIT) extrai o sistema de estilo de um site. Em vez de depender dele, trazer
para o `raio-x.mjs`, escrito por nós, só o que falta ao nosso método (ler o código dele antes, para aprender o caminho; se
algum trecho for copiado, registrar em `fontes.json` e `NOTICE`):
1. **Contraste por seção:** medir a razão de contraste de cada texto sobre o fundo na referência e gravar em
   `secoes[].contraste`; o comparador passa a acusar quando o nosso site tem contraste menor que o da referência ou abaixo
   do mínimo de acessibilidade, com sugestão de cor dentro da paleta do cliente.
2. **Ritmo do movimento:** durações e curvas — das transições e animações de CSS (lidas do estilo computado e dos
   `@keyframes`) e, nas cenas feitas por biblioteca, estimadas pelas trajetórias que o raio-x já amostra; saída em
   `movimento[].duracaoMs` e `curva`, que alimentam o `src/ritmo.ts` do site.
3. **Arquivo de medidas pronto para construir:** `referencia/medidas.css` (variáveis com a escala de fontes em razão,
   espaçamentos, raios e larguras de coluna da referência), para a construção não reinterpretar números à mão. Cores e
   fontes NÃO vêm da referência: continuam sendo as do cliente.
Fica de fora: cores e fontes da referência como valores de uso, exportação para outras ferramentas de desenho e o servidor
próprio dele. O `designlang` em si não entra no caminho principal; pode ser rodado à mão para conferir uma medida.
**Pronto quando:** os três campos aparecem nos raio-x de teste, o comparador acusa um site de exemplo com contraste menor e
ritmo trocado, e `medidas.css` é usado na construção sem número digitado à mão. Testes em `raio-x.test.mjs` e
`comparar-referencia.test.mjs`.

### R7 — Teste: 3 sites para 3 empresas reais `[regente]`
Pedido do Neemias (10/11): um site para cada uma de 3 empresas reais. São as três da segunda escolha de 10/11 (nomes só na
memória, PRO-01), uma por ramo: móveis planejados, implantes dentários, vestidos de noiva. A primeira é a mesma da fatia do R1;
as outras duas medem a repetição (galeria do ramo → base → raio-x → site). Só dado público, pasta de clientes fora do
git, `noindex`, nada publicado nem enviado. Abordagem e nova análise de clientes ficam para depois (V0).
**Pronto quando:** o Neemias diz, dos três, que usaria para vender. Registrar sessões e consumo de cada um.

### R8 — Galeria ampla `[sonnet]`
6+ categorias com 60+ sites únicos, nenhuma fonte acima de 60%; filtros por fonte, tipo de movimento e
"inspiração × modelo que vira código"; aba de **efeitos** (catálogo do R5) ao lado da de sites.

### R9 — Enxugar `[sonnet]`
Medir quais das 42 skills do `landing-pages` foram lidas no R7; travar ou retirar as que não entram. Regras de
estilo que só valem sem referência saem do caminho comum. Versão, catálogo e `responsabilidades.json` atualizados.

## Ordem e paradas
R0 → **R1 (decide se o método vale)** → R2 → R3 → R4 → R5 → R6 → R7 → R8 → R9.
R0 e R1 cabem em duas sessões e já produzem o rascunho da abertura para o primeiro cliente.

## Riscos
| Risco | Resposta |
|---|---|
| Referência bloqueia robô ou é só WebGL | modo à mão do R1, ou o Neemias escolhe outra entre os 12 |
| Cena pede peça que não existe | `custo.md` avisa antes; equivalente tipográfico, de foto ou 3D simples |
| Ficar parecido demais | marca, fontes, paleta, textos e fotos são do cliente; nada de código ou imagem do site estudado |
| Custo por site alto | régua do R1; comparação em agente; uma parte por sessão |
| Voltar a construir ferramenta sem prova | R1 é parada obrigatória; R2 em diante só com "é esse o caminho" |

## Como saber que deu certo
**Régua (DEV-58): 10 de 10.** Nenhum site é mostrado como pronto com seção abaixo de 9 no olhar de diretor de arte
(`olhar.md` do comparador), com o nosso apontado na leitura às cegas ou sem conferir celular e movimento reduzido.
A prova interna de 10/11 ficou em 6: estrutura e tipografia no nível, fotos e fundo abaixo.
1. Veredito do Neemias no lado a lado. 2. Leitura às cegas não aponta o nosso. 3. Celular: desempenho ≥ 80 e
acessibilidade ≥ 95 no Lighthouse. 4. Rascunho de site novo em até 2 sessões. 5. Um cliente responde à abordagem.

## Decisões (o Neemias disse em 10/11 que não sabe responder; valem os padrões da seção 7 do plano de ação)
1. Aprova a ordem, com o R1 como parada de "vale ou não vale"?
2. Teste com 3 empresas reais, uma por ramo, começando por móveis planejados (pedido dele em 10/11).
3. Com referência escolhida, **ela vence as suas preferências antigas de estilo** (cantos arredondados, lista de
   proibidos do salão piloto)? Recomendado: sim, mantendo só o piso (princípio 5). Sem essa resposta, o R3 não mexe nelas.
4. Imagem gerada paga: decidir depois do R7.
