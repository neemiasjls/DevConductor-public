"""Ilustração própria da cena do degradê: a mesma cabeça vista por trás, com o cabelo cheio e depois do corte.

Nenhuma foto livre mostrava um degradê com clareza. Desenhar os dois estados deixa a cena provar a ideia sem legenda:
o cabelo cheio vira pele aos poucos por onde a máquina passa. Fio a fio, com a mesma semente, para os dois casarem.

Uso: python -I ferramentas/gerar-degrade.py <pasta-public-img> <imagens.json>
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

L, A = 1125, 1581  # mesma proporção da caixa da cena (750/1054)
SS = 2
CX = 562.0
TOPO, CENTRO, RX = 190.0, 600.0, 345.0
NUCA = 1110.0
PESCOCO = 212.0
# Faixa do degradê: até F0 o volume da tesoura; em F1 só pele. Curva para os lados, como a linha do corte.
F0, F1, ARCO = 560.0, 1010.0, 0.2
LIMITE_CHEIO = 1062.0
FIO = 58.0


def meia_largura(y):
    y = np.asarray(y, dtype=np.float64)
    topo = RX * np.sqrt(np.clip(1 - ((y - CENTRO) / (CENTRO - TOPO)) ** 2, 0, 1))
    s = np.clip((y - CENTRO) / (NUCA - CENTRO), 0, 1)
    baixo = PESCOCO + (RX - PESCOCO) * (0.5 + 0.5 * np.cos(np.pi * s ** 0.92))
    pescoco = PESCOCO + 34 * np.clip((y - NUCA) / 300, 0, 1) ** 2
    return np.where(y < CENTRO, topo, np.where(y < NUCA, baixo, pescoco))


def base():
    """Fundo, orelhas, pele e capa, em numpy (luz quente vindo do alto à esquerda)."""
    h, w = A * SS, L * SS
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    yy, xx = yy / SS, xx / SS
    # Fundo grafite com um halo discreto atrás da cabeça, para o contorno aparecer.
    d = np.hypot((xx - CX + 70) / 780, (yy - 620) / 860)
    halo = np.clip(1 - d, 0, 1) ** 1.6
    img = np.stack([0.085 + 0.16 * halo, 0.095 + 0.135 * halo, 0.095 + 0.115 * halo], axis=2)

    pele = np.array([0.80, 0.585, 0.455], dtype=np.float32)
    sombra = np.array([0.20, 0.135, 0.125], dtype=np.float32)

    def pintar(mascara, luz):
        c = sombra[None, None] + (pele - sombra)[None, None] * luz[..., None]
        m = mascara[..., None]
        return img * (1 - m) + c * m

    # Orelhas: atrás da cabeça, do lado de fora do contorno.
    for lado in (-1, 1):
        ox, oy = CX + lado * 338, 768
        u = (xx - ox) * np.cos(lado * 0.13) + (yy - oy) * np.sin(lado * 0.13)
        v = -(xx - ox) * np.sin(lado * 0.13) + (yy - oy) * np.cos(lado * 0.13)
        e = (u / 58) ** 2 + (v / 128) ** 2
        mascara = np.clip((1 - e) * 22, 0, 1)
        concha = np.clip(1 - ((u - lado * 8) / 34) ** 2 - ((v + 8) / 92) ** 2, 0, 1)
        luz = np.clip(0.72 - 0.12 * lado - 0.42 * concha ** 0.7 - 0.0012 * v, 0.05, 1)
        img = pintar(mascara, luz)

    # Cabeça e pescoço.
    hw = meia_largura(yy)
    n = (xx - CX) / np.maximum(hw, 1)
    mascara = np.clip((1 - np.abs(n)) * hw / 1.2, 0, 1) * (yy > TOPO)
    redondo = np.sqrt(np.clip(1 - n ** 2, 0, 1))
    luz = (0.2 + 0.8 * redondo ** 0.8) * (0.86 - 0.3 * n)
    # Vinco da nuca e os dois músculos do pescoço.
    vinco = np.exp(-((xx - CX) / 22) ** 2) * np.clip((yy - 960) / 110, 0, 1) * np.clip((1390 - yy) / 90, 0, 1)
    musculo = sum(np.exp(-((xx - CX - s * 92) / 52) ** 2) for s in (-1, 1)) * np.clip((yy - 1030) / 150, 0, 1)
    luz = luz * (1 - 0.34 * vinco) + 0.075 * musculo
    # A base do crânio faz sombra sobre o pescoço.
    luz = luz * (1 - 0.3 * np.exp(-((yy - 1150) / 70) ** 2) * (1 - 0.4 * musculo.clip(0, 1)))
    img = pintar(mascara, np.clip(luz, 0, 1))

    # Gola de papel e capa.
    dx = np.abs(xx - CX)
    curva = 1335 + 0.0006 * dx ** 2
    espessura = 34 * np.sqrt(np.clip(1 - (dx / 330) ** 2, 0, 1))
    gola = np.clip((yy - curva) * 1.2, 0, 1) * (dx < 330)
    papel = (0.74 - 0.0009 * dx - 0.2 * np.clip((xx - CX) / 300, -1, 1))[..., None] * np.array([1.0, 0.97, 0.9], dtype=np.float32)
    img = img * (1 - gola[..., None]) + papel * gola[..., None]
    capa = np.clip((yy - curva - espessura) * 1.2, 0, 1)
    dobra = 0.5 + 0.5 * np.sin(xx / 92 + np.sin(yy / 130) * 1.7)
    tecido = (0.052 + 0.03 * dobra - 0.018 * (xx - CX) / 562)[..., None] * np.array([1.0, 1.1, 1.08], dtype=np.float32) * (1 + 0.45 * np.clip((1581 - yy) / 200, 0, 1))[..., None]
    img = img * (1 - capa[..., None]) + tecido * capa[..., None]
    return np.clip(img, 0, 1)


def fios():
    """Raízes em ordem de baixo para cima: o fio de cima cai sobre o de baixo. Fixas para os dois estados."""
    rng = np.random.default_rng(61)
    n = 210000
    x = rng.uniform(CX - RX - 4, CX + RX + 4, n)
    y = rng.uniform(TOPO - 4, LIMITE_CHEIO + 8, n)
    dentro = np.abs(x - CX) < meia_largura(y) + 2
    x, y = x[dentro], y[dentro]
    ordem = np.argsort(-y)
    x, y = x[ordem], y[ordem]
    m = len(x)
    return x, y, rng.random(m), rng.normal(0, 1, m), rng.random(m), rng.random(m)


def desenhar(cheio):
    fundo = Image.fromarray((base() * 255 + 0.5).astype(np.uint8))
    d = ImageDraw.Draw(fundo)
    x, y, r_cor, r_ang, r_dens, r_comp = fios()
    dx = x - CX
    y_ef = y + ARCO * np.abs(dx)  # a linha do corte sobe para os lados
    s = np.clip((y_ef - F0) / (F1 - F0), 0, 1)
    # Direção: nasce no redemoinho, desce pela nuca, com mechas de baixa frequência.
    # Soma de vetores (nunca de ângulos, que criam emenda no alto): sai do redemoinho, gira de leve, desce pela nuca.
    vx, vy = x - (CX + 26), y - 300
    raio = np.hypot(vx, vy) + 40
    ux, uy = vx / raio, vy / raio
    ux, uy = ux - 0.5 * uy * np.exp(-raio / 220), uy + 0.5 * ux * np.exp(-raio / 220)
    baixo = np.clip((y - 360) / 320, 0, 1)
    dirx = ux * (1 - baixo) + 0.0012 * dx * baixo
    diry = uy * (1 - baixo) + baixo
    ang = np.arctan2(diry, dirx) + 0.36 * np.sin(x / 74 + y / 133) + 0.26 * np.sin(y / 58 - x / 171) + 0.2 * r_ang
    if cheio:
        # Corte longo e por igual: termina numa linha reta acima do pescoço, sem transição.
        comp = FIO * (0.62 + 0.5 * r_comp)
        passa = y_ef < LIMITE_CHEIO + 0.2 * np.abs(dx) + 5 * r_ang
        mistura = np.zeros_like(s)
    else:
        comp = FIO * (0.62 + 0.5 * r_comp) * (1 - s) ** 1.45 + 2.2
        # A densidade cai sem degrau até virar pontilhado rente, que some em pele lisa logo abaixo de F1.
        dens = 1 - np.clip((s - 0.16) / 0.84, 0, 1) ** 0.82 * 0.97
        dens = dens * np.clip((F1 + 34 - y_ef) / 34, 0, 1)
        passa = r_dens < dens
        mistura = s ** 1.7 * 0.66
    largura = np.where(comp > 12, 3, 2)
    # Cor: quase preto com brilho largo do lado da luz.
    nx = dx / np.maximum(meia_largura(y), 1)
    brilho = np.exp(-(((y - 400 - 150 * nx) / 150) ** 2)) * np.clip(0.75 - 0.75 * nx, 0, 1)
    mecha = 0.5 + 0.25 * np.sin(x / 83 + 1.6 * np.sin(y / 97)) + 0.25 * np.sin(y / 71 + 1.4 * np.sin(x / 113))
    v = 0.05 + 0.075 * r_cor + 0.016 * mecha + 0.3 * brilho * (0.3 + 0.7 * r_cor) ** 2
    rgb = np.stack([v * 1.1, v * 0.94, v * 0.82], axis=1)
    pele = np.array([0.58, 0.42, 0.33])
    rgb = rgb * (1 - mistura[:, None]) + pele * mistura[:, None]
    rgb8 = (rgb.clip(0, 1) * 255).astype(int)
    x1, y1 = x + np.cos(ang) * comp, y + np.sin(ang) * comp
    p = np.stack([x, y, x1, y1], axis=1) * SS
    # No redemoinho os fios saem para fora e deixam o centro sem cobertura: a pele aparecia como um ponto claro.
    # Uma base escura e macia, da cor do cabelo, fica por baixo dos fios só ali.
    rx0, ry0 = (CX + 26) * SS, 300 * SS
    for raio, tom in ((46, 30), (34, 24), (22, 19)):
        r = raio * SS
        d.ellipse((rx0 - r, ry0 - r * 0.8, rx0 + r, ry0 + r * 0.8), fill=(tom, tom - 3, tom - 6))
    for i in np.flatnonzero(passa):
        d.line(tuple(p[i]), fill=tuple(rgb8[i]), width=int(largura[i]))
    im = fundo.resize((L, A), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 45, 2))
    a = np.asarray(im, dtype=np.float32) / 255
    # Grão bem fino, igual nos dois, e a borda baixando para o grafite da seção.
    grao = np.random.default_rng(7).normal(0, 0.008, a.shape[:2])[..., None]
    yy, xx = np.mgrid[0:A, 0:L]
    borda = 1 - np.clip(np.hypot((xx - CX) / L, (yy - 760) / A) - 0.46, 0, 1) * 0.9
    return Image.fromarray(((a + grao) * borda[..., None]).clip(0, 1).__mul__(255).astype(np.uint8))


def main():
    destino, indice = Path(sys.argv[1]), Path(sys.argv[2])
    dados = json.loads(indice.read_text(encoding='utf-8'))
    for nome, cheio in (('degrade', False), ('degrade-cheio', True)):
        im = desenhar(cheio)
        larguras = [480, 750, L]
        for larg in larguras:
            im.resize((larg, round(A * larg / L)), Image.LANCZOS).save(destino / f'{nome}-{larg}.webp', quality=72, method=6)
        dados[nome] = {'w': L, 'h': A, 'larguras': larguras}
        print(nome, im.size)
    indice.write_text(json.dumps(dados, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
