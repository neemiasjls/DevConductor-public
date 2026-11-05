# Receita: foto real com onda e separação RGB

> Testada em 29/10/2026 num salão fictício (`pilotos/prova-design/estudio-coral`).

**Lições do primeiro uso:** se a moldura da foto anima `scale`, o Canvas mede a caixa já encolhida e fica
estreito: usar `<Canvas resize={{ offsetSize: true }}>`. A intensidade 0,010 com RGB 0,22 parece foto
fantasma nos prints; 0,008 na rolagem e separação RGB 0,38 mantêm a foto legível (hover pode ir a 0,016).

Uma foto do cliente ganha uma onda discreta e separação de canais conforme a rolagem avança.
Hover ou toque intensifica o efeito; a imagem continua reconhecível. É uma superfície fotográfica,
sem fingir que a pessoa ou o produto tem volume 3D.

## Instalar

Projeto Vite/React/TypeScript com React 19 e tipos de Three compatíveis já instalados.

```sh
npm view three version
npm view @react-three/fiber version
npm view @react-three/drei version
npm view gsap version
npm i --save-exact three@0.186.1 @react-three/fiber@9.8.2 @react-three/drei@10.7.9 gsap@3.15.0
```

Versões conferidas no registro do npm (`npm view`) em 29/10/2026; fixar sem `^`.
Integração ainda sem compilação nesta receita. Referência: [shaderMaterial do Drei](https://drei.docs.pmnd.rs/shaders/shader-material).

## Foto e composição

Usar **foto real do cliente**, com autorização de uso, em `public/fotos/cliente.webp`.
Preparar versão de até ~1600px no lado maior; manter o assunto no centro seguro do recorte.
A mesma URL alimenta a textura e o fallback HTML, aproveitando o cache. Não pôr informações,
preços ou texto dentro da foto. A legenda e o título ficam visíveis no DOM.

## Componente completo e marcação (`DistorcaoImagem.tsx`)

```tsx
import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

const FotoCanvas = lazy(() => import('./FotoCanvas'))
class Fallback extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() { return this.state.falhou ? null : this.props.children }
}
export default function DistorcaoImagem({ ritmo }: { ritmo: { duracao: number; ease: string } }) {
  const secao = useRef<HTMLElement>(null)
  const foto = useRef<HTMLDivElement>(null)
  const [ativo, ativar] = useState(false)
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { ativar(true); io.disconnect() }
      }, { rootMargin: '300px' })
      io.observe(secao.current!)
      return () => { io.disconnect(); ativar(false) }
    })
    return () => mm.revert()
  }, [])
  return <section ref={secao} data-distorcao-imagem className="px-6 py-16">
    <h2>Um olhar para o nosso trabalho</h2>
    <p>Conte o que esta fotografia real demonstra sobre o negócio.</p>
    <figure className="mt-6">
      <div ref={foto} className="relative aspect-[4/5] overflow-hidden md:aspect-[16/9]">
        <img src="/fotos/cliente.webp" alt="Descreva a cena real da fotografia do cliente."
          width="1600" height="1200" className="absolute inset-0 h-full w-full object-cover" />
        {ativo && <Fallback><Suspense fallback={null}>
          <FotoCanvas secao={secao} foto={foto} ritmo={ritmo} />
        </Suspense></Fallback>}
      </div>
      <figcaption>Legenda e crédito da foto, quando exigido.</figcaption>
    </figure>
  </section>
}
```

## Shader e animação dentro de `gsap.matchMedia` (`FotoCanvas.tsx`)

Sem relógio contínuo: progresso e interação alteram uniforms, chamando `invalidate()`.
O quadro parado não consome um loop de animação. CSS não muda o layout durante a rolagem.

```tsx
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { shaderMaterial, useTexture } from '@react-three/drei'
import { SRGBColorSpace, Texture, Vector2 } from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
type Props = { secao: RefObject<HTMLElement | null>; foto: RefObject<HTMLDivElement | null>;
  ritmo: { duracao: number; ease: string } }
type Estado = { p: number; hover: number; forca: number }

const FotoMaterial = shaderMaterial(
  { uFoto: new Texture(), uP: 0, uHover: 0, uForca: 1, uRecorte: new Vector2(1, 1) },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  /* glsl */ `
    uniform sampler2D uFoto;
    uniform float uP;
    uniform float uHover;
    uniform float uForca;
    uniform vec2 uRecorte;
    varying vec2 vUv;
    void main() {
      vec2 uv = (vUv - 0.5) * uRecorte + 0.5;
      float intensidade = (sin(uP * 3.14159265) * 0.010 + uHover * 0.008) * uForca;
      float onda = sin(vUv.y * 18.0 + uP * 6.2831853) * intensidade;
      uv.x += onda;
      float desvio = intensidade * 0.22;
      vec2 limite = vec2(0.001);
      float r = texture2D(uFoto, clamp(uv + vec2(desvio, 0.0), limite, 1.0 - limite)).r;
      float g = texture2D(uFoto, clamp(uv, limite, 1.0 - limite)).g;
      float b = texture2D(uFoto, clamp(uv - vec2(desvio, 0.0), limite, 1.0 - limite)).b;
      gl_FragColor = vec4(r, g, b, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
)

function Plano({ estado, ligar }: { estado: Estado; ligar: (fn: () => void) => void }) {
  const textura = useTexture('/fotos/cliente.webp')
  const { size, invalidate } = useThree()
  const material = useMemo(() => new FotoMaterial(), [])
  useEffect(() => {
    textura.colorSpace = SRGBColorSpace
    textura.needsUpdate = true
    material.uFoto = textura
    const imagem = textura.image as { width: number; height: number }
    const aspectoFoto = imagem.width / imagem.height
    const aspectoTela = size.width / Math.max(1, size.height)
    // Equivalente a object-fit: cover, sem esticar o rosto/produto.
    material.uRecorte.set(Math.min(1, aspectoTela / aspectoFoto), Math.min(1, aspectoFoto / aspectoTela))
    ligar(invalidate)
    invalidate() // textura chegou: demand precisa deste primeiro quadro
  }, [textura, material, size.width, size.height, invalidate, ligar])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    material.uP = estado.p
    material.uHover = estado.hover
    material.uForca = estado.forca
  })
  return <mesh frustumCulled={false}>
    <planeGeometry args={[2, 2]} />
    <primitive object={material} attach="material" />
  </mesh>
}

