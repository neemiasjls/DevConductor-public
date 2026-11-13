// Juiz às cegas (lp-revisao/scripts/juiz.mjs): pareamento, sorteio das letras, montagem real com imagens pequenas
// (pulada sem Chrome/Edge) e fechamento da nota (mediana, as duas réguas, "adaptado").
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const revisao = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-revisao')
const script = path.join(revisao, 'scripts', 'juiz.mjs')
const J = await import(pathToFileURL(script).href)
const { acharNavegador } = await import(pathToFileURL(path.join(revisao, 'scripts', 'celular.mjs')).href)

const temp = (nome) => fs.mkdtempSync(path.join(os.tmpdir(), `juiz-teste-${nome}-`))
const apagar = (pasta) => fs.rmSync(pasta, { recursive: true, force: true })
const rodar = (...args) => { const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' }); return { codigo: r.status, saida: r.stdout + r.stderr } }

// PNG liso, sem dependência: só para ter imagens de tamanhos conhecidos.
const tabela = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = tabela[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function png(largura, altura, [r, g, b]) {
  const bloco = (tipo, dados) => {
    const corpo = Buffer.concat([Buffer.from(tipo), dados]), fim = Buffer.alloc(4), tam = Buffer.alloc(4)
    tam.writeUInt32BE(dados.length); fim.writeUInt32BE(crc(corpo))
    return Buffer.concat([tam, corpo, fim])
  }
  const cab = Buffer.alloc(13); cab.writeUInt32BE(largura, 0); cab.writeUInt32BE(altura, 4); cab[8] = 8; cab[9] = 2
  const linha = Buffer.concat([Buffer.from([0]), Buffer.alloc(largura * 3, Buffer.from([r, g, b]))])
  const pixels = Buffer.concat(Array.from({ length: altura }, () => linha))
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloco('IHDR', cab), bloco('IDAT', zlib.deflateSync(pixels)), bloco('IEND', Buffer.alloc(0))])
}
function pastaDePrints(nome, arquivos) {
  const pasta = temp(nome)
  for (const [arq, [w, h], cor] of arquivos) fs.writeFileSync(path.join(pasta, arq), png(w, h, cor))
  return pasta
}
const todosOsArquivos = (pasta) => fs.readdirSync(pasta, { recursive: true }).map(String).filter((p) => fs.statSync(path.join(pasta, p)).isFile())

test('tamanhoImagem lê o cabeçalho do PNG', () => {
  assert.deepEqual(J.tamanhoImagem(png(37, 21, [1, 2, 3])), { largura: 37, altura: 21 })
})

test('listarPrints: só <tela>-<secao> das telas conhecidas, em ordem natural', () => {
  const pasta = pastaDePrints('listar', [['computador-10.png', [4, 4], [0, 0, 0]], ['computador-2.png', [4, 4], [0, 0, 0]], ['celular-topo.png', [4, 4], [0, 0, 0]], ['folha-celular.png', [4, 4], [0, 0, 0]]])
  try {
    fs.writeFileSync(path.join(pasta, 'notas.txt'), 'x')
    const r = J.listarPrints(pasta)
    assert.deepEqual(Object.keys(r).sort(), ['celular', 'computador'])
    assert.deepEqual(r.computador.map((s) => s.secao), ['2', '10'])
    assert.throws(() => J.listarPrints(path.join(pasta, 'nao-existe')), /não encontrada/)
  } finally { apagar(pasta) }
})

test('parear: pelo nome, pela ordem (com aviso), pelo mapa, e erro quando não dá', () => {
  const lado = (...nomes) => ({ computador: nomes.map((n) => ({ secao: n, arquivo: `computador-${n}.png` })) })
  const igual = J.parear(lado('1', '2'), lado('1', '2'))
  assert.deepEqual(igual.telas.computador, [{ n: 1, nosso: 'computador-1.png', referencia: 'computador-1.png' }, { n: 2, nosso: 'computador-2.png', referencia: 'computador-2.png' }])
  assert.equal(igual.avisos.length, 0)

  const ordem = J.parear(lado('a', 'b'), lado('1', '2'))
  assert.deepEqual(ordem.telas.computador.map((s) => s.referencia), ['computador-1.png', 'computador-2.png'])
  assert.match(ordem.avisos[0], /pareei pela ordem/)

  const mapa = J.parear(lado('ambientes', 'topo'), lado('1', '2'), [{ nosso: 'topo', referencia: '1' }, { nosso: 'ambientes', referencia: '2' }])
  assert.deepEqual(mapa.telas.computador.map((s) => s.nosso), ['computador-topo.png', 'computador-ambientes.png'])
  assert.deepEqual(mapa.fora, [])

  // Seção fora do mapa: erro (saída 2 na linha de comando); com parcial, vai para "fora" e segue.
  const mapaCurto = { computador: [{ nosso: 'topo', referencia: '2' }] }
  assert.throws(() => J.parear(lado('ambientes', 'topo'), lado('1', '2'), mapaCurto), /Cobertura incompleta.*seção "ambientes" do nosso ficou fora do mapa.*--parcial/)
  const porTela = J.parear(lado('ambientes', 'topo'), lado('1', '2'), mapaCurto, { parcial: true })
  assert.deepEqual(porTela.telas.computador, [{ n: 1, nosso: 'computador-topo.png', referencia: 'computador-2.png' }])
  assert.deepEqual(porTela.fora, ['computador: seção "ambientes" do nosso ficou fora do mapa', 'computador: seção "1" da referência ficou fora do mapa'])

  assert.throws(() => J.parear(lado('a', 'b', 'c'), lado('1', '2')), /--mapa/)
  assert.throws(() => J.parear(lado('a'), lado('1'), [{ nosso: 'x', referencia: '1' }]), /não achei o print "computador-x"/)
  assert.throws(() => J.parear(lado('a'), { celular: [{ secao: '1', arquivo: 'celular-1.png' }] }), /Nenhuma tela/)

  // Tela só de um lado: erro, a não ser com parcial.
  const soNoNosso = { ...lado('1'), celular: [{ secao: '1', arquivo: 'celular-1.png' }] }
  assert.throws(() => J.parear(soNoNosso, lado('1')), /Cobertura incompleta: tela "celular" só existe no nosso/)
  const sobra = J.parear(soNoNosso, lado('1'), undefined, { parcial: true })
  assert.deepEqual(Object.keys(sobra.telas), ['computador'])
  assert.deepEqual(sobra.fora, ['tela "celular" só existe no nosso'])
})

