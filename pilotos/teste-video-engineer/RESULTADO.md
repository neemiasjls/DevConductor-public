# Teste do Higgsfield Video Engineer (11/11/2026)

## Veredito: vale só a ideia

Roda bem neste PC, é grátis e não pede conta. Mas o que sai é **animação 3D limpa, não foto**, e cada cena tem de
ser modelada à mão, em código. Para a abertura de um site sério de empresa pequena, não substitui foto ou vídeo
real do negócio. Não entra no kit agora.

## Por quê

- **O que funcionou:** instalou sem erro grave, usou a placa certa (RTX 4060) e fez 5 segundos em 1280×720 em
  18 minutos. A luz é correta (sombra suave, reflexo, fundo desfocado), o laço fecha sem pulo e o arquivo é
  minúsculo (87 KB em WebM).
- **Parece foto?** Não. Parece render de catálogo 3D: superfícies lisas demais, bancada e parede sem textura de
  verdade, objetos com cara de "feito no computador". Veja `amostra-quadros.jpg`.
- **Serve de fundo de abertura?** Só em caso estreito: uma cena abstrata e discreta (objetos simples, luz
  passando) para um negócio em que isso combine. Para dentista, loja de noivas, marcenaria ou transportadora, o
  visitante quer ver o lugar e o trabalho reais; uma cena genérica de vaso e tigela não vende.
- **Custo de fazer:** o motor só tem caixa, plano, esfera, cilindro e anel. O vaso e a tigela foram desenhados
  por código (perfil girado). Qualquer coisa mais complexa (móvel, caminhão, comida, pessoa) vira horas de
  trabalho e fica com cara de brinquedo: o exemplo oficial é um filme infantil de feltro e papel.
- **Bate com as regras do projeto:** fundo tem de ter qualidade de foto (DEV-72) e site não pode ter cara de
  feito por máquina (DEV-53). Este resultado não chega lá.

A ideia que fica: laço curto de luz se movendo sobre uma cena parada pesa pouco e dá vida à abertura. Dá para
conseguir o mesmo efeito com uma foto real e movimento por CSS, sem render.

O que mudaria o veredito: o motor aceita textura em imagem (PNG/JPG) e ambiente em HDR. Um segundo teste com
textura real de madeira ou pedra e um caso de cliente que peça cena de objeto poderia subir a nota. Não foi
testado aqui.

## Licença e custo

- Repositório `github.com/higgsfield-ai/higgsfield-video-engineer`, commit `082bfd7` (28/10/2026). Projeto muito
  novo: criado em 27/10/2026, 6 estrelas.
- `LICENSE` na raiz e na pasta da skill: **MIT**, Higgsfield AI. O `NOTICE.md` do motor diz que o renderizador
  foi escrito por eles, credita dois trechos MIT (AgX e ACES) e lista as dependências: `puppeteer-core`
  (Apache-2.0) e `three` (MIT).
- **Nada pago é obrigatório.** Renderiza no próprio PC, sem conta nem chave. As imagens de conceito do fluxo
  deles são só um guia opcional ("com um modelo de imagem", sem dizer qual) e não entram no vídeo; não foram
  usadas. A única parte paga é opcional: alugar placas na Runpod (`tools/rp`), que não foi tocada.

## Segurança (antes de rodar)

- **skill-scanner do kit** na pasta `skills/code-based-films`: 3 achados "altos" e 11 "médios", todos falso
  positivo para uso local. Os altos são `child_process` em dois testes do motor e no script da Runpod; os médios
  são `fetch` para o servidor local do próprio renderizador (`127.0.0.1`, porta aleatória, com senha de sessão)
  e `curl`/`wget` do preparo das máquinas alugadas. Nenhuma injeção de instrução, nenhum gancho, nenhuma leitura
  de segredo.
- **Script de instalação (`setup.sh`), lido antes:** confere Node e Chrome, testa o acesso ao registro do npm e
  roda `npm ci --ignore-scripts` dentro de `engine/`. Baixa 24 pacotes (54 MB), sem script de instalação neles.
  Não baixa o Chrome, não instala nada global e não mexe em `~/.claude`.
- O caminho `npx skills add` (que grava em `~/.claude/skills`) **não** foi usado. Tudo ficou em `motor/`, fora do git.

## Números medidos

PC: Windows 11, RTX 4060 de 8 GB, Node 24, Chrome instalado, FFmpeg 9.

| Teste | Tamanho | Amostras | Tempo | Por quadro |
|---|---|---|---|---|
| Quadro de teste do motor (`hello`) | 960×720 | 64 | 18 s no total (0,9 s de render) | — |
| Prévia, 120 quadros (5 s) | 640×360 | 128 | 3 min 07 s | 1,4 s |
| Final, 120 quadros (5 s) | 1280×720 | 256 | 18 min 15 s | 8,9 s |

- **Memória de vídeo:** pico de 3,8 GB no total, com 3,1 GB já ocupados por outros programas. O render usou
  cerca de 0,5 GB (prévia) a 0,75 GB (final). Os 8 GB sobram para esta cena (89 mil triângulos).
- **Placa:** 98% de uso durante o render, 60 °C. O PC fica pesado enquanto renderiza.
- **Arquivos:** MP4 (H.264) 347 KB; WebM (VP9) 87 KB; prévia em MP4 122 KB. Os 120 quadros PNG ocupam 316 MB.
- **Laço:** diferença média entre o primeiro e o último quadro de 0,15% (fecha sem pulo). Cintilação entre
  quadros vizinhos na parede: 0,09% (não aparece).
- **Estimativa para 1920×1080 com 512 amostras:** cerca de 40 s por quadro, 1 h 20 para 5 s. Não foi rodado.
- **Download:** repositório 24 MB + pacotes 54 MB.

## Erros e avisos no Windows

1. `setup.sh` mostra um erro `MODULE_NOT_FOUND` no fim do passo 3: ele passa ao Node um caminho no formato do
   Git Bash (`/c/...`). É só a conferência; os pacotes foram instalados e o render funciona.
2. O comando `bin/hve` é um script bash: precisa do Git Bash. `hve new` usa `rsync`, que o Git Bash não traz
   (não testado). Aqui o motor foi chamado direto pelo Node.
3. Cada execução gasta 13 a 15 s compilando os programas da placa (a documentação fala em 3 s).
4. Avisos inofensivos no console: um 404 e "powerPreference ignorada no Windows". A placa certa foi usada
   mesmo assim (`nvidia / lovelace`).

## Onde está

- Vídeo: `pilotos/teste-video-engineer/saida/abertura_1280x720.mp4` (e `.webm`); prévia em
  `saida/previa_640x360.mp4`. A pasta `saida/` fica fora do git.
- Quatro quadros do vídeo final: `amostra-quadros.jpg`.
- Cena (vaso, tigela e anel numa bancada, luz de janela deslizando, câmera em vai e vem): `cena/render.mjs`.
- Para repetir, dentro desta pasta:
  `node cena/render.mjs --w 1280 --h 720 --spp 256 --frames 0-119 --out saida/final`
