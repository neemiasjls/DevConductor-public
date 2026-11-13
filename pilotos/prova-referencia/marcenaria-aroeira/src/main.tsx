import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/familjen-grotesk'
import '@fontsource/bodoni-moda/400.css'
import '@fontsource/bodoni-moda/400-italic.css'
import '@fontsource/mrs-saint-delafield/latin-400.css'
import 'lenis/dist/lenis.css'
import './index.css'
import App from './App'

// O build grava um retrato estático da página dentro da raiz (texto e fotos aparecem antes do JavaScript).
// Ao montar, o React troca o retrato; a marca sai da raiz e fica no <html> para a abertura não piscar.
const raiz = document.getElementById('root')!
if (raiz.dataset.prerender) {
  document.documentElement.dataset.retrato = '1'
  delete raiz.dataset.prerender
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
