import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export { gsap, ScrollTrigger, useGSAP }

export const limitar = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const faixa = (a: number, b: number, x: number) => limitar((x - a) / (b - a))
