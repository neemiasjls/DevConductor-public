// Comparador com a referência: divergências medidas entre dois raio-x (sintéticos), relatório, lado a lado,
// material às cegas e, se houver Chrome/Edge, duas páginas locais de verdade.
// Rodar: node --test scripts/testes/comparar-referencia.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-revisao', 'scripts', 'comparar-referencia.mjs')
const raioXScript = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts', 'raio-x.mjs')
const url = (p) => new URL('file:///' + p.replace(/\\/g, '/')).href
const { compararRaioX, codigoDeSaida, gerarMarkdown, gerarLadoALado, gerarOlhar, montarCegas, lerLighthouse, parearSecoes,
  resumoEscala, familiaDaCena, lerListaSecoes, PERGUNTAS_OLHAR, tipoPrincipal, paletaDoRaioX, sugerirCor, familiaDaCurva } = await import(url(script))
const { acharNavegador, resumoContraste } = await import(url(raioXScript))

// Raio-x sintético: cada seção {mov: [{tipo, ...}], img, pal, alt, papel, razao}
function rx(nome, specs, { cena, escala = [4.5, 3, 1.5, 1], corpoPx = 16 } = {}) {
  const secoes = specs.map((s, i) => ({
    indice: i, elemento: `section#${s.id}`, topoTelas: i, alturaTelas: s.alt ?? 1, papel: s.papel ?? null,
    colunas: 1, palavras: s.pal ?? 20, palavrasPorTela: s.pal ?? 20, imagens: 1, videos: 0, canvas: 0,
    imagemTexto: s.img ?? 0.5, corFundo: '#fff', corTexto: '#000', raioPx: 0, fontes: [],
    titulo: s.razao ? { texto: s.id, px: s.razao * corpoPx, razao: s.razao, maiusculas: false } : null,
    print: `prints/secao-${String(i + 1).padStart(2, '0')}.jpg`,
  }))
  const PESO = { presa: 2, 'rolagem-lateral': 4, zoom: 2, paralaxe: 1.5, 'entrada-simples': 0.5 }
  const movimento = specs.map((s, i) => {
    const det = s.mov || []
    return { secao: i, tipos: det.length ? det.map((d) => d.tipo) : ['nenhum'], detalhes: det,
      forca: det.reduce((f, d) => f + (PESO[d.tipo] || 0) + (d.tipo === 'presa' ? Math.min(3, d.duracaoTelas || 0) : 0), 0) }
  })
  return {
    versao: 1, url: `https://${nome}.exemplo`, data: '2026-11-10T00:00:00Z', viewport: { largura: 1440, altura: 900, celular: false },
    rolagem: { modo: 'documento', alturaTelas: secoes.reduce((a, s) => a + s.alturaTelas, 0) }, bibliotecas: { globais: [], sinais: [], scripts: [] },
    pagina: { corpoPx, fontes: [], escala: escala.map((r) => ({ px: r * corpoPx, razao: r, parte: 0.1 })), corFundo: '#fff', corTexto: '#000' },
    secoes, movimento, cenaPrincipal: cena, tipos: [], avisos: [],
  }
}
const S = {
  cab: { id: 'cab', papel: 'cabeçalho', alt: 0.1, pal: 5, img: 0 },
  abertura: { id: 'abertura', alt: 3, img: 0.9, pal: 8, razao: 4.5, mov: [{ tipo: 'presa', duracaoTelas: 2 }, { tipo: 'entrada-simples' }] },
  texto: { id: 'texto', alt: 1, img: 0.1, pal: 80, razao: 2 },
  galeria: { id: 'galeria', alt: 2, img: 0.85, pal: 12, razao: 3, mov: [{ tipo: 'rolagem-lateral' }] },
  depo: { id: 'depo', alt: 1.2, img: 0.3, pal: 45, mov: [{ tipo: 'paralaxe' }] },
  rodape: { id: 'rodape', papel: 'rodapé', alt: 0.6, img: 0, pal: 30 },
}
const REF = rx('ref', [S.cab, S.abertura, S.texto, S.galeria, S.depo, S.rodape], { cena: 1 })

test('raio-x igual: nenhuma divergência e código 0', () => {
  const c = compararRaioX(REF, structuredClone(REF))
  assert.equal(c.divergencias.length, 0, c.divergencias.map((d) => d.texto).join('\n'))
  assert.equal(codigoDeSaida(c), 0)
  assert.equal(c.pares.length, 5)
  assert.ok(c.cenaPrincipal.mesmoTipo)
})

test('seção fora de ordem é pega como alta', () => {
  const nosso = rx('nosso', [S.cab, S.abertura, S.galeria, S.texto, S.depo, S.rodape], { cena: 1 })
  const c = compararRaioX(REF, nosso)
  const ordem = c.divergencias.filter((d) => d.tipo === 'ordem')
  assert.equal(ordem.length, 1)
  assert.equal(ordem[0].gravidade, 'alta')
  assert.ok([2, 3].includes(ordem[0].secaoRef))
  assert.equal(codigoDeSaida(c), 1)
  // pareamento acha a seção certa apesar da troca
  const p = parearSecoes(REF, nosso).pares
  assert.equal(p.find((x) => x.ref === 2).nosso, 3)
  assert.equal(p.find((x) => x.ref === 3).nosso, 2)
})

