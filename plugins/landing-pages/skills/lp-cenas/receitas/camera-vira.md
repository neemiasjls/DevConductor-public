# Receita: câmera vira (veículo de lado → vista de cima)

Seção presa. O veículo aparece **de lado**, rodando, com uma palavra gigante atrás; a câmera sobe e gira 90°
(a estrada "vira" e fica vertical) e termina **de cima**, com marcadores passando pelos lados (rotas,
regiões, etapas). Inspirada na parte do caminhão do unitedcarriers.com.
**Status:** mecânica aprovada pelo usuário no piloto de uma transportadora ("tá melhor a animação").
O visual **não** foi aprovado: carreta montada em código = "muito cartoon"; fotos coladas em placas =
"não está em 3D, ambiente feio". Para produção, modelo `.glb` de verdade + HDRI (ver `lp-assets`).

## Peças
- `three` + `@react-three/fiber`, `frameloop="demand"`: só desenha quando a rolagem muda (bateria).
- Estado mutável fora do React: `{ p: 0, invalidar }`. O `onUpdate` do ScrollTrigger grava `p` e chama
  `invalidar()`; um componente dentro do Canvas entrega o `invalidate` do R3F para esse objeto.
- O veículo fica parado; quem anda é a estrada (`texture.offset.x`) e as rodas (`rotation.z = -metros / raio`).
- Palavra gigante, legendas, velocímetro e marcadores ficam no DOM, por cima/por baixo do canvas (`alpha: true`).

## Câmera (o coração)
```tsx
const suave = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

useFrame(() => {
  const cam = camera as THREE.PerspectiveCamera
  const aspecto = size.width / size.height
  const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
  // Enquadra o veículo inteiro em qualquer tela: de lado ocupa ~78% da largura (celular ~94%).
  const dLado = COMPRIMENTO / (aspecto < 1 ? 0.94 : 0.78) / 2 / (tanV * aspecto)
  const dCima = Math.max(25 / 2 / tanV, 16 / 2 / (tanV * aspecto))
  const t = suave(0.3, 0.5, estado.p)          // a virada acontece entre 30% e 50% da cena
  const theta = t * (Math.PI / 2)
  const dist = THREE.MathUtils.lerp(dLado, dCima, t)
  alvo.set(MEIO_X, THREE.MathUtils.lerp(aspecto < 1 ? 6 : 3.6, 0, t), 0)  // alvo alto = veículo mais baixo na tela
  cam.position.set(alvo.x, alvo.y + Math.sin(theta) * dist + Math.cos(theta) * 1.2, alvo.z + Math.cos(theta) * dist)
  cam.up.set(t, 1 - t, 0).normalize()          // o "para cima" vai de +y a +x: é isso que gira a estrada
  cam.lookAt(alvo)
  // Névoa só de lado (esconde o fim do chão); de cima, nenhuma.
  fog.near = THREE.MathUtils.lerp(dLado + 2, 2000, t); fog.far = THREE.MathUtils.lerp(dLado + 26, 4000, t)
})
```
Eixos: veículo apontando para +x, câmera de lado em +z. Com o `up` final em +x, a frente aponta para o alto
da tela e +z fica à direita, ou seja, mão de direção brasileira: a faixa amarela fica à **esquerda** do veículo.

## Timeline (progresso 0 → 1, igual ao `p` da câmera)
`pin: true`, `end: () => '+=' + innerHeight * 5`, `scrub: 0.8`, `invalidateOnRefresh: true`.
- 0,02: título de abertura sai; palavra gigante corre de `xPercent: 8` a `-38` até 0,34 e some.
- 0,10–0,27: legenda da vista de lado.
- 0,47: legenda da vista de cima entra; marcadores começam em 0,5 (um a cada ~0,055), cada um descendo
  de `-0,35 × altura` a `1,05 × altura` da tela em 0,12: parece que o veículo passa por eles.
- Velocímetro de enfeite: `getVelocity()` do ScrollTrigger / 22, limitado a 80, decaindo num `gsap.ticker`.
- Fim: ver `secao-cobre-cena.md` (veículo freia e some sob a seção seguinte).

## Cuidados que custaram depuração
- Textura de chão desenhada com o lado errado: em plano girado `-π/2` no eixo x, o **topo** da imagem vira
  o lado **-z** do chão. Conferir a mão da estrada no print de cima.
- Árvores/objetos do lado da câmera tapam o veículo na vista de lado (pior no celular, câmera longe):
  esconder esse lado até a câmera subir (`visible = p > 0,44`).
- Sombra que some quando o veículo anda para fora: pôr a luz do sol **dentro do grupo do veículo**, com o
  `target` também lá dentro.
- Fotos em placas (lado e teto) parecem reais só nos ângulos exatos; na virada o usuário percebeu que "não é
  3D". Usar só como último recurso.

## Celular e movimento reduzido
Mesma cena, câmera mais longe (o enquadramento acima resolve), marcadores com `max-w-[40vw]`.
Reduzido: sem pin, `p = 0,12` (veículo parado de lado) e as rotas em lista na seção seguinte.

**Objeto sem frente (caixote, produto), 29/10/2026:** girar num sentido só (~160°, até o lado de trás) em vez
de voltar à frente; a volta parece ré na órbita. Exemplo em `pilotos/prova-design/lastro-cargas`.
