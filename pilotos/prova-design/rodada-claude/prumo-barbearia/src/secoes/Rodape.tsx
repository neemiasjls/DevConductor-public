import { Marca } from './Cabecalho'
import { abertura, rodape, telefone, whatsapp } from '../data/conteudo'

export default function Rodape() {
  return (
    <footer className="bg-grafite text-[14px]">
      <div className="mx-auto max-w-[1360px] px-5 pb-10 pt-16 md:px-[5vw]">
        <p className="dado mb-10 inline-block rounded-[4px] border border-cobre/40 px-3 py-2 text-[11px] text-cobre">{rodape.aviso}</p>
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Marca />
            <p className="mt-4 max-w-[34ch] leading-relaxed text-nevoa">Barbearia de corte técnico: degradê, navalhado e barba com toalha quente.</p>
          </div>
          <div className="md:col-span-3">
            <h2 className="dado text-[11px] uppercase tracking-[0.12em] text-nevoa">Onde</h2>
            <address className="mt-3 not-italic leading-relaxed">{rodape.endereco.map((l) => <span key={l} className="block">{l}</span>)}</address>
            <a href={rodape.mapa} className="mt-2 inline-flex min-h-[44px] items-center text-cobre underline-offset-4 hover:underline">{rodape.mapaRotulo}</a>
          </div>
          <div className="md:col-span-3">
            <h2 className="dado text-[11px] uppercase tracking-[0.12em] text-nevoa">Contato</h2>
            <ul className="mt-3 grid gap-1">
              <li><a href={whatsapp(abertura.mensagem)} className="inline-flex min-h-[44px] items-center hover:text-cobre">WhatsApp {telefone}</a></li>
              <li><a href={`tel:${telefone.replace(/[^+\d]/g, '')}`} className="inline-flex min-h-[44px] items-center hover:text-cobre">Telefone {telefone}</a></li>
              <li><a href={rodape.instagram} className="inline-flex min-h-[44px] items-center hover:text-cobre">Instagram {rodape.instagramRotulo}</a></li>
              <li><a href={`mailto:${rodape.email}`} className="inline-flex min-h-[44px] items-center hover:text-cobre">{rodape.email}</a></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h2 className="dado text-[11px] uppercase tracking-[0.12em] text-nevoa">Horário</h2>
            <p className="mt-3 leading-relaxed">{rodape.horarioCurto}</p>
          </div>
        </div>

        <div className="mt-14 border-t border-giz/10 pt-6">
          <p className="dado text-[11px] text-nevoa">Empresa fictícia · demonstração — créditos</p>
          <ul className="mt-3 grid gap-2 text-[12px] leading-relaxed text-nevoa md:grid-cols-2">
            {rodape.creditos.map((c) => (
              <li key={c.peca}>
                <a href={c.url} className="inline-flex min-h-[44px] items-center text-giz underline-offset-4 hover:underline">{c.peca}</a>, {c.autor},{' '}
                {c.licencaUrl ? <a href={c.licencaUrl} className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline">{c.licenca}</a> : c.licenca} — {c.alteracao}.
              </li>
            ))}
            <li>Fontes Funnel Display, Commissioner e Martian Mono, SIL Open Font License 1.1.</li> {/* taste-skill-ignore: crédito da fonte, não uso de monoespaçada */}
          </ul>
        </div>
      </div>
    </footer>
  )
}
