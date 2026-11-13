# Design de sistemas: o kit aprende a fazer telas de uso diário bonitas e boas de usar

Pedido do Neemias em 11/11/2026 (DEV-81), com a correção do mesmo dia: o Sistema de Gestão **não** vai ser mudado.
O objetivo é melhorar o **kit**, para os próximos sistemas feitos com ele já saírem com design bom.
Prioridade: **as landing pages vêm primeiro** (plano `2026-11-11-copia-fiel-da-referencia.md`). Este plano anda em
paralelo só no que não encosta nos arquivos das landing pages, e sem tirar recurso delas.
Substitui o G7 do `2026-11-10-projeto-geral.md` e a parte 5 do `2026-11-06-qualidade-visual-com-evidencia.md`.
Versão 2 (11/11): corrigida depois da revisão do Codex (`.codex/resposta-plano-design-sistemas.md`).

## Objetivo
Tela de sistema feita com o kit (lista, filtro, formulário, painel, vazio, erro, celular) sai clara, coerente e
bonita sem o dono pedir: as regras valem no fluxo normal, a **máquina confere** antes de qualquer olho humano, o dono
escolhe a base por referência e um **painel às cegas** dá a nota. A prova é um sistema de exemplo pequeno, feito com
o kit de hoje ("antes") e com o kit novo ("depois"), e o "depois" tem de ganhar.

## Fora do escopo
- Mudar qualquer arquivo do Sistema de Gestão, relatório por tela dele ou ordem de ataque lá. Ele é só **exemplo
  lido** para descobrir o que o kit deixa passar.
- `plugins/landing-pages/**` e `pilotos/prova-referencia/**` antes do fim do plano das landing pages (só a parte 12
  mexe em `lp-revisao`, e espera).
- Login, banco, API de verdade e serviço pago na prova. Tema escuro na prova. Aplicativo nativo.
- Conferência automática de Vue, Svelte, Blazor (`.razor`) e Razor Pages (`.cshtml`): a skill de regras vale para
  eles, mas o conferidor de código responde "não conferido" (parte 2).

## Entrega mínima (se for preciso parar cedo)
**Partes 1 a 5:** regras e configuração, conferência do código, conferência no navegador (layout, contraste, nomes,
estados, prints) e a entrada no fluxo normal. Só com isso os próximos sistemas já saem conferidos.
Ficam para uma segunda entrega: foco e teclado (6), escolha por referência (7 e 8), papéis do juiz (9). A prova
inteira (10, 11, 13 a 15) e o juiz de sistema (12) são a terceira entrega.

## Suposições (decisões de método, tomadas aqui)
- **Onde mora:** no plugin que já existe, `design-sistemas` (hoje 0.1.1). Nada de plugin novo (DEV-51).
- **Reaproveitar sem tocar as landing pages:** os scripts novos importam do `celular.mjs` só `acharNavegador` e
  `motorChrome` (deste, só o `cmd` e o `rodar`; **nunca** o `abrir`, que força `mobile: true`, toque e agente Android
  em qualquer largura, `celular.mjs:356`), e `contraste` do `raio-x.mjs`. A pasta do `landing-pages` é achada como
  em `estudio-design/skills/estudio-movimento/scripts/gravar.mjs`. Telas próprias e fixas: **computador 1440×900**
  (sem toque, densidade 1, agente de Windows) e **celular 390×844** (toque, densidade 2), no mesmo jeito do adaptador
  local do `acabamento.mjs` (linhas ~280–300). Sem `landing-pages`: saída 2, "não conferido".
- **Configuração que a máquina lê:** `design-sistemas.json` na raiz do projeto, com esquema
  (`esquema-config.json` na skill): peças base (componente → arquivo exato), escala de letra e espaço, raio por
  superfície, cores por função, cores de negócio (com motivo), telas (`id` → endereço), contrato de estados (como
  pedir e como confirmar cada estado) e exceções `{regra, arquivo, local, motivo}`. O `DESIGN.md` continua sendo o
  texto para pessoas. Sem a configuração, os itens que dependem dela saem "não conferido" e o resultado nunca é
  "aprovado completo" (saída 2).
- **Códigos de saída de todos os conferidores:** 0 tudo conferido e passou · 1 algum "nunca passa" · 2 algo não deu
  para conferir. "Não medido" nunca vira "passou".
- **Gravidade única:** foco invisível, estado não confirmado, campo sem nome e contraste abaixo do mínimo são
  "nunca passa" em todo lugar deste plano.
- **Stack da prova:** a padrão da `ui-sistemas` (React + Vite + Tailwind 4 + shadcn/ui), com dados fictícios em
  arquivo.
- **Juízes só julgam o que se vê no print.** Teclado, estados funcionando e tarefas são julgados pela máquina e pela
  medição das tarefas, não pelos juízes.
- **Integrador único:** só a regente (conversa principal) mexe em `.claude-plugin/marketplace.json`, nas versões dos
  `plugin.json`, em `fontes.json`, `NOTICE` e `.gitignore`, no fim de cada lote, num commit próprio. Executores não
  sobem versão. Os lotes deste plano são em sequência; nenhum roda junto com outro deste plano.

## Diagnóstico

