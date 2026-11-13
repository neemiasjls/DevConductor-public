// Testa os quadros no tempo (movimento-quadros.mjs): comparação de quadros, proteção da pasta de saída e, num site
// local pequeno, o que aparece ao carregar, o que mexe sozinho e a rolagem lida de verdade em quatro jeitos de rolar.
// Roda com: node --test scripts/testes/movimento-quadros.test.mjs   (teste de navegador: um por vez na máquina)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pastaScripts = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts')
const { acharNavegador, abrirNavegador, decodificarPng } = await import(pathToFileURL(path.join(pastaScripts, 'raio-x.mjs')).href)
const { protegerSaida, diferencaQuadros, regioesAtivas, mudancasDeCss, gravar, capturarCarregar, capturarParado, capturarRolagem, rolarAte,
  rolarPaginaToda, montarFolha, ganchosAntes, GATILHOS, MUDANCAS, espalhar } = await import(pathToFileURL(path.join(pastaScripts, 'movimento-quadros.mjs')).href)
const dados = path.join(raiz, 'scripts', 'testes', 'dados', 'movimento')

const quadro = (largura, altura, pintar) => {
  const px = Buffer.alloc(largura * altura * 3, 255)
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) { const c = pintar(x, y); if (c) px.set(c, (y * largura + x) * 3) }
  return { largura, altura, canais: 3, px }
}

test('listas fixas do contrato', () => {
  assert.deepEqual(GATILHOS, ['carregar', 'parado', 'rolagem', 'mouse', 'toque', 'clique', 'troca-de-pagina', 'cabecalho', 'rodape'])
  assert.equal(MUDANCAS.length, 16)
  assert.ok(MUDANCAS.includes('desfoque') && MUDANCAS.includes('canvas'))
})

test('espalhar: mais de 24 dá 24 espalhados pela lista toda, com o primeiro e o último, na ordem e sem repetir', () => {
  const l = Array.from({ length: 40 }, (_, k) => k)
  const e = espalhar(l, 24)
  assert.equal(e.length, 24)
  assert.deepEqual([e[0], e.at(-1)], [0, 39])
  assert.ok(e.every((v, k) => k === 0 || v > e[k - 1]), 'fora de ordem ou repetido: ' + e.join(','))
  assert.ok(e.some((v) => v > 30) && e.some((v) => v > 10 && v < 30), 'não cobre o meio e o fim: ' + e.join(','))
  const curta = [1, 2, 3]
  const c = espalhar(curta, 24)
  assert.deepEqual(c, curta)
  assert.notEqual(c, curta, 'devolve cópia, não a própria lista')
  assert.deepEqual([espalhar(l, 1), espalhar(l, 0), espalhar([], 24)], [[0], [], []])
})

test('diferencaQuadros: total e célula certa; quadros iguais dão zero; tamanhos diferentes dão tudo', () => {
  const a = quadro(80, 80, () => null)
  const b = quadro(80, 80, (x, y) => (x >= 40 && x < 50 && y >= 20 && y < 30 ? [0, 0, 0] : null)) // célula (4,2) da grade 8
  const d = diferencaQuadros(a, b)
  assert.equal(d.grade, 8)
  assert.equal(d.celulas.length, 64)
  assert.equal(d.celulas[2 * 8 + 4], 1)
  assert.equal(d.celulas.filter((v) => v > 0).length, 1)
  assert.ok(Math.abs(d.total - 100 / 6400) < 1e-9, String(d.total))
  assert.equal(diferencaQuadros(a, a).total, 0)
  assert.equal(diferencaQuadros(a, quadro(40, 80, () => null)).total, 1)
  // mudança pequena de cor (ruído) não conta
  assert.equal(diferencaQuadros(a, quadro(80, 80, () => [252, 252, 252])).total, 0)
  const regs = regioesAtivas(d.celulas, 8)
  assert.equal(regs.length, 1)
  assert.deepEqual([regs[0].x, regs[0].y, regs[0].w, regs[0].h], [0.5, 0.25, 0.125, 0.125])
})

test('mudancasDeCss: propriedades da animação viram a lista fixa', () => {
  assert.deepEqual(mudancasDeCss([{ prop: 'transform', valores: ['translateX(0px)', 'translateX(260px)'] }, { prop: 'opacity', valores: ['1', '0.35'] }]), ['posicao-x', 'opacidade'])
  assert.deepEqual(mudancasDeCss([{ prop: 'filter', valores: ['blur(0px) brightness(1)', 'blur(12px) brightness(0.4)'] }, { prop: 'clipPath', valores: ['inset(0)', 'inset(50%)'] }]), ['desfoque', 'brilho', 'recorte'])
  assert.deepEqual(mudancasDeCss([{ prop: 'transform', valores: ['rotate(0deg) scale(1)', 'rotate(90deg) scale(2)'] }]), ['escala', 'rotacao'])
})

