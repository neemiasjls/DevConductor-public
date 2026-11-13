---
name: lp-video
description: Gera o vídeo de venda de um site pronto - MP4 em pé (1080 x 1920, 30 quadros por segundo, 10 a 15 s) com o site de verdade funcionando, o nome da empresa na abertura e a chamada com o contato no fecho, mais a versão leve para o WhatsApp. Use depois que o site passou na revisão, para mandar ao dono na hora da venda, ou quando pedirem "vídeo do site", "vídeo para o WhatsApp" ou "reels do site".
---

# Vídeo de venda do site

Um vídeo curto, em pé, para o dono ver o site dele funcionando sem abrir link nenhum. Sai de um comando só, sem
dependência nova: usa o Chrome ou Edge instalado e o `ffmpeg`.

## Quando usar
- O site já está pronto e passou na `lp-revisao`. Vídeo de site com defeito mostra o defeito 30 vezes por segundo.
- Na venda: mandar o vídeo leve no WhatsApp antes (ou junto) do link.
- Não é para: anúncio com narração, vídeo com música, vídeo horizontal. O vídeo sai sem som.

## Como rodar
```
node <plugin>/skills/lp-video/scripts/video-de-venda.mjs <pasta-do-build | http://endereço-local> \
  --saida <pasta-fora-do-git> --nome "Empresa" --sub "Ramo · Cidade" \
  --chamada "Frase de chamada" --botao "Pedir orçamento" --contato "WhatsApp (00) 00000-0000" \
  --secao "#inicio=Início" --secao "#servicos=Serviços" --secao "#sobre=Quem faz" \
  --modelo todos
```
- **Site:** a pasta do build (com `index.html`) ou o endereço local do site rodando. Sempre o build de produção.
- **Seções:** `seletor=rótulo`, na ordem em que aparecem; de 3 a 5 dá o melhor ritmo. O rótulo é o que vai escrito
  no vídeo (curto, 1 a 3 palavras). Sem `--secao`, o script pega sozinho até 5 seções com `id` e usa o título de
  cada uma; conferir no relatório se pegou as certas.
- **Textos:** `--nome`, `--chamada` e `--contato` são obrigatórios. `--sub`, `--botao` e `--aviso` (linha pequena
  do fim, por exemplo "Demonstração de design") são opcionais. A chamada é a do site, não uma frase nova.
- **Cores e fontes:** vêm do próprio site (fundo, texto, destaque, fonte de título e de corpo). Só trocar com
  `--cor-fundo`, `--cor-texto` ou `--cor-destaque` (`#rrggbb`) se o relatório avisar que a cor lida não serviu.
- **Saída:** `video-<modelo>.mp4` (qualidade alta), `video-<modelo>-leve.mp4` (perto de 4 MB, o que vai no
  WhatsApp) e `video-<modelo>.json` (relatório). Leva cerca de 45 s por vídeo.
- `--so-checar` roda só a checagem do roteiro, sem gravar (uns 10 s): usar enquanto ajusta textos e seções.
- Ferramentas fora do lugar padrão: `BROWSER_EXECUTABLE` e `FFMPEG_PATH`.

## Os 3 roteiros (o dono escolhe)
Gerar os três com `--modelo todos` e mostrar para escolher; ele escolhe melhor vendo do que lendo descrição.

| Modelo | Como é | Bom para |
|---|---|---|
| `celular` | O nome abre, um celular grande sobe com o site e passeia pelas seções, com o nome de cada uma no alto; no fim o celular desce e fica a chamada. | Site com muito detalhe, dono que quer "ver no celular". |
| `cortes` | O site em tela cheia, como gravação de tela, com cortes secos de seção em seção e barrinhas de progresso no alto; uma cortina abre com o nome e fecha com a chamada. | Site com fotos fortes; é o que mais mostra o site. |
| `destaques` | A marca grande encolhe e vira cabeçalho; 3 destaques numerados (01, 02, 03) numa janela, trocados por uma faixa na cor de destaque; fecho alinhado à esquerda. | Site com 3 pontos de venda claros. |

## Checagem (o script reprova sozinho)
Código de saída: **0** aprovado · **1** reprovado na checagem · **2** não deu para gerar (falta Chrome, ffmpeg ou
dado). Conferir o código, não só ler a tela. O que reprova:
1. Duração fora de 10 a 15 s.
2. Nome da empresa fora dos primeiros 3 s.
3. Chamada ou contato com menos de 2 s inteiros na tela, ou fora do fecho.
4. Qualquer outro texto com menos de 0,8 s inteiro na tela.
5. Letra menor que 28 px no vídeo (1080 de largura).
6. Contraste do texto com o fundo de verdade (medido nos pixels) abaixo de 4,5 (3 para letra de 60 px ou mais).
7. Site ocupando a maior parte do quadro em menos da metade do vídeo.
8. Arquivo diferente de 1080 x 1920, 30 quadros por segundo, ou com quadro faltando.
9. Versão leve com 6 MB ou mais.

Passar na checagem **não é** estar bom: depois de gerar, tirar quadros e olhar.
```
ffmpeg -i video-celular.mp4 -vf "fps=1.5,scale=270:-1,tile=7x3:padding=6:color=white" -frames:v 1 folha.jpg
```
Olhar na folha: o site aparece como é de verdade? Algum texto cobre conteúdo importante? A troca de seção cai num
ponto bonito da página? O fecho dá para ler de relance?

## Regras
- **O site de verdade, nunca mais bonito que o real.** O vídeo grava o site rodando; não trocar foto, não esconder
  seção feia, não desenhar tela que o site não tem. Defeito que aparecer no vídeo se conserta no site.
  A única coisa que o script põe dentro do site é um ponto de 1 px quase transparente no canto (sem ele o Chrome
  trava a foto em site que não tem animação nenhuma); não muda o que se vê.
- **Nada depende de relógio.** A animação anda quadro a quadro (1/30 de segundo por foto), então o mesmo comando dá
  o mesmo vídeo. Não usar `setTimeout`, transição de CSS nem vídeo tocando sozinho num modelo.
- **Saída fora do git.** Vídeo é arquivo grande e traz nome e contato de cliente: gravar numa pasta ignorada.
- **Contato de verdade só no vídeo do cliente.** Em prova, exemplo ou teste, usar contato fictício e o `--aviso`.
- **Mandar a versão leve.** A de qualidade alta fica para quem pedir o arquivo.

## Roteiro próprio (só se os 3 não servirem)
Copiar um dos `modelos/*.html` para a pasta do cliente e passar o caminho em `--modelo`. O modelo é uma página
com `<script src="motor.js">`, um `<div id="palco">` de 432 x 768 e o site num `<iframe id="site">`; o roteiro
fica em `Video.modelo({ nome, montar(v, d) { ... } })`. O que o `v` oferece está comentado no objeto `v` de
`scripts/motor.js`; `d` traz os textos, as seções, as cores e as fontes lidas do site.
- `data-fim` marca os textos do fecho (regra dos 2 s); `data-enfeite` tira um texto da checagem; `data-cobre`
  marca o que tampa o site por inteiro.
- **O quadro do site não se mexe.** Com o relógio parado, o Chrome trava a foto se o `<iframe>` do site é movido,
  recortado ou escondido. Só a opacidade dele pode mudar. Para o site "entrar andando", mover uma foto dele
  (`v.foto`) e trocar pelo site vivo quando ela parar, como fazem o `celular` e o `destaques`. O motor recusa o
  roteiro que tentar mexer no quadro.
- Posições em números pares: o quadro sai 2,5 vezes maior e número ímpar deixa o site meio pixel fora do lugar.
