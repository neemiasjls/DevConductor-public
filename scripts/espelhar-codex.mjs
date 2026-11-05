// Prepara o Codex para assumir quando o limite do Claude acabar (troca de turno). Pode rodar de novo
// sempre que as regras mudarem. Uso: node scripts/espelhar-codex.mjs [--simular]
// 1. ~/.codex/AGENTS.md  ← espelho de ~/.claude/CLAUDE.md, com um aviso de troca de turno no topo.
// 2. ~/.codex/config.toml ← project_doc_fallback_filenames = ["CLAUDE.md"] (o Codex lê o CLAUDE.md de cada
//    projeto quando não há AGENTS.md). Faz backup do config antes de mexer.
// 3. ~/.codex/skills     ← cópia das skills memoria e subir (mesmo formato SKILL.md).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const simular = process.argv.includes('--simular')
const casa = os.homedir()
const claudeMd = path.join(casa, '.claude', 'CLAUDE.md')
const codexDir = path.join(casa, '.codex')
const agentsMd = path.join(codexDir, 'AGENTS.md')
const config = path.join(codexDir, 'config.toml')
const SKILLS = ['memoria', 'subir']

if (!fs.existsSync(codexDir)) { console.log('Codex não encontrado (~/.codex). Instale e abra o Codex uma vez.'); process.exit(1) }
if (!fs.existsSync(claudeMd)) { console.log('Não achei ~/.claude/CLAUDE.md.'); process.exit(1) }
const gravar = (arq, conteudo) => { if (simular) console.log(`  (simulação) gravaria ${arq}`); else fs.writeFileSync(arq, conteudo) }

// 1. Regras globais
const aviso = `<!-- Gerado por DevConductor/scripts/espelhar-codex.mjs a partir de ~/.claude/CLAUDE.md.
     Não edite aqui: edite o original e rode o script de novo. -->

# Para o Codex: troca de turno com o Claude Code

Você está assumindo um trabalho que o Claude Code vinha fazendo, porque o limite dele acabou.
1. Antes de tudo, leia \`docs/continuar.md\` do projeto (onde paramos) e as regras do projeto
   (\`CLAUDE.md\`, e o que ele indicar, como \`.claude/rules/\` e \`docs/\`). Confira também \`git status\`:
   o limite pode ter cortado o Claude no meio, com mudança ainda não anotada.
2. Se a primeira mensagem for curta ("continue", "assume", "oi"), isso é o pedido de retomada: diga em
   2–3 linhas onde o trabalho parou e siga o "Próximo passo" do \`continuar.md\`.
3. Se existir, leia também a memória do Claude para este projeto:
   \`~/.claude/projects/<caminho do projeto com tudo que não é letra/número trocado por "-">/memory/MEMORY.md\`
   e só os arquivos que importam para a tarefa.
4. Onde as regras abaixo citarem subagentes (tarefas-mecanicas, simple-tasks, complex-tasks), skills ou
   comandos do Claude Code, faça você mesmo o equivalente.
5. Ao terminar (ou antes de parar), atualize \`docs/continuar.md\` e deixe, logo abaixo do título, a linha
   \`> Último turno: Codex (AAAA-MM-DD HH:MM)\`. Com ela, o Claude retoma sozinho quando voltar.
6. As mesmas regras de commit valem para você: nunca se colocar como coautor nem citar ferramentas de IA.

---

`
gravar(agentsMd, aviso + fs.readFileSync(claudeMd, 'utf8'))
console.log(`1. Regras globais: ${agentsMd}`)

// 2. Fallback para o CLAUDE.md de cada projeto (chave de topo: antes da primeira [seção] do TOML)
let toml = fs.existsSync(config) ? fs.readFileSync(config, 'utf8') : ''
if (/^\s*project_doc_fallback_filenames\s*=/m.test(toml)) {
  console.log('2. config.toml: o Codex já lê o CLAUDE.md dos projetos (nada a mudar).')
} else {
  const linha = 'project_doc_fallback_filenames = ["CLAUDE.md"]\n'
  const i = toml.search(/^\s*\[/m)
  toml = i < 0 ? toml + '\n' + linha : toml.slice(0, i) + linha + '\n' + toml.slice(i)
  if (!simular && fs.existsSync(config)) fs.copyFileSync(config, `${config}.bak-devagents`)
  gravar(config, toml)
  console.log(`2. config.toml: agora o Codex lê o CLAUDE.md de cada projeto (backup: config.toml.bak-devagents).`)
}

// 3. Skills
for (const s of SKILLS) {
  const de = path.join(casa, '.claude', 'skills', s)
  const para = path.join(codexDir, 'skills', s)
  if (!fs.existsSync(de)) { console.log(`3. skill ${s}: não achei em ~/.claude/skills, pulei.`); continue }
  if (simular) { console.log(`  (simulação) copiaria ${de} → ${para}`); continue }
  fs.mkdirSync(path.dirname(para), { recursive: true })
  fs.cpSync(de, para, { recursive: true, dereference: true, force: true })
  console.log(`3. skill ${s}: copiada para ${para}`)
}
console.log('\nPronto. Quando o limite do Claude acabar: abra o Codex na pasta do projeto e escreva "continue".')
