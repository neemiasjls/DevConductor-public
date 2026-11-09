import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'

// Lenis só existe com movimento permitido; criado e destruído pelo gsap.matchMedia do App.
let lenis: Lenis | null = null

export function ligarRolagemSuave() {
  lenis = new Lenis({ anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (tempo: number) => lenis?.raf(tempo * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    gsap.ticker.lagSmoothing(500, 33)
    lenis?.destroy()
    lenis = null
  }
}

/** Rola na hora até `y` (px do documento), passando pelo Lenis quando ele estiver ativo. */
export function irPara(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
  else window.scrollTo({ top: y, behavior: 'instant' })
}
