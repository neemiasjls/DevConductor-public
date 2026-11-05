# Prova de design (Fase 4 da auditoria de 29/10)

## Rodadas separadas (pedido do Neemias, DEV-36)

- **Codex:** rodada atual apresentada/consolidada — Lastro, Coral e Seco, nas pastas existentes abaixo.
- **Claude:** novos exemplos a construir em `rodada-claude/<slug>/`, sem sobrescrever os atuais.
  Começar por [rodada-claude/README.md](rodada-claude/README.md): feedback, escopo e roteiro de entrega.

O usuário gostou da originalidade, mas quer os próximos exemplos com exageros mais bem calibrados. A vitrine
principal mostra os dois grupos; o do Claude está reservado, sem simular sites já feitos. O rótulo da rodada
atual não muda o histórico de contribuições anteriores.

Três sites **fictícios** feitos com o kit novo (orçamento de movimento DEV-34, estilos ousados, receitas novas),
para comparar com os pilotos do mesmo nicho. Nada aqui é cliente real: nomes, contatos e números são de
demonstração, a página diz isso na tela e tem `noindex`.

| Pasta | Negócio fictício | Estilo | Porta local |
|---|---|---|---|
| `lastro-cargas/` | transportadora de cargas (Ribeirão Preto/SP) | `imersivo-3d` | 5181 |
| `estudio-coral/` | salão de tranças, cachos e cor (Belo Horizonte/MG) | `cinetico-vibrante` | 5182 |
| `barbearia-seco/` | barbearia (Curitiba/PR) | `brutalista-grafico` | 5183 |

Cada pasta tem `plano.md` com o **roteiro de movimento escrito antes da construção** (`lp-cenas/tecnicas.md`).
Vídeos, vitrine e medições ficam em `vitrine/`; o relatório em `docs/prova-design.md`.

## Estado depois da crítica — 29/10

Três builds aprovados, revisão técnica 36/36 e correções de foco, preferência dinâmica, pausa, contraste,
conteúdo móvel e estabilidade da Lastro. Relatório completo: [prova-design.md](../../docs/prova-design.md).
Vitrine atual: http://127.0.0.1:5196/; vídeos corrigidos em `vitrine/pos-critica-29-10/`, comparações anteriores
preservadas em `vitrine/final/`. Previews de produção desta sessão: Lastro5195, Coral5194, Seco localhost:5183
(esta porta atende em IPv6). As portas da tabela acima são as de desenvolvimento.
Medições e limites: `vitrine/medicoes-pos-critica-29-10/resumo.md`. Falta avaliação estética do usuário e
ensaio em aparelho físico; a prova não foi declarada premiada nem equivalente a uma implantação real.

## Regras comuns (valem para os três)
- Stack de `lp-construcao`: Vite + React 19 + TypeScript + Tailwind v4 + Motion + GSAP/ScrollTrigger (+ Three/R3F
  onde a receita pedir). Versões fixas (sem `^`) iguais às das receitas de `lp-cenas`.
- Todo texto em `src/data/conteudo.ts`; tokens do estilo em `src/ritmo.ts`; fontes hospedadas (`@fontsource*`).
- `index.html`: título, descrição, `noindex,nofollow`, Open Graph, schema.org do tipo do negócio marcado como
  demonstração. Faixa visível "Demonstração — empresa fictícia" (topo ou rodapé) e créditos das fotos/modelos.
- Fotos e modelos só com licença clara (CC0, CC BY, CC BY-SA, Poly Haven, autoria própria), cada um em
  `assets.md` com origem, autor, licença e alteração. CC BY/BY-SA: crédito na página; foto alterada de BY-SA
  continua BY-SA.
- Movimento: `gsap.matchMedia()`; estados iniciais só no bloco "com movimento"; movimento reduzido = tudo
  parado e visível, sem pin. Só `transform`/`opacity` (exceção: `strokeDashoffset` em SVG). Título principal
  nunca espera animação para ser lido. Pesado (Three, Lottie, WebGL) em `lazy()` perto da seção.
- Celular equivalente (360–414 px): mesma cena com pin mais curto, câmera/tamanho ajustados, `dpr` limitado.
- Sem rede social, mapa ou link externo real além dos créditos; WhatsApp em formato `wa.me` com número
  claramente fictício.
