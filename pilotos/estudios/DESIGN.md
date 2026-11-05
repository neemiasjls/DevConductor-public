---
name: Estúdio de movimento
colors:
  ink: "#162b69"
  background: "#e8eef8"
  sage: "#b8d3be"
  green-ink: "#183e36"
  sand: "#f3c785"
  brown-ink: "#542d19"
  focus: "#ba3e1f"
typography:
  display:
    fontFamily: "Saira"
    fontWeight: 550
    lineHeight: 1.04
    letterSpacing: "-0.035em"
---

# Estúdio de movimento

## Overview
Modo Experience: uma cena ocupa o palco inteiro. A interface serve para experimentar e comparar.

## Colors
Azul claro para a abertura e o fechamento; azul profundo no palco. Verde e areia distinguem os atos
da narrativa lateral. Texto e fundo usam pares da mesma família com contraste alto.

## Typography
Saira Variable hospedada no projeto, SIL OFL. Títulos entre 3rem e 6rem, corpo com line-height 1.5.
Poucos pesos, sem caixa alta de decoração e sem rótulo acima do título.

## Layout
Navegação simples; abertura em duas colunas no computador, empilhada no celular. Palco de uma tela,
fechamento legível depois da cena. Geometria abstrata apenas no estudo lateral; fotografia real no estudo foto.

## Components
Links sublinhados, botão de pausa com borda fina e foco visível. Sem cartões no palco.
Vitrine de vídeos usa o componente existente do plugin landing-pages.

## Motion
GSAP com scrub 0.45; pin apenas acima de 800px, se movimento permitido. CSS padrão mantém conteúdo
visível. Pausa e reduzido removem o pin; narrativa lateral vira uma sequência vertical inteira.
Movimento é a matéria do estudo, não uma indicação de como animar todo site de cliente.
