// Varredura de segurança num comando (plugins/seguranca/skills/varredura-seguranca/scripts/varrer.mjs).
// As ferramentas externas são simuladas por programas falsos criados na pasta temporária; a rodada real com
// gitleaks/osv-scanner só acontece se eles existirem na máquina (senão fica em skip).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const script = path.resolve('plugins/seguranca/skills/varredura-seguranca/scripts/varrer.mjs')
const dados = path.resolve('scripts/testes/dados/varredura')
const v = await import(pathToFileURL(script).href)
const amostra = (n) => JSON.parse(fs.readFileSync(path.join(dados, n), 'utf8'))
const CAMPOS = ['ferramenta', 'tipo', 'categoria', 'gravidade', 'arquivo', 'linha', 'explicacao', 'correcao']

const tmp = (nome) => fs.mkdtempSync(path.join(os.tmpdir(), `varredura-${nome}-`))

// Ambiente com PATH só da pasta dada (no Windows a chave pode ser "Path": troca todas).
const envCom = (bin) => {
  const e = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toLowerCase() !== 'path'))
  e.PATH = bin
  return e
}

// Programa falso: responde no formato da ferramenta usando as amostras; FAKE_MODO=achado|limpo.
const FALSO = `
import fs from 'node:fs'
import path from 'node:path'
const [nome, ...args] = process.argv.slice(2)
const dados = process.env.FAKE_DADOS
const achado = process.env.FAKE_MODO === 'achado'
fs.appendFileSync(path.join(process.env.FAKE_LOG, nome + '.log'), JSON.stringify(args) + '\\n')
// FAKE_FALHA=nome:tipo faz o programa falso responder errado: 127/2 = sai com esse código e stderr com segredo falso;
// vazio = sem resposta; texto = não é JSON; formato = JSON de outro formato; restore = JSON quebrado do dotnet.
const [fNome, fTipo] = (process.env.FAKE_FALHA || ':').split(':')
if (fNome === nome) {
  const saidas = { vazio: '', texto: 'isto nao e json', formato: '{"outro":1}' }
  if (/^[0-9]+$/.test(fTipo)) {
    process.stderr.write(process.env.FAKE_STDERR || 'failed to connect https://user:FAKE_SECRET_123@registry.invalid')
    process.exit(Number(fTipo))
  }
  if (nome === 'gitleaks') {
    const rel = args[args.indexOf('--report-path') + 1]
    if (fTipo !== 'vazio') fs.writeFileSync(rel, saidas[fTipo])
    process.exit(0)
  }
  if (fTipo === 'restore') {
    process.stdout.write(['{', '   "version": 1,', '   "problems": [', '      {', '         "text": "Falha na restauração. Execute "dotnet restore" para obter mais detalhes.",', '         "level": "error"', '      }', '   ]', '}'].join(String.fromCharCode(10)) + String.fromCharCode(10))
    process.exit(1)
  }
  process.stdout.write(saidas[fTipo])
  process.exit(Number(process.env.FAKE_SAIDA || 0))
}
if (nome === 'semgrep' && process.env.FAKE_SEMGREP === 'achado') {
  process.stdout.write(JSON.stringify({ results: [{ check_id: 'x.hardcoded-password', path: 'a.js', start: { line: 3 }, extra: { severity: 'WARNING', message: 'Hardcoded password: FAKE_SECRET_123' } }], errors: [] }))
  process.exit(0)
}
if (nome === 'dotnet') process.exit(0)
if (nome === 'gitleaks') {
  const rel = args[args.indexOf('--report-path') + 1]
  fs.writeFileSync(rel, achado ? fs.readFileSync(path.join(dados, 'gitleaks.json')) : '[]')
  process.exit(0)
}
if (nome === 'osv-scanner') {
  process.stdout.write(achado ? fs.readFileSync(path.join(dados, 'osv-scanner.json'), 'utf8') : '{"results":[]}')
  process.exit(achado ? 1 : 0)
}
if (nome === 'semgrep') {
  // simula erro de configuração: JSON válido, results vazio, erros detalhados e código 7
  process.stdout.write(JSON.stringify({ results: [], errors: [{ type: 'SemgrepError', level: 'error', message: 'invalid configuration' }] }))
  process.exit(7)
}
if (nome === 'npm') {
  process.stdout.write(achado ? fs.readFileSync(path.join(dados, 'npm-audit.json'), 'utf8') : '{"vulnerabilities":{}}')
  process.exit(achado ? 1 : 0)
}
process.exit(3)
`

function criarFalsos(nomes) {
  const bin = tmp('bin')
  const log = tmp('log')
  const falso = path.join(bin, 'falso.mjs')
  fs.writeFileSync(falso, FALSO)
  for (const n of nomes) {
    if (process.platform === 'win32') {
      fs.writeFileSync(path.join(bin, `${n}.cmd`), `@echo off\r\n"${process.execPath}" "${falso}" ${n} %*\r\n`)
    } else {
      const f = path.join(bin, n)
      fs.writeFileSync(f, `#!/bin/sh\nexec "${process.execPath}" "${falso}" ${n} "$@"\n`)
      fs.chmodSync(f, 0o755)
    }
  }
  return { bin, log }
}

const envFalso = ({ bin, log }, modo) => ({ ...envCom(bin), FAKE_DADOS: dados, FAKE_MODO: modo, FAKE_LOG: log })
const dubleVazio = async () => []

