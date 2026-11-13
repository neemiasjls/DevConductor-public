---
name: lp-revisao
description: Revisa uma landing page antes de mostrar ao usuário ou ao cliente - prints em 3 larguras, detector anti-cara-de-IA, auditorias de design e checklist técnico (celular, contraste, velocidade, WhatsApp, SEO). Use ao terminar uma construção ou ajuste grande e para comparar versões de um mesmo cliente.
---

# Revisão antes de entregar

## Ordem e portões (a máquina antes do juiz)
Ordem da revisão final: `acabamento.mjs` → `celular.mjs` → Lighthouse → `rodadas.mjs` → comparador → painel de
juízes + Codex. Nada vai a juiz nenhum com defeito que a máquina acha sozinha. Três níveis:
- **Nunca passa** (conserta antes de mostrar a qualquer juiz): portão do celular, fixo sobre conteúdo, linhas de
  título colidindo, imagem ampliada ou esticada, emenda de faixa em laço, queda de Lighthouse.
- **Exige justificativa** (só fica com o motivo escrito no relatório, uma linha por achado): órfã, cor desigual
  num grupo de fotos, sinais de site gerado.
- **Não bloqueia:** sugestões e "aviso" (vão morto é aviso, como no `acabamento.mjs`). "Não medido" se confere no olho e **nunca conta como aprovado**.

**Acabamento:** `node <plugin>/skills/lp-revisao/scripts/acabamento.mjs <url> <pasta-da-revisão>/acabamento --larguras 1440,390`
(7 conferências; saída 1 = há "nunca passa"; 0 não quer dizer aprovado: ler `resumo.txt`).
**Rodadas:** depois de cada rodada de prints,
`node <plugin>/skills/lp-revisao/scripts/rodadas.mjs <pasta-anterior> <pasta-nova> <pasta-saida> --lighthouse-antes a.json --lighthouse-depois b.json`.
A diferença de imagem só informa (a mudança ficou onde mexi?); o Lighthouse reprova se uma categoria cair mais de
3 pontos, o LCP piorar 15% ou o CLS passar de 0,1. Guardar o relatório do Lighthouse de **cada** rodada.
**Sinais de site gerado** (cada um se justifica ou sai): mesma grade de cartões em toda seção; degradê e brilho
sem motivo; ícone genérico no lugar de foto; selo, número ou depoimento sem fonte; título que serviria a qualquer
empresa; o mesmo "sobe e aparece" em tudo; nenhuma ideia do ofício do cliente.
**Referências desta etapa** (ler na hora): `referencias/detalhes-de-interface.md` (lista de acabamento),
`critica-de-movimento.md` (julgar animação quadro a quadro), `conteudo-extremo.md` (nome longo, número grande,
sem foto), `juiz-as-cegas.md` (painel).
**O kit aprende a cada site:** todo defeito que um juiz achar e a máquina não achou vira item em
`problemas-do-kit`, para ser transformado em conferência automática. Consertar só na página não fecha o item.

## Rodada reproduzível (D6)
Rodar no projeto que tem `puppeteer-core` instalado:
```bash
node <plugin>/skills/lp-revisao/scripts/revisar-pagina.mjs http://127.0.0.1:5173 revisao/rodada-1
```
Pasta nova obrigatória: preserva a evidência anterior. Chrome/Edge com `BROWSER_EXECUTABLE` opcional;
perfil fica na saída, sem configuração global. Testa seis larguras × normal/reduzido, cinco posições de
rolagem; captura topo/meio/fim em 390/1440. Falha com código 1 em erro JS/rede/HTTP, imagem quebrada,
rolagem lateral, controle sem nome ou âncora inexistente. `relatorio.json` contém bytes observados e
LCP/CLS de laboratório, sem prometer fluidez física ou nota de Core Web Vitals. `indice.html` compara prints.
Complementar com `responsivo.mjs` (alvos/textos), teste de teclado, preferência reduzida alterada durante
uso, interrupção de animação, resize e falha deliberada de mídia. Não confundir auditoria estática com
esses testes de comportamento. Os testes do estúdio e do salão são exemplos reais locais.

Conferir também a informação visual: cada fotografia precisa demonstrar o penteado/serviço indicado;
inspecionar o arquivo e seu recorte, sem confiar no título da busca. Em aberturas rotativas, percorrer
todos os pares palavra/foto, pausar e trocar para movimento reduzido; não aprovar só o primeiro quadro.

Interações devem ser exercitadas repetidamente: entrar/sair da área do cursor pelo menos três vezes,
rolar para fora da seção e retornar nos dois sentidos, trocar a opção selecionada e usar toque/teclado.
Declarar se uma animação acontece uma vez ou a cada entrada e conferir o comportamento previsto.
Se uma intermitência relatada não for reproduzida, registrar esse limite; não apresentar uma hipótese
de causa como defeito confirmado. Os scripts `conferir-fotos.mjs` e `conferir-ima.mjs` do Estúdio Coral
registram exemplos locais desses testes.

