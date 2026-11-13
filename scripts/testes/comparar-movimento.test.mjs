// Testa a conferência item por item do movimento (lp-revisao/scripts/comparar-movimento.mjs): pares certos, falsos
// pares que têm de reprovar (1), inventário ou exceção não confiável (2), a resolução manual que libera a lacuna,
// estado-final-fixo no celular, computador e celular na mesma pasta, às cegas e as folhas fora do git.
// Roda com: node --test scripts/testes/comparar-movimento.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-revisao', 'scripts', 'comparar-movimento.mjs')
const C = await import(pathToFileURL(script).href)
const { acharNavegador } = await import(pathToFileURL(path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts', 'raio-x.mjs')).href)

const clone = (x) => JSON.parse(JSON.stringify(x))
const TELA = { largura: 1440, altura: 900, celular: false }, TELA_CEL = { largura: 390, altura: 844, celular: true }
const base = (mais) => ({ pagina: 'inicio', secao: 1, ordem: 1, quemMuda: ['proprio'], atrasoMs: 0, escadaMs: 0, duracaoMs: null, curva: null, rolagem: null, confianca: 'alta', tecnica: '', quadros: null, ...mais })
const ITENS_REF = [
  base({ id: 'M02', gatilho: 'rolagem', alvo: { desc: 'h1.titulo', quantos: 1, dataMov: null }, muda: ['opacidade', 'desfoque'], de: { opacidade: 1, desfoquePx: 0 }, para: { opacidade: 0.2, desfoquePx: 12 },
    rolagem: { inicioTelas: 0, fimTelas: 0.99, inicioNaSecao: 0, fimNaSecao: 0.55, presa: true, presaTelas: 0.99, acompanha: true }, fontes: ['amostra', 'codigo-gsap'], resumo: 'título escurece e desfoca preso' }),
  base({ id: 'M03', gatilho: 'rolagem', alvo: { desc: 'div.cartao', quantos: 3, dataMov: null }, muda: ['posicao-y', 'opacidade'], de: { yPx: 200, opacidade: 0 }, para: { yPx: 0, opacidade: 1 },
    rolagem: { inicioTelas: 0.4, fimTelas: 1.6, inicioNaSecao: 0.6, fimNaSecao: 0.9, presa: false, presaTelas: 0, acompanha: true, escadaTelas: 0.2,
      participantes: [{ ordem: 1, elemento: 3, inicioTelas: 0.4 }, { ordem: 2, elemento: 4, inicioTelas: 0.6 }, { ordem: 3, elemento: 5, inicioTelas: 0.8 }] }, fontes: ['amostra'], resumo: 'três cartões sobem em escada' }),
  base({ id: 'M04', gatilho: 'carregar', secao: 0, alvo: { desc: 'h1', quantos: 1, dataMov: null }, muda: ['opacidade', 'posicao-y'], de: { opacidade: 0, yPx: 40 }, para: { opacidade: 1, yPx: 0 },
    duracaoMs: 900, curva: 'ease-out', fontes: ['quadros', 'css'], resumo: 'título entra subindo' }),
  base({ id: 'M05', gatilho: 'mouse', secao: 3, alvo: { desc: 'div.cartao', quantos: 1, dataMov: null }, muda: ['largura'], de: { larguraPx: 300 }, para: { larguraPx: 600 },
    duracaoMs: 300, curva: 'ease', saida: { duracaoMs: 300, curva: 'ease', voltou: true }, fontes: ['css'], resumo: 'cartão alarga no mouse' }),
  base({ id: 'M06', gatilho: 'parado', alvo: { desc: 'canvas', quantos: 1, dataMov: null }, muda: ['canvas'], fontes: ['quadros'], resumo: 'fundo vivo em WebGL' }),
]
const inv = (itens, mais = {}) => ({ versao: 1, valido: true, url: 'http://ref.exemplo/', tela: TELA, paginas: [{ id: 'inicio', url: 'http://ref.exemplo/', tipo: 'inicial' }], itens,
  cobertura: ['carregar', 'parado', 'rolagem', 'codigo', mais.tela?.celular ? 'toque' : 'mouse', 'cabecalho', 'clique'].map((etapa) => ({ pagina: 'inicio', etapa, estado: 'completa', itens: 1, limites: null, motivo: null })),
  naoMedido: [], idsAposentados: [], avisos: [], ...mais })
// o nosso: mesmos movimentos, números próprios, marcados com data-mov
const nossosDe = (itens) => itens.map((it, k) => ({ ...clone(it), id: `M${String(k + 20)}`, alvo: { ...it.alvo, dataMov: it.id }, evidencia: it.muda.includes('canvas') ? { mudou: true } : undefined }))
const MAPA = () => ({ base: { url: 'http://ref.exemplo/', escolhidaPeloDono: '2026-11-10', palavras: 'gostei dessa' }, itens: Object.fromEntries(ITENS_REF.map((i) => [i.id, { situacao: 'implementado', arquivo: `src/${i.id}.tsx` }])) })
const ctx0 = { existeMapa: (r) => r === 'evid.json', existeRef: (r) => r === 'video.mp4', existeNosso: () => false }
const rodarPuro = (ref, nossos, mapa = MAPA(), ctx = {}) => C.compararMovimento(inv(ref), inv(nossos, { url: 'http://localhost/' }), mapa, { ...ctx0, ...ctx })

test('tudo pareado: saída 0; o nosso a mais vira aviso', () => {
  const nossos = nossosDe(ITENS_REF)
  nossos.push({ ...clone(ITENS_REF[0]), id: 'M40', alvo: { desc: 'p.extra', quantos: 1, dataMov: null } })
  const c = rodarPuro(ITENS_REF, nossos)
  assert.deepEqual([c.naoConfiavel, c.falhas], [[], []], JSON.stringify(c.falhas))
  assert.equal(C.codigoDeSaida(c), 0)
  assert.equal(c.pares.length, 5)
  assert.ok(c.avisos.some((a) => /M40/.test(a)), 'movimento nosso que a referência não tem é aviso')
  // data-mov com dois números no mesmo elemento
  const dois = nossosDe(ITENS_REF); dois[1].alvo.dataMov = 'M03 M99'
  assert.equal(C.codigoDeSaida(rodarPuro(ITENS_REF, dois)), 0)
})

test('falsos pares reprovam (saída 1), dizendo a linha que falhou', () => {
  const casos = [
    ['filho só com opacidade contra opacidade + desfoque', 'M02', (n) => { n.quemMuda = ['filhos']; n.muda = ['opacidade']; delete n.de.desfoquePx; delete n.para.desfoquePx }, 'propriedades'],
    ['direção invertida', 'M02', (n) => { [n.de, n.para] = [n.para, n.de] }, 'direção'],
    ['duração 3×', 'M04', (n) => { n.duracaoMs = 2700 }, 'duração'],
    ['curva de outra família', 'M04', (n) => { n.curva = 'ease-in' }, 'curva'],
    ['sem a seção presa', 'M02', (n) => { n.rolagem.presa = false; n.rolagem.presaTelas = 0 }, 'presa'],
    ['todos juntos em vez de escada', 'M03', (n) => { delete n.rolagem.escadaTelas; delete n.rolagem.participantes }, 'escada'],
    ['gatilho errado no elemento certo', 'M05', (n) => { n.gatilho = 'clique' }, 'página e gatilho'],
    ['dispara em vez de acompanhar', 'M02', (n) => { n.rolagem.acompanha = false; n.duracaoMs = 600 }, 'acompanha a rolagem'],
    ['trecho da rolagem longe', 'M02', (n) => { n.rolagem.inicioNaSecao = 0.6; n.rolagem.fimNaSecao = 1 }, 'trecho da rolagem'],
    ['canvas parado', 'M06', (n) => { n.evidencia = { mudou: false } }, 'canvas e vídeo'],
    ['sem volta do mouse', 'M05', (n) => { delete n.saida }, 'sequência'],
  ]
  for (const [nome, id, mexer, linha] of casos) {
    const nossos = nossosDe(ITENS_REF)
    mexer(nossos.find((n) => n.alvo.dataMov === id))
    const c = rodarPuro(ITENS_REF, nossos)
    assert.equal(C.codigoDeSaida(c), 1, nome)
    const f = c.falhas.find((x) => x.id === id)
    assert.ok(f && f.nivel === 'alta' && f.detalhe.includes(linha), `${nome}: ${JSON.stringify(c.falhas)}`)
    assert.equal(f.arquivo, `src/${id}.tsx`)
  }
  // sem candidato com o data-mov
  const sem = nossosDe(ITENS_REF); sem[0].alvo.dataMov = null
  assert.equal(rodarPuro(ITENS_REF, sem).falhas[0].linha, 'sem candidato')
})

test('achado 8: medida que a referência tem e o nosso não tem é falha alta (ausente não é false)', () => {
  // [nome, id, mexe no nosso, linha esperada, mexe na referência e no nosso antes (opcional)]
  const casos = [
    ['escada: quantidade', 'M03', (n) => { delete n.alvo.quantos }, 'escada'],
    ['escada: intervalo em telas', 'M03', (n) => { delete n.rolagem.escadaTelas }, 'escada'],
    ['escada: ordem de entrada', 'M03', (n) => { delete n.rolagem.participantes }, 'escada'],
    ['saída: duração da volta', 'M05', (n) => { delete n.saida.duracaoMs }, 'sequência'],
    ['saída: voltou', 'M05', (n) => { delete n.saida.voltou }, 'sequência'],
    ['presa (referência false)', 'M03', (n) => { delete n.rolagem.presa }, 'presa'],
    ['presa: tempo presa', 'M02', (n) => { delete n.rolagem.presaTelas }, 'presa'],
    ['acompanha', 'M02', (n) => { delete n.rolagem.acompanha }, 'acompanha a rolagem'],
    ['trecho: fimNaSecao', 'M02', (n) => { delete n.rolagem.fimNaSecao }, 'trecho da rolagem'],
    ['trecho: referência em seção, nosso só em telas', 'M02', (n) => { delete n.rolagem.inicioNaSecao; delete n.rolagem.fimNaSecao }, 'trecho da rolagem'],
    ['trecho: fimTelas (os dois em telas)', 'M02', (n) => { delete n.rolagem.fimTelas }, 'trecho da rolagem',
      (it) => { delete it.rolagem.inicioNaSecao; delete it.rolagem.fimNaSecao }],
    ['duração', 'M04', (n) => { delete n.duracaoMs }, 'duração'],
  ]
  for (const [nome, id, mexer, linha, antes] of casos) {
    const ref = clone(ITENS_REF)
    if (antes) antes(ref.find((r) => r.id === id))
    const nossos = nossosDe(ref)
    assert.equal(C.codigoDeSaida(rodarPuro(ref, nossos)), 0, `${nome}: sem mexer, pareia`)
    mexer(nossos.find((n) => n.alvo.dataMov === id))
    const c = rodarPuro(ref, nossos)
    assert.equal(C.codigoDeSaida(c), 1, nome)
    const f = c.falhas.find((x) => x.id === id)
    assert.ok(f && f.nivel === 'alta' && f.detalhe.includes(linha) && /não medido no nosso/.test(f.detalhe), `${nome}: ${JSON.stringify(c.falhas)}`)
  }
  // curva fica como está: só compara quando as duas são conhecidas
  const semCurva = nossosDe(ITENS_REF); delete semCurva.find((n) => n.alvo.dataMov === 'M04').curva
  assert.equal(C.codigoDeSaida(rodarPuro(ITENS_REF, semCurva)), 0, 'curva desconhecida no nosso não reprova')
})

test('não confiável (saída 2): vazio, inválido, etapa falhou, não medido, mapa e exceções sem prova', () => {
  const nossos = nossosDe(ITENS_REF)
  const dois = (c, re, nome) => { assert.equal(C.codigoDeSaida(c), 2, nome); assert.ok(c.naoConfiavel.some((x) => re.test(x)), `${nome}: ${c.naoConfiavel}`) }
  dois(C.compararMovimento(inv([]), inv(nossos), MAPA(), ctx0), /vazio/, 'referência vazia')
  dois(C.compararMovimento(inv(ITENS_REF), inv([]), MAPA(), ctx0), /nosso: inventário vazio/, 'nosso vazio')
  dois(C.compararMovimento(inv(ITENS_REF, { valido: false }), inv(nossos), MAPA(), ctx0), /inválido/, 'valido false')
  const falhou = inv(ITENS_REF); falhou.cobertura[4] = { pagina: 'inicio', etapa: 'mouse', estado: 'falhou', itens: 0, limites: null, motivo: 'erro' }
  dois(C.compararMovimento(falhou, inv(nossos), MAPA(), ctx0), /etapa mouse/, 'etapa falhou')
  const parcial = inv(ITENS_REF); parcial.cobertura[2].estado = 'parcial'
  dois(C.compararMovimento(parcial, inv(nossos), MAPA(), ctx0), /etapa rolagem/, 'etapa parcial')
  const nm = inv(ITENS_REF, { naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'parado', o: 'canvas do rodapé', motivo: 'não parou' }] })
  dois(C.compararMovimento(nm, inv(nossos), MAPA(), ctx0), /N01/, 'não medido')
  // resolvido à mão (pela página e etapa, não pelo número) → aceito
  const olhado = 'olhei o vídeo inteiro do rodapé e o canvas fica com a mesma imagem parada'
  const resolvido = { resolvidos: { x: { 'o-que': { pagina: 'inicio', etapa: 'parado' }, como: 'conferido-a-mao', evidencia: 'video.mp4', semMovimento: olhado } } }
  assert.equal(C.codigoDeSaida(C.compararMovimento(nm, inv(nossos), MAPA(), { ...ctx0, manualRef: resolvido })), 0)
  const largo = { resolvidos: { x: { 'o-que': { pagina: 'inicio' }, como: 'conferido-a-mao', evidencia: 'video.mp4', semMovimento: olhado } } }
  assert.equal(C.codigoDeSaida(C.compararMovimento(falhou, inv(nossos), MAPA(), { ...ctx0, manualRef: largo })), 2, 'só a página não libera a etapa de uma página válida')
  // linha que o inventário diz não pesar (afetaMedida: false) é aviso
  const leve = inv(ITENS_REF, { naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'clique', o: 'link de fora', motivo: 'barrado', barrado: 'outro-site', afetaMedida: false }] })
  assert.equal(C.codigoDeSaida(C.compararMovimento(leve, inv(nossos), MAPA(), ctx0)), 0)
  // mapa
  const semDono = MAPA(); delete semDono.base.escolhidaPeloDono
  dois(rodarPuro(ITENS_REF, nossos, semDono), /escolhidaPeloDono/, 'mapa sem a escolha do dono')
  const fora = MAPA(); delete fora.itens.M04
  dois(rodarPuro(ITENS_REF, nossos, fora), /M04: item da referência fora do mapa/, 'item fora do mapa')
  // exceções
  const trocado = (mais) => { const m = MAPA(); m.itens.M02 = { situacao: 'trocado', motivo: 'o desfoque de 12 px derruba o LCP no celular para 4,1 s na medição de laboratório', evidencia: 'evid.json', medida: 'LCP 4,1 s → 2,2 s', equivalente: 'M29', ...mais }; return m }
  const semM02 = nossos.map((n) => (n.alvo.dataMov === 'M02' ? { ...n, id: 'M29', alvo: { ...n.alvo, dataMov: null }, muda: ['opacidade'] } : n))
  { const c = rodarPuro(ITENS_REF, semM02, trocado({})); assert.equal(C.codigoDeSaida(c), 0, 'trocado com prova: ' + JSON.stringify([c.naoConfiavel, c.falhas])) }
  dois(rodarPuro(ITENS_REF, semM02, trocado({ motivo: '' })), /menos de 30 letras/, 'motivo vazio')
  dois(rodarPuro(ITENS_REF, semM02, trocado({ motivo: 'muito pesado e complexo, custo alto demais para fazer isso aqui' })), /genérico/, 'motivo genérico')
  dois(rodarPuro(ITENS_REF, semM02, trocado({ equivalente: undefined })), /sem equivalente/, 'sem equivalente')
  dois(rodarPuro(ITENS_REF, semM02, trocado({ evidencia: undefined })), /sem evidência/, 'sem evidência')
  dois(rodarPuro(ITENS_REF, semM02, trocado({ evidencia: 'nao-existe.json' })), /não existe/, 'evidência que não existe')
  const parado = semM02.map((n) => (n.id === 'M29' ? { ...n, muda: ['visibilidade'] } : n))
  dois(rodarPuro(ITENS_REF, parado, trocado({})), /aprovadoPor/, 'trocado por algo que não se mexe, sem aprovação')
  const aprov = { quem: 'dono', quando: '2026-11-11', palavras: 'pode tirar' }
  assert.equal(C.codigoDeSaida(rodarPuro(ITENS_REF, parado, trocado({ aprovadoPor: aprov }))), 0)
  const disp = (mais) => { const m = MAPA(); m.itens.M06 = { situacao: 'dispensado', motivo: 'cliente-nao-tem', evidencia: 'evid.json', ...mais }; return m }
  dois(rodarPuro(ITENS_REF, nossos, disp({})), /aprovadoPor/, 'dispensado sem aprovação')
  dois(rodarPuro(ITENS_REF, nossos, disp({ motivo: 'pesado', aprovadoPor: aprov })), /dispensado só por/, 'dispensado por motivo fora da lista')
  assert.equal(C.codigoDeSaida(rodarPuro(ITENS_REF, nossos, disp({ aprovadoPor: aprov }))), 0)
})