### O que o kit já tem
| Peça | O que faz | Serve para sistema? |
|---|---|---|
| `design-sistemas/ui-sistemas` | Regras de lista, formulário, estados, dado brasileiro (`modelos/br.ts`), DESIGN.md | Sim, é a base. **Nunca passou por tela real avaliada** |
| Consultoras (`baseline-ui`, `fixing-accessibility`, `improve-ui`, `create-design-md`, `dashboard-design`) | Leitura de apoio, travadas | Sim |
| `lp-revisao/scripts/celular.mjs` | Motor do Chrome; rolagem lateral, letra, toque, menu | O motor serve (sem o `abrir`); os itens de contato e vídeo não |
| `lp-revisao/scripts/acabamento.mjs` | Fixo sobre conteúdo, títulos colidindo, órfã, imagem, vão | Serve de modelo do adaptador de tela; os itens são de página de venda |
| `lp-revisao/scripts/juiz.mjs` | Painel às cegas com papéis | Serve; mas papéis, texto do pedido e veredito são de landing page (parte 12) |
| `lp-referencias/scripts/raio-x.mjs` (`contraste`) | Conta de contraste | Serve (só a função) |
| `orquestrador/referencias/fluxo-sistema.md` | Fluxo de sistema | Só diz "Interface usa as skills visuais na principal": não obriga nada |

### O que falta
1. Conferência por máquina feita para tela de sistema, principalmente de **consistência** (o código seguir as
   próprias peças e tokens).
2. Regras valendo sem o dono pedir (fluxo normal e ativação também em projeto novo).
3. Escolher a base por referência (DEV-53, DEV-74, DEV-80) com 2–3 variações de uma tela.
4. Régua e veredito de juiz próprios de sistema.
5. Prova medida.

### O que se viu no Sistema de Gestão (só leitura, sem dado pessoal)
React 18 + Vite + Tailwind 3, sem biblioteca de componentes; peças próprias (botão, campo, cabeçalho de tela,
estados, confirmação, aviso, abas); paleta própria com temas escuros por variável; regras de interface próprias e um
plano de design com 3 fases feitas. ~40 telas, ~100 `.tsx`. **As regras existiam; o código foi se afastando delas e
nada conferia.** Defeitos prováveis (contagens aproximadas por busca no código):
1. Peças base pela metade: ~190 `<input>` e ~45 `<button>` à mão nas telas, contra ~20 arquivos com a peça de campo.
2. Erro em aviso que some: ~300 `toast.error`, vários de validação que deveria ficar no campo.
3. Tipografia sem escala fechada: ~270 `text-xs`, ~18 tamanhos arbitrários (11 a 17 px), letra de 10–11 px.
4. Cantos misturados (`rounded-md/lg/xl/2xl`) sem regra por superfície.
5. Cabeçalho de tabela à mão em 6+ variações; tabela larga rolando dentro do cartão no celular.
6. Telas gigantes (até ~1.750 linhas num arquivo); ~10 telas sem o cabeçalho padrão.
7. ~20 cores fora da paleta; parte é de propósito (cor com sentido no negócio), parte não, e nada as separa.
8. ~18 `focus:outline-none`/`focus:ring` locais que podem apagar o foco global.
9. Nada visto em celular real com dados reais.

## Riscos de segurança
| Categoria | Toca? | Onde e como trata |
|---|---|---|
| Dados pessoais | Sim (leitura do Sistema de Gestão) | Plano só com contagens genéricas. Parte 2 roda no código dele **só para calibrar**, com saída em pasta temporária fora do repositório; nada dele vai para `pilotos/`, prints ou juiz. A prova usa dados fictícios (parte 10). |
| Cadeia de suprimento | Sim | Parte 7: só projeto conhecido com licença conferida; nada é copiado sem `skill-scanner` limpo, `fontes.json` + `NOTICE` e o teste `skills-do-kit`. |
| Navegador automático | Sim | Partes 3, 4 e 6: abre só o endereço pedido (localhost na prova), sem login, sem enviar formulário real. |
| Login, permissões, segredos, envio de arquivo, pagamento, regras do banco | Não | — |

## Ordem dos lotes (um executor novo por lote, revisão logo depois, DEV-77)
| Lote | Partes | Quem | Quando |
|---|---|---|---|
| L1 | 1 + 2 | executor | já (fase A) |
| L2 | 3 + 4 | executor | depois do L1 |
| L3 | 5 | executor `[sonnet]` | depois do L2 — **fim da entrega mínima** |
| L4 | 6 | executor | depois do L3 |
| L5 | 7 | pesquisador `[sonnet]` | depois do L4 (pode antes, se sobrar gente: não toca arquivo de outro lote) |
| L6 | 8 + 9 | executor | depois do L5 |
| L7 | 10 | executor | depois do L6 |
| L8 | 11 | agente novo **sem o plano** | depois do L7 |
| — | — | — | **espera o fim do plano das landing pages**; então rodar de novo os testes das partes 3, 4 e 6 (importam scripts delas) |
| L9 | 12 | executor | fase B |
| L10 | 13 | regente | quando o Neemias tiver tempo livre das landing pages |
| L11 | 14 | executor | depois do L10 |
| L12 | 15 | regente + juízes em sessões novas | depois do L11 |

Versões (pelo integrador): `design-sistemas` 0.2.0 no L1 e +0.0.1 a cada lote que o muda; `devconductor-core` nos
lotes que mexem no fluxo (L3, L6, L9) e no detector (L3); `landing-pages` no L9. Depois de cada uma,
`node scripts/atualizar-marketplace.mjs`.

