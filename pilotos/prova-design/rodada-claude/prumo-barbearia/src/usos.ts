import { useEffect, useState } from 'react'

export function usePrefere(consulta: string) {
  const [ativo, mudar] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches)
  useEffect(() => {
    const m = window.matchMedia(consulta)
    const aoMudar = () => mudar(m.matches)
    aoMudar()
    m.addEventListener('change', aoMudar)
    return () => m.removeEventListener('change', aoMudar)
  }, [consulta])
  return ativo
}

export function temWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
