/**
 * @typedef {{ nome: string, versao: string, dependeDe: string[] }} Manifesto
 * @typedef {{ nome: string, versao: string, dependenciasDiretas: string[], dependenciasTransitivas: string[] }} Pacote
 * @typedef {{ pacotes: Pacote[], ordemTopologica: string[] }} Relatorio
 */

/** @param {Manifesto[]} manifestos @returns {Relatorio} */
export function analisarGrafo(manifestos) {
  // TODO: referências existentes, ciclos, fechos transitivos e Kahn determinístico.
  throw new Error('auditoria ainda não implementada.');
}