Para cada rodada, gravar vídeo nos dois formatos com `lp-referencias/scripts/gravar-rolagem.mjs`.
Olhar os prints e assistir trechos dos vídeos: hierarquia/legibilidade/cortes/continuidade, origem da
animação, duração de UI e retorno após interrupção. Priorizar falhas, corrigir e repetir. Registrar a
crítica em tabela Antes/Depois/Por quê, com decisão e limitações. A revisão desta skill é executada
pelo agente responsável; não iniciar outro agente/processo de revisão quando o usuário pediu trabalho solo.
Nenhum print ou placar equivale à aprovação estética do usuário. Não escolher favoritos por ele.

Na entrega em vídeo, rotular a gravação e oferecer “Abrir o site” ao lado. Hover, toque, seleção de serviço
e links só podem ser avaliados na página real; o vídeo da vitrine não é a superfície interativa do site.

## Comparar com a referência (caminho por referência)
A cada seção construída (máx. 3 voltas por seção) e na revisão final, com o raio-x da referência no mesmo formato:
`node <plugin>/skills/lp-revisao/scripts/comparar-referencia.mjs <ref>/raio-x.json http://127.0.0.1:5173 comparacao/volta-1 [--secoes 1,2,4] [--copiar-prints] [--celular] [--lighthouse lh.json]`
No laço seção por seção, `--secoes` leva os números da REFERÊNCIA (roteiro.md) já construídos: as outras não geram
divergência e a fatia pode sair com código 0. Sem `--secoes`, compara a página inteira (revisão final).
`--copiar-prints` põe os prints dentro da saída, para a pasta abrir em outro computador.
Corrigir pela lista de `comparacao.md` (mais grave primeiro) e conferir em `lado-a-lado.html`. Código 0 = sem
divergência alta; 1 = há alta, corrigir antes de seguir; 2 = erro de uso ou medição.
**Olhar (obrigatório):** o número sozinho aprova fundo ruim. Quem compara (agente ou pessoa) DEVE abrir os prints de
`olhar.md` e devolver, além da lista de divergências, a nota 0–10 por seção e o que denuncia "feito por gerador";
seção que não passa nas réguas do juiz volta ao laço mesmo com código 0: régua A (nota 9 ou mais) ou régua B (na
tela, nosso >= referência em toda seção e média do nosso >= média da referência + 0,5), as mesmas do `juiz.mjs` e
de `referencias/juiz-as-cegas.md`; não mostrar como pronto sem passar numa delas. Na revisão final, juntar
`--cegas <pasta> --outras a.json,b.json`: o material vai a um avaliador sem rótulo; o gabarito fica na saída.

## 0. Clareza (obrigatório, antes das auditorias técnicas)
Um site que passa em todos os testes técnicos e confunde o visitante está reprovado (retorno de 04/11/2026:
"muita informação", "efeito forçado", "legal mas confuso").
1. **Densidade de texto:** `node <plugin>/skills/lp-revisao/scripts/densidade.mjs <url> revisao/densidade-N`
   conta as palavras visíveis a cada meia tela, no computador (1440×900) e no celular (390×844), e **sai com
   código 1** se alguma tela passar do limite (reprova a entrega; `--so-avisar` só em rodada exploratória).
   Seções de leitura levam `data-leitura` no elemento (serviços, preços, perguntas, rodapé) e ficam fora do
   alerta. Fora delas, tela acima do limite (padrão: 60 palavras no computador, 45 no celular) é falha a corrigir.
   Exceção só localizada: `data-densidade="<motivo>"` no elemento, o mesmo motivo no plano; o relatório lista
   essas telas à parte. A exceção cobre só as palavras marcadas: o texto sem exceção ainda precisa caber no limite.
   Relatórios antigos sem contagem explícita da exceção não aprovam automaticamente uma tela acima do limite.
   Marcar seção como leitura ou exceção para baixar o placar, sem tirar texto, é fraude da
   régua. Os limites de partida vêm da LP-12 e da `lp-textos`. **O limite é teto, não meta:** ficar abaixo não aprova nada, e
   cortar além do que a seção precisa empobrece o site tanto quanto o excesso o confunde. O relatório lista em
   `aOlhar` as telas quase sem texto e sem imagem grande; esse aviso não reprova, só pede que alguém olhe.
2. **Teste do porquê** (`lp-cenas`) para cada efeito do roteiro, respondido olhando o site, não o plano. Registrar
   a tabela Efeito / Fato do negócio / Entende sem legenda? / Decisão. Efeito que falha sai ou vira movimento discreto.
