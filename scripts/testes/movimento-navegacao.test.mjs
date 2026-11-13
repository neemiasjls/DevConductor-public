// Testa o clique em link interno e a troca de página (movimento-navegacao.mjs): as regras puras (quais links, página
// de desafio, tipo de troca) e, num site local de 2 páginas com um segundo servidor fazendo de "outro site", a tela
// escura que cobre e descobre e a trava: o registro dos servidores prova o que NÃO foi seguido.
// Roda com: node --test scripts/testes/movimento-navegacao.test.mjs   (teste de navegador: um por vez na máquina)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import dgram from 'node:dgram'
import zlib from 'node:zlib'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pastaScripts = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts')
const { acharNavegador, abrirNavegador, conferirRobots, hostInterno, buscarRobots } = await import(pathToFileURL(path.join(pastaScripts, 'raio-x.mjs')).href)
const quadros = await import(pathToFileURL(path.join(pastaScripts, 'movimento-quadros.mjs')).href)
const { mesmoSite, motivoDeNaoSeguir, escolherLinks, pareceDesafio, classificarTroca, corDominante, criarRobots, capturarNavegacao, ganchosAntes, rotaProibida, comTrava, travaDe, tirarDoAr, barradosParaNaoMedido, avisoDeBarrado, linksProibidosParaNaoMedido } =
  await import(pathToFileURL(path.join(pastaScripts, 'movimento-navegacao.mjs')).href)

// ---------------------------------------------------------------------------------------------------------
// Regras puras
// ---------------------------------------------------------------------------------------------------------
const atual = 'https://www.site.test/'
const link = (bruto, mais = {}) => ({ bruto, url: new URL(bruto, atual).href, download: false, alvo: '', noMenu: false, noCartao: true, visivel: true, ...mais })

test('motivoDeNaoSeguir: só rota de conteúdo do mesmo site', () => {
  assert.equal(motivoDeNaoSeguir(link('/projetos/um'), atual), null)
  assert.equal(motivoDeNaoSeguir(link('https://site.test/sobre', { noMenu: true, noCartao: false }), atual), null, 'com e sem www é o mesmo site')
  for (const [l, parte] of [
    [link('#topo'), 'âncora'], [link('mailto:a@b.test'), 'não é endereço'], [link('tel:+5511'), 'não é endereço'], [link('javascript:void(0)'), 'não é endereço'],
    [link('https://wa.me/5511'), 'WhatsApp'], [link('https://api.whatsapp.com/send'), 'WhatsApp'], [link('https://outro.test/x'), 'outro site'],
    [link('https://site.test:8443/x'), 'outro site'], [link('/arquivo', { download: true }), 'download'], [link('/novo', { alvo: '_blank' }), 'outra janela'],
    [link('/sobre?ref=1'), 'parâmetros'], [link('/'), 'mesma página'], [link('/#contato'), 'mesma página'], [link('/login'), 'login'], [link('/conta/logout'), 'login'],
    [link('/sair'), 'login'], [link('/cart'), 'login'], [link('/checkout/1'), 'login'], [link('/item/delete'), 'login'], [link('/admin'), 'login'],
    [link('/catalogo.pdf'), 'arquivo'], [link('/solto', { noCartao: false }), 'fora do menu'],
  ]) assert.ok((motivoDeNaoSeguir(l, atual) || '').includes(parte), `${l.bruto}: ${motivoDeNaoSeguir(l, atual)}`)
  assert.equal(mesmoSite('http://site.test/a', 'https://www.site.test/b'), true)
  assert.equal(mesmoSite('http://127.0.0.1:5000/', 'http://127.0.0.1:5001/'), false)
})

test('linksProibidosParaNaoMedido: carrinho, conta e pagamento do próprio site viram linha com o motivo', () => {
  const links = [link('/carrinho'), link('/carrinho/'), link('/login'), link('/projetos/um'), link('https://outro.test/carrinho'), link('/checkout', { noCartao: false })]
  const n = linksProibidosParaNaoMedido(links, atual, { pagina: 'inicio' })
  assert.deepEqual(n.map((x) => x.o), ['https://www.site.test/carrinho', 'https://www.site.test/login', 'https://www.site.test/checkout'], 'um por caminho; outro site e página de conteúdo ficam fora')
  for (const x of n) { assert.match(x.motivo, /rota proibida/); assert.equal(x.afetaMedida, false); assert.equal(x.etapa, 'clique') }
  const muitos = Array.from({ length: 25 }, (_, k) => link(`/admin/p${k}`))
  const m = linksProibidosParaNaoMedido(muitos, atual, { max: 20 })
  assert.equal(m.length, 21)
  assert.match(m.at(-1).o, /mais 5 link/)
  // revisão do Codex: outro motivo (parâmetros, outra janela) não esconde a rota proibida
  const outros = linksProibidosParaNaoMedido([link('/conta?origem=menu'), link('/entrar', { alvo: '_blank' }), link('/contato?x=1')], atual)
  assert.deepEqual(outros.map((x) => x.o), ['https://www.site.test/conta', 'https://www.site.test/entrar'])
})

test('escolherLinks: primeiro o padrão que mais se repete, depois o primeiro do menu', () => {
  const links = [link('/sobre', { noMenu: true, noCartao: false }), link('/contato', { noMenu: true, noCartao: false }), link('/login', { noMenu: true }),
    link('/projetos/um'), link('/projetos/dois'), link('/projetos/tres'), link('/blog/a'), link('https://outro.test/x')]
  const ordem = escolherLinks(links, atual).map((l) => l.bruto)
  assert.deepEqual(ordem, ['/projetos/um', '/sobre', '/contato', '/blog/a'])
})

test('pareceDesafio: bloqueio, página 200 de desafio e página normal', () => {
  for (const s of [401, 403, 429]) assert.ok(pareceDesafio({ status: s, titulo: 'Loja', texto: 'x'.repeat(500) }))
  assert.ok(pareceDesafio({ status: 200, titulo: 'Just a moment...', texto: '' }))
  assert.ok(pareceDesafio({ status: 200, titulo: 'Loja', texto: 'Checking your browser before accessing' }))
  assert.ok(pareceDesafio({ status: 200, titulo: 'x', texto: 'Please verify you are human' }))
  assert.ok(pareceDesafio({ status: 200, titulo: 'Access denied', texto: 'x'.repeat(100) }))
  assert.ok(pareceDesafio({ status: 200, titulo: '', texto: 'Complete o captcha' }))
  assert.ok(pareceDesafio({ status: 200, titulo: '', texto: '  ' }), 'quase sem texto e sem título')
  assert.equal(pareceDesafio({ status: 200, titulo: 'Marcenaria', texto: 'Móveis sob medida. '.repeat(20) }), null)
  assert.equal(pareceDesafio({ status: 200, titulo: 'Estúdio', texto: '' }), null, 'página só de canvas, com título, não é desafio')
  assert.equal(pareceDesafio({ status: 200, titulo: 'Blog', texto: 'Como montar um captcha. ' + 'texto '.repeat(400) }), null, 'a palavra num texto longo não basta')
})

const L = 160, H = 100
const img = (cor) => { const px = Buffer.alloc(L * H * 3); for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) px.set(cor(x, y), (y * L + x) * 3); return { largura: L, altura: H, canais: 3, px } }
const corA = (x) => [(Math.floor(x / 10) * 37) % 256, (Math.floor(x / 10) * 91) % 256, 60]
const corZ = (x, y) => [20, (Math.floor(y / 10) * 53) % 256, 200]
const mistura = (f, g, u) => (x, y) => f(x, y).map((v, c) => Math.round(v * (1 - u) + g(x, y)[c] * u))
const escuro = () => [17, 17, 17]
const A = img(corA), Z = img(corZ)

test('classificarTroca: cobre-e-descobre com duração, desvanece, desliza e troca seca', () => {
  const cobre = classificarTroca([{ t: 0, img: A }, { t: 1000, img: img(mistura(corA, escuro, 0.5)) }, { t: 1100, img: img(escuro) }, { t: 1200, img: img(escuro) },
    { t: 1300, img: img(mistura(corZ, escuro, 0.5)) }, { t: 1400, img: Z }, { t: 1500, img: Z }])
  assert.equal(cobre.tipo, 'cobre-e-descobre')
  assert.ok(cobre.duracaoMs >= 400 && cobre.duracaoMs <= 440, String(cobre.duracaoMs))
  assert.equal(cobre.cor, '#141414')
  assert.ok(corDominante(img(escuro)).parte > 0.99 && corDominante(A).parte < 0.5)
  const some = classificarTroca([{ t: 0, img: A }, { t: 100, img: img(mistura(corA, corZ, 0.3)) }, { t: 200, img: img(mistura(corA, corZ, 0.7)) }, { t: 300, img: Z }])
  assert.equal(some.tipo, 'desvanece')
  const andou = (d) => img((x, y) => (x >= d ? corA(x - d, y) : corZ(x, y)))
  const desliza = classificarTroca([{ t: 0, img: A }, { t: 100, img: andou(27) }, { t: 200, img: andou(93) }, { t: 300, img: Z }])
  assert.deepEqual([desliza.tipo, desliza.eixo], ['desliza', 'x'])
  assert.equal(classificarTroca([{ t: 0, img: A }, { t: 500, img: Z }]).tipo, 'troca-seca')
  assert.equal(classificarTroca([{ t: 0, img: A }, { t: 500, img: img(() => [255, 255, 255]) }, { t: 560, img: Z }]).tipo, 'troca-seca', 'piscada branca entre páginas não é cortina')
  assert.equal(classificarTroca([{ t: 0, img: A }, { t: 500, img: A }]), null)
})

test('classificarTroca: captura inconclusiva não vira troca seca (achado 7)', () => {
  // antes: um quadro só, ou quadros de tamanhos diferentes, devolviam null e a coleta escrevia "troca-seca"
  assert.equal(classificarTroca([{ t: 0, img: A }]).tipo, 'inconclusiva')
  assert.equal(classificarTroca([{ t: 0, img: A }, { t: 300, img: { ...Z, largura: L / 2 } }]).tipo, 'inconclusiva')
  // a tela muda aos poucos por 300 ms, mas não é cortina, desvanecer nem deslizar: não dá para afirmar "sem transição"
  const ruido = (k) => img((x, y) => [(x * 7 + y * 13 + k * 50) % 256, (x * 3 * k + 40) % 256, (y * 11 + k * 90) % 256])
  const r = classificarTroca([{ t: 0, img: A }, { t: 100, img: ruido(1) }, { t: 200, img: ruido(2) }, { t: 300, img: ruido(3) }, { t: 400, img: Z }])
  assert.equal(r.tipo, 'inconclusiva', JSON.stringify(r))
  assert.ok(r.motivo)
})

test('rotaProibida: login, sair, compra, administração e arquivo; a própria página de origem não conta', () => {
  for (const u of ['https://s.test/conta/logout', 'https://s.test/admin/x', 'https://s.test/item/delete', 'https://s.test/checkout', 'https://s.test/a.zip']) assert.equal(rotaProibida(u), true, u)
  assert.equal(rotaProibida('https://s.test/projetos/um'), false)
  assert.equal(rotaProibida('https://s.test/icone.svg', null, { arquivo: false }), false, 'conteúdo pedido por código pode ser arquivo de imagem')
  assert.equal(rotaProibida('https://s.test/admin/', 'https://s.test/admin/#topo'), false, 'a página que já estava aberta')
})

test('rotaProibida olha também a consulta, com a mesma regra por pedaço (achado P1-c)', () => {
  for (const u of ['/conta?acao=logout', '/x?a=1&passo=checkout', '/?pagina=admin', '/p?acao=log%6Fut', '/p?ir=sair']) assert.equal(rotaProibida('https://s.test' + u), true, u)
  for (const u of ['/sobre?ref=1', '/p?tipo=cartao', '/p?x=administracao-de-obras', '/p?q=loginho']) assert.equal(rotaProibida('https://s.test' + u), false, u)
})

test('PROIBIDO_NO_ENDERECO por pedaço: palavra no meio de outra não barra', () => {
  for (const u of ['/cartao', '/vai-sair', '/projetos/cartao-de-visita', '/administracao-de-obras', '/loginho']) assert.equal(rotaProibida('https://s.test' + u), false, u)
  for (const u of ['/cart', '/conta/sair', '/logout', '/user-logout', '/loja/cart/', '/admin', '/x_delete', '/checkout.html']) assert.equal(rotaProibida('https://s.test' + u), true, u)
  const link = (bruto) => ({ bruto, url: new URL(bruto, 'https://s.test/').href, noMenu: true })
  assert.equal(motivoDeNaoSeguir(link('/cartao'), 'https://s.test/'), null)
  assert.equal(motivoDeNaoSeguir(link('/conta/sair'), 'https://s.test/'), 'endereço de login, compra ou administração')
})

// Lote de 12/11: caminho decodificado antes do teste (codificação inválida = proibida) e palavras novas. Inglês por
// pedaço (como login); português só como trecho inteiro entre barras ou na consulta (como sair). ";" também separa
// (/logout;jsessionid=1 é a mesma rota de sair).
test('rotaProibida e motivoDeNaoSeguir: caminho codificado e palavras novas', () => {
  const barra = ['/%6Cogout', '/conta/%73air', '/%61dmin/x', '/x/%E0%A4%A', '/signout', '/sign-out', '/signin', '/sign-in', '/signup', '/sign-up', '/sign_in',
    '/register', '/conta/register-now', '/payment', '/payments/1', '/carrinho', '/loja/carrinho/', '/pagamento', '/cadastro', '/?etapa=pagamento', '/logout;jsessionid=1',
    '/log-out', '/catalogo%2Epdf']
  // "/blog/formas-de-pagamento" e "/carrinhos-de-mao" passavam aqui; desde a decisão da regente (12/11, abaixo) barram
  const passa = ['/cartao', '/vai-sair', '/registered-office', '/cadastro-de-clientes', '/signage', '/design-in-brazil',
    '/sobre%20nos', '/100%25-natural']
  for (const c of barra) assert.equal(rotaProibida('https://s.test' + c), true, 'deveria barrar ' + c)
  for (const c of passa) assert.equal(rotaProibida('https://s.test' + c), false, 'deveria passar ' + c)
  const link = (bruto) => ({ bruto, url: new URL(bruto, 'https://s.test/').href, noMenu: true })
  for (const c of barra.filter((c) => !c.includes('?') && !c.endsWith('pdf'))) assert.equal(motivoDeNaoSeguir(link(c), 'https://s.test/'), 'endereço de login, compra ou administração', c)
  for (const c of passa) assert.equal(motivoDeNaoSeguir(link(c), 'https://s.test/'), null, c)
})

