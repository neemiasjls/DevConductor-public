import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { criarEscopoProcessos } from '../lib/processos-teste.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const temporarios = path.join(raiz, 'pilotos/testes-temporarios')
function preparar(t) {
  fs.mkdirSync(temporarios, { recursive: true })
  const dir = fs.mkdtempSync(path.join(temporarios, 'processos-'))
  const cwd = path.join(dir, 'pasta com espaços'); fs.mkdirSync(cwd)
  const arquivo = path.join(cwd, 'servidor.mjs')
  fs.writeFileSync(arquivo, `import http from 'node:http'
if(process.env.IGNORAR_TERM==='1')process.on('SIGTERM',()=>{})
const s=http.createServer((q,r)=>{r.setHeader('connection','close');r.end(JSON.stringify({args:process.argv.slice(2)}))})
s.listen(Number(process.env.PORTA||0),'127.0.0.1',()=>console.log('PORTA '+s.address().port))
`)
  const escopo = criarEscopoProcessos({ toleranciaMs: 300 })
  t.after(async () => {
    await escopo.encerrar().catch(() => {})
    const real = fs.realpathSync(dir), rel = path.relative(fs.realpathSync(temporarios), real)
    assert(rel && !rel.startsWith('..') && !path.isAbsolute(rel))
    fs.rmSync(real, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  })
  return { cwd, arquivo, escopo }
}
function pronto(p) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { limpar(); reject(Error('Servidor não ficou pronto')) }, 5000)
    let saida = ''
    const dados = d => { saida += d; const m = saida.match(/PORTA (\d+)/); if (m) { limpar(); resolve(Number(m[1])) } }
    const falha = e => { limpar(); reject(e) }
    const fim = () => falha(Error('Servidor saiu antes de ficar pronto'))
    function limpar() { clearTimeout(timer); p.stdout.off('data', dados); p.off('error', falha); p.off('close', fim) }
    p.stdout.on('data', dados); p.stderr.resume(); p.once('error', falha); p.once('close', fim)
  })
}
async function portaLivre(porta) {
  const servidor = net.createServer()
  await new Promise((resolve, reject) => { servidor.once('error', reject); servidor.listen(porta, '127.0.0.1', resolve) })
  await new Promise((resolve, reject) => servidor.close(e => e ? reject(e) : resolve()))
}

test('servidor em caminho com espaços encerra e libera a porta antes de retornar', async t => {
  const f = preparar(t), p = f.escopo.iniciarNode([f.arquivo], { cwd: f.cwd })
  const porta = await pronto(p)
  assert.equal((await fetch(`http://127.0.0.1:${porta}`)).status, 200)
  await f.escopo.encerrar()
  await portaLivre(porta)
  assert.throws(() => f.escopo.iniciarNode([f.arquivo]), /já encerrado/)
})

test('falha da revisão passa pelo finally e não deixa o servidor aberto', async t => {
  const f = preparar(t); let porta
  await assert.rejects(async () => {
    try { porta = await pronto(f.escopo.iniciarNode([f.arquivo])); throw Error('Critério reprovado') }
    finally { await f.escopo.encerrar() }
  }, /Critério reprovado/)
  await portaLivre(porta)
})

test('encerra todos os filhos e permite repetir a limpeza sem mandar sinais novos', async t => {
  const f = preparar(t)
  const portas = await Promise.all([pronto(f.escopo.iniciarNode([f.arquivo])), pronto(f.escopo.iniciarNode([f.arquivo]))])
  const fim = f.escopo.encerrar()
  assert.equal(f.escopo.encerrar(), fim)
  await fim
  for (const porta of portas) await portaLivre(porta)
})

test('processo que ignora término normal também é encerrado no prazo', async t => {
  const f = preparar(t), p = f.escopo.iniciarNode([f.arquivo], { env: { ...process.env, IGNORAR_TERM: '1' } })
  const porta = await pronto(p)
  await f.escopo.encerrar(); await portaLivre(porta)
})

test('erro ao iniciar não é escondido pela limpeza', async t => {
  const f = preparar(t), p = f.escopo.iniciarNode([f.arquivo], { cwd: path.join(f.cwd, 'inexistente') })
  await new Promise(resolve => p.once('error', resolve))
  await assert.rejects(f.escopo.encerrar(), AggregateError)
})

test('não encerra o serviço alheio que já ocupa a porta', async t => {
  const f = preparar(t), alheio = http.createServer((q, r) => { r.setHeader('connection', 'close'); r.end('intacto') })
  await new Promise(resolve => alheio.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => alheio.close(resolve)))
  const porta = alheio.address().port
  const p = f.escopo.iniciarNode([f.arquivo], { env: { ...process.env, PORTA: String(porta) } })
  p.stderr.resume(); p.stdout.resume()
  const codigo = await new Promise(resolve => p.once('close', resolve))
  assert.notEqual(codigo, 0)
  await f.escopo.encerrar()
  assert.equal(await (await fetch(`http://127.0.0.1:${porta}`)).text(), 'intacto')
})

test('argumentos com metacaracteres chegam literais ao Node, sem shell', async t => {
  const f = preparar(t), args = ['um & dois', 'aspas "literais"', 'a; b']
  const porta = await pronto(f.escopo.iniciarNode([f.arquivo, ...args]))
  assert.deepEqual((await (await fetch(`http://127.0.0.1:${porta}`)).json()).args, args)
  await f.escopo.encerrar()
})
