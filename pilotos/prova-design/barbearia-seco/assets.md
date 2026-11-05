# Barbearia Seco — assets (demonstração, empresa fictícia)

Todas as fotos vêm do Wikimedia Commons (`coleta/fotos-candidatas.json`), baixadas do arquivo original em 29/10/2026.
Tratamento igual para todas (`ferramentas/tratar-fotos.py`): preto e branco (luminância), gama 0,8–1,0, autocontraste
(corte 1,5% sombras / 0,6% luzes), contraste ×1,35, maior lado 2400 px (`originais/`); depois
`lp-construcao/scripts/midias.py` gera WebP 480/960/1600 em `public/img/`. Foto alterada de CC BY-SA continua
**CC BY-SA 4.0**. Créditos visíveis no rodapé da página (autor, licença com link, página de cada foto e a alteração).

## Fotos
| Nome no site | Onde aparece | Arquivo no Commons (página) | Autor | Licença | Alteração |
|---|---|---|---|---|---|
| `abertura-tesoura` | Abertura (atrás de "SECO") e `public/og.jpg` | [Jorj Barber.jpg](https://commons.wikimedia.org/wiki/File:Jorj_Barber.jpg) | Mostafameraji | CC BY-SA 4.0 | P&B alto contraste; reduzida |
| `navalha` | Navalha (por dentro da palavra-máscara) | [Barber shop from Iran 11.jpg](https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_11.jpg) | Mostafameraji | CC BY-SA 4.0 | P&B alto contraste; reduzida |
| `corte-maquina` | Cortes, cartão 3 | [Barber shop from Iran 13.jpg](https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_13.jpg) | Mostafameraji | CC BY-SA 4.0 | P&B; recorte 4:5 (x 22–75%) |
| `corte-topete` | Cortes, cartão 2 | [Barber shop from Iran 17.jpg](https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_17.jpg) | Mostafameraji | CC BY-SA 4.0 | P&B; recorte 4:5 (x 3–43%, y 25–100%) |
| `corte-nuca` | Cortes, cartão 1 | [Barber shop from Iran 18.jpg](https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_18.jpg) | Mostafameraji | CC BY-SA 4.0 | P&B; recorte 4:5 (x 16–69%) |
| `detalhe-pente` | O trabalho (foto da lupa, também invertida) | [Barber cutting hair with comb. Back view of man in barber shop.jpg](https://commons.wikimedia.org/wiki/File:Barber_cutting_hair_with_comb._Back_view_of_man_in_barber_shop.jpg) | Nenad Stojkovic | CC BY 2.0 | P&B alto contraste; reduzida; negativo na lupa |
| `corte-espelho` | Cortes, cartão 4 | [Young men with trendy haircut at barber shop.jpg](https://commons.wikimedia.org/wiki/File:Young_men_with_trendy_haircut_at_barber_shop.jpg) | Nenad Stojkovic | CC BY 2.0 | P&B; recorte 4:5 (y 9–92%) |

Licenças: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/).
`public/og.jpg` é print da própria abertura (contém a foto `abertura-tesoura`, portanto também CC BY-SA 4.0).

## Fontes (hospedadas no projeto)
| Fonte | Pacote | Uso | Licença |
|---|---|---|---|
| Imbue (variável, wght 100–900 + opsz) | `@fontsource-variable/imbue` 5.3.0 — arquivo latino copiado para `public/fonts/imbue-latin.woff2` (pré-carga) | títulos, faixas, placar de números grandes | SIL OFL 1.1 (The Imbue Project Authors) |
| Sofia Sans (variável) | `@fontsource-variable/sofia-sans` 5.3.0 | texto | SIL OFL 1.1 (The Sofia Sans Project Authors) |

## Outros
- `public/favicon.svg`: desenho próprio (quadrado amarelo com "S"), sem terceiros.
- Código: próprio; GSAP 3.15.0, Motion 14.8.0, Lenis 1.3.27 e React 19.3.1 sob as licenças dos pacotes.
- Nome, endereço, telefone (41) 90000-0000, Instagram e preços são fictícios; a página diz isso na faixa do topo e no rodapé.
