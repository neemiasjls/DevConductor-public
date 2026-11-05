import { AJUDA, interpretarArgumentos } from './src/argumentos.mjs';
import { auditar } from './src/auditoria.mjs';

const argumentos = process.argv.slice(2);
if (argumentos.length === 1 && argumentos[0] === '--ajuda') {
  process.stdout.write(AJUDA);
} else {
  try {
    const { entrada, saida } = interpretarArgumentos(argumentos);
    await auditar(entrada, saida);
  } catch (erro) {
    process.stderr.write(`Erro: ${erro.message}\n`);
    process.exitCode = 1;
  }
}
