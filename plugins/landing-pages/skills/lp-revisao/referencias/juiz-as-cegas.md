# Juiz às cegas: um painel de olhares diferentes, uma nota

A nota de design da página não vem de quem a fez. Vem de um painel de quatro juízes (no mínimo três) que olham só
imagens, sem saber qual site é o nosso e qual é a referência. Um juiz sozinho muda cerca de meio ponto de uma
rodada para outra com as mesmas imagens; por isso a nota que vale é a **mediana do painel**. E juízes parecidos
valem como um só: cada juiz tem um **papel** diferente e, quando houver, um **modelo** diferente.

## Regras

1. **Quatro juízes independentes (no mínimo três), cada um com um papel.** Cada um é um agente novo, de contexto
   limpo, que recebe só o caminho da própria pasta. Um não vê a resposta do outro.
2. **O juiz só lê a própria pasta, e ela fica longe do projeto.** O `montar` cria cada pasta de juiz num diretório
   neutro, fora do projeto (pasta temporária do sistema, nome sorteado `avaliacao-xxxx`, sem nome de cliente). O
   juiz não recebe o endereço do site, o código, o nome do cliente, o plano, a pasta `gabarito/` nem as pastas dos
   outros juízes; o gabarito nunca fica ao lado do que ele lê. Quem chama o juiz não comenta qual lado é qual.
3. **Juiz que viu o gabarito não julga de novo.** Quem montou o material, quem abriu `gabarito/` ou quem leu a
   `nota-final.md` não serve de juiz, nem nesta rodada nem nas próximas. Rodada nova, juízes novos.
4. **Mesmas condições para os dois lados.** O script deixa os dois sites na mesma resolução e no mesmo formato de
   arquivo, sorteia letras diferentes para cada juiz e cada tela e inverte a ordem de apresentação de um juiz
   para o outro. Não renomear nem trocar arquivos à mão depois de montar.
5. **A conta é do script.** O juiz dá as quatro notas por seção; a nota da seção (pesos abaixo), a mediana e o
   veredito saem do `juiz.mjs fechar`.

## Como rodar

```
node <lp-revisao>/scripts/juiz.mjs montar <prints-nosso> <prints-referencia> <pasta-saida> [--juizes n] [--papeis a,b,c] [--semente n] [--mapa mapa.json] [--parcial]
node <lp-revisao>/scripts/juiz.mjs fechar <pasta-saida>
```

**Quantos juízes e quais papéis.** `--juizes n` (de 3 a 8; padrão 4, um por papel, o dono do negócio incluído).
Os papéis são distribuídos na ordem `direcao-de-arte`, `tipografia`, `celular`, `dono`; com `--juizes 3` entram
os três primeiros. `--juizes 3 --papeis celular,dono,tipografia` escolhe outros papéis ou outra ordem (sem
`--juizes`, monta um juiz por papel, no mínimo 4; por isso três papéis pedem `--juizes 3`). Juízes do mesmo papel valem como um só: papel só se repete quando há mais juízes
que papéis. Com n juízes são precisos pelo menos min(n, 4) papéis diferentes; `--papeis` com repetição abaixo
disso é erro.

**Prints.** Usar os prints **originais** da referência (os que o `prints.mjs` gravou do site dela), não imagem
recortada, reduzida ou remontada à mão. Cada lado é uma pasta com arquivos `<tela>-<secao>.png` (ou `.jpg`, `.webp`), como o `prints.mjs`
grava: `computador-topo.png`, `celular-contato.png`. Telas aceitas: `computador`, `tablet`, `celular`. Outros
arquivos da pasta são ignorados. **Toda tela e toda seção dos dois lados vai ao juiz:** tela ou seção que só
existe de um lado, ou que ficou fora do mapa, é erro (saída 2). Para julgar só uma parte de propósito, use
`--parcial`: o que ficou de fora é listado no `montar` e na `nota-final.md`, e a nota não vale para essas partes.

**Pareamento das seções** (qual print do nosso fica ao lado de qual print da referência, e em que ordem):

- Com `--mapa`: um arquivo JSON com a lista na ordem da página. Vale para todas as telas:
  `[{ "nosso": "topo", "referencia": "1" }, { "nosso": "oficio", "referencia": "2" }]`. Para ordem diferente por
  tela, use `{ "computador": [...], "celular": [...] }`. O nome é o que vem depois de `<tela>-`, sem a extensão.
- Sem mapa e com os mesmos nomes nos dois lados: pareia pelo nome, em ordem alfabética com número contando como
  número (`1, 2, 10`). Para a ordem ser a da página, numere os prints ou use o mapa.
