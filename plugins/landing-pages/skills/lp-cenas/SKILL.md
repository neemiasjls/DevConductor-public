---
name: lp-cenas
description: Biblioteca de cenas guiadas pelo scroll para landing pages (GSAP + ScrollTrigger, seção presa, 3D com React Three Fiber). Use na etapa "conceito de movimento" para propor as cenas que o negócio pede e na construção das cenas-assinatura escolhidas. Traz receitas testadas, cuidados que custaram depuração e o teste com Edge invisível.
---

# Cenas-assinatura

A quantidade de **cenas grandes** guiadas pelo scroll sai do projeto, não de uma cota (DEV-42), e, no resto, um **padrão discreto** de movimento
(DEV-42 e LP-12 em `lp-maestro/regras.md`). Cena boa mostra algo real do negócio que o visitante entende sem
legenda (a cadeira da barbearia girando, a porta do baú que abre, a rota do caminhão), não é efeito solto nem
aula ilustrada.

## Teste do porquê (cada efeito, antes de entrar no roteiro e de novo na revisão)
Responder do ponto de vista de **quem visita**, não de quem escreveu o plano. Uma resposta "não" corta o efeito
ou o troca por movimento discreto.
1. Que fato do negócio ele mostra? (porta do baú abre = carga protegida; sem resposta concreta, corta)
2. Alguém que nunca viu o plano descreve a cena em uma frase, sem ler a legenda, em ~3 s?
3. O visitante entende algo **a mais** com o efeito do que sem ele?
4. É a única ideia da tela, sem outro elemento disputando o olhar?
5. Combina com o tom do nicho (LP-11)?
6. Se o movimento parar (reduzido, pausa), o texto e a imagem continuam completos?
7. Vale na segunda visita e no celular?
8. O mesmo truque já apareceu em outra seção?

**Mostrar, não explicar** (retorno de 04/11/2026): objeto ou foto real com um gesto vence diagrama. A cadeira 3D
real e a foto da porta do baú foram aprovadas; o fio desenhado "por dentro" pareceu forçado, e a régua com
números sobre a foto do degradê, confusa. Esquema didático só entra se o visitante precisar dele para decidir, e
mesmo assim com no máximo 4 rótulos visíveis.
Prova (04/11/2026, refazendo as duas cenas criticadas): **calibrar** antes de cortar quando o objeto é real — no
degradê, a foto ficou e a régua de 6 números virou um gesto só (uma linha que sobe como a máquina e acende a foto
por onde passa, 3 marcas); **trocar** quando a cena é aula — o fio desenhado virou seção de leitura com a foto do
serviço de perto e uma frase, sem prender. Medir antes e depois com o `densidade.mjs` da `lp-revisao`.
Segunda rodada (05/11/2026, o resto das telas acima do limite): numa cena presa de dados com marcos, **só o marco
atual mostra o texto** (os outros ficam com hora e título; esconder com opacidade, com o espaço reservado, para não
deslocar nada; no reduzido aparecem todos), e o eixo leva só 4 rótulos. A tela em que a cena entra divide espaço
com a frase da seção anterior: contar as duas juntas. O fechamento (agendar) fica com título, apoio e botão;
telefone, endereço e horários vão para o rodapé. Quando o apoio repete o que a cena seguinte mostra, sai o apoio.

## Etapa "conceito de movimento" (✔ antes da construção)
0. Ler `tecnicas.md` (nesta pasta) e montar o roteiro de movimento: as cenas grandes que o negócio pede (cada uma com a
   resposta à pergunta 1 do teste do porquê), o padrão discreto das seções de leitura, abertura e fechamento.
1. Ler o negócio (plano da coleta) e escolher para cada cena do roteiro a receita que combine com ele (tabela abaixo), de preferência
   da lista "cenas que combinam" do estilo escolhido (`lp-direcao-de-arte/estilos/`). No modo "corre atrás" do
   `lp-maestro`, cada um dos 3 conceitos já traz a sua cena: este passo acontece dentro deles.
2. Usar `estudio-design:estudio-movimento` para criar estudos isolados com o conteúdo real do cliente.
   O plugin entra pela detecção de landing pages; em outros sites usar o marcador `.estudio-design`
   ou rodar `claude plugin install estudio-design@devconductor --scope local`. O modelo tem 25 estudos para adaptar;
   as novas famílias estão no [catálogo D2](receitas/catalogo-d2.md).
3. Rodar os scripts `testar.mjs` e `gravar.mjs` do estúdio e mostrar a vitrine com vídeos de computador
   e celular. Na gravação avulsa, usar `gravar-rolagem.mjs --nome <slug>` para não sobrescrever cenas
   no mesmo host. **Mostrar, não perguntar**. O `testar.mjs` desta skill é específico da receita de rotas.
