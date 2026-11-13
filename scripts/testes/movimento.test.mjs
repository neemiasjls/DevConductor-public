// Testa o inventário de movimento (movimento.mjs e raio-x.mjs --movimento): as regras puras de junção, números,
// celular, cobertura e o .md; e, num site local de 2 páginas, a captura inteira pela linha de comando.
// Roda com: node --test scripts/testes/movimento.test.mjs   (teste de navegador: um por vez na máquina)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pastaScripts = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts')
const scriptMov = path.join(pastaScripts, 'movimento.mjs'), scriptRx = path.join(pastaScripts, 'raio-x.mjs')
const { acharNavegador } = await import(pathToFileURL(scriptRx).href)
const { GATILHOS, MUDANCAS } = await import(pathToFileURL(path.join(pastaScripts, 'movimento-quadros.mjs')).href)
const M = await import(pathToFileURL(scriptMov).href)

// ---------------------------------------------------------------------------------------------------------
// Regras puras
// ---------------------------------------------------------------------------------------------------------
const item = (mais = {}) => ({ pagina: 'inicio', secao: 1, gatilho: 'rolagem', ordem: 1, alvo: { desc: 'h1.titulo', texto: '', quantos: 1, dataMov: null },
  quemMuda: ['proprio'], muda: ['opacidade'], de: { opacidade: 1 }, para: { opacidade: 0 }, duracaoMs: null, curva: null, atrasoMs: 0, escadaMs: 0,
  rolagem: { inicioTelas: 1, fimTelas: 2, acompanha: true }, fontes: ['amostra'], confianca: 'media', tecnica: '', resumo: '', quadros: null, ...mais })

test('juntarItens: mesma chave e trecho sobreposto funde; o número do código vale; trecho separado não funde', () => {
  const amostra = item({ para: { opacidade: 0.05 }, alvo: { desc: 'h1.titulo', texto: '', quantos: 1, dataMov: 'M02' } })
  const gsap = item({ fontes: ['codigo-gsap'], para: { opacidade: 0 }, curva: 'power2.out', rolagem: { inicioTelas: 1.1, fimTelas: 2.1 } })
  const longe = item({ rolagem: { inicioTelas: 5, fimTelas: 6, acompanha: true } })
  const outro = item({ muda: ['opacidade', 'desfoque'] })
  const r = M.juntarItens([amostra, gsap, longe, outro])
  assert.equal(r.length, 3)
  const f = r.find((i) => i.fontes.length === 2)
  assert.deepEqual(f.fontes, ['amostra', 'codigo-gsap'])
  assert.equal(f.para.opacidade, 0, 'número do código vale sobre a amostra')
  assert.equal(f.curva, 'power2.out')
  assert.equal(f.confianca, 'alta')
  assert.equal(f.alvo.dataMov, 'M02', 'o data-mov lido pela amostra sobrevive ao alvo do código')
  assert.equal(M.chaveDe(outro), 'inicio|rolagem|h1.titulo|desfoque+opacidade|1')
})

test('juntarDisparos: :hover do filho casa com o item de mouse de quem dispara e não duplica', () => {
  const mouse = item({ gatilho: 'mouse', alvo: { desc: 'div.cartao', quantos: 3 }, quemMuda: ['proprio', 'filhos'], muda: ['largura', 'opacidade'], rolagem: null, fontes: ['quadros'], duracaoMs: 290 })
  const css = item({ gatilho: 'mouse', alvo: { desc: 'span.nome' }, disparo: { desc: 'div.cartao', seletor: '.cartao', quemMuda: 'filhos', quantos: 3 }, muda: ['opacidade'], rolagem: null,
    fontes: ['css'], duracaoMs: 300, curva: 'ease', saida: { duracaoMs: 300, curva: 'ease', voltou: true } })
  const semPar = item({ gatilho: 'mouse', alvo: { desc: 'a.botao' }, disparo: { desc: 'a.botao', quemMuda: 'proprio' }, muda: ['cor'], rolagem: null, fontes: ['css'] })
  const r = M.juntarDisparos([mouse, css, semPar])
  assert.equal(r.length, 2)
  assert.deepEqual(r[0].fontes, ['quadros', 'css'])
  assert.equal(r[0].partes.at(-1).desc, 'span.nome')
  assert.equal(r[0].confianca, 'alta')
  assert.ok(r[0].saida && r[0].saida.voltou, 'a volta do mouse no CSS vira a saída do item')
  // proprio: o número do CSS vale sobre o dos quadros
  const m2 = item({ gatilho: 'mouse', alvo: { desc: 'a.botao' }, muda: ['escala'], rolagem: null, fontes: ['quadros'], duracaoMs: 260 })
  const c2 = item({ gatilho: 'mouse', alvo: { desc: 'a.botao' }, disparo: { desc: 'a.botao', quemMuda: 'proprio' }, muda: ['escala'], rolagem: null, fontes: ['css'], duracaoMs: 250, curva: 'ease-out' })
  const r2 = M.juntarDisparos([m2, c2])
  assert.deepEqual([r2.length, r2[0].duracaoMs, r2[0].curva], [1, 250, 'ease-out'])
})

test('atribuirIds: chave igual mantém o número; novo ganha o próximo livre; sumido é aposentado e não volta', () => {
  const a = item(), b = item({ alvo: { desc: 'p.texto' } })
  const ap1 = M.atribuirIds([a, b], null)
  assert.deepEqual([a.id, b.id, ap1], ['M01', 'M02', []])
  const ant = { itens: [a, b].map((x) => ({ id: x.id, chave: x.chave })), idsAposentados: [] }
  const b2 = item({ alvo: { desc: 'p.texto' } }), c = item({ alvo: { desc: 'img.foto' } })
  const ap2 = M.atribuirIds([c, b2], ant)
  assert.deepEqual([b2.id, c.id, ap2], ['M02', 'M03', ['M01']])
  const a3 = item()
  M.atribuirIds([a3], { itens: [{ id: 'M02', chave: b2.chave }, { id: 'M03', chave: c.chave }], idsAposentados: ['M01'] })
  assert.equal(a3.id, 'M04', 'número aposentado não é reusado')
})

test('vincularVariantes: toque herda o número do mouse igual; o resto ganha C', () => {
  const pc = [{ ...item({ gatilho: 'mouse', muda: ['largura', 'opacidade'] }), id: 'M05' }]
  const t = item({ gatilho: 'toque', muda: ['opacidade', 'largura'] }), so = item({ gatilho: 'toque', alvo: { desc: 'nav' } })
  M.vincularVariantes(pc, [t, so])
  M.atribuirIds([t, so], null, { prefixo: 'C' })
  assert.deepEqual([t.id, so.id], ['M05', 'C01'])
})

test('fecharCobertura: junta clique e código, etapa que faltou vira falhou com naoMedido, afetaMedida falso não pesa', () => {
  const nm = [{ pagina: 'inicio', etapa: 'mouse', o: 'x', motivo: 'pedido de escrita', afetaMedida: false }]
  const linhas = [
    { pagina: 'inicio', etapa: 'carregar', estado: 'completa', itens: 1 }, { pagina: 'inicio', etapa: 'parado', estado: 'completa', itens: 0 },
    { pagina: 'inicio', etapa: 'rolagem', estado: 'completa', itens: 2 }, { pagina: 'inicio', etapa: 'codigo', estado: 'completa', itens: 1, limites: 'gsap' },
    { pagina: 'inicio', etapa: 'codigo', estado: 'parcial', itens: 2, limites: 'css', motivo: 'shader' }, { pagina: 'inicio', etapa: 'mouse', estado: 'completa', itens: 1 },
    { pagina: 'inicio', etapa: 'clique', estado: 'nao-se-aplica', itens: 0 }, { pagina: 'inicio', etapa: 'clique', estado: 'completa', itens: 1, limites: 'até 2' },
  ]
  const c = M.fecharCobertura(linhas, { naoMedido: nm })
  const de = (e) => c.find((l) => l.etapa === e)
  assert.equal(c.length, 7)
  assert.deepEqual([de('codigo').estado, de('codigo').itens, de('codigo').limites], ['parcial', 3, 'gsap; css'])
  assert.deepEqual([de('clique').estado, de('clique').itens], ['completa', 1])
  assert.equal(de('mouse').estado, 'completa')
  assert.equal(de('cabecalho').estado, 'falhou')
  assert.ok(nm.some((n) => n.etapa === 'cabecalho'))
})

