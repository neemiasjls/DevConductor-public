// Requisição de revisão local: o prazo cobre headers e corpo, sem seguir redirecionamentos.
export async function pedirHttpTeste(porta, metodo, rota, corpo, tipo = 'application/json', { tempoLimiteMs = 5000 } = {}) {
  if (!Number.isSafeInteger(porta) || porta < 1 || porta > 65535) throw Error('Porta de teste inválida.')
  if (!Number.isSafeInteger(tempoLimiteMs) || tempoLimiteMs < 1) throw Error('Prazo de teste inválido.')
  if (typeof rota !== 'string' || !rota.startsWith('/')) throw Error('Rota de teste deve começar com /.')
  const r = await fetch(`http://127.0.0.1:${porta}${rota}`, {
    method: metodo, redirect: 'manual', signal: AbortSignal.timeout(tempoLimiteMs),
    headers: corpo === undefined ? { connection: 'close' } : { 'content-type': tipo, connection: 'close' }, body: corpo,
  })
  const texto = await r.text()
  let json
  try { json = JSON.parse(texto) } catch { /* Corpo não JSON também é evidência. */ }
  return { status: r.status, tipo: r.headers.get('content-type') || '', texto, json }
}

export async function aguardarHttpTeste(porta, rota = '/', aceitar = r => r.status >= 200 && r.status < 300,
  { tempoLimiteMs = 10000, intervaloMs = 250 } = {}) {
  if (!Number.isSafeInteger(tempoLimiteMs) || tempoLimiteMs < 1 || !Number.isSafeInteger(intervaloMs) || intervaloMs < 1)
    throw Error('Prazo e intervalo devem ser inteiros positivos.')
  if (typeof aceitar !== 'function') throw Error('Critério de prontidão inválido.')
  const limite = performance.now() + tempoLimiteMs
  let ultimaFalha
  while (performance.now() < limite) {
    const restante = Math.max(1, Math.ceil(limite - performance.now()))
    let resposta
    try { resposta = await pedirHttpTeste(porta, 'GET', rota, undefined, undefined, { tempoLimiteMs: Math.min(1000, restante) }) }
    catch (e) { ultimaFalha = e }
    if (resposta && aceitar(resposta)) return resposta
    const espera = Math.min(intervaloMs, Math.floor(limite - performance.now()))
    if (espera > 0) await new Promise(resolve => setTimeout(resolve, espera))
  }
  throw new Error('Servidor HTTP de teste não ficou pronto no prazo.', { cause: ultimaFalha })
}
