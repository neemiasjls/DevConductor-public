# Problemas do kit achados na prova v2

Cada item: o que aconteceu, e se já foi corrigido no kit ou ficou para depois.

## Corrigidos no kit nesta prova
1. **Portão do celular acusava trava de rolagem que não existia** (`lp-revisao/scripts/celular.mjs`). A conta de
   gestos usava o caminho inteiro do dedo, mas o navegador desconta ~15 px de folga por gesto; em página comprida
   com tela baixa (780×360 deitado) os gestos acabavam 20 px antes do fim e o item 4 reprovava. Agora a conta usa
   75% do caminho.
2. **Comparador pareava seções erradas quando a planta era a mesma** (`lp-revisao/scripts/comparar-referencia.mjs`).
   Com fundo feito de outro jeito (canvas na referência, CSS no nosso) a semelhança medida trocava seções que
   estavam no lugar certo e gerava "fora de ordem" e "imagem 91% × 0%" falsos, os dois de gravidade alta. Agora,
   com o mesmo número de seções, mesmo começo (até 0,35 tela) e mesma altura (até 0,25 tela), o par é pela ordem.
   Teste novo em `scripts/testes/comparar-referencia.test.mjs`.

## Abertos (para decidir)
3. **A construção não aplicou a pré-renderização.** A `lp-seo` tem `prerender.mjs`, mas a `lp-construcao` só cita
   "seguir a lp-seo parte D"; a página saiu com a raiz vazia (Lighthouse do celular 74–89). Com o retrato estático
   e a fonte do título adiantada foi a 91. Sugestão: pôr o pré-renderizador no `build` do modelo de projeto e o
   portão de revisão reprovar raiz vazia.
4. **`prerender.mjs` exige `puppeteer-core` no projeto**, enquanto `prints.mjs`, `celular.mjs` e `raio-x.mjs` falam
   direto com o navegador, sem dependência. Unificar.
5. **Entrada animada × retrato estático.** `gsap.from` com opacidade 0 no texto da abertura faz a página piscar
   quando já existe retrato (texto aparece, some e volta). Nesta prova a entrada é pulada quando há retrato.
   Falta regra na `lp-construcao`/`lp-cenas`.
6. **Lighthouse não tem comando no kit**: o comparador só lê o relatório. Foi rodado por `npx lighthouse@12`; e o
   servidor local sem compressão (http.server) derruba a nota em ~15 pontos. `revisao/v2/servir-gzip.mjs` serve o
   `dist/` comprimido; candidato a entrar na `lp-revisao`.
7. **`--cegas` do comparador entrega só um quadro por site** (abertura). Para nota por seção foi preciso montar à
   mão as pastas `revisao/v2/juiz/` com os prints de cada seção e letras sorteadas.
8. **`celular.json` não lista os alvos pequenos**, só três de amostra no resumo; para corrigir foi preciso deduzir
   quais eram os outros.
9. **Comparador: duração de movimento compara animação de ambiente com transição** (26 s de luz andando × 500 ms
   de entrada da referência: "lento demais"). Ruído de gravidade média em quase toda seção; separar movimento
   contínuo de fundo.
10. **Botão fixo de contato cobre legenda e aviso do rodapé**: nenhum script acusa. Resolvido na prova (encolhe
    para ícone depois da abertura e some enquanto o botão da chamada final está na tela). Candidato a item do
    portão: elemento fixo por cima de texto de leitura.
11. **SEO 63 no Lighthouse da demonstração** vem só do `noindex` proposital; o resumo deveria dizer isso para não
    parecer defeito.
12. Anotados antes: comando longo com vários heredocs falha no Bash do Windows (usar arquivo); banco aberto é
    fraco em "mãos de marceneiro em plano fechado"; miniatura do Commons só existe em larguras padrão.

## Achados de 11/11, noite
- **Retrato estático + `createRoot` derruba o LCP no celular.** O `prerender.mjs` grava o HTML pronto, mas o
  `main.tsx` monta com `createRoot().render`, que troca tudo quando o JavaScript chega: FCP 1,8 s, LCP 4,5 s,
  Lighthouse 83. Falta o kit ensinar hidratação (ou retrato que o React aproveite) e medir o LCP antes e depois.
- **`sizes="100vw"` em fundo que cobre caixa alta amplia a imagem no celular** (3,55× na abertura). Regra: fundo
  de seção tem recorte em pé para o celular (`<picture>`), ou `sizes` calculado pela altura da caixa.
- **Imagem escondida por CSS com prioridade alta é baixada mesmo assim**: duas `<img>` (uma por tela) dobram o
  peso; usar `<picture>` com `media`.
- **Entrelinha 1,12 em título de caixa alta com acento ainda colide**; o mínimo que passou foi 1,18.
- **Lição do processo:** três rodadas de juiz apontaram defeitos que `acabamento.mjs` acha em 40 segundos.

