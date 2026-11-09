// Tokens do estilo tecnologico-escuro (lp-direcao-de-arte/estilos/tecnologico-escuro.md) e permanências das cenas.
export const ritmo = {
  curta: 0.18,
  media: 0.45,
  longa: 0.8,
  entra: 'power4.out',
  sai: 'power4.in',
  distancia: 12,
  escalonar: 0.04,
  scrub: 0.4,
  // Abertura + cadeira: telas de rolagem com o palco preso (plano: 1,8 computador / 1,4 celular).
  cadeira: { telasDesktop: 1.8, telasCelular: 1.4, cobre: 0.6 },
  // Degradê medido (clímax): 2 telas computador / 1,5 celular.
  degrade: { telasDesktop: 2, telasCelular: 1.5 },
  // Giro lento da cadeira antes da rolagem (rad/s de fase; amplitude em rad).
  giro: { velocidade: 0.24, amplitude: 0.5 },
} as const

// Cores em hex para o three.js (as mesmas do CSS em OKLCH).
export const cor = {
  grafite: '#0b1513',
  cobre: '#e0905a',
  luzQuente: '#ffd9b0',
} as const

export const consultas = {
  mover: '(prefers-reduced-motion: no-preference)',
  // Clímax do degradê preso só com altura para ele (igual às variantes cena/estatico do CSS).
  cenaDegrade: '(prefers-reduced-motion: no-preference) and (min-height: 600px)',
  celular: '(max-width: 767px)',
  largo: '(min-width: 1024px)',
  mouse: '(hover: hover) and (pointer: fine)',
} as const
