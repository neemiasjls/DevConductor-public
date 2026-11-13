# Integração D3/D4 — 16/10/2026

Conteúdo de `origin/nuvem/d3-d4` (fe15c1d) integrado à árvore local, sem merge commit,
cherry-pick, commit, push ou publicação. Versão final de landing-pages: **0.1.11**.

## Integração
- Quatro estilos com tipografia, paleta, grade, ritmo e receitas compatíveis.
- Coleta com fontes/data/estado dos fatos e orçamento de cinco perguntas no site inteiro.
- Maestro produz três conceitos completos para escolha, mantendo pendências onde faltam fatos.
- Preservados estúdio de 25 cenas, receitas D2, revisão D6, assets D5 e SEO D9 locais.
- Preservadas autorizações já dadas e pedidos de trabalho sem perguntas. Silêncio não confirma
  dados, direitos de uso, conceito ou publicação. Avaliações não são obrigatórias se proibidas/ausentes.
- Corrigido conflito com LP-05: coleta não abre outros perfis do Instagram.
- Teste dos conceitos aponta para o revisor genérico D6, sem exigir marcações exclusivas do estúdio.
- Corrigido frontmatter YAML da direção de arte: os dois-pontos na descrição sem aspas causavam
  descarte dos metadados pelo carregador da skill. Validação do plugin passou depois do ajuste.

O ramo tinha especificações, mas não páginas executáveis. Foram criadas quatro páginas em
`pilotos/estilos/site/` e um gerador reutilizável que recusa sobrescrita, em
`plugins/landing-pages/skills/lp-direcao-de-arte/estilos/gerar-exemplos.mjs`.

## Exemplos
| Estilo | Composição | Tema fictício |
|---|---|---|
| Luxo editorial | título amplo e foto deslocada à direita | Costa — arquitetura |
| Tecnológico escuro | tipografia sem serifa e conexões abstratas | Nexo — automação |
| Claro e orgânico | foto em arco e coluna de texto estreita | Entre — casa de pausa |
| Editorial sério | documento aberto e terreno esquemático | Campo Norte — engenharia |

Cada exemplo tem abertura, percurso SVG acompanhado pela rolagem, proposta e rodapé. Pausa e
preferência de movimento reduzido são dinâmicas; sem JS, o conteúdo e o percurso ficam visíveis.
São protótipos estáticos para comparar composição; não substituem a stack React/Motion/GSAP de cliente.
As curvas e durações dos presets estão em `ritmos.mjs`; os controles usam a duração curta. O traço
acompanha diretamente a rolagem, sem pin. As outras durações ficam para a construção do site.

Foto de Tom Beck/Unsplash e fontes Bodoni Moda/Familjen Grotesk (OFL) já disponíveis localmente.
Nenhum download, compra, contato comercial ou dado real inventado. A foto é referência de paisagem,
sem atribuição a obra/hospedagem. Desvios dos presets e licenças em `pilotos/estilos/README.md`.

## Verificação
- **48/48 combinações**: quatro páginas × seis larguras (360, 390, 414, 768, 1024, 1440) × normal/reduzido.
  Sem overflow horizontal, imagens quebradas, erros JS/HTTP, âncoras inexistentes ou controles sem nome.
- **4/4 sem JS**: título/conteúdo inicial e percurso completo disponíveis.
- Pausa, retomada e mudança da preferência de movimento conferidas. Acesso por teclado ao conteúdo nas quatro.
- **8 vídeos + 48 quadros**, computador/celular, entre **13,43 e 15,83 segundos**. Reprodução, busca,
  duração, controles e ausência de autoplay no reduzido passaram. Nenhum favorito marcado.
- Inspeção visual das aberturas, cenas e final das páginas: hierarquia legível, fotos contidas nos arcos,
  contraste entre seções e ausência de sobreposição. As cenas são intencionalmente contidas; não certificam
  fluidez em aparelho físico nem aprovação estética do usuário.
- Corrigido o redirecionamento da raiz do preview: servir o índice sem mudar a URL quebrava CSS/links relativos.
  Adicionados MIME de SVG/WebM/PNG e favicon no preview. Vitrine retestada sem erros de rede/JS.
- Orçamento por página: **30–486 kB brutos** de arquivos necessários, incluindo fontes e foto quando usada.
  Soma com compressão textual estimada: **23–479 kB** (não é medição de transferência em hospedagem).
- **51/51 testes unitários**. Dois novos verificam geração em caminho com espaços, recursos locais,
  conteúdo sem JS, recusa de estilo inválido e preservação de edição na segunda execução.
- Dez plugins sem referências/versões pendentes; plugin e marketplace validados pelo CLI.

Evidências: `pilotos/estilos/evidencias/testes.json`, `vitrine.json`, prints e `vitrine/`.
Rodar: `node pilotos/estilos/servir.mjs`; abrir http://127.0.0.1:5192/.
Vídeos: http://127.0.0.1:5192/vitrine/galeria.html.

## Estado do plano
**D3:** implementação e exemplos verificados; aprovação visual ainda pendente.
**D4:** fluxo integrado; falta uma execução com cliente novo real, com até cinco perguntas e três conceitos.
Não contar os quatro exemplos fictícios como esse teste. D7 continua dependente do nicho e aprovação
do usuário, e publicação não está autorizada. Transportadora pausada; salão e estúdio anteriores preservados.

Alterações e evidências ficaram em DevAgents. Configuração global, memória externa e LandingPages não
foram alterados. Cópias da integração e perfis de navegador locais ficam ignorados pelo Git.
