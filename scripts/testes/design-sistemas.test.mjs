import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const plugin = path.join(raiz, 'plugins/design-sistemas')
const detector = path.join(raiz, 'plugins/devconductor-core/hooks/detectar-stack.mjs')
const CONSULTORAS = ['dashboard-design', 'baseline-ui', 'fixing-accessibility', 'improve-ui', 'create-design-md']
const ler = (f) => fs.readFileSync(f, 'utf8')

test('detecção liga design-sistemas em React com cara de sistema, e não em landing page', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-sistemas-'))
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))
  const simular = () => spawnSync(process.execPath, [detector, '--projeto', temp, '--dry-run'], { encoding: 'utf8' }).stdout
  const pacote = (deps) => fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ dependencies: deps }))

  pacote({ react: '^19.0.0', gsap: '^3.13.0' })
  assert.doesNotMatch(simular(), /design-sistemas/)
  pacote({ react: '^19.0.0', 'react-hook-form': '^7.0.0' })
  assert.match(simular(), /design-sistemas@devconductor/)
  pacote({ next: '^16.0.0', '@supabase/supabase-js': '^2.0.0' })
  assert.match(simular(), /design-sistemas@devconductor/)

  fs.mkdirSync(path.join(temp, 'clientes'))
  assert.doesNotMatch(simular(), /design-sistemas/)
  fs.rmSync(path.join(temp, 'clientes'), { recursive: true })

  pacote({})
  fs.writeFileSync(path.join(temp, '.design-sistemas'), '')
  assert.match(simular(), /design-sistemas@devconductor/)
  fs.mkdirSync(path.join(temp, '.claude'))
  fs.writeFileSync(path.join(temp, '.claude/settings.local.json'),
    JSON.stringify({ enabledPlugins: { 'design-sistemas@devconductor': false, 'stack-typescript@devconductor': true } }))
  assert.equal(simular(), '')
})

test('detecção liga design-sistemas com Blazor (.razor ou pacote Components), e não em API nem landing page', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-blazor-'))
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))
  const simular = () => spawnSync(process.execPath, [detector, '--projeto', temp, '--dry-run'], { encoding: 'utf8' }).stdout
  const csproj = (pacote) => fs.writeFileSync(path.join(temp, 'App.csproj'),
    `<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup><PackageReference Include="${pacote}" Version="9.0.0" /></ItemGroup></Project>`)
  csproj('Swashbuckle.AspNetCore')
  assert.doesNotMatch(simular(), /design-sistemas/)
  csproj('Microsoft.AspNetCore.Components.Web')
  assert.match(simular(), /design-sistemas@devconductor/)
  csproj('Swashbuckle.AspNetCore')
  fs.mkdirSync(path.join(temp, 'Pages'))
  fs.writeFileSync(path.join(temp, 'Pages', 'Clientes.razor'), '@page "/clientes"\n<h1>Clientes</h1>\n')
  assert.match(simular(), /design-sistemas@devconductor/)
  fs.mkdirSync(path.join(temp, 'clientes'))
  assert.doesNotMatch(simular(), /design-sistemas/)
})