test('normaliza as saídas de exemplo de cada ferramenta numa lista única', () => {
  const p = path.resolve('projeto')
  const gl = v.normalizarGitleaks(amostra('gitleaks.json'), p)
  assert.deepEqual([gl.length, gl[0].tipo, gl[0].gravidade, gl[0].arquivo, gl[0].linha], [1, 'segredo', 'critico', 'api/appsettings.json', 7])
  assert.doesNotMatch(JSON.stringify(gl), /REDACTED/, 'nunca repete o trecho do segredo')

  const osv = v.normalizarOsv(amostra('osv-scanner.json'), p)
  assert.deepEqual(osv.map((a) => a.gravidade), ['alto', 'baixo'], 'nota 7.2 = alto; sem nota usa a palavra do banco (LOW)')
  assert.match(osv[0].correcao, /lodash para 4\.17\.21/)
  assert.equal(osv[0].arquivo, 'web/package-lock.json')

  const dn = v.normalizarDotnet(amostra('dotnet.json'), p)
  assert.deepEqual(dn.map((a) => a.gravidade), ['alto', 'medio'])
  assert.match(dn[1].explicacao, /puxado por outro pacote/)

  const npm = v.normalizarNpm(amostra('npm-audit.json'), 'package-lock.json')
  assert.deepEqual([npm.length, npm[0].gravidade], [1, 'alto'])
  assert.match(npm[0].correcao, /4\.17\.21/)

  const pip = v.normalizarPipAudit(amostra('pip-audit.json'), 'requirements.txt')
  assert.deepEqual([pip.length, pip[0].gravidade], [1, 'alto'], 'sem gravidade informada conta como alta')
  assert.match(pip[0].correcao, /2\.20\.0/)

  const sg = v.normalizarSemgrep(amostra('semgrep.json'), p)
  assert.deepEqual([sg[0].tipo, sg[0].gravidade, sg[0].linha], ['codigo', 'alto', 21])

  for (const a of [...gl, ...osv, ...dn, ...npm, ...pip, ...sg]) {
    assert.deepEqual(Object.keys(a).sort(), [...CAMPOS].sort())
    assert.ok(['segredo', 'dependencia', 'codigo'].includes(a.tipo))
    assert.ok(['critico', 'alto', 'medio', 'baixo'].includes(a.gravidade))
  }
})

test('PATH vazio: sai com 2, diz o que faltou e como instalar, e grava o relatório', () => {
  const pasta = tmp('vazio')
  const saida = path.join(pasta, 'saida')
  const r = spawnSync(process.execPath, [script, pasta, '--saida', saida], { encoding: 'utf8', env: envCom(tmp('binvazio')) })
  assert.equal(r.status, 2, r.stderr)
  assert.match(r.stdout, /FALTOU: gitleaks/)
  assert.match(r.stdout, /FALTOU: osv-scanner/)
  assert.match(r.stdout, /winget install Gitleaks\.Gitleaks/)
  const md = fs.readFileSync(path.join(saida, 'relatorio-seguranca.md'), 'utf8')
  assert.match(md, /varredura incompleta/)
  assert.match(md, /Como instalar/)
  assert.equal(JSON.parse(fs.readFileSync(path.join(saida, 'relatorio-seguranca.json'), 'utf8')).codigo, 2)
})

test('segredo falso e lockfile vulnerável: sai com 1 e o relatório traz os dois e o dublê das verificações', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const pasta = tmp('achado')
  const duble = async (p, { ignorar }) => {
    assert.equal(p, pasta)
    assert.deepEqual(ignorar, [])
    return [{ tipo: 'codigo', categoria: 'login', gravidade: 'medio', arquivo: 'api/Login.cs', linha: 3, explicacao: 'Senha no log.', correcao: 'Tirar do log.' }]
  }
  const res = await v.varrer(pasta, { env: envFalso(falsos, 'achado'), verificar: duble })
  assert.equal(res.codigo, 1)
  assert.deepEqual(res.faltaram.filter((f) => f.obrigatoria), [])
  assert.deepEqual(res.achados.map((a) => a.ferramenta), ['gitleaks', 'osv-scanner', 'verificacoes-proprias', 'osv-scanner'], 'ordem por gravidade')
  const md = fs.readFileSync(v.gravar(res, path.join(pasta, 'saida')), 'utf8')
  assert.match(md, /CRÍTICO.*api\/appsettings\.json:7/)
  assert.match(md, /ALTO.*web\/package-lock\.json.*lodash/)
  assert.match(md, /MÉDIO.*api\/Login\.cs:3/)
  const args = JSON.parse(fs.readFileSync(path.join(falsos.log, 'gitleaks.log'), 'utf8').trim())
  assert.ok(args[0] === 'dir' && args.includes('--redact') && args.includes('--gitleaks-ignore-path'), 'gitleaks dir com --redact e .gitleaksignore')
  assert.ok(!fs.existsSync(path.join(falsos.log, 'npm.log')), 'npm audit só na falta do osv-scanner')
})

test('ferramentas sem achado e dublê só com médio: sai com 0; dublê com alto: sai com 1', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const pasta = tmp('limpo')
  const medio = async () => [{ tipo: 'codigo', categoria: 'x', gravidade: 'medio', arquivo: 'a.cs', linha: 1, explicacao: 'e', correcao: 'c' }]
  assert.equal((await v.varrer(pasta, { env: envFalso(falsos, 'limpo'), verificar: medio })).codigo, 0)
  const alto = async () => [{ tipo: 'codigo', categoria: 'x', gravidade: 'alto', arquivo: 'a.cs', linha: 1, explicacao: 'e', correcao: 'c' }]
  assert.equal((await v.varrer(pasta, { env: envFalso(falsos, 'limpo'), verificar: alto })).codigo, 1)
})

test('falta só o osv-scanner: sai com 2 sem achado grave e com 1 havendo segredo', async () => {
  const falsos = criarFalsos(['gitleaks'])
  const pasta = tmp('semosv')
  const limpo = await v.varrer(pasta, { env: envFalso(falsos, 'limpo'), verificar: dubleVazio })
  assert.equal(limpo.codigo, 2)
  assert.deepEqual(limpo.faltaram.filter((f) => f.obrigatoria).map((f) => f.ferramenta), ['osv-scanner'])
  assert.equal((await v.varrer(pasta, { env: envFalso(falsos, 'achado'), verificar: dubleVazio })).codigo, 1)
})

