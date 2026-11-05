# Receita: veículo percorre a rota (computador)

A seção fica presa; um veículo pequeno anda por uma linha com paradas. A linha "acende" atrás dele, cada
parada acende quando ele chega e, no fim, aparece um bloco extra (ex.: frete de retorno).
Testada no piloto de transportadora (out/2026). No celular, usar `linha-do-tempo.md`.

## Marcação (React + Tailwind)
```tsx
<section data-cena-rota className="lg:min-h-screen lg:justify-center flex flex-col gap-8">
  <div data-linha className="hidden lg:flex relative items-center gap-3">
    <Parada /> <Trecho /> <Parada destaque /> <Trecho /> <Parada />
    {/* barra "percorrida": estado inicial pelo style, nunca por classe scale-x-0 do Tailwind */}
    <div data-percorrido className="absolute left-3 right-3 top-[10px] h-1 bg-ambar origin-left motion-reduce:hidden"
         style={{ transform: 'scaleX(0)' }} />
    <div data-veiculo className="absolute left-0 bottom-[12px] w-[180px] h-[45px] motion-reduce:hidden">
      <Veiculo className="w-full h-full" />
    </div>
  </div>
  <ol>{paradas.map(p => <li data-parada key={p.nome}>…</li>)}</ol>
  <div data-extra>…</div>
</section>
```
`<Parada />` leva `data-ponto`. A linha mede 24px de altura; a faixa fica em `top: 10px`.

## Animação (dentro de `gsap.matchMedia`)
```ts
mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
  const linha = q('[data-linha]'), veiculo = q('[data-veiculo]')
  const paradas = todos('[data-parada]'), pontos = todos('[data-ponto]')
  // A "frente" do desenho é o ponto que chega em cada parada (cabine ≈ 66% da largura do caminhão).
  const frente = () => veiculo.offsetWidth * 0.66
  const meio = () => linha.offsetWidth / 2, fim = () => linha.offsetWidth - 12

  gsap.set(veiculo, { x: 0 })
  gsap.set(q('[data-percorrido]'), { scaleX: 0, transformOrigin: 'left center' })
  gsap.set(paradas.slice(1), { opacity: 0.3 })
  gsap.set(q('[data-extra]'), { opacity: 0, y: 40 })

  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
    trigger: q('[data-cena-rota]'), start: 'top top', end: '+=1800', pin: true, scrub: 0.6,
    anticipatePin: 1, invalidateOnRefresh: true } })
  tl.to(veiculo, { x: () => meio() - frente(), duration: 1 }, 0)
    .to('[data-percorrido]', { scaleX: 0.5, duration: 1 }, 0)
    .to(paradas[1], { opacity: 1, duration: 0.25 }, 0.9)
    .to(pontos[1], { scale: 1.5, duration: 0.15, yoyo: true, repeat: 1 }, 0.9)
    .to(veiculo, { x: () => fim() - frente(), duration: 1 }, 1.2)
    .to('[data-percorrido]', { scaleX: 1, duration: 1 }, 1.2)
    .to(paradas[2], { opacity: 1, duration: 0.25 }, 2.1)
    .to(pontos[2], { scale: 1.5, duration: 0.15, yoyo: true, repeat: 1 }, 2.1)
    .to('[data-extra]', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 2.35)
    .to({}, { duration: 0.3 }) // respiro antes de soltar a seção
})
```

## Ajustes por cliente
- Número de paradas: dividir o trajeto em partes iguais; cada parada acende ~0.1 antes de o veículo chegar.
- Duração da cena (`end`): ~600px de scroll por trecho.
- Veículo: qualquer SVG com a "frente" medida (moto, barco, avião, bicicleta).