test('linha de comando: cobertura incompleta sem --parcial sai com código 2', () => {
  const nosso = pastaDePrints('nosso', [['computador-1.png', [8, 8], [1, 1, 1]], ['celular-1.png', [8, 8], [1, 1, 1]]])
  const referencia = pastaDePrints('ref', [['computador-1.png', [8, 8], [2, 2, 2]]])
  const saida = path.join(temp('saida'), 'material')
  try {
    const r = rodar('montar', nosso, referencia, saida, '--semente', '1')
    assert.equal(r.codigo, 2, r.saida)
    assert.match(r.saida, /Cobertura incompleta.*--parcial/)
    assert.equal(fs.existsSync(saida), false)
  } finally { for (const p of [nosso, referencia, path.dirname(saida)]) apagar(p) }
})

test('sortear: letras sem repetição entre juízes e telas, ordem invertida de um juiz para o outro, semente repete', () => {
  for (const semente of [1, 2, 3, 42, 2026]) {
    const juizes = J.sortear(['computador', 'celular'], semente)
    assert.equal(juizes.length, 4, 'padrão de 4 juízes, o dono entra')
    assert.deepEqual(juizes.map((j) => j.papel), Object.keys(J.PAPEIS))
    const usadas = juizes.flatMap((j) => Object.values(j.telas).flatMap((t) => Object.keys(t.letras)))
    assert.equal(usadas.length, 16)
    assert.equal(new Set(usadas).size, 16, 'nenhuma letra se repete')
    for (const j of juizes) {
      for (const t of Object.values(j.telas)) {
        assert.deepEqual([...t.ordem].sort(), t.ordem, 'quem é mostrado primeiro tem a letra que vem antes')
        assert.deepEqual(Object.values(t.letras).sort(), ['nosso', 'referencia'])
        assert.equal(t.letras[t.ordem[0]], j.primeiro)
      }
    }
    assert.notEqual(juizes[0].primeiro, juizes[1].primeiro)
    assert.notEqual(juizes[1].primeiro, juizes[2].primeiro)
    assert.notEqual(juizes[2].primeiro, juizes[3].primeiro)
    assert.deepEqual(J.sortear(['computador', 'celular'], semente), juizes)
  }
  const a = JSON.stringify(J.sortear(['computador'], 1)), b = JSON.stringify(J.sortear(['computador'], 2))
  assert.notEqual(a, b, 'sementes diferentes dão sorteios diferentes')
})

