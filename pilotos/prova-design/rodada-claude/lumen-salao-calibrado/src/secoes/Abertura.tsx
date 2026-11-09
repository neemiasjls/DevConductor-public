import { useEffect, useRef, useState } from 'react'
import { abertura, linkWhats, marca, menu } from '../data/conteudo'
import { Foto, urlFoto } from '../componentes/Foto'
import { useMovimento } from '../componentes/useMovimento'
import { ritmo } from '../ritmo'

// Cena 0: reflexo em WebGL sobre a foto. Uma faixa de luz desce pelos comprimentos (≥ 6 s), descansa e volta;
// cursor/toque guiam a luz. Para fora da tela, com a aba escondida, com o botão de pausa e no reduzido.
// O título entra no carregamento por CSS e nunca espera a cena.
const INICIO = -0.25, FIM = 1.25
// Enquadramento da foto, igual para o <img> (object-position) e para a textura do shader: trocar de um para o
// outro (ativação, perda de contexto, preferência) não mexe na foto.
const POSICAO: [number, number] = [0.6, 0.45]
const suave = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2)

export function Abertura() {
  const mover = useMovimento()
  const [pausado, pausar] = useState(false)
  const [estado, definirEstado] = useState<'estatico' | 'vivo'>('estatico')
  const moldura = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const pausadoRef = useRef(false)
  const retomar = useRef<() => void>(() => {})
  pausadoRef.current = pausado

  useEffect(() => {
    if (!mover) { definirEstado('estatico'); return }
    const quadro = moldura.current!, canvas = tela.current!
    let vivo = true, rodando = false, visivel = true, raf = 0
    let ultimo = 0, relogio = 0, luz = INICIO, ponteiro: number | null = null
    let reflexo: Awaited<ReturnType<typeof import('./reflexo').criarReflexo>> | undefined
    const celular = matchMedia('(max-width: 767px)').matches
    const ciclo = ritmo.reflexo.passagem + ritmo.reflexo.descanso

    const pintar = () => { reflexo?.luz(luz); quadro.dataset.luz = luz.toFixed(3) }
    const tick = (agora: number) => {
      const dt = Math.min(0.05, (agora - ultimo) / 1000)
      ultimo = agora
      if (ponteiro !== null) {
        luz += (ponteiro - luz) * ritmo.reflexo.segueCursor
      } else {
        relogio = (relogio + dt) % ciclo
        const u = Math.min(1, relogio / ritmo.reflexo.passagem)
        luz = INICIO + (FIM - INICIO) * suave(u)
      }
      pintar()
      raf = requestAnimationFrame(tick)
    }
    const atualizar = () => {
      const deve = vivo && !!reflexo && visivel && !pausadoRef.current && !document.hidden
      if (deve && !rodando) { rodando = true; ultimo = performance.now(); raf = requestAnimationFrame(tick) }
      if (!deve && rodando) { rodando = false; cancelAnimationFrame(raf) }
      quadro.dataset.rodando = String(rodando)
    }
    retomar.current = atualizar

    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; atualizar() })
    io.observe(quadro)
    document.addEventListener('visibilitychange', atualizar)

    // Cursor e toque guiam a luz para a altura do ponteiro; ao sair, ela volta ao ciclo de onde está.
    const guiar = (e: PointerEvent) => {
      if (pausadoRef.current) return
      const r = quadro.getBoundingClientRect()
      ponteiro = (e.clientY - r.top) / r.height
    }
    const soltar = () => {
      if (ponteiro === null) return
      ponteiro = null
      relogio = Math.max(0, Math.min(1, (luz - INICIO) / (FIM - INICIO))) * ritmo.reflexo.passagem * 0.98
    }
    quadro.addEventListener('pointermove', guiar, { passive: true })
    quadro.addEventListener('pointerdown', guiar, { passive: true })
    quadro.addEventListener('pointerleave', soltar)
    quadro.addEventListener('pointercancel', soltar)

    const falhar = () => {
      if (!vivo) return
      reflexo?.destruir(); reflexo = undefined
      definirEstado('estatico'); atualizar()
    }
    // O reflexo é enfeite: a foto já está na tela. Só sobe o WebGL depois da carga, num momento ocioso, para não
    // disputar a thread principal com a primeira interação (no celular custava ~500 ms de bloqueio).
    const ocioso = () => new Promise<void>((pronto) => {
      const depois = () => ('requestIdleCallback' in window ? requestIdleCallback(() => pronto(), { timeout: 2500 }) : setTimeout(pronto, 1200))
      if (document.readyState === 'complete') depois()
      else addEventListener('load', depois, { once: true })
    })
    ocioso()
      .then(() => { if (!vivo) throw new Error('desmontado'); return import('./reflexo') })
      .then(({ criarReflexo }) => criarReflexo(canvas, urlFoto('abertura', celular ? 960 : 1600), { dprMax: celular ? 1.5 : 2, forca: 0.8, posicao: POSICAO, aoPerder: falhar }))
      .then((r) => {
        if (!vivo) { r.destruir(); return }
        reflexo = r
        pintar()
        definirEstado('vivo')
        atualizar()
      })
      .catch(falhar)

    return () => {
      vivo = false
      cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', atualizar)
      quadro.removeEventListener('pointermove', guiar)
      quadro.removeEventListener('pointerdown', guiar)
      quadro.removeEventListener('pointerleave', soltar)
      quadro.removeEventListener('pointercancel', soltar)
      reflexo?.destruir()
      delete quadro.dataset.luz
      delete quadro.dataset.rodando
      definirEstado('estatico')
    }
  }, [mover])

  useEffect(() => { retomar.current() }, [pausado])

  return (
    <section id="inicio" aria-labelledby="titulo-abertura" className="sobre-escuro relative bg-petroleo text-claro">
      <header className="flex items-center justify-between gap-6 px-[var(--margem)] py-5 md:py-7">
        <a href="#inicio" className="alvo titulo text-[28px] leading-none md:text-[32px]" aria-label={`${marca.completo}, início`}>
          {marca.nome}
        </a>
        <nav aria-label="Seções" className="hidden md:block">
          <ul className="flex gap-8 text-[15px]">
            {menu.map((i) => (
              <li key={i.alvo}><a href={i.alvo} className="alvo link-fino decoration-claro/40">{i.rotulo}</a></li>
            ))}
          </ul>
        </nav>
        <a href="#agendar" className="pilula min-h-[44px] border border-claro/50 px-5 py-2 text-[15px] md:hidden">Agendar</a>
      </header>

      <div className="grid gap-8 px-[var(--margem)] pb-16 md:grid-cols-12 md:gap-x-8 md:pb-[12svh]">
        <div className="order-2 flex flex-col justify-end md:order-1 md:col-span-6 md:pb-[4svh] lg:col-span-5">
          <p className="rotulo mb-5 text-claro/75">{marca.oque} · {marca.cidade.split('/')[0]}</p>
          <h1 id="titulo-abertura" className="titulo text-[clamp(44px,12.4vw,52px)] md:text-[clamp(64px,7.6vw,116px)]">
            {abertura.linhas.map((l) => (
              <span key={l} className="linha-titulo"><span>{l}</span></span>
            ))}
          </h1>
          <p className="mt-6 max-w-[44ch] text-[17px] text-claro/80 md:mt-8 md:text-[18px]">{abertura.texto}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a href={linkWhats()} className="pilula bg-claro text-petroleo hover:bg-luz">{abertura.botao}</a>
            <a href="#fio" className="alvo link-fino text-[16px] decoration-claro/50">{abertura.secundario}</a>
          </div>
        </div>

        <figure className="order-1 m-0 md:order-2 md:col-span-6 lg:col-span-7">
          <div ref={moldura} data-reflexo={estado} data-abertura-foto className="moldura relative h-[52svh] min-h-[320px] touch-pan-y bg-petroleo-2 md:h-[min(82svh,900px)]">
            <Foto nome={abertura.foto.nome} alt={abertura.foto.alt} prioridade sizes="(min-width: 768px) 58vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${POSICAO[0] * 100}% ${POSICAO[1] * 100}%` }} />
            <span aria-hidden="true" className="reflexo-pintado" />
            {mover && (
              <canvas ref={tela} aria-hidden="true" data-reflexo-canvas className="absolute inset-0 h-full w-full transition-opacity duration-700"
                style={{ opacity: estado === 'vivo' ? 1 : 0 }} />
            )}
            {mover && estado === 'vivo' && (
              <button type="button" data-pausa aria-pressed={pausado} onClick={() => pausar((p) => !p)}
                className="pilula absolute bottom-3 left-3 min-h-[44px] bg-petroleo/80 px-4 py-2 text-[14px] text-claro hover:bg-petroleo">
                <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 fill-current">{pausado ? <path d="M2 1l9 5-9 5z" /> : <path d="M2 1h3v10H2zM7 1h3v10H7z" />}</svg>
                {pausado ? abertura.retomar : abertura.pausar}
              </button>
            )}
          </div>
        </figure>
      </div>
    </section>
  )
}
