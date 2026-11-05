import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Foto real de Tom Beck: https://unsplash.com/photos/aerial-view-of-ocean-waves--NquqeJwHxc
// Unsplash License: https://unsplash.com/license. Download explícito, só para o estudo.
try {
  const resposta = await fetch('https://images.unsplash.com/photo-1597399501504-d903df14b012?auto=format&fit=crop&w=1600&q=82', { signal: AbortSignal.timeout(30000) })
  if (!resposta.ok || !resposta.headers.get('content-type')?.startsWith('image/')) throw new Error(`Resposta inválida: ${resposta.status}`)
  const dados = new Uint8Array(await resposta.arrayBuffer())
  if (dados.length > 900000) throw new Error('Foto excedeu o orçamento de 900 KB')
  await fs.writeFile(fileURLToPath(new URL('./public/assets/mar.jpg', import.meta.url)), dados)
  console.log(`Foto salva: ${dados.length} bytes`)
} catch (erro) { console.error(`Não consegui baixar a foto: ${erro.message}. Tente novamente ou coloque sua foto em public/assets/mar.jpg.`); process.exitCode = 1 }
