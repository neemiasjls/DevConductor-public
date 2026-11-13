// Busca referências de sites animados por categoria do negócio e monta uma galeria local para o usuário escolher.
// Uso: node buscar-referencias.mjs <categoria> [--saida <pasta>] [--paginas N] [--so-animados]
//        [--recomendados <arquivo.json>] (bloco no topo; [{"n":114,"motivo":"..."}]; usa <saida>/recomendados.json se existir)
//        [--so-montar] (refaz só a galeria.html a partir do referencias.json da pasta, sem buscar)
//      node buscar-referencias.mjs --categorias
// Saída: <pasta>/referencias.json e <pasta>/galeria.html (padrão: referencias/<categoria>/ na pasta atual).
// Lê só fontes cujo robots.txt e termos permitem leitura (conferido em 09/11/2026); as demais entram como link
// para abrir à mão. Nada é baixado: a galeria aponta para a miniatura da própria fonte, com crédito.
// Bloqueio (401/403/429) encerra a fonte: não tentar por outro caminho.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const AGENTE = 'DevConductor-lp-referencias/1.0 (galeria de referencias para estudo)'

// Termos por categoria. awwwards = /websites/<slug>/, lapa = /category/<slug>/, opl = /tag|genre/<slug>,
// github = buscas de modelo com licença aberta (base de código), extra = termo em inglês para os links manuais.
// Lista vazia = a fonte não tem página para essa categoria (conferido em 10/11/2026: 404); não inventar caminho.
export const CATEGORIAS = {
  salao: { nome: 'Salão de beleza', awwwards: ['health-beauty', 'fashion'], lapa: ['beauty', 'fashion'], opl: ['tag/beauty', 'tag/hair'], github: ['beauty salon', 'hair salon'], extra: 'beauty salon' },
  barbearia: { nome: 'Barbearia', awwwards: ['health-beauty', 'fashion'], lapa: ['beauty', 'lifestyle'], opl: ['tag/hair', 'tag/beauty'], github: ['barber', 'barbershop'], extra: 'barber' },
  estetica: { nome: 'Estética e spa', awwwards: ['health-beauty'], lapa: ['beauty', 'wellness'], opl: ['tag/beauty'], github: ['spa', 'skincare'], extra: 'spa' },
  transporte: { nome: 'Transporte e logística', awwwards: ['business-corporate', 'technology'], lapa: ['automotive', 'business', 'corporate'], opl: ['genre/service'], github: ['logistics', 'trucking'], extra: 'logistics' },
  restaurante: { nome: 'Restaurante e café', awwwards: ['hotel-restaurant', 'food-drink'], lapa: ['food-drinks'], opl: ['genre/restaurant'], github: ['restaurant', 'cafe'], extra: 'restaurant' },
  clinica: { nome: 'Clínica e saúde', awwwards: ['health-beauty'], lapa: ['health', 'wellness'], opl: ['genre/service'], github: ['clinic', 'dental'], extra: 'clinic' },
  academia: { nome: 'Academia e esporte', awwwards: ['sports'], lapa: ['health-fitness', 'sports'], opl: ['genre/sport'], github: ['gym', 'fitness'], extra: 'gym' },
  arquitetura: { nome: 'Arquitetura e interiores', awwwards: ['architecture'], lapa: ['architecture', 'furniture-interiors'], opl: ['genre/portfolio'], github: ['architecture', 'interior design'], extra: 'architecture' },
  imobiliaria: { nome: 'Imobiliária', awwwards: ['real-estate'], lapa: ['real-estate'], opl: ['genre/service'], github: ['real estate'], extra: 'real estate' },
  moveis: { nome: 'Móveis planejados e marcenaria', awwwards: ['furniture-interiors', 'furniture'], lapa: ['furniture-interiors'], opl: ['tag/furniture', 'tag/interior-design'], github: ['furniture', 'interior design'], extra: 'furniture interior' },
  eventos: { nome: 'Eventos, buffet e casamento', awwwards: ['events', 'catering'], lapa: [], opl: ['genre/event'], github: ['event venue', 'catering'], extra: 'event venue' },
  noivas: { nome: 'Vestidos de noiva e moda de casamento', awwwards: ['bridal', 'wedding'], lapa: [], opl: ['genre/wedding'], github: ['wedding', 'bridal'], extra: 'bridal wedding dress' },
  odontologia: { nome: 'Clínica odontológica e implantes', awwwards: ['dental', 'dentist'], lapa: [], opl: ['tag/dentist'], github: ['dental clinic', 'dentist'], extra: 'dental' },
  pet: { nome: 'Veterinária e pet shop', awwwards: ['pets', 'veterinary'], lapa: [], opl: ['tag/pets'], github: ['pet shop', 'veterinary'], extra: 'pet veterinary' },
  moda: { nome: 'Moda e loja', awwwards: ['fashion', 'e-commerce'], lapa: ['fashion', 'ecommerce'], opl: ['genre/e-commerce'], github: ['fashion store'], extra: 'fashion' },
}

