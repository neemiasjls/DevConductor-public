import type { SVGProps } from 'react'

// Vista de frente de uma cozinha (desenho próprio, em traço fino com cotas, como folha de projeto),
// com os pontos conferidos na medição.
export default function Elevacao(props: SVGProps<SVGSVGElement>) {
  const traco = '#7b6a57'
  const p = { fill: 'rgb(255 255 255 / 0.5)', stroke: traco, strokeWidth: 1.5 }
  const fino = { fill: 'none', stroke: traco, strokeWidth: 1 }
  const cota = { fill: 'none', stroke: '#96846e', strokeWidth: 1.1 }
  const pontos = [[118, 138], [330, 72], [470, 252], [596, 150], [232, 330]]
  return (
    <svg viewBox="14 0 700 440" role="img" aria-label="Desenho de frente de uma cozinha planejada, com cotas e cinco pontos de medição marcados" {...props}>
      {/* aéreos, com o puxador cavado */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={60 + i * 110} y="56" width="110" height="112" {...p} />
          <line x1={72 + i * 110} y1="160" x2={158 + i * 110} y2="160" {...fino} />
        </g>
      ))}
      {/* coifa */}
      <path d="M318 168h84l14 34h-112z" {...p} />
      <line x1="304" y1="196" x2="416" y2="196" {...fino} />
      {/* torre quente: forno e micro-ondas */}
      <rect x="520" y="40" width="120" height="362" {...p} />
      <rect x="534" y="120" width="92" height="64" rx="2" {...fino} />
      <line x1="544" y1="130" x2="616" y2="130" {...fino} />
      <rect x="534" y="200" width="92" height="84" rx="2" {...fino} />
      <line x1="544" y1="212" x2="616" y2="212" {...fino} />
      <line x1="520" y1="104" x2="640" y2="104" {...fino} />
      <line x1="520" y1="300" x2="640" y2="300" {...fino} />
      {/* tampo */}
      <rect x="56" y="258" width="464" height="9" {...p} />
      {/* balcão: gaveteiro e portas */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="60" y={267 + i * 41.6} width="120" height="41.6" {...p} />
          <line x1="100" y1={275 + i * 41.6} x2="140" y2={275 + i * 41.6} {...fino} />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={180 + i * 113.3} y="267" width="113.3" height="124.8" {...p} />
          <line x1={[283, 303, 416.6][i]} y1="276" x2={[283, 303, 416.6][i]} y2="306" {...fino} />
        </g>
      ))}
      {/* rodapé */}
      <rect x="64" y="391.8" width="456" height="10.2" {...fino} />
      <line x1="40" y1="402" x2="660" y2="402" stroke={traco} strokeWidth="1.2" />
      {/* cotas */}
      <g {...cota}>
        <line x1="60" y1="24" x2="640" y2="24" /><line x1="60" y1="17" x2="60" y2="31" /><line x1="640" y1="17" x2="640" y2="31" /><line x1="520" y1="19" x2="520" y2="29" />
        <line x1="676" y1="40" x2="676" y2="402" /><line x1="669" y1="40" x2="683" y2="40" /><line x1="669" y1="402" x2="683" y2="402" />
        <line x1="34" y1="258" x2="34" y2="402" /><line x1="27" y1="258" x2="41" y2="258" /><line x1="27" y1="402" x2="41" y2="402" />
      </g>
      <g fill="#7b6a57" fontSize="14" letterSpacing="1.5" fontFamily="inherit" className="max-md:hidden">
        <text x="290" y="16" textAnchor="middle">2,85 m</text>
        <text x="580" y="16" textAnchor="middle">0,60</text>
        <text x="692" y="221" textAnchor="middle" transform="rotate(90 692 221)">2,40 m</text>
        <text x="24" y="330" textAnchor="middle" transform="rotate(-90 24 330)">0,90</text>
        <text x="60" y="428">ELEVAÇÃO A · ESC. 1:25</text>
      </g>
      {/* pontos de medição */}
      {pontos.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="17" fill="#c2552d" fillOpacity="0.07" stroke="#c2552d" strokeOpacity="0.6" strokeWidth="0.9" />
          <circle cx={x} cy={y} r="4" fill="#c2552d" />
        </g>
      ))}
    </svg>
  )
}
