---
name: ui-sistemas
description: Use ao criar, redesenhar ou revisar telas de sistema em qualquer stack (React, Next, Blazor, Vue e outras; padrão React) e em projeto novo ou vazio, quando o pedido fala em sistema, painel, cadastro ou área logada (também ERP, CRM, dashboard, lista, tabela, formulário, app interno), mesmo sem falar em design. Não é para landing page (fluxo lp-*).
---

# UI de sistemas

Sistema bom é o que a pessoa usa o dia inteiro sem pensar: lê rápido, erra pouco e acha tudo no mesmo lugar em
toda tela. A beleza vem da contenção (uma cor de destaque, espaço e tipografia constantes) e do cuidado com o que
quase todo mundo esquece: vazio, erro, demora e dado brasileiro.

## Antes da primeira tela: o DESIGN.md
O `DESIGN.md` (formato do Google, na raiz do produto) é a memória visual do projeto. Toda sessão o lê antes de
mexer em tela e registra nele qualquer desvio, com o motivo.
- Não existe e o projeto já tem telas: reconstrua com `create-design-md` (modo repositório).
- Projeto novo: escreva pelo modelo em `design-md.md` (nesta pasta).
- Validação: `npx -y -p @google/design.md designmd lint DESIGN.md` (pacote oficial do Google; o nome `designmd`
  funciona também no Windows, onde `npx @google/design.md` abre o arquivo em vez de rodar e não mostra nada).
  Sem poder baixar pacotes do npm, confira a forma pelo modelo e diga que não validou.

## Stack padrão (se o projeto não tiver outra)
shadcn/ui (Radix ou Base UI, nunca os dois na mesma tela) + Tailwind 4 · TanStack Table · React Hook Form + Zod ·
Sonner · cmdk (busca de comandos a partir de ~8 telas) · ícones lucide · react-imask (máscara que não pula o
cursor) · `modelos/br.ts` copiado para `src/lib/br.ts` (CPF, CNPJ com letras, CEP, telefone, placa, dinheiro e
datas, já testados). Componente do shadcn que faltar entra pelo próprio shadcn (`npx shadcn@latest add sheet
dropdown-menu`), sem improvisar com outro. Sem react-imask e sem poder instalar: formate ao sair do campo, nunca a
cada tecla.

## O que separa sistema bom de sistema excelente
| Situação | Faça |
|---|---|
| Lista vazia | Dois casos com texto e ação próprios. Primeiro uso: diga o que vai aparecer ali e ofereça criar ("Cadastrar cliente"). Busca ou filtro sem resultado: repita o termo e o filtro e ofereça "Limpar filtros". |
| Erro de campo | Ao lado do campo, dizendo como corrigir ("Digite os 14 caracteres do CNPJ"), não só "inválido". Erro que volta do servidor (documento já cadastrado) também vai no campo, não só no aviso que some. Ao enviar com erro, o foco vai para o primeiro campo errado. |
| Formulário com mais de ~6 campos | Página própria ou painel lateral (Sheet), não janela modal. Campos em grupos com título (Dados, Contato, Endereço). Sair ou fechar com algo digitado pede confirmação. |
| Endereço | CEP primeiro: `buscarCep` preenche logradouro, bairro, cidade e UF; número e complemento à mão. Campos separados (nota fiscal e frete exigem). CEP não achado ou busca que falha: aviso embaixo do CEP e a pessoa digita; nunca trava. `autocomplete` em cada campo (`postal-code`, `address-line1`, `tel`, `email`). |
| Documento, telefone, dinheiro, data | Máscara do react-imask; guarde o valor limpo. CNPJ aceita letras desde julho de 2026 (nada de `\d` nem `replace(/\D/g, '')` nele). Dinheiro em centavos inteiros, alinhado à direita. Data `dd/mm/aaaa`, sem `new Date("AAAA-MM-DD")` (vira o dia anterior no Brasil). |
| Ação que dá para desfazer (inativar, arquivar, mover) | Faça na hora e mostre "Desfazer" no aviso por ~6 s; se o servidor recusar, volte a tela como estava e diga o motivo. AlertDialog só para o irreversível (excluir de vez, cancelar nota, enviar ao cliente), com o nome do item e o verbo no botão ("Excluir pedido 1042"). |
| Situação (ativo, pago, pendente) | O estado normal fica discreto (texto ou selo neutro); cor só no que pede atenção (vencido, bloqueado), sempre com a palavra. |
| Lista e tabela | Busca, filtros, ordem e página na URL (voltar e recarregar mantêm). Contagem ("12 de 340 clientes"). Ordem padrão útil (nome A–Z com `compararNomes`, ou mais recente). Mais de ~50 linhas: paginação no servidor. Cabeçalho fixo; número à direita com `tabular-nums`; ações da linha num menu "⋯" com nome acessível. Seleção em lote (caixa por linha + barra de ações) quando a tarefa repete a mesma ação em vários registros. No celular: lista de consulta vira cartões; tabela de comparar colunas mantém as 2–3 colunas que decidem e rola na horizontal dentro dela, com a primeira coluna fixa. |
| Carregando e salvando | Esqueleto com o formato do conteúdo, só depois de ~300 ms (não pisca). Botão que salva fica ocupado e ignora o segundo clique. |
| Textos | Botão com verbo e objeto ("Salvar cliente"). Sem frase de enfeite ("Preencha os dados abaixo"). Maiúscula só no início. Número, moeda e data no formato brasileiro. |
| Densidade | Uso diário no computador: linha de 40 px (32 px em tabela grande); toque no celular: alvo de 44 px. Definida no DESIGN.md e igual em todo o sistema. |

