import React, { useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { estudos } from './estudos'
import { CenaExtra, animarExtra } from './CenasExtras'
import './style.css'
import './familias.css'
import './estatico.css'

gsap.registerPlugin(ScrollTrigger)
const id = new URLSearchParams(location.search).get('estudo') || 'letras'
const estudo = estudos.find((e) => e.id === id)

function Cena({ tipo }) {
  if (!['letras', 'foto', 'lateral', 'linha', 'cortina', 'zoom'].includes(tipo)) return <CenaExtra tipo={tipo}/>
  if (tipo === 'letras') return <div className="letras" aria-label="O movimento faz sentido.">{['O movimento', 'faz sentido.'].map((linha, i) => <div key={linha} aria-hidden="true">{Array.from(linha).map((letra, j) => <span data-letra key={j} style={{ '--ordem': i + j }}>{letra === ' ' ? '\u00a0' : letra}</span>)}</div>)}</div>
  if (tipo === 'foto') return <figure className="janela" data-janela><img data-foto src="/assets/mar.jpg" alt="Ondas do mar vistas de cima, fotografadas por Tom Beck" width="1600" height="1067"/><figcaption>Tom Beck / Unsplash</figcaption></figure>
  if (tipo === 'lateral') return <div className="trilho" data-trilho>{['Observar.', 'Experimentar.', 'Encontrar.'].map((s, i) => <article className={`ato ato-${i}`} key={s} data-ato><span className="forma" aria-hidden="true"/><h2>{s}</h2><p>{['Dê tempo ao primeiro olhar.', 'Um novo ângulo muda a leitura.', 'O movimento chega a um lugar.'][i]}</p></article>)}</div>
  if (tipo === 'linha') return <div className="percurso"><svg viewBox="0 0 800 360" role="img" aria-label="Percurso ligando ideia, gesto e encontro"><path className="traco-base" d="M60 280 C200 280 140 80 380 80 S560 280 740 160"/><path data-linha d="M60 280 C200 280 140 80 380 80 S560 280 740 160"/><circle cx="60" cy="280" r="8"/><circle cx="380" cy="80" r="8"/><circle cx="740" cy="160" r="8"/></svg><div className="marcos">{['Ideia', 'Gesto', 'Encontro'].map(s => <span key={s}>{s}</span>)}</div></div>
  if (tipo === 'cortina') return <div className="revelacao"><h2>Um novo<br/>horizonte.</h2><div data-cortina="esquerda" className="cortina esquerda" aria-hidden="true"/><div data-cortina="direita" className="cortina direita" aria-hidden="true"/></div>
  return <div className="zoom"><p data-zoom aria-hidden="true">Perto.</p><h2>O detalhe<br/>muda tudo.</h2></div>
}

function App() {
  const raiz = useRef(null)
  const [pausado, pausar] = useState(false)
  useLayoutEffect(() => {
    if (!estudo) return
    const mm = gsap.matchMedia()
    mm.add({ reduzido: '(prefers-reduced-motion: reduce)', desktop: '(min-width: 800px)', pequeno: '(max-width: 799px)' }, ({ conditions: c }) => {
      document.documentElement.dataset.estudoPronto = estudo.id
      if (c.reduzido || pausado) return
      const palco = raiz.current.querySelector('[data-palco]')
      const st = { trigger: palco, start: 'top top', end: '+=1200', scrub: 0.45, pin: c.desktop, invalidateOnRefresh: true }
      if (!c.desktop) { st.start = 'top 75%'; st.end = 'bottom 25%' }
      if (estudo.id === 'letras') gsap.from('[data-letra]', { yPercent: 85, rotation: 6, opacity: 0.25, stagger: 0.045, ease: 'none', scrollTrigger: st })
      if (estudo.id === 'foto') {
        const tl = gsap.timeline({ scrollTrigger: st })
        tl.from('[data-janela]', { scaleX: 0.48, scaleY: 0.7, ease: 'none' }, 0).from('[data-foto]', { scale: 1.32, ease: 'none' }, 0)
      }
      if (estudo.id === 'lateral' && c.desktop) gsap.to('[data-trilho]', { x: () => -(raiz.current.querySelector('[data-trilho]').scrollWidth - palco.clientWidth), ease: 'none', scrollTrigger: { ...st, end: () => '+=' + palco.clientWidth * 2 } })
      if (estudo.id === 'linha') { const linha = raiz.current.querySelector('[data-linha]'); const tamanho = linha.getTotalLength(); gsap.fromTo(linha, { strokeDasharray: tamanho, strokeDashoffset: tamanho }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: st }) }
      if (estudo.id === 'cortina') {
        const tl = gsap.timeline({ scrollTrigger: st })
        tl.fromTo('[data-cortina="esquerda"]', { xPercent: 0, opacity: 1 }, { xPercent: -100, opacity: 1, ease: 'none' }, 0)
          .fromTo('[data-cortina="direita"]', { xPercent: 0, opacity: 1 }, { xPercent: 100, opacity: 1, ease: 'none' }, 0)
      }
      if (estudo.id === 'zoom') gsap.fromTo('[data-zoom]', { opacity: 1, scale: 1 }, { scale: c.desktop ? 9 : 5, opacity: 0, ease: 'none', scrollTrigger: st })
      if (!['letras', 'foto', 'lateral', 'linha', 'cortina', 'zoom'].includes(estudo.id)) animarExtra(estudo.id, gsap, st, raiz.current)
    }, raiz)
    return () => { mm.revert(); delete document.documentElement.dataset.estudoPronto }
  }, [pausado])
  if (!estudo) return <main><h1>Estudo não encontrado</h1><a href="?estudo=letras">Abrir os estudos</a></main>
  return <div ref={raiz} data-estudo={estudo.id} data-pausado={pausado}>
    <header><a href="/">Estúdio de movimento</a><nav aria-label="Estudos"><label>Estudo<select value={id} onChange={e => { location.search = '?estudo=' + e.target.value }}>{estudos.map(e => <option key={e.id} value={e.id}>{e.familia} — {e.nome}</option>)}</select></label></nav></header>
    <main><section className="abertura"><h1>{estudo.titulo}</h1><div className="contexto"><p>{estudo.descricao}</p><p>Role para experimentar.</p><button type="button" onClick={() => pausar(!pausado)} aria-pressed={pausado}>{pausado ? 'Ativar movimento' : 'Pausar movimento'}</button></div></section>
    <section className={`palco palco-${estudo.id}`} data-palco aria-label={estudo.nome}><Cena tipo={estudo.id}/></section>
    <section className="fim" data-fim><h2>O efeito termina.<br/>A leitura continua.</h2><p>Estudo demonstrativo. Escolha o movimento pela história que ele ajuda a contar.</p><a href={`?estudo=${estudos[(estudos.indexOf(estudo) + 1) % estudos.length].id}`}>Ver o próximo estudo</a></section></main>
    <footer>DevAgents · Experimentos locais de movimento</footer>
  </div>
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
