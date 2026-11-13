import test from 'node:test'
import assert from 'node:assert/strict'
import { auditarHtml, conferirHttp, urlsDeConferencia } from '../../plugins/landing-pages/skills/lp-seo/scripts/auditar-html.mjs'
import http from 'node:http'
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

// Servidor local simulando hospedagem: "certo" responde 404, redireciona www e http; "errado" responde 200 em tudo.
const subir = manipulador => new Promise(ok => { const s = http.createServer(manipulador).listen(0, '127.0.0.1', () => ok(s)) })
const fechar = s => new Promise(ok => s.close(ok))
const montar = (porta, extra = {}) => ({ canonica: `http://127.0.0.1:${porta}/`, destino: `127.0.0.1:${porta}`,
  inexistente: `http://127.0.0.1:${porta}/nao-existe`, alternativa: `http://127.0.0.1:${porta}/alt`, http: `http://127.0.0.1:${porta}/http`, ...extra })
test('conferência de rede: 404 que responde 200, sem redirecionamento e sem https são erros', async () => {
  const s = await subir((q, r) => { r.writeHead(200); r.end('ok') })
  try {
    const { erros } = await conferirHttp(montar(s.address().port))
    assert.equal(erros.length, 3); assert(erros.some(e => e.includes('404'))); assert(erros.some(e => e.includes('www'))); assert(erros.some(e => e.includes('https')))
  } finally { await fechar(s) }
})
test('conferência de rede: 404 real, redirecionamento único e https passam', async () => {
  let porta
  const s = await subir((q, r) => {
    if (q.url === '/alt') { r.writeHead(301, { location: `http://127.0.0.1:${porta}/` }); return r.end() }
    if (q.url === '/http') { r.writeHead(301, { location: 'https://127.0.0.1/' }); return r.end() }
    r.writeHead(q.url === '/' ? 200 : 404); r.end('x')
  })
  porta = s.address().port
  try {
    const r = await conferirHttp(montar(porta)); assert.deepEqual(r, { erros: [], avisos: [] })
  } finally { await fechar(s) }
})
test('conferência de rede: falha de rede vira aviso, não erro; endereços derivados da canonical', async () => {
  const r = await conferirHttp(montar(1), { timeoutMs: 1000 })
  assert.equal(r.erros.length, 0); assert.equal(r.avisos.length, 3); assert(r.avisos.every(a => a.includes('não conferido')))
  const u = urlsDeConferencia('https://salao.teste.br/'); assert.equal(u.alternativa, 'https://www.salao.teste.br/'); assert.equal(u.http, 'http://salao.teste.br/')
})
