# Plano — Visibilidade no Google com resultado medido (10/11/2026)

> Estado: **proposta com padrão assumido** (entra antes do teste com as 3 empresas). Pedido do Neemias em 10/11: o
> produto não é só o site, é a empresa aparecer mais no Google, com resultado real. Parte do
> [plano de ação](../plano-de-acao.md). Marcas (DEV-48): `[regente]` · `[difícil]` · `[sonnet]`.

## O que o kit já faz (conferido em 10/11)
`lp-seo` cobre: palavras por intenção local (serviço + cidade), H1/H2 e links internos, título, descrição, endereço
oficial da página, prévia de link, dados estruturados, `robots.txt`, `sitemap.xml`, imagens (formato, texto alternativo)
e página pré-renderizada em HTML (`prerender.mjs`), com conferência automática (`auditar-html.mjs`).

## O que falta, por impacto
| # | Falta | Impacto | Esforço | Quem |
|---|---|---|---|---|
| B1 | **Linha de base** antes de publicar: posição de 5–8 buscas ("serviço + Marília") em janela anônima, com data; números do Perfil da Empresa dos 3 meses anteriores; nº de avaliações e nota; contatos do mês informados pelo dono | alto | baixo | `[sonnet]` (modelo) |
| B2 | **Relatório mensal** padrão, 5–7 números: impressões e cliques no Google, posição média das buscas, ações do Perfil (ligações, rotas, site), cliques no WhatsApp, avaliações novas, velocidade real | alto | baixo | `[sonnet]` |
| B3 | **Clique no WhatsApp como conversão** (evento na medição sem cookie) e etiqueta no link do Perfil para separar de onde veio a visita | alto | médio | `[difícil]` |
| B4 | **Roteiro do Perfil da Empresa por ramo**: categoria principal, serviços, fotos, postagens, respostas às avaliações, link do site | alto | baixo | `[regente]` |
| B5 | **Regra de propaganda em saúde** (odontologia): ler a norma oficial do conselho antes de escrever qualquer texto de clínica; até lá, sem antes e depois, sem preço, sem promessa | alto (risco) | baixo | `[regente]` + pesquisa |
| B6 | Dados estruturados para móveis e noivas; auditor passa a conferir página de erro, redirecionamento e HTTPS | médio | baixo | `[sonnet]` |
| B7 | **Velocidade em site animado**: orçamento de LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1 medido na revisão; abertura sem vídeo pesado no primeiro carregamento, fonte com espaço reservado, 3D carregado depois | médio | médio | `[difícil]` |
| B8 | Rotina de avaliações e de guias locais (nome, endereço e telefone iguais em todo lugar) | médio | médio | `[regente]` |

## O que nunca prometer ao cliente
Posição ou "primeira página"; prazo fixo; estrelas ou perguntas aparecendo na busca; aparecer em resposta de IA;
número de clientes novos. O que se promete: fazer o que o Google documenta, **medir antes e depois** e mostrar os números.
Prazo: indexar leva de horas a semanas; resultado medível costuma levar meses (opinião de mercado, não do Google).

## Fato × opinião (para não vender crença)
- Fato (Google): o resultado local usa relevância, distância e destaque; destaque vem de links, quantidade de avaliações
  e nota. Negócio local não ganha estrelas na busca com avaliações que ele mesmo controla.
- Opinião de especialistas: o Perfil pesa mais que o site no mapa; nome, endereço e telefone iguais em guias ajudam.
- Não verificado: norma do conselho de odontologia (fontes secundárias se contradizem); efeito de `llms.txt`.

## Ordem
B1, B2, B4 e B6 (baratos) → B5 antes do site da clínica → B3 e B7 junto do teste (R7) → B8 depois da primeira venda.
**Pronto quando:** cada um dos 3 sites do teste sai com linha de base preenchida, auditor sem falha e relatório-modelo pronto.
