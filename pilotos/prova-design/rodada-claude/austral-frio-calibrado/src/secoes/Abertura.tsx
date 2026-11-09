import { useEffect, useRef, useState } from 'react'
import { abertura, empresa, navegacao } from '../data/conteudo'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'
import { graus, usePrefere } from '../usos'

// Abertura (Ilustração viva): o traço do registrador de temperatura se desenha no carregamento e segue
// oscilando dentro da faixa contratada. Ciclo lento, com pausa, parado fora da tela/aba e no reduzido.

const L = 1000
const A = 260
const MIN = -19.2
const MAX = -16.6
const ALVO = { min: -18.4, max: -17.6 }
const y = (t: number) => A - ((t - MIN) / (MAX - MIN)) * A

// Semente fixa: o desenho inicial é igual em toda carga (prints comparáveis).
function gerador(semente: number) {
  let s = semente
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function proximo(anterior: number, sorte: () => number) {
  // Passeio que volta ao centro (−18,0): a linha se mexe, mas nunca sai da faixa.
  const v = anterior + (sorte() - 0.5) * 0.22 + (-18 - anterior) * 0.18
  return Math.min(ALVO.max - 0.05, Math.max(ALVO.min + 0.05, v))
}

function caminho(valores: number[], deslocamento: number) {
  const passo = L / (valores.length - 2)
  let d = ''
  valores.forEach((v, i) => {
    const x = (i - deslocamento) * passo
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y(v).toFixed(1)}`
  })
  return d
}

export default function Abertura() {
  const raiz = useRef<HTMLElement>(null)
  const grafico = useRef<HTMLDivElement>(null)
  const traco = useRef<SVGPathElement>(null)
  const ponto = useRef<HTMLSpanElement>(null)
  const revela = useRef<SVGRectElement>(null)
  const leitura = useRef<HTMLSpanElement>(null)
  const mover = usePrefere(consultas.mover)
  const [pausado, pausar] = useState(false)
  const pausadoRef = useRef(false)
  pausadoRef.current = pausado

  const dados = useRef<number[]>([])
  if (!dados.current.length) {
    const sorte = gerador(7)
    let v = -18
    for (let i = 0; i < ritmo.registrador.pontos + 2; i++) dados.current.push((v = proximo(v, sorte)))
  }

  const desenhar = (deslocamento: number) => {
    const valores = dados.current
    traco.current?.setAttribute('d', caminho(valores, deslocamento))
    const n = valores.length
    const atual = valores[n - 2] + (valores[n - 1] - valores[n - 2]) * deslocamento
    if (ponto.current) ponto.current.style.transform = `translate(50%, calc(${((y(atual) / A) * 100).toFixed(2)}cqh - 50%))`
  }

  // Ciclo contínuo: anda só com movimento permitido, sem pausa, na tela e com a aba visível.
  useEffect(() => {
    desenhar(0)
    if (leitura.current) leitura.current.textContent = graus(dados.current[dados.current.length - 2])
    if (!mover) return
    const sorte = gerador(Date.now() % 2147483646 || 1)
    let visivel = true
    let quadro = 0
    let inicio = performance.now()
    let parado = 0
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting })
    io.observe(raiz.current!)
    const laco = (agora: number) => {
      quadro = requestAnimationFrame(laco)
      const rodar = visivel && !document.hidden && !pausadoRef.current
      if (!rodar) {
        if (!parado) parado = agora
        return
      }
      if (parado) { inicio += agora - parado; parado = 0 }
      let f = (agora - inicio) / ritmo.registrador.passoMs
      while (f >= 1) {
        const v = dados.current
        v.push(proximo(v[v.length - 1], sorte))
        v.shift()
        inicio += ritmo.registrador.passoMs
        f -= 1
        if (leitura.current) leitura.current.textContent = graus(v[v.length - 2])
      }
      desenhar(f)
    }
    quadro = requestAnimationFrame(laco)
    return () => { cancelAnimationFrame(quadro); io.disconnect() }
  }, [mover])

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      // O traço se desenha no carregamento (revelação por recorte, sem mexer no layout).
      gsap.fromTo(revela.current, { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: 'power2.inOut', delay: 0.35, transformOrigin: '0 0' })
      gsap.from('[data-abertura-surge]', { opacity: 0, y: ritmo.distancia, duration: ritmo.media, ease: ritmo.entra, stagger: ritmo.escalonar, delay: 0.5 })
      // Costura: ao sair, a linha achata e desce, virando o fio de topo da foto seguinte.
      gsap.to(grafico.current, {
        scaleY: 0.04, y: () => window.innerHeight * 0.12, transformOrigin: '50% 100%', ease: 'none',
        scrollTrigger: { trigger: raiz.current, start: 'bottom 85%', end: 'bottom top', scrub: ritmo.scrub, invalidateOnRefresh: true },
      })
    })
  }, { scope: raiz })

  return (
    <header ref={raiz} className="escuro relative overflow-hidden bg-grafite text-gelo">
      <a href="#conteudo" className="pular">Pular para o conteúdo</a>
      <div className="conteudo flex min-h-[64px] items-center justify-between gap-6 pt-5">
        <p className="titulo text-[1.375rem]" translate="no">{empresa.nome}</p>
        <nav aria-label="Seções" className="hidden items-center gap-7 text-[0.9375rem] text-aco-claro lg:flex">
          {navegacao.map((n) => <a key={n.href} href={n.href} className="inline-flex min-h-[44px] items-center hover:text-gelo">{n.rotulo}</a>)}
        </nav>
        <a href="#contato" className="botao-linha text-[0.9375rem] text-gelo">{abertura.cta}</a>
      </div>

      <div id="conteudo" className="conteudo grid gap-8 pb-10 pt-12 md:pt-14 lg:grid-cols-12 lg:pb-6">
        <div className="lg:col-span-8 xl:col-span-9">
          <p data-abertura-surge className="rotulo mb-6 text-aco-claro">{abertura.sobretitulo}</p>
          <h1 className="titulo text-[clamp(2.4rem,10.5vw,3.3rem)] md:text-[min(6vw,5.6rem)]">
            {abertura.titulo.map((l, i) => (
              <span key={l} className="linha-titulo" style={{ ['--i' as string]: i }}><span>{l}{i < abertura.titulo.length - 1 ? ' ' : ''}</span></span>
            ))}
          </h1>
        </div>
        <div className="flex flex-col justify-end gap-6 lg:col-span-4 lg:pb-3 xl:col-span-3">
          <p data-abertura-surge className="max-w-[38ch] text-[1.0625rem] leading-relaxed text-aco-claro">{abertura.texto}</p>
          <div data-abertura-surge>
            <a href="#contato" className="botao">{abertura.cta}</a>
          </div>
        </div>
      </div>

      <figure className="conteudo relative pb-14 md:pb-20">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className="rotulo text-aco-claro">
            {abertura.leitura}
            <span className="ml-3 text-gelo" aria-live="off">
              <span ref={leitura} className="numeros titulo text-[1.75rem] text-destaque md:text-[2.25rem]">−18,0 °C</span>
            </span>
          </p>
          <div className="flex items-center gap-4">
            <span className="rotulo text-aco-claro">{abertura.faixaAlvo}</span>
            {mover && (
              <button
                type="button"
                aria-pressed={pausado}
                onClick={() => pausar((p) => !p)}
                className="rotulo inline-flex min-h-[44px] items-center gap-2 rounded-full border border-aco/50 px-4 text-gelo hover:border-gelo"
              >
                <span aria-hidden className="inline-flex h-3 w-3 items-center justify-center gap-[3px]">
                  {pausado ? <span className="h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current" />
                    : <><span className="h-3 w-[3px] bg-current" /><span className="h-3 w-[3px] bg-current" /></>}
                </span>
                {pausado ? abertura.retomar : abertura.pausar}
              </button>
            )}
          </div>
        </div>
        <div ref={grafico} data-registrador className="relative border-y border-aco/25" /* taste-skill-ignore: eixos do gráfico */>
          <svg viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" className="block h-[150px] w-full md:h-[220px]" aria-hidden>
            <defs>
              <clipPath id="abertura-revela">
                <rect ref={revela} x="0" y="-20" width={L} height={A + 40} />
              </clipPath>
            </defs>
            <rect x="0" y={y(ALVO.max)} width={L} height={y(ALVO.min) - y(ALVO.max)} fill="currentColor" className="text-destaque" opacity="0.08" />
            <line x1="0" x2={L} y1={y(ALVO.max)} y2={y(ALVO.max)} stroke="currentColor" className="text-aco" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2={L} y1={y(ALVO.min)} y2={y(ALVO.min)} stroke="currentColor" className="text-aco" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
            <g clipPath="url(#abertura-revela)">
              <path ref={traco} fill="none" stroke="currentColor" className="text-destaque" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {/* Ponto da leitura atual em HTML (o SVG esticado deformaria o círculo). */}
          <div className="pointer-events-none absolute inset-0 [container-type:size]" aria-hidden>
            <span ref={ponto} className="absolute right-0 top-0 block h-3 w-3 rounded-full bg-destaque" />
          </div>
        </div>
        <figcaption className="mt-3 max-w-[70ch] text-[0.8125rem] text-aco-claro">{abertura.legendaGrafico}</figcaption>
      </figure>
    </header>
  )
}
