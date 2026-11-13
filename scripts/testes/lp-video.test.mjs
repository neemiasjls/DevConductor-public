// Vídeo de venda (lp-video/scripts/video-de-venda.mjs): argumentos e regras da checagem com medidas simuladas,
// ferramenta ausente e rodadas reais contra uma página local pequena (puladas sem Chrome/Edge; a gravação, sem ffmpeg).
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import zlib from 'node:zlib'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins/landing-pages/skills/lp-video/scripts/video-de-venda.mjs')
const V = await import(pathToFileURL(script).href)

const navegador = V.acharNavegador()
const ffmpeg = V.acharFfmpeg()
const semNavegador = !navegador && 'sem Chrome/Edge instalado (defina BROWSER_EXECUTABLE)'
const semGravar = semNavegador || (!ffmpeg && 'sem ffmpeg instalado (defina FFMPEG_PATH)')

// Pasta temporária: no Windows ela pode ficar presa um instante por um processo que ainda está saindo.
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-video-teste-'))
after(() => { try { fs.rmSync(pasta, { recursive: true, force: true, maxRetries: 15, retryDelay: 300 }) } catch {} })

const perfis = () => fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('video-venda-'))
const perfisAntes = new Set(perfis())

const CONTATO = 'WhatsApp (00) 00000-0000'
const textosDoVideo = ['--nome', 'Padaria Sol', '--sub', 'Pães · Centro', '--chamada', 'Peça o seu pão quentinho', '--botao', 'Fazer pedido', '--contato', CONTATO]

