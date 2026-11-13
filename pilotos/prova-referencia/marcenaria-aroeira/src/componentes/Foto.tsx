import type { ImgHTMLAttributes, Ref } from 'react'
import imagens from '../data/imagens.json'

type Nome = keyof typeof imagens

export default function Foto({ nome, alt, sizes = '100vw', ref, ...resto }: {
  nome: Nome
  alt: string
  sizes?: string
  ref?: Ref<HTMLImageElement>
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'alt' | 'sizes'>) {
  const info = imagens[nome]
  const maior = info.larguras[info.larguras.length - 1]
  return (
    <img
      ref={ref}
      src={`/img/${nome}-${maior}.webp`}
      srcSet={info.larguras.map((l) => `/img/${nome}-${l}.webp ${l}w`).join(', ')}
      sizes={sizes}
      width={info.w}
      height={info.h}
      alt={alt}
      decoding="async"
      {...resto}
    />
  )
}
