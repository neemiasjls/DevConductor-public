import test from 'node:test'
import assert from 'node:assert/strict'
import * as br from '../../plugins/design-sistemas/skills/ui-sistemas/modelos/br.ts'

test('CPF e CNPJ, inclusive o CNPJ alfanumérico da Receita', () => {
  assert.equal(br.cpfValido('529.982.247-25'), true)
  assert.equal(br.cpfValido('529.982.247-24'), false)
  assert.equal(br.cpfValido('111.111.111-11'), false)
  assert.equal(br.cnpjValido('11.222.333/0001-81'), true)
  assert.equal(br.cnpjValido('12.ABC.345/01DE-35'), true) // exemplo oficial da Receita Federal
  assert.equal(br.cnpjValido('12.abc.345/01de-35'), true)
  assert.equal(br.cnpjValido('12.ABC.345/01DE-36'), false)
  assert.equal(br.cnpjValido('12.ABC.345/01DE-3A'), false)
  assert.equal(br.cnpjValido('00.000.000/0000-00'), false)
  assert.equal(br.formatarDocumento('52998224725'), '529.982.247-25')
  assert.equal(br.formatarDocumento('12abc34501de35'), '12.ABC.345/01DE-35')
  assert.equal(br.formatarDocumento('123'), '123')
})

test('CEP, telefone e placa', () => {
  assert.equal(br.formatarCep('17800000'), '17800-000')
  assert.equal(br.formatarTelefone('11912345678'), '(11) 91234-5678')
  assert.equal(br.formatarTelefone('1131234567'), '(11) 3123-4567')
  assert.equal(br.telefoneValido('(11) 91234-5678'), true)
  assert.equal(br.telefoneValido('(11) 3123-4567'), true)
  assert.equal(br.telefoneValido('(01) 91234-5678'), false)
  assert.equal(br.telefoneValido('(11) 8123-4567'), false)
  assert.equal(br.placaValida('ABC-1234'), true)
  assert.equal(br.placaValida('abc1d23'), true)
  assert.equal(br.placaValida('AB1234'), false)
})

test('dinheiro em centavos, com o espaço fixo do Intl', () => {
  assert.equal(br.formatarReais(123450), 'R$ 1.234,50')
  for (const [texto, esperado] of [['1.234,56', 123456], ['1234,5', 123450], ['R$ 1.234,56', 123456], ['R$ 90', 9000],
    ['1234', 123400], ['1.500', 150000], ['12.5', 1250], ['1.234.567,89', 123456789], ['-10,00', -1000], ['0,07', 7]]) {
    assert.equal(br.textoParaCentavos(texto), esperado, texto)
  }
  for (const texto of ['', 'abc', '1,234,56', '12.34.5', '1.2345']) assert.equal(br.textoParaCentavos(texto), null, texto)
})

test('datas sem o deslize de fuso do new Date("AAAA-MM-DD")', () => {
  assert.equal(br.formatarData('2026-11-04'), '04/11/2026')
  assert.equal(br.dataLocal('2026-11-04').getDate(), 4)
  assert.equal(br.textoParaData('04/11/2026'), '2026-11-04')
  assert.equal(br.textoParaData('31/02/2026'), null)
  assert.equal(br.textoParaData('4/11/2026'), null)
  assert.throws(() => br.dataLocal('04/11/2026'), /AAAA-MM-DD/)
})

test('busca sem acento e ordem natural em português', () => {
  assert.equal(br.semAcento('São José'), 'sao jose')
  assert.deepEqual(['Item 10', 'Ágata', 'item 2', 'Agata'].sort(br.compararNomes), ['Ágata', 'Agata', 'item 2', 'Item 10'])
})

test('CEP: ViaCEP primeiro, BrasilAPI só quando o ViaCEP falha', async (t) => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  const resposta = (status, corpo) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo })
  const pedidos = []
  const responder = (porUrl) => { globalThis.fetch = async (url) => { pedidos.push(String(url)); return porUrl(String(url)) } }

  responder(() => resposta(200, { logradouro: 'Rua A', bairro: 'Centro', localidade: 'São Paulo', uf: 'SP' }))
  assert.deepEqual(await br.buscarCep('01001-000'), { status: 'ok', endereco: { logradouro: 'Rua A', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' } })
  assert.equal(pedidos.length, 1)

  pedidos.length = 0
  responder(() => resposta(200, { erro: 'true' }))
  assert.deepEqual(await br.buscarCep('99999999'), { status: 'nao-encontrado' })
  assert.equal(pedidos.length, 1)

  pedidos.length = 0
  responder((url) => {
    if (url.includes('viacep')) throw new TypeError('fetch failed')
    return resposta(200, { street: 'Rua B', neighborhood: 'Vila', city: 'Tupã', state: 'SP' })
  })
  assert.deepEqual(await br.buscarCep('17600000'), { status: 'ok', endereco: { logradouro: 'Rua B', bairro: 'Vila', cidade: 'Tupã', uf: 'SP' } })
  assert.equal(pedidos.length, 2)

  responder(() => resposta(503, {}))
  assert.deepEqual(await br.buscarCep('17600000'), { status: 'falhou' })
  assert.deepEqual(await br.buscarCep('123'), { status: 'nao-encontrado' })

  const cancelar = new AbortController()
  responder(async () => { cancelar.abort(); throw new DOMException('cancelado', 'AbortError') })
  await assert.rejects(br.buscarCep('17600000', cancelar.signal))
})
