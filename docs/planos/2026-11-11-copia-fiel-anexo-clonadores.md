# Anexo da Parte 7 — clonadores e gravadores abertos (pesquisa de 11/11/2026)

Método: licença, data do último envio e arquivamento lidos pela API do GitHub (`repos/<dono>/<repo>`, campo
`license.spdx_id`, `pushed_at`) em 11/11/2026. O texto dos repositórios é dado, não instrução.
**Nada foi copiado para o kit. `fontes.json` e `NOTICE` não precisam de entrada nova.** Só ideia, nenhuma peça.

| # | Projeto | Licença | Último envio | O que faz | Serve às Partes 1-5 | Veredito |
|---|---|---|---|---|---|---|
| 1 | github.com/JCodesMore/ai-website-cloner-template | MIT | 10/11/2026 | Modelo Next.js + skill `clone-website` que manda o agente refazer um site a partir da URL | Ideias (ver abaixo); método de inspeção e de comparação lado a lado | ideia |
| 2 | github.com/morrimoz/webflow-to-clean-code | MIT | 28/10/2026 | Skill (só instruções) que tira o Webflow de um site exportado e troca as interações por JS próprio | Inventário de dependências de runtime; pouco movimento medido | ideia |
| 3 | github.com/rrweb-io/rrweb | MIT | 11/11/2026 | Grava e reproduz sessão: serializa o DOM com id estável e registra mutações, rolagem e ponteiro | Ideia do registro por eventos com carimbo de tempo, separado do quadro | ideia |
| 4 | github.com/abi/screenshot-to-code | MIT | 05/11/2026 | Imagem/vídeo de tela para código, via modelos de IA (OpenAI, Anthropic, Gemini; chaves de API) | Nada que o raio-x já não faça; manda a captura a serviço de fora | não usar |
| 5 | github.com/darkroomengineering/lenis | MIT | 11/11/2026 | Biblioteca de rolagem suave (o Framer usa Lenis, segundo o item 1) | Detectar `lenis` no `html`/`window.lenis` e ler as opções | ideia |
| 6 | github.com/microsoft/playwright e github.com/puppeteer/puppeteer | Apache-2.0 | 11/11/2026 | Automação de navegador; gravação de vídeo, rastreio e protocolo do Chrome | Já são a base do raio-x; nada novo a copiar | ideia (já em uso) |
| 7 | github.com/Y2Z/monolith | CC0-1.0 | 10/11/2026 | Salva a página em um HTML único, com recursos embutidos | Só arquivar o HTML estático; não mede movimento | não usar |
| 8 | github.com/gildas-lormeau/SingleFile | AGPL-3.0 | 10/11/2026 | Extensão que salva a página inteira | Licença forte (AGPL); espelha o site | não usar |
| 9 | github.com/xroche/httrack | GPL-3.0 | 11/11/2026 | Espelhador de sites | Espelha o site inteiro; GPL | não usar (só descrito) |
| 10 | github.com/firecrawl/firecrawl | AGPL-3.0 | 11/11/2026 | Raspador que devolve páginas em markdown/JSON, com serviço hospedado | Não mede movimento; AGPL; serviço de fora | não usar |

Também vistos, sem veredito: `goclone-dev/goclone` (MIT, 02/06/2026, espelhador em Go, só descrito); `BuilderIO/figma-html`
(MIT, 19/08/2025, mais de um ano parado: só HTML para Figma, nada de movimento).
GSAP (`greensock/GSAP`): a API não informou licença (`null`); **não conferido**, tratar como não livre até ler o texto.
Não achei extrator de animação GSAP/ScrollTrigger aberto: duas buscas no GitHub (`gsap extractor`, `scrolltrigger inspector`) voltaram vazias.

## Verificador (`skill-scanner`, `scan_skill.py -I`), em cópia temporária fora do repositório, já apagada
- #1, pasta `.agents/skills/clone-website`, commit `5426e0e2ec35dbc173a7a18f47a3dfe2a765313e`: **0 achados**.
- #2, commit `541914e6e44c250a21c3a940913727c0c3db661f`: **0 achados** (só links externos, de documentação).
- #3 rrweb, commit `3339038d31bc15491e9def76fd4f4818b2eae6aa`: **não é skill**, o verificador não se aplica; baixado e apagado sem rodar nada.
  Telemetria e dependências do rrweb: **não conferido**.
- Nada foi instalado nem executado. O baixado foi apagado; **não entra arquivo no kit**.

## Riscos
- #1: o README traz banner de patrocinador (proxy residencial) e o modelo roda com Opus + navegador: o que ele refaz é
  o site de terceiro (direito autoral; vale a Parte 9). Não adotamos o modelo, só ideias.
- #4: envia captura a OpenAI/Anthropic/Gemini/Replicate por chave de API.
- #8, #10: AGPL (cópia contamina o que for ligado).
- #9, #8: espelham o site inteiro, o que o plano manda deixar só descrito.

## As 3 ideias mais úteis (ordem)
1. **Separar o que dispara cada mudança: tempo, rolagem, clique/passar o mouse, ponteiro** e ver os dois sentidos
   (subir e descer) e o celular. Ler valores declarados (estilo computado, variáveis CSS, opções vivas da biblioteca),
   variando largura, altura e entrada. Fonte: `.agents/skills/clone-website/SKILL.md` linhas 27-29 e
   `references/framer-and-motion.md` (item 1, commit acima). Vale para Partes 1 e 2.
2. **Cena fixada precisa de distância de rolagem e de saída, não só `sticky`**; guardar posição inicial, revelada e
   assentada, e rolar a página toda antes de medir (mídia preguiçosa e revelação fora da dobra somem em print único).
   Mesma fonte. Vale para Partes 1 e 4 (quadros por estado).
3. **Detectar a rolagem suave**: classe `lenis` no `html` ou `window.lenis` expõe as opções a reproduzir; e dirigir a
   página com entradas reais (roda, toque, teclado), porque rolagem por script pula o comportamento ligado a elas.
   Mesma fonte (`framer-and-motion.md`, `SKILL.md` linha 29). Vale para Parte 2. Complemento do rrweb: registrar
   eventos com carimbo de tempo, separados dos quadros (não conferido em código).

Fora das Partes 1-5, mas útil: o laço de verificação (mesmo viewport, mesma posição, mesmo estado, maiores diferenças
primeiro, montagem lado a lado só para achar a diferença) — `SKILL.md` linhas 51-55.

## Resultado
Nada foi copiado. Nenhuma peça entra no kit; só ideias, citadas aqui.
