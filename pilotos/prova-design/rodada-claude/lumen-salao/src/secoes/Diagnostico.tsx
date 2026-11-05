import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { diagnostico } from '../data/conteudo'
import { ritmo } from '../ritmo'

// Cena 1: texto revelado palavra por palavra (Texto). Entra pelo fio de luz que sai da abertura e termina
// com a cortina petróleo subindo do pé da seção (o fundo claro vira escuro para o clímax).
function Frase({ texto }: { texto: string }) {
  return texto.split(' ').map((p, i) => {
    const italico = p.startsWith('*')
    const limpo = p.replace(/\*/g, '')
    const [palavra, pontuacao] = italico ? [limpo.replace(/[.,:]$/, ''), limpo.match(/[.,:]$/)?.[0] ?? ''] : [limpo, '']
    return (
      <span key={i} data-palavra>
        {italico ? <><em className="italico">{palavra}</em>{pontuacao}</> : palavra}{' '}
      </span>
    )
  })
}

export function Diagnostico() {
  const secao = useRef<HTMLElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(secao)
      // costura 0→1: a faixa de luz sai pela borda da foto e corre como um fio até a margem esquerda
      gsap.fromTo(q('[data-fio-luz]'), { scaleX: 0, opacity: 1 }, { scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: secao.current, start: 'top 95%', end: 'top 35%', scrub: ritmo.scrub } })
      gsap.fromTo(q('[data-palavra]'), { opacity: 0.14 }, { opacity: 1, stagger: ritmo.escalonar, ease: 'none',
        scrollTrigger: { trigger: q('[data-frase]')[0], start: 'top 82%', end: 'bottom 48%', scrub: ritmo.scrub } })
      // costura 1→2: cortina petróleo sobe do pé da seção
      gsap.fromTo(q('[data-cortina]'), { scaleY: 0, opacity: 1 }, { scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: q('[data-cortina]')[0], start: 'top bottom', end: 'bottom bottom', scrub: ritmo.scrub } })
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <section ref={secao} id="diagnostico" aria-labelledby="titulo-diagnostico" className="relative bg-claro">
      <span aria-hidden="true" data-fio-luz data-so-movimento className="absolute right-0 top-0 block h-[2px] w-full origin-right bg-ameixa" />
      <div className="px-[var(--margem)] pb-[18svh] pt-[16svh] md:pb-[22svh] md:pt-[20svh]">
        <p className="rotulo text-ameixa-texto"><span className="mr-3">{diagnostico.numero}</span>{diagnostico.rotulo}</p>
        <h2 id="titulo-diagnostico" data-frase className="titulo mt-6 max-w-[17ch] text-[clamp(36px,9.6vw,44px)] leading-[1.06] md:text-[clamp(48px,5.4vw,80px)]">
          <Frase texto={diagnostico.frase} />
        </h2>
        <div className="mt-12 grid gap-10 md:mt-20 md:grid-cols-12 md:gap-x-8">
          <p className="max-w-[46ch] text-[17px] text-petroleo/80 md:col-span-4 md:text-[18px]">{diagnostico.apoio}</p>
          <ul className="grid gap-8 md:col-span-8 md:grid-cols-3 md:gap-8">
            {diagnostico.sinais.map((s) => (
              // taste-skill-ignore: fio de revista (petróleo a 15%) pedido pelo estilo luxo-editorial
              <li key={s.falta} /* taste-skill-ignore */ className="border-t border-petroleo/15 pt-5">
                <p className="titulo text-[30px] md:text-[34px]">{s.falta}</p>
                <p className="rotulo mt-2 text-ameixa-texto">{s.tratamento}</p>
                <p className="mt-3 text-[16px] text-petroleo/80">{s.sinal}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div aria-hidden="true" data-cortina data-so-movimento className="absolute inset-x-0 bottom-0 h-[16svh] origin-bottom bg-petroleo md:h-[20svh]" />
    </section>
  )
}
