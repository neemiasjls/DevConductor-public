import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Pré-carrega só os subconjuntos latinos das duas fontes (título e texto). Sem isso, numa primeira visita a
// fonte chega depois da primeira pintura e a troca reflui o título da abertura (CLS 0,26 medido a 768 px).
function preloadFontes(): Plugin {
  return {
    name: 'preload-fontes',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return
        return Object.keys(ctx.bundle)
          .filter((f) => /\/(petrona|red-hat-text)-latin-wght-normal-[^/]+\.woff2$/.test(f))
          .map((f) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: '/' + f, crossorigin: '' },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFontes()],
  server: { port: 5205, strictPort: true, host: '127.0.0.1' },
  preview: { port: 5205, strictPort: true, host: '127.0.0.1' },
})
