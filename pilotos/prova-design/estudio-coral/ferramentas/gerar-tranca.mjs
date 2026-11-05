// Gera a animação Lottie da trança (autoria própria) e o poster SVG do último quadro.
// Uso: node ferramentas/gerar-tranca.mjs  →  public/animacoes/tranca.json + public/animacoes/tranca-final.svg
//
// Modelo: três mechas x_k(t) = cx + A·sin(t + 2πk/3), descendo em y. A mecha que vai para o meio passa por
// cima (profundidade z_k = −sin 2(t + φ_k)), que é a regra da trança de três. Cada mecha é cortada em trechos
// de π/3 com exatamente um cruzamento no meio; cada trecho vira uma camada, e as camadas de cada trecho são
// empilhadas pela profundidade no cruzamento. Uma borda da cor do papel sob a mecha de cima abre o vão do
// "por cima/por baixo". As pontas soltas abaixo da frente da trança acompanham as mãos (posição por quadro).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------- cores (as mesmas do site, em OKLCH) ----------
function oklch(L, C, h) {
  const hr = (h * Math.PI) / 180, a = C * Math.cos(hr), b = C * Math.sin(hr)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
  return lin.map((x) => { x = Math.min(1, Math.max(0, x)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 })
}
const misturar = (c1, c2, p) => c1.map((v, i) => v * (1 - p) + c2[i] * p)
const hex = (c) => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
const COR = {
  coral: oklch(0.68, 0.19, 32), cobalto: oklch(0.58, 0.17, 262), tinta: oklch(0.18, 0.02, 32), papel: oklch(0.97, 0.012, 70),
}

// ---------- geometria ----------
const W = 600, H = 1000, FR = 30
const CX = W / 2, A = 112 // meia largura do vaivém de cada mecha
const LARG = 76 // espessura da mecha
const VAO = 9 // folga de papel em volta da mecha de cima
const Y0 = 122 // começo da trança (logo abaixo do prendedor)
const TRECHOS = 12 // trechos de π/3 (12 = duas voltas completas)
const PASSO = 58 // altura de cada trecho
const DT = Math.PI / 3
const T_FIM = TRECHOS * DT
const FASE = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
const CORES = [COR.coral, COR.cobalto, COR.tinta]
const FIO = CORES.map((c, k) => misturar(c, COR.papel, k === 2 ? 0.28 : 0.3)) // fios claros dentro da mecha

const yDe = (t) => Y0 + (t / DT) * PASSO
const ponto = (k, t) => [CX + A * Math.sin(t + FASE[k]), yDe(t)]
const derivada = (k, t) => [A * Math.cos(t + FASE[k]), PASSO / DT]
const profundidade = (k, t) => -Math.sin(2 * (t + FASE[k]))
function pontoDesloc(k, t, d) {
  const [x, y] = ponto(k, t), [dx, dy] = derivada(k, t), n = Math.hypot(dx, dy)
  return [x + (-dy / n) * d, y + (dx / n) * d]
}
function derivDesloc(k, t, d) {
  const e = 1e-4, a = pontoDesloc(k, t - e, d), b = pontoDesloc(k, t + e, d)
  return [(b[0] - a[0]) / (2 * e), (b[1] - a[1]) / (2 * e)]
}

// Caminho Lottie (vértices + alças de Bézier relativas) de uma curva paramétrica entre ta e tb.
const r1 = (v) => Math.round(v * 10) / 10
function caminho(f, df, ta, tb, n = 10) {
  const h = (tb - ta) / n, v = [], i = [], o = []
  for (let j = 0; j <= n; j++) {
    const t = ta + j * h, p = f(t), d = df(t)
    v.push([r1(p[0]), r1(p[1])])
    i.push(j === 0 ? [0, 0] : [r1((-d[0] * h) / 3), r1((-d[1] * h) / 3)])
    o.push(j === n ? [0, 0] : [r1((d[0] * h) / 3), r1((d[1] * h) / 3)])
  }
  return { v, i, o, c: false }
}
function svgCaminho({ v, i, o }) {
  let s = `M${v[0][0]} ${v[0][1]}`
  for (let j = 1; j < v.length; j++) {
    const a = v[j - 1], b = v[j]
    s += `C${r1(a[0] + o[j - 1][0])} ${r1(a[1] + o[j - 1][1])} ${r1(b[0] + i[j][0])} ${r1(b[1] + i[j][1])} ${b[0]} ${b[1]}`
  }
  return s
}
// Fração do comprimento percorrida até t (para a frente da trança andar reta em y nas três mechas).
function fracao(k, ta, tb, t) {
  const n = 200, comp = (lim) => {
    let s = 0, ant = ponto(k, ta)
    for (let j = 1; j <= n; j++) { const p = ponto(k, ta + ((lim - ta) * j) / n); s += Math.hypot(p[0] - ant[0], p[1] - ant[1]); ant = p }
    return s
  }
  return comp(t) / comp(tb)
}

// ---------- tempo (quadros) ----------
const Q = { consulta: [0, 30], preparo: [30, 62], trancado: [62, 214], finalizacao: [214, 240] }
const OP = 240
const tFrente = (q) => Math.min(T_FIM, Math.max(0, ((q - Q.trancado[0]) / (Q.trancado[1] - Q.trancado[0])) * T_FIM))
const quadroDeT = (t) => Q.trancado[0] + (t / T_FIM) * (Q.trancado[1] - Q.trancado[0])

// ---------- peças Lottie ----------
const fixo = (k) => ({ a: 0, k })
const LIN = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } }
const animado = (kfs, segurar = false) => ({ a: 1, k: kfs.map(([t, s], j) => (j === kfs.length - 1 ? { t, s: [s] } : { t, s: [s], ...(segurar ? { h: 1 } : LIN) })) })
const transformacao = () => ({ ty: 'tr', p: fixo([0, 0]), a: fixo([0, 0]), s: fixo([100, 100]), r: fixo(0), o: fixo(100), sk: fixo(0), sa: fixo(0) })
const traco = (cor, larg) => ({ ty: 'st', c: fixo([...cor, 1]), o: fixo(100), w: fixo(larg), lc: 2, lj: 2, ml: 4 })
const preenchimento = (cor) => ({ ty: 'fl', c: fixo([...cor, 1]), o: fixo(100), r: 1 })
const corte = (inicio, fim) => ({ ty: 'tm', s: typeof inicio === 'number' ? fixo(inicio) : inicio, e: typeof fim === 'number' ? fixo(fim) : fim, o: fixo(0), m: 1 })
const grupo = (nm, it) => ({ ty: 'gr', nm, it: [...it, transformacao()] })
const forma = (k) => ({ ty: 'sh', ks: fixo(k) })
function camada(ind, nm, shapes, ks = {}) {
  return { ddd: 0, ind, ty: 4, nm, sr: 1, ao: 0, ip: 0, op: OP, st: 0, bm: 0, shapes,
    ks: { o: fixo(100), r: fixo(0), p: fixo([0, 0, 0]), a: fixo([0, 0, 0]), s: fixo([100, 100, 100]), ...ks } }
}
function retangulo(x, y, w, h, raio) {
  return { ty: 'rc', d: 1, p: fixo([x, y]), s: fixo([w, h]), r: fixo(raio) }
}

