// Todo o texto do site. Empresa fictícia: contatos, endereço e registros são demonstrativos.

const numeroWhats = '5549900000000' // fictício (padrão de demonstração)
export const whats = (texto: string) => `https://wa.me/${numeroWhats}?text=${encodeURIComponent(texto)}`

export const empresa = {
  nome: 'Austral Frio',
  aviso: 'Empresa fictícia · demonstração de design',
  cidade: 'Chapecó/SC',
  telefone: '(49) 0000-0000',
  telefoneHref: 'tel:+554900000000',
  whatsapp: '(49) 9 0000-0000',
  email: 'cotacao@austral-frio.example',
  endereco: 'Rodovia Demonstração, km 0 · Distrito Industrial · Chapecó/SC (endereço fictício)',
  horarios: [
    ['Segunda a sexta', '7h às 19h'],
    ['Sábado', '7h às 12h'],
    ['Monitoramento das viagens', '24 horas (demonstração)'],
  ] as const,
  rotas: 'Saídas de Chapecó/SC para PR, SP e RJ',
}

export const navegacao = [
  { href: '#viagem', rotulo: 'A viagem' },
  { href: '#faixas', rotulo: 'Faixas de temperatura' },
  { href: '#cotar', rotulo: 'Como cotar' },
]

export const abertura = {
  sobretitulo: 'Transporte refrigerado · Chapecó/SC para PR, SP e RJ',
  titulo: ['Quem contrata frio', 'compra temperatura,', 'não quilômetro.'],
  texto:
    'Congelados, resfriados e climatizados com o baú registrando a temperatura do pátio ao cliente. Você recebe a carga e o registro da viagem inteira.',
  cta: 'Pedir cotação',
  leitura: 'Leitura do registrador',
  faixaAlvo: 'faixa contratada −18,4 a −17,6 °C',
  legendaGrafico:
    'Gráfico ilustrativo: temperatura de um baú de congelados oscilando dentro da faixa contratada. Dados de demonstração.',
  pausar: 'Pausar registro',
  retomar: 'Retomar registro',
}

export const porta = {
  rotulo: 'Da câmara ao baú',
  titulo: 'Abrir o baú sem quebrar o frio.',
  texto:
    'Cada minuto de porta aberta fica no registro.',
  interacao: 'Toque a foto para tirar a geada.',
  alt: 'Câmara fria de um entreposto, com pilhas de caixas plásticas, piso molhado e evaporadores no teto.',
  credito: 'Foto ilustrativa: Kopiersperre, CC BY-SA 3.0.',
}

export const compromisso = {
  frase: 'Coletamos frio. Viajamos frio. Entregamos frio.',
  destaque: ['frio.'],
  apoio: 'Do pátio à entrega, a mesma faixa contratada.',
}

export type Marco = {
  id: string
  hora: number
  titulo: string
  texto: string
  local?: string
}

export const viagem = {
  rotulo: 'A viagem',
  titulo: 'O que o cliente nunca vê: 36 horas de temperatura.',
  aviso: 'Registro de demonstração.',
  eixo: 'horas de viagem',
  marcos: [
    { id: 'pre', hora: 0, titulo: 'Pré-resfriamento', texto: 'Em Chapecó, o baú chega a −18 °C vazio, antes da doca.', local: 'Chapecó' },
    { id: 'coleta', hora: 2, titulo: 'Coleta', texto: 'Porta aberta 25 min na doca. Sobe 0,7 °C e volta em 40 min.', local: 'Chapecó' },
    { id: 'pedagio', hora: 8, titulo: 'Pedágio', texto: 'No Paraná, parada curta com a porta lacrada. A linha nem percebe.', local: 'Paraná' },
    { id: 'parada', hora: 15, titulo: 'Parada do motorista', texto: 'Perto de Curitiba, 11 horas de descanso. O motorista para; o frio, não.', local: 'perto de Curitiba' },
    { id: 'entrega', hora: 33, titulo: 'Porta aberta na entrega', texto: 'Em São Paulo, sobe 1,2 °C na descarga. O cliente recebe este gráfico.', local: 'São Paulo' },
  ] satisfies Marco[],
  cidades: [
    { nome: 'Chapecó', lat: -27.1, lon: -52.62, hora: 0 },
    { nome: 'Curitiba', lat: -25.43, lon: -49.27, hora: 13 },
    { nome: 'São Paulo', lat: -23.55, lon: -46.63, hora: 33 },
  ],
  mapaLegenda: 'Posição aproximada das cidades (sem escala de fronteiras).',
}

export type Faixa = {
  id: 'congelado' | 'resfriado' | 'climatizado'
  nome: string
  temperatura: string
  min: number
  max: number
  produtos: string
  bau: string
  registro: string
  whats: string
}

