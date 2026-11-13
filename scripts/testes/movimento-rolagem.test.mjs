// Testa a rolagem por alvo (movimento-rolagem.mjs): das medidas completas do raio-x para itens do inventário.
// Trajetórias inventadas (mesmo jeito do ajudante "trajetorias" do raio-x.test.mjs) e uma página local animada por
// JavaScript simples ligado à rolagem, medida com raio-x.mjs --bruto.
// Roda com: node --test scripts/testes/movimento-rolagem.test.mjs   (teste de navegador: um por vez na máquina)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pastaScripts = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts')
const raioX = path.join(pastaScripts, 'raio-x.mjs')
const { acharNavegador } = await import(pathToFileURL(raioX).href)
// ROLAGEM_ALT aponta para outra cópia do módulo (contraprova contra a versão antiga)
const { itensDaRolagem, trechosDeMudanca, trechosDoRecorte } = await import(pathToFileURL(process.env.ROLAGEM_ALT || path.join(pastaScripts, 'movimento-rolagem.mjs')).href)
const { MUDANCAS } = await import(pathToFileURL(path.join(pastaScripts, 'movimento-quadros.mjs')).href)
const dados = path.join(raiz, 'scripts', 'testes', 'dados', 'movimento')

const VW = 1440, VH = 900, PASSO = 90
// Monta o "bruto" do raio-x: s = rolagem por passo; cada elemento é uma função s -> estado. e.d (opcional) = quanto o
// elemento anda para o lado em 250 ms com a página parada; como no raio-x, só medido nos passos k % 4 === 2.
function bruto(totalPx, secoes, assento = () => 0) {
  const s = []
  for (let y = 0; y <= totalPx; y += PASSO) s.push(y)
  const comDeriva = secoes.some((sec) => sec.elementos.some((e) => e.d))
  return {
    prep: { vw: VW, vh: VH, secoes: secoes.map((sec) => ({ desc: sec.desc, topo: sec.topo, altura: sec.altura, dataMov: sec.dataMov ?? null,
      elementos: sec.elementos.map((e) => ({ desc: e.desc, cadeia: !!e.cadeia, pai: e.pai ?? -1, midia: !!e.midia, texto: !!e.texto, ov: !!e.ov, dataMov: e.dataMov ?? null })) })) },
    s,
    amostras: s.map((y, k) => ({ s: y, centro: -1, assentoMs: assento(y), secoes: secoes.map((sec) => ({ e: sec.elementos.map((e) => e.f(y)), ...(sec.elementos.some((e) => e.a) ? { a: sec.elementos.map((e) => (e.a ? e.a(y) : 0)) } : {}), x: {} })),
      ...(comDeriva ? { derivas: k % 4 === 2 ? secoes.map((sec) => sec.elementos.map((e) => (e.d ? e.d(y) : 0))) : null } : {}) })),
  }
}
const caixa = (t, h, extra = {}) => ({ t: Math.round(t), l: 0, w: VW, h, o: 1, ...extra })
const entre = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)))
const perto = (v, alvo, folga, nome) => assert.ok(Math.abs(v - alvo) <= folga, `${nome}: ${v} (esperado ${alvo} ± ${folga})`)
const conferirForma = (it) => {
  assert.ok(!('id' in it), 'item sai sem id')
  for (const c of ['pagina', 'secao', 'gatilho', 'ordem', 'alvo', 'quemMuda', 'muda', 'de', 'para', 'duracaoMs', 'curva', 'atrasoMs', 'escadaMs', 'rolagem', 'fontes', 'confianca', 'tecnica', 'resumo']) assert.ok(c in it, `falta ${c}`)
  for (const c of ['inicioTelas', 'fimTelas', 'inicioNaSecao', 'fimNaSecao', 'presa', 'presaTelas', 'acompanha']) assert.ok(c in it.rolagem, `falta rolagem.${c}`)
  assert.ok(it.muda.length && it.muda.every((m) => MUDANCAS.includes(m)))
  assert.deepEqual(it.fontes, ['amostra'])
  assert.ok(it.resumo.length > 10)
}

test('trechosDeMudanca: um passo parado não corta; troca de sentido corta', () => {
  assert.deepEqual(trechosDeMudanca([0, 0, 1, 2, 2, 3, 3, 3, 3], 0.01).map((t) => [t.a, t.b]), [[1, 5]])
  assert.deepEqual(trechosDeMudanca([0, 1, 2, 1, 0], 0.01).map((t) => [t.a, t.b]), [[0, 2], [2, 4]])
  assert.deepEqual(trechosDeMudanca([1, 1, null, 1], 0.01), [])
})

