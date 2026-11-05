import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'
import Foto from '../componentes/Foto'
import IconeWhats from '../componentes/IconeWhats'
import { servicos, whatsapp } from '../data/conteudo'

type Servico = (typeof servicos.lista)[number]
const MAX_MIN = 90
const real = (n: number) => `R$ ${n}`

// Minutos que contam até a duração quando a linha ganha foco (só com movimento permitido).
function Minutos({ alvo, ativo }: { alvo: number; ativo: boolean }) {
  const [valor, mudar] = useState(alvo)
  useEffect(() => {
    if (!ativo || matchMedia('(prefers-reduced-motion: reduce)').matches) { mudar(alvo); return }
    let quadro = 0
    const t0 = performance.now()
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - t0) / 450)
      mudar(Math.round(alvo * (1 - Math.pow(1 - t, 4))))
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, ativo])
  return <>{valor}</>
}

// Interação: ficha técnica com cursor/toque. Linha focada conta os minutos, enche a régua e troca a foto.
export default function Servicos() {
  const secao = useRef<HTMLElement>(null)
  // Aberto (detalhe com o link) só por clique/toque/foco; o cursor só destaca (sem mudar a altura da linha
  // durante a rolagem, o que contaria como deslocamento de layout).
  const [ativo, ativar] = useState<string>(servicos.lista[1].id)
  const [destaque, destacar] = useState<string | null>(null)
  const atual = servicos.lista.find((s) => s.id === (destaque ?? ativo))!

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      // Costura de saída: o grafite invade de baixo (a próxima seção é escura).
      gsap.fromTo('[data-invade]', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '[data-invade]', start: 'top bottom', end: 'bottom bottom', scrub: 0.4 },
      })
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <section id="servicos" ref={secao} data-leitura aria-labelledby="servicos-titulo" className="relative bg-papel text-tinta">
      {/* A régua do degradê vira a escala de minutos: régua horizontal na borda */}
      <div aria-hidden className="regua-h h-[18px] w-full text-tinta/25 [--mm:6px]" />
      <div className="mx-auto grid max-w-[1360px] gap-10 px-5 pb-28 pt-16 md:grid-cols-12 md:gap-8 md:px-[5vw] md:pb-[22vh] md:pt-24">
        <div className="md:col-span-4">
          <p className="dado text-[11px] uppercase tracking-[0.12em] text-cobre-escuro">04 · {servicos.rotulo}</p>
          <h2 id="servicos-titulo" className="titulo mt-4 text-[30px] md:text-[clamp(34px,3.4vw,48px)]">{servicos.titulo}</h2>
          <div className="relative mt-8 hidden aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-[6px] bg-tinta isolate md:block">
            <AnimatePresence initial={false}>
              <m.div
                key={atual.foto}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Foto nome={atual.foto as 'tesoura'} alt={atual.fotoAlt} sizes="360px" loading="lazy" className="h-full w-full object-cover" />
              </m.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="md:col-span-8 md:col-start-5 lg:col-span-7 lg:col-start-6">
          <div role="presentation" className="dado grid grid-cols-[1fr_auto] gap-4 border-b border-tinta/20 pb-3 text-[11px] uppercase tracking-[0.08em] text-tinta-2 md:grid-cols-[1fr_200px_80px]">
            <span>{servicos.colunas.servico}</span>
            <span className="hidden md:block">{servicos.colunas.tempo}</span>
            <span className="text-right">{servicos.colunas.preco}</span>
          </div>
          <ul>
            {servicos.lista.map((s) => (
              <Linha key={s.id} s={s} aberto={s.id === ativo} destacado={s.id === (destaque ?? ativo)} ativar={() => ativar(s.id)} destacar={(sim) => destacar(sim ? s.id : null)} />
            ))}
          </ul>
          <p className="mt-6 text-[13px] text-tinta-2">{servicos.aviso}</p>
        </div>
      </div>
      <div data-invade aria-hidden className="absolute inset-x-0 bottom-0 h-[16vh] origin-bottom bg-grafite motion-reduce:hidden" />
    </section>
  )
}

function Linha({ s, aberto, destacado, ativar, destacar }: {
  s: Servico; aberto: boolean; destacado: boolean; ativar: () => void; destacar: (sim: boolean) => void
}) {
  const detalhe = `servico-${s.id}`
  const ativo = destacado
  return (
    <li className={`relative border-b border-tinta/15 transition-colors duration-200 ${ativo ? 'bg-papel-2' : ''}`}>
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] origin-top bg-cobre-escuro transition-transform duration-300 ease-entra ${ativo ? 'scale-y-100' : 'scale-y-0'}`} />
      <button
        type="button"
        onClick={ativar}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') destacar(true) }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') destacar(false) }}
        onFocus={ativar}
        aria-expanded={aberto}
        aria-controls={detalhe}
        className="grid min-h-[64px] w-full grid-cols-[1fr_auto] items-center gap-4 px-3 py-4 text-left md:grid-cols-[1fr_200px_80px] md:px-4"
      >
        <span>
          <span className="block text-[17px] font-semibold leading-tight md:text-[19px]">{s.nome}</span>
          <span className="mt-1 block text-[13px] leading-snug text-tinta-2 md:text-[14px]">{s.detalhe}</span>
          {/* Tempo no celular, abaixo do nome (mesmo dado da coluna do computador) */}
          <span className="mt-2 flex items-center gap-3 md:hidden">
            <Barra minutos={s.minutos} ativo={ativo} />
            <span className="dado text-[12px] text-tinta"><Minutos alvo={s.minutos} ativo={ativo} /> min</span>
          </span>
        </span>
        <span className="hidden items-center gap-3 md:flex">
          <Barra minutos={s.minutos} ativo={ativo} />
          <span className="dado w-[56px] text-[13px] text-tinta"><Minutos alvo={s.minutos} ativo={ativo} /> min</span>
        </span>
        <span className="dado text-right text-[15px] font-medium md:text-[16px]">{real(s.preco)}</span>
      </button>
      <div id={detalhe} hidden={!aberto} className="flex items-end gap-4 px-3 pb-4 md:px-4">
        <span className="relative block aspect-[4/5] w-[72px] shrink-0 overflow-hidden rounded-[4px] md:hidden">
          <Foto nome={s.foto as 'tesoura'} alt={s.fotoAlt} sizes="72px" loading="lazy" className="h-full w-full object-cover" />
        </span>
        <a
          href={whatsapp(`Olá, Prumo! Quero agendar: ${s.nome} (${s.minutos} min).`)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-tinta px-5 text-[14px] font-semibold text-papel transition-colors hover:bg-cobre-escuro"
        >
          <IconeWhats className="size-[18px]" />
          {servicos.agendar(s.nome)}
        </a>
      </div>
    </li>
  )
}

// Régua de minutos (1 traço = 5 minutos): a parte preenchida é a duração do serviço.
function Barra({ minutos, ativo }: { minutos: number; ativo: boolean }) {
  return (
    <span aria-hidden className="relative block h-[14px] w-[110px] md:w-[130px]">
      <span className="regua-h absolute inset-0 text-tinta/25 [--mm:calc(100%/18)]" />
      <span
        className={`absolute bottom-0 left-0 h-[4px] origin-left ${ativo ? 'bg-cobre-escuro motion-safe:animate-[enche_0.5s_cubic-bezier(0.22,1,0.36,1)]' : 'bg-tinta/35'}`}
        style={{ width: `${(minutos / MAX_MIN) * 100}%` }}
      />
    </span>
  )
}
