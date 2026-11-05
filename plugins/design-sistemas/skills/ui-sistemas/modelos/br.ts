// Padrões brasileiros para telas de sistema: documentos, CEP, telefone, placa, dinheiro e datas.
// Copiar para src/lib/br.ts. Sem dependências; testado no kit (scripts/testes/padroes-br.test.mjs).
// Guarde sempre o valor limpo (documento sem máscara, dinheiro em centavos, data em AAAA-MM-DD) e formate só
// para mostrar.

/** Tira máscara e espaços. O CNPJ alfanumérico fica em maiúsculas. */
export function limparDocumento(valor: string): string {
  return valor.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

// Módulo 11 da Receita. Cada caractere vale o código ASCII menos 48: '0'–'9' = 0–9 e 'A' = 17 até 'Z' = 42.
// Pesos de 2 até pesoMaximo, da direita para a esquerda; no CNPJ voltam a 2 depois do 9.
function digitoVerificador(base: string, pesoMaximo: number): number {
  let soma = 0
  let peso = 2
  for (let i = base.length - 1; i >= 0; i--) {
    soma += (base.charCodeAt(i) - 48) * peso
    peso = peso === pesoMaximo ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '')
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false
  return digitoVerificador(d.slice(0, 9), 11) === Number(d[9]) && digitoVerificador(d.slice(0, 10), 11) === Number(d[10])
}

/** CNPJ numérico e alfanumérico (emitido desde julho de 2026): 12 letras ou números + 2 dígitos. */
export function cnpjValido(valor: string): boolean {
  const c = limparDocumento(valor)
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false
  return digitoVerificador(c.slice(0, 12), 9) === Number(c[12]) && digitoVerificador(c.slice(0, 13), 9) === Number(c[13])
}

/** 11 caracteres → CPF; 14 → CNPJ; outro tamanho volta como veio. */
export function formatarDocumento(valor: string): string {
  const c = limparDocumento(valor)
  if (/^\d{11}$/.test(c)) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`
  if (c.length === 14) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
  return valor
}

export function formatarCep(valor: string): string {
  const d = valor.replace(/\D/g, '')
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : valor
}

/** Celular: DDD + 9 + 8 dígitos. Fixo: DDD + 8 dígitos começando de 2 a 5. DDD nunca tem zero. */
export function telefoneValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '')
  return /^[1-9]{2}9\d{8}$/.test(d) || /^[1-9]{2}[2-5]\d{7}$/.test(d)
}

/** (11) 91234-5678 no celular e (11) 3123-4567 no fixo; outro tamanho volta como veio. */
export function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return valor
}

/** Placa antiga (ABC-1234) e Mercosul (ABC1D23). */
export function placaValida(valor: string): boolean {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(valor.toUpperCase().replace(/[^A-Z0-9]/g, ''))
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Centavos (inteiro) → "R$ 1.234,56". O espaço depois do R$ é U+00A0: em teste, compare com  . */
export function formatarReais(centavos: number): string {
  return moeda.format(centavos / 100)
}

/**
 * Texto digitado → centavos. Aceita "1.234,56", "1234,5", "R$ 1.234,56", "1234", "1.500" (mil e quinhentos)
 * e "12.5" (ponto com 1 ou 2 casas é decimal; com 3, milhar). Vazio ou inválido → null.
 */
export function textoParaCentavos(texto: string): number | null {
  let t = texto.replace(/R\$|\s/g, '')
  const negativo = t.startsWith('-')
  if (negativo) t = t.slice(1)
  let inteiro: string
  let fracao = ''
  if (/^\d{1,3}(\.\d{3})*,\d{0,2}$|^\d+,\d{0,2}$/.test(t)) {
    ;[inteiro, fracao] = t.split(',')
    inteiro = inteiro.replace(/\./g, '')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) inteiro = t.replace(/\./g, '')
  else if (/^\d+\.\d{1,2}$/.test(t)) [inteiro, fracao] = t.split('.')
  else if (/^\d+$/.test(t)) inteiro = t
  else return null
  const valor = Number(inteiro) * 100 + Number((fracao + '00').slice(0, 2))
  return negativo ? -valor : valor
}

/** "2026-11-04" → meia-noite local. Cuidado: new Date("2026-11-04") é UTC e aparece como 03/11 no Brasil. */
export function dataLocal(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) throw new Error(`Data fora do formato AAAA-MM-DD: ${iso}`)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

const dataBR = new Intl.DateTimeFormat('pt-BR')

/** Date ou "AAAA-MM-DD" → "04/11/2026". */
export function formatarData(data: Date | string): string {
  return dataBR.format(typeof data === 'string' ? dataLocal(data) : data)
}

/** "04/11/2026" → "2026-11-04". Data que não existe (31/02/2026) → null. */
export function textoParaData(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim())
  if (!m) return null
  const [, dia, mes, ano] = m
  const d = new Date(Number(ano), Number(mes) - 1, Number(dia))
  if (d.getFullYear() !== Number(ano) || d.getMonth() !== Number(mes) - 1 || d.getDate() !== Number(dia)) return null
  return `${ano}-${mes}-${dia}`
}

/** Para busca: sem acento e sem diferença de maiúsculas ("São" acha "sao"). */
export function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Ordem que a pessoa espera: "Ágata" junto de "Agata" e "Item 2" antes de "Item 10". */
export const compararNomes = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true }).compare

export type Endereco = { logradouro: string; bairro: string; cidade: string; uf: string }
export type ResultadoCep = { status: 'ok'; endereco: Endereco } | { status: 'nao-encontrado' } | { status: 'falhou' }

/**
 * Endereço do CEP pelo ViaCEP; se ele falhar (rede, fora do ar, mais de 4 s), pela BrasilAPI. Nunca trava o
 * formulário: em 'nao-encontrado' ou 'falhou' a pessoa digita o endereço. Se o sinal for cancelado (outro CEP
 * digitado), a promessa rejeita e o resultado deve ser ignorado.
 */
export async function buscarCep(cep: string, sinal?: AbortSignal): Promise<ResultadoCep> {
  const d = cep.replace(/\D/g, '')
  if (d.length !== 8) return { status: 'nao-encontrado' }
  const pedir = (url: string) => {
    const limite = AbortSignal.timeout(4000)
    return fetch(url, { signal: sinal ? AbortSignal.any([sinal, limite]) : limite })
  }
  try {
    const r = await pedir(`https://viacep.com.br/ws/${d}/json/`)
    if (r.ok) {
      const j = await r.json()
      if (j.erro) return { status: 'nao-encontrado' }
      return { status: 'ok', endereco: { logradouro: j.logradouro ?? '', bairro: j.bairro ?? '', cidade: j.localidade ?? '', uf: j.uf ?? '' } }
    }
  } catch (erro) {
    if (sinal?.aborted) throw erro
  }
  try {
    const r = await pedir(`https://brasilapi.com.br/api/cep/v2/${d}`)
    if (r.status === 404) return { status: 'nao-encontrado' }
    if (r.ok) {
      const j = await r.json()
      return { status: 'ok', endereco: { logradouro: j.street ?? '', bairro: j.neighborhood ?? '', cidade: j.city ?? '', uf: j.state ?? '' } }
    }
  } catch (erro) {
    if (sinal?.aborted) throw erro
  }
  return { status: 'falhou' }
}
