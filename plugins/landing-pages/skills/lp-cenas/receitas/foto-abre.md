# Fotografia ocupa a janela

**Família:** profundidade. **Uso:** abrir espaço para uma foto real importante para a história.
**Demonstração:** estudo `foto`, URL `/?estudo=foto`.
Código no [modelo do estúdio](../../../../estudio-design/skills/estudio-movimento/modelo/src/main.jsx).

```js
const tl = gsap.timeline({ scrollTrigger: {
  trigger: palco, start: 'top top', end: '+=1200', scrub: .45, pin: true
} })
tl.from('[data-janela]', { scaleX: .48, scaleY: .7, ease: 'none' }, 0)
  .from('[data-foto]', { scale: 1.32, ease: 'none' }, 0)
```

Janela com `overflow:hidden`, imagem com `object-fit:cover`, dimensões e alt. O recorte faz parte da cena,
não muda a largura do layout. Manter crédito legível dentro da foto; adaptar raio ao padrão do cliente.
Só criar no bloco com movimento de `gsap.matchMedia()`. No celular: a mesma cena com pin curto (DEV-34) e janela com 70svh;
no reduzido/pausa a fotografia aparece inteira na janela final. Se o texto do crédito não puder acompanhar
a transformação, colocá-lo fora da janela no site de produção.

**Peso:** foto de exemplo 409 KB; não pré-carregar imagens de cenas abaixo da dobra em site real.
**Vídeos locais:** `pilotos/estudios/vitrine/foto.webm` e `foto-celular.webm`.
**Licença:** código MIT; exemplo Tom Beck / Unsplash (crédito/licença no README do estúdio).
Trocar por foto autorizada e registrar em assets.md. Aprovação estética do usuário pendente.

**Lição (29/10/2026, transportadora fictícia):** se a janela cresce com `scaleX` e `scaleY` diferentes, a foto
deforma. Aplicar na foto a escala inversa (`z/sx`, `z/sy`) para ela só ser revelada, sem esticar.
