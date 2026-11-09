import { useCallback, useMemo, useRef, useState } from 'react'
import Foto, { srcFoto } from '../componentes/Foto'
import Geada from '../componentes/Geada'
import type { EstadoGeada } from '../componentes/Geada'
import { porta } from '../data/conteudo'
import { gsap, ScrollTrigger, useGSAP } from '../gsap'
import { consultas, ritmo } from '../ritmo'
import { usePrefere } from '../usos'

// Porta do baú (3D/WebGL): geada sobre a foto da câmara fria descongela em faixa com a rolagem; cursor ou
// toque limpa um círculo. Presa curta (0,8 tela; 0,6 no celular) e depois a seção seguinte cobre a cena.

function temWebGL() {
  try {
    // Sonda descartável: libera o contexto na hora para não ficar um WebGL solto até a coleta.
    const gl = document.createElement('canvas').getContext('webgl')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch { return false }
}

export default function Porta() {
  const cena = useRef<HTMLElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const mover = usePrefere(consultas.mover)
  const celular = usePrefere(consultas.celular)
  const [fotoFalhou, falharFoto] = useState(false)
  const [geadaFalhou, falharGeada] = useState(false)
  const webgl = useMemo(() => typeof window !== 'undefined' && temWebGL(), [])
  const estado = useMemo<EstadoGeada>(() => ({ degelo: 0, mx: 0.5, my: 0.5, limpa: 0 }), [])
  const desenhar = useRef<(() => void) | null>(null)
  const [geadaPronta, marcarPronta] = useState(false)
  const ligar = useCallback((fn: (() => void) | null) => { desenhar.current = fn; marcarPronta(!!fn) }, [])
  const aoFalhar = useCallback(() => falharGeada(true), [])
  const usarGeada = mover && webgl && !fotoFalhou && !geadaFalhou
  const telasDegelo = celular ? ritmo.porta.celular : ritmo.porta.desktop

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(consultas.mover, () => {
      const fim = () => `top+=${window.innerHeight * telasDegelo} top`
      ScrollTrigger.create({
        trigger: cena.current, start: 'top 70%', end: fim, invalidateOnRefresh: true,
        onUpdate: (st) => { estado.degelo = st.progress; desenhar.current?.() },
        onRefresh: (st) => { estado.degelo = st.progress; desenhar.current?.() },
      })
      gsap.fromTo('[data-escurece]', { opacity: 0 }, {
        opacity: 1, ease: 'none',
        scrollTrigger: { trigger: cena.current, start: fim, end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
      })
      gsap.from('[data-porta-texto] > *', {
        opacity: 0, y: ritmo.distancia, duration: ritmo.media, ease: ritmo.entra, stagger: ritmo.escalonar,
        scrollTrigger: { trigger: cena.current, start: 'top 45%' },
      })

      // Cursor (mouse) ou toque limpa um círculo; a geada volta devagar quando solta.
      const alvo = palco.current!
      const limpa = gsap.quickTo(estado, 'limpa', { duration: ritmo.media, ease: ritmo.entra, onUpdate: () => desenhar.current?.() })
      const posicao = (e: PointerEvent) => {
        const r = alvo.getBoundingClientRect()
        estado.mx = (e.clientX - r.left) / r.width
        estado.my = 1 - (e.clientY - r.top) / r.height
      }
      const mexer = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' && e.buttons === 0) return
        posicao(e); limpa(1); desenhar.current?.()
      }
      const tocar = (e: PointerEvent) => { posicao(e); limpa(1) }
      const soltar = () => limpa(0)
      const eventos = [['pointermove', mexer], ['pointerdown', tocar], ['pointerleave', soltar], ['pointerup', soltar], ['pointercancel', soltar]] as const
      eventos.forEach(([t, fn]) => alvo.addEventListener(t, fn as EventListener, { passive: true }))
      return () => {
        eventos.forEach(([t, fn]) => alvo.removeEventListener(t, fn as EventListener))
        limpa.tween.kill()
        estado.limpa = 0
      }
    })
  }, { scope: cena, dependencies: [telasDegelo], revertOnUpdate: true })

  // Textura chegou depois do gatilho: aplica o progresso atual.
  useGSAP(() => {
    if (!geadaPronta) return
    ScrollTrigger.refresh()
  }, { dependencies: [geadaPronta] })

  return (
    <section
      ref={cena}
      id="porta"
      aria-labelledby="porta-titulo"
      className="cena escuro bg-grafite text-gelo"
      style={{ ['--telas' as string]: ritmo.porta.desktop + 1, ['--telas-cel' as string]: ritmo.porta.celular + 1 }}
    >
      <div ref={palco} className="palco min-h-[100svh] touch-pan-y select-none">
        <div className="absolute inset-0 isolate overflow-hidden">
          {fotoFalhou ? (
            <div className="absolute inset-0 bg-aco-escuro" />
          ) : (
            <Foto nome="camara-fria" alt={porta.alt} sizes="100vw" loading="lazy" onError={() => falharFoto(true)}
              className="absolute inset-0 h-full w-full object-cover" />
          )}
          {usarGeada && <Geada src={srcFoto('camara-fria', celular ? 960 : 1600)} estado={estado} ligar={ligar} aoFalhar={aoFalhar} />}
          <div aria-hidden /* taste-skill-ignore: véu neutro sobre a foto */ className="absolute inset-0 bg-[linear-gradient(to_top,oklch(0.18_0.02_245/0.82),oklch(0.18_0.02_245/0.1)_55%,transparent)]" />
          <div data-escurece aria-hidden className="absolute inset-0 bg-grafite opacity-0" />
        </div>
        {/* Fio de topo: a linha do registrador que desceu da abertura. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-destaque" />
        <div className="conteudo relative flex min-h-[100svh] items-end pb-12 pt-24 md:pb-16">
          <div data-porta-texto className="max-w-[560px] rounded-[var(--raio)] bg-grafite/92 p-6 md:p-8">
            <p className="rotulo mb-4 text-aco-claro">{porta.rotulo}</p>
            <h2 id="porta-titulo" className="titulo text-[clamp(1.9rem,7vw,2.4rem)] md:text-[3.1rem]">{porta.titulo}</h2>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-aco-claro">{porta.texto}{usarGeada && geadaPronta && <> {porta.interacao}</>}</p>
            {fotoFalhou && <p className="mt-3 text-[0.875rem] text-gelo">Foto indisponível: {porta.alt}</p>}
            <p className="mt-5 text-[0.8125rem] text-aco-claro">{porta.credito}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
