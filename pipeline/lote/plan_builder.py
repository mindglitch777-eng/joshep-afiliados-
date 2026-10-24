"""Edición automática de un reel del lote → plans/<clip>.json (mismo formato que piloto/<clip>/edicion.json, lo lee armar.py).
Entradas: plans/textos.csv (ganchos, ítems del gráfico, anclas, frases a quitar), plans/calendario.csv (estilo y CTA),
y la preparación del runner (piloto/out/<clip>: palabras de whisper con tiempos y silencios).
- Cortes por frases enteras: arranca en la primera palabra, termina 0,3 s después de la última; saca las frases de `quitar`
  y achica las pausas largas (silencedetect) cortando dentro del silencio.
- Duración: contenido ≤ 45 s (con CTA ≤ 50); si sobra, saca las frases más largas que no tengan anclas ni sean el gancho o el cierre.
- Gráfico anclado a las palabras que dice Joseph (búsqueda aproximada de la frase en la transcripción).
- Glosario (config/glosario.json) y correcciones por frase → correcciones por índice de palabra ("" = la palabra se quita).
- Reintentos (--intento N): lee el qa.json anterior y corrige lo que falló (duración, gráfico, gancho, cortes).
Uso: python pipeline/lote/plan_builder.py <clip> [--intento N]"""
import csv, difflib, json, re, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MAX_CONT, MIN_CONT = 45.0, 30.0
FIN_EXTRA = 0.3  # el clip termina 0,3 s después de la última palabra
PAUSA_MAX = 0.4  # pausas más largas se achican
QUEDA = 0.12  # silencio que queda a cada lado de una pausa achicada
CTA = {"inicio": 1.0, "fin": 5.2, "velocidad": 1.3}  # 3,2 s con el botón visible ≥ 2 s; aceleración ≤ 1,4x

def cta_de(archivo):
    """Tramo del CTA. Con botón propio (plans/cta_boton.csv): la animación desde que aparece el texto (1,5–5,9 s a 1,3x) y armar.py sostiene
    el último cuadro hasta que el botón se vio ≥ 2,1 s. Sin botón: el tramo de siempre y el chip propio en una zona libre."""
    b = {r["archivo"]: r for r in csv.DictReader(open(RAIZ / "plans/cta_boton.csv", encoding="utf-8"))}.get(archivo, {})
    if b.get("boton") == "si" and b.get("desde_s"):
        v = CTA["velocidad"]
        return {"archivo": archivo, "inicio": 1.5, "fin": 5.9, "velocidad": v, "boton_desde": round(max(0.0, (float(b["desde_s"]) - 1.5) / v), 2)}
    return {"archivo": archivo, **CTA, "boton": "LINK EN MI PERFIL", "boton_desde": 0.12}

def nrm(t):
    t = unicodedata.normalize("NFD", t.lower())
    return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in t if unicodedata.category(c) != "Mn"))

def buscar(ps, frase, desde=0):
    """Índices (primero, último) de la frase en las palabras, desde `desde`; aproximado (whisper no siempre coincide)."""
    toks = [nrm(x) for x in frase.split() if nrm(x)]
    mejor, pos = 0.0, None
    for j in range(desde, len(ps) - len(toks) + 1):
        s = sum(difflib.SequenceMatcher(None, nrm(ps[j + k]["texto"]), t).ratio() >= 0.8 for k, t in enumerate(toks)) / len(toks)
        if s > mejor + 1e-9:
            mejor, pos = s, j
            if s == 1:
                break
    if pos is None or mejor < 0.6:
        return None
    return pos, pos + len(toks) - 1

def frases(ps, idx):
    """Frases (listas de índices) de las palabras conservadas: corta en . ? ! o en pausas ≥ 0,5 s."""
    out, cur = [], []
    for k, i in enumerate(idx):
        cur.append(i)
        sig = idx[k + 1] if k + 1 < len(idx) else None
        if sig is None or re.search(r"[.?!]$", ps[i]["texto"]) or sig != i + 1 or ps[sig]["desde"] - ps[i]["hasta"] >= 0.5:
            out.append(cur)
            cur = []
    return out

