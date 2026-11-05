// Mede todos os sites da prova e os pilotos: Lighthouse (celular e computador) + rolagem (medir-rolagem.mjs).
// Uso (de uma pasta com puppeteer-core): node medir-todos.mjs <saida> nome=url [nome=url ...]
// Grava <saida>/<nome>-*.json e <saida>/resumo.md. LIGHTHOUSE_CLI aponta para lighthouse/cli/index.js 13.6.0.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const [saida, ...pares] = process.argv.slice(2)
if (!saida || !pares.length) { console.log('Uso: node medir-todos.mjs <saida> nome=url [...]'); process.exit(1) }
fs.mkdirSync(saida, { recursive: true })
const aqui = path.dirname(fileURLToPath(import.meta.url))
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(fs.existsSync)
const lighthouse = process.env.LIGHTHOUSE_CLI
if (!lighthouse || !fs.existsSync(lighthouse)) throw Error('Defina LIGHTHOUSE_CLI para a CLI local do Lighthouse 13.6.0')
const versao = JSON.parse(fs.readFileSync(path.resolve(path.dirname(lighthouse), '../package.json'), 'utf8')).version
if (versao !== '13.6.0') throw Error(`Lighthouse diverge da versão fixada: ${versao}`)
const linhas = []
let falhas = 0
for (const par of pares) {
  const [nome, url] = par.split('=')
  const lh = {}
  for (const modo of ['celular', 'computador']) {
    const arquivo = path.join(saida, `${nome}-lighthouse-${modo}.json`)
    try {
      execFileSync(process.execPath, [lighthouse, url, '--quiet', '--only-categories=performance',
        '--output=json', `--output-path=${arquivo}`, '--chrome-flags=--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader',
        ...(modo === 'computador' ? ['--preset=desktop'] : [])],
      { stdio: 'ignore', timeout: 240000, env: { ...process.env, CHROME_PATH: chrome } })
      const r = JSON.parse(fs.readFileSync(arquivo, 'utf8'))
      const a = r.audits
      lh[modo] = { nota: Math.round(r.categories.performance.score * 100), lcp: Math.round(a['largest-contentful-paint'].numericValue),
        tbt: Math.round(a['total-blocking-time'].numericValue), cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
        kb: Math.round(a['total-byte-weight'].numericValue / 1024) }
      // Preservar a evidência completa antes de gerar o resumo legível.
      fs.copyFileSync(arquivo, arquivo.replace(/\.json$/, '-completo.json'))
      fs.writeFileSync(arquivo, JSON.stringify(lh[modo], null, 2))
    } catch (e) { falhas++; lh[modo] = { erro: String(e.message).slice(0, 120) }; fs.writeFileSync(arquivo, JSON.stringify(lh[modo], null, 2)) }
  }
  const rolagem = {}
  for (const modo of ['celular', 'computador']) {
    const arquivo = path.join(saida, `${nome}-rolagem-${modo}.json`)
    try {
      execFileSync(process.execPath, [path.join(aqui, 'medir-rolagem.mjs'), url, arquivo, ...(modo === 'celular' ? ['--celular'] : [])],
        { stdio: 'ignore', timeout: 180000 })
      rolagem[modo] = JSON.parse(fs.readFileSync(arquivo, 'utf8'))
    } catch (e) { falhas++; rolagem[modo] = { erro: String(e.message).slice(0, 120) } }
  }
  const c = lh.celular, d = lh.computador, rc = rolagem.celular, rd = rolagem.computador
  linhas.push(`| ${nome} | ${c.nota ?? '–'} | ${d.nota ?? '–'} | ${c.lcp ?? '–'} | ${c.tbt ?? '–'} | ${c.cls ?? '–'} | ${c.kb ?? '–'} | ${rc.baixadoKB ?? '–'} | ${rc.cls ?? '–'} | ${rc.quadroP95ms ?? '–'} | ${rc.lentos33 ?? '–'}% | ${rc.travadas100 ?? '–'} |`)
  console.log(nome, JSON.stringify({ lh, fps: [rd.fpsMedio, rc.fpsMedio] }))
}
fs.writeFileSync(path.join(saida, 'resumo.md'), [
  '| Site | Nota celular | Nota computador | LCP celular (ms) | TBT celular (ms) | CLS carga | Peso carga (KB) | Peso após rolar tudo (KB) | Soma de deslocamentos na rolagem | Intervalo RAF P95 (ms) | Intervalos > 33 ms | > 100 ms |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|', ...linhas, '',
  'Lighthouse 13.6.0 (celular simulado: 4G lento e CPU 4×; computador: preset desktop). Rolagem: Chrome headless com',
  'WebGL por software (SwiftShader), do topo ao fim em 14 s, celular com CPU 4×. Mede intervalos de requestAnimationFrame (sem vsync),',
  'não quadros apresentados na tela: serve para comparar páginas entre si; fluidez real só em aparelho físico.',
  'A soma de deslocamentos não usa janelas de sessão. O JSON novo inclui clsJanela (janelas de 1s/5s) e tarefas longas.',
].join('\n') + '\n')
process.exitCode = falhas ? 1 : 0
