# Receita: modelo GLB real com câmera guiada pelo scroll

> Testada em 29/10/2026 numa transportadora fictícia (caixote do Poly Haven; `pilotos/prova-design/lastro-cargas`).

**Lições do primeiro uso (valem mais que o código abaixo quando a cena está na abertura):**
- Carregar o 3D assim que a seção aparece põe chunk, GLB e HDRI no caminho do LCP: Lighthouse celular 48,
  LCP 6,4 s, TBT ~2 s. Na abertura: pôster = primeiro quadro do próprio canvas (preload + `fetchpriority="high"`),
  3D só no primeiro gesto (rolagem, toque, roda, tecla) ou ~3 s depois do load em ocioso; `gl.compileAsync`
  antes do primeiro quadro e `checkShaderErrors` desligado em produção. Resultado: nota 89–94, LCP 2,5 s,
  boot do 3D em tarefas de até ~190 ms em vez de uma de 2,3 s.
- HDRI 1K (1,6 MB) só para iluminar é desperdício: 512×256 no computador e 256×128 no celular, sem diferença visível.
- Palco escuro: a sombra de contato some e o objeto flutua; pôr uma poça de luz (plano radial com alfa) sob o
  objeto. Sombra calculada uma vez; ao vivo só enquanto algo se move, e dentro do grupo que se move.
- Texturas 1K borram num close; 2K no computador e 1K no celular.

Produto ou veículo visto de vários lados, com volume, materiais e iluminação de verdade.
**Nunca colar fotos em planos para fingir volume.** Uma foto serve como fallback, identificável como foto.

## Instalar

Projeto Vite/React/TypeScript já configurado, com React 19 e tipos de Three compatíveis instalados
(Fiber 9 requer React 19). Não atualizar React silenciosamente num projeto existente.

```sh
npm view three version
npm view @react-three/fiber version
npm view @react-three/drei version
npm view @gltf-transform/cli version
npm view gsap version
npm i --save-exact three@0.186.1 @react-three/fiber@9.8.2 @react-three/drei@10.7.9 gsap@3.15.0
npm i -D --save-exact @gltf-transform/cli@4.5.1
```

Versões conferidas no registro do npm (`npm view`) em 29/10/2026; fixar sem `^`.
A integração destas versões ainda não foi compilada nesta receita.

## Modelo, licença e otimização

