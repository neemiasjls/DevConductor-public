// Raio-x da referência: classificação das trajetórias (sintéticas), robots.txt, roteiro, custo e uma página
// local de verdade com seção presa, paralaxe e revelação por clip-path.
// Rodar: node --test scripts/testes/raio-x.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import zlib from 'node:zlib'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts', 'raio-x.mjs')
const { classificarSecao, permitidoPeloRobots, gerarRoteiro, gerarCusto, acharNavegador, TIPOS, AGENTE, motivoDecorativo,
  pareceAvisoCookies, limparEscala, papelDaSecao, decodificarPng, corMediaRegiao, resumoContraste, temposParaMs, ritmoDaSecao,
  curvaDaTrajetoria, ritmoEstimado, gerarMedidasCss, contraste, CONTRASTE_MINIMO, textosDaSecao, medir, mediana } = await import(new URL('file:///' + script.replace(/\\/g, '/')).href)

const VW = 1440, VH = 900, PASSO = 90
// Monta a entrada do classificador: s = rolagem por passo; cada elemento é uma função s -> estado.
function trajetorias(totalPx, elementos) {
  const s = []
  for (let y = 0; y <= totalPx; y += PASSO) s.push(y)
  return {
    vw: VW, vh: VH, s,
    elementos: elementos.map((e) => ({ desc: e.desc, cadeia: !!e.cadeia, pai: e.pai ?? -1, midia: !!e.midia, texto: !!e.texto, ov: !!e.ov, estados: s.map(e.f) })),
    secaoNoCentro: s.map(() => false), corPagina: s.map(() => '#ffffff'), texto: s.map(() => ({ nl: 0, sl: 0, nw: 0, sw: 0 })), deriva: s.map(() => null), estatico: {},
  }
}
const caixa = (t, h, extra = {}) => ({ t: Math.round(t), l: 0, w: VW, h, o: 1, ...extra })

test('vocabulário fixo de movimento', () => {
  assert.deepEqual(TIPOS, ['presa', 'paralaxe', 'revelacao-mascara', 'rolagem-lateral', 'zoom', 'pilha', 'texto-letra',
    'texto-linha', 'entrada-simples', 'marquee', '3d', 'video', 'troca-de-cor', 'nenhum'])
})

test('presa: bloco que fica parado no alto por 2 telas', () => {
  const d = trajetorias(4000, [
    { desc: 'section.presa', f: (s) => caixa(500 - s, 2700) },
    { desc: 'div.sticky', pai: 0, f: (s) => caixa(s < 500 ? 500 - s : s <= 2300 ? 0 : 2300 - s, 900, { p: 's' }) },
  ])
  const r = classificarSecao(d)
  assert.ok(r.tipos.includes('presa'), r.tipos.join())
  const p = r.detalhes.find((x) => x.tipo === 'presa')
  assert.ok(Math.abs(p.duracaoTelas - 2) <= 0.15, `duração ${p.duracaoTelas}`)
  assert.ok(Math.abs(p.inicioTelas - 0.56) <= 0.15, `início ${p.inicioTelas}`)
  assert.ok(!r.tipos.includes('paralaxe'))
})

test('paralaxe: imagem que anda a 0,6 da rolagem', () => {
  const d = trajetorias(2700, [
    { desc: 'section.galeria', f: (s) => caixa(900 - s, 1800) },
    { desc: 'img.foto', pai: 0, midia: true, f: (s) => ({ ...caixa(900 - s + 200 + 0.4 * s, 600), w: 800 }) },
  ])
  const r = classificarSecao(d)
  assert.deepEqual(r.tipos, ['paralaxe'])
  const ex = r.detalhes[0].exemplos[0]
  assert.ok(Math.abs(ex.fator - 0.6) <= 0.05, `fator ${ex.fator}`)
})

test('revelação por máscara: clip-path que abre com a rolagem', () => {
  const d = trajetorias(2700, [
    { desc: 'section.revela', f: (s) => caixa(900 - s, 1800) },
    { desc: 'div.imagem', pai: 0, f: (s) => { const x = Math.max(0, 50 - s / 30); return { ...caixa(900 - s + 100, 700), c: `inset(0% ${x}% 0% ${x}%)` } } },
  ])
  const r = classificarSecao(d)
  assert.ok(r.tipos.includes('revelacao-mascara'), r.tipos.join())
  assert.equal(r.detalhes.find((x) => x.tipo === 'revelacao-mascara').exemplos[0].como, 'clip-path')
})

test('rolagem lateral: faixa que anda para o lado com a seção presa', () => {
  const d = trajetorias(4500, [
    { desc: 'section.trilho', cadeia: true, f: (s) => caixa(s < 900 ? 900 - s : s <= 3600 ? 0 : 3600 - s, 900) },
    { desc: 'div.faixa', pai: 0, f: (s) => ({ ...caixa(s < 900 ? 900 - s : s <= 3600 ? 0 : 3600 - s, 900), w: 4200, l: -Math.min(2700, Math.max(0, s - 900)) }) },
  ])
  const r = classificarSecao(d)
  assert.ok(r.tipos.includes('rolagem-lateral'), r.tipos.join())
  assert.ok(r.tipos.includes('presa'), r.tipos.join())
  assert.ok(r.forca > 4)
})

test('nenhum: seção que só passa', () => {
  const d = trajetorias(2700, [
    { desc: 'section.texto', f: (s) => caixa(900 - s, 900) },
    { desc: 'p', pai: 0, texto: true, f: (s) => ({ ...caixa(900 - s + 100, 200), w: 600 }) },
  ])
  const r = classificarSecao(d)
  assert.deepEqual(r.tipos, ['nenhum'])
  assert.equal(r.forca, 0)
})

test('entrada simples: aparece subindo uma vez e para', () => {
  const d = trajetorias(2700, [
    { desc: 'section.cards', f: (s) => caixa(900 - s, 1200) },
    { desc: 'div.card', pai: 0, f: (s) => { const p = Math.min(1, Math.max(0, (s - 180) / 270)); return { ...caixa(900 - s + 200 + 60 * (1 - p), 300), w: 400, o: Math.round(p * 100) / 100 } } },
  ])
  const r = classificarSecao(d)
  assert.deepEqual(r.tipos, ['entrada-simples'])
})

// Abertura presa (como em sites de GSAP): o título apaga e cartões sobem por cima enquanto o bloco segura a tela.
function aberturaPresa(atraso) {
  const topo = (s) => (s <= 900 ? 0 : 900 - s)
  return trajetorias(2700, [
    { desc: 'div.pin-spacer', f: (s) => caixa(-s, 1800) },
    { desc: 'header.hero', cadeia: true, pai: 0, f: (s) => caixa(topo(s), 1800) },
    { desc: 'div.titulo', pai: 1, texto: true, f: (s) => ({ ...caixa(topo(s) + 300, 300), w: 1000, o: Math.max(0, 1 - s / 400) }) },
    ...[0, 1, 2].map((c) => ({ desc: 'div.cartao', pai: 1, f: (s) => {
      const p = Math.min(1, Math.max(0, (s - c * atraso) / 600))
      return { ...caixa(topo(s) + 1400 - 1250 * p, 400), w: 400, l: 100 + c * 450 }
    } })),
  ])
}

test('camada sobre bloco preso: cartões sobem juntos e o título apaga', () => {
  const r = classificarSecao(aberturaPresa(0))
  assert.ok(r.tipos.includes('presa'), r.tipos.join())
  const par = r.detalhes.find((x) => x.tipo === 'paralaxe')
  assert.ok(par, r.tipos.join())
  assert.equal(par.quantos, 3)
  assert.match(par.exemplos[0].como, /sobe por cima/)
  assert.equal(r.detalhes.find((x) => x.tipo === 'entrada-simples').exemplos[0].como, 'some (opacidade)')
})

test('pilha: cartões sobem em escada por cima do bloco preso', () => {
  const r = classificarSecao(aberturaPresa(270))
  assert.ok(r.tipos.includes('pilha'), r.tipos.join())
  assert.ok(!r.tipos.includes('paralaxe'), r.tipos.join())
})

test('robots.txt: grupo próprio, curinga, Allow mais longo e $', () => {
  const txt = 'User-agent: *\nDisallow: /privado/\nAllow: /privado/aberto\n\nUser-agent: GPTBot\nDisallow: /\n'
  assert.equal(permitidoPeloRobots(txt, AGENTE, '/'), true)
  assert.equal(permitidoPeloRobots(txt, AGENTE, '/privado/x'), false)
  assert.equal(permitidoPeloRobots(txt, AGENTE, '/privado/aberto/1'), true)
  assert.equal(permitidoPeloRobots('User-agent: *\nDisallow: /\n', AGENTE, '/qualquer'), false)
  assert.equal(permitidoPeloRobots('User-agent: DevConductor-lp-referencias\nDisallow: /\nUser-agent: *\nAllow: /\n', AGENTE, '/'), false)
  assert.equal(permitidoPeloRobots('User-agent: *\nDisallow: /*.pdf$\n', AGENTE, '/a.pdf'), false)
  assert.equal(permitidoPeloRobots('User-agent: *\nDisallow: /*.pdf$\n', AGENTE, '/a.pdf.html'), true)
  assert.equal(permitidoPeloRobots('User-agent: *\nDisallow:\n', AGENTE, '/'), true)
  assert.equal(permitidoPeloRobots('', AGENTE, '/'), true)
})

