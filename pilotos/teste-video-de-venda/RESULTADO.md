# Vídeo de venda: resultado do teste (12/11)

O passo novo do kit (`lp-video`) gera o vídeo de venda de um site pronto com um comando, sem dependência nova
(só o Chrome ou Edge instalado e o `ffmpeg`). Teste feito com o site da prova da Marcenaria Aroeira
(`pilotos/prova-referencia/marcenaria-aroeira/dist`, só lido). Contato e nome são fictícios.

Para gerar de novo: `node pilotos/teste-video-de-venda/gerar.mjs todos` (ou `celular`, `cortes`, `destaques`;
`--so-checar` roda só a checagem).

## Os 3 vídeos

Todos saem em 1080 x 1920, 30 quadros por segundo, sem som, com as cores e as fontes lidas do próprio site
(fundo marrom `#3a160b`, texto branco, destaque `#d8b8a0`, título em Bodoni Moda, corpo em Familjen Grotesk).

| Roteiro | Vídeo | Versão leve (WhatsApp) | Duração | Tempo para gerar | Checagem | Nota |
|---|---|---|---|---|---|---|
| celular | `videos/video-celular.mp4` (15,2 MB) | `videos/video-celular-leve.mp4` (4,5 MB) | 14,0 s · 419 quadros | 40 s | aprovado | **8** |
| cortes | `videos/video-cortes.mp4` (8,1 MB) | `videos/video-cortes-leve.mp4` (1,8 MB) | 13,7 s · 411 quadros | 30 s | aprovado | **7,5** |
| destaques | `videos/video-destaques.mp4` (4,1 MB) | `videos/video-destaques-leve.mp4` (1,0 MB) | 13,6 s · 408 quadros | 26 s | aprovado | **7** |

A pasta `videos/` e a `quadros/` ficam fora do git (`.gitignore` desta pasta). Cada vídeo tem ao lado um
`video-<roteiro>.json` com o relatório da checagem.

**Como olhei:** folhas de 21 quadros de cada vídeo (`quadros/<roteiro>-folha.jpg`) e trechos de quadros seguidos
nas trocas. Não dá para eu assistir o vídeo rodando: ritmo e suavidade estão julgados por quadros, não pelo
olho no movimento. O dono precisa assistir os três antes de qualquer um ir para cliente.

### celular — nota 8
O nome sobe letra por letra, um celular grande entra com o site funcionando e passeia por 5 seções, com o nome
de cada uma e uma barrinha de progresso no alto; no fim o celular desce e fica a chamada com botão e contato.
- **Bom:** o site aparece nítido e como é de verdade (animação de entrada, barra fixa do WhatsApp, carrossel);
  as cores e letras do vídeo são as do site, então parece peça da mesma marca; o fecho se lê de relance; a troca
  da foto pelo site vivo não aparece (conferida quadro a quadro).
- **Falta para o 10:**
  1. Só rola. Não tem gesto de uso (tocar no menu, passar o carrossel, apertar o botão), que é o que mais vende.
  2. Todas as seções ganham o mesmo tempo. Um editor daria mais tempo à seção mais bonita e passaria rápido nas outras.
  3. O celular é um retângulo escuro simples; falta acabamento de aparelho (reflexo leve, sombra melhor).
  4. No fecho, o pedaço do celular que sobra embaixo disputa um pouco a atenção com a chamada.
  5. Sem som (decisão do teste; música ou clique mudariam a sensação).

### cortes — nota 7,5
O site em tela cheia, como gravação de tela, com cortes secos de seção em seção e barrinhas de progresso no
alto; uma cortina na cor do site abre com o nome e fecha com a chamada.
- **Bom:** é o que mais mostra o site (100% do quadro em 8,7 s dos 13,7 s); a abertura e o fecho são os mais
  fortes dos três; arquivo leve de 1,8 MB.
