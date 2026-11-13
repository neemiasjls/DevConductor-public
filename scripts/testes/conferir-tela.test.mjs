import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const skill = path.join(raiz, 'plugins/design-sistemas/skills/ui-sistemas')
const script = path.join(skill, 'scripts/conferir-tela.mjs')
const dados = path.join(raiz, 'scripts/testes/dados/telas')
const modelo = JSON.parse(fs.readFileSync(path.join(skill, 'modelos/design-sistemas.json'), 'utf8'))
const R = await import(pathToFileURL(path.join(skill, 'scripts/regras-tela.mjs')).href)
const { contraste } = await import(pathToFileURL(path.join(raiz, 'plugins/landing-pages/skills/lp-referencias/scripts/raio-x.mjs')).href)
const { acharNavegador } = await import(pathToFileURL(path.join(raiz, 'plugins/landing-pages/skills/lp-revisao/scripts/celular.mjs')).href)
const C = await import(pathToFileURL(script).href)
const { lerNiveis } = await import(pathToFileURL(path.join(skill, 'scripts/consistencia.mjs')).href)
const niveis = lerNiveis()
const letra = modelo.letra

function temp (t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'conferir-tela-'))
  t.after(() => { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} })
  return d
}
function gravarConfig (pasta, telas, extra = {}) {
  const arq = path.join(pasta, 'design-sistemas.json')
  fs.writeFileSync(arq, JSON.stringify({ ...modelo, telas, ...extra }, null, 2))
  return arq
}
const regras = (r) => r.achados.map((a) => a.regra)

