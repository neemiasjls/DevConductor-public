// Todo o texto do site. Empresa fictícia: nomes, números e contatos são de demonstração.

export const empresa = {
  nome: 'Lastro Cargas',
  marca: 'Lastro',
  complemento: 'Cargas',
  cidade: 'Ribeirão Preto/SP',
  coordenadas: '21°10′S 47°48′O',
  telefone: '(16) 0000-0000',
  telefoneLink: 'tel:+551600000000',
  whatsapp: '(16) 90000-0000',
  whatsappNumero: '5516900000000',
  email: 'cotacao@lastro.example',
  endereco: 'Av. Demonstração, 1000, Distrito Empresarial',
  cidadeCep: 'Ribeirão Preto/SP, 14000-000',
  horario: ['Segunda a sexta, 7h às 19h', 'Sábado, 7h às 12h'],
  faixa: 'Demonstração — empresa fictícia',
  aviso: 'Nomes, números, endereço e contatos desta página não são reais.',
}

export const whatsapp = (mensagem: string) =>
  `https://wa.me/${empresa.whatsappNumero}?text=${encodeURIComponent(mensagem)}`

export const menu = [
  { rotulo: 'A carga', alvo: '#carga' },
  { rotulo: 'Rotas', alvo: '#rotas' },
  { rotulo: 'Serviços', alvo: '#servicos' },
  { rotulo: 'Contato', alvo: '#contato' },
]

export const abertura = {
  titulo: ['Sua carga,', 'do galpão', 'ao destino.'],
  rota: 'Ribeirão Preto · SP, MG, GO e PR',
  texto:
    'Transporte rodoviário de carga fechada e fracionada saindo de Ribeirão Preto para São Paulo, Minas Gerais, Goiás e Paraná.',
  botao: 'Pedir cotação',
  mensagem: 'Olá! Quero uma cotação de frete.',
  ficha: [
    { rotulo: 'Base', valor: 'Ribeirão Preto/SP' },
    { rotulo: 'Estados', valor: 'SP, MG, GO e PR' },
    { rotulo: 'Carga', valor: 'Fechada e fracionada' },
  ],
  rolar: 'Role para ver a carga',
  posterAlt: 'Caixa de polpa moldada com doze ovos, vista em três dimensões.',
}

export const capitulos = [
  {
    numero: '01',
    nome: 'A carga',
    titulo: 'Cada volume sai conferido.',
    texto:
      'Na coleta contamos, pesamos e fotografamos a carga antes de fechar a nota. Só depois ela entra na carreta.',
  },
  {
    numero: '02',
    nome: 'Do lado',
    titulo: 'Embalagem que protege cada unidade.',
    texto:
      'A caixa de ovos ilustra uma carga frágil: proteção, conferência e organização antes de seguir viagem.',
  },
  {
    numero: '03',
    nome: 'De cima',
    titulo: 'Fracionada: você paga o espaço que usa.',
    texto: 'Seu volume divide a carreta com outros embarques da mesma rota, cada um com o seu lacre.',
  },
]

// Âncoras em coordenadas do caixote normalizado (comprimento 3, apoiado em y = 0).
export const legendas = [
  { id: 'lacre', titulo: 'Proteção da embalagem', texto: 'Acondicionamento que considera a fragilidade da carga.', ancora: [0, 0.3, 0.7] },
  { id: 'seguro', titulo: 'Seguro de carga', texto: 'Cobertura do embarque até a assinatura do recebedor.', ancora: [-1.05, 0.35, 0.45] },
  { id: 'rastreio', titulo: 'Rastreio do início ao fim', texto: 'Posição da carreta em cada etapa, por mensagem.', ancora: [1.0, 0.5, -0.15] },
] as const

export const palavraGigante = 'DESTINO'
export const seuVolume = 'Seu volume'

export const marcadores = [
  { cidade: 'Ribeirão Preto', uf: 'SP', coordenada: '21°10′S 47°48′O' },
  { cidade: 'Uberaba', uf: 'MG', coordenada: '19°45′S 47°56′O' },
  { cidade: 'Uberlândia', uf: 'MG', coordenada: '18°55′S 48°17′O' },
  { cidade: 'Goiânia', uf: 'GO', coordenada: '16°41′S 49°16′O' },
]

export const manifesto = {
  rotulo: 'Como trabalhamos',
  passos: [
    { verbo: 'Coletamos', nota: 'na sua doca, com hora marcada' },
    { verbo: 'Conferimos', nota: 'volume, peso e nota fiscal' },
    { verbo: 'Lacramos', nota: 'com o número registrado na nota' },
    { verbo: 'Entregamos', nota: 'com comprovante assinado e foto' },
  ],
}

