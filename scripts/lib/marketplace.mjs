import fs from 'node:fs'
import path from 'node:path'

export const lerJson = (arquivo, padrao) => fs.existsSync(arquivo)
  ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : padrao

export function validarManifesto(manifesto, pasta) {
  if (!manifesto || !/^[a-z0-9][a-z0-9-]*$/.test(manifesto.name || '')) {
    throw new Error(`Nome de plugin inválido em ${pasta}`)
  }
  if (manifesto.name !== pasta) throw new Error(`Nome do plugin difere da pasta: ${pasta}`)
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(manifesto.version || '')) {
    throw new Error(`Versão inválida no plugin ${pasta}`)
  }
  if (typeof manifesto.description !== 'string' || !manifesto.description.trim()) {
    throw new Error(`Descrição ausente no plugin ${pasta}`)
  }
}

// Também aceita manifestos preparados pelo importador, antes de alterar qualquer plugin.
export function montarMarketplace(raiz, preparados = new Map()) {
  const arquivo = path.join(raiz, '.claude-plugin', 'marketplace.json')
  const anterior = lerJson(arquivo, {
    name: 'devconductor', owner: { name: 'DevConductor' },
    metadata: { description: 'Ecossistema de desenvolvimento: método superpowers + especialistas por stack + fluxo de landing pages.', version: '0.1.0' },
    plugins: [],
  })
  if (!anterior || !Array.isArray(anterior.plugins)) throw new Error('Catálogo existente inválido')
  const pastaPlugins = path.join(raiz, 'plugins')
  const pastas = fs.existsSync(pastaPlugins) ? fs.readdirSync(pastaPlugins).filter((p) =>
    fs.existsSync(path.join(pastaPlugins, p, '.claude-plugin', 'plugin.json'))) : []
  const nomes = new Set()
  const plugins = [...new Set([...pastas, ...preparados.keys()])].sort().map((pasta) => {
    const m = preparados.get(pasta) ?? lerJson(path.join(pastaPlugins, pasta, '.claude-plugin', 'plugin.json'))
    if (nomes.has(m.name)) throw new Error(`Nome de plugin duplicado: ${m.name}`)
    nomes.add(m.name)
    validarManifesto(m, pasta)
    const antigo = anterior.plugins.find((p) => p.name === m.name) || {}
    return { ...antigo, name: m.name, source: `./plugins/${pasta}`, description: m.description, version: m.version }
  })
  return { ...anterior, plugins }
}

export const json = (valor) => JSON.stringify(valor, null, 2) + '\n'
