import { useRef, useState } from 'react'
import { m } from 'motion/react'
import { gsap, useGSAP } from '../movimento'
import { consultas, ritmo } from '../ritmo'
import { Foto } from '../componentes/Foto'
import { LinhaCostura } from '../componentes/LinhaCostura'
import { trabalho } from '../data/conteudo'

const ZOOM = 2
// Onde a lupa "estaciona" quando o mouse não está na foto (fração da foto): em cima do pente.
const PARADA = { computador: [0.5, 0.36], celular: [0.56, 0.4] } as const

/**
 * O trabalho — cursor-lupa que inverte as cores e amplia (família Interação). Com mouse a lupa segue o cursor
 * por transform (gsap.quickTo); sem o mouse ela estaciona no pente. No toque (e no teclado), a foto inteira
 * inverte. Nada essencial depende disso. Costura: fio grosso amarelo da grade desce até a próxima seção.
 */
export function Trabalho() {
  const raiz = useRef<HTMLElement>(null)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)

  useGSAP(
    () => {
      const figura = raiz.current!.querySelector<HTMLElement>('[data-figura]')!
      const lupa = raiz.current!.querySelector<HTMLElement>('[data-lupa]')!
      const dentro = raiz.current!.querySelector<HTMLElement>('[data-lupa-img]')!
      const mm = gsap.matchMedia()

      mm.add({ computador: consultas.computador, celular: consultas.celular, mouse: consultas.mouse }, (ctx) => {
        const { computador, mouse } = ctx.conditions!
        const parada = computador ? PARADA.computador : PARADA.celular
        let fw = figura.clientWidth, fh = figura.clientHeight
        const borda = parseFloat(getComputedStyle(lupa).borderLeftWidth) || 0
        const medir = () => {
          fw = figura.clientWidth
          fh = figura.clientHeight
          dentro.style.width = `${fw}px`
          dentro.style.height = `${fh}px`
        }
        medir()
        const obs = new ResizeObserver(medir)
        obs.observe(figura)
        gsap.set(dentro, { scale: ZOOM, transformOrigin: '0 0' })
        gsap.set(lupa, { autoAlpha: 1 })

        // Posição da lupa a partir do ponto (px, py) da foto
        const alvo = (px: number, py: number) => {
          const l = lupa.offsetWidth
          return { lx: px - l / 2, ly: py - l / 2, ix: l / 2 - borda - px * ZOOM, iy: l / 2 - borda - py * ZOOM }
        }
        const opcoes = { duration: ritmo.media, ease: 'power3.out' }
        const lx = gsap.quickTo(lupa, 'x', opcoes), ly = gsap.quickTo(lupa, 'y', opcoes)
        const ix = gsap.quickTo(dentro, 'x', opcoes), iy = gsap.quickTo(dentro, 'y', opcoes)
        const ir = (px: number, py: number) => {
          const a = alvo(px, py)
          lx(a.lx); ly(a.ly); ix(a.ix); iy(a.iy)
        }

        // Entrada: a lupa desliza de fora da foto até o pente quando a seção aparece.
        const proxy = { px: -lupa.offsetWidth, py: parada[1] * fh }
        const aplicar = () => {
          const a = alvo(proxy.px, proxy.py)
          gsap.set(lupa, { x: a.lx, y: a.ly })
          gsap.set(dentro, { x: a.ix, y: a.iy })
        }
        aplicar()
        const entrada = gsap.to(proxy, {
          px: parada[0] * fw,
          duration: ritmo.longa * 1.4,
          ease: ritmo.entra,
          onUpdate: aplicar,
          paused: true,
          scrollTrigger: { trigger: figura, start: 'top 70%', once: true },
        })

        if (!mouse) return () => { obs.disconnect(); entrada.kill() }

        const mover = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return
          entrada.progress(1).kill()
          const r = figura.getBoundingClientRect()
          ir(e.clientX - r.left, e.clientY - r.top)
        }
        const sair = () => ir(parada[0] * fw, parada[1] * fh)
        figura.addEventListener('pointermove', mover)
        figura.addEventListener('pointerleave', sair)
        return () => {
          obs.disconnect()
          figura.removeEventListener('pointermove', mover)
          figura.removeEventListener('pointerleave', sair)
        }
      })

      // Costura: o fio grosso da grade é desenhado com a rolagem (strokeDashoffset).
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray<SVGPathElement>('[data-fio-traco]').forEach((traco) => {
          gsap.fromTo(traco, { strokeDasharray: '1 2', strokeDashoffset: 1.02 }, {
            strokeDashoffset: 0, ease: 'none',
            scrollTrigger: { trigger: traco.closest('div'), start: 'top 90%', end: 'bottom 50%', scrub: ritmo.scrub },
          })
        })
      })
    },
    { scope: raiz },
  )

  const sizes = '(max-width: 767px) 100vw, 60vw'
  const fotoClasse = 'absolute inset-0 h-full w-full object-cover [object-position:42%_50%]'
  return (
    <section ref={raiz} id="trabalho" aria-labelledby="titulo-trabalho" className="relative overflow-x-clip bg-tinta pt-[clamp(72px,10vw,150px)] text-papel">
      <div className="grid grid-cols-1 md:grid-cols-[60vw_1fr]">
        <div className="relative max-md:order-2">
          <button
            type="button"
            data-figura
            aria-pressed={zoom !== null}
            aria-label={trabalho.botaoRotulo}
            onClick={(e) => {
              // Toque/clique amplia ×2 no ponto tocado (teclado: no centro); de novo, volta.
              if (zoom) return setZoom(null)
              const r = e.currentTarget.getBoundingClientRect()
              const teclado = e.detail === 0
              setZoom({ x: teclado ? 50 : ((e.clientX - r.left) / r.width) * 100, y: teclado ? 50 : ((e.clientY - r.top) / r.height) * 100 })
            }}
            className="relative block aspect-[3/2] w-full cursor-pointer overflow-hidden border-0 bg-tinta p-0 [@media(hover:hover)_and_(pointer:fine)]:cursor-none max-md:aspect-[4/5] [&_img]:pointer-events-none"
          >
            <m.div
              className="absolute inset-0"
              initial={false}
              animate={{ scale: zoom ? 2 : 1 }}
              style={{ transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : '50% 50%' }}
              transition={{ duration: 0.4, ease: [0.7, 0, 0.2, 1] }}
            >
              <Foto nome="detalhe-pente" alt={trabalho.alt} sizes={sizes} className={fotoClasse} />
            </m.div>
            <span className={`absolute inset-0 block transition-opacity duration-150 ${zoom ? 'opacity-0' : ''}`} aria-hidden="true">
            <span data-lupa className="lupa invisible h-[clamp(150px,17vw,260px)] w-[clamp(150px,17vw,260px)] motion-reduce:hidden" aria-hidden="true">
              <span data-lupa-img className="absolute left-0 top-0 block">
                <Foto nome="detalhe-pente" alt="" ariaHidden sizes={sizes} className="h-full w-full object-cover [object-position:42%_50%] contrast-125" />
              </span>
              <span className="absolute left-0 top-0 bg-grito px-1.5 py-0.5 text-[13px] font-bold text-tinta">
                {trabalho.lupaRotulo}
              </span>
            </span>
            </span>
          </button>
          <p className="m-0 border-b-[3px] border-papel px-[var(--margem)] py-3 text-[15px] font-semibold text-papel/80">
            <span className="hidden [@media(hover:hover)_and_(pointer:fine)]:inline">{trabalho.texto.split(':')[0]}. Clique para ampliar.</span>
            <span className="[@media(hover:hover)_and_(pointer:fine)]:hidden">{trabalho.textoToque}</span>
          </p>
        </div>

        <div className="relative flex flex-col border-papel px-[var(--margem)] md:border-l-[3px] max-md:order-1 max-md:pb-8">
          <h2 id="titulo-trabalho" className="titulo m-0 text-[clamp(64px,8.6vw,148px)]" style={{ fontWeight: 800 }}>
            {trabalho.titulo[0]} <span className="text-grito">{trabalho.titulo[1]}</span>
            <br />
            {trabalho.titulo[2]}
          </h2>
          <p className="mb-0 mt-6 max-w-[38ch] text-[18px] text-papel/85 max-md:text-[16px]">{trabalho.texto}</p>
          <ol className="m-0 mt-8 list-none p-0 max-md:hidden">
            {trabalho.itens.map(([t, d]) => (
              <li key={t} className="border-t-[3px] border-papel py-3">
                <span>
                  <strong className="block text-[18px] font-bold uppercase tracking-[0.06em]">{t}</strong>
                  <span className="text-[15px] text-papel/70">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Lista no celular, depois da foto */}
      <ol className="m-0 list-none p-0 px-[var(--margem)] md:hidden">
        {trabalho.itens.map(([t, d]) => (
          <li key={t} className="border-b-[3px] border-papel py-3">
            <span>
              <strong className="block text-[16px] font-bold uppercase tracking-[0.06em]">{t}</strong>
              <span className="text-[15px] text-papel/70">{d}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* Costura: fio grosso da grade desce, dobra e entra na seção dos cortes */}
      <div className="max-md:hidden"><LinhaCostura inicioX={0.6} fimX={0.04} /></div>
      <div className="md:hidden"><LinhaCostura inicioX={0.06} fimX={0.62} /></div>
    </section>
  )
}