// Decisão da regente (12/11, trava-d): palavras novas, carrinho/pagamento como pedaço de palavra e decodificação
// repetida. Cada teste junta TODOS os casos errados antes de falhar (a contraprova mostra a lista inteira).
const ACAO = 'endereço de login, compra ou administração'
const conferirRotas = (barra, passa) => {
  const link = (bruto) => ({ bruto, url: new URL(bruto, 'https://s.test/').href, noMenu: true })
  const erros = []
  for (const c of barra) {
    if (rotaProibida('https://s.test' + c) !== true) erros.push('rotaProibida deveria barrar ' + c)
    if (!c.includes('?') && motivoDeNaoSeguir(link(c), 'https://s.test/') !== ACAO) erros.push('motivoDeNaoSeguir deveria barrar ' + c)
  }
  for (const c of passa) {
    if (rotaProibida('https://s.test' + c) !== false) erros.push('rotaProibida deveria passar ' + c)
    if (!c.includes('?') && motivoDeNaoSeguir(link(c), 'https://s.test/') !== null) erros.push('motivoDeNaoSeguir deveria passar ' + c)
  }
  assert.deepEqual(erros, [])
}

test('rotas proibidas: unsubscribe, logoff e signoff barram (por pedaço, como login)', () => {
  conferirRotas(['/unsubscribe', '/news/unsubscribe/1', '/x?acao=unsubscribe', '/logoff', '/log-off', '/conta/log_off', '/signoff', '/sign-off', '/p?ir=logoff'],
    ['/unsubscribed-stories', '/sign-offset', '/logoffice'])
})

// Decisão da regente (12/11, Parte 6): entrar, conta e minha-conta barram como trecho inteiro (a versão em português de
// login/signin); como pedaço de palavra, não.
test('rotas proibidas: entrar, conta e minha-conta barram como trecho inteiro; contato, contabilidade e encontrar passam', () => {
  for (const c of ['/entrar', '/conta', '/minha-conta', '/conta/entrar', '/loja/minha-conta/', '/?ir=entrar', '/conta;s=1']) {
    assert.equal(rotaProibida('https://s.test' + c, null, { arquivo: false }), true, c)
    assert.equal(motivoDeNaoSeguir(link(c), atual), c.includes('?') ? 'endereço com parâmetros' : 'endereço de login, compra ou administração', c)
  }
  for (const c of ['/contato', '/contabilidade', '/encontrar', '/conta-corrente', '/minha-contabilidade', '/blog/entrar-em-contato']) {
    assert.equal(rotaProibida('https://s.test' + c, null, { arquivo: false }), false, c)
    assert.equal(motivoDeNaoSeguir(link(c), atual), null, c)
  }
})

// Revisão de segurança (13/11): a palavra em português fecha também no ponto (extensão); barra invertida, NUL, espaço
// e vírgula separam a palavra (IIS lê \ como /). A letra "s" não pode virar separador.
test('rotas proibidas: extensão, barra invertida, NUL, espaço e vírgula separam a palavra', () => {
  for (const c of ['/entrar.php', '/sair.php', '/minha-conta.html', '/cadastro.php', '/foo%5Clogout', '/logout%00', '/logout%20', '/logout,x', '/x%09sair', '/a%5Cconta'])
    assert.equal(rotaProibida('https://s.test' + c, null, { arquivo: false }), true, c)
  for (const c of ['/contato', '/encontrar', '/contabilidade', '/cadastro-de-clientes', '/vai-sair', '/conta-corrente', '/registered-office', '/signage', '/slogin-x', '/assair', '/sobre'])
    assert.equal(rotaProibida('https://s.test' + c, null, { arquivo: false }), false, c)
})

// Decisão da regente (13/11): rotas padrão de loja e conta (WooCommerce e afins). finalizar-compra e cadastre-se como
// pedaço; cadastrar, account e my-account como trecho inteiro. checkout e cart já barravam.
test('rotas proibidas: finalizar-compra, cadastre-se, cadastrar, account e my-account', () => {
  for (const c of ['/finalizar-compra/', '/loja/finalizar-compra', '/cadastre-se', '/clube/cadastre-se-ja', '/cadastrar', '/account', '/my-account/', '/loja/my-account/pedidos', '/checkout', '/cart'])
    assert.equal(rotaProibida('https://s.test' + c, null, { arquivo: false }), true, c)
  for (const c of ['/accounting', '/accounts-payable-guide', '/cadastrar-se-e-facil-blog', '/cadastramento', '/contato', '/minha-casa'])
    assert.equal(rotaProibida('https://s.test' + c, null, { arquivo: false }), false, c)
})

test('rotas proibidas: carrinho e pagamento barram também como pedaço de palavra', () => {
  conferirRotas(['/meu-carrinho', '/pagamentos', '/blog/formas-de-pagamento', '/carrinhos-de-mao', '/loja/meucarrinho', '/?etapa=pagamentos', '/Pagamentos/2'],
    ['/cartao', '/vai-sair', '/cadastro-de-clientes', '/pagina', '/carro'])
})

test('rotas proibidas: caminho e consulta decodificados até estabilizar, no máximo 5 voltas', () => {
  const s = (k) => '%' + '25'.repeat(k - 1) + '73' // "s" codificado k vezes: precisa de k voltas para virar "s"
  conferirRotas(['/%256Cogout', '/%25256Cogout', '/conta/%2573air', '/%2561dmin/x', '/%256Cogout/%25E0', '/p?acao=%256Cogout', '/p?acao=%25256Cogout',
    `/${s(6)}obre`, `/p?q=${s(6)}obre`],
  ['/sobre%2520nos', '/100%2525-natural', `/${s(5)}obre`, `/p?q=${s(5)}obre`])
})

test('avisoDeBarrado: o aviso da troca diz o que foi barrado (escrita ou leitura)', () => {
  const escrita = avisoDeBarrado({ tipo: 'escrita', metodo: 'POST', url: 'https://s.test/grava' }, '/a')
  assert.match(escrita, /escrita/)
  for (const tipo of ['robots', 'rota', 'outro-site', 'janela', 'quadro-outro-site']) {
    const a = avisoDeBarrado({ tipo, metodo: 'GET', url: 'https://fora.test/x' }, '/a')
    assert.doesNotMatch(a, /escrita/, tipo)
    assert.match(a, /GET/, tipo)
    assert.match(a, /a página foi medida/, tipo)
  }
})

test('criarRobots: um pedido por site; destino proibido e site que bloqueia robôs não passam', async () => {
  let pedidos = 0
  const permitido = criarRobots({ buscar: async (u) => { pedidos++; return String(u).includes('fechado') ? { status: 403, ok: false } : { status: 200, ok: true, text: async () => 'User-agent: *\nDisallow: /privado/\n' } } })
  assert.equal(await permitido('https://site.test/projetos/um'), true)
  assert.equal(await permitido('https://site.test/privado/x'), false)
  assert.equal(pedidos, 1)
  assert.equal(await permitido('https://fechado.test/'), false)
})

// O robots.txt que redireciona não é seguido pelo fetch sozinho: cada salto é validado antes de ser pedido (só
// http(s), caminho /robots.txt, nunca rota de ação; no máximo 5 saltos). Salto inválido = indisponível: o estrito
// barra; o próprio site segue como no robots fora do ar (sem regra).
test('criarRobots: salto do robots.txt para outro esquema, sem Location ou de http para https', async () => {
  const pedidos = []
  const resposta = (status, loc, corpo = '') => ({ status, ok: status >= 200 && status < 300, headers: { get: (n) => (n.toLowerCase() === 'location' ? loc : null) }, text: async () => corpo })
  const robots = criarRobots({ buscar: async (u, op) => {
    pedidos.push(`${op.redirect} ${u}`)
    const x = new URL(u)
    if (x.hostname === 'a.test') return resposta(302, 'ftp://a.test/robots.txt')
    if (x.hostname === 'b.test') return resposta(302, null)
    if (x.protocol === 'http:') return resposta(301, 'https://c.test/robots.txt')
    return resposta(200, null, 'User-agent: *\nDisallow: /privado\n')
  } })
  assert.equal(await robots.estrito('http://a.test/cena.json'), false)
  assert.equal(await robots.estrito('http://b.test/cena.json'), false)
  assert.equal(await robots('http://b.test/cena.json'), true)
  assert.equal(await robots.estrito('http://c.test/privado/x'), false)
  assert.equal(await robots.estrito('http://c.test/aberto'), true)
  assert.deepEqual(pedidos, ['manual http://a.test/robots.txt', 'manual http://b.test/robots.txt', 'manual http://c.test/robots.txt', 'manual https://c.test/robots.txt'])
})

test('criarRobots: redirecionamento do robots.txt com servidores que contam (/logout, outro site, laço)', async (t) => {
  const texto = (res, s, corpo, cab = {}) => { res.writeHead(s, { 'Content-Type': 'text/plain', ...cab }); res.end(corpo) }
  const B = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? texto(res, 200, 'User-agent: *\nDisallow: /privado\n') : texto(res, 200, 'ok')))
  const leva = (status, loc) => (req, res) => (req.url === '/robots.txt' ? texto(res, status, '', { Location: loc }) : texto(res, 200, 'ok'))
  const A1 = await subirOutroSite(t, leva(302, '/logout'))
  const A2 = await subirOutroSite(t, leva(301, B.fora + 'robots.txt'))
  const A3 = await subirOutroSite(t, leva(302, B.fora + 'logout'))
  const A4 = await subirOutroSite(t, leva(302, '/robots.txt')) // laço
  const robots = criarRobots()
  // 302 -> /logout: não é pedido; estrito barra, o próprio site fica sem regra (como robots fora do ar)
  assert.equal(await robots.estrito(A1.fora + 'cena.json'), false)
  assert.equal(await robots(A1.fora + 'cena.json'), true)
  assert.deepEqual(A1.registro, ['GET /robots.txt'])
  // 301 -> robots.txt de outro site: seguido, valem as regras dele
  assert.equal(await robots.estrito(A2.fora + 'privado/x'), false)
  assert.equal(await robots.estrito(A2.fora + 'aberto'), true)
  assert.deepEqual(A2.registro, ['GET /robots.txt'])
  // 302 -> /logout de outro site: não é pedido
  assert.equal(await robots.estrito(A3.fora + 'cena.json'), false)
  assert.deepEqual(A3.registro, ['GET /robots.txt'])
  assert.deepEqual(B.registro, ['GET /robots.txt'], 'B recebeu algo além do robots.txt: ' + JSON.stringify(B.registro))
  // laço: 1 pedido + 5 saltos, e para
  assert.equal(await robots.estrito(A4.fora + 'cena.json'), false)
  assert.deepEqual(A4.registro, Array(6).fill('GET /robots.txt'))
})

// Os servidores de teste atendem em 127.0.0.1; o buscar injetado faz um nome "público" (*.exemplo) chegar a eles,
// para a origem da cadeia não ser interna (conferirRobots nem consulta robots de endereço local).
const textoPuro = (res, s, corpo, cab = {}) => { res.writeHead(s, { 'Content-Type': 'text/plain', ...cab }); res.end(corpo) }
const buscarPorNome = (mapa) => (alvo, op) => { const u = new URL(alvo); const s = mapa[u.hostname]; return fetch(s ? new URL(u.pathname + u.search, s.fora) : u, op) }

// conferirRobots (entrada do raio-x) seguia o redirecionamento sozinho (fetch padrão): 302 -> /logout era pedido pelo
// Node. Agora usa o mesmo seguidor validado do criarRobots.
test('conferirRobots: redirecionamento do robots.txt validado a cada salto (/logout não é pedido; robots de outro site vale)', async (t) => {
  const B = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? textoPuro(res, 200, 'User-agent: *\nDisallow: /privado\n') : textoPuro(res, 200, 'ok')))
  const A = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? textoPuro(res, 302, '', { Location: '/logout' }) : textoPuro(res, 200, 'ok')))
  const C = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? textoPuro(res, 301, '', { Location: 'http://outro.exemplo/robots.txt' }) : textoPuro(res, 200, 'ok')))
  const buscar = buscarPorNome({ 'publico.exemplo': A, 'outro.exemplo': B, 'vai.exemplo': C })
  // 302 -> /logout: não é pedido; o site fica sem regra (como robots fora do ar)
  assert.equal(await conferirRobots(new URL('http://publico.exemplo/'), { buscar }), null)
  assert.deepEqual(A.registro, ['GET /robots.txt'], 'o Node pediu o destino do redirecionamento')
  // 301 -> robots.txt de outro site público: seguido, vale a regra dele
  assert.match((await conferirRobots(new URL('http://vai.exemplo/privado/x'), { buscar })) ?? '', /não permite/)
  assert.equal(await conferirRobots(new URL('http://vai.exemplo/aberto'), { buscar }), null)
  assert.deepEqual(C.registro, ['GET /robots.txt', 'GET /robots.txt'])
  assert.deepEqual(B.registro, ['GET /robots.txt', 'GET /robots.txt'])
})

test('hostInterno: nome e IP literal da rede de dentro (sem DNS); o resto é de fora', () => {
  for (const h of ['localhost', 'LOCALHOST.', 'a.localhost', '127.0.0.1', '127.9.9.9', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '0.0.0.0', '[::1]', '::1', '[::]', '[fc00::1]', '[fd12:3456::1]', '[fe80::1]', '[febf::1]', '[::ffff:7f00:1]', '[::ffff:a9fe:a9fe]', ''])
    assert.equal(hostInterno(h), true, h)
  for (const h of ['exemplo.com', 'localhost.com', 'meulocalhost', '172.15.0.1', '172.32.0.1', '192.169.0.1', '169.255.0.1', '11.0.0.1', '8.8.8.8',
    '[2001:db8::1]', '[fec0::1]', '[ff02::1]', '[::ffff:808:808]'])
    assert.equal(hostInterno(h), false, h)
  // o parser de URL normaliza as formas numéricas antes (2130706433, 0x7f.1 e ::ffff:127.0.0.1 viram 127.0.0.1)
  for (const u of ['http://2130706433/', 'http://0x7f.1/', 'http://[::ffff:127.0.0.1]/', 'http://[0:0:0:0:0:0:0:1]/', 'http://[FE80::abcd]/'])
    assert.equal(hostInterno(new URL(u).hostname), true, u)
})

