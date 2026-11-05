import React from 'react'

const textos = ['Observar', 'Compor', 'Encontrar']
export function CenaExtra({ tipo }) {
  if (tipo === 'mascara') return <div className="extra-copy"><div className="recorte"><h2 data-anim>O espaço</h2></div><div className="recorte"><h2 data-anim>entre as palavras.</h2></div></div>
  if (tipo === 'espiral') return <svg className="extra-svg" viewBox="0 0 600 500" role="img" aria-label="Uma leitura circular"><defs><path id="caminho-texto" d="M110 250a190 190 0 1 1 380 0a190 190 0 1 1 -380 0"/></defs><text data-anim fontSize="34" fill="currentColor"><textPath href="#caminho-texto" startOffset="0%">O gesto encontra o espaço. O espaço encontra o gesto.</textPath></text><circle cx="300" cy="250" r="10"/></svg>
  if (tipo === 'dobradura') return <div className="extra-copy perspectiva">{['Uma ideia.', 'Outro ângulo.', 'Um encontro.'].map(t => <h2 data-anim key={t}>{t}</h2>)}</div>
  if (tipo === 'mapa') return <div className="extra-dados"><svg viewBox="0 0 600 450" className="extra-svg" role="img" aria-label="Cinco regiões abstratas, exemplo sem cobertura comercial">{['M180 70 L310 40 340 155 220 180Z','M310 40 L450 105 430 220 340 155Z','M180 70 L220 180 170 290 70 220Z','M220 180 L340 155 430 220 345 335 170 290Z','M170 290 L345 335 280 425 195 390Z'].map((d,i) => <path key={d} data-anim data-regiao={i} className="regiao" d={d}/>)}</svg><p>Mapa abstrato · demonstração</p></div>
  if (tipo === 'rota') return <svg className="extra-svg" viewBox="0 0 700 400" role="img" aria-label="Marcador acompanha um caminho entre três pontos"><path className="traco-base" d="M70 300 C160 300 180 80 340 100 S520 330 630 100"/><path data-rota data-anim d="M70 300 C160 300 180 80 340 100 S520 330 630 100"/><circle data-ponto data-anim cx="70" cy="300" r="13"/></svg>
  if (tipo === 'icones') return <div className="icones-extra">{['M20 55 L50 25 80 55 M30 48V85H70V48','M25 30H75V80H25Z M38 45H62 M38 60H62','M20 55L42 77 82 27'].map((d,i) => <figure key={d}><svg viewBox="0 0 100 110" role="img" aria-label={textos[i]}><path data-anim data-traco d={d}/></svg><figcaption>{textos[i]}</figcaption></figure>)}</div>
  if (tipo === 'cronologia') return <div className="cronologia-extra"><div data-anim className="eixo-tempo"/>{textos.map((t,i) => <article key={t} data-anim><span>Etapa {i+1}</span><h2>{t}</h2></article>)}</div>
  if (tipo === 'barras') return <div className="extra-dados"><svg className="extra-svg" viewBox="0 0 600 400" role="img" aria-label="Gráfico demonstrativo: 35, 70, 50 e 90 unidades">{[35,70,50,90].map((v,i) => <g key={i}><rect data-anim x={65+i*130} y={340-v*3} width="75" height={v*3} rx="9"/><text x={103+i*130} y="380" textAnchor="middle" fontSize="22">{v}</text></g>)}</svg><p>Valores fictícios para demonstração</p></div>
  if (tipo === 'area') return <div className="extra-dados"><svg className="extra-svg" viewBox="0 0 600 400" role="img" aria-label="Curva demonstrativa, sem resultado comercial"><defs><clipPath id="janela-grafico"><rect data-anim data-janela-grafico x="0" y="0" width="600" height="400"/></clipPath></defs><g clipPath="url(#janela-grafico)"><path className="area-grafico" d="M40 310C130 310 145 160 230 190S370 270 420 125S500 170 560 55V350H40Z"/><path d="M40 310C130 310 145 160 230 190S370 270 420 125S500 170 560 55"/></g></svg><p>Dados demonstrativos</p></div>
  if (tipo === 'pilha') return <div className="pilha-extra">{textos.map((t,i) => <article data-anim key={t} className={`plano-extra tom-${i}`}><h2>{t}.</h2><p>Um capítulo do mesmo movimento.</p></article>)}</div>
  if (tipo === 'ponte') return <div className="ponte-extra"><h2>O próximo<br/>ponto de vista.</h2><div data-anim className="moldura-ponte" aria-hidden="true"/></div>
  if (tipo === 'camadas' || tipo === 'foco') return <div className="camadas-extra" aria-label="Composição abstrata em três planos">{[0,1,2].map(i => <div key={i} data-anim className={`camada camada-${i}`}><span>{tipo === 'foco' ? ['Contexto','Relação','Detalhe'][i] : textos[i]}</span></div>)}</div>
  if (tipo === 'prisma') return <div className="perspectiva prisma-area"><div data-anim className="prisma" aria-label="Prisma geométrico abstrato"><div className="face frente"/><div className="face lado"/><div className="face tampa"/></div><p>Geometria abstrata · CSS 3D</p></div>
  if (tipo === 'orbitas') return <svg className="extra-svg" viewBox="0 0 600 500" role="img" aria-label="Três órbitas em torno de um centro">{[0,1,2].map(i => <g data-anim key={i}><ellipse cx="300" cy="250" rx={130+i*40} ry={55+i*25} transform={`rotate(${i*60} 300 250)`}/><circle cx={430+i*40} cy="250" r="8"/></g>)}<circle cx="300" cy="250" r="15"/></svg>
  if (tipo === 'divisao') return <div className="divisao-extra"><h2>O espaço<br/>se abre.</h2>{['Antes','Depois'].map((t,i) => <div data-anim className={`metade metade-${i}`} key={t}>{t}</div>)}</div>
  if (tipo === 'grade') return <div className="grade-extra">{['Um','conjunto','em','movimento'].map((t,i) => <article data-anim key={t} className={`tom-${i%3}`}><h2>{t}</h2></article>)}</div>
  if (tipo === 'circulo') return <div className="circulo-extra"><div data-anim className="disco"/><h2>Um novo<br/>campo de visão.</h2></div>
  if (tipo === 'particulas') return <svg className="extra-svg" viewBox="0 0 600 500" role="img" aria-label="Pontos formam uma composição circular abstrata">{Array.from({length:36},(_,i) => <circle data-anim data-particula key={i} cx={300+Math.cos(i/36*Math.PI*2)*145} cy={250+Math.sin(i/36*Math.PI*2)*145} r={i%3===0?9:5}/>)}</svg>
  return null
}