// Parte 5: percurso inteiro, de um pedido de sistema numa pasta vazia até a resposta da conferência
test('percurso: pedido de sistema em pasta vazia -> ui-sistemas -> comandos do bloco Telas rodam no projeto', (t) => {
  const skillDir = path.join(plugin, 'skills', 'ui-sistemas')
  const descricao = ler(path.join(skillDir, 'SKILL.md')).match(/^description: (.*)$/m)[1]
  for (const c of ['qualquer stack', 'projeto novo', 'sistema', 'painel', 'cadastro', 'área logada']) assert.ok(descricao.includes(c), `description sem: ${c}`)
  const fluxo = ler(path.join(raiz, 'plugins/devconductor-core/skills/orquestrador/referencias/fluxo-sistema.md'))
  const plano = fluxo.replace(/\s+/g, ' ')
  for (const c of ['design-sistemas:ui-sistemas', 'consistencia.mjs', 'conferir-tela.mjs', 'não conferido', 'NÃO entregue']) assert.ok(plano.includes(c), `fluxo sem: ${c}`)

  // pasta vazia: o detector não liga nada (a skill vem pelo pedido, pela description)
  const projeto = fs.mkdtempSync(path.join(os.tmpdir(), 'devagents-percurso-'))
  t.after(() => fs.rmSync(projeto, { recursive: true, force: true }))
  assert.doesNotMatch(spawnSync(process.execPath, [detector, '--projeto', projeto, '--dry-run'], { encoding: 'utf8' }).stdout, /design-sistemas/)

  // comandos tirados do próprio fluxo, com a pasta da skill resolvida, rodados a partir da pasta do projeto
  const comandos = [...fluxo.matchAll(/`node <pasta da ui-sistemas>\/scripts\/([\w-]+\.mjs)([^`]*)`/g)]
    .map(([, script, resto]) => ({ script, args: resto.trim().split(/\s+/).map((a) => a === '<url>' ? 'http://127.0.0.1:9' : a) }))
  assert.deepEqual(comandos.map((c) => c.script), ['consistencia.mjs', 'conferir-tela.mjs'])
  const rodar = ({ script, args }, { exe = path.join(skillDir, 'scripts', script), env = {} } = {}) => {
    const r = spawnSync(process.execPath, [exe, ...args, '--json'], { encoding: 'utf8', cwd: projeto, env: { ...process.env, ...env } })
    return { saida: r.status, ...JSON.parse(r.stdout || '{}') }
  }

  // projeto com configuração, peças e telas limpas: a conferência do código dá 0
  const dados = path.join(raiz, 'scripts/testes/dados/consistencia')
  const cfg = JSON.parse(ler(path.join(dados, 'design-sistemas.json')))
  delete cfg.excecoes
  cfg.telas = { clientes: '/clientes' } // o 2 do navegador tem de vir do Chrome/landing-pages, não da falta de telas
  fs.writeFileSync(path.join(projeto, 'design-sistemas.json'), JSON.stringify(cfg, null, 2))
  fs.cpSync(path.join(dados, 'pecas'), path.join(projeto, 'pecas'), { recursive: true })
  fs.cpSync(path.join(dados, 'casos', 'limpo'), path.join(projeto, 'src', 'telas'), { recursive: true })
  assert.equal(rodar(comandos[0]).saida, 0)
  // defeito "nunca passa" plantado: dá 1, e o fluxo manda não entregar
  fs.writeFileSync(path.join(projeto, 'src', 'telas', 'Foco.tsx'), 'export function Foco () {\n  return <a href="/x" className="text-sm outline-none">Abrir</a>\n}\n')
  const comDefeito = rodar(comandos[0])
  assert.equal(comDefeito.saida, 1)
  assert.ok(comDefeito.achados.some((a) => a.regra === 'foco-substituto'))
  assert.match(plano, /Saída 1: corrija e rode de novo; NÃO entregue/)

  // sem Chrome: "não conferido" (2), nunca "passou"
  const semChrome = rodar(comandos[1], { env: { BROWSER_EXECUTABLE: path.join(projeto, 'nao-existe.exe') } })
  assert.equal(semChrome.saida, 2)
  assert.ok(semChrome.naoConferido.some((n) => /Chrome|landing-pages/.test(n.motivo)), JSON.stringify(semChrome.naoConferido))
  // instalado sem o plugin landing-pages ao lado (cache/<marketplace>/<plugin>/<versão>): também 2
  const instalado = path.join(projeto, '..', path.basename(projeto) + '-cache', 'devconductor', 'design-sistemas', '9.9.9')
  t.after(() => fs.rmSync(path.join(instalado, '..', '..', '..'), { recursive: true, force: true }))
  fs.cpSync(plugin, instalado, { recursive: true })
  const semLp = rodar(comandos[1], { exe: path.join(instalado, 'skills', 'ui-sistemas', 'scripts', 'conferir-tela.mjs') })
  assert.equal(semLp.saida, 2)
  assert.ok(semLp.naoConferido.some((n) => /landing-pages/.test(n.motivo)), JSON.stringify(semLp.naoConferido))
})

test('consultoras travadas, com licença e origem registrada; dona destravada', () => {
  const fontes = JSON.parse(ler(path.join(raiz, 'fontes.json')))
  for (const nome of CONSULTORAS) {
    const pasta = path.join(plugin, 'skills', nome)
    assert.match(ler(path.join(pasta, 'SKILL.md')), /^---\r?\ndisable-model-invocation: true\r?\n/, nome)
    assert(fs.existsSync(path.join(pasta, 'LICENSE')), nome)
    const entrada = fontes.arquivos.find((a) => a.destino === `plugins/design-sistemas/skills/${nome}`)
    assert(entrada && /^[0-9a-f]{40}$/.test(entrada.commit) && entrada.licenca === 'MIT' && fontes.origens[entrada.origem], nome)
  }
  const dona = ler(path.join(plugin, 'skills/ui-sistemas/SKILL.md'))
  assert.doesNotMatch(dona, /disable-model-invocation/)
  for (const nome of CONSULTORAS) assert.match(dona, new RegExp('`' + nome + '`'), nome)
  for (const arquivo of ['design-md.md', 'modelos/br.ts']) assert(fs.existsSync(path.join(plugin, 'skills/ui-sistemas', arquivo)), arquivo)
})

test('cópias sem o que foi retirado: SwiftUI, assinatura promocional e comando que não roda no Windows', () => {
  const arquivos = fs.readdirSync(path.join(plugin, 'skills'), { recursive: true }).filter((f) => String(f).endsWith('.md'))
  for (const f of arquivos) {
    const texto = ler(path.join(plugin, 'skills', String(f)))
    assert(!/swiftui\.md|\?ref=|## Sign-off/.test(texto), `${f}: trecho retirado voltou`)
    assert(!/npx @google\/design\.md /.test(texto), `${f}: use npx -y -p @google/design.md designmd`)
  }
})

test('modelo de DESIGN.md segue o formato: cor e referência entre aspas, tipografia só com campos do formato', () => {
  const modelo = ler(path.join(plugin, 'skills/ui-sistemas/design-md.md'))
  const yaml = /```markdown\n---\n([\s\S]*?)\n---\n/.exec(modelo.replace(/\r\n/g, '\n'))?.[1]
  assert(yaml, 'exemplo com cabeçalho YAML')
  assert.match(yaml, /^version: alpha$/m)
  assert.match(yaml, /^name: \S/m)
  assert.doesNotMatch(yaml, /:\s+#[0-9a-f]/i, 'cor sem aspas vira comentário no YAML')
  assert.doesNotMatch(yaml, /:\s+\{/, 'referência sem aspas vira objeto no YAML')
  const tipografia = /^typography:\n((?: {2}.*\n)+)/m.exec(yaml + '\n')[1]
  for (const campo of tipografia.matchAll(/^ {4}(\w+):/gm)) {
    assert(['fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'fontFeature', 'fontVariation'].includes(campo[1]), campo[1])
  }
})

test('ui-sistemas mede a tela pela tarefa e não esconde explicação só em tooltip', () => {
  const s = ler(path.join(plugin, 'skills/ui-sistemas/SKILL.md'))
  assert.match(s, /3 tarefas mais comuns/)
  assert.match(s, /só com\s+teclado/)
  assert.match(s, /tabela de comparar colunas/)
  assert.match(s, /não fica só em tooltip/)
})

// Validador mínimo de JSON Schema (só o que o esquema-config.json usa), sem dependência nova.
function validar (esquema, dado, raizEsquema = esquema, onde = '$') {
  if (esquema.$ref) return validar(raizEsquema.$defs[esquema.$ref.replace('#/$defs/', '')], dado, raizEsquema, onde)
  const erros = []
  const tipo = Array.isArray(dado) ? 'array' : Number.isInteger(dado) ? 'integer' : typeof dado
  if (esquema.type && !(esquema.type === tipo || (esquema.type === 'number' && tipo === 'integer'))) return [`${onde}: tipo ${tipo}, esperado ${esquema.type}`]
  if (esquema.enum && !esquema.enum.includes(dado)) erros.push(`${onde}: valor fora de ${JSON.stringify(esquema.enum)}`)
  if (esquema.anyOf && esquema.anyOf.every((s) => validar(s, dado, raizEsquema, onde).length)) erros.push(`${onde}: nenhuma forma aceita`)
  if (typeof dado === 'string') {
    if (esquema.minLength && dado.length < esquema.minLength) erros.push(`${onde}: vazio`)
    if (esquema.pattern && !new RegExp(esquema.pattern, 'u').test(dado)) erros.push(`${onde}: "${dado}" fora do padrão`)
  }
  if (typeof dado === 'number' && esquema.minimum !== undefined && dado < esquema.minimum) erros.push(`${onde}: abaixo de ${esquema.minimum}`)
  if (Array.isArray(dado)) {
    if (esquema.minItems && dado.length < esquema.minItems) erros.push(`${onde}: itens de menos`)
    if (esquema.items) dado.forEach((d, i) => erros.push(...validar(esquema.items, d, raizEsquema, `${onde}[${i}]`)))
  }
  if (tipo === 'object') {
    const chaves = Object.keys(dado)
    for (const r of esquema.required || []) if (!(r in dado)) erros.push(`${onde}: falta ${r}`)
    if (esquema.minProperties && chaves.length < esquema.minProperties) erros.push(`${onde}: campos de menos`)
    if (esquema.maxProperties && chaves.length > esquema.maxProperties) erros.push(`${onde}: campos demais`)
    for (const c of chaves) {
      if (esquema.propertyNames) erros.push(...validar(esquema.propertyNames, c, raizEsquema, `${onde}.${c} (nome)`))
      if (esquema.properties?.[c]) erros.push(...validar(esquema.properties[c], dado[c], raizEsquema, `${onde}.${c}`))
      else if (esquema.additionalProperties === false) erros.push(`${onde}: campo desconhecido ${c}`)
      else if (typeof esquema.additionalProperties === 'object') erros.push(...validar(esquema.additionalProperties, dado[c], raizEsquema, `${onde}.${c}`))
    }
  }
  return erros
}

test('configuração design-sistemas.json: exemplo valida; exceção sem motivo, peça como pasta e campo desconhecido reprovam', () => {
  const pasta = path.join(plugin, 'skills/ui-sistemas')
  const esquema = JSON.parse(ler(path.join(pasta, 'esquema-config.json')))
  const exemplo = JSON.parse(ler(path.join(pasta, 'modelos/design-sistemas.json')))
  assert.deepEqual(validar(esquema, exemplo), [])
  const copia = () => structuredClone(exemplo)

  for (const motivo of [undefined, '', '   ']) {
    const c = copia()
    c.excecoes = [{ regra: 'cor-token', arquivo: 'src/telas/rotas.tsx', local: 12, ...(motivo === undefined ? {} : { motivo }) }]
    assert.notDeepEqual(validar(esquema, c), [], `exceção com motivo ${JSON.stringify(motivo)} passou`)
  }
  for (const campo of ['regra', 'arquivo', 'local']) {
    const c = copia()
    delete c.excecoes[0][campo]
    assert.notDeepEqual(validar(esquema, c), [], `exceção sem ${campo} passou`)
  }
  for (const pastaPeca of ['src/components/ui', 'src/components/ui/', 'src/components/ui/*.tsx']) {
    const c = copia()
    c.pecas.botao = pastaPeca
    assert.notDeepEqual(validar(esquema, c), [], `peça como pasta passou: ${pastaPeca}`)
    c.pecas.botao = ['src/components/ui/button.tsx', pastaPeca]
    assert.notDeepEqual(validar(esquema, c), [], `peça como pasta passou na lista: ${pastaPeca}`)
  }
  const desconhecido = copia()
  desconhecido.temaEscuro = true
  assert.notDeepEqual(validar(esquema, desconhecido), [])
  // exceção do navegador pode delimitar estado e aparelho; aparelho fora da lista e estado fora do padrão reprovam
  const delimitada = copia()
  delimitada.excecoes = [{ regra: 'letra-minima', arquivo: 'pedidos', local: '#nota-legal', motivo: 'nota legal', estado: 'vazio', aparelho: 'celular' }]
  assert.deepEqual(validar(esquema, delimitada), [])
  for (const [campo, valor] of [['aparelho', 'tablet'], ['estado', 'Vazio'], ['estado', '']]) {
    const c = structuredClone(delimitada)
    c.excecoes[0][campo] = valor
    assert.notDeepEqual(validar(esquema, c), [], `exceção com ${campo} ${JSON.stringify(valor)} passou`)
  }
  const seisTamanhos = copia()
  seisTamanhos.letra.tamanhos.enorme = 'text-2xl'
  assert.notDeepEqual(validar(esquema, seisTamanhos), [], 'escala com 6 tamanhos passou')
  const letraPequena = copia()
  letraPequena.letra.minimoPx = 11
  assert.notDeepEqual(validar(esquema, letraPequena), [])
  const negocioSemMotivo = copia()
  negocioSemMotivo.cores.negocio = [{ nome: 'x', valor: 'red-600', motivo: '' }]
  assert.notDeepEqual(validar(esquema, negocioSemMotivo), [])
})

test('régua de telas: cada id aparece uma vez, com nível válido; skill aponta régua e configuração', () => {
  const pasta = path.join(plugin, 'skills/ui-sistemas')
  const regua = ler(path.join(pasta, 'referencias/regua-telas.md'))
  const linhas = [...regua.matchAll(/^\| `([a-z0-9-]+)` \|([^|]*)\|/gm)]
  assert(linhas.length >= 20, 'régua com poucos critérios')
  const ids = linhas.map((l) => l[1])
  assert.equal(new Set(ids).size, ids.length, `id repetido: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`)
  for (const id of ids) assert.equal(regua.split('`' + id + '`').length - 1, 1, `${id} aparece mais de uma vez`)
  const maquina = regua.slice(0, regua.indexOf('## Critérios do olho'))
  for (const [, id, nivel] of maquina.matchAll(/^\| `([a-z0-9-]+)` \|([^|]*)\|/gm)) {
    assert(['nunca passa', 'exige justificativa', 'aviso'].includes(nivel.trim()), `${id}: nível "${nivel.trim()}"`)
  }
  const nivelDe = Object.fromEntries([...maquina.matchAll(/^\| `([a-z0-9-]+)` \|([^|]*)\|/gm)].map(([, id, n]) => [id, n.trim()]))
  for (const id of ['foco-substituto', 'contraste', 'nome-acessivel', 'estado-confirmado', 'foco-visivel']) {
    assert.equal(nivelDe[id], 'nunca passa', id)
  }
  for (const papel of ['operador', 'clareza', 'celular', 'acesso-visual', 'coerencia']) assert(ids.includes(papel), papel)

  const skill = ler(path.join(pasta, 'SKILL.md'))
  for (const ref of ['referencias/regua-telas.md', 'esquema-config.json', 'modelos/design-sistemas.json', 'design-sistemas.json']) {
    assert(skill.includes(ref), `skill não aponta ${ref}`)
  }
  assert.match(skill, /text-\[Npx\]/)
  assert.match(skill, /outline-none/)
  assert.match(ler(path.join(pasta, 'design-md.md')), /design-sistemas\.json/)
})
