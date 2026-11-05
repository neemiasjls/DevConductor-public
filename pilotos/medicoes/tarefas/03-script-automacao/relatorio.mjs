const uso = 'Uso: node relatorio.mjs <entrada.csv> <saida.json> (vendas fictícias)';
if (process.argv.length === 3 && process.argv[2] === '--ajuda') {
  console.log(uso);
} else {
  console.error('Relatório ainda não implementado.');
  process.exitCode = 1;
}
