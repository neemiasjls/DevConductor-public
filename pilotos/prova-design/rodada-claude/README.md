# Próxima rodada — Claude

Status: **entregue em 04/11/2026** (Austral Frio, Lúmen Salão, Prumo Barbearia). Relatório: `docs/prova-design-claude.md`.
Esta pasta é a passagem de turno para novos exemplos, não uma cópia dos três já apresentados.

## O que o Neemias pediu

Ele gostou muito dos exemplos e da originalidade, mas percebeu alguns exageros leves. Quer outros sites
de exemplo parecidos e melhor calibrados. Manter ideias próprias, cenas e variedade; ajustar escala,
permanência na rolagem e competição entre efeitos conforme a função de cada seção. Não transformar esse
feedback em proibições gerais ou voltar à repetição de sites sóbrios.

Ele também pediu separação clara entre a **rodada Codex**, já apresentada, e os **novos exemplos Claude**.

## Organização obrigatória

| Grupo | Sites/fontes | Vídeos e evidências | Relatório |
|---|---|---|---|
| Codex — versão atual consolidada | `../lastro-cargas/`, `../estudio-coral/`, `../barbearia-seco/` | `../vitrine/pos-critica-29-10/`, `../vitrine/qa-pos-critica-29-10/` e pastas citadas no relatório | `docs/prova-design.md` |
| Claude — próximos exemplos | `rodada-claude/<slug>/` | `../vitrine/rodada-claude/`, subpastas próprias de revisão/medição | `docs/prova-design-claude.md`, quando houver entrega real |

Os caminhos da coluna de fontes são relativos a esta pasta, exceto `rodada-claude/<slug>/`, relativo a
`pilotos/prova-design/`. Os relatórios ficam na raiz `docs/` do projeto.
O rótulo Codex identifica a rodada apresentada/consolidada; a construção já havia começado antes da retomada
e houve contribuição dos dois. Não alterar essa procedência nem reatribuir commits.
Os pilotos antigos de clientes (transportadora e salão) continuam como histórico de comparação, fora dessas duas rodadas novas.

## Roteiro ao retomar

1. Ler `docs/continuar.md`, `CLAUDE.md`, DEV-34/35/36, `docs/prova-design.md` e as lições/críticas ali registradas.
   A primeira prova e seus testes estão concluídos: não repetir sua construção ou seus ensaios de tokens.
2. Construir outra série comparável: uma transportadora, um salão e uma barbearia fictícios, com nomes,
   conteúdo demonstrativo e direções próprios. Não usar identidades/material de clientes reais nem retomar
   os clientes pausados. É uma série de exemplos solicitada, não uma implantação de cliente.
3. Escrever `plano.md` de cada site antes de construir: ideia central do negócio, direção e roteiro das cenas.
   A originalidade da primeira rodada é referência de ambição; melhorar hierarquia, fotografia coesa, ritmo
   e costuras. Efeitos devem explicar algo do negócio. Não copiar o mesmo layout trocando texto e cores.
4. Usar o fluxo `lp-*` do kit. Analisar segurança antes de instalar qualquer skill nova; consultar só fontes
   conhecidas/licenciadas e registrar créditos/alterações. Não alterar configuração global.
5. Manter cada novo site em sua própria subpasta aqui, sem mover/sobrescrever Lastro, Coral ou Seco.
   Textos em dados, tokens próprios, computador e celular equivalentes, reduzido completo e dinâmico.
6. Testar build, seis larguras × normal/reduzido, teclado em cenas/trilhos, pausa, foco, mídia indisponível e
   rolagem com retorno. Conferir quadros e gravar vídeos desktop/celular. Medir carga **e percurso completo**;
   callbacks RAF não são FPS da tela, e soma de deslocamentos não equivale ao CLS por janela.
7. Atualizar a vitrine principal, mantendo as seções **Exemplos · Codex** e **Exemplos · Claude**. Preencher a
   seção Claude somente com sites/vídeos realmente prontos. Conservar as comparações antigas e fornecer
   links para as páginas das duas rodadas. Usar portas livres; não matar previews de outros turnos.
8. Comparar as rodadas com evidência e crítica, sem declarar superioridade automática ou nota de premiação.
   Criar o relatório próprio e atualizar `docs/continuar.md`, incluindo o que falta validar em aparelho físico.

Não fazer commit, push ou publicação sem novo pedido. Não iniciar login/chamadas de outro modelo só para
preencher esta pasta: o Claude executará esta etapa quando assumir o projeto.

## Feedback adicional de30/10 (DEV-37)

Conferir visualmente que cada fotografia demonstra o penteado/serviço indicado; não confiar no nome do
arquivo. Fotos da abertura acompanham as palavras. O usuário rejeitou a distorção RGB do Coral e o
caixote como protagonista da transportadora. Na próxima rodada, usar representação fiel ao negócio e
interação consistente, mantendo personalidade; não copiar esses dois efeitos rejeitados.

### Esclarecimento posterior do usuário (30/10)
A crítica ao caixote era à sua representação, não à existência da cena. Manter uma cena3D de carga e
reformular a embalagem/composição para o contexto logístico; não usar esse feedback para eliminar a cena
ou proibir3D. A substituição integral por foto foi interpretação excessiva do responsável da revisão.

### Escolha confirmada para o exemplo Codex (30/10)
A nova carga é uma caixa de ovos. A cena3D foi mantida com modelo de embalagem de polpa moldada e doze
ovos. A abertura apenas fotográfica ficou histórica. Não reverter essa escolha ao ler os registros antigos.

## Lúmen calibrado (09/11, DEV-52)
`lumen-salao-calibrado/` (porta 5204, launch `claude-lumen-calibrado`) é a prova das imagens e da calibragem do kit
`landing-pages` 0.3.16. Não substitui `lumen-salao/` (5202) e não entra na vitrine sem o veredito do Neemias.

## Austral e Prumo calibrados (09/11, DEV-52)
Mesmo método do Lúmen, depois do "Aprovado, aplicar": `austral-frio-calibrado/` (5205, launch `claude-austral-calibrado`) e
`prumo-barbearia-calibrado/` (5206, launch `claude-prumo-calibrado`). Cada uma tem `/antes-depois.html` e a calibragem no
`plano.md`. Não substituem os originais e não entram na vitrine sem o veredito do Neemias.
