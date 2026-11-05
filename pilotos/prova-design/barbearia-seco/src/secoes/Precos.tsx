import { useRef } from 'react'
import { gsap, useGSAP } from '../movimento'
import { ritmo } from '../ritmo'
import { precos } from '../data/conteudo'

const GIROS = 9
const LETRAS = 'ABCDEFGHIJKLNOPRSTUVZ'
const DIGITOS = '0123456789'

// Fita de cada caractere: o final fica em cima (é o que aparece parado/reduzido); embaixo vêm os giros.
function fita(final: string, semente: number) {
  if (final === ' ') return [' ']
  const fonte = /\d/.test(final) ? DIGITOS : LETRAS
  const giros = Array.from({ length: GIROS }, (_, k) => fonte[(semente * 7 + k * 5 + 3) % fonte.length])
  return [final, ...giros]
}

// Janela de cada caractere: larga o bastante para M/W (os giros passam por letras de várias larguras).
const largura = (ch: string) => (ch === ' ' ? '0.32em' : /[MW]/.test(ch) ? '0.9em' : '0.7em')

function Placar({ texto, linha }: { texto: string; linha: number }) {
  return (
    <span className="whitespace-nowrap">
      <span className="sr-only">{texto.toLowerCase()}</span>
      <span aria-hidden="true">
        {[...texto].map((ch, i) => (
          <span key={i} className="placar-celula" style={{ width: largura(ch) }}>
            <span className="placar-fita" data-fita={fita(ch, linha * 13 + i).length > 1 ? '' : undefined}>
              {fita(ch, linha * 13 + i).map((g, k) => (
                <span key={k}>{g}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * Preços — placar (família Dados e prova) em grade visível de fios grossos: cada caractere gira numa fita
 * vertical (só transform) e para no valor, como placar de rodoviária. Passar o mouse numa linha gira de novo.
 * Movimento reduzido: valores parados.
 */
export function Precos() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const linhas = gsap.utils.toArray<HTMLElement>('[data-linha]')
        const girar = (linha: HTMLElement, atraso = 0, duracao = 1.1) => {
          const fitas = linha.querySelectorAll<HTMLElement>('[data-fita]')
          return gsap.fromTo(
            fitas,
            { yPercent: (_i, el: HTMLElement) => -100 * ((el.children.length - 1) / el.children.length) },
            { yPercent: 0, duration: duracao, ease: ritmo.entra, stagger: ritmo.escalonar, delay: atraso, overwrite: true },
          )
        }
        // Começa mostrando o último giro (antes de entrar na tela)
        linhas.forEach((l) => gsap.set(l.querySelectorAll<HTMLElement>('[data-fita]'), { yPercent: (_i, el: HTMLElement) => -100 * ((el.children.length - 1) / el.children.length) }))
        linhas.forEach((l, i) => {
          gsap.timeline({ scrollTrigger: { trigger: l, start: 'top 88%', once: true } }).add(girar(l, i * 0.05))
        })
        const sobre = (e: Event) => girar(e.currentTarget as HTMLElement, 0, ritmo.longa)
        const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches
        if (mouse) linhas.forEach((l) => l.addEventListener('pointerenter', sobre))
        return () => linhas.forEach((l) => l.removeEventListener('pointerenter', sobre))
      })
    },
    { scope: raiz },
  )

  return (
    <section ref={raiz} id="precos" aria-labelledby="titulo-precos" className="relative bg-papel px-[var(--margem)] pb-[clamp(72px,9vw,140px)] pt-[clamp(96px,11vw,170px)] text-tinta">
      <div className="grid items-end gap-6 md:grid-cols-[1.3fr_1fr]">
        <h2 id="titulo-precos" className="titulo m-0 text-[clamp(76px,11.5vw,190px)]" style={{ fontWeight: 900 }}>
          {precos.titulo[0]}
          <br />
          {precos.titulo[1]}
        </h2>
        <p className="m-0 max-w-[36ch] pb-2 text-[18px] max-md:text-[16px]">{precos.texto}</p>
      </div>

      <table className="precos-tabela mt-10 w-full border-collapse border-[3px] border-tinta md:mt-14">
        <thead>
          <tr className="bg-tinta text-papel">
            {precos.colunas.map((c, i) => (
              <th key={c} scope="col" className={`px-4 py-3 text-left text-[15px] font-bold max-md:px-2 ${i > 0 ? 'border-l-[3px] border-papel' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {precos.linhas.map((l, i) => (
            <tr key={l.servico} data-linha className="border-t-[3px] border-tinta">
              <th scope="row" className={`px-4 py-4 text-left align-middle font-normal max-md:px-2 ${l.destaque ? 'bg-grito' : ''}`}>
                <span className="titulo block text-[clamp(24px,7vw,30px)] md:text-[clamp(30px,3.9vw,64px)]" style={{ fontWeight: 800, lineHeight: 1.02 }}>{l.servico}</span>
              </th>
              <td className="w-[22%] border-l-[3px] border-tinta px-4 py-4 align-middle text-[clamp(14px,4.1vw,17px)] font-bold md:text-[clamp(17px,2vw,32px)] tabular-nums max-md:w-[24%] max-md:px-2">
                <Placar texto={l.tempo} linha={i} />
              </td>
              <td className="w-[26%] border-l-[3px] border-tinta px-4 py-4 align-middle text-[clamp(14px,4.1vw,17px)] font-bold md:text-[clamp(17px,2vw,32px)] max-md:w-[34%] max-md:px-2">
                <Placar texto={l.preco} linha={i + 7} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-0 mt-4 text-[15px] font-semibold text-tinta/70">{precos.nota}</p>
    </section>
  )
}
