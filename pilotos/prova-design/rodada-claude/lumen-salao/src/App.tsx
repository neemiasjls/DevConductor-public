import { useEffect } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Abertura } from './secoes/Abertura'
import { Diagnostico } from './secoes/Diagnostico'
import { Fio } from './secoes/Fio'
import { Cronograma } from './secoes/Cronograma'
import { Resultado } from './secoes/Resultado'
import { Servicos } from './secoes/Servicos'
import { Agendar } from './secoes/Agendar'
import { Rodape } from './secoes/Rodape'
import { BotaoFixo } from './componentes/BotaoFixo'
import { ligarRolagemSuave } from './componentes/rolagem'

const recursosMotion = () => import('./movimento').then((m) => m.default)

// Trocar a preferência de movimento muda a altura das cenas presas, e o refresh do ScrollTrigger nessa troca
// devolve a rolagem para o topo. Guarda a seção em que a pessoa está (e quanto dela já passou) e volta para o
// mesmo ponto depois da troca.
function manterLugarNaTroca() {
  let ancora = { i: 0, f: 0 }, restaurando = false, quadro = 0
  const blocos = () => [...document.querySelectorAll<HTMLElement>('main > section, body footer')]
  const medir = () => {
    if (restaurando) return
    const lista = blocos()
    const i = lista.findIndex((b) => b.getBoundingClientRect().bottom > 0)
    if (i < 0) return
    const r = lista[i].getBoundingClientRect()
    ancora = { i, f: Math.max(0, -r.top) / Math.max(1, r.height) }
  }
  const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(() => { quadro = 0; medir() }) }
  // O refresh pode vir na mesma hora da troca (antes de qualquer escuta) ou depois: volta ao lugar nos dois casos
  // e só volta a medir quando tudo assentou.
  let espera = 0
  const ir = () => {
    const b = blocos()[ancora.i]
    if (!b) return
    window.scrollTo({ top: Math.round(b.getBoundingClientRect().top + scrollY + ancora.f * b.offsetHeight), behavior: 'instant' })
  }
  const aoMedir = () => requestAnimationFrame(ir)
  const aoTrocar = () => {
    restaurando = true
    ScrollTrigger.addEventListener('refresh', aoMedir)
    requestAnimationFrame(() => requestAnimationFrame(ir))
    clearTimeout(espera)
    espera = window.setTimeout(() => {
      ScrollTrigger.removeEventListener('refresh', aoMedir)
      restaurando = false
      medir()
    }, 700)
  }
  const preferencia = matchMedia('(prefers-reduced-motion: reduce)')
  preferencia.addEventListener('change', aoTrocar)
  addEventListener('scroll', aoRolar, { passive: true })
  medir()
  return () => {
    preferencia.removeEventListener('change', aoTrocar)
    removeEventListener('scroll', aoRolar)
    ScrollTrigger.removeEventListener('refresh', aoMedir)
    clearTimeout(espera)
    cancelAnimationFrame(quadro)
  }
}

export default function App() {
  useEffect(() => {
    // A fonte do título muda a altura dos blocos: medir de novo quando ela chegar.
    let vivo = true
    document.fonts.ready.then(() => vivo && ScrollTrigger.refresh())
    const largarAncora = manterLugarNaTroca()
    // Lenis criado e destruído junto com a preferência de movimento (troca dinâmica desliga na hora).
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => ligarRolagemSuave())
    return () => { vivo = false; largarAncora(); mm.revert() }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={recursosMotion} strict>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-claro focus:px-4 focus:py-2 focus:text-petroleo">
          Pular para o conteúdo
        </a>
        <main id="conteudo">
          <Abertura />
          <Diagnostico />
          <Fio />
          <Cronograma />
          <Resultado />
          <Servicos />
          <Agendar />
        </main>
        <Rodape />
        <BotaoFixo />
      </LazyMotion>
    </MotionConfig>
  )
}
