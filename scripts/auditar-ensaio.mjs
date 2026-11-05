import { auditarEnsaio } from './lib/qualidade-ensaio.mjs'
const args = process.argv.slice(2), json = args.includes('--json'), arquivos = args.filter(a => a !== '--json')
if (arquivos.length !== 1 || arquivos[0].startsWith('--')) {
  console.error('Uso: node scripts/auditar-ensaio.mjs <plano.json> [--json]')
  process.exit(1)
}
const r = auditarEnsaio(arquivos[0])
if (json) console.log(JSON.stringify(r, null, 2))
else {
  console.log(`Ensaio ${r.estado}: ${r.concluidas}/${r.total} execuções declaradas concluídas.`)
  for (const p of r.problemas) console.log('- ' + p)
  if (r.pendentes.length) console.log(`${r.pendentes.length} execuções ainda pendentes; comparação não liberada.`)
  console.log(r.limite || 'Corrija o plano antes de comparar.')
}
process.exitCode = r.estado === 'aprovado' ? 0 : r.estado === 'incompleto' ? 2 : 1
