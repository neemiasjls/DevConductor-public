# Receita: camadas com profundidade (parallax)

Uma paisagem em camadas (céu, morros, estrada; ou fundo, produto, primeiro plano) em que cada camada anda
numa velocidade: a mais perto anda mais. Dá sensação de profundidade sem 3D. Sem prender a tela, leve.
Testada em página demo (out/2026).

## Marcação
```tsx
<section data-camadas className="relative h-screen overflow-hidden">
  <div data-camada="0.2" className="absolute inset-x-0 -top-[20%] -bottom-[20%]"><Ceu /></div>
  <div data-camada="0.5" className="absolute inset-x-0 -top-[20%] -bottom-[20%]"><Morros /></div>
  <div data-camada="1"   className="absolute inset-x-0 -top-[20%] -bottom-[20%]"><Estrada /></div>
  <h2 className="relative">…</h2>
</section>
```
- `data-camada` = força: 0 parada, 1 a mais perto. A camada da frente vem por último (fica por cima).
- Cada camada sobra 20% em cima e embaixo (`-top/-bottom-[20%]`) para não abrir buraco ao se mexer.
- Camadas: SVG ou PNG/WebP com fundo transparente (ver `lp-assets`).

## Animação (dentro de `gsap.matchMedia`)
```ts
mm.add({ movimento: '(prefers-reduced-motion: no-preference)', celular: '(max-width: 1023px)' }, (contexto) => {
  const { movimento, celular } = contexto.conditions as { movimento: boolean; celular: boolean }
  if (!movimento) return
  const cena = q('[data-camadas]')
  todos('[data-camada]').forEach((camada) => {
    const forca = Number(camada.dataset.camada) * (celular ? 0.5 : 1)
    const alcance = () => cena.offsetHeight * 0.15 * forca
    gsap.fromTo(camada, { y: alcance }, { y: () => -alcance(), ease: 'none',
      scrollTrigger: { trigger: cena, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } })
  })
})
```
Com a seção no meio da tela, todas as camadas estão na posição desenhada (y = 0). No celular a força cai pela
metade. Movimento reduzido: tudo parado na posição desenhada.

## Ajustes por cliente
- Transportadora: céu → morros → estrada com o caminhão. Restaurante: mesa → prato → ingredientes.
- Combina com `sai-de-cena.md` no topo (o objeto da frente pode ser o mesmo).