def tramos_de(ps, idx, sil, pausa_max):
    """Tramos de la fuente para los índices conservados; achica las pausas largas dentro de cada tramo."""
    corr, cur = [], [idx[0]]
    for i in idx[1:]:
        if i == cur[-1] + 1:
            cur.append(i)
        else:
            corr.append(cur)
            cur = [i]
    corr.append(cur)
    tr = []
    for c in corr:
        a = max(0.0, ps[c[0]]["desde"] - 0.08)
        b = ps[c[-1]]["hasta"] + 0.06
        # borde de salida: si arranca un silencio cerca del final de la palabra, se corta adentro
        for s0, s1 in sil:
            if ps[c[-1]]["hasta"] - 0.35 <= s0 <= ps[c[-1]]["hasta"] + 0.1:
                b = min(s1, s0 + 0.1)
                break
        for s0, s1 in sil:
            if ps[c[0]]["desde"] - 0.1 <= s1 <= ps[c[0]]["desde"] + 0.35:
                a = max(s0, s1 - 0.1)
                break
        # pausas internas largas: se quita el medio y quedan QUEDA s de cada lado
        t = a
        for s0, s1 in sil:
            if a < s0 and s1 < b and s1 - s0 > pausa_max:
                tr.append([round(t, 3), round(s0 + QUEDA, 3)])
                t = s1 - QUEDA
        tr.append([round(t, 3), round(b, 3)])
    return tr

def dur(tr):
    return sum(b - a for a, b in tr)