- Sem mapa, nomes diferentes e a mesma quantidade: pareia pela posição nessa mesma ordem e avisa. Confira o aviso;
  na dúvida, use o mapa.
- Quantidades diferentes sem mapa: o script para e pede o mapa.

**O que o `montar` grava** (a pasta de saída tem de ser nova ou vazia):

```
<pasta neutra do juiz 1>/pedido.md                   o pedido deste juiz, já com o papel e as letras dele
<pasta neutra do juiz 1>/<tela>/<LETRA>/secao-N.jpg  os dois sites, na mesma resolução
<pasta neutra do juiz 2>/...   (uma por juiz, em <temp>/avaliacao-xxxx, fora do projeto)
<pasta-saida>/gabarito/gabarito.json                 quem é quem (o juiz não lê)
<pasta-saida>/gabarito/pastas.json                   onde ficou a pasta de cada juiz (juiz-1, juiz-2...)
```

O `montar` imprime o caminho da pasta de cada juiz; é esse caminho (e só ele) que o juiz recebe. Para chamar o
juiz: "Leia `<pasta neutra do juiz>/pedido.md` e faça o que ele pede. Leia só essa pasta."

A redução é feita dentro do Chrome ou Edge (sem programa extra): o lado maior desce para a largura do menor.
**Nada é cortado:** se as alturas forem diferentes, o mais baixo é completado embaixo com uma faixa cinza neutra
(`#808080`) até a altura do outro, e o script avisa; a seção inteira é julgada. A faixa cinza é só enchimento:
não faz parte de nenhum dos sites (o pedido ao juiz diz isso). Todos saem em JPEG.

**O que o `fechar` faz.** Lê o `notas.json` de cada juiz na pasta neutra dele (caminhos em
`gabarito/pastas.json`; a quantidade vem do gabarito), copia para `<pasta-saida>/juiz-N/notas.json`, abre o
gabarito e grava `<pasta-saida>/nota-final.md` com: o painel (quem teve qual papel), a mediana
por tela e seção, a diferença entre a maior e a menor nota, quantos juízes apontaram o nosso como adaptado, o
veredito, primeiro o **consenso** (o que 2 ou mais juízes apontaram na mesma tela e seção, com a contagem) e
depois, por papel, **o que só aquele juiz apontou** (item numa tela e seção em que nenhum outro juiz apontou
nada; a comparação é por tela e seção, não pelo texto). Quando a diferença maior-menor de uma seção passa de
**1,5 ponto** no nosso, a seção sai marcada **"dúvida: chamar o dono"**: a mediana não resolve discordância desse
tamanho (discordância sobre a referência não conta: não muda o que fazer na nossa página). Se as réguas
aprovariam e há dúvida, o veredito é **PENDENTE** até o dono decidir. Código de saída: 0 aprovado, 1 reprovado,
2 erro (falta nota, arquivo fora do formato, cobertura incompleta sem `--parcial`), 3 pendente do dono.

## Veredito: duas réguas

Aprovado se passar em **uma** das duas:

- **Régua A:** toda mediana do nosso é 9 ou mais.
- **Régua B:** em cada tela, a mediana do nosso é maior ou igual à da referência em **toda** seção **e** a média
  das medianas do nosso é pelo menos a média da referência **+ 0,5**.

A régua B existe porque a referência premiada não tira 9 em tudo com o painel: no primeiro painel ela levou de
6,3 a 8,1, então um piso fixo (o antigo 8,5) era inalcançável e não dizia nada. Vale ganhar dela, com folga. As
duas ficam registradas na `nota-final.md`, com as médias de cada tela. Dúvida no nosso com as réguas passando:
PENDENTE (acima). Se **dois ou mais** juízes apontarem o nosso como adaptado (não precisa ser a maioria), a nota
sai com aviso: tratar antes de mostrar a página, mesmo aprovada.

## Formato do `notas.json`

Cada juiz grava `notas.json` na própria pasta. As letras são as da pasta dele; as seções são os números dos
arquivos (`secao-1.jpg` é a seção `"1"`).

```json
{
  "juiz": 1,
  "telas": {
    "computador": {
      "D": {
        "secoes": {
          "1": { "design": 8.5, "usabilidade": 9, "criatividade": 8, "conteudo": 9 },
          "2": { "design": 9, "usabilidade": 9, "criatividade": 8.5, "conteudo": 9 }
        },
        "impede": [
          { "secao": 1, "lugar": "título da abertura", "problema": "corta a foto no meio do rosto", "correcao": "descer o título 40 px ou trocar o recorte" }
        ]
      },
      "H": { "secoes": { "1": 8.5, "2": 9 }, "impede": [] }
    }
  },
  "adaptado": { "computador": "nenhum" }
}
```

