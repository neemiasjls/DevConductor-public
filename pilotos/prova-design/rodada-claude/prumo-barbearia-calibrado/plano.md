# Prumo Barbearia — plano (demonstração, empresa fictícia)

Barbearia de corte técnico (degradê, navalhado, barba com toalha quente), endereço fictício em Curitiba/PR.
Rodada Claude (DEV-36). Tom firme, ousado sem caricatura (LP-11). Estilo `tecnologico-escuro`.
Contatos e preços demonstrativos, marcados como tal; página com `noindex`.

## Ideia central
**Degradê é medida.** Um bom degradê é uma escala de milímetros bem distribuída: pente 0 na nuca, 0,5, 1, 2,
3… até a tesoura no alto. O fio condutor é **a régua de milímetros**: aparece como escala ao lado da cadeira,
mede o corte no clímax, organiza a tabela de serviços (tempo em minutos) e termina no botão. Toda cena
responde: "qual medida o barbeiro está ajustando aqui?".

Diferença em relação à Barbearia Seco (rodada Codex): lá eram cartaz de rua, P&B, amarelo, tipo gigante e
quinas; aqui é precisão de oficina premium, fundo escuro tingido, luz pontual, dado tabular e um objeto 3D
real. Sem palavra gigante, sem faixa inclinada, sem pilha de fotos.

## Identidade
- Estilo `tecnologico-escuro`: painel preciso, fundo escuro tingido, monoespaçada nos dados, uma luz de cor.
- Fontes (sugestão; `lp-tipografia`): título Funnel Display ou Bespoke Sans 500–600, sem caixa-alta;
  texto Golos Text ou Commissioner; dados em algarismos tabulares (ou monoespaçada de autor fora das 120 mais usadas).
- Cores (OKLCH, ajustar com `lp-paleta`): fundo grafite esverdeado ≈ `0.16 0.015 170`; superfície +0,04 L;
  texto ≈ `0.94 0.01 170`; acento cobre/ferrugem quente da cadeira ≈ `0.74 0.12 55` (luz pontual, régua ativa,
  botão). Uma única seção clara no meio. Proibido neon, roxo, vidro, preto puro.
- 3D: **modelo real `BarberShopChair_01` (Poly Haven, CC0)** com HDRI de interior do Poly Haven (CC0),
  otimizado (gltf-transform, texturas WebP, alvo ≤ 2,5 MB computador / ≤ 1,5 MB celular), pôster renderizado
  do próprio modelo para carga e reduzido.
- Fotografia: 3–4 fotos reais de degradê/barba com licença aberta (Commons), mesmo tratamento: frias, escuras,
  luz lateral quente. Créditos no rodapé.
- Escala: título da abertura ≤ 6,5vw no computador (máx. ~96px), ≤ 10,5vw no celular.

## Roteiro de movimento (uma técnica por seção; famílias diferentes em vizinhas)
| # | Seção | Técnica (família) | Motivo ligado ao negócio | Permanência | Costura para a próxima |
|---|---|---|---|---|---|
| 0 | Abertura | `modelo-3d-real` (3D/WebGL): a cadeira real sob luz pontual gira devagar antes do scroll (gancho); título entra no carregamento por linha, legível sem o 3D | o lugar do serviço, sem caricatura | livre (o canvas continua na próxima) | o mesmo canvas segue |
| 1 | A cadeira | `camera-vira`/órbita guiada (Espaço), presa: câmera dá meia volta e sobe; a cadeira reclina; legendas técnicas com fio aparecem nas etapas (altura regulada, encosto reclina, apoio de cabeça, toalha quente) e a **régua de milímetros** surge ao lado | mostrar o cuidado do atendimento como ficha técnica | presa 1,8 telas (1,4 no celular) | `secao-cobre-cena`: a próxima sobe por cima |
| 2 | Manifesto | tipografia variável que engrossa com a rolagem (Texto): "Cada milímetro tem um motivo." | a precisão como promessa | livre | régua desce pela borda |
| 3 | O degradê medido (clímax) | máscara + marcador (Imagem): foto real de degradê em coluna; um marcador desce a régua 0 → 0,5 → 1 → 2 → 3 → tesoura e, em cada medida, uma faixa da foto acende (resto escurecido) com legenda do pente | o cliente entende o que pede quando diz "degradê no 1" | presa 2 telas (1,5 no celular) | a régua vira a coluna de minutos da tabela |
| 4 | Serviços | ficha técnica com cursor/toque (Interação): linhas da tabela (corte, degradê, barba toalha quente, pezinho, combo) reagem; ao focar, a duração conta em minutos e o WhatsApp leva mensagem do serviço. Seção clara única do site | escolher o serviço com preço e tempo claros | livre | cor escura invade de volta |
| 5 | Horários | grade de horários da semana desenhada por linhas (Ilustração viva, `linha-desenhada`): as faixas abertas se desenham; o dia atual destacado | quando ir, sem formulário | livre | — |
| 6 | Agendar + rodapé | botão magnético + WhatsApp que pulsa uma vez; a régua termina em "0 mm de espera" (texto demonstrativo) (Interação) | agendar; rodapé completo e créditos | livre | — |

