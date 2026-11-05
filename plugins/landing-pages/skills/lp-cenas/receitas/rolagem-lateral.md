# Três atos em rolagem lateral

**Família:** transição de seção. **Uso:** narrativa curta de três momentos ligados; nunca esconder navegação,
formulário ou informação obrigatória no movimento. Estudo `lateral`, URL `/?estudo=lateral`.
Código no [modelo do estúdio](../../../../estudio-design/skills/estudio-movimento/modelo/src/main.jsx).

```js
gsap.to(trilho, { x: () => -(trilho.scrollWidth - palco.clientWidth), ease: 'none',
  scrollTrigger: { trigger: palco, start: 'top top',
    end: () => '+=' + palco.clientWidth * 2,
    pin: true, scrub: .45, invalidateOnRefresh: true }
})
```

Desktop: palco com overflow hidden, trilho de 300% e três atos de 1/3 dessa largura.
Celular (DEV-34): a mesma esteira lateral, com cartões de ~74vw e pin mais curto (testado no salão fictício de
29/10/2026). Medir a altura da seção no `refreshInit` (ex.: variável `--trilho`), senão as cenas de baixo saem
do lugar. GSAP matchMedia limpa o pin ao redimensionar.
Reduzido e pausa: trilho em `display:block; position:relative; width:100%`, atos de 100%,
palco com overflow visível. Leitura vertical completa sem depender de JavaScript.
Se houver links dentro dos atos, conferir foco visível e rolagem ao navegar por teclado.

**Peso:** sem asset e sem dependência adicional. Exemplo usa geometria abstrata original.
**Vídeos locais:** `pilotos/estudios/vitrine/lateral.webm` e `lateral-celular.webm`.
**Licença:** código MIT; GSAP segue sua própria licença. Aprovação estética do usuário pendente.
