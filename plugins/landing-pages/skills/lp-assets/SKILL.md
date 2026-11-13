---
name: lp-assets
description: Prepara as peças visuais das cenas-assinatura escolhidas (ilustração SVG, camadas recortadas, modelo 3D livre, quadros tirados de vídeo), com licença anotada e peso dentro do orçamento. Use depois do conceito de movimento aprovado e antes da construção.
---

# Assets das cenas

A cena só fica bonita com peças boas, e elas são o gargalo. Esta etapa entrega, para cada cena escolhida
em `lp-cenas`, os arquivos prontos em `clientes/<slug>/assets/` e a lista `clientes/<slug>/assets.md`.

## Ordem de preferência das imagens
1. **Foto do cliente**, quando passa no critério abaixo.
2. **Banco curado** com uso comercial: Pexels e Unsplash (API oficial com chave) ou CC0 pelo Openverse (StockSnap, sem chave).
3. **Imagem gerada**, se a ferramenta liberar uso comercial e o resultado passar no mesmo critério. Baixa qualidade não passa.
4. **3D real ou ilustração própria:** objeto real com um gesto simples. A cadeira 3D do Prumo (Poly Haven, CC0) foi a imagem mais elogiada.

**Sem foto boa, troque a solução visual, não baixe a régua.** Foto fraca não entra por falta de opção: vira 3D, ilustração,
tipografia ou uma foto a menos. Wikimedia Commons fica só como último recurso de foto, para algo documental que os bancos não têm.

## Critério de qualidade da foto
Abrir o original e o recorte final, a 100%. A busca devolve licença, nunca qualidade. Foto que falhar em um item sai.
| Item | Passa quando |
|---|---|
| **Resolução** | Lado maior da versão publicada: abertura 1600 px, cena 1280, apoio 800, miniatura 480. Sem ampliar arquivo pequeno |
| **Luz** | O assunto tem luz com direção; sombra sem sujeira, reflexo sem estourar, fundo não rouba a atenção |
| **Foco** | O assunto está nítido a 100% no recorte usado; ruído e desfoque só onde são intenção |
| **Expressão** | Rosto, pose e roupa combinam com a marca e com a frase ao lado. Expressão ou decote que desviam do serviço reprovam |
| **Série** | As fotos parecem do mesmo ensaio: mesma família de luz e um tratamento só. Mesmo fotógrafo ajuda, mas não basta |

Procurar a série antes das fotos soltas: buscar pelo autor de uma foto boa costuma render o ensaio inteiro. Evitar
trocar fundo por chave de cor quando a borda denuncia a montagem. Se a pessoa aparece nítida, a foto não pode
sugerir que ela é cliente ou recomenda o negócio: nota "foto ilustrativa" ao lado.

## Textura, fundo e recorte para o celular
- **Textura é fotografada e entra em tamanho real:** madeira, pedra, papel, tecido vêm de foto em alta (ou de CSS
  simples), nunca desenhados por código. Não ampliar, não espelhar para emendar, não esticar: se o arquivo é
  menor que a área, trocar por um maior ou diminuir a área (o `acabamento.mjs` da `lp-revisao` reprova ampliação
  acima de 1,5×). Fontes CC0, sem conta: Poly Haven (polyhaven.com/textures) e ambientCG (ambientcg.com); anotar
  em `assets.md` como qualquer peça.
- **Recorte em pé para o celular:** foto de abertura e de cena ganha um segundo recorte vertical, escolhido
  olhando (o assunto inteiro na tela em pé), em vez do recorte deitado encolhido. Os dois entram no `assets.json`.

## Conferência visual do conteúdo (antes de associar a peça à cena)
- Abrir o arquivo real e o recorte final: título, nome do arquivo, categoria da busca e texto alternativo
  não comprovam o que aparece. Conferir se a imagem demonstra o serviço/penteado/produto nomeado.
- Exemplo observado: uma foto nomeada “curly hair” mostrava cabelo preso, e outra de ondas leves aparecia
  como “Cachos”. Rejeitar a associação ou escolher outra foto; não mudar o alt para encobrir a divergência.
- Se palavra e foto mudam numa abertura, planejar pares explícitos e testar cada estado completo do ciclo,
  incluindo pausa e movimento reduzido. A foto inicial deve corresponder ao título inicial.
