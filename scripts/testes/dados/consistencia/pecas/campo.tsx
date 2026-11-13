import { cn } from './cn'

export function Campo ({ className, ...props }: { className?: string }) {
  return <input className={cn('h-9 rounded-md border border-border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring', className)} {...props} />
}