// Etiquetas da Awwwards que dizem o tipo de movimento.
const MOVIMENTO = /^(animation|scrolling|webgl|3d|gsap|three\.js|transitions|parallax|microinteractions|storytelling|video|motion|lottie|locomotive scroll|interaction design|gestures-interaction)$/i

export const FONTES = {
  awwwards: { nome: 'Awwwards', tipo: 'site premiado', site: 'https://www.awwwards.com', url: (s, p) => `https://www.awwwards.com/websites/${s}/${p > 1 ? `?page=${p}` : ''}` },
  lapa: { nome: 'Lapa Ninja', tipo: 'landing page', site: 'https://www.lapa.ninja', url: (s, p) => `https://www.lapa.ninja/category/${s}/${p > 1 ? `page/${p}/` : ''}` },
  opl: { nome: 'One Page Love', tipo: 'site de uma página (vídeo)', site: 'https://onepagelove.com', url: (s, p) => `https://onepagelove.com/${s}${p > 1 ? `/page/${p}` : ''}` },
  github: { nome: 'GitHub (modelo aberto)', tipo: 'modelo com licença aberta', site: 'https://github.com',
    url: (termo, p, licenca) => `https://api.github.com/search/repositories?q=${encodeURIComponent(`${termo} landing in:name,description,topics license:${licenca}`)}&sort=stars&per_page=30&page=${p}` },
}
const LICENCAS_GITHUB = ['mit', 'apache-2.0']

// Fontes que proíbem robô ou coleta: só link para o usuário abrir (motivo registrado na skill).
export function linksManuais(cat) {
  const t = encodeURIComponent(CATEGORIAS[cat].extra)
  return [
    { nome: 'Godly', url: `https://godly.website/?q=${t}`, motivo: 'robots.txt bloqueia o robô do Claude' },
    { nome: 'Land-book', url: `https://land-book.com/search?q=${t}`, motivo: 'termos proíbem coleta de dados' },
    { nome: 'Lapa Ninja', url: CATEGORIAS[cat].lapa[0] ? `https://www.lapa.ninja/category/${CATEGORIAS[cat].lapa[0]}/` : 'https://www.lapa.ninja', motivo: 'permite robô, mas respondeu 403 ao script em 09/11/2026: abrir no navegador' },
    { nome: 'SiteInspire', url: `https://www.siteinspire.com/websites?search=${t}`, motivo: 'responde 429 a robô' },
    { nome: 'Minimal Gallery', url: `https://minimal.gallery/?s=${t}`, motivo: 'termos proíbem raspar' },
    { nome: 'CSS Design Awards', url: 'https://www.cssdesignawards.com/website-gallery', motivo: 'termos proíbem copiar conteúdo' },
    { nome: 'Awwwards (busca livre)', url: `https://www.awwwards.com/websites/?text=${t}`, motivo: 'busca por texto fora do robots.txt' },
    { nome: 'Framer Marketplace (modelos)', url: `https://www.framer.com/marketplace/templates/?search=${t}`, motivo: 'modelo só roda dentro do Framer' },
    { nome: 'Made in Webflow', url: 'https://webflow.com/made-in-webflow', motivo: 'modelo só roda dentro do Webflow' },
  ]
}

