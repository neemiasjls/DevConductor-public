import { useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { contato, linkWhats } from '../data/conteudo'
import { ritmo } from '../ritmo'

// Fechamento (Interação): serviços que reagem ao toque e escolhem a mensagem; botão magnético que pulsa uma vez.
const mola = { type: 'spring', stiffness: 520, damping: 26 } as const

export function Contato() {
  const raiz = useRef<HTMLElement>(null)
  const ima = useRef<HTMLDivElement>(null)
  const [escolha, escolher] = useState(0)
  const opcao = contato.opcoes[escolha]

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: '(prefers-reduced-motion: no-preference)', mouse: '(hover: hover) and (pointer: fine)' }, (ctx) => {
      if (!ctx.conditions!.mover) return
      const q = gsap.utils.selector(raiz)
      const botao = q('[data-botao-ima]')[0] as HTMLElement
      // Reage novamente ao retornar à seção; entrada mais discreta.
      gsap.timeline({ scrollTrigger: { trigger: botao, start: 'top 85%', toggleActions: 'restart none restart reset' } })
        .fromTo(botao, { scale: 0.96, rotation: -2 }, { scale: 1, rotation: 0, duration: ritmo.dur.media, ease: ritmo.ease.solta })
        .fromTo(q('[data-pulso]'), { scale: 1, opacity: 0.7 }, { scale: 1.65, opacity: 0, duration: ritmo.dur.longa * 1.4, ease: ritmo.ease.solta }, '-=0.35')
      if (!ctx.conditions!.mouse) return
      // Ímã: o botão segue o cursor dentro da área, o texto vai um pouco mais longe.
      const area = ima.current!
      const xB = gsap.quickTo(botao, 'x', { duration: ritmo.dur.media, ease: ritmo.ease.solta })
      const yB = gsap.quickTo(botao, 'y', { duration: ritmo.dur.media, ease: ritmo.ease.solta })
      const rotulo = q('[data-rotulo-ima]')[0]
      const xR = gsap.quickTo(rotulo, 'x', { duration: ritmo.dur.media, ease: ritmo.ease.solta })
      const yR = gsap.quickTo(rotulo, 'y', { duration: ritmo.dur.media, ease: ritmo.ease.solta })
      const mover = (e: PointerEvent) => {
        const r = area.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
        xB(dx * 0.32); yB(dy * 0.32); xR(dx * 0.12); yR(dy * 0.12)
      }
      const soltar = () => {
        // Movimento e retorno compartilham os mesmos tweens, sem competir via overwrite.
        xB(0); yB(0); xR(0); yR(0)
      }
      area.addEventListener('pointermove', mover)
      area.addEventListener('pointerleave', soltar)
      area.addEventListener('pointercancel', soltar)
      return () => { area.removeEventListener('pointermove', mover); area.removeEventListener('pointerleave', soltar); area.removeEventListener('pointercancel', soltar) }
    })
    return () => mm.revert()
  }, { scope: raiz })

  return (
    <section ref={raiz} id="contato" aria-labelledby="contato-titulo"
      className="relative overflow-hidden bg-coral px-[var(--margem)] pb-[10svh] pt-[8svh] text-tinta md:pb-[12svh] md:pt-[10svh]">
      <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-7">
          <h2 id="contato-titulo" className="titulo text-[22vw] md:text-[min(12.5vw,24svh)]">
            <span className="block">{contato.titulo[0]}</span><span className="block">{contato.titulo[1]}</span>
          </h2>
          <fieldset className="mt-8 md:mt-12">
            <legend className="text-[15px] font-semibold md:text-[17px]">{contato.pergunta}</legend>
            <div className="mt-4 flex flex-wrap gap-2.5 md:gap-3">
              {contato.opcoes.map((o, i) => (
                <m.button key={o.rotulo} type="button" aria-pressed={i === escolha} onClick={() => escolher(i)}
                  whileHover={{ y: -5, rotate: i % 2 ? 2.5 : -2.5 }} whileTap={{ scale: 0.92 }} transition={mola}
                  className={`relative rounded-full border-2 border-tinta px-5 py-3 text-[16px] font-semibold md:px-7 md:py-4 md:text-[19px] ${i === escolha ? 'text-coral' : ''}`}>
                  {i === escolha && <m.span layoutId="servico-escolhido" transition={mola} className="absolute inset-[-2px] rounded-full bg-tinta" />}
                  <span className="relative">{o.rotulo}</span>
                </m.button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col items-center gap-10 md:col-span-5 md:items-stretch">
          <div ref={ima} className="grid place-items-center p-[8vw] md:p-[3vw]">
            <a data-botao-ima href={linkWhats(opcao.servico)}
              className="relative grid aspect-square w-[62vw] place-items-center rounded-full bg-tinta text-center text-papel active:scale-[0.97] md:w-[min(21vw,40svh)]">
              <span data-pulso data-so-movimento aria-hidden="true" className="absolute inset-0 rounded-full border-[3px] border-tinta" />
              <span data-rotulo-ima className="grid gap-1 px-6">
                <span className="titulo text-[30px] leading-[0.9] md:text-[min(2.6vw,5svh)]">{contato.botao}</span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.span key={opcao.rotulo} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}
                    transition={{ duration: ritmo.dur.curta }} className="text-[14px] font-medium text-coral md:text-[15px]">
                    {opcao.rotulo}
                  </m.span>
                </AnimatePresence>
              </span>
            </a>
          </div>
          <dl className="grid w-full gap-6 sm:grid-cols-3 md:grid-cols-1">
            {contato.info.map((b) => (
              <div key={b.titulo} className="border-t-2 border-tinta pt-3">
                <dt className="titulo text-[24px]">{b.titulo}</dt>
                {b.linhas.map((l) => <dd key={l} className="text-[15px] leading-snug">{l}</dd>)}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
