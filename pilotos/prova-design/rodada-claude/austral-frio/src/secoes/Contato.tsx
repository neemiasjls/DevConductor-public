import { useEffect, useRef } from 'react'
import BotaoMagnetico from '../componentes/BotaoMagnetico'
import { contato, empresa, rodape, whats } from '../data/conteudo'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'

// Contato (Interação): botão magnético (só mouse) e WhatsApp que pulsa uma vez; a linha de temperatura
// da abertura termina dentro do botão. Rodapé completo com aviso de empresa fictícia e créditos.

const LINHA = 'M0 30 L40 26 L70 33 L100 27 L130 31 L170 29 L210 30 L600 30'

function MapaBase() {
  // Posições aproximadas (lon/lat projetadas); sem fronteiras para não inventar geografia.
  const pts = { Chapecó: [-52.62, -27.1], Curitiba: [-49.27, -25.43], 'São Paulo': [-46.63, -23.55], 'Rio de Janeiro': [-43.2, -22.9] } as const
  const x = (lon: number) => 16 + ((lon + 53.4) / 10.8) * 248
  const y = (lat: number) => 20 + ((-22.2 - lat) / 5.6) * 140
  const base = pts['Chapecó']
  return (
    <figure>
      <svg viewBox="0 0 280 180" className="h-auto w-full max-w-[280px]" role="img" aria-label="Mapa ilustrativo: base em Chapecó com rotas para Curitiba, São Paulo e Rio de Janeiro">
        <rect x="0.5" y="0.5" width="279" height="179" rx="8" fill="none" stroke="currentColor" className="text-aco/40" />
        {Object.entries(pts).slice(1).map(([nome, [lo, la]]) => (
          <path key={nome} d={`M${x(base[0])} ${y(base[1])} Q ${(x(base[0]) + x(lo)) / 2} ${Math.min(y(base[1]), y(la)) - 22} ${x(lo)} ${y(la)}`} fill="none" stroke="currentColor" className="text-destaque" strokeWidth="1.6" strokeDasharray="4 4" />
        ))}
        {Object.entries(pts).map(([nome, [lo, la]]) => (
          <g key={nome}>
            <circle cx={x(lo)} cy={y(la)} r={nome === 'Chapecó' ? 5 : 3.5} fill="currentColor" className={nome === 'Chapecó' ? 'text-destaque' : 'text-gelo'} />
            <text x={x(lo) + (nome === 'Rio de Janeiro' ? -6 : 8)} y={y(la) + (nome === 'Chapecó' ? 18 : -8)} textAnchor={nome === 'Rio de Janeiro' ? 'end' : 'start'} fill="currentColor" className="text-aco-claro" fontSize="13">{nome}</text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-[0.8125rem] text-aco-claro">{rodape.mapaLegenda}</figcaption>
    </figure>
  )
}

export default function Contato() {
  const raiz = useRef<HTMLElement>(null)
  const botao = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      const traco = raiz.current!.querySelector<SVGPathElement>('[data-linha-final]')!
      const total = traco.getTotalLength()
      gsap.fromTo(traco, { strokeDasharray: total, strokeDashoffset: total }, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: '[data-linha-cta]', start: 'top 92%', end: 'top 55%', scrub: ritmo.scrub },
      })
    })
  }, { scope: raiz })

  // WhatsApp pulsa uma única vez quando o botão aparece (sem ciclo).
  useEffect(() => {
    const a = botao.current?.querySelector('a')
    if (!a) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { a.dataset.pulsou = 'sim'; io.disconnect() }
    }, { threshold: 1 })
    io.observe(a)
    return () => io.disconnect()
  }, [])

  return (
    <>
    <section ref={raiz} id="contato" aria-labelledby="contato-titulo" className="escuro bg-grafite text-gelo">
      <div className="conteudo pb-20 pt-24 md:pb-28 md:pt-32">
        <p className="rotulo mb-4 text-aco-claro">{contato.rotulo}</p>
        <h2 id="contato-titulo" className="titulo max-w-[20ch] text-[clamp(1.9rem,7.4vw,2.4rem)] md:text-[min(4.8vw,3.8rem)]">{contato.titulo}</h2>
        <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-aco-claro">{contato.texto}</p>

        <div data-linha-cta className="mt-12 flex items-center">
          <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="h-[60px] min-w-[48px] flex-1" aria-hidden>
            <path data-linha-final d={LINHA} fill="none" stroke="currentColor" className="text-destaque" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div ref={botao} className="shrink-0">
            <BotaoMagnetico href={whats(contato.mensagem)} externo className="pulsa-uma">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-grafite" />
              <span className="sm:hidden">Cotar no WhatsApp</span>
              <span className="hidden sm:inline">{contato.botao}</span>
            </BotaoMagnetico>
          </div>
        </div>
        <p className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[1rem]">
          <a href={`mailto:${empresa.email}`} className="inline-flex min-h-[44px] items-center underline decoration-aco underline-offset-4 hover:decoration-gelo">{empresa.email}</a>
          <a href={empresa.telefoneHref} className="inline-flex min-h-[44px] items-center underline decoration-aco underline-offset-4 hover:decoration-gelo">{empresa.telefone}</a>
        </p>
      </div>
    </section>

      <footer className="escuro bg-grafite-2 text-gelo">
        <div className="conteudo grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <p className="titulo text-[1.5rem]" translate="no">{empresa.nome}</p>
            <p className="mt-2 text-[0.9375rem] text-aco-claro">{empresa.rotas}</p>
            <p className="rotulo mt-4 inline-block rounded-full border border-aco/50 px-3 py-1.5 text-aco-claro">{empresa.aviso}</p>
          </div>
          <div className="lg:col-span-3">
            <h3 className="rotulo mb-3 text-aco-claro">Contato</h3>
            <ul className="grid gap-1 text-[0.9375rem]">
              <li><a className="inline-flex min-h-[44px] items-center hover:underline" href={whats(contato.mensagem)} target="_blank" rel="noopener noreferrer">WhatsApp {empresa.whatsapp}</a></li>
              <li><a className="inline-flex min-h-[44px] items-center hover:underline" href={empresa.telefoneHref}>Telefone {empresa.telefone}</a></li>
              <li><a className="inline-flex min-h-[44px] items-center break-all hover:underline" href={`mailto:${empresa.email}`}>{empresa.email}</a></li>
              <li className="py-2 text-aco-claro">Instagram: a definir</li>
            </ul>
          </div>
          <div className="lg:col-span-3">
            <h3 className="rotulo mb-3 text-aco-claro">Endereço e horários</h3>
            <p className="text-[0.9375rem] leading-relaxed">{empresa.endereco}</p>
            <dl className="mt-4 grid gap-1.5 text-[0.9375rem]">
              {empresa.horarios.map(([d, h]) => (
                <div key={d} className="flex justify-between gap-4">
                  <dt className="text-aco-claro">{d}</dt><dd className="numeros text-right">{h}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:col-span-3"><MapaBase /></div>
        </div>
        <div className="conteudo pb-8 pt-4 text-[0.8125rem] leading-relaxed text-aco-claro">
          <p className="rotulo mb-2 text-gelo">{empresa.aviso}</p>
          <p>{rodape.direitos}</p>
          <p className="mt-4 text-gelo">{rodape.creditosTitulo}</p>
          <ul className="mt-1 grid gap-0.5">
            {rodape.creditos.map((c) => (
              <li key={c.href}>
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center underline decoration-aco/60 underline-offset-2 hover:text-gelo">{c.texto}</a>
                {' · '}
                <a href={c.licenca} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center underline decoration-aco/60 underline-offset-2 hover:text-gelo">licença</a>
              </li>
            ))}
          </ul>
          <p className="mt-2">{rodape.alteracoes}</p>
          <p className="mt-2">Tipografia: Petrona e Red Hat Text (SIL Open Font License), hospedadas no site.</p>
        </div>
      </footer>
    </>
  )
}