// Um site público não pode mandar o Node buscar robots.txt na rede de dentro (127.x, 10.x, 192.168.x, 169.254.x...).
// Origem interna (teste local) pode saltar para interno.
test('robots: salto de site público para endereço interno não é pedido (criarRobots e conferirRobots); origem interna pode', async (t) => {
  const I = await subirOutroSite(t, (req, res) => textoPuro(res, 200, 'User-agent: *\nDisallow: /\n'))
  const P = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? textoPuro(res, 302, '', { Location: `http://127.0.0.1:${new URL(I.fora).port}/robots.txt` }) : textoPuro(res, 200, 'ok')))
  const buscar = buscarPorNome({ 'publico.exemplo': P })
  const robots = criarRobots({ buscar })
  assert.equal(await robots.estrito('http://publico.exemplo/cena.json'), false, 'salto inválido = robots indisponível (estrito barra)')
  assert.equal(await robots('http://publico.exemplo/cena.json'), true, 'o próprio site fica sem regra')
  assert.equal(await conferirRobots(new URL('http://publico.exemplo/'), { buscar }), null)
  assert.deepEqual(P.registro, ['GET /robots.txt', 'GET /robots.txt'])
  assert.deepEqual(I.registro, [], 'o endereço interno recebeu pedido mandado por um site público')
  // origem interna: o mesmo 302 (localhost -> 127.0.0.1) é seguido e vale a regra de lá (Disallow: /)
  assert.equal(await criarRobots().estrito(P.fora + 'cena.json'), false)
  assert.deepEqual(I.registro, ['GET /robots.txt'], 'origem interna segue o salto')
})

// Tabela completa, passando pelo new URL como o código real faz (o parser normaliza 127.1, 2130706433, 0x7f.0.0.1).
test('hostInterno: tabela completa pelo new URL (100.64/10, formas numéricas, IPv4 dentro de IPv6)', () => {
  const internos = ['localhost', 'a.b.localhost', '0.1.2.3', '127.0.0.1', '127.1', '2130706433', '0x7f.0.0.1', '10.1.2.3', '172.16.0.1',
    '172.31.9.9', '192.168.0.1', '169.254.169.254', '100.64.0.1', '100.127.255.255', '[::]', '[::1]', '[fc00::1]', '[fdff::1]',
    '[fe80::1]', '[febf::1]', '[::ffff:127.0.0.1]', '[::ffff:7f00:1]', '[::ffff:10.0.0.1]', '[::ffff:100.64.0.1]']
  const deFora = ['exemplo.com', 'localhost.exemplo.com', '8.8.8.8', '100.63.255.255', '100.128.0.1', '172.32.0.1', '203.0.113.7', '[2001:db8::1]',
    '[fec0::1]', '[::ffff:8.8.8.8]']
  for (const h of internos) assert.equal(hostInterno(new URL(`http://${h}/`).hostname), true, h)
  for (const h of deFora) assert.equal(hostInterno(new URL(`http://${h}/`).hostname), false, h)
})

// Transporte simulado (sem Chrome): a trava recebe o Fetch.requestPaused como o Chrome mandaria.
const navSimulado = () => {
  const ouvintes = {}, cmds = []
  return { cmds, ouvintes, ouvir: (ev, fn) => { ouvintes[ev] = fn },
    cmd: async (m, p) => { cmds.push([m, p]); return m === 'Page.getFrameTree' ? { frameTree: { frame: { id: 'Q' } } } : {} } }
}
let idPedido = 0
const pedirSimulado = async (nav, url, resourceType = 'Fetch') => {
  const requestId = `r${++idPedido}`
  await nav.ouvintes['Fetch.requestPaused']({ requestId, request: { url, method: 'GET' }, resourceType, frameId: 'Q' })
  return nav.cmds.filter(([, p]) => p?.requestId === requestId).map(([m]) => m).join(',')
}
// lookup falso no formato do dns.lookup (respeita options.all); valor função = muda a cada chamada
const lookupFalso = (mapa, chamadas = []) => (host, opts, cb) => {
  if (typeof opts === 'function') { cb = opts; opts = {} }
  chamadas.push(host)
  let a = mapa[host]
  if (typeof a === 'function') a = a()
  if (!a) { const e = new Error(`sem nome ${host}`); e.code = 'ENOTFOUND'; return process.nextTick(cb, e) }
  const family = a.includes(':') ? 6 : 4
  process.nextTick(() => (opts && opts.all ? cb(null, [{ address: a, family }]) : cb(null, a, family)))
}

test('trava (transporte simulado): página pública lendo a rede interna é barrada antes de qualquer consulta de robots', async () => {
  const nav = navSimulado()
  const robots = []
  const permitido = criarRobots({ buscar: async (u) => { robots.push(String(u)); return { status: 404, ok: false, headers: { get: () => null } } } })
  const chamadas = []
  const lookup = lookupFalso({ 'interno.exemplo': '10.0.0.2', 'misto.exemplo': '192.168.1.9', 'cdn.exemplo': '203.0.113.5', 'www.publico.exemplo': '10.9.9.9' }, chamadas)
  await comTrava(nav, { origem: 'https://publico.exemplo/', permitido, navegar: false, lookup }, async (T) => {
    for (const u of ['http://169.254.169.254/latest/meta-data/', 'http://127.1:8080/x', 'http://[::1]/x', 'http://localhost:9/x',
      'http://[::ffff:7f00:1]/x', 'http://100.64.1.1/x', 'http://interno.exemplo/cena.json', 'https://misto.exemplo/a.json'])
      assert.equal(await pedirSimulado(nav, u), 'Fetch.failRequest', u)
    assert.deepEqual(robots, [], 'o Node consultou robots.txt na rede interna mandado por página pública')
    assert.deepEqual(T.barrados.map((b) => [b.tipo, b.documento, b.conteudo]), Array(8).fill(['rede-interna', false, false]))
    // nome público de verdade: segue para o robots (404 = sem regra) e passa
    assert.equal(await pedirSimulado(nav, 'https://cdn.exemplo/cena.json'), 'Fetch.continueRequest')
    assert.deepEqual(robots, ['https://cdn.exemplo/robots.txt'])
    // o próprio host da página não é resolvido de novo (a origem é escolha de quem mede)
    const antes = chamadas.length
    assert.equal(await pedirSimulado(nav, 'https://publico.exemplo/dados.json'), 'Fetch.continueRequest')
    assert.equal(chamadas.length, antes)
    // www. é o "mesmo site" para a trava, mas é outro nome: resolvido; para dentro = barrado (conteúdo do mesmo site)
    assert.equal(await pedirSimulado(nav, 'https://www.publico.exemplo/dados.json'), 'Fetch.failRequest')
    assert.deepEqual(T.barrados.at(-1).tipo, 'rede-interna')
    assert.deepEqual(robots, ['https://cdn.exemplo/robots.txt', 'https://publico.exemplo/robots.txt'], 'www. não teve robots consultado')
  })
  assert.match(avisoDeBarrado({ tipo: 'rede-interna', metodo: 'GET', url: 'http://169.254.169.254/latest/' }, '/x'), /rede interna/)
  assert.equal(barradosParaNaoMedido([{ tipo: 'rede-interna', documento: false, conteudo: false, metodo: 'GET', url: 'http://10.0.0.1/' }],
    { pagina: 'p', etapa: 'e', onde: 'o', escritaInvalida: 'qualquer' })[0].afetaMedida, false, 'só anotado, também no rigoroso')
})

test('trava (transporte simulado): origem interna continua falando com localhost (sem resolver nada)', async (t) => {
  const L = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? textoPuro(res, 404, '') : textoPuro(res, 200, '{}')))
  const nav = navSimulado()
  const chamadas = []
  await comTrava(nav, { origem: 'http://127.0.0.1:1/', permitido: criarRobots(), navegar: false, lookup: lookupFalso({}, chamadas) }, async (T) => {
    assert.equal(await pedirSimulado(nav, L.fora + 'cena.json'), 'Fetch.continueRequest')
    assert.deepEqual(T.barrados, [])
  })
  assert.deepEqual(L.registro, ['GET /robots.txt'], 'robots do localhost consultado pelo buscar padrão')
  assert.deepEqual(chamadas, [], 'origem interna não precisa resolver')
})

test('robots no Node: nome público que resolve para interno não conecta (criarRobots e conferirRobots); origem interna pode', async (t) => {
  const I = await subirOutroSite(t, (req, res) => textoPuro(res, 200, 'User-agent: *\nDisallow: /\n'))
  const porta = new URL(I.fora).port
  const lookup = lookupFalso({ 'publico.exemplo': '127.0.0.1', localhost: '127.0.0.1' })
  const buscar = (u, op) => buscarRobots(u, { ...op, lookup })
  assert.equal(await criarRobots({ buscar }).estrito(`http://publico.exemplo:${porta}/cena.json`), false)
  assert.equal(await conferirRobots(new URL(`http://publico.exemplo:${porta}/`), { buscar }), null)
  assert.deepEqual(I.registro, [], 'conectou no endereço interno a partir de nome público')
  // https também passa pelo lookup embrulhado (barra antes do TLS; o caminho feliz do https fica sem teste local)
  const chamadas = []
  const contado = lookupFalso({ 'publico.exemplo': '127.0.0.1' }, chamadas)
  await assert.rejects(buscarRobots(`https://publico.exemplo:${porta}/robots.txt`, { bloquearInterno: true, lookup: contado }), { code: 'ERR_REDE_INTERNA' })
  assert.deepEqual(chamadas, ['publico.exemplo'])
  assert.deepEqual(I.registro, [])
  // literal interno vindo de cadeia pública (origem informada) também não é pedido
  assert.equal(await criarRobots({ buscar })(`http://127.0.0.1:${porta}/x`, 'https://publico.exemplo/'), true, 'sem regra, sem pedido')
  assert.deepEqual(I.registro, [])
  // origem interna (pelo nome literal): conecta e vale a regra de lá
  assert.equal(await criarRobots({ buscar }).estrito(`http://localhost:${porta}/x`), false)
  assert.deepEqual(I.registro, ['GET /robots.txt'])
})

test('troca de endereço (DNS rebinding): público na conferência da trava, interno na conexão do robots → nada conecta', async (t) => {
  const I = await subirOutroSite(t, (req, res) => textoPuro(res, 404, ''))
  const porta = new URL(I.fora).port
  let n = 0
  const chamadas = []
  const lookup = lookupFalso({ 'cena.exemplo': () => (++n === 1 ? '203.0.113.9' : '127.0.0.1') }, chamadas)
  const nav = navSimulado()
  const permitido = criarRobots({ buscar: (u, op) => buscarRobots(u, { ...op, lookup }) })
  await comTrava(nav, { origem: 'https://publico.exemplo/', permitido, navegar: false, lookup }, async (T) => {
    assert.equal(await pedirSimulado(nav, `http://cena.exemplo:${porta}/cena.json`), 'Fetch.failRequest')
    assert.deepEqual(T.barrados.map((b) => b.tipo), ['robots'], 'robots inalcançável = estrito barra')
  })
  assert.equal(chamadas.length, 2, 'a trava resolveu (público) e a conexão resolveu de novo (interno)')
  assert.deepEqual(I.registro, [], 'a conexão com o endereço interno aconteceu')
})

// robots.txt comprimido (Content-Encoding). O fetch antigo descomprimia sozinho; o transporte novo (buscarRobots) lia os
// bytes comprimidos como texto e liberava /privado. Um servidor local faz vários "sites": o nome (gzip.exemplo...) vira
// o primeiro pedaço do caminho. O buscar de teste só troca o endereço (bloquearInterno desligado para alcançar o
// 127.0.0.1); conexão, leitura e descompressão são as do buscarRobots de verdade. Nome público = outro site (estrito).
const REGRA = 'User-agent: *\nDisallow: /privado\n'
const VARIANTES = {
  gzip: ['gzip', zlib.gzipSync],
  xgzip: ['x-gzip', zlib.gzipSync],
  maiusculo: ['GZIP', zlib.gzipSync],
  deflate: ['deflate', zlib.deflateSync], // com cabeçalho zlib (o certo pela RFC 9110)
  deflatecru: ['deflate', zlib.deflateRawSync], // sem cabeçalho (servidores antigos)
  br: ['br', zlib.brotliCompressSync],
  encadeado: ['gzip, br', (b) => zlib.brotliCompressSync(zlib.gzipSync(b))], // gzip aplicado primeiro
  identidade: ['identity', (b) => b],
  bom: ['gzip', (b) => zlib.gzipSync(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), b]))],
  bompuro: ['identity', (b) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), b])],
  cinco: ['gzip, gzip, gzip, gzip, gzip', (b) => { for (let i = 0; i < 5; i++) b = zlib.gzipSync(b); return b }],
  ...(typeof zlib.zstdCompressSync === 'function' ? { zstd: ['zstd', zlib.zstdCompressSync] } : {}),
}
const enviarEmPedacos = (res, cab, corpo) => { // sem Content-Length: Transfer-Encoding chunked
  res.writeHead(200, { 'Content-Type': 'text/plain', ...cab })
  const m = corpo.length >> 1
  res.write(corpo.subarray(0, m))
  res.end(corpo.subarray(m))
}
const subirRobotsComprimido = async (t, rotas) => {
  const pedidos = []
  const s = await subir((req, res) => { pedidos.push(`${req.url} ${req.headers['accept-encoding'] ?? '-'}`); rotas(req.url.split('/')[1], req, res) })
  soltarServidor(t, s)
  const porta = s.address().port
  const buscar = (alvo, op) => { const u = new URL(alvo); return buscarRobots(new URL(`/${u.hostname.split('.')[0]}${u.pathname}`, `http://127.0.0.1:${porta}`), { ...op, bloquearInterno: false }) }
  return { pedidos, buscar }
}

