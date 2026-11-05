import type { CSSProperties } from 'react'
import imagens from '../data/imagens.json'
import type { NomeFoto } from '../data/conteudo'

type Props = {
  nome: NomeFoto
  alt: string
  sizes: string
  className?: string
  style?: CSSProperties
  prioridade?: boolean
  [dado: `data-${string}`]: string | boolean | undefined
}

export const urlFoto = (nome: NomeFoto, largura = 1600) => {
  const m = imagens[nome]
  const l = [...m.larguras].reverse().find((x) => x <= largura) ?? m.larguras[0]
  return `/img/${nome}-${l}.webp`
}

export function Foto({ nome, alt, sizes, className, style, prioridade, ...resto }: Props) {
  const m = imagens[nome]
  return (
    <img
      {...resto}
      src={urlFoto(nome, 960)}
      srcSet={m.larguras.map((l) => `/img/${nome}-${l}.webp ${l}w`).join(', ')}
      sizes={sizes}
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
