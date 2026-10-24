"""Descarga de activos de Drive para el piloto. $ACTIVOS = "tipo:nombre=ID;..." (nunca se imprime).
Uso: python pipeline/piloto/activos.py <tipo>[,<tipo>] [nombre]  → piloto/activos/<tipo>/<nombre>"""
import os, sys
from pathlib import Path
from urllib.request import Request, urlopen

RAIZ = Path(__file__).resolve().parents[2]
DEST = RAIZ / "piloto" / "activos"

def activos():
    for par in os.environ["ACTIVOS"].split(";"):
        izq, fid = par.rsplit("=", 1)
        tipo, nombre = izq.split(":", 1)
        yield tipo, nombre, fid

def bajar(tipos, solo=None):
    n = 0
    for tipo, nombre, fid in activos():
        if tipo not in tipos or (solo and nombre != solo):
            continue
        d = DEST / tipo / nombre
        if d.exists():
            continue
        d.parent.mkdir(parents=True, exist_ok=True)
        req = Request(f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t", headers={"User-Agent": "Mozilla/5.0"})
        d.write_bytes(urlopen(req, timeout=300).read())
        n += 1
    print(f"bajados {n} ({','.join(tipos)})")

if __name__ == "__main__":
    bajar(sys.argv[1].split(","), sys.argv[2] if len(sys.argv) > 2 else None)
