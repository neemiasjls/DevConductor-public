# Tarefas fixas — Fase A

Três entradas pequenas e um piloto integrado separado, originais e sem dependências
externas. Requerem Node.js 22 ou superior e Claude Code já instalado. Todos os nomes,
serviços, cadastros e vendas são fictícios. Não usar dados reais, instalar nada global
nem alterar o kit nesta fase.

## Dois tipos de ensaio

| Tipo do plano | Matrizes | Execuções | Testes fornecidos por execução |
|---|---|---|---|
| `ensaio-controlado-v1` | `01-secao-lp`, `02-endpoint-api`, `03-script-automacao` | 18: três tarefas × dois grupos × três repetições | LP: 5; API: 7; CSV: 6 |
| `ensaio-integrado-v1` | `04-catalogo-integrado` | 6: uma tarefa × dois grupos × três repetições | 54: 1 inicial + 53 de aceitação |

Conclua e audite as 18 execuções do ensaio curto antes de executar as seis do piloto
integrado. Os lotes e comparações ficam separados; preparar cópias não é executar o
modelo nem produzir resultado de qualidade ou consumo.

No integrado, o trabalho envolve CLI, arquivos, validação e grafo em módulos. O pedido
permite ferramentas internas de execução e delegação, sem obrigar o uso de agentes.
Não alongue a tarefa artificialmente para alcançar 150 mil tokens. Esse piloto só
exercita um alerta de contexto se o consumo real da sessão alcançar o limiar.

## Preparar e repetir

1. Preserve uma cópia intocada desta pasta como matriz. Anote a revisão do repositório
   e o hash dos arquivos da matriz. Antes de **cada** execução, restaure a pasta da
   tarefa a partir dessa matriz, inclusive removendo arquivos gerados na execução
   anterior. Guarde resultados fora das pastas das matrizes. Não use a solução anterior como entrada.
2. Na pasta da tarefa, execute `node --test inicial.test.mjs` (saída 0) e
   `node --test aceitacao.test.mjs` (saída 1, falhas esperadas descritas no critério).
   `npm test` executa ambos e deve falhar antes da implementação.
3. Use a mesma máquina, versão do Node e do Claude Code, modelo principal, permissões,
   instruções herdadas, conectores e estado inicial de cache em cada par base/depois.
   Registre as versões/configurações e a única mudança do kit em avaliação. Não adicione
   instruções extras só em um grupo. Não mude `pedido.md`, critérios, dados, testes
   fornecidos ou `package.json`. Testes adicionais são permitidos em outros arquivos.

Nas tarefas pequenas, também ficam congelados `servir.mjs` e `vendas.csv` quando
presentes. Na matriz 04, todos os arquivos declarados no inventário são congelados,
exceto `auditar.mjs` e `src/`: implemente somente esses caminhos na cópia. A comparação
usa os hashes da matriz inteira e o conjunto de congelados correspondente ao tipo.

## Rodar uma rodada

Para cada tarefa, abra uma sessão **NOVA** do Claude Code **na pasta da tarefa**
(sem retomar conversa). Anote a pasta absoluta e o identificador da sessão. Imediatamente
antes de enviar, anote o início em ISO 8601 com fuso, por exemplo
`2026-10-20T14:00:00-03:00`. Cole **todo o conteúdo de `pedido.md`, sem adaptações**.

Deixe concluir. Execute os comandos de `pronto-quando.md`. Registre a primeira entrega,
faça uma revisão com o mesmo checklist e registre cada correção solicitada, com o texto
exato. Inclua as correções na mesma sessão e no intervalo medido; anote o fim depois
da última entrega/verificação. Registre também o horário da primeira entrega. Uma
rodada só termina com os critérios atendidos ou com a desistência explicitamente anotada.

Feche a sessão. Na **raiz do DevAgents**, meça o caminho absoluto onde ela foi aberta
(não a raiz do kit), usando os horários reais:

```powershell
node scripts/medir-uso.mjs "<pasta-absoluta-da-tarefa>" --de "<inicio-ISO>" --ate "<fim-ISO>" --json > "pilotos/medicoes/base-01-r1.json"
```

Se houver sessões concorrentes na mesma pasta, acrescente `--sessao <ID>`.
Confira o código de saída, sessões encontradas e totais: JSON vazio/zero sem sessão
não é medição válida. O comparador aceita o UTF-16 produzido pelo `>` no PowerShell 5.1.
Não versione históricos brutos nem caminhos pessoais; resultados ficam locais.

Repita com a configuração depois e nomes `depois-01-r1.json` etc. Faça ao menos três
repetições por tarefa e grupo, alternando base/depois para reduzir efeito de ordem.
Compare primeiro **a mesma tarefa**, com igual número de repetições:

```powershell
node scripts/comparar-medicoes.mjs "base=pilotos/medicoes/base-01-*.json" "depois=pilotos/medicoes/depois-01-*.json"
```

Use `02` e `03` para as outras tarefas. Também aceita listas separadas por vírgulas:
`node scripts/comparar-medicoes.mjs "base=<arquivos>" "depois=<arquivos>"`.
Não inclua a mesma sessão em dois arquivos de um grupo. Compare entrada, cache lido,
saída e distribuição por modelo; tokens não são preço nem prova de qualidade.

## Registro de qualidade por execução

Copie este formulário para um arquivo local fora das tarefas:

```text
Tarefa / grupo / repetição:
Revisão e hashes da matriz / configuração avaliada:
Versões, modelo, plugins, permissões, cache e ambiente:
Pasta e sessão (somente no registro local):
Início / primeira entrega / fim (ISO com fuso):
Testes na primeira entrega: passaram/total, código de saída:
Revisão: cada achado, gravidade e critério afetado (ou nenhum):
Correções pedidas pelo usuário: quantidade e texto de cada pedido:
Testes finais: passaram/total, código de saída:
LP: revisão visual 390 e 1280 px, teclado, movimento normal/reduzido:
Integrado: grafo determinístico, manifestos e saída preservados, limitações de links:
Concluída ou interrompida / motivo / JSON da medição:
```

Revisão fixa: conferir todos os critérios, entradas inválidas da API/CSV, ausência de
dados reais e dependências, e legibilidade/teclado/movimento da LP. Separe os achados
da primeira entrega dos finais. Não conte testes alterados ou removidos como aprovação.
Economia com critério reprovado não conta como qualidade mantida. A LP tem verificações
estáticas por comando; aparência e comportamento real exigem a revisão de navegador
descrita no critério e devem ter o mesmo procedimento nas duas configurações.

No integrado, os critérios extras são `grafoDeterministico` e
`preservacaoManifestosESaida`: confira o grafo com um oráculo independente, incluindo
a escolha de Kahn a cada passo, e os bytes dos manifestos/saída nos erros. Registre
explicitamente qualquer limitação para testar links simbólicos no Windows, conforme
`04-catalogo-integrado/pronto-quando.md`.
