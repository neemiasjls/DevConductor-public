// Comparação de versões no formato do plugin.json (x.y.z, com sufixo -pre opcional, que vale menos que sem sufixo).
// Devolve > 0 se a for maior que b, < 0 se menor, 0 se igual. Números em BigInt: não perdem precisão.
const num = (t) => (/^\d+$/.test(t) ? BigInt(t) : 0n)
const sinal = (d) => (d > 0n ? 1 : d < 0n ? -1 : 0)

export function compararVersoes(a, b) {
  const partes = (v) => {
    const [nucleo, pre = ''] = String(v).split('+')[0].split(/-(.*)/s)
    return { n: nucleo.split('.').map(num), pre }
  }
  const x = partes(a)
  const y = partes(b)
  for (let i = 0; i < 3; i++) {
    const d = sinal((x.n[i] ?? 0n) - (y.n[i] ?? 0n))
    if (d) return d
  }
  if (x.pre === y.pre) return 0
  if (!x.pre) return 1
  if (!y.pre) return -1
  // SemVer: identificadores separados por ponto; números comparados como números e menores que texto;
  // com tudo igual, o que tem menos identificadores é menor (1.0.0-beta < 1.0.0-beta.1).
  const a2 = x.pre.split('.')
  const b2 = y.pre.split('.')
  for (let i = 0; i < Math.max(a2.length, b2.length); i++) {
    if (a2[i] === undefined) return -1
    if (b2[i] === undefined) return 1
    const na = /^\d+$/.test(a2[i])
    const nb = /^\d+$/.test(b2[i])
    if (na && nb) { const d = sinal(BigInt(a2[i]) - BigInt(b2[i])); if (d) return d; continue }
    if (na !== nb) return na ? -1 : 1
    if (a2[i] !== b2[i]) return a2[i] < b2[i] ? -1 : 1
  }
  return 0
}
