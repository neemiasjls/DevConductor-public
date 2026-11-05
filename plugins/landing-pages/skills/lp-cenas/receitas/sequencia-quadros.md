# Receita: sequência de quadros (estilo Apple)

A seção fica presa e um "filme" roda para frente e para trás conforme a pessoa rola: produto girando,
caixa abrindo, caminhão sendo carregado. São imagens numeradas desenhadas num `canvas`. Pesada (as imagens);
usar em no máximo uma cena por site. Testada em página demo (out/2026).

## Quadros
- 60–120 imagens WebP numeradas (`/quadros/0001.webp`…), 1280px de largura, qualidade ~60.
  Referência: 60 quadros de 1280×720 ≈ 1,5 MB. Como gerar a partir de um vídeo: ver `lp-assets`.
- Celular: pasta própria com metade dos quadros e 720px (escolher a pasta pela largura da tela ao montar).

## Marcação
```tsx
<section data-sequencia className="h-screen bg-black">
  <canvas data-sequencia-tela width={1280} height={720} role="img" aria-label="(o que o filme mostra)"
    className="block w-full h-full object-cover" />
</section>
```
`width`/`height` do canvas = tamanho dos quadros; o `object-cover` ajusta à tela.

## Animação
```ts
const TOTAL_QUADROS = 60
const arquivo = (i: number) => `/quadros/${String(i + 1).padStart(4, '0')}.webp`
const tela = q<HTMLCanvasElement>('[data-sequencia-tela]')
const pincel = tela.getContext('2d')!
const imagens: HTMLImageElement[] = []
const carregar = (i: number) => (imagens[i] ??= Object.assign(new Image(), { src: arquivo(i) }))
let atual = 0
const desenhar = (i: number) => {
  atual = i
  const img = carregar(i)
  const pintar = () => {
    if (atual !== i) return // chegou atrasado: outro quadro já foi pedido
    pincel.drawImage(img, 0, 0, tela.width, tela.height)
    tela.dataset.quadro = String(i)
  }
  if (img.complete && img.naturalWidth) pintar()
  else img.addEventListener('load', pintar, { once: true })
}
desenhar(0)
// O resto dos quadros só baixa quando a seção se aproxima (não pesa na abertura do site).
ScrollTrigger.create({ trigger: q('[data-sequencia]'), start: 'top 300%', once: true,
  onEnter: () => { for (let i = 1; i < TOTAL_QUADROS; i++) carregar(i) } })
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const estado = { quadro: 0 }
  gsap.to(estado, { quadro: TOTAL_QUADROS - 1, snap: 'quadro', ease: 'none',
    onUpdate: () => desenhar(estado.quadro),
    scrollTrigger: { trigger: q('[data-sequencia]'), start: 'top top', end: '+=1500', pin: true, scrub: 0.3 } })
})
mm.add('(prefers-reduced-motion: reduce)', () => desenhar(TOTAL_QUADROS - 1))
```
Movimento reduzido: sem prender, mostra o último quadro (o "resultado" do filme).

## Ajustes por cliente
- `end: '+=1500'` = quanto a pessoa rola para o filme inteiro; ~25px por quadro fica natural.
- Texto por cima em momentos do filme: mesma linha do tempo, com `opacity` nos trechos.
