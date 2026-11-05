import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { perto } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
import { ritmo } from '../ritmo'

export function Perto() {
  const secao = useRef<HTMLElement>(null)
  const foto = useRef<HTMLDivElement>(null)

  // A moldura cresce enquanto a seção sobe por cima da trança (costura "foto sobe por baixo").
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(foto.current, { scale: 0.84, yPercent: 6 }, { scale: 1, yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: secao.current, start: 'top bottom', end: 'top 15%', scrub: ritmo.scrub } })
      gsap.fromTo('[data-perto-linha]', { xPercent: (i: number) => (i ? 12 : -12) }, { xPercent: 0, ease: 'none',
        scrollTrigger: { trigger: secao.current, start: 'top bottom', end: 'top top', scrub: ritmo.scrub } })
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <section ref={secao} id="perto" aria-labelledby="perto-titulo"
      className="sobre-escuro relative z-10 -mt-[100svh] rounded-t-[28px] bg-tinta px-[var(--margem)] pb-[8svh] pt-[9svh] text-papel motion-reduce:mt-0 md:rounded-t-[48px] md:pt-[11svh]">
      <h2 id="perto-titulo" className="titulo relative z-10 text-[16vw] md:text-[min(11.5vw,22svh)]">
        <span data-perto-linha className="block">{perto.titulo[0]}</span>
        <span data-perto-linha className="-mb-[0.42em] block text-right text-coral">{perto.titulo[1]}</span>
      </h2>
      <figure className="relative">
        <div ref={foto} className="moldura relative aspect-[4/5] w-full touch-pan-y md:aspect-auto md:h-[76svh]">
          <Foto nome={perto.foto.nome} alt={perto.foto.alt} sizes="92vw" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <figcaption className="mt-5 grid gap-4 md:grid-cols-12 md:gap-8">
          <p className="max-w-[40ch] text-[16px] leading-relaxed md:col-span-6 md:text-[19px]">{perto.texto}</p>
          <p className="text-[13px] leading-snug text-papel/75 md:col-span-4 md:col-start-9 md:text-right">
            {perto.legenda}
          </p>
        </figcaption>
      </figure>
    </section>
  )
}
