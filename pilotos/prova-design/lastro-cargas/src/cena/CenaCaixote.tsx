import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei/core/ContactShadows.js'
import { PerformanceMonitor } from '@react-three/drei/core/PerformanceMonitor.js'
import { useGLTF } from '@react-three/drei/core/Gltf.js'
import { Box3, CanvasTexture, DirectionalLight, EquirectangularReflectionMapping, Group, LinearSRGBColorSpace, MathUtils, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Vector3 } from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { cor } from '../ritmo'
import { deslocamentoSaida, type EstadoCena } from './tipos'

// Caixa de ovos em GLB otimizado, com materiais próprios e escala normalizada.
// HDRI reduzido do original 1K (ferramentas/reduzir-hdr.py): só ilumina e reflete, não aparece no fundo.
const LARGO = typeof window !== 'undefined' && window.innerWidth >= 1024
const MODELO = '/modelos/ovos.glb'
const HDRI = LARGO ? '/ambientes/galpao-512.hdr' : '/ambientes/galpao-256.hdr'
const FOV = 32

useGLTF.preload(MODELO, false, true)

// Esta cena usa somente Radiance HDR. Evita trazer os caminhos de EXR/gainmap e portal do
// Environment genérico, mantendo exatamente a mesma peça, projeção e intensidade de luz.
function Iluminacao() {
  const textura = useLoader(HDRLoader, HDRI)
  const cena = useThree((s) => s.scene)
  useLayoutEffect(() => {
    const anterior = cena.environment
    const intensidadeAnterior = cena.environmentIntensity
    textura.mapping = EquirectangularReflectionMapping
    textura.colorSpace = LinearSRGBColorSpace
    textura.needsUpdate = true
    cena.environment = textura
    cena.environmentIntensity = 0.6
    return () => {
      cena.environment = anterior
      cena.environmentIntensity = intensidadeAnterior
    }
  }, [cena, textura])
  return null
}

const suave = (a: number, b: number, x: number) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// ---------- Câmera: poses-chave interpoladas pelo progresso ----------
type Pose = { az: number; el: number; d: number; tx: number; ty: number; tz: number; sx: number; sy: number; up: number }
const CAMPOS: (keyof Pose)[] = ['az', 'el', 'd', 'tx', 'ty', 'tz', 'sx', 'sy', 'up']

function montarPoses(aspecto: number): { t: number; p: Pose }[] {
  const celular = aspecto < 0.9
  const tanV = Math.tan(MathUtils.degToRad(FOV / 2))
  const alt = (ext: number, frac: number) => ext / frac / (2 * tanV)
  const lar = (ext: number, frac: number) => ext / frac / (2 * tanV * aspecto)
  // Caixa aberta em três quartos: embalagem e ovos visíveis, acima do título no celular.
  const perto: Pose = { az: 0.4, el: 0.7, d: lar(3.2, celular ? 0.88 : 0.48), tx: 0, ty: 0.28, tz: 0,
    sx: celular ? 0 : -0.13, sy: celular ? 0.16 : 0.02, up: 0 }
  // Recua até o caixote inteiro, em três quartos.
  const tresQuartos: Pose = { az: 0.8, el: 0.6, d: Math.max(alt(2.6, 0.62), lar(3.6, celular ? 0.86 : 0.44)),
    tx: 0, ty: 0.62, tz: 0, sx: celular ? 0 : -0.13, sy: celular ? 0.1 : 0, up: 0 }
  const tresQuartos2: Pose = { ...tresQuartos, az: 1.1, el: 0.65 }
  // Continua girando até o lado comprido de trás, rente ao chão (palavra gigante atrás).
  const lado: Pose = { az: 1.8, el: 0.5, d: Math.max(lar(3.0, celular ? 0.9 : 0.5), alt(1.3, 0.4)),
    tx: 0, ty: 0.32, tz: 0, sx: 0, sy: 0, up: 0 }
  const lado2: Pose = { ...lado, az: 1.9 }
  // Sobe e vira: de cima, a frente (+x) aponta para o alto da tela.
  // No celular a carga fica à esquerda (38%) e as cidades passam pela direita.
  const cima1: Pose = { az: Math.PI, el: Math.PI / 2 - 1e-4, d: Math.max(alt(3.0, 0.4), lar(1.5, celular ? 0.3 : 0.18)),
    tx: 0, ty: 0, tz: 0, sx: celular ? 0.12 : 0, sy: celular ? 0.07 : 0, up: 1 }
  const cima2: Pose = { ...cima1, d: Math.max(alt(9.5, 0.72), lar(4.9, celular ? 0.5 : 0.4)) }
  return [
    { t: 0, p: perto }, { t: 0.05, p: perto }, { t: 0.19, p: tresQuartos }, { t: 0.25, p: tresQuartos2 },
    { t: 0.33, p: lado }, { t: 0.37, p: lado2 }, { t: 0.5, p: cima1 }, { t: 0.6, p: cima2 }, { t: 1, p: cima2 },
  ]
}

