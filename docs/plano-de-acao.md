# DevConductor — Plano de ação (10/11/2026)

> Plano vigente do projeto. Estado: **proposta com padrões já assumidos** (seção 7); o Neemias pode mudar qualquer um.
> O roteiro de outubro está em [historico/plano-de-acao-2026-10.md](historico/plano-de-acao-2026-10.md).
> Detalhe de cada parte: [design por referência](planos/2026-11-10-design-por-referencia.md) (R0–R9) e
> [projeto geral](planos/2026-11-10-projeto-geral.md) (G1–G7). Onde paramos: [continuar.md](continuar.md).
> Índice dos planos vigentes: [planos/README.md](planos/README.md).

## 1. Para que serve
Um kit de plugins que deixa o Neemias fazer, sozinho e gastando pouco, **landing pages animadas com nível de estúdio
para vender a negócios locais** e, depois, sistemas com a mesma qualidade. O kit escolhe quem faz cada tarefa e com
qual modelo, guarda o que foi decidido e leva do cliente encontrado ao site no ar.

## 2. O que é "completo"
O projeto está completo quando estas oito frases forem verdade, cada uma com prova:
1. **Escolher:** para qualquer ramo, o kit mostra dezenas de sites bons e animados e o Neemias escolhe a base em minutos.
2. **Fazer parecido e melhor:** o site sai fiel à base escolhida e não é apontado como "o gerado" na leitura às cegas.
3. **Vender:** um cliente real recebeu rascunho, proposta e site publicado por um roteiro escrito.
4. **Repetir:** o segundo site do mesmo ramo sai em até 2 sessões.
5. **Casa em ordem:** sessão nova entende o projeto em menos de 200 linhas; nada no kit sem uso medido.
6. **Sistemas:** uma tela de sistema real feita pelo mesmo método e aprovada.
8. **Aparecer no Google:** cada site sai com medição de antes e depois e relatório mensal; nada prometido além do que se mede.
7. **Seguro e bem estruturado:** num sistema de exemplo com falhas plantadas, o kit acha todas antes do envio; decisões de
   arquitetura ficam escritas; um sistema real passou por auditoria de segurança.

## 3. Onde estamos
| Frase | Hoje |
|---|---|
| 1 Escolher | galeria existe para 10 ramos; faltam os ramos da prospecção, filtros e recomendados |
| 2 Parecido e melhor | **não**: depois da escolha, o kit ainda parte dos 7 estilos prontos; nada compara com a base |
| 3 Vender | prospecção feita; nenhum rascunho, proposta ou venda |
| 4 Repetir | não medido |
| 5 Casa em ordem | `continuar.md` com mais de mil linhas; 42 skills só de landing page; uso não medido |
| 6 Sistemas | plugin existe, sem prova |
| 7 Seguro e estruturado | há 3 agentes de segurança e 1 skill de varredura, e arquitetos só de .NET e banco; **nada é obrigatório no fluxo** e nunca foi medido |

## 4. Etapas, em ordem de prioridade

### Etapa 1 — Design por referência (frases 1 e 2) · a prioridade
| Parte | O que entrega | Quem |
|---|---|---|
| R0 | Galeria de interiores/móveis (gerada em 10/11: 222 sites) com "12 recomendados" e a aba de marcas famosas (S2); demais ramos depois | `[sonnet]` + `[regente]` |
| R1 | **Fatia de prova:** abertura + cena principal de uma base escolhida, lado a lado com ela. Parada: vale ou não vale | `[regente]` |
| R2 | Raio-x: mede a base seção por seção e escreve o roteiro da página | `[difícil]` |
| R3 | Maestro "por referência": um conceito fiel + laço construir → comparar → corrigir | `[regente]` |
| R4 | Comparador, leitura às cegas e teste com 3 pessoas (S8) | `[difícil]` |
| R5 | Acervo de efeitos com código aberto, ligado ao raio-x | `[difícil]` |
| R10 | **Celular bem desenhado e sem quebrar:** composição do celular decidida seção por seção a partir da medição da referência no celular, construção começando pelo celular e comparação nos dois tamanhos; conferência de toque, menu, contato, formulário e rede lenta feita pelos scripts do kit; só o motor do Safari usa ferramenta de fora, opcional; portão de 7 itens (pedido de 11/11) | `[regente]` + `[difícil]` |
| R11 | **Raio-x mais completo:** contraste por seção, ritmo do movimento (durações e curvas) e arquivo de medidas pronto para construir — três ideias do `designlang` trazidas para o nosso raio-x | `[difícil]` |
| R6 | Imagens: tratamento único das fotos do cliente; imagem gerada só como encaixe opcional | `[regente]` |

