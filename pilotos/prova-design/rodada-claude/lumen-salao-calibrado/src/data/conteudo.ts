// Todo o texto do site. Empresa FICTÍCIA (demonstração): nome, telefone, endereço, horários e valores são ilustrativos.
import type imagens from './imagens.json'

export type NomeFoto = keyof typeof imagens

const WHATS = '5531900000000' // número claramente fictício
export const linkWhats = (servico?: string) =>
  `https://wa.me/${WHATS}?text=${encodeURIComponent(
    servico
      ? `Olá, Lúmen! Quero agendar ${servico}. Pode me passar os horários?`
      : 'Olá, Lúmen! Quero agendar um diagnóstico do fio. Pode me passar os horários?',
  )}`

export const marca = {
  nome: 'Lúmen',
  completo: 'Lúmen Salão',
  oque: 'terapia capilar e corte',
  cidade: 'Belo Horizonte/MG',
  aviso: 'Empresa fictícia · demonstração',
  avisoLongo: 'Site de demonstração de um salão fictício. Nome, telefone, endereço, horários e valores são ilustrativos; as pessoas das fotos não são clientes.',
}

export const menu = [
  { rotulo: 'Diagnóstico', alvo: '#diagnostico' },
  { rotulo: 'De perto', alvo: '#fio' },
  { rotulo: 'Cronograma', alvo: '#cronograma' },
  { rotulo: 'Serviços', alvo: '#servicos' },
]

export const abertura = {
  linhas: ['Brilho é', 'cutícula', 'fechada.'],
  // LP-12: o apoio diz o que o salão faz e onde; a explicação da cutícula fica para a cena do diagnóstico.
  texto: 'Terapia capilar e corte na Savassi, com diagnóstico.',
  botao: 'Agendar diagnóstico',
  secundario: 'Ver o tratamento',
  pausar: 'Pausar o reflexo',
  retomar: 'Retomar o reflexo',
  foto: { nome: 'abertura' as NomeFoto, alt: 'Cabelo longo e ondulado visto de costas, com a luz marcando as ondas até as pontas.' },
}

export const diagnostico = {
  numero: '01', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'Diagnóstico',
  // a única palavra em itálico do site (marcada por *…*)
  frase: 'Água, óleo, proteína: o fio pede uma coisa de cada *vez*.',
  apoio: 'Como o seu fio está hoje?',
  comece: 'Comece por',
  agendar: 'Agendar',
  sinais: [
    { falta: 'Água', tratamento: 'hidratação', sinal: 'Áspero e sem balanço', preco: 'a partir de R$ 120', foto: 'hidratacao' as NomeFoto, alt: 'Mulher de roupão, de costas, secando o cabelo liso e claro.' },
    { falta: 'Óleo', tratamento: 'nutrição', sinal: 'Pontas secas e frizz', preco: 'a partir de R$ 140', foto: 'nutricao' as NomeFoto, alt: 'Frasco âmbar com conta-gotas e pote de tratamento na bancada do salão.' },
    { falta: 'Proteína', tratamento: 'reconstrução', sinal: 'Elástico, quebrando à toa', preco: 'a partir de R$ 160', foto: 'reconstrucao' as NomeFoto, alt: 'Profissional secando uma mecha escura com secador, na cadeira do salão.' },
  ],
}

export const fio = {
  numero: '02', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'De perto',
  titulo: 'O tratamento acontece na mecha',
  texto: 'Na dose certa, só onde precisa.',
  passos: ['Olhamos a mecha', 'Aplicamos só o que falta', 'Selamos e finalizamos'],
  foto: { nome: 'fio' as NomeFoto, alt: 'Mechas de cabelo vistas de perto, com a luz atravessando as pontas.' },
}

export const cronograma = {
  numero: '03', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'Cronograma capilar',
  titulo: 'Quatro semanas, uma etapa por lavagem',
  legenda: [
    { sigla: 'H', nome: 'hidratação' },
    { sigla: 'N', nome: 'nutrição' },
    { sigla: 'R', nome: 'reconstrução' },
  ],
  semanas: [
    { nome: 'Semana 1', etapas: ['H', 'N', 'R'], nota: 'No salão' },
    { nome: 'Semana 2', etapas: ['H', 'N', 'H'], nota: 'Em casa' },
    { nome: 'Semana 3', etapas: ['H', 'H', 'N'], nota: 'No salão' },
    { nome: 'Semana 4', etapas: ['H', 'N', 'R'], nota: 'No salão, para conferir' },
  ],
  aviso: 'Exemplo ilustrativo; o diagnóstico ajusta.',
}

