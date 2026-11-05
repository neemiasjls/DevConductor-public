// Todo o texto do site. Empresa FICTÍCIA (demonstração): nomes, telefone, endereço e horários são ilustrativos.
import type imagens from './imagens.json'

export type NomeFoto = keyof typeof imagens

const WHATS = '5531900000000' // número claramente fictício
export const linkWhats = (servico?: string) =>
  `https://wa.me/${WHATS}?text=${encodeURIComponent(
    servico ? `Olá, Estúdio Coral! Quero marcar um horário para ${servico}.` : 'Olá, Estúdio Coral! Quero marcar um horário.',
  )}`

export const marca = {
  nome: 'Estúdio Coral',
  cidade: 'Belo Horizonte/MG',
  aviso: 'Demonstração — empresa fictícia. Nome, telefone, endereço e horários são ilustrativos.',
}

export const menu = [
  { rotulo: 'Serviços', alvo: '#servicos' },
  { rotulo: 'A trança', alvo: '#tranca' },
  { rotulo: 'Estilos', alvo: '#estilos' },
  { rotulo: 'Agenda', alvo: '#agenda' },
]

export const abertura = {
  linhas: ['Feito', 'pra'],
  palavras: ['tranças', 'cachos', 'cor', 'você'],
  fotos: [
    { nome: 'abertura' as NomeFoto, alt: 'Mulher com tranças koroba.' },
    { nome: 'cachos-definidos' as NomeFoto, alt: 'Mulher com cachos curtos e definidos.' },
    { nome: 'servico-cor' as NomeFoto, alt: 'Cabelo em tom loiro mel.' },
    { nome: 'abertura' as NomeFoto, alt: 'Mulher com tranças koroba.' },
  ],
  texto: 'Salão de tranças, cachos e cor em Santa Tereza, Belo Horizonte. Nagô, box braids, twist, finalização e coloração com hora marcada.',
  botao: 'Marcar pelo WhatsApp',
  secundario: 'Ver serviços',
  pausar: 'Pausar animação',
  retomar: 'Retomar animação',
  foto: { nome: 'abertura' as NomeFoto, alt: 'Mulher de perfil com tranças koroba e lenço listrado em rosa e azul sobre o ombro.' },
}

export const servicos = {
  titulo: 'O que a gente faz',
  itens: [
    {
      nome: 'Tranças',
      servico: 'tranças',
      itens: ['Nagô', 'Box braids', 'Twist', 'Fulani', 'Gypsy braids'],
      texto: 'Fio sintético ou orgânico, do comprimento que você quiser, sem puxar a raiz. O tempo depende do tamanho e da espessura, e a gente combina antes.',
      foto: { nome: 'servico-trancas' as NomeFoto, alt: 'Mãos fazendo tranças nagô em zigue-zague, com um pente rosa preso no cabelo.' },
    },
    {
      nome: 'Cachos',
      servico: 'cachos',
      itens: ['Finalização', 'Hidratação', 'Corte a seco', 'Fitagem'],
      texto: 'Definição para cada curvatura, do ondulado ao crespo. Você sai sabendo repetir em casa com o que já tem no banheiro.',
      foto: { nome: 'cachos-definidos' as NomeFoto, alt: 'Mulher sorrindo, com cachos curtos e definidos em cabelo claro e grisalho.' },
    },
    {
      nome: 'Cor',
      servico: 'coloração',
      itens: ['Coloração', 'Mechas', 'Cor fantasia', 'Tonalização'],
      texto: 'Do mel ao cobre, das mechas à cor fantasia. O fio fica protegido do começo ao fim, e o tom é testado antes.',
      foto: { nome: 'servico-cor' as NomeFoto, alt: 'Mulher de cabelo loiro mel ondulado, de camisa branca.' },
    },
  ],
}

export const tranca = {
  titulo: ['Como nasce', 'uma trança'],
  etapas: [
    { nome: 'Consulta', texto: 'A gente olha o fio, o couro cabeludo e a foto que você trouxe. Combina estilo, tamanho e tempo.' },
    { nome: 'Preparo', texto: 'Lavagem, hidratação e divisão das mechas. Fio limpo e seco segura melhor a trança.' },
    { nome: 'Trançado', texto: 'Mecha por mecha, por cima e por baixo, sem apertar a raiz. É a parte mais longa: tem água, café e playlist.' },
    { nome: 'Finalização', texto: 'Pontas seladas, raiz alinhada e as dicas para a trança durar semanas.' },
  ],
  poster: 'Ilustração de uma trança de três mechas, coral, azul e preta, presa em cima e embaixo.',
}

export const perto = {
  titulo: ['Cada fio', 'no lugar'],
  texto: 'Trança bem feita é a que não pesa, não puxa e dura. O resto é capricho, e capricho a gente tem de sobra.',
  foto: { nome: 'perto' as NomeFoto, alt: 'Profissional separando mechas do cabelo de uma cliente, com um pente verde preso nas mechas.' },
  legenda: 'Foto ilustrativa: Adaku Nwakanma, CC BY-SA 4.0, via Wikimedia Commons.',
}

