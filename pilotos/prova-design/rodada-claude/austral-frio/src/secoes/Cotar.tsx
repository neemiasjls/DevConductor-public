import { useRef, useState } from 'react'
import Foto from '../componentes/Foto'
import { cotar } from '../data/conteudo'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'

// Como cotar (Dados e prova): os fios de cada passo crescem da esquerda com a rolagem e o contador
// de passos (restilizado como leitura do registrador) acompanha. Livre, sem prender.
export default function Cotar() {
  const raiz = useRef<HTMLElement>(null)
  const contador = useRef<HTMLSpanElement>(null)
  const [falhou, falhar] = useState(false)
  const semFoto = <p className="flex aspect-[16/9] items-center justify-center bg-gelo-2 p-6 text-center text-[0.9375rem]">Foto indisponível: {cotar.alt}</p>

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      const passos = gsap.utils.toArray<HTMLElement>('[data-passo]')
      passos.forEach((p, i) => {
        gsap.fromTo(p.querySelector('[data-fio]'), { scaleX: 0 }, {
          scaleX: 1, ease: 'none', transformOrigin: '0 50%',
          scrollTrigger: {
            trigger: p, start: 'top 82%', end: 'top 52%', scrub: ritmo.scrub,
            onToggle: (st) => { if (st.isActive && contador.current) contador.current.textContent = String(i + 1) },
            onLeaveBack: () => { if (contador.current) contador.current.textContent = String(Math.max(1, i)) },
          },
        })
        gsap.fromTo(p.querySelectorAll('[data-passo-texto]'), { opacity: 0.25 }, {
          opacity: 1, ease: 'none',
          scrollTrigger: { trigger: p, start: 'top 80%', end: 'top 58%', scrub: ritmo.scrub },
        })
      })
      if (contador.current) contador.current.textContent = '1'
      return () => { if (contador.current) contador.current.textContent = '4' }
    })
  }, { scope: raiz })

  return (
    <section ref={raiz} id="cotar" data-leitura aria-labelledby="cotar-titulo" className="bg-gelo pb-24 text-grafite md:pb-32">
      <div className="conteudo grid gap-12 pt-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="rotulo mb-4 text-aco-escuro">{cotar.rotulo}</p>
            <h2 id="cotar-titulo" className="titulo text-[clamp(1.9rem,7.4vw,2.4rem)] md:text-[min(4.4vw,3.4rem)]">{cotar.titulo}</h2>
            <p className="rotulo mt-8 text-aco-escuro" aria-hidden>
              Passo <span ref={contador} className="numeros titulo text-[2.5rem] text-destaque-tinta">4</span> <span className="numeros">de 4</span>
            </p>
            <figure className="mt-8 hidden lg:block">
              <div className="overflow-hidden rounded-[var(--raio)]">
                {falhou ? semFoto : <Foto nome="trailer-largo" alt={cotar.alt} sizes="40vw" loading="lazy" onError={() => falhar(true)} className="aspect-[16/9] w-full object-cover" />}
              </div>
              <figcaption className="mt-2 text-[0.8125rem] text-aco-escuro">{cotar.credito}</figcaption>
            </figure>
          </div>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <ol>
            {cotar.passos.map((p) => (
              <li key={p.n} data-passo className="relative grid grid-cols-[3.5rem_1fr] gap-4 py-7 md:grid-cols-[5rem_1fr]">
                <span data-fio aria-hidden className="absolute inset-x-0 top-0 h-px bg-grafite/30" /* taste-skill-ignore: fios que crescem (técnica da seção no plano) */ />
                <span data-passo-texto className="numeros titulo text-[1.5rem] text-aco-escuro md:text-[2rem]">{p.n}</span>
                <div data-passo-texto>
                  <h3 className="text-[1.1875rem] font-semibold md:text-[1.375rem]">{p.titulo}</h3>
                  <p className="mt-2 max-w-[44ch] text-[1rem] leading-relaxed text-aco-escuro">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-[var(--raio)] border border-grafite/15 bg-gelo-2 p-6">
            <p className="rotulo text-aco-escuro">{cotar.prazoRotulo}</p>
            <p className="numeros titulo mt-1 text-[2rem] text-destaque-tinta">{cotar.prazo}</p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-aco-escuro">{cotar.prazoNota}</p>
          </div>
          <figure className="mt-8 lg:hidden">
            <div className="overflow-hidden rounded-[var(--raio)]">
              {falhou ? semFoto : <Foto nome="trailer-largo" alt={cotar.alt} sizes="92vw" loading="lazy" onError={() => falhar(true)} className="aspect-[16/9] w-full object-cover" />}
            </div>
            <figcaption className="mt-2 text-[0.8125rem] text-aco-escuro">{cotar.credito}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
