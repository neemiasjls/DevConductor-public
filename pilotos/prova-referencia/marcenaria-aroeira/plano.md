# Plano: Marcenaria Aroeira (prova do caminho por referência)

**Demonstração com empresa e dados fictícios.** "Marcenaria Aroeira", telefone (14) 90000-0000, endereço
"Av. Exemplo, 1200" e Instagram não existem. Fotos de banco aberto, marcadas no site como ilustrativas.

Base escolhida: https://for-living.it (raio-x em `pilotos/referencias-galeria/referencias/arquitetura/raio-x/for-living.it/`).
"O que muda" pedido pelo dono: só o conteúdo (português, negócio da Aroeira) e orçamento por WhatsApp sempre à mão.
Escopo da prova: fatia (cabeçalho + cena principal + uma seção de serviços + rodapé). Seções 3, 5, 6 e 7 da base ficaram de fora de propósito.

| Seção (nº do roteiro) | Da referência | Do cliente | Mudou a pedido / por piso |
|---|---|---|---|
| 1 cabeçalho | cápsula escura centrada no topo, ~686 px, marca à esquerda, 4 links, botão contorno à direita | marca "Aroeira" em Bodoni Moda, links Início/Ambientes/Contato | botão "Contato" virou "Orçamento" → WhatsApp |
| 2 abertura ★ | fundo de textura quente em tela cheia, emblema + assinatura cursiva, título em caixa alta fino 4,5× o corpo, 2 linhas de texto, botão branco com contorno; presa ~0,8 tela; texto some na opacidade (0–0,6); 3 cartões sobem juntos por cima do bloco preso (0,3–1); paralaxe no fundo | madeira avermelhada (aroeira tem cerne vermelho), planta de cozinha em traço fino com cotas (o projeto 3D antes de produzir), "feito em Marília" em itálico, prazo de 45 dias no texto | assinatura em itálico da serifa em vez de fonte manuscrita (evita mais uma fonte); botão leva ao WhatsApp |
| 4 → nossa 2 | fundo preto, título no canto em 3×, régua de marcação, faixa corrida de cartões altos (212×450) que anda sozinha, rótulo embaixo | 6 ambientes (cozinhas, closets, home office, banheiros, salas, dormitórios), cada cartão abre o WhatsApp com a mensagem do ambiente | título "Ambientes que saem da nossa oficina" em vez de "trabalhos": as fotos não são obras da Aroeira (LP-11, nada de peça falsa); nota "fotos ilustrativas" |
| 8 → nossa 3 | fundo #0f0f0f, marca + frase à esquerda, 3 colunas (Menu/Legal/Social), marca gigante em baixo-relevo | frase com 12 anos, showroom e 3D; coluna Contato no lugar de Legal | linha final com o aviso de demonstração |

Fora da base, por pedido: botão fixo "Orçamento no WhatsApp" no canto (pedido do dono). Movimento reduzido: sem pin,
sem Lenis, faixa parada com rolagem lateral; cartões da abertura em fluxo abaixo do texto.

## Diferenças em relação às preferências anteriores
- Cantos: a base usa quina quase viva (3–4 px) nas fotos e 8 px no cabeçalho; seguido a base. Os exemplos anteriores do dono usavam cantos mais arredondados.
- Movimento: a base tem uma cena só (presa com camada) e o resto discreto, o que já bate com "cenas fortes + resto discreto".
- Texto em degradê no título (como na base) foi trocado por cor sólida: o raio-x não enxerga texto com `color: transparent`.

## Divergências que ficam (não se corrigem)
- Número de seções e comprimento da página: é uma fatia (4 de 8 seções).
- Ver `revisao/final/comparacao.md` e `relato-da-prova.md`.
