import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { resultado } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
import { ritmo } from '../ritmo'

// Cena 4: a foto abre de um arco estreito (o espelho do salão) até a coluna (Imagem), presa por pouco tempo.
// A moldura escala e a foto faz a escala inversa (z/sx, z/sy): ela só é revelada, nunca esticada. Parallax leve.
const INICIO = { sx: 0.34, sy: 0.62, z: 1.18 }

export function Resultado() {
  const secao = useRef<HTMLElement>(null)
  // Foto que falha antes de a cena chegar à tela: a cena deixa de prender (uma tela só) e o substituto aparece.
  // Se já estiver na tela, a altura fica como está, para a página não pular debaixo do dedo.
  const [liberada, liberar] = useState(false)
  const aoFalhar = () => { if ((secao.current?.getBoundingClientRect().top ?? 0) > innerHeight) liberar(true) }
  useEffect(() => { if (liberada) ScrollTrigger.refresh() }, [liberada])
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(secao)
      const janela = q('[data-janela]')[0], foto = q('[data-foto]')[0]
      const estado = { p: 0 }
      const aplicar = () => {
        const p = estado.p
        const sx = INICIO.sx + (1 - INICIO.sx) * p, sy = INICIO.sy + (1 - INICIO.sy) * p, z = INICIO.z + (1 - INICIO.z) * p
        gsap.set(janela, { scaleX: sx, scaleY: sy })
        gsap.set(foto, { scaleX: z / sx, scaleY: z / sy, yPercent: -4 + 8 * p })
      }
      aplicar()
      gsap.to(estado, { p: 1, ease: 'none', onUpdate: aplicar,
        scrollTrigger: { trigger: secao.current, start: 'top 55%', end: 'bottom bottom', scrub: ritmo.scrub } })
    })
    return () => mm.revert()
  }, { scope: secao })

  const estilo = { '--telas-d': liberada ? 0 : ritmo.telas.resultado.desktop, '--telas-c': liberada ? 0 : ritmo.telas.resultado.celular } as CSSProperties
  return (
    <section ref={secao} id="resultado" data-liberada={liberada || undefined} aria-labelledby="titulo-resultado" className="cena sobre-escuro bg-petroleo text-claro" style={estilo}>
      <div className="palco grid content-center gap-6 px-[var(--margem)] py-[6svh] md:grid-cols-12 md:items-center md:gap-x-8 motion-reduce:py-[14svh]">
        <figure className="m-0 md:col-span-5 md:col-start-2">
          <div data-janela className="arco relative mx-auto aspect-[3/4] h-[50svh] max-w-full md:h-[80svh]">
            <Foto data-foto aoFalhar={aoFalhar} nome={resultado.foto.nome} alt={resultado.foto.alt} sizes="(min-width: 768px) 40vw, 80vw"
              className="absolute inset-x-0 -top-[5%] h-[110%] w-full object-cover object-[50%_8%]" />
          </div>
          <figcaption className="mx-auto mt-3 max-w-[40ch] text-center text-[13px] text-claro/70">{resultado.nota}</figcaption>
        </figure>
        <div className="md:col-span-5 md:col-start-8">
          <p className="rotulo text-claro/70"><span className="mr-3">{resultado.numero}</span>{resultado.rotulo}</p>
          <h2 id="titulo-resultado" className="titulo mt-3 text-[clamp(32px,8.6vw,40px)] md:mt-5 md:text-[clamp(44px,4.4vw,64px)]">{resultado.titulo}</h2>
          <p className="mt-3 max-w-[40ch] text-[16px] text-claro/80 md:mt-6 md:text-[18px]">{resultado.texto}</p>
        </div>
      </div>
    </section>
  )
}
