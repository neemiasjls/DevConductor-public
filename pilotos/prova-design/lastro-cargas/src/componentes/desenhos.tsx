import { useId } from 'react'

// Desenhos técnicos da carreta, em centímetros (1 unidade = 1 cm), cor chapada.
// Cavalo 6x2 cara-chata + semirreboque sider de 3 eixos: 18,5 m de comprimento, 3,9 m de altura.
const limpar = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '')

const RODAS = [1715, 1420, 1290, 445, 320, 195]
const RAIO = 52
export const RODA_PROPORCAO = RAIO / 1880 // raio da roda em relação à largura do desenho

export function CarretaPerfil({ fundo, rotulo, className }: { fundo: string; rotulo: string; className?: string }) {
  const id = limpar(useId())
  return (
    <svg viewBox="0 0 1880 400" className={className} role="img" aria-label={rotulo}>
      <defs>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="1880" height="400">
          <g fill="white">
            {/* semirreboque com lona (sider) */}
            <rect x="15" y="12" width="1480" height="258" rx="4" />
            <rect x="15" y="268" width="1480" height="20" />
            {/* para-lamas, protetor lateral e para-choque traseiro */}
            <rect x="120" y="286" width="400" height="14" rx="3" />
            <rect x="590" y="300" width="520" height="7" />
            <rect x="22" y="288" width="14" height="60" />
            <rect x="10" y="338" width="70" height="12" rx="2" />
            {/* pé de apoio */}
            <rect x="1146" y="286" width="12" height="72" />
            <rect x="1130" y="354" width="44" height="8" rx="2" />
            {/* chassi do cavalo, quinta roda e tanque */}
            <rect x="1190" y="288" width="560" height="30" />
            <rect x="1300" y="272" width="170" height="18" rx="3" />
            <rect x="1492" y="296" width="132" height="48" rx="22" />
            {/* defletor lateral e cabine */}
            <rect x="1604" y="40" width="30" height="236" rx="4" />
            <path d="M1632 300 L1632 52 Q1634 24 1662 22 L1830 22 Q1854 24 1857 52 L1862 300 Z" />
            <rect x="1790" y="296" width="74" height="40" rx="5" />
            {/* retrovisor */}
            <rect x="1862" y="62" width="12" height="62" rx="4" />
            <rect x="1855" y="76" width="9" height="5" />
          </g>
          <g fill="black">
            {RODAS.map((cx) => <circle key={cx} cx={cx} cy={348} r={60} />)}
            <path d="M1704 150 L1704 66 Q1706 56 1716 56 L1800 56 L1834 150 Z" />
            <path d="M1843 58 L1851 58 L1856 150 L1847 150 Z" />
          </g>
          <g fill="none" stroke="black">
            {Array.from({ length: 11 }, (_, i) => (
              <line key={i} x1={15 + 123 * (i + 1)} y1={32} x2={15 + 123 * (i + 1)} y2={262} strokeWidth={4} />
            ))}
            <line x1="15" y1="31" x2="1495" y2="31" strokeWidth={3} />
            <line x1="15" y1="266" x2="1495" y2="266" strokeWidth={3} />
            <path d="M1692 296 L1692 54 Q1692 46 1700 46 L1836 46" strokeWidth={4} />
            <line x1="1632" y1="214" x2="1862" y2="214" strokeWidth={3} />
          </g>
        </mask>
      </defs>
      <rect x="0" y="0" width="1880" height="400" fill="currentColor" mask={`url(#${id}m)`} />
      {RODAS.map((cx) => (
        <g key={cx} data-roda>
          <circle cx={cx} cy={348} r={RAIO} fill="currentColor" />
          <circle cx={cx} cy={348} r={30} fill={fundo} />
          <circle cx={cx} cy={348} r={22} fill="currentColor" />
          {[0, 1, 2, 3, 4, 5].map((n) => {
            const a = (n * Math.PI) / 3
            return <circle key={n} cx={cx + Math.cos(a) * 14} cy={348 + Math.sin(a) * 14} r={3.2} fill={fundo} />
          })}
          <circle cx={cx} cy={348} r={6} fill={fundo} />
        </g>
      ))}
    </svg>
  )
}

// Vista de cima (celular): frente para baixo, a carreta desce a linha.
export function CarretaCima({ rotulo, className }: { rotulo: string; className?: string }) {
  const id = limpar(useId())
  return (
    <svg viewBox="0 0 280 1880" className={className} role="img" aria-label={rotulo}>
      <defs>
        <mask id={`${id}c`} maskUnits="userSpaceOnUse" x="0" y="0" width="280" height="1880">
          <g fill="white">
            <rect x="10" y="0" width="260" height="1480" rx="4" />
            <rect x="96" y="1470" width="88" height="160" />
            <rect x="14" y="1612" width="252" height="236" rx="20" />
            <rect x="0" y="1792" width="14" height="36" rx="3" />
            <rect x="266" y="1792" width="14" height="36" rx="3" />
          </g>
          <g fill="none" stroke="black">
            {Array.from({ length: 11 }, (_, i) => (
              <line key={i} x1={20} y1={123 * (i + 1)} x2={260} y2={123 * (i + 1)} strokeWidth={6} />
            ))}
            <path d="M46 1642 L234 1642 L220 1768 L60 1768 Z" strokeWidth={8} />
            <line x1="28" y1="1818" x2="252" y2="1818" strokeWidth={10} />
          </g>
        </mask>
      </defs>
      <rect x="0" y="0" width="280" height="1880" fill="currentColor" mask={`url(#${id}c)`} />
    </svg>
  )
}

export function IconeWhatsapp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="currentColor">
      <path d="M16.04 4C9.4 4 4 9.38 4 16c0 2.12.56 4.18 1.62 6L4 28l6.18-1.6A12 12 0 0 0 16.04 28C22.66 28 28 22.62 28 16S22.66 4 16.04 4Zm0 21.9c-1.8 0-3.56-.48-5.1-1.4l-.36-.22-3.66.96.98-3.56-.24-.38A9.86 9.86 0 0 1 6.12 16c0-5.46 4.46-9.9 9.92-9.9 5.46 0 9.9 4.44 9.9 9.9 0 5.46-4.44 9.9-9.9 9.9Zm5.44-7.4c-.3-.16-1.76-.86-2.04-.96-.26-.1-.46-.16-.66.14-.2.3-.76.96-.94 1.16-.16.2-.34.22-.64.08-.3-.16-1.26-.46-2.4-1.48-.88-.8-1.48-1.76-1.66-2.06-.18-.3 0-.46.14-.6.12-.14.3-.36.44-.52.16-.18.2-.3.3-.5.1-.2.06-.38-.02-.52-.08-.16-.66-1.6-.92-2.18-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.52.08-.8.38-.26.3-1.04 1.02-1.04 2.48s1.06 2.88 1.22 3.08c.14.2 2.08 3.18 5.04 4.46.7.3 1.26.48 1.68.62.7.22 1.36.2 1.86.12.58-.08 1.76-.72 2-1.42.26-.7.26-1.3.18-1.42-.08-.12-.28-.2-.58-.34Z" />
    </svg>
  )
}
