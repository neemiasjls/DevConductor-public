// Reflexo da abertura em WebGL puro (sem three.js): a foto vira textura e uma faixa de luz corre pelos
// comprimentos do cabelo. Só realça o que já é claro na foto (o reflexo que existe anda pelo fio); o rosto e o
// fundo ficam fora da máscara. Sem relógio próprio: quem chama desenha um quadro quando a luz muda.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `
precision mediump float;
uniform sampler2D uFoto;
uniform vec2 uRecorte;
uniform vec2 uPosicao;
uniform float uLuz;
uniform float uForca;
varying vec2 vUv;
void main() {
  // mesmo recorte do <img> (object-fit: cover + object-position): uv em coordenadas da foto, y de cima
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y) * uRecorte + (1.0 - uRecorte) * uPosicao;
  vec3 c = texture2D(uFoto, uv).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // faixa quase horizontal que desce pelos comprimentos (de cima para baixo, levemente inclinada)
  float t = uv.y + (uv.x - 0.5) * 0.28;
  float d = t - uLuz;
  float faixa = exp(-d * d / 0.0036);
  float halo = exp(-d * d / 0.04);
  // máscara do cabelo: a coluna de comprimentos à direita da foto (rosto e fundo ficam de fora)
  float cabelo = smoothstep(0.56, 0.66, uv.x) * (1.0 - smoothstep(0.95, 1.0, uv.x)) * (1.0 - smoothstep(0.78, 0.9, uv.y));
  float brilho = smoothstep(0.14, 0.7, lum) * cabelo;
  vec3 luz = vec3(0.93, 0.985, 0.975);
  c += luz * (faixa * 0.85 + halo * 0.16) * brilho * uForca;
  gl_FragColor = vec4(c, 1.0);
}`

export type Reflexo = {
  luz: (valor: number) => void
  destruir: () => void
}

function compilar(gl: WebGLRenderingContext, tipo: number, fonte: string) {
  const s = gl.createShader(tipo)
  if (!s) throw new Error('shader')
  gl.shaderSource(s, fonte)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error(log || 'shader')
  }
  return s
}

// Programa ligado e shaders já marcados para descarte (só vivem enquanto o programa existir).
// Em qualquer erro, libera o que já tinha sido criado.
function montar(gl: WebGLRenderingContext) {
  const vs = compilar(gl, gl.VERTEX_SHADER, VERT)
  let fs: WebGLShader | undefined
  let prog: WebGLProgram | null = null
  try {
    fs = compilar(gl, gl.FRAGMENT_SHADER, FRAG)
    prog = gl.createProgram()
    if (!prog) throw new Error('programa')
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'programa')
    return prog
  } catch (erro) {
    if (prog) gl.deleteProgram(prog)
    throw erro
  } finally {
    gl.deleteShader(vs)
    if (fs) gl.deleteShader(fs)
  }
}

export async function criarReflexo(canvas: HTMLCanvasElement, url: string,
  opcoes: { dprMax: number; forca: number; posicao: [number, number]; aoPerder: () => void }): Promise<Reflexo> {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false })
  if (!gl) throw new Error('WebGL indisponível')
  // ImageBitmap decodifica fora da thread principal; o texImage2D com <img> decodificava de novo nela.
  const imagem = await fetch(url).then((r) => r.blob()).then((b) => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))

  const prog = montar(gl)
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imagem)

  const uRecorte = gl.getUniformLocation(prog, 'uRecorte')
  const uLuz = gl.getUniformLocation(prog, 'uLuz')
  const uForca = gl.getUniformLocation(prog, 'uForca')
  gl.uniform1f(uForca, opcoes.forca)
  gl.uniform2f(gl.getUniformLocation(prog, 'uPosicao'), opcoes.posicao[0], opcoes.posicao[1])

  let luzAtual = -1
  const desenhar = () => {
    gl.uniform1f(uLuz, luzAtual)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  // Mede só no resize (nada de ler layout a cada quadro): tamanho do canvas e recorte "cover" da foto.
  const medir = () => {
    const dpr = Math.min(opcoes.dprMax, devicePixelRatio || 1)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    gl.viewport(0, 0, w, h)
    const aspFoto = imagem.width / imagem.height, aspTela = w / h
    gl.uniform2f(uRecorte, Math.min(1, aspTela / aspFoto), Math.min(1, aspFoto / aspTela))
    desenhar()
  }
  const observar = new ResizeObserver(medir)
  observar.observe(canvas)
  medir()
  const perdeu = (e: Event) => { e.preventDefault(); opcoes.aoPerder() }
  canvas.addEventListener('webglcontextlost', perdeu)

  return {
    luz: (valor) => { luzAtual = valor; desenhar() },
    destruir: () => {
      observar.disconnect()
      canvas.removeEventListener('webglcontextlost', perdeu)
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      imagem.close()
    },
  }
}