### Etapa 1b — Visibilidade no Google (frase 8) · pedido do Neemias em 10/11
Detalhe em [visibilidade no Google](planos/2026-11-10-visibilidade-google.md) (B1–B8): linha de base, relatório mensal, clique no
WhatsApp como conversão, roteiro do Perfil da Empresa por ramo, regra de propaganda em saúde, velocidade em site animado.
As partes baratas (B1, B2, B4, B6) entram antes do teste com as 3 empresas.

### Etapa 2 — Prova completa, depois cliente real e venda (frase 3)
| Parte | O que entrega | Quem |
|---|---|---|
| R7 | **Teste do kit: 3 sites, um para cada empresa real** da segunda escolha de 10/11 (móveis planejados, implantes dentários, vestidos de noiva), pelo fluxo inteiro. Rascunhos locais, sem publicar e sem abordar | `[regente]` |
| V0 | **Nova análise de clientes em Marília, em qualquer ramo**, só depois do R7 aprovado (pedido do Neemias em 10/11); a lista de 10/11 vira ponto de partida | `[regente]` + pesquisa `[sonnet]` |
| V3 | Abordagem: os 3 rascunhos do teste (se aprovados) e os clientes novos da V0 | `[regente]` |
| G1 | Roteiro de venda: abordagem com **vídeo de 15 s da rolagem** (S5), proposta de uma página, preço, o que o cliente manda, prazo, como recebe, publicação | `[regente]` |
| V1 | Planilha de contatos em uso (a coluna "Status do contato" já existe, vazia) | `[sonnet]` |
| V2 | **Página do próprio Neemias** vendendo o serviço, feita pelo mesmo método (S1): prova de repetição e cartão de visita | `[regente]` |

### Etapa 2b — Arquitetura e segurança de sistemas (frase 7) · pedido do Neemias em 10/11
| Parte | O que entrega | Quem |
|---|---|---|
| A1 | **Portão de segurança no fluxo de sistema:** antes de construir, lista curta de riscos (login, permissões, dados pessoais, segredos, envio de arquivo, pagamento); antes de enviar, revisão do `security-auditor` em toda mudança sensível | `[regente]` |
| A2 | **Varredura automática** antes do envio: segredos, dependências com falha conhecida e análise do código, num comando só | `[difícil]` |
| A3 | **Prova:** sistema de exemplo com falhas plantadas (injeção, tela sem permissão, segredo no código, regra de acesso do banco aberta); o kit precisa achar todas | `[difícil]` |
| A4 | **Arquitetura:** skill própria (decisão escrita em linguagem simples, limites entre módulos, conferência antes de mudança grande) e arquiteto geral, não só de .NET e banco | `[regente]` |
| A5 | **Auditoria do Sistema de Gestão:** só relatório, pela conversa daquele projeto; nada alterado sem aprovação | `[difícil]` |
| A6 | **Regras e método recebidos em 11/11** (avaliados antes de entrar): nada sensível no console ou em log; token de acesso fora do alcance de script (nunca em `localStorage`; cookie só com `HttpOnly`, `Secure` e `SameSite`); limite de tempo, tamanho e tentativas em toda entrada; consulta ao banco sempre com parâmetros; e auditoria em **duas passadas** — primeiro por lista, corrige, depois outro agente procura falhas "com outra visão", sem ver o primeiro relatório. Cada regra só vale com teste que falha quando ela é quebrada | `[regente]` + `[difícil]` |

Detalhe das partes, das fontes prontas avaliadas e das dicas em [arquitetura e segurança](planos/2026-11-11-arquitetura-e-seguranca.md).
A A5 não disputa arquivos com o design e pode rodar antes, numa sessão do próprio Sistema de Gestão.

### Etapa 3 — Repetir rápido (frase 4)
| Parte | O que entrega | Quem |
|---|---|---|
| P1 | **Molde por ramo** (S6): depois de cada site aprovado, guardar a base reaproveitável (estrutura, cenas, textos-modelo) | `[difícil]` |
| P2 | **Rascunho-isca** (S4): um comando que, a partir dos dados públicos do negócio, monta a abertura personalizada no molde do ramo | `[difícil]` |
| P3 | **Caminho rápido** (S3): para cliente de preço baixo, partir de modelo com licença aberta em vez de reconstruir | `[sonnet]` |
| R8 | Galeria ampla: 6+ ramos, filtros, aba de efeitos | `[sonnet]` |

