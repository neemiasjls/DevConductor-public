import { useRef, type CSSProperties } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../movimento'
import { consultas, cores, ritmo } from '../ritmo'
import { Foto } from '../componentes/Foto'
import { navalha } from '../data/conteudo'

type Linha = { texto: string; y: number }
type Desenho = { vb: [number, number]; tamanho: number; linhas: Linha[] }

// Palavra-máscara: uma linha no computador, duas no celular (mesma cena, palco ajustado).
const DESENHOS: Record<'computador' | 'celular', Desenho> = {
  computador: { vb: [1600, 900], tamanho: 600, linhas: [{ texto: navalha.palavra.toUpperCase(), y: 663 }] },
  celular: {
    vb: [400, 760],
    tamanho: 282,
    linhas: [
      { texto: navalha.palavraCelular[0].toUpperCase(), y: 366 },
      { texto: navalha.palavraCelular[1].toUpperCase(), y: 600 },
    ],
  },
}
const FONTE = '"Imbue Variable"'

/**
 * Acha o ponto de zoom: o pixel mais "fundo" dentro das letras (maior min(corrida horizontal, vertical)),
 * desenhando a palavra num canvas igual ao SVG. Devolve a origem em px do SVG e a escala que faz a haste
 * cobrir a tela inteira.
 */
function medirZoom(svg: SVGSVGElement, d: Desenho) {
  const red = 0.25
  const [vw, vh] = d.vb
  const w = Math.round(vw * red), h = Math.round(vh * red)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.scale(red, red)
  ctx.font = `900 ${d.tamanho}px ${FONTE}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#000'
  for (const l of d.linhas) ctx.fillText(l.texto, vw / 2, l.y)
  const px = ctx.getImageData(0, 0, w, h).data
  const cheio = (x: number, y: number) => px[(y * w + x) * 4 + 3] > 128
  const esq = new Int32Array(w * h), dir = new Int32Array(w * h), cima = new Int32Array(w * h), baixo = new Int32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) esq[y * w + x] = cheio(x, y) ? (x ? esq[y * w + x - 1] : 0) + 1 : 0
    for (let x = w - 1; x >= 0; x--) dir[y * w + x] = cheio(x, y) ? (x < w - 1 ? dir[y * w + x + 1] : 0) + 1 : 0
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) cima[y * w + x] = cheio(x, y) ? (y ? cima[(y - 1) * w + x] : 0) + 1 : 0
    for (let y = h - 1; y >= 0; y--) baixo[y * w + x] = cheio(x, y) ? (y < h - 1 ? baixo[(y + 1) * w + x] : 0) + 1 : 0
  }
  let melhor = { x: vw / 2, y: vh / 2, e: 1, d: 1, c: 1, b: 1, nota: -1 }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (!esq[i]) continue
    const nota = Math.min(Math.min(esq[i], dir[i]), Math.min(cima[i], baixo[i]) * 0.6)
    if (nota > melhor.nota) melhor = { x: x / red, y: y / red, e: esq[i] / red, d: dir[i] / red, c: cima[i] / red, b: baixo[i] / red, nota }
  }
  // viewBox → px do elemento (preserveAspectRatio xMidYMid meet)
  const caixa = svg.getBoundingClientRect()
  const largura = svg.clientWidth || caixa.width, altura = svg.clientHeight || caixa.height
  const k = Math.min(largura / vw, altura / vh)
  const ox = (largura - vw * k) / 2, oy = (altura - vh * k) / 2
  const x0 = ox + melhor.x * k, y0 = oy + melhor.y * k
  const escala = 1.08 * Math.max(x0 / (melhor.e * k), (largura - x0) / (melhor.d * k), y0 / (melhor.c * k), (altura - y0) / (melhor.b * k))
  return { origem: `${x0.toFixed(1)}px ${y0.toFixed(1)}px`, escala: Math.min(Math.max(escala, 4), 140) }
}

function Mascara({ tipo }: { tipo: 'computador' | 'celular' }) {
  const d = DESENHOS[tipo]
  const id = `mascara-navalha-${tipo}`
  const [vw, vh] = d.vb
  return (
    <svg
      data-mascara={tipo}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full overflow-visible ${tipo === 'computador' ? 'max-md:hidden' : 'md:hidden'}`}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-vw * 4} y={-vh * 4} width={vw * 9} height={vh * 9}>
          <rect x={-vw * 4} y={-vh * 4} width={vw * 9} height={vh * 9} fill="#fff" />
          {d.linhas.map((l) => (
            <text key={l.texto} x={vw / 2} y={l.y} textAnchor="middle" fontFamily={FONTE} fontWeight={900} fontSize={d.tamanho} fill="#000">
              {l.texto}
            </text>
          ))}
        </mask>
      </defs>
      <rect x={-vw * 4} y={-vh * 4} width={vw * 9} height={vh * 9} fill={cores.tinta} mask={`url(#${id})`} />
    </svg>
  )
}

