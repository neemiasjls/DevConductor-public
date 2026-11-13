# Plano: acabamento conferido por máquina e juiz confiável (11/11)

**Problema.** Os portões de número aprovaram uma página de nota 7,6. Em quatro rodadas o juiz achou defeitos de
acabamento que foram consertados à mão na página e não voltaram para o kit. Um juiz só oscila meio ponto. Ninguém
julga movimento. O celular é pensado depois. O caminho por referência sai "adaptado".

**Objetivo.** O kit achar sozinho, antes do juiz, os defeitos que se repetiram; a nota vir de três juízes; as regras
de acabamento, movimento, celular e ideia própria entrarem nas skills. Origem: `docs/continuar.md` (bloco de 11/11,
"Pesquisa de fora") e `pilotos/prova-referencia/marcenaria-aroeira/andamento-v2.md` (listas do juiz).

## Regras para todas as partes
- Só o plugin `plugins/landing-pages/` e `scripts/testes/`. Não mexer em `~/.claude` nem em outros projetos.
- Scripts em Node puro, sem dependência nova: falar com o Chrome pelo protocolo DevTools, no padrão de
  `plugins/landing-pages/skills/lp-revisao/scripts/celular.mjs` e `prints.mjs` (ler um deles antes de escrever).
- Windows 11: caminhos com `\`, sem `&&` de PowerShell 5.1, nada de pasta presa por processo vivo (fechar o Chrome).
  Nunca rodar dois testes de navegador ao mesmo tempo: os testes novos usam página HTML local pequena e fecham o
  navegador no fim; se não houver Chrome, pulam (como os testes de `celular`).
- Teste em `scripts/testes/<nome>.test.mjs` com `node --test`; conferir o código de saída.
- Arquivo copiado ou adaptado de outro projeto: entrada em `fontes.json` (origem, caminho, commit, licença, o que
  mudou) e crédito no `NOTICE`. Só licença clara.
- Texto em português simples. Sem commit, sem push. **Não editar nenhum `SKILL.md` nas partes 1 a 4**: devolver no
  resumo o parágrafo que a parte 5 deve inserir. A versão do plugin sobe só na parte 5.
- Site para provar: http://127.0.0.1:5211/ (prova interna; já está no ar; não rodar build).

## Parte 1 — Conferência de acabamento (`acabamento.mjs`)
- Arquivos: `plugins/landing-pages/skills/lp-revisao/scripts/acabamento.mjs`, `scripts/testes/acabamento.test.mjs`.
- Uso: `node acabamento.mjs <url|arquivo.html> [pasta-saida] [--larguras 1440,390] [--json]`. Grava
  `acabamento.json` e `resumo.txt`; saída 1 se houver achado "nunca passa", 0 caso contrário, 2 em erro de uso.
- Conferências (cada achado com seletor, largura, posição da rolagem e medida):
  1. **Fixo sobre conteúdo** (nunca passa): rolar a página em passos de meia tela; para cada elemento `fixed` ou
     `sticky` visível, ver se o retângulo dele cruza texto de leitura, título ou imagem que está na tela
     (`elementsFromPoint` em pontos do bloco; ignorar o próprio elemento e fundo decorativo `aria-hidden`). Barra
     inteira encostada na borda de cima ou de baixo da tela (largura >= 95%) conta como moldura, não como cobertura.
  2. **Linhas de título colidindo** (nunca passa): em `h1–h3` e elementos em caixa alta com mais de uma linha, medir
     as linhas com `Range.getClientRects`; reprovar se a entrelinha efetiva for menor que 1,15 quando o texto tem
     maiúscula acentuada, cedilha ou Q (ÁÀÂÃÉÊÍÓÔÕÚÇQ), ou menor que 1,0 em qualquer caso.
  3. **Órfã** (exige justificativa): última linha de título ou parágrafo com uma palavra só ou menos de 20% da
     largura do bloco (bloco com 2+ linhas).
  4. **Imagem ampliada ou esticada** (nunca passa se ampliada mais de 1,5×; aviso entre 1,1× e 1,5×): tamanho
     exibido × densidade contra `naturalWidth/Height`, respeitando `object-fit`; proporção exibida diferente da
     natural em mais de 3% sem `object-fit: cover/contain` = esticada. Vale para `img` e `background-image`.
  5. **Cor desigual num grupo de fotos** (exige justificativa): fotos irmãs (mesma lista/grade, 3+) desenhadas num
     canvas 32×32 já com os filtros de CSS aplicados; média em Lab; distância entre a foto e a média do grupo > 12.
     Imagem de outra origem sem CORS: dizer "não medido", nunca aprovar calado.
  6. **Emenda de faixa em laço** (nunca passa): animação CSS infinita de `translateX` em percentual numa lista
     duplicada; conferir que o deslocamento de uma volta é múltiplo do período (largura do item + vão) com erro
     menor que 1 px.
  7. **Vão morto** (aviso): espaço vertical vazio entre blocos maior que 1,8× a mediana dos vãos da página e maior
     que 25% da altura da tela.
- Pronto quando: os testes cobrem cada conferência com uma página que tem o defeito e outra que não tem; rodado na
  prova, o resumo sai legível e sem falso positivo grosseiro (listar no resumo final o que achou).

## Parte 2 — Comparar rodadas (`rodadas.mjs`)
- Arquivos: `plugins/landing-pages/skills/lp-revisao/scripts/rodadas.mjs`, `scripts/testes/rodadas.test.mjs`.
- Uso: `node rodadas.mjs <pasta-rodada-anterior> <pasta-rodada-nova> [pasta-saida] [--lighthouse-antes a.json
  --lighthouse-depois b.json]`.
- Prints com o mesmo nome nas duas pastas: diferença por pixel feita dentro do Chrome (canvas), sem biblioteca;
  devolve a porcentagem mudada por print e grava a imagem da diferença. É informação, não reprova.
- Lighthouse: reprova (saída 1) se qualquer categoria cair mais de 3 pontos, o LCP piorar mais de 15% ou o CLS
  passar de 0,1. Sem os relatórios, diz "Lighthouse não comparado".
- Pronto quando: teste com dois PNG gerados no próprio teste e dois relatórios mínimos; rodado em
  `pilotos/prova-referencia/marcenaria-aroeira/revisao/v2/nosso-8` × `nosso-9`.

## Parte 3 — Juiz às cegas confiável
- Arquivos: `plugins/landing-pages/skills/lp-revisao/scripts/juiz.mjs`, `scripts/testes/juiz.test.mjs`,
  `plugins/landing-pages/skills/lp-revisao/referencias/juiz-as-cegas.md`.
- `juiz.mjs montar <prints-nosso> <prints-referencia> <pasta-saida> [--semente n]`: monta o material de três
  juízes (pastas `juiz-1..3`), letras sorteadas e diferentes por juiz e por tela, mesma resolução nos dois lados
  (reduz o maior dentro do Chrome), ordem de apresentação invertida entre juízes, gabarito numa pasta separada
  (`gabarito/`, fora do que o juiz lê). Nomes dos prints: `<tela>-<secao>.png` como o `prints.mjs` grava.
- `juiz.mjs fechar <pasta-saida>`: lê `juiz-N/notas.json` (formato definido na referência), abre o gabarito e
  grava `nota-final.md`: mediana por seção e tela, diferença maior-menor, quantos juízes apontaram o nosso como
  "adaptado", e o veredito: aprovado só se toda mediana >= 9 **ou**, em cada tela, a mediana do nosso for maior ou
  igual à da referência em toda seção e nenhuma abaixo de 8,5 (a referência premiada não tira 9 em tudo com este
  juiz; registrar as duas réguas no arquivo).
- `juiz-as-cegas.md`: o pedido pronto para o juiz (só lê a própria pasta; rubrica com os pesos design 40,
  usabilidade 30, criatividade 20, conteúdo 10; nota por seção; lista do que impede o 9, com lugar e correção;
  formato do `notas.json`), a regra de usar três juízes independentes e a de nunca reaproveitar juiz que já viu o
  gabarito. Incluir um quarto olhar: o do Codex sobre prints e código (pedido em arquivo, só leitura).
- Pronto quando: teste do `montar` (letras, resolução igual, gabarito fora) e do `fechar` (mediana e veredito).

## Parte 3b — Painel de opiniões (pedido do dono em 11/11, DEV-74; depois da parte 3)
- A nota não vem de três juízes iguais: vem de um painel de olhares **diferentes entre si** (juízes parecidos valem
  como um só). No mínimo: três juízes às cegas com papéis distintos (direção de arte; tipografia e acabamento;
  celular e uso), um de movimento (tira de quadros), um "dono do negócio" (entende em 5 segundos o que a empresa
  faz e como pedir orçamento?), e o Codex (outro modelo) sobre prints e código. Onde houver outro modelo à mão
  (Sonnet, Opus, Fable, Codex), variar o modelo entre os juízes.
- `juiz.mjs montar` aceita `--juizes n` e o arquivo de papéis; `fechar` mostra mediana, discordância e, por papel,
  o que cada um apontou que os outros não viram. `juiz-as-cegas.md` ganha um pedido por papel.
- Para o dono: quando a dúvida for de gosto, mostrar duas opções lado a lado (A/B) em vez de pedir descrição.
- Pesquisa de painel feita em 11/11 (dados do pesquisador, não conferidos). Nada a instalar; ideias a copiar:
  comparação em pares com a ordem trocada (vale só se as duas ordens concordarem); mediana e dispersão, com
  dispersão alta virando "dúvida, chamar o dono"; revisão cruzada anônima antes do fecho (ideia do `llm-council`);
  chamar em paralelo as CLIs que já existem, sem chave (ideia do `team-attention/agent-council`, MIT); papéis e as
  10 heurísticas de Nielsen em subagentes separados (a `impeccable` do kit já tem `critique`); controle deslizante
  para o dono comparar A/B (`sneas/img-comparison-slider`, MIT, ou HTML próprio). Estudo citado: painel de modelos
  de famílias diferentes supera um juiz grande (arxiv 2404.18796), ou seja, **modelo de outra família vale mais
  que mais um juiz igual**.
- Painel grátis e local: Fable (direção de arte), Opus (tipografia e ritmo), Sonnet (celular e leitura), Codex
  (pares A/B nas duas ordens, `codex exec -i`), e, se o dono quiser instalar o Ollama, um modelo local com visão
  como "leigo que quer contratar" (qwen2.5vl 7b ~5,6 GB ou gemma3; velocidade sem placa de vídeo não confirmada).
  Fora: PAL MCP (servidor instalado, chaves), `llm-council-plugin` (hooks que rodam sozinhos), Gemini CLI (plano
  grátis teria acabado em 06/2026, não confirmado), OpenRouter grátis (conta, chave e imagem saindo da máquina).

## Parte 4 — Regras de fora, conferidas
- Baixar para uma pasta temporária fora do repositório, num commit fixo: `emilkowalski/skills` (só
  `review-animations`, `mobile-native`, `break-ui`, `animate` se existirem) e `vercel-labs/web-interface-guidelines`
  (`command.md`). Conferir a licença no próprio repositório. Passar cada skill pelo verificador do kit (skill
  `devconductor-core:skill-scanner`; ler os scripts e hooks, se houver). Achado crítico ou licença não clara: não
  trazer, e dizer por quê.
- Escrever, em português e adaptado ao nosso caso (landing page, React + Tailwind + GSAP), sem copiar o que não
  serve (Swift, Expo, aplicativo):
  `plugins/landing-pages/skills/lp-revisao/referencias/critica-de-movimento.md` (como julgar animação: parte de
  "há defeito", curvas e durações, o que conferir quadro a quadro),
  `plugins/landing-pages/skills/lp-revisao/referencias/conteudo-extremo.md` (testar com nome longo, número
  grande, texto sem espaço, sem foto),
  `plugins/landing-pages/skills/lp-construcao/referencias/celular-de-verdade.md` (meta tags, área segura, toque,
  barra fixa, rolagem),
  `plugins/landing-pages/skills/lp-revisao/referencias/detalhes-de-interface.md` (lista de acabamento).
  Cada arquivo com no máximo ~80 linhas e crédito no topo. Registrar em `fontes.json` e `NOTICE`; copiar o texto da
  licença para a pasta `LICENSES/` do plugin se o plugin já tiver uma (seguir o padrão do `devconductor-core`).
- Pronto quando: os quatro arquivos existem, `fontes.json`/`NOTICE` atualizados, o teste `skills-do-kit` e o de
  `fontes` (se houver) passam, e o resumo diz o que foi recusado.

## Parte 5 — Regras nas skills e versão (depois das partes 1 a 4)
- `lp-revisao/SKILL.md`: portões em três níveis (**nunca passa**: celular, fixo sobre conteúdo, título colidindo,
  imagem ampliada, emenda de faixa, queda de Lighthouse; **exige justificativa**: órfã, cor desigual, vão morto,
  sinais de site gerado; **não bloqueia**: sugestões); ordem da revisão: `acabamento.mjs` → `celular.mjs` →
  Lighthouse → `rodadas.mjs` → comparador → juiz (três) + Codex; lista curta de sinais de site gerado; apontar as
  referências novas. Todo defeito que o juiz achar e a máquina não: registrar em `problemas-do-kit` para virar
  conferência.
- `lp-construcao/SKILL.md`: regras de acabamento (entrelinha de título em caixa alta com acento >= 1,15; nada fixo
  sobre conteúdo, barra no pé no celular com folga no fim da página; contorno de letra só com preenchimento por
  cima ou em fonte de traço único; faixa em laço com período exato; um tratamento de cor por grupo de fotos;
  `text-wrap: balance` em título e `pretty` em parágrafo); celular desenhado junto, não depois.
- `lp-assets/SKILL.md`: textura fotografada em tamanho real (sem ampliar, espelhar nem esticar), recorte em pé para
  o celular, fontes de textura (Poly Haven, ambientCG, CC0).
- `lp-tipografia/SKILL.md`: fontes fora do catálogo comum (Fontshare, Uncut, Collletttivo, Velvetyne, League of
  Moveable Type), sempre lendo a licença de cada fonte e hospedando no próprio site.
- `lp-cenas/SKILL.md` ou `lp-direcao-de-arte/SKILL.md`: fundo vivo leve como opção (`paper-design/shaders`,
  Apache-2.0; `oframe/ogl`, Unlicense), com custo no celular medido; **uma ou duas ideias próprias do ofício do
  cliente por site** (desenho técnico, ferramenta, medida, material), obrigatórias no caminho por referência.
- `lp-maestro/SKILL.md`: duas paradas para o dono olhar (direção escolhida; primeira tela pronta), sempre com o
  endereço local clicável e o que olhar; régua do dono (3 a 5 sites que ele considera 10) guardada no projeto.
- Subir a versão em `plugins/landing-pages/.claude-plugin/plugin.json`, rodar
  `node scripts/atualizar-marketplace.mjs`, a suíte inteira e `claude plugin validate` (raiz e plugin).
- Pronto quando: suíte com saída 0 (fora a falha conhecida do `gerar-vitrine`, se continuar), validates ok.

## Depois
Revisor independente + Codex sobre a leva; rodar `acabamento.mjs` e `juiz.mjs` na prova interna; atualizar
`docs/continuar.md` e `docs/planos/README.md`.

## Parte 6: correções da revisão (Codex + revisor) e lições do primeiro painel (11/11, noite)

Origem: `.codex/resposta-revisao-acabamento.md`, revisor independente e o painel de 5 juízes em
`pilotos/prova-referencia/marcenaria-aroeira/revisao/v2/juiz-6/nota-final.md`. Cada item com teste. Não mexer na
página da prova. Ao fim: suíte, dois validates, versão do `landing-pages` 0.5.0 -> 0.5.1 e catálogo.

`acabamento.mjs`
1. Moldura fixa só é ignorada se for barra (altura até 25% da tela); painel fixo que cobre a tela reprova.
2. Tamanho da imagem pelo desenhado de fato (`getBoundingClientRect`, pega `transform`), não `clientWidth`.
3. Imagem que não carregou ou não deu para medir entra em `naoMedido` com seletor e motivo.
4. Órfã: ignorar última linha sem letra (ex.: "2 / 6").
5. Vão morto fica como aviso (como no script); corrigir o `lp-revisao/SKILL.md`, que dizia "exige justificativa".

`juiz.mjs` e `referencias/juiz-as-cegas.md`
6. Tela ou seção presente só de um lado, ou fora do mapa: erro (saída 2), a não ser com `--parcial`; o que ficou
   de fora aparece no veredito.
7. Pastas dos juízes em diretório neutro fora do projeto (pasta temporária de nome sorteado, sem nome de cliente);
   `montar` imprime os caminhos e guarda em `gabarito/pastas.json`; `fechar` lê os `notas.json` de lá e copia
   para a saída. O gabarito nunca fica ao lado do que o juiz lê. Os exemplos do Codex usam `-C <pasta neutra>`.
8. Altura diferente entre os lados: não cortar; completar o menor com margem neutra (a seção inteira é julgada).
9. Dúvida (diferença acima de 1,5) só conta nas seções do NOSSO site. Se o resultado seria aprovado e há dúvida:
   veredito PENDENTE, saída 3 (0 aprovado, 1 reprovado, 2 erro, 3 pendente do dono).
10. Padrão de 4 juízes (o dono entra). Papel repetido só quando há mais juízes que papéis; `--papeis` com
    repetição abaixo disso é erro.
11. "Adaptado": avisar com 2 ou mais apontando o nosso (não só maioria).
12. Régua B nova, porque o painel deu 6,3 a 8,1 para a referência premiada (piso fixo de 8,5 é inalcançável e não
    diz nada): em cada tela, nosso >= referência em toda seção E média do nosso >= média da referência + 0,5.
    Régua A continua (toda mediana do nosso >= 9). Uma regra só: alinhar `lp-revisao/SKILL.md` (linha do "abaixo
    de 9 volta ao laço"), `lp-maestro/SKILL.md` e a referência.
13. `nota-final.md`: primeiro o que 2 ou mais juízes apontaram na mesma tela e seção (consenso, com a contagem),
    depois o que só um apontou.
14. Na referência: exemplos para PowerShell 5.1 (`Get-Content pedido.md | codex exec ...`), além do Bash.
15. Na referência, seção "Prints para o juiz": (a) barra ou botão fixo aparece só no print da primeira seção (nos
    outros tapa conteúdo e três juízes descontaram); (b) página de teste com empresa inventada não mostra aviso de
    "fictício", endereço "Exemplo" nem "foto ilustrativa" nos prints do juiz: 5 de 5 marcaram o nosso como
    adaptado por isso; (c) variar o modelo funcionou: o juiz leigo (modelo pequeno, papel de dono) achou coisa que
    os outros não acharam.
16. Teste do lado certo: decodificar o JPEG e conferir a cor média esperada na letra do nosso.

`rodadas.mjs`
17. Comparação pedida que não pôde ser feita (navegador não abriu, print ilegível): saída 2.
18. Categoria ou medida (LCP, CLS) que sumiu no relatório novo: "comparação incompleta", não "passou".

Skills
19. `lp-direcao-de-arte/SKILL.md`: custo do fundo vivo medido pelo Lighthouse do celular (TBT e nota antes e
    depois), não pelo `celular.mjs`, que não mede quadros nem bateria; sem medida, sem fundo vivo.
20. `referencias/detalhes-de-interface.md:54`: caminho certo `../../lp-construcao/referencias/celular-de-verdade.md`.
