import { useEffect, useRef, useState } from 'react'
import { marca, menu, abertura, whats } from '../data/conteudo'

export default function Cabecalho() {
  const [aberto, setAberto] = useState(false)
  const [recolhido, setRecolhido] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  // Depois da abertura o menu sai ao rolar para baixo (não cobre título nem foto) e volta ao rolar para cima.
  useEffect(() => {
    let antes = window.scrollY
    const aoRolar = () => {
      const y = window.scrollY
      if (Math.abs(y - antes) < 6) return
      setRecolhido(y > antes && y > window.innerHeight * 0.6)
      antes = y
    }
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])
  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAberto(false); botao.current?.focus() } }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberto])
  return (
    <header className={`fixed inset-x-0 top-3 z-40 flex justify-center px-4 transition-transform duration-500 focus-within:translate-y-0 md:top-4 ${recolhido && !aberto ? '-translate-y-[130%]' : ''}`}>
      <nav aria-label="Principal" className="relative flex h-14 w-full max-w-[686px] items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d0806]/95 pl-5 pr-1.5 backdrop-blur md:gap-6 md:pl-6">
        <a href="#inicio" className="titulo inline-flex min-h-11 items-center text-[22px] tracking-[0.04em] md:text-[26px]" aria-label={`${marca.nome}, início`}>
          {marca.nome}
        </a>
        <ul className="hidden items-center gap-3 text-[17px] md:flex">
          {menu.map((m, i) => (
            <li key={m.href}><a href={m.href} className={i === 0 ? 'inline-flex min-h-11 min-w-11 items-center justify-center text-white/45' : 'inline-flex min-h-11 min-w-11 items-center justify-center text-white hover:text-areia'}>{m.rotulo}</a></li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a
            href={whats(abertura.msg)}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center rounded-md border border-white/35 px-3.5 text-[13px] uppercase tracking-[0.02em] text-white transition-colors hover:bg-white hover:text-tinta md:px-4 md:text-[15px]"
          >
            Orçamento
          </a>
          <button
            ref={botao}
            type="button"
            aria-expanded={aberto}
            aria-controls="menu-celular"
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setAberto(!aberto)}
            className="grid h-11 w-11 place-items-center md:hidden"
          >
            <span aria-hidden className="relative block h-3 w-5">
              <span className={`absolute inset-x-0 top-0 h-px bg-white transition-transform duration-300 ${aberto ? 'translate-y-[5.5px] rotate-45' : ''}`} />
              <span className={`absolute inset-x-0 bottom-0 h-px bg-white transition-transform duration-300 ${aberto ? '-translate-y-[5.5px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
        <ul
          id="menu-celular"
          hidden={!aberto}
          className="absolute inset-x-0 top-[calc(100%+6px)] rounded-lg border border-white/10 bg-[#0d0806]/95 px-5 py-2 text-[17px] backdrop-blur md:hidden"
        >
          {menu.map((m) => (
            <li key={m.href} className="border-b border-white/10 last:border-0">
              <a href={m.href} onClick={() => setAberto(false)} className="flex min-h-12 items-center text-white">{m.rotulo}</a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