function poseEm(lista: { t: number; p: Pose }[], p: number, k: number, saida: Pose): Pose {
  const tempo = (i: number) => (i === lista.length - 1 ? 1 : lista[i].t * k)
  let i = 0
  while (i < lista.length - 2 && p > tempo(i + 1)) i++
  const s = suave(tempo(i), tempo(i + 1), p)
  const a = lista[i].p, b = lista[i + 1].p
  for (const c of CAMPOS) saida[c] = a[c] + (b[c] - a[c]) * s
  return saida
}

// ---------- Caixotes: o protagonista e os vizinhos que chegam na vista de cima ----------
const GX = 3.3, GZ = 2.5
const VIZINHOS = [
  { x: 0, z: GZ, ox: 0, oz: 14, giro: 0 },
  { x: 0, z: -GZ, ox: 0, oz: -14, giro: Math.PI },
  { x: GX, z: 0, ox: 16, oz: 0, giro: Math.PI },
  { x: -GX, z: 0, ox: -16, oz: 0, giro: 0 },
  { x: GX, z: GZ, ox: GX, oz: 14, giro: 0.012 },
  { x: -GX, z: -GZ, ox: -GX, oz: -14, giro: Math.PI - 0.01 },
  { x: -GX, z: GZ, ox: -GX, oz: 14, giro: Math.PI + 0.008 },
  { x: GX, z: -GZ, ox: GX, oz: -14, giro: -0.01 },
]

function Caixotes({ estado, raiz, children }: { estado: EstadoCena; raiz: Group; children?: ReactNode }) {
  const { scene } = useGLTF(MODELO, false, true)
  const base = useMemo(() => {
    const copia = scene.clone(true)
    const caixa = new Box3().setFromObject(copia)
    const tam = caixa.getSize(new Vector3())
    const centro = caixa.getCenter(new Vector3())
    const esc = 3 / Math.max(tam.x, tam.y, tam.z, 0.001)
    copia.scale.setScalar(esc)
    copia.position.set(-centro.x * esc, -caixa.min.y * esc, -centro.z * esc)
    copia.traverse((o) => {
      const m = (o as Mesh).isMesh ? ((o as Mesh).material as MeshStandardMaterial) : null
      if (m) m.envMapIntensity = 1.15
    })
    const g = new Group()
    g.add(copia)
    return g
  }, [scene])
  const vizinhos = useMemo(() => VIZINHOS.map((v) => {
    const c = base.clone(true)
    c.rotation.y = v.giro
    c.visible = false
    return c
  }), [base])

  useFrame(() => {
    const { p, k } = estado
    raiz.position.x = deslocamentoSaida(estado)
    vizinhos.forEach((c, i) => {
      const v = VIZINHOS[i]
      const s = suave((0.47 + i * 0.013) * k, (0.56 + i * 0.013) * k, p)
      c.visible = !estado.poster && p > 0.44 * k
      c.position.set(MathUtils.lerp(v.ox, v.x, s), 0, MathUtils.lerp(v.oz, v.z, s))
    })
  })

  return (
    <primitive object={raiz}>
      <primitive object={base} />
      {vizinhos.map((c, i) => <primitive key={i} object={c} />)}
      {children}
    </primitive>
  )
}

