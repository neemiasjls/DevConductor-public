# Estilos — D3

Rodar na raiz: `node pilotos/estilos/servir.mjs`. Abrir http://127.0.0.1:5192/.
Quatro exemplos fictícios, sem atendimento/telefone/endereço inventado ou publicação.

- Luxo editorial: arquitetura e paisagem, título atravessando a largura, foto deslocada à direita.
- Tecnológico escuro: automação, tipografia sem serifa, diagrama de conexões e uma seção clara.
- Claro e orgânico: hospitalidade fictícia, foto em arco à esquerda, texto em coluna mais estreita.
- Editorial sério: engenharia, documento aberto com terreno esquemático e lista de etapas.

Paletas demonstrativas do mar/luz (azul-ardósia, branco frio, verde desaturado); não são paletas aprovadas
de cliente. Foto não representa obra, hotel ou instalação. Sem números comerciais, avaliações ou prêmios.
Os dois diagramas são abstratos originais, não fotos ou modelos de equipamento/terreno reais.
Sem faixas infinitas/contador/brilho/peças 3D inventadas. Um percurso SVG por página, sem pin; JS opcional,
pausa e movimento reduzido dinâmico. A estrutura permanece legível sem scripts.

Desvios dos presets documentados: fontes locais já disponíveis Bodoni Moda/Familjen Grotesk no lugar
dos pares sugeridos, evitando dependência externa; hierarquia/escala mudam por estilo. O exemplo orgânico
usa uma referência de paisagem em vez de fotos de estabelecimento. Protótipo estático HTML/CSS, com traço
SVG e requestAnimationFrame restrito à cena; não substitui a stack React/Motion/GSAP da construção de cliente.
Tokens exatos do preset em `plugins/landing-pages/skills/lp-direcao-de-arte/estilos/ritmos.mjs`.

Origem da foto: Tom Beck, https://unsplash.com/photos/aerial-view-of-ocean-waves--NquqeJwHxc.
Licença: https://unsplash.com/license. Já usada/testada no estúdio; nenhuma coleta nova de mídia.
Fontes: Bodoni Moda e Familjen Grotesk (SIL OFL), arquivos de licença em `assets/`.

Gerador reutilizável: `node plugins/landing-pages/skills/lp-direcao-de-arte/estilos/gerar-exemplos.mjs pilotos/estilos/site-novo`.
Não sobrescreve pasta existente. Exige `../assets/{mar.jpg,bodoni.woff2,familjen.woff2,favicon.svg}` junto da saída.
Nenhum estilo está aprovado esteticamente até o usuário ver e escolher.

Verificações: `node pilotos/estilos/validar.mjs` (48 combinações +4 sem JS) e
`node pilotos/estilos/validar-vitrine.mjs` (8 vídeos/48 quadros, reprodução/busca, reduzido, teclado e peso).
Usam o puppeteer-core já instalado no estúdio e perfis locais dentro de `evidencias/`.
Galeria: http://127.0.0.1:5192/vitrine/galeria.html. Relatório: `docs/relatorio-integracao-d3-d4.md`.