- Nota de 0 a 10, com meio ponto se precisar. Cada seção leva as quatro notas (o script aplica os pesos) ou um
  número só, já com os pesos aplicados.
- Pesos: **design 40, usabilidade 30, criatividade 20, conteúdo 10**.
- `impede`: o que impede o 9, com a seção, o lugar na imagem, o problema e a correção. Lista vazia se nada impede.
- `adaptado`: por tela, a letra do site que parece adaptado de outro site ou montado por gerador, ou `"nenhum"`.

## Painel: papéis e modelos

- **Papéis diferentes.** Todos usam a mesma rubrica e o mesmo `notas.json`; o papel muda para onde o juiz olha
  primeiro e o que mais cobra em `impede`. O texto de cada papel está abaixo e entra no pedido do juiz.
- **Modelos diferentes, quando houver.** Variar o modelo entre os juízes (Fable, Opus, Sonnet; o Codex entra do
  jeito descrito mais abaixo). **Modelo de outra família vale mais que mais um juiz igual.** Sugestão com o que
  já há na máquina: direção de arte no modelo de mais gosto, tipografia no segundo, celular e dono no terceiro.
- **Dúvida vai para o dono.** Seção com diferença acima de 1,5 ponto não se resolve chamando mais juízes iguais.
  Quando a dúvida for de gosto, mostrar ao dono **duas opções lado a lado (A/B)**, na mesma tela e no mesmo
  tamanho, e perguntar qual das duas; não pedir que ele descreva o que quer.

Texto de cada papel (o `montar` lê daqui; papel novo é um bloco novo com os mesmos marcadores):

<!-- papel:direcao-de-arte -->
Olhe a página como diretor de arte. Cobre primeiro a **composição**: o que o olho vê em primeiro, segundo e
terceiro lugar em cada seção; se a imagem e o título formam uma cena ou só dividem a tela; peso e respiro dos
blocos; se as seções têm ritmo (grande, pequeno, cheio, vazio) ou repetem a mesma grade; se a cor e a foto
contam a mesma história. Diga se há uma ideia própria ou se é um arranjo que serviria a qualquer empresa.
<!-- papel:fim -->

<!-- papel:tipografia -->
Olhe a página como tipógrafo e revisor de acabamento. Cobre primeiro a **letra e o detalhe**: escolha e par de
fontes, hierarquia de tamanhos, entrelinha (linhas de título que se tocam, acento que encosta na linha de cima),
palavra sozinha na última linha, largura da linha de leitura, alinhamento de bordas, espaços desiguais entre
blocos, contraste do texto sobre a foto, imagem borrada ou esticada, botão ou selo cobrindo conteúdo.
<!-- papel:fim -->

<!-- papel:celular -->
Olhe a página como quem usa o **celular com uma mão**. Comece pela tela de celular, se houver, e dê a ela o maior
cuidado: o texto se lê sem aproximar; o botão principal aparece cedo e tem tamanho de dedo; nada fixo tapa o
conteúdo; a foto foi recortada para a tela em pé ou só encolhida; a ordem das seções faz sentido rolando; sobra
ou falta espaço entre os blocos. Nas outras telas, cobre o mesmo: achar o que importa e saber onde tocar.
<!-- papel:fim -->

<!-- papel:dono -->
Olhe a página como o **dono de um negócio** que está escolhendo quem contratar e não entende de design. Antes de
dar as notas, olhe só a primeira imagem de cada site por cinco segundos e responda para si: entendi o que a
empresa faz? Sei como pedir orçamento ou falar com ela? Confiaria nela? Depois olhe o resto. Cobre o que deixa
dúvida ou tira confiança: frase que não diz nada, foto que não mostra o serviço, falta de cidade, de prova ou de
contato à vista. Em `impede`, escreva do jeito que um cliente falaria.
<!-- papel:fim -->

## O pedido para o juiz

O `montar` grava este texto no `pedido.md` da pasta neutra de cada juiz, trocando as partes entre chaves duplas (o papel e o foco
vêm dos blocos acima). Para chamar o juiz basta: "Leia `<pasta neutra do juiz>/pedido.md` e faça o que ele
pede. Leia só essa pasta." Não mudar o texto à mão num juiz só: muda o papel, o resto do pedido é igual para todos.

<!-- pedido:inicio -->
# Pedido ao juiz {{JUIZ}}

