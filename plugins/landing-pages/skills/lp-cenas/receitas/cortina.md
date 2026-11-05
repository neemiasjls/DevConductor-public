# Cortina em duas superfícies

**Família:** transições. **Uso:** uma mudança de assunto com revelação ampla; não cobrir conteúdo essencial
enquanto se espera o usuário rolar. Estudo `cortina`, URL `/?estudo=cortina`.
Código no [modelo do estúdio](../../../../estudio-design/skills/estudio-movimento/modelo/src/main.jsx).

```js
const tl = gsap.timeline({ scrollTrigger: {
  trigger: palco, start: 'top top', end: '+=1200', pin: true, scrub: .45
} })
tl.fromTo(esquerda, { xPercent: 0, opacity: 1 }, { xPercent: -100, opacity: 1, ease: 'none' }, 0)
  .fromTo(direita, { xPercent: 0, opacity: 1 }, { xPercent: 100, opacity: 1, ease: 'none' }, 0)
```

Cada metade tem 50.2% para não deixar fresta; palco com overflow hidden. Superfícies decorativas com
aria-hidden, opacity 0 no CSS base; GSAP as ativa apenas quando há movimento permitido.
Conteúdo sob a cortina não deve conter controles focáveis encobertos. Celular com a mesma cortina e pin mais curto (DEV-34; testado no salão fictício de
29/10/2026); reduzido/pausa
remove as metades e mantém o conteúdo. Limpar tudo ao sair da cena com matchMedia/revert.

**Peso:** dois elementos decorativos, nenhuma imagem.
**Vídeos locais:** `pilotos/estudios/vitrine/cortina.webm` e `cortina-celular.webm`.
**Licença:** código próprio MIT; GSAP segue sua licença. Aprovação estética pendente.
