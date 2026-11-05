// Fase D: audita origem/dono/ativação sem carregar skills nem tocar configurações.
// Uso: node scripts/auditar-responsabilidades.mjs [--json | --markdown] [--globais]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditarResponsabilidades, compararEscopos, tabelaResponsabilidades } from './lib/responsabilidades.mjs'

const args = process.argv.slice(2)
if (args.some(a => !['--json','--markdown','--globais'].includes(a)) || args.includes('--json') && args.includes('--markdown')) {
  console.error('Uso: node scripts/auditar-responsabilidades.mjs [--json | --markdown] [--globais]'); process.exit(1)
}
try {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const arquivo = path.join(raiz, 'plugins/devconductor-core/skills/orquestrador/referencias/responsabilidades.json')
  const resultado = auditarResponsabilidades(raiz, JSON.parse(fs.readFileSync(arquivo, 'utf8')))
  if (args.includes('--globais')) {
    const casa = os.homedir()
    resultado.colisoesGlobais = compararEscopos(raiz, [
      ...['.claude/skills','.agents/skills','.codex/skills'].map(p => ({ base: path.join(casa,p), tipo:'skill', rotulo:`~/${p}` })),
      {base: path.join(casa,'.claude/agents'), tipo:'agente', rotulo:'~/.claude/agents'},
    ])
  }
  if (args.includes('--json')) console.log(JSON.stringify(resultado, null, 2))
  else if (args.includes('--markdown')) {
    console.log('# Responsabilidades das skills — Fase D\n\n' +
      'Tabela gerada de `plugins/devconductor-core/skills/orquestrador/referencias/responsabilidades.json`.\n' +
      'Regerar: `node scripts/auditar-responsabilidades.mjs --markdown`. Verificar: `node scripts/auditar-responsabilidades.mjs`.\n\n' +
      'Um responsável por decisão e uma origem por skill. O responsável de stack é a referência técnica: só vira agente\n' +
      'para uma tarefa isolada que justifique a delegação. Design, movimento e textos ficam na conversa principal.\n' +
      'Pesquisador, testador e publicador recebem o recorte da tarefa; não carregam esta lista inteira.\n' +
      'Outra etapa pode consultar uma skill na origem indicada, sem duplicar o arquivo ou carregar toda a família.\n' +
      'Método externo: superpowers (instalado à parte); não se copia seu processo para estas skills.\n\n' +
      '† Dependência local opcional, excluída do Git por licença pendente. Ausência não perde cobertura; não redistribuir.\n\n' +
      tabelaResponsabilidades(resultado))
  } else {
    console.log(`${resultado.skills} skills presentes, ${resultado.declaradas} declaradas; ${resultado.erros.length} problemas de responsabilidade.`)
    if (resultado.colisoesGlobais) {
      console.log(`${resultado.colisoesGlobais.length} colisões com cópias globais (somente leitura; nada removido).`)
      for (const c of resultado.colisoesGlobais) console.log(`${c.tipo} ${c.origem} → ${c.candidatos.map(s => `${s.id} (${s.mesmoConteudo ? 'mesmo conteúdo' : 'conteúdo diferente'})`).join(', ')}`)
    }
  }
  for (const erro of resultado.erros) console.error(erro)
  if (!resultado.aprovado) process.exitCode = 1
} catch (erro) { console.error(erro.message); process.exitCode = 1 }
