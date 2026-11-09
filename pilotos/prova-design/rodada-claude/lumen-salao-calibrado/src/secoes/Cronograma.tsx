import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { cronograma } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
import { ritmo } from '../ritmo'

// Cena 3: linha do tempo com marcador (Dados e prova), rolagem livre. A seção chega com a borda arredondada
// sobre o fio e o marcador desce a linha; cada semana acende as lavagens H / N / R quando ele passa.
const nomeDe = Object.fromEntries(cronograma.legenda.map((l) => [l.sigla, l.nome]))

export function Cronograma() {
  const secao = useRef<HTMLElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(secao)
      const lista = q('[data-lista]')[0] as HTMLElement, marcador = q('[data-marcador]')[0] as HTMLElement
      gsap.set(marcador, { opacity: 1 })
      gsap.fromTo(marcador, { y: 0 }, { y: () => lista.offsetHeight - marcador.offsetHeight, ease: 'none',
        scrollTrigger: { trigger: lista, start: 'top 62%', end: 'bottom 62%', scrub: ritmo.scrub, invalidateOnRefresh: true } })
      const todas = q('[data-lavagem]')
      q('[data-semana]').forEach((semana) => {
        const marcas = semana.querySelectorAll('[data-lavagem]')
        gsap.set(marcas, { opacity: 0.28 })
        ScrollTrigger.create({ trigger: semana, start: 'top 62%',
          onEnter: () => gsap.to(marcas, { opacity: 1, duration: ritmo.dur.media, stagger: ritmo.escalonar, ease: ritmo.ease.entra, overwrite: 'auto' }),
          onLeaveBack: () => gsap.to(marcas, { opacity: 0.28, duration: ritmo.dur.curta, overwrite: 'auto' }) })
      })
      // os tweens dos gatilhos nascem fora do contexto: cancelar e limpar ao trocar a preferência
      return () => { gsap.killTweensOf(todas); gsap.set(todas, { clearProps: 'opacity' }) }
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    // taste-skill-ignore: sombra da borda arredondada sobre a seção escura do fio
    <section ref={secao} id="cronograma" aria-labelledby="titulo-cronograma"
      /* taste-skill-ignore */ className="relative z-10 rounded-t-[28px] bg-claro shadow-[0_-24px_60px_oklch(0.15_0.03_190/0.45)] md:rounded-t-[48px]">
      <div className="grid gap-12 px-[var(--margem)] pb-[14svh] pt-[14svh] md:grid-cols-12 md:gap-x-8 md:pb-[20svh] md:pt-[18svh]">
        <div className="md:sticky md:top-[10svh] md:col-span-5 md:self-start">
          <p className="rotulo text-ameixa-texto"><span className="mr-3">{cronograma.numero}</span>{cronograma.rotulo}</p>
          <h2 id="titulo-cronograma" className="titulo mt-5 text-[clamp(34px,9vw,42px)] md:text-[clamp(44px,4.4vw,64px)]">{cronograma.titulo}</h2>
          <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
            {cronograma.legenda.map((l) => (
              <div key={l.sigla} className="flex items-center gap-2">
                <dt className="titulo grid h-9 w-9 place-items-center rounded-full bg-petroleo text-[18px] text-claro">{l.sigla}</dt>
                <dd className="m-0">{l.nome}</dd>
              </div>
            ))}
          </dl>
          {/* Calibragem de 09/11: no computador a coluna acompanha a rolagem, com a legenda sempre à vista e uma foto que ocupa o vazio. */}
          <div className="moldura relative mt-8 hidden aspect-[16/9] max-h-[30svh] w-full overflow-hidden bg-petroleo md:block">
            <Foto nome="cronograma" alt="" sizes="38vw" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          {/* taste-skill-ignore: a linha é o trilho real da linha do tempo que o marcador percorre */}
          <ol data-lista /* taste-skill-ignore */ className="relative grid gap-12 border-l border-petroleo/20 pl-8 md:gap-16 md:pl-12">
            <span aria-hidden="true" data-marcador data-so-movimento className="absolute -left-[9px] top-0 block h-[18px] w-[18px] rounded-full border-2 border-ameixa bg-claro" />
            {cronograma.semanas.map((s) => (
              <li key={s.nome} data-semana className="relative">
                <p className="titulo text-[28px] md:text-[34px]">{s.nome}</p>
                <ul aria-label={`Lavagens da ${s.nome.toLowerCase()}`} className="mt-4 flex gap-3">
                  {s.etapas.map((e, i) => (
                    <li key={i} data-lavagem className="titulo grid h-12 w-12 place-items-center rounded-full bg-ameixa text-[20px] text-claro md:h-14 md:w-14 md:text-[22px]">
                      <span aria-hidden="true">{e}</span><span className="sr-only">{nomeDe[e]}</span>
                    </li>
                  ))}
                </ul>
                <p className="rotulo mt-4 text-ameixa-texto">{s.nota}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 pl-8 text-[14px] text-petroleo/75 md:pl-12">{cronograma.aviso}</p>
        </div>
      </div>
    </section>
  )
}
