import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { abertura, linkWhats, marca, menu } from '../data/conteudo'
import { Foto } from '../componentes/Foto'
import { ritmo } from '../ritmo'

// Cada palavra tem a sua etiqueta de cor; a sombra do arco troca junto.
const ETIQUETA = [
  { fundo: 'var(--color-cobalto)', texto: 'var(--color-papel)', sombra: 'var(--color-tinta)' },
  { fundo: 'var(--color-tinta)', texto: 'var(--color-coral)', sombra: 'var(--color-cobalto)' },
  { fundo: 'var(--color-papel)', texto: 'var(--color-coral)', sombra: 'var(--color-tinta)' },
  { fundo: 'var(--color-tinta)', texto: 'var(--color-papel)', sombra: 'var(--color-papel)' },
]
// Acentos (Ç, Ê) passam da caixa da palavra: a que espera fica bem abaixo para não aparecer na fresta.
const FORA = 150
const SOMBRA = [
  { x: '-7%', y: '5%', r: -4 },
  { x: '6%', y: '-4%', r: 5 },
  { x: '-5%', y: '-6%', r: -6 },
  { x: '7%', y: '6%', r: 3 },
]

export function Abertura() {
  const raiz = useRef<HTMLElement>(null)
  const [pausada, marcarPausa] = useState(false)
  const pausaUsuario = useRef(false)
  const controlar = useRef<() => void>(() => {})

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: '(prefers-reduced-motion: no-preference)', celular: '(max-width: 767px)' }, (ctx) => {
      if (!ctx.conditions!.mover) return
      const q = gsap.utils.selector(raiz)
      const palavras = q('[data-palavra]') as HTMLElement[]
      const fotos = q('[data-foto-abertura]') as HTMLElement[]
      const sombra = q('[data-arco-sombra]')[0] as HTMLElement
      const celular = ctx.conditions!.celular

      // Entrada no carregamento: linhas chegam de lados opostos, sem esconder o título (opacidade fica 1).
      gsap.set(palavras.slice(1), { yPercent: FORA, opacity: 1 })
      gsap.set(sombra, { x: 0, y: 0, xPercent: parseFloat(SOMBRA[0].x), yPercent: parseFloat(SOMBRA[0].y), rotation: SOMBRA[0].r })
      const entrada = gsap.timeline({ defaults: { ease: ritmo.ease.entra, duration: ritmo.dur.longa } })
      entrada
        .from(q('[data-linha="1"]'), { x: celular ? '-11vw' : '-16vw' }, 0)
        .from(q('[data-linha="2"]'), { x: celular ? '12vw' : '18vw' }, 0.06)
        .from(palavras[0], { yPercent: FORA }, 0.14)
        .from(q('[data-arco]'), { scale: 0.9, rotation: -4, yPercent: 5 }, 0.08)
        .from(sombra, { xPercent: 0, yPercent: 0, rotation: 0 }, 0.3)
        .from(q('[data-sobe]'), { y: ritmo.distancia, opacity: 0, stagger: ritmo.escalonar, duration: ritmo.dur.media, ease: ritmo.ease.solta }, 0.32)

      // Foto respira devagar dentro do arco.
      const respirar = gsap.to(q('[data-arco-foto]'), { scale: 1.035, duration: 8, ease: 'sine.inOut', yoyo: true, repeat: -1 })

      // Troca de palavra no lugar: a atual sai por cima, a próxima entra por baixo com a etiqueta dela.
      let atual = 0
      let transicao: gsap.core.Timeline | undefined
      const trocar = () => {
        const prox = (atual + 1) % palavras.length
        transicao = gsap.timeline()
          .to(palavras[atual], { yPercent: -FORA, duration: ritmo.dur.media * 0.7, ease: ritmo.ease.sai })
          .fromTo(palavras[prox], { yPercent: FORA }, { yPercent: 0, duration: ritmo.dur.media, ease: ritmo.ease.entra }, '-=0.14')
          .to(fotos[atual], { autoAlpha: 0, duration: 0.2 }, '<')
          .to(fotos[prox], { autoAlpha: 1, duration: 0.2 }, '<')
          .set(sombra, { backgroundColor: ETIQUETA[prox].sombra }, '<')
          .to(sombra, { xPercent: parseFloat(SOMBRA[prox].x), yPercent: parseFloat(SOMBRA[prox].y), rotation: SOMBRA[prox].r, duration: ritmo.dur.media, ease: ritmo.ease.entra }, '<')
          .fromTo(q('[data-arco]'), { rotation: 0 }, { rotation: prox % 2 ? 1.25 : -1.25, duration: ritmo.dur.curta, ease: ritmo.ease.solta, yoyo: true, repeat: 1 }, '<')
        atual = prox
        laco.restart(true)
      }
      const laco = gsap.delayedCall(ritmo.troca, trocar)
      let visivel = true
      let coberta = false
      const sincronizar = () => {
        const parar = pausaUsuario.current || !visivel || coberta || document.hidden
        respirar.paused(parar)
        laco.paused(parar)
        transicao?.paused(parar)
      }
      controlar.current = sincronizar
      const observador = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; sincronizar() })
      observador.observe(raiz.current!)
      document.addEventListener('visibilitychange', sincronizar)
      sincronizar()

      // Costura: o bloco cobalto dos serviços sobe e cobre a abertura, que recua e escurece.
      const proxima = raiz.current!.nextElementSibling as HTMLElement
      gsap.timeline({ scrollTrigger: { trigger: proxima, start: 'top bottom', end: 'top top', scrub: ritmo.scrub,
        // O header ainda intersecta geometricamente quando os serviços já o cobriram.
        onLeave: () => { coberta = true; sincronizar() },
        onEnterBack: () => { coberta = false; sincronizar() },
        onRefresh: s => { coberta = s.progress >= 1; sincronizar() } } })
        .to(q('[data-palco-abertura]'), { scale: 0.9, yPercent: -6, ease: 'none' }, 0)
        .to(q('[data-veu]'), { opacity: 0.55, ease: 'none' }, 0)
      return () => {
        observador.disconnect()
        document.removeEventListener('visibilitychange', sincronizar)
        controlar.current = () => {}
        laco.kill()
        transicao?.kill()
      }
    })
    return () => mm.revert()
  }, { scope: raiz })

  return (
    <header ref={raiz} className="sticky top-0 z-0 h-svh min-h-[560px] overflow-hidden bg-coral text-tinta motion-reduce:static">
      <div data-palco-abertura className="relative flex h-full w-full origin-[50%_0%] flex-col">
        <p className="relative z-30 bg-tinta px-[var(--margem)] py-1.5 text-center text-[11.5px] leading-snug text-papel md:text-[13px]">{marca.aviso}</p>
        <nav aria-label="Principal" className="relative z-30 flex items-center justify-between gap-4 px-[var(--margem)] pt-4 md:gap-5 md:pt-6 lg:gap-6">
          <a href="#conteudo" className="titulo shrink-0 whitespace-nowrap text-[26px] tracking-[0.01em] md:text-[32px]">{marca.nome}</a>
          <ul className="hidden items-center gap-4 whitespace-nowrap text-[14px] font-medium md:flex lg:gap-9 lg:text-[15px]">
            {menu.map((m) => (
              <li key={m.alvo}><a className="underline-offset-4 hover:underline" href={m.alvo}>{m.rotulo}</a></li>
            ))}
          </ul>
          <a href={linkWhats()} className="pilula shrink-0 bg-tinta px-5 py-3 text-[14px] text-papel md:text-[15px]">Marcar horário</a>
        </nav>

        <div data-arco-grupo
          className="absolute right-[-7vw] top-[31svh] z-0 h-[38svh] w-[60vw] md:right-[-2.5vw] md:top-[12svh] md:h-[82svh] md:w-[35vw]">
          <div data-arco-sombra className="arco absolute inset-0" style={{ backgroundColor: ETIQUETA[0].sombra, transform: 'translate(-7%, 5%) rotate(-4deg)' }} />
          <div data-arco className="arco absolute inset-0 bg-tinta">
            {abertura.fotos.map((foto, i) => (
              <div key={i} data-foto-abertura={i} className="absolute inset-0" style={{ opacity: i ? 0 : 1, visibility: i ? 'hidden' : 'visible' }}>
                <Foto data-arco-foto nome={foto.nome} alt={foto.alt} prioridade
                  sizes="(min-width: 768px) 36vw, 62vw" className="h-full w-full object-cover object-[50%_30%]" />
              </div>
            ))}
          </div>
        </div>

        <h1 className="titulo relative z-10 mt-[4svh] px-[var(--margem)] text-[18vw] md:mt-[2svh] md:text-[min(13.4vw,20svh)] lg:text-[min(14.2vw,21svh)]">
          <span className="sr-only">{marca.nome}: feito pra tranças, cachos, cor e você.</span>
          <span aria-hidden="true" className="block">
            <span data-linha="1" className="block w-max">{abertura.linhas[0]}</span>
            <span data-linha="2" className="block w-max">{abertura.linhas[1]}</span>
            <span className="grid w-max overflow-clip">
              {abertura.palavras.map((p, i) => (
                <span key={p} data-palavra={i}
                  className="col-start-1 row-start-1 w-max rounded-[0.07em] px-[0.07em] pb-[0.07em] pt-[0.03em]"
                  style={{ backgroundColor: ETIQUETA[i].fundo, color: ETIQUETA[i].texto, opacity: i ? 0 : 1 }}>
                  {p}
                </span>
              ))}
            </span>
          </span>
        </h1>

        <div className="relative z-10 mt-auto flex flex-col gap-5 px-[var(--margem)] pb-6 md:w-[64%] md:items-start md:gap-3 md:pb-[5svh] lg:grid lg:w-[68%] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-6">
          <p data-sobe className="max-w-[34ch] text-[15px] font-medium leading-snug md:max-w-[38ch] md:text-[18px]">{abertura.texto}</p>
          <div data-sobe className="flex flex-wrap gap-2.5 md:gap-3">
            <a href={linkWhats()} className="pilula bg-tinta px-5 text-[14px] text-papel md:px-[1.6em] md:text-[15px]">{abertura.botao}</a>
            <a href="#servicos" className="pilula border-2 border-tinta bg-coral px-5 text-[14px] md:px-[1.6em] md:text-[15px]">{abertura.secundario}</a>
            <button type="button" aria-pressed={pausada} onClick={() => {
              pausaUsuario.current = !pausaUsuario.current
              marcarPausa(pausaUsuario.current)
              controlar.current()
            }} className="min-h-11 px-2 text-[13px] underline underline-offset-4 motion-reduce:hidden">
              {pausada ? abertura.retomar : abertura.pausar}
            </button>
          </div>
        </div>
        <div data-veu data-so-movimento className="pointer-events-none absolute inset-0 z-40 bg-tinta" />
      </div>
    </header>
  )
}
