import { cn } from '../../pecas/cn'

export function Tela ({ ativo }: { ativo: boolean }) {
  return <div className={cn('px-4 text-sm', ativo && 'bg-blue-600')} />
}
