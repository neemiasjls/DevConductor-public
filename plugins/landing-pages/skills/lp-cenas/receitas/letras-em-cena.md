# Letras encontram seu lugar

**Família:** tipografia. **Uso:** frase curta com sentido para o negócio, fora do título principal.
**Demonstração:** estudo `letras` do estúdio, URL `/?estudo=letras`.

Código completo e executável no [modelo do estúdio](../../../../estudio-design/skills/estudio-movimento/modelo/src/main.jsx).
Separar os caracteres visuais em `[data-letra]` com `aria-hidden`; o contêiner recebe a frase inteira em `aria-label`.

```js
gsap.from('[data-letra]', {
  yPercent: 85, rotation: 6, opacity: 0.25, stagger: 0.045, ease: 'none',
  scrollTrigger: { trigger: palco, start: 'top top', end: '+=1200', scrub: .45, pin: true }
})
```

**Lição (29/10/2026, barbearia fictícia):** `gsap.from` com `stagger` e `invalidateOnRefresh` desenhava só a
primeira letra no estado inicial (as outras apareciam montadas e depois pulavam). Fixar o início com `gsap.set` e
usar um `fromTo` por letra na timeline; e trocar o `pin` por palco `sticky` (CLS, ver `SKILL.md`).

Criar só no bloco sem movimento reduzido de `gsap.matchMedia()`, com escopo e `revert()` no React.
Celular: sem pin; `start: 'top 75%'`, `end: 'bottom 25%'`. Não dividir texto longo em centenas de elementos.
Reduzido/pausa: frase inteira na posição final. Testar também navegação por teclado e leitor de tela.

**Peso:** sem dependência além de GSAP; conjunto dos seis estudos + React: ~116 KB gzip.
**Vídeos locais:** `pilotos/estudios/vitrine/letras.webm` e `letras-celular.webm`, gerados pelo estúdio.
**Licença:** código próprio MIT; GSAP segue sua licença própria. Aprovação estética do usuário pendente.
