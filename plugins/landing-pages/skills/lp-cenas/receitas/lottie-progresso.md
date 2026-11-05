# Receita: Lottie preso ao progresso do scroll

> Testada em 29/10/2026 num salão fictício (trança de autoria própria; `pilotos/prova-design/estudio-coral`).

**Lições do primeiro uso:**
- O pin criado depois que o player carrega insere espaço e empurra a página (pior se a pessoa já rolou).
  Preferir palco `position: sticky` numa seção com altura reservada no CSS (telas do `ritmo.ts`; `auto` no
  reduzido); o ScrollTrigger só lê o progresso (`start: 'top top', end: 'bottom bottom'`), sem `pin`.
- Player leve: `import('lottie-web/build/player/lottie_light')` (só SVG, ~47 KB gzip contra 80–100 KB) com
  `declare module 'lottie-web/build/player/lottie_light'` reexportando os tipos de `lottie-web`.
- Animação própria gerada por script (mechas, traços) é a saída mais limpa de licença; conferir quadros
  renderizados antes de ligar ao scroll. Fatias não lineares da rolagem dão mais quadros à parte principal.

Montagem de produto ou etapas de um serviço: a rolagem escolhe o quadro, inclusive na volta.
O título e a explicação ficam no DOM, sempre legíveis. O player só chega perto da seção.

## Instalar

```sh
npm view lottie-web version
npm view gsap version
npm i --save-exact lottie-web@5.13.0 gsap@3.15.0
```

Versões conferidas no registro do npm (`npm view`) em 29/10/2026; fixar sem `^`.
O exemplo usa `lottie-web`, sem precisar de um segundo player.

## Arquivo e licença

