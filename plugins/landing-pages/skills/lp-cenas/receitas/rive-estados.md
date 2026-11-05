# Receita: Rive com estados ligados ao scroll e à interação

> Não testada em cliente ainda (criada em 29/10/2026)

Um produto muda de configuração conforme a página avança; aproximar o ponteiro, tocar ou usar o
teclado destaca um detalhe. A explicação completa continua no DOM.

## Instalar

```sh
npm view @rive-app/react-canvas version
npm view gsap version
npm i --save-exact @rive-app/react-canvas@4.38.0 gsap@3.15.0
```

Versões conferidas no registro do npm (`npm view`) em 29/10/2026; fixar sem `^`.

## Preparar o arquivo

O [editor do Rive tem planos pagos](https://rive.app/pricing); conferir as condições de exportação
antes de prometer produção gratuita. O runtime aberto não concede direitos sobre uma animação.
Usar só `.riv` próprio ou com licença clara: conferir autor, uso comercial, edição, distribuição
e atribuição na página do arquivo, inclusive no [Marketplace](https://rive.app/marketplace).
Guardar licença, URL, data e crédito no inventário do cliente. Sem licença explícita, não usar.

Preparar `public/animacoes/produto.riv` com a state machine **Produto**, input numérico **Progresso**
(0–100) e booleano **Destaque**. Ligar Progresso a um blend/estados, e Destaque ao detalhe, sem
loop independente interminável. Esses nomes são contrato do exemplo; adaptar ao arquivo real.
Exportar `public/animacoes/produto-final.png`, quadro legível com a mesma composição.
Referência da API: [useRive e useStateMachineInput](https://rive.app/docs/runtimes/react/parameters-and-return-values).

## Componente completo (`RiveEstados.tsx`)

O shell não importa o runtime. O módulo pesado só monta perto da seção e com movimento permitido.
O botão externo também funciona por teclado; a interação por toque não bloqueia a rolagem.

```tsx
import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

const Player = lazy(() => import('./RivePlayer'))
class Fallback extends Component<{ children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() { return this.state.falhou ? null : this.props.children }
}

export default function RiveEstados() {
  const secao = useRef<HTMLElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const [ativo, ativar] = useState(false)
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { ativar(true); io.disconnect() }
      }, { rootMargin: '300px' })
      io.observe(secao.current!)
      return () => { io.disconnect(); ativar(false) }
    })
    return () => mm.revert()
  }, [])
  return <section ref={secao} data-rive-estados className="px-6 py-16">
    <h2>Veja os detalhes do produto</h2>
    <p>Descreva todas as configurações e o detalhe destacado em texto.</p>
    <button ref={botao} type="button" className="my-4 min-h-11 border px-4 focus-visible:outline-2">
      Destacar detalhe (ponteiro, toque ou teclado)
    </button>
    <div className="relative aspect-square w-full max-w-xl" aria-hidden="true">
      <img src="/animacoes/produto-final.png" alt="" width="800" height="800"
        className="absolute inset-0 h-full w-full object-contain" />
      {ativo && <Fallback><Suspense fallback={null}>
        <Player secao={secao} botao={botao} />
      </Suspense></Fallback>}
    </div>
  </section>
}
```

## Player e animação dentro de `gsap.matchMedia` (`RivePlayer.tsx`)

```tsx
import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
type Props = { secao: RefObject<HTMLElement | null>; botao: RefObject<HTMLButtonElement | null> }

export default function RivePlayer({ secao, botao }: Props) {
  const [falhou, falhar] = useState(false)
  const { rive, RiveComponent } = useRive({ src: '/animacoes/produto.riv',
    stateMachines: 'Produto', autoplay: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => falhar(true) }, { useDevicePixelRatio: false })
  const progresso = useStateMachineInput(rive, 'Produto', 'Progresso')
  const destaque = useStateMachineInput(rive, 'Produto', 'Destaque')

  useEffect(() => {
    if (!rive || !progresso || !destaque || falhou) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const raiz = secao.current!, controle = botao.current!
      let dentro = false, foco = false, tocado = false
      const atualizar = () => { destaque.value = dentro || foco || tocado }
      const entrar = (e: PointerEvent) => { if (e.pointerType === 'mouse') { dentro = true; atualizar() } }
      const sair = () => { dentro = false; atualizar() }
      const focar = () => { foco = controle.matches(':focus-visible'); atualizar() }
      const desfocar = () => { foco = false; atualizar() }
      const clicar = () => { tocado = !tocado; atualizar() }
      const eventos = [
        ['pointerenter', entrar], ['pointerleave', sair], ['focus', focar],
        ['blur', desfocar], ['click', clicar],
      ] as const
      eventos.forEach(([tipo, fn]) => controle.addEventListener(tipo, fn as EventListener))
      const gatilho = ScrollTrigger.create({ trigger: raiz, start: 'top bottom', end: 'bottom top',
        onUpdate: st => { progresso.value = st.progress * 100 } })
      progresso.value = gatilho.progress * 100
      const visivel = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) rive.play('Produto'); else rive.pause('Produto')
      })
      visivel.observe(raiz)
      ScrollTrigger.sort()
      ScrollTrigger.refresh()
      return () => {
        eventos.forEach(([tipo, fn]) => controle.removeEventListener(tipo, fn as EventListener))
        visivel.disconnect()
        gatilho.kill()
        rive.pause('Produto')
        destaque.value = false
      }
    })
    return () => mm.revert()
  }, [rive, progresso, destaque, falhou, secao, botao])

  // Não cobrir o poster até os dois inputs existirem; contrato errado também usa fallback.
  return <div className="absolute inset-0" style={{ opacity: !falhou && progresso && destaque ? 1 : 0 }}>
    <RiveComponent className="h-full w-full" />
  </div>
}
```

O hook gerencia a destruição do runtime ao desmontar. Não chamar `cleanup()` manualmente na mesma
instância. A máquina precisa respeitar o input mesmo ao voltar o scroll; conferir as transições no editor.

## Marcação

```tsx
import RiveEstados from './RiveEstados'

export function Produto() { return <RiveEstados /> }
```

## Celular, reduzido e peso

- Celular: mesma máquina e faixa 0–100, `Fit.Contain`, DPR 1, botão de pelo menos 44px. Toque alterna
  o destaque por `click`; ponteiro e foco também o ligam. Sem `preventDefault`, sem exigir hover.
- Reduzido: poster sempre visível, sem runtime, pin ou estado inicial ocultando conteúdo. Trocar a
  preferência desmonta o player. Rede, WASM ou módulo com falha deixam o poster aparecer.
- Não há pin nem tween de duração nesta receita: scroll vira input diretamente; o desenho de tempos
  da máquina deve seguir o ritmo do estilo. Nenhuma propriedade de layout é animada.
- Peso aproximado: JS ~50–100 KB gzip, WASM ~0,5–1,5 MB transferido e `.riv` ~20–300 KB sem bitmaps grandes.
  Medir também o WASM solicitado em runtime; hospedar a cópia compatível localmente se a política do site exigir.
- Conferir mouse, teclado, toque, ida/volta, pausa fora da tela, erro de arquivo e preferência alterada.
