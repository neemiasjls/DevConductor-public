---
name: lp-maestro
description: Conduz a criação de uma landing page de cliente do começo ao fim no modo "corre atrás" (coleta sozinho o que é público, faz no máximo 5 perguntas e entrega 3 conceitos completos rodando para escolher), chamando a skill certa em cada etapa (coleta, referências, direção de arte, tipografia, paleta, conceito de movimento, assets das cenas, textos, construção, revisão, publicação). Use quando o usuário pedir um site novo, uma nova versão de um site, "o próximo cliente" ou uma landing page de venda.
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
| E | **3 conceitos completos rodando** (abaixo) | `lp-direcao-de-arte` + `estilos/`, `lp-tipografia`, `lp-paleta`, `lp-cenas`, `lp-textos` | ✔ escolher 1 |
| F | Plano do site a partir do conceito escolhido (LP-06): seções, cenas, peças, o que está "a definir" | maestro | vale como OK junto com a escolha |
| G | Segue o fluxo normal da etapa 4b em diante (assets, textos finais, construção, revisão) | tabela abaixo | ✔ só na revisão |

Orçamento de perguntas: **5 no site inteiro.** Escolher o conceito e aprovar a revisão não contam (são
"mostrar"), mas nenhuma etapa depois do passo C abre pergunta nova: o que faltar fica "a definir" e vai numa
lista curta junto da revisão. Não esperar a resposta do passo C parado: montar os conceitos com o que é
público e trocar pelos dados do dono quando ele responder.

Se o usuário já pediu trabalho autônomo sem perguntas, o passo C vira uma lista local de pendências:
nada é perguntado novamente, e fatos desconhecidos não são inventados. Escolhas e aprovações já dadas
valem nas etapas seguintes; silêncio não aprova conceito, uso de material ou publicação.

### Os 3 conceitos (passo E)
- Cada conceito = **um estilo** de `lp-direcao-de-arte/estilos/` (3 estilos diferentes) + **1 cena-assinatura**
  da lista daquele estilo (`lp-cenas`) + **conteúdo real** do `fatos.md` (nome, fotos escolhidas, frases da voz
  do negócio, endereço, WhatsApp) + paleta tirada das fotos do cliente (LP-07) na estrutura de cores do estilo.
- "Completo" = página curta mas inteira, rolando de cima a baixo: abertura, a cena-assinatura, uma seção de
  serviços e rodapé com os contatos disponíveis. Prova entra apenas se houver avaliação real permitida
  pelo usuário (curta, junto da seção, LP-09); sem ela, omitir. Ritmo do estilo em `src/ritmo.ts`.
- Onde: `clientes/<slug>/conceitos/` (um projeto Vite, um caminho por conceito: `/1`, `/2`, `/3`), com
  `noindex`. Não é o site: nada dele é apagado ou reaproveitado sem passar pelo plano (passo F).
- Antes de mostrar: os 3 rodam no celular (390px) e no computador, com movimento reduzido sem nada escondido
  (`lp-revisao/scripts/revisar-pagina.mjs`, por URL de conceito; o teste do estúdio fica para estudos isolados).
  Nada de peça falsa (LP-11): sem modelo 3D ou foto real, a cena usa tipografia, linha
  ou mapa.
- Mostrar: gravar a rolagem de cada um com `lp-referencias/scripts/gravar-rolagem.mjs` (computador e celular),
  montar a vitrine com `montar-galeria.mjs` e enviar junto 3 linhas por conceito (estilo, cena, a ideia ligada
  ao cliente). O usuário escolhe 1 (pode pedir "a cena do 2 no estilo do 1").
- Referências (etapa 2): neste modo, usar os favoritos da fábrica (`referencias/favoritos.md`, etapa 0 da
  `lp-referencias`) em vez de um moodboard novo; moodboard novo só se o usuário pedir.