test('título que escurece e desfoca preso enquanto 3 cartões sobem em escada', () => {
  const fixo = (s) => (s <= 1800 ? 0 : 1800 - s)
  const b = bruto(2700, [{ desc: 'section.cena', topo: 0, altura: 2700, elementos: [
    { desc: 'section.cena', cadeia: true, f: (s) => caixa(-s, 2700) },
    { desc: 'div.fixo', cadeia: true, pai: 0, f: (s) => caixa(fixo(s), 900, { p: 's' }) },
    { desc: 'h1.titulo', pai: 1, texto: true, f: (s) => { const p = entre(s, 0, 1800); return { t: fixo(s) + 100, l: 100, w: 900, h: 120, o: 1, bl: 12 * p, br: 1 - 0.6 * p } } },
    ...[0, 1, 2].map((n) => ({ desc: 'div.cartao', pai: 1, f: (s) => ({ t: fixo(s) + 900 - 700 * entre(s, 360 + 180 * n, 900 + 180 * n), l: 100 + 350 * n, w: 300, h: 300, o: 1 }) })),
  ] }])
  const itens = itensDaRolagem(b, { vh: VH })
  assert.equal(itens.length, 2, JSON.stringify(itens.map((i) => [i.alvo.desc, i.muda])))
  itens.forEach(conferirForma)
  const titulo = itens.find((i) => i.alvo.desc === 'h1.titulo')
  assert.deepEqual(titulo.muda, ['desfoque', 'brilho'])
  assert.deepEqual(titulo.de, { desfoquePx: 0, brilho: 1 })
  assert.deepEqual(titulo.para, { desfoquePx: 12, brilho: 0.4 })
  assert.equal(titulo.gatilho, 'rolagem')
  assert.equal(titulo.rolagem.inicioTelas, 0)
  assert.equal(titulo.rolagem.fimTelas, 2)
  perto(titulo.rolagem.fimNaSecao, 0.67, 0.01, 'fim na seção')
  assert.equal(titulo.rolagem.presa, true)
  perto(titulo.rolagem.presaTelas, 2, 0.1, 'telas presas')
  assert.equal(titulo.rolagem.acompanha, true)
  assert.equal(titulo.duracaoMs, null)
  const cartoes = itens.find((i) => i.alvo.desc === 'div.cartao')
  assert.equal(cartoes.alvo.quantos, 3)
  assert.deepEqual(cartoes.muda, ['posicao-y'])
  assert.equal(cartoes.para.yPx, -700)
  perto(cartoes.rolagem.escadaTelas, 0.2, 0.01, 'escada')
  perto(cartoes.rolagem.cadaUmTelas, 0.6, 0.01, 'cada cartão')
  perto(cartoes.rolagem.inicioTelas, 0.4, 0.01, 'início')
  perto(cartoes.rolagem.fimTelas, 1.4, 0.01, 'fim')
  assert.equal(cartoes.rolagem.presa, true)
  assert.equal(cartoes.rolagem.acompanha, true)
})

test('seção que sobe por cima da anterior, que fica presa', () => {
  const b = bruto(1800, [
    { desc: 'section.a', topo: 0, altura: 900, elementos: [{ desc: 'section.a', cadeia: true, f: (s) => caixa(s <= 900 ? 0 : 900 - s, 900, { p: 's' }) }] },
    { desc: 'section.b', topo: 900, altura: 900, elementos: [{ desc: 'section.b', cadeia: true, f: (s) => caixa(900 - s, 900) }] },
  ])
  const itens = itensDaRolagem(b, { vh: VH })
  assert.equal(itens.length, 1, JSON.stringify(itens.map((i) => [i.alvo.desc, i.muda, i.rolagem])))
  conferirForma(itens[0])
  assert.equal(itens[0].alvo.desc, 'section.b')
  assert.equal(itens[0].secao, 1)
  assert.deepEqual(itens[0].muda, ['posicao-y'])
  assert.equal(itens[0].rolagem.cobre, 0)
  assert.deepEqual([itens[0].rolagem.inicioTelas, itens[0].rolagem.fimTelas], [0, 1])
  assert.deepEqual([itens[0].de.topoTelas, itens[0].para.topoTelas], [1, 0])
  // sem a anterior presa, duas seções que só passam não dão item
  const solto = bruto(1800, [
    { desc: 'section.a', topo: 0, altura: 900, elementos: [{ desc: 'section.a', cadeia: true, f: (s) => caixa(-s, 900) }] },
    { desc: 'section.b', topo: 900, altura: 900, elementos: [{ desc: 'section.b', cadeia: true, f: (s) => caixa(900 - s, 900) }] },
  ])
  assert.deepEqual(itensDaRolagem(solto, { vh: VH }), [])
})

