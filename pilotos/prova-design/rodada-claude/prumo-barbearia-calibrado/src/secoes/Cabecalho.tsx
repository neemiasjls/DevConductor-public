import { abertura, marca, navegacao, whatsapp } from '../data/conteudo'

// Marca: um prumo (fio com peso) desenhado como régua vertical; só texto e traço, sem logotipo inventado.
export function Marca({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 14 24" aria-hidden className="h-[22px] w-[13px] text-cobre">
        <path d="M7 1v15M3 4h4M5 7h2M3 10h4M5 13h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M7 16l4 3.5L7 23l-4-3.5z" fill="currentColor" />
      </svg>
      <span className="titulo text-[20px] tracking-[-0.01em]">{marca}</span>
    </span>
  )
}

export default function Cabecalho() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-giz/10 bg-grafite/90">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-6 px-5 md:px-[5vw]">
        <a href="#conteudo" aria-label={`${marca} Barbearia, início`} className="inline-flex min-h-[44px] items-center">
          <Marca />
        </a>
        <nav aria-label="Seções" className="hidden md:block">
          <ul className="flex items-center gap-7 text-[14px] text-giz/80">
            {navegacao.map((n) => (
              <li key={n.href}><a href={n.href} className="inline-flex min-h-[44px] items-center transition-colors hover:text-cobre">{n.rotulo}</a></li>
            ))}
          </ul>
        </nav>
        <a href={whatsapp(abertura.mensagem)} className="inline-flex h-10 items-center rounded-full border border-cobre/60 px-4 text-[14px] font-semibold text-cobre transition-colors hover:bg-cobre hover:text-tinta min-h-[44px]">
          Agendar
        </a>
      </div>
    </header>
  )
}