4. O usuário escolhe 2–3 (DEV-42); a escolha vai para o `plano.md` do cliente.

## Receitas
| Receita | Arquivo | Quando usar | Peso |
|---|---|---|---|
| Veículo percorre a rota | `receitas/rota-veiculo.md` | negócio com trajeto: transporte, entrega, turismo | leve |
| Marcador desce a linha do tempo | `receitas/linha-do-tempo.md` | etapas, processo, história da empresa; versão celular da rota | leve |
| Objeto sai de cena com o scroll | `receitas/sai-de-cena.md` | topo com ilustração (caminhão, produto) | leve |
| Câmera gira em volta de objeto 3D | `receitas/orbita-3d.md` | produto ou veículo que merece ser visto de todos os lados | pesado (three.js ~250 KB) |
| Texto revelado palavra por palavra | `receitas/texto-revelado.md` | frase de impacto, manifesto, promessa | muito leve |
| Camadas com profundidade | `receitas/camadas-profundidade.md` | paisagem ou cena montada em camadas (céu, morros, estrada) | leve |
| Sequência de quadros (estilo Apple) | `receitas/sequencia-quadros.md` | produto girando, caixa abrindo, carga entrando | pesado (imagens, ~1,5 MB/60 quadros) |
| Fundo animado com shader | `receitas/fundo-shader.md` | topo sem ilustração que precisa de vida; marca com cores fortes | médio (WebGL) |
| Câmera vira (lado → de cima) | `receitas/camera-vira.md` | veículo/produto comprido: de lado com palavra gigante, depois de cima com marcadores (rotas, regiões) | pesado (three.js + modelo) |
| Seção seguinte cobre a cena | `receitas/secao-cobre-cena.md` | saída de qualquer cena presa: a próxima seção sobe por cima e o objeto some sob a borda | muito leve |
| Letras encontram seu lugar | `receitas/letras-em-cena.md` | frase curta de impacto, fora do título principal | muito leve |
| Foto ocupa a janela | `receitas/foto-abre.md` | destacar uma fotografia real | foto até 900 KB |
| Rolagem lateral | `receitas/rolagem-lateral.md` | narrativa de três atos; vertical no celular | leve |
| Linha desenhada | `receitas/linha-desenhada.md` | conectar marcos com um traço SVG | muito leve |
| Cortina | `receitas/cortina.md` | revelar uma nova composição entre duas superfícies | muito leve |
| Palavra com zoom | `receitas/palavra-zoom.md` | aproximar uma palavra até o próximo assunto | leve |
| Lottie preso ao progresso | `receitas/lottie-progresso.md` | montagem ou processo vetorial quadro a quadro pelo scroll | médio (player + JSON) |
| Rive com estados | `receitas/rive-estados.md` | ilustração interativa com scroll, hover e toque | médio (runtime + WASM + .riv) |
| Modelo GLB real | `receitas/modelo-3d-real.md` | produto ou veículo realista com HDRI e câmera guiada | pesado (Three + GLB + HDRI) |
| Foto com distorção | `receitas/distorcao-imagem.md` | fotografia real reage ao scroll e à interação por shader | médio/pesado (WebGL + foto) |

Toda receita nova que der certo num cliente entra aqui (etapa 9 do `lp-maestro`).

## Regras de toda cena
- Só `transform` e `opacity`. Nada que mude layout durante o scroll.
- Exceção para linhas SVG: `strokeDashoffset` desenha o traço sem alterar layout.
- Durações, curvas e `scrub` vêm do ritmo do estilo (`src/ritmo.ts`), não de número solto na receita.
- **Celular:** equivalente ao computador (DEV-34): mesma cena com pin mais curto, câmera e tamanho ajustados, 3D com `dpr` limitado; cortar só o que medir travamento.
- **Movimento reduzido** (`prefers-reduced-motion: reduce`): nenhuma cena roda, nada começa escondido,
  nada fica preso. Usar `gsap.matchMedia()` e criar estados iniciais só dentro do bloco "com movimento".
- O título principal nunca depende da cena para aparecer. Texto que o visitante precisa ler não fica preso
  dentro do efeito (palavra por palavra no scrub, letras voando): o efeito vai na imagem ou no objeto, e as
  entradas de texto disparam uma vez (NN/g, scroll animations). Exceção: frase curta de impacto já planejada.
- Pesado (3D, vídeo) vem em arquivo separado (`lazy()`), carregado depois do resto.