test('percurso da resolução: etapa falhou → 2; resolução com evidência e item manual → 0; sem evidência → 2', () => {
  const ref = inv(ITENS_REF); ref.cobertura[4] = { pagina: 'inicio', etapa: 'mouse', estado: 'falhou', itens: 0, limites: null, motivo: 'erro' }
  const nossos = nossosDe(ITENS_REF)
  nossos.push(base({ id: 'M30', gatilho: 'mouse', alvo: { desc: 'a.menu', quantos: 1, dataMov: 'H01' }, muda: ['cor'], fontes: ['css'] }))
  const mapa = MAPA(); mapa.itens.H01 = { situacao: 'implementado', arquivo: 'src/Menu.tsx' }
  assert.equal(C.codigoDeSaida(C.compararMovimento(ref, inv(nossos), mapa, ctx0)), 2)
  const manual = { itens: [base({ id: 'H01', gatilho: 'mouse', alvo: { desc: 'a.menu', quantos: 1 }, muda: ['cor'], fontes: ['olho'] })],
    resolvidos: { mouse: { 'o-que': { pagina: 'inicio', etapa: 'mouse' }, como: 'video-do-dono', evidencia: 'video.mp4', itensConferidos: ['H01'] } } }
  const ok = C.compararMovimento(ref, inv(nossos), mapa, { ...ctx0, manualRef: manual })
  assert.equal(C.codigoDeSaida(ok), 0, JSON.stringify([ok.naoConfiavel, ok.falhas]))
  assert.ok(ok.pares.some((p) => p.ref === 'H01'))
  assert.ok(ok.avisos.some((a) => /resolvida à mão/.test(a)), 'a cobertura continua dizendo que a medição automática falhou')
  const semEv = clone(manual); delete semEv.resolvidos.mouse.evidencia
  assert.equal(C.codigoDeSaida(C.compararMovimento(ref, inv(nossos), mapa, { ...ctx0, manualRef: semEv })), 2)
  const evFalsa = clone(manual); evFalsa.resolvidos.mouse.evidencia = 'sumiu.mp4'
  assert.equal(C.codigoDeSaida(C.compararMovimento(ref, inv(nossos), mapa, { ...ctx0, manualRef: evFalsa })), 2)
})

