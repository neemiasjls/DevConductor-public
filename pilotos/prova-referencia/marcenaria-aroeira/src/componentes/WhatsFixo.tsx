import { useEffect, useState } from 'react'
import { abertura, whats } from '../data/conteudo'
import IconeWhats from './IconeWhats'

// Orçamento sempre à mão.
// Computador: botão no canto, que encolhe para o ícone depois da abertura.
// Celular: barra inteira no pé da tela (um botão redondo flutuando tapava legenda e fim de parágrafo);
// aparece depois da abertura, que já tem o próprio botão.
// Nos dois, some enquanto o botão da chamada final está na tela (sempre um, e só um, pedido à mão).
export default function WhatsFixo() {
  const [compacto, setCompacto] = useState(false)
  const [oculto, setOculto] = useState(false)

  useEffect(() => {
    const aoRolar = () => setCompacto(window.scrollY > window.innerHeight * 0.9)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })

    const visiveis = new Set<Element>()
    const olho = new IntersectionObserver((entradas) => {
      for (const e of entradas) e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target)
      setOculto(visiveis.size > 0)
    }, { threshold: 0.6, rootMargin: '-90px 0px 0px 0px' })
    document.querySelectorAll('#chamada a').forEach((el) => olho.observe(el))

    return () => {
      window.removeEventListener('scroll', aoRolar)
      olho.disconnect()
    }
  }, [])

  const some = 'pointer-events-none invisible translate-y-3 opacity-0'
  return (
    <a
      href={whats(abertura.msg)}
      target="_blank"
      rel="noopener"
      aria-label="Orçamento no WhatsApp"
      aria-hidden={oculto || undefined}
      tabIndex={oculto ? -1 : undefined}
      className={`group fixed z-40 flex items-center text-[14px] font-medium transition-[opacity,transform,visibility] duration-300
        max-md:inset-x-0 max-md:bottom-0 max-md:h-[calc(46px+env(safe-area-inset-bottom))] max-md:justify-center max-md:gap-2 max-md:border-t max-md:border-white/10 max-md:bg-[#0d0806]/95 max-md:pb-[env(safe-area-inset-bottom)] max-md:text-creme max-md:backdrop-blur
        md:bottom-6 md:right-6 md:rounded-full md:bg-creme md:p-3 md:text-cerne md:shadow-[0_8px_30px_rgb(0_0_0/0.35)] md:hover:-translate-y-0.5
        ${oculto ? some : compacto ? '' : 'max-md:pointer-events-none max-md:invisible max-md:translate-y-3 max-md:opacity-0'}`}
    >
      <IconeWhats className="h-5 w-5 shrink-0" />
      <span aria-hidden className="text-[13px] uppercase tracking-[0.08em] md:hidden">Orçamento no WhatsApp</span>
      <span
        aria-hidden
        className={`hidden overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity] duration-300 md:block ${compacto ? 'max-w-0 opacity-0 group-hover:ml-2 group-hover:max-w-[200px] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[200px] group-focus-visible:opacity-100' : 'ml-2 mr-1 max-w-[200px]'}`}
      >
        Orçamento no WhatsApp
      </span>
    </a>
  )
}
