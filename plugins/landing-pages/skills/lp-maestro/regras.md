# Regras da fábrica de landing pages

Regras confirmadas pelo usuário (vieram da memória do projeto original, LP-03 a LP-10, das decisões
DEV-08, DEV-34 e DEV-42 do DevConductor, do piloto de uma transportadora, LP-11, e do retorno sobre os sites
de exemplo de 04/11/2026, LP-12). Valem em qualquer projeto que use este plugin. Preferência registrada na
memória do projeto atual vale sobre estas.

| ID | Regra |
|---|---|
| LP-03 | Produto: **landing page** para negócio local (não é sistema, painel ou gestão). Quando o negócio tem equipe, a página é do **negócio**; o dono entra como argumento de confiança. |
| LP-04 | Venda com demonstração: publicar antes de vender, em subdomínio grátis do Cloudflare Pages, com `noindex`. Se o cliente comprar, ele compra o domínio. Fotos de terceiros só na demo até o dono aprovar. |
| LP-05 | Fotos do Instagram: só as melhores, pelo navegador e sem login. Nunca interagir, abrir destaques ou outros perfis. |
| LP-06 | Tarefa grande (site novo): coletar e pesquisar antes, apresentar plano, construir só depois do OK. |
| LP-07 | Paleta vem do espaço físico e das fotos reais do cliente, reinterpretada. Fotos reais; render 3D só como referência. |
| LP-08 | Nada com cara de IA (fontes, cores e estruturas padrão de IA). Uma skill por etapa. Cada cliente pode ter versões (`site`, `site-2`...) lado a lado; versão nova nunca apaga a anterior. |
| LP-09 | Layout com intenção: pode variar de seção para seção (grade, sobreposição, tela cheia, horizontal) desde que leia bem. **Celular equivalente ao computador** (360–414px): ajustar câmera, tamanho e densidade antes de cortar uma cena. Avaliação curta junto da seção certa, não em cartões. Rodapé completo (WhatsApp, Instagram, telefone, mapa, horários). |
| LP-10 | Só skills e projetos famosos (milhares de estrelas); avisar quando algo for pouco conhecido. Consultoras travadas: só a `lp-*` da etapa lê. Uma dona por decisão. |
| LP-11 | Nada com cara de desenho infantil (mascote, ícone fofo, clip-art). Veículo, produto ou cenário em 3D ou foto só entram se parecerem reais. **O tom varia por nicho:** sério e contido para transportadora, advocacia, saúde, indústria; ousado, colorido e lúdico permitido para salão, restaurante, academia, eventos, moda. |
| DEV-08 | Em landing page, o `lp-maestro` conduz as etapas; o método superpowers entra só no código da construção (plano, verificação). |
| DEV-34 | **Orçamento de movimento** (substitui o limite de 1–2 cenas da DEV-11): o site é animado do começo ao fim, com cenas grandes (quantas, DEV-42) e layout que pode variar. Limites que ficam: desempenho (rolagem fluida em celular médio) e movimento reduzido sem esconder conteúdo. A cota "técnica diferente em cada seção" saiu (DEV-42). |
| DEV-42 | **Cenas fortes + resto discreto** (04/11/2026): a quantidade de cenas grandes sai do projeto, não de uma cota. Cada uma mostra um fato do negócio que o visitante entende sem legenda (ex.: cadeira 3D real que gira, porta do baú que abre). Ponto de partida pelo tom (LP-11), não regra: sério (advocacia, contabilidade) 0–1; padrão (barbearia, transporte) 1–3; marca imersiva (estúdio, evento) pode passar de 3 se o celular seguir fluido. Inventar cena para chegar a um número é o erro a evitar; faltar motivo para uma cena é motivo para ter menos. E, nas seções de leitura (serviços, preços, contato), movimento discreto e consistente: entradas curtas do ritmo do estilo, uma vez, variando por tipo de conteúdo (texto, foto, lista), nunca o mesmo "sobe e aparece" em tudo. Sem cota de técnicas ou de famílias. Todo efeito passa no **teste do porquê** (`lp-cenas`); se falhar, sai. |
| LP-12 | **Clareza primeiro** (04/11/2026): uma ideia por tela. Título até ~8 palavras, apoio até ~25, no máximo um título + um apoio + uma chamada por tela (serviços, perguntas e rodapé são seções de leitura e podem mais). Cena entendida sem ler legenda em ~3 s, com no máximo 4 rótulos visíveis ao mesmo tempo. **Mostrar, não explicar**: objeto ou foto real com um gesto vence diagrama didático; esquema ou infográfico só entra se o visitante precisar dele para decidir. A ideia central aparece na abertura, numa cena grande e no fechamento, não em toda seção. Os números são ponto de partida do kit (derivados de NN/g), não lei: estourar exige motivo no plano. |

Só fato confirmado pelo cliente vai para o site (números, clientes, anos). O que faltar fica marcado
"a definir"; citar cliente de outra empresa só com autorização.
