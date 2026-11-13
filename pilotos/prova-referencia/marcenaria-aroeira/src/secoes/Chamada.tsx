import { chamada, abertura, whats } from '../data/conteudo'
import Foto from '../componentes/Foto'

// Da base (seção 7): faixa clara com textura, emblema, título em baixo-relevo e botão escuro.
export default function Chamada() {
  return (
    <section id="chamada" data-leitura className="relative z-10 grid min-h-[50svh] place-items-center overflow-hidden bg-[#e6d9cd] px-5 pb-[9svh] pt-[max(13svh,7rem)] text-center md:min-h-[66svh]">
      <Foto nome="fundo-claro" alt="" loading="lazy" sizes="(max-width: 767px) 230vw, 100vw" className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative flex flex-col items-center">
        <span aria-hidden className="mb-6 grid h-12 w-10 place-items-center rounded-full border border-[#6f675f] font-[family-name:var(--font-titulo)] text-[22px] text-[#6f675f]">A</span>
        <h2 className="titulo gravado text-[clamp(1.6rem,3.4vw,3rem)]">
          {chamada.titulo[0]}<br />{chamada.titulo[1]}
        </h2>
        <a href={whats(abertura.msg)} target="_blank" rel="noopener" className="mt-8 inline-flex min-h-11 items-center rounded-md bg-tinta px-4 text-[15px] uppercase text-white outline outline-1 outline-offset-[3px] outline-tinta/35 transition-colors hover:bg-cerne">
          {chamada.botao}
        </a>
      </div>
    </section>
  )
}
