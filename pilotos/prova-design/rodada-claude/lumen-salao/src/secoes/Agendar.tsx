import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { agendar, linkWhats } from '../data/conteudo'
import { ritmo } from '../ritmo'

// Cena 6: fecha o arco da luz. O mesmo reflexo da abertura corre uma única vez pelas letras de "Agende";
// o botão de WhatsApp pulsa uma vez quando chega à tela e é magnético com mouse (Texto + Interação).
// LP-12: só título, apoio e botão; telefone, endereço e horários foram para o rodapé (seção de leitura).
export function Agendar() {
  const secao = useRef<HTMLElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(secao)
      const reflexo = q('[data-reflexo-letras]')[0], botao = q('[data-magnetico]')[0] as HTMLElement
      gsap.set(reflexo, { opacity: 1, backgroundPosition: '130% 0' })
      const passada = gsap.timeline({ paused: true })
        .to(reflexo, { backgroundPosition: '-30% 0', duration: ritmo.dur.longa * 1.6, ease: ritmo.ease.cruza })
        .to(botao, { scale: 1.05, duration: ritmo.dur.curta * 1.3, ease: 'power2.out' }, '-=0.5')
        .to(botao, { scale: 1, duration: ritmo.dur.media, ease: ritmo.ease.entra })
      ScrollTrigger.create({ trigger: q('[data-palavra-agende]')[0], start: 'top 75%', once: true, onEnter: () => passada.play() })
      secao.current!.dataset.passada = 'pronta'
      passada.eventCallback('onComplete', () => { secao.current!.dataset.passada = 'feita' })
    })
    mm.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', () => {
      const botao = secao.current!.querySelector<HTMLElement>('[data-magnetico]')!
      const area = botao.parentElement!
      const x = gsap.quickTo(botao, 'x', { duration: ritmo.dur.media, ease: ritmo.ease.entra })
      const y = gsap.quickTo(botao, 'y', { duration: ritmo.dur.media, ease: ritmo.ease.entra })
      const mover = (e: PointerEvent) => {
        const r = area.getBoundingClientRect()
        x(((e.clientX - r.left) / r.width - 0.5) * 18)
        y(((e.clientY - r.top) / r.height - 0.5) * 14)
      }
      const soltar = () => { x(0); y(0) }
      area.addEventListener('pointermove', mover)
      area.addEventListener('pointerleave', soltar)
      // limpa de verdade (não só zera): no reduzido o botão não pode ficar com transform no estilo
      return () => {
        area.removeEventListener('pointermove', mover); area.removeEventListener('pointerleave', soltar)
        gsap.killTweensOf(botao, 'x,y'); gsap.set(botao, { clearProps: 'transform' })
      }
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <section ref={secao} id="agendar" aria-labelledby="titulo-agendar" className="sobre-ameixa relative bg-ameixa text-claro">
      <div className="px-[var(--margem)] pb-[14svh] pt-[6svh] md:grid md:grid-cols-12 md:gap-x-8 md:pb-[18svh] md:pt-[4svh]">
        <h2 id="titulo-agendar" className="md:col-span-7 titulo text-[clamp(56px,17vw,72px)] leading-[0.98] md:text-[clamp(84px,9vw,128px)]">
          <span data-palavra-agende className="relative inline-block">
            {agendar.palavra}
            {/* taste-skill-ignore: o reflexo da abertura corre uma vez pelas letras (cena 6 do plano); some depois da passada */}
            <span aria-hidden="true" data-reflexo-letras data-so-movimento
              /* taste-skill-ignore */ className="pointer-events-none absolute inset-0 bg-clip-text text-transparent [background-image:linear-gradient(100deg,transparent_38%,oklch(0.99_0.02_190)_50%,transparent_62%)] [background-size:260%_100%]">
              {agendar.palavra}
            </span>
          </span>
          <span className="block text-[0.42em] leading-[1.1] text-claro/90">{agendar.resto}</span>
        </h2>
        <div className="mt-10 md:col-span-4 md:col-start-9 md:mt-0 md:self-end md:pb-3">
          <div>
            <p className="max-w-[42ch] text-[17px] text-claro/90 md:text-[18px]">{agendar.texto}</p>
            <div className="mt-8 inline-block p-3 -m-3">
              <a data-magnetico href={linkWhats()} className="pilula bg-claro px-8 text-[17px] text-petroleo hover:bg-luz">{agendar.botao}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
