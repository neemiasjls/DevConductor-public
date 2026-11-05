import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditarResponsabilidades, compararEscopos } from '../lib/responsabilidades.mjs'

const raiz = fileURLToPath(new URL('../../', import.meta.url))
const registro = path.join(raiz, 'plugins/devconductor-core/skills/orquestrador/referencias/responsabilidades.json')
const matriz = () => ({ versao: 1, grupos: [{ plugin:'exemplo', dono:'principal', uso:'tarefa', skills:['entrada'] }] })
function fixture(t) {
  const base = path.join(raiz, 'pilotos/testes-temporarios'); fs.mkdirSync(base, { recursive:true })
  const pasta = fs.mkdtempSync(path.join(base,'donos-'))
  t.after(() => {
    assert.equal(path.dirname(fs.realpathSync(pasta)), fs.realpathSync(base))
    fs.rmSync(pasta, { recursive:true, force:true, maxRetries:30, retryDelay:100 })
  })
  const gravar = (rel, texto) => { const f = path.join(pasta,rel); fs.mkdirSync(path.dirname(f), {recursive:true}); fs.writeFileSync(f,texto); return f }
  const skill = (plugin, nome, extra='', nomeReal=nome) => gravar(`plugins/${plugin}/skills/${nome}/SKILL.md`, `---\nname: ${nomeReal}\ndescription: Exemplo do teste\n${extra}---\nConteúdo do teste.\n`)
  skill('exemplo','entrada')
  return { pasta, skill, gravar }
}

test('cada skill instalada tem um dono válido, sem duplicar identidade nem destravar consultoras', () => {
  const r = auditarResponsabilidades(raiz, JSON.parse(fs.readFileSync(registro,'utf8')))
  assert.deepEqual(r.erros, [])
  assert.equal(r.aprovado, true)
  assert(r.skills > 0)
  assert.equal(new Set(r.linhas.map(l=>l.id)).size, r.linhas.length)
})

test('skill nova sem dono, nome duplicado, dono inexistente e atribuição dupla são erros', t => {
  const f = fixture(t), m = matriz()
  f.skill('outro','entrada')
  const r = auditarResponsabilidades(f.pasta,m)
  assert(r.erros.some(e=>e.includes('Skill sem dono: outro:entrada')))
  assert(r.erros.some(e=>e.includes('Skill duplicada: entrada')))
  m.grupos.push({...m.grupos[0], dono:'exemplo:ausente'})
  const outro = auditarResponsabilidades(f.pasta,m)
  assert(outro.erros.some(e=>e.includes('Dono inexistente')))
  assert(outro.erros.some(e=>e.includes('Mais de um dono')))
})

test('consultora precisa continuar travada e vinculada a uma skill de etapa existente', t => {
  const f = fixture(t), m = matriz()
  f.skill('exemplo','consulta','disable-model-invocation: true\n')
  m.grupos.push({plugin:'exemplo',dono:'exemplo:entrada',uso:'consultora',skills:['consulta']})
  assert.equal(auditarResponsabilidades(f.pasta,m).aprovado,true)
  m.grupos[1].uso='tarefa'
  assert(auditarResponsabilidades(f.pasta,m).erros.some(e=>e.includes('Ativação divergente')))
  m.grupos[1].uso='consultora'; m.grupos[1].dono='principal'
  assert(auditarResponsabilidades(f.pasta,m).erros.some(e=>e.includes('Consultora sem skill responsável')))
})

test('skill e agente não podem disputar o mesmo identificador de responsável', t => {
  const f = fixture(t)
  f.gravar('plugins/exemplo/agents/entrada.md', '---\nname: entrada\n---\nAgente de teste.\n')
  assert(auditarResponsabilidades(f.pasta,matriz()).erros.some(e=>e.includes('Identificador compartilhado')))
})

test('cópias locais sem licença são opcionais, mas entrada obsoleta normal e alias oculto falham', t => {
  const f = fixture(t), m = matriz()
  m.grupos[0].skills.push('opcional')
  m.opcionais=['exemplo:opcional']
  assert.equal(auditarResponsabilidades(f.pasta,m).aprovado,true)
  m.opcionais=[]
  assert(auditarResponsabilidades(f.pasta,m).erros.some(e=>e.includes('Skill da matriz ausente')))
  m.grupos[0].skills=['entrada']; f.skill('exemplo','entrada','', 'nome-original')
  assert.equal(auditarResponsabilidades(f.pasta,m).aprovado,false)
  m.nomes={'exemplo:entrada':'nome-original'}
  assert.equal(auditarResponsabilidades(f.pasta,m).aprovado,true)
  assert.equal(auditarResponsabilidades(f.pasta,m).linhas[0].chamada,'exemplo:nome-original')
})

test('comparação de escopos é só leitura, considera identidade real e deduplica links físicos', t => {
  const f=fixture(t)
  const fonte = f.skill('exemplo','entrada')
  const global=f.gravar('escopo/skills/atalho/SKILL.md',fs.readFileSync(fonte,'utf8').replaceAll('\n','\r\n'))
  const agente=f.gravar('plugins/exemplo/agents/bracal.md','---\nname: bracal\n---\nExecutar.\n')
  const copia=f.gravar('escopo/agents/bracal.md',fs.readFileSync(agente,'utf8')+'Outra regra.\n')
  const antes=[global,copia].map(x=>fs.readFileSync(x))
  fs.symlinkSync(path.dirname(global),path.join(f.pasta,'escopo/skills/outro-atalho'),process.platform==='win32'?'junction':'dir')
  const rel = compararEscopos(f.pasta,[
    {base:path.join(f.pasta,'escopo/skills'),tipo:'skill',rotulo:'~/skills'},
    {base:path.join(f.pasta,'escopo/agents'),tipo:'agente',rotulo:'~/agents'},
  ])
  assert.equal(rel.length,2)
  assert.equal(rel.find(x=>x.tipo==='skill').nome,'entrada')
  assert.equal(rel.find(x=>x.tipo==='skill').candidatos[0].mesmoConteudo,true)
  assert.equal(rel.find(x=>x.tipo==='agente').candidatos[0].mesmoConteudo,false)
  assert.deepEqual([global,copia].map(x=>fs.readFileSync(x)),antes)
  assert(!JSON.stringify(rel).includes(f.pasta))
})
