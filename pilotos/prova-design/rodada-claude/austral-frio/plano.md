# Austral Frio — plano (demonstração, empresa fictícia)

Transportadora de carga refrigerada (congelados, resfriados e climatizados), base fictícia em Chapecó/SC,
rotas para PR, SP e RJ. Rodada Claude (DEV-36). Tom sério e contido (LP-11). Estilo `editorial-serio`.
Contatos, números e prazos são demonstrativos e aparecem como tal; página com `noindex`.

## Ideia central
**A temperatura é a carga.** Quem contrata frete refrigerado não compra quilômetro: compra a garantia de
que −18 °C continua −18 °C do pátio ao cliente. O fio condutor do site é **a linha do registrador de
temperatura** (o "data logger" do baú): ela nasce na abertura, vira o eixo da viagem no clímax, separa as
faixas de serviço e termina no botão de cotação. Toda cena responde: "o que acontece com a temperatura aqui?".

Diferença em relação à Lastro (rodada Codex): lá a protagonista é a carga em 3D e a rota; aqui é um dado
invisível (a temperatura), mostrado como gráfico técnico. Sem caminhão em código, sem caixote, sem 3D de objeto.

## Identidade
- Estilo `editorial-serio`: relatório técnico bem feito, fios finos, ficha técnica, um único destaque.
- Fontes (sugestão; trocar só dentro do papel, `lp-tipografia`): título serifado sóbrio (Besley ou Petrona),
  texto Red Hat Text ou Funnel Sans com algarismos tabulares. Títulos sem caixa-alta, peso 500–600.
- Cores (OKLCH, ajustar com `lp-paleta` a partir das fotos): grafite azulado frio ≈ `0.24 0.02 245`; gelo
  ≈ `0.97 0.006 230`; cinza-aço para fios ≈ `0.6 0.015 240`; **um** destaque: azul-gelo vivo ≈ `0.74 0.11 225`
  (linha de temperatura, valor atual, botão). Nada de âmbar/laranja (era a Lastro).
- Fotografia: 3–4 fotos reais com licença aberta (Commons: baú refrigerado/reefer, câmara fria, doca,
  estrada no inverno). **Um tratamento só**: frio, baixa saturação, sombras azuladas, mesmo recorte largo.
- Escala: título da abertura ≤ 7,5vw no computador (máx. ~104px) e ≤ 11vw no celular. Nada de palavra gigante
  atravessando a tela.

## Roteiro de movimento (uma técnica por seção; famílias diferentes em vizinhas)
| # | Seção | Técnica (família) | Motivo ligado ao negócio | Permanência | Costura para a próxima |
|---|---|---|---|---|---|
| 0 | Abertura | linha desenhada ao vivo (Ilustração viva): o traço do registrador se desenha no carregamento e segue oscilando dentro da faixa −18,4…−17,6 °C; leitura atual em algarismos tabulares. Ciclo contínuo **com botão de pausa**, parado fora da tela | prova de controle antes do primeiro scroll | livre (0) | a linha desce e vira a borda superior da foto seguinte |
| 1 | Porta do baú | shader de geada sobre foto (3D/WebGL, `distorcao-imagem` adaptada): a foto do interior refrigerado começa embaçada/congelada e "descongela" em faixa conforme a rolagem; cursor/toque limpa um círculo | abrir o baú sem quebrar o frio: só a imagem descongela, a temperatura não muda | presa curta, 1 tela (0,8 no celular) | seção seguinte cobre a cena (`secao-cobre-cena`) |
| 2 | Compromisso | `texto-revelado` (Texto): "Coletamos frio. Viajamos frio. Entregamos frio." palavra por palavra | o serviço em três verbos, sem número inventado | livre | fundo gelo → grafite por cortina curta |
| 3 | A viagem (clímax) | cena presa com etapas (Espaço + dados): eixo horizontal de 0 a 36 h; conforme a rolagem, o gráfico de temperatura avança e marcos acendem (coleta, pré-resfriamento, pedágio, parada do motorista, porta aberta na entrega com subida de 1,2 °C que volta); mini-mapa Chapecó → Curitiba → São Paulo acompanha o mesmo progresso. Celular: mesmo gráfico com eixo vertical | mostra o que o cliente nunca vê: a temperatura durante a viagem inteira | presa 2,2 telas (1,6 no celular) | o gráfico encolhe e vira o fio de topo dos serviços |
| 4 | Faixas de temperatura | cor que invade + interação (Interação): três faixas (congelado −18 °C, resfriado 0 a 4 °C, climatizado 15 a 25 °C); ao focar/tocar/passar, o fundo da seção muda de temperatura de cor e a ficha técnica (produtos, baú, registrador) troca | escolher o serviço pela temperatura da carga | livre | foto entra pela borda |
| 5 | Pátio e doca | `foto-abre` (Imagem): foto real de doca/câmara fria abre de uma janela estreita até a largura do conteúdo (não tela cheia no celular vertical) | mostrar a estrutura sem depoimento falso | presa curta 0,9 tela (0,7 celular) | fio fino desce |
| 6 | Como cotar | lista com fios que crescem da esquerda (Dados e prova): 4 passos (origem/destino, tipo e temperatura, volume, janela de entrega) com contador "a definir" restilizado | reduzir o atrito da cotação | livre | — |
| 7 | Contato + rodapé | botão magnético (só com mouse) + WhatsApp que pulsa uma vez (Interação): a linha de temperatura termina dentro do botão | pedir cotação; rodapé completo (WhatsApp, telefone, e-mail, endereço, horários, mapa estático, créditos) | livre | — |

