import { useState } from 'react'
import type { CSSProperties, Ref } from 'react'
import imagens from '../data/imagens.json'
import type { NomeFoto } from '../data/conteudo'

type Props = {
  nome: NomeFoto
  alt: string
  sizes: string
  className?: string
  style?: CSSProperties
  prioridade?: boolean
  ref?: Ref<HTMLImageElement>
  'aria-hidden'?: boolean
  aoFalhar?: () => void
  [dado: `data-${string}`]: string | boolean | undefined
}

export const urlFoto = (nome: NomeFoto, largura = 1600) => {
  const m = imagens[nome]
  const l = [...m.larguras].reverse().find((x) => x <= largura) ?? m.larguras[0]
  return `/img/${nome}-${l}.webp`
}

// Substituto de foto que não carregou: painel petróleo com a faixa de luz da marca e um aviso visível.
// Embutido (data URI) para não depender da rede que acabou de falhar. Centrado: aguenta qualquer recorte "cover".
const SUBSTITUTO = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" preserveAspectRatio="xMidYMid slice">' +
  '<defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset=".42" stop-color="#e9f4f2" stop-opacity="0"/>' +
  '<stop offset=".5" stop-color="#e9f4f2" stop-opacity=".22"/><stop offset=".58" stop-color="#e9f4f2" stop-opacity="0"/></linearGradient></defs>' +
  '<rect width="900" height="1200" fill="#173a3c"/><rect width="900" height="1200" fill="url(#l)"/>' +
  '<text x="450" y="612" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="#e9f4f2">Foto indisponível</text>' +
  '</svg>')

export function Foto({ nome, alt, sizes, className, style, prioridade, ref, aoFalhar, ...resto }: Props) {
  const m = imagens[nome]
  const [falhou, falhar] = useState(false)
  // O mesmo elemento troca de fonte (as animações seguem valendo); o alt continua para leitores de tela.
  return (
    <img
      {...resto}
      ref={ref}
      data-substituto={falhou || undefined}
      onError={falhou ? undefined : () => { falhar(true); aoFalhar?.() }}
      src={falhou ? SUBSTITUTO : urlFoto(nome, 960)}
      srcSet={falhou ? undefined : m.larguras.map((l) => `/img/${nome}-${l}.webp ${l}w`).join(', ')}
      sizes={falhou ? undefined : sizes}
      width={m.w}
      height={m.h}
      alt={alt}
      loading={prioridade ? 'eager' : 'lazy'}
      fetchPriority={prioridade ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
      className={className}
      style={style}
    />
  )
}
