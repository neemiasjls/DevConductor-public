// Compara o nosso site com a referência escolhida, seção por seção, a partir de dois raio-x (lp-referencias).
// Uso: node comparar-referencia.mjs <raio-x-da-referencia.json> <url-do-nosso-site | raio-x-nosso.json> <pasta-saida>
//        [--secoes 1-3 | 1,2,5] [--copiar-prints] [--celular] [--lighthouse relatorio.json]
//        [--cegas <pasta> [--outras a.json,b.json] [--semente N]]
//   URL no segundo argumento: roda o raio-x nela (localhost dispensa robots.txt) e grava em <pasta-saida>/nosso/.
//   --secoes      compara só estas seções da REFERÊNCIA (numeração do roteiro.md e dos prints); as outras não geram
//                 divergência, nem de número de seções ou comprimento da página. Serve ao laço seção por seção.
//   --copiar-prints copia os prints usados para dentro de <pasta-saida> (caminhos relativos: a pasta abre em outro PC).
//   --celular     mede o nosso no celular (390×844); a referência precisa ser o raio-x de celular dela.
//   --lighthouse  relatório JSON do Lighthouse (não roda o Lighthouse); sem ele, procura <pasta-saida>/lighthouse.json.
//   --cegas       monta material de leitura às cegas (prints sem rótulo); gabarito fica em <pasta-saida>.
// Saída: comparacao.json, comparacao.md (lista para corrigir), olhar.md (roteiro do olhar de diretor de arte,
// com os prints de cada seção e nota 0–10) e lado-a-lado.html.
// Código de saída: 0 sem divergência alta; 1 com divergência alta (portão); 2 erro de uso ou de medição.
// A referência é de terceiro: serve só para estudar estrutura e ritmo. Nada é copiado nem publicado.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contraste, corParaRgba, CONTRASTE_MINIMO, forcaMovimento, raioX, TIPOS } from '../../lp-referencias/scripts/raio-x.mjs'

// ---------------------------------------------------------------------------------------------------------
// Tolerâncias (todas aqui, para calibrar num lugar só)
// ---------------------------------------------------------------------------------------------------------
export const TOLERANCIAS = {
  semelhancaMinima: 0.55,        // abaixo disso duas seções não são "a mesma" (0 a 1)
  semMovimento: 0.75,            // nota de movimento quando nenhuma das duas tem movimento próprio
  ordemConfianca: 0.75,          // par fora de ordem só é "alta" se a semelhança for pelo menos esta
  bonusPosicao: 0.08,            // desempate: seções em posição parecida da página
  secoesDiferenca: { baixa: 1, media: 2, alta: 3 },        // diferença no nº de seções (sem cabeçalho)
  alturaPagina: { media: 1.5, alta: 2.5 },                 // fator entre as alturas totais (em telas)
  alturaSecao: { media: 1.6 },                             // fator entre alturas de um par de seções
  escalaMaxima: { media: 1.3, alta: 1.8 },                 // fator entre as maiores razões da escala de fontes
  escalaParteMinima: 0.005,                                // degrau com menos texto que isso é ruído
  escalaDegraus: { baixa: 3 },                             // diferença no nº de degraus da escala
  corpoPx: { baixa: 2 },                                   // diferença no tamanho do texto corrido
  tituloSecao: { media: 1.5 },                             // fator entre as razões do título de um par
  imagemTexto: { media: 0.3, alta: 0.6 },                  // diferença absoluta na parte da área que é imagem
  palavrasMais: { media: 2, alta: 3 },                     // o nosso com N× mais palavras por tela
  palavrasMenos: { baixa: 2 },                             // o nosso com N× menos palavras por tela
  presaDuracao: { media: 2 },                              // fator entre as durações presas
  forcaCena: { alta: 0.5, media: 0.75, exagero: 1.6 },     // força da nossa cena principal ÷ a da referência
  contrasteMenor: { media: 0.8 },                          // o nosso com menos que esta parte do contraste da referência
  ritmoDuracao: { media: 1.5 },                            // fator entre as durações do movimento (ms)
  maxItensMd: 25,
}
// Movimentos que não contam como "tipo" de seção: quase todo site tem entrada simples.
const IGNORAR = new Set(['nenhum', 'entrada-simples'])
const ORDEM = { alta: 0, media: 1, baixa: 2 }
export const LIMITES_WEB = { lcpMs: 2500, cls: 0.1, inpMs: 200, tbtMs: 200 }

// Cenas principais de tipo diferente que se leem como o mesmo golpe na tela. O raio-x separa pelo detalhe da
// medida; o olho não. Dentro da mesma família a divergência cai de "alta" para "média". Só famílias já vistas.
export const CENAS_EQUIVALENTES = [
  // Prova de 10/11: cartões que sobem sobre o bloco preso. Em escada o raio-x diz "pilha"; juntos, "presa".
  { tipos: ['presa', 'pilha'], como: 'trecho preso com camadas que sobem por cima' },
  // A imagem cresce até ocupar a tela: por recorte (máscara) ou por escala.
  { tipos: ['revelacao-mascara', 'zoom'], como: 'imagem que abre até a tela cheia' },
  // Texto partido que entra aos pedaços, por letra ou por linha.
  { tipos: ['texto-letra', 'texto-linha'], como: 'texto que entra aos pedaços' },
]
export function familiaDaCena(a, b) {
  return a === b ? null : CENAS_EQUIVALENTES.find((f) => f.tipos.includes(a) && f.tipos.includes(b)) || null
}

// Olhar de diretor de arte: perguntas fixas por seção (o número sozinho aprovaria um fundo ruim).
export const PERGUNTAS_OLHAR = [
  'Hierarquia do título: o olho vai primeiro aonde a referência leva? Tamanho, peso e contraste do título contra o resto.',
  'Respiro: margens e espaço entre blocos têm a folga da referência, ou o nosso está apertado (ou vazio) demais?',
  'Fotos: nitidez, tamanho, luz e enquadramento são bons e coerentes entre si e com a referência?',
  'Acabamento de detalhes: bordas, cantos, linhas finas, ícones e alinhamentos — algo torto, grosso ou genérico?',
  'O que denuncia "feito por gerador": foto de banco literal, degradê ou ícone padrão, simetria sem intenção, texto vazio?',
]

// ---------------------------------------------------------------------------------------------------------
// Funções puras
// ---------------------------------------------------------------------------------------------------------
const r2 = (n) => Math.round(n * 100) / 100
const fmt = (n) => String(r2(n)).replace('.', ',')
const telas = (n) => `${fmt(n)} ${r2(n) === 1 ? 'tela' : 'telas'}`
const pct = (n) => `${Math.round(n * 100)}%`
const fator = (a, b) => (Math.min(a, b) <= 0 ? Infinity : Math.max(a, b) / Math.min(a, b))
const n1 = (sec) => sec.indice + 1