test('celular: mouse ↔ toque pareado; estado-final-fixo certo, igual ao começo e sem aprovação', () => {
  const refCel = [base({ id: 'M05', gatilho: 'mouse', alvo: { desc: 'div.cartao', quantos: 1 }, muda: ['opacidade'], de: { opacidade: 0 }, para: { opacidade: 1 }, duracaoMs: 300, curva: 'ease', fontes: ['css'] }),
    base({ id: 'C01', gatilho: 'toque', alvo: { desc: 'a.botao', quantos: 1 }, muda: ['escala'], de: { escala: 1 }, para: { escala: 0.95 }, duracaoMs: 150, fontes: ['css'] })]
  const invCel = (itens) => inv(itens, { tela: TELA_CEL })
  const nossos = refCel.map((it, k) => ({ ...clone(it), id: `M${50 + k}`, gatilho: 'toque', alvo: { ...it.alvo, dataMov: it.id } }))
  const mapa = { base: MAPA().base, itens: { M05: { situacao: 'implementado', celular: { gatilho: 'toque' } }, C01: { situacao: 'implementado' } } }
  assert.equal(C.codigoDeSaida(C.compararMovimento(invCel(refCel), invCel(nossos), mapa, { ...ctx0, celular: true })), 0)
  // desvio 7: sem a equivalência escrita no mapa, o mouse NÃO vira toque sozinho: mapa incompleto (saída 2)
  const soMouse = clone(mapa); delete soMouse.itens.M05.celular
  const inc = C.compararMovimento(invCel(refCel), invCel(nossos), soMouse, { ...ctx0, celular: true })
  assert.equal(C.codigoDeSaida(inc), 2, 'mouse sem celular.gatilho no mapa')
  assert.ok(inc.naoConfiavel.some((x) => /M05: .*itens\.M05\.celular\.gatilho/.test(x)), inc.naoConfiavel.join(' | '))
  assert.ok(!inc.naoConfiavel.some((x) => /C01/.test(x)), 'toque da referência não precisa de equivalência')
  // estado-final-fixo
  const fixo = (aprovadoPor) => ({ base: MAPA().base, itens: { M05: { situacao: 'implementado', celular: { gatilho: 'estado-final-fixo', ...(aprovadoPor ? { aprovadoPor } : {}) } }, C01: { situacao: 'implementado' } } })
  const aprov = { quem: 'dono', quando: '2026-11-11', palavras: 'no celular pode ficar parado' }
  const semM05 = nossos.filter((n) => n.alvo.dataMov !== 'M05')
  const rodar = (mapaX, est) => C.compararMovimento(invCel(refCel), invCel(semM05), mapaX, { ...ctx0, celular: true, estadosFixos: { M05: est } })
  assert.equal(C.codigoDeSaida(rodar(fixo(aprov), { existe: true, visivel: true, opacidade: 1 })), 0, 'estado fixo no fim e aprovado')
  const comeco = rodar(fixo(aprov), { existe: true, visivel: true, opacidade: 0 })
  assert.equal(C.codigoDeSaida(comeco), 1, 'parado no começo do movimento')
  assert.equal(comeco.falhas[0].linha, 'estado-final-fixo')
  assert.equal(C.codigoDeSaida(rodar(fixo(null), { existe: true, visivel: true, opacidade: 1 })), 2, 'sem aprovadoPor')
  assert.equal(C.codigoDeSaida(rodar(fixo(aprov), undefined)), 1, 'estado não medido é falha')
})

// Achados da revisão do lote 5 (2 a 6): o comparador saía 0 quando não devia.
test('achado 2: falha ou lacuna do nosso que pesa na medida bloqueia (saída 2); afetaMedida false é aviso', () => {
  const nossoMouseFalhou = inv(nossosDe(ITENS_REF), { url: 'http://localhost/' })
  nossoMouseFalhou.cobertura[4] = { pagina: 'inicio', etapa: 'mouse', estado: 'falhou', itens: 1, limites: null, motivo: 'erro no meio' }
  const c = C.compararMovimento(inv(ITENS_REF), nossoMouseFalhou, MAPA(), ctx0)
  assert.equal(C.codigoDeSaida(c), 2, 'mouse: falhou no nosso, com o candidato medido antes da falha')
  assert.ok(c.naoConfiavel.some((x) => /nosso: etapa mouse/.test(x)), c.naoConfiavel.join(' | '))
  // resolvida à mão no nosso (mesma regra da referência) → libera
  // (recomendação a: o item conferido tem de estar escrito em itens do manual; antes apontava o M23 do inventário)
  const manualNosso = { itens: [base({ id: 'H20', gatilho: 'mouse', secao: 3, alvo: { desc: 'div.cartao', quantos: 1 }, muda: ['largura'], fontes: ['olho'] })],
    resolvidos: { m: { 'o-que': { pagina: 'inicio', etapa: 'mouse' }, como: 'conferido-a-mao', evidencia: 'video.mp4', itensConferidos: ['H20'] } } }
  const ok = C.compararMovimento(inv(ITENS_REF), nossoMouseFalhou, MAPA(), { ...ctx0, existeNosso: (r) => r === 'video.mp4', manualNosso })
  assert.equal(C.codigoDeSaida(ok), 0, JSON.stringify(ok.naoConfiavel))
  const leve = inv(nossosDe(ITENS_REF), { naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'clique', o: 'link de fora', motivo: 'barrado', afetaMedida: false }] })
  assert.equal(C.codigoDeSaida(C.compararMovimento(inv(ITENS_REF), leve, MAPA(), ctx0)), 0)
})

test('achado 3: resolução só libera a lacuna do mesmo escopo e com conclusão escrita', () => {
  const nm = inv(ITENS_REF, { naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'parado', o: 'canvas do rodapé', motivo: 'não parou' }] })
  const nossos = inv(nossosDe(ITENS_REF))
  const rodar = (r) => C.compararMovimento(nm, nossos, MAPA(), { ...ctx0, manualRef: { resolvidos: { N01: r } } })
  const certo = { 'o-que': { pagina: 'inicio', etapa: 'parado' }, como: 'conferido-a-mao', evidencia: 'video.mp4', semMovimento: 'olhei o vídeo inteiro do rodapé e o canvas fica com a mesma imagem parada' }
  assert.equal(C.codigoDeSaida(rodar({ ...certo, 'o-que': { pagina: 'outra', etapa: 'parado' } })), 2, 'N01 da inicial liberado por resolução de outra página')
  assert.equal(C.codigoDeSaida(rodar({ ...certo, semMovimento: undefined })), 2, 'só apontar um arquivo que existe não basta')
  assert.equal(C.codigoDeSaida(rodar({ ...certo, semMovimento: 'nada' })), 2, 'declaração curta demais')
  assert.equal(C.codigoDeSaida(rodar({ ...certo, semMovimento: undefined, itensConferidos: ['H99'] })), 2, 'item manual que não existe')
  assert.equal(C.codigoDeSaida(rodar(certo)), 0)
})

test('recomendação a: itensConferidos só aceita item escrito em itens do manual', () => {
  const nm = inv(ITENS_REF, { naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'parado', o: 'canvas do rodapé', motivo: 'não parou' }] })
  const r = { 'o-que': { pagina: 'inicio', etapa: 'parado' }, como: 'conferido-a-mao', evidencia: 'video.mp4', itensConferidos: ['M06'] }
  const c = C.compararMovimento(nm, inv(nossosDe(ITENS_REF)), MAPA(), { ...ctx0, manualRef: { resolvidos: { N01: r } } })
  assert.equal(C.codigoDeSaida(c), 2, 'M06 está no inventário automático, não no manual')
  assert.ok(c.naoConfiavel.some((x) => /itensConferidos.*M06/.test(x)), c.naoConfiavel.join(' | '))
  const manual = { itens: [base({ id: 'H06', gatilho: 'parado', alvo: { desc: 'canvas', quantos: 1 }, muda: ['canvas'], fontes: ['olho'] })], resolvidos: { N01: { ...r, itensConferidos: ['H06'] } } }
  const mapa = MAPA(); mapa.itens.H06 = { situacao: 'dispensado', motivo: 'cliente-nao-tem', evidencia: 'evid.json', aprovadoPor: { quem: 'dono', quando: '2026-11-11', palavras: 'pode tirar' } }
  const ok = C.compararMovimento(nm, inv(nossosDe(ITENS_REF)), mapa, { ...ctx0, manualRef: manual })
  assert.equal(C.codigoDeSaida(ok), 0, JSON.stringify([ok.naoConfiavel, ok.falhas]))
})

test('recomendação b: o equivalente de um trocado não serve de par para outro item', () => {
  const m = MAPA(); m.itens.M02 = { situacao: 'trocado', motivo: 'o desfoque de 12 px derruba o LCP no celular para 4,1 s na medição de laboratório', evidencia: 'evid.json', medida: 'LCP 4,1 s → 2,2 s', equivalente: 'M29' }
  // M29: o par certo do M04 (mesmas medidas, data-mov="M04"), usado também como equivalente do M02; não há outro M04
  const nossos = nossosDe(ITENS_REF).filter((n) => !['M02', 'M04'].includes(n.alvo.dataMov))
  nossos.push({ ...clone(ITENS_REF[2]), id: 'M29', alvo: { ...ITENS_REF[2].alvo, dataMov: 'M04' } })
  const c = C.compararMovimento(inv(ITENS_REF), inv(nossos), m, ctx0)
  assert.equal(C.codigoDeSaida(c), 1, 'uma medida serviu de equivalente e de par: ' + JSON.stringify(c.pares))
  const f = c.falhas.find((x) => x.id === 'M04')
  assert.ok(f && /M29 é o equivalente de M02/.test(f.detalhe), JSON.stringify(c.falhas))
})

