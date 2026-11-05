// Escopo para servidores Node descartáveis: inicia sem shell e espera o fechamento antes de devolver.
// O chamador sempre deve executar await escopo.encerrar() em finally.
import { spawn } from 'node:child_process'

const esperarFechamento = async (estado, tempo) => {
  if (estado.fechado) return true
  let timer
  try {
    return await Promise.race([
      estado.fim.then(() => true),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), tempo) }),
    ])
  } finally { clearTimeout(timer) }
}

export function criarEscopoProcessos({ toleranciaMs = 1500 } = {}) {
  if (!Number.isSafeInteger(toleranciaMs) || toleranciaMs < 1) throw Error('Tolerância deve ser um inteiro positivo.')
  const filhos = []
  let encerramento
  return {
    iniciarNode(args, { cwd, env = process.env, stdio = 'pipe' } = {}) {
      if (encerramento) throw Error('Escopo de processos já encerrado.')
      if (!Array.isArray(args) || !args.every(a => typeof a === 'string')) throw Error('Argumentos devem ser uma lista de strings.')
      const processo = spawn(process.execPath, args, { cwd, env, stdio, shell: false, windowsHide: true })
      const estado = { processo, fechado: false, erro: null }
      estado.fim = new Promise(resolve => {
        processo.once('error', erro => { estado.erro = erro })
        processo.once('close', () => { estado.fechado = true; resolve() })
      })
      filhos.push(estado)
      return processo
    },
    encerrar() {
      if (encerramento) return encerramento
      encerramento = (async () => {
        const resultados = await Promise.allSettled(filhos.map(async estado => {
          const p = estado.processo
          if (!estado.fechado) {
            p.stdout?.resume(); p.stderr?.resume()
            p.kill('SIGTERM')
            if (!await esperarFechamento(estado, toleranciaMs)) {
              p.kill('SIGKILL')
              if (!await esperarFechamento(estado, toleranciaMs)) throw Error(`Processo de teste ${p.pid} não encerrou.`)
            }
          }
          if (estado.erro) throw estado.erro
        }))
        const erros = resultados.filter(r => r.status === 'rejected').map(r => r.reason)
        if (erros.length) throw new AggregateError(erros, 'Falha ao encerrar processos de teste.')
      })()
      return encerramento
    },
  }
}
