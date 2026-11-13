import { TableHead } from '../../pecas/tabela'
import { toast } from 'sonner'

function validarPedido (valor: string, setError: (m: string) => void) {
  if (!valor) setError('Digite o número do pedido')
}

export function Pedidos () {
  const salvar = () => toast.success('Pedido salvo')
  return (
    <table onClick={salvar}>
      <thead><tr><TableHead className="font-medium">Pedido</TableHead><TableHead className="font-medium text-right">Valor</TableHead></tr></thead>
    </table>
  )
}
async function enviar (api: () => Promise<{ error?: string }>) {
  const { error } = await api()
  if (error) { toast.error('Não foi possível salvar o pedido'); return }
  try { await api() } catch { toast.error('Sem conexão') }
}
export { validarPedido, enviar }
