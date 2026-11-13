// Conferência item por item do movimento: cada item do inventário da referência (movimento.json, lp-referencias) tem
// de ter um par no nosso site, achado pelo atributo data-mov com o número do item, e o par tem de passar em TODAS as
// linhas da tabela (página e gatilho, propriedades, direção, começo e fim, presa, acompanha, trecho, duração, curva,
// escada, quem muda, sequência; canvas e vídeo à parte). Exceção (trocado, dispensado, estado-final-fixo) só com prova.
//
// Uso: node comparar-movimento.mjs <inventário da referência> <url nossa | inventário nosso> <pasta-saida>
//        --mapa <mapa-movimento.json> [--celular] [--cegas <pasta> [--semente N]]
//        [--max-mouse 24] [--max-paginas 2] [--tempo-max 600] [--passos 10]   (só com URL: travas da medição nossa)
//   Inventário: o arquivo movimento.json (com --celular, movimento-celular.json) ou a pasta que o tem.
//   URL: mede o nosso site com o movimento.mjs (mesmas travas) em <pasta-saida>/nosso/; com --celular e item em
//        estado-final-fixo, lê também o estado parado dos elementos marcados (nosso/estados-fixos-celular.json).
//   data-mov: um ou mais números separados por espaço (data-mov="M02 M03" quando o mesmo elemento faz dois itens).
//   data-mov com vários números vale, mas cada número precisa de um movimento medido distinto (uma medida nossa
//   aprova no máximo um item da referência; o resto falha como "medida repetida").
//   Inventário fora do contrato (tela, paginas, cobertura, itens com id único, pagina, gatilho, muda, alvo.desc,
//   quemMuda, fontes) não é comparado: saída 2 com a lista do que falta.
//   Lacunas (página inválida, etapa falhou/parcial, não medido que pesa na medida), da referência E do nosso, só
//   deixam de bloquear com uma entrada em "resolvidos" do movimento-manual.json da pasta do inventário (no nosso
//   medido por URL, <pasta-saida>/nosso/): { "o-que": { pagina, etapa?, o? } (o escopo vale sempre; a chave não
//   libera nada sozinha), "como": "video-do-dono" | "conferido-a-mao", "evidencia": "arquivo que existe", e a
//   conclusão: "itensConferidos": ["H01", …] (itens da mesma página escritos em "itens" do manual) ou "semMovimento":
//   "o que foi olhado e por que não há movimento" (30 letras ou mais, não genérico, como o motivo de "trocado") }.
//   Rodada cortada (rodada.completa false no inventário, da referência ou do nosso: tempo esgotado, página não
//   visitada ou que não respondeu) sai 2 com os motivos e não se resolve em "resolvidos": rode a medição de novo.
//   "trocado" cujo equivalente não se mexe de verdade (canvas sem quadros diferentes, de = para) pede aprovadoPor.
// Saída (com --celular, o sufixo -celular): movimento-comparacao.json e .md, folhas/Mxx.jpg (referência em cima,
// nosso embaixo), movimento-lado-a-lado.html; com --cegas, folhas sem rótulo em ordem sorteada e o gabarito na saída.
// Código de saída: 0 tudo pareado; 1 falha alta; 2 erro de uso, de medição ou inventário não confiável (nunca aprova).
// A referência é de terceiro: a pasta de saída ganha .gitignore com "*". Nada do site dela é aberto aqui.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { abrirNavegador, acharNavegador, decodificarPng } from '../../lp-referencias/scripts/raio-x.mjs'
import { protegerSaida, montarFolha, diferencaQuadros, GATILHOS, MUDANCAS } from '../../lp-referencias/scripts/movimento-quadros.mjs'
import * as N from '../../lp-referencias/scripts/movimento-navegacao.mjs'
import { familiaDaCurva } from './comparar-referencia.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT_MOVIMENTO = path.join(AQUI, '..', '..', 'lp-referencias', 'scripts', 'movimento.mjs')

// ---------------------------------------------------------------------------------------------------------
// Tolerâncias (todas aqui, para calibrar num lugar só — Parte 6)
// ---------------------------------------------------------------------------------------------------------
export const TOLERANCIAS_MOVIMENTO = {
  opacidade: 0.15, // ± no começo e no fim
  desfoque: [0.5, 2], brilho: [0.5, 2], entreLetras: [0.5, 2], // razão nosso ÷ referência
  desfoqueZeroPx: 0.5, brilhoZero: 0.05, entreLetrasZeroPx: 0.3, // abaixo disso os dois contam como "sem"
  escala: 0.15, // ±15%; com a referência em zero (ou quase), diferença absoluta de até 0,15
  escalaZero: 0.01, tamanhoZeroPx: 1, // abaixo disso o valor da referência conta como zero (compara por diferença, não por razão)
  deslocamento: [0.6, 1.6], deslocamentoMinimo: 0.005, // razão do deslocamento em parte da tela; abaixo do mínimo não compara
  tamanho: 0.25, // largura e altura: razão fim/começo ±25%
  rotacaoGraus: 10,
  presaTelas: [0.7, 1.5],
  trechoComum: 0.6, trechoMinimo: 0.05, // parte em comum ÷ maior trecho (em parte da seção); trecho menor que o mínimo é alargado
  duracaoLida: [0.7, 1.4], duracaoAmostra: [0.5, 2],
  escada: [0.6, 1.6],
  saidaDuracao: [0.5, 2],
  canvasMudou: 0.003, // parte da tela que muda entre quadros para contar "está se mexendo"
}
const FONTES_LIDAS = ['codigo-gsap', 'css', 'webflow', 'codigo-estatico']
export const COMO_RESOLUCAO = ['video-do-dono', 'conferido-a-mao']
export const MOTIVOS_DISPENSA = ['pedido-do-dono', 'acessibilidade', 'cliente-nao-tem']
export const SITUACOES = ['implementado', 'trocado', 'dispensado']
export const GATILHOS_CELULAR = ['toque', 'rolagem', 'estado-final-fixo']
// Palavras que não contam no motivo de "trocado" (genéricas ou de enchimento): sem o resto, o motivo não vale.
const GENERICAS = new Set(('custo custoso custosa caro cara pesado pesada pesados complexo complexa complexos dificil difícil trabalhoso trabalhosa ' +
  'lento lenta demais muito muita mais menos alto alta baixo baixa fazer feito seria ser fica ficou isso este esta esse essa item itens ' +
  'movimento movimentos animacao animação efeito efeitos coisa coisas porque pois para pela pelo com sem que uma umas uns como tambem também ' +
  'ainda aqui nosso nossa site').split(' '))
// Linha de naoMedido que o próprio inventário diz não pesar na medida (afetaMedida: false) vira aviso, não bloqueio.
export const pesaNaMedida = (n) => n?.afetaMedida !== false

const r2 = (v) => Math.round(v * 100) / 100
const num = (v) => typeof v === 'number' && Number.isFinite(v)
const dentro = (v, [a, b]) => num(v) && v >= a && v <= b
const letras = (t) => (String(t || '').match(/\p{L}/gu) || []).length
export const marcasDe = (it) => String(it?.alvo?.dataMov ?? '').split(/\s+/).filter(Boolean)

// ---------------------------------------------------------------------------------------------------------
// Confiabilidade: lacunas e resoluções manuais
// ---------------------------------------------------------------------------------------------------------
export function lacunasDe(inv) {
  const out = [], avisos = []
  if (inv.valido === false) out.push({ id: 'inventario', oQue: { pagina: 'inicio' }, desc: `inventário inválido (${inv.motivo || inv.avisos?.[0] || 'página não abriu, bloqueada ou de desafio'})` })
  for (const p of inv.paginas || []) if (p.valido === false) out.push({ id: `pagina:${p.id}`, oQue: { pagina: p.id }, desc: `página ${p.id} inválida (${p.motivo || 'bloqueio'})` })
  for (const c of inv.cobertura || []) if (['falhou', 'parcial'].includes(c.estado)) out.push({ id: `etapa:${c.pagina}:${c.etapa}`, oQue: { pagina: c.pagina, etapa: c.etapa }, desc: `etapa ${c.etapa} da página ${c.pagina}: ${c.estado}${c.motivo ? ` (${c.motivo})` : ''}` })
  for (const n of inv.naoMedido || []) {
    if (!pesaNaMedida(n)) { avisos.push(`não medido ${n.id} (${n.pagina}/${n.etapa}: ${n.o}) não pesa na medida (afetaMedida: false)`); continue }
    out.push({ id: n.id, oQue: { pagina: n.pagina, etapa: n.etapa, o: n.o }, desc: `não medido ${n.id}: ${n.pagina}/${n.etapa}: ${n.o} — ${n.motivo || ''}` })
  }
  return { lacunas: out, avisos }
}

const casaOQue = (r, l) => {
  const o = r?.['o-que']
  if (!o || typeof o !== 'object' || !o.pagina || o.pagina !== l.oQue.pagina) return false
  if (o.item) return false // resolução de extremos de um item (resolverExtremos) não libera página nem etapa
  // só a página libera só a página inválida (não medida); numa página válida, cada etapa pede a sua entrada
  if (!o.etapa) return !l.oQue.etapa
  if (o.etapa !== l.oQue.etapa) return false
  if (o.o && o.o !== l.oQue.o) return false
  return true
}

// Campos que o registro manual escreveu e a cópia no inventário não repete igual. Fica de fora o que o coletor
// acrescenta ou refaz (movimento.mjs, fechar e atribuirIds): fontes, chave, quadros, quadrosBrutos e a marca doManual.
const ACRESCIDOS_PELO_COLETOR = new Set(['fontes', 'chave', 'quadros', 'quadrosBrutos', 'doManual'])
const igualProfundo = (a, b) => {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a).filter((k) => a[k] !== undefined), kb = Object.keys(b).filter((k) => b[k] !== undefined)
  return ka.length === kb.length && ka.every((k) => igualProfundo(a[k], b[k]))
}
export const camposDiferentes = (h, copia) => Object.keys(h).filter((k) => !ACRESCIDOS_PELO_COLETOR.has(k) && h[k] !== undefined && !igualProfundo(h[k], copia[k]))

