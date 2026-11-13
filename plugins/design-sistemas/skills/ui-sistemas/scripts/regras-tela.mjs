// Regras puras do conferidor de telas no navegador (conferir-tela.mjs): sem Chrome, sem arquivo, sem rede.
// Recebem as medidas que a página devolve e dizem o que reprova. Ids e níveis: ../referencias/regua-telas.md.

// Telas fixas do sistema. Computador sem toque, densidade 1, agente de Windows; celular com toque, densidade 2.
export const TELAS = {
  computador: { largura: 1440, altura: 900, dpr: 1, movel: false },
  celular: { largura: 390, altura: 844, dpr: 2, movel: true }
}
export const TOQUE_MINIMO = 44
export const CONTRASTE_MINIMO = { normal: 4.5, grande: 3, borda: 3 }

// Exatamente o que vai ao Chrome (Emulation.*): métricas, toque e agente.
export function parametrosDaTela (tipo, versao = '120.0.0.0') {
  const t = TELAS[tipo]
  if (!t) throw new Error(`tela desconhecida: ${tipo} (use computador ou celular)`)
  const sistema = t.movel ? 'Linux; Android 10; K' : 'Windows NT 10.0; Win64; x64'
  return {
    metricas: { width: t.largura, height: t.altura, deviceScaleFactor: t.dpr, mobile: t.movel },
    toque: t.movel ? { enabled: true, maxTouchPoints: 5 } : { enabled: false },
    agente: `Mozilla/5.0 (${sistema}) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/${versao} ${t.movel ? 'Mobile ' : ''}Safari/537.36`
  }
}

// ---------- cor ----------
// Cor [r, g, b, a] por cima de um fundo opaco: devolve a cor opaca que se vê.
export function compor (frente, fundo) {
  const a = frente[3] ?? 1
  return [0, 1, 2].map((i) => frente[i] * a + fundo[i] * (1 - a)).concat(1)
}

// Camadas de fundo do próprio elemento para fora (a mais de dentro primeiro). A tela do navegador é branca.
export function fundoComposto (camadas) {
  let fundo = [255, 255, 255, 1]
  for (let i = camadas.length - 1; i >= 0; i--) fundo = compor(camadas[i], fundo)
  return fundo
}

// Pilha do elemento até a raiz (o próprio primeiro): [{ fundo: [r,g,b,a], opacidade, imagem }]. Cada elemento é um
// grupo: o de dentro (e o "topo", tinta do texto ou da borda) vai sobre o fundo dele e o conjunto recebe a opacidade
// dele; no fim, sobre a tela branca. Conta em cor pré-multiplicada. Devolve null quando passa por imagem ou degradê
// sem estar coberto por inteiro (não dá para compor: "não medido", nunca aprovado).
export function corVista (pilha, topo = null) {
  let p = [0, 0, 0], a = 0
  if (topo) { a = topo[3] ?? 1; p = [0, 1, 2].map((i) => topo[i] * a) }
  for (const l of pilha) {
    if (l.imagem) { if (a < 0.999) return null } else if (l.fundo && l.fundo[3] > 0) {
      const fa = l.fundo[3]
      p = [0, 1, 2].map((i) => p[i] + l.fundo[i] * fa * (1 - a))
      a = a + fa * (1 - a)
    }
    const o = l.opacidade ?? 1
    if (o < 1) { p = p.map((v) => v * o); a *= o }
  }
  return [0, 1, 2].map((i) => p[i] + 255 * (1 - a)).concat(1)
}

export function textoGrande (px, peso) {
  return px >= 24 || (px >= 18.66 && peso >= 700)
}

// ---------- itens ----------
// Cada avaliador devolve { achados: [{ regra, seletor, texto }], naoMedido: [{ regra, seletor, motivo }] }.
const vazio = () => ({ achados: [], naoMedido: [] })
const arred = (n) => Math.round(n * 100) / 100

export function avaliarRolagem (m) {
  const r = vazio()
  const p = m.pagina
  if (p && p.larguraConteudo > p.larguraTela + 1) {
    const quem = (p.culpados || []).slice(0, 3).join(', ')
    r.achados.push({ regra: 'rolagem-lateral', seletor: (p.culpados || [])[0] || 'html', texto: `a página rola de lado: ${p.larguraConteudo} px de conteúdo em ${p.larguraTela} px${quem ? ` (passa da borda: ${quem})` : ''}` })
  }
  return r
}

