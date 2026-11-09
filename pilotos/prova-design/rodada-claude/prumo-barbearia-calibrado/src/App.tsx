import { useEffect } from 'react'
import Lenis from 'lenis'
import { LazyMotion, MotionConfig } from 'motion/react'
import { gsap, ScrollTrigger } from './gsap'
import Cabecalho from './secoes/Cabecalho'
import Abertura from './secoes/Abertura'
import Manifesto from './secoes/Manifesto'
import Degrade from './secoes/Degrade'
import Servicos from './secoes/Servicos'
import Horarios from './secoes/Horarios'
import Agendar from './secoes/Agendar'
import Rodape from './secoes/Rodape'

const recursos = () => import('./recursos-motion').then((r) => r.default)

// Rolagem suave criada e destruída junto da preferência de movimento (troca dinâmica).
function ligarRolagemSuave() {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const lenis = new Lenis({ anchors: true })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (tempo: number) => lenis.raf(tempo * 1000)
    gsap.ticker.add(tick)
    return () => { gsap.ticker.remove(tick); lenis.destroy() }
  })
  gsap.ticker.lagSmoothing(0)
  return () => mm.revert()
}

export default function App() {
  useEffect(() => {
    const desligar = ligarRolagemSuave()
    let vivo = true
    document.fonts?.ready.then(() => { if (vivo) ScrollTrigger.refresh() })
    return () => { vivo = false; desligar() }
  }, [])

  return (
    <LazyMotion features={recursos} strict>
      <MotionConfig reducedMotion="user">
        <a href="#conteudo" className="sr-only fixed left-4 top-3 z-[100] bg-papel p-3 text-tinta focus:not-sr-only focus:fixed">Pular para o conteúdo</a>
        <Cabecalho />
        <main id="conteudo" tabIndex={-1}>
          <Abertura />
          <Manifesto />
          <Degrade />
          <Servicos />
          <Horarios />
          <Agendar />
        </main>
        <Rodape />
      </MotionConfig>
    </LazyMotion>
  )
}
