---
name: lp-direcao-de-arte
description: "Define a direção de arte da landing page de um cliente. Com referência escolhida na galeria (padrão), sai uma direção fiel: escala, grade e ritmo do raio-x da referência, com fontes, paleta, fotos e textos do cliente. Sem referência, cria 3 direções bem diferentes a partir de 7 estilos prontos, sóbrios e ousados (estilos/: fontes, cores, grade, ritmo de movimento e cenas que combinam), em pranchas ou conceitos rodando para escolha. Use depois de lp-referencias e antes de escrever código."
---

# Direção de arte própria de cada cliente

Entrada: material do cliente (fotos, vídeos, dados), `referencias.md` com a **base escolhida pelo usuário na galeria
da `lp-referencias`** (e o que ele quer mudar), as favoritas e o DNA estudado. Sem base escolhida, não começar.
Cada direção diz o que herda da base (estrutura, ritmo, movimento) e o que muda; site com dono é estudo, não cópia.
Saída: com raio-x da base, **uma** direção fiel (seção 0) → `direcao.md`; sem ele, 3 direções em pranchas (seções
2–5) → o usuário escolhe 1 → `direcao.md`. Nos dois casos o `direcao.md` traz a parte "No celular" (0b).

## 0. Caminho por referência (padrão quando há `raio-x.json` da base)
Não usa `estilos/`, sorteio da `taste-skill`, `frontend-design` nem `ui-ux-pro-max` (tabela no `lp-maestro`).
- **Da referência** (`raio-x.json` e `roteiro.md`): escala de fontes em razão do corpo (`pagina.escala`), grade
  (colunas por seção), ritmo (altura de cada seção em telas, ordem), proporção imagem/texto e palavras por tela,
  tipo de movimento de cada seção. Duas bases: a estrutura de uma, o movimento da outra.
- **Do cliente** (LP-07): fontes (`lp-tipografia`) e paleta (`lp-paleta`), escolhidas para manter o **mesmo
  contraste e peso visual** da referência (título pesado e apertado ↔ título pesado e apertado; fundo escuro com
  um acento ↔ fundo escuro com um acento). Fotos, textos e marca também. É o que deixa parecido sem ser cópia.
- `direcao.md` (o único documento da direção; o `plano.md` só aponta para ele) com uma tabela por seção: **da referência** × **do cliente** × **mudou a pedido** (o "o que muda"
  do usuário), mais a lista "diferenças em relação às preferências anteriores" (abaixo, antes das preferências).
- Ideia central e detalhe de assinatura (item 1) continuam nascendo do material do cliente, dentro da forma da base.
- **Uma ou duas ideias próprias do ofício do cliente, obrigatórias neste caminho** (sem elas o site sai
  "adaptado"): desenho técnico, ferramenta, medida, material ou gesto do trabalho dele virando elemento da página
  (cota de marcenaria no título, veio da madeira como divisor). Escrever no `direcao.md` qual é a ideia, em que
  seção aparece e de que fato do item 1 ela nasce. Enfeite que serviria a outra empresa não conta.
- **Fundo vivo leve (opção, nos dois caminhos):** em vez de degradê parado, um fundo que se mexe devagar com as
  cores da paleta (receita `fundo-shader` da `lp-cenas`; base: `paper-design/shaders`, Apache-2.0, ou `oframe/ogl`,
  Unlicense, com crédito em `assets.md`). Só entra com o custo no celular **medido** pelo Lighthouse do
  celular (TBT e nota, antes e depois do fundo; o `celular.mjs` não mede quadros nem bateria); parado com movimento
  reduzido e fora da tela. Sem medida, sem fundo vivo; não passou na medida, vira imagem.

## 0b. "No celular": parte obrigatória do `direcao.md`, seção por seção
O celular é desenhado, não é o computador encolhido. Com base: ler o `raio-x-celular.json` e o
`roteiro-celular.md` e **olhar os `prints-celular/`** (número não mostra recorte nem ordem). Se a referência
reorganiza a seção no celular, a nossa reorganiza do mesmo jeito. Sem base, a mesma tabela, decidida pelo estilo.
| Item | Como decidir, por seção |
|---|---|
| Ordem | a ordem das seções no celular da referência (pode ser outra que a do computador) |
| Composição | o que some, o que empilha, o que vira carrossel ou rolagem lateral por toque |
| Título | tamanho e quebra das linhas em razão da escala do celular da referência (`pagina.escala` do `raio-x-celular.json`); nunca número fixo nem o título do computador reduzido |
| Fotos | proporção e recorte em pé, com o assunto inteiro (lições em `lp-construcao`) |
| Botão de contato | onde fica; sempre alcançável com o polegar, sem cobrir o conteúdo |
| Menu | o que acontece com ele (gaveta, só o botão de contato, some); abre e fecha por toque |
| Movimento | versão de toque e versão com movimento reduzido de cada cena (`lp-cenas`, regra "Celular") |