## Partes

### 1. Regras novas, régua e configuração validável
**Arquivos:** `plugins/design-sistemas/skills/ui-sistemas/SKILL.md`, `.../ui-sistemas/referencias/regua-telas.md`
(novo), `.../ui-sistemas/esquema-config.json` (novo), `.../ui-sistemas/modelos/design-sistemas.json` (novo, exemplo),
`.../ui-sistemas/design-md.md`, `scripts/testes/design-sistemas.test.mjs`.
**Regra:**
- Na skill, só o que ela ainda não diz: peças base obrigatórias (campo, botão, cabeçalho de tela e de tabela,
  estados) e tela à mão só com exceção registrada; escala fechada de letra (até 5 tamanhos com nome, títulos em 3
  níveis, mínimo 12 px no computador e 16 px em campo no celular, nada de `text-[Npx]`) e de espaço (4 px); um raio
  por superfície; sombra só no que flutua; cores por função e cores de negócio registradas à parte; aviso que some só
  para resultado de ação (erro de campo fica no campo); `outline-none` só com foco substituto; tela de até ~400
  linhas; tabela no celular (cartões para consulta, primeira coluna fixa para comparar).
- `regua-telas.md`: cada critério da máquina com id, nível ("nunca passa", "exige justificativa" via exceção,
  "aviso") e qual script confere; e os critérios do olho (viram os papéis da parte 9).
- `esquema-config.json` (JSON Schema simples): campos da seção "Suposições". Exceção exige `regra`, `arquivo`,
  `local` (linha ou seletor) e `motivo` não vazio; exceção sem algum deles é inválida. Peça base é um arquivo exato,
  não uma pasta (arquivo vizinho não declarado continua conferido).
**Não mudar:** consultoras travadas; regras de dado brasileiro.
**Pronto quando:** a skill aponta a régua e a configuração; o exemplo valida contra o esquema; um exemplo com exceção
sem motivo e outro com peça declarada como pasta são recusados.
**Teste:** casos novos em `design-sistemas.test.mjs` (validar com um validador mínimo escrito no próprio teste, sem
dependência nova): exemplo válido passa; exceção sem motivo, peça como pasta e campo desconhecido reprovam; cada id
da régua aparece uma vez. `node --test scripts/testes/design-sistemas.test.mjs`.
**Depende de:** nenhuma.

### 2. Conferência de consistência no código (sem navegador)
**Arquivos:** `.../ui-sistemas/scripts/consistencia.mjs` (novo), `scripts/testes/consistencia-telas.test.mjs` (novo),
`scripts/testes/dados/consistencia/**` (fixtures novas), `.../ui-sistemas/SKILL.md` (uma linha de uso).
**Regra:** `node consistencia.mjs <pasta-src> [--config design-sistemas.json] [--json] [pasta-saida]`. Só lê.
- **Cobertura declarada:** confere `.tsx/.jsx/.ts/.js` (React) e `.css` (incluindo `@theme` e variáveis CSS do
  Tailwind 4) e `tailwind.config.*`. Arquivos de outra stack (`.vue`, `.svelte`, `.razor`, `.cshtml`) entram no
  relatório como "não conferido" com a contagem; projeto sem nenhum arquivo coberto dá saída 2.
- **Itens** (cada um com id da régua): peça base contornada (`<input>`, `<button>`, `<select>`, `<th>` fora dos
  arquivos declarados como peça); letra fora da escala ou arbitrária; espaço arbitrário; raio fora do da
  superfície; cor fora dos tokens e das cores de negócio; `outline-none` sem `focus-visible:` substituto na mesma
  lista de classes; `toast.error` dentro de função de validação (aviso); arquivo de tela acima de 400 linhas (aviso);
  cabeçalhos de tabela com classes diferentes.
- **Classes:** lê literais de `className`, `cn(...)`, `clsx(...)`, `cva(...)` e template literal; trecho dinâmico
  que não dá para resolver entra como "não medido" (conta, não aprova). Componente que embrulha a peça base (ex.:
  `CampoCpf` usando `Campo`) é aceito quando o arquivo dele importa a peça declarada.
- Exceções da configuração apagam só o achado da mesma regra no mesmo local.
- Calibrar uma vez no `src` do Sistema de Gestão, **só leitura, saída em pasta temporária fora do repositório**:
  conferir que aponta os sinais 1 a 8 do diagnóstico. Nada dessa saída entra no git.
**Pronto quando:** cada item tem uma fixture só com aquele defeito, apontando só ele, com arquivo:linha e a
**gravidade certa** (item "nunca passa" dá saída 1; item de aviso aparece como aviso e a saída continua 0), e a
contraparte limpa (saída 0, sem aviso); wrapper, variável CSS e classe composta têm caso limpo e defeituoso; pasta só com
`.razor` dá 2; sem configuração dá 2.
**Teste:** `node --test scripts/testes/consistencia-telas.test.mjs`.
**Depende de:** 1.