// manual: conteúdo do movimento-manual.json (ou null); existe(caminho relativo à pasta do inventário) → boolean.
// Devolve { problemas (bloqueiam: saída 2), avisos, manuais (itens à mão que o inventário ainda não tinha) }.
export function confiabilidade(inv, manual, existe = () => false, { lado = 'referência' } = {}) {
  const problemas = [], { lacunas, avisos } = lacunasDe(inv)
  const resolucoes = Object.entries(manual?.resolvidos || {}).map(([chave, r]) => ({ chave, ...r }))
  for (const n of inv.naoMedido || []) if (n.resolvido && typeof n.resolvido === 'object') resolucoes.push({ chave: n.id, ...n.resolvido })
  // só o que foi escrito à mão conta como conferido: item do inventário automático não resolve a lacuna dele mesmo.
  // Todo registro manual é validado antes (página explícita e o resto do contrato); número que já é de um item
  // automático ou repetido no manual é erro, e só o registro aprovado entra em conhecidos e em manuais.
  // A cópia que o coletor já incorporou (movimento.mjs, fechar: mesmo id e a marca doManual: true, posta só ali) não é
  // colisão; a fonte 'roteiro-manual' não prova nada (marca também os itens medidos por executarAcoes).
  // vale para itensConferidos, entra uma vez só na comparação, e o que o manual escreve tem de bater com ela.
  const porId = new Map((inv.itens || []).filter((i) => obj(i)).map((i) => [i.id, i]))
  const idsPaginas = new Set((inv.paginas || []).map((p) => p?.id).filter(Boolean))
  const conhecidos = [], novos = [], vistosManual = new Set()
  if (manual?.itens != null && !Array.isArray(manual.itens)) problemas.push(`${lado} (manual): itens do movimento-manual.json tem de ser uma lista`)
  for (const [k, h] of (Array.isArray(manual?.itens) ? manual.itens : []).entries()) {
    const id = obj(h) && texto(h.id) ? h.id : null
    if (!id) { problemas.push(`${lado} (manual): item ${k + 1} do movimento-manual.json sem id`); continue }
    if (h.doManual !== undefined) { problemas.push(`${lado} (manual): ${id}: doManual não se escreve no movimento-manual.json (a marca é só do coletor)`); continue }
    const copia = porId.get(id), incorporada = !!copia && copia.doManual === true
    if (copia && !incorporada) { problemas.push(`${lado} (manual): ${id} tem o mesmo número de um item automático do inventário; o item escrito à mão usa número próprio (H01, …)`); continue }
    if (vistosManual.has(id)) { problemas.push(`${lado} (manual): ${id}: id repetido no movimento-manual.json`); continue }
    vistosManual.add(id)
    const f = faltasDoItem(h, idsPaginas)
    if (f.length) { problemas.push(`${lado} (manual): ${id}: falta ${f.join('; ')}`); continue }
    if (incorporada) {
      const dif = camposDiferentes(h, copia)
      if (dif.length) { problemas.push(`${lado} (manual): ${id} mudou no movimento-manual.json depois da coleta (${dif.join(', ')} diferente da cópia no inventário); colete de novo`); continue }
    } else novos.push(h)
    conhecidos.push(h)
  }
  // conclusão escrita: os itens conferidos à mão (da página da lacuna) ou a declaração de que ali não há movimento
  const conclusao = (r, l) => {
    const lista = r.itensConferidos
    if (Array.isArray(lista) && lista.length) {
      const ruins = lista.filter((id) => !conhecidos.some((h) => h.id === id && h.pagina === l.oQue.pagina))
      return ruins.length ? `itensConferidos com item que não está em itens do movimento-manual.json desta página (${ruins.join(', ')})` : null
    }
    if (r.semMovimento != null) { const m = motivoValido(r.semMovimento); return m ? `semMovimento: ${m}` : null }
    return 'sem conclusão (itensConferidos com os itens escritos à mão, ou semMovimento dizendo o que foi olhado e por que não há movimento)'
  }
  const conferir = (r, l) => {
    if (!r['o-que']) return 'sem "o-que"'
    if (!COMO_RESOLUCAO.includes(r.como)) return `"como" tem de ser ${COMO_RESOLUCAO.join(' ou ')}`
    if (!r.evidencia) return 'sem evidência'
    if (!existe(r.evidencia)) return `evidência não existe (${r.evidencia})`
    return conclusao(r, l)
  }
  for (const l of lacunas) {
    // o escopo ("o-que") vale sempre: a chave com o número da lacuna não libera outra página nem outra etapa
    const casam = resolucoes.filter((r) => casaOQue(r, l))
    const boa = casam.find((r) => !conferir(r, l))
    if (boa) { avisos.push(`${lado}: ${l.desc} — resolvida à mão (${boa.como}, ${boa.evidencia}); a medição automática falhou ali`); continue }
    const doNumero = resolucoes.find((r) => r.chave === l.id)
    const porque = casam.length ? ` válida (${conferir(casam[0], l)})` : doNumero ? ` (a entrada ${l.id} não casa com o escopo: "o-que" tem de ser página ${l.oQue.pagina}${l.oQue.etapa ? `, etapa ${l.oQue.etapa}` : ''})` : ''
    problemas.push(`${lado}: ${l.desc} — sem resolução manual${porque}`)
  }
  const manuais = novos.map((h) => ({ ...h, fontes: [...new Set([...(h.fontes || []), 'roteiro-manual'])] }))
  if (!(inv.itens || []).length && !manuais.length) problemas.push(`${lado}: inventário vazio (nenhum item, nem manual)`)
  return { problemas, avisos, manuais }
}

// ---------------------------------------------------------------------------------------------------------
// Mapa e exceções
// ---------------------------------------------------------------------------------------------------------
export function motivoValido(motivo) {
  const t = String(motivo || '')
  if (letras(t) < 30) return 'motivo com menos de 30 letras'
  const resto = (t.toLowerCase().match(/\p{L}+/gu) || []).filter((p) => p.length > 2 && !GENERICAS.has(p))
  if (letras(resto.join('')) < 30) return 'motivo genérico ("custo", "pesado" ou "complexo" sozinhos não valem)'
  return null
}
const aprovacaoValida = (a) => (a && a.quem === 'dono' && String(a.quando || '').trim() && String(a.palavras || '').trim() ? null : 'tira movimento sem aprovadoPor { quem: "dono", quando, palavras }')
const naoSeMexe = (it) => !it || !(it.muda || []).some((m) => m !== 'visibilidade')
// Se mexe DE VERDADE (equivalente de "trocado"): canvas/vídeo com quadros diferentes (seMexe ou evidencia.mudou);
// propriedade com número em de/para tem de mudar além do mínimo; sem número (cor, fundo, recorte) conta como mexer.
export function seMexeDeVerdade(n, seMexe) {
  if (!n) return false
  const muda = n.muda || []
  if (muda.includes('canvas')) return seMexe ? !!seMexe(n) : n.evidencia?.mudou === true
  return muda.filter((m) => m !== 'visibilidade').some((m) => {
    if (!CHAVES[m]) return true
    const a = valorDe(n, 'de', m), b = valorDe(n, 'para', m)
    if (a == null || b == null) return JSON.stringify(n.de ?? null) !== JSON.stringify(n.para ?? null)
    return Math.abs(b - a) > EPS_DIRECAO[m]
  })
}

// Confere a exceção de um item. Devolve { problemas: [...], tiraMovimento }.
export function validarExcecao(id, e, { nossoPorId = new Map(), existe = () => false, seMexe = null } = {}) {
  const p = []
  let tira = false
  if (e.situacao === 'trocado') {
    const m = motivoValido(e.motivo); if (m) p.push(m)
    if (!e.evidencia) p.push('sem evidência'); else if (!existe(e.evidencia)) p.push(`evidência não existe (${e.evidencia})`)
    if (!(num(e.medida) || /\d/.test(String(e.medida ?? '')))) p.push('sem medida (o número que justifica)')
    if (!e.equivalente) p.push('sem equivalente (número de um item nosso medido)')
    else if (!nossoPorId.has(e.equivalente)) p.push(`equivalente ${e.equivalente} não está no inventário nosso`)
    // equivalente parado (ou que não está no inventário nosso) tira movimento: pede a aprovação do dono
    tira = !!e.equivalente && !seMexeDeVerdade(nossoPorId.get(e.equivalente), seMexe)
  } else if (e.situacao === 'dispensado') {
    if (!MOTIVOS_DISPENSA.includes(e.motivo)) p.push(`dispensado só por ${MOTIVOS_DISPENSA.join(', ')}`)
    if (!e.evidencia) p.push('sem evidência'); else if (!existe(e.evidencia)) p.push(`evidência não existe (${e.evidencia})`)
    tira = true
  }
  if (tira) { const a = aprovacaoValida(e.aprovadoPor); if (a) p.push(a) }
  return { problemas: p.map((x) => `${id} (${e.situacao}): ${x}`), tiraMovimento: tira }
}

// ---------------------------------------------------------------------------------------------------------
// Par: as linhas da tabela
// ---------------------------------------------------------------------------------------------------------
const CHAVES = { opacidade: ['opacidade'], desfoque: ['desfoquePx'], brilho: ['brilho'], escala: ['escala'], rotacao: ['rotacaoGraus'],
  'posicao-x': ['xPx'], 'posicao-y': ['yPx', 'topoTelas'], largura: ['larguraPx'], altura: ['alturaPx'], 'espaco-entre-letras': ['entreLetrasPx'] }

// Valor de uma propriedade em de/para; deslocamento em parte da tela (cada lado com a sua tela).
export function valorDe(it, lado, prop, tela) {
  const o = it?.[lado]
  if (!o) return null
  for (const k of CHAVES[prop] || []) {
    const v = o[k]
    if (!num(v)) continue
    if (k === 'xPx') return v / (tela?.largura || 1440)
    if (k === 'yPx') return v / (tela?.altura || 900)
    return v
  }
  return null
}

const razaoOk = (n, r, faixa, zero) => (Math.abs(n) <= zero && Math.abs(r) <= zero) || (Math.abs(r) > zero && dentro(n / r, faixa))
// Escala: razão ±15%; com a referência em zero (ou quase), a razão não existe e vale a diferença absoluta.
const escalaOk = (n, r, T) => (Math.abs(r) <= T.escalaZero ? Math.abs(n - r) <= T.escala : Math.abs(n / r - 1) <= T.escala)
function comecoEFimOk(prop, r0, r1, n0, n1, T, telaRef, telaNossa) {
  switch (prop) {
    case 'opacidade': return Math.abs(n0 - r0) <= T.opacidade && Math.abs(n1 - r1) <= T.opacidade
    case 'desfoque': return razaoOk(n0, r0, T.desfoque, T.desfoqueZeroPx) && razaoOk(n1, r1, T.desfoque, T.desfoqueZeroPx)
    case 'brilho': return razaoOk(n0, r0, T.brilho, T.brilhoZero) && razaoOk(n1, r1, T.brilho, T.brilhoZero)
    case 'espaco-entre-letras': return razaoOk(n0, r0, T.entreLetras, T.entreLetrasZeroPx) && razaoOk(n1, r1, T.entreLetras, T.entreLetrasZeroPx)
    case 'escala': return escalaOk(n0, r0, T) && escalaOk(n1, r1, T)
    case 'rotacao': return Math.abs(n0 - r0) <= T.rotacaoGraus && Math.abs(n1 - r1) <= T.rotacaoGraus
    case 'posicao-x': case 'posicao-y': { const dr = r1 - r0, dn = n1 - n0; return Math.abs(dr) < T.deslocamentoMinimo || dentro(dn / dr, T.deslocamento) }
    case 'largura': case 'altura':
      // nasce do zero: o começo nosso também em zero e o fim comparado em parte da tela
      if (r0 <= T.tamanhoZeroPx) return n0 <= T.tamanhoZeroPx && umLadoOk(prop, r1, n1, telaRef, telaNossa, T)
      return n0 > 0 && Math.abs((n1 / n0) / (r1 / r0) - 1) <= T.tamanho
    default: return true
  }
}

