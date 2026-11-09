import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { gsap, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'
import Foto from '../componentes/Foto'
import { degrade } from '../data/conteudo'

const { marcas, subida } = degrade
// O cabelo cheio aparece só acima da linha; abaixo dela a máquina já passou e fica o degradê.
const cheio: CSSProperties = {
  maskImage: 'linear-gradient(to bottom, #000 calc(var(--linha) * 1% - 0.6%), transparent calc(var(--linha) * 1% + 0.6%))',
  WebkitMaskImage: 'linear-gradient(to bottom, #000 calc(var(--linha) * 1% - 0.6%), transparent calc(var(--linha) * 1% + 0.6%))',
}
const LISTA_VISIVEL = 'mx-auto mt-10 grid max-w-[1360px] gap-4 px-5 pb-16 sm:grid-cols-3 md:px-[5vw]'

// Clímax (LP-12: um gesto, entendido sem legenda). A mesma cabeça, de costas: a linha sobe como a máquina e o cabelo
// cheio vira pele aos poucos por onde ela passa. Três marcas ao lado acendem quando a linha chega.
// Reduzido ou tela baixa: só o degradê pronto e as três marcas visíveis, nada preso.
export default function Degrade() {
  const involucro = useRef<HTMLDivElement>(null)
  const secao = useRef<HTMLElement>(null)
  const foto = useRef<HTMLImageElement>(null)
  // Foto indisponível: sem percurso preso; a lista das marcas aparece no lugar da demonstração.
  const [semFoto, perderFoto] = useState(false)
  useEffect(() => {
    const img = foto.current
    if (img && img.complete && img.naturalWidth === 0) perderFoto(true)
  }, [])

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ cena: consultas.cenaDegrade }, (ctx) => {
      if (!(ctx.conditions as { cena: boolean }).cena || semFoto) return
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: involucro.current, start: 'top top', end: 'bottom bottom', scrub: ritmo.scrub, invalidateOnRefresh: true },
      })
      const subir = 0.82 // fração da rolagem em que a linha vai da nuca até o volume
      const quando = (altura: number) => ((subida.de - altura) / (subida.de - subida.ate)) * subir
      gsap.set('[data-marca]', { opacity: 0.45 })
      tl.fromTo('[data-palco]', { '--linha': subida.de }, { '--linha': subida.ate, duration: subir }, 0)
      tl.fromTo('[data-linha]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, 0)
      marcas.forEach((m, i) => {
        tl.to(`[data-marca="${i}"]`, { opacity: 1, color: 'var(--color-cobre)', duration: 0.04 }, quando(m.altura) - 0.02)
      })
      // Fim: a linha sai pelo alto e o degradê fica inteiro.
      tl.to('[data-linha]', { autoAlpha: 0, duration: 0.05 }, subir)
      tl.to('[data-palco]', { '--linha': -4, duration: 0.06 }, subir)
      tl.set({}, {}, 1)
    })
    return () => mm.revert()
  }, { scope: secao, dependencies: [semFoto], revertOnUpdate: true })

  return (
    <div
      ref={involucro}
      className={`${semFoto ? '' : 'percurso-degrade'} relative h-auto`}
      style={{
        '--degrade-celular': `${ritmo.degrade.telasCelular * 100}svh`,
        '--degrade-desktop': `${ritmo.degrade.telasDesktop * 100}svh`,
      } as CSSProperties}
    >
      <section
        id="degrade"
        ref={secao}
        aria-labelledby="degrade-titulo"
        className={`relative bg-grafite-2 ${semFoto ? 'pb-4' : 'cena:sticky cena:top-0 cena:h-[100svh] cena:overflow-hidden'}`}
      >
        <div className={`mx-auto max-w-[1360px] ${semFoto ? 'px-5 pt-16 md:px-[5vw] md:pt-[12vh]' : 'flex h-full flex-col gap-5 px-5 pb-14 pt-16 md:grid md:grid-cols-12 md:gap-8 md:px-[5vw] md:pb-[8vh] md:pt-[12vh]'}`}>
          {/* Texto: um título e um apoio */}
          <div className="md:col-span-4 md:self-center">
            <p className="dado text-[11px] uppercase tracking-[0.12em] text-cobre">03 · {degrade.rotulo}</p>
            <h2 id="degrade-titulo" className="titulo mt-3 text-[24px] md:mt-4 md:text-[clamp(32px,3.2vw,46px)]">{degrade.titulo}</h2>
            <p className="mt-3 max-w-[40ch] text-[14px] leading-relaxed text-nevoa md:mt-4 md:text-[16px]">{degrade.texto}</p>
          </div>

          {/* Ilustração em coluna + três marcas. Ela cabe na largura E na altura disponíveis (contêiner de tamanho),
              sempre na proporção do arquivo: as marcas são % da foto e só coincidem com o cabelo sem corte. */}
          <figure className={`relative flex min-h-[220px] flex-1 items-center justify-center md:col-span-7 md:col-start-6 md:h-full md:justify-start cena:[container-type:size] estatico:min-h-0 estatico:flex-none estatico:[container-type:inline-size] ${semFoto ? 'hidden' : ''}`}>
            <div data-palco className="flex h-[min(100cqh,calc((100cqw-84px)*1.4053))] max-w-full gap-3 [--linha:-4] md:h-[min(100cqh,calc((100cqw-150px)*1.4053))] md:gap-5 estatico:h-auto estatico:w-full estatico:justify-center">
              <div className="relative aspect-[750/1054] h-full shrink-0 overflow-hidden rounded-[6px] isolate estatico:h-auto estatico:w-[min(calc(100cqw-88px),420px)] md:estatico:w-[min(calc(100cqw-155px),420px)]">
                <Foto ref={foto} onError={() => perderFoto(true)} nome="degrade" alt={degrade.fotoAlt} sizes="(min-width: 768px) 40vw, 60vw" className="absolute inset-0 h-full w-full object-cover" />
                <div aria-hidden className="absolute inset-0 estatico:hidden" style={cheio}>
                  <Foto nome="degrade-cheio" alt="" sizes="(min-width: 768px) 40vw, 60vw" className="absolute inset-0 h-full w-full object-cover" />
                </div>
                {/* A linha da máquina: atravessa a foto na altura de --linha */}
                <div data-linha aria-hidden className="invisible pointer-events-none absolute inset-x-0 top-[calc(var(--linha)*1%)] h-[2px] -translate-y-1/2 bg-cobre estatico:hidden" />
              </div>

              {/* Três marcas nas alturas reais do desenho */}
              <div aria-hidden className="relative w-[72px] shrink-0 md:w-[130px]">
                {marcas.map((m, i) => (
                  <div key={m.nome} className="absolute left-0 flex -translate-y-1/2 items-center gap-2" style={{ top: `${m.altura}%` }}>
                    <span className="-ml-3 block h-px w-[22px] bg-giz/60 md:-ml-5 md:w-[34px]" />
                    <span data-marca={i} className="dado whitespace-nowrap text-[11px] text-giz estatico:text-cobre md:text-[13px]">{m.nome}</span>
                  </div>
                ))}
              </div>
            </div>
            <figcaption className="sr-only">{degrade.fotoAlt}</figcaption>
          </figure>
        </div>

        {/* As marcas em lista: para leitor de tela sempre; visível só quando a foto falha */}
        <ol aria-label="Marcas do degradê" className={semFoto ? LISTA_VISIVEL : 'sr-only'}>
          {marcas.map((m) => (
            <li key={m.nome} className={semFoto ? 'border-t border-cobre pt-3' : ''}>
              <span className="dado text-[12px] text-cobre">{m.nome}</span>
              <span className="mt-1 block text-[14px] text-nevoa">{m.nota}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
