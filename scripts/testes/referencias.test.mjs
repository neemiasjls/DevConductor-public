import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIAS, FONTES, coletar, deduplicar, lerAwwwards, lerLapa, lerOnePageLove, lerGithub, montarHtml }
  from '../../plugins/landing-pages/skills/lp-referencias/scripts/buscar-referencias.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const skill = path.join(raiz, 'plugins/landing-pages/skills/lp-referencias/SKILL.md')

const awwwards = (slug, titulo, tags = ['Animation', 'Fashion']) => {
  const d = { slug, title: titulo, type: 'submission', images: { thumbnail: `s/${slug}.jpg` }, tags }
  return `<li class="col-3 js-collectable" data-collectable-model-value="${JSON.stringify(d).replace(/"/g, '&quot;')}">`
}
const lapa = (slug, titulo) => `<div><img src="https://cdn.lapa.ninja/assets/images/1x/${slug}-thumb.jpg" alt=""/></div><a title="${titulo}" class="absolute inset-0" href="/post/${slug}/"></a>`
const opl = (slug, titulo, site) => `<div class="thumb thumb-inspiration"><div class="thumb-image"><a href="https://onepagelove.com/${slug}" title="${titulo}" class="link-image-video"><video data-opl-video-src="https://onepagelove.com/v/${slug}.mp4" poster="https://onepagelove.com/p/${slug}.jpg"></video></a></div><div class="thumb-link"><span><a href="${site}?ref=onepagelove">x</a></span></div></div>`
const repo = (nome, extra = {}) => ({ full_name: nome, html_url: `https://github.com/${nome}`, homepage: null, description: 'modelo', license: { spdx_id: 'MIT' }, stargazers_count: 3, ...extra })

test('lê cada galeria e guarda só link, prévia remota e etiquetas de movimento', () => {
  const [a] = lerAwwwards(awwwards('studio-x', 'Studio &amp; X', ['Animation', 'Fashion', 'GSAP']))
  assert.equal(a.nome, 'Studio & X')
  assert.equal(a.pagina, 'https://www.awwwards.com/sites/studio-x')
  assert.match(a.mini, /^https:\/\/assets\.awwwards\.com\/.+studio-x\.jpg$/)
  assert.deepEqual(a.etiquetas, ['Animation', 'GSAP'])
  assert.deepEqual(lerLapa(lapa('onskn', 'ONSKN')).map((x) => x.pagina), ['https://www.lapa.ninja/post/onskn/'])
  const [o] = lerOnePageLove(opl('glow', 'Glow', 'https://glow.com/'))
  assert.equal(o.site, 'https://glow.com/')
  assert.match(o.video, /glow\.mp4$/)
  const g = lerGithub({ items: [repo('a/ok'), repo('b/arquivado', { archived: true }), repo('c/sem', { license: null }), repo('d/fork', { fork: true })] }, 'mit')
  assert.deepEqual(g.map((x) => x.nome), ['a/ok'])
  assert.equal(g[0].licenca, 'MIT')
})

test('tira duplicados pelo endereço do site ou pelo nome e registra onde mais apareceu', () => {
  const itens = deduplicar([
    { fonte: 'opl', nome: 'Glow', site: 'https://www.glow.com/', etiquetas: [] },
    { fonte: 'awwwards', nome: 'GLOW', etiquetas: [] },
    { fonte: 'opl', nome: 'Outro nome', site: 'https://glow.com/x', etiquetas: [] },
    { fonte: 'opl', nome: 'Outro', site: 'https://outro.com/', etiquetas: [] },
  ])
  assert.equal(itens.length, 2, 'mesmo domínio é o mesmo site, mesmo com outro nome')
  assert.deepEqual(itens[0].tambemEm, ['awwwards'])
})

function redeSimulada(respostas) {
  const pedidos = []
  return { pedidos, buscar: async (url) => {
    pedidos.push(url)
    for (const [trecho, r] of respostas) if (url.includes(trecho)) return typeof r === 'function' ? r(url) : r
    return { status: 404, texto: '' }
  } }
}

test('coleta com a rede simulada, para a fonte que bloqueia e conta por fonte', async () => {
  const rede = redeSimulada([
    ['awwwards.com/websites/health-beauty/?page=2', { status: 200, texto: awwwards('b', 'B') }],
    ['awwwards.com/websites/health-beauty/', { status: 200, texto: awwwards('a', 'A') + awwwards('glow', 'Glow') }],
    ['awwwards.com/websites/fashion/', { status: 200, texto: awwwards('a', 'A') }],
    ['lapa.ninja', { status: 403, texto: 'bloqueado' }],
    ['onepagelove.com/tag/beauty', { status: 200, texto: opl('glow', 'Glow', 'https://glow.com/') }],
    ['api.github.com', (u) => ({ status: 200, texto: JSON.stringify({ items: u.includes('license%3Amit') ? [repo('x/salao')] : [] }) })],
  ])
  const avisos = []
  const dados = await coletar('salao', { paginas: 2, buscar: rede.buscar, pausa: 0, avisar: (m) => avisos.push(m) })
  assert.equal(dados.relatorio.lapa.pedidos, 1, 'depois do 403 a fonte não recebe outro pedido')
  assert.match(dados.relatorio.lapa.parou, /^403/)
  assert.ok(avisos.some((m) => /sem contornar/.test(m)))
  assert.equal(dados.relatorio.awwwards.unicos, 2, 'Glow já veio da One Page Love')
  assert.equal(dados.relatorio.opl.unicos, 1)
  assert.deepEqual(dados.itens.find((x) => x.nome === 'Glow').tambemEm, ['awwwards'])
  assert.equal(dados.itens[0].fonte, 'opl', 'fonte mais fiel ao nicho vem primeiro')
  assert.equal(dados.relatorio.github.unicos, 1)
  // Só fontes liberadas recebem pedido automático; as bloqueadas ficam como link.
  const hosts = new Set(rede.pedidos.map((u) => new URL(u).hostname))
  assert.deepEqual([...hosts].sort(), ['api.github.com', 'onepagelove.com', 'www.awwwards.com', 'www.lapa.ninja'])
  assert.ok(dados.manuais.some((m) => m.nome === 'Godly'))
  assert.ok(!rede.pedidos.some((u) => /[?&]text=/.test(u)), 'busca por texto da Awwwards está fora do robots.txt')
})

