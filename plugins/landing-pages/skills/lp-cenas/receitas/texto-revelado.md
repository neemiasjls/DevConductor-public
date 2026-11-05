# Receita: texto revelado palavra por palavra

Uma frase de impacto (manifesto, promessa, números) começa apagada e cada palavra acende conforme a pessoa
rola. Sem prender a tela, muito leve, funciona igual no celular. Testada em página demo (out/2026).

## Marcação
```tsx
<p data-texto-revelado className="text-4xl lg:text-6xl font-semibold leading-tight max-w-[18ch]">
  {frase.split(' ').map((p, i) => <span key={i} data-palavra>{p} </span>)}
</p>
```
O espaço fica dentro do `span` (a frase continua lida inteira por leitor de tela).

## Animação (dentro de `gsap.matchMedia`)
```ts
mm.add('(prefers-reduced-motion: no-preference)', () => {
  todos('[data-texto-revelado]').forEach((texto) => {
    gsap.fromTo(texto.querySelectorAll('[data-palavra]'), { opacity: 0.15 }, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: texto, start: 'top 80%', end: 'bottom 45%', scrub: true },
    })
  })
})
```
Movimento reduzido: o estado apagado só existe dentro do bloco, então a frase aparece inteira.

## Ajustes por cliente
- Uma frase por site, curta (até ~20 palavras). Texto longo assim cansa.
- Destaque uma palavra-chave com a cor da marca (classe no `span` dela).
- Variação: em vez de opacidade, cor (`color` de cinza para a cor do texto).