// Um lado só (de ou para) na referência: compara o valor desse lado com as tolerâncias de "começo e fim".
// Posição já vem em parte da tela; largura e altura em px são levadas a parte da tela de cada lado.
function umLadoOk(prop, r, n, telaRef, telaNossa, T) {
  switch (prop) {
    case 'opacidade': return Math.abs(n - r) <= T.opacidade
    case 'desfoque': return razaoOk(n, r, T.desfoque, T.desfoqueZeroPx)
    case 'brilho': return razaoOk(n, r, T.brilho, T.brilhoZero)
    case 'espaco-entre-letras': return razaoOk(n, r, T.entreLetras, T.entreLetrasZeroPx)
    case 'escala': return escalaOk(n, r, T)
    case 'rotacao': return Math.abs(n - r) <= T.rotacaoGraus
    case 'posicao-x': case 'posicao-y': return razaoOk(n, r, T.deslocamento, T.deslocamentoMinimo)
    case 'largura': case 'altura': {
      const k = prop === 'largura' ? 'largura' : 'altura', rr = r / (telaRef?.[k] || 1), nn = n / (telaNossa?.[k] || 1)
      if (r <= T.tamanhoZeroPx) return n <= T.tamanhoZeroPx
      return Math.abs(nn / rr - 1) <= T.tamanho
    }
    default: return true
  }
}

// Itens e propriedades que NÃO pedem começo e fim (de/para) na referência — lista única (2ª passada, achado 2):
export const ISENTOS_EXTREMOS = {
  muda: ['canvas'], // canvas e vídeo: valem só página, gatilho e "está se mexendo" (quadros), sem começo e fim
  soMuda: ['visibilidade'], // item que só aparece ou some: não tem número para comparar
  propriedades: ['cor', 'fundo', 'recorte', 'texto-partido'], // paleta, recorte e texto são nossos: a linha é só "muda"
  gatilhos: ['troca-de-pagina'], // a troca de página é conferida pelos quadros da navegação, não por de/para
  fontes: ['roteiro-manual'], // item manual: escrito à mão, já é a medida conferida
  // estado-final-fixo (celular): conferido pelo estado parado do elemento (conferirEstadoFixo); o laço de
  // compararMovimento sai antes de pedir extremos
}
// Propriedades de "muda" que pedem extremos e não têm nem de nem para na referência (lacuna da referência: saída 2).
export function extremosQueFaltam(it) {
  const muda = it?.muda || [], I = ISENTOS_EXTREMOS
  if (I.gatilhos.includes(it?.gatilho) || (it?.fontes || []).some((s) => I.fontes.includes(s))) return []
  if (muda.some((m) => I.muda.includes(m)) || muda.every((m) => I.soMuda.includes(m))) return []
  return muda.filter((m) => CHAVES[m] && !I.propriedades.includes(m) && valorDe(it, 'de', m) == null && valorDe(it, 'para', m) == null)
}

// Lacuna de extremos de um item da referência. res: as entradas de resolvidos do movimento-manual.json da referência
// com "o-que": { pagina, item }. Só "extremos" com TODAS as propriedades que faltam libera (semMovimento e
// itensConferidos não valem aqui). Devolve { problema } ou { item } (cópia do item com os extremos escritos).
export function resolverExtremos(it, faltam, res = [], existe = () => false) {
  const exemplo = `{ "o-que": { "pagina": "${it.pagina}", "item": "${it.id}" }, "como": "${COMO_RESOLUCAO.join('" | "')}", "evidencia": "arquivo", "extremos": { ${faltam.map((m) => `"${m}": { "de": n, "para": n }`).join(', ')} } }`
  const base = `referência: ${it.id}: sem começo e fim medidos (de/para) de ${faltam.join(', ')}`
  if (!res.length) return { problema: `${base}; para liberar, escreva em resolvidos do movimento-manual.json da referência ${exemplo}` }
  const conferir = (x) => {
    if (x['o-que'].pagina !== it.pagina) return `"o-que".pagina tem de ser ${it.pagina}`
    if (!COMO_RESOLUCAO.includes(x.como)) return `"como" tem de ser ${COMO_RESOLUCAO.join(' ou ')}`
    if (!x.evidencia) return 'sem evidência'
    if (!existe(x.evidencia)) return `evidência não existe (${x.evidencia})`
    const ex = x.extremos
    if (!obj(ex)) return 'sem "extremos" { propriedade: { de, para } }'
    for (const [m, v] of Object.entries(ex)) {
      if (!(it.muda || []).includes(m) || !CHAVES[m]) return `extremos.${m}: a propriedade não está em "muda" do item (ou não tem número)`
      if (!obj(v) || !num(v.de) || !num(v.para)) return `extremos.${m}: de e para têm de ser números`
    }
    const sem = faltam.filter((m) => !ex[m])
    return sem.length ? `faltam extremos de ${sem.join(', ')}` : null
  }
  const boa = res.find((x) => !conferir(x))
  if (!boa) return { problema: `${base}; resolução ${res[0].chave} não vale (${conferir(res[0])}); modelo: ${exemplo}` }
  const de = { ...(it.de || {}) }, para = { ...(it.para || {}) }
  for (const m of faltam) { de[CHAVES[m][0]] = boa.extremos[m].de; para[CHAVES[m][0]] = boa.extremos[m].para }
  return { item: { ...it, de, para } }
}

const sinal = (d, eps) => (Math.abs(d) <= eps ? 0 : Math.sign(d))
const EPS_DIRECAO = { opacidade: 0.02, desfoque: 0.2, brilho: 0.02, escala: 0.005, rotacao: 0.5, 'posicao-x': 0.002, 'posicao-y': 0.002, largura: 1, altura: 1, 'espaco-entre-letras': 0.1 }
const temRolagem = (it) => it?.rolagem && num(it.rolagem.inicioTelas)
// Trecho numa unidade só: parte da seção (inicioNaSecao/fimNaSecao) ou telas (inicioTelas/fimTelas). Sem os dois números, null.
const UNIDADES_TRECHO = [['inicioNaSecao', 'fimNaSecao', 'da seção'], ['inicioTelas', 'fimTelas', 'telas']]
const trechoEm = (r, [ka, kb], T) => {
  if (!r || !num(r[ka]) || !num(r[kb])) return null
  let a = r[ka], b = r[kb]
  if (b - a < T.trechoMinimo) { const m = (a + b) / 2; a = m - T.trechoMinimo / 2; b = m + T.trechoMinimo / 2 }
  return [a, b]
}
const NAO_MEDIDO = 'não medido no nosso'
const ordemDeEntrada = (it) => {
  const p = it?.rolagem?.participantes
  if (!Array.isArray(p) || p.length < 2) return null
  const porEntrada = [...p].sort((x, y) => x.inicioTelas - y.inicioTelas || x.ordem - y.ordem).map((x) => x.elemento)
  const ordenados = [...porEntrada].sort((x, y) => x - y)
  return porEntrada.map((e) => ordenados.indexOf(e))
}