test('alvo com dois movimentos (aparece no começo, some no fim) vira dois itens; na seção de rodapé o gatilho é rodape', () => {
  const o = (s) => (s <= 270 ? s / 270 : s <= 1350 ? 1 : s <= 1620 ? 1 - (s - 1350) / 270 : 0)
  const b = bruto(2700, [{ desc: 'section.x', topo: 0, altura: 2700, elementos: [
    { desc: 'section.x', cadeia: true, f: (s) => caixa(-s, 2700) },
    { desc: 'p.frase', pai: 0, texto: true, f: (s) => ({ t: 300, l: 100, w: 800, h: 80, o: o(s) }) },
  ] }])
  const itens = itensDaRolagem(b, { vh: VH })
  assert.equal(itens.length, 2, JSON.stringify(itens.map((i) => [i.alvo.desc, i.muda, i.ordem])))
  itens.forEach(conferirForma)
  assert.deepEqual(itens.map((i) => [i.alvo.desc, i.ordem, i.gatilho]), [['p.frase', 1, 'rolagem'], ['p.frase', 2, 'rolagem']])
  assert.deepEqual([itens[0].de, itens[0].para, itens[1].de, itens[1].para], [{ opacidade: 0 }, { opacidade: 1 }, { opacidade: 1 }, { opacidade: 0 }])
  assert.deepEqual([itens[0].rolagem.inicioTelas, itens[0].rolagem.fimTelas, itens[1].rolagem.inicioTelas, itens[1].rolagem.fimTelas], [0, 0.3, 1.5, 1.8])
  assert.ok(itens.every((i) => i.rolagem.presa && i.rolagem.acompanha))
  assert.deepEqual(itensDaRolagem(b, { vh: VH, papeis: ['rodapé'] }).map((i) => i.gatilho), ['rodape', 'rodape'])
})

test('entrada que dispara e toca sozinha: acompanha falso, com duração', () => {
  const b = bruto(1800, [{ desc: 'section.y', topo: 900, altura: 900, elementos: [
    { desc: 'section.y', cadeia: true, f: (s) => caixa(900 - s, 900) },
    { desc: 'div.cartao', pai: 0, dataMov: 'M05', f: (s) => ({ t: 900 - s + (s < 450 ? 160 : 100), l: 100, w: 400, h: 200, o: s < 450 ? 0 : 1 }) },
  ] }], (s) => (s === 450 ? 600 : 0))
  const itens = itensDaRolagem(b, { vh: VH })
  assert.equal(itens.length, 1, JSON.stringify(itens.map((i) => [i.alvo.desc, i.muda])))
  conferirForma(itens[0])
  const it = itens[0]
  assert.equal(it.alvo.desc, 'div.cartao')
  assert.equal(it.alvo.dataMov, 'M05', 'o data-mov do elemento chega ao item (a conferência pareia por ele)')
  assert.deepEqual(it.muda, ['posicao-y', 'opacidade'])
  assert.equal(it.rolagem.acompanha, false)
  assert.equal(it.duracaoMs, 600)
  assert.deepEqual([it.de.opacidade, it.para.opacidade, it.para.yPx], [0, 1, -60])
  assert.deepEqual([it.rolagem.inicioTelas, it.rolagem.fimTelas], [0.4, 0.5])
  assert.equal(it.rolagem.presa, false)
  assert.equal(it.confianca, 'media', 'alvo único no passo: o assento da página é dele')
  // a mesma mudança sem a tela se mexer depois da rolagem conta como ligada à rolagem
  const semAssento = bruto(1800, [{ desc: 'section.y', topo: 900, altura: 900, elementos: [
    { desc: 'section.y', cadeia: true, f: (s) => caixa(900 - s, 900) },
    { desc: 'div.cartao', pai: 0, f: (s) => ({ t: 900 - s + 100, l: 100, w: 400, h: 200, o: s < 450 ? 0 : 1 }) },
  ] }])
  assert.equal(itensDaRolagem(semAssento, { vh: VH })[0].rolagem.acompanha, true)
})