3. **Leitura às cegas** (a mesma da `lp-cenas`, agora no site pronto): alguém que não viu o plano (o Codex só de leitura, ou um subagente que recebe apenas os
   prints e o vídeo) descreve cada cena grande em uma frase e diz o que achou confuso. Se a frase dele não bate com
   a intenção do plano, a cena falhou, mesmo que esteja bonita.
4. **Rótulos e camadas:** no máximo 4 rótulos visíveis ao mesmo tempo dentro de uma cena; título, apoio e chamada
   nunca disputam com ficha técnica, créditos ou números de detalhe.

5. **Contra site vazio:** seção por seção, olhando o site, responder: *cada seção tem algo que prende o olhar e conteúdo
   suficiente para convencer?* Registrar a tabela Seção / O que prende o olhar / O que convence / Decisão. Prende: foto forte,
   objeto real, escolha que a pessoa faz, tipografia com presença. Convence: o que ela precisa saber para dar o próximo passo.
   Tela com respiro e uma coisa só é aceita quando essa coisa é forte. A resposta "não" pede imagem melhor, interação com
   motivo ou o dado que falta, sempre dentro do teto; não é licença para encher a tela nem para aumentar o limite (DEV-41).
6. **Imagens:** toda foto passa no critério de qualidade da `lp-assets`, olhada no recorte final a 100%. Reprovada, sai ou
   troca de solução visual, mesmo com licença em ordem.

**Portão de entrega:** só mostrar ao usuário com `revisar-pagina.mjs` e `densidade.mjs` (normal e
`--reduzido`) saindo com código 0, `validar-assets.mjs` aprovado, a tabela contra site vazio preenchida e a leitura às
cegas batendo com o plano. Conferir o código de saída, não o texto.

## 1. Prints reais
Com o servidor rodando: `node <plugin>/skills/lp-revisao/scripts/prints.mjs <url> <pasta> [seletores...]`
(Edge via DevTools; espera fontes e animações; computador 1440, tablet 834 e celular 390; seletores opcionais
como `#cabelo #noivas` geram prints dessas seções). Olhe cada print de verdade antes de seguir.

## 1b. Responsividade (obrigatório)
`node <plugin>/skills/lp-revisao/scripts/responsivo.mjs <url>` testa 360, 390, 414, 768, 1024 e 1440px:
rolagem lateral, elementos vazando, toque < 44px e texto < 13px. Só entregar com todas as larguras OK.

**Portão do celular (obrigatório):** `node <plugin>/skills/lp-revisao/scripts/celular.mjs <url> [pasta] [--larguras 360,390] [--deitado] [--json]`
confere os 7 itens (opções e regras no cabeçalho do script) e sai 0 (passou), 1 (falhou) ou 2 (sem Chrome). Site que
falha não é mostrado como pronto; o relatório diz "Safari conferido" ou "Safari não conferido".

## 2. Detector anti-IA (obrigatório)
`node <plugin>/skills/taste-skill/scripts/lint.mjs <src>` (código) e
`node <plugin>/skills/taste-skill/scripts/inspect.mjs <url>` (página aberta no navegador).
Meta: **zero FAIL** que a direção de arte não tenha pedido. Registre o número de achados no plano do
cliente para comparar versões. O placar é só um apoio: quem decide é o usuário olhando no celular.
Faixa infinita, contador e cartão 3D restilizados não são reprovados só por existirem (DEV-34): conferir
o roteiro, a função e o comportamento. O detector atual não tem regra específica contra essas técnicas;
ele pode apontar padrões relacionados (ex.: `side-scroll`, `numbering`, `hairline`). Uma exceção estética
precisa de justificativa no plano e do ID exato no `--allow` do inspetor; no lint, só a linha específica
com `taste-skill-ignore`. Não ignorar arquivo inteiro nem liberar uma família inteira. Exceção de estilo
não dispensa contraste, legibilidade, imagens válidas, foco, largura correta e movimento reduzido.

## 3. Auditorias de design
- `hallmark audit <pasta>`: lista priorizada de anti-padrões (não edita). Achado que manda cortar movimento
  passa pelo teste do porquê (seção 0): corta se o efeito falhar nele, fica se passar. Quem decide é esta skill,
  não a auditoria (DEV-42).
- `/impeccable critique` e `/impeccable audit`: hierarquia, clareza, acessibilidade, responsivo, performance.
Corrija os 3 piores pontos e repita (até 3 rodadas).

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- `web-design-guidelines`: regras fixadas em `guidelines.md` (sem buscar na internet), com as exceções de pt-BR.
- `review-animations`: curvas, durações, interrupção e GPU (execução, não se a cena deve existir).
- Movimento (DEV-42): conferir o roteiro; reprovar cena grande sem fato do negócio, efeito que falha no teste
  do porquê, duas cenas presas da mesma família e o mesmo "sobe e aparece" em todas as seções de leitura.
