import { cn } from './cn'

export function TableHead ({ className, ...props }: { className?: string }) {
  return <th className={cn('h-10 px-2 text-left text-xs font-medium text-muted-foreground', className)} {...props} />
}
