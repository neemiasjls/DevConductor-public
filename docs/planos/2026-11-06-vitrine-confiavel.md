# Vitrine confiável — plano para revisão

Estado: proposta; os limites de caminho e exclusões já foram corrigidos na rodada de 06/11.

## Objetivo

Gerar uma cópia pública reproduzível sem perder a cópia anterior numa falha e sem enviar para um repositório
diferente do configurado. Não transformar esta tarefa em serviço, painel ou infraestrutura nova.

## Suposições e limites

- O privado continua sendo a fonte de trabalho; o público recebe conteúdo sanitizado, nunca histórico privado.
- Configuração explícita continua escolhendo o que publicar. Varredura por padrões não prova ausência de dados pessoais.
- Nenhuma mudança de visibilidade, deploy ou alteração global pertence a este plano.
- Não reutilizar a pasta pública se ela tiver trabalho local alheio.

## 1. Preflight sem mutação [difícil]

**Arquivos:** `plugins/devconductor-core/skills/subir/scripts/vitrine.mjs`, `scripts/testes/vitrine.test.mjs`.
**Regra:** preparar lista, validar tipos da configuração, resolver caminhos reais e varrer antes de clonar,
limpar, adicionar ou commitar. O destino existente precisa ser um repositório esperado, sem mudanças locais;
comparar `origin` com `repositorio` aceitando formas SSH e HTTPS equivalentes, sem credenciais em logs.
Verificar o código de saída de todo comando Git. Falha não pode parecer lista de mudanças vazia.
**Pronto quando:** repositório errado ou sujo é recusado sem modificar seu conteúdo, índice ou HEAD.
**Testes:** repositórios temporários com remote errado, ausência de origin, origin SSH equivalente, Git falhando
e arquivo local não rastreado. Rodar `node --test scripts/testes/vitrine.test.mjs`.
**Depende de:** nenhuma.

## 2. Geração transacional [difícil]

**Arquivos:** mesmo módulo e testes, mais documentação de vitrine.
**Regra:** construir todos os arquivos em uma pasta temporária irmã, conferir o resultado, e só então instalar.
Preservar `.git` e preparar rollback dos arquivos anteriores. A troca deve funcionar no Windows com arquivo
preso: não apagar a cópia anterior primeiro. Não prometer atomicidade multiarquivo que o filesystem não oferece.
Remover temporários somente quando sua origem e seu caminho absoluto forem verificados.
**Pronto quando:** falha em qualquer cópia deixa a versão anterior intacta; falha na instalação restaura a anterior
ou preserva backup recuperável e produz diagnóstico explícito, sem commit/push.
**Testes:** injetar falha na primeira cópia, no meio e na instalação; verificar bytes anteriores e estado Git.
Testar destino ausente, presente, diretório com espaços e arquivo preso no Windows.
**Depende de:** 1.

## 3. Snapshot imutável e identidade do conteúdo [difícil]

**Regra:** decidir explicitamente entre snapshot do commit ou recusa de privado sujo. Hoje `git ls-files` seleciona
os caminhos, mas a leitura usa bytes da árvore de trabalho. Não documentar isso como snapshot do HEAD.
Usar o mesmo conteúdo para varrer e copiar; não reler binários depois de aprovar a varredura.
Links de origem, junções em ancestrais e colisões precisam ser resolvidos antes de qualquer escrita pública.
**Pronto quando:** mudar a origem entre validação e cópia não insere conteúdo não validado no público.
**Teste:** fixture que altera a origem entre as duas fases e fixture com diretório substituído por junção.
**Depende de:** 1–2.

## 4. Manifesto e ensaio de instalação [sonnet]

**Arquivos:** gerador, testes, `docs/vitrine-publica.md`, workflow de testes.
**Regra:** registrar hash do snapshot e dos arquivos públicos, versões e número de exclusões; sem padrões pessoais,
valores encontrados, caminhos da máquina ou timestamps como motivo de commits vazios.
Executar instalação isolada a partir da cópia pública gerada numa fixture limpa, sem credenciais.
**Pronto quando:** segunda geração idêntica não cria commit; instalar e validar os plugins da cópia funciona.
**Teste:** duas gerações do mesmo snapshot, comparação de hashes e ensaio Windows/Linux no CI.
**Depende de:** 3.

## Entrega

Versão nova do núcleo e catálogo; suíte completa, validate raiz/núcleo; revisão de cada achado e evidência
de rollback. Publicação real fica fora do teste. Evitar teste que apenas procure palavras no código.