// ---------- montagem ----------
const camadas = [] // índice 0 = mais à frente
const svg = { frente: [], tras: [] }
let ind = 1

// Trechos da trança: cada um com quadros-chave do corte para a frente avançar junto nas três mechas.
const trechos = []
for (let n = 0; n < TRECHOS; n++) {
  const ta = n * DT, tb = ta + DT, tc = ta + DT / 2
  const ordem = [0, 1, 2].sort((a, b) => profundidade(b, tc) - profundidade(a, tc)) // mais alto primeiro
  trechos.push({ n, ta, tb, tc, ordem })
}
// Do último trecho para o primeiro: trechos vizinhos não se tocam, a ordem entre eles não importa.
for (const tr of [...trechos].reverse()) {
  for (const k of tr.ordem) {
    const amostras = 8
    const kfFim = [], kfBorda = []
    for (let j = 0; j <= amostras; j++) {
      const t = tr.ta + (DT * j) / amostras
      const f = fracao(k, tr.ta, tr.tb, t) * 100
      kfFim.push([Math.round(quadroDeT(t) * 100) / 100, Math.round(f * 100) / 100])
      kfBorda.push([Math.round(quadroDeT(t) * 100) / 100, Math.round(Math.min(84, Math.max(16, f)) * 100) / 100])
    }
    const centro = caminho((t) => ponto(k, t), (t) => derivada(k, t), tr.ta, tr.tb)
    const fios = [-0.2, 0.17].map((d) => caminho((t) => pontoDesloc(k, t, d * LARG), (t) => derivDesloc(k, t, d * LARG), tr.ta, tr.tb))
    const borda = grupo('vao', [forma(centro), corte(16, animado(kfBorda)), traco(COR.papel, LARG + VAO * 2)])
    const corpo = grupo('mecha', [forma(centro), corte(0, animado(kfFim)), traco(CORES[k], LARG)])
    const fio = grupo('fios', [...fios.map(forma), corte(0, animado(kfFim)), traco(FIO[k], 4.5)])
    camadas.push(camada(0, `trecho ${tr.n} mecha ${k}`, [fio, corpo, borda]))
    // poster
    const vaoSvg = caminho((t) => ponto(k, t), (t) => derivada(k, t), tr.ta + DT * 0.16, tr.tb - DT * 0.16)
    svg.frente.push(`<path d="${svgCaminho(vaoSvg)}" stroke="${hex(COR.papel)}" stroke-width="${LARG + VAO * 2}"/>` +
      `<path d="${svgCaminho(centro)}" stroke="${hex(CORES[k])}" stroke-width="${LARG}"/>` +
      fios.map((f) => `<path d="${svgCaminho(f)}" stroke="${hex(FIO[k])}" stroke-width="4.5"/>`).join(''))
  }
}
svg.frente.reverse() // no SVG o último desenhado fica na frente

