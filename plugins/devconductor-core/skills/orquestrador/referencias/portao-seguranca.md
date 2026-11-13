# Portão de segurança: o que conferir em mudança sensível

Lido só na etapa **Entregar** de mudança sensível (nível 1 ou 2 do detector) e na auditoria de projeto. Leia a categoria que a mudança tocou, não o arquivo inteiro. Quem acha dependência com falha conhecida é a varredura (`seguranca:varredura-seguranca`); aqui se olha o código.

## Como usar
1. Para cada categoria tocada, responda as perguntas olhando o código (arquivo e linha), não a intenção.
2. Cada suspeita vira um achado e termina num dos três estados de "Gravidade e fechamento".
3. Nível 2: quem revisa é o `security-auditor`, que olha também o que a mudança **removeu**. Risco se mede pelo que a mudança toca, não pelo tamanho. Checagem tirada (`[Authorize]`, `RequireAuthorization`,
   `enable row level security`, validação de entrada) é risco alto até prova em contrário: procure no histórico
   por que ela existia (`git log -S "<trecho>"`).
4. Achado no formato `{categoria, arquivo, linha, gravidade, estado, explicacao, correcao}`. Corrigido e varrido de
   novo, grave o marcador: `node "<plugin>/hooks/mudanca-sensivel.mjs" --registrar-revisao --achados <n> --quem "<quem>"`.

## Login
- A senha é guardada com função própria para senha (bcrypt, Argon2, PBKDF2), nunca em texto nem com MD5/SHA puro?
- O token é assinado com chave vinda de fora do código, tem validade curta e a assinatura é conferida em toda rota?
- O login tem limite de tentativas por minuto? A mensagem de erro é a mesma para "usuário não existe" e "senha errada"?
- O token fica fora do alcance de script da página (cookie `HttpOnly`, `Secure`, `SameSite`), não em `localStorage`?
- Como conferir: abra o cadastro, o login e a configuração da autenticação; procure onde o token é gravado no front.
- Errado: `localStorage.setItem("token", t)` → certo: cookie `HttpOnly; Secure; SameSite=Strict` gravado pelo servidor.
- Para corrigir: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

## Permissão
- Monte a tabela: **quem** (cada perfil) pode fazer **o quê** (ler, criar, alterar, apagar) com **qual registro**.
- A consulta filtra pelo dono do registro, e não só por "está logado"?
- A rota irmã, a ação em lote, a exportação e a tarefa de fundo que chegam ao mesmo dado fazem a mesma checagem?
- A checagem roda no servidor, antes de buscar e devolver o registro? Esconder o botão na tela não é checagem.
- Identificador difícil de adivinhar (UUID) não dispensa a checagem. Resposta vazia para registro alheio não é vazamento.
- Como conferir: liste todas as rotas do arquivo e marque qual tem a checagem; a que não tem, explique por quê.
- Errado: `db.Pedidos.FindAsync(id)` → certo: `db.Pedidos.Where(p => p.Id == id && p.UsuarioId == usuarioId)`.
- Para corrigir: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html e https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html

## Regras de acesso do banco
- Toda tabela com dado de usuário tem `enable row level security` (regra por linha) e ao menos uma regra de acesso?
- Alguma regra é `using (true)` ou `with check (true)`? Isso libera a tabela inteira.
- A regra de escrita (`with check`) confere o dono, e não só a de leitura (`using`)?
- Função `security definer` (roda com o poder de quem a criou) confere quem chamou? A chave de serviço fica fora do front?
- Toda consulta usa parâmetro, nunca texto montado com dado de fora?
- Como conferir: leia as migrações da mudança; para cada `create table`, ache o `enable` e as regras.
- Errado: `create policy p on pedidos using (true);` → certo: `... using (usuario_id = auth.uid());`
- Errado: `FromSqlRaw($"... where nome = '{nome}'")` → certo: `FromSqlInterpolated($"... where nome = {nome}")`.
- Para corrigir: https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html

## Envio de arquivo
- O servidor confere a extensão por lista do que pode, o tipo real do conteúdo e o tamanho máximo?
- O nome gravado é gerado pelo servidor? O nome que veio do usuário nunca entra no caminho do disco.
- O arquivo fica fora da pasta que o site serve direto, e quem baixa passa pela checagem de permissão?
- Como conferir: siga o arquivo do recebimento até a gravação e até a rota que o devolve.
- Errado: `Path.Combine(pasta, arquivo.FileName)` → certo: `Path.Combine(pasta, Guid.NewGuid() + extensaoConferida)`.
- Para corrigir: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