def main(clip, intento=0):
    row = {r["n"]: r for r in csv.DictReader(open(RAIZ / "plans/textos.csv", encoding="utf-8"))}[clip]
    cal = {r["clip"]: r for r in csv.DictReader(open(RAIZ / "plans/calendario.csv", encoding="utf-8"))}[clip]
    out = RAIZ / "piloto" / "out" / clip
    ps = json.loads((out / "palabras.json").read_text(encoding="utf-8"))
    info = json.loads((out / "info.json").read_text(encoding="utf-8"))
    sil = info["silencios"]
    qa_prev = {}
    if intento:
        q = RAIZ / "piloto" / "build" / clip / "qa.json"
        if q.exists():
            qa_prev = {r["regla"]: r for r in json.loads(q.read_text(encoding="utf-8"))["reglas"] if not r["pasa"]}
    falla = lambda clave: any(clave in k for k in qa_prev)
    log = []

    # ── correcciones: glosario global (variantes de "link en el perfil", etc.) + las del reel, por frase → por índice
    glos = json.loads((RAIZ / "config/glosario.json").read_text(encoding="utf-8"))
    pares = [(f["de"], f["a"]) for f in glos["frases"]] + [tuple(x.split("=>")) for x in row["correcciones"].split("|") if "=>" in x]
    corr = {}
    for de, a in pares:
        j = 0
        while (r := buscar(ps, de, j)) is not None:
            j = r[1] + 1
            dicho = " ".join(ps[k]["texto"] for k in range(r[0], r[1] + 1))
            if difflib.SequenceMatcher(None, nrm(dicho), nrm(de)).ratio() < 0.85:
                continue
            nuevos, n = a.split(), r[1] - r[0] + 1
            for k in range(n):
                txt = " ".join(nuevos[k:]) if k == n - 1 else (nuevos[k] if k < len(nuevos) else "")
                # conserva la puntuación final de la palabra original
                pu = re.search(r"[.,?!:;]+$", ps[r[0] + k]["texto"])
                corr[str(ps[r[0] + k]["i"])] = txt + (pu.group(0) if pu and txt and not re.search(r"[.,?!:;]$", txt) else "")

    # ── qué se conserva: desde el inicio hasta `hasta`, sin las frases de `quitar`
    fin = len(ps) - 1
    if row["hasta"]:
        r = buscar(ps, row["hasta"])
        if r:
            fin = r[1]
        else:
            log.append(f"no encontré «{row['hasta']}»")
    quitar = set()
    for q in filter(None, row["quitar"].split("|")):
        a_txt, _, b_txt = q.partition("...")
        ra = buscar(ps, a_txt.strip())
        rb = buscar(ps, b_txt.strip(), ra[0]) if ra and b_txt.strip() else ra
        if ra and rb:
            quitar |= set(range(ra[0], rb[1] + 1))
        else:
            log.append(f"no encontré para quitar «{q}»")
    idx = [i for i in range(0, fin + 1) if i not in quitar]

    # ── anclas del gráfico (en orden, cada una después de la anterior)
    anclas, pos = [], 0
    for a in filter(None, row["anclas"].split("|")):
        r = buscar(ps, a, pos)
        if r is None:
            r = buscar(ps, a)
        anclas.append(r)
        if r:
            pos = r[0]
    proteg = {k for r in anclas if r for k in range(r[0], r[1] + 1)}

    # ── duración: pausas achicadas; si sobra, saca frases largas sin anclas (nunca la primera ni la última)
    pausa = PAUSA_MAX if not falla("palabra cortada") else 0.7
    tope = MAX_CONT - 2.5 * intento if falla("Duración") else MAX_CONT
    tr = tramos_de(ps, idx, sil, pausa)
    fr = frases(ps, idx)
    while dur(tr) > tope:
        cand = [f for f in fr[1:-1] if not (set(f) & proteg)]
        if not cand:
            break
        f = max(cand, key=lambda f: ps[f[-1]]["hasta"] - ps[f[0]]["desde"])
        if dur(tr) - (ps[f[-1]]["hasta"] - ps[f[0]]["desde"]) < MIN_CONT:
            cand = [c for c in cand if dur(tr) - (ps[c[-1]]["hasta"] - ps[c[0]]["desde"]) >= MIN_CONT]
            if not cand:
                break
            f = min(cand, key=lambda f: ps[f[-1]]["hasta"] - ps[f[0]]["desde"])
        fr.remove(f)
        idx = [i for i in idx if i not in f]
        tr = tramos_de(ps, idx, sil, pausa)
        log.append(f"saco frase «{' '.join(ps[i]['texto'] for i in f)[:60]}…» ({ps[f[-1]]['hasta'] - ps[f[0]]['desde']:.1f} s)")
    # si quedó corto y hay un `hasta`, se estira frase por frase
    while dur(tr) < MIN_CONT and idx[-1] < len(ps) - 1:
        sig = idx[-1] + 1
        while sig < len(ps) - 1 and not re.search(r"[.?!]$", ps[sig]["texto"]):
            sig += 1
        idx += list(range(idx[-1] + 1, sig + 1))
        tr = tramos_de(ps, idx, sil, pausa)
        log.append(f"estiro hasta «{ps[sig]['texto']}» ({dur(tr):.1f} s)")
    tr[0][0] = max(0.0, ps[idx[0]]["desde"] - 0.1)
    tr[-1][1] = round(min(info["duracion"] - 0.02, ps[idx[-1]]["hasta"] + FIN_EXTRA), 3)
    vivas = set(idx)

    # ── gráfico
    W = lambda r, fin=False: {"palabra": ps[r[1] if fin else r[0]]["i"]}
    fmt, items = row["formato"], [x for x in row["items"].split("|") if x]
    ok = [r for r in anclas if r and r[0] in vivas]
    piezas = []
    if len(ok) < len([a for a in row["anclas"].split("|") if a]):
        log.append(f"anclas sin encontrar o cortadas: {[a for a, r in zip(row['anclas'].split('|'), anclas) if not r or r[0] not in vivas]}")
    corto = falla("Gráficos") or falla("gráfico")
    if ok:
        if fmt == "vs":
            hasta = {"palabra": ps[ok[-1][1]]["i"], "fin": True, "mas": 0.6} if len(ok) > 1 else 3.2
            piezas.append({"tipo": "comparacion", "estilo": "versus", "desde": W(ok[0]), "hasta": 2.8 if corto else hasta, "mal": items[0], "bien": items[1]})
        elif fmt == "lista":
            pre = all(x.startswith("¿") for x in items)
            piezas.append({"tipo": "pasos", "estilo": "preguntas" if pre else "check", "titulo": row["titulo"] or None, "pasos": items,
                           "desde": {**W(ok[0]), "mas": -0.5}, "hasta": {"palabra": ps[ok[-1][1]]["i"], "fin": True, "mas": 1.6 if not corto else 0.8},
                           "tiempos": [W(r) for r in ok]})
        elif fmt == "numero":
            r = ok[0]
            num = next((k for k in range(r[0], r[1] + 1) if re.match(r"^\d|^(una?|uno|dos|tres|cuatro|cinco|diez|veinte)\b", nrm(ps[k]["texto"]))), r[0])
            p = {"tipo": "numero", "desde": {"palabra": ps[num]["i"]}, "hasta": 2.4 if corto else 3.0, "valor": items[0]}
            if items[1:] and len(items[1]) <= 4:
                p["unidad"] = items[1]
            elif items[1:]:
                p["etiqueta"] = items[1]
            piezas.append(p)
        elif fmt == "escena":
            esc = row["titulo"]
            if esc == "jarron":
                # del primer golpe a medio segundo después de que se rompe (≤ 4 s)
                piezas.append({"tipo": "escena", "escena": esc, "desde": {**W(ok[1] if len(ok) > 1 else ok[0]), "mas": -0.2}, "hasta": {**W(ok[-1], True), "fin": True, "mas": 0.5}, "tiempos": [W(r) for r in ok[1:]]})
            elif esc == "taza":
                piezas.append({"tipo": "escena", "escena": esc, "desde": W(ok[0]), "hasta": 3.8, "tiempos": [W(r) for r in ok]})
            else:
                piezas.append({"tipo": "escena", "escena": esc, "desde": {**W(ok[0]), "mas": -0.6}, "hasta": {**W(ok[-1], True), "fin": True, "mas": 1.0}, "tiempos": [W(r) for r in ok]})
        elif fmt == "ecuacion":
            piezas.append({"tipo": "ecuacion", "bloques": items, "desde": {**W(ok[0]), "mas": -0.3}, "hasta": {**W(ok[-1], True), "fin": True, "mas": 1.6 if not corto else 1.0},
                           "tiempos": [{**W(r), "mas": 0.9 * sum(1 for q in ok[:k] if q == r)} for k, r in enumerate(ok)]})

    # ── foto del tema como cutaway (1,3 s, zoom lento) e inserto literal: plans/uso_assets.csv; lejos (≥ 3 s) del gráfico,
    # del gancho y del cierre, en el punto que más reparte los eventos (nunca dos assets seguidos)
    uso = {r["clip"]: r for r in csv.DictReader(open(RAIZ / "plans/uso_assets.csv", encoding="utf-8"))}.get(clip, {})
    ocupado = [(0.0, ps[idx[0]]["desde"] + 3.5), (ps[idx[-1]]["hasta"] - 5.0, ps[idx[-1]]["hasta"] + 9)]
    if ok:
        ocupado.append((ps[ok[0][0]]["desde"] - 0.5, ps[ok[-1][1]]["hasta"] + 2.5))
    if uso.get("inserto") and uso.get("frase_inserto"):
        r = buscar(ps, uso["frase_inserto"])
        if r and r[0] in vivas and all(not (a - 3 < ps[r[0]]["desde"] < b + 3) for a, b in ocupado[2:]):
            piezas.append({"tipo": "inserto", "desde": W(r), "hasta": 1.8, "archivo": f"anim/{uso['inserto']}", "inicio": 1.5, "velocidad": 1.0})
            ocupado.append((ps[r[0]]["desde"], ps[r[0]]["desde"] + 1.8))
            log.append(f"inserto {uso['inserto']} en «{uso['frase_inserto']}»")
    if uso.get("foto"):
        cands = [f[0] for f in frases(ps, idx)]
        def lejos(i):
            t = ps[i]["desde"]
            return min(min(abs(t - a), abs(t + 1.3 - a), abs(t - b), abs(t + 1.3 - b)) if not (a - 3 < t < b + 3 or a - 3 < t + 1.3 < b + 3) else -1 for a, b in ocupado)
        mejor = max(cands, key=lejos, default=None)
        if mejor is not None and lejos(mejor) >= 0:
            piezas.append({"tipo": "imagen", "desde": {"palabra": ps[mejor]["i"]}, "hasta": 1.3, "archivo": f"img/{uso['foto']}"})
        else:
            log.append("foto sin lugar a ≥ 3 s de los otros gráficos")

    # ── palabras clave del subtítulo (ding): la clave del gancho y la del B, primera vez después de la 6ª palabra
    claves = []
    for c in (row["clave_A"], row["clave_B"]):
        k = next((p["i"] for p in ps[6:] if p["i"] in vivas and nrm(p["texto"]) == nrm(c)), None)
        if k is not None and k not in claves:
            claves.append(k)

    # ── gancho: si el A no entró sobre la cabeza en el intento anterior, va el B (si es más corto)
    gA, cA, gB, cB = row["gancho_A"], row["clave_A"], row["gancho_B"], row["clave_B"]
    if falla("Gancho") and len(gB) < len(gA):
        gA, cA, gB, cB = gB, cB, gA, cA
        log.append("gancho B (el A no entraba sobre la cabeza)")
    estilo = cal["estilo"]
    looks = json.loads((RAIZ / "config/looks.json").read_text(encoding="utf-8"))["orden"]
    look = looks[int(cal["dia"]) % len(looks)]  # rota por día: nunca el mismo dos días seguidos
    ed = {"clip": clip, "estilo": estilo, "tramos": [[a, b, "frase completa" if i else "arranca con la voz"] for i, (a, b) in enumerate(tr)],
          "correcciones": corr, "claves": claves, "tonos": {}, "gancho": {"A": gA, "claveA": cA, "B": gB, "claveB": cB},
          "piezas": piezas, "cta": cta_de(cal["cta"] + ".mp4"),
          "post": {"descripcion": row["descripcion"], "hashtags": row["hashtags"].split("|"), "portada": "cuadro a 0,2 s (gancho completo, después del flash)"},
          "formato": fmt, "look": look, "intento": intento, "log": log}
    if estilo == "capas" and not falla("Gancho"):
        ed["capas_gancho"] = True
    # plan.override.json (correcciones a mano): se aplica encima, clave por clave
    ov = RAIZ / "plans" / f"{clip}.override.json"
    if ov.exists():
        ed.update(json.loads(ov.read_text(encoding="utf-8")))
    (RAIZ / "plans" / f"{clip}.json").write_text(json.dumps(ed, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{clip}: {fmt}/{estilo} · {len(tr)} tramos · {dur(tr):.1f} s · {len(piezas)} gráfico · intento {intento}" + ("".join(f"\n  - {x}" for x in log[:8])))

if __name__ == "__main__":
    a = sys.argv[1:]
    main(a[0], int(a[a.index("--intento") + 1]) if "--intento" in a else 0)
