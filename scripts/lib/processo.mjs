// No Windows o shell é preciso para achar os .cmd do npm (claude, codex), mas junta os argumentos sem aspas:
// um argumento com espaço (ex.: o código do python -c) seria partido. Então: shell só no Windows e só sem espaço.
export const usarShell = (args, windows = process.platform === 'win32') => windows && !args.some((a) => /\s/.test(a))
