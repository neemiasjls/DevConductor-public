import { useEffect, useRef } from 'react'

// Geada sobre foto (WebGL puro, sem three.js): a foto começa embaçada/congelada e descongela em faixa,
// de baixo para cima, conforme `estado.degelo` vai de 0 a 1; o cursor/toque limpa um círculo.
// Desenha só sob demanda (sem relógio contínuo): quem muda o estado chama `desenhar()`.
// Adaptação da receita lp-cenas/distorcao-imagem (mesmo contrato: foto HTML embaixo, canvas por cima,
// falha de WebGL/foto deixa a foto nítida).

export type EstadoGeada = { degelo: number; mx: number; my: number; limpa: number }

const VERTICE = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAGMENTO = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uFoto;
uniform vec2 uRecorte;
uniform float uAspecto;
uniform float uDegelo;
uniform vec2 uMouse;
uniform float uLimpa;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * ruido(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
vec3 foto(vec2 uv) {
  vec2 t = (uv - 0.5) * uRecorte + 0.5;
  t.y = 1.0 - t.y;
  return texture2D(uFoto, clamp(t, vec2(0.001), vec2(0.999))).rgb;
}
void main() {
  vec2 q = vec2(vUv.x * uAspecto, vUv.y);
  float n = fbm(q * 3.5);
  float cristal = fbm(q * 46.0 + n * 3.0);
  float grao = hash(floor(q * 420.0));
  float veio = smoothstep(0.5, 0.54, cristal) - smoothstep(0.55, 0.6, cristal);
  // Frente de degelo sobe com a rolagem; borda irregular como água escorrendo.
  float borda = uDegelo * 1.3 - 0.15 + (n - 0.5) * 0.22;
  float gelo = smoothstep(borda - 0.05, borda + 0.07, vUv.y);
  vec2 dm = vec2((vUv.x - uMouse.x) * uAspecto, vUv.y - uMouse.y);
  float limpo = (1.0 - smoothstep(0.1, 0.19 + n * 0.05, length(dm))) * uLimpa;
  gelo *= 1.0 - limpo;

  vec2 desvio = (vec2(ruido(q * 40.0), ruido(q * 40.0 + 7.0)) - 0.5) * 0.03 * gelo;
  float r = 0.016 * gelo;
  vec3 borrado = foto(vUv + desvio);
  borrado += foto(vUv + desvio + vec2(r, 0.0));
  borrado += foto(vUv + desvio - vec2(r, 0.0));
  borrado += foto(vUv + desvio + vec2(0.0, r));
  borrado += foto(vUv + desvio - vec2(0.0, r));
  borrado += foto(vUv + desvio + vec2(r, r) * 0.7);
  borrado += foto(vUv + desvio - vec2(r, r) * 0.7);
  borrado += foto(vUv + desvio + vec2(r, -r) * 0.7);
  borrado += foto(vUv + desvio + vec2(-r, r) * 0.7);
  borrado /= 9.0;
  vec3 cor = mix(foto(vUv), borrado, gelo);
  vec3 corGelo = vec3(0.86, 0.91, 0.95);
  cor = mix(cor, corGelo, gelo * (0.4 + 0.2 * cristal + 0.06 * veio + 0.06 * grao));
  float frente = (smoothstep(borda - 0.04, borda, vUv.y) - smoothstep(borda, borda + 0.04, vUv.y)) * (1.0 - limpo);
  cor += frente * 0.05;
  gl_FragColor = vec4(cor, 1.0);
}
`

function compilar(gl: WebGLRenderingContext, tipo: number, fonte: string, criados: WebGLShader[]) {
  const s = gl.createShader(tipo)!
  criados.push(s)
  gl.shaderSource(s, fonte)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s) || 'shader')
  return s
}

export default function Geada({ src, estado, ligar, aoFalhar, dprMax = 1.5 }: {
  src: string
  estado: EstadoGeada
  ligar: (desenhar: (() => void) | null) => void
  aoFalhar: () => void
  dprMax?: number
}) {
  const tela = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = tela.current!
    let gl: WebGLRenderingContext | null = null
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false }) } catch { gl = null }
    if (!gl) { aoFalhar(); return }
    let vivo = true
    let pronto = false
    let aspectoFoto = 1
    // Tudo o que é criado no contexto fica aqui para ser liberado em qualquer saída (falha ou desmontagem).
    const shaders: WebGLShader[] = []
    let programa: WebGLProgram | null = null
    let buf: WebGLBuffer | null = null
    let tex: WebGLTexture | null = null
    const liberar = () => {
      if (!gl || gl.isContextLost()) return
      if (tex) gl.deleteTexture(tex)
      if (buf) gl.deleteBuffer(buf)
      shaders.forEach((s) => { if (programa) gl!.detachShader(programa, s); gl!.deleteShader(s) })
      if (programa) gl.deleteProgram(programa)
      tex = buf = programa = null
      shaders.length = 0
    }
    try {
      programa = gl.createProgram()!
      gl.attachShader(programa, compilar(gl, gl.VERTEX_SHADER, VERTICE, shaders))
      gl.attachShader(programa, compilar(gl, gl.FRAGMENT_SHADER, FRAGMENTO, shaders))
      gl.linkProgram(programa)
      if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw Error('link')
    } catch { liberar(); aoFalhar(); return }
    gl.useProgram(programa)
    buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(programa, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    const prog = programa
    const u = (n: string) => gl!.getUniformLocation(prog, n)
    const uRecorte = u('uRecorte'), uAspecto = u('uAspecto'), uDegelo = u('uDegelo'), uMouse = u('uMouse'), uLimpa = u('uLimpa')

    const desenhar = () => {
      if (!vivo || !pronto || !gl || gl.isContextLost()) return
      const w = canvas.width, h = canvas.height
      const aspTela = w / Math.max(1, h)
      gl.viewport(0, 0, w, h)
      gl.uniform2f(uRecorte, Math.min(1, aspTela / aspectoFoto), Math.min(1, aspectoFoto / aspTela))
      gl.uniform1f(uAspecto, aspTela)
      gl.uniform1f(uDegelo, estado.degelo)
      gl.uniform2f(uMouse, estado.mx, estado.my)
      gl.uniform1f(uLimpa, estado.limpa)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const medir = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, dprMax)
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr))
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      desenhar()
    }
    const ro = new ResizeObserver(medir)
    ro.observe(canvas)

    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (!vivo || !gl) return
      tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      aspectoFoto = img.naturalWidth / img.naturalHeight
      pronto = true
      medir()
      canvas.style.opacity = '1'
      ligar(desenhar)
    }
    img.onerror = () => { if (vivo) aoFalhar() }
    img.src = src

    const perdeu = (e: Event) => { e.preventDefault(); aoFalhar() }
    canvas.addEventListener('webglcontextlost', perdeu)
    return () => {
      vivo = false
      ligar(null)
      ro.disconnect()
      img.onload = img.onerror = null
      canvas.removeEventListener('webglcontextlost', perdeu)
      liberar()
    }
  }, [src, estado, ligar, aoFalhar, dprMax])

  return <canvas ref={tela} data-geada aria-hidden className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500" />
}