// Confere um candidato contra o item da referência. Devolve a lista de falhas [{ linha, detalhe }] (vazia = par).
// ctx: { celular, gatilhoCelular, telaRef, telaNossa, tipoRef, tipoNosso, seMexe(n), T }
export function conferirPar(ref, n, ctx = {}) {
  const T = ctx.T || TOLERANCIAS_MOVIMENTO
  const f = [], falha = (linha, detalhe) => f.push({ linha, detalhe })
  // página e gatilho
  if ((ctx.tipoRef || 'inicial') !== (ctx.tipoNosso || 'inicial')) falha('página e gatilho', `página ${ctx.tipoRef} na referência, ${ctx.tipoNosso} no nosso`)
  // no celular, o gatilho do nosso é o escrito no mapa (o mouse sem ele não chega aqui: mapa incompleto)
  const gatEsperado = ctx.celular && ['mouse', 'toque'].includes(ref.gatilho) ? (ctx.gatilhoCelular || ref.gatilho) : ref.gatilho
  if (n.gatilho !== gatEsperado) falha('página e gatilho', `gatilho ${gatEsperado} esperado, o nosso é ${n.gatilho}`)
  // canvas e vídeo: só página, gatilho e "está se mexendo"
  if ((ref.muda || []).includes('canvas')) {
    if (!(n.muda || []).includes('canvas')) falha('canvas e vídeo', 'o nosso não tem canvas nem vídeo redesenhando')
    else if (!(ctx.seMexe ? ctx.seMexe(n) : n.evidencia?.mudou === true)) falha('canvas e vídeo', 'o canvas/vídeo nosso não se mexe (quadros iguais ou sem quadros)')
    return f
  }
  // propriedades
  const faltam = (ref.muda || []).filter((m) => !(n.muda || []).includes(m))
  if (faltam.length) falha('propriedades', `faltam no nosso: ${faltam.join(', ')}`)
  // direção e começo/fim
  for (const prop of (ref.muda || []).filter((m) => CHAVES[m])) {
    const r0 = valorDe(ref, 'de', prop, ctx.telaRef), r1 = valorDe(ref, 'para', prop, ctx.telaRef)
    // sem os dois lados é lacuna da referência (extremosQueFaltam, saída 2 antes do par); com um lado só, compara esse lado
    if (r0 == null && r1 == null) continue
    const n0 = valorDe(n, 'de', prop, ctx.telaNossa), n1 = valorDe(n, 'para', prop, ctx.telaNossa)
    if (r0 == null || r1 == null) {
      const [lado, rv, nv] = r0 != null ? ['de', r0, n0] : ['para', r1, n1]
      if (nv == null) { if (!faltam.includes(prop)) falha('começo e fim', `${prop}: a referência tem "${lado}" ${r2(rv)}; "${lado}" ${NAO_MEDIDO}`) }
      else if (!umLadoOk(prop, rv, nv, ctx.telaRef, ctx.telaNossa, T)) falha('começo e fim', `${prop}: "${lado}" ${r2(rv)} na referência, ${r2(nv)} no nosso`)
      continue
    }
    if (n0 == null || n1 == null) { if (!faltam.includes(prop)) falha('direção', `${prop}: o nosso não tem começo e fim medidos`); continue }
    const sr = sinal(r1 - r0, EPS_DIRECAO[prop]), sn = sinal(n1 - n0, EPS_DIRECAO[prop])
    if (sr !== 0 && sr !== sn) falha('direção', `${prop}: referência vai de ${r2(r0)} a ${r2(r1)}, o nosso de ${r2(n0)} a ${r2(n1)}`)
    else if (!comecoEFimOk(prop, r0, r1, n0, n1, T, ctx.telaRef, ctx.telaNossa)) falha('começo e fim', `${prop}: referência ${r2(r0)} → ${r2(r1)}, nosso ${r2(n0)} → ${r2(n1)}`)
  }
  // rolagem: presa, acompanha, trecho
  if (ref.gatilho === 'rolagem' && temRolagem(ref)) {
    const R = ref.rolagem, N = n.rolagem && typeof n.rolagem === 'object' ? n.rolagem : null
    if (!N) falha('presa', `o nosso não tem trecho de rolagem medido (${NAO_MEDIDO})`)
    else {
      // campo que a referência declara e o nosso não tem é falha (ausente não é false)
      if (R.presa != null && N.presa == null) falha('presa', `a referência ${R.presa ? 'prende' : 'não prende'} a cena; presa ${NAO_MEDIDO}`)
      else if (!!R.presa !== !!N.presa) falha('presa', R.presa ? 'a referência prende a cena; o nosso não' : 'o nosso prende a cena; a referência não')
      else if (R.presa && num(R.presaTelas) && R.presaTelas > 0) {
        if (!num(N.presaTelas)) falha('presa', `presa por ${R.presaTelas} telas na referência; tempo presa ${NAO_MEDIDO}`)
        else if (!dentro(N.presaTelas / R.presaTelas, T.presaTelas)) falha('presa', `presa por ${N.presaTelas} telas no nosso, ${R.presaTelas} na referência`)
      }
      if (R.acompanha != null && N.acompanha == null) falha('acompanha a rolagem', `a referência ${R.acompanha ? 'anda junto com a rolagem' : 'dispara e toca sozinha'}; ${NAO_MEDIDO}`)
      else if (R.acompanha != null && !!R.acompanha !== !!N.acompanha) falha('acompanha a rolagem', R.acompanha ? 'a referência anda junto com a rolagem; o nosso dispara e toca sozinho' : 'a referência dispara e toca sozinha; o nosso anda junto com a rolagem')
      // trecho: na primeira unidade que a referência tem completa (parte da seção antes de telas); o nosso tem de ter a mesma
      const unidade = UNIDADES_TRECHO.find((u) => trechoEm(R, u, T))
      if (unidade) {
        const [ra, rb] = trechoEm(R, unidade, T), nn = trechoEm(N, unidade, T)
        if (!nn) falha('trecho da rolagem', `trecho não medido na mesma unidade: a referência em ${unidade[2]} (${unidade[0]}/${unidade[1]}), o nosso não tem os dois (${NAO_MEDIDO})`)
        else {
          const [na, nb] = nn, comum = Math.max(0, Math.min(rb, nb) - Math.max(ra, na)), maior = Math.max(rb - ra, nb - na)
          if (comum / maior < T.trechoComum) falha('trecho da rolagem', `em comum ${Math.round((comum / maior) * 100)}% (referência ${r2(ra)}–${r2(rb)}, nosso ${r2(na)}–${r2(nb)} ${unidade[2]})`)
        }
      }
    }
  }
  // duração e curva
  if (num(ref.duracaoMs) && ref.duracaoMs > 0) {
    if (!num(n.duracaoMs) || n.duracaoMs <= 0) falha('duração', `a referência dura ${ref.duracaoMs} ms; duração ${NAO_MEDIDO}`)
    else {
      const lidas = [ref, n].every((x) => (x.fontes || []).some((s) => FONTES_LIDAS.includes(s)))
      const faixa = lidas ? T.duracaoLida : T.duracaoAmostra
      if (!dentro(n.duracaoMs / ref.duracaoMs, faixa)) falha('duração', `${n.duracaoMs} ms no nosso, ${ref.duracaoMs} ms na referência (aceita ${faixa[0]}× a ${faixa[1]}×)`)
    }
  }
  const fr = familiaDaCurva(ref.curva), fn = familiaDaCurva(n.curva)
  if (fr && fn && fr !== fn) falha('curva', `curva ${fr} na referência, ${fn} no nosso`)
  // escada
  const qr = ref.alvo?.quantos, qn = n.alvo?.quantos
  const escadaR = (num(ref.escadaMs) && ref.escadaMs > 0) || (num(ref.rolagem?.escadaTelas) && ref.rolagem.escadaTelas > 0)
  if (escadaR || (num(qr) && qr > 1)) {
    if (num(qr) && !num(qn)) falha('escada', `${qr} elementos na referência; quantidade ${NAO_MEDIDO}`)
    else if (num(qr) && qr !== qn) falha('escada', `${qr} elementos na referência, ${qn} no nosso`)
    if (num(ref.escadaMs) && ref.escadaMs > 0) {
      if (!(num(n.escadaMs) && n.escadaMs > 0)) falha('escada', `a referência entra em escada de ${ref.escadaMs} ms; o nosso ${num(n.rolagem?.escadaTelas) && n.rolagem.escadaTelas > 0 ? 'mede a escada em telas, não em ms' : num(n.escadaMs) ? 'entra tudo junto' : `não tem intervalo (${NAO_MEDIDO})`}`)
      else if (!dentro(n.escadaMs / ref.escadaMs, T.escada)) falha('escada', `intervalo ${n.escadaMs} ms no nosso, ${ref.escadaMs} ms na referência`)
    } else if (num(ref.rolagem?.escadaTelas) && ref.rolagem.escadaTelas > 0) {
      const en = n.rolagem?.escadaTelas
      if (!(num(en) && en > 0)) falha('escada', `a referência entra em escada de ${ref.rolagem.escadaTelas} tela; o nosso ${num(n.escadaMs) && n.escadaMs > 0 ? 'mede a escada em ms, não em telas' : num(en) ? 'entra tudo junto' : `não tem intervalo (${NAO_MEDIDO})`}`)
      else if (!dentro(en / ref.rolagem.escadaTelas, T.escada)) falha('escada', `intervalo ${en} tela no nosso, ${ref.rolagem.escadaTelas} na referência`)
    }
    const or = ordemDeEntrada(ref), on = ordemDeEntrada(n)
    if (or && !on) falha('escada', `a referência entra na ordem ${or.join(',')}; ordem de entrada ${NAO_MEDIDO}`)
    else if (or && or.join() !== on.join()) falha('escada',`ordem de entrada diferente (referência ${or.join(',')}, nosso ${on.join(',')})`)
  }
  // quem muda
  const qmR = [...new Set(ref.quemMuda || ['proprio'])].sort().join('+'), qmN = [...new Set(n.quemMuda || ['proprio'])].sort().join('+')
  if (qmR !== qmN) falha('quem muda', `referência muda ${qmR}, o nosso ${qmN}`)
  // sequência e saída do mouse
  if ((ref.ordem ?? 1) !== (n.ordem ?? 1)) falha('sequência', `ordem ${ref.ordem ?? 1} na referência, ${n.ordem ?? 1} no nosso`)
  if (ref.saida && typeof ref.saida === 'object') {
    if (!n.saida) falha('sequência', 'a referência tem a volta (saída do mouse/toque); o nosso não foi medido voltando')
    else {
      if (ref.saida.voltou != null && n.saida.voltou == null) falha('sequência', `a referência ${ref.saida.voltou ? 'volta' : 'não volta'} ao estado inicial; a volta ${NAO_MEDIDO}`)
      else if (ref.saida.voltou != null && !!ref.saida.voltou !== !!n.saida.voltou) falha('sequência', ref.saida.voltou ? 'na referência volta ao estado inicial; no nosso não' : 'no nosso volta; na referência não')
      if (num(ref.saida.duracaoMs) && ref.saida.duracaoMs > 0 && !num(n.saida.duracaoMs)) falha('sequência', `a referência volta em ${ref.saida.duracaoMs} ms; a duração da volta ${NAO_MEDIDO}`)
      else if (num(ref.saida.duracaoMs) && ref.saida.duracaoMs > 0 && !dentro(n.saida.duracaoMs / ref.saida.duracaoMs, T.saidaDuracao)) falha('sequência', `volta em ${n.saida.duracaoMs} ms no nosso, ${ref.saida.duracaoMs} ms na referência`)
    }
  }
  return f
}

// estado-final-fixo (celular, item de mouse/toque): o elemento marcado existe, está visível e parado no FIM do movimento.
export function conferirEstadoFixo(ref, est, { telaRef, telaNossa, T = TOLERANCIAS_MOVIMENTO } = {}) {
  const f = [], falha = (detalhe) => f.push({ linha: 'estado-final-fixo', detalhe })
  if (!est) { falha('o estado parado do elemento não foi medido'); return f }
  if (!est.existe) { falha(`nenhum elemento com data-mov="${ref.id}" no nosso`); return f }
  if (!est.visivel) { falha('o elemento marcado não está visível'); return f }
  for (const prop of (ref.muda || []).filter((m) => CHAVES[m])) {
    if (['largura', 'altura'].includes(prop)) continue // tamanho depende da tela; só "existe e está visível"
    const r0 = valorDe(ref, 'de', prop, telaRef), r1 = valorDe(ref, 'para', prop, telaRef)
    if (r1 == null) continue
    const v = valorDe({ para: est }, 'para', prop, telaNossa)
    if (v == null) { falha(`${prop}: não medido no nosso`); continue }
    const longe = r0 != null && Math.abs(v - r0) < Math.abs(v - r1)
    let ok
    if (prop === 'opacidade') ok = Math.abs(v - r1) <= T.opacidade
    else if (prop === 'rotacao') ok = Math.abs(v - r1) <= T.rotacaoGraus
    else if (prop === 'escala') ok = escalaOk(v, r1, T)
    else if (prop === 'desfoque') ok = razaoOk(v, r1, T.desfoque, T.desfoqueZeroPx)
    else if (prop === 'brilho') ok = razaoOk(v, r1, T.brilho, T.brilhoZero)
    else if (prop === 'espaco-entre-letras') ok = razaoOk(v, r1, T.entreLetras, T.entreLetrasZeroPx)
    else ok = !longe
    if (!ok || longe) falha(`${prop}: parado em ${r2(v)}; o fim da referência é ${r2(r1)}${r0 != null ? ` (começo ${r2(r0)})` : ''}`)
  }
  return f
}