// RFC 9309 §2.2.2: codificação não contorna a regra. Caractere não reservado codificado (%70 = p) é comparado
// decodificado, nos dois lados; hex sem diferença de maiúscula; não-ASCII cru na regra casa com o mesmo em UTF-8.
test('robots.txt: variante codificada não contorna a regra (pedido e regra normalizados)', () => {
  const r = (regras, caminho) => permitidoPeloRobots('User-agent: *\n' + regras + '\n', AGENTE, caminho)
  assert.equal(r('Disallow: /proibido', '/%70roibido/cena.json'), false)
  assert.equal(r('Disallow: /proibido', '/pro%69bido'), false)
  assert.equal(r('Disallow: /~equipe', '/%7eequipe/'), false)
  assert.equal(r('Disallow: /%70roibido', '/proibido/x'), false) // regra escrita codificada casa com pedido cru
  assert.equal(r('Disallow: /a%2fb', '/a%2Fb'), false) // reservado: só o hex é igualado
  assert.equal(r('Disallow: /privé', '/priv%C3%A9/1'), false)
  assert.equal(r('Disallow: /privé', '/priv%c3%a9/1'), false)
})

test('robots.txt: reservado codificado continua codificado; Allow mais longo e curingas como eram', () => {
  const r = (regras, caminho) => permitidoPeloRobots('User-agent: *\n' + regras + '\n', AGENTE, caminho)
  assert.equal(r('Disallow: /a/b', '/a%2Fb'), true) // %2F não vira /
  assert.equal(r('Disallow: /a%2Fb', '/a/b'), true)
  assert.equal(r('Disallow: /p', '/%2570'), true) // %25 fica %25 (sem decodificar duas vezes)
  assert.equal(r('Disallow: /a%2Ab', '/aXXb'), true) // %2A não é curinga
  assert.equal(r('Disallow: /a%24', '/a'), true) // %24 não é fim exato
  assert.equal(r('Disallow: /a%2Eb', '/aXb'), true) // %2E vira "." literal, não "qualquer"
  assert.equal(r('Disallow: /a%2Eb', '/a.b'), false)
  // desempate pelo tamanho normalizado: /%70rivado (= /privado) é mais curto que /privado/
  assert.equal(r('Disallow: /%70rivado\nAllow: /privado/', '/privado/x'), true)
  assert.equal(r('Disallow: /%70rivado/\nAllow: /privado/aberto', '/privado/aberto/1'), true)
  assert.equal(r('Disallow: /%70rivado/\nAllow: /privado/aberto', '/privado/x'), false)
  assert.equal(r('Disallow: /*.pdf$', '/a.%70df'), false)
  assert.equal(r('Disallow: /*.pdf$', '/a.pdf.html'), true)
  assert.equal(r('Disallow: /a%zz', '/a%zz/1'), false) // codificação inválida fica como está, sem erro
  assert.doesNotThrow(() => r('Disallow: /\uD800x', '/\uD800x'))
})

const exemplo = {
  url: 'https://exemplo.test/', data: '2026-11-10T12:00:00.000Z', viewport: { largura: 1440, altura: 900, celular: false },
  rolagem: { alturaTelas: 5, passos: 40, passoPx: 90 }, bibliotecas: { globais: ['GSAP 3.12'], sinais: [], scripts: [] },
  pagina: { corpoPx: 16, fontes: [{ familia: 'Inter', parte: 0.8 }], escala: [{ px: 96, razao: 6 }, { px: 16, razao: 1 }], corFundo: '#f4efe8', corTexto: '#111111' },
  secoes: [
    { indice: 0, topoTelas: 0, alturaTelas: 1, colunas: 1, palavras: 12, imagens: 0, videos: 1, canvas: 0, imagemTexto: 0.9, corFundo: '#000000', corTexto: '#ffffff', raioPx: 0, fontes: [{ familia: 'Inter', px: 96 }], titulo: { texto: 'Casas que respiram', px: 96, razao: 6 }, respiro: { topoTelas: 0.3, baseTelas: 0.2 }, print: 'prints/secao-01.jpg' },
    { indice: 1, topoTelas: 1, alturaTelas: 3, colunas: 2, palavras: 80, imagens: 3, videos: 0, canvas: 1, imagemTexto: 0.5, corFundo: '#f4efe8', corTexto: '#111111', raioPx: 12, fontes: [], titulo: null, respiro: null, print: null },
  ],
  movimento: [
    { secao: 0, tipos: ['video'], forca: 2, detalhes: [{ tipo: 'video', quantos: 1, exemplos: [{ telaOcupada: 1, automatico: true }] }] },
    { secao: 1, tipos: ['presa', '3d'], forca: 8, detalhes: [{ tipo: 'presa', elemento: 'section', inicioTelas: 1, fimTelas: 3, duracaoTelas: 2 }, { tipo: '3d', quantos: 1, exemplos: [{ origem: 'canvas WebGL', telaOcupada: 0.8 }] }] },
  ],
  cenaPrincipal: 1, avisos: [],
}

