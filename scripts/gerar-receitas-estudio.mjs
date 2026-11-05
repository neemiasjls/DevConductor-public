// Registra os estudos originais da D2 sem substituir receitas editadas anteriormente.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { estudosExtras } from '../plugins/estudio-design/skills/estudio-movimento/modelo/src/familias.js'
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pasta = path.join(raiz, 'plugins/landing-pages/skills/lp-cenas/receitas')
fs.mkdirSync(pasta, { recursive: true })
let criadas = 0
for (const e of estudosExtras) {
  if (!/^[a-z0-9-]+$/.test(e.receita)) throw new Error('ID de receita inválido')
  const arquivo = path.join(pasta, e.receita + '.md')
  if (fs.existsSync(arquivo)) continue
  fs.writeFileSync(arquivo, `# ${e.nome}\n\n**Família:** ${e.familia}. **Estudo:** \`${e.id}\`.\n\n${e.descricao}\n\n## Código e aplicação\n\nImplementação original completa em [CenasExtras.jsx](../../../../estudio-design/skills/estudio-movimento/modelo/src/CenasExtras.jsx), funções \`CenaExtra\` e \`animarExtra\`; estilos em [familias.css](../../../../estudio-design/skills/estudio-movimento/modelo/src/familias.css).\n\n\`CenaExtra({ tipo: '${e.id}' })\` monta a composição. Dentro de \`gsap.matchMedia\`, chamar \`animarExtra('${e.id}', gsap, st, raiz)\`. O modelo contém o escopo React e sua limpeza; não criar animações fora desse ciclo.\n\n## Celular, pausa e acessibilidade\n\nComputador: até uma cena presa, scrub 0,45. Celular: sem pin, de top 75% a bottom 25%. Pausa e movimento reduzido: composição estática legível, sem transformações de entrada; preservar os estilos estáticos do modelo. SVG tem descrição acessível. Números e mapa são demonstrações explicitamente rotuladas, nunca fatos de cliente.\n\n## Evidências e peso\n\nAbrir \`/?estudo=${e.id}\`. Testes dos quatro modos em \`pilotos/estudios/evidencias/testes.json\`; vídeos \`pilotos/estudios/vitrine/${e.id}.webm\` e \`${e.id}-celular.webm\`, com seis quadros por vídeo.\n\nSem download próprio de foto, vídeo ou modelo 3D. Usa o bundle compartilhado do estúdio (medir novamente após alterações; orçamento 150 kB gzip). Não atribuir o peso inteiro a uma única cena nem tratar aprovação automática como aprovação estética do usuário.\n\n**Licença:** código e geometria originais MIT do DevConductor. GSAP possui licença própria; fonte Saira sob OFL. Não há código copiado de referências externas. Favoritos e aprovação visual continuam com o usuário.\n`)
  criadas++
}
console.log(`${criadas} receitas criadas; receitas existentes preservadas.`)
