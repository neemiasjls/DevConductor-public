// Todo o texto do site. Empresa FICTÍCIA (demonstração): nome, número, endereço e preços não são reais.

export const negocio = {
  nome: 'Barbearia Seco',
  cidade: 'Curitiba/PR',
  frase: 'Corte seco. Sem enrolação.',
  whatsapp: '5541900000000', // número claramente fictício
  telefoneVisivel: '(41) 90000-0000',
  instagram: '@barbeariaseco.demo',
  endereco: ['Rua Fictícia, 000, Centro', 'Curitiba/PR'],
  horarios: [
    ['Terça a sexta', '9h às 20h'],
    ['Sábado', '8h às 18h'],
    ['Domingo e segunda', 'fechado'],
  ] as const,
}

export const aviso = 'Demonstração — empresa fictícia'
export const avisoLongo = 'Site de demonstração de uma empresa fictícia. Nome, endereço, número e preços não são reais.'

export const linkWhats = (texto: string) =>
  `https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(texto)}`

export const abertura = {
  topo: ['Barbearia', 'Curitiba/PR', 'Ter a sáb, 9h às 20h'],
  titulo: 'Seco',
  tituloLeitor: 'Barbearia Seco, Curitiba',
  frase: ['Corte seco.', 'Sem enrolação.'],
  texto: 'Máquina, tesoura e navalha. Você senta, a gente corta, você sai pronto. Sem papo de vendedor e sem produto empurrado.',
  botao: 'Agendar no WhatsApp',
  botaoCurto: 'Agendar',
  mensagem: 'Olá! Quero agendar um horário na Barbearia Seco.',
}

export const faixaServicos = ['Corte', 'Barba na navalha', 'Pigmentação', 'Combo corte + barba', 'Sobrancelha na navalha', 'Pezinho']
export const faixaCasa = ['Terça a sábado', '9h às 20h', 'Café passado na hora', 'Chegou, sentou', 'Sem hora marcada? Chega cedo']

export const navalha = {
  palavra: 'Navalha',
  palavraCelular: ['Nava', 'lha.'],
  titulo: 'Barba na navalha.',
  texto: 'Toalha quente, espuma, lâmina nova e mão firme. Contorno reto, acabamento limpo e nenhuma pressa.',
  detalhe: 'Uma lâmina por cliente. Sempre.',
  alt: 'Barbeiro de barba longa e chapéu passa a navalha no cabelo de um cliente, em preto e branco.',
}

export const trabalho = {
  titulo: ['O', 'detalhe', 'é o corte.'],
  texto: 'Passa o mouse ou toca na foto e olha de perto: pente, máquina e pezinho limpo. É assim em todo corte.',
  textoToque: 'Toca na foto para ampliar o detalhe.',
  botaoRotulo: 'Ampliar a foto do detalhe',
  lupaRotulo: '×2',
  itens: [
    ['Tesoura e máquina', 'acabamento feito à mão, sem pressa'],
    ['Pezinho na navalha', 'linha reta na nuca e no contorno'],
    ['Finalização seca', 'pomada fosca, nada de gel brilhando'],
  ] as const,
  alt: 'Close de mãos segurando pente e máquina na lateral da cabeça de um cliente, em preto e branco.',
}

export const cortes = {
  titulo: 'Cortes',
  subtitulo: 'do dia',
  texto: 'Quatro cortes que saem toda semana. Mostra a foto, a gente faz.',
  itens: [
    { nome: 'Degradê na navalha', foto: 'corte-nuca', nota: 'zero na nuca, sobe sem marca',
      alt: 'Máquina subindo pela nuca de um cliente de capa listrada, em preto e branco.' },
    { nome: 'Topete no pente', foto: 'corte-topete', nota: 'volume em cima, lateral baixa',
      alt: 'Cliente de perfil com pente no topete enquanto a máquina passa na lateral.' },
    { nome: 'Social na máquina', foto: 'corte-maquina', nota: 'curto, alinhado, sem frescura',
      alt: 'Barbeiro de barba longa passa a máquina no cabelo de um cliente sentado.' },
    { nome: 'Clássico no espelho', foto: 'corte-espelho', nota: 'tesoura em cima, máquina embaixo',
      alt: 'Barbeiro de camisa xadrez corta o cabelo de um cliente diante de um espelho grande.' },
  ],
}

export const precos = {
  titulo: ['Preço', 'na parede.'],
  texto: 'Sem letra miúda e sem “a partir de”. Nesta demonstração os valores ficam a definir com a casa.',
  colunas: ['Serviço', 'Tempo', 'Preço'],
  linhas: [
    { servico: 'Corte', tempo: '40 MIN', preco: 'A DEFINIR' },
    { servico: 'Barba na navalha', tempo: '30 MIN', preco: 'A DEFINIR' },
    { servico: 'Pigmentação', tempo: '20 MIN', preco: 'A DEFINIR' },
    { servico: 'Combo corte + barba', tempo: '70 MIN', preco: 'A DEFINIR', destaque: true },
    { servico: 'Sobrancelha na navalha', tempo: '10 MIN', preco: 'A DEFINIR' },
  ],
  nota: 'Tempos e valores de demonstração.',
}

export const senta = {
  frase: 'Senta aí.',
  linhasCelular: ['Senta', 'aí.'],
  texto: 'Cadeira livre de terça a sábado. Chega, senta e sai seco.',
}

export const contato = {
  titulo: ['Agenda', 'pelo zap.'],
  texto: 'Manda o dia e o serviço. A gente responde rápido e segura a cadeira pra você.',
  botao: ['Chama', 'no zap'],
  mensagem: 'Olá! Quero agendar um corte na Barbearia Seco.',
  nota: 'Número fictício de demonstração',
}

// Créditos das fotos (Wikimedia Commons). Fotos convertidas para preto e branco e recortadas.
export const creditos = [
  { foto: 'Abertura, Navalha e três fotos de Cortes', autor: 'Mostafameraji', licenca: 'CC BY-SA 4.0',
    licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    paginas: [
      ['Jorj Barber', 'https://commons.wikimedia.org/wiki/File:Jorj_Barber.jpg'],
      ['Barber shop from Iran 11', 'https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_11.jpg'],
      ['Barber shop from Iran 13', 'https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_13.jpg'],
      ['Barber shop from Iran 17', 'https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_17.jpg'],
      ['Barber shop from Iran 18', 'https://commons.wikimedia.org/wiki/File:Barber_shop_from_Iran_18.jpg'],
    ] },
  { foto: 'O trabalho e a quarta foto de Cortes', autor: 'Nenad Stojkovic', licenca: 'CC BY 2.0',
    licencaUrl: 'https://creativecommons.org/licenses/by/2.0/',
    paginas: [
      ['Barber cutting hair with comb', 'https://commons.wikimedia.org/wiki/File:Barber_cutting_hair_with_comb._Back_view_of_man_in_barber_shop.jpg'],
      ['Young men with trendy haircut', 'https://commons.wikimedia.org/wiki/File:Young_men_with_trendy_haircut_at_barber_shop.jpg'],
    ] },
]
export const alteracaoFotos = 'Fotos convertidas para preto e branco de alto contraste e recortadas; as derivadas de CC BY-SA 4.0 seguem sob CC BY-SA 4.0.'
