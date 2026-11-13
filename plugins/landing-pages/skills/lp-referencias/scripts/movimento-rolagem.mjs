// Rolagem por alvo: transforma as medidas completas do raio-x (amostras-brutas.json, opção --bruto) em itens do
// inventário de movimento, um por alvo e por movimento. Não depende de GSAP exposto nem de animação CSS declarada:
// só do que cada elemento fez na tela a cada passo da rolagem.
//
//   const bruto = JSON.parse(fs.readFileSync('referencia/amostras-brutas.json', 'utf8'))   // { prep, s, amostras }
//   const itens = itensDaRolagem(bruto, { vh: 900, papeis: raioX.secoes.map((s) => s.papel) })
//
// Os itens saem no formato do contrato, sem "id" (quem numera é o movimento.mjs). Nomes de elemento vêm do site: são
// dado, nunca ordem.

import { curvaDaTrajetoria, ritmoEstimado } from './raio-x.mjs'
import { MUDANCAS } from './movimento-quadros.mjs'

const r2 = (n) => Math.round(n * 100) / 100
const mediana = (l) => { const o = [...l].sort((a, b) => a - b); return o.length ? (o.length % 2 ? o[(o.length - 1) / 2] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2) : 0 }

// Trechos em que uma série muda: [{ a, b }] com a = último passo antes da mudança e b = passo em que ela acaba.
// Um passo parado no meio não corta o trecho; mudança de sentido corta (aparecer e sumir são dois movimentos).
export function trechosDeMudanca(vals, eps) {
  const out = []
  let atual = null, parados = 0
  for (let k = 1; k < vals.length; k++) {
    const d = vals[k] == null || vals[k - 1] == null ? 0 : vals[k] - vals[k - 1]
    if (Math.abs(d) <= eps) { if (atual && ++parados > 1) { out.push(atual); atual = null } continue }
    const sinal = Math.sign(d)
    if (atual && atual.sinal !== sinal) { out.push(atual); atual = null }
    if (!atual) atual = { a: k - 1, b: k, sinal }
    else atual.b = k
    parados = 0
  }
  if (atual) out.push(atual)
  return out
}

// Recorte (clip-path) lido componente a componente: { fn, n: [números], u: [unidades] }; null quando não há recorte.
export function partesDoRecorte(c) {
  const m = String(c || '').match(/^\s*([a-z-]+)\((.*)\)\s*$/i)
  if (!m) return null
  const n = [], u = []
  for (const p of m[2].matchAll(/(-?\d*\.?\d+(?:e[-+]?\d+)?)([a-z%]*)/gi)) { n.push(Number(p[1])); u.push(p[2].toLowerCase()) }
  return { fn: m[1].toLowerCase(), n, u }
}

// Trechos em que o recorte muda, comparando cada componente com ele mesmo (somar tudo apagava o movimento em que um
// lado abre enquanto o outro fecha). A unidade de cada componente é a do primeiro valor diferente de zero; zero vale
// em qualquer unidade; sem recorte conta como inset todo em zero. Formato ou unidade que troca no meio do caminho
// não se compara por número: aí vale o texto ter mudado. Devolve [{ a, b, vals }] (vals = componente que mais muda).
export function trechosDoRecorte(E, { minimo = 0.5, eps = 0.05 } = {}) {
  const P = E.map((e) => (e ? partesDoRecorte(e.c) : null))
  const ref = P.find(Boolean)
  if (!ref) return []
  const cabe = (p) => p.fn === ref.fn && p.n.length === ref.n.length
  const un = ref.n.map(() => null)
  for (const p of P) if (p && cabe(p)) p.n.forEach((v, i) => { if (v !== 0 && un[i] === null) un[i] = p.u[i] })
  const lin = E.map((e, k) => {
    if (!e) return null
    if (!P[k]) return ref.fn === 'inset' ? ref.n.map(() => 0) : 'outro'
    return cabe(P[k]) && P[k].n.every((v, i) => v === 0 || P[k].u[i] === un[i]) ? P[k].n : 'outro'
  })
  const achados = []
  ref.n.forEach((_, i) => {
    const vals = lin.map((l) => (Array.isArray(l) ? l[i] : null))
    for (const t of trechosDeMudanca(vals, eps)) {
      const faixa = Math.abs(vals[t.b] - vals[t.a])
      if (faixa >= minimo) achados.push({ a: t.a, b: t.b, vals, faixa })
    }
  })
  for (let k = 1; k < E.length; k++) {
    if (lin[k] && lin[k - 1] && (lin[k] === 'outro' || lin[k - 1] === 'outro') && (E[k].c || 'none') !== (E[k - 1].c || 'none')) achados.push({ a: k - 1, b: k, vals: null, faixa: 0 })
  }
  // componentes que mudam nos mesmos passos são um recorte só; trechos que só se encostam são movimentos seguidos
  achados.sort((p, q) => p.a - q.a || p.b - q.b)
  const out = []
  for (const t of achados) {
    const g = out.find((g) => t.a < g.b && t.b > g.a)
    if (!g) { out.push({ ...t }); continue }
    g.a = Math.min(g.a, t.a); g.b = Math.max(g.b, t.b)
    if (t.faixa > g.faixa) { g.vals = t.vals; g.faixa = t.faixa }
  }
  return out.map(({ a, b, vals }) => ({ a, b, vals }))
}

