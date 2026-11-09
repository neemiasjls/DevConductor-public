import { useEffect, useRef } from 'react'
import { viagem } from '../data/conteudo'
import { fracaoRota, HORAS, registro, temperaturaEm } from '../data/registro'
import { faixa, gsap, ScrollTrigger, useGSAP } from '../gsap'
import { irPara } from '../rolagem'
import { consultas, ritmo } from '../ritmo'
import { graus, usePrefere } from '../usos'

// A viagem (clímax, Espaço + dados): cena presa com etapas. O gráfico de temperatura avança com a rolagem,
// marcos acendem e o mini-mapa acompanha o mesmo progresso. Celular: mesmo gráfico com eixo vertical.
// No fim o gráfico encolhe e vira o fio de topo da seção de faixas.
// LP-12: com movimento, só o marco atual mostra o texto (os outros ficam com hora e título; o espaço fica
// reservado, sem deslocar nada). No reduzido, todos aparecem.

const TMIN = -18.9
const TMAX = -16.5
const FIM_VIAGEM = 0.93 // até aqui a rolagem avança as horas; depois, o gráfico encolhe
const H_W = 1000, H_H = 300 // horizontal
const V_W = 260, V_H = 1000 // vertical

const hx = (h: number) => (h / HORAS) * H_W
const ty = (t: number) => 8 + ((TMAX - t) / (TMAX - TMIN)) * (H_H - 16)
const vy = (h: number) => (h / HORAS) * V_H
const tx = (t: number) => 8 + ((t - TMIN) / (TMAX - TMIN)) * (V_W - 16)

const caminhoH = registro.map((r, i) => `${i ? 'L' : 'M'}${hx(r.h).toFixed(1)} ${ty(r.t).toFixed(1)}`).join('')
const caminhoV = registro.map((r, i) => `${i ? 'L' : 'M'}${tx(r.t).toFixed(1)} ${vy(r.h).toFixed(1)}`).join('')

// Mini-mapa: projeção simples lon/lat → caixa 200×140 (posições aproximadas, sem fronteiras).
const LON = [-53.4, -46.0], LAT = [-27.8, -22.9]
const mx = (lon: number) => 14 + ((lon - LON[0]) / (LON[1] - LON[0])) * 172
const my = (lat: number) => 12 + ((LAT[1] - lat) / (LAT[1] - LAT[0])) * 116
const cidades = viagem.cidades.map((c) => ({ ...c, x: mx(c.lon), y: my(c.lat) }))
const seg = [Math.hypot(cidades[1].x - cidades[0].x, cidades[1].y - cidades[0].y), Math.hypot(cidades[2].x - cidades[1].x, cidades[2].y - cidades[1].y)]
const rota = { seg, total: seg[0] + seg[1] }
const HORAS_EIXO = [0, 6, 12, 18, 24, 30, 36]
const HORAS_ROTULO = [0, 12, 24, 36] // LP-12: as linhas de 6 em 6 h ficam; só 4 rótulos

