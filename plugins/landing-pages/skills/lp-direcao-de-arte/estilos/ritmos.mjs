// Segundos, px e curvas; dados reutilizáveis, sem impor paleta a clientes reais.
export const ritmos = {
  'luxo-editorial': { curta: .3, media: .9, longa: 1.4, entra: [.16, 1, .3, 1], sai: [.7, 0, .84, 0], gsapEntra: 'expo.out', distancia: 24, escalonar: .09, scrub: 1 },
  'tecnologico-escuro': { curta: .18, media: .45, longa: .8, entra: [.22, 1, .36, 1], sai: [.64, 0, .78, 0], gsapEntra: 'power4.out', distancia: 12, escalonar: .04, scrub: .4 },
  'claro-organico': { curta: .25, media: .75, longa: 1.1, entra: [.33, 1, .68, 1], sai: [.32, 0, .67, 0], gsapEntra: 'power2.out', distancia: 20, escalonar: .08, scrub: .8 },
  'editorial-serio': { curta: .25, media: .6, longa: .9, entra: [.25, 1, .5, 1], sai: [.5, 0, .75, 0], gsapEntra: 'power2.out', distancia: 16, escalonar: .06, scrub: .6 },
  'cinetico-vibrante': { curta: .2, media: .5, longa: .9, entra: [.34, 1.56, .64, 1], sai: [.5, 0, .75, 0], gsapEntra: 'back.out(1.6)', distancia: 40, escalonar: .05, scrub: .5 },
  'imersivo-3d': { curta: .25, media: .7, longa: 1.2, entra: [.22, 1, .36, 1], sai: [.64, 0, .78, 0], gsapEntra: 'power3.out', distancia: 16, escalonar: .06, scrub: 1.2 },
  'brutalista-grafico': { curta: .15, media: .4, longa: .8, entra: [.7, 0, .2, 1], sai: [.7, 0, .84, 0], gsapEntra: 'expo.inOut', distancia: 60, escalonar: .03, scrub: .3 },
}