test('achado 4: um item nosso pareia com no máximo um item da referência', () => {
  const card = (id, secao) => base({ id, secao, gatilho: 'carregar', alvo: { desc: 'div.cartao', quantos: 1, dataMov: null }, muda: ['opacidade'], de: { opacidade: 0 }, para: { opacidade: 1 }, duracaoMs: 600, curva: 'ease-out', fontes: ['css'] })
  const refs = [card('M01', 2), card('M02', 5)]
  const mapa = { base: MAPA().base, itens: { M01: { situacao: 'implementado' }, M02: { situacao: 'implementado' } } }
  const um = [{ ...card('M20', 2), alvo: { desc: 'div.cartao', quantos: 1, dataMov: 'M01 M02' } }]
  const c = C.compararMovimento(inv(refs), inv(um), mapa, ctx0)
  assert.equal(C.codigoDeSaida(c), 1, 'uma medida só aprovou dois cartões: ' + JSON.stringify(c.pares))
  assert.equal(c.pares.length, 1)
  // dois movimentos medidos distintos no mesmo elemento: cada número com o seu (casamento, não ordem de chegada)
  const dois = [{ ...card('M20', 2), alvo: { desc: 'div.cartao', quantos: 1, dataMov: 'M01 M02' } }, { ...card('M21', 2), alvo: { desc: 'div.cartao', quantos: 1, dataMov: 'M01' } }]
  const d = C.compararMovimento(inv(refs), inv(dois), mapa, ctx0)
  assert.equal(C.codigoDeSaida(d), 0, JSON.stringify([d.falhas, d.pares]))
  assert.deepEqual(d.pares.map((p) => p.ref + '-' + p.nosso), ['M01-M21', 'M02-M20'])
})

test('achado 5: trocado por equivalente parado (canvas mudou: false) pede a aprovação do dono', () => {
  const trocado = (mais) => { const m = MAPA(); m.itens.M02 = { situacao: 'trocado', motivo: 'o desfoque de 12 px derruba o LCP no celular para 4,1 s na medição de laboratório', evidencia: 'evid.json', medida: 'LCP 4,1 s → 2,2 s', equivalente: 'M29', ...mais }; return m }
  const comCanvas = (mudou) => nossosDe(ITENS_REF).map((n) => (n.alvo.dataMov === 'M02' ? { ...n, id: 'M29', gatilho: 'parado', alvo: { desc: 'canvas', quantos: 1, dataMov: null }, muda: ['canvas'], de: undefined, para: undefined, rolagem: null, evidencia: { mudou } } : n))
  const sem = rodarPuro(ITENS_REF, comCanvas(false), trocado({}))
  assert.equal(C.codigoDeSaida(sem), 2, 'canvas parado sem aprovação')
  assert.ok(sem.naoConfiavel.some((x) => /aprovadoPor/.test(x)), sem.naoConfiavel.join(' | '))
  assert.equal(C.codigoDeSaida(rodarPuro(ITENS_REF, comCanvas(false), trocado({ aprovadoPor: { quem: 'dono', quando: '2026-11-11', palavras: 'pode tirar' } }))), 0)
  assert.equal(C.codigoDeSaida(rodarPuro(ITENS_REF, comCanvas(true), trocado({}))), 0, 'canvas que se mexe não tira movimento')
  // de e para iguais: declarado em "muda", mas não se mexe
  const igual = nossosDe(ITENS_REF).map((n) => (n.alvo.dataMov === 'M02' ? { ...n, id: 'M29', alvo: { ...n.alvo, dataMov: null }, muda: ['opacidade'], de: { opacidade: 1 }, para: { opacidade: 1 } } : n))
  assert.equal(C.codigoDeSaida(rodarPuro(ITENS_REF, igual, trocado({}))), 2, 'de = para sem aprovação')
})

test('achado 6: inventário fora do contrato não compara (saída 2 com o que falta)', () => {
  const mapa = { base: MAPA().base, itens: { M01: { situacao: 'implementado' } } }
  const c = C.compararMovimento({ itens: [{ id: 'M01' }] }, { itens: [{ id: 'M20', alvo: { dataMov: 'M01' } }] }, mapa, ctx0)
  assert.equal(C.codigoDeSaida(c), 2)
  for (const re of [/referência: .*paginas/, /referência: .*cobertura/, /referência: M01: .*gatilho/, /nosso: M20: .*muda/]) assert.ok(c.naoConfiavel.some((x) => re.test(x)), `${re}: ${c.naoConfiavel.join(' | ')}`)
  const dup = inv([ITENS_REF[0], ITENS_REF[0]])
  const d = C.compararMovimento(dup, inv(nossosDe(ITENS_REF)), MAPA(), ctx0)
  assert.equal(C.codigoDeSaida(d), 2)
  assert.ok(d.naoConfiavel.some((x) => /M02.*repetido/.test(x)), d.naoConfiavel.join(' | '))
  assert.deepEqual(C.validarInventario(inv(ITENS_REF), 'referência'), [])
})

test('motivoValido e lerArgs', () => {
  assert.match(C.motivoValido('custo'), /30 letras/)
  assert.match(C.motivoValido('muito pesado e complexo, custo alto demais para fazer isso aqui'), /genérico/)
  assert.equal(C.motivoValido('o desfoque de 12 px derruba o LCP no celular para 4,1 s na medição de laboratório'), null)
  assert.throws(() => C.lerArgs(['a', 'b', 'c']), /--mapa/)
  assert.throws(() => C.lerArgs(['a', 'b', 'c', '--mapa', 'm.json', '--xyz']), /desconhecida/)
  assert.deepEqual(C.lerArgs(['a', 'b', 'c', '--mapa', 'm.json', '--celular', '--cegas', 'x', '--semente', '3']).semente, 3)
})

// Achado 1 (lado do comparador): o estado parado do nosso é lido com a trava de pedidos do movimento.mjs.
test('achado 1: escrita e pedido a outro site durante o estado parado ficam barrados e registrados', { timeout: 120_000 }, async (t) => {
  if (!acharNavegador()) { t.diagnostic('sem Chrome/Edge: trava do estado parado não conferida'); return }
  const recebidos = { post: 0, fora: 0 }
  const pagina = `<!doctype html><html><body style="height:3000px"><div data-mov="M05" style="margin-top:1600px;width:200px;height:80px;background:#c00">x</div>
<script>
const disparar = () => { fetch('/grava', { method: 'POST', body: 'x' }).catch(() => {}); fetch('http://localhost:' + location.port + '/fora').catch(() => {}) }
addEventListener('scroll', disparar); setInterval(disparar, 4)
</script></body></html>`
  const servidor = http.createServer((req, res) => {
    if (req.method === 'POST') recebidos.post++
    if (req.url.startsWith('/fora')) recebidos.fora++
    // o robots.txt proíbe /fora: leitura por código a outro site (aqui localhost:porta) só passa com o robots dele
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(pagina) } else if (req.url === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('User-agent: *\nDisallow: /fora\n') } else { res.writeHead(404); res.end() }
  })
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
  t.after(() => servidor.close())
  const url = `http://127.0.0.1:${servidor.address().port}/`
  const m = await C.medirEstadosFixos(url, ['M05'], false)
  // A página dispara a cada 4 ms e o servidor ainda espera um pouco: pedido que escapa no fim (trava desligada com a
  // página viva, antes de o navegador morrer) chega aqui. Era a causa do vermelho intermitente deste teste.
  await new Promise((r) => setTimeout(r, 400))
  assert.equal(m.estados.M05.existe, true)
  assert.equal(recebidos.post, 0, 'POST chegou ao servidor: a leitura do estado parado rodou sem a trava')
  assert.equal(recebidos.fora, 0, 'pedido a outro site chegou: a leitura do estado parado rodou sem a trava')
  assert.ok(m.naoMedido.some((n) => n.etapa === 'estado-fixo' && n.barrado === 'escrita'), JSON.stringify(m.naoMedido))
  assert.ok(m.naoMedido.some((n) => n.barrado === 'robots' && n.afetaMedida === false), JSON.stringify(m.naoMedido))
  // o registro entra no inventário nosso e segue a regra das lacunas (grave bloqueia; afetaMedida false é aviso)
  const grave = [{ pagina: 'inicio', etapa: 'estado-fixo', o: 'estado parado: pedido GET /pagina', motivo: 'barrado', barrado: 'quadro', afetaMedida: true }]
  const nossoInv = C.anexarNaoMedido(inv(nossosDe(ITENS_REF)), grave)
  assert.equal(nossoInv.naoMedido[0].id, 'N01')
  assert.equal(C.codigoDeSaida(C.compararMovimento(inv(ITENS_REF), nossoInv, MAPA(), ctx0)), 2)
  const leve = C.anexarNaoMedido(inv(nossosDe(ITENS_REF)), m.naoMedido.filter((n) => n.afetaMedida === false))
  assert.equal(C.codigoDeSaida(C.compararMovimento(inv(ITENS_REF), leve, MAPA(), ctx0)), 0)
})

// ---------------------------------------------------------------------------------------------------------
// Pela linha de comando, com arquivos numa pasta dentro do repositório (o git check-ignore vale ali)
// ---------------------------------------------------------------------------------------------------------
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const bloco = (tipo, dados) => { const t = Buffer.from(tipo), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(dados.length); c.writeUInt32BE(crc32(Buffer.concat([t, dados]))); return Buffer.concat([l, t, dados, c]) }
function png(w, h, cor) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  const linhas = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) linhas.set(cor(x, y), y * (w * 3 + 1) + 1 + x * 3)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(linhas)), bloco('IEND', Buffer.alloc(0))])
}
function gravarInventario(pasta, j, nome, ids, tom) {
  fs.mkdirSync(path.join(pasta, 'quadros', 'brutos'), { recursive: true })
  fs.writeFileSync(path.join(pasta, nome), JSON.stringify(j))
  const quadros = []
  ids.forEach((id, k) => [0, 0.5, 1].forEach((p, i) => {
    const arquivo = `brutos/${id}-${i}.png`
    fs.writeFileSync(path.join(pasta, 'quadros', arquivo), png(48, 30, (x) => [tom, Math.round(255 * p), (x * 5 + k * 40) % 255]))
    quadros.push({ arquivo, item: id, pagina: 'inicio', gatilho: 'rolagem', tMs: i * 100, rolagemPx: i * 90, progresso: p, escala: 0.25, perdido: i === 1, fonte: 'gravacao' })
  }))
  fs.writeFileSync(path.join(pasta, 'quadros', 'manifesto.json'), JSON.stringify({ versao: 1, larguraQuadro: 48, quadros }))
}
const rodarCli = (args) => new Promise((resolve) => {
  const p = spawn(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
  let out = '', err = ''
  p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { err += d })
  p.on('close', (code) => resolve({ code, out, err }))
})