export function avaliarCortados (m) {
  const r = vazio()
  // deliberado: reticências (text-overflow: ellipsis) ou line-clamp em quem corta. Passa só com o texto inteiro
  // acessível (title, aria-label ou aria-describedby); sem isso reprova como o corte acidental.
  for (const c of m.cortados || []) {
    if (c.deliberado && c.acessivel) continue
    const texto = c.deliberado
      ? `"${c.texto}" truncado em ${c.por} sem o texto inteiro acessível (title, aria-label ou aria-describedby)`
      : `"${c.texto}" cortado pela borda de ${c.por}`
    r.achados.push({ regra: 'elemento-cortado', seletor: c.seletor, texto })
  }
  return r
}

export function avaliarLetra (m, tipo, letra) {
  const r = vazio()
  const vistos = new Set()
  const achar = (seletor, texto) => { if (!vistos.has(seletor)) { vistos.add(seletor); r.achados.push({ regra: 'letra-minima', seletor, texto }) } }
  // minimoPx vale nos dois aparelhos; no celular o campo em que se DIGITA ainda pede minimoCampoCelularPx (abaixo
  // disso o foco dá zoom). Campo que não digita (digita: false, ex.: botão com role=combobox) segue o mínimo geral.
  for (const t of m.textos || []) if (t.px < letra.minimoPx - 0.01) achar(t.seletor, `"${t.texto}" com letra de ${arred(t.px)} px (mínimo ${letra.minimoPx} px)`)
  if (TELAS[tipo].movel) {
    for (const c of m.campos || []) if (c.digita !== false && c.px < letra.minimoCampoCelularPx - 0.01) achar(c.seletor, `campo com letra de ${arred(c.px)} px no celular (mínimo ${letra.minimoCampoCelularPx} px; abaixo disso o celular dá zoom)`)
    for (const c of m.campos || []) if (c.digita === false && c.px < letra.minimoPx - 0.01) achar(c.seletor, `campo com letra de ${arred(c.px)} px (mínimo ${letra.minimoPx} px)`)
  } else {
    for (const c of m.campos || []) if (c.px < letra.minimoPx - 0.01) achar(c.seletor, `campo com letra de ${arred(c.px)} px (mínimo ${letra.minimoPx} px)`)
  }
  return r
}

export function avaliarToque (m, tipo) {
  const r = vazio()
  if (!TELAS[tipo].movel) return r
  for (const a of m.alvos || []) {
    if (a.emLinha) continue
    if (Math.min(a.w, a.h) < TOQUE_MINIMO - 0.5) r.achados.push({ regra: 'toque-minimo', seletor: a.seletor, texto: `alvo de toque de ${Math.round(a.w)}x${Math.round(a.h)} px (mínimo ${TOQUE_MINIMO} px)` })
  }
  return r
}

// contraste(a, b, exato) vem do raio-x.mjs (landing-pages); quem chama passa a função.
export function avaliarContraste (m, contraste) {
  const r = vazio()
  for (const t of m.textos || []) {
    if (t.desabilitado) continue // WCAG: controle desabilitado fica fora do contraste
    // pilha (vinda do Chrome): compõe fundos e opacidade do texto e dos ancestrais; camadas: só fundos (sem opacidade)
    const frente = t.pilha ? corVista(t.pilha, t.cor) : null
    const fundo = t.pilha ? corVista(t.pilha) : (t.imagem ? null : fundoComposto(t.camadas || []))
    if ((t.pilha && !frente) || !fundo) { r.naoMedido.push({ regra: 'contraste', seletor: t.seletor, motivo: `"${t.texto}" sobre imagem ou degradê: contraste não medido` }); continue }
    const razao = contraste(t.pilha ? frente : compor(t.cor, fundo), fundo, true)
    const minimo = textoGrande(t.px, t.peso) ? CONTRASTE_MINIMO.grande : CONTRASTE_MINIMO.normal
    if (razao < minimo) r.achados.push({ regra: 'contraste', seletor: t.seletor, texto: `"${t.texto}" com contraste ${arred(razao)}:1 (mínimo ${minimo}:1)` })
  }
  for (const c of m.campos || []) {
    if (c.desabilitado) continue
    // pilha: o próprio campo primeiro (fundo dele) e os ancestrais; fora do campo é a pilha sem o primeiro
    const semMedida = () => r.naoMedido.push({ regra: 'contraste', seletor: c.seletor, motivo: 'campo sobre imagem ou degradê: contorno não medido' })
    if (!c.pilha && c.imagem) { semMedida(); continue }
    const fora = c.pilha ? corVista(c.pilha.slice(1)) : fundoComposto(c.camadas || [])
    const dentro = c.pilha ? corVista(c.pilha) : compor(c.fundo || [0, 0, 0, 0], fora)
    const borda = c.borda && c.pilha ? corVista(c.pilha, c.borda) : null
    if (!fora || !dentro || (c.borda && c.pilha && !borda)) { semMedida(); continue }
    const daBorda = c.borda ? contraste(c.pilha ? borda : compor(c.borda, dentro), fora, true) : 1
    const doFundo = contraste(dentro, fora, true)
    const razao = Math.max(daBorda, doFundo)
    if (razao < CONTRASTE_MINIMO.borda) r.achados.push({ regra: 'contraste', seletor: c.seletor, texto: `contorno do campo com contraste ${arred(razao)}:1 com o fundo (mínimo ${CONTRASTE_MINIMO.borda}:1)` })
  }
  return r
}

