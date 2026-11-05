# Auditor local de catálogo

Implemente uma ferramenta Node.js 22+ que leia um catálogo local de pacotes e gere um relatório JSON de dependências. Há módulos iniciais em `src/`; organize a solução entre eles e conecte a CLI. Use somente módulos nativos, sem instalar dependências, acessar a rede ou executar ferramentas externas.

Execute com `node auditar.mjs <diretorio> <saida.json>`. O único outro comando é `node auditar.mjs --ajuda`, que deve manter o texto inicial de ajuda e terminar com código 0. Qualquer outra combinação de argumentos é inválida: são obrigatórios exatamente dois argumentos não vazios, nenhum começando com `-`. Caminhos relativos são resolvidos a partir do diretório de trabalho do processo.

## Entrada

O diretório deve existir e ser acessível. Considere somente entradas diretamente nele cujo nome termine exatamente em `.json` (diferencia maiúsculas). Não percorra subdiretórios. Ignore todas as outras entradas. Uma entrada considerada deve ser arquivo regular, sem link simbólico, e permitir leitura; caso contrário, é arquivo ilegível. Diretório vazio é válido.

Cada arquivo contém um objeto JSON com exatamente estas três propriedades:

```json
{"nome":"meu-pacote","versao":"1.2.3","dependeDe":["outro-pacote"]}
```

- `nome`: string de 1 a 64 caracteres ASCII, correspondente a `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`. Não aceite espaços, `_`, maiúsculas, hífen inicial/final ou dois hífens seguidos.
- `versao`: string correspondente a `^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$`. São três componentes decimais; somente o próprio zero pode começar com zero. Não há limite numérico para cada componente: preserve a string, sem converter para `Number`. Não aceite prefixos, sufixos ou metadados.
- `dependeDe`: array de zero ou mais strings; cada uma obedece ao mesmo formato e limite de `nome`. Não repita uma dependência no mesmo array. Cada nome precisa existir no catálogo.

Não aceite propriedades adicionais, campos ausentes, `null`, arrays como objeto principal ou tipos diferentes dos descritos. JSON é interpretado como UTF-8 por `JSON.parse`: BOM inicial é inválido e propriedades JSON repetidas seguem o resultado de `JSON.parse` (última ocorrência). Não há limite artificial de quantidade de arquivos ou de dependências. Os 15 manifestos fictícios em `dados/catalogo/` são um exemplo válido, não uma lista fixa de nomes aceitos.

Cada nome de pacote é único em todo o diretório, independentemente do nome do arquivo. Rejeite ciclos em qualquer componente do grafo, incluindo autorreferência.

## Relatório

Grave exatamente este formato, sem campos adicionais:

```json
{
  "pacotes": [
    {
      "nome": "meu-pacote",
      "versao": "1.2.3",
      "dependenciasDiretas": ["outro-pacote"],
      "dependenciasTransitivas": ["outro-pacote"]
    }
  ],
  "ordemTopologica": ["outro-pacote", "meu-pacote"]
}
```

O exemplo acima mostra os campos de um pacote; um relatório real também inclui o pacote `outro-pacote`. Ordene `pacotes` por `nome`. Ordene os dois arrays de dependências por nome, sem repetição. `dependenciasTransitivas` inclui todos os nomes alcançáveis por um ou mais passos, inclusive as diretas; um nome alcançado por vários caminhos aparece uma vez. `dependenciasDiretas` mantém todas as dependências declaradas, mesmo quando alguma também pode ser alcançada por outro caminho.

Para `ordemTopologica`, use Kahn: comece com os pacotes sem dependências pendentes; retire o menor nome disponível, libere seus dependentes e escolha novamente o menor nome entre **todos** os disponíveis naquele momento. Não esgote uma camada antes de considerar os recém-liberados. Assim, `a -> b`, com `b` e `c` independentes, produz `["b", "a", "c"]`. Todas as comparações de nome são ordinais ASCII, sem `localeCompare` ou regras locais.

