// Cole/rode no console da página de referência (javascript_tool). Devolve o "DNA técnico" do site.
(() => {
  const cs = (el) => (el ? getComputedStyle(el) : null)
  const pegar = (sel) => {
    const el = document.querySelector(sel)
    const s = cs(el)
    return s
      ? { fonte: s.fontFamily.split(',')[0].replace(/["']/g, ''), tamanho: s.fontSize, peso: s.fontWeight, entrelinha: s.lineHeight, caixa: s.textTransform, espacamento: s.letterSpacing }
      : null
  }
  const cores = {}
  const somar = (c, peso) => {
    if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return
    cores[c] = (cores[c] || 0) + peso
  }
  document.querySelectorAll('body, section, header, footer, main > div, div[class]').forEach((el) => {
    const r = el.getBoundingClientRect()
    somar(cs(el).backgroundColor, (r.width * r.height) / 1e4)
  })
  document.querySelectorAll('h1, h2, h3, p, a, li').forEach((el) => somar(cs(el).color, 1))
  const fontes = {}
  document.querySelectorAll('h1, h2, h3, p, a, button, li, span').forEach((el) => {
    const f = cs(el).fontFamily.split(',')[0].replace(/["']/g, '')
    fontes[f] = (fontes[f] || 0) + 1
  })
  const raios = {}
  document.querySelectorAll('img, button, a, div').forEach((el) => {
    const r = cs(el).borderRadius
    if (r && r !== '0px') raios[r] = (raios[r] || 0) + 1
  })
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${Math.round(v)})`)
  return {
    url: location.href,
    titulo: document.title,
    h1: pegar('h1'),
    h2: pegar('h2'),
    texto: pegar('p'),
    fontes: top(fontes, 5),
    cores: top(cores, 8),
    raios: top(raios, 4),
    secoes: document.querySelectorAll('section').length,
    imagens: document.images.length,
    videos: document.querySelectorAll('video').length,
    alturaPagina: document.documentElement.scrollHeight,
  }
})()
