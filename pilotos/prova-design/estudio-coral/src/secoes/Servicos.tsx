import { useRef } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { linkWhats, servicos, estilos } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
import { ritmo } from '../ritmo'

// Cada serviço tem a sua cor: a cortina chega com o nome dele e abre o painel.
const TEMA = [
  { painel: 'bg-papel text-tinta', chip: 'border-tinta', botao: 'bg-cobalto text-papel', cortina: 'var(--color-cobalto)', palavra: 'var(--color-papel)', tamanho: 'min(23vw, 42svh)' },
  { painel: 'bg-tinta text-papel sobre-escuro', chip: 'border-papel/70', botao: 'bg-coral text-tinta', cortina: 'var(--color-coral)', palavra: 'var(--color-tinta)', tamanho: 'min(26vw, 46svh)' },
  { painel: 'bg-coral text-tinta', chip: 'border-tinta', botao: 'bg-tinta text-papel', cortina: 'var(--color-tinta)', palavra: 'var(--color-coral)', tamanho: 'min(46vw, 64svh)' },
]

export function Servicos() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(raiz)
      const paineis = q('[data-painel]')
      const pares = q('[data-par]')
      const metades = pares.map((p) => [...p.querySelectorAll('[data-metade]')] as HTMLElement[])
      gsap.set(paineis.slice(1), { autoAlpha: 0 })
      gsap.set(pares, { opacity: 1 })
      metades.forEach(([e, d], i) => gsap.set([e, d], { xPercent: (j: number) => (i === 0 ? 0 : j ? 101 : -101) }))

      const tl = gsap.timeline({ defaults: { ease: 'none' },
        scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom bottom', scrub: ritmo.scrub } })
      const D = 1
      const abrir = (i: number, em: number) => {
        const [e, d] = metades[i]
        tl.to(e, { xPercent: -101, duration: D, ease: ritmo.ease.cruza }, em)
          .to(d, { xPercent: 101, duration: D, ease: ritmo.ease.cruza }, em)
          .fromTo(pares[i].querySelectorAll('[data-palavra-cortina]'), { scale: 1 }, { scale: 1.2, duration: D }, em)
          .fromTo(q(`[data-painel="${i}"] [data-foto]`), { scale: 1.3 }, { scale: 1, duration: D * 1.3, ease: ritmo.ease.solta }, em)
          .from(q(`[data-painel="${i}"] [data-entra]`), { y: ritmo.distancia * 1.6, opacity: 0, stagger: 0.07, duration: D * 0.55, ease: ritmo.ease.solta }, em + D * 0.3)
      }
      const fechar = (i: number, em: number) => {
        const [e, d] = metades[i]
        tl.to([e, d], { xPercent: 0, duration: D, ease: ritmo.ease.cruza }, em)
          .fromTo(pares[i].querySelectorAll('[data-palavra-cortina]'), { scale: 1.25 }, { scale: 1, duration: D, ease: ritmo.ease.solta }, em)
          .set(paineis[i - 1], { autoAlpha: 0 }, em + D)
          .set(paineis[i], { autoAlpha: 1 }, em + D)
      }
      abrir(0, 0.25)
      fechar(1, 2.1); abrir(1, 3.45)
      fechar(2, 5.6); abrir(2, 6.95)
      // Sem pausa longa no fim: o último painel já sobe enquanto a trança entra (avanço em vez de outra parada).
      tl.to(q('[data-painel="2"] [data-foto]'), { yPercent: -8, duration: 0.5 }, 7.95)
    })
    return () => mm.revert()
  }, { scope: raiz })

  const estilo = { '--telas-d': ritmo.telas.servicos.desktop, '--telas-c': ritmo.telas.servicos.celular } as CSSProperties
  return (
    <section ref={raiz} id="servicos" aria-labelledby="servicos-titulo" className="cena relative z-10 bg-cobalto" style={estilo}>
      <div className="palco">
        <h2 id="servicos-titulo" className="sr-only">{servicos.titulo}</h2>
        {servicos.itens.map((s, i) => (
          <article key={s.nome} data-painel={i} aria-labelledby={`servico-${i}`}
            className={`${TEMA[i].painel} absolute inset-0 flex flex-col px-[var(--margem)] pb-5 pt-[8svh] motion-reduce:relative motion-reduce:inset-auto motion-reduce:min-h-svh md:grid md:grid-cols-12 md:gap-x-8 md:pb-[6svh] md:pt-[11svh]`}>
            <figure className="relative -mr-[var(--margem)] h-[33svh] shrink-0 md:order-2 md:col-span-6 md:col-start-7 md:h-full">
              <div className="moldura absolute inset-0 md:rounded-r-none">
                <Foto data-foto nome={s.foto.nome} alt={s.foto.alt} sizes="(min-width: 768px) 50vw, 95vw"
                  className="h-full w-full object-cover" style={{ objectPosition: i === 0 ? '50% 40%' : '50% 30%' }} />
              </div>
            </figure>
            <div className="relative z-10 mt-4 flex flex-col md:order-1 md:col-span-6 md:mt-0 md:justify-end">
              <p data-entra className="text-[12px] font-semibold uppercase tracking-[0.16em] md:text-[13px]">
                {String(i + 1).padStart(2, '0')} / {String(servicos.itens.length).padStart(2, '0')} — {servicos.titulo}
              </p>
              <h3 id={`servico-${i}`} data-entra className="titulo mt-1 w-max text-[17vw] md:mt-2 md:text-[min(15vw,27svh)]">{s.nome}</h3>
              <ul data-entra className="mt-3 flex flex-wrap gap-1.5 md:mt-5 md:gap-2">
                {s.itens.map((it) => (
                  <li key={it} className={`rounded-full border-2 ${TEMA[i].chip} px-3 py-1 text-[13px] font-semibold md:px-4 md:py-1.5 md:text-[15px]`}>{it}</li>
                ))}
              </ul>
              <p data-entra className="mt-3 max-w-[44ch] text-[14px] leading-snug md:mt-6 md:text-[17px] md:leading-relaxed">{s.texto}</p>
              <div data-entra className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 md:mt-7">
                <a href={linkWhats(s.servico)} className={`pilula ${TEMA[i].botao} text-[15px]`}>Quero {s.nome.toLowerCase()}</a>
                <span className="text-[13px] font-medium opacity-80 md:text-[14px]">{estilos.tempo}</span>
              </div>
            </div>
          </article>
        ))}
        {servicos.itens.map((s, i) => (
          <div key={s.nome} data-par={i} data-so-movimento aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
            {[0, 1].map((lado) => (
              <div key={lado} data-metade className="absolute inset-y-0 overflow-hidden"
                style={{ left: lado ? '49.8%' : 0, width: '50.2%', backgroundColor: TEMA[i].cortina }}>
                <div className="absolute inset-y-0 grid place-items-center" style={{ width: '199.2%', left: lado ? '-99.2%' : 0 }}>
                  <span data-palavra-cortina className="titulo block" style={{ fontSize: TEMA[i].tamanho, color: TEMA[i].palavra }}>{s.nome}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
