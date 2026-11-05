import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

// Gate de declarações e arquivos: não certifica direitos de imagem nem qualidade visual.
export function validarAssets(manifesto, pasta) {
  const erros = [], arquivos = [], cenas = []
  const raiz = fs.realpathSync(pasta)
  const dentro = nome => {
    if (typeof nome !== 'string' || !nome || path.isAbsolute(nome) || /^[A-Za-z]:|\\/.test(nome)) throw Error('caminho relativo inválido')
    const alvo = fs.realpathSync(path.resolve(raiz, nome))
    const rel = path.relative(raiz, alvo)
    if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw Error('arquivo fora da pasta')
    if (!fs.statSync(alvo).isFile()) throw Error('não é arquivo')
    return alvo
  }
  if (manifesto.versao !== 1 || !Array.isArray(manifesto.assets) || !Array.isArray(manifesto.cenas)) return { aprovado: false, erros: ['Manifesto requer versao:1, assets[] e cenas[]'], arquivos, cenas }
  const vistos = new Set()
  // Licenças com atribuição: todas exigem crédito publicado; BY-SA também mantém a licença na foto alterada.
  const atribuicao = ['CC-BY-2.0', 'CC-BY-3.0', 'CC-BY-4.0', 'CC-BY-SA-3.0', 'CC-BY-SA-4.0']
  for (const a of manifesto.assets) {
    try {
      if (!a || typeof a !== 'object') throw Error('entrada inválida')
      if (vistos.has(a.arquivo)) throw Error('arquivo duplicado')
      vistos.add(a.arquivo)
      const alvo = dentro(a.arquivo), dados = fs.readFileSync(alvo)
      if (!dados.length) throw Error('arquivo vazio')
      if (!a.autor?.trim() || !a.origem?.trim()) throw Error('autor e origem obrigatórios')
      if (!['CC0', 'dominio-publico', ...atribuicao, 'MIT', 'Apache-2.0', 'cliente', 'Unsplash', 'proprio'].includes(a.licenca)) throw Error('licença não permitida ou desconhecida')
      if (!['cliente', 'codigo-local'].includes(a.origem) && !/^https:\/\//.test(a.origem)) throw Error('origem requer URL HTTPS ou cliente/codigo-local')
      if (a.licenca !== 'proprio' && a.licenca !== 'cliente' && !/^https:\/\//.test(a.licencaUrl || '')) throw Error('link da licença obrigatório')
      if ((a.licenca === 'cliente' || atribuicao.includes(a.licenca)) && a.autorizacao !== 'confirmada') throw Error('autorização ainda pendente; usar alternativa abstrata/tipográfica')
      if (atribuicao.includes(a.licenca)) {
        const [, familia, versao] = a.licenca.match(/^CC-(BY(?:-SA)?)-(\d\.\d)$/)
        const url = new URL(a.licencaUrl)
        const caminho = `/licenses/${familia.toLowerCase()}/${versao}`
        if (!['creativecommons.org', 'www.creativecommons.org'].includes(url.hostname) ||
          !new RegExp(`^${caminho.replaceAll('.', '\\.')}(/(deed\\.[a-z-]+|legalcode(\\.[a-z-]+)?))?/?$`, 'i').test(url.pathname)) {
          throw Error('link da licença Creative Commons difere da família ou versão declarada')
        }
        if (!a.credito || !a.alteracoes) throw Error('crédito e declaração de alterações obrigatórios')
        const texto = fs.readFileSync(dentro(a.creditoArquivo), 'utf8')
        for (const trecho of [a.credito, a.licencaUrl, a.alteracoes]) if (!texto.includes(trecho)) throw Error('crédito publicado incompleto')
      }
      const sha256 = createHash('sha256').update(dados).digest('hex')
      if (a.sha256 && a.sha256 !== sha256) throw Error('SHA256 diferente do declarado')
      if (a.tipo === 'modelo3d') {
        if (dados.length < 20 || dados.toString('ascii', 0, 4) !== 'glTF' || dados.readUInt32LE(4) !== 2 || dados.readUInt32LE(8) !== dados.length) throw Error('GLB 2 inválido; extensão não prova modelo real')
        const tamanho = dados.readUInt32LE(12)
        if (dados.readUInt32LE(16) !== 0x4e4f534a || 20 + tamanho > dados.length) throw Error('GLB sem JSON válido')
        const gltf = JSON.parse(dados.toString('utf8', 20, 20 + tamanho).trim())
        if (!gltf.meshes?.some(m => m.primitives?.length)) throw Error('GLB sem malha')
      }
      arquivos.push({ arquivo: a.arquivo, bytes: dados.length, sha256, autor: a.autor, origem: a.origem, licenca: a.licenca })
    } catch (e) { erros.push(`${a?.arquivo || '(asset)'}: ${e.message}`) }
  }
  const ids = new Set()
  for (const c of manifesto.cenas) {
    try {
      if (!c?.id || ids.has(c.id)) throw Error('id ausente ou duplicado')
      ids.add(c.id)
      if (c.realista && !c.revisaoVisual?.trim()) throw Error('realismo exige evidência de revisão visual, além do arquivo')
      const pesos = {}
      for (const [tela, limite] of [['desktop', 3_000_000], ['celular', 1_500_000]]) {
        if (!Array.isArray(c[tela])) throw Error(`lista ${tela} obrigatória (vazia para cena em código)`)
        pesos[tela] = 0
        for (const nome of new Set(c[tela])) {
          const a = arquivos.find(a => a.arquivo === nome)
          if (!a) throw Error(`asset ausente/reprovado: ${nome}`)
          pesos[tela] += a.bytes
        }
        if (pesos[tela] > limite) throw Error(`${tela}: ${pesos[tela]} bytes excedem ${limite}; reduzir ou trocar receita`)
      }
      cenas.push({ id: c.id, ...pesos, classe: pesos.desktop <= 300_000 ? 'leve' : pesos.desktop <= 1_000_000 ? 'media' : 'pesada' })
    } catch (e) { erros.push(`${c?.id || '(cena)'}: ${e.message}`) }
  }
  return { aprovado: erros.length === 0, erros, arquivos, cenas, observacao: 'Valida declarações e integridade; direitos de imagem, termos da fonte e realismo exigem revisão humana.' }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [entrada, ...opcoes] = process.argv.slice(2)
    if (!entrada || opcoes.some(o => o !== '--gravar')) throw Error('Uso: node validar-assets.mjs assets.json [--gravar]')
    const pasta = path.dirname(path.resolve(entrada))
    const r = validarAssets(JSON.parse(fs.readFileSync(entrada, 'utf8')), pasta)
    if (opcoes.includes('--gravar')) {
      // Exclusivo: nunca sobrescrever evidências existentes ou seguir um link de saída.
      fs.writeFileSync(path.join(pasta, 'assets-relatorio.json'), JSON.stringify(r, null, 2) + '\n', { flag: 'wx' })
      fs.writeFileSync(path.join(pasta, 'assets.md'), '# Assets\n\n' + r.observacao + '\n\n' + r.arquivos.map(a => `- ${a.arquivo}: ${a.bytes} bytes · ${a.autor} · ${a.licenca} · ${a.origem}`).join('\n') + '\n\n' + r.erros.join('\n'), { flag: 'wx' })
    }
    console.log(JSON.stringify(r, null, 2))
    process.exitCode = r.aprovado ? 0 : 1
  } catch (e) { console.error(e.message); process.exitCode = 1 }
}
