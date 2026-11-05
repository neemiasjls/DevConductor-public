"""Recorta as fotos originais (Wikimedia Commons) nos enquadramentos do site.

Uso: python -I ferramentas/recortar-fotos.py <pasta-originais> <pasta-recortes>
Originais: <id>.jpg baixados das URLs de coleta/fotos-candidatas.json (campo "original").
Depois: python -I <plugin>/skills/lp-construcao/scripts/midias.py <pasta-recortes> .
A única alteração nas fotos é o recorte (registrado em assets.md); cor e conteúdo ficam como no original.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

# nome no site: (id da foto, caixa relativa x0, y0, x1, y1)
RECORTES = {
    "abertura": ("s-60", (0.04, 0.02, 0.96, 0.835)),
    "servico-trancas": ("s2-37", (0.0, 0.03, 1.0, 1.0)),
    "servico-cachos": ("s2-39", (0.17, 0.0, 0.83, 1.0)),
    "servico-cor": ("s-98", (0.1, 0.0, 0.9, 0.66)),
    "perto": ("s2-28", (0.0, 0.0, 1.0, 1.0)),
    "estilo-box": ("s2-7", (0.30, 0.0, 0.94, 1.0)),
    "estilo-koroba": ("s-60", (0.22, 0.10, 0.82, 0.55)),
    "estilo-nago": ("s2-37", (0.45, 0.33, 0.95, 0.715)),
    "estilo-cachos": ("s2-39", (0.06, 0.0, 0.58, 0.79)),
    "estilo-cor": ("s-98", (0.2, 0.0, 0.8, 0.5)),
}
LADO_MAX = 2000


def main() -> None:
    origem, destino = Path(sys.argv[1]), Path(sys.argv[2])
    destino.mkdir(parents=True, exist_ok=True)
    for nome, (fid, (x0, y0, x1, y1)) in RECORTES.items():
        img = ImageOps.exif_transpose(Image.open(origem / f"{fid}.jpg")).convert("RGB")
        w, h = img.size
        rec = img.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))
        rec.thumbnail((LADO_MAX, LADO_MAX), Image.LANCZOS)
        rec.save(destino / f"{nome}.jpg", "JPEG", quality=92)
        print(f"{nome}: {fid} {rec.size[0]}x{rec.size[1]} ({rec.size[0] / rec.size[1]:.2f})")


if __name__ == "__main__":
    main()