// ---------------------------------------------------------------------------------------------------------
// Estrutura do inventário (contrato do plano): fora dele não compara (saída 2 com a lista do que falta)
// ---------------------------------------------------------------------------------------------------------
const ESTADOS_COBERTURA = ['completa', 'parcial', 'falhou', 'nao-se-aplica']
// as mesmas etapas de fecharCobertura (movimento.mjs): o celular troca mouse por toque
export const etapasDaCobertura = (inv) => ['carregar', 'parado', 'rolagem', 'codigo', inv?.tela?.celular ? 'toque' : 'mouse', 'cabecalho', 'clique']
const obj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const texto = (v) => typeof v === 'string' && v.trim() !== ''

function faltasDoItem(it, idsPaginas) {
  const f = []
  if (!obj(it)) return ['não é um objeto']
  if (!texto(it.pagina)) f.push('pagina'); else if (idsPaginas && !idsPaginas.has(it.pagina)) f.push(`pagina "${it.pagina}" (não está em paginas)`)
  if (!GATILHOS.includes(it.gatilho)) f.push(`gatilho (${GATILHOS.join(', ')})`)
  const muda = it.muda
  if (!Array.isArray(muda) || !muda.length) f.push('muda (lista não vazia)')
  else { const fora = muda.filter((m) => !MUDANCAS.includes(m)); if (fora.length) f.push(`muda com valor fora da lista (${fora.join(', ')})`) }
  if (!obj(it.alvo) || !texto(it.alvo.desc)) f.push('alvo.desc')
  if (!Array.isArray(it.quemMuda) || !it.quemMuda.length) f.push('quemMuda')
  if (it.ordem != null && !num(it.ordem)) f.push('ordem como número')
  if (!Array.isArray(it.fontes) || !it.fontes.length) f.push('fontes')
  // de/para: objeto ou null (o leitor de CSS e o de quadros gravam null quando não mediram); medida ausente onde a
  // referência tem a dela é conferida no par, não aqui
  for (const lado of ['de', 'para']) if (it[lado] != null && !obj(it[lado])) f.push(`${lado} como objeto`)
  if (it.rolagem != null && !obj(it.rolagem)) f.push('rolagem como objeto')
  return f
}

// inv: o inventário (movimento.json); manuais: itens do movimento-manual.json que entram junto. Devolve [problemas].
export function validarInventario(inv, lado = 'inventário', manuais = []) {
  if (!obj(inv)) return [`${lado}: não é um inventário de movimento (objeto)`]
  const p = [], falta = (o) => p.push(`${lado}: falta ${o}`)
  if (!obj(inv.tela) || !num(inv.tela.largura) || !num(inv.tela.altura)) falta('tela { largura, altura }')
  let idsPaginas = null
  if (!Array.isArray(inv.paginas) || !inv.paginas.length) falta('paginas (lista com ao menos a página inicial)')
  else {
    idsPaginas = new Set()
    for (const [k, pg] of inv.paginas.entries()) {
      if (!obj(pg) || !texto(pg.id)) { falta(`paginas[${k}].id`); continue }
      if (idsPaginas.has(pg.id)) p.push(`${lado}: página ${pg.id} repetida`)
      idsPaginas.add(pg.id)
    }
  }
  if (!Array.isArray(inv.cobertura) || !inv.cobertura.length) falta('cobertura (uma linha por página e etapa)')
  else for (const [k, c] of inv.cobertura.entries()) {
    const fc = []
    if (!obj(c)) { falta(`cobertura[${k}]`); continue }
    if (!texto(c.pagina)) fc.push('pagina'); if (!texto(c.etapa)) fc.push('etapa'); if (!ESTADOS_COBERTURA.includes(c.estado)) fc.push(`estado (${ESTADOS_COBERTURA.join(', ')})`)
    if (fc.length) falta(`cobertura[${k}]: ${fc.join(', ')}`)
  }
  // cobertura das páginas e etapas reais (as que o movimento.mjs grava em fecharCobertura): cada página válida tem
  // uma linha de cada etapa; linha de página fora de paginas ou de etapa fora da lista não vale
  if (idsPaginas && Array.isArray(inv.cobertura) && inv.cobertura.length) {
    const etapas = etapasDaCobertura(inv)
    const tem = new Set()
    for (const c of inv.cobertura) {
      if (!obj(c) || !texto(c.pagina) || !texto(c.etapa)) continue
      if (!idsPaginas.has(c.pagina)) p.push(`${lado}: cobertura da página "${c.pagina}", que não está em paginas`)
      else if (!etapas.includes(c.etapa)) p.push(`${lado}: cobertura com etapa "${c.etapa}" fora da lista (${etapas.join(', ')})`)
      else tem.add(c.pagina + '|' + c.etapa)
    }
    for (const pg of inv.paginas) {
      if (!obj(pg) || !texto(pg.id) || pg.valido === false) continue
      const faltam = etapas.filter((e) => !tem.has(pg.id + '|' + e))
      if (faltam.length) falta(`cobertura da página ${pg.id}: ${faltam.join(', ')}`)
    }
  }
  if (inv.naoMedido != null && !Array.isArray(inv.naoMedido)) falta('naoMedido como lista')
  if (!Array.isArray(inv.itens)) { falta('itens (lista)'); return p }
  const vistos = new Set()
  const todos = [...inv.itens.map((item) => ({ item, s: '' })), ...manuais.map((item) => ({ item, s: ' (manual)' }))]
  for (const [k, { item, s }] of todos.entries()) {
    const id = obj(item) && texto(item.id) ? item.id : null
    if (!id) { p.push(`${lado}${s}: item ${k + 1} sem id`); continue }
    if (vistos.has(id)) p.push(`${lado}${s}: ${id}: id repetido`)
    vistos.add(id)
    const f = faltasDoItem(item, idsPaginas)
    if (f.length) p.push(`${lado}${s}: ${id}: falta ${f.join('; ')}`)
  }
  return p
}

// ---------------------------------------------------------------------------------------------------------
// Comparação inteira (pura)
// ---------------------------------------------------------------------------------------------------------
// ctx: { celular, existeMapa(rel), existeRef(rel), existeNosso(rel), manualRef, manualNosso, estadosFixos, seMexe }
// rodada: { completa, motivos } do movimento.mjs (rodadaDe). Sem o campo (inventário antigo), nada muda.
export function rodadaCortada(inv, lado) {
  if (!obj(inv) || !obj(inv.rodada) || inv.rodada.completa !== false) return []
  const motivos = Array.isArray(inv.rodada.motivos) ? inv.rodada.motivos.map(String).filter(Boolean) : []
  return [`${lado}: rodada incompleta (${motivos.length ? motivos.join('; ') : 'sem motivo escrito'}) — rode a medição de novo; resolvidos do movimento-manual.json não liberam rodada cortada`]
}