O que some no celular leva o motivo escrito; cena não some, ganha versão de toque (DEV-34), e contato e fatos do
negócio ficam. Piso que nenhuma referência derruba: texto de leitura e campos ≥ 16 px, área de toque ≥ 44 px, nada
rolando para o lado. A conferência é da `lp-revisao` (`celular.mjs`).

## 1. O que só este cliente tem
Liste 5–8 fatos e materiais exclusivos (ex.: "salão com sala da noiva", "filme profissional do espaço",
"fundadora da equipe de especialistas da marca X"). A ideia central tem de nascer daqui, não do nicho genérico.
Fotos: um tratamento só para o site (mesma luz, recorte e cor). Fotos de origens diferentes sem tratamento comum
parecem banco de imagem (revisão da prova de 29/10/2026); fonte incomum e cor forte não bastam como identidade.
Antes de fechar a direção, ver se existe imagem que a sustente: ordem de preferência e critério de qualidade em `lp-assets`.
Direção que só funciona com foto que não existe muda de solução visual (3D, ilustração, tipografia), sem aceitar foto fraca.

## 2. Sem referência: partir de 3 estilos
Comece pelos estilos prontos em `estilos/` (nesta pasta; índice em `estilos/README.md`): luxo editorial,
tecnológico escuro, claro e orgânico, editorial sério (sóbrios) e cinético vibrante, imersivo 3D, brutalista
gráfico (ousados). Escolha **3 diferentes** que caibam no negócio, com pelo menos 1 ousado quando o tom do
nicho permitir (LP-11); cada um
já traz fontes, estrutura de cores, grade, **ritmo de movimento** (durações e curvas iguais no site todo) e as
receitas de `lp-cenas` que combinam. As 3 direções do cliente nascem deles: fatos do item 1 + paleta das fotos
(LP-07) + as cenas da lista do estilo que o negócio pede (DEV-42). Um site usa um estilo só; desvios (fonte trocada, cena fora da lista)
ficam registrados no `direcao.md` com o motivo.

## 3. Sortear para variar dentro do estilo (opcional)
- Rode o sorteio do taste-skill para variar de verdade:
  `node <plugin>/skills/taste-skill/scripts/draw.mjs --sector <setor> --brief "<uma linha>"`
  (`--list sectors` mostra os setores; salão de beleza ≈ fashion ou health).
- Combine com o DNA das referências favoritas. As 3 direções devem diferir em **estrutura**, não só em cor.

## 4. Cada direção define
| Item | Como decidir |
|---|---|
| Estilo de base | um dos `estilos/` (o ritmo dele vira o `src/ritmo.ts` do site) |
| Ideia central | 1 frase que liga o material do cliente à direção (ex.: "a página como um editorial de revista sobre a cor") |
| Tipografia | skill `lp-tipografia` (par fora da lista proibida, com o porquê) |
| Paleta | skill `lp-paleta` (cor-assinatura e escuros/claros) |
| Macroestrutura | ordem e forma das seções com ritmo variado: tela cheia, coluna estreita, grade quebrada, faixa horizontal, texto grande sozinho |
| Fotografia | como as fotos aparecem (sangradas, recortadas, em sequência, preto e branco + cor...), a luz e o tratamento da série e, se faltar foto boa, qual solução entra no lugar |
| Movimento | 1 ou 2 gestos próprios com motivo (ex.: rolagem que revela a cor), nunca o mesmo efeito em tudo |
| Detalhe de assinatura | 1 elemento que a pessoa lembra depois (ex.: numeração editorial, a cadeira real). Aparece onde faz sentido, não em toda seção (LP-12) |

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- `ui-ux-pro-max`: dados por nicho, não estilo pronto. Rode `python <plugin>/skills/ui-ux-pro-max/scripts/search.py "<nicho>" --design-system` e use só o que
  bate com a LP-09 (padrões de página, o que evitar no nicho, checklist). Ignore sugestões de vidro, degradê,
  neon ou "bento".
- `taste-skill` (sorteio `draw.mjs`) e `frontend-design`: ideias de direção; a composição final segue a LP-09.

## 5. Pranchas (ou conceitos rodando)
No modo "corre atrás" do `lp-maestro`, as pranchas são substituídas pelos **3 conceitos rodando** (estilo +
cena + conteúdo real; ver o maestro). Fora dele, monte cada direção como uma página HTML estática de 1440×2400 com a abertura, uma seção de galeria e uma de
texto, usando fotos e textos reais. Tire print com `lp-revisao/scripts/prints.mjs` e envie as 3 lado a lado.