### 3. Navegador A: adaptador de tela, layout, letra, contraste e nomes
**Arquivos:** `.../ui-sistemas/scripts/conferir-tela.mjs` (novo), `.../ui-sistemas/scripts/regras-tela.mjs` (novo,
regras puras), `scripts/testes/conferir-tela.test.mjs` (novo), `scripts/testes/dados/telas/*.html` (fixtures).
**Regra:** `node conferir-tela.mjs --config design-sistemas.json --base <url> [pasta-saida] [--telas a,b] [--json]`.
- Adaptador próprio (ver "Suposições"): função pura `parametrosDaTela('computador'|'celular')` devolve exatamente os
  parâmetros enviados ao Chrome (tamanho, densidade, `mobile`, toque, agente); o `abrir` do `celular.mjs` não é usado.
- Itens: rolagem lateral **da página** (rolagem dentro de um elemento com `overflow-x: auto` é permitida, para
  tabela no celular); elemento cortado; letra < 12 px no computador e campo < 16 px no celular; toque < 44 px no
  celular; contraste do texto < 4,5:1 (3:1 para texto ≥ 24 px ou ≥ 18,7 px negrito e para borda de campo), com cor
  de fundo composta pelos ancestrais (transparência somada); texto sobre imagem ou degradê sai "não medido";
  controle desabilitado fica fora do contraste (regra da WCAG). Nome acessível pelo próprio Chrome
  (`Accessibility.getPartialAXTree`), não por conta nossa: campo, botão e link sem nome reprovam. Tabela: `<table>`
  sem `<th>` reprova; `role="grid"`/`"table"` com `columnheader` é aceito. Lista virtual: confere só o que está na
  tela e avisa.
**Não mudar:** nada em `plugins/landing-pages/**` (só importa).
**Pronto quando:** cada regra pura tem caso que reprova e contraparte que passa; `parametrosDaTela` é testada nos dois
tamanhos (`mobile: false` e sem toque no computador); com Chrome, cada fixture de um defeito só aponta ele com a
gravidade certa ("nunca passa" dá 1; aviso fica como aviso, saída 0) e a limpa dá 0; sem `landing-pages` ou sem Chrome, dá 2.
**Teste:** `node --test scripts/testes/conferir-tela.test.mjs`. Os casos com Chrome pulam com aviso quando não há
navegador, **mas** o lote só é aceito com uma execução real registrada no resumo (contagem de casos de Chrome
executados > 0).
**Depende de:** 1.

### 4. Navegador B: estados confirmados e prints com nome do juiz
**Arquivos:** os mesmos da parte 3.
**Regra:**
- Contrato de estados na configuração: para cada tela, como pedir cada estado (padrão: `?estado=<nome>` no endereço;
  o projeto pode dar outro) e como confirmar (padrão: atributo `data-estado="<nome>"` na raiz da tela). O script
  pede, espera estabilizar (o `data-estado` pedido presente e 1 s sem mudança, até 10 s) e só então confere e
  fotografa. Estado pedido que não aparece: "estado não confirmado" (nunca passa) — isso pega o sistema que ignora o
  parâmetro. Estado que nunca estabiliza dentro do limite: nunca passa.
- Erro: clicar no botão "Tentar de novo" (seletor no contrato) e confirmar que o `data-estado` sai de `erro`; se não
  sai, nunca passa.
- Tela em branco (sem texto visível) em qualquer estado: nunca passa.
- Prints com nome que o `juiz.mjs` aceita e que diz a tela: `<computador|celular>-<tela>-<estado>.png`
  (ex.: `computador-pedidos-erro.png`). O `listarPrints` do juiz (`juiz.mjs:56–66`) lê o primeiro trecho como tela
  do aparelho e o resto como seção, então cada tela e estado vira uma seção própria, sem sobrescrever.
**Pronto quando:** fixtures de parâmetro ignorado, "Tentar de novo" que não faz nada e estado que nunca termina dão
1, cada uma apontando só o seu defeito; a fixture limpa dá 0 e grava um print por aparelho × tela × estado.
**Teste:** em `conferir-tela.test.mjs`, além das fixtures: o percurso **captura → `listarPrints` → `parear` →
`sortear`** do `juiz.mjs` (funções exportadas, importadas do `landing-pages`; o `montar` completo fica para a parte
15) com 2 telas × 3 estados × 2 aparelhos e duas versões, conferindo 12 pares e nenhum nome repetido.
**Depende de:** 3.

### 5. Ativação e fluxo normal (fim da entrega mínima) `[sonnet]`
**Arquivos:** `plugins/design-sistemas/skills/ui-sistemas/SKILL.md` (só a `description` e a seção de comandos),
`plugins/devconductor-core/hooks/detectar-stack.mjs`,
`plugins/devconductor-core/skills/orquestrador/referencias/fluxo-sistema.md`, `scripts/testes/design-sistemas.test.mjs`,
`scripts/testes/orquestrador.test.mjs`.
**Regra:**
- `description` da `ui-sistemas`: vale para tela de sistema **em qualquer stack e em projeto novo ou vazio** (o
  pedido "sistema, painel, cadastro, área logada" basta); a stack padrão continua React.
- Detector: além do que já liga, ligar `design-sistemas` com Blazor (arquivo `.razor` ou pacote
  `Microsoft.AspNetCore.Components` num `.csproj`).
- Comandos na skill escritos como os das landing pages (`node <pasta desta skill>/scripts/...`), com a frase: sem o
  plugin `landing-pages`, o conferidor do navegador sai 2 e a tela é entregue como "não conferida", nunca como pronta.