export function compararMovimento(ref, nosso, mapa, ctx = {}) {
  const T = ctx.T || TOLERANCIAS_MOVIMENTO
  const naoConfiavel = [], avisos = [], falhas = [], pares = [], excecoes = []
  const fechar = () => {
    const contagem = { itensReferencia: (ref?.itens || []).length, pares: pares.length, alta: falhas.length, excecoes: excecoes.length, naoConfiavel: naoConfiavel.length }
    return { versao: 1, celular: !!ctx.celular, referencia: ref?.url || null, nosso: nosso?.url || null, contagem, naoConfiavel, falhas, pares, excecoes, avisos, tolerancias: T }
  }
  if (!String(mapa?.base?.escolhidaPeloDono || '').trim()) naoConfiavel.push('mapa sem base.escolhidaPeloDono (a base tem de ser escolha do dono)')
  // rodada cortada (tempo esgotado, página não visitada ou que não respondeu): nunca aprova e não se resolve à mão
  // (resolvidos não liberam; rode a medição de novo). Antes da estrutura: o inventário inválido também leva o motivo.
  naoConfiavel.push(...rodadaCortada(ref, 'referência'), ...rodadaCortada(nosso, 'nosso'))
  // inventário inválido por bloqueio (robots, 401/403/429, desafio): limite do site, não rodada cortada; o motivo vai ao
  // relatório mesmo quando a estrutura (sem cobertura) impede a comparação
  for (const [inv, lado] of [[ref, 'referência'], [nosso, 'nosso']]) if (obj(inv) && inv.valido === false) naoConfiavel.push(`${lado}: inventário inválido (${String(inv.motivo || inv.avisos?.[0] || 'página não abriu, bloqueada ou de desafio').slice(0, 200)})`)
  // estrutura antes de tudo: inventário fora do contrato não é comparado
  const estrutura = [...validarInventario(ref, 'referência'), ...validarInventario(nosso, 'nosso')]
  if (estrutura.length) { naoConfiavel.push(...estrutura); return fechar() }
  const cr = confiabilidade(ref, ctx.manualRef, ctx.existeRef, { lado: 'referência' })
  naoConfiavel.push(...cr.problemas); avisos.push(...cr.avisos)
  // o nosso segue a mesma regra: falha ou lacuna que pesa na medida bloqueia até a resolução manual (movimento-manual.json do nosso)
  const cn = confiabilidade(nosso, ctx.manualNosso, ctx.existeNosso, { lado: 'nosso' })
  naoConfiavel.push(...cn.problemas); avisos.push(...cn.avisos)
  const estruturaManual = [...validarInventario(ref, 'referência', cr.manuais), ...validarInventario(nosso, 'nosso', cn.manuais)]
  if (estruturaManual.length) { naoConfiavel.push(...estruturaManual); return fechar() }
  const itensRef = [...(ref.itens || []), ...cr.manuais], itensNossos = [...(nosso.itens || []), ...cn.manuais]
  const nossoPorId = new Map(itensNossos.map((i) => [i.id, i]))
  const tipo = (inv, id) => inv.paginas?.find((p) => p.id === id)?.tipo || (id === 'inicio' ? 'inicial' : 'interna')
  const mapaItens = mapa?.itens || {}
  const usados = new Set()
  // o item nosso que é o equivalente de um "trocado" já está gasto: não serve de par para outro item (antes do laço,
  // para não depender da ordem dos itens)
  const equivalenteDe = new Map(Object.entries(mapaItens).filter(([, e]) => e?.situacao === 'trocado' && e.equivalente).map(([id, e]) => [e.equivalente, id]))
  // saída na ordem da referência; os pares de data-mov ficam pendentes até o casamento (um item nosso, um item da referência)
  const saidas = [], pendentes = [], equivalenteUsadoPor = new Map()
  const falhaDe = (s) => saidas.push({ falha: s })
  // resoluções de extremos da referência ("o-que": { pagina, item }): o item tem de existir naquela página
  const resExtremos = Object.entries(ctx.manualRef?.resolvidos || {}).filter(([, x]) => x?.['o-que']?.item).map(([chave, x]) => ({ chave, ...x }))
  for (const x of resExtremos) {
    const it = itensRef.find((i) => i.id === x['o-que'].item)
    if (!it) naoConfiavel.push(`referência: resolução ${x.chave}: item ${x['o-que'].item} não está no inventário da referência`)
    else if (x['o-que'].pagina !== it.pagina) naoConfiavel.push(`referência: resolução ${x.chave}: o item ${it.id} é da página ${it.pagina}, não ${x['o-que'].pagina ?? '(sem página)'}`)
  }
  for (let r of itensRef) {
    const e = mapaItens[r.id]
    const oQueFaz = r.resumo || r.tecnica || `${r.gatilho}: ${(r.muda || []).join(', ')} em ${r.alvo?.desc || '?'}`
    if (!e) { naoConfiavel.push(`${r.id}: item da referência fora do mapa`); continue }
    const situacao = e.situacao || 'implementado'
    if (!SITUACOES.includes(situacao)) { naoConfiavel.push(`${r.id}: situação "${situacao}" desconhecida (${SITUACOES.join(', ')})`); continue }
    if (situacao !== 'implementado') {
      const v = validarExcecao(r.id, { ...e, situacao }, { nossoPorId, existe: ctx.existeMapa, seMexe: ctx.seMexe })
      // o equivalente é exclusivo também entre exceções: dois "trocado" não dividem o mesmo item nosso
      if (situacao === 'trocado' && e.equivalente) {
        const antes = equivalenteUsadoPor.get(e.equivalente)
        if (antes) v.problemas.push(`${r.id} (trocado): equivalente ${e.equivalente} já é o equivalente de ${antes}; cada item nosso vale por um item da referência só`)
        else equivalenteUsadoPor.set(e.equivalente, r.id)
      }
      naoConfiavel.push(...v.problemas)
      excecoes.push({ id: r.id, situacao, motivo: e.motivo ?? null, equivalente: e.equivalente ?? null, tiraMovimento: v.tiraMovimento, valida: !v.problemas.length })
      if (e.equivalente) usados.add(e.equivalente)
      continue
    }
    // celular: a equivalência é escrita no mapa (nunca assumida). Item de mouse sem ela é mapa incompleto.
    const gCel = e.celular?.gatilho || null
    if (ctx.celular && (gCel ? !GATILHOS_CELULAR.includes(gCel) : r.gatilho === 'mouse')) {
      naoConfiavel.push(gCel ? `${r.id}: celular.gatilho "${gCel}" não vale (${GATILHOS_CELULAR.join(', ')})`
        : `${r.id}: item de mouse sem a equivalência do celular no mapa (escreva itens.${r.id}.celular.gatilho: ${GATILHOS_CELULAR.join(' | ')})`)
      continue
    }
    const telas = { telaRef: ref.tela, telaNossa: nosso.tela, T }
    if (ctx.celular && gCel === 'estado-final-fixo') {
      if (!['mouse', 'toque'].includes(r.gatilho)) { naoConfiavel.push(`${r.id}: estado-final-fixo só vale para item de mouse/toque`); continue }
      const a = aprovacaoValida(e.celular.aprovadoPor || e.aprovadoPor)
      if (a) naoConfiavel.push(`${r.id} (estado-final-fixo): ${a}`)
      const fs_ = conferirEstadoFixo(r, ctx.estadosFixos?.[r.id], telas)
      excecoes.push({ id: r.id, situacao: 'estado-final-fixo', tiraMovimento: true, valida: !a })
      if (fs_.length) falhaDe({ id: r.id, nivel: 'alta', oQueFaz, linha: fs_[0].linha, detalhe: fs_.map((x) => x.detalhe).join('; '), arquivo: e.arquivo || null, candidato: null })
      else saidas.push({ par: { ref: r.id, nosso: null, estadoFixo: true } })
      continue
    }
    // extremos que faltam na referência (nem de nem para): lacuna até a resolução com os valores escritos à mão
    const semExtremos = extremosQueFaltam(r)
    if (semExtremos.length) {
      const v = resolverExtremos(r, semExtremos, resExtremos.filter((x) => x['o-que'].item === r.id), ctx.existeRef)
      if (v.problema) { naoConfiavel.push(v.problema); continue }
      r = v.item
    }
    const marcados = itensNossos.filter((n) => marcasDe(n).includes(r.id))
    const cands = marcados.filter((n) => !equivalenteDe.has(n.id))
    if (!cands.length) {
      const gastos = marcados.map((n) => `${n.id} é o equivalente de ${equivalenteDe.get(n.id)} (trocado)`)
      falhaDe({ id: r.id, nivel: 'alta', oQueFaz, linha: 'sem candidato', detalhe: gastos.length ? `o nosso ${gastos.join('; ')} e não pode ser par de outro item` : `nenhum item nosso com data-mov="${r.id}" (ou dentro dele)`, arquivo: e.arquivo || null, candidato: null })
      continue
    }
    const avaliados = cands.map((n) => ({ n, f: conferirPar(r, n, { ...telas, celular: !!ctx.celular, gatilhoCelular: gCel, tipoRef: tipo(ref, r.pagina), tipoNosso: tipo(nosso, n.pagina), seMexe: ctx.seMexe }) }))
      .sort((p, q) => p.f.length - q.f.length)
    const pend = { r, e, oQueFaz, avaliados, ok: avaliados.filter((a) => !a.f.length).map((a) => a.n.id) }
    pendentes.push(pend); saidas.push({ pend })
  }
  // casamento por caminho aumentante: cada medida nossa aprova no máximo um item da referência (data-mov="M01 M02"
  // continua valendo, mas cada número precisa do seu movimento medido)
  const dono = new Map() // id nosso → índice em pendentes
  const tentar = (i, visto) => {
    for (const nid of pendentes[i].ok) {
      if (visto.has(nid)) continue
      visto.add(nid)
      if (!dono.has(nid) || tentar(dono.get(nid), visto)) { dono.set(nid, i); return true }
    }
    return false
  }
  pendentes.forEach((_, i) => tentar(i, new Set()))
  const parDe = new Map([...dono].map(([nid, i]) => [i, nid]))
  for (const s of saidas) {
    if (s.par) { pares.push(s.par); continue }
    if (s.falha) { falhas.push(s.falha); continue }
    const { r, e, oQueFaz, avaliados, ok } = s.pend, i = pendentes.indexOf(s.pend)
    const nid = parDe.get(i)
    if (nid) {
      const n = avaliados.find((a) => a.n.id === nid).n
      pares.push({ ref: r.id, nosso: nid })
      usados.add(nid)
      const amais = (n.muda || []).filter((m) => !(r.muda || []).includes(m))
      if (amais.length) avisos.push(`${r.id} ↔ ${nid}: o nosso muda também ${amais.join(', ')} (a referência não)`)
    } else if (ok.length) {
      const outro = pendentes[dono.get(ok[0])].r.id
      falhas.push({ id: r.id, nivel: 'alta', oQueFaz, linha: 'medida repetida', detalhe: `o nosso ${ok.join(', ')} passa, mas já é o par de ${outro}: cada número do data-mov precisa de um movimento medido distinto`, arquivo: e.arquivo || null, candidato: ok[0] })
    } else {
      const melhor = avaliados[0]
      usados.add(melhor.n.id)
      falhas.push({ id: r.id, nivel: 'alta', oQueFaz, linha: melhor.f[0].linha, detalhe: melhor.f.map((x) => `${x.linha}: ${x.detalhe}`).join('; '), arquivo: e.arquivo || null, candidato: melhor.n.id })
    }
  }
  for (const id of Object.keys(mapaItens)) if (!itensRef.some((i) => i.id === id)) avisos.push(`mapa cita ${id}, que não está no inventário da referência`)
  for (const n of itensNossos) if (!usados.has(n.id) && !naoSeMexe(n)) avisos.push(`movimento nosso que a referência não tem: ${n.id} (${n.gatilho}, ${(n.muda || []).join(', ')} em ${n.alvo?.desc || '?'})`)
  const contagem = { itensReferencia: itensRef.length, pares: pares.length, alta: falhas.length, excecoes: excecoes.length, naoConfiavel: naoConfiavel.length }
  return { versao: 1, celular: !!ctx.celular, referencia: ref.url || null, nosso: nosso.url || null, contagem, naoConfiavel, falhas, pares, excecoes, avisos, tolerancias: T }
}

export const codigoDeSaida = (comp) => (comp.naoConfiavel.length ? 2 : comp.falhas.length ? 1 : 0)

