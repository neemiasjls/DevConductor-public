// Ritmo do estilo brutalista gráfico (lp-direcao-de-arte/estilos/brutalista-grafico.md): seco e rápido.
export const ritmo = {
  curta: 0.15,
  media: 0.4,
  longa: 0.8,
  entra: 'expo.inOut',
  sai: 'expo.in',
  distancia: 60,
  escalonar: 0.03,
  scrub: 0.3,
  faixa: { baseCelular: 35, baseComputador: 55, impulso: 0.4, tetoImpulso: 1400 },
} as const

// Mesmas cores do @theme (index.css), para quem precisa delas em JS/SVG.
export const cores = {
  tinta: 'oklch(0.12 0.01 90)',
  papel: 'oklch(0.95 0.005 85)',
  grito: 'oklch(0.88 0.18 100)',
} as const

// Consultas de mídia usadas no gsap.matchMedia(): o movimento só existe sem "reduzir movimento".
export const consultas = {
  computador: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  celular: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
  mouse: '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
} as const
