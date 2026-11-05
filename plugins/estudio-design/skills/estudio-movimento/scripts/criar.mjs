import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const [destino] = process.argv.slice(2)
if (!destino || process.argv.length !== 3) { console.error('Uso: node criar.mjs <pasta-nova>'); process.exit(1) }
const alvo = path.resolve(destino)
if (fs.existsSync(alvo)) { console.error('A pasta já existe; nada foi alterado.'); process.exit(1) }
const modelo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../modelo')
fs.cpSync(modelo, alvo, { recursive: true, errorOnExist: true, force: false })
console.log(`Modelo criado em ${alvo}. Instale as dependências e siga README.md para a foto de exemplo.`)
