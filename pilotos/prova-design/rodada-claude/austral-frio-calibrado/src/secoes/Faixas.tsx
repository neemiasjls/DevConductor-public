import { useRef, useState } from 'react'
import type { PointerEvent as PE } from 'react'
import { faixas, whats } from '../data/conteudo'
import type { Faixa } from '../data/conteudo'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'

// Faixas de temperatura (Interação + cor que invade): ao passar o cursor, tocar ou focar uma faixa, a cor
// daquela temperatura invade a seção a partir do botão e a ficha técnica troca. Sem prender a rolagem.

const cores: Record<Faixa['id'], string> = {
  congelado: 'oklch(0.27 0.045 248)',
  resfriado: 'oklch(0.31 0.035 205)',
  climatizado: 'oklch(0.33 0.016 80)',
}

// Linha do registrador dentro da faixa (mesmo gesto da abertura, em miniatura e parado).
function MiniRegistro({ f }: { f: Faixa }) {
  const L = 320, A = 90
  const lo = f.min - (f.max - f.min) * 0.6, hi = f.max + (f.max - f.min) * 0.6
  const y = (t: number) => A - ((t - lo) / (hi - lo)) * A
  let s = f.id.length * 97
  const sorte = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const meio = (f.min + f.max) / 2, amp = (f.max - f.min) / 2
  const pts = Array.from({ length: 33 }, (_, i) => {
    const v = meio + amp * 0.75 * Math.sin(i * 0.55 + f.min) * 0.6 + (sorte() - 0.5) * amp * 0.5
    return `${i ? 'L' : 'M'}${(i * L / 32).toFixed(1)} ${y(v).toFixed(1)}`
  }).join('')
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full max-w-[320px]" aria-hidden>
      <rect x="0" y={y(f.max)} width={L} height={y(f.min) - y(f.max)} fill="currentColor" className="text-destaque" opacity="0.14" />
      <path d={pts} fill="none" stroke="currentColor" className="text-destaque" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export default function Faixas() {
  const raiz = useRef<HTMLElement>(null)
  const invasor = useRef<HTMLDivElement>(null)
  const ficha = useRef<HTMLDivElement>(null)
  const [ativa, mudar] = useState(0)
  const atual = useRef(0)
  const tween = useRef<gsap.core.Tween | null>(null)
  const f = faixas.itens[ativa]

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      gsap.fromTo('[data-fio-topo]', { scaleX: 0 }, {
        scaleX: 1, ease: 'none', transformOrigin: '0 50%',
        scrollTrigger: { trigger: raiz.current, start: 'top bottom', end: 'top 40%', scrub: ritmo.scrub },
      })
      // Troca para reduzido (ou desmontagem) no meio da invasão: termina na cor final na hora.
      return () => { tween.current?.progress(1).kill(); tween.current = null }
    })
  }, { scope: raiz })

  // A ficha nova entra curta (só com movimento); não repete o efeito de entrada de outras seções.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      gsap.fromTo(ficha.current!.querySelectorAll('[data-ficha-item]'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: ritmo.curta + 0.1, ease: ritmo.entra, stagger: 0.04 })
    })
  }, { dependencies: [ativa], scope: raiz, revertOnUpdate: true })

  const selecionar = (i: number, origem?: HTMLElement) => {
    if (i === atual.current) return
    atual.current = i
    mudar(i)
    const secao = raiz.current!, cor = cores[faixas.itens[i].id]
    tween.current?.progress(1)
    if (!matchMedia(consultas.mover).matches || !origem) {
      secao.style.backgroundColor = cor
      return
    }
    const rs = secao.getBoundingClientRect(), ro = origem.getBoundingClientRect()
    const cx = ro.left + ro.width / 2 - rs.left, cy = ro.top + ro.height / 2 - rs.top
    const raio = Math.hypot(Math.max(cx, rs.width - cx), Math.max(cy, rs.height - cy))
    const el = invasor.current!
    Object.assign(el.style, { left: `${cx - raio}px`, top: `${cy - raio}px`, width: `${raio * 2}px`, height: `${raio * 2}px`, backgroundColor: cor })
    tween.current = gsap.fromTo(el, { scale: 0, opacity: 1 }, {
      scale: 1, duration: ritmo.longa, ease: 'power2.inOut',
      onComplete: () => { secao.style.backgroundColor = cor; gsap.set(el, { opacity: 0, scale: 0 }) },
    })
  }

  const porMouse = (i: number) => (e: PE<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse') selecionar(i, e.currentTarget)
  }

  return (
    <section
      ref={raiz}
      id="faixas"
      data-leitura
      aria-labelledby="faixas-titulo"
      className="escuro relative isolate overflow-hidden text-gelo"
      style={{ backgroundColor: cores.congelado }}
    >
      <div aria-hidden ref={invasor} className="pointer-events-none absolute -z-10 rounded-full opacity-0" />
      <div data-fio-topo aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-destaque" />
      <div className="conteudo grid gap-12 py-20 md:py-28 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="rotulo mb-4 text-aco-claro">{faixas.rotulo}</p>
          <h2 id="faixas-titulo" className="titulo max-w-[18ch] text-[clamp(1.9rem,7.4vw,2.4rem)] md:text-[min(4.4vw,3.4rem)]">{faixas.titulo}</h2>
          <p className="mt-5 max-w-[44ch] text-[1.0625rem] leading-relaxed text-aco-claro">{faixas.texto}</p>
          <div role="group" aria-label="Faixas de temperatura" className="mt-10 grid gap-3">
            {faixas.itens.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={i === ativa}
                aria-controls="faixa-ficha"
                onClick={(e) => selecionar(i, e.currentTarget)}
                onFocus={(e) => selecionar(i, e.currentTarget)}
                onPointerEnter={porMouse(i)}
                /* taste-skill-ignore: fio marca a faixa escolhida */ className="group flex min-h-[64px] items-baseline justify-between gap-4 border-t border-gelo/25 py-4 text-left aria-pressed:border-destaque"
              >
                <span className="titulo text-[1.6rem] md:text-[2rem] group-aria-pressed:text-gelo text-gelo/65">{item.nome}</span>
                <span className="numeros text-[1.0625rem] text-aco-claro group-aria-pressed:text-destaque">{item.temperatura}</span>
              </button>
            ))}
          </div>
        </div>

        <div id="faixa-ficha" ref={ficha} aria-live="polite" className="lg:col-span-5 lg:col-start-8 lg:pt-16">
          <div data-ficha-item className="flex items-baseline justify-between pb-2">
            <p className="titulo text-[1.5rem]">{f.nome}</p>
            <p className="numeros titulo text-[2.25rem] text-destaque md:text-[2.75rem]">{f.temperatura}</p>
          </div>
          <div data-ficha-item className="py-5"><MiniRegistro f={f} /></div>
          <dl>
            {[f.produtos, f.bau, f.registro].map((v, i) => (
              <div key={faixas.ficha[i]} data-ficha-item /* taste-skill-ignore: linhas da ficha técnica (tabela) */ className="grid gap-1 border-t border-gelo/20 py-4 sm:grid-cols-[7rem_1fr] sm:gap-4">
                <dt className="rotulo text-aco-claro">{faixas.ficha[i]}</dt>
                <dd className="text-[1rem] leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
          <a data-ficha-item href={whats(f.whats)} target="_blank" rel="noopener noreferrer" className="botao mt-6">{faixas.botao}</a>
        </div>
      </div>
    </section>
  )
}
