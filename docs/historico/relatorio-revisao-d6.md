# D6 — Revisão visual e de movimento

16/10/2026. Execução solo, sem publicação ou alterações globais.

| Antes | Depois | Por quê |
| --- | --- | --- |
| Prints/responsivo dependiam do Edge e gravavam perfil no temporário global | Chrome/Edge configurável, perfis na saída local | Rodada reproduzível dentro do projeto |
| Responsivo terminava com sucesso mesmo apontando problemas | Código 1 em largura com problema | Não deixar falha passar silenciosamente |
| Correções do salão existiam apenas no piloto | Gate reutilizável: seis larguras, normal/reduzido, cinco pontos, erros/rede/imagens/âncoras/nomes | Reutilizar verificação sem depender do markup do salão |
| Pivô SVG e pilhas estáticas dificultavam leitura no estúdio | Pivô central explícito e pilhas sequenciais, corrigidos na D2 e retestados | Continuidade espacial e conteúdo legível no reduzido |
| Sequência do salão podia ficar sem quadro e interromper contato | Quadro próximo/foto alternativa e entrada antecipada do cabeçalho, corrigidos nas três rodadas | Continuidade da narrativa e do WhatsApp |

Capturas novas em `pilotos/cliente-salao (repositório privado)/revisao/d6-final/` e `pilotos/estudios/evidencias/d6-final/`:
24/24 combinações aprovadas. Inspeção direta dos prints: assinatura legível e arco coerente no salão;
maquiagem com texto/CTA íntegros; espiral centrada e escala tipográfica preservada no celular.
Prints de topo/meio/fim complementam, não substituem, as capturas por seção já feitas na D2 e nas três
rodadas do salão. Falhas deliberadas verificadas por `pilotos/estudios/verificar-gate-d6.mjs`.

Vídeos existentes e verificados: salão `revisao/codex-rodada-3/videos/` (computador/celular, ~38 s),
estúdio `vitrine/` (25 estudos × duas telas, seis quadros por vídeo). Nenhum favorito escolhido.
Testes comportamentais: estúdio 100 combinações +12 retestes; salão nove cenários, incluindo preferência
reduzida dinâmica, menu/Escape/foco e mídia bloqueada. UI do cabeçalho 280 ms; scrub da capa é narrativa
controlada pela rolagem, não duração de botão. Máscara/clip-path são exceção deliberada medida em cena,
nunca promessa de execução só na GPU. Sem transição `all` introduzida.

**Decisão:** fluxo D6 implementado e tecnicamente verificado. Não há falha grave conhecida nos cenários
exercitados. LCP/CLS dos relatórios são observações locais, não avaliação de usuários reais. Fluidez em
Safari/iPhone físico e aprovação estética permanecem pendentes. A fachada original tem nitidez limitada;
não foi substituída por foto inventada.
