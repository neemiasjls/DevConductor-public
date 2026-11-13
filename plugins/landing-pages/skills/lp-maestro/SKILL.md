---
name: lp-maestro
description: Conduz a criação de uma landing page de cliente do começo ao fim no modo "corre atrás" (coleta sozinho o que é público, faz no máximo 5 perguntas; com referência escolhida na galeria, tira o raio-x dela e entrega um conceito fiel a ela com o conteúdo do cliente; sem referência, 3 conceitos completos rodando para escolher), chamando a skill certa em cada etapa (coleta, referências, direção de arte, tipografia, paleta, conceito de movimento, assets das cenas, textos, construção, revisão, publicação). Use quando o usuário pedir um site novo, uma nova versão de um site, "o próximo cliente" ou uma landing page de venda.
---

# Maestro: do briefing ao link

Fábrica de landing pages para negócios locais. Cada cliente em `clientes/<slug>/`, com versões `site`,
`site-2`... mantidas para comparar. Regras da fábrica: `regras.md` (nesta pasta) — ler antes de começar.

`<plugin>` nos caminhos das skills = pasta deste plugin (duas pastas acima desta skill; o Claude mostra o
caminho base ao carregar a skill). Ex.: `<plugin>/skills/lp-revisao/scripts/prints.mjs`.

Em landing page, **esta skill conduz** (DEV-08). O método superpowers entra só no código da construção
(plano das tarefas de código, verificação antes de dizer pronto).

## Modo "corre atrás" (padrão para site novo)
O peso não fica no usuário: o maestro busca, monta e **mostra**; pergunta só o que só o dono sabe.
Entrada mínima: nome do negócio + cidade, ou o site, ou o @ do Instagram.

| Passo | O que acontece | Skill | Parada |
|---|---|---|---|
| A | Coleta sozinha do que é público: web, site atual, Google Maps, Instagram sem login (LP-05), CNPJ | `lp-coleta` (1–7) | — |
| B | `fatos.md`: cada fato com fonte e estado (público / a confirmar / a definir) | `lp-coleta` (7) | — |
| C | **Uma** mensagem com no máximo 5 perguntas, só do que só o dono sabe, cada uma com o que já foi achado | `lp-coleta` (8) | ✔ (não bloqueia) |
| D | Palavras-chave e estrutura | `lp-seo` (A e B) | — |
| D2 | **Galeria de referências da categoria**: o usuário escolhe 1 ou mais como base e diz o que muda | `lp-referencias` (1) | ✔ escolher a base |
| E | **Com base escolhida (padrão):** raio-x + **1 conceito fiel**. **Sem base:** 3 conceitos completos rodando (abaixo) | `lp-direcao-de-arte`, `lp-tipografia`, `lp-paleta`, `lp-cenas`, `lp-textos` (+ `estilos/` só sem base) | ✔ aprovar o fiel / escolher 1 |
| F | Plano do site a partir do conceito escolhido (LP-06): seções, cenas, peças, o que está "a definir" | maestro | vale como OK junto com a escolha |
| G | Segue o fluxo normal da etapa 4b em diante (assets, textos finais, construção, revisão) | tabela abaixo | ✔ só na revisão |

Orçamento de perguntas: **5 no site inteiro.** Escolher o conceito e aprovar a revisão não contam (são
"mostrar"), mas nenhuma etapa depois do passo C abre pergunta nova: o que faltar fica "a definir" e vai numa
lista curta junto da revisão. Não esperar a resposta do passo C parado: montar os conceitos com o que é
público e trocar pelos dados do dono quando ele responder.

Se o usuário já pediu trabalho autônomo sem perguntas, o passo C vira uma lista local de pendências:
nada é perguntado novamente, e fatos desconhecidos não são inventados. Escolhas e aprovações já dadas
valem nas etapas seguintes; silêncio não aprova conceito, uso de material ou publicação.

### Duas paradas para o dono olhar (os dois caminhos)
Além das paradas da tabela, o dono olha a página **rodando** duas vezes antes da revisão final: (1) **direção
escolhida**, no conceito do passo E; (2) **primeira tela pronta** (abertura + a seção seguinte, computador e
celular), antes de construir o resto. Em cada parada, **sempre**: o endereço local clicável
(ex.: http://127.0.0.1:PORTA/), conferido no ar na hora de enviar (abrir e ver a página responder; servidor
caído não é parada), e **o que olhar**, em 2 ou 3 itens ("o título sobre a foto", "a foto no celular"). Print
ajuda, mas não substitui o endereço. Dúvida de gosto: duas opções lado a lado (A/B), nunca pedir descrição.