1. Buscar modelos baixáveis no [Sketchfab](https://sketchfab.com/3d-models?features=downloadable), filtrando
   **CC-BY**. Abrir a licença **da peça**, conferir versão e uso comercial. CC-BY exige autor, título,
   fonte, link da licença e indicação de alterações; publicar esse crédito junto dos créditos do site.
   Evitar NC, ND, uso editorial e marcas sem autorização. Guardar comprovante no inventário de assets.
2. Alternativa: [modelos](https://polyhaven.com/models) e [HDRIs](https://polyhaven.com/hdris) do Poly Haven,
   [CC0](https://polyhaven.com/license). Guardar origem e licença mesmo sem crédito obrigatório.
   Começar com HDRI 1K; baixar o `.hdr` para o próprio site, sem depender de preset remoto.
3. Converter a GLB se necessário; corrigir orientação, escala, materiais e excesso de peças no Blender.
   Esta receita é para malha estática; animação esquelética exige clonagem própria com SkeletonUtils.
4. Otimizar com [glTF Transform](https://gltf-transform.dev/cli), preservando o original:

```sh
npx @gltf-transform/cli@4.5.1 optimize produto-original.glb public/modelos/produto.glb --compress meshopt --texture-compress webp --texture-size 1024
npx @gltf-transform/cli@4.5.1 inspect public/modelos/produto.glb
```

Inspecionar o resultado: meshopt e WebP exigem suporte do carregador/navegador. `useGLTF` habilita meshopt
por padrão ([API](https://drei.docs.pmnd.rs/loaders/gltf-use-gltf)); aqui ele está explícito. Comparar materiais,
normais e transparência após otimizar. Alvo inicial: GLB até ~2 MB, texturas 1K, ~50–100 mil triângulos;
isso é orçamento para medir, não garantia. Exportar também `public/modelos/produto-poster.webp` e salvar
o HDRI em `public/ambientes/estudio-1k.hdr`.

## Componente completo e marcação (`ModeloReal.tsx`)

O `ritmo` vem de `src/ritmo.ts` do site. O poster e o texto aparecem antes do módulo pesado.

```tsx
import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

const Cena = lazy(() => import('./ModeloCanvas'))
class Fallback extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() { return this.state.falhou ? null : this.props.children }
}
export default function ModeloReal({ ritmo }: {
  ritmo: { telasDesktop: number; telasCelular: number }
}) {
  const secao = useRef<HTMLElement>(null)
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
  return <section ref={secao} data-modelo-real className="min-h-[100svh] px-6 py-10">
    <h2>Conheça o produto por inteiro</h2>
    <p>Benefícios e características reais ficam sempre disponíveis neste texto.</p>
    <div className="relative mt-6 h-[65svh] min-h-64" aria-hidden="true">
      <img src="/modelos/produto-poster.webp" alt="" width="1200" height="900"
        className="absolute inset-0 h-full w-full object-contain" />
      {ativo && <Fallback><Suspense fallback={null}>
        <Cena secao={secao} ritmo={ritmo} />
      </Suspense></Fallback>}
    </div>
  </section>
}
```

## Canvas e animação dentro de `gsap.matchMedia` (`ModeloCanvas.tsx`)

```tsx
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, PerformanceMonitor, useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
type Estado = { p: number }
type Props = { secao: RefObject<HTMLElement | null>;
  ritmo: { telasDesktop: number; telasCelular: number } }

function CameraScroll({ estado }: { estado: Estado }) {
  const { camera, size } = useThree()
  const alvo = useMemo(() => new Vector3(0, 0.9, 0), [])
  useFrame(() => {
    // Modelo normalizado: cabe numa caixa de lado 3. Raio conservador = diagonal/2.
    const aspecto = size.width / Math.max(1, size.height)
    const fov = 35 * Math.PI / 180
    const meioAngulo = Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * aspecto))
    const distancia = (Math.sqrt(3) * 1.5 / Math.sin(meioAngulo)) * 1.12
    const angulo = MathUtils.lerp(-0.7, 1.1, estado.p)
    camera.position.set(Math.sin(angulo) * distancia,
      0.9 + distancia * MathUtils.lerp(0.15, 0.55, estado.p), Math.cos(angulo) * distancia)
    camera.lookAt(alvo)
  })
  return null
}

function Produto({ pronto }: { pronto: () => void }) {
  const { scene } = useGLTF('/modelos/produto.glb', false, true)
  const modelo = useMemo(() => {
    const copia = scene.clone(true)
    const caixa = new Box3().setFromObject(copia)
    const tamanho = caixa.getSize(new Vector3())
    const centro = caixa.getCenter(new Vector3())
    const escala = 3 / Math.max(tamanho.x, tamanho.y, tamanho.z, 0.001)
    copia.scale.multiplyScalar(escala)
    copia.position.sub(centro.multiplyScalar(escala))
    copia.position.y += tamanho.y * escala / 2
    return copia
  }, [scene])
  useEffect(pronto, [pronto])
  // Geometrias/texturas são compartilhadas com o cache do useGLTF.
  return <primitive object={modelo} dispose={null} />
}

function AjusteDesempenho({ baixar }: { baixar: () => void }) {
  const setDpr = useThree(s => s.setDpr)
  return <PerformanceMonitor flipflops={2} onDecline={() => { setDpr(1); baixar() }}
    onFallback={() => { setDpr(1); baixar() }} />
}

export default function ModeloCanvas({ secao, ritmo }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const estado = useRef<Estado>({ p: 0 })
  const [pronto, marcarPronto] = useState(false)
  const [visivel, mostrar] = useState(false)
  const [leve, aliviar] = useState(false)
  const [falhou, falhar] = useState(false)
  const aoCarregar = useMemo(() => () => marcarPronto(true), [])
  const baixar = useMemo(() => () => aliviar(true), [])

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => mostrar(e.isIntersecting))
    io.observe(host.current!)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!pronto || falhou) return
    const mm = gsap.matchMedia()
    mm.add({ mover: '(prefers-reduced-motion: no-preference)',
      celular: '(max-width: 767px)' }, ctx => {
      if (!ctx.conditions!.mover) return
      const gatilho = ScrollTrigger.create({ trigger: secao.current!, pin: true,
        start: 'top top', end: () => '+=' + window.innerHeight *
          (ctx.conditions!.celular ? ritmo.telasCelular : ritmo.telasDesktop),
        invalidateOnRefresh: true, onUpdate: st => { estado.current.p = st.progress } })
      ScrollTrigger.sort()
      ScrollTrigger.refresh()
      estado.current.p = gatilho.progress
      return () => { gatilho.kill(true); estado.current.p = 0 }
    })
    return () => mm.revert()
  }, [pronto, falhou, secao, ritmo.telasDesktop, ritmo.telasCelular])

  return <div ref={host} className="absolute inset-0" style={{ opacity: pronto && !falhou ? 1 : 0 }}>
    {!falhou && <Canvas dpr={[1, 1.5]} frameloop={visivel ? 'always' : 'demand'}
      camera={{ fov: 35, near: 0.1, far: 100, position: [0, 2, 12] }}
      fallback={null} onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', () => falhar(true), { once: true })
      }}>
      <color attach="background" args={['#eceae6']} />
      <Suspense fallback={null}>
        <Environment files="/ambientes/estudio-1k.hdr" />
        <Produto pronto={aoCarregar} />
        <ContactShadows key={leve ? 'leve' : 'normal'} position={[0, -0.01, 0]}
          scale={10} opacity={0.5} blur={2} far={5} resolution={leve ? 128 : 256} frames={1} />
        <CameraScroll estado={estado.current} />
        {visivel && <AjusteDesempenho baixar={baixar} />}
      </Suspense>
    </Canvas>}
  </div>
}
```

## Uso no site

```tsx
import ModeloReal from './ModeloReal'
import { ritmo } from './ritmo' // ritmo.modelo: { telasDesktop, telasCelular }

export function Produto() { return <ModeloReal ritmo={ritmo.modelo} /> }
```

## Celular, reduzido e peso

- Celular: mesma órbita; distância calcula o campo horizontal para caber em 360–414px. Pin menor no
  ritmo do estilo, `dpr={[1, 1.5]}`, [PerformanceMonitor](https://drei.docs.pmnd.rs/performances/performance-monitor)
  baixa DPR e resolução da sombra ao medir lentidão. Manter o modelo e a trajetória.
- Sombras de contato calculadas uma vez: só a câmera anda. Não adicionar animação no objeto sem rever
  `frames={1}`. Fora da tela, canvas em `demand`; monitor só mede com renderização contínua visível.
- Reduzido: shell mantém poster e texto, não importa Three nem GLB/HDRI; nenhum pin. Erro de módulo,
  modelo/HDRI ou perda de contexto devolve o poster. Conferir também aparelho sem WebGL.
- Peso aproximado: chunk Three/Fiber/Drei ~300–450 KB gzip (confirmar tree shaking), GLB ~0,5–2 MB,
  HDRI 1K ~0,5–1,5 MB, poster ~80–200 KB. Texturas descomprimidas ocupam mais VRAM que o download.
- Animar só a câmera; DOM só admite transform/opacity. Testar ida/volta, restauração de scroll,
  troca de preferência, resize, erro de asset e aparelho médio antes de marcar como aprovada.
