import { useEffect, useState } from 'react'
import { abertura, empresa, menu, whatsapp } from '../data/conteudo'

// Faixa de demonstração no topo (some ao rolar; o aviso volta no rodapé) e menu fixo em "diferença",
// que lê tanto sobre o palco escuro quanto sobre as seções claras.
export default function Cabecalho() {
  const [rolou, marcar] = useState(false)
  useEffect(() => {
    const aoRolar = () => marcar(window.scrollY > 40)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])
  const desce = rolou ? 'translate-y-0' : 'translate-y-8'

  return (
    <>
      <p
        className={`fixed inset-x-0 top-0 z-50 flex h-8 items-center justify-center gap-2 bg-papel px-4 text-center text-[12px] text-tinta transition-[translate] duration-500 ease-entra ${
          rolou ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <span aria-hidden className="size-2 shrink-0 bg-sinal" />
        <span>
          <strong className="font-medium">{empresa.faixa}.</strong>{' '}
          <span className="hidden sm:inline">{empresa.aviso}</span>
        </span>
      </p>

      <header
        className={`pointer-events-none fixed inset-x-0 top-0 z-40 text-white mix-blend-difference transition-[translate] duration-500 ease-entra ${desce}`}
      >
        <div className="flex h-16 items-center justify-between px-5 md:h-20 md:px-10">
          <a href="#carga" className="pointer-events-auto titulo text-[22px] font-semibold leading-none md:text-[24px]" aria-label={`${empresa.nome}, início`}>
            {empresa.marca}
            <span className="ml-1.5 align-top text-[11px] font-medium uppercase tracking-[0.18em]">{empresa.complemento}</span>
          </a>
          <nav aria-label="Seções" className="pointer-events-auto mr-[150px] hidden gap-8 text-[14px] md:flex">
            {menu.map((m) => (
              <a key={m.alvo} href={m.alvo} className="opacity-80 transition-opacity hover:opacity-100">
                {m.rotulo}
              </a>
            ))}
          </nav>
        </div>
        <nav aria-label="Seções no celular" className="pointer-events-auto flex justify-center gap-6 border-t border-white/20 px-5 text-[13px] md:hidden">
          {menu.slice(1).map((m) => <a key={m.alvo} href={m.alvo} className="inline-flex min-h-11 items-center">{m.rotulo}</a>)}
        </nav>
      </header>

      <a
        href={whatsapp(abertura.mensagem)}
        className={`fixed right-5 top-3 z-40 inline-flex h-10 items-center rounded-full bg-sinal px-4 text-[14px] font-medium text-tinta transition-[translate] duration-500 ease-entra md:right-10 md:top-5 md:h-11 md:px-5 ${desce}`}
      >
        {abertura.botao}
      </a>
    </>
  )
}
