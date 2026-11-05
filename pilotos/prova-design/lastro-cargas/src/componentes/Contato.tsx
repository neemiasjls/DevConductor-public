import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { contato, empresa, whatsapp } from '../data/conteudo'
import { classeBotao, classeTextoBotao } from './botaoClasses'

// O botão magnético (Motion) só carrega quando a seção se aproxima; antes disso, o mesmo botão parado.
const BotaoMagnetico = lazy(() => import('./BotaoMagnetico'))

function BotaoParado({ href, children }: { href: string; children: string }) {
  return (
    <div className="-m-8 inline-block p-8">
      <a href={href} className={classeBotao}>
        <span aria-hidden className="absolute inset-0 rounded-full border border-tinta/25" />
        <span className={classeTextoBotao}>{children}</span>
      </a>
    </div>
  )
}

function BotaoCotacao({ href, children }: { href: string; children: string }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [perto, aproximar] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { aproximar(true); io.disconnect() } }, { rootMargin: '900px 0px' })
    io.observe(caixa.current!)
    return () => io.disconnect()
  }, [])
  const parado = <BotaoParado href={href}>{children}</BotaoParado>
  return (
    <div ref={caixa} className="inline-block">
      {perto ? <Suspense fallback={parado}><BotaoMagnetico href={href}>{children}</BotaoMagnetico></Suspense> : parado}
    </div>
  )
}

export default function Contato() {
  return (
    <section id="contato" aria-labelledby="contato-titulo" className="relative bg-papel px-5 py-24 text-tinta md:px-10 md:py-36">
      <div className="grid gap-12 md:grid-cols-12 md:items-center">
        <div className="md:col-span-8">
          <p className="numeros text-[12px] uppercase tracking-[0.16em] text-grafite">{contato.numero} Contato</p>
          <h2 id="contato-titulo" className="titulo mt-3 text-[clamp(48px,14vw,60px)] font-semibold md:text-[clamp(64px,8.4vw,136px)]">
            {contato.titulo}
          </h2>
          <p className="mt-6 max-w-[42ch] text-[16px] leading-relaxed text-grafite md:text-[18px]">{contato.texto}</p>
        </div>
        <div className="md:col-span-4 md:justify-self-center">
          <BotaoCotacao href={whatsapp(contato.mensagem)}>{contato.botao}</BotaoCotacao>
        </div>
      </div>
      <dl className="mt-16 grid gap-6 border-t border-tinta/15 pt-6 sm:grid-cols-3 md:mt-24">
        <div>
          <dt className="text-[12px] uppercase tracking-[0.16em] text-grafite">WhatsApp</dt>
          <dd className="mt-2"><a className="titulo text-[26px] font-semibold md:text-[32px]" href={whatsapp(contato.mensagem)}>{empresa.whatsapp}</a></dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-[0.16em] text-grafite">Telefone</dt>
          <dd className="mt-2"><a className="titulo text-[26px] font-semibold md:text-[32px]" href={empresa.telefoneLink}>{empresa.telefone}</a></dd>
        </div>
        <div>
          <dt className="text-[12px] uppercase tracking-[0.16em] text-grafite">E-mail</dt>
          <dd className="mt-2"><a className="titulo break-all text-[22px] font-semibold md:text-[26px]" href={`mailto:${empresa.email}`}>{empresa.email}</a></dd>
        </div>
      </dl>
    </section>
  )
}
