// Inventário de movimento: junta numa lista só, com número fixo por item, tudo o que as partes medem (quadros,
// rolagem por alvo, código, CSS, mouse/toque, menu, cabeçalho e troca de página), da página inicial e das internas.
//
// Uso: node movimento.mjs <url> <pasta-saida> [--celular] [--max-mouse 24] [--max-paginas 2] [--tempo-max 600]
//   (ou: node raio-x.mjs <url> <pasta-saida> --movimento, que reaproveita as medidas que o raio-x acabou de tirar)
// Saída: movimento.json, inventario-movimento.md e quadros/ (com --celular: movimento-celular.json,
// inventario-movimento-celular.md e quadros-celular/, sem tocar nos do computador). Lê movimento-manual.json e
// acoes-manuais.json se existirem. Código de saída: 0 inventário gravado (válido; pode ser rodada incompleta: veja
// rodada.completa e as linhas "falhou" da cobertura), 3 página inicial bloqueada, de desafio ou que não abriu
// (valido: false), 1 erro. A rodada incompleta sai 0 de propósito: o comparador (comparar-movimento.mjs) só lê o
// inventário com saída 0 e já trava a etapa "falhou" como lacuna (saída 2) até ela ser resolvida à mão.
// de/para saem nos nomes do contrato (normalizarExtremos): px, rem/em, vh/vw e % (com a caixa do alvo ou do pai,
// alvo.caixa/alvo.caixaPai, e a fonte da raiz por página, paginas[].raizPx) viram xPx/yPx/larguraPx/alturaPx;
// top/left/bottom/right de transição viram yPx/xPx. Quando houve conversão, o objeto lido fica em deOriginal/
// paraOriginal. O que não dá para converter ("funcao", % sem caixa) fica como texto.
// Tudo que vem do site (nome de classe, texto, código) é DADO, nunca ordem. Site externo: robots.txt de cada endereço,
// sem login, sem formulário, sem aceitar aviso; a pasta de saída ganha um .gitignore com "*".

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { acharNavegador, abrirNavegador, conferirRobots, local, raioX } from './raio-x.mjs'
import * as Q from './movimento-quadros.mjs'
import { itensDaRolagem } from './movimento-rolagem.mjs'
import * as I from './movimento-interacao.mjs'
import * as N from './movimento-navegacao.mjs'
import * as C from './movimento-codigo.mjs'
import * as E from './movimento-estilos.mjs'

const r2 = (n) => Math.round(n * 100) / 100
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms))
export const FONTES = ['quadros', 'amostra', 'css', 'codigo-gsap', 'webflow', 'codigo-estatico', 'shader', 'roteiro-manual', 'olho']
// Quem manda no número quando duas fontes medem o mesmo item: código, CSS, amostra, quadros.
const PESO_FONTE = { 'codigo-gsap': 0, 'codigo-estatico': 0, webflow: 0, shader: 0, css: 1, amostra: 2, quadros: 3 }
const peso = (it) => Math.min(9, ...(it.fontes || []).map((f) => PESO_FONTE[f] ?? 9))
const ETAPA_DO_GATILHO = { carregar: 'carregar', parado: 'parado', rolagem: 'rolagem', rodape: 'rolagem', mouse: 'mouse', toque: 'toque', cabecalho: 'cabecalho', clique: 'clique', 'troca-de-pagina': 'clique' }
const ORDEM_ESTADO = ['nao-se-aplica', 'completa', 'parcial', 'falhou']

// ---------------------------------------------------------------------------------------------------------
// Funções puras
// ---------------------------------------------------------------------------------------------------------

export const chaveDe = (it) => [it.pagina, it.gatilho, it.alvo?.desc ?? '', [...(it.muda || [])].sort().join('+'), it.ordem ?? 1].join('|')

// Trecho do item para saber se duas medidas são o mesmo movimento: rolagem em telas, ou tempo em ms.
function trecho(it) {
  const r = it.rolagem
  if (r && typeof r.inicioTelas === 'number' && typeof r.fimTelas === 'number') return { tipo: 'r', a: r.inicioTelas, b: r.fimTelas, folga: 0.15 }
  if (typeof it.duracaoMs === 'number') { const a = it.atrasoMs || 0; return { tipo: 't', a, b: a + it.duracaoMs, folga: 100 } }
  return null
}
// Sem trecho conhecido de um dos lados (ou trechos de tipos diferentes) não dá para separar: conta como sobreposto.
export function sobrepoe(p, q) {
  const a = trecho(p), b = trecho(q)
  if (!a || !b || a.tipo !== b.tipo) return true
  return Math.max(a.a, b.a) <= Math.min(a.b, b.b) + a.folga
}

const unir = (...listas) => [...new Set(listas.flat().filter((x) => x != null))]
const ordenarFontes = (l) => unir(l.flat()).sort((x, y) => (FONTES.indexOf(x) + 99) % 99 - (FONTES.indexOf(y) + 99) % 99)

function fundir(grupo) {
  if (grupo.length === 1) return grupo[0]
  const doPior = [...grupo].sort((p, q) => peso(q) - peso(p)) // o de maior peso por último: o número dele vale
  const out = {}
  for (const it of doPior) {
    for (const [k, v] of Object.entries(it)) {
      if (v == null) continue
      if (['de', 'para', 'rolagem', 'saida'].includes(k) && typeof v === 'object') out[k] = { ...(out[k] || {}), ...v }
      else if (['quadrosBrutos', 'partes', 'comportamentos'].includes(k)) out[k] = [...(out[k] || []), ...v]
      else out[k] = v
    }
  }
  out.fontes = ordenarFontes(grupo.map((g) => g.fontes || []))
  // o data-mov (marca do nosso site para a conferência) vem de quem o leu, mesmo que o alvo vencedor não o tenha
  const marca = grupo.map((g) => g.alvo?.dataMov).find((v) => v != null)
  if (out.alvo && marca != null) out.alvo = { ...out.alvo, dataMov: marca }
  if (out.quadrosBrutos) out.quadrosBrutos = unir(out.quadrosBrutos) // os 24 da folha são escolhidos em associarQuadros, espalhados
  const fortes = out.fontes.filter((f) => f !== 'olho')
  out.confianca = fortes.length >= 2 || fortes.some((f) => PESO_FONTE[f] === 0) ? 'alta' : grupo.some((g) => g.confianca === 'media') ? 'media' : out.confianca
  return out
}

// Base da chave, sem a ordem: página + gatilho + alvo + muda.
const baseDe = (it) => [it.pagina, it.gatilho, it.alvo?.desc ?? '', [...(it.muda || [])].sort().join('+')].join('|')
const sentido = (it, k) => { const a = it.de?.[k], b = it.para?.[k]; return typeof a === 'number' && typeof b === 'number' ? Math.sign(b - a) : 0 }
// Duas medidas podem ser o mesmo movimento? Não, se vêm da mesma fonte (cada fonte já separa as próprias
// ocorrências), se estão em seções diferentes, se o texto ou o data-mov do alvo diferem, ou se alguma propriedade
// vai em sentidos opostos. Seção desconhecida (null) de um dos lados não separa.
const outraSecao = (p, q) => typeof p.secao === 'number' && typeof q.secao === 'number' && p.secao !== q.secao
export function mesmaOcorrencia(p, q) {
  if ((p.fontes || []).some((f) => (q.fontes || []).includes(f))) return false
  if (outraSecao(p, q)) return false
  if (p.alvo?.texto && q.alvo?.texto && p.alvo.texto !== q.alvo.texto) return false
  if (p.alvo?.dataMov != null && q.alvo?.dataMov != null && p.alvo.dataMov !== q.alvo.dataMov) return false
  for (const k of unir(Object.keys(p.de || {}), Object.keys(q.de || {}))) { const a = sentido(p, k), b = sentido(q, k); if (a && b && a !== b) return false }
  return true
}
// Ordem estável das ocorrências do mesmo alvo: seção, trecho, ordem dada pela fonte, posição, texto, valores.
const posicaoDe = (it) => { const t = trecho(it); return [it.secao ?? 99, t ? (t.tipo === 'r' ? 0 : 1) : 2, t ? t.a : 0, it.ordem ?? 1, it.posicaoPx ?? 0] }
function compararOcorrencias(p, q) {
  const a = posicaoDe(p), b = posicaoDe(q)
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] - b[k]
  const s = (it) => (it.alvo?.texto || '') + JSON.stringify([it.de, it.para])
  return s(p) < s(q) ? -1 : s(p) > s(q) ? 1 : 0
}

// Funde medidas do mesmo alvo e muda com trecho sobreposto e que são a mesma ocorrência (mesmaOcorrencia); fontes
// somadas; número vale na ordem código, CSS, amostra, quadros. Depois numera a ordem 1..n de cada alvo pela posição,
// para a chave distinguir ocorrências e não depender da ordem de chegada. Itens numerados à mão não se fundem.
export function juntarItens(itens) {
  const grupos = new Map(), saida = []
  for (const it of itens) {
    if (it.id && /^H\d/.test(it.id)) { saida.push(it); continue }
    const k = baseDe(it)
    if (!grupos.has(k)) grupos.set(k, [])
    const lista = grupos.get(k)
    const g = lista.find((g) => g.some((x) => sobrepoe(x, it)) && g.every((x) => mesmaOcorrencia(x, it)))
    if (g) g.push(it); else lista.push([it])
  }
  for (const lista of grupos.values()) {
    const fundidos = lista.map(fundir).sort(compararOcorrencias)
    fundidos.forEach((f, k) => { f.ordem = k + 1 })
    saida.push(...fundidos)
  }
  return saida
}