// Bibliotecas de peças animadas que o Claude instala direto pelo shadcn CLI (testado no Windows em 09/11/2026).
export const PECAS = [
  { nome: 'Aceternity UI (grátis)', url: 'https://ui.aceternity.com/components', instalar: 'npx shadcn@latest add @aceternity/<peça>', licenca: 'licença própria: uso livre em site de cliente; modelos e blocos Pro são pagos' },
  { nome: 'Magic UI', url: 'https://magicui.design/docs/components', instalar: 'npx shadcn@latest add @magicui/<peça>', licenca: 'MIT' },
  { nome: 'React Bits', url: 'https://reactbits.dev', instalar: 'npx shadcn@latest add @react-bits/<peça>', licenca: 'MIT + Commons Clause (não revender a peça)' },
  { nome: 'Motion Primitives', url: 'https://motion-primitives.com', instalar: 'npx shadcn@latest add @motion-primitives/<peça>', licenca: 'MIT' },
  { nome: 'Animata', url: 'https://animata.design', instalar: 'npx shadcn@latest add https://animata.design/r/<grupo>/<peça>.json', licenca: 'MIT' },
  { nome: 'Uiverse', url: 'https://uiverse.io', instalar: 'copiar da página (sem registro)', licenca: 'MIT' },
  { nome: '21st.dev', url: 'https://21st.dev/community/components', instalar: 'pela página de cada peça', licenca: 'varia por autor: conferir na página' },
]

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const desfazer = (s) => String(s ?? '').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

export function lerAwwwards(html) {
  const itens = []
  for (const m of html.matchAll(/data-collectable-model-value="([^"]+)"/g)) {
    let d
    try { d = JSON.parse(desfazer(m[1])) } catch { continue }
    if (d.type !== 'submission' || !d.slug) continue
    const img = d.images?.thumbnail || d.collectableImage
    itens.push({ fonte: 'awwwards', nome: d.title, pagina: `https://www.awwwards.com/sites/${d.slug}`,
      mini: img ? `https://assets.awwwards.com/awards/media/cache/thumb_440_330/${img}` : null,
      etiquetas: (d.tags || []).filter((t) => MOVIMENTO.test(t)) })
  }
  return itens
}

export function lerLapa(html) {
  const itens = []
  // Cada cartão: imagem -thumb e, logo depois, o link do post com o título.
  for (const m of html.matchAll(/<img src="(https:\/\/cdn\.lapa\.ninja\/assets\/images\/1x\/[^"]+-thumb\.[a-z]+)"[\s\S]{0,1500}?<a title="([^"]+)" class="absolute[^"]*" href="(\/post\/[^"]+)"/g)) {
    itens.push({ fonte: 'lapa', nome: desfazer(m[2]), pagina: `https://www.lapa.ninja${m[3]}`, mini: m[1], etiquetas: [] })
  }
  return itens
}

export function lerOnePageLove(html) {
  const itens = []
  for (const bloco of html.split('class="thumb thumb-inspiration"').slice(1)) {
    const pagina = bloco.match(/href="(https:\/\/onepagelove\.com\/[^"]+)" title="([^"]+)"/)
    if (!pagina) continue
    const externo = bloco.match(/class="thumb-link"[\s\S]{0,200}?href="(https?:\/\/(?!onepagelove\.com)[^"?]+)/)
    itens.push({ fonte: 'opl', nome: desfazer(pagina[2]), pagina: pagina[1], site: externo?.[1] || null,
      mini: bloco.match(/poster="([^"]+)"/)?.[1] || bloco.match(/<img[^>]+src="([^"]+)"/)?.[1] || null,
      video: bloco.match(/data-opl-video-src="([^"]+)"/)?.[1] || null, etiquetas: ['vídeo da rolagem'] })
  }
  return itens
}

