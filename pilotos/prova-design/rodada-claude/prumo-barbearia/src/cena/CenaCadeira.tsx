import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei/core/ContactShadows.js'
import { PerformanceMonitor } from '@react-three/drei/core/PerformanceMonitor.js'
import { useGLTF } from '@react-three/drei/core/Gltf.js'
import {
  CanvasTexture, DirectionalLight, EquirectangularReflectionMapping, Group, LinearSRGBColorSpace, MathUtils, Mesh,
  MeshStandardMaterial, Object3D, PerspectiveCamera, SpotLight, Vector3,
} from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { cor, ritmo } from '../ritmo'
import type { EstadoCena } from './tipos'

// Texturas 2K no computador (close no couro e na madeira); 1K no celular. Malha com Draco (decodificador local).
const LARGO = typeof window !== 'undefined' && window.innerWidth >= 1024
const MODELO = LARGO ? '/modelos/cadeira-2k.glb' : '/modelos/cadeira.glb'
const HDRI = LARGO ? '/ambientes/oficina-512.hdr' : '/ambientes/oficina-256.hdr'
const DRACO = '/draco/'
const FOV = 30

useGLTF.preload(MODELO, DRACO)

// HDRI só ilumina e reflete (não aparece no fundo: o palco é o grafite do site).
function Iluminacao() {
  const textura = useLoader(HDRLoader, HDRI)
  const cena = useThree((s) => s.scene)
  useLayoutEffect(() => {
    textura.mapping = EquirectangularReflectionMapping
    textura.colorSpace = LinearSRGBColorSpace
    textura.needsUpdate = true
    cena.environment = textura
    cena.environmentIntensity = 0.42
    return () => { cena.environment = null }
  }, [cena, textura])
  return null
}

const suave = (a: number, b: number, x: number) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// ---------- Câmera: poses-chave pelo progresso da história (u = p / fim) ----------
type Pose = { az: number; el: number; d: number; ty: number; sx: number; sy: number }
const CAMPOS: (keyof Pose)[] = ['az', 'el', 'd', 'ty', 'sx', 'sy']

export function montarPoses(aspecto: number): { u: number; p: Pose }[] {
  const celular = aspecto < 0.9
  const tanV = Math.tan(MathUtils.degToRad(FOV / 2))
  const alt = (ext: number, frac: number) => ext / frac / (2 * tanV)
  const lar = (ext: number, frac: number) => ext / frac / (2 * tanV * aspecto)
  const caber = (h: number, fh: number, w: number, fw: number) => Math.max(alt(h, fh), lar(w, fw))
  // Abertura: três quartos de frente, à direita no computador, no alto no celular.
  const abertura: Pose = { az: 0.62, el: 0.1, d: celular ? caber(1.55, 0.52, 1.25, 0.86) : caber(1.55, 0.8, 1.2, 0.4),
    ty: 0.74, sx: celular ? 0 : -0.19, sy: celular ? 0.2 : 0.01 }
  // 1. Altura: perto da base hidráulica, de lado.
  const altura: Pose = { az: 1.0, el: 0.05, d: celular ? caber(1.2, 0.44, 1.2, 0.8) : caber(1.25, 0.82, 1.2, 0.5),
    ty: 0.52, sx: celular ? 0 : -0.12, sy: celular ? 0.22 : 0 }
  // 2. Encosto: perfil, a linha do encosto inteira.
  const encosto: Pose = { az: 1.62, el: 0.12, d: celular ? caber(1.6, 0.46, 1.4, 0.8) : caber(1.6, 0.82, 1.4, 0.5),
    ty: 0.78, sx: celular ? 0 : -0.12, sy: celular ? 0.22 : 0 }
  // 3. Apoio de cabeça: três quartos de trás, subindo.
  const apoio: Pose = { az: 2.55, el: 0.34, d: celular ? caber(1.25, 0.42, 1.1, 0.8) : caber(1.2, 0.8, 1.1, 0.5),
    ty: 1.02, sx: celular ? 0 : -0.12, sy: celular ? 0.22 : 0 }
  // 4. Vista do barbeiro: de trás e do alto, ao lado do apoio de cabeça (a meia volta termina onde ele trabalha).
  const barbeiro: Pose = { az: 2.72, el: 0.62, d: celular ? caber(1.45, 0.44, 1.15, 0.8) : caber(1.45, 0.8, 1.2, 0.5),
    ty: 0.86, sx: celular ? 0 : -0.12, sy: celular ? 0.22 : 0 }
  return [
    { u: 0, p: abertura }, { u: 0.06, p: abertura }, { u: 0.22, p: altura }, { u: 0.42, p: encosto },
    { u: 0.62, p: apoio }, { u: 0.84, p: barbeiro }, { u: 1, p: barbeiro },
  ]
}

// Pôster de três quartos (movimento reduzido, falha de WebGL, Open Graph): centrado, sem deslocamento.
const POSE_POSTER: Pose = { az: 0.78, el: 0.16, d: 0, ty: 0.74, sx: 0, sy: 0 }