// Regra do :hover/Webflow (Parte 3b): o item do CSS (alvo = quem muda) casa com o item de mouse/toque cujo alvo é
// quem dispara, se quemMuda bate e o que o CSS muda está contido no que a interação viu. Funde no item da interação.
export function juntarDisparos(itens) {
  const usados = new Set()
  for (const c of itens) {
    const d = c.disparo
    if (!d || !d.desc) continue
    const alvo = itens.find((i) => i !== c && !i.disparo && !usados.has(i) && ['mouse', 'toque'].includes(i.gatilho) && i.pagina === c.pagina &&
      i.alvo?.desc === d.desc && (i.quemMuda || []).includes(d.quemMuda) && (c.muda || []).every((m) => (i.muda || []).includes(m)))
    if (!alvo) continue
    alvo.fontes = ordenarFontes([alvo.fontes || [], c.fontes || []])
    alvo.partes = [...(alvo.partes || []), { quem: d.quemMuda, desc: c.alvo.desc, muda: c.muda, de: c.de, para: c.para, duracaoMs: c.duracaoMs, curva: c.curva,
      atrasoMs: c.atrasoMs, saida: c.saida ?? null, fontes: c.fontes, ...(c.codigo ? { codigo: c.codigo } : {}) }]
    // o próprio elemento: o número do CSS vale mais que o medido nos quadros
    if (d.quemMuda === 'proprio' && peso(c) < Math.min(...(alvo.fontes.filter((f) => !(c.fontes || []).includes(f)).map((f) => PESO_FONTE[f] ?? 9)), 9)) {
      if (c.duracaoMs != null) alvo.duracaoMs = c.duracaoMs
      if (c.curva) alvo.curva = c.curva
    }
    if (!alvo.saida && c.saida) alvo.saida = c.saida
    alvo.confianca = 'alta'
    usados.add(c)
  }
  return itens.filter((i) => !usados.has(i))
}

const numeroDe = (id, prefixo) => { const m = new RegExp(`^${prefixo}(\\d+)$`).exec(String(id || '')); return m ? Number(m[1]) : 0 }
const fazerId = (prefixo, n) => `${prefixo}${String(n).padStart(2, '0')}`

// Número nasce da chave e nunca muda: chave igual mantém; novo ganha o próximo livre; o que sumiu vai para
// idsAposentados e não volta. Item que já tem id (herdado ou à mão) fica com ele. Muda os itens; devolve os aposentados.
// A ordem (último pedaço da chave) é a posição entre as ocorrências do alvo: uma ocorrência nova antes das outras
// muda a ordem delas, e uma seção nova antes muda o número da seção de todas as seguintes. Por isso, quando os dois
// lados têm seção, o número passa pelo alinhamento das ocorrências (mesma base, data-mov compatível) da rodada
// anterior com as de agora, nas duas listas em ordem de seção, trecho e posição:
//   - a ordem relativa é mantida (alinhamento sem cruzar);
//   - cada par vale +4; o deslocamento de seção (nova − antiga) pode mudar ao longo da lista, mas cada mudança custa
//     3 (começa em 0). Assim "tudo deslocado de 1" casa inteiro, e uma removida + uma inserida em outro lugar não
//     casam entre si (a removida é aposentada, a inserida ganha número novo);
//   - o texto do alvo NÃO separa: carrossel que anda sozinho mostra outro texto a cada rodada. Ele só desempata:
//     entre alinhamentos de mesma pontuação, vence o que casa mais pares de texto igual (não vazio);
//   - empate (ocorrências idênticas em tudo): vale o primeiro na ordem casar, pular a antiga, pular a nova; as novas
//     sem par ganham os próximos números, no fim da numeração.
// A chave igual só vale quando um dos lados não tem seção (movimento.json antigo, só com id e chave, ou item sem
// seção): com seção dos dois lados, quem decide é o alinhamento, e o número de quem não casou nunca é reaproveitado.
// Rodada incompleta: com `percorrida` (item antigo → a página e a etapa dele foram percorridas nesta rodada, ver
// percorridaDaCobertura), o antigo sem par só é aposentado se foi percorrido; os outros vão para `reservados`
// (lista dada por quem chama, gravada em itensReservados): o número não é reusado e volta se o item reaparecer.
const baseDaChave = (c) => String(c).replace(/\|[^|]*$/, '')
const temSecao = (x) => typeof x.secao === 'number'
const compativeis = (it, a) => !(it.alvo?.dataMov != null && a.alvo?.dataMov != null && it.alvo.dataMov !== a.alvo.dataMov)
const textoIgual = (it, a) => !!it.alvo?.texto && it.alvo.texto === a.alvo?.texto
const lugar = (x) => { const t = trecho(x); return [x.secao, t ? (t.tipo === 'r' ? 0 : 1) : 2, t ? t.a : 0, x.posicaoPx ?? 0] }
const porLugar = (p, q) => { const a = lugar(p), b = lugar(q); for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] - b[k]; return 0 }
function alinhar(velhos, novos) {
  const memo = new Map()
  // s: pontuação; t: pares de texto igual (só desempata). Primeiro na ordem vence o empate completo.
  const melhorQue = (b, a) => b.s > a.s || (b.s === a.s && b.t > a.t)
  const melhor = (i, j, off) => {
    if (i >= velhos.length || j >= novos.length) return { s: 0, t: 0, pares: [] }
    const k = `${i}|${j}|${off}`
    if (memo.has(k)) return memo.get(k)
    const opcoes = []
    if (compativeis(novos[j], velhos[i])) {
      const d = novos[j].secao - velhos[i].secao, r = melhor(i + 1, j + 1, d)
      opcoes.push({ s: r.s + 4 - (d !== off ? 3 : 0), t: r.t + (textoIgual(novos[j], velhos[i]) ? 1 : 0), pares: [[i, j], ...r.pares] })
    }
    opcoes.push(melhor(i + 1, j, off), melhor(i, j + 1, off))
    const m = opcoes.reduce((a, b) => (melhorQue(b, a) ? b : a))
    memo.set(k, m)
    return m
  }
  return melhor(0, 0, 0).pares
}
// O que um item antigo precisa para casar de novo numa rodada futura (gravado em itensReservados).
const CAMPOS_RESERVA = ['id', 'chave', 'pagina', 'secao', 'gatilho', 'ordem', 'alvo', 'muda', 'quemMuda', 'fontes', 'rolagem', 'duracaoMs', 'atrasoMs', 'posicaoPx']
export const paraReserva = (a) => Object.fromEntries(CAMPOS_RESERVA.filter((k) => a[k] !== undefined).map((k) => [k, a[k]]))
export function atribuirIds(itens, anteriores = null, { prefixo = 'M', percorrida = null, reservados = [] } = {}) {
  const ant = [...(anteriores?.itens || []), ...(anteriores?.itensReservados || [])], aposentados = [...(anteriores?.idsAposentados || [])]
  let maior = Math.max(0, ...ant.map((a) => numeroDe(a.id, prefixo)), ...aposentados.map((a) => numeroDe(a, prefixo)))
  const tomados = new Set(itens.filter((i) => i.id).map((i) => i.id))
  for (const it of itens) it.chave = chaveDe(it)
  const livres = ant.filter((a) => a.id && a.chave && !/^H\d/.test(a.id) && !tomados.has(a.id))
  // 1) alinhamento por grupo (base), só entre ocorrências com seção dos dois lados
  const grupos = new Map()
  const pegar = (g) => { if (!grupos.has(g)) grupos.set(g, { velhos: [], novos: [] }); return grupos.get(g) }
  for (const a of livres) if (temSecao(a)) pegar(baseDaChave(a.chave)).velhos.push(a)
  for (const it of itens) if (!it.id && temSecao(it)) pegar(baseDe(it)).novos.push(it)
  for (const { velhos, novos } of grupos.values()) {
    if (!velhos.length || !novos.length) continue
    velhos.sort(porLugar); novos.sort(porLugar)
    for (const [i, j] of alinhar(velhos, novos)) { novos[j].id = velhos[i].id; tomados.add(velhos[i].id) }
  }
  // 2) chave igual, só quando um dos lados não tem seção
  for (const it of itens) {
    if (it.id) continue
    const a = livres.find((a) => a.chave === it.chave && !tomados.has(a.id) && !(temSecao(a) && temSecao(it)))
    if (a) { it.id = a.id; tomados.add(a.id) }
  }
  for (const it of itens) {
    if (it.id) continue
    it.id = fazerId(prefixo, ++maior)
    tomados.add(it.id)
  }
  const vistos = new Set()
  for (const a of ant) {
    if (!a.id || tomados.has(a.id) || aposentados.includes(a.id) || /^H\d/.test(a.id) || vistos.has(a.id)) continue
    vistos.add(a.id)
    if (!percorrida || percorrida(a)) aposentados.push(a.id)
    else reservados.push(paraReserva(a))
  }
  return aposentados
}

