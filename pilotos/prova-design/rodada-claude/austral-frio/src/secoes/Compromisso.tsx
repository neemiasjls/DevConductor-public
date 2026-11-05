import { useRef } from 'react'
import { compromisso } from '../data/conteudo'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'

// Compromisso (Texto): a frase acende palavra por palavra com a rolagem (texto-revelado), sem prender.
// Entra cobrindo a cena da porta e sai por uma cortina curta do gelo para o grafite da viagem.
export default function Compromisso() {
  const raiz = useRef<HTMLElement>(null)
  const palavras = compromisso.frase.split(' ')

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      gsap.fromTo('[data-palavra]', { opacity: 0.14 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: '[data-texto-revelado]', start: 'top 78%', end: 'bottom 42%', scrub: true },
      })
      gsap.fromTo('[data-cortina]', { scaleY: 0 }, {
        scaleY: 1, ease: 'none', transformOrigin: '50% 100%',
        scrollTrigger: { trigger: '[data-cortina]', start: 'top bottom', end: 'bottom 60%', scrub: true },
      })
    })
  }, { scope: raiz })

  return (
    <section ref={raiz} id="compromisso" aria-label="Compromisso" className="cobre overflow-hidden bg-gelo text-grafite">
      <div className="conteudo grid gap-10 pb-16 pt-20 md:pb-24 md:pt-28 lg:grid-cols-12">
        <p data-texto-revelado className="titulo text-[clamp(2.1rem,9vw,2.6rem)] md:text-[min(5.6vw,5rem)] lg:col-span-10">
          {palavras.map((p, i) => (
            <span key={i} data-palavra className={compromisso.destaque.includes(p) ? 'text-destaque-tinta' : undefined}>{p} </span>
          ))}
        </p>
        <p className="max-w-[40ch] text-[1.0625rem] leading-relaxed text-aco-escuro lg:col-span-5 lg:col-start-6">{compromisso.apoio}</p>
      </div>
      {/* Cortina: o grafite da viagem sobe por dentro desta seção. */}
      <div aria-hidden data-cortina className="h-[20svh] bg-grafite motion-reduce:h-0" />
    </section>
  )
}