export const faixas = {
  rotulo: 'Faixas de temperatura',
  titulo: 'Escolha o serviço pela temperatura da carga.',
  texto: 'Três faixas no mesmo baú isolado. Escolha a da sua carga: a ficha mostra produtos, equipamento e registro.',
  ficha: ['Produtos', 'Baú', 'Registro'],
  itens: [
    {
      id: 'congelado',
      nome: 'Congelado',
      temperatura: '−18 °C',
      min: -18.4,
      max: -17.6,
      produtos: 'Carnes, pescados, sorvetes, pratos prontos e vegetais congelados.',
      bau: 'Isolamento de painel espesso, equipamento de frio dimensionado para −25 °C.',
      registro: 'Leitura a cada 5 minutos, gráfico enviado na entrega.',
      whats: 'Olá! Quero cotar um frete de carga congelada (−18 °C).',
    },
    {
      id: 'resfriado',
      nome: 'Resfriado',
      temperatura: '0 a 4 °C',
      min: 0,
      max: 4,
      produtos: 'Laticínios, frios, hortifrúti sensível, embutidos e carnes resfriadas.',
      bau: 'Baú com controle fino perto de zero e circulação de ar uniforme.',
      registro: 'Leitura a cada 5 minutos, alerta se sair da faixa.',
      whats: 'Olá! Quero cotar um frete de carga resfriada (0 a 4 °C).',
    },
    {
      id: 'climatizado',
      nome: 'Climatizado',
      temperatura: '15 a 25 °C',
      min: 15,
      max: 25,
      produtos: 'Chocolates, vinhos, medicamentos e cosméticos que não podem esquentar.',
      bau: 'Mesmo baú isolado, trabalhando para manter estável, não para gelar.',
      registro: 'Leitura a cada 10 minutos, gráfico enviado na entrega.',
      whats: 'Olá! Quero cotar um frete climatizado (15 a 25 °C).',
    },
  ] satisfies Faixa[],
  botao: 'Cotar esta faixa no WhatsApp',
}

export const doca = {
  rotulo: 'Pátio e estrada',
  titulo: 'O baú sai do pátio já na temperatura da carga.',
  texto:
    'Pré-resfriado no pátio, encosta na doca frio e segue lacrado. Na estrada, o registrador continua lendo a cada 5 minutos.',
  alt: 'Caminhão com semirreboque baú numa rodovia, montanhas e nuvens carregadas ao fundo, em preto e branco.',
  credito: 'Foto ilustrativa: Robson Hatsukami Morgan, StockSnap, CC0 (cor tratada).',
}

export const cotar = {
  rotulo: 'Como cotar',
  titulo: 'Quatro respostas e a cotação sai.',
  passos: [
    { n: '1', titulo: 'Origem e destino', texto: 'Cidade de coleta e de entrega, com endereço se já tiver.' },
    { n: '2', titulo: 'Tipo e temperatura', texto: 'O que vai no baú e em qual faixa: congelado, resfriado ou climatizado.' },
    { n: '3', titulo: 'Volume', texto: 'Paletes, peso aproximado e se a carga é fechada ou fracionada.' },
    { n: '4', titulo: 'Janela de entrega', texto: 'Dia e horário em que o cliente recebe, e se há agendamento.' },
  ],
  prazoRotulo: 'Prazo de resposta',
  prazo: 'até 2 h úteis',
  prazoNota: 'Prazo de demonstração. Com as quatro respostas, a cotação volta com preço, data de coleta e faixa confirmada.',
}

export const contato = {
  rotulo: 'Contato',
  titulo: 'Diga a temperatura. A gente cuida do resto.',
  texto: 'Cotação pelo WhatsApp ou por e-mail. Atendimento de demonstração: nenhuma mensagem é enviada a uma empresa real.',
  botao: 'Pedir cotação no WhatsApp',
  mensagem: 'Olá! Quero uma cotação de frete refrigerado. Origem: / Destino: / Temperatura: ',
  leitura: '−18,0 °C',
}

export const rodape = {
  creditosTitulo: 'Créditos e licenças',
  creditos: [
    { texto: 'Câmara fria: Kopiersperre, CC BY-SA 3.0', href: 'https://commons.wikimedia.org/wiki/File:Gro%C3%9Fer_K%C3%BChlraum_(Elbe-Obst_Jork).jpg', licenca: 'https://creativecommons.org/licenses/by-sa/3.0/' },
    { texto: 'Caminhão na estrada: Robson Hatsukami Morgan, StockSnap, CC0', href: 'https://stocksnap.io/photo/road-truck-U02UKEL04U', licenca: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  ],
  alteracoes: 'Cor tratada nas duas fotos; a versão alterada da câmara fria segue a mesma licença CC BY-SA 3.0.',
  mapaLegenda: 'Mapa ilustrativo da base e das rotas (posições aproximadas).',
  direitos: 'Austral Frio é uma empresa fictícia criada para demonstração de design. Nomes, contatos e registros não são reais.',
}
