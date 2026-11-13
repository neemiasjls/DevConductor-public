import { oficio } from '../data/conteudo'
import Foto from '../componentes/Foto'
import Elevacao from './Elevacao'

// Da base (seção 3): fundo claro com faixas de luz que se movem devagar, título no canto,
// um cartão grande com desenho marcado e dois cartões de texto com foto embaixo.
export default function Oficio() {
  const cartao = 'overflow-hidden rounded-[6px] bg-[#fbf7ee]/90 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset]'
  return (
    <section id="oficio" data-leitura className="relative z-10 overflow-hidden bg-[#f2e8d4] pb-[10svh] pt-28 md:pt-[max(17svh,9.5rem)] text-tinta md:pb-[12svh]">
      <div aria-hidden className="luzes pointer-events-none absolute inset-0" />
      <div className="relative mx-auto w-full max-w-[1600px] px-5 md:px-[5.55vw]">
        <h2 className="titulo text-[clamp(1.6rem,3.4vw,3rem)]">
          {oficio.titulo[0]}<br />{oficio.titulo[1]}
        </h2>

        <div className="mt-[6svh] grid gap-5 md:mt-[8svh] md:grid-cols-[1.38fr_1fr] md:gap-8">
          <article className={`${cartao} flex flex-col p-5 md:p-6`}>
            <h3 className="text-[20px] leading-tight">{oficio.projeto.titulo}</h3>
            <p className="mt-2 max-w-[640px] text-[16px] leading-normal text-[#6f675f]">{oficio.projeto.texto}</p>
            <figure className="mt-7 flex flex-1 flex-col md:mt-10">
              <div className="pauta flex-1">
                <Elevacao className="mx-auto block h-auto w-full max-w-[640px]" />
              </div>
              <figcaption className="mt-4 text-[14px] text-[#6f675f]">{oficio.projeto.legenda}</figcaption>
            </figure>
          </article>

          <div className="grid gap-5 md:gap-8">
            {oficio.cartoes.map((c) => (
              <article key={c.foto} className={`${cartao} flex flex-col`}>
                <div className="p-5 md:p-6">
                  <h3 className="text-[20px] leading-tight">{c.titulo}</h3>
                  <p className="mt-2 text-[16px] leading-normal text-[#6f675f]">{c.texto}</p>
                </div>
                <Foto nome={c.foto} alt={c.alt} loading="lazy" sizes="(min-width: 768px) 37vw, 92vw" className="aspect-[11/4] min-h-[150px] w-full flex-1 rounded-b-[6px] object-cover grayscale sepia-[.42] saturate-[.85] contrast-[1.06]" />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
