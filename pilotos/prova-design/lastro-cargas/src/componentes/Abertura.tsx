import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'
import { usePrefere, temWebGL } from '../usos'
import type { EstadoCena, Ponto3D } from '../cena/tipos'
import {
  abertura, capitulos, legendas, marcadores, palavraGigante, seuVolume, whatsapp,
} from '../data/conteudo'

const Cena = lazy(() => import('../cena/CenaCaixote'))
// Três quartos (movimento reduzido, falha de WebGL, Open Graph).
const POSTER = '/modelos/ovos-poster.webp'
// Primeiro quadro da câmera (render do próprio canvas): aparece já no carregamento e o 3D entra por cima
// sem salto. Gerados por ferramentas/gerar-poster.mjs.
const QUADRO = '/modelos/ovos-abertura.webp'
const QUADRO_CELULAR = '/modelos/ovos-abertura-celular.webp'

// Three, modelo e HDRI só depois que a página está pronta para uso: no primeiro gesto da pessoa (roda,
// toque, tecla, rolagem) ou, sem gesto, num momento ocioso uns 3 s após o load. Até lá o pôster do primeiro
// quadro (render do mesmo canvas) segura a abertura, e o título já se move por CSS.
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

class Falha extends Component<{ children: ReactNode; aoFalhar: () => void }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  componentDidCatch() { this.props.aoFalhar() }
  render() { return this.state.falhou ? null : this.props.children }
}

export default function Abertura() {
  const reduzido = usePrefere('(prefers-reduced-motion: reduce)')
  return reduzido ? <AberturaParada /> : <AberturaCena />
}

function Titulo({ className = '' }: { className?: string }) {
  return (
    <h1 className={`titulo font-semibold text-[clamp(48px,12.3vw,60px)] md:text-[clamp(64px,8.8vw,138px)] ${className}`}>
      {abertura.titulo.map((linha, i) => (
        <span key={linha} className="linha">
          <span style={{ ['--i' as string]: i }}>{linha}</span>
        </span>
      ))}
    </h1>
  )
}

