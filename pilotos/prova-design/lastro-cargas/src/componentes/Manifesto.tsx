import { useRef } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'
import { manifesto } from '../data/conteudo'

// Texto revelado palavra por palavra (família Texto). Sobe por cima da cena 3D (seção cobre a cena)
// e termina com uma cortina escura curta que vira o fundo da seção de rotas.
export default function Manifesto() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      const gatilho = { trigger: '[data-texto-revelado]', start: 'top 78%', end: 'bottom 52%', scrub: true }
      gsap.fromTo('[data-palavra-m]', { opacity: 0.12 }, { opacity: 1, stagger: 0.5, ease: 'none', scrollTrigger: gatilho })
      gsap.fromTo('[data-nota-m]', { opacity: 0, x: -16 }, { opacity: 1, x: 0, stagger: 0.5, ease: 'none', scrollTrigger: gatilho })
      gsap.fromTo('[data-traco-m]', { scaleX: 0 }, { scaleX: 1, stagger: 0.5, ease: 'none', scrollTrigger: gatilho })
      gsap.fromTo('[data-cortina]', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '[data-cortina]', start: 'top bottom', end: 'bottom bottom', scrub: true },
      })
    })
    return () => mm.revert()
  }, { scope: raiz })

  return (
    <section
      ref={raiz}
      aria-labelledby="manifesto-titulo"
      className="relative z-10 overflow-hidden rounded-t-[28px] bg-papel text-tinta shadow-[0_-24px_60px_rgba(0,0,0,0.55)] motion-safe:-mt-[100svh] lg:rounded-t-[48px]"
    >
      <div className="px-5 pb-[34svh] pt-20 md:px-10 md:pt-32">
        <div className="flex items-baseline justify-between border-b border-tinta/15 pb-4">
          <h2 id="manifesto-titulo" className="text-[12px] font-medium uppercase tracking-[0.16em]">
            {manifesto.rotulo}
          </h2>
          <p className="numeros text-[12px] text-grafite">4 etapas</p>
        </div>
        <ol data-texto-revelado className="mt-6 [--degrau:0.85rem] md:mt-10 md:[--degrau:1.5vw] xl:[--degrau:4.3vw]">
          {manifesto.passos.map((passo, i) => (
            <li
              key={passo.verbo}
              className="relative grid grid-cols-[2.2rem_1fr] items-baseline gap-x-2 py-2 md:grid-cols-[4rem_1fr] md:py-3"
            >
              <span className="numeros text-[13px] text-grafite md:text-[15px]">0{i + 1}</span>
              <div className="flex min-w-0 flex-col xl:flex-row xl:items-baseline xl:gap-8" style={{ paddingLeft: `calc(${i} * var(--degrau))` }}>
                <span data-palavra-m className="titulo text-[clamp(46px,13vw,58px)] font-semibold md:text-[6.4vw] xl:text-[clamp(64px,7.2vw,116px)]">
                  {passo.verbo}
                  <span className="text-sinal">.</span>{' '}
                </span>
                <span data-nota-m className="mt-2 flex items-center gap-3 text-[15px] text-grafite xl:mt-0 xl:text-[17px]">
                  <span data-traco-m aria-hidden className="hidden h-px w-10 shrink-0 origin-left bg-tinta/40 xl:block" />
                  {passo.nota}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div
        data-cortina
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[30svh] origin-bottom border-t-2 border-sinal bg-carvao motion-reduce:hidden"
      />
    </section>
  )
}
