import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { ScrollTrigger, ligarRolagemSuave, useGSAP } from './movimento'
import { faixaCasa, faixaServicos } from './data/conteudo'
import { Abertura } from './secoes/Abertura'
import { Faixa } from './secoes/Faixa'
import { Navalha } from './secoes/Navalha'
import { Trabalho } from './secoes/Trabalho'
import { Cortes } from './secoes/Cortes'
import { Precos } from './secoes/Precos'
import { SentaAi } from './secoes/SentaAi'
import { Contato } from './secoes/Contato'
import { BotaoFixo } from './componentes/BotaoFixo'

export default function App() {
  useGSAP(() => {
    const desligar = ligarRolagemSuave()
    // Fonte do título muda as medidas (máscara, pilha): recalcular quando ela chegar.
    document.fonts.ready.then(() => ScrollTrigger.refresh())
    return desligar
  })

  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
      <a href="#contato" className="sr-only-foco fixed left-3 top-10 z-[60] bg-grito px-4 py-3 font-bold text-tinta">
        Pular para o agendamento
      </a>
      <Abertura />
      <Faixa itens={faixaServicos} inclinacao={-3} sentido={1} tema="grito" className="-mb-[11vw] -mt-[0.6vw] max-md:-mb-[10vw] max-md:-mt-[10vw]" />
      <main>
        <Navalha />
        <Trabalho />
        <Cortes />
        <Faixa itens={faixaCasa} inclinacao={2.5} sentido={-1} tema="tinta" className="-mb-[7vw] -mt-[7vw] max-md:-mb-[10vw] max-md:-mt-[10vw]" />
        <Precos />
        <SentaAi />
        <Contato />
      </main>
      <BotaoFixo />
    </MotionConfig>
    </LazyMotion>
  )
}