- A peça principal precisa representar a operação do negócio: realismo e licença não bastam. A rejeição
  do caixote na demonstração rodoviária é uma decisão daquele exemplo, não uma proibição geral de 3D.
- Registrar foto/recorte, serviço associado e motivo em `assets.md`. Continuar conferindo fonte, licença,
  autorização aplicável e créditos; correspondência visual não substitui essas verificações.

## O que cada receita pede
| Receita | Peça | Caminho padrão |
|---|---|---|
| rota-veiculo, sai-de-cena, linha-do-tempo | ilustração vetorial (veículo, marcador, objeto) | SVG em código |
| camadas-profundidade | 3–4 camadas com fundo transparente | SVG em código, ou foto do cliente recortada |
| orbita-3d | modelo 3D | modelo livre (CC0) otimizado |
| camera-vira | modelo 3D do veículo + ambiente | `.glb` real (CC0/CC-BY) + HDRI e texturas CC0 |
| sequencia-quadros | 60–120 quadros | vídeo do cliente → quadros |
| fundo-shader | nenhuma (só as cores da paleta) | — |
| texto-revelado | nenhuma | — |

## Caminhos
1. **SVG em código** (padrão das cenas leves): componente React com formas simples, no estilo da direção de
   arte (traço, cantos, 2–4 cores da paleta). Gradientes
   com `useId()` para não colidir. Leve, nítido em qualquer tela, anima por partes (roda, porta, carga).
2. **Foto do cliente recortada** (camadas): recorte de fundo feito pelo usuário na ferramenta dele (Canva,
   Photoshop, remove.bg) ou com `rembg` (código aberto). Exportar WebP com transparência, 1600px no maior lado.
3. **Modelo 3D livre**: Poly Pizza, Kenney e Quaternius são CC0, mas o estilo é simples (low poly): bom para
   ilustração, **não** para cena realista. Realista: Sketchfab com licença CC0/CC-BY. Dá para procurar sem
   conta pela API e mostrar opções ao usuário (baixar pede conta, então quem baixa é ele):
   `https://api.sketchfab.com/v3/search?type=models&q=<termo>&downloadable=true&sort_by=-likeCount`
   Conferir na página do modelo: licença (fugir de -NC), número de faces e se tem marca de terceiros.
   Modelo com 1 milhão de faces precisa de `simplify` antes (`npx @gltf-transform/cli simplify --ratio 0.25`).
   Na busca de 29/10/2026 não foi encontrado um caminhão realista com licença aberta e download sem conta
   adequado à prova. Isso registra o limite da busca, não a inexistência desse modelo. Sem a peça, a
   protagonista pode ser a carga ou o ambiente reais do Poly Haven (caixote `wooden_crate_01`, galpão
   `empty_warehouse_01`), nunca um veículo montado em código para fingir realismo.
   **Ambiente realista**: HDRI e texturas do Poly Haven (CC0, baixa sem conta). A API diz os arquivos:
   `https://api.polyhaven.com/files/<nome>` → `hdri["1k"].hdr.url`. HDRI de 1k ou 2k como `scene.environment`
   (reflexos e luz) e, de lado, como fundo; texturas de asfalto, terra e grama para o chão.
   Otimizar antes de usar:
   ```bash
   npx @gltf-transform/cli optimize entrada.glb public/modelos/veiculo.glb --compress draco --texture-compress webp
   ```
   Draco precisa do decodificador: copiar `node_modules/three/examples/jsm/libs/draco/gltf/` para
   `public/draco/` e carregar com `useGLTF('/modelos/veiculo.glb', '/draco/')` (drei), sem depender de CDN.
4. **Vídeo → quadros** (sequência): vídeo do cliente (celular na horizontal, câmera parada ou movimento
   lento, 3–6 s) ou vídeo que o usuário gerar numa ferramenta dele. Recortar o trecho e tirar os quadros:
   ```bash
   ffmpeg -ss 1 -t 4 -i entrada.mp4 -vf "fps=24,scale=1280:-2" -c:v libwebp -quality 60 public/quadros/%04d.webp
   ffmpeg -ss 1 -t 4 -i entrada.mp4 -vf "fps=12,scale=720:-2" -c:v libwebp -quality 60 public/quadros/celular/%04d.webp
   ```
   Teste (out/2026): 4 s viram 96 quadros/2,2 MB no computador e 48 quadros/0,6 MB no celular. Ajustar
   `TOTAL_QUADROS` e o `width`/`height` do canvas ao que saiu.
