// Todo o texto do site. Empresa FICTÍCIA, criada só para demonstração: nome, telefone,
// endereço e redes não são reais.
const numero = '5514900000000' // fictício
export const whats = (msg: string) => `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`

export const marca = { nome: 'Aroeira', sub: 'Marcenaria · Marília' }

export const menu = [
  { rotulo: 'Início', href: '#inicio' },
  { rotulo: 'Ofício', href: '#oficio' },
  { rotulo: 'Ambientes', href: '#ambientes' },
  { rotulo: 'Sobre', href: '#sobre' },
]

export const abertura = {
  assinatura: 'feito em Marília',
  titulo: ['O desenho da sua casa', '& o ofício da madeira'],
  texto: 'Móveis planejados sob medida, vistos em 3D antes de irem para a produção e entregues em 45 dias.',
  botao: 'Pedir orçamento',
  msg: 'Olá! Vi o site da Aroeira e quero um orçamento de móveis planejados.',
  cartoes: [
    { foto: 'cozinha', rotulo: 'Cozinhas', alt: 'Cozinha planejada com armários de madeira (foto ilustrativa)' },
    { foto: 'closet', rotulo: 'Closets', alt: 'Closet com prateleiras e cabideiros (foto ilustrativa)' },
    { foto: 'escritorio', rotulo: 'Home office', alt: 'Mesa de trabalho em madeira junto à janela (foto ilustrativa)' },
  ],
} as const

export const oficio = {
  titulo: ['Do primeiro traço', 'à última dobradiça'],
  projeto: {
    titulo: 'Você vê antes de fabricar',
    texto: 'Medimos o ambiente, desenhamos módulo por módulo e mostramos o projeto em 3D no showroom. O corte só começa depois do seu aprovado.',
    legenda: 'Pontos conferidos na medição: prumo, nível, tomadas e passagem de água.',
  },
  cartoes: [
    { foto: 'maos', titulo: 'Feito na nossa oficina', texto: 'Corte, fita de borda e montagem acontecem em Marília, pela mesma equipe que mediu a sua casa.', alt: 'Mãos de marceneiro trabalhando uma peça de madeira (foto ilustrativa)' },
    { foto: 'detalhe', titulo: 'Acabamento conferido à mão', texto: 'Cada peça é lixada e revisada antes de sair. Corrediças e dobradiças com amortecedor são reguladas na instalação.', alt: 'Marceneiro conferindo com a mão o acabamento de uma peça curva (foto ilustrativa)' },
  ],
} as const

export const processo = {
  titulo: ['Cuidamos de', 'todas as etapas'],
  passos: [
    { titulo: 'Medição na sua casa', texto: 'Vamos até o imóvel, medimos parede por parede e anotamos tomadas, canos e vigas.' },
    { titulo: 'Projeto em 3D', texto: 'Você escolhe acabamento e ferragens vendo o ambiente pronto, com valor fechado.' },
    { titulo: 'Produção na oficina', texto: 'Chapas cortadas na medida do projeto e peças conferidas antes de embalar.' },
    { titulo: 'Montagem e ajuste', texto: 'Nossa equipe instala em até 45 dias e volta para regular portas e gavetas.' },
  ],
} as const

export const historia = {
  titulo: ['De Marília,', 'desde 2014'],
  textos: [
    'Começamos numa oficina de fundo de quintal, fazendo um guarda-roupa por vez.',
    'Hoje desenhamos, fabricamos e montamos a casa inteira, com um só responsável do começo ao fim.',
    'O jeito de trabalhar é o mesmo: medir duas vezes, cortar uma, e não entregar o que não colocaríamos na nossa casa.',
  ],
  assinaturas: [
    { nome: 'Helena Prado', papel: 'Projetos e atendimento' },
    { nome: 'Davi Prado', papel: 'Oficina e montagem' },
  ],
  foto: { nome: 'oficina', alt: 'Bancada de marcenaria com ferramentas (foto ilustrativa)' },
} as const

export const chamada = {
  titulo: ['Seu próximo móvel', 'começa aqui'],
  botao: 'Pedir orçamento',
} as const

export const ambientes = {
  titulo: ['Ambientes que', 'planejamos sob medida'],
  nota: 'Fotos ilustrativas, de banco aberto: não são obras da Aroeira.',
  itens: [
    { foto: 'cozinha', rotulo: 'Cozinhas', texto: 'Armários até o teto, ilha e torre quente.', msg: 'Quero orçamento de cozinha planejada.' },
    { foto: 'closet', rotulo: 'Closets', texto: 'Cabideiro, gaveteiro e sapateira no seu vão.', msg: 'Quero orçamento de closet.' },
    { foto: 'escritorio', rotulo: 'Home office', texto: 'Bancada, nichos e passa-fios no lugar certo.', msg: 'Quero orçamento de home office.' },
    { foto: 'banheiro', rotulo: 'Banheiros', texto: 'Gabinete e espelheira que aguentam umidade.', msg: 'Quero orçamento de móveis de banheiro.' },
    { foto: 'sala', rotulo: 'Salas', texto: 'Painel, rack e estante na medida da parede.', msg: 'Quero orçamento de móveis para sala.' },
    { foto: 'quarto', rotulo: 'Dormitórios', texto: 'Guarda-roupa, cabeceira e criados-mudos.', msg: 'Quero orçamento de dormitório planejado.' },
  ],
} as const

export const rodape = {
  frase: 'Doze anos fabricando móveis sob medida em Marília, com projeto em 3D antes do primeiro corte.',
  contato: [
    { rotulo: 'WhatsApp (14) 90000-0000', href: 'whats' },
    { rotulo: 'Showroom: Av. Exemplo, 1200, Marília-SP', href: '' },
    { rotulo: 'Seg. a sex., 8h às 18h', href: '' },
    { rotulo: 'Sábado, 8h às 12h', href: '' },
  ],
  social: [{ rotulo: 'Instagram @aroeira.marcenaria', href: '' }],
  aviso: 'Demonstração de design: empresa e dados fictícios.',
}