test('duas animações independentes na mesma página: o tempo depois da rolagem é de cada alvo, não da página', () => {
  const secoes = (comMedida) => [{ desc: 'section.y', topo: 900, altura: 900, elementos: [
    { desc: 'section.y', cadeia: true, f: (s) => caixa(900 - s, 900) },
    // dispara em 450 px e toca sozinho por 600 ms
    { desc: 'div.cartao', pai: 0, f: (s) => ({ t: 900 - s + (s < 450 ? 160 : 100), l: 100, w: 400, h: 200, o: s < 450 ? 0 : 1 }), ...(comMedida ? { a: (s) => (s === 450 ? 600 : 0) } : {}) },
    // ligado à rolagem, nos mesmos passos: muda só enquanto a página anda
    { desc: 'p.frase', pai: 0, texto: true, f: (s) => ({ t: 900 - s + 400, l: 100, w: 800, h: 80, o: 0.2 + 0.8 * entre(s, 360, 540) }) },
  ] }]
  const itens = itensDaRolagem(bruto(1800, secoes(true), (s) => (s === 450 ? 600 : 0)), { vh: VH })
  assert.deepEqual(itens.map((i) => i.alvo.desc).sort(), ['div.cartao', 'p.frase'])
  itens.forEach(conferirForma)
  const cartao = itens.find((i) => i.alvo.desc === 'div.cartao'), frase = itens.find((i) => i.alvo.desc === 'p.frase')
  assert.deepEqual([cartao.rolagem.acompanha, cartao.duracaoMs, cartao.confianca], [false, 600, 'media'])
  assert.deepEqual([frase.rolagem.acompanha, frase.duracaoMs, frase.confianca], [true, null, 'media'], 'o assento do cartão não pode virar duração da frase')
  assert.match(frase.tecnica, /ligado à rolagem/)
  // sem a medida por alvo só há o assento da página: com dois alvos no mesmo passo não dá para dizer de quem é,
  // e isso sai escrito (confiança baixa), em vez de valer como medido
  const semMedida = itensDaRolagem(bruto(1800, secoes(false), (s) => (s === 450 ? 600 : 0)), { vh: VH })
  for (const it of semMedida) {
    assert.equal(it.confianca, 'baixa', it.alvo.desc)
    assert.match(it.tecnica, /página inteira/, it.alvo.desc)
  }
})

test('recorte: parcelas que se compensam (um lado abre, o outro fecha) dão item; unidades preservadas', () => {
  const b = bruto(1800, [{ desc: 'section.z', topo: 0, altura: 1800, elementos: [
    { desc: 'section.z', cadeia: true, f: (s) => caixa(-s, 1800) },
    { desc: 'div.cortina', pai: 0, midia: true, f: (s) => { const p = entre(s, 180, 720); return { t: 100, l: 100, w: 800, h: 500, o: 1, c: `inset(${50 * p}% 0px ${100 - 50 * p}% 0px)` } } },
  ] }])
  const itens = itensDaRolagem(b, { vh: VH })
  assert.equal(itens.length, 1, JSON.stringify(itens.map((i) => [i.alvo.desc, i.muda])))
  conferirForma(itens[0])
  assert.deepEqual(itens[0].muda, ['recorte'])
  assert.deepEqual([itens[0].de, itens[0].para], [{ recorte: 'inset(0% 0px 100% 0px)' }, { recorte: 'inset(50% 0px 50% 0px)' }])
  assert.deepEqual([itens[0].rolagem.inicioTelas, itens[0].rolagem.fimTelas], [0.2, 0.8])
  assert.equal(itens[0].rolagem.curvaNaRolagem, 'linear')
  const c = (...l) => l.map((x) => (x === null ? null : { c: x || undefined }))
  // zero vale em qualquer unidade; os dois lados mudando juntos são um trecho só
  assert.deepEqual(trechosDoRecorte(c('inset(0px 0px 100% 0px)', 'inset(25% 0px 75% 0px)', 'inset(50% 0px 50% 0px)')).map((x) => [x.a, x.b]), [[0, 2]])
  // abrir e depois fechar o mesmo lado são dois movimentos
  assert.deepEqual(trechosDoRecorte(c('inset(0% 0% 100% 0%)', 'inset(0% 0% 50% 0%)', 'inset(0% 0% 0% 0%)', 'inset(0% 0% 50% 0%)')).map((x) => [x.a, x.b]), [[0, 2], [2, 3]])
  // sem recorte = inset em zero: não é mudança; recorte parado também não
  assert.deepEqual(trechosDoRecorte(c('', 'inset(0px)', '')), [])
  assert.deepEqual(trechosDoRecorte(c('inset(10% 0px 20% 0px)', 'inset(10% 0px 20% 0px)')), [])
  // unidade que troca (10px -> 10%) ou formato que troca não se compara por número: vale o texto ter mudado
  assert.deepEqual(trechosDoRecorte(c('inset(10px)', 'inset(10%)')).map((x) => [x.a, x.b]), [[0, 1]])
  assert.deepEqual(trechosDoRecorte(c('circle(10px at 50% 50%)', 'inset(10px)')).map((x) => [x.a, x.b]), [[0, 1]])
})

