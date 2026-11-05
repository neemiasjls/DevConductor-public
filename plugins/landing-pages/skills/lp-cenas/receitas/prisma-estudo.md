# Luz em três dimensões

**Família:** 3D e fundos. **Estudo:** `prisma`.

Um prisma abstrato em CSS gira sem bibliotecas 3D nem promessa de realismo.

## Código e aplicação

Implementação original completa em [CenasExtras.jsx](../../../../estudio-design/skills/estudio-movimento/modelo/src/CenasExtras.jsx), funções `CenaExtra` e `animarExtra`; estilos em [familias.css](../../../../estudio-design/skills/estudio-movimento/modelo/src/familias.css).

`CenaExtra({ tipo: 'prisma' })` monta a composição. Dentro de `gsap.matchMedia`, chamar `animarExtra('prisma', gsap, st, raiz)`. O modelo contém o escopo React e sua limpeza; não criar animações fora desse ciclo.

## Celular, pausa e acessibilidade

Computador: até uma cena presa, scrub 0,45. Celular: equivalente (DEV-34), pin mais curto e palco menor; só sem pin, de top 75% a bottom 25%, se medir travamento. Pausa e movimento reduzido: composição estática legível, sem transformações de entrada; preservar os estilos estáticos do modelo. SVG tem descrição acessível. Números e mapa são demonstrações explicitamente rotuladas, nunca fatos de cliente.

## Evidências e peso

Abrir `/?estudo=prisma`. Testes dos quatro modos em `pilotos/estudios/evidencias/testes.json`; vídeos `pilotos/estudios/vitrine/prisma.webm` e `prisma-celular.webm`, com seis quadros por vídeo.

Sem download próprio de foto, vídeo ou modelo 3D. Usa o bundle compartilhado do estúdio (medir novamente após alterações; orçamento 150 kB gzip). Não atribuir o peso inteiro a uma única cena nem tratar aprovação automática como aprovação estética do usuário.

**Licença:** código e geometria originais MIT do DevConductor. GSAP possui licença própria; fonte Saira sob OFL. Não há código copiado de referências externas. Favoritos e aprovação visual continuam com o usuário.