test('Semgrep com erro de configuração (código 7, results vazio): vai para o que não rodou e não conta como rodada', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner', 'semgrep'])
  const res = await v.varrer(tmp('semgrep'), { env: envFalso(falsos, 'limpo'), verificar: dubleVazio })
  assert.ok(!res.rodaram.includes('semgrep'))
  const f = res.faltaram.find((x) => x.ferramenta === 'semgrep')
  assert.ok(f && /código 7.*invalid configuration/.test(f.motivo), JSON.stringify(f))
  assert.equal(f.obrigatoria, false)
  assert.equal(res.codigo, 0, 'camada opcional que falha aparece no relatório, mas não muda o código')
  assert.match(v.relatorioMd(res), /semgrep: falhou: saiu com código 7/)
})

test('.devconductor/varredura.json (ignorar) tira o achado do relatório e chega às verificações próprias', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const pasta = tmp('ignorar')
  fs.mkdirSync(path.join(pasta, '.devconductor'))
  fs.writeFileSync(path.join(pasta, '.devconductor', 'varredura.json'), JSON.stringify({ ignorar: ['api/**', 'web/package-lock.json'] }))
  let recebido = null
  const res = await v.varrer(pasta, { env: envFalso(falsos, 'achado'), verificar: async (p, o) => { recebido = o.ignorar; return [] } })
  assert.deepEqual(recebido, ['api/**', 'web/package-lock.json'])
  assert.deepEqual([res.codigo, res.achados.length], [0, 0])
})

test('linha de comando com ferramentas falsas (.cmd no Windows, script no Linux) devolve 1 e grava na saída', () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const pasta = tmp('cli com espaco')
  const saida = path.join(pasta, 'saida')
  const r = spawnSync(process.execPath, [script, pasta, '--saida', saida], { encoding: 'utf8', env: envFalso(falsos, 'achado') })
  assert.equal(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stdout, /Rodaram: gitleaks dir, osv-scanner/)
  assert.ok(fs.existsSync(path.join(saida, 'relatorio-seguranca.json')))
})

const temGitleaks = Boolean(v.acharNoPath('gitleaks'))
test('rodada real com o gitleaks da máquina acha um segredo falso', { skip: !temGitleaks && 'gitleaks não instalado' }, async () => {
  const pasta = tmp('real')
  const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const resto = Array.from(crypto.randomBytes(16), (b) => base32[b % 32]).join('')
  fs.writeFileSync(path.join(pasta, 'config.js'), `const chave = '${'AK' + 'IA'}${resto}'\n`)
  const res = await v.varrer(pasta, { verificar: dubleVazio })
  const seg = res.achados.filter((a) => a.ferramenta === 'gitleaks')
  assert.equal(seg.length, 1, JSON.stringify(res.faltaram))
  assert.deepEqual([seg[0].arquivo, seg[0].linha, res.codigo], ['config.js', 1, 1])
  assert.ok(!JSON.stringify(res).includes(resto), 'o segredo não aparece no resultado')
})

const temOsv = Boolean(v.acharNoPath('osv-scanner'))
test('rodada real com o osv-scanner da máquina', { skip: !temOsv && 'osv-scanner não instalado' }, async () => {
  const pasta = tmp('realosv')
  fs.writeFileSync(path.join(pasta, 'package-lock.json'), JSON.stringify({
    name: 'x', version: '1.0.0', lockfileVersion: 3, requires: true,
    packages: { '': { name: 'x', version: '1.0.0', dependencies: { lodash: '4.17.20' } }, 'node_modules/lodash': { version: '4.17.20' } },
  }))
  const res = await v.varrer(pasta, { verificar: dubleVazio })
  assert.ok(res.rodaram.includes('osv-scanner'), JSON.stringify(res.faltaram))
  assert.ok(res.achados.some((a) => a.ferramenta === 'osv-scanner' && /lodash/.test(a.explicacao)))
})

// ---------- resposta vazia/inesperada, segredo em mensagem de ferramenta, glob, .cmd ----------
const SEGREDO = 'FAKE_SECRET_123'
const SEGREDO_URL = `failed to connect https://user:${SEGREDO}@registry.invalid`
const rodarCli = (falsos, extraEnv, pasta = tmp('cli')) => {
  const saida = path.join(pasta, 'saida')
  const r = spawnSync(process.execPath, [script, pasta, '--saida', saida], { encoding: 'utf8', env: { ...envFalso(falsos, 'limpo'), ...extraEnv } })
  return { r, saida }
}

for (const ferr of ['gitleaks', 'osv-scanner']) {
  for (const [falha, motivoEsperado] of [['127', /falhou/], ['2', /falhou/], ['vazio', /resposta vazia/], ['texto', /formato inesperado/], ['formato', /formato inesperado/]]) {
    test(`${ferr} obrigatório com resposta "${falha}": vai para "faltaram" e sai com 2`, async () => {
      const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
      const env = { ...envFalso(falsos, 'limpo'), FAKE_FALHA: `${ferr}:${falha}` }
      const res = await v.varrer(tmp('falha'), { env, verificar: dubleVazio })
      const f = res.faltaram.find((x) => x.ferramenta.startsWith(ferr))
      assert.ok(f && f.obrigatoria && motivoEsperado.test(f.motivo), JSON.stringify(res.faltaram))
      assert.ok(!res.rodaram.some((x) => x.startsWith(ferr)), 'não conta como rodada')
      assert.equal(res.codigo, 2)
    })
  }
}

test('osv-scanner que sai com 1 (ou 0) sem JSON válido não vira "código limpo"', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  for (const saidaCod of ['0', '1']) {
    const env = { ...envFalso(falsos, 'limpo'), FAKE_FALHA: 'osv-scanner:vazio', FAKE_SAIDA: saidaCod }
    const res = await v.varrer(tmp('osv1'), { env, verificar: dubleVazio })
    assert.equal(res.codigo, 2, `saída ${saidaCod}`)
    assert.match(res.faltaram.find((x) => x.ferramenta === 'osv-scanner').motivo, /resposta vazia/)
  }
})

test('gitleaks limpo com relatório "[]" continua limpo; relatório inexistente não é', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const ok = await v.varrer(tmp('gl'), { env: envFalso(falsos, 'limpo'), verificar: dubleVazio })
  assert.deepEqual([ok.codigo, ok.rodaram.includes('gitleaks dir')], [0, true])
})

