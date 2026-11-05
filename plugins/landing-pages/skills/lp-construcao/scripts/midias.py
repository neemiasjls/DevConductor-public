"""Gera as imagens WebP (3 larguras) e o manifesto de um site a partir de um mapa nome → original.

Uso: python -I midias.py <pasta-fotos-originais> <pasta-do-site>
O mapa fica em <pasta-do-site>/midias.json: { "nome-no-site": "subpasta/arquivo-sem-extensao", ... }
Originais em "quadros/" (tirados de vídeo) recebem um leve aquecimento de cor.
Saída: <site>/public/img/<nome>-<largura>.webp e <site>/src/data/imagens.json
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

LARGURAS = [480, 960, 1600]


def aquecer(img: Image.Image) -> Image.Image:
    r, g, b = img.split()
    r = r.point(lambda v: min(255, round(v * 1.04)))
    b = b.point(lambda v: round(v * 0.93))
    return ImageEnhance.Contrast(Image.merge("RGB", (r, g, b))).enhance(1.05)


def abrir(origem: Path, rel: str) -> Image.Image:
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = origem / f"{rel}{ext}"
        if p.exists():
            return ImageOps.exif_transpose(Image.open(p)).convert("RGB")
    raise FileNotFoundError(f"original não encontrado: {rel}")


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        return
    origem, site = Path(sys.argv[1]), Path(sys.argv[2])
    mapa = json.loads((site / "midias.json").read_text(encoding="utf-8"))
    saida, manifesto_arq = site / "public" / "img", site / "src" / "data" / "imagens.json"
    saida.mkdir(parents=True, exist_ok=True)
    manifesto_arq.parent.mkdir(parents=True, exist_ok=True)
    manifesto = {}
    for nome, rel in mapa.items():
        img = abrir(origem, rel)
        if rel.startswith("quadros/"):
            img = aquecer(img)
        w, h = img.size
        larguras = sorted({lw for lw in LARGURAS if lw < w} | {min(w, LARGURAS[-1])})
        for lw in larguras:
            alvo = img if lw == w else img.resize((lw, round(h * lw / w)), Image.LANCZOS)
            alvo.save(saida / f"{nome}-{lw}.webp", "WEBP", quality=78, method=6)
        manifesto[nome] = {"w": w, "h": h, "larguras": larguras}
    manifesto_arq.write_text(json.dumps(manifesto, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(manifesto)} imagens geradas em {saida}")


if __name__ == "__main__":
    main()