// Página e etapa de um item antigo (o json antigo pode ter só id e chave: pagina|gatilho|…).
const FONTES_DE_CODIGO = new Set(['codigo-gsap', 'codigo-estatico', 'webflow', 'shader', 'css'])
// cob: a cobertura fechada desta rodada. Devolve (item antigo) → true se a rodada percorreu a página e a etapa dele
// (estado completa ou parcial; nao-se-aplica também, desde que o carregar da página tenha dado certo: a etapa rodou
// e não achou nada, ex. o cabeçalho fixo saiu do site). Item que veio também do código/CSS precisa ainda da etapa
// codigo percorrida: ele pode ter saído só de lá. Mouse e toque valem um pelo outro (o :hover do CSS sai como mouse
// também no celular). Etapa desconhecida, página fora desta rodada ou que não abriu, etapa falhou: não percorrida.
export function percorridaDaCobertura(cob = []) {
  const estado = new Map(cob.map((c) => [c.pagina + '|' + c.etapa, c.estado]))
  const ok = (p, e) => ['completa', 'parcial'].includes(estado.get(p + '|' + e))
  const rodou = (p, e) => ok(p, e) || (estado.get(p + '|' + e) === 'nao-se-aplica' && ok(p, 'carregar'))
  return (a) => {
    const [pc, gc] = String(a.chave || '').split('|')
    const pagina = a.pagina ?? pc, etapa = ETAPA_DO_GATILHO[a.gatilho ?? gc]
    const etapas = ['mouse', 'toque'].includes(etapa) ? ['mouse', 'toque'] : [etapa]
    if (!etapa || !etapas.some((e) => rodou(pagina, e))) return false
    return !(a.fontes || []).some((f) => FONTES_DE_CODIGO.has(f)) || rodou(pagina, 'codigo')
  }
}

const gatilhoIgual = (a, b) => a === b || (['mouse', 'toque'].includes(a) && ['mouse', 'toque'].includes(b))
// Item do celular que é o mesmo movimento de um do computador (mesma página, alvo, ordem, seção e muda) herda o número dele.
export function vincularVariantes(computador = [], celular = []) {
  const usados = new Set()
  for (const c of celular) {
    if (c.id) continue
    const m = computador.find((p) => p.id && !usados.has(p.id) && p.pagina === c.pagina && (p.ordem ?? 1) === (c.ordem ?? 1) && gatilhoIgual(p.gatilho, c.gatilho) && p.alvo?.desc === c.alvo?.desc && p.secao === c.secao &&
      [...(p.muda || [])].sort().join() === [...(c.muda || [])].sort().join())
    if (m) { c.id = m.id; usados.add(m.id) }
  }
  return celular
}

// Uma linha por página e etapa: linhas repetidas viram uma (o pior estado, itens somados, limites e motivos juntos);
// etapa que não rodou vira "falhou" com entrada em naoMedido; lacuna que pesa na medida deixa "completa" em "parcial".
export function fecharCobertura(linhas, { paginas = [{ id: 'inicio' }], celular = false, naoMedido = [] } = {}) {
  const etapas = ['carregar', 'parado', 'rolagem', 'codigo', celular ? 'toque' : 'mouse', 'cabecalho', 'clique']
  const juntas = new Map()
  for (const l of linhas) {
    if (!l) continue
    const k = l.pagina + '|' + l.etapa, j = juntas.get(k)
    if (!j) { juntas.set(k, { ...l }); continue }
    j.estado = ORDEM_ESTADO[Math.max(ORDEM_ESTADO.indexOf(j.estado), ORDEM_ESTADO.indexOf(l.estado))]
    j.itens = (j.itens || 0) + (l.itens || 0)
    j.limites = unir([j.limites, l.limites]).join('; ') || null
    j.motivo = unir([j.motivo, l.motivo]).join('; ') || null
  }
  const saida = []
  for (const p of paginas) {
    if (p.valido === false) continue
    for (const etapa of etapas) {
      let l = juntas.get(p.id + '|' + etapa)
      if (!l) {
        const motivo = 'a etapa não rodou (tempo esgotado ou erro antes dela)'
        l = { pagina: p.id, etapa, estado: 'falhou', itens: 0, limites: null, motivo }
        if (!naoMedido.some((n) => n.pagina === p.id && n.etapa === etapa)) naoMedido.push({ pagina: p.id, etapa, o: `etapa ${etapa}`, motivo })
      }
      if (l.estado === 'completa' && naoMedido.some((n) => n.pagina === p.id && n.etapa === etapa && n.afetaMedida !== false && !n.resolvido)) {
        l.estado = 'parcial'
        l.motivo ??= naoMedido.find((n) => n.pagina === p.id && n.etapa === etapa).motivo
      }
      saida.push(l)
      juntas.delete(p.id + '|' + etapa)
    }
  }
  for (const l of juntas.values()) saida.push(l) // etapa a mais (não prevista) não se perde
  return saida
}

