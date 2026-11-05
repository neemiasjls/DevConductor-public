Implemente relatorio.mjs em Node.js, somente com módulos nativos, para resumir vendas
fictícias. Trabalhe apenas nesta pasta, sem instalar dependências. Leia pronto-quando.md.

O comando é node relatorio.mjs <entrada.csv> <saida.json>. O CSV de exemplo vendas.csv
contém apenas dados fictícios. A primeira linha deve ser exatamente
categoria;quantidade;valor_unitario. O separador é ponto e vírgula, sem campos entre
aspas nem separadores dentro dos campos. Aceite UTF-8 com ou sem BOM, linhas LF ou
CRLF e linhas vazias. A categoria não pode estar vazia; remova espaços nas pontas.
A quantidade deve ser um inteiro positivo e o valor unitário um número não negativo
com ponto e exatamente duas casas decimais. Rejeite linhas com campos a mais ou a menos.

Gere JSON com linhas, quantidade, totalCentavos e categorias. Cada item de categorias
deve ter categoria, quantidade e totalCentavos, em ordem alfabética crescente de
categoria. Some dinheiro em centavos inteiros. Use o formato e os totais exatos
descritos no critério. O arquivo de entrada não pode mudar.

Entrada inválida, arquivo inexistente ou argumentos errados devem causar saída
diferente de zero, mensagem em português no stderr e nenhuma alteração no arquivo
de saída. Preserve --ajuda com saída zero. Não altere pedido.md, pronto-quando.md,
package.json, vendas.csv nem os testes fornecidos. Pode criar testes adicionais.
Rode npm test e informe resultado e arquivos alterados. Não faça commit nem publique.
