// Conferência de acabamento de uma landing page: sete defeitos que o olho acha e os portões de número deixavam passar.
// Roda no Chrome/Edge pelo protocolo DevTools, reaproveitando o motor do celular.mjs (sem dependência).
// Uso: node acabamento.mjs <url|arquivo.html> [pasta-saida] [--larguras 1440,390] [--json]
//   --larguras  telas a conferir (padrão 1440,390). Abaixo de 1024 px a tela é de celular (toque, densidade 2).
//   --json      imprime o JSON em vez do resumo; com pasta-saida grava acabamento.json e resumo.txt
// Níveis: "nunca passa" (reprova), "exige justificativa" (passa só com motivo escrito) e "aviso".
//   1 Fixo sobre conteúdo (nunca passa): elemento fixed/sticky que cobre texto ou 10% ou mais de uma imagem em alguma
//     posição da rolagem (passos de meia tela). Barra de 95% da largura encostada em cima ou embaixo é moldura, se
//     tiver até 25% da altura da tela; painel fixo que cobre a tela não é moldura e reprova.
//   2 Linhas de título colidindo (nunca passa): h1 a h3 e textos em caixa alta com 2+ linhas; entrelinha efetiva
//     (distância entre as linhas ÷ tamanho da letra) abaixo de 1,15 com ÁÀÂÃÉÊÍÓÔÕÚÇQ, ou abaixo de 1,0 sempre.
//   3 Órfã (exige justificativa): última linha de título ou parágrafo com uma palavra só ou menos de 20% da linha
//     mais larga. Título empilhado de propósito (a linha de cima também tem uma palavra só) fica de fora, e também o
//     que não é texto corrido: bloco com menos de 4 palavras no total ou sem letras (contador "2 / 6"), e a última
//     linha sem letra nenhuma ("2 / 6" no fim de um parágrafo).
//   4 Imagem ampliada ou esticada (nunca passa acima de 1,5×; aviso de 1,1× a 1,5×; esticada nunca passa): tamanho
//     desenhado na tela (com transform dos ancestrais) × densidade contra os pontos reais do arquivo, respeitando
//     object-fit e background-size. Imagem que não carregou ou não deu para medir vai para "não medido".
//   5 Cor desigual num grupo de fotos (exige justificativa): 3+ fotos irmãs de lista/grade; o TOM de cada uma (canais
//     a e b do Lab, com os filtros de CSS; a claridade não entra) a mais de 12 da mediana do grupo. Sem acesso aos pontos (outra origem, file://): "não medido".
//   6 Emenda de faixa em laço (nunca passa): animação infinita que anda para o lado numa lista duplicada; uma volta
//     tem de andar um múltiplo exato do período (item + vão), erro menor que 1 px. O andar é medido, não lido do CSS.
//   7 Vão morto (aviso): faixa vertical sem nada maior que 1,8× a mediana dos vãos e que 25% da altura da tela.
// Código de saída: 0 sem achado "nunca passa" · 1 com achado "nunca passa" · 2 erro de uso ou não deu para conferir.
// Limites conhecidos: não vê elemento fixo com pointer-events: none; faixa em laço movida por script (GSAP) não é
// conferida; fundo com background-size auto não é medido; cartões sticky empilhados de propósito podem ser apontados.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { acharNavegador, motorChrome, montarTelas, normalizarUrl } from './celular.mjs'

export const LIMITES = {
  moldura: 0.95, molduraAltura: 0.25, imagemCoberta: 0.10, pontosTexto: 2,
  entrelinhaAcento: 1.15, entrelinha: 1.0,
  orfa: 0.20, orfaPalavras: 4,
  ampliadaAviso: 1.1, ampliadaNunca: 1.5, proporcao: 0.03,
  cor: 12, grupoFotos: 3,
  emenda: 1,
  vaoMediana: 1.8, vaoTela: 0.25, vaoMinimo: 24,
}
export const NOMES = {
  1: 'Fixo sobre conteúdo', 2: 'Linhas de título colidindo', 3: 'Órfã', 4: 'Imagem ampliada ou esticada',
  5: 'Cor desigual num grupo de fotos', 6: 'Emenda de faixa em laço', 7: 'Vão morto',
}
const NIVEIS = { 'nunca-passa': 'NUNCA PASSA', justificar: 'EXIGE JUSTIFICATIVA', aviso: 'AVISO' }
const ACENTO = /[ÁÀÂÃÉÊÍÓÔÕÚÇQ]/
const num = (v, casas = 2) => String(Number(v.toFixed(casas))).replace('.', ',')

// ---------------------------------------------------------------------------------------------------------
// Regras (puras: recebem as medidas da página e devolvem achados)
// ---------------------------------------------------------------------------------------------------------
export function ehMoldura(ret, tela) {
  // Só barra: largura quase toda, encostada numa borda e baixa. Painel que cobre a tela não é moldura.
  return ret.w >= LIMITES.moldura * tela.largura && ret.h <= LIMITES.molduraAltura * tela.altura && (ret.y <= 1 || ret.y + ret.h >= tela.altura - 1)
}