5. **Imagem gerada por IA** (quando o usuário tiver conector de geração, ex.: Higgsfield): boa para foto de
   apoio, camada recortada e textura (estrada vista de cima, céu). Conferir o custo antes (`get_cost`) e
   avisar o gasto. No plano grátis do Higgsfield (out/2026): só `gpt_image_2` em qualidade baixa 1k (≈0,5
   crédito), sem fundo transparente, 1 tarefa por vez; ampliação 4K custa 2 e falhou em formato 21:9; vídeo
   (35) e 3D (9+) não cabem nos 10 créditos. Sem fundo transparente: pedir "fundo cinza liso (#808080)" e
   recortar com `scripts/recortar-fundo.py`. **Não** usar foto em placas para fingir 3D: o usuário percebe
   na hora em que a câmera gira. Uso comercial: conferir os termos da ferramenta antes de publicar.

6. **Foto de banco curado** (demonstração, ou enquanto o cliente não manda foto):
   `node scripts/buscar-fotos.mjs <rotulo> <pexels|unsplash|openverse> "<busca>" ... [--orientacao vertical]` grava
   `<rotulo>.json` (original, página, autor, licença, condição de uso) e miniaturas, sem sobrescrever busca anterior.
   `python -I scripts/folha-contato.py <rotulo>` monta uma folha numerada para escolher olhando.
   | Fonte | Chave | O que os termos pedem (conferido em 09/11/2026) |
   |---|---|---|
   | [Pexels](https://www.pexels.com/api/documentation/) | `PEXELS_API_KEY`, grátis, na hora; 200/hora | [Licença](https://www.pexels.com/license/) libera uso comercial e edição. A API pede link visível para o Pexels; crédito ao autor quando possível. Melhor primeira opção: nada contra hospedar a foto no site |
   | [Unsplash](https://unsplash.com/documentation) | `UNSPLASH_ACCESS_KEY`, grátis; 50/hora em demonstração | [Licença](https://unsplash.com/license) libera uso comercial. A [API](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines) exige usar a URL dela (sem copiar o arquivo), avisar o download e creditar. Para hospedar a foto, o usuário baixa pelo site |
   | Openverse (StockSnap CC0) | nenhuma; instável (504: repetir) | [StockSnap](https://stocksnap.io/license) é CC0. A URL da API tem 960 px: o original vem do botão de download da página. rawpixel pela API para em 1024 px |
   **A chave é do usuário:** ele cria e guarda como variável de ambiente, nunca em arquivo versionado. Sem chave, usar o
   Openverse ou a próxima fonte da ordem. Verificação anti-robô, login ou bloqueio encerram a busca naquela fonte:
   nunca contornar nem raspar a página. Qualquer banco: sem vender a foto sem alteração, sem sugerir que a pessoa
   apoia a marca, sem usá-la como logo. Fora pessoas públicas e marcas de terceiros legíveis.
   `scripts/buscar-commons.mjs` continua para o Commons (último recurso): aceita CC0, domínio público, CC BY e CC BY-SA.
   **Série de fotos (sempre que houver fotos de mais de uma origem):** `python -I scripts/tratar-fotos.py <entrada> <saida> --tratamento tratamento.json`
   aplica o mesmo recorte, contraste, cor e grão a todas, sem tocar nos originais, e grava `tratamento-aplicado.json`. Com o raio-x
   (`--do-raio-x raio-x.json`) sugere temperatura e tinta para ajustar. Foto menor que o mínimo só recebe aviso, não é ampliada.
   **Ampliar (opcional):** `--ampliar` (e `--ampliador <exe>` ou `REALESRGAN_EXE`) amplia 4x, com o Real-ESRGAN instalado fora do
   repositório, a foto boa mas pequena (ex. vinda de rede social) para abertura em tela cheia. Sem o programa, avisa e segue.
   Melhora nitidez, mas não inventa detalhe: foto borrada continua borrada; conferir com os olhos. Conta como "melhorar foto real".
   Imagem gerada só melhora foto real (ampliar, estender, reenquadrar) ou faz fundo e textura; nunca peça falsa (LP-11).
7. **Gráficos animados** (site com dados: financeiro, resultados, painel): Evil Charts (evilcharts.com,
   github legions-developer/evilcharts; React + Recharts/ECharts, instala gráfico por gráfico pela CLI do
   shadcn). Pouco conhecido (~2,4 mil ⭐): avisar o usuário antes. Licença varia por componente (MIT na maioria,
   alguns "desconhecida"): conferir cada um. A animação dele é de entrada; para montar com a rolagem, ligar ao
   ScrollTrigger.

## Licença (antes de usar qualquer peça)
Anotar em `assets.md`: arquivo · origem (link) · autor · licença · onde aparece no site.
- Pode: feito por nós, material do cliente, CC0, código MIT/Apache, imagem gerada por ferramenta cujos termos
  liberam uso comercial (anotar a ferramenta e a data).
- Pexels e Unsplash: crédito não é obrigatório pela licença, mas a API pede o que está na tabela acima; anotar a data da conferência.
- CC BY e CC BY-SA: só com crédito no rodapé; perguntar ao usuário antes (em demonstração fictícia, o crédito
  basta). BY-SA: a foto alterada (recorte, P&B) continua BY-SA e isso vai no crédito.
- Nunca: imagem de busca do Google, banco de imagem sem licença, peças tiradas dos sites de referência.

## Orçamento de peso (por cena, computador; celular metade)
Leve até 300 KB · média até 1 MB · pesada até 3 MB. Passou: menos quadros, imagem menor ou outra receita.

## ✔ Mostrar ao usuário
Antes de integrar, criar `assets.json` na pasta das peças e rodar:
```bash
node plugins/landing-pages/skills/lp-assets/scripts/validar-assets.mjs caminho/assets.json --gravar
```
O comando recusa sobrescrever relatórios. Sem `--gravar`, só imprime JSON e retorna código 1 em falha.
Contrato e exemplo real testado: `pilotos/assets-d5/assets.json` na raiz DevConductor. `assets[]`
com arquivo relativo, tipo, origem, autor, licença e licencaUrl; `cenas[]` com id, listas desktop/celular.
**Site com foto usa `versao:2`**, que acrescenta `serie` (`nome`, `tratamento`) e `fotos[]`, uma entrada por foto, na maior
versão publicada: `arquivo`, `fonte` (`cliente`/`banco`/`gerada`), `uso` (`abertura`/`cena`/`apoio`/`miniatura`), `luz`, `foco`,
`expressao`, `serie` (cada um `ok` só depois de olhar o recorte) e `motivo`. A resolução é medida no arquivo.
Item reprovado bloqueia: trocar a foto ou a solução visual. `versao:1` fica para peças sem foto e manifestos antigos.
Para peça do cliente, `autorizacao:"confirmada"` registra autorização já obtida, nunca a presume.
Licenças aceitas: `CC0`, `dominio-publico`, `CC-BY-2.0/3.0/4.0`, `CC-BY-SA-3.0/4.0`, `Unsplash`, `Pexels`, `MIT`,
`Apache-2.0`, `cliente`, `proprio` e `gerada` (com `ferramenta`, `data` e os termos em `licencaUrl`). CC BY/BY-SA exigem autorização confirmada, `credito`, `alteracoes` e `creditoArquivo` com esses textos e link da
licença efetivamente presentes. `realista:true` exige `revisaoVisual` com evidência.
O link Creative Commons precisa corresponder à família e versão declaradas (BY ou BY-SA); não trocar
uma licença pela outra no manifesto. Isso confere coerência da declaração, sem certificar direitos.
Modelo precisa ser GLB 2 com malha; isso não comprova realismo. Hash SHA256 opcional detecta troca da peça aprovada.
Bloqueia caminhos fora da pasta, licenças não suportadas, arquivos vazios e cena acima de 3 MB/1,5 MB.
Sem autorização ou peça apropriada: registrar pendência e usar cena abstrata/tipográfica. Não comprar,
gerar material pago nem declarar autorização por conta própria. O gate confere declarações, não substitui
conferência dos termos e direitos de imagem.
Fontes primárias: [Unsplash](https://unsplash.com/license), [Poly Haven](https://polyhaven.com/license),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Os assets CC0 do Poly Haven não incluem
automaticamente textos, logos e imagens de prévia do site. Não baixar prévias como se fossem assets.

Prints das peças (ou a cena já rodando com elas, se for rápido) e a lista de licenças. Aprovado → `lp-construcao`.
