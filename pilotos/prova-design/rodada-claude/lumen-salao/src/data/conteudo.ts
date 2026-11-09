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
  foto: { nome: 'abertura' as NomeFoto, alt: 'Mulher de cabelo longo acobreado olhando para a janela; a luz lateral bate nos comprimentos.' },
}

export const diagnostico = {
  numero: '01', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'Diagnóstico',
  // a única palavra em itálico do site (marcada por *…*)
  frase: 'Água, óleo, proteína: o fio pede uma coisa de cada *vez*.',
  apoio: 'O tratamento começa pelo diagnóstico da mecha.',
  sinais: [
    { falta: 'Água', tratamento: 'hidratação', sinal: 'Áspero e sem balanço.' },
    { falta: 'Óleo', tratamento: 'nutrição', sinal: 'Pontas secas e frizz.' },
    { falta: 'Proteína', tratamento: 'reconstrução', sinal: 'Elástico, quebrando à toa.' },
  ],
}

export const fio = {
  numero: '02', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'De perto',
  titulo: 'O tratamento acontece na mecha',
  texto: 'Água, óleo ou proteína: cada um vai só na mecha que precisa, na dose do diagnóstico. Por isso o brilho dura.',
  foto: { nome: 'nutricao' as NomeFoto, alt: 'Mãos aplicando gotas de óleo com conta-gotas numa mecha de cabelo loiro.' },
}

export const cronograma = {
  numero: '03', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'Cronograma capilar',
  titulo: 'Quatro semanas, uma etapa por lavagem',
  texto: 'Exemplo ajustado ao diagnóstico e à resposta do fio.',
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
  aviso: 'Exemplo ilustrativo, não é receita.',
}

export const resultado = {
  numero: '04', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'Resultado',
  titulo: 'Onde a luz bate inteira',
  texto: 'Fio fechado reflete a luz numa faixa só, do alto da cabeça às pontas.',
  foto: { nome: 'resultado' as NomeFoto, alt: 'Cabelo preto, longo e liso visto de costas, com faixas de reflexo do alto da cabeça até as pontas.' },
  nota: 'Foto de banco aberto; não é cliente do salão.',
}

export const servicos = {
  numero: '05', // taste-skill-ignore: numeração de revista pedida pelo estilo luxo-editorial
  rotulo: 'Serviços e valores',
  titulo: 'Escolha por onde começar',
  aviso: 'Valores de demonstração, “a partir de”. O diagnóstico confirma.',
  lista: [
    { nome: 'Hidratação', linha: 'Para fio áspero e sem balanço. Lavagem, máscara com vapor e finalização.', preco: 'a partir de R$ 120', foto: 'hidratacao' as NomeFoto, alt: 'Mulher de costas penteando o cabelo castanho molhado com uma escova de madeira.' },
    { nome: 'Nutrição', linha: 'Para pontas secas e frizz. Óleos aplicados mecha a mecha.', preco: 'a partir de R$ 140', foto: 'nutricao' as NomeFoto, alt: 'Mãos aplicando gotas de óleo com conta-gotas numa mecha de cabelo loiro.' },
    { nome: 'Reconstrução', linha: 'Para fio elástico ou quebrando depois de química ou calor.', preco: 'a partir de R$ 160', foto: 'reconstrucao' as NomeFoto, alt: 'Profissional do salão borrifando o tratamento numa tigela sobre a balança, para dosar a mistura.' },
    { nome: 'Cronograma de 4 semanas', linha: 'Diagnóstico, duas sessões no salão e o plano para casa.', preco: 'a partir de R$ 420', foto: 'cronograma' as NomeFoto, alt: 'Frasco de tratamento envolto por uma mecha de cabelo loiro, em fundo escuro.' },
    { nome: 'Corte', linha: 'Corte a seco ou molhado, tirando só o que já não fecha.', preco: 'a partir de R$ 110', foto: 'corte' as NomeFoto, alt: 'Mãos de cabeleireira cortando as pontas de uma mecha escura presa entre os dedos e o pente.' },
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

export const creditos = [
  { foto: 'Abertura', autor: 'Vladimir Pustovit', origem: 'https://commons.wikimedia.org/wiki/File:Pretty_woman_with_long_hair.jpg', licenca: 'CC BY 2.0', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
  { foto: 'Resultado', autor: 'Alex Neman', origem: 'https://commons.wikimedia.org/wiki/File:Woman_with_shiny_long_black_hair_from_behind_(25_December_2022).jpg', licenca: 'CC BY-SA 4.0', licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { foto: 'Hidratação', autor: 'Gee Hair', origem: 'https://commons.wikimedia.org/wiki/File:Woman_With_Wet_Hair_Using_Hairbrush_(51548089114).jpg', licenca: 'CC BY 2.0', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
  { foto: 'Nutrição', autor: 'geehairimages', origem: 'https://commons.wikimedia.org/wiki/File:Hair_Oil_Treatment_at_Hair_Salon.jpg', licenca: 'CC BY 2.0', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
  { foto: 'Reconstrução', autor: 'Hair Spies', origem: 'https://commons.wikimedia.org/wiki/File:Hair_conditioner_(51213040376).jpg', licenca: 'CC BY 2.0', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
  { foto: 'Cronograma', autor: 'geehairimages', origem: 'https://commons.wikimedia.org/wiki/File:Conditioner_-_Hair_treatment.jpg', licenca: 'CC BY 2.0', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
  { foto: 'Corte', autor: 'Hair Spies', origem: 'https://commons.wikimedia.org/wiki/File:Cutting_hair_with_scissors_(51214105840).jpg', licenca: 'CC BY 2.0', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
]
export const alteracoes =
  'Todas as fotos foram recortadas e tratadas (sombras puxadas para o verde-petróleo, saturação e contraste suaves). Na de resultado, o fundo branco virou petróleo e a blusa rosa virou ameixa; na de hidratação, a parede clara virou petróleo; nas de reconstrução e corte, o fundo claro do salão foi escurecido. As derivadas de CC BY-SA seguem CC BY-SA 4.0. A ilustração do fio é de autoria própria.'
