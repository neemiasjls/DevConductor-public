// Conferência de acabamento (lp-revisao/scripts/acabamento.mjs): regras das 7 conferências com medidas simuladas e uma
// rodada real contra duas páginas locais, uma com os 7 defeitos e outra sem nenhum (pulada sem Chrome/Edge).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins/landing-pages/skills/lp-revisao/scripts/acabamento.mjs')
const A = await import(pathToFileURL(script).href)

const fixo = (extra = {}) => ({ seletor: 'a.zap', rolagem: 800, passos: 10, vw: 390, vh: 844, ret: { x: 300, y: 760, w: 60, h: 60 },
  cobre: [{ tipo: 'texto', seletor: 'p.sobre', trecho: 'fim do parágrafo', pontos: 6, area: 400, fracao: 0.02 }], ...extra })

test('1 fixo sobre conteúdo: botão que cobre texto reprova; barra encostada na borda é moldura', () => {
  const [a] = A.avaliarFixos([fixo(), fixo({ rolagem: 1200 })])
  assert.equal(a.nivel, 'nunca-passa')
  assert.match(a.medida, /cobre o texto "fim do parágrafo" de p\.sobre.*2 de 10 posições/)
  assert.deepEqual(A.avaliarFixos([fixo({ ret: { x: 0, y: 0, w: 390, h: 64 } })]), [], 'cabeçalho inteiro no alto')
  assert.deepEqual(A.avaliarFixos([fixo({ ret: { x: 0, y: 798, w: 390, h: 46 } })]), [], 'barra inteira no pé')
  assert.equal(A.avaliarFixos([fixo({ ret: { x: 20, y: 16, w: 350, h: 56 } })]).length, 1, 'barra solta, menor que 95%, não é moldura')
  assert.equal(A.avaliarFixos([fixo({ ret: { x: 0, y: 0, w: 390, h: 844 } })]).length, 1, 'painel fixo que cobre a tela inteira não é moldura')
  assert.equal(A.avaliarFixos([fixo({ ret: { x: 0, y: 500, w: 390, h: 344 } })]).length, 1, 'gaveta presa no pé com 40% da tela não é moldura')
  assert.deepEqual(A.avaliarFixos([fixo({ ret: { x: 0, y: 633, w: 390, h: 211 } })]), [], 'barra no pé com 25% da tela ainda é moldura')
})

test('1 fixo sobre conteúdo: imagem só conta com 10% ou mais coberta; um ponto só de texto não conta', () => {
  const img = (fracao) => fixo({ cobre: [{ tipo: 'imagem', seletor: 'img.foto', trecho: '', pontos: 9, area: 900, fracao }] })
  assert.deepEqual(A.avaliarFixos([img(0.04)]), [])
  assert.match(A.avaliarFixos([img(0.25)])[0].medida, /cobre 25% da imagem img\.foto/)
  assert.deepEqual(A.avaliarFixos([fixo({ cobre: [{ tipo: 'texto', seletor: 'p', trecho: 'x', pontos: 1, area: 36, fracao: 0 }] })]), [])
})

const titulo = (passo, texto) => ({ seletor: 'h2.t', rolagem: 0, texto, trecho: texto, escala: 1, linhas: [{ base: 100, fs: 50 }, { base: 100 + passo, fs: 50 }] })

test('2 linhas de título: 1,15 com acento, cedilha ou Q em maiúscula; 1,0 nos demais', () => {
  assert.equal(A.avaliarTitulos([titulo(51, 'MÓVEIS SOB MEDIDA')])[0].nivel, 'nunca-passa') // 1,02
  assert.match(A.avaliarTitulos([titulo(51, 'COZINHA QUE DURA')])[0].medida, /entrelinha 1,02.*mínimo 1,15/)
  assert.deepEqual(A.avaliarTitulos([titulo(58, 'MÓVEIS SOB MEDIDA')]), []) // 1,16
  assert.deepEqual(A.avaliarTitulos([titulo(51, 'MESA DE JANTAR')]), []) // 1,02 sem acento passa
  assert.equal(A.avaliarTitulos([titulo(45, 'MESA DE JANTAR')]).length, 1) // 0,9 nunca passa
  assert.deepEqual(A.avaliarTitulos([{ ...titulo(45, 'MESA'), linhas: [{ base: 100, fs: 50 }] }]), [], 'uma linha só não é medida')
})

