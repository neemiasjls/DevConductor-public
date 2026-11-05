# Servidores descartáveis de teste

No Windows, encerrar o PID de um shell não garante encerrar o Node que ele iniciou. Uma sessão do ensaio
deixou a porta 3000 ocupada depois do teste. Para os revisores, o servidor é iniciado diretamente com o
executável do Node e o encerramento é aguardado antes de liberar a revisão e apagar arquivos temporários.

```js
import { criarEscopoProcessos } from '../scripts/lib/processos-teste.mjs'

const processos = criarEscopoProcessos()
try {
  const servidor = processos.iniciarNode(['servidor.mjs'], { cwd: pastaDaEntrega })
  // Aguardar prontidão e verificar HTTP; consumir stdout/stderr conforme necessário.
} finally {
  await processos.encerrar()
}
```

`iniciarNode` usa `process.execPath`, argumentos separados, `shell: false` e janela oculta no Windows.
Retorna o `ChildProcess` para acompanhar saída, erros e prontidão. Não procura processos pelo nome nem
encerra o ocupante de uma porta. Se a porta necessária já estiver ocupada, registre o impedimento e
identifique o processo antes de agir; nunca encerre todos os processos Node.

`encerrar` envia término somente aos filhos registrados, aguarda `close`, força o término se necessário
e retorna quando todos fecharam. A tolerância padrão é 1.500 ms por espera, configurável. A limpeza pode
ser chamada mais de uma vez e impede iniciar novos filhos no escopo encerrado. Falha de inicialização ou
encerramento é devolvida como `AggregateError`, depois de tentar fechar os demais filhos.

O escopo controla os processos Node iniciados por ele, não adota servidores órfãos e não promete encerrar
descendentes criados por um shell ou pelo próprio script. Por isso use o arquivo de entrada diretamente,
em vez de `npm start` ou um comando de shell intermediário. Outros recursos, como o navegador, também
precisam de seu próprio `finally`.

## HTTP que falha ou não termina

`scripts/lib/http-teste.mjs` usa `async/await` para headers e leitura do corpo, com prazo de 5 segundos por
requisição. Uma resposta truncada rejeita a promise que o revisor aguarda, alcançando seu `finally`.
Erros HTTP como 400 continuam sendo retornados para conferir o contrato; corpo não JSON também é evidência.
As requisições ficam em `127.0.0.1` e não seguem redirecionamentos.

A prontidão de API/LP usa um prazo total de 10 segundos, com no máximo um segundo por tentativa, incluindo
o corpo. A API aceita seu contrato de 404 JSON; a LP espera uma resposta de sucesso. Assim, um servidor que
aceita conexão sem responder também falha no prazo, antes da limpeza dos processos.

Onze testes HTTP cobrem resposta normal/de erro, corpo não JSON, truncamento, ausência de headers,
corpo sem fim, redirecionamento e prontidão. A revisão independente reproduziu o defeito anterior e
confirmou que a correção agora rejeita a requisição e executa a limpeza.

## Aplicação e evidências

Os revisores locais de API e LP do ensaio usam esse escopo. A API agora fecha também o servidor de inspeção
do heap se a revisão falhar; a LP fecha seu servidor mesmo se o navegador não iniciar. A remoção das pastas
temporárias ocorre após o encerramento, com verificação do caminho e repetição limitada para locks do Windows.
Critérios de qualidade e snapshots do ensaio 0.1.21 permanecem iguais.

O revisor API cria o processo auxiliar e o heap temporário na pasta da própria execução, dentro do lote.
Confere o caminho real antes de remover essa pasta; não usa mais a pasta temporária global do sistema.
As duas APIs r1 do reensaio 0.1.21 passaram com esse destino e a limpeza atualizados.
O revisor CSV usa a mesma contenção na pasta da execução, com prazo para o processo Node e conferência
do caminho antes da remoção. Na rodada CSV base r2, o log registrou o destino interno e a pasta foi
removida mesmo com a revisão reprovada pela preservação de entrada/saída; a correção segue na sessão medida.

Sete testes em `scripts/testes/processos-teste.test.mjs` verificam HTTP e liberação de porta, falha no meio
da revisão, vários filhos, repetição da limpeza, término forçado, erro de inicialização, preservação de serviço
alheio e argumentos literais. O teste de caminho inclui espaços e acentos.

Também foram executados os dois revisores em cópias das entregas aprovadas do lote antigo: API e LP passaram,
as portas ficaram livres e o plano original permaneceu intacto. Evidência local ignorada:
`pilotos/testes-temporarios/limpeza-revisores-AfsmZx/resultado.json`. Não são rodadas novas do modelo.
Após incluir os prazos HTTP, outra regressão dos dois revisores também passou e liberou as portas:
`pilotos/testes-temporarios/limpeza-revisores-4NmUkR/resultado.json`. Os lotes reais não foram alterados.