test('segredo na mensagem da ferramenta não aparece no terminal, no .md nem no .json', () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner', 'semgrep'])
  const { r, saida } = rodarCli(falsos, { FAKE_FALHA: 'osv-scanner:127', FAKE_SEMGREP: 'achado' })
  assert.equal(r.status, 2, r.stdout + r.stderr)
  const todas = [r.stdout, r.stderr, fs.readFileSync(path.join(saida, 'relatorio-seguranca.md'), 'utf8'), fs.readFileSync(path.join(saida, 'relatorio-seguranca.json'), 'utf8')]
  for (const t of todas) assert.ok(!t.includes(SEGREDO), 'vazou: ' + t.slice(0, 300))
  assert.match(todas[0], /usuario:\*\*\*@/, 'a URL continua legível, sem a senha')
  assert.match(todas[2], /hardcoded-password|regra/i, 'achado do Semgrep traz a regra, não a mensagem livre')
})

test('limpar: máscara de URL, palavra de segredo, prefixo de chave, sequência longa e corte', () => {
  assert.ok(!v.limpar(SEGREDO_URL).includes(SEGREDO))
  assert.ok(!v.limpar(`Hardcoded password: ${SEGREDO}`).includes(SEGREDO))
  for (const t of ['senha=abc123', 'token: xyz', 'api_key = k1', 'Authorization: Bearer TESTE']) assert.match(v.limpar(t), /\*\*\*/, t)
  for (const t of [`ghp_${'a1'.repeat(10)}`, `sk-${'b2'.repeat(10)}`, 'AKIA' + 'ABCDEFGHIJKLMNOP', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc', 'A1b2C3d4E5f6G7h8I9j0K1l2']) assert.equal(v.limpar(t), '***', t)
  const longo = v.limpar('x '.repeat(500))
  assert.ok(longo.length <= 201)
  assert.equal(v.limpar('erro simples de rede'), 'erro simples de rede')
})

test('glob: padrão com estrelas repetidas não explode (< 200 ms) e a semântica antiga continua', () => {
  const t0 = Date.now()
  assert.equal(v.globParaRegex('*a'.repeat(8) + 'Z').test('a'.repeat(60)), false)
  assert.equal(v.globParaRegex('**a'.repeat(10) + 'Z').test('a'.repeat(200)), false)
  assert.ok(Date.now() - t0 < 200, `levou ${Date.now() - t0} ms`)
  const casa = (g, c) => v.globParaRegex(g).test(c)
  assert.ok(casa('api/**', 'api/x/y.cs') && casa('**/*.CS', 'a/b/c.cs') && casa('gerado', 'gerado/a/b') && casa('web/package-lock.json', 'web/package-lock.json'))
  assert.ok(!casa('*.cs', 'a/b.cs') && casa('a?c', 'abc') && !casa('a?c', 'a/c') && !casa('api/**', 'apix'))
})

// Casador antigo (conjunto de posições, quadrático em `**`): fica só aqui, como gabarito da semântica.
function globAntigo(glob) {
  const g = String(glob).replace(/\\/g, '/').toLowerCase()
  const partes = []
  for (let i = 0; i < g.length; i++) {
    const c = g[i]
    if (c === '*' && g[i + 1] === '*') { i++; if (g[i + 1] === '/') { i++; partes.push('**/') } else partes.push('**') } else if (c === '*' || c === '?') partes.push(c)
    else partes.push({ lit: c })
  }
  return (caminho) => {
    const s = String(caminho).toLowerCase()
    const n = s.length
    let at = new Set([0])
    for (const p of partes) {
      const prox = new Set()
      for (const i of at) {
        if (typeof p === 'object') { if (i < n && s[i] === p.lit) prox.add(i + 1) } else if (p === '?') { if (i < n && s[i] !== '/') prox.add(i + 1) } else if (p === '*') { for (let j = i; j <= n; j++) { prox.add(j); if (j < n && s[j] === '/') break } } else if (p === '**') { for (let j = i; j <= n; j++) prox.add(j) } else { prox.add(i); for (let j = i; j < n; j++) if (s[j] === '/') prox.add(j + 1) }
      }
      at = prox
      if (!at.size) return false
    }
    for (const i of at) if (i === n || s[i] === '/') return true
    return false
  }
}

test('glob: `**` repetido, `**` no fim e `**` seguido de `*` casam como antes (60 mil pares sorteados contra o casador antigo)', () => {
  const casa = (g, c) => v.globParaRegex(g).test(c)
  assert.ok(casa('**/**', 'a/b/x') && casa('**/**/**', 'x') && casa('**/**/x', 'x') && casa('**/**/x', 'a/b/x') && !casa('**/**/x', 'a/b/y'))
  assert.ok(casa('a/**', 'a/b/c') && casa('a/**', 'a/') && !casa('a/**', 'ab') && casa('**', '') && casa('***', 'a/b') && casa('a/**/b', 'a/b') && casa('a/**/b', 'a/x/y/b') && !casa('a/**/b', 'a/xb'))
  assert.ok(casa('**/*.cs', 'x.cs') && casa('**/*', 'a/b') && casa('*/**/', 'a/b/') && !casa('*/x', 'a/b/x') && casa('**a**a**', 'xaya/z') && !casa('**a**a**', 'xa/z'))
  let semente = 20261111
  const sorteio = (n) => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente % n }
  const gerar = (alfabeto, max) => Array.from({ length: sorteio(max + 1) }, () => alfabeto[sorteio(alfabeto.length)]).join('')
  let casaram = 0
  for (let i = 0; i < 60000; i++) {
    const g = gerar('ab/**?', 8)
    const c = gerar('ab/', 10)
    const esperado = globAntigo(g)(c)
    if (esperado) casaram++
    assert.equal(casa(g, c), esperado, `glob ${JSON.stringify(g)} em ${JSON.stringify(c)}`)
  }
  assert.ok(casaram > 5000 && casaram < 55000, `sorteio desequilibrado: ${casaram} casaram`)
})

test('glob: tempo em linha reta no tamanho do caminho (dobrar de 4 mil para 8 mil caracteres não quadruplica)', () => {
  const caminho = (n) => 'a/'.repeat(n / 2) + 'x'
  // Menor de 5 rodadas de 40 chamadas: tira o ruído da máquina e do aquecimento sem depender de um número absoluto pequeno.
  const medir = (glob, n) => {
    const r = v.globParaRegex(glob)
    const s = caminho(n)
    let menor = Infinity
    for (let rodada = 0; rodada < 5; rodada++) {
      const t0 = performance.now()
      for (let i = 0; i < 40; i++) assert.equal(r.test(s), true)
      menor = Math.min(menor, performance.now() - t0)
    }
    return menor
  }
  // No casador antigo, `**/**` levava ~19 ms e ~77 ms POR chamada (4 e 8 mil): razão 4 e minutos no caminho de 64 mil.
  for (const glob of ['**/**', '**/**/**', '**/*', '***', '**/**/x', '*/**/*', '**a**a**/**']) {
    medir(glob, 2000)
    const t4 = medir(glob, 4000)
    const t8 = medir(glob, 8000)
    assert.ok(t8 < t4 * 3 + 5, `${glob}: 40 chamadas levaram ${t4.toFixed(1)} ms com 4 mil e ${t8.toFixed(1)} ms com 8 mil caracteres`)
    assert.ok(t8 < 400, `${glob}: 40 chamadas com 8 mil caracteres levaram ${t8.toFixed(1)} ms`)
    const t0 = performance.now()
    assert.equal(v.globParaRegex(glob).test(caminho(64000)), true)
    assert.ok(performance.now() - t0 < 300, `${glob}: caminho de 64 mil caracteres levou ${Math.round(performance.now() - t0)} ms`)
  }
})

test('Windows com ferramenta .cmd: pasta com % ou & é recusada com mensagem clara', { skip: process.platform !== 'win32' && 'só vale no Windows' }, async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  for (const nome of ['a%PATH%b', 'a&b']) {
    const pasta = path.join(tmp('cmd'), nome)
    fs.mkdirSync(pasta)
    await assert.rejects(v.varrer(pasta, { env: envFalso(falsos, 'limpo'), verificar: dubleVazio }), /mova o projeto para uma pasta sem esses caracteres/)
    const r = spawnSync(process.execPath, [script, pasta, '--saida', path.join(tmp('s'), 'x')], { encoding: 'utf8', env: envFalso(falsos, 'limpo') })
    assert.equal(r.status, 2)
    assert.match(r.stderr, /mova o projeto para uma pasta sem esses caracteres/)
  }
})

