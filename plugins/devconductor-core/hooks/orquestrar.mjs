// Lembrete de uma linha no começo da sessão: decidir antes de gastar (skill orquestrador, DEV-27/DEV-29).
// Fica curto de propósito: entra em toda sessão. O detalhe está na skill, que só carrega quando usada.
// Pedido pequeno e fechado não carrega a skill: o ensaio controlado de 20/10 mostrou que nele ela só soma leitura.
console.log('DevConductor: pedido pequeno e fechado (diz o quê e onde, cabe em poucas chamadas) vai direto, sem carregar a ' +
  'skill nem dizer ficha. Pedido grande, aberto ou com várias partes: use a skill orquestrador antes de agir. ' +
  'Conversa longa ou assunto novo → sessão nova.')
