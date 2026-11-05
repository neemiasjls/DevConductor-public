import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const texto = s => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4]]))

// Checks estáticos, sem tentar substituir parser HTML, teste de rich results ou análise editorial.
export function auditarHtml(html, { demo = true, robots = '', headers = '', sitemap = '' } = {}) {
  const erros = [], avisos = []
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => attrs(m[0]))
  const meta = nome => metas.find(a => (a.name || a.property)?.toLowerCase() === nome)?.content || ''
  const title = texto(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
  const descricao = meta('description'), noindex = /(?:^|[,\s])noindex(?:$|[,\s])/i.test(meta('robots'))
  const conteudo = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  const h1 = [...conteudo.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => texto(m[1]))
  const titulos = [...conteudo.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => ({ nivel: Number(m[1]), texto: texto(m[2]) }))
  const canonicos = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => attrs(m[0])).filter(a => a.rel?.toLowerCase() === 'canonical')
  const canonical = canonicos[0]?.href || ''
  if (!/^pt(?:-BR)?$/i.test(attrs(html.match(/<html\b[^>]*>/i)?.[0] || '').lang || '')) erros.push('lang pt-BR ausente')
  if (!title) erros.push('title ausente')
  else if (title.length < 30 || title.length > 65) avisos.push(`title com ${title.length} caracteres: avaliar concisão, sem limite rígido de ranking`)
  if (!descricao) erros.push('description ausente')
  if (h1.length !== 1 || !h1[0]) erros.push(`Esperado um H1 com texto no HTML inicial; encontrados ${h1.length}`)
  if (!/<main\b/i.test(conteudo)) erros.push('main ausente do HTML inicial')
  for (let i = 1; i < titulos.length; i++) if (titulos[i].nivel > titulos[i - 1].nivel + 1) avisos.push(`Salto de título: ${titulos[i].texto}`)
  if (canonicos.length > 1) erros.push('canonical duplicado')
  const bloqueado = /^\s*Disallow:\s*\/\s*(?:#.*)?$/im.test(robots)
  const cabecalhoNoindex = /X-Robots-Tag:\s*[^\n]*\bnoindex\b/i.test(headers)
  if (demo) {
    if (!noindex) erros.push('Demo sem noindex no HTML original')
    if (!cabecalhoNoindex) erros.push('Demo sem regra X-Robots-Tag de hospedagem')
    if (canonical) avisos.push('Demo tem canonical: conferir domínio real, não usar localhost/domínio inventado')
    if (bloqueado) avisos.push('robots bloqueia rastreio: Google pode não ler noindex. Demo não é conteúdo privado; proteção real exige autenticação.')
  } else {
    if (noindex || cabecalhoNoindex || bloqueado) erros.push('Produção ainda tem bloqueio de indexação/rastreio')
    if (!/^https:\/\//.test(canonical) || /localhost|127\.0\.0\.1|example\./.test(canonical)) erros.push('Produção requer canonical HTTPS real')
    if (!sitemap.includes(`<loc>${canonical}</loc>`)) erros.push('sitemap não contém a canonical')
  }
  const schemas = []
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (attrs(m[1]).type === 'application/ld+json') {
    try {
      const valor = JSON.parse(m[2]); schemas.push(...(Array.isArray(valor) ? valor : [valor]))
    } catch { erros.push('JSON-LD inválido') }
  }
  if (!schemas.length) erros.push('JSON-LD ausente')
  for (const s of schemas) {
    if (!s['@context'] || !(s['@type'] || s['@graph'])) erros.push('JSON-LD sem context/type ou graph')
    if (JSON.stringify(s).match(/"aggregateRating"|"review"/)) avisos.push('Avaliações no schema exigem fonte e presença na página; conferir manualmente')
  }
  const imagens = [...conteudo.matchAll(/<img\b[^>]*>/gi)].map(m => attrs(m[0]))
  for (const i of imagens) {
    if (!Object.hasOwn(i, 'alt')) erros.push(`Imagem sem alt: ${i.src}`)
    if (!i.width || !i.height) avisos.push(`Imagem sem dimensões: ${i.src}`)
  }
  return { aprovado: !erros.length, modo: demo ? 'demo' : 'producao', title, descricao, h1, canonical,
    schemas: schemas.length, imagens: imagens.length, erros, avisos,
    limites: 'Checagem estática básica. Confirmar fatos, termos de busca, renderização, direitos, schema específico e cabeçalho HTTP real. Nenhuma promessa de posição ou pontuação de SEO.' }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [pasta, modo] = process.argv.slice(2)
    if (!pasta || !['--demo', '--producao'].includes(modo) || process.argv.length !== 4) throw Error('Uso: node auditar-html.mjs dist --demo|--producao')
    const ler = nome => fs.existsSync(path.join(pasta, nome)) ? fs.readFileSync(path.join(pasta, nome), 'utf8') : ''
    const r = auditarHtml(ler('index.html'), { demo: modo === '--demo', robots: ler('robots.txt'), headers: ler('_headers'), sitemap: ler('sitemap.xml') })
    console.log(JSON.stringify(r, null, 2)); process.exitCode = r.aprovado ? 0 : 1
  } catch (e) { console.error(e.message); process.exitCode = 1 }
}