test('cena principal com tipo trocado é alta; o "prende a rolagem" aparece', () => {
  const abertura = { ...S.abertura, mov: [{ tipo: 'zoom' }, { tipo: 'entrada-simples' }] }
  const nosso = rx('nosso', [S.cab, abertura, S.texto, S.galeria, S.depo, S.rodape], { cena: 1 })
  const c = compararRaioX(REF, nosso)
  const cena = c.divergencias.find((d) => d.tipo === 'cena-tipo')
  assert.ok(cena, c.divergencias.map((d) => d.tipo).join())
  assert.equal(cena.gravidade, 'alta')
  assert.deepEqual(cena.medida, { ref: 'presa', nosso: 'zoom' })
  assert.ok(c.divergencias.some((d) => d.tipo === 'movimento-falta' && /prende a rolagem por 2 telas; o nosso não prende/.test(d.texto)))
  assert.ok(c.divergencias.some((d) => d.tipo === 'cena-forca' && d.gravidade === 'media')) // 2,5 contra 4,5 (0,56)
  assert.equal(codigoDeSaida(c), 1)
})

test('escala de fontes: muito diferente é alta, pouco diferente é média, quase igual não aparece', () => {
  const grav = (escala) => compararRaioX(REF, rx('nosso', [S.cab, S.abertura, S.texto, S.galeria, S.depo, S.rodape], { cena: 1, escala }))
    .divergencias.find((d) => d.tipo === 'escala')?.gravidade
  assert.equal(grav([2, 1.5, 1.25, 1]), 'alta')
  assert.equal(grav([3.3, 2, 1.5, 1]), 'media')
  assert.equal(grav([4.2, 3, 1.5, 1]), undefined)
})

test('texto demais numa seção e imagem pequena', () => {
  const texto = { ...S.galeria, pal: 70, img: 0.2 }
  const c = compararRaioX(REF, rx('nosso', [S.cab, S.abertura, S.texto, texto, S.depo, S.rodape], { cena: 1 }))
  const pal = c.divergencias.find((d) => d.tipo === 'palavras' && d.secaoRef === 3)
  const img = c.divergencias.find((d) => d.tipo === 'imagem-texto' && d.secaoRef === 3)
  assert.equal(pal?.gravidade, 'alta')  // 75/17 > 3×
  assert.equal(img?.gravidade, 'alta')  // 0,85 → 0,2
})