- `break-ui`: textos longos, nomes compridos, foto que não carrega.
- `web-perf`: Core Web Vitals e Lighthouse no build (`vite preview`).

## 4. Checklist técnico
- Celular 375–390px sem rolagem lateral; título principal visível sem depender de animação.
- Contraste: texto ≥ 4,5:1; nada de texto cinza sobre cor.
- Fontes hospedadas no projeto e só os pesos usados; imagens WebP com `srcset`; vídeo ≤ 2,5 salão piloto e com capa.
- `prefers-reduced-motion` respeitado; foco visível; botões ≥ 44px.
- Todos os botões de WhatsApp com mensagem certa; telefone, endereço e horário conferidos com a fonte.
- Em site de cliente, números, depoimentos e prêmios só se reais, com fonte anotada. Em prova fictícia,
  conteúdo demonstrativo precisa estar identificado como tal; não apresentá-lo como prova de negócio real.
- `noindex` enquanto for demonstração; imagem Open Graph 1200×630; favicon; console sem erros.
- Mesmo conteúdo em computador × celular e normal × reduzido (descrição que some no celular é falha); teclado
  com Tab e Shift+Tab dentro de trilhos e cenas presas (o foco precisa trazer o cartão para a tela).
- Desempenho além da carga: peso e CLS depois de rolar a página inteira e tarefas longas na rolagem
  (`pilotos/prova-design/ferramentas/medir-todos.mjs`). Lighthouse alto não encerra a revisão; fluidez do 3D só
  se aprova em aparelho físico. Zero avisos do detector anti-IA não é mérito estético.

## Armadilhas já vistas (salão piloto, out/2026)
- O Vite sobe só em IPv6: o inspetor da taste-skill precisa de `http://[::1]:<porta>/` (localhost/127.0.0.1 recusam).
- `scroll-behavior: smooth` estraga prints: o script já rola com `behavior: 'instant'`; use `seletor@n` para
  fotografar seções fixas (sticky) n telas adiante.
- O painel do navegador do app distorce em 1440px; prefira `prints.mjs` para revisar.

## 5. Comparar versões
Para cliente com site 1 e site 2: prancha lado a lado (mesmas seções, mesmas larguras) + tabela com achados do
detector, peso da página e impressões. Envie ao usuário.

## Busca no Google
Rode o checklist da `lp-seo` (parte E) e anote no `seo.md` o que falta, do mais grave para o menos.

## Bordas
Conferir nos prints (computador e celular): raio consistente com o estilo e nenhuma quina vazando durante
a animação. `brutalista-grafico` e outras direções que peçam quinas vivas conservam essas quinas; não
arredondar a página para satisfazer uma regra de outro estilo. Nos demais casos, seguir o raio do plano.

## Várias rodadas, com a nota vinda de fora (pedido do usuário, 16/10 e 11/11)
Revisar em **3 rodadas** (ou até não sobrar falha grave): prints computador/celular + vídeo da rolagem →
lista do mais grave ao menos → corrigir → repetir. Registrar cada rodada no relatório.
**A nota vem do painel às cegas, nunca de quem fez** (`referencias/juiz-as-cegas.md`):
1. `node <plugin>/skills/lp-revisao/scripts/juiz.mjs montar <prints-nosso> <prints-referencia> <pasta> [--juizes 4]`,
   com os prints **originais** da referência. Cada juiz ganha um papel (direção de arte; tipografia e acabamento;
   celular e uso; com 4, o dono do negócio). Sem referência, o alvo é a régua do dono (`lp-maestro`), se existir.
2. O `montar` cria uma pasta neutra por juiz, fora do projeto, e imprime o caminho de cada uma (a lista fica em
   `<pasta>/gabarito/pastas.json`). Um agente novo por pasta neutra, dizendo só: "Leia `<pasta neutra>/pedido.md`
   e faça o que ele pede. Leia só essa pasta." Nunca passar ao juiz a pasta de saída nem o `gabarito/`. Variar o modelo entre os juízes quando houver (outra família vale mais que mais um juiz igual). Nunca
   usar como juiz quem montou o material ou viu o gabarito.
3. `juiz.mjs fechar <pasta>`: mediana, diferença maior-menor e o que só um papel apontou. Diferença acima de 1,5
   sai como "dúvida: chamar o dono"; dúvida de gosto se mostra em duas opções lado a lado (A/B).
4. O Codex entra sempre, só de leitura: pares nas duas ordens e prints + código (comandos na referência). O
   movimento vai a um juiz próprio, com tira de quadros (`critica-de-movimento.md`).
