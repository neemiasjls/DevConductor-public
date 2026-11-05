/**
 * @typedef {{ nomeArquivo: string, conteudo: string }} ArquivoManifesto
 * @typedef {{ nome: string, versao: string, dependeDe: string[] }} Manifesto
 */

/** @param {ArquivoManifesto} arquivo @returns {Manifesto} */
export function validarManifesto(arquivo) {
  // TODO: parse e formato exato deste arquivo, antes da próxima leitura.
  throw new Error('auditoria ainda não implementada.');
}

/** @param {Manifesto[]} manifestos @returns {void} */
export function validarUnicidade(manifestos) {
  // TODO: nomes únicos e dependências diretas únicas, na precedência contratada.
  throw new Error('auditoria ainda não implementada.');
}
