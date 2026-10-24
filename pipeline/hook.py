"""Texto del gancho: 3 variantes por fórmula (A afirmación contraria / negación, B pregunta abierta, C imperativo),
máx. 32 caracteres, sin aperturas muertas. Registra todas en hooks-log.csv (retención y vistas se completan a mano).
Uso: python pipeline/hook.py <nombre>  → work/hooks.json"""
import csv, re, sys
from comun import RAIZ, WORK, cfg, guardar, leer, norm

H, KW = cfg("hook"), cfg("keywords")
MAX = H["texto"]["max_caracteres"]
DEBIL = set(KW["no_terminar_en"])
FUERTES = {norm(w) for w in KW["impacto"] + KW["positivas"] + KW["negativas"]}

def recortar(palabras, limite):
    out = []
    for w in palabras:
        w = re.sub(r"[.,;:!?…¿¡]", "", w)
        if len(" ".join(out + [w])) > limite:
            break
        out.append(w)
    while out and norm(out[-1]) in DEBIL:
        out.pop()
    return out

def clave_de(texto):
    ws = re.findall(r"[\wáéíóúñü]+", texto.lower())
    return next((w.upper() for w in ws if norm(w) in FUERTES), max(ws, key=len).upper() if ws else "")

def variantes(ps, piezas=None):
    txt = " ".join(p["texto"] for p in ps)
    bajo = txt.lower()
    x = None
    for pat in [r"no se trata de (?P<x>[^,.]+),\s*se trata de", r"\bno es (?P<x>[^,.]{3,40}),\s*es ", r"en vez de (?P<x>[^,.]+),", r"\bno (?P<x>[^,.]{3,40}?),? sino "]:
        m = re.search(pat, bajo)
        if m:
            x = m.group("x").split(); pre = "NO SE TRATA DE" if "se trata" in pat else "NO"
            break
    listas = [p for p in (piezas or []) if p["tipo"] == "pasos"]
    n = len(listas[0]["pasos"]) if listas else None
    vs = {}
    # A: afirmación contraria / negación
    if x:
        resto = recortar(x, MAX - len(pre) - 1)
        if resto:
            vs["A"] = f"{pre} {' '.join(resto)}"
    if "A" not in vs:
        # frase más fuerte del clip, condensada
        frases = re.split(r"(?<=[.!?])\s+", txt)
        mejor = max(frases, key=lambda f: sum(norm(w) in FUERTES for w in f.split()) - 0.1 * len(f.split()))
        vs["A"] = " ".join(recortar(mejor.split(), MAX))
    # B: pregunta que no se responde con sí/no
    m = re.search(r"\bmás ([a-záéíóúñ]{4,})", bajo)
    if m:
        vs["B"] = f"¿Qué te hace más {m.group(1)}?"
    elif x:
        vs["B"] = f"¿Por qué {' '.join(recortar(x, MAX - 18))} no funciona?"
    else:
        vs["B"] = f"¿Qué hace que una mujer te elija?"
    # C: imperativo (con número específico si hay lista)
    if x and re.search(r"(ar|er|ir)$", x[0]):
        vs["C"] = f"Dejá de {' '.join(recortar(x, MAX - 8))}"
    elif n:
        vs["C"] = f"Probá estos {n} {listas[0].get('titulo', 'pasos').split()[-1]}"
    else:
        vs["C"] = "Mirá esto antes de tu próxima cita"
    out = []
    for f, t in vs.items():
        t = t[:MAX].strip()
        if any(t.lower().lstrip("¿¡").startswith(a) for a in H["aperturas_muertas"]):
            continue
        out.append({"formula": f, "nombre": {"A": "afirmación contraria", "B": "pregunta abierta", "C": "imperativo"}[f],
                    "texto": t.upper(), "clave": clave_de(t), "caracteres": len(t)})
    return out

def registrar(nombre, vs, elegida):
    ruta = RAIZ / "hooks-log.csv"
    cols = ["clip", "formula", "texto", "elegida", "fecha_publicacion", "retencion_3s", "vistas"]
    filas = list(csv.DictReader(open(ruta, encoding="utf-8"))) if ruta.exists() else []
    previas = {(f["clip"], f["formula"]): f for f in filas}
    for v in vs:
        f = previas.get((nombre, v["formula"]), {c: "" for c in cols})
        f.update({"clip": nombre, "formula": v["formula"], "texto": v["texto"], "elegida": "sí" if v["formula"] == elegida else ""})
        previas[(nombre, v["formula"])] = f
    with open(ruta, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(previas.values())

def main(nombre, piezas=None, elegida=None):
    vs = variantes(leer(WORK / "palabras_clip.json"), piezas)
    elegida = elegida or H["variantes"]["elegida"]
    guardar(WORK / "hooks.json", {"elegida": elegida, "variantes": vs})
    registrar(nombre, vs, elegida)
    return vs, elegida

if __name__ == "__main__":
    for v in main(sys.argv[1])[0]:
        print(v["formula"], v["texto"], f"(clave {v['clave']})")