Famílias: 3D/WebGL, Espaço, Texto, Imagem, Interação, Ilustração viva (≥ 4). Cenas grandes: 0–1 (3D) e 3
(degradê). Entre as duas presas há a seção 2 livre. Nunca 3 presas seguidas.

## Calibração desde o início (lições da rodada Codex)
- Títulos contidos (limites acima); números e legendas pequenos, tabulares.
- Ciclos: só o giro lento da cadeira na abertura, com pausa, parado fora da tela/aba e no reduzido.
- Permanência presa total ≈ 3,8 telas no computador; percurso total ~10–12 telas.
- Fotos com um tratamento só; a régua é a ideia central e nenhuma cena compete com ela.

## Celular e reduzido
- Celular: mesma cena 3D com câmera mais perto, `dpr` [1, 1.5], pin mais curto; régua vertical mantida.
- Reduzido: pôster do modelo, legendas da cadeira em lista, foto do degradê com todas as faixas legendadas,
  nada preso ou escondido. Troca dinâmica recria/destroi cenas e Lenis.
- WebGL/GLB indisponível: pôster com as mesmas legendas.

## A definir (empresa fictícia)
Barbeiros, anos, avaliações, número de clientes: nenhum entra como fato. Preços marcados como demonstração.

## Desvios na construção
- **A cadeira não reclina.** O `BarberShopChair_01` é uma malha única; cortar o encosto ficaria falso (LP-11).
  No lugar, ela gira na coluna e a legenda "encosto" explica a inclinação.
- **O marcador da régua sobe** (da nuca ao alto da cabeça) em vez de descer; segue a âncora da legenda ativa.
- **Vista final da cadeira de trás e do alto** (pose `barbeiro`, az 2.72 / el 0.62). Ainda pede olhar humano.
- **Fontes:** texto em Commissioner (Golos já está no Estúdio Coral) e dados em Martian Mono.
- **Serviços com fotos** que trocam por serviço (tesoura, máquina, navalha); hover só destaca, a linha abre
  por clique/foco (expandir no hover durante a rolagem gerava CLS).
- **Celular** com a mesma cena 3D, `dpr` [1, 1.5], GLB 1k e HDR 256 (como previsto).
- **Foto do clímax trocada (revisão de 03/11):** a Mid-fade 07 mostrava o rosto de perfil e as faixas caíam
  na testa e na mandíbula. Agora é "Fade Hair Cut" (Truth678, CC BY-SA 4.0): lateral e nuca com a transição
  inteira à mostra. Cada faixa é uma máscara com bordas esfumadas limitada ao cabelo daquela altura
  (`degrade.faixas` com topo/base/esq/dir), conferida etapa a etapa nos prints. Recorte de 750 px nativos
  (fica um pouco macia em tela 2x no computador).
- **Clímax só preso com altura ≥ 600 px.** Abaixo disso (celular deitado, zoom alto) o degradê fica parado
  como no reduzido, com as seis medidas em lista (variantes `cena:`/`estatico:` no CSS). A foto cabe na
  largura e na altura (contêiner de tamanho), sempre na proporção do arquivo.
- **Sem foto:** o degradê perde o percurso preso e mostra a lista das medidas. **Sem 3D:** pôster com a ficha
  técnica; a régua (que depende da projeção) só aparece com o 3D pronto.