test('galeria mostra contagem por fonte, escapa texto e não baixa nada', async () => {
  const rede = redeSimulada([['awwwards.com/websites/health-beauty/', { status: 200, texto: awwwards('x', '<script>alert(1)</script>') }]])
  const dados = await coletar('salao', { paginas: 1, buscar: rede.buscar, pausa: 0 })
  const html = montarHtml(dados)
  assert.ok(!html.includes('<script>alert(1)'))
  assert.match(html, /Awwwards<\/b>: 1/)
  assert.match(html, /Copiar escolhidos/)
  assert.match(html, /referrerpolicy="no-referrer"/)
  assert.match(html, /Abrir à mão/)
  assert.match(html, /npx shadcn@latest add @aceternity/)
})

test('todas as categorias têm termos para as fontes lidas e a skill liga a galeria ao fluxo', () => {
  for (const [k, c] of Object.entries(CATEGORIAS)) {
    for (const f of ['awwwards', 'lapa', 'opl', 'github']) assert.ok(Array.isArray(c[f]), `${k}.${f}`)
    for (const f of ['awwwards', 'opl', 'github']) assert.ok(c[f].length, `${k}.${f}`)
  }
  for (const k of ['moveis', 'eventos', 'noivas', 'odontologia', 'pet']) assert.ok(CATEGORIAS[k], `categoria nova: ${k}`)
  assert.deepEqual(Object.keys(FONTES).sort(), ['awwwards', 'github', 'lapa', 'opl'])
  const texto = fs.readFileSync(skill, 'utf8')
  assert.match(texto, /buscar-referencias\.mjs/)
  assert.match(texto, /antes de (qualquer )?desenh/i)
})

const dadosSimulados = () => ({ nome: 'Teste', data: '2026-11-10', manuais: [], pecas: [],
  relatorio: { awwwards: { unicos: 2 }, github: { unicos: 1 } },
  itens: [
    { n: 1, fonte: 'awwwards', nome: 'Um', pagina: 'https://a/1', etiquetas: ['GSAP'], tambemEm: [] },
    { n: 2, fonte: 'awwwards', nome: 'Dois', pagina: 'https://a/2', etiquetas: [], tambemEm: [] },
    { n: 3, fonte: 'github', nome: 'x/modelo', pagina: 'https://g/3', licenca: 'MIT', etiquetas: ['base de código'], tambemEm: [] },
  ] })

test('bloco de recomendados aparece no topo com o motivo; sem lista, nada muda', () => {
  const sem = montarHtml(dadosSimulados())
  assert.ok(!/class="rec"/.test(sem))
  const html = montarHtml(dadosSimulados(), { recomendados: [{ n: 2, motivo: 'tom <calmo>' }, { n: 99, motivo: 'não existe' }] })
  const rec = html.indexOf('class="rec"'), grade = html.indexOf('<main>')
  assert.ok(rec > 0 && rec < grade, 'bloco antes da galeria')
  const bloco = html.slice(rec, grade)
  assert.match(bloco, /data-n="2"/)
  assert.ok(!/data-n="99"/.test(bloco) && !/data-n="1"/.test(bloco))
  assert.match(bloco, /Por que serve:<\/b> tom &lt;calmo&gt;/)
})

test('filtros por fonte, movimento e modelo × inspiração, acessíveis e sem quebrar o copiar', () => {
  const html = montarHtml(dadosSimulados(), { recomendados: [{ n: 1, motivo: 'm' }] })
  assert.match(html, /<button data-f="awwwards" aria-pressed="true">/)
  assert.match(html, /data-t="modelo"/)
  assert.match(html, /data-t="inspiracao"/)
  assert.match(html, /id="mov"/)
  assert.match(html, /role="group" aria-label="Tipo de referência"/)
  assert.match(html, /data-n="3"[^>]*data-lic="1"/)
  assert.match(html, /data-n="1"[^>]*data-mov="1" data-lic="0"/)
  assert.match(html, /<button/, 'botões nativos: funcionam com teclado')
  assert.ok(!/tabindex="-1"/.test(html))
  assert.match(html, /focus-visible/)
  // Copiar escolhidos olha todos os cartões (inclusive recomendados) sem repetir o mesmo número.
  assert.match(html, /vistos=new Set\(\)/)
  assert.match(html, /Copiar escolhidos/)
  // O script embutido é JavaScript válido.
  const js = html.match(/<script>([\s\S]*)<\/script>/)[1]
  assert.doesNotThrow(() => new Function(js))
})
