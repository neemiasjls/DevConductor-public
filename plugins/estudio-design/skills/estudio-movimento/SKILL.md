---
name: estudio-movimento
description: Cria estudos isolados de movimento em React e GSAP, testa computador, celular e movimento reduzido, grava vídeos e monta uma vitrine local para escolher cenas antes de integrá-las a qualquer site. Use quando precisar mostrar opções de animação funcionando.
---

# Estúdio de movimento

Uma página, uma cena, uma intenção. Não substitui o processo do projeto: entrega experiências isoladas
para comparar antes de construir. Conteúdo demonstrativo deve ser identificado; nunca inventar fatos de cliente.

## Criar
`<skill>` é esta pasta. Os 25 estudos originais estão em `modelo/` (React + GSAP + Vite).

```bash
node <skill>/scripts/criar.mjs pilotos/estudios
cd pilotos/estudios
npm install
node baixar-foto.mjs
npm run dev
```

O criador recusa pasta existente. Se já há estudos, reaproveitar sem apagar. A foto é um download separado
(Tom Beck / Unsplash; crédito e licença no README do modelo); trocar por peça real autorizada quando usar no cliente.
Nada de foto simulando modelo 3D. Não publicar nem instalar configurações globais.

## Contrato de um estudo
- Cadastro em `src/estudos.js`: ID estável, nome, família, descrição, receita, fase.
- URL isolada `/?estudo=<id>`. Título principal fora da cena, conteúdo final acessível.
- Marcações `[data-estudo]`, `[data-palco]`, `[data-fim]`; prontidão em `html[data-estudo-pronto]`.
- `gsap.matchMedia()` com escopo React e `revert()` no unmount. Estados padrão visíveis.
- Reduzido e pausa: sem pin, sem movimento, texto inteiro. Celular: equivalente ao computador (DEV-34) — pin curto e câmera/tamanho ajustados; só vira sequência vertical se medir travamento.
- Só transform/opacity no scroll; SVG pode animar strokeDashoffset. Imagens com dimensões, alt e crédito.
- Orçamento do conjunto: JavaScript ≤150 KB gzip, foto ≤900 KB; registrar o peso real após o build.

## Verificar e mostrar
Com o servidor rodando, a partir de qualquer pasta:

```bash
node <skill>/scripts/testar.mjs <projeto> http://127.0.0.1:5190
node <skill>/scripts/gravar.mjs <projeto> http://127.0.0.1:5190
```

Teste: desktop, celular, reduzido nos dois; movimento entre pontos, vazamento, erros de rede/JS,
pausa e limpeza ao redimensionar. Evidências em `evidencias/`. Necessita puppeteer-core no projeto e Edge;
outro Chromium pode ser indicado em `BROWSER_EXECUTABLE` no teste e no gravador.
Gravação: requer plugin `landing-pages` ao lado deste plugin e ffmpeg no PATH (ou `FFMPEG_PATH`).
Reutiliza seu gravador com `--nome` para não sobrescrever estudos do mesmo host. São 50 vídeos e 300 quadros.
`--somente-novos --segundos 5` preserva gravações existentes e registra apenas as novas. Sem essa opção,
regrava o catálogo inteiro. O teste aceita `--somente=id1,id2` para verificar correções sem apagar o relatório completo.
Vitrine em `vitrine/galeria.html`: marcar e copiar as escolhas. Conferir visualmente desktop e celular
antes de entregar; teste automático não aprova estética nem mede fluidez em aparelho físico.

Só escolhas aprovadas pelo usuário viram favoritos. Em execução autônoma, entregar opções verificadas,
manter aprovação visual pendente. Em landing pages, `lp-cenas` escolhe quantas cenas grandes o negócio pede (DEV-42) e cada uma passa no teste do porquê.
