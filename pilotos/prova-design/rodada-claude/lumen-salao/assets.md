# Assets

Valida declarações e integridade; direitos de imagem, termos da fonte e realismo exigem revisão humana.

- public/img/abertura-480.webp: 15410 bytes · Vladimir Pustovit · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Pretty_woman_with_long_hair.jpg
- public/img/abertura-960.webp: 44930 bytes · Vladimir Pustovit · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Pretty_woman_with_long_hair.jpg
- public/img/abertura-1600.webp: 98042 bytes · Vladimir Pustovit · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Pretty_woman_with_long_hair.jpg
- public/img/resultado-480.webp: 100952 bytes · Alex Neman · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Woman_with_shiny_long_black_hair_from_behind_(25_December_2022).jpg
- public/img/resultado-960.webp: 352884 bytes · Alex Neman · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Woman_with_shiny_long_black_hair_from_behind_(25_December_2022).jpg
- public/img/resultado-991.webp: 387896 bytes · Alex Neman · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Woman_with_shiny_long_black_hair_from_behind_(25_December_2022).jpg
- public/img/hidratacao-480.webp: 29848 bytes · Gee Hair · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Woman_With_Wet_Hair_Using_Hairbrush_(51548089114).jpg
- public/img/hidratacao-960.webp: 114260 bytes · Gee Hair · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Woman_With_Wet_Hair_Using_Hairbrush_(51548089114).jpg
- public/img/hidratacao-1281.webp: 199224 bytes · Gee Hair · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Woman_With_Wet_Hair_Using_Hairbrush_(51548089114).jpg
- public/img/nutricao-480.webp: 20794 bytes · geehairimages · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Hair_Oil_Treatment_at_Hair_Salon.jpg
- public/img/nutricao-960.webp: 65496 bytes · geehairimages · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Hair_Oil_Treatment_at_Hair_Salon.jpg
- public/img/nutricao-1281.webp: 105416 bytes · geehairimages · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Hair_Oil_Treatment_at_Hair_Salon.jpg
- public/img/reconstrucao-480.webp: 12392 bytes · Hair Spies · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Hair_conditioner_(51213040376).jpg
- public/img/reconstrucao-960.webp: 32484 bytes · Hair Spies · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Hair_conditioner_(51213040376).jpg
- public/img/reconstrucao-1080.webp: 39162 bytes · Hair Spies · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Hair_conditioner_(51213040376).jpg
- public/img/cronograma-480.webp: 10942 bytes · geehairimages · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Conditioner_-_Hair_treatment.jpg
- public/img/cronograma-960.webp: 44892 bytes · geehairimages · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Conditioner_-_Hair_treatment.jpg
- public/img/cronograma-1278.webp: 83998 bytes · geehairimages · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Conditioner_-_Hair_treatment.jpg
- public/img/corte-480.webp: 8728 bytes · Hair Spies · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Cutting_hair_with_scissors_(51214105840).jpg
- public/img/corte-720.webp: 15248 bytes · Hair Spies · CC-BY-2.0 · https://commons.wikimedia.org/wiki/File:Cutting_hair_with_scissors_(51214105840).jpg
- public/animacoes/fio.json: 68451 bytes · Lúmen Salão (demonstração), gerado por ferramentas/gerar-fio.mjs · proprio · codigo-local
- public/animacoes/fio-final.svg: 5266 bytes · Lúmen Salão (demonstração), gerado por ferramentas/gerar-fio.mjs · proprio · codigo-local
- public/favicon.svg: 412 bytes · Lúmen Salão (demonstração) · proprio · codigo-local


## Como foram preparadas (Lúmen Salão, demonstração)
- Sete fotos do Wikimedia Commons, escolhidas por folha de contato (`coleta/lumen-*-folha.jpg`, buscas em
  `coleta/lumen-*.json`; escolhidas em `coleta/fotos-escolhidas.json`). Nenhuma pessoa fotografada é cliente ou
  funcionária do salão fictício; a licença da foto não substitui direito de imagem numa campanha real.
- Fonte usada: a versão de 1920 px de cada arquivo (`original1920`), baixada fora do repositório; as duas da
  série Hair Spies (reconstrução e corte) só existem em 1080 px e entram no tamanho original.
- Revisão de 03/11: reconstrução, cronograma e corte trocadas por fotos que mostram o serviço (dosagem do
  tratamento, frasco do plano para casa, corte das pontas com as mãos) no lugar de escovas e tesoura solta.
- `python -I ferramentas/tratar-fotos.py <originais> <recortes>`: recorte e tratamento único (sombras para o
  petróleo da marca, saturação 0,88, contraste suave). Resultado (a42): fundo branco recortado virou petróleo com
  luz lateral e a blusa rosa virou ameixa. Hidratação (f92): a parede clara virou petróleo. Reconstrução (h1) e corte (h2): o fundo
  claro do salão foi escurecido (`salao_escuro`) para a mesma luz lateral das outras. Derivadas de CC BY-SA
  seguem CC BY-SA 4.0.
- `python -I <plugin>/skills/lp-construcao/scripts/midias.py <recortes> .` gera os WebP e `src/data/imagens.json`.
- Crédito na página: rodapé (`creditos` e `alteracoes` em `src/data/conteudo.ts`).
- `public/og.jpg` é um print da abertura (contém a foto de Vladimir Pustovit, CC BY 2.0, com o mesmo crédito).

## Autoria própria
- `public/animacoes/fio.json` (Lottie, ~67 KB) e `fio-final.svg` (pôster do último quadro), gerados por
  `ferramentas/gerar-fio.mjs`: fio visto de perto, escamas abrindo/fechando, gotas, película de óleo, pontes de
  proteína e o raio de luz espalhado → refletido. `node ferramentas/ver-fio.mjs <saida.png>` mostra os quadros.
- `public/favicon.svg`: desenho próprio. Shader do reflexo: código próprio em `src/secoes/reflexo.ts`.

## Fontes
Gloock, Bodoni Moda (só itálico 400, latino) e Familjen Grotesk via `@fontsource` 5.3.0, SIL OFL 1.1.
