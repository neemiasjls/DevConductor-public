import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { diagnostico, linkWhats } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
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
  const [ativo, ativar] = useState(0)
  const atual = diagnostico.sinais[ativo]
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
      <div className="px-[var(--margem)] pb-[12svh] pt-[16svh] md:pb-[14svh] md:pt-[20svh]">
        <p className="rotulo text-ameixa-texto"><span className="mr-3">{diagnostico.numero}</span>{diagnostico.rotulo}</p>
        <h2 id="titulo-diagnostico" data-frase className="titulo mt-6 max-w-[17ch] text-[clamp(36px,9.6vw,44px)] leading-[1.06] md:text-[clamp(48px,5.4vw,80px)]">
          <Frase texto={diagnostico.frase} />
        </h2>
        {/* Calibragem de 09/11: a pessoa escolhe o sinal do próprio fio e vê por onde começar, com foto e valor. */}
        <div className="mt-10 grid gap-8 md:mt-16 md:grid-cols-12 md:items-end md:gap-x-8">
          <div className="moldura relative aspect-[4/3] w-full overflow-hidden bg-petroleo md:col-span-6" data-quadro-diagnostico={ativo}>
            {diagnostico.sinais.map((s, i) => (
              <Foto key={s.falta} nome={s.foto} alt={i === ativo ? s.alt : ''} aria-hidden={i === ativo ? undefined : true} sizes="(min-width: 768px) 46vw, 92vw"
                className="absolute inset-0 h-full w-full object-cover transition-opacity ease-[var(--ease-entra)] motion-reduce:transition-none"
                style={{ opacity: i === ativo ? 1 : 0, transitionDuration: `${ritmo.troca}s` }} />
            ))}
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <p className="text-[17px] text-petroleo/80 md:text-[18px]">{diagnostico.apoio}</p>
            <ul className="mt-4 grid">
              {diagnostico.sinais.map((s, i) => (
                // taste-skill-ignore: fio de revista (petróleo a 15%) pedido pelo estilo luxo-editorial
                <li key={s.falta} /* taste-skill-ignore */ className="border-t border-petroleo/15 last:border-b">
                  <button type="button" data-sinal={i} aria-pressed={ativo === i} onClick={() => ativar(i)}
                    className={`flex min-h-[56px] w-full items-baseline justify-between gap-4 py-3 text-left transition-colors duration-300 ${ativo === i ? 'text-ameixa-texto' : 'text-petroleo hover:text-ameixa-texto'}`}>
                    <span className="titulo text-[24px] md:text-[28px]">{s.falta}</span>
                    <span className="text-right text-[16px] md:text-[17px]">{s.sinal}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div aria-live="polite" className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className="text-[17px] md:text-[18px]">{diagnostico.comece} <strong className="font-semibold">{atual.tratamento}</strong>, {atual.preco}.</p>
              <a href={linkWhats(atual.tratamento)} className="pilula bg-petroleo text-claro hover:bg-ameixa">{diagnostico.agendar}</a>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" data-cortina data-so-movimento className="absolute inset-x-0 bottom-0 h-[3svh] origin-bottom bg-petroleo md:h-[3svh]" />
    </section>
  )
}
