"""Monta uma prancha numerada com os prints de referência.

Uso: python -I moodboard.py <pasta-com-prints> <saida.jpg> [--colunas 4]
Os números seguem a ordem alfabética dos arquivos (nomeie como 01-site.png, 02-site.png...).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


def fonte(tamanho: int):
    for nome in ("arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(nome, tamanho)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        return
    colunas = 4
    if "--colunas" in args:
        i = args.index("--colunas")
        colunas = int(args[i + 1])
        del args[i : i + 2]
    pasta, saida = Path(args[0]), Path(args[1])
    arquivos = sorted(p for p in pasta.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    W, H, rotulo = 480, 300, 34
    linhas = (len(arquivos) + colunas - 1) // colunas
    prancha = Image.new("RGB", (colunas * W, linhas * (H + rotulo)), "white")
    d = ImageDraw.Draw(prancha)
    f1, f2 = fonte(22), fonte(15)
    for i, p in enumerate(arquivos):
        im = ImageOps.fit(Image.open(p).convert("RGB"), (W - 8, H - 8), centering=(0.5, 0.0))
        x, y = (i % colunas) * W, (i // colunas) * (H + rotulo)
        prancha.paste(im, (x + 4, y + 4))
        d.rectangle([x + 4, y + 4, x + 46, y + 32], fill="black")
        d.text((x + 10, y + 6), f"{i + 1:02d}", fill="yellow", font=f1)
        d.text((x + 6, y + H + 6), p.stem[:52], fill="#333333", font=f2)
    saida.parent.mkdir(parents=True, exist_ok=True)
    prancha.save(saida, quality=85)
    print(f"{len(arquivos)} referencias -> {saida}")


if __name__ == "__main__":
    main()