test('escada só com trajetórias iguais: irmão que vai para outro lado ou para em outro ponto fica em item próprio', () => {
  const fixo = (s) => (s <= 1800 ? 0 : 1800 - s)
  const cartao = (n, anda, de = 360 + 180 * n) => ({ desc: 'div.cartao', pai: 1, f: (s) => ({ t: fixo(s) + 400 + anda * entre(s, de, de + 540), l: 100 + 250 * n, w: 200, h: 200, o: 1 }) })
  const b = bruto(2700, [{ desc: 'section.cena', topo: 0, altura: 2700, elementos: [
    { desc: 'section.cena', cadeia: true, f: (s) => caixa(-s, 2700) },
    { desc: 'div.fixo', cadeia: true, pai: 0, f: (s) => caixa(fixo(s), 900, { p: 's' }) },
    cartao(0, -300), cartao(1, -300), cartao(2, -300), // sobem em escada
    cartao(3, 300, 360),                               // desce
    cartao(4, -150, 360),                              // sobe só a metade
  ] }])
  const itens = itensDaRolagem(b, { vh: VH }).filter((i) => i.alvo.desc === 'div.cartao')
  assert.deepEqual(itens.map((i) => [i.alvo.quantos, i.para.yPx - i.de.yPx]).sort((p, q) => p[1] - q[1]), [[3, -300], [1, -150], [1, 300]], JSON.stringify(itens.map((i) => [i.alvo.quantos, i.de, i.para])))
  itens.forEach(conferirForma)
  const escada = itens.find((i) => i.alvo.quantos === 3)
  perto(escada.rolagem.escadaTelas, 0.2, 0.01, 'escada')
  // quem é cada degrau (posição na lista de elementos da seção) e em que ordem entra
  assert.deepEqual(escada.rolagem.participantes, [
    { ordem: 1, elemento: 2, inicioTelas: 0.4, fimTelas: 1 },
    { ordem: 2, elemento: 3, inicioTelas: 0.6, fimTelas: 1.2 },
    { ordem: 3, elemento: 4, inicioTelas: 0.8, fimTelas: 1.4 },
  ])
  for (const so of itens.filter((i) => i.alvo.quantos === 1)) assert.ok(!('participantes' in so.rolagem) && !('escadaTelas' in so.rolagem))
})

test('sticky que prende e solta entre duas amostras: a borda não vira movimento do bloco', () => {
  // prende em 400 px e solta em 1300 px; as amostras são a cada 90 px (360, 450 ... 1260, 1350)
  const fixo = (s) => (s < 400 ? 400 - s : s <= 1300 ? 0 : 1300 - s)
  const b = bruto(2700, [{ desc: 'section.cena', topo: 0, altura: 2700, elementos: [
    { desc: 'section.cena', cadeia: true, f: (s) => caixa(-s, 2700) },
    { desc: 'div.fixo', cadeia: true, pai: 0, f: (s) => caixa(fixo(s), 900, { p: 's' }) },
    { desc: 'h2.titulo', pai: 1, texto: true, f: (s) => ({ t: fixo(s) + 100, l: 100, w: 900, h: 120, o: 1 - 0.8 * entre(s, 450, 1260) }) },
  ] }])
  const itens = itensDaRolagem(b, { vh: VH })
  assert.deepEqual(itens.map((i) => [i.alvo.desc, i.muda]), [['h2.titulo', ['opacidade']]], 'o bloco preso não pode ganhar item de posição')
  conferirForma(itens[0])
  assert.equal(itens[0].rolagem.presa, true)
  perto(itens[0].rolagem.presaTelas, 1, 0.15, 'telas presas (900 px, com erro de até um passo)')
  assert.deepEqual([itens[0].rolagem.inicioTelas, itens[0].rolagem.fimTelas], [0.5, 1.4])
  // sem prender (o bloco só passa), o mesmo título não sai como cena presa
  const solto = bruto(2700, [{ desc: 'section.cena', topo: 0, altura: 2700, elementos: [
    { desc: 'section.cena', cadeia: true, f: (s) => caixa(-s, 2700) },
    { desc: 'div.fixo', cadeia: true, pai: 0, f: (s) => caixa(900 - s, 900) },
    { desc: 'h2.titulo', pai: 1, texto: true, f: (s) => ({ t: 900 - s + 100, l: 100, w: 900, h: 120, o: 1 - 0.8 * entre(s, 450, 1260) }) },
  ] }])
  assert.deepEqual(itensDaRolagem(solto, { vh: VH }).map((i) => [i.alvo.desc, i.rolagem.presa]), [['h2.titulo', false]])
})