## Acabamento
- Uma cor de destaque por tela (ação principal, seleção, foco); o resto em neutros com leve matiz.
- Hierarquia por tamanho, peso e cor do texto, não por caixas: nada de cada bloco num cartão com borda e sombra.
- Escala de 4 px; a mesma relação tem sempre a mesma distância (rótulo e campo, campo e campo, seção e seção).
- Cabeçalho de página igual em todas: título à esquerda, ação principal à direita, filtros logo abaixo.
- Ícone de um conjunto só, 16 px, onde ajuda a achar (menu, situação), não em todo botão.
- Sem degradê, brilho, vidro fosco, emoji ou animação de entrada em tela de trabalho; retorno de clique em até
  200 ms. Modo escuro só se o DESIGN.md pedir, com todo token nas duas versões.

## Regras que a máquina confere
O `DESIGN.md` é para pessoas; o `design-sistemas.json` (raiz do projeto) diz o mesmo para a máquina. Escreva pelo
exemplo `modelos/design-sistemas.json`, na forma do `esquema-config.json`. Cada critério, com id, nível ("nunca
passa", "exige justificativa", "aviso") e quem confere, está em `referencias/regua-telas.md`. Sem a configuração,
nada sai "aprovado completo".
Conferir o código (só lê): `node <pasta desta skill>/scripts/consistencia.mjs src --config design-sistemas.json`
(saída 0 passou, 1 reprovou, 2 não conferido: nunca diga "passou" com 2).
Conferir no navegador (layout, letra, toque, contraste, nomes, estados e prints), com o sistema rodando:
`node <pasta desta skill>/scripts/conferir-tela.mjs --config design-sistemas.json --base <url> [pasta-saida] [--telas a,b] [--json]`
(mesmas saídas). Ele usa o motor do Chrome do plugin `landing-pages`: sem esse plugin (ou sem Chrome) sai 2 e a
tela é entregue como "não conferida", nunca como pronta. Exceção que tem de valer no navegador pede `id` no
elemento: o seletor que o conferidor gera usa `#id` ou tags com posição, que mudam quando a tela muda.
- **Peças base obrigatórias:** campo, botão, cabeçalho de tela, cabeçalho de tabela e estados, cada uma num arquivo
  declarado em `pecas`. Tela não usa `<input>`, `<button>`, `<select>` ou `<th>` à mão; o desvio só com exceção
  registrada (`{regra, arquivo, local, motivo}`).
- **Letra em escala fechada:** até 5 tamanhos com nome; títulos em 3 níveis (página, seção, grupo); mínimo 12 px no
  computador e 16 px no celular em campo em que se digita (botão com `role="combobox"` segue os 12 px); nada de `text-[Npx]`.
- **Espaço na escala de 4 px**, sem valor arbitrário (`p-[13px]`).
- **Um raio por superfície** (controle, cartão, janela, selo); sombra só no que flutua (menu, janela, aviso).
- **Cores por função** (fundo, texto, destaque, erro...) como tokens; cor com sentido no negócio fica em
  `cores.negocio`, com o motivo. Paleta crua (`bg-red-500`) e hexadecimal na tela reprovam.
- **Aviso que some só para resultado de ação** ("Cliente salvo"); erro de campo fica no campo.
- **`outline-none` só com foco substituto** (`focus-visible:` na mesma lista de classes).
- **Tela de até ~400 linhas**; passando disso, divida em partes.
- **Tabela no celular:** cartões para consulta; para comparar colunas, primeira coluna fixa e rolagem só dentro da
  tabela.

## Fluxo de uma tela
1. **Tarefa:** em uma frase, o que a pessoa faz nesta tela e com que frequência. Painel de indicadores segue a
   `dashboard-design` (uma pergunta por tela, números honestos). Liste as 3 tarefas mais comuns e quantos passos
   cada uma pode levar (ex.: "achar cliente pelo CNPJ e abrir: 2 passos"); a revisão (passo 5) faz as três só com
   teclado e confere que cabem nesse número e que voltar da tela de detalhe mantém busca e filtros.
2. **DESIGN.md:** leia (ou crie, como acima).
3. **Construa** com a stack e a tabela acima. Dados de exemplo cobrindo todos os estados; em desenvolvimento
   (`import.meta.env.DEV`), um jeito de forçar cada um (ex.: `?estado=vazio|erro|lento`).
4. **Estados:** carregando, vazio (os dois), erro com "Tentar de novo", parcial, salvando, sucesso e sem
   permissão quando houver login.
5. **Revise com os olhos:** prints de cada estado em 1440×900 e 390×844 (navegador do app ou puppeteer do
   projeto) e olhe cada um; passe o teclado (Tab percorre na ordem, Enter envia, Esc fecha, foco visível). Leia os
   arquivos mexidos contra `baseline-ui` e `fixing-accessibility` e corrija cada violação citada.
6. **Registre** no DESIGN.md o padrão novo ou o desvio, com o motivo.

## Melhorar um sistema que já existe
Siga a `improve-ui` até a tabela de achados (passos 1 a 5: no máximo três, cada um com prova). Ela só audita;
quem aplica é esta skill, nos achados que o usuário escolher ou no "Improve first", se ele pediu para seguir
sozinho. Sem DESIGN.md, reconstrua antes com `create-design-md`.

## Consultoras (ler o SKILL.md delas só na hora; quem decide é esta skill)
| Consultora | Quando |
|---|---|
| `dashboard-design` | Painel, indicadores, gráficos, comparação de período (com `references/`) |
| `baseline-ui` | Revisão de cada tela; aqui vale o "sem animação sem pedido", ao contrário das landing pages |
| `fixing-accessibility` | Formulário, janela, menu, tabela com ações; revisão final |
| `create-design-md` | Reconstruir o DESIGN.md de projeto existente |
| `improve-ui` | Auditar tela existente sem trocar a identidade |

Conflito: o DESIGN.md do projeto vence o estilo da casa da `dashboard-design`; o gosto declarado do usuário vence
os dois; a tabela desta skill vence as consultoras. O "Wordless" da `dashboard-design` vale para a tela, mas
explicação de que a pessoa precisa para decidir não fica só em tooltip (toque e leitor de tela não veem): vai num
texto curto visível ou numa linha de ajuda.

## Erros comuns (vistos em teste sem esta skill)
- "Nenhum cliente encontrado." igual para primeiro uso e para busca sem resultado, sem ação.
- `toast.error("Já existe um cliente com este CPF/CNPJ")` em vez de erro no campo.
- Formulário de 10 campos em `Dialog` com `max-h-[90vh] overflow-y-auto`: no celular o teclado cobre, e um toque
  fora apaga tudo.
- CNPJ validado só com algarismos: recusa CNPJ novo, válido.
- `Badge` cheio em todo "Ativo": a tela inteira chama atenção e nada se destaca.
- AlertDialog para inativar (reversível) em vez de "Desfazer".
- Máscara com `replace` a cada tecla: editar no meio joga o cursor para o fim.
- Busca e filtro só em `useState`: somem ao voltar da tela do cliente.