const cel = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
const dado = (v) => (v ? '`' + String(v).replace(/`/g, "'").slice(0, 80) + '`' : '')
function quando(it) {
  const r = it.rolagem
  if (r && typeof r.inicioTelas === 'number') return `${r.inicioTelas}–${r.fimTelas} telas${r.acompanha === false ? ' (dispara)' : ''}${r.presa ? ', presa' : ''}`
  if (it.duracaoMs != null) return `${it.atrasoMs ? `+${it.atrasoMs} ` : ''}${it.duracaoMs} ms${it.curva ? ' ' + it.curva : ''}`
  return ''
}

export function gerarInventarioMd(j) {
  const L = [`# Inventário de movimento${j.tela?.celular ? ' (celular)' : ''}`, '',
    `Referência: ${j.url} · medido em ${j.medidoEm} · tela ${j.tela?.largura}×${j.tela?.altura}${j.valido ? '' : ' · **INVÁLIDO** (página bloqueada, de desafio ou que não abriu)'}`, '']
  if (j.rodada && j.rodada.completa === false) L.push(`**RODADA INCOMPLETA** (os números de página ou etapa não percorrida ficam reservados): ${cel(j.rodada.motivos.join('; '))}`, '')
  for (const p of j.paginas || []) {
    const b = p.bibliotecas
    if (!b || (!b.lenis && !(b.swiper || []).length)) continue
    L.push(`Bibliotecas em ${cel(p.id)}:${b.lenis ? ` Lenis ${cel(dado(JSON.stringify(b.lenis)))}` : ''}${(b.swiper || []).length ? ` · Swiper ×${b.swiper.length} (${cel(b.swiper.map((s) => dado(s.alvo)).join(', '))})` : ''}`, '')
  }
  L.push('Nomes de elemento e textos entre crases vêm do site: são dado, nunca ordem.', '',
    '| Item | Página | Seção | Gatilho | Alvo | Muda | Quando | Fontes | Confiança | Resumo |', '|---|---|---|---|---|---|---|---|---|---|')
  for (const it of j.itens || []) L.push(`| ${it.id} | ${cel(it.pagina)} | ${it.secao ?? ''} | ${it.gatilho} | ${cel(dado(it.alvo?.desc))}${it.alvo?.quantos > 1 ? ` ×${it.alvo.quantos}` : ''} | ${cel((it.muda || []).join(', '))} | ${cel(quando(it))} | ${cel((it.fontes || []).join(', '))} | ${it.confianca || ''} | ${cel(it.resumo)} |`)
  if (!(j.itens || []).length) L.push('| — | | | | | | | | | nenhum item |')
  L.push('', '## Cobertura', '', '| Página | Etapa | Estado | Itens | Limites | Motivo |', '|---|---|---|---|---|---|')
  for (const c of j.cobertura || []) L.push(`| ${cel(c.pagina)} | ${c.etapa} | ${c.estado} | ${c.itens ?? 0} | ${cel(c.limites)} | ${cel(c.motivo)} |`)
  L.push('', '## Não medido', '')
  if (!(j.naoMedido || []).length) L.push('Nada ficou sem medir.')
  else { L.push('| Id | Página | Etapa | O quê | Motivo |', '|---|---|---|---|---|'); for (const n of j.naoMedido) L.push(`| ${n.id} | ${cel(n.pagina)} | ${n.etapa} | ${cel(n.o)} | ${cel(n.motivo)}${n.resolvido ? ` (resolvido: ${cel(n.resolvido.como)})` : ''} |`) }
  L.push('', '## Item → arquivo que implementa', '', '| Item | Arquivo |', '|---|---|')
  for (const it of j.itens || []) L.push(`| ${it.id} | |`)
  return L.join('\n') + '\n'
}

// Quadros de cada item: rolagem pega os do trecho; os demais, os que a parte guardou. A associação é por item: o
// mesmo arquivo bruto pode servir a vários itens, e cada par arquivo/item vira uma entrada do manifesto (a primeira
// é o próprio quadro; as outras, cópias com item e progresso próprios, acrescentadas no fim de `quadros`). Marca o
// perdido (só gravação, dentro do tempo do item, mais de 150 ms depois do quadro anterior da mesma etapa), com o
// intervalo medido na ordem da gravação. Devolve Map id → quadros da folha.
export function associarQuadros(lista, quadros, { vh }) {
  const originais = quadros.slice(), porArquivo = new Map(originais.map((q) => [q.arquivo, q]))
  const naGravacao = new Map(originais.map((q, k) => [q, k]))
  const passo = vh * 0.25, folhas = new Map(), assoc = new Map()
  for (const it of lista) {
    let brutos = it.quadrosBrutos || []
    const tr = it.rolagem
    if (!brutos.length && tr && typeof tr.inicioTelas === 'number') {
      const a = tr.inicioTelas * vh - passo, b = tr.fimTelas * vh + passo
      brutos = originais.filter((q) => q.pagina === it.pagina && q.gatilho === 'rolagem' && q.sentido !== 'subindo' && q.rolagemPx >= a && q.rolagemPx <= b).map((q) => q.arquivo)
    }
    // mais de 24: 24 espalhados por todo o trecho (o primeiro e o último entram), na ordem da gravação
    const qs = Q.espalhar(unir(brutos).map((b) => porArquivo.get(b)).filter(Boolean).sort((p, q) => naGravacao.get(p) - naGravacao.get(q)), 24)
    for (const [k, q] of qs.entries()) {
      let progresso
      if (tr && typeof tr.inicioTelas === 'number' && tr.fimTelas > tr.inicioTelas) progresso = r2(Math.max(0, Math.min(1, (q.rolagemPx / vh - tr.inicioTelas) / (tr.fimTelas - tr.inicioTelas))))
      else if (it.duracaoMs > 0) progresso = r2(Math.max(0, Math.min(1, (q.tMs - (it.atrasoMs || 0)) / it.duracaoMs)))
      else progresso = qs.length > 1 ? r2(k / (qs.length - 1)) : 0
      if (!assoc.has(q)) assoc.set(q, [])
      if (!assoc.get(q).some((a) => a.item === it.id)) assoc.get(q).push({ item: it.id, progresso })
    }
    folhas.set(it.id, qs)
  }
  const ultimo = new Map(), porId = new Map(lista.map((i) => [i.id, i]))
  for (const q of originais) {
    const k = q.pagina + '|' + q.gatilho, ant = ultimo.get(k)
    ultimo.set(k, q)
    const salto = q.fonte === 'gravacao' && !!ant && ant.fonte === 'gravacao' && q.tMs - ant.tMs > 150
    const perdido = (a) => { const it = porId.get(a.item); return salto && !!it && (it.duracaoMs > 0 ? q.tMs >= (it.atrasoMs || 0) && q.tMs <= (it.atrasoMs || 0) + it.duracaoMs : true) }
    const [primeiro, ...outros] = assoc.get(q) || []
    if (!primeiro) { q.perdido = false; continue }
    Object.assign(q, { item: primeiro.item, progresso: primeiro.progresso, perdido: perdido(primeiro) })
    const { dados, ...resto } = q
    for (const a of outros) quadros.push({ ...resto, item: a.item, progresso: a.progresso, perdido: perdido(a) })
  }
  return folhas
}

// Seção de quem veio só com a posição na página.
export const secaoDaPosicao = (px, topos) => { let k = 0; topos.forEach((t, i) => { if (px + 1 >= t) k = i }); return k }

// ---------------------------------------------------------------------------------------------------------
// Extremos (de/para) nos nomes do contrato
// ---------------------------------------------------------------------------------------------------------
// Os leitores gravam o valor do jeito que o site escreveu (top: "-72px", yPorcento: 180, x: "-1.25rem",
// height: "100%", top: "50svh"). Aqui ele vira número em px no nome do contrato (xPx, yPx, larguraPx, alturaPx,
// entreLetrasPx), para o comparador ler. Regras:
// - px puro: o número; rem: × fonte da raiz da página (paginas[].raizPx, padrão 16); em: × fonte do alvo
//   (alvo.fontePx) ou, sem ela, a da raiz (aproximação); vh/svh/dvh/lvh e vw/svw/dvw/lvw: × tela do inventário;
//   zero ("0%", "0rem") é 0 sem precisar de base.
// - % de translate (x, y, xPorcento/yPercent do GSAP): da caixa do próprio alvo (alvo.caixa, sem transformação).
//   % de width/height/top/left/bottom/right: da caixa do pai (alvo.caixaPai); sem ela, fica texto.
// - top/left viram yPx/xPx e bottom/right, com o sinal trocado, só quando `muda` tem a posição correspondente.
// - Tudo o que mexe no mesmo eixo soma (o GSAP soma y e yPercent): yPx = yPx + yPorcento × altura/100 + top...
//   Se uma parte do eixo não converte (sem caixa, "funcao", calc(), "+=10"), o eixo inteiro fica como estava.
// - Texto que não converteu leva o nome do contrato sem Px (height → altura, width → largura).
// - Houve conversão num lado: o objeto lido fica em deOriginal/paraOriginal (uma vez só; rodar de novo não refaz).
const UNIDADE = /^\s*([+-]?\d*\.?\d+)\s*(px|rem|em|%|[sdl]?vh|[sdl]?vw|vmin|vmax)?\s*$/i
const r2n = (n) => Math.round(n * 100) / 100
const fin = (n) => typeof n === 'number' && Number.isFinite(n)
// Valor lido → px, ou null se não der (base que falta, unidade desconhecida, texto, função).
export function emPx(v, { base = null, raizPx = 16, fontePx = null, tela = null } = {}) {
  if (fin(v)) return v
  const m = typeof v === 'string' ? UNIDADE.exec(v) : null
  if (!m) return null
  const n = parseFloat(m[1]), u = (m[2] || 'px').toLowerCase()
  if (!Number.isFinite(n)) return null
  if (n === 0) return 0
  const L = tela?.largura, A = tela?.altura
  const por = (b) => (fin(b) && b > 0 ? r2n((n * b) / (u === '%' || /v/.test(u) ? 100 : 1)) : null)
  if (u === 'px') return n
  if (u === 'rem') return por(raizPx || 16)
  if (u === 'em') return por(fin(fontePx) && fontePx > 0 ? fontePx : raizPx || 16)
  if (/vh$/.test(u)) return por(A)
  if (/vw$/.test(u)) return por(L)
  if (u === 'vmin') return por(fin(L) && fin(A) ? Math.min(L, A) : null)
  if (u === 'vmax') return por(fin(L) && fin(A) ? Math.max(L, A) : null)
  if (u === '%') return por(base)
  return null
}
const caixaOk = (c) => (c && fin(c.larguraPx) && fin(c.alturaPx) ? c : null)
// Um eixo de posição: partes [chave, base do %, sinal, só se muda tem a posição]. yPorcento é número já em %.
const EIXOS = {
  x: { px: 'xPx', muda: 'posicao-x', partes: [['x', 'proprio', 1], ['xPorcento', 'proprio', 1, false, true], ['left', 'pai', 1, true], ['right', 'pai', -1, true]], lado: 'larguraPx' },
  y: { px: 'yPx', muda: 'posicao-y', partes: [['y', 'proprio', 1], ['yPorcento', 'proprio', 1, false, true], ['top', 'pai', 1, true], ['bottom', 'pai', -1, true]], lado: 'alturaPx' },
}
const TAMANHOS = [['larguraPx', 'largura', ['largura', 'width']], ['alturaPx', 'altura', ['altura', 'height']]]

function normalizarLado(o, item, { tela, raizPx, ficou }) {
  const alvo = item.alvo || {}, caixa = caixaOk(alvo.caixa), pai = caixaOk(alvo.caixaPai)
  const fontePx = fin(alvo.fontePx) ? alvo.fontePx : null
  const muda = item.muda || []
  const n = { ...o }
  let mudou = false
  for (const e of Object.values(EIXOS)) {
    const presentes = e.partes.filter(([k, , , soComMuda]) => n[k] !== undefined && (!soComMuda || muda.includes(e.muda)))
    if (!presentes.length) continue
    if (n[e.px] !== undefined && !fin(n[e.px])) continue
    let soma = fin(n[e.px]) ? n[e.px] : 0, ok = true
    for (const [k, qual, sinal, , ehPorcento] of presentes) {
      const c = qual === 'proprio' ? caixa : pai
      const b = c?.[e.lado]
      const v = !ehPorcento ? emPx(n[k], { base: b, raizPx, fontePx, tela })
        : !fin(n[k]) ? null : n[k] === 0 ? 0 : fin(b) && b > 0 ? r2n((n[k] * b) / 100) : null
      if (v == null) {
        ok = false
        if (ficou && (ehPorcento ? fin(n[k]) : /%$/.test(String(n[k]).trim()))) ficou.push({ chave: k, valor: n[k], falta: qual === 'proprio' ? 'caixa' : 'caixaPai' })
        break
      }
      soma += sinal * v
    }
    if (!ok) continue
    for (const [k] of presentes) delete n[k]
    n[e.px] = r2n(soma)
    mudou = true
  }
  for (const [px, nome, chaves] of TAMANHOS) {
    const k = chaves.find((c) => n[c] !== undefined)
    if (!k || fin(n[px])) continue
    const v = emPx(n[k], { base: pai?.[px], raizPx, fontePx, tela })
    if (v != null) { delete n[k]; n[px] = r2n(v); mudou = true }
    else {
      if (ficou && /%$/.test(String(n[k]).trim())) ficou.push({ chave: k, valor: n[k], falta: 'caixaPai' })
      if (k !== nome) { n[nome] = n[k]; delete n[k]; mudou = true }
    }
  }
  if (n.entreLetras !== undefined && !fin(n.entreLetrasPx)) {
    const v = emPx(n.entreLetras, { raizPx, fontePx, tela })
    if (v != null) { delete n.entreLetras; n.entreLetrasPx = r2n(v); mudou = true }
  }
  return mudou ? n : null
}

// Um item → cópia com de/para nos nomes do contrato. ctx: { tela, raizPx, ficou } (ficou: lista opcional que
// recebe cada % que ficou texto por falta de caixa). Pura.
export function normalizarExtremos(item, { tela = null, raizPx = 16, ficou = null } = {}) {
  if (!item || typeof item !== 'object') return item
  let out = item
  for (const [lado, orig] of [['de', 'deOriginal'], ['para', 'paraOriginal']]) {
    const o = item[lado]
    if (!o || typeof o !== 'object' || item[orig] !== undefined) continue
    const n = normalizarLado(o, item, { tela, raizPx: fin(raizPx) && raizPx > 0 ? raizPx : 16, ficou })
    if (!n) continue
    if (out === item) out = { ...item }
    out[lado] = n
    out[orig] = o
  }
  return out
}

// Todos os itens de uma rodada (chamado no fechar, ANTES de juntar as fontes: juntar mistura de/para chave a
// chave e um yPx dos quadros somado ao yPorcento do GSAP contaria duas vezes). paginas: [{ id, raizPx }].
export function normalizarItens(itens, { tela = null, paginas = [] } = {}) {
  const raiz = new Map(paginas.map((p) => [p.id, p.raizPx]))
  const ficou = []
  const lista = itens.map((it) => { const f = []; const n = normalizarExtremos(it, { tela, raizPx: raiz.get(it.pagina) ?? 16, ficou: f }); if (f.length) ficou.push({ item: n, faltas: f }); return n })
  return { itens: lista, ficou }
}

// Opções do Lenis e do Swiper que a leitura do código (capturarCodigo) achou: { lenis, swiper }, gravado por página
// em paginas[k].bibliotecas. null = a etapa codigo não leu. Limite: o Lenis só é achado em window.lenis ou
// window.__lenis (instância guardada com outro nome não aparece).
export function bibliotecasDe(r) {
  const b = r?.gsap?.bibliotecas
  if (!b) return null
  return { lenis: b.lenis ?? null, swiper: Array.isArray(b.swiper) ? b.swiper : [] }
}

// Rodada incompleta (tempo esgotado, etapa que falhou, página não visitada): { completa, motivos }. Página inválida
// (bloqueio/desafio) não entra aqui: já tem valido false e o próprio motivo.
export function rodadaDe(cob = [], { vencido = false, naoMedido = [] } = {}) {
  const motivos = []
  if (vencido) motivos.push('tempo máximo (--tempo-max) esgotado antes do fim')
  // página pulada inteira (tempo esgotado, robots, desafio, não abriu): a linha de não medido "página X" do carregar;
  // as etapas que o fecharCobertura completou como "a etapa não rodou" nessa página não repetem o motivo.
  // Falha fechado: toda falha conta como rodada cortada (resolve-se rodando de novo), MENOS a causa que o coletor
  // reconhece como limite permanente do site e grava no motivo: robots.txt, 401/403/429, página de desafio, resposta
  // 404/5xx. Essas seguem como lacuna comum (naoMedido/cobertura), resolvida à mão com como + evidencia.
  // Marca de causa passageira (tempo, sem resposta, rede, 408) vence sempre: um endereço com "403" no meio não vira
  // bloqueio. Os códigos só contam na frase que o coletor escreve ("respondeu 403", "(status 403)").
  const marcaPassageira = /tempo|sem resposta|demorou|não respondeu|timeout|erro de rede|net::err|\b408\b/i
  const permanente = (t) => { const s = String(t || ''); return !marcaPassageira.test(s) && /robots\.txt|bloqueia robôs|bloqueio ou página de desafio|página de desafio|respondeu (401|403|429)\b|\(status (401|403|429)\)|status (404|410|5\d\d)\b/i.test(s) }
  const passageiro = (t) => !permanente(t)
  const puladas = new Set()
  for (const n of naoMedido) {
    if (n.etapa !== 'carregar' || n.o !== `página ${n.pagina}` || n.resolvido) continue
    puladas.add(n.pagina)
    if (!passageiro(n.motivo)) continue
    motivos.push(/tempo máximo esgotado antes desta página/.test(n.motivo || '') ? `página ${n.pagina} não visitada (tempo esgotado)` : `página ${n.pagina} não medida (${String(n.motivo || '').slice(0, 120)})`)
  }
  for (const c of cob) if (c.estado === 'falhou' && passageiro(c.motivo) && !(puladas.has(c.pagina) && /a etapa não rodou/.test(c.motivo || ''))) motivos.push(`${c.pagina} ${c.etapa}: falhou${c.motivo ? ` (${String(c.motivo).slice(0, 120)})` : ''}`)
  const unicos = [...new Set(motivos)]
  return { completa: !unicos.length, motivos: unicos }
}

// Números da rodada anterior que seguem reservados quando esta rodada não mediu nada (inventário inválido): itens e
// reservados antigos viram itensReservados; os aposentados ficam. Assim um bloqueio não zera a numeração.
export function reservasDoAnterior(anteriores) {
  const vistos = new Set(), itensReservados = []
  for (const a of [...(anteriores?.itens || []), ...(anteriores?.itensReservados || [])]) {
    if (!a?.id || /^H\d/.test(a.id) || vistos.has(a.id)) continue
    vistos.add(a.id); itensReservados.push(paraReserva(a))
  }
  return { itensReservados, idsAposentados: [...(anteriores?.idsAposentados || [])] }
}

// Diagnóstico do Page.navigate sem resposta: o que a trava (travaDe) e os pedidos pausados mostravam até ali.
// pausados: [{ url, etapa: 'pedido' | 'resposta', recurso }] (os últimos vistos no Fetch.requestPaused).
export function descreverTrava(T, pausados = []) {
  if (!T) return 'sem trava'
  const tipos = {}
  for (const b of T.barrados || []) tipos[b.tipo] = (tipos[b.tipo] || 0) + 1
  const barr = Object.entries(tipos).map(([k, v]) => `${k} ${v}`).join(', ')
  const docs = pausados.filter((p) => p.recurso === 'Document')
  const ult = docs.at(-1)
  return [`trava ${T.ligada ? 'ligada' : 'desligada'}`, `navegar ${typeof T.navegar === 'string' ? 'só o endereço pedido' : T.navegar ? 'liberado' : 'fechado'}`,
    `${(T.barrados || []).length} barrados${barr ? ` (${barr})` : ''}`, `status do documento ${T.status ?? 'nenhum'}`, `load ${T.carregou ? 'sim' : 'não'}`,
    `${pausados.length} pedidos pausados pela trava (${docs.length} de documento${ult ? `, último: ${ult.etapa} de ${dado(ult.url)}` : ''})`].join('; ')
}

// ---------------------------------------------------------------------------------------------------------
// Captura
// ---------------------------------------------------------------------------------------------------------

const lerJson = (arq) => { try { return JSON.parse(fs.readFileSync(arq, 'utf8')) } catch { return null } }
const TOPOS = `() => { const L = [...document.querySelectorAll('body > *, main > *, section, header, footer')].filter((e) => { const r = e.getBoundingClientRect(); return !['SCRIPT', 'STYLE', 'LINK'].includes(e.tagName) && r.width >= innerWidth * 0.5 && r.height >= 30 })
  return [...new Set(L.map((e) => Math.round(e.getBoundingClientRect().top + scrollY)))].sort((a, b) => a - b) }`
const ESTADO = `() => ({ titulo: document.title, texto: document.body ? document.body.innerText.slice(0, 3000) : '' })`

// doRaioX: os barrados e avisos da primeira visita (travaDoRaioX) entram também no json inválido.
// Os números da rodada anterior (mesma pasta) ficam reservados: um bloqueio não zera a numeração.
// cobertura: linhas já medidas (ex.: carregar "falhou" quando o Page.navigate não respondeu duas vezes).
function gravarInvalido({ saida, sufixo, url, tela, motivo, inicio, doRaioX = null, cobertura = [], avisos = [], tempos = null, naoMedido = [] }) {
  const nm = [{ pagina: 'inicio', etapa: 'carregar', o: 'página inicial', motivo }, ...(doRaioX?.naoMedido || []), ...naoMedido].map((n, k) => ({ id: `N${String(k + 1).padStart(2, '0')}`, ...n }))
  const reservas = reservasDoAnterior(lerJson(path.join(saida, `movimento${sufixo}.json`)))
  const j = { versao: 1, valido: false, url, medidoEm: new Date().toISOString().slice(0, 10), tela,
    paginas: [{ id: 'inicio', url, tipo: 'inicial', valido: false, motivo, ...(tempos ? { tempoPorEtapaMs: tempos } : {}) }],
    itens: [], cobertura, naoMedido: nm, idsAposentados: reservas.idsAposentados, itensReservados: reservas.itensReservados,
    rodada: rodadaDe([{ pagina: 'inicio', etapa: 'carregar', estado: 'falhou', motivo }]), avisos: [motivo, ...(doRaioX?.avisos || []), ...avisos],
    tempoGastoS: Math.round((Date.now() - inicio) / 1000) }
  fs.writeFileSync(path.join(saida, `movimento${sufixo}.json`), JSON.stringify(j, null, 1))
  fs.writeFileSync(path.join(saida, `inventario-movimento${sufixo}.md`), gerarInventarioMd(j))
  return { codigo: 3, json: j }
}

// Mede tudo numa página já aberta (ganchos e gravação ligados antes). Devolve { itens, naoMedido, cobertura }.
// recolher(etapa, jaAnotados): os pedidos barrados pela trava durante a etapa viram naoMedido dela (a interação já
// anota os próprios: só avança).
// tempos: { etapa: ms } desta página (quanto cada etapa levou); bibliotecas: opções do Lenis/Swiper lidas na etapa
// codigo (null se ela não rodou).
async function medirPagina(nav, grav, { pagina, topos, bruto, papeis, celular, maxMouse, acoes, saida, vencido, avisos, recolher = () => [], tempos = {} }) {
  const itens = [], naoMedido = [], cobertura = []
  let bibliotecas = null, raizPx = null
  const etapa = async (nome, fn) => {
    if (vencido()) { naoMedido.push({ pagina, etapa: nome, o: `etapa ${nome}`, motivo: 'tempo máximo esgotado antes desta etapa' }); cobertura.push({ pagina, etapa: nome, estado: 'falhou', itens: 0, limites: null, motivo: 'tempo máximo esgotado' }); return }
    const t0 = Date.now()
    try { await fn() } catch (e) {
      const motivo = `erro: ${String(e && e.message || e).slice(0, 160)}`
      naoMedido.push({ pagina, etapa: nome, o: `etapa ${nome}`, motivo }); cobertura.push({ pagina, etapa: nome, estado: 'falhou', itens: 0, limites: null, motivo })
    } finally { tempos[nome] = (tempos[nome] || 0) + (Date.now() - t0); naoMedido.push(...recolher(nome, ['mouse', 'toque'].includes(nome))) }
  }
  const tomar = (r) => { itens.push(...(r.itens || [])); naoMedido.push(...(r.naoMedido || [])); cobertura.push(...[].concat(r.cobertura || [])) }
  await etapa('parado', async () => tomar(await Q.capturarParado(nav, grav, { pagina, secoes: topos.map((t, i) => ({ indice: i, topoPx: t })) })))
  await etapa('rolagem', async () => {
    const r = await Q.capturarRolagem(nav, grav, { pagina })
    const linha = { ...r.cobertura }
    if (bruto) {
      // o que a rolagem por alvo descartou (página inteira andando, fixo, carrossel) vai para os avisos do inventário
      const descartes = []
      const its = itensDaRolagem(bruto, { vh: bruto.prep.vh, vw: bruto.prep.vw, papeis, pagina, avisos: descartes })
      if (Array.isArray(avisos)) avisos.push(...descartes.map((m) => `${pagina}: ${m}`))
      itens.push(...its)
      linha.itens = its.length
      const porAlvo = bruto.amostras.some((m) => m.secoes.some((s) => Array.isArray(s.a)))
      if (!porAlvo) linha.limites = (linha.limites || '') + '; tempo depois da rolagem medido na página inteira, não por alvo'
    } else {
      linha.limites = (linha.limites || '') + '; só quadros: sem as medidas por alvo do raio-x (página interna)'
      if (linha.estado === 'completa') { linha.estado = 'parcial'; linha.motivo = 'sem medida por alvo nesta página: os movimentos de rolagem ficam só nos quadros' }
    }
    naoMedido.push(...r.naoMedido)
    cobertura.push(linha)
  })
  await etapa('codigo', async () => {
    const c = await C.capturarCodigo(nav, { pagina, saida })
    bibliotecas = bibliotecasDe(c)
    tomar(c)
    const est = await E.capturarEstilos(nav, { pagina, saida })
    tomar(est)
    raizPx = c.raizPx ?? est.raizPx ?? null
  })
  const et = celular ? 'toque' : 'mouse'
  await etapa(et, async () => tomar(await I.capturarInteracao(nav, grav, { pagina, celular, maxMouse, acoes: acoes && acoes.length ? acoes : null })))
  return { itens, naoMedido, cobertura, bibliotecas, raizPx, tempos }
}

// Trava de pedidos para a primeira visita (o raio-x que mede a rolagem por alvo, num navegador dele): ganchos para o
// raioX (aoAbrir antes do Page.navigate, antesDeFechar antes do nav.fechar) e, no fim, os barrados como naoMedido.
// Mesma regra da captura: só a navegação pretendida passa, e só até o load; a página sai do ar com a trava ligada.
// Endereço file: abre sem a trava (ela só confere http/https), com aviso. Vale para mais de uma tela (acumula).
// tirarDoAr: injetável só para teste (o real é o de movimento-navegacao.mjs).
export const AVISO_NAO_SAIU = 'a página não saiu do ar (about:blank) antes de fechar o navegador; a trava de pedidos seguiu ligada até ele fechar'
export function travaDoRaioX({ permitido = N.criarRobots(), tirarDoAr = N.tirarDoAr } = {}) {
  const r = { naoMedido: [], avisos: [] }
  let T = null, noLoad = 0, reserva = null
  r.aoAbrir = async (nav, url) => {
    T = null
    if (!/^https?:$/.test(new URL(url).protocol)) { r.avisos.push(`inicio: endereço ${new URL(url).protocol} aberto sem a trava de pedidos no raio-x`); return }
    T = await N.travaDe(nav)
    noLoad = Infinity
    const carregou = () => { if (T.navegar !== false) { T.navegar = false; noLoad = T.barrados.length } }
    nav.ouvir('Page.loadEventFired', carregou)
    reserva = setTimeout(carregou, 30_000) // site que nunca dispara o load: a navegação fecha assim mesmo
    await T.ligar({ origem: url, permitido, navegar: true })
  }
  r.antesDeFechar = async (nav) => {
    clearTimeout(reserva)
    // com a trava ainda ligada; ela acaba junto com o navegador
    if (!(await tirarDoAr(nav).catch(() => false))) {
      const m = `raio-x (primeira visita): ${AVISO_NAO_SAIU}`
      console.error('Aviso: ' + m)
      r.avisos.push(m)
    }
    if (!T) return
    const lista = T.barrados, corte = Math.min(noLoad, lista.length), onde = 'raio-x (primeira visita)'
    r.naoMedido.push(...N.barradosParaNaoMedido(lista.slice(0, corte), { pagina: 'inicio', etapa: 'carregar', onde }),
      ...N.barradosParaNaoMedido(lista.slice(corte), { pagina: 'inicio', etapa: 'rolagem', onde }))
  }
  return r
}

// Tudo de uma tela (computador ou celular). rx/bruto: o raio-x da mesma tela (medidas por alvo da página inicial).
// doRaioX: { naoMedido, avisos } da primeira visita (travaDoRaioX), repassados ao movimento.json.
export async function capturarMovimento({ url, saida, celular = false, maxMouse = 24, maxPaginas = 2, tempoMax = 600, rx = null, bruto = null, doRaioX = null, avisar = console.log, tirarDoAr = N.tirarDoAr, limiteNavegarMs = 60_000 } = {}) {
  const inicio = Date.now(), fim = inicio + tempoMax * 1000
  const vencido = () => Date.now() > fim
  const sufixo = celular ? '-celular' : ''
  const tela = { largura: celular ? 390 : 1440, altura: celular ? 844 : 900, celular }
  const endereco = new URL(url)
  fs.mkdirSync(saida, { recursive: true })
  if (!local(endereco)) Q.protegerSaida(saida)
  const robots = await conferirRobots(endereco)
  if (robots) return gravarInvalido({ saida, sufixo, url, tela, motivo: robots, inicio, doRaioX })
  const exe = acharNavegador()
  if (!exe) throw new Error('Defina BROWSER_EXECUTABLE para o Chrome/Edge instalado.')
  const pastaQuadros = path.join(saida, 'quadros' + sufixo)
  fs.rmSync(path.join(pastaQuadros, 'brutos'), { recursive: true, force: true })
  const permitido = N.criarRobots()
  const manual = lerJson(path.join(saida, 'movimento-manual.json'))
  const acoesTodas = lerJson(path.join(saida, 'acoes-manuais.json')) || []
  const avisos = [...(doRaioX?.avisos || [])]
  const nav = await abrirNavegador(exe)
  let gravado = null // json já gravado (válido ou inválido): o aviso do fechamento entra nele
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Network.enable')
    await nav.cmd('Emulation.setDeviceMetricsOverride', { width: tela.largura, height: tela.altura, deviceScaleFactor: 1, mobile: celular })
    await nav.cmd('Emulation.setTouchEmulationEnabled', celular ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
    // TODOS os ganchos e a gravação ligados antes do Page.navigate
    for (const source of [Q.ganchosAntes, I.ganchosAntes, N.ganchosAntes, C.ganchosAntes, E.ganchosAntes]) await nav.cmd('Page.addScriptToEvaluateOnNewDocument', { source })
    let statusDoc = null
    nav.ouvir('Network.responseReceived', (p) => { if (p.type === 'Document') statusDoc = p.response.status })
    const grav = await Q.gravar(nav, { pasta: pastaQuadros })
    const itens = [], naoMedido = [...(doRaioX?.naoMedido || [])], cobertura = []
    const paginas = [{ id: 'inicio', url, tipo: 'inicial' }]

    // Trava de pedidos ligada da abertura de cada página ao fim do percurso dela (escrita, outro site, rota proibida,
    // robots e download barrados). Só a navegação pretendida passa, e só até o load (destino e redirecionamentos
    // revalidados pela trava). Cada ligar zera os barrados: recolher antes. A navegação do clique liga a própria
    // trava e a desliga no fim; por isso a trava é religada logo depois dela.
    const T = await N.travaDe(nav)
    let cursor = 0
    const recolher = (pagina, etapa, jaAnotados = false) => {
      const novos = T.barrados.slice(cursor)
      cursor = T.barrados.length
      return jaAnotados || !novos.length ? [] : N.barradosParaNaoMedido(novos, { pagina, etapa, onde: `etapa ${etapa}` })
    }
    const travar = async (origem, navegar = false) => { await T.ligar({ origem, permitido, navegar }); cursor = 0 }

    // quanto cada etapa levou, por página (paginas[k].tempoPorEtapaMs)
    const tempos = {}
    const tempoDe = (p) => (tempos[p] ??= {})
    // os últimos pedidos pausados pela trava: diagnóstico do Page.navigate que não responde
    const pausados = []
    nav.ouvir('Fetch.requestPaused', (p) => {
      pausados.push({ url: String(p?.request?.url || '').slice(0, 300), etapa: p?.responseStatusCode == null && p?.responseErrorReason == null ? 'pedido' : 'resposta', recurso: p?.resourceType })
      if (pausados.length > 50) pausados.shift()
    })

    // abrir e conferir desafio. Page.navigate sem resposta: diagnóstico (descreverTrava) e UMA nova tentativa, com a
    // trava religada (a vigia fecha a navegação aos 30 s); de novo sem resposta, carregar "falhou" com o motivo.
    // 401/403/429 é bloqueio: sem nova tentativa (o desafio logo abaixo para tudo).
    const abrir = async (pagina, endUrl) => {
      const t0 = Date.now()
      statusDoc = null
      let r
      if (/^https?:$/.test(new URL(endUrl).protocol)) {
        const tentar = async () => {
          pausados.length = 0
          await travar(endUrl, true)
          let fim = false
          const vigia = (async () => { const t0 = Date.now(); while (!fim && !T.carregou && Date.now() - t0 < 30_000) await espera(50); T.navegar = false })()
          try { return await Q.capturarCarregar(nav, grav, { url: endUrl, pagina, secao: 0, limiteNavegarMs }) } finally { fim = true; await vigia }
        }
        r = await tentar()
        if (r.semResposta) {
          const d1 = descreverTrava(T, pausados)
          if ([401, 403, 429].includes(statusDoc)) r.cobertura.motivo += ` (${d1})`
          else {
            avisos.push(`${pagina}: ${r.cobertura.motivo} na primeira tentativa (${d1}); ${vencido() ? 'sem nova tentativa (tempo esgotado)' : 'tentei de novo uma vez'}`)
            naoMedido.push(...recolher(pagina, 'carregar'))
            if (vencido()) r.cobertura.motivo += `; sem segunda tentativa: tempo máximo esgotado (${d1})`
            else {
              statusDoc = null
              r = await tentar()
              if (r.semResposta) r.cobertura.motivo += ` duas vezes; parei sem tentar mais (${descreverTrava(T, pausados)})`
              else avisos.push(`${pagina}: a segunda tentativa do Page.navigate respondeu`)
            }
          }
        }
      } else {
        // a trava só confere http/https (mesmoSite): endereço local de arquivo abre sem ela e a liga depois do carregar
        await T.desligar()
        avisos.push(`${pagina}: endereço ${new URL(endUrl).protocol} aberto sem a trava de pedidos durante o carregar`)
        r = await Q.capturarCarregar(nav, grav, { url: endUrl, pagina, secao: 0, limiteNavegarMs })
        await travar(endUrl, false)
      }
      naoMedido.push(...recolher(pagina, 'carregar'))
      let est = { titulo: '', texto: '' }
      if (!r.semResposta) try { est = await nav.rodar(ESTADO, null, 10_000) } catch {}
      tempoDe(pagina).carregar = Date.now() - t0
      // sem resposta não leu a página: "quase sem texto" ali não é desafio (só o status 401/403/429 conta)
      return { r, desafio: r.semResposta && ![401, 403, 429].includes(statusDoc) ? null : N.pareceDesafio({ status: statusDoc, titulo: est.titulo, texto: est.texto }) }
    }
    const a0 = await abrir('inicio', url)
    if (a0.desafio || a0.r.cobertura.estado === 'falhou') {
      await grav.parar()
      const motivo = a0.desafio ? `bloqueio ou página de desafio (${a0.desafio}); parei, sem tentar outro caminho` : a0.r.cobertura.motivo
      gravado = gravarInvalido({ saida, sufixo, url, tela, motivo, inicio, doRaioX, cobertura: a0.desafio ? [] : [a0.r.cobertura], avisos: avisos.slice(doRaioX?.avisos?.length || 0), tempos: tempoDe('inicio'), naoMedido: naoMedido.slice(doRaioX?.naoMedido?.length || 0) })
      return gravado
    }
    itens.push(...a0.r.itens); cobertura.push(a0.r.cobertura)
    const vh = tela.altura
    const toposInicio = rx?.secoes?.length ? rx.secoes.map((s) => Math.round(s.topoTelas * (rx.viewport?.altura || vh))) : await nav.rodar(TOPOS)
    const papeis = rx?.secoes?.map((s) => s.papel) || []
    const acoesDe = (p) => acoesTodas.filter((a) => (a.pagina || 'inicio') === p)
    const base = { celular, maxMouse, saida, vencido, avisos }
    const m0 = await medirPagina(nav, grav, { ...base, pagina: 'inicio', topos: toposInicio, bruto, papeis, acoes: acoesDe('inicio'), recolher: (e, ja) => recolher('inicio', e, ja), tempos: tempoDe('inicio') })
    itens.push(...m0.itens); naoMedido.push(...m0.naoMedido); cobertura.push(...m0.cobertura)
    paginas[0].bibliotecas = m0.bibliotecas
    paginas[0].raizPx = m0.raizPx
    paginas[0].tempoPorEtapaMs = tempoDe('inicio')
    // clique (só na página inicial)
    let internas = []
    if (vencido()) { naoMedido.push({ pagina: 'inicio', etapa: 'clique', o: 'etapa clique', motivo: 'tempo máximo esgotado antes desta etapa' }); cobertura.push({ pagina: 'inicio', etapa: 'clique', estado: 'falhou', itens: 0, limites: null, motivo: 'tempo máximo esgotado' }) }
    else {
      const t0 = Date.now()
      try {
        const r = await N.capturarNavegacao(nav, grav, { pagina: 'inicio', maxPaginas, permitido })
        itens.push(...r.itens); naoMedido.push(...r.naoMedido); cobertura.push(r.cobertura); avisos.push(...(r.avisos || []))
        for (const p of r.paginas) paginas.push({ ...p })
        // as cópias que vão para o json (valido, bibliotecas e tempos marcados nelas)
        internas = paginas.filter((p) => p.tipo === 'interna' && p.valido !== false)
      } catch (e) {
        const motivo = `erro: ${String(e && e.message || e).slice(0, 160)}`
        naoMedido.push({ pagina: 'inicio', etapa: 'clique', o: 'etapa clique', motivo }); cobertura.push({ pagina: 'inicio', etapa: 'clique', estado: 'falhou', itens: 0, limites: null, motivo })
      }
      tempoDe('inicio').clique = Date.now() - t0
    }
    naoMedido.push(...recolher('inicio', 'clique'))
    await travar(url, false) // a navegação devolve a trava ligada (sem intervalo): volta a origem e zera os barrados até a próxima página (e o fechar)
    // páginas internas: tudo menos o clique
    const toposPorPagina = { inicio: toposInicio }
    for (const p of internas) {
      if (vencido()) { naoMedido.push({ pagina: p.id, etapa: 'carregar', o: `página ${p.id}`, motivo: 'tempo máximo esgotado antes desta página' }); continue }
      if (!(await permitido(p.url))) { naoMedido.push({ pagina: p.id, etapa: 'carregar', o: `página ${p.id}`, motivo: 'o robots.txt não permite abrir a página direto' }); continue }
      const a = await abrir(p.id, p.url)
      if (a.desafio) { p.valido = false; p.motivo = a.desafio; naoMedido.push({ pagina: p.id, etapa: 'carregar', o: `página ${p.id}`, motivo: `bloqueio ou página de desafio (${a.desafio})` }); continue }
      p.tempoPorEtapaMs = tempoDe(p.id)
      if (a.r.cobertura.estado === 'falhou') {
        // não abriu (Page.navigate sem resposta duas vezes, erro de rede): nada a medir; as outras etapas saem "falhou"
        cobertura.push(a.r.cobertura, { pagina: p.id, etapa: 'clique', estado: 'nao-se-aplica', itens: 0, limites: null, motivo: 'link de página interna não é seguido' })
        naoMedido.push({ pagina: p.id, etapa: 'carregar', o: `página ${p.id}`, motivo: a.r.cobertura.motivo })
        continue
      }
      itens.push(...a.r.itens); cobertura.push(a.r.cobertura)
      const topos = await nav.rodar(TOPOS).catch(() => [0])
      toposPorPagina[p.id] = topos
      const m = await medirPagina(nav, grav, { ...base, pagina: p.id, topos, bruto: null, papeis: [], acoes: acoesDe(p.id), recolher: (e, ja) => recolher(p.id, e, ja), tempos: tempoDe(p.id) })
      itens.push(...m.itens); naoMedido.push(...m.naoMedido); cobertura.push(...m.cobertura)
      p.bibliotecas = m.bibliotecas
      p.raizPx = m.raizPx
      cobertura.push({ pagina: p.id, etapa: 'clique', estado: 'nao-se-aplica', itens: 0, limites: null, motivo: 'link de página interna não é seguido' })
    }
    // ainda no navegador: juntar, numerar, montar as folhas e o manifesto
    const j = await fechar({ nav, grav, url, saida, sufixo, tela, celular, itens, naoMedido, cobertura, paginas, toposPorPagina, manual, avisos, inicio, rx })
    await grav.parar()
    avisar(`Movimento${celular ? ' (celular)' : ''}: ${j.itens.length} itens, ${j.naoMedido.length} não medidos, ${j.paginas.length} páginas. Saída em ${saida}`)
    gravado = { codigo: 0, json: j }
    return gravado
  } finally {
    // a página sai do ar com a trava ainda ligada; a trava só acaba junto com o navegador (sem intervalo com a página viva)
    if (!(await tirarDoAr(nav).catch(() => false))) {
      const m = `${celular ? 'celular' : 'computador'}: ${AVISO_NAO_SAIU}`
      console.error('Aviso: ' + m)
      // json já gravado: o aviso entra nele e o json e o inventário são regravados; no caminho de erro, só o stderr
      if (gravado?.json) {
        try {
          gravado.json.avisos.push(m)
          fs.writeFileSync(path.join(saida, `movimento${sufixo}.json`), JSON.stringify(gravado.json, null, 1))
          fs.writeFileSync(path.join(saida, `inventario-movimento${sufixo}.md`), gerarInventarioMd(gravado.json))
        } catch (e) { console.error('Aviso: não consegui regravar o json com o aviso do fechamento: ' + (e?.message || e)) }
      }
    }
    try { await nav.fechar() } catch {}
  }
}

async function fechar({ nav, grav, url, saida, sufixo, tela, celular, itens, naoMedido, cobertura, paginas, toposPorPagina, manual, avisos, inicio, rx }) {
  const vh = tela.altura
  // seção de quem veio com secao: null e posicaoPx
  for (const it of itens) if (it.secao == null && typeof it.posicaoPx === 'number') it.secao = secaoDaPosicao(it.posicaoPx, toposPorPagina[it.pagina] || [0])
  // de/para nos nomes do contrato (px), antes de juntar as fontes; o % que ficou texto por falta de caixa vai aos avisos
  const norm = normalizarItens(itens, { tela, paginas })
  if (norm.ficou.length) {
    const pai = norm.ficou.filter((f) => f.faltas.some((x) => x.falta === 'caixaPai')).length
    avisos.push(`${norm.ficou.length} movimento(s) com % que ficou texto em de/para (sem a caixa do alvo${pai ? `; ${pai} sem a do pai` : ''}): o comparador não lê esse lado`)
  }
  let lista = juntarItens(juntarDisparos(norm.itens))
  for (const h of manual?.itens || []) lista.push({ ...h, doManual: true, fontes: ordenarFontes([h.fontes || [], 'roteiro-manual']) })
  // não medido e cobertura ANTES dos números: só se aposenta número de página e etapa que esta rodada percorreu
  const nm = naoMedido.map((n, k) => ({ id: `N${String(k + 1).padStart(2, '0')}`, ...n }))
  for (const n of nm) { const r = manual?.resolvidos?.[n.id]; if (r) n.resolvido = r }
  const cob = fecharCobertura(cobertura, { paginas, celular, naoMedido: nm })
  nm.forEach((n, k) => { n.id = `N${String(k + 1).padStart(2, '0')}` })
  const rodada = rodadaDe(cob, { naoMedido: nm })
  if (!rodada.completa) {
    const m = `rodada incompleta: ${rodada.motivos.length} motivo(s), o primeiro: ${rodada.motivos[0]}`
    avisos.push(m); console.error('Aviso: ' + m)
  }
  // números
  const arqJson = path.join(saida, `movimento${sufixo}.json`)
  const anteriores = lerJson(arqJson)
  if (celular) vincularVariantes(lerJson(path.join(saida, 'movimento.json'))?.itens || [], lista)
  const itensReservados = []
  const idsAposentados = atribuirIds(lista, anteriores, { prefixo: celular ? 'C' : 'M', percorrida: percorridaDaCobertura(cob), reservados: itensReservados })
  lista.sort((p, q) => (p.pagina === q.pagina ? 0 : p.pagina === 'inicio' ? -1 : q.pagina === 'inicio' ? 1 : p.pagina < q.pagina ? -1 : 1) || (p.secao ?? 99) - (q.secao ?? 99) || String(p.id).localeCompare(String(q.id)))
  // página que chegou por um item de troca
  for (const p of paginas) if (p.tipo === 'interna') { const it = lista.find((i) => i.destino === p.id); p.chegouPor = it ? it.id : null }
  // quadros: rolagem pega os quadros do trecho; os demais, os que a parte guardou (um por item no manifesto)
  const pasta = grav.pasta, rel = path.basename(pasta)
  const folhas = associarQuadros(lista, grav.quadros, { vh })
  for (const it of lista) {
    const qs = folhas.get(it.id) || []
    delete it.quadrosBrutos
    it.quadros = null
    if (!qs.length) continue
    try {
      const folha = await Q.montarFolha(nav, qs, { pasta, legendas: qs.map((q) => (q.gatilho === 'rolagem' ? `${q.rolagemPx} px` : `${q.tMs} ms`)) })
      fs.writeFileSync(path.join(pasta, `${it.id}.jpg`), folha)
      it.quadros = `${rel}/${it.id}.jpg`
    } catch (e) { avisos.push(`folha de ${it.id} não montada: ${String(e.message || e).slice(0, 100)}`) }
  }
  grav.gravarManifesto()
  const j = { versao: 1, valido: true, url, medidoEm: new Date().toISOString().slice(0, 10), tela,
    paginas: paginas.map(({ chegouPorLink, ...p }) => p), itens: lista, cobertura: cob, naoMedido: nm, idsAposentados, itensReservados, rodada, avisos,
    tempoGastoS: Math.round((Date.now() - inicio) / 1000) }
  fs.writeFileSync(path.join(saida, `movimento${sufixo}.json`), JSON.stringify(j, null, 1))
  fs.writeFileSync(path.join(saida, `inventario-movimento${sufixo}.md`), gerarInventarioMd(j))
  return j
}

// ---------------------------------------------------------------------------------------------------------
// Linha de comando
// ---------------------------------------------------------------------------------------------------------

export function lerArgs(argv) {
  const pos = [], op = { celular: false, maxMouse: 24, maxPaginas: 2, tempoMax: 600, passos: 10, limite: 600, bruto: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--celular') op.celular = true
    else if (a === '--bruto') op.bruto = true
    else if (['--max-mouse', '--max-paginas', '--tempo-max', '--passos', '--limite'].includes(a)) {
      const v = Number(argv[++i])
      if (!Number.isFinite(v) || v < (a === '--max-paginas' ? 0 : 1)) throw new Error(`Valor inválido para ${a}`)
      op[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v
    } else if (a.startsWith('--')) throw new Error(`Opção desconhecida: ${a}`)
    else pos.push(a)
  }
  if (pos.length !== 2) throw new Error('Uso: node movimento.mjs <url> <pasta-saida> [--celular] [--max-mouse 24] [--max-paginas 2] [--tempo-max 600]')
  return { url: pos[0], saida: pos[1], ...op }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let op
  try { op = lerArgs(process.argv.slice(2)) } catch (e) { console.error(e.message); process.exit(1) }
  try {
    const inicio = Date.now()
    fs.mkdirSync(op.saida, { recursive: true })
    let endereco
    try { endereco = new URL(op.url) } catch { throw new Error('Informe uma URL http, https ou file válida') }
    if (!local(endereco)) Q.protegerSaida(op.saida)
    // medidas por alvo da página inicial (raio-x da mesma tela, com --movimento); celular grava com sufixo
    // raio-x que falha (página sem seções, de desafio) não impede: a captura confere a página e mede sem as medidas por alvo
    // a primeira visita (a do raio-x) já abre com a trava de pedidos; os barrados dela vão para o movimento.json
    let rx = null
    const protecao = travaDoRaioX()
    try { rx = await raioX({ url: op.url, saida: op.saida, celular: op.celular, sufixo: op.celular ? '-celular' : '', passos: op.passos, limite: op.limite, bruto: op.bruto, movimento: true, avisar: () => {}, aoAbrir: protecao.aoAbrir, antesDeFechar: protecao.antesDeFechar }) } catch (e) { console.error('raio-x: ' + e.message) }
    if (rx?.parou) {
      const tela = { largura: op.celular ? 390 : 1440, altura: op.celular ? 844 : 900, celular: op.celular }
      gravarInvalido({ saida: op.saida, sufixo: op.celular ? '-celular' : '', url: op.url, tela, motivo: rx.parou, inicio, doRaioX: protecao })
      console.error(rx.parou); process.exit(3)
    }
    const r = await capturarMovimento({ ...op, tempoMax: Math.max(1, op.tempoMax - (Date.now() - inicio) / 1000), rx, bruto: rx?._bruto || null, doRaioX: protecao })
    if (r.codigo) process.exit(r.codigo)
  } catch (e) { console.error(e.message); process.exit(1) }
}