test('robots comprimido: gzip, deflate (com e sem zlib), br, encadeado e BOM barram /privado e liberam /livre', async (t) => {
  const S = await subirRobotsComprimido(t, (nome, req, res) => {
    const [ce, comp] = VARIANTES[nome]
    if (nome === 'deflate') { const c = comp(Buffer.from(REGRA)); res.writeHead(200, { 'Content-Encoding': ce, 'Content-Length': c.length }); return res.end(c) }
    enviarEmPedacos(res, { 'Content-Encoding': ce }, comp(Buffer.from(REGRA)))
  })
  for (const nome of Object.keys(VARIANTES)) {
    const permitido = criarRobots({ buscar: S.buscar })
    assert.equal(await permitido(`http://${nome}.exemplo/privado`), false, `${nome}: permitido liberou /privado`)
    assert.equal(await permitido.estrito(`http://${nome}.exemplo/privado`), false, `${nome}: estrito liberou /privado`)
    assert.equal(await permitido.estrito(`http://${nome}.exemplo/livre`), true, `${nome}: estrito barrou /livre`)
    assert.match(await conferirRobots(new URL(`http://${nome}.exemplo/privado`), { buscar: S.buscar }) ?? 'null', /não permite/, `${nome}: conferirRobots`)
    assert.equal(await conferirRobots(new URL(`http://${nome}.exemplo/livre`), { buscar: S.buscar }), null, `${nome}: conferirRobots /livre`)
  }
  assert.ok(S.pedidos.length > 0 && S.pedidos.every((p) => p.endsWith(' identity')), `pede sem compressão: ${S.pedidos.join(' | ')}`)
})

test('robots comprimido: codificação desconhecida, corpo corrompido, gzip cortado ou cadeia longa = indisponível (estrito proíbe)', async (t) => {
  const g = zlib.gzipSync(Buffer.from(REGRA))
  const S = await subirRobotsComprimido(t, (nome, req, res) => {
    if (nome === 'desconhecida') return enviarEmPedacos(res, { 'Content-Encoding': 'compress' }, Buffer.from(REGRA))
    if (nome === 'corrompido') return enviarEmPedacos(res, { 'Content-Encoding': 'gzip' }, Buffer.from(REGRA))
    if (nome === 'cortado') return enviarEmPedacos(res, { 'Content-Encoding': 'gzip' }, g.subarray(0, g.length - 6))
    if (nome === 'longa') { let c = Buffer.from(REGRA); for (let i = 0; i < 6; i++) c = zlib.gzipSync(c); return enviarEmPedacos(res, { 'Content-Encoding': Array(6).fill('gzip').join(', ') }, c) } // teto: 5, como o fetch
    res.writeHead(500); res.end()
  })
  for (const nome of ['desconhecida', 'corrompido', 'cortado', 'longa']) {
    const permitido = criarRobots({ buscar: S.buscar })
    assert.equal(await permitido.estrito(`http://${nome}.exemplo/livre`), false, `${nome}: estrito deveria proibir (indisponível)`)
    assert.equal(await permitido.estrito(`http://${nome}.exemplo/privado`), false, `${nome}: estrito liberou /privado`)
    assert.equal(await permitido(`http://${nome}.exemplo/livre`), true, `${nome}: o próprio site fica sem regra (como robots fora do ar)`)
    assert.equal(await conferirRobots(new URL(`http://${nome}.exemplo/privado`), { buscar: S.buscar }), null, `${nome}: conferirRobots = sem regra`)
  }
})

test('robots comprimido: bomba (MBs de zeros) termina rápido e o texto para no limite; status sem corpo útil e conexão cortada', async (t) => {
  const bomba = zlib.gzipSync(Buffer.concat([Buffer.from(REGRA), Buffer.alloc(40 * 1024 * 1024)]), { level: 9 })
  const S = await subirRobotsComprimido(t, (nome, req, res) => {
    if (nome === 'bomba') return enviarEmPedacos(res, { 'Content-Encoding': 'gzip' }, bomba)
    if (nome === 'vazio') { res.writeHead(204); return res.end() }
    if (nome === 'naoachado') { res.writeHead(404, { 'Content-Encoding': 'compress' }); return res.end('x') } // corpo de 4xx não é lido
    if (nome === 'latin') return enviarEmPedacos(res, { 'Content-Type': 'text/plain; charset=iso-8859-1' }, Buffer.concat([Buffer.from('User-agent: *\n# caf'), Buffer.from([0xe9, 0xff]), Buffer.from('\nDisallow: /privado\n')]))
    if (nome === 'cortada') { res.writeHead(200, { 'Content-Length': '5000' }); res.write(REGRA); return setTimeout(() => res.socket.destroy(), 30) }
    res.writeHead(500); res.end()
  })
  const t0 = Date.now()
  const r = await S.buscar('http://bomba.exemplo/robots.txt', {})
  const texto = await r.text()
  assert.ok(Date.now() - t0 < 5000, `bomba demorou ${Date.now() - t0} ms`)
  assert.ok(texto.startsWith('User-agent: *') && texto.length <= 500 * 1024, `texto da bomba: ${texto.length} caracteres`)
  const permitido = criarRobots({ buscar: S.buscar })
  assert.equal(await permitido.estrito('http://bomba.exemplo/privado'), false)
  assert.equal(await permitido.estrito('http://bomba.exemplo/livre'), true)
  assert.equal(await permitido.estrito('http://vazio.exemplo/privado'), true, '204: sem regra')
  assert.equal(await permitido.estrito('http://naoachado.exemplo/privado'), true, '404 com codificação estranha: sem regra, como 404 comum')
  assert.equal(await permitido.estrito('http://latin.exemplo/privado'), false, 'charset latin-1 e byte inválido: lido como UTF-8, regra vale')
  assert.equal(await permitido.estrito('http://latin.exemplo/livre'), true)
  assert.equal(await permitido.estrito('http://cortada.exemplo/livre'), false, 'conexão cortada no meio = indisponível')
})

// Achado P2 do Codex (trava-d): o deflate respeita a pressão do estágio seguinte. Cadeia "gzip, deflate" com milhões de
// membros gzip vazios depois da regra: o gunzip anda devagar e não gera texto, e o deflate solta MBs por pedaço que
// chega. Antes a fila entre os dois passava de MBs para um texto de 35 bytes; agora fica perto do highWaterMark.
test('robots comprimido: bomba encadeada com deflate (gzip, deflate) não enche a fila entre os estágios', async (t) => {
  const vazio = zlib.gzipSync(Buffer.alloc(0))
  const bomba = zlib.deflateSync(Buffer.concat([zlib.gzipSync(REGRA), Buffer.alloc(Math.floor((32 << 20) / vazio.length) * vazio.length, vazio)]), { level: 9 })
  const S = await subirRobotsComprimido(t, (nome, req, res) => {
    if (nome === 'encadeada') return enviarEmPedacos(res, { 'Content-Encoding': 'gzip, deflate' }, bomba)
    res.writeHead(500); res.end()
  })
  let fila = 0
  const aoDescomprimir = ([inflar, gunzip]) => { // medida a cada push do deflate: o que ele guardou + o que o gunzip ainda não leu
    const push = inflar.push
    inflar.push = function (...a) { const r = push.apply(this, a); fila = Math.max(fila, inflar.readableLength + gunzip.writableLength); return r }
  }
  const r = await S.buscar('http://encadeada.exemplo/robots.txt', { aoDescomprimir })
  assert.equal(await r.text(), REGRA)
  assert.ok(fila > 0, 'a medida não rodou')
  assert.ok(fila <= 512 * 1024, `fila entre o deflate e o gzip chegou a ${fila} bytes`)
})

// ---------------------------------------------------------------------------------------------------------
// Navegador: site de 2 páginas + "outro site"
// ---------------------------------------------------------------------------------------------------------
const estilo = `*{box-sizing:border-box} body{margin:0;font:18px sans-serif;background:#f4f1ea;color:#222}
nav{display:flex;gap:24px;padding:24px;background:#d9c7a3} main{padding:24px} .bloco{height:260px;margin:16px 0}
.grade{display:flex;gap:16px} a.cartao{flex:1;height:220px;background:#7a5c3a;color:#fff;padding:16px} section a{display:inline-block;padding:12px;margin:6px;background:#cfe3d4}
#cortina{position:fixed;inset:0;background:#111;opacity:0;pointer-events:none;transition:opacity 200ms linear;z-index:9} #cortina.cobre{opacity:1}`
const paginaInicial = (fora) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Marcenaria</title><style>${estilo}</style></head><body>
<nav><a href="/">Início</a><a href="/sobre">Sobre</a><a href="/login">Entrar</a><a href="mailto:oi@site.test">E-mail</a><a href="#topo">Topo</a><a href="${fora}fora-direto">Parceiro</a><a href="/sobre?ref=1">Sobre (ref)</a><a href="/novo" target="_blank">Novo</a></nav>
<main><section class="grade"><a class="cartao" href="/projetos/um">Cozinha</a><a class="cartao" href="/projetos/dois">Sala</a></section>
<div class="bloco" style="background:#b04a2f"></div>
<section><a href="/pulo">Pulo</a><a href="/vai-privado">Vai</a><a href="/privado/direto">Privado</a><a href="/arquivo.zip" download>Zip</a><a href="/baixa">Baixa</a><a id="envia" href="/obrigado">Enviar</a><a href="/desafio">Desafio</a><a href="/vai-embora">Vai sair</a><a class="spa" data-busca="/privado/conteudo" href="/spa-um">SPA um</a><a class="spa" data-busca="/api/logout" href="/spa-dois">SPA dois</a></section>
<form id="f" method="post" action="/enviar"><input type="hidden" name="a" value="1"></form></main>
<div><a href="/solto">Solto</a></div><div id="cortina"></div>
<script>
// SPA: busca o conteúdo por código e troca o endereço com pushState (sem carregar documento)
for (const a of document.querySelectorAll('a.spa')) a.addEventListener('click', (e) => { e.preventDefault(); fetch(a.dataset.busca).catch(() => {}).finally(() => history.pushState({}, '', a.getAttribute('href'))) })
// a cada volta à página inicial o site tenta escrever no servidor (só a trava ligada na volta impede)
try { if (sessionStorage.getItem('visitou')) fetch('/volta', { method: 'POST', body: 'x' }).catch(() => {}); sessionStorage.setItem('visitou', '1') } catch {}
for (const a of document.querySelectorAll('a.cartao')) a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('cortina').classList.add('cobre'); setTimeout(() => { location.href = a.href }, 220) })
document.getElementById('envia').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('f').submit() })
</script></body></html>`
const paginaProjeto = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Projeto</title><style>${estilo}</style></head><body>
<nav><a href="/">Início</a></nav><main><div class="bloco" style="background:#2f5fb0;height:420px"></div><p>${'Cozinha sob medida em freijó. '.repeat(8)}</p></main>
<div id="cortina" class="cobre"></div><script>requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('cortina').classList.remove('cobre')))</script></body></html>`
const paginaSimples = (titulo, cor) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title><style>${estilo}</style></head><body>
<nav><a href="/">Início</a></nav><main><div class="bloco" style="background:${cor};height:500px"></div><p>${'A marcenaria faz móveis sob medida. '.repeat(8)}</p></main></body></html>`

const navegador = acharNavegador()
const pular = !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)'
const subir = (fn) => new Promise((r, x) => { const s = http.createServer(fn); s.once('error', x); s.listen(0, '127.0.0.1', () => r(s)) })
// Limpeza garantida: cada recurso é registrado assim que nasce (t.after roda mesmo se a preparação seguinte falhar,
// por exemplo EPERM na pasta). O vigia fecha o navegador se o teste passar do limite: nada de Chrome vivo.
const soltarServidor = (t, s) => t.after(() => { s.close(); s.closeAllConnections?.() })
const soltarPasta = (t, pasta) => t.after(() => fs.rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
const vigiar = (t, nav, limiteMs) => { const v = setTimeout(() => { nav.fechar().catch(() => {}) }, limiteMs); t.after(() => clearTimeout(v)) }

test('site local: tela escura sai como cobre-e-descobre; a trava não deixa seguir o que não pode', { skip: pular, timeout: 300_000 }, async (t) => {
  const registroFora = [], registro = []
  const outro = await subir((req, res) => { registroFora.push(`${req.method} ${req.url}`); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(paginaSimples('Outro site', '#000')) })
  soltarServidor(t, outro)
  const fora = `http://127.0.0.1:${outro.address().port}/`
  const site = await subir((req, res) => {
    registro.push(`${req.method} ${req.url}`)
    const html = (corpo, status = 200) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(corpo) }
    const u = req.url
    if (u === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('User-agent: *\nDisallow: /privado/\n') }
    else if (u === '/') html(paginaInicial(fora))
    else if (u.startsWith('/projetos/')) html(paginaProjeto)
    else if (u === '/sobre') html(paginaSimples('Sobre', '#3a7a4f'))
    else if (u === '/pulo') { res.writeHead(302, { Location: fora + 'fora' }); res.end() }
    else if (u === '/vai-privado') { res.writeHead(302, { Location: '/privado/segredo' }); res.end() }
    else if (u === '/vai-embora') { res.writeHead(302, { Location: '/conta/logout' }); res.end() }
    else if (u === '/baixa') { res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="a.zip"' }); res.end('zip') }
    else if (u === '/desafio') html('<!doctype html><html><head><title>Just a moment...</title></head><body><p>Checking your browser</p></body></html>')
    else if (u === '/favicon.ico') { res.writeHead(404); res.end() }
    else html(paginaSimples('Outra', '#888'))
  })
  soltarServidor(t, site)
  const base = `http://127.0.0.1:${site.address().port}/`
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-teste-'))
  soltarPasta(t, saida)
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 280_000)
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    for (const source of [quadros.ganchosAntes, ganchosAntes]) await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source }) // ganchos antes de navegar
    const grav = await quadros.gravar(nav, { pasta: path.join(saida, 'quadros') }) // gravação ligada antes de abrir a página
    await quadros.capturarCarregar(nav, grav, { url: base, pagina: 'inicio', duracaoMs: 800 })

    const r = await capturarNavegacao(nav, grav, { pagina: 'inicio', maxPaginas: 12 })
    const tudo = JSON.stringify({ itens: r.itens.map((i) => [i.para.caminho, i.troca.tipo, i.duracaoMs]), paginas: r.paginas, nao: r.naoMedido, barrados: r.barrados })

    // a troca de página
    const cortina = r.itens.find((i) => i.para.caminho === '/projetos/um')
    assert.ok(cortina, tudo)
    assert.equal(cortina.gatilho, 'troca-de-pagina')
    assert.equal(cortina.troca.tipo, 'cobre-e-descobre', tudo)
    assert.ok(cortina.duracaoMs >= 200 && cortina.duracaoMs <= 800, 'duração da cortina de 400 ms: ' + cortina.duracaoMs)
    assert.equal(cortina.alvo.desc, 'a.cartao')
    assert.ok(quadros.GATILHOS.includes(cortina.gatilho) && cortina.muda.every((m) => quadros.MUDANCAS.includes(m)))
    const seca = r.itens.find((i) => i.para.caminho === '/sobre')
    assert.ok(seca && seca.troca.tipo === 'troca-seca', tudo)
    assert.equal(r.itens.length, 2, tudo)
    assert.deepEqual(r.paginas.filter((p) => p.valido !== false).map((p) => [p.id, new URL(p.url).pathname, p.tipo]), [['interna-1', '/projetos/um', 'interna'], ['interna-2', '/sobre', 'interna']])
    const manifesto = JSON.parse(fs.readFileSync(grav.gravarManifesto(), 'utf8')).quadros.filter((q) => q.gatilho === 'troca-de-pagina')
    assert.ok(manifesto.some((q) => q.pagina === 'inicio') && manifesto.some((q) => q.pagina === 'interna-1'), 'faltam quadros de um dos lados da troca')

    // página 200 de desafio: reconhecida, marcada inválida e sem item
    const desafio = r.paginas.find((p) => new URL(p.url).pathname === '/desafio')
    assert.ok(desafio && desafio.valido === false, tudo)

    // o que NÃO foi seguido: está em naoMedido e o registro dos servidores prova
    const motivo = (rota) => (r.naoMedido.find((n) => n.o.endsWith(rota)) || {}).motivo || ''
    assert.match(motivo('/pulo'), /outro site/, tudo)
    assert.match(motivo('/vai-privado'), /robots/, tudo)
    assert.match(motivo('/privado/direto'), /robots.*não cliquei/, tudo)
    assert.match(motivo('/baixa'), /baixar/, tudo)
    assert.match(motivo('/obrigado'), /enviar dados/, tudo)
    // achado 4: redirecionamento de link permitido para rota de ação (GET /conta/logout) é barrado
    assert.match(motivo('/vai-embora'), /login, compra, administração/, tudo)
    // achado 2: SPA que busca conteúdo proibido por código e troca o endereço com pushState
    assert.match(motivo('/spa-um'), /robots/, tudo)
    assert.match(motivo('/spa-dois'), /login, compra, administração/, tudo)
    assert.ok(!r.paginas.some((p) => /spa-/.test(p.url)), 'página de SPA barrada contou: ' + tudo)
    // link do menu para rota proibida (login) aparece em naoMedido com o motivo, sem pesar na cobertura
    const login = r.naoMedido.find((n) => n.o.endsWith('/login'))
    assert.ok(login && /rota proibida/.test(login.motivo) && login.afetaMedida === false, tudo)
    // achado 3: a volta à página inicial também passa pela trava, e o barrado fica anotado
    assert.ok(r.naoMedido.some((n) => n.o.startsWith('volta à página inicial: pedido POST /volta') && n.afetaMedida === false), tudo)
    assert.ok(r.naoMedido.every((n) => n.etapa === 'clique' && n.pagina === 'inicio'))
    assert.equal(r.cobertura.estado, 'parcial')
    assert.deepEqual(registroFora, [], 'o outro site recebeu pedido: ' + registroFora.join(', '))
    for (const proibido of ['GET /privado/segredo', 'GET /privado/direto', 'POST /enviar', 'GET /arquivo.zip', 'GET /login', 'GET /novo', 'GET /solto', 'GET /sobre?ref=1', 'GET /obrigado', 'GET /projetos/dois',
      'GET /conta/logout', 'GET /privado/conteudo', 'GET /api/logout', 'POST /volta'])
      assert.ok(!registro.includes(proibido), `o servidor recebeu ${proibido}`)
    for (const seguido of ['GET /robots.txt', 'GET /projetos/um', 'GET /sobre', 'GET /pulo', 'GET /vai-privado', 'GET /desafio', 'GET /vai-embora']) assert.ok(registro.includes(seguido), `faltou ${seguido} no registro`)
    assert.equal((await nav.rodar('() => location.pathname')), '/', 'não voltou à página inicial')
    assert.ok(!fs.readdirSync(saida).some((n) => /zip/i.test(n)))

    // contraprova: sem a trava, os mesmos caminhos chegam aos servidores (o teste acima falharia sem a proteção)
    await nav.cmd('Page.navigate', { url: base + 'pulo' })
    await new Promise((ok) => setTimeout(ok, 800))
    assert.ok(registroFora.includes('GET /fora'), 'contraprova do redirecionamento para outro site')
    await nav.cmd('Page.navigate', { url: base + 'vai-privado' })
    await new Promise((ok) => setTimeout(ok, 800))
    assert.ok(registro.includes('GET /privado/segredo'), 'contraprova do redirecionamento para rota proibida')
    await nav.cmd('Page.navigate', { url: base })
    await new Promise((ok) => setTimeout(ok, 800))
    await nav.rodar('() => { document.getElementById("envia").click() }')
    await new Promise((ok) => setTimeout(ok, 800))
    assert.ok(registro.includes('POST /enviar'), 'contraprova do envio de formulário')
    assert.ok(registro.includes('POST /volta'), 'contraprova da escrita ao voltar à página inicial')
    await nav.cmd('Page.navigate', { url: base + 'vai-embora' })
    await new Promise((ok) => setTimeout(ok, 800))
    assert.ok(registro.includes('GET /conta/logout'), 'contraprova do redirecionamento para rota de ação: ' + registro.slice(-8).join(', '))
    await nav.rodar('() => fetch("/privado/conteudo").then(() => 1, () => 0)')
    await new Promise((ok) => setTimeout(ok, 300))
    assert.ok(registro.includes('GET /privado/conteudo'), 'contraprova do conteúdo buscado por código')
    await grav.parar()
  } finally {
    try { await nav.fechar() } catch {}
  }
})

