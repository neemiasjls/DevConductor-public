import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { linkWhats } from '../data/conteudo'

// Atalho fixo para marcar: aparece depois da abertura e some quando o contato está na tela.
// Tinta com anel de papel: contrasta no coral, no cobalto, no papel e na tinta.
export function BotaoFixo() {
  const [visivel, mostrar] = useState(false)
  useEffect(() => {
    const estado = { passouAbertura: false, noContato: false, nosCreditos: false }
    const atualizar = () => mostrar(estado.passouAbertura && !estado.noContato && !estado.nosCreditos)
    const a = ScrollTrigger.create({ trigger: '#servicos', start: 'top 40%', end: 'max', onToggle: (st) => { estado.passouAbertura = st.isActive; atualizar() } })
    const c = ScrollTrigger.create({ trigger: '#contato', start: 'top 70%', end: 'max', onToggle: (st) => { estado.noContato = st.isActive; atualizar() } })
    // Não cobrir a legenda e a atribuição da fotografia com um controle fixo.
    const creditos = new IntersectionObserver(([e]) => { estado.nosCreditos = e.isIntersecting; atualizar() })
    const legenda = document.querySelector('#perto figcaption')
    if (legenda) creditos.observe(legenda)
    return () => { a.kill(); c.kill(); creditos.disconnect() }
  }, [])
  return (
    <AnimatePresence>
      {visivel && (
        <m.a key="fixo" href={linkWhats()} initial={{ y: 90, rotate: -6 }} animate={{ y: 0, rotate: 0 }} exit={{ y: 90, rotate: 6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          className="pilula fixed bottom-4 right-4 z-50 bg-tinta text-[15px] text-papel shadow-[0_0_0_3px_var(--color-papel)] md:bottom-6 md:right-6">
          Marcar horário
        </m.a>
      )}
    </AnimatePresence>
  )
}
