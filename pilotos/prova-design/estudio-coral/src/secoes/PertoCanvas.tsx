import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { shaderMaterial, useTexture } from '@react-three/drei'
import { SRGBColorSpace, Texture, Vector2 } from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type Props = { secao: RefObject<HTMLElement | null>; foto: RefObject<HTMLDivElement | null>
  ritmo: { duracao: number; ease: string }; url: string }
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
      float intensidade = (sin(uP * 3.14159265) * 0.008 + uHover * 0.016) * uForca;
      float onda = sin(vUv.y * 14.0 + uP * 12.566) * intensidade;
      uv.x += onda;
      float desvio = intensidade * 0.38;
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

function Plano({ estado, ligar, url }: { estado: Estado; ligar: (fn: () => void) => void; url: string }) {
  const textura = useTexture(url)
  const { size, invalidate } = useThree()
  const material = useMemo(() => new FotoMaterial(), [])
  useEffect(() => {
    textura.colorSpace = SRGBColorSpace
    textura.needsUpdate = true
    material.uFoto = textura
    const imagem = textura.image as { width: number; height: number }
    const aspectoFoto = imagem.width / imagem.height
    const aspectoTela = size.width / Math.max(1, size.height)
    // Equivalente a object-fit: cover, sem esticar a foto.
    material.uRecorte.set(Math.min(1, aspectoTela / aspectoFoto), Math.min(1, aspectoFoto / aspectoTela))
    ligar(invalidate)
    invalidate() // textura chegou: frameloop "demand" precisa deste primeiro quadro
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

export default function PertoCanvas({ secao, foto, ritmo, url }: Props) {
  const estado = useRef<Estado>({ p: 0, hover: 0, forca: 1 })
  const invalidar = useRef<() => void>(() => {})
  const [pronto, marcarPronto] = useState(false)
  const [falhou, falhar] = useState(false)
  const ligar = useMemo(() => (fn: () => void) => { invalidar.current = fn; marcarPronto(true) }, [])

  useEffect(() => {
    if (!pronto || falhou) return
    const mm = gsap.matchMedia()
    mm.add({ mover: '(prefers-reduced-motion: no-preference)', celular: '(max-width: 767px)' }, (ctx) => {
      if (!ctx.conditions!.mover) return
      const alvo = foto.current!
      const e = estado.current
      e.forca = ctx.conditions!.celular ? 0.7 : 1
      const hover = gsap.quickTo(e, 'hover', { duration: ritmo.duracao, ease: ritmo.ease, onUpdate: () => invalidar.current() })
      const entrar = (ev: PointerEvent) => { if (ev.pointerType === 'mouse') hover(1) }
      const sair = () => hover(0)
      const tocar = (ev: PointerEvent) => { if (ev.pointerType !== 'mouse') hover(1) }
      const eventos = [['pointerenter', entrar], ['pointerleave', sair], ['pointerdown', tocar], ['pointerup', sair], ['pointercancel', sair]] as const
      eventos.forEach(([tipo, fn]) => alvo.addEventListener(tipo, fn as EventListener, { passive: true }))
      const gatilho = ScrollTrigger.create({ trigger: secao.current!, start: 'top bottom', end: 'bottom top',
        onUpdate: (st) => { e.p = st.progress; invalidar.current() } })
      e.p = gatilho.progress
      invalidar.current()
      return () => {
        eventos.forEach(([tipo, fn]) => alvo.removeEventListener(tipo, fn as EventListener))
        hover.tween.kill()
        gatilho.kill()
        e.hover = 0
        invalidar.current()
      }
    })
    return () => mm.revert()
  }, [pronto, falhou, secao, foto, ritmo.duracao, ritmo.ease])

  return <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ opacity: pronto && !falhou ? 1 : 0 }}>
    {!falhou && <Canvas dpr={[1, 1.5]} frameloop="demand" fallback={null} gl={{ antialias: false }} resize={{ offsetSize: true }}
      onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', () => falhar(true), { once: true }) }}>
      <Suspense fallback={null}><Plano estado={estado.current} ligar={ligar} url={url} /></Suspense>
    </Canvas>}
  </div>
}
