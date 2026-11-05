import { useRef } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'
import { servicos, whatsapp } from '../data/conteudo'

// Rolagem lateral presa (família Espaço): as quatro docas do pátio passam como numa esteira.
// O número de cada doca, pintado no piso, corre mais devagar que o trilho (profundidade).
export default function Servicos() {
  const raiz = useRef<HTMLElement>(null)
  const involucro = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: consultas.mover, celular: consultas.celular }, (ctx) => {
      const { mover, celular } = ctx.conditions as { mover: boolean; celular: boolean }
      if (!mover) return
      const palco = raiz.current!.querySelector<HTMLElement>('[data-palco]')!
      const trilho = raiz.current!.querySelector<HTMLElement>('[data-trilho]')!
      const distancia = () => Math.max(0, trilho.scrollWidth - palco.clientWidth)
      const dimensionar = () => gsap.set(involucro.current, { height: raiz.current!.offsetHeight + distancia() * (celular ? 0.85 : 1) })
      dimensionar()
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: involucro.current, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true,
          onRefreshInit: dimensionar,
        },
      })
      tl.to(trilho, { x: () => -distancia(), duration: 1 }, 0)
      tl.fromTo('[data-doca-num]', { x: () => window.innerWidth * 0.12 }, { x: () => -window.innerWidth * 0.12, duration: 1 }, 0)
      tl.fromTo('[data-progresso-servicos]', { scaleX: 0 }, { scaleX: 1, duration: 1, transformOrigin: 'left center' }, 0)
      // Tab e Shift+Tab percorrem as docas na mesma ordem visual da rolagem.
      // O navegador pode rolar o palco ao focar um link recortado: desfazemos esse deslocamento
      // nativo e sincronizamos a posição vertical e a linha do tempo, sem esperar o scrub.
      const revelarFoco = (evento: FocusEvent) => {
        const artigo = (evento.target as HTMLElement).closest('article')
        const st = tl.scrollTrigger
        if (!artigo || !st) return
        const x = Math.max(0, Math.min(distancia(), artigo.offsetLeft - (palco.clientWidth - artigo.offsetWidth) / 2))
        const p = distancia() ? x / distancia() : 0
        palco.scrollLeft = 0
        st.scroll(st.start + (st.end - st.start) * p)
        st.update()
        st.getTween()?.progress(1)
        tl.progress(p)
      }
      trilho.addEventListener('focusin', revelarFoco)
      return () => trilho.removeEventListener('focusin', revelarFoco)
    })
    return () => mm.revert()
  }, { scope: raiz })

  return (
    <div ref={involucro} className="relative motion-safe:h-[calc(100svh+207vw)] md:motion-safe:h-[calc(100svh+124vw)] lg:motion-safe:h-[calc(100svh+76vw)]">
    <section
      id="servicos"
      ref={raiz}
      aria-labelledby="servicos-titulo"
      className="relative overflow-hidden bg-papel text-tinta motion-safe:sticky motion-safe:top-0 motion-safe:h-[100svh]"
    >
      <div className="flex h-full flex-col pt-32 md:pt-28">
        <div className="grid gap-3 px-5 md:grid-cols-12 md:items-end md:px-10">
          <div className="md:col-span-7">
            <p className="numeros text-[12px] uppercase tracking-[0.16em] text-grafite">{servicos.numero} Serviços</p>
            <h2 id="servicos-titulo" className="titulo mt-3 text-[clamp(36px,10.4vw,46px)] font-semibold md:text-[clamp(48px,5.4vw,84px)]">
              {servicos.titulo}
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="max-w-[40ch] text-[14px] leading-relaxed text-grafite md:text-[16px]">{servicos.texto}</p>
            <div aria-hidden className="mt-4 hidden h-[2px] bg-tinta/12 motion-safe:block">
              <div data-progresso-servicos className="h-full origin-left bg-tinta" />
            </div>
          </div>
        </div>

        <div data-palco className="relative mt-6 flex-1 overflow-hidden md:mt-10 motion-reduce:overflow-visible">
          <div
            data-trilho
            className="relative flex h-full w-max motion-reduce:w-full motion-reduce:flex-col"
          >
            {servicos.lista.map((s, i) => (
              <article
                key={s.doca}
                className="relative flex h-full min-h-[440px] w-[86vw] shrink-0 flex-col overflow-hidden border-l border-tinta/15 px-5 pb-12 pt-5 md:w-[56vw] md:px-10 lg:w-[44vw] motion-reduce:w-full motion-reduce:border-l-0 motion-reduce:border-t"
              >
                <p className="numeros text-[12px] uppercase tracking-[0.16em] text-grafite">Doca {s.doca}</p>
                <span
                  data-doca-num
                  aria-hidden
                  className="titulo contorno pointer-events-none absolute -right-[2vw] top-0 select-none text-[clamp(220px,58vw,260px)] font-bold leading-[0.8] md:text-[clamp(280px,44vh,480px)]"
                >
                  {s.doca}
                </span>
                <div className="relative mt-auto">
                  <h3 className="titulo text-[clamp(36px,10vw,44px)] font-semibold md:text-[clamp(44px,4.4vw,68px)]">{s.nome}</h3>
                  <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed text-grafite md:text-[17px]">{s.texto}</p>
                  <ul className="mt-5 max-w-[420px] border-t border-tinta/15">
                    {s.itens.map((item, j) => (
                      <li key={item} className="flex items-baseline justify-between border-b border-tinta/15 py-2 text-[14px] md:text-[15px]">
                        <span>{item}</span>
                        <span className="numeros text-[12px] text-grafite">{String.fromCharCode(97 + j)}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={whatsapp(s.mensagem)}
                    className="mt-5 inline-block text-[15px] font-medium underline decoration-sinal decoration-2 underline-offset-[7px] transition-colors hover:text-grafite"
                  >
                    {s.link}
                  </a>
                </div>
                {i === servicos.lista.length - 1 && <span aria-hidden className="absolute inset-y-0 right-0 w-px bg-tinta/15" />}
              </article>
            ))}
            <div aria-hidden className="zebra absolute inset-x-0 bottom-0 h-3 motion-reduce:hidden" />
          </div>
        </div>
      </div>
    </section>
    </div>
  )
}