test('gerarInventarioMd: uma linha por item, cobertura, não medido e a tabela item → arquivo', () => {
  const it = { ...item(), id: 'M01', alvo: { desc: 'h1.a|b', quantos: 1 } }
  const md = M.gerarInventarioMd({ url: 'http://x.test/', medidoEm: '2026-11-12', valido: true, tela: { largura: 1440, altura: 900 }, itens: [it],
    cobertura: [{ pagina: 'inicio', etapa: 'carregar', estado: 'completa', itens: 1 }], naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'parado', o: 'seção 2', motivo: 'm' }] })
  for (const parte of ['| M01 |', '## Cobertura', '## Não medido', '| N01 |', '## Item → arquivo que implementa', '`h1.a\\|b`']) assert.ok(md.includes(parte), parte)
})

// ---------------------------------------------------------------------------------------------------------
// Site local de 2 páginas, pela linha de comando
// ---------------------------------------------------------------------------------------------------------
const navegador = acharNavegador()
const pular = !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)'
let extra = false
const inicial = () => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Marcenaria de teste</title><style>
*{box-sizing:border-box}body{margin:0;font:18px/1.4 sans-serif;color:#222;background:#f4efe6}
section{min-height:100vh;padding:40px}nav{position:absolute;top:0;right:0;padding:16px}
#abre h1{font-size:64px;animation:entra 900ms ease-out both}@keyframes entra{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
#cena{height:300vh;background:#e6dccb}#frase{font-size:48px;margin-top:20vh;width:80%}
#cartao{width:80%;height:240px;background:#8a6a45;opacity:0;transform:translateY(80px);transition:opacity 700ms ease,transform 700ms ease}#cartao.visto{opacity:1;transform:none}
.galeria{display:flex;gap:8px;height:300px}.cartao{flex:1 1 0;min-width:0;background:#b9a27f;overflow:hidden;transition:flex-grow 300ms ease;position:relative}
.cartao:hover{flex-grow:3}.cartao .nome{position:absolute;left:12px;bottom:12px;opacity:0;transition:opacity 300ms ease}.cartao:hover .nome{opacity:1}
#novo{width:200px;height:200px;background:#355;animation:gira 2s linear infinite}@keyframes gira{to{transform:rotate(360deg)}}
footer{height:300px;background:#222;color:#eee;padding:40px}</style></head><body>
<nav><a href="/projeto">Projeto</a></nav>
<section id="abre"><h1>Móveis feitos para durar</h1><p>${'Texto da abertura da marcenaria. '.repeat(8)}</p></section>
<section id="cena"><h2 id="frase">Cada peça começa na madeira escolhida</h2><div id="cartao" data-mov="M99"></div><p>${'Texto da cena. '.repeat(10)}</p></section>
<section id="galeria"><div class="galeria"><div class="cartao"><span class="nome">Cozinha</span></div><div class="cartao"><span class="nome">Sala</span></div><div class="cartao"><span class="nome">Quarto</span></div></div>
${extra ? '<div id="novo"></div>' : ''}<p>${'Texto da galeria. '.repeat(10)}</p></section>
<footer><p>Rodapé da marcenaria de teste.</p></footer>
<script>
const frase = document.getElementById('frase'), cartao = document.getElementById('cartao'), cena = document.getElementById('cena')
function rolou() { const p = Math.max(0, Math.min(1, (scrollY - cena.offsetTop) / innerHeight)); frase.style.opacity = String(1 - p * 0.8); cartao.classList.toggle('visto', scrollY > cena.offsetTop + innerHeight * 0.5) }
addEventListener('scroll', rolou, { passive: true }); rolou()
</script></body></html>`
const projeto = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Projeto</title><style>body{margin:0;font:18px sans-serif;background:#eee}
section{min-height:100vh;padding:40px}h1{animation:vem 700ms ease-out both}@keyframes vem{from{opacity:0}to{opacity:1}}</style></head><body>
<section><h1>Projeto da cozinha</h1><p>${'Texto do projeto da cozinha. '.repeat(12)}</p></section><section style="background:#ccc"><p>${'Mais texto. '.repeat(12)}</p></section></body></html>`
const desafio = '<!doctype html><html><head><title>Just a moment...</title></head><body><p>Checking your browser before accessing</p></body></html>'

const subir = (fn) => new Promise((r, x) => { const s = http.createServer(fn); s.once('error', x); s.listen(0, '127.0.0.1', () => r(s)) })
const matar = (p) => { if (!p || p.exitCode !== null) return; if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/t', '/f']); else p.kill('SIGKILL') }
const rodar = (script, args, limiteMs = 400_000) => new Promise((resolve, reject) => {
  const filho = spawn(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
  const limite = setTimeout(() => { matar(filho); reject(new Error(`${path.basename(script)} não terminou em ${limiteMs / 1000} s`)) }, limiteMs)
  let out = '', err = ''
  filho.stdout.on('data', (d) => { out += d }); filho.stderr.on('data', (d) => { err += d })
  filho.on('error', (e) => { clearTimeout(limite); reject(e) })
  filho.on('close', (code) => { clearTimeout(limite); resolve({ code, out, err }) })
})
const ler = (saida, nome) => JSON.parse(fs.readFileSync(path.join(saida, nome), 'utf8'))
const resumo = (j) => JSON.stringify(j.itens.map((i) => [i.id, i.pagina, i.gatilho, i.alvo.desc, i.muda, i.rolagem && i.rolagem.acompanha])) + JSON.stringify(j.naoMedido.map((n) => [n.etapa, n.o, n.motivo]))

test('site local de 2 páginas: raio-x --movimento, números estáveis, item novo, celular, tempo esgotado e desafio', { skip: pular, timeout: 1_800_000 }, async (t) => {
  const site = await subir((req, res) => {
    const html = (c) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(c) }
    if (req.url === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('') }
    else if (req.url === '/') html(inicial())
    else if (req.url === '/projeto') html(projeto)
    else if (req.url === '/desafio') html(desafio)
    else { res.writeHead(404); res.end() }
  })
  t.after(() => { site.close(); site.closeAllConnections?.() })
  const base = `http://127.0.0.1:${site.address().port}/`
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-inventario-'))
  t.after(() => fs.rmSync(saida, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))

  // 1) raio-x --movimento grava tudo
  const r1 = await rodar(scriptRx, [base, saida, '--movimento', '--passos', '8', '--max-paginas', '1', '--max-mouse', '6'])
  assert.equal(r1.code, 0, r1.err || r1.out)
  for (const arq of ['raio-x.json', 'roteiro.md', 'custo.md', 'medidas.css', 'movimento.json', 'inventario-movimento.md', path.join('quadros', 'manifesto.json')])
    assert.ok(fs.existsSync(path.join(saida, arq)), 'faltou ' + arq)
  const j1 = ler(saida, 'movimento.json')
  const tudo = resumo(j1)
  assert.equal(j1.valido, true)
  assert.deepEqual(j1.paginas.map((p) => [p.id, p.tipo]), [['inicio', 'inicial'], ['interna-1', 'interna']], tudo)
  for (const it of j1.itens) {
    assert.match(it.id, /^M\d\d$/)
    assert.ok(GATILHOS.includes(it.gatilho) && it.muda.every((m) => MUDANCAS.includes(m)), JSON.stringify([it.gatilho, it.muda]))
    assert.ok(!('quadrosBrutos' in it))
    assert.equal(it.chave, M.chaveDe(it))
  }
  assert.equal(new Set(j1.itens.map((i) => i.chave)).size, j1.itens.length, 'chave repetida: ' + tudo)
  // tempo por alvo: cartão dispara, frase acompanha a rolagem
  const cartao = j1.itens.find((i) => i.gatilho === 'rolagem' && i.alvo.desc === 'div#cartao')
  const frase = j1.itens.find((i) => i.gatilho === 'rolagem' && i.alvo.desc === 'h2#frase')
  assert.ok(cartao && frase, tudo)
  assert.equal(cartao.rolagem.acompanha, false, tudo)
  assert.equal(cartao.alvo.dataMov, 'M99', 'o data-mov do elemento chega ao item da rolagem: ' + tudo)
  assert.equal(frase.rolagem.acompanha, true, tudo)
  assert.ok(j1.itens.some((i) => i.gatilho === 'carregar' && i.pagina === 'inicio'), tudo)
  assert.ok(j1.itens.some((i) => i.pagina === 'interna-1'), 'nada medido na página interna: ' + tudo)
  const mouse = j1.itens.find((i) => i.gatilho === 'mouse' && i.alvo.desc === 'div.cartao')
  assert.ok(mouse, tudo)
  assert.equal(j1.itens.filter((i) => /cartao|span\.nome/.test(i.alvo.desc) && i.gatilho === 'mouse').length, 1, 'hover duplicado: ' + tudo)
  const troca = j1.itens.find((i) => i.gatilho === 'troca-de-pagina')
  if (troca) assert.equal(j1.paginas[1].chegouPor, troca.id)
  assert.equal(j1.cobertura.filter((c) => c.pagina === 'inicio' && c.etapa === 'clique').length, 1)
  assert.equal(j1.cobertura.filter((c) => c.pagina === 'inicio').length, 7, JSON.stringify(j1.cobertura))
  const man = ler(saida, path.join('quadros', 'manifesto.json')).quadros
  assert.ok(man.some((q) => q.item && q.progresso != null), 'manifesto sem item/progresso')
  assert.ok(man.every((q) => q.fonte === 'gravacao' || q.perdido === false))
  const comFolha = j1.itens.filter((i) => i.quadros)
  assert.ok(comFolha.length && comFolha.every((i) => fs.existsSync(path.join(saida, i.quadros))), 'folha faltando')
  const md = fs.readFileSync(path.join(saida, 'inventario-movimento.md'), 'utf8')
  for (const it of j1.itens) assert.ok(md.includes(`| ${it.id} |`))

  // 2) segunda rodada: mesmos números
  const r2 = await rodar(scriptMov, [base, saida, '--max-paginas', '1', '--max-mouse', '6'])
  assert.equal(r2.code, 0, r2.err)
  const j2 = ler(saida, 'movimento.json')
  const mapa = (j) => Object.fromEntries(j.itens.map((i) => [i.chave, i.id]))
  const m1 = mapa(j1), m2 = mapa(j2)
  for (const [k, id] of Object.entries(m2)) if (m1[k]) assert.equal(id, m1[k], `número mudou para ${k}`)
  for (const k of [cartao.chave, frase.chave, mouse.chave]) assert.equal(m2[k], m1[k], 'item principal sumiu ou mudou: ' + k + resumo(j2))

  // 3) um movimento a mais: os números antigos não mudam
  extra = true
  const r3 = await rodar(scriptMov, [base, saida, '--max-paginas', '1', '--max-mouse', '6'])
  assert.equal(r3.code, 0, r3.err)
  const j3 = ler(saida, 'movimento.json'), m3 = mapa(j3)
  for (const k of [cartao.chave, frase.chave, mouse.chave]) assert.equal(m3[k], m1[k])
  const novo = j3.itens.find((i) => i.alvo.desc === 'div#novo')
  assert.ok(novo, 'o movimento novo não apareceu: ' + resumo(j3))
  const usados = [...j1.itens, ...j2.itens].map((i) => Number(i.id.slice(1)))
  assert.ok(Number(novo.id.slice(1)) > Math.max(...usados), 'número novo reusou um antigo')
  extra = false

  // 4) celular: arquivos próprios, toque herda o número do mouse
  const antesPc = fs.readFileSync(path.join(saida, 'movimento.json'), 'utf8')
  const r4 = await rodar(scriptMov, [base, saida, '--celular', '--max-paginas', '1', '--max-mouse', '6'])
  assert.equal(r4.code, 0, r4.err)
  assert.equal(fs.readFileSync(path.join(saida, 'movimento.json'), 'utf8'), antesPc, 'o --celular mexeu no do computador')
  for (const arq of ['movimento-celular.json', 'inventario-movimento-celular.md', path.join('quadros-celular', 'manifesto.json')]) assert.ok(fs.existsSync(path.join(saida, arq)), 'faltou ' + arq)
  const jc = ler(saida, 'movimento-celular.json')
  const toque = jc.itens.find((i) => i.gatilho === 'toque' && i.alvo.desc === 'div.cartao')
  assert.ok(toque, resumo(jc))
  const mouse3 = j3.itens.find((i) => i.chave === mouse.chave)
  assert.equal(toque.id, mouse3.id, 'toque não herdou o número: ' + JSON.stringify([toque.muda, toque.secao, mouse3.muda, mouse3.secao]))
  assert.ok(jc.itens.every((i) => /^(M|C)\d\d$/.test(i.id)))

  // 5) tempo esgotado: etapa falhou e naoMedido
  const saida2 = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-tempo-'))
  t.after(() => fs.rmSync(saida2, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
  const r5 = await rodar(scriptMov, [base, saida2, '--tempo-max', '1'])
  assert.equal(r5.code, 0, r5.err)
  const j5 = ler(saida2, 'movimento.json')
  assert.ok(j5.cobertura.some((c) => c.estado === 'falhou'), JSON.stringify(j5.cobertura))
  assert.ok(j5.naoMedido.some((n) => /tempo/.test(n.motivo)), JSON.stringify(j5.naoMedido))

  // 6) página de desafio: valido false e código 3
  const r6 = await rodar(scriptMov, [base + 'desafio', saida2])
  assert.equal(r6.code, 3, r6.err || r6.out)
  const j6 = ler(saida2, 'movimento.json')
  assert.deepEqual([j6.valido, j6.itens.length], [false, 0])
})

// ---------------------------------------------------------------------------------------------------------
// Achados da revisão do lote 5
// ---------------------------------------------------------------------------------------------------------
test('achado 9: raio-x --movimento entrega --max-mouse, --max-paginas e --tempo-max ao processo filho', async () => {
  const RX = await import(pathToFileURL(scriptRx).href)
  const op = RX.lerArgs(['http://x.test/', 'saida', '--movimento', '--max-mouse', '6', '--max-paginas', '1', '--tempo-max', '90'])
  const filho = M.lerArgs(RX.argsDoMovimento(op, false).slice(1))
  assert.deepEqual([filho.maxMouse, filho.maxPaginas, filho.tempoMax, filho.celular], [6, 1, 90, false])
  assert.equal(M.lerArgs(RX.argsDoMovimento(op, true).slice(1)).celular, true)
})

test('achado 7: o mesmo descritor em duas ocorrências não se funde e os números não mudam entre rodadas', () => {
  const cartao = (mais) => item({ alvo: { desc: 'div.cartao', texto: '', quantos: 1, dataMov: null }, ...mais })
  // trajetórias opostas no mesmo trecho: dois itens
  const ida = cartao({ de: { opacidade: 0 }, para: { opacidade: 1 } }), volta = cartao({ de: { opacidade: 1 }, para: { opacidade: 0 } })
  const r = M.juntarItens([ida, volta])
  assert.equal(r.length, 2, 'trajetórias opostas fundidas')
  assert.notEqual(M.chaveDe(r[0]), M.chaveDe(r[1]))
  // trechos separados: chaves diferentes e números estáveis, mesmo com a ordem de chegada trocada
  const rodada = (inverter) => {
    const l = [cartao({ rolagem: { inicioTelas: 1, fimTelas: 2, acompanha: true } }), cartao({ rolagem: { inicioTelas: 5, fimTelas: 6, acompanha: true } })]
    return M.juntarItens(inverter ? l.reverse() : l)
  }
  const a = rodada(false)
  assert.equal(new Set(a.map(M.chaveDe)).size, 2, 'mesma chave para duas ocorrências')
  M.atribuirIds(a, null)
  const b = rodada(true)
  M.atribuirIds(b, { itens: a.map((x) => ({ id: x.id, chave: x.chave })), idsAposentados: [] })
  const porTrecho = (l) => Object.fromEntries(l.map((x) => [x.rolagem.inicioTelas, x.id]))
  assert.deepEqual(porTrecho(b), porTrecho(a))
  assert.deepEqual(Object.values(porTrecho(a)).sort(), ['M01', 'M02'])
})

test('2ª passada, achado 5: fontes diferentes com a mesma trajetória em seções diferentes não se fundem', () => {
  const cartao = (mais) => item({ alvo: { desc: 'div.cartao', texto: 'Cozinha', quantos: 1, dataMov: null }, de: { opacidade: 0 }, para: { opacidade: 1 }, ...mais })
  // CSS (tempo) na seção 1 e amostra (rolagem) na seção 5: trechos de tipos diferentes contam como sobrepostos
  const css = cartao({ secao: 1, fontes: ['css'], rolagem: null, duracaoMs: 600 })
  const amostra = cartao({ secao: 5 })
  const r = M.juntarItens([css, amostra])
  assert.equal(r.length, 2, 'ocorrências de seções diferentes fundidas')
  assert.deepEqual(r.map((x) => x.secao).sort(), [1, 5])
  // mesma seção (ou seção desconhecida de um lado): segue fundindo
  assert.equal(M.juntarItens([cartao({ secao: 5, fontes: ['css'], rolagem: null, duracaoMs: 600 }), cartao({ secao: 5 })]).length, 1)
  assert.equal(M.juntarItens([cartao({ secao: null, fontes: ['css'], rolagem: null, duracaoMs: 600 }), cartao({ secao: 5 })]).length, 1)
})

test('2ª passada, achado 6: ocorrência nova antes das outras não troca os números existentes', () => {
  const cartao = (secao) => item({ secao, alvo: { desc: 'div.cartao', texto: '', quantos: 1, dataMov: null }, rolagem: { inicioTelas: secao, fimTelas: secao + 0.8, acompanha: true } })
  const r1 = M.juntarItens([cartao(2), cartao(5)])
  M.atribuirIds(r1, null)
  const porSecao = (l) => Object.fromEntries(l.map((x) => [x.secao, x.id]))
  assert.deepEqual(porSecao(r1), { 2: 'M01', 5: 'M02' })
  const anteriores = JSON.parse(JSON.stringify({ itens: r1, idsAposentados: [] })) // como volta do movimento.json
  const r2 = M.juntarItens([cartao(2), cartao(5), cartao(1)])
  const ap = M.atribuirIds(r2, anteriores)
  assert.deepEqual(porSecao(r2), { 1: 'M03', 2: 'M01', 5: 'M02' }, 'números trocados ao inserir uma ocorrência antes')
  assert.deepEqual(ap, [])
  // a ocorrência da seção 2 some: só ela é aposentada; a da seção 5 mantém o número e o da 1 também
  const r3 = M.juntarItens([cartao(1), cartao(5)])
  const ap3 = M.atribuirIds(r3, JSON.parse(JSON.stringify({ itens: r2, idsAposentados: ap })))
  assert.deepEqual([porSecao(r3), ap3], [{ 1: 'M03', 5: 'M02' }, ['M01']])
  // seção nova no topo desloca todas as seções: os números ficam
  const r4 = M.juntarItens([cartao(2), cartao(5)].map((x) => ({ ...x, secao: x.secao + 1 })))
  M.atribuirIds(r4, anteriores)
  assert.deepEqual(porSecao(r4), { 3: 'M01', 6: 'M02' }, 'seções deslocadas trocaram os números')
})

test('3ª passada, P2 numeração: seção inserida antes, removida + inserida, só deslocamento', () => {
  const cartao = (secao) => item({ secao, alvo: { desc: 'div.cartao', texto: '', quantos: 1, dataMov: null }, rolagem: { inicioTelas: secao, fimTelas: secao + 0.8, acompanha: true } })
  const porSecao = (l) => Object.fromEntries(l.map((x) => [x.secao, x.id]))
  const copia = (l, ap = []) => JSON.parse(JSON.stringify({ itens: l, idsAposentados: ap }))
  const r1 = M.juntarItens([cartao(2), cartao(5)])
  M.atribuirIds(r1, null)
  // (a) seção nova antes, com um cartão igual nela: tudo desloca de 1
  const a = M.juntarItens([cartao(1), cartao(3), cartao(6)])
  const apA = M.atribuirIds(a, copia(r1))
  assert.deepEqual([porSecao(a), apA], [{ 1: 'M03', 3: 'M01', 6: 'M02' }, []])
  // (b) remove a da seção 2 e insere outra na 7: M01 aposentado, não reaproveitado
  const b = M.juntarItens([cartao(5), cartao(7)])
  const apB = M.atribuirIds(b, copia(r1))
  assert.deepEqual([porSecao(b), apB], [{ 5: 'M02', 7: 'M03' }, ['M01']])
  // (c) seção nova no topo sem cartão: só desloca, nenhum número muda
  const c = M.juntarItens([cartao(3), cartao(6)])
  const apC = M.atribuirIds(c, copia(r1))
  assert.deepEqual([porSecao(c), apC], [{ 3: 'M01', 6: 'M02' }, []])
})

test('achado 12: celular herda o número do item da mesma página e da mesma ordem', () => {
  const pc = [{ ...item({ gatilho: 'mouse', rolagem: null }), id: 'M01' }, { ...item({ gatilho: 'mouse', rolagem: null, pagina: 'interna-1' }), id: 'M02' },
    { ...item({ gatilho: 'mouse', rolagem: null, pagina: 'interna-1', ordem: 2 }), id: 'M03' }]
  const c1 = item({ gatilho: 'toque', rolagem: null, pagina: 'interna-1' }), c2 = item({ gatilho: 'toque', rolagem: null, pagina: 'interna-1', ordem: 2 })
  M.vincularVariantes(pc, [c2, c1])
  assert.deepEqual([c1.id, c2.id], ['M02', 'M03'])
})

test('achado 10: quadro do mesmo trecho vale para cada item (manifesto com uma entrada por item)', () => {
  const quadros = [0, 450, 900, 1350, 1800, 2250].map((px, k) => ({ arquivo: `brutos/q${k}.jpg`, pagina: 'inicio', gatilho: 'rolagem', sentido: 'descendo', rolagemPx: px, tMs: k * 100, fonte: 'foto', dados: null }))
  const a = { ...item(), id: 'M01' }, b = { ...item({ alvo: { desc: 'p.texto', quantos: 1 }, muda: ['posicao-y'] }), id: 'M02' }
  const folhas = M.associarQuadros([a, b], quadros, { vh: 900 })
  for (const it of [a, b]) {
    const meus = quadros.filter((q) => q.item === it.id)
    assert.ok(meus.length >= 2 && meus.every((q) => q.progresso != null), `${it.id} sem quadros no manifesto`)
    assert.ok(folhas.get(it.id).length, `${it.id} sem folha`)
  }
  const arquivos = (id) => quadros.filter((q) => q.item === id).map((q) => q.arquivo).sort()
  assert.deepEqual(arquivos('M02'), arquivos('M01'), 'o mesmo arquivo bruto serve aos dois itens')
  assert.ok(quadros.every((q) => typeof q.perdido === 'boolean'))
})

test('2ª passada, achado 1: pela linha de comando, a primeira visita (raio-x) já abre com a trava', { skip: pular, timeout: 900_000 }, async (t) => {
  let posts = 0
  const pag = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Trava</title><style>body{margin:0;font:18px sans-serif}
section{height:150vh;padding:40px;background:#ddd}section+section{background:#bbb}</style></head><body>
<section><h1>Topo da página</h1></section><section><h2>Meio da página</h2></section><section><h2>Fim da página</h2></section>
<script>const manda = (o) => fetch('/gravar?' + o, { method: 'POST', body: 'x' }).catch(() => {})
manda('carregar'); setInterval(() => manda('relogio'), 4)
addEventListener('scroll', () => manda('rolagem'), { passive: true })</script></body></html>`
  const site = await subir((req, res) => {
    if (req.method === 'POST') posts++
    if (req.url === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('') }
    else if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(pag) }
    else { res.writeHead(200); res.end('ok') }
  })
  t.after(() => { site.close(); site.closeAllConnections?.() })
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-trava-rx-'))
  t.after(() => fs.rmSync(saida, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
  const r = await rodar(scriptMov, [`http://127.0.0.1:${site.address().port}/`, saida, '--max-paginas', '0', '--max-mouse', '2', '--passos', '4', '--tempo-max', '240'], 800_000)
  await new Promise((ok) => setTimeout(ok, 400))
  assert.equal(r.code, 0, r.err.slice(-600))
  assert.equal(posts, 0, `${posts} POST chegaram ao site`)
  const j = ler(saida, 'movimento.json')
  const doRx = j.naoMedido.filter((n) => n.barrado === 'escrita' && /raio-x/.test(n.o))
  assert.ok(doRx.length, 'barrados da primeira visita fora do movimento.json: ' + JSON.stringify(j.naoMedido.map((n) => n.o)))
  assert.ok(j.naoMedido.some((n) => n.barrado === 'escrita'))
})

test('achado 1: trava ligada do começo ao fim da página: POST e redirecionamento da rolagem são barrados e anotados', { skip: pular, timeout: 600_000 }, async (t) => {
  const pedidos = []
  const pag = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Trava</title><style>body{margin:0;font:18px sans-serif}
section{height:150vh;padding:40px;background:#ddd}section+section{background:#bbb}</style></head><body>
<section><h1>Topo da página</h1></section><section><h2>Meio da página</h2></section><section><h2>Fim da página</h2></section>
<script>let feito = false
addEventListener('scroll', () => { if (feito || scrollY < 200) return; feito = true
  fetch('/gravar', { method: 'POST', body: 'x' }).catch(() => {}); setTimeout(() => location.assign('/destino'), 50) }, { passive: true })</script></body></html>`
  const site = await subir((req, res) => {
    pedidos.push(req.method + ' ' + req.url)
    if (req.url === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('') }
    else if (req.url === '/' || req.url === '/destino') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(req.url === '/' ? pag : '<p>outra</p>') }
    else { res.writeHead(200); res.end('ok') }
  })
  t.after(() => { site.close(); site.closeAllConnections?.() })
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-trava-'))
  t.after(() => fs.rmSync(saida, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
  // 4ª passada, P1 origem: item escrito à mão no manual entra no inventário com a marca do coletor (doManual); os medidos não
  const doManual = { id: 'H01', pagina: 'inicio', secao: 1, gatilho: 'rolagem', ordem: 1, alvo: { desc: 'h2', texto: 'Meio da página', quantos: 1, dataMov: null },
    quemMuda: ['proprio'], muda: ['opacidade'], de: { opacidade: 0 }, para: { opacidade: 1 }, duracaoMs: 600, curva: null, atrasoMs: 0, escadaMs: 0, rolagem: null,
    confianca: 'media', tecnica: 'conferido à mão', resumo: 'o título do meio aparece', quadros: null }
  fs.writeFileSync(path.join(saida, 'movimento-manual.json'), JSON.stringify({ itens: [doManual] }))
  const r = await M.capturarMovimento({ url: `http://127.0.0.1:${site.address().port}/`, saida, maxPaginas: 0, maxMouse: 2, tempoMax: 240, avisar: () => {} })
  assert.equal(r.codigo, 0)
  const gravado = JSON.parse(fs.readFileSync(path.join(saida, 'movimento.json'), 'utf8'))
  const copia = gravado.itens.find((i) => i.id === 'H01')
  assert.ok(copia && copia.doManual === true && copia.fontes.includes('roteiro-manual'), 'a cópia do manual tem de sair no movimento.json com doManual: ' + JSON.stringify(copia))
  assert.deepEqual(gravado.itens.filter((i) => i.doManual).map((i) => i.id), ['H01'], 'só a cópia do manual leva a marca')
  assert.ok(!pedidos.some((p) => p.startsWith('POST')), 'POST chegou ao site: ' + pedidos.join(', '))
  assert.ok(!pedidos.includes('GET /destino'), 'redirecionamento chegou ao site: ' + pedidos.join(', '))
  const barrados = r.json.naoMedido.filter((n) => n.barrado && ['carregar', 'parado', 'rolagem', 'codigo'].includes(n.etapa))
  assert.ok(barrados.length, 'barrados não anotados: ' + JSON.stringify(r.json.naoMedido))
})

// ---------------------------------------------------------------------------------------------------------
// Lote da folha espalhada, das bibliotecas e da rodada incompleta
// ---------------------------------------------------------------------------------------------------------
const quadroBruto = (k, mais = {}) => ({ arquivo: `brutos/q${String(k).padStart(2, '0')}.jpg`, pagina: 'inicio', gatilho: 'rolagem', sentido: 'descendo', rolagemPx: k * 100, tMs: k * 40, fonte: 'gravacao', dados: null, ...mais })

test('folha com mais de 24 quadros: 24 espalhados, o primeiro e o último entram (rolagem, itens fundidos e troca de página)', () => {
  const vh = 900
  // rolagem sem quadrosBrutos: 40 quadros no trecho
  const qs1 = Array.from({ length: 40 }, (_, k) => quadroBruto(k))
  const rol = { ...item({ rolagem: { inicioTelas: 0, fimTelas: 4.5, acompanha: true } }), id: 'M01' }
  const f1 = M.associarQuadros([rol], qs1, { vh }).get('M01').map((q) => q.arquivo)
  assert.equal(f1.length, 24)
  assert.deepEqual([f1[0], f1.at(-1)], [qs1[0].arquivo, qs1[39].arquivo], 'a folha da rolagem não vai até o fim do trecho')
  // dois itens da mesma chave fundidos (20 + 20 quadros, fora de ordem): a fusão não corta e a folha pega o fim
  const qs2 = Array.from({ length: 40 }, (_, k) => quadroBruto(k, { gatilho: 'carregar', rolagemPx: 0 }))
  const nomes = qs2.map((q) => q.arquivo)
  const a = item({ gatilho: 'carregar', rolagem: null, duracaoMs: 1600, quadrosBrutos: nomes.slice(0, 20).reverse() })
  const b = item({ gatilho: 'carregar', rolagem: null, duracaoMs: 1600, fontes: ['codigo-gsap'], quadrosBrutos: nomes.slice(20).reverse() })
  const [junto, ...resto] = M.juntarItens([a, b])
  assert.equal(resto.length, 0, 'os dois deviam fundir')
  assert.equal(junto.quadrosBrutos.length, 40, 'a fusão cortou os quadros')
  junto.id = 'M02'
  const f2 = M.associarQuadros([junto], qs2, { vh }).get('M02').map((q) => q.arquivo)
  assert.equal(f2.length, 24)
  assert.deepEqual([f2[0], f2.at(-1)], [nomes[0], nomes[39]])
  assert.deepEqual(f2, [...f2].sort(), 'a folha sai na ordem da gravação')
  // troca de página (só roda com navegador): o fonte entrega os quadros espalhados, não os 24 primeiros
  const fonte = fs.readFileSync(path.join(pastaScripts, 'movimento-navegacao.mjs'), 'utf8')
  assert.match(fonte, /quadrosBrutos: espalhar\(usados\.map\(\(q\) => q\.arquivo\), 24\)/)
  assert.doesNotMatch(fonte, /quadrosBrutos: usados[^\n]*\.slice\(0, 24\)/)
})

test('bibliotecasDe: opções do Lenis e do Swiper lidas no código vão para a página e viram linha no inventário', () => {
  // o formato real do capturarCodigo: { gsap: { ..., bibliotecas: { lenis, swiper: [{ alvo, opcoes }] } } }
  const lido = { itens: [], gsap: { exposto: true, versao: '3.12', linhas: [], gatilhos: [], bibliotecas: { lenis: { lerp: 0.08, duration: 1.2 }, swiper: [{ alvo: 'div.swiper.galeria', opcoes: { loop: true, speed: 900 } }] } } }
  const b = M.bibliotecasDe(lido)
  assert.deepEqual(b, { lenis: { lerp: 0.08, duration: 1.2 }, swiper: [{ alvo: 'div.swiper.galeria', opcoes: { loop: true, speed: 900 } }] })
  assert.equal(M.bibliotecasDe({ itens: [] }), null, 'sem leitura do código: null')
  assert.deepEqual(M.bibliotecasDe({ gsap: { bibliotecas: { lenis: null, swiper: null } } }), { lenis: null, swiper: [] })
  const md = M.gerarInventarioMd({ url: 'http://x.test/', medidoEm: '2026-11-12', valido: true, tela: { largura: 1440, altura: 900 },
    paginas: [{ id: 'inicio', bibliotecas: b }, { id: 'interna-1', bibliotecas: { lenis: null, swiper: [] } }], itens: [], cobertura: [], naoMedido: [] })
  const linha = md.split('\n').find((l) => l.startsWith('Bibliotecas em inicio:'))
  assert.ok(linha, 'sem linha de bibliotecas: ' + md.slice(0, 400))
  assert.ok(linha.includes('Lenis `{"lerp":0.08,"duration":1.2}`') && linha.includes('Swiper ×1 (`div.swiper.galeria`)'), linha)
  assert.ok(!md.includes('Bibliotecas em interna-1'), 'página sem biblioteca não ganha linha')
})

test('carrossel: o texto do alvo muda entre rodadas e os números ficam; ocorrência do meio que sai é aposentada', () => {
  const slide = (secao, texto) => item({ secao, alvo: { desc: 'div.slide', texto, quantos: 1, dataMov: null }, rolagem: { inicioTelas: secao, fimTelas: secao + 0.8, acompanha: true } })
  const porSecao = (l) => Object.fromEntries(l.map((x) => [x.secao, x.id]))
  const copia = (l, ap = []) => JSON.parse(JSON.stringify({ itens: l, idsAposentados: ap }))
  const r1 = M.juntarItens([slide(1, 'Cozinha'), slide(2, 'Sala'), slide(3, 'Quarto')])
  M.atribuirIds(r1, null)
  assert.deepEqual(porSecao(r1), { 1: 'M01', 2: 'M02', 3: 'M03' })
  // rodada 2: o carrossel andou, outro texto em cada slide
  const r2 = M.juntarItens([slide(1, 'Banheiro'), slide(2, 'Varanda'), slide(3, 'Escritório')])
  const ap2 = M.atribuirIds(r2, copia(r1))
  assert.deepEqual([porSecao(r2), ap2], [{ 1: 'M01', 2: 'M02', 3: 'M03' }, []], 'texto novo trocou o número')
  // rodada 3: o slide do meio saiu (e os textos mudaram de novo)
  const r3 = M.juntarItens([slide(1, 'Lavanderia'), slide(3, 'Garagem')])
  const ap3 = M.atribuirIds(r3, copia(r2, ap2))
  assert.deepEqual([porSecao(r3), ap3], [{ 1: 'M01', 3: 'M03' }, ['M02']])
  // guarda do desempate: na mesma seção, o texto igual decide quem ficou (sem ele, o primeiro na ordem levaria o número)
  const naSecao = (texto, posicaoPx) => item({ secao: 2, posicaoPx, alvo: { desc: 'div.slide', texto, quantos: 1, dataMov: null }, rolagem: null })
  const d1 = [naSecao('Sala', 100), naSecao('Quarto', 600)]
  M.atribuirIds(d1, null)
  const d2 = [naSecao('Quarto', 600)]
  const apD = M.atribuirIds(d2, copia(d1))
  assert.deepEqual([d2[0].id, apD], [d1[1].id, [d1[0].id]])
})

test('rodada incompleta: cortada pelo tempo e página interna não visitada não aposentam nem reusam número; os números voltam na rodada completa', () => {
  const ETAPAS = ['carregar', 'parado', 'rolagem', 'codigo', 'mouse', 'cabecalho', 'clique']
  const paginas = [{ id: 'inicio' }, { id: 'interna-1' }]
  const linhas = (pagina, falhou = []) => ETAPAS.map((etapa) => ({ pagina, etapa, estado: falhou.includes(etapa) ? 'falhou' : 'completa', itens: 0, limites: null, motivo: falhou.includes(etapa) ? 'tempo máximo esgotado' : null }))
  const alvo = (desc, texto = '') => ({ desc, texto, quantos: 1, dataMov: null })
  const titulo = () => item({ secao: 1 })
  const botao = () => item({ secao: 2, gatilho: 'mouse', alvo: alvo('a.botao', 'Orçamento'), rolagem: null, muda: ['escala'], fontes: ['quadros'] })
  const seta = () => item({ secao: 2, gatilho: 'mouse', alvo: alvo('span.seta'), rolagem: null, muda: ['posicao-x'], fontes: ['css'] })
  const projeto = () => item({ pagina: 'interna-1', secao: 1, alvo: alvo('h2.projeto') })
  const novo = () => item({ secao: 3, alvo: alvo('p.novo'), rolagem: { inicioTelas: 3, fimTelas: 3.5, acompanha: true } })
  const rodada = (itens, anterior, linhasCob, naoMedido = []) => {
    const cob = M.fecharCobertura(linhasCob, { paginas, naoMedido })
    const itensReservados = []
    const idsAposentados = M.atribuirIds(itens, anterior, { percorrida: M.percorridaDaCobertura(cob), reservados: itensReservados })
    const j = JSON.parse(JSON.stringify({ itens, idsAposentados, itensReservados, rodada: M.rodadaDe(cob, { naoMedido }) })) // como volta do movimento.json
    return { j, ids: Object.fromEntries(itens.map((x) => [x.alvo.desc, x.id])) }
  }
  // 1) completa
  const r1 = rodada([titulo(), botao(), seta(), projeto()], null, [...linhas('inicio'), ...linhas('interna-1')])
  assert.equal(r1.j.rodada.completa, true, JSON.stringify(r1.j.rodada))
  assert.deepEqual(Object.values(r1.ids).sort(), ['M01', 'M02', 'M03', 'M04'])
  // 2) o tempo acabou no mouse do início e a página interna nem foi aberta; um item novo apareceu
  const nm2 = [{ pagina: 'interna-1', etapa: 'carregar', o: 'página interna-1', motivo: 'tempo máximo esgotado antes desta página' }]
  const r2 = rodada([titulo(), novo()], r1.j, linhas('inicio', ['mouse']), nm2)
  assert.deepEqual(r2.j.idsAposentados, [], 'número aposentado numa rodada cortada')
  assert.equal(r2.ids['p.novo'], 'M05', 'número reservado reaproveitado pelo item novo')
  assert.deepEqual(r2.j.itensReservados.map((a) => a.id).sort(), [r1.ids['a.botao'], r1.ids['span.seta'], r1.ids['h2.projeto']].sort())
  assert.equal(r2.j.rodada.completa, false)
  assert.ok(r2.j.rodada.motivos.some((m) => /inicio mouse: falhou/.test(m)), JSON.stringify(r2.j.rodada.motivos))
  assert.ok(r2.j.rodada.motivos.some((m) => /página interna-1 não visitada/.test(m)), JSON.stringify(r2.j.rodada.motivos))
  const md = M.gerarInventarioMd({ url: 'http://x.test/', medidoEm: '2026-11-12', valido: true, tela: { largura: 1440, altura: 900 }, ...r2.j, cobertura: [], naoMedido: [] })
  assert.ok(md.includes('**RODADA INCOMPLETA**'), md.slice(0, 300))
  // 3) completa de novo: os números reservados voltam para os mesmos itens
  const r3 = rodada([titulo(), botao(), seta(), projeto(), novo()], r2.j, [...linhas('inicio'), ...linhas('interna-1')])
  assert.deepEqual(r3.ids, { ...r1.ids, 'p.novo': 'M05' })
  assert.deepEqual([r3.j.idsAposentados, r3.j.itensReservados, r3.j.rodada.completa], [[], [], true])
  // 4) completa sem o botão: aí sim ele é aposentado
  const r4 = rodada([titulo(), seta(), projeto(), novo()], r3.j, [...linhas('inicio'), ...linhas('interna-1')])
  assert.deepEqual([r4.j.idsAposentados, r4.j.itensReservados], [[r1.ids['a.botao']], []])
  // percorrida: item do CSS precisa também da etapa codigo; mouse e toque valem um pelo outro; nao-se-aplica só conta
  // com a página aberta; página interna com desafio entra nos motivos
  const cob = (estados) => Object.entries(estados).map(([etapa, estado]) => ({ pagina: 'inicio', etapa, estado }))
  const p = (estados) => M.percorridaDaCobertura(cob(estados))
  assert.equal(p({ carregar: 'completa', mouse: 'completa', codigo: 'falhou' })(seta()), false)
  assert.equal(p({ carregar: 'completa', toque: 'completa', codigo: 'completa' })(seta()), true)
  assert.equal(p({ carregar: 'completa', cabecalho: 'nao-se-aplica' })({ id: 'M09', chave: 'inicio|cabecalho|header|altura|1' }), true)
  assert.equal(p({ carregar: 'falhou', cabecalho: 'nao-se-aplica' })({ id: 'M09', chave: 'inicio|cabecalho|header|altura|1' }), false)
  // bloqueio é limite permanente do site (lacuna comum), não rodada cortada; tempo e falta de resposta são cortes
  const rod = M.rodadaDe([], { naoMedido: [{ pagina: 'interna-2', etapa: 'carregar', o: 'página interna-2', motivo: 'bloqueio ou página de desafio (status 403)' }] })
  assert.deepEqual([rod.completa, rod.motivos], [true, []])
  // falha fechado: causa que o coletor não reconhece como permanente (exceção qualquer, sem motivo) é rodada cortada
  assert.equal(M.rodadaDe([{ pagina: 'inicio', etapa: 'mouse', estado: 'falhou', motivo: 'a leitura na página deu erro: TypeError x' }]).completa, false)
  assert.equal(M.rodadaDe([{ pagina: 'inicio', etapa: 'codigo', estado: 'falhou', motivo: null }]).completa, false)
  // robots e resposta 404/5xx são limite do site (lacuna comum)
  assert.equal(M.rodadaDe([], { naoMedido: [{ pagina: 'interna-1', etapa: 'carregar', o: 'página interna-1', motivo: 'o robots.txt não permite abrir a página direto' }] }).completa, true)
  assert.equal(M.rodadaDe([{ pagina: 'interna-1', etapa: 'carregar', estado: 'falhou', motivo: 'a página respondeu com status 404' }]).completa, true)
  // revisão do Codex: número de bloqueio dentro do endereço não vira bloqueio; tempo e 408 são cortes
  assert.equal(M.rodadaDe([], { naoMedido: [{ pagina: 'interna-1', etapa: 'carregar', o: 'página interna-1', motivo: 'Page.navigate sem resposta duas vezes (https://s.test/403/)' }] }).completa, false)
  assert.equal(M.rodadaDe([{ pagina: 'interna-1', etapa: 'carregar', estado: 'falhou', motivo: 'a página respondeu com status 408' }]).completa, false)
  assert.equal(M.rodadaDe([{ pagina: 'interna-1', etapa: 'mouse', estado: 'falhou', motivo: 'erro ao abrir https://s.test/429/x' }]).completa, false)
  assert.equal(M.rodadaDe([], { naoMedido: [{ pagina: 'interna-1', etapa: 'carregar', o: 'página interna-1', motivo: 'bloqueio ou página de desafio (a página respondeu 403 (bloqueio))' }] }).completa, true)
  const corte = M.rodadaDe([{ pagina: 'inicio', etapa: 'carregar', estado: 'falhou', motivo: 'Page.navigate sem resposta em 1 s duas vezes' }],
    { naoMedido: [{ pagina: 'interna-1', etapa: 'carregar', o: 'página interna-1', motivo: 'tempo máximo esgotado antes desta página' }] })
  assert.deepEqual([corte.completa, corte.motivos.length], [false, 2])
})

// Revisão de segurança (13/11): o endereço do site no motivo da trava vai entre crases (dado do site, não texto do kit).
test('descreverTrava: o endereço do último documento vai entre crases, cortado e sem crase solta', () => {
  const url = 'https://s.test/![x](https://mal.test/a.png)`ordem`' + 'x'.repeat(200)
  const m = M.descreverTrava({ ligada: true, barrados: [] }, [{ url, etapa: 'pedido', recurso: 'Document' }])
  const trecho = m.slice(m.indexOf('último: pedido de ') + 'último: pedido de '.length, -1)
  assert.match(trecho, /^`[^`]*`$/, m)
  assert.ok(trecho.length <= 82, m)
})

test('[chrome] celular: Page.navigate sem resposta tenta de novo uma vez; sem resposta nunca, carregar "falhou" e o inventário sai gravado', { skip: pular, timeout: 900_000 }, async (t) => {
  const pag = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Lenta</title>
<style>body{margin:0;font:18px sans-serif}section{height:120vh;padding:30px;background:#ddd}section+section{background:#bbb}</style></head>
<body><section><h1>Topo</h1></section><section><h2>Fim</h2></section></body></html>`
  const servidor = async (responder) => {
    const presos = [], docs = []
    const s = await subir((req, res) => {
      if (req.url === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end(''); return }
      if (req.url === '/') { docs.push(Date.now()); if (!responder(docs.length)) { presos.push(res); return } res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(pag); return }
      res.writeHead(200); res.end('ok')
    })
    t.after(() => { for (const r of presos) try { r.destroy() } catch {} s.close(); s.closeAllConnections?.() })
    return { url: `http://127.0.0.1:${s.address().port}/`, docs }
  }
  const pasta = (nome) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), nome)); t.after(() => fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })); return d }
  const op = { celular: true, maxPaginas: 0, maxMouse: 2, tempoMax: 300, limiteNavegarMs: 4000, avisar: () => {} }
  // 1) segura o primeiro documento além do limite e responde o segundo: mede
  const lento = await servidor((n) => n >= 2)
  const s1 = pasta('movimento-lento-')
  const r1 = await M.capturarMovimento({ ...op, url: lento.url, saida: s1 })
  assert.equal(r1.codigo, 0, JSON.stringify(r1.json?.avisos))
  assert.equal(lento.docs.length, 2, 'esperava duas tentativas do documento')
  const j1 = ler(s1, 'movimento-celular.json')
  assert.equal(j1.valido, true)
  const car1 = j1.cobertura.find((c) => c.pagina === 'inicio' && c.etapa === 'carregar')
  assert.notEqual(car1.estado, 'falhou', JSON.stringify(car1))
  assert.ok(j1.avisos.some((a) => /segunda tentativa do Page\.navigate respondeu/.test(a)), JSON.stringify(j1.avisos))
  assert.ok(j1.avisos.some((a) => /sem resposta em 4 s na primeira tentativa/.test(a)), JSON.stringify(j1.avisos))
  assert.ok(typeof j1.paginas[0].tempoPorEtapaMs?.carregar === 'number', JSON.stringify(j1.paginas[0]))
  // 2) nunca responde: o processo segue, carregar "falhou" com o motivo e o inventário (inválido) é gravado
  const mudo = await servidor(() => false)
  const s2 = pasta('movimento-mudo-')
  const r2 = await M.capturarMovimento({ ...op, url: mudo.url, saida: s2 })
  assert.equal(r2.codigo, 3)
  assert.equal(mudo.docs.length, 2, 'esperava duas tentativas e só duas')
  const j2 = ler(s2, 'movimento-celular.json')
  assert.equal(j2.valido, false)
  const car2 = j2.cobertura.find((c) => c.etapa === 'carregar')
  assert.ok(car2 && car2.estado === 'falhou' && /sem resposta/.test(car2.motivo) && /duas vezes/.test(car2.motivo), JSON.stringify(j2.cobertura))
  assert.equal(j2.rodada.completa, false)
  assert.ok(fs.existsSync(path.join(s2, 'inventario-movimento-celular.md')))
})

// ---------------------------------------------------------------------------------------------------------
// Extremos nos nomes do contrato (normalizarExtremos): exemplos medidos no inventário de um site real
// ---------------------------------------------------------------------------------------------------------
const tela1440 = { largura: 1440, altura: 900, celular: false }
const itemMov = (muda, de, para, alvo = {}) => ({ id: 'X', pagina: 'inicio', gatilho: 'rolagem', muda, de, para, fontes: ['css'], alvo: { desc: 'div.alvo', ...alvo } })

test('normalizarExtremos: top/bottom, yPercent, rem, %, svh viram número no nome do contrato; "funcao" fica; o lido vai para deOriginal/paraOriginal', () => {
  const N = (it, ctx = {}) => M.normalizarExtremos(it, { tela: tela1440, raizPx: 16, ...ctx })
  // transição de top no cabeçalho
  const topo = N(itemMov(['posicao-y'], { top: '0px' }, { top: '-72px' }))
  assert.deepEqual([topo.de, topo.para, topo.deOriginal, topo.paraOriginal], [{ yPx: 0 }, { yPx: -72 }, { top: '0px' }, { top: '-72px' }])
  // top sem posicao-y em muda: não mexe; bottom e right com o sinal trocado
  assert.deepEqual(N(itemMov(['opacidade'], { top: '0px', opacidade: 0 }, null)).de, { top: '0px', opacidade: 0 })
  assert.deepEqual(N(itemMov(['posicao-x', 'posicao-y'], null, { bottom: '10px', right: '2rem' })).para, { yPx: -10, xPx: -32 })
  // GSAP: y e yPercent juntos somam (yPx + yPorcento × altura/100), pela caixa do próprio alvo
  const caixa = { caixa: { larguraPx: 300, alturaPx: 600 } }
  const gs = N(itemMov(['posicao-y'], { yPx: 0, yPorcento: 180 }, { yPx: -912, yPorcento: -30 }, caixa))
  assert.deepEqual([gs.de, gs.para], [{ yPx: 1080 }, { yPx: -1092 }])
  assert.deepEqual(N(itemMov(['posicao-y'], { yPorcento: 180 }, { yPorcento: -15 }, caixa)).para, { yPx: -90 })
  assert.deepEqual(N(itemMov(['posicao-x', 'opacidade'], { opacidade: 0, xPorcento: -20 }, null, caixa)).de, { opacidade: 0, xPx: -60 })
  // sem a caixa: o eixo inteiro fica como estava (nada de meia conversão) e a falta é contada
  const ficou = []
  const sem = N(itemMov(['posicao-y'], { yPx: 0, yPorcento: 180 }, null), { ficou })
  assert.deepEqual([sem.de, sem.deOriginal, ficou], [{ yPx: 0, yPorcento: 180 }, undefined, [{ chave: 'yPorcento', valor: 180, falta: 'caixa' }]])
  // :hover em rem (fonte da raiz da página) e largura em rem
  assert.deepEqual(N(itemMov(['posicao-x', 'posicao-y'], null, { x: '-1.25rem', yPx: 0 })).para, { yPx: 0, xPx: -20 })
  assert.deepEqual(N(itemMov(['posicao-x'], null, { x: '-1.25rem' }), { raizPx: 10 }).para, { xPx: -12.5 })
  assert.deepEqual(N(itemMov(['posicao-x', 'opacidade'], null, { opacidade: 1, x: '0rem', yPx: 0 })).para, { opacidade: 1, yPx: 0, xPx: 0 })
  assert.deepEqual(N(itemMov(['largura'], null, { largura: '35rem' })).para, { larguraPx: 560 })
  // % de largura/altura é do pai: com a caixa do pai vira px; sem ela fica texto, com o nome do contrato
  const pai = { caixaPai: { larguraPx: 1200, alturaPx: 400 } }
  assert.deepEqual(N(itemMov(['largura'], { largura: '100%' }, { largura: '35rem' }, pai)).de, { larguraPx: 1200 })
  const alt = N(itemMov(['largura', 'altura'], { height: '0%', larguraPx: 1 }, { height: '100%', larguraPx: 1 }, pai))
  assert.deepEqual([alt.de, alt.para], [{ larguraPx: 1, alturaPx: 0 }, { larguraPx: 1, alturaPx: 400 }])
  const f2 = []
  const alt2 = N(itemMov(['largura', 'altura'], { height: '0%', larguraPx: 1 }, { height: '100%', larguraPx: 1 }), { ficou: f2 })
  assert.deepEqual([alt2.de, alt2.para, f2.map((f) => f.falta)], [{ larguraPx: 1, alturaPx: 0 }, { larguraPx: 1, altura: '100%' }, ['caixaPai']])
  assert.deepEqual(N(itemMov(['largura'], null, { width: '100%' }, pai)).para, { larguraPx: 1200 })
  // svh pela tela do inventário
  assert.deepEqual(N(itemMov(['posicao-y'], null, { top: '50svh' })).para, { yPx: 450 })
  assert.deepEqual(N(itemMov(['posicao-y'], { yPx: -450 }, { top: '0svh' })).para, { yPx: 0 })
  assert.deepEqual(N(itemMov(['posicao-x'], null, { x: '10vw' })).para, { xPx: 144 })
  // em pela fonte do próprio alvo, quando ela veio
  assert.deepEqual(N(itemMov(['espaco-entre-letras'], null, { entreLetras: '0.2em' }, { fontePx: 40 })).para, { entreLetrasPx: 8 })
  // GSAP com função, calc() e relativo: fica como está, sem deOriginal
  for (const v of ['funcao', 'calc(100% - 20px)', '+=40']) {
    const f = N(itemMov(['posicao-x'], { x: v }, null, caixa))
    assert.deepEqual([f.de, f.deOriginal], [{ x: v }, undefined])
  }
  // rodar de novo não refaz
  assert.deepEqual(N(gs), gs)
})

test('normalizarItens + extremosQueFaltam do comparador: os itens reais que pediam extremos à mão passam a ter, menos "funcao"', async () => {
  const { extremosQueFaltam } = await import(pathToFileURL(path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-revisao', 'scripts', 'comparar-movimento.mjs')).href)
  const caixa = { caixa: { larguraPx: 400, alturaPx: 507 }, caixaPai: { larguraPx: 1, alturaPx: 820 } }
  const itens = [
    itemMov(['posicao-y'], { top: '0px' }, { top: '-72px' }),
    itemMov(['posicao-y'], { yPorcento: 180 }, { yPorcento: -15 }, caixa),
    itemMov(['posicao-y', 'opacidade'], { opacidade: 0, yPorcento: 10 }, null, caixa),
    itemMov(['posicao-y'], null, { top: '50svh' }),
    itemMov(['posicao-x', 'posicao-y'], null, { x: '-1.25rem', yPx: 0 }),
    itemMov(['largura'], null, { largura: '35rem' }),
    itemMov(['posicao-x', 'opacidade'], { opacidade: 0, xPorcento: -20 }, null, caixa),
    itemMov(['largura', 'altura'], { height: '0%', larguraPx: 1 }, { height: '100%', larguraPx: 1 }, caixa),
  ]
  const funcao = itemMov(['posicao-x'], { x: 'funcao' }, null, caixa)
  for (const it of [...itens, funcao]) assert.ok(extremosQueFaltam(it).length > 0, `antes já tinha: ${JSON.stringify(it)}`)
  const { itens: depois } = M.normalizarItens([...itens, funcao], { tela: tela1440, paginas: [{ id: 'inicio', raizPx: 16 }] })
  for (const it of depois.slice(0, -1)) assert.deepEqual(extremosQueFaltam(it), [], JSON.stringify(it))
  assert.deepEqual(extremosQueFaltam(depois.at(-1)), ['posicao-x'])
  // o de/para normalizado vale número no comparador (yPorcento 180 de uma caixa de 507 px = 912,6 px)
  assert.deepEqual([depois[1].de, depois[7].para], [{ yPx: 912.6 }, { larguraPx: 1, alturaPx: 820 }])
})
