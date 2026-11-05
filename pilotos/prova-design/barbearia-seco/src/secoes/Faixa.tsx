import { useRef, useSyncExternalStore } from 'react'

// Pausa compartilhada pelas faixas (um botão em cada faixa pausa/retoma todas).
let pausadas = false
const ouvintes = new Set<() => void>()
const alternarPausa = () => { pausadas = !pausadas; ouvintes.forEach((f) => f()) }
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }
import { gsap, ScrollTrigger, useGSAP } from '../movimento'
import { ritmo } from '../ritmo'

type Props = {
  itens: string[]
  inclinacao: number
  /** 1 = corre para a esquerda; -1 = para a direita */
  sentido: 1 | -1
  tema: 'grito' | 'tinta'
  className?: string
}

/**
 * Faixa inclinada com os serviços (restilizada, não a faixa infinita de fábrica): anda sozinha devagar,
 * acelera com a velocidade da rolagem e inverte quando a pessoa rola para cima.
 * Movimento reduzido: parada.
 */
export function Faixa({ itens, inclinacao, sentido, tema, className = '' }: Props) {
  const moldura = useRef<HTMLDivElement>(null)
  const trilho = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const el = trilho.current!
        let metade = el.scrollWidth / 2
        const medir = () => { metade = el.scrollWidth / 2 }
        ScrollTrigger.addEventListener('refresh', medir)
        let x = sentido === 1 ? 0 : -metade / 2
        let impulso = 0
        let dir = 1
        let ativa = false
        const base = window.innerWidth < 768 ? ritmo.faixa.baseCelular : ritmo.faixa.baseComputador
        const porX = gsap.quickSetter(el, 'x', 'px')
        const tick = (_t: number, dt: number) => {
          if (!ativa || !metade || pausadas) return
          x -= ((base + impulso) * sentido * dir * dt) / 1000
          if (x <= -metade) x += metade
          if (x > 0) x -= metade
          porX(x)
          impulso *= Math.pow(0.9, dt / 16.7)
        }
        gsap.ticker.add(tick)
        const st = ScrollTrigger.create({
          trigger: moldura.current,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (s) => { ativa = s.isActive },
          onUpdate: (s) => {
            dir = s.direction
            impulso = Math.min(Math.abs(s.getVelocity()) * ritmo.faixa.impulso, ritmo.faixa.tetoImpulso)
          },
        })
        ativa = st.isActive
        return () => {
          gsap.ticker.remove(tick)
          ScrollTrigger.removeEventListener('refresh', medir)
        }
      })
    },
    { scope: moldura },
  )

  // Cada metade do trilho repete a lista para sempre cobrir a largura da tela.
  const pausada = useSyncExternalStore(assinar, () => pausadas)
  const metadeLista = [...itens, ...itens, ...itens]
  const cor = tema === 'grito' ? 'bg-grito text-tinta' : 'bg-tinta text-grito'
  return (
    <div ref={moldura} className={`faixa-moldura py-[4vw] max-md:py-[5vw] ${className}`}>
      <button
        type="button"
        onClick={alternarPausa}
        aria-pressed={pausada}
        className="pointer-events-auto absolute bottom-[0.6vw] right-[var(--margem)] z-10 min-h-[44px] border-[3px] border-tinta bg-papel px-3 text-[13px] font-bold text-tinta motion-reduce:hidden max-md:bottom-[1vw]"
      >
        {pausada ? 'Retomar faixas' : 'Pausar faixas'}
      </button>
      <div aria-hidden="true" className={`faixa ${cor}`} style={{ transform: `rotate(${inclinacao}deg)` }}>
        <div ref={trilho} className="flex w-max will-change-transform py-[0.24em] titulo text-[clamp(34px,5.4vw,88px)]" style={{ fontWeight: 850, lineHeight: 1 }}>
          {[0, 1].map((copia) => (
            <div key={copia} className="flex">
              {metadeLista.map((t, i) => (
                <span key={`${copia}-${i}`} className="faixa-item">{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
