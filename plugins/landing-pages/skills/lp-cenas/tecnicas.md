# Catálogo de técnicas e direção de movimento do site inteiro (DEV-42, LP-12)

O site é uma sequência de capítulos com **as cenas grandes que o negócio pede** (quantas, ver DEV-42) e, entre elas, seções que se leem com calma.
Antes de construir, escreva no `plano.md` o **roteiro de movimento**: as cenas grandes (técnica, fato do
negócio que mostram e permanência em telas) e o padrão discreto do resto. Toda técnica passa no teste do porquê
(`SKILL.md`).

## Roteiro (arco do site)
1. **Abertura (gancho, 0–3 s):** algo real se move antes do primeiro scroll: objeto 3D girando devagar, foto que
   ganha luz, vídeo recortado em máscara, título cinético curto. O título nunca espera a animação para ser lido.
2. **Cenas grandes:** 2–3 no site, cada uma mostrando um fato do negócio (o produto, o serviço, o resultado, o
   caminho). Uma delas é o clímax, perto do meio ou do fim.
3. **Seções de leitura** (serviços, preços, horários, perguntas, contato): padrão discreto. Entradas curtas do
   ritmo do estilo, uma vez, uma variação por tipo de conteúdo (texto, foto, lista). Podem ter uma
   microinteração útil (trocar a foto do serviço ao passar o cursor, por exemplo), sem virar cena.
4. **Fechamento:** chamada para ação com microinteração própria (botão que reage ao cursor, WhatsApp que pulsa
   uma vez). Pode retomar a ideia central da abertura.
5. **Passagens:** use transição (cobre a cena, cortina, cor que invade) quando ela ajuda a sair de uma cena grande.
   Seção que só começa abaixo da anterior é normal nas seções de leitura.

## Técnicas por família (repertório, não cota)
| Família | Técnicas | Receita ou base |
|---|---|---|
| Texto | revelado por palavra, letras que encontram o lugar, palavra com zoom, troca de palavra no título, tipografia variável | `texto-revelado`, `letras-em-cena`, `palavra-zoom`, `gsap-plugins` (SplitText) |
| Imagem | máscara que abre, foto ocupa a janela, distorção por shader, parallax em camadas, antes/depois arrastando | `mascara-estudo`, `foto-abre`, `distorcao-imagem`, `camadas-profundidade` |
| Espaço | cena presa com etapas, rolagem lateral, câmera que vira, cortina, seção que cobre a cena | `rolagem-lateral`, `camera-vira`, `cortina`, `secao-cobre-cena` |
| 3D/WebGL | modelo real guiado pelo scroll, órbita, partículas formando o produto, fundo com shader | `modelo-3d-real`, `orbita-3d`, `particulas-estudo`, `fundo-shader` |
| Ilustração viva | Lottie presa ao progresso, Rive com estados, linha desenhada, mapa com rota | `lottie-progresso`, `rive-estados`, `linha-desenhada`, `rota-veiculo` |
| Interação | botão magnético, cursor com lupa (só com mouse), cartões que reagem ao toque, arrastar para comparar | `emil-design-eng` (valores de interface) |
| Dados e prova | número que conta sob demanda (restilizado), linha do tempo com marcador | `linha-do-tempo`, `cronologia-estudo` |

## Regras de escolha
- **Real antes de desenhado.** Se o negócio tem objeto, lugar ou resultado fotografável, a cena grande usa o real
  (GLB + HDRI, foto, vídeo). Ilustração viva entra para caminho, rota ou processo que não se fotografa.
- **Esquema didático é exceção** (LP-12): corte do fio, régua de medidas, gráfico técnico. Só entra se o visitante
  precisar dele para decidir, com no máximo 4 rótulos visíveis e entendido sem legenda em ~3 s.
- **A ideia central não é obrigação de toda seção.** Ela aparece na abertura, numa cena grande e no fechamento.
  Repetir o mesmo símbolo (linha, régua, luz) em toda seção para "costurar" deixa o site sem nexo.
- **Cenas grandes diferentes entre si**: se há duas presas, não usar a mesma família nas duas; nunca 3 presas
  seguidas; entre duas presas, um trecho que rola livre. Anotar a permanência (telas presas) de cada cena.
- Pelo menos 1 cena de "3D/WebGL", "Imagem" ou "Ilustração viva" quando o nicho permitir (LP-11).
- Dois sites seguidos da fábrica não repetem a mesma cena grande de abertura.
- Movimento contínuo (troca de palavra, faixa, respiração) para fora da tela e tem como pausar (WCAG 2.2.2).

## Celular equivalente
A mesma ideia em escala menor: câmera mais perto, menos partículas, `dpr` limitado, pin mais curto, cursor
vira toque. Só vira versão diferente se a medição (`lp-revisao`, rolagem a 60 fps em celular médio) mostrar travamento.

## Consultoras de interface (não de cena)
`emil-design-eng`, `find-animation-opportunities` e `review-animations` pregam contenção para **aplicativos**
(atalhos, menus, formulários). Elas valem para os controles da página e para o padrão discreto das seções de
leitura; não decidem quais cenas grandes o site tem.