test('o pedido ao juiz vem da referência, com rubrica, pesos e formato, e não entrega quem é quem', () => {
  const md = fs.readFileSync(path.join(revisao, 'referencias', 'juiz-as-cegas.md'), 'utf8')
  for (const trecho of ['quatro juízes', 'design 40, usabilidade 30, criatividade 20, conteúdo 10', 'notas.json', 'Codex', 'gabarito']) assert.ok(md.includes(trecho), `falta "${trecho}" na referência`)
  const secoes = { computador: [{ n: 1, nosso: 'computador-topo.png', referencia: 'computador-1.jpg' }, { n: 2, nosso: 'computador-oficio.png', referencia: 'computador-2.jpg' }] }
  const juiz = J.sortear(['computador'], 7)[0]
  const texto = J.textoDoPedido(juiz, 1, secoes)
  assert.doesNotMatch(texto, /\{\{/)
  assert.doesNotMatch(texto, /nosso|refer[eê]ncia|gabarito|topo|oficio/i)
  for (const peso of ['peso 40', 'peso 30', 'peso 20', 'peso 10', 'impede o 9', 'adaptado']) assert.ok(texto.includes(peso), `falta "${peso}" no pedido`)
  const modelo = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(texto)[1])
  assert.deepEqual(Object.keys(modelo.telas.computador), juiz.telas.computador.ordem)
  assert.deepEqual(Object.keys(modelo.telas.computador[juiz.telas.computador.ordem[0]].secoes), ['1', '2'])
})

// ---------------------------------------------------------------------------------------------------------
// montar de verdade
// ---------------------------------------------------------------------------------------------------------
const navegador = acharNavegador()
test('montar: quatro juízes em pastas neutras, mesma resolução nos dois lados, margem cinza sem cortar, fechar lê de lá', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 180_000 }, async () => {
  // Nosso em resolução maior (como os prints de tela densa); a última seção do celular é mais alta no nosso.
  const nosso = pastaDePrints('nosso', [
    ['computador-topo.png', [600, 400], [200, 60, 40]], ['computador-contato.png', [600, 400], [40, 60, 200]],
    ['celular-topo.png', [300, 600], [200, 60, 40]], ['celular-contato.png', [300, 700], [40, 60, 200]],
    ['folha-computador.png', [50, 50], [0, 0, 0]],
  ])
  const referencia = pastaDePrints('ref', [
    ['computador-1.png', [300, 200], [20, 120, 60]], ['computador-2.png', [300, 200], [120, 20, 60]],
    ['celular-1.png', [100, 200], [20, 120, 60]], ['celular-2.png', [100, 200], [120, 20, 60]],
  ])
  const saida = path.join(temp('saida'), 'material')
  const neutra = temp('neutra')
  const mapa = [{ nosso: 'topo', referencia: '1' }, { nosso: 'contato', referencia: '2' }]
  try {
    const g = await J.montar({ nosso, referencia, saida, semente: 5, mapa, neutra })
    assert.equal(g.juizes.length, 4)
    // Na saída só o gabarito; as pastas dos juízes ficam no diretório neutro, com nome sorteado.
    assert.deepEqual(fs.readdirSync(saida), ['gabarito'])
    assert.deepEqual(fs.readdirSync(path.join(saida, 'gabarito')).sort(), ['gabarito.json', 'pastas.json'])
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(saida, 'gabarito', 'gabarito.json'), 'utf8')), g)
    const pastas = JSON.parse(fs.readFileSync(path.join(saida, 'gabarito', 'pastas.json'), 'utf8'))
    assert.deepEqual(pastas, g.pastas)
    assert.deepEqual(Object.keys(pastas), ['juiz-1', 'juiz-2', 'juiz-3', 'juiz-4'])
    for (const p of Object.values(pastas)) {
      assert.equal(path.dirname(p), path.resolve(neutra))
      assert.match(path.basename(p), /^avaliacao-/)
      assert.ok(!p.startsWith(path.dirname(saida)), 'a pasta do juiz não fica ao lado do gabarito')
    }
    assert.equal(new Set(Object.values(pastas)).size, 4)
    assert.equal(g.semente, 5)
    // Nada é cortado: o celular 300x700 desce para 100x233 e a referência (100x200) ganha margem cinza embaixo.
    assert.deepEqual(g.resolucao, { computador: { largura: 300, alturas: [200, 200] }, celular: { largura: 100, alturas: [200, 233] } })
    assert.ok(g.avisos.some((a) => /celular, seção 2: alturas diferentes.*margem cinza/.test(a)))
    assert.deepEqual(g.secoes.computador.map((s) => s.nosso), ['computador-topo.png', 'computador-contato.png'])

    const letras = []
    for (const juiz of g.juizes) {
      const pasta = pastas[juiz.pasta]
      const arquivos = todosOsArquivos(pasta).map((p) => p.replaceAll('\\', '/')).sort()
      const esperados = ['pedido.md']
      for (const [tela, t] of Object.entries(juiz.telas)) {
        assert.deepEqual(fs.readdirSync(path.join(pasta, tela)).sort(), t.ordem, 'as pastas são só as duas letras sorteadas')
        for (const letra of t.ordem) { letras.push(letra); esperados.push(`${tela}/${letra}/secao-1.jpg`, `${tela}/${letra}/secao-2.jpg`) }
        for (const n of [1, 2]) {
          const [a, b] = t.ordem.map((letra) => J.tamanhoImagem(fs.readFileSync(path.join(pasta, tela, letra, `secao-${n}.jpg`))))
          assert.deepEqual(a, b, `${juiz.pasta} ${tela} seção ${n}: mesma resolução nos dois lados`)
          assert.deepEqual(a, { largura: g.resolucao[tela].largura, altura: g.resolucao[tela].alturas[n - 1] })
        }
      }
      assert.deepEqual(arquivos, esperados.sort(), 'nada além do pedido e das imagens na pasta do juiz')
      const pedido = fs.readFileSync(path.join(pasta, 'pedido.md'), 'utf8')
      // "contato" sozinho aparece no foco do dono; o nome do print ("-contato") não pode aparecer.
      assert.doesNotMatch(pedido, /nosso|refer[eê]ncia|gabarito|topo|-contato|\{\{/i)
      for (const t of Object.values(juiz.telas)) assert.match(pedido, new RegExp(`Olhe primeiro o ${t.ordem[0]}, depois o ${t.ordem[1]}`))
    }
    assert.equal(new Set(letras).size, 16, 'letras diferentes por juiz e por tela')
    assert.notEqual(g.juizes[0].primeiro, g.juizes[1].primeiro)

    // O lado certo foi para a letra certa: decodifica o JPEG e confere a cor média de cada lado.
    const letraDo = (juiz, tela, lado) => Object.keys(juiz.telas[tela].letras).find((l) => juiz.telas[tela].letras[l] === lado)
    const imagem = (j, tela, lado, n) => path.join(pastas[g.juizes[j].pasta], tela, letraDo(g.juizes[j], tela, lado), `secao-${n}.jpg`)
    const casos = [
      ['computador', 'nosso', 1, [200, 60, 40]], ['computador', 'referencia', 1, [20, 120, 60]],
      ['celular', 'nosso', 2, [40, 60, 200]],
      // referência 200 px da cor + 33 px de margem cinza (128): média ponderada.
      ['celular', 'referencia', 2, [120, 20, 60].map((c) => (c * 200 + 128 * 33) / 233)],
    ]
    const arquivos = g.juizes.flatMap((_, j) => casos.map(([tela, lado, n]) => imagem(j, tela, lado, n)))
    const conversor = await J.abrirConversor(navegador, arquivos)
    try {
      for (let i = 0; i < arquivos.length; i++) {
        const [tela, lado, n, esperada] = casos[i % casos.length]
        const media = await conversor.corMedia(i)
        esperada.forEach((c, k) => assert.ok(Math.abs(media[k] - c) <= 8, `${arquivos[i]} (${tela}, ${lado}, seção ${n}): cor média ${media}, esperado ${esperada.map(Math.round)}`))
      }
    } finally { await conversor.fechar() }
    assert.ok(fs.readFileSync(imagem(0, 'computador', 'nosso', 1)).equals(fs.readFileSync(imagem(1, 'computador', 'nosso', 1))), 'o nosso é o mesmo arquivo para todos os juízes')

    // fechar lê o notas.json de cada pasta neutra (pelo pastas.json) e copia para a saída.
    g.juizes.forEach((juiz, j) => {
      const resposta = { juiz: j + 1, telas: {}, adaptado: {} }
      for (const [tela, t] of Object.entries(juiz.telas)) {
        resposta.telas[tela] = Object.fromEntries(t.ordem.map((l) => [l, { secoes: { 1: 9.5, 2: 9.5 }, impede: [] }]))
        resposta.adaptado[tela] = 'nenhum'
      }
      fs.writeFileSync(path.join(pastas[juiz.pasta], 'notas.json'), JSON.stringify(resposta))
    })
    const r = J.fechar(saida)
    assert.equal(r.veredito, 'APROVADO')
    for (const juiz of g.juizes) assert.ok(fs.existsSync(path.join(saida, juiz.pasta, 'notas.json')), `${juiz.pasta}/notas.json copiado`)

    await assert.rejects(J.montar({ nosso, referencia, saida, semente: 5, mapa, neutra }), /nova ou vazia/)
  } finally { for (const p of [nosso, referencia, path.dirname(saida), neutra]) apagar(p) }
})

