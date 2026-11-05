import test from 'node:test'
import assert from 'node:assert/strict'
import { auditarHtml } from '../../plugins/landing-pages/skills/lp-seo/scripts/auditar-html.mjs'
const html = `<!doctype html><html lang='pt-BR'><head><title>Salão em Marília — exemplo de teste</title><meta content='Uma descrição de teste' name='description'><meta name='robots' content='noindex'><script type='application/ld+json'>{"@context":"https://schema.org","@type":"HairSalon","name":"Teste"}</script></head><body><main><h1>Salão em Marília</h1><h2>Cabelo</h2><img src='teste.webp' alt='' width='100' height='100'></main></body></html>`
const op = { headers: '/*\n X-Robots-Tag: noindex, nofollow', robots: 'User-agent: *\nDisallow: /' }
test('demo com conteúdo inicial e bloqueios declarados passa, ressalvando robots', () => {
  const r = auditarHtml(html, op); assert(r.aprovado); assert.equal(r.h1[0], 'Salão em Marília'); assert(r.avisos.some(a => a.includes('não ler noindex')))
})
test('SPA vazia, schema quebrado, imagem sem alt e demo indexável são bloqueados', () => {
  for (const alterado of [html.replace(/<main>[\s\S]*<\/main>/, '<div id="root"></div>'), html.replace('"HairSalon"', 'quebrado'), html.replace("alt=''", ''), html.replace("content='noindex'", "content='index'")]) assert.equal(auditarHtml(alterado, op).aprovado, false)
})
test('produção requer canonical/sitemap reais e retirada de bloqueios', () => {
  assert.equal(auditarHtml(html, { ...op, demo: false }).aprovado, false)
  const producao = html.replace("content='noindex'", "content='index'").replace('</head>', '<link href="https://salao.teste.br/" rel="canonical"></head>')
  assert.equal(auditarHtml(producao, { demo: false, sitemap: '<urlset><url><loc>https://salao.teste.br/</loc></url></urlset>' }).aprovado, true)
})
