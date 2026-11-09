import { Component } from 'react'
import type { ReactNode } from 'react'

// Erro no módulo 3D, no GLB ou no HDRI: some com a cena e devolve o pôster (o pai decide o substituto).
export default class Falha extends Component<{ children: ReactNode; aoFalhar: () => void }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  componentDidCatch() { this.props.aoFalhar() }
  render() { return this.state.falhou ? null : this.props.children }
}