// ---------- regras puras ----------
test('tela: parametrosDaTela devolve o que vai ao Chrome nos dois tamanhos', () => {
  const pc = R.parametrosDaTela('computador', '130.0.0.0')
  assert.deepEqual(pc.metricas, { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  assert.deepEqual(pc.toque, { enabled: false })
  assert.match(pc.agente, /Windows NT 10\.0/)
  assert.doesNotMatch(pc.agente, /Mobile|Android/)
  const cel = R.parametrosDaTela('celular', '130.0.0.0')
  assert.deepEqual(cel.metricas, { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  assert.deepEqual(cel.toque, { enabled: true, maxTouchPoints: 5 })
  assert.match(cel.agente, /Android.*HeadlessChrome\/130\.0\.0\.0 Mobile Safari/)
  assert.throws(() => R.parametrosDaTela('tablet'))
})

test('tela: fundo composto soma a transparência dos ancestrais', () => {
  assert.deepEqual(R.fundoComposto([]), [255, 255, 255, 1])
  assert.deepEqual(R.fundoComposto([[0, 0, 0, 0.5]]), [127.5, 127.5, 127.5, 1])
  // de dentro para fora: meia transparência preta sobre azul opaco
  assert.deepEqual(R.fundoComposto([[0, 0, 0, 0.5], [0, 0, 200, 1]]), [0, 0, 100, 1])
})

test('tela: rolagem lateral da página reprova; conteúdo que cabe passa', () => {
  assert.deepEqual(R.avaliarRolagem({ pagina: { larguraConteudo: 600, larguraTela: 390, culpados: ['main > div'] } }).achados.map((a) => a.regra), ['rolagem-lateral'])
  assert.equal(R.avaliarRolagem({ pagina: { larguraConteudo: 390, larguraTela: 390, culpados: [] } }).achados.length, 0)
})

test('tela: elemento cortado reprova; truncado de propósito passa só com o texto inteiro acessível', () => {
  assert.equal(R.avaliarCortados({ cortados: [{ seletor: 'span', texto: 'x', por: 'div' }] }).achados[0].regra, 'elemento-cortado')
  assert.equal(R.avaliarCortados({ cortados: [{ seletor: 'p', texto: 'x', por: 'si mesmo', deliberado: true, acessivel: true }] }).achados.length, 0)
  const sem = R.avaliarCortados({ cortados: [{ seletor: 'p', texto: 'x', por: 'si mesmo', deliberado: true, acessivel: false }] }).achados
  assert.deepEqual(sem.map((a) => a.regra), ['elemento-cortado'])
  assert.match(sem[0].texto, /truncado.*sem o texto inteiro/)
  assert.equal(R.avaliarCortados({ cortados: [] }).achados.length, 0)
})

test('tela: letra mínima nos dois aparelhos e campo mínimo no celular', () => {
  const m = { textos: [{ seletor: 'p', texto: 'a', px: 11 }], campos: [{ seletor: 'input', px: 14 }] }
  assert.deepEqual(R.avaliarLetra(m, 'computador', letra).achados.map((a) => a.seletor), ['p'])
  // texto comum de 11 px também reprova no celular (minimoPx vale lá); o campo de 14 px pede 16 px no celular
  assert.deepEqual(R.avaliarLetra(m, 'celular', letra).achados.map((a) => a.seletor), ['p', 'input'])
  assert.deepEqual(R.avaliarLetra({ textos: [{ seletor: 'small', texto: 'a', px: 10 }] }, 'celular', letra).achados.map((a) => a.seletor), ['small'])
  const ok = { textos: [{ seletor: 'p', texto: 'a', px: 12 }], campos: [{ seletor: 'input', px: 16 }] }
  assert.equal(R.avaliarLetra(ok, 'computador', letra).achados.length, 0)
  assert.equal(R.avaliarLetra(ok, 'celular', letra).achados.length, 0)
  // só campo em que se digita pede 16 px no celular; botão com role=combobox (SelectTrigger) segue o mínimo geral
  const gatilho = (px) => ({ campos: [{ seletor: '#cidade', px, digita: false }] })
  assert.equal(R.avaliarLetra(gatilho(14), 'celular', letra).achados.length, 0)
  assert.deepEqual(R.avaliarLetra(gatilho(11), 'celular', letra).achados.map((a) => a.seletor), ['#cidade'])
  assert.deepEqual(R.avaliarLetra({ campos: [{ seletor: '#busca', px: 14, digita: true }] }, 'celular', letra).achados.map((a) => a.seletor), ['#busca'])
})

test('tela: toque menor que 44 px só reprova no celular; link no meio do texto fica fora', () => {
  const m = { alvos: [{ seletor: 'button', w: 40, h: 24 }, { seletor: 'p > a', w: 30, h: 20, emLinha: true }, { seletor: 'a', w: 120, h: 44 }] }
  assert.deepEqual(R.avaliarToque(m, 'celular').achados.map((a) => a.seletor), ['button'])
  assert.equal(R.avaliarToque(m, 'computador').achados.length, 0)
})

test('tela: contraste do texto, texto grande, desabilitado, imagem e borda de campo', () => {
  const branco = [[255, 255, 255, 1]]
  const t = (cor, px = 16, peso = 400, extra = {}) => ({ textos: [{ seletor: 'p', texto: 'a', px, peso, cor, camadas: branco, ...extra }] })
  assert.equal(R.avaliarContraste(t([176, 176, 176, 1]), contraste).achados.length, 1) // ~2,1:1
  assert.equal(R.avaliarContraste(t([31, 41, 55, 1]), contraste).achados.length, 0)
  // #949494 (~3:1): reprova como texto comum, passa como texto grande (24 px ou 18,66 px negrito)
  assert.equal(R.avaliarContraste(t([148, 148, 148, 1]), contraste).achados.length, 1)
  assert.equal(R.avaliarContraste(t([148, 148, 148, 1], 24), contraste).achados.length, 0)
  assert.equal(R.avaliarContraste(t([148, 148, 148, 1], 18.7, 700), contraste).achados.length, 0)
  assert.equal(R.avaliarContraste(t([176, 176, 176, 1], 16, 400, { desabilitado: true }), contraste).achados.length, 0)
  const img = R.avaliarContraste(t([255, 255, 255, 1], 16, 400, { imagem: true }), contraste)
  assert.equal(img.achados.length, 0)
  assert.equal(img.naoMedido.length, 1)
  // texto preto sobre camada preta translúcida: o fundo composto escurece e reprova
  assert.equal(R.avaliarContraste({ textos: [{ seletor: 'p', texto: 'a', px: 16, peso: 400, cor: [68, 68, 68, 1], camadas: [[0, 0, 0, 0.6]] }] }, contraste).achados.length, 1)
  const campo = (borda, fundo = [255, 255, 255, 1]) => ({ campos: [{ seletor: 'input', px: 16, borda, fundo, camadas: branco }] })
  assert.equal(R.avaliarContraste(campo([229, 231, 235, 1]), contraste).achados.length, 1) // borda clara demais
  assert.equal(R.avaliarContraste(campo([107, 114, 128, 1]), contraste).achados.length, 0)
  assert.equal(R.avaliarContraste(campo(null, [75, 85, 99, 1]), contraste).achados.length, 0) // campo marcado pelo fundo
})

test('tela: opacidade do texto e dos ancestrais entra no contraste; imagem sem cobertura é não medido', () => {
  const branco = { fundo: [255, 255, 255, 1], opacidade: 1 }
  const nada = (opacidade = 1) => ({ fundo: [0, 0, 0, 0], opacidade })
  const txt = (pilha, cor = [0, 0, 0, 1]) => ({ textos: [{ seletor: 'p', texto: 'a', px: 16, peso: 400, cor, pilha }] })
  // preto opaco passa; preto com opacity .1 no próprio texto ou num ancestral reprova (~1,2:1)
  assert.equal(R.avaliarContraste(txt([nada(), branco]), contraste).achados.length, 0)
  assert.equal(R.avaliarContraste(txt([nada(0.1), branco]), contraste).achados.length, 1)
  assert.equal(R.avaliarContraste(txt([nada(), nada(0.1), branco]), contraste).achados.length, 1)
  // grupo opaco (fundo preto + texto branco) a .5 sobre branco: fundo cinza médio e texto branco: reprova
  assert.equal(R.avaliarContraste(txt([{ fundo: [0, 0, 0, 1], opacidade: 0.5 }, branco], [255, 255, 255, 1]), contraste).achados.length, 1)
  assert.deepEqual(R.corVista([{ fundo: [0, 0, 0, 1], opacidade: 0.5 }, branco]), [127.5, 127.5, 127.5, 1])
  // fundo de imagem coberto por camada opaca é medido; descoberto (ou atrás de opacidade) é não medido
  const img = { fundo: null, opacidade: 1, imagem: true }
  assert.equal(R.avaliarContraste(txt([branco, img]), contraste).achados.length, 0)
  const solto = R.avaliarContraste(txt([nada(), img]), contraste)
  assert.equal(solto.achados.length, 0)
  assert.equal(solto.naoMedido.length, 1)
  assert.equal(R.avaliarContraste(txt([{ fundo: [255, 255, 255, 1], opacidade: 0.5 }, img]), contraste).naoMedido.length, 1)
  // campo: borda escura com opacity .2 no campo fica clara demais
  const campo = (op) => ({ campos: [{ seletor: 'input', px: 16, borda: [107, 114, 128, 1], pilha: [{ fundo: [255, 255, 255, 1], opacidade: op }, branco] }] })
  assert.equal(R.avaliarContraste(campo(1), contraste).achados.length, 0)
  assert.equal(R.avaliarContraste(campo(0.2), contraste).achados.length, 1)
})

test('tela: nome acessível vazio reprova; ignorado pelo Chrome fica fora; não lido é não medido', () => {
  const r = R.avaliarNomes({ controles: [{ seletor: 'button', tipo: 'button', nome: '' }, { seletor: 'a', tipo: 'a', nome: 'Ajuda' }, { seletor: 'input', tipo: 'input', ignorado: true }, { seletor: 'select', tipo: 'select' }] })
  assert.deepEqual(r.achados.map((a) => a.seletor), ['button'])
  assert.deepEqual(r.naoMedido.map((a) => a.seletor), ['select'])
})

test('tela: tabela sem cabeçalho reprova; grade com columnheader passa; lista virtual é aviso', () => {
  const r = R.avaliarTabelas({ tabelas: [{ seletor: 'table', tipo: 'table', temCabecalho: false }, { seletor: 'div', tipo: 'grid', temCabecalho: true }] })
  assert.deepEqual(r.achados.map((a) => a.seletor), ['table'])
  assert.equal(R.avaliarListaVirtual({ virtuais: [{ seletor: 'div' }] }).achados[0].regra, 'lista-virtual')
  assert.equal(R.avaliarListaVirtual({ virtuais: [] }).achados.length, 0)
})

test('tela: exceção apaga só a mesma regra na mesma tela e seletor; "nunca passa" não aceita; saída 0/1/2', () => {
  const achados = [
    { regra: 'letra-minima', nivel: niveis['letra-minima'], tela: 'pedidos', seletor: 'p' },
    { regra: 'contraste', nivel: niveis.contraste, tela: 'pedidos', seletor: 'p' }
  ]
  const exc = [
    { regra: 'letra-minima', arquivo: 'pedidos', local: 'p', motivo: 'rodapé legal' },
    { regra: 'contraste', arquivo: 'pedidos', local: 'p', motivo: 'tentativa' }
  ]
  const { restantes, ignoradas } = R.aplicarExcecoes(achados, exc, niveis)
  assert.deepEqual(restantes.map((a) => a.regra), ['contraste'])
  assert.deepEqual(ignoradas.map((e) => e.regra), ['contraste'])
  assert.equal(R.aplicarExcecoes([achados[0]], [{ ...exc[0], arquivo: 'clientes' }], niveis).restantes.length, 1)
  assert.deepEqual(R.aplicarExcecoes([achados[0]], [exc[0]], niveis).avisos.map((e) => e.local), ['p'])
  assert.equal(R.saidaDe([], []), 0)
  assert.equal(R.saidaDe([{ nivel: 'aviso' }], []), 0)
  assert.equal(R.saidaDe([{ nivel: 'aviso' }], [{ motivo: 'x' }]), 2)
  assert.equal(R.saidaDe([{ nivel: 'nunca passa' }], [{ motivo: 'x' }]), 1)
})

test('tela: exceção pode delimitar estado e aparelho; seletor só de tags sai com aviso', () => {
  const a = (estado, tamanho) => ({ regra: 'letra-minima', nivel: niveis['letra-minima'], tela: 'pedidos', seletor: '#nota', estado, tamanho })
  const todos = [a('normal', 'computador'), a('normal', 'celular'), a('vazio', 'computador'), a('vazio', 'celular')]
  const base = { regra: 'letra-minima', arquivo: 'pedidos', local: '#nota', motivo: 'nota legal' }
  const sobra = (e) => R.aplicarExcecoes(todos, [e], niveis).restantes.map((x) => `${x.estado}/${x.tamanho}`)
  assert.deepEqual(sobra(base), [])
  assert.deepEqual(sobra({ ...base, estado: 'vazio' }), ['normal/computador', 'normal/celular'])
  assert.deepEqual(sobra({ ...base, aparelho: 'celular' }), ['normal/computador', 'vazio/computador'])
  assert.deepEqual(sobra({ ...base, estado: 'vazio', aparelho: 'celular' }), ['normal/computador', 'normal/celular', 'vazio/computador'])
  // seletor com #id: sem aviso; só tags e posição: a exceção vale, mas avisa pedindo um id
  assert.equal(R.aplicarExcecoes(todos, [base], niveis).avisos.length, 0)
  const generico = [{ ...a('normal', 'computador'), seletor: 'main > p:nth-of-type(2)' }]
  const r = R.aplicarExcecoes(generico, [{ ...base, local: 'main > p:nth-of-type(2)' }], niveis)
  assert.equal(r.restantes.length, 0)
  assert.equal(r.avisos.length, 1)
  assert.match(r.avisos[0].porque, /id/)
  assert.equal(R.seletorGenerico('main > p'), true)
  assert.equal(R.seletorGenerico('#pedidos > p'), false)
})

test('tela: todo item do conferidor está na régua, com o nível de lá', () => {
  for (const id of C.ITENS) assert.ok(niveis[id], `régua sem ${id}`)
  assert.equal(niveis['lista-virtual'], 'aviso')
  assert.equal(niveis.contraste, 'nunca passa')
  assert.equal(niveis['nome-acessivel'], 'nunca passa')
  assert.equal(niveis['rolagem-lateral'], 'nunca passa')
})

// ---------- sem configuração, sem Chrome, sem landing-pages: saída 2 ----------
function rodarSync (args, { env = {}, cwd = raiz, exe = script } = {}) {
  const r = spawnSync(process.execPath, [exe, ...args, '--json'], { encoding: 'utf8', cwd, env: { ...process.env, ...env } })
  return { saida: r.status, ...JSON.parse(r.stdout) }
}

test('tela: sem configuração, sem Chrome ou sem landing-pages dá 2 (nunca "passou")', (t) => {
  const d = temp(t)
  const semConfig = rodarSync(['--base', 'http://127.0.0.1:9'], { cwd: d })
  assert.equal(semConfig.saida, 2)
  assert.match(semConfig.naoConferido[0].motivo, /design-sistemas\.json/)

  const cfg = gravarConfig(d, { limpa: '/limpa.html' })
  const semChrome = rodarSync(['--config', cfg, '--base', 'http://127.0.0.1:9'], { env: { BROWSER_EXECUTABLE: path.join(d, 'nao-existe.exe') } })
  assert.equal(semChrome.saida, 2)
  assert.ok(semChrome.naoConferido.some((n) => /Chrome/.test(n.motivo)))

  // cópia da skill sem o plugin landing-pages ao lado
  const copia = path.join(d, 'plugins', 'design-sistemas', 'skills', 'ui-sistemas')
  fs.cpSync(skill, copia, { recursive: true })
  const semLp = rodarSync(['--config', cfg, '--base', 'http://127.0.0.1:9'], { exe: path.join(copia, 'scripts', 'conferir-tela.mjs') })
  assert.equal(semLp.saida, 2)
  assert.ok(semLp.naoConferido.some((n) => /landing-pages/.test(n.motivo)))

  const invalida = path.join(d, 'invalida.json')
  fs.writeFileSync(invalida, JSON.stringify({ ...modelo, telas: { limpa: '/limpa.html' }, desconhecido: 1 }))
  const inv = rodarSync(['--config', invalida, '--base', 'http://127.0.0.1:9'])
  assert.equal(inv.saida, 2)
  assert.match(inv.naoConferido[0].motivo, /inválida/)
})

// ---------- contrato de estados (puro) ----------
test('estados: contrato da tela usa o padrão e deixa a tela trocar; sem lista não pede estado', () => {
  assert.equal(R.contratoDaTela({}, 'pedidos'), null)
  assert.equal(R.contratoDaTela({ porTela: { outra: { lista: ['normal'] } } }, 'pedidos'), null)
  const c = R.contratoDaTela({ porTela: { pedidos: { lista: ['normal', 'erro'] } } }, 'pedidos')
  assert.deepEqual(c, { lista: ['normal', 'erro'], ...R.ESTADOS_PADRAO })
  const proprio = R.contratoDaTela({ confirmar: '.e-{estado}', porTela: { pedidos: { lista: ['erro'], pedir: '#{estado}', tentarDeNovo: '#de-novo' } } }, 'pedidos')
  assert.deepEqual(proprio, { lista: ['erro'], pedir: '#{estado}', confirmar: '.e-{estado}', tentarDeNovo: '#de-novo' })
})

test('estados: endereço, seletor e nome do print', () => {
  assert.equal(R.enderecoDoEstado('http://h/pedidos', '?estado={estado}', 'erro'), 'http://h/pedidos?estado=erro')
  assert.equal(R.enderecoDoEstado('http://h/p.html?modo=x', '?estado={estado}', 'vazio'), 'http://h/p.html?modo=x&estado=vazio')
  assert.equal(R.enderecoDoEstado('http://h/p?estado=a', '?estado={estado}', 'b'), 'http://h/p?estado=b')
  assert.equal(R.enderecoDoEstado('http://h/p', '#{estado}', 'erro'), 'http://h/p#erro')
  assert.equal(R.enderecoDoEstado('http://h/app/p', '/demo/{estado}', 'erro'), 'http://h/demo/erro')
  assert.equal(R.seletorDoEstado('[data-estado="{estado}"]', 'vazio'), '[data-estado="vazio"]')
  assert.equal(R.nomeDoPrint('computador', 'pedidos', 'erro'), 'computador-pedidos-erro.png')
  assert.equal(R.nomeDoPrint('celular', 'pedidos', null), 'celular-pedidos.png')
})

test('estados: estabilidade pede o estado presente e 1 s sem mudança, até 10 s', () => {
  const lendo = (fn, ate = 12000) => Array.from({ length: ate / 200 + 1 }, (_, i) => ({ t: i * 200, ...fn(i * 200) }))
  const ok = R.estabilidade(lendo((t) => ({ presente: t >= 600, assinatura: 1 })))
  assert.deepEqual(ok, { confirmado: true, estavel: true, quando: 1600 })
  assert.deepEqual(R.estabilidade(lendo(() => ({ presente: false }))), { confirmado: false, estavel: false, quando: null })
  const mexe = R.estabilidade(lendo((t) => ({ presente: true, assinatura: t })))
  assert.deepEqual(mexe, { confirmado: true, estavel: false, quando: null })
  // aparece só depois do limite: não vale
  assert.equal(R.estabilidade(lendo((t) => ({ presente: t > 10000, assinatura: 1 }))).estavel, false)
  assert.equal(R.avaliarEstado('erro', 's', ok), null)
  assert.equal(R.avaliarEstado('erro', 's', { confirmado: false, estavel: false }).regra, 'estado-confirmado')
  assert.equal(R.avaliarEstado('erro', 's', { confirmado: true, estavel: false }).regra, 'estado-estavel')
  for (const regra of ['estado-confirmado', 'estado-estavel', 'tentar-de-novo', 'tela-em-branco']) assert.equal(niveis[regra], 'nunca passa', regra)
})

test('estados: tela sem texto visível reprova; com texto passa', () => {
  assert.deepEqual(R.avaliarBranco({ textos: [] }).achados.map((a) => a.regra), ['tela-em-branco'])
  assert.equal(R.avaliarBranco({ textos: [{ texto: 'Pedidos' }] }).achados.length, 0)
})

test('estados: o vazio precisa de texto fora do título; só "Pedidos" reprova', () => {
  assert.deepEqual(R.avaliarVazio('vazio', 'm', []).achados.map((a) => a.regra), ['tela-em-branco'])
  assert.equal(R.avaliarVazio('vazio', 'm', ['Nenhum pedido ainda.']).achados.length, 0)
  assert.equal(R.avaliarVazio('normal', 'm', []).achados.length, 0)
  assert.equal(R.avaliarVazio(null, 'body', []).achados.length, 0)
})

test('estados: nomes de print que colidem são apontados antes de fotografar', () => {
  const c = R.colisoesDePrint([{ tela: 'pedidos-erro', estado: 'normal' }, { tela: 'pedidos', estado: 'erro-normal' }, { tela: 'pedidos', estado: 'vazio' }])
  assert.deepEqual(Object.keys(c), ['pedidos-erro-normal.png'])
  assert.equal(c['pedidos-erro-normal.png'].length, 2)
  assert.deepEqual(R.colisoesDePrint([{ tela: 'pedidos', estado: 'erro' }, { tela: 'clientes', estado: 'erro' }, { tela: 'a', estado: null }]), {})
  assert.equal(R.ESPERA_ESTADO.carregar > 0, true)
})

// ---------- rodada real no Chrome ----------
const navegador = acharNavegador()
const SEM = !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)'

function servir (t) {
  const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8' }
  const srv = http.createServer((req, res) => {
    const nome = path.basename(decodeURIComponent(new URL(req.url, 'http://x').pathname))
    if (nome === 'pendura.png') return // nunca responde: a página não termina de carregar
    if (nome === 'pendura.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"><title>Lenta</title></head><body><main><h1>Lenta</h1><p>Texto da tela lenta.</p><img src="pendura.png" alt="x"></main></body></html>'); return }
    const arq = path.join(dados, nome)
    if (!nome || !fs.existsSync(arq)) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'content-type': tipos[path.extname(arq)] || 'application/octet-stream' })
    res.end(fs.readFileSync(arq))
  })
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => {
    t.after(() => new Promise((f) => { srv.closeAllConnections?.(); srv.close(f) }))
    ok(`http://127.0.0.1:${srv.address().port}`)
  }))
}

