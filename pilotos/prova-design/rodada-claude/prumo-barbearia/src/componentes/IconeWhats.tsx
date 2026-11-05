// Ícone de conversa (desenho próprio, traço simples) para os botões de WhatsApp.
export default function IconeWhats({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 19.5l1.1-3.6A8 8 0 1 1 8.4 18.6z" />
      <path d="M9.2 8.6c.2 2.6 2.4 4.9 5.2 5.4l1-1.2-1.6-.9-.7.6c-.9-.4-1.7-1.2-2.1-2.1l.6-.7-.9-1.6z" fill="currentColor" stroke="none" />
    </svg>
  )
}
