# Receita: marcador desce a linha do tempo

Sem prender a tela. Um marcador (no piloto, um ovo brilhante) desce por uma linha vertical tracejada; cada
etapa acende quando ele passa. Leve, ótimo no celular. Testada no piloto de transportadora (out/2026).

## Marcação
```tsx
<ol data-lista className="relative flex flex-col gap-8 border-l-2 border-dashed border-borda pl-6">
  <span data-marcador className="absolute -left-[12px] top-0 z-10 w-[22px] h-[28px] motion-reduce:hidden">
    <Marcador className="w-full h-full shadow-[0_0_18px_4px_rgba(255,176,0,0.45)]" />
  </span>
  {etapas.map(e => <li data-etapa key={e.nome} className="relative">…</li>)}
</ol>
<div data-extra>…</div>
```

## Animação
```ts
mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
  const lista = q('[data-lista]'), marcador = q('[data-marcador]')
  gsap.to(marcador, {
    y: () => lista.offsetHeight - marcador.offsetHeight, ease: 'none',
    scrollTrigger: { trigger: lista, start: 'top 70%', end: 'bottom 70%', scrub: 0.4, invalidateOnRefresh: true },
  })
  todos('[data-etapa]').slice(1).forEach((etapa) => {
    gsap.set(etapa, { opacity: 0.3 })
    ScrollTrigger.create({ trigger: etapa, start: 'top 72%',
      onEnter: () => gsap.to(etapa, { opacity: 1, duration: 0.3 }),
      onLeaveBack: () => gsap.to(etapa, { opacity: 0.3, duration: 0.3 }) })
  })
  gsap.from(q('[data-extra]'), { opacity: 0, y: 30, duration: 0.5, ease: 'power2.out',
    scrollTrigger: { trigger: q('[data-extra]'), start: 'top 85%' } })
})
```

## Ajustes por cliente
- Marcador com a cara do negócio: ovo, gota, folha, logo pequeno.
- No computador pode virar a receita `rota-veiculo.md` (mesma lista, outra apresentação).