Famílias: Ilustração viva, 3D/WebGL, Texto, Espaço/dados, Interação, Imagem, Dados e prova (≥ 4).
Cenas grandes: 1 (geada) e 3 (viagem); 5 é passagem curta. **Nunca 3 presas seguidas**: entre 1 e 3 há o
texto livre (2); entre 3 e 5 há a seção livre 4. Mesmo efeito de entrada em no máximo 2 seções.

## Calibração desde o início (lições da rodada Codex)
- Títulos sem escala exagerada (limites acima); hierarquia: um título por seção, ficha técnica pequena.
- Ciclos automáticos: só a linha da abertura; pausa visível, para fora da tela/aba, desligada no reduzido.
- Permanência total presa ≈ 4 telas no computador; o percurso inteiro deve caber em ~10–12 telas.
- Fotografia coesa: mesmo tratamento de cor em todas.
- A ideia central (linha de temperatura) aparece em 0, 3, 4 e 7; efeito que competir com ela sai.

## Celular e reduzido
- Celular: mesma ordem e cenas; gráfico vertical, shader com `dpr` ≤ 1,5 e textura 960px, pins mais curtos.
- Reduzido: linha estática completa, foto nítida sem geada, gráfico da viagem inteiro visível com os marcos
  em lista, nada preso, nada escondido. Troca dinâmica da preferência recria/destroi cenas e Lenis.
- WebGL indisponível ou foto não carregada: a foto (ou fundo gelo com legenda) aparece sem geada.

## A definir (empresa fictícia)
Frota, anos, clientes, certificações, avaliações: nenhum número inventado entra como fato. Telefones e
WhatsApp fictícios (padrão de demonstração), marcados "demonstração".

## Desvios na construção
| O que mudou | Motivo |
|---|---|
| Geada em **WebGL puro** (`src/componentes/Geada.tsx`), sem three/R3F/drei | Um único plano de shader não precisa de cena 3D; evita ~300–450 KB gzip do runtime Three. Mesmo contrato da receita `distorcao-imagem`: foto HTML embaixo, canvas por cima, desenho só sob demanda (sem relógio), `dpr` ≤ 1,5, textura 960 px no celular, falha de WebGL/foto deixa a foto nítida. |
| Fonte de título **Petrona** (não Besley) | Mais estreita e calma no peso 560; segura três linhas sem palavra gigante. Texto em Red Hat Text com algarismos tabulares, como no plano. |
| Título da abertura em `min(6vw, 5,6rem)` (≈86 px a 1440) e ≤ 3,3rem no celular | Primeira medida (7,2vw) jogava o gráfico para baixo da dobra; a linha do registrador é a protagonista e precisa aparecer no primeiro quadro. |
| Porta do baú: palco fixo por **1,8 telas** (1,6 no celular) = 0,8 de degelo (0,6) **+ 1 tela de cobertura**, em que o Compromisso sobe por cima | A cobertura (`secao-cobre-cena`) precisa do palco parado enquanto o cartão sobe. Na conta de ritmo entram as duas parcelas, separadas (ver "Testes"). |
| Viagem: 2,2 telas (1,6 no celular), das quais 93% avançam as horas e 7% achatam o gráfico em fio | A primeira versão (86%/14%) deixava quase uma tela vazia de grafite; encurtada após os prints. |
| Marcos da viagem são **botões** que levam a rolagem ao momento do marco | Teclado: Tab/Shift+Tab traz o marco e a hora certa para a tela (exigência de cena presa). No reduzido viram texto comum. |
| Faixas: a cor invade a partir do botão escolhido (círculo `scale`), com hover só de mouse | "Cor que invade" literal; foco e toque fazem o mesmo; no reduzido a cor troca direto. |
| Como cotar: contador "Passo 1 de 4" sem zero à esquerda; prazo de resposta exibido como "a definir" | O detector anti-IA reprova numeração 01/02/03 decorativa; o contador continua restilizado como leitura do registrador. |
| Terceira foto (semirreboque de lado) em Como cotar, estática | Plano pedia 3–4 fotos; não compete com a linha (sem efeito próprio). Não há foto de estrada no inverno: a busca no Commons voltou 429 (limite de requisições) e as fotos de caminhão abertas tinham marca legível de empresa. |
| Fotos com marcas desfocadas (fabricante do equipamento de frio e do semirreboque) | Regra do brief: sem marca de terceiro legível. Alteração declarada no rodapé e em `creditos.md` (BY-SA mantida). |
| `assets.json` com `autorizacao: "confirmada"` | O validador exige o campo para CC BY-SA; em demonstração fictícia a `lp-assets` diz que o crédito no rodapé basta. Não é autorização de autor; é o uso permitido pela licença com crédito. Rever se virar cliente real. |

