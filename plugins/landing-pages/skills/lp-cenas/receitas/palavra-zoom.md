# Aproximar uma palavra

**Família:** tipografia. **Uso:** transição curta entre uma palavra e o próximo assunto.
Estudo `zoom`, URL `/?estudo=zoom`.
Código no [modelo do estúdio](../../../../estudio-design/skills/estudio-movimento/modelo/src/main.jsx).

```js
gsap.fromTo(palavra, { opacity: 1, scale: 1 }, { scale: desktop ? 9 : 5, opacity: 0,
  ease: 'none', scrollTrigger: { trigger: palco, start: 'top top',
    end: '+=1200', pin: desktop, scrub: .45 }
})
```

Palavra decorativa em posição absoluta, com aria-hidden e pointer-events none; o texto semântico continua
visível por baixo. Container com overflow hidden, escala limitada no celular para reduzir área de pintura.
No CSS base a palavra decorativa tem opacity 0; só GSAP a ativa em modo com movimento. No reduzido/pausa,
fica apenas o texto final. No celular a mesma cena com pin mais curto (DEV-34). Usar matchMedia com escopo e revert.
Para a cor da palavra "virar o fundo" (testado em 29/10/2026): a origem do zoom fica dentro do traço de uma
letra (medir num canvas; no E, entre os braços de cima e do meio) e, no fim, a própria haste se alarga até
cobrir a tela; `opacity: 0` no fim apaga em vez de cobrir, e um círculo crescendo parece forma solta.
Sem `will-change` no texto ampliado: o navegador rasteriza pequeno e a letra borra.

**Peso:** sem imagem/dependência extra; vigiar rasterização da camada ampliada em celulares reais.
**Vídeos locais:** `pilotos/estudios/vitrine/zoom.webm` e `zoom-celular.webm`.
**Licença:** código próprio MIT; GSAP segue sua licença. Aprovação estética pendente.
