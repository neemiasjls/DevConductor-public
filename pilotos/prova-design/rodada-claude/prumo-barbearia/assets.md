# Assets

Valida declarações e integridade; direitos de imagem, termos da fonte e realismo exigem revisão humana.

- public/modelos/cadeira-2k.glb: 938948 bytes · Fernando Quinn / Poly Haven · CC0 · https://polyhaven.com/a/BarberShopChair_01
- public/modelos/cadeira.glb: 359308 bytes · Fernando Quinn / Poly Haven · CC0 · https://polyhaven.com/a/BarberShopChair_01
- public/modelos/cadeira-poster.webp: 137758 bytes · Fernando Quinn / Poly Haven · CC0 · https://polyhaven.com/a/BarberShopChair_01
- public/modelos/cadeira-abertura.webp: 141296 bytes · Fernando Quinn / Poly Haven · CC0 · https://polyhaven.com/a/BarberShopChair_01
- public/modelos/cadeira-abertura-celular.webp: 73564 bytes · Fernando Quinn / Poly Haven · CC0 · https://polyhaven.com/a/BarberShopChair_01
- public/og.jpg: 94296 bytes · Fernando Quinn / Poly Haven · CC0 · https://polyhaven.com/a/BarberShopChair_01
- public/ambientes/oficina-512.hdr: 524337 bytes · Poly Haven · CC0 · https://polyhaven.com/a/vintage_measuring_lab
- public/ambientes/oficina-256.hdr: 131121 bytes · Poly Haven · CC0 · https://polyhaven.com/a/vintage_measuring_lab
- public/img/degrade-480.webp: 25860 bytes · Truth678 · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Fade_Hair_Cut.jpg
- public/img/degrade-750.webp: 48364 bytes · Truth678 · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Fade_Hair_Cut.jpg
- public/img/tesoura-480.webp: 16780 bytes · Mostafameraji · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Barber_shop_iran.jpg
- public/img/tesoura-960.webp: 47482 bytes · Mostafameraji · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Barber_shop_iran.jpg
- public/img/tesoura-1600.webp: 104818 bytes · Mostafameraji · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Barber_shop_iran.jpg
- public/img/maquina-480.webp: 15026 bytes · Mostafameraji · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_18.jpg
- public/img/maquina-883.webp: 42934 bytes · Mostafameraji · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_18.jpg
- public/img/navalha-480.webp: 13262 bytes · Mostafameraji · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_11.jpg
- public/img/navalha-960.webp: 39320 bytes · Mostafameraji · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_11.jpg
- public/img/navalha-1037.webp: 46372 bytes · Mostafameraji · CC-BY-SA-4.0 · https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_11.jpg
- public/draco/draco_decoder.wasm: 192420 bytes · Google (Draco), via three.js · Apache-2.0 · https://github.com/google/draco
- public/draco/draco_wasm_wrapper.js: 58456 bytes · Google (Draco), via three.js · Apache-2.0 · https://github.com/google/draco


## Alterações e observações

Empresa fictícia de demonstração. Créditos e links das fontes estão no rodapé (`src/data/conteudo.ts`).

| Peça | Alterações |
|---|---|
| Cadeira (Poly Haven, CC0) | glTF 2k e 1k reduzidos com `@gltf-transform/cli` (Draco + WebP); malha e materiais originais. Fonte em `originais/modelo/`. |
| HDRI vintage_measuring_lab (CC0) | 1k (md5 conferido) reduzido para 512 e 256 px com `ferramentas/reduzir-hdr.py`; só ilumina, não aparece no fundo. |
| Pôsteres e OG | render do próprio canvas (`ferramentas/gerar-poster.mjs`, `gerar-og.mjs`). |
| Fade Hair Cut (Truth678, CC BY-SA 4.0) | foto do clímax desde 03/11 (antes Mid-fade 07, cujas faixas caíam no rosto): recorte da lateral/nuca e cor tratada; original de 1125 px (SHA-1 conferido com a API em `coleta/fade-hair-cut-pagina.json`), recorte de 750 px. |
| Fotos do Mostafameraji (CC BY-SA 4.0) | recorte e cor tratada; as versões alteradas seguem CC BY-SA 4.0. Baixadas dos derivados de 1920 px do Commons (o original respondeu 429). |
| Draco (Apache-2.0) | sem alteração; copiado de `three/examples/jsm/libs/draco/gltf`. |
| Fontes Funnel Display, Commissioner, Martian Mono | `@fontsource-variable/*`, SIL OFL 1.1, hospedadas no build. |

`autorizacao: "confirmada"` nas fotos BY-SA significa uso permitido pela licença com crédito (demonstração fictícia), não autorização do autor. Rever se virar cliente real.
