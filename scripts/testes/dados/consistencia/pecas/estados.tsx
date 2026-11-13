export function Vazio ({ texto }: { texto: string }) {
  return <p data-estado="vazio" className="text-sm text-muted-foreground">{texto}</p>
}
