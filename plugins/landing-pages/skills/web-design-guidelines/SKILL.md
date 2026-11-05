---
disable-model-invocation: true
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the pinned rules in `guidelines.md` (same folder). Do not fetch them from the internet.
2. Read the specified files.
3. Check against all rules in `guidelines.md`.
4. Output findings in the terse `file:line` format.

## Exceções deste projeto (sites em pt-BR)
- Ignore "Title Case" e "Chicago style": em português, títulos e botões usam só a primeira maiúscula.
- Ignore "URL reflects state"/nuqs: landing page de uma página só.
- Textos: quem decide é `lp-textos`; aqui só se apontam problemas técnicos.

Regras copiadas em 14/10/2026 de vercel-labs/web-interface-guidelines (command.md).