## Fluxo (✔ = parar e mostrar ao usuário)
| # | Etapa | Skill nossa (decide) | Consultoras (só dão ideia ou checam) | Saída |
|---|---|---|---|---|
| 1 | Coleta do material (corre atrás sozinha; ≤ 5 perguntas) | `lp-coleta` | `cro` (o que a página precisa provar) | fotos, vídeos, `fatos.md`, `plano.md` |
| 1b | Palavras-chave e estrutura | `lp-seo` (A e B) | | `seo.md` (mapa de palavras-chave) |
| 2 | Referências reais | `lp-referencias` | `hallmark` (`study`), awesome-design-md | ✔ moodboard numerado |
| 3 | Direção de arte (a partir de `estilos/`) | `lp-direcao-de-arte` + `lp-tipografia` + `lp-paleta` | `taste-skill`, `frontend-design`, `ui-ux-pro-max` (dados por nicho), `impeccable` (`typeset`, `colorize`) | ✔ pranchas (no modo corre atrás: 3 conceitos rodando, junto com a etapa 4) |
| 4 | Conceito de movimento (receitas do estilo) | `lp-cenas` (roteiro em `tecnicas.md`) + `estudio-design:estudio-movimento` | `motion-design`, `gsap-*` (oficiais), `threejs-*` | ✔ vitrine com cenas em vídeo (já lidas às cegas) para escolher + técnica por seção |
| 4b | Assets das cenas | `lp-assets` | | ✔ peças em `assets/` + `assets.md` com licenças |
| 5 | Textos | `lp-textos` | `copywriting`, `cro` | ✔ `textos.md` |
| 6 | Construção | `lp-construcao` (+ `lp-cenas` nas cenas escolhidas) | `gsap-*` e `threejs-*` (nas cenas), `responsive-design`, `emil-design-eng` e `find-animation-opportunities` (só controles da interface), `vercel-react-best-practices` (plugin de TypeScript) | página local |
| 7 | Revisão | `lp-revisao` | `responsivo.mjs`, `web-design-guidelines`, `review-animations`, `break-ui`, taste `lint`/`inspect`, `hallmark` (`audit`), `impeccable` (`critique`), `web-perf` | ✔ prints + vídeo da rolagem + relatório |
| 8 | Publicação | `lp-publicar` + `lp-seo` (F) | `wrangler` | só quando pedir |
| 9 | Aprendizado | atualizar as skills `lp-*` (e as receitas de `lp-cenas`) com o que funcionou ou falhou | | skills melhores |

## Como usar as consultoras (evita uma atropelar a outra)
- Elas vêm travadas (`disable-model-invocation`): não entram sozinhas na conversa. A `lp-*` da etapa lê
  `<plugin>/skills/<nome>/SKILL.md` só na hora e só a parte que precisa.
- Ordem de autoridade: 1) preferências do usuário (memória do projeto e `regras.md`); 2) direção escolhida
  para o cliente; 3) a `lp-*` da etapa; 4) consultoras. Se uma consultora contrariar algo acima, ela perde.
- Cada decisão tem uma dona: layout = `lp-direcao-de-arte`; fontes = `lp-tipografia`; cores = `lp-paleta`;
  movimento = `lp-cenas` (cenas-assinatura) e `lp-construcao` (o resto); textos = `lp-textos`; busca no
  Google (palavras-chave, estrutura, parte técnica) = `lp-seo` — as outras etapas seguem o `seo.md`.
- Animação (DEV-42 em `regras.md`): cenas grandes com fato do negócio, quantas o projeto pedir, padrão discreto nas seções de
  leitura, GSAP + ScrollTrigger onde precisar de scroll. Durações e curvas vêm do ritmo do estilo (`src/ritmo.ts`).
- Clareza (LP-12): uma ideia por tela, texto curto, cena entendida sem legenda. A revisão mede (`lp-revisao`, seção 0).
- Celular equivalente: desenhar em 360–414px e no computador; a cena se adapta (câmera, tamanho, densidade)
  em vez de sumir.
- **O que nenhuma consultora decide** (vale sobre o texto delas): cortar animação por gosto (`hallmark`; o corte
  é da `lp-revisao`, pelo teste do porquê), aprovar a página parada antes de animar (`taste-skill`), trocar a stack
  ou proibir GSAP/Motion/Lenis, mudar as cenas grandes do roteiro, reduzir o tom fixado por nicho (LP-11). Movimento é
  concebido junto com o layout, na etapa 3–4.
  O limite de 300 ms da `emil-design-eng` vale para controles de interface, não para cenas de scroll.
- Originais das consultoras: ver `FONTES.md` do plugin; ao atualizar uma, ler o SKILL.md novo antes de copiar.

## Regras
- Coletar sozinho antes de perguntar; no máximo 5 perguntas ao usuário por site, só do que só ele sabe.
- Plano antes de construir (LP-06): os 3 conceitos são estudo, não o site; o site só começa depois da escolha
  e do plano; salvar decisões duráveis na memória; atualizar `docs/continuar.md`.
- Paleta do espaço real do cliente (LP-07), reinterpretada; fotos reais; renders só como referência.
- Nada com cara de IA (LP-08): ver lista proibida em `lp-direcao-de-arte` e `lp-tipografia`.
- Só fato confirmado vai para o site; o resto fica "a definir".
- Uma versão nova nunca apaga a anterior.