test('dotnet sem restore (JSON quebrado com aspas sem escape): motivo legível, não o fim do JSON', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner', 'dotnet'])
  const pasta = tmp('dotnet')
  fs.writeFileSync(path.join(pasta, 'App.csproj'), '<Project />')
  const env = { ...envFalso(falsos, 'limpo'), FAKE_FALHA: 'dotnet:restore' }
  const res = await v.varrer(pasta, { env, verificar: dubleVazio })
  const f = res.faltaram.find((x) => x.ferramenta === 'dotnet list package')
  assert.ok(f && /Falha na restauração/.test(f.motivo) && !/^\s*[\]}]/.test(f.motivo), JSON.stringify(f))
  assert.equal(res.codigo, 0, 'dotnet é camada opcional')
})

// Valores de mentira montados em pedaços: o arquivo de teste não guarda nada com formato de chave de verdade.
const VALOR = 'VALORsecretoXYZ'

test('limpar: Authorization Basic/Bearer, "client_secret":"x", pass=x e senha em URL somem (texto de ferramenta e frase do kit)', () => {
  const casos = [
    `Authorization: Basic ${VALOR}`, `Authorization: Bearer ${VALOR}`, `authorization=Basic ${VALOR}`,
    `{"client_secret":"${VALOR}"}`, `{\\"client_secret\\":\\"${VALOR}\\"}`, `"clientSecret": "${VALOR} com espaco"`,
    `pass=${VALOR}`, `db_password: ${VALOR}`, `PGPASSWORD=${VALOR} psql`, `config["Jwt:Key"] = "${VALOR}"`,
    `falha em https://deploy:${VALOR}@git.invalid/repo.git`, `postgres://app:p@${VALOR}@db.invalid:5432/x`, `https://x.invalid/a?token=${VALOR}&b=1`,
  ]
  for (const c of casos) for (const prosa of [false, true]) assert.ok(!v.limpar(c, Infinity, { prosa }).includes(VALOR), `${c} (prosa ${prosa})`)
  assert.ok(!v.limpar(`login --password ${VALOR} recusado`).includes(VALOR), 'palavra de segredo sem = nem :')
  assert.equal(v.limpar(`Authorization: Basic ${VALOR}`), 'Authorization: ***', 'mascara a credencial, não o esquema')
})

