---
name: auditoria-projeto
description: Use quando o usuário pedir para auditar a segurança de um projeto que já existe ("audita o sistema", "procura falhas de segurança", "esse projeto está seguro?"). Só lê e relata, em duas passadas por agentes diferentes; não altera nada no projeto e termina com um plano de correção para o dono aprovar.
---

# Auditoria de segurança de um projeto real

Roda na conversa do projeto auditado. **Não altera o projeto**: nada é editado, criado, instalado nem commitado
nele. O resultado é um relatório fora do repositório e um resumo na conversa. Corrigir é outra tarefa, depois de
o dono aprovar.

A lista de perguntas, a régua de gravidade e o que não é achado estão num arquivo só, chamado aqui de
**lista do portão**: `skills/orquestrador/referencias/portao-seguranca.md` do plugin `devconductor-core`.

## Passo a passo

1. **Foto do começo.** Anote a saída de `git status --porcelain` e de `git rev-parse HEAD`. No fim, as duas têm
   de estar iguais.
2. **Mapa.** Em lista curta: linguagens e programas do projeto, por onde entra dado de fora (rotas, telas,
   arquivos), onde ficam o login, a permissão, o banco (migrações e regras de acesso) e o envio de arquivo. Com
   o plugin `grafo-codigo` ligado, consulte o grafo antes de abrir arquivos.
3. **Varredura.** Skill `seguranca:varredura-seguranca` com `--historico` e `--saida <pasta temporária fora do
   repositório>`. Em projeto .NET a conferência de pacotes pode precisar de `dotnet restore`, que cria a pasta
   `obj/`; se ela ainda não existir, peça o OK do dono antes. Ferramenta que faltou entra no relatório.
4. **Duas passadas, por agentes diferentes.**
   - **1ª passada, por lista:** `security-auditor` com `model: "opus"`, uma área sensível por vez, com a lista
     do portão inteira. Procura o que deveria existir e falta: nada sensível no console, no log ou em mensagem
     de erro; token fora do alcance de script da página; limite de tentativas no login e de tamanho no envio;
     consulta ao banco só com parâmetros; checagem do dono do registro em toda rota. Devolve os achados e o
     plano para tampar cada buraco.
   - **2ª passada, de quem ataca:** outro agente (`complex-tasks` com `model: "opus"`), **sem ver o relatório
     da 1ª**. Recebe só o mapa do passo 2 e as seções "Gravidade e fechamento" e "Não é achado" da lista do
     portão (não as perguntas, para não pensar igual), com o pedido: "procure falhas de segurança neste
     projeto, como quem quer invadir". Só lê.
   - **Juntar** sem repetir. Cada achado sai com estado **confirmado** ou **pendente de prova**; pendente vai
     como "conferir" e nunca some. O que só a 2ª passada achou entra no fim do relatório, em "Conhecimento
     candidato", como pergunta nova para a lista do portão. Não edite o kit durante a auditoria.
5. **Banco de verdade.** Não conecte e não rode SQL. Só com o OK do dono, leia os avisos de segurança do
   provedor em modo leitura, sem ler nenhuma linha de dado.
6. **Relatório**, fora do repositório, e resumo na conversa. Ordem: crítico, alto, médio (baixo numa lista só no
   fim). Para cada achado: o que é, onde (`arquivo:linha`), estado, qual passada achou, o risco real para a
   empresa em uma frase, como corrigir (com o link da categoria na lista do portão) e o esforço (pequeno, médio,
   grande). **Segredo sempre mascarado**, inclusive no resumo. Segredo no histórico do Git: recomende **trocar a
   chave**; não reescreva o histórico sem OK.
7. **Fechar.** Confira a foto do passo 1 (iguais) e proponha um plano de correção em ordem de gravidade. Nada é
   aplicado até o dono aprovar. Depois das correções, repita só a 2ª passada para conferir.

## Como falar com o dono

Português simples, sem sigla sem explicação. Primeiro o número de achados por gravidade e o mais urgente; depois
a lista. Diga também o que **não** foi conferido (ferramenta ausente, banco real, sistema rodando): limpo e não
olhado são coisas diferentes.

## Não fazer

- Editar, formatar, instalar pacote ou commitar no projeto auditado.
- Mostrar o relatório da 1ª passada ao agente da 2ª.
- Apagar achado pendente de prova para a lista ficar menor, ou subir a nota pelo pior caso imaginado.
- Conectar em banco real, rodar SQL ou testar invasão com o sistema no ar (fora do escopo desta skill).
- Gravar o relatório dentro de qualquer repositório ou colar segredo sem máscara.
