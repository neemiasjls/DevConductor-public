# Auditoria de continuidade — 06/11/2026

Escopo: gerador público, régua de densidade, comportamento afetado da Austral, coerência de documentação,
workflow de testes e instruções de agentes. Revisão local, sem deploy, alteração global ou teste em aparelho físico.
Não é auditoria completa de toda dependência nem certificação de segurança.

## Resultado e prioridades

| Prioridade | Achado | Estado nesta rodada |
|---|---|---|
| Alta | `renomear` contornava exclusões obrigatórias, inclusive `.env` | Corrigido com regressões de origem/destino e diferenças de caixa |
| Alta | Destino de arquivo podia escapar da saída ou atingir `.git`; raiz podia ficar dentro do projeto | Corrigido; caminhos relativos, reserva de nomes, colisões e raízes reais validados antes de limpar |
| Alta | Texto UTF-16 com BOM era liberado como binário, sem varredura | Corrigido para LE/BE; UTF-32 recusado; codificação preservada em trocas |
| Média | Uma exceção de densidade justificava qualquer texto junto na mesma tela | Corrigido no esquema 2: texto sem exceção ainda respeita o limite |
| Média | Instrução de descongelar visível sem geada ativa | Corrigido; acompanha preferência dinâmica, mídia e disponibilidade do WebGL |
| Baixa | Tween do fio da Doca depois de um `return`, nunca criado | Corrigido; progressão e retorno medidos em 390/1440 |
| Alta | Geração pública não é transacional | Plano: cópia preparada + rollback; sem alegar correção já feita |
| Alta | Envio reutiliza pasta sem confirmar identidade do remote nem trabalho local | Plano: preflight de identidade e estado Git antes de escrever |
| Média | Varredura e cópia usam árvore de trabalho; arquivos podem mudar entre fases | Plano: snapshot imutável e bytes aprovados iguais aos copiados |
| Média | Documentos antigos podem parecer o roteiro atual | Avisos de estado adicionados; consolidação completa no plano de manutenção |

Riscos do gerador são reproduzíveis por configuração ou arquivos locais incorretos; não foi identificado
vazamento ocorrido nem exploração externa. A correção não autoriza tratar a varredura por padrões como prova
de anonimização de conteúdo arbitrário. Binários e formatos sem suporte precisam de revisão própria.

## Régua LP-12: resultados observados

Ferramenta da versão 0.3.14, 1440×900 / 390×844, passo de meia tela, normal e reduzido. Códigos de saída
observados individualmente: 1 em todas as reprovações abaixo, 0 no Prumo normal. Sem exceções artificiais.

| Site / preferência | Máximo computador | Máximo celular | Telas com alerta |
|---|---:|---:|---:|
| Austral / normal | 53 | 51 | 1 |
| Austral / reduzido, antes | 118 | 106 | 7 |
| Austral / reduzido, após ocultar dica indisponível | 118 | 106 | 6 |
| Lúmen / normal | 59 | 53 | 2 |
| Lúmen / reduzido | 59 | 53 | 1 |
| Prumo / normal | 44 | 44 | 0 |
| Prumo / reduzido | 123 | 74 | 5 |

Limites: 60/45. A correção da dica elimina uma tela acima do limite, sem alterar o pior caso da Austral.
Na medição inicial, as listas completas do modo reduzido e a entrada da Viagem tinham justificativas anteriores
nos planos, mas sem marcação localizada no código. Isso não justificava automaticamente outros trechos.
Lúmen tem sobrecarga na abertura/entrada do cronograma que a amostragem anterior não identificava.
Não reescrever as páginas ou esconder texto para transformar essas reprovações em aprovação automática.

Artefatos locais: `pilotos/testes-temporarios/densidade-06-11/` e `densidade-06-11-r2/`.
São medições anteriores ao esquema 2 da versão 0.3.15; preservadas como evidência histórica, sem reatribuir
as rodadas à ferramenta nova. Como os sites não têm marcações de exceção, a contagem numérica não depende
da nova regra de cobertura; ainda assim a entrega final deve gerar relatórios novos na versão final.

## Fechamento da matriz na versão final

Após as correções, seis relatórios novos do esquema 2, todos com saída 0. Sem reprovações omitidas: as
tentativas anteriores continuam nos diretórios temporários. Relatórios finais preservados em
`pilotos/prova-design/rodada-claude/<site>/revisao/densidade-06-11-final/{normal,reduzido}/relatorio.json`.

