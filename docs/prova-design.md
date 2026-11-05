# Prova de design — 29/10/2026

**Esclarecimento final de 30/10:** o usuário queria reformular a carga, não retirar a cena 3D. Escolheu
caixas de ovos (DEV-38). Abertura 3D retomada com novo GLB, câmera/âncoras/luz/pôsteres adaptados; a abertura
somente fotográfica foi uma etapa intermediária. Detalhes da entrega atual em `docs/continuar.md` e
`pilotos/prova-design/lastro-cargas/assets.md`. As medições do caixote antigo são históricas.


**Feedback posterior de 30/10 (DEV-37):** caixote substituído por abertura rodoviária com caminhão real;
Coral com fotos coerentes/sincronizadas, sem shader RGB, e CTA que reage novamente ao retornar.24/24
cenários nos sites alterados, complementos específicos aprovados e quatro vídeos atualizados. Referências
à direção 3D e medições anteriores abaixo são históricas; não são resultados da abertura atual.


**Atualização 30/10:** refino da rodada Codex após a escolha explícita do usuário. Escala, permanência e
movimento automático calibrados nos três exemplos; identidades e cenas preservadas. Resultados e limites
em [refino-exemplos-codex.md](refino-exemplos-codex.md). As medições históricas abaixo não foram refeitas.

Três demonstrações fictícias construídas e revisadas: Lastro Cargas (imersivo 3D), Estúdio Coral (cinético vibrante) e Barbearia Seco (brutalista gráfico). Vitrine local: http://127.0.0.1:5196/. Esta retomada preservou os commits anteriores e não fez commit, envio ou publicação.

## Feedback e próxima rodada (DEV-36)

Neemias gostou muito dos exemplos e da originalidade, com ressalva de alguns exageros leves. Pediu outros
sites parecidos depois, feitos pelo Claude, e separação clara da rodada atual do Codex. A vitrine agora
identifica os grupos. “Codex” é o rótulo desta versão consolidada/revisada; não apaga a construção anterior
nem as contribuições dos dois. A rodada Claude ainda não começou e será preservada em pasta própria.
Instruções para a próxima retomada: `pilotos/prova-design/rodada-claude/README.md` e topo de `docs/continuar.md`.
Refinar escala/ritmo/competição entre efeitos, preservando a personalidade e o movimento; sem reescrever
os exemplos atuais para fingir uma rodada nova. Apreciação geral não é aprovação de cada detalhe.

## Entregas

- Lastro: caixote GLB real, câmera em capítulos, rota desenhada e lateral; pôster e Open Graph ausentes foram gerados. Corrigidos overflow e manifesto no tablet. Iluminação HDR adaptada e imports enxutos, preservando a cena. Revisão final de produção 12/12 em estudio-coral/revisao/lastro-producao-final-29-10; revisão inicial 10/10 no próprio site.
- Coral: texto cinético, cortinas, Lottie original por progresso, distorção WebGL e esteira; build e revisão 12/12 aprovados. Testes adicionais de teclado, mensagem por serviço, resize, preferência dinâmica e JSON Lottie indisponível aprovados. Corrigidos contraste das etapas e atalho sobre crédito.
- Barbearia: máscara, peso tipográfico, lupa/toque, pilha e placar. Build e revisão 12/12 aprovados. Corrigidos Lenis ao trocar movimento reduzido, foco no amarelo e instrução de toque. Cinco cenários complementares aprovados.

Planos, assets e relatórios locais em pilotos/prova-design/<site>/. Conteúdo e contatos explicitamente fictícios, noindex e créditos publicados. Links de WhatsApp foram conferidos sem enviar mensagens. Os pilotos de clientes antigos foram somente lidos para comparação.

## Revisão independente e comparação

Barbearia revisou Coral: ajustes de contraste e atalho implementados; cartão Twist tipográfico mantido como decisão do roteiro. Lastro revisou Barbearia: instrução de toque corrigida; suposto defeito do placar descartado após conferir o estado estabilizado aos 5 s. Capturas e justificativas nas pastas revisao/coral-leitura e revisao/critica-barbearia.md.

A revisão principal viu aberturas desktop/celular, cenas e quadros de rolagem, além dos pilotos de clientes (transportadora e salão). Lastro usa uma peça real de carga, evitando a reprodução de caminhão montado em código da Transportadora. Coral muda paleta, tipografia e famílias de movimento em relação ao editorial MB; não se limita a repetir a entrada de fotos. Barbearia explora quinas, P&B e tipografia em vez de copiar o salão. Essa diversidade é evidência de repertório, não certificação de nível Awwwards ou aprovação estética do usuário.

