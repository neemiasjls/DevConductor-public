# Receita: objeto sai de cena com o scroll

No topo, a ilustração principal (caminhão, produto) segue em frente e sai da tela enquanto o topo rola; um
elemento de fundo (lua, sol, logo) desce devagar (parallax). Começo de qualquer site animado; muito leve.

```ts
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const scrub = { trigger: q('[data-topo]'), start: 'top top', end: 'bottom top', scrub: 0.5 }
  gsap.to(q('[data-objeto-topo]'), { x: () => window.innerWidth * 0.55, ease: 'none', scrollTrigger: scrub })
  gsap.to(q('[data-fundo-topo]'), { y: 90, opacity: 0.35, ease: 'none', scrollTrigger: scrub })
})
```

- O objeto fica num `div` posicionado (absolute) com o atributo `data-*`; o SVG dentro ocupa 100%.
- Direção: para onde o objeto "vai" na história (veículo para a frente, produto para dentro do carrinho).
