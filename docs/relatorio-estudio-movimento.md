# Estúdio de movimento — entrega de 16/10/2026

Implementada a base D1 e iniciada a D2: plugin reutilizável `estudio-design` com seis estudos originais,
modelo React + GSAP, criação sem sobrescrita, teste e vitrine de vídeos. O maestro de landing pages usa
o estúdio na etapa de conceito de movimento; a detecção o oferece para landing pages e para `.estudio-design`.

## Entregas

| Fase | Estudos |
|---|---|
| D1 | letras que se montam; fotografia que se abre; narrativa lateral presa no computador |
| D2 inicial | linha SVG desenhada; cortina de duas superfícies; aproximação de palavra |

Vitrine local: `pilotos/estudios/vitrine/galeria.html`, com 12 vídeos (desktop/celular) e 72 quadros.
Experimentos: `http://127.0.0.1:5190/?estudo=letras`, enquanto o preview estiver ligado.
São exemplos demonstrativos. Não há favoritos escolhidos automaticamente.

## Evidências

- **40/40 testes de scripts**: os 37 existentes e três novos para validação de argumentos do gravador,
  preservação de pasta existente e detecção/respeito a plugin desativado.
- **24/24 combinações de navegador**: seis estudos × desktop, celular de 390px, reduzido desktop,
  reduzido celular. Chrome headless; o Edge desta execução encerrou ao iniciar.
- Verificados movimento entre pontos, ausência de vazamento horizontal, pausa, limpeza de pin ao
  redimensionar, acesso ao conteúdo final e ausência de erros JavaScript/HTTP.
- **12/12 vídeos** com duração e controles válidos; seleção persiste e foi limpa após o teste.
  A vitrine respeita movimento reduzido. Nova gravação curta confirmou a finalização do WebM.
- Catálogo e quatro plugins alterados aprovados pela validação oficial; auditoria local com
  **10 plugins e zero pendências de versões ou links relativos**.
- Produção: JavaScript **115,53 KB gzip**, CSS **1,57 KB gzip**, foto real **408.926 bytes**.
  Os 12 vídeos somam aproximadamente 28,7 MB e são material de revisão, não assets do site final.
- Capturas e resultados JSON: `pilotos/estudios/evidencias/`; build em `pilotos/estudios/dist/`.

## Revisão visual

Revisão realizada na própria execução, sem delegação, conforme o pedido de trabalhar sozinho.
O formato isolado foi determinado pelo roteiro D1. Capturas de computador/celular foram inspecionadas
em duas passagens; o detector indicou uma cor de foco não documentada, incorporada ao DESIGN.md.

| Critério | Veredito |
|---|---|
| Cena isolada e leitura antes/depois | Atendido |
| Tipografia, geometria e fotografia reais ao propósito do estudo | Atendido |
| Layout de computador/celular sem vazamento | Atendido nos tamanhos testados |
| Reduzido e pausa com conteúdo completo | Atendido |
| Modelo, licenças, receitas e documentação visual | Atendido |
| Aprovação estética pelo usuário | Pendente |
| Fluidez em celular físico e auditoria completa com leitor de tela | Não testado |

**Veredito: entregue como conjunto de estudos demonstrativos verificados.** D1 ainda depende da
escolha visual do usuário; D2 está iniciada, com 16 receitas no total, e não chegou às 25–30 previstas.

## Correções da revisão geral

- Links de tokens, exemplos e documentação do hallmark apontavam para arquivos que não acompanhavam
  a cópia; agora levam à origem. Duas skills de segurança fora da seleção apontam à origem fixada.
  Três links da cópia local da consultora React apontam à pasta `rules/` correta.
- Gravador recebeu `--nome` para não sobrescrever estudos do mesmo host, validação de argumentos e
  opções `BROWSER_EXECUTABLE`/`FFMPEG_PATH`.
- WebM de screencast saía sem metadados de duração; finalização com ffmpeg `-c copy` produz arquivo
  com duração e busca, sem recodificação. A vitrine recebeu controles e respeito a movimento reduzido.
- Versões: `estudio-design` 0.1.0; `landing-pages` 0.1.8; `devagents-core` 0.1.8; `seguranca` 0.1.1.

Nenhum commit, push ou publicação nesta execução. A pasta do Salão (cliente) não foi aberta nem alterada.
Alterações concorrentes de outros trabalhos foram preservadas.

## Próximo passo

Escolher os estudos preferidos na vitrine e continuar a D2 com outras famílias (máscaras, mapas, menus,
profundidade e dados). Manter as regras atuais de 1–2 cenas-assinatura e proibições de efeitos prontos;
alterá-las e escolher o nicho D7 continuam decisões do usuário. Nenhuma peça paga foi contratada.
