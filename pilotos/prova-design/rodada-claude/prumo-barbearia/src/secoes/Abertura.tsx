import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'
import { usePrefere, temWebGL } from '../usos'
import Falha from '../componentes/Falha'
import type { EstadoCena, Ponto3D } from '../cena/tipos'
import { abertura, cadeira, legendas, whatsapp } from '../data/conteudo'

const Cena = lazy(() => import('../cena/CenaCadeira'))
// Pôsteres renderizados do próprio canvas (ferramentas/gerar-poster.mjs).
const POSTER = '/modelos/cadeira-poster.webp' // três quartos: reduzido, falha de WebGL/GLB, Open Graph
const QUADRO = '/modelos/cadeira-abertura.webp' // primeiro quadro no computador
const QUADRO_CELULAR = '/modelos/cadeira-abertura-celular.webp'

// Three, modelo e HDRI só no primeiro gesto (roda, toque, tecla, rolagem) ou ~3 s depois do load, em ocioso.
// Até lá o pôster do primeiro quadro segura a abertura e o título já entrou por CSS.
function useCarregarCena(ativo: boolean) {
  const [carregar, marcar] = useState(false)
  useEffect(() => {
    if (!ativo) return
    let feito = false
    let relogio = 0
    let ocioso = 0
    const gestos = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    const aoRolar = () => { if (window.scrollY > 4) ir() }
    const ir = () => {
      if (feito) return
      feito = true
      limpar()
      marcar(true)
    }
    const agendar = () => {
      relogio = window.setTimeout(() => {
        if ('requestIdleCallback' in window) ocioso = window.requestIdleCallback(ir, { timeout: 1500 })
        else ir()
      }, 3000)
    }
    function limpar() {
      gestos.forEach((g) => window.removeEventListener(g, ir))
      window.removeEventListener('scroll', aoRolar)
      window.removeEventListener('load', agendar)
      window.clearTimeout(relogio)
      if (ocioso && 'cancelIdleCallback' in window) window.cancelIdleCallback(ocioso)
    }
    gestos.forEach((g) => window.addEventListener(g, ir, { passive: true, once: true }))
    window.addEventListener('scroll', aoRolar, { passive: true })
    if (document.readyState === 'complete') agendar()
    else window.addEventListener('load', agendar, { once: true })
    return limpar
  }, [ativo])
  return carregar
}

// A troca dinâmica de movimento reduzido substitui a árvore inteira da abertura: quem estava com o foco nela
// (botão de agendar, pausa) recebe o foco no equivalente da nova árvore, ou na própria seção.
function useFocoNaTroca(chave: unknown) {
  const ultimo = useRef<string | null>(null)
  useEffect(() => {
    const entrou = (e: FocusEvent) => {
      const el = (e.target as Element | null)?.closest?.('#cadeira [data-foco]')
      ultimo.current = el?.getAttribute('data-foco') ?? null
    }
    // Foco foi para outro elemento: esquece. Foco foi para o nada (elemento removido ou escondido pela troca):
    // mantém para restaurar. Clique com o ponteiro: a pessoa escolheu onde está, esquece.
    const saiu = (e: FocusEvent) => { if (e.relatedTarget) ultimo.current = null }
    const clicou = () => { ultimo.current = null }
    document.addEventListener('focusin', entrou)
    document.addEventListener('focusout', saiu)
    document.addEventListener('pointerdown', clicou, true)
    return () => {
      document.removeEventListener('focusin', entrou)
      document.removeEventListener('focusout', saiu)
      document.removeEventListener('pointerdown', clicou, true)
    }
  }, [])
  const primeira = useRef(true)
  useLayoutEffect(() => {
    if (primeira.current) { primeira.current = false; return }
    const papel = ultimo.current
    if (!papel || (document.activeElement && document.activeElement !== document.body)) return
    for (const c of [`#cadeira [data-foco="${papel}"]`, '#cadeira [data-foco="agendar"]']) {
      const el = document.querySelector<HTMLElement>(c)
      if (!el) continue
      el.focus({ preventScroll: true })
      if (document.activeElement === el) return
    }
    document.querySelector<HTMLElement>('#cadeira')?.focus({ preventScroll: true })
  }, [chave])
}

