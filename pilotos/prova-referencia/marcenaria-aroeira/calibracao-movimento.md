# Calibração do raio-x de movimento (Parte 6)

Plano: `docs/planos/2026-11-11-copia-fiel-da-referencia.md`, Parte 6. Saídas dos sites ficam fora do git
(`referencia/for-living/` e `pilotos/referencias-galeria/referencias/arquitetura/raio-x/era-residence.com/`).
Este arquivo tem só texto nosso: números de item, contagens e causas. Nenhum texto, imagem ou código dos sites.

Situação só pode ser `automatico-conferido` (a máquina achou e a folha de quadros foi aberta e confere alvo,
gatilho e o que muda), `manual` (posto à mão, com a causa) ou `nao-coberto` (com causa e limite).

## Rodadas no for-living (12/11)

| Rodada | Saída | Tempo | Computador | Celular | Observação |
|---|---|---|---|---|---|
| 1 | celular caiu | 345 s (computador) | 110 itens, 3 páginas, 63 não medidos | navegação sem resposta em 60 s | antes da trava nova e do conserto do celular |
| 2 | 0 | 1185 s | 121 itens, 1 página (tempo máximo de 600 s estourou em 689 s) | 155 itens, 272 s | 42 itens falsos de rolagem (página inteira andando); rodada cortada aposentou 51 números |
| 3 | 0 | 1089 s | 110 itens, 3 páginas, rodada completa | 128 itens, rodada completa | numeração da rodada 1 restaurada antes; `--tempo-max 1200` |

Tempo por etapa na rodada 3, computador, página inicial: carregar 5,7 s; parado 126 s; rolagem 217 s; código 5,4 s;
mouse 163 s; clique 25 s. Páginas internas: 34 a 76 s cada. Celular, página inicial: carregar 8,4 s; parado 38 s;
rolagem 86 s; código 2 s; toque 41 s; clique 24 s. O padrão de 600 s não cabe neste site com 2 páginas internas:
fica anotado, o padrão não mudou.

## Os 13 comportamentos do vídeo do dono (for-living, rodada 3)

| # | Comportamento | Itens | Fontes | Situação | Evidência / causa |
|---|---|---|---|---|---|
| 1 | Fundo vivo da abertura e do bege | M117 (canvas, seção 2) | shader | nao-coberto (manual não tentado) | O item é genérico ("canvas muda"), sem alvo certo: não conta. As animações vetoriais vêm de um servidor de arquivos cujo robots.txt proíbe a leitura: barradas, sem contornar. |
| 2 | Abertura presa: título escurece e desfoca, 3 cartões sobem em escada | M12 (opacidade + desfoque), M09 a M11 (posição vertical) | amostra, código GSAP | automatico-conferido | Folhas M12 e M09: título apaga e desfoca, os três cartões sobem defasados. |
| 3 | Cartão com mouse: o nome abre dos lados do rótulo | M58, M59, M60 | só CSS | nao-coberto (manual não tentado) | Achado só na leitura das folhas de estilo, sem medida ao vivo nem folha de quadros; de/para em posição sem número (M58 a M60 seguem sem extremos). |
| 4 | Seção bege sobe por cima da escura, como cortina | nenhum | — | nao-coberto (manual não tentado) | Aparece no último quadro da folha M12, mas não virou item. Causa não confirmada: a rodada 1, antes do conserto da rolagem que desconta a página inteira mudando de lugar, também não achou. |
| 5 | Mapa com pontos pulsando | M65 a M70 (mouse no mapa) | amostra, CSS | nao-coberto (manual não tentado) | Os itens são a ficha que aparece com o mouse, não o pulso. O pulso é animação vetorial barrada pelo robots.txt do servidor de arquivos. |
| 6 | Galeria lateral: foto sob o mouse alarga e mostra o nome | M71 (desloca), M52 (largura), M53 a M55 (nome aparece) | amostra, CSS | automatico-conferido | Folha M71: a foto sob o ponteiro alarga, as vizinhas cedem e o nome aparece. |
| 7 | Troca de página com tela escura que cobre e descobre | M76 (e M75) | quadros da navegação | automatico-conferido | Folha M76: a página escurece por inteiro e a página de destino surge do escuro. |
| 8 | Página de projeto: título sobre foto desfocada, grade com paralaxe, painel do próximo projeto preso | M80 a M83 (página interna 1) | código GSAP | nao-coberto (manual não tentado) | Parcial: entrada do texto e troca de fundo achadas; paralaxe da grade e painel preso à direita não viraram item. M81 e M82 seguem sem extremos (valor dado por função). |
| 9 | Degraus entrando em diagonal com luz que anda no fundo | M18 a M21 (texto), M28 a M31 (números), M32 a M37 (linhas) | amostra, código GSAP | automatico-conferido | Folha M18: os degraus entram em diagonal, um depois do outro. A luz que anda no fundo não virou item separado. |
| 10 | Chamada final: texto entra desfocado sobre mármore | nenhum (M116 e M64 são o botão) | — | nao-coberto (manual não tentado) | Nenhum item com desfoque na seção 6. |
| 11 | Rodapé com a marca gigante subindo | M22 (texto do rodapé) | amostra | nao-coberto (manual não tentado) | O item é um texto do rodapé, não a marca. |
| 12 | Cabeçalho em cápsula some ao descer e volta ao subir | M05, M06 (página inicial), M84, M85, M99, M100 (internas) | só CSS | nao-coberto (manual não tentado) | A etapa "cabeçalho" rodou completa nas 3 páginas, mas sem item: o leitor não vê o cabeçalho sumir. Achado só no CSS, sem folha. |
| 13 | Texto que se desfaz em blocos na troca de idioma | nenhum | — | nao-coberto (manual não tentado) | A troca de idioma leva a outro endereço; o raio-x só passa o mouse no seletor de idioma (M57), não clica nele. |