test('roteiro conta a página seção por seção e marca a cena principal', () => {
  const md = gerarRoteiro(exemplo)
  assert.match(md, /Cena principal:\*\* seção 2/)
  assert.match(md, /## Seção 1 — 1 telas/)
  assert.match(md, /fica \*\*presa\*\* na tela por 2 telas/)
  assert.match(md, /Casas que respiram/)
  assert.match(md, /6× o corpo/)
  assert.match(md, /cena principal/)
})

test('custo aponta vídeo e 3D com equivalente; página simples não pede nada', () => {
  const md = gerarCusto(exemplo)
  assert.match(md, /vídeo grande de fundo/)
  assert.match(md, /canvas WebGL grande \(provável fundo animado por shader/)
  assert.match(md, /Equivalente:/)
  const comThree = gerarCusto({ ...exemplo, bibliotecas: { globais: ['Three.js r160'], sinais: [], scripts: [] } })
  assert.match(comThree, /cena 3D \(Three\.js\)/)
  const simples = { ...exemplo, movimento: [{ secao: 0, tipos: ['nenhum'], forca: 0, detalhes: [] }] }
  assert.match(gerarCusto(simples), /Nenhuma cena pede peça/)
})

test('fundo animado: canvas WebGL sem biblioteca 3D e sem interação fica só nos detalhes, fora de "tipos"', () => {
  const base = trajetorias(1800, [{ desc: 'section.shader', f: (s) => caixa(-s, 900) }])
  const tela = VW * VH
  const r = classificarSecao({ ...base, estatico: { canvas: [{ area: tela, webgl: true }] } })
  assert.deepEqual(r.tipos, ['nenhum'])
  assert.equal(r.detalhes[0].tipo, 'fundo-animado')
  assert.ok(r.forca > 0)
  assert.ok(classificarSecao({ ...base, estatico: { canvas: [{ area: tela, webgl: true, interativo: true }] } }).tipos.includes('3d'))
  const comLib = classificarSecao({ ...base, estatico: { canvas: [{ area: tela, webgl: true }] }, lib3d: 'Three.js r160' })
  assert.ok(comLib.tipos.includes('3d'))
  assert.equal(comLib.detalhes.find((d) => d.tipo === '3d').biblioteca, 'Three.js r160')
  const rx = { ...exemplo, movimento: [{ secao: 0, tipos: ['nenhum'], forca: 1.5, detalhes: r.detalhes }] }
  assert.match(gerarCusto(rx), /fundo animado por shader .*Não é cena 3D/)
  assert.match(gerarCusto(rx), /3D × fundo animado/)
  assert.match(gerarRoteiro(rx), /\*\*fundo animado\*\* \(canvas WebGL ocupando 100% da tela/)
})

test('enfeite: SVG, aria-hidden, apagado sem cursor e texto gigante apagado; título comum não', () => {
  const titulo = { svg: false, ariaHidden: false, semCursor: false, opacidade: 1, palavras: 3, px: 96, contraste: null }
  assert.equal(motivoDecorativo(titulo, 16), null)
  assert.match(motivoDecorativo({ ...titulo, svg: true }, 16), /SVG/)
  assert.match(motivoDecorativo({ ...titulo, ariaHidden: true }, 16), /aria-hidden/)
  assert.match(motivoDecorativo({ ...titulo, semCursor: true, opacidade: 0.2 }, 16), /pointer-events/)
  assert.equal(motivoDecorativo({ ...titulo, semCursor: true, opacidade: 0.8 }, 16), null)
  const gigante = { ...titulo, palavras: 1, px: 240 }
  assert.equal(motivoDecorativo(gigante, 16), null) // grande mas legível: é título
  assert.match(motivoDecorativo({ ...gigante, contraste: 1.2 }, 16), /marca d'água/)
  assert.match(motivoDecorativo({ ...gigante, opacidade: 0.3 }, 16), /marca d'água/)
  assert.equal(motivoDecorativo({ ...gigante, contraste: 1.2 }, Infinity), null) // antes de saber o corpo, não decide
})

test('aviso de cookies: barra pequena com id ou texto; a página inteira que cita "cookie" não', () => {
  const barra = { idClasse: 'cookie-banner DIV', texto: 'Usamos cookies.', altura: 120, largura: 1440, vw: 1440, vh: 900 }
  assert.equal(pareceAvisoCookies(barra), true)
  assert.equal(pareceAvisoCookies({ ...barra, idClasse: 'barra DIV', texto: 'Este site usa cookies. Aceitar' }), true)
  assert.equal(pareceAvisoCookies({ ...barra, idClasse: 'menu DIV', texto: 'Início Sobre Contato' }), false)
  assert.equal(pareceAvisoCookies({ idClasse: 'onetrust-consent-sdk DIV', sombra: true }), true)
  const pagina = { idClasse: 'smooth-wrapper DIV', texto: 'x'.repeat(5000) + ' Cookie policy', altura: 900, largura: 1440, vw: 1440, vh: 900 }
  assert.equal(pareceAvisoCookies(pagina), false)
})

test('escala: degrau com menos de 0,5% do texto sai, salvo se for tamanho de título de seção', () => {
  const escala = [{ px: 96, parte: 0.004 }, { px: 48, parte: 0.03 }, { px: 16, parte: 0.9 }, { px: 11, parte: 0.001 }]
  assert.deepEqual(limparEscala(escala).map((e) => e.px), [48, 16])
  assert.deepEqual(limparEscala(escala, [96]).map((e) => e.px), [96, 48, 16])
  assert.deepEqual(limparEscala([{ px: 20 }]).map((e) => e.px), [20]) // JSON antigo sem "parte" fica
  assert.deepEqual(limparEscala(undefined), [])
})

test('papel da seção: abertura, contato, depoimentos, galeria, lista de serviços, faixa de texto', () => {
  const base = { topoTelas: 2, alturaTelas: 1, palavras: 60, imagens: 1, imagemTexto: 0.3, colunas: 1 }
  assert.equal(papelDaSecao({ ...base, cabecalho: true }), 'cabeçalho')
  assert.equal(papelDaSecao({ ...base, rodape: true }), 'rodapé')
  assert.equal(papelDaSecao({ ...base, primeiraDoCorpo: true, topoTelas: 0.1, alturaTelas: 1 }), 'abertura')
  assert.equal(papelDaSecao({ ...base, primeiraDoCorpo: true, topoTelas: 0.1, alturaTelas: 0.3 }), null)
  assert.equal(papelDaSecao({ ...base, formulario: true }), 'contato')
  assert.equal(papelDaSecao({ ...base, contatos: 2, palavras: 40 }), 'contato')
  assert.equal(papelDaSecao({ ...base, citacoes: 1 }), 'depoimentos')
  assert.equal(papelDaSecao({ ...base, tituloTexto: 'O que dizem os clientes' }), 'depoimentos')
  assert.equal(papelDaSecao({ ...base, imagens: 6, imagemTexto: 0.8 }), 'galeria')
  assert.equal(papelDaSecao({ ...base, itensRepetidos: 3, colunas: 3 }), 'lista de serviços')
  assert.equal(papelDaSecao({ ...base, imagens: 0, palavras: 20, alturaTelas: 0.5 }), 'faixa de texto')
  assert.equal(papelDaSecao(base), null)
})

test('cor média de um trecho do print PNG (cor das imagens em secoes[].cores)', () => {
  // PNG 4×2 RGB: metade esquerda vermelha, direita azul (filtro 0; o leitor não confere o CRC).
  const linha = [0, 255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255]
  const bruto = Buffer.from([...linha, ...linha])
  const pedaco = (nome, dados) => { const c = Buffer.alloc(12 + dados.length); c.writeUInt32BE(dados.length, 0); c.write(nome, 4, 'latin1'); dados.copy(c, 8); return c }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(4, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 2
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pedaco('IHDR', ihdr), pedaco('IDAT', zlib.deflateSync(bruto)), pedaco('IEND', Buffer.alloc(0))])
  const img = decodificarPng(png)
  assert.equal(img.largura, 4)
  assert.equal(corMediaRegiao(img, { x: 0, y: 0, w: 2, h: 2 }), '#ff0000')
  assert.equal(corMediaRegiao(img, { x: 2, y: 0, w: 2, h: 2 }), '#0000ff')
  assert.equal(corMediaRegiao(img, { x: 0, y: 0, w: 4, h: 2 }), '#800080')
  assert.equal(corMediaRegiao(img, { x: 10, y: 10, w: 2, h: 2 }), null)
})

test('roteiro mostra cores {hex, papel} e o enfeite fora da escala', () => {
  const rx = structuredClone(exemplo)
  rx.secoes[0].cores = [{ hex: '#000000', papel: 'fundo' }, { hex: '#2e7d32', papel: 'imagem' }]
  rx.secoes[0].decorativos = [{ texto: 'AROEIRA', px: 200, razao: 12.5, motivo: 'texto dentro de SVG (desenho)' }]
  const md = gerarRoteiro(rx)
  assert.match(md, /cores #000000 \(fundo\), #2e7d32 \(imagem\)/)
  assert.match(md, /enfeite fora da escala: "AROEIRA" \(texto dentro de SVG/)
})

// ---------------------------------------------------------------------------------------------------------
// Navegador de verdade com página local
// ---------------------------------------------------------------------------------------------------------
const PAGINA = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Teste</title><style>
  * { box-sizing: border-box } body { margin: 0; font: 16px/1.5 Georgia, serif; background: #f4efe8; color: #222 }
  section { width: 100%; position: relative } h1 { font-size: 96px; margin: 0 } h2 { font-size: 48px; margin: 0 }
  #abertura { height: 100vh; display: grid; place-items: center }
  #presa { height: 300vh } #presa .gruda { position: sticky; top: 0; height: 100vh; background: #1d1d1b; color: #fff; display: grid; place-items: center }
  #paralaxe { height: 160vh; overflow: hidden; padding-top: 20vh } #paralaxe .foto { width: 70%; height: 70vh; margin: 0 auto; background: #8a6f55 }
  #mascara { height: 200vh; padding-top: 30vh } #mascara .revela { width: 80%; height: 80vh; margin: 0 auto; background: #44624a }
  footer { height: 60vh; background: #111; color: #ddd; padding: 40px }
</style></head><body>
  <section id="abertura"><h1>Casa de teste</h1></section>
  <section id="presa"><div class="gruda"><h2>Fica parada</h2></div></section>
  <section id="paralaxe"><div class="foto"></div></section>
  <section id="mascara"><div class="revela"></div></section>
  <footer><p>Rodapé com algumas palavras para medir.</p></footer>
<script>
  const foto = document.querySelector('#paralaxe .foto'), sec = document.getElementById('paralaxe'), rev = document.querySelector('#mascara .revela')
  function atualizar () {
    const top = sec.offsetTop
    foto.style.transform = 'translateY(' + ((scrollY - top) * 0.4) + 'px)'
    const r = rev.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / innerHeight))
    const x = (50 - 50 * p).toFixed(2)
    rev.style.clipPath = 'inset(0% ' + x + '% 0% ' + x + '%)'
  }
  addEventListener('scroll', atualizar, { passive: true }); atualizar()
</script></body></html>`

const navegador = acharNavegador()
test('página local: classifica seção presa, paralaxe e revelação por clip-path', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 240_000 }, async () => {
  const servidor = http.createServer((req, res) => {
    if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(PAGINA) } else { res.writeHead(404); res.end() }
  })
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'raio-x-teste-'))
  try {
    const url = `http://127.0.0.1:${servidor.address().port}/`
    const r = await new Promise((resolve) => {
      const p = spawn(process.execPath, [script, url, saida, '--passos', '8'], { stdio: ['ignore', 'pipe', 'pipe'] })
      let out = '', err = ''
      p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { err += d })
      p.on('close', (code) => resolve({ code, out, err }))
    })
    assert.equal(r.code, 0, r.err || r.out)
    const rx = JSON.parse(fs.readFileSync(path.join(saida, 'raio-x.json'), 'utf8'))
    const mov = (id) => {
      const sec = rx.secoes.find((s) => s.elemento === id)
      assert.ok(sec, `seção ${id} não achada: ${rx.secoes.map((s) => s.elemento).join(', ')}`)
      return rx.movimento.find((m) => m.secao === sec.indice)
    }
    const presa = mov('section#presa')
    assert.ok(presa.tipos.includes('presa'), 'presa: ' + presa.tipos.join())
    const dur = presa.detalhes.find((d) => d.tipo === 'presa').duracaoTelas
    assert.ok(dur >= 1.6 && dur <= 2.2, `duração ${dur}`)
    const par = mov('section#paralaxe')
    assert.ok(par.tipos.includes('paralaxe'), 'paralaxe: ' + par.tipos.join())
    const fator = par.detalhes.find((d) => d.tipo === 'paralaxe').exemplos[0].fator
    assert.ok(Math.abs(fator - 0.6) <= 0.1, `fator ${fator}`)
    const mas = mov('section#mascara')
    assert.ok(mas.tipos.includes('revelacao-mascara'), 'máscara: ' + mas.tipos.join())
    assert.deepEqual(mov('section#abertura').tipos, ['nenhum'])
    assert.equal(rx.pagina.corpoPx, 16)
    assert.equal(rx.secoes.find((s) => s.elemento === 'section#abertura').titulo.razao, 6)
    const roteiro = fs.readFileSync(path.join(saida, 'roteiro.md'), 'utf8')
    assert.match(roteiro, /Cena principal/)
    assert.ok(fs.existsSync(path.join(saida, 'custo.md')))
    assert.ok(fs.existsSync(path.join(saida, 'prints', 'pagina-inteira.jpg')))
    assert.ok(fs.statSync(path.join(saida, 'raio-x.json')).size < 300_000)
  } finally {
    servidor.close()
    fs.rmSync(saida, { recursive: true, force: true })
  }
})

// Cabeçalho em cápsula escura sobre fundo claro, título em degradê que some no fim da cena (como autoAlpha: 0),
// marca d'água em <svg><text> e em aria-hidden, aviso de cookies fixo, imagens de cor conhecida e papéis variados.
const imgCor = (cor) => `<img alt="" width="560" height="380" src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='560' height='380'><rect width='100%' height='100%' fill='${cor}'/></svg>`)}">`
const PAGINA_V2 = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Teste 2</title><style>
  * { box-sizing: border-box } body { margin: 0; font: 16px/1.5 Georgia, serif; background: #f4efe8; color: #222 }
  section { position: relative; width: 100% } h2 { font-size: 48px; margin: 0 0 24px }
  #topo { position: sticky; top: 0; z-index: 5; height: 80px; display: flex; justify-content: center; align-items: center }
  #topo .capsula { width: 60%; height: 60px; overflow: hidden; border-radius: 30px; background: #1a1a1a; color: #fff; display: flex; gap: 32px; justify-content: center; align-items: center }
  #topo a { color: #fff }
  #cena { height: 300vh } #cena .gruda { position: sticky; top: 0; height: 100vh; display: grid; place-content: center; text-align: center }
  #cena h1 { font-size: 96px; margin: 0; background: linear-gradient(90deg, rgb(255, 0, 0), rgb(0, 0, 255)); -webkit-background-clip: text; background-clip: text; color: transparent }
  #servicos { padding: 80px 0; overflow: hidden } .marca { position: absolute; pointer-events: none; color: #e9e3db; font-size: 220px; top: 0; left: 0 }
  #servicos svg { position: absolute; right: 0; bottom: 0 } .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 0 40px }
  .card { background: #fff; padding: 24px; min-height: 200px; transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.2s linear }
  @keyframes surgir { from { opacity: 0.4 } to { opacity: 1 } } #depo blockquote { animation: surgir 900ms ease-in-out 1 both; background: #222; color: #f4efe8 }
  #depo cite { display: block; font-size: 23.6px; color: #878787; background: #fff }
  #faixa p { color: #9a948c }
  #galeria { padding: 140px 40px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px } #galeria img { width: 100%; height: 380px; display: block }
  #depo, #faixa { padding: 80px 40px } #contato { padding: 80px 40px; min-height: 80vh }
  footer { height: 50vh; background: #111 linear-gradient(#111, #333); color: #ddd; padding: 40px }
  #cookie-banner { position: fixed; left: 0; right: 0; bottom: 0; height: 120px; z-index: 9; background: #000; color: #fff; padding: 24px }
</style></head><body>
  <header id="topo"><nav class="capsula"><a href="#cena">Início</a><a href="#servicos">Serviços</a><a href="#galeria">Obras</a><a href="#contato">Contato</a></nav></header>
  <section id="cena"><div class="gruda"><h1>Luz que muda</h1><p>Role devagar para ver a luz mudar de cor ao longo do dia inteiro</p></div></section>
  <section id="servicos">
    <div class="marca" aria-hidden="true">ATELIÊ</div>
    <svg width="900" height="260" viewBox="0 0 900 260"><text x="0" y="220" font-size="200" fill="#ddd5cb">AROEIRA</text></svg>
    <h2>Nossos serviços</h2>
    <div class="cards"><article class="card"><h3>Mesas</h3><p>Mesas de jantar sob medida em madeira maciça.</p></article><article class="card"><h3>Armários</h3><p>Armários planejados para cozinha e quarto.</p></article><article class="card"><h3>Reforma</h3><p>Restauração de móveis antigos da família.</p></article></div>
  </section>
  <section id="galeria">${imgCor('rgb(46,125,50)')}${imgCor('rgb(198,40,40)')}${imgCor('rgb(46,125,50)')}${imgCor('rgb(198,40,40)')}</section>
  <section id="depo"><blockquote>Ficou melhor do que imaginei; a mesa virou o centro da casa. Recomendo a todos.<cite>Cliente de teste</cite></blockquote></section>
  <section id="faixa"><p>${'Feito à mão no interior, com madeira de reflorestamento e acabamento natural, peça por peça, sem pressa. '.repeat(6)}<small style="font-size:11px">ok</small></p></section>
  <section id="contato"><h2 style="color: transparent; -webkit-text-fill-color: transparent; background-color: #8a7d76; -webkit-background-clip: text; background-clip: text">Fale conosco agora</h2><form><input name="nome" placeholder="Nome"><input name="email" placeholder="E-mail"><textarea name="msg"></textarea><button type="button">Enviar</button></form></section>
  <footer><p>Marcenaria de teste, rua sem nome, cidade pequena.</p></footer>
  <div id="cookie-banner">Usamos cookies para melhorar a sua experiência. <button>Aceitar</button></div>
<script>
  const cena = document.getElementById('cena'), h1 = cena.querySelector('h1')
  function atualizar () {
    const r = cena.getBoundingClientRect()
    const p = -r.top / (r.height - innerHeight)
    // fim da cena: o título some (opacity 0 + visibility hidden, como o autoAlpha do GSAP)
    const some = p > 0.85
    h1.style.opacity = some ? '0' : '1'
    h1.style.visibility = some ? 'hidden' : 'visible'
  }
  addEventListener('scroll', atualizar, { passive: true }); atualizar()
</script></body></html>`

test('página local v2: título que some, degradê, enfeites, cápsula, cookies, cores, papéis e celular', { skip: !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)', timeout: 300_000 }, async () => {
  const servidor = http.createServer((req, res) => {
    if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(PAGINA_V2) } else { res.writeHead(404); res.end() }
  })
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
  const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'raio-x-v2-'))
  try {
    const url = `http://127.0.0.1:${servidor.address().port}/`
    const r = await new Promise((resolve) => {
      const p = spawn(process.execPath, [script, url, saida, '--passos', '5', '--tambem-celular'], { stdio: ['ignore', 'pipe', 'pipe'] })
      let out = '', err = ''
      p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { err += d })
      p.on('close', (code) => resolve({ code, out, err }))
    })
    assert.equal(r.code, 0, r.err || r.out)
    const rx = JSON.parse(fs.readFileSync(path.join(saida, 'raio-x.json'), 'utf8'))
    assert.equal(rx.versao, 2)
    const sec = (id) => {
      const s = rx.secoes.find((x) => x.elemento === id)
      assert.ok(s, `seção ${id} não achada: ${rx.secoes.map((x) => x.elemento).join(', ')}`)
      return s
    }
    // 1) título que some no fim da cena continua sendo o título; cor do degradê = média (vermelho + azul)
    const cena = sec('section#cena')
    assert.equal(cena.titulo?.texto, 'Luz que muda', JSON.stringify(cena.titulo))
    assert.equal(cena.titulo.razao, 6)
    assert.equal(cena.titulo.cor, '#800080')
    assert.equal(cena.titulo.degrade, true)
    // 2) marca d'água (svg e aria-hidden) vai para decorativos, fora do título e da escala
    const serv = sec('section#servicos')
    assert.equal(serv.titulo?.texto, 'Nossos serviços', JSON.stringify(serv.titulo))
    const dec = serv.decorativos.map((d) => d.texto).join('|')
    assert.match(dec, /AROEIRA/)
    assert.match(dec, /ATELIÊ/)
    assert.ok(serv.decorativos.every((d) => d.motivo && d.px >= 150), JSON.stringify(serv.decorativos))
    // 3) escala sem enfeite e sem o degrau de 11px (2 letras)
    const pxs = rx.pagina.escala.map((e) => e.px)
    assert.ok(pxs.every((px) => px < 150), pxs.join())
    assert.ok(!pxs.includes(11), pxs.join())
    assert.ok(pxs.includes(96) && pxs.includes(48), pxs.join())
    // 4) cores {hex, papel}: a galeria traz o verde e o vermelho das imagens
    for (const s of rx.secoes) for (const c of s.cores) { assert.match(c.hex, /^#[0-9a-f]{6}$/); assert.ok(['fundo', 'texto', 'imagem'].includes(c.papel)) }
    const perto = (hex, alvo) => { const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return a.every((v, i) => Math.abs(v - alvo[i]) <= 8) }
    const imgs = sec('section#galeria').cores.filter((c) => c.papel === 'imagem').map((c) => c.hex)
    assert.ok(imgs.some((h) => perto(h, [46, 125, 50])) && imgs.some((h) => perto(h, [198, 40, 40])), imgs.join())
    // 5) fundo do cabeçalho = cápsula escura que guarda o texto (não o bege da página)
    const topo = sec('header#topo')
    assert.equal(topo.papel, 'cabeçalho')
    assert.equal(topo.corFundo, '#1a1a1a')
    // 6) papéis
    assert.equal(cena.papel, 'abertura')
    assert.equal(serv.papel, 'lista de serviços')
    assert.equal(sec('section#galeria').papel, 'galeria')
    assert.equal(sec('section#depo').papel, 'depoimentos')
    assert.equal(sec('section#faixa').papel, 'faixa de texto')
    assert.equal(sec('section#contato').papel, 'contato')
    // texto recortado sobre cor lisa (relevo, como o CTA do for-living) conta, com a cor do fundo recortado
    assert.equal(sec('section#contato').titulo?.texto, 'Fale conosco agora', JSON.stringify(sec('section#contato').titulo))
    assert.equal(sec('section#contato').titulo.cor, '#8a7d76')
    assert.equal(sec('footer').papel, 'rodapé')
    // 7) aviso de cookies escondido só no navegador do raio-x e registrado
    assert.ok(rx.avisos.some((a) => /cookies escondido só no navegador/.test(a)), rx.avisos.join(' / '))
    assert.ok(!rx.secoes.some((s) => s.elemento.includes('cookie')))
    // 8) celular: JSON, roteiro e prints próprios, com as mesmas seções
    const cel = JSON.parse(fs.readFileSync(path.join(saida, 'raio-x-celular.json'), 'utf8'))
    assert.equal(cel.viewport.celular, true)
    assert.equal(cel.viewport.largura, 390)
    assert.deepEqual(cel.secoes.map((s) => s.elemento), rx.secoes.map((s) => s.elemento))
    assert.equal(cel.secoes.find((s) => s.elemento === 'section#cena').titulo?.texto, 'Luz que muda')
    assert.ok(fs.existsSync(path.join(saida, 'prints-celular', 'pagina-inteira.jpg')))
    assert.ok(fs.existsSync(path.join(saida, 'roteiro-celular.md')))
    assert.ok(fs.existsSync(path.join(saida, 'prints', 'pagina-inteira.jpg')))
    // 9) R11: contraste por seção (texto cinza claro sobre bege fica abaixo do mínimo; preto sobre branco, bem acima)
    const faixa = sec('section#faixa')
    assert.ok(faixa.contraste && faixa.contraste.texto < CONTRASTE_MINIMO.normal, JSON.stringify(faixa.contraste))
    assert.equal(faixa.contraste.pior.cor, '#9a948c')
    assert.equal(faixa.contraste.pior.fundo, '#f4efe8')
    assert.ok(serv.contraste.texto > 10 && serv.contraste.titulo > 10, JSON.stringify(serv.contraste))
    assert.equal(cena.contraste.titulo, null, 'título em degradê fica sem medida')
    // revisão 5, no navegador de verdade: o fundo é o do próprio elemento (bege sobre o escuro do próprio blockquote
    // passa); 23,6px não ganha o piso de texto grande; texto sobre degradê fica sem medida
    const depo = sec('section#depo').contraste
    assert.ok([depo.titulo, depo.texto].some((v) => v > 10), JSON.stringify(depo))
    assert.deepEqual({ px: depo.pior.px, fundo: depo.pior.fundo, razao: depo.pior.razao, grande: depo.pior.grande, minimo: depo.pior.minimo, abaixo: depo.pior.abaixo },
      { px: 23.6, fundo: '#ffffff', razao: 3.59, grande: false, minimo: CONTRASTE_MINIMO.normal, abaixo: true }, JSON.stringify(depo))
    assert.equal(depo.semMedida, 0, JSON.stringify(depo))
    const rodape = sec('footer').contraste
    assert.ok(rodape && rodape.medidos === 0 && rodape.semMedida >= 1 && rodape.pior === null, JSON.stringify(rodape))
    // 10) R11: ritmo do CSS (transição de movimento vence a de cor; animação lida com o @keyframes)
    const movDe = (id) => rx.movimento.find((m) => m.secao === sec(id).indice)
    assert.equal(movDe('section#servicos').duracaoMs, 600)
    assert.equal(movDe('section#servicos').curva, 'cubic-bezier(0.2, 0.8, 0.2, 1)')
    assert.equal(movDe('section#servicos').ritmo.origem, 'css-transicao')
    assert.equal(movDe('section#depo').duracaoMs, 900)
    assert.equal(movDe('section#depo').curva, 'ease-in-out')
    assert.equal(movDe('section#depo').ritmo.origem, 'css-animacao')
    assert.ok(rx.movimento.every((m) => 'duracaoMs' in m && 'curva' in m))
    assert.ok(!rx.secoes.some((s) => 'ritmoCss' in s))
    // 11) R11: medidas.css com os números do raio-x, sem cor nem fonte; o do celular sai ao lado
    const css = fs.readFileSync(path.join(saida, 'medidas.css'), 'utf8')
    assert.equal(css, gerarMedidasCss(rx))
    assert.match(css, /--ref-escala-1: 6;/)
    assert.ok(css.includes(`--ref-s${serv.indice + 1}-colunas: 3;`), css)
    assert.ok(css.includes(`--ref-s${serv.indice + 1}-duracao: 600ms;`), css)
    assert.ok(serv.grade.colunaVw > 25 && serv.grade.colunaVw < 33 && serv.grade.vaoVw > 1 && serv.grade.vaoVw < 2.5, JSON.stringify(serv.grade))
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb|Georgia|font-family/i)
    assert.ok(fs.existsSync(path.join(saida, 'medidas-celular.css')))
  } finally {
    servidor.close()
    fs.rmSync(saida, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------------------------------------
// R11: contraste por seção, ritmo do movimento e medidas.css (regras puras)
// ---------------------------------------------------------------------------------------------------------
test('contraste da seção: título, texto típico, pior caso contra o mínimo do tamanho e o que ficou sem medida', () => {
  const c = resumoContraste([
    { t: 'Título grande', px: 64, peso: '700', chars: 13, cor: '#777777', fundo: '#ffffff', razao: 4.48, titulo: true },
    { t: 'Parágrafo longo', px: 16, peso: '400', chars: 300, cor: '#222222', fundo: '#ffffff', razao: 15.9 },
    { t: 'Legenda apagada', px: 12, peso: '400', chars: 40, cor: '#999999', fundo: '#ffffff', razao: 2.85 },
    { t: 'Sobre a foto', px: 20, peso: '400', chars: 12, cor: '#ffffff', fundo: null, razao: null },
  ])
  assert.equal(c.titulo, 4.48)
  assert.equal(c.texto, 15.9)
  assert.equal(c.minimo, 2.85)
  assert.deepEqual(c.pior, { texto: 'Legenda apagada', px: 12, cor: '#999999', fundo: '#ffffff', razao: 2.85, grande: false, minimo: 4.5, abaixo: true })
  assert.equal(c.medidos, 3)
  assert.equal(c.semMedida, 1)
  // texto grande tem mínimo menor (3:1)
  const g = resumoContraste([{ t: 'Só título', px: 64, peso: '400', chars: 9, cor: '#777', fundo: '#fff', razao: 4.48, titulo: true }])
  assert.equal(g.pior.minimo, CONTRASTE_MINIMO.grande)
  assert.equal(g.texto, null)
  assert.equal(resumoContraste([]), null)
  assert.deepEqual(resumoContraste([{ t: 'x', px: 16, chars: 1, razao: null }]), { titulo: null, texto: null, minimo: null, pior: null, medidos: 0, semMedida: 1 })
  assert.equal(contraste([255, 255, 255], [0, 0, 0]), 21)
})

test('ritmo do CSS: transição de movimento vence a de cor e a animação em laço; sem CSS vale a estimativa', () => {
  assert.deepEqual(temposParaMs('0.3s, 200ms, 0s'), [300, 200, 0])
  const r = ritmoDaSecao([
    { tipo: 'transicao', duracaoMs: 200, curva: 'ease', propriedade: 'background-color', quantos: 30 },
    { tipo: 'transicao', duracaoMs: 800, curva: 'cubic-bezier(0.16, 1, 0.3, 1)', propriedade: 'transform', quantos: 4 },
    { tipo: 'transicao', duracaoMs: 800, curva: 'cubic-bezier(0.16, 1, 0.3, 1)', propriedade: 'opacity', quantos: 4 },
    { tipo: 'animacao', duracaoMs: 20000, curva: 'linear', nome: 'letreiro', infinita: true, quantos: 2 },
  ])
  assert.equal(r.duracaoMs, 800)
  assert.equal(r.curva, 'cubic-bezier(0.16, 1, 0.3, 1)')
  assert.equal(r.ritmo.origem, 'css-transicao')
  assert.equal(r.ritmo.quantos, 8)
  assert.deepEqual(r.ritmo.outras.map((o) => o.duracaoMs), [200, 20000])
  const soCor = ritmoDaSecao([{ tipo: 'transicao', duracaoMs: 200, curva: 'ease', propriedade: 'color', quantos: 3 }])
  assert.equal(soCor.duracaoMs, 200)
  assert.equal(soCor.ritmo.soCor, true)
  assert.deepEqual(ritmoDaSecao([], null), { duracaoMs: null, curva: null, ritmo: null })
  const e = ritmoDaSecao([], { duracaoMs: 650, curva: 'linear', assentos: 5, ligadaARolagem: true, medida: 'escala' })
  assert.equal(e.duracaoMs, 650)
  assert.equal(e.ritmo.origem, 'estimada')
  assert.equal(e.ritmo.ligadaARolagem, true)
})

test('ritmo estimado pelas amostras: curva pela trajetória (linear, ease-out, ease-in) e duração pelo assento', () => {
  const xs = Array.from({ length: 21 }, (_, k) => k * 90)
  const forma = (f) => xs.map((x) => f(x / 1800))
  assert.equal(curvaDaTrajetoria(xs, forma((u) => u * 500)), 'linear')
  assert.equal(curvaDaTrajetoria(xs, forma((u) => 1 - (1 - u) ** 2)), 'ease-out')
  assert.equal(curvaDaTrajetoria(xs, forma((u) => u * u)), 'ease-in')
  assert.equal(curvaDaTrajetoria(xs, forma((u) => u * u * (3 - 2 * u))), 'ease-in-out')
  // parado antes e depois: só o trecho que muda conta; salto de um passo não tem forma
  assert.equal(curvaDaTrajetoria(xs, xs.map((x) => Math.min(1, Math.max(0, (x - 450) / 900)))), 'linear')
  assert.equal(curvaDaTrajetoria(xs, xs.map((x) => (x < 900 ? 0 : 1))), null)
  // faixa que anda para o lado em ease-out, com a tela levando ~700 ms para assentar a cada passo
  const faixa = { estados: xs.map((x) => caixa(0, 600, { l: Math.round(-2000 * (1 - (1 - x / 1800) ** 2)) })) }
  const parado = { estados: xs.map((x) => caixa(-x, 600)) }
  const r = ritmoEstimado({ assentos: [0, 40, 690, 720, 705, 1100], elementos: [parado, faixa], s: xs, vw: VW })
  assert.equal(r.duracaoMs, 700)
  assert.equal(r.curva, 'ease-out')
  assert.equal(r.medida, 'deslocamento lateral')
  assert.equal(r.ligadaARolagem, true)
  assert.equal(r.assentos, 4)
  assert.equal(ritmoEstimado({ assentos: [1190, 1200, 1180], elementos: [parado], s: xs }).noTeto, true)
  assert.equal(ritmoEstimado({ assentos: [0, 30], elementos: [parado], s: xs }), null)
})

// ---------------------------------------------------------------------------------------------------------
// DOM simulado: só o que textosDaSecao e medir usam, para rodar o coletor de verdade sem abrir navegador.
// no(tag, estilo (objeto ou função que devolve o estilo de agora), filhos ou 'texto', caixa [x, y, largura, altura])
// ---------------------------------------------------------------------------------------------------------
class No {
  constructor(tag, estilo = {}, filhos = [], caixa = [100, 100, 600, 40]) {
    Object.assign(this, { tagName: tag.toUpperCase(), nodeType: 1, estilo, caixa, parentElement: null, isConnected: true })
    this.childNodes = [].concat(filhos).map((f) => (typeof f === 'string' ? { nodeType: 3, textContent: f } : f))
    for (const f of this.childNodes) f.parentElement = this
  }
  getBoundingClientRect() { const [x, y, w, h] = this.caixa; return { left: x, top: y, right: x + w, bottom: y + h, width: w, height: h } }
  contains(o) { for (let e = o; e; e = e.parentElement) if (e === this) return true; return false }
  closest() { return null }
  getAttribute() { return null }
}
const no = (...a) => new No(...a)
const secaoBranca = (filhos, estilo = {}) => no('section', { backgroundColor: 'rgb(255, 255, 255)', ...estilo }, filhos, [0, 0, 1440, 600])

// Monta a página simulada (tela de 1440x900, fundo da página transparente), roda o coletor e desmonta.
async function naPaginaRx(secao, coletor, { raiox } = {}) {
  const body = no('body', {}, [secao], [0, 0, 1440, 900]), html = no('html', {}, [body], [0, 0, 1440, 900])
  const todos = (raizDe, tipo) => { const l = []; const andar = (e) => { for (const f of e.childNodes) { if (f.nodeType === tipo) l.push(f); if (f.nodeType === 1) andar(f) } }; andar(raizDe); return l }
  const globais = {
    window: { __raiox: raiox }, innerWidth: 1440, innerHeight: 900, NodeFilter: { SHOW_TEXT: 4 },
    requestAnimationFrame: (f) => setTimeout(f, 0),
    getComputedStyle: (el) => {
      const k = { display: 'block', visibility: 'visible', opacity: '1', fontSize: '16px', fontFamily: 'Georgia, serif', fontWeight: '400', lineHeight: '24px',
        color: 'rgb(0, 0, 0)', backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', textTransform: 'none', pointerEvents: 'auto',
        transform: 'none', clipPath: 'none', position: 'static', ...(typeof el.estilo === 'function' ? el.estilo() : el.estilo) }
      k.getPropertyValue = (n) => k[n] || ''
      return k
    },
    document: {
      body, documentElement: html, scrollingElement: { scrollHeight: 900 },
      createTreeWalker: (raizDe) => { const l = todos(raizDe, 3); let i = 0; return { nextNode: () => l[i++] || null } },
      // do que está por cima para o que está por baixo (ordem do documento ao contrário)
      elementsFromPoint: (x, y) => [html, ...todos(html, 1)].filter((e) => { const r = e.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom }).reverse(),
    },
  }
  const antes = Object.fromEntries(Object.keys(globais).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
  for (const [k, v] of Object.entries(globais)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true })
  try { return await coletor() } finally {
    for (const [k, d] of Object.entries(antes)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k] }
  }
}
const textosDe = (secao) => naPaginaRx(secao, () => textosDaSecao(secao))
// O mesmo mapa que a estrutura do raio-x usa para montar o resumo da seção.
const resumoDe = (textos) => resumoContraste(textos.map((x) => ({ t: x.t, px: x.pxReal ?? x.px, peso: x.peso, chars: x.chars, cor: x.cor, fundo: x.fundo, razao: x.ctrFundo })))
const BRANCO = 'rgb(255, 255, 255)', PRETO = 'rgb(0, 0, 0)'

test('revisão 5, achado 2a: o fundo começa no próprio elemento e a transparência é composta sobre o que está atrás', async () => {
  // texto preto, fundo preto no próprio parágrafo, seção branca: saía 21:1 contra o branco da seção
  const [igual] = await textosDe(secaoBranca([no('p', { color: PRETO, backgroundColor: PRETO }, ['Texto preto em parágrafo de fundo preto'])]))
  assert.equal(igual.fundo, '#000000')
  assert.equal(igual.ctrFundo, 1)
  assert.equal(resumoDe([igual]).pior.abaixo, true)
  // o inverso: texto branco válido sobre o próprio fundo preto era reprovado contra a seção branca
  const [valido] = await textosDe(secaoBranca([no('p', { color: BRANCO, backgroundColor: PRETO }, ['Texto branco em parágrafo de fundo preto'])]))
  assert.equal(valido.fundo, '#000000')
  assert.equal(Math.round(valido.ctrFundo), 21)
  assert.equal(resumoDe([valido]).pior.abaixo, false)
  // fundo meio transparente no parágrafo: preto a 50% sobre a seção branca é cinza médio, não preto nem branco
  const [meio] = await textosDe(secaoBranca([no('p', { color: BRANCO, backgroundColor: 'rgba(0, 0, 0, 0.5)' }, ['Texto branco em fundo preto meio transparente'])]))
  assert.equal(meio.fundo, '#808080')
  assert.ok(meio.ctrFundo > 3.9 && meio.ctrFundo < 4.05, String(meio.ctrFundo))
  assert.equal(resumoDe([meio]).pior.abaixo, true)
  // opacidade no ancestral vale para o grupo: seção preta a 50% sobre a página branca fica cinza e o texto branco segue branco
  const [grupo] = await textosDe(no('section', { backgroundColor: PRETO, opacity: '0.5' }, [no('p', { color: BRANCO }, ['Texto branco em seção preta meio apagada'])], [0, 0, 1440, 600]))
  assert.equal(grupo.fundo, '#808080')
  assert.ok(grupo.ctrFundo > 3.9 && grupo.ctrFundo < 4.05, String(grupo.ctrFundo))
  // sem fundo nenhum até a raiz: vale o branco do navegador
  const [solto] = await textosDe(no('section', {}, [no('p', { color: PRETO }, ['Texto preto sem fundo declarado'])], [0, 0, 1440, 600]))
  assert.equal(solto.fundo, '#ffffff')
  assert.equal(Math.round(solto.ctrFundo), 21)
})

test('revisão 5, achado 2b: degradê ou imagem no caminho até o fundo opaco deixa o texto sem medida', async () => {
  // texto branco, seção com fundo preto e degradê preto/branco: saía 21:1 medido
  const degrade = 'linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))'
  const [t] = await textosDe(secaoBranca([no('p', { color: BRANCO }, ['Texto branco sobre degradê'])], { backgroundColor: PRETO, backgroundImage: degrade }))
  assert.equal(t.ctrFundo, null)
  assert.equal(t.fundo, null)
  assert.deepEqual(resumoDe([t]), { titulo: null, texto: null, minimo: null, pior: null, medidos: 0, semMedida: 1 })
  // qualquer background-image vale, no próprio elemento ou atrás de um fundo meio transparente
  for (const img of ['radial-gradient(circle, rgb(0, 0, 0), rgb(255, 255, 255))', 'conic-gradient(rgb(0, 0, 0), rgb(255, 255, 255))', 'image-set("a.png" 1x)', 'url("foto.jpg")']) {
    const [proprio] = await textosDe(secaoBranca([no('p', { color: BRANCO, backgroundImage: img }, ['Texto com imagem no próprio fundo'])]))
    assert.equal(proprio.ctrFundo, null, img)
    const [atras] = await textosDe(secaoBranca([no('p', { color: BRANCO, backgroundColor: 'rgba(0, 0, 0, 0.6)' }, ['Texto sobre véu escuro'])], { backgroundImage: img }))
    assert.equal(atras.ctrFundo, null, img)
  }
  // degradê escondido atrás de um fundo opaco do próprio parágrafo não atrapalha a medida
  const [coberto] = await textosDe(secaoBranca([no('p', { color: BRANCO, backgroundColor: PRETO }, ['Texto com fundo opaco próprio'])], { backgroundImage: degrade }))
  assert.equal(Math.round(coberto.ctrFundo), 21)
  // fundo recortado no texto (relevo) pinta só as letras: não é o fundo atrás delas
  const [relevo] = await textosDe(secaoBranca([no('h2', { color: 'rgba(0, 0, 0, 0)', backgroundColor: 'rgb(138, 125, 118)', 'background-clip': 'text' }, ['Fale conosco agora'])]))
  assert.equal(relevo.cor, '#8a7d76')
  assert.equal(relevo.fundo, '#ffffff')
  assert.ok(relevo.ctrFundo > 3.5 && relevo.ctrFundo < 4.5, String(relevo.ctrFundo))
})

test('revisão 5, achado 3: texto grande e mínimo são decididos sem arredondar (23,6px, 18,5px negrito e razão 4,495)', async () => {
  const cinza = 'rgb(135, 135, 135)' // 3,59:1 sobre branco: passa só como texto grande
  const medirTexto = async (estilo) => { const ts = await textosDe(secaoBranca([no('p', { color: cinza, ...estilo }, ['Texto cinza sobre branco'])])); return { t: ts[0], pior: resumoDe(ts).pior } }
  const quase = await medirTexto({ fontSize: '23.6px' })
  assert.equal(quase.t.px, 24, 'o tamanho exibido continua arredondado')
  assert.equal(quase.t.pxReal, 23.6)
  assert.deepEqual({ px: quase.pior.px, razao: quase.pior.razao, grande: quase.pior.grande, minimo: quase.pior.minimo, abaixo: quase.pior.abaixo },
    { px: 23.6, razao: 3.59, grande: false, minimo: CONTRASTE_MINIMO.normal, abaixo: true })
  const negritoQuase = await medirTexto({ fontSize: '18.5px', fontWeight: '700' })
  assert.equal(negritoQuase.t.px, 19)
  assert.equal(negritoQuase.pior.grande, false)
  assert.equal(negritoQuase.pior.abaixo, true)
  // no limite exato o piso de texto grande vale
  for (const estilo of [{ fontSize: '24px' }, { fontSize: '18.66px', fontWeight: '700' }, { fontSize: '18.66px', fontWeight: 'bold' }]) {
    const g = await medirTexto(estilo)
    assert.deepEqual([g.pior.grande, g.pior.minimo, g.pior.abaixo], [true, CONTRASTE_MINIMO.grande, false], JSON.stringify(estilo))
  }
  // razão 4,495: arredondada daria 4,5 e passaria; fica abaixo e é exibida sem atravessar o limite
  const r = resumoContraste([{ t: 'Quase lá', px: 16, peso: '400', chars: 8, cor: '#777777', fundo: '#ffffff', razao: 4.495 }])
  assert.equal(r.pior.abaixo, true)
  assert.equal(r.pior.razao, 4.49)
  assert.equal(r.texto, 4.49)
  assert.equal(resumoContraste([{ t: 'No limite', px: 16, peso: '400', chars: 9, razao: 4.5 }]).pior.abaixo, false)
  assert.equal(resumoContraste([{ t: 'Quase 24', px: 23.996, peso: '400', chars: 8, razao: 3.2 }]).pior.px, 23.99)
  // o coletor entrega a razão exata; a de exibir segue com 2 casas
  const exata = contraste([119, 119, 119], [255, 255, 255], true)
  assert.notEqual(exata, contraste([119, 119, 119], [255, 255, 255]))
  assert.ok(Math.abs(exata - contraste([119, 119, 119], [255, 255, 255])) <= 0.005)
})

test('revisão 5, achado 4: o assento espera a opacidade parar de animar', { timeout: 20_000 }, async () => {
  const cena = (estilo) => {
    const el = no('div', estilo, [], [0, 100, 600, 300]), sec = no('section', {}, [el], [0, 0, 1440, 900])
    return { sec, raiox: { pos: () => 0, alvo: null, rolagemDoc: true, secoes: [sec], elementos: [[{ el }]], fragmentos: [{ letras: [], linhas: [] }] } }
  }
  // geometria parada e opacidade de 0 a 1 em 1.000 ms: terminava aos 64 ms com assentoMs 0
  const t0 = performance.now()
  const anima = cena(() => ({ opacity: String(Math.min(1, (performance.now() - t0) / 1000)) }))
  const m = await naPaginaRx(anima.sec, () => medir({ assentarMs: 1200, deriva: false }), { raiox: anima.raiox })
  assert.ok(m.assentoMs >= 900, `assentoMs ${m.assentoMs}`)
  assert.ok(performance.now() - t0 >= 900)
  assert.ok(m.secoes[0].e[0].o >= 0.9, `opacidade medida no fim: ${m.secoes[0].e[0].o}`)
  // nada se mexe: encerra logo, sem assento
  const t1 = performance.now()
  const parada = cena({ opacity: '1' })
  const p = await naPaginaRx(parada.sec, () => medir({ assentarMs: 1200, deriva: false }), { raiox: parada.raiox })
  assert.equal(p.assentoMs, 0)
  assert.ok(performance.now() - t1 < 800)
})

test('revisão 5, achado 5: mediana com quantidade par é o meio dos dois do centro (duração, grade e contraste típico)', () => {
  assert.equal(ritmoEstimado({ assentos: [100, 1100] }).duracaoMs, 600)
  assert.equal(ritmoEstimado({ assentos: [300, 500, 700] }).duracaoMs, 500)
  assert.equal(mediana([100, 1100]), 600)
  assert.equal(mediana([3, 1, 2]), 2)
  assert.equal(mediana([4, 1, 3, 2]), 2.5)
  assert.equal(mediana([7]), 7)
  assert.equal(mediana([]), null)
  // mediana pesada pelas letras: metade exata entre dois textos é o meio dos dois; fora disso, o texto que cruza a metade
  const item = (razao, chars) => ({ t: 'x', px: 16, peso: '400', chars, razao })
  assert.equal(resumoContraste([item(5, 100), item(15, 100)]).texto, 10)
  assert.equal(resumoContraste([item(5, 100), item(15, 101)]).texto, 15)
  assert.equal(resumoContraste([item(5, 101), item(15, 100)]).texto, 5)
  assert.equal(resumoContraste([item(5, 50), item(9, 50), item(15, 100)]).texto, 12)
})

test('medidas.css: todo número vem do raio-x; cores e fontes da referência não entram', () => {
  const rxA = {
    viewport: { largura: 1440, altura: 900 },
    pagina: { corpoPx: 16, escala: [{ px: 18, razao: 1.13 }, { px: 96, razao: 6 }, { px: 16, razao: 1 }], corFundo: '#f4efe8', corTexto: '#222222', fontes: [{ familia: 'Canela' }] },
    secoes: [
      { indice: 0, papel: 'cabeçalho', alturaTelas: 0.09, colunas: 1, raioPx: 30, corFundo: '#1a1a1a' },
      { indice: 1, papel: 'abertura', alturaTelas: 3, colunas: 1, raioPx: 0, titulo: { razao: 6, cor: '#800080' }, respiro: { topoTelas: 0.12, baseTelas: 0.2 }, grade: { conteudoVw: 86.1, colunaVw: 86.1, vaoVw: null }, corFundo: '#f4efe8', fontes: [{ familia: 'Canela' }] },
      { indice: 2, papel: 'lista de serviços', alturaTelas: 0.85, colunas: 3, raioPx: 12, titulo: { razao: 3 }, respiro: { topoTelas: 0.09, baseTelas: 0.09 }, grade: { conteudoVw: 94.4, colunaVw: 30.4, vaoVw: 1.7 } },
      { indice: 3, papel: null, alturaTelas: 1, colunas: 2, raioPx: 12, grade: { conteudoVw: 94.4, colunaVw: 46.5, vaoVw: 1.4 } },
    ],
    movimento: [
      { secao: 1, tipos: ['presa'], duracaoMs: null, curva: null },
      { secao: 2, tipos: ['nenhum'], duracaoMs: 600, curva: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      { secao: 3, tipos: ['nenhum'], duracaoMs: 450, curva: 'url(x); color: red' },
    ],
  }
  const css = gerarMedidasCss(rxA)
  const esperado = ['--ref-escala-1: 6;', '--ref-escala-2: 1.13;', '--ref-escala-3: 1;', '--ref-raio: 12px;', '--ref-conteudo: 94.4vw;',
    '--ref-s1-raio: 30px;', '--ref-s2-altura: 300vh;', '--ref-s2-titulo: 6;', '--ref-s2-respiro-topo: 12vh;', '--ref-s2-respiro-base: 20vh;',
    '--ref-s2-conteudo: 86.1vw;', '--ref-s3-colunas: 3;', '--ref-s3-coluna: 30.4vw;', '--ref-s3-vao: 1.7vw;', '--ref-s3-raio: 12px;',
    '--ref-s3-duracao: 600ms;', '--ref-s3-curva: cubic-bezier(0.2, 0.8, 0.2, 1);', '--ref-s4-duracao: 450ms;']
  for (const linha of esperado) assert.ok(css.includes(linha), `faltou ${linha}\n${css}`)
  assert.ok(!css.includes('--ref-s2-vao') && !css.includes('--ref-s2-duracao') && !css.includes('--ref-s4-curva'), css)
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb|Canela|font-family|color/i)
  // nenhum número digitado à mão: mudou o raio-x, mudou o arquivo; e todo valor do arquivo está no raio-x
  const rxB = structuredClone(rxA)
  rxB.secoes[2].grade.colunaVw = 22.2; rxB.pagina.escala[1].razao = 7.5; rxB.movimento[1].duracaoMs = 320
  const cssB = gerarMedidasCss(rxB)
  for (const linha of ['--ref-s3-coluna: 22.2vw;', '--ref-escala-1: 7.5;', '--ref-s3-duracao: 320ms;']) assert.ok(cssB.includes(linha), cssB)
  const doRaioX = new Set(JSON.stringify(rxA).match(/-?\d+(\.\d+)?/g).flatMap((v) => [Number(v), Math.round(Number(v) * 10000) / 100]))
  let declaracoes = 0
  for (const [, nome, valor] of css.matchAll(/(--ref-[a-z0-9-]+): ([^;]+);/g)) {
    declaracoes++
    if (nome.endsWith('-curva')) continue
    assert.ok(doRaioX.has(parseFloat(valor)), `${nome}: ${valor} não está no raio-x`)
  }
  assert.ok(declaracoes >= esperado.length)
})

// Chrome não fica vivo se o Node sai sem fechar o navegador (process.exit, erro não tratado, sinal). Um processo filho
// com TEMP próprio abre o navegador e sai de cada jeito; depois não pode existir processo com aquele perfil na linha de
// comando. Limite (não testável daqui): morte seca do Node (taskkill /F, kill -9) não roda ouvinte nenhum.
const { abrirNavegador: abrirNavSaida } = await import(new URL('file:///' + script.replace(/\\/g, '/')).href)
const exeSaida = acharNavegador()
const semExe = !exeSaida && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)'
const { spawnSync } = await import('node:child_process')

// Processos (qualquer um) cuja linha de comando contém `trecho`. O trecho vai por variável de ambiente: o próprio
// powershell/ps não pode casar consigo mesmo.
function processosCom(trecho) {
  if (process.platform === 'win32') {
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      '@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($env:ALVO) } | ForEach-Object { $_.ProcessId }) -join ","'],
    { env: { ...process.env, ALVO: trecho }, encoding: 'utf8', windowsHide: true, timeout: 60_000 })
    return String(r.stdout || '').trim().split(',').filter(Boolean).map(Number)
  }
  const r = spawnSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' })
  return String(r.stdout || '').split('\n').filter((l) => l.includes(trecho)).map((l) => Number(l.trim().split(/\s+/)[0]))
}
const matarTodos = (pids) => { for (const p of pids) { try { process.kill(p, 'SIGKILL') } catch {} } }