| Revisão do Codex (03/11, 10 achados, todos aceitos) | (1) gráfico da viagem reconfigurado ao trocar celular ↔ computador; (2) Geada libera programa, shaders, buffer e textura em toda saída e a sonda de WebGL perde o contexto na hora; (3) Doca com `quickSetter` (sem tween novo por quadro); (4) invasão de cor e entrada da ficha das Faixas dentro do `matchMedia`, terminando na cor final ao trocar para reduzido; (5) no celular aparecem mín./máx., as cidades do mapa (legenda em texto) e a faixa contratada da abertura; (6–9) teste de comportamento reforçado; (10) permanência e cobertura separadas. Achado na revalidação: `preload` das fontes latinas (CLS 0,26 → 0 a 768 px). |

## Testes
Servidor: `npm run preview` (127.0.0.1:5201, `--strictPort`). Chrome headless com SwiftShader.

| Teste | Resultado | Evidência |
|---|---|---|
| `npm run build` (tsc + vite) | saída 0; JS 154 KB gzip (entrada) + 15 KB gzip (Motion, separado); CSS 7 KB gzip | `dist/` (fora do git) |
| `revisar-pagina.mjs` 6 larguras × normal/reduzido | **12/12** (rodada-3; depois da revisão do Codex, rodada-4 e rodada-5). Rodada-4 deu CLS 0,26 a 768 px: a troca de fonte depois da primeira pintura refluía o título da abertura (intermitente, só com fonte fria); corrigido com `preload` dos dois arquivos `latin` no `vite.config.ts`, e a rodada-5 mediu **CLS 0 nos 12 cenários** (sonda sem cache: 0 a 390/768/1024/1440). Rodada-1 tinha 4 falhas de rolagem lateral (janela da doca com `aspect-ratio` no reduzido, gráfico com `flex-basis 0` no reduzido, área do botão magnético); corrigidas. CLS de laboratório 0–0,046 na rodada-3 e 0 na rodada-5; LCP de laboratório 0,2–2,2 s; 339 KB transferidos a 360 px na primeira carga | `revisao/rodada-1/` a `rodada-5/` (`relatorio.json`, `indice.html`) |
| `ferramentas/comportamento.mjs`, versão 1 (390 e 1440) | **aprovado**: atalho no primeiro Tab; Tab/Shift+Tab nos 5 marcos com o marco na tela e a hora sincronizada (0, 2, 8, 15, 33 h); foco troca a faixa e a ficha; pausa para e retoma o registrador; registrador parado fora da tela; rolagem real (roda) até o fim e volta ao topo com viagem em "0 h" e registrador andando; sem rolagem lateral no percurso; geada visível; troca dinâmica para reduzido (sem Lenis, sem canvas, sem pausa, nada preso, marcos acesos, frase inteira, sem margem de cobertura) e de volta; fotos bloqueadas → avisos "Foto indisponível" e sem geada; WebGL ausente → foto nítida sem canvas; zero erros | `revisao/comportamento-1/resultado.json` e prints |
| `ferramentas/comportamento.mjs`, versão 2 (360×640, 390×844, 414×736 com toque; 1440×900) | **aprovado** em `comportamento-2` e, depois do preload das fontes, em `comportamento-3`. Novos casos: Tab natural de fora (botão de pausa) até os 5 marcos, saída para as Faixas e volta inteira com Shift+Tab, foco visível em cada fronteira; geada limpa por toque mantido (celular) e cursor (computador), comparando print antes/depois com um print de controle sem interação e sem a página rolar; percurso inteiro por arraste de toque real no celular (desce e sobe); reduzido ligado **dentro de cada cena**: Porta (sem canvas, palco solto, foto visível; na volta canvas, `sticky` e Lenis), Viagem a 42% (vai a "36 h", traço inteiro, marcos acesos; na volta hora e traço de novo sincronizados), Faixas no meio da invasão de cor (cor final na hora, ficha completa), Doca (sem transform, janela na largura da figura; na volta escala de novo < 0,98); troca 1440 → 390 → 1440 com o traço reconfigurado; **zero `pageerror`** e zero HTTP ≥ 400 separados em todos os cenários, inclusive fotos bloqueadas e WebGL ausente | `revisao/comportamento-2/` e `revisao/comportamento-3/` (`resultado.json` e prints) |
| `responsivo.mjs` | todas as larguras OK (alvos de toque corrigidos: links do menu e "licença" do rodapé) | saída no terminal |
| `taste-skill/scripts/lint.mjs src` | 0 FAIL, 1 WARN (`outlined-box` no botão de contorno do topo). Exceções por linha com `taste-skill-ignore`: fios do estilo editorial-serio (eixos do gráfico, ficha técnica, marco atual, faixa escolhida, fios que crescem, fio que desce), sombra do cartão que cobre a cena e véu sobre a foto | — |
| Prints olhados (390 e 1440, topo/meio/fim) | 3 rodadas de ajuste: (1) título menor para o gráfico entrar na dobra; (2) geada trocada de "mármore" com veios por vidro fosco fino; (3) saída da viagem encurtada, faixa de temperatura do gráfico mais estreita, rótulos do mini-mapa escondidos no celular | prints de inspeção fora do repositório |