**Régua do dono:** 3 a 5 sites que ele considera nota 10, com uma linha do porquê de cada, guardados em
`clientes/<slug>/regua-do-dono.md` (a régua geral dele fica no projeto do kit, na mesma forma). Pedir uma vez, na
galeria do passo D2; não conta no orçamento de perguntas. Quando existir, é o alvo do juiz na revisão
(`lp-revisao`): os prints desses sites entram como comparação, junto ou no lugar da referência.

Referências (passo D2, DEV-53): sempre a galeria por categoria (`buscar-referencias.mjs`, com `--recomendados`),
com os favoritos da fábrica junto. Escolher a base não conta no orçamento de perguntas (é "mostrar"). Nenhum
conceito é desenhado antes dessa escolha; se o usuário pediu trabalho sem perguntas, a galeria fica pronta e os
conceitos esperam. Site com dono é estudo, nunca cópia; modelo com licença aberta pode ser a base do código.

### Com referência escolhida (padrão): um conceito fiel (passo E)
A base escolhida é a planta do site: nada de 3 conceitos, estilos prontos ou sorteio.
1. Raio-x da base, **sempre nos dois tamanhos**: `node <plugin>/skills/lp-referencias/scripts/raio-x.mjs <url>
   clientes/<slug>/referencia/<nome> --tambem-celular` → `raio-x.json`, `roteiro.md`, `custo.md`, `prints/` e, do
   celular (390 px, toque), `raio-x-celular.json`, `roteiro-celular.md`, `custo-celular.md`, `prints-celular/`.
   Site que bloqueia a leitura: estudo à mão (`lp-referencias`, seção 2b), também nos dois tamanhos.
2. `custo.md` e `custo-celular.md` primeiro: cena que pede peça que não existe (modelo 3D próprio, filme) troca por equivalente, e o
   usuário fica sabendo junto com o conceito, **antes** de construir.
3. Um conceito em `clientes/<slug>/conceitos/1` (`noindex`) que segue o `roteiro.md` **seção por seção** (ordem,
   altura em telas, colunas, escala, tipo de movimento) com o conteúdo real do `fatos.md` e o "o que muda" dito
   pelo usuário. Forma da base; fontes, paleta, textos, fotos e marca do cliente (`lp-direcao-de-arte`).
   No celular segue o `roteiro-celular.md` e os `prints-celular/`, não o computador encolhido.
4. Duas bases: estrutura e ritmo de uma, movimento da outra; o `direcao.md` diz qual seção vem de qual.
5. `direcao.md` (passo F; o `plano.md` só aponta para ele): por seção, "da referência" × "do cliente" × "mudou a pedido", e a lista "diferenças em
   relação às preferências anteriores", mais a parte **"No celular"** seção por seção (composição e versão de toque
   de cada cena). Nenhuma decisão de forma sem origem no raio-x ou no pedido do usuário.
6. Mostrar: o conceito rodando (mesma checagem de celular e movimento reduzido de baixo), o lado a lado com a base
   **no computador e no celular** (`lp-revisao/scripts/comparar-referencia.mjs`, sem e com `--celular`; ver
   `lp-construcao`) e os dois `custo`. Antes de mostrar, o portão do celular (abaixo).

| Consultoras neste caminho | |
|---|---|
| Ficam fora | `estilos/`, sorteio da `taste-skill`, `frontend-design`, `ui-ux-pro-max`, `hallmark study` |
| Ficam | `gsap-*`, `threejs-*`, `responsive-design`, `web-perf`, `lp-seo`, `lp-textos`, `lp-revisao` |

**Preferências antigas × base (DEV-53):** as regras de estilo confirmadas (`regras.md`, `lp-direcao-de-arte`)
continuam como estão. Neste caminho a base escolhida, mais recente e específica, define a forma: onde uma
preferência antiga de **estilo** contradiz a base (ex.: cantos arredondados × base de quina viva), segue-se a base
e o conflito vai para o `direcao.md` em "diferenças em relação às preferências anteriores", para o usuário decidir ao
ver o lado a lado. **Piso, em qualquer caminho:** conteúdo verdadeiro e nada de peça falsa (LP-11), tom por nicho
(LP-11), clareza (LP-12/13), avaliações junto da seção (LP-09), acessibilidade, movimento reduzido, peso, licença,
e nada de código, texto, foto ou marca do site estudado.

### Sem referência: os 3 conceitos (passo E)
- Cada conceito = **um estilo** de `lp-direcao-de-arte/estilos/` (3 estilos diferentes) + **1 cena-assinatura**
  da lista daquele estilo (`lp-cenas`) + **conteúdo real** do `fatos.md` (nome, fotos escolhidas, frases da voz
  do negócio, endereço, WhatsApp) + paleta tirada das fotos do cliente (LP-07) na estrutura de cores do estilo.