## Como foi no site 2 de um salão de beleza (cliente piloto) (referência)
Direção `pinned-poster` (taste-skill, seed 826130912). Ideia: os nomes de cor da colorista (Pérola, Honey,
Doce de Leite...) viram as capas que trocam sob o título fixo, com o fundo amostrado do próprio cabelo.
Coisa viva: cartela de tons → resultado real → WhatsApp com o tom escolhido. Paleta da ficha trocada pela do
assunto (permitido pela skill); fonte de texto sorteada (Public Sans, #87) trocada por Familjen Grotesk (#516).

## Convivência com a base escolhida (DEV-53)
As preferências e proibições abaixo são confirmadas e não mudam. No caminho por referência, a base escolhida pelo
usuário (mais recente e específica) define a forma: onde uma preferência de **estilo** abaixo contradiz a base (ex.:
formas suaves e fotos arredondadas × base de quina viva), segue-se a base e o conflito entra no `direcao.md` em
"diferenças em relação às preferências anteriores", para ele decidir ao ver o lado a lado. O que é piso vale
sempre: clareza (LP-12), tom por nicho e nada de peça falsa ou cara de desenho infantil (LP-11), avaliações
junto da seção, imagem com qualidade (LP-13), efeito de biblioteca só adaptado.

## Preferência do usuário (LP-09, DEV-34, DEV-42 e LP-12), acima das regras da taste-skill
- Layout com intenção, variando entre seções (grade, sobreposição, tela cheia, rolagem horizontal); cenas
  grandes presas pelo scroll na quantidade que o projeto pede, cada uma mostrando um fato do negócio (ver `lp-cenas`); seções de leitura com
  movimento discreto. Uma ideia por tela e texto curto (LP-12): a direção não pode depender de explicação.
  Por isso perdem duas regras da taste-skill: "carry the idea into every section" (a ideia central aparece na
  abertura, numa cena grande e no fechamento, `lp-cenas/tecnicas.md`) e "fullness" quando encher a tela
  significa pôr mais texto ou mais efeito; tela com respiro e uma coisa só é aceita.
- Formas suaves: arcos (como espelhos/portas do salão), fotos arredondadas, botões pílula. Nada "quadrado".
  Pedido reforçado pelo usuário (16/10): quina pontuda nas fotos incomoda; o padrão de raio está em `lp-construcao`.
- Animação do começo ao fim: cenas grandes fortes (3D real, foto que abre, Lottie/Rive quando o real não se
  fotografa) e, no resto, entradas discretas que variam por tipo de conteúdo; nunca o mesmo efeito em todas.
- Retorno de 09/11/2026: imagem fraca derruba o site mesmo com layout aprovado, e a cadeira 3D do Prumo foi a imagem preferida.
- Retorno de 04/11/2026: agradaram objeto real com gesto simples (cadeira 3D girando) e foto com transição
  (porta do baú); desagradaram diagrama "por dentro" sem porquê (fio), cena didática com números (régua do
  degradê) e telas com informação demais.
- Avaliações: nada de seção de cartões "nota no Google"; cada avaliação curta vai junto da seção certa
  (resultado, serviço, noivas), perto do botão. Rodapé completo com ícones, equipe e horários.
- A direção `pinned-poster` foi rejeitada ("bagunçado"); use as ideias da taste-skill (cartela, tons), não a
  composição de pôster fixo.
- Tom por nicho (LP-11): sério para transportadora, advocacia, saúde; ousado e colorido permitido para salão,
  restaurante, academia. Sempre sem cara de desenho infantil. No piloto da transportadora, ovo-mascote, ícones de
  ovo, placas verdes chamativas e títulos em caixa-alta condensada foram chamados de "muito cartoon"; o que
  agradou foi título sem caixa-alta, cores contidas (âmbar só em detalhe), fios finos e ficha técnica.

## Proibido em qualquer direção (achados no site 1 do salão piloto)
- Efeito pronto de biblioteca **sem adaptação** (borda com brilho girando, botão com brilho, spotlight genérico).
  Faixa infinita, contador e cartão 3D só entram se a direção pedir e forem restilizados com a marca.
- Mesmo efeito de entrada (aparecer subindo/desfoque) em todas as seções.
- Uma palavra do título em itálico/colorida em todo título.
- Vidro fosco (backdrop-blur) por reflexo; ícones Lucide genéricos (estrela, check, brilho) como decoração.
- Seta "→" grudada em todo link/botão; textos "A · B · C" com pontos médios.
- Rótulo pequeno → título → parágrafo → grade de cartões repetido em toda seção; tudo com cantos arredondados.
- Paleta creme + dourado/terracota como base; pares de fonte da lista proibida.