// Página pequena: 4 seções com id, cores e letras próprias, sem nada de fora.
const site = path.join(pasta, 'site')
fs.mkdirSync(site)
fs.writeFileSync(path.join(site, 'index.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Padaria Sol</title>
<style>
  * { margin: 0; box-sizing: border-box }
  body { background: #fbf3e4; color: #2a1c10; font: 16px/1.5 Verdana, sans-serif }
  h1, h2 { font-family: Georgia, serif; font-weight: 400 }
  section { min-height: 760px; padding: 72px 24px }
  h1 { font-size: 44px; line-height: 1.1 } h2 { font-size: 32px }
  p { margin-top: 16px; max-width: 34ch }
  a.botao { display: inline-block; margin-top: 24px; padding: 14px 22px; border-radius: 999px; background: #c2410c; color: #fff; text-decoration: none }
  #inicio { background: #3b1d0d; color: #fbf3e4 }
  #forno { background: #f1dfc0 }
  .cartao { margin-top: 24px; height: 220px; border-radius: 16px; background: linear-gradient(135deg, #c2410c, #f59e0b) }
</style></head><body>
<section id="inicio"><h1>Pão quentinho toda manhã</h1><p>Fornadas às 6h, às 11h e às 16h, no centro da cidade.</p><a class="botao" href="#contato">Fazer pedido</a></section>
<section id="paes"><h2>Nossos pães</h2><p>Francês, italiano, integral e de fermentação natural.</p><div class="cartao"></div><div class="cartao"></div></section>
<section id="forno"><h2>Forno a lenha</h2><p>Massa descansada por 18 horas e assada na pedra.</p><div class="cartao"></div></section>
<section id="contato"><h2>Faça o seu pedido</h2><p>Retire na loja ou receba em casa.</p><a class="botao" href="#inicio">Fazer pedido</a></section>
</body></html>
`)
const secoes = ['--secao', '#inicio=Início', '--secao', '#paes=Nossos pães', '--secao', '#forno=Forno a lenha', '--secao', '#contato=Pedido']

// Roteiro de teste: o fecho fica "fim" segundos na tela (--param fim=1). Com "mexe", tenta mover o quadro do site.
const modeloCurto = path.join(pasta, 'curto.html')
fs.writeFileSync(modeloCurto, `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>curto</title><script src="motor.js"></script>
<style>
  #site { position: absolute; left: 0; top: 0; width: 432px; height: 768px }
  .cortina { position: absolute; inset: 0; background: var(--fundo); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; padding: 0 30px }
  #abre-nome { font-size: 60px } #fecha-chamada { font-size: 40px; line-height: 1.1 } #fecha-contato { font-size: 20px }
</style></head><body>
<div id="palco">
  <iframe id="site" title="site"></iframe>
  <div id="abre" class="cortina" data-cobre><div id="abre-nome" class="titulo"></div></div>
  <div id="fecha" class="cortina" data-cobre data-fim><div id="fecha-chamada" class="titulo"></div><div id="fecha-contato"></div></div>
</div>
<script>
Video.modelo({
  nome: 'curto',
  montar(v, d) {
    const fim = Number(d.param.fim || 1)
    v.escreve('#abre-nome', d.nome)
    v.escreve('#fecha-chamada', d.chamada)
    v.escreve('#fecha-contato', d.contato)
    v.cena('#abre', 0, 1.5)
    v.siteEm(1.5)
    v.rola(1.5, 9, { secao: d.secoes.length - 1 }, 'linear')
    if (d.param.mexe) v.anima('#site', 2, 1, { y: [0, 40] })
    v.cena('#fecha', 10.5, 10.5 + fim)
    v.duracao(10.5 + fim)
  },
})
</script></body></html>
`)

const opcoes = (extra) => V.lerArgs([site, '--saida', path.join(pasta, 'saida'), ...textosDoVideo, ...secoes, ...extra])
const rodar = (extra, amb = { navegador, ffmpeg }) => { const op = opcoes(extra); assert.deepEqual(op.erros, []); return V.gerar(op, V.resolverModelos(op.modelo)[0], amb) }
const itemDe = (rel, nome) => rel.itens.find((i) => i.nome === nome)

// ---------------------------------------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------------------------------------
test('argumentos: lê textos, seções, cores e parâmetros', () => {
  const op = V.lerArgs(['dist', '--saida', 'out', '--nome', 'A', '--chamada', 'B', '--contato', 'C', '--secao', '#x=Topo', '--secao', '[data-s="a=b"]=Com colchete',
    '--secao', '#sem-rotulo', '--cor-fundo', '#AABBCC', '--param', 'fim=2.5', '--modelo', 'todos', '--so-checar', '--json'])
  assert.deepEqual(op.erros, [])
  assert.deepEqual(op.secoes, [{ seletor: '#x', rotulo: 'Topo' }, { seletor: '[data-s="a=b"]', rotulo: 'Com colchete' }, { seletor: '#sem-rotulo', rotulo: '' }])
  assert.deepEqual(op.cores, { fundo: '#aabbcc' })
  assert.deepEqual(op.param, { fim: '2.5' })
  assert.equal(op.modelo, 'todos')
  assert.equal(op.soChecar, true)
  assert.equal(op.json, true)
})

test('argumentos: o que falta ou sobra vira erro', () => {
  const erros = V.lerArgs([]).erros.join('\n')
  for (const pedaco of ['pasta do site', '--saida', '--nome', '--chamada', '--contato']) assert.match(erros, new RegExp(pedaco))
  assert.match(V.lerArgs(['dist', '--saida', 'o', '--nome', 'A', '--chamada', 'B', '--contato', 'C', '--cor-texto', 'vermelho']).erros.join(), /#rrggbb/)
  assert.match(V.lerArgs(['dist', '--saida', 'o', '--nome', 'A', '--chamada', 'B', '--contato', 'C', '--musica', 'x']).erros.join(), /Opção desconhecida/)
  assert.match(V.lerArgs(['dist', '--saida']).erros.join(), /Falta o valor/)
})

test('modelos: os 3 da casa existem e nome desconhecido é recusado', () => {
  assert.deepEqual(V.resolverModelos('todos').map((m) => m.nome), ['celular', 'cortes', 'destaques'])
  for (const m of V.resolverModelos('todos')) assert.ok(fs.existsSync(m.arquivo), m.arquivo)
  assert.equal(V.resolverModelos(modeloCurto)[0].nome, 'curto')
  assert.throws(() => V.resolverModelos('filme'), /Modelo desconhecido/)
})

// ---------------------------------------------------------------------------------------------------------
// Checagem com medidas simuladas
// ---------------------------------------------------------------------------------------------------------
const MB = 1024 * 1024
const medidas = (extra = {}) => ({
  nome: 'Padaria Sol', chamada: 'Peça o seu pão quentinho', contato: CONTATO, duracao: 12, quadros: 360,
  textos: [
    { texto: 'PADARIA SOL', fim: false, visivelS: 1.5, primeiroS: 0.5, px: 200, contraste: 9 },
    { texto: 'Nossos pães', fim: false, visivelS: 1.8, primeiroS: 4, px: 40, contraste: 8 },
    { texto: 'Peça o seu pão quentinho', fim: true, visivelS: 2.4, primeiroS: 9.6, px: 100, contraste: 9 },
    { texto: CONTATO, fim: true, visivelS: 2.2, primeiroS: 9.8, px: 42, contraste: 9 },
  ],
  site: { maioriaS: 8, pico: 0.8 },
  arquivo: { largura: 1080, altura: 1920, fps: 30, quadros: 360 },
  leve: { bytes: 4 * MB },
  ...extra,
})
const trocar = (i, campos) => { const m = medidas(); m.textos[i] = { ...m.textos[i], ...campos }; return m }
const reprovados = (m) => V.avaliar(m).filter((i) => i.estado === 'reprovou').map((i) => i.nome)

test('checagem: medidas boas passam em tudo', () => {
  for (const i of V.avaliar(medidas())) assert.equal(i.estado, 'passou', `${i.nome}: ${i.motivo}`)
})

test('checagem: texto final com menos de 2 s reprova', () => {
  const itens = V.avaliar(trocar(2, { visivelS: 1 }))
  const item = itens.find((i) => i.nome === 'texto final na tela')
  assert.equal(item.estado, 'reprovou')
  assert.match(item.motivo, /fica 1,00 s inteiro na tela; o mínimo é 2 s/)
  assert.deepEqual(reprovados(trocar(3, { visivelS: 1.99 })), ['texto final na tela'])
  assert.deepEqual(reprovados(trocar(3, { visivelS: 2 })), [])
})

test('checagem: chamada ou contato fora do fecho reprova', () => {
  assert.match(V.avaliar(trocar(3, { fim: false })).find((i) => i.nome === 'texto final na tela').motivo, /o contato não está no fecho/)
  assert.match(V.avaliar(trocar(2, { texto: 'Outra frase' })).find((i) => i.nome === 'texto final na tela').motivo, /a chamada não está no fecho/)
})

test('checagem: letra, contraste, leitura, duração e abertura', () => {
  assert.deepEqual(reprovados(trocar(1, { px: 27.5 })), ['tamanho da letra'])
  assert.deepEqual(reprovados(trocar(1, { px: 28 })), [])
  assert.deepEqual(reprovados(trocar(1, { contraste: 4.4 })), ['contraste'])
  assert.deepEqual(reprovados(trocar(0, { contraste: 3.2 })), [], 'letra grande aceita contraste 3')
  assert.deepEqual(reprovados(trocar(1, { visivelS: 0.5 })), ['tempo de leitura'])
  assert.deepEqual(reprovados(medidas({ duracao: 9.9 })), ['duração'])
  assert.deepEqual(reprovados(medidas({ duracao: 15.1 })), ['duração'])
  assert.deepEqual(reprovados(trocar(0, { primeiroS: 4 })), ['abertura com o nome'])
})

test('checagem: site pequeno, arquivo errado e versão leve pesada', () => {
  assert.deepEqual(reprovados(medidas({ site: { maioriaS: 5, pico: 0.6 } })), ['site no quadro'])
  assert.deepEqual(reprovados(medidas({ arquivo: { largura: 720, altura: 1280, fps: 30, quadros: 360 } })), ['arquivo'])
  assert.deepEqual(reprovados(medidas({ arquivo: { largura: 1080, altura: 1920, fps: 30, quadros: 359 } })), ['arquivo'])
  assert.deepEqual(reprovados(medidas({ arquivo: { largura: 1080, altura: 1920, fps: 25, quadros: 360 } })), ['arquivo'])
  assert.deepEqual(reprovados(medidas({ leve: { bytes: 6 * MB } })), ['versão leve'])
  const semVideo = V.avaliar(medidas({ arquivo: null, leve: null }))
  assert.deepEqual(semVideo.filter((i) => i.estado === 'pulou').map((i) => i.nome), ['arquivo', 'versão leve'])
})

// ---------------------------------------------------------------------------------------------------------
// Contraste nos pixels
// ---------------------------------------------------------------------------------------------------------
function png(largura, altura, pintar) {
  const bruto = Buffer.alloc((largura * 4 + 1) * altura)
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) Buffer.from(pintar(x, y)).copy(bruto, y * (largura * 4 + 1) + 1 + x * 4)
  const parte = (nome, dados) => { const b = Buffer.alloc(12 + dados.length); b.writeUInt32BE(dados.length, 0); b.write(nome, 4, 'latin1'); dados.copy(b, 8); return b }
  const cabeca = Buffer.alloc(13)
  cabeca.writeUInt32BE(largura, 0); cabeca.writeUInt32BE(altura, 4); cabeca[8] = 8; cabeca[9] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), parte('IHDR', cabeca), parte('IDAT', zlib.deflateSync(bruto)), parte('IEND', Buffer.alloc(0))])
}

test('contraste: lê o PNG e mede o texto contra o fundo de verdade', () => {
  const branco = V.decodificarPng(png(8, 6, () => [255, 255, 255, 255]))
  assert.equal(branco.largura, 8)
  assert.equal(branco.altura, 6)
  assert.deepEqual([...branco.dados.subarray(0, 4)], [255, 255, 255, 255])
  assert.equal(V.medirContraste([0, 0, 0, 1], 1, branco).p10, 21)
  assert.ok(V.medirContraste([0, 0, 0, 1], 0.5, branco).p10 < 6, 'texto meio transparente contrasta menos')
  // Metade do fundo é quase da cor do texto: o contraste que vale é o da parte ruim.
  const misto = V.decodificarPng(png(10, 10, (x) => (x < 5 ? [250, 250, 250, 255] : [20, 20, 20, 255])))
  const r = V.medirContraste([255, 255, 255, 1], 1, misto)
  assert.ok(r.p10 < 1.2 && r.mediana > 15, JSON.stringify(r))
  assert.throws(() => V.decodificarPng(Buffer.from('não é imagem, é só um texto qualquer')), /PNG/)
})

// ---------------------------------------------------------------------------------------------------------
// Linha de comando sem o que precisa: código 2
// ---------------------------------------------------------------------------------------------------------
async function calado(f) {
  const erro = console.error, log = console.log
  const dito = []
  console.error = (...a) => dito.push(a.join(' '))
  console.log = (...a) => dito.push(a.join(' '))
  try { return { codigo: await f(), dito: dito.join('\n') } } finally { console.error = erro; console.log = log }
}

test('linha de comando: sem dados, sem site ou sem Chrome devolve 2', async () => {
  assert.equal((await calado(() => V.executar([]))).codigo, 2)
  const semSite = await calado(() => V.executar([path.join(pasta, 'nao-existe'), '--saida', path.join(pasta, 's'), ...textosDoVideo]))
  assert.equal(semSite.codigo, 2)
  assert.match(semSite.dito, /Não achei o site/)
  const antes = process.env.BROWSER_EXECUTABLE
  process.env.BROWSER_EXECUTABLE = path.join(pasta, 'chrome-que-nao-existe.exe')
  try {
    const r = await calado(() => V.executar([site, '--saida', path.join(pasta, 's'), ...textosDoVideo]))
    assert.equal(r.codigo, 2)
    assert.match(r.dito, /Chrome\/Edge não encontrado/)
  } finally { if (antes === undefined) delete process.env.BROWSER_EXECUTABLE; else process.env.BROWSER_EXECUTABLE = antes }
  assert.ok(!fs.existsSync(path.join(pasta, 's')), 'não cria a pasta de saída quando não vai gerar')
})

// ---------------------------------------------------------------------------------------------------------
// Rodadas reais (página local pequena)
// ---------------------------------------------------------------------------------------------------------
test('rodada real: texto final de 1 s é reprovado e o mesmo roteiro com 2,5 s passa', { skip: semNavegador, timeout: 300_000 }, async () => {
  const curto = await rodar(['--modelo', modeloCurto, '--param', 'fim=1', '--so-checar'])
  assert.equal(curto.resultado, 'reprovado')
  assert.equal(curto.codigo, 1)
  assert.equal(itemDe(curto, 'texto final na tela').estado, 'reprovou')
  assert.match(itemDe(curto, 'texto final na tela').motivo, /o mínimo é 2 s/)
  assert.deepEqual(curto.itens.filter((i) => i.estado === 'reprovou').map((i) => i.nome), ['texto final na tela'], JSON.stringify(curto.itens))

  const bom = await rodar(['--modelo', modeloCurto, '--param', 'fim=2.5', '--so-checar'])
  assert.equal(bom.resultado, 'aprovado', JSON.stringify(bom.itens))
  assert.equal(bom.duracao, 13)
  assert.equal(bom.video, null, '--so-checar não grava vídeo')

  // Pela linha de comando o código de saída é o mesmo
  const cli = await calado(() => V.executar([site, '--saida', path.join(pasta, 'saida'), ...textosDoVideo, ...secoes, '--modelo', modeloCurto, '--param', 'fim=1', '--so-checar']))
  assert.equal(cli.codigo, 1)
  assert.match(cli.dito, /REPROVADO/)
})

test('rodada real: roteiro que mexe no quadro do site é recusado', { skip: semNavegador, timeout: 120_000 }, async () => {
  await assert.rejects(rodar(['--modelo', modeloCurto, '--param', 'fim=2.5', '--param', 'mexe=1', '--so-checar']), /quadro do site não pode ser movido/)
})

test('rodada real: os 3 roteiros da casa passam na checagem com as cores e as seções do site', { skip: semNavegador, timeout: 300_000 }, async () => {
  for (const modelo of V.MODELOS) {
    const rel = await rodar(['--modelo', modelo, '--so-checar'])
    assert.equal(rel.resultado, 'aprovado', `${modelo}: ${JSON.stringify(rel.itens.filter((i) => i.estado === 'reprovou'))}`)
    assert.ok(rel.duracao >= 10 && rel.duracao <= 15, `${modelo}: ${rel.duracao} s`)
    assert.equal(rel.quadros, Math.round(rel.duracao * 30))
    assert.deepEqual(rel.secoes.map((s) => s.rotulo), ['Início', 'Nossos pães', 'Forno a lenha', 'Pedido'])
    assert.match(rel.fontes.titulo, /Georgia/i)
    assert.ok(rel.textos.some((t) => t.fim && t.texto.includes('(00) 00000-0000')), `${modelo}: contato no fecho`)
    assert.deepEqual(rel.avisos, [])
  }
})

test('rodada real: o vídeo sai com 1080 x 1920, 30 quadros por segundo, 10 a 15 s e a versão leve abaixo de 6 MB', { skip: semGravar, timeout: 400_000 }, async () => {
  const rel = await rodar(['--modelo', 'celular'])
  assert.equal(rel.resultado, 'aprovado', JSON.stringify(rel.itens.filter((i) => i.estado !== 'passou')))
  for (const i of rel.itens) assert.equal(i.estado, 'passou', `${i.nome}: ${i.motivo}`)

  const video = await V.sondar(ffmpeg, rel.video)
  assert.equal(video.largura, 1080)
  assert.equal(video.altura, 1920)
  assert.equal(video.fps, 30)
  assert.equal(video.quadros, rel.quadros)
  assert.equal(video.quadros, Math.round(rel.duracao * 30))
  assert.ok(rel.duracao >= 10 && rel.duracao <= 15, `${rel.duracao} s`)
  assert.ok(Math.abs(video.duracao - rel.duracao) < 0.1, `o arquivo tem ${video.duracao} s`)

  const leve = await V.sondar(ffmpeg, rel.leve)
  assert.equal(leve.quadros, rel.quadros)
  assert.ok(leve.bytes < 6 * MB, `${leve.bytes} bytes`)
  assert.ok(leve.bytes <= video.bytes)

  const gravado = JSON.parse(fs.readFileSync(path.join(pasta, 'saida', 'video-celular.json'), 'utf8'))
  assert.equal(gravado.resultado, 'aprovado')
  assert.equal(gravado.quadros, rel.quadros)
})

test('rodada real: grava também pelo endereço local do site (http), com site sem animação nenhuma', { skip: semGravar, timeout: 400_000 }, async () => {
  const servidor = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(fs.readFileSync(path.join(site, 'index.html')))
  })
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
  try {
    const op = V.lerArgs([`http://127.0.0.1:${servidor.address().port}/`, '--saida', path.join(pasta, 'saida-http'), ...textosDoVideo, ...secoes, '--modelo', 'cortes'])
    assert.deepEqual(op.erros, [])
    const rel = await V.gerar(op, V.resolverModelos(op.modelo)[0], { navegador, ffmpeg })
    assert.equal(rel.resultado, 'aprovado', JSON.stringify(rel.itens.filter((i) => i.estado !== 'passou')))
    const video = await V.sondar(ffmpeg, rel.video)
    assert.deepEqual([video.largura, video.altura, video.fps, video.quadros], [1080, 1920, 30, rel.quadros])
    assert.deepEqual(rel.secoes.map((s) => s.rotulo), ['Início', 'Nossos pães', 'Forno a lenha', 'Pedido'])
  } finally {
    servidor.closeAllConnections?.()
    await new Promise((ok) => servidor.close(ok))
  }
})

test('depois das rodadas não sobra Chrome aberto nem pasta de perfil', { skip: semNavegador, timeout: 60_000 }, async () => {
  // O gerador fecha o Chrome e apaga o perfil temporário (video-venda-*) em toda rodada, inclusive nas que falham.
  // Só contam as pastas criadas por este teste (as que já existiam antes ficam de fora).
  const novos = () => perfis().filter((n) => !perfisAntes.has(n))
  for (let i = 0; i < 10 && novos().length; i++) await new Promise((ok) => setTimeout(ok, 500))
  assert.deepEqual(novos(), [])
})
