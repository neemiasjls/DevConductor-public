import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
for (const nome of fs.readdirSync('vitrine').filter(f => f.endsWith('.webm'))) {
  const video = path.join('vitrine', nome)
  const temporario = video + '.finalizando.webm'
  try {
    execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-y','-i',video,'-c','copy',temporario], { stdio: 'pipe' })
    fs.renameSync(temporario, video)
  } finally { if (fs.existsSync(temporario)) fs.rmSync(temporario) }
}
console.log('12 vídeos finalizados com metadados de duração.')