export default function FotoCanvas({ secao, foto, ritmo }: Props) {
  const estado = useRef<Estado>({ p: 0, hover: 0, forca: 1 })
  const invalidar = useRef<() => void>(() => {})
  const [pronto, marcarPronto] = useState(false)
  const [falhou, falhar] = useState(false)
  const ligar = useMemo(() => (fn: () => void) => {
    invalidar.current = fn
    marcarPronto(true)
  }, [])

  useEffect(() => {
    if (!pronto || falhou) return
    const mm = gsap.matchMedia()
    mm.add({ mover: '(prefers-reduced-motion: no-preference)',
      celular: '(max-width: 767px)' }, ctx => {
      if (!ctx.conditions!.mover) return
      const alvo = foto.current!
      estado.current.forca = ctx.conditions!.celular ? 0.7 : 1
      const hover = gsap.quickTo(estado.current, 'hover', { duration: ritmo.duracao,
        ease: ritmo.ease, onUpdate: () => invalidar.current() })
      const entrar = (e: PointerEvent) => { if (e.pointerType === 'mouse') hover(1) }
      const sair = () => hover(0)
      const tocar = (e: PointerEvent) => { if (e.pointerType !== 'mouse') hover(1) }
      const eventos = [ ['pointerenter', entrar], ['pointerleave', sair],
        ['pointerdown', tocar], ['pointerup', sair], ['pointercancel', sair] ] as const
      eventos.forEach(([tipo, fn]) => alvo.addEventListener(tipo, fn as EventListener, { passive: true }))
      const gatilho = ScrollTrigger.create({ trigger: secao.current!, start: 'top bottom',
        end: 'bottom top', onUpdate: st => { estado.current.p = st.progress; invalidar.current() } })
      ScrollTrigger.sort()
      ScrollTrigger.refresh()
      estado.current.p = gatilho.progress
      invalidar.current()
      return () => {
        eventos.forEach(([tipo, fn]) => alvo.removeEventListener(tipo, fn as EventListener))
        hover.tween.kill()
        gatilho.kill()
        estado.current.hover = 0
        invalidar.current()
      }
    })
    return () => mm.revert()
  }, [pronto, falhou, secao, foto, ritmo.duracao, ritmo.ease])

  return <div className="absolute inset-0" aria-hidden="true" style={{ opacity: pronto && !falhou ? 1 : 0 }}>
    {!falhou && <Canvas dpr={[1, 1.5]} frameloop="demand" fallback={null}
      gl={{ antialias: false }} onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', () => falhar(true), { once: true })
      }}>
      <Suspense fallback={null}><Plano estado={estado.current} ligar={ligar} /></Suspense>
    </Canvas>}
  </div>
}
```

## Uso no site

```tsx
import DistorcaoImagem from './DistorcaoImagem'
import { ritmo } from './ritmo' // ritmo.foto: { duracao, ease }

export function Trabalho() { return <DistorcaoImagem ritmo={ritmo.foto} /> }
```

## Celular, reduzido e peso

- Celular: mesma onda/RGB, amplitude menor, recorte vertical, DPR até 1,5. O scroll funciona sem hover;
  toque reage enquanto pressionado e não impede arrastar a página. Nenhum CTA depende do shader.
- Reduzido: foto HTML parada, sem Canvas, módulo Three, pin ou listeners de movimento. Se mudar a
  preferência em execução, desmontar Canvas e manter a foto. Rede/WebGL com falha usa a mesma foto;
  se a própria foto falhar, o `alt` e o texto da seção continuam disponíveis.
- Peso aproximado: chunk Three/Fiber/Drei ~300–450 KB gzip, foto WebP ~150–400 KB, shader <2 KB gzip.
  Se o site já usa R3F, o runtime pode ser compartilhado; confirmar os chunks do build.
- Conferir cor comparada à foto original, recorte em 360–414px, scroll nos dois sentidos, context loss,
  desmontagem e preferência reduzida. Ajustar intensidade e recorte com a foto real, sem distorcer rostos.
