// Baixa uma imagem conferindo status, tipo e conteúdo antes de devolver os bytes (quem chama é que grava).
// 429/5xx: no máximo UMA nova tentativa, depois da espera do cabeçalho Retry-After (limitada a 30 s; sem
// cabeçalho, esperaPadrao). Nunca insiste nem contorna o limite do servidor.
const ASSINATURAS = [[0xff, 0xd8, 0xff], [0x89, 0x50, 0x4e, 0x47], [0x47, 0x49, 0x46, 0x38]]

export function pareceImagem(buf) {
  if (ASSINATURAS.some((a) => a.every((b, i) => buf[i] === b))) return true
  return buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP'
}

export function esperaDoServidor(resposta, { esperaPadrao = 3000, esperaMax = 30_000 } = {}) {
  const valor = resposta.headers.get('retry-after')
  const segundos = Number(valor)
  const ms = valor && Number.isFinite(segundos) ? segundos * 1000 : esperaPadrao
  return Math.min(Math.max(ms, 0), esperaMax)
}

export async function baixarImagem(url, { headers = {}, esperaPadrao = 3000, esperaMax = 30_000, timeout = 20_000 } = {}) {
  let motivo = ''
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    let r
    try { r = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) }) } catch (e) { return { ok: false, motivo: `falha de rede (${e.message})` } }
    if (r.status === 429 || r.status >= 500) {
      motivo = `servidor respondeu ${r.status}`
      if (tentativa === 0) { await new Promise((res) => setTimeout(res, esperaDoServidor(r, { esperaPadrao, esperaMax }))); continue }
      return { ok: false, motivo: `${motivo} de novo após a espera` }
    }
    if (!r.ok) return { ok: false, motivo: `servidor respondeu ${r.status}` }
    const buffer = Buffer.from(await r.arrayBuffer())
    const tipo = r.headers.get('content-type') || ''
    if (!/^image\//i.test(tipo) || !pareceImagem(buffer)) return { ok: false, motivo: `a resposta não é imagem (tipo "${tipo || 'ausente'}", ${buffer.length} bytes)` }
    return { ok: true, buffer }
  }
  return { ok: false, motivo }
}
