import { lazy, Suspense, useEffect, useState } from 'react'

// O Motion só é baixado quando o botão aparece pela primeira vez (depois da abertura).
const WhatsAnimado = lazy(() => import('./WhatsAnimado'))

export default function WhatsFlutuante() {
  const [visivel, mostrar] = useState(false)
  const [usado, usar] = useState(false)
  useEffect(() => {
    const aoRolar = () => {
      const fim = document.documentElement.scrollHeight - window.innerHeight - 40
      const agora = window.scrollY > window.innerHeight * 1.2 && window.scrollY < fim
      mostrar(agora)
      if (agora) usar(true)
    }
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  if (!usado) return null
  return (
    <Suspense fallback={null}>
      <WhatsAnimado visivel={visivel} />
    </Suspense>
  )
}
