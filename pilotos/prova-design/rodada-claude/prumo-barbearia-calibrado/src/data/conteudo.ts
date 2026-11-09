// Todo o texto do site. Empresa fictícia: contatos, endereço e preços são demonstrativos.

export const marca = 'Prumo'
export const telefone = '+55 41 90000-0000' // fictício
const numeroWhats = '5541900000000' // fictício: o link abre o WhatsApp, nunca envia sozinho

export const whatsapp = (mensagem: string) => `https://wa.me/${numeroWhats}?text=${encodeURIComponent(mensagem)}`

export const navegacao = [
  { href: '#cadeira', rotulo: 'A cadeira' },
  { href: '#degrade', rotulo: 'Degradê' },
  { href: '#servicos', rotulo: 'Serviços' },
  { href: '#horarios', rotulo: 'Horários' },
] as const

export const abertura = {
  rotulo: 'Barbearia de corte técnico · Curitiba/PR',
  titulo: ['Corte técnico,', 'medido no pente.'],
  texto:
    'Degradê, navalhado e barba com toalha quente. Cada passada da máquina tem uma medida, e a gente diz qual antes de começar.',
  botao: 'Agendar pelo WhatsApp',
  mensagem: 'Olá, Prumo! Quero agendar um horário.',
  rolar: 'Role para ver a cadeira',
  posterAlt: 'Cadeira de barbeiro antiga, de madeira, couro capitonê e metal, iluminada por uma luz quente lateral.',
  pausar: 'Pausar giro da cadeira',
  retomar: 'Retomar giro da cadeira',
}

export const cadeira = {
  rotulo: 'A cadeira',
  titulo: 'Uma ficha técnica antes do primeiro fio.',
  texto: 'A cadeira gira, sobe e trava. O barbeiro trabalha atrás dela, de cima, com a cabeça na altura certa.',
}

// Legendas técnicas da cadeira. Âncora em metros, no espaço do modelo (frente = +z, altura = +y).
export const legendas = [
  {
    id: 'altura',
    medida: '± 16 cm',
    titulo: 'Altura regulada',
    texto: 'A bomba hidráulica põe a cabeça na linha dos olhos do barbeiro.',
    ancora: [0.0, 0.2, 0.02] as const,
  },
  {
    id: 'encosto',
    medida: '15°',
    titulo: 'Encosto que inclina',
    texto: 'Pescoço exposto para a navalha passar sem esticar a pele.',
    ancora: [0.0, 0.98, -0.3] as const,
  },
  {
    id: 'apoio',
    medida: 'nuca',
    titulo: 'Apoio de cabeça',
    texto: 'Cabeça firme enquanto o pente 0 sobe pela nuca.',
    ancora: [0.0, 1.4, -0.37] as const,
  },
  {
    id: 'toalha',
    medida: '3 min',
    titulo: 'Toalha quente',
    texto: 'Três minutos antes da barba: o pelo amacia e a lâmina desliza.',
    ancora: [0.3, 0.74, 0.12] as const,
  },
] as const

export const manifesto = {
  frase: ['Cada', 'milímetro', 'tem', 'um', 'motivo.'],
  // LP-12: o apoio diz só a ideia; a escala de pentes aparece na cena seguinte (degradê), não aqui.
  texto: 'Quando a medida está certa, a transição some.',
}

// Cena do degradê (LP-12): a linha sobe como a máquina e o cabelo cheio vira degradê por onde passa. Três marcas só
// (no máximo 4 rótulos por tela). Alturas em % da ilustração a partir de cima (ferramentas/gerar-degrade.py).
export const degrade = {
  rotulo: 'O degradê',
  titulo: 'O que você pede quando diz “degradê no 1”.',
  texto: 'A máquina sobe da pele ao volume, um pente de cada vez. Bem feito, não aparece degrau.',
  fotoAlt: 'Ilustração de uma cabeça vista por trás, com degradê: pele lisa na nuca, o cabelo escurecendo aos poucos até o volume no alto.',
  // onde a linha começa (abaixo do cabelo cheio) e termina (no volume), em % da altura da ilustração a partir de cima
  subida: { de: 72, ate: 22 },
  marcas: [
    { nome: 'pente 0', nota: 'pele lisa na nuca', altura: 64 },
    { nome: 'pente 1', nota: 'onde a sombra aparece', altura: 55 },
    { nome: 'tesoura', nota: 'volume e textura no alto', altura: 25 },
  ],
}

export const servicos = {
  rotulo: 'Serviços',
  titulo: 'Preço e tempo na mesma linha.',
  aviso: 'Preços e durações demonstrativos (empresa fictícia). Fotos ilustrativas.',
  colunas: { servico: 'Serviço', tempo: 'Tempo', preco: 'Preço' },
  agendar: (nome: string) => `Agendar ${nome.toLowerCase()} no WhatsApp`,
  lista: [
    {
      id: 'corte',
      nome: 'Corte',
      detalhe: 'Tesoura e máquina, lavagem e finalização.',
      minutos: 40,
      preco: 60,
      foto: 'tesoura',
      fotoAlt: 'Barbeiro de barba ruiva acerta o cabelo do cliente com tesoura e pente.',
    },
    {
      id: 'degrade',
      nome: 'Degradê navalhado',
      detalhe: 'Do pente 0 à tesoura, acabamento na navalha.',
      minutos: 50,
      preco: 70,
      foto: 'maquina',
      fotoAlt: 'Máquina de acabamento rente à nuca de um cliente de cabelo escuro, na mão tatuada do barbeiro.',
    },
    {
      id: 'barba',
      nome: 'Barba com toalha quente',
      detalhe: 'Toalha, óleo, navalha e balm.',
      minutos: 30,
      preco: 45,
      foto: 'navalha',
      fotoAlt: 'Duas navalhas sobre toalha escura, ao lado de um pincel em cuia de metal.',
    },
    {
      id: 'pezinho',
      nome: 'Pezinho',
      detalhe: 'Contorno da nuca e das costeletas entre um corte e outro.',
      minutos: 15,
      preco: 20,
      foto: 'maquina',
      fotoAlt: 'Máquina de acabamento rente à nuca de um cliente de cabelo escuro, na mão tatuada do barbeiro.',
    },
    {
      id: 'combo',
      nome: 'Corte + barba',
      detalhe: 'Os dois serviços na mesma cadeira.',
      minutos: 80,
      preco: 105,
      foto: 'navalha',
      fotoAlt: 'Duas navalhas sobre toalha escura, ao lado de um pincel em cuia de metal.',
    },
  ],
}

