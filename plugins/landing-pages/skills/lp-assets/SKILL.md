---
name: lp-assets
description: Prepara as peças visuais das cenas-assinatura escolhidas (ilustração SVG, camadas recortadas, modelo 3D livre, quadros tirados de vídeo), com licença anotada e peso dentro do orçamento. Use depois do conceito de movimento aprovado e antes da construção.
---

# Assets das cenas

A cena só fica bonita com peças boas, e elas são o gargalo. Esta etapa entrega, para cada cena escolhida
em `lp-cenas`, os arquivos prontos em `clientes/<slug>/assets/` e a lista `clientes/<slug>/assets.md`.

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

6. **Foto de apoio com licença aberta** (demonstração, ou enquanto o cliente não manda foto): Wikimedia
   Commons, que devolve autor e licença de cada arquivo. `node scripts/buscar-commons.mjs <rotulo> "<busca>" ...`
   grava `<rotulo>.json` (original, página, autor, licença) e miniaturas sem sobrescrever busca anterior;
   use um rótulo novo em cada rodada. `python -I scripts/folha-contato.py
   <rotulo>` monta uma folha numerada para escolher olhando. Aceita CC0, domínio público, CC BY e CC BY-SA
   (foto alterada de BY-SA continua BY-SA). Em 29/10/2026 o Openverse respondia 504 e o Unsplash mostra
   verificação anti-robô: não contornar. Fora pessoas públicas e marcas de terceiros legíveis.
7. **Gráficos animados** (site com dados: financeiro, resultados, painel): Evil Charts (evilcharts.com,
   github legions-developer/evilcharts; React + Recharts/ECharts, instala gráfico por gráfico pela CLI do
   shadcn). Pouco conhecido (~2,4 mil ⭐): avisar o usuário antes. Licença varia por componente (MIT na maioria,
   alguns "desconhecida"): conferir cada um. A animação dele é de entrada; para montar com a rolagem, ligar ao
   ScrollTrigger.

## Licença (antes de usar qualquer peça)
Anotar em `assets.md`: arquivo · origem (link) · autor · licença · onde aparece no site.
- Pode: feito por nós, material do cliente, CC0, código MIT/Apache, imagem gerada por ferramenta cujos termos
  liberam uso comercial (anotar a ferramenta e a data).
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
Contrato e exemplo real testado: `pilotos/assets-d5/assets.json` na raiz DevConductor. `versao:1`, `assets[]`
com arquivo relativo, tipo, origem, autor, licença e licencaUrl; `cenas[]` com id, listas desktop/celular.
Para peça do cliente, `autorizacao:"confirmada"` registra autorização já obtida, nunca a presume.
Licenças aceitas: `CC0`, `dominio-publico`, `CC-BY-2.0/3.0/4.0`, `CC-BY-SA-3.0/4.0`, `Unsplash`, `MIT`,
`Apache-2.0`, `cliente`, `proprio`. CC BY/BY-SA exigem autorização confirmada, `credito`, `alteracoes` e `creditoArquivo` com esses textos e link da
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
