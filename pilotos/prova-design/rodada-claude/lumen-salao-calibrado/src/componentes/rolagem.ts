import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Rolagem macia (Lenis) só com movimento permitido; criada e destruída pelo gsap.matchMedia do App,
// então trocar a preferência no meio do uso desliga na hora. No toque, o Lenis mantém a rolagem nativa.
export function ligarRolagemSuave() {
  const lenis = new Lenis({ anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (tempo: number) => lenis.raf(tempo * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    gsap.ticker.lagSmoothing(500, 33)
    lenis.destroy()
  }
}
