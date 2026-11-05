import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const slug = /^[a-z0-9][a-z0-9-]*$/
const qualificado = /^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/
const ordenar = (a, b) => a.localeCompare(b, 'en')
const pastas = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort(ordenar) : []
const assinatura = texto => createHash('sha256').update(texto.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')).digest('hex')

function metadados(arquivo) {
  const texto = fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, '')
  const cabecalho = texto.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || ''
  let nome = cabecalho.match(/^name:\s*([^\r\n]+)$/m)?.[1]?.trim()
  if (nome?.startsWith('"')) { try { nome = JSON.parse(nome) } catch { nome = undefined } }
  else if (nome?.startsWith("'")) nome = /^'[^']*(?:''[^']*)*'$/.test(nome) ? nome.slice(1, -1).replaceAll("''", "'") : undefined
  else nome = nome?.replace(/\s+#.*$/, '').trim()
  return { nome, consultora: /^disable-model-invocation:\s*true\s*(?:#.*)?$/m.test(cabecalho), hash: assinatura(texto) }
}

export function inventariarKit(raiz) {
  const skills = [], agentes = []
  for (const plugin of pastas(path.join(raiz, 'plugins'))) {
    for (const pasta of pastas(path.join(raiz, 'plugins', plugin, 'skills'))) {
      const arquivo = path.join(raiz, 'plugins', plugin, 'skills', pasta, 'SKILL.md')
      if (!fs.existsSync(arquivo)) continue
      skills.push({ id: `${plugin}:${pasta}`, plugin, pasta, tipo: 'skill', ...metadados(arquivo) })
    }
    const dir = path.join(raiz, 'plugins', plugin, 'agents')
    if (!fs.existsSync(dir)) continue
    for (const item of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => ordenar(a.name,b.name))) {
      if (!item.isFile() || !item.name.endsWith('.md')) continue
      const pasta = item.name.slice(0, -3)
      agentes.push({ id: `${plugin}:${pasta}`, plugin, pasta, tipo: 'agente', ...metadados(path.join(dir, item.name)) })
    }
  }
  return { skills, agentes }
}

export function auditarResponsabilidades(raiz, matriz) {
  const { skills, agentes } = inventariarKit(raiz)
  const erros = [], linhas = [], atribuidos = new Set()
  const disponiveis = new Map([...skills, ...agentes].map(s => [s.id, s]))
  const opcionais = new Set(matriz.opcionais || [])
  if (matriz.versao !== 1 || !Array.isArray(matriz.grupos)) throw Error('Matriz de responsabilidades inválida')
  for (const s of [...skills, ...agentes]) {
    if (!slug.test(s.nome || '') || s.nome !== (matriz.nomes?.[s.id] || s.pasta)) erros.push(`Identidade inválida em ${s.id}: name difere da identidade declarada`)
  }
  if (disponiveis.size !== skills.length + agentes.length) erros.push('Identificador compartilhado entre skill e agente')
  const nomes = new Map()
  for (const s of skills) {
    if (nomes.has(s.nome)) erros.push(`Skill duplicada: ${s.nome} em ${nomes.get(s.nome)} e ${s.id}`)
    else nomes.set(s.nome, s.id)
  }
  for (const grupo of matriz.grupos) {
    if (!slug.test(grupo.plugin || '') || !Array.isArray(grupo.skills) || !grupo.skills.length || !['tarefa','etapa','consultora'].includes(grupo.uso)) {
      erros.push('Grupo inválido na matriz'); continue
    }
    if (grupo.dono !== 'principal' && (!qualificado.test(grupo.dono || '') || !disponiveis.has(grupo.dono))) erros.push(`Dono inexistente: ${grupo.dono}`)
    for (const nome of grupo.skills) {
      const id = `${grupo.plugin}:${nome}`
      if (!slug.test(nome || '')) { erros.push(`Nome inválido na matriz: ${id}`); continue }
      if (atribuidos.has(id)) erros.push(`Mais de um dono para ${id}`)
      atribuidos.add(id)
      const skill = disponiveis.get(id)
      if (skill?.tipo !== 'skill' && !opcionais.has(id)) erros.push(`Skill da matriz ausente: ${id}`)
      if (skill && skill.consultora !== (grupo.uso === 'consultora')) erros.push(`Ativação divergente: ${id} deve preservar disable-model-invocation`)
      if (grupo.uso === 'consultora' && disponiveis.get(grupo.dono)?.tipo !== 'skill') erros.push(`Consultora sem skill responsável: ${id}`)
      linhas.push({ id, chamada: `${grupo.plugin}:${matriz.nomes?.[id] || nome}`, dono: grupo.dono, uso: grupo.uso, opcional: opcionais.has(id) })
    }
  }
  for (const s of skills) if (!atribuidos.has(s.id)) erros.push(`Skill sem dono: ${s.id}`)
  for (const id of opcionais) if (!atribuidos.has(id)) erros.push(`Opcional não mapeada: ${id}`)
  for (const id of Object.keys(matriz.nomes || {})) if (!atribuidos.has(id) || !slug.test(matriz.nomes[id])) erros.push(`Alias de identidade inválido: ${id}`)
  return { aprovado: !erros.length, skills: skills.length, declaradas: linhas.length, agentes: agentes.length, erros,
    linhas: linhas.sort((a,b) => ordenar(a.id,b.id)) }
}

// Leitura opcional e limitada às entradas SKILL.md e agentes .md; nunca executa, instala ou apaga nada.
// O chamador fornece os escopos: testes usam fixtures; a CLI só lê globais com --globais.
export function compararEscopos(raiz, escopos) {
  const kit = inventariarKit(raiz)
  const colisao = [], vistos = new Set()
  for (const escopo of escopos) {
    if (!fs.existsSync(escopo.base)) continue
    for (const item of fs.readdirSync(escopo.base, { withFileTypes: true }).sort((a,b) => ordenar(a.name,b.name))) {
      const arquivo = escopo.tipo === 'skill' ? path.join(escopo.base, item.name, 'SKILL.md') : path.join(escopo.base, item.name)
      if (escopo.tipo === 'agente' && (!item.name.endsWith('.md') || !item.isFile())) continue
      // Links de instalações podem apontar para a mesma cópia. Conte o arquivo físico uma vez.
      let real
      try { real = fs.realpathSync(arquivo); if (!fs.statSync(real).isFile()) continue } catch { continue }
      const chave = `${escopo.tipo}:${process.platform === 'win32' ? real.toLowerCase() : real}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      const dados = metadados(real)
      const candidatos = (escopo.tipo === 'skill' ? kit.skills : kit.agentes).filter(s => s.nome && s.nome === dados.nome)
      if (!candidatos.length) continue
      colisao.push({ tipo: escopo.tipo, nome: dados.nome, origem: `${escopo.rotulo}/${item.name}`,
        candidatos: candidatos.map(s => ({ id: s.id, mesmoConteudo: s.hash === dados.hash })) })
    }
  }
  return colisao
}

export function tabelaResponsabilidades(resultado) {
  const linha = v => String(v).replaceAll('|', '\\|').replaceAll('\n', ' ')
  return ['| Skill (origem única) | Responsável | Carregar |', '|---|---|---|',
    ...resultado.linhas.map(s => `| \`${linha(s.chamada)}\`${s.chamada !== s.id ? ` (pasta \`${linha(s.id.split(':')[1])}\`)` : ''}${s.opcional ? ' †' : ''} | ${s.dono === 'principal' ? 'conversa principal' : `\`${linha(s.dono)}\``} | ${s.uso === 'consultora' ? 'pela etapa, sob demanda' : s.uso === 'etapa' ? 'na etapa atual' : 'na tarefa pertinente'} |`)].join('\n') + '\n'
}