// fixture -> [regra esperada, nível, saída da tela]
const CASOS = {
  limpa: [null, null, 0],
  rolagem: ['rolagem-lateral', 'nunca passa', 1],
  cortado: ['elemento-cortado', 'exige justificativa', 1],
  letra: ['letra-minima', 'exige justificativa', 1],
  'campo-celular': ['letra-minima', 'exige justificativa', 1],
  toque: ['toque-minimo', 'exige justificativa', 1],
  contraste: ['contraste', 'nunca passa', 1],
  borda: ['contraste', 'nunca passa', 1],
  nome: ['nome-acessivel', 'nunca passa', 1],
  tabela: ['tabela-sem-cabecalho', 'exige justificativa', 1],
  virtual: ['lista-virtual', 'aviso', 0],
  opacidade: ['contraste', 'nunca passa', 1],
  combobox: ['letra-minima', 'exige justificativa', 1],
  'combobox-borda': ['contraste', 'nunca passa', 1],
  'toque-dentro': ['toque-minimo', 'exige justificativa', 1],
  truncado: [null, null, 0],
  'truncado-sem-acesso': ['elemento-cortado', 'exige justificativa', 1],
  imagem: [null, null, 2]
}

test('tela no Chrome: cada fixture aponta só o seu defeito, com a gravidade e a saída certas; a limpa dá 0', { skip: SEM, timeout: 300_000 }, async (t) => {
  const base = await servir(t)
  const d = temp(t)
  const cfg = gravarConfig(d, Object.fromEntries(Object.keys(CASOS).map((k) => [k, `/${k}.html`])))
  const r = await C.conferir({ config: cfg, base })
  const abertas = r.telas.length
  assert.equal(abertas, Object.keys(CASOS).length * 2, JSON.stringify(r.naoConferido))
  // sem contrato de estados: o layout é medido, mas cada tela registra a cobertura de estados como não conferida
  assert.equal(r.saida, 1)
  for (const id of Object.keys(CASOS)) assert.equal(r.naoConferido.filter((n) => n.tela === id && n.cobertura === 'estados').length, 1, id)
  for (const [id, [regra, nivel, saida]] of Object.entries(CASOS)) {
    const meus = r.achados.filter((a) => a.tela === id)
    // saída do layout (sem a cobertura de estados, que vale para todas e é conferida acima)
    const nc = r.naoConferido.filter((n) => n.tela === id && n.cobertura !== 'estados')
    const msg = `${id}: ${JSON.stringify(meus)} ${JSON.stringify(nc)}`
    if (regra) {
      assert.ok(meus.length > 0, msg)
      assert.deepEqual([...new Set(meus.map((a) => a.regra))], [regra], msg)
      assert.ok(meus.every((a) => a.nivel === nivel), msg)
    } else assert.equal(meus.length, 0, msg)
    if (id !== 'imagem') assert.equal(nc.length, 0, msg)
    else assert.ok(nc.length > 0 && nc.every((n) => /contraste/.test(n.motivo)), msg)
    assert.equal(R.saidaDe(meus, nc), saida, msg)
  }
  // tamanho certo: campo pequeno e toque só no celular; letra pequena só no computador
  assert.deepEqual([...new Set(r.achados.filter((a) => a.tela === 'campo-celular').map((a) => a.tamanho))], ['celular'])
  assert.deepEqual([...new Set(r.achados.filter((a) => a.tela === 'toque').map((a) => a.tamanho))], ['celular'])
  // letra comum pequena reprova nos dois aparelhos (minimoPx vale no celular)
  assert.deepEqual([...new Set(r.achados.filter((a) => a.tela === 'letra').map((a) => a.tamanho))].sort(), ['celular', 'computador'])
  // opacidade: o texto preto a .1 e o grupo a .3 reprovam no contraste
  assert.equal(r.achados.filter((a) => a.tela === 'opacidade' && a.tamanho === 'computador').length, 2)
  // campos personalizados: o SelectTrigger (botão com role=combobox) de 14 px passa no celular (não digita, não dá
  // zoom); o input com role=combobox e o select nativo de 14 px reprovam; contorno vale para os dois e para o contenteditable
  assert.deepEqual(r.achados.filter((a) => a.tela === 'combobox').map((a) => `${a.tamanho} ${a.seletor}`).sort(), ['celular #busca-cidade', 'celular #uf'])
  assert.deepEqual(r.achados.filter((a) => a.tela === 'combobox-borda' && a.tamanho === 'computador').map((a) => a.seletor).sort(), ['#cidade', '#obs'])
  // toque: botão dentro de cartão com tabindex=0 e campo com rótulo grande reprovam; caixa de marcar com rótulo passa
  assert.deepEqual(r.achados.filter((a) => a.tela === 'toque-dentro').map((a) => `${a.tamanho} ${a.seletor}`).sort(), ['celular #cod', 'celular #mini'])
  // nome: botão só com ícone e campo sem rótulo
  assert.equal(r.achados.filter((a) => a.tela === 'nome' && a.tamanho === 'computador').length, 2)
  console.log(`# casos de Chrome executados: ${abertas} telas abertas`)
})

