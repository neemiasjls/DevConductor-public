"""Mostra a posição de popularidade de fontes no Google Fonts.

Uso: python -I popularidade.py "Fonte A" ["Fonte B" ...]
Abaixo de #120 a fonte é considerada batida (cara de template/IA).
"""
import json
import sys
import urllib.request

URL = "https://fonts.google.com/metadata/fonts"


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        return
    with urllib.request.urlopen(URL, timeout=30) as r:
        dados = json.loads(r.read().decode("utf-8"))
    familias = {f["family"].lower(): f for f in dados["familyMetadataList"]}
    for nome in sys.argv[1:]:
        f = familias.get(nome.lower())
        if not f:
            print(f"{nome}: não está no Google Fonts (pode ser Fontshare, Velvetyne, Collletttivo...)")
            continue
        pos = f["popularity"]
        selo = "BATIDA" if pos < 120 else "comum" if pos < 300 else "pouco usada"
        pesos = sorted({int(k.rstrip("i") or 400) for k in f["fonts"]})
        italico = any(k.endswith("i") for k in f["fonts"])
        print(f"{f['family']}: #{pos} ({selo}) · {f['category']} · pesos {pesos[0]}–{pesos[-1]} · itálico: {'sim' if italico else 'não'}")


if __name__ == "__main__":
    main()
