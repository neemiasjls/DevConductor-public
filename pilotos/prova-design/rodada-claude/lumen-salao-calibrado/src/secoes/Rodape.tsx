import { agendar, alteracoes, creditos, marca, menu } from '../data/conteudo'

export function Rodape() {
  return (
    <footer className="sobre-escuro bg-petroleo px-[var(--margem)] pb-28 pt-14 text-[14px] text-claro/80 md:pb-14">
      <div className="grid gap-10 md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-4">
          <p className="titulo text-[30px] text-claro">{marca.completo}</p>
          <p className="mt-2">{marca.oque} · {marca.cidade}</p>
          <p className="rotulo mt-6 text-claro">{marca.aviso}</p>
          <p className="mt-2 max-w-[40ch]">{marca.avisoLongo}</p>
          <nav aria-label="Rodapé" className="mt-6">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {menu.map((i) => <li key={i.alvo}><a href={i.alvo} className="alvo link-fino">{i.rotulo}</a></li>)}
              <li><a href="#agendar" className="alvo link-fino">Agendar</a></li>
            </ul>
          </nav>
        </div>
        <div className="md:col-span-3" id="contato">
          <dl className="grid gap-5 text-[15px]">
            <div>
              <dt className="rotulo text-claro/80">Telefone</dt>
              <dd className="m-0 mt-2"><a href={agendar.contatos.telefoneLink} className="alvo link-fino">{agendar.contatos.telefone}</a> <span className="text-claro/80">(fictício)</span></dd>
            </div>
            <div>
              <dt className="rotulo text-claro/80">Instagram</dt>
              <dd className="m-0 mt-2">{agendar.contatos.instagram} <span className="text-claro/80">(fictício)</span></dd>
            </div>
            <div>
              <dt className="rotulo text-claro/80">Endereço</dt>
              <dd className="m-0 mt-2">{agendar.contatos.endereco} <span className="text-claro/80">(de demonstração)</span><br />
                <a href={agendar.contatos.mapa} className="alvo link-fino mt-1">Ver a região no mapa</a></dd>
            </div>
            <div>
              <dt className="rotulo text-claro/80">Horários</dt>
              <dd className="m-0 mt-2">
                <ul>{agendar.horarios.map((h) => <li key={h.dias}>{h.dias}: {h.horas}</li>)}</ul>
              </dd>
            </div>
          </dl>
        </div>
        <div className="md:col-span-5" id="creditos">
          <p className="rotulo text-claro">{marca.aviso} · créditos das fotos</p>
          <ul className="mt-3 grid gap-2.5">
            {creditos.map((c) => (
              <li key={c.foto}>
                {c.foto}: <a href={c.origem} className="alvo link-fino">{c.autor}</a>, <a href={c.licencaUrl} className="alvo link-fino">{c.licenca}</a>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-[70ch]">{alteracoes}</p>
          <p className="mt-3">Fontes: Gloock, Bodoni Moda e Familjen Grotesk (SIL OFL 1.1).</p>
        </div>
      </div>
    </footer>
  )
}
