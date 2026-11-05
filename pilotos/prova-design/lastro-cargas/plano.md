# Direção vigente — cena 3D com caixas de ovos (30/10)

Esclarecimento direto: o usuário pediu reformular a representação, não eliminar a cena. Escolha: caixas
de ovos. Retomados percurso/câmera/agrupamento, agora com embalagem de polpa e doze ovos em modelo 3D,
novos enquadramentos/âncoras/luz e pôsteres. A fotografia rodoviária permanece na seção da estrada.
Textos apresentam fragilidade/proteção, sem prometer especialização exclusiva. Histórico anterior abaixo.

# Direção ativa — revisão do usuário em 30/10

O caixote foi rejeitado como peça principal desta apresentação. Abertura atual com caminhão real em
fotografia rodoviária, movimento leve por rolagem e continuidade com processo, rotas e serviços. Preservar
as outras cenas e a tipografia. A descrição anterior abaixo documenta o histórico, não a direção vigente.

# Lastro Cargas — plano (demonstração, empresa fictícia)

Transportadora rodoviária de carga fechada e fracionada, base em Ribeirão Preto/SP, rotas para SP, MG, GO e PR.
Tom sério e contido (LP-11). Estilo `imersivo-3d`. Dados de contato fictícios.

## Ideia
A carga do cliente é a protagonista. Não existe caminhão 3D realista com licença aberta e download sem conta
(Sketchfab exige login; os CC0 do OpenGameArt são amadores e o Poly Haven não tem veículos), e caminhão montado
em código já foi reprovado ("cartoon"). Então o objeto real é um **caixote de madeira de carga**
(`wooden_crate_01`, Poly Haven, CC0) num galpão iluminado pelo HDRI `empty_warehouse_01` (Poly Haven, CC0).
Frase-guia: "Sua carga, do galpão ao destino."

## Identidade
- Fontes: Funnel Display 500–700 (título) + Chivo 400–500 com números tabulares (texto, legendas técnicas).
- Cores (OKLCH): palco carvão `0.17 0.01 250`; papel de seção clara `0.94 0.008 80`; tinta `0.2 0.01 250`;
  cor da marca laranja-sinal `0.70 0.17 50` (luz de recorte no 3D e 1 detalhe por seção); madeira vem do modelo.
- Ritmo do estilo: 0,25/0,7/1,2 s; entra `power3.out`; sai `power3.in`; distância 16 px; escalonar 0,06; scrub 1,2.

## Roteiro de movimento (uma técnica por seção; famílias diferentes em vizinhas)
| # | Seção | Técnica (família) | Motivo ligado ao negócio | Costura para a próxima |
|---|---|---|---|---|
| 0 | Abertura + "A carga" | `modelo-3d-real` (3D/WebGL), presa ~2 telas | o caixote real em close (madeira, ferragem) recua até inteiro e gira; legendas técnicas com fio: "lacre numerado", "seguro de carga", "rastreio do início ao fim". Antes do 1º scroll a câmera já respira devagar (gancho) e o título entra por linha no carregamento | continua no mesmo canvas |
| 1 | "Do lado, de cima" | `camera-vira` (Espaço), mesma seção presa ~2 telas | a câmera sobe e gira 90°: do lado (palavra gigante "DESTINO" correndo atrás) para a vista de cima; marcadores de cidades passam pelos lados como se a carga andasse | `secao-cobre-cena`: a seção seguinte sobe por cima do canvas |
| 2 | Manifesto | `texto-revelado` (Texto) | "Coletamos. Conferimos. Lacramos. Entregamos." — o processo em quatro verbos, palavra por palavra | fundo claro → escuro por cortina curta |
| 3 | Rotas | `rota-veiculo` (Ilustração viva), presa | traçado Ribeirão Preto → Uberaba → Uberlândia → Goiânia (e ramal Curitiba); silhueta de carreta em SVG (perfil técnico, não desenho fofo) percorre a linha, paradas acendem, no fim aparece "frete de retorno". Celular: mesma cena na vertical (linha desce), pin mais curto | foto entra pela borda |
| 4 | Na estrada | `foto-abre` (Imagem) | foto real de carreta/estrada (Commons, licença aberta) abre de uma janela estreita até ocupar a tela | — |
| 5 | Serviços | `rolagem-lateral` (Espaço), presa | carga fechada, carga fracionada, frete de retorno, armazenagem: uma esteira como o pátio de carga. Celular: também lateral, pin mais curto | — |
| 6 | Garantias | hodômetro (Dados e prova) | dígitos que rolam como hodômetro ao entrar (restilizado, Chivo tabular); só fatos de serviço da demo ("4 estados", "rastreio 24 h"), marcados como demonstração | — |
| 7 | Contato + rodapé | botão magnético + WhatsApp que pulsa uma vez (Interação) | pedir cotação; rodapé completo (telefone, WhatsApp, e-mail, endereço, horário, créditos) | — |

