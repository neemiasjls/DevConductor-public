import { lazy, Suspense, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { montarCenas } from './cenas'

const FundoShader = lazy(() => import('./FundoShader'))
const FRASE = 'Toda semana, a mesma rota: ovos frescos saindo de Bastos e chegando inteiros a Goiânia.'
const camada = (forca: string, fundo: string, extra: React.CSSProperties = {}) => (
  <div data-camada={forca} style={{ position: 'absolute', left: 0, right: 0, top: '-20%', bottom: '-20%', background: fundo, ...extra }} />
)

export default function App() {
  const raiz = useRef<HTMLDivElement>(null)
  useGSAP(() => montarCenas(raiz.current!), { scope: raiz })

  return (
    <div ref={raiz}>
      <header data-topo style={{ position: 'relative', height: '100vh', display: 'grid', placeItems: 'center', overflow: 'hidden', isolation: 'isolate' }}>
        <div data-fundo-shader aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, background: 'linear-gradient(135deg,#1d3b2a,#3f6b45 45%,#f2b33d 80%,#fbe3a1)' }}>
          <Suspense fallback={null}><FundoShader /></Suspense>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,7vw,96px)', color: '#fff' }}>Cenas demo</h1>
      </header>

      <section style={{ minHeight: '70vh', padding: '15vh 8vw', boxSizing: 'border-box' }}>
        <p data-texto-revelado style={{ fontSize: 'clamp(28px,5vw,64px)', fontWeight: 600, lineHeight: 1.15, maxWidth: '18ch', margin: 0 }}>
          {FRASE.split(' ').map((p, i) => <span key={i} data-palavra>{p} </span>)}
        </p>
      </section>

      <section data-camadas style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#bfe1ef' }}>
        {camada('0.2', 'radial-gradient(circle at 70% 30%, #fff6c9 0 8%, transparent 9%)')}
        {camada('0.5', 'linear-gradient(transparent 55%, #6f8f6a 55%)', { clipPath: 'polygon(0 60%,20% 42%,40% 58%,62% 38%,85% 55%,100% 45%,100% 100%,0 100%)' })}
        {camada('1', 'linear-gradient(transparent 72%, #3b3b3b 72%)')}
        <h2 style={{ position: 'relative', padding: '10vh 8vw', fontSize: 'clamp(28px,5vw,56px)' }}>Camadas com profundidade</h2>
      </section>

      <section data-sequencia style={{ height: '100vh', background: '#000' }}>
        <canvas data-sequencia-tela width={1280} height={720} role="img" aria-label="Sequência de quadros de teste"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </section>

      <footer style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>Fim</footer>
    </div>
  )
}