test('padrão: no máximo 2 páginas internas', { skip: pular, timeout: 120_000 }, async (t) => {
  const site = await subir((req, res) => {
    res.writeHead(200, { 'Content-Type': req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(req.url === '/robots.txt' ? '' : req.url === '/' ? `<!doctype html><title>Site</title><nav><a href="/a">A</a><a href="/b">B</a><a href="/c">C</a></nav><div style="height:300px;background:#284"></div><p>${'texto da página inicial '.repeat(10)}</p>`
      : `<!doctype html><title>Interna</title><div style="height:400px;background:#a42"></div><p>${'texto da página interna '.repeat(10)}</p>`)
  })
  soltarServidor(t, site)
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-teste-'))
  soltarPasta(t, saida)
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 110_000)
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    for (const source of [quadros.ganchosAntes, ganchosAntes]) await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source })
    const grav = await quadros.gravar(nav, { pasta: path.join(saida, 'quadros') })
    await quadros.capturarCarregar(nav, grav, { url: `http://127.0.0.1:${site.address().port}/`, pagina: 'inicio', duracaoMs: 600 })
    const r = await capturarNavegacao(nav, grav, { pagina: 'inicio' })
    assert.deepEqual(r.paginas.map((p) => new URL(p.url).pathname), ['/a', '/b'])
    assert.equal(r.cobertura.estado, 'completa', JSON.stringify(r.cobertura))
    assert.ok(r.cobertura.limites.startsWith('até 2 páginas internas'))
    assert.equal((await travaDe(nav)).ligada, false, 'chamada sozinha (sem trava ligada antes): a trava volta desligada')
    await grav.parar()
  } finally {
    try { await nav.fechar() } catch {}
  }
})

// Achados P1-a, P1-b e P1-c: o que a trava deixava passar com a navegação proibida. Os servidores CONTAM os pedidos.
test('trava: formulário GET para iframe, iframe novo, código pedindo a outro site e consulta de ação são barrados', { skip: pular, timeout: 120_000 }, async (t) => {
  const registroFora = [], registro = []
  const outro = await subir((req, res) => { registroFora.push(`${req.method} ${req.url}`); res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }); res.end('ok') })
  soltarServidor(t, outro)
  const fora = `http://127.0.0.1:${outro.address().port}/`
  const site = await subir((req, res) => {
    registro.push(`${req.method} ${req.url}`)
    res.writeHead(200, { 'Content-Type': req.url === '/' ? 'text/html; charset=utf-8' : 'text/plain' })
    res.end(req.url === '/' ? '<!doctype html><title>Trava</title><iframe name="alvo" src="about:blank"></iframe><form id="g" method="get" target="alvo" action="/enviar"><input type="hidden" name="a" value="1"></form>' : 'ok')
  })
  soltarServidor(t, site)
  const base = `http://127.0.0.1:${site.address().port}/`
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 110_000)
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  const acoes = (fora) => {
    document.getElementById('g').submit() // formulário GET para o iframe
    const f = document.createElement('iframe'); f.src = '/quadro-novo'; document.body.appendChild(f) // iframe novo
    fetch(fora + 'api').catch(() => {}) // código pedindo a outro site
    const img = new Image(); img.src = fora + 'foto.png'; document.body.appendChild(img) // imagem de outro endereço (CDN): passa
    fetch('/conteudo').catch(() => {}) // conteúdo do mesmo site: passa
    fetch('/conta?acao=logout').catch(() => {}) // consulta de ação
    return 1
  }
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Page.navigate', { url: base })
    await pausa(800)
    // o robots.txt do outro site proíbe tudo (leitura por código a outro site só passa com o robots dele)
    const permitido = async (u) => !u.startsWith(fora)
    const barrados = await comTrava(nav, { origem: base, permitido, navegar: false }, async (T) => {
      await nav.rodar(acoes, fora)
      await pausa(1000)
      return [...T.barrados]
    })
    const tudo = JSON.stringify({ barrados, registro, registroFora })
    for (const proibido of ['GET /enviar?a=1', 'GET /quadro-novo', 'GET /conta?acao=logout']) assert.ok(!registro.includes(proibido), `o site recebeu ${proibido}: ${tudo}`)
    assert.ok(!registroFora.includes('GET /api'), 'o outro site recebeu o pedido por código: ' + tudo)
    assert.ok(registroFora.includes('GET /foto.png'), 'a imagem de outro endereço deveria passar: ' + tudo)
    assert.ok(registro.includes('GET /conteudo'), 'o conteúdo do mesmo site deveria passar: ' + tudo)
    assert.equal(barrados.filter((b) => b.tipo === 'quadro').length, 2, tudo)
    const nao = barradosParaNaoMedido(barrados, { pagina: 'inicio', etapa: 'clique', onde: 'menu' })
    assert.ok(nao.some((n) => n.barrado === 'quadro' && n.afetaMedida === true && /quadro interno/.test(n.motivo)), JSON.stringify(nao))
    assert.ok(nao.some((n) => n.barrado === 'robots' && n.afetaMedida === false && n.o === 'menu: pedido GET /api'), JSON.stringify(nao))
    assert.ok(nao.some((n) => n.barrado === 'rota' && n.o === 'menu: pedido GET /conta?…'), JSON.stringify(nao))

    // na troca de página (navegação liberada) o código também não pede a outro site
    await comTrava(nav, { origem: base, permitido, navegar: true }, async () => {
      await nav.rodar((fora) => { fetch(fora + 'api-troca').catch(() => {}); return 1 }, fora)
      await pausa(800)
    })
    assert.ok(!registroFora.includes('GET /api-troca'), 'o outro site recebeu pedido durante a troca: ' + registroFora.join(', '))

    // contraprova: sem a trava, os mesmos pedidos chegam aos servidores
    await nav.rodar(acoes, fora)
    await pausa(1000)
    for (const chegou of ['GET /enviar?a=1', 'GET /quadro-novo', 'GET /conta?acao=logout']) assert.ok(registro.includes(chegou), 'contraprova: ' + chegou)
    assert.ok(registroFora.includes('GET /api'), 'contraprova do pedido a outro site')
  } finally {
    try { await nav.fechar() } catch {}
  }
})

// Lote de 12/11: leitura (GET/HEAD) por código a outro site passa se o robots.txt DAQUELE site deixa e o endereço não é
// de ação (cena do Unicorn Studio, arquivo Lottie: são o movimento a medir). Escrita, rota de ação e robots que proíbe
// (ou que bloqueia robôs com 403) seguem barrados, só anotados. Os servidores B e C CONTAM por caminho.
test('trava: leitura por código a outro site passa só com o robots daquele site; escrita e rota de ação não', { skip: pular, timeout: 120_000 }, async (t) => {
  const texto = (res, s, corpo) => { res.writeHead(s, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }); res.end(corpo) }
  const B = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? texto(res, 200, 'User-agent: *\nDisallow: /proibido\n') : texto(res, 200, 'ok')))
  const C = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? texto(res, 403, 'não') : texto(res, 200, 'ok')))
  const site = await subir((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<!doctype html><title>Leitura</title><p>ok</p>') })
  soltarServidor(t, site)
  const base = `http://127.0.0.1:${site.address().port}/`
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 110_000)
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Page.navigate', { url: base })
    await pausa(800)
    const barrados = await comTrava(nav, { origem: base, permitido: criarRobots(), navegar: false }, async (T) => {
      await nav.rodar(([b, c]) => {
        fetch(b + 'cena.json').catch(() => {})
        const x = new XMLHttpRequest(); x.open('GET', b + 'anim-lottie.json'); x.send()
        fetch(b + 'proibido/cena.json').catch(() => {})
        fetch(b + 'conta/logout').catch(() => {})
        fetch(b + '%6Cogout').catch(() => {})
        fetch(b + 'grava', { method: 'POST', body: 'x' }).catch(() => {})
        fetch(c + 'cena.json').catch(() => {})
        return 1
      }, [B.fora, C.fora])
      await pausa(1500)
      return [...T.barrados]
    })
    const tudo = JSON.stringify({ barrados, B: B.registro, C: C.registro })
    assert.ok(B.registro.includes('GET /robots.txt'), 'o robots.txt de B não foi lido (o teste não prova nada): ' + tudo)
    assert.ok(B.registro.includes('GET /cena.json') && B.registro.includes('GET /anim-lottie.json'), 'a leitura liberada pelo robots de B não chegou: ' + tudo)
    for (const c of ['/proibido/cena.json', '/conta/logout', '/%6Cogout', '/grava']) assert.ok(!B.registro.some((r) => r.endsWith(' ' + c)), `B recebeu ${c}: ` + tudo)
    assert.deepEqual(C.registro.filter((r) => r !== 'GET /robots.txt'), [], 'C bloqueia robôs (403) e recebeu pedido: ' + tudo)
    for (const [tipo, n] of [['robots', 2], ['rota', 2], ['escrita', 1]]) assert.equal(barrados.filter((b) => b.tipo === tipo).length, n, `${tipo}: ${tudo}`)
    assert.ok(barrados.every((b) => !b.documento && !b.conteudo), 'pedido a outro site não invalida a medida: ' + tudo)
    const nao = barradosParaNaoMedido(barrados, { pagina: 'inicio', etapa: 'clique', onde: 'menu' })
    assert.ok(nao.every((n) => n.afetaMedida === false), JSON.stringify(nao))
  } finally {
    try { await nav.fechar() } catch {}
  }
})