export function animarExtra(id, gsap, st, raiz) {
  const alvos = raiz.querySelectorAll('[data-anim]')
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: st })
  if (id === 'mascara') tl.from(alvos, { yPercent: 110, stagger: .18 })
  if (id === 'espiral') tl.fromTo(alvos, { attr: { transform: 'rotate(0 300 250)' } }, { attr: { transform: 'rotate(170 300 250)' } })
  if (id === 'dobradura') tl.from(alvos, { rotationX: -85, y: 60, opacity: .2, stagger: .16, transformOrigin: '50% 100%' })
  if (id === 'mapa') tl.from(alvos, { opacity: .18, scale: .86, stagger: .13, transformOrigin: '50% 50%' })
  if (id === 'rota') {
    const linha = raiz.querySelector('[data-rota]'), ponto = raiz.querySelector('[data-ponto]')
    const total = linha.getTotalLength(), estado = { p: 0 }
    tl.fromTo(linha, { strokeDasharray: total, strokeDashoffset: total }, { strokeDashoffset: 0 }, 0)
      .to(estado, { p: 1, onUpdate: () => { const p = linha.getPointAtLength(estado.p * total); gsap.set(ponto, { attr: { cx: p.x, cy: p.y } }) } }, 0)
  }
  if (id === 'icones') alvos.forEach((el,i) => { const total = el.getTotalLength(); tl.fromTo(el, { strokeDasharray: total, strokeDashoffset: total }, { strokeDashoffset: 0 }, i*.18) })
  if (id === 'cronologia') tl.from(alvos[0], { scaleY: 0, transformOrigin: 'top' }, 0).from([...alvos].slice(1), { x: 50, opacity: .2, stagger: .2 }, 0)
  if (id === 'barras') tl.from(alvos, { scaleY: .05, transformOrigin: '50% 100%', stagger: .12 })
  if (id === 'area') tl.from(alvos, { scaleX: 0, transformOrigin: '0% 50%' })
  if (id === 'pilha') tl.from(alvos, { yPercent: 95, rotation: i => (i-1)*9, opacity: .2, stagger: .22 })
  if (id === 'ponte') tl.fromTo(alvos, { scale: .28, opacity: 1 }, { scale: 1.8, opacity: 0 })
  if (id === 'camadas') tl.from(alvos, { x: i => (i-1)*160, y: i => 170-i*130, rotation: i => (i-1)*12, stagger: .05 })
  if (id === 'prisma') tl.fromTo(alvos, { rotationX: -20, rotationY: -55, rotationZ: -8 }, { rotationX: 20, rotationY: 45, rotationZ: 8 })
  if (id === 'orbitas') tl.to(alvos, { rotation: i => i%2 ? -150 : 150, transformOrigin: '50% 50%', stagger: .05 })
  if (id === 'foco') tl.from(alvos, { scale: i => 1.8-i*.4, x: i => (i-1)*110, opacity: .35, stagger: .1 })
  if (id === 'divisao') tl.fromTo(alvos, { yPercent: 0, opacity: 1 }, { yPercent: i => i ? 105 : -105, opacity: 1, stagger: .05 })
  if (id === 'grade') tl.from(alvos, { xPercent: i => i%2 ? 100 : -100, y: i => i<2 ? -50 : 50, opacity: .2, stagger: .1 })
  if (id === 'circulo') tl.fromTo(alvos, { scale: .1 }, { scale: 3.5 })
  if (id === 'particulas') tl.from(alvos, { x: i => Math.sin(i*2.7)*240, y: i => Math.cos(i*1.3)*190, opacity: .15, stagger: .012 })
}
