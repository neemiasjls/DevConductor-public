import { useRef, type CSSProperties } from 'react'
import { gsap, useGSAP } from '../movimento'
import { consultas, ritmo } from '../ritmo'
import { Foto, type Nome } from '../componentes/Foto'
import { cortes } from '../data/conteudo'

const ROTACAO = [-5, 4, -2.5, 6]
const DESVIO_X = [-18, 22, -8, 14]

/**
 * Cortes — pilha (família Espaço), cena presa: as fotos dos cortes caem uma sobre a outra com leve rotação,
 * como fotos presas no espelho; a lista ao lado marca o corte da vez. Celular: mesma cena, pin mais curto.
 * Movimento reduzido: cartões em grade, sem rotação e sem pin.
 */
export function Cortes() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add({ computador: consultas.computador, celular: consultas.celular }, (ctx) => {
        const { computador } = ctx.conditions!
        const cartas = gsap.utils.toArray<HTMLElement>('[data-carta]')
        const sombras = gsap.utils.toArray<HTMLElement>('[data-sombra]')
        const itens = gsap.utils.toArray<HTMLElement>('[data-item]')
        const marca = raiz.current!.querySelector<HTMLElement>('[data-marca]')
        const contador = raiz.current!.querySelector<HTMLElement>('[data-contador]')!
        const nomeAtual = raiz.current!.querySelector<HTMLElement>('[data-nome-atual]')
        const escala = computador ? 1 : 0.6

        gsap.set(cartas, { rotation: (i) => ROTACAO[i], x: (i) => DESVIO_X[i] * escala })
        let atual = -1
        const marcar = (i: number) => {
          if (i === atual) return
          atual = i
          contador.textContent = String(i + 1)
          if (nomeAtual) nomeAtual.textContent = cortes.itens[i].nome
          itens.forEach((el, j) => el.toggleAttribute('data-ativo', j === i))
        }
        if (marca) gsap.set(marca, { height: itens[0].offsetHeight })
        marcar(0)

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            // Cena presa por position: sticky no invólucro (sem CLS do pin fixo); o GSAP só faz o scrub.
            trigger: raiz.current!.parentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: ritmo.scrub,
            invalidateOnRefresh: true,
            onUpdate: (s) => marcar(Math.min(cartas.length - 1, Math.floor(s.progress * (cartas.length - 0.4) + 0.5))),
          },
        })
        cartas.forEach((carta, i) => {
          if (i === 0) return
          const t = i - 1
          tl.fromTo(
            carta,
            { y: () => window.innerHeight * 0.95, rotation: ROTACAO[i] + (i % 2 ? 18 : -18) },
            { y: 0, rotation: ROTACAO[i], duration: 1, ease: 'power2.out' },
            t,
          )
            .to(cartas[i - 1], { scale: 0.94, duration: 1 }, t)
            .to(sombras[i - 1], { opacity: 0.5, duration: 1 }, t)
          if (marca) tl.to(marca, { y: () => itens[i].offsetTop - itens[0].offsetTop, duration: 0.3, ease: 'power2.inOut' }, t + 0.4)
        })
        tl.to({}, { duration: 0.6 })
      })
    },
    { scope: raiz },
  )

  return (
    <div className="cena-presa" style={{ '--pin-c': '180svh', '--pin-m': '140svh' } as CSSProperties}>
    <section ref={raiz} id="cortes" aria-labelledby="titulo-cortes" className="pilha-secao relative overflow-x-clip bg-papel text-tinta">
      <div className="grid h-full grid-cols-1 md:grid-cols-[40vw_1fr]">
        <div className="relative z-10 flex flex-col px-[var(--margem)] pb-8 pt-10 max-md:pb-2 max-md:pt-6 md:pt-14">
          <h2 id="titulo-cortes" className="titulo m-0 ml-[-0.16em] text-[18.5vw] max-md:ml-[-0.02em] max-md:mr-[-12vw] max-md:text-[40vw]" style={{ fontWeight: 900, lineHeight: 0.78 }}>
            {cortes.titulo}
            <span className="sr-only"> {cortes.subtitulo}</span>
          </h2>
          <p className="m-0 mt-3 max-w-[30ch] text-[clamp(17px,1.5vw,22px)] max-md:mt-2">
            <strong aria-hidden="true" className="mr-2 bg-tinta px-1.5 font-bold uppercase tracking-[0.04em] text-papel">{cortes.subtitulo}</strong>
            {cortes.texto}
          </p>

          <ol className="relative isolate m-0 mt-auto list-none p-0 max-md:hidden">
            <span data-marca aria-hidden="true" className="pilha-marca absolute inset-x-0 top-0 -z-10 block bg-grito" />
            {cortes.itens.map((c) => (
              <li key={c.nome} data-item className="pilha-item border-t-[3px] border-tinta py-3 pl-3 pr-3">
                <span>
                  <strong className="block text-[18px] font-bold uppercase tracking-[0.04em]">{c.nome}</strong>
                  <span className="text-[15px] text-tinta/75">{c.nota}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="pilha-palco">
          {cortes.itens.map((c, i) => (
            <figure key={c.nome} data-carta className="pilha-carta m-0 border-[5px] border-tinta bg-tinta" style={{ zIndex: i + 1 }}>
              <div className="relative aspect-[4/5] overflow-hidden">
                <Foto nome={c.foto as Nome} alt={c.alt} sizes="(max-width: 767px) 72vw, 28vw" className="h-full w-full object-cover" />
                <span data-sombra aria-hidden="true" className="absolute inset-0 bg-tinta opacity-0" />
              </div>
              <figcaption className="pilha-legenda flex flex-col justify-center px-3 text-papel">
                <span className="text-[16px] font-bold leading-tight">{c.nome}</span>
                <span className="text-[13px] leading-tight text-papel/75">{c.nota}</span>
              </figcaption>
            </figure>
          ))}
          <p aria-hidden="true" className="pilha-contador titulo m-0 text-tinta" style={{ fontWeight: 300 }}>
            <span data-contador className="inline-block w-[0.55em] text-right">1</span>
            <span className="text-tinta/40">/{cortes.itens.length}</span>
          </p>
          <p aria-hidden="true" data-nome-atual className="pilha-nome m-0 text-[15px] font-bold md:hidden">
            {cortes.itens[0].nome}
          </p>
        </div>
      </div>
    </section>
    </div>
  )
}
