import type { SVGProps } from 'react'

// Planta de cozinha em traço fino (desenho próprio): o projeto que o cliente vê antes da produção.
export default function Planta(props: SVGProps<SVGSVGElement>) {
  const t = { fill: 'none', stroke: 'currentColor', strokeWidth: 1 }
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden {...props}>
      <g {...t}>
        <rect x="150" y="140" width="1140" height="640" />
        <rect x="150" y="140" width="1140" height="70" />
        {Array.from({ length: 16 }, (_, i) => <line key={i} x1={150 + i * 71} y1="140" x2={150 + i * 71} y2="210" />)}
        <rect x="150" y="210" width="70" height="420" />
        {Array.from({ length: 6 }, (_, i) => <line key={i} x1="150" y1={210 + i * 70} x2="220" y2={210 + i * 70} />)}
        <rect x="520" y="400" width="400" height="140" />
        <line x1="520" y1="470" x2="920" y2="470" strokeDasharray="6 6" />
        <circle cx="720" cy="175" r="22" />
        <circle cx="1000" cy="168" r="12" /><circle cx="1040" cy="168" r="12" /><circle cx="1000" cy="190" r="9" /><circle cx="1040" cy="190" r="9" />
        <path d="M1290 560 A 120 120 0 0 0 1170 680 L1290 680" />
        <path d="M150 700 A 80 80 0 0 1 230 780" />
        <line x1="150" y1="800" x2="1290" y2="800" /><line x1="150" y1="793" x2="150" y2="807" /><line x1="1290" y1="793" x2="1290" y2="807" />
        <line x1="1340" y1="140" x2="1340" y2="780" /><line x1="1332" y1="140" x2="1348" y2="140" /><line x1="1332" y1="780" x2="1348" y2="780" />
        <rect x="1090" y="300" width="120" height="180" />
        <line x1="1090" y1="390" x2="1210" y2="390" />
      </g>
      <g fill="currentColor" fontSize="13" letterSpacing="2">
        <text x="680" y="822">4,20 m</text>
        <text x="1352" y="465" transform="rotate(90 1352 465)">2,60 m</text>
        <text x="650" y="476" fontSize="11">ILHA · 2,00 × 0,70</text>
      </g>
    </svg>
  )
}
