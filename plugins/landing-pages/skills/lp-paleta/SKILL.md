---
name: lp-paleta
description: Define a paleta de cores de uma landing page a partir do espaço físico e da marca do cliente, reinterpretada para não cair em clichês de IA, com escala OKLCH e contraste conferido. Use ao criar ou revisar as cores de um site de cliente.
---

# Paleta do cliente, sem clichê

## 1. Extrair do mundo real
Rode o extrator nas fotos do espaço, fachada, logo e trabalhos do cliente (de preferência fotos reais; renderização
3D só como apoio):
`python -I <plugin>/skills/lp-paleta/scripts/extrair_paleta.py clientes/<cliente>/fotos/originais/<pasta>`
Ele mostra as cores dominantes em hex e OKLCH e sugere fundo, texto e acento com o contraste calculado.

## 2. Reinterpretar (o passo que tira a cara de IA)
A paleta extraída é matéria-prima, não a resposta. Escolha **uma ideia de cor** ligada à direção de arte:
- **Cor-assinatura:** um tom do próprio negócio usado com coragem em grandes áreas (não só em botões).
- **Contraste inesperado:** um neutro do espaço + um acento que exista no trabalho (cor de cabelo, esmalte,
  prato, tecido), não um dourado genérico.
- **Escuro de verdade:** seções inteiras no tom mais escuro da marca, alternando com claras.
Evite: creme + dourado/terracota como base, preto puro, cinza puro,
gradiente roxo/azul, "bege com tudo arredondado".

## 3. Construir a escala
Gere escalas 50–950 dos tons escolhidos em OKLCH (`oklch()` do CSS) e os tokens do Tailwind v4; impeccable `colorize` ajuda.
Tinja os neutros com o matiz da marca (C entre 0,005 e 0,02), nunca cinza puro.

## 4. Conferir
- Texto normal ≥ 4,5:1 e textos grandes ≥ 3:1 (o script já calcula).
- Acento que não passa em contraste: só decorativo ou em títulos grandes.
- Veja a paleta aplicada em uma prancha com fotos reais do cliente antes de codar.

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- `ui-ux-pro-max`: `python <plugin>/skills/ui-ux-pro-max/scripts/search.py "<nicho>" --domain color` mostra paletas do nicho; serve para conferir, não para copiar
  (a cor vem do espaço do cliente, LP-07).
- `impeccable` (`reference/colorize`).

## 5. Registrar
No plano/DESIGN.md do cliente: tokens (nome, hex, OKLCH, papel), a ideia de cor em uma frase e de quais fotos
ela veio.
