import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

// Cada bloco abaixo é a mesma receita de lp-cenas/receitas (o código das receitas foi testado aqui).
export function montarCenas(raiz: HTMLElement) {
  const q = <T extends Element = HTMLElement>(sel: string) => raiz.querySelector<T>(sel)!
  const todos = <T extends Element = HTMLElement>(sel: string) => gsap.utils.toArray<T>(raiz.querySelectorAll(sel))
  const mm = gsap.matchMedia()

  // --- Rolagem suave (Lenis) ---
  const desligarRolagem = ligarRolagemSuave()

  // --- fundo-shader: o fundo apaga aos poucos enquanto o topo sai ---
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to(q('[data-fundo-shader]'), { opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: q('[data-topo]'), start: 'top top', end: 'bottom top', scrub: true } })
  })

  // --- texto-revelado ---
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    todos('[data-texto-revelado]').forEach((texto) => {
      gsap.fromTo(texto.querySelectorAll('[data-palavra]'), { opacity: 0.15 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: texto, start: 'top 80%', end: 'bottom 45%', scrub: true },
      })
    })
  })

  // --- camadas-profundidade ---
  mm.add({ movimento: '(prefers-reduced-motion: no-preference)', celular: '(max-width: 1023px)' }, (contexto) => {
    const { movimento, celular } = contexto.conditions as { movimento: boolean; celular: boolean }
    if (!movimento) return
    const cena = q('[data-camadas]')
    todos('[data-camada]').forEach((camada) => {
      const forca = Number(camada.dataset.camada) * (celular ? 0.5 : 1)
      const alcance = () => cena.offsetHeight * 0.15 * forca
      gsap.fromTo(camada, { y: alcance }, { y: () => -alcance(), ease: 'none',
        scrollTrigger: { trigger: cena, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } })
    })
  })

  // --- sequencia-quadros ---
  const TOTAL_QUADROS = 60
  const arquivo = (i: number) => `/quadros/${String(i + 1).padStart(4, '0')}.webp`
  const tela = q<HTMLCanvasElement>('[data-sequencia-tela]')
  const pincel = tela.getContext('2d')!
  const imagens: HTMLImageElement[] = []
  const carregar = (i: number) => (imagens[i] ??= Object.assign(new Image(), { src: arquivo(i) }))
  let atual = 0
  const desenhar = (i: number) => {
    atual = i
    const img = carregar(i)
    const pintar = () => {
      if (atual !== i) return // chegou atrasado: outro quadro já foi pedido
      pincel.drawImage(img, 0, 0, tela.width, tela.height)
      tela.dataset.quadro = String(i)
    }
    if (img.complete && img.naturalWidth) pintar()
    else img.addEventListener('load', pintar, { once: true })
  }
  desenhar(0)
  // O resto dos quadros só baixa quando a seção se aproxima (não pesa na abertura do site).
  ScrollTrigger.create({ trigger: q('[data-sequencia]'), start: 'top 300%', once: true,
    onEnter: () => { for (let i = 1; i < TOTAL_QUADROS; i++) carregar(i) } })
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const estado = { quadro: 0 }
    gsap.to(estado, { quadro: TOTAL_QUADROS - 1, snap: 'quadro', ease: 'none',
      onUpdate: () => desenhar(estado.quadro),
      scrollTrigger: { trigger: q('[data-sequencia]'), start: 'top top', end: '+=1500', pin: true, scrub: 0.3 } })
  })
  mm.add('(prefers-reduced-motion: reduce)', () => desenhar(TOTAL_QUADROS - 1))

  return desligarRolagem
}

// Rolagem suave ligada ao ScrollTrigger. Desligada com movimento reduzido; no toque o Lenis mantém a
// rolagem nativa do celular (padrão dele).
function ligarRolagemSuave() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const lenis = new Lenis({ anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (tempo: number) => lenis.raf(tempo * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => { gsap.ticker.remove(tick); lenis.destroy() }
}