// tirarDoAr que devolve false (a página não saiu) não pode passar calado: aviso no stderr e nos avisos da saída.
test('fechamento: tirarDoAr com false vira aviso (stderr e avisos do raio-x)', async () => {
  const M = await import(pathToFileURL(path.join(pastaScripts, 'movimento.mjs')).href)
  const err = [], orig = console.error
  console.error = (...a) => err.push(a.join(' '))
  let r
  try {
    r = M.travaDoRaioX({ permitido: async () => true, tirarDoAr: async () => false })
    await r.antesDeFechar({})
  } finally { console.error = orig }
  assert.ok(r.avisos.some((a) => a.includes(M.AVISO_NAO_SAIU)), JSON.stringify(r.avisos))
  assert.ok(err.some((a) => a.includes(M.AVISO_NAO_SAIU)), JSON.stringify(err))
  const ok = M.travaDoRaioX({ permitido: async () => true, tirarDoAr: async () => true })
  await ok.antesDeFechar({})
  assert.deepEqual(ok.avisos, [])
})

// RFC 9309 na leitura por código a OUTRO site: robots.txt dele com 5xx (D) ou inalcançável, conexão derrubada (E) =
// proibido (barrado 'robots', só anotado); robots 404 (F) = sem regra, a leitura chega. Os servidores CONTAM.
test('trava: outro site com robots.txt fora do ar (5xx, conexão derrubada) não recebe leitura; robots 404 sim', { skip: pular, timeout: 120_000 }, async (t) => {
  const texto = (res, s, corpo) => { res.writeHead(s, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }); res.end(corpo) }
  const D = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? texto(res, 500, 'erro') : texto(res, 200, 'ok')))
  const E = await subirOutroSite(t, (req) => req.socket.destroy())
  const F = await subirOutroSite(t, (req, res) => (req.url === '/robots.txt' ? texto(res, 404, 'não há') : texto(res, 200, 'ok')))
  const site = await subir((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<!doctype html><title>Leitura</title><p>ok</p>') })
  soltarServidor(t, site)
  const base = `http://127.0.0.1:${site.address().port}/`
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 110_000)
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Page.navigate', { url: base })
    await pausa(800)
    const barrados = await comTrava(nav, { origem: base, permitido: criarRobots(), navegar: false }, async (T) => {
      await nav.rodar(([d, e, f]) => { for (const x of [d, e, f]) fetch(x + 'cena.json').catch(() => {}); return 1 }, [D.fora, E.fora, F.fora])
      await pausa(1500)
      return [...T.barrados]
    })
    const tudo = JSON.stringify({ barrados, D: D.registro, E: E.registro, F: F.registro })
    for (const S of [D, E, F]) assert.ok(S.registro.includes('GET /robots.txt'), 'robots.txt não lido (o teste não prova nada): ' + tudo)
    assert.deepEqual(D.registro.filter((r) => r !== 'GET /robots.txt'), [], 'robots com 500 e a leitura chegou: ' + tudo)
    assert.deepEqual(E.registro.filter((r) => r !== 'GET /robots.txt'), [], 'robots inalcançável e a leitura chegou: ' + tudo)
    assert.ok(F.registro.includes('GET /cena.json'), 'robots 404 é sem regra e a leitura não chegou: ' + tudo)
    assert.equal(barrados.filter((b) => b.tipo === 'robots').length, 2, tudo)
    assert.ok(barrados.every((b) => !b.documento && !b.conteudo), 'pedido a outro site não invalida a medida: ' + tudo)
  } finally {
    try { await nav.fechar() } catch {}
  }
  // o próprio site segue como era: robots fora do ar = sem regra
  const r = criarRobots({ buscar: async () => { throw new Error('rede') } })
  assert.equal(await r('http://x.test/a'), true)
  assert.equal(await r.estrito('http://x.test/a'), false)
})

// Achado 1 (resto): a trava não pode ter intervalo com a página viva. A página inicial manda POST a cada 20 ms; o
// servidor CONTA. Quem chama a troca de página com a trava ligada (movimento.mjs) a recebe de volta ligada, e no fim a
// página sai do ar antes de o navegador fechar.
test('trava sem intervalo: a troca de página devolve a trava ligada a quem já a tinha, e tirarDoAr esvazia a página antes de fechar', { skip: pular, timeout: 120_000 }, async (t) => {
  let posts = 0
  const site = await subir((req, res) => {
    if (req.method === 'POST') posts++
    res.writeHead(200, { 'Content-Type': req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(req.url === '/robots.txt' ? '' : req.url === '/' ? `<!doctype html><title>Site</title><nav><a href="/a">A</a></nav><div style="height:300px;background:#284"></div><p>${'texto da página inicial '.repeat(10)}</p>
<script>setInterval(() => { fetch('/grava', { method: 'POST', body: 'x' }).catch(() => {}) }, 20)</script>`
      : `<!doctype html><title>Interna</title><div style="height:400px;background:#a42"></div><p>${'texto da página interna '.repeat(10)}</p>`)
  })
  soltarServidor(t, site)
  const base = `http://127.0.0.1:${site.address().port}/`
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-teste-'))
  soltarPasta(t, saida)
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  const permitido = async () => true
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 110_000)
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    for (const source of [quadros.ganchosAntes, ganchosAntes]) await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source })
    const grav = await quadros.gravar(nav, { pasta: path.join(saida, 'quadros') })
    const T = await travaDe(nav)
    await T.ligar({ origem: base, permitido, navegar: true })
    await quadros.capturarCarregar(nav, grav, { url: base, pagina: 'inicio', duracaoMs: 600 })
    T.navegar = false
    const r = await capturarNavegacao(nav, grav, { pagina: 'inicio', maxPaginas: 1, permitido })
    assert.equal(T.ligada, true, 'a troca de página desligou a trava de quem já a tinha ligada')
    assert.equal(T.navegar, false)
    assert.deepEqual(r.paginas.map((p) => new URL(p.url).pathname), ['/a'])
    await pausa(400) // o tempo de quem chamou até religar: com a trava desligada, a página mandaria uns 20 POST aqui
    assert.equal(posts, 0, 'POST chegou ao servidor depois da troca de página')
    assert.ok(T.barrados.some((b) => b.tipo === 'escrita'), 'a página deveria ter tentado escrever (senão o teste não prova nada)')
    await grav.parar()
    assert.equal(await tirarDoAr(nav), true)
    assert.equal(await nav.rodar(() => location.href), 'about:blank')
    assert.equal(T.ligada, true, 'tirarDoAr não desliga a trava: ela acaba com o navegador')
  } finally {
    try { await nav.fechar() } catch {}
  }
  await pausa(400)
  assert.equal(posts, 0, 'POST chegou ao servidor no fechamento')
})

// Lote de 12/11: diálogo da página (beforeunload que pede confirmação, alert num temporizador) não pode prender o
// tirarDoAr. Com o diálogo aberto o Page.navigate não responde e a página ficava viva até o navegador morrer.
test('tirarDoAr sai mesmo com diálogo da página (beforeunload e alert) e nada sai depois', { skip: pular, timeout: 120_000 }, async (t) => {
  // Cada /ping leva a hora em que a página o mandou (mesmo relógio do sistema que o Node usa).
  let pings = 0
  const horas = []
  const pagina = (extra) => `<!doctype html><title>Diálogo</title><div style="height:400px;background:#284"></div><script>setInterval(() => { fetch('/ping?t=' + Date.now()).catch(() => {}) }, 30);${extra}</script>`
  const site = await subir((req, res) => {
    if (req.url.startsWith('/ping')) { pings++; horas.push(+new URL(req.url, 'http://x').searchParams.get('t')); res.writeHead(204); return res.end() }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(req.url === '/saida' ? pagina(`addEventListener('beforeunload', (e) => { e.preventDefault(); e.returnValue = 'fica' })`) : pagina(`setTimeout(() => alert('oi'), 300)`))
  })
  soltarServidor(t, site)
  const base = `http://127.0.0.1:${site.address().port}/`
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  for (const caminho of ['saida', 'alerta']) {
    const nav = await abrirNavegador(navegador)
    vigiar(t, nav, 110_000)
    try {
      await nav.cmd('Page.enable')
      await nav.cmd('Page.navigate', { url: base + caminho })
      await pausa(800)
      // gesto do usuário (sem ele o Chrome não mostra o diálogo do beforeunload)
      for (const type of ['mousePressed', 'mouseReleased']) await nav.cmd('Input.dispatchMouseEvent', { type, x: 50, y: 50, button: 'left', clickCount: 1 })
      await pausa(300)
      assert.ok(pings > 0, 'a página deveria estar pedindo (senão o teste não prova nada)')
      const t0 = Date.now()
      assert.equal(await tirarDoAr(nav), true, `${caminho}: tirarDoAr não saiu (${Date.now() - t0} ms)`)
      const tFim = Date.now()
      // Medido 12/11 (alert, 1 em ~15 rodadas): o /ping a mais saiu da página 6 ms ANTES de ela sair (pagehide a -5 ms
      // do retorno do tirarDoAr) e chegou 3 ms DEPOIS do retorno: estava a caminho. Contar logo no retorno pegava
      // isso como vazamento. Agora: espera a rede assentar (200 ms sem chegada), fotografa, e nada mais pode chegar;
      // e nenhum pedido pode ter saído da página depois de o tirarDoAr devolver (isso sim seria vazamento).
      for (let ultimo = pings, quieto = 0; quieto < 200 && Date.now() - tFim < 3000; ) {
        await pausa(50)
        if (pings === ultimo) quieto += 50; else { ultimo = pings; quieto = 0 }
      }
      const antes = pings
      await pausa(500)
      assert.equal(pings, antes, `${caminho}: pedido chegou depois de a rede assentar`)
      const tarde = horas.filter((h) => h > tFim)
      assert.deepEqual(tarde.map((h) => h - tFim), [], `${caminho}: a página mandou pedido depois do tirarDoAr (ms depois do retorno)`)
    } finally {
      try { await nav.fechar() } catch {}
    }
  }
})

// Auditoria (furos de 12/11): o "outro site" atende em 127.0.0.1 e é chamado por localhost (para o Chrome e para
// mesmoSite é outro site; o Chrome o põe em processo separado). O servidor B CONTA os pedidos: tem de ficar em 0.
const subirOutroSite = async (t, rotas) => {
  const registro = []
  const s = await subir((req, res) => { registro.push(`${req.method} ${req.url}`); rotas(req, res) })
  soltarServidor(t, s)
  return { registro, fora: `http://localhost:${s.address().port}/` }
}

// Furo 2: iframe de outro site já no HTML do load (e o que chega por redirecionamento, e o que entra depois, como
// iframe "lazy" de mapa ou vídeo). Nada dele sai; fica só anotado, sem invalidar a medida. Iframe do mesmo site abre.
test('auditoria: iframe de outro site não pede nada (nem por redirecionamento) e não invalida a medida', { skip: pular, timeout: 120_000 }, async (t) => {
  const B = await subirOutroSite(t, (req, res) => {
    res.writeHead(200, { 'Content-Type': req.url.startsWith('/quadro') ? 'text/html; charset=utf-8' : 'text/plain', 'Access-Control-Allow-Origin': '*' })
    res.end(req.url.startsWith('/quadro') ? `<!doctype html><title>Quadro</title><img src="/foto.png">
<script>fetch('/le-agora').catch(() => {}); setInterval(() => { fetch('/le').catch(() => {}); fetch('/escreve', { method: 'POST', body: 'x' }).catch(() => {}) }, 4)</script>` : 'ok')
  })
  const registro = []
  const site = await subir((req, res) => {
    registro.push(`${req.method} ${req.url}`)
    if (req.url === '/vai') { res.writeHead(302, { Location: B.fora + 'quadro-redir' }); return res.end() }
    res.writeHead(200, { 'Content-Type': req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(req.url === '/' ? `<!doctype html><title>Mapa</title><p>${'texto da página '.repeat(10)}</p>
<iframe src="${B.fora}quadro"></iframe><iframe src="/vai"></iframe><iframe src="/mesmo"></iframe><iframe src="data:text/html,<p>dados</p>"></iframe>`
      : req.url === '/mesmo' ? '<!doctype html><title>Mesmo</title><p>quadro do mesmo site</p>' : '')
  })
  soltarServidor(t, site)
  const base = `http://127.0.0.1:${site.address().port}/`
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  const permitido = async () => true
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 110_000)
  let barrados = []
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source: ganchosAntes })
    const T = await travaDe(nav)
    await T.ligar({ origem: base, permitido, navegar: true }) // como o movimento.mjs: trava ligada ANTES de abrir
    await nav.cmd('Page.navigate', { url: base })
    await pausa(1500)
    T.navegar = false // depois do load: iframe que entra agora (lazy) também não sai
    await nav.rodar((fora) => { const f = document.createElement('iframe'); f.src = fora + 'quadro-tarde'; document.body.appendChild(f); return 1 }, B.fora)
    await pausa(800)
    barrados = [...T.barrados]
    assert.equal(await tirarDoAr(nav), true)
  } finally {
    try { await nav.fechar() } catch {}
  }
  await pausa(400) // DEV-96: o que vazaria no fechamento chega aqui
  const tudo = JSON.stringify({ barrados, registro, registroB: B.registro })
  assert.deepEqual(B.registro, [], 'o outro site recebeu pedido de dentro do iframe: ' + tudo)
  assert.ok(registro.includes('GET /mesmo'), 'o iframe do mesmo site deveria abrir: ' + tudo)
  const deFora = barrados.filter((b) => b.tipo === 'quadro-outro-site').map((b) => new URL(b.url).pathname).sort()
  assert.deepEqual(deFora, ['/quadro', '/quadro-redir', '/quadro-tarde'], 'cada iframe de outro site fica anotado (prova de que o teste disparou): ' + tudo)
  const nao = barradosParaNaoMedido(barrados, { pagina: 'inicio', etapa: 'carregar', onde: 'pagina' })
  assert.ok(nao.length && nao.every((n) => n.afetaMedida === false), 'iframe de outro site não invalida a medida: ' + JSON.stringify(nao))
  assert.ok(nao.every((n) => n.barrado !== 'quadro-outro-site' || /quadro interno de outro site/.test(n.motivo)), JSON.stringify(nao))
})

