import { useRef, type CSSProperties } from 'react'
import { gsap, useGSAP } from '../gsap'
import { processo } from '../data/conteudo'

// Da base (seção 5): fundo escuro esverdeado que respira, título no canto e quatro passos em escada.
export default function Processo() {
  const raiz = useRef<HTMLElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-passo]', {
        autoAlpha: 0, y: 18, duration: 0.85, ease: 'power2.out', stagger: 0.14,
        scrollTrigger: { trigger: '[data-passos]', start: 'top 78%', once: true },
      })
    })
  }, { scope: raiz })

  return (
    <section ref={raiz} id="processo" data-leitura className="relative z-10 overflow-hidden bg-[#070906] pb-[12svh] pt-28 md:pt-[max(17svh,9.5rem)] md:min-h-[100svh]">
      <div aria-hidden className="fundo-processo brilho pointer-events-none absolute inset-0" />
      <div aria-hidden className="grao pointer-events-none absolute inset-0" />
      <div aria-hidden className="pauta-escura pointer-events-none absolute inset-0" />
      <div className="relative mx-auto w-full max-w-[1600px] px-5 md:px-[5.55vw]">
        <h2 className="titulo text-[clamp(1.6rem,3.4vw,3rem)] text-white">
          {processo.titulo[0]}<br />{processo.titulo[1]}
        </h2>
        <p aria-hidden className="pointer-events-none absolute right-[5.55vw] top-0 hidden text-right md:block">
          <span className="titulo numero block text-[clamp(7rem,13vw,12rem)]">45</span>
          <span className="mt-4 block text-[15px] uppercase tracking-[0.14em] text-white/70">dias do aprovado à montagem</span>
        </p>
        <p className="mt-7 flex items-end gap-4 md:hidden">
          <span className="titulo numero block text-[5.5rem]">45</span>
          <span className="pb-1 text-[13px] uppercase leading-snug tracking-[0.14em] text-white/75">dias do aprovado<br />à montagem</span>
        </p>
        <ol data-passos className="mt-[6svh] md:mt-[9svh]">
          {processo.passos.map((p, i) => (
            <li
              key={p.titulo}
              data-passo
              style={{ '--recuo': `${i * 21.8}%` } as CSSProperties}
              className="degrau relative grid grid-cols-[2rem_1fr] pb-9 md:grid-cols-[2.4rem_1fr] lg:ml-[var(--recuo)] lg:w-[27%] lg:min-w-[330px] lg:pb-12"
            >
              <span className="pt-0.5 text-[15px] text-white/75">{i + 1}</span>
              <div>
                <h3 className="text-[20px] leading-tight text-white">{p.titulo}</h3>
                <p className="mt-4 max-w-[340px] text-[16px] leading-[1.35] text-white/80">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
