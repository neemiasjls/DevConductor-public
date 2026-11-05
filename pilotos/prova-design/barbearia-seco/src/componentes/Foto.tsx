import type { CSSProperties } from 'react'
import imagens from '../data/imagens.json'

type Nome = keyof typeof imagens

type Props = {
  nome: Nome
  alt: string
  sizes: string
  className?: string
  style?: CSSProperties
  prioridade?: boolean
  ariaHidden?: boolean
}

/** Foto WebP em 3 larguras (gerada por midias.py), com tamanho declarado para não pular o layout. */
export function Foto({ nome, alt, sizes, className, style, prioridade, ariaHidden }: Props) {
  const info = imagens[nome]
  const maior = info.larguras[info.larguras.length - 1]
  return (
    <img
      src={`/img/${nome}-${maior >= 960 ? 960 : maior}.webp`}
      srcSet={info.larguras.map((l) => `/img/${nome}-${l}.webp ${l}w`).join(', ')}
      sizes={sizes}
      width={info.w}
      height={info.h}
      alt={ariaHidden ? '' : alt}
      aria-hidden={ariaHidden || undefined}
      loading={prioridade ? 'eager' : 'lazy'}
      fetchPriority={prioridade ? 'high' : undefined}
      decoding="async"
      draggable={false}
      className={className}
      style={style}
    />
  )
}

export type { Nome }