test('limpar: chaves só de letras (prefixo conhecido), bloco de chave privada e chave comprida sem número', () => {
  const pagamento = 'sk_' + 'live_' + 'abcdefghijklmnopqrstuvwx'
  const mapas = 'AI' + 'za' + 'abcdefghijklmnopqrstuvwxyzABCDEFGHI'
  for (const k of [pagamento, mapas, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ']) assert.equal(v.limpar(`valor ${k} recusado`), 'valor *** recusado', k)
  const inicio = '-----BEGIN ' + 'PRIVATE KEY-----'
  const fim = '-----END ' + 'PRIVATE KEY-----'
  const corpo = ['abcdEFGHijklMNOP', 'qrstUVWXyzabCDEF']
  assert.equal(v.limpar(['erro ao ler', inicio, ...corpo, fim, 'depois'].join('\n')), 'erro ao ler *** depois')
  const semFim = v.limpar(['erro ao ler', inicio.replace('PRIVATE', 'RSA PRIVATE'), ...corpo].join('\n'))
  for (const p of corpo) assert.ok(!semFim.includes(p), 'bloco sem a linha END também some')
})

test('limpar: frase do kit e mensagem comum continuam legíveis', () => {
  const frase = 'Senha, chave ou token escrito no arquivo (regra x, commit 1a2b3c4d). Como corrigir: ler de variável de ambiente ou cofre de segredos.'
  assert.equal(v.limpar(frase, Infinity, { prosa: true }), frase)
  for (const t of ['falhou: saiu com código 2 em src/app/servicos/pedidos.ts', 'Atualizar lodash para 4.17.21 ou mais nova.', 'ver GHSA-35jh-r3h4-6jhm em osv.dev']) assert.equal(v.limpar(t), t)
})

test('limpar: tempo em linha reta (100 mil caracteres em menos de 200 ms) e o texto é cortado antes das regex', () => {
  const entradas = ['a'.repeat(100000), 'ab '.repeat(33000), 'key='.repeat(25000), '://a:'.repeat(20000), 'https'.repeat(20000),
    'public '.repeat(14000), '-----BEGIN '.repeat(9000), '"'.repeat(100000), 'password '.repeat(11000), 'x'.repeat(99999) + '1', 'a1'.repeat(50000) + ' fim']
  for (const e of entradas) {
    for (const max of [200, Infinity]) {
      const t0 = performance.now()
      const r = v.limpar(e, max)
      const ms = performance.now() - t0
      assert.ok(ms < 200, `${e.slice(0, 12)}… (max ${max}) levou ${Math.round(ms)} ms`)
      assert.ok(r.length <= (max === 200 ? 201 : 4001), `${e.slice(0, 12)}… ficou com ${r.length} caracteres`)
    }
  }
})

test('limpar: chave partida pelo corte não deixa pedaço para trás', () => {
  const chave = 'K9'.repeat(20)
  // A máscara do começo encurta o texto e puxaria o pedaço cortado da chave para dentro da parte visível.
  const texto = `senha=${'z'.repeat(500)} ${'x '.repeat(43)}${chave}`
  const r = v.limpar(texto)
  assert.ok(!r.includes('K9K9'), r)
  assert.match(r, /^senha=\*\*\* x x /)
  // O corte vem ANTES das regex: o que passa de limite + margem não é processado nem aparece, mesmo sobrando espaço.
  const alem = v.limpar(`senha=${'z'.repeat(500)} ${'x '.repeat(50)}MARCA fim`)
  assert.ok(!alem.includes('MARCA') && alem.endsWith('…'), alem)
})

test('última barreira: explicação e correção de qualquer achado passam pela limpeza, inclusive das verificações próprias', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const duble = async () => [{ tipo: 'codigo', categoria: 'x', gravidade: 'medio', arquivo: 'a.cs', linha: 1,
    explicacao: `resposta {"client_secret":"${SEGREDO}"} recebida`, correcao: `ver https://user:${SEGREDO}@nuget.invalid/x e usar pass=${SEGREDO}` }]
  const res = await v.varrer(tmp('barreira'), { env: envFalso(falsos, 'limpo'), verificar: duble })
  assert.equal(res.achados.length, 1)
  assert.ok(!JSON.stringify(res).includes(SEGREDO), JSON.stringify(res.achados))
  assert.ok(!v.relatorioMd(res).includes(SEGREDO))
  assert.match(res.achados[0].correcao, /usuario:\*\*\*@nuget\.invalid/)
})

test('dotnet: endereço do aviso com credencial não vaza na correção; o identificador GHSA continua legível', async () => {
  const dados = (url) => ({ projects: [{ path: 'a.csproj', frameworks: [{ topLevelPackages: [{ id: 'Pacote.X', resolvedVersion: '1.0.0', vulnerabilities: [{ severity: 'High', advisoryurl: url }] }] }] }] })
  const sujo = v.normalizarDotnet(dados(`https://user:${SEGREDO}@nuget.invalid/adv?token=${SEGREDO}`), path.resolve('.'))[0]
  assert.ok(!sujo.correcao.includes(SEGREDO), sujo.correcao)
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const duble = async () => v.normalizarDotnet(dados('https://github.com/advisories/GHSA-5crp-9r3c-p9vr'), path.resolve('.'))
  const res = await v.varrer(tmp('ghsa'), { env: envFalso(falsos, 'limpo'), verificar: duble })
  assert.match(res.achados[0].correcao, /detalhes: GHSA-5crp-9r3c-p9vr\)/, 'a barreira final não apaga o identificador')
})

test('segredo em formatos comuns no erro da ferramenta não aparece no terminal, no .md nem no .json', () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const valores = ['SEGREDOumXYZ', 'SEGREDOdoisXYZ', 'SEGREDOtresXYZ']
  const erro = `erro {"client_secret":"${valores[0]}"} pass=${valores[1]} Authorization: Basic ${valores[2]}`
  const { r, saida } = rodarCli(falsos, { FAKE_FALHA: 'osv-scanner:127', FAKE_STDERR: erro })
  assert.equal(r.status, 2, r.stdout + r.stderr)
  const todas = [r.stdout, r.stderr, fs.readFileSync(path.join(saida, 'relatorio-seguranca.md'), 'utf8'), fs.readFileSync(path.join(saida, 'relatorio-seguranca.json'), 'utf8')]
  assert.match(todas[0], /client_secret/, 'o erro da ferramenta chegou ao terminal')
  for (const t of todas) for (const x of valores) assert.ok(!t.includes(x), `vazou ${x}`)
})

const BARRA = String.fromCharCode(92)
const FINAL = 'finalcurto'

