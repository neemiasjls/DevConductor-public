// Regras de densidade de texto por tela (LP-12), sem navegador: contam palavras e julgam cada tela.
// Usadas por densidade.mjs; separadas para serem testadas sem Chrome.

export const LIMITES_PADRAO = Object.freeze({ computador: 60, celular: 45 })

// Palavra = trecho entre espaços com pelo menos uma letra ou algarismo: "−18 °C" conta 2 (número e unidade),
// "·" e "—" soltos não contam. Os limites da LP-12 já consideram números com unidade como texto a ler.
export function contarPalavras(texto) {
  return String(texto).split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length
}

// trechos: [{ texto, leitura, motivo? }] visíveis numa tela. Seções com data-leitura (serviços, preços, perguntas,
// rodapé) entram na conta à parte e não disparam alerta. motivo vem de data-densidade="<motivo>" num elemento:
// exceção localizada e escrita no código, que a tela acima do limite mostra no relatório em vez de reprovar.
export function medirTela(trechos) {
  let palavras = 0, palavrasLeitura = 0
  const motivos = new Set()
  for (const { texto, leitura, motivo } of trechos) {
    const n = contarPalavras(texto)
    if (leitura) palavrasLeitura += n
    else palavras += n
    if (motivo && !leitura && n) motivos.add(motivo)
  }
  return motivos.size ? { palavras, palavrasLeitura, motivos: [...motivos] } : { palavras, palavrasLeitura }
}

export function avaliar(telas, limites = LIMITES_PADRAO) {
  for (const modo of ['computador', 'celular']) {
    const limite = limites[modo]
    if (!Number.isInteger(limite) || limite < 1) throw new Error(`Limite inválido para ${modo}: ${limite}`)
  }
  const acima = telas
    .filter((t) => t.palavras > limites[t.modo])
    .map((t) => ({ modo: t.modo, y: t.y, palavras: t.palavras, limite: limites[t.modo], amostra: t.amostra ?? '',
      ...(t.motivos?.length ? { motivos: t.motivos } : {}) }))
  const alertas = acima.filter((t) => !t.motivos)
  const justificadas = acima.filter((t) => t.motivos)
  const maior = (modo) => Math.max(0, ...telas.filter((t) => t.modo === modo).map((t) => t.palavras))
  return { alertas, justificadas, maior: { computador: maior('computador'), celular: maior('celular') } }
}
