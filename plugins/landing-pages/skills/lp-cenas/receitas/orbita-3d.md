# Receita: câmera gira em volta de objeto 3D (protótipo)

Seção presa; a câmera dá a volta num objeto 3D (no protótipo, um caminhão montado com caixas e cilindros)
enquanto legendas trocam. Referência de nível profissional: lodisna.com (three.js + modelo .glb + GSAP).
**Status: protótipo** — funciona, falta modelo 3D bonito e versão leve no celular. Para veículo, a receita
`camera-vira.md` foi mais longe (enquadramento por tela, estrada andando, rodas, saída).

## Peças
- `three` + `@react-three/fiber`. O componente vem em `lazy(() => import('./Cena3D'))`, com `Suspense`.
- Progresso do scroll num objeto mutável (`{ atual: 0 }`), atualizado no `onUpdate` do ScrollTrigger e lido
  no `useFrame` da câmera (sem re-render do React).
- Legendas no DOM por cima do canvas, trocadas pela timeline (autoAlpha/y).

## Núcleo
```tsx
function Camera({ progresso }: { progresso: { atual: number } }) {
  const alvo = useRef(new THREE.Vector3(0.5, 1.4, 0))
  const { camera, size } = useThree()
  useEffect(() => { // no computador, empurra a imagem para a direita (texto livre à esquerda)
    const cam = camera as THREE.PerspectiveCamera
    if (size.width >= 1024) cam.setViewOffset(size.width, size.height, -size.width * 0.2, 0, size.width, size.height)
    else cam.clearViewOffset()
  }, [camera, size])
  useFrame(() => {
    const p = progresso.atual
    const angulo = THREE.MathUtils.lerp(0.6, 2.45, p) // atrás-lado → lateral → frente (frente = +x)
    const raio = THREE.MathUtils.lerp(14, 11, p), altura = THREE.MathUtils.lerp(4.2, 2.4, p)
    camera.position.lerp(new THREE.Vector3(-Math.cos(angulo) * raio, altura, Math.sin(angulo) * raio), 0.08)
    camera.lookAt(alvo.current)
  })
  return null
}
```
ScrollTrigger: `pin: true`, `end: '+=2200'`, `scrub: 0.6`, `onUpdate: st => progresso.atual = st.progress`.
Depois de criar: `ScrollTrigger.sort(); ScrollTrigger.refresh()` (a cena chega depois das outras).
Movimento reduzido: `progresso.atual = 0.5` e sem pin.

## Para virar produção
1. Modelo 3D de verdade: `.glb` com licença CC0 ou comprado (nunca o de outro site), carregado com
   `useGLTF` e comprimido (Draco/meshopt); alvo < 2 MB.
2. Celular: imagem estática do modelo ou `dpr={1}` e sem sombras.
3. Iluminação: faróis com `pointLight` (o `spotLight` precisa do alvo adicionado à cena).