// Dois irmãos fazem o mesmo movimento? Mesmo sentido e mesmo tamanho: na posição conta o quanto andou (cada irmão
// parte do seu lugar); nas outras medidas contam o estado de partida e o de chegada; e o mesmo tanto de rolagem.
export function mesmaTrajetoria(p, q, { passoPx = 0 } = {}) {
  const a = p.item, b = q.item
  if (a.rolagem.presa !== b.rolagem.presa) return false
  if (Math.abs((p.fim - p.ini) - (q.fim - q.ini)) > Math.max(passoPx, (p.fim - p.ini) * 0.25)) return false
  const perto = (x, y, chao) => Math.abs(x - y) <= Math.max(chao, Math.abs(x) * 0.1)
  for (const k of new Set([...Object.keys(a.de), ...Object.keys(b.de)])) {
    const [d1, p1, d2, p2] = [a.de[k], a.para[k], b.de[k], b.para[k]]
    if ([d1, p1, d2, p2].some((v) => typeof v !== 'number')) { if (d1 !== d2 || p1 !== p2) return false; continue }
    if (k === 'xPx' || k === 'yPx') { if (!perto(p1 - d1, p2 - d2, 4)) return false; continue }
    const chao = k === 'larguraPx' || k === 'alturaPx' ? 4 : k === 'desfoquePx' ? 0.5 : 0.05
    if (!perto(d1, d2, chao) || !perto(p1, p2, chao)) return false
  }
  return true
}

