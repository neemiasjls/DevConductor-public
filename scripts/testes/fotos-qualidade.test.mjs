import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validarAssets, medirImagem, RESOLUCAO_MINIMA } from '../../plugins/landing-pages/skills/lp-assets/scripts/validar-assets.mjs'
import { montarPedido, normalizar } from '../../plugins/landing-pages/skills/lp-assets/scripts/buscar-fotos.mjs'
import { telasParaOlhar } from '../../plugins/landing-pages/skills/lp-revisao/scripts/densidade-regras.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const skills = path.join(raiz, 'plugins/landing-pages/skills')
const buscador = path.join(skills, 'lp-assets/scripts/buscar-fotos.mjs')
const ler = (rel) => fs.readFileSync(path.join(skills, rel), 'utf8').replace(/\r?\n\s*/g, ' ')

function png(largura, altura) {
  const b = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b)
  b.writeUInt32BE(largura, 16)
  b.writeUInt32BE(altura, 20)
  return b
}

function pasta(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fotos-qualidade-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

function manifesto(dir, foto = {}, largura = 2000) {
  fs.writeFileSync(path.join(dir, 'foto.png'), png(largura, 1000))
  return {
    versao: 2,
    serie: { nome: 'luz natural', tratamento: 'sombras no tom da marca' },
    assets: [{ arquivo: 'foto.png', tipo: 'foto', autor: 'Autora', origem: 'https://example.org/foto', licenca: 'CC0', licencaUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' }],
    cenas: [],
    fotos: [{ arquivo: 'foto.png', fonte: 'banco', uso: 'abertura', luz: 'ok', foco: 'ok', expressao: 'ok', serie: 'ok', motivo: 'mostra o cabelo com a luz da marca', ...foto }],
  }
}

test('mede JPEG, PNG e WebP pelo cabeçalho do arquivo', () => {
  assert.deepEqual(medirImagem(png(1600, 900)), { largura: 1600, altura: 900 })
  const jpeg = Buffer.alloc(30)
  jpeg.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0, 0xff, 0xc2, 0x00, 0x11, 0x08])
  jpeg.writeUInt16BE(700, 13)
  jpeg.writeUInt16BE(1280, 15)
  assert.deepEqual(medirImagem(jpeg), { largura: 1280, altura: 700 })
  const webpX = Buffer.alloc(40)
  webpX.write('RIFF', 0, 'latin1'); webpX.write('WEBP', 8, 'latin1'); webpX.write('VP8X', 12, 'latin1')
  webpX.writeUIntLE(959, 24, 3); webpX.writeUIntLE(539, 27, 3)
  assert.deepEqual(medirImagem(webpX), { largura: 960, altura: 540 })
  const webp = Buffer.alloc(40)
  webp.write('RIFF', 0, 'latin1'); webp.write('WEBP', 8, 'latin1'); webp.write('VP8 ', 12, 'latin1')
  webp.writeUInt16LE(1920, 26); webp.writeUInt16LE(794, 28)
  assert.deepEqual(medirImagem(webp), { largura: 1920, altura: 794 })
  assert.equal(medirImagem(Buffer.from('não é imagem, mas tem bytes suficientes aqui')), null)
})

test('versao 2 aprova foto com critério completo e resolução medida', t => {
  const dir = pasta(t)
  const r = validarAssets(manifesto(dir), dir)
  assert.equal(r.aprovado, true, r.erros.join('\n'))
})

test('resolução vale pelo arquivo: declarar ok não salva foto pequena', t => {
  const dir = pasta(t)
  const m = manifesto(dir, {}, RESOLUCAO_MINIMA.abertura - 1)
  const pequena = validarAssets(m, dir)
  assert.equal(pequena.aprovado, false)
  assert.match(pequena.erros.join('\n'), /abaixo de 1600/)
  m.fotos[0].uso = 'apoio'
  assert.equal(validarAssets(m, dir).aprovado, true, 'a mesma foto serve como apoio')
})

test('luz, foco, expressão ou série reprovados bloqueiam e mandam trocar a solução', t => {
  const dir = pasta(t)
  for (const criterio of ['luz', 'foco', 'expressao', 'serie']) {
    const r = validarAssets(manifesto(dir, { [criterio]: 'fraca' }), dir)
    assert.equal(r.aprovado, false, criterio)
    assert.match(r.erros.join('\n'), new RegExp(`${criterio}.*solução visual`))
  }
})

test('exige série, motivo, fonte e uso conhecidos; foto precisa estar nos assets', t => {
  const dir = pasta(t)
  for (const ajuste of [{ motivo: ' ' }, { fonte: 'google' }, { uso: 'enfeite' }, { arquivo: 'outra.png' }]) {
    assert.equal(validarAssets(manifesto(dir, ajuste), dir).aprovado, false, JSON.stringify(ajuste))
  }
  const semSerie = manifesto(dir)
  delete semSerie.serie
  assert.equal(validarAssets(semSerie, dir).aprovado, false)
  assert.equal(validarAssets({ ...manifesto(dir), fotos: [] }, dir).aprovado, false)
})

test('versao 1 continua valendo; Pexels entra e imagem gerada exige ferramenta e data', t => {
  const dir = pasta(t)
  const { fotos, serie, ...antigo } = manifesto(dir)
  assert.ok(fotos && serie)
  assert.equal(validarAssets({ ...antigo, versao: 1 }, dir).aprovado, true)
  const comLicenca = (a) => { const m = manifesto(dir); Object.assign(m.assets[0], a); return validarAssets(m, dir).aprovado }
  assert.equal(comLicenca({ licenca: 'Pexels', licencaUrl: 'https://www.pexels.com/license/' }), true)
  assert.equal(comLicenca({ licenca: 'gerada', licencaUrl: 'https://example.org/termos' }), false)
  assert.equal(comLicenca({ licenca: 'gerada', licencaUrl: 'https://example.org/termos', ferramenta: 'X', data: '2026-11-09' }), true)
})

test('pedidos usam as APIs oficiais, chave só no cabeçalho e nunca sem chave', () => {
  assert.throws(() => montarPedido('pexels', 'cabelo', {}), /Sem chave/)
  assert.throws(() => montarPedido('unsplash', 'cabelo', {}), /Sem chave/)
  const p = montarPedido('pexels', 'cabelo', { chave: 'segredo', orientacao: 'vertical' })
  assert.equal(p.url.origin, 'https://api.pexels.com')
  assert.equal(p.url.searchParams.get('orientation'), 'portrait')
  assert.equal(p.headers.Authorization, 'segredo')
  assert.ok(!p.url.href.includes('segredo'))
  const u = montarPedido('unsplash', 'cabelo', { chave: 'segredo' })
  assert.equal(u.url.origin, 'https://api.unsplash.com')
  assert.equal(u.headers.Authorization, 'Client-ID segredo')
  assert.ok(!u.url.href.includes('segredo'))
  const o = montarPedido('openverse', 'cabelo')
  assert.equal(o.url.searchParams.get('license_type'), 'commercial,modification')
  assert.deepEqual(o.headers, {})
  assert.throws(() => montarPedido('google', 'cabelo'), /desconhecida/)
  assert.throws(() => montarPedido('openverse', 'cabelo', { orientacao: 'torta' }), /inválida/)
})

test('normaliza as três APIs guardando autor, licença e condição de uso', () => {
  const [p] = normalizar('pexels', { photos: [{ id: 1, photographer: 'Ana', width: 4000, height: 6000, url: 'https://www.pexels.com/photo/1/', src: { original: 'o', medium: 'm' } }] })
  assert.equal(p.autor, 'Ana'); assert.equal(p.licenca, 'Pexels'); assert.equal(p.largura, 4000); assert.equal(p.mini, 'm'); assert.match(p.uso, /Pexels/)
  const [u] = normalizar('unsplash', { results: [{ id: 'a', user: { name: 'Bia' }, width: 10, height: 20, urls: { regular: 'r', small: 's' }, links: { html: 'h', download_location: 'd' } }] })
  assert.equal(u.autor, 'Bia'); assert.equal(u.licenca, 'Unsplash'); assert.equal(u.avisarDownload, 'd'); assert.match(u.uso, /avisar o download/)
  const [o] = normalizar('openverse', { results: [{ id: 'x', creator: 'Cris', license: 'cc0', license_url: 'l', width: 5, height: 5, url: 'u', foreign_landing_url: 'f', thumbnail: 't' }] })
  assert.equal(o.licenca, 'CC0'); assert.equal(o.pagina, 'f')
  assert.deepEqual(normalizar('pexels', {}), [])
})

test('sem chave o buscador para com código 2, explica e não grava nada', t => {
  const dir = pasta(t)
  const env = { ...process.env }
  delete env.PEXELS_API_KEY
  const r = spawnSync(process.execPath, [buscador, 'teste', 'pexels', 'cabelo'], { cwd: dir, env, encoding: 'utf8' })
  assert.equal(r.status, 2, r.stdout + r.stderr)
  assert.match(r.stderr, /PEXELS_API_KEY/)
  assert.match(r.stderr, /não raspar/)
  assert.deepEqual(fs.readdirSync(dir), [])
  const invalido = spawnSync(process.execPath, [buscador, 'teste', 'google', 'cabelo'], { cwd: dir, env, encoding: 'utf8' })
  assert.equal(invalido.status, 1)
})

test('tela quase sem texto e sem imagem vai para olhar; foto forte ou texto não', () => {
  const telas = [
    { modo: 'computador', y: 0, palavras: 1, palavrasLeitura: 0, midias: 0 },
    { modo: 'computador', y: 450, palavras: 1, palavrasLeitura: 0, midias: 1 },
    { modo: 'celular', y: 0, palavras: 30, palavrasLeitura: 0, midias: 0 },
    { modo: 'celular', y: 422, palavras: 0, palavrasLeitura: 12, midias: 0 },
    { modo: 'celular', y: 844, palavras: 2 },
  ]
  assert.deepEqual(telasParaOlhar(telas), [{ modo: 'computador', y: 0, palavras: 1 }])
})

test('o kit registra a ordem das imagens, o critério e o teto de densidade', () => {
  const assets = ler('lp-assets/SKILL.md')
  const ordem = ['**Foto do cliente**', '**Banco curado**', '**Imagem gerada**', '**3D real ou ilustração própria:**'].map(t => assets.indexOf(t))
  assert.ok(ordem.every(i => i >= 0) && ordem.every((v, i) => !i || v > ordem[i - 1]), `ordem: ${ordem}`)
  for (const item of ['**Resolução**', '**Luz**', '**Foco**', '**Expressão**', '**Série**']) assert.ok(assets.includes(item), item)
  assert.match(assets, /troque a solução visual/i)
  assert.match(assets, /nunca contornar/i)
  assert.match(assets, /nunca em arquivo versionado/i)
  const revisao = ler('lp-revisao/SKILL.md')
  assert.match(revisao, /teto, não meta/)
  assert.match(revisao, /cada seção tem algo que prende o olhar e conteúdo suficiente para convencer/)
  assert.match(revisao, /nem para aumentar o limite/)
  const regras = ler('lp-maestro/regras.md')
  assert.match(regras, /São teto, não meta/)
  assert.match(regras, /LP-13/)
  assert.match(ler('lp-direcao-de-arte/SKILL.md'), /critério de qualidade em `lp-assets`/)
})

test('os limites de densidade não foram reabertos', async () => {
  const { LIMITES_PADRAO } = await import('../../plugins/landing-pages/skills/lp-revisao/scripts/densidade-regras.mjs')
  assert.deepEqual({ ...LIMITES_PADRAO }, { computador: 60, celular: 45 })
})