- `fluxo-sistema.md`: trocar "Interface usa as skills visuais na principal; não cria um agente de design." por um
  bloco "**Telas**" em "Construir": (1) toda tela de sistema passa pela `design-sistemas:ui-sistemas`; (2) antes de
  mostrar qualquer tela, `consistencia.mjs` e `conferir-tela.mjs` com saída 0 (saída 2 = "não conferido", dito ao
  usuário). Em "Entregar": anexar o resumo das duas conferências. (A escolha por referência entra na parte 8 e o
  painel na parte 12; o fluxo só ganha cada linha quando a peça existe.)
**Não mudar:** o portão de segurança e as outras linhas do fluxo.
**Pronto quando:** o detector liga `design-sistemas` numa pasta temporária com Blazor e não liga numa landing page;
o fluxo tem o bloco "Telas"; e o **percurso inteiro** passa num teste: pasta vazia com um pedido de sistema →
skill ligada → os comandos do bloco "Telas" saem com o caminho instalado resolvido (rodam a partir da pasta do
projeto) → com um defeito "nunca passa" plantado a conferência dá 1 e o fluxo manda NÃO entregar → sem o plugin
`landing-pages` (ou sem Chrome) o resultado é "não conferido" (saída 2), nunca "passou".
**Teste:** casos novos: detector em pasta com `.razor` (liga) e com `clientes/` (não liga); `description` cita
"projeto novo" e "qualquer stack"; `fluxo-sistema.md` cita `ui-sistemas`, `consistencia.mjs`, `conferir-tela.mjs` e
"não conferido". `node --test scripts/testes/design-sistemas.test.mjs scripts/testes/orquestrador.test.mjs`.
**Depende de:** 2, 4.

### 6. Navegador C: foco e teclado
**Arquivos:** os mesmos da parte 3; `.../ui-sistemas/SKILL.md` (passo de revisão).
**Regra:**
- Percorrer com Tab até voltar ao primeiro item ou até 300 itens; passando de 300, o item sai "cobertura incompleta:
  N de M" e a saída é 2 (nunca 0).
- Foco visível: comparar **o recorte da tela** em volta do item (item + 8 px, incluindo o pai) com e sem foco
  (`Page.captureScreenshot` com `clip`); sem diferença de pixels acima de um mínimo, nunca passa. Isso pega foco
  desenhado no pai ou em pseudoelemento.
- Componentes de setas (`role` `tablist`, `menu`, `menubar`, `radiogroup`, `grid`, `listbox`): Tab entra uma vez; não
  se exige Tab em cada item; as setas são conferidas só como aviso.
- Janelas: o contrato da tela lista ações que abrem janela (`{nome, seletor}`); o script clica, confere que o foco
  entra na janela, não sai com Tab e que Esc fecha e devolve o foco ao botão que abriu. Falha: nunca passa.
- Na skill, o passo de revisão manda rodar as conferências até saída 0 antes de olhar ou mostrar.
**Pronto quando:** fixtures de foco apagado, foco só no pai (passa), foco por pseudoelemento (passa), janela sem Esc,
janela que deixa o foco escapar e lista com mais de 300 itens dão o resultado certo, cada uma isolada; com execução
real de Chrome registrada.
**Teste:** `node --test scripts/testes/conferir-tela.test.mjs`.
**Depende de:** 4.

### 7. Fontes da galeria `[sonnet]`
**Arquivos:** `.../ui-sistemas/referencias/fontes-de-referencia.md` (novo), `plugins/design-sistemas/FONTES.md`
(seção "Avaliadas em 11/2026"). Se algo for copiado: o integrador cuida de `fontes.json` e `NOTICE`.
**Regra:** com o agente `pesquisador`, **primeiro** fechar ao menos 6 fontes de telas de sistema que dê para abrir e
fotografar (demonstração pública ou exemplo oficial), cobrindo lista com filtro, cadastro e painel. Para cada uma:
endereço, licença conferida no repositório (arquivo LICENSE e commit), e "só olhar" ou "pode copiar peça".
Candidatos a conferir (licença entre parênteses é lembrança, **a pesquisar**): exemplos e blocos do shadcn/ui (MIT),
Tremor (Apache-2.0), Tabler (MIT), Carbon da IBM (Apache-2.0), Primer do GitHub (MIT), GOV.UK Design System (MIT),
Twenty e Plane (AGPL: só olhar). **Opcional, sem bloquear nada:** skills de auditoria de consistência de interface e
o axe-core (MPL-2.0; só se já instalado, nunca baixado pelo kit). Já avaliadas antes: `Dammyjay93/interface-design`
(não copiada), `ibelick/ui-skills` (copiada).
**Pronto quando:** 6 fontes com licença conferida e link; candidato que não fechar sai como "descartado: motivo".
Nada copiado sem `skill-scanner` limpo e registro.
**Teste:** `node --test scripts/testes/skills-do-kit.test.mjs` e caso em `design-sistemas.test.mjs`:
`fontes-de-referencia.md` tem ≥ 6 linhas com licença e nenhuma marcada "a pesquisar".
**Depende de:** nenhuma (corre no L5 para não disputar arquivo).