test('limpar: valor entre aspas com aspa escapada sai inteiro (duplas, simples, JSON dentro de texto, sem fecho)', () => {
  const casos = [
    `password="inicio${BARRA}" ${FINAL}"`, `password='inicio${BARRA}' ${FINAL}' depois`, `senha: "inicio ${BARRA}"${BARRA}" ${FINAL}" depois`,
    `senha="inicio sem fecho ${FINAL}`, `senha='inicio sem fecho ${FINAL}`, `senha="inicio ${FINAL}${BARRA}`,
    `{${BARRA}"senha${BARRA}":${BARRA}"inicio ${BARRA}${BARRA}${BARRA}" ${FINAL}${BARRA}"} depois`, `pwd=${BARRA}'inicio ${FINAL}${BARRA}' depois`,
    `Authorization: Bearer 'inicio${BARRA}' ${FINAL}' depois`, `config["Jwt:Key"] = "inicio${BARRA}" ${FINAL}";`,
  ]
  for (const c of casos) {
    for (const prosa of [false, true]) {
      const r = v.limpar(c, Infinity, { prosa })
      assert.ok(!r.includes(FINAL) && !r.includes('inicio'), `${c} (prosa ${prosa}) virou ${r}`)
      const denovo = v.limpar(r, Infinity, { prosa }) // o texto passa pela limpeza mais de uma vez até chegar ao relatório
      assert.ok(denovo.includes('***') && !denovo.includes(FINAL) && denovo.length <= r.length, `limpar de novo: ${denovo}`)
    }
  }
  assert.ok(!v.limpar(`login --password "inicio${BARRA}" ${FINAL}" recusado`).includes(FINAL), 'palavra de segredo sem = nem :')
  assert.equal(v.limpar(`password="inicio${BARRA}" ${FINAL}"`), 'password=***', 'caso do revisor')
  // O fecho continua sendo respeitado: o que vem depois do valor fica legível.
  assert.equal(v.limpar(`password="abc${BARRA}${BARRA}" resto visivel`), 'password=*** resto visivel', 'barra escapada antes da aspa: a aspa fecha')
  assert.equal(v.limpar(`key="a" e key="b${BARRA}"c d" fim`), 'key=*** e key=*** fim')
  assert.equal(v.limpar('{"password":"abc","user":"joao"}'), '{"password":***,"user":"joao"}')
  assert.equal(v.limpar(`{${BARRA}"client_secret${BARRA}":${BARRA}"${VALOR}${BARRA}"} depois`), `{${BARRA}"client_secret${BARRA}":***} depois`, 'aberto por \\" fecha em \\"')
  assert.equal(v.limpar(`{${BARRA}"senha${BARRA}":${BARRA}"abc${BARRA}${BARRA}${BARRA}${BARRA}${BARRA}"} depois`), `{${BARRA}"senha${BARRA}":***} depois`, 'barra escapada dentro do JSON: a aspa fecha')
  // Continua em linha reta: abre aspas milhares de vezes, com e sem barra, e nunca volta a ler o que já leu.
  for (const e of ['key="', `key="${BARRA}`, `senha='${BARRA}${BARRA}`, `pass=${BARRA}"${BARRA}${BARRA}`, `token "${BARRA}" `, BARRA, `secret:'`]) {
    for (const max of [200, Infinity]) {
      const t0 = performance.now()
      v.limpar(e.repeat(Math.floor(100000 / e.length)), max)
      assert.ok(performance.now() - t0 < 200, `${e} repetido (max ${max}) levou ${Math.round(performance.now() - t0)} ms`)
    }
  }
})

test('limpar: valor curto não escapa por operador (=>, :=, ===), por vírgula no meio nem em opção de linha de comando', () => {
  const some = [
    // os quatro casos do revisor
    ['db_password => "curta x"', 'db_password => ***'],
    ['password=ab,cdsegredo', 'password=***'],
    ['mysql -uroot -pSegredo1 -h banco', 'mysql -uroot -p*** -h banco'],
    ['curl -u admin:segredo', 'curl -u admin:***'],
    // variações do mesmo furo
    ['password := "curta x" fim', 'password := *** fim'],
    ['if (password === "curta x") sair', 'if (password === ***) sair'],
    ['senha != "curta x" fim', 'senha != *** fim'],
    ['token => abc', 'token => ***'],
    ['password=ab;cdsegredo', 'password=***'],
    ['password=ab,cdEFgh== fim', 'password=*** fim'],
    ["mysql -p'Segredo 1' loja", 'mysql -p*** loja'],
    ['mysqldump -psenhafraca loja', 'mysqldump -p*** loja'],
    ['erro em -pSegredo1 sem cliente', 'erro em -p*** sem cliente'],
    ['curl -u admin:segredo https://exemplo.test/api', 'curl -u admin:*** https://exemplo.test/api'],
    ['curl --user=admin:segredo x', 'curl --user=admin:*** x'],
    ['curl -uadmin:segredo x', 'curl -uadmin:*** x'],
    ['curl --proxy-user "admin:se gredo" x', 'curl --proxy-user "admin:***" x'],
  ]
  for (const [entrada, esperado] of some) {
    for (const prosa of [false, true]) {
      const r = v.limpar(entrada, Infinity, { prosa })
      assert.equal(r, esperado, `${entrada} (prosa ${prosa})`)
      assert.equal(v.limpar(r, Infinity, { prosa }), esperado, `limpar de novo: ${entrada}`)
    }
  }
  // Não mascara a mais: o par seguinte, porta, usuário:grupo, opções que começam por -p e -u sem senha continuam legíveis.
  assert.equal(v.limpar('Server=db;Password=abc;Database=loja'), 'Server=db;Password=***;Database=loja')
  assert.equal(v.limpar('password=abc, user=joao'), 'password=***, user=joao')
  assert.equal(v.limpar('password=abc,user=joao'), 'password=***,user=joao')
  for (const t of ['ssh -p2222 host', 'psql -p5432 loja', 'docker run -p8080:80 -u 1000:1000 img', 'gcc -pthread -pedantic a.c', 'find . -print0', 'ffmpeg -pix_fmt yuv420p',
    'backup -pabcdef feito', 'git push -u origin main', 'sqlmap -u http://exemplo.test/a?b=1']) assert.equal(v.limpar(t), t)
  // Senha só de números não escapa: no mysql a porta é -P, e número:número só é usuário:grupo com docker e parecidos.
  assert.equal(v.limpar('mysql -p1234'), 'mysql -p***')
  assert.equal(v.limpar('mysqldump -p000000 loja'), 'mysqldump -p*** loja')
  assert.equal(v.limpar('curl -u 123:4567'), 'curl -u 123:***')
  assert.equal(v.limpar('curl --user=123:4567'), 'curl --user=123:***')
  assert.equal(v.limpar('curl --user 123:4567 https://exemplo.test'), 'curl --user 123:*** https://exemplo.test')
  assert.equal(v.limpar('wget --proxy-user=1:2'), 'wget --proxy-user=1:***')
  for (const t of ['podman run --user=1000:1000 img', 'kubectl exec -u 0:0 pod', 'sudo docker run -u 0:0 img']) assert.equal(v.limpar(t), t)
  // A palavra "docker" num endereço ou junto de cliente de rede não libera o par; com mysql, -p8080:80 é senha.
  assert.equal(v.limpar('curl -u 123:4567 https://docker.example.test'), 'curl -u 123:*** https://docker.example.test')
  assert.equal(v.limpar('docker exec api curl -u 123:4567 servico'), 'docker exec api curl -u 123:*** servico')
  assert.equal(v.limpar('erro em /opt/docker/run: wget --user=1:2'), 'erro em /opt/docker/run: wget --user=1:***')
  assert.equal(v.limpar('mysql -p8080:80'), 'mysql -p***')
  assert.equal(v.limpar('docker exec db mysql -p3306:3306'), 'docker exec db mysql -p***')
  // Continua em linha reta.
  for (const e of ['password=a,', 'password=a,b', 'password=a;b=c;', 'key=,,,,', '-u a:b ', '-u "a:', '-pA1 ', 'mysql -pa ', 'senha => ', 'senha !== ']) {
    for (const max of [200, Infinity]) {
      const t0 = performance.now()
      v.limpar(e.repeat(Math.floor(100000 / e.length)), max)
      assert.ok(performance.now() - t0 < 200, `${e} repetido (max ${max}) levou ${Math.round(performance.now() - t0)} ms`)
    }
  }
})

