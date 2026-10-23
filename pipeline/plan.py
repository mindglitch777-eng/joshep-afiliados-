"""Arma plan.json por reglas a partir de las palabras del clip y aplica clips/<nombre>/plan.override.json encima.
Uso: python pipeline/plan.py <nombre>  → work/plan.auto.json y work/plan.json (el override nunca se pisa)"""
import re, sys
from pathlib import Path
from comun import RAIZ, WORK, cfg, guardar, info_video, leer, norm

KW, BR, P = cfg("keywords"), cfg("brand"), cfg("pipeline")
LIM = BR["limites_caracteres"]
POS, NEG = {norm(w) for w in KW["positivas"]}, {norm(w) for w in KW["negativas"]}
IMP = {norm(w) for w in KW["impacto"]}
ICON = {norm(k): v for k, v in KW["iconos"].items()}
DEBIL = set(KW["no_terminar_en"])

def corto(ws, limite):
    """Primeras palabras que entren en `limite` caracteres, sin terminar en palabra débil ni puntuación."""
    out = []
    for w in ws:
        t = re.sub(r"[.,;:!?…]+$", "", w["texto"])
        if len(" ".join(out + [t])) > limite:
            break
        out.append(t)
        if re.search(r"[.,;:!?…]$", w["texto"]):
            break
    while out and norm(out[-1]) in DEBIL:
        out.pop()
    s = " ".join(out)
    return s[:1].upper() + s[1:]

ARTIC = {"en": "", "a": "", "al": "el", "y": "", "con": "", "de": "", "del": "el"}
CORTE = {"que", "cuando", "porque", "donde", "mientras", "si"}

def item(ps, idx):
    """Ítem de lista: sin preposición inicial ("al tono" → "El tono"), cortado antes de "que/cuando…", ≤ límite."""
    ws = [dict(ps[i]) for i in idx]
    while ws and norm(ws[0]["texto"]) in ARTIC:
        r = ARTIC[norm(ws.pop(0)["texto"])]
        if r:
            ws.insert(0, {"texto": r}); break
    out = []
    for w in ws:
        if out and norm(w["texto"]) in CORTE and len(out) >= 1:
            break
        out.append(w)
    return corto(out, LIM["item"])

def libre(piezas, a, b):
    return all(b <= p["desde"] or a >= p["hasta"] for p in piezas)

def detectar(ps, dur):
    piezas = []
    txt = [norm(p["texto"]) for p in ps]
    # gancho: la frase más fuerte del clip (comparación, señales de gancho, impacto), cortada en coma, ≤45 caracteres
    ors, cur = [], []
    for i, p in enumerate(ps):
        cur.append(i)
        if re.search(r"[.!?…]$", p["texto"]) or i == len(ps) - 1:
            ors.append(cur); cur = []
    def fuerza(o):
        f = " ".join(ps[i]["texto"] for i in o).lower()
        return (5 * bool(re.search(r"no (se trata de|es) .+(se trata de|es) ", f)) + 2 * sum(s in f for s in KW["gancho_senales"])
                + sum(txt[i] in IMP for i in o) + 2 * (6 <= len(o) <= 16) - 0.02 * ps[o[0]]["desde"])
    mejor = max(ors, key=fuerza)
    texto_g = corto([ps[i] for i in mejor], LIM["gancho"])
    clave = next((w for w in texto_g.split() if norm(w) in IMP | NEG | POS), None)
    if clave:
        texto_g = texto_g.replace(clave, clave.upper(), 1)
    piezas.append({"tipo": "gancho", "desde": 0, "hasta": 2.2, "texto": texto_g})
    # lista: ordinales 1, 2, 3 en orden dentro de 20 s
    ords = [(i, KW["ordinales"][t]) for i, t in enumerate(txt) if t in KW["ordinales"]]
    for k, (i, n) in enumerate(ords):
        if n != 1:
            continue
        seq, esp = [i], 2
        for j, m in ords[k + 1:]:
            if m == esp and ps[j]["desde"] - ps[i]["desde"] < 20:
                seq.append(j); esp += 1
        if len(seq) >= 2:
            items = [corto(ps[j + 1: j + 6], LIM["item"]) for j in seq]
            m = re.search(r"\b(\w+) (cosas|claves|pasos|errores|reglas|señales|tips)\b", " ".join(p["texto"].lower() for p in ps[max(0, seq[0] - 15): seq[0]]))
            a, b = ps[seq[0]]["desde"] - 0.2, min(ps[min(seq[-1] + 5, len(ps) - 1)]["hasta"] + 0.6, dur)
            if libre(piezas, a, b) and all(items):
                piezas.append({"tipo": "pasos", "desde": round(a, 2), "hasta": round(b, 2), "titulo": f"{len(seq)} {m.group(2) if m else 'claves'}",
                               "pasos": items, "tiempos": [round(ps[j]["desde"], 2) for j in seq]})
            break
    # lista por enumeración: "por ejemplo, A, B y C" / "como A, B, C" (hasta 2 por clip)
    for m in re.finditer(r"\b(por ejemplo|como)\b,?", " ".join(p["texto"] for p in ps), re.I):
        i0 = len(" ".join(p["texto"] for p in ps)[: m.end()].split())
        grupos, g = [], []
        for j in range(i0, len(ps)):
            g.append(j)
            if re.search(r"[,;]$", ps[j]["texto"]) or (j + 1 < len(ps) and txt[j + 1] == "y" and len(g) > 1):
                grupos.append(g); g = []
            if re.search(r"[.!?…]$", ps[j]["texto"]):
                grupos.append(g); g = []
                break
        grupos = [x for x in grupos if x]
        if len(grupos) < 3 or sum(p["tipo"] == "pasos" for p in piezas) >= 2:
            continue
        grupos = grupos[:4]
        items = [item(ps, x) for x in grupos]
        a, b = ps[grupos[0][0]]["desde"] - 0.2, min(ps[grupos[-1][0]]["desde"] + 1.8, dur)
        clave_t = m.group(1).lower()
        titulo = KW["titulos_lista"].get(clave_t, KW["titulos_lista"]["default"]).format(n=len(items))
        if all(items) and libre(piezas, a, b):
            piezas.append({"tipo": "pasos", "desde": round(a, 2), "hasta": round(b, 2), "titulo": titulo, "pasos": items,
                           "tiempos": [round(ps[x[0]]["desde"], 2) for x in grupos]})
    # comparación: "en vez de X, Y" · "no X sino Y" · "no es X, es Y"
    frase = " ".join(p["texto"] for p in ps)
    for pat in [r"\bno se trata de (?P<x>[^,.]+),\s*se trata de (?P<y>[^,.]+)", r"en vez de (?P<x>[^,.]+),\s*(?P<y>[^,.]+)", r"\bno (?:es )?(?P<x>[^,.]{3,40}?),? sino (?P<y>[^,.]+)", r"\bno es (?P<x>[^,.]{3,40}),\s*es (?P<y>[^,.]+)"]:
        m = re.search(pat, frase, re.I)
        if not m:
            continue
        i = len(frase[: m.start()].split())
        a = ps[min(i, len(ps) - 1)]["desde"]
        b = min(a + 2.6, dur)
        mal = corto([{"texto": w} for w in m.group("x").split()], LIM["tarjeta"])
        bien = corto([{"texto": w} for w in m.group("y").split()], LIM["tarjeta"])
        if mal and bien and libre(piezas, a, b):
            piezas.append({"tipo": "comparacion", "desde": round(a, 2), "hasta": round(b, 2), "mal": mal, "bien": bien})
        break
    # énfasis: palabras de impacto con pausa antes o al cierre de frase
    cands = []
    for i, p in enumerate(ps):
        if txt[i] not in IMP or len(txt[i]) > LIM["enfasis"]:
            continue
        pausa = i > 0 and p["desde"] - ps[i - 1]["hasta"] >= 0.25
        cierre = bool(re.search(r"[.!?…]$", p["texto"]))
        cands.append((2 * pausa + cierre, i))
    usados, vistas = 0, set()
    for _, i in sorted(cands, reverse=True):
        a, b = ps[i]["desde"], min(ps[i]["desde"] + 1.0, dur)
        if txt[i] in vistas:
            continue
        if usados < KW["enfasis_max_por_clip"] and a > 2.5 and libre(piezas, a - 0.5, b + 0.5):
            vistas.add(txt[i])
            piezas.append({"tipo": "enfasis", "desde": round(a, 2), "hasta": round(b, 2), "palabra": re.sub(r"[^\wáéíóúñü]", "", ps[i]["texto"]).capitalize()})
            usados += 1
    return sorted(piezas, key=lambda p: p["desde"])