export const estilos = {
  titulo: 'Estilos',
  texto: 'Seis jeitos de sair daqui. Tempo e valor a gente combina na consulta, conforme tamanho e volume.',
  itens: [
    { nome: 'Nagô', nota: 'Rente à cabeça, com desenho livre.', foto: { nome: 'estilo-nago' as NomeFoto, alt: 'Tranças nagô em zigue-zague vistas de perto.' } },
    { nome: 'Box braids', nota: 'Caixinhas soltas, com ou sem miçanga.', foto: { nome: 'estilo-box' as NomeFoto, alt: 'Menina de óculos escuros com box braids e miçangas brancas, em preto e branco.' } },
    { nome: 'Twist', nota: 'Duas mechas torcidas. Leve e mais rápida.' },
    { nome: 'Koroba', nota: 'Tranças que sobem e se encontram no alto.', foto: { nome: 'estilo-koroba' as NomeFoto, alt: 'Mulher com tranças koroba e brinco dourado, olhando por cima do ombro.' } },
    { nome: 'Cachos', nota: 'Finalização que define sem pesar.', foto: { nome: 'cachos-definidos' as NomeFoto, alt: 'Cachos curtos e definidos em cabelo claro e grisalho.' } },
    { nome: 'Cor', nota: 'Do mel ao cobre, com o fio protegido.', foto: { nome: 'estilo-cor' as NomeFoto, alt: 'Cabelo loiro mel em ondas largas.' } },
  ],
  tempo: 'Tempo e valor: a combinar',
  fim: { titulo: 'Não achou o seu?', texto: 'Manda a foto no WhatsApp que a gente diz se dá.', botao: 'Mandar foto' },
}

export const agenda = {
  palavra: 'Agenda',
  dias: [
    { dia: 'Ter', hora: '9h–19h' }, { dia: 'Qua', hora: '9h–19h' }, { dia: 'Qui', hora: '9h–19h' },
    { dia: 'Sex', hora: '9h–19h' }, { dia: 'Sáb', hora: '8h–17h' },
  ],
  diasRotulo: 'Dias de atendimento (fictícios)',
  acao: 'Bora marcar?',
  botao: 'Escolher o serviço',
  texto: 'Escolhe o serviço e chama no WhatsApp. A gente responde com os horários livres da semana.',
}

export const contato = {
  titulo: ['Marca seu', 'horário'],
  pergunta: 'Pra qual serviço?',
  opcoes: [
    { rotulo: 'Tranças', servico: 'tranças' },
    { rotulo: 'Cachos', servico: 'cachos' },
    { rotulo: 'Cor', servico: 'coloração' },
    { rotulo: 'Ainda não sei', servico: 'uma consulta' },
  ],
  botao: 'Chamar no WhatsApp',
  info: [
    { titulo: 'Onde', linhas: ['Endereço fictício', 'Santa Tereza, Belo Horizonte/MG'] },
    { titulo: 'Quando', linhas: ['Terça a sexta, 9h às 19h', 'Sábado, 8h às 17h'] },
    { titulo: 'Fala com a gente', linhas: ['(31) 90000-0000 (fictício)', '@estudiocoral.demo (fictício)'] },
  ],
}

export const creditos = [
  { foto: 'Mulher com tranças koroba (abertura e estilos)', autor: 'Melody Jacob1', licenca: 'CC BY-SA 4.0', pagina: 'https://commons.wikimedia.org/wiki/File:Koroba-braids-woman-scarf-portrait-june-2024-01.jpg', licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { foto: 'Tranças nagô em zigue-zague (serviços e estilos)', autor: 'Nwonwu Uchechukwu P', licenca: 'CC BY-SA 4.0', pagina: 'https://commons.wikimedia.org/wiki/File:Cornrow_Hairstyling.jpg', licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { foto: 'Cachos definidos (abertura, serviços e estilos)', autor: 'Nenad Stojković / Shixart1985', licenca: 'CC BY 2.0', pagina: 'https://commons.wikimedia.org/wiki/File:Smiling_senior_woman_with_curly_hair_portrait.jpg', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
  { foto: 'Retrato de cabelo loiro (serviços e estilos)', autor: 'Nenad Stojkovic', licenca: 'CC BY 2.0', pagina: 'https://commons.wikimedia.org/wiki/File:Portrait_of_young_blonde_woman_standing_near_window.jpg', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
  { foto: 'Trancista no salão (de perto)', autor: 'Adaku Nwakanma', licenca: 'CC BY-SA 4.0', pagina: 'https://commons.wikimedia.org/wiki/File:Braider_at_a_hair_salon.jpg', licencaUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { foto: 'Box braids com miçangas (estilos)', autor: 'Randen Pederson', licenca: 'CC BY 2.0', pagina: 'https://commons.wikimedia.org/wiki/File:Box_Braids.jpg', licencaUrl: 'https://creativecommons.org/licenses/by/2.0' },
]

export const rodape = {
  frase: 'Feito em BH, com hora marcada.',
  notaFotos: 'Fotos recortadas pelo autor da demonstração; as de licença CC BY-SA seguem na mesma licença. A trança animada é de autoria própria.',
}