function rodarAsync (args) {
  return new Promise((ok) => {
    const p = spawn(process.execPath, [script, ...args, '--json'], { cwd: raiz })
    let out = ''
    p.stdout.on('data', (c) => { out += c })
    p.on('close', (status) => ok({ saida: status, ...JSON.parse(out) }))
  })
}

// contrato mínimo para telas sem estados próprios: um estado só, confirmado pelo body visível e estável
const UM = { lista: ['normal'], confirmar: 'body' }

test('tela no Chrome: pela linha de comando, a limpa sem contrato sai 2 e com contrato sai 0, contraste sai 1 e exceção apaga só "exige justificativa"', { skip: SEM, timeout: 300_000 }, async (t) => {
  const base = await servir(t)
  const d = temp(t)
  const semContrato = gravarConfig(d, { limpa: '/limpa.html' })
  const antiga = await rodarAsync(['--config', semContrato, '--base', base])
  assert.equal(antiga.saida, 2, JSON.stringify(antiga))
  assert.deepEqual(antiga.achados, [])
  assert.ok(antiga.naoConferido.some((n) => n.cobertura === 'estados' && /sem contrato de estados/.test(n.motivo)), JSON.stringify(antiga.naoConferido))
  const cfg = gravarConfig(d, { limpa: '/limpa.html', contraste: '/contraste.html', letra: '/letra.html' }, { estados: { porTela: { limpa: UM, contraste: UM, letra: UM } } })
  const limpa = await rodarAsync(['--config', cfg, '--base', base, '--telas', 'limpa'])
  assert.equal(limpa.saida, 0, JSON.stringify(limpa))
  const ruim = await rodarAsync(['--config', cfg, '--base', base, '--telas', 'contraste'])
  assert.equal(ruim.saida, 1)
  assert.deepEqual([...new Set(regras(ruim))], ['contraste'])
  const letraAntes = await rodarAsync(['--config', cfg, '--base', base, '--telas', 'letra'])
  assert.equal(letraAntes.saida, 1)
  const alvo = letraAntes.achados[0]
  const cfg2 = gravarConfig(d, { letra: '/letra.html' }, { estados: { porTela: { letra: UM } }, excecoes: [{ regra: 'letra-minima', arquivo: 'letra', local: alvo.seletor, motivo: 'nota legal em letra pequena, aprovada' }] })
  const saidaPasta = path.join(d, 'saida')
  const letraDepois = await rodarAsync(['--config', cfg2, '--base', base, saidaPasta])
  assert.equal(letraDepois.saida, 0, JSON.stringify(letraDepois))
  assert.ok(fs.existsSync(path.join(saidaPasta, 'conferir-tela.json')))
  assert.match(fs.readFileSync(path.join(saidaPasta, 'conferir-tela.txt'), 'utf8'), /Saída 0/)
})