test('página inteira mudando de lugar (pin recalculado) não vira item; paralaxe de uma seção na mesma janela continua', () => {
  // as seções 1 a 7 (rodapé incluído) andam juntas na página: +40 px em 810, -70 em 1260, +30 em 1530 (as ímpares 2%
  // a mais); a seção 0, acima de onde a altura mudou, fica no lugar
  const desl = (s) => (s >= 810 && s < 1260 ? 40 : s >= 1260 && s < 1530 ? -30 : 0)
  const secoes = (paralaxe) => Array.from({ length: 8 }, (_, i) => {
    const desc = i === 7 ? 'footer.footer' : `section.s${i}`
    const proprio = (s) => (paralaxe && i === 5 ? -200 * entre(s, 900, 1800) : 0)
    return { desc, topo: 900 * i, altura: 900, elementos: [{ desc, cadeia: true, f: (s) => caixa(900 * i - s + (i ? desl(s) * (1 + 0.02 * (i % 2)) : 0) + proprio(s), 900) }] }
  })
  const papeis = [...Array(7).fill('conteudo'), 'rodapé']
  const avisos = []
  const itens = itensDaRolagem(bruto(6300, secoes(false)), { vh: VH, papeis, avisos })
  assert.deepEqual(itens.map((i) => [i.alvo.desc, i.gatilho, i.muda, i.rolagem.inicioTelas, i.rolagem.fimTelas]), [])
  assert.equal(avisos.length, 3, avisos.join('\n'))
  assert.match(avisos[0], /página inteira mudou de lugar entre 0,8 e 0,9 telas \(7 seções juntas, até 41 px\)/)
  assert.match(avisos[1], /entre 1,3 e 1,4 telas \(7 seções/)
  assert.deepEqual(itens.avisos, avisos, 'os avisos também vêm no array devolvido')
  assert.ok(!Object.keys(itens).includes('avisos'), 'sem mudar quem espalha ou conta os itens')
  // a seção 5 sobe 200 px por conta própria entre 1 e 2 telas, por cima dos deslocamentos da página: sai com o tanto dela
  const com = itensDaRolagem(bruto(6300, secoes(true)), { vh: VH, papeis })
  assert.deepEqual(com.map((i) => [i.alvo.desc, i.muda]), [['section.s5', ['posicao-y']]], JSON.stringify(com.map((i) => [i.alvo.desc, i.de, i.para, i.rolagem.inicioTelas])))
  perto(com[0].para.yPx - com[0].de.yPx, -200, 6, 'paralaxe própria')
  assert.deepEqual([com[0].rolagem.inicioTelas, com[0].rolagem.fimTelas], [1, 2])
  assert.match(com.avisos[1], /entre 1,3 e 1,4 telas \(6 seções juntas/, 'dentro da paralaxe a seção 5 não vota')
})

test('fixo que se esconde (transform ou display:none) não anda com a rolagem, solto ou dentro de bloco que rola', () => {
  // some 68 px para cima no primeiro passo e fica escondido: fora da tela, parado nela
  const nav = (s) => ({ t: s < 90 ? 0 : -68, l: 0, w: VW, h: 68, o: 1, p: 'f' })
  const b = bruto(2700, [
    { desc: 'div.navbar_component', topo: 0, altura: 68, elementos: [{ desc: 'div.navbar_component', cadeia: true, f: nav }] },
    { desc: 'div.selo', topo: 0, altura: 50, elementos: [{ desc: 'div.selo', cadeia: true, f: (s) => (s < 90 ? { t: 0, l: 0, w: 300, h: 50, o: 1 } : { t: 0, l: 0, w: 0, h: 0, o: 1 }) }] },
    { desc: 'section.hero', topo: 0, altura: 2700, elementos: [
      { desc: 'section.hero', cadeia: true, f: (s) => caixa(-s, 2700) },
      { desc: 'div.barra', pai: 0, f: nav },
      { desc: 'div.aviso', pai: 0, f: (s) => (s < 90 ? { t: 0, l: 0, w: 400, h: 50, o: 1 } : { t: 0, l: 0, w: 0, h: 0, o: 1 }) },
    ] },
  ])
  const itens = itensDaRolagem(b, { vh: VH })
  // sobra só o esconder em si (posição de tela, sinal certo), não a rolagem inteira
  assert.deepEqual(itens.map((i) => [i.alvo.desc, i.muda, i.de.yPx, i.para.yPx, i.rolagem.inicioTelas, i.rolagem.fimTelas]), [
    ['div.navbar_component', ['posicao-y'], 0, -68, 0, 0.1],
    ['div.barra', ['posicao-y'], 0, -68, 0, 0.1],
  ])
  itens.forEach(conferirForma)
})

test('carrossel que anda sozinho (anda para o lado com a página parada) não vira item; faixa ligada à rolagem continua', () => {
  const secoes = (d) => [{ desc: 'section.galeria', topo: 0, altura: 2700, elementos: [
    { desc: 'section.galeria', cadeia: true, f: (s) => caixa(-s, 2700) },
    { desc: 'div.swiper-wrapper', pai: 0, d, f: (s) => ({ t: 300 - s, l: -Math.round(s / 3), w: 4000, h: 400, o: 1 }) },
  ] }]
  const avisos = []
  assert.deepEqual(itensDaRolagem(bruto(2700, secoes(() => -8)), { vh: VH, avisos }).map((i) => [i.alvo.desc, i.muda, i.rolagem.inicioTelas, i.rolagem.fimTelas]), [])
  assert.equal(avisos.length, 1)
  assert.match(avisos[0], /div\.swiper-wrapper .*página parada \(8 de 8 medidas sem rolar\).*carrossel.*1 trecho entre 0 e 3 telas não virou item/)
  // a mesma faixa parada quando a página para: é ligada à rolagem e continua saindo
  const ligado = itensDaRolagem(bruto(2700, secoes(() => 0)), { vh: VH })
  assert.deepEqual(ligado.map((i) => [i.alvo.desc, i.muda, i.para.xPx]), [['div.swiper-wrapper', ['posicao-x'], -900]])
  assert.deepEqual(ligado.avisos, [])
})

test('carrossel em laço que troca de slide de vez em quando: decide pelo elemento, não pelo trecho', () => {
  // volta ao começo a cada 6 passos (vários trechos curtos) e só 2 das 8 medidas sem rolar pegam a troca de slide
  const b = bruto(2700, [{ desc: 'section.galeria', topo: 0, altura: 2700, elementos: [
    { desc: 'section.galeria', cadeia: true, f: (s) => caixa(-s, 2700) },
    { desc: 'div.swiper-wrapper', pai: 0, d: (s) => (s === 180 || s === 900 ? -30 : 0), f: (s) => ({ t: 300 - s, l: -60 * ((s / PASSO) % 6), w: 4000, h: 400, o: 1 }) },
  ] }])
  const itens = itensDaRolagem(b, { vh: VH })
  assert.deepEqual(itens.map((i) => [i.alvo.desc, i.muda, i.rolagem.inicioTelas, i.rolagem.fimTelas]), [])
  assert.equal(itens.avisos.length, 1, itens.avisos.join('\n'))
  assert.match(itens.avisos[0], /\(2 de 8 medidas sem rolar\).*trechos entre 0 e 3 telas não viraram item/)
})

test('rolagem lateral com a cena presa e scrub lento (anda um pouco depois de a rolagem parar) continua saindo, com aviso', () => {
  const fixo = (s) => (s <= 1800 ? 0 : 1800 - s)
  const b = bruto(2700, [{ desc: 'section.cena', topo: 0, altura: 2700, elementos: [
    { desc: 'section.cena', cadeia: true, f: (s) => caixa(-s, 2700) },
    { desc: 'div.fixo', cadeia: true, pai: 0, f: (s) => caixa(fixo(s), 900, { p: 's' }) },
    { desc: 'div.trilho', pai: 1, d: () => -5, f: (s) => ({ t: fixo(s) + 200, l: -Math.round(2000 * entre(s, 0, 1800)), w: 4000, h: 400, o: 1 }) },
  ] }])
  const itens = itensDaRolagem(b, { vh: VH })
  assert.deepEqual(itens.map((i) => [i.alvo.desc, i.muda, i.para.xPx, i.rolagem.presa]), [['div.trilho', ['posicao-x'], -2000, true]])
  assert.equal(itens.avisos.length, 1)
  assert.match(itens.avisos[0], /div\.trilho .*cena presa entre 0 e 2 telas: ficou como item/)
})

// Mata o processo e os filhos dele (o raio-x abre um Chrome): no Windows o kill() comum deixaria o navegador vivo.
const matar = (p) => {
  if (!p || p.exitCode !== null || p.signalCode !== null) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' })
  else p.kill('SIGKILL')
}

const navegador = acharNavegador()
test('página local animada por JavaScript ligado à rolagem (sem gsap e sem animação CSS), medida com raio-x --bruto', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 240_000 }, async () => {
  // toda a preparação fica dentro do try: se uma etapa falhar (EPERM na pasta, porta, processo), o resto é limpo
  let servidor = null, saida = null, filho = null
  try {
    servidor = http.createServer((req, res) => {
      if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(dados, 'rolagem-js.html'))) } else { res.writeHead(404); res.end() }
    })
    await new Promise((r, x) => { servidor.once('error', x); servidor.listen(0, '127.0.0.1', r) })
    saida = fs.mkdtempSync(path.join(os.tmpdir(), 'movimento-rolagem-teste-'))
    const url = `http://127.0.0.1:${servidor.address().port}/`
    const r = await new Promise((resolve, reject) => {
      filho = spawn(process.execPath, [raioX, url, saida, '--passos', '8', '--bruto'], { stdio: ['ignore', 'pipe', 'pipe'] })
      const limite = setTimeout(() => { matar(filho); reject(new Error('o raio-x não terminou em 200 s')) }, 200_000)
      let out = '', err = ''
      filho.stdout.on('data', (d) => { out += d }); filho.stderr.on('data', (d) => { err += d })
      filho.on('error', (e) => { clearTimeout(limite); reject(e) })
      filho.on('close', (code) => { clearTimeout(limite); resolve({ code, out, err }) })
    })
    assert.equal(r.code, 0, r.err || r.out)
    const b = JSON.parse(fs.readFileSync(path.join(saida, 'amostras-brutas.json'), 'utf8'))
    const rx = JSON.parse(fs.readFileSync(path.join(saida, 'raio-x.json'), 'utf8'))
    assert.deepEqual(rx.bibliotecas.globais.filter((g) => /gsap/i.test(g)), [], 'a página de teste não usa gsap')
    const itens = itensDaRolagem(b, { vh: b.prep.vh, papeis: rx.secoes.map((s) => s.papel) })
    assert.deepEqual(itens.map((i) => i.alvo.desc), ['h2#alvo'], JSON.stringify(itens.map((i) => [i.alvo.desc, i.muda, i.rolagem])))
    const it = itens[0]
    conferirForma(it)
    assert.equal(b.prep.secoes[it.secao].desc, 'section#cena')
    assert.deepEqual(it.muda, ['opacidade', 'desfoque'])
    perto(it.de.opacidade, 1, 0.05, 'opacidade de')
    perto(it.para.opacidade, 0.2, 0.05, 'opacidade para')
    perto(it.para.desfoquePx, 12, 1, 'desfoque para')
    perto(it.rolagem.inicioTelas, 1, 0.2, 'início em telas')
    perto(it.rolagem.fimTelas, 2, 0.2, 'fim em telas')
    perto(it.rolagem.inicioNaSecao, 0, 0.07, 'início na seção')
    perto(it.rolagem.fimNaSecao, 0.33, 0.07, 'fim na seção')
    assert.equal(it.rolagem.presa, true)
    perto(it.rolagem.presaTelas, 2, 0.3, 'telas presas')
    assert.equal(it.rolagem.acompanha, true)
  } finally {
    matar(filho)
    if (servidor) servidor.close()
    if (saida) fs.rmSync(saida, { recursive: true, force: true })
  }
})