export function avaliarFixos(fixos = []) {
  const porElemento = new Map()
  for (const f of fixos) {
    if (ehMoldura(f.ret, { largura: f.vw, altura: f.vh })) continue
    const cobre = f.cobre.filter((c) => (c.tipo === 'texto' ? c.pontos >= LIMITES.pontosTexto : c.fracao >= LIMITES.imagemCoberta))
    if (!cobre.length) continue
    const pior = cobre.reduce((a, b) => (b.area > a.area ? b : a))
    const atual = porElemento.get(f.seletor)
    if (!atual) porElemento.set(f.seletor, { f, pior, vezes: 1 })
    else { atual.vezes++; if (pior.area > atual.pior.area) Object.assign(atual, { f, pior }) }
  }
  return [...porElemento.values()].map(({ f, pior, vezes }) => ({
    n: 1, nivel: 'nunca-passa', seletor: f.seletor, rolagem: f.rolagem,
    medida: (pior.tipo === 'texto' ? `cobre o texto "${pior.trecho}" de ${pior.seletor}` : `cobre ${Math.round(pior.fracao * 100)}% da imagem ${pior.seletor}`) +
      ` (cerca de ${Math.round(pior.area)} px²; ${vezes} de ${f.passos} posições da rolagem)`,
  }))
}

export function entrelinhaEfetiva(linhas, escala = 1) {
  let menor = Infinity
  for (let i = 1; i < linhas.length; i++) menor = Math.min(menor, (linhas[i].base - linhas[i - 1].base) / (escala || 1) / linhas[i].fs)
  return menor
}

export function avaliarTitulos(titulos = []) {
  const achados = []
  for (const t of titulos) {
    if (t.linhas.length < 2) continue
    const e = entrelinhaEfetiva(t.linhas, t.escala)
    const acento = ACENTO.test(t.texto)
    const piso = acento ? LIMITES.entrelinhaAcento : LIMITES.entrelinha
    if (e < piso) achados.push({ n: 2, nivel: 'nunca-passa', seletor: t.seletor, rolagem: t.rolagem,
      medida: `entrelinha ${num(e)} em "${t.trecho}" (${t.linhas.length} linhas; mínimo ${num(piso)}${acento ? ' por ter acento, cedilha ou Q em maiúscula' : ''})` })
  }
  return achados
}

export function avaliarOrfas(blocos = []) {
  const achados = []
  for (const b of blocos) {
    if (b.linhas.length < 2) continue
    // Só texto corrido: rótulo curto e contador ("2 / 6") quebram em duas linhas sem ser defeito.
    const palavras = b.linhas.reduce((s, l) => s + (l.palavras || 0), 0)
    const texto = (b.trecho || '') + b.linhas.map((l) => l.texto || '').join('')
    if (palavras < LIMITES.orfaPalavras || !/\p{L}/u.test(texto)) continue
    const ultima = b.linhas[b.linhas.length - 1], anterior = b.linhas[b.linhas.length - 2]
    // Última linha sem letra (contador "2 / 6", número solto) não é palavra órfã.
    if (!/\p{L}/u.test(ultima.texto || '')) continue
    const maior = Math.max(...b.linhas.map((l) => l.largura))
    const parte = maior ? ultima.largura / maior : 1
    const sozinha = ultima.palavras === 1 && anterior.palavras > 1
    if (!sozinha && parte >= LIMITES.orfa) continue
    achados.push({ n: 3, nivel: 'justificar', seletor: b.seletor, rolagem: b.rolagem,
      medida: `última linha "${ultima.texto}" ${sozinha ? 'com uma palavra só' : 'curta'} (${Math.round(parte * 100)}% da linha mais larga; ${b.linhas.length} linhas) em "${b.trecho}"` })
  }
  return achados
}

// Quanto a imagem foi ampliada na tela (1 = cada ponto do arquivo vira um ponto da tela) e se foi esticada.
export function ampliacaoDe({ tipo, caixa, natural, ajuste, tamanho, dpr = 1 }) {
  if (!natural?.w || !natural?.h || !caixa?.w || !caixa?.h) return null
  let sx = caixa.w / natural.w, sy = caixa.h / natural.h, modo = ajuste || 'fill'
  if (tipo === 'fundo') {
    modo = tamanho
    if (modo !== 'cover' && modo !== 'contain') {
      const [a, b] = String(tamanho).split(/\s+/)
      const px = (v, base) => (/%$/.test(v || '') ? (base * parseFloat(v)) / 100 : /px$/.test(v || '') ? parseFloat(v) : null)
      const w = px(a, caixa.w), h = px(b, caixa.h)
      if (w == null && h == null) return null
      sx = w != null ? w / natural.w : h / natural.h
      sy = h != null ? h / natural.h : sx
      modo = 'fill'
    }
  }
  let s, esticada = false
  if (modo === 'cover') s = Math.max(sx, sy)
  else if (modo === 'contain') s = Math.min(sx, sy)
  else if (modo === 'none') s = 1
  else if (modo === 'scale-down') s = Math.min(1, sx, sy)
  else { s = Math.max(sx, sy); esticada = Math.abs(sx / sy - 1) > LIMITES.proporcao }
  return { ampliacao: s * dpr, esticada, sx, sy }
}

