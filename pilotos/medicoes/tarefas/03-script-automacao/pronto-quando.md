# Critério fixo

`vendas.csv` contém exclusivamente vendas fictícias, não dados de uma empresa real.
Requer somente Node.js 22+, sem instalação.

- `node --test inicial.test.mjs`: 1 teste passa (`--ajuda`).
- `node --test aceitacao.test.mjs`: os 5 testes falham na matriz; o script informa
  que o relatório ainda não foi implementado, em vez de produzir os resultados/erros exigidos.
- `npm test`: após a tarefa, 6 testes passam, saída 0. Casos usam diretórios
  temporários próprios e limpam os arquivos, inclusive em falha.
- `node relatorio.mjs vendas.csv resumo.json`: saída 0 e arquivo com o objeto abaixo.
  Espaçamento e ordem das chaves do objeto são livres; ordem do array é fixa.

```json
{
  "linhas": 5,
  "quantidade": 11,
  "totalCentavos": 15000,
  "categorias": [
    { "categoria": "Acessórios", "quantidade": 3, "totalCentavos": 3000 },
    { "categoria": "Peças", "quantidade": 6, "totalCentavos": 5500 },
    { "categoria": "Revisão", "quantidade": 2, "totalCentavos": 6500 }
  ]
}
```

Contrato do CSV: quantidade segue `^[1-9][0-9]*$`; preço segue
`^[0-9]+\.[0-9]{2}$` (sem trim nesses dois campos). Cabeçalho exato depois de retirar
o BOM inicial. Linhas só com espaços são vazias. Cabeçalho sozinho produz totais zero
e `categorias: []`. Todas as quantidades e somas em centavos devem caber em
`Number.isSafeInteger`; rejeitar excesso como CSV inválido. Não se exige CSV com aspas.
Ordenar categorias pela comparação de strings `<`/`>`, sem depender do idioma do sistema.

Erros no stderr devem conter, conforme o caso, `CSV inválido`, `Falha ao ler CSV`
ou `Uso:` (argumentos). Saída inexistente continua inexistente; saída preexistente
fica intacta. `--ajuda` é o único argumento nessa modalidade. Os testes verificam
preservação da entrada, centavos exatos, BOM/CRLF, linhas vazias, agrupamento,
cabeçalho, campos inválidos, excesso numérico, arquivo ausente e argumentos.

Revisão fixa: somente módulos nativos, nenhuma chamada externa, dados fictícios,
nenhuma alteração nos arquivos congelados. Apague `resumo.json` antes de restaurar
a matriz para outra rodada.
