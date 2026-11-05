import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { AnimationItem } from 'lottie-web'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { tranca } from '../data/conteudo'
import { ritmo } from '../ritmo'

// Receita lottie-progresso, com palco grudado (sticky) em vez de pin: a altura da cena já está reservada,
// então o player chegar depois não empurra a página. As etapas andam junto com os quadros.
const LIMITES = [0, 0.17, 0.33, 0.87, 1] // fatia da rolagem de cada etapa
const QUADROS = [0, 30, 62, 214, 239] // quadros do tranca.json (ferramentas/gerar-tranca.mjs)

export function Tranca() {
  const secao = useRef<HTMLElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const player = useRef<HTMLDivElement>(null)
  const poster = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const raiz = secao.current!, host = player.current!, imagem = poster.current!
      const q = gsap.utils.selector(raiz)
      const nomes = q('[data-etapa]'), textos = q('[data-etapa-texto]'), barras = q('[data-barra]')
      let vivo = true
      let animacao: AnimationItem | undefined
      let atual = 0
      const abortar = new AbortController()

      gsap.set(nomes, { opacity: (i: number) => (i ? 0.65 : 1) })
      gsap.set(textos, { autoAlpha: (i: number) => (i ? 0 : 1) })
      const mostrar = (n: number) => {
        if (n === atual) return
        const sobe = n > atual ? 1 : -1
        gsap.to(nomes, { opacity: (i: number) => (i === n ? 1 : 0.65), duration: ritmo.dur.curta, overwrite: 'auto' })
        gsap.to(q(`[data-etapa="${n}"] [data-num]`), { scale: 1.25, duration: ritmo.dur.curta, yoyo: true, repeat: 1, ease: ritmo.ease.solta })
        gsap.to(textos[atual], { autoAlpha: 0, y: -14 * sobe, duration: ritmo.dur.curta, ease: ritmo.ease.sai, overwrite: 'auto' })
        gsap.fromTo(textos[n], { autoAlpha: 0, y: 18 * sobe }, { autoAlpha: 1, y: 0, duration: ritmo.dur.media, ease: ritmo.ease.entra, overwrite: 'auto' })
        atual = n
      }
      const quadro = (p: number) => {
        let k = 0
        while (k < LIMITES.length - 2 && p > LIMITES[k + 1]) k++
        const u = (p - LIMITES[k]) / (LIMITES[k + 1] - LIMITES[k])
        return { k, q: QUADROS[k] + Math.min(1, Math.max(0, u)) * (QUADROS[k + 1] - QUADROS[k]) }
      }
      const desenhar = (p: number) => {
        const { k, q: f } = quadro(p)
        animacao?.goToAndStop(f, true)
        mostrar(k)
        gsap.set(barras, { scaleX: p, scaleY: p })
      }
      // Progresso até a próxima seção começar a cobrir o palco (última tela da cena).
      const gatilho = ScrollTrigger.create({ trigger: raiz, start: 'top top',
        end: () => '+=' + Math.max(1, raiz.offsetHeight - 2 * palco.current!.offsetHeight),
        invalidateOnRefresh: true, onUpdate: (st) => desenhar(st.progress) })

      const observar = new IntersectionObserver(async ([entrada]) => {
        if (!entrada.isIntersecting) return
        observar.disconnect()
        try {
          const [modulo, resposta] = await Promise.all([
            import('lottie-web/build/player/lottie_light'),
            fetch('/animacoes/tranca.json', { signal: abortar.signal }),
          ])
          if (!resposta.ok) throw new Error('Animação indisponível')
          const dados = await resposta.json()
          if (!vivo) return
          const item = modulo.default.loadAnimation({ container: host, renderer: 'svg', autoplay: false, loop: false,
            animationData: dados, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } })
          animacao = item
          item.addEventListener('data_failed', () => { imagem.style.opacity = '1'; host.style.opacity = '0' })
          item.addEventListener('DOMLoaded', () => {
            if (!vivo) return
            desenhar(gatilho.progress) // rolagem restaurada também escolhe o quadro certo
            host.style.opacity = '1'
            imagem.style.opacity = '0'
          })
        } catch {
          if (vivo) { imagem.style.opacity = '1'; host.style.opacity = '0' }
        }
      }, { rootMargin: '400px' })
      observar.observe(raiz)
      desenhar(gatilho.progress)
      return () => {
        vivo = false
        observar.disconnect()
        abortar.abort()
        gatilho.kill()
        animacao?.destroy()
        host.style.opacity = '0'
        imagem.style.opacity = '1'
      }
    })
    return () => mm.revert()
  }, [])

  const estilo = { '--telas-d': ritmo.telas.tranca.desktop, '--telas-c': ritmo.telas.tranca.celular } as CSSProperties
  return (
    <section ref={secao} id="tranca" aria-labelledby="tranca-titulo" className="cena bg-papel text-tinta" style={estilo}>
      <div ref={palco} className="palco flex flex-col px-[var(--margem)] pb-24 pt-[7svh] md:grid md:grid-cols-12 md:gap-x-8 md:pb-0 md:pt-0">
        <div className="max-md:contents md:col-span-6 md:flex md:flex-col md:justify-center md:py-[8svh]">
          <h2 id="tranca-titulo" className="titulo text-[13.5vw] md:text-[min(8.6vw,17svh)]">
            <span className="block">{tranca.titulo[0]}</span>
            <span className="block text-coral-grande">{tranca.titulo[1]}</span>
          </h2>

          {/* Etapas: no celular ficam embaixo da trança (ordem 3) */}
          <div className="order-3 mt-4 md:mt-[5svh]">
            <div className="relative hidden h-[3px] overflow-hidden rounded-full bg-tinta/15 max-md:block motion-reduce:hidden!">
              <div data-barra className="absolute inset-0 origin-left bg-coral" style={{ transform: 'scaleX(0)' }} />
            </div>
            <div className="relative motion-reduce:hidden md:pl-7">
              <div aria-hidden="true" className="absolute bottom-1 left-0 top-1 hidden w-[3px] overflow-hidden rounded-full bg-tinta/15 md:block">
                <div data-barra className="absolute inset-0 origin-top bg-coral" style={{ transform: 'scaleY(0)' }} />
              </div>
              <ol className="mt-3 grid grid-cols-4 gap-2 md:mt-0 md:grid-cols-1 md:gap-[1.6svh]">
                {tranca.etapas.map((e, i) => (
                  <li key={e.nome} data-etapa={i} className="flex flex-col items-start gap-0.5 md:flex-row md:items-baseline md:gap-4">
                    <span data-num className="titulo inline-block text-[15px] text-coral-texto md:text-[min(2.4vw,4.5svh)]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="titulo text-[15px] md:text-[min(4.6vw,8.4svh)]">{e.nome}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-3 grid min-h-[4.6em] text-[15px] leading-snug motion-reduce:flex motion-reduce:flex-col motion-reduce:gap-4 md:mt-[4svh] md:max-w-[40ch] md:pl-7 md:text-[18px]">
              {tranca.etapas.map((e, i) => (
                <div key={e.nome} data-etapa-texto={i} className="col-start-1 row-start-1">
                  <strong className="titulo hidden text-[28px] motion-reduce:block">{String(i + 1).padStart(2, '0')} {e.nome}</strong>
                  <p>{e.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative order-2 mt-3 min-h-0 flex-1 motion-reduce:h-[70svh] motion-reduce:flex-none md:col-span-6 md:mt-0 md:h-full md:py-[5svh]" aria-hidden="true">
          <div className="relative h-full w-full">
            <img ref={poster} src="/animacoes/tranca-final.svg" alt="" width={600} height={1000}
              className="absolute inset-0 h-full w-full object-contain" />
            <div ref={player} className="absolute inset-0 [&_svg]:h-full! [&_svg]:w-full!" style={{ opacity: 0 }} />
          </div>
        </div>
        <p className="sr-only">{tranca.poster}</p>
      </div>
    </section>
  )
}