- **Canvas:** contínuo só durante o giro, na tela e com a aba visível; depois, sob demanda na rolagem.
- **Troca de movimento reduzido** devolve o foco ao "agendar" equivalente; as molas do botão magnético
  voltam ao centro na hora.
- **Rodapé:** horário gerado das mesmas faixas da grade (sábado 8h–13h e 14h–18h).
- Fotos do Commons dos derivados de 1920 px quando o original respondeu 429.
- **Página com ~9 telas** no computador (o plano previa 10–12); permanência presa 3,8 telas (1,8 + 2).
- **Hero some antes da cena:** quem volta com Shift+Tab pula os botões escondidos do hero; o cabeçalho mantém
  "Agendar" sempre focável.

## Testes
- `npm run build`: sai 0 (tsc + vite). Entrada ~152 KB gzip; cena 3D em chunk separado (~269 KB gzip,
  aviso de chunk > 500 KB esperado, carregado só depois do primeiro gesto ou de ~3 s ociosos).
- `revisar-pagina`: `revisao/rodada-4` 12/12 (antes: rodada-3 12/12; rodada-1 tinha 5 falhas no reduzido).
- `ferramentas/comportamento.mjs`: `revisao/comportamento-14` aprovado nos 14 cenários. Cobre: Enter no
  salto e Tab ao primeiro botão; teclado completo (390: 33 paradas de ida e 26 de volta; 1440: 37 e 30), foco
  sempre visível e na frente; pausa/retomada; laço do canvas (always girando → demand depois do giro → never
  fora da tela e com a aba oculta); troca de reduzido com o foco na pausa (vai ao "agendar") e no meio do
  degradê (ida e volta, scrub refeito); redimensionar 1440 → 390×844 → 844×390 (lista) → 1280×720 → 1440;
  5 ciclos normal/reduzido (1 canvas; memória JS após GC +13% do 2º ao 5º ciclo, com incrementos caindo);
  GLB/HDR bloqueados e sem WebGL com as 4 legendas legíveis e régua oculta; fotos bloqueadas com as 6 medidas
  visíveis e sem percurso preso. CLS por janela 0,0015 (390) e 0,0001 (1440).
- `ferramentas/degrade-telas.mjs`: `revisao/degrade-telas-4` aprovado em 12 telas (320×568 a 1920×1080,
  paisagem 844×390 e 640×400) × 4 etapas: proporção exata da foto, nada fora da seção, sem sobreposição.
- `assets.json` validado por `lp-assets/scripts/validar-assets.mjs --gravar` (aprovado; `assets.md` e
  `assets-relatorio.json`). Peso da cena 3D: computador 1,86 MB, celular 0,81 MB (com Draco).
- Lint taste-skill (antes da revisão): 17 FAIL justificados (scrims, fios da régua/grade/tabela) e 1 WARN.
- `responsivo.mjs` (antes da revisão): restam o link de dia com 41×44 px em 360 px e rótulos mono de 11–12 px.
- Prints de conferência: `revisao/olhar-1` a `olhar-5`, `revisao/degrade-telas-1` a `-4`.
- Limites: testes headless com SwiftShader (não medem fluidez); falta aparelho físico, vídeos e Lighthouse.
  Edge em atualização (03/11) quebrou o puppeteer; as rodadas finais usaram o Chrome (`BROWSER_EXECUTABLE`).

## Refeito pela LP-12 / DEV-42 (04/11/2026, à noite)
Retorno do Neemias (DEV-41): o degradê era "legal, mas confuso". A cena foi **calibrada, não cortada** (a foto real
é o serviço). Saíram a régua de milímetros, os 6 números, o bloco de medida que trocava a cada pente e a frase final.
Ficou um gesto só: uma linha cobre sobe da nuca ao alto, como a máquina, e a foto acende por onde ela passa; três
marcas ao lado (pente 0, pente 1, tesoura) acendem quando a linha chega. Título + um apoio. Reduzido/tela baixa: foto
inteira acesa e as três marcas; foto indisponível: a lista das três marcas.

| Efeito | Fato do negócio | Entende sem legenda? | Decisão |
|---|---|---|---|
| Linha que sobe e acende a foto | o degradê é feito de baixo para cima, sem degrau | sim, depois do ajuste da leitura às cegas (começo menos escuro, marcas ligadas à foto) | fica |
| Régua de mm + 6 números + medida que troca | — (aula de pente) | não | saiu |

