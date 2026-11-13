import { Campo } from '../../pecas/campo'

// Embrulha a peça de campo; o <input> aparece aqui só por causa da máscara.
export function CampoCpf () {
  return <label className="flex flex-col gap-1 text-sm">CPF<input inputMode="numeric" className="h-9 rounded-md border border-border px-3" /><Campo /></label>
}