test('achado 11: a pasta às cegas fora da saída fica fora do git (com ou sem Chrome)', { timeout: 300_000 }, async (t) => {
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'comparar-cegas-'))
  const noRepo = fs.mkdtempSync(path.join(raiz, 'scripts', 'testes', '.tmp-cegas-movimento-'))
  t.after(() => { for (const p of [fora, noRepo]) fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) })
  const pRef = path.join(fora, 'ref'), pNosso = path.join(fora, 'nosso'), saida = path.join(fora, 'saida'), cegas = path.join(noRepo, 'cegas')
  fs.mkdirSync(pRef); fs.mkdirSync(pNosso)
  fs.writeFileSync(path.join(pRef, 'movimento.json'), JSON.stringify(inv(ITENS_REF)))
  fs.writeFileSync(path.join(pNosso, 'movimento.json'), JSON.stringify(inv(nossosDe(ITENS_REF), { url: 'http://localhost/' })))
  const mapaArq = path.join(fora, 'mapa-movimento.json'); fs.writeFileSync(mapaArq, JSON.stringify(MAPA()))
  assert.notEqual(spawnSync('git', ['check-ignore', '-q', path.join(cegas, 'pergunta.md')], { cwd: raiz }).status, 0, 'a pasta de teste não pode já estar ignorada')
  const r = await rodarCli([pRef, pNosso, saida, '--mapa', mapaArq, '--cegas', cegas, '--semente', '3'])
  assert.equal(r.code, 0, r.err + r.out)
  assert.ok(fs.existsSync(path.join(cegas, 'pergunta.md')), fs.readdirSync(cegas).join())
  assert.equal(spawnSync('git', ['check-ignore', '-q', path.join(cegas, 'pergunta.md')], { cwd: raiz }).status, 0, 'a pasta às cegas tem de ficar fora do git')
  assert.equal(spawnSync('git', ['check-ignore', '-q', path.join(cegas, 'F01.jpg')], { cwd: raiz }).status, 0, 'as folhas às cegas também')
})

test('linha de comando: computador e celular na mesma pasta, folhas fora do git, às cegas sem nomes', { timeout: 300_000 }, async (t) => {
  const tmp = fs.mkdtempSync(path.join(raiz, 'scripts', 'testes', '.tmp-comparar-movimento-'))
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
  const pRef = path.join(tmp, 'ref'), pNosso = path.join(tmp, 'nosso'), saida = path.join(tmp, 'saida'), cliente = path.join(tmp, 'cliente')
  const nossos = nossosDe(ITENS_REF)
  gravarInventario(pRef, inv(ITENS_REF), 'movimento.json', ['M02', 'M03'], 30)
  delete nossos[4].evidencia // canvas sem evidência: o "se mexe" sai dos quadros (PNG diferentes entre si)
  gravarInventario(pNosso, inv(nossos, { url: 'http://localhost/' }), 'movimento.json', [...nossos.slice(0, 2).map((n) => n.id), 'M24'], 200)
  const refCel = [base({ id: 'M05', gatilho: 'mouse', alvo: { desc: 'div.cartao', quantos: 1 }, muda: ['opacidade'], de: { opacidade: 0 }, para: { opacidade: 1 }, duracaoMs: 300, fontes: ['css'] })]
  fs.writeFileSync(path.join(pRef, 'movimento-celular.json'), JSON.stringify(inv(refCel, { tela: TELA_CEL })))
  fs.writeFileSync(path.join(pNosso, 'movimento-celular.json'), JSON.stringify(inv([{ ...clone(refCel[0]), id: 'M70', gatilho: 'toque', alvo: { desc: 'div.cartao', quantos: 1, dataMov: 'M05' } }], { tela: TELA_CEL })))
  fs.mkdirSync(cliente)
  const mapa = MAPA(); mapa.itens.M05.celular = { gatilho: 'toque' }
  fs.writeFileSync(path.join(cliente, 'mapa-movimento.json'), JSON.stringify(mapa))
  const mapaArq = path.join(cliente, 'mapa-movimento.json')

  const r1 = await rodarCli([path.join(pRef, 'movimento.json'), pNosso, saida, '--mapa', mapaArq])
  assert.equal(r1.code, 0, r1.err + r1.out)
  for (const a of ['movimento-comparacao.json', 'movimento-comparacao.md', 'movimento-lado-a-lado.html', '.gitignore']) assert.ok(fs.existsSync(path.join(saida, a)), 'faltou ' + a)
  const antes = fs.readFileSync(path.join(saida, 'movimento-comparacao.json'), 'utf8')
  const r2 = await rodarCli([pRef, pNosso, saida, '--mapa', mapaArq, '--celular'])
  assert.equal(r2.code, 0, r2.err + r2.out)
  assert.ok(fs.existsSync(path.join(saida, 'movimento-comparacao-celular.json')))
  assert.equal(fs.readFileSync(path.join(saida, 'movimento-comparacao.json'), 'utf8'), antes, 'o celular não sobrescreve o computador')
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(saida, 'movimento-comparacao-celular.json'), 'utf8')).pares, [{ ref: 'M05', nosso: 'M70' }])
  // falha alta e não confiável pela linha de comando
  const ruim = clone(mapa); delete ruim.base.escolhidaPeloDono
  fs.writeFileSync(path.join(cliente, 'ruim.json'), JSON.stringify(ruim))
  assert.equal((await rodarCli([pRef, pNosso, path.join(tmp, 's2'), '--mapa', path.join(cliente, 'ruim.json')])).code, 2)
  assert.equal((await rodarCli([pRef, pNosso, path.join(tmp, 's3')])).code, 2, 'sem --mapa é erro de uso')
  // folhas (precisam do Chrome) e às cegas
  if (!acharNavegador()) { t.diagnostic('sem Chrome/Edge: folhas e às cegas não conferidas'); return }
  const folha = path.join(saida, 'folhas', 'M02.jpg')
  assert.ok(fs.existsSync(folha), 'folha M02 não montada: ' + r1.out)
  assert.equal(spawnSync('git', ['check-ignore', '-q', folha], { cwd: raiz }).status, 0, 'a folha tem de ficar fora do git')
  const cegas = path.join(tmp, 'cegas'), saida4 = path.join(tmp, 's4')
  const r4 = await rodarCli([pRef, pNosso, saida4, '--mapa', mapaArq, '--cegas', cegas, '--semente', '7'])
  assert.equal(r4.code, 0, r4.err + r4.out)
  const nomes = fs.readdirSync(cegas)
  assert.ok(nomes.includes('F01.jpg') && nomes.includes('pergunta.md'), nomes.join())
  assert.ok(nomes.every((n) => !/nosso|refer/i.test(n)), nomes.join())
  assert.ok(!/nosso|refer[eê]ncia/i.test(fs.readFileSync(path.join(cegas, 'pergunta.md'), 'utf8')))
  const gab = JSON.parse(fs.readFileSync(path.join(saida4, 'gabarito-cegas-movimento.json'), 'utf8'))
  assert.equal(Object.keys(gab.folhas).length, 2)
})

// Segunda passada do Codex no lote 5 (achados 2 a 4): o comparador ainda saía 0 quando não devia.
const TROCA = { situacao: 'trocado', motivo: 'o desfoque de 12 px derruba o LCP no celular para 4,1 s na medição de laboratório', evidencia: 'evid.json', medida: 'LCP 4,1 s → 2,2 s', equivalente: 'M29' }

test('2ª passada, achado 4: dois trocado não dividem o mesmo equivalente', () => {
  // M29 se mexe de verdade (opacidade 1 → 0,2); M02 e M03 trocados pelo mesmo M29, cada um com prova completa
  const nossos = nossosDe(ITENS_REF).filter((n) => !['M02', 'M03'].includes(n.alvo.dataMov))
  nossos.push({ ...clone(ITENS_REF[0]), id: 'M29', alvo: { desc: 'h1.titulo', quantos: 1, dataMov: null }, muda: ['opacidade'], de: { opacidade: 1 }, para: { opacidade: 0.2 } })
  const so = MAPA(); so.itens.M02 = { ...TROCA }; so.itens.M03 = { ...TROCA, equivalente: 'M30' }
  const n30 = [...nossos, { ...clone(nossos.at(-1)), id: 'M30' }]
  assert.equal(C.codigoDeSaida(C.compararMovimento(inv(ITENS_REF), inv(n30), so, ctx0)), 0, 'cada trocado com o seu equivalente')
  const m = MAPA(); m.itens.M02 = { ...TROCA }; m.itens.M03 = { ...TROCA }
  const c = C.compararMovimento(inv(ITENS_REF), inv(nossos), m, ctx0)
  assert.equal(C.codigoDeSaida(c), 2, JSON.stringify([c.naoConfiavel, c.falhas]))
  assert.ok(c.naoConfiavel.some((x) => /M03 \(trocado\): equivalente M29 já é o equivalente de M02/.test(x)), c.naoConfiavel.join(' | '))
  assert.equal(c.excecoes.find((e) => e.id === 'M03').valida, false)
})

