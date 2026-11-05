import { useEffect } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Abertura } from './secoes/Abertura'
import { Servicos } from './secoes/Servicos'
import { Tranca } from './secoes/Tranca'
import { Perto } from './secoes/Perto'
import { Estilos } from './secoes/Estilos'
import { Agenda } from './secoes/Agenda'
import { Contato } from './secoes/Contato'
import { Rodape } from './secoes/Rodape'
import { BotaoFixo } from './componentes/BotaoFixo'

const recursosMotion = () => import('./movimento').then((m) => m.default)

export default function App() {
  useEffect(() => {
    // A fonte do título muda a largura das palavras: medir de novo quando ela chegar.
    let vivo = true
    document.fonts.ready.then(() => vivo && ScrollTrigger.refresh())
    return () => { vivo = false }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={recursosMotion} strict>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-tinta focus:px-4 focus:py-2 focus:text-papel">
        Pular para o conteúdo
      </a>
      <main id="conteudo">
        <div className="relative">
          <Abertura />
          <Servicos />
        </div>
        <Tranca />
        <Perto />
        <Estilos />
        <Agenda />
        <Contato />
      </main>
      <Rodape />
      <BotaoFixo />
      </LazyMotion>
    </MotionConfig>
  )
}