Famílias: 3D/WebGL, Espaço, Texto, Ilustração viva, Imagem, Dados e prova, Interação (7). Cenas grandes:
0–1 (3D + câmera vira), 3 (rota), 5 (lateral). Vizinhas nunca repetem família.

## Celular e reduzido
- 3D: mesma trajetória, `dpr={[1, 1.5]}`, enquadramento pelo campo horizontal, pin menor (`telasCelular`).
- Reduzido: poster `public/modelos/caixote-poster.webp` (render do próprio modelo), sem Three/GLB/HDRI, sem pin;
  rotas e serviços em lista; tudo visível.

## O que é "a definir" (cliente real)
Números de frota, anos de mercado, clientes, avaliações: nenhum entra (fictício).

## Desvios na construção
| O que mudou | Por quê |
|---|---|
| Cenas 0 e 1 viraram **uma** seção presa de 5 telas (4 no celular), com a saída `secao-cobre-cena` no último quinto | um só canvas do close à vista de cima, sem recarregar o 3D; a cobertura entra em `1 − 1/telas` |
| A câmera gira ~163° num sentido só (close na fechadura → três quartos → **lado de trás**) em vez de voltar à frente | evita a ré na órbita; o lado de trás do caixote serve igual para a palavra gigante |
| Vista de cima: 9 caixotes (3×3), os 8 vizinhos chegam pelos lados como num sider sendo carregado; etiqueta "Seu volume" presa ao do meio | liga a vista de cima à carga fracionada (capítulo 3) |
| Sem chão visível: poça de luz radial (plano com alfa) sob a carga + sombra de contato | no palco escuro a sombra preta sumia e o caixote flutuava |
| Pista e cidades em DOM atrás/na frente do canvas (alfa); no celular a carga fica a 38% e as cidades passam pela direita e somem antes do texto | nítido, leve e sem colidir com o texto do capítulo |
| Texturas 2K no computador (870 KB) e 1K no celular (332 KB) | o close em 1K borrava a madeira |
| HDRI reduzido para 512×256 / 256×128 | 1,6 MB só para iluminar; sem diferença visível |
| Foto: rodovia SP-095 (Governo de SP, CC BY 2.0), logotipo da transportadora real apagado e placas desfocadas | regra de não parecer outra empresa |
| `foto-abre` com escala inversa na foto (a janela cresce sem deformar a imagem) e pin curto também no celular | a receita deforma a foto durante a abertura; DEV-34 pede celular equivalente |
| Papel `oklch(0.93 0.004 95)` em vez de `0.94 0.008 80` | lição do salão: #eeeae5 é lido como creme |
| 3D carrega no 1º gesto (roda, toque, tecla, rolagem) ou ~3 s após o load, em ocioso; até lá, pôster = primeiro quadro do próprio canvas | Lighthouse celular 49–50 → 93–94; troca pôster→3D sem salto |
| Shaders por `compileAsync` antes do 1º quadro; sombra de contato calculada 1 vez (ao vivo só na chegada dos vizinhos) | o boot era uma tarefa única de ~2,3 s (CPU 4×); agora 4 tarefas, a maior ≤ 190 ms |
| Motion só no WhatsApp flutuante e no botão magnético, em chunks tardios | tirou ~45 KB gzip do pacote inicial |
| Abertura, rota e docas preservam o percurso com palco sticky e altura reservada | a alternância de pin/fixed gerava deslocamentos de layout ao entrar e sair; probe com roda/toque e retorno após a correção registrou janela0/0,0009 (celular/computador) |
| Foto da estrada abre durante a passagem, sem nova parada | encadeia rota → estrada → docas com avanço espacial, preservando a janela/escala inversa |
| Foco das docas sincroniza o percurso, Lenis reage à preferência, menu móvel tem espaço próprio | teclado e reduzido precisam funcionar também durante o uso; não basta print inicial |

## Refino solicitado pelo usuário (29/10; fechamento 30/10)

O usuário escolheu refinar esta rodada Codex, mantendo a futura rodada Claude independente. Títulos e
manifesto8–12% menores; cena5→4,4 telas desktop/4→3,6 celular, com altura do invólucro derivada dos tokens;
rota2400→2100px/1500→1350px. Hodômetro mantém a ideia, com uma volta e rótulos aparecendo mais cedo.
Não mudou câmera/modelo/pôster, paleta, conteúdo ou técnicas. QA12/12 e complementos de teclado, reduzido,
retorno e algarismos visíveis aprovados; detalhes em `docs/refino-exemplos-codex.md`. Sem alegar fluidez física.
