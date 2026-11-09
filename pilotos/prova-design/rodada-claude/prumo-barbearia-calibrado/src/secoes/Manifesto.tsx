import { Fragment, useRef } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'
import { manifesto } from '../data/conteudo'

// Texto (tipografia variável): cada palavra engrossa com a rolagem, de 320 a 720 no eixo de peso.
// A largura da palavra mais grossa fica reservada (cópia invisível na mesma célula): nada ao redor se mexe.
export default function Manifesto() {
  const secao = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      const palavras = gsap.utils.toArray<HTMLElement>('[data-peso]')
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '[data-frase]', start: 'top 78%', end: 'bottom 38%', scrub: 0.5 },
      })
      palavras.forEach((p, i) => {
        tl.fromTo(p, { '--peso': 320, color: 'oklch(0.76 0.014 170)' }, { '--peso': 720, color: 'oklch(0.94 0.01 170)', duration: 0.4 }, i * 0.15)
      })
      tl.fromTo('[data-ponto-final]', { color: 'oklch(0.94 0.01 170)' }, { color: 'oklch(0.74 0.12 55)', duration: 0.15 }, '>-0.05')
      // A régua desce pela borda e entrega a medida para a próxima cena.
      gsap.fromTo('[data-regua-borda]', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: secao.current, start: 'top 60%', end: 'bottom bottom', scrub: 0.4 },
      })
    })
    return () => mm.revert()
  }, { scope: secao })

  const ultima = manifesto.frase.length - 1
  const sombraDaCapa = 'shadow-[0_-24px_60px_oklch(0.08_0.01_170/0.6)]' // taste-skill-ignore: receita secao-cobre-cena (a seção sobe por cima da cena presa)
  return (
    <section
      ref={secao}
      aria-labelledby="manifesto-titulo"
      className={`relative z-10 rounded-t-[8px] bg-grafite-2 ${sombraDaCapa} motion-safe:-mt-[60svh]`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-3 w-[18px] md:left-[2.4vw] md:w-[26px]">
        <div data-regua-borda className="regua-v h-full w-full origin-top text-giz/25 [--mm:6px]" />
      </div>
      <div className="mx-auto max-w-[1360px] px-5 pb-28 pt-28 pl-12 md:px-[5vw] md:pb-40 md:pt-40">
        <p className="dado text-[11px] uppercase tracking-[0.12em] text-cobre">02 · Manifesto</p>
        <h2 id="manifesto-titulo" data-frase className="titulo mt-6 max-w-[13ch] text-[clamp(40px,10vw,52px)] leading-[1.02] md:max-w-[16ch] md:text-[clamp(56px,6.2vw,92px)]">
          {manifesto.frase.map((palavra, i) => (
            <Fragment key={i}>
            <span className="inline-grid align-top">
              <span aria-hidden className="invisible col-start-1 row-start-1 [font-variation-settings:'wght'_720]">{palavra}</span>
              <span
                data-peso
                data-ponto-final={i === ultima || undefined}
                className="col-start-1 row-start-1 [font-variation-settings:'wght'_var(--peso,720)]"
              >
                {palavra}
              </span>
            </span>
            {i < ultima && ' '}
            </Fragment>
          ))}
        </h2>
        <p className="mt-10 max-w-[56ch] text-[16px] leading-relaxed text-nevoa md:ml-[38%] md:mt-14 md:text-[18px]">{manifesto.texto}</p>
      </div>
    </section>
  )
}