**Resultado: 4 `automatico-conferido` (2, 6, 7, 9), 0 `manual`, 9 sem item conferido. Nenhum dos 9 foi tentado
à mão (`movimento-manual.json` / `acoes-manuais.json`): pela definição do plano ainda não são `nao-coberto`; a
marca "manual não tentado" diz isso. Meta (10) não atingida: tabela devolvida à regente.** A tabela foi feita
só no for-living (os 13 vêm do vídeo dele); no era-residence a régua é o inventário válido.

## Respostas às 5 perguntas (números)

1. **Rodada limpa por URL do comparador:** funciona. O teste do comparador sobe um site local, o filho mede o
   nosso lado e os pares saem pelo `data-mov`: 7 pares de 8, saída 2 coerente, com os motivos do coletor.
2. **O inventário do for-living enxerga os 13?** Conferidos 4 de 13. Outros 3 têm itens que não
   batem por inteiro (3, 8 e 12: só CSS ou parcial). Os 6 restantes ficam sem item ou com item genérico.
3. **Itens sem de/para (extremos que pedem número):** rodada 1: 26 de 110. Rodada 3: 3 de 110 no computador
   (M03, M81, M82) e 2 de 128 no celular, depois da leitura da caixa do alvo (68 itens com caixa no computador).
4. **Escolhas a calibrar:** pesos do alinhamento de números mantidos (59 números mantidos, nenhum par errado na
   rodada 2; o texto do alvo deixou de ser chave de grupo por causa do carrossel). Limite de escala zero não foi
   exercitado (o site só usa escala 1 e 1,1). Limite de tamanho zero de 1 px confirmado nas linhas de 1 px.
   Tolerâncias de um lado só: sem caso numérico (14 de 19 itens com um lado só são estado de mouse só com o
   "para"). Variantes: 41 itens do celular herdaram o número do computador na rodada 2.
5. **Leitores Webflow, Lenis, Swiper no site real:** Webflow não devolveu dados de interação nas 3 páginas
   (anotado em não medidos). Lenis lido e gravado por página (opções da rolagem suave). Swiper lido; o carrossel
   que anda sozinho foi reconhecido e descontado da rolagem.

## Não medidos (rodada 3)

Computador: 58 (24 robots.txt, 18 envio barrado, 16 que pesam). Celular: 25 (6 robots.txt, 5 envio barrado,
14 que pesam). O inventário guarda só o caminho do pedido barrado, não o servidor.