### 8. Escolher por referência: galeria de telas e variações
**Arquivos:** `.../ui-sistemas/SKILL.md` (seção "Tela nova ou redesenho: ele escolhe antes"),
`.../ui-sistemas/scripts/galeria-telas.mjs` (novo), `scripts/testes/galeria-telas.test.mjs` (novo),
`fluxo-sistema.md` (uma linha). O integrador põe `pilotos/**/referencias-telas/` no `.gitignore` (prints de
terceiros).
**Regra:** método por **tela**: (1) achar a tela mais usada e o tipo dela; (2) galeria com 6–10 telas do mesmo tipo
das fontes da parte 7, em print de computador e celular (`conferir-tela.mjs --so-prints` ou `prints.mjs`);
`galeria-telas.mjs <pasta>` monta `galeria.html` com imagens lado a lado, origem, licença e uma caixa de marcar;
(3) o dono marca uma e diz o que mudar; sem escolha, não se constrói (DEV-80); (4) 2 ou 3 variações dessa tela com
dados fictícios, por `?variacao=a|b|c`, todas passadas nas conferências antes de mostrar, cada uma com uma
**configuração provisória** própria (`design-sistemas.variacao-a.json` etc., passada ao conferidor por `--config`);
(5) a configuração provisória da escolhida é consolidada como a configuração do projeto (parte 1) e o `DESIGN.md`,
as outras são apagadas, e só então as outras telas. No `fluxo-sistema.md`, no bloco "Telas":
"sistema novo ou primeira tela sem configuração: escolha por referência, na regente".
**Pronto quando:** a seção tem os 5 passos; a galeria abre com imagens de teste.
**Teste:** `galeria-telas.test.mjs`: pasta com 3 PNG gera `galeria.html` com 3 cartões, caminhos relativos e nenhum
endereço externo carregado; caso em `orquestrador.test.mjs` para a linha nova.
**Depende de:** 5, 7.

### 9. Papéis do juiz de telas
**Arquivos:** `.../ui-sistemas/referencias/juiz-telas.md` (novo), `.../ui-sistemas/SKILL.md` (passo "Nota"),
`scripts/testes/design-sistemas.test.mjs`.
**Regra:** blocos no formato `<!-- papel:<id> -->` ... `<!-- papel:fim -->` (o mesmo do juiz das landing pages),
cinco papéis, todos **só sobre o que se vê no print**: `operador` (dá para achar e fazer a tarefa da tela de
relance?), `clareza` (o principal salta, nada compete), `celular` (o print de celular: toque, tabela, leitura),
`acesso-visual` (contraste, tamanho, foco desenhado quando aparece no print), `coerencia` (mesma coisa com a mesma
cara entre as telas; beleza contida). Mais um bloco `<!-- pedido -->` com o texto ao juiz: duas versões da mesma tela,
letras sorteadas, nota de 0 a 10 por tela no seu papel, "clareza e uso antes de efeito", sem as palavras
"referência" e "nosso". Um bloco `<!-- pesos -->` com os critérios da nota: uso 50, clareza 30, acabamento 20 (sem
"criatividade"). **Um só momento para cada coisa:** depois de cada tela pronta, conferências até 0; no fim da
rodada (todas as telas da vez), o painel completo; não há juiz avulso no meio. O que o painel achar e a máquina não
virar item novo na `regua-telas.md`.
**Pronto quando:** o arquivo tem 5 papéis e o bloco do pedido, lidos pela mesma expressão do `juiz.mjs`.
**Teste:** caso em `design-sistemas.test.mjs` que aplica
`/<!-- papel:([a-z0-9-]+) -->\r?\n([\s\S]*?)\r?\n<!-- papel:fim -->/g` e acha os 5 ids, e confere que o pedido não
contém "referência" nem "nosso".
**Depende de:** 1.

### 10. Pedido da prova e pacote "antes" congelado
**Arquivos:** `pilotos/prova-sistemas/pedido.md`, `pilotos/prova-sistemas/dados/*.json`,
`pilotos/prova-sistemas/kit-antes/**` (cópia), `pilotos/prova-sistemas/ficha-antes.md`,
`scripts/testes/prova-sistemas.test.mjs` (novo).
**Regra:**
- `pedido.md` (igual para "antes" e "depois", fechado antes de construir): negócio fictício "Distribuidora Ponte
  Alta"; 4 telas — (a) lista de pedidos com busca, filtro de situação e período, ordem e paginação; (b) cadastro de
  cliente com 10+ campos (CNPJ/CPF, CEP que preenche endereço, telefone); (c) painel do dia com 4 indicadores e 1
  gráfico; (d) detalhe do pedido com cancelar (reversível, "Desfazer") e excluir (irreversível); estados carregando,
  vazio, vazio de busca, erro e salvando pelo contrato da parte 4.
- Três tarefas, cada uma com **dados-alvo, ponto de partida, resultado esperado, contagem e limite**:
  T1 achar o pedido 1042 do cliente fictício "Mercado Bom Preço" em outubro: parte da lista recém-aberta, foco no
  topo; resultado = detalhe do 1042 aberto; conta cada clique, Tab, Enter, Esc, seta ou atalho como 1 ação (texto
  digitado não conta); limite 6 ações. T2 no celular 390×844, a partir da lista: dizer qual de 1042 e 1057 tem
  maior valor e entrega mais cedo; resultado = os dois valores e datas lidos; limite 6 toques. T3 só teclado, a
  partir do cadastro do cliente 33 aberto: corrigir o telefone e salvar; resultado = mensagem de salvo e telefone
  novo na lista; limite 8 teclas além do texto. Em todas: erro = ação que leva a tela não prevista; registrar
  conclusão, erros e tempo.
