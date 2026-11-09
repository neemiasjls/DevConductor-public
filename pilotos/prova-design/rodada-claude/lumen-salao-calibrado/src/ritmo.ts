// Ritmo do estilo luxo editorial (lp-direcao-de-arte/estilos/luxo-editorial.md). Nenhum número solto nas cenas.
export const ritmo = {
  dur: { curta: 0.3, media: 0.9, longa: 1.4 },
  ease: { entra: 'expo.out', sai: 'expo.in', cruza: 'power2.inOut' },
  distancia: 24,
  escalonar: 0.09,
  scrub: 1,
  /** reflexo da abertura: uma passagem lenta e um descanso antes da próxima (WCAG 2.2.2: há botão de pausa) */
  reflexo: { passagem: 6.5, descanso: 3.5, segueCursor: 0.08 },
  /** alturas de tela de rolagem em cada cena presa (além da tela do palco) */
  telas: {
    resultado: { desktop: 0.8, celular: 0.6 },
  },
  /** cruzamento lento da foto do serviço */
  troca: 0.9,
} as const

export type Ritmo = typeof ritmo
