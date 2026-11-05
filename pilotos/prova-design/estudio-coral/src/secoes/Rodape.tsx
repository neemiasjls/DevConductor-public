import { contato, creditos, linkWhats, marca, menu, rodape } from '../data/conteudo'

export function Rodape() {
  return (
    <footer className="sobre-escuro overflow-hidden bg-tinta px-[var(--margem)] pb-10 pt-[8svh] text-papel">
      <p aria-hidden="true" className="titulo whitespace-nowrap text-[15.6vw] leading-[0.8] text-coral md:text-[16vw]">{marca.nome}</p>
      <div className="mt-10 grid gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-4">
          <p className="titulo text-[34px] md:text-[40px]">{rodape.frase}</p>
          <a href={linkWhats()} className="pilula mt-5 bg-coral text-[15px] text-tinta">WhatsApp (31) 90000-0000</a>
          <p className="mt-3 text-[13px] text-papel/70">Número fictício, só para a demonstração.</p>
        </div>
        <dl className="grid gap-6 sm:grid-cols-3 md:col-span-5">
          {contato.info.map((b) => (
            <div key={b.titulo}>
              <dt className="text-[13px] font-semibold uppercase tracking-[0.14em] text-coral">{b.titulo}</dt>
              {b.linhas.map((l) => <dd key={l} className="mt-1 text-[15px] leading-snug">{l}</dd>)}
            </div>
          ))}
        </dl>
        <nav aria-label="Rodapé" className="md:col-span-3">
          <ul className="grid gap-2 text-[16px]">
            {menu.map((m) => <li key={m.alvo}><a className="underline-offset-4 hover:underline" href={m.alvo}>{m.rotulo}</a></li>)}
            <li><a className="underline-offset-4 hover:underline" href="#contato">Contato</a></li>
          </ul>
        </nav>
      </div>
      <div className="mt-12 border-t border-papel/25 pt-6 text-[13px] leading-relaxed text-papel/75">
        <p className="font-semibold text-papel">Créditos das fotos (Wikimedia Commons)</p>
        <ul className="mt-2 grid gap-1 md:grid-cols-2 md:gap-x-8">
          {creditos.map((c) => (
            <li key={c.pagina}>
              {c.foto}: <a className="underline underline-offset-2 hover:text-papel" href={c.pagina} rel="noopener">{c.autor}</a>,{' '}
              <a className="underline underline-offset-2 hover:text-papel" href={c.licencaUrl} rel="license noopener">{c.licenca}</a>
            </li>
          ))}
        </ul>
        <p className="mt-3">{rodape.notaFotos}</p>
        <p className="mt-3 font-semibold text-papel">{marca.aviso}</p>
      </div>
    </footer>
  )
}