// ---------- estados no Chrome ----------
const juiz = await import(pathToFileURL(path.join(raiz, 'plugins/landing-pages/skills/lp-revisao/scripts/juiz.mjs')).href)
const TRES = { lista: ['normal', 'vazio', 'erro'] }

test('estados no Chrome: cada defeito aponta só a sua regra (nunca passa, saída 1)', { skip: SEM, timeout: 300_000 }, async (t) => {
  const base = await servir(t)
  const d = temp(t)
  const modos = { ignora: 'estado-confirmado', nada: 'tentar-de-novo', 'sem-fim': 'estado-estavel', branco: 'tela-em-branco' }
  const cfg = gravarConfig(d, Object.fromEntries(Object.keys(modos).map((m) => [m, `/estados.html?modo=${m}`])),
    { estados: { porTela: Object.fromEntries(Object.keys(modos).map((m) => [m, TRES])) } })
  const r = await C.conferir({ config: cfg, base, esperaEstado: { limite: 4000 } })
  for (const [id, regra] of Object.entries(modos)) {
    const meus = r.achados.filter((a) => a.tela === id)
    const nc = r.naoConferido.filter((n) => n.tela === id)
    const msg = `${id}: ${JSON.stringify(meus)} ${JSON.stringify(nc)}`
    assert.deepEqual([...new Set(meus.map((a) => a.regra))], [regra], msg)
    assert.ok(meus.every((a) => a.nivel === 'nunca passa'), msg)
    assert.deepEqual([...new Set(meus.map((a) => a.tamanho))].sort(), ['celular', 'computador'], msg)
    assert.equal(nc.length, 0, msg)
    assert.equal(R.saidaDe(meus, nc), 1, msg)
  }
  // o estado que a tela ignora é o pedido que não é "normal"; o "Tentar de novo" só no erro; o branco só no vazio
  assert.deepEqual([...new Set(r.achados.filter((a) => a.tela === 'ignora').map((a) => a.estado))].sort(), ['erro', 'vazio'])
  assert.deepEqual([...new Set(r.achados.filter((a) => a.tela === 'nada').map((a) => a.estado))], ['erro'])
  assert.deepEqual([...new Set(r.achados.filter((a) => a.tela === 'branco').map((a) => a.estado))], ['vazio'])
  assert.equal(r.saida, 1)
  console.log(`# casos de Chrome executados (estados com defeito): ${r.telas.length} telas medidas, ${r.achados.length} achados`)
})

