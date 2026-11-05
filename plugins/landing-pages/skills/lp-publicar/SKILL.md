---
name: lp-publicar
description: Publica a demonstração de uma landing page no Cloudflare Pages com link grátis, prepara a prévia do WhatsApp e a mensagem de venda para o dono do negócio. Use só quando o usuário pedir para subir ou publicar.
---

# Publicar a demonstração

Só quando o usuário pedir ("sobe", "publica"). Para o fluxo geral de subir projetos existe a skill `subir`.

## Antes
- `lp-revisao` feita; `npm run build` sem erros; `dist/` com menos de 25 salão piloto por arquivo.
- `noindex` no `index.html`; imagem `og.jpg` 1200×630 em `public/`.

## Publicar (Cloudflare Pages, sem domínio próprio)
- `npx wrangler pages deploy dist --project-name <slug-do-cliente>` (o login do Wrangler é feito pelo usuário).
- Link: `https://<slug>.pages.dev`. Testar no celular: carregamento, vídeo, botões de WhatsApp, mapa.
- Testar a prévia colando o link numa conversa do WhatsApp.

## Consultoras desta etapa (ler o SKILL.md delas só na hora; quem decide é esta skill)
- `wrangler`: comandos do Cloudflare Pages.
- `lp-seo` (parte F): Search Console, perfil do Google, nome/endereço/telefone iguais em tudo e JSON-LD do tipo certo
  (ou o tipo do nicho). Na demo o site fica `noindex`; o SEO vale quando o cliente comprar.

## Venda
- Mensagem em `clientes/<slug>/entrega/mensagem-whatsapp.md`: quem é o usuário, o que foi feito com o material
  do próprio negócio, o ganho concreto (ex.: perfil do Google sem site), link, sem pressão. O o usuário envia.
- Prints de computador e celular em `entrega/` para anexar.

## Se o cliente comprar (memória LP-04)
Domínio no CPF/CNPJ do cliente (registro.br); tirar o `noindex`; ligar o domínio no Cloudflare; pedir
autorização para as fotos de clientes e confirmar nomes da equipe; Cloudflare Web Analytics para mostrar
resultados.