function poseEm(lista: { u: number; p: Pose }[], u: number, saida: Pose): Pose {
  let i = 0
  while (i < lista.length - 2 && u > lista[i + 1].u) i++
  const s = suave(lista[i].u, lista[i + 1].u, u)
  const a = lista[i].p, b = lista[i + 1].p
  for (const c of CAMPOS) saida[c] = a[c] + (b[c] - a[c]) * s
  return saida
}

// ---------- A cadeira (gira na coluna, como a de verdade) ----------
function Cadeira({ estado, giro, children }: { estado: EstadoCena; giro: Group; children?: ReactNode }) {
  const { scene } = useGLTF(MODELO, DRACO)
  const modelo = useMemo(() => {
    const copia = scene.clone(true)
    copia.traverse((o) => {
      const m = (o as Mesh).isMesh ? ((o as Mesh).material as MeshStandardMaterial) : null
      if (m) m.envMapIntensity = 1
    })
    return copia
  }, [scene])
  const fase = useRef(0)
  useFrame((_, delta) => {
    // Giro lento antes da rolagem; some quando a história começa e para quando pausado.
    if (!estado.pausado && !estado.poster) fase.current += Math.min(delta, 0.05) * ritmo.giro.velocidade
    const presenca = estado.poster ? 0 : 1 - suave(0.0, 0.08 * estado.fim, estado.p)
    const alvo = Math.sin(fase.current) * ritmo.giro.amplitude * presenca
    giro.rotation.y = alvo
  })
  return (
    <primitive object={giro}>
      <primitive object={modelo} />
      {children}
    </primitive>
  )
}

// Poça de luz no piso: sem ela, a sombra some no grafite e a cadeira flutua.
function Piso() {
  const alfa = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    r.addColorStop(0, '#fff')
    r.addColorStop(0.35, '#b8b8b8')
    r.addColorStop(0.72, '#303030')
    r.addColorStop(1, '#000')
    g.fillStyle = r
    g.fillRect(0, 0, 256, 256)
    return new CanvasTexture(c)
  }, [])
  // A troca dinâmica de movimento reduzido desmonta e recria a cena: libera a textura da GPU.
  useEffect(() => () => alfa.dispose(), [alfa])
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.002} renderOrder={-1}>
      <planeGeometry args={[4.2, 4.2]} />
      <meshStandardMaterial color="#3b4744" roughness={0.92} metalness={0} alphaMap={alfa} transparent depthWrite={false} />
    </mesh>
  )
}

// ---------- Câmera, luzes e legendas projetadas ----------
function Rig({ estado, giro }: { estado: EstadoCena; giro: Group }) {
  const { camera, size, invalidate } = useThree()
  const recorte = useRef<DirectionalLight>(null)
  const chave = useRef<SpotLight>(null)
  const alvoLuz = useMemo(() => new Object3D(), [])
  const temp = useMemo(() => ({ pose: {} as Pose, alvo: new Vector3(), dir: new Vector3(), v: new Vector3() }), [])
  const lista = useMemo(() => montarPoses(size.width / Math.max(1, size.height)), [size.width, size.height])
  const caixas = useRef(new Map<HTMLElement, { x: number; y: number; largura: number }>())
  useEffect(() => { estado.invalidar = invalidate }, [estado, invalidate])
  useLayoutEffect(() => {
    // Leituras de layout agrupadas em resize/fontes; o laço de quadros só projeta e escreve.
    const medir = () => {
      for (const { caixa } of estado.pontos) if (caixa) {
        caixas.current.set(caixa, { x: caixa.offsetLeft, y: caixa.offsetTop, largura: caixa.offsetWidth })
      }
      invalidate()
    }
    medir()
    const observador = new ResizeObserver(medir)
    for (const { caixa } of estado.pontos) if (caixa) observador.observe(caixa)
    document.fonts?.ready.then(medir)
    return () => { observador.disconnect(); caixas.current.clear() }
  }, [estado, size.width, size.height, invalidate])

  useFrame(() => {
    const cam = camera as PerspectiveCamera
    const { pose, alvo, dir, v } = temp
    if (estado.poster === 'tres-quartos') {
      Object.assign(pose, POSE_POSTER)
      const tanV = Math.tan(MathUtils.degToRad(FOV / 2))
      pose.d = Math.max(1.6 / 0.78 / (2 * tanV), 1.4 / 0.6 / (2 * tanV * (size.width / size.height)))
    } else {
      const u = estado.poster ? 0 : Math.min(1, estado.p / Math.max(0.01, estado.fim))
      poseEm(lista, u, pose)
    }
    alvo.set(0, pose.ty, 0.18)
    cam.position.set(
      alvo.x + pose.d * Math.cos(pose.el) * Math.sin(pose.az),
      alvo.y + pose.d * Math.sin(pose.el),
      alvo.z + pose.d * Math.cos(pose.el) * Math.cos(pose.az),
    )
    cam.lookAt(alvo)
    cam.setViewOffset(size.width, size.height, pose.sx * size.width, pose.sy * size.height, size.width, size.height)
    cam.updateProjectionMatrix()
    cam.updateMatrixWorld()

    // Luz de recorte cobre sempre atrás da cadeira em relação à câmera; luz-chave quente pelo lado.
    const l = recorte.current
    if (l) {
      dir.copy(alvo).sub(cam.position).setY(0)
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1)
      dir.normalize()
      l.position.copy(alvo).addScaledVector(dir, 4).add(v.set(0, 1.8, 0))
      alvoLuz.position.copy(alvo)
      alvoLuz.updateMatrixWorld()
    }

    // Legendas técnicas: ponto na âncora projetada e fio até a caixa de texto.
    giro.updateMatrixWorld()
    let yAtiva = -1
    for (const ponto of estado.pontos) {
      v.set(ponto.ancora[0], ponto.ancora[1], ponto.ancora[2]).applyMatrix4(giro.matrixWorld).project(cam)
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      if (ponto.id === estado.legendaAtiva) yAtiva = y
      if (ponto.ponto) ponto.ponto.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      if (ponto.linha && ponto.caixa) {
        const c = caixas.current.get(ponto.caixa)
        if (!c) continue
        const esquerda = c.x + c.largura / 2 < x
        ponto.linha.setAttribute('x1', x.toFixed(1))
        ponto.linha.setAttribute('y1', y.toFixed(1))
        ponto.linha.setAttribute('x2', (esquerda ? c.x + c.largura + 10 : c.x - 10).toFixed(1))
        ponto.linha.setAttribute('y2', (c.y + 10).toFixed(1))
      }
    }
    // Régua: a marca cobre sobe/desce até a altura da peça que está sendo ajustada.
    if (estado.marca && yAtiva >= 0) estado.marca.style.transform = `translate3d(0, ${yAtiva.toFixed(1)}px, 0)`
  })

  return (
    <>
      <primitive object={alvoLuz} />
      <spotLight ref={chave} position={[-2.2, 2.6, 1.6]} angle={0.55} penumbra={0.8} intensity={22} color={cor.luzQuente} decay={1.6} />
      <directionalLight ref={recorte} target={alvoLuz} intensity={5} color={cor.cobre} />
    </>
  )
}

