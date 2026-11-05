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

/** Formata temperatura em pt-BR com sinal de menos tipográfico: −18,0 °C */
export function graus(v: number, casas = 1) {
  const t = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
  return `${v < 0 ? '−' : ''}${t} °C`
}