// Paleta do cliente = cores que o nosso site já usa em fundo, texto e título (as médias das fotos não entram).
export function paletaDoRaioX(rx) {
  const cores = new Set()
  const por = (h) => { if (/^#[0-9a-f]{6}$/i.test(h || '')) cores.add(h.toLowerCase()) }
  por(rx.pagina?.corTexto); por(rx.pagina?.corFundo)
  for (const sec of rx.secoes || []) { por(sec.corFundo); por(sec.corTexto); por(sec.titulo?.cor); for (const c of sec.cores || []) if (c.papel !== 'imagem') por(c.hex) }
  return [...cores]
}

// Cor da paleta que chega ao contraste pedido sobre o fundo, a mais parecida com a cor de agora.
// Nenhuma chega: devolve a de maior contraste, com atinge: false. Sem paleta ou sem fundo: null.
export function sugerirCor(paleta, fundo, alvo, atual = null) {
  const f = corParaRgba(fundo)
  if (!f) return null
  const a = corParaRgba(atual)
  const cands = (paleta || []).map((hex) => ({ hex, v: corParaRgba(hex) })).filter((c) => c.v && c.hex !== String(atual || '').toLowerCase())
    .map((c) => ({ hex: c.hex, razao: contraste(c.v, f), longe: a ? Math.hypot(...[0, 1, 2].map((k) => c.v[k] - a[k])) : 0 }))
  if (!cands.length) return null
  const servem = cands.filter((c) => c.razao >= alvo).sort((x, y) => x.longe - y.longe || y.razao - x.razao)
  const { hex, razao } = servem[0] || cands.sort((x, y) => y.razao - x.razao)[0]
  return { hex, razao, atinge: !!servem.length }
}
const dizerSugestao = (s, alvo) => (!s ? 'Sem cor da paleta medida para sugerir.'
  : s.atinge ? `Sugestão dentro da paleta: ${s.hex} (${fmt(s.razao)}:1 sobre esse fundo).`
    : `Nenhuma cor da paleta chega a ${fmt(alvo)}:1 sobre esse fundo; a que mais se aproxima é ${s.hex} (${fmt(s.razao)}:1): escurecer ou clarear o fundo, ou pedir uma cor nova ao cliente.`)

// Família de uma curva de CSS: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'passos' | null.
// cubic-bezier é lida pelo avanço no meio do tempo: adiantada = ease-out, atrasada = ease-in.
export function familiaDaCurva(curva) {
  const c = String(curva || '').trim().toLowerCase()
  if (!c) return null
  if (c.startsWith('steps') || c.startsWith('step-')) return 'passos'
  const nomes = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] }
  const m = c.match(/^cubic-bezier\(([^)]+)\)$/)
  const p = nomes[c] || (m ? m[1].split(',').map(Number) : null)
  if (!p || p.length !== 4 || p.some((v) => !Number.isFinite(v))) return null
  const [x1, y1, x2, y2] = p
  const bez = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3
  let lo = 0, hi = 1
  for (let i = 0; i < 30; i++) { const t = (lo + hi) / 2; if (bez(t, x1, x2) < 0.5) lo = t; else hi = t }
  const meio = bez((lo + hi) / 2, y1, y2)
  if (meio > 0.6) return 'ease-out'
  if (meio < 0.4) return 'ease-in'
  const inicio = x1 > 0 ? y1 / x1 : 1, fim = x2 < 1 ? (1 - y2) / (1 - x2) : 1
  return inicio < 0.7 && fim < 0.7 ? 'ease-in-out' : 'linear'
}

// Seções que contam a história: cabeçalho fixo fica de fora.
export function corpo(rx) {
  return rx.secoes.filter((s) => s.papel !== 'cabeçalho')
}

function movDe(rx, indice) {
  return rx.movimento.find((m) => m.secao === indice) || { secao: indice, tipos: ['nenhum'], detalhes: [], forca: 0 }
}

export function tiposDe(rx, indice) {
  return movDe(rx, indice).tipos.filter((t) => !IGNORAR.has(t))
}

// O tipo que mais pesa numa seção (o "golpe" da cena).
export function tipoPrincipal(mov) {
  let melhor = 'nenhum', f = 0
  for (const d of mov?.detalhes || []) {
    if (!TIPOS.includes(d.tipo)) continue // "fundo-animado" e afins só detalham; não são tipo de cena
    const fd = forcaMovimento([d])
    if (fd > f) { f = fd; melhor = d.tipo }
  }
  return melhor
}

function duracaoPresa(rx, indice) {
  const d = movDe(rx, indice).detalhes.find((x) => x.tipo === 'presa')
  return d ? d.duracaoTelas || 0 : 0
}

// Semelhança entre duas seções (0 a 1): movimento, imagem/texto, altura, densidade de texto e papel.
export function semelhanca(rxA, a, rxB, b) {
  const ta = new Set(tiposDe(rxA, a.indice)), tb = new Set(tiposDe(rxB, b.indice))
  const uniao = new Set([...ta, ...tb])
  const comum = [...ta].filter((t) => tb.has(t)).length
  const mov = uniao.size ? comum / uniao.size : TOLERANCIAS.semMovimento
  const it = a.imagemTexto == null || b.imagemTexto == null ? 0.5 : 1 - Math.abs(a.imagemTexto - b.imagemTexto)
  const alt = Math.min(a.alturaTelas, b.alturaTelas) / Math.max(a.alturaTelas, b.alturaTelas, 0.01)
  const pa = (a.palavrasPorTela || 0) + 5, pb = (b.palavrasPorTela || 0) + 5
  const pal = Math.min(pa, pb) / Math.max(pa, pb)
  const papel = (a.papel || null) === (b.papel || null) ? 1 : 0
  return r2(0.4 * mov + 0.2 * it + 0.2 * alt + 0.1 * pal + 0.1 * papel)
}

// Pareia as seções da referência com as nossas (um para um, melhor semelhança primeiro).
// fatia: índices (base 0) das seções da referência a comparar; as nossas entram todas como candidatas.
export function parearSecoes(ref, nosso, tol = TOLERANCIAS, fatia = null) {
  const todas = corpo(ref), B = corpo(nosso)
  const A = fatia ? todas.filter((s) => fatia.includes(s.indice)) : todas
  const pos = (i, n) => (n > 1 ? i / (n - 1) : 0)
  // Mesma planta: o mesmo número de seções, cada uma começando no mesmo ponto da página (até 0,35 tela de folga)
  // e com a mesma altura (até 0,25 tela).
  // Aí o par é pela ordem: a semelhança medida engana quando o fundo é feito de outro jeito (canvas na referência,
  // CSS no nosso) e trocaria seções que estão no lugar certo.
  const topo = (s) => (typeof s.topoTelas === 'number' ? s.topoTelas : null)
  if (todas.length === B.length && todas.every((a, i) => topo(a) != null && topo(B[i]) != null && Math.abs(topo(a) - topo(B[i])) <= 0.35 && Math.abs(a.alturaTelas - B[i].alturaTelas) <= 0.25)) {
    const pares = todas.map((a, i) => ({ ref: a.indice, nosso: B[i].indice, semelhanca: semelhanca(ref, a, nosso, B[i]) })).filter((p) => !fatia || fatia.includes(p.ref))
    const usados = new Set(pares.map((p) => p.nosso))
    return { pares, semParRef: [], semParNosso: fatia ? [] : B.filter((s) => !usados.has(s.indice)).map((s) => s.indice) }
  }
  const cand = []
  A.forEach((a) => B.forEach((b, j) => {
    const s = semelhanca(ref, a, nosso, b)
    // a posição conta na página inteira da referência, não na fatia
    if (s >= tol.semelhancaMinima) cand.push({ ref: a.indice, nosso: b.indice, semelhanca: s, nota: s + tol.bonusPosicao * (1 - Math.abs(pos(todas.indexOf(a), todas.length) - pos(j, B.length))) })
  }))
  cand.sort((x, y) => y.nota - x.nota)
  const usadoA = new Set(), usadoB = new Set(), pares = []
  for (const c of cand) {
    if (usadoA.has(c.ref) || usadoB.has(c.nosso)) continue
    usadoA.add(c.ref); usadoB.add(c.nosso)
    pares.push({ ref: c.ref, nosso: c.nosso, semelhanca: c.semelhanca })
  }
  pares.sort((x, y) => x.ref - y.ref)
  return {
    pares,
    semParRef: A.filter((s) => !usadoA.has(s.indice)).map((s) => s.indice),
    semParNosso: B.filter((s) => !usadoB.has(s.indice)).map((s) => s.indice),
  }
}

// Pares fora de ordem: os que não estão na maior sequência crescente (pela ordem da referência).
export function foraDeOrdem(pares) {
  const seq = pares.map((p) => p.nosso)
  const n = seq.length
  const comp = new Array(n).fill(1), ant = new Array(n).fill(-1)
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) if (seq[j] < seq[i] && comp[j] + 1 > comp[i]) { comp[i] = comp[j] + 1; ant[i] = j }
  let fim = comp.indexOf(Math.max(0, ...comp))
  const dentro = new Set()
  while (fim >= 0) { dentro.add(fim); fim = ant[fim] }
  return pares.filter((_, i) => !dentro.has(i))
}