export function avaliarImagens(imagens = []) {
  const achados = [], vistos = new Set()
  for (const m of imagens) {
    const r = ampliacaoDe(m)
    if (!r) continue
    const chave = `${m.seletor}|${m.arquivo}`
    if (vistos.has(chave)) continue
    const tam = `arquivo ${m.arquivo} de ${m.natural.w}×${m.natural.h} em caixa de ${Math.round(m.caixa.w)}×${Math.round(m.caixa.h)}${m.dpr !== 1 ? ` com densidade ${m.dpr}` : ''}`
    if (r.esticada) { vistos.add(chave); achados.push({ n: 4, nivel: 'nunca-passa', seletor: m.seletor, rolagem: m.rolagem, medida: `esticada: proporção ${num(r.sx / r.sy)}× fora da natural (${tam})` }) }
    else if (r.ampliacao > LIMITES.ampliadaAviso) {
      vistos.add(chave)
      achados.push({ n: 4, nivel: r.ampliacao > LIMITES.ampliadaNunca ? 'nunca-passa' : 'aviso', seletor: m.seletor, rolagem: m.rolagem, medida: `ampliada ${num(r.ampliacao)}× (${tam})` })
    }
  }
  return achados
}

// Imagem que não deu para medir (não carregou, caixa sem tamanho, background-size que a conta não cobre) não some:
// vai para "não medido" com o seletor e o motivo.
export function imagensSemMedida(imagens = []) {
  const lista = [], vistos = new Set()
  for (const m of imagens) {
    if (ampliacaoDe(m)) continue
    const chave = `${m.seletor}|${m.arquivo}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    const motivo = !m.natural?.w || !m.natural?.h ? 'a imagem não carregou'
      : !m.caixa?.w || !m.caixa?.h ? 'a caixa na tela não tem tamanho'
        : `tamanho do fundo "${m.tamanho}" não é medido`
    lista.push({ n: 4, seletor: m.seletor, rolagem: m.rolagem, medida: `${m.arquivo}: ${motivo}` })
  }
  return lista
}

export const distanciaLab =(a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
// Só o tom (canais a e b): foto mais clara ou mais escura que as irmãs não é tratamento de cor diferente.
export const distanciaTom = (a, b) => Math.hypot(a[1] - b[1], a[2] - b[2])

export function avaliarCor(grupos = []) {
  const achados = [], naoMedido = []
  for (const g of grupos) {
    // A mesma foto repetida (lista duplicada de uma faixa em laço) conta uma vez.
    const fotos = g.fotos.filter((f, i) => g.fotos.findIndex((o) => (o.chave ?? o.arquivo) === (f.chave ?? f.arquivo)) === i)
    const medidas = fotos.filter((f) => f.lab)
    for (const f of fotos) if (!f.lab) naoMedido.push({ n: 5, seletor: f.seletor, rolagem: g.rolagem, medida: `${f.arquivo}: ${f.motivo} (grupo ${g.seletor})` })
    if (medidas.length < LIMITES.grupoFotos) continue
    // Mediana por canal: uma foto muito diferente não puxa o centro do grupo para o lado dela.
    const centro = [0, 1, 2].map((i) => mediana(medidas.map((f) => f.lab[i])))
    const fora = medidas.map((f) => ({ f, d: distanciaTom(f.lab, centro) })).filter((x) => x.d > LIMITES.cor).sort((a, b) => b.d - a.d)
    if (fora.length) achados.push({ n: 5, nivel: 'justificar', seletor: g.seletor, rolagem: g.rolagem,
      medida: `${fora.length} de ${medidas.length} fotos longe do tom do grupo (mediana; limite ${LIMITES.cor}): ${fora.map((x) => `${x.f.arquivo} ${num(x.d, 1)}`).join(', ')}` })
  }
  return { achados, naoMedido }
}

export function erroDaEmenda(deslocamento, periodo) {
  if (!(periodo > 0)) return null
  const voltas = Math.max(1, Math.round(deslocamento / periodo))
  return Math.abs(deslocamento - voltas * periodo)
}

export function avaliarLacos(lacos = []) {
  const achados = []
  for (const l of lacos) {
    const erro = erroDaEmenda(l.deslocamento, l.periodo)
    if (erro == null || erro < LIMITES.emenda) continue
    achados.push({ n: 6, nivel: 'nunca-passa', seletor: l.seletor, rolagem: l.rolagem,
      medida: `salto de ${num(erro, 1)} px na emenda: uma volta anda ${num(l.deslocamento, 1)} px e a lista repete a cada ${num(l.periodo, 1)} px` })
  }
  return achados
}

export function mediana(valores) {
  const v = [...valores].sort((a, b) => a - b)
  return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : 0
}

export function avaliarVaos(vaos = [], alturaTela) {
  const validos = vaos.filter((v) => v.tamanho >= LIMITES.vaoMinimo)
  const med = mediana(validos.map((v) => v.tamanho))
  return validos.filter((v) => v.tamanho > LIMITES.vaoMediana * med && v.tamanho > LIMITES.vaoTela * alturaTela).map((v) => ({
    n: 7, nivel: 'aviso', seletor: v.depois, rolagem: Math.round(v.y),
    medida: `${Math.round(v.tamanho)} px vazios entre ${v.antes} e ${v.depois} (${Math.round((v.tamanho / alturaTela) * 100)}% da tela; mediana dos vãos ${Math.round(med)} px)`,
  }))
}

export function avaliarTudo(m) {
  const cor = avaliarCor(m.grupos)
  const achados = [...avaliarFixos(m.fixos), ...avaliarTitulos(m.titulos), ...avaliarOrfas(m.blocos), ...avaliarImagens(m.imagens),
    ...cor.achados, ...avaliarLacos(m.lacos), ...avaliarVaos(m.vaos, m.vh)]
  const naoMedido = [...imagensSemMedida(m.imagens), ...cor.naoMedido, ...(m.semMedida || [])]
  const marca = (a) => ({ ...a, nome: NOMES[a.n], largura: m.largura })
  return { achados: achados.map(marca), naoMedido: naoMedido.map(marca) }
}

export function montarRelatorio(url, larguras, partes) {
  const ordem = Object.keys(NIVEIS)
  const achados = partes.flatMap((p) => p.achados).sort((a, b) => ordem.indexOf(a.nivel) - ordem.indexOf(b.nivel) || a.n - b.n || b.largura - a.largura)
  const naoMedido = partes.flatMap((p) => p.naoMedido)
  const contagem = Object.fromEntries(ordem.map((n) => [n, achados.filter((a) => a.nivel === n).length]))
  return { url, larguras, achados, naoMedido, contagem, codigo: contagem['nunca-passa'] ? 1 : 0 }
}

export function relatorioDeErro(url, motivo) {
  return { url, larguras: [], achados: [], naoMedido: [], contagem: {}, codigo: 2, erro: motivo }
}

export function resumoTexto(rel) {
  const linhas = [`Conferência de acabamento: ${rel.url}`]
  if (rel.codigo === 2) return [...linhas, `Resultado: não deu para conferir (${rel.erro})`].join('\n')
  linhas.push(`Larguras: ${rel.larguras.join(', ')} px`)
  const item = (a) => `- [${a.largura}] ${a.n}. ${a.nome}: ${a.seletor} — ${a.medida}; rolagem ${a.rolagem} px`
  for (const [nivel, titulo] of Object.entries(NIVEIS)) {
    const lista = rel.achados.filter((a) => a.nivel === nivel)
    linhas.push('', `${titulo} (${lista.length})`, ...lista.map(item))
  }
  if (rel.naoMedido.length) linhas.push('', `NÃO MEDIDO (${rel.naoMedido.length}): conferir no olho, não conta como aprovado`, ...rel.naoMedido.map(item))
  const c = rel.contagem
  linhas.push('', c['nunca-passa']
    ? `Resultado: reprovado, ${c['nunca-passa']} achado(s) que nunca passam; consertar antes de mostrar`
    : `Resultado: nada que reprove sozinho; ${c.justificar} achado(s) pedem justificativa escrita e ${c.aviso} aviso(s)`)
  return linhas.join('\n')
}

export function lerArgs(argv) {
  const op = { larguras: [1440, 390], json: false }
  const soltos = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--larguras') op.larguras = String(argv[++i] || '').split(',').map(Number).filter((n) => n > 0)
    else if (a === '--json') op.json = true
    else if (a.startsWith('--')) op.erro = `opção desconhecida: ${a}`
    else soltos.push(a)
  }
  ;[op.url, op.saida] = soltos
  if (!op.larguras.length) op.erro = 'informe as larguras assim: --larguras 1440,390'
  return op
}

export function telaDe(largura) {
  if (largura < 1024) return { ...montarTelas([largura])[0], movel: true, dpr: 2 }
  return { largura, altura: Math.round(largura * 0.625), movel: false, dpr: 1 }
}

// ---------------------------------------------------------------------------------------------------------
// Navegador: o motor é o do celular.mjs (porta de depuração sorteada e perfil próprio em pasta temporária, apagado
// ao fechar); aqui só muda a emulação, porque a tela larga não é de toque.
// ---------------------------------------------------------------------------------------------------------
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

async function abrirMotor(exe) {
  try { return await motorChrome(exe) } catch { await espera(1500); return await motorChrome(exe) }
}

async function abrirTela(motor, url, tela) {
  const { cmd } = motor
  const { userAgent } = await cmd('Browser.getVersion')
  const versao = (userAgent.match(/Chrome\/([\d.]+)/) || [])[1] || '120.0.0.0'
  const sistema = tela.movel ? 'Linux; Android 10; K' : 'Windows NT 10.0; Win64; x64'
  await cmd('Emulation.setDeviceMetricsOverride', { width: tela.largura, height: tela.altura, deviceScaleFactor: tela.dpr, mobile: tela.movel })
  await cmd('Emulation.setTouchEmulationEnabled', tela.movel ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
  await cmd('Emulation.setUserAgentOverride', { userAgent: `Mozilla/5.0 (${sistema}) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/${versao} ${tela.movel ? 'Mobile ' : ''}Safari/537.36` })
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await cmd('Page.navigate', { url: 'about:blank' })
  const r = await cmd('Page.navigate', { url })
  if (r.errorText) throw new Error(`Não abriu a página: ${r.errorText}`)
  for (let i = 0; i < 80; i++) {
    await espera(250)
    try { if (await motor.rodar(() => location.href !== 'about:blank' && document.readyState === 'complete')) break } catch {}
  }
  await espera(1500)
  await motor.rodar(() => document.fonts.ready.then(() => true))
}

// ---------------------------------------------------------------------------------------------------------
// Medição dentro da página (autossuficiente: é enviada como texto)
// ---------------------------------------------------------------------------------------------------------
export function medirPagina() {
  return (async () => {
    const dorme = (ms) => new Promise((r) => setTimeout(r, ms))
    const raiz = document.scrollingElement || document.documentElement
    const VW = innerWidth, VH = innerHeight
    const rolar = (y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' })
    const nome1 = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '')
    const nome = (el) => (el.parentElement && el.parentElement !== document.body && !el.id ? nome1(el.parentElement) + ' > ' : '') + nome1(el)
    const curto = (t, n = 40) => { const s = String(t).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s }
    const arquivo = (src) => (/^data:/.test(src) ? src.slice(0, 22) + '…' : decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || src))
    const existe = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!el.checkVisibility || el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true })) }
    const aparece = (el) => existe(el) && (!el.checkVisibility || el.checkVisibility({ checkOpacity: true, opacityProperty: true, checkVisibilityCSS: true, visibilityProperty: true }))
    const textoDireto = (el) => { for (const n of el.childNodes) if (n.nodeType === 3 && n.data.trim()) return true; return false }
    const vetor = (src) => /\.svg([?#]|$)/i.test(src) || /^data:image\/svg/i.test(src)

    // Passa a página inteira uma vez: carrega o que é preguiçoso e dispara o que aparece ao rolar.
    for (let y = 0, i = 0; y < raiz.scrollHeight && i < 300; y += VH * 0.8, i++) { rolar(y); await dorme(80) }
    rolar(0)
    await dorme(400)
    const todos = [...document.querySelectorAll('body *')].filter((el) => !/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE|BR)$/.test(el.tagName))
    const topoDoc = (el) => Math.round(el.getBoundingClientRect().top + scrollY)

    // Linhas de um bloco, palavra por palavra. A linha é reconhecida pela base das letras, não pelo topo, para que
    // tamanhos diferentes na mesma linha não virem duas e linhas apertadas não virem uma.
    const faixa = document.createRange()
    const linhasDe = (el) => {
      const caixas = []
      const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let no = andar.nextNode(); no; no = andar.nextNode()) {
        const pai = no.parentElement
        if (!pai || !no.data.trim() || !existe(pai)) continue
        const fs = parseFloat(getComputedStyle(pai).fontSize) || 16
        const re = /\S+/g
        for (let m = re.exec(no.data); m; m = re.exec(no.data)) {
          faixa.setStart(no, m.index); faixa.setEnd(no, m.index + m[0].length)
          for (const r of faixa.getClientRects()) if (r.width > 0.5 && r.height > 0.5) caixas.push({ base: r.top + r.height * 0.8, l: r.left, r: r.right, fs, p: m[0] })
        }
      }
      caixas.sort((a, b) => a.base - b.base || a.l - b.l)
      const linhas = []
      for (const c of caixas) {
        const u = linhas[linhas.length - 1]
        if (u && Math.abs(c.base - u.base) < 0.35 * Math.min(c.fs, u.fs)) {
          u.l = Math.min(u.l, c.l); u.r = Math.max(u.r, c.r); u.palavras++; u.texto += ' ' + c.p
          if (c.fs > u.fs) { u.fs = c.fs; u.base = c.base }
        } else linhas.push({ base: c.base, l: c.l, r: c.r, fs: c.fs, palavras: 1, texto: c.p })
      }
      return linhas.map((l) => ({ base: l.base, fs: l.fs, largura: l.r - l.l, palavras: l.palavras, texto: curto(l.texto, 30) }))
    }
    const escalaDe = (el) => (el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1) || 1

    // 2. Títulos e textos em caixa alta com mais de uma linha
    const titulos = [], candidatos = new Set()
    const dentroDeCandidato = (el) => { for (let p = el.parentElement; p; p = p.parentElement) if (candidatos.has(p)) return true; return false }
    for (const el of todos) {
      const cs = getComputedStyle(el)
      const ehTitulo = /^H[1-3]$/.test(el.tagName)
      if (!ehTitulo) {
        if (!textoDireto(el) || dentroDeCandidato(el)) continue
        const t = el.textContent
        if (cs.textTransform !== 'uppercase' && !(t === t.toUpperCase() && /[A-ZÀ-Ý]{2}/.test(t))) continue
      } else if (dentroDeCandidato(el)) continue
      if (!existe(el)) continue
      candidatos.add(el)
      const linhas = linhasDe(el)
      if (linhas.length < 2) continue
      const bruto = el.innerText || el.textContent
      const texto = cs.textTransform === 'uppercase' ? bruto.toUpperCase() : bruto
      titulos.push({ seletor: nome(el), rolagem: topoDoc(el), texto: texto.replace(/\s+/g, ' ').trim().slice(0, 300), trecho: curto(texto), escala: escalaDe(el), linhas: linhas.map((l) => ({ base: l.base, fs: l.fs })) })
    }

    // 3. Órfãs em títulos e parágrafos
    const blocos = []
    for (const el of document.querySelectorAll('h1,h2,h3,h4,p,blockquote')) {
      if (!existe(el)) continue
      const linhas = linhasDe(el)
      if (linhas.length >= 2) blocos.push({ seletor: nome(el), rolagem: topoDoc(el), trecho: curto(el.innerText || el.textContent), linhas: linhas.map((l) => ({ largura: l.largura, palavras: l.palavras, texto: l.texto })) })
    }

    // 4. Imagens e fundos: tamanho na tela contra os pontos reais do arquivo
    const reais = new Map()
    const real = (src) => {
      if (!reais.has(src)) reais.set(src, new Promise((ok) => {
        const im = new Image()
        const fim = () => ok({ w: im.naturalWidth, h: im.naturalHeight })
        im.onload = fim; im.onerror = fim; setTimeout(fim, 5000); im.src = src
      }))
      return reais.get(src)
    }
    const imagens = [], conteudo = []
    for (const el of todos) {
      const cs = getComputedStyle(el)
      const fundo = /url\(/.test(cs.backgroundImage) ? (cs.backgroundImage.match(/url\((['"]?)(.*?)\1\)/) || [])[2] : null
      if (/^(IMG|VIDEO|CANVAS|INPUT|BUTTON|TEXTAREA|SELECT|IFRAME)$/.test(el.tagName) || (el.tagName.toLowerCase() === 'svg') || fundo || textoDireto(el)) conteudo.push(el)
      const r = el.getBoundingClientRect()
      const src = el.tagName === 'IMG' ? el.currentSrc || el.src : null
      const foto = src && !vetor(src), fundoFoto = fundo && !vetor(fundo)
      if (!foto && !fundoFoto) continue
      // Ficam fora só: o que está escondido (display/visibility), o ícone decorativo que cabe num quadrado de 48 px
      // e o fundo de caixa zerada (não aparece). <img> visível de caixa zerada, faixa fina (um lado < 48) e fundo
      // com background-size "auto" entram e, sem conta possível, vão para "não medido" com o motivo.
      if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true })) continue
      const zerada = !(r.width > 0 && r.height > 0)
      if (zerada ? !foto : r.width < 48 && r.height < 48) continue
      if (foto) {
        imagens.push({ tipo: 'img', seletor: nome(el), rolagem: topoDoc(el), arquivo: arquivo(src), caixa: { w: r.width, h: r.height }, ajuste: cs.objectFit, dpr: devicePixelRatio, natural: await real(src) })
      } else {
        imagens.push({ tipo: 'fundo', seletor: nome(el), rolagem: topoDoc(el), arquivo: arquivo(fundo), caixa: { w: r.width, h: r.height }, tamanho: cs.backgroundSize, dpr: devicePixelRatio, natural: await real(fundo) })
      }
    }

    // 5. Cor das fotos irmãs (lista ou grade com 3+ filhos do mesmo tipo, cada um com uma foto)
    const tela = document.createElement('canvas'); tela.width = tela.height = 32
    const pincel = tela.getContext('2d', { willReadFrequently: true })
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
    const labDe = (img, ate) => {
      if (!img.complete || !img.naturalWidth) return { motivo: 'a imagem não carregou' }
      const filtros = []
      for (let p = img; p && p !== ate.parentElement; p = p.parentElement) { const f = getComputedStyle(p).filter; if (f && f !== 'none') filtros.unshift(f) }
      const nw = img.naturalWidth, nh = img.naturalHeight, w = img.clientWidth || 1, h = img.clientHeight || 1
      let sx = 0, sy = 0, sw = nw, sh = nh
      if (getComputedStyle(img).objectFit === 'cover') {
        if (nw / nh > w / h) { sw = nh * (w / h); sx = (nw - sw) / 2 } else { sh = nw / (w / h); sy = (nh - sh) / 2 }
      }
      try {
        pincel.clearRect(0, 0, 32, 32)
        pincel.filter = filtros.join(' ') || 'none'
        pincel.drawImage(img, sx, sy, sw, sh, 0, 0, 32, 32)
        const d = pincel.getImageData(0, 0, 32, 32).data
        let L = 0, A = 0, B = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 8) continue
          const r = lin(d[i]), g = lin(d[i + 1]), b = lin(d[i + 2])
          const x = fLab((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), y = fLab(r * 0.2126 + g * 0.7152 + b * 0.0722), z = fLab((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883)
          L += 116 * y - 16; A += 500 * (x - y); B += 200 * (y - z); n++
        }
        return n ? { lab: [L / n, A / n, B / n] } : { motivo: 'imagem transparente' }
      } catch { return { motivo: 'sem acesso aos pontos da imagem (outra origem sem CORS ou página aberta do disco)' } }
    }
    const grupos = []
    for (const el of todos) {
      if (el.children.length < 3) continue
      const cs = getComputedStyle(el)
      if (!/^(UL|OL)$/.test(el.tagName) && !/grid|flex/.test(cs.display) && cs.columnCount === 'auto') continue
      const porTipo = new Map()
      for (const f of el.children) {
        const fotos = f.tagName === 'IMG' ? [f] : [...f.querySelectorAll('img')]
        if (fotos.length !== 1) continue
        const img = fotos[0], r = img.getBoundingClientRect(), src = img.currentSrc || img.src
        if (r.width < 48 || r.height < 48 || !existe(img) || !src || vetor(src)) continue
        if (!porTipo.has(f.tagName)) porTipo.set(f.tagName, [])
        porTipo.get(f.tagName).push(img)
      }
      for (const fotos of porTipo.values()) {
        if (fotos.length < 3) continue
        grupos.push({ seletor: nome(el), rolagem: topoDoc(el), fotos: fotos.map((img) => { const src = img.currentSrc || img.src; return { seletor: nome(img), arquivo: arquivo(src), chave: src.length > 200 ? src.length + ':' + src.slice(-48) : src, ...labDe(img, el) } }) })
      }
    }

    // 6. Faixas em laço: o andar de uma volta é medido parando a animação no começo e no fim
    const lacos = []
    for (const an of document.getAnimations()) {
      const ef = an.effect, alvo = ef && ef.target
      if (!alvo || !ef.getKeyframes || !existe(alvo)) continue
      const tempo = ef.getComputedTiming()
      if (tempo.iterations !== Infinity || /alternate/.test(tempo.direction) || !(tempo.duration > 0)) continue
      if (!ef.getKeyframes().some((q) => 'transform' in q || 'translate' in q)) continue
      const antes = an.currentTime, estado = an.playState
      let dx, dy
      try {
        an.pause()
        an.currentTime = tempo.delay
        const a = alvo.getBoundingClientRect()
        an.currentTime = tempo.delay + tempo.duration * (1 - 1e-7)
        const b = alvo.getBoundingClientRect()
        dx = Math.abs(b.left - a.left); dy = Math.abs(b.top - a.top)
      } catch { continue } finally { try { an.currentTime = antes; if (estado === 'running') an.play() } catch {} }
      if (!(dx > 1) || dy > 1) continue
      const assinatura = (c) => c.tagName + '|' + c.textContent.replace(/\s+/g, ' ').trim() + '|' + (c.tagName === 'IMG' ? [c] : [...c.querySelectorAll('img')]).map((i) => i.getAttribute('src') || i.currentSrc).join(',')
      const periodoEm = (filhos) => {
        const ass = filhos.map(assinatura)
        for (let k = 1; k <= filhos.length / 2; k++) {
          if (ass.every((s, i) => i + k >= ass.length || s === ass[i + k])) return filhos[k].getBoundingClientRect().left - filhos[0].getBoundingClientRect().left
        }
        return 0
      }
      let trilho = alvo
      while (trilho.children.length === 1) trilho = trilho.children[0]
      let periodo = periodoEm([...trilho.children])
      // Outro jeito comum: cada cópia da lista anda sozinha, lado a lado, dentro do mesmo pai.
      if (!(periodo > 0) && alvo.parentElement) {
        const copias = [...alvo.parentElement.children].filter((c) => assinatura(c) === assinatura(alvo))
        if (copias.length >= 2) periodo = copias[1].getBoundingClientRect().left - copias[0].getBoundingClientRect().left
      }
      if (periodo > 0) lacos.push({ seletor: nome(alvo), rolagem: topoDoc(alvo), deslocamento: dx, periodo })
    }

    // 1 e 7. Rolagem em passos de meia tela: o que está fixo por cima do conteúdo e onde não há nada
    const fixos = [], faixas = []
    const opaco = (el) => {
      const cor = getComputedStyle(el).backgroundColor
      if (!cor || cor === 'transparent') return false
      const m = cor.match(/^rgba?\(([^)]+)\)/)
      if (m) { const p = m[1].split(/[,/\s]+/).filter(Boolean); return p.length < 4 || parseFloat(p[3]) >= 0.9 }
      const a = cor.match(/\/\s*([\d.]+%?)\s*\)/)
      return !a || parseFloat(a[1]) >= (a[1].endsWith('%') ? 90 : 0.9)
    }
    const fim = Math.max(0, raiz.scrollHeight - VH)
    const paradas = []
    for (let y = 0; y < fim && paradas.length < 300; y += VH / 2) paradas.push(y)
    paradas.push(fim)
    for (const parada of paradas) {
      rolar(parada)
      await dorme(350) // espera o cabeçalho que some e volta terminar de se mexer
      const sy = Math.round(scrollY)
      const presos = todos.filter((el) => { const p = getComputedStyle(el).position; return p === 'fixed' || p === 'sticky' })
      const pequenos = presos.filter((el) => { const r = el.getBoundingClientRect(); return r.width * r.height < 0.3 * VW * VH })
      const linhasDoTexto = new Map()
      const textoEm = (el, x, y) => {
        if (!linhasDoTexto.has(el)) {
          const lista = []
          for (const n of el.childNodes) if (n.nodeType === 3 && n.data.trim()) { faixa.selectNodeContents(n); lista.push({ rs: [...faixa.getClientRects()], t: n.data }) }
          linhasDoTexto.set(el, lista)
        }
        for (const t of linhasDoTexto.get(el)) if (t.rs.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) return t.t
        return null
      }
      for (const F of presos) {
        if (F.closest('[aria-hidden="true"]') || presos.some((o) => o !== F && o.contains(F)) || !aparece(F)) continue
        const r = F.getBoundingClientRect()
        const x0 = Math.max(0, r.left), x1 = Math.min(VW, r.right), y0 = Math.max(0, r.top), y1 = Math.min(VH, r.bottom)
        if (x1 - x0 < 4 || y1 - y0 < 4) continue
        const passo = Math.max(6, Math.sqrt(((x1 - x0) * (y1 - y0)) / 400))
        const cobre = new Map()
        for (let y = y0 + passo / 2; y < y1; y += passo) {
          for (let x = x0 + passo / 2; x < x1; x += passo) {
            const pilha = document.elementsFromPoint(x, y)
            const i = pilha.findIndex((e) => F.contains(e))
            if (i < 0) continue
            for (let j = i + 1; j < pilha.length; j++) {
              const e = pilha[j]
              if (F.contains(e) || e.contains(F) || presos.some((o) => o.contains(e))) continue
              if (e.closest('[aria-hidden="true"]') || !aparece(e)) continue
              let achou = null
              if (/^(IMG|VIDEO)$/.test(e.tagName)) achou = { tipo: 'imagem', trecho: '' }
              else if (textoDireto(e)) { const t = textoEm(e, x, y); if (t) achou = { tipo: 'texto', trecho: curto(t) } }
              if (achou) {
                if (!cobre.has(e)) cobre.set(e, { ...achou, seletor: nome(e), pontos: 0 })
                cobre.get(e).pontos++
                break
              }
              if (opaco(e)) break
            }
          }
        }
        if (!cobre.size) continue
        const lista = [...cobre.entries()].map(([e, c]) => {
          const q = e.getBoundingClientRect()
          const cruza = Math.max(0, Math.min(x1, q.right) - Math.max(x0, q.left)) * Math.max(0, Math.min(y1, q.bottom) - Math.max(y0, q.top))
          return { ...c, area: c.pontos * passo * passo, fracao: q.width * q.height ? cruza / (q.width * q.height) : 0 }
        }).sort((a, b) => b.area - a.area).slice(0, 5)
        fixos.push({ seletor: nome(F), posicao: getComputedStyle(F).position, rolagem: sy, passos: paradas.length, vw: VW, vh: VH, ret: { x: r.left, y: r.top, w: r.width, h: r.height }, cobre: lista })
      }
      for (const el of conteudo) {
        const r = el.getBoundingClientRect()
        if (r.bottom <= 0 || r.top >= VH || r.width <= 0 || r.height <= 0 || r.right <= 0 || r.left >= VW) continue
        if (pequenos.some((o) => o.contains(el)) || !existe(el)) continue
        faixas.push({ a: Math.max(0, r.top) + sy, b: Math.min(VH, r.bottom) + sy, el })
      }
    }
    rolar(0)
    faixas.sort((p, q) => p.a - q.a)
    const vaos = []
    let ate = null
    for (const f of faixas) {
      if (ate && f.a - ate.b >= 1) vaos.push({ y: ate.b, tamanho: f.a - ate.b, antes: nome(ate.el), depois: nome(f.el) })
      if (!ate || f.b > ate.b) ate = f
    }
    return { largura: VW, vh: VH, dpr: devicePixelRatio, alturaPagina: raiz.scrollHeight, fixos, titulos, blocos, imagens, grupos, lacos, vaos }
  })()
}

export async function conferir({ url, larguras, exe }) {
  const motor = await abrirMotor(exe)
  const partes = [], medidas = []
  try {
    for (const largura of larguras) {
      await abrirTela(motor, url, telaDe(largura))
      const m = await motor.rodar(medirPagina)
      m.largura = largura
      medidas.push(m)
      partes.push(avaliarTudo(m))
    }
  } finally { await motor.fechar() }
  return { relatorio: montarRelatorio(url, larguras, partes), medidas }
}

function mostrar(rel, op) {
  const resumo = resumoTexto(rel)
  if (op.saida) {
    fs.mkdirSync(op.saida, { recursive: true })
    fs.writeFileSync(path.join(op.saida, 'acabamento.json'), JSON.stringify(rel, null, 2))
    fs.writeFileSync(path.join(op.saida, 'resumo.txt'), resumo + '\n')
  }
  console.log(op.json ? JSON.stringify(rel, null, 2) : resumo)
}

export async function executar(argv) {
  const op = lerArgs(argv)
  if (!op.url || op.erro) {
    if (op.erro) console.log(`Erro: ${op.erro}`)
    console.log('Uso: node acabamento.mjs <url|arquivo.html> [pasta-saida] [--larguras 1440,390] [--json]')
    return 2
  }
  let url
  try { url = normalizarUrl(op.url) } catch (e) { mostrar(relatorioDeErro(op.url, e.message), op); return 2 }
  const exe = acharNavegador()
  if (!exe) { mostrar(relatorioDeErro(url, 'Chrome/Edge não encontrado: instale um deles ou defina BROWSER_EXECUTABLE'), op); return 2 }
  try {
    const { relatorio } = await conferir({ url, larguras: op.larguras, exe })
    mostrar(relatorio, op)
    return relatorio.codigo
  } catch (e) {
    mostrar(relatorioDeErro(url, e.message), op)
    return 2
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const codigo = await executar(process.argv.slice(2))
  process.exit(codigo)
}
