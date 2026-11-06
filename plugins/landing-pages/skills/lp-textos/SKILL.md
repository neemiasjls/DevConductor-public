---
name: lp-textos
description: Escreve os textos de uma landing page na voz do negócio do cliente, com fatos reais e sem os clichês de texto gerado por IA. Use ao redigir ou revisar títulos, chamadas, serviços, perguntas frequentes e a mensagem de venda.
---

# Textos com a voz do cliente

## Fontes da voz
Legendas do Instagram, falas em vídeo (inauguração, podcast), avaliações de clientes e a bio. Copie expressões
que o próprio negócio usa (ex.: "Onde cada cabelo conta uma história", "Sala da Noiva") e cite falas com aspas e
contexto. Revise com as consultoras abaixo.

## Regras
- Só fatos com fonte: números, prêmios, marcas, depoimentos e anos de experiência precisam estar no material
  coletado. Sem fonte, não entra.
- Títulos concretos, ligados ao serviço e ao resultado ("Loiro que não amarela", "Seu dia começa na Sala da
  Noiva"), não slogans genéricos.
- Uma ideia por frase; parágrafos de até 3 linhas no celular.
- **Quantidade por tela (LP-12).** Quase ninguém lê tudo: 79% escaneiam e só 16% leem palavra por palavra, e a
  versão concisa e escaneável do mesmo texto rende muito mais (NN/g, *How users read on the web*). Alvo: metade
  das palavras do primeiro rascunho.
  | Onde | Limite de partida |
  |---|---|
  | Título de seção | até ~8 palavras |
  | Apoio (texto sob o título) | até ~25 palavras, uma frase ou duas |
  | Tela de abertura ou de cena | um título + um apoio + uma chamada; nada além disso |
  | Etapa de uma cena presa | até ~12 palavras por etapa |
  | Rótulo dentro de cena (legenda, marcador) | até ~4 palavras; no máximo 4 rótulos visíveis ao mesmo tempo |
  Serviços, preços, perguntas e rodapé são seções de leitura e podem passar disso, em lista escaneável.
  Estourar o limite fora delas exige motivo no plano e `data-densidade="<motivo>"` no elemento; o `densidade.mjs` da `lp-revisao` mede e reprova o resto.
- **Resultado, não aula.** Falar do que o cliente ganha ("degradê que cresce sem marcar"), não da técnica de
  como o profissional faz ("pente 0 na nuca, 0,5, 1…"). Termo técnico só se o público usa para pedir o serviço.
- Ficha técnica, créditos de foto e números de detalhe ficam pequenos e longe do título; nunca competem com ele.
- Chamadas de ação com o que acontece de verdade: "Chamar no WhatsApp", "Agendar avaliação de cor".
- Português do Brasil coloquial e elegante; sem anglicismo desnecessário.

## Clichês proibidos (cara de IA)
"eleve", "transforme sua experiência", "experiência única/inesquecível", "jornada", "desbloqueie", "no coração
de", "mais do que um salão", "cada detalhe pensado para você", "excelência", "sua melhor versão" (só se for fala
real do cliente), trios de adjetivos ("sofisticado, moderno e acolhedor"), perguntas retóricas em série, travessões
em toda frase, emojis decorativos.

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- `copywriting`: estrutura (promessa clara, prova, chamada), cortar exagero e frases com cara de IA.
- `cro`: uma ação principal (WhatsApp) repetida nos pontos certos, prova perto da chamada.
- Ambas são em inglês e de SaaS: a voz é a do negócio em pt-BR, sem urgência falsa nem "últimas vagas".

## Entrega
`textos.md` do cliente com cada seção: título, apoio, chamada e a fonte de cada fato. O o usuário revisa antes da
construção.

## Busca no Google
Siga o `seo.md` do cliente (feito pela `lp-seo`, partes A–C): título de seção com a palavra-chave dela,
abertura que responde direto, palavras com naturalidade, perguntas frequentes reais.
