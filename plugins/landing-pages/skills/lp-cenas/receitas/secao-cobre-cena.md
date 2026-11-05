# Receita: seção seguinte cobre a cena presa

Saída para qualquer cena presa: no último trecho, a seção seguinte **sobe por cima** da cena (como um
cartão deslizando), com cantos arredondados e sombra; a cena escurece de leve e o objeto principal desce
na tela até sumir sob a borda. Pedido do usuário no piloto da transportadora: "o caminhão vai se aproximando
dessa div até sumir"; o corte reto entre seções foi chamado de "transição muito crua".
**Status:** aprovada.

## Como funciona
A seção presa tem `end: '+=' + 5 × altura` (pin com espaço). A seção seguinte ganha margem negativa de uma
tela e fica por cima:
```tsx
<section className="relative z-10 rounded-t-[28px] lg:rounded-t-[48px] shadow-[0_-24px_60px_rgba(0,0,0,0.55)] motion-safe:-mt-[100svh]">
```
Conta: o espaçador do pin mede 6 telas (a seção + 5 de rolagem); com `-100svh`, a seção seguinte começa a
aparecer quando falta uma tela de rolagem para o fim do pin e chega ao topo exatamente no fim. Com 5 telas de pin, ela entra em
**p = 0,8**. Regra geral: entra em `1 - 1 / telasDoPin`.

## Dentro da cena (de 0,8 a 1)
```ts
const SAIDA = 0.8
const saida = (p: number) => { const t = Math.max(0, (p - SAIDA) / (1 - SAIDA)); return -t * t * 34 }
// no useFrame: grupoDoVeiculo.position.x = saida(p)   → freia e desce na tela (de cima, -x é para baixo)
// a estrada continua andando: a câmera "segue" e o veículo fica para trás
tl.fromTo('[data-escurece]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, SAIDA)
// <div data-escurece class="invisible absolute inset-0 bg-gradient-to-b from-painel/20 to-painel/70" />
```
Tudo o que é legenda/marcador da cena termina antes de 0,8 (o cartão cobre o resto).

## Cuidados
- `motion-safe:`: com movimento reduzido não há pin, e a margem negativa cobriria a cena parada.
- A seção seguinte precisa de `relative z-10` (o pin usa `position: fixed` sem z-index).
- Testar o fim com prints em 0,85 / 0,9 / 0,95: o objeto tem de encostar na borda antes de sumir.
- **A cobertura é da dupla, não da seção.** Se a cena anterior deixar de prender (cortada pelo teste do porquê,
  virou seção de leitura), tirar também a margem negativa da seção seguinte: sem o pin, ela passa a cobrir texto e
  foto da seção de cima (aconteceu no Lúmen em 04/11/2026, quando o fio virou seção discreta).
