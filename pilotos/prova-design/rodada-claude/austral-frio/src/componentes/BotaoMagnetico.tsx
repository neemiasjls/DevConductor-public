import { useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { LazyMotion, MotionConfig, m, useSpring, useTransform } from 'motion/react'
import { consultas } from '../ritmo'

const recursos = () => import('./motionRecursos').then((r) => r.default)

// Botão magnético (Interação): o botão puxa na direção do cursor e o texto vai um pouco além.
// Só com mouse e movimento permitido; no toque e no reduzido é um link comum.
export default function BotaoMagnetico({ href, children, externo, className = '' }: {
  href: string
  children: ReactNode
  externo?: boolean
  className?: string
}) {
  const area = useRef<HTMLDivElement>(null)
  const mola = { stiffness: 170, damping: 16, mass: 0.5 }
  const x = useSpring(0, mola)
  const y = useSpring(0, mola)
  const tx = useTransform(x, (v) => v * 0.4)
  const ty = useTransform(y, (v) => v * 0.4)

  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !matchMedia(consultas.mover).matches || !matchMedia(consultas.mouse).matches) return
    const r = area.current!.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.28)
  }
  const soltar = () => { x.set(0); y.set(0) }

  return (
    <LazyMotion features={recursos} strict>
      <MotionConfig reducedMotion="user">
        <div ref={area} onPointerMove={mover} onPointerLeave={soltar} className="-my-6 -ml-6 inline-block py-6 pl-6">
          <m.a
            href={href}
            {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            style={{ x, y }}
            className={`botao relative ${className}`}
          >
            <m.span style={{ x: tx, y: ty }} className="relative inline-flex items-center gap-3">{children}</m.span>
          </m.a>
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}