- Dados fictícios: ~60 clientes com CNPJ/CPF **inventados** com dígito válido (`modelos/br.ts`), marcados
  `"ficticio": true`; ~200 pedidos em centavos; os dados-alvo das tarefas existem.
- `kit-antes/`: `git archive d335d59 plugins/design-sistemas` inteiro (skill, consultoras, modelo de DESIGN.md,
  `br.ts`), mais `kit-antes/LEIAME.md` com o commit, a soma SHA-256 de cada arquivo, as versões de Node e npm, os
  comandos de criação do projeto e o orçamento (até ~60 chamadas de agente).
- `ficha-antes.md`: a única coisa que o construtor do "antes" recebe (aponta `pedido.md`, `dados/` e `kit-antes/`;
  proíbe abrir `docs/planos/` e `plugins/`).
**Pronto quando:** o pedido tem as 3 tarefas com os 5 campos; dados válidos; `kit-antes` com as somas.
**Teste:** `prova-sistemas.test.mjs`: seções e campos das tarefas presentes; CNPJ/CPF válidos e fictícios; dados-alvo
existem; somas do `kit-antes` batem com os arquivos.
**Depende de:** nenhuma (fica no L7 só para não disputar a atenção da entrega mínima).

### 11. Construir o "antes" em sessão isolada
**Arquivos:** `pilotos/prova-sistemas/antes/**`, `pilotos/prova-sistemas/antes/REGISTRO.md`.
**Regra:** a regente abre um agente novo (não o executor deste plano) passando **só** `ficha-antes.md`. Ele constrói
as 4 telas pelo `kit-antes/`, dentro do orçamento, e grava em `REGISTRO.md` o que fez. Ao fim, a regente grava o
hash do commit do "antes" no `REGISTRO.md`; daí em diante, `antes/` não muda.
**Pronto quando:** `npm run build` em `antes/` passa; as 4 telas abrem em todos os estados do contrato; `REGISTRO.md`
tem o hash.
**Teste:** `cd pilotos/prova-sistemas/antes && npm run build` (código 0); `conferir-tela.mjs` roda nele (o resultado
pode reprovar; só não pode dar "estado não confirmado" por falta do contrato, que está no pedido).
**Depende de:** 10.

### 12. `juiz.mjs` com régua e veredito de sistema (fase B: depois do plano das landing pages)
**Arquivos:** `plugins/landing-pages/skills/lp-revisao/scripts/juiz.mjs`, `scripts/testes/juiz.test.mjs`,
`fluxo-sistema.md` (uma linha).
**Regra:**
- `montar --regua <arquivo.md>`: papéis (também no `sortear`), focos, texto do pedido e os pesos dos critérios da
  nota (hoje `PESOS` fixo de landing page, com "criatividade"; a régua de sistema usa uso 50, clareza 30,
  acabamento 20) vêm do arquivo. Sem a opção, tudo como hoje. A parte 9 acrescenta o bloco de pesos ao
  `juiz-telas.md`.
- `fechar` com régua de sistema usa um **veredito próprio**, não as réguas A/B das landing pages
  (`juiz.mjs:392–409`): guarda a mediana **por papel e por tela** (sem juntar papéis); aprova só se, **ao mesmo
  tempo**, (1) em cada uma das telas a mediana do "depois" é maior que a do "antes" (empate reprova) e (2) a média do
  "depois" nos papéis `operador` e `clareza` é ≥ 9 (DEV-58); dúvida acima de 1,5 entre juízes deixa "pendente", como
  hoje.
- No `fluxo-sistema.md`, no bloco "Telas": "fim de cada rodada de design: painel às cegas com
  `--regua juiz-telas.md`".
**Não mudar:** sorteio, cegueira, pasta temporária fora do projeto e o veredito das landing pages.
**Pronto quando:** testes com casos que **passam na régua atual e reprovam na nova**: (a) "depois" com 9,5 em tudo
mas perde numa tela → reprova; (b) ganha em todas, `operador` 8,5 → reprova; (c) empate numa tela → reprova;
(d) ganha em todas, ≥ 9 nos dois papéis → aprova. Sem `--regua`, os testes atuais passam sem mudança.
**Teste:** `node --test scripts/testes/juiz.test.mjs scripts/testes/orquestrador.test.mjs`.
**Depende de:** 9; fim do plano `2026-11-11-copia-fiel-da-referencia.md`.

### 13. Escolha da base na prova `[regente]`
**Arquivos:** `pilotos/prova-sistemas/referencias-telas/` (ignorada), `pilotos/prova-sistemas/escolha.md`,
`pilotos/prova-sistemas/depois/` (só o protótipo das variações da lista).
**Regra:** rodar a parte 8 na tela (a): galeria; o Neemias marca uma e diz o que mudar; 3 variações passadas nas
conferências; ele escolhe. `escolha.md`: referência (endereço, licença), o que ele pediu, a variação e o motivo dele.
Link local clicável sempre (USR-03).
**Pronto quando:** `escolha.md` com as três escolhas dele; a variação escolhida com saída 0 nas conferências.
**Teste:** `consistencia.mjs` e `conferir-tela.mjs` na variação escolhida, código 0.
**Depende de:** 6, 8, 11.

