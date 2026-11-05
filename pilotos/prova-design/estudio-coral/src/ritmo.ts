// Ritmo do estilo cinético vibrante (lp-direcao-de-arte/estilos/cinetico-vibrante.md). Nenhum número solto nas cenas.
export const ritmo = {
  dur: { curta: 0.2, media: 0.5, longa: 0.9 },
  ease: { entra: 'back.out(1.6)', sai: 'power3.in', cruza: 'power2.inOut', solta: 'power3.out' },
  distancia: 40,
  escalonar: 0.05,
  scrub: 0.5,
  /** segundos entre uma palavra e outra no título da abertura */
  troca: 3,
  /** alturas de tela de rolagem em cada cena presa (além da tela do palco) */
  telas: {
    servicos: { desktop: 2.25, celular: 1.8 },
    tranca: { desktop: 2.9, celular: 2.4 },
    agenda: { desktop: 1.2, celular: 0.9 },
  },
  foto: { duracao: 0.5, ease: 'power3.out' },
} as const

export type Ritmo = typeof ritmo
