import { useSyncExternalStore } from 'react'

// Preferência de movimento ao vivo: muda junto quando a pessoa troca a configuração do sistema.
const consulta = '(prefers-reduced-motion: no-preference)'
const assinar = (avisar: () => void) => {
  const mq = matchMedia(consulta)
  mq.addEventListener('change', avisar)
  return () => mq.removeEventListener('change', avisar)
}
export const useMovimento = () => useSyncExternalStore(assinar, () => matchMedia(consulta).matches, () => true)
