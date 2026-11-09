import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { fio } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
import { ritmo } from '../ritmo'

// Seção 2, refeita pela LP-12/DEV-42 (04/11/2026). Antes: fio desenhado "por dentro", preso por 2,4 telas, com
// cinco etapas — falhou no teste do porquê (aula de cutícula que o visitante não precisa para decidir, e o
// brilho já aparece em foto real no Resultado). Agora: foto real do serviço de perto e uma frase, sem prender.
// Gesto único: a foto se abre de cima para baixo, uma vez, quando chega à tela (como a luz correndo pelo fio).
export function Fio() {
  const secao = useRef<HTMLElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(secao)
      const gatilho = { trigger: secao.current, start: 'top 70%', once: true }
      gsap.fromTo(q('[data-moldura]'), { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', duration: ritmo.dur.longa, ease: ritmo.ease.entra, scrollTrigger: gatilho })
      gsap.fromTo(q('[data-texto]'), { autoAlpha: 0, y: ritmo.distancia },
        { autoAlpha: 1, y: 0, duration: ritmo.dur.media, ease: ritmo.ease.entra, stagger: 0.08, scrollTrigger: gatilho })
    })
    return () => mm.revert()
  }, { scope: secao })

  return (
    <section ref={secao} id="fio" aria-labelledby="titulo-fio" className="sobre-escuro bg-petroleo text-claro">
      {/* Calibragem de 09/11: a macro ocupa a largura toda (é o que prende o olhar) e os passos dizem o que a cliente vive na cadeira. */}
      <figure className="m-0">
        <div data-moldura className="relative aspect-[4/5] w-full overflow-hidden bg-petroleo md:aspect-[12/5]">
          <Foto nome={fio.foto.nome} alt={fio.foto.alt} sizes="100vw" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </figure>
      <div className="grid gap-8 px-[var(--margem)] pb-[20svh] pt-[8svh] md:grid-cols-12 md:gap-x-8 md:pb-[14svh] md:pt-[10svh]">
        <div className="md:col-span-6">
          <p data-texto className="rotulo text-claro/70"><span className="mr-3">{fio.numero}</span>{fio.rotulo}</p>
          <h2 data-texto id="titulo-fio" className="titulo mt-3 text-[clamp(32px,8.6vw,40px)] md:mt-5 md:text-[clamp(44px,4.4vw,66px)]">{fio.titulo}</h2>
        </div>
        <div className="md:col-span-5 md:col-start-8">
          <p data-texto className="max-w-[38ch] text-[16px] text-claro/80 md:text-[18px]">{fio.texto}</p>
          <ol className="mt-6 grid gap-3 md:mt-8">
            {fio.passos.map((p, i) => (
              <li key={p} data-texto className="flex items-baseline gap-4 text-[17px] md:text-[19px]">
                <span aria-hidden="true" className="titulo text-[22px] text-luz">{i + 1}</span>{p}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
