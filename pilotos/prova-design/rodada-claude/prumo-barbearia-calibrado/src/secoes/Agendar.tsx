import { useRef, useState } from 'react'
import { m } from 'motion/react'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'
import BotaoMagnetico from '../componentes/BotaoMagnetico'
import IconeWhats from '../componentes/IconeWhats'
import { agendar, rodape, whatsapp } from '../data/conteudo'

// Interação: botão magnético + ícone que pulsa uma única vez ao entrar na tela.
export default function Agendar() {
  const secao = useRef<HTMLElement>(null)
  const [visto, ver] = useState(false)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      gsap.to({}, { duration: 0, scrollTrigger: { trigger: secao.current, start: 'top 70%', once: true, onEnter: () => ver(true) } })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => { ver(true) })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <section id="agendar" ref={secao} aria-labelledby="agendar-titulo" className="relative overflow-hidden bg-grafite-2">
      <div className="mx-auto max-w-[1360px] px-5 pb-20 pt-24 md:px-[5vw] md:pb-28 md:pt-36">
        <p className="dado text-[11px] uppercase tracking-[0.12em] text-cobre">06 · {agendar.rotulo}</p>
        <div className="mt-5 grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <h2 id="agendar-titulo" className="titulo text-[clamp(38px,10vw,48px)] md:text-[clamp(52px,5.6vw,84px)]">{agendar.titulo}</h2>
            <p className="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-nevoa md:text-[18px]">{agendar.texto}</p>
          </div>
          <div className="md:col-span-5 md:justify-self-end">
            <BotaoMagnetico href={whatsapp(agendar.mensagem)}>
              <span className="relative inline-flex size-7 items-center justify-center">
                {visto && (
                  <m.span
                    aria-hidden
                    className="absolute inset-[-6px] rounded-full border-2 border-tinta"
                    initial={{ scale: 0.7, opacity: 0.9 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <IconeWhats className="size-6" />
              </span>
              {agendar.botao}
            </BotaoMagnetico>
          </div>
        </div>

        {/* O que falta para decidir: quando e onde */}
        <p className="dado mt-12 border-t border-giz/15 pt-5 text-[12px] leading-relaxed text-nevoa md:mt-16 md:text-[13px]">
          {rodape.horarioCurto} · {rodape.endereco[0]}
        </p>
      </div>
    </section>
  )
}
