import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/petrona/wght.css'
import '@fontsource-variable/red-hat-text/wght.css'
import 'lenis/dist/lenis.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