// Furo 1: clique de verdade (protocolo, não o filtro do movimento-interacao) que abriria aba ou janela nova: link
// _blank, clique do meio num link comum, formulário _blank, a.click() dentro do botão, window.open e link _blank
// dentro de um iframe do mesmo site (o filtro de clique vê o <iframe>, não o link). Nenhum pedido chega a B.
test('auditoria: aba nova não sai (link _blank, clique do meio, formulário _blank, a.click(), window.open, link _blank em iframe)', { skip: pular, timeout: 120_000 }, async (t) => {
  const B = await subirOutroSite(t, (req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<!doctype html><title>B</title><script>setInterval(() => { fetch("/escreve", { method: "POST", body: "x" }).catch(() => {}) }, 4)</script>') })
  const registro = []
  const caixa = (top) => `position:absolute;left:0;top:${top}px;width:300px;height:60px;display:block;margin:0;padding:0;border:0`
  const site = await subir((req, res) => {
    registro.push(`${req.method} ${req.url}`)
    res.writeHead(200, { 'Content-Type': req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(req.url === '/' ? `<!doctype html><title>Abas</title><style>body{margin:0}</style>
<a style="${caixa(0)}" target="_blank" href="${B.fora}aba-link">link</a>
<a style="${caixa(80)}" href="${B.fora}aba-meio">meio</a>
<form target="_blank" method="get" action="${B.fora}aba-form"><button style="${caixa(160)}">enviar</button></form>
<button style="${caixa(240)}" onclick="const a = document.createElement('a'); a.href = '${B.fora}aba-js'; a.target = '_blank'; document.body.appendChild(a); a.click()">js</button>
<button style="${caixa(320)}" onclick="window.open('${B.fora}aba-open')">open</button>
<iframe style="${caixa(400)};height:100px" src="/dentro"></iframe>
<a id="s1" href="${B.fora}aba-sint-ctrl"></a><a id="s2" href="${B.fora}aba-sint-meio"></a>
<button style="${caixa(520)}" onclick="document.getElementById('s1').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))">ctrl sintético</button>
<button style="${caixa(600)}" onclick="document.getElementById('s2').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 }))">meio sintético</button>
<a style="${caixa(680)}" href="${B.fora}aba-ctrl">ctrl + clique</a>
<script>window.__cliques = 0; for (const ev of ['click', 'auxclick']) addEventListener(ev, (e) => { if (!e.defaultPrevented) window.__cliques++ })</script>`
      : req.url === '/dentro' ? `<!doctype html><style>body{margin:0}</style><a style="display:block;width:300px;height:100px" target="_blank" href="${B.fora}aba-quadro">dentro</a>` : '')
  })
  soltarServidor(t, site)
  const base = `http://127.0.0.1:${site.address().port}/`
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  const permitido = async () => true
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 110_000)
  const janelas = []
  nav.ouvir('Page.windowOpen', (p) => janelas.push(p.url))
  let barrados = [], cliques = 0, onde = ''
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Emulation.setDeviceMetricsOverride', { width: 800, height: 800, deviceScaleFactor: 1, mobile: false })
    await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source: ganchosAntes })
    const T = await travaDe(nav)
    await T.ligar({ origem: base, permitido, navegar: true })
    await nav.cmd('Page.navigate', { url: base })
    await pausa(1500)
    T.navegar = false // interação: como o travado() do movimento-interacao
    for (const [y, button, modifiers = 0] of [[30, 'left'], [110, 'middle'], [190, 'left'], [270, 'left'], [350, 'left'], [450, 'left'], [550, 'left'], [630, 'left'], [710, 'left', 2]]) {
      await nav.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 100, y })
      await nav.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: 100, y, button, clickCount: 1, modifiers })
      await nav.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 100, y, button, clickCount: 1, modifiers })
      await pausa(150)
    }
    await pausa(1000)
    cliques = await nav.rodar(() => window.__cliques)
    onde = await nav.rodar(() => location.href)
    barrados = [...T.barrados]
    assert.equal(await tirarDoAr(nav), true)
  } finally {
    try { await nav.fechar() } catch {}
  }
  await pausa(400)
  const tudo = JSON.stringify({ barrados, janelas, cliques, registro, registroB: B.registro })
  assert.ok(cliques >= 5, 'os cliques deveriam chegar à página sem preventDefault (senão o teste não prova nada): ' + tudo)
  assert.equal(onde, base, 'a página medida não pode ter saído do lugar')
  assert.deepEqual(B.registro, [], 'aba ou janela nova pediu ao outro site: ' + tudo)
  const nao = barradosParaNaoMedido(barrados, { pagina: 'inicio', etapa: 'clique', onde: 'botão' })
  assert.ok(nao.some((n) => n.barrado === 'janela' && n.afetaMedida === false && /aba ou janela nova/.test(n.motivo)), 'a tentativa de aba nova fica anotada, sem invalidar: ' + JSON.stringify(nao))
})

// Auditoria (revisão de 12/11: "nenhuma escrita" não vale com WebSocket liberado nem service worker sem cobertura).
// Servidor que conta também o pedido de Upgrade (WebSocket): o Node não chama o 'request' para ele.
const subirContando = async (t, rotas) => {
  const registro = []
  const s = await subir((req, res) => { registro.push(`${req.method} ${req.url}`); rotas(req, res) })
  s.on('upgrade', (req, sock) => { registro.push(`UPGRADE ${req.url}`); sock.destroy() })
  soltarServidor(t, s)
  return { registro, porta: s.address().port }
}
// Abre a página com a trava como o movimento.mjs (ligada antes de abrir; depois do load, nada navega) e espera.
const comTravaNaPagina = async (t, base, { permitido = async () => true, esperaMs = 2500 } = {}) => {
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms))
  const nav = await abrirNavegador(navegador)
  vigiar(t, nav, 110_000)
  let barrados = [], estado = null
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source: ganchosAntes })
    const T = await travaDe(nav)
    await T.ligar({ origem: base, permitido, navegar: true })
    await nav.cmd('Page.navigate', { url: base })
    await pausa(1500)
    T.navegar = false
    await pausa(esperaMs)
    estado = await nav.rodar(() => window.__estado || null).catch((e) => 'erro: ' + e.message)
    barrados = [...T.barrados]
    assert.equal(await tirarDoAr(nav), true)
  } finally {
    try { await nav.fechar() } catch {}
  }
  await pausa(400) // DEV-96: o que vazaria no fechamento chega aqui
  return { barrados, estado }
}