// Texto decorativo (marca d'água, número gigante): o raio-x pode listar em secoes[].decorativos (objeto com texto
// e/ou px, ou só o px) ou marcar o item com `decorativo: true` (pagina.escala, secoes[].fontes, secoes[].titulo).
// Campo opcional: sem ele vale só o filtro de ruído (escalaParteMinima).
const pxDe = (d) => (typeof d === 'number' ? d : Number(d?.px) || null)
const normTexto = (t) => String(t || '').replace(/…$/, '').trim().toLowerCase()
export function tituloDecorativo(sec) {
  const t = sec?.titulo
  if (!t) return false
  if (t.decorativo) return true
  return (Array.isArray(sec.decorativos) ? sec.decorativos : []).some((d) => {
    const a = normTexto(d?.texto), b = normTexto(t.texto)
    return a && b ? a.startsWith(b) || b.startsWith(a) : pxDe(d) !== null && pxDe(d) === t.px
  })
}
// px que só aparecem em texto decorativo (não descarta o tamanho de um título de verdade igual a ele)
function pxDecorativos(secoes) {
  const dec = new Set(), reais = new Set()
  for (const s of secoes) {
    for (const d of Array.isArray(s.decorativos) ? s.decorativos : []) if (pxDe(d)) dec.add(pxDe(d))
    for (const f of s.fontes || []) if (f.decorativo) dec.add(f.px)
    if (s.titulo?.px) (tituloDecorativo(s) ? dec : reais).add(s.titulo.px)
  }
  for (const px of reais) dec.delete(px)
  return dec
}

// indices: só estas seções (fatia), pelas fontes de cada seção; sem eles, a escala da página inteira.
export function resumoEscala(rx, tol = TOLERANCIAS, indices = null) {
  let degraus
  if (indices) {
    const secs = rx.secoes.filter((s) => indices.includes(s.indice))
    const dec = pxDecorativos(secs)
    const porPx = new Map()
    for (const s of secs) {
      const itens = (s.fontes || []).map((f) => ({ px: f.px, razao: f.razao, parte: f.parte ?? 1, decorativo: f.decorativo }))
      if (s.titulo?.px && !tituloDecorativo(s) && !itens.some((f) => f.px === s.titulo.px)) itens.push({ px: s.titulo.px, razao: s.titulo.razao, parte: 1 })
      for (const f of itens) {
        if (f.decorativo || dec.has(f.px) || f.parte < tol.escalaParteMinima) continue
        if (!porPx.has(f.px) || porPx.get(f.px).parte < f.parte) porPx.set(f.px, f)
      }
    }
    degraus = [...porPx.values()].sort((a, b) => b.px - a.px)
  } else {
    const dec = pxDecorativos(rx.secoes)
    degraus = (rx.pagina?.escala || []).filter((e) => (e.parte ?? 1) >= tol.escalaParteMinima && !e.decorativo && !dec.has(e.px))
  }
  return { corpoPx: rx.pagina?.corpoPx ?? null, razaoMaxima: degraus.length ? Math.max(...degraus.map((e) => e.razao)) : null, degraus: degraus.length, razoes: degraus.map((e) => e.razao) }
}

function descSecao(rx, sec) {
  const t = tiposDe(rx, sec.indice)
  const partes = [telas(sec.alturaTelas)]
  if (t.length) partes.push(t.join(' + '))
  if (sec.imagemTexto != null) partes.push(`imagem ${pct(sec.imagemTexto)}`)
  partes.push(`${sec.palavrasPorTela ?? 0} palavras/tela`)
  return partes.join(', ')
}

