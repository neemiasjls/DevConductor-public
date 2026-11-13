// Gera os vídeos de venda da prova marcenaria-aroeira com o script do kit (a prova é só lida).
// Uso: node gerar.mjs [celular|cortes|destaques|todos] [--so-checar]
// A empresa é fictícia: nome, telefone e cidade não são reais.
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const kit = path.join(aqui, '..', '..', 'plugins', 'landing-pages', 'skills', 'lp-video', 'scripts', 'video-de-venda.mjs')
const { executar } = await import(pathToFileURL(kit).href)

const [modelo = 'todos', ...resto] = process.argv.slice(2)
const codigo = await executar([
  path.join(aqui, '..', 'prova-referencia', 'marcenaria-aroeira', 'dist'),
  '--saida', path.join(aqui, 'videos'),
  '--modelo', modelo,
  '--nome', 'Aroeira',
  '--sub', 'Marcenaria · Marília',
  '--chamada', 'Seu próximo móvel começa aqui',
  '--botao', 'Pedir orçamento',
  '--contato', 'WhatsApp (00) 00000-0000',
  '--aviso', 'Demonstração de design: empresa e dados fictícios.',
  '--secao', '#inicio=Início',
  '--secao', '#oficio=O ofício',
  '--secao', '#ambientes=Ambientes',
  '--secao', '#processo=Como trabalhamos',
  '--secao', '#sobre=Quem faz',
  ...resto,
])
process.exit(codigo)
