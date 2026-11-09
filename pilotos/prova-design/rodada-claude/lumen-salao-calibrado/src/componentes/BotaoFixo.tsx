import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { linkWhats } from '../data/conteudo'

// Atalho fixo para agendar: aparece depois da abertura e some no fechamento (que já tem o botão grande)
// e sobre os créditos. Petróleo com anel claro: contrasta no claro, no petróleo e na ameixa.
export function BotaoFixo() {
  const [visivel, mostrar] = useState(false)
  useEffect(() => {
    const estado = { passou: false, noFim: false }
    const atualizar = () => mostrar(estado.passou && !estado.noFim)
    const a = ScrollTrigger.create({ trigger: '#diagnostico', start: 'top 40%', end: 'max', onToggle: (st) => { estado.passou = st.isActive; atualizar() } })
    const b = ScrollTrigger.create({ trigger: '#agendar', start: 'top 85%', end: 'max', onToggle: (st) => { estado.noFim = st.isActive; atualizar() } })
    return () => { a.kill(); b.kill() }
  }, [])
  return (
    <AnimatePresence>
      {visivel && (
        <m.a key="fixo" href={linkWhats()} initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          // taste-skill-ignore: botão fixo é sobreposição real; o anel claro garante contraste sobre petróleo e ameixa
          /* taste-skill-ignore */ className="pilula fixed bottom-4 right-4 z-50 bg-petroleo text-[15px] text-claro shadow-[0_0_0_2px_var(--color-claro)] md:bottom-6 md:right-6">
          Agendar diagnóstico
        </m.a>
      )}
    </AnimatePresence>
  )
}