test('montar sem Chrome: erro dizendo o que fazer, sem deixar pasta pela metade', async () => {
  const nosso = pastaDePrints('nosso', [['computador-1.png', [8, 8], [1, 1, 1]]]), referencia = pastaDePrints('ref', [['computador-1.png', [8, 8], [2, 2, 2]]])
  const saida = path.join(temp('saida'), 'material')
  try {
    await assert.rejects(J.montar({ nosso, referencia, saida, executavel: null }), /Chrome\/Edge não encontrado/)
    assert.equal(fs.existsSync(saida), false)
  } finally { for (const p of [nosso, referencia, path.dirname(saida)]) apagar(p) }
})

// ---------------------------------------------------------------------------------------------------------
// fechar
// ---------------------------------------------------------------------------------------------------------
// Monta uma pasta de saída só com gabarito e notas. notas[lado][tela] = uma lista por seção com a nota de cada juiz.
function pastaFechada(notas, { adaptado = [], quatroNotas = false } = {}) {
  const saida = temp('fechar')
  const telas = Object.keys(notas.nosso)
  const secoes = Object.fromEntries(telas.map((t) => [t, notas.nosso[t].map((_, i) => ({ n: i + 1, nosso: `${t}-s${i + 1}.png`, referencia: `${t}-${i + 1}.jpg` }))]))
  const juizes = J.sortear(telas, 11, 3)
  fs.mkdirSync(path.join(saida, 'gabarito'))
  fs.writeFileSync(path.join(saida, 'gabarito', 'gabarito.json'), JSON.stringify({ semente: 11, secoes, juizes, avisos: [] }))
  juizes.forEach((juiz, j) => {
    const resposta = { juiz: j + 1, telas: {}, adaptado: {} }
    for (const [tela, t] of Object.entries(juiz.telas)) {
      resposta.telas[tela] = {}
      for (const [letra, lado] of Object.entries(t.letras)) {
        const doLado = notas[lado][tela].map((porJuiz) => porJuiz[j])
        resposta.telas[tela][letra] = {
          secoes: Object.fromEntries(doLado.map((n, i) => [String(i + 1), quatroNotas ? { design: n, usabilidade: n, criatividade: n, conteudo: n } : n])),
          impede: lado === 'nosso' ? [{ secao: 1, lugar: 'menu', problema: `cobre o título (${tela})`, correcao: 'descer o título' }] : [{ secao: 1, lugar: 'x', problema: 'da referência', correcao: 'y' }],
        }
        if (adaptado[j] === lado) resposta.adaptado[tela] = letra.toLowerCase()
      }
      resposta.adaptado[tela] ??= 'nenhum'
    }
    fs.mkdirSync(path.join(saida, juiz.pasta))
    fs.writeFileSync(path.join(saida, juiz.pasta, 'notas.json'), JSON.stringify(resposta))
  })
  return saida
}
test('mediana e nota da seção com os pesos', () => {
  assert.equal(J.mediana([9, 7, 8]), 8)
  assert.equal(J.mediana([9, 8]), 8.5)
  assert.equal(J.notaDaSecao({ design: 10, usabilidade: 8, criatividade: 6, conteudo: 4 }, 'x'), 8)
  assert.equal(J.notaDaSecao(8.5, 'x'), 8.5)
  assert.throws(() => J.notaDaSecao(11, 'aqui'), /aqui.*0 a 10/)
  assert.throws(() => J.notaDaSecao({ design: 9, usabilidade: 9, criatividade: 9 }, 'aqui'), /conteudo/)
  assert.throws(() => J.notaDaSecao('9', 'aqui'), /0 a 10/)
})

