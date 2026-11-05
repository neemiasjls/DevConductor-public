import { estudosExtras } from './familias.js'
export const estudos = [
  { id: 'letras', nome: 'O gesto da palavra', familia: 'Tipografia', descricao: 'As letras encontram seu lugar conforme a leitura avança.', titulo: 'Tudo começa\ncom um gesto.', receita: 'letras-em-cena', fase: 'D1' },
  { id: 'foto', nome: 'Uma janela para o mar', familia: 'Profundidade', descricao: 'Uma fotografia real ocupa o espaço, sem perder o foco.', titulo: 'Deixe o\nolhar entrar.', receita: 'foto-abre', fase: 'D1' },
  { id: 'lateral', nome: 'Um caminho contínuo', familia: 'Transições', descricao: 'Três atos atravessam a tela. No celular, a leitura segue vertical.', titulo: 'Mude o\nponto de vista.', receita: 'rolagem-lateral', fase: 'D1' },
  { id: 'linha', nome: 'O desenho do percurso', familia: 'Linhas e mapas', descricao: 'Uma linha conecta três momentos de uma mesma história.', titulo: 'Entre a ideia\ne o encontro.', receita: 'linha-desenhada', fase: 'D2' },
  { id: 'cortina', nome: 'A próxima camada', familia: 'Transições', descricao: 'Duas superfícies se afastam e revelam outra composição.', titulo: 'Existe mais\npara descobrir.', receita: 'cortina', fase: 'D2' },
  { id: 'zoom', nome: 'Dentro da palavra', familia: 'Tipografia', descricao: 'Uma palavra cresce. O próximo assunto ganha espaço.', titulo: 'Chegue\nmais perto.', receita: 'palavra-zoom', fase: 'D2' },
  ...estudosExtras,
]