- **Falta para o 10:**
  1. A etiqueta com o nome da seção cai em cima do conteúdo em alguns planos (na seção Ambientes ela encosta na
     seta do carrossel). Em tela cheia não existe canto livre garantido; precisa escolher o canto por seção.
  2. Os cortes têm todos a mesma duração (1,7 s) e o mesmo movimento (descida lenta): fica monótono no meio.
  3. Mesma falta de gesto de uso do `celular`.

### destaques — nota 7
A marca grande encolhe e vira cabeçalho; 3 destaques numerados (01 O ofício, 02 Ambientes, 03 Como trabalhamos)
numa janela, trocados por uma faixa na cor de destaque; fecho alinhado à esquerda.
- **Bom:** é o mais organizado para quem vende 3 argumentos; o fecho é o mais elegante; os números dão ritmo.
- **Falta para o 10:**
  1. O site fica com só 66% do quadro e é o protagonista em 7,0 s dos 13,6 s: passa na regra por pouco (o
     mínimo é metade do vídeo). É o roteiro que menos mostra o site.
  2. Entre 2,0 s e 2,9 s o quadro fica meio vazio (marca pequena no alto e a janela ainda subindo).
  3. A faixa de troca é uma cor chapada; funciona, mas é simples perto do resto.
  4. Só mostra 3 seções; o topo do site (a primeira impressão) fica de fora quando há mais de 3.

**Minha escolha para mandar ao dono:** `celular`. `cortes` como segunda opção quando o site tem fotos fortes.

## O que a checagem do script cobra (e reprova com código de saída 1)
Duração de 10 a 15 s · nome da empresa nos primeiros 3 s · chamada e contato inteiros na tela por pelo menos
2 s · qualquer outro texto por pelo menos 0,8 s · letra de no mínimo 28 px · contraste do texto medido nos pixels
do fundo de verdade (4,5; 3 para letra de 60 px ou mais) · site ocupando a maior parte do quadro em pelo menos
metade do vídeo · arquivo com 1080 x 1920, 30 quadros por segundo e a contagem certa de quadros · versão leve
abaixo de 6 MB. Código 2 = não deu para gerar (falta Chrome, ffmpeg ou dado).

Nos três vídeos: menor letra de 30,0 px, menor contraste de 6,7, texto final por pelo menos 2,10 s.

## O que descobri no caminho (vale para quem mexer no script)
- Com o relógio do Chrome parado (é assim que a animação anda quadro a quadro), a foto do quadro **trava** se o
  `<iframe>` do site é movido, recortado ou escondido; mudar só a opacidade pode. Por isso o site nunca sai do
  lugar: no `celular` e no `destaques` quem sobe e desce é uma foto do site, trocada pelo site vivo quando para.
  O motor recusa o roteiro que tentar mexer no quadro do site.
- Com o relógio parado, esperar uma promessa na página (`awaitPromise`) também trava, e recarregar o site trava a
  primeira foto: o script recarrega em tempo real e para o relógio assim que o site carrega.
- **Site sem nenhuma animação própria também travava a foto.** O teste automático pegou isso (a página pequena
  do teste é parada; o site da Aroeira tem animação e escondia o defeito). Corrigido: o motor põe dentro do site
  um ponto de 1 px quase transparente que se mexe a cada quadro, ligado antes de parar o relógio. Não muda o que
  se vê. Os três vídeos foram gerados de novo depois dessa correção.

- No Windows, a pasta de perfil temporária do Chrome sobrava (com a máquina carregada, em quase toda rodada): um
  processo filho continuava gravando nela depois de apagada. Corrigido: o script derruba o Chrome com os filhos
  de uma vez, liga o Chrome sem as tarefas de fundo dele e confere a pasta de novo; o teste cobra que não sobre
  nada. Na rodada final, 19 aberturas do Chrome e nenhuma pasta sobrando (e os vídeos passaram a sair mais rápido).
- As fotos do site carregam em tempo real, mesmo com o relógio parado. Com a máquina carregada, o `celular`
  fotografou o site antes de duas fotos do topo chegarem e elas "pulavam" na troca. Corrigido: o script espera
  todas as fotos do site antes do primeiro quadro. Conferido quadro a quadro no vídeo final: a troca não aparece.