export default function Abertura() {
  const reduzido = usePrefere('(prefers-reduced-motion: reduce)')
  useFocoNaTroca(reduzido)
  return reduzido ? <AberturaParada /> : <AberturaCena />
}

function Titulo({ className = '' }: { className?: string }) {
  return (
    <h1 className={`titulo text-[clamp(34px,10.4vw,46px)] md:text-[clamp(46px,5.6vw,88px)] ${className}`}>
      {abertura.titulo.map((linha, i) => (
        <span key={linha} className="linha">
          <span style={{ ['--i' as string]: i }}>{linha}</span>
        </span>
      ))}
    </h1>
  )
}

// Caixa de cada legenda: no computador à esquerda da cadeira, em degraus; no celular, uma por vez sobre o texto.
const caixaLegenda: Record<string, string> = {
  altura: 'md:left-[33%] md:top-[64%]',
  encosto: 'md:left-[31%] md:top-[30%]',
  apoio: 'md:left-[33%] md:top-[18%]',
  toalha: 'md:left-[31%] md:top-[56%]',
}

function AberturaCena() {
  const involucro = useRef<HTMLDivElement>(null)
  const secao = useRef<HTMLElement>(null)
  const busca = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('poster') : null
  const poster = busca === null ? '' : busca === 'abertura' ? 'abertura' : 'tres-quartos'
  const estado = useRef<EstadoCena>({
    p: 0, fim: 0.67, poster, pausado: false, marca: null, legendaAtiva: legendas[0].id, invalidar: () => {},
    pontos: legendas.map((l): Ponto3D => ({ id: l.id, ancora: l.ancora, ponto: null, linha: null, caixa: null })),
  }).current
  const ponto = (id: string) => estado.pontos.find((p) => p.id === id)!
  const [webgl] = useState(temWebGL)
  const [pronto, marcarPronto] = useState(false)
  const [falhou, falhar] = useState(false)
  const [pausado, pausar] = useState(false)
  // Giro automático só no começo da cena; depois o canvas desenha sob demanda (rolagem).
  const [girando, girar] = useState(true)
  const aoPronto = useCallback(() => marcarPronto(true), [])
  const aoFalhar = useCallback(() => falhar(true), [])
  const carregar = useCarregarCena(webgl) || !!poster
  const com3D = carregar && webgl && !falhou

  const alternarPausa = () => {
    estado.pausado = !pausado
    pausar(!pausado)
    estado.invalidar()
  }

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: consultas.mover, celular: consultas.celular }, (ctx) => {
      const { mover, celular } = ctx.conditions as { mover: boolean; celular: boolean }
      if (!mover || poster) return
      const telas = celular ? ritmo.cadeira.telasCelular : ritmo.cadeira.telasDesktop
      const S = 1 - ritmo.cadeira.cobre / telas
      estado.fim = S
      const at = (u: number) => u * S
      const d = ritmo.distancia

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        // Sem pin (gera CLS): o invólucro tem 1 + telas de altura e o palco é sticky; aqui só o scrub.
        scrollTrigger: {
          trigger: involucro.current, start: 'top top', end: 'bottom bottom', scrub: ritmo.scrub, invalidateOnRefresh: true,
        },
        onUpdate: () => {
          estado.p = tl.progress()
          const u = estado.p / S
          estado.legendaAtiva = u < 0.34 ? 'altura' : u < 0.54 ? 'encosto' : u < 0.74 ? 'apoio' : 'toalha'
          girar(estado.p < 0.08 * S)
          estado.invalidar()
        },
      })
      tl.set({}, {}, 1)

      // A abertura sai cedo; a ficha técnica da cadeira entra.
      tl.to('[data-hero]', { y: -d * 3, autoAlpha: 0, duration: at(0.08), ease: ritmo.sai }, at(0.01))
      tl.fromTo('[data-cap]', { autoAlpha: 0, y: d * 2 }, { autoAlpha: 1, y: 0, duration: at(0.06), ease: ritmo.entra }, at(0.08))
      tl.fromTo('[data-regua]', { autoAlpha: 0 }, { autoAlpha: 1, duration: at(0.05) }, at(0.1))
      const janelas: Record<string, [number, number]> = {
        altura: [0.14, 0.34], encosto: [0.34, 0.54], apoio: [0.54, 0.74], toalha: [0.74, 1.2],
      }
      legendas.forEach((l) => {
        const [a, b] = janelas[l.id]
        tl.fromTo(`[data-legenda="${l.id}"]`, { autoAlpha: 0 }, { autoAlpha: 1, duration: at(0.04) }, at(a))
        tl.fromTo(`[data-fio="${l.id}"]`, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: at(0.05) }, at(a))
        if (b <= 1) tl.to(`[data-legenda="${l.id}"]`, { autoAlpha: 0, duration: at(0.03) }, at(b - 0.03))
      })
      // A próxima seção sobe por cima; o palco escurece.
      tl.fromTo('[data-escurece]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 - S }, S)
      return () => { estado.p = 0; girar(true) }
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <div
      ref={involucro}
      className="percurso-cadeira relative h-[100svh]"
      style={{
        '--cadeira-celular': `${ritmo.cadeira.telasCelular * 100}svh`,
        '--cadeira-desktop': `${ritmo.cadeira.telasDesktop * 100}svh`,
      } as CSSProperties}
    >
      <section
        id="cadeira"
        ref={secao}
        aria-label="Abertura: a cadeira"
        tabIndex={-1}
        className="sticky top-0 h-[100svh] overflow-hidden bg-grafite outline-none"
        data-poster={poster || undefined}
        data-pronta={pronto || undefined}
      >
        {/* Luz pontual quente sobre a cadeira */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_46%_58%_at_50%_30%,oklch(0.27_0.03_60/0.75),transparent_72%)] md:bg-[radial-gradient(ellipse_34%_62%_at_67%_46%,oklch(0.27_0.03_60/0.8),transparent_72%)]" />

        {/* Pôster (antes do 3D, e no lugar dele se WebGL/GLB falhar) e canvas */}
        <div aria-hidden className="absolute inset-0">
          {!poster && (
            <picture>
              {!falhou && webgl && <source media="(max-width: 767px)" srcSet={QUADRO_CELULAR} width={585} height={1266} />}
              <img
                data-poster-img
                src={falhou || !webgl ? POSTER : QUADRO}
                alt=""
                width={1680}
                height={1050}
                fetchPriority="high"
                decoding="async"
                className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${falhou || !webgl ? 'object-cover object-[50%_60%] [mask-image:radial-gradient(ellipse_75%_70%_at_50%_50%,#000_60%,transparent_100%)] max-md:h-[60%] md:object-contain md:object-[78%_50%]' : 'object-cover'}`}
                style={{ opacity: pronto && !falhou ? 0 : 1, transitionDelay: pronto ? '0.6s' : '0s' }}
              />
            </picture>
          )}
          {com3D && (
            <Falha aoFalhar={aoFalhar}>
              <Suspense fallback={null}>
                <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: pronto ? 1 : 0 }}>
                  <Cena estado={estado} pausado={pausado} girando={girando} aoPronto={aoPronto} aoFalhar={aoFalhar} />
                </div>
              </Suspense>
            </Falha>
          )}
        </div>

        {/* Sombra para o texto ler sobre o palco */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,oklch(0.16_0.015_170/0.95)_14%,transparent_52%)] md:bg-[linear-gradient(to_right,oklch(0.16_0.015_170/0.92)_10%,transparent_50%)]" />

        {/* Fios e pontos das legendas (só com o 3D: dependem da projeção) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 transition-opacity duration-300" style={{ opacity: pronto && !falhou ? 1 : 0 }}>
          <svg className="absolute inset-0 h-full w-full overflow-visible">
            {legendas.map((l) => (
              <line
                key={l.id}
                data-legenda={l.id}
                data-fio={l.id}
                pathLength={1}
                strokeDasharray="1 1"
                ref={(el) => { ponto(l.id).linha = el }}
                className="invisible stroke-giz/60"
                strokeWidth={1}
              />
            ))}
          </svg>
          {legendas.map((l) => (
            <span
              key={l.id}
              data-legenda={l.id}
              ref={(el) => { ponto(l.id).ponto = el }}
              className="invisible absolute left-0 top-0 -ml-[6px] -mt-[6px] size-[12px] rounded-full border-2 border-cobre bg-grafite"
            />
          ))}
        </div>

        {/* Régua de milímetros ao lado da cadeira: a marca cobre vai à altura da peça da vez.
            Só com o 3D pronto (a marca segue a projeção); sem 3D fica o pôster com a ficha técnica. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 transition-opacity duration-300" style={{ opacity: pronto && !falhou ? 1 : 0 }}>
        <div data-regua className="invisible absolute inset-y-0 right-0 w-[64px] md:right-[3vw] md:w-[96px]">
          <div className="regua-v absolute right-3 top-[12%] h-[76%] w-[22px] text-giz/30 [--mm:6px] md:w-[30px] md:[--mm:7px]" />
          <div className="absolute right-3 top-[12%] h-[76%] w-px bg-giz/25" />
          <div ref={(el) => { estado.marca = el }} className="absolute right-0 top-0 h-0 w-full">
            <div className="absolute right-3 top-0 h-[2px] w-[44px] -translate-y-1/2 bg-cobre md:w-[64px]" />
            {legendas.map((l) => (
              <span
                key={l.id}
                data-legenda={l.id}
                className="dado invisible absolute right-3 top-[8px] whitespace-nowrap text-[11px] text-cobre md:right-[calc(64px+20px)] md:top-0 md:-translate-y-1/2 md:text-[12px]"
              >
                {l.medida}
              </span>
            ))}
          </div>
        </div>
        </div>

        {/* Legendas técnicas (texto) */}
        <ul aria-label="Ficha técnica da cadeira">
          {legendas.map((l) => (
            <li
              key={l.id}
              data-legenda={l.id}
              ref={(el) => { ponto(l.id).caixa = el }}
              className={`invisible absolute bottom-[196px] left-5 w-[min(62vw,250px)] md:bottom-auto md:w-[250px] ${caixaLegenda[l.id]}`}
            >
              <p className="dado text-[11px] uppercase tracking-[0.08em] text-cobre">{l.medida}</p>
              <p className="mt-1 text-[15px] font-semibold leading-tight">{l.titulo}</p>
              <p className="mt-1 text-[13px] leading-snug text-nevoa md:text-[14px]">{l.texto}</p>
            </li>
          ))}
        </ul>

        {/* Capítulo: a cadeira */}
        <div data-cap className="invisible absolute inset-x-5 bottom-8 md:inset-x-auto md:bottom-14 md:left-[5vw] md:w-[330px]">
          <p className="dado text-[11px] uppercase tracking-[0.12em] text-cobre">01 · {cadeira.rotulo}</p>
          <h2 className="titulo mt-3 text-[26px] md:text-[34px]">{cadeira.titulo}</h2>
          <p className="mt-3 max-w-[38ch] text-[14px] leading-relaxed text-nevoa md:text-[15px]">{cadeira.texto}</p>
        </div>

        {/* Abertura */}
        <div data-hero className="absolute inset-x-5 bottom-7 md:inset-x-auto md:bottom-[12vh] md:left-[5vw] md:w-[min(54vw,800px)]">
          <p className="dado surge text-[11px] uppercase tracking-[0.12em] text-cobre" style={{ ['--i' as string]: 0 }}>{abertura.rotulo}</p>
          <Titulo className="mt-4" />
          <p className="surge mt-5 max-w-[44ch] text-[15px] leading-relaxed text-giz/85 md:text-[17px]" style={{ ['--i' as string]: 1 }}>
            {abertura.texto}
          </p>
          <div className="surge mt-6 flex flex-wrap items-center gap-x-5 gap-y-3" style={{ ['--i' as string]: 2 }}>
            <a
              href={whatsapp(abertura.mensagem)}
              data-foco="agendar"
              className="inline-flex h-12 items-center rounded-full bg-cobre px-6 text-[15px] font-semibold text-tinta transition-transform duration-200 ease-entra hover:-translate-y-0.5"
            >
              {abertura.botao}
            </a>
            {/* Lugar reservado desde o início (sem deslocar o bloco quando o 3D fica pronto) */}
            {webgl && (
              <button
                type="button"
                onClick={alternarPausa}
                disabled={!com3D || !pronto}
                style={com3D && pronto ? undefined : { visibility: 'hidden' }}
                aria-pressed={pausado}
                data-pausa
                data-foco="pausa"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-giz/25 px-4 text-[13px] text-giz/85 transition-colors hover:border-cobre"
              >
                <svg aria-hidden viewBox="0 0 12 12" className="size-3 text-cobre" fill="currentColor">
                  {pausado ? <path d="M3 1.5v9l7-4.5z" /> : <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />}
                </svg>
                {pausado ? abertura.retomar : abertura.pausar}
              </button>
            )}
            <span className="hidden text-[13px] text-nevoa md:inline">{abertura.rolar}</span>
          </div>
        </div>

        <div data-escurece aria-hidden className="invisible pointer-events-none absolute inset-0 bg-grafite/75" />
      </section>
    </div>
  )
}

// Movimento reduzido: sem cena presa, sem Three; pôster do próprio modelo e a ficha técnica em lista.
function AberturaParada() {
  return (
    <section id="cadeira" aria-label="Abertura: a cadeira" tabIndex={-1} className="relative bg-grafite pb-20 pt-24 outline-none">
      <div className="grid gap-10 px-5 md:grid-cols-12 md:px-[5vw]">
        <div className="md:col-span-6 md:self-end">
          <p className="dado text-[11px] uppercase tracking-[0.12em] text-cobre">{abertura.rotulo}</p>
          <Titulo className="mt-4" />
          <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-giz/85">{abertura.texto}</p>
          <a
            href={whatsapp(abertura.mensagem)}
            data-foco="agendar"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-cobre px-6 text-[15px] font-semibold text-tinta"
          >
            {abertura.botao}
          </a>
        </div>
        <div className="relative [mask-image:radial-gradient(ellipse_72%_68%_at_50%_50%,#000_58%,transparent_100%)] md:col-span-6">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_45%,oklch(0.27_0.03_60/0.8),transparent_72%)]" />
          <img src={POSTER} alt={abertura.posterAlt} width={1600} height={1000} className="relative h-auto w-full" />
        </div>
      </div>
      <div className="mt-14 px-5 md:px-[5vw]">
        <p className="dado text-[11px] uppercase tracking-[0.12em] text-cobre">01 · {cadeira.rotulo}</p>
        <h2 className="titulo mt-3 text-[28px] md:text-[36px]">{cadeira.titulo}</h2>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-nevoa">{cadeira.texto}</p>
        <ul aria-label="Ficha técnica da cadeira" className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {legendas.map((l) => (
            <li key={l.id} className="border-t border-cobre pt-3">
              <p className="dado text-[11px] uppercase tracking-[0.08em] text-cobre">{l.medida}</p>
              <p className="mt-1 text-[15px] font-semibold">{l.titulo}</p>
              <p className="mt-1 text-[14px] leading-snug text-nevoa">{l.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