// bruto = { prep: { vw, vh, secoes: [{ desc, topo, altura, elementos: [{ desc, pai, cadeia, midia, ov }] }] },
//           s: [rolagem em px por passo], amostras: [{ assentoMs, secoes: [{ e: [estado | null], a?: [ms] }] }] }
// a[j] (opcional) = quanto tempo o elemento j ainda mudou depois de a rolagem parar naquele passo. assentoMs é o da
// página inteira: só diz algo de um alvo quando ele foi o único que mudou naquele passo.
// estado = { t, l, w, h, o, sx?, sy?, c?, p?, bg?, bl?, br? } (ver medir() no raio-x.mjs)
// derivas[i][j] (opcional, a cada 4 passos) = quantos px o elemento andou para o lado em 250 ms com a página parada.
// O que foi descartado por não ser movimento de um alvo vai em avisos (opção avisos: [] recebe uma cópia; o array
// devolvido também traz .avisos, não enumerável, para não mudar quem só conta ou espalha os itens).
export function itensDaRolagem(bruto, { vh = null, vw = null, papeis = [], pagina = 'inicio', avisos: avisosFora = null } = {}) {
  const { prep, s, amostras } = bruto
  vh = vh || prep.vh || 900
  vw = vw || prep.vw || 1440
  const N = s.length
  const itens = []
  const avisos = []
  const telas = (px) => String(r2(px / vh)).replace('.', ',')
  const andou = (k) => Math.abs(s[k] - s[k - 1]) > 2

  // Página inteira mudando de lugar (pin recalculado, altura da página mudando enquanto mede): no passo k, 3 ou mais
  // seções (bloco de cima, fora do lugar na página) andam o mesmo tanto (2 px ou 5%). Não vota quem ficou parado na
  // tela nem quem é fixo (seções presas dariam um falso "andaram o quanto rolou"). O deslocamento vale para as seções
  // desta para baixo (mudar a altura empurra o que vem depois; o que vem antes não sai do lugar).
  const tolDesl = (d) => Math.max(2, Math.abs(d) * 0.05)
  const desl = new Array(N).fill(null)
  for (let k = 1; k < N; k++) {
    const votos = []
    prep.secoes.forEach((sec, i) => {
      if ((sec.elementos[0]?.pai ?? -1) >= 0) return
      const e = amostras[k]?.secoes[i]?.e[0], ea = amostras[k - 1]?.secoes[i]?.e[0]
      if (!e || !ea || e.p === 'f' || ea.p === 'f' || (andou(k) && Math.abs(e.t - ea.t) <= 2)) return
      const dy = e.t + s[k] - (ea.t + s[k - 1])
      if (Math.abs(dy) > 1) votos.push({ i, dy })
    })
    let junto = []
    for (const v of votos) { const g = votos.filter((w) => Math.abs(w.dy - v.dy) <= tolDesl(v.dy)); if (g.length > junto.length) junto = g }
    if (junto.length >= 3) desl[k] = { d: mediana(junto.map((v) => v.dy)), n: junto.length, desde: Math.min(...junto.map((v) => v.i)) }
  }
  for (let k = 1; k < N; k++) {
    if (!desl[k] || desl[k - 1]) continue
    let f = k
    while (f + 1 < N && desl[f + 1]) f++
    const janela = desl.slice(k, f + 1)
    avisos.push(`A página inteira mudou de lugar entre ${telas(s[k - 1])} e ${telas(s[f])} telas (${Math.max(...janela.map((x) => x.n))} seções juntas, até ${Math.round(Math.max(...janela.map((x) => Math.abs(x.d))))} px): pin recalculado ou altura da página mudando durante a medida; descontado, não virou item de movimento.`)
  }
  // passo -> alvos (seção:elemento) que mudaram nele; diz se o assento da página pode ser de um alvo só
  const mudaramNoPasso = new Map()
  const pendentes = []
  const noAlto = (e) => e && e.t < vh && e.t + e.h > 0
  for (let i = 0; i < prep.secoes.length; i++) {
    const sec = prep.secoes[i]
    const est = sec.elementos.map((_, j) => amostras.map((m) => m.secoes[i]?.e[j] ?? null))
    // preso no passo k: não saiu do lugar na tela enquanto a página andou
    const preso = (j, k) => k > 0 && est[j][k] && est[j][k - 1] && Math.abs(est[j][k].t - est[j][k - 1].t) <= 2 && Math.abs(s[k] - s[k - 1]) > 2 && noAlto(est[j][k])
    const cadeiaDe = (j) => { const c = []; for (let x = j, n = 0; x >= 0 && n < 20; x = sec.elementos[x].pai ?? -1, n++) c.push(x); return c }
    const gatilho = /rodap/i.test(String(papeis[i] || '')) ? 'rodape' : 'rolagem'
    const daSecao = []

    sec.elementos.forEach((el, j) => {
      const E = est[j]
      if (!E.some(noAlto)) return
      const pai = el.pai ?? -1
      const P = pai >= 0 ? est[pai] : null
      // posição própria: em relação ao pai (ou à página, no bloco de cima); parado na tela não conta (é cena presa)
      const y = [], x = []
      let soma = 0
      for (let k = 0; k < N; k++) {
        const e = E[k], ea = E[k - 1]
        if (!e || (P && !P[k])) { y.push(null); x.push(null); continue }
        x.push(e.l - (P ? P[k].l : 0))
        const rel = P ? e.t - P[k].t : e.t + s[k]
        if (k > 0 && ea && (!P || P[k - 1])) {
          // Fixo (position fixed): o lugar dele é o da tela; em relação à página ele "andaria" o quanto rolou.
          if (e.p === 'f' && ea.p === 'f') soma += e.t - ea.t
          // Parado na tela com a página andando não é movimento dele, mesmo fora da tela (fixo escondido por
          // transform, display:none com caixa zerada): antes só valia na tela e o fixo escondido somava a rolagem toda.
          else if (andou(k) && Math.abs(e.t - ea.t) <= 2) {}
          else {
            const antes = P ? ea.t - P[k - 1].t : ea.t + s[k - 1]
            // No passo em que o próprio elemento prende ou solta (o pai segue rolando), ele anda só parte do passo: é a
            // borda da cena presa, não movimento dele.
            const borda = !(pai >= 0 && preso(pai, k)) && (preso(j, k - 1) || preso(j, k + 1))
            let d = rel - antes
            // a página inteira andou neste passo: desconta (quem andou só isso fica parado; quem andou mais fica com o seu)
            if (!P && desl[k] && i >= desl[k].desde) d = Math.abs(d - desl[k].d) <= tolDesl(desl[k].d) ? 0 : d - desl[k].d
            if (!preso(j, k) && !borda) soma += d
          }
        }
        y.push(soma)
      }
      const semEscala = !E.some((e) => e && (e.sx || e.sy))
      const tam0 = E.find(Boolean)
      const medidas = [
        { muda: 'opacidade', chave: 'opacidade', vals: E.map((e) => (e ? e.o ?? 1 : null)), minimo: 0.15, eps: 0.004 },
        { muda: 'desfoque', chave: 'desfoquePx', vals: E.map((e) => (e ? e.bl ?? 0 : null)), minimo: 1, eps: 0.05 },
        { muda: 'brilho', chave: 'brilho', vals: E.map((e) => (e ? e.br ?? 1 : null)), minimo: 0.1, eps: 0.004 },
        { muda: 'escala', chave: 'escala', vals: E.map((e) => (e ? e.sx ?? e.sy ?? 1 : null)), minimo: 0.04, eps: 0.002 },
        { muda: 'posicao-x', chave: 'xPx', vals: x, minimo: vw * 0.03, eps: 0.5 },
        { muda: 'posicao-y', chave: 'yPx', vals: y, minimo: vh * 0.04, eps: 0.5 },
      ]
      if (semEscala && !el.cadeia && (el.midia || el.ov) && tam0) {
        medidas.push({ muda: 'largura', chave: 'larguraPx', vals: E.map((e) => (e ? e.w : null)), minimo: Math.max(24, tam0.w * 0.1), eps: 0.5 })
        medidas.push({ muda: 'altura', chave: 'alturaPx', vals: E.map((e) => (e ? e.h : null)), minimo: Math.max(24, tam0.h * 0.1), eps: 0.5 })
      }
      // Anda para o lado com a página parada (carrossel automático, faixa que corre): decidido pelo elemento, com todas
      // as medidas sem rolar dele (só existem a cada 4 passos; um trecho curto ou a volta do laço quase nunca tem 2):
      // 2 ou mais com 2 px ou mais em 250 ms, o mesmo corte do marquee no raio-x. Aí os trechos de posicao-x dele saem,
      // menos os de cena presa (rolagem lateral com scrub lento também anda depois de a rolagem parar): esses ficam,
      // com aviso.
      const dv = []
      for (let k = 0; k < N; k++) { const d = amostras[k]?.derivas?.[i]?.[j]; if (typeof d === 'number') dv.push(d) }
      const sozinhoX = dv.filter((d) => Math.abs(d) >= 2).length >= 2
      const foraX = [], presoX = []
      const achados = []
      for (const m of medidas) {
        for (const t of trechosDeMudanca(m.vals, m.eps)) {
          if (Math.abs(m.vals[t.b] - m.vals[t.a]) < m.minimo) continue
          if (m.muda === 'posicao-x' && sozinhoX) {
            const cad = cadeiaDe(j)
            let nPresos = 0
            for (let k = t.a + 1; k <= t.b; k++) if (cad.some((c) => preso(c, k))) nPresos++
            if (nPresos < (t.b - t.a) * 0.5) { foraX.push(t); continue }
            presoX.push(t)
          }
          achados.push({ ...t, muda: m.muda, de: { [m.chave]: r2(m.vals[t.a]) }, para: { [m.chave]: r2(m.vals[t.b]) }, vals: m.vals })
        }
      }
      if (sozinhoX && (foraX.length || presoX.length)) {
        const mexe = dv.filter((d) => Math.abs(d) >= 2).length
        const janela = (l) => `entre ${telas(s[Math.min(...l.map((t) => t.a))])} e ${telas(s[Math.max(...l.map((t) => t.b))])} telas`
        if (foraX.length) avisos.push(`${el.desc} (seção ${i}) anda para o lado com a página parada (${mexe} de ${dv.length} medidas sem rolar): movimento que anda sozinho (carrossel ou faixa); ${foraX.length} ${foraX.length > 1 ? 'trechos' : 'trecho'} ${janela(foraX)} não ${foraX.length > 1 ? 'viraram' : 'virou'} item de rolagem.`)
        if (presoX.length) avisos.push(`${el.desc} (seção ${i}) anda para o lado com a página parada (${mexe} de ${dv.length} medidas sem rolar), mas com a cena presa ${janela(presoX)}: ficou como item de rolagem lateral; conferir pelos quadros se não é carrossel.`)
      }
      for (const t of trechosDoRecorte(E)) achados.push({ ...t, muda: 'recorte', de: { recorte: E[t.a].c || 'none' }, para: { recorte: E[t.b].c || 'none' } })
      // cor de fundo da seção (só o bloco de cima traz bg)
      if (j === 0) {
        const ks = []
        for (let k = 1; k < N; k++) if (E[k] && E[k - 1] && E[k].bg && E[k - 1].bg && E[k].bg !== E[k - 1].bg) ks.push(k)
        if (ks.length) achados.push({ a: ks[0] - 1, b: ks[ks.length - 1], muda: 'fundo', de: { fundo: E[ks[0] - 1].bg }, para: { fundo: E[ks[ks.length - 1]].bg }, vals: null })
      }
      if (!achados.length) return
      // medidas que mudam no mesmo trecho são um movimento só
      achados.sort((p, q) => p.a - q.a || p.b - q.b)
      const grupos = []
      for (const t of achados) {
        const g = grupos.find((g) => Math.min(g.b, t.b) - Math.max(g.a, t.a) >= Math.min(g.b - g.a, t.b - t.a) * 0.5 && !g.partes.some((p) => p.muda === t.muda))
        if (g) { g.a = Math.min(g.a, t.a); g.b = Math.max(g.b, t.b); g.partes.push(t) } else grupos.push({ a: t.a, b: t.b, partes: [t] })
      }
      grupos.sort((p, q) => p.a - q.a)
      grupos.forEach((g, n) => {
        const passos = []
        for (let k = g.a + 1; k <= g.b; k++) passos.push(k)
        const cadeia = cadeiaDe(j)
        const presos = passos.filter((k) => cadeia.some((c) => preso(c, k)))
        const presa = presos.length >= passos.length * 0.5
        let presaTelas = 0
        if (presa) {
          const meio = presos[Math.floor(presos.length / 2)]
          const quem = [...cadeia].reverse().find((c) => preso(c, meio))
          let ini = meio, fim = meio
          while (ini - 1 > 0 && preso(quem, ini - 1)) ini--
          while (fim + 1 < N && preso(quem, fim + 1)) fim++
          presaTelas = r2((s[fim] - s[ini - 1]) / vh)
        }
        // dispara e toca sozinho: a mudança inteira cabe em até 2 passos e ESTE alvo ainda mudou depois de a rolagem
        // parar. Com a medida por alvo (a[j]) vale ela; sem ela, o assento é o da página e fica pendente até se saber
        // quem mais mudou no mesmo passo (ver "pendentes", no fim).
        const porAlvo = passos.some((k) => Array.isArray(amostras[k]?.secoes[i]?.a))
        const assentos = passos.map((k) => (porAlvo ? amostras[k]?.secoes[i]?.a?.[j] : amostras[k]?.assentoMs) || 0)
        const sozinho = g.b - g.a <= 2 && assentos.some((ms) => ms >= 100)
        for (const k of passos) { if (!mudaramNoPasso.has(k)) mudaramNoPasso.set(k, new Set()); mudaramNoPasso.get(k).add(i + ':' + j) }
        const ritmo = sozinho ? ritmoEstimado({ assentos, elementos: [{ estados: E }], s, vw }) : null
        const principal = g.partes.find((p) => p.vals) || null
        const muda = MUDANCAS.filter((m) => g.partes.some((p) => p.muda === m))
        daSecao.push({
          j, pai, ini: s[g.a], fim: s[g.b],
          item: {
            pagina, secao: i, gatilho, ordem: n + 1,
            alvo: { desc: el.desc, texto: '', quantos: 1, dataMov: el.dataMov ?? null },
            quemMuda: ['proprio'], muda,
            de: Object.assign({}, ...g.partes.map((p) => p.de)), para: Object.assign({}, ...g.partes.map((p) => p.para)),
            duracaoMs: sozinho ? ritmo?.duracaoMs ?? null : null,
            curva: sozinho ? ritmo?.curva ?? null : null,
            atrasoMs: 0, escadaMs: 0,
            rolagem: { inicioTelas: r2(s[g.a] / vh), fimTelas: r2(s[g.b] / vh), inicioNaSecao: r2((s[g.a] - sec.topo) / (sec.altura || vh)), fimNaSecao: r2((s[g.b] - sec.topo) / (sec.altura || vh)),
              presa, presaTelas, acompanha: !sozinho,
              ...(!sozinho && principal ? { curvaNaRolagem: curvaDaTrajetoria(passos.concat(g.a).sort((p, q) => p - q).map((k) => s[k]), passos.concat(g.a).sort((p, q) => p - q).map((k) => principal.vals[k] ?? 0)) } : {}) },
            fontes: ['amostra'], confianca: 'media',
            tecnica: sozinho ? 'dispara num ponto da rolagem e toca sozinho' : presa ? 'ligado à rolagem, com a cena presa' : 'ligado à rolagem',
            resumo: '', quadros: null,
          },
        })
        if (sozinho && !porAlvo) pendentes.push({ d: daSecao[daSecao.length - 1], quem: i + ':' + j, passos: passos.filter((k) => (amostras[k]?.assentoMs || 0) >= 100) })
      })
    })

    // irmãos iguais (mesmo pai, mesmo nome, mesma trajetória) viram um item com "quantos" e a escada entre eles;
    // irmão que vai para outro lado ou termina em outro estado fica em item próprio
    const porChave = new Map()
    for (const d of daSecao) {
      const k = [d.pai, d.item.alvo.desc, d.item.muda.join('+'), d.item.ordem, d.item.rolagem.acompanha].join('|')
      if (!porChave.has(k)) porChave.set(k, [])
      porChave.get(k).push(d)
    }
    const grupos = []
    for (const lista of porChave.values()) {
      lista.sort((p, q) => p.ini - q.ini || p.j - q.j)
      const iguais = []
      for (const d of lista) {
        const g = iguais.find((g) => mesmaTrajetoria(g[0], d, { passoPx: N > 1 ? Math.abs(s[1] - s[0]) : 0 }))
        if (g) g.push(d); else iguais.push([d])
      }
      grupos.push(...iguais)
    }
    for (const grupo of grupos) {
      const it = grupo[0].item
      if (grupo.length > 1) {
        const passos = []
        for (let n = 1; n < grupo.length; n++) passos.push(grupo[n].ini - grupo[n - 1].ini)
        it.alvo.quantos = grupo.length
        it.rolagem.cadaUmTelas = r2(mediana(grupo.map((d) => d.fim - d.ini)) / vh)
        it.rolagem.escadaTelas = r2(mediana(passos) / vh)
        const fim = Math.max(...grupo.map((d) => d.fim))
        it.rolagem.fimTelas = r2(fim / vh)
        it.rolagem.fimNaSecao = r2((fim - sec.topo) / (sec.altura || vh))
        // quem é cada degrau: posição na lista de elementos da seção (amostras-brutas) e a ordem de entrada
        it.rolagem.participantes = grupo.map((d, n) => ({ ordem: n + 1, elemento: d.j, inicioTelas: r2(d.ini / vh), fimTelas: r2(d.fim / vh) }))
      }
      const nomes = { 'posicao-x': 'anda para o lado', 'posicao-y': 'sobe ou desce', escala: 'muda de tamanho', rotacao: 'gira', opacidade: 'muda a opacidade', desfoque: 'desfoca', brilho: 'muda o brilho', recorte: 'abre ou fecha o recorte', largura: 'muda a largura', altura: 'muda a altura', fundo: 'troca a cor de fundo' }
      it.resumo = `${it.alvo.quantos > 1 ? `${it.alvo.quantos} × ` : ''}${it.alvo.desc}: ${it.muda.map((m) => nomes[m] || m).join(', ')} entre ${String(it.rolagem.inicioTelas).replace('.', ',')} e ${String(it.rolagem.fimTelas).replace('.', ',')} telas de rolagem` +
        (it.rolagem.acompanha ? (it.rolagem.presa ? ', com a cena presa' : '') : ', disparado uma vez') + (it.rolagem.escadaTelas ? `, em escada de ${String(it.rolagem.escadaTelas).replace('.', ',')} tela` : '')
      const pronto = { ...it, _ini: grupo[0].ini }
      for (const d of grupo) d.pronto = pronto
      itens.push(pronto)
    }

    // seção que sobe por cima da anterior: a anterior fica presa no alto enquanto esta atravessa a tela
    if (i > 0) {
      const ant = prep.secoes[i - 1]
      const estAnt = ant.elementos.map((_, j) => amostras.map((m) => m.secoes[i - 1]?.e[j] ?? null))
      const presoAnt = (k) => ant.elementos.some((el, j) => (j === 0 || el.cadeia) && k > 0 && estAnt[j][k] && estAnt[j][k - 1] &&
        Math.abs(estAnt[j][k].t - estAnt[j][k - 1].t) <= 2 && Math.abs(s[k] - s[k - 1]) > 2 && estAnt[j][k].t <= vh * 0.1 && estAnt[j][k].t + estAnt[j][k].h >= vh * 0.9)
      const E = est[0]
      const ks = []
      for (let k = 1; k < N; k++) if (E[k] && E[k - 1] && E[k].t < vh && E[k - 1].t > 0 && E[k].t < E[k - 1].t - 2 && presoAnt(k)) ks.push(k)
      if (ks.length && (s[ks[ks.length - 1]] - s[ks[0] - 1]) / vh >= 0.5) {
        const a = ks[0] - 1, b = ks[ks.length - 1]
        const it = {
          pagina, secao: i, gatilho, ordem: 1 + itens.filter((x) => x.secao === i && x.alvo.desc === sec.desc && x.muda.join() === 'posicao-y').length,
          alvo: { desc: sec.desc, texto: '', quantos: 1, dataMov: sec.dataMov ?? null }, quemMuda: ['proprio'], muda: ['posicao-y'],
          de: { topoTelas: r2(E[a].t / vh) }, para: { topoTelas: r2(E[b].t / vh) }, duracaoMs: null, curva: null, atrasoMs: 0, escadaMs: 0,
          rolagem: { inicioTelas: r2(s[a] / vh), fimTelas: r2(s[b] / vh), inicioNaSecao: r2((s[a] - sec.topo) / (sec.altura || vh)), fimNaSecao: r2((s[b] - sec.topo) / (sec.altura || vh)),
            presa: false, presaTelas: 0, acompanha: true, cobre: i - 1 },
          fontes: ['amostra'], confianca: 'media', tecnica: 'a seção anterior fica presa no alto e esta sobe por cima dela',
          resumo: `${sec.desc} sobe por cima da seção anterior (${ant.desc}), que fica presa`, quadros: null, _ini: s[a],
        }
        itens.push(it)
      }
    }
  }
  // Sem medida por alvo, o assento é da página: se outro alvo mudou no mesmo passo, não dá para dizer de quem foi a
  // mudança depois de a rolagem parar. O item continua "toca sozinho", mas com confiança baixa e o motivo escrito.
  for (const p of pendentes) {
    if (!p.passos.some((k) => [...(mudaramNoPasso.get(k) || [])].some((q) => q !== p.quem))) continue
    p.d.pronto.confianca = 'baixa'
    if (!/página inteira/.test(p.d.pronto.tecnica)) p.d.pronto.tecnica += ' (tempo medido na página inteira, com outro alvo mudando no mesmo passo: conferir pelos quadros)'
  }
  itens.sort((p, q) => p.secao - q.secao || p._ini - q._ini)
  const saida = itens.map(({ _ini, ...it }) => it)
  if (Array.isArray(avisosFora)) avisosFora.push(...avisos)
  return Object.defineProperty(saida, 'avisos', { value: avisos, enumerable: false })
}
