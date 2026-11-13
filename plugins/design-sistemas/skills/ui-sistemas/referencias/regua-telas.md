# Régua de telas de sistema

O que a máquina confere antes de qualquer olho humano, e o que só o olho julga. Cada critério tem um id único; os
conferidores citam o id em cada achado e a configuração (`design-sistemas.json`) usa o mesmo id nas exceções.

## Níveis e saída
- **nunca passa:** reprova sempre (saída 1). Não aceita exceção: exceção registrada para ele é ignorada e avisada.
- **exige justificativa:** reprova (saída 1), a não ser que haja exceção `{regra, arquivo, local, motivo}` na
  configuração para aquele local exato. A exceção apaga só o achado da mesma regra no mesmo local.
- **aviso:** aparece no relatório e não muda a saída.

Códigos de saída de todos os conferidores: **0** tudo conferido e passou · **1** algum achado que reprova · **2** algo
não deu para conferir (sem configuração, configuração inválida, arquivo de outra stack, trecho dinâmico não medido
— classe montada em código, chamada de variantes cujo `cva` não foi achado, cor ou letra dinâmica em `style={{...}}` —,
sem navegador, sem o plugin `landing-pages`, cobertura do teclado incompleta). Quando há achado que reprova e algo
não conferido ao mesmo tempo, vale 1. "Não medido" nunca vira "passou".

## Critérios da máquina: código (`scripts/consistencia.mjs`, sem navegador)
| Id | Nível | O que reprova |
|---|---|---|
| `peca-base` | exige justificativa | `<input>`, `<textarea>`, `<button>`, `<select>` ou `<th>` em JSX fora dos arquivos declarados em `pecas` (componente que embrulha a peça, importa o arquivo dela e usa a peça é aceito; import sem uso não conta; texto dentro de string ou comentário não é tag) |
| `letra-escala` | exige justificativa | Tamanho de letra fora de `letra.tamanhos`, ou arbitrário (`text-[13px]`, `font-size: 13px` em CSS, `fontSize: 13` em `style={{...}}`) |
| `espaco-escala` | exige justificativa | Espaço arbitrário (`p-[13px]`, `gap-[7px]`, `mt-[18px]`) ou fora do passo (`p-3.25`): fora da escala de 4 px. O meio passo da escala padrão (`p-1.5`, `gap-0.5`) é aceito |
| `raio-superficie` | exige justificativa | Raio que não é o de nenhuma superfície em `raio`, ou arbitrário (`rounded-[10px]`) |
| `cor-token` | exige justificativa | Cor fora dos tokens de `cores.funcao` e de `cores.negocio`: paleta crua (`bg-red-500`), hexadecimal (também em CSS e em `style={{...}}`), variável que não é token (em CSS: que não é token nem foi declarada em nenhum CSS) |
| `foco-substituto` | nunca passa | `outline-none` sem `focus-visible:` que desenhe algo na mesma lista de classes (`focus-visible:ring-0` e só a cor do anel não contam), ou `outline: none` em CSS sem regra `:focus-visible` do mesmo elemento que desenhe o foco |
| `aviso-validacao` | aviso | `toast.error` dentro de função de validação: o erro de campo fica no campo |
| `tela-tamanho` | aviso | Arquivo de tela com mais de 400 linhas: dividir em partes |
| `cabecalho-tabela` | exige justificativa | Cabeçalhos de tabela com classes diferentes entre telas (alinhamento e largura não contam) |

## Critérios da máquina: navegador (`scripts/conferir-tela.mjs`, partes 3, 4 e 6 do plano)
| Id | Nível | O que reprova |
|---|---|---|
| `rolagem-lateral` | nunca passa | A página rola de lado (rolagem dentro de um elemento com `overflow-x: auto`, como tabela no celular, é permitida) |
| `elemento-cortado` | exige justificativa | Texto ou controle cortado pela borda do pai |
| `letra-minima` | exige justificativa | Letra abaixo de `letra.minimoPx` (nos dois aparelhos) ou, no celular, campo em que se digita abaixo de `letra.minimoCampoCelularPx` (`input` de texto, `textarea`, `select` nativo, `contenteditable`, `textbox`, `searchbox`, `spinbutton`, `combobox` que é `input`; botão com `role="combobox"` não dá zoom e segue o mínimo geral) |
| `toque-minimo` | exige justificativa | Alvo de toque menor que 44 px no celular |
| `contraste` | nunca passa | Texto abaixo de 4,5:1 (3:1 para texto grande e borda de campo); texto sobre imagem ou degradê sai "não medido" |
| `nome-acessivel` | nunca passa | Campo, botão ou link sem nome acessível (lido do próprio Chrome) |
| `tabela-sem-cabecalho` | exige justificativa | `<table>` sem `<th>` (ou grade sem `columnheader`) |
| `lista-virtual` | aviso | Lista virtual: só o que está na tela foi conferido |
| `estado-confirmado` | nunca passa | Estado pedido pelo contrato que não aparece com a raiz do marcador visível (a tela ignora o pedido ou só põe o marcador escondido) |
| `estado-estavel` | nunca passa | Estado que não estabiliza em 10 s (texto, quantidade, posição, tamanho e aparência dos elementos). Animação CSS declarada com repetição infinita (esqueleto pulsando, girador) não conta: é carregamento legítimo; piscar feito por script conta |
| `tentar-de-novo` | nunca passa | "Tentar de novo" ausente, escondido ou encoberto no erro, ou que (clicado por coordenadas) não leva a tela a outro estado estável |
| `tela-em-branco` | nunca passa | Tela sem texto visível em algum estado; no `vazio`, a raiz do estado sem texto visível fora de título (só "Pedidos" não explica o vazio) |
| `foco-visivel` | nunca passa | Item que recebe foco pelo teclado sem diferença visível em volta dele |
| `janela-foco` | nunca passa | Janela que não recebe o foco, deixa o foco escapar com Tab ou não fecha com Esc devolvendo o foco |
| `setas-componente` | aviso | Componente de setas (abas, menu, grade, lista) sem navegação por setas |

Cobertura do teclado: o percurso com Tab para em 300 itens; passando disso sai "cobertura incompleta: N de M" e a
saída é 2.

## Critérios do olho (só o que se vê no print; viram os papéis do juiz de telas)
| Id | O que o juiz olha |
|---|---|
| `operador` | Dá para achar e fazer a tarefa da tela de relance; a ação principal está onde se espera |
| `clareza` | O principal salta e nada compete; hierarquia por tamanho, peso e cor do texto, não por caixas; uma cor de destaque por tela |
| `celular` | No print de celular: toque confortável, tabela que vira cartão ou rola só dentro dela, leitura sem zoom |
| `acesso-visual` | Contraste, tamanho de letra e foco desenhado quando aparece no print |
| `coerencia` | A mesma coisa com a mesma cara em todas as telas (cabeçalho, tabela, estados, raio); sombra só no que flutua; estado normal discreto e cor só no que pede atenção; beleza contida |

O que o painel achar e a máquina não pegar vira item novo nesta régua.