## Pagamento
- O valor cobrado é calculado no servidor? Preço e desconto vindos da tela não valem.
- O aviso do provedor (webhook) tem a assinatura conferida e o mesmo aviso repetido não paga duas vezes?
- Número de cartão nunca passa pelo servidor nem pelo log (fica com o provedor)?
- O pedido só muda para "pago" pelo aviso conferido, nunca pela volta do navegador?
- Como conferir: ache onde o valor nasce e onde o estado "pago" é gravado.

## Dados pessoais
- CPF, telefone, endereço, senha ou token aparecem em log, console ou mensagem de erro mostrada ao usuário?
- A rota devolve só os campos que a tela usa, ou o registro inteiro?
- O dado novo é necessário para a função? Há como apagar ou corrigir a pedido do titular (LGPD, a lei de dados)?
- Como conferir: procure os campos nas chamadas de log e nas respostas das rotas tocadas.
- Errado: `console.log("login", cpf, senha)` → certo: `console.log("login", usuarioId)`.
- Para corrigir: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Segredos
- Senha, chave ou token está em arquivo versionado (`appsettings.json`, `.env`, código)? Deve vir de variável de ambiente.
- Há valor padrão no código para o caso de a variável faltar (`?? "dev-secret"`)? O sistema subiria com chave conhecida.
- Segredo que já entrou no histórico do Git foi **trocado**? Apagar a linha não basta.
- Como conferir: rode a varredura e leia a configuração tocada.
- Errado: `var chave = config["Jwt:Key"] ?? "chave-de-teste";` → certo: sem padrão; falta a variável, o sistema não sobe.
- Para corrigir: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

## Gravidade e fechamento
Dê nota ao que você provou, não ao pior caso que imaginou. Se só vale "aceitando uma cadeia de suposições", não é alto.
- **Crítico:** qualquer pessoa, sem login, executa código, entra como outro usuário ou baixa dados de todos; token aceito sem conferir a assinatura; chave de assinatura ou do banco exposta.
- **Alto:** usuário comum vira administrador ou lê e altera dado de outro; SQL montado com texto que chega a dado real; segredo em arquivo versionado; envio de arquivo sem validação; dado pessoal ao alcance de quem ataca.
- **Médio:** falha que pede ação da vítima ou condição estreita que você confirmou; falta de checagem em dado de pouco valor; dado pessoal em log; login sem limite de tentativas; erro detalhado mostrado ao usuário.
- **Baixo:** falta de endurecimento (cabeçalhos, atributos de cookie), listagem que só confirma que algo existe.
Restrição confirmada (só rede interna, exige perfil alto) **baixa** a nota; não apaga o achado. Todo achado termina em:
- **confirmado:** caminho completo da entrada de fora até o efeito, com arquivo e linha.
- **descartado:** só completando a frase "é seguro porque `<proteção>` em `<arquivo:linha>` faz `<o quê>` antes do efeito, em todo caminho que quem ataca alcança".
- **pendente de prova:** plausível, sem confirmação e sem proteção apontada. Vai ao relatório como "conferir"; nunca some.
Não descartam: "usa biblioteca conhecida"; proteção que cobre outra rota; checagem que roda depois do efeito; proteção dentro de `try` que engole o erro; "é só interno"; "não achei quem chama". Um ponto seguro não fecha o vizinho.
Só **confirmado** alto ou crítico conta em `achadosAbertos` e barra o commit; o resto vai ao relatório.

## Não é achado
- Arquivo que só roda em teste; arquivo de documentação.
- Negação de serviço genérica e consumo de memória ou de processador (exceções do kit: login sem limite e envio sem tamanho).
- Falta de endurecimento sem falha concreta: vai ao relatório como baixo e não barra.
- Falta de checagem em código que roda no navegador: quem valida é o servidor.
- React e Angular já protegem o texto na tela, salvo `dangerouslySetInnerHTML` e parecidos.
- Variável de ambiente e opção de linha de comando são confiáveis.
- Dependência desatualizada: é da varredura. Condição de corrida só teórica. Texto de usuário no log, sem dado sensível.
Continuam sendo achado neste kit: segredo em arquivo versionado, rota que confia em identificador difícil de adivinhar e login sem limite de tentativas.

Trechos adaptados de usestrix/strix (Apache-2.0) e anthropics/claude-code-security-review (MIT), traduzidos e
alterados; ver NOTICE.
