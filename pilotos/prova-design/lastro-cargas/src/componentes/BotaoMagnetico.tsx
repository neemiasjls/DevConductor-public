import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { MotionConfig, motion, useSpring, useTransform } from 'motion/react'
import { consultas } from '../ritmo'
import { classeBotao, classeTextoBotao } from './botaoClasses'

// Botão magnético (família Interação): o disco puxa na direção do cursor e o texto vai um pouco além.
// Só com mouse e movimento permitido; no toque é um botão comum.
export default function BotaoMagnetico({ href, children }: { href: string; children: string }) {
  const area = useRef<HTMLDivElement>(null)
  const mola = { stiffness: 170, damping: 15, mass: 0.5 }
  const x = useSpring(0, mola)
  const y = useSpring(0, mola)
  const tx = useTransform(x, (v) => v * 0.45)
  const ty = useTransform(y, (v) => v * 0.45)

  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !matchMedia(consultas.mover).matches || !matchMedia(consultas.mouse).matches) return
    const r = area.current!.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * 0.32)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.32)
  }
  const soltar = () => { x.set(0); y.set(0) }

  return (
    <MotionConfig reducedMotion="user">
    <div ref={area} onPointerMove={mover} onPointerLeave={soltar} className="-m-8 inline-block p-8">
      <motion.a
        href={href}
        style={{ x, y }}
        className={classeBotao}
      >
        <span aria-hidden className="absolute inset-0 rounded-full border border-tinta/25 transition-transform duration-500 ease-entra group-hover:scale-[0.92]" />
        <motion.span style={{ x: tx, y: ty }} className={classeTextoBotao}>
          {children}
        </motion.span>
      </motion.a>
    </div>
    </MotionConfig>
  )
}

