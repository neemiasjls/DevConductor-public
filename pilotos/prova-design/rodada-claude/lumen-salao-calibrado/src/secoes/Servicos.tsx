import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { linkWhats, servicos } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
import { ritmo } from '../ritmo'

// Cena 5: lista editorial com numeração de revista (Interação). Passar o cursor, focar ou tocar num serviço
// troca a foto do quadro ao lado num cruzamento lento. No celular cada linha traz a própria foto pequena.
// No fim, a ameixa sobe do pé da seção e vira o fundo do fechamento (costura 5→6).
export function Servicos() {
  const [ativo, ativar] = useState(0)
  const secao = useRef<HTMLElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(secao)
      gsap.fromTo(q('[data-invade]'), { scaleY: 0, opacity: 1 }, { scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: q('[data-invade]')[0], start: 'top bottom', end: 'bottom bottom', scrub: ritmo.scrub } })
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <section ref={secao} id="servicos" data-leitura aria-labelledby="titulo-servicos" className="relative bg-claro">
      {/* taste-skill-ignore: costura "fio fino" do roteiro (resultado → serviços) */}
      <div /* taste-skill-ignore */ className="border-t border-petroleo/15" aria-hidden="true" />
      <div className="grid gap-12 px-[var(--margem)] pb-[22svh] pt-[14svh] md:grid-cols-12 md:gap-x-8 md:pb-[28svh] md:pt-[18svh]">
        <div className="md:col-span-6">
          <p className="rotulo text-ameixa-texto"><span className="mr-3">{servicos.numero}</span>{servicos.rotulo}</p>
          <h2 id="titulo-servicos" className="titulo mt-5 text-[clamp(34px,9vw,42px)] md:text-[clamp(44px,4.4vw,64px)]">{servicos.titulo}</h2>
          <p className="mt-5 max-w-[46ch] text-[15px] text-petroleo/75">{servicos.aviso}</p>

          <ol className="mt-10 md:mt-14">
            {servicos.lista.map((s, i) => (
              // taste-skill-ignore: lista editorial com numeração de revista e fios (estilo luxo-editorial)
              <li key={s.nome} data-servico={i} aria-current={ativo === i ? 'true' : undefined}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') ativar(i) }}
                onPointerDown={() => ativar(i)} onFocusCapture={() => ativar(i)}
                /* taste-skill-ignore */ className="group grid grid-cols-[auto_1fr] gap-x-4 border-t border-petroleo/15 py-6 last:border-b md:grid-cols-[3.2rem_1fr_auto] md:gap-x-6 md:py-7">
                <span className="text-[14px] text-petroleo/70 md:pt-2">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="flex items-start gap-4">
                    <div className="moldura relative h-[72px] w-[72px] shrink-0 md:hidden">
                      <Foto nome={s.foto} alt="" sizes="72px" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`titulo text-[26px] transition-colors duration-500 md:text-[34px] ${ativo === i ? 'md:text-ameixa' : ''}`}>{s.nome}</h3>
                      <p className="mt-2 text-[16px] text-petroleo/80">{s.linha}</p>
                      <p className="mt-2 text-[15px] font-semibold">{s.preco}</p>
                    </div>
                  </div>
                </div>
                <a href={linkWhats(s.nome.toLowerCase())} aria-label={`${servicos.agendar} ${s.nome.toLowerCase()} pelo WhatsApp`}
                  className="pilula col-start-2 mt-4 justify-self-start border border-petroleo/30 px-5 py-2 text-[15px] hover:bg-petroleo hover:text-claro md:col-start-3 md:mt-1 md:self-start">
                  {servicos.agendar}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <div className="hidden md:col-span-5 md:col-start-8 md:block">
          <div className="sticky top-[14svh]">
            <div className="moldura relative aspect-square w-full bg-petroleo" data-quadro-servico={ativo}>
              {servicos.lista.map((s, i) => (
                <Foto key={s.nome} nome={s.foto} alt={i === ativo ? s.alt : ''} sizes="36vw" aria-hidden={i === ativo ? undefined : true}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity ease-[var(--ease-entra)] motion-reduce:transition-none"
                  style={{ opacity: i === ativo ? 1 : 0, transitionDuration: `${ritmo.troca}s` }} />
              ))}
            </div>
            <p className="mt-3 text-[14px] text-petroleo/70" aria-live="polite">{servicos.lista[ativo].nome}</p>
          </div>
        </div>
      </div>
      <div aria-hidden="true" data-invade data-so-movimento className="absolute inset-x-0 bottom-0 h-[18svh] origin-bottom bg-ameixa md:h-[22svh]" />
    </section>
  )
}
