import { useRef, type CSSProperties } from 'react'
import { gsap, useGSAP } from '../movimento'
import { ritmo } from '../ritmo'
import { senta } from '../data/conteudo'

// Posições de partida fixas (sem sorteio, para o mesmo resultado em toda visita): fração da tela.
const PARTIDA = [
  [-0.55, -0.42, -70, 1.6], [0.1, -0.6, 40, 0.5], [0.45, 0.48, -110, 1.4], [-0.3, 0.55, 85, 0.7], [0.62, -0.3, 25, 1.8],
  [0, 0, 0, 1], [-0.62, 0.2, 120, 0.6], [0.3, -0.52, -55, 1.3], [0.58, 0.32, 160, 0.8],
] as const

/**
 * Senta aí — letras encontram o lugar (família Texto, receita letras-em-cena), cena presa curta. As letras
 * chegam espalhadas e giradas e se encaixam com a rolagem, como cadeira sendo puxada.
 * Celular: mesma cena em duas linhas, pin mais curto. Reduzido: frase inteira parada.
 */
export function SentaAi() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      // Computador e celular: mesma cena; o tamanho do invólucro (CSS --pin-c/--pin-m) dá o pin mais curto.
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const letras = gsap.utils.toArray<HTMLElement>('[data-letra]')
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            // Cena presa por position: sticky no invólucro (sem CLS do pin fixo); o GSAP só faz o scrub.
            trigger: raiz.current!.parentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: ritmo.scrub,
            invalidateOnRefresh: true,
          },
        })
        // Um fromTo por letra + estado inicial fixado antes: com stagger + invalidateOnRefresh, o GSAP só
        // redesenhava a 1ª letra no início (as outras apareciam montadas e depois pulavam para longe).
        const partida = (i: number) => {
          const [fx, fy, r, e] = PARTIDA[i % PARTIDA.length]
          // O gesto continua espalhado, mas a palavra se reconhece mais cedo e não ocupa a tela toda.
          return { x: fx * window.innerWidth * 0.55, y: fy * window.innerHeight * 0.6, rotation: r * 0.45, scale: 1 + (e - 1) * 0.3 }
        }
        letras.forEach((letra, i) => {
          gsap.set(letra, partida(i))
          tl.fromTo(
            letra,
            { x: () => partida(i).x, y: () => partida(i).y, rotation: partida(i).rotation, scale: partida(i).scale },
            { x: 0, y: 0, rotation: 0, scale: 1, duration: 1, ease: 'power3.out', immediateRender: false },
            i * ritmo.escalonar * 2,
          )
        })
        tl.from('[data-senta-fio]', { scaleX: 0, transformOrigin: '0% 50%', duration: 0.35, ease: 'power2.inOut' }, '>-0.2')
          .from('[data-senta-texto]', { y: ritmo.distancia, opacity: 0, duration: 0.3, ease: 'power2.out' }, '<0.1')
          .to({}, { duration: 0.35 })
      })
    },
    { scope: raiz },
  )

  const palavras = senta.frase.toUpperCase().split(' ')
  return (
    <div className="cena-presa" style={{ '--pin-c': '100svh', '--pin-m': '75svh' } as CSSProperties}>
    <section ref={raiz} id="senta" aria-labelledby="titulo-senta" className="relative flex min-h-[100svh] flex-col justify-center overflow-clip bg-grito px-[var(--margem)] py-16 text-tinta">
      <h2 id="titulo-senta" aria-label={senta.frase} className="titulo m-0 text-center text-[28vw] max-md:text-[46vw]" style={{ fontWeight: 900 }}>
        {palavras.map((p, pi) => (
          <span key={p} aria-hidden="true" className="inline-block whitespace-nowrap max-md:block">
            {[...p].map((ch, ci) => (
              <span key={`${pi}-${ci}`} data-letra className="inline-block">
                {ch}
              </span>
            ))}
            {pi < palavras.length - 1 && <span className="inline-block w-[0.18em] max-md:hidden"> </span>}
          </span>
        ))}
      </h2>
      <span data-senta-fio aria-hidden="true" className="mx-auto mt-8 block h-[6px] w-[min(92vw,1300px)] bg-tinta max-md:mt-6" />
      <p data-senta-texto className="mx-auto mb-0 mt-6 max-w-[34ch] text-center text-[clamp(18px,1.8vw,26px)] font-semibold">
        {senta.texto}
      </p>
    </section>
    </div>
  )
}