export const rotas = {
  numero: '04',
  titulo: 'Do interior paulista ao Centro-Oeste.',
  texto:
    'A carreta sai de Ribeirão Preto e para em Uberaba, Uberlândia e Goiânia. Coleta e entrega em cada cidade da linha.',
  nota: 'Distâncias aproximadas pela rodovia.',
  paradas: [
    { cidade: 'Ribeirão Preto', uf: 'SP', km: 0, papel: 'Base e coleta' },
    { cidade: 'Uberaba', uf: 'MG', km: 190, papel: 'Coleta e entrega' },
    { cidade: 'Uberlândia', uf: 'MG', km: 295, papel: 'Coleta e entrega' },
    { cidade: 'Goiânia', uf: 'GO', km: 635, papel: 'Fim da linha' },
  ],
  extras: [
    {
      titulo: 'Frete de retorno',
      texto: 'A carreta volta de Goiânia com espaço livre. Quem embarca na volta para o interior paulista paga preço de retorno.',
    },
    { titulo: 'Ramal sul', texto: 'Saídas quinzenais de Ribeirão Preto para Curitiba/PR, com coleta no caminho.' },
  ],
  carretaAlt: 'Desenho técnico de perfil de um cavalo mecânico com semirreboque de três eixos.',
}

export const estrada = {
  palavras: ['Na', 'estrada'],
  titulo: 'Motoristas da casa, do começo ao fim da viagem.',
  texto: 'Carretas sider e baú com rastreador, paradas planejadas e contato direto com quem está dirigindo.',
  alt: 'Cavalo mecânico preto puxando dois semirreboques com lona numa rodovia duplicada do interior de São Paulo.',
  credito: 'Foto: Governo do Estado de São Paulo, CC BY 2.0, alterada (logotipo e placas removidos).',
}

export const servicos = {
  numero: '05',
  titulo: 'Quatro docas, um pátio.',
  texto: 'Escolha como a sua carga viaja. Cada serviço tem coleta agendada e lacre numerado.',
  lista: [
    {
      doca: '01',
      nome: 'Carga fechada',
      texto: 'A carreta inteira para o seu embarque, sem parar para carregar outros clientes.',
      itens: ['Coleta com hora marcada', 'Lacre numerado', 'Seguro de carga', 'Rastreio por mensagem'],
      link: 'Cotar carga fechada',
      mensagem: 'Olá! Quero cotar uma carga fechada.',
    },
    {
      doca: '02',
      nome: 'Carga fracionada',
      texto: 'Para quem não enche uma carreta: seu volume viaja com outros embarques da mesma rota.',
      itens: ['A partir de um volume', 'Conferência na coleta', 'Entrega com comprovante'],
      link: 'Cotar carga fracionada',
      mensagem: 'Olá! Quero cotar uma carga fracionada.',
    },
    {
      doca: '03',
      nome: 'Frete de retorno',
      texto: 'Espaço na volta de Goiânia e Uberlândia para o interior paulista, com preço de retorno.',
      itens: ['Saídas semanais', 'Carga fechada ou fracionada', 'Mesma conferência da ida'],
      link: 'Cotar frete de retorno',
      mensagem: 'Olá! Quero cotar um frete de retorno.',
    },
    {
      doca: '04',
      nome: 'Armazenagem',
      texto: 'Galpão em Ribeirão Preto para guardar a carga entre a coleta e a próxima saída.',
      itens: ['Área coberta', 'Controle de entrada e saída', 'Prazo combinado na cotação'],
      link: 'Cotar armazenagem',
      mensagem: 'Olá! Quero cotar armazenagem.',
    },
  ],
}

export const garantias = {
  numero: '06',
  titulo: 'O que vale em toda viagem.',
  aviso: 'Números de demonstração.',
  itens: [
    { valor: 4, unidade: 'estados', texto: 'SP, MG, GO e PR na mesma linha.' },
    { valor: 24, unidade: 'horas', texto: 'de rastreio por dia, inclusive no fim de semana.' },
    { valor: 1, unidade: 'lacre', texto: 'numerado por volume, conferido na entrega.' },
  ],
}

export const contato = {
  numero: '07',
  titulo: 'Conte o que vai embarcar.',
  texto: 'Origem, destino, peso e volume. A cotação sai no mesmo dia útil.',
  botao: 'Pedir cotação',
  mensagem: 'Olá! Quero uma cotação. Origem: , destino: , peso: , volume: .',
}

export const creditos = [
  { item: 'Modelo 3D da caixa de ovos', autor: 'Innerscene (modelo original)', licenca: 'CC0' },
  { item: 'Iluminação do galpão', autor: 'Poly Haven (empty_warehouse_01)', licenca: 'CC0' },
  { item: 'Foto da estrada', autor: 'Governo do Estado de São Paulo, via Wikimedia Commons', licenca: 'CC BY 2.0, alterada' },
  { item: 'Fontes Funnel Display e Chivo', autor: 'Google Fonts', licenca: 'SIL Open Font License' },
]
