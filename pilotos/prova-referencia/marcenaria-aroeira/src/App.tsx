import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import Cabecalho from './secoes/Cabecalho'
import Abertura from './secoes/Abertura'
import Oficio from './secoes/Oficio'
import Ambientes from './secoes/Ambientes'
import Processo from './secoes/Processo'
import Historia from './secoes/Historia'
import Chamada from './secoes/Chamada'
import Rodape from './secoes/Rodape'
import WhatsFixo from './componentes/WhatsFixo'

export default function App() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.1 })
    lenis.on('scroll', ScrollTrigger.update)
    const passo = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(passo)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(passo); lenis.destroy() }
  }, [])

  return (
    <>
      <Cabecalho />
      <main>
        <Abertura />
        <Oficio />
        <Ambientes />
        <Processo />
        <Historia />
        <Chamada />
      </main>
      <Rodape />
      <WhatsFixo />
    </>
  )
}