test('protegerSaida: arquivo gravado numa pasta protegida dentro do repositório fica fora do git', () => {
  const pasta = path.join(dados, `tmp-protegida-${process.pid}`)
  try {
    const arq = protegerSaida(pasta)
    assert.equal(fs.readFileSync(arq, 'utf8'), '*\n')
    fs.mkdirSync(path.join(pasta, 'quadros', 'brutos'), { recursive: true })
    const quadroSalvo = path.join(pasta, 'quadros', 'brutos', '0001.png')
    fs.writeFileSync(quadroSalvo, 'x')
    const git = spawnSync('git', ['check-ignore', '-q', quadroSalvo], { cwd: raiz })
    if (git.error) return // sem git na máquina não há o que conferir
    assert.equal(git.status, 0, 'git check-ignore não aceitou o arquivo da pasta protegida')
    assert.equal(spawnSync('git', ['check-ignore', '-q', path.join(dados, 'parado.html')], { cwd: raiz }).status, 1, 'o site de teste não pode ficar ignorado')
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true })
  }
  assert.ok(!fs.existsSync(pasta))
})

// ---------------------------------------------------------------------------------------------------------
// Navegador
// ---------------------------------------------------------------------------------------------------------
const navegador = acharNavegador()
const pular = !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)'

// Toda a preparação fica dentro do try: se uma etapa falhar (EPERM na pasta, porta, navegador), o que já existe é
// solto. O vigia fecha o navegador se o teste passar do limite, para não ficar Chrome vivo nem execução presa.
async function comSite(fn, limiteMs = 220_000) {
  let servidor = null, saida = null, nav = null, vigia = null
  try {
    servidor = http.createServer((req, res) => {
      const nome = path.basename(new URL(req.url, 'http://x').pathname)
      const arq = path.join(dados, nome)
      if (!/^[\w-]+\.html$/.test(nome) || !fs.existsSync(arq)) { res.writeHead(404); res.end(); return }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(fs.readFileSync(arq))
    })
    await new Promise((r, x) => { servidor.once('error', x); servidor.listen(0, '127.0.0.1', r) })
    saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-teste-'))
    nav = await abrirNavegador(navegador)
    vigia = setTimeout(() => { nav.fechar().catch(() => {}) }, limiteMs)
    await nav.cmd('Page.enable')
    await nav.cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source: ganchosAntes }) // ganchos antes de navegar
    const grav = await gravar(nav, { pasta: path.join(saida, 'quadros') }) // gravação ligada antes de abrir a página
    await fn({ nav, grav, saida, base: `http://127.0.0.1:${servidor.address().port}/` })
    await grav.parar()
  } finally {
    clearTimeout(vigia)
    try { if (nav) await nav.fechar() } catch {}
    if (servidor) { servidor.close(); servidor.closeAllConnections?.() }
    if (saida) fs.rmSync(saida, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

test('site local: texto que aparece ao carregar, caixa em laço e canvas dão item; seção parada não', { skip: pular, timeout: 240_000 }, async () => {
  await comSite(async ({ nav, grav, saida, base }) => {
    // (b) carregar: a gravação já estava ligada quando a página abriu
    const car = await capturarCarregar(nav, grav, { url: base + 'parado.html', pagina: 'inicio' })
    assert.equal(car.cobertura.estado, 'completa', JSON.stringify(car.cobertura))
    assert.deepEqual(car.itens.map((i) => i.alvo.desc).sort(), ['div#curta', 'p#tarde'], 'itens ao carregar')
    // entrada curta de verdade (200 ms de opacidade e posição): acabou muito antes da consulta, feita depois dos 5 s
    const curta = car.itens.find((i) => i.alvo.desc === 'div#curta')
    assert.deepEqual(curta.muda, ['posicao-y', 'opacidade'], 'as propriedades da entrada curta não podem se perder')
    assert.equal(curta.duracaoMs, 200)
    assert.match(curta.curva, /ease-out/)
    assert.deepEqual(curta.fontes, ['quadros', 'css'])
    assert.match(curta.tecnica, /animação CSS.*anotada enquanto tocava/)
    assert.ok(curta.atrasoMs >= 300 && curta.atrasoMs <= 2500, `atraso da entrada curta ${curta.atrasoMs}`)
    const tarde = car.itens.find((i) => i.alvo.desc === 'p#tarde')
    assert.equal(tarde.gatilho, 'carregar')
    assert.equal(tarde.alvo.desc, 'p#tarde')
    // o atraso conta do primeiro quadro desenhado (que pode sair um pouco depois do "load"), não do "load"
    assert.ok(tarde.atrasoMs >= 30 && tarde.atrasoMs <= 1500, `atraso ${tarde.atrasoMs}`)
    assert.ok(tarde.muda.every((m) => MUDANCAS.includes(m)))
    assert.ok(!('id' in tarde), 'item sai sem id')

    const toda = await rolarPaginaToda(nav)
    assert.ok(Math.abs(toda.fimPx - 2700) <= 3 && toda.voltou, JSON.stringify(toda))

    // (a), (c), (d): parado no topo de cada seção
    const secoes = [0, 1, 2, 3].map((i) => ({ indice: i, topoPx: i * 900 }))
    const par = await capturarParado(nav, grav, { pagina: 'inicio', secoes })
    assert.equal(par.cobertura.estado, 'completa', JSON.stringify(par))
    assert.deepEqual(par.itens.map((i) => i.alvo.desc).sort(), ['canvas#tela', 'div#caixa'], JSON.stringify(par.itens.map((i) => [i.alvo.desc, i.secao])))
    const caixa = par.itens.find((i) => i.alvo.desc === 'div#caixa')
    assert.equal(caixa.gatilho, 'parado')
    assert.equal(caixa.secao, 1)
    assert.deepEqual(caixa.muda, ['posicao-x', 'opacidade'])
    assert.ok(caixa.duracaoMs >= 600 && caixa.duracaoMs <= 2400, `duração ${caixa.duracaoMs}`)
    assert.deepEqual(caixa.fontes, ['quadros', 'css'])
    assert.match(caixa.tecnica, /laço/)
    const tela = par.itens.find((i) => i.alvo.desc === 'canvas#tela')
    assert.deepEqual(tela.muda, ['canvas'])
    assert.equal(tela.secao, 3)
    assert.match(tela.tecnica, /2d/)
    assert.ok(!par.itens.some((i) => i.secao === 0 || i.secao === 2), 'seção parada não dá item')

    // rolagem: um quadro a cada 1/4 de tela andado de fato, ida e volta
    const rol = await capturarRolagem(nav, grav, { pagina: 'inicio' })
    assert.equal(rol.cobertura.estado, 'completa', JSON.stringify(rol.cobertura))
    assert.deepEqual(rol.naoMedido, [])
    const desce = rol.quadros.filter((q) => q.sentido === 'descendo'), sobe = rol.quadros.filter((q) => q.sentido === 'subindo')
    assert.equal(desce.length, 13, desce.map((q) => q.rolagemPx).join())
    assert.equal(sobe.length, 12, sobe.map((q) => q.rolagemPx).join())
    desce.forEach((q, k) => assert.ok(Math.abs(q.rolagemPx - k * 225) <= 3, `quadro ${k} em ${q.rolagemPx}px`))
    assert.ok(sobe[sobe.length - 1].rolagemPx <= 3)
    // o print é do trecho certo da página: topo e 2ª tela são diferentes; mesma posição na ida e na volta, iguais fora do que mexe
    const img = (q) => decodificarPng(fs.readFileSync(path.join(saida, 'quadros', q.arquivo)))
    const troca = diferencaQuadros(img(desce[0]), img(desce[4])).total // fundos parecidos: contam o texto azul e a caixa laranja
    assert.ok(troca > 0.04, `o quadro rolado tem de mostrar outra parte da página (mudou ${troca})`)
    assert.ok(diferencaQuadros(img(desce[8]), img(sobe[3])).total < 0.02, 'ida e volta na mesma posição (seção parada) mostram a mesma tela')
    assert.equal(img(desce[0]).largura, 360)

    // manifesto: tempo e posição em todo quadro
    const man = JSON.parse(fs.readFileSync(grav.gravarManifesto(), 'utf8'))
    assert.ok(man.quadros.length >= 8 * 4 + 25 + 2, `quadros ${man.quadros.length}`)
    for (const q of man.quadros) {
      assert.ok(Number.isFinite(q.tMs) && q.tMs >= 0 && Number.isFinite(q.rolagemPx), JSON.stringify(q))
      assert.ok(GATILHOS.includes(q.gatilho) && q.pagina === 'inicio' && typeof q.perdido === 'boolean' && q.escala === 0.25, JSON.stringify(q))
      assert.ok(fs.existsSync(path.join(saida, 'quadros', q.arquivo)))
      assert.ok('item' in q && 'progresso' in q)
    }
    assert.equal(fs.readFileSync(path.join(saida, 'quadros', '.gitignore'), 'utf8'), '*\n')

    // folha montada no Chrome
    const folha = await montarFolha(nav, caixa.quadrosBrutos.map((a) => ({ arquivo: a })), { colunas: 4, legendas: caixa.quadrosBrutos.map((_, k) => `quadro ${k + 1}`), pasta: path.join(saida, 'quadros') })
    assert.ok(folha.length > 2000 && folha[0] === 0xff && folha[1] === 0xd8, 'folha JPEG')
  })
})

test('rolagem que trava depois de já ter andado, ou que não sobe de volta, sai parcial e com a lacuna em naoMedido', { skip: pular, timeout: 240_000 }, async () => {
  await comSite(async ({ nav, grav, base }) => {
    let carregou = false
    nav.ouvir('Page.loadEventFired', () => { carregou = true })
    const abrir = async (modo) => {
      carregou = false
      await nav.cmd('Page.navigate', { url: `${base}rolagem.html?${modo}` })
      for (let i = 0; i < 100 && !carregou; i++) await new Promise((r) => setTimeout(r, 50))
    }
    // trava no meio da descida (depois do 2º passo) e também não sobe mais
    await abrir('travameio')
    const meio = await capturarRolagem(nav, grav, { pagina: 'travameio' })
    assert.equal(meio.cobertura.estado, 'parcial', JSON.stringify(meio.cobertura))
    assert.ok(meio.fimPx >= 400 && meio.fimPx < 1000, `parou em ${meio.fimPx} px`)
    assert.deepEqual(meio.naoMedido.map((n) => [n.pagina, n.etapa, n.o]), [['travameio', 'rolagem', 'descida'], ['travameio', 'rolagem', 'subida']], JSON.stringify(meio.naoMedido))
    assert.match(meio.naoMedido[0].motivo, /travou em \d+ px/)
    assert.match(meio.cobertura.motivo, /descida: .*; subida: /)
    // desce até o fim e não sobe: só a subida é lacuna
    await abrir('travasubida')
    const sobe = await capturarRolagem(nav, grav, { pagina: 'travasubida' })
    assert.ok(Math.abs(sobe.fimPx - 2700) <= 3, `desceu até ${sobe.fimPx} px`)
    assert.equal(sobe.cobertura.estado, 'parcial', JSON.stringify(sobe.cobertura))
    assert.deepEqual(sobe.naoMedido.map((n) => n.o), ['subida'], JSON.stringify(sobe.naoMedido))
    assert.match(sobe.naoMedido[0].motivo, /subida travou em \d+ px/)
  })
})

test('rolarAte devolve a distância real com rolagem suave, contêiner interno, rolagem virtual e trava; inércia não vira item', { skip: pular, timeout: 240_000 }, async () => {
  await comSite(async ({ nav, grav, base }) => {
    let carregou = false
    nav.ouvir('Page.loadEventFired', () => { carregou = true })
    for (const [modo, esperado] of [['suave', 'lenis'], ['conteiner', 'conteiner'], ['virtual', 'virtual'], ['trava', 'pagina']]) {
      carregou = false
      await nav.cmd('Page.navigate', { url: `${base}rolagem.html?${modo}` })
      for (let i = 0; i < 100 && !carregou; i++) await new Promise((r) => setTimeout(r, 50))
      const r = await rolarAte(nav, 900)
      assert.equal(r.estado, 'ok', `${modo}: ${JSON.stringify(r)}`)
      assert.equal(r.modo, esperado, `${modo}: ${JSON.stringify(r)}`)
      assert.ok(Math.abs(r.andou - 900) <= 3 && Math.abs(r.posicao - 900) <= 3, `${modo}: andou ${r.andou}, posição ${r.posicao}`)
      // confere com a página: o topo da 2ª tela está no alto
      const topo = await nav.rodar(() => Math.round(document.querySelectorAll('section')[1].getBoundingClientRect().top))
      assert.ok(Math.abs(topo) <= 3, `${modo}: a 2ª tela ficou em ${topo}px`)
      if (modo === 'trava') assert.ok(r.travadoMs >= 800 && r.travadoMs <= 4500, `trava de 2 s medida como ${r.travadoMs} ms`)
      else assert.ok(r.travadoMs < 800, `${modo}: travou ${r.travadoMs} ms`)
      const par = await capturarParado(nav, grav, { pagina: modo, secoes: [{ indice: 2, topoPx: 1500 }], esperaMs: 1000 })
      assert.equal(par.cobertura.estado, 'completa', `${modo}: ${JSON.stringify(par)}`)
      assert.deepEqual(par.itens, [], `${modo}: inércia virou item parado: ${JSON.stringify(par.itens.map((i) => i.alvo))}`)
      // subir também anda de verdade (os dois sentidos)
      const volta = await rolarAte(nav, 300)
      assert.ok(volta.estado === 'ok' && Math.abs(volta.posicao - 300) <= 3 && volta.andou < 0, `${modo} voltando: ${JSON.stringify(volta)}`)
    }
  })
})