export function lerGithub(dados, licencaPedida) {
  return (dados.items || []).filter((r) => !r.archived && !r.fork && r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION').map((r) => ({
    fonte: 'github', nome: r.full_name, pagina: r.html_url, site: r.homepage || null,
    mini: `https://opengraph.githubassets.com/1/${r.full_name}`, licenca: r.license.spdx_id || licencaPedida,
    estrelas: r.stargazers_count, descricao: (r.description || '').slice(0, 160), etiquetas: ['base de código'] }))
}

// O mesmo site aparece com o endereço numa fonte e só com o nome em outra: qualquer uma das chaves junta os dois.
// Modelos do GitHub não entram na comparação por nome (nome de repositório não é nome de site).
function chaves(x) {
  const k = []
  try { if (x.site) k.push(`h:${new URL(x.site).hostname.replace(/^www\./, '')}`) } catch { /* endereço ruim: só o nome */ }
  if (x.fonte !== 'github') k.push(`n:${x.nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')}`)
  else k.push(`g:${x.nome}`)
  return k
}

export function deduplicar(itens) {
  const lista = [], indice = new Map()
  for (const x of itens) {
    const ks = chaves(x)
    const achado = ks.map((k) => indice.get(k)).find(Boolean)
    if (!achado) { const novo = { ...x, tambemEm: [] }; lista.push(novo); for (const k of ks) indice.set(k, novo); continue }
    if (achado.fonte !== x.fonte && !achado.tambemEm.includes(x.fonte)) achado.tambemEm.push(x.fonte)
    if (!achado.site && x.site) achado.site = x.site
    if (!achado.video && x.video) achado.video = x.video
    for (const k of ks) if (!indice.has(k)) indice.set(k, achado)
  }
  return lista.map((x, i) => ({ n: i + 1, ...x }))
}

// buscar(url) -> { status, texto }. Injetável para o teste simular a rede.
async function buscarPadrao(url) {
  const r = await fetch(url, { headers: { 'User-Agent': AGENTE, Accept: url.includes('api.github.com') ? 'application/vnd.github+json' : 'text/html' }, signal: AbortSignal.timeout(30_000) })
  return { status: r.status, texto: await r.text() }
}

export async function coletar(categoria, { paginas = 2, buscar = buscarPadrao, pausa = 1200, avisar = () => {} } = {}) {
  const cat = CATEGORIAS[categoria]
  if (!cat) throw Error(`Categoria desconhecida: ${categoria}. Use --categorias.`)
  const espera = () => new Promise((r) => setTimeout(r, pausa))
  const brutos = [], relatorio = {}, paginasVistas = new Set()
  const leitores = { awwwards: lerAwwwards, lapa: lerLapa, opl: lerOnePageLove }
  // Ordem = prioridade na galeria: a etiqueta da One Page Love é a mais fiel ao nicho; a Awwwards traz o volume.
  for (const fonte of ['opl', 'awwwards', 'lapa', 'github']) {
    relatorio[fonte] = { lidos: 0, pedidos: 0, parou: null }
    const alvos = fonte === 'github' ? cat.github.flatMap((t) => LICENCAS_GITHUB.map((l) => [t, l])) : cat[fonte].map((s) => [s])
    fonteLoop: for (const [alvo, licenca] of alvos) {
      for (let p = 1; p <= (fonte === 'github' ? 1 : paginas); p++) {
        const url = FONTES[fonte].url(alvo, p, licenca)
        let r
        try { r = await buscar(url) } catch (e) { avisar(`${fonte}: falhou ${url} (${e.message})`); break }
        relatorio[fonte].pedidos++
        if ([401, 403, 429].includes(r.status)) { relatorio[fonte].parou = `${r.status} em ${url}`; avisar(`${fonte} respondeu ${r.status}: parar esta fonte, sem contornar.`); break fonteLoop }
        if (r.status !== 200) break
        const lidos = fonte === 'github' ? lerGithub(JSON.parse(r.texto), licenca) : leitores[fonte](r.texto)
        // Página que só repete o que já veio (fim da lista ou paginação que volta ao início) encerra o alvo.
        const novos = lidos.filter((x) => !paginasVistas.has(x.pagina))
        for (const x of novos) { paginasVistas.add(x.pagina); brutos.push({ ...x, categoriaFonte: alvo }) }
        relatorio[fonte].lidos += novos.length
        if (pausa) await espera()
        if (!novos.length) break
      }
    }
  }
  const itens = deduplicar(brutos)
  for (const f of Object.keys(relatorio)) relatorio[f].unicos = itens.filter((x) => x.fonte === f).length
  return { categoria, nome: cat.nome, data: new Date().toISOString().slice(0, 10), relatorio, itens, manuais: linksManuais(categoria), pecas: PECAS }
}