// Compara dois raio-x e devolve as divergências medidas, cada uma com gravidade.
// opcoes.secoes: índices (base 0) das seções da referência a comparar (fatia); sem ela, a página inteira.
export function compararRaioX(ref, nosso, tol = TOLERANCIAS, { secoes = null } = {}) {
  const div = []
  const add = (gravidade, tipo, texto, extra = {}) => div.push({ gravidade, tipo, secaoRef: null, secaoNossa: null, ...extra, texto })
  const avisos = []
  const vr = ref.viewport || {}, vn = nosso.viewport || {}
  if (!!vr.celular !== !!vn.celular) avisos.push(`A referência foi medida no ${vr.celular ? 'celular' : 'computador'} e o nosso no ${vn.celular ? 'celular' : 'computador'}: alturas e palavras por tela não se comparam bem. Rodar os dois no mesmo formato.`)
  const secR = new Map(ref.secoes.map((s) => [s.indice, s])), secN = new Map(nosso.secoes.map((s) => [s.indice, s]))
  const fatia = secoes ? [...new Set(secoes)].sort((a, b) => a - b) : null
  const A = fatia ? corpo(ref).filter((s) => fatia.includes(s.indice)) : corpo(ref), B = corpo(nosso)
  const par = parearSecoes(ref, nosso, tol, fatia)
  const paleta = paletaDoRaioX(nosso)
  const nossoDe = new Map(par.pares.map((p) => [p.ref, p.nosso]))

  // Número de seções e comprimento da página (só na página inteira: numa fatia a diferença é de propósito)
  const dn = Math.abs(A.length - B.length)
  const gN = dn >= tol.secoesDiferenca.alta ? 'alta' : dn >= tol.secoesDiferenca.media ? 'media' : dn >= tol.secoesDiferenca.baixa ? 'baixa' : null
  if (gN && !fatia) add(gN, 'numero-secoes', `Número de seções: a referência tem ${A.length}, o nosso tem ${B.length} (sem contar o cabeçalho).`, { medida: { ref: A.length, nosso: B.length } })
  const hr = ref.rolagem?.alturaTelas, hn = nosso.rolagem?.alturaTelas
  if (hr && hn && !fatia) {
    const f = fator(hr, hn)
    const g = f >= tol.alturaPagina.alta ? 'alta' : f >= tol.alturaPagina.media ? 'media' : null
    if (g) add(g, 'altura-pagina', `Comprimento da página: a referência rola ${telas(hr)}, o nosso ${telas(hn)}. ${hn < hr ? 'O nosso passa rápido demais: faltam cenas ou trechos presos.' : 'O nosso está comprido demais: cortar ou encurtar trechos presos.'}`, { medida: { ref: hr, nosso: hn } })
  }

  // Ordem
  for (const p of foraDeOrdem(par.pares)) {
    const a = secR.get(p.ref)
    add(p.semelhanca >= tol.ordemConfianca ? 'alta' : 'media', 'ordem', `Seção ${n1(a)} da referência (${descSecao(ref, a)}) corresponde à nossa seção ${p.nosso + 1}, que está fora de ordem: mover para a posição em que aparece na referência.`, { secaoRef: p.ref, secaoNossa: p.nosso })
  }
  for (const i of par.semParRef) {
    const a = secR.get(i)
    add('media', 'falta-secao', `Seção ${n1(a)} da referência (${descSecao(ref, a)}) não tem equivalente no nosso.`, { secaoRef: i })
  }
  // Numa fatia, nossa seção sem par costuma ser a equivalente de uma seção da referência que ficou de fora.
  for (const j of fatia ? [] : par.semParNosso) {
    const b = secN.get(j)
    add('baixa', 'secao-a-mais', `Nossa seção ${n1(b)} (${descSecao(nosso, b)}) não tem equivalente na referência: conferir se precisa existir.`, { secaoNossa: j })
  }

  // Escala de fontes (página inteira, ou só as seções da fatia e as nossas que pareiam com elas)
  const er = resumoEscala(ref, tol, fatia ? A.map((s) => s.indice) : null)
  const en = resumoEscala(nosso, tol, fatia ? par.pares.map((p) => p.nosso) : null)
  if (er.razaoMaxima && en.razaoMaxima) {
    const f = fator(er.razaoMaxima, en.razaoMaxima)
    const g = f >= tol.escalaMaxima.alta ? 'alta' : f >= tol.escalaMaxima.media ? 'media' : null
    if (g) add(g, 'escala', `Escala de fontes: o maior título da referência tem ${fmt(er.razaoMaxima)}× o texto corrido; o nosso, ${fmt(en.razaoMaxima)}×. ${en.razaoMaxima < er.razaoMaxima ? 'Aumentar o contraste de tamanho.' : 'Reduzir o maior título.'}`, { medida: { ref: er.razaoMaxima, nosso: en.razaoMaxima } })
  }
  if (Math.abs(er.degraus - en.degraus) >= tol.escalaDegraus.baixa) add('baixa', 'escala-degraus', `Escala de fontes: a referência usa ${er.degraus} tamanhos; o nosso, ${en.degraus}.`, { medida: { ref: er.degraus, nosso: en.degraus } })
  if (er.corpoPx && en.corpoPx && Math.abs(er.corpoPx - en.corpoPx) >= tol.corpoPx.baixa) add('baixa', 'corpo', `Texto corrido: referência ${er.corpoPx}px, nosso ${en.corpoPx}px.`, { medida: { ref: er.corpoPx, nosso: en.corpoPx } })

  // Por par de seções
  for (const p of par.pares) {
    const a = secR.get(p.ref), b = secN.get(p.nosso)
    const rot = `Seção ${n1(a)} da referência ↔ nossa ${n1(b)}`
    const ex = { secaoRef: p.ref, secaoNossa: p.nosso }
    // Movimento
    const ta = tiposDe(ref, a.indice), tb = tiposDe(nosso, b.indice)
    for (const t of ta.filter((x) => !tb.includes(x))) {
      const texto = t === 'presa'
        ? `${rot}: a referência prende a rolagem por ${telas(duracaoPresa(ref, a.indice))}; o nosso não prende.`
        : `${rot}: a referência tem movimento "${t}"; o nosso não tem.`
      add('media', 'movimento-falta', texto, { ...ex, medida: { ref: t, nosso: null } })
    }
    for (const t of tb.filter((x) => !ta.includes(x))) add('baixa', 'movimento-a-mais', `${rot}: o nosso tem movimento "${t}"; a referência não. Conferir se não é exagero.`, { ...ex, medida: { ref: null, nosso: t } })
    const da = duracaoPresa(ref, a.indice), db = duracaoPresa(nosso, b.indice)
    const presaDif = da && db && fator(da, db) >= tol.presaDuracao.media
    if (presaDif) add('media', 'presa-duracao', `${rot}: a referência fica presa ${telas(da)}; o nosso, ${telas(db)}.`, { ...ex, medida: { ref: da, nosso: db } })
    // Ritmo do movimento: duração e curva (do CSS ou estimadas pelo raio-x)
    const ma = movDe(ref, a.indice), mb = movDe(nosso, b.indice)
    if (ma.duracaoMs && mb.duracaoMs && fator(ma.duracaoMs, mb.duracaoMs) >= tol.ritmoDuracao.media) add('media', 'ritmo-duracao', `${rot}: o movimento dura ${Math.round(ma.duracaoMs)} ms na referência e ${Math.round(mb.duracaoMs)} ms no nosso (${mb.duracaoMs < ma.duracaoMs ? 'rápido demais' : 'lento demais'}). Acertar a duração no src/ritmo.ts.`, { ...ex, medida: { ref: ma.duracaoMs, nosso: mb.duracaoMs } })
    const fa = familiaDaCurva(ma.curva), fb = familiaDaCurva(mb.curva)
    if (fa && fb && fa !== fb) add('media', 'ritmo-curva', `${rot}: a curva do movimento é "${ma.curva}" (${fa}) na referência e "${mb.curva}" (${fb}) no nosso. Usar a mesma família de curva no src/ritmo.ts.`, { ...ex, medida: { ref: ma.curva, nosso: mb.curva } })
    // Contraste do texto: piso da acessibilidade e comparação com a referência
    const ca = a.contraste, cb = b.contraste
    const pior = cb?.pior
    const piso = pior ? pior.minimo ?? (pior.grande ? CONTRASTE_MINIMO.grande : CONTRASTE_MINIMO.normal) : null
    // "Abaixo do mínimo" vem decidido pelo raio-x com tamanho e razão SEM arredondar (pior.abaixo): 23,6px não ganha
    // o piso de texto grande e 4,495 não passa como 4,5. Raio-x antigo (sem o campo): vale a razão gravada.
    const abaixo = !!pior && (pior.abaixo === true || pior.razao < piso)
    if (abaixo) {
      add('alta', 'contraste-minimo', `${rot}: o texto "${pior.texto}" (${pior.cor} sobre ${pior.fundo}) tem contraste ${fmt(pior.razao)}:1, abaixo do mínimo de acessibilidade (${fmt(piso)}:1). ${dizerSugestao(sugerirCor(paleta, pior.fundo, piso, pior.cor), piso)}`, { ...ex, medida: { ref: ca?.minimo ?? null, nosso: pior.razao } })
    }
    // Texto sem medida (sobre imagem, degradê...) não passa calado: nada medido na seção é aviso médio; parte
    // relevante (30% dos textos ou mais) sem medida é aviso baixo com a contagem.
    const semMedida = cb?.semMedida || 0, medidos = cb?.medidos || 0
    if (semMedida > 0 && !medidos) add('media', 'contraste-nao-medido', `${rot}: contraste não medido no nosso: ${semMedida === 1 ? 'o único texto está' : `os ${semMedida} textos estão`} sobre imagem, degradê ou fundo que o raio-x não lê. Conferir no olhar ou no print se dá para ler.`, { ...ex, medida: { ref: ca?.minimo ?? null, nosso: null, semMedida, medidos } })
    else if (semMedida > 0 && semMedida / (semMedida + medidos) >= 0.3) add('baixa', 'contraste-nao-medido', `${rot}: contraste não medido em ${semMedida} de ${semMedida + medidos} textos do nosso (sobre imagem ou degradê). Conferir esses no olhar ou no print.`, { ...ex, medida: { ref: ca?.minimo ?? null, nosso: cb?.minimo ?? null, semMedida, medidos } })
    for (const [campo, nome, cor] of [['titulo', 'título', b.titulo?.cor], ['texto', 'texto', b.corTexto]]) {
      const va = ca?.[campo], vb = cb?.[campo]
      if (!va || !vb || vb >= va * tol.contrasteMenor.media) continue
      // Já acusado como abaixo do mínimo: uma linha só por texto.
      if (abaixo && pior.razao === vb) continue
      add('media', 'contraste-menor', `${rot}: o ${nome} tem contraste ${fmt(vb)}:1 no nosso contra ${fmt(va)}:1 na referência: o nosso lê mais apagado. ${dizerSugestao(sugerirCor(paleta, b.corFundo, va * tol.contrasteMenor.media, cor), va * tol.contrasteMenor.media)}`, { ...ex, medida: { ref: va, nosso: vb } })
    }
    // Imagem × texto
    if (a.imagemTexto != null && b.imagemTexto != null) {
      const d = Math.abs(a.imagemTexto - b.imagemTexto)
      const g = d >= tol.imagemTexto.alta ? 'alta' : d >= tol.imagemTexto.media ? 'media' : null
      if (g) add(g, 'imagem-texto', `${rot}: imagem ocupa ${pct(a.imagemTexto)} da área na referência e ${pct(b.imagemTexto)} no nosso. ${b.imagemTexto < a.imagemTexto ? 'Dar mais espaço à imagem.' : 'Dar mais espaço ao texto.'}`, { ...ex, medida: { ref: a.imagemTexto, nosso: b.imagemTexto } })
    }
    // Palavras por tela
    const pa = (a.palavrasPorTela || 0) + 5, pb = (b.palavrasPorTela || 0) + 5
    if (pb / pa >= tol.palavrasMais.media) add(pb / pa >= tol.palavrasMais.alta ? 'alta' : 'media', 'palavras', `${rot}: ${b.palavrasPorTela} palavras por tela no nosso contra ${a.palavrasPorTela} na referência. Cortar texto.`, { ...ex, medida: { ref: a.palavrasPorTela, nosso: b.palavrasPorTela } })
    else if (pa / pb >= tol.palavrasMenos.baixa) add('baixa', 'palavras', `${rot}: ${b.palavrasPorTela} palavras por tela no nosso contra ${a.palavrasPorTela} na referência.`, { ...ex, medida: { ref: a.palavrasPorTela, nosso: b.palavrasPorTela } })
    // Altura
    // Altura diferente por causa da duração presa já foi dita acima.
    if (!presaDif && fator(a.alturaTelas, b.alturaTelas) >= tol.alturaSecao.media) add('media', 'altura-secao', `${rot}: ${telas(a.alturaTelas)} na referência, ${telas(b.alturaTelas)} no nosso.`, { ...ex, medida: { ref: a.alturaTelas, nosso: b.alturaTelas } })
    // Título da seção (título decorativo, como marca d'água, não entra)
    if (a.titulo?.razao && b.titulo?.razao && !tituloDecorativo(a) && !tituloDecorativo(b) && fator(a.titulo.razao, b.titulo.razao) >= tol.tituloSecao.media) add('media', 'titulo', `${rot}: título com ${fmt(a.titulo.razao)}× o texto corrido na referência e ${fmt(b.titulo.razao)}× no nosso.`, { ...ex, medida: { ref: a.titulo.razao, nosso: b.titulo.razao } })
  }

  // Cena principal
  const mr = movDe(ref, ref.cenaPrincipal), mn = movDe(nosso, nosso.cenaPrincipal)
  const tr = tipoPrincipal(mr), tn = tipoPrincipal(mn)
  const familia = familiaDaCena(tr, tn)
  const cenaNaFatia = !fatia || fatia.includes(ref.cenaPrincipal)
  const cena = { ref: { secao: ref.cenaPrincipal, tipo: tr, forca: mr.forca }, nosso: { secao: nosso.cenaPrincipal, tipo: tn, forca: mn.forca }, mesmoTipo: tr === tn, equivalente: familia ? familia.como : null, naFatia: cenaNaFatia, razaoForca: mr.forca ? r2(mn.forca / mr.forca) : null }
  const ex = { secaoRef: ref.cenaPrincipal, secaoNossa: nosso.cenaPrincipal }
  if (!cenaNaFatia) avisos.push(`A cena principal da referência (seção ${ref.cenaPrincipal + 1}) está fora da fatia: tipo, posição e força da cena não foram comparados.`)
  if (cenaNaFatia && tr !== tn) {
    if (familia) add('media', 'cena-tipo', `Cena principal: a da referência (seção ${ref.cenaPrincipal + 1}) é "${tr}"; a nossa (seção ${nosso.cenaPrincipal + 1}) é "${tn}". São da mesma família (${familia.como}): o raio-x separa pelo detalhe da medida. Conferir no print que o golpe na tela é o mesmo; se for, manter.`, { ...ex, medida: { ref: tr, nosso: tn }, equivalente: familia.como })
    else add('alta', 'cena-tipo', `Cena principal: a da referência (seção ${ref.cenaPrincipal + 1}) é "${tr}"; a nossa (seção ${nosso.cenaPrincipal + 1}) é "${tn}". Refazer a nossa com o mesmo tipo de movimento.`, { ...ex, medida: { ref: tr, nosso: tn } })
  }
  if (cenaNaFatia && nossoDe.get(ref.cenaPrincipal) !== nosso.cenaPrincipal) add('media', 'cena-posicao', `Cena principal em outro lugar: na referência é a seção ${ref.cenaPrincipal + 1}${fatia ? '' : ` de ${A.length}`}; no nosso, a seção ${nosso.cenaPrincipal + 1} de ${B.length}${nossoDe.has(ref.cenaPrincipal) ? ` (a equivalente da referência é a nossa ${nossoDe.get(ref.cenaPrincipal) + 1})` : ''}.`, ex)
  if (cenaNaFatia && cena.razaoForca !== null) {
    const q = cena.razaoForca
    const g = q < tol.forcaCena.alta ? 'alta' : q < tol.forcaCena.media ? 'media' : q > tol.forcaCena.exagero ? 'media' : null
    if (g) add(g, 'cena-forca', q > 1 ? `Cena principal mais forte que a da referência (força ${fmt(mn.forca)} contra ${fmt(mr.forca)}): conferir se não é exagero.` : `Cena principal mais fraca que a da referência (força ${fmt(mn.forca)} contra ${fmt(mr.forca)}): falta duração presa ou camadas.`, { ...ex, medida: { ref: mr.forca, nosso: mn.forca } })
  }

  div.sort((x, y) => ORDEM[x.gravidade] - ORDEM[y.gravidade] || (x.secaoRef ?? -1) - (y.secaoRef ?? -1))
  const conta = { alta: 0, media: 0, baixa: 0 }
  for (const d of div) conta[d.gravidade]++
  return {
    versao: 1, ref: ref.url, nosso: nosso.url, viewport: { ref: vr, nosso: vn }, fatia,
    secoes: { ref: A.length, nosso: B.length }, pares: par.pares, semParRef: par.semParRef, semParNosso: par.semParNosso,
    escala: { ref: er, nosso: en }, cenaPrincipal: cena, contagem: conta, divergencias: div, avisos, tolerancias: tol,
  }
}

