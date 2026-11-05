// Descritores compartilhados pelo preparador e pela auditoria, sem executar modelos.
const arquivosBase = ['pedido.md', 'pronto-quando.md', 'package.json', 'inicial.test.mjs', 'aceitacao.test.mjs']
const curtas = { '03-script-automacao': 6, '02-endpoint-api': 7, '01-secao-lp': 5 }
const extras = {
  '01-secao-lp': ['visual390e1280', 'teclado', 'movimentoReduzido', 'semJavaScript'],
  '02-endpoint-api': ['httpReal', 'senhaNaoPersistida'],
  '03-script-automacao': ['preservacaoEntradaSaida'],
  '04-catalogo-integrado': ['grafoDeterministico', 'preservacaoManifestosESaida'],
}

export function configuracaoEnsaio(tipo = 'ensaio-controlado-v1') {
  if (!['ensaio-controlado-v1', 'ensaio-integrado-v1'].includes(tipo)) throw Error('Tipo de ensaio desconhecido')
  const tarefas = tipo === 'ensaio-integrado-v1' ? { '04-catalogo-integrado': 54 } : { ...curtas }
  return { tarefas, repeticoes: 3,
    criteriosExtras: Object.fromEntries(Object.keys(tarefas).map(tarefa => [tarefa, [...extras[tarefa]]])) }
}

export function arquivosCongelados(tarefa, hashesMatriz = {}) {
  if (!Object.hasOwn(extras, tarefa)) throw Error('Tarefa de ensaio desconhecida')
  if (!hashesMatriz || typeof hashesMatriz !== 'object' || Array.isArray(hashesMatriz)) throw Error('Hashes da matriz inválidos')
  const nomes = Object.keys(hashesMatriz).map(nome => nome.replaceAll('\\', '/'))
  if (nomes.some(nome => /^[A-Za-z]:|^\//.test(nome) || nome.split('/').some(p => !p || p === '.' || p === '..'))
    || new Set(nomes).size !== nomes.length) throw Error('Caminhos da matriz inválidos ou duplicados')
  if (tarefa === '04-catalogo-integrado') return nomes.filter(nome => nome !== 'auditar.mjs' && !nome.startsWith('src/'))
  return [...arquivosBase, 'servir.mjs', 'vendas.csv'].filter(nome => nomes.includes(nome))
}
