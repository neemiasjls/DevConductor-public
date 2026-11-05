// Valida evidência local sem executar comandos, alterar o lote ou calcular economia.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { configuracaoEnsaio, arquivosCongelados } from './tarefas-ensaio.mjs'

const campos = ['entrada', 'cacheLido', 'saida']
const hash = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const ordenar = x => Array.isArray(x) ? x.map(ordenar) : x && typeof x === 'object'
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, ordenar(x[k])])) : x
const igual = (a, b) => JSON.stringify(ordenar(a)) === JSON.stringify(ordenar(b))
const normalizarHashes = hashes => Object.fromEntries(Object.entries(hashes || {}).map(([n, h]) => [n.replaceAll('\\', '/'), h]))
const ler = f => {
  const b = fs.readFileSync(f)
  return JSON.parse(b[0] === 0xff && b[1] === 0xfe ? b.subarray(2).toString('utf16le') : b.toString('utf8').replace(/^\uFEFF/, ''))
}
const assinatura = ps => ps.filter(p => p?.name !== 'devagents-core')
  .map(p => [p?.name, p?.source, p?.version]).sort(([a], [b]) => String(a).localeCompare(String(b)))
function listarSnapshot(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.isSymbolicLink()) throw Error('Snapshot contém link')
    const p = path.join(dir, e.name)
    return e.isDirectory() ? listarSnapshot(p, base) : e.isFile() ? [path.relative(base, p).replaceAll('\\', '/')] : []
  }).sort()
}

