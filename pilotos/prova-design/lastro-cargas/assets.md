# Peças e licenças — Lastro Cargas

Empresa fictícia de demonstração; os modelos e a foto não representam operação própria.
Créditos e links das fontes estão visíveis no rodapé.

| Peça | Arquivos locais | Origem e licença | Alterações |
|---|---|---|---|
| Caixote de madeira | `public/modelos/caixote-2k.glb` (computador, texturas 2048, WebP q76, 870 KB), `caixote.glb` (celular, texturas 1024, 332 KB); fonte glTF 2K em `originais/caixote-2k/` (md5 conferido com a API) | [wooden_crate_01 — Poly Haven](https://polyhaven.com/a/wooden_crate_01), CC0 | `gltf-transform optimize` (meshopt, WebP, as três peças unidas numa malha, simplificação mínima: 6.576 → 6.319 triângulos); geometria e materiais preservados |
| Iluminação de galpão | `public/ambientes/galpao-512.hdr` (computador), `galpao-256.hdr` (celular); original 1K em `originais/ambientes/` | [empty_warehouse_01 — Poly Haven](https://polyhaven.com/a/empty_warehouse_01), CC0 | reduzido por média de blocos (`ferramentas/reduzir-hdr.py`) de 1,6 MB para 512 KB / 128 KB; só ilumina e reflete, não aparece no fundo |
| Pôsteres do caixote | `public/modelos/caixote-poster.webp` (três quartos, 1600×1000), `caixote-abertura.webp` (1º quadro, computador, 1680×1050), `caixote-abertura-celular.webp` (1º quadro, celular, 585×1266) | render local das duas peças CC0 acima | WebP do próprio canvas com fundo transparente, `node ferramentas/gerar-poster.mjs <url>`; três quartos = movimento reduzido, falha de WebGL e OG; primeiro quadro = abertura enquanto o 3D carrega |
| Open Graph | `public/og.jpg` | composição da própria página, modelo CC0 e fontes OFL | captura 1200×630, com a demonstração identificada; comando `node ferramentas/gerar-og.mjs` |
| Estrada | `originais/fotos/estrada-original.jpg`, `estrada.jpg`; `public/img/estrada-{480,960,1600}.webp` | Governo do Estado de São Paulo, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Entrega_das_obras_de_duplica%C3%A7%C3%A3o_e_restaura%C3%A7%C3%A3o_na_Rodovia_Jo%C3%A3o_Beira_(SP_095)_(53112127313).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | logotipo de transportadora real na porta apagado e placas (carreta e carros) desfocadas; WebP 480/960/1600 por `lp-construcao/scripts/midias.py`; crédito e “alterada” na própria seção e no rodapé |
| Funnel Display | `@fontsource-variable/funnel-display` | The Funnel Project Authors, SIL OFL 1.1 (`node_modules/@fontsource-variable/funnel-display/LICENSE`) | fonte hospedada no build |
| Chivo | `@fontsource-variable/chivo` | The Chivo Project Authors, SIL OFL 1.1 (`node_modules/@fontsource-variable/chivo/LICENSE`) | fonte hospedada no build |

A evidência de autoria/licença da fotografia é o registro 70 em `coleta/estrada2/estrada2.json`.
O contato, endereço, horários e números de serviço são fictícios, como informa a faixa na página.

## Direção atual — 30/10

O usuário rejeitou o caixote como representante desta transportadora. A abertura ativa usa a fotografia
rodoviária já licenciada (`estrada`), com crédito existente mantido. O modelo/ambiente/pôster do caixote e
seus registros acima são históricos; não são carregados pela página atual. Open Graph atualizado com a
abertura rodoviária. Não interpretar esta decisão como afirmação universal sobre tipos de embalagem.

## Direção vigente — caixas de ovos (30/10, esclarecimento do usuário)

Manter a cena 3D e reformular a carga; escolha direta: caixas de ovos. A abertura fotográfica foi uma etapa
intermediária. Modelo atual: twelve-egg-carton-moulded-pulp-open-with-eggs, Innerscene original, CC0.
Fonte: https://www.innerscene.com/tools/library/3d-parts/twelve-egg-carton-moulded-pulp-open-with-eggs-65dc1d10
Arquivo original `public/modelos/ovos-original.glb`1955848B; sem referências a imagens externas.
Derivada `ovos.glb`370384B: glTF Transform optimize, meshopt, texturas1024; UV fora de0–1 preservadas pelo
otimizador (aviso, sem erro). Sem scripts/dependências novos. Registro com SHA256 em `fontes.json`, crédito
em NOTICE e rodapé. Modelo aberto ilustra a embalagem/preparação; não é prova de operação real da empresa.
Pôsteres `ovos-poster.webp`, `ovos-abertura.webp`, `ovos-abertura-celular.webp` renderizados do próprio
modelo por `ferramentas/gerar-poster-ovos.mjs`. Caixote antigo preservado apenas como histórico.
