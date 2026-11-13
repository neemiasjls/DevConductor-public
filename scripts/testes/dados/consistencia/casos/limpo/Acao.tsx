import { botaoVariants } from './variantes'

export function Acao () {
  return (
    <div className="flex gap-0.5 p-1.5" style={{ color: 'var(--primary)', width: 20 }}>
      <a href="/x" className={botaoVariants({ variant: 'padrao' })}>Abrir</a>
      <a href="/y" className="text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver</a>
    </div>
  )
}