test('2 linhas de título: desconta a escala de um bloco reduzido por transform', () => {
  assert.equal(A.entrelinhaEfetiva([{ base: 0, fs: 50 }, { base: 30, fs: 50 }], 0.5), 1.2)
})

const bloco = (...linhas) => ({ seletor: 'p.x', rolagem: 0, trecho: 'texto', linhas: linhas.map(([largura, palavras]) => ({ largura, palavras, texto: 'fim' })) })

test('3 órfã: palavra sozinha ou linha com menos de 20% da mais larga', () => {
  assert.match(A.avaliarOrfas([bloco([400, 8], [120, 1])])[0].medida, /uma palavra só/)
  assert.match(A.avaliarOrfas([bloco([400, 8], [60, 2])])[0].medida, /curta \(15%/)
  assert.equal(A.avaliarOrfas([bloco([400, 8], [60, 2])])[0].nivel, 'justificar')
  assert.deepEqual(A.avaliarOrfas([bloco([400, 8], [200, 3])]), [])
  assert.deepEqual(A.avaliarOrfas([bloco([400, 8])]), [], 'uma linha só')
  assert.deepEqual(A.avaliarOrfas([bloco([300, 1], [280, 1], [260, 1])]), [], 'título empilhado de propósito')
  const solto = (trecho, ...linhas) => ({ seletor: 'p.x', rolagem: 0, trecho, linhas: linhas.map(([largura, palavras, texto]) => ({ largura, palavras, texto })) })
  assert.deepEqual(A.avaliarOrfas([solto('Peça já', [200, 2, 'Peça já'], [30, 1, 'aqui'])]), [], 'menos de 4 palavras não é texto corrido')
  assert.deepEqual(A.avaliarOrfas([solto('2 / 6 — 10', [200, 4, '2 / 6 —'], [20, 1, '10'])]), [], 'contador sem letras')
  assert.equal(A.avaliarOrfas([solto('Móveis sob medida para a casa', [400, 5, 'Móveis sob medida para a'], [60, 1, 'casa'])]).length, 1)
  assert.deepEqual(A.avaliarOrfas([solto('Cozinha planejada em freijó 2 / 6', [400, 4, 'Cozinha planejada em freijó'], [40, 3, '2 / 6'])]), [], 'última linha sem letra (contador)')
})

test('4 imagem: ampliação respeita object-fit, densidade e tamanho do fundo', () => {
  const img = (extra) => ({ tipo: 'img', seletor: 'img.a', rolagem: 0, arquivo: 'a.jpg', caixa: { w: 400, h: 300 }, natural: { w: 400, h: 300 }, ajuste: 'fill', dpr: 1, ...extra })
  assert.equal(A.ampliacaoDe(img()).ampliacao, 1)
  assert.equal(A.ampliacaoDe(img({ dpr: 2 })).ampliacao, 2)
  assert.equal(A.ampliacaoDe(img({ ajuste: 'cover', natural: { w: 800, h: 300 } })).ampliacao, 1) // corta os lados
  assert.equal(A.ampliacaoDe(img({ ajuste: 'contain', natural: { w: 800, h: 300 } })).ampliacao, 0.5)
  assert.equal(A.ampliacaoDe(img({ natural: { w: 800, h: 300 } })).esticada, true)
  assert.equal(A.ampliacaoDe(img({ natural: { w: 404, h: 300 } })).esticada, false, '1% de diferença é arredondamento')
  assert.equal(A.ampliacaoDe({ tipo: 'fundo', caixa: { w: 1000, h: 500 }, natural: { w: 500, h: 500 }, tamanho: 'cover' }).ampliacao, 2)
  assert.equal(A.ampliacaoDe({ tipo: 'fundo', caixa: { w: 1000, h: 500 }, natural: { w: 500, h: 500 }, tamanho: '100% 100%' }).esticada, true)
  assert.equal(A.ampliacaoDe({ tipo: 'fundo', caixa: { w: 1000, h: 500 }, natural: { w: 500, h: 500 }, tamanho: '250px' }).ampliacao, 0.5)
  assert.equal(A.ampliacaoDe({ tipo: 'fundo', caixa: { w: 1000, h: 500 }, natural: { w: 500, h: 500 }, tamanho: 'auto' }), null)
  assert.equal(A.ampliacaoDe(img({ natural: { w: 0, h: 0 } })), null, 'arquivo que não carregou não é medido')

  const niveis = (lista) => A.avaliarImagens(lista).map((a) => a.nivel)
  assert.deepEqual(niveis([img()]), [])
  assert.deepEqual(niveis([img({ ajuste: 'cover', natural: { w: 320, h: 240 } })]), ['aviso']) // 1,25×
  assert.deepEqual(niveis([img({ ajuste: 'cover', natural: { w: 200, h: 150 } })]), ['nunca-passa']) // 2×
  assert.deepEqual(niveis([img({ natural: { w: 800, h: 300 } })]), ['nunca-passa']) // esticada
  assert.equal(A.avaliarImagens([img({ dpr: 2 }), img({ dpr: 2 })]).length, 1, 'a mesma imagem no mesmo lugar conta uma vez')

  // O que não deu para medir não some: vai para "não medido" com seletor e motivo.
  const sem = A.avaliarTudo({ largura: 390, vh: 844, imagens: [img({ natural: { w: 0, h: 0 } }), img({ seletor: 'img.b', caixa: { w: 0, h: 0 } }),
    { tipo: 'fundo', seletor: 'div.f', rolagem: 9, arquivo: 'f.jpg', caixa: { w: 1000, h: 500 }, natural: { w: 500, h: 500 }, tamanho: 'auto' }], grupos: [], fixos: [], titulos: [], blocos: [], lacos: [], vaos: [] })
  assert.deepEqual(sem.naoMedido.map((x) => [x.n, x.seletor, x.medida]), [[4, 'img.a', 'a.jpg: a imagem não carregou'], [4, 'img.b', 'a.jpg: a caixa na tela não tem tamanho'], [4, 'div.f', 'f.jpg: tamanho do fundo "auto" não é medido']])
})

test('5 cor do grupo: foto longe da média pede justificativa; sem medida aparece como não medido', () => {
  const foto = (lab, n) => ({ seletor: `img.f${n}`, arquivo: `f${n}.jpg`, lab })
  const igual = { seletor: 'ul.grade', rolagem: 0, fotos: [foto([50, 2, 10], 1), foto([52, 3, 11], 2), foto([51, 1, 9], 3)] }
  assert.deepEqual(A.avaliarCor([igual]), { achados: [], naoMedido: [] })
  const fora = { seletor: 'ul.grade', rolagem: 0, fotos: [foto([50, 2, 10], 1), foto([52, 3, 11], 2), foto([51, 1, 9], 3), foto([55, 22, 26], 4)] }
  const r = A.avaliarCor([fora])
  assert.deepEqual(r.achados.map((a) => [a.seletor, a.nivel]), [['ul.grade', 'justificar']])
  assert.match(r.achados[0].medida, /^1 de 4 fotos longe do tom do grupo \(mediana; limite 12\): f4\.jpg 24,9$/)
  const clara = { seletor: 'ul.grade', rolagem: 0, fotos: [foto([30, 2, 10], 1), foto([52, 3, 11], 2), foto([85, 1, 9], 3)] }
  assert.deepEqual(A.avaliarCor([clara]).achados, [], 'claridade diferente com o mesmo tom não é cor desigual')
  const duas = { seletor: 'ul.grade', rolagem: 0, fotos: [foto([50, 2, 10], 1), foto([50, 3, 11], 2), foto([50, 1, 9], 3), foto([50, 2, 10], 4), foto([50, 40, 40], 5), foto([50, 2, 9], 6)] }
  assert.match(A.avaliarCor([duas]).achados[0].medida, /^1 de 6 fotos/, 'a mediana não é puxada pela foto diferente')
  const dobrado = A.avaliarCor([{ ...fora, fotos: [...fora.fotos, ...fora.fotos] }])
  assert.match(dobrado.achados[0].medida, /^1 de 4 fotos/, 'lista duplicada de faixa em laço conta cada foto uma vez')
  const cego = { seletor: 'ul.grade', rolagem: 0, fotos: [foto(null, 1), foto(null, 2), foto(null, 3)].map((f) => ({ ...f, motivo: 'sem acesso aos pontos da imagem' })) }
  const s = A.avaliarCor([cego])
  assert.equal(s.achados.length, 0)
  assert.equal(s.naoMedido.length, 3)
  assert.match(A.resumoTexto(A.montarRelatorio('http://x/', [1440], [A.avaliarTudo({ largura: 1440, vh: 900, grupos: [cego] })])), /NÃO MEDIDO \(3\): conferir no olho/)
})

test('6 emenda do laço: uma volta tem de andar um múltiplo do período', () => {
  assert.equal(A.erroDaEmenda(480, 480), 0)
  assert.equal(A.erroDaEmenda(960, 480), 0)
  assert.equal(A.erroDaEmenda(470, 480), 10)
  assert.equal(A.erroDaEmenda(100, 480), 380, 'andar menos que um período também é salto')
  assert.equal(A.erroDaEmenda(100, 0), null)
  assert.deepEqual(A.avaliarLacos([{ seletor: 'ul.faixa', rolagem: 0, deslocamento: 480.4, periodo: 480 }]), [])
  assert.match(A.avaliarLacos([{ seletor: 'ul.faixa', rolagem: 0, deslocamento: 463.5, periodo: 480 }])[0].medida, /salto de 16,5 px/)
})

test('7 vão morto: maior que 1,8× a mediana e que 25% da tela', () => {
  const vao = (tamanho) => ({ y: 1000, tamanho, antes: 'p.a', depois: 'h2.b' })
  assert.equal(A.mediana([40, 10, 30]), 30)
  assert.deepEqual(A.avaliarVaos([vao(40), vao(48), vao(60), vao(200)], 900), [], '200 px é menos de 25% de 900')
  const [a] = A.avaliarVaos([vao(40), vao(48), vao(60), vao(400), vao(8)], 900)
  assert.equal(a.nivel, 'aviso')
  assert.match(a.medida, /400 px vazios entre p\.a e h2\.b \(44% da tela/)
  assert.deepEqual(A.avaliarVaos([vao(300), vao(320), vao(310)], 900), [], 'ritmo largo e igual não é vão morto')
})

test('relatório: código 1 só com achado que nunca passa; resumo separa os níveis', () => {
  const m = (extra) => ({ largura: 390, vh: 844, ...extra })
  const leve = A.montarRelatorio('http://x/', [390], [A.avaliarTudo(m({ blocos: [bloco([400, 8], [120, 1])] }))])
  assert.equal(leve.codigo, 0)
  assert.match(A.resumoTexto(leve), /EXIGE JUSTIFICATIVA \(1\)\n- \[390\] 3\. Órfã: p\.x/)
  assert.match(A.resumoTexto(leve), /Resultado: nada que reprove sozinho; 1 achado\(s\) pedem justificativa escrita e 0 aviso\(s\)/)
  const grave = A.montarRelatorio('http://x/', [390], [A.avaliarTudo(m({ fixos: [fixo()], blocos: [bloco([400, 8], [120, 1])] }))])
  assert.equal(grave.codigo, 1)
  assert.equal(grave.achados[0].nivel, 'nunca-passa')
  assert.match(A.resumoTexto(grave), /Resultado: reprovado, 1 achado\(s\) que nunca passam/)
})

test('argumentos e telas', () => {
  assert.deepEqual(A.lerArgs(['http://x/']).larguras, [1440, 390])
  const op = A.lerArgs(['p.html', 'saida', '--larguras', '1280,360', '--json'])
  assert.deepEqual([op.url, op.saida, op.larguras, op.json], ['p.html', 'saida', [1280, 360], true])
  assert.match(A.lerArgs(['p.html', '--larguras', 'abc']).erro, /larguras/)
  assert.match(A.lerArgs(['p.html', '--outra']).erro, /desconhecida/)
  assert.deepEqual(A.telaDe(1440), { largura: 1440, altura: 900, movel: false, dpr: 1 })
  assert.deepEqual(A.telaDe(390), { largura: 390, altura: 844, movel: true, dpr: 2 })
})

test('uso errado e página que não existe saem com código 2', () => {
  const rodar = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
  const semNada = rodar()
  assert.equal(semNada.status, 2)
  assert.match(semNada.stdout, /Uso: node acabamento\.mjs/)
  const sumiu = rodar(path.join(os.tmpdir(), 'acabamento-nao-existe.html'))
  assert.equal(sumiu.status, 2)
  assert.match(sumiu.stdout, /não deu para conferir/)
})

// ---------------------------------------------------------------------------------------------------------
// Rodada real: duas páginas pequenas, abertas do disco (as imagens vão embutidas para o canvas poder ler)
// ---------------------------------------------------------------------------------------------------------
function bmp(w, h, [r, g, b]) {
  const linha = Math.ceil((w * 3) / 4) * 4
  const buf = Buffer.alloc(54 + linha * h)
  buf.write('BM'); buf.writeUInt32LE(buf.length, 2); buf.writeUInt32LE(54, 10); buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(w, 18); buf.writeInt32LE(h, 22); buf.writeUInt16LE(1, 26); buf.writeUInt16LE(24, 28); buf.writeUInt32LE(linha * h, 34)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = 54 + y * linha + x * 3; buf[o] = b; buf[o + 1] = g; buf[o + 2] = r }
  return 'data:image/bmp;base64,' + buf.toString('base64')
}
const cinza = bmp(120, 90, [128, 124, 120]), cinza2 = bmp(120, 90, [134, 130, 124]), cinza3 = bmp(120, 90, [124, 122, 118]), quente = bmp(120, 90, [165, 120, 88]), pequena = bmp(40, 30, [90, 110, 90])
const lero = 'Fazemos móveis sob medida com madeira de lei, ferragem boa e prazo combinado por escrito desde a primeira visita. '

function pagina({ ruim }) {
  const itens = ['Cozinhas', 'Quartos', 'Salas', 'Escritórios']
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${ruim ? 'ruim' : 'boa'}</title><style>
    body { margin: 0; font: 18px/1.6 Arial, sans-serif; }
    main { width: 800px; margin: 0 auto; padding-top: 90px; }
    main > * { margin: 0 0 40px; }
    .barra { position: fixed; top: 0; left: 0; width: 100%; height: 60px; background: #222; color: #fff; }
    .zap { position: fixed; bottom: 24px; width: 160px; height: 90px; background: #1a7; color: #fff; ${ruim ? 'left: 50%;' : 'right: 16px;'} }
    h2 { font-size: 48px; width: 700px; text-transform: uppercase; line-height: ${ruim ? 0.95 : 1.2}; }
    .grade { display: flex; gap: 16px; list-style: none; padding: 0; }
    .grade img { width: 120px; height: 90px; display: block; }
    .janela { overflow: hidden; width: 600px; }
    .faixa { display: flex; width: max-content; list-style: none; padding: 0; margin: 0; animation: anda 8s linear infinite; ${ruim ? 'gap: 20px;' : ''} }
    .faixa li { width: 100px; ${ruim ? '' : 'margin-right: 20px;'} }
    @keyframes anda { to { transform: translateX(-50%); } }
    .fundo { width: ${ruim ? 400 : 120}px; height: ${ruim ? 300 : 90}px; background: url(${ruim ? pequena : cinza}) center / cover no-repeat; }
  </style>
  <div class="barra">Marcenaria</div>
  <a class="zap" href="https://wa.me/5511999999999">Chamar no WhatsApp</a>
  <main>
    <h2 id="titulo">Ação que dura<br>três gerações</h2>
    <p id="sobre" style="width: 700px">${ruim ? 'Uma linha bem comprida de texto de leitura para o teste<br>fim.' : 'Uma linha bem comprida de texto de leitura para o teste<br>e outra linha comprida de texto para fechar.'}</p>
    <ul class="grade" id="grade"><li><img src="${cinza}" alt="a"></li><li><img src="${cinza2}" alt="b"></li><li><img src="${cinza3}" alt="b2"></li><li><img src="${ruim ? quente : cinza}" alt="c"></li></ul>
    <img id="ampliada" src="${ruim ? pequena : cinza}" alt="d" style="display: block; width: ${ruim ? 400 : 120}px; height: ${ruim ? 300 : 90}px">
    <img id="esticada" src="${cinza}" alt="e" style="display: block; width: ${ruim ? 240 : 100}px; height: ${ruim ? 90 : 75}px">
    <div class="fundo" id="fundo"></div>
    <div class="janela"><ul class="faixa" id="faixa">${[...itens, ...itens].map((t) => `<li>${t}</li>`).join('')}</ul></div>
    ${Array.from({ length: 6 }, () => `<div class="texto">${lero.repeat(4)}</div>`).join('\n')}
    ${ruim ? '<div style="height: 700px"></div>' : ''}
    ${ruim ? `<div style="width: 120px; height: 90px; transform: scale(2); transform-origin: 0 0; margin-bottom: 140px"><img id="escalada" src="${cinza}" alt="g" style="display: block; width: 120px; height: 90px"></div>
    <img id="quebrada" src="nao-existe.jpg" alt="h" style="display: block; width: 120px; height: 90px">` : ''}
    ${Array.from({ length: 6 }, () => `<div class="texto">${lero.repeat(4)}</div>`).join('\n')}
  </main></html>`
}

const navegador = (await import(pathToFileURL(path.join(path.dirname(script), 'celular.mjs')).href)).acharNavegador()
test('rodada real: a página com os 7 defeitos é pega nos 7 e a página boa sai limpa', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 300_000 }, async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'acabamento-'))
  try {
    const arq = (nome, ruim) => { const p = path.join(pasta, nome); fs.writeFileSync(p, pagina({ ruim })); return pathToFileURL(p).href }
    const ruim = (await A.conferir({ url: arq('ruim.html', true), larguras: [1200], exe: navegador })).relatorio
    const de = (n) => ruim.achados.filter((a) => a.n === n)
    const lista = JSON.stringify(ruim.achados.map((a) => [a.n, a.seletor, a.medida]), null, 1)
    assert.equal(ruim.codigo, 1)
    assert.deepEqual(de(1).map((a) => [a.seletor, a.nivel]), [['a.zap', 'nunca-passa']], lista)
    assert.deepEqual(de(2).map((a) => a.seletor), ['h2#titulo'], lista)
    assert.match(de(2)[0].medida, /entrelinha 0,95/)
    assert.deepEqual(de(3).map((a) => a.seletor), ['p#sobre'], lista)
    assert.deepEqual(de(4).map((a) => a.seletor).sort(), ['div#fundo.fundo', 'img#ampliada', 'img#escalada', 'img#esticada'], lista)
    assert.match(de(4).find((a) => a.seletor === 'img#ampliada').medida, /ampliada 10×/)
    assert.match(de(4).find((a) => a.seletor === 'img#escalada').medida, /ampliada 2× .*caixa de 240×180/, 'conta o transform: scale(2) do pai')
    assert.match(de(4).find((a) => a.seletor === 'img#esticada').medida, /esticada/)
    assert.equal(de(5).length, 1, lista)
    assert.equal(de(5)[0].seletor, 'ul#grade.grade')
    assert.match(de(5)[0].medida, /^1 de 4 fotos longe/)
    assert.deepEqual(de(6).map((a) => a.seletor), ['ul#faixa.faixa'], lista)
    assert.match(de(6)[0].medida, /salto de 10 px/)
    assert.equal(de(7).length, 1, lista)
    assert.equal(de(7)[0].nivel, 'aviso')
    assert.deepEqual(ruim.naoMedido.map((x) => [x.n, x.seletor, x.medida]), [[4, 'img#quebrada', 'nao-existe.jpg: a imagem não carregou']], 'imagem que não carregou aparece como não medida')
    assert.ok(ruim.achados.every((a) => a.largura === 1200 && Number.isFinite(a.rolagem) && a.seletor && a.medida))

    const boa = (await A.conferir({ url: arq('boa.html', false), larguras: [1200], exe: navegador })).relatorio
    assert.deepEqual(boa.achados.map((a) => [a.n, a.seletor, a.medida]), [])
    assert.equal(boa.naoMedido.length, 0)
    assert.equal(boa.codigo, 0)
  } finally { fs.rmSync(pasta, { recursive: true, force: true }) }
})

test('rodada real: imagem sem medida não some na coleta; ícone pequeno, escondido e fundo de caixa zerada ficam fora', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 180_000 }, async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'acabamento-sem-medida-'))
  try {
    const p = path.join(pasta, 'sem-medida.html')
    fs.writeFileSync(p, `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>sem medida</title><style>body { margin: 0; } main { width: 800px; margin: 0 auto; } main > * { display: block; margin: 0 0 40px; }</style><main>
      <img id="zerada" src="${cinza}" alt="a" style="width: 200px; height: 0">
      <img id="fina" src="${pequena}" alt="b" style="width: 400px; height: 30px">
      <img id="icone" src="nao-existe-icone.png" alt="c" style="width: 24px; height: 24px">
      <img id="escondida" src="nao-existe-escondida.jpg" alt="d" style="display: none">
      <div id="textura" style="width: 200px; height: 100px; background: url(${cinza}) repeat"></div>
      <div id="textura-quebrada" style="width: 200px; height: 100px; background-image: url(nao-existe-fundo.jpg)"></div>
      <div id="fundo-zerado" style="width: 200px; height: 0; background: url(nao-existe-zerado.jpg) center / cover"></div>
    </main></html>`)
    const rel = (await A.conferir({ url: pathToFileURL(p).href, larguras: [1200], exe: navegador })).relatorio
    const sem = rel.naoMedido.map((x) => [x.seletor, x.medida.replace(/^.*?: /, '')]).sort()
    assert.deepEqual(sem, [
      ['div#textura', 'tamanho do fundo "auto" não é medido'],
      ['div#textura-quebrada', 'a imagem não carregou'],
      ['img#zerada', 'a caixa na tela não tem tamanho'],
    ], JSON.stringify(rel.naoMedido))
    const n4 = rel.achados.filter((a) => a.n === 4)
    assert.deepEqual(n4.map((a) => a.seletor), ['img#fina'], 'faixa fina (um lado < 48 px) é medida')
    assert.match(n4[0].medida, /esticada/)
  } finally { fs.rmSync(pasta, { recursive: true, force: true }) }
})
