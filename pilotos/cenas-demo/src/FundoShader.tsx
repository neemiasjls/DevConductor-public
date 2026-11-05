import { MeshGradient } from '@paper-design/shaders-react'

// Versão fixa no package.json (0.0.81): a biblioteca avisa que muda sem aviso nas versões 0.0.x.
// Pausa sozinha fora da tela e com a aba escondida.
export default function FundoShader() {
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <MeshGradient
      colors={['#1d3b2a', '#3f6b45', '#f2b33d', '#fbe3a1']}
      distortion={0.8}
      swirl={0.5}
      speed={parado ? 0 : 0.25}
      maxPixelCount={1920 * 1080}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