export function codigoDeSaida(comp) {
  return comp.divergencias.some((d) => d.gravidade === 'alta') ? 1 : 0
}

// ---------------------------------------------------------------------------------------------------------
// Lighthouse ("melhor que")
// ---------------------------------------------------------------------------------------------------------
export function lerLighthouse(json) {
  const lhr = json?.lhr || json
  if (!lhr?.audits || !lhr?.categories) throw new Error('O arquivo não parece um relatório JSON do Lighthouse.')
  const num = (id) => (typeof lhr.audits[id]?.numericValue === 'number' ? lhr.audits[id].numericValue : null)
  const nota = (id) => (typeof lhr.categories[id]?.score === 'number' ? Math.round(lhr.categories[id].score * 100) : null)
  const inp = num('interaction-to-next-paint') ?? num('experimental-interaction-to-next-paint')
  const r = {
    formato: lhr.configSettings?.formFactor === 'desktop' ? 'computador' : lhr.configSettings?.formFactor === 'mobile' ? 'celular' : null,
    desempenho: nota('performance'), acessibilidade: nota('accessibility'),
    lcpMs: num('largest-contentful-paint'), cls: num('cumulative-layout-shift'), inpMs: inp, tbtMs: inp === null ? num('total-blocking-time') : null,
  }
  r.passa = {
    lcp: r.lcpMs === null ? null : r.lcpMs <= LIMITES_WEB.lcpMs,
    cls: r.cls === null ? null : r.cls <= LIMITES_WEB.cls,
    inp: r.inpMs !== null ? r.inpMs <= LIMITES_WEB.inpMs : r.tbtMs !== null ? r.tbtMs <= LIMITES_WEB.tbtMs : null,
  }
  return r
}

function blocoMelhorQue(lh) {
  const L = ['## Melhor que (velocidade e acessibilidade do nosso)']
  if (!lh) { L.push('Não medido: rodar o Lighthouse no celular e passar o JSON com `--lighthouse`.'); return L }
  const ok = (b) => (b === null ? '' : b ? ' — ok' : ' — **acima do limite**')
  const ms = (v) => (v === null ? 'não medido' : `${fmt(v / 1000)} s`)
  if (lh.formato) L.push(`Medido no ${lh.formato}.`)
  L.push(`- Desempenho: ${lh.desempenho ?? 'não medido'}${lh.desempenho !== null ? '/100' : ''}`)
  L.push(`- Acessibilidade: ${lh.acessibilidade ?? 'não medido'}${lh.acessibilidade !== null ? '/100' : ''}`)
  L.push(`- LCP: ${ms(lh.lcpMs)} (limite 2,5 s)${ok(lh.passa.lcp)}`)
  L.push(`- CLS: ${lh.cls === null ? 'não medido' : fmt(Math.round(lh.cls * 1000) / 1000)} (limite 0,1)${ok(lh.passa.cls)}`)
  if (lh.inpMs !== null) L.push(`- INP: ${Math.round(lh.inpMs)} ms (limite 200 ms)${ok(lh.passa.inp)}`)
  else if (lh.tbtMs !== null) L.push(`- TBT (no lugar do INP, que só se mede com interação): ${Math.round(lh.tbtMs)} ms (limite 200 ms)${ok(lh.passa.inp)}`)
  else L.push('- INP/TBT: não medido')
  return L
}