// defeitos que o código antigo deixava passar: marcador escondido, mudança só de CSS, botão encoberto, saída do
// erro que não se sustenta, erro sem botão e vazio só com título
const MODOS_NOVOS = {
  oculto: ['estado-confirmado', ['erro', 'vazio']],
  pulsa: ['estado-estavel', ['erro', 'normal', 'vazio']],
  encoberto: ['tentar-de-novo', ['erro']],
  volta: ['tentar-de-novo', ['erro']],
  'sem-botao': ['tentar-de-novo', ['erro']],
  'so-titulo': ['tela-em-branco', ['vazio']],
  apaga: ['tentar-de-novo', ['erro']]
}

test('estados no Chrome: marcador visível, estabilidade com aparência, clique de verdade e vazio que se explica', { skip: SEM, timeout: 400_000 }, async (t) => {
  const base = await servir(t)
  const d = temp(t)
  const cfg = gravarConfig(d, Object.fromEntries(Object.keys(MODOS_NOVOS).map((m) => [m, `/estados.html?modo=${m}`])),
    { estados: { porTela: Object.fromEntries(Object.keys(MODOS_NOVOS).map((m) => [m, TRES])) } })
  const r = await C.conferir({ config: cfg, base, esperaEstado: { limite: 3000 } })
  for (const [id, [regra, estados]] of Object.entries(MODOS_NOVOS)) {
    const meus = r.achados.filter((a) => a.tela === id)
    const nc = r.naoConferido.filter((n) => n.tela === id)
    const msg = `${id}: ${JSON.stringify(meus)} ${JSON.stringify(nc)}`
    assert.deepEqual([...new Set(meus.map((a) => a.regra))], [regra], msg)
    assert.deepEqual([...new Set(meus.map((a) => a.estado))].sort(), estados, msg)
    assert.deepEqual([...new Set(meus.map((a) => a.tamanho))].sort(), ['celular', 'computador'], msg)
    assert.ok(meus.every((a) => a.nivel === 'nunca passa'), msg)
    assert.equal(nc.length, 0, msg)
  }
  assert.match(r.achados.find((a) => a.tela === 'encoberto').texto, /encoberto/)
  assert.match(r.achados.find((a) => a.tela === 'sem-botao').texto, /não há botão/)
  assert.match(r.achados.find((a) => a.tela === 'apaga').texto, /em branco/)
  assert.equal(r.saida, 1)
})

