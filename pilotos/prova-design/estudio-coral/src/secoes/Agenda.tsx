import { useRef } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { agenda } from '../data/conteudo'
import { ritmo } from '../ritmo'

// Receita palavra-zoom: "AGENDA" aproxima por dentro da haste do E até a cor dela tomar a tela
// e virar o fundo do contato. A origem do zoom é medida desenhando o E num canvas (cai sempre no traço);
// no fim a haste se alarga até cobrir a tela (um círculo crescendo parecia uma forma solta, não a letra).
function origemNoTraco(letra: HTMLElement, base: HTMLElement) {
  const cs = getComputedStyle(letra)
  const tam = parseFloat(cs.fontSize)
  const tela = document.createElement('canvas')
  tela.width = Math.ceil(tam * 1.2)
  tela.height = Math.ceil(tam * 1.5)
  const g = tela.getContext('2d', { willReadFrequently: true })!
  g.font = `${cs.fontWeight} ${tam}px ${cs.fontFamily}`
  const linhaBase = Math.round(tam * 1.2)
  g.fillText('E', 0, linhaBase)
  const alturaCaixa = g.measureText('E').actualBoundingBoxAscent
  // Linha entre o braço de cima e o do meio: só a haste é cortada (no meio exato pegaria o braço inteiro).
  const entreBracos = Math.round(linhaBase - alturaCaixa * 0.7)
  const px = g.getImageData(0, entreBracos, tela.width, 1).data
  let ini = -1, fim = -1
  for (let x = 0; x < tela.width; x++) {
    if (px[x * 4 + 3] > 160) { if (ini < 0) ini = x; fim = x } else if (ini >= 0) break
  }
  const xTraco = ini < 0 ? tam * 0.12 : (ini + fim) / 2
  const larguraTraco = ini < 0 ? tam * 0.14 : fim - ini + 1
  return { x: letra.offsetLeft + xTraco, y: base.offsetTop - alturaCaixa / 2, largura: larguraTraco, altura: alturaCaixa }
}

export function Agenda() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: '(prefers-reduced-motion: no-preference)', celular: '(max-width: 767px)' }, (ctx) => {
      if (!ctx.conditions!.mover) return
      const q = gsap.utils.selector(raiz)
      const palavra = q('[data-palavra-zoom]')[0] as HTMLElement
      const letra = q('[data-letra-e]')[0] as HTMLElement
      const base = q('[data-linha-base]')[0] as HTMLElement
      const mancha = q('[data-mancha]')[0] as HTMLElement
      const posicionar = () => {
        const o = origemNoTraco(letra, base)
        palavra.style.transformOrigin = `${o.x}px ${o.y}px`
        // A mancha é a própria haste do E (mesmo lugar e tamanho): ao alargar, a cor nasce da letra.
        gsap.set(mancha, { left: o.x - o.largura / 2, top: o.y - o.altura / 2, width: o.largura, height: o.altura })
      }
      posicionar()
      ScrollTrigger.addEventListener('refreshInit', posicionar)
      gsap.set(mancha, { opacity: 0, scaleX: 1, scaleY: 1 })
      gsap.set(q('[data-agenda-acao]'), { autoAlpha: 0, y: ritmo.distancia })

      const tl = gsap.timeline({ defaults: { ease: 'none' },
        scrollTrigger: { trigger: raiz.current, start: 'top top', end: 'bottom bottom', scrub: ritmo.scrub } })
      tl.fromTo(q('[data-letra]'), { yPercent: 0 }, { yPercent: (i: number) => (i % 2 ? -6 : 6), duration: 0.12, stagger: 0.01 }, 0)
        .to(q('[data-letra]'), { yPercent: 0, duration: 0.1 }, 0.18)
        .to(q('[data-agenda-texto]'), { opacity: 0, y: -ritmo.distancia, duration: 0.16 }, 0.3)
        .to(q('[data-dia]'), { opacity: 0, y: ritmo.distancia, stagger: 0.015, duration: 0.12 }, 0.3)
        .to(palavra, { scale: ctx.conditions!.celular ? 9 : 12, duration: 0.66, ease: 'power3.in' }, 0.2)
        .set(mancha, { opacity: 1 }, 0.5)
        .to(mancha, { scaleX: ctx.conditions!.celular ? 28 : 34, scaleY: 1.9, duration: 0.36, ease: 'power2.in' }, 0.5)
        // A cor que toma a tela já traz a ação: marcar horário (o contato vem logo abaixo).
        .to(q('[data-agenda-acao]'), { autoAlpha: 1, y: 0, duration: 0.1, ease: ritmo.ease.solta }, 0.86)
      return () => ScrollTrigger.removeEventListener('refreshInit', posicionar)
    })
    return () => mm.revert()
  }, { scope: raiz })

  const estilo = { '--telas-d': ritmo.telas.agenda.desktop, '--telas-c': ritmo.telas.agenda.celular } as CSSProperties
  return (
    <section ref={raiz} id="agenda" aria-labelledby="agenda-titulo" className="cena bg-papel text-tinta" style={estilo}>
      <div className="palco grid place-items-center px-[var(--margem)] motion-reduce:py-24">
        <div className="flex flex-col items-center text-center">
          <h2 id="agenda-titulo" data-palavra-zoom className="titulo relative text-[31vw] text-coral-grande md:text-[min(29vw,48svh)]">
            {agenda.palavra.split('').map((l, i) => (
              <span key={i} data-letra {...(i === 2 ? { 'data-letra-e': '' } : {})} className="relative inline-block">{l}</span>
            ))}
            <span data-linha-base aria-hidden="true" className="inline-block h-0 w-0 align-baseline" />
            <span data-mancha data-so-movimento aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 h-0 w-0 bg-coral" />
          </h2>
          <div data-agenda-acao data-so-movimento className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-[var(--margem)] text-center text-tinta">
            <p className="titulo text-[16vw] md:text-[min(9vw,18svh)]">{agenda.acao}</p>
            <a href="#contato" className="pilula mt-6 bg-tinta text-[15px] text-papel">{agenda.botao}</a>
          </div>
          <p data-agenda-texto className="mt-6 max-w-[32ch] text-[17px] font-medium leading-snug md:mt-8 md:text-[21px]">{agenda.texto}</p>
          <ul aria-label={agenda.diasRotulo} className="mt-8 flex flex-wrap justify-center gap-2 md:mt-10 md:gap-3">
            {agenda.dias.map((d) => (
              <li key={d.dia} data-dia className="grid w-[58px] place-items-center rounded-full border-2 border-tinta py-3 md:w-[88px] md:py-4">
                <span className="titulo text-[22px] md:text-[30px]">{d.dia}</span>
                <span className="text-[11px] font-semibold md:text-[13px]">{d.hora}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