// ---------- Sombra de contato: calculada uma vez; ao vivo só enquanto os vizinhos chegam ----------
// Fica dentro do grupo dos caixotes, então acompanha a carga na saída sem recalcular.
function Sombras({ estado, leve, celular }: { estado: EstadoCena; leve: boolean; celular: boolean }) {
  const [viva, mudar] = useState(false)
  const atual = useRef(false)
  useFrame(() => {
    const agora = estado.p > 0.43 * estado.k && estado.p < 0.64 * estado.k
    if (agora !== atual.current) { atual.current = agora; mudar(agora) }
  })
  return (
    <ContactShadows
      key={leve ? 'leve' : 'normal'}
      frames={viva ? Infinity : 1}
      position={[0, 0.002, 0]}
      scale={22}
      opacity={0.9}
      blur={2.2}
      far={2.2}
      resolution={leve || celular ? 256 : 512}
      color="#000000"
    />
  )
}

// ---------- Piso: poça de luz de galpão sob a carga (a sombra de contato precisa de chão claro) ----------
function Piso({ estado }: { estado: EstadoCena }) {
  const ref = useRef<Mesh>(null)
  const alfa = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    r.addColorStop(0, '#fff')
    r.addColorStop(0.32, '#c8c8c8')
    r.addColorStop(0.7, '#3a3a3a')
    r.addColorStop(1, '#000')
    g.fillStyle = r
    g.fillRect(0, 0, 256, 256)
    return new CanvasTexture(c)
  }, [])
  useFrame(() => {
    // De cima a poça cresce para caber a carga inteira.
    const s = 1 + 0.7 * suave(0.44 * estado.k, 0.6 * estado.k, estado.p)
    ref.current?.scale.set(s, s, 1)
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position-y={-0.002} renderOrder={-1}>
      <planeGeometry args={[11, 11]} />
      <meshStandardMaterial color="#24282e" opacity={0.23} roughness={0.94} metalness={0} alphaMap={alfa} transparent depthWrite={false} />
    </mesh>
  )
}

// ---------- Câmera, luz de recorte e legendas projetadas ----------
function Rig({ estado }: { estado: EstadoCena }) {
  const { camera, size } = useThree()
  const recorte = useRef<DirectionalLight>(null)
  const alvoLuz = useMemo(() => new Object3D(), [])
  const temp = useMemo(() => ({ pose: {} as Pose, alvo: new Vector3(), dir: new Vector3(), v: new Vector3() }), [])
  const lista = useMemo(() => montarPoses(size.width / Math.max(1, size.height)), [size.width, size.height])
  const caixas = useRef(new Map<HTMLElement, { x: number; y: number; largura: number }>())
  useLayoutEffect(() => {
    const medir = () => {
      // Leituras agrupadas em resize/fontes; o loop de renderização só projeta e escreve.
      for (const { caixa } of estado.pontos) if (caixa) {
        caixas.current.set(caixa, { x: caixa.offsetLeft, y: caixa.offsetTop, largura: caixa.offsetWidth })
      }
    }
    medir()
    const observador = new ResizeObserver(medir)
    for (const { caixa } of estado.pontos) if (caixa) observador.observe(caixa)
    return () => { observador.disconnect(); caixas.current.clear() }
  }, [estado, size.width, size.height])

  useFrame(({ clock }) => {
    const cam = camera as PerspectiveCamera
    const { pose, alvo, dir, v } = temp
    const p = estado.posterAbertura ? 0 : estado.poster ? 0.19 * estado.k : estado.p
    poseEm(lista, p, estado.k, pose)
    if (estado.poster && !estado.posterAbertura) { pose.sx = 0; pose.sy = 0 }
    const t = clock.elapsedTime
    const resp = estado.poster ? 0 : 1 - 0.8 * pose.up
    const az = pose.az + Math.sin(t * 0.42) * 0.05 * resp
    const el = Math.min(Math.PI / 2 - 1e-4, pose.el + Math.sin(t * 0.31 + 1) * 0.02 * resp)
    const d = pose.d * (1 + Math.sin(t * 0.55) * 0.014 * resp)
    alvo.set(pose.tx, pose.ty, pose.tz)
    cam.position.set(
      alvo.x + d * Math.cos(el) * Math.sin(az),
      alvo.y + d * Math.sin(el),
      alvo.z + d * Math.cos(el) * Math.cos(az),
    )
    cam.up.set(pose.up, 1 - pose.up, 0).normalize()
    cam.lookAt(alvo)
    cam.setViewOffset(size.width, size.height, pose.sx * size.width, pose.sy * size.height, size.width, size.height)
    cam.updateProjectionMatrix()
    cam.updateMatrixWorld()

    // Luz de recorte laranja sempre atrás do caixote em relação à câmera.
    const l = recorte.current
    if (l) {
      dir.copy(alvo).sub(cam.position).setY(0)
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1)
      dir.normalize()
      l.position.copy(alvo).addScaledVector(dir, 7).add(v.set(0, 2.6, 0))
      alvoLuz.position.copy(alvo)
      alvoLuz.updateMatrixWorld()
    }

    // Legendas técnicas: ponto na âncora projetada e fio até a caixa de texto.
    const saidaX = deslocamentoSaida(estado)
    for (const ponto of estado.pontos) {
      v.set(ponto.ancora[0] + saidaX, ponto.ancora[1], ponto.ancora[2])
      v.project(cam)
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      if (ponto.ponto) ponto.ponto.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      if (ponto.linha && ponto.caixa) {
        const c = caixas.current.get(ponto.caixa)
        if (!c) continue
        const esquerda = c.x + c.largura / 2 < x
        const bx = esquerda ? c.x + c.largura + 10 : c.x - 10
        const by = c.y + 9
        ponto.linha.setAttribute('x1', x.toFixed(1))
        ponto.linha.setAttribute('y1', y.toFixed(1))
        ponto.linha.setAttribute('x2', bx.toFixed(1))
        ponto.linha.setAttribute('y2', by.toFixed(1))
      }
    }
  })

  return (
    <>
      <primitive object={alvoLuz} />
      <directionalLight position={[2.5, 9, 4]} intensity={2.2} color="#fff1e0" />
      <directionalLight ref={recorte} target={alvoLuz} intensity={2.8} color={cor.sinal} />
    </>
  )
}

