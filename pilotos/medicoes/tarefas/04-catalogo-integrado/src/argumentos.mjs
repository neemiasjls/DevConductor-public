export const AJUDA = 'Uso: node auditar.mjs <diretorio> <saida.json>\n' +
  'Audita manifestos JSON e gera um relatório de dependências.\n' +
  'Opção: --ajuda\n';

/** @param {string[]} argumentos @returns {{ entrada: string, saida: string }} */
export function interpretarArgumentos(argumentos) {
  // TODO: validar a forma da chamada; a ajuda isolada já é tratada pela CLI.
  throw new Error('auditoria ainda não implementada.');
}
