// Lista os efeitos do catálogo `efeitos.json` de um tipo de movimento: por padrão os 5 mais indicados
// (receitas do kit primeiro, depois do mais leve ao mais pesado); `--todos` mostra a lista inteira.
// Uso: node buscar-efeito.mjs <tipo> ["texto livre"] [--origem receita-do-kit|registro-shadcn|codrops] [--todos]
// O texto livre (ex.: presa "camada sobre bloco preso") ordena por palavras em comum com nome e observação.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
export const TIPOS = ['presa', 'paralaxe', 'revelacao-mascara', 'rolagem-lateral', 'zoom', 'pilha', 'texto-letra',
  'texto-linha', 'entrada-simples', 'marquee', '3d', 'video', 'troca-de-cor']
export const ORIGENS = ['receita-do-kit', 'registro-shadcn', 'codrops']

export function carregarEfeitos() {
  return JSON.parse(fs.readFileSync(path.join(aqui, 'efeitos.json'), 'utf8'))
}

const PESO = { leve: 0, médio: 1, pesado: 2 }
const normal = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const palavras = (t) => new Set(normal(t).split(/[^a-z0-9]+/).filter((p) => p.length > 2))

// Efeitos do tipo, com as receitas do kit antes das demais origens (ordem do catálogo dentro de cada grupo).
// Com `texto`, ordena antes por palavras em comum com nome e observação; sem acerto, mantém a ordem acima.
// Com `limite`, devolve só os primeiros: os mais indicados (receitas do kit, depois do mais leve ao mais pesado).
export function efeitosPorTipo(tipo, { origem, texto, limite } = {}) {
  if (!TIPOS.includes(tipo)) throw new Error(`Tipo "${tipo}" fora do vocabulário. Tipos válidos: ${TIPOS.join(', ')}`)
  if (origem && !ORIGENS.includes(origem)) throw new Error(`Origem "${origem}" inválida. Origens válidas: ${ORIGENS.join(', ')}`)
  const rank = (e) => (e.origem === 'receita-do-kit' ? 0 : 1)
  const peso = (e) => PESO[e.peso] ?? 1
  const busca = texto ? palavras(texto) : new Set()
  const acertos = (e) => { const alvo = palavras(`${e.nome} ${e.observacao}`); return [...busca].filter((p) => alvo.has(p)).length }
  const lista = carregarEfeitos()
    .filter((e) => e.tipos.includes(tipo) && (!origem || e.origem === origem))
    .map((e, n) => ({ e, n, a: acertos(e) }))
    .sort((x, y) => (y.a - x.a) || (rank(x.e) - rank(y.e)) || (peso(x.e) - peso(y.e)) || (x.n - y.n))
    .map((x) => x.e)
  return limite ? lista.slice(0, limite) : lista
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const i = args.indexOf('--origem')
  const origem = i >= 0 ? args.splice(i, 2)[1] : undefined
  const j = args.indexOf('--todos')
  const todos = j >= 0
  if (todos) args.splice(j, 1)
  const [tipo, texto] = args
  try {
    if (!tipo) throw new Error(`Uso: node buscar-efeito.mjs <tipo> ["texto livre"] [--origem x] [--todos]. Tipos válidos: ${TIPOS.join(', ')}`)
    const lista = efeitosPorTipo(tipo, { origem, texto, limite: todos ? undefined : 5 })
    const total = efeitosPorTipo(tipo, { origem }).length
    if (!lista.length) console.log(`Nenhum efeito do tipo "${tipo}" no catálogo.`)
    for (const e of lista) {
      console.log(`${e.id} [${e.origem}${e.peso ? ', ' + e.peso : ''}] ${e.nome}\n  onde: ${e.onde}\n  licença: ${e.licenca}`)
    }
    if (lista.length < total) console.log(`\n(${lista.length} de ${total}; --todos mostra a lista inteira)`)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}
