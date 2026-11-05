# Mídias — Estúdio Coral (demonstração)

Fotos do Wikimedia Commons, inicialmente escolhidas em `coleta/fotos-candidatas.json` (as outras candidatas não foram
usadas). Nenhuma pessoa fotografada representa cliente ou funcionária deste salão fictício. A licença da foto
não substitui direito de imagem numa campanha real. Crédito na página: legenda da seção "Cada fio no lugar" e
lista completa no rodapé (`creditos` em `src/data/conteudo.ts`).

| Id | Foto e uso no site | Autor e página | Licença |
|---|---|---|---|
| s-60 | Mulher com tranças koroba: `abertura`, `estilo-koroba` | [Melody Jacob1](https://commons.wikimedia.org/wiki/File:Koroba-braids-woman-scarf-portrait-june-2024-01.jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| s2-37 | Nagô em zigue-zague sendo feita: `servico-trancas`, `estilo-nago` | [Nwonwu Uchechukwu P](https://commons.wikimedia.org/wiki/File:Cornrow_Hairstyling.jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| s2-39 | Histórico: cabelo ruivo ondulado, retirado das categorias de cachos em 30/10; derivados preservados | [dusdin (Flickr), recorte de Gridge](https://commons.wikimedia.org/wiki/File:Woman_redhead_natural_portrait_1.jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| s-98 | Retrato de cabelo loiro: `servico-cor`, `estilo-cor` | [Nenad Stojkovic](https://commons.wikimedia.org/wiki/File:Portrait_of_young_blonde_woman_standing_near_window.jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| s2-28 | Trancista no salão: `perto` (foto natural, sem shader desde 30/10) | [Adaku Nwakanma](https://commons.wikimedia.org/wiki/File:Braider_at_a_hair_salon.jpg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| s2-7 | Box braids com miçangas (P&B): `estilo-box` | [Randen Pederson](https://commons.wikimedia.org/wiki/File:Box_Braids.jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |

## Como foram preparadas (alteração)
1. Original baixado da URL `original` de `coleta/fotos-candidatas.json` (cabeçalho User-Agent), fora do
   repositório (os seis originais somam ~25 MB e não sobem).
2. `python -I ferramentas/recortar-fotos.py <originais> <recortes>`: só **recorte** (caixas relativas registradas
   no próprio script) e redução para 2000 px no lado maior. Cor e conteúdo como no original.
3. `python -I <plugin>/skills/lp-construcao/scripts/midias.py <recortes> .` (mapa em `midias.json`): WebP
   480/960/1600 em `public/img/` e `src/data/imagens.json`.
- Derivadas de CC BY-SA continuam CC BY-SA. O shader RGB/onda foi retirado da seção `perto` a pedido do usuário.
- `public/og.jpg` é um print da abertura (contém a foto s-60): segue CC BY-SA 4.0 com o mesmo crédito.

## Autoria própria
- Trança animada: `public/animacoes/tranca.json` (Lottie, 242 KB, 16 KB gzip) e `tranca-final.svg` (pôster do
  último quadro), gerados por `ferramentas/gerar-tranca.mjs`. Três mechas (coral, cobalto, tinta) com por cima/por
  baixo calculado; vetor limpo, sem rosto nem mascote.
- `public/favicon.svg`: desenho próprio (três traços trançados).

## Fontes
Big Shoulders Display e Golos Text via `@fontsource-variable` (5.3.0), licença SIL OFL 1.1 (arquivo `LICENSE` em
cada pacote). Só os subconjuntos latinos são baixados pela página (`unicode-range`).

Sem modelo 3D, vídeo ou compra de peças.

## Correção semântica das fotos — 30/10

`cachos-definidos` substitui as fotos onduladas em serviços/estilos e acompanha a palavra “cachos” na abertura.
Fonte: [Smiling senior woman with curly hair portrait](https://commons.wikimedia.org/wiki/File:Smiling_senior_woman_with_curly_hair_portrait.jpg).
Autor: Nenad Stojković / Shixart1985; CC BY2.0, crédito e link da licença no rodapé. Foto ilustrativa, sem
relação com o salão fictício. Licença conferida na página e cachos conferidos visualmente no arquivo.
Original4912×7360 em `pilotos/testes-temporarios/coral-fotos-30-10/cachos-confirmados-original.jpg`.
Recorte relativo(0;0,01;0,78;0,65), sem alteração de cabelo/cor; WebP480/960/1600, qualidade86.
A primeira candidata tinha nome “curly hair”, mas mostrava cabelo liso/preso: foi rejeitada após inspeção.
O nome do arquivo não foi tratado como prova do penteado. Ruivo anterior e derivados antigos ficam históricos.

Na abertura, tranças/cachos/cor/você agora trocam fotografia junto da palavra; no reduzido, foto e título
iniciais de tranças permanecem estáticos. Alt da abertura corrigido de nagô para koroba. Alt de “De perto”
descreve a ação visível, sem afirmar uma técnica que a fotografia não demonstra.
