"""Extrai a paleta de um espaço/marca a partir de fotos e sugere papéis com contraste conferido.

Uso: python -I extrair_paleta.py <pasta-ou-arquivos...> [--cores 14]
Saída: cores dominantes (hex, OKLCH, peso) + sugestão de fundo, texto e acento com razão de contraste WCAG.
"""
import colorsys
import math
import sys
from pathlib import Path

from PIL import Image


def srgb_lin(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def oklch(rgb: tuple[int, int, int]) -> tuple[float, float, float]:
    r, g, b = (srgb_lin(v / 255) for v in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s))
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    C = math.hypot(A, B)
    H = math.degrees(math.atan2(B, A)) % 360
    return L, C, H


def luminancia(rgb) -> float:
    r, g, b = (srgb_lin(v / 255) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a, b) -> float:
    la, lb = sorted((luminancia(a), luminancia(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def hexa(rgb) -> str:
    return "#%02X%02X%02X" % rgb


def main() -> None:
    args = sys.argv[1:]
    n = 14
    if "--cores" in args:
        i = args.index("--cores")
        n = int(args[i + 1])
        del args[i : i + 2]
    arquivos = []
    for a in args:
        p = Path(a)
        arquivos += sorted(x for x in p.rglob("*") if x.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}) if p.is_dir() else [p]
    if not arquivos:
        print(__doc__)
        return
    acumulado: dict[tuple, int] = {}
    for f in arquivos:
        im = Image.open(f).convert("RGB")
        im.thumbnail((320, 320))
        q = im.quantize(colors=10, method=Image.Quantize.MEDIANCUT)
        pal = q.getpalette()
        for qtd, idx in q.getcolors():
            rgb = tuple(pal[idx * 3 : idx * 3 + 3])
            chave = tuple(v // 10 * 10 for v in rgb)
            acumulado[chave] = acumulado.get(chave, 0) + qtd
    total = sum(acumulado.values())
    cores = sorted(acumulado.items(), key=lambda kv: -kv[1])[:n]
    print(f"{len(arquivos)} imagens · {n} cores dominantes\n")
    print("hex      peso   OKLCH (L C H)          leitura")
    for rgb, peso in cores:
        L, C, H = oklch(rgb)
        tipo = "neutra" if C < 0.03 else "quente" if (H < 100 or H > 330) else "fria"
        tom = "clara" if L > 0.8 else "média" if L > 0.45 else "escura"
        print(f"{hexa(rgb)}  {peso / total * 100:4.1f}%  {L:.3f} {C:.3f} {H:5.1f}   {tipo}, {tom}")

    claras = [c for c, _ in cores if oklch(c)[0] > 0.85]
    escuras = [c for c, _ in cores if oklch(c)[0] < 0.35]
    saturadas = sorted((c for c, _ in cores), key=lambda c: -oklch(c)[1])
    fundo = claras[0] if claras else (250, 248, 244)
    texto = escuras[0] if escuras else (30, 26, 22)
    acento = saturadas[0]
    print("\nSugestão de papéis (ajuste na direção de arte):")
    print(f"  fundo  {hexa(fundo)}   texto {hexa(texto)}   contraste {contraste(fundo, texto):.1f}:1 (mín. 4,5)")
    print(f"  acento {hexa(acento)}   sobre o fundo {contraste(fundo, acento):.1f}:1 "
          f"({'pode ser texto' if contraste(fundo, acento) >= 4.5 else 'só decorativo/títulos grandes'})")


if __name__ == "__main__":
    main()
