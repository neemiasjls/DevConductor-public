import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import '@fontsource-variable/big-shoulders-display'
import '@fontsource-variable/golos-text'
import './index.css'
import App from './App'

gsap.registerPlugin(ScrollTrigger, useGSAP)
history.scrollRestoration = 'manual' // as cenas presas medem a página no começo; voltar ao topo evita pular no meio de uma

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
