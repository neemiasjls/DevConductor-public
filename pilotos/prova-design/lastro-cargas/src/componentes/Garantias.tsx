import { useRef } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'
import { garantias } from '../data/conteudo'

const VOLTAS = 20 // uma passagem por 0–9 antes de chegar ao valor; menos giro decorativo

// A roda da direita dá uma volta; a da esquerda chega direto ao dígito.
const destino = (digito: number, ultima: boolean) => (ultima ? 10 : 0) + digito

function Hodometro({ valor }: { valor: number }) {
  const texto = String(valor).padStart(2, '0')
  return (
    <span className="numeros inline-flex gap-[0.08em]" aria-hidden>
      {texto.split('').map((d, i) => {
        const ultima = i === texto.length - 1
        const fim = destino(Number(d), ultima)
        return (
          <span
            key={i}
            className={`relative inline-block h-[1.08em] w-[0.7em] overflow-hidden rounded-[0.1em] shadow-[inset_0_0.08em_0.16em_rgba(0,0,0,0.55)] ${
              ultima ? 'bg-sinal text-tinta' : 'bg-carvao-3 text-papel'
            }`}
          >
            <span
              data-tira
              data-fim={fim}
              className="absolute inset-x-0 top-0 flex flex-col items-center"
              style={{ transform: `translateY(${(-fim / VOLTAS) * 100}%)` }}
            >
              {Array.from({ length: VOLTAS }, (_, n) => (
                <span key={n} className="block h-[1.08em] leading-[1.08em]">{n % 10}</span>
              ))}
            </span>
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35),transparent_28%,transparent_72%,rgba(0,0,0,0.35))]" />
          </span>
        )
      })}
    </span>
  )
}

// Hodômetro (família Dados e prova): as rodas giram uma vez quando a seção entra.
export default function Garantias() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      const tiras = gsap.utils.toArray<HTMLElement>('[data-tira]')
      gsap.set(tiras, { y: 0, yPercent: 0 })
      gsap.set('[data-garantia-texto]', { autoAlpha: 0, y: 16 })
      const tl = gsap.timeline({ paused: true })
      tiras.forEach((tira, i) => {
        const fim = Number(tira.dataset.fim)
        tl.to(tira, { yPercent: (-fim / VOLTAS) * 100, duration: 0.85 + (i % 2) * 0.25, ease: 'power3.inOut' }, Math.floor(i / 2) * 0.12)
      })
      tl.to('[data-garantia-texto]', { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.12, ease: 'power3.out' }, 0.2)
      gsap.timeline({ scrollTrigger: { trigger: raiz.current, start: 'top 62%', once: true, onEnter: () => { tl.play() } } })
    })
    return () => mm.revert()
  }, { scope: raiz })

  return (
    <section ref={raiz} aria-labelledby="garantias-titulo" className="relative bg-carvao px-5 py-24 text-papel md:px-10 md:py-36">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="numeros text-[12px] uppercase tracking-[0.16em] text-sinal">{garantias.numero} Garantias</p>
          <h2 id="garantias-titulo" className="titulo mt-3 max-w-[11ch] text-[clamp(36px,10.4vw,46px)] font-semibold md:text-[clamp(44px,4.6vw,72px)]">
            {garantias.titulo}
          </h2>
          <p className="mt-6 text-[12px] text-nevoa">{garantias.aviso}</p>
        </div>
        <ul className="md:col-span-7 md:col-start-6">
          {garantias.itens.map((g) => (
            <li key={g.unidade} className="grid grid-cols-[auto_1fr] items-center gap-5 border-t border-papel/15 py-6 md:gap-10 md:py-8">
              <span className="font-texto text-[60px] font-semibold leading-none md:text-[clamp(80px,7.6vw,116px)]">
                <Hodometro valor={g.valor} />
                <span className="sr-only">{g.valor}</span>
              </span>
              <div data-garantia-texto>
                <p className="titulo text-[26px] font-semibold md:text-[36px]">{g.unidade}</p>
                <p className="mt-1 max-w-[32ch] text-[14px] leading-relaxed text-nevoa md:text-[16px]">{g.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