def subtitulos(ps):
    out, ultima_clave = [], -99
    for p in ps:
        n = norm(p["texto"])
        w = {"texto": p["texto"], "desde": p["desde"], "hasta": p["hasta"]}
        if n in NEG: w["tono"] = "neg"
        elif n in POS: w["tono"] = "pos"
        if n in IMP | POS | NEG and p["desde"] - ultima_clave >= 2.5:
            w["clave"] = True; ultima_clave = p["desde"]
        if n in ICON: w["icono"] = ICON[n]
        out.append(w)
    return out

def mezclar(base, over):
    """Override encima del plan: dicts se mezclan, listas se reemplazan. Extras: palabras {índice: cambios},
    quitar_piezas [tipos o índices], agregar_piezas [piezas]."""
    for k, v in over.items():
        if k == "palabras":
            for idx, cambios in v.items():
                base["subtitulos"][int(idx)].update(cambios)
        elif k == "quitar_piezas":
            base["piezas"] = [p for i, p in enumerate(base["piezas"]) if i not in v and p["tipo"] not in v]
        elif k == "agregar_piezas":
            base["piezas"] = sorted(base["piezas"] + v, key=lambda p: p["desde"])
        elif isinstance(v, dict) and isinstance(base.get(k), dict):
            mezclar(base[k], v)
        else:
            base[k] = v
    return base

def main(nombre):
    ps = leer(WORK / "palabras_clip.json")
    ov = RAIZ / "clips" / nombre / "plan.override.json"
    over = leer(ov) if ov.exists() else {}
    # las correcciones de palabras van ANTES de detectar, así listas y tarjetas salen con el texto bueno
    for idx, cambios in over.get("palabras", {}).items():
        ps[int(idx)].update(cambios)
    cort = leer(WORK / "cortes.json")
    w, h = info_video(WORK / "cortado.mp4")
    plan = {"fps": BR["fps"], "video": "raw/cortado.mp4", "videoInfo": {"ancho": w, "alto": h},
            "encuadre": P["encuadre"] if w > h else "cara", "duracion": cort["duracion"], "musica": {"archivo": P["musica"]},
            "cortes": cort["cortes"], "cara": leer(WORK / "cara.json"), "piezas": detectar(ps, cort["duracion"]), "subtitulos": subtitulos(ps)}
    guardar(WORK / "plan.auto.json", plan)
    if over:
        plan = mezclar(plan, over)
        print("override aplicado:", ov.relative_to(RAIZ))
    guardar(WORK / "plan.json", plan)
    print("piezas:", ", ".join(f"{p['tipo']}@{p['desde']}" for p in plan["piezas"]))

if __name__ == "__main__":
    main(sys.argv[1])
