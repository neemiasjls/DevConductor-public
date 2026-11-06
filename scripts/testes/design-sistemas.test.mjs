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