Densidade da cena (palavras na tela mais cheia, computador/celular): antes 59/52, depois 45/45 (limite 60/45).
Testes: `revisao/comportamento-novo-1` aprovado (14 cenários; teste adaptado à linha `--linha` e às 3 marcas),
`revisao/degrade-telas-6` aprovado em 12 telas. Lighthouse: ver `docs/auditoria-design-clareza.md` ("Prova da LP-12").
Fora do escopo, ainda acima do limite: Manifesto no celular (71) e Serviços (95/79, seção de leitura sem `data-leitura`).

## Segunda rodada da LP-12 (05/11/2026)
Calibrado, sem mexer nas cenas: o apoio do Manifesto repetia a escala de pentes que o degradê mostra logo depois e
virou uma frase ("Quando a medida está certa, a transição some."). Serviços e Horários levam `data-leitura` (são
seções de leitura); o crédito das fotos saiu de Serviços (fica no rodapé, com a licença).
Densidade (computador/celular): 95/79 → 44/44. Comportamento `revisao/comportamento-r2-1` aprovado. Lighthouse
celular (3 rodadas intercaladas, médias): nota 99 → 99, TBT 108 → 108 ms, CLS 0. No reduzido a abertura mostra as
4 legendas da cadeira juntas (123/66): é a versão estática da cena, em lista, e não mudou nesta rodada.

## Fechamento da régua por meia tela (06/11/2026)

Ficha técnica do ramo estático explicitamente classificada como leitura: título, explicação e quatro
legendas permanecem completos. O ramo animado continua sem essa marca; nenhum texto ou cena alterado.
Build aprovado. Densidade esquema 2: normal 44/44; reduzido 40/44; sem alertas e sem exceções.
A diferença no reduzido é classificação de conteúdo de leitura, não remoção de conteúdo.
Teste em 390/1440 confirmou normal → reduzido → normal e preservação dos quatro itens.
Relatórios em `revisao/densidade-06-11-final/`. Vídeos e Lighthouse anteriores não foram repetidos;
avaliação visual e teste físico permanecem abertos.

## Calibragem de 09/11

**Fotos.** Trocadas: a foto do degradê (Truth678) não mostrava degradê e saiu; no lugar, ilustração própria
(`ferramentas/gerar-degrade.py`, cabelo cheio → degradê sob a linha, ponto claro do redemoinho corrigido). Navalha e
máquina (Mostafameraji) trocadas por Nick Demou/StockSnap (CC0) e rawpixel (CC0), mais nítidas e na mesma luz de
oficina. Mantida: tesoura (Mostafameraji, CC BY-SA 4.0), mãos nítidas; rosto reconhecível, por isso "Fotos
ilustrativas" em serviços. Cadeira 3D Poly Haven intacta. Tudo conferido a 100% no recorte; `assets.json` versao:2.

| Seção | Prende o olhar? | Convence mais que o site vazio? |
|---|---|---|
| Abertura + cadeira | Sim, 3D gira e a ficha mostra uma peça por vez | Sim |
| Manifesto | Pouco, só frase | Médio: ponte para o degradê |
| Degradê | Sim, a linha sobe e o cabelo vira pele | Sim, mostra o que é "degradê no 1" |
| Serviços | Médio, tabela clara com foto | Sim, preço e tempo juntos |
| Horários | Médio | Sim; no celular só a lista |
| Agendar | Pouco, botão e uma linha | Sim, horário e endereço sem rolar |

**Desvios.** StockSnap barrou o original da navalha (403 anti-robô, não contornado): publicada a 960 px
(mínimo de apoio é 800). O `prints.mjs` mirava `#cadeira` (palco preso) e o print saía igual à abertura: agora rola
dentro de `.percurso-cadeira`. O print "cadeira" do antes continua preso na abertura (5203 não refeito).

**Portões (código de saída).** build 0 · densidade normal 0 (43/42) · reduzido 0 (35/44) · revisar-pagina 0 (12/12) ·
responsivo 1 (só "atenção": rótulos de 10–12 px, já no original) · lint 1 (18 FAIL de degradê de luz/véu e linhas
finas de régua/tabela; o original tem 19) · comportamento 0 (14 cenários) · degrade-telas 0 · validar-assets 0.