test('estados no Chrome: esqueleto pulsando e girador por CSS (repetição infinita) não reprovam; o resto da tela mexendo ainda reprova', { skip: SEM, timeout: 300_000 }, async (t) => {
  const base = await servir(t)
  const d = temp(t)
  const cfg = gravarConfig(d, { carrega: '/estados.html?esqueleto=1', 'carrega-mexe': '/estados.html?modo=sem-fim&esqueleto=1' },
    { estados: { porTela: { carrega: TRES, 'carrega-mexe': TRES } } })
  const r = await C.conferir({ config: cfg, base, esperaEstado: { limite: 3000 } })
  const limpa = [...r.achados, ...r.naoConferido].filter((a) => a.tela === 'carrega')
  assert.deepEqual(limpa, [], JSON.stringify(limpa))
  const mexe = r.achados.filter((a) => a.tela === 'carrega-mexe')
  assert.deepEqual([...new Set(mexe.map((a) => a.regra))], ['estado-estavel'], JSON.stringify(mexe))
  assert.equal(r.saida, 1)
})

test('estados no Chrome: página que não termina de carregar e tela sem contrato que não para de mudar ficam "não conferido"', { skip: SEM, timeout: 300_000 }, async (t) => {
  const base = await servir(t)
  const d = temp(t)
  const cfg = gravarConfig(d, { lenta: '/pendura.html', mexe: '/estados.html?modo=sem-fim' }, { estados: { porTela: { lenta: UM } } })
  const r = await C.conferir({ config: cfg, base, esperaEstado: { limite: 3000, carregar: 2500 } })
  const msg = JSON.stringify({ achados: r.achados, nc: r.naoConferido, telas: r.telas })
  assert.deepEqual(r.achados, [], msg)
  assert.deepEqual(r.telas, [], msg)
  assert.equal(r.naoConferido.filter((n) => n.tela === 'lenta' && /não terminou de carregar/.test(n.motivo)).length, 2, msg)
  assert.equal(r.naoConferido.filter((n) => n.tela === 'mexe' && /não parou de mudar/.test(n.motivo)).length, 2, msg)
  assert.equal(r.saida, 2)
})

