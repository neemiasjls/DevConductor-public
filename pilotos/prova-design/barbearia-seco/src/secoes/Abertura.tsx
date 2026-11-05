import { useRef } from 'react'
import { gsap, useGSAP } from '../movimento'
import { ritmo } from '../ritmo'
import { Foto } from '../componentes/Foto'
import { abertura, aviso, linkWhats, negocio } from '../data/conteudo'

/**
 * Abertura — tipografia variável (família Texto). "SECO" nasce fino (peso 100, já legível) e engrossa até 900
 * no carregamento, como a máquina apertando o corte; com a rolagem, afina de novo.
 * A caixa do título tem tamanho fixo e `contain: strict`: a largura das letras muda sem mexer no resto.
 */
export function Abertura() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const titulo = raiz.current!.querySelector<HTMLElement>('[data-seco]')!
      const foto = raiz.current!.querySelector<HTMLElement>('[data-foto-abertura]')!
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const estado = { carga: 0, rolagem: 0 }
        const aplicar = () => {
          const peso = 100 + 800 * estado.carga - 620 * estado.rolagem * estado.carga
          titulo.style.setProperty('--wght', peso.toFixed(1))
        }
        aplicar()
        const tl = gsap.timeline({ delay: 0.15 })
        tl.to(estado, { carga: 1, duration: 1.6, ease: ritmo.entra, onUpdate: aplicar }, 0)
          .fromTo(foto, { scale: 1.12 }, { scale: 1, duration: 1.6, ease: ritmo.entra }, 0)
          .from('[data-entra]', { y: ritmo.distancia, opacity: 0, duration: ritmo.longa, ease: ritmo.entra, stagger: 0.06 }, 0.3)
        gsap.to(estado, {
          rolagem: 1,
          ease: 'none',
          onUpdate: aplicar,
          scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom top', scrub: ritmo.scrub },
        })
        gsap.to(titulo, {
          yPercent: -18,
          ease: 'none',
          scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom top', scrub: ritmo.scrub },
        })
      })
    },
    { scope: raiz },
  )

  return (
    <header ref={raiz} id="topo" className="relative isolate h-[100svh] min-h-[640px] overflow-hidden bg-tinta text-papel max-md:min-h-[700px]">
      <p className="relative z-30 m-0 flex h-[26px] items-center justify-center bg-papel px-3 text-center text-[15px] font-semibold text-tinta">
        {aviso}
      </p>

      <nav aria-label="Principal" className="relative z-30 grid h-14 grid-cols-[1fr_auto] border-b-[3px] border-papel md:h-16 md:grid-cols-[1.2fr_1fr_1fr_auto]">
        <a href="#topo" className="titulo flex items-center px-[var(--margem)] text-[26px] text-papel no-underline md:text-[30px]" style={{ fontWeight: 800, lineHeight: 1 }}>
          {negocio.nome}
        </a>
        <span className="hidden items-center border-l-[3px] border-papel px-5 text-[15px] font-semibold md:flex">{abertura.topo[1]}</span>
        <span className="hidden items-center border-l-[3px] border-papel px-5 text-[15px] font-semibold md:flex">{abertura.topo[2]}</span>
        <a href={linkWhats(abertura.mensagem)} className="flex items-center border-l-[3px] border-papel bg-grito px-5 text-[15px] font-bold uppercase tracking-[0.1em] text-tinta no-underline transition-colors duration-150 hover:bg-papel md:px-8">
          {abertura.botaoCurto}
        </a>
      </nav>

      {/* Foto: à direita no computador, no alto no celular */}
      <div className="absolute right-0 top-[90px] bottom-0 w-[60vw] overflow-hidden max-md:inset-x-0 max-md:top-[82px] max-md:bottom-auto max-md:h-[52%] max-md:w-full">
        <div data-foto-abertura className="h-full w-full">
          <Foto
            nome="abertura-tesoura"
            alt="Barbeiro de cabelo cacheado corta com tesoura o cabelo de um cliente, em preto e branco."
            sizes="(max-width: 767px) 100vw, 60vw"
            prioridade
            className="h-full w-full object-cover [object-position:42%_40%] max-md:[object-position:38%_35%]"
          />
        </div>
      </div>

      {/* Texto do topo */}
      <div className="absolute left-[var(--margem)] top-[128px] z-20 w-[min(30vw,430px)] max-md:inset-x-[var(--margem)] max-md:top-auto max-md:bottom-[96px] max-md:w-auto">
        <p data-entra className="m-0 text-[clamp(26px,2.5vw,38px)] font-[650] uppercase leading-[1.02] tracking-[-0.01em]">
          {abertura.frase[0]}
          <br />
          <span className="bg-grito px-1 text-tinta">{abertura.frase[1]}</span>
        </p>
        <p data-entra className="mb-0 mt-5 max-w-[34ch] text-[18px] text-papel/85 max-md:hidden">{abertura.texto}</p>
        <a data-entra href={linkWhats(abertura.mensagem)} className="botao-grito mt-7 max-md:mt-5 max-md:w-full max-md:justify-center">
          {abertura.botao}
        </a>
      </div>

      {/* Título: caixa fixa e contida; letras cortadas pela borda de baixo de propósito */}
      <h1
        data-seco
        className="titulo titulo-seco absolute bottom-[-2px] left-0 z-10 m-0 w-full text-papel mix-blend-difference [--t:min(56vw,calc((100svh_-_390px)*1.5))] max-md:bottom-auto max-md:top-[calc(82px_+_52%_-_0.42*var(--t))] max-md:[--t:70vw]"
        style={{ fontSize: 'var(--t)', height: 'calc(var(--t) * 0.66)' }}
      >
        <span className="sr-only">{abertura.tituloLeitor}</span>
        <span aria-hidden="true" className="block pl-[0.02em] max-md:pl-[0.01em]" style={{ lineHeight: 1, marginTop: '-0.13em' }}>
          {abertura.titulo}
        </span>
      </h1>
    </header>
  )
}