// Prendedor de cima (raiz) e elástico do fim.
const LARG_RAIZ = 2 * A * 0.866 + LARG + 24
const raizCamada = camada(0, 'prendedor', [grupo('prendedor', [retangulo(0, 0, LARG_RAIZ, 46, 23), preenchimento(COR.tinta)])], {
  p: fixo([CX, Y0 - 14, 0]),
})
raizCamada.ks.s = { a: 1, k: [
  { t: Q.preparo[0], s: [0, 100, 100], i: { x: [0.3, 0.3, 0.3], y: [1.4, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
  { t: Q.preparo[0] + 14, s: [100, 100, 100] },
] }
const yFim = yDe(T_FIM)
const xs = [0, 1, 2].map((k) => ponto(k, T_FIM)[0])
const LARG_ELASTICO = Math.max(...xs) - Math.min(...xs) + LARG + 20
const xElastico = (Math.max(...xs) + Math.min(...xs)) / 2
const elastico = camada(0, 'elastico', [grupo('elastico', [retangulo(0, 0, LARG_ELASTICO, 34, 17), preenchimento(COR.tinta)])], {
  p: fixo([xElastico, yFim, 0]),
  s: { a: 1, k: [
    { t: Q.finalizacao[0], s: [0, 0, 100], i: { x: [0.3, 0.3, 0.3], y: [1.5, 1.5, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
    { t: Q.finalizacao[0] + 16, s: [100, 100, 100] },
  ] },
})
camadas.unshift(elastico)
camadas.unshift(raizCamada) // prendedor na frente de tudo

// Pontas soltas: uma cópia por altura (0 = atrás, 2 = na frente); a opacidade escolhe a cópia certa por quadro.
const COMP_PONTA = 600
const pontaCaminho = (lado, d = 0) => caminho(
  (u) => [lado * 30 * Math.sin(u * Math.PI * 0.5) ** 2 + d * LARG, u * COMP_PONTA],
  (u) => [lado * 30 * Math.PI * 0.5 * Math.sin(u * Math.PI), COMP_PONTA], 0, 1, 6)
const xSolta = [CX + 2, CX + 56, CX - 54] // consulta: mechas soltas na mesma ordem em que vão trançar (tinta, coral, cobalto)
const rSolta = [-2, -9, 7]
const xIni = [0, 1, 2].map((k) => ponto(k, 0)[0])
const suave = (u) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3
function estadoPonta(k, q) {
  if (q <= Q.preparo[0]) {
    const balanco = Math.sin((q / Q.preparo[0]) * Math.PI * 2) * [2.5, -2, 3][k]
    return { x: xSolta[k], y: Y0 - 2, r: rSolta[k] + balanco }
  }
  if (q <= Q.trancado[0]) {
    const e = suave((q - Q.preparo[0]) / (Q.trancado[0] - Q.preparo[0]))
    const x = xSolta[k] + (xIni[k] - xSolta[k]) * e
    return { x, y: Y0 - 2 + 2 * e, r: rSolta[k] * (1 - e) + ((x - CX) / A) * -5 * e }
  }
  const t = tFrente(q), [x, y] = ponto(k, t)
  const abre = suave((q - Q.finalizacao[0]) / (Q.finalizacao[1] - Q.finalizacao[0]))
  return { x, y, r: ((x - CX) / A) * -(5 + 6 * abre) }
}
const alturaPonta = (k, q) => {
  if (q < Q.trancado[0]) return [1, 2, 0][k] // cobalto na frente enquanto soltas
  const t = tFrente(q), z = [0, 1, 2].map((j) => profundidade(j, t))
  return [0, 1, 2].sort((a, b) => z[a] - z[b]).indexOf(k)
}
const quadrosPonta = []
for (let q = 0; q <= OP; q += 3) quadrosPonta.push(q)
if (quadrosPonta.at(-1) !== OP) quadrosPonta.push(OP)
const LADO = [0.6, -0.2, -0.7]
// Uma camada-mãe invisível por mecha guarda posição e giro; as três cópias de altura herdam dela.
const maes = [0, 1, 2].map((k) => {
  const kfX = [], kfY = [], kfR = []
  for (const q of quadrosPonta) { const e = estadoPonta(k, q); kfX.push([q, r1(e.x)]); kfY.push([q, r1(e.y)]); kfR.push([q, r1(e.r)]) }
  return { ddd: 0, ind: 900 + k, ty: 3, nm: `mao ${k}`, sr: 1, ao: 0, ip: 0, op: OP, st: 0, bm: 0,
    ks: { o: fixo(0), r: animado(kfR), p: { s: true, x: animado(kfX), y: animado(kfY) }, a: fixo([0, 0, 0]), s: fixo([100, 100, 100]) } }
})
const pontas = []
for (let altura = 2; altura >= 0; altura--) {
  for (let k = 0; k < 3; k++) {
    const kfO = []
    let ultimaO = null
    for (let q = 0; q <= OP; q++) {
      const o = alturaPonta(k, q) === altura ? 100 : 0
      if (o !== ultimaO) { kfO.push([q, o]); ultimaO = o }
    }
    if (kfO.length === 1) kfO.push([OP, kfO[0][1]])
    const fio = pontaCaminho(LADO[k]), fiosPonta = [-0.2, 0.17].map((d) => pontaCaminho(LADO[k], d))
    const c = camada(0, `ponta ${k} altura ${altura}`, [
      grupo('fios', [...fiosPonta.map(forma), traco(FIO[k], 4.5)]),
      grupo('mecha', [forma(fio), traco(CORES[k], LARG)]),
      grupo('vao', [forma(fio), traco(COR.papel, LARG + VAO * 2)]),
    ], { o: animado(kfO, true) })
    c.parent = 900 + k
    pontas.push(c)
    if (altura === alturaPonta(k, OP)) {
      const e = estadoPonta(k, OP)
      const g = `<g transform="translate(${r1(e.x)} ${r1(e.y)}) rotate(${r1(e.r)})">`
      svg.tras.push({ altura, s: `${g}<path d="${svgCaminho(fio)}" stroke="${hex(COR.papel)}" stroke-width="${LARG + VAO * 2}"/>` +
        `<path d="${svgCaminho(fio)}" stroke="${hex(CORES[k])}" stroke-width="${LARG}"/>` +
        fiosPonta.map((f) => `<path d="${svgCaminho(f)}" stroke="${hex(FIO[k])}" stroke-width="4.5"/>`).join('') + '</g>' })
    }
  }
}
camadas.push(...pontas, ...maes)
camadas.forEach((c) => { if (c.ty !== 3) c.ind = ind++ })

const lottie = { v: '5.12.0', fr: FR, ip: 0, op: OP, w: W, h: H, nm: 'tranca-estudio-coral', ddd: 0, assets: [], layers: camadas,
  meta: { g: 'gerar-tranca.mjs (autoria própria, Estúdio Coral demo)' } }
const saida = path.join(raiz, 'public', 'animacoes')
fs.mkdirSync(saida, { recursive: true })
fs.writeFileSync(path.join(saida, 'tranca.json'), JSON.stringify(lottie))

// Poster: último quadro (pontas atrás, trança, prendedor e elástico na frente).
const tras = svg.tras.sort((a, b) => a.altura - b.altura).map((p) => p.s).join('')
const poster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${tras}${svg.frente.join('')}</g>` +
  `<rect x="${r1(xElastico - LARG_ELASTICO / 2)}" y="${r1(yFim - 17)}" width="${r1(LARG_ELASTICO)}" height="34" rx="17" fill="${hex(COR.tinta)}"/>` +
  `<rect x="${r1(CX - LARG_RAIZ / 2)}" y="${Y0 - 14 - 23}" width="${r1(LARG_RAIZ)}" height="46" rx="23" fill="${hex(COR.tinta)}"/></svg>`
fs.writeFileSync(path.join(saida, 'tranca-final.svg'), poster)
const kb = (f) => (fs.statSync(path.join(saida, f)).size / 1024).toFixed(1) + ' KB'
console.log(`tranca.json ${kb('tranca.json')} · tranca-final.svg ${kb('tranca-final.svg')} · ${camadas.length} camadas · cores ${Object.entries(COR).map(([n, c]) => n + ' ' + hex(c)).join(', ')}`)