### Etapa 4 — Casa em ordem (frase 5)
| Parte | O que entrega | Quem |
|---|---|---|
| G2 | Documentação enxuta (pode rodar antes, é barata) | `[sonnet]` |
| R9 + G3 | Kit do tamanho do uso; um método só na abertura da sessão | `[difícil]` |
| G4 | Gerador do repositório público com conferência e volta atrás | `[difícil]` |
| G6 | Faxina das pendências do kit | `[sonnet]` |

### Etapa 5 — Sistemas e provas finais (frase 6)
| Parte | O que entrega | Quem |
|---|---|---|
| G5 | Aparelho físico; decisões "inferidas" confirmadas | `[regente]` |
| G7 | Método por referência aplicado a telas de sistema | `[regente]` |

## 5. Sugestões diferentes
| # | Sugestão | Por que ajuda | Situação |
|---|---|---|---|
| S1 | Página do próprio Neemias como segundo site | não depende de cliente, prova a repetição e dá credibilidade na abordagem | **entra** (V2) |
| S2 | Marcas famosas como base: 84 fichas de design já estão na pasta de originais | escolher "no rigor de tal marca" sem depender de galeria que bloqueia robô | **entra** (R0) |
| S3 | Modelo com licença aberta como caminho rápido | qualidade alta com poucas sessões para cliente de preço baixo | **entra** (P3) |
| S4 | Rascunho-isca em um comando | cada abordagem chega com a página do próprio cliente; é o que mais aumenta a chance de fechar | **entra** (P2) |
| S5 | Vídeo da rolagem na mensagem | o dono vê o site sem clicar em link de desconhecido; a ferramenta de gravar já existe | **entra** (G1) |
| S6 | Molde por ramo | segundo buffet ou segunda marcenaria sai em horas | **entra** (P1) |
| S7 | Mensalidade (hospedagem + pequenas mudanças) com relatório mensal de visitas e cliques no WhatsApp | renda que se repete e prova de resultado para a venda seguinte | opção de negócio: decisão do Neemias |
| S8 | Mostrar duas versões a 3 pessoas e perguntar qual parece mais profissional | teste humano grátis, pega o que agente não pega | **entra** (R4) |
| S9 | Usar os créditos de teste de imagem antes de vencerem para um banco de fundos, texturas e vídeos curtos dos ramos da prospecção | os créditos vencem de qualquer jeito; nunca para peça falsa (LP-11) | opção: só com pedido |
| S10 | Segundo olhar independente no lado a lado (parceiro de revisão já configurado) | reduz o viés de quem construiu | opção, a partir do R4 |

## 6. Ritmo
Uma parte por sessão. Estimativa: R0 e R1 em 2 sessões (já sai a abertura do site da primeira empresa);
Etapa 1 inteira em 10–14 sessões; Etapa 2 em 5–8. Não começar a Etapa 3 sem a resposta do primeiro cliente.
Paradas obrigatórias: **R1** (o método vale?) e **R7** (o Neemias usaria este site para vender?).

## 7. Padrões assumidos (mudam se o Neemias disser)
1. O teste são **3 sites para 3 empresas reais** (pedido do Neemias em 10/11), as três da segunda escolha de 10/11 (critério: anuncia hoje e
   não tem site), uma por ramo. Ordem: móveis planejados (galeria pronta; é a fatia do R1), implantes dentários, vestidos de noiva. Só dado público, pasta
   fora do git, `noindex`, nada publicado nem enviado. Ele pode trocar qualquer uma das três.
2. No R1 a fatia segue a base escolhida; o que incomodar vira "o que muda". As preferências antigas de estilo só
   são alteradas no kit (R3) depois de ele ver o lado a lado e dizer.
3. Nada pago: imagem gerada, domínio e plano só entram depois da primeira venda.
4. Nomes e dados de clientes ficam fora do repositório.

## 8. O que não fazer
- Plugin, stack ou ferramenta nova de design antes da parada do R1.
- Refazer os sites de exemplo ou retomar clientes pausados sem pedido.
- Contornar bloqueio de robô, login ou termos de uso; copiar código, texto, foto ou marca sem licença aberta.
- Mexer na configuração global ou em outros projetos sem pedido.

## 9. Como seguir cada parte
Ler este plano, a parte no plano de detalhe e o `continuar.md`. Ao terminar: suíte com código de saída,
`claude plugin validate`, versão do plugin mexido + `node scripts/atualizar-marketplace.mjs`, `continuar.md` atualizado.
