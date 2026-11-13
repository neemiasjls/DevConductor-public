import { historia } from '../data/conteudo'
import Foto from '../componentes/Foto'

// Da base (seção 6): fundo escuro com veio, texto à esquerda com duas assinaturas,
// foto quadrada em preto e branco à direita.
export default function Historia() {
  return (
    <section id="sobre" data-leitura className="relative z-10 overflow-hidden bg-[#1b1613] pb-[9svh] pt-28 md:pt-[max(17svh,9.5rem)] md:pb-[11svh]">
      <Foto nome="fundo-escuro" alt="" loading="lazy" sizes="100vw" className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover md:block" />
      <Foto nome="fundo-escuro-pe" alt="" loading="lazy" sizes="100vw" className="pointer-events-none absolute inset-0 h-full w-full object-cover md:hidden" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/20" />
      <div className="relative mx-auto grid w-full max-w-[1600px] gap-x-10 gap-y-7 px-5 md:grid-cols-[1fr_41.7vw] md:gap-x-[8vw] md:gap-y-8 md:pl-[10.8vw] md:pr-[5.55vw]">
        <h2 className="titulo text-[clamp(1.6rem,3.4vw,3rem)] text-white md:self-end">
          {historia.titulo[0]}<br />{historia.titulo[1]}
        </h2>
        <div className="max-md:order-3 md:self-start">
          <div className="max-w-[440px] space-y-4 text-[17px] leading-[1.4] text-white">
            {historia.textos.map((t) => <p key={t}>{t}</p>)}
          </div>
          <ul className="mt-9 grid grid-cols-2 gap-x-5 md:flex md:gap-x-14">
            {historia.assinaturas.map((a) => (
              <li key={a.nome} className="max-w-[190px]">
                <span aria-hidden className="assinatura block text-[30px] leading-none text-white md:text-[34px]">{a.nome}</span>
                <span className="mt-2 block text-[16px] leading-tight text-white/75">{a.papel}</span>
              </li>
            ))}
          </ul>
        </div>
        <Foto nome={historia.foto.nome} alt={historia.foto.alt} loading="lazy" sizes="(min-width: 768px) 42vw, 92vw" className="aspect-square w-full max-w-[640px] justify-self-end rounded-[6px] md:col-start-2 md:row-span-2 md:row-start-1 object-cover grayscale contrast-[1.08]" />
      </div>
    </section>
  )
}