Você é jurado de um prêmio de design de sites. Nesta pasta há prints de dois sites, cada um chamado por uma
letra. Leia **só esta pasta**: não abra outras pastas, não procure os sites na internet, não peça o endereço nem
o código. Julgue apenas o que aparece nas imagens.

## Seu papel: {{PAPEL}}

{{FOCO}}

O papel diz para onde olhar primeiro e o que mais cobrar. As notas, a régua e o formato da resposta são os mesmos
de todos os jurados: dê as quatro notas de cada seção, não só a do seu papel.

## O que há aqui

{{TELAS}}

Cada pasta de letra traz as seções da página na ordem em que aparecem (`secao-1.jpg` é o alto da página). Olhe
todas as imagens de um site antes de passar para o outro, na ordem indicada acima. Uma faixa cinza lisa embaixo
de uma imagem é só enchimento para as duas imagens da mesma seção terem o mesmo tamanho: não faz parte de nenhum
site e não conta na nota.

## Como dar a nota

Para cada site, em cada tela, dê quatro notas de 0 a 10 por seção (pode usar meio ponto):

- **design** (peso 40): tipografia, imagem, cor, espaço, alinhamento, acabamento.
- **usabilidade** (peso 30): dá para ler, entender onde clicar e achar o que importa; nada tapa nada.
- **criatividade** (peso 20): ideia própria, cena que fica na memória; não parece modelo pronto.
- **conteudo** (peso 10): o texto e as imagens dizem algo concreto sobre a empresa.

Régua: 9 é nível de site premiado; 7 é bom e comum; 5 tem defeito que se vê de primeira. Use a mesma régua para
os dois sites e não dê nota por simpatia. Não faça a conta dos pesos: ela é feita depois.

Para cada site, liste **o que impede o 9**: a seção, o lugar na imagem, o problema e a correção. Seja concreto
("o botão verde cobre a última linha do texto; subir o texto 24 px"), não genérico ("melhorar o espaçamento").

Por fim, em cada tela, diga se um dos dois sites parece **adaptado** de outro site ou montado por gerador
automático (a letra dele) ou `"nenhum"`.

## Como responder

Grave a resposta no arquivo `notas.json`, nesta mesma pasta, exatamente neste formato (todas as telas, as duas
letras de cada tela e todas as seções; os valores abaixo são só exemplo):

```json
{{MODELO}}
```

Não escreva mais nada fora do `notas.json`.
<!-- pedido:fim -->

## O olhar do Codex (outra família de modelo): entra sempre

Não entra na mediana. Entra em **toda** rodada, de dois jeitos, sempre só leitura e com o pedido num arquivo (o
raciocínio dele não entra na conversa).

**1. Comparação de pares, nas duas ordens (às cegas).** Para cada seção, o Codex recebe as duas imagens de uma
pasta de juiz (as letras já escondem quem é quem) e diz qual é melhor e por quê. Roda duas vezes, trocando a
ordem das imagens. **Só vale quando as duas ordens concordam**; se discordarem, é empate (modelo costuma
preferir a primeira ou a segunda imagem).

O Codex roda **dentro da pasta neutra** do juiz (`-C <pasta neutra>`, caminho que o `montar` imprimiu), nunca
dentro do projeto: assim o caminho e a pasta de trabalho não entregam o cliente nem o gabarito. O pedido do par
fica fora do projeto também (por exemplo `<temp>/pedido-par.md`); a resposta pode ir para a pasta de saída. Como
a pasta neutra não é repositório git, o `codex exec` exige `--skip-git-repo-check` (sem ele, recusa rodar).
Caminhos sempre entre aspas: pasta com espaço quebra o argumento.

Bash:

```
codex exec -s read-only --ephemeral --skip-git-repo-check -C "<pasta neutra>" -i "<tela>/<LETRA1>/secao-1.jpg" -i "<tela>/<LETRA2>/secao-1.jpg" -o "<pasta-saida>/codex/par-1-ida.md" - < "<temp>/pedido-par.md"
codex exec -s read-only --ephemeral --skip-git-repo-check -C "<pasta neutra>" -i "<tela>/<LETRA2>/secao-1.jpg" -i "<tela>/<LETRA1>/secao-1.jpg" -o "<pasta-saida>/codex/par-1-volta.md" - < "<temp>/pedido-par.md"
```

PowerShell 5.1 (não tem `<` para entrada; o texto vai pelo cano). A primeira linha faz o cano mandar UTF-8 e o
`-Encoding UTF8` faz a leitura entender os acentos; sem os dois, o pedido chega com letras trocadas:

