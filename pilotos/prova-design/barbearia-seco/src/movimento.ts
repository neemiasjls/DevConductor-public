import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export { gsap, ScrollTrigger, useGSAP }

/** Rolagem suave (lp-cenas): só com movimento; no toque o Lenis mantém a rolagem nativa. */
export function ligarRolagemSuave() {
  const mm = gsap.matchMedia()
  // A preferência pode mudar com a página aberta: retire também a inércia, não só as cenas.
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const lenis = new Lenis({ anchors: true })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (tempo: number) => lenis.raf(tempo * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  })
  return () => mm.revert()
}
