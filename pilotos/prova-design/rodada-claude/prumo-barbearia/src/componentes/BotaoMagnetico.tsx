import { useEffect, useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { m, useSpring, useTransform } from 'motion/react'
import { consultas } from '../ritmo'

// Botão magnético (família Interação): o botão puxa na direção do cursor e o texto vai um pouco além.
// Só com mouse e movimento permitido; no toque e no reduzido é um link comum.
export default function BotaoMagnetico({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  const area = useRef<HTMLDivElement>(null)
  const mola = { stiffness: 180, damping: 16, mass: 0.5 }
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
  // Movimento reduzido ligado no meio do caminho: a mola volta ao centro na hora, sem animar.
  useEffect(() => {
    const m = matchMedia(consultas.mover)
    const aoMudar = () => { if (!m.matches) { x.jump(0); y.jump(0) } }
    m.addEventListener('change', aoMudar)
    return () => m.removeEventListener('change', aoMudar)
  }, [x, y])

  return (
    <div ref={area} onPointerMove={mover} onPointerLeave={soltar} className="-m-8 inline-block p-8">
      <m.a href={href} style={{ x, y }} className={`relative inline-flex h-14 items-center rounded-full bg-cobre px-7 text-[16px] font-semibold text-tinta md:h-16 md:px-9 md:text-[17px] ${className}`}>
        <m.span style={{ x: tx, y: ty }} className="inline-flex items-center gap-3">{children}</m.span>
      </m.a>
    </div>
  )
}
