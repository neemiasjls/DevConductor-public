# Refino dos exemplos Codex — concluído em 30/10/2026

Neemias escolheu explicitamente “Refinar os exemplos do Codex”. A rodada futura do Claude permanece
separada e não foi iniciada. O objetivo foi calibrar os exageros sem remover a originalidade apreciada.

| Exemplo | Ajustes | Preservado |
|---|---|---|
| Lastro Cargas | Títulos cerca de8–12% menores; percurso da câmera5→4,4 telas no computador e4→3,6 no celular; rota2400→2100px/1500→1350px; hodômetro com uma volta e estabilização mais rápida. | Modelo real, trajetória, agrupamento da carga, rota e esteira. |
| Estúdio Coral | Título8–9% menor; troca de palavra2,1→3s; respiração1,07→1,035; cortinas18–20% mais curtas; controles e menu corrigidos em tablet/tela baixa. | Paleta, etiquetas, trança por progresso, WebGL, esteira e agenda. |
| Barbearia Seco | “CORTES”12–13% menor; “Senta aí”8% menor, montagem menos dispersa/percurso17% mais curto; faixas menos rápidas. | Abertura SECO, máscara, quinas, fotografia P&B, amarelo e pilha. |

## Evidências

- Builds dos três sites repetidos em30/10, saída0; logs em `pilotos/testes-temporarios/build-refino-*-30-10.log`.
- Lastro12/12: `pilotos/prova-design/lastro-cargas/revisao/refino-codex-29-10/relatorio.json`.
  Teclado, preferência dinâmica e percurso com roda/toque/retorno em
  `pilotos/prova-design/vitrine/refino-codex-comportamento-29-10/resultado.json`:2 casos aprovados,
  maior janela de deslocamento0/0,00083 (celular/desktop).
  Algarismos visíveis04/24/01 conferidos contra texto acessível4/24/1 em390/1440, após a animação,
  em `lastro-cargas/revisao/refino-hodometro-29-10/resultado.json`.
- Coral12/12: `estudio-coral/revisao/refino-codex-29-10-final/relatorio.json`; complemento de teclado,
  mensagem por serviço, reduzido dinâmico, resize e falha Lottie3 casos; pausa/foco2 casos.
  Telas768/1024/1440×630px conferidas. Relatório local `estudio-coral/revisao/refino-codex-29-10.md`.
- Seco12/12: `barbearia-seco/revisao/refino-codex-29-10/relatorio.json`; pausa/retomada das faixas,
  frase final dentro da tela e reduzido dinâmico2 casos. Relatório na mesma pasta.

Os caminhos abreviados dos sites acima partem de `pilotos/prova-design/`. Capturas anteriores preservadas
em `vitrine/pos-critica-29-10/`. Os vídeos novos ficam em `vitrine/refino-codex-30-10/`.
Os seis arquivos e36 quadros passaram na verificação de dimensões, duração e busca no meio do vídeo
(`verificacao-videos.json`). Duração real desktop/celular: Lastro105,3/53,4s; Coral37,5/20,5s;
Seco34,0/20,8s. O gravador aguarda a roda/capturas, portanto o pedido14s não é duração final nem métrica
de fluidez. A vitrine principal apresenta o refino e um link para os seis vídeos anteriores.
Não houve nova medição Lighthouse: o refino é visual e não demonstra ganho de desempenho ou conversão.
Callbacks RAF não são FPS físicos. Aprovação estética do refino e teste em aparelho físico continuam abertos.

Nenhum plugin, dependência, asset externo ou configuração global foi alterado nesta rodada de refino.
Os testes do kit308 aprovados/2 pulados pertencem à validação anterior; os novos checks foram os builds
e comportamentos dos exemplos afetados. Sem commit, envio ou publicação.
