// Onde está a CLI do Graphify. pipx e uv instalam em ~/.local/bin (ou na pasta de PIPX_BIN_DIR, UV_TOOL_BIN_DIR ou
// XDG_BIN_HOME), que nem sempre entra no PATH, sobretudo no Windows: sem isto os hooks diziam "não instalada" com a
// CLI instalada. Só olha arquivos; não roda nada.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const NOMES = ['graphify', 'graphify.exe', 'graphify.cmd']
const temCli = (pasta) => NOMES.some((n) => { try { return fs.statSync(path.join(pasta, n)).isFile() } catch { return false } })

/** Pasta da CLI quando ela existe só fora do PATH; null se está no PATH ou não foi instalada. */
export function pastaForaDoPath(env = process.env) {
  if ((env.PATH || '').split(path.delimiter).filter(Boolean).some(temCli)) return null
  const extras = [env.PIPX_BIN_DIR, env.UV_TOOL_BIN_DIR, env.XDG_BIN_HOME, path.join(os.homedir(), '.local', 'bin')]
  return extras.filter(Boolean).find(temCli) ?? null
}

/** Como chamar a CLI na linha de comando, com o caminho completo quando ela está fora do PATH. */
export function comandoCli(pasta = pastaForaDoPath()) {
  return pasta ? `"${path.join(pasta, 'graphify').replace(/\\/g, '/')}"` : 'graphify'
}
