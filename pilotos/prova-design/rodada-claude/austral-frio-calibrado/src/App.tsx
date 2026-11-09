import { gsap, ScrollTrigger, useGSAP } from './gsap'
import { consultas } from './ritmo'
import { ligarRolagemSuave } from './rolagem'
import Abertura from './secoes/Abertura'
import Compromisso from './secoes/Compromisso'
import Contato from './secoes/Contato'
import Cotar from './secoes/Cotar'
import Doca from './secoes/Doca'
import Faixas from './secoes/Faixas'
import Porta from './secoes/Porta'
import Viagem from './secoes/Viagem'

export default function App() {
  // Rolagem suave só com movimento permitido; a troca da preferência cria/destrói o Lenis.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => ligarRolagemSuave())
    // Fontes mudam a altura dos blocos: recalcula as cenas quando terminam de carregar.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  })

  return (
    <>
      <Abertura />
      <main>
        <Porta />
        <Compromisso />
        <Viagem />
        <Faixas />
        <Doca />
        <Cotar />
        <Contato />
      </main>
    </>
  )
}
