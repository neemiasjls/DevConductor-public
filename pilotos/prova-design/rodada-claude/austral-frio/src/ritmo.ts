// Tokens do estilo editorial-serio (lp-direcao-de-arte/estilos/editorial-serio.md) + permanência das cenas.
export const ritmo = {
  curta: 0.25,
  media: 0.6,
  longa: 0.9,
  entra: 'power2.out',
  sai: 'power2.in',
  entraCss: 'cubic-bezier(0.25, 1, 0.5, 1)',
  distancia: 16,
  escalonar: 0.06,
  scrub: 0.6,
  // Permanência presa (telas de rolagem com o palco parado), computador / celular.
  porta: { desktop: 0.8, celular: 0.6 },
  viagem: { desktop: 2.2, celular: 1.6 },
  doca: { desktop: 0.9, celular: 0.7 },
  // Registrador da abertura: um ponto novo a cada N ms (ciclo lento, pausável).
  registrador: { passoMs: 900, pontos: 48 },
} as const

export const consultas = {
  mover: '(prefers-reduced-motion: no-preference)',
  reduzido: '(prefers-reduced-motion: reduce)',
  celular: '(max-width: 767px)',
  mouse: '(hover: hover) and (pointer: fine)',
} as const