test('navegador: ouvintes de saída só existem com navegador vivo e não acumulam', { skip: semExe, timeout: 120_000 }, async () => {
  const eventos = ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP', 'uncaughtExceptionMonitor']
  const base = Object.fromEntries(eventos.map((e) => [e, process.listenerCount(e)]))
  const a = await abrirNavSaida(exeSaida)
  const b = await abrirNavSaida(exeSaida)
  try {
    for (const e of eventos) assert.equal(process.listenerCount(e), base[e] + 1, `com 2 navegadores: ${e}`)
    await a.fechar(); await a.fechar() // fechar duas vezes não tira o ouvinte de quem segue vivo
    for (const e of eventos) assert.equal(process.listenerCount(e), base[e] + 1, `com 1 navegador: ${e}`)
  } finally { await a.fechar(); await b.fechar() }
  for (const e of eventos) assert.equal(process.listenerCount(e), base[e], `sem navegador: ${e}`)
})

for (const [modo, confere] of [
  ['exit', (r) => assert.equal(r.status, 3, 'process.exit(3) tem de sair com 3')],
  ['erro', (r) => assert.equal(r.status, 1, 'erro não tratado tem de sair com 1')],
  // o sinal não pode ser engolido: POSIX sai pelo próprio sinal; Windows, com 128 + 15
  ['sinal', (r) => assert.ok(r.signal === 'SIGTERM' || r.status === 143, `SIGTERM engolido: ${JSON.stringify({ status: r.status, signal: r.signal })}`)],
]) {
  test(`navegador: Node que sai sem fechar (${modo}) não deixa Chrome vivo`, { skip: semExe, timeout: 120_000 }, async (t) => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'saida-nav-'))
    t.after(() => { matarTodos(processosCom(temp)); fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }) })
    const filho = path.join(temp, 'filho.mjs')
    fs.writeFileSync(filho, [
      `const { abrirNavegador } = await import(${JSON.stringify(new URL('file:///' + script.replace(/\\/g, '/')).href)})`,
      `await abrirNavegador(${JSON.stringify(exeSaida)})`,
      `console.log('aberto')`,
      `const modo = ${JSON.stringify(modo)}`,
      `if (modo === 'exit') process.exit(3)`,
      `if (modo === 'erro') setTimeout(() => { throw new Error('erro de propósito') }, 0)`,
      `if (modo === 'sinal') process.emit('SIGTERM', 'SIGTERM')`,
      `setTimeout(() => {}, 30_000)`,
    ].join('\n'))
    const r = await new Promise((ok) => {
      const p = spawn(process.execPath, [filho], { env: { ...process.env, TEMP: temp, TMP: temp, TMPDIR: temp }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
      let out = ''
      p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { out += d })
      p.on('exit', (status, signal) => ok({ status, signal, out }))
    })
    assert.match(r.out, /aberto/, 'o filho não chegou a abrir o navegador (o teste não prova nada): ' + r.out)
    confere(r)
    let sobra = processosCom(temp)
    for (let i = 0; i < 16 && sobra.length; i++) { await new Promise((ok) => setTimeout(ok, 500)); sobra = processosCom(temp) }
    assert.deepEqual(sobra, [], `Chrome vivo depois de o Node sair (${modo})`)
  })
}
