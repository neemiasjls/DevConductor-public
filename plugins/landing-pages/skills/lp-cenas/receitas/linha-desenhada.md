# Linha desenhada pela leitura

**Família:** linhas e mapas. **Uso:** ligar até três marcos; não inventar mapa ou dado geográfico.
Estudo `linha`, URL `/?estudo=linha`.
Código no [modelo do estúdio](../../../../estudio-design/skills/estudio-movimento/modelo/src/main.jsx).

```js
const tamanho = linha.getTotalLength()
gsap.fromTo(linha, { strokeDasharray: tamanho, strokeDashoffset: tamanho }, {
  strokeDashoffset: 0, ease: 'none', scrollTrigger: {
    trigger: palco, start: 'top top', end: '+=1200', pin: true, scrub: .45
  }
})
```

SVG com viewBox responsivo, descrição acessível e um traço base discreto por baixo. Legendas sempre
visíveis fora do SVG. StrokeDashoffset é a exceção SVG à regra transform/opacity, sem alterar layout.
Celular: sem pin, iniciar em top 75% e concluir em bottom 25%. No reduzido e na pausa, o caminho aparece
inteiro. Criar dentro de gsap.matchMedia com escopo e revert no React.

**Peso:** um SVG inline; sem assets externos.
**Vídeos locais:** `pilotos/estudios/vitrine/linha.webm` e `linha-celular.webm`.
**Licença:** código e geometria próprios MIT. GSAP tem licença própria. Aprovação estética pendente.
