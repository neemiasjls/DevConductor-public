import { useRef } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas, cor, ritmo } from '../ritmo'
import { rotas } from '../data/conteudo'
import { CarretaCima, CarretaPerfil, RODA_PROPORCAO } from './desenhos'

const TOTAL = rotas.paradas[rotas.paradas.length - 1].km
const fracoes = rotas.paradas.map((p) => p.km / TOTAL)

// Rota com veículo (família Ilustração viva), presa. Computador: perfil técnico numa linha horizontal.
// Celular: a mesma cena na vertical, carreta vista de cima descendo a linha.
export default function Rotas() {
  const raiz = useRef<HTMLElement>(null)
  const involucro = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: consultas.mover, largo: consultas.largo }, (ctx) => {
      const { mover, largo } = ctx.conditions as { mover: boolean; largo: boolean }
      if (!mover) return
      const d = raiz.current!.querySelector<HTMLElement>(`[data-diagrama="${largo ? 'lado' : 'cima'}"]`)!
      const linha = d.querySelector<HTMLElement>('[data-linha]')!
      const veiculo = d.querySelector<HTMLElement>('[data-veiculo]')!
      const percorrido = d.querySelector<HTMLElement>('[data-percorrido]')!
      const paradas = Array.from(d.querySelectorAll<HTMLElement>('[data-parada]'))
      const pontos = Array.from(d.querySelectorAll<HTMLElement>('[data-ponto]'))
      const rodas = Array.from(d.querySelectorAll<SVGGElement>('[data-roda]'))
      const comp = () => (largo ? linha.offsetWidth : linha.offsetHeight)
      const eixo = largo ? 'x' : 'y'
      const escala = largo ? 'scaleX' : 'scaleY'

      gsap.set(percorrido, { [escala]: 0, transformOrigin: largo ? 'left center' : 'center top' })
      gsap.set(paradas.slice(1), { opacity: 0.25 })
      gsap.set('[data-extra]', { autoAlpha: 0, y: ritmo.distancia * 2 })
      if (rodas.length) gsap.set(rodas, { transformOrigin: '50% 50%' })

      const tl = gsap.timeline({
        defaults: { ease: 'power1.inOut' },
        scrollTrigger: {
          trigger: involucro.current, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true,
        },
        onUpdate: () => {
          if (!rodas.length) return
          const x = gsap.getProperty(veiculo, 'x') as number
          const r = Math.max(1, veiculo.offsetWidth * RODA_PROPORCAO)
          gsap.set(rodas, { rotation: (x / r) * (180 / Math.PI) })
        },
      })

      let t = 0.15
      for (let i = 1; i < fracoes.length; i++) {
        const dur = (fracoes[i] - fracoes[i - 1]) * 3.2
        const f = fracoes[i]
        tl.to(veiculo, { [eixo]: () => f * comp(), duration: dur }, t)
        tl.to(percorrido, { [escala]: f, duration: dur }, t)
        tl.to(paradas[i], { opacity: 1, duration: 0.18, ease: 'none' }, t + dur - 0.12)
        tl.fromTo(pontos[i], { scale: 1 }, { scale: 1.7, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }, t + dur - 0.06)
        t += dur + 0.18
      }
      tl.to('[data-extra]', { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.14, ease: ritmo.entra }, t)
      tl.to({}, { duration: 0.35 })
    })
    return () => mm.revert()
  }, { scope: raiz })

  return (
    <div ref={involucro} className="percurso-rota" style={{ '--rota-celular': `${ritmo.rota.celular}px`, '--rota-desktop': `${ritmo.rota.desktop}px` } as React.CSSProperties}>
    <section
      id="rotas"
      ref={raiz}
      aria-labelledby="rotas-titulo"
      className="relative overflow-hidden bg-carvao text-papel motion-safe:sticky motion-safe:top-0 motion-safe:h-[100svh]"
    >
      <div className="flex h-full flex-col px-5 pb-8 pt-32 md:px-10 lg:pb-12 lg:pt-28">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="numeros text-[12px] uppercase tracking-[0.16em] text-sinal">{rotas.numero} Rotas</p>
            <h2 id="rotas-titulo" className="titulo mt-3 max-w-[13ch] text-[clamp(36px,10.4vw,46px)] font-semibold lg:text-[clamp(48px,5.4vw,84px)]">
              {rotas.titulo}
            </h2>
          </div>
          <p className="max-w-[40ch] text-[14px] leading-relaxed text-nevoa md:text-[15px] lg:col-span-4 lg:col-start-9 lg:text-[17px]">
            {rotas.texto}
          </p>
        </div>

        {/* Computador: linha horizontal, carreta de perfil */}
        <div data-diagrama="lado" className="relative my-auto hidden pt-40 lg:block">
          <div data-linha className="relative ml-[26%] mr-[6%] h-[3px]">
            <div className="absolute inset-0 bg-papel/20" />
            <div data-percorrido className="absolute inset-0 bg-sinal" />
            {rotas.paradas.map((p, i) => {
              const ultima = i === rotas.paradas.length - 1
              return (
                <div key={p.cidade} data-parada className="absolute top-0" style={{ left: `${fracoes[i] * 100}%` }}>
                  <span data-ponto className="absolute -left-[7px] -top-[6px] block size-[15px] rounded-full border-[3px] border-sinal bg-carvao" />
                  <div className={`absolute bottom-[132px] w-max ${ultima ? 'right-0 text-right' : 'left-0'}`}>
                    <p className="titulo text-[clamp(22px,2.1vw,32px)] font-semibold">{p.cidade}</p>
                    <p className="mt-1 text-[13px] text-nevoa">{p.uf}</p>
                  </div>
                  <div className={`absolute top-6 w-max ${ultima ? 'right-0 text-right' : 'left-0'}`}>
                    <p className="numeros text-[14px]">{p.km === 0 ? 'km 0' : `≈ ${p.km} km`}</p>
                    <p className="mt-0.5 text-[13px] text-nevoa">{p.papel}</p>
                  </div>
                </div>
              )
            })}
            <div data-veiculo className="absolute bottom-[2px] right-full w-[clamp(240px,24vw,380px)] text-papel">
              <CarretaPerfil fundo={cor.carvao} rotulo={rotas.carretaAlt} className="block h-auto w-full" />
            </div>
          </div>
        </div>

        {/* Celular e tablet: a mesma rota na vertical */}
        <div data-diagrama="cima" className="relative mt-6 min-h-[250px] flex-1 lg:hidden">
          <div data-linha className="absolute bottom-6 right-[46px] top-0 w-[3px]">
            <div className="absolute inset-0 bg-papel/20" />
            <div data-percorrido className="absolute inset-0 bg-sinal" />
            {rotas.paradas.map((p, i) => (
              <div key={p.cidade} data-parada className="absolute left-0" style={{ top: `${fracoes[i] * 100}%` }}>
                <span data-ponto className="absolute -left-[6px] -top-[7px] block size-[15px] rounded-full border-[3px] border-sinal bg-carvao" />
                <div className="absolute right-6 top-[-14px] w-max text-right">
                  <p className="titulo text-[22px] font-semibold">{p.cidade} <span className="text-[13px] font-normal text-nevoa">{p.uf}</span></p>
                  <p className="numeros mt-0.5 text-[12px] text-nevoa">{p.km === 0 ? 'km 0' : `≈ ${p.km} km`}, {p.papel.toLowerCase()}</p>
                </div>
              </div>
            ))}
            <div data-veiculo className="absolute bottom-full left-[1.5px] -ml-[9px] w-[18px] text-papel">
              <CarretaCima rotulo={rotas.carretaAlt} className="block h-auto w-full" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:gap-6 lg:mt-0 lg:grid-cols-12">
          {rotas.extras.map((e) => (
            <div key={e.titulo} data-extra className="border-t border-papel/20 pt-4 lg:col-span-4">
              <h3 className="titulo text-[19px] font-semibold md:text-[22px] lg:text-[26px]">
                <span aria-hidden className="mr-2 inline-block size-2.5 bg-sinal align-middle" />
                {e.titulo}
              </h3>
              <p className="mt-2 max-w-[44ch] text-[13px] leading-snug text-nevoa md:text-[14px] lg:text-[15px] lg:leading-relaxed">{e.texto}</p>
            </div>
          ))}
          <p className="hidden self-end pr-20 text-[12px] text-nevoa lg:col-span-3 lg:col-start-10 lg:block lg:text-right">{rotas.nota}</p>
        </div>
      </div>
    </section>
    </div>
  )
}
