// Registro ilustrativo de temperatura de uma viagem de congelados (demonstração, não é dado real).
// Leitura a cada 15 min durante 36 h; semente fixa para o desenho ser sempre o mesmo.

export const HORAS = 36
export const PASSO = 0.25

function gerador(semente: number) {
  let s = semente
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// Subida rápida com a porta aberta e volta mais lenta depois de fechar.
function porta(h: number, abre: number, aberta: number, pico: number, volta: number) {
  if (h < abre) return 0
  if (h <= abre + aberta) return pico * Math.sin(((h - abre) / aberta) * (Math.PI / 2))
  const t = (h - abre - aberta) / volta
  return t >= 1 ? 0 : pico * (1 - t) * (1 - t)
}

const sorte = gerador(11)
let ruido = 0
export const registro: { h: number; t: number }[] = []
for (let h = 0; h <= HORAS + 1e-9; h += PASSO) {
  ruido = ruido * 0.6 + (sorte() - 0.5) * 0.16
  const t = -18 + ruido + porta(h, 2, 0.42, 0.7, 0.67) + porta(h, 33, 0.5, 1.2, 0.9)
  registro.push({ h: Math.round(h * 100) / 100, t: Math.round(t * 100) / 100 })
}

export function temperaturaEm(h: number) {
  const i = Math.min(registro.length - 2, Math.max(0, Math.floor(h / PASSO)))
  const a = registro[i], b = registro[i + 1]
  const f = Math.min(1, Math.max(0, (h - a.h) / PASSO))
  return a.t + (b.t - a.t) * f
}

// Posição na rota (fração do traçado Chapecó → Curitiba → São Paulo) por hora de viagem.
const ROTA = [[0, 0], [3, 0], [13, 0.54], [15, 0.6], [26, 0.6], [33, 1], [36, 1]] as const
export function fracaoRota(h: number) {
  for (let i = 1; i < ROTA.length; i++) {
    const [h0, f0] = ROTA[i - 1], [h1, f1] = ROTA[i]
    if (h <= h1) return f0 + (f1 - f0) * Math.min(1, Math.max(0, (h - h0) / (h1 - h0)))
  }
  return 1
}
