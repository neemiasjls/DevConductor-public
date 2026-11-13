import { toast } from 'sonner'

function validarCliente (nome: string) {
  if (!nome) {
    toast.error('Nome obrigatório')
    return false
  }
  return true
}

function salvar (nome: string) {
  if (!nome.trim()) { toast.error('Informe o nome'); return }
  if (nome.length > 80) return toast.error('Nome longo demais')
}

export { validarCliente, salvar }
