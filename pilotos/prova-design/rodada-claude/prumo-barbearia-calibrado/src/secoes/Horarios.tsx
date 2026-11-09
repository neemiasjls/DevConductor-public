import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas } from '../ritmo'
import { horarios, whatsapp } from '../data/conteudo'

const { inicio, fim, dias } = horarios
const UNID = 10 // unidades do SVG por hora
const ALTURA = (fim - inicio) * UNID
const hora = (h: number) => `${Math.floor(h)}h${h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, '0') : ''}`
const faixaTexto = (f: [number, number][]) => (f.length ? f.map(([a, b]) => `${hora(a)}–${hora(b)}`).join(' · ') : horarios.fechado)

// Ilustração viva (linha desenhada): a grade da semana com as faixas abertas que se desenham na leitura.
export default function Horarios() {
  const secao = useRef<HTMLElement>(null)
  const [agora] = useState(() => new Date())
  const hoje = agora.getDay()
  const horaAgora = agora.getHours() + agora.getMinutes() / 60

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      gsap.fromTo('[data-traco]', { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: 'none', stagger: 0.08,
        scrollTrigger: { trigger: '[data-grade]', start: 'top 78%', end: 'bottom 55%', scrub: 0.5 },
      })
      gsap.fromTo('[data-hora-fio]', { scaleX: 0 }, {
        scaleX: 1, ease: 'none', stagger: 0.02,
        scrollTrigger: { trigger: '[data-grade]', start: 'top 85%', end: 'top 45%', scrub: 0.5 },
      })
    })
    return () => mm.revert()
  }, { scope: secao })

  const horas = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i)
  return (
    <section id="horarios" ref={secao} data-leitura aria-labelledby="horarios-titulo" className="relative bg-grafite">
      <div className="mx-auto grid max-w-[1360px] gap-10 px-5 py-24 md:grid-cols-12 md:gap-8 md:px-[5vw] md:py-36">
        <div className="md:col-span-4">
          <p className="dado text-[11px] uppercase tracking-[0.12em] text-cobre">05 · {horarios.rotulo}</p>
          <h2 id="horarios-titulo" className="titulo mt-4 text-[30px] md:text-[clamp(34px,3.4vw,48px)]">{horarios.titulo}</h2>
          <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-nevoa md:text-[16px]">{horarios.texto}</p>
          <ul aria-label="Horários de funcionamento" className="mt-8 grid gap-2 text-[14px]">
            {dias.map((d) => (
              <li key={d.dia} className="flex justify-between gap-4 border-b border-giz/10 pb-2">
                <span className={d.dia === hoje ? 'font-semibold text-cobre' : ''}>
                  {d.nome}{d.dia === hoje && <span className="dado ml-2 text-[11px]">· {horarios.hoje}</span>}
                </span>
                <span className="dado text-[12px] text-nevoa">{faixaTexto(d.faixas)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-nevoa/80">{horarios.aviso}</p>
        </div>

        <div data-grade className="hidden md:block md:col-span-8 md:col-start-5 lg:col-span-7 lg:col-start-6">
          {/* Cabeçalho: os dias (link de WhatsApp com o dia já escrito) */}
          <div className="grid grid-cols-[36px_repeat(7,minmax(0,1fr))] md:grid-cols-[48px_repeat(7,minmax(0,1fr))]">
            <span />
            {dias.map((d) => {
              const aberto = d.faixas.length > 0
              const classe = `flex min-h-[44px] flex-col items-center justify-center rounded-[4px] text-center ${d.dia === hoje ? 'text-cobre' : aberto ? 'text-giz' : 'text-nevoa/70'}`
              const conteudo = (
                <>
                  <span className="dado text-[11px] md:text-[13px]">{d.curto}</span>
                  <span className="dado text-[10px] md:text-[11px]">{d.dia === hoje ? horarios.hoje : aberto ? '' : horarios.fechado}</span>
                </>
              )
              return aberto ? (
                <a key={d.dia} href={whatsapp(horarios.mensagem(d.nome))} aria-label={`${d.nome}: ${faixaTexto(d.faixas)}. Perguntar horário pelo WhatsApp`} className={`${classe} transition-colors hover:bg-giz/5`}>{conteudo}</a>
              ) : (
                <span key={d.dia} className={classe} aria-label={`${d.nome}: ${horarios.fechado}`}>{conteudo}</span>
              )
            })}
          </div>

          {/* Grade: horas à esquerda, linhas da semana à direita */}
          <div aria-hidden className="relative mt-2 hidden md:grid md:grid-cols-[48px_minmax(0,1fr)]">
            <div className="relative h-[300px] md:h-[400px]">
              {horas.filter((h) => h % 2 === 0).map((h) => (
                <span key={h} className="dado absolute right-2 -translate-y-1/2 text-[10px] text-nevoa/80 md:text-[11px]" style={{ top: `${((h - inicio) / (fim - inicio)) * 100}%` }}>
                  {h}h
                </span>
              ))}
            </div>
            <div className="relative h-[300px] md:h-[400px]">
              {horas.map((h) => (
                <span key={h} data-hora-fio className="absolute inset-x-0 h-px origin-left bg-giz/10" style={{ top: `${((h - inicio) / (fim - inicio)) * 100}%` }} />
              ))}
              <svg viewBox={`0 0 700 ${ALTURA}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                {dias.map((d, i) => (
                  <g key={d.dia}>
                    {d.dia === hoje && <rect x={i * 100 + 8} y={0} width={84} height={ALTURA} fill="oklch(0.74 0.12 55 / 0.07)" />}
                    <line x1={i * 100 + 50} x2={i * 100 + 50} y1={0} y2={ALTURA} stroke="oklch(0.94 0.01 170 / 0.08)" vectorEffect="non-scaling-stroke" strokeDasharray="2 4" />
                    {d.faixas.map(([a, b]) => (
                      <line
                        key={a}
                        data-traco
                        x1={i * 100 + 50}
                        x2={i * 100 + 50}
                        y1={(a - inicio) * UNID}
                        y2={(b - inicio) * UNID}
                        pathLength={1}
                        strokeDasharray="1 1"
                        stroke={d.dia === hoje ? 'oklch(0.74 0.12 55)' : 'oklch(0.94 0.01 170 / 0.72)'}
                        strokeWidth={14}
                      />
                    ))}
                  </g>
                ))}
              </svg>
              {/* Agora: risco na coluna de hoje */}
              {horaAgora >= inicio && horaAgora <= fim && (
                <span
                  className="absolute h-[2px] -translate-y-1/2 bg-cobre"
                  style={{ top: `${((horaAgora - inicio) / (fim - inicio)) * 100}%`, left: `${(dias.findIndex((d) => d.dia === hoje) / 7) * 100 + 1}%`, width: `${(1 / 7) * 100 - 2}%` }}
                >
                  <span className="dado absolute -top-[16px] left-0 text-[9px] text-cobre md:text-[10px]">agora</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