export function montarHtml(dados, { soAnimados = false, recomendados = [] } = {}) {
  const itens = soAnimados ? dados.itens.filter((x) => x.etiquetas.length) : dados.itens
  const contagem = Object.entries(dados.relatorio).map(([f, r]) => `<li><b>${esc(FONTES[f].nome)}</b>: ${r.unicos} ${r.parou ? `<em>(parou: ${esc(r.parou)})</em>` : ''}</li>`).join('')
  const cartao = (x, motivo) => `<article class="c" data-n="${x.n}" data-fonte="${esc(x.fonte)}" data-mov="${x.etiquetas.length ? 1 : 0}" data-lic="${x.fonte === 'github' ? 1 : 0}">
<label class="marca"><input type="checkbox" value="${x.n}"><span>${x.n}</span></label>
<a class="prev" href="${esc(x.pagina)}" target="_blank" rel="noopener noreferrer">${x.video ? `<video muted loop playsinline preload="none" poster="${esc(x.mini || '')}" data-src="${esc(x.video)}"></video>` : x.mini ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(x.mini)}" alt="" onerror="this.outerHTML='<div class=sem>sem prévia</div>'">` : '<div class="sem">sem prévia</div>'}</a>
<h3>${esc(x.nome)}</h3>
<p class="meta">${esc(FONTES[x.fonte].tipo)} · ${esc(FONTES[x.fonte].nome)}${x.tambemEm.length ? ` · também em ${esc(x.tambemEm.map((f) => FONTES[f].nome).join(', '))}` : ''}${x.licenca ? ` · licença ${esc(x.licenca)}` : ''}</p>
${x.etiquetas.length ? `<p class="tags">${x.etiquetas.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
${x.descricao ? `<p class="desc">${esc(x.descricao)}</p>` : ''}
<p class="links"><a href="${esc(x.pagina)}" target="_blank" rel="noopener noreferrer">ver na fonte</a>${x.site ? ` · <a href="${esc(x.site)}" target="_blank" rel="noopener noreferrer">${x.fonte === 'github' ? 'demonstração' : 'site original'}</a>` : ''}</p>
${motivo ? `<p class="motivo"><b>Por que serve:</b> ${esc(motivo)}</p>` : ''}
</article>`
  const porN = new Map(dados.itens.map((x) => [x.n, x]))
  const recs = recomendados.filter((r) => porN.has(Number(r.n))).map((r) => cartao(porN.get(Number(r.n)), r.motivo))
  const botoes = Object.keys(dados.relatorio).map((f) => `<button data-f="${f}" aria-pressed="true">${esc(FONTES[f].nome)}</button>`).join('')
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Referências: ${esc(dados.nome)}</title><style>
:root{--f:#f4f3ef;--t:#1d1c1a;--s:#6b6862;--l:#d9d6cf;--a:#1f4fd6}
*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,sans-serif;background:var(--f);color:var(--t)}
header{padding:24px 16px 8px;max-width:1500px;margin:auto}h1{margin:0 0 4px;font-size:28px}
.aviso{color:var(--s);max-width:70ch}ul.cont{display:flex;flex-wrap:wrap;gap:4px 20px;padding:0;list-style:none}
.barra{position:sticky;top:0;z-index:2;background:var(--f);border-bottom:1px solid var(--l);padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
button{font:inherit;border:1px solid var(--l);background:#fff;border-radius:99px;padding:5px 12px;cursor:pointer}
button[aria-pressed=false]{opacity:.45}#copiar{background:var(--t);color:#fff;border-color:var(--t)}
main{max-width:1500px;margin:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.c{position:relative;background:#fff;border:1px solid var(--l);border-radius:10px;overflow:hidden}
.c.on{outline:3px solid var(--a)}.prev{display:block;aspect-ratio:4/3;background:#e8e6e0;overflow:hidden}
.prev img,.prev video{width:100%;height:100%;object-fit:cover;object-position:top;display:block}.sem{display:grid;place-items:center;height:100%;color:var(--s)}
.marca{position:absolute;top:8px;left:8px;z-index:1;background:#fff;border-radius:99px;padding:2px 10px 2px 6px;display:flex;gap:6px;align-items:center;font-weight:700;cursor:pointer}
h3{margin:10px 12px 2px;font-size:16px}.meta,.desc,.links{margin:2px 12px;color:var(--s);font-size:13px}.links{margin-bottom:12px}
.tags{margin:6px 12px;display:flex;flex-wrap:wrap;gap:4px}.tags span{font-size:12px;background:#eef1fb;color:#24408f;border-radius:4px;padding:1px 6px}
.grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}.motivo{margin:2px 12px 12px;font-size:13px}.rec{border-bottom:1px solid var(--l)}button:focus-visible,input:focus-visible{outline:3px solid var(--a);outline-offset:2px}
section{max-width:1500px;margin:auto;padding:8px 16px 32px}section li{margin:4px 0}code{background:#fff;padding:1px 4px;border-radius:4px}
textarea{width:100%;min-height:70px;font:inherit;margin-top:8px}.oculto{display:none}
@media (prefers-reduced-motion:reduce){video{display:none}}
</style></head><body>
<header><h1>Referências: ${esc(dados.nome)}</h1>
<p class="aviso">${itens.length} exemplos (${esc(dados.data)}). Marque um ou mais, escreva o que quer mudar e clique em "Copiar escolhidos" para colar no chat.
Sites com dono servem só para estudar ritmo, composição e movimento; base de código, só modelo com licença aberta.</p>
<ul class="cont">${contagem}</ul></header>
<div class="barra">${botoes}<button id="mov" aria-pressed="false">só com animação marcada</button><span role="group" aria-label="Tipo de referência"><button data-t="todos" aria-pressed="true">todos</button><button data-t="modelo" aria-pressed="false">modelo com licença aberta</button><button data-t="inspiracao" aria-pressed="false">só inspiração</button></span><span id="qtd" role="status"></span><button id="copiar">Copiar escolhidos</button><span id="ok"></span></div>
${recs.length ? `<section class="rec" aria-label="Recomendados"><h2>Recomendados (${recs.length})</h2><div class="grade">${recs.join('\n')}</div></section>` : ''}
<main>${itens.map((x) => cartao(x)).join('\n')}</main>
<section><h2>O que mudar</h2><textarea id="nota" placeholder="Ex.: a abertura do 12 com as cores do salão; menos texto que o 4"></textarea></section>
<section><h2>Abrir à mão (não aceitam leitura automática)</h2><ul>${dados.manuais.map((m) => `<li><a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.nome)}</a>: ${esc(m.motivo)}</li>`).join('')}</ul></section>
<section><h2>Peças animadas para montar (licença aberta)</h2><ul>${dados.pecas.map((p) => `<li><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.nome)}</a>: <code>${esc(p.instalar)}</code> · ${esc(p.licenca)}</li>`).join('')}</ul></section>
<script>
const todos=[...document.querySelectorAll('.c')],cards=[...document.querySelectorAll('main .c')],off=new Set();let soMov=false,tipo='todos'
function filtrar(){let v=0;for(const c of cards){const o=off.has(c.dataset.fonte)||(soMov&&c.dataset.mov!=='1')||(tipo==='modelo'&&c.dataset.lic!=='1')||(tipo==='inspiracao'&&c.dataset.lic==='1');c.classList.toggle('oculto',o);if(!o)v++}document.getElementById('qtd').textContent=v+' à vista'}
for(const b of document.querySelectorAll('[data-t]'))b.onclick=()=>{tipo=b.dataset.t;for(const o of document.querySelectorAll('[data-t]'))o.setAttribute('aria-pressed',o===b);filtrar()}
for(const b of document.querySelectorAll('[data-f]'))b.onclick=()=>{const f=b.dataset.f;off.has(f)?off.delete(f):off.add(f);b.setAttribute('aria-pressed',!off.has(f));filtrar()}
document.getElementById('mov').onclick=e=>{soMov=!soMov;e.target.setAttribute('aria-pressed',soMov);filtrar()}
for(const c of todos){const i=c.querySelector('input');i.onchange=()=>{for(const o of todos)if(o.dataset.n===c.dataset.n){o.querySelector('input').checked=i.checked;o.classList.toggle('on',i.checked)}}
const v=c.querySelector('video');if(v){c.onmouseenter=()=>{if(!v.src)v.src=v.dataset.src;v.play().catch(()=>{})};c.onmouseleave=()=>v.pause()}}
document.getElementById('copiar').onclick=async()=>{const vistos=new Set(),n=todos.filter(c=>c.querySelector('input').checked&&!vistos.has(c.dataset.n)&&vistos.add(c.dataset.n)).map(c=>c.dataset.n+' '+c.querySelector('h3').textContent+' ('+c.querySelector('.links a').href+')')
const t='Referências escolhidas (${esc(dados.nome)}):\\n'+n.join('\\n')+'\\nO que mudar: '+document.getElementById('nota').value
try{await navigator.clipboard.writeText(t);document.getElementById('ok').textContent='copiado'}catch{document.getElementById('nota').value=t}}
filtrar()
</script></body></html>`
}

async function principal(args) {
  if (args.includes('--categorias')) { for (const [k, v] of Object.entries(CATEGORIAS)) console.log(`${k}: ${v.nome}`); return 0 }
  const opc = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
  const categoria = args.find((a, i) => !a.startsWith('--') && !['--saida', '--paginas', '--recomendados'].includes(args[i - 1]))
  const paginas = Number(opc('--paginas') || 2)
  if (!categoria || !CATEGORIAS[categoria] || !(paginas >= 1 && paginas <= 5)) {
    console.error('Uso: node buscar-referencias.mjs <categoria> [--saida pasta] [--paginas 1-5] [--so-animados] [--recomendados arquivo.json] [--so-montar]  (lista: --categorias)')
    return 1
  }
  const saida = path.resolve(opc('--saida') || path.join('referencias', categoria))
  fs.mkdirSync(saida, { recursive: true })
  const jsonRef = path.join(saida, 'referencias.json')
  let dados
  if (args.includes('--so-montar')) {
    if (!fs.existsSync(jsonRef)) { console.error(`--so-montar: falta ${jsonRef}`); return 1 }
    dados = JSON.parse(fs.readFileSync(jsonRef, 'utf8'))
  } else {
    dados = await coletar(categoria, { paginas, avisar: (m) => console.error(m) })
    fs.writeFileSync(jsonRef, JSON.stringify(dados, null, 1))
  }
  const arqRec = opc('--recomendados') ? path.resolve(opc('--recomendados')) : path.join(saida, 'recomendados.json')
  const recomendados = fs.existsSync(arqRec) ? JSON.parse(fs.readFileSync(arqRec, 'utf8')) : []
  if (opc('--recomendados') && !recomendados.length) { console.error(`--recomendados: arquivo vazio ou inexistente: ${arqRec}`); return 1 }
  const arquivo = path.join(saida, 'galeria.html')
  fs.writeFileSync(arquivo, montarHtml(dados, { soAnimados: args.includes('--so-animados'), recomendados }))
  for (const [f, r] of Object.entries(dados.relatorio)) console.log(`${FONTES[f].nome}: ${r.unicos} (lidos ${r.lidos}, pedidos ${r.pedidos}${r.parou ? `, parou: ${r.parou}` : ''})`)
  console.log(`${dados.itens.length} referências únicas. Galeria: ${pathToFileURL(arquivo).href}`)
  return dados.itens.length ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal(process.argv.slice(2)).then((c) => { process.exitCode = c }, (e) => { console.error(e.message); process.exitCode = 1 })
}