// Compila os shaders sem travar a thread principal antes do primeiro quadro.
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

export default function CenaCadeira({ estado, pausado, girando, aoPronto, aoFalhar }: {
  estado: EstadoCena
  pausado: boolean
  girando: boolean
  aoPronto: () => void
  aoFalhar: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [visivel, mostrar] = useState(true)
  const [aba, verAba] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  const [leve, aliviar] = useState(false)
  const [aquecido, aquecer] = useState(false)
  const aoAquecer = useMemo(() => () => { aquecer(true); aoPronto() }, [aoPronto])
  const giro = useMemo(() => new Group(), [])
  const celular = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    // Várias entradas podem chegar juntas (sai e volta no mesmo quadro): vale a última.
    const io = new IntersectionObserver((es) => mostrar(es[es.length - 1].isIntersecting))
    io.observe(host.current!)
    const aoTrocarAba = () => verAba(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', aoTrocarAba)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', aoTrocarAba) }
  }, [])

  // Contínuo só enquanto a cadeira gira, na tela e com a aba visível; pausado ou depois do giro (a história
  // começou), redesenha sob demanda a cada passo da rolagem; fora da tela ou com a aba oculta, nada.
  const laco = !aquecido || !visivel || !aba ? 'never' : pausado || !girando || estado.poster ? 'demand' : 'always'
  useEffect(() => { if (laco === 'demand') estado.invalidar() }, [laco, estado])

  return (
    <div ref={host} className="absolute inset-0" data-canvas-cadeira={laco}>
      <Canvas
        dpr={celular ? [1, 1.5] : [1, 2]}
        frameloop={laco}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!estado.poster }}
        camera={{ fov: FOV, near: 0.05, far: 60, position: [2, 1.2, 4] }}
        fallback={null}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          gl.debug.checkShaderErrors = import.meta.env.DEV
          gl.domElement.addEventListener('webglcontextlost', aoFalhar, { once: true })
        }}
      >
        <Suspense fallback={null}>
          <Iluminacao />
          <Piso />
          <Cadeira estado={estado} giro={giro}>
            {/* Sombra dentro do grupo que gira: calculada uma vez e acompanha a cadeira. */}
            <ContactShadows
              key={leve ? 'leve' : 'normal'}
              frames={1}
              position={[0, 0.002, 0.15]}
              scale={3.2}
              opacity={0.85}
              blur={2.4}
              far={1.2}
              resolution={leve || celular ? 256 : 512}
              color="#000000"
            />
          </Cadeira>
          <Rig estado={estado} giro={giro} />
          <Aquecer aoAquecer={aoAquecer} />
          {visivel && !estado.poster && <AjusteDesempenho baixar={() => aliviar(true)} />}
        </Suspense>
      </Canvas>
    </div>
  )
}