- "Completo" = página curta mas inteira, rolando de cima a baixo: abertura, a cena-assinatura, uma seção de
  serviços e rodapé com os contatos disponíveis. Prova entra apenas se houver avaliação real permitida
  pelo usuário (curta, junto da seção, LP-09); sem ela, omitir. Ritmo do estilo em `src/ritmo.ts`.
- Onde: `clientes/<slug>/conceitos/` (um projeto Vite, um caminho por conceito: `/1`, `/2`, `/3`), com
  `noindex`. Não é o site: nada dele é apagado ou reaproveitado sem passar pelo plano (passo F).
- Cada conceito, e depois cada seção do site, começa pelo celular (390 px) e só então abre para o computador.
- Antes de mostrar: os 3 rodam no celular (390px) e no computador, com movimento reduzido sem nada escondido
  (`lp-revisao/scripts/revisar-pagina.mjs`, por URL de conceito; o teste do estúdio fica para estudos isolados).
  Nada de peça falsa (LP-11): sem modelo 3D ou foto real, a cena usa tipografia, linha
  ou mapa.
- Mostrar: gravar a rolagem de cada um com `lp-referencias/scripts/gravar-rolagem.mjs` (computador e celular),
  montar a vitrine com `montar-galeria.mjs` e enviar junto 3 linhas por conceito (estilo, cena, a ideia ligada
  ao cliente). O usuário escolhe 1 (pode pedir "a cena do 2 no estilo do 1").

### Celular: desenhado, não encolhido (os dois caminhos)
- **Desenho:** a composição do celular é decidida seção por seção antes de construir (`direcao.md`, parte "No
  celular", `lp-direcao-de-arte` 0b); com base, a partir do `raio-x-celular.json` e dos `prints-celular/`, que
  devem ser olhados. Se a base reorganiza a seção no celular, o nosso reorganiza do mesmo jeito.
- **Movimento:** cada cena tem a versão de toque e a de movimento reduzido decididas antes de construir
  (`lp-cenas`); nunca "desligada no celular" sem substituto que conte a mesma ideia.
- **Construção:** cada seção nasce em 390 px e depois abre para o computador; o laço visual e a nota do olhar
  (régua A: ≥ 9; ou régua B: nosso ≥ referência em toda seção e média ≥ a dela + 0,5; as duas do `juiz.mjs`,
  detalhe em `lp-revisao/referencias/juiz-as-cegas.md`) valem nos dois tamanhos. Seção que passa no computador e não no celular não está pronta (`lp-construcao`).
- **Antes de mostrar:** `<plugin>/skills/lp-revisao/scripts/celular.mjs` (uso no cabeçalho dele), o portão de 7
  itens: sem rolagem para o lado nem corte em 360 px; texto de leitura e campos ≥ 16 px; toque ≥ 44 px; seção presa
  sem travar por toque e legível com movimento reduzido; botão de contato ao alcance do polegar e menu que abre e
  fecha; vídeo mudo e em linha, ou imagem; os mesmos seis no motor do Safari. Site que falha não é mostrado como
  pronto. O relatório diz com todas as letras "Safari conferido" ou "Safari não conferido"; aparelho de verdade
  continua sendo a conferência final do dono.

## Fluxo (✔ = parar e mostrar ao usuário)
| # | Etapa | Skill nossa (decide) | Consultoras (só dão ideia ou checam) | Saída |
|---|---|---|---|---|
| 1 | Coleta do material (corre atrás sozinha; ≤ 5 perguntas) | `lp-coleta` | `cro` (o que a página precisa provar) | fotos, vídeos, `fatos.md`, `plano.md` |
| 1b | Palavras-chave e estrutura | `lp-seo` (A e B) | | `seo.md` (mapa de palavras-chave) |
| 2 | Referências reais (antes de qualquer desenho) | `lp-referencias` (raio-x da base) | `hallmark` (`study`, só sem raio-x), awesome-design-md | ✔ galeria da categoria: base escolhida + o que muda |
| 3 | Direção de arte (do raio-x da base; sem base, de `estilos/`) | `lp-direcao-de-arte` + `lp-tipografia` + `lp-paleta` | sem base: `taste-skill`, `frontend-design`, `ui-ux-pro-max` (dados por nicho); `impeccable` (`typeset`, `colorize`) | ✔ pranchas (no modo corre atrás: conceito fiel ou 3 conceitos rodando, junto com a etapa 4) |
| 4 | Conceito de movimento (receitas do estilo) | `lp-cenas` (roteiro em `tecnicas.md`) + `estudio-design:estudio-movimento` | `motion-design`, `gsap-*` (oficiais), `threejs-*` | ✔ vitrine com cenas em vídeo (já lidas às cegas) para escolher + técnica por seção |
| 4b | Assets das cenas | `lp-assets` | | ✔ peças em `assets/` + `assets.md` com licenças |
| 5 | Textos | `lp-textos` | `copywriting`, `cro` | ✔ `textos.md` |
| 6 | Construção | `lp-construcao` (+ `lp-cenas` nas cenas escolhidas) | `gsap-*` e `threejs-*` (nas cenas), `responsive-design`, `emil-design-eng` e `find-animation-opportunities` (só controles da interface), `vercel-react-best-practices` (plugin de TypeScript) | página local |
| 7 | Revisão | `lp-revisao` | `celular.mjs`, `responsivo.mjs`, `web-design-guidelines`, `review-animations`, `break-ui`, taste `lint`/`inspect`, `hallmark` (`audit`), `impeccable` (`critique`), `web-perf` | ✔ prints + vídeo da rolagem + relatório + nota do painel às cegas (`acabamento.mjs` e `rodadas.mjs` antes; `juiz.mjs`) |
| 7b | Vídeo de venda (só com a revisão aprovada; para mandar ao dono junto do link) | `lp-video` | | ✔ 3 roteiros em MP4 para escolher + versão leve para o WhatsApp, fora do git |
| 8 | Publicação | `lp-publicar` + `lp-seo` (F) | `wrangler` | só quando pedir |
| 9 | Aprendizado | atualizar as skills `lp-*` (e as receitas de `lp-cenas`) com o que funcionou ou falhou | | skills melhores |

## Como usar as consultoras (evita uma atropelar a outra)
- Elas vêm travadas (`disable-model-invocation`): não entram sozinhas na conversa. A `lp-*` da etapa lê
  `<plugin>/skills/<nome>/SKILL.md` só na hora e só a parte que precisa.
- Ordem de autoridade: 1) preferências do usuário (memória do projeto e `regras.md`); 2) direção escolhida
  para o cliente; 3) a `lp-*` da etapa; 4) consultoras. Se uma consultora contrariar algo acima, ela perde.
  Com base escolhida, a forma segue a base e os conflitos de estilo vão ao `direcao.md` ("Preferências antigas × base").