test('2ª passada, achado 3: registro manual vazio ou com número automático não resolve a lacuna', () => {
  const nm = inv(ITENS_REF, { naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'parado', o: 'canvas do rodapé', motivo: 'não parou' }] })
  const r = { 'o-que': { pagina: 'inicio', etapa: 'parado' }, como: 'conferido-a-mao', evidencia: 'video.mp4', itensConferidos: ['M06'] }
  const rodar = (itens, conferidos) => C.compararMovimento(nm, inv(nossosDe(ITENS_REF)), MAPA(), { ...ctx0, manualRef: { itens, resolvidos: { N01: { ...r, itensConferidos: conferidos } } } })
  // contraprova do Codex: { id: "M06" } sem medida, mesmo número do item automático
  const c = rodar([{ id: 'M06' }], ['M06'])
  assert.equal(C.codigoDeSaida(c), 2, JSON.stringify(c.naoConfiavel))
  assert.ok(c.naoConfiavel.some((x) => /referência \(manual\): M06 tem o mesmo número de um item automático/.test(x)), c.naoConfiavel.join(' | '))
  // número próprio, mas sem página escrita: a página não é presumida
  const h = base({ id: 'H06', gatilho: 'parado', alvo: { desc: 'canvas', quantos: 1 }, muda: ['canvas'], fontes: ['olho'] }); delete h.pagina
  const s = rodar([h], ['H06'])
  assert.equal(C.codigoDeSaida(s), 2)
  assert.ok(s.naoConfiavel.some((x) => /\(manual\): H06: falta pagina/.test(x)), s.naoConfiavel.join(' | '))
  // número próprio, só com id: falta o contrato do item
  assert.ok(rodar([{ id: 'H07' }], ['H07']).naoConfiavel.some((x) => /\(manual\): H07: falta .*gatilho/.test(x)))
})

test('2ª passada, achado 2: cobertura tem de ter cada etapa real de cada página válida', () => {
  const nossos = inv(nossosDe(ITENS_REF))
  // contraprova do Codex: só uma linha inventada
  const inventada = inv(ITENS_REF, { cobertura: [{ pagina: 'inexistente', etapa: 'inventada', estado: 'completa' }] })
  const c = C.compararMovimento(inventada, nossos, MAPA(), ctx0)
  assert.equal(C.codigoDeSaida(c), 2)
  for (const re of [/cobertura da página "inexistente"/, /falta cobertura da página inicio: carregar, parado, rolagem, codigo, mouse, cabecalho, clique/]) assert.ok(c.naoConfiavel.some((x) => re.test(x)), `${re}: ${c.naoConfiavel.join(' | ')}`)
  const semMouse = inv(ITENS_REF); semMouse.cobertura.splice(4, 1)
  assert.ok(C.compararMovimento(semMouse, nossos, MAPA(), ctx0).naoConfiavel.some((x) => /cobertura da página inicio: mouse/.test(x)))
  const foraDaLista = inv(ITENS_REF); foraDaLista.cobertura.push({ pagina: 'inicio', etapa: 'toque', estado: 'completa' })
  assert.ok(C.compararMovimento(foraDaLista, nossos, MAPA(), ctx0).naoConfiavel.some((x) => /etapa "toque" fora da lista/.test(x)), 'toque no inventário do computador')
  // página inválida não pede linha (o movimento.mjs não grava cobertura dela)
  const invalida = inv(ITENS_REF, { paginas: [{ id: 'inicio', tipo: 'inicial' }, { id: 'p2', tipo: 'interna', valido: false, motivo: 'desafio' }] })
  assert.ok(!C.validarInventario(invalida, 'referência').some((x) => /p2/.test(x)))
})

test('2ª passada, achado 2 (extremos): referência sem de/para bloqueia até os extremos escritos à mão', () => {
  const item = (id, mais) => base({ id, gatilho: 'carregar', alvo: { desc: 'h1', quantos: 1, dataMov: null }, muda: ['opacidade'], de: null, para: null, duracaoMs: 600, curva: 'ease-out', fontes: ['css'], ...mais })
  const nosso = (r, mais) => ({ ...clone(r), id: 'M20', alvo: { ...r.alvo, dataMov: r.id }, ...mais })
  const mapa = (id = 'M01', mais = {}) => ({ base: MAPA().base, itens: { [id]: { situacao: 'implementado', ...mais } } })
  const rodar = (r, n, ctx = {}, m = mapa(r.id), tela = {}) => C.compararMovimento(inv([r], tela), inv([n], { url: 'http://localhost/', ...tela }), m, { ...ctx0, ...ctx })
  const res = (mais) => ({ manualRef: { resolvidos: { x: { 'o-que': { pagina: 'inicio', item: 'M01' }, como: 'conferido-a-mao', evidencia: 'video.mp4', extremos: { opacidade: { de: 0, para: 1 } }, ...mais } } } })
  // (a) contraprova do Codex: opacidade sem de/para nos dois lados
  const r = item('M01'), a = rodar(r, nosso(r))
  assert.equal(C.codigoDeSaida(a), 2, JSON.stringify([a.naoConfiavel, a.falhas]))
  assert.ok(a.naoConfiavel.some((x) => /M01: sem começo e fim medidos \(de\/para\) de opacidade; para liberar.*"item": "M01"/.test(x)), a.naoConfiavel.join(' | '))
  // (b) com os extremos escritos: nosso igual 0, nosso invertido 1
  assert.equal(C.codigoDeSaida(rodar(r, nosso(r, { de: { opacidade: 0 }, para: { opacidade: 1 } }), res())), 0)
  const inv1 = rodar(r, nosso(r, { de: { opacidade: 1 }, para: { opacidade: 0 } }), res())
  assert.equal(C.codigoDeSaida(inv1), 1); assert.equal(inv1.falhas[0].linha, 'direção')
  // (c) falta uma propriedade, ou só semMovimento/itensConferidos, ou evidência que não existe: continua 2
  const r2p = item('M01', { muda: ['opacidade', 'escala'] }), n2p = nosso(r2p, { de: { opacidade: 0, escala: 1 }, para: { opacidade: 1, escala: 1.1 } })
  const c = rodar(r2p, n2p, res())
  assert.equal(C.codigoDeSaida(c), 2); assert.ok(c.naoConfiavel.some((x) => /faltam extremos de escala/.test(x)), c.naoConfiavel.join(' | '))
  assert.equal(C.codigoDeSaida(rodar(r, nosso(r), res({ extremos: undefined, semMovimento: 'olhei o vídeo inteiro do título e ele entra sem mudar nada' }))), 2)
  assert.equal(C.codigoDeSaida(rodar(r, nosso(r), res({ evidencia: 'sumiu.mp4' }))), 2)
  assert.equal(C.codigoDeSaida(rodar(r, nosso(r), res({ extremos: { opacidade: { de: '0', para: 1 } } }))), 2, 'valor que não é número')
  const outraPag = res(); outraPag.manualRef.resolvidos.x['o-que'].pagina = 'p2'
  assert.equal(C.codigoDeSaida(rodar(r, nosso(r, { de: { opacidade: 0 }, para: { opacidade: 1 } }), outraPag)), 2, 'item de outra página')
  // (d) um lado só: compara esse lado
  const r1 = item('M01', { para: { opacidade: 1 } })
  assert.equal(C.codigoDeSaida(rodar(r1, nosso(r1))), 0)
  const d1 = rodar(r1, nosso(r1, { para: { opacidade: 0.2 } }))
  assert.equal(C.codigoDeSaida(d1), 1); assert.equal(d1.falhas[0].linha, 'começo e fim')
  const d2 = rodar(r1, nosso(r1, { de: { opacidade: 0 }, para: null }))
  assert.equal(C.codigoDeSaida(d2), 1); assert.ok(/"para".*não medido no nosso/.test(d2.falhas[0].detalhe), d2.falhas[0].detalhe)
  // (e) isentos continuam 0
  for (const [nome, mais] of [['canvas', { muda: ['canvas'] }], ['só visibilidade', { muda: ['visibilidade'] }], ['cor', { muda: ['cor'] }], ['troca-de-pagina', { gatilho: 'troca-de-pagina' }]]) {
    const ri = item('M01', mais), ni = nosso(ri, (mais.muda || []).includes('canvas') ? { evidencia: { mudou: true } } : {})
    const e = rodar(ri, ni)
    assert.equal(C.codigoDeSaida(e), 0, `${nome}: ${JSON.stringify([e.naoConfiavel, e.falhas])}`)
  }
  const h = item('H01', { fontes: ['olho'] }), mh = C.compararMovimento(inv([]), inv([nosso(h)]), mapa('H01'), { ...ctx0, manualRef: { itens: [h] } })
  assert.equal(C.codigoDeSaida(mh), 0, 'item manual: ' + JSON.stringify(mh.naoConfiavel))
  const rm = item('M01', { gatilho: 'mouse' }), aprov = { quem: 'dono', quando: '2026-11-12', palavras: 'pode ficar parado' }
  const ef = rodar(rm, nosso(rm, { gatilho: 'toque' }), { celular: true, estadosFixos: { M01: { existe: true, visivel: true } } }, mapa('M01', { celular: { gatilho: 'estado-final-fixo', aprovadoPor: aprov } }), { tela: TELA_CEL })
  assert.equal(C.codigoDeSaida(ef), 0, 'estado-final-fixo: ' + JSON.stringify([ef.naoConfiavel, ef.falhas]))
})

