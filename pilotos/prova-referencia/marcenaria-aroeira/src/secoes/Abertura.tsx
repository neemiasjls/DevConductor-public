import { useRef } from 'react'
import { gsap, useGSAP } from '../gsap'
import { abertura, whats } from '../data/conteudo'
import Foto from '../componentes/Foto'
import Planta from './Planta'

// Cena principal (da base: presa ~0,8 tela, camada de 3 cartões sobe por cima, texto some na opacidade).
export default function Abertura() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: raiz.current, start: 'top top', end: '+=80%', pin: '[data-palco]', scrub: 0.6 },
      })
      tl.to('[data-texto]', { autoAlpha: 0, y: -60, duration: 0.6 }, 0)
        .fromTo('[data-fundo]', { yPercent: 0 }, { yPercent: 8, duration: 1 }, 0)
        .fromTo('[data-planta]', { yPercent: 0 }, { yPercent: -6, duration: 1 }, 0)
        .fromTo('[data-cartoes]', { y: () => window.innerHeight * (window.innerWidth < 768 ? 0.17 : 0.7) }, { y: 0, duration: 0.7 }, 0.3)
      // Com o retrato estático o texto já estava na tela: entrar de novo faria piscar.
      if (!document.documentElement.dataset.retrato) gsap.from('[data-entra]', { autoAlpha: 0, y: 24, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay: 0.15 })
    })
  }, { scope: raiz })

  return (
    <section ref={raiz} id="inicio" className="relative overflow-hidden bg-cerne">
      <div data-palco className="relative motion-safe:h-svh">
        <div className="absolute inset-0 overflow-hidden">
          {/* No celular o navegador baixa só o recorte em pé (uma imagem deitada seria ampliada 3,5 vezes). */}
          <picture>
            <source media="(max-width: 767px)" srcSet="/img/fundo-abertura-pe-480.webp 480w, /img/fundo-abertura-pe-720.webp 720w" sizes="100vw" />
            <Foto data-fundo nome="fundo-abertura" alt="" sizes="100vw" fetchPriority="high" className="h-[112%] w-full -translate-y-[6%] object-cover" />
          </picture>
          <div className="absolute inset-0 bg-[radial-gradient(62%_50%_at_50%_52%,rgb(20_6_3/0.68),rgb(20_6_3/0.4)_60%,rgb(20_6_3/0.14))]" />
          <Planta data-planta className="absolute inset-0 hidden h-full w-full text-[#ffd2b3]/60 [mask-image:radial-gradient(60%_55%_at_50%_48%,transparent_55%,#000_100%)] md:block" />
        </div>

        <div data-texto className="relative flex min-h-svh flex-col items-center justify-center px-4 pb-[27svh] pt-24 text-center md:pb-16 md:pt-24">
          <span data-entra className="mb-6 grid h-12 w-10 place-items-center rounded-full border border-areia/70 font-[family-name:var(--font-titulo)] text-[22px] text-areia">A</span>
          <p data-entra className="assinatura mb-7 text-[40px] leading-none text-areia md:text-[46px]">{abertura.assinatura}</p>
          <h1 data-entra className="titulo text-creme max-w-[1100px] text-[clamp(2.15rem,5vw,4.5rem)]">
            <span className="block">{abertura.titulo[0]}</span><span className="block">{abertura.titulo[1]}</span>
          </h1>
          <p data-entra className="mt-7 max-w-[400px] text-balance text-[17px] leading-snug text-white md:mt-9 md:text-[18px]">{abertura.texto}</p>
          <a
            data-entra
            href={whats(abertura.msg)}
            target="_blank"
            rel="noopener"
            className="mt-9 inline-flex min-h-11 items-center rounded-md bg-white px-4 text-[15px] uppercase text-tinta outline outline-1 outline-offset-[3px] outline-white/40 transition-colors hover:bg-creme"
          >
            {abertura.botao}
          </a>
        </div>

        <ul data-cartoes className="relative flex items-start justify-center gap-[3vw] px-4 pb-10 motion-safe:pointer-events-none motion-safe:absolute motion-safe:inset-x-0 motion-safe:top-[62svh] motion-safe:pb-0 md:gap-[4vw]">
          {abertura.cartoes.map((c, i) => (
            <li key={c.foto} className={`relative w-[30vw] max-w-[320px] ${i === 1 ? 'md:motion-safe:-mt-[4svh]' : i === 2 ? 'md:motion-safe:mt-[3svh]' : ''}`}>
              <Foto nome={c.foto} alt={c.alt} sizes="(min-width: 768px) 25vw, 30vw" className="tom-unico aspect-[4/3] w-full rounded-[3px] object-cover" />
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-creme px-2 py-0.5 text-[11px] uppercase tracking-[0.06em] text-cerne">{c.rotulo}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