test('estados no Chrome: nomes de print que colidem não sobrescrevem um ao outro', { skip: SEM, timeout: 300_000 }, async (t) => {
  const base = await servir(t)
  const d = temp(t)
  const cfg = gravarConfig(d, { 'pedidos-erro': '/estados.html', pedidos: '/estados.html' },
    { estados: { porTela: { 'pedidos-erro': { lista: ['normal'] }, pedidos: { lista: ['erro-normal', 'vazio'] } } } })
  const pasta = path.join(d, 'prints')
  const r = await C.conferir({ config: cfg, base, pasta })
  const msg = JSON.stringify({ achados: r.achados, nc: r.naoConferido })
  assert.equal(r.saida, 2, msg)
  assert.equal(r.naoConferido.filter((n) => /sairia igual/.test(n.motivo)).length, 2, msg)
  assert.deepEqual(fs.readdirSync(pasta).filter((f) => f.endsWith('.png')).sort(), ['celular-pedidos-vazio.png', 'computador-pedidos-vazio.png'])
})

test('estados no Chrome: a limpa dá 0, grava um print por aparelho x tela x estado e o juiz pareia 12 pares', { skip: SEM, timeout: 300_000 }, async (t) => {
  const base = await servir(t)
  const d = temp(t)
  const cfg = gravarConfig(d, { pedidos: '/estados.html', clientes: '/estados.html?lista=clientes' },
    { estados: { porTela: { pedidos: TRES, clientes: TRES } } })
  const versoes = []
  for (const v of ['antes', 'depois']) {
    const pasta = path.join(d, v)
    const r = await C.conferir({ config: cfg, base, pasta })
    assert.equal(r.saida, 0, JSON.stringify({ achados: r.achados, nc: r.naoConferido }))
    assert.equal(r.telas.length, 12)
    const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.png')).sort()
    const esperados = ['computador', 'celular'].flatMap((a) => ['pedidos', 'clientes'].flatMap((tl) => TRES.lista.map((e) => `${a}-${tl}-${e}.png`))).sort()
    assert.deepEqual(arquivos, esperados)
    for (const f of arquivos) assert.equal(fs.readFileSync(path.join(pasta, f)).readUInt32BE(0), 0x89504e47, f)
    // conteúdo: os três estados de uma tela dão imagens diferentes, e a mesma página no mesmo estado dá a mesma
    // imagem nas duas telas (pedidos e clientes abrem o mesmo arquivo): o print é do estado pedido, não de outro
    const ler = (f) => fs.readFileSync(path.join(pasta, f))
    for (const a of ['computador', 'celular']) {
      for (const tl of ['pedidos', 'clientes']) {
        const [n, v, e] = TRES.lista.map((s) => ler(`${a}-${tl}-${s}.png`))
        assert.ok(!n.equals(v) && !n.equals(e) && !v.equals(e), `${a}-${tl}: estados com o mesmo print`)
      }
      for (const s of TRES.lista) assert.ok(ler(`${a}-pedidos-${s}.png`).equals(ler(`${a}-clientes-${s}.png`)), `${a} ${s}: print de outro estado`)
    }
    versoes.push(pasta)
  }
  const [a, b] = versoes.map((p) => juiz.listarPrints(p))
  const { telas, fora } = juiz.parear(a, b)
  assert.deepEqual(fora, [])
  const pares = Object.values(telas).flat()
  assert.equal(pares.length, 12)
  assert.equal(new Set(pares.map((p) => p.nosso)).size, 12)
  assert.equal(new Set(Object.entries(telas).flatMap(([tl, ps]) => ps.map((p) => `${tl}/${p.referencia}`))).size, 12)
  const sorteio = juiz.sortear(Object.keys(telas), 7)
  assert.ok(sorteio.length >= 3)
  for (const j of sorteio) assert.deepEqual(Object.keys(j.telas).sort(), ['celular', 'computador'])
  console.log(`# casos de Chrome executados (estados limpos): 2 versões x 12 prints`)
})
