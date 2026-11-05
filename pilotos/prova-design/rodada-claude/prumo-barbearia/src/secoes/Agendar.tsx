import { useRef, useState } from 'react'
import { m } from 'motion/react'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'
import BotaoMagnetico from '../componentes/BotaoMagnetico'
import IconeWhats from '../componentes/IconeWhats'
import { agendar, whatsapp } from '../data/conteudo'

// Interação: botão magnético + ícone que pulsa uma única vez; a régua do site termina no zero.
export default function Agendar() {
  const secao = useRef<HTMLElement>(null)
  const [visto, ver] = useState(false)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      // A marca corre da direita até o 0 (uma vez, ao entrar na tela).
      const regua = secao.current!.querySelector<HTMLElement>('[data-regua-final]')!
      gsap.fromTo('[data-zero]', { x: () => regua.offsetWidth - 2 }, {
        x: 0, duration: 1.4, ease: 'power4.out',
        scrollTrigger: { trigger: '[data-regua-final]', start: 'top 85%', once: true, onEnter: () => ver(true) },
      })
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

        {/* A régua termina no zero */}
        <div data-regua-final aria-hidden className="relative mt-16 md:mt-24">
          <div className="regua-h h-[22px] w-full text-giz/25 [--mm:8px]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-giz/25" />
          <div className="absolute bottom-0 left-0 w-full">
            <div data-zero className="absolute bottom-0 left-0">
              <span className="block h-[34px] w-[2px] bg-cobre" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="dado text-[13px] text-cobre md:text-[15px]">0</span>
            <span className="dado text-[11px] text-nevoa/80">mm</span>
          </div>
        </div>
        <p className="dado mt-2 text-[14px] text-giz md:text-[16px]">
          {agendar.regua} <span className="text-[11px] text-nevoa/80">({agendar.reguaNota})</span>
        </p>
      </div>
    </section>
  )
}