## O que foi conferido
- `node --test scripts/testes/lp-video.test.mjs`: 16 de 16, código de saída 0 (um minuto e meio). Cobre as
  regras da checagem com medidas simuladas, falta de Chrome (código 2), texto final de 1 s reprovado, roteiro que
  mexe no quadro do site recusado, os 3 roteiros na página pequena, gravação de verdade pela pasta e pelo
  endereço `http://` (1080 x 1920, 30 quadros por segundo, contagem de quadros, versão leve abaixo de 6 MB) e
  limpeza da pasta temporária.
- Gravação em site sem animação nenhuma: os 3 roteiros gravaram (celular e cortes no teste, destaques à mão).
- Verificador de segurança das skills (`skills-do-kit`) e validação do plugin: passaram.
- Suíte inteira (862 testes), rodada uma vez com os vídeos sendo gerados ao mesmo tempo: 851 passaram, 7
  falharam. Do trabalho novo: a sobra de pasta do Chrome (corrigida depois, teste passando) e "Skill sem dono:
  landing-pages:lp-video" (falta o registro, ver o fim deste arquivo). As outras 5 (em `conferir-tela`,
  `medir-uso`, `movimento-navegacao` e `portao-seguranca`) foram por máquina carregada: rodados sozinhos, esses
  4 arquivos passam (124 de 124). A suíte inteira não foi rodada de novo depois das últimas correções.
- Só rodou no Windows. No Linux, os testes que só pedem Chrome vão rodar pela primeira vez no GitHub; a gravação
  é pulada onde não há ffmpeg.

## Pendência achada no site da prova (não é do vídeo)
No topo do site da Aroeira, com a tela de 668 px de altura, os 3 cartões de fotos (Cozinhas, Closets, Home
office) sobem em cima do botão "Pedir orçamento". O vídeo mostra porque grava o site como ele é. A pasta da
prova é só leitura para este teste: fica para quem cuida do site.

## Arquivos novos
No kit (entram no commit):
- `plugins/landing-pages/skills/lp-video/SKILL.md`
- `plugins/landing-pages/skills/lp-video/scripts/video-de-venda.mjs` (gerador e checagem)
- `plugins/landing-pages/skills/lp-video/scripts/motor.js` (linha do tempo que roda dentro do Chrome)
- `plugins/landing-pages/skills/lp-video/modelos/celular.html`
- `plugins/landing-pages/skills/lp-video/modelos/cortes.html`
- `plugins/landing-pages/skills/lp-video/modelos/destaques.html`
- `scripts/testes/lp-video.test.mjs`

Neste teste:
- `pilotos/teste-video-de-venda/gerar.mjs`
- `pilotos/teste-video-de-venda/.gitignore`
- `pilotos/teste-video-de-venda/RESULTADO.md`

Nenhum arquivo que já existia foi alterado. Nada copiado de outro projeto (não precisa de `fontes.json` nem `NOTICE`).

## O que falta fazer fora deste teste
1. Subir a versão em `plugins/landing-pages/.claude-plugin/plugin.json` e rodar `node scripts/atualizar-marketplace.mjs`
   (sem versão nova a atualização do plugin não copia a skill).
2. Registrar o dono da skill nova: a suíte falha em `responsabilidades.test.mjs` com "Skill sem dono:
   landing-pages:lp-video". Falta uma linha em
   `plugins/devconductor-core/skills/orquestrador/referencias/responsabilidades.json`, igual à da `lp-publicar`:
   `{ "plugin": "landing-pages", "dono": "landing-pages:lp-video", "uso": "etapa", "skills": ["lp-video"] }`
   (mexe no `devconductor-core`, então a versão dele também sobe).
3. Ligar o passo na skill `lp-maestro` (depois da revisão, antes ou junto da publicação) e citar na `lp-publicar`.
4. Rodar a suíte inteira (`node --test "scripts/testes/*.test.mjs"`) com a máquina livre e a validação do plugin.
5. O dono assistir os três e escolher; o retorno dele decide o que melhorar primeiro (gesto de uso é o maior ganho).
