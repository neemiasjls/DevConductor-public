// node buscar.mjs <rotulo> "<busca1>" "<busca2>" ... → <rotulo>.json + miniaturas <rotulo>-NN.jpg
import fs from 'node:fs'
const [rotulo, ...buscas] = process.argv.slice(2)
const vistos = new Set(), lista = []
for (const q of buscas) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  Object.entries({ action: 'query', format: 'json', generator: 'search', gsrsearch: q + ' filetype:bitmap', gsrnamespace: 6, gsrlimit: 50,
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: 360 }).forEach(([k, v]) => u.searchParams.set(k, v))
  const d = await (await fetch(u, { headers: { 'User-Agent': 'DevConductor-prova/1.0 (demo)' } })).json()
  for (const p of Object.values(d.query?.pages || {})) {
    const i = p.imageinfo[0], m = i.extmetadata || {}
    const lic = m.LicenseShortName?.value || '?'
    if (!/^(cc0|cc by [234]\.0|cc by-sa [34]\.0|public domain)$/i.test(lic.trim())) continue
    if (Math.max(i.width, i.height) < 2000 || vistos.has(p.title)) continue
    if (/wellcome|etching|drawing|lithograph|painting|DPLA|HABS|19[0-7]\d|tif/i.test(p.title)) continue
    vistos.add(p.title)
    lista.push({ n: lista.length + 1, titulo: p.title.replace('File:', ''), licenca: lic, licencaUrl: m.LicenseUrl?.value || '',
      autor: (m.Artist?.value || '').replace(/<[^>]+>/g, '').trim(), largura: i.width, altura: i.height,
      original: i.url, pagina: i.descriptionurl, mini: i.thumburl })
  }
}
fs.writeFileSync(rotulo + '.json', JSON.stringify(lista, null, 1))
for (const f of lista) {
  const r = await fetch(f.mini, { headers: { 'User-Agent': 'DevConductor-prova/1.0 (demo)' } })
  if (r.ok) fs.writeFileSync(`${rotulo}-${String(f.n).padStart(2, '0')}.jpg`, Buffer.from(await r.arrayBuffer()))
}
console.log(rotulo, lista.length)