test('aspa escapada no erro da ferramenta: nada do valor aparece no terminal, no .md nem no .json', () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const erro = `erro de conexao password="inicio${BARRA}" ${FINAL}" e senha='comeco${BARRA}' ${FINAL}'`
  const { r, saida } = rodarCli(falsos, { FAKE_FALHA: 'osv-scanner:127', FAKE_STDERR: erro })
  assert.equal(r.status, 2, r.stdout + r.stderr)
  const todas = [r.stdout, r.stderr, fs.readFileSync(path.join(saida, 'relatorio-seguranca.md'), 'utf8'), fs.readFileSync(path.join(saida, 'relatorio-seguranca.json'), 'utf8')]
  assert.match(todas[0], /erro de conexao password=\*\*\*/, 'o erro da ferramenta chegou ao terminal, mascarado')
  for (const t of todas) for (const x of [FINAL, 'inicio', 'comeco']) assert.ok(!t.includes(x), `vazou ${x}: ${t.slice(0, 300)}`)
})

test('verificações próprias com leitura cortada: o aviso aparece no resultado e no relatório', async () => {
  const falsos = criarFalsos(['gitleaks', 'osv-scanner'])
  const duble = async () => Object.assign([], { avisos: ['leitura cortada: o projeto tem mais de 20000 arquivos de código; só os 20000 primeiros arquivos foram conferidos'] })
  const res = await v.varrer(tmp('corte'), { env: envFalso(falsos, 'limpo'), verificar: duble })
  assert.ok(res.faltaram.some((x) => x.ferramenta === 'verificações próprias' && /leitura cortada/.test(x.motivo) && !x.obrigatoria), JSON.stringify(res.faltaram))
  assert.match(v.relatorioMd(res), /leitura cortada/)
  assert.ok(res.rodaram.includes('verificações próprias'))
})

// Parte 10 do plano de segurança: roteiro de auditoria de projeto real (só lê e relata).
test('skill auditoria-projeto existe, cabe no limite e mantém as regras que importam', async () => {
  const fsx = await import('node:fs')
  const { fileURLToPath: paraCaminho } = await import('node:url')
  const arq = paraCaminho(new URL('../../plugins/seguranca/skills/auditoria-projeto/SKILL.md', import.meta.url))
  const texto = fsx.readFileSync(arq, 'utf8')
  assert.match(texto, /^---\r?\nname: auditoria-projeto\r?\ndescription: .{60,500}\r?\n---/)
  assert.ok(texto.split(/\r?\n/).length <= 91, 'auditoria-projeto passou de 90 linhas')
  const plano = texto.replace(/\s+/g, ' ')
  for (const frase of ['Não altera o projeto', 'relatório', '2ª passada', 'sem ver o relatório da 1ª', 'pendente de prova',
    'security-auditor', 'model: "opus"', 'portao-seguranca.md', 'varredura-seguranca', 'git status --porcelain',
    'Segredo sempre mascarado', 'trocar a chave', 'Não conecte'])
    assert.ok(plano.includes(frase), `auditoria-projeto não contém: ${frase}`)
})

test('sem osv-scanner, o npm audit confere também o lockfile de subpasta e aponta o arquivo certo', async () => {
  const falsos = criarFalsos(['gitleaks', 'npm'])
  const pasta = tmp('npmsub')
  fs.mkdirSync(path.join(pasta, 'web'))
  fs.writeFileSync(path.join(pasta, 'web', 'package-lock.json'), '{}')
  const res = await v.varrer(pasta, { env: envFalso(falsos, 'achado'), verificar: dubleVazio })
  assert.ok(res.rodaram.includes('npm audit web/package-lock.json (reserva)'), `rodaram: ${res.rodaram.join(', ')}`)
  const doNpm = res.achados.filter((a) => a.ferramenta === 'npm audit')
  assert.ok(doNpm.length > 0, 'npm audit da subpasta não trouxe achado')
  assert.ok(doNpm.every((a) => a.arquivo === 'web/package-lock.json'), 'arquivo do achado não é o lockfile da subpasta')
})