test('fechar: régua A aprova quando toda mediana do nosso é 9 ou mais, mesmo abaixo da referência', () => {
  const saida = pastaFechada({ nosso: { computador: [[9, 9.5, 8.5], [9, 9, 10]] }, referencia: { computador: [[9.5, 9.5, 9.5], [8, 8, 8]] } }, { quatroNotas: true })
  try {
    const r = rodar('fechar', saida)
    assert.equal(r.codigo, 0, r.saida)
    assert.match(r.saida, /APROVADO: régua A passou, régua B não passou/)
    const md = fs.readFileSync(path.join(saida, 'nota-final.md'), 'utf8')
    assert.match(md, /Veredito: APROVADO/)
    assert.match(md, /\| 1 \(computador-s1\.png\) \| 9 \| 1 \| /)
    assert.match(md, /Régua A .*: passou/)
    assert.match(md, /Régua B .*: não passou/)
    assert.match(md, /computador, seção 1 \(juiz 1\): menu: cobre o título/)
    assert.doesNotMatch(md, /x: da referência/, 'o que impede o 9 só lista o nosso')
  } finally { apagar(saida) }
})

test('fechar: régua B aprova quando o nosso empata ou ganha em toda seção e a média passa a da referência + 0,5, sem piso fixo', () => {
  // computador: notas baixas (sem piso de 8,5), médias 7,25 x 6,5. celular: médias 8,75 x 8,25, no limite exato da margem.
  const notas = { nosso: { computador: [[7.5, 7.5, 8], [7, 7, 7]], celular: [[8.5, 8.5, 8.5], [9, 9, 9]] }, referencia: { computador: [[6.5, 7, 6.5], [6.5, 6.5, 6.5]], celular: [[8, 8, 8], [8.5, 8, 8.5]] } }
  const saida = pastaFechada(notas)
  try {
    const r = J.fechar(saida)
    assert.equal(r.reguaA, false)
    assert.deepEqual(r.reguaB, { computador: true, celular: true })
    assert.deepEqual(r.medias, { computador: { nosso: 7.25, referencia: 6.5 }, celular: { nosso: 8.75, referencia: 8.25 } })
    assert.equal(r.aprovado, true)
    assert.equal(r.veredito, 'APROVADO')
    assert.deepEqual(r.telas.computador[0].nosso, { notas: [7.5, 7.5, 8], mediana: 7.5, diferenca: 0.5 })
    assert.deepEqual(r.telas.computador[0].referencia, { notas: [6.5, 7, 6.5], mediana: 6.5, diferenca: 0.5 })
    const md = fs.readFileSync(path.join(saida, 'nota-final.md'), 'utf8')
    assert.match(md, /\| 7,5 \| 0,5 \| 7,5 · 7,5 · 8 \| 6,5 \| 0,5 \| 6,5 · 7 · 6,5 \|/)
    assert.match(md, /Régua B \(.*\+ 0,5\): passou \(computador: passou, médias 7,25 x 6,5; celular: passou, médias 8,75 x 8,25\)/)
  } finally { apagar(saida) }
})

test('fechar: régua B compara as médias sem arredondar (vantagem 0,4967 não passa; 0,5 exato passa)', () => {
  const tres = (n) => [n, n, n]
  const abaixo = pastaFechada({ nosso: { computador: [tres(8), tres(8), tres(8)] }, referencia: { computador: [tres(7.5), tres(7.5), tres(7.51)] } })
  const exato = pastaFechada({ nosso: { computador: [tres(8), tres(8), tres(8)] }, referencia: { computador: [tres(7.5), tres(7.5), tres(7.5)] } })
  try {
    const r = J.fechar(abaixo)
    assert.equal(r.reguaB.computador, false)
    assert.equal(r.passouB, false)
    assert.deepEqual(r.medias.computador, { nosso: 8, referencia: 7.5 }, 'a apresentação continua arredondada')
    assert.equal(J.fechar(exato).reguaB.computador, true)
  } finally { apagar(abaixo); apagar(exato) }
})