Percurso: 12,6 telas no computador e 14,1 no celular (meta 10–12; o celular empilha as colunas).
Palco preso, separado em duas parcelas:
- **Permanência** (o visitante rola e a cena muda sem andar): porta 0,8 + viagem 2,2 + doca 0,9 = **3,9 telas** no
  computador; 0,6 + 1,6 + 0,7 = **2,9** no celular.
- **Cobertura** (o Compromisso sobe por cima da porta parada): **+1 tela** nos dois. É movimento, não espera, mas o
  palco continua fixo; somando, **4,9 telas** de palco fixo no computador e **3,9** no celular. Com o percurso do
  celular já acima da meta, a cobertura é a primeira candidata a encurtar se o ritmo pesar.

**Limites:** no Chrome headless o gesto de toque sintético do CDP (`synthesizeScrollGesture`) não rola a página; o teste usa `touchscreen` do Puppeteer (toque, arraste e soltura), que rola com inércia, mas não é um aparelho físico. CLS/LCP são de laboratório (headless), não Core Web Vitals; fluidez do shader e das cenas não foi
medida em aparelho físico; aba oculta (`document.hidden`) para o registrador no código, mas o teste só cobre
a parada fora da tela. Vídeos de rolagem, Lighthouse e medição de percurso ficam com a sessão principal.

## Segunda rodada da LP-12 (05/11/2026)
Viagem **calibrada** (o registro é o objeto real do negócio): com movimento, só o marco atual mostra o texto (os
outros ficam com hora e título; opacidade, espaço reservado, sem deslocar nada); o eixo leva 4 rótulos (0/12/24/36 h);
saiu o leitor "Na viagem inteira mín/máx"; a legenda do mini-mapa ficou para leitor de tela; leitores "Hora" e
"No baú"; o parágrafo de introdução saiu (a cena mostra a rota). Textos dos marcos trazem o lugar. Porta e
Compromisso com apoio mais curto; Faixas e Cotar levam `data-leitura`.
Densidade (computador/celular): 126/112 → 53/51. A tela de 51 no celular é a entrada da cena presa, que divide espaço
com a última frase do Compromisso; lida em ~3 s (print em `revisao/densidade-r2-depois-3`), fica assim. Reduzido:
os 5 marcos com texto aparecem juntos (92/67), de propósito: é a versão completa em lista.
Comportamento `revisao/comportamento-r2-1` aprovado. Lighthouse celular (médias de 3): nota 95 → 95, TBT 115 → 121 ms
(ruído), LCP 2,80 → 2,73 s, CLS 0.

## Fechamento da régua por meia tela (06/11/2026)

Build aprovado. Densidade esquema 2: normal 53/51, sem alertas e uma exceção no cabeçalho da Viagem
(entrada junto ao Compromisso, decisão já descrita acima). A exceção cobre apenas seu texto; não libera
o resto da tela. Reduzido 44/45, sem alertas: os cinco marcos completos são lista de leitura, sem apagar conteúdo.
Apoio da Doca encurtado mantendo temperatura de chegada e aviso de estrutura demonstrativa.

Corrigidos fio da Doca inalcançável depois do `return` e instrução de geada sem interação disponível.
Comportamento em quatro larguras e regressão do fio em duas larguras aprovados. Teste da classificação de
leitura em 390/1440, com normal → reduzido → normal, também aprovado, preservando os cinco marcos.
Relatórios finais em `revisao/densidade-06-11-final/`. Vídeos e Lighthouse anteriores são históricos;
não foram regravados/recalculados para estes ajustes. Avaliação visual e teste físico permanecem abertos.
