# Estudos de movimento

Exemplos demonstrativos próprios, sem dados de clientes. Cada endereço `/?estudo=<id>` isola uma cena.

1. `npm install`
2. `node baixar-foto.mjs` (foto real gratuita; exige rede). Pode substituir por foto sua em `public/assets/mar.jpg` e ajustar crédito/alt.
3. `npm run dev` → http://127.0.0.1:5190
4. `npm run build` e `npm run preview` para conferir a versão de produção.

25 estudos no seletor: os seis iniciais e 19 famílias adicionais cadastradas em `src/familias.js`.
Lista completa em `src/estudos.js`; gráficos e mapas são demonstrações, sem dados de clientes.
Testar e gravar usando os scripts da skill `estudio-movimento` com a pasta deste projeto como argumento.

Marcações: `[data-estudo]`, `[data-palco]`, `[data-fim]` e `html[data-estudo-pronto]`.
Os estados estáticos são visíveis; a seção lateral vira uma sequência vertical no celular,
com movimento reduzido e ao pausar. O título principal fica fora da cena.

Foto: [Tom Beck / Unsplash](https://unsplash.com/photos/aerial-view-of-ocean-waves--NquqeJwHxc),
[Unsplash License](https://unsplash.com/license); a foto é baixada separadamente e não acompanha o modelo.
Fonte Saira Variable: Fontsource, SIL OFL 1.1 (`public/assets/OFL-Saira.txt`). Código próprio: MIT.
O GSAP tem licença própria; conferir as condições da dependência antes de redistribuir o pacote instalado.