- Buscar na [coleção gratuita do LottieFiles](https://lottiefiles.com/free-animations) ou no
  [IconScout](https://iconscout.com/free-lottie-animations). Gratuito não significa licença irrestrita.
- Abrir a página **da animação escolhida**, conferir autor, licença, uso comercial, alterações,
  atribuição e redistribuição. No LottieFiles, conferir a [Lottie Simple License](https://lottiefiles.com/page/license)
  quando for a licença indicada. Não presumir que ela cobre peças premium ou material externo.
- Guardar URL, autor, data, texto da licença e alterações no inventário de assets do cliente;
  cumprir o crédito exigido. Se não houver licença clara, escolher outra animação.
- Salvar `public/animacoes/processo.json` e seus assets locais. Exportar o **último quadro útil**
  como `public/animacoes/processo-final.svg` (ou PNG); não escolher um quadro vazio da saída.
  Usar vetores simples, sem expressões, fontes externas ou fotos embutidas enormes.

## Componente completo e animação (`LottieProgresso.tsx`)

O `ritmo` é passado pelo site a partir de `src/ritmo.ts`: distância em alturas de tela, por dispositivo.
Não há autoplay, loop ou animação CSS de layout; quem manda é `goToAndStop(frame, true)`.

```tsx
import { useEffect, useRef } from 'react'
import type { AnimationItem } from 'lottie-web'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
type Ritmo = { telasDesktop: number; telasCelular: number }

export default function LottieProgresso({ ritmo }: { ritmo: Ritmo }) {
  const secao = useRef<HTMLElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const player = useRef<HTMLDivElement>(null)
  const poster = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add({ mover: '(prefers-reduced-motion: no-preference)',
      celular: '(max-width: 767px)' }, (ctx) => {
      if (!ctx.conditions!.mover) return // poster já está visível; nenhum pedido do player/JSON
      const raiz = secao.current!, quadro = palco.current!, host = player.current!
      const imagem = poster.current!
      let vivo = true
      let animacao: AnimationItem | undefined
      let gatilho: ScrollTrigger | undefined
      const abortar = new AbortController()
      const falhar = () => {
        imagem.style.opacity = '1'
        host.style.opacity = '0'
        gatilho?.kill(true)
        animacao?.destroy()
        animacao = undefined
      }
      const observar = new IntersectionObserver(async ([entrada]) => {
        if (!entrada.isIntersecting) return
        observar.disconnect()
        try {
          const [modulo, resposta] = await Promise.all([
            import('lottie-web'),
            fetch('/animacoes/processo.json', { signal: abortar.signal }),
          ])
          if (!resposta.ok) throw new Error('Animação indisponível')
          const dados = await resposta.json()
          if (!vivo) return
          const item = modulo.default.loadAnimation({ container: host, renderer: 'svg',
            autoplay: false, loop: false, animationData: dados,
            rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } })
          animacao = item
          item.addEventListener('data_failed', falhar)
          item.addEventListener('DOMLoaded', () => {
            if (!vivo) return
            const desenhar = (p: number) => item.goToAndStop(
              Math.round(p * Math.max(0, item.totalFrames - 1)), true)
            // Callback assíncrono: guardar e limpar o trigger explicitamente.
            gatilho = ScrollTrigger.create({ trigger: raiz, pin: quadro,
              start: 'top top', end: () => '+=' + window.innerHeight *
                (ctx.conditions!.celular ? ritmo.telasCelular : ritmo.telasDesktop),
              invalidateOnRefresh: true, onUpdate: st => desenhar(st.progress) })
            ScrollTrigger.sort()
            ScrollTrigger.refresh()
            desenhar(gatilho.progress) // restauração de scroll também escolhe o quadro certo
            host.style.opacity = '1'
            imagem.style.opacity = '0'
          })
        } catch {
          if (vivo) falhar()
        }
      }, { rootMargin: '300px' })
      observar.observe(raiz)
      return () => {
        vivo = false
        observar.disconnect()
        abortar.abort()
        gatilho?.kill(true)
        animacao?.destroy()
        host.style.opacity = '0'
        imagem.style.opacity = '1'
      }
    })
    return () => mm.revert()
  }, [ritmo.telasDesktop, ritmo.telasCelular])

  return <section ref={secao} data-lottie-progresso>
    <div ref={palco} className="grid min-h-[100svh] content-center gap-6 px-6 py-12 md:grid-cols-2">
      <div><h2>Do pedido à entrega</h2><p>Descreva aqui o processo real, completo e sem depender dos quadros.</p></div>
      <div className="relative aspect-square w-full max-w-xl self-center" aria-hidden="true">
        <img ref={poster} src="/animacoes/processo-final.svg" alt="" width="800" height="800"
          className="absolute inset-0 h-full w-full object-contain" />
        <div ref={player} className="absolute inset-0" style={{ opacity: 0 }} />
      </div>
    </div>
  </section>
}
```

## Marcação

```tsx
import LottieProgresso from './LottieProgresso'
import { ritmo } from './ritmo' // ritmo.lottie: { telasDesktop, telasCelular }

export function Processo() {
  return <LottieProgresso ritmo={ritmo.lottie} />
}
```

## Celular, reduzido e peso

- Celular: mesma sequência e mesmos quadros, palco em uma coluna, pin mais curto pelo ritmo do estilo.
  Conferir 360–414px e paisagem; se o texto não couber, reduzir densidade antes de prender.
- Reduzido: só SVG/PNG final; sem pin, player, import pesado ou JSON. Mudar a preferência durante a
  sessão destrói a instância e restaura o poster. Falha de rede mantém a mesma imagem.
- Peso aproximado de transferência: player completo ~80–100 KB gzip; JSON vetorial simples ~30–300 KB;
  poster ~10–100 KB. Imagens embutidas podem multiplicar isso. Medir o build e o arquivo escolhido.
- Conferir ida/volta, scroll restaurado, desmontagem em StrictMode e troca de preferência; conteúdo
  informativo fica no DOM. Ilustração explicativa passa no teste do porquê (`lp-cenas`, LP-12) antes de entrar.
