# Receita: fundo animado com shader (Paper Shaders)

Fundo do topo em movimento lento (gradiente líquido nas cores da marca) e que apaga aos poucos quando o
topo sai. Dá vida ao site sem ilustração. Biblioteca `@paper-design/shaders-react` (Paper, Apache-2.0: uso
comercial sem crédito visível). Pausa sozinha fora da tela. Peso médio (WebGL). Testada em página demo (out/2026).

## Instalar
`npm i @paper-design/shaders-react@0.0.81` — **versão fixa, sem `^`**: a biblioteca avisa que muda sem aviso
nas versões 0.0.x.

## Componente (arquivo próprio, carregado com `lazy`)
```tsx
// FundoShader.tsx
import { MeshGradient } from '@paper-design/shaders-react'

export default function FundoShader() {
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <MeshGradient colors={['#1d3b2a', '#3f6b45', '#f2b33d', '#fbe3a1']} distortion={0.8} swirl={0.5}
      speed={parado ? 0 : 0.25} maxPixelCount={1920 * 1080} style={{ width: '100%', height: '100%' }} />
  )
}
```

## Marcação
```tsx
const FundoShader = lazy(() => import('./FundoShader'))

<header data-topo className="relative h-screen overflow-hidden isolate">
  <div data-fundo-shader aria-hidden className="absolute inset-0 -z-10"
       style={{ background: 'linear-gradient(135deg,#1d3b2a,#3f6b45 45%,#f2b33d 80%,#fbe3a1)' }}>
    <Suspense fallback={null}><FundoShader /></Suspense>
  </div>
  <h1>…</h1>
</header>
```
O degradê em CSS com as mesmas cores aparece enquanto o shader carrega (e se o WebGL falhar).

## Animação (dentro de `gsap.matchMedia`)
```ts
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.to(q('[data-fundo-shader]'), { opacity: 0.25, ease: 'none',
    scrollTrigger: { trigger: q('[data-topo]'), start: 'top top', end: 'bottom top', scrub: true } })
})
```
Movimento reduzido: `speed={0}` deixa o desenho parado e o fundo não apaga.

## Ajustes por cliente
- Cores: as 3–4 da paleta (`lp-paleta`), da mais escura para a mais clara. Contraste do título conferido
  sobre a parte mais clara.
- Outros shaders da biblioteca (grão, metal líquido, pontos): ver `shaders.paper.design`.
- `maxPixelCount` limita o custo em telas grandes; no celular, `speed` menor economiza bateria.