export const horarios = {
  rotulo: 'Horários',
  titulo: 'Quando a cadeira está livre.',
  texto: 'Sem formulário: escolha o dia, mande uma mensagem e a gente confirma o horário.',
  aviso: 'Horários demonstrativos.',
  inicio: 8,
  fim: 21,
  hoje: 'hoje',
  fechado: 'fechado',
  // dia: 0 = domingo (igual a Date.getDay()).
  dias: [
    { dia: 1, curto: 'seg', nome: 'Segunda', faixas: [] as [number, number][] },
    { dia: 2, curto: 'ter', nome: 'Terça', faixas: [[9, 20]] as [number, number][] },
    { dia: 3, curto: 'qua', nome: 'Quarta', faixas: [[9, 20]] as [number, number][] },
    { dia: 4, curto: 'qui', nome: 'Quinta', faixas: [[9, 20]] as [number, number][] },
    { dia: 5, curto: 'sex', nome: 'Sexta', faixas: [[9, 21]] as [number, number][] },
    { dia: 6, curto: 'sáb', nome: 'Sábado', faixas: [[8, 13], [14, 18]] as [number, number][] },
    { dia: 0, curto: 'dom', nome: 'Domingo', faixas: [] as [number, number][] },
  ],
  mensagem: (dia: string) => `Olá, Prumo! Tem horário na ${dia.toLowerCase()}?`,
}

// Resumo do rodapé gerado das mesmas faixas da grade (dias seguidos com o mesmo horário viram um intervalo).
const maiuscula = (t: string) => t[0].toUpperCase() + t.slice(1)
function resumoHorarios() {
  const grupos: { inicio: string; fim: string; texto: string }[] = []
  for (const d of horarios.dias) {
    if (!d.faixas.length) continue
    const texto = d.faixas.map(([a, b]) => `${a}h–${b}h`).join(' e ')
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.texto === texto) ultimo.fim = d.curto
    else grupos.push({ inicio: d.curto, fim: d.curto, texto })
  }
  return grupos.map((g) => `${maiuscula(g.inicio)}${g.fim === g.inicio ? '' : '–' + maiuscula(g.fim)} ${g.texto}`).join(' · ')
}

export const agendar = {
  rotulo: 'Agendar',
  titulo: 'Sua vez na cadeira.',
  texto: 'Mande o serviço e o dia. Respondemos com o primeiro horário livre.',
  botao: 'Chamar no WhatsApp',
  mensagem: 'Olá, Prumo! Quero agendar um corte.',
}

export const rodape = {
  endereco: ['Rua Demonstração, 120 · Centro', 'Curitiba/PR (endereço fictício)'],
  mapa: 'https://www.openstreetmap.org/?mlat=-25.4296&mlon=-49.2713#map=16/-25.4296/-49.2713',
  mapaRotulo: 'Ver região no mapa',
  instagram: 'https://www.instagram.com/',
  instagramRotulo: '@prumo.barbearia (fictício)',
  email: 'ola@prumo.example',
  horarioCurto: resumoHorarios(),
  aviso: 'Empresa fictícia · demonstração de design. Nomes, preços, horários e contatos não são reais.',
  creditos: [
    {
      peca: 'Cadeira 3D “Barber Shop Chair 01”',
      autor: 'Fernando Quinn / Poly Haven',
      licenca: 'CC0',
      url: 'https://polyhaven.com/a/BarberShopChair_01',
      alteracao: 'texturas reduzidas e comprimidas',
    },
    {
      peca: 'Iluminação “Vintage Measuring Lab”',
      autor: 'Poly Haven',
      licenca: 'CC0',
      url: 'https://polyhaven.com/a/vintage_measuring_lab',
      alteracao: 'reduzida para 512 e 256 px',
    },
    {
      peca: 'Foto das navalhas',
      autor: 'Nick Demou / StockSnap',
      licenca: 'CC0',
      url: 'https://stocksnap.io/photo/barbershop-brush-GZP9ZEQPFL',
      alteracao: 'cor tratada',
    },
    {
      peca: 'Foto da máquina na nuca',
      autor: 'rawpixel',
      licenca: 'CC0',
      url: 'https://www.rawpixel.com/image/5923938/photo-image-public-domain-black-person',
      alteracao: 'cor tratada; etiqueta da capa coberta',
    },
    {
      peca: 'Foto “Barber shop iran”',
      autor: 'Mostafameraji',
      licenca: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Barber_shop_iran.jpg',
      licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      alteracao: 'recorte e cor tratada; a versão alterada segue CC BY-SA 4.0',
    },
  ] as { peca: string; autor: string; licenca: string; url: string; licencaUrl?: string; alteracao: string }[],
}
