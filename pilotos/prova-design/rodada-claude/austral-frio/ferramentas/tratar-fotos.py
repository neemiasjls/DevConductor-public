"""Tratamento único das fotos da Austral Frio (frio, baixa saturação, sombras azuladas).

Uso: python -I ferramentas/tratar-fotos.py   (rodar da pasta do site)
Lê originais/<nome>.jpg (baixados do Wikimedia Commons, ver assets.md), recorta, desfoca marcas de terceiros
legíveis e aplica o mesmo tratamento de cor em todas. Saída: originais/tratadas/<nome>.jpg, que alimenta
o midias.py do lp-construcao. Não sobrescreve os originais.
"""
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
ORIG = RAIZ / "originais"
SAIDA = ORIG / "tratadas"

# nome: (recorte (x0, y0, x1, y1) em px do original, regiões com marca de terceiro para desfocar)
FOTOS = {
    "camara-fria": ((0, 0, 4444, 3168), []),
    "trailer-doca": (
        (0, 160, 3264, 2448),
        [(690, 350, 900, 500), (1030, 850, 1310, 980), (1420, 1620, 1620, 1740)],
    ),
    "trailer-largo": ((1330, 0, 3151, 1164), [(3010, 640, 3110, 720)]),
}


def tratar(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Color(img).enhance(0.42)
    img = ImageEnhance.Contrast(img).enhance(0.94)
    r, g, b = img.split()
    # Curvas por canal: sombras puxadas para o azul-aço; altas luzes quase neutras, levemente frias.
    tabela_r = [round(min(255, v * (0.90 + 0.08 * v / 255))) for v in range(256)]
    tabela_g = [round(min(255, v * (0.97 + 0.02 * v / 255))) for v in range(256)]
    tabela_b = [round(min(255, v * 1.0 + 16 * (1 - v / 255) ** 1.6)) for v in range(256)]
    img = Image.merge("RGB", (r.point(tabela_r), g.point(tabela_g), b.point(tabela_b)))
    return ImageEnhance.Brightness(img).enhance(1.02)


def main() -> None:
    SAIDA.mkdir(exist_ok=True)
    for nome, (recorte, marcas) in FOTOS.items():
        img = Image.open(ORIG / f"{nome}.jpg").convert("RGB")
        for caixa in marcas:
            regiao = img.crop(caixa).filter(ImageFilter.GaussianBlur(18))
            img.paste(regiao, caixa[:2])
        img = tratar(img.crop(recorte))
        img.thumbnail((2400, 2400))
        img.save(SAIDA / f"{nome}.jpg", quality=90)
        print(nome, img.size)


if __name__ == "__main__":
    main()