| Site / preferência | Máximo computador | Máximo celular | Alertas | Exceções |
|---|---:|---:|---:|---:|
| Austral / normal | 53 | 51 | 0 | 1 |
| Austral / reduzido | 44 | 45 | 0 | 0 |
| Lúmen / normal | 51 | 45 | 0 | 0 |
| Lúmen / reduzido | 51 | 45 | 0 | 0 |
| Prumo / normal | 44 | 44 | 0 | 0 |
| Prumo / reduzido | 40 | 44 | 0 | 0 |

- Austral: exceção somente no cabeçalho da Viagem, com o motivo já registrado no plano de 05/11. A lista dos
  cinco marcos vira leitura apenas no reduzido, preservando todos os textos. Apoio da Doca encurtado sem
  retirar o aviso de estrutura demonstrativa. Dica da geada só aparece quando disponível.
- Prumo: ficha técnica completa do ramo estático marcada como leitura; ramo animado permanece sem essa marca.
  A queda da contagem no reduzido resulta da classificação de leitura, não de redução do conteúdo.
- Lúmen: apoios da abertura/diagnóstico/cronograma e link secundário mais curtos; localização, diagnóstico,
  exemplo ilustrativo e etapas preservados. Nenhuma cena trocada ou encurtada para aprovar a régua.

Essa aprovação é da regra automatizada, não substitui avaliação estética ou compreensão humana.

## Verificação dos comportamentos corrigidos

- Build da Austral: saída 0; nenhuma dependência nova.
- Harness existente reforçado: quatro larguras (360, 390, 414, 1440), todos aprovados. Inclui toque/roda,
  teclado, retorno, troca dinâmica para reduzido, fotos indisponíveis e WebGL indisponível.
- Regressão específica do fio: dois cenários (390/1440), escala 0 → 1 → 0 com a rolagem; reduzido mostra
  escala 1; reativar movimento retorna a escala 0. Esse teste exercita o navegador, não procura palavras no código.
- Evidências: `pilotos/testes-temporarios/austral-comportamento-06-11/resultado.json` e
  `pilotos/testes-temporarios/doca-regressao-06-11/resultado.json`.
- Classificação dinâmica de leitura: quatro cenários, duas larguras por site (Austral e Prumo), sem perda
  dos cinco marcos/quatro itens. Lúmen final: comportamento aprovado nos dois cenários (390/1440).
- Três builds finais aprovados. Vídeos e Lighthouse não repetidos: os anteriores são registros históricos.

## Verificação do kit

- Suíte completa final: 357 testes, 355 aprovados, 2 pulados por plataforma, 0 falhas; saída 0.
- Validate do catálogo, núcleo e landing-pages: saída 0 em todos.
- Varredura local dos 2.465 arquivos rastreados: nenhum achado, saída 0; sem gerar/enviar cópia pública.
  Esse número não inclui os documentos novos ainda não rastreados.
- Dezesseis links locais nos documentos revisados conferidos, sem alvo ausente.
- Versões: devconductor-core 0.4.6, landing-pages 0.3.15, catálogo regenerado.
- Sem validação Linux nesta máquina; os dois testes condicionais continuam pulados, sem alegar CI executado.

## Planos de ação para revisão

1. [Vitrine confiável](../planos/2026-11-06-vitrine-confiavel.md): identidade do destino, preflight, rollback,
   snapshot, manifesto e instalação isolada a partir do artefato público.
2. [Qualidade visual com evidência](../planos/2026-11-06-qualidade-visual-com-evidencia.md): fechar densidade,
   fixtures de visibilidade, manifesto de build e prova de usabilidade de sistemas.
3. [Eficácia e manutenção](../planos/2026-11-06-eficacia-e-manutencao-do-kit.md): documentação vigente, ensaio
   controlado de delegação, limites observáveis, instalação reproduzível e inventário de dependências.

Recomendação: começar pelo preflight/rollback da vitrine e fechar a matriz de densidade antes de nova entrega
visual (matriz já fechada nesta rodada). Não construir uma plataforma de agentes ou reabrir clientes pausados
como consequência desta auditoria.
Medições semanais de consumo continuam para 11–12/11, sem conclusão prematura de economia.
