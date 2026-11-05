# Pronto quando

- [ ] `node --test inicial.test.mjs` termina com código 0, com 1 teste aprovado.
- [ ] `node --test aceitacao.test.mjs` termina com código 0, com os 53 testes aprovados, sem pular ou remover casos.
- [ ] O catálogo original de 15 pacotes gera os campos exatos, dependências diretas e transitivas sem repetição e ordem topológica determinística por Kahn com escolha alfabética a cada passo.
- [ ] Casos vazios, nomes válidos no limite, versões canônicas, nomes de arquivos diferentes dos pacotes e caminhos com espaços e acentos funcionam.
- [ ] Argumentos, caminhos, formato JSON, nomes, versões, dependências e ciclos são validados com a precedência e as mensagens exatas do pedido.
- [ ] Toda falha preserva os bytes da saída anterior e os manifestos; nenhum destino dentro da entrada é aceito.
- [ ] O relatório tem serialização estável de dois espaços, LF final, stdout/stderr vazios em sucesso e código 1 com uma linha de erro nas falhas.
- [ ] Há separação entre CLI, validação de argumentos/caminhos, leitura, manifestos e grafo, por módulos em `src/`.
- [ ] Somente `auditar.mjs` e `src/` foram implementados; nenhum arquivo congelado foi alterado.
- [ ] Funciona no Node.js 22+ em Windows e Linux, apenas com módulos nativos e processos sem shell; sem rede, dependências, dados pessoais, commit ou publicação.

## Estado entregue da matriz

A ajuda está pronta. A funcionalidade está deliberadamente ausente: fora de `--ajuda` isolado, a CLI retorna código 1 com `Erro: auditoria ainda não implementada.`. O teste inicial passa e os 53 testes de aceitação falham nesse estado. Os testes exercitam a CLI em processos Node reais e não importam os módulos da solução. Os temporários ficam em `pilotos/testes-temporarios/` e são removidos somente após verificar contenção por caminho real.

Os casos finais verificam criação de saída nova, falha sem criar saída, normalização de `.`/`..` e diretório vizinho com prefixo igual ao da entrada. O caso de falha de gravação carrega um preload Node somente no processo filho: ele injeta `EIO` nas operações de escrita/substituição do destino por `fs` e `fs/promises`, incluindo APIs síncronas, callbacks e streams, sem afetar leituras ou escrita de temporários. O teste exige uma tentativa real de gravação, preservação da saída antiga e remoção dos temporários; não depende de permissões, disco cheio ou `chmod`.

Links simbólicos e aliases reais de diretório exigem revisão independente antes de aprovar a entrega. A suíte não os cria porque isso pode exigir privilégio no Windows. Quando o ambiente não permitir criá-los, registre essa limitação explicitamente na evidência de preservação; os testes com `.`/`..` não substituem essa verificação.