test('auditoria: WebSocket (página, iframe novo), WebTransport e sendBeacon não chegam a servidor nenhum', { skip: pular, timeout: 120_000 }, async (t) => {
  const B = await subirContando(t, (req, res) => { res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end('ok') })
  const udp = dgram.createSocket('udp4')
  const pacotes = []
  udp.on('message', (m) => pacotes.push(m.length))
  await new Promise((ok) => udp.bind(0, '127.0.0.1', ok))
  t.after(() => { try { udp.close() } catch {} })
  const pu = udp.address().port
  const A = await subirContando(t, (req, res) => {
    res.writeHead(200, { 'Content-Type': req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(req.url === '/' ? `<!doctype html><title>Canais</title><p>${'texto '.repeat(20)}</p><script>
window.__estado = { ws: 0, wt: typeof WebTransport, beacon: [] }
const abrir = (W, u) => { try { const s = new W(u); s.onerror = () => {}; window.__estado.ws++ } catch (e) { window.__estado.erro = String(e) } }
const f = document.createElement('iframe'); document.body.appendChild(f) // iframe about:blank novo: outro WebSocket
setInterval(() => {
  abrir(WebSocket, 'ws://' + location.host + '/ws-mesmo')
  abrir(WebSocket, 'ws://localhost:${B.porta}/ws-fora')
  try { abrir(f.contentWindow.WebSocket, 'ws://localhost:${B.porta}/ws-iframe') } catch {}
  try { window.__estado.beacon.push(navigator.sendBeacon('http://localhost:${B.porta}/beacon', 'x')) } catch {}
  try { if (window.WebTransport) new WebTransport('https://127.0.0.1:${pu}/wt').ready.catch(() => {}) } catch {}
}, 60)
</script>` : '')
  })
  const base = `http://127.0.0.1:${A.porta}/`
  const { barrados, estado } = await comTravaNaPagina(t, base)
  const tudo = JSON.stringify({ estado, barrados: barrados.map((b) => `${b.tipo} ${b.metodo} ${b.url}`), registroA: A.registro, registroB: B.registro, udp: pacotes.length })
  // Antes do conserto (12/11, Chrome 157): UPGRADE em A e em B (também do iframe novo) e 44 pacotes UDP do WebTransport;
  // o sendBeacon já era barrado como escrita.
  const ws = barrados.filter((b) => b.tipo === 'websocket').map((b) => new URL(b.url).pathname)
  assert.ok(['/ws-mesmo', '/ws-fora', '/ws-iframe'].every((c) => ws.includes(c)), 'cada WebSocket tentado (página e iframe novo) fica anotado (prova de que o teste disparou): ' + tudo)
  assert.ok(barrados.some((b) => b.tipo === 'escrita' && b.url.endsWith('/beacon')), 'o sendBeacon é barrado como escrita: ' + tudo)
  assert.deepEqual(B.registro, [], 'o outro site recebeu pedido (WebSocket ou beacon): ' + tudo)
  assert.deepEqual(A.registro.filter((r) => !/^GET \/(robots\.txt|favicon\.ico)?$/.test(r)), [], 'o próprio site recebeu WebSocket ou escrita: ' + tudo)
  assert.equal(pacotes.length, 0, 'WebTransport mandou pacote UDP: ' + tudo)
  const nao = barradosParaNaoMedido(barrados, { pagina: 'inicio', etapa: 'carregar', onde: 'pagina' })
  assert.ok(nao.some((n) => n.barrado === 'websocket' && n.afetaMedida === false && !/barrado pela trava$/.test(n.motivo)), 'o WebSocket barrado fica anotado, sem invalidar: ' + tudo)
})

test('auditoria: service worker não nasce (nada sai dele sozinho nem pelo fetch da página)', { skip: pular, timeout: 120_000 }, async (t) => {
  const B = await subirContando(t, (req, res) => { res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end('ok') })
  const fora = `http://localhost:${B.porta}/`
  const A = await subirContando(t, (req, res) => {
    const sw = req.url === '/sw.js'
    res.writeHead(200, { 'Content-Type': sw ? 'text/javascript' : req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(sw ? `const sai = (q) => { fetch('${fora}sw-post-' + q, { method: 'POST', body: 'x', mode: 'no-cors' }).catch(() => {}); fetch('${fora}sw-get-' + q, { mode: 'no-cors' }).catch(() => {}); fetch('/sw-post-mesmo-' + q, { method: 'POST', body: 'x' }).catch(() => {}) }
self.addEventListener('install', (e) => { sai('install'); self.skipWaiting() })
self.addEventListener('activate', (e) => { sai('activate'); e.waitUntil(clients.claim()) })
setInterval(() => sai('tempo'), 50)
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)))`
      : req.url === '/' ? `<!doctype html><title>SW</title><p>${'texto '.repeat(20)}</p><script>
window.__estado = { reg: 'esperando', controle: false }
if (!navigator.serviceWorker) window.__estado.reg = 'sem serviceWorker'
else navigator.serviceWorker.register('/sw.js').then(() => { window.__estado.reg = 'registrado' }, (e) => { window.__estado.reg = 'recusado: ' + e.message })
setInterval(() => { window.__estado.controle = !!navigator.serviceWorker?.controller; fetch('/pag-post', { method: 'POST', body: 'x' }).catch(() => {}) }, 100)
</script>` : '')
  })
  const base = `http://127.0.0.1:${A.porta}/`
  const { barrados, estado } = await comTravaNaPagina(t, base, { permitido: async (u) => !u.includes('localhost'), esperaMs: 3000 })
  const tudo = JSON.stringify({ estado, barrados: barrados.map((b) => `${b.tipo} ${b.metodo} ${b.url}`), registroA: A.registro, registroB: B.registro })
  // Antes do conserto (sonda de 12/11): o service worker registrava, mandava POST e GET a B no install, no activate e
  // por temporizador (43 de cada em 3,5 s). Depois: fechado sem rodar; o register() fica sem resposta.
  assert.ok(estado && estado.reg !== 'sem serviceWorker', 'a página deveria ter service worker para tentar: ' + tudo)
  assert.deepEqual(B.registro, [], 'o outro site recebeu pedido do service worker: ' + tudo)
  // O GET do script (/sw.js) ao próprio site é limite aceito e depende de corrida: o navegador pode baixar o script
  // antes de o alvo ser fechado (sob carga, baixa). O que não pode é ele RODAR: pedido dele a B, escrita ao próprio
  // site (/sw-post-mesmo-*, /pag-post) ou controle da página.
  assert.deepEqual(A.registro.filter((r) => !/^GET \/(robots\.txt|favicon\.ico|sw\.js)?$/.test(r)), [], 'o próprio site recebeu pedido do service worker ou escrita: ' + tudo)
  assert.equal(estado.controle, false, 'nenhum service worker pode controlar a página: ' + tudo)
  const nao = barradosParaNaoMedido(barrados, { pagina: 'inicio', etapa: 'carregar', onde: 'pagina' })
  assert.ok(nao.some((n) => n.barrado === 'service-worker' && n.afetaMedida === false && !/barrado pela trava$/.test(n.motivo)), 'o service worker barrado fica anotado, sem invalidar: ' + tudo)
})

test('auditoria: worker dedicado e compartilhado seguem a trava (escrita, outro site sem robots, WebSocket)', { skip: pular, timeout: 120_000 }, async (t) => {
  const B = await subirContando(t, (req, res) => { res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end('ok') })
  const corpo = (q) => `setInterval(() => {
  fetch('/${q}-post', { method: 'POST', body: 'x' }).catch(() => {})
  fetch('http://localhost:${B.porta}/${q}-get').catch(() => {})
  fetch('/${q}-le').catch(() => {})
  try { const s = new WebSocket('ws://localhost:${B.porta}/${q}-ws'); s.onerror = () => {} } catch {}
  try { const s = new WebSocket('ws://' + location.host + '/${q}-ws-mesmo'); s.onerror = () => {} } catch {}
}, 50)`
  const A = await subirContando(t, (req, res) => {
    const js = /^\/(w|shw)\.js$/.test(req.url)
    res.writeHead(200, { 'Content-Type': js ? 'text/javascript' : req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(req.url === '/w.js' ? corpo('w') : req.url === '/shw.js' ? corpo('shw') : req.url === '/' ? `<!doctype html><title>Workers</title><p>${'texto '.repeat(20)}</p><script>
window.__estado = {}
try { new Worker('/w.js'); window.__estado.w = 'ok' } catch (e) { window.__estado.w = String(e) }
try { if (window.SharedWorker) { new SharedWorker('/shw.js'); window.__estado.shw = 'ok' } } catch (e) { window.__estado.shw = String(e) }
</script>` : req.url.endsWith('-le') ? 'lido' : '')
  })
  const base = `http://127.0.0.1:${A.porta}/`
  const { barrados, estado } = await comTravaNaPagina(t, base, { permitido: async (u) => !u.includes('localhost') })
  const tudo = JSON.stringify({ estado, barrados: barrados.map((b) => `${b.tipo} ${b.metodo} ${b.url}`), registroA: A.registro, registroB: B.registro })
  assert.ok(A.registro.some((r) => r === 'GET /w-le'), 'o worker dedicado deveria rodar e ler do próprio site (senão o teste não prova nada): ' + tudo)
  // Antes do conserto: o fetch do worker dedicado JÁ passava pela trava da página (POST e GET sem robots barrados), mas
  // o WebSocket dele saía; o worker compartilhado passava inteiro (POST, leitura e WebSocket). Depois: o dedicado roda
  // com o gancho dos canais e o compartilhado é fechado sem rodar.
  assert.ok(barrados.some((b) => b.tipo === 'escrita' && b.url.endsWith('/w-post')) && barrados.some((b) => b.tipo === 'robots' && b.url.endsWith('/w-get')), 'o fetch do worker dedicado passa pela trava da página: ' + tudo)
  assert.ok(barrados.some((b) => b.tipo === 'websocket' && b.url.endsWith('/w-ws')), 'o WebSocket do worker fica anotado: ' + tudo)
  assert.ok(barrados.some((b) => b.tipo === 'service-worker' && b.recurso === 'shared_worker'), 'o worker compartilhado fica anotado: ' + tudo)
  assert.deepEqual(B.registro, [], 'o outro site recebeu pedido de worker: ' + tudo)
  assert.deepEqual(A.registro.filter((r) => /POST|UPGRADE|shw-/.test(r)), [], 'o próprio site recebeu escrita, WebSocket ou pedido do worker compartilhado: ' + tudo)
})

// Escuta UDP local: conta o que o WebTransport mandaria (QUIC).
const escutaUdp = async (t) => {
  const udp = dgram.createSocket('udp4')
  const pacotes = []
  udp.on('message', (m) => pacotes.push(m.length))
  await new Promise((ok) => udp.bind(0, '127.0.0.1', ok))
  t.after(() => { try { udp.close() } catch {} })
  return { pacotes, porta: udp.address().port }
}

// Gancho inerte (12/11): o construtor barrado não pode lançar, senão derruba o script do site (que também inicia as
// animações) e a medida sai errada sem aviso. Script no topo, sem try: o marcador depois dele prova que seguiu.
test('auditoria: canal barrado é inerte (o script do site segue; conexão que falhou; nada sai)', { skip: pular, timeout: 120_000 }, async (t) => {
  const B = await subirContando(t, (req, res) => { res.writeHead(200); res.end('ok') })
  const { pacotes, porta: pu } = await escutaUdp(t)
  const A = await subirContando(t, (req, res) => {
    res.writeHead(200, { 'Content-Type': req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(req.url === '/' ? `<!doctype html><title>Inerte</title><p>${'texto '.repeat(20)}</p><script>
window.__estado = { eventos: [], temWss: typeof WebSocketStream === 'function', temWt: typeof WebTransport === 'function' }
const s = new WebSocket('ws://localhost:${B.porta}/ws-topo')
window.__estado.inicial = s.readyState
s.onerror = () => window.__estado.eventos.push('onerror')
s.onclose = () => window.__estado.eventos.push('onclose')
s.addEventListener('close', (e) => window.__estado.eventos.push('close ' + e.code))
try { s.send('x') } catch (e) { window.__estado.send = e.name }
if (window.__estado.temWss) new WebSocketStream('ws://localhost:${B.porta}/wss-topo').opened.catch(() => { window.__estado.wss = 'rejeitada' })
if (window.__estado.temWt) new WebTransport('https://127.0.0.1:${pu}/wt-topo').ready.catch(() => { window.__estado.wt = 'rejeitada' })
window.__estado.marcador = 'vivo'
const caixa = document.createElement('div'); document.body.appendChild(caixa)
window.__estado.animou = !!caixa.animate([{ opacity: 0 }, { opacity: 1 }], 400)
setTimeout(() => { window.__estado.depois = s.readyState }, 300)
</script>` : '')
  })
  const { barrados, estado } = await comTravaNaPagina(t, `http://127.0.0.1:${A.porta}/`)
  const tudo = JSON.stringify({ estado, barrados: barrados.map((b) => `${b.tipo} ${b.recurso} ${b.url}`), registroA: A.registro, registroB: B.registro, udp: pacotes.length })
  // Antes (construtor que lançava): o script parava na 1.ª linha; sem marcador, sem animação, sem aviso na medida.
  assert.equal(estado?.marcador, 'vivo', 'o script do site morreu no construtor barrado: ' + tudo)
  assert.equal(estado.animou, true, 'a animação depois do canal não começou: ' + tudo)
  assert.equal(estado.inicial, 0, 'nasce CONNECTING como o real: ' + tudo)
  assert.equal(estado.send, 'InvalidStateError', 'send no CONNECTING lança como o navegador: ' + tudo)
  assert.equal(estado.depois, 3, 'termina CLOSED: ' + tudo)
  assert.deepEqual(estado.eventos, ['onerror', 'onclose', 'close 1006'], 'error e close disparam (propriedade e addEventListener): ' + tudo)
  if (estado.temWss) assert.equal(estado.wss, 'rejeitada', tudo)
  if (estado.temWt) assert.equal(estado.wt, 'rejeitada', tudo)
  assert.ok(barrados.some((b) => b.tipo === 'websocket' && b.url.endsWith('/ws-topo')), 'a tentativa fica anotada: ' + tudo)
  assert.deepEqual(B.registro, [], 'o servidor recebeu o canal: ' + tudo)
  assert.equal(pacotes.length, 0, 'WebTransport mandou pacote UDP: ' + tudo)
})

// WebRTC (12/11): RTCPeerConnection manda UDP (STUN) ao servidor de ICE e o canal de dados é escrita. O STUN aponta
// para uma escuta UDP local (127.0.0.1 e o IP da rede, porque o Chrome pode não sair pela interface de loopback).
test('auditoria: RTCPeerConnection é inerte (nenhum pacote UDP ao STUN; o script do site segue; tentativa anotada)', { skip: pular, timeout: 120_000 }, async (t) => {
  const udp = dgram.createSocket('udp4')
  const pacotes = []
  udp.on('message', (m, de) => pacotes.push(`${de.address} ${m.length}`))
  await new Promise((ok) => udp.bind(0, '0.0.0.0', ok))
  t.after(() => { try { udp.close() } catch {} })
  const pu = udp.address().port
  const rede = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address
  const urls = [`stun:127.0.0.1:${pu}`, ...(rede ? [`stun:${rede}:${pu}`] : [])]
  const A = await subirContando(t, (req, res) => {
    res.writeHead(200, { 'Content-Type': req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(req.url === '/' ? `<!doctype html><title>RTC</title><p>${'texto '.repeat(20)}</p><script>
window.__estado = { tem: typeof RTCPeerConnection, temWebkit: typeof webkitRTCPeerConnection }
const pc = new RTCPeerConnection({ iceServers: [{ urls: ${JSON.stringify(urls)} }] })
const canal = pc.createDataChannel('dados')
pc.onicecandidate = (e) => { if (e.candidate) window.__estado.candidatos = (window.__estado.candidatos || 0) + 1 }
pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => { window.__estado.oferta = 'ok' }, (e) => { window.__estado.oferta = 'rejeitada' })
try { canal.send('x') } catch (e) { window.__estado.send = e.name }
if (typeof webkitRTCPeerConnection === 'function') { const w = new webkitRTCPeerConnection({ iceServers: [{ urls: ${JSON.stringify(urls)} }] }); w.createDataChannel('w'); w.createOffer().then((o) => w.setLocalDescription(o)).catch(() => {}) }
const f = document.createElement('iframe'); document.body.appendChild(f) // quadro vazio novo: o gancho vale lá também
try { const q = new f.contentWindow.RTCPeerConnection({ iceServers: [{ urls: ${JSON.stringify(urls)} }] }); q.createDataChannel('q'); q.createOffer().then((o) => q.setLocalDescription(o)).catch(() => {}); window.__estado.iframe = 'criou' } catch (e) { window.__estado.iframe = e.name }
window.__estado.marcador = 'vivo'
</script>` : '')
  })
  const { barrados, estado } = await comTravaNaPagina(t, `http://127.0.0.1:${A.porta}/`, { esperaMs: 3000 })
  const tudo = JSON.stringify({ estado, barrados: barrados.map((b) => `${b.tipo} ${b.recurso} ${b.url}`), udp: pacotes })
  // Sem o gancho (contraprova de 12/11): pacotes STUN chegam à escuta e a tentativa não fica anotada.
  assert.equal(estado?.marcador, 'vivo', 'o script do site morreu no RTCPeerConnection barrado: ' + tudo)
  assert.equal(estado.tem, 'function', 'a página ainda vê RTCPeerConnection: ' + tudo)
  assert.equal(estado.send, 'InvalidStateError', 'canal de dados nunca abre: ' + tudo)
  assert.equal(estado.oferta, 'rejeitada', 'a oferta é rejeitada (sem efeito de rede): ' + tudo)
  assert.ok(barrados.some((b) => b.tipo === 'websocket' && b.recurso === 'RTCPeerConnection' && b.url.includes(`:${pu}`)), 'a tentativa fica anotada: ' + tudo)
  assert.deepEqual(pacotes, [], 'RTCPeerConnection mandou pacote UDP: ' + tudo)
})

// WebTransport dentro de worker dedicado: o gancho entra pelo auto-attach antes de o worker rodar.
test('auditoria: WebTransport e WebSocket de worker dedicado não mandam nada (UDP e Upgrade contados)', { skip: pular, timeout: 120_000 }, async (t) => {
  const B = await subirContando(t, (req, res) => { res.writeHead(200); res.end('ok') })
  const { pacotes, porta: pu } = await escutaUdp(t)
  const A = await subirContando(t, (req, res) => {
    const js = req.url === '/wt.js'
    res.writeHead(200, { 'Content-Type': js ? 'text/javascript' : req.url === '/robots.txt' ? 'text/plain' : 'text/html; charset=utf-8' })
    res.end(js ? `fetch('/wt-le').catch(() => {})
setInterval(() => {
  try { if (self.WebTransport) new WebTransport('https://127.0.0.1:${pu}/wt-worker').ready.catch(() => {}) } catch {}
  try { const s = new WebSocket('ws://localhost:${B.porta}/ws-worker'); s.onerror = () => {} } catch {}
}, 60)` : req.url === '/' ? `<!doctype html><title>Worker WT</title><p>${'texto '.repeat(20)}</p><script>new Worker('/wt.js')</script>`
      : req.url === '/wt-le' ? 'lido' : '')
  })
  const { barrados } = await comTravaNaPagina(t, `http://127.0.0.1:${A.porta}/`)
  const tudo = JSON.stringify({ barrados: barrados.map((b) => `${b.tipo} ${b.recurso} ${b.url}`), registroA: A.registro, registroB: B.registro, udp: pacotes.length })
  assert.ok(A.registro.includes('GET /wt-le'), 'o worker deveria rodar (senão o teste não prova nada): ' + tudo)
  assert.ok(barrados.some((b) => b.tipo === 'websocket' && b.recurso === 'WebTransport' && b.url.includes('/wt-worker')), 'o WebTransport do worker fica anotado: ' + tudo)
  assert.equal(pacotes.length, 0, 'WebTransport do worker mandou pacote UDP: ' + tudo)
  assert.deepEqual(B.registro, [], 'o outro site recebeu o WebSocket do worker: ' + tudo)
})

test('modo rigoroso (escritaInvalida qualquer): tipos de antes invalidam como antes; dos novos, só o canal direto', () => {
  const b = (tipo, documento = false, conteudo = false) => ({ tipo, documento, conteudo, metodo: 'GET', url: 'http://x.test/a', recurso: 'Other' })
  const grave = (x, modo) => barradosParaNaoMedido([x], { pagina: 'inicio', etapa: 'clique', onde: 'pagina', escritaInvalida: modo })[0].afetaMedida
  // tipos de antes de 12/11 (git show 857cc8d): no rigoroso, todo barrado invalida, como era
  for (const tipo of ['escrita', 'outro-site', 'robots', 'rota', 'quadro', 'navegacao', 'download', 'erro-na-trava']) {
    assert.equal(grave(b(tipo), 'qualquer'), true, tipo + ' no rigoroso')
  }
  assert.equal(grave(b('escrita'), 'documento'), false, 'escrita de fundo no padrão só é anotada')
  // tipos novos: canal direto manda dados (escrita) → invalida no rigoroso; o resto não é escrita da página
  assert.equal(grave(b('websocket'), 'qualquer'), true)
  for (const tipo of ['quadro-outro-site', 'janela', 'service-worker']) assert.equal(grave(b(tipo), 'qualquer'), false, tipo + ' no rigoroso')
  for (const tipo of ['websocket', 'quadro-outro-site', 'janela', 'service-worker']) assert.equal(grave(b(tipo), 'documento'), false, tipo + ' no padrão')
  // o que já invalida em qualquer modo segue invalidando
  assert.equal(grave(b('quadro', false, true), 'documento'), true)
  assert.equal(grave(b('outro-site', true), 'documento'), true)
})
