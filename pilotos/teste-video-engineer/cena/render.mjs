// Cena de teste: vaso de ceramica, tigela e anel de latao numa bancada, luz de janela que desliza
// e camera em vai e vem lento. 120 quadros a 24 fps = 5 s, em laco (o quadro 120 seria igual ao 0).
// Uso: node cena/render.mjs --w 640 --h 360 --spp 64 --frames 0-119 --out saida/previa
import fs from 'node:fs';
import path from 'node:path';
import { PathTracer } from '../motor/skills/code-based-films/engine/src/host.mjs';
import { Scene } from '../motor/skills/code-based-films/engine/src/scene.mjs';
import * as G from '../motor/skills/code-based-films/engine/src/geom.mjs';

const arg = (nome, padrao) => { const i = process.argv.indexOf(`--${nome}`); return i > 0 ? process.argv[i + 1] : padrao; };
const W = +arg('w', 640), H = +arg('h', 360), SPP = +arg('spp', 64);
const [A, B] = arg('frames', '0-119').split('-').map(Number);
const OUT = arg('out', 'saida/previa');
const TOTAL = 120;

// curva suave (Catmull-Rom) pelos pontos de controle [raio, altura]
function suavizar(pts, passos = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < passos; k++) {
      const t = k / passos, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([Math.max(0, f(p0[0], p1[0], p2[0], p3[0])), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// solido de revolucao em torno de Y; o perfil anda "de cima para baixo" pelo lado de fora
function torno(controle, segmentos = 160) {
  const perfil = suavizar(controle);
  const pos = [], nrm = [], uv = [], idx = [];
  const n = perfil.length;
  for (let r = 0; r < n; r++) {
    const a = perfil[Math.max(0, r - 1)], b = perfil[Math.min(n - 1, r + 1)];
    let dr = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dr, dy) || 1; dr /= l; dy /= l;
    const nr = -dy, ny = dr;
    for (let s = 0; s <= segmentos; s++) {
      const ph = (s / segmentos) * Math.PI * 2, c = Math.cos(ph), si = Math.sin(ph);
      pos.push(c * perfil[r][0], perfil[r][1], si * perfil[r][0]);
      nrm.push(c * nr, ny, si * nr);
      uv.push(s / segmentos, r / (n - 1));
    }
  }
  const linha = segmentos + 1;
  for (let r = 0; r < n - 1; r++) for (let s = 0; s < segmentos; s++) {
    const a = r * linha + s, b = a + linha;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), uvs: new Float32Array(uv), indices: new Uint32Array(idx) };
}

const VASO = torno([
  [0, 0.10], [0.05, 0.10], [0.075, 0.16], [0.06, 0.24], [0.042, 0.30], [0.046, 0.318], [0.052, 0.322],
  [0.058, 0.316], [0.052, 0.29], [0.07, 0.23], [0.105, 0.14], [0.095, 0.05], [0.07, 0.008], [0.06, 0], [0, 0],
]);
const TIGELA = torno([
  [0, 0.018], [0.06, 0.02], [0.105, 0.045], [0.125, 0.078], [0.129, 0.082], [0.133, 0.078],
  [0.115, 0.04], [0.07, 0.006], [0.05, 0], [0, 0],
]);
const ANEL = G.torus(0.045, 0.009, { segments: 160, sides: 48 });
const BANCADA = G.box([4, 0.1, 2.4]);
const PAREDE = G.box([6, 3, 0.1]);

function cena(i) {
  const u = (i / TOTAL) * Math.PI * 2;                   // fase do laco
  const s = new Scene({ width: W, height: H, spp: SPP, maxBounces: 8, post: { tonemap: 'agx', exposure: -0.15 } });
  const pedra = s.material({ baseColor: [0.085, 0.08, 0.078], roughness: 0.42, bump: 0.25, bumpScale: 22,
    procedural: { type: 'noise', scale: 3.2, contrast: 2.2, threshold: 0.5, color2: [0.14, 0.13, 0.125], roughness2: 0.62, metallic2: 0 } });
  const reboco = s.material({ baseColor: [0.62, 0.56, 0.5], roughness: 0.92, bump: 0.35, bumpScale: 9 });
  const ceramica = s.material({ baseColor: [0.86, 0.82, 0.74], roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.12,
    subsurface: 0.25, bump: 0.08, bumpScale: 60 });
  const esmalte = s.material({ baseColor: [0.07, 0.11, 0.12], roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05 });
  const latao = s.material({ baseColor: [0.95, 0.72, 0.36], metallic: 1, roughness: 0.24 });

  s.instance(s.mesh(BANCADA, { materials: [pedra], name: 'bancada' }), { position: [0, -0.05, 0] });
  s.instance(s.mesh(PAREDE, { materials: [reboco], name: 'parede' }), { position: [0, 1.4, -1.15] });
  s.instance(s.mesh(VASO, { materials: [ceramica], name: 'vaso' }), { position: [-0.08, 0, 0] });
  s.instance(s.mesh(TIGELA, { materials: [esmalte], name: 'tigela' }), { position: [0.3, 0, -0.06] });
  s.instance(s.mesh(ANEL, { materials: [latao], name: 'anel' }), { position: [0.1, 0.009, 0.24], rotation: [0, 20, 0] });

  // "janela" a esquerda que desliza devagar: as sombras andam pela bancada e pela parede
  s.light({ type: 'rect', position: [-1.7 + 0.35 * Math.cos(u), 1.25, 0.9 + 0.25 * Math.sin(u)], target: [0, 0.18, 0],
    size: [0.7, 1.1], color: [1, 0.84, 0.64], intensity: 26, spread: 55 });
  // recorte frio por tras, fora do quadro
  s.light({ type: 'rect', position: [1.5, 0.9, -0.8], target: [0, 0.2, 0], size: [0.5, 0.9], color: [0.62, 0.74, 1], intensity: 5, visible: false });
  s.env({ type: 'color', color: [0.035, 0.04, 0.05], intensity: 1 });

  const ang = (18 + 9 * Math.sin(u)) * Math.PI / 180;    // vai e vem de 9 graus
  const raio = 1.75 - 0.07 * Math.cos(u);
  s.camera({ position: [Math.sin(ang) * raio, 0.34 + 0.02 * Math.cos(u), Math.cos(ang) * raio], target: [0.1, 0.15, 0],
    focalLength: 55, fstop: 2.8, focusTarget: [-0.08, 0.2, 0.1] });
  return s;
}

fs.mkdirSync(OUT, { recursive: true });
const nome = (i) => path.join(OUT, `f_${String(i).padStart(4, '0')}.png`);
const t0 = Date.now();
const pt = await PathTracer.launch({ log: (m) => { if (/adapter|error|fail|pipelines/i.test(m)) console.log(m); } });
console.log(`placa: ${JSON.stringify(pt.adapter)}  ${W}x${H} ${SPP} spp  quadros ${A}-${B}`);
const tempos = [];
try {
  for (let i = A; i <= B; i++) {
    if (fs.existsSync(nome(i))) continue;                 // retomavel
    const st = await pt.render(cena(i), { out: nome(i) });
    tempos.push({ i, renderMs: st.renderMs, wallMs: st.wallMs, spp: st.spp, tris: st.triangles });
    if (tempos.length <= 3 || i % 20 === 0) console.log(`quadro ${i}: ${st.spp} spp, render ${(st.renderMs / 1000).toFixed(2)} s, total ${(st.wallMs / 1000).toFixed(2)} s, ${st.triangles} tris`);
  }
} finally { await pt.close(); }
const soma = tempos.reduce((a, t) => a + t.wallMs, 0);
const resumo = { largura: W, altura: H, spp: SPP, quadros: tempos.length, segundosTotal: +((Date.now() - t0) / 1000).toFixed(1),
  segundosPorQuadro: tempos.length ? +(soma / tempos.length / 1000).toFixed(2) : 0, placa: pt.adapter };
fs.writeFileSync(path.join(OUT, 'tempos.json'), JSON.stringify({ resumo, tempos }, null, 1));
console.log(JSON.stringify(resumo));
