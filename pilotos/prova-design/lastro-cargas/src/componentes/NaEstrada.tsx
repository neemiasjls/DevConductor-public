import { useRef } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'
import { estrada } from '../data/conteudo'
import Foto from './Foto'

// Foto ocupa a janela (família Imagem). A janela cresce com escala não uniforme e a foto dentro recebe a escala
// inversa: a imagem nunca deforma, só o recorte muda. As duas palavras do título se afastam para os lados.
export default function NaEstrada() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: consultas.mover, celular: consultas.celular }, (ctx) => {
      const { mover } = ctx.conditions as { mover: boolean }
      if (!mover) return
      const celular = window.innerWidth < 768
      const janela = raiz.current!.querySelector<HTMLElement>('[data-janela]')!
      const foto = raiz.current!.querySelector<HTMLElement>('[data-foto]')!
      const sx0 = celular ? 0.62 : 0.26
      const sy0 = celular ? 0.36 : 0.52
      const z0 = 1.35
      const estadoJanela = { t: 0 }
      const aplicar = () => {
        const t = estadoJanela.t
        const sx = sx0 + (1 - sx0) * t
        const sy = sy0 + (1 - sy0) * t
        const z = z0 + (1 - z0) * t
        gsap.set(janela, { scaleX: sx, scaleY: sy })
        gsap.set(foto, { scaleX: z / sx, scaleY: z / sy })
      }
      aplicar()
      const tl = gsap.timeline({
        scrollTrigger: {
          // Passagem contínua entre a rota e as docas; preserva a janela, sem outra parada consecutiva.
          trigger: raiz.current, start: 'top bottom', end: 'top top', scrub: 0.6, invalidateOnRefresh: true,
        },
      })
      tl.to(estadoJanela, { t: 1, duration: 1, ease: 'power2.inOut', onUpdate: aplicar }, 0)
      const fora = celular
        ? [{ y: () => -window.innerHeight * 0.28 }, { y: () => window.innerHeight * 0.28 }]
        : [{ x: () => -window.innerWidth * 0.32 }, { x: () => window.innerWidth * 0.32 }]
      tl.to('[data-palavra-e="0"]', { ...fora[0], autoAlpha: 0, duration: 0.55, ease: ritmo.sai }, 0.08)
      tl.to('[data-palavra-e="1"]', { ...fora[1], autoAlpha: 0, duration: 0.55, ease: ritmo.sai }, 0.08)
      tl.fromTo('[data-legenda-foto]', { autoAlpha: 0, y: ritmo.distancia * 2 }, { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.06, ease: ritmo.entra }, 0.82)
      tl.to({}, { duration: 0.3 })
    })
    return () => mm.revert()
  }, { scope: raiz })

  return (
    <section ref={raiz} aria-labelledby="estrada-titulo" className="relative h-[100svh] overflow-hidden bg-carvao">
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-[42svh] motion-reduce:hidden md:block">
        {estrada.palavras.map((p, i) => (
          <div
            key={p}
            className={`md:absolute md:top-1/2 md:-translate-y-1/2 ${i === 0 ? 'md:right-[63.5%]' : 'md:left-[63.5%]'}`}
          >
            <span data-palavra-e={i} className="titulo block text-[17vw] font-bold leading-none text-papel md:text-[8.4vw]">
              {p}
            </span>
          </div>
        ))}
      </div>
      <div data-janela className="absolute inset-0 isolate overflow-hidden">
        <Foto nome="estrada" alt={estrada.alt} data-foto loading="lazy" className="h-full w-full object-cover object-[28%_50%]" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,oklch(0.17_0.01_250/0.85),transparent_48%)]" />
      </div>
      <div className="pointer-events-none absolute inset-x-5 bottom-8 md:inset-x-10 md:bottom-12 md:grid md:grid-cols-12 md:items-end">
        <div data-legenda-foto className="md:col-span-7">
          <h2 id="estrada-titulo" className="titulo text-[clamp(30px,8.4vw,38px)] font-semibold text-papel md:text-[clamp(38px,3.8vw,58px)]">
            {estrada.titulo}
          </h2>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-papel/85 md:text-[16px]">{estrada.texto}</p>
        </div>
        <p data-legenda-foto className="mt-5 max-w-[60ch] text-[11px] leading-snug text-papel/70 md:col-span-7 md:mt-4">
          {estrada.credito}
        </p>
      </div>
    </section>
  )
}
