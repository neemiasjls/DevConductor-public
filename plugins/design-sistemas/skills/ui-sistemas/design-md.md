# Modelo de DESIGN.md (projeto novo)

Formato do Google (`version: alpha`): valores exatos no cabeçalho YAML; no texto, só regra que muda uma decisão.
- Nome de token: letras, números e hífen (`primary-foreground`, nunca `primary.foreground`).
- Tipografia: cada escala com `fontFamily`, `fontSize`, `lineHeight`, `fontWeight` (e `letterSpacing` se preciso).
- Referência entre tokens: `"{colors.primary}"`, sempre entre aspas; cor em hexadecimal também entre aspas.
- Seções na ordem: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts.
  Só entra seção com decisão.
- Tema escuro: confira `npx -y -p @google/design.md designmd spec`. Se não houver suporte, os valores do tema claro ficam nos
  tokens e os do escuro numa tabela `## Themes` depois de Colors.

Decida nesta ordem, com o cliente ou com a marca dele:
1. **Neutros:** uma escala com leve matiz (stone, zinc ou slate do Tailwind), não cinza puro.
2. **Destaque:** uma cor só, da marca, com contraste de 4,5:1 sobre o fundo quando for texto.
3. **Situação:** sucesso, atenção e erro em tons fechados; usados em texto e selo pequeno, nunca em área grande.
4. **Fonte:** uma família de interface com algarismos tabulares (Inter, Geist, IBM Plex Sans, Source Sans 3). A
   marca aparece no logo e na cor, não na fonte do corpo.
5. **Raio:** um valor base de 6 a 8 px; pílula só em selo.
6. **Densidade:** altura de controle e de linha de tabela (36/40 px no escritório; 44 px de alvo no celular).

## Exemplo

```markdown
---
version: alpha
name: Sistema de uma transportadora
description: Sistema interno de uso diário no escritório, às vezes no celular.
colors:
  background: "#fafaf9"
  surface: "#ffffff"
  foreground: "#1c1917"
  muted: "#57534e"
  border: "#e7e5e4"
  primary: "#1d4ed8"
  primary-foreground: "#ffffff"
  success: "#15803d"
  warning: "#b45309"
  danger: "#b91c1c"
typography:
  title:
    fontFamily: Inter
    fontSize: 20px
    lineHeight: 28px
    fontWeight: 600
  body:
    fontFamily: Inter
    fontSize: 14px
    lineHeight: 20px
    fontWeight: 400
  label:
    fontFamily: Inter
    fontSize: 13px
    lineHeight: 16px
    fontWeight: 500
rounded:
  base: 6px
  pill: 9999px
spacing:
  unit: 4px
  control: 36px
  row: 40px
  row-compact: 32px
  touch: 44px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
  table-header:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    height: "{spacing.row}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.base}"
    height: "{spacing.control}"
  badge-success:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
  badge-warning:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.warning}"
    rounded: "{rounded.pill}"
  badge-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
---

## Overview
Ferramenta de trabalho: tudo legível de relance, nada chama atenção sem motivo.

## Colors
- `primary` só na ação principal da tela, na seleção e no foco; uma vez por tela.
- `success`, `warning` e `danger` só em texto e selo pequeno, sempre com a palavra; o estado normal fica em `muted`.

## Typography
- Algarismos tabulares em toda tabela, valor e data.

## Layout
- Escala de `spacing.unit`; tabelas com linha `row`; acima de 50 linhas, `row-compact`.
- Formulário com mais de 6 campos abre em página própria ou painel lateral, nunca em janela modal.

## Do's and Don'ts
- Não usar degradê, sombra grande nem animação de entrada em tela de trabalho.
```