```
$OutputEncoding = [Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Get-Content -Raw -Encoding UTF8 "<temp>\pedido-par.md" | codex exec -s read-only --ephemeral --skip-git-repo-check -C "<pasta neutra>" -i "<tela>\<LETRA1>\secao-1.jpg" -i "<tela>\<LETRA2>\secao-1.jpg" -o "<pasta-saida>\codex\par-1-ida.md" -
Get-Content -Raw -Encoding UTF8 "<temp>\pedido-par.md" | codex exec -s read-only --ephemeral --skip-git-repo-check -C "<pasta neutra>" -i "<tela>\<LETRA2>\secao-1.jpg" -i "<tela>\<LETRA1>\secao-1.jpg" -o "<pasta-saida>\codex\par-1-volta.md" -
```

Texto do `<temp>/pedido-par.md`: "As duas imagens anexas são a mesma seção de dois sites. Não leia nenhum arquivo.
Diga qual das duas (primeira ou segunda) tem o melhor design e acabamento, em uma linha, e liste até três
motivos concretos, com o lugar na imagem. Se forem equivalentes, diga empate." Quem roda anota qual letra foi a
primeira em cada chamada e só abre o gabarito depois das duas respostas.

**2. Prints e código (não é às cegas).** Serve para pegar o que imagem parada não mostra: defeito no código,
movimento, estado de foco, quebra em largura que não foi fotografada. Roda depois dos juízes:

```
codex exec -s read-only --ephemeral -C "<projeto>" -o "<pasta-saida>/codex/resposta.md" - < "<pasta-saida>/codex/pedido.md"
```

PowerShell 5.1 (mesma primeira linha de UTF-8 acima):

```
$OutputEncoding = [Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Get-Content -Raw -Encoding UTF8 "<pasta-saida>\codex\pedido.md" | codex exec -s read-only --ephemeral -C "<projeto>" -o "<pasta-saida>\codex\resposta.md" -
```

Texto do `codex/pedido.md` (trocar os caminhos):

```
Revise o acabamento desta página como um revisor de design exigente. Só leitura: não altere nenhum arquivo.
Prints da nossa página: <prints-nosso>. Código: <pasta do site>/src.
Não leia <pasta-saida>/gabarito nem <pasta-saida>/nota-final.md.
1. Olhe os prints de computador e de celular, seção por seção, e liste os defeitos de acabamento: texto cortado
   ou tapado, alinhamento, espaço desigual, contraste, imagem fraca, menu ou botão fixo cobrindo conteúdo.
2. Leia o código das seções e liste o que os prints não mostram: movimento sem versão reduzida, foco do teclado,
   tamanho de toque, largura em que algo quebra, imagem sem tamanho declarado.
3. Para cada item: seção, arquivo e linha (quando for do código), gravidade (alta, média, baixa) e a correção.
Responda em português simples, em lista, do mais grave para o menos grave. Sem elogios.
```

O que o Codex achar e for verdade entra na lista de correções junto com os itens de `impede` dos juízes. Achado
dele não muda a nota: muda a página, e a página volta para juízes novos.

## Prints para o juiz

Lições do primeiro painel (11/11, cinco juízes):

- **Barra ou botão fixo só no print da primeira seção.** Nos outros prints ele tapa conteúdo, e três juízes
  descontaram por isso. Tirar os prints das seções seguintes sem o elemento fixo (escondido só para o print).
- **Página de teste com empresa inventada não mostra aviso de "fictício", endereço "Exemplo" nem "foto
  ilustrativa" nos prints do juiz.** Os 5 juízes marcaram o nosso como adaptado por causa disso. Nos prints, usar
  dados com cara de verdade (sem pertencer a ninguém real); o aviso continua na página publicada.
- **Variar o modelo funciona.** O juiz leigo (modelo pequeno, papel de dono) achou o que os outros não acharam.
  Manter pelo menos um juiz em modelo diferente dos demais.

## Juiz de movimento

Print parado não mostra animação. O movimento é julgado à parte, por um juiz que recebe uma **tira de quadros**
(a mesma cena fotografada em sequência, por exemplo 8 a 12 quadros da entrada da abertura e de uma troca de
seção) e segue `critica-de-movimento.md`: parte de "há defeito", olha curva, duração, ordem de entrada e o
quadro em que algo pisca, pula ou atrasa. Ele não dá nota na rubrica: devolve a lista de defeitos, que entra nas
correções. **Limite de hoje:** o kit ainda não gera a tira sozinho; os quadros são tirados à mão (prints em
sequência ou os quadros de uma gravação) até existir um script para isso.
