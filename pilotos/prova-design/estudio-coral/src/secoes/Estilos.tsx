import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { estilos, linkWhats } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
import { ritmo } from '../ritmo'

// Receita rolagem-lateral (esteira de estilos), com palco grudado: a altura da seção = 1 tela + o comprimento
// da esteira, medido a cada refresh. Celular mantém a esteira com distância menor (cartões mais estreitos).
const FUNDO = ['bg-papel text-tinta', 'bg-coral text-tinta', 'bg-tinta text-papel', 'bg-papel text-tinta', 'bg-coral text-tinta', 'bg-tinta text-papel']

export function Estilos() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const secao = raiz.current!
      const q = gsap.utils.selector(secao)
      const trilho = q('[data-trilho]')[0] as HTMLElement
      const palco = q('[data-palco]')[0] as HTMLElement
      const distancia = () => Math.max(0, trilho.scrollWidth - palco.clientWidth)
      const medir = () => secao.style.setProperty('--trilho', distancia() + 'px')
      medir()
      ScrollTrigger.addEventListener('refreshInit', medir)

      const esteira = gsap.to(trilho, { x: () => -distancia(), ease: 'none',
        scrollTrigger: { trigger: secao, start: 'top top', end: 'bottom bottom', scrub: ritmo.scrub, invalidateOnRefresh: true } })
      const revelarFoco = (evento: FocusEvent) => {
        const cartao = (evento.target as HTMLElement).closest<HTMLElement>('li')
        const st = esteira.scrollTrigger
        if (!cartao || !st) return
        const x = Math.max(0, Math.min(distancia(), cartao.offsetLeft - (palco.clientWidth - cartao.offsetWidth) / 2))
        const p = distancia() ? x / distancia() : 0
        palco.scrollLeft = 0
        st.scroll(st.start + (st.end - st.start) * p)
        st.update()
        st.getTween()?.progress(1)
        esteira.progress(p)
      }
      trilho.addEventListener('focusin', revelarFoco)
      // Dentro de cada cartão a foto corre ao contrário (profundidade) e o cartão se inclina ao entrar.
      q('[data-cartao]').forEach((cartao) => {
        const img = cartao.querySelector('[data-foto]')
        if (img) gsap.fromTo(img, { xPercent: -7 }, { xPercent: 7, ease: 'none',
          scrollTrigger: { trigger: cartao, containerAnimation: esteira, start: 'left right', end: 'right left', scrub: true } })
        gsap.fromTo(cartao, { rotation: 4, yPercent: 6 }, { rotation: 0, yPercent: 0, ease: 'none',
          scrollTrigger: { trigger: cartao, containerAnimation: esteira, start: 'left right', end: 'left 55%', scrub: true } })
      })
      return () => {
        trilho.removeEventListener('focusin', revelarFoco)
        ScrollTrigger.removeEventListener('refreshInit', medir)
        secao.style.removeProperty('--trilho')
      }
    })
    return () => mm.revert()
  }, { scope: raiz })

  return (
    <section ref={raiz} id="estilos" aria-labelledby="estilos-titulo"
      className="sobre-cobalto relative bg-cobalto text-papel motion-reduce:h-auto!" style={{ height: 'calc(100svh + var(--trilho, 0px))' }}>
      <div data-palco className="sticky top-0 h-svh overflow-hidden motion-reduce:relative motion-reduce:h-auto motion-reduce:py-16">
        <ul data-trilho
          className="flex h-full w-max items-center gap-4 px-[var(--margem)] motion-reduce:grid motion-reduce:w-auto motion-reduce:grid-cols-1 motion-reduce:gap-6 md:gap-[2.6vw] md:motion-reduce:grid-cols-3">
          <li className="flex w-[84vw] shrink-0 flex-col justify-center motion-reduce:w-auto md:w-[52vw] md:pr-[3vw] md:motion-reduce:col-span-3">
            <h2 id="estilos-titulo" className="titulo text-[30vw] leading-[0.8] md:text-[min(16vw,30svh)]">{estilos.titulo}</h2>
            <p className="mt-5 max-w-[34ch] text-[16px] leading-snug md:mt-7 md:text-[19px]">{estilos.texto}</p>
          </li>
          {estilos.itens.map((e, i) => (
            <li key={e.nome} data-cartao
              className={`${FUNDO[i]} flex h-[66svh] w-[74vw] shrink-0 flex-col rounded-[var(--raio-foto)] p-2.5 motion-reduce:h-[70svh] motion-reduce:w-auto md:h-[74svh] md:w-[27vw] md:p-3`}>
              {e.foto ? (
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-[calc(var(--raio-foto)-10px)] [isolation:isolate] md:rounded-[calc(var(--raio-foto)-12px)]">
                  <Foto data-foto nome={e.foto.nome} alt={e.foto.alt} sizes="(min-width: 768px) 32vw, 86vw"
                    className="absolute inset-y-0 left-[-9%] h-full w-[118%] max-w-none object-cover" />
                </div>
              ) : (
                <div aria-hidden="true" className="titulo flex min-h-0 flex-1 flex-col justify-center overflow-hidden text-[38vw] leading-[0.78] text-coral md:text-[min(13vw,26svh)]">
                  <span className="block">Tw</span><span className="block pl-[0.35em]">ist</span>
                </div>
              )}
              <div className="px-2 pb-2 pt-4 md:px-3 md:pb-3">
                <h3 className="titulo text-[44px] md:text-[min(3.6vw,7svh)]">{e.nome}</h3>
                <p className="mt-1 text-[15px] leading-snug md:text-[16px]">{e.nota}</p>
                <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] opacity-70">{estilos.tempo}</p>
              </div>
            </li>
          ))}
          <li className="flex w-[74vw] shrink-0 flex-col justify-center gap-5 motion-reduce:w-auto md:w-[30vw] md:pl-[2vw] md:motion-reduce:col-span-3">
            <h3 className="titulo text-[18vw] md:text-[min(7vw,14svh)]">{estilos.fim.titulo}</h3>
            <p className="max-w-[28ch] text-[16px] leading-snug md:text-[18px]">{estilos.fim.texto}</p>
            <a href={linkWhats('um estilo que vi numa foto')} className="pilula self-start bg-papel text-[15px] text-tinta">{estilos.fim.botao}</a>
          </li>
        </ul>
      </div>
    </section>
  )
}
