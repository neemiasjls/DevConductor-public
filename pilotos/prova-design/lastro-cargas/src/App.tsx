import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap'
import Cabecalho from './componentes/Cabecalho'
import Abertura from './componentes/Abertura'
import Manifesto from './componentes/Manifesto'
import Rotas from './componentes/Rotas'
import NaEstrada from './componentes/NaEstrada'
import Servicos from './componentes/Servicos'
import Garantias from './componentes/Garantias'
import Contato from './componentes/Contato'
import Rodape from './componentes/Rodape'
import WhatsFlutuante from './componentes/WhatsFlutuante'

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
    // Os pins nascem em ordem de documento e o ScrollTrigger já recalcula no load; só falta o troca-fonte.
    const desligar = ligarRolagemSuave()
    let vivo = true
    document.fonts?.ready.then(() => { if (vivo) ScrollTrigger.refresh() })
    return () => { vivo = false; desligar() }
  }, [])

  return (
    <>
      <a href="#conteudo" className="sr-only fixed left-4 top-3 z-[100] bg-papel p-3 text-tinta focus:not-sr-only focus:fixed">Pular para o conteúdo</a>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1}>
        <Abertura />
        <Manifesto />
        <Rotas />
        <NaEstrada />
        <Servicos />
        <Garantias />
        <Contato />
      </main>
      <Rodape />
      <WhatsFlutuante />
    </>
  )
}
