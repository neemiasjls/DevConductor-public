import { useRef, useState } from 'react'
import Foto from '../componentes/Foto'
import { doca } from '../data/conteudo'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'

// Pátio e doca (Imagem, foto-abre): a foto abre de uma janela estreita até a largura do conteúdo.
// Passagem curta presa (0,9 tela; 0,7 no celular). A foto recebe a escala inversa para não deformar.
export default function Doca() {
  const cena = useRef<HTMLElement>(null)
  const [falhou, falhar] = useState(false)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      const inicio = { sx: 0.46, sy: 0.62, z: 1.22 }
      const estado = { ...inicio }
      const janela = cena.current!.querySelector<HTMLElement>('[data-janela]')!
      const foto = cena.current!.querySelector<HTMLElement>('[data-foto]')!
      // Setters reaproveitados: nenhum tween novo por quadro de rolagem.
      const jx = gsap.quickSetter(janela, 'scaleX'), jy = gsap.quickSetter(janela, 'scaleY')
      const fx = gsap.quickSetter(foto, 'scaleX'), fy = gsap.quickSetter(foto, 'scaleY')
      const aplicar = () => { jx(estado.sx); jy(estado.sy); fx(estado.z / estado.sx); fy(estado.z / estado.sy) }
      aplicar()
      gsap.to(estado, {
        sx: 1, sy: 1, z: 1, ease: 'none', onUpdate: aplicar,
        scrollTrigger: { trigger: cena.current, start: 'top 35%', end: 'bottom bottom', scrub: ritmo.scrub },
      })
      // quickSetter escreve fora do registro do contexto: limpar à mão na troca para reduzido.
      return () => gsap.set([janela, foto], { clearProps: 'transform' })
      gsap.fromTo('[data-fio-desce]', { scaleY: 0 }, {
        scaleY: 1, ease: 'none', transformOrigin: '50% 0',
        scrollTrigger: { trigger: '[data-fio-desce]', start: 'top 85%', end: 'bottom 55%', scrub: true },
      })
    })
  }, { scope: cena })

  return (
    <section
      ref={cena}
      id="doca"
      aria-labelledby="doca-titulo"
      className="relative bg-gelo text-grafite"
    >
      <div className="conteudo grid gap-6 pb-6 pt-20 md:pt-28 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="rotulo mb-4 text-aco-escuro">{doca.rotulo}</p>
          <h2 id="doca-titulo" className="titulo text-[clamp(1.9rem,7.4vw,2.4rem)] md:text-[min(4.4vw,3.4rem)]">{doca.titulo}</h2>
        </div>
        <p className="max-w-[46ch] self-end text-[1.0625rem] leading-relaxed text-aco-escuro lg:col-span-5 lg:col-start-8">{doca.texto}</p>
      </div>
      <div className="cena" style={{ ['--telas' as string]: ritmo.doca.desktop, ['--telas-cel' as string]: ritmo.doca.celular }}>
        <div className="palco flex flex-col justify-center">
          <figure className="conteudo">
            <div data-janela className="relative isolate h-[56svh] w-full overflow-hidden rounded-[var(--raio)] bg-aco-claro md:h-[72svh]">
              {falhou ? (
                <p className="flex h-full items-center justify-center p-6 text-center text-[0.9375rem]">Foto indisponível: {doca.alt}</p>
              ) : (
                <div data-foto className="absolute inset-0">
                  <Foto nome="trailer-doca" alt={doca.alt} sizes="(min-width: 1320px) 1240px, 92vw" loading="lazy" onError={() => falhar(true)}
                    className="h-full w-full object-cover object-[45%_60%]" />
                </div>
              )}
            </div>
            <figcaption className="mt-3 text-[0.8125rem] text-aco-escuro">{doca.credito}</figcaption>
          </figure>
        </div>
      </div>
      <div className="conteudo">
        <div data-fio-desce aria-hidden /* taste-skill-ignore: costura do plano (fio fino desce) */ className="ml-[calc(50%-0.5px)] h-16 w-px bg-aco md:h-24 lg:ml-0" />
      </div>
    </section>
  )
}
