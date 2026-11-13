import { useEffect, useRef, useState } from 'react'
import { ambientes, whats } from '../data/conteudo'
import Foto from '../componentes/Foto'

// Da base: fundo preto, título no canto, régua e faixa corrida de cartões altos (anda sozinha).
export default function Ambientes() {
  const n = ambientes.itens.length
  const lista = [...ambientes.itens, ...ambientes.itens]
  const trilho = useRef<HTMLDivElement>(null)
  const [ativo, setAtivo] = useState(1)
  // No celular a faixa é de arrastar: começa no segundo cartão, com a borda dos vizinhos à vista.
    useEffect(() => {
    const t = trilho.current
    if (!t || window.innerWidth >= 768) return
    const itens = [...t.querySelectorAll('li')].slice(0, n)
    const item = itens[1]
    if (item) t.scrollLeft = item.offsetLeft - (t.clientWidth - item.offsetWidth) / 2
    const olho = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) setAtivo(itens.indexOf(e.target as HTMLLIElement))
    }, { root: t, threshold: 0.8 })
    itens.forEach((el) => olho.observe(el))
    return () => olho.disconnect()
  }, [n])
  // Celular: setas ao lado do contador, para quem não percebe que a faixa arrasta.
  const andar = (d: number) => {
    const t = trilho.current
    const item = t?.querySelector('li')
    if (t && item) t.scrollBy({ left: d * (item.offsetWidth + 16), behavior: 'smooth' })
  }
  const seta = 'grid size-11 place-items-center rounded-full border border-white/25 text-[18px] text-white/85 disabled:opacity-30'
  return (
    <section id="ambientes" data-leitura className="relative z-10 bg-[#0b0806] pb-[6svh] pt-24 md:pt-[max(10svh,6rem)]">
      <div className="px-5 md:px-20">
        <h2 className="titulo text-[clamp(1.6rem,3.4vw,3rem)] text-white">
          {ambientes.titulo[0]}<br />{ambientes.titulo[1]}
        </h2>
      </div>

      <div ref={trilho} className="mt-[5svh] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:snap-none md:motion-safe:overflow-hidden md:[mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent)]">
        <ul className="faixa flex w-max gap-4 px-[14vw] md:gap-[33px] md:px-0">
          {lista.map((a, i) => (
            <li key={i} aria-hidden={i >= n || undefined} className={`w-[72vw] shrink-0 snap-center md:w-[212px] ${i >= n ? 'max-md:hidden' : ''}`}>
              <div className="regua mb-3" />
              <a href={whats(a.msg)} target="_blank" rel="noopener" tabIndex={i >= n ? -1 : undefined} className="group block">
                <Foto nome={a.foto} alt={`${a.rotulo} (foto ilustrativa)`} sizes="(min-width: 768px) 600px, 110vw" className="tom-unico aspect-[4/5] w-full rounded-[4px] object-cover md:aspect-auto md:h-[min(400px,44svh)]" />
                <span className="block max-md:hidden">
                  <span className="mt-4 block text-center text-[15px] uppercase tracking-[0.1em] text-white/85">{a.rotulo}</span>
                  <span className="mt-1 block text-center text-[15px] leading-snug text-cinza">{a.texto}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      {/* Celular: uma legenda só, a do cartão do meio (a dos vizinhos sairia cortada na borda da tela). */}
      <p aria-live="polite" className="mt-4 px-5 text-center md:hidden">
        <span className="block text-[15px] uppercase tracking-[0.1em] text-white/85">{ambientes.itens[ativo]?.rotulo}</span>
        <span className="mt-1 block text-[16px] leading-snug text-cinza">{ambientes.itens[ativo]?.texto}</span>
      </p>
      <div className="mt-3 flex items-center justify-center gap-5 md:hidden">
        <button type="button" aria-label="Ambiente anterior" disabled={ativo <= 0} onClick={() => andar(-1)} className={seta}>←</button>
        <span className="text-[13px] tracking-[0.14em] text-white/70">{ativo + 1} / {n}</span>
        <button type="button" aria-label="Próximo ambiente" disabled={ativo >= n - 1} onClick={() => andar(1)} className={seta}>→</button>
      </div>
      <p className="mt-4 px-5 text-center text-cinza md:mt-6 md:px-20 md:text-left"><small className="text-[12px] md:text-[13px]">{ambientes.nota}</small></p>
    </section>
  )
}
