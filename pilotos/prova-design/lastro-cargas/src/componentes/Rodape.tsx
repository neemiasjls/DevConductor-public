import { creditos, empresa, menu, whatsapp, abertura } from '../data/conteudo'

const fontes = [
  { rotulo: 'Modelo da caixa de ovos', href: 'https://www.innerscene.com/tools/library/3d-parts/twelve-egg-carton-moulded-pulp-open-with-eggs-65dc1d10' },
  { rotulo: 'HDRI empty_warehouse_01', href: 'https://polyhaven.com/a/empty_warehouse_01' },
  {
    rotulo: 'Foto na Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:Entrega_das_obras_de_duplica%C3%A7%C3%A3o_e_restaura%C3%A7%C3%A3o_na_Rodovia_Jo%C3%A3o_Beira_(SP_095)_(53112127313).jpg',
  },
  { rotulo: 'Licença CC BY 2.0', href: 'https://creativecommons.org/licenses/by/2.0/' },
]

export default function Rodape() {
  return (
    <footer className="relative overflow-hidden bg-carvao px-5 pb-8 pt-20 text-papel md:px-10 md:pt-28">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="titulo text-[30px] font-semibold leading-none">
            {empresa.marca}
            <span className="ml-1.5 align-top text-[12px] font-medium uppercase tracking-[0.18em]">{empresa.complemento}</span>
          </p>
          <p className="mt-5 max-w-[34ch] text-[14px] leading-relaxed text-nevoa">
            Transporte rodoviário de carga fechada e fracionada. Base em {empresa.cidade}.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 border border-papel/25 px-3 py-2 text-[12px]">
            <span aria-hidden className="size-2 bg-sinal" />
            {empresa.faixa}. {empresa.aviso}
          </p>
        </div>
        <div className="md:col-span-3">
          <h2 className="text-[12px] uppercase tracking-[0.16em] text-nevoa">Contato</h2>
          <ul className="mt-4 space-y-2 text-[15px]">
            <li><a className="hover:text-sinal" href={whatsapp(abertura.mensagem)}>WhatsApp {empresa.whatsapp}</a></li>
            <li><a className="hover:text-sinal" href={empresa.telefoneLink}>Telefone {empresa.telefone}</a></li>
            <li><a className="hover:text-sinal" href={`mailto:${empresa.email}`}>{empresa.email}</a></li>
          </ul>
          <h2 className="mt-8 text-[12px] uppercase tracking-[0.16em] text-nevoa">Seções</h2>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
            {menu.map((m) => <li key={m.alvo}><a className="hover:text-sinal" href={m.alvo}>{m.rotulo}</a></li>)}
          </ul>
        </div>
        <div className="md:col-span-2">
          <h2 className="text-[12px] uppercase tracking-[0.16em] text-nevoa">Endereço</h2>
          <p className="mt-4 text-[15px] leading-relaxed">{empresa.endereco}<br />{empresa.cidadeCep}</p>
          <h2 className="mt-8 text-[12px] uppercase tracking-[0.16em] text-nevoa">Horário</h2>
          <ul className="mt-4 space-y-1 text-[15px]">
            {empresa.horario.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </div>
        <div className="md:col-span-3">
          <h2 className="text-[12px] uppercase tracking-[0.16em] text-nevoa">Créditos</h2>
          <ul className="mt-4 space-y-3 text-[13px] leading-snug">
            {creditos.map((c) => (
              <li key={c.item}>
                <span className="text-papel">{c.item}</span>
                <span className="block text-nevoa">{c.autor}, {c.licenca}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-nevoa">
            {fontes.map((f) => (
              <li key={f.href}>
                <a className="underline underline-offset-4 hover:text-papel" href={f.href} target="_blank" rel="noreferrer">{f.rotulo}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p aria-hidden className="numeros mt-20 whitespace-nowrap font-texto text-[11.6vw] font-light leading-none tracking-[-0.04em] text-carvao-3 md:mt-28">
        {empresa.coordenadas}
      </p>
      <div className="mt-6 flex flex-col gap-2 border-t border-papel/15 pt-5 text-[12px] text-nevoa sm:flex-row sm:justify-between">
        <p>Site de demonstração de design. Nenhum serviço real é oferecido.</p>
        <p className="numeros">{empresa.coordenadas}, {empresa.cidade}</p>
      </div>
    </footer>
  )
}