test('3ª passada, P1 manual incorporado: a cópia do coletor não é colisão; conteúdo diferente ou automático é 2', () => {
  const h = base({ id: 'H01', gatilho: 'mouse', alvo: { desc: 'a.menu', quantos: 1, dataMov: null }, muda: ['cor'], fontes: ['olho'] })
  // a cópia como o movimento.mjs grava: fontes com roteiro-manual, chave e quadros acrescentados
  const copia = { ...clone(h), doManual: true, fontes: ['olho', 'roteiro-manual'], chave: 'inicio|mouse|a.menu', quadros: null }
  const ref = inv([...ITENS_REF, copia], { naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'parado', o: 'canvas do rodapé', motivo: 'não parou' }] })
  const nossos = inv([...nossosDe(ITENS_REF), base({ id: 'M30', gatilho: 'mouse', alvo: { desc: 'a.menu', quantos: 1, dataMov: 'H01' }, muda: ['cor'], fontes: ['css'] })])
  const mapa = MAPA(); mapa.itens.H01 = { situacao: 'implementado' }
  const resolvidos = { N01: { 'o-que': { pagina: 'inicio', etapa: 'parado' }, como: 'conferido-a-mao', evidencia: 'video.mp4', itensConferidos: ['H01'] } }
  const rodar = (itens) => C.compararMovimento(ref, nossos, mapa, { ...ctx0, manualRef: { itens, resolvidos } })
  const ok = rodar([h])
  assert.equal(C.codigoDeSaida(ok), 0, JSON.stringify([ok.naoConfiavel, ok.falhas]))
  assert.equal(ok.contagem.itensReferencia, 6, 'a cópia incorporada vale uma vez só')
  const mudou = rodar([{ ...clone(h), alvo: { desc: 'a.menu-novo', quantos: 1, dataMov: null } }])
  assert.equal(C.codigoDeSaida(mudou), 2)
  assert.ok(mudou.naoConfiavel.some((x) => /H01 mudou no movimento-manual.json depois da coleta \(alvo/.test(x)), mudou.naoConfiavel.join(' | '))
  // colisão com automático (sem roteiro-manual nas fontes) continua 2
  const col = rodar([{ ...clone(ITENS_REF[4]) }])
  assert.equal(C.codigoDeSaida(col), 2)
  assert.ok(col.naoConfiavel.some((x) => /M06 tem o mesmo número de um item automático/.test(x)), col.naoConfiavel.join(' | '))
})

test('3ª passada, P2 zero: valor zero na referência compara por diferença, não por razão', () => {
  const item = (id, muda, de, para) => base({ id, gatilho: 'carregar', alvo: { desc: 'h1', quantos: 1, dataMov: null }, muda, de, para, duracaoMs: 600, curva: 'ease-out', fontes: ['css'] })
  const rodar = (r, de, para) => C.compararMovimento(inv([r]), inv([{ ...clone(r), id: 'M20', alvo: { ...r.alvo, dataMov: r.id }, de, para }]), { base: MAPA().base, itens: { [r.id]: { situacao: 'implementado' } } }, ctx0)
  const casos = [
    // [nome, muda, de ref, para ref, de/para nosso igual, de/para nosso diferente]
    ['escala um lado em zero', ['escala'], { escala: 0 }, null, [{ escala: 0 }, null], [{ escala: 0.5 }, null]],
    ['escala de zero a um', ['escala'], { escala: 0 }, { escala: 1 }, [{ escala: 0.05 }, { escala: 1 }], [{ escala: 0.4 }, { escala: 1 }]],
    ['largura nasce do zero', ['largura'], { larguraPx: 0 }, { larguraPx: 300 }, [{ larguraPx: 0 }, { larguraPx: 310 }], [{ larguraPx: 0 }, { larguraPx: 800 }]],
    ['largura um lado em zero', ['largura'], null, { larguraPx: 0 }, [null, { larguraPx: 0 }], [null, { larguraPx: 400 }]],
    ['posição um lado em zero', ['posicao-y'], null, { yPx: 0 }, [null, { yPx: 0 }], [null, { yPx: 300 }]],
    ['desfoque um lado em zero', ['desfoque'], null, { desfoquePx: 0 }, [null, { desfoquePx: 0 }], [null, { desfoquePx: 10 }]],
    ['rotação um lado em zero', ['rotacao'], { rotacaoGraus: 0 }, null, [{ rotacaoGraus: 2 }, null], [{ rotacaoGraus: 45 }, null]],
    ['opacidade um lado em zero', ['opacidade'], { opacidade: 0 }, null, [{ opacidade: 0 }, null], [{ opacidade: 0.8 }, null]],
  ]
  for (const [nome, muda, de, para, igual, outro] of casos) {
    const r = item('M01', muda, de, para)
    const a = rodar(r, ...igual), b = rodar(r, ...outro)
    assert.equal(C.codigoDeSaida(a), 0, `${nome} (igual): ${JSON.stringify([a.naoConfiavel, a.falhas])}`)
    assert.equal(C.codigoDeSaida(b), 1, `${nome} (diferente): ${JSON.stringify([b.naoConfiavel, b.falhas])}`)
  }
})

test('4ª passada, P1 origem: só a marca doManual do coletor prova a cópia incorporada', () => {
  const nm = { naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'parado', o: 'canvas do rodapé', motivo: 'não parou' }] }
  const resolvidos = { N01: { 'o-que': { pagina: 'inicio', etapa: 'parado' }, como: 'conferido-a-mao', evidencia: 'video.mp4', itensConferidos: ['M01'] } }
  // exemplo do Codex: item medido por executarAcoes (acaoManual, fontes com roteiro-manual), sem doManual
  const medido = base({ id: 'M01', gatilho: 'clique', alvo: { desc: 'button.menu', quantos: 1, dataMov: null }, muda: ['cor'], fontes: ['roteiro-manual', 'amostra'], acaoManual: 'abrir-menu' })
  const registro = { ...clone(medido) }; delete registro.acaoManual; registro.fontes = ['olho']
  const nossos = inv([...nossosDe(ITENS_REF), { ...clone(medido), id: 'M30', alvo: { ...medido.alvo, dataMov: 'M01' } }])
  const mapa = MAPA(); mapa.itens.M01 = { situacao: 'implementado' }
  const rodar = (refItens, itens) => C.compararMovimento(inv(refItens, nm), nossos, mapa, { ...ctx0, manualRef: { itens, resolvidos } })
  const c = rodar([...ITENS_REF, medido], [registro])
  assert.equal(C.codigoDeSaida(c), 2, JSON.stringify(c.naoConfiavel))
  assert.ok(c.naoConfiavel.some((x) => /M01 tem o mesmo número de um item automático/.test(x)), c.naoConfiavel.join(' | '))
  // a mesma cópia com a marca do coletor passa
  const copia = { ...clone(registro), doManual: true, fontes: ['olho', 'roteiro-manual'] }
  assert.equal(C.codigoDeSaida(rodar([...ITENS_REF, copia], [registro])), 0)
  // doManual escrito à mão no registro é erro de contrato
  const d = rodar([...ITENS_REF, copia], [{ ...registro, doManual: true }])
  assert.equal(C.codigoDeSaida(d), 2)
  assert.ok(d.naoConfiavel.some((x) => /M01: doManual não se escreve/.test(x)), d.naoConfiavel.join(' | '))
})

// Regra da rodada cortada (movimento.mjs grava rodada: { completa, motivos }): rodada incompleta, da referência ou do
// nosso, nunca sai 0 e não se resolve à mão (rodada cortada se resolve rodando de novo). Sem o campo, como antes.
test('rodada cortada: referência ou nosso com rodada.completa false sai 2 com os motivos; resolvidos não liberam', () => {
  const corte = { completa: false, motivos: ['página sobre não visitada (tempo esgotado)'] }
  const nossos = nossosDe(ITENS_REF)
  // sem o campo e com completa true: igual a hoje (0)
  assert.equal(C.codigoDeSaida(C.compararMovimento(inv(ITENS_REF), inv(nossos), MAPA(), ctx0)), 0)
  assert.equal(C.codigoDeSaida(C.compararMovimento(inv(ITENS_REF, { rodada: { completa: true, motivos: [] } }), inv(nossos, { rodada: { completa: true, motivos: [] } }), MAPA(), ctx0)), 0)
  for (const lado of ['referência', 'nosso']) {
    const ref = inv(ITENS_REF, lado === 'referência' ? { rodada: clone(corte) } : {})
    const nos = inv(nossos, lado === 'nosso' ? { rodada: clone(corte) } : {})
    const c = C.compararMovimento(ref, nos, MAPA(), ctx0)
    assert.equal(C.codigoDeSaida(c), 2, `${lado}: ${JSON.stringify(c.naoConfiavel)}`)
    const linha = c.naoConfiavel.find((x) => x.startsWith(`${lado}: rodada incompleta`))
    assert.ok(linha && /página sobre não visitada \(tempo esgotado\)/.test(linha), c.naoConfiavel.join(' | '))
    assert.ok(C.gerarMarkdown(c).includes(linha), 'o motivo vai também para o .md')
  }
  // resolução que liberaria a lacuna da etapa (mesmo molde do "percurso da resolução") não libera a rodada cortada
  const ref = inv(ITENS_REF); ref.cobertura[4] = { pagina: 'inicio', etapa: 'mouse', estado: 'falhou', itens: 0, limites: null, motivo: 'tempo máximo esgotado' }
  const comH = [...nossos, base({ id: 'M30', gatilho: 'mouse', alvo: { desc: 'a.menu', quantos: 1, dataMov: 'H01' }, muda: ['cor'], fontes: ['css'] })]
  const mapa = MAPA(); mapa.itens.H01 = { situacao: 'implementado', arquivo: 'src/Menu.tsx' }
  const manual = { itens: [base({ id: 'H01', gatilho: 'mouse', alvo: { desc: 'a.menu', quantos: 1 }, muda: ['cor'], fontes: ['olho'] })],
    resolvidos: { mouse: { 'o-que': { pagina: 'inicio', etapa: 'mouse' }, como: 'video-do-dono', evidencia: 'video.mp4', itensConferidos: ['H01'] },
      inicio: { 'o-que': { pagina: 'inicio' }, como: 'conferido-a-mao', evidencia: 'video.mp4', semMovimento: 'olhei a página inteira no vídeo do dono e não há nada que se mexa' } } }
  assert.equal(C.codigoDeSaida(C.compararMovimento(ref, inv(comH), mapa, { ...ctx0, manualRef: manual })), 0, 'contraprova: sem o campo a resolução libera')
  const cortada = { ...clone(ref), rodada: { completa: false, motivos: ['inicio mouse: falhou (tempo máximo esgotado)'] } }
  const c = C.compararMovimento(cortada, inv(comH), mapa, { ...ctx0, manualRef: manual })
  assert.equal(C.codigoDeSaida(c), 2)
  assert.deepEqual(c.naoConfiavel.filter((x) => !/rodada incompleta/.test(x)), [], 'só a rodada cortada bloqueia: a lacuna da etapa foi resolvida')
  // o inventário que o movimento.mjs grava quando a página inicial não abre (gravarInvalido): o motivo aparece também
  const invalido = { versao: 1, valido: false, url: 'http://localhost/', tela: TELA, paginas: [{ id: 'inicio', url: 'http://localhost/', tipo: 'inicial', valido: false, motivo: 'a página não respondeu (sem resposta)' }],
    itens: [], cobertura: [], naoMedido: [{ id: 'N01', pagina: 'inicio', etapa: 'carregar', o: 'página inicial', motivo: 'a página não respondeu (sem resposta)' }],
    rodada: { completa: false, motivos: ['a página não respondeu (sem resposta)'] }, avisos: [] }
  const ci = C.compararMovimento(inv(ITENS_REF), invalido, MAPA(), ctx0)
  assert.equal(C.codigoDeSaida(ci), 2)
  assert.ok(ci.naoConfiavel.some((x) => /^nosso: rodada incompleta.*não respondeu/.test(x)), ci.naoConfiavel.join(' | '))
  // motivos fora do formato (não é lista) não derruba a conferência
  const torto = C.compararMovimento(inv(ITENS_REF, { rodada: { completa: false, motivos: 'tempo' } }), inv(nossos), MAPA(), ctx0)
  assert.equal(C.codigoDeSaida(torto), 2)
  assert.ok(torto.naoConfiavel.some((x) => /^referência: rodada incompleta/.test(x)), torto.naoConfiavel.join(' | '))
})