test('fechar: reprova quando ganha em toda seção mas sem a margem de 0,5, ou perde numa seção; avisa com 2 apontando o nosso como adaptado', () => {
  // computador ganha ou empata em toda seção, mas médias 8,5 x 8,25 (só +0,25); celular perde a seção 2.
  const notas = { nosso: { computador: [[8, 8, 8.5], [9, 9, 9]], celular: [[9, 9, 9], [8.5, 8.5, 9]] }, referencia: { computador: [[8, 8, 8], [8.5, 8.5, 8.5]], celular: [[8, 8, 8], [9, 9, 8.5]] } }
  const saida = pastaFechada(notas, { adaptado: ['nosso', 'referencia', 'nosso'] })
  try {
    const r = rodar('fechar', saida)
    assert.equal(r.codigo, 1, r.saida)
    assert.match(r.saida, /REPROVADO.*2 de 3 apontaram o nosso como adaptado/)
    const md = fs.readFileSync(path.join(saida, 'nota-final.md'), 'utf8')
    assert.match(md, /Veredito: REPROVADO/)
    assert.match(md, /computador: não passou, médias 8,5 x 8,25; celular: não passou/)
    assert.match(md, /Apontaram o nosso como adaptado: 2 de 3 \(juiz 1, 3\)\. Apontaram a referência: 1 de 3/)
    assert.match(md, /\*\*Aviso:\*\* 2 juízes viram o nosso como adaptado/)
  } finally { apagar(saida) }
})

test('fechar: "adaptado" avisa com 2 juízes mesmo sem maioria, e não avisa com 1', () => {
  const notas = { nosso: { computador: [[9, 9, 9, 9, 9]] }, referencia: { computador: [[8, 8, 8, 8, 8]] } }
  const montarCom = (adaptado) => {
    const saida = temp('adaptado')
    const secoes = { computador: [{ n: 1, nosso: 'computador-s1.png', referencia: 'computador-1.jpg' }] }
    const juizes = J.sortear(['computador'], 4, 5)
    fs.mkdirSync(path.join(saida, 'gabarito'))
    fs.writeFileSync(path.join(saida, 'gabarito', 'gabarito.json'), JSON.stringify({ semente: 4, secoes, juizes, avisos: [] }))
    juizes.forEach((juiz, j) => {
      const t = juiz.telas.computador, resposta = { juiz: j + 1, telas: { computador: {} }, adaptado: { computador: 'nenhum' } }
      for (const [letra, lado] of Object.entries(t.letras)) {
        resposta.telas.computador[letra] = { secoes: { 1: notas[lado].computador[0][j] }, impede: [] }
        if (adaptado.includes(j) && lado === 'nosso') resposta.adaptado.computador = letra
      }
      fs.mkdirSync(path.join(saida, juiz.pasta))
      fs.writeFileSync(path.join(saida, juiz.pasta, 'notas.json'), JSON.stringify(resposta))
    })
    return saida
  }
  const dois = montarCom([0, 3]), um = montarCom([2])
  try {
    const r = J.fechar(dois)
    assert.equal(r.adaptado.nosso, 2)
    assert.equal(r.veredito, 'APROVADO', 'o aviso não muda o veredito')
    assert.match(fs.readFileSync(path.join(dois, 'nota-final.md'), 'utf8'), /\*\*Aviso:\*\* 2 juízes viram o nosso como adaptado/)
    J.fechar(um)
    assert.doesNotMatch(fs.readFileSync(path.join(um, 'nota-final.md'), 'utf8'), /\*\*Aviso:\*\*/)
  } finally { apagar(dois); apagar(um) }
})

test('fechar: sem as três notas, com seção faltando ou sem gabarito não fecha (código 2)', () => {
  const saida = pastaFechada({ nosso: { computador: [[9, 9, 9]] }, referencia: { computador: [[9, 9, 9]] } })
  try {
    const arq = path.join(saida, 'juiz-2', 'notas.json'), boa = fs.readFileSync(arq, 'utf8')
    const quebrada = JSON.parse(boa)
    for (const site of Object.values(quebrada.telas.computador)) delete site.secoes['1']
    fs.writeFileSync(arq, JSON.stringify(quebrada))
    let r = rodar('fechar', saida)
    assert.equal(r.codigo, 2)
    assert.match(r.saida, /juiz-2\/notas\.json: falta a seção 1/)

    fs.rmSync(arq)
    r = rodar('fechar', saida)
    assert.equal(r.codigo, 2)
    assert.match(r.saida, /Faltam notas: juiz-2\/notas\.json/)
    assert.equal(fs.existsSync(path.join(saida, 'nota-final.md')), false)

    r = rodar('fechar', path.join(saida, 'juiz-1'))
    assert.equal(r.codigo, 2)
    assert.match(r.saida, /Rode o "montar" antes/)
    assert.equal(rodar('outra-coisa').codigo, 2)
  } finally { apagar(saida) }
})