## Consultoras desta etapa (oficiais do GSAP; ler só a parte que precisa, na hora)
`<plugin>/skills/<nome>/SKILL.md`. As receitas e regras desta skill vencem se houver conflito.
- `gsap-scrolltrigger`: pin, scrub, start/end, `refresh`, cena nova que não está nas receitas.
- `gsap-react`: `useGSAP`, escopo e limpeza (cena montada e desmontada sem vazar).
- `gsap-timeline`: cena com várias etapas na mesma rolagem.
- `gsap-plugins`: SplitText (texto letra a letra), MotionPath (objeto seguindo uma curva), Flip.
- `gsap-performance`: cena travando no celular. `gsap-core` e `gsap-utils`: dúvidas de API.
- `motion-design`: coreografia, estrutura narrativa e emoção do movimento (pastas `director/` e `patterns/`);
  ajuda a escrever o roteiro de `tecnicas.md`. Landing page é "vista uma vez": vale a faixa dramática dela.
- 3D (CloudAI-X): `threejs-react-three-fiber` (cena em R3F), `threejs-loaders` e `threejs-asset-pipeline`
  (GLB, compressão), `threejs-lighting` (HDRI, sombras), `threejs-shaders` (distorção, partículas, fundos),
  `threejs-performance` (celular).

## Rolagem suave (opcional, Lenis)
Deixa a roda do mouse macia, o que valoriza as cenas presas. Só em site com cena-assinatura; no toque o
Lenis mantém a rolagem nativa do celular. `npm i lenis` e `import 'lenis/dist/lenis.css'` no `main.tsx`.
```ts
import Lenis from 'lenis'

function ligarRolagemSuave() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const lenis = new Lenis({ anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (tempo: number) => lenis.raf(tempo * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => { gsap.ticker.remove(tick); lenis.destroy() }
}
// No useGSAP das cenas: const desligar = ligarRolagemSuave(); … return desligar
```
`anchors: true` faz os links do menu (`#contato`) rolarem macio também.

## Cuidados que custaram depuração
- **`pin` do ScrollTrigger gera CLS** (prova de 29/10/2026: 0,6–1,0 por cena, 4,7–5,6 na página; dois sites
  acharam isso sozinhos). Cena presa = invólucro alto (altura em telas do `ritmo.ts`, `auto` no reduzido) com palco
  `position: sticky; top: 0`; o GSAP só faz o scrub de `top top` a `bottom bottom`. Também evita o pulo quando a
  cena carrega tarde (Lottie, WebGL). `pin` só onde o sticky não serve, medindo o CLS.
- **Faixa com velocidade do scroll:** tween com `repeat: -1` não anda para trás; usar laço no `gsap.ticker` com volta
  ao início e largura medida a cada `refresh`.
- **Classe fora de `@layer` no CSS do Tailwind 4 vence as utilitárias** (ex.: `leading-*` sem efeito em `.titulo`).
- **Tailwind 4 × GSAP:** classes `scale-*`/`rotate-*`/`translate-*` usam propriedades CSS próprias
  (`scale:`), que somam com o `transform` do GSAP. Elemento que o GSAP anima não leva essas classes; estado
  inicial pelo GSAP ou `style={{ transform: '...' }}`.
- **Cena carregada depois** (lazy) acima de outra cena: chamar `ScrollTrigger.sort()` e
  `ScrollTrigger.refresh()` ao montar, senão a de baixo prende no lugar errado.
- **SVG repetido na página** (mesmo desenho 2×): ids de degradê com `useId()`, senão colidem.
- **Navegador embutido com a janela atrás de outra** não roda animação (0 quadros) nem tira print: a cena
  parece quebrada sem estar. Testar com o Edge invisível (`testar.mjs`).
- **Edge headless pela linha de comando** não aceita janela de 390px; para celular usar o script (puppeteer
  com `setViewport`).
- **Cena 3D com `frameloop="demand"`**: o canvas só redesenha quando alguém chama `invalidate()`. Chamar no
  `onUpdate` do ScrollTrigger e quando uma textura termina de carregar (senão aparece em branco).
- **Realismo é o que o usuário mais cobra no 3D**: modelo montado com caixas e fotos coladas em placas foram
  reprovados ("cartoon", "não está em 3D"). Cena 3D de produção = modelo `.glb` real + HDRI (`lp-assets`).

## Teste
`<plugin>/skills/lp-cenas/testar.mjs`: rola a página num Edge invisível (puppeteer-core) e, em cada ponto,
mede posição/opacidade dos elementos marcados com `data-*` e salva print. Copiar para `ferramentas/` do
site e ajustar os seletores. Para 3D, abrir o Edge com `--use-angle=swiftshader --enable-unsafe-swiftshader`.
`<plugin>/skills/lp-cenas/testar-receitas.mjs`: o mesmo teste para as receitas de texto, camadas, sequência,
shader e rolagem suave (usa os mesmos `data-*` das receitas), em computador, celular e movimento reduzido.
