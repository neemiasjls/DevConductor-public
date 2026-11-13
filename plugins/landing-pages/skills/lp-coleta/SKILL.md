---
name: lp-coleta
description: Corre atrás sozinho do material real de um cliente a partir do nome, site ou Instagram - site atual, Instagram sem login (só mídia), Google Maps, CNPJ e web - monta um resumo de fatos com fonte e faz ao usuário no máximo 5 perguntas, só do que só ele sabe. Use ao começar um cliente novo ou quando faltar material.
---

# Coleta do material do cliente

Pasta do cliente: `clientes/<slug>/` (fora do git). Originais em `fotos/originais/`, listas de links em
`fotos/originais/listas/`, seleção em `fotos/selecao.md`, fatos em `fatos.md`, plano em `plano.md`.

**Princípio:** o peso não fica no usuário. Tudo que é público, a coleta busca sozinha; ao usuário só vai o que
só ele sabe, numa lista curta, uma vez. Entrada mínima: **nome do negócio + cidade**, ou o site, ou o @.

## Regras do usuário
- LP-05: Instagram **pelo navegador e sem login**, só as melhores fotos e vídeos. Nunca seguir, curtir, mandar
  mensagem, abrir destaques ou outros perfis. Se o Instagram pedir login, parar ali e anotar o que faltou.
- LP-04: fotos e avaliações de terceiros só na demonstração até o dono aprovar.
- Só fato com fonte vai para o site (regras do `lp-maestro`); o resto fica "a definir".
- Dados de pessoas (CPF, sócios pessoa física, endereço residencial) nunca vão para o site nem para o `fatos.md`.
- Pessoas nas fotos: não baixar nem selecionar foto de cliente identificável, nunca de criança ou adolescente;
  preferir produto, ambiente, detalhe, equipe em pose profissional. Baixou sem ver: apagar.
- Cliente de odontologia: ler `referencias/publicidade-odontologia.md` antes de coletar fotos e de escrever.
- Uma restrição específica do cliente prevalece sobre a coleta padrão: se avaliações ou números foram
  proibidos, não coletar para incluir nem preencher com conteúdo fictício.

## 0. Ponto de partida (antes de buscar)
Consultora `cro`: liste o que a página precisa provar para este tipo de negócio (nota no Google, fotos de
resultado, endereço, horários, área atendida, tempo de casa, preço ou não). Cada item vira uma linha do
`fatos.md` com "fonte: —" até ser achado. É a lista que guia a busca.
**Fotos já no começo:** foto boa da empresa quase nunca vem por leitura automática (sem login, Instagram e
Maps bloqueiam). O caminho é (a) pasta de fotos que o dono ou o usuário entrega ou (b) o usuário salvar 20–30
fotos pelo próprio Instagram. Peça logo, com esta lista:
- 3–5 fotos largas do ambiente, para a abertura; 10–15 do trabalho entregue; 5 de detalhe; 2–3 do espaço/equipe.
- Evitar texto por cima, montagem, selo de promoção e pessoa identificável.

## 1. Busca geral na web (descobrir os canais)
Pesquisar `"<nome>" <cidade>`, `"<nome>" instagram`, `"<nome>" cnpj`. Anotar: site oficial, @ do Instagram,
página do Google Maps, outros perfis (Facebook, LinkedIn, iFood, Booking...), matérias de jornal local,
podcasts, prêmios, marcas parceiras. Cada achado com fonte (URL) e data.

## 2. Site atual (se houver)
Ler as páginas principais: serviços, sobre, contato, rodapé. Anotar textos que são a voz do negócio (frases
próprias, nomes de serviços), telefone/WhatsApp, endereço, horários, CNPJ do rodapé. Baixar o logo
(SVG/PNG maior que achar) e fotos próprias boas. Anotar o que o site atual faz mal (para não repetir).

## 3. Google Maps (público, sem login)
Nome, categoria, endereço, telefone/WhatsApp, horário, nota e total de avaliações, site cadastrado, fotos do
dono (não as de visitantes). Avaliações: aba "Avaliações"; sem login aparecem poucas: copiar 3–5 completas,
com primeiro nome e sem editar o sentido (cortes com […]).
Sem login a página pública do local traz os dados do perfil e só 3–8 fotos embutidas (o original baixa trocando
o sufixo de tamanho por `=s0`). A galeria completa responde 403: encerrou a fonte, não insistir.

## 4. Instagram (sem login, LP-05)
- Abrir só o perfil do negócio, sem navegar para outros perfis (LP-05). Sem login, o Instagram mostra a bio,
  números do perfil e as primeiras postagens da grade; pode bloquear depois de algumas páginas.
- Coletar `alt` (descrição + legenda) e `currentSrc` das imagens da grade visíveis via `javascript_tool`;
  abrir só os posts que valem (melhores fotos, antes/depois) e, no carrossel, clicar em "Avançar" coletando
  `article ul img`. Nomes dos destaques aparecem na página do perfil: ler sem abrir.
