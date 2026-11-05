# Estilos de site

Sete estilos prontos (quatro sóbrios e três ousados, DEV-34) para começar uma direção de arte sem partir do zero. Cada um define **fontes, cores,
grade, ritmo de movimento e cenas que combinam**. O estilo é o esqueleto; o cliente dá a carne: a paleta
sai das fotos dele (LP-07, `lp-paleta`), os textos da voz dele (`lp-textos`) e a cena conta algo do negócio.

| Estilo | Arquivo | Para quem | Sensação |
|---|---|---|---|
| Luxo editorial | `luxo-editorial.md` | salão, estética, moda, joalheria, arquitetura de interiores, restaurante autoral | revista de moda: foto grande, serifa dramática, calma |
| Tecnológico escuro | `tecnologico-escuro.md` | software, energia solar, automação, oficina premium, clínica de imagem, academia de alto padrão | painel preciso: fundo escuro, números, luz pontual |
| Claro e orgânico | `claro-organico.md` | spa, clínica natural, padaria, café, pet, escola infantil, produtos naturais | luz do dia: claro, arcos, devagar |
| Editorial sério | `editorial-serio.md` | transportadora, indústria, contabilidade, advocacia, engenharia, construtora, agro | relatório anual bem feito: sóbrio, fios finos, ficha técnica |
| Cinético vibrante | `cinetico-vibrante.md` | restaurante, bar, academia, dança, eventos, moda jovem, salão ousado | abertura de festival: cor chapada, tipografia que se mexe, Lottie/Rive |
| Imersivo 3D | `imersivo-3d.md` | transportadora, concessionária, oficina, indústria, energia solar, produto físico | apresentação de produto: objeto real em 3D guiado pelo scroll |
| Brutalista gráfico | `brutalista-grafico.md` | barbearia, tatuagem, estúdio criativo, streetwear, música, cervejaria | cartaz de rua: tipo gigante, contraste duro, cursor que interage |

## Como usar
1. Na `lp-direcao-de-arte`, escolha **3 estilos diferentes** que caibam no negócio (a tabela acima é ponto de
   partida, não regra). As 3 direções do cliente nascem deles e diferem em estrutura, não só em cor.
2. De cada estilo, use o **ritmo** como está (tokens abaixo) e escolha da lista dele as cenas que o roteiro pede (outras técnicas podem entrar nas demais seções).
3. Ajuste fontes (pode trocar por outra do mesmo papel no `lp-tipografia/catalogo.md`) e cores (sempre do
   cliente, seguindo a estrutura de papéis do estilo). Registre os desvios no `direcao.md`.
4. Um site usa **um estilo só**. Misturar dois (ex.: serifa de luxo + painel escuro) é o caminho mais rápido
   para a cara de IA.

## Ritmo: o mesmo em todo o site
"Ritmo" = 3 durações, 2 curvas e 1 distância de entrada, usadas em **tudo** (Motion no site, GSAP nas cenas).
Nada de número solto no código: cada animação puxa destes tokens. Formato padrão no site (`src/ritmo.ts`):

```ts
// Valores do estilo escolhido (exemplo: editorial sério)
export const ritmo = {
  curta: 0.25,   // botão, menu, troca de estado
  media: 0.6,    // entrada de bloco, troca de foto
  longa: 0.9,    // abertura, título grande
  entra: [0.25, 1, 0.5, 1] as const,   // curva de entrada (Motion: ease)
  sai: [0.5, 0, 0.75, 0] as const,     // curva de saída
  gsapEntra: 'power2.out',             // mesma curva no GSAP
  distancia: 16,  // px que um bloco sobe ao entrar
  escalonar: 0.06, // atraso entre itens de uma lista
  scrub: 0.6,     // atraso do scrub nas cenas presas (s)
}
```
E em CSS (`--ritmo-curta`, `--ritmo-media`, `--ritmo-entra: cubic-bezier(...)`) para os estados de botão e link.

Regras que valem para os quatro:
- Preferir `transform` e `opacity` (como em `lp-cenas`). Desenho de traço SVG é a exceção do estúdio,
  medida e restrita à cena. Entrada de bloco: no máximo `distancia` px e opacidade.
- Uma entrada por seção, não por elemento; listas escalonadas com `escalonar`, no máximo 6 itens animados.
- Movimento reduzido: durações viram 0 e nada começa escondido.
- Movimento (DEV-42): cenas grandes só com fato do negócio, quantas o projeto pedir, e padrão discreto no resto, com os tokens do ritmo.
- Continua proibido o que a `lp-direcao-de-arte` lista (efeito de biblioteca sem adaptação, brilho girando...);
  faixa infinita e contador só se a direção pedir e restilizados.

## Página de exemplo
Cada estilo só fica "aprovado" quando tiver uma página de exemplo vista pelo Neemias (plano D3). Formato: um
cliente fictício do público do estilo, abertura + 1 cena-assinatura + 1 seção de serviços + rodapé, celular e
computador, gravada com `lp-referencias/scripts/gravar-rolagem.mjs`. Status de cada um no fim do arquivo dele.

Os quatro exemplos locais foram implementados em `pilotos/estilos/site/`, no repositório DevConductor.
Para abrir: `node pilotos/estilos/servir.mjs` → http://127.0.0.1:5192/.
São estudos fictícios, com desvios e licenças em `pilotos/estilos/README.md`; aprovação visual pendente.

O gerador [gerar-exemplos.mjs](gerar-exemplos.mjs) cria uma nova pasta de exemplos sem sobrescrever a
anterior: `node gerar-exemplos.mjs <pasta-nova>`. Fornecer os assets licenciados em `../assets/`:
`mar.jpg`, `bodoni.woff2`, `familjen.woff2`, `favicon.svg`. O gerador não baixa mídia nem instala dependências.
Os tokens dos quatro estilos estão em [ritmos.mjs](ritmos.mjs), reutilizáveis no `src/ritmo.ts` do cliente.
Nos exemplos, a duração curta governa os controles e o percurso SVG acompanha diretamente a rolagem;
as demais durações ficam disponíveis para a construção React/Motion/GSAP.