## Crítica independente e correções finais

A crítica solicitada foi concluída em `.codex/resposta-prova-design.md`, com as cinco folhas, roteiros, código,
créditos e medições. Notas provisórias (não oficiais): Lastro 6,5; Coral 7,5; Seco 7,6; transportadora-cliente 7,1; salão-cliente 6,9.
Ela não concluiu que os três novos superam os pilotos: Lastro ficou 0,6 abaixo da Transportadora e Coral 0,6 acima do salão-cliente.
As notas não foram recalculadas após as correções e a barbearia não tem antecessor comparável.

| Achado | Tratamento e evidência |
|---|---|
| Lastro: grandes deslocamentos ao prender/soltar cenas | Abertura, rota e docas usam palco sticky com percurso reservado. Probe identificou `#rotas`/`#servicos` como fontes; preservados resultados anteriores. Percurso nativo com roda, retorno e toque: maior janela 0 no celular e 0,0009 no desktop, antes aproximadamente 3,9. |
| Lastro: leituras de layout intercaladas às escritas em cada quadro | Medidas das legendas agrupadas em resize/ResizeObserver; render só projeta e escreve. Isso não certifica fluidez de GPU física. |
| Lastro: reduzido dinâmico, foco recortado e navegação | Lenis criado/destruído pelo matchMedia; Tab/Shift+Tab revelam todas as docas; salto ao conteúdo e atalhos móveis, com espaço reservado. |
| Lastro: três paradas consecutivas | Foto mantém abertura/escala inversa, agora durante passagem contínua, entre rota e serviços. |
| Coral: contraste e agenda vazia | Tokens textuais mais escuros, permanências distintas e ação “marcar horário” revelada ao concluir o zoom. |
| Coral: textura excessiva e ciclos sem pausa | Textura 960 no celular; controle de pausa/retomada da abertura, suspensão fora da tela/aba; CTA final da esteira traz o foco para a tela. |
| Seco: negativo prejudica acabamento e descrição móvel ausente | Ampliação em cor normal por clique/toque/teclado; descrições nas legendas também no reduzido. |
| Seco: faixa sem pausa e botão sobre “DETALHE” | Pausa compartilhada das faixas e suspensão fora da tela; atalho oculto enquanto o título está visível. |
| Métricas iniciais omitiam experiência completa | Resumo agora distingue bytes da carga e do percurso, soma de deslocamentos e CLS por janela, callbacks RAF e tarefas longas. |

Comportamento: `vitrine/revisao-critica-29-10-r2` (6 casos; revelou deslocamentos ainda altos),
`revisao-critica-29-10-r3` (Lastro corrigida, 2 casos) e `revisao-critica-29-10-coral-foco`
(pausa/retomada e foco no CTA da esteira, 2 casos). A primeira execução falhou porque o teste exigia Lenis
também no Coral, que não o utiliza; a asserção foi corrigida sem introduzir Lenis na página.
Revisão final em seis larguras × normal/reduzido: **36/36**, `vitrine/qa-pos-critica-29-10/`.

Continuam recomendações de direção, não defeitos técnicos declarados resolvidos: identidade fotográfica
mais coesa, linguagem de documentação da carga e maior ligação visual entre a trança e as demais seções.
Não foram inventadas fotografias de equipe/espaço de empresas fictícias como se fossem provas reais.

## Desempenho observado

Primeira rodada serial: Lighthouse 13.6.0, produção, um ensaio por página/dispositivo; software WebGL e celular simulado. Evidências completas e resumo em pilotos/prova-design/vitrine/medicoes-29-10/.

| Site | Nota móvel | Nota desktop | LCP móvel ms | TBT móvel ms | CLS Lighthouse móvel |
|---|---:|---:|---:|---:|---:|
| Lastro antes do ajuste de iluminação | 48 | 67 | 6379 | 2961 | 0 |
| Coral | 90 | 100 | 3532 | 119 | 0,008 |
| Barbearia | 95 | 100 | 2886 | 99 | 0 |
| Transportadora v2 anterior | 69 | 67 | 754 | 5473 | 0,017 |
| salão-cliente anterior | 52 | 74 | 5258 | 236 | 1 |

Lastro foi ajustado depois desta comparação: HDRI local reduzido e chunk de cena 269,05 kB gzip. Também foi introduzido primeiro quadro real como pôster e carregamento do 3D por gesto ou idle após load. Nova rodada em medicoes-lastro-final-29-10; o início dela coincidiu com a conferência técnica, portanto é exploratória e não uma comparação controlada. A nota móvel observada foi 80, LCP757ms/TBT890ms/CLS0. O desktop pós-ajuste falhou na primeira chamada e foi repetido isoladamente; a falha ficou preservada. Não atribuir causalidade nem afirmar que toda a página transferiu só o peso observado na carga inicial.