- Cada decisão tem uma dona: layout = `lp-direcao-de-arte`; fontes = `lp-tipografia`; cores = `lp-paleta`;
  movimento = `lp-cenas` (cenas-assinatura) e `lp-construcao` (o resto); textos = `lp-textos`; busca no
  Google (palavras-chave, estrutura, parte técnica) = `lp-seo` — as outras etapas seguem o `seo.md`.
- Animação (DEV-42 em `regras.md`): cenas grandes com fato do negócio, quantas o projeto pedir, padrão discreto nas seções de
  leitura, GSAP + ScrollTrigger onde precisar de scroll. Durações e curvas vêm do ritmo do estilo (`src/ritmo.ts`).
- Clareza (LP-12): uma ideia por tela, texto curto, cena entendida sem legenda. A revisão mede (`lp-revisao`, seção 0).
- Celular equivalente: desenhar em 360–414px e no computador; a cena se adapta (câmera, tamanho, densidade)
  em vez de sumir (regras em "Celular: desenhado, não encolhido").
- **O que nenhuma consultora decide** (vale sobre o texto delas): cortar animação por gosto (`hallmark`; o corte
  é da `lp-revisao`, pelo teste do porquê), aprovar a página parada antes de animar (`taste-skill`), trocar a stack
  ou proibir GSAP/Motion/Lenis, mudar as cenas grandes do roteiro, reduzir o tom fixado por nicho (LP-11). Movimento é
  concebido junto com o layout, na etapa 3–4.
  O limite de 300 ms da `emil-design-eng` vale para controles de interface, não para cenas de scroll.
- Originais das consultoras: ver `FONTES.md` do plugin; ao atualizar uma, ler o SKILL.md novo antes de copiar.

## Regras
- Coletar sozinho antes de perguntar; no máximo 5 perguntas ao usuário por site, só do que só ele sabe.
- Plano antes de construir (LP-06): os conceitos são estudo, não o site; o site só começa depois da escolha
  e do plano; salvar decisões duráveis na memória; atualizar `docs/continuar.md`.
- Paleta do espaço real do cliente (LP-07), reinterpretada; fotos reais; renders só como referência.
- Nada com cara de IA (LP-08): ver lista proibida em `lp-direcao-de-arte` e `lp-tipografia`.
- Só fato confirmado vai para o site; o resto fica "a definir".
- Uma versão nova nunca apaga a anterior.