function Ficha({ className = '' }: { className?: string }) {
  return (
    <dl className={`grid grid-cols-3 gap-4 border-t border-papel/20 pt-4 ${className}`}>
      {abertura.ficha.map((f) => (
        <div key={f.rotulo}>
          <dt className="text-[12px] uppercase tracking-[0.14em] text-nevoa">{f.rotulo}</dt>
          <dd className="mt-1 text-[14px] leading-snug">{f.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

const caixaLegenda: Record<string, string> = {
  lacre: 'right-5 top-[13%] md:right-10 md:top-[66%]',
  seguro: 'left-5 top-[24%] md:left-[34%] md:top-[76%]',
  rastreio: 'right-5 top-[35%] md:right-10 md:top-[17%]',
}

function AberturaCena() {
  const secao = useRef<HTMLElement>(null)
  const involucro = useRef<HTMLDivElement>(null)
  const modoPoster = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('poster') : null
  const poster = modoPoster !== null
  const estado = useRef<EstadoCena>({
    p: 0, k: 1, saida: 0.8, poster, posterAbertura: modoPoster === 'abertura',
    pontos: [
      ...legendas.map((l): Ponto3D => ({ id: l.id, ancora: l.ancora, ponto: null, linha: null, caixa: null })),
      { id: 'volume', ancora: [0, 0.68, 0], ponto: null, linha: null, caixa: null },
    ],
  }).current
  const ponto = (id: string) => estado.pontos.find((p) => p.id === id)!
  const [webgl] = useState(temWebGL)
  const [pronto, marcarPronto] = useState(false)
  const [falhou, falhar] = useState(false)
  const aoPronto = useCallback(() => marcarPronto(true), [])
  const aoFalhar = useCallback(() => falhar(true), [])
  const carregar = useCarregarCena(webgl) || poster

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: consultas.mover, celular: consultas.celular }, (ctx) => {
      const { mover, celular } = ctx.conditions as { mover: boolean; celular: boolean }
      if (!mover || poster) return
      const telas = celular ? ritmo.cena.telasCelular : ritmo.cena.telasDesktop
      const S = 1 - 1 / telas
      const k = S / 0.8
      estado.k = k
      estado.saida = S
      const at = (x: number) => x * k

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        // Sem pin (gera CLS): o involucro tem 1 + telas de altura e o palco é sticky; aqui só o scrub.
        scrollTrigger: {
          trigger: involucro.current, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
        },
        onUpdate: () => { estado.p = tl.progress() },
      })
      tl.set({}, {}, 1)

      // Abertura sai cedo; a câmera recua do close.
      tl.to('[data-titulo]', { yPercent: -18, autoAlpha: 0, duration: at(0.07), ease: ritmo.sai }, at(0.012))
      tl.to('[data-hero-lado]', { y: -ritmo.distancia * 2, autoAlpha: 0, duration: at(0.05), ease: ritmo.sai }, at(0.008))
      tl.to('[data-scrim]', { autoAlpha: 0.35, duration: at(0.08) }, at(0.02))

      // Capítulo 1 e legendas técnicas.
      tl.fromTo('[data-cap="01"]', { autoAlpha: 0, y: ritmo.distancia * 2 }, { autoAlpha: 1, y: 0, duration: at(0.04), ease: ritmo.entra }, at(0.085))
      tl.to('[data-cap="01"]', { autoAlpha: 0, y: -ritmo.distancia * 2, duration: at(0.03), ease: ritmo.sai }, at(0.235))
      legendas.forEach((l, i) => {
        tl.fromTo(`[data-legenda="${l.id}"]`, { autoAlpha: 0 }, { autoAlpha: 1, duration: at(0.025) }, at(0.12 + i * 0.03))
        tl.to(`[data-legenda="${l.id}"]`, { autoAlpha: 0, duration: at(0.02) }, at(0.235 + i * 0.006))
      })
      tl.fromTo('[data-fio]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: at(0.03), stagger: at(0.03) }, at(0.12))

      // Lado: palavra gigante corre atrás do caixote.
      tl.fromTo('[data-palavra]', { xPercent: 8 }, { xPercent: -42, duration: at(0.22) }, at(0.24))
      tl.fromTo('[data-palavra]', { autoAlpha: 0 }, { autoAlpha: 1, duration: at(0.04) }, at(0.25))
      tl.to('[data-palavra]', { autoAlpha: 0, duration: at(0.05) }, at(0.41))
      tl.fromTo('[data-cap="02"]', { autoAlpha: 0, y: ritmo.distancia * 2 }, { autoAlpha: 1, y: 0, duration: at(0.03), ease: ritmo.entra }, at(0.3))
      tl.to('[data-cap="02"]', { autoAlpha: 0, y: -ritmo.distancia * 2, duration: at(0.03), ease: ritmo.sai }, at(0.395))

      // De cima: a pista corre, os vizinhos chegam (no canvas), as cidades passam pelos lados.
      tl.fromTo('[data-faixas]', { autoAlpha: 0 }, { autoAlpha: 1, duration: at(0.05) }, at(0.46))
      tl.fromTo('[data-faixas-trilho]', { y: 0 }, { y: 1800, duration: 1 - at(0.44) }, at(0.44))
      tl.fromTo('[data-cap="03"]', { autoAlpha: 0, y: ritmo.distancia * 2 }, { autoAlpha: 1, y: 0, duration: at(0.03), ease: ritmo.entra }, at(0.55))
      tl.to('[data-cap="03"]', { autoAlpha: 0, duration: at(0.03) }, at(0.765))
      tl.fromTo('[data-seu-volume]', { autoAlpha: 0 }, { autoAlpha: 1, duration: at(0.02) }, at(0.6))
      tl.to('[data-seu-volume]', { autoAlpha: 0, duration: at(0.02) }, at(0.77))
      // No celular o texto do capítulo 3 ocupa o rodapé da tela: as cidades somem antes de chegar nele.
      const fimMarcador = celular ? 0.66 : 1.08
      marcadores.forEach((_, i) => {
        const inicio = at(0.52 + i * 0.056)
        tl.fromTo(`[data-marcador="${i}"]`,
          { y: () => -0.22 * window.innerHeight, autoAlpha: 1 },
          { y: () => fimMarcador * window.innerHeight, duration: at(0.12) }, inicio)
        if (celular) tl.to(`[data-marcador="${i}"]`, { autoAlpha: 0, duration: at(0.03) }, inicio + at(0.09))
      })

      // Progresso dos capítulos e saída (a próxima seção cobre a cena).
      tl.fromTo('[data-progresso]', { scaleY: 0 }, { scaleY: 1, duration: S }, 0)
      tl.fromTo('[data-escurece]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 - S }, S)
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <div ref={involucro} className="relative h-[100svh] motion-safe:h-[var(--cena-celular)] md:motion-safe:h-[var(--cena-desktop)]"
      style={{ '--cena-celular': `${(ritmo.cena.telasCelular + 1) * 100}svh`, '--cena-desktop': `${(ritmo.cena.telasDesktop + 1) * 100}svh` } as CSSProperties}>
    <section
      id="carga"
      ref={secao}
      aria-label="Abertura: a carga"
      className="sticky top-0 h-[100svh] overflow-hidden bg-carvao [--centro:38%] [--pista:28vw] md:[--centro:50%] md:[--pista:min(17vw,250px)]"
      data-poster={poster || undefined}
      data-pronta={pronto || undefined}
    >
      {/* Palco: luz de galpão no centro */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_62%_48%,oklch(0.26_0.012_250),transparent_75%)]" />

      {/* Atrás do canvas: pista vista de cima e palavra gigante */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" data-sobre>
        <div data-faixas className="invisible absolute inset-0">
          <div className="absolute inset-y-0 left-[calc(var(--centro)-var(--pista)*1.3)] w-px bg-papel/15" />
          <div className="absolute inset-y-0 left-[calc(var(--centro)+var(--pista)*1.3)] w-px bg-papel/15" />
          <div data-faixas-trilho className="absolute inset-x-0 -top-[1800px] bottom-0">
            <div className="faixa-pista absolute inset-y-0 left-[calc(var(--centro)-var(--pista))] w-[3px]" />
            <div className="faixa-pista absolute inset-y-0 left-[calc(var(--centro)+var(--pista))] w-[3px]" />
          </div>
        </div>
        <p
          data-palavra
          className="titulo invisible absolute left-0 top-[calc(50%-0.62em)] whitespace-nowrap font-bold leading-none text-[30vw] text-papel/80 md:text-[26vw]"
        >
          {palavraGigante}
        </p>
      </div>

      {/* Modelo 3D (o poster aparece antes e quando o WebGL falha) */}
      <div aria-hidden className="absolute inset-0">
        {!poster && (
          <picture>
            {!falhou && webgl && <source media="(max-width: 767px)" srcSet={QUADRO_CELULAR} width={585} height={1266} />}
            <img
              src={falhou || !webgl ? POSTER : QUADRO}
              alt=""
              width={1680}
              height={1050}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
              style={{ opacity: pronto && !falhou ? 0 : 1, transitionDelay: pronto ? '0.75s' : '0s' }}
            />
          </picture>
        )}
        {carregar && webgl && !falhou && (
          <Falha aoFalhar={aoFalhar}>
            <Suspense fallback={null}>
              <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: pronto ? 1 : 0 }}>
                <Cena estado={estado} aoPronto={aoPronto} aoFalhar={aoFalhar} />
              </div>
            </Suspense>
          </Falha>
        )}
      </div>

      <div data-sobre className="contents">
        {/* Sombra lateral para o título ler sobre a madeira */}
        <div
          aria-hidden
          data-scrim
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,oklch(0.17_0.01_250/0.92)_8%,transparent_62%)] md:bg-[linear-gradient(to_right,oklch(0.17_0.01_250/0.9)_12%,transparent_58%)]"
        />

        {/* Fios das legendas */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {legendas.map((l) => (
            <line
              key={l.id}
              data-legenda={l.id}
              data-fio
              pathLength={1}
              strokeDasharray="1 1"
              ref={(el) => { ponto(l.id).linha = el }}
              className="invisible stroke-papel/70"
              strokeWidth={1}
            />
          ))}
        </svg>
        {legendas.map((l) => (
          <span
            key={l.id}
            aria-hidden
            data-legenda={l.id}
            ref={(el) => { ponto(l.id).ponto = el }}
            className="invisible pointer-events-none absolute left-0 top-0 -ml-[5px] -mt-[5px] size-[10px] rounded-full border-2 border-sinal bg-carvao"
          />
        ))}
        <ul aria-label="Garantias da carga">
          {legendas.map((l) => (
            <li
              key={l.id}
              data-legenda={l.id}
              ref={(el) => { ponto(l.id).caixa = el }}
              className={`invisible absolute w-[min(46vw,210px)] md:w-[230px] ${caixaLegenda[l.id]}`}
            >
              <p className="text-[13px] font-medium leading-tight md:text-[14px]">{l.titulo}</p>
              <p className="mt-1 text-[12px] leading-snug text-nevoa md:text-[13px]">{l.texto}</p>
            </li>
          ))}
        </ul>

        {/* "Seu volume": etiqueta presa ao caixote na vista de cima */}
        <div
          data-seu-volume
          ref={(el) => { ponto('volume').ponto = el }}
          className="invisible pointer-events-none absolute left-0 top-0"
        >
          <span className="-ml-[5px] -mt-[5px] block size-[10px] rounded-full bg-sinal" />
          <span className="absolute left-3 top-[-9px] whitespace-nowrap rounded-full bg-sinal px-2.5 py-1 text-[12px] font-medium text-tinta">
            {seuVolume}
          </span>
        </div>

        {/* Cidades que passam pelos lados */}
        {marcadores.map((m, i) => (
          <div
            key={m.cidade}
            aria-hidden
            data-marcador={i}
            className={`invisible pointer-events-none absolute top-0 left-[calc(var(--centro)+var(--pista)*1.3+10px)] max-w-[24vw] md:left-[calc(var(--centro)+var(--pista)*1.3+28px)] md:max-w-none ${
              i % 2 ? 'md:ml-24' : ''
            }`}
          >
            <p className="titulo text-[17px] font-semibold leading-tight md:text-[30px]">{m.cidade}</p>
            <p className="numeros mt-1 text-[11px] text-nevoa md:text-[12px]">{m.uf} {m.coordenada}</p>
          </div>
        ))}

        {/* Capítulos */}
        {capitulos.map((c) => (
          <div
            key={c.numero}
            data-cap={c.numero}
            className={`invisible absolute inset-x-5 bottom-10 md:inset-x-auto md:w-[360px] ${
              c.numero === '01' ? 'md:bottom-auto md:left-10 md:top-[34%]' : c.numero === '02' ? 'md:bottom-14 md:left-10' : 'md:bottom-auto md:left-10 md:top-[26%]'
            }`}
          >
            <p className="numeros text-[12px] uppercase tracking-[0.16em] text-sinal">{c.numero} {c.nome}</p>
            <h2 className="titulo mt-3 text-[28px] font-semibold leading-[1.02] md:text-[38px]">{c.titulo}</h2>
            <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-nevoa md:text-[16px]">{c.texto}</p>
          </div>
        ))}

        {/* Título e ficha da abertura */}
        <div data-titulo className="absolute inset-x-5 bottom-[178px] md:inset-x-auto md:bottom-14 md:left-10">
          <Titulo />
        </div>
        <div data-hero-lado className="absolute inset-x-5 bottom-8 md:inset-x-auto md:bottom-14 md:right-10 md:w-[380px]">
          <p className="surge max-w-[42ch] text-[15px] leading-relaxed text-papel/85 md:text-[16px]" style={{ ['--i' as string]: 0 }}>
            {abertura.texto}
          </p>
          <div className="surge mt-5 flex items-center gap-5" style={{ ['--i' as string]: 1 }}>
            <a
              href={whatsapp(abertura.mensagem)}
              className="inline-flex h-12 items-center rounded-full bg-sinal px-6 text-[15px] font-medium text-tinta transition-transform duration-300 ease-entra hover:scale-[1.03]"
            >
              {abertura.botao}
            </a>
            <span className="text-[13px] text-nevoa">{abertura.rolar}</span>
          </div>
          <Ficha className="surge mt-6 hidden md:grid" />
        </div>

        {/* Régua de progresso dos capítulos */}
        <div aria-hidden className="pointer-events-none absolute right-6 top-1/2 hidden h-40 -translate-y-1/2 md:block">
          <div className="absolute inset-y-0 right-0 w-px bg-papel/15" />
          <div data-progresso className="absolute inset-y-0 right-0 w-px origin-top bg-sinal" />
        </div>

        <div data-escurece aria-hidden className="invisible pointer-events-none absolute inset-0 bg-carvao/75" />
      </div>
    </section>
    </div>
  )
}

// Movimento reduzido: sem pin, sem Three; poster do próprio modelo e tudo visível.
function AberturaParada() {
  return (
    <section id="carga" aria-label="Abertura: a carga" className="relative bg-carvao pb-16">
      <div className="relative h-[62svh] md:h-[78svh]">
        <img
          src={POSTER}
          alt={abertura.posterAlt}
          width={1600}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover md:object-[70%_50%]"
        />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,oklch(0.17_0.01_250)_2%,transparent_55%)]" />
        <div className="absolute inset-x-5 bottom-6 md:inset-x-10">
          <Titulo />
        </div>
      </div>
      <div className="grid gap-10 px-5 pt-8 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="max-w-[42ch] text-[16px] leading-relaxed text-papel/85">{abertura.texto}</p>
          <a
            href={whatsapp(abertura.mensagem)}
            className="mt-6 inline-flex h-12 items-center rounded-full bg-sinal px-6 text-[15px] font-medium text-tinta"
          >
            {abertura.botao}
          </a>
          <Ficha className="mt-8" />
        </div>
        <ul className="grid gap-6 md:col-span-6 md:col-start-7 md:grid-cols-3">
          {legendas.map((l) => (
            <li key={l.id} className="border-t border-sinal pt-3">
              <p className="text-[14px] font-medium">{l.titulo}</p>
              <p className="mt-1 text-[13px] leading-snug text-nevoa">{l.texto}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-16 grid gap-10 px-5 md:grid-cols-3 md:px-10">
        {capitulos.map((c) => (
          <div key={c.numero}>
            <p className="numeros text-[12px] uppercase tracking-[0.16em] text-sinal">{c.numero} {c.nome}</p>
            <h2 className="titulo mt-3 text-[30px] font-semibold leading-[1.02]">{c.titulo}</h2>
            <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-nevoa">{c.texto}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
