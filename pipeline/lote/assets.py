"""Libro de uso de materiales de Joseph → plans/uso_assets.csv (determinístico, en orden de calendario).
- Foto: la siguiente sin usar de la carpeta del tema del clip (plans/temas.csv); no se repite mientras queden otras del tema.
- Inserto de "Animaciones de apoyo": solo si el texto de la animación (OCR, plans/animaciones_texto.csv) aparece literal en lo que
  dice Joseph: ≥ 3 palabras seguidas con ≥ 2 que no sean palabras vacías. La transcripción se pasa por argumento (catalogo.csv,
  fuera del repo); sin ella no se sugiere ningún inserto.
Uso: python pipeline/lote/assets.py [catalogo.csv]"""
import csv, re, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
VACIAS = set("el la los las un una de del a y o que en con por para no se es te tu vos mas lo al".split())
USADAS_PILOTO = {"07_37-limites_y_preferencias-03.png", "11_54-lenguaje_no_verbal-04.png"}

def toks(t):
    t = unicodedata.normalize("NFD", t.lower())
    return re.findall(r"[a-zñ0-9]+", "".join(c for c in t if unicodedata.category(c) != "Mn"))

def literal(anim, texto):
    A, T, mejor = toks(anim), toks(texto), []
    for i in range(len(A)):
        for j in range(len(T)):
            k = 0
            while i + k < len(A) and j + k < len(T) and A[i + k] == T[j + k]:
                k += 1
            run = A[i:i + k]
            if k >= 3 and sum(w not in VACIAS for w in run) >= 2 and len(run) > len(mejor):
                mejor = run
    return " ".join(mejor)

def main(catalogo=None):
    cal = [c for c in csv.DictReader(open(RAIZ / "plans/calendario.csv", encoding="utf-8")) if c["lote"] == "lote"]
    tema = {r["clip"]: r["tema"] for r in csv.DictReader(open(RAIZ / "plans/temas.csv", encoding="utf-8"))}
    imgs = [r["archivo"] for r in csv.DictReader(open(RAIZ / "plans/imagenes.csv", encoding="utf-8"))]
    anims = [r for r in csv.DictReader(open(RAIZ / "plans/animaciones_texto.csv", encoding="utf-8")) if r["tipo"] == "apoyo"]
    trans = {}
    if catalogo:
        trans = {r["n"].zfill(2): r["transcripcion"] for r in csv.DictReader(open(catalogo, encoding="utf-8"))}
    usos = {i: (1 if i in USADAS_PILOTO else 0) for i in imgs}
    anim_usada, filas = set(), []
    for c in cal:
        n, t = c["clip"], tema[c["clip"]]
        delt = sorted((i for i in imgs if i[:2] == t), key=lambda i: (usos[i], i))
        foto = delt[0] if delt else ""
        if foto:
            usos[foto] += 1
        ins, frase = "", ""
        for a in anims:
            f = literal(a["texto"], trans.get(n, "")) if a["archivo"] not in anim_usada else ""
            if f and len(f) > len(frase):
                ins, frase = a["archivo"], f
        if ins:
            anim_usada.add(ins)
        filas.append({"dia": c["dia"], "clip": n, "tema": t, "foto": foto, "repetida": "si" if foto and usos[foto] > 1 else "no",
                      "inserto": ins, "frase_inserto": frase})
    with open(RAIZ / "plans/uso_assets.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, list(filas[0])); w.writeheader(); w.writerows(filas)
    print(f"{len(filas)} clips · {sum(1 for f in filas if f['foto'])} con foto ({sum(f['repetida'] == 'si' for f in filas)} repetidas) · {sum(1 for f in filas if f['inserto'])} con inserto")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
