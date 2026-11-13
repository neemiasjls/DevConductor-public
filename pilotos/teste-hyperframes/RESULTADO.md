# Teste do Hyperframes (HTML que vira vídeo)

Data do teste: 11/11/2026 · Versão testada: `hyperframes` 0.9.36 · Windows 11, Node 24, ffmpeg 9.

## Veredito: vale só a ideia

O Hyperframes funciona bem, é grátis e a licença é clara. Mas o vídeo que o kit precisa (apresentação
curta de um site pronto) sai **igual** com um script próprio de 70 linhas, usando só o que o kit já tem
(Chrome, ffmpeg e GSAP). Então não compensa carregar a ferramenta inteira. Compensa copiar a ideia e as
regras de qualidade dela.

## Por quê

1. **O resultado é o mesmo.** Gerei o mesmo `index.html` pelos dois caminhos e comparei quadro a quadro:
   semelhança de 98,4% (a diferença é só a compressão). Olhando os quadros, não dá para dizer qual é qual.
2. **O script próprio foi mais rápido** neste vídeo: 27,6 s contra 42 a 64 s do Hyperframes.
3. **O Hyperframes pesa e mexe fora da pasta se a gente não segurar:**
   - 108 MB de pacotes + um Chrome próprio de 280 MB que ele baixa na primeira vez (cerca de 390 MB).
   - Sem configurar, cria pasta na pasta do usuário (`.hyperframes`) só de pedir a ajuda do comando.
     Com 6 variáveis de ambiente ficou tudo preso na pasta do teste (está no `gerar.mjs`).
   - Vem com telemetria ligada (dá para desligar, e desliguei).
   - Traz 3 skills dentro do pacote. O verificador de segurança do kit não achou nada malicioso, mas elas
     mandam o agente enviar "sinal de uso" e nota de avaliação para a empresa dona, e o comando `init`
     instala skills nas pastas do agente se não passar `--skip-skills`. Não usei nada disso.
   - Está na versão 0.9 e muda todo dia (o repositório recebeu envio no próprio dia do teste).
4. **O que ele tem de bom e o script próprio não tem:** uma checagem (`check`) que avisa texto que fica
   pouco tempo na tela, letra pequena demais para celular e contraste fraco; vários Chromes em paralelo;
   mistura de áudio e música; catálogo de efeitos prontos. Para um vídeo mudo de 15 s, nada disso é
   essencial, mas as regras da checagem valem ouro e dá para copiar como regra do kit.

## O que foi conferido antes de instalar

| Item | Resultado |
| --- | --- |
| Licença | Apache 2.0, conferida no arquivo `LICENSE` do repositório `heygen-com/hyperframes` |
| Exige | Node 22 ou mais novo e ffmpeg. O Chrome ele mesmo baixa |
| Conta ou pagamento | Não precisa para gerar vídeo no PC. Pago é só o plano Pro (modelos de voz, imagem e vídeo da HeyGen, duas skills de copiar estilo) e a geração na nuvem. Nada disso foi usado |
| Instalação | Só nesta pasta, versão fixa (`package.json` + `package-lock.json`), 7 s |
| Skills de fora | 3 dentro do pacote; verificador do kit: 0 achado em duas, 1 achado alto em `media-use` (arquivo de teste em Python, lido: é teste comum, falso positivo). Nenhuma foi instalada nem seguida |

## Números medidos

Vídeo: vertical, 1080x1920, 30 quadros por segundo, 14,4 s, sem som. Mostra o nome da empresa, 4 telas
do site dentro de um celular (Início, Ofício, Ambientes, Sobre) e a chamada final com o botão.