export default function Viagem() {
  const raiz = useRef<HTMLElement>(null)
  const cena = useRef<HTMLDivElement>(null)
  const mover = usePrefere(consultas.mover)
  const celular = usePrefere(consultas.celular)
  const eixo = useRef<HTMLDivElement>(null)

  const aplicar = (p: number) => {
    const el = raiz.current
    if (!el) return
    const h = p * HORAS
    el.querySelectorAll<SVGPathElement>('[data-traco]').forEach((t) => {
      const total = Number(t.dataset.total)
      t.style.strokeDashoffset = String(total * (1 - p))
    })
    el.querySelector('[data-cursor-h]')?.setAttribute('transform', `translate(${hx(h).toFixed(1)} 0)`)
    el.querySelector('[data-cursor-v]')?.setAttribute('transform', `translate(0 ${vy(h).toFixed(1)})`)
    const hora = el.querySelector('[data-hora]'), temp = el.querySelector('[data-temp]')
    if (hora) hora.textContent = `${Math.round(h)} h`
    if (temp) temp.textContent = graus(temperaturaEm(h))
    let atual = 0
    viagem.marcos.forEach((m, i) => { if (h + 0.01 >= m.hora) atual = i })
    el.querySelectorAll<HTMLElement>('[data-marco]').forEach((m) => {
      const i = Number(m.dataset.marco)
      m.dataset.aceso = String(h + 0.01 >= viagem.marcos[i].hora)
      m.dataset.atual = String(i === atual)
    })
    // Ponto no mapa: interpola no traçado Chapecó → Curitiba → São Paulo.
    const d = fracaoRota(h) * rota.total
    const [a, b, c] = cidades
    const f1 = Math.min(1, d / rota.seg[0]), f2 = Math.max(0, (d - rota.seg[0]) / rota.seg[1])
    const px = d <= rota.seg[0] ? a.x + (b.x - a.x) * f1 : b.x + (c.x - b.x) * f2
    const py = d <= rota.seg[0] ? a.y + (b.y - a.y) * f1 : b.y + (c.y - b.y) * f2
    el.querySelector('[data-mapa-ponto]')?.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)})`)
    el.querySelectorAll<SVGPathElement>('[data-mapa-feito]').forEach((t) => {
      t.style.strokeDashoffset = String(rota.total - d)
    })
  }

  // Comprimento dos traços (uma vez); estado completo até a cena assumir (reduzido fica assim).
  // Recalcula também quando o SVG troca (horizontal <-> vertical ao cruzar 767 px) e reaplica o progresso atual.
  const gatilho = useRef<ScrollTrigger | null>(null)
  useEffect(() => {
    raiz.current?.querySelectorAll<SVGPathElement>('[data-traco]').forEach((t) => {
      const total = t.getTotalLength()
      t.dataset.total = String(total)
      t.style.strokeDasharray = String(total)
    })
    const st = gatilho.current
    aplicar(st && matchMedia(consultas.mover).matches ? faixa(0, FIM_VIAGEM, st.progress) : 1)
  }, [celular])

  // Rótulos das horas em HTML (legíveis em qualquer largura), alinhados à área real desenhada do SVG.
  useEffect(() => {
    const caixa = eixo.current?.parentElement
    if (!caixa) return
    const ro = new ResizeObserver(() => {
      const w = caixa.clientWidth, h = caixa.clientHeight - 28
      const s = Math.min(w / H_W, h / H_H)
      eixo.current!.style.left = `${(w - H_W * s) / 2}px`
      eixo.current!.style.width = `${H_W * s}px`
      eixo.current!.style.top = `${(h - H_H * s) / 2 + H_H * s + 6}px`
    })
    ro.observe(caixa)
    return () => ro.disconnect()
  }, [celular])

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      const st = ScrollTrigger.create({
        trigger: cena.current, start: 'top top', end: 'bottom bottom',
        onUpdate: (s) => aplicar(faixa(0, FIM_VIAGEM, s.progress)),
        onRefresh: (s) => aplicar(faixa(0, FIM_VIAGEM, s.progress)),
      })
      gatilho.current = st
      aplicar(faixa(0, FIM_VIAGEM, st.progress))
      // Saída: o gráfico achata até virar um fio; leitura, mapa e marcos saem antes.
      const saida = gsap.timeline({ scrollTrigger: { trigger: cena.current, start: () => `top+=${(cena.current!.offsetHeight - innerHeight) * 0.95} top`, end: 'bottom bottom', scrub: ritmo.scrub, invalidateOnRefresh: true } })
      saida.to('[data-viagem-grafico]', { scaleY: 0.012, transformOrigin: '50% 100%', ease: 'none' }, 0)
        .to('[data-viagem-sai]', { opacity: 0, ease: 'none', duration: 0.6 }, 0)
      return () => { gatilho.current = null; aplicar(1) }
    })
  }, { scope: raiz })

  const focar = (hora: number) => {
    if (!matchMedia(consultas.mover).matches || !cena.current) return
    const topo = cena.current.getBoundingClientRect().top + window.scrollY
    const percurso = cena.current.offsetHeight - window.innerHeight
    irPara(topo + ((hora / HORAS) * FIM_VIAGEM + 0.004) * percurso)
  }

  const Marco = mover ? 'button' : 'div'

  return (
    <section ref={raiz} id="viagem" aria-labelledby="viagem-titulo" className="escuro relative bg-grafite text-gelo">
      <div data-densidade="Entrada da Viagem junto ao fim do Compromisso; composição mantida no plano de 05/11" className="conteudo grid gap-6 pb-6 pt-6 md:pb-8 md:pt-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="rotulo mb-4 text-aco-claro">{viagem.rotulo}</p>
          <h2 id="viagem-titulo" className="titulo text-[clamp(1.9rem,7.4vw,2.4rem)] md:text-[min(4.6vw,3.6rem)]">{viagem.titulo}</h2>
        </div>
        <div className="flex flex-col justify-end gap-3 lg:col-span-5">
          <p className="rotulo text-aco">{viagem.aviso}</p>
        </div>
      </div>

      <div ref={cena} className="cena" style={{ ['--telas' as string]: ritmo.viagem.desktop, ['--telas-cel' as string]: ritmo.viagem.celular }}>
        <div className="palco">
          <div className="conteudo flex h-full flex-col gap-4 py-5 md:gap-6 md:py-10 motion-reduce:h-auto">
            {/* Leitura atual + mini-mapa */}
            <div data-viagem-sai className="flex items-start justify-between gap-4 pb-2">
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1">
                <p className="rotulo text-aco-claro">
                  <span className="block md:mb-1">Hora</span>
                  <span data-hora className="numeros titulo text-[1.75rem] text-gelo md:text-[2.5rem]">36 h</span>
                </p>
                <p className="rotulo text-aco-claro">
                  <span className="block md:mb-1">No baú</span>
                  <span data-temp className="numeros titulo text-[1.75rem] text-destaque md:text-[2.5rem]">{graus(registro[registro.length - 1].t)}</span>
                </p>
              </div>
              <figure className="shrink-0">
                <svg viewBox="0 0 200 140" className="h-[64px] w-[92px] md:h-[118px] md:w-[168px]" role="img" aria-label={`Mapa: ${cidades.map((c) => c.nome).join(', ')}`}>
                  <path d={`M${cidades[0].x} ${cidades[0].y}L${cidades[1].x} ${cidades[1].y}L${cidades[2].x} ${cidades[2].y}`} fill="none" stroke="currentColor" className="text-aco/50" strokeWidth="1.5" strokeDasharray="3 4" />
                  <path data-mapa-feito d={`M${cidades[0].x} ${cidades[0].y}L${cidades[1].x} ${cidades[1].y}L${cidades[2].x} ${cidades[2].y}`} fill="none" stroke="currentColor" className="text-destaque" strokeWidth="2.2" style={{ strokeDasharray: rota.total }} />
                  {cidades.map((c) => (
                    <g key={c.nome}>
                      <circle cx={c.x} cy={c.y} r="3.5" fill="currentColor" className="text-gelo" />
                      <text x={c.x + (c.nome === 'São Paulo' ? -8 : 7)} y={c.y + (c.nome === 'Chapecó' ? 18 : -9)} textAnchor={c.nome === 'São Paulo' ? 'end' : 'start'} fill="currentColor" className="text-aco-claro max-md:hidden" fontSize="15">{c.nome}</text>
                    </g>
                  ))}
                  <g data-mapa-ponto>
                    <circle r="9" fill="currentColor" className="text-destaque" opacity="0.25" />
                    <circle r="5" fill="currentColor" className="text-destaque" />
                  </g>
                </svg>
                <figcaption className="sr-only">{viagem.mapaLegenda} {cidades.map((c) => c.nome).join(' → ')}</figcaption>
              </figure>
            </div>

            <div className="flex min-h-0 flex-1 gap-5 md:flex-col md:gap-6">
              {/* Gráfico: horizontal no computador, vertical no celular (mesmos dados). */}
              <div data-viagem-grafico className="relative min-h-0 shrink-0 md:flex-1 motion-reduce:md:h-[340px] motion-reduce:md:flex-none">
                {celular ? (
                  <div className="relative h-full w-[112px]">
                    <svg viewBox={`0 0 ${V_W} ${V_H}`} preserveAspectRatio="xMinYMin meet" className="h-full max-h-[62svh] w-full motion-reduce:h-[440px]" aria-hidden>
                      <rect x={tx(-18.4)} y="0" width={tx(-17.6) - tx(-18.4)} height={V_H} fill="currentColor" className="text-destaque" opacity="0.1" />
                      <line x1="0" x2="0" y1="0" y2={V_H} stroke="currentColor" className="text-aco/40" />
                      {viagem.marcos.map((m, i) => (
                        <circle key={m.id} data-marco={i} cx={tx(temperaturaEm(m.hora))} cy={vy(m.hora)} r="14" className="marco-ponto" />
                      ))}
                      <path data-traco d={caminhoV} fill="none" stroke="currentColor" className="text-destaque" strokeWidth="7" strokeLinejoin="round" />
                      <g data-cursor-v><line x1="0" x2={V_W} y1="0" y2="0" stroke="currentColor" className="text-gelo/60" strokeWidth="3" /></g>
                    </svg>
                  </div>
                ) : (
                  <div className="relative h-full">
                    <svg viewBox={`0 0 ${H_W} ${H_H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-x-0 top-0 h-[calc(100%-28px)] w-full" aria-hidden>
                      <rect x="0" y={ty(-17.6)} width={H_W} height={ty(-18.4) - ty(-17.6)} fill="currentColor" className="text-destaque" opacity="0.09" />
                      {HORAS_EIXO.map((h) => (
                        <line key={h} x1={hx(h)} x2={hx(h)} y1="0" y2={H_H} stroke="currentColor" className="text-aco/25" strokeWidth="1" />
                      ))}
                      {viagem.marcos.map((m, i) => (
                        <circle key={m.id} data-marco={i} cx={hx(m.hora)} cy={ty(temperaturaEm(m.hora))} r="6" className="marco-ponto" />
                      ))}
                      <path data-traco d={caminhoH} fill="none" stroke="currentColor" className="text-destaque" strokeWidth="2.6" strokeLinejoin="round" />
                      <g data-cursor-h><line x1="0" x2="0" y1="0" y2={H_H} stroke="currentColor" className="text-gelo/50" strokeWidth="1.2" /></g>
                    </svg>
                    <div ref={eixo} aria-hidden className="rotulo numeros absolute h-5 text-aco-claro">
                      {HORAS_ROTULO.map((h) => (
                        <span key={h} className="absolute top-0 whitespace-nowrap" style={{ left: `${(h / HORAS) * 100}%`, transform: `translateX(${h === 0 ? 0 : h === HORAS ? -100 : -50}%)` }}>{h} h</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <ol data-viagem-sai data-leitura={!mover || undefined} className="grid min-w-0 flex-1 content-start gap-2 md:flex-none md:grid-cols-3 md:gap-5 lg:grid-cols-5">
                {viagem.marcos.map((m, i) => (
                  <li key={m.id} data-marco={i} className="marco min-w-0">
                    <Marco
                      {...(mover ? { type: 'button' as const, onFocus: () => focar(m.hora), onClick: () => focar(m.hora) } : {})}
                      /* taste-skill-ignore: fio indica o marco atual */ className="block w-full border-t border-aco/30 pt-2 text-left md:pt-3"
                    >
                      <span className="rotulo numeros block text-aco-claro">{m.hora} h</span>
                      <span className="mt-0.5 block text-[0.9375rem] font-semibold leading-snug md:text-[1.0625rem]">{m.titulo}</span>
                      <span className="marco-texto mt-0.5 block text-[0.8125rem] leading-snug text-aco-claro md:mt-1 md:text-[0.9375rem]">{m.texto}</span>
                    </Marco>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
