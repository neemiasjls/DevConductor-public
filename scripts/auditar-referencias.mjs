// Auditoria local: manifestos, versões e links relativos de Markdown que apontam para arquivos.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { montarMarketplace } from './lib/marketplace.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, '.claude-plugin/marketplace.json')))
const esperado = montarMarketplace(raiz)
const erros = []
for (const plugin of esperado.plugins) {
  const registrado = catalogo.plugins.find((p) => p.name === plugin.name)
  if (!registrado || registrado.version !== plugin.version || registrado.source !== plugin.source)
    erros.push(`Catálogo desatualizado: ${plugin.name}`)
}
function visitar(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(item.name)) continue
    const arquivo = path.join(dir, item.name)
    if (item.isDirectory()) visitar(arquivo)
    else if (item.name.endsWith('.md')) {
      const texto = fs.readFileSync(arquivo, 'utf8').replace(/```[\s\S]*?```/g, '')
      for (const m of texto.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
        const href = m[1]
        if (/^(?:[a-z]+:|#|\/|<)/i.test(href) || /[{}*]/.test(href)) continue
        const destino = decodeURIComponent(href.split('#')[0])
        if (destino && !fs.existsSync(path.resolve(path.dirname(arquivo), destino)))
          erros.push(`${path.relative(raiz, arquivo)}: ${href}`)
      }
    }
  }
}
visitar(path.join(raiz, 'plugins'))
for (const erro of erros) console.error(erro)
console.log(`${esperado.plugins.length} plugins conferidos; ${erros.length} referências ou versões pendentes.`)
if (erros.length) process.exitCode = 1
