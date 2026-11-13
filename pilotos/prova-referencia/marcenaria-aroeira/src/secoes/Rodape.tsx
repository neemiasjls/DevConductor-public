import { marca, menu, rodape, abertura, whats } from '../data/conteudo'

// Da base: fundo quase preto, marca e frase à esquerda, três colunas à direita, marca em relevo embaixo.
export default function Rodape() {
  const col = 'mb-4 text-[17px] text-cinza'
  return (
    <footer id="contato" className="relative overflow-hidden bg-tinta pt-[8svh]">
      <div className="grid grid-cols-[auto_1fr] gap-x-10 gap-y-9 px-5 md:grid-cols-[1fr_repeat(2,minmax(0,19vw))] md:gap-x-[4vw] md:px-20">
        <div className="max-md:col-span-2">
          <p className="titulo text-[28px] leading-none text-white">{marca.nome}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.5em] text-white/70">{marca.sub}</p>
          <p className="mt-7 max-w-[330px] text-[17px] leading-snug text-white/75">{rodape.frase}</p>
        </div>
        <nav aria-label="Rodapé">
          <p className={col.replace("mb-4", "mb-2")}>Menu</p>
          <ul className="text-[17px]">{menu.map((m) => <li key={m.href}><a href={m.href} className="inline-flex min-h-11 min-w-11 items-center hover:text-areia">{m.rotulo}</a></li>)}</ul>
        </nav>
        <div className="max-md:col-span-2">
          <p className={col.replace("mb-4", "mb-2")}>Contato</p>
          <ul className="text-[17px]">
            {rodape.contato.map((c) => (
              <li key={c.rotulo} className="flex min-h-11 items-center leading-snug max-md:text-[16px]">{c.href === 'whats' ? <a href={whats(abertura.msg)} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center underline decoration-white/30 underline-offset-4 hover:text-areia">{c.rotulo}</a> : c.rotulo}</li>
            ))}
            {rodape.social.map((s) => <li key={s.rotulo} className="flex min-h-11 items-center leading-snug max-md:text-[16px]">{s.rotulo}</li>)}
          </ul>
        </div>
      </div>
      <svg aria-hidden viewBox="0 0 1000 178" className="mb-[3svh] mt-[5svh] block w-full select-none">
        <text x="500" y="160" textAnchor="middle" textLength="900" lengthAdjust="spacing" fontFamily="Bodoni Moda, serif" fontSize="172" fill="#0f0f0f" stroke="rgb(255 255 255 / 0.46)" strokeWidth="1.6" paintOrder="stroke" strokeLinejoin="round">{marca.nome.toUpperCase()}</text>
      </svg>
      <div className="flex flex-col gap-1 border-t border-white/5 px-5 py-5 text-[13px] text-white/60 max-md:pb-[76px] md:flex-row md:justify-between md:pl-20 md:pr-28">
        <span>© 2026 Marcenaria Aroeira</span>
        <span>{rodape.aviso}</span>
      </div>
    </footer>
  )
}
