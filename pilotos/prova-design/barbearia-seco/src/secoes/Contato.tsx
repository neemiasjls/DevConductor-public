import { useRef } from 'react'
import { gsap, useGSAP } from '../movimento'
import { consultas, ritmo } from '../ritmo'
import { alteracaoFotos, aviso, avisoLongo, contato, creditos, linkWhats, negocio } from '../data/conteudo'

/**
 * Contato — botão magnético amarelo (família Interação): com mouse ele puxa na direção do cursor; ao entrar
 * na tela, o WhatsApp pulsa uma vez (todo aparelho). Rodapé completo com créditos das fotos.
 */
export function Contato() {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const botao = raiz.current!.querySelector<HTMLElement>('[data-magnetico]')!
      const rotulo = raiz.current!.querySelector<HTMLElement>('[data-rotulo]')!
      const anel = raiz.current!.querySelector<HTMLElement>('[data-anel]')!
      const area = raiz.current!.querySelector<HTMLElement>('[data-area-magnetica]')!
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.timeline({ scrollTrigger: { trigger: botao, start: 'top 80%', once: true } })
          .to(botao, { scale: 1.06, duration: ritmo.curta, ease: 'power2.out', yoyo: true, repeat: 1 })
          .fromTo(anel, { scale: 1, opacity: 1 }, { scale: 1.32, opacity: 0, duration: ritmo.longa, ease: 'expo.out' }, 0)
      })

      mm.add(consultas.mouse, () => {
        const opcoes = { duration: ritmo.media, ease: 'power3.out' }
        const bx = gsap.quickTo(botao, 'x', opcoes), by = gsap.quickTo(botao, 'y', opcoes)
        const rx = gsap.quickTo(rotulo, 'x', opcoes), ry = gsap.quickTo(rotulo, 'y', opcoes)
        const mover = (e: PointerEvent) => {
          const r = botao.getBoundingClientRect()
          const cx = r.left + r.width / 2 - (gsap.getProperty(botao, 'x') as number)
          const cy = r.top + r.height / 2 - (gsap.getProperty(botao, 'y') as number)
          const dx = e.clientX - cx, dy = e.clientY - cy
          bx(dx * 0.28); by(dy * 0.28); rx(dx * 0.1); ry(dy * 0.1)
        }
        const sair = () => { bx(0); by(0); rx(0); ry(0) }
        area.addEventListener('pointermove', mover)
        area.addEventListener('pointerleave', sair)
        return () => {
          area.removeEventListener('pointermove', mover)
          area.removeEventListener('pointerleave', sair)
        }
      })
    },
    { scope: raiz },
  )

  return (
    <section ref={raiz} id="contato" aria-labelledby="titulo-contato" className="relative overflow-x-clip bg-tinta text-papel">
      <div className="grid items-center gap-10 px-[var(--margem)] pb-[clamp(64px,8vw,120px)] pt-[clamp(80px,10vw,150px)] md:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 id="titulo-contato" className="titulo m-0 text-[clamp(72px,10.5vw,176px)]" style={{ fontWeight: 900 }}>
            {contato.titulo[0]}
            <br />
            {contato.titulo[1]}
          </h2>
          <p className="mb-0 mt-6 max-w-[34ch] text-[18px] text-papel/85 max-md:text-[16px]">{contato.texto}</p>
        </div>

        <div data-area-magnetica className="flex justify-center p-[clamp(8px,4vw,64px)] max-md:p-0">
          <a
            data-magnetico
            href={linkWhats(contato.mensagem)}
            className="relative block w-full max-w-[520px] border-[3px] border-papel bg-grito px-7 pb-6 pt-7 text-tinta no-underline"
          >
            <span data-anel aria-hidden="true" className="pointer-events-none absolute inset-[-3px] border-[4px] border-grito opacity-0" />
            <span data-rotulo className="block">
              <span className="titulo block text-[clamp(72px,8.4vw,132px)]" style={{ fontWeight: 900, lineHeight: 0.8 }}>
                {contato.botao[0]}
                <br />
                {contato.botao[1]}
              </span>
              <span className="mt-5 flex items-center justify-between gap-4 border-t-[3px] border-tinta pt-3 text-[15px] font-bold">
                <span>WhatsApp {negocio.telefoneVisivel}</span>
                <span className="text-right text-[13px] font-semibold">{contato.nota}</span>
              </span>
            </span>
          </a>
        </div>
      </div>

      <footer className="border-t-[3px] border-papel">
        <div className="grid md:grid-cols-4">
          <div className="border-papel px-[var(--margem)] py-6 max-md:border-b-[3px] md:border-r-[3px]">
            <h3 className="m-0 mb-3 text-[15px] font-bold text-grito">Endereço</h3>
            <p className="m-0 text-[16px]">{negocio.endereco[0]}<br />{negocio.endereco[1]}</p>
            <p className="m-0 mt-2 text-[15px] text-papel/60">Endereço fictício, sem mapa.</p>
          </div>
          <div className="border-papel px-[var(--margem)] py-6 max-md:border-b-[3px] md:border-r-[3px]">
            <h3 className="m-0 mb-3 text-[15px] font-bold text-grito">Horário</h3>
            <dl className="m-0 text-[16px]">
              {negocio.horarios.map(([d, h]) => (
                <div key={d} className="flex justify-between gap-3">
                  <dt>{d}</dt>
                  <dd className="m-0 font-semibold">{h}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="border-papel px-[var(--margem)] py-6 max-md:border-b-[3px] md:border-r-[3px]">
            <h3 className="m-0 mb-3 text-[15px] font-bold text-grito">Contato</h3>
            <p className="m-0 text-[16px]">
              <a href={linkWhats(contato.mensagem)} className="text-papel underline decoration-[2px] underline-offset-4 hover:text-grito">WhatsApp {negocio.telefoneVisivel}</a>
              <br />
              Telefone {negocio.telefoneVisivel}
              <br />
              Instagram {negocio.instagram}
            </p>
            <p className="m-0 mt-2 text-[15px] text-papel/60">Número e perfil fictícios.</p>
          </div>
          <div className="px-[var(--margem)] py-6">
            <h3 className="m-0 mb-3 text-[15px] font-bold text-grito">Fotos</h3>
            <ul className="m-0 list-none p-0 text-[15px] leading-snug text-papel/80">
              {creditos.map((c) => (
                <li key={c.autor} className="mb-2">
                  {c.autor}, <a href={c.licencaUrl} className="text-papel underline underline-offset-2" rel="license noopener">{c.licenca}</a>, Wikimedia Commons:{' '}
                  {c.paginas.map(([t, u], i) => (
                    <span key={u}>
                      <a href={u} className="text-papel/80 underline underline-offset-2 hover:text-grito" rel="noopener">{t}</a>
                      {i < c.paginas.length - 1 ? '; ' : '.'}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
            <p className="m-0 text-[15px] text-papel/60">{alteracaoFotos}</p>
          </div>
        </div>

        <p aria-hidden="true" className="titulo rodape-marca m-0 overflow-hidden whitespace-nowrap border-t-[3px] border-papel text-center text-[25vw] text-papel" style={{ fontWeight: 100, lineHeight: 0.86 }}>
          {negocio.nome}
        </p>
        <p className="m-0 flex flex-wrap justify-between gap-2 bg-papel px-[var(--margem)] py-3 text-[15px] font-semibold text-tinta">
          <span>{aviso}</span>
          <span>{avisoLongo}</span>
        </p>
      </footer>
    </section>
  )
}
