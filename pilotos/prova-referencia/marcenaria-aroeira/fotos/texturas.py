# Gera os fundos do site a partir de texturas de madeira fotografadas (Poly Haven, CC0, em fotos/busca/texturas):
# recorta, tinge na cor da seção e põe luz e sombra por cima.
# Uso: python fotos/texturas.py   (grava em public/img e atualiza src/data/imagens.json)
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')
RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'public' / 'img'
rng = np.random.default_rng(7)


def ruido(h, w, cy, cx):
    """Ruído suave: grade pequena ampliada (cy, cx = tamanho da mancha em px)."""
    g = rng.random((max(2, h // cy + 2), max(2, w // cx + 2))).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32) / 255


def veio(h, w, escala=1.0, torto=1.0):
    """Desenho do veio: linhas ao longo de x, onduladas, mais fibra fina."""
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    onda = ruido(h, w, int(520 * escala), int(1700 * escala)) * 2.2 * torto + ruido(h, w, 150, 900) * 0.5 * torto
    faixas = 0.5 + 0.5 * np.sin(2 * np.pi * (y * 22 / escala + onda * 0.9 + x * 0.35))
    faixas = faixas ** 1.2
    fibra = ruido(h, w, 3, 420) * 0.6 + ruido(h, w, 2, 160) * 0.4
    poro = ruido(h, w, 1, 28)
    return np.clip(0.3 * faixas + 0.55 * fibra + 0.15 * poro, 0, 1)


def cor(v, escura, clara):
    e = np.array(escura, dtype=np.float32)
    c = np.array(clara, dtype=np.float32)
    return e + (c - e) * v[..., None]


def borrao(mascara, raio):
    return np.asarray(mascara.filter(ImageFilter.GaussianBlur(raio)), dtype=np.float32) / 255


def folha(d, cx, cy, comp, ang, n=9, larg=0.085):
    """Folha de palmeira: talo e folíolos em leque."""
    a = np.deg2rad(ang)
    ux, uy = np.cos(a), np.sin(a)
    px, py = -uy, ux
    d.line([(cx, cy), (cx + ux * comp, cy + uy * comp)], fill=255, width=int(comp * 0.012) + 2)
    for i in range(n):
        t = 0.18 + 0.8 * i / (n - 1)
        bx, by = cx + ux * comp * t, cy + uy * comp * t
        tam = comp * (0.52 - 0.3 * abs(t - 0.45))
        for lado in (-1, 1):
            inc = 0.62
            ex = bx + (ux * inc + px * lado) * tam
            ey = by + (uy * inc + py * lado) * tam
            mx, my = (bx + ex) / 2, (by + ey) / 2
            l = comp * larg * 0.5
            nx, ny = -(ey - by), ex - bx
            nn = (nx ** 2 + ny ** 2) ** 0.5 or 1
            nx, ny = nx / nn * l, ny / nn * l
            d.polygon([(bx, by), (mx + nx, my + ny), (ex, ey), (mx - nx, my - ny)], fill=255)


def salvar(arr, nome, larguras, q=78):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    for l in larguras:
        r = im if l == im.width else im.resize((l, round(im.height * l / im.width)), Image.LANCZOS)
        r.save(SAIDA / f'{nome}-{l}.webp', 'WEBP', quality=q, method=6)
    return {'w': im.width, 'h': im.height, 'larguras': larguras}


def madeira(arquivo, w, h, girar=False, corte=(0, 0)):
    """Lê uma textura de madeira fotografada (Poly Haven, CC0) e devolve o claro-escuro dela, de 0 a 1."""
    im = Image.open(RAIZ / 'fotos' / 'busca' / 'texturas' / arquivo).convert('L')
    if girar:
        im = im.rotate(90, expand=True)
    lado = im.width
    ch = round(lado * h / w)
    y0 = round((im.height - ch) * corte[1])
    im = im.crop((0, y0, lado, y0 + ch)).resize((w, h), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32)
    lo, hi = np.percentile(a, 1), np.percentile(a, 99)
    return np.clip((a - lo) / (hi - lo), 0, 1)


def recorte(arquivo, x0, y0, cw, ch, w, h, girar=False, nitidez=90):
    """Recorte de uma textura fotografada, perto do tamanho real (para a fibra ficar nítida), em cor."""
    im = Image.open(RAIZ / 'fotos' / 'busca' / 'texturas' / arquivo).convert('RGB')
    if girar:
        im = im.rotate(90, expand=True)
    im = im.crop((x0, y0, x0 + cw, y0 + ch)).resize((w, h), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=nitidez, threshold=0))
    return np.asarray(im, dtype=np.float32)


def claro_escuro(rgb):
    a = rgb.mean(axis=2)
    lo, hi = np.percentile(a, 1), np.percentile(a, 99)
    return np.clip((a - lo) / (hi - lo), 0, 1)


def grade(w, h):
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    return x, y


def abertura():
    """Nogueira defumada (lâmina inteira, sem espelhamento), em tamanho real, puxada para o vermelho da marca.
    Só uma luz larga de janela por cima: nada de sombra desenhada, que apagava a fibra."""
    return (_abertura('fundo-abertura', 2400, 1600, 800, 1500, [800, 1400, 2400]),
            _abertura('fundo-abertura-pe', 720, 1600, 1700, 1300, [480, 720]))


def _abertura(nome, w, h, x0, y0, larguras):
    rgb = recorte('smoked_walnut_veneer.jpg', x0, y0, w, h, w, h, nitidez=140)
    v = claro_escuro(rgb)
    arr = cor(v ** 1.25, (44, 11, 5), (190, 80, 36))
    x, y = grade(w, h)
    luz = np.exp(-((x * 0.7 - y * 0.6 - 0.1) ** 2) / 0.09) * 0.3
    vinheta = np.clip(((x - 0.5) ** 2) * 1.1 + ((y - 0.45) ** 2) * 1.5, 0, 1)
    arr = arr * ((0.8 + luz) * (1 - 0.5 * vinheta))[..., None]
    return salvar(arr, nome, larguras, q=82 if w > h else 62)


def _escuro(nome, w, h, x0, y0, cw, ch, larguras):
    rgb = recorte('walnut_veneer_02.jpg', x0, y0, cw, ch, w, h, nitidez=130)
    v = claro_escuro(rgb)
    base = cor(0.12 + 0.88 * v, (18, 9, 6), (92, 56, 34))
    x, y = grade(w, h)
    arr = base * (1.04 - 0.3 * np.clip(((x - 0.5) ** 2) * 1.2 + ((y - 0.5) ** 2) * 1.2, 0, 1))[..., None]
    return salvar(arr, nome, larguras, q=80)


def escuro():
    """Nogueira escura, fibra reta (trecho sem nó): fundo da seção Sobre. Recorte em pé para o celular."""
    return (_escuro('fundo-escuro', 2400, 1600, 900, 1900, 2400, 1600, [1400, 2400]),
            _escuro('fundo-escuro-pe', 1000, 2000, 2000, 1500, 1000, 2000, [600, 1000]))


def claro():
    """Carvalho claro, calmo (pouco contraste, para o título ler bem): fundo da chamada final."""
    w, h = 2400, 1200
    rgb = recorte('white_oak_veneer.jpg', 800, 1400, 2400, 1200, w, h, girar=True, nitidez=120)
    v = claro_escuro(rgb)
    base = cor(v, (212, 194, 174), (244, 235, 224))
    x, y = grade(w, h)
    arr = base * (1.02 - 0.1 * np.clip(((x - 0.5) ** 2) * 2 + ((y - 0.5) ** 2) * 2, 0, 1))[..., None]
    return salvar(arr, 'fundo-claro', [800, 1400, 2400], q=80)


if __name__ == '__main__':
    arq = RAIZ / 'src' / 'data' / 'imagens.json'
    dados = json.loads(arq.read_text(encoding='utf-8'))
    for velho in SAIDA.glob('fundo-*.webp'):
        velho.unlink()
    dados.pop('fundo-processo', None)
    dados['fundo-abertura'], dados['fundo-abertura-pe'] = abertura()
    dados['fundo-escuro'], dados['fundo-escuro-pe'] = escuro()
    dados['fundo-claro'] = claro()
    arq.write_text(json.dumps(dados, indent=1), encoding='utf-8')
    for f in sorted(SAIDA.glob('fundo-*.webp')):
        print(f.name, f.stat().st_size // 1024, 'KB')