Serialize com `JSON.stringify(relatorio, null, 2) + '\n'`, mantendo a ordem dos campos mostrada acima. O diretório vazio gera `{"pacotes":[],"ordemTopologica":[]}` com a mesma indentação e LF final. Em sucesso: código 0, stdout e stderr vazios.

## Segurança de arquivos e erros

Não altere manifestos, não grave arquivos temporários na entrada e não grave a saída dentro dela, nem diretamente nem em subdiretório. Resolva caminhos absolutos e aliases de diretório existentes antes dessa comparação; verifique ancestralidade por componentes, para não confundir `entrada` com `entrada-vizinha`. O pai da saída deve existir e ser diretório acessível. O destino pode não existir ou ser arquivo regular existente; rejeite destino que seja diretório ou link simbólico. Não crie diretórios de saída.

Valide tudo antes de substituir uma saída existente. Qualquer falha de argumentos, caminhos ou dados deve manter a saída antiga byte a byte e não criar saída quando ela não existia. A gravação deve produzir o arquivo completo ou falhar, limpando eventual temporário fora da entrada. Não deixe saída parcial. Em qualquer falha: código 1, stdout vazio e uma única linha em stderr, terminada por LF.

Use os textos exatos abaixo. `<arquivo>` é somente o nome da entrada, sem caminho, escapado por `JSON.stringify(nomeDoArquivo).slice(1, -1)`: controles, aspas e barras invertidas aparecem como escapes JSON, nunca como uma quebra de linha real em stderr. `<nome>` e `<dependência>` são os nomes declarados.

| Condição | stderr (sem o LF final exibido) |
| --- | --- |
| Argumentos inválidos | `Erro: argumentos inválidos.` |
| Entrada ausente, inacessível ou sem ser diretório | `Erro: diretório de entrada inválido.` |
| Destino na entrada ou em descendente dela | `Erro: saída dentro da entrada.` |
| Pai ausente/inválido ou destino sem ser arquivo regular | `Erro: destino de saída inválido.` |
| Entrada `.json` sem ser arquivo regular ou não legível | `Erro: arquivo ilegível: <arquivo>.` |
| Texto que `JSON.parse` rejeita | `Erro: JSON inválido: <arquivo>.` |
| Objeto ou valores fora do formato | `Erro: manifesto inválido: <arquivo>.` |
| Nome de pacote repetido | `Erro: nome duplicado: <nome>.` |
| Dependência repetida no mesmo pacote | `Erro: dependência duplicada: <nome> -> <dependência>.` |
| Dependência sem pacote correspondente | `Erro: dependência ausente: <nome> -> <dependência>.` |
| Qualquer ciclo | `Erro: ciclo de dependências.` |
| Falha ao gravar/substituir o relatório | `Erro: não foi possível gravar a saída.` |

A precedência é: argumentos; entrada; saída dentro da entrada; destino inválido; leitura/JSON/formato dos arquivos; nomes duplicados; dependências duplicadas; dependências ausentes; ciclos; gravação. Na etapa de arquivos, percorra nomes de arquivo pela ordem dos code units UTF-16, comparando strings com `<` e `>` (sem `localeCompare`), e, para cada um, faça leitura, parse e validação de formato antes de passar ao seguinte. Nas três etapas seguintes, percorra nomes de pacote em ordem ordinal ASCII; havendo várias dependências problemáticas do mesmo pacote, informe a menor em ordem ordinal ASCII. Não exponha stack trace nem mensagens do sistema operacional.

## Escopo e entrega

`pedido.md`, `pronto-quando.md`, `package.json`, os testes e `dados/` são congelados. Implemente somente `auditar.mjs` e `src/` na cópia do exercício; pode criar outros módulos em `src/`. Não altere outras tarefas, plugins, configurações ou arquivos globais. Não faça commit, publicação ou chamadas a serviços externos. Ferramentas internas de execução e delegação do ambiente são permitidas, sem obrigação de usá-las.

Execute os dois comandos de teste do package e relate o resultado com código de saída. A suíte inicial já passa; a de aceitação deve passar depois da implementação. Não há exigência de usar agentes: escolha como conduzir o trabalho.
