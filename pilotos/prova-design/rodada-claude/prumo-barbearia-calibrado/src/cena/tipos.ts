// Estado mutável compartilhado entre a linha do tempo (DOM) e o canvas: nada passa pelo React a cada quadro.
export type Ponto3D = {
  id: string
  ancora: readonly [number, number, number]
  ponto: HTMLElement | null // ponto que acompanha a âncora projetada
  linha: SVGLineElement | null // fio do ponto até a caixa de texto
  caixa: HTMLElement | null
}

export type EstadoCena = {
  p: number // progresso da cena presa (0 → 1)
  fim: number // progresso em que a próxima seção começa a cobrir a cena
  poster: '' | 'abertura' | 'tres-quartos' // render estático para os pôsteres
  pausado: boolean // giro automático pausado pela pessoa
  pontos: Ponto3D[]
  marca: HTMLElement | null // marca ativa da régua (segue a altura da legenda atual)
  legendaAtiva: string // id da legenda cuja altura a régua marca
  invalidar: () => void
}