O desktop repetido registrou 100, LCP206ms/TBT23ms/CLS0,00094. Existe outra rodada serial anterior à crítica
em `medicoes-final/`: Lastro94/100, Coral81/100, Seco95/100, ANS69/70, MB51/74 (celular/desktop).
Não misturar as rodadas nem interpretar variação de máquina/cache como efeito causal. Esses números não
foram repetidos após cada correção e não representam uma aprovação da experiência inteira.

Depois da crítica, Lastro foi percorrida novamente, isolada, em produção: **978KB celular / 2057KB desktop**
após percorrer tudo, CLS por janela **0,001/0,001**. Intervalos RAF P95 18,2/30,3ms; 11/18 intervalos >100ms.
Ainda houve tarefas longas (maior 922ms no celular simulado, incluindo carga); o 3D continua exigindo ensaio
físico. Evidências em `medicoes-pos-critica-29-10/`, sem afirmar melhoria de FPS ou ganho comercial.

O medidor de rolagem registra requestAnimationFrame, CPU4× e software WebGL; seus valores acima de60 não medem quadros físicos de um celular. O campo cls desse helper soma eventos durante rolagem forçada, sem a janela padrão de CLS: usar os valores Lighthouse na tabela, sem confundir as duas medidas. Aparelho físico, GPU real, dados de campo e conversão comercial não foram testados.

O helper atualizado preserva `cls` para compatibilidade, identifica a metodologia e acrescenta `clsJanela`
(janelas com intervalo de 1s/duração máxima de 5s) e eventos de tarefas longas. Mesmo a janela correta em
rolagem programática continua sendo observação de laboratório. Os “FPS” dos resumos antigos são callbacks.

## Vídeos e vitrine

Seis vídeos novos e 36 quadros em vitrine/rodada-29-10, com duração e seek conferidos por ffprobe. Durações reais: Coral41,1/34,4s; Barbearia44,8/30,7s; Lastro160,3/72,5s (desktop/celular). O gravador aguarda roda e captura: pedido22s não significa duração real22s e não prova travamento do site. Quatro vídeos anteriores preservados para comparação.

As rodadas antigas (`rodada-29-10/` e `final/`) foram preservadas. A rodada `pos-critica-29-10/` documenta os
três builds corrigidos; a vitrine principal aponta para ela e mantém acesso às comparações anteriores.
O arquivo parcial de `lastro-final-29-10/`, interrompido a pedido durante a auditoria, não foi promovido a final.
Os seis WebM finais e seus 36 quadros passaram na conferência de dimensões, duração e busca no meio por
ffprobe/ffmpeg (`verificacao-videos.json`). Durações reais desktop/celular: Lastro116,2/48,2s;
Coral31,5/21,1s; Seco33,2/21,0s. Quadros de cenas/contatos foram inspecionados; não se alegou reprodução
integral dos seis vídeos. A vitrine foi aberta no navegador e os três players carregaram sem erro.
O bloqueio adicional da animação do Coral enquanto encoberta pelos serviços foi afinado depois dos vídeos;
a aparência não muda, e esse estado foi conferido em `revisao-critica-29-10-coral-cobertura` (2/2).

## Kit e verificações

landing-pages **0.3.3** e marketplace atualizados. Além das lições de assets/estilo da 0.3.2, o kit registra
variedade perceptiva, ideia central, fotografia coesa, preferência dinâmica, pausa, foco em trilhos e leitura
de desempenho após rolar tudo. Nenhuma skill nova instalada nesta retomada.

Suíte completa:308 aprovados,2 pulados por plataforma,0 falhas, saída0; log pilotos/testes-temporarios/validacao-prova-design-29-10.log. Manifestos raiz/landing-pages e git diff --check aprovados. Sem alteração de configuração global ou de clientes pausados.

Repetição após as correções: **308/310,2 pulados,0 falhas, saída0** em
`pilotos/testes-temporarios/validacao-pos-critica-29-10-r2.log`. A primeira execução reprovou apenas no controle
de versão porque o import do scanner havia deixado bytecode Python no plugin. Esse cache foi preservado
junto às evidências temporárias da auditoria; não se aumentou a versão do núcleo para encobrir o artefato.

A prova entrega três experiências e registra os limites encontrados pela crítica. Aprovação estética do usuário,
fluidez em aparelho físico e pré-render/experiência sem JS completa continuam sem validação nesta rodada.