// Compila os shaders sem travar a thread principal (KHR_parallel_shader_compile) antes do primeiro quadro.
function Aquecer({ aoAquecer }: { aoAquecer: () => void }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let vivo = true
    gl.compileAsync(scene, camera).catch(() => undefined).then(() => { if (vivo) aoAquecer() })
    return () => { vivo = false }
  }, [gl, scene, camera, aoAquecer])
  return null
}

function AjusteDesempenho({ baixar }: { baixar: () => void }) {
  const setDpr = useThree((s) => s.setDpr)
  return <PerformanceMonitor flipflops={2} onDecline={() => { setDpr(1); baixar() }} onFallback={() => { setDpr(1); baixar() }} />
}

export default function CenaCaixote({ estado, aoPronto, aoFalhar }: {
  estado: EstadoCena
  aoPronto: () => void
  aoFalhar: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [visivel, mostrar] = useState(true)
  const [leve, aliviar] = useState(false)
  const [aquecido, aquecer] = useState(false)
  const aoAquecer = useMemo(() => () => { aquecer(true); aoPronto() }, [aoPronto])
  const raiz = useMemo(() => new Group(), [])
  const celular = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => mostrar(e.isIntersecting))
    io.observe(host.current!)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={host} className="absolute inset-0">
      <Canvas
        dpr={celular ? [1, 1.5] : [1, 2]}
        frameloop={aquecido && visivel ? 'always' : 'never'}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: estado.poster }}
        camera={{ fov: FOV, near: 0.1, far: 200, position: [2, 2, 6] }}
        fallback={null}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          gl.debug.checkShaderErrors = import.meta.env.DEV
          gl.domElement.addEventListener('webglcontextlost', aoFalhar, { once: true })
        }}
      >
        <Suspense fallback={null}>
          <Iluminacao />
          <Piso estado={estado} />
          <Caixotes estado={estado} raiz={raiz}>
            <Sombras estado={estado} leve={leve} celular={celular} />
          </Caixotes>
          <Rig estado={estado} />
          <Aquecer aoAquecer={aoAquecer} />
          {visivel && !estado.poster && <AjusteDesempenho baixar={() => aliviar(true)} />}
        </Suspense>
      </Canvas>
    </div>
  )
}