/**
 * Navalha — máscara (família Imagem), cena presa: a foto aparece por dentro da palavra NAVALHA; a máscara
 * cresce por transform até a foto ocupar a tela; no fim a foto escurece e vira o fundo da seção seguinte.
 * Movimento reduzido: máscara já aberta (foto inteira) e texto visível.
 */
export function Navalha() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add({ computador: consultas.computador, celular: consultas.celular }, (ctx) => {
        const tipo = ctx.conditions!.computador ? 'computador' : 'celular'
        const svg = raiz.current!.querySelector<SVGSVGElement>(`[data-mascara="${tipo}"]`)!
        let m = medirZoom(svg, DESENHOS[tipo])
        const remedir = () => { m = medirZoom(svg, DESENHOS[tipo]) }
        ScrollTrigger.addEventListener('refreshInit', remedir)

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            // Cena presa por position: sticky no invólucro (sem CLS do pin fixo); o GSAP só faz o scrub.
            trigger: raiz.current!.parentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: ritmo.scrub,
            invalidateOnRefresh: true,
          },
        })
        tl.set(svg, { transformOrigin: () => m.origem }, 0)
          .fromTo(svg, { scale: 1 }, { scale: () => m.escala, ease: 'power4.in', duration: 0.6 }, 0.06)
          .fromTo('[data-foto-navalha]', { scale: 1.3 }, { scale: 1, duration: 0.66 }, 0)
          .to(svg, { opacity: 0, duration: 0.05 }, 0.61)
          .from('[data-navalha-texto]', { y: ritmo.distancia * 1.5, opacity: 0, duration: 0.1, ease: 'power2.out' }, 0.63)
          .from('[data-navalha-texto] > *', { y: ritmo.distancia / 2, opacity: 0, stagger: 0.03, duration: 0.1, ease: 'power2.out' }, 0.68)
          .fromTo('[data-escurece]', { opacity: 0 }, { opacity: 0.78, duration: 0.14 }, 0.86)

        return () => ScrollTrigger.removeEventListener('refreshInit', remedir)
      })
    },
    { scope: raiz },
  )

  return (
    <div className="cena-presa" style={{ '--pin-c': '180svh', '--pin-m': '130svh' } as CSSProperties}>
    <section ref={raiz} id="navalha" aria-labelledby="titulo-navalha" className="relative h-[100svh] min-h-[560px] overflow-hidden bg-tinta">
      <div data-foto-navalha className="absolute inset-0">
        <Foto nome="navalha" alt={navalha.alt} sizes="100vw" className="h-full w-full object-cover [object-position:40%_35%] max-md:[object-position:32%_30%]" />
      </div>
      <div data-escurece className="absolute inset-0 bg-tinta opacity-0" />
      <Mascara tipo="computador" />
      <Mascara tipo="celular" />

      <p data-rotulo-navalha className="absolute left-[var(--margem)] top-[var(--margem)] m-0 bg-grito px-2 py-1 text-[15px] font-bold text-tinta">
        Serviço da casa
      </p>

      <div data-navalha-texto className="absolute bottom-[var(--margem)] left-[var(--margem)] z-10 max-md:bottom-[84px] max-w-[min(560px,calc(100vw-2*var(--margem)))] border-[3px] border-papel bg-tinta p-6 max-md:right-[var(--margem)] max-md:p-5">
        <h2 id="titulo-navalha" className="titulo m-0 text-[clamp(44px,6vw,92px)]" style={{ fontWeight: 800 }}>
          {navalha.titulo}
        </h2>
        <p className="mb-0 mt-4 text-[18px] text-papel/90 max-md:text-[16px]">{navalha.texto}</p>
        <p className="mb-0 mt-3 text-[16px] font-bold text-grito">{navalha.detalhe}</p>
      </div>
    </section>
    </div>
  )
}