| Caminho | Tempo para gerar | Tamanho | Observação |
| --- | --- | --- | --- |
| Hyperframes, qualidade padrão | 42 a 55 s (3 medições) | 20 MB | `video-aroeira.mp4` |
| Hyperframes, versão leve (`--crf 26`) | 64 s | 3,6 MB | `video-aroeira-leve.mp4`, continua nítido; é o tamanho certo para WhatsApp |
| Script próprio, mesmo `index.html` | 27,6 s | 20 MB | `video-proprio.mp4`; com fotos em PNG levou 239 s, em JPEG 27,6 s |
| Rolagem do site pelo Chrome + ffmpeg | 33,4 s | 24 MB | `video-rolagem.mp4`, 14 s |

Outros tempos: preparar as telas do site 3,8 s; checagem do Hyperframes 8 a 13 s.

**Roda no Windows sem gambiarra?** Sim. Instalou e gerou de primeira. O único cuidado foi passar as
variáveis de ambiente para nada ir parar na pasta do usuário.

**Qualidade, olhando os quadros:** boa. Texto nítido (inclusive o texto pequeno das telas do site), fontes
e cores iguais às do site, movimento suave, nenhum quadro quebrado. A primeira versão tinha três defeitos
meus, não da ferramenta (passagem embolada da marca para o celular, título final quebrando em 3 linhas,
texto final com pouco tempo de leitura). Os dois últimos a checagem dele avisou ou ajudou a ver; corrigi
e gerei de novo. Limite honesto: é um vídeo de apresentação correto, não um comercial. Não tem som.

## Comparação com o caminho sem dependência (rolar o site e gravar)

- Gravar a rolagem é o mais simples e mostra o site inteiro em 33 s, mas sai cru: sem nome da empresa na
  abertura, sem chamada no fim, rolagem rápida demais para ler e com as animações do site desligadas
  (ligadas, a gravação sai aos trancos, porque elas andam no relógio e não quadro a quadro).
- O caminho do Hyperframes (montar uma página só para o vídeo e fotografar cada quadro) dá um vídeo com
  começo, meio e fim. É essa a ideia que vale levar, e ela cabe num script próprio.

## Se a ideia for para o kit (sugestão, não foi feito)

- Um script do kit que recebe um site pronto, tira as telas em tamanho de celular e gera o vídeo vertical
  a partir de um modelo de página (marca, telas, chamada), no molde de `preparar.mjs` + `comparar-proprio.mjs`.
- Precisa de uma biblioteca para comandar o Chrome. Aqui usei a `puppeteer-core` que veio junto com o
  Hyperframes; no kit dá para usar o Playwright, que já é opcional nele.
- Regras para copiar da checagem do Hyperframes: texto final na tela por pelo menos 2 s, letra de leitura
  com no mínimo 28 px num vídeo de 1080 de largura, contraste conferido, nada visível depende de relógio.
- Entregar sempre a versão leve (perto de 4 MB) para WhatsApp.
- Reavaliar o Hyperframes se um dia o vídeo precisar de música, narração ou legenda sincronizada: aí ele
  economiza trabalho de verdade.

## Arquivos desta pasta

| Arquivo | Para que serve |
| --- | --- |
| `index.html` | A página do vídeo (textos, fontes e cores da prova `marcenaria-aroeira`) |
| `preparar.mjs` | Copia fontes e fundos da prova e tira as 4 telas do site (gera `assets/`) |
| `gerar.mjs` | Roda o Hyperframes preso nesta pasta: `node gerar.mjs check` e `node gerar.mjs render` |
| `comparar-proprio.mjs` | Gera o mesmo vídeo sem o Hyperframes |
| `comparar-rolagem.mjs` | Gera o vídeo de rolagem do site |
| `video-aroeira.mp4`, `video-aroeira-leve.mp4`, `video-proprio.mp4`, `video-rolagem.mp4` | Os vídeos (fora do git) |
| `quadros/` | Quadros tirados dos vídeos para conferência (fora do git) |

Para refazer do zero: `npm ci`, `node preparar.mjs`, `node gerar.mjs render --output video-aroeira.mp4`.

A empresa do vídeo é fictícia (a mesma da prova): nome, telefone e endereço não são reais.