test('markdown: ordenado por gravidade, no máximo 25 itens, Lighthouse "não medido" ou com limites', () => {
  const nosso = rx('nosso', [S.cab, S.abertura, S.galeria, S.texto, S.depo, S.rodape], { cena: 1, escala: [2, 1] })
  const c = compararRaioX(REF, nosso)
  const md = gerarMarkdown(c)
  const itens = md.split('\n').filter((l) => /^\d+\. \[/.test(l))
  assert.ok(itens.length > 0 && itens.length <= 25)
  const ordem = itens.map((l) => (l.includes('[ALTA]') ? 0 : l.includes('[média]') ? 1 : 2))
  assert.deepEqual(ordem, [...ordem].sort((a, b) => a - b))
  assert.match(md, /Não medido/)
  const muitos = { ...c, divergencias: Array.from({ length: 40 }, (_, i) => ({ gravidade: 'baixa', tipo: 'x', texto: `item ${i}` })) }
  assert.equal(gerarMarkdown(muitos).split('\n').filter((l) => /^\d+\. \[/.test(l)).length, 25)
  const lh = lerLighthouse({ configSettings: { formFactor: 'mobile' }, categories: { performance: { score: 0.93 }, accessibility: { score: 1 } },
    audits: { 'largest-contentful-paint': { numericValue: 3100 }, 'cumulative-layout-shift': { numericValue: 0.02 }, 'total-blocking-time': { numericValue: 120 } } })
  assert.deepEqual(lh.passa, { lcp: false, cls: true, inp: true })
  const md2 = gerarMarkdown(c, { lighthouse: lh })
  assert.match(md2, /Desempenho: 93\/100/)
  assert.match(md2, /LCP: 3,1 s \(limite 2,5 s\) — \*\*acima do limite\*\*/)
  assert.match(md2, /TBT .*120 ms/)
  assert.throws(() => lerLighthouse({ foo: 1 }), /Lighthouse/)
})

test('lado a lado: prints relativos, aviso de terceiro, divergência na seção certa e texto escapado', () => {
  const nosso = rx('nosso', [S.cab, S.abertura, S.galeria, S.texto, S.depo, S.rodape], { cena: 1 })
  nosso.secoes[2].titulo = { texto: '<script>', px: 48, razao: 3 }
  nosso.url = 'http://127.0.0.1:5173/?a=<b>'
  const c = compararRaioX(REF, nosso)
  const html = gerarLadoALado(c, REF, nosso, { ref: '../ref/raio-x', nosso: 'nosso' })
  assert.match(html, /src="\.\.\/ref\/raio-x\/prints\/secao-02\.jpg"/)
  assert.match(html, /src="nosso\/prints\/secao-03\.jpg"/)
  assert.match(html, /de terceiro/)
  assert.match(html, /só para estudo/)
  assert.ok(!html.includes('?a=<b>'))
  assert.ok(html.indexOf('fora de ordem') > html.indexOf('Referência — Seção'))
  assert.ok(!/src="\//.test(html), 'sem caminho absoluto')
})

test('às cegas: letras embaralhadas, gabarito fora da pasta e sem vazar a origem nos nomes', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cegas-'))
  try {
    const sites = []
    for (const [nome, origem] of [['nosso-site', 'nosso'], ['ref-um', 'referencia'], ['ref-dois', 'referencia'], ['ref-tres', 'referencia']]) {
      const pasta = path.join(base, nome)
      fs.mkdirSync(path.join(pasta, 'prints'), { recursive: true })
      const r = rx(nome, [S.cab, S.abertura, S.texto, S.galeria, S.rodape], { cena: 3 })
      for (const s of r.secoes) fs.writeFileSync(path.join(pasta, s.print), `${nome}-${s.indice}`)
      sites.push({ rx: r, pasta, origem })
    }
    const cegas = path.join(base, 'cegas'), gab = path.join(base, 'saida', 'gabarito-cegas.json')
    assert.throws(() => montarCegas({ sites, pasta: cegas, gabarito: path.join(cegas, 'g.json'), semente: 1 }), /gabarito/)
    const r = montarCegas({ sites, pasta: cegas, gabarito: gab, semente: 3 })
    const arquivos = fs.readdirSync(cegas).sort()
    assert.deepEqual(arquivos, ['A-1.jpg', 'A-2.jpg', 'B-1.jpg', 'B-2.jpg', 'C-1.jpg', 'C-2.jpg', 'D-1.jpg', 'D-2.jpg', 'pergunta.md'])
    const g = JSON.parse(fs.readFileSync(gab, 'utf8'))
    assert.equal(g.letras[g.nosso].origem, 'nosso')
    assert.equal(r.nosso, g.nosso)
    // o conteúdo do quadro 1 de cada letra é a abertura do site que o gabarito diz
    for (const [L, info] of Object.entries(g.letras)) {
      const nome = new URL(info.url).hostname.replace('.exemplo', '')
      assert.equal(fs.readFileSync(path.join(cegas, `${L}-1.jpg`), 'utf8'), `${nome}-1`)
      assert.equal(fs.readFileSync(path.join(cegas, `${L}-2.jpg`), 'utf8'), `${nome}-3`)
    }
    const pergunta = fs.readFileSync(path.join(cegas, 'pergunta.md'), 'utf8')
    for (const p of ['nosso', 'ref', 'exemplo', 'http', 'gabarito']) assert.ok(!pergunta.toLowerCase().includes(p), `pergunta vaza "${p}"`)
    assert.match(pergunta, /ordem: /)
    assert.match(pergunta, /gerado/)
    // outra semente muda a posição do nosso em algum caso (embaralha de verdade)
    const posicoes = new Set()
    for (let sem = 10; sem < 20; sem++) {
      const p2 = path.join(base, `c${sem}`)
      posicoes.add(montarCegas({ sites, pasta: p2, gabarito: path.join(base, `g${sem}.json`), semente: sem }).nosso)
    }
    assert.ok(posicoes.size > 1)
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
})

test('linha de comando: erro de uso é 2; dois JSON iguais saem 0; com divergência alta saem 1', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'comparar-'))
  const rodar = (args) => new Promise((resolve) => {
    const p = spawn(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { err += d })
    p.on('close', (code) => resolve({ code, out, err }))
  })
  try {
    const a = path.join(base, 'a.json'), b = path.join(base, 'b.json')
    fs.writeFileSync(a, JSON.stringify(REF))
    fs.writeFileSync(b, JSON.stringify(rx('nosso', [S.cab, S.abertura, S.galeria, S.texto, S.depo, S.rodape], { cena: 1 })))
    assert.equal((await rodar([a])).code, 2)
    assert.equal((await rodar([a, b, path.join(base, 's0'), '--xis'])).code, 2)
    assert.equal((await rodar([a, b, path.join(base, 's0'), '--lighthouse', a])).code, 2)
    const igual = await rodar([a, a, path.join(base, 's1')])
    assert.equal(igual.code, 0, igual.err)
    for (const f of ['comparacao.json', 'comparacao.md', 'lado-a-lado.html']) assert.ok(fs.existsSync(path.join(base, 's1', f)), f)
    const dif = await rodar([a, b, path.join(base, 's2')])
    assert.equal(dif.code, 1, dif.err)
    assert.match(fs.readFileSync(path.join(base, 's2', 'comparacao.md'), 'utf8'), /fora de ordem/)
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------------------------------------
// Fatia (--secoes), título decorativo, cena equivalente, olhar.md e --copiar-prints
// ---------------------------------------------------------------------------------------------------------
const rodarCli = (args) => new Promise((resolve) => {
  const p = spawn(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
  let out = '', err = ''
  p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { err += d })
  p.on('close', (code) => resolve({ code, out, err }))
})

test('--secoes: fatia igual sai 0; a página inteira acusaria número de seções', () => {
  const nosso = rx('nosso', [S.cab, S.abertura, S.texto], { cena: 1 })
  const inteira = compararRaioX(REF, nosso)
  assert.ok(inteira.divergencias.some((d) => d.tipo === 'numero-secoes'))
  const c = compararRaioX(REF, nosso, undefined, { secoes: [0, 1, 2] })
  assert.equal(c.divergencias.length, 0, c.divergencias.map((d) => d.texto).join('\n'))
  assert.equal(codigoDeSaida(c), 0)
  assert.deepEqual(c.fatia, [0, 1, 2])
  assert.match(gerarMarkdown(c), /Seções comparadas: 1, 2, 3 da referência \(fatia/)
  assert.match(gerarMarkdown(inteira), /Seções comparadas: a página inteira/)
  // cena principal fora da fatia: não compara a cena, avisa
  const semCena = compararRaioX(REF, rx('nosso', [S.cab, S.texto, S.galeria], { cena: 2 }), undefined, { secoes: [2, 3] })
  assert.ok(!semCena.divergencias.some((d) => d.tipo.startsWith('cena-')), semCena.divergencias.map((d) => d.texto).join('\n'))
  assert.ok(semCena.avisos.some((a) => /fora da fatia/.test(a)))
  // leitura da lista
  assert.deepEqual(lerListaSecoes('1-3'), [1, 2, 3])
  assert.deepEqual(lerListaSecoes('5, 1,2,2'), [1, 2, 5])
  assert.deepEqual(lerListaSecoes('1-2,8'), [1, 2, 8])
  for (const ruim of ['0', '3-1', 'a', '1;2', '']) assert.throws(() => lerListaSecoes(ruim), /--secoes/)
})

test('título decorativo (marca d\'água) sai da escala e do título; sem o campo, a medida acusa', () => {
  const rodRef = { ...S.rodape, razao: 1 }, rodNosso = { ...S.rodape, razao: 15 }
  const ref = rx('ref', [S.cab, S.abertura, S.texto, S.galeria, S.depo, rodRef], { cena: 1 })
  const escala = [15, 4.5, 3, 1.5, 1]
  const tipos = (n) => compararRaioX(ref, n).divergencias.filter((d) => ['escala', 'titulo'].includes(d.tipo)).map((d) => `${d.tipo}:${d.gravidade}`).sort()
  const semCampo = rx('nosso', [S.cab, S.abertura, S.texto, S.galeria, S.depo, rodNosso], { cena: 1, escala })
  assert.deepEqual(tipos(semCampo), ['escala:alta', 'titulo:media'])
  // lista na seção (texto + px)
  const lista = structuredClone(semCampo)
  lista.secoes[5].decorativos = [{ texto: 'rodape', px: 240 }]
  assert.deepEqual(tipos(lista), [])
  // marcado no próprio item
  const marcado = structuredClone(semCampo)
  marcado.secoes[5].titulo.decorativo = true
  marcado.pagina.escala[0].decorativo = true
  assert.deepEqual(tipos(marcado), [])
  // px de decorativo igual ao de um título de verdade não derruba o título
  const igual = structuredClone(REF)
  igual.secoes[3].decorativos = [{ texto: 'número gigante', px: 72 }]
  assert.equal(resumoEscala(igual).razaoMaxima, 4.5)
})

test('cena principal da mesma família ("pilha" × "presa") cai para média e explica; outra família segue alta', () => {
  assert.ok(familiaDaCena('presa', 'pilha'))
  assert.equal(familiaDaCena('presa', 'zoom'), null)
  assert.equal(familiaDaCena('presa', 'presa'), null)
  const abertura = { ...S.abertura, mov: [{ tipo: 'presa', duracaoTelas: 1 }, { tipo: 'pilha' }, { tipo: 'entrada-simples' }] }
  const c = compararRaioX(REF, rx('nosso', [S.cab, abertura, S.texto, S.galeria, S.depo, S.rodape], { cena: 1 }))
  const cena = c.divergencias.find((d) => d.tipo === 'cena-tipo')
  assert.deepEqual(cena?.medida, { ref: 'presa', nosso: 'pilha' })
  assert.equal(cena.gravidade, 'media')
  assert.match(cena.texto, /mesma família/)
  assert.ok(c.cenaPrincipal.equivalente)
})

test('olhar.md: prints lado a lado, 5 perguntas e nota por seção; o lado a lado mostra o roteiro', () => {
  const nosso = rx('nosso', [S.cab, S.abertura, S.texto], { cena: 1 })
  const c = compararRaioX(REF, nosso, undefined, { secoes: [0, 1, 2] })
  const md = gerarOlhar(c, REF, nosso, { ref: '../ref (1)', nosso: 'nosso' })
  const secoes = md.split('\n').filter((l) => l.startsWith('## Seção'))
  assert.equal(secoes.length, 3) // cabeçalho, abertura e texto da fatia
  assert.match(md, /## Seção 2 da referência ↔ nossa 2 · cena principal/)
  assert.match(md, /!\[Referência, seção 2\]\(\.\.\/ref%20%281%29\/prints\/secao-02\.jpg\) \| !\[Nosso, seção 2\]\(nosso\/prints\/secao-02\.jpg\)/)
  assert.equal(md.split('Nota (0–10)').length - 1, 3)
  for (const q of PERGUNTAS_OLHAR) assert.equal(md.split(q).length - 1, 3, q)
  assert.match(md, /denuncia gerador/i)
  const html = gerarLadoALado(c, REF, nosso, { ref: 'ref', nosso: 'nosso' })
  assert.match(html, /Olhar de diretor de arte/)
  assert.ok(html.includes(PERGUNTAS_OLHAR[0].slice(0, 30)))
  assert.match(html, /olhar\.md/)
  assert.ok(!/src="ref\/prints\/secao-04\.jpg"/.test(html), 'fora da fatia não aparece')
})

test('linha de comando: --secoes fatia igual sai 0, valida a lista; --copiar-prints deixa a pasta portátil', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'comparar-fatia-'))
  try {
    const nosso = rx('nosso', [S.cab, S.abertura, S.texto], { cena: 1 })
    const gravar = (pasta, r) => {
      fs.mkdirSync(path.join(pasta, 'prints'), { recursive: true })
      for (const s of r.secoes) fs.writeFileSync(path.join(pasta, s.print), `${path.basename(pasta)}-${s.indice}`)
      fs.writeFileSync(path.join(pasta, 'raio-x.json'), JSON.stringify(r))
      return path.join(pasta, 'raio-x.json')
    }
    const a = gravar(path.join(base, 'galeria', 'ref'), REF), b = gravar(path.join(base, 'site', 'nosso'), nosso)
    const saida = path.join(base, 'saida')
    const ok = await rodarCli([a, b, saida, '--secoes', '1-3', '--copiar-prints'])
    assert.equal(ok.code, 0, ok.err || ok.out)
    const md = fs.readFileSync(path.join(saida, 'comparacao.md'), 'utf8')
    assert.match(md, /Seções comparadas: 1, 2, 3 da referência/)
    assert.equal((await rodarCli([a, b, path.join(base, 's-inteira')])).code, 1) // sem fatia: número de seções
    for (const ruim of [['--secoes', '9'], ['--secoes', '1'], ['--secoes', 'x'], ['--secoes']]) {
      assert.equal((await rodarCli([a, b, path.join(base, 's-ruim'), ...ruim])).code, 2, ruim.join(' '))
    }
    // copiou só os prints usados, e o HTML e o olhar apontam para dentro da saída
    assert.equal(fs.readFileSync(path.join(saida, 'copia-referencia', 'prints', 'secao-02.jpg'), 'utf8'), 'ref-1')
    assert.equal(fs.readFileSync(path.join(saida, 'copia-nosso', 'prints', 'secao-03.jpg'), 'utf8'), 'nosso-2')
    assert.ok(!fs.existsSync(path.join(saida, 'copia-referencia', 'prints', 'secao-04.jpg')), 'fora da fatia não é copiado')
    const html = fs.readFileSync(path.join(saida, 'lado-a-lado.html'), 'utf8'), olhar = fs.readFileSync(path.join(saida, 'olhar.md'), 'utf8')
    for (const t of [html, olhar]) assert.ok(!/file:|\.\.\//.test(t), 'sem caminho para fora da pasta')
    // a pasta copiada para outro lugar continua com todos os prints
    const outra = path.join(base, 'outro-pc', 'volta')
    fs.cpSync(saida, outra, { recursive: true })
    const srcs = [...html.matchAll(/src="([^"]+)"/g)].map((m) => decodeURI(m[1]))
    assert.ok(srcs.length >= 5)
    for (const s of srcs) assert.ok(fs.existsSync(path.join(outra, s)), s)
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------------------------------------
// Navegador de verdade: referência e nosso como páginas locais, com duas seções trocadas
// ---------------------------------------------------------------------------------------------------------
const estilo = `* { box-sizing: border-box } body { margin: 0; font: 16px/1.5 Georgia, serif; background: #f4efe8; color: #222 }
  section { width: 100%; position: relative } h1 { font-size: 80px; margin: 0 } h2 { font-size: 40px; margin: 0 }
  #abertura { height: 100vh; display: grid; place-items: center }
  #presa { height: 300vh } #presa .gruda { position: sticky; top: 0; height: 100vh; background: #1d1d1b; color: #fff; display: grid; place-items: center }
  #texto { min-height: 100vh; padding: 10vh 20% } #foto { height: 120vh; display: grid; place-items: center } #foto div { width: 80%; height: 90vh; background: #8a6f55 }
  footer { height: 50vh; background: #111; color: #ddd; padding: 40px }`
const sec = {
  abertura: '<section id="abertura"><h1>Casa clara</h1></section>',
  presa: '<section id="presa"><div class="gruda"><h2>Fica parada</h2></div></section>',
  texto: `<section id="texto"><h2>Sobre</h2><p>${'Texto corrido com várias palavras para medir a densidade da seção. '.repeat(14)}</p></section>`,
  foto: '<section id="foto"><div></div></section>',
}
const pagina = (ordem) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Teste</title><style>${estilo}</style></head><body>${ordem.map((k) => sec[k]).join('')}<footer><p>Rodapé com contato</p></footer></body></html>`

const navegador = acharNavegador()
test('páginas locais: troca de seções é pega pelo comparador (URL no segundo argumento)', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 300_000 }, async () => {
  const paginas = { '/ref': pagina(['abertura', 'presa', 'texto', 'foto']), '/nosso': pagina(['abertura', 'foto', 'texto', 'presa']) }
  const servidor = http.createServer((req, res) => {
    if (paginas[req.url]) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(paginas[req.url]) } else { res.writeHead(404); res.end() }
  })
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'comparar-nav-'))
  const rodar = (exe, args) => new Promise((resolve) => {
    const p = spawn(process.execPath, [exe, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { err += d })
    p.on('close', (code) => resolve({ code, out, err }))
  })
  try {
    const raizUrl = `http://127.0.0.1:${servidor.address().port}`
    const r1 = await rodar(raioXScript, [`${raizUrl}/ref`, path.join(base, 'ref'), '--passos', '6'])
    assert.equal(r1.code, 0, r1.err || r1.out)
    const r2 = await rodar(script, [path.join(base, 'ref', 'raio-x.json'), `${raizUrl}/nosso`, path.join(base, 'saida')])
    assert.equal(r2.code, 1, r2.err || r2.out)
    const comp = JSON.parse(fs.readFileSync(path.join(base, 'saida', 'comparacao.json'), 'utf8'))
    assert.ok(comp.divergencias.some((d) => d.tipo === 'ordem' || d.tipo === 'cena-posicao'), comp.divergencias.map((d) => d.texto).join('\n'))
    assert.ok(fs.existsSync(path.join(base, 'saida', 'nosso', 'raio-x.json')))
    const html = fs.readFileSync(path.join(base, 'saida', 'lado-a-lado.html'), 'utf8')
    assert.match(html, /src="\.\.\/ref\/prints\/secao-0\d\.jpg"/)
    assert.match(html, /src="nosso\/prints\/secao-0\d\.jpg"/)
  } finally {
    servidor.close()
    fs.rmSync(base, { recursive: true, force: true })
  }
})

test('fundo animado (fora do vocabulário) nunca vira tipo da cena principal', () => {
  // Seção só com shader de fundo: o tipo da cena é "nenhum", não "fundo-animado".
  assert.equal(tipoPrincipal({ detalhes: [{ tipo: 'fundo-animado', quantos: 1 }] }), 'nenhum')
  // Com entrada simples (peso 0,5 < 1,5 do fundo animado), vale a entrada.
  assert.equal(tipoPrincipal({ detalhes: [{ tipo: 'fundo-animado', quantos: 1 }, { tipo: 'entrada-simples', quantos: 1 }] }), 'entrada-simples')
  const comFundo = { ...S.abertura, mov: [{ tipo: 'fundo-animado', quantos: 1 }, { tipo: 'presa', duracaoTelas: 2 }, { tipo: 'entrada-simples' }] }
  const nossoRx = rx('nosso', [S.cab, comFundo, S.texto, S.galeria, S.depo, S.rodape], { cena: 1 })
  nossoRx.movimento[1].tipos = ['presa', 'entrada-simples'] // como o raio-x grava: fundo animado só nos detalhes
  const c = compararRaioX(REF, nossoRx)
  assert.equal(c.cenaPrincipal.nosso.tipo, 'presa')
  assert.ok(!c.divergencias.some((d) => JSON.stringify(d).includes('fundo-animado')))
})

test("decorativos no formato que o raio-x grava ({texto, px, razao, motivo}) tiram a marca d'água do título", () => {
  const ref = rx('ref', [S.cab, S.abertura, S.texto, S.galeria, S.depo, { ...S.rodape, razao: 2 }], { cena: 1 })
  const nosso = rx('nosso', [S.cab, S.abertura, S.texto, S.galeria, S.depo, { ...S.rodape, razao: 14 }], { cena: 1 })
  nosso.secoes[5].titulo.texto = 'AROEIRA'
  const titulos = (c) => c.divergencias.filter((d) => d.tipo === 'titulo')
  assert.equal(titulos(compararRaioX(ref, nosso)).length, 1)
  nosso.secoes[5].decorativos = [{ texto: 'AROEIRA', px: 224, razao: 14, motivo: 'texto dentro de SVG (desenho)' }]
  assert.equal(titulos(compararRaioX(ref, nosso)).length, 0)
})

// ---------------------------------------------------------------------------------------------------------
// R11: contraste por seção e ritmo do movimento
// ---------------------------------------------------------------------------------------------------------
// Referência com contraste alto e movimento de 800 ms em ease-out; o campo novo entra como o raio-x grava.
function comR11(base, { texto = 15.9, titulo = 12.6, pior = null, duracaoMs = 800, curva = 'cubic-bezier(0.16, 1, 0.3, 1)' } = {}) {
  const r = structuredClone(base)
  const s = r.secoes[2] // seção "texto"
  s.corFundo = '#f4efe8'; s.corTexto = '#222222'; s.titulo.cor = '#1d1d1b'
  s.cores = [{ hex: '#f4efe8', papel: 'fundo' }, { hex: '#222222', papel: 'texto' }, { hex: '#8a6f55', papel: 'imagem' }]
  s.contraste = { titulo, texto, minimo: pior ? pior.razao : Math.min(titulo, texto), medidos: 6, semMedida: 0,
    pior: pior || { texto: 'Parágrafo', px: 16, cor: '#222222', fundo: '#f4efe8', razao: texto, grande: false, minimo: 4.5 } }
  Object.assign(r.movimento[2], { duracaoMs, curva, ritmo: { origem: 'css-transicao', quantos: 4, outras: [] } })
  return r
}

test('contraste e ritmo iguais aos da referência: nenhuma divergência', () => {
  const c = compararRaioX(comR11(REF), comR11(REF))
  assert.equal(c.divergencias.length, 0, c.divergencias.map((d) => d.texto).join('\n'))
})

test('site de exemplo com contraste menor e ritmo trocado: o comparador acusa os dois', () => {
  const ref = comR11(REF)
  // O nosso: texto cinza claro sobre o bege (abaixo do mínimo), título mais apagado, movimento curto e em ease-in.
  const nosso = comR11(REF, { texto: 2.6, titulo: 7.1, duracaoMs: 250, curva: 'ease-in',
    pior: { texto: 'Móveis sob medida para a casa toda', px: 16, cor: '#9a948c', fundo: '#f4efe8', razao: 2.6, grande: false, minimo: 4.5 } })
  nosso.secoes[2].corTexto = '#9a948c'
  const c = compararRaioX(ref, nosso)
  const de = (tipo) => c.divergencias.filter((d) => d.tipo === tipo)
  // abaixo do mínimo de acessibilidade: alta (portão), com a cor da paleta do cliente que resolve
  const min = de('contraste-minimo')
  assert.equal(min.length, 1)
  assert.equal(min[0].gravidade, 'alta')
  assert.equal(min[0].secaoRef, 2)
  assert.match(min[0].texto, /2,6:1/)
  assert.match(min[0].texto, /4,5:1/)
  assert.match(min[0].texto, /Sugestão dentro da paleta: #(222222|1d1d1b)/)
  assert.doesNotMatch(min[0].texto, /#8a6f55/, 'média de foto não é cor da paleta')
  assert.equal(codigoDeSaida(c), 1)
  // menor que o da referência (o título passa no mínimo, mas lê mais apagado): média
  const menor = de('contraste-menor')
  assert.equal(menor.length, 1, menor.map((d) => d.texto).join('\n'))
  assert.equal(menor[0].gravidade, 'media')
  assert.match(menor[0].texto, /título tem contraste 7,1:1 no nosso contra 12,6:1/)
  // ritmo trocado: duração e família da curva
  const dur = de('ritmo-duracao')
  assert.equal(dur.length, 1)
  assert.match(dur[0].texto, /800 ms na referência e 250 ms no nosso \(rápido demais\)/)
  assert.deepEqual(dur[0].medida, { ref: 800, nosso: 250 })
  const cur = de('ritmo-curva')
  assert.equal(cur.length, 1)
  assert.match(cur[0].texto, /ease-out/)
  assert.match(cur[0].texto, /ease-in/)
  const md = gerarMarkdown(c)
  assert.match(md, /abaixo do mínimo de acessibilidade/)
  assert.match(md, /src\/ritmo\.ts/)
})

test('contraste: diferença pequena e ritmo parecido não aparecem; sem o campo (raio-x antigo) nada é acusado', () => {
  const perto = compararRaioX(comR11(REF), comR11(REF, { texto: 13.5, titulo: 11, duracaoMs: 700, curva: 'ease-out' }))
  assert.equal(perto.divergencias.length, 0, perto.divergencias.map((d) => d.texto).join('\n'))
  assert.equal(compararRaioX(comR11(REF), structuredClone(REF)).divergencias.length, 0)
  assert.equal(compararRaioX(structuredClone(REF), comR11(REF, { duracaoMs: 250, curva: 'ease-in' })).divergencias.length, 0)
})

test('revisão 5: seção com todo o texto sem medida não passa calada; parte relevante sem medida é citada', () => {
  const com = (contraste) => { const r = comR11(REF); r.secoes[2].contraste = contraste; return r }
  const de = (c) => c.divergencias.filter((d) => d.tipo === 'contraste-nao-medido')
  // nada medido (texto todo sobre imagem ou degradê): o raio-x grava pior null e o comparador aprovava sem dizer nada
  const nada = compararRaioX(comR11(REF), com({ titulo: null, texto: null, minimo: null, pior: null, medidos: 0, semMedida: 3 }))
  assert.equal(de(nada).length, 1, nada.divergencias.map((d) => d.texto).join('\n'))
  assert.equal(de(nada)[0].gravidade, 'media')
  assert.equal(de(nada)[0].secaoNossa, 2)
  assert.match(de(nada)[0].texto, /contraste não medido no nosso: os 3 textos estão sobre imagem, degradê/)
  assert.match(de(nada)[0].texto, /Conferir no olhar ou no print/)
  assert.deepEqual(de(nada)[0].medida, { ref: 12.6, nosso: null, semMedida: 3, medidos: 0 })
  assert.equal(nada.divergencias.filter((d) => d.tipo.startsWith('contraste-')).length, 1)
  assert.equal(codigoDeSaida(nada), 0, 'é aviso para conferir no olhar, não portão')
  assert.match(gerarMarkdown(nada), /contraste não medido/)
  assert.match(de(compararRaioX(comR11(REF), com({ titulo: null, texto: null, minimo: null, pior: null, medidos: 0, semMedida: 1 })))[0].texto, /o único texto está sobre imagem/)
  // parte relevante sem medida (3 de 7): aviso baixo com a contagem; 1 de 7 não aparece
  const base = comR11(REF).secoes[2].contraste
  const parte = compararRaioX(comR11(REF), com({ ...base, medidos: 4, semMedida: 3 }))
  assert.equal(de(parte).length, 1)
  assert.equal(de(parte)[0].gravidade, 'baixa')
  assert.match(de(parte)[0].texto, /não medido em 3 de 7 textos/)
  assert.equal(de(compararRaioX(comR11(REF), com({ ...base, medidos: 6, semMedida: 1 }))).length, 0)
})

test('revisão 5: o mínimo é comparado sem arredondar (23,6px não é texto grande; 4,495 não é 4,5)', () => {
  const com = (contraste) => { const r = comR11(REF); r.secoes[2].contraste = contraste; return r }
  const minimo = (c) => c.divergencias.filter((d) => d.tipo === 'contraste-minimo')
  // texto de 23,6px cinza (3,59:1) sobre branco, como o resumo do raio-x grava: antes virava 24px, piso 3:1, zero divergências
  const quase = resumoContraste([{ t: 'Texto cinza quase grande', px: 23.6, peso: '400', chars: 24, cor: '#878787', fundo: '#ffffff', razao: 3.5941 }])
  const c = compararRaioX(comR11(REF), com(quase))
  assert.equal(minimo(c).length, 1, c.divergencias.map((d) => d.texto).join('\n'))
  assert.equal(minimo(c)[0].gravidade, 'alta')
  assert.match(minimo(c)[0].texto, /3,59:1, abaixo do mínimo de acessibilidade \(4,5:1\)/)
  assert.equal(codigoDeSaida(c), 1)
  // no tamanho de texto grande de verdade o mesmo cinza passa
  const grande = resumoContraste([{ t: 'Texto cinza grande', px: 24, peso: '400', chars: 18, cor: '#878787', fundo: '#ffffff', razao: 3.5941 }])
  assert.equal(minimo(compararRaioX(comR11(REF), com(grande))).length, 0)
  // razão 4,495: o resumo exibe 4,49 e marca abaixo; o comparador acusa sem dizer "4,5 abaixo de 4,5"
  const raspando = compararRaioX(comR11(REF), com(resumoContraste([{ t: 'Raspando', px: 16, peso: '400', chars: 8, cor: '#777777', fundo: '#ffffff', razao: 4.495 }])))
  assert.equal(minimo(raspando).length, 1)
  assert.match(minimo(raspando)[0].texto, /4,49:1, abaixo do mínimo de acessibilidade \(4,5:1\)/)
  // a decisão exata do raio-x (pior.abaixo) vale mesmo se a razão gravada estiver arredondada para cima
  const arredondado = { ...comR11(REF).secoes[2].contraste, pior: { texto: 'Raspando', px: 16, cor: '#777777', fundo: '#ffffff', razao: 4.5, grande: false, minimo: 4.5, abaixo: true } }
  assert.equal(minimo(compararRaioX(comR11(REF), com(arredondado))).length, 1)
  // raio-x antigo (sem pior.abaixo) continua valendo pela razão gravada
  const antigo = { ...comR11(REF).secoes[2].contraste, pior: { texto: 'Antigo', px: 16, cor: '#777777', fundo: '#ffffff', razao: 4.6, grande: false, minimo: 4.5 } }
  assert.equal(minimo(compararRaioX(comR11(REF), com(antigo))).length, 0)
})

test('sugestão de cor: a mais parecida que chega ao alvo; nenhuma chega, diz a mais próxima; família das curvas', () => {
  const paleta = ['#f4efe8', '#222222', '#5b4636', '#c9b8a3']
  assert.deepEqual(paletaDoRaioX(comR11(REF)).sort(), ['#1d1d1b', '#222222', '#f4efe8']) // sem a média da foto (#8a6f55)
  const s = sugerirCor(paleta, '#f4efe8', 4.5, '#9a948c')
  assert.equal(s.hex, '#5b4636') // marrom: mais perto do cinza de agora que o quase preto, e passa de 4,5
  assert.ok(s.atinge && s.razao >= 4.5)
  const n = sugerirCor(['#c9b8a3', '#e0d6c8'], '#f4efe8', 4.5, '#9a948c')
  assert.equal(n.atinge, false)
  assert.equal(n.hex, '#c9b8a3')
  assert.equal(sugerirCor([], '#f4efe8', 4.5), null)
  assert.equal(familiaDaCurva('ease'), 'ease-out')
  assert.equal(familiaDaCurva('ease-in'), 'ease-in')
  assert.equal(familiaDaCurva('ease-in-out'), 'ease-in-out')
  assert.equal(familiaDaCurva('linear'), 'linear')
  assert.equal(familiaDaCurva('cubic-bezier(0.16, 1, 0.3, 1)'), 'ease-out')
  assert.equal(familiaDaCurva('cubic-bezier(0.7, 0, 0.84, 0)'), 'ease-in')
  assert.equal(familiaDaCurva('steps(4, end)'), 'passos')
  assert.equal(familiaDaCurva(null), null)
})

test('mesma planta (mesmo número de seções, mesmo começo e altura): pareia pela ordem, mesmo com fundo feito de outro jeito', () => {
  // A seção clara da referência é um canvas (imagem 0,9, sem movimento); a nossa é CSS (imagem 0) e parece mais
  // com outra seção da referência. A semelhança sozinha trocaria as duas.
  const ref = rx('ref', [S.cab, S.abertura, { id: 'clara', alt: 1, img: 0.9, pal: 80 }, { id: 'escura', alt: 1, img: 0, pal: 20 }, S.rodape], { cena: 1 })
  const nosso = rx('nosso', [S.cab, S.abertura, { id: 'clara', alt: 1, img: 0, pal: 20 }, { id: 'escura', alt: 1, img: 0.9, pal: 80 }, S.rodape], { cena: 1 })
  const p = parearSecoes(ref, nosso).pares
  assert.deepEqual(p.map((x) => [x.ref, x.nosso]), [[1, 1], [2, 2], [3, 3], [4, 4]])
  assert.equal(compararRaioX(ref, nosso).divergencias.filter((d) => d.tipo === 'ordem').length, 0)
  // altura diferente no mesmo ponto: não é a mesma planta, vale a semelhança (a troca continua sendo achada)
  const trocado = rx('nosso', [S.cab, S.abertura, { id: 'escura', alt: 2, img: 0, pal: 20 }, { id: 'clara', alt: 1, img: 0.9, pal: 80 }, S.rodape], { cena: 1 })
  const ref2 = rx('ref', [S.cab, S.abertura, { id: 'clara', alt: 1, img: 0.9, pal: 80 }, { id: 'escura', alt: 2, img: 0, pal: 20 }, S.rodape], { cena: 1 })
  assert.equal(parearSecoes(ref2, trocado).pares.find((x) => x.ref === 2).nosso, 3)
})
