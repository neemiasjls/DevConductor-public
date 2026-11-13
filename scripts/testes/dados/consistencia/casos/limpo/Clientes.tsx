import { Botao } from '../../pecas/botao'
import { TableHead } from '../../pecas/tabela'
import { cn } from '../../pecas/cn'
import { CampoCpf } from './CampoCpf'

export function Clientes ({ ativo, className }: { ativo: boolean, className?: string }) {
  return (
    <section className={cn('flex flex-col gap-4 p-6', ativo && 'bg-background', ativo ? 'text-foreground' : 'text-muted-foreground', className)}>
      <CampoCpf />
      <div className="rounded-lg border border-border bg-[var(--primary)]/10 p-4" />
      <span className="rounded-full bg-(--color-primary) px-2 text-xs text-primary-foreground">Ativo</span>
      <span className={`text-xs ${ativo ? 'text-orange-600' : 'text-muted-foreground'}`}>Atrasado</span>
      <table>
        <thead>
          <tr>
            <TableHead className="font-medium">Nome</TableHead>
            <TableHead className="font-medium text-right w-32">Total</TableHead>
          </tr>
        </thead>
      </table>
      <Botao>Salvar cliente</Botao>
    </section>
  )
}