// ---------------------------------------------------------------------------------------------------------
// painel: papéis diferentes, quantidade de juízes, dúvida e o que só um juiz apontou
// ---------------------------------------------------------------------------------------------------------
test('painel: padrão de 4 juízes com os 4 papéis, --juizes em ordem, papel só repete quando há mais juízes que papéis', () => {
  assert.equal(J.JUIZES, 4)
  assert.deepEqual(J.sortear(['computador'], 3).map((j) => j.papel), ['direcao-de-arte', 'tipografia', 'celular', 'dono'])
  assert.deepEqual(J.sortear(['computador'], 3, 3).map((j) => j.papel), ['direcao-de-arte', 'tipografia', 'celular'])
  assert.deepEqual(J.sortear(['computador'], 3, 5).map((j) => j.papel)[4], 'direcao-de-arte')
  assert.deepEqual(J.sortear(['computador'], 3, 3, ['dono', 'celular', 'tipografia']).map((j) => j.papel), ['dono', 'celular', 'tipografia'])
  // Repetição abaixo do número de papéis é erro: juízes do mesmo papel valem como um só.
  assert.throws(() => J.sortear(['computador'], 3, 3, ['dono', 'celular']), /--papeis: com 3 juízes são precisos 3 papéis diferentes \(vieram 2\)/)
  assert.throws(() => J.sortear(['computador'], 3, 4, ['dono', 'dono', 'celular', 'tipografia']), /--papeis: com 4 juízes são precisos 4/)
  assert.throws(() => J.sortear(['computador'], 3, 6, ['dono', 'celular', 'tipografia']), /são precisos 4/)
  assert.deepEqual(J.sortear(['computador'], 3, 6).map((j) => j.papel).slice(4), ['direcao-de-arte', 'tipografia'], 'com mais juízes que papéis, repete')
  const grande = J.sortear(['computador', 'tablet', 'celular'], 9, 6)
  assert.equal(grande.length, 6)
  for (const j of grande) assert.equal(new Set(Object.values(j.telas).flatMap((t) => t.ordem)).size, 6, 'letras do mesmo juiz não se repetem')
  assert.notEqual(grande[4].primeiro, grande[5].primeiro)
  for (const n of [2, 9, 3.5]) assert.throws(() => J.sortear(['computador'], 1, n), /--juizes/)
})