// ---------------------------------------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------------------------------------
const ROTULO = { alta: 'ALTA', media: 'média', baixa: 'baixa' }

export function gerarMarkdown(comp, { lighthouse = null, tol = TOLERANCIAS } = {}) {
  const L = ['# Comparação com a referência', '']
  L.push(`Referência: ${comp.ref} (de terceiro, só para estudo) · nosso: ${comp.nosso}`)
  L.push(`Seções comparadas: ${descFatia(comp)}`)
  L.push(`Seções (sem cabeçalho): referência ${comp.secoes.ref}${comp.fatia ? ' na fatia' : ''}, nosso ${comp.secoes.nosso}; ${comp.pares.length} com par.`)
  const c = comp.cenaPrincipal
  L.push(`Cena principal: referência seção ${c.ref.secao + 1} ("${c.ref.tipo}", força ${fmt(c.ref.forca)}); nosso seção ${c.nosso.secao + 1} ("${c.nosso.tipo}", força ${fmt(c.nosso.forca)}).`)
  L.push(`Resultado: ${comp.contagem.alta} alta, ${comp.contagem.media} média, ${comp.contagem.baixa} baixa → ${comp.contagem.alta ? '**não passa** (corrigir as altas)' : 'passa no portão'}.`, '')
  if (comp.avisos.length) { for (const a of comp.avisos) L.push(`> ${a}`); L.push('') }
  L.push('## Corrigir (mais grave primeiro)')
  if (!comp.divergencias.length) L.push('Nenhuma divergência acima das tolerâncias.')
  comp.divergencias.slice(0, tol.maxItensMd).forEach((d, i) => L.push(`${i + 1}. [${ROTULO[d.gravidade]}] ${d.texto}`))
  if (comp.divergencias.length > tol.maxItensMd) L.push(`… e mais ${comp.divergencias.length - tol.maxItensMd} (ver comparacao.json).`)
  L.push('', ...blocoMelhorQue(lighthouse), '')
  L.push('Seção N = a mesma numeração do roteiro.md e dos prints do raio-x. Tolerâncias no topo de comparar-referencia.mjs.')
  L.push('Olhar de diretor de arte (nota 0–10 por seção, o que denuncia gerador): `olhar.md`, na mesma pasta.')
  return L.join('\n') + '\n'
}

function descFatia(comp) {
  return comp.fatia ? `${comp.fatia.map((i) => i + 1).join(', ')} da referência (fatia; as demais ficaram de fora e não geram divergência).` : 'a página inteira.'
}

// Seções que vão para o lado a lado e o olhar: as da fatia (com o cabeçalho, se pedido) ou o corpo inteiro.
// Cada uma com a nossa equivalente (o par; para o cabeçalho, o nosso cabeçalho).
export function secoesMostradas(comp, ref, nosso) {
  const secN = new Map(nosso.secoes.map((s) => [s.indice, s]))
  const lista = comp.fatia ? ref.secoes.filter((s) => comp.fatia.includes(s.indice)) : corpo(ref)
  return lista.map((a) => {
    if (a.papel === 'cabeçalho') return { a, b: nosso.secoes.find((s) => s.papel === 'cabeçalho') || null }
    const p = comp.pares.find((x) => x.ref === a.indice)
    return { a, b: p ? secN.get(p.nosso) : null }
  })
}

const caminhoPrint = (base, sec) => `${base ? base + '/' : ''}${sec.print}`