### 14. Construir o "depois"
**Arquivos:** `pilotos/prova-sistemas/depois/**`, `pilotos/prova-sistemas/depois/design-sistemas.json`, `DESIGN.md`.
**Regra:** executor novo que **não abre** `antes/`. Constrói as 4 telas pelo kit novo, a partir da variação
escolhida, com o mesmo orçamento do "antes", seguindo o fluxo da skill (conferências até 0 em cada tela).
**Pronto quando:** `npm run build` passa; as duas conferências dão 0 nas 4 telas, nos dois aparelhos e em todos os
estados.
**Teste:** `npm run build`, `consistencia.mjs` e `conferir-tela.mjs`, todos código 0.
**Depende de:** 13.

### 15. Medir e julgar
**Arquivos:** `pilotos/prova-sistemas/resultado.md` (novo).
**Regra:** só mede e julga; não mexe em `antes/` nem `depois/`.
- Máquina: as duas conferências nos dois sistemas, mesmas telas, aparelhos e estados; contar achados por nível.
- Tarefas: execução automatizada das 3 tarefas pelo roteiro do `pedido.md` (prova que o caminho existe e cabe no
  limite) **separada** da avaliação de uso: o Neemias faz as 3 tarefas sem roteiro, num só sistema por vez e em ordem
  trocada, registrando conclusão, erros e tempo (opcional; se não fizer, `resultado.md` diz "uso não avaliado").
- Painel: prints equivalentes dos dois (mesmos nomes, parte 4); `juiz.mjs montar <prints-depois> <prints-antes>
  <saida> --regua juiz-telas.md --juizes 5` (ordem já é trocada entre juízes). Cada juiz numa **sessão nova sem
  contexto da construção**: Codex por `codex exec` recebendo só a pasta dele, os outros como agentes novos recebendo
  só a pasta dele; a regente, que viu a construção, não julga. Depois `juiz.mjs fechar`.
- `resultado.md`: tabela antes × depois por tela e papel, achados da máquina, tarefas e a lista "o que o juiz viu e a
  máquina não" (vira item da `regua-telas.md` num lote seguinte).
**Pronto quando:** veredito do `fechar` com régua de sistema = APROVADO e as 3 tarefas automatizadas dentro do
limite. Se não chegar, `resultado.md` diz o que falta; não se mostra como pronto (DEV-58).
**Teste:** os comandos acima; `node juiz.mjs fechar <saida>` com código 0.
**Depende de:** 12, 14.

## Testes finais
- `node --test "scripts/testes/*.test.mjs"` e conferir o **código de saída** (sem `| grep`).
- Ao menos uma execução real de Chrome das partes 3, 4 e 6 registrada (testes de Chrome não podem ter pulado todos).
- `claude plugin validate .` e `claude plugin validate plugins/design-sistemas`; também `plugins/devconductor-core`
  (L3, L6, L9) e `plugins/landing-pages` (L9).
- `node scripts/atualizar-marketplace.mjs` depois de cada versão nova (o teste `versoes` barra se esquecer).
- Revisor independente + Codex sobre cada lote (DEV-64, DEV-65).

## Riscos e o que não dá para garantir
- **Motor emprestado:** se o plano das landing pages mudar `acharNavegador`, `motorChrome` ou `contraste`, as partes 3,
  4 e 6 quebram; os testes delas acusam, e o lote de espera manda rodá-los de novo.
- **Foco por diferença de pixels** pode dar falso "passou" em foco muito sutil (mudança de 1 tom); o mínimo de
  diferença fica no teste e ajusta-se com o que o painel achar.
- **Contrato de estados** é exigência nova para os sistemas do kit: projeto antigo sem ele sai "não conferido" nos
  estados, nunca "passou".
- **Juízes de modelo** julgam print; teclado e funcionamento ficam com a máquina e as tarefas. Celular de verdade
  continua sendo a conferência final do Neemias.
- **Prova pequena** (4 telas fictícias) prova que o kit novo ganha do velho na mesma tarefa, não que serve para todo
  sistema grande.
- **Tamanho:** o plano foi de 12 para 15 partes pela revisão (navegador em 3 partes, "antes" em sessão isolada,
  construção separada da medição). A entrega mínima (1 a 5) já entrega o principal.

## Depois (fora deste plano)
- Mover o motor do Chrome para um lugar comum aos plugins, se o resolvedor por pasta der problema.
- Conferidor de código para Vue, Svelte e Blazor.
- Tema escuro na régua (contraste em todos os temas).

## Conhecimento candidato
- No Sistema de Gestão as regras de interface existiam e o código se afastou delas: para sistema, o que falta ao kit
  é **conferência automática da regra**, mais que regra nova. (destino: `docs/decisoes.md`, próxima DEV livre)
- O design do Sistema de Gestão não muda; ele é só exemplo lido; a prova é um sistema fictício em
  `pilotos/prova-sistemas/` (correção do dono em 11/11; complementa a DEV-81).
- O `abrir` do `celular.mjs` força celular em qualquer largura: script que precise de computador faz o próprio
  adaptador, como o `acabamento.mjs`. (destino: `plugins-armadilhas.md`)
