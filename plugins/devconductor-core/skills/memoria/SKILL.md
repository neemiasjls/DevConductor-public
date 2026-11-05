---
name: memoria
description: Memória local do projeto (vale em todos). "/memoria retomar" diz onde paramos; "/memoria salvar" confere se algo da conversa ficou sem gravar (opcional, a memória já é salva na hora) e libera o /clear; "/memoria revisar" faz a manutenção (duplicatas, contradições, arquivos grandes); "/memoria padronizar" reformula a memória do projeto no padrão global.
argument-hint: "retomar | salvar | revisar | padronizar"
---

# Memória do projeto (skill global)

Modo: `$ARGUMENTS` (vazio = gravar agora o que acabou de surgir na conversa, pelo protocolo).
Apelidos: `checkpoint` = salvar · `manutencao` = revisar · `status` = retomar.
O resumo do protocolo está no `~/.claude/CLAUDE.md` ("Memória"). Particularidades do projeto (onde fica
cada coisa, etiquetas, limites, verificador da memória, pasta pública × privada) estão no CLAUDE.md dele e
no índice/README que ele apontar; elas valem sobre o padrão. Tudo inline, sem subagente (o subagente não
vê a conversa), exceto o diagnóstico do `revisar`.

## Protocolo completo
- **Gatilhos:** correção ("não é assim", "na verdade"), regra nova ou mudada, exceção, "sempre"/"nunca",
  decisão (inclusive resposta a pergunta), convenção, preferência, contexto do negócio, resultado de teste
  real, armadilha que custou depuração.
- **Filtro:** vale daqui a um mês, não sai do código em 2 minutos e não é segredo. Trabalho em andamento
  vai só no `docs/continuar.md`. Até 2 arquivos por registro; nunca reler a memória inteira.
- **Status:** `confirmado (nome, data)` · `documentado` · `verificado` · `inferido do código (arquivo)` ·
  `hipótese` · `pendente`. Etiquetas próprias do projeto valem sobre estas.
- **Mudança:** reescrever o estado atual; "Antes:" só se dado antigo segue a regra velha ou o motivo evita
  repetir erro; ID removido não se reutiliza.
- **Conflito:** os dois lados nas pendências (fonte e data) e perguntar quando o assunto importar para a
  tarefa; não encerrar resposta com lista de perguntas.
- **Git:** memória fora do GitHub (`.gitignore` ou `.git/info/exclude`); o que o projeto já versiona por
  decisão do usuário não sai do git sem perguntar.

## retomar (início de sessão ou depois de /clear)
1. Ler só `docs/continuar.md` (ou o continuar.md da memória automática, se o projeto guarda a
   memória lá) e os títulos/IDs do arquivo de pendências que ele cita.
2. Responder em até 5 linhas: feito por último, em andamento, próximo passo, o que falta testar e as
   pendências que tocam o próximo passo.

## salvar (conferência antes de /clear; opcional)
1. Ponto de partida: a linha `Último salvamento:` do `docs/continuar.md` (sem ela, a conversa toda).
   Se a conversa foi compactada depois disso, recuperar minhas mensagens que saíram do contexto:
   `node "<pasta desta skill>/mensagens.cjs" - "<data do último salvamento>"`.
2. Listar o que eu disse de duradouro e ainda não está gravado (filtro do protocolo). Para cada
   item: arquivo do assunto pelo índice → grep do termo/ID → editar a entrada ou criar o próximo ID.
   Conflito com regra confirmada → pendências.
3. Atualizar o `docs/continuar.md` com o estado atual e `Último salvamento: AAAA-MM-DD HH:MM`.
4. Rodar o verificador da memória do projeto, se o CLAUDE.md dele citar um.
5. Responder `Guardei: ID — título` por item (ou "Nada novo para guardar") e "Pode dar /clear".

## revisar (manutenção ocasional)
1. **Diagnóstico (só leitura).** Tamanho dos arquivos de memória (linhas e ≈ tokens = bytes/4)
   contra os limites do projeto (padrão: CLAUDE.md ~120 linhas, cada regra ~150, continuar ~25,
   pendências ~40 itens). Pode ir ao `complex-tasks` como PROPOSTA, sem editar: duplicatas (também
   entre arquivos), contradições, regra "inferido" que o código já desmente, texto longo, pendência
   resolvida, "Ver:", caminhos e `paths:` quebrados, segredo com valor (senha, token, chave,
   connection string), dado pessoal ou menção a Claude/IA em arquivo versionado.
2. **Antes de mexer:** cópia dos arquivos em `.claude/backup-memoria-AAAA-MM-DD/`.
3. **Aplicar na conversa principal:** juntar duplicatas (fica no assunto dono, os outros apontam
   "Ver: ID"); resumir entradas longas (1–4 linhas + Código); pendência resolvida vira estado na
   entrada do assunto e sai das pendências; dividir arquivo grande por subtema (ajustar índice e
   `paths:`); corrigir referências.
4. **Regra confirmada** nunca é apagada, rebaixada ou fundida mudando o sentido sem eu aprovar: listar
   e perguntar. Prioridade: correto > confirmado > consistente > organizado > menos tokens.
5. Atualizar `Última revisão: AAAA-MM-DD` no `docs/continuar.md` e entregar um relatório curto: antes ×
   depois (linhas e tokens) e o que precisa da minha decisão.

## padronizar (uma vez por projeto)
Ler `padronizar.md` (nesta pasta da skill) e seguir. É o prompt universal de reformulação da memória.