// Roteiro do olhar de diretor de arte: só prepara o material (prints lado a lado e perguntas); não chama modelo.
export function gerarOlhar(comp, ref, nosso, caminhos) {
  const L = ['# Olhar de diretor de arte', '']
  L.push(`Referência: ${comp.ref} (de terceiro, só para estudo) · nosso: ${comp.nosso}`)
  L.push(`Seções comparadas: ${descFatia(comp)}`, '')
  L.push('As medidas do `comparacao.md` não bastam: o número sozinho aprova um fundo ruim. Abrir os dois prints de cada',
    'seção lado a lado (caminhos relativos a esta pasta), responder às 5 perguntas comparando com a referência e dar',
    'a nota: 10 = no nível da referência; 7 = perto, com detalhes a acertar; abaixo de 7 = refazer a seção.', '')
  for (const { a, b } of secoesMostradas(comp, ref, nosso)) {
    const cena = ref.cenaPrincipal === a.indice ? ' · cena principal' : ''
    L.push(`## Seção ${a.indice + 1} da referência ↔ ${b ? `nossa ${b.indice + 1}` : 'sem equivalente no nosso'}${cena}`, '')
    const pr = a.print ? caminhoPrint(caminhos.ref, a) : null, pn = b?.print ? caminhoPrint(caminhos.nosso, b) : null
    L.push('| Referência | Nosso |', '|---|---|')
    const link = (p) => encodeURI(p).replace(/\(/g, '%28').replace(/\)/g, '%29')
    L.push(`| ${pr ? `![Referência, seção ${a.indice + 1}](${link(pr)})` : 'sem print'} | ${pn ? `![Nosso, seção ${b.indice + 1}](${link(pn)})` : 'sem print'} |`, '')
    L.push(`Arquivos: \`${pr || '—'}\` · \`${pn || '—'}\``, '')
    PERGUNTAS_OLHAR.forEach((q, i) => L.push(`${i + 1}. ${q}`, '   - '))
    L.push('', 'Nota (0–10): __ · Denuncia gerador: __', '')
  }
  L.push('## Devolver', 'Além da lista de divergências do `comparacao.md`, uma linha por seção:', '```',
    'seção N: nota X/10 · denuncia gerador: … (ou "nada") · corrigir primeiro: …', '```', '')
  return L.join('\n')
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// caminhos: { ref: pasta do raio-x da referência relativa ao HTML, nosso: idem } (com barras "/").
export function gerarLadoALado(comp, ref, nosso, caminhos) {
  const img = (base, sec) => (sec?.print ? `<img loading="lazy" src="${esc(encodeURI(caminhoPrint(base, sec)))}" alt="Print da seção ${sec.indice + 1}">` : '<p class="sem">sem print</p>')
  const secN = new Map(nosso.secoes.map((s) => [s.indice, s]))
  const lista = (ds) => (ds.length ? `<ul>${ds.map((d) => `<li class="${d.gravidade}"><b>${ROTULO[d.gravidade]}</b> ${esc(d.texto)}</li>`).join('')}</ul>` : '<p class="ok">Sem divergência nesta seção.</p>')
  const rot = (rx, s) => (s ? `Seção ${s.indice + 1} · ${esc(descSecao(rx, s))}${rx.cenaPrincipal === s.indice ? ' · <b>cena principal</b>' : ''}` : 'sem equivalente')
  const olhar = `<details class="olhar"><summary>Olhar de diretor de arte (nota 0–10)</summary><ol>${PERGUNTAS_OLHAR.map((q) => `<li>${esc(q)}</li>`).join('')}</ol><p>Nota: __/10 · Denuncia gerador: __</p></details>`
  const linhas = []
  const usadas = new Set()
  for (const { a, b } of secoesMostradas(comp, ref, nosso)) {
    const ds = comp.divergencias.filter((d) => d.secaoRef === a.indice || (b && d.secaoNossa === b.indice && d.secaoRef === null))
    ds.forEach((d) => usadas.add(d))
    linhas.push(`<section class="par"><div><h3>Referência — ${rot(ref, a)}</h3>${img(caminhos.ref, a)}</div><div><h3>Nosso — ${rot(nosso, b)}</h3>${b ? img(caminhos.nosso, b) : '<p class="sem">—</p>'}</div>${lista(ds)}${olhar}</section>`)
  }
  for (const j of comp.fatia ? [] : comp.semParNosso) {
    const b = secN.get(j)
    const ds = comp.divergencias.filter((d) => !usadas.has(d) && d.secaoNossa === j)
    ds.forEach((d) => usadas.add(d))
    linhas.push(`<section class="par"><div><h3>Referência — sem equivalente</h3><p class="sem">—</p></div><div><h3>Nosso — ${rot(nosso, b)}</h3>${img(caminhos.nosso, b)}</div>${lista(ds)}</section>`)
  }
  const geral = comp.divergencias.filter((d) => !usadas.has(d))
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lado a lado com a referência</title><style>
:root{--fundo:#f6f5f2;--texto:#1d1d1b;--suave:#66635c;--caixa:#fff;--alta:#b3261e;--media:#8a5a00;--baixa:#4f5b66}
@media (prefers-color-scheme:dark){:root{--fundo:#161615;--texto:#ecebe6;--suave:#a5a29a;--caixa:#22221f;--alta:#ff8a80;--media:#f0c060;--baixa:#a9b6c2}}
*{box-sizing:border-box}body{margin:0;padding:24px 16px;font:15px/1.5 system-ui,sans-serif;background:var(--fundo);color:var(--texto)}
main{max-width:1500px;margin:0 auto}.aviso{background:var(--caixa);border-left:4px solid var(--media);padding:10px 14px;margin:12px 0}
.par{display:grid;grid-template-columns:1fr 1fr;gap:16px;background:var(--caixa);padding:14px;margin:18px 0;border-radius:6px}
.par ul,.par .ok,.par .olhar{grid-column:1/-1;margin:0}.olhar summary{cursor:pointer;color:var(--suave)}.olhar ol{margin:6px 0}h3{font-size:14px;margin:0 0 8px;color:var(--suave);font-weight:500}
img{width:100%;height:auto;display:block;border:1px solid #8884}li{margin:4px 0}.alta b{color:var(--alta)}.media b{color:var(--media)}.baixa b{color:var(--baixa)}
.sem{color:var(--suave)}@media (max-width:700px){.par{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Lado a lado com a referência</h1>
<p class="aviso">A referência (<b>${esc(comp.ref)}</b>) é de terceiro e está aqui só para estudo de estrutura e ritmo. Não copiar texto, foto, marca nem código dela.</p>
<p>Nosso: ${esc(comp.nosso)} · ${comp.contagem.alta} alta, ${comp.contagem.media} média, ${comp.contagem.baixa} baixa. Referência à esquerda, nosso à direita.</p>
<p>Seções comparadas: ${esc(descFatia(comp))}</p>
<p class="aviso">Olhar de diretor de arte: em cada seção, responder às perguntas abaixo dos prints e dar nota 0–10 (10 = no nível da referência; abaixo de 7 = refazer). O roteiro completo para devolver está em <b>olhar.md</b>.</p>
${geral.length ? `<h2>Página inteira</h2>${lista(geral)}` : ''}
${linhas.join('\n')}
</main></body></html>
`
}

// ---------------------------------------------------------------------------------------------------------
// Leitura às cegas (só prepara o material; não chama modelo nenhum)
// ---------------------------------------------------------------------------------------------------------
function sorteador(semente) {
  let a = semente >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

// sites: [{ rx, pasta (onde está o raio-x.json), origem: 'nosso' | 'referencia' }]. O gabarito vai fora da pasta.
export function montarCegas({ sites, pasta, gabarito, semente = Date.now() }) {
  const destino = path.resolve(pasta), gab = path.resolve(gabarito)
  if (!path.relative(destino, gab).startsWith('..')) throw new Error('O gabarito não pode ficar dentro da pasta às cegas.')
  if (fs.existsSync(destino) && fs.readdirSync(destino).length) throw new Error(`A pasta às cegas precisa ser nova ou vazia: ${pasta}`)
  fs.mkdirSync(destino, { recursive: true })
  const rnd = sorteador(semente)
  const ordem = sites.map((s) => ({ s, k: rnd() })).sort((x, y) => x.k - y.k).map((x) => x.s)
  const letras = 'ABCDEFGH'
  const resposta = {}, avisos = []
  ordem.forEach((site, i) => {
    const L = letras[i]
    const abertura = corpo(site.rx).find((s) => s.print)
    const cena = site.rx.secoes.find((s) => s.indice === site.rx.cenaPrincipal && s.print)
    const quadros = []
    for (const [nome, sec] of [['1', abertura], ['2', cena]]) {
      if (!sec) { avisos.push(`${L}: sem print para o quadro ${nome}.`); continue }
      if (nome === '2' && abertura && sec.indice === abertura.indice) continue
      const ext = path.extname(sec.print) || '.jpg'
      const arq = `${L}-${nome}${ext}`
      fs.copyFileSync(path.join(site.pasta, sec.print), path.join(destino, arq))
      quadros.push(arq)
    }
    resposta[L] = { origem: site.origem, url: site.rx.url, quadros }
  })
  const n = ordem.length
  const pergunta = [
    '# Leitura às cegas', '',
    `Há ${n} sites, chamados ${Object.keys(resposta).join(', ')}. Cada um tem até dois quadros: \`X-1\` é a abertura e \`X-2\` é a cena mais marcante (quando é a própria abertura, só há \`X-1\`).`,
    'Olhe só as imagens; não procure os sites.', '',
    '1. Ordene do melhor para o pior acabamento: tipografia, imagem, espaço, alinhamento, coerência entre os quadros.',
    '2. Diga qual parece feito por gerador automático (ou "nenhum") e por quê, apontando o que se vê no quadro.',
    '3. Para cada site, uma frase: o que mais ajuda e o que mais atrapalha.', '',
    'Responda assim:', '```', 'ordem: X, X, X, X', 'gerado: X (motivo) | nenhum', 'X: ajuda … / atrapalha …', '```', '',
  ].join('\n')
  fs.writeFileSync(path.join(destino, 'pergunta.md'), pergunta)
  const nossa = Object.keys(resposta).find((k) => resposta[k].origem === 'nosso')
  fs.mkdirSync(path.dirname(gab), { recursive: true })
  fs.writeFileSync(gab, JSON.stringify({ semente, nosso: nossa, letras: resposta, regra: `Reprova se ${nossa} ficar em último na ordem ou for apontado como "gerado".`, avisos }, null, 1))
  return { letras: Object.keys(resposta), nosso: nossa, avisos }
}

// ---------------------------------------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------------------------------------
class ErroDeUso extends Error {}

// "1-3", "1,2,5" ou "1-3,6" (numeração do roteiro, a partir de 1) → números em ordem, sem repetição.
export function lerListaSecoes(texto) {
  const nums = new Set()
  for (const parte of String(texto).split(',').map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(parte)
    if (!m) throw new ErroDeUso(`--secoes: "${parte}" não é número nem faixa (ex.: 1-3 ou 1,2,5)`)
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a
    if (a < 1 || b < a) throw new ErroDeUso(`--secoes: faixa inválida "${parte}" (começa em 1, do menor para o maior)`)
    if (b - a > 500) throw new ErroDeUso(`--secoes: faixa grande demais "${parte}"`)
    for (let n = a; n <= b; n++) nums.add(n)
  }
  if (!nums.size) throw new ErroDeUso('--secoes vazio')
  return [...nums].sort((x, y) => x - y)
}

function lerArgs(argv) {
  const pos = [], op = { celular: false, copiarPrints: false, outras: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--celular') op.celular = true
    else if (a === '--copiar-prints') op.copiarPrints = true
    else if (['--lighthouse', '--cegas', '--outras', '--semente', '--secoes'].includes(a)) {
      const v = argv[++i]
      if (!v || v.startsWith('--')) throw new ErroDeUso(`Falta o valor de ${a}`)
      if (a === '--outras') op.outras = v.split(',').map((x) => x.trim()).filter(Boolean)
      else if (a === '--semente') { op.semente = Number(v); if (!Number.isFinite(op.semente)) throw new ErroDeUso('Semente inválida') }
      else if (a === '--secoes') op.secoes = lerListaSecoes(v)
      else op[a.slice(2)] = v
    } else if (a.startsWith('--')) throw new ErroDeUso(`Opção desconhecida: ${a}`)
    else pos.push(a)
  }
  if (pos.length !== 3) throw new ErroDeUso('Uso: node comparar-referencia.mjs <raio-x-da-referencia.json> <url-do-nosso | raio-x-nosso.json> <pasta-saida> [--secoes 1-3] [--copiar-prints] [--celular] [--lighthouse arq.json] [--cegas pasta --outras a.json,b.json]')
  if (op.outras.length && !op.cegas) throw new ErroDeUso('--outras só vale com --cegas')
  if (op.outras.length > 2) throw new ErroDeUso('--outras aceita no máximo 2 (com a referência principal são 3)')
  return { ref: pos[0], nosso: pos[1], saida: pos[2], ...op }
}

function lerRaioX(arq) {
  let rx
  try { rx = JSON.parse(fs.readFileSync(arq, 'utf8')) } catch (e) { throw new ErroDeUso(`Não li o raio-x ${arq}: ${e.message}`) }
  if (!Array.isArray(rx?.secoes) || !Array.isArray(rx?.movimento)) throw new ErroDeUso(`${arq} não é um raio-x.json`)
  return rx
}

// Caminho relativo para o HTML; em outro disco (Windows) não há relativo e vai o endereço file:// inteiro.
const rel = (de, para) => {
  const r = path.relative(de, para)
  return path.isAbsolute(r) ? new URL('file:///' + para.replace(/\\/g, '/').replace(/^\//, '')).href : r.split(path.sep).join('/')
}
const dentroDe = (pasta, alvo) => { const r = path.relative(pasta, alvo); return !r.startsWith('..') && !path.isAbsolute(r) }

// Copia os prints das seções para <saida>/<nome>/ (mesmo caminho relativo do raio-x) e devolve <nome>.
// Pasta do raio-x já dentro da saída: nada a copiar, devolve o caminho relativo.
export function copiarPrints(saida, pastaRx, secoes, nome, avisar = () => {}) {
  if (dentroDe(saida, pastaRx)) return rel(saida, pastaRx)
  const destino = path.join(saida, nome)
  for (const s of secoes) {
    if (!s?.print) continue
    const de = path.resolve(pastaRx, s.print), para = path.resolve(destino, s.print)
    if (!dentroDe(pastaRx, de) || !dentroDe(destino, para)) { avisar(`Print fora da pasta do raio-x, não copiado: ${s.print}`); continue }
    if (!fs.existsSync(de)) { avisar(`Print não encontrado: ${de}`); continue }
    fs.mkdirSync(path.dirname(para), { recursive: true })
    fs.copyFileSync(de, para)
  }
  return nome
}

export async function comparar(op, avisar = console.log) {
  const saida = path.resolve(op.saida)
  const refArq = path.resolve(op.ref)
  const ref = lerRaioX(refArq)
  let nosso, nossoArq
  if (/^(https?|file):/i.test(op.nosso)) {
    const pasta = path.join(saida, 'nosso')
    const r = await raioX({ url: op.nosso, saida: pasta, celular: op.celular, avisar })
    if (r?.parou) throw new Error(r.parou)
    nosso = r; nossoArq = path.join(pasta, 'raio-x.json')
  } else {
    nossoArq = path.resolve(op.nosso); nosso = lerRaioX(nossoArq)
    if (op.celular && !nosso.viewport?.celular) avisar('Aviso: --celular pedido, mas o raio-x nosso é de computador.')
  }
  let lighthouse = null
  const lhArq = op.lighthouse ? path.resolve(op.lighthouse) : path.join(saida, 'lighthouse.json')
  if (op.lighthouse || fs.existsSync(lhArq)) {
    try { lighthouse = lerLighthouse(JSON.parse(fs.readFileSync(lhArq, 'utf8'))) } catch (e) { throw new ErroDeUso(`Lighthouse: ${e.message}`) }
  }
  let secoes = null
  if (op.secoes) {
    const existe = new Set(ref.secoes.map((s) => s.indice + 1))
    const fora = op.secoes.filter((n) => !existe.has(n))
    if (fora.length) throw new ErroDeUso(`--secoes: a referência não tem a(s) seção(ões) ${fora.join(', ')} (tem 1 a ${ref.secoes.length}).`)
    secoes = op.secoes.map((n) => n - 1)
    if (!corpo(ref).some((s) => secoes.includes(s.indice))) throw new ErroDeUso('--secoes: a fatia só tem o cabeçalho; incluir ao menos uma seção de conteúdo.')
  }
  fs.mkdirSync(saida, { recursive: true })
  const comp = compararRaioX(ref, nosso, TOLERANCIAS, { secoes })
  comp.melhorQue = lighthouse || 'não medido'
  let caminhos = { ref: rel(saida, path.dirname(refArq)), nosso: rel(saida, path.dirname(nossoArq)) }
  if (op.copiarPrints) {
    const mostradas = secoesMostradas(comp, ref, nosso)
    const nossas = [...mostradas.map((x) => x.b), ...(comp.fatia ? [] : comp.semParNosso.map((j) => nosso.secoes.find((s) => s.indice === j)))]
    caminhos = {
      ref: copiarPrints(saida, path.dirname(refArq), mostradas.map((x) => x.a), 'copia-referencia', avisar),
      nosso: copiarPrints(saida, path.dirname(nossoArq), nossas, 'copia-nosso', avisar),
    }
  } else if (/^file:/.test(caminhos.ref) || /^file:/.test(caminhos.nosso)) {
    avisar('Aviso: prints em outro disco viram endereço file:// absoluto; para abrir a pasta em outro computador, usar --copiar-prints.')
  }
  fs.writeFileSync(path.join(saida, 'comparacao.json'), JSON.stringify(comp, null, 1))
  fs.writeFileSync(path.join(saida, 'comparacao.md'), gerarMarkdown(comp, { lighthouse }))
  fs.writeFileSync(path.join(saida, 'olhar.md'), gerarOlhar(comp, ref, nosso, caminhos))
  fs.writeFileSync(path.join(saida, 'lado-a-lado.html'), gerarLadoALado(comp, ref, nosso, caminhos))
  if (op.cegas) {
    const sites = [{ rx: nosso, pasta: path.dirname(nossoArq), origem: 'nosso' }, { rx: ref, pasta: path.dirname(refArq), origem: 'referencia' }]
    for (const o of op.outras) { const a = path.resolve(o); sites.push({ rx: lerRaioX(a), pasta: path.dirname(a), origem: 'referencia' }) }
    try {
      const r = montarCegas({ sites, pasta: op.cegas, gabarito: path.join(saida, 'gabarito-cegas.json'), semente: op.semente ?? Date.now() })
      avisar(`Às cegas: ${r.letras.length} sites em ${op.cegas}; gabarito em ${path.join(saida, 'gabarito-cegas.json')}.`)
    } catch (e) { throw new ErroDeUso(e.message) }
  }
  avisar(`Comparação: ${comp.contagem.alta} alta, ${comp.contagem.media} média, ${comp.contagem.baixa} baixa. Saída em ${saida}`)
  return comp
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let op
  try { op = lerArgs(process.argv.slice(2)) } catch (e) { console.error(e.message); process.exit(2) }
  try {
    const comp = await comparar(op)
    process.exit(codigoDeSaida(comp))
  } catch (e) { console.error(e.message); process.exit(2) }
}
