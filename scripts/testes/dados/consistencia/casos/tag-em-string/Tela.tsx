// Exemplo de documentação: <input /> e <button> só aparecem em texto.
const exemplo = '<input />'
const outro = `use <button> só pela peça`
/* <select> em comentário */
export function Tela () {
  return <p className="text-sm">Água d'água {exemplo}{outro}</p>
}