// nome: lido do Chrome (Accessibility.getPartialAXTree); ignorado: o Chrome deixa o nó fora da árvore de acessibilidade.
export function avaliarNomes (m) {
  const r = vazio()
  for (const c of m.controles || []) {
    if (c.ignorado) continue
    if (c.nome === undefined) { r.naoMedido.push({ regra: 'nome-acessivel', seletor: c.seletor, motivo: 'nome acessível não lido do Chrome' }); continue }
    if (!String(c.nome).trim()) r.achados.push({ regra: 'nome-acessivel', seletor: c.seletor, texto: `${c.tipo} sem nome acessível` })
  }
  return r
}

export function avaliarTabelas (m) {
  const r = vazio()
  for (const t of m.tabelas || []) {
    if (t.temCabecalho) continue
    r.achados.push({ regra: 'tabela-sem-cabecalho', seletor: t.seletor, texto: t.tipo === 'table' ? '<table> sem <th>' : `role="${t.tipo}" sem columnheader` })
  }
  return r
}

export function avaliarListaVirtual (m) {
  const r = vazio()
  for (const v of m.virtuais || []) r.achados.push({ regra: 'lista-virtual', seletor: v.seletor, texto: 'lista virtual: só as linhas na tela foram conferidas' })
  return r
}

export function avaliarBranco (m) {
  const r = vazio()
  if (!(m.textos || []).length) r.achados.push({ regra: 'tela-em-branco', seletor: 'body', texto: 'nenhum texto visível na tela' })
  return r
}

export function avaliarTela (m, tipo, { letra, contraste }) {
  const partes = [avaliarRolagem(m), avaliarCortados(m), avaliarLetra(m, tipo, letra), avaliarToque(m, tipo),
    avaliarContraste(m, contraste), avaliarNomes(m), avaliarTabelas(m), avaliarListaVirtual(m), avaliarBranco(m)]
  return { achados: partes.flatMap((p) => p.achados), naoMedido: partes.flatMap((p) => p.naoMedido) }
}

// ---------- contrato de estados ----------
// Padrão: pede com ?estado=<nome>, confirma com [data-estado="<nome>"] na raiz da tela e acha o "Tentar de novo"
// por [data-acao="tentar-de-novo"]. A tela pode trocar cada um em estados.porTela.<id>.
export const ESTADOS_PADRAO = { pedir: '?estado={estado}', confirmar: '[data-estado="{estado}"]', tentarDeNovo: '[data-acao="tentar-de-novo"]' }
// carregar: quanto esperar a página terminar de carregar (estourou: não conferido, nunca segue medindo).
export const ESPERA_ESTADO = { quieto: 1000, limite: 10_000, carregar: 12_000 }

// Devolve null quando a tela não tem lista de estados (abre uma vez, sem pedir estado).
export function contratoDaTela (estados = {}, id) {
  const daTela = estados.porTela?.[id]
  if (!daTela?.lista?.length) return null
  const pega = (k) => daTela[k] || estados[k] || ESTADOS_PADRAO[k]
  return { lista: [...daTela.lista], pedir: pega('pedir'), confirmar: pega('confirmar'), tentarDeNovo: pega('tentarDeNovo') }
}

const trocar = (modelo, estado) => modelo.replaceAll('{estado}', estado)

// "?a=b" soma parâmetros ao endereço da tela; "#x" troca o fragmento; o resto é endereço relativo à tela (ou completo).
export function enderecoDoEstado (url, pedir, estado) {
  const p = trocar(pedir, estado)
  const u = new URL(url)
  if (p.startsWith('?') || p.startsWith('&')) {
    for (const [k, v] of new URLSearchParams(p.slice(1))) u.searchParams.set(k, v)
    return u.href
  }
  if (p.startsWith('#')) { u.hash = p; return u.href }
  return new URL(p, u).href
}

export function seletorDoEstado (confirmar, estado) {
  return trocar(confirmar, estado)
}

// <computador|celular>-<tela>-<estado>.png, que o listarPrints do juiz.mjs lê como aparelho + seção.
export function nomeDoPrint (aparelho, tela, estado) {
  return `${aparelho}-${tela}${estado ? `-${estado}` : ''}.png`
}

