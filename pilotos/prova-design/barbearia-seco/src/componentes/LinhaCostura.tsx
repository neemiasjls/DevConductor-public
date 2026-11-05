import { useLayoutEffect, useRef, useState } from 'react'
import { cores } from '../ritmo'

/**
 * Costura entre "O trabalho" e "Cortes" (linha desenhada, família Ilustração viva): o fio grosso da grade
 * desce, dobra em ângulo reto e entra na seção seguinte. O traço é medido em px (sem distorcer a espessura);
 * `pathLength=1` deixa o desenho por strokeDashoffset igual em qualquer tamanho.
 */
export function LinhaCostura({ inicioX, fimX }: { inicioX: number; fimX: number }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = caixa.current!
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight })
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const { w, h } = tam
  const x1 = Math.round(w * inicioX), x2 = Math.round(w * fimX), meio = Math.round(h * 0.55)
  return (
    <div ref={caixa} aria-hidden="true" className="relative h-[clamp(140px,24vh,260px)]">
      <svg width={w || 1} height={h || 1} viewBox={`0 0 ${w || 1} ${h || 1}`} className="absolute inset-0 block overflow-visible">
          <path
            data-fio-traco
            d={`M${x1} 0 V${meio} H${x2} V${h + 8}`}
            pathLength={1}
            fill="none"
            stroke={cores.grito}
            strokeWidth={10}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
      </svg>
    </div>
  )
}