- Vídeo de reel: só se o arquivo vier na página sem login (ex.: `og:video`); se não vier, não insistir.
- Sem login a consulta de perfil responde 429 e, no navegador, cai na tela de login. Login, 401, 403 ou 429
  encerram a fonte: anotar "Instagram: faltou X" no `fatos.md` e pedir as fotos pela lista do passo 0 (dono ou
  usuário salvando pelo próprio Instagram). Nunca usar a conta do usuário para baixar automaticamente.
  Facebook também exige login: mesma regra.
- Lista grande de links: o Instagram bloqueia `fetch` para localhost, mas navegar para o receptor local funciona:
  rode `python -I <plugin>/skills/lp-coleta/scripts/receptor.py <pasta-listas>` em segundo plano e, na página,
  `location.href = 'http://127.0.0.1:8765/?f=<nome>&d=' + encodeURIComponent(lista)`.
- Baixar com `curl` a partir da lista: use `tr -d '\r'` e `while read -r n u || [ -n "$n" ]` (armadilha:
  quebra de linha do Windows e última linha sem quebra).

## 5. CNPJ (dado público da Receita)
- Achar o número: rodapé do site, Google Maps, nota fiscal publicada, ou busca `"<nome>" <cidade> cnpj`.
- Consultar: `curl -s https://brasilapi.com.br/api/cnpj/v1/<14 dígitos>` (BrasilAPI, projeto público e
  conhecido; sem chave). Alternativa: `https://minhareceita.org/<cnpj>`.
- Aproveitar: razão social e nome fantasia, **data de abertura** (vira "desde AAAA" se o dono confirmar que é a
  mesma empresa), situação (ativa?), atividade principal (CNAE, ajuda nas palavras-chave da `lp-seo`), endereço
  comercial. Mais de um CNPJ ou nome diferente do fantasia: anotar e confirmar com o dono.
- Não usar: quadro de sócios, capital social, telefone/e-mail pessoais que aparecerem.

## 6. Vídeos
- `ffmpeg -i video.mp4 -vf "fps=1/2.5,scale=180:-1" q/%03d.jpg` + prancha com tempos para analisar.
- Quadros-chave em tamanho cheio com `ffmpeg -ss <t> -frames:v 1 -q:v 2`.
- Evitar trechos com legenda gravada na imagem.

## 7. Resumo de fatos (`fatos.md`)
Uma tabela, um fato por linha:

| Fato | Valor | Fonte (URL ou "dono") | Data | Estado |
|---|---|---|---|---|
| Endereço | Rua X, 123 — Centro, Cidade/UF | Google Maps | 16/10/2026 | público |
| Desde | 2014 | CNPJ (abertura 03/2014) | 16/10/2026 | a confirmar |
| Nota no Google | 4,9 (212 avaliações) | Google Maps | 16/10/2026 | público |

Estados: **público** (fonte aberta, pode ir para a demo), **a confirmar** (achado, mas pode estar velho ou
ambíguo), **a definir** (não achado). Abaixo da tabela: material baixado (pasta e quantidade), a voz do
negócio (3–5 frases próprias), o que só o dono pode responder (entra no item 8).

## 8. Perguntas ao usuário: no máximo 5, uma vez só
Montar a lista **depois** da busca, só com o que ficou "a confirmar" ou "a definir" e que muda o site.
Nunca perguntar o que é público (endereço, horário, telefone do Maps) nem gosto visual (isso se resolve
mostrando os 3 conceitos). Escolher as 5 de maior peso, nesta ordem de prioridade:
1. **O que mais quer vender e para quem** (serviço principal, cliente ideal) — se não ficou claro na busca.
2. **Números e fatos que pode citar** (anos, atendimentos, frota, área) — mostrando o que já achou para ele só
   confirmar ("Achei abertura em 2014: posso dizer 'desde 2014'?").
3. **Clientes, marcas ou parceiros que pode citar** (autorização).
4. **Contato definitivo**: WhatsApp e e-mail que vão no site, se diferentes do público.
5. **Fotos/vídeos próprios** que não estão públicos (ou permissão para usar as do Instagram fora da demo).
Formato: uma mensagem, perguntas numeradas, cada uma com o que já foi achado e uma resposta padrão
("se não responder, fica 'a definir'"). Não esperar parado: seguir com os conceitos enquanto ele não responde.
Se o usuário pediu para não perguntar, registrar essa lista como pendências locais e seguir com o material
autorizado. Resposta ausente não confirma dado, direito de uso ou aprovação. Um fato público pode compor
a demo dentro das regras do cliente; números, clientes citados e anos exigem confirmação antes do site final.

## 9. Curadoria
Folha de miniaturas: na pasta das miniaturas, `python -I <plugin>/skills/lp-assets/scripts/folha-contato.py
<rotulo> [colunas]` junta os arquivos `<rotulo>-NN.jpg` (NN com 2 dígitos) em `<rotulo>-folha.jpg`. A miniatura
é pequena para julgar: abrir as candidatas em tamanho cheio antes de dar nota. Nota por foto (0–10), registrada
em `fotos/selecao.md`, escolhendo por seção; dizer se existe foto de abertura nota ≥ 9. Sem ela, avisar o
usuário ANTES de desenhar. `selecao-fotos.jpg` para ver junto com os conceitos. Fotos de render 3D só como
referência; fotos de colaboração (outro autor) evitar.