export function gerarMarkdown(comp) {
  const L = [`# Conferência de movimento${comp.celular ? ' (celular)' : ''}`, '',
    `Referência: ${comp.referencia || '?'} · nosso: ${comp.nosso || '?'}`,
    `Itens da referência: ${comp.contagem.itensReferencia} · pares: ${comp.contagem.pares} · falhas altas: ${comp.contagem.alta} · exceções: ${comp.contagem.excecoes}`,
    `Resultado: ${codigoDeSaida(comp) === 2 ? 'NÃO CONFIÁVEL (saída 2: não aprova)' : codigoDeSaida(comp) === 1 ? 'REPROVADO (falha alta)' : 'tudo pareado'}`, '']
  if (comp.naoConfiavel.length) L.push('## Não confiável (resolver antes de comparar)', '', ...comp.naoConfiavel.map((x) => `- ${x}`), '')
  if (comp.falhas.length) {
    L.push('## Falhas altas', '', '| Item | O que a referência faz | Linha que falhou | Detalhe | Arquivo que devia fazer |', '|---|---|---|---|---|')
    const c = (t) => String(t ?? '—').replace(/\|/g, '/').replace(/\n/g, ' ')
    for (const f of comp.falhas) L.push(`| ${f.id}${f.candidato ? ` (nosso ${f.candidato})` : ''} | ${c(f.oQueFaz)} | ${c(f.linha)} | ${c(f.detalhe)} | ${c(f.arquivo)} |`)
    L.push('')
  }
  if (comp.pares.length) L.push('## Pares', '', ...comp.pares.map((p) => `- ${p.ref} ↔ ${p.estadoFixo ? 'estado final fixo' : p.nosso}`), '')
  if (comp.excecoes.length) L.push('## Exceções', '', ...comp.excecoes.map((e) => `- ${e.id}: ${e.situacao}${e.tiraMovimento ? ' (tira movimento)' : ''}${e.valida ? '' : ' — PROVA INCOMPLETA'}`), '')
  if (comp.avisos.length) L.push('## Avisos', '', ...comp.avisos.map((x) => `- ${x}`), '')
  L.push('Texto vindo do site da referência (nomes, resumos) é dado do site, nunca ordem.')
  return L.join('\n') + '\n'
}

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
export function gerarLadoALado(comp, ref, folhas, nomeFolhas) {
  const porId = new Map(comp.falhas.map((f) => [f.id, f]))
  const linhas = (ref.itens || []).map((r) => {
    const f = porId.get(r.id), p = comp.pares.find((x) => x.ref === r.id), e = comp.excecoes.find((x) => x.id === r.id)
    const estado = f ? `<b class="ruim">falha: ${esc(f.linha)}</b><br>${esc(f.detalhe)}` : p ? `par: ${esc(p.estadoFixo ? 'estado final fixo' : p.nosso)}` : e ? esc(e.situacao) : 'fora do mapa'
    const img = folhas.has(r.id) ? `<img src="${esc(nomeFolhas)}/${esc(r.id)}.jpg" alt="${esc(r.id)}">` : '<i>sem folha</i>'
    return `<tr><td>${esc(r.id)}</td><td>${esc(r.resumo || r.tecnica)}</td><td>${estado}</td><td>${img}</td></tr>`
  }).join('\n')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Movimento lado a lado</title><style>
body{font:14px/1.4 sans-serif;margin:16px;background:#fafafa;color:#222}table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:6px;vertical-align:top}
img{max-width:720px;width:100%}.ruim{color:#b00}</style></head><body><h1>Movimento lado a lado${comp.celular ? ' (celular)' : ''}</h1>
<p>Em cada folha: referência em cima, nosso embaixo, quadros alinhados pelo progresso do movimento. Saída ${codigoDeSaida(comp)}.</p>
<table><tr><th>Item</th><th>O que a referência faz (dado do site)</th><th>Resultado</th><th>Folha</th></tr>
${linhas}</table></body></html>`
}

// ---------------------------------------------------------------------------------------------------------
// Folhas (montadas no Chrome, sem canvas novo) e às cegas
// ---------------------------------------------------------------------------------------------------------
function lerManifesto(pastaQuadros) {
  try { return JSON.parse(fs.readFileSync(path.join(pastaQuadros, 'manifesto.json'), 'utf8')).quadros || [] } catch { return [] }
}
const legenda = (q) => `${q.progresso != null ? r2(q.progresso) : '?'}${q.perdido ? ' perdido' : ''}`
// Quadros alinhados: até 6 da referência, espalhados pelo progresso; para cada um, o nosso de progresso mais perto.
export function alinharQuadros(qr, qn, maximo = 6) {
  const ord = (l) => [...l].sort((a, b) => (a.progresso ?? 0) - (b.progresso ?? 0))
  const R = ord(qr), N = ord(qn)
  if (!R.length || !N.length) return null
  const k = Math.min(maximo, R.length)
  const escolhidos = Array.from({ length: k }, (_, i) => R[Math.round((i * (R.length - 1)) / Math.max(1, k - 1))])
  const par = escolhidos.map((q) => N.reduce((m, x) => (Math.abs((x.progresso ?? 0) - (q.progresso ?? 0)) < Math.abs((m.progresso ?? 0) - (q.progresso ?? 0)) ? x : m), N[0]))
  return { ref: escolhidos, nosso: par }
}

// Uma linha da folha: legenda = progresso do quadro (e "perdido"), sem dizer de que site é.
const montarLinha = (nav, quadros, pasta) => montarFolha(nav, quadros, { pasta, colunas: quadros.length, legendas: quadros.map(legenda) })

function sorteador(semente) {
  let a = semente >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

// ---------------------------------------------------------------------------------------------------------
// Medição do nosso (URL): movimento.mjs num processo filho; estado parado dos marcados no celular
// ---------------------------------------------------------------------------------------------------------
function rodarMovimento(args, limiteMs) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [SCRIPT_MOVIMENTO, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    // no Windows o kill não derruba o Chrome neto: taskkill /t leva a árvore inteira
    const matar = () => { try { if (process.platform === 'win32') spawn('taskkill', ['/pid', String(filho.pid), '/t', '/f']); else filho.kill('SIGKILL') } catch {} }
    const t = setTimeout(() => { matar(); reject(new Error('medição do nosso passou do tempo')) }, limiteMs)
    filho.stderr.on('data', (d) => { err += d })
    filho.stdout.on('data', () => {})
    filho.on('error', (e) => { clearTimeout(t); reject(e) })
    filho.on('close', (code) => { clearTimeout(t); resolve({ code, err }) })
  })
}

const LER_ESTADOS = async (ids) => {
  const out = {}
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  for (const id of ids) {
    const el = [...document.querySelectorAll('[data-mov]')].find((e) => String(e.getAttribute('data-mov')).split(/\s+/).includes(id))
    if (!el) { out[id] = { existe: false }; continue }
    el.scrollIntoView({ block: 'center' })
    await espera(1500)
    const cs = getComputedStyle(el), r = el.getBoundingClientRect()
    const m = new DOMMatrixReadOnly(cs.transform && cs.transform !== 'none' ? cs.transform : undefined)
    const blur = /blur\(([\d.]+)px\)/.exec(cs.filter || ''), br = /brightness\(([\d.]+)\)/.exec(cs.filter || '')
    out[id] = { existe: true, visivel: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01,
      opacidade: Number(cs.opacity), escala: Math.hypot(m.a, m.b), rotacaoGraus: (Math.atan2(m.b, m.a) * 180) / Math.PI, xPx: m.e, yPx: m.f,
      desfoquePx: blur ? Number(blur[1]) : 0, brilho: br ? Number(br[1]) : 1, larguraPx: r.width, alturaPx: r.height, entreLetrasPx: parseFloat(cs.letterSpacing) || 0 }
  }
  return out
}

// Estado parado dos marcados, com a MESMA trava de pedidos do movimento.mjs (movimento-navegacao.mjs: escrita, outro
// site, rota proibida, robots e download barrados), ligada da abertura da página ao fim da leitura. Só a abertura
// passa, e só até o load. Endereço local de arquivo abre sem a trava (ela só confere http/https) e a liga logo depois.
// Devolve { estados, naoMedido (os barrados, como o movimento.mjs os anota), avisos }.
export async function medirEstadosFixos(url, ids, celular, { permitido = N.criarRobots(), tirarDoAr = N.tirarDoAr } = {}) {
  const exe = acharNavegador()
  if (!exe) throw new Error('sem Chrome/Edge para medir o estado parado (defina BROWSER_EXECUTABLE)')
  const espera = (ms) => new Promise((r) => setTimeout(r, ms))
  const nav = await abrirNavegador(exe)
  const avisos = []
  let T = null
  try {
    await nav.cmd('Page.enable')
    await nav.cmd('Emulation.setDeviceMetricsOverride', { width: celular ? 390 : 1440, height: celular ? 844 : 900, deviceScaleFactor: 1, mobile: !!celular })
    if (celular) await nav.cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    T = await N.travaDe(nav)
    const protocolo = new URL(url).protocol
    if (/^https?:$/.test(protocolo)) {
      await T.ligar({ origem: url, permitido, navegar: true })
      try { await nav.cmd('Page.navigate', { url }) } catch {}
      for (let i = 0; i < 120 && !T.carregou; i++) await espera(250)
      T.navegar = false // carregou: daqui em diante nada troca de página
    } else {
      avisos.push(`estado parado: endereço ${protocolo} aberto sem a trava de pedidos durante o carregar`)
      await nav.cmd('Page.navigate', { url })
      for (let i = 0; i < 60; i++) { if ((await nav.rodar(() => document.readyState).catch(() => '')) === 'complete') break; await espera(250) }
      await T.ligar({ origem: url, permitido, navegar: false })
    }
    await espera(1000)
    const estados = await nav.rodar(LER_ESTADOS, ids, 120_000)
    return { estados, naoMedido: N.barradosParaNaoMedido(T.barrados, { pagina: 'inicio', etapa: 'estado-fixo', onde: 'estado parado' }), avisos }
  } finally {
    // A página sai do ar com a trava ainda ligada e a trava só acaba junto com o navegador. Desligar antes de fechar
    // deixava o temporizador da página mandar pedido sem conferência no intervalo (vermelho intermitente do teste).
    if (!(await tirarDoAr(nav).catch(() => false))) {
      const m = 'estado parado: a página não saiu do ar (about:blank) antes de fechar o navegador; a trava de pedidos seguiu ligada até ele fechar'
      console.error('Aviso: ' + m)
      avisos.push(m) // o objeto devolvido no try aponta para esta mesma lista
    }
    await nav.fechar()
  }
}

// Linhas de naoMedido medidas aqui (barrados do estado parado) entram no inventário nosso com número próprio: a
// confiabilidade trata como as do movimento.mjs (grave bloqueia até a resolução manual; afetaMedida false é aviso).
export function anexarNaoMedido(inv, linhas) {
  const usados = new Set((inv.naoMedido || []).map((n) => n?.id))
  let k = 0
  const novas = (linhas || []).map((l) => { let id; do id = `N${String(++k).padStart(2, '0')}`; while (usados.has(id)); usados.add(id); return { id, ...l } })
  return novas.length ? { ...inv, naoMedido: [...(inv.naoMedido || []), ...novas] } : inv
}

// Canvas/vídeo nosso "se mexe": quadros do item diferentes entre si (manifesto da pasta de quadros).
function seMexePelosQuadros(n, pastaQuadros, manifesto, T) {
  if (n.evidencia?.mudou === true) return true
  const qs = manifesto.filter((q) => q.item === n.id).slice(0, 8)
  for (let i = 1; i < qs.length; i++) {
    try {
      const a = decodificarPng(fs.readFileSync(path.join(pastaQuadros, qs[i - 1].arquivo))), b = decodificarPng(fs.readFileSync(path.join(pastaQuadros, qs[i].arquivo)))
      if (diferencaQuadros(a, b).total > T.canvasMudou) return true
    } catch {}
  }
  return false
}

// ---------------------------------------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------------------------------------
export class ErroDeUso extends Error {}

export function lerArgs(argv) {
  const pos = [], op = { celular: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--celular') op.celular = true
    else if (['--mapa', '--cegas', '--semente', '--max-mouse', '--max-paginas', '--tempo-max', '--passos'].includes(a)) {
      const v = argv[++i]
      if (v == null || v.startsWith('--')) throw new ErroDeUso(`Falta o valor de ${a}`)
      const k = a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())
      if (['semente', 'maxMouse', 'maxPaginas', 'tempoMax', 'passos'].includes(k)) { op[k] = Number(v); if (!Number.isFinite(op[k])) throw new ErroDeUso(`Valor inválido para ${a}`) }
      else op[k] = v
    } else if (a.startsWith('--')) throw new ErroDeUso(`Opção desconhecida: ${a}`)
    else pos.push(a)
  }
  if (pos.length !== 3) throw new ErroDeUso('Uso: node comparar-movimento.mjs <inventário da referência> <url nossa | inventário nosso> <pasta-saida> --mapa <mapa-movimento.json> [--celular] [--cegas <pasta> [--semente N]]')
  if (!op.mapa) throw new ErroDeUso('Falta --mapa <mapa-movimento.json> (na pasta do cliente)')
  if (op.semente != null && !op.cegas) throw new ErroDeUso('--semente só vale com --cegas')
  return { ref: pos[0], nosso: pos[1], saida: pos[2], ...op }
}

const lerJson = (arq) => { try { return JSON.parse(fs.readFileSync(arq, 'utf8')) } catch { return null } }
function lerInventario(arq, celular, quem) {
  let a = path.resolve(arq)
  if (fs.existsSync(a) && fs.statSync(a).isDirectory()) a = path.join(a, celular ? 'movimento-celular.json' : 'movimento.json')
  const j = lerJson(a)
  if (!j || !Array.isArray(j.itens)) throw new ErroDeUso(`${quem}: ${a} não é um inventário de movimento (movimento${celular ? '-celular' : ''}.json)`)
  if (celular && j.tela && j.tela.celular === false) throw new ErroDeUso(`${quem}: --celular pede o movimento-celular.json; ${path.basename(a)} é de computador`)
  if (!celular && j.tela?.celular) throw new ErroDeUso(`${quem}: ${path.basename(a)} é de celular; use --celular`)
  return { j, arq: a, pasta: path.dirname(a) }
}
const existeEm = (pasta) => (rel) => { try { return !!rel && fs.existsSync(path.resolve(pasta, String(rel))) } catch { return false } }

export async function comparar(op, avisar = console.log) {
  const saida = path.resolve(op.saida), suf = op.celular ? '-celular' : ''
  protegerSaida(saida) // as folhas levam imagem da referência
  const ref = lerInventario(op.ref, op.celular, 'referência')
  const mapaArq = path.resolve(op.mapa)
  const mapa = lerJson(mapaArq)
  if (!mapa || typeof mapa !== 'object') throw new ErroDeUso(`Não li o mapa ${mapaArq}`)
  let nosso, urlNossa = null
  if (/^(https?|file):/i.test(op.nosso)) {
    urlNossa = op.nosso
    const pasta = path.join(saida, 'nosso')
    const args = [urlNossa, pasta, ...(op.celular ? ['--celular'] : [])]
    for (const [k, f] of [['maxMouse', '--max-mouse'], ['maxPaginas', '--max-paginas'], ['tempoMax', '--tempo-max'], ['passos', '--passos']]) if (op[k] != null) args.push(f, String(op[k]))
    // o movimento.json da medição anterior fica (o coletor reserva os números dele); o código 3 só vale com um novo
    const arqNosso = path.join(pasta, `movimento${suf}.json`), quando = () => { try { return fs.statSync(arqNosso).mtimeMs } catch { return 0 } }
    const antes = quando()
    const r = await rodarMovimento(args, ((op.tempoMax ?? 600) + 300) * 1000)
    // 3: página inicial bloqueada ou que não abriu; o movimento.mjs grava o inventário inválido (rodada.completa
    // false, com o motivo) e a conferência segue com ele, para o motivo sair no .md e no .json (saída 2)
    if (r.code === 3 && quando() > antes) avisar(`Aviso: a medição do nosso site não abriu a página inicial: ${r.err.trim().slice(0, 300)}`)
    else if (r.code !== 0) throw new Error(`a medição do nosso site falhou (saída ${r.code}): ${r.err.trim().slice(0, 300)}`)
    nosso = lerInventario(pasta, op.celular, 'nosso')
  } else nosso = lerInventario(op.nosso, op.celular, 'nosso')
  // estado parado dos elementos em estado-final-fixo (só celular)
  const fixos = op.celular ? Object.entries(mapa.itens || {}).filter(([, e]) => e?.celular?.gatilho === 'estado-final-fixo').map(([id]) => id) : []
  const arqFixos = path.join(nosso.pasta, `estados-fixos${suf}.json`)
  // os pedidos barrados na leitura do estado parado ficam ao lado (relidos também na conferência por inventário)
  const arqBarrados = path.join(nosso.pasta, `estados-fixos${suf}-nao-medido.json`)
  let estadosFixos = lerJson(arqFixos) || {}, barradosFixos = lerJson(arqBarrados) || [], avisosFixos = []
  if (urlNossa && fixos.length) {
    try {
      const m = await medirEstadosFixos(urlNossa, fixos, op.celular)
      estadosFixos = m.estados; barradosFixos = m.naoMedido; avisosFixos = m.avisos
      fs.writeFileSync(arqFixos, JSON.stringify(estadosFixos, null, 1)); fs.writeFileSync(arqBarrados, JSON.stringify(barradosFixos, null, 1))
    } catch (e) { avisar(`Aviso: estado parado não medido: ${e.message}`) }
  }
  if (Array.isArray(barradosFixos) && barradosFixos.length) nosso.j = anexarNaoMedido(nosso.j, barradosFixos)
  const pastaQuadrosRef = path.join(ref.pasta, 'quadros' + suf), pastaQuadrosNosso = path.join(nosso.pasta, 'quadros' + suf)
  const manifRef = lerManifesto(pastaQuadrosRef), manifNosso = lerManifesto(pastaQuadrosNosso)
  const comp = compararMovimento(ref.j, nosso.j, mapa, {
    celular: op.celular, existeMapa: existeEm(path.dirname(mapaArq)), existeRef: existeEm(ref.pasta), existeNosso: existeEm(nosso.pasta),
    manualRef: lerJson(path.join(ref.pasta, 'movimento-manual.json')), manualNosso: lerJson(path.join(nosso.pasta, 'movimento-manual.json')),
    estadosFixos, seMexe: (n) => seMexePelosQuadros(n, pastaQuadrosNosso, manifNosso, TOLERANCIAS_MOVIMENTO),
  })
  comp.avisos.push(...avisosFixos)
  // folhas: referência em cima, nosso embaixo
  const nomeFolhas = `folhas${suf}`, pastaFolhas = path.join(saida, nomeFolhas)
  const feitas = new Map()
  const casos = [...comp.pares.filter((p) => p.nosso).map((p) => [p.ref, p.nosso]), ...comp.falhas.filter((f) => f.candidato).map((f) => [f.id, f.candidato])]
  const exe = casos.length ? acharNavegador() : null
  if (casos.length && !exe) comp.avisos.push('sem Chrome/Edge: folhas não montadas (defina BROWSER_EXECUTABLE)')
  let nav = null
  try {
    if (exe) nav = await abrirNavegador(exe)
    for (const [idR, idN] of nav ? casos : []) {
      const al = alinharQuadros(manifRef.filter((q) => q.item === idR), manifNosso.filter((q) => q.item === idN))
      if (!al) { comp.avisos.push(`${idR}: sem quadros dos dois lados, folha não montada`); continue }
      try {
        const linhaR = await montarLinha(nav, al.ref, pastaQuadrosRef), linhaN = await montarLinha(nav, al.nosso, pastaQuadrosNosso)
        feitas.set(idR, { linhaR, linhaN })
        fs.mkdirSync(pastaFolhas, { recursive: true })
        fs.writeFileSync(path.join(pastaFolhas, `${idR}.jpg`), await montarFolha(nav, [linhaR, linhaN], { colunas: 1, legendas: [`referência ${idR}`, `nosso ${idN}`] }))
      } catch (e) { comp.avisos.push(`${idR}: folha não montada (${String(e.message || e).slice(0, 100)})`) }
    }
    if (op.cegas) {
      const destino = path.resolve(op.cegas), gab = path.join(saida, `gabarito-cegas-movimento${suf}.json`)
      if (!path.relative(destino, gab).startsWith('..')) throw new ErroDeUso('O gabarito não pode ficar dentro da pasta às cegas.')
      if (fs.existsSync(destino) && fs.readdirSync(destino).length) throw new ErroDeUso(`A pasta às cegas precisa ser nova ou vazia: ${op.cegas}`)
      protegerSaida(destino) // as folhas às cegas também levam imagem da referência: fora do git
      const semente = op.semente ?? Date.now(), rnd = sorteador(semente)
      const ordem = [...feitas.entries()].map((x) => ({ x, k: rnd() })).sort((a, b) => a.k - b.k).map((o) => o.x)
      const resposta = {}
      for (const [k, [idR, { linhaR, linhaN }]] of ordem.entries()) {
        const nome = `F${String(k + 1).padStart(2, '0')}`, refEmCima = rnd() < 0.5
        fs.writeFileSync(path.join(destino, `${nome}.jpg`), await montarFolha(nav, refEmCima ? [linhaR, linhaN] : [linhaN, linhaR], { colunas: 1, legendas: ['A', 'B'] }))
        resposta[nome] = { item: idR, A: refEmCima ? 'referencia' : 'nosso', B: refEmCima ? 'nosso' : 'referencia' }
      }
      fs.writeFileSync(path.join(destino, 'pergunta.md'), ['# Leitura às cegas do movimento', '',
        `Há ${ordem.length} folhas (F01…). Em cada uma, a linha A e a linha B mostram o mesmo trecho de um movimento, quadro a quadro.`,
        'Olhe só as imagens. Para cada folha: as duas linhas fazem o mesmo movimento (o que muda, para que lado, em que ritmo)? Qual parece mais acabada e por quê?', '',
        'Responda assim:', '```', 'F01: igual | diferente (o quê) — mais acabada: A | B (por quê)', '```', ''].join('\n'))
      fs.writeFileSync(gab, JSON.stringify({ semente, folhas: resposta }, null, 1))
      if (!nav) comp.avisos.push('às cegas sem folhas: não houve Chrome/Edge para montá-las')
    }
  } finally { if (nav) await nav.fechar().catch(() => {}) }
  fs.writeFileSync(path.join(saida, `movimento-comparacao${suf}.json`), JSON.stringify(comp, null, 1))
  fs.writeFileSync(path.join(saida, `movimento-comparacao${suf}.md`), gerarMarkdown(comp))
  fs.writeFileSync(path.join(saida, `movimento-lado-a-lado${suf}.html`), gerarLadoALado(comp, { itens: [...ref.j.itens] }, feitas, nomeFolhas))
  avisar(`Movimento${op.celular ? ' (celular)' : ''}: ${comp.contagem.pares} pares, ${comp.contagem.alta} falhas altas, ${comp.contagem.naoConfiavel} motivos de não confiável. Saída ${codigoDeSaida(comp)} em ${saida}`)
  return comp
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let op
  try { op = lerArgs(process.argv.slice(2)) } catch (e) { console.error(e.message); process.exit(2) }
  try { const comp = await comparar(op); process.exit(codigoDeSaida(comp)) } catch (e) { console.error(e.message); process.exit(2) }
}