test('painel: cada papel tem o seu pedido, com a mesma rubrica e o mesmo formato, sem entregar quem é quem', () => {
  const secoes = { computador: [{ n: 1, nosso: 'computador-topo.png', referencia: 'computador-1.jpg' }] }
  const juizes = J.sortear(['computador'], 7, 4)
  const textos = juizes.map((j, i) => J.textoDoPedido(j, i + 1, secoes))
  const marcas = [/diretor de arte/, /tipógrafo/, /celular com uma mão/, /cinco segundos/]
  textos.forEach((texto, i) => {
    assert.match(texto, new RegExp(`## Seu papel: ${J.PAPEIS[juizes[i].papel]}`))
    marcas.forEach((marca, k) => (k === i ? assert.match(texto, marca) : assert.doesNotMatch(texto, marca)))
    assert.doesNotMatch(texto, /\{\{|<!--/)
    assert.doesNotMatch(texto, /nosso|refer[eê]ncia|gabarito|topo/i)
    for (const trecho of ['peso 40', 'peso 30', 'peso 20', 'peso 10', 'impede o 9', 'notas.json']) assert.ok(texto.includes(trecho), `falta "${trecho}"`)
    assert.deepEqual(Object.keys(JSON.parse(/```json\n([\s\S]*?)\n```/.exec(texto)[1])), ['juiz', 'telas', 'adaptado'])
  })
  assert.deepEqual(Object.keys(J.focosDosPapeis()), Object.keys(J.PAPEIS))
  assert.throws(() => J.textoDoPedido({ ...juizes[0], papel: 'inventado' }, 1, secoes), /Papel desconhecido: "inventado"/)
  const md = fs.readFileSync(path.join(revisao, 'referencias', 'juiz-as-cegas.md'), 'utf8')
  for (const trecho of ['outra família vale mais', 'codex exec -s read-only', 'nas duas ordens', 'critica-de-movimento.md', 'tira de quadros', 'lado a lado (A/B)']) assert.ok(md.includes(trecho), `falta "${trecho}" na referência`)
})

test('o pedido enviado ao juiz nunca diz "nosso", "referência", "gabarito" nem "topo", em nenhum papel', () => {
  const secoes = { computador: [{ n: 1, nosso: 'computador-topo.png', referencia: 'computador-1.jpg' }], celular: [{ n: 1, nosso: 'celular-topo.png', referencia: 'celular-1.jpg' }] }
  const proibidas = /\b(nosso|nossa|nossos|refer[eê]ncias?|gabarito|topo)\b/i
  assert.doesNotMatch(J.modeloDoPedido(), proibidas, 'o modelo do pedido na referência')
  for (const [id, foco] of Object.entries(J.focosDosPapeis())) assert.doesNotMatch(foco, proibidas, `o foco do papel ${id}`)
  for (const semente of [1, 2, 3]) {
    J.sortear(['computador', 'celular'], semente).forEach((juiz, i) => {
      const texto = J.textoDoPedido(juiz, i + 1, secoes)
      const achou = proibidas.exec(texto)
      assert.equal(achou, null, `juiz ${i + 1} (${juiz.papel}): o pedido tem "${achou?.[0]}"`)
    })
  }
})

test('painel: fechar com quatro juízes; dúvida no nosso com as réguas passando é PENDENTE (saída 3); consenso antes do que só um apontou', () => {
  const saida = temp('painel')
  try {
    const secoes = { computador: [1, 2, 3].map((n) => ({ n, nosso: `computador-s${n}.png`, referencia: `computador-${n}.jpg` })) }
    const juizes = J.sortear(['computador'], 5, 4)
    // seção 1: todos de acordo; seção 2: diferença 2 (dúvida); seção 3: diferença 1,5 (ainda não é dúvida).
    const aponta = [[], [{ secao: 2, lugar: 'título', problema: 'linhas se tocam', correcao: 'abrir a entrelinha' }], [{ secao: 1, lugar: 'botão', problema: 'pequeno para o dedo' }], [{ secao: 1, lugar: 'abertura', problema: 'não diz a cidade' }, { secao: 3, lugar: 'rodapé', problema: 'sem telefone' }]]
    fs.mkdirSync(path.join(saida, 'gabarito'))
    fs.writeFileSync(path.join(saida, 'gabarito', 'gabarito.json'), JSON.stringify({ semente: 5, secoes, juizes, avisos: [] }))
    juizes.forEach((juiz, j) => {
      const resposta = { juiz: j + 1, telas: { computador: {} }, adaptado: { computador: 'nenhum' } }
      for (const [letra, lado] of Object.entries(juiz.telas.computador.letras)) {
        resposta.telas.computador[letra] = lado === 'nosso'
          ? { secoes: { 1: 9, 2: [9, 7, 9, 9][j], 3: [9.5, 9, 8, 9][j] }, impede: aponta[j] }
          // a referência tem diferença 2 na seção 3: dúvida sobre a referência não conta.
          : { secoes: { 1: 9, 2: 9, 3: [9, 9, 9, 7][j] }, impede: [] }
      }
      fs.mkdirSync(path.join(saida, juiz.pasta))
      fs.writeFileSync(path.join(saida, juiz.pasta, 'notas.json'), JSON.stringify(resposta))
    })
    const r = rodar('fechar', saida)
    assert.equal(r.codigo, 3, r.saida) // régua A passaria, mas há dúvida no nosso: pendente do dono
    assert.match(r.saida, /^PENDENTE: régua A passou.*dúvida: chamar o dono \(1 seção com diferença acima de 1,5\)/)
    const f = J.fechar(saida)
    assert.equal(f.juizes, 4)
    assert.equal(f.reguaA, true)
    assert.equal(f.passou, true)
    assert.equal(f.pendente, true)
    assert.equal(f.aprovado, false)
    assert.equal(f.veredito, 'PENDENTE')
    assert.deepEqual(f.telas.computador[1].nosso, { notas: [9, 7, 9, 9], mediana: 9, diferenca: 2 })
    assert.deepEqual(f.telas.computador[2].referencia.diferenca, 2)
    assert.deepEqual(f.duvidas, [{ tela: 'computador', n: 2, lado: 'nosso', diferenca: 2 }], 'só o nosso conta como dúvida')
    assert.deepEqual(f.consenso.map((g) => [g.tela, g.secao, g.juizes]), [['computador', 1, [3, 4]]])
    assert.deepEqual(f.soDele.map((p) => [p.juiz, p.papel, p.itens.map((i) => i.secao)]), [[2, 'tipografia', [2]], [4, 'dono', [3]]])
    const md = fs.readFileSync(path.join(saida, 'nota-final.md'), 'utf8')
    assert.match(md, /Veredito: PENDENTE\*\* \(4 juízes; vale a mediana\)/)
    assert.match(md, /Painel: juiz 1, direção de arte e composição; juiz 2, tipografia e acabamento; juiz 3, celular e uso; juiz 4, dono do negócio\./)
    assert.match(md, /\*\*Dúvida: chamar o dono\.\*\*.*computador, seção 2 \(2\)\..*o veredito fica PENDENTE/)
    assert.match(md, /\| 2 \(computador-s2\.png\) \| 9 \| 2 \(dúvida: chamar o dono\) \| 9 · 7 · 9 · 9 \|/)
    assert.match(md, /\| 3 \(computador-s3\.png\) \| 9 \| 1,5 \| /)
    assert.doesNotMatch(md, /\| 2 \(dúvida: chamar o dono\) \| 9 · 9 · 9 · 7 \|/, 'a referência não leva a marca de dúvida')
    // Consenso primeiro (com a contagem), depois o que só um apontou.
    assert.match(md, /### Consenso: 2 ou mais juízes[^\n]*\n\n\*\*computador, seção 1: 2 de 4 juízes \(3, 4\)\*\*\n\n- computador, seção 1 \(juiz 3\): botão: pequeno para o dedo\n- computador, seção 1 \(juiz 4\): abertura: não diz a cidade/)
    assert.ok(md.indexOf('### Consenso') < md.indexOf('## O que só um juiz apontou'))
    assert.match(md, /## O que só um juiz apontou, por papel[\s\S]*### Juiz 2: tipografia e acabamento\n\n- computador, seção 2: título: linhas se tocam Correção: abrir a entrelinha[\s\S]*### Juiz 4: dono do negócio\n\n- computador, seção 3: rodapé: sem telefone/)
    assert.doesNotMatch(md.split('## O que só um juiz apontou')[1], /botão|cidade/, 'seção 1 foi apontada por dois juízes')
  } finally { apagar(saida) }
})

test('fechar: sem dúvida e com as réguas passando, aprova com saída 0', () => {
  const saida = pastaFechada({ nosso: { computador: [[9, 9.5, 9]] }, referencia: { computador: [[8, 8, 8]] } })
  try {
    const r = rodar('fechar', saida)
    assert.equal(r.codigo, 0, r.saida)
    assert.match(r.saida, /^APROVADO/)
  } finally { apagar(saida) }
})
