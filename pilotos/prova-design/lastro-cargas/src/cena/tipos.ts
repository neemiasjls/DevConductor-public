// Estado mutável compartilhado entre a linha do tempo (DOM) e o canvas: nada passa pelo React a cada quadro.
export type Ponto3D = {
  id: string
  ancora: readonly [number, number, number]
  // Ponto que acompanha a âncora projetada na tela.
  ponto: HTMLElement | null
  // Linha do ponto até a caixa de texto (legenda técnica).
  linha: SVGLineElement | null
  caixa: HTMLElement | null
}

export type EstadoCena = {
  p: number // progresso suavizado da cena presa (0 → 1)
  k: number // escala dos tempos: celular tem pin mais curto, a história cabe antes da saída
  saida: number // progresso em que a seção seguinte começa a cobrir a cena
  poster: boolean // render estático para o pôster (sem respiração)
  posterAbertura: boolean // pôster do primeiro quadro (p = 0, mesmo enquadramento da abertura)
  pontos: Ponto3D[]
}

// Deslocamento do grupo de caixotes na saída (de cima, -x desce na tela).
export const deslocamentoSaida = (e: EstadoCena) => {
  const t = Math.max(0, (e.p - e.saida) / (1 - e.saida))
  return -t * t * 15
}
