# Conteúdo extremo: tentar quebrar a página

> Adaptado de emilkowalski/skills (`skills/break-ui`, SKILL.md e CATALOG.md, commit 715c180), licença MIT,
> Copyright (c) 2026 Emil Kowalski; texto da licença em `skills/break-ui/LICENSE` deste plugin.
> Traduzido, resumido e ajustado para landing page de pequena empresa (ver NOTICE e fontes.json).

## Por quê
O texto de exemplo é escolhido, sem querer, para a página ficar bonita: nome que cabe numa linha, número sem
milhar, toda foto presente. O cliente troca o texto depois e a página quebra. Aqui se desfaz essa escolha, campo
por campo, **com valor que existe de verdade** (nada de "aaaaaaa" com 5 mil letras: isso não convence ninguém).

## Regras
1. Valor plausível ou o limite real do formulário/banco. Sem limite conhecido: anotar "sem limite" como achado.
2. Trocar o **dado** (o arquivo de conteúdo, como `src/data/conteudo.ts`), nunca o HTML ou o CSS à mão.
3. Um único conjunto de pior caso, com as falhas espalhadas (o 1º depoimento longo, o 2º curto, o 3º sem foto).
4. A chave "Demo / Pior caso" (ex.: `?dados=pior`) só existe em desenvolvimento; nunca vai ao ar.
5. Relatar antes de consertar. Truncar ou quebrar linha é decisão do dono, não da revisão.

## O que testar numa landing page
| Campo | Pior caso plausível | Costuma quebrar |
|---|---|---|
| Nome da empresa | `Marcenaria e Móveis Planejados Irmãos Albuquerque-Vasconcellos` | cabeçalho, logo em texto, rodapé |
| Nome curto | `Jó` | coluna vazia, iniciais erradas |
| Título | frase de 3 linhas com palavra longa (`Inconstitucionalissimamente`) | quebra no meio da palavra, órfã |
| E-mail | `atendimento.orcamentos@marcenaria-albuquerque-vasconcellos.com.br` | passa da borda (não tem espaço) |
| Endereço | rua, número, complemento, bairro, cidade/UF em uma linha | rodapé, cartão de contato |
| Telefone | `+55 (00) 00000-0000` e um 0800 | quebra no meio do número |
| Preço | `R$ 12.345.678,90`, `R$ 0,00`, sem preço | coluna de valor, "a partir de" |
| Contagem | `0`, `1`, `1.284` avaliações | "1 avaliações", milhar sem ponto |
| Depoimento | uma linha; 600 caracteres; nome com acento e emoji | cartões com alturas diferentes |
| Lista (serviços, fotos) | 0, 1, exatamente o que cabe, uma a mais | grade com buraco, carrossel vazio |
| Foto | ausente, link quebrado, panorâmica 4000×200, em pé 200×4000 | ícone quebrado, imagem esticada |
| Texto com marcação | `&amp;`, `<b>`, `**negrito**` | aparece cru na tela |

## Onde olhar
Na largura real do bloco, em **320 px** e na mais larga; com **zoom de 200%** (texto cresce, caixa não); no tema
escuro se houver. Tirar print dos dois estados em cada largura (pode usar `celular.mjs`/`prints.mjs`).

## Sintoma → causa → conserto
| O que aparece | Causa | Conserto |
|---|---|---|
| Ícone ou avatar amassado em oval | item flex encolhendo | `shrink-0` |
| Texto vaza em vez de quebrar | filho flex/grid com `min-width: auto` | `min-w-0` (`minmax(0,1fr)` na grade) |
| E-mail ou link passa da borda | sem ponto de quebra | `overflow-wrap: anywhere` (`break-words`) |
| Botão do fim da linha some | o meio ocupou tudo | `min-w-0` no meio, `shrink-0` no botão |
| Selo quebra em duas linhas | selo pode encolher | `whitespace-nowrap shrink-0` |
| Palavra quebra no meio do título | `word-break: break-all` | `overflow-wrap: anywhere` |
| Acento cortado em cima | entrelinha curta + `overflow: hidden` | entrelinha maior, sem cortar texto |
| "1 avaliações" | plural fixo | `Intl.PluralRules('pt-BR')` ou frases por contagem |
| `1284`, `NaN`, `undefined` na tela | número cru | `Intl.NumberFormat('pt-BR')` e guarda para vazio |
| Número "pula" ao mudar | algarismos proporcionais | `tabular-nums` |
| Foto quebrada | sem plano B | `onError` com fundo de cor; `object-fit: cover` |
| Página pula ao carregar foto | sem tamanho | `width`/`height` ou `aspect-ratio` |
| Texto cortado sem como ler | só reticências | texto inteiro em outro lugar ou `title` |

## Quebrar, cortar ou limitar
Quebrar linha no que identifica (nome, título). Cortar no fim só o secundário, com como ler inteiro. Limitar a
2–3 linhas (`line-clamp-2`) em prévias de cartão. **Nunca cortar** preço, telefone, data ou número comparável.

## Relatório
Tabela `# | Gravidade | Campo | Valor | O que acontece | Conserto (arquivo:linha)`, com gravidade **Quebrado**
(ilegível, ação inalcançável), **Feio** (legível mas errado) ou **Frágil** (bom hoje, a um passo de quebrar).
Depois: decisões para o dono (uma linha cada, com recomendação) e o que aguentou bem.
