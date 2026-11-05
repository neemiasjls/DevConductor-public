# Critério fixo

Na pasta, `node --test inicial.test.mjs` deve passar (1 teste). Na matriz,
`node --test aceitacao.test.mjs` deve falhar nos 4 testes por falta da seção, dos
serviços, do layout e da animação. Na entrega, `npm test` deve passar (5 testes).

Contrato verificável pelo teste estático:

- `index.html` usa `lang="pt-BR"`, liga `styles.css` e contém
  `<section id="servicos" aria-labelledby="titulo-servicos">`,
  `<h2 id="titulo-servicos">Serviços</h2>` e o aviso exato do pedido.
- Exatamente três `<article class="servico">`, cada um com o respectivo nome em
  `h3`, preço e descrição em `p`. Link `<a href="#contato">Ver contato</a>` e
  bloco `id="contato"` com “Contato demonstrativo”. Tudo no HTML, sem depender de JS.
- `.servicos-lista` usa grid com `grid-template-columns: 1fr`; uma regra
  `@media (min-width: 800px)` define `repeat(3, 1fr)`. `.servico` usa
  `animation: entrada 600ms ease-out both`, com `@keyframes entrada`.
- `@media (prefers-reduced-motion: reduce)` aplica `.servico { animation: none; }`.
  Há regra `:focus-visible` com `outline`. Sem URLs externas ou dependências.

Os testes leem o código; não provam renderização, contraste ou fluidez. Revisão fixa:
execute `npm start`, abra http://127.0.0.1:4173 e confira larguras 390 e 1280 px,
zoom 100%, sem rolagem horizontal ou texto cortado. Recarregue em cada modo:
normal (entrada termina em 600 ms) e movimento reduzido (sem animação). Desative JS
e confira todo o conteúdo. Use Tab até “Ver contato” (foco visível) e Enter
(destino correto). Registre resultado/achados e capturas nos dois tamanhos fora
da pasta da tarefa. Encerre o servidor com Ctrl+C.