Grupos que não pesam (afetaMedida falso), uma linha por grupo:
- **robots.txt de outro servidor** (30 no total): animações vetoriais e arquivos de terceiros proibidos pelo
  robots.txt daquele servidor. Não contornar. Efeito: comportamentos 1 e 5.
- **envio de estatística barrado** (13 no total, caminho de coleta do Google): a página é medida sem eles; não
  mudam movimento.
- **envio para `/api/v1/log`** (10 no total): servidor não gravado no inventário, não reconhecido como
  estatística. Pela regra da regente, conta como os que pesam (abaixo).

Grupos que pesam (NÃO resolvidos: nenhum tem linha em `resolvidos`; critério "nenhum não medido sem resolução"
não cumprido):
- os 10 envios para `/api/v1/log` (acima);
- leitura de código parcial: limite de anotações do gancho (36 no computador, 150 no celular), Webflow sem
  dados (3 páginas), shaders além do limite de 8 (24), animações CSS e GSAP com propriedade fora do contrato;
- mouse ou toque que não chega ao alvo: grupos da galeria cobertos por outro elemento (5 + 4), canvas coberto
  (2), rótulo de formulário (1), toque cujo ponto cai num link (3);
- mouse cuja entrada ou saída não parou em 1,5 s (galeria, 2);
- celular: 2 cliques em que a página não trocou em 4 s.

## era-residence (12–13/11, uma rodada)

Saída 0 em 2254 s (`--tambem-celular --movimento --tempo-max 1200`). Sem bloqueio nem página de desafio; nenhum
pedido de escrita passou (8 no computador e 15 no celular derrubados, todos para caminhos de coleta do Google:
`/g/collect`, `/ccm/collect`). Os 13 comportamentos
são do vídeo do for-living e não se aplicam aqui: a régua do era-residence é o inventário válido.

| Aparelho | Rodada | Itens | Páginas | Mouse/toque | Cabeçalho | Tempo por etapa (página inicial) |
|---|---|---|---|---|---|---|
| Computador | **incompleta** (tempo máximo esgotado) | 248 (235 de rolagem) | só a inicial | não rodou | não rodou | carregar 6 s; parado 92 s; rolagem 947 s; código, mouse, cabeçalho e clique sem tempo |
| Celular | completa | 1142 | inicial + 1 interna | toque parcial | completa | carregar 8 s; parado 69 s; rolagem 171 s; código 1,6 s; toque 57 s; clique 11 s |

Situação: **inventário válido não atingido no computador** (sem mouse, sem cabeçalho, sem página interna). Não é
bloqueio do site; são dois defeitos do raio-x, para a regente decidir (as 2 voltas de correção da Parte 6 já foram
gastas no for-living):
- **rolagem do computador:** a subida travou em 4135 px e não voltou ao topo; a etapa sozinha passou de 15 minutos
  e comeu o tempo das outras. 7 avisos de "página inteira mudou de lugar" e 7 de carrossel descontados.
- **itens inflados no celular:** 309 itens de "carregar, gira" e 154 de "rolagem, gira" lidos do código GSAP (919
  dos 1142 itens vêm do código). Cada elemento repetido de uma mesma animação vira um item; o leitor do código não
  junta elementos iguais. O código tem cerca de 39 mil animações anotadas (limite de 500 guardadas).

Não medidos que pesam: computador 6 (as 4 etapas que não rodaram e 2 da rolagem travada); celular 15 (leitura de
código parcial: propriedade fora do contrato, limite de anotações, Webflow sem dados; toque que cai num link ou em
grupo coberto; 2 cliques).

## Limites desta calibração

- As rodadas reais rodaram antes dos consertos pedidos na revisão do Codex e na de segurança (causa permanente,
  `fixed` dentro de `transform`, rotas novas, endereço entre crases). A regra nova da rodada incompleta, aplicada
  aos 4 inventários salvos, dá o mesmo resultado (for-living completo nos dois aparelhos; era-residence:
  computador incompleto, celular completo). As medidas não foram refeitas.
- "Resposta 404/5xx = lacuna comum" está só na regra e no teste (frase "status 404"): nenhum ponto do coletor
  escreve hoje um motivo com o status da página interna além de 401/403/429.
