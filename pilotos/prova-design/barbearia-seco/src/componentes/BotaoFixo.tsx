import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { abertura, linkWhats } from '../data/conteudo'

/** Botão de agendar fixo: aparece depois da abertura e some no contato (onde está o botão grande). */
export function BotaoFixo() {
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    const topo = document.getElementById('topo')
    const contato = document.getElementById('contato')
    const detalhe = document.getElementById('titulo-trabalho')
    if (!topo || !contato) return
    const visiveis = new Map<Element, boolean>()
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => visiveis.set(e.target, e.isIntersecting))
      setMostrar(!visiveis.get(topo) && !visiveis.get(contato) && !(detalhe && visiveis.get(detalhe)))
    })
    obs.observe(topo)
    obs.observe(contato)
    if (detalhe) obs.observe(detalhe)
    return () => obs.disconnect()
  }, [])

  return (
    <AnimatePresence>
      {mostrar && (
        <m.a
          key="agendar"
          data-ui="botao-fixo"
          href={linkWhats(abertura.mensagem)}
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.7, 0, 0.2, 1] }}
          className="fixed bottom-4 right-4 z-50 flex min-h-[52px] items-center border-[3px] border-tinta bg-grito px-5 text-[15px] font-bold uppercase tracking-[0.12em] text-tinta no-underline hover:bg-papel md:bottom-6 md:right-6"
        >
          {abertura.botaoCurto}
        </m.a>
      )}
    </AnimatePresence>
  )
}