export function auditarEnsaio(arquivo) {
  const problemas = [], pendentes = [], pares = new Map(), vistas = new Set()
  let plano, raiz
  try { arquivo = fs.realpathSync(arquivo); raiz = path.dirname(arquivo); plano = ler(arquivo) }
  catch { return { estado: 'reprovado', problemas: ['Plano ausente ou JSON inválido.'], pendentes: [], concluidas: 0, total: 0 } }
  if (!plano || typeof plano !== 'object' || Array.isArray(plano)) return { estado: 'reprovado', problemas: ['Plano deve ser um objeto.'], pendentes: [], concluidas: 0, total: 0 }
  const local = alvo => {
    if (typeof alvo !== 'string' || !alvo) throw Error('Caminho de evidência ausente')
    const real = fs.realpathSync(path.resolve(raiz, alvo)), rel = path.relative(raiz, real)
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw Error('Evidência fora do lote')
    return real
  }
  const validar = (condicao, mensagem) => { if (!condicao) throw Error(mensagem) }
  const jobs = Array.isArray(plano.jobs) ? plano.jobs : []
  let configuracao
  try { configuracao = configuracaoEnsaio(plano.tipo) }
  catch (e) { return { estado: 'reprovado', problemas: [e.message + '.'], pendentes, concluidas: 0, total: jobs.length } }
  const { tarefas, repeticoes, criteriosExtras } = configuracao
  const totalEsperado = Object.keys(tarefas).length * 2 * repeticoes
  try {
    validar(['node', 'versaoCLI', 'permissoes', 'settingsHash'].every(k => typeof plano[k] === 'string' && plano[k]), 'ambiente do plano ausente')
    validar(hash(local(plano.settings)) === plano.settingsHash, 'settings alterados')
    validar(ler(local(plano.settings)).enabledPlugins?.['devagents-core@devagents'] === false, 'núcleo registrado não foi desabilitado no ensaio')
    for (const [grupo, perfil] of [...['base', 'depois'].map(g => [g, plano.perfis?.[g]]), ...Object.entries(plano.apoios || {})]) {
      validar(perfil && typeof perfil.versao === 'string' && Object.keys(perfil.hashes || {}).some(n => n.replaceAll('\\', '/') === '.claude-plugin/plugin.json'), 'perfil sem snapshot e hashes')
      validar(igual(listarSnapshot(local(perfil.plugin)), Object.keys(perfil.hashes).map(n => n.replaceAll('\\', '/')).sort()), `snapshot ${grupo} tem arquivos adicionados ou removidos`)
      for (const [nome, esperado] of Object.entries(perfil.hashes)) validar(hash(local(path.join(perfil.plugin, nome))) === esperado, `snapshot ${grupo} alterado`)
    }
  } catch (e) { problemas.push(e.message + '.') }
  if (jobs.length !== totalEsperado) problemas.push(`Esperadas ${totalEsperado} execuções: ${Object.keys(tarefas).length === 1 ? 'uma tarefa' : 'três tarefas'}, dois grupos e três repetições.`)
  if (plano.modelo !== 'opus') problemas.push('O modelo principal solicitado deve continuar Opus.')
  for (const [i, j] of jobs.entries()) {
    if (!j || typeof j !== 'object') { problemas.push(`Execução ${i + 1}: registro inválido.`); continue }
    const id = `Execução ${i + 1}`, chave = `${j.tarefa}/${j.repeticao}`
    if (!Object.hasOwn(tarefas, j.tarefa) || !['base', 'depois'].includes(j.grupo) || ![1, 2, 3].includes(j.repeticao)) {
      problemas.push(`${id}: tarefa, grupo ou repetição inválidos.`); continue
    }
    const par = pares.get(chave) || {}; pares.set(chave, par)
    if (par[j.grupo]) problemas.push(`${id}: tarefa/grupo/repetição duplicados.`)
    par[j.grupo] = j
    if (typeof j.sessao !== 'string' || !j.sessao || vistas.has(j.sessao)) problemas.push(`${id}: sessão ausente ou repetida.`)
    vistas.add(j.sessao)
    if (j.estado !== 'concluida') {
      pendentes.push(`${id}: ${j.estado || 'sem estado'}.`)
      if (!['preparada', 'executando', 'aguarda-revisao-fixa'].includes(j.estado)) problemas.push(`${id}: execução falhou ou foi interrompida; não conta como rodada válida.`)
      continue
    }
    try {
      validar(j.codigoCLI === 0 && j.codigoTestes === 0, 'CLI ou testes sem saída zero')
      validar(j.nucleoConfirmado === true && j.congeladosPreservados === true, 'integridade não confirmada')
      validar(/^claude-opus-/.test(j.modeloPrincipal || ''), 'principal efetiva não é Opus')
      validar(igual(j.ambiente, { node: plano.node, cli: plano.versaoCLI, permissoes: plano.permissoes, settingsHash: plano.settingsHash }), 'ambiente da execução difere do plano')
      const inicio = Date.parse(j.inicio), entrega = Date.parse(j.primeiraEntrega), fim = Date.parse(j.fim)
      validar(Number.isFinite(inicio) && inicio <= entrega && entrega <= fim, 'intervalo inválido')
      const pasta = local(j.pasta)
      const congelados = arquivosCongelados(j.tarefa, j.hashesMatriz)
      const hashesMatriz = normalizarHashes(j.hashesMatriz)
      validar(['pedido.md', 'pronto-quando.md', 'package.json', 'inicial.test.mjs', 'aceitacao.test.mjs'].every(n => typeof hashesMatriz[n] === 'string'), 'hashes dos arquivos congelados ausentes')
      if (j.tarefa === '04-catalogo-integrado') validar(congelados.some(n => n.startsWith('dados/catalogo/') && typeof hashesMatriz[n] === 'string'), 'hashes dos manifestos do catálogo ausentes')
      for (const nome of congelados)
        validar(hash(local(path.join(pasta, nome))) === hashesMatriz[nome], `arquivo congelado alterado: ${nome}`)
      const ps = j.plugins
      validar(Array.isArray(ps) && ps.every(p => typeof p.name === 'string' && typeof p.version === 'string' && typeof p.source === 'string'), 'inventário real de plugins ausente')
      validar(new Set(ps.map(p => p.name)).size === ps.length, 'plugins duplicados')
      const core = ps.filter(p => p.name === 'devagents-core'), perfil = plano.perfis?.[j.grupo]
      validar(core.length === 1 && core[0].version === perfil?.versao && local(core[0].path) === local(perfil.plugin), 'núcleo real difere do perfil')
      if (plano.apoios) {
        validar(Array.isArray(j.pluginApoios) && new Set(j.pluginApoios).size === j.pluginApoios.length && j.apoiosConfirmados === true, 'apoios não confirmados')
        validar(ps.length === j.pluginApoios.length + 1, 'plugin não declarado na execução')
        for (const nome of j.pluginApoios) {
          const p = ps.find(p => p.name === nome), esperado = plano.apoios[nome]
          validar(p && esperado && p.version === esperado.versao && local(p.path) === local(esperado.plugin), 'plugin de apoio difere do snapshot')
        }
      }
      validar(ler(local(path.join(perfil.plugin, '.claude-plugin/plugin.json'))).version === perfil.versao, 'manifesto do snapshot mudou')
      const revisao = ler(local(j.arquivoRevisao))
      validar(revisao.aprovada === true && Array.isArray(revisao.pendencias) && revisao.pendencias.length === 0, 'revisão reprovada ou com pendências')
      const criterios = ['criteriosFixos', 'entradasInvalidas', 'dependenciasEDados', ...criteriosExtras[j.tarefa]]
      for (const c of criterios) {
        validar(revisao.criterios?.[c]?.aprovado === true, `critério sem aprovação: ${c}`)
        const st = fs.statSync(local(revisao.criterios[c].evidencia))
        validar(st.isFile() && st.size > 0, `critério sem artefato: ${c}`)
      }
      validar(Array.isArray(j.correcoes), 'registro de correções ausente')
      for (const c of j.correcoes) {
        validar(c && typeof c.pedido === 'string' && c.pedido.trim() && Date.parse(c.em) >= entrega && Date.parse(c.em) <= fim, 'correção sem pedido exato ou fora do intervalo')
        // Registros antigos traziam só pedido/em; quando há término/saída, também precisam fechar.
        if (c.fim !== undefined) validar(Number.isFinite(Date.parse(c.fim)) && Date.parse(c.em) <= Date.parse(c.fim) && Date.parse(c.fim) <= fim, 'término da correção fora do intervalo')
        if (c.codigoCLI !== undefined) validar(c.codigoCLI === 0, 'correção sem saída zero')
        // A ausência de todos estes campos preserva registros legados, sem inventar prova de init.
        const metadados = ['modeloPrincipal', 'plugins', 'nucleoConfirmado', 'apoiosConfirmados', 'arquivoCLI']
        if (metadados.some(k => Object.hasOwn(c, k))) {
          validar(metadados.every(k => Object.hasOwn(c, k)) && c.fim !== undefined && c.codigoCLI === 0, 'metadados da correção incompletos')
          validar(/^claude-opus-/.test(c.modeloPrincipal || '') && c.modeloPrincipal === j.modeloPrincipal, 'principal da correção difere da execução')
          validar(c.nucleoConfirmado === true && c.apoiosConfirmados === true, 'inventário da correção não confirmado')
          const inventario = plugins => {
            validar(Array.isArray(plugins) && plugins.every(p => p && ['name', 'source', 'version', 'path'].every(k => typeof p[k] === 'string' && p[k])), 'inventário da correção ausente ou inválido')
            validar(new Set(plugins.map(p => p.name)).size === plugins.length, 'plugins duplicados na correção')
            return plugins.map(p => [p.name, p.source, p.version, local(p.path)]).sort(([a], [b]) => a.localeCompare(b))
          }
          validar(igual(inventario(c.plugins), inventario(j.plugins)), 'inventário da correção difere da execução')
          validar(c.plugins.every(p => p.source === `${p.name}@inline`), 'origem de plugin da correção difere do snapshot inline')
          const nucleo = c.plugins.filter(p => p.name === 'devagents-core')
          validar(nucleo.length === 1 && nucleo[0].version === perfil.versao && local(nucleo[0].path) === local(perfil.plugin), 'núcleo da correção difere do perfil')
          validar(Array.isArray(j.pluginApoios) && c.plugins.length === j.pluginApoios.length + 1, 'apoios da correção não declarados')
          for (const nome of j.pluginApoios) {
            const p = c.plugins.find(p => p.name === nome), esperado = plano.apoios?.[nome]
            validar(p && esperado && p.version === esperado.versao && local(p.path) === local(esperado.plugin), 'apoio da correção difere do snapshot')
          }
          const eventos = fs.readFileSync(local(c.arquivoCLI), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } })
          const inits = eventos.filter(e => e?.type === 'system' && e.subtype === 'init')
          validar(inits.length === 1 && inits[0].session_id === j.sessao && inits[0].model === c.modeloPrincipal && igual(inits[0].plugins, c.plugins), 'registro da correção não corresponde ao init real do CLI e à sessão')
        }
      }
      const log = fs.readFileSync(local(j.arquivoTestes), 'utf8')
      validar(new RegExp('(?:#|ℹ) pass (\\d+)').test(log) && /(?:#|ℹ) fail 0(?:\r?\n|$)/.test(log), 'log de testes sem aprovação')
      validar(Number(log.match(/(?:#|ℹ) pass (\d+)/)[1]) >= tarefas[j.tarefa], 'faltam testes fornecidos')
      validar(!/(?:#|ℹ) fail [1-9]/.test(log), 'log contém teste reprovado')
      validar(!/(?:#|ℹ) (?:skipped|cancelled) [1-9]/.test(log), 'testes pulados ou cancelados')
      const m = ler(local(j.arquivoMedicao))
      validar(Array.isArray(m.sessoes) && m.sessoes.length === 1 && m.sessoes[0].id === j.sessao, 'medição não corresponde à sessão')
      validar(m.filtros?.sessao === j.sessao && Date.parse(m.filtros.de) === inicio && Date.parse(m.filtros.ate) === fim, 'filtros da medição não incluem o intervalo completo')
      validar(Number.isSafeInteger(m.mensagensUnicas) && m.mensagensUnicas > 0 && m.porOrigem?.principal?.respostas > 0, 'medição vazia ou sem principal')
      validar(campos.every(c => Number.isSafeInteger(m.totais?.[c]) && m.totais[c] >= 0) && m.totais.saida > 0, 'totais inválidos ou zerados')
      validar(m.porModelo && Object.keys(m.porModelo).some(n => /opus/i.test(n)), 'uso efetivo do Opus ausente')
      const somas = { entrada: 0, cacheLido: 0, saida: 0 }
      let respostas = 0
      for (const v of Object.values(m.porModelo)) {
        validar(['respostas', 'entrada', 'cacheGravado', 'cacheLido', 'saida'].every(c => Number.isSafeInteger(v[c]) && v[c] >= 0), 'uso por modelo inválido')
        somas.entrada += v.entrada + v.cacheGravado; somas.cacheLido += v.cacheLido; somas.saida += v.saida; respostas += v.respostas
      }
      validar(campos.every(c => somas[c] === m.totais[c]) && respostas === m.mensagensUnicas, 'totais divergem do uso por modelo')
      const origens = Object.values(m.porOrigem)
      validar(origens.every(v => ['respostas', 'contexto', 'saida'].every(c => Number.isSafeInteger(v[c]) && v[c] >= 0)), 'uso por origem inválido')
      validar(origens.reduce((n, v) => n + v.respostas, 0) === m.mensagensUnicas
        && origens.reduce((n, v) => n + v.contexto, 0) === m.totais.entrada + m.totais.cacheLido
        && origens.reduce((n, v) => n + v.saida, 0) === m.totais.saida, 'medição por origem omite respostas ou tokens')
    } catch (e) { problemas.push(`${id}: ${e.message}.`) }
  }
  for (const [chave, par] of pares) {
    if (!par.base || !par.depois) { problemas.push(`${chave}: par incompleto.`); continue }
    if (!igual(normalizarHashes(par.base.hashesMatriz), normalizarHashes(par.depois.hashesMatriz))) problemas.push(`${chave}: matrizes diferentes no par.`)
    if (par.base.estado === 'concluida' && par.depois.estado === 'concluida' && par.base.modeloPrincipal !== par.depois.modeloPrincipal) problemas.push(`${chave}: modelo principal efetivo difere no par.`)
    if (par.base.estado === 'concluida' && par.depois.estado === 'concluida' && Array.isArray(par.base.plugins) && Array.isArray(par.depois.plugins)
      && !igual(assinatura(par.base.plugins), assinatura(par.depois.plugins))) problemas.push(`${chave}: plugins fora do núcleo diferem no par.`)
  }
  return { estado: problemas.length ? 'reprovado' : pendentes.length ? 'incompleto' : 'aprovado', problemas, pendentes,
    concluidas: jobs.filter(j => j?.estado === 'concluida').length, total: jobs.length,
    limite: 'Auditoria de evidências registradas; não substitui inspeção visual ou revisão humana, não controla cache e não calcula preço ou economia.' }
}