export const resultado = {
  numero: '04', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'Resultado',
  titulo: 'Onde a luz bate inteira',
  texto: 'Fio fechado reflete a luz do alto da cabeça às pontas.',
  ganhos: ['Mais balanço', 'Pontas sem frizz', 'Brilho entre as lavagens'],
  foto: { nome: 'resultado' as NomeFoto, alt: 'Mulher de costas com o cabelo longo e liso solto ao vento, com a luz nos fios até as pontas.' },
  nota: 'Foto de banco aberto; não é cliente do salão.',
}

export const servicos = {
  numero: '05', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'Serviços e valores',
  titulo: 'Escolha por onde começar',
  aviso: 'Valores de demonstração, “a partir de”. O diagnóstico confirma.',
  lista: [
    { nome: 'Hidratação', linha: 'Para fio áspero e sem balanço. Lavagem, máscara com vapor e finalização.', preco: 'a partir de R$ 120', foto: 'hidratacao' as NomeFoto, alt: 'Mulher de roupão, de costas, secando o cabelo liso e claro.' },
    { nome: 'Nutrição', linha: 'Para pontas secas e frizz. Óleos aplicados mecha a mecha.', preco: 'a partir de R$ 140', foto: 'nutricao' as NomeFoto, alt: 'Frasco âmbar com conta-gotas e pote de tratamento na bancada do salão.' },
    { nome: 'Reconstrução', linha: 'Para fio elástico ou quebrando depois de química ou calor.', preco: 'a partir de R$ 160', foto: 'reconstrucao' as NomeFoto, alt: 'Profissional secando uma mecha escura com secador, na cadeira do salão.' },
    { nome: 'Cronograma de 4 semanas', linha: 'Diagnóstico, duas sessões no salão e o plano para casa.', preco: 'a partir de R$ 420', foto: 'cronograma' as NomeFoto, alt: 'Mechas loiras onduladas de perto, com a luz marcando os fios.' },
    { nome: 'Corte', linha: 'Corte a seco ou molhado, tirando só o que já não fecha.', preco: 'a partir de R$ 110', foto: 'corte' as NomeFoto, alt: 'Mão com tesoura cortando as pontas de uma mecha castanha presa entre os dedos.' },
  ],
  agendar: 'Agendar',
}

export const agendar = {
  numero: '06', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  palavra: 'Agende',
  resto: 'o seu diagnóstico.',
  texto: 'Uns 40 minutos com o fio na mão. Você sai sabendo o que ele pede e quanto custa.',
  botao: 'Agendar pelo WhatsApp',
  contatos: {
    telefone: '(31) 90000-0000',
    telefoneLink: 'tel:+5531900000000',
    instagram: '@lumen.salao.demo',
    endereco: 'Rua das Acácias, 120 · Savassi · Belo Horizonte/MG',
    mapa: 'https://www.google.com/maps/search/?api=1&query=Savassi%2C+Belo+Horizonte',
  },
  horarios: [
    { dias: 'Terça a sexta', horas: '9h às 19h' },
    { dias: 'Sábado', horas: '8h às 16h' },
    { dias: 'Domingo e segunda', horas: 'fechado' },
  ],
}

const CC0 = { licenca: 'CC0 1.0', licencaUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' }
export const creditos = [
  { foto: 'Abertura', autor: 'Nina Strehl', origem: 'https://stocksnap.io/photo/2H93LDS99K', ...CC0 },
  { foto: 'De perto', autor: 'Alex Holyoake', origem: 'https://stocksnap.io/photo/HDZE2J2VNL', ...CC0 },
  { foto: 'Resultado', autor: 'Nikolai Ulltang', origem: 'https://stocksnap.io/photo/8JJL0GL391', ...CC0 },
  { foto: 'Hidratação', autor: 'Healthy Living', origem: 'https://stocksnap.io/photo/D5CG6JAYN3', ...CC0 },
  { foto: 'Nutrição', autor: 'rawpixel', origem: 'https://www.rawpixel.com/image/5919224/hair-salon-free-public-domain-cc0-photo', ...CC0 },
  { foto: 'Reconstrução', autor: 'rawpixel', origem: 'https://www.rawpixel.com/image/5907502/image-public-domain-woman-beauty', ...CC0 },
  { foto: 'Cronograma', autor: 'Candace McDaniel', origem: 'https://stocksnap.io/photo/IFMPBCVTUA', ...CC0 },
  { foto: 'Corte', autor: 'Matt Moloney', origem: 'https://stocksnap.io/photo/S7UEWWIRTD', ...CC0 },
]
export const alteracoes =
  'Todas as fotos foram recortadas e tratadas (sombras puxadas para o verde-petróleo, saturação e contraste suaves, bordas escurecidas em algumas).'
