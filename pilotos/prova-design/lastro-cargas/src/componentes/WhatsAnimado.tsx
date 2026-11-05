import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { abertura, whatsapp } from '../data/conteudo'
import { IconeWhatsapp } from './desenhos'

// Botão flutuante: entra com escala e pulsa uma única vez (um anel que se abre e some).
export default function WhatsAnimado({ visivel }: { visivel: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {visivel && (
          <motion.a
            key="whats"
            href={whatsapp(abertura.mensagem)}
            aria-label="Pedir cotação pelo WhatsApp"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-sinal text-tinta shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:bottom-8 md:right-8"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-sinal"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
            <IconeWhatsapp className="size-7" />
          </motion.a>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