// Rodada limpa por URL, de ponta a ponta: o movimento.mjs mede um site local (referência); o mesmo site, com data-mov =
// número da referência em cada alvo, vai por URL ao comparador, que mede o nosso num processo filho.
// O coletor hoje deixa duas lacunas num site assim (as duas dão saída 2, nunca 0, até a resolução à mão):
//   - etapa codigo "parcial" + um não medido de GSAP: site sem GSAP não tem como provar que não usa GSAP;
//   - um item repetido do h1 (mesma animação) sem de/para: lacuna de extremos da referência.
// O teste afirma o que tem de valer em qualquer caso e só aceita essas causas para a saída 2.
test('[chrome] rodada limpa por URL: o filho mede o nosso, os pares saem do data-mov, a saída é coerente', { timeout: 600_000 }, async (t) => {
  if (!acharNavegador()) { t.diagnostic('sem Chrome/Edge: rodada por URL não conferida'); return }
  const MOV = path.join(raiz, 'plugins', 'landing-pages', 'skills', 'lp-referencias', 'scripts', 'movimento.mjs')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'comparar-url-'))
  let marcas = {}, bloquear = false
  const pagina = () => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Teste</title><style>
body{margin:0;font:18px sans-serif}section{min-height:100vh;padding:40px}
h1{animation:vem 800ms ease-out both}@keyframes vem{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
#cartao{width:200px;height:120px;background:#a85;opacity:0;transform:translateY(60px);transition:opacity 600ms ease,transform 600ms ease}
#cartao.visto{opacity:1;transform:none}
.botao{display:inline-block;padding:12px 24px;background:#333;color:#fff;transition:transform 300ms ease}.botao:hover{transform:scale(1.2)}
</style></head><body>
<section id="abre"><h1>Móveis feitos para durar</h1><p>${'Texto da abertura. '.repeat(10)}</p><a class="botao">Fale</a></section>
<section id="cena"><h2 id="frase">Cada peça começa na madeira</h2><div id="cartao"></div><p>${'Texto. '.repeat(20)}</p></section>
<section id="fim"><p>${'Fim. '.repeat(20)}</p></section>
<script>
const M = ${JSON.stringify(marcas)}
for (const [sel, id] of Object.entries(M)) for (const el of document.querySelectorAll(sel)) el.setAttribute('data-mov', id)
const frase = document.getElementById('frase'), cartao = document.getElementById('cartao'), cena = document.getElementById('cena')
function rolou() { const p = Math.max(0, Math.min(1, (scrollY - cena.offsetTop + innerHeight) / innerHeight)); frase.style.opacity = String(1 - p * 0.8); cartao.classList.toggle('visto', scrollY > cena.offsetTop - innerHeight * 0.5) }
addEventListener('scroll', rolou, { passive: true }); rolou()
</script></body></html>`
  const servidor = http.createServer((req, res) => {
    if (req.url === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('') }
    if (req.url === '/' && bloquear) { res.writeHead(403, { 'content-type': 'text/html' }); return res.end('<h1>Proibido</h1>') }
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(pagina()) }
    res.writeHead(404); res.end()
  })
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
  t.after(() => { servidor.close(); servidor.closeAllConnections?.(); fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) })
  const url = `http://127.0.0.1:${servidor.address().port}/`
  const lerJ = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf8'))
  const travas = ['--max-paginas', '0', '--max-mouse', '6']

  // fase 1: a referência medida pelo coletor
  const pRef = path.join(tmp, 'ref')
  const r1 = await new Promise((resolve) => {
    const p = spawn(process.execPath, [MOV, url, pRef, ...travas], { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''; p.stderr.on('data', (d) => { err += d }); p.stdout.on('data', () => {})
    p.on('close', (code) => resolve({ code, err }))
  })
  assert.equal(r1.code, 0, r1.err)
  const ref = lerJ(pRef, 'movimento.json')
  assert.equal(ref.valido, true); assert.equal(ref.rodada?.completa, true, JSON.stringify(ref.rodada))
  assert.ok(ref.itens.length >= 4, ref.itens.map((i) => i.id + ' ' + i.alvo.desc).join(', '))
  // fase 2: o nosso é o mesmo site, cada alvo com data-mov = os números da referência dele
  marcas = {}
  for (const it of ref.itens) marcas[it.alvo.desc] = marcas[it.alvo.desc] ? `${marcas[it.alvo.desc]} ${it.id}` : it.id
  const mapaArq = path.join(tmp, 'mapa.json')
  fs.writeFileSync(mapaArq, JSON.stringify({ base: { url, escolhidaPeloDono: '2026-11-12', palavras: 'teste local' }, itens: Object.fromEntries(ref.itens.map((i) => [i.id, { situacao: 'implementado', arquivo: 'index.html' }])) }))
  const saida = path.join(tmp, 'saida')
  const r2 = await rodarCli([pRef, url, saida, '--mapa', mapaArq, ...travas])
  // o filho rodou e gravou o inventário nosso, com a rodada inteira
  const nosso = lerJ(saida, 'nosso', 'movimento.json')
  assert.equal(nosso.valido, true); assert.equal(nosso.rodada?.completa, true, JSON.stringify(nosso.rodada))
  const c = lerJ(saida, 'movimento-comparacao.json')
  assert.ok(fs.existsSync(path.join(saida, 'movimento-comparacao.md')))
  assert.deepEqual(c.falhas, [], JSON.stringify(c.falhas))
  // pares: todo item da referência com começo ou fim medido, cada um pelo data-mov do nosso
  const semExtremos = new Set(ref.itens.filter((i) => i.de == null && i.para == null).map((i) => i.id))
  assert.deepEqual(c.pares.map((p) => p.ref).sort(), ref.itens.map((i) => i.id).filter((id) => !semExtremos.has(id)).sort(), JSON.stringify(c.pares))
  const porId = new Map(nosso.itens.map((i) => [i.id, i]))
  for (const p of c.pares) assert.ok(String(porId.get(p.nosso)?.alvo?.dataMov || '').split(/\s+/).includes(p.ref), `${p.ref} ↔ ${p.nosso}: o par não veio do data-mov`)
  // saída coerente: 0 sem nada não confiável; 2 só pelas lacunas conhecidas do coletor (nenhuma de rodada cortada)
  const conhecidas = [/^(referência|nosso): etapa codigo da página inicio: parcial/, /^(referência|nosso): não medido N\d+: inicio\/codigo:/,
    (x) => { const m = /^referência: (M\d+): sem começo e fim medidos/.exec(x); return !!m && semExtremos.has(m[1]) }]
  for (const x of c.naoConfiavel) assert.ok(conhecidas.some((k) => (typeof k === 'function' ? k(x) : k.test(x))), 'motivo fora das lacunas conhecidas do coletor: ' + x)
  assert.equal(r2.code, c.naoConfiavel.length ? 2 : 0, r2.err + r2.out)
  t.diagnostic(`por URL: saída ${r2.code}, ${c.pares.length} pares de ${ref.itens.length}, ${c.naoConfiavel.length} motivos de não confiável`)

  // fase 3: página inicial do nosso bloqueada (o coletor sai 3 e grava o inventário inválido): o motivo sai no .md e
  // no .json (saída 2), em vez de a conferência parar sem relatório.
  bloquear = true
  const saida3 = path.join(tmp, 'bloqueada')
  const r3 = await rodarCli([pRef, url, saida3, '--mapa', mapaArq, ...travas])
  assert.equal(r3.code, 2, r3.err + r3.out)
  const c3 = lerJ(saida3, 'movimento-comparacao.json')
  // bloqueio é limite do site (regente, 12/11): não é rodada cortada; o motivo aparece como inventário inválido
  assert.ok(c3.naoConfiavel.some((x) => /^nosso: inventário inválido \(.*403/.test(x)), c3.naoConfiavel.join(' | '))
  assert.ok(!c3.naoConfiavel.some((x) => /rodada incompleta/.test(x)), c3.naoConfiavel.join(' | '))
  assert.match(fs.readFileSync(path.join(saida3, 'movimento-comparacao.md'), 'utf8'), /nosso: inventário inválido/)
})
