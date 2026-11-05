// Tokens do estilo imersivo-3d (lp-direcao-de-arte/estilos/imersivo-3d.md) e durações das cenas.
export const ritmo = {
  curta: 0.25,
  media: 0.7,
  longa: 1.2,
  entra: 'power3.out',
  sai: 'power3.in',
  distancia: 16,
  escalonar: 0.06,
  scrub: 1.2,
  // Cena do caixote (abertura + vista de cima): telas de rolagem presas.
  cena: { telasDesktop: 4.4, telasCelular: 3.6 },
  // Rota: ~600 px de rolagem por trecho.
  rota: { desktop: 2100, celular: 1350 },
  foto: { desktop: 1300, celular: 700 },
} as const

// Cores em hex para o three.js (as mesmas do CSS em OKLCH).
export const cor = {
  carvao: '#0c1014',
  papel: '#e9e8e3',
  sinal: '#ef7927',
} as const

export const consultas = {
  mover: '(prefers-reduced-motion: no-preference)',
  celular: '(max-width: 767px)',
  largo: '(min-width: 1024px)',
  mouse: '(hover: hover) and (pointer: fine)',
} as const