// Como tela e estado também podem ter hífen, nomes diferentes podem dar o mesmo arquivo (tela "pedidos-erro" no
// estado "normal" e tela "pedidos" no estado "erro-normal"). pares: [{ tela, estado }] -> { nome: [pares] } só dos
// nomes repetidos; quem colide fica sem print (não conferido) em vez de sobrescrever a evidência de outro.
export function colisoesDePrint (pares) {
  const por = {}
  for (const p of pares) (por[nomeDoPrint('x', p.tela, p.estado)] ||= []).push(p)
  return Object.fromEntries(Object.entries(por).filter(([, l]) => l.length > 1).map(([n, l]) => [n.slice(2), l]))
}

// Estado "vazio" precisa explicar o vazio: dentro da raiz do estado, algum texto visível fora de título (h1..h6 ou
// role=heading). Só o título ("Pedidos") não diz ao usuário o que fazer. textosFora: textos visíveis fora de título.
export function avaliarVazio (estado, seletor, textosFora) {
  const r = vazio()
  if (estado === 'vazio' && !(textosFora || []).length) r.achados.push({ regra: 'tela-em-branco', seletor, texto: 'estado "vazio" sem explicação: só título, nenhum texto visível que diga por que está vazio ou o que fazer' })
  return r
}

// Leituras [{ t (ms desde o pedido), presente, assinatura }] -> { confirmado, estavel, quando }.
// Estável: o estado pedido presente (raiz do marcador visível) e a mesma assinatura (texto, quantidade, geometria e
// aparência dos elementos) por "quieto" ms seguidos, dentro do limite.
export function estabilidade (leituras, { quieto = ESPERA_ESTADO.quieto, limite = ESPERA_ESTADO.limite } = {}) {
  let desde = null, ultima = null, viu = false
  for (const l of leituras) {
    if (l.t > limite) break
    if (!l.presente) { desde = null; ultima = null; continue }
    viu = true
    if (desde === null || l.assinatura !== ultima) { desde = l.t; ultima = l.assinatura; continue }
    if (l.t - desde >= quieto) return { confirmado: true, estavel: true, quando: l.t }
  }
  return { confirmado: viu, estavel: false, quando: null }
}

// Achado do estado que não deu para conferir: não apareceu (a tela ignora o pedido) ou não parou de mudar.
export function avaliarEstado (estado, seletor, est, limite = ESPERA_ESTADO.limite) {
  if (est.estavel) return null
  if (!est.confirmado) return { regra: 'estado-confirmado', seletor, texto: `pedi o estado "${estado}" e a tela não mostrou ${seletor} em ${limite / 1000} s` }
  return { regra: 'estado-estavel', seletor, texto: `o estado "${estado}" não parou de mudar em ${limite / 1000} s` }
}

// ---------- exceções e saída ----------
// No navegador a exceção usa arquivo = id da tela e local = seletor do achado; estado e aparelho (computador ou
// celular) são opcionais e, sem eles, a exceção vale para todos. Seletor só de tags e posição (sem #id, .classe ou
// [atributo], como "main > p") pega qualquer conteúdo que caia ali: a exceção vale, mas sai em "avisos".
export const seletorGenerico = (s) => !/[#.[]/.test(String(s))
export function aplicarExcecoes (achados, excecoes = [], niveis = {}) {
  const ignoradas = []
  for (const e of excecoes) if (niveis[e.regra] === 'nunca passa') ignoradas.push({ ...e, porque: 'regra "nunca passa" não aceita exceção' })
  const igual = (e, a) => e.regra === a.regra && e.arquivo === a.tela && String(e.local) === a.seletor &&
    (e.estado === undefined || e.estado === a.estado) && (e.aparelho === undefined || e.aparelho === a.tamanho)
  const usadas = new Set()
  const restantes = achados.filter((a) => {
    if (a.nivel === 'nunca passa') return true
    const e = excecoes.find((x) => igual(x, a))
    if (e) usadas.add(e)
    return !e
  })
  const avisos = [...usadas].filter((e) => seletorGenerico(e.local))
    .map((e) => ({ ...e, porque: `seletor "${e.local}" só de tags e posição: vale para qualquer conteúdo nesse lugar; dê um id ao elemento e use "#id"` }))
  return { restantes, ignoradas, avisos }
}

// 0 tudo conferido e passou · 1 algum achado que reprova · 2 algo não deu para conferir.
export function saidaDe (achados, naoConferido) {
  if (achados.some((a) => a.nivel !== 'aviso')) return 1
  return naoConferido.length ? 2 : 0
}
