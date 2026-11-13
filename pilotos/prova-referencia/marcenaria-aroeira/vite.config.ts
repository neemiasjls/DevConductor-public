import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Adianta a fonte do título: o texto da abertura já nasce na fonte certa (sem troca que atrasa a maior pintura).
const adiantarFonte = (): Plugin => ({
  name: 'adiantar-fonte-do-titulo',
  transformIndexHtml: {
    order: 'post',
    handler(_html, ctx) {
      const arq = Object.keys(ctx.bundle ?? {}).find((n) => /bodoni-moda-latin-400-normal.*\.woff2$/.test(n))
      return arq ? [{ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${arq}`, crossorigin: '' }, injectTo: 'head' }] : []
    },
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), adiantarFonte()],
  server: { port: 5211, strictPort: true, host: '127.0.0.1' },
  preview: { port: 5211, strictPort: true, host: '127.0.0.1' },
})
