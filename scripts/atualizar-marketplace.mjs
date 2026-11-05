// Atualiza só o catálogo a partir dos plugin.json, sem importar ou substituir agentes e skills.
// Uso: node scripts/atualizar-marketplace.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { montarMarketplace, json } from './lib/marketplace.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
  const catalogo = montarMarketplace(raiz)
  const pasta = path.join(raiz, '.claude-plugin')
  fs.mkdirSync(pasta, { recursive: true })
  const temporario = path.join(pasta, `marketplace-${process.pid}.tmp`)
  try {
    fs.writeFileSync(temporario, json(catalogo))
    fs.renameSync(temporario, path.join(pasta, 'marketplace.json'))
  } finally {
    if (fs.existsSync(temporario)) fs.unlinkSync(temporario)
  }
  console.log(`Catálogo atualizado: ${catalogo.plugins.length} plugins. Agentes e skills preservados.`)
} catch (e) {
  console.error(`ERRO: ${e.message}`)
  process.exitCode = 1
}
