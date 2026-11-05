/**
 * @typedef {{ entrada: string, saida: string }} Caminhos
 * @typedef {{ nomeArquivo: string, conteudo: string }} ArquivoManifesto
 */

/** @param {string} entrada @param {string} saida @returns {Promise<Caminhos>} */
export async function validarCaminhos(entrada, saida) {
  // TODO: normalização, existência, tipos e contenção da saída.
  throw new Error('auditoria ainda não implementada.');
}

/** @param {string} entrada @returns {Promise<string[]>} */
export async function listarManifestos(entrada) {
  // TODO: nomes de entradas .json diretas na ordem dos code units UTF-16.
  throw new Error('auditoria ainda não implementada.');
}

/** @param {string} entrada @param {string} nomeArquivo @returns {Promise<ArquivoManifesto>} */
export async function lerManifesto(entrada, nomeArquivo) {
  // TODO: ler uma entrada regular; o chamador valida antes de ler a seguinte.
  throw new Error('auditoria ainda não implementada.');
}

/** @param {string} saida @param {object} relatorio @returns {Promise<void>} */
export async function gravarRelatorio(saida, relatorio) {
  // TODO: serialização exata e substituição completa, sem temporários na entrada.
  throw new Error('auditoria ainda não implementada.');
}
